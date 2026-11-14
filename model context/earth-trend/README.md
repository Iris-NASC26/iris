# Earth Trend Detective — Vimukthi's integration work

This folder holds the documentation set from the `earth-system-trend-detective`
repository, snapshotted at commit `2268cdf` (branch `main`).

## Where the code is

The complete, self-contained project lives under `earth-trend/` at the repo root
of this branch — same layout as the source repo: `web/` (Next.js 16 App Router
frontend), `backend/` (FastAPI + Pydantic contracts), `scripts/` (`dev.py`
launches both), `contracts/` (generated OpenAPI + TypeScript), `validation/`
(independent reference implementations). `cd earth-trend` and follow its
`DEVELOPMENT.md` to run it; nothing outside the folder is needed.

## Relationship to this repository

`iris/main` is byte-identical to the `initial-navida` branch that was reviewed
and selectively integrated into earth-trend. `NAVIDA_INTEGRATION.md` records
exactly what was taken (public pages, workspace frame, theme/preferences,
onboarding, attribution) and what was deliberately excluded (the Gemini/live
provider SI stack, provider adapters with centroid sampling and product
substitution, generated scientific results and marketing statistics) — read it
before re-merging either direction.

## State of the work

- `EXECUTION_STATUS.md` is the ledger: what is verified, what is device-specific,
  and which scientific gates remain open.
- Real NASA POWER data is connected for V01/V12 only (monthly series endpoint and
  raw fields on the globe). Nothing is trend/significance-validated yet.
- The globe engine meets its ≥30 fps bar (59.9 fps median, Intel Iris Xe).
