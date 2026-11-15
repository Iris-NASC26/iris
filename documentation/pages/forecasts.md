# Dataset & Machine Learning Forecast System

The **Dataset & Machine Learning Forecast System** (`iris.ml-forecast.v2`) provides future environmental outlooks for **any user-selected point or area on Earth** by training local machine learning models directly on historical observation records. It replaces black-box provider future predictions with an auditable, history-only learning workflow across multiple Earth system variables.

> Navigate to it via: **Workspace → Forecasts** (`/workspace/forecasts`) in the left sidebar, or through the forecast story links on the [Iris Landing Page](/) and Living Globe.

Built for the **NASA International Space Apps Challenge 2026 — "Be An Earth System Trend Detective!"**

---

## 1. System Philosophy: History-Only Learning

While conventional dashboard forecasts simply mirror external numerical weather prediction streams, Iris's forecasting engine adheres to a strict scientific boundary: **history-only empirical learning**.

- **No Future Provider Values as Features**: Models are trained exclusively on retrospective observation records and reanalysis. Provider forecast values are never used as predictor columns.
- **No Relabeled Provider Forecasts**: Every prediction published in the primary forecast workflow is produced by Iris's own trained quantile models.
- **Zero Hindsight Leakage**: Training, validation, calibration, and testing use strictly chronological folds. Labels or observations that would not have been available at the scheduled forecast boundary are purged with an embargo.
- **Honest Model Gating**: If a trained model fails to demonstrate superior predictive skill against simple baselines on held-out historical data, Iris does not mask the shortfall or simulate synthetic accuracy. It displays an explicitly labeled **Experimental Preview** with exact baseline-relative error figures.
- **No Fabricated Observations**: A location without prepared history shows an honest empty state — the system never silently substitutes data from the nearest known city, and an area centroid is never passed off as an area average.
- **No False Precision**: A prediction interval is never described as an accuracy percentage; relative baseline error is never described as a probability; feature importance is never described as causation.

---

## 2. Dynamic Location & Area Registry

The original forecast system was whitelisted to six seeded locations. The **dynamic location registry** replaces that entirely — any geographic point or rectangular area can be registered, populated, forecast, and reopened across restarts.

### Registering a Point

From the Forecasts workspace, **+ New point or area** opens the location picker:

- **Map click** — an interactive picker map fills latitude/longitude on click (click only fills inputs; nothing registers until confirmed).
- **Geocoded search** — type a place name ("Hyderabad, India") to fill coordinates from the geocoding service.
- **Manual entry** — type decimal degrees directly; validated to `lat ∈ [−90, 90]`, `lon ∈ [−180, 180]`.

Registration is explicit: the **Use this point** button posts `{name, latitude, longitude}` and the server issues a durable opaque identifier (`loc-<12 hex>`). User names are never used as identifiers or filesystem paths.

### Registering an Area

Area mode accepts ordered bounds `[west, south, east, north]` — typed numerically or drawn on the map with two opposite corner clicks:

- `west < east`, `south < north` are required; degenerate boxes are rejected with explicit messages.
- **Antimeridian-crossing boxes are rejected honestly** rather than silently wrapping.
- Areas register as `area-<12 hex>` with `spatial_mode = area_mean`.

### Point vs. Area Semantics — A Hard Scientific Boundary

Iris never blurs the distinction between spatial supports:

| | Point | Area mean |
|---|---|---|
| Identity | Explicit lat/lon | Ordered `[W, S, E, N]` bounds |
| Value | The source value at that coordinate | **Genuine weighted mean over the source grid cells inside the box** |
| Coverage | Cell lookup | Declared intended cells vs. retrieved cells — under-covered areas are flagged, never padded |
| Forbidden | — | Centroid substitution; treating an outer bounding box as proof of coverage |

### Fresh Registry, Fresh Data

A newly registered location starts with **zero history** — the workspace says so plainly and offers the bounded ingest workflow. Only when genuine records exist does dataset/model/run machinery activate for that context.

---

## 3. Dedicated Workspace Interface (`/workspace/forecasts`)

The dedicated **Explore → Forecasts** workspace brings together location and target selection, historical data ingestion and freshness, dataset preparation, training progress, model cards, evaluation metrics, and live predictions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FORECAST WORKSPACE                              │
│ Target:    [ Rainfall · precip_24h        ▼ ]                            │
│ Location:  [ Hyderabad, India (loc-…)     ▼ ]  [ + New point or area ]   │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │  WINDOW 1 (h0)       │  │  WINDOW 2 (h1)       │  │  WINDOW 3 (h2) │ │
│ │  median estimate     │  │  median estimate     │  │  median        │ │
│ │  [p10 – p90] range   │  │  [p10 – p90] range   │  │  [p10 – p90]   │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  [ Interactive 10th–90th Percentile Range & Median Outlook Chart ]      │
│  [ Data freshness & update controls ] [ Evaluation & baseline panel ]   │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Interactive Features

1. **Target Variable Selector**: Switch dynamically between supported multi-variable targets (rainfall, soil moisture, air temperature, vegetation, evapotranspiration, snow cover).
2. **Location Selector + Picker**: Any registered point or area; the picker follows the app's light/dark theme and never registers geometry without explicit confirmation.
3. **Instant Presentation of Published Runs**: Opening `/workspace/forecasts?forecastId=<id>` loads the latest active model prediction without re-extracting data or re-training.
4. **Immutable Saved Run Links**: **Save link** yields a permalink (`?forecastId=<id>&target=<target>&run=<artifact-id>`) preserving the exact evaluation and prediction state for publication or auditing.
5. **Unit Switching**: For temperature targets, toggle seamlessly between **Celsius (°C)** and **Kelvin (K)**. Exports retain authentic scientific source units.
6. **Update Data Action**: Explicitly triggers an incremental update of the location's historical records (see §5) rather than silently refreshing.
7. **Full Evidence Export**: Download prediction intervals, quantile distributions, and model evaluation scorecards as a single JSON artifact.

---

## 4. Data Sources & Targets

Iris supports forecasting across diverse environmental spheres using NASA Earthdata, NASA POWER, and operational reanalysis products. Each target declares its own source identity — datasets from different sources are never merged into a single series.

| Target Key | Variable Name | Physical Unit | Source Product | Native Cadence | Availability Lag Policy |
| --- | --- | --- | --- | --- | --- |
| `precip_24h` | Daily Rainfall Accumulation | `mm` | Meteomatics `era5` / `mix` | Daily | 144 h (ERA5) / 3 h (Mix) |
| `power_t2m` | 2-Meter Air Temperature (NASA POWER) | `K` | NASA POWER daily API | Daily | ~72 h declared delay |
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
> **Availability Lag Enforcement:**
> Remote sensing products require orbital transmission, calibration, and processing before release. Iris explicitly models the **declared availability delay** for every source in two directions: features whose observation window is still inside the delay are excluded from training inputs, **and retrieval requests are clipped to `now − lag`** so the system never asks a provider for data that cannot be finalized yet (a trailing-window request to ERA5 returns HTTP 404 rather than partial data).

---

## 5. Incremental Updates & Data Freshness

Historical records are living inputs — providers revise, late observations arrive, and coverage gaps fill. Phase 2 adds a proper update discipline instead of one-shot ingestion:

- **Watermark tracking**: each source series records its latest observed interval; updates fetch only the missing tail plus a bounded overlap window for late revisions.
- **Revision-aware merge**: upstream corrections update the matching stored records (revised, appended, unchanged, and missing counts are all logged) — no duplicate rows, no silent overwrites.
- **Resumable provider checkpoints**: multi-chunk fetches resume at the provider's actual checkpoint with a pinned update window across retry passes, instead of restarting the first chunk forever.
- **Staged reads exclude update journals**: `*.updates.jsonl` sidecars never contaminate a staged series.
- **Honest freshness reporting**: `/freshness` separates **latest usable** (what could have been known at issue time, per declared lag) from **latest stored** (what the last fetch happened to write) — a stale-but-recent write is not reported as current.

---

## 6. Chronological Evaluation Framework

A separate evaluation package (`forecasts.v2.evaluation`) produces reproducible evidence about model skill — independent of the live training path it measures.

- **Expanding-window backtests** (≥3 outer periods): each outer fold simulates a genuine forecast day, then an inner chronological train/validation/calibration partition is rebuilt at that fold's cutoff.
- **Label-availability purge + embargo**: cases whose labels could not have been known at the issue boundary are purged — perturbing future or holdout data provably cannot move a fold boundary.
- **Protected final holdout**: a contiguous final period is `reserved_not_scored` during development; explicit `--mode final` performs the one-shot assessment and persists exposure lineage (`first_assessment`, `previously_evaluated`, prior counts) so the holdout cannot be silently re-scored.
- **Baselines on identical common cases**: persistence, seasonal climatology, and seasonal-naive baselines are scored on exactly the same eligible cases; relative-MAE is reported null where a baseline cannot be produced.
- **As-of availability evidence**: every case carries typed evidence (`verified_vintage` / `estimated_availability` / `unknown`), and the operational age policy derives `max_input_age_days` from declared source delays — not from the calibration/test data itself.
- **Immutable artifacts**: atomic `eval-<fp>-{dev,final}-rN` directories containing the spec fingerprint, `predictions.jsonl` (per-case predictions and exclusions), and a deterministic report; failed folds yield honest `partial` status.

---

## 7. Feature Engineering & Ablation

Feature construction is versioned and availability-safe (`forecasts.v2.feature_sets`):

| Profile | Contents | Purpose |
| --- | --- | --- |
| `legacy_v1` | Byte-identical to the original `fitting.COLUMNS` schema | Reproducibility baseline |
| `target_history_v1` | Target-specific lag windows, rolling statistics, anomalies | Richer univariate history |
| `drivers_v1` (≤64 cols) | Target history + physically motivated drivers (e.g. GLDAS soil moisture / temperature for `merra2_t2m`) | Multivariate learning |

Key guarantees:

- **Backward-anchored windows** computed over native observation intervals — no forward fill, gaps preserved as `NaN` plus explicit missing/stale flags that are never silently zeroed.
- **Per-source declared lag** decides the latest usable input at issue time; drivers whose declared delay exceeds the staleness bound are flagged, not used.
- **Frozen dataset bindings**: profiles bind to immutable `ds-*` dataset snapshots with support checks — an area-mean driver is rejected against a point target.
- **Seasonal transforms** (`SeasonalTransform`) enforce an explicit fit boundary and fingerprint validation; in evaluation they are refit per outer-fold cutoff.
- **Feature snapshots** record input lineage — dataset content hashes, record counts, issue time, and each driver's last usable input.
- **Ablations** run through the chronological evaluator on intersected case IDs, so profile comparisons share folds, baselines, and the reserved holdout.

Physically grounded base features include lagged observations ($t-1$ … $t-30$), 7- and 30-day rolling means/standard deviations, astronomical seasonal harmonics ($\sin/\cos(2\pi d / 365.25)$), and static elevation/coordinates.

---

## 8. Model Selection & Challenger Candidates

`forecasts.v2.model_selection` runs a bounded, auditable comparison under the same evaluation protocol:

- **`iris-candidate.v1` contract**: every candidate declares identity, feature profile, estimator, and quantile set.
- **Candidates**: the incumbent direct-horizon histogram gradient-boosted trees, a bounded 6-configuration HGB tuning grid, an interpretable `linear_quantile` challenger (train-only imputation and scaling), and an optional LightGBM challenger that degrades gracefully to `dependency_unavailable` where absent.
- **Shared-case metrics**: candidates are compared on intersected eligible cases — never on different data.
- **Freeze & replay**: a selected candidate freezes into a hash-verified snapshot (`states.json` + artifacts); operational inference replays the frozen weights only — never refits, re-downloads, or re-tunes.

Each horizon uses quantile regression at $\alpha \in \{0.10, 0.50, 0.90\}$ for the direct $h_0/h_1/h_2$ windows (never autoregressive compounding).

---

## 9. Measured Uncertainty, Extremes & Explanations

`forecasts.v2.forecast_insights` turns frozen evaluation artifacts into honest uncertainty products — reading them read-only, never mutating evidence.

### Finite-Sample Conformal Calibration
Conformal quantile regression adjusts intervals with the exact $k$-th order statistic (`ceil((n+1)·level)`) on calibration scores from the permitted history only. Policies are `expand_only` (never overconfidently narrower) or `symmetric`. Insufficient calibration data yields an honest `insufficient_calibration` state — never a hidden fallback. Physical-bound clipping is flagged, not concealed.

### Coverage Diagnostics
Raw vs. adjusted coverage, interval width, tail-miss asymmetry, and interval score are measured **on identical cases**, broken down by horizon and season. Dependence-aware intervals come from a paired **issue-block bootstrap** — labeled approximate, never dressed up as a binomial confidence interval.

### Target-Specific Extremes
Monthly-percentile thresholds are fit on permitted history only, and each forecast is classified (`median_vs_threshold`, `interval_vs_threshold`) with explicit event-evaluation denominators. Output is **never a fabricated event probability** — where the data cannot support calibrated event skill, the artifact says so.

### Explanations — Sensitivity, Not Causality
- **Grouped permutation** measures how held-out skill degrades when a feature group is shuffled — labeled sensitivity analysis, never causal attribution.
- **Coefficient-path explanations** for the `linear_quantile` challenger expose local contributions against permitted background rows.

### Separate Trend Significance
Historical trend detection is kept distinct from forecast skill: monthly-mean OLS with seasonal dummies and genuine **HAC (heteroskedasticity- and autocorrelation-consistent) covariance** via statsmodels, on elapsed calendar time; composite cadences are `unsupported`. A frozen Benjamini–Hochberg family controls multiple-comparison claims across targets. A short forecast slope is never reported as a significant historical trend.

---

## 10. Model Activation Gates & Experimental Preview Mode

Before any trained model can be admitted to the active registry, it must clear rigorous, non-negotiable benchmark gates:

### Activation Criteria
1. **Median Skill Superiority**: The candidate must achieve lower Mean Absolute Error than **both** the Persistence baseline (yesterday's value) and the Seasonal Climatology baseline (historical day-of-year mean) on held-out data.
2. **Quantile Coverage Calibration**: The empirical coverage of the 10th–90th percentile interval must demonstrate valid spread without crossed quantiles ($Q_{10} \le Q_{50} \le Q_{90}$).
3. **Finite Physical Bounds**: Predictions obey natural laws (non-negative precipitation, bounded vegetation index, positive Kelvin temperature).

### Experimental Preview Mode
When an evaluated model fails to beat the baseline (for instance, GLDAS soil moisture where persistence proves superior to short-term tree models), Iris **does not hide the result or invent optimistic numbers**:

- The forecast carries an amber badge: **Experimental preview · Quality checks not met**.
- The page computes and displays the exact held-out performance deficit relative to the strongest baseline:
  $$\text{Baseline Relative Error (\%)} = 100 \times \left(\frac{\text{Model MAE}}{\text{Baseline MAE}} - 1\right)$$
- An indicator such as `+8.0% more error than baseline` alerts researchers that the preview is an evaluated research candidate rather than an operational prediction.

---

## 11. Operations, Releases & Monitoring

`forecasts.v2.operations` gives the system a durable operational layer — reachable through the `/ops/*` API and CLI, gated at lifecycle startup by `IRIS_OPS_ENABLED=1` (module import and page loads trigger no provider work).

### Schedules & Jobs
- Persistent schedules for ingest, update, evaluation, and monitoring passes with explicit enable / disable / pause / resume controls.
- **Atomic single-statement lease claims** — overlapping ticks or processes cannot steal live work; expired leases are recoverable.
- **Missed-run coalescing** to a single catch-up rather than a backlog storm; bounded retries with persisted checkpoints.

### Immutable Releases
- Content-addressed `rel-rN` release manifests binding a frozen model-selection snapshot and its evaluation evidence.
- **Compare-and-swap promotion** (`expected_active`): concurrent promote attempts conflict cleanly; the last valid release stays active.
- Dry-run validation checks artifact hashes and evidence before promotion; qualified vs. experimental quality is explicit; rollback resolves the prior manifest — coherent, with no refit.
- An append-only audit trail records every promotion and rollback.

### Monitoring & Integrity
- **Matured-outcome scoring**: predictions are scored only when their true observation window has fully matured — exact window and source matching, no future truth leakage; revised truth emits audit events and `insufficient_matured` states are honest.
- **Drift detection**: σ-shift of scored errors against the frozen reference, with consecutive-breach debounce before flagging.
- **Integrity scanning**: read-only detection of broken references and dangling active releases, with a retention protection list — no automatic destructive cleanup of referenced artifacts.
- **Generate vs. reopen**: generating a forecast replays the active release's frozen snapshot with calibration applied exactly once (raw vs. adjusted kept distinct); reopening re-reads the saved run — never refits or recalibrates.

### Durable Background Jobs & Auto-Renewal
- **State persistence**: job state lives in a durable store; closing the browser or restarting the client does not cancel server-side work, and returning to the workspace resumes job tracking.
- **Auto-renewal**: while enabled, a background worker checks for expired forecast windows and recomputes forward inference from active models and staged data without manual triggering.

---

## 12. Legacy Provider Ensemble Outlooks (ECMWF 51-Member Archive)

For explicit comparative research and emergency verification, Iris retains the capability to inspect raw numerical weather prediction ensemble feeds via Meteomatics (`ENABLE_PROVIDER_FORECASTS=true` or via 64-character SHA-256 snapshot links).

### Member-First Accumulation Rule
Calculating multi-hour precipitation totals from an ensemble requires strict statistical mathematics. Iris enforces the **member-first rule**:

$$\text{Total}_m(t_a, t_b) = \sum_{k=t_a}^{t_b} P_{m, k} \quad \text{for each member } m \in \{0, \dots, 50\}$$

Once the accumulation is calculated independently for each of the 51 members, the quantiles are computed across the distribution of those 51 member sums:

$$Q_p = \text{Percentile}\left(\{\text{Total}_0, \text{Total}_1, \dots, \text{Total}_{50}\}, p\right)$$

> [!IMPORTANT]
> **Why Member-First Aggregation Matters:**
> Summing subdaily marginal percentiles (e.g., adding twenty-four 90th-percentile 3-hour values) simulates an impossible "super-storm" that peaks at the 90th percentile simultaneously across every step. Member-first accumulation preserves physical mass conservation and authentic meteorological covariances.

### NASA IMERG Satellite Context
To provide immediate observational validation, legacy outlooks can load recent authenticated NASA Global Precipitation Measurement (GPM) IMERG Early Daily V07 observations (`GPM_3IMERGDE.07`) for the 7 days preceding the forecast issue time.

---

## 13. How This Satisfies the Challenge — "Be An Earth System Trend Detective!"

The challenge asks teams to turn genuine Earth-observation records into defensible trend and outlook evidence. The forecast system was designed as the forward-looking half of that mandate, and every phase maps to a challenge requirement:

| Challenge Objective | How Iris Delivers |
| --- | --- |
| **Work anywhere on Earth** | A dynamic registry accepts any valid point or bounded area — geocoded search, map clicks, or typed coordinates — with honest rejection of unsupported geometry (antimeridian, degenerate boxes). The old six-city whitelist is now just example shortcuts. |
| **Use genuine Earth observation data** | NASA Earthdata (SMAP, MERRA-2, MODIS, VIIRS, GLDAS, NASADEM), NASA POWER, and Meteomatics reanalysis — each with declared cadence and availability lag. No synthetic observations anywhere in the pipeline. |
| **Detect and quantify trends responsibly** | A dedicated significance path (seasonal OLS + HAC covariance, BH-corrected families) separates *historical trend evidence* from *forecast skill*, and composite cadences are declared `unsupported` rather than silently mis-analyzed. |
| **Make uncertainty measurable** | Conformal calibration with finite-sample order statistics; measured coverage/width/interval-score diagnostics with dependence-aware bootstrap — reported, never promised. |
| **Be auditable end-to-end** | Immutable `ds-*` datasets, `eval-*` reports, `fs-*` feature snapshots, frozen model states, `rel-*` release manifests, and an append-only ops audit trail — every artifact is content-hashed and reopenable. |
| **Avoid hindsight bias** | Chronological folds with purge + embargo; per-source as-of availability evidence; a protected holdout with persistent exposure tracking that records its first and only assessment. |
| **Stay honest under failure** | Experimental previews show exact baseline-relative deficits; `insufficient_calibration`, `insufficient_matured`, `dependency_unavailable`, and `reserved_not_scored` are first-class states — never smoothed over. |
| **Respect real-world operations** | Declared availability lags bound both retrieval (no guaranteed-404 requests) and feature eligibility; incremental updates track revisions and watermarks; scheduled work uses leases, coalescing, and checkpoints. |
| **Keep points and areas honest** | An area is a documented weighted mean of real grid cells with declared coverage — never a centroid in disguise. |
| **Explain without overclaiming** | Permutation importance is labeled sensitivity, coefficient paths describe local contribution, and neither implies causation. |

---

## 14. Backend API Reference (`/api/v1/forecasts/v2`)

### Locations & Registry
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/locations` | List registered points and areas (with spatial mode, bounds, and freshness metadata) |
| `POST` | `/locations` | Register a point (`name`, `latitude`, `longitude`) or area (`name`, `bbox=[w,s,e,n]`) |
| `GET` | `/locations/{location_id}` | Resolve a single registered context |

### Datasets, Freshness & Updates
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/datasets` | List frozen dataset revisions across contexts |
| `GET` | `/{location}/datasets` | Frozen dataset revisions bound to a location |
| `POST` | `/{location}/datasets` | Build and freeze a chronological dataset revision |
| `GET` | `/{location}/history` | Staged historical records for the location |
| `GET` | `/{location}/freshness` | Latest-usable vs. latest-stored summary per source |
| `POST` | `/{location}/ingest` | Bounded historical ingestion (Earthdata, POWER, Meteomatics) |
| `POST` | `/{location}/update` | Incremental revision-aware update of staged records |
| `POST` | `/{location}/refresh` | Combined update + dataset rebuild convenience action |

### Models, Runs & Prediction
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/{location}/models` | Evaluated model candidates for the location |
| `POST` | `/{location}/models/{model_id}/activate` | Admit a hash-verified candidate into the active registry |
| `GET` | `/{location}/prediction` | Latest valid prediction or labeled experimental preview |
| `GET` | `/{location}/published` | Read-only summary of published runs across targets |
| `GET` | `/runs/{location_id}/{run_id}` | Load an immutable pinned run by identifier |
| `POST` | `/{location}/generate` | End-to-end ingest → dataset → train → predict pipeline job |
| `POST` | `/{location}/train` | Train and evaluate candidates across horizons |
| `POST` | `/{location}/predict` | Direct inference invocation |
| `GET`/`POST` | `/{location}/trends` | HAC trend significance for the location's targets |

### Jobs & Capabilities
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/capabilities` | Supported targets, units, sources, and credential status |
| `GET` | `/catalogue` | Full forecast catalogue |
| `GET` | `/{location}/jobs` | Latest background job status for the location |
| `GET` | `/jobs/{job_id}` | Job detail by id |
| `POST` | `/jobs/{job_id}/cancel` / `/retry` | Cancel or retry a job |

### Operations (`/ops/*`, `IRIS_OPS_ENABLED=1`)
| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`/`POST` | `/ops/schedules` | List / create durable schedules |
| `POST` | `/ops/schedules/{id}/state` | Enable, disable, pause, or resume a schedule |
| `POST` | `/ops/pause` / `/ops/resume` | Global scheduler pause / resume |
| `GET`/`POST` | `/ops/due` / `/ops/tick` | Due-work inspection / worker pass |
| `GET` | `/ops/releases/{location_id}/{target}` | Release manifests for a context |
| `POST` | `/ops/releases/validate` | Dry-run hash + evidence validation |
| `POST` | `/ops/releases/promote` / `/rollback` | CAS promotion / coherent rollback |
| `GET` | `/ops/status/{location_id}/{target}` | Compact operational status (freshness, drift, maturity) |
| `GET` | `/ops/integrity` | Read-only broken-reference / dangling-release scan |

---

> [!NOTE]
> **Known limitations, stated honestly:** the operations layer is reachable via API and CLI but does not yet have a dedicated visual console inside the workspace; the LightGBM challenger reports `dependency_unavailable` where the package is absent; and all evaluation figures are development/backtest evidence — the protected holdout is scored exactly once and only in final-assessment mode.
