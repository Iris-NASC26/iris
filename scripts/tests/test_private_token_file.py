"""Offline checks for the user-authorized private env migration; no real secrets."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from validation.preflight.inspect_sources import (
    InspectionError,
    private_token,
    token_from_file,
)


class PrivateTokenTests(unittest.TestCase):
    def test_reads_only_earthdata_without_exporting_other_keys(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / ".env"
            file.write_text(
                '\ufeff# test only\nOTHER_TEST_SECRET=ignored\nEARTHDATA_TOKEN = "test-token"\n',
                encoding="utf-8",
            )
            with patch.dict(os.environ, {}, clear=True):
                self.assertEqual(token_from_file(file), "test-token")
                self.assertNotIn("OTHER_TEST_SECRET", os.environ)

    def test_rejects_duplicates_oversize_and_whitespace_without_value_in_error(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / ".env"
            for content in (
                "EARTHDATA_TOKEN=first\nEARTHDATA_TOKEN=second",
                "x" * 65537,
                "EARTHDATA_TOKEN='private test token'",
            ):
                file.write_text(content, encoding="utf-8")
                with self.assertRaises(InspectionError) as caught:
                    token_from_file(file)
                self.assertNotIn("private test token", str(caught.exception))

    def test_project_path_and_environment_precedence_do_not_contact_provider(self) -> None:
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / ".env").write_text("EARTHDATA_TOKEN=project-test", encoding="utf-8")
            with (
                patch("validation.preflight.inspect_sources.ROOT", root),
                patch.dict(os.environ, {}, clear=True),
                patch("validation.preflight.inspect_sources.build_opener") as network,
            ):
                self.assertEqual(private_token(), "project-test")
                with patch.dict(os.environ, {"EARTHDATA_TOKEN": "environment-test"}):
                    self.assertEqual(private_token(), "environment-test")
                network.assert_not_called()


if __name__ == "__main__":
    unittest.main()
