# Scientific Methodology

Iris uses a transparent, reproducible statistical pipeline for all trend analysis. This page explains each method, why it was chosen, and how to interpret its outputs.

> You can also read the [Methodology page](/methodology) on the main Iris website, which includes interactive visualizations of each method.

---

## Why these methods?

Environmental data is challenging to analyze:

- **Seasonality** — temperature, precipitation, and vegetation all have strong annual cycles that can mask long-term trends
- **Non-normality** — many climate variables are skewed or have heavy tails; methods assuming normal distributions are inappropriate
- **Outliers** — a single extreme year can dominate a slope estimate based on ordinary least squares regression
- **Autocorrelation** — consecutive observations tend to be correlated, which inflates the apparent significance of trends if not corrected

Iris's pipeline is designed specifically to address all four challenges.

---

## Stage 1 — Define the question

Before analysis, the investigation must specify:

- **A measurable variable** — a physical quantity that can be observed and tracked over time
- **An area of interest** — a geographic region from which observations are aggregated
- **A time window** — long enough to distinguish a real trend from year-to-year variability (minimum 10 years recommended; 20+ years preferred)

The specificity of the question determines what can be concluded. "Has temperature changed in Los Angeles County?" is answerable. "Why is it changing?" requires additional investigation beyond what statistical trend analysis can determine.

---

## Stage 2 — Prepare the signal

### Quality assurance
Incoming observations are checked for:
- Sensor fill values (indicating a failed retrieval, not a real observation)
- Flagged pixels (cloud cover, snow contamination, sensor anomalies)
- Implausible values (outside physically defined bounds)

Flagged values are excluded from analysis with their reason codes preserved, not silently zeroed.

### Temporal resampling
Observations at their native cadence (e.g., 8-day MODIS composites) are aggregated to monthly values using physically appropriate methods (mean for temperature; sum for precipitation).

### Seasonal adjustment

For complete, regular monthly records spanning at least two annual cycles, Iris removes the repeating seasonal cycle using robust **STL (Seasonal and Trend decomposition using Loess)**. STL decomposes a time series into:

```
Observed = Trend + Seasonal + Remainder
```

- **Trend component** — the slow, long-term variation (what we care about)
- **Seasonal component** — the repeating annual cycle (removed for trend testing)
- **Remainder** — residual noise after removing both components

Trend tests use the seasonally adjusted series (Trend + Remainder). If months are missing, the cadence is irregular, or fewer than two annual cycles are available, Iris uses a calendar-month climatology adjustment instead. The applied method is included in the Case File. Missing observations are never filled to make STL run.

---

## Stage 3 — Mann-Kendall trend test

The **Mann-Kendall test** is a non-parametric hypothesis test for monotonic trends in a time series. It makes no assumptions about the distribution of the data.

### How it works

For every pair of observations (xᵢ, xⱼ) where j > i, the test asks: "Is the later value larger (+1), smaller (−1), or equal (0) to the earlier value?" The sum of all these comparisons is the **S statistic**:

```
S = Σ sgn(xⱼ − xᵢ)   for all i < j
```

A large positive S indicates a consistent upward trend; a large negative S indicates a consistent downward trend; S near zero indicates no consistent direction.

### Hamed-Rao autocorrelation correction

Standard Mann-Kendall assumes observations are independent. Environmental data typically has autocorrelation — consecutive months tend to be similar. Autocorrelation inflates the variance of S, making trends appear more significant than they are.

Iris applies the **Hamed-Rao (1998) modified Mann-Kendall test**, which corrects the variance of S for serial rank autocorrelation and ties. The result includes the adjusted Z and p-value, rank autocorrelation, and effective sample size. The test is unavailable when fewer than six valid observations remain.

### Significance threshold

By default, Iris uses a significance threshold of **α = 0.05** (5% false positive rate). This means:

- If p ≤ 0.05 → the trend is classified as **statistically significant**
- If p > 0.05 → the result is classified as **inconclusive**

Iris never re-labels an inconclusive result as "no trend" — the absence of significant evidence is not evidence of absence of change.

### Linear trend t-test

An ordinary least-squares line is fitted against elapsed calendar time. Iris tests the null hypothesis \(H_0:\beta_1=0\) with a two-sided Student's t-test, using effective-sample-size degrees of freedom to account for autocorrelation. The page reports the slope per decade, t statistic, degrees of freedom, p-value, and 95% confidence interval. This parametric result is shown alongside—not in place of—the non-parametric Mann–Kendall and Sen estimates.

### Seasonal Kendall

For monthly records, the seasonal Kendall test sums the Mann–Kendall scores and variances for the separate calendar-month series. Comparing like months across years controls for recurring annual seasonality. It is reported separately from the Hamed–Rao overall test and is marked unavailable when there are not enough repeated observations per month.

---

## Stage 4 — Sen's slope (rate of change)

The **Sen's slope** estimator computes a robust rate of change that is resistant to outliers.

### How it works

For every pair of observations, compute the slope between them:

```
βᵢⱼ = (xⱼ − xᵢ) / (tⱼ − tᵢ)
```

Sen's slope is the **median** of all N(N-1)/2 pairwise slopes. Because it uses the median rather than the mean, a few extreme observations cannot substantially distort the estimate.

### Output

Iris reports Sen's slope scaled to a **per-decade rate** in the variable's physical units:
- Temperature: °C per decade
- Precipitation: mm/day per decade  
- NDVI: index units per decade

A **95% confidence interval** is computed for the slope using a distribution-free method.

---

## Stage 5 — Anomaly detection

An **anomaly** is an observation that falls outside the range expected from the seasonal baseline. Iris flags values where:

```
Z-score = (observation − seasonal mean) / seasonal standard deviation
```

**|Z| ≥ 2.0** → flagged as an anomaly (outside ~95% of the expected distribution)

Anomalies are reported as metadata in the Case File — they inform the investigation but do not affect the Mann-Kendall or Sen's slope results, which are robust to outliers.

---

## Supplementary methods

### Pettitt change-point detection

The **Pettitt test** identifies if and when a statistically significant structural shift (step change) occurred in the time series. This can reveal:

- A sudden policy or land-use change
- A sensor recalibration or data version change
- A climate regime shift

If a change point is detected, the Case File reports its estimated date and p-value.

### Benjamini-Hochberg False Discovery Rate (BH-FDR)

When many statistical tests are run simultaneously (e.g., testing every grid cell in the Global Trend Cube), some will appear significant by chance alone. The **Benjamini-Hochberg procedure** controls the expected proportion of false discoveries among all significant results.

Iris reports both the raw p-value and the FDR-adjusted **q-value**. The significance filter on the Living Globe uses q ≤ 0.05.

---

## Evidence Grades (A–D)

| Grade | Temporal span | Completeness | Significance | Notes |
|---|---|---|---|---|
| **A** | ≥ 30 years | ≥ 90% | p < 0.01 | Parametric/non-parametric concordance |
| **B** | ≥ 20 years | ≥ 80% | p < 0.05 | |
| **C** | ≥ 10 years | ≥ 70% | p < 0.10 | |
| **D** | < 10 years or | < 70% | or p ≥ 0.10 | Treat as preliminary |

---

## End-to-End Platform Architecture & User Workflow

Iris connects four analytical tracks on top of a shared deterministic scientific engine and SHA-256 provenance spine:

1. **Step 01 — Frame the Inquiry & Confirm Keywords (`/workspace/intelligence`)**:
   Submit a natural-language question, environmental event, or regional hypothesis. Iris enforces a **Two-Phase Keyword Confirmation Gate**: zero external catalog requests fire on page load; `gemini-3.5-flash-lite` (backed by a deterministic NASA GCMD ontology and Open-Meteo geocoder fallback) extracts subject domain, geographic coordinates/bounding box, temporal range, and candidate search keywords. You review/edit the keywords, select from **10 live upstream data catalogs** (`NASA POWER`, `NASA CMR`, `NASA AppEEARS`, `NASA GES DISC`, `NASA Harmony`, `NOAA CDO`, `NOAA OneStop`, `OPeNDAP`, `EODAG`, `Copernicus CDS`), and click **Confirm and search**.
2. **Step 02 — Configure Spatial, Temporal & Physical Parameters (`/workspace/data-selection`)**:
   Choose an extract-verified time-series product, clamp dates to authoritative archive bounds, select a native or coarser temporal cadence (`Daily`, `8-Day`, `16-Day`, `Monthly`, `Seasonal`, `Yearly` — artificial oversampling is blocked), enforce physically valid aggregation (`mean` for state variables; `sum` for precipitation/runoff), and draw a Point or Bounding Box on the interactive MapLibre map.
3. **Step 03 — Inspect Data Quality & Completeness (`/workspace/data-preview`)**:
   Track the 4-stage extraction pipeline (`Request Submitted` $\rightarrow$ `Subsetting & QA Masking` $\rightarrow$ `Temporal Resampling` $\rightarrow$ `Ready for Preview`), audit completeness KPIs (with an automated warning when missingness exceeds 15%), inspect the **gap-aware time-series chart** (fill values `-999.0` and flagged observations are isolated with reason codes and never bridged by straight lines), export ISO 19115 CSV/JSON, and pass the immutable SHA-256 `jobId` / `result_id` to analysis.
4. **Step 04 — Execute the 8-Method Statistical Case File Workbench (`/workspace/data-analysis`)**:
   Review the automatic **Dataset Compatibility Profile**, select one of four **Seasonal Pre-Treatments** (`Automatic`, `Robust STL Decomposition`, `Calendar-Month Climatology`, or `No Adjustment`), and run any of the **8 interactive statistical method cards** cumulatively (`OLS t-test`, `Hamed–Rao Mann–Kendall`, `Seasonal Kendall`, `Sen's Slope`, `Pettitt Change-Point`, `Anomaly Review`, `Seasonal Fingerprint`, `Full Case File Diagnostics`) across **Explorer**, **Student**, and **Scientist** narrative registers.
5. **Step 05 — Multi-Panel 2D/3D Studio & Planetary Exploration (`/workspace/visualize`, `/workspace/globe`)**:
   Explore linked 2D time series, **3D Time Tracks**, **3D Seasonal Landscapes** (with gap-safe quad partitioning), **3D Seasonal Orbits**, and multi-location **95% CI Trend Intervals** in the Dockview Studio, or load **11 authentic monthly NASA POWER AWS S3 Zarr spatial layers** onto the token-free **CesiumJS 3D Living Globe** (with progressive NASA GIBS WMTS tiles, cosine-latitude-weighted overviews, and 2D equirectangular fallback).
6. **Step 06 — History-Only ML Forecasts, Disaster Forensics & Scholarly Literature (`/workspace/forecasts`, `/workspace/case-studies`, `/workspace/research`)**:
   Register any geographic point (`loc-*`) or bounded area (`area-*`) in **Forecasts** to train and evaluate history-only quantile regression models (`iris.ml-forecast.v2`) across 13+ Earthdata/reanalysis targets clipped to declared availability lags (`now - lag`) with conformal calibration and baseline skill gating—or inspect 72-hour 51-member ECMWF precipitation ensembles with member-first accumulation and 7-day NASA GPM IMERG V07 context. Reconstruct extreme events (`Nepal Floods 2024`, `Cyclone Ditwah 2025`) with issue-time cutoffs in **Case Studies**, and link active datasets to peer-reviewed literature via **OpenAlex** and **DataCite** in **Existing Research**.

---

## What Iris does — and its strict scientific boundaries

- **Iris does not establish causation from statistical correlation.** A statistically significant trend shows that an environmental signal has changed consistently over the observed period; formal physical attribution requires dedicated climate-model attribution experiments.
- **Iris separates historical trend inference from empirical forecasting.** Trend continuation bounds in Data Analysis are mathematical extrapolations of Sen's slope, whereas forward predictions in `/workspace/forecasts` are produced by history-only quantile models (`iris.ml-forecast.v2`) evaluated on chronological folds with purge/embargo and gated against persistence and seasonal climatology baselines.
- **Iris never uses AI for numerical computation.** All statistics, slopes, $p$-values, $q$-values, and Evidence Grades are computed deterministically by SciPy, Statsmodels, and NumPy. The conversational AI (`gemini-3.5-flash-lite`) is strictly restricted to parsing search queries and formatting explanations from verified statistics.

---

## Validation Lab Benchmarks (SRS v1.0)

To ensure mathematical precision across all supported computing environments, Iris validates its statistical engine against five canonical test benchmarks:

| Benchmark ID | Test Description | Theoretical Expectation | Engine Result | Tolerance | Verification Status |
|---|---|---|---|---|---|
| **VAL-01** | Synthetic Pure Linear Signal (No Noise) | Slope \(\beta = 1.0\), \(p < 10^{-6}\), \(\tau = 1.0\) | \(\beta = 1.000\), \(\tau = 1.000\) | \(\pm 10^{-5}\) | PASS |
| **VAL-02** | Stationary White Gaussian Noise (\(\mu=0, \sigma=1\)) | Slope \(\beta \approx 0\), \(p > 0.10\) | \(p = 0.642\), No significance | \(p > 0.05\) | PASS |
| **VAL-03** | AR(1) Autocorrelated Noise (\(\phi=0.6\)) | Standard MK falsely rejects \(H_0\); Hamed–Rao corrects \(p > 0.05\) | Unadjusted \(p=0.018\); HR-adjusted \(p=0.089\) | Corrected \(p > 0.05\) | PASS |
| **VAL-04** | Step Function Jump (Abrupt Change Point) | Pettitt breakpoint identified at exact step time \(t=60\) | Detected at \(t=60\), \(p < 0.001\) | Exact index match | PASS |
| **VAL-05** | Real NASA POWER Benchmark (Los Angeles T2M 2000–2024) | Positive warming trend (+0.42°C/decade), \(p < 0.01\) | +0.421°C/decade, \(p = 0.0014\) | Match to \(\pm 0.01\) | PASS |

---

## Methodological Triangulation: Parametric vs. Non-Parametric Concordance

Iris emphasizes methodological triangulation. Relying on a single statistical test can be deceptive:
- **Ordinary Least Squares (OLS)** is statistically optimal under the Gauss-Markov theorem when errors are normally distributed and independent, but is fragile to extreme volcanic cooling years, sensor recalibrations, or skewed hydrological distributions.
- **Mann–Kendall and Sen's Slope** are resistant to arbitrary non-linear monotonic shifts and extreme outliers, but discard quantitative magnitude differences between rank steps.

When both the parametric t-test and the non-parametric Hamed–Rao test yield concordant significance (\(p \le 0.05\)) and concordant slope directions, the finding achieves **Grade A or B evidence**. If methods conflict, Iris lowers the grade to **C or D**, flagging the discrepancy for expert review.

---

## Authoritative Methodological References

1. **Cleveland, R. B., et al.** (1990). *STL: A Seasonal-Trend Decomposition Procedure Based on Loess*. Journal of Official Statistics, 6(1), 3–73.
2. **Hamed, K. H., & Rao, A. R.** (1998). *A modified Mann-Kendall trend test for autocorrelated data*. Journal of Hydrology, 204(1–4), 182–196. [doi:10.1016/S0022-1694(97)00125-X](https://doi.org/10.1016/S0022-1694(97)00125-X)
3. **Kendall, M. G.** (1975). *Rank Correlation Methods* (4th ed.). Charles Griffin, London.
4. **Mann, H. B.** (1945). *Nonparametric tests against trend*. Econometrica, 13(3), 245–259.
5. **Pettitt, A. N.** (1979). *A non-parametric approach to the change-point problem*. Applied Statistics, 28(2), 126–135. [doi:10.2307/2346729](https://doi.org/10.2307/2346729)
6. **Sen, P. K.** (1968). *Estimates of the regression coefficient based on Kendall's tau*. Journal of the American Statistical Association, 63(324), 1379–1389. [doi:10.1080/01621459.1968.10480934](https://doi.org/10.1080/01621459.1968.10480934)
7. **Benjamini, Y., & Hochberg, Y.** (1995). *Controlling the false discovery rate: a practical and powerful approach to multiple testing*. Journal of the Royal Statistical Society: Series B, 57(1), 289–300.

