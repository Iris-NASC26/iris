# Project Iris / Earth Trend Detective — Integrated SRS Requirements Matrix

**Controlling Specification:** SRS v1.0 Integrated Revision (13 November 2026)  
**Parent Document:** [00_master_architecture_and_merge_guide.md](file:///c:/Users/navid/Desktop/Iris/model%20context/00_master_architecture_and_merge_guide.md)  
**Priority Legend:**  
- **P0:** Mandatory for core demonstrable release and competition baseline.  
- **P1:** Planned high-value capability.  
- **P2:** Stretch / experimental enhancement.  

---

## 1. Functional Requirements Matrix

### 1.1 Variable Catalog & Discovery (VC)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **VC-01** | P0 | The system shall provide a curated catalog of standard Earth observation climate variables (Near-surface Air Temp, Precipitation, Soil Moisture, Vegetation NDVI, Snow Cover, SST, Downward Solar Radiation, Relative Humidity, Runoff). | Implemented via `CUBE_LAYERS` in `backend/services/cube_service.py` and `src/lib/srsCubeAndScienceEngine.ts`. |
| **VC-02** | P0 | Variable cards shall display: variable name, physical units, sensor/mission source, temporal span, native spatial resolution, and data provider. | Implemented in `src/app/workspace/intelligence/page.tsx` and `DataSelection` cards. |
| **VC-03** | P0 | The system shall support natural language query parsing via System Intelligence to map colloquial queries to standardized GCMD / CF science keywords and variables. | Implemented via `extract_scientific_intent()` in `backend/services/llm_router.py` using `gemini-3.5-flash-lite`. |
| **VC-04** | P0 | The system shall include a rule-based deterministic fallback for query parsing if external LLM services are disabled or offline. | Implemented via GCMD ontology dictionary and geographical gazetteer in `backend/services/llm_router.py`. |
| **VC-05** | P0 | Users shall be able to filter discovery results by upstream provider agency (NASA, NOAA, Copernicus/EODAG, CSA/Geo.ca, OPeNDAP). | Implemented in `src/app/workspace/intelligence/page.tsx` via `Advanced Source Filter`. |
| **VC-06** | P0 | Discovery queries to upstream provider adapters shall execute concurrently with independent timeouts, bounded concurrency, and isolated failure handling. Partial failure of one provider shall not fail the search. | Implemented in `backend/adapters/catalog_adapters.py` via `asyncio.gather(return_exceptions=True)`. |
| **VC-07** | P0 | Each discovered `DataProduct` record shall distinguish between catalog existence and extraction readiness, exposing authentication requirements, geometry support, and API limits. | Schema defined in `backend/schemas.py` and enforced in `src/lib/dataRetrievalEngine.ts`. |

---

### 1.2 Data Selection & Parameter Configuration (DS)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **DS-01** | P0 | The selection interface shall present the chosen product's authoritative bounds, native resolution, available cadence, and authentication requirements. | Implemented in `src/app/workspace/data-selection/page.tsx`. |
| **DS-02** | P0 | The date selection shall clamp to authoritative product bounds, validate chronological ordering (start <= end), and provide standard presets (Last 1 Year, Last 5 Years, Last 10 Years, Full Available Record). | Implemented in `src/app/workspace/data-selection/page.tsx` and validated server-side. |
| **DS-03** | P0 | Temporal cadence options shall be restricted to provider-supported frequencies (Daily, 8-Day, 16-Day, Monthly, Seasonal, Yearly). Finer-than-native frequencies shall be disabled to prevent artificial oversampling. | Enforced in `backend/adapters/extraction_adapters.py` and UI cadence selectors. |
| **DS-04** | P0 | Temporal aggregation functions (mean, sum, min, max) shall be restricted to physically valid methods (e.g. sum for precipitation/runoff; mean for temperature/soil moisture). | Enforced in `backend/adapters/extraction_adapters.py`. |
| **DS-05** | P0 | Spatial selection shall support Point coordinates, Bounding Box (BBox), Country/Regional presets (e.g. Sahel, Amazon Basin, Aral Sea), and Global scope with spatial reduction options (Area Mean, Median, Preserve Grid). | Implemented in `src/app/workspace/data-selection/page.tsx` with synced interactive map. |

---

### 1.3 Data Acquisition & Time-Series Extraction (DA / EX)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **EX-01** | P0 | The backend shall orchestrate data extraction using dedicated provider adapters (NASA POWER, GES DISC GiC, AppEEARS, CMR/Harmony). | Implemented in `backend/adapters/extraction_adapters.py` and `backend/providers/`. |
| **EX-02** | P0 | Synchronous and asynchronous provider workflows shall be managed uniformly via a unified job abstraction with durable job state (`queued`, `running`, `completed`, `failed`). | Implemented in `backend/services/job_store.py` with disk persistence and SHA-256 result hashing. |
| **EX-03** | P0 | The extraction pipeline shall perform quality assurance masking: source nodata fills and flagged corrupted values shall be isolated with distinct reason codes rather than silently dropped or zeroed. | Implemented in `backend/adapters/extraction_adapters.py` (`ObservationRow.quality_flag`). |
| **EX-04** | P0 | Time series resampling to user-selected frequency shall compute valid coverage fractions and flag bins with incomplete source observation coverage. | Implemented in `backend/adapters/extraction_adapters.py`. |
| **EX-05** | P0 | Every extracted observation shall carry metadata provenance including: product ID, provider agency, citation DOI, extraction timestamp (UTC), processing level, and spatial reduction method. | Schema enforced via `ObservationRow` and `PreviewResponse`. |
| **EX-06** | P0 | Zero synthetic data rule: Under no circumstances shall an extraction adapter fabricate fake numbers to simulate upstream success. If upstream fails, return an explicit error or load a verified real snapshot. | Enforced across all backend extraction routes and adapters. |

---

### 1.4 Data Preview & Verification (DP)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **DP-01** | P0 | The preview screen shall display extraction progress stages: Request Submitted -> Subsetting & QA Masking -> Temporal Resampling -> Ready for Preview. | Implemented in `src/components/dashboard/DataPreviewView.tsx`. |
| **DP-02** | P0 | Summary KPI cards shall display total observations, valid count, missing count, completeness percentage, mean, standard deviation, and min/max values with timestamps. | Implemented in `DataPreviewView.tsx` with >15% missingness warning alert. |
| **DP-03** | P0 | The interactive time-series preview chart shall be gap-aware (not connecting missing intervals with deceptive continuous lines), with hover tooltips displaying date, value, unit, and QA flag. | Implemented using responsive canvas/SVG charting with missing band overlays. |
| **DP-04** | P0 | The preview screen shall provide an interactive geospatial footprint map confirming spatial extent and a paginated, sortable tabular data grid. | Implemented in `DataPreviewView.tsx`. |
| **DP-05** | P0 | Export affordances shall generate downloadable CSV and JSON files including full ISO 19115 provenance headers. "Proceed to Analysis" shall pass the immutable job/result ID to the science workspace. | Implemented via client-side blob export and route transition to `/workspace/visualize`. |

---

### 1.5 Living Globe 3D (GL)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **GL-01** | P0 | The system shall render an interactive 3D virtual globe displaying pre-computed Global Trend Cube monthly layers (0.5° and 1.0° gridded data). | Implemented in `src/app/workspace/globe/page.tsx`. |
| **GL-02** | P0 | Global cells shall be color-coded by decadal trend magnitude using perceptually uniform, colorblind-safe diverging palettes (e.g. blue-to-red for temperature; brown-to-green for NDVI and precipitation). | Implemented with documented scientific zero-centering and color scales. |
| **GL-03** | P0 | Statistically non-significant grid cells (FDR adjusted $q > 0.05$) shall be visibly masked or dimmed, allowing users to focus on verified trends. | Implemented via FDR toggle overlay in `GlobeView`. |
| **GL-04** | P0 | Clicking any grid cell on the globe shall display an inspection tooltip showing coordinates, 1981–2025 Sen's slope, Mann-Kendall p-value, and evidence grade. | Implemented in `src/app/workspace/globe/page.tsx`. |
| **GL-05** | P1 | Time-lapse playback mode shall animate monthly global anomaly fields across historical decades (1981–2025). | Supported via time slider and animation hooks. |
| **GL-06** | P1 | "Opposite Trends" mode shall automatically highlight antipodal or dipole regions displaying inverse trends (e.g. Arctic warming vs. Antarctic sea ice stability, or ENSO teleconnections). | Implemented in `GlobeView` and `SeesawDipoleSection`. |

---

### 1.6 Dynamic Case File & Scientific Analysis (AN / VZ)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **AN-01** | P0 | The system shall compute non-parametric **Sen's Slope Estimator** for decadal trend magnitude along with 95% non-parametric confidence intervals. | Implemented in `backend/services/science_pipeline.py` and `src/lib/statistics.ts`. |
| **AN-02** | P0 | The system shall compute the **Hamed-Rao Modified Mann-Kendall Test** to assess monotonic trend significance while correcting for serial lag-1 autocorrelation. | Implemented in `backend/services/science_pipeline.py`. |
| **AN-03** | P0 | The system shall perform **STL Decomposition** (Seasonal and Trend decomposition using Loess) to extract long-term trend, seasonal harmonics, and residual anomalies. | Robust STL (period 12) is used for complete regular monthly records of at least two annual cycles. Missing/irregular records use an explicitly labeled calendar-month climatology adjustment without gap filling; this fallback is not STL. |
| **AN-04** | P0 | The system shall compute the **Pettitt Non-Parametric Change-Point Test** to locate the exact year/month of abrupt regime shifts in the historical series. | Implemented in `science_pipeline.py` and `statistics.ts`. |
| **AN-05** | P0 | The system shall evaluate **Signal Emergence (Time of Emergence)**: calculating the signal-to-noise ratio ($S/N = |\text{Trend}| / \sigma_{\text{residual}}$) and the year when $S/N > 2.0$. | Implemented in `science_pipeline.py`. |
| **AN-06** | P0 | The system shall assign an objective **Evidence Grade (A, B, C, D)** based on data completeness, sample length, autocorrelation-corrected p-value, and sensor stability. | Implemented in `_evaluate_evidence_grade()`. |
| **AN-07** | P0 | Three Progressive Disclosure levels shall be supported: **Explorer**, **Student**, and **Scientist**, dynamically revealing mathematical depth and test statistics. | Implemented in `/workspace/visualize`. |
| **VZ-01** | P0 | The interface shall provide a **Seasonal Fingerprint** heatmap displaying year-by-month temperature/anomaly shifts. | Implemented in `/workspace/visualize`. |
| **VZ-02** | P0 | The interface shall provide an **Anomaly Strip Barcode** color-coded by normalized z-score departures. | Implemented in `/workspace/visualize`. |

---

### 1.7 Outlook Projections (FC)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **FC-01** | P0 | The system shall project historical trends into future decades (e.g. 2030, 2040, 2050) using Sen's slope bounds with a prominent caveat label: *"Trend Continuation Projection — Not a Climate Model Forecast"*. | Implemented in `science_pipeline.py` and `visualize/page.tsx`. |
| **FC-02** | P1 | The system shall provide a short-term statistical forecast (12–24 months) using seasonal autoregression, accompanied by historical out-of-sample backtest validation metrics (RMSE, MAE). | Implemented in `science_pipeline.py`. |

---

### 1.8 Guided Investigations & Educational Stories (ED / VL)

| ID | Priority | Requirement Statement | Implementation / Verification State |
| :--- | :---: | :--- | :--- |
| **ED-01** | P0 | The system shall bundle at least three curated, peer-reviewed guided investigations based on published literature (e.g. Acker et al. 2009 reference regions): 1. Aral Sea Desiccation, 2. Sahel Regreening / Drought, 3. Arctic Amplification. | Implemented in `src/app/workspace/case-studies/page.tsx` and `srsCubeAndScienceEngine.ts`. |
| **ED-02** | P0 | Each guided story shall provide step-by-step narrative checkpoints, primary satellite evidence citations, and a *"Try It Yourself"* button transferring boundaries to live workspace tools. | Implemented in `case-studies/page.tsx`. |
| **ED-03** | P0 | The platform shall include an integrated Scientific Glossary defining core Earth science, remote sensing, and statistical terms. | Implemented in `srsCubeAndScienceEngine.ts` and `/methodology`. |
| **VL-01** | P0 | The platform shall provide a public Methodology & Validation Lab page documenting all data sources, APIs, mathematical algorithms, caveat registries, and validation benchmarks. | Implemented at `/methodology`. |

---

## 2. Non-Functional Requirements Matrix

| Category | Requirement | Specification & Verification Method |
| :--- | :--- | :--- |
| **Performance** | Interactive Latency | Global cube cell queries shall return in under 500 ms. Synchronous time-series extracts (NASA POWER) shall complete within 3 seconds. |
| **Reliability** | Zero Crash Isolation | Failure of any individual external API (e.g. NASA AppEEARS token expiration or CMR 503) shall be isolated; the application shall remain functional and report granular diagnostics. |
| **Data Integrity** | Strict Real-Data Guarantee | Production observation channels must reject synthetic numbers. If offline, the platform automatically switches to verified, pinned real snapshots (`v1.0.2-SRS-2026.11`). |
| **Accessibility** | WCAG 2.1 AA Compliance | All UI elements maintain minimum 4.5:1 color contrast, complete keyboard navigability, ARIA labels on chart visualizers, and colorblind-safe palettes (Viridis, Magma, Coolwarm). |
| **Portability** | Multi-Platform Execution | Runs seamlessly on standard modern browsers (Chrome, Firefox, Safari, Edge) on Windows, macOS, and Linux without native binary dependencies. |
| **Security** | Server-Side Secrets | External API credentials (NASA Earthdata tokens, Google Gemini API keys) are stored securely in backend server environment variables (`.env`) and never exposed in client bundles. |
