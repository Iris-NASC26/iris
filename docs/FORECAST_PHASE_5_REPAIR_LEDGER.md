# Phase 5 repair ledger

Branch `feat/forecast-phase-1-locations`, starting HEAD `cb1807f`.
Sources: `FORECAST_PHASE_2_REVIEW.md`, `FORECAST_PHASE_1_3_FOLLOWUP_REVIEW.md`.
Status values: `open`, `owned_by_phase4`, `fixed_verified`, `integration_pending`, `not_applicable`.

| ID | Sev | Files | Status at implementation | Evidence |
|---|---|---|---|---|
| P2-01 | High | `workers.py` staged reader | fixed_verified | `*.updates.jsonl` excluded; `foundation_repairs` test |
| P2-02 | High | `power.py` reduce_area | fixed_verified | denominator = declared expected cells; dupes+missing dates counted; policy `coslat_weighted_mean_v2` |
| P2-03 | High | `workers.py` update executor | fixed_verified | checkpoint persisted per source and passed to provider next pass; fixed window pinned |
| P2-04 | Med | `updates.py` freshness | fixed_verified | usable = `available_at <= now`; stored vs usable split |
| P2-05 | Med | `predict.py` | fixed_verified | `input_snapshot` (records sha + cutoff + evidence) on new runs |
| P2-06 | High | `datasets.py` | fixed_verified | `semantic_sha256` (source/units/spatial/aggregation/QA policy) alongside content hash; new ds ids bind both |
| BIND-01 | High | `router.py` generate reuse | fixed_verified | dataset identity validated before pending-job reuse; mismatch → distinct job |
| BIND-02 | Med | `router.py` generate | fixed_verified | `location=` passed on every predict path incl. existing-model fast path |
| EVAL-01 | High | `evaluation/splits.py`,`runner.py` | fixed_verified | calibration labels purged at outer fit cutoff; baseline reference filtered by availability |
| EVAL-02 | High | `evaluation/splits.py` | fixed_verified | dev cases require `window_end <= boundary`; counted exclusions |
| EVAL-03 | High | `evaluation/{splits,runner,spec}.py` | fixed_verified | policy enforcement: strict `verified_vintage` without vintage evidence → explicit downgrade, `evidence_policy` in report |
| EVAL-04 | High | `evaluation/runner.py` | fixed_verified | `development_p95` computed per fold on permitted pool only; same gate applied in final assessment |
| EVAL-05 | High | `evaluation/store.py`,`runner.py` | fixed_verified | persistent `holdout_exposure.json` keyed by context+period lineage, not spec fp |
| EVAL-06a | Med | `evaluation/splits.py` | fixed_verified | fixed calendar issue grid; missing rows → exclusions not shifts |
| EVAL-06b | Med | `evaluation/{spec,runner}.py` | fixed_verified | ceilings enforced: cases/candidates/folds rejected over limits; fit timing recorded, over-budget fold → `timeout` status |
| EVAL-06c | Med | `evaluation/splits.py`,`runner.py` | fixed_verified | `inner_calibration_fraction` bounds the cal block; minimums also checked in final assessment |
| EVAL-06d | Med | `evaluation/{metrics,runner}.py` | fixed_verified | per-context grouping in final; stable case ids; champion on common cases |
| EVAL-06e | Med | `evaluation/{baselines,metrics}.py` | fixed_verified | deterministic baselines → interval metrics `unavailable_deterministic` |
| LEGACY-01 | Med | `fitting.py` | fixed_verified | new cards report `partitions: 4` + protocol label; old cards untouched |
| FS-01 | High | `feature_sets/runner.py`, transform | fixed_verified | fold-cutoff-fitted transform (interval AND availability bound) via `feature_fn(..., fit_cutoff)`; descriptive materialize keeps labelled full-history fit |
| FS-02 | Med | `feature_sets/runner.py` | fixed_verified | `_compare` intersects scored case ids across profiles |

Open at handoff: Forecasts UI integration for candidates (`integration_pending`),
LightGBM optional adapter (`not_applicable` unless dependency present).
