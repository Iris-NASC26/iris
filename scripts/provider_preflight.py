"""F05 anonymous, read-only NASA preflight; never a production data adapter.

Run explicitly with ``python scripts/provider_preflight.py --run-public``.
No credentials, cookies, provider jobs, scientific decoding or dependencies.
Responses stay in ignored artifacts; the manifest records actual bytes and hashes.
"""

import argparse
import hashlib
import json
import logging
import math
import re
import shutil
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
OBJECT_LIMIT = 4 * 1024 * 1024
RUN_LIMIT = 32 * 1024 * 1024
TIMEOUT = 20
HOSTS = frozenset(
    {
        "nasa-power.s3.us-west-2.amazonaws.com",
        "power.larc.nasa.gov",
        "cmr.earthdata.nasa.gov",
        "harmony.earthdata.nasa.gov",
        "api.giovanni.earthdata.nasa.gov",
        "appeears.earthdatacloud.nasa.gov",
    }
)
COLLECTIONS = (
    ("GPCPMON", "3.3", "C3405935516-GES_DISC"),
    ("GPM_3IMERGM", "07", "C2723754851-GES_DISC"),
    ("GLDAS_NOAH025_M", "2.1", "C1342986036-GES_DISC"),
    ("AIRS3STM", "7.0", "C1701805662-GES_DISC"),
    ("OMNO2d", "003", "C1266136111-GES_DISC"),
    ("M2TMNXAER", "5.12.4", "C1276812866-GES_DISC"),
    ("MODISA_L3m_CHL", "2022.0", "C3380709133-OB_CLOUD"),
    ("SeaWiFS_L3m_CHL", "2022.0", "C3113254690-OB_CLOUD"),
)
STORES = (
    ("V01", "merra2", "utc", "T2M", "0.8.4"),
    ("V12", "syn1deg", "lst", "ALLSKY_SFC_SW_DWN", "0.2.1"),
)
logger = logging.getLogger("earth_trend.preflight")


class PreflightError(ValueError):
    """Safe diagnostic containing no provider response body or credentials."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


def validate_url(url: str) -> None:
    parsed = urlsplit(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in HOSTS
        or parsed.username is not None
        or parsed.password is not None
        or parsed.port not in (None, 443)
        or parsed.fragment
    ):
        raise PreflightError("URL is outside the public preflight allowlist")
    # There are no caller-supplied URLs in the CLI. Reject secret-bearing queries
    # as defense in depth if this helper is reused during preflight maintenance.
    if re.search(
        r"token|password|credential|signature|authorization",
        unquote(parsed.query),
        re.IGNORECASE,
    ):
        raise PreflightError("Credential-bearing URL forbidden")


def read_bounded(
    response: Any,
    limit: int,
    deadline: float,
    received: Callable[[int], None] = lambda _: None,
) -> bytes:
    declared = response.headers.get("Content-Length")
    if declared is not None and (not declared.isdecimal() or int(declared) > limit):
        raise PreflightError("Invalid or oversized Content-Length")
    chunks: list[bytes] = []
    count = 0
    while count < limit:
        if time.monotonic() > deadline:
            raise PreflightError("Response deadline exceeded")
        part = response.read(min(65536, limit - count))
        if not part:
            break
        count += len(part)
        received(len(part))
        chunks.append(part)
    if declared is not None and count != int(declared):
        raise PreflightError("Truncated or inconsistent Content-Length")
    if declared is None and count == limit:
        raise PreflightError("Unframed response reached byte budget; no extra read permitted")
    return b"".join(chunks)


def chunk_budget(array: dict[str, Any]) -> dict[str, int]:
    shape, chunks = array["shape"], array["chunks"]
    if (
        len(shape) != 3
        or len(chunks) != 3
        or any(type(n) is not int or n <= 0 for n in (*shape, *chunks))
        or array.get("dtype") != "<f4"
        or array.get("zarr_format") != 2
        or array.get("dimension_separator", ".") != "."
    ):
        raise PreflightError("Unexpected POWER array layout; inspect before requesting data")
    return {
        "padded_chunk_uncompressed_bytes": math.prod(chunks) * 4,
        "source_values_uncompressed_bytes": math.prod(shape) * 4,
        "global_chunk_count": math.prod(
            math.ceil(s / c) for s, c in zip(shape, chunks, strict=True)
        ),
    }


class PublicRun:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.opener = build_opener(NoRedirect())
        self.records: list[dict[str, Any]] = []
        self.bytes = 0

    def fetch(self, label: str, url: str, *, binary: bool = False) -> Any:
        validate_url(url)
        if re.fullmatch(r"[A-Za-z0-9_-]+", label) is None:
            raise PreflightError("Invalid artifact label")
        remaining = RUN_LIMIT - self.bytes
        if remaining <= 0:
            raise PreflightError("Run byte budget exhausted")
        record: dict[str, Any] = {
            "label": label,
            "url": url,
            "kind": "binary" if binary else "json",
        }
        self.records.append(record)
        started = time.monotonic()
        body = b""
        record["bytes"] = 0

        def received(count: int) -> None:
            self.bytes += count
            record["bytes"] += count

        try:
            request = Request(url, headers={"User-Agent": "EarthTrendDetective-F05/1.0"})
            with self.opener.open(request, timeout=TIMEOUT) as response:
                record["http_status"] = response.status
                # Do not keep cookies, Location, signed URLs or arbitrary headers.
                record["content_type"] = response.headers.get("Content-Type", "")
                body = read_bounded(
                    response, min(OBJECT_LIMIT, remaining), started + TIMEOUT, received
                )
            record["sha256"] = hashlib.sha256(body).hexdigest()
            if binary:
                if not body or body.lstrip().startswith((b"<", b"{")):
                    raise PreflightError("Binary response absent or looks like HTML/JSON")
                value: Any = None
            else:
                value = json.loads(body)
            path = self.directory / (label + (".bin" if binary else ".json"))
            path.write_bytes(body)
            record["artifact"] = path.name
            record["status"] = "retrieved_not_scientifically_validated"
            return value
        except HTTPError as error:
            record.update(status="http_failure", http_status=error.code)
            error.close()
            return None
        except (URLError, TimeoutError, OSError):
            record["status"] = "transport_failure"
            return None
        except (ValueError, UnicodeError):
            record["status"] = "invalid_or_over_budget_response"
            return None
        finally:
            record["elapsed_seconds"] = round(time.monotonic() - started, 4)
            logger.info("%s: %s", label, record.get("status", "incomplete"))
            time.sleep(0.5)  # One outstanding transfer; no retries or job submissions.


def run_public() -> Path:
    now = datetime.now(UTC)
    tool_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    directory = ROOT / "artifacts" / "f05" / now.strftime("%Y%m%dT%H%M%S%fZ")
    directory.mkdir(parents=True, exist_ok=False)
    run = PublicRun(directory)
    budgets: dict[str, Any] = {}
    for variable, family, standard, field, chunk in STORES:
        base = (
            "https://nasa-power.s3.us-west-2.amazonaws.com/"
            f"{family}/temporal/power_{family}_monthly_temporal_{standard}.zarr"
        )
        metadata = run.fetch(variable + "-metadata", base + "/.zmetadata")
        if metadata is not None:
            try:
                array = metadata["metadata"][field + "/.zarray"]
                budgets[variable] = chunk_budget(array)
                # Check decoded allocation before fetching even this one raw chunk.
                if budgets[variable]["padded_chunk_uncompressed_bytes"] <= OBJECT_LIMIT:
                    run.fetch(
                        variable + "-raw-chunk",
                        base + "/" + field + "/" + chunk,
                        binary=True,
                    )
            except (KeyError, TypeError, PreflightError):
                budgets[variable] = {"status": "unexpected_metadata_no_chunk_requested"}
    run.fetch(
        "POWER-point-2003",
        "https://power.larc.nasa.gov/api/temporal/monthly/point?"
        + urlencode(
            dict(
                parameters="T2M,ALLSKY_SFC_SW_DWN",
                community="SB",
                longitude=-97.5,
                latitude=37.5,
                format="JSON",
                start=2003,
                end=2003,
                **{"time-standard": "UTC"},
            )
        ),
    )
    for short_name, _version, concept in COLLECTIONS:
        run.fetch(
            short_name + "-collection",
            "https://cmr.earthdata.nasa.gov/search/collections.umm_json?"
            + urlencode({"concept_id": concept, "page_size": 1}),
        )
        run.fetch(
            short_name + "-harmony",
            "https://harmony.earthdata.nasa.gov/capabilities?"
            + urlencode({"collectionId": concept, "version": 3}),
        )
        # Metadata search only: never follow the returned data/signed URLs.
        granule_query = {
            "collection_concept_id": concept,
            "page_size": "1",
            "temporal": "2005-01-01T00:00:00Z,2005-01-31T23:59:59Z",
        }
        # Temporal overlap can admit cumulative composites or a boundary month.
        if short_name in ("MODISA_L3m_CHL", "SeaWiFS_L3m_CHL"):
            mission = "AQUA_MODIS" if short_name == "MODISA_L3m_CHL" else "SEASTAR_SEAWIFS_GAC"
            granule_query["producer_granule_id"] = (
                mission + ".20050101_20050131.L3m.MO.CHL.chlor_a.9km.nc"
            )
        elif short_name == "AIRS3STM":
            granule_query["producer_granule_id"] = "AIRS.2005.01.01.L3.RetStd_IR031.v7.*.hdf"
            granule_query["options[producer_granule_id][pattern]"] = "true"
        run.fetch(
            short_name + "-granule",
            "https://cmr.earthdata.nasa.gov/search/granules.umm_json?" + urlencode(granule_query),
        )
    run.fetch(
        "Giovanni-variables",
        "https://api.giovanni.earthdata.nasa.gov/configured-variables/",
    )
    run.fetch(
        "AppEEARS-MOD13A3",
        "https://appeears.earthdatacloud.nasa.gov/api/product/MOD13A3.061",
    )
    manifest = {
        "schema_version": "f05-public-preflight.v1",
        "tool_source_sha256_at_start": tool_hash,
        "retrieval_started_utc": now.isoformat(),
        "authenticated": False,
        "provider_jobs_submitted": 0,
        "science_ready": False,
        "limits": {
            "object_bytes": OBJECT_LIMIT,
            "run_bytes": RUN_LIMIT,
            "timeout_seconds": TIMEOUT,
            "redirects": 0,
            "retries": 0,
        },
        "retrieved_body_bytes": run.bytes,
        "free_disk_bytes_at_finish": shutil.disk_usage(ROOT).free,
        "power_metadata_size_arithmetic_not_build_measurements": budgets,
        "records": run.records,
    }
    path = directory / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--run-public", action="store_true", help="Opt in to bounded real NASA GETs"
    )
    args = parser.parse_args()
    if not args.run_public:
        parser.error("No requests made. Supply --run-public to opt in.")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print(run_public())


if __name__ == "__main__":
    main()
