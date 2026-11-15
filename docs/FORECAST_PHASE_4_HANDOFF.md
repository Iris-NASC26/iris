# Phase 4 handoff — feature engine

## Status

**Complete and independent**, integrated with Phase 3 through its
extension point. Live `features.py`, `fitting.COLUMNS`, training and
predict are untouched; candidates live in `fs-*` namespaces and nothing
is auto-activated or presented as production.

## Phase-4-owned files

- `backend/forecasts/v2/feature_sets/{__init__,spec,materialize,transform,artifacts,runner,__main__}.py`
- `backend/forecasts/tests/feature_sets/test_feature_sets.py` (9 tests)
- `docs/FORECAST_FEATURES.md`, `docs/FORECAST_PHASE_4_HANDOFF.md`

## Shared-file patch (Phase 3 extension point — small, additive)

`backend/forecasts/v2/evaluation/` gained a backward-compatible hook,
committed with this phase:

- `spec.py`: optional `feature_columns` (validated, ≤64 names).
- `splits.cases(..., feature_fn=None)`: injected feature constructor.
- `estimator.py`: `columns` threading + constant-column masking
  (`columns_active` on fitted bundles; predict uses the fitted mask).
- `runner.py`: `feature_fn` passthrough in `run`,
  `run_final_assessment`, `_evaluate_context`.

Default behaviour is unchanged (13-column `fitting.COLUMNS` path
verified by the still-green `tests/evaluation` suite).

## Callable contract

```python
from forecasts.v2.feature_sets import (validate, fingerprint,
                                       materialize, fit_and_score, ablate)
from forecasts.v2.feature_sets.materialize import (
    columns_for, load_histories, build_row)

spec = validate(spec_dict)                    # frozen bindings in
hists = load_histories(spec, load_fn)         # per-source availability
row = build_row(spec, hists, issue, horizon, transform)  # -> {"x","meta"} | None
```

Transform artifact fields: `version`, `cutoff`, `spec_fingerprint`,
`params`, `transform_sha256`. Snapshot fields: `spec_fingerprint`,
`profile`, `columns`, per-binding `source_id`/`content_sha256`/
`spatial_mode`/`coverage`.

## Verification

- `pytest forecasts/tests/feature_sets` — **9/9**: spec validation,
  byte-identical legacy columns, issue-time availability, missing/stale
  driver flags (never zero-filled), transform fit-boundary + binding
  checks, gap-preserving windows, snapshot reproducibility, real-label
  smoke, identical-case ablation, support-mismatch rejection.
- `pytest forecasts/tests/evaluation` — **12/12** (the patched
  evaluator's own suite; backwards compat confirmed).
- `pytest forecasts/tests/test_v2_core.py` — **11/11** (shared
  History/window contract).
- Genuine bounded run on frozen `colombo` datasets (see
  `FORECAST_FEATURES.md`): legacy beat enhanced/driver profiles on
  common cases — recorded, not claimed as improvement.

## Remaining integration (not done, owner decision)

- No UI/backend-route wiring: profiles are CLI/callable only. A
  forecast-section selector would need `router.py`/`workers.py`
  ownership coordination plus the Phase-2 fixes in
  `FORECAST_PHASE_2_REVIEW.md` (update-log contamination, coverage
  denominator, checkpoint resume, freshness, inference-input lineage).
- Ablation evidence here is one bounded retrospective run; feature
  adoption would need the frozen final assessment under Phase-3's
  protocol and broader datasets before any production recommendation.
