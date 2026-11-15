# Precipitation Forecast System

The **Precipitation Forecast System** provides short-term (72-hour) future weather outlooks for configured investigation points worldwide. It links high-resolution global numerical weather prediction with NASA Earth observation context.

> Navigate to it via: **Workspace → Data Analysis** (with a forecast link), or directly from the forecast story cards on the [Iris Landing Page](/) and Living Globe.

---

## System Overview

While Iris focuses primarily on multi-decadal historical trend detection, the Precipitation Forecast System addresses the immediate future: providing actionable, probabilistic precipitation forecasts alongside historical baseline context.

| Feature | Specification |
|---|---|
| **Forecast Horizon** | 72 hours (3 calendar days) |
| **Temporal Granularity** | 3-hour contiguous intervals (24 time steps) |
| **Numerical Model** | ECMWF Integrated Forecasting System (IFS) Ensemble |
| **Ensemble Members** | 51 members (1 control member + 50 perturbed members) |
| **Delivery Provider** | Meteomatics Weather API (`precip_3h:mm`, `source=ecmwf-ens`) |
| **Observational Benchmark** | NASA GPM IMERG Early Daily V07 (`GPM_3IMERGDE.07`) |
| **Sampling Points** | 6 globally distributed climate and hydrological benchmark points |
| **Update Cadence** | Continuous monitoring with 3-hour freshness windows and 15-minute refresh cooldown |

---

## Configured Forecast Locations

The forecast system monitors six key regions representing diverse Earth system regimes:

| Region ID | Location Name | Coordinates | Timezone | Climate Regime |
|---|---|---|---|---|
| `colombo` | Colombo, Sri Lanka | 6.9355° N, 79.8487° E | `Asia/Colombo` | Tropical Monsoon / Coastal Lowland |
| `kathmandu` | Kathmandu, Nepal | 27.7172° N, 85.3240° E | `Asia/Kathmandu` | Himalayan Mountain Valley / Monsoon |
| `los-angeles` | Los Angeles, USA | 34.0500° N, 118.2400° W | `America/Los_Angeles` | Mediterranean / Urban Coastal Basin |
| `central-valley` | Central Valley, USA | 36.7700° N, 119.4100° W | `America/Los_Angeles` | Semi-Arid Agricultural Valley |
| `amazon` | Central Amazon, Brazil | 3.7500° S, 60.0000° W | `America/Manaus` | Equatorial Tropical Rainforest |
| `mediterranean` | Mediterranean (Sardinia), Italy | 41.2500° N, 9.2500° E | `Europe/Rome` | Mediterranean Marine / Insular |

---

## Accumulation Methodology: Member-First Aggregation

Calculating multi-hour precipitation totals from an ensemble requires rigorous statistical mathematics. Iris strictly adheres to the **member-first rule**:

$$\text{Total}_m(t_a, t_b) = \sum_{k=t_a}^{t_b} P_{m, k} \quad \text{for each member } m \in \{0, \dots, 50\}$$

Once the accumulation is calculated independently for each of the 51 members, the quantiles (10th percentile, 50th percentile/median, and 90th percentile) are computed across the distribution of those 51 totals:

$$Q_p = \text{Percentile}\left(\{\text{Total}_0, \text{Total}_1, \dots, \text{Total}_{50}\}, p\right)$$

> [!IMPORTANT]
> **Why Member-First Matters:**
> Summing the marginal 90th percentiles across consecutive 3-hour intervals produces a physically impossible "super-storm" scenario where the storm peaks in the 90th percentile at every single time step. Member-first accumulation preserves physical atmospheric conservation laws and true spatial-temporal covariance.

### Supported Accumulation Views

1. **3-Hour Increments**: 24 discrete steps showing instantaneous storm intensity and timing.
2. **Rolling 24-Hour Windows**: 17 overlapping 24-hour windows identifying the single wettest 24-hour period within the 72-hour forecast horizon.
3. **Calendar Day Totals**: Day 1, Day 2, and Day 3 discrete accumulations (aligned to local timezone or UTC).

---

## Visualizing Ensemble Uncertainty

The forecast workspace provides three complementary visualization modes:

1. **Ensemble Ribbon (Recommended)**:
   - Central solid line: Ensemble median (50th percentile).
   - Shaded band: Inter-quantile range between the 10th and 90th percentiles (central 80% ensemble spread).
   - Highlights the range of plausible meteorological outcomes.

2. **Median Bars**:
   - Discrete column chart displaying the median accumulation for each window, colored by rainfall intensity.

3. **51-Member Spaghetti Curves**:
   - Displays all 51 individual member trajectories overlaid simultaneously.
   - Allows meteorologists to inspect clustering, bi-modal distributions, and extreme outlier scenarios.

---

## NASA Observational Context: GPM IMERG

To provide immediate historical validation, Iris connects to the NASA Global Precipitation Climatology Mission (GPM) via CMR and Earthdata Cloud DAP4.

- **Dataset**: GPM IMERG Early Daily V07 (`GPM_3IMERGDE.07`).
- **Resolution**: 0.1° × 0.1° spatial grid, daily accumulation in `mm/day`.
- **Purpose**: Displays the authentic satellite-derived rainfall for the 7 days immediately preceding the forecast window.
- **Provenance**: Each daily observation records exact granule names, DAP4 subset URLs, and SHA-256 hashes.
- **Scientific Labeling**: Displayed with an explicit label confirming these are retrospective satellite estimates, not gauge measurements or ground-truth predictions.

---

## Offline Machine Learning: Quantile Calibration Experiment

Iris includes an experimental, offline calibration engine (`backend/forecasts/learning.py`) based on CPU histogram-gradient-boosted quantile regression (scikit-learn):

- **Target**: Daily precipitation (mm) at the matched IMERG grid cell.
- **Features**: Raw ECMWF ensemble quantiles (\(P_{10}, P_{50}, P_{90}\)), antecedent 7-day precipitation, forecast lead hours, and seasonal harmonics (\(\sin(\text{month}), \cos(\text{month})\)).
- **Evaluation Gates**: Requires a minimum 5% MAE reduction over raw median, improved pinball loss, non-crossing quantiles, and empirical coverage between 70% and 90%.
- **Zero Hallucination Policy**: Because a verified multi-year archive of matched real-time forecasts is not yet fully curated, **no ML model is active in production inference**. Iris displays raw, authenticated provider ensemble values and transparently reports the offline status of ML calibration.

---

## Backend Storage & Resource Governance

To guarantee platform resilience and avoid API quota exhaustion:

- **SQLite Store**: Forecasts and snapshot runs are stored in `artifacts/runtime/forecasts/catalogue.sqlite3`.
- **Snapshot Retention**: Stores up to 1,500 historical forecast runs, accessible via SHA-256 artifact hashes.
- **Rate-Limiting Guardrail**: A strict atomic daily quota caps remote provider requests at **100 calls per UTC day**.
- **Coordinated Refresh**: The background lifespan worker checks forecasts every minute, requesting updates only after a 3-hour validity expiry and enforcing a 15-minute failure cooldown.

---

## Backend API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/forecasts/catalogue` | `GET` | Returns cached freshness and headline summaries for all 6 points |
| `/api/v1/forecasts/capabilities` | `GET` | Reports status of weather ensemble, NASA context, ML, and river models |
| `/api/v1/forecasts/{id}` | `GET` | Retrieves the active 72-hour 51-member forecast for region `{id}` |
| `/api/v1/forecasts/{id}?artifact_id={sha256}` | `GET` | Retrieves an exact, immutable retained forecast snapshot |
| `/api/v1/forecasts/{id}/refresh` | `POST` | Triggers an explicit on-demand forecast update (subject to cooldown) |
| `/api/v1/forecasts/{id}/observations` | `GET` | Fetches authentic NASA GPM IMERG 7-day antecedent observations |

---

## Use Cases for Forecast Analysis

### 1. Flood Awareness in Mountain River Basins
- **Location**: Kathmandu, Nepal (`kathmandu`).
- **Goal**: Assess risk of sudden monsoon deluge in complex topography.
- **Workflow**: Open the Kathmandu forecast card. Switch accumulation to **Rolling 24-Hour Windows**. Inspect the peak 24-hour ensemble median. If the 90th percentile exceeds 80 mm, inspect individual ensemble member curves to determine whether the risk is widespread or driven by a few isolated members.

### 2. Tropical Cyclone Rainband Monitoring
- **Location**: Colombo, Sri Lanka (`colombo`).
- **Goal**: Track incoming tropical depression precipitation bands.
- **Workflow**: Load the Colombo forecast. Overlay the **NASA IMERG 7-Day Antecedent Observations** to evaluate current soil saturation. Examine the 3-hour accumulation intervals to pinpoint the estimated arrival time of heavy outer convective bands.

### 3. Agricultural Drought vs. Sudden Deluge Relief
- **Location**: Central Valley, California (`central-valley`).
- **Goal**: Determine whether an approaching winter storm will alleviate soil moisture deficits without causing flash flooding.
- **Workflow**: Compare the 3-day total precipitation forecast against historical monthly climatology from Data Analysis. Export the 51-member CSV dataset for hydrological reservoir inflow modeling.
