"""Cross-platform F02 setup, checks and supervised local development.

Run with a bootstrap Python 3.13+; uv supplies the pinned application interpreter.
No NASA requests or credentials are involved.
"""

import argparse
import logging
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
NODE_VERSION = "v24.19.0"
UV_VERSION = "0.12.9"
PNPM_VERSION = "12.18.0"
logger = logging.getLogger("earth_trend.dev")


def executable(name: str) -> str:
    path = shutil.which(name)
    if path is None:
        raise RuntimeError(f"Missing {name}; see docs/DEVELOPMENT.md for prerequisites.")
    return path


def run(args: list[str], cwd: Path = ROOT) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def check_tools() -> None:
    node_version = subprocess.check_output([executable("node"), "--version"], text=True).strip()
    uv_version = subprocess.check_output([executable("uv"), "--version"], text=True).split()[1]
    if node_version != NODE_VERSION or uv_version != UV_VERSION:
        raise RuntimeError(
            f"Use Node {NODE_VERSION} and uv {UV_VERSION}; "
            f"found {node_version} and uv {uv_version}."
        )


def pnpm(*args: str) -> list[str]:
    # npx downloads only the pinned package manager. Frozen workspace dependencies
    # are always read from the committed pnpm lockfile.
    return [executable("npx"), "--yes", f"pnpm@{PNPM_VERSION}", *args]


def backend_python() -> Path:
    folder = "Scripts" if sys.platform == "win32" else "bin"
    binary = "python.exe" if sys.platform == "win32" else "python"
    path = BACKEND / ".venv" / folder / binary
    if not path.is_file():
        raise RuntimeError("Backend environment is missing; run python scripts/dev.py setup.")
    return path


def require_free_ports() -> None:
    for port in (8000, 5173):
        with socket.socket() as probe:
            try:
                probe.bind(("127.0.0.1", port))
            except OSError as error:
                raise RuntimeError(
                    f"Local port {port} is already in use. Stop that service first."
                ) from error


def stop(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def start() -> None:
    vite = ROOT / "web" / "node_modules" / "vite" / "bin" / "vite.js"
    if not vite.is_file():
        raise RuntimeError("Frontend dependencies are missing; run python scripts/dev.py setup.")
    python = backend_python()
    require_free_ports()
    processes: list[subprocess.Popen[bytes]] = []
    try:
        processes.append(subprocess.Popen([str(python), "-m", "earth_trend.cli"], cwd=BACKEND))
        deadline = time.monotonic() + 15
        while True:
            if processes[0].poll() is not None:
                raise RuntimeError("Backend exited before it became healthy.")
            try:
                with urlopen("http://127.0.0.1:8000/api/v1/health", timeout=0.5) as response:
                    if response.status == 200:
                        break
            except (URLError, TimeoutError):
                pass
            if time.monotonic() >= deadline:
                raise RuntimeError("Backend did not become healthy within 15 seconds.")
            time.sleep(0.1)
        processes.append(subprocess.Popen([executable("node"), str(vite)], cwd=ROOT / "web"))
        logger.info("Open http://127.0.0.1:5173 — Ctrl+C stops both servers")
        while all(process.poll() is None for process in processes):
            time.sleep(0.2)
        raise RuntimeError("A local server exited; both servers have been stopped.")
    finally:
        for process in reversed(processes):
            stop(process)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command", choices=("setup", "start", "check", "browser", "contracts", "contracts-check")
    )
    args = parser.parse_args()
    try:
        check_tools()
        match args.command:
            case "setup":
                run([executable("uv"), "sync", "--locked"], BACKEND)
                run(pnpm("install", "--frozen-lockfile"))
                logger.info("Setup complete. Start with: python scripts/dev.py start")
            case "start":
                start()
            case "check":
                python = str(backend_python())
                run(pnpm("--dir", "web", "contracts:check"))
                for command in (
                    [
                        python,
                        "-m",
                        "ruff",
                        "check",
                        "src",
                        "tests",
                        "../scripts/dev.py",
                    ],
                    [
                        python,
                        "-m",
                        "ruff",
                        "format",
                        "--check",
                        "src",
                        "tests",
                        "../scripts/dev.py",
                    ],
                    [python, "-m", "mypy"],
                    [python, "-m", "pytest"],
                ):
                    run(command, BACKEND)
                run(pnpm("check"))
                run(pnpm("test"))
                run(pnpm("build"))
            case "browser":
                run(pnpm("test:browser"))
            case "contracts":
                run(pnpm("--dir", "web", "contracts:generate"))
            case "contracts-check":
                run(pnpm("--dir", "web", "contracts:check"))
        return 0
    except KeyboardInterrupt:
        logger.info("Local development stopped")
        return 130
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        logger.error("%s", error)
        return 1


if __name__ == "__main__":
    sys.exit(main())
