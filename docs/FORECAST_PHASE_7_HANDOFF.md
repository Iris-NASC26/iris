# Phase 7 Handoff

Commit base: `95e9326` on `feat/forecast-phase-1-locations`.
Owned files (all additive, zero edits to Phase 1–6 sources):

- `backend/forecasts/v2/operations/` — `schedules`, `releases`,
  `monitoring`, `adapters`, `integrity`, `runner`, `__main__`, `__init__`
- `backend/forecasts/tests/operations/test_phase7.py` — 12 tests
- `docs/FORECAST_OPERATIONS.md`, `FORECAST_PHASE_7_ACCEPTANCE.md`,
  `FORECAST_FINAL_REGRESSION.md`, this file
- Spec repairs (regression fixes): `tests/visualization/browser/
  workspace.spec.ts` (2 assertions), `immersive.spec.ts` (fixture)
- `.eslintrc.json` — makes the configured `next lint` runnable once
  eslint is installed

## Implemented vs integrated vs verified

| Capability | Implemented | Tested | Live-wired |
| --- | --- | --- | --- |
| Schedules/leases/coalescing | yes | yes | CLI/callable only |
| Release promote/rollback/audit | yes | yes | CLI/callable only |
| Family adapters + generate/reopen | yes | yes (synthetic fitted states) | CLI/callable only |
| Matured scoring + drift + status | yes | yes | CLI/callable only |
| Integrity dry-run | yes | yes | CLI |
| Router/UI integration | — | — | **pending** (owned-file edit needed at an agreed window) |
| `IRIS_OPS_ENABLED` startup hook | — | — | **pending** |

## Full regression (see FORECAST_FINAL_REGRESSION.md)

backend 299/299, unit 122/122, tsc clean, browser 69+3 skips (3
obsolete-assertion failures repaired and re-verified 12/12), production
build clean. **Open gate:** `next lint` — eslint not installed and the
pnpm store install stalled; documented, not hidden.

## Remaining work (honest)

1. Wire `operations/runner.generate` + `releases` into `router.py` and
   the Forecasts result surface (shared-file edit, agreed window).
2. In-process scheduler lifecycle hook + `IRIS_OPS_ENABLED` config.
3. Genuine frozen-model demonstration through `generate` (needs a
   persisted `model_selection freeze` artifact).
4. Live-provider regression remains opt-in per repo policy.
