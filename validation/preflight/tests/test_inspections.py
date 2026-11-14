"""Synthetic format fixtures; never NASA observations or application inputs."""

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import numcodecs
import numpy as np
from PIL import Image, TiffImagePlugin

from validation.preflight.inspect_appeears import inspect
from validation.preflight.inspect_power import decode, gregorian_times


class CodecTests(unittest.TestCase):
    def test_declared_codec_and_filter_then_shape(self) -> None:
        # Hand-encoded FixedScaleOffset values: (physical - 1000) * 100.
        encoded = np.array([-100150, -99775], dtype="<f4")
        compressor = numcodecs.get_codec(
            {"id": "blosc", "cname": "zstd", "clevel": 3, "shuffle": 1}
        )
        descriptor = {
            "zarr_format": 2,
            "compressor": compressor.get_config(),
            "filters": [
                {
                    "id": "fixedscaleoffset",
                    "scale": 100,
                    "offset": 1000,
                    "dtype": "<f4",
                    "astype": "<f4",
                }
            ],
            "dtype": "<f4",
            "chunks": [1, 1, 2],
            "order": "C",
        }
        result = decode(compressor.encode(encoded), descriptor)
        np.testing.assert_array_equal(result, [[[-1.5, 2.25]]])
        descriptor["chunks"] = [1, 1, 3]
        with self.assertRaises(ValueError):
            decode(compressor.encode(encoded), descriptor)

    def test_calendar_positions_preserve_leap_day_and_native_label(self) -> None:
        dates = gregorian_times([0, 1, 2], {"units": "days since 2004-02-28 00:00:00"})
        self.assertEqual(
            [x.strftime("%Y-%m-%d") for x in dates], ["2004-02-28", "2004-02-29", "2004-03-01"]
        )
        self.assertIsNone(dates[0].tzinfo)
        for attributes in (
            {"units": "months since 2004-01-01"},
            {"units": "days since 2004-01-01", "calendar": "360_day"},
        ):
            with self.assertRaises(ValueError):
                gregorian_times([0], attributes)


class AppEEARSFormatTests(unittest.TestCase):
    def fixture(
        self,
        folder: Path,
        *,
        all_fill: bool = False,
        moved_qa: bool = False,
        missing_quality: bool = False,
    ) -> list[dict[str, object]]:
        records: list[dict[str, object]] = []
        specifications = [
            (
                "NDVI",
                [[-3000, 10000], [-2000, 0]] if not all_fill else [[-3000] * 2] * 2,
                -3000,
                0.0001,
            ),
            ("VI_Quality", [[65535, 0], [0, 65535 if missing_quality else 2]], 65535, 1),
            ("pixel_reliability", [[-1, 0], [1, 3]], -1, 1),
        ]
        for layer, values, fill, scale in specifications:
            path = folder / (layer + ".tif")
            tags = TiffImagePlugin.ImageFileDirectory_v2()
            tags[42113] = str(fill)
            tags[33550] = (1.0, 1.0, 0.0)
            tags[33922] = (
                0.0,
                0.0,
                0.0,
                5.0 if moved_qa and layer == "VI_Quality" else 0.0,
                2.0,
                0.0,
            )
            tags[42112] = (
                f'<GDALMetadata><Item name="scale_factor">{scale}</Item>'
                '<Item name="add_offset">0</Item></GDALMetadata>'
            )
            array = np.array(values, dtype=np.uint16 if layer == "VI_Quality" else np.int32)
            Image.fromarray(array).save(path, tiffinfo=tags)
            records.append(
                {
                    "file_name": layer + ".tif",
                    "local_artifact": path.name,
                    "file_type": "tif",
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "file_size": path.stat().st_size,
                }
            )
        csv_file = folder / "MOD13A3-061-Statistics.csv"
        # Three physical values 1, -.2, 0 have exact mean 4/15.
        csv_file.write_text("Count,Mean\n3,0.2666667\n", encoding="utf-8")
        records.append(
            {
                "file_name": csv_file.name,
                "local_artifact": csv_file.name,
                "file_type": "csv",
                "sha256": hashlib.sha256(csv_file.read_bytes()).hexdigest(),
                "file_size": csv_file.stat().st_size,
            }
        )
        (folder / "appeears-b01-downloads.json").write_text(json.dumps(records), encoding="utf-8")
        return records

    def test_raster_scaled_once_csv_already_physical_negative_ndvi_retained(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.fixture(folder)
            result = inspect(folder, "B01")
        self.assertEqual(result["ndvi_physical_range"], [-0.2, 1.0])
        self.assertAlmostEqual(result["unweighted_all_nonfill_mean"], 4 / 15)
        self.assertEqual(result["csv_mean_already_scaled"], 0.2666667)
        self.assertEqual(result["reliability_counts_within_nonfill_ndvi"], {"0": 1, "1": 1, "3": 1})
        self.assertTrue(result["csv_count_equals_nonfill_raster_count"])
        self.assertFalse(result["csv_only_ingestion_admitted"])

    def test_empty_observations_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.fixture(folder, all_fill=True)
            with self.assertRaisesRegex(ValueError, "No valid NDVI"):
                inspect(folder, "B01")

    def test_mismatched_grid_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.fixture(folder, moved_qa=True)
            with self.assertRaisesRegex(ValueError, "grids differ"):
                inspect(folder, "B01")

    def test_missing_qa_is_not_misclassified_as_cloud(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.fixture(folder, missing_quality=True)
            result = inspect(folder, "B01")
        self.assertEqual(result["nonfill_ndvi_with_missing_quality"], 1)
        self.assertNotIn("3", result["modland_low_two_bit_counts_within_nonfill_ndvi"])

    def test_changed_artifact_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            self.fixture(folder)
            (folder / "NDVI.tif").write_bytes(b"changed transport fixture")
            with self.assertRaisesRegex(ValueError, "integrity failure"):
                inspect(folder, "B01")


if __name__ == "__main__":
    unittest.main()
