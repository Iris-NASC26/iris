# Immersive trend visualization

The approved B concept is the default **Landscape** experience. A's readable timeline, heatmap, evidence summary and location interval comparison are available alongside it and through the remaining tabs. Concept C is excluded. Plot & Visualize contains neither Outlook nor a geographic globe; those remain on Data Analysis and Living Globe respectively.

## Use

1. Continue from SI → Data Selection → Data Analysis. The extracted preview is shared automatically. After explicitly running chosen analysis methods, select **Explore in Visualization Studio** (or use Plot & Visualize in the sidebar).
2. **Time series** is in the top tab group alongside Seasonal landscape. The studio and all tab states follow the app light/dark toggle, ignoring the removed environment control's old theme preference. Layout v5 migrates older saved arrangements so the time series no longer opens in a separate lower group.

   Orbit/zoom the seasonal landscape, choose surface/columns/heatmap, and select observed values, calendar-month departures or standardized values. Scene settings control perspective/orthographic projection, vertical emphasis, mesh and camera reset. No automatic spin is used. Colour and height represent the same quantity, with numeric legends and source/display units.
3. **Play observations** steps through the retrieved timestamps every 650 ms, loops at the end, and highlights the selected source observation across views. Pause retains the current selection. Missing/excluded values remain unavailable; playback does not generate predictions. Click a month/point to select the exact source timestamp across landscape, heatmap, timeline, inspector and table. Timeline brush zoom is local; Source & selection has shared date/QA display filters. Neither action reruns inference. Choose line, area, bars, distribution, seasonal profile or exact-pair scatter for complementary questions.
4. Use **Trend evidence** and **Trend intervals** for scientific context and uncertainty. Each compared location needs a separately completed analysis. Views remain dockable/resizable and cannot be closed accidentally. Mobile uses one selected view at a time. The toolbar contains data controls and CSV/JSON exports; environment, preset, panel reopening, maximize, focus, workspace reset and the duplicate scientific-analysis shortcut have been removed. The Compare and Observations tabs are removed; precise source/display values and QA remain available in exports, with scientific analysis accessible from the main navigation.
5. **Data controls** opens the optional acquisition drawer, initially collapsed. Existing job links restore an authentic backend preview after reload. Loading observations never automatically runs statistical tests.

## Scientific boundaries

- The 3D landscape is a **time-by-calendar-month** view of the selected series, not a geographic surface or a global trend map. A point sample named “Sri Lanka” remains a point sample. Spatial support is shown alongside the location.
- It requires Monthly cadence, unique calendar cells and at most 150 displayed years. Other cadences remain available in the timeline/table without silent monthly aggregation.
- Source missing values and excluded QA values stay absent. Complete neighbouring month/year quads are partitioned into rectangular surface patches; no triangle bridges a missing cell/year. Isolated observations remain visible as points. Surface shading between adjacent observed values is presentation interpolation, not additional observations. Columns/heatmap avoid the surface interpolation. More than 100 fragmented patches uses the 2D view with a reason.
- Calendar-month departures subtract the same calendar month's available-value mean within the visible record. This is a descriptive baseline, **not** a fixed climate normal, backend STL output or a trend estimate. Standardization uses the visible mean and sample standard deviation; constant/insufficient records explicitly refuse this transform. Transform/filter changes change the display baseline and colour domain; these auto-scaled views must not be read as fixed-scale cross-record comparisons.
- No inferential calculations or forecasts were added. Rates, 95% intervals and p-values come from a matching completed backend analysis and only from requested methods. A Sen slope alone never implies significance. Hamed–Rao MK is preferred for the summary when requested, then Seasonal Kendall, then the OLS t-test; α = 0.05 is labelled. No multiple-testing/family significance claim is made.
- Submitted OLS/Sen fitted lines are shown only with exact-timestamp backend **analysis-adjusted** observations. They are not overlaid on an unadjusted seasonal series. Missing matches remain gaps. Brush/date/QA changes do not refit or retest; original analysis years and seasonal treatment stay visible.
- The interval comparison includes only matching source product, variable, units, exact extraction dates, cadence, temporal/spatial reduction, spatial semantics and actual seasonal treatment. Different locations may share a support type. Unanalysed/incompatible locations are omitted and counted, never assigned zero estimates. No pooled or regional significance inference is implied. Sen's rank interval is not itself an autocorrelation correction.
- Rendering tests establish correct presentation and source binding; they do not independently validate the existing scientific engine or causal interpretation.

## Modules

| Module | Responsibility |
| --- | --- |
| `landscape/model.ts` | Pure monthly-cell eligibility, bounded transforms, gap-safe surface patches and numeric domains |
| `landscape/LandscapeChart.tsx` | Client-only lazy ECharts GL lifecycle, resize/disposal, camera, source-point selection and context-loss fallback |
| `studio/LandscapePanel.tsx` | Scene controls, linked heatmap, explicit unavailable/unsupported states |
| `studio/EvidencePanel.tsx` | Source-bound evidence and compatible-location confidence interval display |
| `studio/display.tsx` | Validated presentation preferences and app-theme-aware chart colours |
| `adapters/analysisBinding.ts` | Immutable source identity, analysis result/settings validation and requested-method selectors |
| `store.tsx` | Up to six loaded series and six completed in-memory analysis bindings shared across workspace navigation |
| `presentation/model.ts` | Pure source-preserving seasonal-orbit/time-track geometry, real-time spacing, gap detection and descriptive monthly summaries |
| `presentation/RecordScene.tsx` | Lazy Three.js renderer, orbit/pan/zoom, exact source picking, year emphasis, resize/disposal and 2D fallback notification |
| `presentation/SeasonalCycle.tsx` | Seasonal orbit, monthly profile with observed range, year emphasis and year-by-month departures |
| `presentation/TimeTrack.tsx` | Optional 3D timeline of the primary series with labelled time/value axes and full 2D fallback |
| `presentation/ObservationNavigator.tsx` | Keyboard-accessible source timestamp scrubber with exact value, original units and provider QA |

Data Analysis publishes only non-aborted, source-matched extraction-backed results. A new run/settings change invalidates that job's previous result. Switching to a different job cannot reuse another job's binding. Source and analysis SHA-256 hashes are both retained; they hash different artifacts and need not be equal. In-memory analyses do not survive a full refresh; the studio then clearly asks for analysis again. Persisted layout/display preferences contain no observations, analysis payloads or secrets.

## Reliability and dependencies

- Existing ECharts 6 renders the 2D views. Pinned `echarts-gl@2.1.0` is loaded only when a populated 3D panel needs it; it declares ECharts 5/6 compatibility. No overlapping chart engine or CDN runtime is added. WebGL absence, context loss or renderer failure switches to the equivalent heatmap; data exports remain available. The probe context is released immediately and device pixel ratio is capped at 2.
- The published ECharts GL package carries a **BSD-3-Clause LICENSE** (npm metadata says MIT). Its full packaged notice is preserved in [licenses/echarts-gl-2.1.0-BSD-3-Clause.txt](licenses/echarts-gl-2.1.0-BSD-3-Clause.txt). Upstream: https://github.com/ecomfe/echarts-gl.
- Layout preferences are version 5 and safely discard unsupported/incomplete arrangements, including removed globe, Outlook, Compare and Observations panels. Legacy hidden/focus state cannot hide the remaining views or data controls. Display preferences use a separate validated v1 key. Storage denial is nonfatal; SSR never accesses `window`.
- There are no backend/provider changes, new credentials or synthetic production observations in this task. Test fixtures are explicitly synthetic and restricted to `tests/`.

## Verification

```powershell
npx --yes pnpm@12.18.0 test:visualization
npx tsc --noEmit
npx --yes pnpm@12.18.0 build
npx playwright test -c playwright.visualization.config.ts immersive.spec.ts studio.spec.ts workspace.spec.ts
```

Pure tests use hand-computable references for departures/sample standardization and inspect surface patch membership around absent months/years. Binding tests reject wrong identities, submitted settings, invalid probabilities/intervals and stale source keys. Browser tests exercise real WebGL rendering, 2D denial fallback, scene controls, mobile sizing, legacy layout recovery and the Data Analysis → Visualize handoff without duplicate analysis requests. Browser transport fixtures never establish NASA authenticity or scientific validity.

Verification on 2026-11-15: **80 unit tests passed**, TypeScript checking and the production build passed. The full production browser run had 32 passed / 3 skipped; two skips were opt-in live-provider tests and one was an existing graphics-capability gate. The graphics-gated globe degradation/recovery test then passed in isolation, giving **33 distinct browser checks verified**. Manual rendering through the actual backend also used the existing NASA POWER GWETROOT job `job-6cc93cdfef` (2015–2025, 132 monthly rows, 127 usable and five absent/excluded cells). Surface and column screenshots were inspected; no client exceptions were recorded. This source/rendering check is not an independent scientific validation of the backend trend algorithms.

UI cleanup verification: 80 unit checks and 12 relevant browser checks passed, together with TypeScript checking and the production build. Browser coverage includes the simplified toolbar, removed desktop/mobile tabs, prevention of accidental tab closure, legacy layout recovery, exports and the Data Analysis handoff. The updated workspace was also inspected using the existing NASA POWER record described above.

Tab/theme/playback refinement: Time series shares the top main tab group; v5 resets older lower-pane arrangements. The app theme controls the studio and all Dockview tab states while legacy display theme settings are ignored. Playback publishes its timestamp to the shared selection. Verification passed: 80 unit checks, 14 relevant browser checks, TypeScript and the production build, including light/dark switching and playback through a missing observation.

## Seasonal cycles and time-series refinement

**Seasonal cycles** now opens with an interactive **3D Seasonal orbit**. Calendar month determines angle, calendar year determines height, and radius is an affine mapping of the labelled observed value range. Signed values retain their sign in the source inspector and labelled scale; radius is never interpreted as an absolute physical distance. Colour follows earlier to later years. Year emphasis dims other years without removing their observations. Drag to orbit, scroll to zoom, right-drag to pan, and click a source point to publish its exact timestamp. Keyboard users can inspect the same observations with previous/next controls and a labelled range input.

The **Seasonal profile** overlays individual years, the selected-period calendar-month mean and an observed minimum-to-maximum envelope. These are descriptive summaries of available observations, not confidence intervals, a fixed climate normal, significance evidence or forecasts. Missing monthly cells remain gaps and counts reflect available years. **Year-by-month** retains the existing calendar-month departure heatmap. The seasonal views require unique Monthly observations and at most 150 displayed calendar years; unsupported cadences or duplicate months show a reason rather than silently averaging values. Paths stay open at missing intervals and year boundaries: December is never joined to January within the same year.

**Time series** retains line, area, bars and distribution views with crosshair inspection, gradient area fill, selected-point emphasis and a brush navigator. Linked observation selections preserve the local 2D zoom window; changing source, display dates, chart type or standardization resets it. The optional **3D Track** maps actual elapsed UTC time horizontally and observed values vertically. Depth and lighting are presentation only, with no invented third scientific variable. It displays the primary series; the 2D timeline retains compatible-series comparisons. Submitted analysis-adjusted signals and fitted lines remain in their existing 2D scientific view. The summary strip reports only descriptive source mean, range and unavailable-row counts.

The new scenes reuse the existing pinned Three.js dependency and load only when requested. They use instanced geometry, cap device pixel ratio at 2 and redraw on interactions/resize rather than running an animation loop. At most 6,000 usable observations are placed in a scene; the 3D track falls back to the complete 2D timeline above that limit without downsampling. WebGL denial, context loss or renderer failure also presents the corresponding 2D view. Camera interaction preserves data coordinates; switching theme rebuilds scene styling. Observations, backend calculations, provider integration and credentials are unchanged.

Verification includes hand-computable signed-value coordinates, real UTC spacing, year boundaries, absent and explicitly missing months, constants, invalid dates, duplicate cells, size limits and monthly descriptive summaries. Browser checks cover source-linked selection, keyboard inspection of missing values, year emphasis, light/dark rendering, all seasonal views, 3D time-series switching, zoom preservation, full 2D fallback and mobile width. These checks validate presentation; they do not independently validate backend statistical inference.

Refinement verification on 2026-11-15: **105 unit checks and 20 distinct browser checks passed**, together with TypeScript checking and the production build. Browser coverage includes genuine graphics-context loss as well as WebGL denial. Visual QA used 312 actual NASA POWER `T2M` monthly values for the Colombo grid sample, January 2000 through December 2025, from the [UTC monthly API response](https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M&community=AG&latitude=6.9355&longitude=79.8487&start=2000&end=2025&format=JSON&time-standard=UTC). The response's annual month-13 entries were excluded. A local browser-only transport adapter preserved its values, units, missing sentinel and source digest; it did not create a production extraction job or analysis result. Source responses and inspected screenshots are retained under ignored `artifacts/validation/record-scenes/`; test-only synthetic payloads remain separate.
