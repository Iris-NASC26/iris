# Final Regression Report — Phase 7

Branch `feat/forecast-phase-1-locations`, tested HEAD `95e9326` +
Phase-7 working tree (operations package, spec repairs, `.eslintrc.json`).
Windows, Node 24, Python 3.13 venv, Next 15.5.29, Chromium Playwright.

## Results

| Gate | Command | Result |
|---|---|---|
| Complete backend | `cd backend; .venv/Scripts/python.exe -m pytest -q` | **299 passed**, 0 failed (46s) |
| Frontend unit | `npm run test:visualization` | **122 passed**, 0 failed |
| Type check | `npx tsc --noEmit --incremental false` | **clean**, exit 0 |
| Browser | `npm run test:visualization:browser` | **66 pass / 3 fixed→pass / 3 skip** (see below) |
| Production build | `npm run build` | **success** — all routes compiled |
| Lint | `npm run lint` | **incomplete — environment** |

## Failures found and fixed (all obsolete assertions vs merged-main behavior)

1. `workspace.spec.ts:5` — asserted `.dashboard-context-chip` absent.
   Merged-main layout intentionally renders the chip with an honest
   empty state. Fixed: assert it contains "No dataset selected".
2. `workspace.spec.ts:34` — expected `Monthly heatmap` img directly
   after opening the Seasonal cycles tab. The merged `SeasonalCycle`
   defaults to the orbit view; the heatmap needs its `Year-by-month`
   button (same flow as the passing `recordScenes` spec). Fixed:
   click the button first.
3. `immersive.spec.ts:41` — Sen's-slope checkbox stayed disabled:
   shared fixture has 4 valid obs, merged compatibility gate correctly
   requires ≥6. Fixed: test-local enriched series (8 obs / 7 valid),
   other fixtures untouched (they assert the 4-valid counts).

Verified: re-run of both specs → 12/12 pass.

## Skips (recorded, not hidden)

- `live.spec.ts` — requires `IRIS_VISUALIZATION_LIVE=1` + external
  services; not run as ordinary regression.
- `cesium.spec.ts:87` tile-failure degradation — intentionally skipped
  in config.
- One immersive retry-flake observed during the full run (`x` marker),
  passed on retry; cause was the same disabled-checkbox gate now fixed
  by the enriched fixture.

## Limitations

- **Lint gate incomplete:** `next lint` requires `eslint`, which is not
  installed; `npm install eslint eslint-config-next` stalled in the
  pnpm-managed store with peer-resolution conflicts and was killed.
  `.eslintrc.json` (`next/core-web-vitals`) was added so the check runs
  once the dependency is installed — the gate remains honestly open,
  not reported green.
- Production-start integrated smoke not executed end-to-end here; the
  built app compiled and the dev server serves /workspace (HTTP 200).
- Live provider/live-visualization paths remain explicitly opt-in and
  were not exercised.
