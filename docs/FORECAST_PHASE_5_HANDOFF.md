# Phase 5 handoff — repairs + model selection

Branch `feat/forecast-phase-1-locations`. Two logical commits:
foundation repairs, then the model-selection package + tests + docs.

## What was repaired (ledger: `FORECAST_PHASE_5_REPAIR_LEDGER.md`)

- **P2-01** update logs no longer contaminate staged observation reads
  (`*.updates.jsonl` excluded).
- **P2-02** area coverage denominators come from declared intended grid
  support (`power.intended_cells`); omitted cells and duplicates reduce
  coverage honestly; insufficient coverage quarantines as missing.
- **P2-03** update executors pass the persisted provider checkpoint and
  pin the update window across worker passes (`update_window` in the job
  checkpoint).
- **P2-04** freshness distinguishes latest stored from latest usable
  (`latest_usable_end` vs `latest_observation_end`, `available_at`-aware).
- **P2-05** inference runs record an immutable `input_snapshot`
  (records hash + cutoff + availability evidence) separate from the
  training dataset revision.
- **P2-06** dataset identity binds semantic policy
  (`semantic_sha256`: source/units/spatial/aggregation/QA).
- **BIND-01** pipeline-job reuse validates dataset identity before
  returning a pending job; `jobs.get` exposes the stored spec.
- **BIND-02** area metadata (`location=`) reaches prediction on every
  path, including the existing-model fast path.
- **EVAL-01..06** outer-cutoff calibration purge, holdout-boundary case
  exclusion, evidence-policy enforcement (`verified_vintage` downgrades
  rather than assumes), per-fold p95 age policy, persistent
  context+period exposure ledger, fixed calendar issue grid, limits
  enforcement (`max_cases`, fit deadlines → `timeout`), declared
  calibration fraction + `unused` remainder, per-context final grouping,
  stable 16-char `case_id`s, common-case baseline champion, deterministic
  baselines → `unavailable_deterministic` interval metrics.
- **LEGACY-01** new live model cards label the single-partition protocol
  (`partitions`, not walk-forward folds).
- **FS-01/02** Phase-4 transforms refit inside each fold cutoff
  (interval AND availability bound) via `feature_fn(..., fit_cutoff=)`;
  profile ablation compares intersected stable case ids only.

Prior scores produced under the unrepaired protocol are **legacy** —
superseded for selection purposes. The genuine comparison below ran on
the legacy feature profile only; a corrected profile ablation remains an
available follow-up via `--feature-spec`.

## Model selection

`model_selection/` delivers the `iris-candidate.v1` contract, incumbent
HGB reproduction, 6-config bounded HGB trial grid, the interpretable
`linear_quantile` challenger (train-only impute/scale, bounded alpha),
optional LightGBM (`dependency_unavailable` when absent), shared-case
comparison metrics, `freeze` (refit on permitted dev partitions only,
hash-checked artifacts), and snapshot replay. CLI: `compare`, `report`,
`freeze`, `predict` — see `FORECAST_MODEL_SELECTION.md`.

## Genuine evidence (development only; holdout untouched)

Frozen `colombo / ds-19935bb50e81b5a5 / merra2_t2m`, seed 42,
budget `{hgb_trials: 3, linear: true, linear_alphas: 2}`, 3 folds,
horizons [0,1], isolated experiment root:

| candidate | shared_n | MAE | coverage_80 |
|---|---|---|---|
| hgb-trial-2 (lr .10, iter 150, leaves 15, l2 1.0) | 252 | **0.514** | 0.829 |
| hgb-incumbent | 252 | 0.528 | 0.849 |
| hgb-trial-0 | 252 | 0.529 | 0.885 |
| hgb-trial-1 | 252 | 0.536 | 0.861 |
| linear-seasonal | 252 | 0.597 | 0.782 |

Outcome: `candidate_selected` → `hgb-trial-2`, a modest development
advantage (+2.7% shared-case MAE vs incumbent). This is a single-context
retrospective recommendation, not a production claim; the protected
holdout was never assessed and a no-winner outcome would have been
reported identically.

## Focused tests

- `tests/model_selection/test_phase5.py` — 11/11: update-log exclusion,
  coverage denominator, checkpoint resume, usable-vs-stored freshness,
  job spec binding, calendar grid + calibration fraction, holdout
  exclusion + stable case ids, deterministic-baseline intervals,
  candidate contract determinism, shared-case comparison, freeze+replay.
- Repaired-area regressions: `tests/evaluation` 12/12,
  `tests/feature_sets` 9/9, `test_v2_{phase2,core,pipeline,locations,
  multivar}` 68/68.

## Remaining limitations / pending

- **Live integration pending**: the selected candidate is not wired into
  `fitting`, the model registry, or the router; `predict` replay is a
  dev tool only.
- Freshness `available_at` relies on declared per-record availability;
  sources without it report `unknown` evidence.
- LightGBM not present in this environment → challenger count = 5.
- Linear challenger underperforms HGB here — interpretability advantage
  stands, skill does not.
