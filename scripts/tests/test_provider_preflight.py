"""Offline F05 safety tests; bytes below are transport fixtures, not NASA data."""

import hashlib
import io
import tempfile
import time
import unittest
from email.message import Message
from pathlib import Path
from typing import Any
from unittest.mock import patch
from urllib.error import HTTPError

from scripts.provider_preflight import (
    OBJECT_LIMIT,
    RUN_LIMIT,
    NoRedirect,
    PreflightError,
    PublicRun,
    chunk_budget,
    read_bounded,
    validate_url,
)


class Response(io.BytesIO):
    def __init__(self, body: bytes, length: str | None = None) -> None:
        super().__init__(body)
        self.headers = {} if length is None else {"Content-Length": length}
        self.status = 200


class SafetyTests(unittest.TestCase):
    def test_public_https_only(self) -> None:
        validate_url("https://cmr.earthdata.nasa.gov/search/collections.umm_json?page_size=1")
        for url in (
            "http://cmr.earthdata.nasa.gov/",
            "https://cmr.earthdata.nasa.gov.attacker.example/",
            "https://127.0.0.1/",
            "https://name:secret@cmr.earthdata.nasa.gov/",
            "https://cmr.earthdata.nasa.gov:9999/",
            "https://cmr.earthdata.nasa.gov/#token",
            "https://cmr.earthdata.nasa.gov/?access_token=transport-test-marker",
            "https://cmr.earthdata.nasa.gov/?access%5Ftoken=transport-test-marker",
            "https://cmr.earthdata.nasa.gov/?X-Amz-Signature=transport-test-marker",
        ):
            with self.subTest(url=url), self.assertRaises(PreflightError):
                validate_url(url)

    def test_redirect_never_followed(self) -> None:
        handler: Any = NoRedirect()
        self.assertIsNone(
            handler.redirect_request(None, None, 302, None, {}, "https://example.org")
        )

    def test_exact_declared_size_allowed(self) -> None:
        self.assertEqual(read_bounded(Response(b"1234", "4"), 4, time.monotonic() + 10), b"1234")

    def test_small_unframed_response_allowed(self) -> None:
        self.assertEqual(read_bounded(Response(b"123"), 4, time.monotonic() + 10), b"123")

    def test_oversized_header_rejected_before_read(self) -> None:
        response = Response(b"12345", "5")
        with self.assertRaises(PreflightError):
            read_bounded(response, 4, time.monotonic() + 10)
        self.assertEqual(response.tell(), 0)

    def test_unframed_overflow_stops_at_budget(self) -> None:
        response = Response(b"12345")
        with self.assertRaises(PreflightError):
            read_bounded(response, 4, time.monotonic() + 10)
        self.assertEqual(response.tell(), 4)

    def test_truncated_or_invalid_length_rejected(self) -> None:
        for length in ("4", "-1", "invalid"):
            with self.subTest(length=length), self.assertRaises(PreflightError):
                read_bounded(Response(b"123", length), 10, time.monotonic() + 10)

    def test_deadline_rejected_before_read(self) -> None:
        response = Response(b"123")
        with self.assertRaises(PreflightError):
            read_bounded(response, 4, time.monotonic() - 1)
        self.assertEqual(response.tell(), 0)

    def test_received_bytes_reported_even_on_failure(self) -> None:
        received: list[int] = []
        with self.assertRaises(PreflightError):
            read_bounded(Response(b"12345"), 4, time.monotonic() + 10, received.append)
        self.assertEqual(sum(received), 4)

    def test_padded_edge_chunks_in_budget(self) -> None:
        budget = chunk_budget(
            {"shape": [5, 3, 3], "chunks": [5, 2, 2], "dtype": "<f4", "zarr_format": 2}
        )
        # Four padded chunks of 80 bytes each; scientific values alone are 180 bytes.
        self.assertEqual(
            budget,
            {
                "padded_chunk_uncompressed_bytes": 80,
                "source_values_uncompressed_bytes": 180,
                "global_chunk_count": 4,
            },
        )

    def test_changed_array_layout_blocks_chunk_request(self) -> None:
        for change in (
            {"dtype": "<f8"},
            {"shape": [1, 2]},
            {"chunks": [0, 2, 2]},
            {"chunks": [True, 2, 2]},
            {"zarr_format": 3},
            {"dimension_separator": "/"},
        ):
            value = {
                "shape": [5, 3, 3],
                "chunks": [5, 2, 2],
                "dtype": "<f4",
                "zarr_format": 2,
            }
            value.update(change)
            with self.subTest(change=change), self.assertRaises(PreflightError):
                chunk_budget(value)

    @patch("scripts.provider_preflight.time.sleep")
    def test_http_failure_body_never_saved(self, _sleep: object) -> None:
        with tempfile.TemporaryDirectory() as folder:
            run = PublicRun(Path(folder))
            error = HTTPError("https://cmr.earthdata.nasa.gov/", 403, "withheld", Message(), None)
            with patch.object(run.opener, "open", side_effect=error):
                self.assertIsNone(run.fetch("test", "https://cmr.earthdata.nasa.gov/"))
            self.assertEqual(run.records[0]["http_status"], 403)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_exhausted_run_makes_no_request(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            run = PublicRun(Path(folder))
            run.bytes = RUN_LIMIT
            with (
                patch.object(run.opener, "open") as network,
                self.assertRaises(PreflightError),
            ):
                run.fetch("test", "https://cmr.earthdata.nasa.gov/")
            network.assert_not_called()

    def test_path_traversal_rejected_before_network(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            run = PublicRun(Path(folder))
            with (
                patch.object(run.opener, "open") as network,
                self.assertRaises(PreflightError),
            ):
                run.fetch("../outside", "https://cmr.earthdata.nasa.gov/")
            network.assert_not_called()

    @patch("scripts.provider_preflight.time.sleep")
    def test_invalid_json_accounted_but_not_saved(self, _sleep: object) -> None:
        with tempfile.TemporaryDirectory() as folder:
            run = PublicRun(Path(folder))
            with patch.object(run.opener, "open", return_value=Response(b"<html>")):
                self.assertIsNone(run.fetch("test", "https://cmr.earthdata.nasa.gov/"))
            self.assertEqual(run.bytes, 6)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_object_limit_is_smaller_than_total(self) -> None:
        self.assertLess(OBJECT_LIMIT, RUN_LIMIT)

    @patch("scripts.provider_preflight.time.sleep")
    def test_successful_json_is_hashed_and_saved_exactly(self, _sleep: object) -> None:
        body = b'{"transport_fixture":true}'
        with tempfile.TemporaryDirectory() as folder:
            run = PublicRun(Path(folder))
            with patch.object(run.opener, "open", return_value=Response(body, str(len(body)))):
                self.assertEqual(
                    run.fetch("test", "https://cmr.earthdata.nasa.gov/"),
                    {"transport_fixture": True},
                )
            self.assertEqual((Path(folder) / "test.json").read_bytes(), body)
            self.assertEqual(run.records[0]["sha256"], hashlib.sha256(body).hexdigest())
            self.assertEqual(run.bytes, len(body))

    @patch("scripts.provider_preflight.time.sleep")
    def test_binary_login_html_is_rejected(self, _sleep: object) -> None:
        with tempfile.TemporaryDirectory() as folder:
            run = PublicRun(Path(folder))
            with patch.object(run.opener, "open", return_value=Response(b"<html>")):
                self.assertIsNone(run.fetch("test", "https://cmr.earthdata.nasa.gov/", binary=True))
            self.assertEqual(run.bytes, 6)
            self.assertEqual(list(Path(folder).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
