# Iris — Complete Platform Documentation

<span class="version-badge">v1.0.2-SRS-2026.11 · November 2026</span>

---

## Table of Contents

1. [Introduction & Mission](#1-introduction--mission)
2. [Platform Architecture](#2-platform-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Getting Started](#4-getting-started)
5. [Public Website Pages](#5-public-website-pages)
6. [Investigative Workspace](#6-investigative-workspace)
   - 6.1 [Super Intelligence](#61-super-intelligence)
   - 6.2 [Data Selection](#62-data-selection)
   - 6.3 [Data Preview](#63-data-preview)
   - 6.4 [Data Analysis — Scientific Case File](#64-data-analysis--scientific-case-file)
   - 6.5 [Plot & Visualize Studio](#65-plot--visualize-studio)
   - 6.6 [Living Globe (Spatial Visualization)](#66-living-globe-spatial-visualization)
   - 6.7 [Case Studies](#67-case-studies)
   - 6.8 [Existing Research](#68-existing-research)
   - 6.9 [Dataset & ML Forecasts Workspace](#69-dataset--ml-forecasts-workspace)
   - 6.10 [Disaster & Hazard Evidence Investigations](#610-disaster--hazard-evidence-investigations)
7. [Investigation Workflows](#7-investigation-workflows)
   - 7.1 [Track A — Live Ad-Hoc Discovery](#71-track-a--live-ad-hoc-discovery)
   - 7.2 [Track B — Global Evidence Cube](#72-track-b--global-evidence-cube)
   - 7.3 [Forecast-First Track](#73-forecast-first-track)
8. [Scientific Methodology](#8-scientific-methodology)
9. [Data Sources & Variables](#9-data-sources--variables)
10. [Backend API Reference](#10-backend-api-reference)
11. [Data Provider Capability Matrix](#11-data-provider-capability-matrix)
12. [Global Trend Cube (SRS v1.0)](#12-global-trend-cube-srs-v10)
13. [Evidence Grades & Validation](#13-evidence-grades--validation)
14. [AI / Super Intelligence Governance](#14-ai--super-intelligence-governance)
15. [Dataset & Machine Learning Forecast System](#15-dataset--machine-learning-forecast-system)
16. [Immersive Visualization Studio](#16-immersive-visualization-studio)
17. [Use Cases](#17-use-cases)
18. [Deployment & Local Development](#18-deployment--local-development)
19. [Testing & Verification](#19-testing--verification)
20. [Glossary](#20-glossary)
21. [External Resources & References](#21-external-resources--references)

---

## 1. Introduction & Mission

**Iris** is an open Earth intelligence platform that lets anyone investigate long-term environmental change using decades of real satellite and climate observations — without needing a background in data science or remote sensing.

Iris is designed around a detective metaphor: users pose an environmental question, and the platform walks them through a reproducible, statistically rigorous evidence trail — from raw data to a defensible verdict. Every conclusion is fully transparent and traceable.

### Mission Statement

> "Earth data is abundant. Clear answers are not."

Publicly funded Earth observations should become public understanding. Iris closes that gap by combining trusted data, robust statistics, and plain-language explanations — without hiding the scientific process or overstating certainty.

### Core Objectives

The platform addresses four key challenges in Earth system trend analysis:

1. **Variable Selection** — Identify Earth science variables of interest that can be investigated for potential trends, from familiar ones (temperature, rainfall) to more complex ones (evaporation, soil moisture, vegetation indices)
2. **Data Acquisition** — Acquire the data variables for a particular region, with live queries to NASA and NOAA data archives
3. **Visualization** — Generate and visualize a time series for the variable and region of interest over a long enough period for statistical analysis
4. **Statistical Analysis** — Perform rigorous trend analysis indicating the rate of change over time, and test trend significance using Mann-Kendall, t-tests, and confidence intervals

### Design Principles

| Principle | Description |
|---|---|
| **Show the evidence** | Every verdict exposes its source data, transformation choices, uncertainty, and limitations |
| **Explain, don't obscure** | Plain language makes rigorous science accessible without flattening nuance |
| **Respect uncertainty** | An inconclusive result is useful — Iris never forces a dramatic story from a weak signal |
| **Build in the open** | Public Earth observations should become public understanding and better local decisions |

### Who Iris Is For

| Audience | Use Case |
|---|---|
| **Researchers & students** | Rapidly inspect signals before deeper analysis; explore climate trends for projects or courses |
| **Journalists & communicators** | Ground local environmental stories in traceable, defensible evidence |
| **Planners & communities** | Understand how environmental conditions are changing in their region |
| **Educators** | Demonstrate Earth science concepts with live satellite data, no programming required |
| **Citizens** | Explore whether their region is warming, drying, or greening |

> Iris supports early exploration and communication. It complements — not replaces — domain expertise and peer-reviewed research.

### Key Capabilities at a Glance

| Capability | Description |
|---|---|
| **Live data discovery** | Search NASA, MODIS, and NOAA catalogs using plain English |
| **Time-series extraction** | Pull decades of monthly observations for any region on Earth |
| **Trend detection** | Apply robust non-parametric statistics (Mann-Kendall + Sen's slope) |
| **Seasonal decomposition** | Remove recurring cycles with STL to reveal long-term signals |
| **Anomaly detection** | Automatically flag observations outside expected variability |
| **Global evidence cube** | Browse pre-computed trend maps for the entire planet (1981–2025) |
| **Forecast exploration** | Inspect 51-member ECMWF ensemble precipitation forecasts at six configured points |
| **Hazard event investigation** | Historical disaster event investigations with real NASA POWER and Meteomatics data |
| **Immersive 3D visualization** | Docked, resizable chart panels with seasonal 3D landscapes, heatmaps, and trend evidence |
| **Case File export** | Download a full provenance record for any investigation as JSON or CSV |
| **Peer-reviewed literature links** | Connect investigations to relevant published science via OpenAlex and DataCite |

---

## 2. Platform Architecture

Iris is a layered system: a public-facing web application, a workspace for scientific investigation, and a backend data-and-analysis service that handles live discovery and statistical computation.

### High-Level Structure

| Layer | Role | Examples |
|---|---|---|
| **Frontend** | Product experience and user workflows | Next.js App Router pages, workspace panels, landing |
| **Workspace** | Analytical operations | Super Intelligence chat, data selection, analysis, globe, studio |
| **Backend API** | Live discovery and scientific computation | FastAPI endpoints, provider adapters, analytics services |
| **Data providers** | Upstream scientific data access | NASA POWER, CMR, AppEEARS, GES DISC, NOAA, Meteomatics |
| **Scientific engine** | Calculations and evidence generation | Trend tests, decomposition, anomaly checks, case files |
| **AI layer** | Natural language interpretation only | Gemini Flash-Lite for query parsing and result explanation |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC WEBSITE                           │
│  Landing · Platform · Methodology · Data · Case Studies · About │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    INVESTIGATIVE WORKSPACE                       │
│                                                                  │
│  Super Intelligence   →  Data Selection  →  Data Preview        │
│          ↓                                       ↓              │
│  Case Studies           Data Analysis ← Forecast Workspace      │
│          ↓                    ↓                                  │
│  Research             Plot & Visualize                          │
│                               ↓                                 │
│                        Living Globe                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Next.js API proxy
┌───────────────────────────────▼─────────────────────────────────┐
│                      FASTAPI BACKEND                            │
│                                                                  │
│Super Intel│  Catalog Discovery  │  Extraction  │  Analysis      │
│  Forecasts│  Hazards            │  Visualization│  Research     │
└─────┬─────┴──────────┬──────────┴──────────────┴────────────────┘
      │                │
┌─────▼─────┐   ┌──────▼──────────────────────────────────────────┐
│  Gemini   │   │           UPSTREAM DATA PROVIDERS                │
│ Flash-Lite│   │  NASA POWER · CMR · AppEEARS · GES DISC         │
│(Super-Int)│   │  Harmony · NOAA CDO · Meteomatics · Open-Meteo  │
└───────────┘   └─────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Strict separation of AI and science:** The AI component (Gemini Flash-Lite) is used only for natural language interpretation of queries and plain-language explanation of results. It never performs, modifies, or influences any statistical calculation.
- **Zero synthetic data in production:** All numbers visible to users come from real upstream APIs or verified, SHA-256-hashed, pinned real snapshots. Synthetic fixtures are strictly limited to test harnesses.
- **Additive backend extension:** The visualization and forecast features are added via `visualization_app.py`, which registers routes on the existing `main:app` without editing backend source files.
- **Immutable extraction jobs:** A Case File analysis is always bound to the specific extracted source job it was run on. Visualization never reruns analysis automatically.

---

## 3. Technology Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 15.x (App Router) | Framework, routing, SSR/SSG |
| React | 19.0 | UI rendering |
| TypeScript | 5.7 | Static types |
| Tailwind CSS | 4.0 | Styling |
| MapLibre GL | 6.18 | 2D map rendering |
| CesiumJS | 1.147.0 | 3D globe rendering |
| NASA GIBS | — | Progressive tiled satellite imagery (token-free) |
| ECharts | 6.0 | 2D scientific charts |
| ECharts-GL | 2.1 | 3D chart rendering (seasonal landscape, 3D track) |
| Three.js | 0.186 | 3D scene rendering (seasonal orbit, track) |
| COBE | 2.0.1 | Interactive landing globe |
| Dockview-React | 8.8.3 | Dockable/resizable visualization studio panels |
| @turf/turf | 7.4 | Geospatial operations |
| @mapbox/mapbox-gl-draw | 1.5.2 | Interactive bounding-box drawing |
| Lucide-React | 0.475 | Icon set |
| react-map-gl | 8.1.3 | React bindings for MapLibre |
| pnpm | 12.18.0 (pinned) | Package manager |

### Backend

| Technology | Version | Role |
|---|---|---|
| Python | 3.13 | Runtime |
| FastAPI | — | REST API framework |
| uvicorn | — | ASGI server |
| httpx | — | Async HTTP client for provider calls |
| NumPy | — | Numerical computation |
| pandas | — | Time-series manipulation |
| SciPy | — | Statistical functions (OLS, Kendall tau) |
| pymannkendall | — | Mann-Kendall and Sen's slope tests |
| statsmodels | — | STL decomposition, seasonal analysis |
| uv | — | Python package manager |

### Infrastructure

| Component | Description |
|---|---|
| Node.js | 24 (required for frontend dev) |
| PostCSS | CSS processing |
| Playwright | 1.65.0 — browser-level integration tests |
| Node test runner | Unit/integration tests for frontend logic |

---

## 4. Getting Started

### Prerequisites

- **Node.js 24** (required; check with `node --version`)
- **pnpm 12.18.0** (pinned; use `npx --yes pnpm@12.18.0`)
- **Python 3.13** (for backend; check with `python --version`)
- **uv** (Python package manager; install with `pip install uv`)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for live data retrieval from NASA APIs)

No account or login is required for the base platform. Some providers require credentials (see [Data Provider Capability Matrix](#11-data-provider-capability-matrix)).

### Frontend Quick Start

```powershell
# From the repository root
npx --yes pnpm@12.18.0 install --frozen-lockfile
npx --yes pnpm@12.18.0 dev --hostname 127.0.0.1 --port 3000
```

The app will be available at [http://127.0.0.1:3000](http://127.0.0.1:3000).

The `postinstall` script automatically copies:
- CesiumJS assets to `public/` (via `scripts/copy-cesium-assets.mjs`)
- MapLibre worker to `public/` (via `scripts/copy-maplibre-worker.mjs`)

### Backend Quick Start

```powershell
# Main backend (scientific pipeline, catalog, extraction, analysis)
cd backend
uv venv --python 3.13 .venv
uv pip sync --python .venv/Scripts/python.exe requirements.txt
.venv/Scripts/python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Optional: Visualization extension (adds spatial field routes)
uv pip sync --python .venv/Scripts/python.exe visualization-requirements.lock
.venv/Scripts/python.exe -m uvicorn visualization_app:app --host 127.0.0.1 --port 8000
```

The frontend's Next.js API routes proxy all `/api/v1/*` requests to `FASTAPI_URL` (defaults to `http://127.0.0.1:8000`).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FASTAPI_URL` | No | Backend URL (default: `http://127.0.0.1:8000`) |
| `GEMINI_API_KEY` | Yes (for Super Intelligence) | Google Gemini API key for Super Intelligence |
| `EARTHDATA_TOKEN` | Yes (for GES DISC) | NASA Earthdata bearer token |
| `METEOMATICS_USERNAME` | Yes (for forecasts/hazards) | Meteomatics API credentials |
| `METEOMATICS_PASSWORD` | Yes (for forecasts/hazards) | Meteomatics API credentials |

> **Security:** Never use `NEXT_PUBLIC_` prefix for credentials. Never embed credentials in URLs. Keep `METEOMATICS_USERNAME`/`PASSWORD` in `backend/.env` (gitignored). See `backend/meteomatics.env.example` for the template.

### Development Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `pnpm dev` | Start Next.js development server |
| `build` | `pnpm build` | Production build |
| `start` | `pnpm start` | Serve production build |
| `lint` | `pnpm lint` | ESLint |
| `docs:dev` | `pnpm docs:dev` | Serve documentation at port 3001 |
| `test:visualization` | `pnpm test:visualization` | Node.js unit/integration tests |
| `test:visualization:browser` | `pnpm test:visualization:browser` | Playwright browser tests |

---

## 5. Public Website Pages

The public website is the product-facing layer, separate from the investigation workspace.

### Landing Page (`/`)

The landing page introduces Iris and provides an entry point to the workspace.

**Sections:**
- **Hero** — Headline ("Detect environmental trends before they become headlines"), with CTAs to start investigating and learn how it works
- **Interactive COBE Globe** — Lazily loaded 3D globe with six configured precipitation forecast markers (Colombo, Kathmandu, etc.); clicking any marker opens the forecast workspace for that location. This is a navigation view, not a data layer.
- **Signal Demo** — Live animated chart showing a temperature trend example (Sen's slope visualization)
- **Platform Overview** — Three capability cards with key statistics:
  - 40+ years of observations
  - 95% confidence threshold
  - 18 analysis-ready variables
- **Signal Marquee** — Scrolling list of available environmental signals (Air temperature, Soil moisture, Vegetation, Precipitation, Solar radiation, Humidity)
- **Methodology Steps** — Four-step overview: Frame the question → Prepare the evidence → Test the trend → Measure the change
- **Data World** — Data sources overview with statistics (18 variables, 40+ years, global coverage)
- **Featured Cases** — Three pre-built investigation cards:
  - Los Angeles, USA — Two decades of urban warming (+0.42°C, 99.86% confidence)
  - Central Valley, USA — The signature of a historic drought (−18.7mm, 98.2% confidence)
  - Amazon Basin, Brazil — Forest resilience under pressure (−0.08 NDVI, 95.4% confidence)
- **About Preview** — Mission statement and core principles
- **CTA** — "Follow the signal. Find the story in the data."

### Platform Page (`/platform`)

End-to-end investigation workflow and platform capabilities overview. Documents the full analytical workflow from query to verdict.

### Methodology Page (`/methodology`)

The 5-stage scientific evidence pipeline, with formulas, interactive FAQ, Evidence Grade rubric, Validation Lab benchmarks, and Super Intelligence disclosure.

**Five-Stage Pipeline:**
1. Define the question — Region + variable + timeframe
2. Prepare the signal — QC + area weighting + STL
3. Test for a trend — Non-parametric significance (Mann-Kendall)
4. Measure the change — Robust effect size (Sen's slope)
5. Interrogate anomalies — Z-score + clue engine

**Statistical Methods Displayed:**
- Mann-Kendall: S = Σ sgn(xⱼ − xᵢ)
- Sen's slope: β = median((xⱼ − xᵢ)/(j − i))
- Evidence Grades A–D with deterministic criteria
- Validation Lab benchmarks (VAL-01 through VAL-05)
- AI / Super Intelligence Disclosure: permitted and prohibited roles

**Interactive FAQ:**
- Why Mann-Kendall instead of linear regression?
- What does statistical significance mean here?
- How is seasonality removed?
- Can a result be stable or inconclusive?

### Data Page (`/data`)

Searchable and category-filterable GCMD (Global Change Master Directory) Earth observation catalog. Users can browse all available variables by category, resolution, provider, and temporal coverage.

### Case Studies Page (`/case-studies`)

Featured investigation (IR–042) and filterable public case library. Showcases pre-built investigations with real data and full provenance.

### About Page (`/about`)

Mission manifesto, design principles, and target investigators. Explains why Iris exists and who it serves.

---

## 6. Investigative Workspace

The workspace (`/workspace`) is the main analytical environment where investigations happen. It is accessible from "Start investigating" or "Open workspace" on any public page.

### Workspace Layout

```
┌────────────────────┬──────────────────────────────────────────┐
│                    │  Top bar: page title, theme toggle        │
│    Sidebar         ├──────────────────────────────────────────┤
│                    │                                          │
│  Navigation        │          Main content area               │
│  groups:           │          (changes per workspace section) │
│  · Investigate     │                                          │
│  · Research        │                                          │
│  · Forecast        │                                          │
│                    │                                          │
│  Docs / GitHub     │                                          │
└────────────────────┴──────────────────────────────────────────┘
```

The sidebar can be collapsed to icons-only mode. On mobile, it opens as a drawer. The light/dark theme is toggled from the top bar and applies to all workspace panels including the docked visualization studio.

### Workspace Routes

| Route | Name | Description |
|---|---|---|
| `/workspace` | Workspace home | Redirects to Data Analysis by default |
| `/workspace/intelligence` | Super Intelligence | Natural-language query and AI catalog routing |
| `/workspace/data-selection` | Data Selection | Configure extraction parameters and spatial extent |
| `/workspace/data-preview` | Data Preview | Inspect extracted series before analysis |
| `/workspace/data-preview/[jobId]` | Job Preview | Direct link to a specific extraction job |
| `/workspace/data-analysis` | Data Analysis | Scientific Case File analysis |
| `/workspace/visualize` | Plot & Visualize | Docked immersive visualization studio |
| `/workspace/globe` | Living Globe | 3D CesiumJS globe with spatial field overlays |
| `/workspace/case-studies` | Case Studies | Curated benchmark investigations |
| `/workspace/case-studies/[caseId]` | Individual Case | Specific case study (e.g., nepal-floods-2024) |
| `/workspace/forecasts` | Forecasts | Multi-variable historical ML forecasts and legacy ensembles |
| `/workspace/research` | Existing Research | Dataset-matched peer-reviewed literature |

---

### 6.1 Super Intelligence

**Route:** `/workspace/intelligence`

The entry point for Track A (live ad-hoc discovery). Super Intelligence is a natural-language conversational interface that translates investigation questions into structured data catalog searches.

#### How It Works

1. **User describes a topic** — in plain English (e.g., "Monthly precipitation and soil moisture trends in Sri Lanka")
2. **Super Intelligence interprets the query** — powered by Gemini Flash-Lite, the AI extracts: subject domain, scientific category, inferred region name, inferred coordinates/bounding box, inferred date range, inferred cadence
3. **Keyword review step** — Super Intelligence proposes keywords and data sources; user reviews and can add/remove keywords or toggle providers before searching
4. **Catalog search** — only after user confirmation, Super Intelligence queries selected data providers concurrently
5. **Results** — matched datasets are shown with capability states and routed to Data Selection

> **Important:** No data catalogs are queried until the user explicitly confirms the proposed search. This prevents accidental API calls and gives users control over what sources are searched.

#### Conversation Stages

| Stage | What Happens |
|---|---|
| `topic_discovery` | AI processes user message, extracts intent, proposes keywords |
| `keyword_confirmation` | User reviews and confirms keywords and data sources before catalog search |

#### Built-in Research Suggestions

The Super Intelligence interface shows four suggested research topics on first load:
- Monthly precipitation and soil moisture trends in Sri Lanka
- Heatwave and surface temperature trends in California
- Vegetation greenness and rainfall in the Amazon Basin
- Snow cover and surface temperature in Nepal

#### Provider Selection

Users can select from all available upstream providers. The "Select all" and "Clear" shortcuts make it easy to control which catalogs are searched.

#### Super Intelligence Disclosure

Super Intelligence is strictly limited to conversational assistance. It is explicitly prohibited from performing scientific computation. See [AI / Super Intelligence Governance](#14-ai--super-intelligence-governance).

---

### 6.2 Data Selection

**Route:** `/workspace/data-selection`

The dataset configuration step of Track A. After Super Intelligence returns matched datasets, users configure the extraction parameters.

#### Configuration Parameters

| Parameter | Description |
|---|---|
| **Dataset** | Selected product from the Super Intelligence discovery results |
| **Variable** | The specific variable layer within the dataset |
| **Region / Location** | Geographic extent (bounding box, point, or geocoded place name) |
| **Start date** | Beginning of the requested time window |
| **End date** | End of the requested time window |
| **Cadence** | Temporal frequency (Daily, 8-Day, 16-Day, Monthly) |
| **Aggregation** | Spatial aggregation method (area-weighted mean, sum, etc.) |

#### Spatial Selection

An interactive map allows users to:
- Draw a bounding box by dragging on the map
- Use the geocoder to resolve a place name to coordinates
- Use preset extent options (globe, Europe, custom)
- Review the filled coordinates before confirming

The geocoder returns its top match; users always review the filled coordinates before retrieval. A region name does not imply a polygon average.

---

### 6.3 Data Preview

**Route:** `/workspace/data-preview` or `/workspace/data-preview/[jobId]`

Inspect the extracted time-series before running analysis.

#### What the Preview Shows

| Component | Description |
|---|---|
| **Variable Flashcard** | Key metadata: variable name, provider, cadence, units, spatial support |
| **Gap-aware chart** | Time-series chart with missing values as gaps (never filled) |
| **Quality KPIs** | Valid observation count, completeness %, missing value count |
| **Spatial bounding-box slice** | Map showing the geographic extent of the extraction |
| **Paginated observation table** | Filterable monthly observation table with QA flags |
| **Quality summary** | Distribution of valid vs. flagged vs. missing observations |

#### Export Options

Raw observations can be exported as CSV or JSON directly from the Data Preview, with:
- Source URL and SHA-256 hash of the upstream response
- Coordinates and spatial support details
- Retrieval timestamp
- Quality flags for each observation

---

### 6.4 Data Analysis — Scientific Case File

**Route:** `/workspace/data-analysis`

The shared scientific analysis engine used by both Track A and Track B. This is where the full statistical pipeline runs.

#### Running Analysis

1. Navigate to Data Analysis from a completed extraction preview (or via the sidebar)
2. If a `forecastId` query param is present, the forecast workspace loads automatically
3. For historical analysis: choose a **Seasonal treatment** and select one or more **analysis methods**
4. Click **Run selected analysis** — analysis only runs when explicitly requested; loading an extraction does not trigger analysis automatically

#### Seasonal Treatment Options

| Option | Description |
|---|---|
| **Automatic** | STL (period 12) for complete regular monthly series ≥ 2 years; otherwise calendar-month climatology |
| **Calendar-month climatology** | Explicitly removes each calendar month's mean |
| **Robust STL** | Requires ≥ 24 complete consecutive monthly observations; reports error if unsuitable rather than silently substituting |
| **No seasonal adjustment** | Analyzes observed values without subtracting a seasonal component |

#### Available Analysis Methods

| Method | Description | Output |
|---|---|---|
| **OLS linear trend · t-test** | Estimates a linear slope using elapsed calendar time; tests H₀: β₁ = 0 with autocorrelation-adjusted effective degrees of freedom | Slope per decade, t-statistic, df, p-value, 95% CI |
| **Hamed–Rao Mann–Kendall test** | Tests monotonic trend with tie correction and variance correction for serial rank autocorrelation | Z-score, p-value, Kendall τ, n_eff, verdict |
| **Seasonal Kendall test** | Aggregates like-calendar-month Mann-Kendall comparisons; controls for recurring annual seasonality | Season-specific results |
| **Sen's slope and 95% interval** | Reports a robust median pairwise slope and rank-based confidence interval | β (per decade), 95% CI |
| **Pettitt change-point screen** | Approximate single-breakpoint diagnostic | Estimated break date, p-value |
| **Anomaly review** | Flags observed |Z| ≥ 2 values for review; anomalies are NOT removed from trend analysis | Flagged observations, z-scores |
| **Seasonal fingerprint** | Year-by-month view of observed values and seasonal anomalies | Calendar heatmap |
| **Full Case File diagnostics** | Evidence grade (A–D), caveats, robustness, provenance, 3-level explanations | Complete exportable case file |

#### Case File Structure

A Case File is Iris's structured output for a completed investigation:

- **Reproducible** — given the same inputs (dataset, region, time window), always produces identical results
- **Transparent** — every statistical value is accompanied by its source, method, and assumptions
- **Exportable** — download as JSON or CSV
- **Traceable** — includes a full ISO 19115 / PROV-O provenance record

**Case File fields include:**
- Case ID (e.g., IR–042)
- Dataset name, variable, provider, citation DOI
- Region name, coordinates, spatial support
- Time window (start/end)
- Seasonal treatment applied
- Statistical results for all requested methods
- Evidence grade (A–D)
- Caveats registry
- 3-level explanations (Explorer / Student / Scientist)
- Provenance mode (live_nasa_power, live_extracted_result, or pinned_real_snapshot)
- SHA-256 manifest hash

#### Trend Verdicts

| Verdict | Meaning |
|---|---|
| **Significant increasing trend** | Hamed–Rao MK p < 0.05; slope and uncertainty reported |
| **Significant decreasing trend** | Hamed–Rao MK p < 0.05; negative slope and uncertainty |
| **No statistically significant trend detected** | p ≥ 0.05; does not prove the trend is zero |

P-values are shown directly — Iris does not convert (1 − p) to a "confidence percentage" to avoid misleading interpretation.

#### Chart Types in Data Analysis

| Chart | Description |
|---|---|
| **Raw vs. deseasonalized signal** | Raw observations overlaid with seasonal cycle and deseasonalized anomaly (Sen's slope line overlaid when available) |
| **Trend Triangle** | Matrix of Sen's slopes and p-values across all combinations of start year and end year — verifies trend is not an artifact of endpoint selection |
| **Seasonal fingerprint** | Year-by-month heatmap of anomalies |
| **Anomaly scatter** | Individual anomaly events flagged with z-score magnitude |

#### Outlook Section

The Data Analysis page includes an **Outlook** section displaying trend-continuation projections. These are mathematical extrapolations (not climate model forecasts) with widening uncertainty bounds. The outlook is displayed only when the statistical gate passes; it uses ±1.96 × holdout RMSE for uncertainty bounds and starts from the last valid monthly value plus the full-record deseasonalized slope.

#### Export in Data Analysis

Exports include:
- Precise source values and display values
- QA flags
- Method metadata and provenance
- Linked forecast data (when in forecast mode)

---

### 6.5 Plot & Visualize Studio

**Route:** `/workspace/visualize`

The immersive Landscape studio for exploring retrieved point time series with coordinated charts.

#### Studio Layout

The studio uses `dockview-react` for resizable, dockable panels on desktop. On narrow viewports (≤ 900px), one panel is shown at a time with a selector.

**Default arrangement (Landscape preset):**
- Main chart panel (time series, seasonal landscape)
- Evidence panel (trend evidence, trend intervals)
- Source & Selection panel (data controls, observation table)

**Available panels:**
- Time series (line, area, bars, distribution, seasonal profile, scatter)
- Seasonal landscape (3D ECharts-GL surface)
- Year-by-month heatmap
- Trend evidence and intervals
- Source & selection inspector

#### Chart Types

| Chart | Description |
|---|---|
| **Time series** | Line, area, bars with crosshair inspection, gradient fill, brush navigator |
| **Area** | Filled area chart with gradient |
| **Observation bars** | Bar chart of raw monthly values |
| **Seasonal profile** | Overlays individual years, calendar-month mean, and observed min/max envelope |
| **Monthly anomaly heatmap** | Year-by-month departure heatmap |
| **Distribution** | Histogram of observation values |
| **Paired scatter** | Exact-pair scatter for two datasets |
| **3D Seasonal orbit** | Calendar month determines angle, year determines height; interactive orbit/zoom |
| **3D Track** | Actual elapsed UTC time horizontal, observed values vertical; depth is presentation only |

#### Scientific Boundaries

- The 3D landscape is a **time-by-calendar-month** view, NOT a geographic surface or global trend map
- Requires Monthly cadence, unique calendar cells, and at most 150 displayed years
- Surface shading between adjacent observed values is **presentation interpolation, not additional observations**
- Calendar-month departures subtract the same calendar month's available-value mean within the visible record — this is a descriptive baseline, NOT a fixed climate normal, STL output, or trend estimate
- Submitted OLS/Sen fitted lines are shown only with exact-timestamp backend analysis-adjusted observations — not overlaid on unadjusted seasonal series

#### Studio Features

- **Play observations** — steps through retrieved timestamps every 650ms, loops at the end, highlights selection across views
- **Data controls** — optional acquisition drawer (initially collapsed)
- **Cross-view selection** — clicking a month/point selects the exact source timestamp across all panels
- **Linked observation selections** — preserved across panel switches
- **CSV/JSON export** — precise source/display values with QA and metadata
- **Layout persistence** — versioned `iris.studio.layout.v5` stored locally; older layouts migrate safely

#### How to Access the Studio

1. Complete a full analysis in Data Analysis (or load a case study)
2. Click **"Explore in Visualization Studio"** button
3. The studio loads with the extracted series and analysis results pre-bound

> The studio never reruns analysis automatically. Analysis binding (`adapters/analysisBinding.ts`) attaches completed results to the immutable extracted source.

---

### 6.6 Living Globe (Spatial Visualization)

**Route:** `/workspace/globe`

A 3D interactive globe with spatial data layer overlays, powered by CesiumJS.

#### Globe Components

| Component | Description |
|---|---|
| **CesiumJS 3D globe** | Interactive globe with orbit/pan/zoom; progressive tile loading |
| **NASA GIBS basemap** | Progressive tiled satellite imagery, token-free; local NASA image fallback |
| **Spatial data layers** | NASA POWER spatial field overlays with color-coded values |
| **Layer tree** | Keyboard-reorderable layer list with visibility toggles |
| **Cell inspector** | Right-panel details when clicking a grid cell |
| **Spatial timeline** | Navigate between months for the loaded field |
| **Field styling** | Custom color palette, fixed/auto range |
| **2D fallback** | Flat MapLibre map when WebGL fails |

#### Spatial Data Workflow

1. **Select dataset** — via Super Intelligence discovery or data controls
2. **Choose spatial extent** — globe, Europe (`[34, 72, -25, 45]` south/north/west/east), smaller region presets, custom ordered box, or draw on the 2D map
3. **Select date** — navigate months with the spatial timeline
4. **Load layer** — explicit action required; observations do not load automatically
5. **Inspect cells** — click any cell in the right-hand inspector; focus camera
6. **Restyle** — adjust color palette and value range
7. **Switch to 2D** — 2D fallback available from toolbar

#### Extent Presets

| Preset | Description |
|---|---|
| **Global** | Entire globe coverage |
| **Europe** | `[34, 72, -25, 45]` (south, north, west, east — a rectangle, not a continental polygon) |
| **Region presets** | Smaller bounding boxes (e.g., South Asia, North America) |
| **Custom box** | User-defined ordered bounding box |
| **Draw on map** | Interactive drag-drawn box on the 2D map panel |

#### Spatial API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/visualization/field` | Native-resolution spatial field for a specific extent and date |
| `GET /api/v1/visualization/overview` | Cosine-latitude-weighted aggregated overview for globe or large extents |

#### Landing Page Globe Integration

The landing page COBE globe's study-location markers open `/workspace/globe?place&lat&lon`. These set the location used by "Use box around selected location" without fetching observations. Point time series are requested separately in the studio.

---

### 6.7 Case Studies

**Routes:** `/workspace/case-studies` and `/workspace/case-studies/[caseId]`

Curated pre-built investigations that demonstrate Iris's capabilities with real data.

#### Built-in Trend Case Studies

| Case ID | Location | Variable | Period | Evidence Grade | Key Finding |
|---|---|---|---|---|---|
| **IR–042** | Los Angeles County, CA, USA | Near-Surface Air Temperature (2m) | 2005–2025 | A | +0.42°C/decade warming, 99.86% confidence |
| **IR–038** | California Central Valley, USA | Surface Topsoil Moisture (0–5cm) | 2001–2024 | A | −0.07 index/decade drying, lag-1 autocorrelation r1 = +0.58 |
| **IR–031** | Amazon Basin, Brazil | NDVI Vegetation Index | 2000–2024 | B | −0.08 NDVI/decade forest browning |
| **IR–024** | Central Himalaya (Koshi Basin, Nepal) | Snow Cover Fraction | 2001–2024 | B | −3.8%/decade snow retreat; Grade B due to monsoon cloud-mask caveat |

#### Disaster/Hazard Investigations

| Case ID | Event | Variable | Period |
|---|---|---|---|
| `nepal-floods-2024` | Nepal September 2024 Floods | NASA POWER PRECTOTCORR daily | 2024-09-15 to 2024-10-08 |
| `ditwah-sri-lanka-2025` | Sri Lanka Cyclone Ditwah November 2025 | NASA POWER PRECTOTCORR daily | 2025-11-15 to 2025-12-03 |

#### Case Study Features

Each case study includes:
- Plain-language context description
- Dataset and region metadata
- Full Statistical Case File with charts
- Multi-level explanations (Explorer / Student / Scientist)
- Checkpoint questions for educational walkthroughs
- Related research links
- Next-clue suggestions

#### Checkpoint-Based Walkthroughs

Guided case studies include step-by-step checkpoint questions designed for educational use:

**IR–042 Checkpoints:**
1. "Why do we subtract the 12-month seasonal cycle before testing for a multi-decade climate trend?"
   - Correct: The ~12°C summer-to-winter swing would otherwise mask a +0.42°C/decade long-term shift
2. "What advantage does Sen's non-parametric slope provide over OLS during extreme heatwave years?"
   - Correct: Median of all pairwise slopes — resistant to single-year heat spikes

**IR–024 Checkpoints:**
1. "Why is this Himalayan snow investigation assigned Evidence Grade B instead of Grade A?"
   - Correct: Optical MODIS sensors cannot see through persistent summer monsoon cloud cover

---

### 6.8 Existing Research

**Route:** `/workspace/research`

Connects the active dataset to published peer-reviewed literature, NASA technical reports, and climate-analysis references.

#### How It Works

Iris queries two live academic APIs:
- **OpenAlex** (`https://api.openalex.org/works`) — open scholarly knowledge graph
- **DataCite** (`https://api.datacite.org/dois`) — dataset DOIs and citations

The search is seeded automatically from the active dataset's metadata (variable name, provider, region), or users can run manual queries by DOI, keyword, or topic.

#### Features

| Feature | Description |
|---|---|
| **Dataset-linked discovery** | Automatically searches literature relevant to the active variable and region |
| **Topic filtering** | Filter results by topic, variable type, or geographic area |
| **Citation copying** | Copy formatted citations for papers and datasets |
| **DOI resolution** | Direct link to paper DOIs and dataset records |
| **Search overriding** | Manual query override for custom literature searches |

#### Typical Research Questions

- What work has been done on precipitation variability in this region?
- Which papers discuss vegetation stress or drought signals in this climate zone?
- What prior studies are associated with the selected variable?
- What are the accepted references for this Earth observation product?

---

### 6.9 Dataset & ML Forecasts Workspace

**Route:** `/workspace/forecasts?forecastId=<id>&target=<target>&run=<artifact-id>`

The dedicated forecast workspace providing both Iris's history-only machine learning forecasts (`iris.ml-forecast.v2`) across multi-variable Earth system targets and an auditable archive of legacy 51-member ECMWF precipitation ensemble predictions.

#### Core Capabilities:
1. **Historical Dataset ML Forecasts (Default)**: Trains gradient-boosted quantile regression models directly on historical observations. Generates direct 3-horizon predictions ($h_0, h_1, h_2$) with 10th–90th percentile uncertainty ranges.
2. **Multi-Variable Earthdata Targets**: Supports rainfall (`precip_24h`), soil moisture (SMAP surface/root-zone, GLDAS), air and surface temperature (MERRA-2, MODIS LST), vegetation (MODIS/VIIRS NDVI/EVI), evapotranspiration, and snow cover.
3. **Rigorous Activation Gates & Experimental Previews**: Models must beat persistence and seasonal climatology on held-out test data. Candidates missing activation checks generate labeled **Experimental Previews** with explicit baseline error comparisons (`100 × (model MAE / baseline MAE − 1)`).
4. **Durable Jobs & Staged Dataset Controls**: Long-running NASA extractions and model training jobs run asynchronously and recover across page reloads.
5. **Legacy Provider Ensemble Archive**: ECMWF 51-member ensemble precipitation outlooks using member-first accumulation, with recent NASA GPM IMERG 7-day satellite context.

#### Configured Forecast Points

| ID | Location |
|---|---|
| `colombo` | Colombo & Western Basin, Sri Lanka |
| `kathmandu` | Central Himalaya (Koshi Basin, Nepal) |
| `amazon` | Central Amazon Basin, Brazil |
| `los-angeles` | Los Angeles Basin, North America |
| `mediterranean` | Mediterranean Basin, Southern Europe |
| `siberia` | Eastern Siberian Permafrost (Yakutia) |

#### Interactive Features:
- Target variable selector with dynamic unit conversion (°C / K)
- 3 window summary cards with per-window error comparisons vs baseline
- Shaded 10th–90th percentile uncertainty ribbon and median outlook chart
- Permanent run preservation (**Save link**) and full evidence export (JSON)
- Inspection of staged datasets, model cards, and retrospective trend reports
- Change location and timezone within the workspace
- View exact ensemble member values in the data table
- Export complete forecast/member evidence as CSV/JSON
- NASA IMERG recent observations shown alongside forecast for context

#### Scientific Limitations

- The ensemble ribbon is the central 80% range, NOT a calibrated 80% prediction interval
- User-supplied threshold amounts reveal the fraction of members exceeding it — this is NOT a flood probability, official threshold, or safety determination
- `dateGenerated` is the provider response-generation time, not model initialization
- Complete member coverage is required for displayed distribution statistics
- Reserved values (−999, −888, −777, −666) remain missing; zeros remain zero

---

### 6.10 Disaster & Hazard Evidence Investigations

**Routes:** `/workspace/case-studies/nepal-floods-2024` and `/workspace/case-studies/ditwah-sri-lanka-2025`

Historical disaster event investigations with real NASA POWER and Meteomatics data.

#### Implemented Investigations

| Investigation | Event | Location | NASA Window |
|---|---|---|---|
| Nepal Floods 2024 | September 2024 | 27.7172°N, 85.324°E | 2024-09-15 to 2024-10-08 (24 daily rows) |
| Cyclone Ditwah (Sri Lanka 2025) | November 2025 | 6.9355°N, 79.8487°E | 2025-11-15 to 2025-12-03 (19 daily rows) |

#### Data Sources

| Source | Variable | Description |
|---|---|---|
| NASA POWER | `PRECTOTCORR` | Daily bias-corrected total precipitation (mm/day); `community=AG`, UTC, MERRA-2 source |
| Meteomatics | `precip_3h:mm` | 72-hour point forecast with 51 ECMWF ensemble members |

#### Investigation Features

- Explicit hindsight reveal (reconstruction cutoff is documented; event dates are shown upfront)
- NASA POWER daily precipitation with source URL, SHA-256, coordinates, units, retrieval timestamp, and QA flags
- 72-hour Meteomatics point outlook with rolling 24-hour totals and export
- Interactive map showing exact forecast point (not an interpolated regional surface)
- Optional research threshold to reveal fraction of ensemble members exceeding an amount

#### API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/hazards/history?case_id=<id>` | Historical NASA POWER daily context for supported case |
| `GET /api/v1/hazards/rainfall?case_id=<id>` | Meteomatics 72-hour point forecast for supported case |

Only the two admitted catalogue IDs are accepted; arbitrary URLs, coordinates, or date ranges are rejected (HTTP 422).

---

## 7. Investigation Workflows

### 7.1 Track A — Live Ad-Hoc Discovery

For custom investigations using live NASA data.

```
Super Intelligence
       ↓
  (Confirm keywords + sources)
       ↓
Data Selection
  (Configure dataset, region, dates, cadence)
       ↓
Data Preview
  (Inspect extracted series, QA check)
       ↓
Data Analysis
  (Choose seasonal treatment + methods → Run)
       ↓
Plot & Visualize
  (Explore in immersive studio → export)
```

**Best for:** Custom regions, variables, or time windows not in the Global Trend Cube.

#### Step-by-Step Guide

1. **Open Super Intelligence** (`/workspace/intelligence`)
2. **Describe your topic** — e.g., "Surface temperature trends in the Himalayas since 2000"
3. **Review the keyword and source proposal** — add/remove keywords, select/deselect providers
4. **Confirm and search** — Super Intelligence queries selected providers
5. **Go to Data Selection** — configure extraction: dataset, variable, region, dates, cadence
6. **Submit extraction** — data is retrieved from the selected provider
7. **Review Data Preview** — check completeness, QA flags, and the time-series chart
8. **Run Data Analysis** — choose seasonal treatment and methods, click Run
9. **Interpret the Case File** — read the verdict, evidence grade, and 3-level explanation
10. **Explore in Visualization Studio** — open the docked studio from Data Analysis
11. **Export** — download CSV/JSON of observations, results, or the full Case File

---

### 7.2 Track B — Global Evidence Cube

For instant exploration of pre-computed global trend maps.

```
Landing Page / Living Globe
       ↓
  (Select variable + layer)
       ↓
  (Browse cells on globe)
       ↓
Data Analysis
  (Load pre-computed Case File for selected region)
       ↓
Plot & Visualize
```

**Best for:** Global exploration, regional comparison, quick trend scanning.

---

### 7.3 Forecast-First Track

For precipitation forecast exploration and event investigation.

```
Landing Globe (click a forecast marker)
       ↓
Data Analysis (forecast mode)
  ?forecastId=<id>&run=<artifact-id>
       ↓
(Optional) Hazard case study
  /workspace/case-studies/nepal-floods-2024
```

---

## 8. Scientific Methodology

Iris applies a 5-stage evidence pipeline to all investigations. All computations are deterministic and reproducible.

### Stage 1 — Define the Question

Select a measurable phenomenon, an area of interest, and a period long enough to distinguish trend from noise.

**Inputs:** Region + variable + timeframe

**Rule of thumb:** Monthly time series require at least 10–15 years of data for a credible trend assessment.

---

### Stage 2 — Prepare the Signal

**2a. Spatial aggregation**
Grid cells are aggregated by cosine-latitude area weighting so that high-latitude cells (which cover less area) are not overrepresented.

```
area_weight = cos(latitude × π/180)
weighted_mean = Σ(value × weight) / Σ(weight)
```

**2b. Quality control**
- Fill values (e.g., −999.0 for NASA POWER) are masked before any computation
- Missing months are retained as gaps, never imputed
- QA flags are preserved and visible in all exports

**2c. STL seasonal decomposition**
For monthly series with ≥ 24 consecutive complete months:
- **Seasonal and Trend decomposition using Loess (STL)** decomposes the series into:
  - **Trend** — smoothed long-term component
  - **Seasonal** — recurring 12-month cycle
  - **Residual** — remainder after removing trend and seasonal components
- The deseasonalized signal = observed − seasonal
- Raw observations always remain available; deseasonalization is an optional analytical step

---

### Stage 3 — Test for a Trend

#### Mann-Kendall Test

The standard non-parametric test for monotonic trends in environmental time series.

**Formula:** S = Σ sgn(xⱼ − xᵢ) for all j > i

A large positive S indicates a consistent increasing pattern; large negative S indicates decreasing. The test makes no assumptions about the distribution of the data. Recommended by the challenge as a primary significance testing method alongside t-tests and confidence intervals.

#### Hamed-Rao Modified Mann-Kendall

Iris applies the **Hamed-Rao (1998) correction** by default, which corrects the variance of S for serial rank autocorrelation. This prevents artificially inflated significance due to serially correlated observations (common in soil moisture, groundwater, and temperature records).

**Outputs:** Variance-corrected Z-statistic, adjusted p-value, effective sample size (n_eff), rank autocorrelation

#### Significance Threshold

Default α = 0.05 (5% false positive rate):
- p ≤ 0.05 → **Statistically significant trend**
- p > 0.05 → **Inconclusive** (not "no trend")

#### Seasonal Kendall Test

Aggregates Mann-Kendall scores and variances for separate calendar-month series. Comparing like months across years controls for recurring annual seasonality.

#### OLS Linear Trend t-test

A parametric complement to the non-parametric Mann-Kendall. The null hypothesis H₀: β₁ = 0 is tested with a two-sided Student's t-test using effective-sample-size degrees of freedom. Reported alongside — not in place of — the non-parametric results.

---

### Stage 4 — Measure the Change

**Sen's Slope Estimator (Theil–Sen)**

For every pair of observations, compute: βᵢⱼ = (xⱼ − xᵢ) / (tⱼ − tᵢ)

Sen's slope is the **median** of all N(N−1)/2 pairwise slopes. Because it uses the median rather than the mean, isolated extreme observations cannot substantially distort the estimate.

**Output:** Slope per decade in the variable's physical units, 95% confidence interval

| Variable | Slope Units |
|---|---|
| Temperature | °C per decade |
| Precipitation | mm/day per decade |
| NDVI | index units per decade |
| Soil moisture | index units per decade |
| Snow cover | % per decade |

---

### Stage 5 — Interrogate Anomalies

**Z-score anomaly detection:**
```
Z = (observation − seasonal_mean) / seasonal_std
|Z| ≥ 2.0 → Flagged as anomaly
```

Anomalies are flagged and reported as metadata in the Case File. They inform the investigation but do NOT affect the Mann-Kendall or Sen's slope results (both methods are designed to be resistant to outliers).

---

### Supplementary Methods

#### Pettitt Change-Point Detection

Identifies if and when a statistically significant structural shift (step change) occurred in the time series. Can reveal:
- A sudden policy or land-use change
- A sensor recalibration or data version change
- A climate regime shift

Reports estimated break date and p-value.

#### Benjamini-Hochberg False Discovery Rate (BH-FDR)

When testing trend significance for every grid cell globally, some will appear significant by chance. The BH procedure controls the expected proportion of false discoveries.

Iris reports both the raw p-value and the FDR-adjusted **q-value**. The significance filter on the Living Globe uses q ≤ 0.05.

---

### What Iris Does NOT Do

- **Does not establish causation** — a statistically significant trend shows something has changed consistently; it does not explain why
- **Does not forecast future climate** — trend continuation projections are mathematical extrapolations with widening uncertainty bounds, not climate model predictions
- **Does not use AI for scientific computation** — all statistics are deterministic; Gemini is limited to parsing queries and explaining results in plain language
- **Does not synthesize data** — if the upstream API fails, the extraction fails rather than substituting generated values
- **Does not impute missing values** — missing observations remain as gaps in all charts and calculations

---

## 9. Data Sources & Variables

All data in Iris comes from established, publicly funded Earth observation archives.

### Zero Synthetic Data Policy

**No synthetic or fabricated data appears in any user-facing result.** All numbers come from:
1. **Live upstream APIs** — real-time retrieval from NASA, NOAA, and other provider endpoints
2. **Verified real snapshots** — pinned, SHA-256-hashed copies of real observations used to ensure the platform works offline

Synthetic data fixtures exist only in internal test harnesses and are blocked from all production endpoints.

---

### Core Variables — Global Trend Cube

| Variable ID | Name | Category | Unit | Source | Temporal Window | Resolution |
|---|---|---|---|---|---|---|
| **T2M** | Near-Surface Air Temperature (2m) | Atmosphere | °C | NASA POWER / GMAO MERRA-2 M2TMNXSLV v5.12.4 | 1981–2025 | 0.5° × 0.625° |
| **PRECTOTCORR** | Bias-Corrected Total Precipitation | Water | mm/day | NASA POWER / MERRA-2 + GPM IMERG Final Run v07 | 1981–2025 | 0.5° × 0.625° |
| **GWETTOP** | Surface Topsoil Moisture Wetness (0–5cm) | Land | 0–1 index | NASA POWER / GMAO MERRA-2 Land Surface Diagnostics | 1981–2025 | 0.5° × 0.625° |
| **GWETROOT** | Root-Zone Soil Moisture Wetness (0–100cm) | Land | 0–1 index | NASA POWER / GMAO MERRA-2 + GLDAS Noah v2.1 | 1981–2025 | 0.5° × 0.625° |
| **ALLSKY_SFC_SW_DWN** | All-Sky Surface Shortwave Downward Irradiance | Atmosphere | W/m² | NASA POWER / CERES SYN1deg & GEWEX SRB | 1984–2025 | 1.0° × 1.0° |
| **RH2M** | Relative Humidity at 2 Meters | Atmosphere | % | NASA POWER / GMAO MERRA-2 M2TMNXSLV | 1981–2025 | 0.5° × 0.625° |
| **NDVI** | Normalized Difference Vegetation Index | Biosphere | −0.2 to 1.0 | MODIS Terra/Aqua MOD13C2 v061 CMG | 2000–2025 | 0.05° → 0.5° cube |
| **NDSI_SNOW_COVER** | Cryosphere Snow Cover Fraction | Cryosphere | % | MODIS Terra MOD10CM v061 Monthly CMG | 2000–2025 | 0.05° → 0.5° cube |
| **WS10M** | Wind Speed at 10 Meters | Atmosphere | m/s | NASA POWER / GMAO MERRA-2 Surface Wind | 1981–2025 | 0.5° × 0.625° |
| **TS** | Earth Skin Surface Temperature | Land | °C | NASA POWER / GMAO MERRA-2 Radiative Skin Temp | 1981–2025 | 0.5° × 0.625° |
| **SST_MUR** | Sea Surface Temperature (MUR GHRSST) | Oceans | °C | NASA PO.DAAC GHRSST Level 4 MUR | 2002–2025 | 0.25° grid |
| **LWE_THICKNESS** | Terrestrial Water Storage Anomaly (GRACE/GRACE-FO) | Water | cm EWH | NASA JPL GRACE/GRACE-FO Mascon RL06.1Mv03 | 2002–2025 | 0.5° (3° native) |

#### Variable Caveats

| Variable | Key Caveats |
|---|---|
| T2M | Reanalysis assimilates changing satellite radiance constellations (1998 ATOVS, 2012 IASI); coastal cells blend land-ocean boundary layer |
| PRECTOTCORR | High interannual variance (ENSO/IOD) requires ≥ 20-year window for stable monotonic detection; orographic gauge undercatch > 3,500m |
| GWETTOP | Undefined over open ocean; frozen soil intervals reduce winter sensitivity |
| GWETROOT | Strong lag-1 autocorrelation (r1 > 0.65) requires Hamed-Rao n_eff adjustment |
| ALLSKY_SFC_SW_DWN | Transition from GEWEX SRB to CERES SYN1deg in March 2000 is cross-calibrated |
| NDVI | MODIS Collection 6.1 calibration; persistent tropical cloud cover masks wet-season pixels |
| NDSI_SNOW_COVER | Only analyzable in cryospheric/high-latitude or alpine regions; polar night limits optical retrieval |
| SST_MUR | Ocean-only layer; masked over inland terrestrial basins |
| LWE_THICKNESS | 11-month gap (July 2017 – May 2018) between GRACE and GRACE-FO is never interpolated |

---

### Valid Month Rule

All cube layers require **≥ 10 valid months per year (83.3% coverage)** per cell. Cells below this threshold are excluded from trend calculations.

---

### Additional Live-Discoverable Variables

Beyond the Global Trend Cube, Super Intelligence can discover and extract hundreds of additional variables from upstream provider catalogs (NASA CMR, AppEEARS, GES DISC, etc.):

**Atmospheric:** Near-surface dew point, specific humidity, cloud fraction, AOD (aerosol optical depth), ozone column  
**Land:** Evapotranspiration, land surface temperature (MODIS LST), albedo, burned area  
**Ocean:** Ocean color (chlorophyll), sea level anomaly  
**Cryosphere:** Sea ice extent, glacier mass balance  
**Carbon:** GPP (gross primary production), carbon flux  

---

## 10. Backend API Reference

The backend is a FastAPI application (v3.0.0) at `http://127.0.0.1:8000` (proxied through Next.js).

### Group 1 — Conversational Super Intelligence & Catalog Discovery

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/si/chat` | Multi-step conversational Super Intelligence chat (Gemini Flash-Lite powered) |
| `POST` | `/api/v1/assistant/chat` | Dashboard Q&A without catalog access |
| `POST` | `/api/v1/si/discover` | Direct dataset discovery from a prompt |
| `GET` | `/api/v1/catalog/product-details` | Live variable/layer metadata, date bounds, resolution |
| `GET` | `/api/v1/catalog/products` | All cached discovered products |
| `GET` | `/api/v1/geocode` | WGS84 geocoding via Open-Meteo |
| `GET` | `/api/v1/providers/{provider_id}/test` | Isolated diagnostic for each provider |

**Supported provider IDs for `/test`:** `nasa_power`, `cmr`, `appeears`, `ges_disc`, `harmony`, `noaa_cdo`, `noaa_onestop`, `opendap`, `eodag`, `copernicus_cds`

---

### Group 2 — Time-Series Extraction & Job Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/timeseries/extract` | Execute live time-series extraction |
| `GET` | `/api/v1/timeseries/jobs/{job_id}/status` | Poll extraction job status |
| `GET` | `/api/v1/timeseries/jobs/{job_id}/preview` | Retrieve normalized time-series data (paginated) |

---

### Group 3 — Statistical Processing Pipeline

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/analyze/timeseries` | Direct NASA POWER time-series analysis |
| `POST` | `/api/v1/analyze/case-file` | Full SRS v1.0 Case File pipeline (Hamed-Rao MK, n_eff, STL, Sen's slope, Pettitt, Evidence Grade A–D) |

The case-file pipeline:
1. Fetches or loads the time series (from job_id or live NASA POWER)
2. Applies STL decomposition
3. Runs OLS t-test, Hamed-Rao MK, Seasonal Kendall, Sen's slope, Pettitt, anomaly detection
4. Assigns Evidence Grade A–D
5. Generates 3-level explanations (Explorer, Student, Scientist)
6. Returns full Case File with provenance mode and SHA-256 manifest

---

### Group 4 — Global Trend Cube & Evidence Registry

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/capabilities` | SRS v1.0 provider capability matrix |
| `GET` | `/api/v1/cube/manifest` | Versioned Global Trend Cube manifest and layer hashes |
| `GET` | `/api/v1/cube/globe` | Living Globe cube tiles, FDR channel, dipoles |
| `GET` | `/api/v1/evidence/registry` | Evidence grade rules, validation benchmarks, Super Intelligence disclosure |

---

### Group 5 — Research Literature

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/research/search` | Search OpenAlex and DataCite for papers and datasets |

---

### Group 6 — Visualization Spatial Fields

(Available only with `visualization_app:app` backend entry)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/visualization/field` | Native-resolution spatial field for a specific extent/date |
| `GET` | `/api/v1/visualization/overview` | Cosine-latitude-weighted aggregated overview |

---

### Group 7 — Forecasts

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/v1/forecasts/*` | Forecast retrieval, caching, and snapshot management |

---

### Group 8 — Hazards

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/hazards/history?case_id=<id>` | NASA POWER historical precipitation for a supported case |
| `GET` | `/api/v1/hazards/rainfall?case_id=<id>` | Meteomatics 72-hour point forecast for a supported case |

---

### HTTP Error Codes

| Code | Meaning |
|---|---|
| `422` | Unsupported investigation/input, missing monthly data, extraction error |
| `429` | Local concurrency/query budget or provider quota limit |
| `502` | Invalid/oversized upstream data, AI processing error |
| `503` | Missing credentials, unavailable service, or refused access |
| `410` | Retained forecast snapshot expired or not found |
| `404` | Job, product, or location not found |

---

## 11. Data Provider Capability Matrix

| Provider | Agency | Catalog State | Extraction State | Geometries | Cadences | Auth |
|---|---|---|---|---|---|---|
| **NASA POWER** | NASA LaRC / GMAO | ✅ verified | ✅ verified | point, bbox | Daily, Monthly, Yearly | Public (no token) |
| **NASA GES DISC** | NASA GSFC GiC | ✅ verified | ✅ verified | point | Daily, Monthly | Earthdata Bearer Token |
| **NASA AppEEARS** | NASA LP DAAC | ✅ catalog verified | 🔑 credential required | point, bbox | 8-Day, 16-Day, Monthly | Earthdata Login → AppEEARS Session Token |
| **NASA CMR** | NASA Earthdata | ✅ catalog verified | ❌ catalog only | bbox, point | Daily–Yearly | Public UMM-JSON |
| **NASA Harmony** | NASA Earthdata Cloud | ✅ catalog verified | 🔑 credential required | bbox, point | Daily, Monthly | Earthdata Bearer Token |
| **NOAA CDO** | NOAA NCEI | 📋 planned | 📋 planned | point, bbox | Daily, Monthly, Yearly | NOAA CDO Token |
| **EODAG / Copernicus** | ECMWF C3S | 📋 planned | 📋 planned | bbox, point | Monthly, Daily | Copernicus CDS API Key |
| **Meteomatics** | Meteomatics AG | — | ✅ verified (6 points) | point | 3-hourly | Username + Password |
| **Open-Meteo** | — | — | ✅ geocoding | — | — | Public |

---

## 12. Global Trend Cube (SRS v1.0)

The Global Trend Cube is Iris's pre-computed database of trend statistics.

### Cube Version

```
CUBE_VERSION = "v1.0.2-SRS-2026.11"
SNAPSHOT_TIMESTAMP_UTC = "2026-11-13T00:00:00Z"
```

### Method Summary

```
0.5° monthly deseasonalized grid → 1.0° cos(lat) area-weighted globe cells
· Hamed-Rao MK + Sen's Slope
· Benjamini-Hochberg FDR (q < 0.05)
```

### Globe Anchor Nodes (20 Pre-computed Study Locations)

| Cell ID | Region | Type | Coordinates |
|---|---|---|---|
| cell-la | Los Angeles Basin, North America | Land | 34.05°N, 118.24°W |
| cell-cv | California Central Valley, USA | Land | 36.77°N, 119.41°W |
| cell-pnw | Pacific Northwest (Cascadia), USA | Land | 47.61°N, 122.33°W |
| cell-amz | Central Amazon Basin, Brazil | Land | 3.75°S, 60.0°W |
| cell-pat | Patagonian Steppe, Argentina | Land | 45.86°S, 67.5°W |
| cell-grl | Greenland Ice Sheet Interior | Land | 72.0°N, 40.0°W |
| cell-med | Mediterranean Basin, Southern Europe | Land | 41.25°N, 9.25°E |
| cell-scan | Fennoscandia / Boreal Europe | Land | 64.0°N, 18.0°E |
| cell-sah | Central Sahara Desert, North Africa | Land | 23.5°N, 12.0°E |
| cell-congo | Congo Rainforest Basin, Central Africa | Land | 1.5°S, 22.0°E |
| cell-saf | Southern African Karoo & Highveld | Land | 29.0°S, 24.0°E |
| cell-sl | Colombo & Western Basin, Sri Lanka | Land | 6.94°N, 79.85°E |
| cell-him | Central Himalaya (Koshi Basin, Nepal) | Land | 27.95°N, 87.1°E |
| cell-sib | Eastern Siberian Permafrost (Yakutia) | Land | 62.0°N, 129.7°E |
| cell-ec | Yangtze Delta, East Asia | Land | 31.23°N, 121.47°E |
| cell-aus | Southeast Australia (Murray-Darling) | Land | 33.86°S, 151.21°E |
| cell-nino | Equatorial Pacific (Niño 3.4 Corridor) | Ocean | 0.0°N, 140.0°W |
| cell-natl | North Atlantic Subpolar Gyre | Ocean | 52.0°N, 32.0°W |
| cell-ind | Central Indian Ocean Dipole Zone | Ocean | 10.0°S, 75.0°E |
| cell-so | Southern Ocean Circumpolar Front | Ocean | 60.0°S, 0.0°E |

### Time-Lapse Decades

| Period | Headline |
|---|---|
| 1985–1994 | Early satellite baseline; regional signals emerging in high northern latitudes |
| 1995–2004 | MODIS & CERES constellation era begins; subtropical drying & warming consolidate |
| 2005–2014 | Multi-decadal trend passes BH-FDR q < 0.05 across continental interiors |
| 2015–2025 | Full record emergence: strong polar/land amplification and teleconnection dipoles |

---

## 13. Evidence Grades & Validation

### Evidence Grade Rubric (SRS v1.0)

| Grade | Title | Criteria |
|---|---|---|
| **A** | Robust Multi-Method Verified Signal | ≥ 15-year window, ≥ 90% valid monthly coverage, Hamed-Rao MK p < 0.05 (BH-FDR q < 0.05), Sen's slope and n_eff-adjusted OLS concordant within 35%, no severe unmitigated structural break |
| **B** | Credible Trend with Minor Caveats | ≥ 10-year window, ≥ 80% valid monthly coverage, Hamed-Rao MK p < 0.05, directional concordance between Sen's slope and OLS, with documented sensor/reanalysis caveats |
| **C** | Emerging or Regional Signal | 8–14 year window or 70–80% coverage, or marginal significance (0.05 ≤ p < 0.15) where interannual variability (ENSO/monsoon) approaches trend amplitude |
| **D** | Inconclusive or Coverage-Limited | < 8 years of data, < 70% valid coverage, p ≥ 0.15, or conflicting parametric/non-parametric slope signs |

### Validation Lab Benchmarks

| Benchmark | Name | Expected | Measured | Status |
|---|---|---|---|---|
| **VAL-01** | NASA Giovanni Reference Reproducibility | Slope delta ≤ 0.01 unit/decade | Delta = 0.002°C/decade; 100% valid-month match | ✅ PASSED |
| **VAL-02** | Hamed & Rao Lag-1 Autocorrelation Correction | n_eff reduction ≥ 40% at r1 = +0.65 | n_eff reduced from 288 to 114 | ✅ PASSED |
| **VAL-03** | Theil-Sen vs OLS Concordance | Sen/OLS slope difference < 10% for clean series | 0.00% for IR–042 T2M | ✅ PASSED |
| **VAL-04** | BH-FDR Global FDR Control | FDR controlled at q ≤ 0.05 | FDR = 4.8% | ✅ PASSED |
| **VAL-05** | MODIS Seasonal Cloud-Mask Caveat Detection | Grade B assigned when monsoon-season coverage < 75% | IR–024 NDSI correctly assigned Grade B | ✅ PASSED |

---

## 14. AI / Super Intelligence Governance

### Model

Iris Super Intelligence uses **Gemini Flash-Lite** (`gemini-3.5-flash-lite`) for natural language processing only.

### Permitted Super Intelligence Roles

- Parsing plain-language research questions into structured scientific intent
- Proposing GCMD-aligned keywords and suggested data sources
- Routing queries to the most appropriate upstream NASA/NOAA providers
- Explaining statistical results in Explorer, Student, and Scientist register
- Answering dashboard questions about methodology and interpretation

### Prohibited Super Intelligence Roles (Hard Guardrails)

- Performing, modifying, or influencing any statistical calculation
- Generating, estimating, or interpolating numerical observation values
- Claiming statistical significance or trend direction without computed p-values
- Producing forecast values or anomaly scores
- Modifying extraction parameters after user confirmation
- Accessing raw credentials or provider tokens

### Separation Architecture

```
User query → Gemini Flash-Lite → Intent extraction → Provider catalog search
                                                            ↓
                                                    Dataset results
                                                            ↓
                                              [All scientific computation]
                                            [SciPy · pymannkendall · statsmodels]
                                                            ↓
Gemini Flash-Lite ← Statistical results ← [Deterministic case file]
       ↓
Plain-language explanation (templated from computed metrics)
```

**Every number users see comes from deterministic code, not from the AI model.**

---

## 15. Dataset & Machine Learning Forecast System

The **Dataset & Machine Learning Forecast System** (`iris.ml-forecast.v2`, `backend/forecasts/v2/`) is Iris's production-ready environmental forecasting engine. It trains local machine learning models directly on historical observations and reanalysis, delivering transparent, auditable forward outlooks without relying on external future weather predictions.

### Core Architecture: History-Only Learning

1. **No Future Provider Values as Features**: The model is trained exclusively on past observational records. External future predictions are strictly prohibited from entering feature sets.
2. **Chronological 4-Way Splitting**: Data is partitioned into Development (60%), Validation (15%), Calibration (10%), and Test (15%) folds strictly by time. Random shuffling and random early stopping are disabled to eliminate hindsight leakage.
3. **Availability Lag Enforcement**: Accounts for real-world remote sensing delays (e.g., 144-hour lag for ERA5, ~14-day composite lag for MODIS). Observations whose release window has not elapsed are excluded from feature vectors.
4. **Direct Horizon Quantile Models**: Fits direct Histogram Gradient Boosting regressors for three future windows ($h_0, h_1, h_2$), producing calibrated 10th, 50th (median), and 90th percentile ranges.

### Multi-Variable Earthdata Targets

| Target Key | Variable | Unit | Source Product | Cadence / Delay |
|---|---|---|---|---|
| `precip_24h` | Daily Rainfall | `mm` | Meteomatics `era5` / `mix` | Daily · 144h / 3h |
| `smap_surface_sm` | Surface Soil Moisture | `m³/m³` | SMAP `SPL3SMP_E.006` | Daily · ~3d |
| `smap_l4_surface_sm` | Root-Zone Soil Moisture | `m³/m³` | SMAP `SPL4SMGP.008` | 3-hourly · ~2.5d |
| `merra2_t2m` | Air Temperature | `K` / `°C` | MERRA-2 `M2T1NXSLV` | Hourly · ~1mo |
| `modis_lst_day` | Land Surface Temperature | `K` / `°C` | MODIS `MOD11A1.061` | Daily · ~2wk |
| `modis_ndvi` | Vegetation Index | Index (`0..1`) | MODIS `MOD13Q1.061` | 16-day · ~10d |
| `viirs_ndvi` | Vegetation Index | Index (`0..1`) | VIIRS `VNP13A1.002` | 16-day · ~10d |
| `modis_et` | Evapotranspiration | `kg/m²/8day` | MODIS `MOD16A2GF` | 8-day · year-end gap fill |
| `gldas_soilm` | Soil Moisture | `kg/m²` | GLDAS `GLDAS_NOAH025_3H` | 3-hourly · ~1–2mo |
| `modis_snow_cover` | Snow Cover Fraction | `%` | MODIS `MOD10A1.061` | Daily · ~2wk |

### Model Activation Gates & Experimental Preview Mode

- **Activation Checks**: A candidate model must outperform both the Persistence baseline and the Seasonal Climatology baseline on held-out test data while maintaining non-crossing, calibrated quantiles.
- **Experimental Preview Mode**: If a model fails activation checks (e.g., GLDAS soil moisture where persistence proves superior), Iris publishes an **Experimental Preview** with an explicit amber badge and baseline relative error metrics:
  $$\text{Baseline Relative Error (\%)} = 100 \times \left(\frac{\text{Model MAE}}{\text{Baseline MAE}} - 1\right)$$
- An indicator such as `+8.0% more error than baseline` ensures full scientific transparency without manufacturing optimistic accuracy figures.

### Durable Jobs & Auto-Renewal

- Background jobs (NASA downloads, dataset freezing, model fitting) persist in `backend/data/iris_durable_store.json` across client restarts.
- An idle worker checks every 5 minutes to automatically renew active predictions when new staged observations are available.

### Legacy Provider Ensemble Archive (ECMWF 51-Member)

For comparative baseline studies, Iris maintains an explicit archive path (`ENABLE_PROVIDER_FORECASTS=true` or via 64-character SHA-256 snapshot links) for 72-hour ECMWF ensemble precipitation forecasts (`precip_3h:mm`).
- **Member-First Rule**: Sums subdaily 3-hour accumulations within each of the 51 members first before calculating the 10th, 50th, and 90th percentiles across all 51 totals.
- **NASA GPM IMERG Context**: Loads authentic 7-day satellite precipitation estimates (`GPM_3IMERGDE.07`) preceding the forecast horizon.

---

## 16. Immersive Visualization Studio

### Panel Registry

The Landscape arrangement is the default and only preset. Panels cannot be accidentally closed.

### Layout Persistence

- **Key:** `iris.studio.layout.v5`
- Older/incomplete layouts migrate safely to the default
- Observations and analysis payloads are never stored in layout preferences

### 3D Seasonal Orbit

- Calendar month determines angle (0°–330°, 30° per month)
- Calendar year determines height
- Radius is an affine mapping of the labelled observed value range (not an absolute physical distance)
- Color follows earlier to later years; year emphasis dims other years
- Interaction: drag to orbit, scroll to zoom, right-drag to pan, click to select
- Keyboard: previous/next controls and labelled range input

### 3D Track

- Actual elapsed UTC time (horizontal) vs. observed values (vertical)
- Depth and lighting are presentation only — no third scientific variable
- Falls back to 2D timeline for > 6,000 usable observations or WebGL failure

### Performance Notes (Machine-Specific Observations)

| Metric | Observed Range |
|---|---|
| Engine ready | ~1.7–4.7 s |
| Basemap tiles | ~68–86 KB (5–12 tiles, levels 0–2) |
| JS heap at world view | ~26 MB |
| Global overview cold | ~3.4–10.2 s |
| Europe subset cells at 0.5° × 0.625° | 8,701 cells |
| Frame rate (unloaded) | 60 fps |

---

## 17. Use Cases

### Use Case 1 — Climate Trend Researcher

**Goal:** Determine whether surface temperature in the Himalayan region has significantly changed over the past 25 years.

**Workflow:**
1. Open Super Intelligence → type "Surface temperature trends in Nepal Himalayas since 2000"
2. Review proposed keywords and confirm search with NASA POWER selected
3. Configure extraction: region (Koshi Basin, Nepal), T2M, 2000–2025, Monthly
4. Review Data Preview — check completeness, inspect the gap-aware chart
5. Run Data Analysis — select Hamed-Rao MK + Sen's slope + Seasonal Fingerprint
6. Read Case File: Grade B evidence, significant warming trend, p = 0.004; Grade B due to monsoon cloud-mask caveat
7. Export Case File JSON for publication
8. Check Existing Research for related papers on Himalayan temperature trends

**Key output:** Evidence-graded Case File with Mann-Kendall Z, Sen's slope (°C/decade), 95% CI, autocorrelation-corrected p-value, and full provenance.

---

### Use Case 2 — Environmental Journalist

**Goal:** Verify whether Los Angeles has experienced measurable urban warming for a news story.

**Workflow:**
1. Navigate to Case Studies → load IR–042 (Los Angeles urban warming)
2. Read the Explorer-level explanation: "Even though every summer is hot and every winter is mild, the baseline temperature in Los Angeles has steadily climbed by +0.42°C per decade since 2005."
3. Review the trend chart and evidence metrics (99.86% confidence)
4. Click "Explore in Visualization Studio" → examine the 3D seasonal orbit
5. Export the Case File as CSV

**Key output:** Traceable, statistically defensible evidence with source citations.

---

### Use Case 3 — Drought Analyst

**Goal:** Assess long-term soil moisture trends in California's agricultural Central Valley.

**Workflow:**
1. Load Case Study IR–038 (Central Valley hydrological drying) or run a live extraction
2. For live: Super Intelligence search "topsoil moisture Central Valley California" → select GWETTOP from NASA POWER → extract 2001–2024 Monthly
3. Run analysis with Hamed-Rao MK + Sen's slope — soil moisture has strong autocorrelation (r1 ≈ +0.58)
4. Read the Student explanation: "Soil moisture has 'memory' from month to month... Applying the Hamed-Rao correction ensures we don't overstate confidence from persistent dry spells."
5. Note: Hamed-Rao n_eff reduces from 288 to 114 — trend still significant (p = 0.008)

**Key output:** Autocorrelation-corrected trend analysis of soil moisture with n_eff disclosure.

---

### Use Case 4 — Vegetation Scientist

**Goal:** Detect NDVI browning trends in the Amazon Basin as a signal of forest stress.

**Workflow:**
1. Open Living Globe → select NDVI layer → navigate to Amazon Basin cell (cell-amz)
2. Read pre-computed result: Grade B evidence, significant decreasing trend
3. Click to open detailed Case File for the Amazon anchor node
4. Explore in Visualization Studio — examine seasonal profile (dry-season browning vs. wet-season recovery)
5. Use Existing Research to find papers on Amazon greening/browning trends

**Key output:** Pre-computed global trend result with full evidence grade and seasonal pattern analysis.

---

### Use Case 5 — Emergency Preparedness Planner

**Goal:** Assess precipitation outlook for Colombo, Sri Lanka ahead of a potential wet season.

**Workflow:**
1. Click the Colombo marker on the landing globe → opens Forecast Workspace
2. View 72-hour ECMWF ensemble forecast: median, 10th–90th percentile ribbon, all 51 members
3. Select "rolling 24-hour totals" view → identify the wettest expected window
4. Set a threshold amount → view the fraction of ensemble members exceeding it
5. Download forecast CSV for further analysis
6. Navigate to Hazard Investigation (nepal-floods-2024) for a historical disaster reference

**Key output:** 51-member ensemble precipitation forecast with statistical summaries and export.

---

### Use Case 6 — University Course Instructor

**Goal:** Demonstrate statistical trend detection concepts to students using real climate data.

**Workflow:**
1. Open Case Study IR–042 in checkpoint mode
2. Walk through Step 1: "Why do we subtract the seasonal cycle?" → students select the correct answer
3. Walk through Step 2: "What advantage does Sen's slope provide?" → students explain the methodology
4. Use the Methodology page to show the Mann-Kendall formula interactively
5. Have students run their own investigation via Super Intelligence using the provided research suggestions

**Key output:** Educational walkthrough with self-testing checkpoints and real statistical outputs.

---

### Use Case 7 — Snow Cover Monitoring

**Goal:** Assess MODIS snow cover trends in the Himalayan cryosphere with appropriate QA caveats.

**Workflow:**
1. Load Case Study IR–024 (Himalayan cryosphere snow retreat)
2. Read evidence: Grade B assigned due to seasonal monsoon optical cloud-mask caveat
3. Scientist-level explanation: "MOD10CM v061 NDSI snow cover exhibits β = −3.80%/dec (Hamed-Rao p = 0.004, BH-FDR q = 0.009). Assigned Grade B due to seasonal monsoon optical cloud obscuration..."
4. Explore in Visualization Studio — spring/autumn ablation months drive the signal

**Key output:** Evidence-graded snow cover trend with explicit caveat documentation.

---

### Use Case 8 — Multi-Variable Investigation

**Goal:** Connect soil moisture drying in California to temperature warming and vegetation stress.

**Workflow:**
1. Run Track A for GWETTOP in Central Valley → establish drying trend (IR–038)
2. Run Track A for T2M in same region → establish warming trend
3. Run Track A for NDVI in same region → assess vegetation response
4. Compare all three Case Files
5. Use Existing Research to find papers on drought-temperature-vegetation feedback loops

**Key output:** Multi-variable evidence chain linking physical climate variables to ecosystem responses.

---

### Use Case 9 — Historical Disaster Investigation

**Goal:** Reconstruct the precipitation context for the September 2024 Nepal floods.

**Workflow:**
1. Navigate to `/workspace/case-studies/nepal-floods-2024`
2. Review the NASA POWER daily precipitation series (27.7172°N, 85.324°E; 2024-09-15 to 2024-10-08)
3. Note the documentation of hindsight: dates and event context are explicitly disclosed
4. Examine the Meteomatics 72-hour outlook for the region
5. Export source data with SHA-256 hash for verification

**Key output:** Verified daily precipitation reconstruction with historical event context.

---

## 18. Deployment & Local Development

### Production Build

```powershell
npx --yes pnpm@12.18.0 install --frozen-lockfile
npx --yes pnpm@12.18.0 build
npx --yes pnpm@12.18.0 start
```

### TypeScript Check

```powershell
npx tsc --noEmit
```

### After MapLibre Upgrade

```powershell
node scripts/copy-maplibre-worker.mjs
```

### Backend Verification

```powershell
# From backend/
.venv/Scripts/python.exe -m pytest forecasts/tests hazards/tests visualization/tests tests/test_science_pipeline_statistics.py -q
```

### Browser Tests

```powershell
# From repository root
npx playwright test -c playwright.visualization.config.ts forecasts.spec.ts landing.spec.ts hazards.spec.ts immersive.spec.ts mapWorkspace.spec.ts
```

---

## 19. Testing & Verification

### Test Suite Summary

| Test Type | Count | Coverage |
|---|---|---|
| Python backend tests | 136 | Science pipeline, hazards, forecasts, visualization |
| Frontend unit tests | 98 | Visualization adapters, chart computation, spatial logic |
| Browser integration tests | 22 | End-to-end workspace flows, globe, studio, forecasts |

All 136 Python tests, 98 frontend tests, and 22 browser tests pass on the current baseline. Production build, TypeScript check, Ruff linting, and whitespace checks pass.

### Live Verification

**Live checks confirmed (November 15, 2026):**
- Six current point forecasts at all configured forecast points
- Exact retained-snapshot retrieval
- Seven authentic IMERG days for Colombo
- All 49 rolling totals matched at `rtol=atol=1e-12`
- Nepal and Sri Lanka NASA POWER windows: all expected rows, no missing values

### Scientific Validity Scope

Verification confirms: access, shape, arithmetic consistency, correct member-first accumulation, autocorrelation correction, BH-FDR control.

Verification does NOT establish: local forecast reliability or flood-warning skill, generalizability beyond tested regions, independence from future upstream data changes.

---

## 20. Glossary

**Anomaly** — An observation that deviates significantly from the expected seasonal baseline. In Iris, anomalies are defined as observations with |Z-score| ≥ 2.0.

**Area-weighted mean** — A spatial aggregation method where each grid cell's value is weighted by its actual area on Earth's surface using cos(latitude) weighting.

**Autocorrelation** — The correlation between a time series and a delayed copy of itself. Positive autocorrelation in climate data inflates the apparent significance of Mann-Kendall tests if not corrected with Hamed-Rao.

**Benjamini-Hochberg (BH) FDR** — A statistical procedure for controlling the False Discovery Rate when many tests are run simultaneously. Iris reports the adjusted q-value.

**Bounding Box (BBox)** — A rectangular geographic region defined by minimum and maximum latitude and longitude coordinates.

**Case File** — Iris's structured output for a completed investigation. Contains the statistical verdict, all computed metrics, charts, evidence grade, and a full provenance record. Each has a unique immutable ID.

**Cadence** — The temporal frequency of observations. Common cadences: daily, 8-day, 16-day, monthly, seasonal, annual.

**Catalog state** — Whether a dataset has been indexed and is discoverable in Iris's provider catalog.

**Change point** — A date at which a statistically significant structural shift (step change) occurs in a time series, detected using the Pettitt test.

**Confidence interval (CI)** — A range of plausible values for a statistical estimate. In Iris, the 95% CI for Sen's slope is computed using a distribution-free rank-based method.

**Deseasonalization** — The removal of a repeating seasonal cycle from a time series, leaving the underlying long-term trend and residual variability. Iris uses STL decomposition.

**Deterministic algorithm** — A computation that always produces the same output from the same input. All statistical calculations in Iris are deterministic; the AI component is not involved in scientific computation.

**Effective sample size (n_eff)** — The number of statistically independent observations in an autocorrelated series. Positive lag-1 autocorrelation reduces n_eff below the raw month count N.

**Evidence grade** — A quality rating (A through D) assigned to each Case File based on data length, completeness, and statistical robustness.

**Extraction state** — Whether Iris can retrieve live data from a dataset's upstream provider API.

**False Discovery Rate (FDR)** — The expected proportion of significant test results that are actually false positives when many tests are conducted simultaneously.

**Global Trend Cube** — Iris's pre-computed database of trend statistics for every anchor node on Earth across 12 core climate variables, covering 1981–2025.

**GCMD keywords** — Global Change Master Directory keywords — a hierarchical vocabulary maintained by NASA for standardizing the naming of Earth science variables.

**Hamed-Rao correction** — A modification to the Mann-Kendall test (Hamed & Rao, 1998) that accounts for autocorrelation in the time series.

**Mann-Kendall test** — A non-parametric statistical test for detecting monotonic trends in time series data. Does not assume a normal distribution.

**MERRA-2** — Modern-Era Retrospective Analysis for Research and Applications, Version 2. NASA's global atmospheric reanalysis providing the foundation for most NASA POWER variables.

**Monotonic trend** — A trend that is consistently increasing or decreasing, without necessarily being linear. Mann-Kendall specifically tests for monotonicity.

**p-value** — The probability of observing a result as extreme as the one found, if no trend actually exists. In Iris, p ≤ 0.05 is used as the significance threshold.

**Pettitt test** — A non-parametric test for detecting a single change point (structural break) in a time series.

**Provenance** — The documented chain of custody for a data product: which upstream source, which processing steps, which version, when retrieved.

**q-value** — The FDR-adjusted p-value. Used for the global significance filter on the Living Globe (q ≤ 0.05).

**Reanalysis** — A gridded reconstruction of past atmospheric states, created by assimilating historical observations into a numerical weather model. MERRA-2 and ERA5 are examples.

**Sen's slope (Theil-Sen estimator)** — The median of all pairwise slopes between observations. Resistant to outliers and extreme values.

**STL decomposition** — Seasonal and Trend decomposition using Loess. Separates a time series into seasonal, trend, and remainder components.

**Teleconnection** — A statistical relationship between climate anomalies at geographically distant locations (e.g., ENSO).

**Track A / Track B** — Iris's two investigation workflows. Track A: live ad-hoc discovery (Super Intelligence → Data Selection → Data Preview → Data Analysis → Visualize). Track B: pre-computed Global Trend Cube (Living Globe → Data Analysis).

**Trend** — A consistent, directional change in a time series over a sustained period. In Iris, trends are defined as monotonic and are tested using the Mann-Kendall method.

**Trend Triangle** — A matrix of Sen's slopes and p-values computed across all combinations of start year and end year to verify that a trend is not an artifact of endpoint selection.

**Z-score** — A standardized measure of how many standard deviations an observation is from the mean. Z = (observation − mean) / standard deviation. Used in Iris for anomaly detection (|Z| ≥ 2.0 → anomaly).

---

## 21. External Resources & References

### Primary Data Sources

| Source | Description | URL |
|---|---|---|
| **NASA POWER** | Prediction of Worldwide Energy Resource — reanalysis-based climate and meteorological data | [power.larc.nasa.gov](https://power.larc.nasa.gov/) |
| **NASA POWER API Docs** | Point and regional time-series extraction API | [power.larc.nasa.gov/docs/services/api/](https://power.larc.nasa.gov/docs/services/api/) |
| **NASA POWER Methodology** | Dataset methodology and variable definitions | [power.larc.nasa.gov/docs/methodology/](https://power.larc.nasa.gov/docs/methodology/) |
| **NASA POWER FAQs** | Input-source descriptions and community/API unit cautions | [power.larc.nasa.gov/docs/faqs/data/](https://power.larc.nasa.gov/docs/faqs/data/) |
| **NASA CMR** | Common Metadata Repository — dataset discovery | [cmr.earthdata.nasa.gov](https://cmr.earthdata.nasa.gov/) |
| **NASA AppEEARS** | Application for Extracting and Exploring Analysis Ready Samples | [appeears.earthdatacloud.nasa.gov](https://appeears.earthdatacloud.nasa.gov/) |
| **NASA GES DISC (Giovanni)** | Goddard Earth Sciences Data and Information Services Center | [disc.gsfc.nasa.gov](https://disc.gsfc.nasa.gov/) |
| **NASA Giovanni** | Versatile tool for time-series generation and download | [giovanni.gsfc.nasa.gov](https://giovanni.gsfc.nasa.gov/) |
| **Hydrology Time Series (GES DISC)** | Hydrological data time-series tool | [disc.gsfc.nasa.gov/information/tools?title=Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series) |
| **NASA Harmony** | Cloud-based spatial/temporal subsetting | [harmony.earthdata.nasa.gov](https://harmony.earthdata.nasa.gov/) |
| **NASA PO.DAAC** | Physical Oceanography DAAC — sea surface temperature | [podaac.jpl.nasa.gov](https://podaac.jpl.nasa.gov/) |
| **NASA NSIDC DAAC** | National Snow and Ice Data Center — snow cover | [nsidc.org](https://nsidc.org/) |
| **NASA LP DAAC** | Land Processes DAAC — MODIS vegetation data | [lpdaac.usgs.gov](https://lpdaac.usgs.gov/) |
| **NASA GIBS** | Global Imagery Browse Services — tiled satellite imagery | [earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) |
| **NASA JPL GRACE** | GRACE/GRACE-FO Mascon Terrestrial Water Storage | [grace.jpl.nasa.gov](https://grace.jpl.nasa.gov/) |
| **NOAA Climate Data Online (CDO)** | NCEI archive of global historical weather and climate data | [www.ncei.noaa.gov/cdo-web/](https://www.ncei.noaa.gov/cdo-web/) |

### Scientific References

| Reference | Description |
|---|---|
| **Hamed & Rao (1998)** | "A modified Mann-Kendall trend test for autocorrelated data" — Hydrological Sciences Journal — the autocorrelation correction used by Iris |
| **Mann (1945)** | Original Mann-Kendall non-parametric trend test |
| **Sen (1968)** | Sen's slope estimator (Theil-Sen) — robust rate-of-change estimation |
| **Benjamini & Hochberg (1995)** | False Discovery Rate control procedure |
| **Cleveland et al. (1990)** | STL: Seasonal-Trend decomposition using Loess |
| **Pettitt (1979)** | A Non-Parametric Approach to the Change-Point Problem |
| **Rienecker et al. (2011)** | MERRA: NASA's Modern-Era Retrospective Analysis |
| **Acker & Leptoukh (2007)** | NASA Giovanni reference reproducibility benchmark |

### Dataset DOIs

| Dataset | DOI |
|---|---|
| NASA POWER / GMAO MERRA-2 | [doi.org/10.1175/JCLI-D-16-0758.1](https://doi.org/10.1175/JCLI-D-16-0758.1) |
| GPM IMERG Final Run | [doi.org/10.1175/BAMS-D-13-00164.1](https://doi.org/10.1175/BAMS-D-13-00164.1) |
| GLDAS Noah v2.1 | [doi.org/10.1175/BAMS-85-3-381](https://doi.org/10.1175/BAMS-85-3-381) |
| CERES SYN1deg | [doi.org/10.1175/JCLI-D-17-0208.1](https://doi.org/10.1175/JCLI-D-17-0208.1) |
| MODIS MOD13C2 v061 | [doi.org/10.5067/MODIS/MOD13C2.061](https://doi.org/10.5067/MODIS/MOD13C2.061) |
| MODIS MOD10CM v061 | [doi.org/10.5067/MODIS/MOD10CM.061](https://doi.org/10.5067/MODIS/MOD10CM.061) |
| GHRSST MUR | [doi.org/10.5067/GHGMR-4FJ04](https://doi.org/10.5067/GHGMR-4FJ04) |
| GRACE/GRACE-FO Mascon RL06.1Mv03 | [doi.org/10.5067/TEMSC-3MJ63](https://doi.org/10.5067/TEMSC-3MJ63) |

### Forecast & Weather Resources

| Resource | URL |
|---|---|
| Meteomatics API documentation | [meteomatics.com/en/api/](https://www.meteomatics.com/en/api/) |
| Meteomatics model/source documentation | [meteomatics.com/en/api/request/optional-parameters/data-source/](https://www.meteomatics.com/en/api/request/optional-parameters/data-source/) |
| Meteomatics ensemble selection | [meteomatics.com/en/api/request/optional-parameters/ensemble-member-selection/](https://www.meteomatics.com/en/api/request/optional-parameters/ensemble-member-selection/) |
| ECMWF seasonal forecasts | [ecmwf.int/en/forecasts/documentation-and-support/seasonal](https://www.ecmwf.int/en/forecasts/documentation-and-support/seasonal) |

### Climate Analysis Tools (External)

| Tool | Description | URL |
|---|---|---|
| **KNMI Climate Explorer** | Web-based scientific analysis tool for climate data | [climexp.knmi.nl](https://climexp.knmi.nl/) |
| **CUAHSI Hydrological Data** | Consortium of Universities for the Advancement of Hydrologic Science | [cuahsi.org](https://www.cuahsi.org/) |
| **SWOT Mission** | Surface Water and Ocean Topography satellite mission | [asc-csa.gc.ca/eng/satellites/swot/](https://www.asc-csa.gc.ca/eng/satellites/swot/) |

### Open-Source Libraries

| Library | License | Purpose |
|---|---|---|
| Next.js | MIT | Framework |
| React | MIT | UI |
| MapLibre GL | BSD-3-Clause | 2D maps |
| CesiumJS | Apache-2.0 | 3D globe |
| ECharts | Apache-2.0 | 2D charts |
| ECharts-GL | BSD-3-Clause | 3D chart rendering |
| Three.js | MIT | 3D scene |
| COBE | MIT | Landing globe |
| Dockview | MIT | Panel management |
| Turf.js | MIT | Geospatial math |
| FastAPI | MIT | Backend framework |
| pymannkendall | MIT | Mann-Kendall tests |
| statsmodels | BSD-3-Clause | STL decomposition |

### Literature & Scholarly APIs

| Resource | URL |
|---|---|
| OpenAlex API | [api.openalex.org](https://api.openalex.org/) |
| DataCite API | [api.datacite.org/dois](https://api.datacite.org/dois) |
| StatsForecast (future ML reference) | [github.com/Nixtla/statsforecast](https://github.com/Nixtla/statsforecast) |

### Geocoding

| Resource | URL |
|---|---|
| Open-Meteo Geocoding API | [open-meteo.com](https://open-meteo.com/) — WGS84 place geocoder, no API key required |

---

*Documentation version: v1.0.2-SRS-2026.11 · Last updated: November 15, 2026*
