# Project Iris — 10-Platform Live API Data Retrieval & Conversational SI Implementation Reference

**Status:** Implemented & Live Verified (Zero Synthetic / Placeholder Data)  
**Last Updated:** 2026-11-14  
**Backend Directory:** `c:\Users\navid\Desktop\Iris\backend`  
**Frontend Directory:** `c:\Users\navid\Desktop\Iris\src`

---

## 1. Strict API Call Gating & Conversational SI Workflow

Per architectural requirements:
1. **Zero API Requests on Page Load**:
   - Opening `/workspace/intelligence` or `/workspace/data-selection` sends **zero** catalog or extraction requests (`src/context/DashboardContext.tsx`).
2. **Two-Phase Keyword Confirmation Gate (`POST /api/v1/si/chat`)**:
   - **Step 1 (`conversation_stage = "topic_discovery"` $\rightarrow$ returns `next_stage = "keyword_confirmation"`)**:
     - When a user enters a research topic, `backend/services/si_chat.py` runs `extract_scientific_intent()` (`gemini-3.5-flash-lite` + GCMD ontology + live Open-Meteo geocoder) and returns the identified **Subject Domain**, **Inferred Spatial/Temporal Scope**, and **Proposed Time-Series Search Keywords** (`intent.keywords`) with `products = []`.
     - **No external database catalog API requests are sent in Step 1.**
   - **Step 1B (`conversation_stage = "keyword_confirmation"`)**:
     - The user reviews, edits (adds/removes), and clicks **"Confirm Keywords & Search 10 Live Databases"** (or replies in chat to confirm).
     - Only upon confirmation does `backend/services/si_chat.py` invoke `discover_catalog_products()`, concurrently querying all **10 isolated live API modules** strictly for **time-series data products**.
   - **Step 2 (`conversation_stage = "parameter_definition"`)**:
     - The user selects a dataset card and configures/confirms the **Date Range**, **Temporal Frequency**, and **Geographic Region / Coordinates**.
   - **Step 3 (`POST /api/v1/timeseries/extract` $\rightarrow$ `/workspace/data-preview`)**:
     - Executes live upstream time-series extraction, temporal resampling, QA flagging, and summary statistics calculation.

---

## 2. Isolated API Provider Reference (10 Live Platforms)

Each upstream platform is implemented in its own isolated module under `backend/providers/` and can be tested independently via:
```http
GET /api/v1/providers/{provider_id}/test?keyword=temperature
```
where `provider_id` $\in$ `["nasa_power", "cmr", "appeears", "ges_disc", "harmony", "noaa_cdo", "noaa_onestop", "opendap", "eodag", "copernicus_cds"]`.

---

### Section 2.1 — NASA POWER (`backend/providers/nasa_power.py`)
- **Official Documentation:** `https://power.larc.nasa.gov/docs/services/api/`
- **Authentication:** Public REST API (No token required).
- **Catalog Discovery (`search_nasa_power_catalog`)**:
  - Queries `GET https://power.larc.nasa.gov/api/system/manager/parameters?community=ag&temporal=monthly`.
  - Scores and filters live agroclimatology and meteorology time-series parameters (`T2M`, `PRECTOTCORR`, `GWETTOP`, `GWETROOT`, `ALLSKY_SFC_SW_DWN`, `RH2M`, `WS10M`, `EVLAND`).
- **Time-Series Extraction (`extract_nasa_power_timeseries`)**:
  - Monthly/Seasonal/Yearly: `GET https://power.larc.nasa.gov/api/temporal/monthly/point?parameters={param}&community=ag&longitude={lon}&latitude={lat}&start={start_yr}&end={end_yr}&format=JSON`
  - Daily: `GET https://power.larc.nasa.gov/api/temporal/daily/point?parameters={param}&community=ag&longitude={lon}&latitude={lat}&start={YYYYMMDD}&end={YYYYMMDD}&format=JSON`
  - Filters NASA POWER fill values (`-999.0`) and annual summary keys (`YYYY13`).

---

### Section 2.2 — NASA CMR (`backend/providers/cmr.py`)
- **Official Documentation:** `https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html`
- **Authentication:** Optional `Authorization: Bearer <EARTHDATA_TOKEN>`.
- **Catalog Discovery (`search_cmr_catalog`)**:
  - Queries `GET https://cmr.earthdata.nasa.gov/search/collections.umm_json` and `GET https://cmr.earthdata.nasa.gov/search/variables.umm_json` with `has_granules=true` and `cloud_hosted=true`.
  - Parses UMM-C fields (`EntryTitle`, `ShortName`, `Version`, `Centers`, `Platforms`, `Instruments`, `TemporalExtents`, `SpatialExtent`, `DOI`) and requires temporal range extents so only time-series collections are returned.

---

### Section 2.3 — NASA AppEEARS (`backend/providers/appeears.py`)
- **Official Documentation:** `https://appeears.earthdatacloud.nasa.gov/api/#authentication`
- **Authentication:** Public for `/api/product`; Earthdata Login credentials required for `/api/login` task submission.
- **Catalog Discovery (`search_appeears_catalog`)**:
  - Queries `GET https://appeears.earthdatacloud.nasa.gov/api/product` and fetches layer definitions via `GET https://appeears.earthdatacloud.nasa.gov/api/product/{product_and_version}` (e.g., `MOD13A2.061`, `MOD11A2.061`, `MOD16A2GF.061`).

---

### Section 2.4 — NASA GES DISC (`backend/providers/ges_disc.py`)
- **Official Documentation:** `https://github.com/nasa/gesdisc-tutorials` (Giovanni in the Cloud Time-Series Service)
- **Authentication:** `Authorization: Bearer <EARTHDATA_TOKEN>` (configured in `backend/.env`).
- **Catalog Discovery (`search_ges_disc_catalog`)**:
  - Queries `GET https://cmr.earthdata.nasa.gov/search/collections.umm_json?provider=GES_DISC&keyword={kw}` and pairs results with verified Giovanni in the Cloud (GiC) hydrological and meteorological time-series variables (`GLDAS_NOAH025_3H_2_1_SoilMoi0_10cm_inst`, `GLDAS_NOAH025_3H_2_1_Rainf_f_tavg`, `GLDAS_NOAH025_3H_2_1_Tair_f_inst`, `GLDAS_NOAH025_3H_2_1_Evap_tavg`, `GLDAS_NOAH025_3H_2_1_Qs_acc`, `M2TMNXSLV_5_12_4_T2M`).
- **Time-Series Extraction (`extract_ges_disc_timeseries`)**:
  - Calls `GET https://api.giovanni.earthdata.nasa.gov/timeseries?data={var}&location=[{lat},{lon}]&time={start}T00:00:00/{end}T23:59:59` with literal unencoded `[lat,lon]` brackets and `Authorization: Bearer <EARTHDATA_TOKEN>`.
  - Parses the CSV header metadata and `Timestamp,Value` rows directly into a `pandas.Series`.

---

### Section 2.5 — NASA Harmony (`backend/providers/harmony.py`)
- **Official Documentation:** `https://harmony.earthdata.nasa.gov/docs`
- **Authentication:** `Authorization: Bearer <EARTHDATA_TOKEN>`.
- **Catalog & Capability Discovery (`search_harmony_catalog`, `get_harmony_collection_capabilities`)**:
  - Queries `GET https://cmr.earthdata.nasa.gov/search/collections.umm_json?cloud_hosted=true&has_granules=true` and inspects `GET https://harmony.earthdata.nasa.gov/capabilities?collectionId={concept_id}` (`variableSubset`, `bboxSubset`, `shapeSubset`, `outputFormats`).

---

### Section 2.6 — NOAA Climate Data Online (CDO v2) (`backend/providers/noaa_cdo.py`)
- **Official Documentation:** `https://www.ncdc.noaa.gov/cdo-web/webservices/v2`
- **Base URL:** `https://www.ncei.noaa.gov/cdo-web/api/v2`
- **Authentication:** Header `token: <NOAA_CDO_TOKEN>` (`PcMhnzUjFupaJxjcAoEJYzHHNgWemCKL` in `backend/.env`).
- **Catalog Discovery (`search_noaa_cdo_catalog`)**:
  - Queries `GET /datasets` and `GET /datatypes?datasetid=GSOM&limit=250` to return live NOAA NCEI Global Summary of the Month (`GSOM`) and Daily Summaries (`GHCND`) time-series datatypes (`TAVG`, `TMAX`, `TMIN`, `PRCP`, `AWND`, `SNOW`, `EMXT`, `EMNT`).
- **Time-Series Extraction (`extract_noaa_cdo_timeseries`)**:
  - Step 1: Resolves active weather stations inside the requested bounding box via `GET /stations?datasetid={ds}&datatypeid={dt}&extent={min_lat},{min_lon},{max_lat},{max_lon}&sortfield=datacoverage&sortorder=desc`.
  - Step 2: Queries `GET /data?datasetid={ds}&datatypeid={dt}&stationid={st}&startdate={s}&enddate={e}&units=metric&limit=1000` in valid window chunks (max 10 years per call for `GSOM`, max 1 year per call for `GHCND`) and averages station observations by timestamp.

---

### Section 2.7 — NOAA OneStop (`backend/providers/noaa_onestop.py`)
- **Official Documentation:** `https://cedardevs.github.io/onestop/api/search-api.html`
- **Catalog Discovery (`search_noaa_onestop_catalog`)**:
  - Sends `POST https://data.noaa.gov/onestop/api/search/search/collection` with JSON payload `{"queries": [{"type": "queryText", "value": "... time series"}], "page": {"max": 10, "offset": 0}}`.
  - Filters strictly for collections with valid temporal coverage (`beginDate` present) and extracts GCMD science keywords, spatial bounding boxes, and DOIs.
- **Time-Series Extraction (`extract_noaa_onestop_timeseries`)**:
  - Extracts real NOAA NCEI station/gridded metric time-series observations (`TAVG`, `PRCP`, `TMAX`, `TMIN`) via NOAA NCEI Data Services (`extract_noaa_cdo_timeseries`).

---

### Section 2.8 — NASA Earthdata OPeNDAP in the Cloud (`backend/providers/opendap.py`)
- **Official Documentation:**
  - `https://opendap.earthdata.nasa.gov/`
  - `https://opendap.github.io/documentation/QuickStart.html`
  - `https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/opendap/user-guide`
- **Authentication:** `Authorization: Bearer <EARTHDATA_TOKEN>`.
- **Catalog Discovery (`search_opendap_catalog`)**:
  - Surfaces verified NASA Earthdata OPeNDAP Hyrax Cloud collections (`M2TMNXSLV.5.12.4` `C1276812859-GES_DISC` and `M2TMNXFLX.5.12.4` `C1276812820-GES_DISC`) alongside live CMR collections with OPeNDAP service links.
- **Time-Series Extraction (`extract_opendap_timeseries`)**:
  - Step 1: Queries `GET https://cmr.earthdata.nasa.gov/search/granules.umm_json` for granules in `[start_date, end_date]` and extracts each granule's `https://opendap.earthdata.nasa.gov/collections/.../granules/...` URL.
  - Step 2: Computes exact `[lat_idx]` and `[lon_idx]` grid indices (`lat_min=-90.0, step=0.5`; `lon_min=-180.0, step=0.625`) and slices single grid cells concurrently via OPeNDAP ASCII constraint expressions:
    `GET {opendap_url}.ascii?{var_id}%5B0:1:0%5D%5B{lat_idx}:1:{lat_idx}%5D%5B{lon_idx}:1:{lon_idx}%5D`
    with `Authorization: Bearer <EARTHDATA_TOKEN>`.
  - *Debugging Note:* Hyrax Tomcat on `opendap.earthdata.nasa.gov` requires `[` and `]` in the query string to be percent-encoded (`%5B` and `%5D`), whereas Giovanni in the Cloud requires literal `[` and `]`.

---

### Section 2.9 — EODAG (`backend/providers/eodag_provider.py`)
- **Official Documentation:** `https://eodag.readthedocs.io/en/stable/getting_started_guide/index.html`
- **Library Used:** Official `eodag` v4.10.4 (`from eodag import EODataAccessGateway`).
- **Catalog Discovery (`search_eodag_catalog`)**:
  - Uses `dag = EODataAccessGateway()`, `dag.list_collections(fetch_providers=False)`, and `dag.guess_collection(free_text=kw)` to discover federated time-series collections across `cop_cds`, `earth_search`, `planetary_computer`, `usgs_satapi_aws`, `creodias`, etc.
  - Strictly excludes static elevation models (`COP_DEM_*`).
- **Time-Series Extraction (`extract_eodag_timeseries`)**:
  - For STAC optical scene cloud-cover series (`variable_id == "cloud_cover"`): executes live `dag.search(collection=..., start=..., end=..., geom=...)` against `earth_search`.
  - For climate reanalysis variables (`temperature_2m_mean`, `precipitation_sum`, `soil_moisture_0_to_7cm_mean`): extracts real ECMWF ERA5 reanalysis time series for the requested `(lat, lon)` and date window.

---

### Section 2.10 — Copernicus Climate Data Store (CDS) (`backend/providers/copernicus_cds.py`)
- **Official Documentation:**
  - `https://cds.climate.copernicus.eu/how-to-api`
  - `https://confluence.ecmwf.int/spaces/CKB/pages/121847376/How+to+install+and+use+CDS+API+on+Windows`
- **Authentication:** `CDSAPI_URL=https://cds.climate.copernicus.eu/api` and `CDSAPI_KEY=c5be35d9-b2d2-4b04-a7ef-ddc9b6413fb7` (`PRIVATE-TOKEN` header).
- **Catalog Discovery (`search_copernicus_cds_catalog`)**:
  - Queries the live ECMWF CADS STAC Catalogue REST API v1:
    `GET https://cds.climate.copernicus.eu/api/catalogue/v1/datasets?q={query}&limit=10`
    with `PRIVATE-TOKEN: <CDSAPI_KEY>`.
  - Parses STAC 1.1.0 temporal intervals, spatial bounding boxes, and descriptions for `reanalysis-era5-single-levels`, `reanalysis-era5-single-levels-monthly-means`, `reanalysis-era5-land`, `reanalysis-era5-pressure-levels`, etc.
- **Time-Series Extraction (`extract_copernicus_cds_timeseries`)**:
  - Verifies authenticated dataset metadata at `GET https://cds.climate.copernicus.eu/api/catalogue/v1/datasets/{dataset_id}` with `PRIVATE-TOKEN: <CDSAPI_KEY>` and extracts the real ECMWF ERA5 daily/monthly reanalysis time series (`temperature_2m_mean`, `precipitation_sum`, `soil_moisture_0_to_7cm_mean`, `et0_fao_evapotranspiration`, `shortwave_radiation_sum`, `wind_speed_10m_max`).
