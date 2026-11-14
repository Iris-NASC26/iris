# Project Iris / Earth Trend Detective — Codebase & Developer Handbook

**Controlling Specification:** SRS v1.0 Integrated Revision  
**Parent Document:** [00_master_architecture_and_merge_guide.md](file:///c:/Users/navid/Desktop/Iris/model%20context/00_master_architecture_and_merge_guide.md)  
**Target Audience:** Future AI coding agents, maintainers, and Earth observation software engineers.

---

## 1. Repository Layout & Architecture Overview

The repository is organized into a clean decoupled cloud-native architecture:
- **Frontend (`/src`):** Next.js 15+ App Router, React 19, TypeScript, and Tailwind CSS v4.
- **Backend (`/backend`):** Python 3.11+ FastAPI service, NumPy, SciPy, Pandas, Statsmodels, and HTTPX.
- **Model Context (`/model context`):** Authoritative architecture specifications, requirements matrices, and mathematical algorithms.

```
c:\Users\navid\Desktop\Iris\
├── backend/
│   ├── adapters/
│   │   ├── catalog_adapters.py      # Multi-provider concurrent discovery orchestrator
│   │   └── extraction_adapters.py   # Resampling, QA masking & extraction dispatcher
│   ├── providers/
│   │   ├── appeears.py              # NASA AppEEARS async task client
│   │   ├── cmr.py                   # NASA Common Metadata Repository client
│   │   ├── geocoder.py              # Open-Meteo geocoding & gazetteer client
│   │   ├── ges_disc.py              # NASA Giovanni in the Cloud (GiC) client
│   │   ├── harmony.py               # NASA Harmony Cloud transformation client
│   │   └── nasa_power.py            # NASA POWER synchronous time-series client
│   ├── services/
│   │   ├── capability_matrix.py     # Runtime provider readiness & capability engine
│   │   ├── cube_service.py          # Global Trend Cube gridded layer service
│   │   ├── job_store.py             # Durable disk/memory job state & SHA-256 caching
│   │   ├── llm_router.py            # Gemini 3.5 Flash-Lite intent parser & GCMD fallback
│   │   ├── science_pipeline.py      # Hamed-Rao MK, Sen's slope, STL, Pettitt & Grading
│   │   └── si_chat.py               # Multi-turn conversational intelligence assistant
│   ├── config.py                    # Environment settings (.env) & secrets management
│   ├── main.py                      # FastAPI app entry point & route definitions
│   ├── requirements.txt             # Python backend dependencies
│   └── schemas.py                   # Unified Pydantic v2 data contracts
│
├── src/
│   ├── app/
│   │   ├── api/v1/                  # Next.js API proxy routes forwarding to FastAPI
│   │   ├── workspace/
│   │   │   ├── layout.tsx           # Shared workspace shell & navigation bar
│   │   │   ├── intelligence/        # SI natural-language discovery interface
│   │   │   ├── data-selection/      # Dataset parameter & boundary configuration
│   │   │   ├── data-preview/        # Time-series preview, KPIs, map & tabular export
│   │   │   ├── globe/               # 3D Living Globe visualization engine
│   │   │   ├── visualize/           # Deep Scientific Case File analysis suite
│   │   │   ├── case-studies/        # Peer-reviewed guided investigations
│   │   │   ├── research/            # User scratchpad & hypothesis lab
│   │   ├── methodology/             # Public methodology & validation documentation
│   │   ├── layout.tsx & page.tsx    # Root layout & landing page
│   ├── components/
│   │   ├── dashboard/               # DataPreviewView, OnboardingTour, UI widgets
│   │   ├── layout/                  # PageShell, PublicNavbar, InfoCard
│   │   └── ui/                      # Icons, Buttons, Modal Dialogs
│   ├── context/
│   │   ├── DashboardContext.tsx     # Centralized React state for live retrieval workflow
│   │   └── ThemeContext.tsx         # Dark/Light theme manager
│   └── lib/
│       ├── dataRetrievalEngine.ts   # Frontend types, API fetch helpers & state schemas
│       ├── srsCubeAndScienceEngine.ts # Offline cube snapshots & reference datasets
│       └── (statistics are computed in backend/services/science_pipeline.py)
│
└── model context/
    ├── 00_master_architecture_and_merge_guide.md
    ├── 01_integrated_srs_requirements_matrix.md
    ├── 02_live_data_retrieval_and_providers.md
    ├── 03_global_trend_cube_and_science_pipeline.md
    ├── 04_codebase_developer_handbook.md
    └── pdf/
        └── Earth_Trend_Detective_SRS_v1.0_Integrated.pdf
```

---

## 2. Frontend State Management & Workflow Wiring

The frontend coordinates state through two complementary mechanisms:
1. **Centralized React Context (`src/context/DashboardContext.tsx`):**
   - `discoveryResult`: Stores current search intent, query keywords, and candidate `DataProduct` list.
   - `selectedProducts`: Array of user-selected datasets for extraction.
   - `activeProduct`: Primary product currently configured on `/workspace/data-selection`.
   - `extractionConfig`: Temporal dates, frequency, spatial geometry (BBox/Point/Preset), and aggregation settings.
   - `activeJobId`: ID of the running or completed extraction job.
   - `extractedPreview`: Immutable preview payload displayed on `/workspace/data-preview/[jobId]`.
2. **URL Search Parameters (Deep-Linking):**
   - `/workspace/data-preview/[jobId]`: Directly loads any saved or shared extraction result.
   - `/workspace/visualize?jobId=...`: Loads an extracted time series into the deep Case File.
   - `/workspace/globe?layer=cube_t2m`: Directs the 3D globe to a specific climate variable.

---

## 3. Canonical API Routes Inventory

Next.js provides transparent proxy routes in `src/app/api/v1/` that forward requests to the FastAPI backend (`http://localhost:8000` by default):

| Endpoint Route | HTTP Method | Handler Location | Primary Role |
| :--- | :---: | :--- | :--- |
| `/api/v1/si/discover` | `POST` | `backend/main.py` | Runs Gemini intent extraction + concurrent catalog discovery. |
| `/api/v1/si/chat` | `POST` | `backend/main.py` | Multi-turn conversational chat with the System Intelligence assistant. |
| `/api/v1/catalog/product-details` | `GET` | `backend/main.py` | Fetches deep metadata, variables, and license info for a product. |
| `/api/v1/geocode` | `GET` | `backend/main.py` | Resolves place names to coordinates via Open-Meteo Geocoder. |
| `/api/v1/timeseries/extract` | `POST` | `backend/main.py` | Submits extraction request; dispatches to sync or async provider. |
| `/api/v1/timeseries/jobs/{id}/status` | `GET` | `backend/main.py` | Polls progress of an asynchronous extraction task. |
| `/api/v1/timeseries/jobs/{id}/preview` | `GET` | `backend/main.py` | Retrieves completed preview payload (KPIs, time-series, QA flags). |
| `/api/v1/cube/manifest` | `GET` | `backend/main.py` | Returns Global Trend Cube metadata and available gridded layers. |
| `/api/v1/cube/globe` | `GET` | `backend/main.py` | Serves global gridded trend cells for 3D globe rendering. |
| `/api/v1/analyze/case-file` | `POST` | `backend/main.py` | Executes full statistical suite (MK, Sen, STL, Pettitt, Emergence). |
| `/api/v1/evidence/registry` | `GET` | `backend/main.py` | Returns evidence grades, caveat definitions, and validation benchmarks. |
| `/api/v1/capabilities` | `GET` | `backend/main.py` | Exposes dynamic provider readiness and live/offline status. |

---

## 4. Developer & AI Agent Extension Recipes

### Recipe 1: Adding a New Upstream Data Provider
1. **Create Provider Client:** Add `backend/providers/{new_provider}.py` implementing:
   - `search_catalog(keywords, bbox, time_range) -> List[DataProduct]`
   - `extract_series(req: ExtractionRequest) -> List[ObservationRow]`
2. **Register in Orchestrators:**
   - Add discovery call to `backend/adapters/catalog_adapters.py`.
   - Add extraction dispatch logic to `backend/adapters/extraction_adapters.py`.
3. **Register in Capability Matrix:**
   - Update `backend/services/capability_matrix.py` declaring whether the provider is `planned`, `documented`, or `verified` for discovery and extraction separately.
4. **Enforce Real Data Rule:** Ensure that network errors return typed exceptions (`ProviderUnavailableError`) and **never** return fabricated synthetic arrays.

### Recipe 2: Adding a New Global Trend Cube Layer
1. **Define Layer Metadata:** In `backend/services/cube_service.py` and `src/lib/srsCubeAndScienceEngine.ts`, append a new `CubeLayerManifest` entry to `CUBE_LAYERS`:
   ```typescript
   {
     layer_id: "cube_sea_ice",
     title: "Sea Ice Concentration",
     parameter_name: "sea_ice_fraction",
     units: "%",
     source_agency: "NSIDC / NASA",
     resolution: "0.5°",
     palette: "Blues_r"
   }
   ```
2. **Add Gridded Values:** In `_compute_cell_metrics_for_layer()` (`backend/services/cube_service.py`), add the computation or pre-sliced data array for the layer.
3. **Connect to Globe:** The layer will automatically appear in the 3D Globe layer switcher.

### Recipe 3: Running and Verifying the System
- **Run Backend:**
  ```powershell
  cd c:\Users\navid\Desktop\Iris\backend
  python -m uvicorn main:app --reload --port 8000
  ```
- **Run Frontend:**
  ```powershell
  cd c:\Users\navid\Desktop\Iris
  pnpm dev
  ```
- **Run Type Checks & Linters:**
  ```powershell
  cd c:\Users\navid\Desktop\Iris
  pnpm build
  ```

---

## 5. Summary Checklist for Code Quality & Scientific Integrity

When writing code in this repository, always verify:
- [ ] **No Synthetic Data:** User-facing responses must come from real upstream responses or verified, pinned snapshots.
- [ ] **Statistics Decide:** Never allow LLM text generation to invent or mutate statistical values or evidence grades.
- [ ] **Autocorrelation Correction:** Any Mann-Kendall test performed on environmental time series must use the Hamed-Rao variance correction.
- [ ] **FDR Control:** Any spatial or multi-variable testing must report Benjamini-Hochberg $q$-values to prevent false positive inflation.
- [ ] **Non-Causal Framing:** Never present statistical correlation as definitive environmental causality without formal attribution evidence.
