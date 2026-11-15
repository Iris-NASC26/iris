"""Sum each member BEFORE calculating quantiles. Never sum marginal quantiles."""

import math
import re
from datetime import datetime, timedelta

import numpy as np
from hazards.rainfall import RESERVED, instant, iso

PARAMETER = "precip_3h:mm"


def normalize(payload: dict, point: dict, start: datetime, retrieved: datetime) -> dict:
    if (
        payload.get("status") != "OK"
        or not isinstance(payload.get("data"), list)
        or len(payload["data"]) != 51
    ):
        raise ValueError("A complete 51-member forecast response is required.")
    generated = instant(payload.get("dateGenerated"))
    if (
        not retrieved - timedelta(hours=1)
        <= generated
        <= retrieved + timedelta(minutes=5)
    ):
        raise ValueError("Provider response generation time is stale or invalid.")
    stamps = [start + timedelta(hours=3 * i) for i in range(24)]
    members = {}
    for series in payload["data"]:
        parameter = series.get("parameter", "")
        match = re.fullmatch(re.escape(PARAMETER) + r"(?:-m([1-9]\d?))?", parameter)
        if not match:
            raise ValueError("Unexpected precipitation parameter or units.")
        member = int(match[1] or 0)
        if member > 50 or member in members:
            raise ValueError("Duplicate or unsupported ensemble member.")
        points = series.get("coordinates")
        if not isinstance(points, list) or len(points) != 1:
            raise ValueError("One forecast point is required.")
        data = points[0]
        for name, expected in (("lat", point["latitude"]), ("lon", point["longitude"])):
            value = data.get(name)
            if (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
                or abs(value - expected) > 0.0001
            ):
                raise ValueError("Forecast coordinates did not match.")
        dates = data.get("dates")
        if not isinstance(dates, list) or len(dates) > 24:
            raise ValueError("Invalid forecast time-series size.")
        values = {}
        for row in dates:
            stamp = instant(row.get("date"))
            if stamp not in stamps or stamp in values:
                raise ValueError("Duplicate or out-of-window forecast timestamp.")
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
                raise ValueError("Invalid precipitation accumulation.")
            values[stamp] = value
        members[member] = [values.get(stamp) for stamp in stamps]
    if set(members) != set(range(51)):
        raise ValueError("Ensemble member identities did not match.")

    def window(left: int, right: int) -> dict:
        totals = [
            sum(m[left:right])
            for m in members.values()
            if all(v is not None for v in m[left:right])
        ]
        if not all(math.isfinite(v) for v in totals):
            raise ValueError("Accumulation exceeded finite precision.")
        # Withhold distribution statistics unless ALL requested members are usable.
        q = (
            np.quantile(totals, [0.1, 0.5, 0.9], method="linear").tolist()
            if len(totals) == 51
            else [None] * 3
        )
        return {
            "start": iso(stamps[left] - timedelta(hours=3)),
            "end": iso(stamps[right - 1]),
            "p10": q[0],
            "median": q[1],
            "p90": q[2],
            "members_available": len(totals),
        }

    rows = [window(i, i + 1) for i in range(24)]
    rolling = [window(i, i + 8) for i in range(17)]
    daily = [window(i, i + 8) for i in (0, 8, 16)]
    usable = [w for w in rolling if w["median"] is not None]
    peak = max(usable, key=lambda w: w["median"]) if usable else None
    return {
        "rows": rows,
        "rolling_24h": rolling,
        "daily": daily,
        "peak_24h": peak,
        "members": [{"id": i, "values": members[i]} for i in range(51)],
        "missing_member_intervals": sum(v is None for m in members.values() for v in m),
        "provider_response_generated_at": iso(generated),
    }
