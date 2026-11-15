# Forecast evaluation — Phase 3

A reproducible, availability-aware evaluation framework for the local
forecast engine. It runs **independently of the live training path**:
estimators are fitted inside an isolated experiment namespace, never
persisted to the live model registry, and legacy model-card scores are
not rewritten or relabeled.

## What it does

- Walk-forward chronological backtests (expanding window, calendar
  boundaries — never index splits, never shuffling).
- Per fold: chronological inner train/validation/calibration partitions,
  label-availability purging at each boundary, candidate selection on
  validation only, calibration correction fitted on the calibration
  block only, then predictions for that fold's outer test cases.
- A contiguous **final holdout** reserved from development. Development
  runs never score it; an explicit final assessment evaluates the frozen
  spec once and records exposure (`first_assessment` vs
  `previously_evaluated`, with prior-assessment counts).
- Baselines scored on the same cases: persistence (latest usable input),
  seasonal climatology (±24-day-of-year window from the fold's permitted
  reference rows only, q10/q50/q90), seasonal naive (prior native
  period; an honest exclusion when no valid match exists).
- Comparisons on **common cases only** — metrics per method plus a
  common subset where every method produced a prediction; relative MAE
  is reported against that subset. Zero-error baselines yield a null
  relative, never infinity.
- Metrics: MAE, RMSE, signed bias, pinball (q10/q50/q90), empirical
  q10–q90 coverage, mean width, Winkler interval score, case counts and
  exclusions. Grouped by horizon, fold, and season.
- Operational input-age policy from the **declared source delay**
  (`source_lag_hours` → NASA POWER constant → Meteomatics source options
  → Earthdata product delay), optionally a development-data p95 — never
  outer-test or final-holdout values. Cases violating the policy are
  excluded with `outside_operational_age_policy`.
- Typed availability evidence per record: `verified_vintage` (explicit
  vintage/publication timestamp), `estimated_availability`
  (`available_at` or declared delay), `unknown`. Reports list which
  levels apply — estimated data does not claim real-time simulation.

## Command

```bash
cd backend
.\.venv\Scripts\python.exe -m forecasts.v2.evaluation --config spec.json
.\.venv\Scripts\python.exe -m forecasts.v2.evaluation --config spec.json --mode final
.\.venv\Scripts\python.exe -m forecasts.v2.evaluation --config spec.json --store <dir>
```

Example spec (`iris-eval-spec.v1`):

```json
{
  "schema_version": "iris-eval-spec.v1",
  "contexts": [{"location_id": "colombo",
                "dataset_id": "ds-19935bb50e81b5a5",
                "target": "merra2_t2m"}],
  "horizons": [0, 1],
  "issue": {"cadence_days": 7},
  "development": {"folds": 3},
  "final_holdout": {"fraction": 0.15}
}
```

`location_id`/`dataset_id` must be an existing registry location and an
immutable frozen dataset revision; `target` must be a variable the
dataset actually contains, and an explicit `source_id` must match the
dataset's source. Spatial binding is recorded (`spatial_mode`,
`spatial_support`, aggregation policy) and point/area contexts are never
mixed — the candidate is location-specific, so spatial holdout reports
`not_applicable` rather than pretending geographic transfer.

## Callable interface

```python
from forecasts.v2.evaluation import run, run_final_assessment

report = run(spec_dict)                     # development backtests
final  = run_final_assessment(spec_dict)    # frozen-config assessment
```

Both return report dicts and persist artifacts. Adapters
(`manifest_fn`, `load_fn`, `resolve_fn`, `store_dir`) are injectable for
tests and future job wiring.

## Artifacts

`artifacts/runtime/forecasts/v2/evaluation/eval-<fp12>-{dev,final}-rN/`:

- `spec.json` — the normalized spec actually run.
- `report.json` — protocol version, state (`complete`/`partial`/`failed`),
  real `walk_forward_fold_count` vs planned, per-context/fold/horizon/
  season metrics, exclusions, evidence levels, holdout exposure.
- `report.md` — the same, human readable.
- `predictions.jsonl` — per-case issue/window/label/inputs-age,
  every method's prediction or exclusion reason.

Writes are atomic; a repeated run of the same spec gets a new `rN`
suffix — existing artifacts are never overwritten.

## Current weaknesses addressed

- `fitting.py` reported `folds: 4` for what is one chronological
  train/validation/calibration/test partition. The new report's
  `walk_forward_fold_count` counts real outer evaluation periods.
- `max_input_age_days` was derived from calibration+test feature ages.
  The evaluation policy derives it from declared source policy (and
  optionally development data), and tests verify perturbing future data
  cannot change it.

## Honest limits

- Scores are **retrospective** on frozen history; `estimated_availability`
  is not a verified real-time archive. A prospective post-freeze period
  is stronger evidence.
- Dependent repeated predictions are grouped, not treated as independent
  observations; no significance claims are made from point estimates.
- Legacy model cards keep their old partition metrics — they are not
  relabeled as backtest results.
- The live training path does **not** use this evaluator yet; see
  `FORECAST_PHASE_3_HANDOFF.md`.
