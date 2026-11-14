# Visualization workspace

The current Plot & Visualize experience uses the approved immersive Landscape design, with linked 2D views and trend evidence. See [IMMERSIVE_VISUALIZATION.md](IMMERSIVE_VISUALIZATION.md) for its controls, Data Analysis handoff, scientific boundaries and verification. The acquisition drawer starts collapsed and layout preferences use v5. The toolbar has data controls and exports; Compare and Observations tabs and workspace-management controls have been removed.

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

1. Open `/workspace/visualize` for charts or `/workspace/globe` for spatial layers. The studio has no globe panel, including in mobile and restored layouts. Living Globe has no point-discovery/extraction drawer. There are no automatic catalog or extraction calls on an empty page.
2. Search for datasets using the same discovery endpoint used by SI, or use products already selected in SI. Suggestions may prefill coordinates and dates, but observations load only on an explicit action.
3. Confirm a location, date range and supported cadence. This retrieval uses the existing point extraction API. A region name does not imply a polygon average. The geocoder returns its top match; users review the filled coordinates before retrieval.
4. Load datasets, then select a second location and load again to compare. Keep up to six in-memory series. Native navigation between the two visualization routes preserves loaded series; a full refresh restores a supplied `jobId` through the real backend job endpoint.
5. Choose time series, area, observation bars, seasonal profile, monthly anomaly heatmap, distribution or paired scatter. Export precise source/display values, QA and metadata through CSV/JSON.
6. On the globe, follow the Dataset -> Spatial extent -> Date -> Load layer flow. Extent presets include the entire globe, a documented Europe bounding box `[34, 72, -25, 45]` (south, north, west, east — a rectangle, not a continental polygon), smaller region presets, an ordered custom box, and a drag-drawn box on the 2D map. Native-sized extents load through `/field`; the globe and larger extents load through `/overview`, which may return documented coarser output cells. Inspect cells in the right-hand inspector, focus the camera, restyle the field, reorder layers or switch to a 2D fallback.
6b. From the landing page, the illustrative COBE globe's study-location markers open `/workspace/globe` with `?place&lat&lon`. These set the location used by “Use box around selected location” without fetching observations. Point time series are requested separately in the studio.
7. Scientific analysis is an explicit separate action on the selected immutable source job. The original scientific interface is preserved. No analysis is triggered by loading a chart, selecting a method, or opening a job link.

## Spatial variable catalogue

`shared/spatial-variables.json` is the allowlist shared by the TypeScript UI/validators and Python readers. The backend still verifies source units, dimensions, time standard and declared valid ranges at runtime; it never derives fields from point samples. The nine added fields were checked in NASA POWER's temporal and spatial `.zmetadata` on 2026-11-15.

| ID | NASA field | Source units | Meaning |
| --- | --- | --- | --- |
| V01 | T2M | C | Monthly mean air temperature at 2 m |
| TS | TS | C | Monthly mean Earth skin temperature |
| T2MDEW | T2MDEW | C | Monthly mean dew/frost point at 2 m |
| PRECTOTCORR | PRECTOTCORR | mm/day | Monthly mean daily corrected precipitation rate, not a monthly total |
| SNODP | SNODP | cm | Monthly mean model snow depth, not snowfall or optical snow-cover fraction |
| GWETTOP | GWETTOP | 1 | Dimensionless surface soil-wetness index |
| GWETROOT | GWETROOT | 1 | Dimensionless root-zone wetness index |
| RH2M | RH2M | % | Monthly mean relative humidity at 2 m |
| WS10M | WS10M | m/s | Monthly mean scalar wind speed at 10 m; no vector direction |
| PS | PS | hPa | Monthly mean surface pressure, not sea-level pressure |
| V12 | ALLSKY_SFC_SW_DWN | W m-2 | Monthly mean downward shortwave irradiance |

MERRA-2 fields use the existing UTC monthly temporal/native and spatial/overview stores at 0.5° × 0.625°. Sunlight retains the existing CERES SYN1deg LST stores at 1° × 1°. These are different source/time supports; no new product is spliced into a series. Source metadata: [MERRA-2 temporal](https://nasa-power.s3.us-west-2.amazonaws.com/merra2/temporal/power_merra2_monthly_temporal_utc.zarr/.zmetadata), [MERRA-2 spatial](https://nasa-power.s3.us-west-2.amazonaws.com/merra2/spatial/power_merra2_monthly_spatial_utc.zarr/.zmetadata), and [NASA POWER direct-access documentation](https://power.larc.nasa.gov/docs/services/aws/).

All listed variables support both bounded native fields and whole-globe/Europe overviews. Missing source cells remain transparent, including undefined land-variable cells. Changing variables clears the old layer, stops playback/linkage and resets variable-specific display styling. Colour ranges are presentation choices (values beyond them clamp to endpoint colours), not NASA validity limits or inferred trends. Snow depth has a blue–cyan–white palette. No extra credentials are required for these public stores.

The checked-in `shared/` catalogue must ship alongside `backend/` when packaging the Python service. Existing V01/V12 IDs and response schema versions remain compatible. Studio layout preferences use v5; older arrangements containing removed panels recover to the default Landscape arrangement.

Live source verification on 2026-11-15 read January 2024 for all 11 variables at a small native extent (48–49°N, 2–3°E) and for the entire globe. The returned source version was POWER 10.0.0. MERRA-2 global overviews contained 13,104 output cells; the CERES sunlight overview contained 16,200. Snow depth and root-zone wetness retained missing cells (4,474 valid output cells each). A separate request through the running Next/FastAPI overview endpoint confirmed snow depth in cm. These are source/transport checks, not independent validation of climate inference or forecast skill.

The delayed-engine regression check holds back the Cesium module while the user selects snow depth, then verifies the actual north-up raster bytes passed to Cesium against independently calculated snow-palette colours. Engine initialization uses the latest field/style/extent/visibility state, including changes made while loading.

## Modules and boundaries

| Location | Responsibility |
| --- | --- |
| `src/features/visualization/model.ts` | Runtime result validation; dates/gaps; descriptive transforms and colour scales |
| `store.tsx` | Bounded comparison state, separate from SI state |
| `Workspace.tsx` | Explicit discovery/extraction controls, result filters, source inspection and exports |
| `Charts.tsx` | Lazy Apache ECharts renderer, zoom/tooltips, chart selection and accessible wrapper |
| `Globe.tsx`, `globeMath.ts` | Globe shell: renderer mount, geographic registration, coordinate picking, camera controls, legend, 2D fallback and drag-draw extent capture |
| `cesium/engine.ts` | Lazy CesiumJS viewer: GIBS WMTS basemap, local-image fallback, field raster layer, markers, cell/extent outlines, framing and lifecycle |
| `layers.ts`, `styles.ts` | Pure layer order/visibility model and colour-ramp/range model; keyboard reordering; unit-tested without WebGL |
| `extents.ts`, `fieldRaster.ts` | Pure extent presets/routing and numeric-field-to-RGBA rasterization; unit-tested without WebGL |
| `landing/CobeGlobe.tsx` | Illustrative COBE landing globe: lazy `import('cobe')`, anchored study-location links, pause/fallback semantics |
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

## Landing COBE globe

The landing hero embeds a **COBE 2.0.1** globe (`cobe`, MIT) purely as an illustration and navigation aid — it carries no observations, live badges or trend claims and is labelled as such. `cobe` is lazy-imported from `landing/CobeGlobe.tsx`, so it lands in its own async chunks (~19.5 KB combined) and is absent from the landing route's first-load JS; Cesium and ECharts never load on `/`.

Implementation notes that matter: COBE 2.x has **no internal animation loop** — the host drives `update()` per frame, which lets the component fully stop work when `prefers-reduced-motion`, tab-hidden or offscreen. Marker ids are projected to 1 px anchor divs (`anchor-name: --cobe-<id>`) with per-marker visibility flags on `:root`; the six study-location labels are real `<Link>` elements positioned via CSS anchor positioning, so they are keyboard-focusable and clickable only when front-facing (occluded markers get `pointer-events: none`). Without CSS anchor support or WebGL, the same links fall back to a plain list beside a static SVG — equivalent navigation in every environment. Pause state is tracked per-cause (hover / offscreen / hidden) so a late IntersectionObserver callback cannot clobber a hover pause.

## Map-centred workspace layout

The `/workspace/globe` view is arranged as a GeoLibre-inspired investigation surface around the existing Cesium viewer: a top selection bar (variable, extent preset, month, explicit Load, loaded-selection label), a collapsible left layer panel (selection + layer tree + field styling + source/provenance), the map stage, a right contextual inspector, and a bottom spatial timeline with playback. On narrow viewports the panels stack below the map rather than crowding it.

Layers are a pure model in `layers.ts`: `points`, `extent` (requested box outline), `field`, `basemap`, top→bottom. Visibility toggles are real for every layer; ordering is keyboard-operable (↑/↓ buttons) and only the two imagery layers (field, basemap) exchange z-order — overlays always draw above imagery, which the UI states honestly. Opacity applies to field and basemap without re-fetching data.

`styles.ts` provides the field styling model: an Iris sequential ramp plus colour-safe Viridis/Magma and a blue–red diverging option; range modes `fixed` (documented physical scale, identical across months/extents — the default so temporal comparison never silently rescales), `auto` (labelled "fitted to the currently loaded field only") and `custom` bounds. Reset restores the scientific defaults. A diverging ramp is only symmetric around zero when the loaded data actually crosses zero — one-sided data does not acquire an invented zero meaning.

The inspector opens on cell pick (3D pick or 2D click) and reports coordinates, the actual cell footprint, the returned value and units — or an explicit "missing or invalid source value" for null cells rather than a fabricated number — month/time standard, native vs aggregated resolution, source coverage, cache status, and a link into the existing chart analysis. Unsupported months surface the provider error instead of repeating another month's values; each playback step issues one real request and stale responses are aborted/discarded. An opt-in "Sync spatial field to observation month" checkbox links the observation timeline to the spatial field (debounced, off by default so map and chart stay predictable).



- Source timestamps, product identities, units, flags and provenance remain attached to each series. Unsupported, partial, duplicate-date or non-finite payloads are rejected. No prototype snapshot is used as replacement data.
- Valid observations are displayed by default. Users may include provider-flagged values explicitly. Missing/interpolated rows are not substituted; the table and exports retain source values separately from filtered display values.
- Lines break on explicit missing/QA-excluded values and omitted cadence intervals. Display breaks are null separators, not fabricated observations. Time-series axes preserve elapsed calendar time.
- Raw series with differing units/cadences are not silently overlaid as comparable magnitudes. Explicit z-score standardization uses each selected series' mean and sample standard deviation and is labelled unitless. Constant series standardize to zero; this does not imply significance.
- Scatter pairs only exactly aligned timestamps from matching cadences; it neither interpolates pairs nor implies causality. Returned period labels do not prove identical physical temporal support across providers. UTC chart positioning does not relabel the source's native time standard.
- Seasonal profile is the arithmetic mean of available observations within each calendar month of the selected display window. Heatmap cells are observed monthly means minus the corresponding calendar-month selected-period mean. They are descriptive departures, not an independently certified climate anomaly product or a long-term climate normal.
- First-to-last change is labelled an endpoint difference. No new slope, p-value, significance mask, confidence percentage, forecast or trend validation is fabricated by these visualization modules. Existing backend statistical methods are outside this change's scientific review.
- Globe markers use series identity colours; their exact selected-time values are listed separately. Field colours use fixed per-variable physical scales (V01: -55..45 °C, V12: 0..450 W/m2) so colour does not drift between months or extents. A separately loaded field's month remains explicit during observation playback.
- Basemap pixels are decorative NASA imagery. They supply no measured values, and picking reads the numerical field payload, never basemap colours. A sharp tiled basemap does not imply the scientific grid has finer resolution; source and output resolution are always labelled. Camera motion is user-controlled; there is no mandatory automatic rotation. Canvas alternatives include a keyboard-accessible table, coordinate inputs, camera buttons and an explicit 2D map. The landing COBE globe is illustrative navigation, not a scientific layer.
- Field styling changes presentation only. Ramps and ranges recolour the loaded payload in place — no new fetch, no resampling, no smoothing, no upscaled detail. Missing cells stay transparent and inspect as missing rather than reporting zero.
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

The 44 pure frontend tests use hand-computed descriptive references, geographic round trips, extent routing, overview parsing, field-to-raster, layer-ordering and colour-ramp/range checks. The 46 additive backend tests use tiny, explicitly synthetic Zarr transport fixtures for codec/order/QA/cache/source-failure checks plus overview aggregation, artifact caching and input validation (HTTP 422 cases). The ordinary browser journeys cover explicit loading, selections/comparisons, chart views, job restoration, exports, WebGL/2D/mobile behavior, errors and stale-response cancellation; additional Cesium specs cover matrix-level refinement on zoom, the no-ion/no-token request surface, tile-failure degradation and retry, the Europe overview route, viewer cleanup on repeated navigation, native field loading with stale clearing, and provider failure without fabricated data. Newer specs cover the landing COBE globe (marker prefill links, keyboard-equivalent navigation, offscreen/hover pause, reduced motion, no-WebGL fallback links, resize, and the no-Cesium/no-ECharts/no-GIBS request surface on `/`) and the map-centred workspace (layer visibility/keyboard ordering/opacity, labelled range scopes with styling reset, 2D drag-draw extents that stay pending until Load, cell inspection with honest missing values, per-month spatial playback that never recycles values, and opt-in observation→field sync). Browser fixtures are intercepted only in tests and never imported by application code. Source transport tests, passing UI checks and existing statistical tests do not by themselves certify Earth-science inference.

Known release work remains: independently reviewed statistical outputs, wider product admission, true polygon-area aggregation, global trend-cube production/FDR, full accessibility/performance acceptance and exhaustive provider support. The current browser/server bounds are explicit engineering limits, not claims that all approved global-science requirements are complete.

## Technology references

- [Apache ECharts modular import](https://echarts.apache.org/handbook/en/basics/import/): lazy chart rendering, time zoom, linked interaction and chart types.
- [CesiumJS](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/): `Viewer`, `WebMapTileServiceImageryProvider`, `SingleTileImageryProvider`, `WebMercatorTilingScheme`, `ImageryLayer` and request scheduling per the pinned 1.147.0 build.
- [NASA GIBS WMTS](https://nasa-gibs.github.io/gibs-api-docs/): `BlueMarble_ShadedRelief_Bathymetry` on `GoogleMapsCompatible_Level8` (EPSG:3857), levels 0-8.
- [COBE](https://github.com/shuding/cobe): pinned 2.0.1 for the landing illustration only — host-driven `update()` loop, CSS marker anchors and per-marker visibility flags; never used for scientific data.
- [GeoLibre](https://github.com/opengeos/GeoLibre) and [World Monitor](https://www.worldmonitor.app/dashboard): interaction/presentation references for the layer panel, inspector and map-centred layout. Iris implements its own components; neither application's stack or branding is embedded.
- [EODAG installation](https://eodag.readthedocs.io/en/stable/getting_started_guide/install.html): the baseline's required import dependency, not a new visualization provider.

`echarts` (Apache-2.0), `cesium` (Apache-2.0), `cobe` (MIT), existing API contracts and Navida design tokens are reused. The now-unused `three` dependency is retained pinned pending coordination with `viz_2d_maps`, which touches adjacent workspace files. Next.js stays on the baseline's 15.x major. The MapLibre style-spec transitive dependency is constrained to compatible 26.6.0 after the baseline's 26.7.0 lock entry failed the existing minimum-release-age policy. That policy and strict peer checks remain enabled.

The full original-plus-extension backend test run passed 46 tests. Both spatial bindings returned HTTP 200 through Next and FastAPI; the shared live discovery API returned NASA POWER products. The optional Python lock is compiled universally for Python 3.13 and preserves the unchanged baseline dependency declarations while adding the missing EODAG import dependency.

An additional opt-in live browser journey is available with `IRIS_VISUALIZATION_LIVE=1`. It exercises real shared discovery, a 24-month NASA POWER point series, chart rendering and both native grid layers through the actual frontend/backend. A second live spec (`verify-live.spec.ts`) drives the Cesium globe end to end against the real backend and NASA spatial store: progressive GIBS imagery, global overview, Europe subset, cell picking and mobile sizing, while capturing screenshots and measured timings into ignored `artifacts/visualization/`. Ordinary checks skip these network-dependent tests. Source arrays, durable runtime jobs, screenshots and source cache files are ignored and are not part of the committed fixtures.

Last live run on this machine measured: engine ready ~1.7-4.7 s, 5-12 basemap tiles (~68-86 KB, levels 0-2) at world view, ~26 MB JS heap; global overview ~3.4-10.2 s cold (one spatial chunk + aggregation, cached repeats ~0.5 s), Europe overview ~5.3-6.4 s cold (~18 ms cached) at native 0.5° x 0.625° resolution, 8,701 cells; rendered frame rate 60 fps unloaded (8.4 fps in one run while the machine was under parallel load). These are machine-specific observations, not performance guarantees.

The full opt-in live browser journey passed: real catalog selection, a 24-month T2M point result, interactive chart and both spatial layers. Live-test durable results were preserved only in ignored artifacts, and the baseline tracked durable store was restored after testing. The baseline currently tracks that runtime JSON; normal future usage may modify it again. Do not commit generated observation stores as source changes.

Remote coordination note: `origin/viz_2d_maps` also modifies `src/app/workspace/layout.tsx` and the separate data-selection/2D-map files. This branch leaves that work intact and changes only the small provider/header integration in the shared layout. Review those shared-file edits together before merging; no teammate branch is automatically merged or overwritten.

## Iris Visualization Studio (docked panels)

`/workspace/visualize` hosts the immersive Landscape studio, using
`dockview-react@8.8.3` (MIT) for resizable/dockable desktop views. The toolbar
contains Data controls and CSV/JSON exports. Workspace-management controls,
Compare and Observations tabs are removed. Remaining tabs stay available
without close actions or a Reopen control. Data Analysis remains accessible
through the workspace navigation; Outlook stays on that page.

- `studio/presets.ts` defines serialized arrangements and the current panel
  registry. The studio opens the Landscape arrangement; there is no preset picker.
- `studio/layoutPersistence.ts` stores the versioned `iris.studio.layout.v5`
  presentation record. Older, incomplete or removed-panel layouts fall back
  safely to the default. Legacy hidden/focus state is ignored. Observations
  and analysis payloads are never stored in these preferences.
- `studio/panels.tsx` contains time series, seasonal profile/heatmap,
  relationship and source/selection views. `LandscapePanel.tsx` and
  `EvidencePanel.tsx` add the seasonal 3D scene, linked heatmap, scientific
  evidence and trend intervals. Exact values and QA remain available in exports.
- `adapters/analysisBinding.ts` binds completed Data Analysis results to the
  immutable extracted source and submitted settings. Visualization never
  reruns analysis automatically or reuses another source's results.
- The geographic renderer remains exclusive to `/workspace/globe`.
- Charts publish exact-timestamp selections shared across views and the
  source inspector. Missing/excluded observations remain gaps.
- Narrow viewports (up to 900px) use one selected view at a time; the mobile
  selector excludes removed panels. The desktop dock returns on wider screens.

See [IMMERSIVE_VISUALIZATION.md](IMMERSIVE_VISUALIZATION.md) for the complete
rendering, data handoff, scientific-boundary and verification notes.
