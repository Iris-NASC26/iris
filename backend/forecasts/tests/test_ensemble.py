"""TEST-ONLY synthetic provider messages; not scientific validation data."""

from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from forecasts.catalog import region
from forecasts.ensemble import normalize
from hazards.rainfall import iso

NOW = datetime(2026, 11, 15, 0, 15, tzinfo=UTC)
START = datetime(2026, 11, 15, 6, tzinfo=UTC)
POINT = region("colombo")


def payload(start=START, now=NOW):
    return {
        "status": "OK",
        "dateGenerated": iso(now),
        "user": "TEST-ONLY-PRIVATE",
        "data": [
            {
                "parameter": "precip_3h:mm" + (f"-m{m}" if m else ""),
                "coordinates": [
                    {
                        "lat": POINT["latitude"],
                        "lon": POINT["longitude"],
                        "dates": [
                            {
                                "date": iso(start + timedelta(hours=3 * i)),
                                "value": m / 10,
                            }
                            for i in range(24)
                        ],
                    }
                ],
            }
            for m in range(51)
        ],
    }


def parse(p):
    return normalize(p, POINT, START, NOW)


def test_known_member_distribution_and_forecast_support():
    f = parse(payload())
    assert f["rows"][0]["median"] == 2.5
    assert f["rows"][0]["p10"] == 0.5
    assert f["rows"][0]["p90"] == 4.5
    assert f["rolling_24h"][0]["median"] == 20
    assert f["daily"][0]["median"] == 20
    assert len(f["rolling_24h"]) == 17
    assert len(f["rows"]) == 24
    assert len(f["daily"]) == 3
    assert f["rows"][0]["start"] == iso(START - timedelta(hours=3))


def test_accumulate_members_first_not_marginal_quantiles():
    p = payload()
    for m, series in enumerate(p["data"]):
        for i, r in enumerate(series["coordinates"][0]["dates"]):
            r["value"] = m if i % 2 else 50 - m
    f = parse(p)
    assert f["rolling_24h"][0]["p10"] == 200
    assert f["rolling_24h"][0]["p90"] == 200
    assert sum(r["p10"] for r in f["rows"][:8]) == 40
    # Independent cumulative sum calculation on the full member matrix.
    matrix = np.array(
        [[r["value"] for r in s["coordinates"][0]["dates"]] for s in p["data"]]
    )
    prefix = np.pad(np.cumsum(matrix, axis=1), ((0, 0), (1, 0)))
    totals = prefix[:, 8:] - prefix[:, :-8]
    assert np.allclose(
        np.quantile(totals, 0.5, axis=0), [w["median"] for w in f["rolling_24h"]]
    )


@pytest.mark.parametrize("value", [-999, -888, -777, -666, None])
def test_missing_member_is_not_zero_or_a_complete_distribution(value):
    p = payload()
    p["data"][0]["coordinates"][0]["dates"][12]["value"] = value
    f = parse(p)
    assert f["missing_member_intervals"] == 1
    assert f["rows"][12]["median"] is None
    assert f["rows"][12]["members_available"] == 50
    assert sum(w["median"] is None for w in f["rolling_24h"]) == 8
    assert f["rows"][0]["p10"] == 0.5


@pytest.mark.parametrize("bad", [-0.1, True, "1", float("inf"), float("nan")])
def test_invalid_values_fail(bad):
    p = payload()
    p["data"][0]["coordinates"][0]["dates"][0]["value"] = bad
    with pytest.raises(ValueError):
        parse(p)


def test_wrong_members_dates_units_point_and_generation_fail():
    p = payload()
    p["data"].pop()
    with pytest.raises(ValueError):
        parse(p)
    p = payload()
    p["data"][1]["parameter"] = "precip_3h:mm"
    with pytest.raises(ValueError):
        parse(p)
    p = payload()
    p["data"][0]["coordinates"][0]["dates"][1]["date"] = iso(START)
    with pytest.raises(ValueError):
        parse(p)
    p = payload()
    p["data"][0]["parameter"] = "precip_1h:mm"
    with pytest.raises(ValueError):
        parse(p)
    p = payload()
    p["data"][0]["coordinates"][0]["lat"] = 0
    with pytest.raises(ValueError):
        parse(p)
    p = payload()
    p["dateGenerated"] = iso(NOW - timedelta(hours=2))
    with pytest.raises(ValueError):
        parse(p)
