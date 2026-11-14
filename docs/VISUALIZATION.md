# Visualization workspace

This is a focused addition to the fresh Iris baseline `dcffc86`. It keeps the existing site layout, SI workflow and original scientific-analysis component. It does not consolidate the older application or replace the backend. The user explicitly authorized an additive genuine-grid endpoint without editing existing backend files.

## Start

From the repository root, use Node 24 and the pinned pnpm manager:

```powershell
npx --yes pnpm@12.18.0 install --frozen-lockfile
npx --yes pnpm@12.18.0 dev --hostname 127.0.0.1 --port 3000
```

In another terminal, prepare the backend environment and enable the additional routes:

```powershell
uv venv --python 3.13 backend/.venv
uv pip sync --python backend/.venv/Scripts/python.exe backend/visualization-requirements.lock
cd backend
.venv/Scripts/python.exe -m uvicorn visualization_app:app --host 127.0.0.1 --port 8000
```

`visualization_app.py` imports the existing `main.app` and registers only the independent visualization router. Existing backend source files and routes are retained. Teammates can continue using `main:app`; spatial loading will show an explicit unavailable message when the extension is absent. `FASTAPI_URL` keeps its existing meaning. No credentials are needed for NASA POWER anonymous grids or point-series retrieval. SI may use its existing optional credentials/fallback; this addition does not read or transfer secrets.

The baseline imports EODAG unconditionally but omits it from `backend/requirements.txt`. The additive requirements declare this startup dependency; no provider is mocked or silently bypassed. Protected providers still require their own credentials and scientific/source checks. Existing source contains an apparent credential in `backend/providers/copernicus_cds.py`; its owner should remove it and rotate the value. This addition does not copy the value into any new file.

## User workflow

1. Open `/workspace/visualize` for charts or `/workspace/globe` for the 3D view. There are no automatic catalog or extraction calls on an empty page.
2. Search for datasets using the same discovery endpoint used by SI, or use products already selected in SI. Suggestions may prefill coordinates and dates, but observations load only on an explicit action.
3. Confirm a location, date range and supported cadence. This retrieval uses the existing point extraction API. A region name does not imply a polygon average. The geocoder returns its top match; users review the filled coordinates before retrieval.
4. Load datasets, then select a second location and load again to compare. Keep up to six in-memory series. Native navigation between the two visualization routes preserves loaded series; a full refresh restores a supplied `jobId` through the real backend job endpoint.
5. Choose time series, area, observation bars, seasonal profile, monthly anomaly heatmap, distribution or paired scatter. Use the observation table to inspect precise values/QA, and export source/display values with metadata.
6. On the globe, follow the Dataset -> Spatial extent -> Date -> Load layer flow. Extent presets include the entire globe, a documented Europe bounding box `[34, 72, -25, 45]` (south, north, west, east — a rectangle, not a continental polygon), smaller region presets and an ordered custom box. Native-sized extents load through `/field`; the globe and larger extents load through `/overview`, which may return documented coarser output cells. Inspect cells, focus the camera, adjust layer visibility/opacity or switch to a 2D fallback.
7. Scientific analysis is an explicit separate action on the selected immutable source job. The original scientific interface is preserved. No analysis is triggered by loading a chart, selecting a method, or opening a job link.

## Modules and boundaries

| Location | Responsibility |
| --- | --- |
| `src/features/visualization/model.ts` | Runtime result validation; dates/gaps; descriptive transforms and colour scales |
| `store.tsx` | Bounded comparison state, separate from SI state |
| `Workspace.tsx` | Explicit discovery/extraction controls, result filters, source inspection and exports |
| `Charts.tsx` | Lazy Apache ECharts renderer, zoom/tooltips, chart selection and accessible wrapper |
| `Globe.tsx`, `globeMath.ts` | Globe shell: renderer mount, geographic registration, coordinate picking, camera controls, legend and 2D fallback |
| `cesium/engine.ts` | Lazy CesiumJS viewer: GIBS WMTS basemap, local-image fallback, field raster layer, markers, cell/extent outlines, framing and lifecycle |
| `extents.ts`, `fieldRaster.ts` | Pure extent presets/routing and numeric-field-to-RGBA rasterization; unit-tested without WebGL |
| `ScientificCaseFile.tsx` | Byte-identical relocation of the original scientific screen |
| `visualization.css` | Styles scoped to this workspace; no global theme rewrite |
| `backend/visualization/` | Independent bounded NASA field reader, spatial-store overview reader, routes and offline tests |
| `backend/visualization_app.py` | Optional additive entry to the unchanged backend app |
| `src/app/api/v1/visualization/field/route.ts`, `.../overview/route.ts` | Fixed backend proxies for the new routes; no generic remote URL input |
| `public/visualization/` | Authentic local decorative NASA basemap and original attribution/hash manifest |
| `public/cesium/` (gitignored) | Cesium workers/assets/widgets copied from the pinned npm package by `scripts/copy-cesium-assets.mjs` on install |

The only existing backend paths changed by this work should be **none**. Frontend integration changes are the two visualization pages, the workspace provider registration and accurate active-result labels in the existing header, plus package/lock/test configuration. The original scientific screen is moved without changing its algorithms or controls. Existing cube/Case Board behavior elsewhere is outside this task; the new globe does not consume their constant-generated snapshot path.

## Genuine grid sources

NASA recommends its public analysis-ready Zarr datastore for direct access: [POWER AWS documentation](https://power.larc.nasa.gov/docs/services/aws/).

| Layer | Fixed store | Field / native units | Time standard |
| --- | --- | --- | --- |
| V01 | `https://nasa-power.s3.us-west-2.amazonaws.com/merra2/temporal/power_merra2_monthly_temporal_utc.zarr` | `T2M`, C; display Celsius, no Kelvin subtraction | UTC |
| V12 | `https://nasa-power.s3.us-west-2.amazonaws.com/syn1deg/temporal/power_syn1deg_monthly_temporal_lst.zarr` | `ALLSKY_SFC_SW_DWN`, W m-2; display W/m2 | LST |
| V01 overview | `https://nasa-power.s3.us-west-2.amazonaws.com/merra2/spatial/power_merra2_monthly_spatial_utc.zarr` | `T2M`, C; chunks `[1,361,576]`, one ~223 KB chunk per month | UTC |
| V12 overview | `https://nasa-power.s3.us-west-2.amazonaws.com/syn1deg/spatial/power_syn1deg_monthly_spatial_lst.zarr` | `ALLSKY_SFC_SW_DWN`, W m-2; chunks `[1,180,360]` | LST |

`GET /api/v1/visualization/overview` accepts `variable`, `month`, `lat_min`, `lat_max`, `lon_min`, `lon_max` and returns `visualization.overview.v1`. It reads the spatially organised stores above, so a global month costs one source chunk rather than hundreds of full-temporal chunks. When the requested extent fits the native cell budget it returns native cells unchanged (`aggregation: "none"`); otherwise it aggregates to a bounded output grid (max 25,000 cells) with integer source-cell factors. Aggregation is a **cosine(latitude)-weighted mean over valid source cells**; missing/fill cells never contribute and never become zero — cells with zero valid coverage stay null. The manifest declares source vs output resolution, aggregation factors and valid-cell coverage per output cell. Immutable monthly artifacts are cached under the ignored runtime cache with SHA-256 hashes, source URL/version, retrieval time and transformation metadata; repeat requests are served from the artifact without re-reading the store. The same validation, cache, provenance and failure rules as `/field` apply; invalid variables, months, coordinates or unordered extents return HTTP 422.

These bindings are checked against actual source headers, dimensions, codecs and coordinates at read time. They are raw model/reanalysis data, not admitted global trend layers. Store versions and available months are read from the source, not hardcoded as verified releases. A small live January 2024 Sri Lanka-area read returned genuine values for both bindings. That verifies transport/decoding for those samples, not scientific trend validity.

`GET /api/v1/visualization/field` accepts `variable`, `month`, `lat_min`, `lat_max`, `lon_min`, `lon_max`. The result declares `visualization.field.v1`, ascending native latitude/longitude centres, native steps, row-major values, units, time standard, source URL/version, source retrieval time, per-object SHA-256 hashes and cache/stale flags. The globe paints native cell footprints with a raw-value scale. Missing cells remain transparent; uncovered areas retain decorative imagery. There is no interpolation from sparse points to a global surface.

Limits: 4,000 selected cells, 32 source chunks, 64 MiB total decoded chunk budget, 4 MiB per downloaded object, two simultaneous server-side loads, and a dedicated 512 MiB raw-object cache. Requests do not cross the dateline; use separate boxes. Cache freshness is 24 hours; an integrity-checked stale object is used only after upstream failure and is disclosed. Corrupt cache objects are rejected. Cache quota exhaustion is an explicit failure rather than silently deleting source evidence; manage only the dedicated ignored `artifacts/runtime/power/` cache. `IRIS_VISUALIZATION_DATA_DIR` can select its parent artifacts directory. Source metadata changes or invalid dimensions/units fail rather than being guessed.

## Cesium tiled basemap

The 3D globe renderer is **CesiumJS 1.147.0** (pinned), replacing the earlier single-image Three.js sphere. The viewer is configured with **no Cesium ion token**: `baseLayer`, geocoder, home-button terrain sampling, scene-mode picking, animation/timeline widgets and all default external services are disabled; terrain is a plain `EllipsoidTerrainProvider` — no remote terrain requests. Runtime workers/assets/widgets are copied from the pinned npm package into the gitignored `public/cesium/` by `scripts/copy-cesium-assets.mjs` (`postinstall`) and served same-origin; the Cesium bundle itself is loaded at runtime from `/cesium/index.js` (`webpackIgnore`), so it never enters the Next.js chunk graph.

The primary basemap is **NASA GIBS WMTS**, layer `BlueMarble_ShadedRelief_Bathymetry`, tile matrix set `GoogleMapsCompatible_Level8` (EPSG:3857 Web Mercator, 256 px tiles, levels 0-8, ~500 m/px at the equator at maximum level — no street-level imagery is implied). The EPSG:4326 `500m` set advertised in capabilities uses irregular, non-power-of-2 matrices incompatible with the quadtree tiling scheme, which is why the verified Web Mercator set is used instead. Tile traffic is bounded by Cesium's request scheduler and cache; parent tiles stay visible while children load.

Failure handling is explicit: cancelled tile requests are not counted as failures, but decode/network errors beyond a threshold degrade the basemap to the bundled local NASA image with a `tiles-degraded`/`local` status and a retry control that restores tiled imagery. NASA EOSDIS GIBS and local-image credits are always labelled together with the resolution note. The accessible 2D equirectangular map remains for no-WebGL clients, and the viewer is disposed and recreated per mount so repeated navigation does not leak resources.

## Scientific presentation rules

- Source timestamps, product identities, units, flags and provenance remain attached to each series. Unsupported, partial, duplicate-date or non-finite payloads are rejected. No prototype snapshot is used as replacement data.
- Valid observations are displayed by default. Users may include provider-flagged values explicitly. Missing/interpolated rows are not substituted; the table and exports retain source values separately from filtered display values.
- Lines break on explicit missing/QA-excluded values and omitted cadence intervals. Display breaks are null separators, not fabricated observations. Time-series axes preserve elapsed calendar time.
- Raw series with differing units/cadences are not silently overlaid as comparable magnitudes. Explicit z-score standardization uses each selected series' mean and sample standard deviation and is labelled unitless. Constant series standardize to zero; this does not imply significance.
- Scatter pairs only exactly aligned timestamps from matching cadences; it neither interpolates pairs nor implies causality. Returned period labels do not prove identical physical temporal support across providers. UTC chart positioning does not relabel the source's native time standard.
- Seasonal profile is the arithmetic mean of available observations within each calendar month of the selected display window. Heatmap cells are observed monthly means minus the corresponding calendar-month selected-period mean. They are descriptive departures, not an independently certified climate anomaly product or a long-term climate normal.
- First-to-last change is labelled an endpoint difference. No new slope, p-value, significance mask, confidence percentage, forecast or trend validation is fabricated by these visualization modules. Existing backend statistical methods are outside this change's scientific review.
- Globe markers use series identity colours; their exact selected-time values are listed separately. Field colours use fixed per-variable physical scales (V01: -55..45 °C, V12: 0..450 W/m2) so colour does not drift between months or extents. A separately loaded field's month remains explicit during observation playback.
- Basemap pixels are decorative NASA imagery. They supply no measured values, and picking reads the numerical field payload, never basemap colours. A sharp tiled basemap does not imply the scientific grid has finer resolution; source and output resolution are always labelled. Camera motion is user-controlled; there is no mandatory automatic rotation. Canvas alternatives include a keyboard-accessible table, coordinate inputs, camera buttons and an explicit 2D map.
- Overview aggregation never creates detail: output cells are labelled means of bounded integer source-cell factors, coverage of valid source cells is reported, and empty output cells remain transparent nulls.

## Verification

```powershell
npx --yes pnpm@12.18.0 test:visualization
npx --yes pnpm@12.18.0 exec tsc --noEmit
npx --yes pnpm@12.18.0 build
npx --yes pnpm@12.18.0 exec playwright install chromium
npx --yes pnpm@12.18.0 test:visualization:browser
cd backend
.venv/Scripts/python.exe -m pytest visualization/tests tests -q
```

The 35 pure frontend tests use hand-computed descriptive references, geographic round trips, extent routing, overview parsing and field-to-raster checks. The 46 additive backend tests use tiny, explicitly synthetic Zarr transport fixtures for codec/order/QA/cache/source-failure checks plus overview aggregation, artifact caching and input validation (HTTP 422 cases). The ordinary browser journeys cover explicit loading, selections/comparisons, chart views, job restoration, exports, WebGL/2D/mobile behavior, errors and stale-response cancellation; additional Cesium specs cover matrix-level refinement on zoom, the no-ion/no-token request surface, tile-failure degradation and retry, the Europe overview route, viewer cleanup on repeated navigation, native field loading with stale clearing, and provider failure without fabricated data. Browser fixtures are intercepted only in tests and never imported by application code. Source transport tests, passing UI checks and existing statistical tests do not by themselves certify Earth-science inference.

Known release work remains: independently reviewed statistical outputs, wider product admission, true polygon-area aggregation, global trend-cube production/FDR, full accessibility/performance acceptance and exhaustive provider support. The current browser/server bounds are explicit engineering limits, not claims that all approved global-science requirements are complete.

## Technology references

- [Apache ECharts modular import](https://echarts.apache.org/handbook/en/basics/import/): lazy chart rendering, time zoom, linked interaction and chart types.
- [CesiumJS](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/): `Viewer`, `WebMapTileServiceImageryProvider`, `SingleTileImageryProvider`, `WebMercatorTilingScheme`, `ImageryLayer` and request scheduling per the pinned 1.147.0 build.
- [NASA GIBS WMTS](https://nasa-gibs.github.io/gibs-api-docs/): `BlueMarble_ShadedRelief_Bathymetry` on `GoogleMapsCompatible_Level8` (EPSG:3857), levels 0-8.
- [EODAG installation](https://eodag.readthedocs.io/en/stable/getting_started_guide/install.html): the baseline's required import dependency, not a new visualization provider.

`echarts` (Apache-2.0), `cesium` (Apache-2.0), existing API contracts and Navida design tokens are reused. The now-unused `three` dependency is retained pinned pending coordination with `viz_2d_maps`, which touches adjacent workspace files. Next.js stays on the baseline's 15.x major. The MapLibre style-spec transitive dependency is constrained to compatible 26.6.0 after the baseline's 26.7.0 lock entry failed the existing minimum-release-age policy. That policy and strict peer checks remain enabled.

The full original-plus-extension backend test run passed 46 tests. Both spatial bindings returned HTTP 200 through Next and FastAPI; the shared live discovery API returned NASA POWER products. The optional Python lock is compiled universally for Python 3.13 and preserves the unchanged baseline dependency declarations while adding the missing EODAG import dependency.

An additional opt-in live browser journey is available with `IRIS_VISUALIZATION_LIVE=1`. It exercises real shared discovery, a 24-month NASA POWER point series, chart rendering and both native grid layers through the actual frontend/backend. A second live spec (`verify-live.spec.ts`) drives the Cesium globe end to end against the real backend and NASA spatial store: progressive GIBS imagery, global overview, Europe subset, cell picking and mobile sizing, while capturing screenshots and measured timings into ignored `artifacts/visualization/`. Ordinary checks skip these network-dependent tests. Source arrays, durable runtime jobs, screenshots and source cache files are ignored and are not part of the committed fixtures.

Last live run on this machine measured: engine ready ~1.7-4.7 s, 5-12 basemap tiles (~68-86 KB, levels 0-2) at world view, ~26 MB JS heap; global overview ~3.4-10.2 s cold (one spatial chunk + aggregation, cached repeats ~0.5 s), Europe overview ~5.3-6.4 s cold (~18 ms cached) at native 0.5° x 0.625° resolution, 8,701 cells; rendered frame rate 60 fps unloaded (8.4 fps in one run while the machine was under parallel load). These are machine-specific observations, not performance guarantees.

The full opt-in live browser journey passed: real catalog selection, a 24-month T2M point result, interactive chart and both spatial layers. Live-test durable results were preserved only in ignored artifacts, and the baseline tracked durable store was restored after testing. The baseline currently tracks that runtime JSON; normal future usage may modify it again. Do not commit generated observation stores as source changes.

Remote coordination note: `origin/viz_2d_maps` also modifies `src/app/workspace/layout.tsx` and the separate data-selection/2D-map files. This branch leaves that work intact and changes only the small provider/header integration in the shared layout. Review those shared-file edits together before merging; no teammate branch is automatically merged or overwritten.
