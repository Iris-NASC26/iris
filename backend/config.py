"""
Environment & Credential Loader for Project Iris Backend
Reads `backend/.env` and environment variables without exposing secrets to logs or frontend.
"""

from __future__ import annotations

import os
from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parent / ".env"


def load_backend_env() -> None:
    if not _ENV_PATH.exists():
        return
    for raw_line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            os.environ[key] = val


load_backend_env()


def get_gemini_api_key(override: str | None = None) -> str:
    load_backend_env()
    return (override or os.environ.get("GEMINI_API_KEY", "")).strip()


def get_gemini_model() -> str:
    load_backend_env()
    return os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()


def get_earthdata_token(override: str | None = None) -> str:
    load_backend_env()
    return (override or os.environ.get("EARTHDATA_TOKEN", "")).strip()


def get_noaa_cdo_token(override: str | None = None) -> str:
    load_backend_env()
    return (override or os.environ.get("NOAA_CDO_TOKEN", "")).strip()


def get_cdsapi_credentials() -> tuple[str, str]:
    load_backend_env()
    url = os.environ.get("CDSAPI_URL", "https://cds.climate.copernicus.eu/api").strip()
    key = os.environ.get("CDSAPI_KEY", "").strip()
    return url, key


GEMINI_MODEL: str = get_gemini_model()
