"""Process cleanup contract for the owned local Next.js development tree."""

import unittest
from unittest.mock import MagicMock, patch

from scripts.dev import stop


class RuntimeCleanupTests(unittest.TestCase):
    def test_windows_cleanup_targets_only_the_owned_pid_and_its_children(self) -> None:
        process = MagicMock()
        process.pid = 12345
        process.poll.return_value = None
        with (
            patch("scripts.dev.sys.platform", "win32"),
            patch("scripts.dev.executable", return_value="taskkill"),
            patch("scripts.dev.subprocess.run") as run,
        ):
            stop(process)
            self.assertEqual(run.call_args.args[0], ["taskkill", "/PID", "12345", "/T", "/F"])
            process.terminate.assert_not_called()
            process.wait.assert_called_once_with(timeout=5)

    def test_already_exited_process_is_not_signalled(self) -> None:
        process = MagicMock()
        process.poll.return_value = 0
        with patch("scripts.dev.subprocess.run") as run:
            stop(process)
            run.assert_not_called()
            process.terminate.assert_not_called()


if __name__ == "__main__":
    unittest.main()
