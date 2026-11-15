# Phase 6 Handoff — Uncertainty, Extremes, Explanations, Trends

Branch `feat/forecast-phase-1-locations`. Local commit only (not pushed,
per the brief). Independent package; **zero shared-file edits**.

## Owned files

- `backend/forecasts/v2/forecast_insights/` — `__init__`, `artifacts`
  (versioned `kind-rN` dirs + atomic `manifest.json`), `calibration`
  (finite-sample CQR), `diagnostics` (coverage/width/tails/bootstrap),
  `extremes` (percentile thresholds + event evaluation), `explanations`
  (grouped permutation + linear local), `trends` (monthly OLS + HAC, BH
  family), `runner`, `__main__` CLI
- `backend/forecasts/tests/forecast_insights/test_phase6.py` — 15 tests
- `docs/FORECAST_UNCERTAINTY_AND_INSIGHTS.md`, this file

## Protocol/interface dependencies (read-only)

- Consumes evaluation `predictions.jsonl` case rows
  (`predictions.candidate.q`, `actual`, `issue`, `horizon`, `fold`,
  `season`, `label_available`).
- `model_selection.store.load_frozen` + frozen candidate dicts for
  explanations; `datasets.load` for trend/threshold history;
  `variables.VARIABLES` for units/bounds/cadence.
- statsmodels 0.15.0 (HAC path) + scipy — both already installed.

## Tests (focused, per brief)

`forecasts/tests/forecast_insights` — **15/15**: hand-calculated CQR
order statistics, expand-only vs symmetric policies, insufficient/honest
states, bound-clipping flags, known coverage metrics, issue-block
bootstrap minimums, permitted-history threshold fitting, indicator
statuses with no fabricated probability, event denominators, linear local
explanation coefficients, insufficient-cases global path, trend
direction/units/sufficiency/composite-unsupported, frozen BH q-values,
synthetic end-to-end save/read-back.

No other suites run — no shared files touched.

## Genuine evidence (development-only, retrospective)

Real frozen dev evaluation `eval-37cc3db4a1df-dev-r2` (colombo /
`ds-19935bb50e81b5a5` / merra2_t2m, 286 scored candidate cases):

- `calibrator-r2`: CQR 80%, expand_only, n=86 permitted scores
  (cutoff 2017-01-01), k=70, correction +0.0515 K — artifact persisted.
- `diagnose` with that artifact: adjusted coverage_80 ≈ **0.846** at
  width ≈ 1.81 K (vs raw nominal intervals). Per-horizon/season
  breakdowns and issue-block bootstrap included in the report.

Synthetic fixtures cover extremes/explanations/trends; a frozen
model-selection artifact is **not present in this environment**, so
`explain` was exercised on synthetic fitted candidates only — the code
path is tested, the genuine-candidate demo awaits a persisted
`freeze`/`predict` artifact.

## Implemented vs integrated vs evaluated

| Capability | Implemented | Tested | Genuine dev evidence | Live-integrated |
|---|---|---|---|---|
| CQR calibration + apply | yes | yes | yes (calibrator-r2) | no |
| Interval diagnostics + bootstrap | yes | yes | yes | no |
| Extreme thresholds + event eval | yes | yes | no (synthetic) | no |
| Global/local explanations | yes | yes | no (synthetic) | no |
| HAC trend + frozen BH family | yes | yes | no (synthetic) | no |
| UI/API panels | no | — | — | **pending coordination** |

Live Forecasts result component untouched — integration needs shared
API/UI ownership and must keep the median + shaded interval primary with
nominal-vs-adjusted labelling.

## Limitations

- Conformal guarantee is marginal and weakens under serial dependence;
  reported as approximate, not exact.
- No trend evidence yet on genuine history (dataset spans/needs TBD);
  NDVI and other composite cadences return `unsupported`.
- Threshold event evaluation needs observed events; rare-event periods
  honestly return `insufficient_events`.
- Explain commands require a persisted frozen candidate state — none
  exists in this environment.

## Phase 7 prerequisites

- Persist a frozen selection artifact (`model_selection freeze`) for
  genuine explanation runs.
- Agree API/UI ownership before extending the result component; wiring:
  calibrator apply at render time (contract replay, no refit),
  diagnostics strip, threshold indicator, explanation panel, trend card.
- Keep Phase-6 artifacts outside the live model path until coordinated.
