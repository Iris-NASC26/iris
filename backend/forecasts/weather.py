"""Protected, bounded ECMWF ensemble access, independent of historical cases."""

import hashlib
import json
import logging
from datetime import UTC, datetime, timedelta

import httpx
from hazards.meteomatics import ForecastUnavailable, credentials
from hazards.rainfall import iso

from .catalog import region
from .ensemble import PARAMETER, normalize
from .store import reserve

logger = logging.getLogger(__name__)


def retrieve(identifier: str) -> dict:
    point = region(identifier)
    auth = credentials()
    if not reserve():
        raise ForecastUnavailable(
            "The persistent daily forecast-query budget is exhausted.", 429
        )
    now = datetime.now(UTC)
    # Align intervals to UTC 3-hour boundaries; first complete interval is future.
    boundary = now.replace(hour=(now.hour // 3) * 3, minute=0, second=0, microsecond=0)
    start = boundary + timedelta(hours=6)
    end = start + timedelta(hours=69)
    url = f"https://api.meteomatics.com/{iso(start)}--{iso(end)}:PT3H/{PARAMETER}/{point['latitude']},{point['longitude']}/json"
    params = {
        "source": "ecmwf-ens",
        "ens_select": "member:0,member:1-50",
        "timeout": 25,
    }
    try:
        with (
            httpx.Client(auth=auth, timeout=35, follow_redirects=False) as client,
            client.stream("GET", url, params=params) as response,
        ):
            if response.status_code != 200:
                logger.warning(
                    "Ensemble forecast provider returned HTTP %s", response.status_code
                )
                raise ForecastUnavailable(
                    "The provider refused this ensemble request; check access or quota.",
                    429 if response.status_code == 429 else 503,
                )
            chunks, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > 2 * 1024 * 1024:
                    raise ForecastUnavailable(
                        "Forecast response exceeded its size limit.", 502
                    )
                chunks.append(chunk)
        raw = b"".join(chunks)
        retrieved = datetime.now(UTC)
        try:
            normalized = normalize(json.loads(raw), point, start, retrieved)
        except (ValueError, KeyError, TypeError, AttributeError):
            raise ForecastUnavailable(
                "The ensemble forecast failed validation; no predictions were substituted.",
                502,
            ) from None
        result = {
            "schema_version": "iris.forecast.v1",
            "id": identifier,
            "kind": "precipitation",
            "location": point,
            "provider": "Meteomatics",
            "model": "ecmwf-ens",
            "model_initialization_at": None,
            "parameter": PARAMETER,
            "units": "mm",
            "quantity": "total_precipitation_water_equivalent",
            "interval_hours": 3,
            "spatial_support": "point",
            "time_standard": "UTC",
            "retrieved_at": iso(retrieved),
            "expires_at": iso(retrieved + timedelta(hours=3)),
            "source_url": str(httpx.URL(url, params=params)),
            "source_response_sha256": hashlib.sha256(raw).hexdigest(),
            "ensemble_size": 51,
            "quantile_method": "linear",
            "interval_meaning": "ensemble_10th_to_90th_percentiles_not_calibrated_probability",
            "warning_state": "not_evaluated",
            "iris_ml_applied": False,
            **normalized,
        }
        result["artifact_id"] = hashlib.sha256(
            json.dumps(result, sort_keys=True, allow_nan=False).encode()
        ).hexdigest()
        return result
    except httpx.HTTPError:
        raise ForecastUnavailable(
            "The ensemble forecast provider is unreachable; retry later."
        ) from None
