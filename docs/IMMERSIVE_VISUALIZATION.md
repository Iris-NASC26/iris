# Immersive trend visualization

The approved B concept is the default **Landscape** experience. A's readable timeline, heatmap, evidence summary and location interval comparison are available alongside it and through the **Evidence** preset. Concept C is excluded. Plot & Visualize contains neither Outlook nor a geographic globe; those remain on Data Analysis and Living Globe respectively.

## Use

1. Continue from SI → Data Selection → Data Analysis. The extracted preview is shared automatically. After explicitly running chosen analysis methods, select **Explore in Visualization Studio** (or use Plot & Visualize in the sidebar).
2. Orbit/zoom the seasonal landscape, choose surface/columns/heatmap, and select observed values, calendar-month departures or standardized values. Scene settings control perspective/orthographic projection, vertical emphasis, mesh and camera reset. No automatic spin is used. Colour and height represent the same quantity, with numeric legends and source/display units.
3. Click a month/point to select the exact source timestamp across landscape, heatmap, timeline, inspector and table. Timeline brush zoom is local; Source & selection has shared date/QA display filters. Neither action reruns inference. Choose line, area, bars, distribution, seasonal profile or exact-pair scatter for complementary questions.
4. Use **Evidence** for timeline, heatmap, rate intervals and scientific context. Each compared location needs a separately completed analysis. Dock, resize, maximize, close/reopen panels or use focus mode. Mobile uses one selected panel at a time. Midnight/Daylight affects only this studio.
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
| `studio/display.tsx` | Validated presentation preferences and local chart theme |
| `adapters/analysisBinding.ts` | Immutable source identity, analysis result/settings validation and requested-method selectors |
| `store.tsx` | Up to six loaded series and six completed in-memory analysis bindings shared across workspace navigation |

Data Analysis publishes only non-aborted, source-matched extraction-backed results. A new run/settings change invalidates that job's previous result. Switching to a different job cannot reuse another job's binding. Source and analysis SHA-256 hashes are both retained; they hash different artifacts and need not be equal. In-memory analyses do not survive a full refresh; the studio then clearly asks for analysis again. Persisted layout/display preferences contain no observations, analysis payloads or secrets.

## Reliability and dependencies

- Existing ECharts 6 renders the 2D views. Pinned `echarts-gl@2.1.0` is loaded only when a populated 3D panel needs it; it declares ECharts 5/6 compatibility. No overlapping chart engine or CDN runtime is added. WebGL absence, context loss or renderer failure switches to the equivalent heatmap; the observation table/exports remain available. The probe context is released immediately and device pixel ratio is capped at 2.
- The published ECharts GL package carries a **BSD-3-Clause LICENSE** (npm metadata says MIT). Its full packaged notice is preserved in [licenses/echarts-gl-2.1.0-BSD-3-Clause.txt](licenses/echarts-gl-2.1.0-BSD-3-Clause.txt). Upstream: https://github.com/ecomfe/echarts-gl.
- Layout preferences are version 3 and safely discard unsupported arrangements, including removed globe/Outlook panels. Display preferences use a separate validated v1 key. Storage denial is nonfatal; SSR never accesses `window`.
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
