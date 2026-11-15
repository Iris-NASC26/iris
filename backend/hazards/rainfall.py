"""Deterministic rainfall arithmetic; no flood classifier or warning inference."""

import math
from datetime import UTC, datetime, timedelta

PARAMETER = "precip_1h:mm"
RESERVED = {-999, -888, -777, -666}


class ProviderFormatError(ValueError):
    pass


def instant(value: str) -> datetime:
    if not isinstance(value, str):
        raise ProviderFormatError("Provider timestamp must be an ISO string.")
    try:
        result = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ProviderFormatError("Invalid provider timestamp.") from exc
    if result.tzinfo is None:
        raise ProviderFormatError("Provider timestamp must include its time zone.")
    return result.astimezone(UTC)


def iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def normalize(
    payload: dict,
    latitude: float,
    longitude: float,
    start: datetime,
    hours: int,
    retrieved: datetime,
) -> dict:
    """Require the requested parameter/point, retain gaps and reserved values.

    dateGenerated is response generation time, NOT model initialization time.
    Each value is an accumulation for the preceding hour, not an hourly rate.
    """
    if (
        payload.get("status") != "OK"
        or not isinstance(payload.get("data"), list)
        or len(payload["data"]) != 1
    ):
        raise ProviderFormatError("Provider returned an incomplete rainfall response.")
    series = payload["data"][0]
    if series.get("parameter") != PARAMETER:
        raise ProviderFormatError("Provider rainfall parameter or units do not match.")
    coords = series.get("coordinates")
    if not isinstance(coords, list) or len(coords) != 1:
        raise ProviderFormatError("A single requested point is required.")
    point = coords[0]
    for field, expected in [("lat", latitude), ("lon", longitude)]:
        value = point.get(field)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or abs(value - expected) > 0.0001
        ):
            raise ProviderFormatError(
                "Provider coordinates do not match the requested point."
            )
    generated = instant(payload.get("dateGenerated"))
    if generated > retrieved + timedelta(
        minutes=5
    ) or generated < retrieved - timedelta(hours=1):
        raise ProviderFormatError(
            "Provider response generation time is inconsistent or stale."
        )
    if not isinstance(point.get("dates"), list) or len(point["dates"]) > hours:
        raise ProviderFormatError("Unexpected provider time series size.")
    expected = [start + timedelta(hours=i) for i in range(hours)]
    values = {}
    for row in point["dates"]:
        if not isinstance(row, dict):
            raise ProviderFormatError("Invalid provider observation.")
        stamp = instant(row.get("date"))
        if stamp in values or stamp not in expected:
            raise ProviderFormatError("Duplicate or out-of-window provider timestamp.")
        value = row.get("value")
        if (
            value is None
            or isinstance(value, (int, float))
            and not isinstance(value, bool)
            and value in RESERVED
        ):
            value = None
        elif (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
        ):
            raise ProviderFormatError("Invalid rainfall accumulation.")
        values[stamp] = value
    rows = [
        {
            "timestamp": iso(t),
            "interval_start": iso(t - timedelta(hours=1)),
            "value": values.get(t),
            "qa": "usable" if values.get(t) is not None else "missing",
        }
        for t in expected
    ]
    windows = []
    for i in range(23, len(rows)):
        samples = rows[i - 23 : i + 1]
        total = (
            sum(r["value"] for r in samples)
            if all(r["value"] is not None for r in samples)
            else None
        )
        if total is not None and not math.isfinite(total):
            raise ProviderFormatError(
                "Precipitation accumulation exceeded a finite total."
            )
        windows.append(
            {
                "start": samples[0]["interval_start"],
                "end": samples[-1]["timestamp"],
                "value": total,
            }
        )
    totals = [w["value"] for w in windows if w["value"] is not None]
    return {
        "rows": rows,
        "rolling_24h": windows,
        "peak_24h_mm": max(totals) if totals else None,
        "missing_hours": sum(r["value"] is None for r in rows),
        "provider_response_generated_at": iso(generated),
    }
