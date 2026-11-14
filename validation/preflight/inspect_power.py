"""Decode the two F05 POWER samples with their actual codecs and coordinates.

No trends, regional averages or product data are generated. All decoded values
are authentic samples from the hashed NASA chunks retained outside Git.
"""

import argparse
import hashlib
import json
import math
import re
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.request import Request, build_opener

import numcodecs
import numpy as np

from scripts.provider_preflight import NoRedirect, read_bounded, validate_url

ROOT = Path(__file__).resolve().parents[2]


def decode(body: bytes, descriptor: dict[str, Any]) -> Any:
    if descriptor.get("zarr_format") != 2:
        raise ValueError("Unexpected Zarr format")
    decoded = numcodecs.get_codec(descriptor["compressor"]).decode(body)
    array = np.frombuffer(decoded, dtype=descriptor["dtype"])
    for filter_config in reversed(descriptor.get("filters") or []):
        array = numcodecs.get_codec(filter_config).decode(array)
    shape = tuple(descriptor["chunks"])
    if array.size != int(np.prod(shape)):
        raise ValueError("Decoded chunk does not match declared dimensions")
    return array.reshape(shape, order=descriptor["order"])


def gregorian_times(array: Any, attributes: dict[str, Any]) -> list[datetime]:
    if attributes.get("calendar", "standard") not in (
        "standard",
        "gregorian",
        "proleptic_gregorian",
    ):
        raise ValueError("Unsupported calendar in this inspection tool")
    match = re.fullmatch(r"(days|hours|minutes|seconds) since (.+)", attributes["units"])
    if match is None:
        raise ValueError("Unsupported time units in this inspection tool")
    factor = {"days": 86400, "hours": 3600, "minutes": 60, "seconds": 1}[match[1]]
    epoch = datetime.fromisoformat(match[2])  # Keep native calendar labels; LST is not UTC.
    return [epoch + timedelta(seconds=float(value) * factor) for value in array]


def inspect(folder: Path) -> dict[str, Any]:
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    point = json.loads((folder / "POWER-point-2003.json").read_text(encoding="utf-8"))
    previous_file = folder / "power-decoded-inspection.json"
    previous = (
        json.loads(previous_file.read_text(encoding="utf-8")) if previous_file.exists() else {}
    )
    result: dict[str, Any] = {"retrieved_utc": datetime.now(UTC).isoformat(), "sources": []}
    opener = build_opener(NoRedirect())
    for variable, field, chunk in (
        ("V01", "T2M", (0, 8, 4)),
        ("V12", "ALLSKY_SFC_SW_DWN", (0, 2, 1)),
    ):
        metadata = json.loads((folder / (variable + "-metadata.json")).read_text(encoding="utf-8"))[
            "metadata"
        ]
        record = next(r for r in manifest["records"] if r["label"] == variable + "-raw-chunk")
        artifact = (folder / record["artifact"]).resolve()
        if not artifact.is_relative_to(folder):
            raise ValueError("Source artifact path is outside this preflight run")
        validate_url(record["url"])
        body = artifact.read_bytes()
        if hashlib.sha256(body).hexdigest() != record["sha256"]:
            raise ValueError("Retained chunk integrity failure")
        source_array = metadata[field + "/.zarray"]
        if metadata[field + "/.zattrs"]["_ARRAY_DIMENSIONS"] != ["time", "lat", "lon"]:
            raise ValueError("Unexpected source dimension order")
        data = decode(body, source_array)
        base = record["url"].rsplit("/", 2)[0]
        coordinates = {}
        hashes = {}
        for coordinate in ("time", "lat", "lon"):
            url = base + "/" + coordinate + "/0"
            validate_url(url)
            cached = folder / (variable + "-" + coordinate + ".bin")
            earlier = next(
                (
                    item
                    for item in previous.get("sources", [])
                    if item["variable"] == variable
                    and item["source_chunk_sha256"] == record["sha256"]
                ),
                None,
            )
            expected_hash = (
                earlier.get("coordinate_artifacts", {}).get(coordinate, {}).get("sha256")
                if earlier
                else None
            )
            if cached.exists() and expected_hash:
                raw = cached.read_bytes()
                if hashlib.sha256(raw).hexdigest() != expected_hash:
                    raise ValueError("Cached source coordinate integrity failure")
            else:
                with opener.open(Request(url), timeout=20) as response:
                    raw = read_bounded(response, 65536, time.monotonic() + 20)
            (folder / (variable + "-" + coordinate + ".bin")).write_bytes(raw)
            hashes[coordinate] = {
                "url": url,
                "bytes": len(raw),
                "sha256": hashlib.sha256(raw).hexdigest(),
            }
            coordinates[coordinate] = decode(raw, metadata[coordinate + "/.zarray"])
        dates = gregorian_times(coordinates["time"], metadata["time/.zattrs"])
        lat_index = int(np.argmin(np.abs(coordinates["lat"] - 37.5)))
        lon_index = int(np.argmin(np.abs(coordinates["lon"] + 97.5)))
        row = lat_index - chunk[1] * source_array["chunks"][1]
        column = lon_index - chunk[2] * source_array["chunks"][2]
        if not (0 <= row < data.shape[1] and 0 <= column < data.shape[2]):
            raise ValueError("Requested point is outside retained sample chunk")
        samples = data[:, row, column]
        actual_range = metadata[field + "/.zattrs"]
        finite = np.isfinite(data)
        outside = finite & ((data < actual_range["valid_min"]) | (data > actual_range["valid_max"]))
        overlap = []
        for index, date in enumerate(dates):
            if date.year == 2003:
                key = date.strftime("%Y%m")
                value = float(samples[index]) if np.isfinite(samples[index]) else None
                rest = point["properties"]["parameter"][field].get(key)
                if rest is not None and (
                    rest == point["header"]["fill_value"] or not math.isfinite(rest)
                ):
                    rest = None
                overlap.append(
                    {
                        "month": key,
                        "zarr_sample": value,
                        "rest_sample": rest,
                        "difference": value - rest
                        if value is not None and rest is not None
                        else None,
                    }
                )
        valid_dates = [
            date for date, value in zip(dates, samples, strict=True) if np.isfinite(value)
        ]
        entry = {
            "variable": variable,
            "field": field,
            "source_chunk_sha256": record["sha256"],
            "coordinate_artifacts": hashes,
            "source_time_attributes": metadata["time/.zattrs"],
            "source_time_standard": metadata[".zattrs"].get("time_standard"),
            "shape": list(data.shape),
            "finite_values_in_sample_chunk": int(finite.sum()),
            "missing_values_in_sample_chunk": int((~finite).sum()),
            "finite_values_outside_declared_range": int(outside.sum()),
            "selected_native_point": {
                "latitude": float(coordinates["lat"][lat_index]),
                "longitude": float(coordinates["lon"][lon_index]),
            },
            "first_valid_sample_month": min(valid_dates).strftime("%Y-%m") if valid_dates else None,
            "last_valid_sample_month_not_global_completeness": max(valid_dates).strftime("%Y-%m")
            if valid_dates
            else None,
            "sample_2003_comparison": overlap,
            "comparison_valid_for_equality": variable == "V01",  # V12 LST versus REST UTC differs.
            "global_complete_month_verified": False,
        }
        result["sources"].append(entry)
        (folder / "power-decoded-inspection.json").write_text(
            json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8"
        )
        print(variable + ": source chunk and coordinates decoded", flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact-dir", type=Path, required=True)
    parser.add_argument("--run-public", action="store_true")
    args = parser.parse_args()
    folder = args.artifact_dir.resolve()
    if not args.run_public or not folder.is_relative_to(ROOT / "artifacts/f05"):
        parser.error("Explicit public opt-in and F05 artifact directory required")
    inspect(folder)


if __name__ == "__main__":
    main()
