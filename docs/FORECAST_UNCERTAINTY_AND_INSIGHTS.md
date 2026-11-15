# Forecast Uncertainty & Insights (Phase 6)

Engine: `iris-insights-v1`, package `backend/forecasts/v2/forecast_insights/`.
All commands are **development/retrospective** — nothing reads the protected
final holdout, retrains models, calls providers, or mutates the live registry.

## Interval calibration (measured uncertainty)

q10/q50/q90 from a quantile model are **nominal** — not automatically 80%
probabilities. Phase 6 attaches measured evidence via finite-sample
**split conformalized quantile regression (CQR)**:

- Nonconformity score per permitted calibration case:
  `s_i = max(q10_i - y_i, y_i - q90_i)`.
- Correction `c` = k-th smallest score, `k = ceil((n+1)*level)` (one-based
  order statistic, recorded in the artifact). `k > n` → honest
  `insufficient_calibration`, never silent clipping.
- `expand_only` policy: `c = max(c, 0)` — widens undercoverage, never
  shrinks a well-calibrated model. `symmetric` allows shrinkage and is
  disclosed as such.
- Application: `[q10 - c, q90 + c]`, clipped to the target's physical
  bounds with `clipped: {lower, upper}` flags — clipping is recorded, not
  hidden. Median is passed through unchanged.
- Finite-sample guarantee: exchangeable calibration + future scores give
  marginal coverage ≥ level with at most `1/(n+1)` slack. Serial
  dependence weakens this — the artifact says so.
- Artifact (`iris-insight-calibration.v1`): schema, method, level, policy,
  n_scores, cutoff, context (location/dataset/target), order statistic,
  correction, score summary, status. Lineage = cutoff + context + engine.

## Interval diagnostics

`diagnose` measures, on frozen evaluation `predictions.jsonl` case rows:

- coverage_80, mean_width, interval_score_80, pinball, MAE, RMSE, bias,
  per-tail miss rates — **raw vs adjusted** on identical scored cases.
- Breakdowns by horizon and season (policy-fixed slices, counts disclosed).
- Uncertainty: **paired issue-block bootstrap** — whole issues resampled
  with all their horizons (target windows overlap; per-case resampling
  would fake independence). Reported as `approximate`, never a binomial CI
  labelled dependence-corrected. `< 5` issue blocks →
  `insufficient_dependence_blocks`.

## Extreme-condition indicators

Threshold artifacts (`iris-insight-threshold.v1`) fit **exceedance
percentiles per calendar month** on permitted observed history only —
`available < cutoff` AND `interval_end < cutoff`. Statuses:
`fitted` / `insufficient_history` / `unevaluated` / `not_applicable`.

`indicator()` reports `median_vs_threshold`,
`interval_vs_threshold` (below/crosses/above), and the honest string
**"not a calibrated event probability"** — deterministic threshold
decisions are never reported as probabilities; quantile rank is never used
as a Brier probability; missing probabilities are never scored as zero.

`evaluate_events` reports hits/misses/false alarms, precision, recall,
prevalence with explicit denominators; zero observed events →
`insufficient_events` rather than a fabricated skill score.

These are **meteorological threshold indicators only** — no inundation,
crop, health, or return-period claims.

## Explanations (model sensitivity, not causality)

- **Global** (`explain`): grouped permutation on permitted development
  cases — coherent groups (`recent_values`, `lags`, `seasonal`, drivers,
  missingness flags), bounded repeats, per-issue grouping. Reports score
  change, repeat std, n; negative/near-zero results are reported, not
  hidden. Labelled **sensitivity** — not causal intervention, not
  significance testing.
- **Local** (`explain --local`): for `linear_quantile` candidates,
  grouped coefficient-path contributions relative to a reference drawn
  from **permitted training/development background rows** (never zero
  vectors, never future/test labels). Persisted: method, explained output
  (raw median regression), reference value, group effects, limitation
  text. Unsupported model families return an honest capability state.
- Permitted language: "the model's median is most sensitive to X".
  Never "X caused the prediction" or "X is significant".

## Historical trends (retrospective, separate from forecasting)

`analyze()` — monthly-mean OLS with 11 seasonal dummies +
**Newey–West HAC covariance** (statsmodels; lag = NW rule
`round(4*(n/100)^(2/9))`). Effect reported in `unit/year` on real elapsed
calendar time (fractional years from month indices — gaps and leap years
preserved; no equal-spacing of composites).

- Supported: daily-cadence targets aggregated to calendar-month means
  (stated as means-of-daily-values, not a monthly rate).
- Composite products (e.g. 16-day NDVI) → `unsupported` until a justified
  native-period method exists.
- Sufficiency: ≥36 months, ≥2 yr span, ≥80% completeness → else
  `insufficient` (not evidence either way).
- Labels: `supports_trend` / `no_clear_evidence` / `insufficient` /
  `unsupported`. Nonsignificance ≠ no trend; significance ≠ practical
  importance; never a forecast-skill or confidence claim.

`apply_family()` — **frozen** Benjamini–Hochberg family
(`iris-insight-trend-family.v1`): declared test list only; invalid tests
excluded and listed; q-values computed once and stored — unrelated new
reports never recompute them. Assumption stated: FDR under PRDS,
approximate for correlated series.

## Commands

```bash
cd backend
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  calibrate --cases <eval_dir> --cutoff <ISO> --context '{...}' [--store DIR]
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  diagnose --cases <eval_dir> --target <t> [--calibrator <dir>] [--store DIR]
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  threshold --dataset <loc>:<ds> --target <t> --cutoff <ISO> [--store DIR]
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  extreme-eval --threshold <dir> --cases <eval_dir>
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  explain --selection <dir> --dataset <ds> --cases <eval_dir> [--local]
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  trend --dataset <loc>:<ds> --target <t> [--store DIR]
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights \
  family --id <fam> --reports <t1.json> <t2.json> ...
.\.venv\Scripts\python.exe -m forecasts.v2.forecast_insights view --report <dir>
```

## UI wording (when integration is scheduled)

- "80% interval — measured coverage 0.85 over 286 development cases
  (2013–2017)" — never a bare badge on nominal levels.
- "Range calibration not evaluated" when no calibrated artifact applies.
- Trend cards read "retrospective analysis of dataset X" — visibly
  separate from forecast panels.

## Hard boundaries

No provider ensemble substitution; no summed marginal quantiles; no
tuning on the displayed evaluation period; no fabricated probabilities,
probabilities-as-zeros, causal claims, climate claims from three years,
or holdout use in any routine path.
