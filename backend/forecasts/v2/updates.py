"""Incremental historical updates — watermarks, overlap refetch, typed merge.

An update refetches a provider-appropriate overlap window behind the stored
watermark (to catch revised observations) plus everything newer, then merges
deterministically by (variable, interval_start, interval_end). Outcomes are
classified honestly: appended, revised, unchanged/no-change, missing-in-
response, or failed retrieval. A valid observation is never replaced by a
missing response; when nothing scientific changed, no new dataset revision
is created — retrieval timestamps alone are fetch metadata, not data.

The update log and freshness summary are read-only sidecars; they never
backdate first-seen times or pretend estimated availability is observed
provider publication.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from ..store import PATH as STORE_PATH

STAGING = Path(STORE_PATH).parent / "v2" / "history"
DEFAULT_OVERLAP_DAYS = 14
MAX_OVERLAP_DAYS = 45


def key(record: dict) -> tuple[str, str, str]:
    return (str(record.get("variable")), str(record.get("interval_start")),
            str(record.get("interval_end")))


def watermark(records: list[dict], variable: str | None = None) -> str | None:
    """Latest stored observation interval_end for this series, or None."""
    ends = [r["interval_end"] for r in records
            if r.get("interval_end") and (variable is None or r.get("variable") == variable)]
    return max(ends) if ends else None


def update_window(records: list[dict], variable: str, *,
                  overlap_days: int = DEFAULT_OVERLAP_DAYS,
                  backfill_days: int = 366,
                  now: datetime | None = None) -> tuple[datetime, datetime]:
    """(start, end) for the update fetch — overlap behind the watermark."""
    now = (now or datetime.now(UTC)).replace(minute=0, second=0, microsecond=0)
    overlap = max(1, min(int(overlap_days), MAX_OVERLAP_DAYS))
    mark = watermark(records, variable)
    if mark:
        start = datetime.fromisoformat(mark.replace("Z", "+00:00")) - timedelta(days=overlap)
    else:
        start = now - timedelta(days=backfill_days)
    return start, now


def merge(existing: list[dict], fetched: list[dict],
          *, variable: str | None = None) -> dict:
    """Deterministic union with revision tracking.

    fetched values win on key collision (provider revision); existing keys
    absent from the fetch are reported `missing` but retained — absence in
    one response is not a documented deletion. Missing is only computed for
    the fetched variable when records actually came back; an empty response
    is a retrieval state, not a deletion list.
    """
    existing_map = {key(r): r for r in existing}
    fetched_keys = {key(r) for r in fetched}
    var = variable or (fetched[0].get("variable") if fetched else None)
    appended, revised = [], []
    unchanged = 0
    for r in fetched:
        k = key(r)
        if k not in existing_map:
            appended.append(k)
        elif existing_map[k].get("value") != r.get("value"):
            revised.append({"key": list(k), "previous": existing_map[k].get("value"),
                            "value": r.get("value")})
        else:
            unchanged += 1
    merged = dict(existing_map)
    for r in fetched:
        merged[key(r)] = r
    missing = ([list(k) for k in existing_map
                if k not in fetched_keys and (var is None or k[0] == var)]
               if fetched else [])
    return {"records": sorted(merged.values(), key=lambda r: (str(r.get("variable")), str(r.get("interval_start")))),
            "appended": appended, "revised": revised, "unchanged": unchanged,
            "missing": missing, "fetched": len(fetched),
            "changed": bool(appended or revised)}


def _log_path(location_id: str, source_id: str) -> Path:
    d = STAGING / location_id
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{source_id}.updates.jsonl"


def append_log(location_id: str, source_id: str, entry: dict) -> None:
    path = _log_path(location_id, source_id)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")


def update_log(location_id: str, source_id: str) -> list[dict]:
    path = _log_path(location_id, source_id)
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def freshness(location: dict, source_id: str, target: str,
              staged: list[dict], manifests: list[dict], *,
              availability_basis: str, configured: bool = True,
              now: datetime | None = None) -> dict:
    """Typed source/context/target freshness summary for the UI.

    States: fresh | delayed | no_data | unsupported | credential_failure |
    retrieval_failure | rate_limited. Never upgrades a stale series.
    """
    now = now or datetime.now(UTC)
    series = [r for r in staged if r.get("variable") == target
              and r.get("source_id") == source_id]
    mark = watermark(series)

    def _usable(r):
        """P2-04: an observation is usable only when its interval completed
        and it was actually available by the check time — not merely stored."""
        end = r.get("interval_end")
        try:
            end_ts = datetime.fromisoformat(str(end).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return False
        av = r.get("available_at")
        if av:
            try:
                return datetime.fromisoformat(str(av).replace("Z", "+00:00")) <= now
            except (TypeError, ValueError):
                return False
        return end_ts <= now

    usable_series = [r for r in series if _usable(r)]
    usable_mark = watermark(usable_series)
    latest_dataset = None
    eligible = [m for m in manifests if m.get("source_id") == source_id
                and target in m.get("variables", [])]
    if eligible:
        latest_dataset = sorted(eligible, key=lambda m: m.get("created_at", ""))[-1]["dataset_id"]
    log = update_log(location["location_id"], source_id)
    last = log[-1] if log else None
    state = "no_data" if not series else "fresh"
    if last and last.get("status") in ("retrieval_failure", "rate_limited", "credential_failure"):
        state = last["status"]
    if not configured:
        state = "credential_failure"
    out = {"schema_version": "iris.ml-forecast.v2",
           "location_id": location["location_id"],
           "location_name": location.get("name"),
           "spatial_mode": location.get("spatial_mode", "point"),
           "source_id": source_id, "target": target, "state": state,
           "latest_observation_end": mark,
           "latest_usable_end": usable_mark,
           "availability_basis": availability_basis,
           "latest_dataset_id": latest_dataset,
           "last_check": (last or {}).get("checked_at"),
           "last_update": last,
           "checked_at": now.isoformat()}
    if usable_mark:
        age_h = (now - datetime.fromisoformat(usable_mark.replace("Z", "+00:00"))).total_seconds() / 3600
        out["input_age_hours"] = round(age_h, 1)
        out["stored_but_unusable"] = mark is not None and mark != usable_mark
        if state == "fresh" and age_h > 24 * 14:
            out["state"] = "delayed"
            out["message"] = ("The source's latest usable observation is "
                              f"{int(age_h // 24)} days old — newer data has not been published "
                              "or fetched yet; this is a delay, not a live feed.")
    else:
        out["input_age_hours"] = None
    if last and not last.get("changed") and state == "fresh":
        out["message"] = "The last update found no new or revised observations."
    return out
