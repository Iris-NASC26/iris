"""Phase 2 tests — synthetic fixtures only, no live provider calls.

Covers the additive area-context migration, bbox validation and budgets,
the NASA POWER cell-weighted area reducer (weighted mean vs naive mean,
missing/invalid cells, coverage accounting, no centroid fallback), and
incremental-update merge/watermark/freshness semantics. Fixtures are
deliberately small and labelled synthetic; they verify mechanics, not
weather skill.
"""
import json
import sqlite3
from datetime import UTC, datetime, timedelta

import pytest

from forecasts.v2 import datasets, locations, power, updates, workers


@pytest.fixture()
def store(tmp_path, monkeypatch):
    monkeypatch.setattr(locations, "DB_PATH", tmp_path / "loc.sqlite")
    monkeypatch.setattr(workers, "STAGING", tmp_path / "history")
    monkeypatch.setattr(updates, "STAGING", tmp_path / "history")
    monkeypatch.setattr(datasets, "ROOT", tmp_path / "datasets")
    return tmp_path


def _day(n: int) -> tuple[str, str]:
    d = datetime(2024, 1, 1, tzinfo=UTC) + timedelta(days=n)
    return d.isoformat(), (d + timedelta(days=1)).isoformat()


def _power_records(days: range, value=295.0, *, variable="power_t2m",
                   retrieved="2024-02-01T00:00:00+00:00") -> list[dict]:
    out = []
    for n in days:
        s, e = _day(n)
        out.append({"location_id": "x", "source_id": "nasa_power", "lat": 7.5,
                    "lon": 80.5, "variable": variable, "unit": "K",
                    "interval_start": s, "interval_end": e, "value": value,
                    "retrieved_at": retrieved})
    return out


def _regional_payload(bbox, cells: dict[tuple[float, float], dict[str, float]],
                      fill=-999.0) -> bytes:
    """Synthetic POWER regional body: {(lon,lat): {YYYYMMDD: °C}}."""
    features = [{"geometry": {"type": "Point", "coordinates": [lon, lat]},
                 "properties": {"parameter": {"T2M": series}}}
                for (lon, lat), series in cells.items()]
    return json.dumps({"type": "FeatureCollection", "features": features,
                       "header": {"fill_value": fill}}).encode()


# ---------------- location/area registry ----------------


def test_v1_point_rows_survive_migration(store):
    """A Phase-1 database gains spatial columns without losing points."""
    db = locations.DB_PATH
    db.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db)
    con.execute("""CREATE TABLE v2_locations (
        location_id TEXT PRIMARY KEY, name TEXT NOT NULL, lat REAL NOT NULL,
        lon REAL NOT NULL, timezone TEXT NOT NULL, source TEXT NOT NULL,
        created_at TEXT NOT NULL)""")
    con.execute("INSERT INTO v2_locations VALUES (?,?,?,?,?,?,?)",
                ("loc-legacy001", "Legacy point", 6.9, 79.8, "UTC", "registered",
                 "2024-01-01T00:00:00+00:00"))
    con.commit()
    con.close()
    r = locations.resolve("loc-legacy001")
    assert r["spatial_mode"] == "point"
    assert r["geometry"]["coordinates"] == [79.8, 6.9]
    # seeds still insert; points keep working alongside the new columns
    assert locations.resolve("colombo")["spatial_mode"] == "point"


def test_area_registration_and_canonical_dedupe(store):
    rec, created = locations.register_area("Minneriya box", [80.0, 7.5, 81.5, 9.5])
    assert created is True
    assert rec["location_id"].startswith("area-")
    assert locations.ID_PATTERN.match(rec["location_id"])
    assert rec["spatial_mode"] == "area_mean"
    assert rec["geometry"]["type"] == "Polygon"
    assert rec["bbox"] == [80.0, 7.5, 81.5, 9.5]
    assert rec["centroid"] == {"latitude": 8.5, "longitude": 80.75}
    again, created2 = locations.register_area("Same box renamed", [80.0, 7.5, 81.5, 9.5])
    assert created2 is False and again["location_id"] == rec["location_id"]
    # same centre, different bounds -> a different context, never merged
    other, created3 = locations.register_area("Wider box", [79.5, 7.0, 82.0, 10.0])
    assert created3 is True and other["location_id"] != rec["location_id"]


def test_area_bounds_validation(store):
    good = [80.0, 7.5, 81.5, 9.5]
    for bad in ([81.5, 7.5, 80.0, 9.5],          # reversed lon
                [80.0, 9.5, 81.5, 7.5],          # reversed lat
                [80.0, 7.5, 80.0, 9.5],          # zero width
                [170.0, 7.5, -170.0, 9.5],       # antimeridian wrap
                [-181.0, 7.5, 81.5, 9.5],        # lon out of range
                [80.0, -91.0, 81.5, 9.5],        # lat out of range
                [80.0, 7.5, float("nan"), 9.5],  # nonfinite
                [80.0, 7.5],                     # wrong arity
                [0.0, 0.0, 90.0, 90.0],          # span beyond registry bound
                ):
        with pytest.raises(ValueError):
            locations.register_area("bad area", bad)
    rec, _ = locations.register_area("good", good)
    assert rec["location_id"]


def test_point_and_area_never_collide(store):
    area, _ = locations.register_area("Centred box", [80.0, 7.5, 81.5, 9.5])
    point, created = locations.register("Box centre", 8.5, 80.75)
    assert created is True
    assert point["location_id"] != area["location_id"]
    assert point["location_id"].startswith("loc-")
    # area dedupe ignores points; point dedupe ignores areas
    area2, c2 = locations.register_area("Centred box dup", [80.0, 7.5, 81.5, 9.5])
    assert c2 is False and area2["location_id"] == area["location_id"]


# ---------------- POWER area reduction ----------------


def test_weighted_area_mean_differs_from_naive(store):
    """Unequal cos(lat) weights must shift the mean below the naive mean."""
    bbox = (79.0, -1.0, 81.0, 61.0)  # spans the equator: very unequal weights
    cells = {
        (80.0, 0.0): {"20240101": 10.0},    # weight ~1.0
        (80.0, 60.0): {"20240101": 40.0},   # weight ~0.5
    }
    out = power.parse_area_payload(_regional_payload(bbox, cells), "power_t2m",
                                   bbox, datetime(2024, 1, 5, tzinfo=UTC))
    rec = next(r for r in out["records"] if r["value"] is not None)
    weighted_c = rec["value"] - 273.15
    naive = (10.0 + 40.0) / 2
    expected = (10.0 * 1.0 + 40.0 * 0.5) / 1.5
    assert weighted_c == pytest.approx(expected, abs=0.01)
    assert weighted_c != pytest.approx(naive, abs=0.01)  # genuinely differs


def test_area_mean_is_not_a_temporal_sum(store):
    bbox = (79.0, 5.0, 81.5, 8.0)
    cells = {(79.5, 5.5): {"20240101": 10.0, "20240102": 20.0},
             (80.0, 5.5): {"20240101": 14.0, "20240102": 26.0}}
    out = power.parse_area_payload(_regional_payload(bbox, cells), "power_t2m",
                                   bbox, datetime(2024, 1, 5, tzinfo=UTC))
    recs = [r for r in out["records"] if r["value"] is not None]
    assert len(recs) == 2
    # each day is a mean of cells, never a sum across days or cells
    assert recs[0]["value"] == pytest.approx((10.0 + 14.0) / 2 + 273.15, abs=0.02)
    assert recs[1]["value"] == pytest.approx((20.0 + 26.0) / 2 + 273.15, abs=0.02)
    assert all(r["value"] < 300 for r in recs)  # a sum would be absurd


def test_out_of_box_cells_and_invalid_values_dropped(store):
    bbox = (79.0, 5.0, 81.5, 8.0)
    cells = {(79.5, 5.5): {"20240101": 20.0},
             (80.0, 5.5): {"20240101": 24.0},
             (80.5, 5.5): {"20240101": -999.0},   # fill value -> invalid
             (95.0, 50.0): {"20240101": 999.0},   # centre outside -> excluded
             }
    out = power.parse_area_payload(_regional_payload(bbox, cells), "power_t2m",
                                   bbox, datetime(2024, 1, 5, tzinfo=UTC))
    rec = out["records"][0]
    assert rec["area_valid_cells"] == 2
    assert rec["value"] == pytest.approx(22.0 + 273.15, abs=0.01)  # no 999 bleed
    cov = out["coverage"][0]
    assert cov["valid_cells"] == 2 and cov["eligible_cells"] == 3
    assert out["queried_cells"] == 4


def test_insufficient_area_coverage_is_missing_not_zerofill(store):
    bbox = (79.0, 5.0, 81.5, 8.0)
    cells = {(79.5, 5.5): {"20240101": 20.0},
             (80.0, 5.5): {"20240101": -999.0},
             (80.5, 6.5): {"20240101": -999.0},
             (81.0, 7.5): {"20240101": -999.0}}
    out = power.parse_area_payload(_regional_payload(bbox, cells), "power_t2m",
                                   bbox, datetime(2024, 1, 5, tzinfo=UTC))
    rec = out["records"][0]
    assert rec["value"] is None  # quarantined downstream — never zero-filled
    assert out["coverage"][0]["valid_area_fraction"] < power.MIN_AREA_FRACTION


def test_unservable_box_raises_instead_of_centroid(store):
    """A box the provider cannot serve must fail, never degrade to a point."""
    tiny = (80.0, 8.0, 80.5, 8.5)  # lat span < 2 deg — POWER cannot serve it
    with pytest.raises(power.PowerError) as exc:
        power.fetch_area("power_t2m", tiny,
                         datetime(2024, 1, 1, tzinfo=UTC),
                         datetime(2024, 1, 3, tzinfo=UTC),
                         transport=lambda url, t: (200, b"{}", {}))
    assert exc.value.reason == "unsupported"
    assert "centroid" in str(exc.value)


def test_estimate_area_budgets(store):
    ok = power.estimate_area((79.0, 5.0, 82.0, 9.0),
                             datetime(2024, 1, 1, tzinfo=UTC),
                             datetime(2024, 2, 1, tzinfo=UTC))
    assert ok["within_budget"] and ok["estimated_cells"] > 0
    too_small = power.estimate_area((80.0, 8.0, 81.0, 8.5),
                                    datetime(2024, 1, 1, tzinfo=UTC),
                                    datetime(2024, 1, 10, tzinfo=UTC))
    assert not too_small["within_budget"]
    huge = power.estimate_area((0.0, 0.0, 21.0, 5.0),
                               datetime(2024, 1, 1, tzinfo=UTC),
                               datetime(2024, 1, 10, tzinfo=UTC))
    assert not huge["within_budget"]


def test_fetch_area_checkpoint_resume(store):
    """A paused regional fetch resumes at its chunk, never re-downloads."""
    bbox = (79.0, 5.0, 82.0, 9.0)
    calls = []

    def transport(url, timeout):
        calls.append(url)
        cells = {(79.5, 5.5): {"20240101": 20.0, "20240102": 21.0},
                 (80.0, 5.5): {"20240101": 22.0, "20240102": 23.0}}
        return 200, _regional_payload(bbox, cells), {}

    # > CHUNK_DAYS so the plan has two chunks to pause between.
    start, end = (datetime(2022, 1, 1, tzinfo=UTC), datetime(2025, 1, 1, tzinfo=UTC))
    first = power.fetch_area("power_t2m", bbox, start, end,
                             transport=transport, budget={"remaining": 1})
    assert first["exhausted"] and len(calls) == 1
    resumed = power.fetch_area("power_t2m", bbox, start, end,
                               transport=transport, budget={"remaining": 5},
                               checkpoint=first["next_checkpoint"])
    assert resumed["records_raw"]  # remaining chunk fetched
    assert len(calls) == 2  # the completed chunk was not re-requested


# ---------------- workers: ingest + update ----------------


def _area(store):
    rec, _ = locations.register_area("Power area", [79.0, 5.0, 82.0, 9.0])
    return rec


def test_power_ingest_stages_kelvin_area_mean(store):
    area = _area(store)
    cells = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    transport = lambda url, t: (200, _regional_payload(
        (79.0, 5.0, 82.0, 9.0), cells), {})
    out = workers._power_ingest("j1", area["location_id"],
                                {"variable": "power_t2m",
                                 "start": "2023-12-31T00:00:00+00:00",
                                 "end": "2024-01-03T00:00:00+00:00"},
                                transport=transport)
    staged = workers.staged_records(area["location_id"], "nasa_power")
    assert staged and all(r["variable"] == "power_t2m" for r in staged)
    assert staged[0]["unit"] == "K"
    assert staged[0]["value"] == pytest.approx(22.0 + 273.15, abs=0.02)
    coverage = (workers.STAGING / area["location_id"]
                / "nasa_power.coverage.json")
    assert coverage.exists()  # support accounting persisted
    assert out["source"]["mode"] == "area_mean"


def test_power_ingest_point_mode(store):
    loc, _ = locations.register("Power point", 7.5, 80.5)
    body = json.dumps({"properties": {"parameter": {"T2M": {"20240101": 25.0}}},
                       "header": {"fill_value": -999}}).encode()
    workers._power_ingest("j2", loc["location_id"],
                          {"variable": "power_t2m",
                           "start": "2023-12-31T00:00:00+00:00",
                           "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, body, {}))
    staged = workers.staged_records(loc["location_id"], "nasa_power")
    assert staged[0]["value"] == pytest.approx(25.0 + 273.15)


def test_area_dataset_manifest_and_sidecar(store):
    area = _area(store)
    cells = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    workers._power_ingest("j3", area["location_id"],
                          {"variable": "power_t2m",
                           "start": "2023-12-31T00:00:00+00:00",
                           "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), cells), {}))
    manifest = workers._dataset(area["location_id"],
                                {"source_id": "nasa_power", "variable": "power_t2m"})
    assert manifest["spatial_mode"] == "area_mean"
    assert manifest["spatial_support"] == "area_mean"
    assert manifest["aggregation"]["policy"] == power.AGGREGATION_POLICY
    assert manifest["requested_geometry"]["type"] == "Polygon"
    assert manifest["coverage_summary"]["sidecar"] == "coverage.json"
    ddir = datasets.ROOT / "datasets" / area["location_id"] / manifest["dataset_id"]
    assert (ddir / "coverage.json").exists()
    # a point dataset of the same id can never be claimed
    pt, _ = locations.register("Elsewhere", 7.5, 80.5)
    assert datasets.load(pt["location_id"], manifest["dataset_id"]) is None


def test_update_appends_and_builds_new_revision(store):
    area = _area(store)
    loc = area["location_id"]
    initial = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    workers._power_ingest("j4", loc, {"variable": "power_t2m",
                                      "start": "2023-12-31T00:00:00+00:00",
                                      "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), initial), {}))
    first = workers._dataset(loc, {"source_id": "nasa_power", "variable": "power_t2m"})
    # update window sees day 20 (new) appended plus overlap refetch of day 0
    later = {(79.5, 5.5): {"20240101": 20.0, "20240115": 26.0},
             (80.0, 5.5): {"20240101": 24.0, "20240115": 30.0}}
    out = workers._update("j5", loc, {"source_id": "nasa_power",
                                      "variable": "power_t2m",
                                      "overlap_days": 14},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), later), {}), parser=None)
    assert out["state"] == "new_revision"
    assert out["appended"] >= 1 and out["revised"] == 0
    assert out["dataset_id"] != first["dataset_id"]  # content changed -> new id
    assert out["watermark_after"] > out["watermark_before"]
    # the old revision still exists untouched
    assert datasets.manifest(loc, first["dataset_id"])["dataset_id"] == first["dataset_id"]


def test_update_revised_value_builds_revision(store):
    area = _area(store)
    loc = area["location_id"]
    v1 = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    workers._power_ingest("j6", loc, {"variable": "power_t2m",
                                      "start": "2023-12-31T00:00:00+00:00",
                                      "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), v1), {}))
    first = workers._dataset(loc, {"source_id": "nasa_power", "variable": "power_t2m"})
    v2 = {(79.5, 5.5): {"20240101": 21.0},   # provider corrected the cell
          (80.0, 5.5): {"20240101": 24.0}}
    out = workers._update("j7", loc, {"source_id": "nasa_power",
                                      "variable": "power_t2m", "overlap_days": 30},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), v2), {}), parser=None)
    assert out["state"] == "new_revision" and out["revised"] == 1
    staged = workers.staged_records(loc, "nasa_power")
    assert staged[0]["value"] == pytest.approx(22.5 + 273.15, abs=0.02)


def test_no_change_update_creates_no_revision(store):
    """Identical values with only a newer retrieval clock are not new data."""
    area = _area(store)
    loc = area["location_id"]
    cells = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    workers._power_ingest("j8", loc, {"variable": "power_t2m",
                                      "start": "2023-12-31T00:00:00+00:00",
                                      "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), cells), {}))
    first = workers._dataset(loc, {"source_id": "nasa_power", "variable": "power_t2m"})
    out = workers._update("j9", loc, {"source_id": "nasa_power",
                                      "variable": "power_t2m", "overlap_days": 30},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), cells), {}), parser=None)
    assert out["state"] == "no_new_data"
    manifests = {m["dataset_id"] for m in datasets.manifests(loc)}
    assert manifests == {first["dataset_id"]}  # nothing frozen again


def test_update_provider_failure_preserves_staging(store):
    area = _area(store)
    loc = area["location_id"]
    cells = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    workers._power_ingest("j10", loc, {"variable": "power_t2m",
                                       "start": "2023-12-31T00:00:00+00:00",
                                       "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), cells), {}))
    before = workers.staged_records(loc, "nasa_power")

    def failing(url, t):
        return 500, b"upstream gone", {}

    with pytest.raises(power.PowerError):
        workers._update("j11", loc, {"source_id": "nasa_power",
                                     "variable": "power_t2m", "overlap_days": 14},
                        transport=failing, parser=None)
    assert workers.staged_records(loc, "nasa_power") == before  # untouched
    log = updates.update_log(loc, "nasa_power")
    assert log[-1]["status"] == "retrieval_failure" and not log[-1]["changed"]


# ---------------- merge / freshness units ----------------


def test_merge_classification(store):
    s0, e0 = _day(0)
    s1, e1 = _day(1)
    base = [{"variable": "power_t2m", "interval_start": s0, "interval_end": e0, "value": 290.0}]
    fetched = [{"variable": "power_t2m", "interval_start": s0, "interval_end": e0,
                "value": 290.0, "retrieved_at": "2024-02-02T00:00:00+00:00"},
               {"variable": "power_t2m", "interval_start": s1, "interval_end": e1, "value": 291.0}]
    diff = updates.merge(base, fetched, variable="power_t2m")
    assert diff["unchanged"] == 1 and len(diff["appended"]) == 1
    assert diff["changed"] is True
    assert len(diff["records"]) == 2


def test_merge_retrieval_time_alone_is_not_change(store):
    s0, e0 = _day(0)
    base = [{"variable": "power_t2m", "interval_start": s0, "interval_end": e0,
             "value": 290.0, "retrieved_at": "2024-01-05T00:00:00+00:00"}]
    fetched = [dict(base[0], retrieved_at="2024-03-01T00:00:00+00:00")]
    diff = updates.merge(base, fetched, variable="power_t2m")
    assert diff["changed"] is False and diff["unchanged"] == 1


def test_freshness_states_are_typed(store):
    rec = {"location_id": "x", "name": "Area", "spatial_mode": "area_mean"}
    now = datetime.now(UTC)
    day_ago = now - timedelta(days=1)
    fresh = [{"location_id": "x", "source_id": "nasa_power", "lat": 7.5, "lon": 80.5,
              "variable": "power_t2m", "unit": "K",
              "interval_start": (day_ago - timedelta(days=1)).isoformat(),
              "interval_end": day_ago.isoformat(), "value": 295.0,
              "retrieved_at": now.isoformat()}]
    f = updates.freshness(rec, "nasa_power", "power_t2m", fresh, [],
                          availability_basis="estimated ~72h", now=now)
    assert f["state"] == "fresh" and f["input_age_hours"] is not None
    assert f["latest_observation_end"]
    none = updates.freshness(rec, "nasa_power", "power_t2m", [], [],
                             availability_basis="estimated ~72h", now=now)
    assert none["state"] == "no_data" and none["latest_observation_end"] is None
    assert "estimated" in none["availability_basis"]  # never observed publication
    old = _power_records(range(1))
    stale = updates.freshness(rec, "nasa_power", "power_t2m", old, [],
                              availability_basis="estimated ~72h", now=now)
    assert stale["state"] == "delayed"


def test_point_area_identity_keeps_datasets_apart(store):
    """A point context and an area over it remain incompatible artifacts."""
    area = _area(store)
    pt, _ = locations.register("In-box point", 7.5, 80.5)
    cells = {(79.5, 5.5): {"20240101": 20.0}, (80.0, 5.5): {"20240101": 24.0}}
    workers._power_ingest("j12", area["location_id"],
                          {"variable": "power_t2m",
                           "start": "2023-12-31T00:00:00+00:00",
                           "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, _regional_payload(
                              (79.0, 5.0, 82.0, 9.0), cells), {}))
    body = json.dumps({"properties": {"parameter": {"T2M": {"20240101": 25.0}}},
                       "header": {"fill_value": -999}}).encode()
    workers._power_ingest("j13", pt["location_id"],
                          {"variable": "power_t2m",
                           "start": "2023-12-31T00:00:00+00:00",
                           "end": "2024-01-03T00:00:00+00:00"},
                          transport=lambda url, t: (200, body, {}))
    a_manifest = workers._dataset(area["location_id"],
                                  {"source_id": "nasa_power", "variable": "power_t2m"})
    p_manifest = workers._dataset(pt["location_id"],
                                  {"source_id": "nasa_power", "variable": "power_t2m"})
    assert a_manifest["dataset_id"] != p_manifest["dataset_id"]
    assert a_manifest["spatial_mode"] == "area_mean"
    assert p_manifest["spatial_mode"] == "point"
    assert datasets.load(area["location_id"], p_manifest["dataset_id"]) is None
    assert datasets.load(pt["location_id"], a_manifest["dataset_id"]) is None
