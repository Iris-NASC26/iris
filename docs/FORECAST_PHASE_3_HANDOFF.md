# Phase 3 handoff — evaluation framework

## Status

**Complete and independent.** The evaluation package, CLI, tests and
docs are done and committed on `feat/forecast-phase-1-locations`.
The **live forecast-training path is NOT wired to the new evaluator** —
`run()`/`run_final_assessment()` are the only entry points, invoked via
CLI or the callable interface. Nothing in `router.py`, `workers.py`,
`training.py`, `fitting.py` or `datasets.py` was modified; integration
is deliberately deferred per the phase's shared-file coordination rule.

## Phase-3-owned files

- `backend/forecasts/v2/evaluation/__init__.py` — public surface,
  `PROTOCOL_VERSION = "iris-eval-v1"`.
- `backend/forecasts/v2/evaluation/spec.py` — validated serializable
  spec (`iris-eval-spec.v1`) + content fingerprint.
- `backend/forecasts/v2/evaluation/splits.py` — case construction,
  lag resolution, evidence labels, holdout boundary, fold plan,
  purged inner partitions.
- `backend/forecasts/v2/evaluation/baselines.py` — persistence,
  seasonal climatology, seasonal naive on permitted reference rows.
- `backend/forecasts/v2/evaluation/metrics.py` — MAE/RMSE/bias/pinball/
  coverage/width/interval score, relative MAE, common-case grouping.
- `backend/forecasts/v2/evaluation/estimator.py` — candidate adapter
  (fixed HGB quantile config mirroring `fitting.fit`; no `_persist`).
- `backend/forecasts/v2/evaluation/runner.py` — `run`,
  `run_final_assessment`, injectable dataset adapters.
- `backend/forecasts/v2/evaluation/store.py` — atomic artifact writes,
  `eval-<fp>-{dev,final}-rN` namespaces.
- `backend/forecasts/v2/evaluation/__main__.py` — the CLI.
- `backend/forecasts/tests/evaluation/test_evaluation.py` — 12 tests.
- `docs/FORECAST_EVALUATION.md`, `docs/FORECAST_PHASE_3_HANDOFF.md`.

## Integration interface awaiting coordination

To evaluate inside the live path later, the minimal wiring is:

```python
from forecasts.v2.evaluation import run as evaluate

spec = {"schema_version": "iris-eval-spec.v1",
        "contexts": [{"location_id": loc, "dataset_id": ds,
                      "target": target}],
        "horizons": [0, 1, 2]}
report = evaluate(spec)          # synchronous; fits small HGB configs
```

Suggested (not implemented, owner decision required):

- A `workers.py` job kind `evaluate` that calls `evaluate()` and stores
  `report["experiment_dir"]` on the job record — worker file is
  Phase-2/live-path owned.
- Optionally a read-only `GET /v2/{location}/evaluations` listing
  artifact dirs — router-owned.
- Do **not** feed evaluation scores back into `ModelCard.metrics`
  without an explicit versioning decision; legacy `folds: 4` numbers
  describe a different procedure.

## Verified behavior

- 12 focused tests green (`backend`: `pytest forecasts/tests/evaluation`).
- `pytest forecasts/tests/test_v2_core.py` — 11/11 (shared
  History/window contract unchanged).
- Real CLI run on genuine frozen dataset `colombo /
  ds-19935bb50e81b5a5 / merra2_t2m`: 3/3 walk-forward folds, 1470 dev
  cases, 918 holdout cases reserved and unscored, evidence
  `estimated_availability`, champion `seasonal_climatology`; candidate
  beat all baselines on the 143 common operational cases
  (rel MAE +11.6% vs climatology, +32% vs persistence/seasonal-naive;
  observed coverage 0.84 h0 / 0.76 h1). Retrospective, not fresh
  independent evidence.
- `--mode final` wrote a separate assessment artifact recording
  `first_assessment` exposure; a repeat run correctly reported
  `previously_evaluated` with count.

## Notes for the next phase

- `input_age_days` exclusions explain themselves in `predictions.jsonl`
  (`outside_operational_age_policy`) — with MERRA-2's declared 30-day
  delay only ~26% of daily-cadence issues were operational; widening
  `cadence_days` or relaxing policy is a spec choice, not a code fix.
- Evaluation estimators use the same fixed config as `fitting.fit`
  (leaves ∈ {3,7} on validation); model-family changes stay in
  Phase 4/5 scope.
- Artifact root: `artifacts/runtime/forecasts/v2/evaluation/` (runtime
  data area — experiment outputs are not repo-tracked).
