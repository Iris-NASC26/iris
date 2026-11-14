# Data Sources & Variables

Iris sources all data from established, publicly funded Earth observation archives. This page documents the available variables, their upstream providers, and what each measures.

---

## Zero synthetic data policy

Iris has a strict policy: **no synthetic or fabricated data appears in any user-facing result**.

All numbers come from one of two sources:
1. **Live upstream APIs** — real-time retrieval from NASA, NOAA, and other provider endpoints
2. **Verified real snapshots** — pinned, SHA-256-hashed copies of real observations, used to ensure the platform works offline (e.g., for the NASA Space Apps Competition)

Synthetic data fixtures exist only in internal test harnesses and are blocked from all production endpoints.

---

## Core variables (Global Trend Cube)

These six variables are pre-computed in the Global Trend Cube, available on the Living Globe and Regional Case Board, and covering 1981–2025:

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

Additional variables are available through live provider searches in System Intelligence. These include but are not limited to:

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

## Requesting additional providers

As Iris development progresses, additional upstream providers will be integrated. Planned additions include:

- **Copernicus Climate Data Store (CDS)** — ERA5 reanalysis
- **ESA CCI** — Climate Change Initiative long-term satellite records
- **OpenDAP / THREDDS** — Direct access to NetCDF time series
- **NOAA NCEI** — Extended paleoclimate and instrumental records
