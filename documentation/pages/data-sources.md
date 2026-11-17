# Data Sources & Variables

Iris sources all data from established, publicly funded Earth observation archives. This page documents the available variables, their upstream providers, and what each measures.

---

## Zero synthetic data policy

Iris has a strict policy: **no synthetic or fabricated data appears in any user-facing result**.

All numbers come from one of two sources:
1. **Live upstream APIs** — real-time retrieval from NASA, NOAA, and other provider endpoints
2. **Verified real snapshots** — pinned, SHA-256-hashed copies of real observations, used to ensure the platform works offline (e.g., in air-gapped environments or low-connectivity workshops)

Synthetic data fixtures exist only in internal test harnesses and are blocked from all production endpoints.

---

## Core variables (Global Trend Cube)

These six variables are pre-computed in the Global Trend Cube, available on the Living Globe, and covering 1981–2025:

| Variable | Short name | Units | Primary source | Resolution |
|---|---|---|---|---|
| Near-surface Air Temperature | `T2M` | °C | NASA POWER / MERRA-2 | 0.5° × 0.5° |
| Total Precipitation Rate | `PRECTOT` | mm/day | NASA POWER / GPCP v2.3 | 0.5° × 0.5° |
| Topsoil Moisture (0–5cm) | `SFMC` | 0–1 fraction | NASA POWER / GLDAS Noah | 0.5° × 0.5° |
| Vegetation Index (NDVI) | `NDVI` | –1 to +1 index | MODIS (MOD13C2) | 0.05° |
| Downward Solar Radiation | `ALLSKY_SFC_SW_DWN` | kWh/m²/day | NASA POWER / CERES SYN1deg | 0.5° × 0.5° |
| Relative Humidity (2m) | `RH2M` | % | NASA POWER / MERRA-2 | 0.5° × 0.5° |

---

## Extended variables (Live discovery)

Additional variables are available through live provider searches in Super Intelligence. These include but are not limited to:

| Category | Examples |
|---|---|
| **Atmospheric** | Dew point, wind speed, cloud fraction, aerosol optical depth |
| **Hydrological** | Runoff, evapotranspiration, snow water equivalent, river discharge |
| **Cryosphere** | Snow cover fraction, sea ice extent (via NSIDC) |
| **Ocean** | Sea surface temperature (SST), ocean heat content |
| **Land surface** | Surface albedo, land surface temperature (LST), fire radiative power |

---

## Data providers

### NASA POWER (Prediction Of Worldwide Energy Resources)

**What it provides:** Atmospheric and surface meteorological parameters derived from NASA MERRA-2 reanalysis and CERES satellite products.

**Strengths:**
- Global coverage, land and ocean
- Continuous record from 1981 to near-present (updated with ~3–7 day latency)
- No authentication required for most endpoints
- Consistently formatted JSON/CSV API

**Key variables:** Near-surface temperature, precipitation, humidity, wind, solar radiation, evapotranspiration

**Citation:** Stackhouse Jr., P.W. et al. (2024). POWER Data and Services. NASA Langley Research Center.

---

### NASA MERRA-2 (Modern Era Retrospective analysis for Research and Applications, Version 2)

**What it provides:** A global atmospheric reanalysis product combining satellite observations and atmospheric modeling.

**Strengths:**
- Consistent long record from 1980 to present
- Physically consistent across all variables (derived from the same model run)
- Hourly, daily, and monthly temporal resolution

**Key variables:** Atmospheric temperature at multiple levels, precipitation, winds, moisture fluxes

---

### MODIS (Moderate Resolution Imaging Spectroradiometer)

**What it provides:** Satellite-derived surface products from Terra and Aqua platforms.

**Key products:**
- **MOD13C2** — Monthly NDVI and EVI at 0.05° resolution (2000–present)
- **MOD11C3** — Monthly land surface temperature at 0.05° resolution
- **MOD10CM** — Monthly snow cover fraction

**Strengths:** Direct satellite observation (not modeled), high spatial resolution, long continuous record

**Access:** Via NASA AppEEARS (Application for Extracting and Exploring Analysis Ready Samples)

---

### NASA GPM / GPCP (Global Precipitation Climatology Project)

**What it provides:** Multi-satellite gauge-adjusted precipitation estimates.

**Key products:**
- **GPCP v2.3** — Monthly precipitation, global, 1979–present
- **GPM IMERG** — Sub-daily precipitation, 2000–present

**Strengths:** Best available global precipitation dataset; combines satellite and rain gauge observations

---

### GES DISC GiC (Giovanni in the Cloud)

**What it provides:** Web-based interface and API for exploring and extracting hundreds of NASA data products.

**Note:** Iris uses the modern GiC REST API. The legacy CGI-based "Data Rods" endpoint (`hydro1.gesdisc.eosdis.nasa.gov`) is explicitly excluded — it has been retired.

---

### NOAA Climate Data Online (CDO)

**What it provides:** Quality-controlled in-situ surface observations from weather stations worldwide.

**Strengths:** Station-level data for point validations; long historical records for specific cities and regions

**Limitations:** Sparse coverage in remote areas; gap-filled products may introduce assumptions

---

## Data quality flags

Every observation retrieved by Iris includes a quality flag from the upstream provider. Common flag meanings:

| Flag code | Meaning |
|---|---|
| `VALID` | Observation passed all upstream QA checks |
| `FILL` | No observation for this period; a fill value was returned (excluded) |
| `CLOUD` | Optical sensor contaminated by cloud cover (excluded for surface variables) |
| `INTERP` | Value interpolated by the upstream processing (preserved but noted) |
| `NODATA` | Complete data absence for this cell/time step |

Iris preserves the original flag codes rather than silently discarding flagged values, allowing you to assess what was excluded and why.

---

## Authentic Spatial Variables Catalogue (Living Globe Grids)

The Living Globe renders genuine monthly gridded fields directly from NASA POWER AWS S3 Zarr stores (`https://nasa-power.s3.us-west-2.amazonaws.com/`). The 11 active spatial layers include:

| Code | Field Parameter | Physical Description | Group | Units | Display Range | Color Ramp | Caveats & Scientific Notes |
|---|---|---|---|---|---|---|---|
| `V01` | `T2M` | Air Temperature at 2 m | Temperature | °C | −55 to +45 | `thermal` | Monthly mean air temperature from MERRA-2; not an instantaneous satellite measurement. |
| `TS` | `TS` | Earth Skin Temperature | Temperature | °C | −60 to +60 | `thermal` | Radiative skin surface temperature; distinct from 2 m air temperature. |
| `T2MDEW` | `T2MDEW` | Dew / Frost Point at 2 m | Temperature | °C | −60 to +30 | `thermal` | Atmospheric moisture saturation threshold; not precipitation. |
| `PRECTOTCORR` | `PRECTOTCORR` | Corrected Precipitation Rate | Water & Snow | mm/day | 0 to 15 | `viridis` | Monthly mean daily precipitation rate; not monthly accumulation or snow-only depth. |
| `SNODP` | `SNODP` | Snow Depth | Water & Snow | cm | 0 to 100 | `snow` | Modeled snowpack depth; not snowfall rate or snow water equivalent (SWE). |
| `GWETTOP` | `GWETTOP` | Surface Soil Wetness | Land | Dimensionless (0–1) | 0 to 1 | `viridis` | Relative wetness index (0–1) of top 5 cm; not volumetric soil moisture (\(m^3/m^3\)). |
| `GWETROOT` | `GWETROOT` | Root-Zone Soil Wetness | Land | Dimensionless (0–1) | 0 to 1 | `viridis` | Relative moisture index across plant root zone; ocean cells remain transparent. |
| `RH2M` | `RH2M` | Relative Humidity at 2 m | Atmosphere | % | 0 to 100 | `viridis` | Ratio of actual vapor pressure to saturation vapor pressure; not specific humidity. |
| `WS10M` | `WS10M` | Wind Speed at 10 m | Atmosphere | m/s | 0 to 15 | `magma` | Scalar horizontal wind speed; contains no directional velocity vectors. |
| `PS` | `PS` | Surface Atmospheric Pressure | Atmosphere | hPa | 600 to 1050 | `thermal` | Local terrain surface barometric pressure; strongly influenced by surface elevation. |
| `V12` | `ALLSKY_SFC_SW_DWN` | Downward Solar Irradiance | Radiation | W/m² | 0 to 450 | `magma` | CERES SYN1deg monthly mean shortwave flux in Local Solar Time (LST); not daily kWh. |

---

## 10-Provider Live Capability Matrix (`backend/services/capability_matrix.py`)

Every upstream provider connected to Iris is categorized by its verification status, authentication model, and extraction capabilities:

| Provider | Agency | Catalog State | Extraction State | Geometry | Cadence | Auth Mechanism | Quota / Guardrail |
|---|---|---|---|---|---|---|---|
| **NASA POWER** | NASA Langley / GMAO MERRA-2 | `extract_verified` | `extract_verified` | Point, BBox | Daily, Monthly, Yearly | Open Access (No Token) | Masks `-999.0` fill values; regional cosine-lat weighted means |
| **NASA GES DISC (GiC)** | NASA Goddard | `extract_verified` | `extract_verified` | Point | Daily, Monthly | Earthdata Bearer Token | GiC REST endpoint (legacy CGI Data Rods retired) |
| **NASA AppEEARS** | NASA LP DAAC / USGS | `catalog_verified` | `credential_required` | Point, BBox | 8-Day, 16-Day, Monthly | Earthdata Session Token | Async polling job queue with MODIS/VIIRS `_QC` bitmasking |
| **NASA CMR** | NASA EOSDIS | `catalog_verified` | `catalog_only` | Point, BBox | All native cadences | Public UMM-JSON API | Granule & collection discovery routing to POWER/GiC/OPeNDAP |
| **NASA Harmony** | NASA Earthdata Cloud | `catalog_verified` | `credential_required` | BBox, Point | Daily, Monthly | Earthdata Bearer Token | Async cloud NetCDF4/Zarr subsetting |
| **NOAA CDO v2** | NOAA NCEI | `extract_verified` | `extract_verified` | Point, BBox | Daily, Monthly, Yearly | NOAA CDO Token (`token`) | 5 req/sec, 10,000/day; GHCND & GSOM station extraction |
| **NOAA OneStop** | NOAA NCEI Enterprise | `extract_verified` | `extract_verified` | Point, BBox | Daily, Monthly, Yearly | Public OneStop Search API | Collection discovery + NCEI metric station/gridded series |
| **NASA OPeNDAP** | Earthdata Hyrax Cloud | `extract_verified` | `extract_verified` | Point (Grid Slice) | Monthly, Yearly | Earthdata Bearer Token | Direct `.ascii?var[time][lat][lon]` constraint slicing |
| **EODAG v4.10** | CS GROUP / Federated EO | `extract_verified` | `extract_verified` | Point, BBox | Daily, Monthly, Yearly | `EODataAccessGateway` | Federated STAC optical cloud cover & ERA5 reanalysis series |
| **Copernicus CDS** | ECMWF C3S / CADS v1 | `extract_verified` | `extract_verified` | Point, BBox | Daily, Monthly, Yearly | `PRIVATE-TOKEN` CDS Key | CADS STAC Catalogue v1 + ERA5 / ERA5-Land reanalysis |

---

## Dataset DOIs & Authoritative Citations

- **MERRA-2 Reanalysis**: Global Modeling and Assimilation Office (GMAO) (2015). *MERRA-2 monthly mean surface meteorology*. NASA GES DISC. [doi:10.5067/60Q177EW27LW](https://doi.org/10.5067/60Q177EW27LW)
- **NASA POWER Project**: Stackhouse, P. W., et al. (2024). *NASA POWER Release 8: Prediction of Worldwide Energy Resources*. NASA Langley Research Center. [https://power.larc.nasa.gov](https://power.larc.nasa.gov)
- **MODIS Vegetation Indices (MOD13C2)**: Didan, K. (2015). *MOD13C2 MODIS/Terra Vegetation Indices Monthly L3 Global 0.05Deg CMG V006*. NASA LP DAAC. [doi:10.5067/MODIS/MOD13C2.006](https://doi.org/10.5067/MODIS/MOD13C2.006)
- **GPCP Precipitation (v2.3)**: Adler, R. F., et al. (2018). *Global Precipitation Climatology Project (GPCP) Monthly Analysis (New Version 2.3)*. NOAA NCEI. [doi:10.7289/V56971M6](https://doi.org/10.7289/V56971M6)
- **CERES SYN1deg Surface Fluxes**: Doelling, D. R., et al. (2016). *CERES Synoptic 1-Deg (SYN1deg) Product*. NASA Langley Atmospheric Science Data Center. [doi:10.5067/Terra+Aqua/CERES/SYN1deg-Month_L3.004A](https://doi.org/10.5067/Terra+Aqua/CERES/SYN1deg-Month_L3.004A)
- **GLDAS Noah Land Surface Model**: Rodell, M., et al. (2004). *The Global Land Data Assimilation System*. Bulletin of the AMS. [doi:10.1175/BAMS-85-3-381](https://doi.org/10.1175/BAMS-85-3-381)
- **GPM IMERG Early Precipitation**: Huffman, G. J., et al. (2020). *GPM IMERG Early Precipitation L3 1 day 0.1 degree x 0.1 degree V07*. NASA GES DISC. [doi:10.5067/GPM/IMERGDE/DAY/07](https://doi.org/10.5067/GPM/IMERGDE/DAY/07)

