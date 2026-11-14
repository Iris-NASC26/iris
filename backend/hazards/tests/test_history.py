"""NASA adapter contract fixtures are synthetic, explicitly test-only."""

import hashlib
from copy import deepcopy

import pytest
from hazards import history as module
from hazards.catalog import case_by_id
from hazards.meteomatics import ForecastUnavailable

CASE = case_by_id("nepal-floods-2024")


def nasa_payload():
    return {
        "header": {"time_standard": "UTC", "fill_value": -999.0},
        "parameters": {"PRECTOTCORR": {"units": "mm/day"}},
        "geometry": {"coordinates": [85.324, 27.717, 1269.39]},
        "properties": {
            "parameter": {
                "PRECTOTCORR": {"20240915": 0, "20240916": -999, "20240917": 2.5}
            }
        },
    }


def test_daily_grid_retains_zero_missing_and_units():
    result = module.normalize_history(nasa_payload(), CASE)
    assert len(result) == 24
    assert result[0] == {"timestamp": "2024-09-15", "value": 0, "qa": "usable"}
    assert result[1]["value"] is None
    assert result[2]["value"] == 2.5
    assert result[-1] == {"timestamp": "2024-10-08", "value": None, "qa": "missing"}


@pytest.mark.parametrize("bad", [False, -0.5, float("nan"), float("inf"), "0"])
def test_invalid_values_not_silently_coerced(bad):
    payload = nasa_payload()
    payload["properties"]["parameter"]["PRECTOTCORR"]["20240915"] = bad
    with pytest.raises(ValueError):
        module.normalize_history(payload, CASE)


def test_units_timezone_wrong_point_and_extra_dates_rejected():
    original = nasa_payload()
    for field, value in [
        ("time_standard", "LST"),
        ("fill_value", 0),
        ("fill_value", False),
    ]:
        payload = deepcopy(original)
        payload["header"][field] = value
        with pytest.raises(ValueError):
            module.normalize_history(payload, CASE)
    payload = deepcopy(original)
    payload["parameters"]["PRECTOTCORR"]["units"] = "mm"
    with pytest.raises(ValueError):
        module.normalize_history(payload, CASE)
    payload = deepcopy(original)
    payload["geometry"]["coordinates"].reverse()
    with pytest.raises(ValueError):
        module.normalize_history(payload, CASE)
    payload = deepcopy(original)
    payload["properties"]["parameter"]["PRECTOTCORR"]["20241009"] = 1
    with pytest.raises(ValueError):
        module.normalize_history(payload, CASE)


def test_evidence_is_content_addressed_and_atomically_retained(tmp_path, monkeypatch):
    monkeypatch.setattr(module, "CACHE_DIRECTORY", tmp_path)
    raw = b'{"TEST_ONLY": true}'
    digest = hashlib.sha256(raw).hexdigest()
    module.retain_source(raw, digest)
    module.retain_source(raw, digest)
    assert (tmp_path / f"{digest}.json").read_bytes() == raw
    assert len(list(tmp_path.iterdir())) == 1
    assert not list(tmp_path.glob("*.tmp"))


def test_storage_budget_refuses_new_content_without_deleting_old_evidence(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(module, "CACHE_DIRECTORY", tmp_path)
    old = tmp_path / "old.json"
    old.write_bytes(b"x" * (10 * 1024 * 1024))
    with pytest.raises(ForecastUnavailable, match="storage is full"):
        module.retain_source(b"{}", "a" * 64)
    assert old.exists()
