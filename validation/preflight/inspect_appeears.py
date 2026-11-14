"""Inspect authentic F05 AppEEARS exports; no production QA policy or ingestion.

Raster scale/nodata and same-grid QA are checked independently of the service
statistics. Diagnostic counts do not approve a region, month or trend for analysis.
"""

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

import numpy as np
import PIL
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]


def inspect(folder: Path, benchmark: str) -> dict[str, Any]:
    folder = folder.resolve()
    records = json.loads(
        (folder / f"appeears-{benchmark.lower()}-downloads.json").read_text(encoding="utf-8")
    )
    if len(records) > 32 or sum(r["file_size"] for r in records) > 8 * 1024 * 1024:
        raise ValueError("AppEEARS bundle inspection budget exceeded")
    rasters = {}
    report: dict[str, Any] = {
        "benchmark": benchmark,
        "tool": "Pillow",
        "tool_version": PIL.__version__,
        "rasters": [],
        "csv_headers": [],
        "scientific_admission": False,
        "production_qa_policy_selected": False,
    }
    statistic = None
    for record in records:
        file = folder / record["local_artifact"]
        if (
            not file.resolve().is_relative_to(folder)
            or file.stat().st_size != record["file_size"]
            or file.stat().st_size > 4 * 1024 * 1024
            or hashlib.sha256(file.read_bytes()).hexdigest() != record["sha256"]
        ):
            raise ValueError("AppEEARS output integrity failure")
        if record["file_type"] == "tif":
            with Image.open(file) as image:
                if image.width * image.height > 1000000:
                    raise ValueError("Raster inspection pixel limit exceeded")
                values = np.array(image)
                if values.ndim != 2 or values.dtype.kind not in "iuf":
                    raise ValueError("Expected one numeric raster band")
                nodata = float(image.tag_v2[42113])
                valid = np.isfinite(values) & (values != nodata)
                tags = str(image.tag_v2.get(42112, "<GDALMetadata/>"))
                metadata = {item.attrib["name"]: item.text for item in ElementTree.fromstring(tags)}
                result = {
                    "file_name": record["file_name"],
                    "source_sha256": record["sha256"],
                    "size": list(image.size),
                    "image_mode": image.mode,
                    "bits_per_sample": image.tag_v2.get(258),
                    "sample_format": image.tag_v2.get(339),
                    "pixel_count": int(values.size),
                    "nodata": nodata,
                    "finite_nonfill_count": int(valid.sum()),
                    "raw_range": [values[valid].min().item(), values[valid].max().item()]
                    if valid.any()
                    else None,
                    "pixel_scale": image.tag_v2.get(33550),
                    "tiepoint": image.tag_v2.get(33922),
                    "gdal_metadata": metadata,
                }
                rasters[
                    "ndvi"
                    if "NDVI" in record["file_name"]
                    else "reliability"
                    if "reliability" in record["file_name"]
                    else "quality"
                ] = (values, valid, result)
                report["rasters"].append(result)
        elif record["file_type"] == "csv":
            rows = list(csv.DictReader(file.read_text(encoding="utf-8-sig").splitlines()))
            report["csv_headers"].append(
                {
                    "file_name": record["file_name"],
                    "header": list(rows[0]) if rows else [],
                    "data_rows": len(rows),
                }
            )
            if record["file_name"].endswith("-Statistics.csv"):
                statistic = rows[0] if len(rows) == 1 else None
    ndvi, valid, descriptor = rasters["ndvi"]
    quality, quality_valid, quality_descriptor = rasters["quality"]
    reliability, reliability_valid, reliability_descriptor = rasters["reliability"]
    if not valid.any() or quality.dtype.kind not in "iu" or reliability.dtype.kind not in "iu":
        raise ValueError("No valid NDVI or unsupported QA raster type")
    for other in (quality_descriptor, reliability_descriptor):
        if any(other[key] != descriptor[key] for key in ("size", "pixel_scale", "tiepoint")):
            raise ValueError("QA and NDVI export grids differ")
    scale = float(descriptor["gdal_metadata"]["scale_factor"])
    offset = float(descriptor["gdal_metadata"]["add_offset"])
    if not math.isfinite(scale) or scale <= 0 or not math.isfinite(offset):
        raise ValueError("Unsupported NDVI scale/offset")
    physical = ndvi[valid].astype(np.float64) * scale + offset
    if not np.all(np.isfinite(physical)):
        raise ValueError("Nonfinite decoded NDVI")
    report["ndvi_physical_range"] = [float(physical.min()), float(physical.max())]
    report["scale_applied_once_to_raster_only"] = scale
    report["unweighted_all_nonfill_mean"] = float(np.mean(physical))
    report["reliability_counts_within_nonfill_ndvi"] = {
        str(int(code)): int(count)
        for code, count in zip(
            *np.unique(reliability[valid & reliability_valid], return_counts=True), strict=True
        )
    }
    report["modland_low_two_bit_counts_within_nonfill_ndvi"] = {
        str(int(code)): int(count)
        for code, count in zip(
            *np.unique(quality[valid & quality_valid] & 3, return_counts=True), strict=True
        )
    }
    report["nonfill_ndvi_with_missing_quality"] = int((valid & ~quality_valid).sum())
    report["nonfill_ndvi_with_missing_reliability"] = int((valid & ~reliability_valid).sum())
    if statistic is not None:
        mean = float(statistic["Mean"])
        count = float(statistic["Count"])
        if (
            not math.isfinite(mean)
            or not math.isfinite(count)
            or count < 0
            or not count.is_integer()
        ):
            raise ValueError("Invalid service statistics")
        report["csv_count"] = count
        report["csv_mean_already_scaled"] = mean
        report["csv_vs_raw_nonfill_mean_absolute_difference"] = abs(mean - float(np.mean(physical)))
        report["csv_count_equals_nonfill_raster_count"] = count == int(valid.sum())
        report["csv_mean_matches_unfiltered_raster_at_reported_precision"] = math.isclose(
            mean, float(np.mean(physical)), abs_tol=5e-8
        )
    report["csv_only_ingestion_admitted"] = False
    report["reason"] = (
        "Service CSV alone does not establish QA-filtered area-weighted support; "
        "retain QA rasters and calculate locally in D12/D14. Geographic output "
        "has edge cells; no claim that raw pixel count equals eligible area."
    )
    output = folder / f"appeears-{benchmark.lower()}-inspection.json"
    output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact-dir", type=Path, required=True)
    parser.add_argument("--benchmark", choices=("B01", "B02"), required=True)
    args = parser.parse_args()
    folder = args.artifact_dir.resolve()
    if not folder.is_relative_to(ROOT / "artifacts/f05"):
        parser.error("F05 artifact directory required")
    report = inspect(folder, args.benchmark)
    print(json.dumps({k: v for k, v in report.items() if k not in ("rasters", "csv_headers")}))


if __name__ == "__main__":
    main()
