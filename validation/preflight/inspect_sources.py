"""Opt-in F05 source inspection, not a production ingestion/statistics module.

Uses only real provider bytes. HDF5 seeks fetch bounded, verified HTTP ranges;
partial files are never padded or represented as complete local granules.
Run inside this directory's locked environment. Tokens never enter evidence.
"""

import argparse
import base64
import hashlib
import io
import json
import math
import netrc
import os
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
PAGE = 65536
FILE_LIMIT = 4 * 1024 * 1024
SOURCE_HOSTS = {"data.gesdisc.earthdata.nasa.gov", "obdaac-tea.earthdatacloud.nasa.gov"}
CDN_HOSTS = {"d2b3c3wh8s6en5.cloudfront.net", "dwgofd1fffpxv.cloudfront.net"}
ATTRIBUTES = {
    "_FillValue",
    "missing_value",
    "scale_factor",
    "add_offset",
    "units",
    "long_name",
    "standard_name",
    "valid_range",
    "valid_min",
    "valid_max",
    "calendar",
    "bounds",
    "cell_methods",
    "coordinates",
    "comment",
    "Title",
    "Units",
    "ScaleFactor",
    "Offset",
    "ValidRange",
    "MissingValue",
}


class InspectionError(ValueError):
    """Only safe, fixed messages may be reported."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


def token_from_file(file: Path) -> str:
    """Read only the Earthdata key; never execute or export other env entries."""
    if not file.is_file():
        return ""
    if file.stat().st_size > 65536:
        raise InspectionError("Private token file is oversized")
    entries = []
    for line in file.read_text(encoding="utf-8-sig").splitlines():
        key, separator, value = line.strip().partition("=")
        if separator and key.strip() == "EARTHDATA_TOKEN":
            entries.append(value.strip())
    if len(entries) > 1:
        raise InspectionError("Duplicate private token configuration")
    token = entries[0] if entries else ""
    if len(token) > 1 and token[0] == token[-1] and token[0] in "\"'":
        token = token[1:-1]
    if any(c.isspace() for c in token):
        raise InspectionError("Invalid token whitespace; value withheld")
    return token


def private_token() -> str:
    """Explicit opt-in only: environment, project .env, legacy file, then netrc."""
    token = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not token:
        token = token_from_file(ROOT / ".env")
    if not token and os.name == "nt" and os.environ.get("LOCALAPPDATA"):
        token = token_from_file(
            Path(os.environ["LOCALAPPDATA"]) / "EarthTrendDetective/secrets/.env"
        )
    if token:
        if any(c.isspace() for c in token):
            raise InspectionError("Invalid token whitespace; value withheld")
        return token
    entry = netrc.netrc(str(Path.home() / ".netrc")).authenticators("urs.earthdata.nasa.gov")
    if not entry or not entry[0] or not entry[2]:
        raise InspectionError("Local Earthdata entry missing")
    basic = base64.b64encode((entry[0] + ":" + entry[2]).encode()).decode()
    opener = build_opener(NoRedirect())
    request = Request(
        "https://urs.earthdata.nasa.gov/api/users/find_or_create_token",
        headers={"Authorization": "Basic " + basic},
        method="POST",
        data=b"",
    )
    with opener.open(request, timeout=20) as response:
        body = response.read(65536)
    result = json.loads(body).get("access_token")
    if not isinstance(result, str) or not result:
        raise InspectionError("Earthdata token unavailable")
    return result


def source_location(url: str, token: str) -> tuple[str, dict[str, str]]:
    parsed = urlsplit(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in SOURCE_HOSTS
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.port not in (None, 443)
    ):
        raise InspectionError("Source is outside the approved preflight routes")
    opener = build_opener(NoRedirect())
    headers = {"Authorization": "Bearer " + token, "Range": "bytes=0-0"}
    try:
        with opener.open(Request(url, headers=headers), timeout=20) as response:
            if response.status != 206:
                raise InspectionError("Source range support not established")
            return url, {"Authorization": "Bearer " + token}
    except HTTPError as error:
        destination = error.headers.get("Location", "")
        status = error.code
        error.close()
        target = urlsplit(destination)
        if (
            status != 303
            or target.scheme != "https"
            or target.hostname not in CDN_HOSTS
            or target.username
            or target.password
            or target.port not in (None, 443)
        ):
            raise InspectionError("Unsupported redirect; credentials not forwarded") from None
        return destination, {}  # Signed URL remains in memory; no Earthdata header to CDN.


class RemoteRanges(io.RawIOBase):
    """Read-only file interface with actual bounded bytes, exact offsets and cache."""

    def __init__(self, url: str, headers: dict[str, str], size: int) -> None:
        self._url = url
        self._headers = headers
        self.size = size
        self.position = 0
        self.pages: dict[int, bytes] = {}
        self.received = 0
        self.requests = 0
        self.range_hashes: list[dict[str, Any]] = []
        self._opener = build_opener(NoRedirect())
        self._etag: str | None = None

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return True

    def tell(self) -> int:
        return self.position

    def seek(self, offset: int, whence: int = 0) -> int:
        if whence not in (0, 1, 2):
            raise InspectionError("Unsupported seek origin")
        base = 0 if whence == 0 else self.position if whence == 1 else self.size
        position = base + offset
        if not 0 <= position <= self.size:
            raise InspectionError("Read is outside source file")
        self.position = position
        return position

    def _page(self, index: int) -> bytes:
        if index in self.pages:
            return self.pages[index]
        start = index * PAGE
        end = min(start + PAGE, self.size) - 1
        expected = end - start + 1
        if expected <= 0 or self.received + expected > FILE_LIMIT or self.requests >= 64:
            raise InspectionError("Source inspection transfer budget reached")
        headers = {**self._headers, "Range": f"bytes={start}-{end}"}
        self.requests += 1
        with self._opener.open(Request(self._url, headers=headers), timeout=20) as response:
            etag = response.headers.get("ETag")
            if self._etag is not None and etag != self._etag:
                raise InspectionError("Source changed during range inspection")
            self._etag = etag
            if (
                response.status != 206
                or response.headers.get("Content-Range") != f"bytes {start}-{end}/{self.size}"
            ):
                raise InspectionError("Source returned an unexpected range")
            declared = response.headers.get("Content-Length")
            if declared is not None and declared != str(expected):
                raise InspectionError("Source range length differs")
            data = bytes(response.read(expected))
        self.received += len(data)
        if len(data) != expected:
            raise InspectionError("Source range is truncated")
        self.range_hashes.append(
            {"start": start, "end": end, "sha256": hashlib.sha256(data).hexdigest()}
        )
        self.pages[index] = data
        return data

    def read(self, size: int = -1) -> bytes:
        count = self.size - self.position if size < 0 else min(size, self.size - self.position)
        if count > FILE_LIMIT:
            raise InspectionError("Whole-file read exceeds preflight budget")
        chunks = []
        while count:
            page = self._page(self.position // PAGE)
            local = self.position % PAGE
            part = page[local : local + count]
            if not part:
                raise InspectionError("Source range cannot satisfy requested bytes")
            chunks.append(part)
            count -= len(part)
            self.position += len(part)
        return b"".join(chunks)

    def readinto(self, buffer: Any) -> int:
        view = memoryview(buffer).cast("B")
        data = self.read(len(view))
        view[: len(data)] = data
        return len(data)


def safe_value(value: Any) -> Any:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if hasattr(value, "tolist"):
        return safe_value(value.tolist())
    if isinstance(value, (list, tuple)):
        return [safe_value(v) for v in value]
    if isinstance(value, dict):
        return {str(k): safe_value(v) for k, v in value.items()}
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    return value


def inspect_hdf5(folder: Path, product: str | None = None) -> dict[str, Any]:
    import h5py

    local_ranges = folder / "authenticated-range-manifest.json"
    if local_ranges.exists():
        records = json.loads(local_ranges.read_text(encoding="utf-8"))[:6]
        records += json.loads((folder / "obdaac-range-manifest.json").read_text(encoding="utf-8"))
    else:
        # Fresh clones can recheck the fixed, public source identities without
        # relying on private temporary manifests or submitting any provider job.
        reference = ROOT / "validation/reports/provider-preflight.json"
        records = json.loads(reference.read_text(encoding="utf-8"))["protected_range_checks"]
    fields = {
        "GPCPMON": ["sat_gauge_precip", "quality_index"],
        "GPM_3IMERGM": ["Grid/precipitation"],
        "GLDAS_NOAH025_M": ["SoilMoi0_10cm_inst", "Evap_tavg", "Qs_acc", "SWE_inst"],
        "M2TMNXAER": ["TOTEXTTAU"],
        "OMNO2d": ["ColumnAmountNO2TropCloudScreened"],
        "MODISA_L3m_CHL": ["chlor_a"],
        "SeaWiFS_L3m_CHL": ["chlor_a"],
    }
    token = private_token()
    output: dict[str, Any] = {"retrieved_utc": datetime.now(UTC).isoformat(), "sources": []}
    for record in records:
        name = record["product"]
        if product is not None and product != name:
            continue
        if name not in fields:
            continue  # AIRS HDF4 is inspected via approved service output, not h5py.
        result: dict[str, Any] = {
            "product": name,
            "status": "unavailable",
            "fields": {},
        }
        reader = None
        try:
            url, headers = source_location(record["source_url"], token)
            result["source_url"] = record["source_url"]  # Validated, public, query-free source.
            size = int(record["content_range"].rsplit("/", 1)[-1])
            reader = RemoteRanges(url, headers, size)
            if hashlib.sha256(reader._page(0)).hexdigest() != record["sha256"]:
                raise InspectionError("Source header differs from the recorded NASA sample")
            with h5py.File(reader, "r") as file:
                result["root_names"] = list(file.keys())
                for field in fields[name]:
                    actual_path = field
                    if actual_path not in file:
                        matches: list[str] = []

                        def locate(
                            path: str, item: Any, target: str = field, found: list[str] = matches
                        ) -> None:
                            if isinstance(item, h5py.Dataset) and path.rsplit("/", 1)[-1] == target:
                                found.append(path)

                        file.visititems(locate)
                        if len(matches) == 1:
                            actual_path = matches[0]
                    if actual_path not in file:
                        result["fields"][field] = {"status": "missing_expected_field"}
                        continue
                    dataset = file[actual_path]
                    result["fields"][field] = {
                        "actual_path": actual_path,
                        "shape": list(dataset.shape),
                        "dtype": str(dataset.dtype),
                        "attributes": safe_value(
                            {k: v for k, v in dataset.attrs.items() if k in ATTRIBUTES}
                        ),
                    }
                for coordinate in ("time", "lat", "lon", "Grid/time", "Grid/lat", "Grid/lon"):
                    if coordinate in file:
                        result.setdefault("coordinates", {})[coordinate] = {
                            "shape": list(file[coordinate].shape),
                            "attributes": safe_value(
                                {k: v for k, v in file[coordinate].attrs.items() if k in ATTRIBUTES}
                            ),
                        }
                result["status"] = "actual_headers_read_not_scientifically_admitted"
        except Exception as error:
            result["failure_class"] = type(
                error
            ).__name__  # Never log secret-bearing exception text.
        finally:
            if reader is not None:
                result["range_bytes"] = reader.received
                result["range_requests"] = reader.requests
                result["range_hashes"] = reader.range_hashes
                reader.close()
        output["sources"].append(result)
        print(name + ": " + result["status"], flush=True)
        output_name = "source-header-inspection" + ("-" + product if product else "") + ".json"
        (folder / output_name).write_text(
            json.dumps(output, indent=2, allow_nan=False) + "\n", encoding="utf-8"
        )
        time.sleep(0.5)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact-dir", type=Path, required=True)
    parser.add_argument("--run-authenticated", action="store_true")
    parser.add_argument(
        "--product",
        choices=(
            "GPCPMON",
            "GPM_3IMERGM",
            "GLDAS_NOAH025_M",
            "M2TMNXAER",
            "OMNO2d",
            "MODISA_L3m_CHL",
            "SeaWiFS_L3m_CHL",
        ),
    )
    args = parser.parse_args()
    folder = args.artifact_dir.resolve()
    if not args.run_authenticated or not folder.is_relative_to(ROOT / "artifacts/f05"):
        parser.error("Explicit authenticated opt-in and F05 artifact directory required")
    try:
        inspect_hdf5(folder, args.product)
    except Exception:
        raise SystemExit("Preflight unavailable; sensitive details withheld") from None


if __name__ == "__main__":
    main()
