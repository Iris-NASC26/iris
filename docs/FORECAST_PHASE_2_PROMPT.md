# Implementation prompt: Phase 2 — fresh historical inputs and real area datasets

Implement Phase 2 in the existing Iris repository. Complete the working code, focused tests, documentation and verification. This is an implementation task, not a request for another architecture proposal.

## Starting point and working rules

Phase 1 provides a durable point-location registry, dataset inventory/compatibility, dynamic frontend selection, and a short explanation in Forecasts. Inspect its completed implementation first; actual code and contracts take precedence over assumptions in this prompt.

Read `docs/FORECAST_EVOLUTION_PLAN.md`, `docs/FORECAST_PHASE_1_PROMPT.md`, `docs/DATASET_FORECASTS.md`, applicable AGENTS.md files, and the current Git state. Begin from the completed, verified Phase 1 checkpoint on a suitable feature branch. Do not start from an older main that lacks Phase 1. If another agent is still writing Phase 1, do not edit its files concurrently; wait for its handoff. Preserve unrelated changes, credentials and runtime artifacts. Do not reset, force-push or rewrite shared history.

Key existing files:
- `backend/forecasts/v2/locations.py`, `datasets.py`, `router.py`, `schemas.py`, `jobs.py`, `workers.py`.
- `backend/forecasts/v2/variables.py`, `qa.py`, `gic.py`, `appeears.py`, `earthdata.py`, `sources.py`.
- `backend/forecasts/v2/fitting.py`, `training.py`, `predict.py`: keep the current ML algorithm and feature set.
- `backend/providers/nasa_power.py`, `backend/adapters/extraction_adapters.py`, and their regional-extraction tests.
- `src/features/forecasts/LocationPicker.tsx`, `PickerMap.tsx`, `useLocations.ts`, `MlForecastSection.tsx`, `ForecastResult.tsx`, `model.ts`, and the forecast proxy.

## Objective and bounded scope

Deliver two capabilities:
1. Update prepared historical data incrementally and show its actual freshness honestly.
2. Prepare an actual bounding-box area-average dataset and forecast that area's aggregated series.

Implement one complete provider/target path for both point and area data first. Prefer the existing NASA POWER daily air-temperature path if current official documentation and the existing implementation confirm it can meet the requirements. Introduce an explicit source identity, and a separate target key where the current registry requires it. Preserve MERRA-2, GLDAS, SMAP and MODIS behavior; unsupported area paths must report their limits instead of pretending to work.

Do not try to implement every Earthdata raster product in this phase. Arbitrary polygons, administrative-boundary catalogs, full global raster downloads, new model families, expanded ML features, full backtesting redesign, SHAP, automated retraining/drift systems and the UI revamp belong to later work.

Only historical observations/analyses are allowed. Provider future forecast values remain prohibited.

## 1. Explicit provider capabilities and source identity

Add or extend a source capability registry that declares supported variables, units, native cadence, point/area modes, actual access method, authentication requirement, grid metadata where known, limits, incremental-update behavior and availability policy.

Inspect current official provider documentation before choosing latency assumptions, API parameters or spatial interpretation. Record primary-source documentation links and what was live-verified. Do not advertise a particular data latency just because a request was submitted recently. Correct misleading registry access/scale descriptions for touched paths.

NASA POWER's existing regional extraction is a useful implementation reference, but it contains a centroid-point fallback and reduces valid cells without all the coverage/vintage metadata needed here. The forecast area path must not inherit that fallback. Reuse or extend low-level helpers in a backward-compatible way; do not silently change unrelated Data Analysis behavior.

Do not identify NASA POWER data as the exact MERRA-2 product used by the current temperature models. Treat a new provider or product as a distinct source, even when it ultimately uses related reanalysis. Validate source, parameter, units and temporal meaning. Apply explicit unit conversions, e.g. Celsius to kelvin when required by the target contract, and preserve original units/metadata. A new source must have matching historical training data; never append it to an old source's series or feed it into an incompatible model.

Credential checks and frontend readiness must follow the selected source. A public source must not require an Earthdata token. Keep EARTHDATA_TOKEN preference for Giovanni and separate AppEEARS authentication. Never expose secrets or signed download URLs in logs, manifests, checkpoints, exports or API errors.

## 2. Incremental historical updates

Implement a durable Update historical data operation for an explicitly selected context, source and target. It must:
- Use the existing bounded job/checkpoint architecture.
- Determine the previous observation watermark for that exact series.
- Refetch a provider-appropriate overlap to detect revised observations and fill recent gaps; keep the overlap policy explicit.
- Distinguish append, revision, duplicate/no-change, missing observations and failed retrieval.
- Merge deterministically by source/product/version, target, spatial identity, interval and observation identity.
- Never replace a valid observation with a missing response without an explicit documented revision policy.
- Preserve old immutable datasets and their supporting artifacts. Changed observations create a new dataset revision.
- Treat repeated identical updates as no-change: do not create a new scientific dataset revision solely because retrieval timestamps changed. Separate fetch/check metadata from scientific record identity for new contracts; do not rewrite old hashes.
- Keep compatible active-model inference tied to the data contract it was trained for. Record the actual inference-input revision separately from the model's training revision when they differ. Updating data does not silently retrain or activate a new model.
- Reuse an existing matching in-flight update instead of submitting duplicates. Preserve cancellation/restart behavior.

When a selected immutable revision is pinned, an update must not silently change the selection or regenerate its saved forecast. Tell the user a newer revision is available and let them select it.

Distinguish these timestamps and their meanings:
- Observation interval start/end.
- Provider publication/modification timestamp, when genuinely supplied.
- First seen/retrieved/check timestamps recorded by Iris.
- Estimated record availability, with its policy/version and explicit estimated basis.
- Dataset creation, model training, and forecast issue time.

An observation from 2010 first downloaded today does not have an observed 2010 publication timestamp. A file modification timestamp is not necessarily its original release date. Preserve estimated historical availability separately from collected vintage evidence; Phase 3 will use that evidence for stricter evaluation. Do not backdate first-seen metadata or claim a verified historical issue-time archive from a current backfill.

## 3. Useful freshness status

Return a typed source/context/target freshness summary, including latest usable observation end, input age, last successful check, latest dataset revision, source's availability basis and update status. Represent no-new-data, delayed source, unsupported, credential failure, rate-limited and retrieval failure distinctly.

When a provider remains delayed, explain that fact. Do not reduce the existing input-age checks, change GLDAS's configured delay or extend forecast expiry merely to make the page look fresh. A new low-latency source is an explicitly separate dataset/model path, not an undisclosed replacement.

Do not add scheduled retraining or a new ingestion scheduler. This phase supplies reliable explicit incremental updates and resumable execution. Keep the existing prediction-renewal worker, but make clear that reissuing a forecast does not prove its source data was updated.

## 4. Durable bounding-box area contexts

Extend the Phase 1 registry with immutable bounding-box geometry and spatial mode `area_mean`, with an additive/versioned database migration. Preserve old point IDs and records without destructive migration. Any stored centroid is display metadata only and must not route an area request to a point extractor.

Use an explicit convention such as `[west, south, east, north]` in WGS84 degrees. Reject nonfinite/out-of-range/zero-area/reversed bounds. In this phase, reject antimeridian-crossing boxes and polygons with a clear typed reason unless they are actually implemented and tested; never reinterpret a wrapped box as most of the world.

Canonicalize geometry deterministically. Include geometry, spatial mode and aggregation policy in context identity and new dataset/model compatibility. Same centre with different bounds must remain different scientific contexts. Never merge point and area contexts by centroid coordinate.

Before retrieval, validate provider coverage and estimate cells, dates, native cadence, bytes and request count. Apply server-controlled limits; client budget values cannot raise them. Reuse existing practical limits where suitable and document the configured policy. Reject unsupported work with an actionable message, or explicitly request a smaller area/date span. Chunking must not evade the overall resource budget.

If the provider requires an enclosing request window larger than the selected box, distinguish requested geometry from query geometry, and subset/weight back to the actual requested support. Do not silently expand the scientific area. Do not fall back to its centre when a requested region is too small or unsupported.

## 5. Scientifically explicit spatial aggregation

Retrieve the source's actual native cells or a documented provider-native area statistic. For local aggregation, preserve enough coordinates/grid bounds and QA metadata to verify what contributed.

For an area mean of an intensive variable, compute:

    area_mean(t) = sum(valid_cell_value(i,t) * overlap_area(i))
                   / sum(valid_overlap_area(i,t))

Use geodesic/spherical cell intersection areas or a documented appropriate method based on verified grid metadata. Cosine-latitude centre weighting is an approximation for suitable regular grids; do not call it exact boundary clipping. Never invent grid bounds for an unknown grid or treat all returned cells as wholly inside the requested box. If only a particular support approximation is possible, label that support accurately and keep it distinct from exact requested-area aggregation.

Temporal and spatial aggregation are separate:
- Daily temperature is a time mean and an area-weighted spatial mean.
- Rainfall depth can be a temporal accumulation followed by a spatial mean; summing millimetres across cells is not an area's average rainfall depth.
- Extensive totals require different semantics and unit handling; leave them unsupported unless explicitly implemented.
- Do not average quantile forecasts from individual point models. Train and predict the aggregated historical target series with matching support.

Track per interval: eligible/requested support, valid contributing cells/weights, valid-area fraction, temporal completeness, quality flags and coverage policy. Keep land-only support explicit where relevant; missing cells cannot automatically be classified as water. Coverage denominators must describe the intended support, not only the cells that happened to return values.

Set a documented minimum valid-area coverage policy, and require complete native temporal intervals as appropriate. Below-threshold periods remain missing/quarantined; do not zero-fill, forward-fill or scale them into full coverage. If partial coverage above a permitted threshold is retained, disclose the fraction and mean-over-valid-support interpretation. Valid zero measurements remain zero.

Aggregate availability conservatively from the actual contributing intervals and source delay/basis. An observation/composite is never usable before its measurement window finishes. Preserve leap days, year boundaries, native intervals and missing periods correctly.

Provider responses may have only one contributing native cell for a very small box. Report that resolution/support honestly. The end-to-end demonstration for this phase must include a real multi-cell aggregation, so a point fallback cannot pass as area support.

## 6. Provenance, datasets and model binding

Extend versioned manifests and run metadata to record requested/query/actual support, source/product version, parameter, conversion, native cadence/resolution, aggregation policy/version, coverage, availability basis, retrieval/vintage references and sanitized source artifact hashes. Small bounded sidecars for interval coverage and fetch/vintage records are acceptable; do not bloat every API response with entire grids.

A change in geometry, source, conversion, spatial aggregation or semantic policy requires a distinct compatible dataset/model identity. Reject point-model-to-area prediction and incompatible source substitution. Existing qualified and experimental models retain their evaluation status; a successfully fetched dataset does not establish model skill.

Preserve legacy immutable dataset hashes and saved-run loading. Do not mutate prior manifests to make them claim newer spatial/vintage information. Adapt old unknown metadata conservatively on read. Include spatial support and input revision in evidence exports and permanent saved results.

The existing gradient-boosted quantile training can be reused for a genuinely materialized area-average series. Avoid changing its features or evaluation protocol in this phase. Any necessary binding/schema changes must be versioned and backward compatible. New model/evaluation research belongs to Phases 3–6.

## 7. APIs and Forecasts UI

Extend current Phase 1 routes and types rather than creating a parallel registry. Provide clear capabilities, bounded area registration/preparation, update-job status and freshness retrieval. Use existing conventions; possible additions are a source-specific capabilities response, an explicit history-update mutation and a read-only freshness endpoint.

Keep the Next.js proxy allowlist, safe identifier validation, request limits, administrator mutation guards and truthful HTTP errors. Arbitrary provider URLs or filesystem paths are not accepted.

Within Forecasts:
- Add Point / Area average selection and a bounding-box picker using existing map tools, plus numeric bounds as a keyboard-accessible fallback.
- Indicate which provider/target supports area mode and show an actionable reason for unsupported combinations.
- Preview the selected geometry and estimated extraction size before an explicit Prepare data action. Show a bounded, understandable progress state and allow cancellation/retry.
- Add Update historical data separately from Generate forecast. Show a new dataset revision when observations change and a concise no-new-data result otherwise.
- Keep visible freshness information compact: latest observation date, input age, last successful update/check, and partial-area coverage when relevant. Technical provenance belongs in expandable details.
- Label results as Point / grid-cell estimate or Area average. Never imply a map-wide predictive surface or a forecast for each pixel from one averaged series.
- Preserve the short non-ML introduction, experimental-preview warnings, red baseline-error comparisons, uncertainty ranges, saved links and exports.
- Persist geometry/context/dataset/target in URL state and handle reloads. Abort stale requests so changing source/area cannot display another selection's result.

Do not add another mapping library, redesign the whole website, or modify the Data Analysis workbench to obtain this UI.

## 8. Required tests and live verification

Use isolated deterministic fixtures for software/scientific-contract tests, clearly identified as test data. Add focused coverage for:
1. Existing point contexts and artifacts survive the registry migration unchanged.
2. Bounds validation, unsupported wrap/polygon cases, safe IDs and resource-budget enforcement.
3. Same centre/different bounds and point/area identities cannot collide or reuse incompatible datasets/models.
4. A small grid with unequal cell/overlap areas produces the independently calculated weighted mean, different from the naive mean where expected.
5. Spatial mean versus temporal sum are not confused; zero, missing cells, invalid values, incomplete time intervals and insufficient area coverage behave correctly.
6. A centre-only/provider fallback is rejected for the strict area path, including the existing NASA POWER small-region fallback case.
7. Partial boundary cells, verified grid support, land-only support and requested-versus-query bounds are represented correctly.
8. Incremental append, overlapping revisions, duplicate/no-change, newly available records and provider failures produce correct immutable revisions and watermark behavior.
9. A no-change check does not create a new dataset merely because retrieval time changed; pinned selections and old snapshots remain unchanged.
10. Estimated availability is not mislabeled as observed publication; first-seen/vintage information is retained without backdating or leaking tokens.
11. Public providers work without Earthdata credentials; existing token/AppEEARS paths retain their correct authentication.
12. Jobs resume without repeating the full backfill, and cancelled jobs do not publish partial outputs as complete datasets.
13. Browser flow: select area → validate → prepare → select prepared revision → existing training/prediction → saved result/export with correct scope and freshness.
14. Browser flow: update data → no-new-data or new revision, with no accidental retraining or context switch.
15. Mobile/numeric-bound selection, keyboard use and late-response isolation.

Run relevant existing backend forecast and regional-provider tests, frontend contract tests, TypeScript, focused Playwright flows and production build. Use the repository's tooling and report real commands/results. Tests with synthetic fixtures do not establish weather skill.

Make a bounded genuine provider smoke request where network/access permits. Verify at least one actual multi-cell region and its lineage; use a small historical interval rather than downloading decades for a smoke test. Compare its aggregate against the underlying cells, not against its centre point. If sufficient genuine prepared history is already available, also verify end-to-end area-model inference; do not fake a forecast or assert skill when history or evaluation is insufficient. Clearly report which live steps ran and any externally blocked steps.

## Completion gate and handoff

The phase is complete when the implemented provider/target supports genuine point and area history, explicit incremental updates, correct source/geometry/model binding, truthful freshness and provenance, and the existing forecast pipeline can consume its prepared series with preserved quality checks.

Document the supported provider/target matrix, limits, weighting and missing-data policy, source/time assumptions, schema migrations, and user walkthrough. State explicitly which Earthdata area products remain unsupported. Include an evaluation handoff listing the vintage evidence now available and the known evaluation improvements reserved for Phase 3.

Finish with changed behavior, code locations, test/build results, live verification evidence, migration/backward compatibility and any remaining external limitations. Do not mark success based solely on new UI controls or an area-shaped context backed by point data.
