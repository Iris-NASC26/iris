# Implementation prompt: Phase 1 — dataset-bound forecast locations

You are implementing Phase 1 in the existing Iris repository. Complete the code, appropriate tests, documentation and verification. Inspect the repository's current state and applicable AGENTS.md instructions first. This is an implementation request, not a request for another plan.

## Objective

Replace the Forecasts section's six-location whitelist with persistent, dataset-bound location selection, and add a short explanation for people unfamiliar with ML.

Phase 1 must support arbitrary valid **point locations** end to end using the existing source adapters. Define spatial semantics that can later support area forecasts. Existing point data must never be labeled as a district/country/area average. New bounding-box extraction, polygon processing and area aggregation are Phase 2, not a hidden centroid approximation in this phase.

Keep the existing forecasting engine and authentic results functional throughout.

## Existing implementation to inspect

- `shared/forecast-regions.json`: six original points.
- `backend/forecasts/catalog.py`: static REGIONS and region lookup, also used by legacy endpoints.
- `backend/forecasts/v2/router.py`: v2 validation, catalogue, datasets, jobs, generation, saved results and predictions.
- `backend/forecasts/v2/workers.py`: source-coordinate resolution, ingestion, dataset construction, fitting, inference and refresh.
- `backend/forecasts/v2/datasets.py`: immutable historical datasets, currently stored under location directories.
- `backend/forecasts/v2/training.py`, `fitting.py`, `predict.py`, `schemas.py`: location/target-specific model and run identity.
- `backend/forecasts/v2/gic.py` and `appeears.py`: current real historical point extraction adapters.
- `src/app/workspace/forecasts/page.tsx` and `src/features/forecasts/ForecastWorkspace.tsx`.
- `src/features/forecasts/MlForecastSection.tsx`, `ForecastResult.tsx`, `model.ts`, `useCatalogue.ts`, `ForecastMap.tsx`.
- `src/app/api/v1/forecasts/[...path]/route.ts`: explicit proxy shapes, currently checking static locations.
- `src/features/landing/CobeGlobe.tsx`: curated location markers.
- Existing geocoding route and map components: reuse them rather than adding another mapping/geocoding library.
- Existing forecast documentation and tests, particularly `docs/DATASET_FORECASTS.md`.

The current six-point restriction exists in several of these layers. Changing only the select element will not complete this task.

## 1. Durable forecast location registry

Implement a v2 location/context registry with durable server storage. Prefer the existing SQLite/atomic storage patterns. Retain the original six identifiers as stable aliases or seeded records, preserving all existing dataset/model/run paths and links.

Each registered point needs:
- A server-generated safe opaque ID, display name and schema version.
- Point geometry with finite WGS84 latitude/longitude and an explicit coordinate-order convention.
- Creation metadata and timezone behavior; UTC is an acceptable explicit fallback.
- Immutable spatial identity after registration. Editing coordinates creates a new context rather than repointing old models.

Validate latitude [-90,90], longitude [-180,180], finite numbers, nonempty bounded names, supported geometry type and bounded request size. Latitude/longitude validity does not guarantee provider coverage; report unavailable source data honestly. Handle duplicate registrations deterministically without merging scientifically different spatial supports.

Never use a user-provided name as a filesystem path. Continue rejecting path traversal and arbitrary provider URLs. Store no credentials in registry records or public responses.

Expose concise typed APIs, using these shapes or equivalent conventions that fit the existing code:
- `GET /api/v1/forecasts/v2/locations`
- `POST /api/v1/forecasts/v2/locations`
- `GET /api/v1/forecasts/v2/locations/{location_id}`

Declare static routes before catch-all identifier routes. Preserve existing administrator mutation guards. Resolve locations server-side everywhere v2 ingestion, generation, job recovery, refresh and saved-run loading need coordinates or identity.

Do not unnecessarily weaken the legacy v1 archive contract to implement v2 locations.

## 2. Dataset selection and spatial compatibility

Offer a server-derived inventory of existing populated forecast dataset revisions across registered contexts, with bounded listing/pagination if needed. The UI must be able to choose a known immutable revision instead of assuming the latest dataset for one of six points.

Provide a typed compatibility assessment for a selected dataset, location and target. Include machine-readable reasons and plain user-facing messages. Useful states include ready, needs_history, insufficient_history, outside_spatial_support, unsupported_target and unsupported_spatial_mode. Reuse existing training sufficiency checks instead of inventing inconsistent UI-only thresholds.

For new datasets, capture and return:
- Dataset/source/target identity and units.
- Spatial mode: point or explicitly materialized area_mean.
- Requested geometry and actual source/grid-cell coordinates when known.
- Actual spatial support/coverage, including whether its extent/resolution is known.
- Temporal coverage, record count/completeness, latest usable input and availability basis.
- Aggregation semantics for an actual area-aggregate dataset.

Do not infer a filled area from the outer bounding box of sparse point records. Do not treat the existing point-series files as general spatial rasters. Never allow a dataset or model from Colombo to be selected for an unrelated point merely by changing the label.

If a product resolves a request to a nearby grid cell, retain and display the requested and resolved coordinates. Permit reuse only where an explicit spatial-support policy demonstrates compatibility; otherwise prepare a separate point dataset. Do not invent missing grid resolution or footprint metadata.

Legacy manifests and snapshots are immutable: adapt them on read using trustworthy existing records and seed metadata where possible. Mark unknown spatial support as unknown. Do not rewrite old manifests, model bytes or hashes. Version new contracts/fingerprints where spatial identity needs inclusion, preserving old loading behavior.

A new point without matching populated records should offer an explicit Prepare historical data action that uses the existing durable ingestion/dataset workflow. Generate remains gated on actual readiness, or visibly queues those existing preparation stages after an explicit user action. No network download, training or mutation should occur merely because a user opens a page or changes a selection.

## 3. Replace static frontend and proxy assumptions

In Forecasts, provide:
- A selector for saved contexts/populated datasets.
- A way to choose a new point by existing place search or manual coordinates. Manual coordinates must work without geocoding. Reuse existing map selection if practical; do not install a new map stack.
- Clear selected dataset, target, source and spatial-support context.
- A meaningful readiness state and action: prepare data, generate, view result, or explain why unsupported.

The original six locations may remain quick examples. They must no longer be the only accepted locations. The landing globe may remain a curated set of featured markers; it need not render every new user location.

Persist the chosen context/dataset/target in the URL using existing forecastId/run conventions or a compatible extension. Deep links and page reloads must restore the selection. Saved runs must retain the scope and dataset they were actually generated for, even if the current UI selection later changes.

Replace v2 proxy membership checks against the six static points with explicit allowed route shapes and safe identifier validation. The backend remains authoritative about existence and compatibility. Do not turn the proxy into arbitrary forwarding. Preserve real unknown-location/dataset 404 responses; do not mislabel them as “start the backend” failures.

The current catalogue parser expects exactly six entries and matches them to static metadata. Introduce an appropriate v2/dynamic catalogue parser or adapter rather than weakening scientific validation on legacy provider archives. Handle invalid/unknown locations with useful UI states instead of crashes.

Cancel stale frontend requests when the location, dataset, target or saved run changes. Poll and display only the corresponding job/results; prevent late responses from switching the displayed location. Do not silently train on the latest revision when a different explicit dataset revision was selected.

## 4. Short introduction at the top

Add this compact introduction above the controls:

“Choose a place and historical records. Iris learns patterns in those observations to estimate upcoming conditions and a likely range. Check the data age and model error before using a result.”

Optionally add three compact steps: Choose data → Generate → View estimate and range.

Keep the visible introduction short, roughly 40–60 words maximum including step labels. Put technical explanations in an existing How it works disclosure. Use the current design components; this is not the full UI revamp. Preserve responsive layouts, light/dark treatment, visible focus and accessible labels.

## 5. Preserve existing scientific and operational behavior

- Keep the current tree models, feature construction, calibration, data-source authentication and error comparisons.
- Preserve experimental-preview flags, red baseline-relative error labels, input age, uncertainty ranges, original units, provenance and exports.
- Missing data, corrupt models, incompatible contexts or unsupported input age must still fail honestly.
- Preserve explicit selected dataset/location/source/target binding through dataset creation, training, activation, prediction, current pointers, jobs and saved runs. Add necessary spatial binding validation; do not create a cross-location transfer model.
- New locations must work with durable job recovery and the refresh worker, not only an in-memory page session.
- Retain Meteomatics historical access, Earthdata token preference for Giovanni and separate AppEEARS authentication.
- Keep source budgets, history-only constraints and resumable pending extraction behavior.
- Do not alter Data Analysis methods, unrelated pages, provider future-forecast behavior, or existing runtime data.

## 6. Verification and acceptance

Add focused meaningful backend and browser coverage for:
1. A valid non-seeded point registers, survives a registry reload/restart, and appears in the selector.
2. Invalid, nonfinite or out-of-range coordinates and unsafe identifiers are rejected.
3. A selected dataset for another point/target/source cannot be silently reused.
4. A point dataset cannot be labeled or used as a whole-area mean.
5. A missing dataset offers preparation; registration/GET/selection alone does not submit downloads or training.
6. A non-seeded location proceeds through the existing preparation → dataset → model → prediction path with isolated test fixtures, and its saved result reopens with the correct scope. Fixture success establishes software behavior, not weather skill.
7. Explicit dataset selection is retained through generation; existing asynchronous jobs are not duplicated unnecessarily.
8. Original location IDs and temperature/soil-moisture saved links still load.
9. Switching location or target during a delayed response cannot display the previous context's results.
10. Proxy shape validation supports legitimate dynamic IDs and rejects arbitrary paths; backend 404 messages are preserved.
11. The short introduction, readiness messages and selection controls work at desktop and mobile widths.

Run the appropriate existing Python forecast tests, frontend contract tests, TypeScript, relevant Playwright flows, and production build. Use repository scripts/tooling where available; report commands and actual results. Do not print tokens or download years of live data just to satisfy a software test. A live smoke test is optional when suitable real data is already available; state any external-service limitation clearly.

## Delivery

Work on an appropriate feature branch and preserve unrelated working-tree changes. Do not reset, force-push or rewrite shared history. Do not commit credentials, runtime datasets or model artifacts.

Update forecast documentation with the new registry, APIs, compatibility rules, migration behavior and an end-user walkthrough for preparing a custom point. Explain the Phase 2 boundary for true area forecasts.

Finish with a concise report: changed files and behavior; the exact user flow; tests/build results; compatibility/migration notes; any incomplete scope. Implement this phase fully rather than leaving placeholder registration APIs or a dropdown that still fails backend validation.
