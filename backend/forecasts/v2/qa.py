"""Historical-record QA: sentinels, valid zeros, duplicates, impossible values.

Meteomatics sentinel values are kept distinct from real 0.0 mm rainfall.
"""
from __future__ import annotations

from datetime import datetime

from .schemas import SENTINELS, HistoricalRecord
from .variables import VARIABLES, check_value


def _ts(v: str) -> float:
    return datetime.fromisoformat(v.replace("Z", "+00:00")).timestamp()


def normalize(records: list[dict], location_id: str, source_id: str) -> tuple[list[HistoricalRecord], list[dict]]:
    """Validate raw rows -> (valid records, quarantined rows with reasons)."""
    valid: list[HistoricalRecord] = []
    quarantined: list[dict] = []
    seen: set[tuple[str, str, str]] = set()
    for raw in records:
        reason = None
        value = raw.get("value")
        if value in SENTINELS:
            reason = f"sentinel:{value}"
        elif value is None:
            reason = "missing_value"
        else:
            try:
                fv = float(value)
            except (TypeError, ValueError):
                reason = "non_numeric"
            else:
                if fv != fv or fv in (float("inf"), float("-inf")):
                    reason = "nonfinite"
                else:
                    vname = str(raw.get("variable", ""))
                    if vname in VARIABLES:
                        reason = check_value(vname, fv)
                    elif vname.startswith("precip") and fv < 0:
                        reason = "impossible_negative_precip"
        key = (str(raw.get("variable")), str(raw.get("interval_start")), str(raw.get("interval_end")))
        if reason is None and key in seen:
            reason = "duplicate_interval"
        if reason is None and _ts(raw["interval_end"]) <= _ts(raw["interval_start"]):
            reason = "nonpositive_interval"
        if reason:
            quarantined.append({**raw, "reason": reason})
            continue
        seen.add(key)
        valid.append(HistoricalRecord(
            location_id=location_id, source_id=source_id,
            station_id=raw.get("station_id"),
            lat=float(raw.get("lat", 0)), lon=float(raw.get("lon", 0)),
            variable=str(raw["variable"]), unit=str(raw.get("unit", "")),
            interval_start=str(raw["interval_start"]), interval_end=str(raw["interval_end"]),
            value=float(value), retrieved_at=str(raw.get("retrieved_at", "")),
            available_at=raw.get("available_at"),
            source_artifact_hash=raw.get("source_artifact_hash", ""),
        ))
    valid.sort(key=lambda r: r.interval_start)
    return valid, quarantined


def daily_sum(records: list[HistoricalRecord], day_start: str, expected_hours: int = 24) -> float | None:
    """Sum one UTC 24h window. Coverage is measured in interval-hours, not
    record count — a single 24h accumulation satisfies the window; partial
    coverage returns None (never scaled up)."""
    start, end = _ts(day_start), _ts(day_start) + expected_hours * 3600
    covered = 0.0
    total = 0.0
    for r in records:
        s, e = _ts(r.interval_start), _ts(r.interval_end)
        if s >= start and e <= end:
            covered += (e - s) / 3600
            total += r.value
    if covered < expected_hours - 1e-6:
        return None
    return total


def available_by(records: list[HistoricalRecord], issue_ts: str, conservative_lag_hours: float = 0.0) -> list[HistoricalRecord]:
    """Only records whose availability precedes the issue time.

    Records with unknown availability get the declared conservative lag after
    interval_end — never assumed instantly available.
    """
    cut = _ts(issue_ts)
    out = []
    for r in records:
        if r.available_at is not None:
            avail = _ts(r.available_at)
        else:
            avail = _ts(r.interval_end) + conservative_lag_hours * 3600
        if avail <= cut:
            out.append(r)
    return out
