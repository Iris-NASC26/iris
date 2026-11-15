# Forecast features — Phase 4

A versioned, availability-safe feature engine for the local forecast
pipeline. Frozen dataset bindings and a feature spec go in; ordered
named columns, as-of rows with exclusion reasons, a train-fitted
transform artifact and lineage come out.

The live path is untouched: `features.py` and `fitting.COLUMNS` are
unchanged, the legacy 13-column profile is byte-identical, and all
experiments live in `fs-*` artifact namespaces — never the live model
registry.

## Spec: `iris-feature-spec.v1`

```json
{
  "schema_version": "iris-feature-spec.v1",
  "location_id": "colombo",
  "profile": "drivers_v1",
  "target": {"variable": "merra2_t2m", "dataset_id": "ds-…"},
  "drivers": [{"role": "soil", "variable": "gldas_sm",
               "dataset_id": "ds-…", "source_id": "GLDAS_NOAH025_3H.2.1",
               "required": false, "max_age_days": 150}],
  "windows_days": [7, 30],
  "missing_policy": "flag_and_keep"
}
```

- **Profiles:** `legacy_v1` (exactly `fitting.COLUMNS`),
  `target_history_v1` (legacy + backward-looking interval windows,
  slope, second seasonal harmonic, transform-fitted anomaly, coverage
  and observation-age indicators), `drivers_v1` (enhanced + per-driver
  latest/age/missing/mean/coverage). Column list is deterministic per
  spec, capped at 64.
- **Bindings are immutable:** every input is an `ds-*` frozen dataset
  revision; manifests verify variable/source/spatial support. A driver
  may not reuse the target variable or dataset; an area-mean driver is
  rejected for a point target. Driver coverage is reported
  `declared`/`unverified` — Phase-2's coverage fraction is not trusted
  blindly (see `FORECAST_PHASE_2_REVIEW.md`).

## Availability and interval safety

- Inputs must have completed their interval **and** be available at
  issue (per-source `History` with that source's declared lag —
  same resolution as the live router).
- Rolling windows anchor at the **latest usable target observation
  end** and look strictly backward over completed native intervals.
  Gaps stay gaps (`tcoverage_*`, `tcount_*`); nothing is interpolated
  or repeated.
- Missing drivers are `NaN` + `*_missing` flag — missing rainfall is
  never zero. `require_complete` + `required` withholds the row;
  `flag_and_keep` keeps it with indicators.
- Driver staleness is bounded by `max_age_days`; a genuinely slow
  product (e.g. GLDAS ~120-day delay) is honestly flagged rather than
  silently used.

## Fitted transforms

`SeasonalTransform` (monthly climatology anomaly) has separate
`fit`/`transform`: fit sees only rows ending before the partition
boundary — enforced inside `fit` — and its frozen state carries the
spec fingerprint; loading under a different spec raises instead of
silently mixing.

## Phase-3 integration (extension point)

`evaluation.runner.run(spec, feature_fn=...)` now accepts a
`feature_fn(issue, horizon) -> feature dict` plus an optional
`feature_columns` list in the eval spec. Same folds, cases, baselines,
holdout and reporting; only the feature matrix differs. Constant
columns are masked at fit (sklearn's bin mapper rejects them) while
the declared schema is preserved on the artifact.

## Commands

```bash
cd backend
.\.venv\Scripts\python.exe -m forecasts.v2.feature_sets materialize --config spec.json
.\.venv\Scripts\python.exe -m forecasts.v2.feature_sets fit-smoke --config spec.json
.\.venv\Scripts\python.exe -m forecasts.v2.feature_sets ablate --config ablation.json
```

`materialize` writes a `snapshot.json` binding every input's dataset
revision + content hash + coverage status — reissuing reproduces rows
without provider contact. `ablate` runs each named profile through the
identical Phase-3 development evaluation and writes `ablation.json`
with common-case comparisons.

## Genuine run (retrospective, not a skill claim)

`colombo`, target `merra2_t2m` (`ds-19935bb50e81b5a5`), drivers
`gldas_tair` + `gldas_sm`, 2 folds, h0/h1, 128 common cases each:

| profile | h0 MAE (K) | h0 coverage80 | h1 MAE (K) |
|---|---|---|---|
| legacy | 0.474 | 0.891 | 0.474 |
| target_history | 0.495 | 0.852 | 0.492 |
| drivers | 0.505 | 0.813 | 0.497 |

**The enhanced and driver profiles did not improve on the legacy
13-column model on this dataset.** Retained as evidence, not
improvement — richer features can add variance on a ~3-year,
availability-limited history. Final assessment was not rerun and the
holdout stayed reserved.

## Honest limits

- A driver that underperforms is a valid result; no feature-selection
  claims are made from one bounded run.
- Constant static predictors cannot distinguish observations inside a
  single-location training set; pooled spatial generalization is later
  work.
- Phase-2 update/checkpoint and coverage findings remain open; this
  package reads frozen datasets only and does not depend on the
  affected paths.
