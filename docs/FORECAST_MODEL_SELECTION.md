# Forecast model selection (Phase 5)

`backend/forecasts/v2/model_selection/` compares a small set of versioned
candidate model families through the **same corrected Phase-3 evaluator** —
identical folds, contexts, seed, baselines, feature profile, and reserved
final holdout. It is a development tool; it never scores the protected
holdout and never writes to the live model registry.

## Candidates

| id | family | contract |
|---|---|---|
| `hgb-incumbent` | `hgb_incumbent` | Exact reproduction of the live boosted-quantile model (lr 0.1, max_iter 120, leaves selected {3,7} on inner validation, q10/q50/q90, conformal calibration correction). |
| `hgb-trial-N` | `hgb_tuned` | Seeded bounded trials over `learning_rate × max_iter × leaves × min_samples_leaf × l2_regularization` (grid of 6, budget-capped per run). Early stopping stays disabled; iterations are tuned explicitly. |
| `linear-seasonal` | `linear_quantile` | Interpretable challenger: `QuantileRegressor` q10/q50/q90 on the declared feature columns with **train-only** median imputation + standardization, bounded alpha search {0, 0.1, 1.0} on inner validation, and the same calibration-block conformal correction. |
| `lgbm-quantile` | `lightgbm_quantile` | Optional — only built when `lightgbm` is installed; otherwise reported `dependency_unavailable` and skipped. Startup never requires it. |

Each candidate emits an `iris-candidate.v1` contract: family/version,
complete params, seed, feature-profile fingerprint + ordered columns,
dataset bindings, capability flags (quantiles, missing-feature policy,
deterministic), library versions, and a `candidate_sha256` identity hash.
No future observed exogenous inputs are used anywhere.

## CLI

```bash
cd backend
# bounded development comparison (holdout stays reserved)
./.venv/Scripts/python.exe -m forecasts.v2.model_selection compare \
    --config compare.json [--feature-spec feature.json] [--store DIR]

# summary of a completed comparison
./.venv/Scripts/python.exe -m forecasts.v2.model_selection report \
    --comparison <comparison_dir>

# freeze the selected candidate: refit on permitted development
# partitions only, persist contract + estimator + evidence
./.venv/Scripts/python.exe -m forecasts.v2.model_selection freeze \
    --comparison <comparison_dir> --winner <candidate_id> \
    --eval-spec spec.json [--feature-spec feature.json] [--store DIR]

# replay inference from an immutable feature snapshot — no provider access
./.venv/Scripts/python.exe -m forecasts.v2.model_selection predict \
    --selection <frozen_dir> --dataset <ds-*> --snapshot <snapshot_dir|json>
```

`compare.json`: `{"eval_spec": <Phase-3 spec>, "seed": int,
"budget": {"hgb_trials": 4, "linear": true, "linear_alphas": 3,
"lightgbm": false}}`.
`--feature-spec` is a Phase-4 `iris-feature-spec.v1` document; its profile
fingerprint and ordered columns are bound into every candidate contract
and its transforms are re-fitted inside each fold's cutoff.

## Comparison semantics

- **Shared-case scoring**: candidates are ranked on the intersection of
  stable `case_id`s every candidate actually scored
  (`shared_metrics.*.shared_n`); profile-scored counts are reported
  separately so coverage vs common-case skill is never conflated.
- **Metric**: primary key is shared-case q50 MAE; ties break on coverage
  distance from nominal 0.80. Quantile/coverage metrics exist for
  interval-capable candidates; deterministic baselines report
  `unavailable_deterministic`.
- **Baselines**: persistence / seasonal climatology / seasonal naive run
  on identical cases in every fold; `baseline_champion_development` names
  the strongest baseline so a no-improvement outcome stays visible.
- **Budgets**: `limits.max_cases` rejects oversized contexts;
  `max_fit_seconds` marks folds `timeout`; trial counts are declared in
  `trials_declared` and seeded deterministically.
- **Holdout**: every run reports `reserved_not_scored`. A frozen
  candidate's final assessment is a separate explicit
  `run_final_assessment` call — never part of selection.

## Artifact layout

```
<store>/comparison-rN/comparison.json        # full comparison report
<store>/eval-<fp>-dev-rN/                    # per-candidate evaluator artifacts
<store>/frozen-<cid>-rN/
    candidate.json                           # iris-candidate.v1 + frozen hash block
    estimator.pkl                            # picklable replay state per dataset
    metrics.json                             # shared-case evidence at freeze time
    selection.json                           # frozen selection record
```

`load_frozen` verifies schema + estimator hash before replay; a modified
artifact raises instead of silently mixing.

## Live-integration status

**Not wired.** Selection runs entirely inside the evaluation namespace;
`fitting.fit`, the live model registry, jobs, and the router are
untouched. Adopting a selected candidate for live forecasts requires a
separate, explicitly scoped change (register the frozen candidate as a
model artifact + point prediction replay through `predict.py`) and its
own review.
