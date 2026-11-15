"""Phase 1 location-registry tests — synthetic fixtures only.

Verifies the durable point registry, dataset spatial binding, and
compatibility rules. No live provider calls, no weather-skill claims.
"""
import pytest

from forecasts.v2 import datasets, locations, workers


@pytest.fixture()
def registry(tmp_path, monkeypatch):
    monkeypatch.setattr(locations, "DB_PATH", tmp_path / "locations.sqlite")
    yield tmp_path / "locations.sqlite"


def test_registered_point_persists_and_lists(registry):
    record, created = locations.register("Jaffna test point", 9.6615, 80.0255)
    assert created is True
    assert locations.ID_PATTERN.match(record["location_id"])
    assert record["location_id"].startswith("loc-")
    # a fresh connection sees the row — durable, not in-memory
    again = locations.resolve(record["location_id"])
    assert again["name"] == "Jaffna test point"
    assert again["latitude"] == pytest.approx(9.6615)
    assert again["longitude"] == pytest.approx(80.0255)
    assert again["spatial_mode"] == "point"
    assert again["geometry"]["coordinates"] == [80.0255, 9.6615]
    listed = {l["location_id"] for l in locations.list_locations()}
    assert record["location_id"] in listed


def test_seeded_six_resolve(registry):
    for rid in ("colombo", "kathmandu", "los-angeles"):
        r = locations.resolve(rid)
        assert r["location_id"] == rid or r["id"] == rid


def test_invalid_and_out_of_range_coordinates_rejected(registry):
    for bad in (91, -90.0001, float("nan"), float("inf"), "abc"):
        with pytest.raises(ValueError):
            locations.register("bad", bad, 80.0)
    for bad in (180.0001, -180.5, float("nan"), -float("inf"), "x"):
        with pytest.raises(ValueError):
            locations.register("bad", 6.9, bad)


def test_unsafe_names_and_identifiers_rejected(registry):
    for bad in ("", " ", "a" * 81, "../escape", "back\\slash", "x\x00y", "tab\tname"):
        with pytest.raises(ValueError):
            locations.register(bad, 6.9, 79.8)
    for bad_id in ("", "..", "../etc", "A"*40, "UPPER", "loc with space", "loc../x", "-lead", "x"):
        with pytest.raises((ValueError, KeyError)):
            locations.resolve(bad_id)


def test_duplicate_registration_is_deterministic(registry):
    first, _ = locations.register("Same place", 6.9271, 79.8612)
    second, created = locations.register("Same place renamed", 6.9271, 79.8612)
    assert created is False
    assert second["location_id"] == first["location_id"]  # same point → same id
    different, created3 = locations.register("Nearby", 6.9272, 79.8612)
    assert created3 is True
    assert different["location_id"] != first["location_id"]


def test_name_never_becomes_a_path(registry):
    weird = "Point A (south, west) — ünïcødé "
    record, _ = locations.register(weird, 10.0, 10.0)
    assert weird not in record["location_id"]
    assert "/" not in record["location_id"] and "\\" not in record["location_id"]


def _records(n=1, lat=6.9, lon=79.8):
    return [{"variable": "precip_24h", "unit": "mm", "value": 1.0,
             "interval_start": f"2024-01-{i+1:02d}T00:00:00+00:00",
             "interval_end": f"2024-01-{i+2:02d}T00:00:00+00:00",
             "lat": lat, "lon": lon} for i in range(n)]


def test_dataset_manifest_carries_point_spatial_metadata(registry, tmp_path, monkeypatch):
    monkeypatch.setattr(datasets, "ROOT", tmp_path / "datasets")
    loc = locations.resolve("colombo")
    manifest = datasets.build(
        loc["location_id"], "era5", _records(), [],
        spec={"variable": "precip_24h", "days": 7}, location=loc)
    assert manifest["spatial_mode"] == "point"
    assert manifest["location_id"] == loc["location_id"]
    assert manifest["requested_geometry"]["type"] == "Point"
    assert manifest["requested_geometry"]["coordinates"] == [loc["longitude"], loc["latitude"]]
    assert manifest["resolved_coordinates"] == {"latitude": 6.9, "longitude": 79.8}
    assert manifest["spatial_extent"]["kind"] == "point"


def test_point_dataset_is_not_an_area_mean(registry, tmp_path, monkeypatch):
    monkeypatch.setattr(datasets, "ROOT", tmp_path / "datasets")
    loc = locations.resolve("colombo")
    manifest = datasets.build(
        loc["location_id"], "era5", _records(), [],
        spec={"variable": "precip_24h", "days": 7}, location=loc)
    # a point manifest must not silently claim area aggregation
    assert manifest["spatial_mode"] == "point"
    assert manifest.get("aggregation") not in ("area_mean", "regional_mean")
    assert "area" not in manifest["spatial_extent"]["kind"]
    assert "not an area average" in manifest["spatial_extent"]["note"]


def test_dataset_bound_to_registering_location(registry, tmp_path, monkeypatch):
    """A dataset built for one point cannot be loaded as another's."""
    monkeypatch.setattr(datasets, "ROOT", tmp_path / "datasets")
    a, _ = locations.register("Point A", 6.9271, 79.8612)
    b, _ = locations.register("Point B", 9.6615, 80.0255)
    manifest = datasets.build(
        a["location_id"], "era5", _records(), [],
        spec={"variable": "precip_24h", "days": 7}, location=a)
    assert datasets.load(a["location_id"], manifest["dataset_id"]) is not None
    assert datasets.load(b["location_id"], manifest["dataset_id"]) is None  # not B's
    assert {m["location_id"] for m in datasets.manifests(b["location_id"])} == set()


def test_unknown_region_lookup_fails_honestly(registry):
    with pytest.raises((ValueError, KeyError)):
        locations.resolve("loc-000000000000")  # valid shape, never registered


def test_refresh_iterates_registered_locations(registry, monkeypatch):
    from forecasts.v2 import predict, training

    visited = []
    record, _ = locations.register("Refresh point", 9.6615, 80.0255)
    monkeypatch.setattr(training, "list_models",
                        lambda loc: [{"state": "active", "metrics": {"target": "precip_24h"}}])
    monkeypatch.setattr(predict, "current",
                        lambda loc, target="precip_24h": {"state": "unavailable"})
    monkeypatch.setattr(predict, "predict",
                        lambda loc, records, target="precip_24h", location=None:
                        visited.append(loc) or {"state": "unavailable"})
    workers.refresh_predictions()
    assert record["location_id"] in visited
    assert "colombo" in visited  # seeds still refresh
