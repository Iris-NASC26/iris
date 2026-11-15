# Final Regression Report — Phase 7

Branch `feat/forecast-phase-1-locations`, tested HEAD `95e9326` +
Phase-7 working tree (operations package, spec repairs, `.eslintrc.json`).
Windows, Node 24, Python 3.13 venv, Next 15.5.29, Chromium Playwright.

## Results

| Gate | Command | Result |
| --- | --- | --- |
| Complete backend | `cd backend; .venv/Scripts/python.exe -m pytest -q` | **299 passed**, 0 failed (46s) |
| Frontend unit | `npm run test:visualization` | **122 passed**, 0 failed |
| Type check | `npx tsc --noEmit --incremental false` | **clean**, exit 0 |
| Browser | `npm run test:visualization:browser` | **69 pass / 0 fail / 3 skip** (final rerun) |
| Production build | `npm run build` | **success** — all routes compiled, lint+types internal |
| Lint | `npm run lint` | **0 errors, exit 0** (warnings only, non-blocking) |

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

- **Lint resolved:** the repo is pnpm-managed (`pnpm-lock.yaml`,
  `pnpm-workspace.yaml`) — `npm install` cannot resolve into a pnpm
  virtual store and `pnpm@9` rejected the v11 store layout. Correct
  path: `npx pnpm@12 add -Dw eslint@8 eslint-config-next@15` (matches
  the v11 store + Next 15.5.29). `pnpm-workspace.yaml` gained the
  missing `packages:` declaration required by pnpm 12.
- Lint then surfaced 5 real errors, now fixed: conditional `useMemo`
  calls in `DataPreviewView.tsx` (hooks hoisted above the empty-state
  early return, null-safe) and a `module`-variable assignment in
  `Globe.tsx`. Remaining output is warnings only.
- Production-start integrated smoke not executed end-to-end here; the
  built app compiled and the dev server serves /workspace (HTTP 200).
- Live provider/live-visualization paths remain explicitly opt-in and
  were not exercised (live.spec.ts, verify-live.spec.ts, cesium skip).
