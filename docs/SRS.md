# Software Requirements Specification: Earth Trend Detective

**Project:** Earth Trend Detective (working name). 2026 NASA Space Apps Challenge, *Be An Earth System Trend Detective!*
**Document:** SRS v0.3, a short version written for a two-day hackathon. **Status:** Approved baseline reconciled with reviewed TDD decisions; local hosting restored at the team's request on 14 November 2026. Implementation remains subject to explicit approval. **Date:** November 2026.

**Revision history:** v0.2 reconciled lens preview versus regional inference, native MERRA-2 grids, eligible-region variable counts, core versus background Outlook updates, basic P0 fallback, chlorophyll branch labels, linked alpha/FDR thresholds and confirmed product bindings at the team's request. v0.3 replaces the intervening public-hosting choice with **local hosting for now**, as requested on 14 November. DEP-01 and AC-35 now specify local release acceptance; Oracle, Vercel and Supabase are not required. Scientific validation and source-file checks remain gates, not assumed results. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
**Inputs:** [README.md](../README.md) (challenge Details and Resources tabs, video transcript), the pre-hackathon research report, and the team decisions in §1.6.

## Conventions

- **Priority:**
  - **P0**: must ship for the demo (MVP).
  - **P1**: should ship (planned).
  - **P2**: stretch goal.
- **Evidence tags** (used for facts about data, services and rules):
  - **[V]**: verified from a cited source.
  - **[V-live]**: confirmed by a live request.
  - **[P]**: partly verified.
  - **[U]**: unverified; confirm before relying on it.
  - **[H]**: team decision or working hypothesis (a threshold or design choice).
- **Source IDs:** `[S#]` refers to Appendix A.

---

## 1. Project overview

### 1.1 Vision

For students and curious people of any background, Earth Trend Detective is an interactive 3D Earth that answers: *"What is measurably changing here, by how much, and how sure can we be?"* It uses NASA satellite and model records, analysed with transparent statistics that account for known data problems. It also says plainly when the evidence is not there yet.

### 1.2 Problem

The challenge asks for "a tool that can select variables measured by Earth science missions or produced by Earth science models, visualize how they change over time, and determine what is changing, where it is changing, how much it is changing, and if these changes are what scientists call 'significant'" [S1].

Two things make this hard [S1]:

- There are so many variables that choosing which ones indicate change is difficult.
- The same process can push a variable up in one region and down in another.

### 1.3 Audience

| Group | Basis | What they need | Default level |
|---|---|---|---|
| High-school and college students | Challenge [S1] | Guided steps, simple definitions, worked examples | Student |
| Members of the public with some science background | Challenge [S1] | Clear answers with honest caveats | Explorer |
| Members of the public with no science background | Team decision TD-4 | Visual, jargon-free explanations | Explorer |
| Educators | Team decision TD-4 | Ready-made stories, exportable figures | Student |
| Scientists and analysts | Team decision TD-4 | Methods, parameters, provenance, raw data | Scientist |

### 1.4 Product concept: six experiences

- **E1 Living Globe.** A 3D Earth that shows trend layers for each variable.
  - A draggable *Detective Lens* scans whatever area it covers.
  - Also includes a time-lapse and an opposite-trends view.
- **E2 Case Board.** For any place, including the whole world, a ranked scan of many variables at once.
- **E3 Case File.** A deep dive into one variable, with several visualization modes matched to the type of trend.
- **E4 Outlook.** Two projections:
  - an "if the trend continued" projection;
  - a short-term forecast that is only shown when it beats a simple baseline.
  - Optional climate-scenario context.
- **E5 Guided Investigations and Ask the Detective.** Story-mode demos, plus an optional SI assistant that can only suggest variables from the catalog.
- **E6 Evidence and Methods.** A validation lab, provenance, citations and exports.

### 1.5 Design principles

1. **Statistics decide; SI only suggests.** No number shown to the user comes from an SI model.
2. **Uncertainty and caveats stay visible.**
3. **Progressive disclosure.** Three explanation levels: Explorer, Student and Scientist.
4. **Every number can be traced** back to its source data and processing steps.
5. **Beautiful but honest.** Visual encodings never exaggerate, and scales are fixed and documented.
6. **Works offline for the demo.** Live services are a bonus, not a dependency.

### 1.6 Team decisions that shape this SRS

- **TD-1** Base the data plan on the challenge Resources tab and use its strongest options [S3].
- **TD-2** Free services and free accounts only. Earthdata Login is free [V S11].
- **TD-3** Implementation will be heavily SI-assisted. A 3D globe and forecasts are in scope. The app must look striking, using free, open-source libraries only.
- **TD-4** English only. Whole-world coverage. The audience is the one the challenge names, extended to everyone from the general public to scientists.
- **TD-5** Prefer creative, advanced features. Offer several ways to visualize different kinds of trends.

### 1.7 Rules and constraints

| ID | Constraint | Source | Status |
|---|---|---|---|
| CON-1 | To be eligible for Global Awards, use at least one NASA data source listed in the challenge Resources | [S6] | [V] |
| CON-2 | Describe SI use in the submission. Watermark SI-generated images and video. Acknowledge SI-generated code and data. Use no NASA branding in SI-generated content. | [S5, S6] | [V] |
| CON-3 | Team of 6 or fewer. Submission window: Sat 14 Nov 09:00 to Sun 15 Nov 23:59, local time | [S4] | [V] |
| CON-4 | Project page in English. Demos in another language need English subtitles. | [S7b] (earlier-year guide) | [P] |
| CON-5 | Submitted videos must not show the names, voices or likenesses of anyone under 18 | [S5] | [V] |
| CON-6 | Cite every data source, resource and open-source library used | [S7c] | [P] |
| CON-7 | Free services and open-source licences only | TD-2, TD-3 | [H] |
| CON-8 | Follow the data-use terms of non-U.S.-government websites (e.g. KNMI) | Resources disclaimer [S3] | [V] |
| CON-9 | Check the official 2026 Judging & Awards and Project Submission guides when they are released | [S5] | Pending |

### 1.8 Judging alignment

- **Criteria.** Local events report five criteria, each scored 1–5: Impact, Creativity, Validity, Relevance and Presentation [P S7a]. The official 2026 guide is pending.
- **Award categories.** The 2025 Global Awards included Best Use of Science, Best Use of Data, Best Use of Technology, Best Use of Storytelling, and Art & Technology [V S7d]. This design aims at those [H].

### 1.9 Key terms

- **Anomaly:** the difference from the usual value for that calendar month.
- **Trend:** the average rate of change over the analysis window.
- **Sen's slope:** a trend estimate based on the median of all pairwise slopes, so outliers barely affect it.
- **Mann–Kendall (MK):** a rank-based test for whether a series consistently rises or falls.
- **p-value:** the chance of seeing a trend at least this strong if there were really no trend.
- **q-value:** a p-value adjusted for running many tests at once (false discovery rate, FDR).
- **Confidence interval (CI):** the range of plausible values for the trend.
- **Reanalysis:** a weather model constrained by observations (for example, MERRA-2).
- **Detectability horizon:** how many years of data are needed to detect a trend of a given size.
- **Time of emergence:** the year when the signal stands clearly above the noise.
- **Evidence grade:** our A–D summary of how trustworthy a result is (§6.7).
- **Caveat registry:** our list of known, dated problems in each dataset (§5.6).
- **Global Trend Cube:** our precomputed global monthly grids (§5.3).

---

## 2. Scope

### 2.1 MVP (P0)

- **Living Globe:**
  - 10 or more global trend layers, with significance (after FDR correction) encoded separately from colour.
  - Relief (height) mode, the Detective Lens, and click-through from any cell.
  - Time-lapse with a ring of anomaly stripes, and an opposite-trends mode.
- **Regions:**
  - Any region on Earth, including the whole world, chosen by click, box, polygon or preset.
  - A region summary with warnings, and side-by-side comparison of two regions.
- **Variable catalog:**
  - 12 or more P0 variables, each with definitions at three levels. This includes vegetation greenness from AppEEARS for demo and preset regions.
  - A guided question flow that works without SI.
- **Case Board:** scans every eligible variable, with at least 8 on the benchmark land regions fixed before testing (SC-01/AC-12), applies Benjamini–Hochberg FDR, assigns evidence grades, and lists unavailable variables with reasons. It never fabricates coverage for other regions.
- **Case File:**
  - Statistics: the reference method from the challenge author's paper [S8], Hamed–Rao Mann–Kendall, OLS with an effective sample size, and Sen's slope.
  - Seasonal fingerprint, evidence grade, detectability horizon and time of emergence.
  - User controls for window, baseline and significance level.
- **Views:**
  - Time series, trend stripes, seasonal heatmap, signal-vs-noise gauge, and forecast fan chart.
  - A view recommender, plus a text summary and three-level explanation for every chart.
- **Outlook:** a clearly labelled "if the trend continued" projection, and a short-term forecast shown only when it has proven skill.
- **Learning:** three guided investigations, a glossary and onboarding.
- **Data:**
  - Connectors for Giovanni-in-the-Cloud, AppEEARS (demo regions), NASA POWER and Earthdata Cloud.
  - The Global Trend Cube pipeline, a cache, and an offline snapshot mode.
- **Evidence:**
  - Provenance for every number, and export of a full case file.
  - A synthetic validation suite, and a reproduction of the reference paper's results.
- **SI:** a disclosure page. The app works fully with SI switched off.

### 2.2 Planned (P1)

- **Globe:** dual-globe compare; 2D fallback.
- **Regions:** region type profile.
- **Case Board:** fingerprint chart; cross-checks against an independent dataset ("witness checks").
- **Case File:** robustness panel; change-point flag; advanced controls for scientists.
- **Views:** climate spiral; distribution shift; trend triangle.
- **Outlook:** time-of-emergence projection.
- **SI:** "Ask the Detective".
- **Data:** AppEEARS for user-drawn polygons; point hydrology series; NOAA station check.
- **Evidence:** cross-dataset report; shareable links; automatically generated methods page.
- **Learning:** statistics primer linking the articles from the Resources tab.

### 2.3 Stretch (P2)

- **Globe extras:** mission-orbit overlay; "then vs now" swipe; sonification.
- **Extra data:** NEX-GDDP-CMIP6 climate-scenario context; GRACE water storage; SWOT as an "emerging record"; upper-air temperature levels.
- **Other:** SI rewording of results; cross-check against KNMI Climate Explorer; administrative-boundary presets; detective badges.

### 2.4 Out of scope

- **Data:** real-time or hourly data; joining different products, versions or sensors into one series; user data upload.
- **Claims:**
  - presenting causes (attribution) as findings;
  - predicting extremes or specific events;
  - nonlinear trend modelling beyond descriptive smoothing (the challenge says linear trends are enough [S1]).
- **Product:** user accounts or social features; native mobile apps; paid APIs or services.
- **Resources not used:** processing CSA RCM radar (SAR) data, because the record is short and the processing is specialised (§5.1).
- **Other:** NASA logos or insignia; medical, legal or financial advice.

---

## 3. Functional requirements

### 3.1 Living Globe (GL)

| ID | Pri | Requirement |
|---|---|---|
| GL-01 | P0 | Render an interactive 3D globe (rotate, zoom, tilt, inertia, reset) on a NASA GIBS imagery basemap, with an offline texture fallback. Show the GIBS acknowledgment whenever GIBS imagery is visible [S25]. |
| GL-02 | P0 | Show a global trend layer for any cube variable. **Colour** shows the trend's direction and size on a diverging, colour-blind-safe scale. **Significance after FDR** uses a second channel (opacity or stipple), never colour alone. The legend shows units per decade, the analysis window and the method. |
| GL-03 | P0 | Relief mode: cell height is proportional to \|σ/decade\| on a fixed, documented scale, with no automatic exaggeration. Turning relief on or off never changes colours or values. |
| GL-04 | P0 | Detective Lens: a draggable magnifier. Within 300 ms of stopping, show a labelled cell-level preview of changing variables, signs and significant area fractions from loaded layers. Do not show a regional p-value or grade or average cell p/q values. "Open case" computes the exact regional Case Board for the same geographic footprint. |
| GL-05 | P0 | Clicking a cell shows its value, trend, q-value, data window and a sparkline, with an "Open case file" action. |
| GL-06 | P0 | Time-lapse of annual anomaly maps (play, pause, scrub, speed). A ring of global-mean anomaly stripes surrounds the globe. |
| GL-07 | P0 | Opposite-trends mode: highlight significant increases against significant decreases, list the largest contiguous areas of each, and send any two to Compare (RG-05). Visual links between areas must never imply cause. |
| GL-08 | P1 | Dual-globe view comparing two variables or two periods, with synchronised cameras. |
| GL-09 | P1 | Full interactive 2D map toggle. A basic canvas/SVG grid view, accessible values and numeric region controls when WebGL2 is unavailable are mandatory P0 portability behavior under PRT-1; the richer map remains P1. |
| GL-10 | P2 | Mission overlay: stylised satellites (e.g. Aqua, Aura, GPM). Each satellite's card lists its variables, record length and mission status or caveats. |
| GL-11 | P2 | "Then vs now" swipe comparing early-period and late-period climatologies. |

### 3.2 Places and regions (RG)

| ID | Pri | Requirement |
|---|---|---|
| RG-01 | P0 | Select a region by clicking a cell, drawing a box or polygon, or choosing a preset: whole world, hemispheres, latitude bands, continents, ocean basins or demo regions. |
| RG-02 | P0 | Analyse any region on Earth, including the whole world. All regional means are area-weighted (SM-02). |
| RG-03 | P0 | Before analysis, show the region's area, number of cells, land/ocean fraction and coverage per variable. Warn when a large region contains significant trends of opposite sign (taken from the global layers). |
| RG-04 | P1 | Region type profile (desert, forest, cropland, urban, coast/estuary, snow and ice, open ocean), derived from land cover, population density, elevation and coastline. |
| RG-05 | P0 | Compare two regions side by side for the same variable and window, including the difference between their trends and its CI. |
| RG-06 | P2 | Administrative-boundary presets (countries; Canadian regions from Geo.ca), subject to a licence check. |

### 3.3 Variable catalog and discovery (VC)

| ID | Pri | Requirement |
|---|---|---|
| VC-01 | P0 | A curated catalog (§5.2) of 10 or more P0 variables. Each entry has: plain name, Explorer one-liner, Student definition, scientific name and units, mission or model, dataset short name, version, DOI or concept ID, native resolution, record period, caveats, and the Resource it comes through. |
| VC-02 | P0 | Browse by theme (Heat, Water, Air, Snow and Ice, Ocean, Land and Life, Sun and Clouds) and by Earth sphere (land, ocean, atmosphere). |
| VC-03 | P0 | A guided question flow ("What are you curious about? Where? Since when?") that returns a ranked shortlist of variables. It is rule-based and works without SI. |
| VC-04 | P1 | For each suggestion, explain why that variable can change in this kind of place. Use a curated table of region types built from the challenge's examples: desert, rain forest, tidal estuary and the atmosphere above a large city [S1]. |
| VC-05 | P1 | Link each variable and method to further reading, including the trend-test and significance articles in the Resources tab [S3]. |

### 3.4 Case Board: scanning many variables at once (SC)

| ID | Pri | Requirement |
|---|---|---|
| SC-01 | P0 | For a region and window, analyse every catalog variable available there. At least 8 must be analysable in the eligible benchmark land regions fixed before acceptance testing; elsewhere show the actual eligible count and reasons for unavailable entries, without relaxing coverage or record rules. For each variable show direction, magnitude in units/decade, applicable %/decade and σ/decade, robust p, FDR q, evidence grade, window and caveats. Chlorophyll raw and transformed branches follow SM-04. |
| SC-02 | P0 | Rank by evidence grade, then by \|σ/decade\|. Users can re-sort. |
| SC-03 | P0 | Apply Benjamini–Hochberg FDR across the variables in each scan (SM-06), and show both p and q. |
| SC-04 | P0 | List variables that cannot be analysed (coverage, record length or mask), with the reason. |
| SC-05 | P1 | Fingerprint chart (diverging bars, optional radar). |
| SC-06 | P1 | Witness check: agreement between paired datasets. Temperature: MERRA-2 vs AIRS. Precipitation: GPCP vs IMERG vs MERRA-2. |

### 3.5 Case File: trend analysis (AN)

| ID | Pri | Requirement |
|---|---|---|
| AN-01 | P0 | Build the monthly regional series, recording coverage for each month (SM-02). |
| AN-02 | P0 | Compute monthly anomalies and annual anomaly means (SM-03). |
| AN-03 | P0 | Estimate Sen's slope with a CI, and the OLS slope with standard error (SE), CI and R², all per decade (SM-04). |
| AN-04 | P0 | Report three significance results (SM-05): (a) the reference method of Acker et al. 2009 [S8]; (b) Mann–Kendall with the Hamed–Rao correction; (c) an OLS t-test using the AR(1) effective sample size. |
| AN-05 | P0 | Seasonal fingerprint: a trend for each calendar month with FDR across the 12, plus the Seasonal Kendall test. |
| AN-06 | P0 | Evidence grade A–D, with the reasons listed (SM-07). |
| AN-07 | P0 | Detectability horizon and time of emergence (SM-08). |
| AN-08 | P1 | Robustness panel: sensitivity to start and end years (trend triangle), effect of outliers (Sen vs OLS), alternative tests. |
| AN-09 | P1 | Change-point flag, shown together with the dates in the caveat registry. |
| AN-10 | P0 | User controls for window, baseline and α (default 0.05). Completed core statistics and their dependent views update within 2 s when the regional series is loaded. Outlook recalculation/backtests may run separately with visible pending/error state; old results must never appear current. Alpha controls p and FDR-q decision thresholds together; q values themselves are alpha-independent. Geometry/acquisition work has separate progress and timing. |
| AN-11 | P1 | Scientist controls: test variant (original MK, Hamed–Rao, Yue–Wang/trend-free prewhitening, Seasonal Kendall); monthly or annual aggregation; log transform for log-normal variables such as chlorophyll. |

### 3.6 Visualization modes (VZ)

| ID | Pri | Requirement |
|---|---|---|
| VZ-01 | P0 | Time-series view: raw and anomaly series, trend line with CI band, caveat markers and shaded gaps. |
| VZ-02 | P0 | Trend stripes: annual anomalies as coloured stripes. |
| VZ-03 | P0 | Seasonal heatmap (year × month anomalies) with a trend bar for each month. |
| VZ-04 | P1 | Climate spiral: an animated polar plot of monthly anomalies. |
| VZ-05 | P1 | Distribution shift: the spread of values in each decade (descriptive only). |
| VZ-06 | P1 | Trend triangle: the slope for every start-year/end-year pair, with significance marked. |
| VZ-07 | P0 | Signal-vs-noise gauge, showing the detectability horizon and time of emergence. |
| VZ-08 | P0 | Forecast fan chart with a skill badge (FC-01, FC-02). |
| VZ-09 | P2 | Sonification of the series, with captions. |
| VZ-10 | P0 | A view recommender chooses the default view from the type of result (table below). |
| VZ-11 | P0 | Every chart has an automatically generated text summary and an "Explain" panel at all three levels (ED-01). |

**Default view for each type of result (VZ-10):**

| Analysis outcome | Default view | Secondary view |
|---|---|---|
| Significant steady trend (grade A or B) | Time series + stripes | Spiral |
| Trend limited to certain months | Seasonal heatmap | Per-month bars |
| Not significant (grade C) | Signal-vs-noise gauge | Time series |
| Step near a caveat date or change point (grade D) | Time series with caveat markers | Trend triangle |
| Opposite trends between places | Compare / opposite-trends mode | Dual globe |
| Spread or extremes possibly changing | Distribution shift | Time series |

### 3.7 Outlook: projections and forecasts (FC)

| ID | Pri | Requirement |
|---|---|---|
| FC-01 | P0 | "If the trend continued" projection up to H years ahead, with prediction intervals. Default H is 10; the maximum is 20 years or half the record length, whichever is smaller. A permanent label says "Not a prediction" (SM-10). |
| FC-02 | P0 | Short-term statistical forecast (12–24 months), checked with rolling-origin backtests against seasonal-naive and climatology baselines. It is shown only if it beats the baseline (SM-10); otherwise the app says no skill was found. |
| FC-03 | P1 | Time-of-emergence projection: the years when the signal-to-noise ratio would pass 1 and 2 if the trend continued. |
| FC-04 | P2 | Climate-scenario context for demo regions from NEX-GDDP-CMIP6 (temperature and precipitation, two SSPs, a small set of models). Styled clearly differently from the statistical projections. |
| FC-05 | P0 | Outlook explanations at all three levels, including why projections are uncertain. |

### 3.8 Super Intelligence features (SI)

| ID | Pri | Requirement |
|---|---|---|
| SI-01 | P1 | Ask the Detective: turn a free-text question into a theme, place and period, and suggest variables **from the catalog only**, with reasons. The user confirms before any analysis runs. |
| SI-02 | P1 | The region type profile (RG-04) is computed deterministically. SI may only reword its explanation. |
| SI-03 | P2 | SI rewording of templated results at the chosen level. Every number is checked automatically against the computed results; if any do not match, the template is shown instead. |
| SI-04 | P0 | SI usage log and disclosure page, covering SI used during development and inside the product (CON-2). |
| SI-05 | P0 | Every feature works with SI switched off. SI uses only free or local models. |

### 3.9 Learning and guided investigations (ED)

| ID | Pri | Requirement |
|---|---|---|
| ED-01 | P0 | A global switch between Explorer, Student and Scientist levels. It changes text, labels and the amount of detail everywhere. |
| ED-02 | P0 | A glossary with simple definitions of every variable and statistical term used. |
| ED-03 | P0 | Three guided investigations, each 3 minutes or less and ending with "try it yourself": (a) *Summer smoke over Wisconsin*, the case from the challenge video [S2], using V10 plus a classic Giovanni export of MODIS-Aqua AOD; (b) *Rivers revisited*, the regions from Acker et al. 2009 (Appendix B) [S8]; (c) *Wetter here, drier there*, an opposite-trends case chosen only after the analysis has been run. |
| ED-04 | P1 | Statistics primer cards linking to the Resources-tab articles. |
| ED-05 | P0 | First-run onboarding of 30 seconds or less, which can be skipped. |
| ED-06 | P2 | Detective badges for completing investigations. |

### 3.10 Data acquisition (DA)

| ID | Pri | Requirement |
|---|---|---|
| DA-01 | P0 | An offline pipeline that builds the Global Trend Cube (§5.3) for the P0 variables and can resume after interruption. It logs transfer sizes and provenance. |
| DA-02 | P0 | Giovanni-in-the-Cloud connector: area-averaged time series (CSV) and time-averaged maps (GeoTIFF) via Harmony. It checks the user's quota before each job, shows progress while jobs run, and caches results [S9]. |
| DA-03 | P0 | AppEEARS connector for preset and demo regions (at least V13). It runs asynchronously and caches results [S11]. Use statistics CSV only when its QA, valid support and area-weighting semantics are demonstrable; otherwise retrieve the task's area/QA rasters and compute the regional series locally, retaining the CSV for comparison. |
| DA-04 | P1 | Point hydrology series through the Giovanni point time-series API, the programmatic route GES DISC recommends for the Hydrology Time Series resource [S10]. |
| DA-05 | P0 | NASA POWER connector: the analysis-ready Zarr store on AWS for the cube, and the REST API for quick point lookups. Requests are throttled [S14]. |
| DA-06 | P1 | NOAA NCEI station connector: monthly station summaries (Access Data Service, Global Summary of the Month) for ground-truth checks, finding the nearest stations within a radius [S12]. |
| DA-07 | P0 | Earthdata Cloud access (earthaccess and Harmony subsetting) for GLDAS, GPCP, IMERG, OB.DAAC chlorophyll and MERRA-2 aerosols. |
| DA-08 | P0 | A cache keyed by source, dataset version, variable, region, window and method, with provenance attached. |
| DA-09 | P0 | Snapshot mode: precomputed globe layers and demo regions that work with no network and no credentials. |
| DEP-01 | P0 | Run the full application locally on the reference team laptop: FastAPI serves the built frontend on loopback, with persistent cube, SQLite and artifacts. Support arbitrary-region analyses, scans, comparisons, controls and exports over installed validated P0 data. Preserve a verified offline snapshot and a second local copy. Public hosting is deferred; no cloud account, hostname or paid service is required. |
| DA-10 | P2 | Optional connectors for NEX-GDDP-CMIP6 regional subsets, GRACE/GRACE-FO mascons and SWOT. |
| DA-11 | P1 | AppEEARS requests for user-drawn polygons, with a queue indicator and cached results. |

### 3.11 Provenance and export (PV)

| ID | Pri | Requirement |
|---|---|---|
| PV-01 | P0 | Every number shown links to its provenance record (§5.5), visible at Scientist level. |
| PV-02 | P0 | Export a case file: series as CSV, results and provenance as JSON, charts as PNG, and a citation block (dataset DOIs, Resources used, GIBS acknowledgment). |
| PV-03 | P1 | A shareable URL capturing the variable, region, window, view and level. |
| PV-04 | P1 | A methods page generated from the running configuration: dataset versions, parameters and code version. |

### 3.12 Validation lab (VL)

| ID | Pri | Requirement |
|---|---|---|
| VL-01 | P0 | Run the synthetic validation suite (SM-12) and show its results on the Methods page. |
| VL-02 | P0 | Reproduce the reference paper: apply the Acker et al. 2009 method to SeaWiFS monthly chlorophyll for the paper's 10 boxes (Appendix B), and show our result next to the published one. |
| VL-03 | P1 | Agreement report for each pair of datasets measuring the same thing. |
| VL-04 | P1 | Station check: compare grid-cell anomalies with nearby GHCN station anomalies for the demo regions (correlation and difference in trend). |
| VL-05 | P2 | Manually cross-check one trend against KNMI Climate Explorer, documented with a citation. |

---

## 4. Nonfunctional requirements

| ID | Category | Requirement |
|---|---|---|
| PERF-1 | Performance | The globe runs at 30 fps or more (median) with a 1° layer, and 20 fps or more during time-lapse, on the reference laptop (AS-05). |
| PERF-2 | Performance | The cell-level lens preview appears within 300 ms of stopping. A full scan of up to 12 variables from the installed cube takes 3 s or less. Measure completed results, not job acknowledgement, on the reference laptop; record cold/warm cache and acquisition conditions separately. |
| PERF-3 | Performance | The snapshot site loads in 5 s or less on a 50 Mbps connection. Layers load only when needed. |
| PERF-4 | Performance | Live connector requests run in the background, with progress, timeouts and retries. The user can keep exploring meanwhile. |
| PERF-5 | Performance | The cube build for the P0 layers finishes within the first 12 hours of the event on the team's connection [H]. |
| USE-1 | Usability | A first-time user finishes a guided investigation unaided in 3 minutes or less (tested with at least 3 people outside the team). |
| USE-2 | Usability | Explorer-level text uses plain language (aiming for roughly grade-8 reading level [H]). Jargon appears only at Scientist level and is defined in the glossary. |
| USE-3 | Usability | Units, legends and tooltips are consistent across all views. |
| USE-4 | Visual design | A consistent design system: dark "space" theme, colours reserved for data, transitions of 300 ms or less, no chart junk. External testers rate "engaging" and "easy to understand" at least 4/5 on average [H]. |
| ACC-1 | Accessibility | Colour-blind-safe palettes. Meaning is never carried by red/green alone, and significance uses a channel other than colour. |
| ACC-2 | Accessibility | Main flows work by keyboard. A reduced-motion setting stops auto-rotation and animations. Every chart has a text alternative. |
| ACC-3 | Accessibility | Text contrast aims to meet WCAG 2.1 AA [H]. |
| REL-1 | Reliability | Snapshot mode keeps the demo working offline. When a live service fails, the app falls back to cached results and shows a clear banner. |
| REL-2 | Reliability | Results are deterministic: the same inputs always give the same outputs, and any randomness is seeded. |
| REL-3 | Reliability | Data pipelines can resume and safely re-run, and use checksums. |
| SEC-1 | Security & privacy | No user accounts, no personal data collected, no tracking. |
| SEC-2 | Security & privacy | Credentials (Earthdata Login, AppEEARS token, CDO token) stay on the server only, in environment variables or a `.netrc` file outside the repo. They never appear in the client bundle or in git. A secret scan runs before every commit. |
| SEC-3 | Security & privacy | Respect provider limits: the Giovanni quota, CDO's 5 requests per second and 10,000 per day [V S12], POWER's usage guidance, and AppEEARS etiquette. |
| CMP-1 | Compliance | Only free services. Only libraries with OSI-approved licences, listed in a licence inventory in the repo. |
| CMP-2 | Compliance | A credits page lists every dataset (with DOI), Resource, service and library (with licence). It includes the GIBS acknowledgment and follows NASA data citation guidance [S25]. |
| CMP-3 | Compliance | SI disclosure, watermarks on SI-generated media, and no NASA branding (CON-2). |
| CMP-4 | Compliance | UI and documentation in English (CON-4). |
| CMP-5 | Compliance | No likeness or voice of anyone under 18 in videos (CON-5). |
| MNT-1 | Maintainability | Pinned dependencies, one-command setup, and a data manifest listing every granule or job used. |
| MNT-2 | Maintainability | Unit tests for the statistics module, aiming for 90% line coverage or more [H]. |
| MNT-3 | Maintainability | Modular data adapters: adding a catalog variable needs configuration only. |
| PRT-1 | Portability | Current desktop Chrome, Edge and Firefox. WebGL2 for the globe; mandatory P0 basic canvas/SVG grid fallback with accessible values and numeric region controls. The full GL-09 map remains P1. Layouts down to tablet width; phones are best effort. |

---

## 5. Data requirements

### 5.1 How each Resources-tab item is used [S3]

| Resource | Provider | Use in this project | Pri | Status |
|---|---|---|---|---|
| Giovanni | NASA GES DISC | Our anchor for CON-1. Area-averaged series for custom regions, and time-averaged maps that build the OMI and AIRS globe layers. Accessed through Giovanni-in-the-Cloud, its programmatic route [S9]. A classic Giovanni export is used in ED-03a. | P0 | API documented [V]; quota and speed untested |
| Hydrology Time Series | NASA GES DISC | Point hydrology series, accessed through the Giovanni point API as GES DISC recommends [S10] | P1 | [P] |
| AppEEARS | NASA LP DAAC | Land variables at native resolution (vegetation greenness, land surface temperature, land cover, population density), read from its statistics CSV [S11] | P0 (demo regions) / P1 (user polygons) | Documented [V]; untested |
| Climate Data Online (CDO) | NOAA NCEI | Ground truth from GHCN weather stations via the NCEI Access Data Service, which needs no token [V-live S12] | P1 | [V-live] |
| SeaWiFS chlorophyll time-series article (Acker et al. 2009) | NASA NTRS | Reference method (AN-04a), reproduction test (VL-02) and investigation ED-03b [S8] | P0 | [V] |
| KNMI Climate Explorer | Partner | Manual cross-check (VL-05), and optional CMIP6 context exported by hand. No automated access, because the site requires human verification [V S13]. | P2 | [V] |
| "Statistical test methods to detect trends…" and "A Comprehensive Guide to Statistical Significance" | Partner list | Learning-panel links (VC-05, ED-04) | P1 | [V] links |
| CSA SWOT information | Partner | "Emerging record" explainer: when will a new mission's record be long enough to detect a trend? | P2 | [U] data access |
| Geo.ca | Partner | Canadian boundary presets (RG-06) | P2 | [U] licence |
| CSA RCM data; SAR Python tutorial | Partner | Not used: the record is short and SAR needs specialised processing | — | Excluded |
| CSA "Monitoring and protecting our ecosystem from space" | Partner | Context link in the learning panel | P2 | — |

We also use these free NASA sources:

- NASA POWER [S14];
- Earthdata Cloud datasets [S15–S22];
- NASA GIBS [S25];
- NEX-GDDP-CMIP6 (P2) [S24];
- GRACE/GRACE-FO (P2) [S23].

### 5.2 Variable catalog

#### P0: Global Trend Cube variables (global, monthly)

| ID | Variable (plain name) | Dataset and version | Access route | Native → cube resolution | Record → default window | Display units | Status |
|---|---|---|---|---|---|---|---|
| V01 | Air temperature near the ground | MERRA-2 T2M via the NASA POWER analysis-ready Zarr store (monthly) | AWS S3 `nasa-power`, `merra2/temporal/power_merra2_monthly_temporal_utc.zarr`; no login | Native 0.5°×0.625° retained for analysis; area-overlap aggregate to 1° display | 1981 → latest verified complete month | °C | TDD metadata check: `T2M`, source units `C` [V-live]; no Kelvin conversion on this binding |
| V02 | Rain and snow (climate record) | GPCP V3.3 monthly (GPCPMON), DOI 10.5067/MEASURES/GPCP/DATA306 | Earthdata Cloud (Earthdata Login) | 0.5° | 1983-01 → 2024-09 (updates paused) | mm/day | [V] |
| V03 | Rain and snow (high resolution) | GPM IMERG V07 Final monthly (GPM_3IMERGM), DOI 10.5067/GPM/IMERG/3B-MONTH/07 | Giovanni-in-the-Cloud; Earthdata Cloud | 0.1° → 0.5° | V07 Final ends 2025-09-30; default 2001-01 → 2025-09 | mm/day | [V] |
| V04 | Surface soil moisture (top 10 cm) | GLDAS-2.1 Noah monthly (GLDAS_NOAH025_M) `SoilMoi0_10cm_inst`, DOI 10.5067/SXAVCZFAQLNO | Giovanni-in-the-Cloud; Earthdata Cloud | 0.25° → 0.5° | 2000-01 → present; default from 2001-03 | mm water | [V] |
| V05 | Water evaporating from land and plants (evapotranspiration) | GLDAS-2.1 `Evap_tavg` | Same as V04 | Same as V04 | Same as V04 | mm/day | [V] |
| V06 | Surface runoff (stand-in for streamflow) | GLDAS-2.1 `Qs_acc` | Same as V04 | Same as V04 | Same as V04 | mm/day | Variable [V]; unit definition [U] |
| V07 | Water stored in snow | GLDAS-2.1 `SWE_inst` | Same as V04 | Same as V04 | Same as V04 | mm | [V] |
| V08 | Water vapour in the air | AIRS V7 AIRS-only monthly (AIRS3STM 7.0) `TotH2OVap_A` ascending branch selected; descending is a separate optional binding | Giovanni-in-the-Cloud time-averaged maps | 1° (kept at 1°) | 2002-09 → present | mm | Identity [V]; actual header/QA support must be checked |
| V09 | Nitrogen dioxide pollution (lower atmosphere) | OMI OMNO2d v003 `ColumnAmountNO2TropCloudScreened`, DOI 10.5067/Aura/OMI/DATA3007 | Giovanni-in-the-Cloud time-averaged maps | 0.25° → 0.5° | 2004-10 → present; default 2005 → latest | 10¹⁵ molecules cm⁻² | [V] |
| V10 | Haze and smoke (aerosol optical depth) | MERRA-2 M2TMNXAER 5.12.4 `TOTEXTTAU`, DOI 10.5067/FH9A0MLJPC7N | Earthdata Cloud; Harmony capability must be checked. Giovanni hourly M2T1NXAER is a separate binding, never spliced | Native 0.5°×0.625° retained; area-overlap aggregate to 1° display | 1980 → present; demo window 2002 → | unitless | Identity verified in TDD; authenticated access untested |
| V11 | Ocean chlorophyll-a (phytoplankton) | MODIS-Aqua L3 mapped CHL R2022.0 (concept C3380709133-OB_CLOUD). Reference: separate SeaWiFS L3 mapped CHL R2022.0, DOI 10.5067/ORBVIEW-2/SeaWiFS/L3M/CHL/2022.0 | Earthdata Cloud, OB.DAAC (Earthdata Login) | Selected monthly 9 km product → 0.5° cube; SeaWiFS paper boxes retain native support | MODIS 2002-07 → present; SeaWiFS 1997-09 → 2010-12 | mg m⁻³ | Catalog [V]; actual granule/access untested |
| V12 | Sunlight reaching the ground (all-sky) | CERES SYN1deg via the NASA POWER Zarr store (monthly) | AWS S3 `nasa-power`, `syn1deg/temporal/power_syn1deg_monthly_temporal_lst.zarr`; no login | 1° | 2001 → present (earlier source excluded) | W m⁻² | Path [V] |

#### P0: regional only (no globe layer)

| ID | Variable | Source | Status |
|---|---|---|---|
| V13 | Vegetation greenness (NDVI) for at least two demo/preset regions | MOD13A3.061 monthly 1 km NDVI via AppEEARS, with QA companion layers; EVI remains an optional binding of the same approved variable | Product/layer and 0.0001 native scale confirmed by TDD metadata check; task access and QA/statistics semantics untested |

#### P1: live connectors (native resolution, any region)

| ID | Variable | Source | Status |
|---|---|---|---|
| V14 | Land surface temperature (day and night) | MODIS MOD11 family via AppEEARS | [P] |
| V15 | Land cover type (context for RG-04) | MODIS MCD12Q1 via AppEEARS | Listed [V]; current version [U] |
| V16 | Population density (context for RG-04) | GPW v4 via AppEEARS | [V] |
| V17 | U.S. hydrology, long record (1979 onwards) | NLDAS-2 monthly via Giovanni-in-the-Cloud | [V] |
| V18 | U.S. streamflow | NCA-LDAS daily `Streamflow` via Giovanni-in-the-Cloud | [V] |
| V19 | Groundwater (assimilated) | GRACE-DA-DM `gws_inst` via Giovanni-in-the-Cloud | [V] |
| V20 | UV aerosol index | OMI OMAERUVd via Giovanni-in-the-Cloud | [V] |
| V21 | Station temperature and precipitation (ground truth) | NOAA NCEI GSOM (TAVG, PRCP) | [V-live] |

#### P2: stretch variables

- V22: terrestrial water storage (GRACE/GRACE-FO JPL mascons RL06.3 v04).
- V23: climate scenarios (NEX-GDDP-CMIP6, DOI 10.7917/OFSG3345, CC0).
- V24: upper-air temperature at 850/500/250 hPa (MERRA-2 M2TMNXSLV).
- V25: SWOT water-surface elevation (an emerging record).

**Build-cost notes [H]:**

- **V08 and V09:** each needs about 250–290 monthly time-averaged-map jobs in Giovanni. If that costs too much quota, they fall back to about 20 annual jobs and are analysed on annual means only.
- **V03:** if building its globe layer costs too much, it stays regional-only, via Giovanni area averages.
- **V10:** a Harmony subset of about 550 monthly granules.
- **V11:** the SeaWiFS reproduction (VL-02) needs only the 10 boxes in Appendix B.

### 5.3 Global Trend Cube

- **DR-C1 Grids.**
  - Regional series use a 0.5° analysis grid where native support permits; MERRA-2/POWER retains native 0.5°×0.625° cells. Geometry weights are computed for each grid.
  - The globe displays a 1° grid, built from valid native/analysis values using conservative area-overlap weights; simple block means are allowed only for aligned grids.
  - Coarser data (AIRS, CERES) stays at its native resolution. Nothing is interpolated to create finer scientific information. Native and analysis grid identities remain in provenance.
- **DR-C2** Monthly means, with a validity flag and coverage value for every cell and month.
- **DR-C3** Annual means only for years with 10 or more valid months [H].
- **DR-C4** Land-only variables are masked over ocean, and ocean variables over land. The mask source is recorded.
- **DR-C5 Storage:**
  - chunked Zarr/NetCDF on the backend;
  - compact binary or JSON tiles for globe layers and time-lapse frames;
  - a snapshot bundle for DA-09.
- **DR-C6** A manifest for every layer: dataset, version, DOI or concept ID, granules or job IDs, build date and code version.
- **DR-C7** Subset on the server wherever possible: Harmony variable and spatial subsets, Giovanni time-averaged maps, and remote Zarr slicing. Log the transfer volume for each layer.

### 5.4 Formats and units

Input formats: NetCDF-4/HDF5, HDF-EOS, GeoTIFF, CSV, JSON and Zarr.

| Quantity | Typical source units | Display units | Rule |
|---|---|---|---|
| Temperature | Read each binding's units: POWER `T2M` is already `C`; direct MERRA-2 may be K | °C | Identity for C/°C; subtract 273.15 only from K; reject unknown units |
| Precipitation and evapotranspiration rates | kg m⁻² s⁻¹ (MERRA-2, GLDAS) | mm/day | Multiply by 86,400 |
| IMERG precipitation | Varies by source (mm/hr or mm/day) [P] | mm/day | Read the units attribute, then convert |
| GLDAS `Qs_acc` | Monthly mean of 3-hour accumulations, kg m⁻² [V-doc in TDD] | mm/day | Multiply by 8 after confirming the file binding and accumulation semantics; this is surface runoff per area, not river discharge |
| Soil moisture of a layer | kg m⁻² | mm of water | 1 kg m⁻² = 1 mm |
| NO₂ column | molecules cm⁻² | 10¹⁵ molecules cm⁻² | Divide by 10¹⁵ |
| Chlorophyll-a | mg m⁻³ | mg m⁻³ | Robust tests use log₁₀ [H]. The reference method uses raw values, as in [S8]. |
| Trends | Per month or per year | Units/decade, %/decade, σ/decade | SM-04 |

### 5.5 Provenance record

Every series, layer and result carries:

- **Source:** Resource or service, dataset short name, version, DOI or concept ID, and variable name.
- **Request:** access method and endpoint, request parameters (box or polygon, time range, aggregation), and job ID or granule list.
- **Run details:** retrieval time (UTC) and code version (git SHA).
- **Processing:** steps applied (mask, weights, anomalies, transforms) and method parameters (test, α, window, baseline).
- **Integrity:** a hash of the result.

### 5.6 Caveat registry

These events are applied automatically whenever an analysis window overlaps them.

| Variable(s) | Date | Event | Handling | Source |
|---|---|---|---|---|
| V04–V07 | 2001-03 | GLDAS-2.1 adds AGRMET radiation to its inputs (before this, GDAS and GPCP only) | Default window starts 2001-03 | [V S15] |
| V04–V07 | — | GLDAS-2.0 and 2.1 use different input data; studies found trends of opposite sign | Never join them | [V S15] |
| V01, V10 | about 1991, 2001, 2011 | MERRA-2 production-stream breaks (deep-soil discontinuities) | Flag | [V S16] |
| V01 | 1982, 2006-04 | MERRA-2 changes its sea-surface temperature and sea-ice inputs | Flag | [V S16] |
| V01 | — | 2 m temperature is not directly assimilated | Label as model output | [V S16] |
| V03 | 2025-09-30 | IMERG V07 Final record ends; V08 pending | End of window; pin the version | [V S17] |
| V03 | from 2026-03 | IMERG Late and Early runs use "hybrid V07" | Never join them with Final | [V S17] |
| V03 | — | IMERG is built for fine-scale accuracy, not climate consistency | Cross-check against GPCP (SC-06) | [V S17] |
| V02 | 2024-09 | GPCP V3.3 updates paused | End of window | [V S18] |
| V09, V20 | 2007-06-25 | OMI row anomaly begins (loss of coverage) | Coverage rules; flag | [V S19] |
| V09, V20 | from 2023 | Aura's orbit drifts (about 1 h by mid-2026); end of science expected 2028-08 | Flag | [V S19, S21] |
| V08 | 2016-09-24 | The AIRS+AMSU product (AIRX3) ends | Use the AIRS-only product (AIRS3) | [V S20] |
| V08, V11 | from 2020/2021 | Terra and Aqua orbits drift. Aqua's crossing time moves from about 1:30 to 3:30 PM by mid-2026. Aqua's end of science is expected 2027-09. | Flag | [V S21] |
| V11 | late 2026 / early 2027 | Terra and Aqua begin shutting down | End of window | [V S21] |
| V12 | 2001 | POWER solar data switches source from SRB to CERES (then FLASHFlux) | Default window starts 2001 | [V S14] |
| V11 | — | Chlorophyll is less certain in optically complex coastal and inland waters | Explain in ED-03b | [V S22] |
| V22 | 2017–2018 | Gap between the GRACE and GRACE-FO missions | Use tests that handle gaps | [P S23] |

### 5.7 Access and credentials

Everything is free:

- **No account needed:** the NASA POWER API and Zarr store [V-live], NASA GIBS [V], and the NOAA NCEI Access Data Service [V-live].
- **Earthdata Login (free):** needed for Earthdata Cloud, Harmony, Giovanni-in-the-Cloud and AppEEARS [V].
  - AppEEARS issues its own bearer token through its login service [V S11].
- **CDO Web Services v2:** a free token sent by email. Optional, because the Access Data Service needs no token [V S12].
- **KNMI Climate Explorer:** asks for human verification, so it is used manually only [V S13].
- **NEX-GDDP-CMIP6:** a public AWS bucket [P S24].

### 5.8 Data rules

- **DR-01** Every guided investigation uses at least one NASA source listed in the Resources (Giovanni) and labels it in the app (CON-1).
- **DR-02** Never join different products, versions or sensors into one series. SeaWiFS and MODIS are always shown separately.
- **DR-03** Free data services only.
- **DR-04** Respect provider rate limits and quotas (SEC-3).
- **DR-05** Every series and layer has a provenance record (§5.5).
- **DR-06** The caveat registry (§5.6) is applied automatically.
- **DR-07** Units follow §5.4 and are stated on every axis and legend.
- **DR-08** Default windows follow §5.2. Users may change them, with a warning when a window crosses a registered event.

---

## 6. Scientific methodology

### 6.1 Pipeline (SM-01)

Select → Acquire → Quality control → Aggregate → Remove seasonal cycle → Estimate → Test → Correct for multiple tests → Robustness → Grade → Explain → Export.

### 6.2 Regional series (SM-02)

- **Regional mean:** x̄(t) = Σᵢ wᵢ·vᵢ(t)·xᵢ(t) / Σᵢ wᵢ·vᵢ(t), where:
  - wᵢ = cos(φᵢ)·fᵢ;
  - φᵢ is the cell's latitude;
  - fᵢ is the fraction of the cell inside the region;
  - vᵢ(t) is 1 if the cell is valid that month and 0 otherwise.
- **Comparison with Giovanni:** classic Giovanni also weights by cos(latitude) and by how much of each cell the shape covers [V S9]. The Giovanni-in-the-Cloud method still needs confirming [U].
- **Coverage:** C(t) = Σᵢ wᵢ·vᵢ(t) / Σᵢ wᵢ.
- **Usable month:** C(t) is at least 0.5, or at least 0.7 for clear-sky-only satellite products (OMI, AIRS, MODIS) [H].
- **Usable series:** at least 80% of months usable, and a record of at least 10 years [H].

### 6.3 Seasonal cycle and anomalies (SM-03)

- **Monthly anomaly:** a(t) = x̄(t) − clim_m(t), where clim_m is the mean of usable months m over the baseline. By default, the baseline is the analysis window.
- **Annual anomaly:** the mean of the monthly anomalies in years with at least 10 usable months. This matches the procedure in [S8].
- **Chlorophyll:** robust tests use log₁₀ values [H].
  Aggregate valid positive concentrations spatially in raw units first; then transform the regional series before forming transformed anomalies. Do not take a log of an anomaly or average pixel logs as a substitute for this sequence.

### 6.4 Size of the trend (SM-04)

- **Sen's slope:** β̂ = median of (aⱼ − aᵢ)/(tⱼ − tᵢ) over all pairs i < j. Its CI is rank-based or from a block bootstrap; the method is fixed at implementation [U].
- **OLS slope:** b, with its standard error (SE) and R², and a CI adjusted for the effective sample size (SM-05c).
- **Units:** results are reported in three forms:
  - units per decade;
  - σ per decade, where σ is the standard deviation of the detrended anomalies;
  - % per decade, only for ratio-scale variables whose mean is well away from zero [H].
  - Chlorophyll displays a separately calculated raw-unit Sen slope (mg m⁻³/decade) as the primary globe magnitude. Robust inference and standardized relief use the labelled log₁₀ branch. A log slope is never labelled as an absolute concentration slope; its multiplicative percentage is `100 × (10^log_slope_per_decade − 1)`. Disagreement in branch direction is visible and prevents grade A.

### 6.5 Significance (SM-05)

The default is α = 0.05, two-sided, as in the challenge video [V S2].

- **(a) Reference method from Acker et al. 2009 [V S8].**
  - Least-squares linear regression on the full monthly series.
  - Significance from the ANOVA F-test at p < 0.05, with R² reported.
  - A second regression on the yearly anomaly means.
  - It is shown for transparency and comparison. For a simple linear regression, F = t², so this is the same as a naive t-test.
- **(b) Primary robust test.** Mann–Kendall on monthly anomalies, with the Hamed–Rao (1998) correction for autocorrelation [V S26].
- **(c) Secondary test.** OLS t-test using an effective sample size n_eff = n(1 − r₁)/(1 + r₁). Here r₁ is the lag-1 autocorrelation of the residuals (Santer et al. 2000) [V S26].
- **(d) Seasonal tests.** The Seasonal Kendall test (Hirsch et al. 1982), plus a separate Mann–Kendall test for each calendar month [V S26].
- **Teaching point.** The app shows how much (a) and (c) differ. That difference is the effect of autocorrelation.

### 6.6 Multiple testing (SM-06)

Use Benjamini–Hochberg FDR, default Q = 0.05 [V S26 Wilks 2016]. Under AN-10, Q follows the selected α; changing α changes decisions and confidence levels, not the adjusted q-values. Publish the complete tested family, including exclusions; viewport changes do not redefine a global family.

- **Procedure:** sort the p-values, find the largest k with p₍ₖ₎ ≤ (k/m)·Q, and report the adjusted q-value for each test.
- **Applied to:**
  - all variables in one scan (m is about 8–12);
  - the 12 monthly tests of a seasonal fingerprint;
  - all grid cells in a global layer (m up to 64,800).

### 6.7 Evidence grades (SM-07)

This is the team's own rule of thumb, published on the Methods page; it is not a NASA standard [H].

| Grade | Explorer label | Rule |
|---|---|---|
| A | Strong evidence | All of: (1) the primary test gives p < α (and q < α where FDR applies); (2) the secondary test agrees in sign and significance; (3) the sign holds when the start or end moves by ±2 years; (4) either no registered caveat falls inside the window, or an independent dataset shows the same sign with p < α. |
| B | Some evidence | The primary test gives p < α, but at least one other A condition fails. |
| C | Not detectable yet | The primary test gives p ≥ α. The app shows the detectability horizon and time of emergence. |
| D | Can't tell (data issue) | Coverage or record-length rules fail. Or a registered caveat (or, once AN-09 exists, a detected change point) falls within ±12 months of where most of the apparent change happens [H]. |

### 6.8 Detectability and emergence (SM-08)

- **Detectability horizon** (Weatherhead et al. 1998).
  - It gives the number of years n\* needed to detect a trend ω₀ at 5% significance with 90% probability, given noise σ_N and lag-1 autocorrelation φ.
  - The commonly cited form is n\* ≈ [(3.3·σ_N/|ω₀|)·√((1+φ)/(1−φ))]^(2/3); check it against the paper before implementing [P S26].
  - The app shows the years still needed: max(0, n\* − record length).
- **Time of emergence.**
  - The signal-to-noise ratio is S/N(t) = |β̂|·(t − t₀)/σ_N. ToE₁ and ToE₂ are the first years when S/N reaches 1 and 2.
  - The concept comes from Hawkins & Sutton (2012) [V S26]. Here it is applied to the observed trend and noise, and always labelled "if the trend continues".

### 6.9 Global layers (SM-09)

- **Per cell:**
  - annual anomalies over complete years;
  - Sen's slope;
  - Mann–Kendall p, with the Hamed–Rao correction when lag-1 autocorrelation is significant [H];
  - Benjamini–Hochberg FDR across all valid cells in the layer.
- **Stored per cell:** slope, p, q, σ, n, window and coverage.
- **No data:** cells with fewer than 10 valid years are shown as "no data".

### 6.10 Projections and forecasts (SM-10)

- **Trend continuation (FC-01).**
  - Model: x(t) = μ + β·t + s_m(t) + e(t), where s_m is the seasonal cycle and e is AR(1) noise.
  - Prediction intervals come from seeded AR(1) simulations [H].
  - The horizon is capped at 20 years or half the record length, whichever is smaller. The label "Not a prediction" is always shown.
- **Short-term forecast (FC-02).**
  - Selected candidate: trend + calendar-month seasonality + AR(1), tested against both seasonal-naive and climatology baselines (OD-03).
  - Evaluation: rolling-origin backtests, with monthly origins over the last 60 months or more [H].
  - Metrics: MASE, scaled by the in-sample seasonal-naive MAE (Hyndman & Koehler 2006) [V S26]; and how often the 80% and 95% intervals actually contain the observed values.
  - Shown only if MASE < 1, candidate MAE beats both baselines on common rolling-origin support, and the 95% interval's coverage is between 85% and 100% [H]. Otherwise the app says "no skill beyond the seasonal pattern". Fit transforms, climatology and parameters using training data only at each origin.
- **Scenario context (FC-04, P2).**
  - Regional annual means from NEX-GDDP-CMIP6 (land only, 60°S to 90°N): the ensemble median and range for the chosen SSPs [V S24].
  - Never blended with observations, and never presented as forecast skill.
- **Never** predict extremes or specific events, or show a projection without intervals.

### 6.11 Interpretation rules (SM-11, also shown in the app)

- A trend is not a cause. The app never presents a cause as a finding; it only offers curated, cited "possible processes".
- A regional average can hide opposite trends inside the region. This is the challenge's central warning [S1].
- "Not significant" does not mean "no change". "Significant" does not mean "important", so magnitude is always shown next to variability.
- Model and reanalysis output is always labelled as such. Results depend on the window, so the app shows how sensitive they are to it.

### 6.12 Validation plan (SM-12)

- **Synthetic Monte Carlo:**
  - At least 2,000 runs per case, each 300 months long.
  - Cases:
    - white noise;
    - AR(1) noise with φ = 0.3 and 0.6;
    - linear trend with signal-to-noise ratio 0.5, 1 and 2;
    - seasonal cycle plus trend;
    - summer-only trend;
    - step change;
    - 20% missing months.
  - Measured: false-positive rate, power, slope bias, CI coverage and how grades are distributed.
- **Reference reproduction (VL-02):**
  - SeaWiFS monthly chlorophyll for the boxes in Appendix B, over a nine-year window as close as possible to the paper's (exact months to confirm) [U].
  - Compare with the published outcomes: Amazon, Congo and Orinoco decreasing but not significant; Pearl increasing with p = 0.068 [V S8].
- **Independent checks:**
  - agreement between datasets (VL-03);
  - agreement with stations (VL-04);
  - fixed reference values for every unit conversion.

---

## 7. User workflows

| ID | Workflow | Steps (requirements involved) |
|---|---|---|
| UW-1 | Spin and spot (Living Globe) | 1. Open the app (ED-05). 2. Choose a variable card (VC-02). 3. Read colour and relief (GL-02, GL-03). 4. Switch to "significant only". 5. Play the time-lapse (GL-06). 6. Click a cell (GL-05) and open the case. |
| UW-2 | Investigate a place | 1. Search, draw, or drag the Detective Lens (RG-01, GL-04). 2. Read the Case Board (SC-01–04). 3. Open the top variable. 4. Read the verdict at your level (AN-06, ED-01). 5. Change the window (AN-10). 6. Export (PV-02). |
| UW-3 | Follow a guided investigation | 1. Pick a story (ED-03). 2. Follow the highlighted steps. 3. "Try it yourself" on a new place or variable. |
| UW-4 | Ask the Detective | 1. Ask a question (SI-01, or the rule-based flow VC-03). 2. See suggested variables and why (VC-04). 3. Confirm. 4. Read the Case Board. |
| UW-5 | Compare two places (opposite trends) | 1. Use opposite-trends mode or pick two places (GL-07, RG-05). 2. See the series and trends side by side, with the difference between trends. 3. Read why one process can move a variable in opposite directions in different places (SM-11). |
| UW-6 | Look ahead | 1. Open Outlook (FC-01, FC-02). 2. Read the projection and skill badge. 3. Optionally, the emergence year (FC-03) and scenario context (FC-04). |
| UW-7 | Check the evidence (Scientist level) | 1. Read methods and validation (VL-01–04, PV-04). 2. Check the provenance of any number (PV-01). 3. Download data and results (PV-02). |

**Mapping to the five steps in the challenge video [S2]:**

| Video step | Requirements |
|---|---|
| 1. Decide on the variable(s) | VC-01–04, SI-01 |
| 2. Choose a region (it can be the whole world) | RG-01, RG-02 |
| 3. Select the time period | AN-10 |
| 4. Create and examine the time series | AN-01, AN-02, VZ-01–03 |
| 5. Analyse the trend for significance | AN-03–07 |

---

## 8. Acceptance criteria

| ID | Covers | Criterion |
|---|---|---|
| AC-01 | GL-01, PERF-1 | The globe loads with its basemap and responds to rotation and zoom. During a 10-second spin with a 1° layer on the reference laptop, the median frame rate is at least 30 fps. The GIBS acknowledgment is visible. |
| AC-02 | GL-02, ACC-1 | Every P0 layer legend shows units/decade and the window. At default α=0.05, cells with q ≥ 0.05 differ from cells with q < 0.05 through a channel other than colour; changing α updates this decision channel using the same q values. Under a deuteranopia simulation, positive and negative trends remain distinguishable. |
| AC-03 | GL-03 | The relief scale is documented. Turning relief on or off changes neither colours nor values. |
| AC-04 | GL-04, GL-05, PERF-2 | The labelled cell-level lens preview appears within 300 ms using loaded layers and contains no regional p/q or grade. "Open case" computes the Case Board for the same footprint. Cell click shows value, trend, q, window and sparkline and opens that cell's Case File. |
| AC-05 | GL-06, PERF-1 | The time-lapse plays at 20 fps or more, and the year label matches each frame. For 3 spot-checked years, the ring stripes equal the computed global-mean annual anomalies. |
| AC-06 | GL-07 | On a layer with significant trends of both signs, the mode highlights both sets and lists the 3 largest increasing and decreasing areas with their size in km². "Send to Compare" opens RG-05 with those areas. An automated text check finds no causal wording. |
| AC-07 | RG-01, RG-02 | Whole world, a drawn box, a drawn polygon and a preset each produce a Case Board. The whole-world mean of V01 matches an independent latitude-weighted calculation from the cube to within 0.01 °C. |
| AC-08 | RG-03 | The region summary shows area, cell count, land/ocean fraction and coverage per variable. The opposite-trends warning appears for a test region known to contain significant trends of both signs. |
| AC-09 | RG-05 | Two regions show the same variable and window side by side, with both trends and the difference between them with its CI. |
| AC-10 | VC-01, VC-02 | The catalog lists at least 10 P0 variables. An automated check finds no empty field required by VC-01. |
| AC-11 | VC-03 | With SI switched off, the question flow returns at least 3 relevant variables for each of the challenge's four example places: desert, rain forest, tidal estuary, and the atmosphere above a large city. |
| AC-12 | SC-01–04, PERF-2 | For eligible benchmark land regions declared before testing, scan at least 8 variables within 3 s from the installed cube, showing p/q and exclusions. Test arbitrary boxes, polygons and world separately. Regions with fewer eligible products return truthful available results and explicit reasons; no fabricated eighth result or weakened eligibility rule. |
| AC-13 | AN-03, AN-04 | On a synthetic series with a known slope (signal-to-noise ratio of 1 or more), Sen and OLS slopes are within 5% of the true value. All three significance results are shown. The reference-method output includes the OLS slope, R², F, p and the annual-anomaly regression. |
| AC-14 | AN-05 | The seasonal fingerprint shows 12 monthly slopes with q-values. On a synthetic series with a summer-only trend, only the summer months reach q < 0.05. |
| AC-15 | AN-06 | The grade is shown with its reasons. A synthetic series with a step change at a registered caveat date is graded D or flagged, and never graded A. |
| AC-16 | AN-07 | For non-significant series, the detectability horizon and emergence year are shown, and match a reference notebook implementation within 1 year. |
| AC-17 | AN-10 | With the regional series loaded, changing window, baseline or α completes core statistics and dependent views within 2 s. Outlook may finish separately with visible progress, cancellation and errors; superseded outputs cannot appear current. Record cold geometry/acquisition timings separately. A caveat-crossing window triggers a warning. |
| AC-18 | VZ-01–03, VZ-07, VZ-10, VZ-11 | Every P0 view renders for every P0 variable. The view recommender chooses the view given in the §3.6 table for 5 synthetic scenarios. Every chart has a text summary. |
| AC-19 | FC-01, FC-05, VZ-08 | The projection is labelled "Not a prediction", its horizon is capped, and its prediction interval widens with horizon. The Outlook explanation exists at all three levels. |
| AC-20 | FC-02, VZ-08 | A backtest table shows MASE against seasonal-naive and the interval coverage. On a white-noise series, where no skill is expected, the forecast is hidden or greyed out. |
| AC-21 | SI-01, SI-05 | With SI on, 10 test questions map only to catalog variables, with none invented. With SI off, UW-1, UW-2, UW-3, UW-5 and UW-7 still work. |
| AC-22 | SI-04, CMP-3 | The disclosure page lists every SI tool and how it was used. Every SI-generated image carries a watermark. |
| AC-23 | ED-01, ED-02 | Switching level changes the explanations in all P0 views. An automated check confirms the glossary covers every term used in P0 views. |
| AC-24 | ED-03, DR-01 | Each of the 3 guided investigations runs end to end in snapshot mode within 3 minutes, includes at least one Giovanni-sourced series labelled as such, and ends with "try it yourself". |
| AC-25 | DA-01, DA-05, DA-07, DR-C6 | The cube build for the P0 variables completes, or resumes after an interruption. V01 and V12 are read from the POWER Zarr store. The manifest lists every granule or job, and transfer volume is logged. |
| AC-26 | DA-02, DA-08 | The Giovanni connector retrieves an area-averaged series for a demo region. The quota is checked before submitting, and a repeat request is served from the cache, with its provenance intact. |
| AC-27 | DA-03 | NDVI area statistics for at least 2 demo regions are retrieved via AppEEARS, cached, and can be analysed in the Case File. Their provenance names AppEEARS. |
| AC-28 | DA-09, REL-1 | With the network disabled, the globe, the 3 guided investigations and the demo-region Case Boards all work. |
| AC-29 | PV-01, PV-02 | Every number in an exported case file has a provenance entry. The citation block lists dataset DOIs, the Resources used and the GIBS acknowledgment. |
| AC-30 | VL-01 | On white noise, the false-positive rate is between 3.5% and 6.5% (N ≥ 2,000). On AR(1) noise with φ = 0.6, the corrected tests' false-positive rate is at most 10%, while naive MK shows inflation. Results are shown on the Methods page. |
| AC-31 | VL-02 | For the 10 boxes, a reproduction table shows our slope sign, p-value and classification next to the outcomes the paper states (Amazon, Congo and Orinoco decreasing, not significant; Pearl increasing, p = 0.068). Any differences are explained. |
| AC-32 | SEC-2 | A secret scan of the repository and the client bundle passes. |
| AC-33 | ACC-2 | Main flows work by keyboard alone. Reduced motion turns off auto-rotation and animations. |
| AC-34 | CMP-1, CMP-2 | The credits page lists every dataset (with DOI), Resource, service and library (with licence). The licence inventory contains no non-OSI licence. |
| AC-35 | DEP-01, RG-02, SEC-1–3, REL-1 | Start the packaged local application using its documented command. Complete a new non-preset polygon analysis, change its window, compare two regions and export provenance. Restart preserves validated artifacts and completed results. With the network disabled, installed-cube analysis and the snapshot work; uncached acquisitions show unavailable status. The server binds to loopback and secrets remain outside the bundle. |

---

## 9. Risks and assumptions

### 9.1 Risks

| ID | Risk | Type | Likelihood / impact [H] | Mitigation |
|---|---|---|---|---|
| RK-01 | Giovanni-in-the-Cloud quota, slowness or an outage during the event | Technical | M / H | Check the quota, cache results, build the demo series in the first 6 hours, and fall back to POWER or Earthdata Cloud |
| RK-02 | Bandwidth and time needed to build the cube | Technical | M / H | Subset on the server (DR-C7), start the pipeline in hour 1, build P0 layers first, and rely on the snapshot |
| RK-03 | Slow AppEEARS queues | Technical | M / M | Submit demo-region requests early and cache them; user polygons are P1 |
| RK-04 | Earthdata Login or CMR outage | Technical | L / H | Snapshot mode (DA-09) |
| RK-05 | Poor 3D performance on judges' computers | Technical | M / M | 1° layers, level of detail, 2D fallback, reduced motion |
| RK-06 | Data artifacts mistaken for trends | Scientific | H / H | Caveat registry, default windows, grade D, witness checks |
| RK-07 | False discoveries from scanning many variables or cells | Scientific | H / M | BH-FDR; always show q |
| RK-08 | Overconfident forecasts | Scientific | M / H | Show only forecasts with proven skill; clear labels; horizon caps |
| RK-09 | SI invents variables or numbers | Scientific / ethical | M / H | Catalog-only mapping, templates by default, automatic number check |
| RK-10 | Records ending or changing version (IMERG V07 ends 2025-09; GPCP paused 2024-09; MODIS shutting down) | Data | H / M | Pin versions, set window ends, explain in the app |
| RK-11 | Limitations of models and reanalyses | Scientific | M / M | "Model" labels, independent witnesses, station check |
| RK-12 | Giovanni-in-the-Cloud might not count as the listed "Giovanni" resource | Rules | L / H | Also use a classic Giovanni export in ED-03a; ask the GO Team on Space Apps Connect |
| RK-13 | Judging and submission guides not yet published | Rules | M / M | Review them on release and update this SRS |
| RK-14 | Scope creep, given the many P0 and P1 items | Delivery | H / M | Build P0 first; feature-freeze gate |
| RK-15 | Missing licences or attributions | Compliance | M / M | Credits page and licence scan (CMP-1, CMP-2) |
| RK-16 | KNMI's human-verification gate blocks automated access | Data | H / L | Use it manually only (P2) |

### 9.2 Assumptions

- **AS-01** Every team member can get a free Earthdata Login account [V].
- **AS-02** The Giovanni-in-the-Cloud monthly quota is enough for the demo's volume. Verify this in the first hour.
- **AS-03** TDD metadata checks confirmed POWER `T2M` in C and `ALLSKY_SFC_SW_DWN` in W m⁻² [V-live]. Actual subset access, missing-value behavior and the final source-edition/window still require validation.
- **AS-04** Team laptops can run the backend and build the cube: at least 16 GB of RAM and 50 GB of free disk [H].
- **AS-05** The reference laptop for performance has integrated graphics and runs the current Chrome [H].
- **AS-06** Judges can open a public repository or demo link. Snapshot mode needs no credentials [H].
- **AS-07** SeaWiFS and MODIS-Aqua monthly chlorophyll can be downloaded from OB.DAAC with Earthdata Login. The catalogs are verified [V]; downloading has not been tested.
- **AS-08** SI coding assistants may be used if their use is disclosed [V].

### 9.3 Open decisions (to settle in the architecture phase)

- **OD-01 Globe engine — resolved:** globe.gl + Three.js with instanced cells; performance validation remains mandatory.
- **OD-02 Hosting — resolved:** local full application with FastAPI serving built React assets, bounded worker, SQLite and persistent cube/artifacts. Offline snapshot and a second local copy provide recovery. Public deployment is deferred; any later cloud deployment requires a separate decision and security/capacity review.
- **OD-03 Forecasting — resolved:** one trend + month seasonality + AR(1) candidate; seasonal-naive and climatology are independent baselines, with SM-10 release gates.
- **OD-04 SI model — resolved:** none in P0; deterministic discovery/explanations. Optional P1 SI retains its original scope and disclosure rules.
- **OD-05 Cube resolution — resolved:** 0.5° where supported, native MERRA-2 and coarser grids retained, 1° globe display with area-overlap aggregation (DR-C1).
- **OD-06 Basemap — resolved:** GIBS `BlueMarble_ShadedRelief_Bathymetry`, geographic EPSG:4326, derived offline texture and mandatory attribution.

---

## 10. Challenge traceability

| Challenge element | Source | Satisfied by | Verified by |
|---|---|---|---|
| Select variables from missions or models | [S1] Summary, Objective 1; video step 1 | VC-01–05, SI-01, SC-01 | AC-10, AC-11, AC-21 |
| Acquire the data for a particular region (can be global) | Objective 2; video step 2 | RG-01–03, DA-01–07 | AC-07, AC-25, AC-26, AC-27 |
| Select the time period | Video step 3 | AN-10 | AC-17 |
| Generate and visualize a long enough time series | Objective 3; video step 4 | AN-01, AN-02, VZ-01–03, SM-02, SM-03 | AC-18 |
| Rate of change ("how much") | Summary; Objective 4 | AN-03, SC-01, SM-04 | AC-13 |
| Significance (t-test, Mann–Kendall or CI; p < 0.05) | Objective 4; video 3:34–3:57 | AN-04, SM-05, SM-06 | AC-13, AC-30 |
| What is changing, and where | Summary | GL-02–07, SC-01, RG-03 | AC-02, AC-04, AC-06, AC-12 |
| Both visualization and analysis (full scope) | Objectives, closing paragraph | All VZ and AN requirements | AC-18 |
| The same variable trending in opposite directions in different regions | Summary; Background | GL-07, RG-03, RG-05, UW-5, SM-11 | AC-06, AC-08, AC-09 |
| Simple variables (temperature, rainfall) and complex ones (evaporation, streamflow) | Background | V01–V03, V05, V06, V18 | AC-10 |
| Land, ocean and levels of the atmosphere | Background | Land: V04–V07, V13. Ocean: V11. Atmosphere: V08–V10, plus V24 (P2) | AC-10 |
| Named sources: MODIS, OMI, AIRS, GPM, MERRA-2, GLDAS | Background | MODIS: V11, V13. OMI: V09. AIRS: V08. GPM: V03. MERRA-2: V01, V10. GLDAS: V04–V07. | AC-10 |
| Audience of students and the public | Considerations: Audience | ED-01, ED-02, ED-05, USE-1, USE-2 | AC-23 |
| Simple definitions of the variables | Considerations: Audience | VC-01, ED-02 | AC-10, AC-23 |
| The "data detectives" idea | Considerations: Audience | GL-04, SC-01, ED-03, SM-07 | AC-24 |
| A short series of questions leading to variables | Considerations: Approach | VC-03, SI-01 | AC-11, AC-21 |
| Demonstration examples users can watch | Considerations: Approach | ED-03, ED-05 | AC-24 |
| SI to find data likely to show trends (news and papers, or the type of region) | Considerations: Approach | SI-01, SI-02, RG-04, VC-04 | AC-11, AC-21 |
| Daily and monthly data are easiest to work with | Considerations: Working with the data | Monthly data as the basis (SM-02, DR-C2) | AC-25 |
| Non-significant trends are still interesting; a longer record may make them significant | Considerations: Working with the data; video 4:06 | AN-07, VZ-07, FC-03 | AC-16 |
| Consider CUAHSI tools | Considerations: Working with the data | Considered. CUAHSI's HIS is being modernized and NASA Data Rods are discontinued, so point hydrology comes through DA-04 instead (§5.1). | — |
| Remove the seasonal cycle; linear trends are enough | Considerations: Working with the data | SM-03, SM-04, AN-05 | AC-14 |
| Trends within a particular season | Video 2:10–2:23 | AN-05, VZ-03 | AC-14 |
| The video's example: aerosol optical depth over Wisconsin | Video 2:23–3:30 | ED-03a, V10, plus a classic Giovanni export | AC-24 |
| Use the listed Resources (Giovanni, Hydrology Time Series, AppEEARS, CDO, the reference article) | [S3] | DA-02, DA-04, DA-03, DA-06, AN-04(a), VL-02 (§5.1) | AC-26, AC-27, AC-31 |
| Use at least one NASA source from the Resources (Global Awards) | [S6] | DR-01, DA-02, ED-03 | AC-24, AC-26 |
| SI disclosure; no NASA branding | [S5, S6] | SI-04, CMP-3 | AC-22 |
| Judging: Impact, Creativity, Validity, Relevance, Presentation | [S7a] | §1.8 | All acceptance criteria |

---

## Appendix A: Sources

### Challenge and rules

- **S1** Challenge Details: <https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=details> (reproduced in README.md)
- **S2** Challenge video: <https://youtu.be/Cd9Q48LhNbo> (transcript in README.md)
- **S3** Challenge Resources: <https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources> (reproduced in README.md)
- **S4** Space Apps 2026: <https://www.spaceappschallenge.org/2026/>
- **S5** Participant FAQ: <https://www.spaceappschallenge.org/resources/participant-faqs/>
- **S6** GO Team answer on eligibility and AI use: <https://github.com/nasa/spaceapps/discussions/1849>
- **S7** Judging and submission context:
  - (a) <https://business-review.eu/tech/it/innovation-feasibility-and-relevance-among-the-criteria-for-evaluating-projects-at-nasa-space-apps-challenge-302778>
  - (b) <https://2020.spaceappschallenge.org/assets/documents/460/Space_Apps_2020_Project_Submission_Guide.pdf>
  - (c) <https://hackathlone.com/blogs/how-judging-works>
  - (d) <https://www.spaceappschallenge.org/2025/awards/>

### Reference paper

- **S8** Acker, J. G., McMahon, E., Shen, S., Hearty, T., Casey, N. (2009). *Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in River-Influenced Coastal Regions.* EARSeL eProceedings 8(2). <https://ntrs.nasa.gov/citations/20090042747>

### Services

- **S9** Giovanni:
  - <https://giovanni.gsfc.nasa.gov/>
  - Giovanni-in-the-Cloud tutorial: <https://github.com/nasa/gesdisc-tutorials/blob/main/notebooks/How_To_Access_the_Giovanni_Averaging_Service_Using_Python.ipynb>
  - Configured variables: <https://api.giovanni.earthdata.nasa.gov/configured-variables/>
  - Weighting: <https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html>
- **S10** GES DISC:
  - Migration notice: <https://github.com/nasa/gesdisc-tutorials/blob/main/user-guidance/GES_DISC_Migration_to_Earthdata_Website_and_Earthdata_Cloud.md>
  - Hydrology Time Series: <https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series>
  - Point API forum thread: <https://forum.earthdata.nasa.gov/viewtopic.php?t=7938>
- **S11** AppEEARS:
  - <https://appeears.earthdatacloud.nasa.gov/>
  - API: <https://appeears.earthdatacloud.nasa.gov/api/>
  - Earthdata overview: <https://www.earthdata.nasa.gov/data/tools/appeears>
- **S12** NOAA CDO:
  - <https://www.ncei.noaa.gov/cdo-web/>
  - Web Services v2: <https://www.ncei.noaa.gov/cdo-web/webservices/v2>
  - Access Data Service: <https://www.ncei.noaa.gov/access/search/documentation/data-service/>
- **S13** KNMI Climate Explorer: <https://climexp.knmi.nl/>
- **S14** NASA POWER:
  - Monthly API: <https://power.larc.nasa.gov/docs/services/api/temporal/monthly/>
  - AWS: <https://power.larc.nasa.gov/docs/services/aws/>
  - AWS tutorial: <https://power.larc.nasa.gov/docs/tutorials/service-data-request/aws/>

### Datasets

- **S15** GLDAS:
  - <https://www.earthdata.nasa.gov/data/catalog/ges-disc-gldas-noah025-m-2.1>
  - Forcing data: <https://ldas.gsfc.nasa.gov/gldas/forcing-data>
  - data.gov record: <https://catalog.data.gov/dataset/gldas-noah-land-surface-model-l4-monthly-0-25-x-0-25-degree-v2-1-gldas_noah025_m>
  - GLDAS-2.0 vs 2.1 trends: <https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2018JD029116>
- **S16** MERRA-2:
  - <https://www.earthdata.nasa.gov/data/catalog/ges-disc-m2tmnxslv-5.12.4>
  - DOIs: <https://gmao.gsfc.nasa.gov/gmao-products/merra-2/citing-merra-2-data_merra-2/>
  - Expert guidance: <https://ntrs.nasa.gov/api/citations/20170010657/downloads/20170010657.pdf>
- **S17** IMERG:
  - <https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergm-07>
  - V07 release notes: <https://gpm.nasa.gov/sites/default/files/2024-12/IMERG_V07_ReleaseNotes_241126.pdf>
  - V08 schedule: <https://gpm.nasa.gov/data/news/update-imerg-v08-transition-schedule-aug-2026>
- **S18** GPCP: <https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpcpmon-3.3>
- **S19** OMI:
  - <https://www.earthdata.nasa.gov/data/catalog/ges-disc-omno2d-003>
  - Row anomaly: <https://ozoneaq.gsfc.nasa.gov/content/public/OMI/READMEs/README.OMNO2.pdf>
  - Aura orbit: <https://science.nasa.gov/missions/potential-evolution-of-the-aura-mission/>
- **S20** AIRS:
  - <https://www.earthdata.nasa.gov/data/catalog/ges-disc-airs3stm-7.0>
  - V7 products: <https://airs.jpl.nasa.gov/data/products/v7-L2-L3/>
- **S21** MODIS and mission status:
  - <https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs>
  - <https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/>
  - Orbit drift: <https://doi.org/10.1117/12.3112406>
- **S22** Ocean colour:
  - MODIS-Aqua: <https://www.earthdata.nasa.gov/data/catalog/ob-cloud-modisa-l3m-chl-2022.0>
  - SeaWiFS: <https://www.earthdata.nasa.gov/data/catalog/ob-cloud-seawifs-l3m-chl-2022.0>
- **S23** GRACE/GRACE-FO: <https://podaac.jpl.nasa.gov/dataset/TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4>
- **S24** NEX-GDDP-CMIP6:
  - <https://registry.opendata.aws/nex-gddp-cmip6/>
  - <https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/>
- **S25** GIBS and data-use guidance:
  - <https://nasa-gibs.github.io/gibs-api-docs/>
  - <https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance>

### Methods and libraries

- **S26** Statistics:
  - Hamed & Rao 1998: <https://doi.org/10.1016/s0022-1694(97)00125-x>
  - Yue & Wang 2002: <https://doi.org/10.1029/2001WR000861>
  - Santer et al. 2000: <https://www.arl.noaa.gov/wp_arl/wp-content/uploads/documents/JournalPDFs/SanterEtal.JGR2000.pdf>
  - Wilks 2016: <https://doi.org/10.1175/bams-d-15-00267.1>
  - Weatherhead et al. 1998: <https://doi.org/10.1029/98jd00995>
  - Hawkins & Sutton 2012: <https://doi.org/10.1029/2011GL050087>
  - Hyndman & Koehler 2006: <https://doi.org/10.1016/j.ijforecast.2006.03.001>
  - pyMannKendall: <https://doi.org/10.21105/joss.01556>
- **S27** Candidate libraries:
  - globe.gl: <https://github.com/vasturiano/globe.gl/>
  - CesiumJS: <https://github.com/CesiumGS/cesium/blob/main/README.md>
  - MapLibre GL JS globe: <https://maplibre.org/roadmap/maplibre-gl-js/globe-view/>
  - Apache ECharts: <https://github.com/apache/echarts/>
  - ECharts-GL: <https://github.com/ecomfe/echarts-gl/>

## Appendix B: Reference regions from Acker et al. 2009 [V S8]

Each region is a 0.5° × 0.5° box as close to a river mouth as possible, while keeping its mean chlorophyll at or below 1 mg m⁻³.

| River | North | South | West | East |
|---|---|---|---|---|
| Amazon | 8.0 | 7.5 | −51.0 | −50.5 |
| Congo | −5.0 | −5.5 | 2.0 | 2.5 |
| Eel | 41.5 | 41.0 | −125.9 | −125.4 |
| Ganges | 20.3 | 19.8 | 89.4 | 89.9 |
| Guadalquivir | 36.5 | 36.0 | −6.8 | −6.3 |
| Mississippi (east) | 29.6 | 29.1 | −86.75 | −86.25 |
| Mississippi (west) | 28.75 | 28.25 | −94.0 | −93.5 |
| Orinoco | 12.5 | 12.0 | −64.8 | −64.3 |
| Pearl | 22.5 | 22.0 | 117.5 | 118.0 |
| Po | 44.5 | 44.0 | 13.5 | 14.0 |

These coordinates come from automatic text extraction of the paper's table. Check them against the PDF before use [P].
