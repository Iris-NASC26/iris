"""Offline byte fixtures for F05 source reads; no NASA observations or live auth."""

import io
import unittest
from email.message import Message
from unittest.mock import patch
from urllib.error import HTTPError

from validation.preflight.inspect_sources import (
    FILE_LIMIT,
    PAGE,
    InspectionError,
    RemoteRanges,
    source_location,
)


class RangeResponse(io.BytesIO):
    def __init__(self, data: bytes, start: int, end: int, total: int) -> None:
        super().__init__(data)
        self.status = 206
        self.headers = {
            "Content-Range": f"bytes {start}-{end}/{total}",
            "Content-Length": str(end - start + 1),
            "ETag": "fixture-version-1",
        }


class RangeTests(unittest.TestCase):
    def test_redirect_drops_earthdata_header(self) -> None:
        headers = Message()
        destination = "https://d2b3c3wh8s6en5.cloudfront.net/fixture?signature=transport-marker"
        headers["Location"] = destination
        error = HTTPError(
            "https://data.gesdisc.earthdata.nasa.gov/fixture", 303, "fixture", headers, None
        )
        with patch("validation.preflight.inspect_sources.build_opener") as build:
            build.return_value.open.side_effect = error
            url, forwarded = source_location(
                "https://data.gesdisc.earthdata.nasa.gov/fixture", "transport-marker"
            )
            request = build.return_value.open.call_args.args[0]
        self.assertEqual(url, destination)
        self.assertEqual(forwarded, {})
        self.assertEqual(request.get_header("Authorization"), "Bearer transport-marker")

    def test_unexpected_redirect_blocked(self) -> None:
        headers = Message()
        headers["Location"] = "https://attacker.example/fixture"
        error = HTTPError(
            "https://data.gesdisc.earthdata.nasa.gov/fixture", 303, "fixture", headers, None
        )
        with patch("validation.preflight.inspect_sources.build_opener") as build:
            build.return_value.open.side_effect = error
            with self.assertRaisesRegex(InspectionError, "credentials not forwarded"):
                source_location(
                    "https://data.gesdisc.earthdata.nasa.gov/fixture", "transport-marker"
                )
        self.assertEqual(build.return_value.open.call_count, 1)

    def test_private_or_unapproved_source_never_requested(self) -> None:
        with patch("validation.preflight.inspect_sources.build_opener") as build:
            for url in (
                "http://data.gesdisc.earthdata.nasa.gov/fixture",
                "https://data.gesdisc.earthdata.nasa.gov/?access_token=transport-marker",
                "https://127.0.0.1/fixture",
            ):
                with self.subTest(url=url), self.assertRaises(InspectionError):
                    source_location(url, "transport-marker")
            build.assert_not_called()

    def test_seek_and_read_cross_page_preserve_actual_bytes(self) -> None:
        source = bytes(range(256)) * 512
        reader = RemoteRanges("https://not-requested.example", {}, len(source))
        with patch.object(
            reader._opener,
            "open",
            side_effect=[
                RangeResponse(source[:PAGE], 0, PAGE - 1, len(source)),
                RangeResponse(source[PAGE:], PAGE, len(source) - 1, len(source)),
            ],
        ) as network:
            reader.seek(PAGE - 3)
            self.assertEqual(reader.read(8), source[PAGE - 3 : PAGE + 5])
            reader.seek(0)
            self.assertEqual(reader.read(8), source[:8])
            self.assertEqual(network.call_count, 2)
        self.assertEqual(reader.received, len(source))

    def test_last_page_is_not_padded(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        with patch.object(reader._opener, "open", return_value=RangeResponse(b"abc", 0, 2, 3)):
            self.assertEqual(reader.read(20), b"abc")
            self.assertEqual(reader.read(20), b"")
            self.assertEqual(reader.pages[0], b"abc")

    def test_unexpected_range_is_rejected_before_read(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        response = RangeResponse(b"abc", 0, 2, 4)
        with patch.object(reader._opener, "open", return_value=response):
            with self.assertRaises(InspectionError):
                reader.read(1)
            self.assertEqual(reader.received, 0)

    def test_server_ignoring_range_is_rejected(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        response = RangeResponse(b"abc", 0, 2, 3)
        response.status = 200
        with patch.object(reader._opener, "open", return_value=response):
            with self.assertRaises(InspectionError):
                reader.read(1)

    def test_content_length_mismatch_is_rejected(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        response = RangeResponse(b"abc", 0, 2, 3)
        response.headers["Content-Length"] = "4"
        with patch.object(reader._opener, "open", return_value=response):
            with self.assertRaises(InspectionError):
                reader.read(1)

    def test_truncated_range_is_not_cached(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        with patch.object(reader._opener, "open", return_value=RangeResponse(b"ab", 0, 2, 3)):
            with self.assertRaises(InspectionError):
                reader.read(1)
        self.assertEqual(reader.received, 2)
        self.assertEqual(reader.pages, {})

    def test_changed_source_version_cannot_mix_ranges(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, PAGE + 3)
        changed = RangeResponse(b"def", PAGE, PAGE + 2, PAGE + 3)
        changed.headers["ETag"] = "fixture-version-2"
        with patch.object(
            reader._opener,
            "open",
            side_effect=[RangeResponse(b"x" * PAGE, 0, PAGE - 1, PAGE + 3), changed],
        ):
            reader.read(1)
            reader.seek(PAGE)
            with self.assertRaises(InspectionError):
                reader.read(1)

    def test_transfer_ceiling_checked_before_request(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, FILE_LIMIT + 1)
        reader.received = FILE_LIMIT
        with patch.object(reader._opener, "open") as network:
            with self.assertRaises(InspectionError):
                reader.read(1)
            network.assert_not_called()

    def test_large_unbounded_read_rejected(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, FILE_LIMIT + 1)
        with patch.object(reader._opener, "open") as network:
            with self.assertRaises(InspectionError):
                reader.read()
            network.assert_not_called()

    def test_invalid_seek_and_seek_origins(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        self.assertEqual(reader.seek(-1, 2), 2)
        self.assertEqual(reader.seek(-1, 1), 1)
        for offset, whence in [(-1, 0), (4, 0), (0, 3)]:
            with self.subTest(offset=offset, whence=whence), self.assertRaises(InspectionError):
                reader.seek(offset, whence)

    def test_readinto_uses_exact_received_data(self) -> None:
        reader = RemoteRanges("https://not-requested.example", {}, 3)
        with patch.object(reader._opener, "open", return_value=RangeResponse(b"abc", 0, 2, 3)):
            destination = bytearray(5)
            self.assertEqual(reader.readinto(destination), 3)
        self.assertEqual(destination[:3], b"abc")


if __name__ == "__main__":
    unittest.main()
