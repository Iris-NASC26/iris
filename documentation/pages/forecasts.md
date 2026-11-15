# Dataset & Machine Learning Forecast System

The **Dataset & Machine Learning Forecast System** (`iris.ml-forecast.v2`) provides future environmental outlooks by training local machine learning models directly on historical observation records. It replaces black-box provider future predictions with an auditable, history-only learning workflow across multiple Earth system variables.

> Navigate to it via: **Workspace → Forecasts** (`/workspace/forecasts`) in the left sidebar, or through the forecast story links on the [Iris Landing Page](/) and Living Globe.

---

## 1. System Philosophy: History-Only Learning

While conventional dashboard forecasts simply mirror external numerical weather prediction streams, Iris's forecasting engine adheres to a strict scientific boundary: **history-only empirical learning**.

- **No Future Provider Values as Features**: The model is trained exclusively on retrospective observation records and reanalysis. Provider forecast values are never used as predictor columns.
- **No Relabeled Provider Forecasts**: Every prediction published in the primary forecast workflow is produced by Iris's own trained gradient-boosted quantile models.
- **Zero Hindsight Leakage**: Training, validation, calibration, and testing use strictly chronological folds. Labels or observations that would not have been available at the scheduled forecast boundary are purged.
- **Honest Model Gating**: If a trained model fails to demonstrate superior predictive skill against simple baselines on held-out historical data, Iris does not mask the shortfall or simulate synthetic accuracy. It displays an explicitly labeled **Experimental Preview** with exact baseline-relative error figures.

---

## 2. Dedicated Workspace Interface (`/workspace/forecasts`)

The dedicated **Explore → Forecasts** workspace brings together historical data ingestion, dataset preparation, training progress, model cards, evaluation metrics, and live predictions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FORECAST WORKSPACE                              │
│                                                                  [Run] │
│ Target Selector: [ Air temperature · MERRA-2   ▼ ]                     │
│ Location:        [ Colombo, Sri Lanka          ▼ ]                     │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │  WINDOW 1 (h0)       │  │  WINDOW 2 (h1)       │  │  WINDOW 3 (h2) │ │
│ │  +26.85 °C           │  │  +27.10 °C           │  │  +26.40 °C     │ │
│ │  [25.10 – 28.40] °C  │  │  [25.30 – 28.70] °C  │  │  [24.80 – 28.1]│ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  [ Interactive 10th–90th Percentile Range & Median Outlook Chart ]      │
├────────────────────────────────────────────────────────────────────────┤
│  [ Model Evaluation & Baseline Comparison ] [ Staged Dataset Controls ]│
└────────────────────────────────────────────────────────────────────────┘
```

### Core Interactive Features:
1. **Target Variable Selector**: Switch dynamically between supported multi-variable targets (rainfall, soil moisture, air temperature, vegetation, evapotranspiration, snow cover).
2. **Instant Presentation of Published Runs**: Opening `/workspace/forecasts?forecastId=colombo` instantly loads the latest active model prediction without re-extracting NASA data or re-training.
3. **Immutable Saved Run Links**: Clicking **Save link** yields a permalink (`?forecastId=colombo&target=merra2_t2m&run=<artifact-id>`) preserving the exact evaluation and prediction state for publication or auditing.
4. **Unit Switching**: For temperature targets (`merra2_t2m`, `modis_lst`), users can toggle seamlessly between **Celsius (°C)** and **Kelvin (K)**. Exports retain authentic scientific source units.
5. **Full Evidence Export**: Download complete prediction intervals, member/quantile distributions, and model evaluation scorecards as a single JSON artifact.

---

## 3. Multi-Variable Earthdata Targets

Iris supports forecasting across diverse environmental spheres using NASA Earthdata and operational reanalysis products:

| Target Key | Variable Name | Physical Unit | Source Product | Native Cadence | Availability Lag Policy |
|---|---|---|---|---|---|
| `precip_24h` | Daily Rainfall Accumulation | `mm` | Meteomatics `era5` / `mix` | Daily | 144 h (ERA5) / 3 h (Mix) |
| `smap_surface_sm` | Enhanced Surface Soil Moisture | `m³/m³` | SMAP `SPL3SMP_E.006` | Daily | ~3 days |
| `smap_l4_surface_sm` | Root-Zone Soil Moisture Analysis | `m³/m³` | SMAP `SPL4SMGP.008` | 3-hourly | ~2.5 days |
| `merra2_t2m` | 2-Meter Air Temperature | `K` / `°C` | MERRA-2 `M2T1NXSLV.5.12.4` | Hourly | ~1 month |
| `merra2_ps` | Surface Pressure | `Pa` | MERRA-2 `M2T1NXSLV.5.12.4` | Hourly | ~1 month |
| `modis_lst_day` | Daytime Land Surface Temperature | `K` / `°C` | MODIS `MOD11A1.061` | Daily | ~14 days |
| `modis_ndvi` | Normalized Difference Vegetation Index | Index (`0..1`) | MODIS `MOD13Q1.061` | 16-day composite | ~10 days post-period |
| `viirs_ndvi` | High-Resolution Vegetation Index | Index (`0..1`) | VIIRS `VNP13A1.002` | 16-day composite | ~10 days post-period |
| `modis_et` | Total Evapotranspiration | `kg/m²/8day` | MODIS `MOD16A2GF.061` | 8-day composite | Year-end gap fill |
| `gldas_soilm` | Noah Land Model Soil Moisture | `kg/m²` | GLDAS `GLDAS_NOAH025_3H` | 3-hourly | ~1–2 months |
| `modis_snow_cover` | Normalized Snow Cover Fraction | `%` | MODIS `MOD10A1.061` | Daily | ~14 days |
| `nasadem_elevation` | Terrain Elevation (Static Feature) | `m` | NASADEM Global | Static | Static |

> [!NOTE]
> **Availability Lag Accounting:**
> Remote sensing products require orbital transmission, calibration, and processing before release. Iris explicitly models the **availability delay** for every source. A lag-1 composite whose observation window is still open or within its release delay is strictly excluded from feature vectors.

---

## 4. Chronological Pipeline Architecture

The machine learning pipeline (`backend/forecasts/v2/`) executes in seven strict, auditable stages:

```
[Upstream Ingestion] → [Durable Dataset Store] → [Chronological 4-Fold Split]
                                                          ↓
[Predictive Quantiles] ← [Activation Gating] ← [Direct Horizon Gradient Boosting]
         ↓
[Published Run / Experimental Preview]
```

### Stage 1: Ingestion & Bounded Fetch
Retrieves genuine historical records from NASA Earthdata (via authenticated CMR queries and `.netrc` downloads), NASA AppEEARS (point spatial sampling), or Meteomatics historical reanalysis.

### Stage 2: Dataset Freezing & Quarantine
Observations are aligned to canonical UTC dates. Suspect records (such as known instrument calibration anomalies or orbital gaps) are isolated into a quarantined register (`d.quarantine`) and excluded from training.

### Stage 3: Chronological 4-Fold Partitioning
Unlike standard machine learning pipelines that randomly shuffle rows, Iris enforces strict chronological partitioning:
1. **Development Set (60%)**: Used for feature calculation and initial hyperparameter search.
2. **Validation Set (15%)**: Evaluates early convergence; internal random early stopping is disabled.
3. **Calibration Set (10%)**: Tunes conformal quantile coverage intervals without altering model trees.
4. **Test Set (15%)**: Completely held-out final evaluation period against naive baselines.

### Stage 4: Feature Construction
Extracts physically grounded features without future leakage:
- Lagged observations ($t-1, t-2, t-3, t-7, t-14, t-30$ days)
- Rolling window statistics (7-day and 30-day rolling means and standard deviations)
- Astronomical seasonal harmonics ($\sin(2\pi d / 365.25)$, $\cos(2\pi d / 365.25)$)
- Static elevation and coordinates

### Stage 5: Direct Horizon Training
Rather than autoregressively feeding predictions into future steps (which compounds error), Iris fits **direct models** for three consecutive future windows:
- **Horizon 0 ($h_0$)**: $t+1$ window
- **Horizon 1 ($h_1$)**: $t+2$ window
- **Horizon 2 ($h_2$)**: $t+3$ window

Each horizon uses a gradient-boosted tree regressor (`scikit-learn` Histogram Gradient Boosting) optimized for quantile loss at $\alpha \in \{0.10, 0.50, 0.90\}$.

---

## 5. Model Activation Gates & Experimental Preview Mode

Before any trained model can be admitted to the active registry, it must clear rigorous, non-negotiable benchmark gates:

### Activation Criteria:
1. **Median Skill Superiority**: The candidate model must achieve lower Mean Absolute Error ($\text{MAE}$) than **both** the Persistence baseline (yesterday's value) and the Seasonal Climatology baseline (historical day-of-year mean) on the held-out test fold.
2. **Quantile Coverage Calibration**: The empirical coverage of the 10th–90th percentile interval must demonstrate valid spread without crossing quantiles ($Q_{10} \le Q_{50} \le Q_{90}$).
3. **Finite Physical Bounds**: Predictions must obey natural laws (e.g., non-negative precipitation $\ge 0$, bounded vegetation index $-1 \le \text{NDVI} \le 1$, positive Kelvin temperature $> 0$).

### Experimental Preview Mode:
When an evaluated model fails to beat the baseline (for instance, GLDAS soil moisture where historical persistence proves superior to short-term tree models), Iris **does not hide the result or invent optimistic numbers**:
- The forecast is labeled with an amber warning badge: **Experimental preview · Quality checks not met**.
- The page computes and displays the exact held-out performance deficit relative to the strongest baseline:
  $$\text{Baseline Relative Error (\%)} = 100 \times \left(\frac{\text{Model MAE}}{\text{Baseline MAE}} - 1\right)$$
- An indicator such as `+8.0% more error than baseline` alerts researchers that the preview represents an evaluated research candidate rather than an operational prediction.

---

## 6. Durable Background Jobs & Auto-Renewal

NASA extractions and multi-horizon training can require substantial time depending on upstream provider queues. Iris implements a robust asynchronous job architecture:

- **State Persistence**: Job state is serialized to `backend/data/iris_durable_store.json`. Closing the browser or restarting the client does not cancel pending server-side work.
- **Job Recovery**: Navigating back to `/workspace/forecasts?forecastId=<id>&target=<target>` automatically polls and resumes tracking of the active job.
- **5-Minute Idle Auto-Renewal**: Every five minutes while idle, a background worker checks for expired forecast windows. If active models and staged historical data are available, it automatically computes new forward inference without requiring manual user triggering.

---

## 7. Legacy Provider Ensemble Outlooks (ECMWF 51-Member Archive)

For explicit comparative research and emergency verification, Iris retains the capability to inspect raw numerical weather prediction ensemble feeds via Meteomatics (`ENABLE_PROVIDER_FORECASTS=true` or via 64-character SHA-256 snapshot links).

### Member-First Accumulation Rule:
Calculating multi-hour precipitation totals from an ensemble requires strict statistical mathematics. Iris enforces the **member-first rule**:

$$\text{Total}_m(t_a, t_b) = \sum_{k=t_a}^{t_b} P_{m, k} \quad \text{for each member } m \in \{0, \dots, 50\}$$

Once the accumulation is calculated independently for each of the 51 members, the quantiles are computed across the distribution of those 51 member sums:

$$Q_p = \text{Percentile}\left(\{\text{Total}_0, \text{Total}_1, \dots, \text{Total}_{50}\}, p\right)$$

> [!IMPORTANT]
> **Why Member-First Aggregation Matters:**
> Summing subdaily marginal percentiles (e.g., adding twenty-four 90th-percentile 3-hour values) simulates an impossible "super-storm" that peaks at the 90th percentile simultaneously across every step. Member-first accumulation preserves physical mass conservation and authentic meteorological covariances.

### NASA IMERG Satellite Context:
To provide immediate observational validation, legacy outlooks can load recent authenticated NASA Global Precipitation Measurement (GPM) IMERG Early Daily V07 observations (`GPM_3IMERGDE.07`) for the 7 days preceding the forecast issue time.

---

## 8. Backend API Reference (`/api/v1/forecasts/v2`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/forecasts/v2/capabilities` | Returns supported targets, units, source mappings, and credential status |
| `GET` | `/api/v1/forecasts/v2/{location}/published` | Read-only summary of current published runs and previews across all targets |
| `GET` | `/api/v1/forecasts/v2/{location}/prediction?target=...` | Retrieves the latest valid prediction or experimental preview for a specific target |
| `GET` | `/api/v1/forecasts/v2/runs/{location}/{run_id}` | Loads an immutable, pinned historical forecast run by its unique identifier |
| `POST` | `/api/v1/forecasts/v2/{location}/generate` | Submits an end-to-end extraction, training, and prediction pipeline |
| `GET` | `/api/v1/forecasts/v2/{location}/jobs?target=...` | Retrieves the latest asynchronous background job status |
| `POST` | `/api/v1/forecasts/v2/{location}/ingest` | Triggers background historical data ingestion from Earthdata or Meteomatics |
| `POST` | `/api/v1/forecasts/v2/{location}/datasets` | Builds and freezes a chronological dataset revision |
| `POST` | `/api/v1/forecasts/v2/{location}/train` | Trains and evaluates candidate models across horizons $h_0, h_1, h_2$ |
| `POST` | `/api/v1/forecasts/v2/{location}/activate` | Manually admits an evaluated, hash-verified candidate model into the active registry |
