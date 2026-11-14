"""TEST-ONLY synthetic provider messages; no observations or warning skill."""

from copy import deepcopy
from datetime import UTC, datetime, timedelta

import pytest
from hazards.rainfall import ProviderFormatError, instant, iso, normalize

NOW = datetime(2026, 11, 15, 8, 15, tzinfo=UTC)
START = NOW.replace(minute=0) + timedelta(hours=2)


def provider_payload(values=None):
    values = [1.0] * 72 if values is None else values
    return {
        "status": "OK",
        "dateGenerated": iso(NOW),
        "data": [
            {
                "parameter": "precip_1h:mm",
                "coordinates": [
                    {
                        "lat": 27.7172,
                        "lon": 85.324,
                        "dates": [
                            {"date": iso(START + timedelta(hours=i)), "value": v}
                            for i, v in enumerate(values)
                        ],
                    }
                ],
            }
        ],
    }


def parsed(payload):
    return normalize(payload, 27.7172, 85.324, START, 72, NOW)


def test_hand_calculated_accumulations_and_right_aligned_intervals():
    result = parsed(provider_payload())
    assert len(result["rolling_24h"]) == 49
    assert all(w["value"] == 24 for w in result["rolling_24h"])
    assert result["peak_24h_mm"] == 24
    assert result["rows"][0]["interval_start"] == iso(START - timedelta(hours=1))
    assert result["rolling_24h"][0]["start"] == result["rows"][0]["interval_start"]
    assert result["rolling_24h"][0]["end"] == iso(START + timedelta(hours=23))


def test_nonconstant_reference_uses_independent_prefix_sums():
    values = [i / 8 for i in range(72)]
    prefix = [0]
    for v in values:
        prefix.append(prefix[-1] + v)
    reference = [prefix[i + 24] - prefix[i] for i in range(49)]
    result = parsed(provider_payload(values))
    assert [w["value"] for w in result["rolling_24h"]] == reference
    assert result["peak_24h_mm"] == 178.5


def test_finite_individual_values_cannot_produce_an_infinite_accumulation():
    with pytest.raises(ProviderFormatError, match="finite total"):
        parsed(provider_payload([1e308] * 72))


@pytest.mark.parametrize("reserved", [-999, -888, -777, -666, None])
def test_missing_not_zero_and_only_complete_windows_are_summed(reserved):
    values = [0.0] * 72
    values[24] = reserved
    result = parsed(provider_payload(values))
    assert result["missing_hours"] == 1
    assert result["rows"][24]["value"] is None
    assert result["rolling_24h"][0]["value"] == 0
    assert sum(w["value"] is None for w in result["rolling_24h"]) == 24
    assert result["peak_24h_mm"] == 0


def test_absent_hour_and_all_missing_are_explicit_gaps():
    payload = provider_payload()
    del payload["data"][0]["coordinates"][0]["dates"][1]
    assert parsed(payload)["rows"][1] == {
        "timestamp": iso(START + timedelta(hours=1)),
        "interval_start": iso(START),
        "value": None,
        "qa": "missing",
    }
    empty = parsed(provider_payload([]))
    assert empty["missing_hours"] == 72
    assert empty["peak_24h_mm"] is None
    assert all(w["value"] is None for w in empty["rolling_24h"])


@pytest.mark.parametrize("bad", [-0.1, float("inf"), float("nan"), True, "2"])
def test_invalid_values_are_rejected(bad):
    with pytest.raises(ProviderFormatError):
        parsed(provider_payload([bad]))


@pytest.mark.parametrize(
    "bad", ["2024-01-01T00:00:00", "bad", None, "2024-02-30T00:00:00Z"]
)
def test_invalid_or_timezone_free_timestamps(bad):
    with pytest.raises(ProviderFormatError):
        instant(bad)


def test_parameter_coordinates_duplicates_and_stale_generation_rejected():
    original = provider_payload()
    bad = deepcopy(original)
    bad["data"][0]["parameter"] = "precip_1h:in"
    with pytest.raises(ProviderFormatError):
        parsed(bad)
    bad = deepcopy(original)
    bad["data"][0]["coordinates"][0]["lat"] = 6.9
    with pytest.raises(ProviderFormatError):
        parsed(bad)
    bad = deepcopy(original)
    # Equivalent instants with different offsets must still count as duplicates.
    bad["data"][0]["coordinates"][0]["dates"][1]["date"] = "2026-11-15T15:30:00+05:30"
    with pytest.raises(ProviderFormatError, match="Duplicate"):
        parsed(bad)
    for generated in (NOW - timedelta(hours=2), NOW + timedelta(minutes=6)):
        bad = deepcopy(original)
        bad["dateGenerated"] = iso(generated)
        with pytest.raises(ProviderFormatError, match="stale"):
            parsed(bad)
    bad = deepcopy(original)
    bad["data"][0]["coordinates"][0]["dates"][0]["date"] = iso(
        START - timedelta(hours=1)
    )
    with pytest.raises(ProviderFormatError, match="out-of-window"):
        parsed(bad)
