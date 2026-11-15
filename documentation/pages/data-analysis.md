# Data Analysis — User-Directed Analysis

The **Data Analysis** page lets you choose how to prepare and analyze an observed series. Results are calculated only after you select methods and press **Run selected analysis**.

> Navigate to it via: **Workspace → Data Analysis** in the left sidebar.

---

## What is a Case File?

A Case File is Iris's structured output for a completed investigation. It is:

- **Reproducible** — given the same inputs (dataset, region, time window), it will always produce identical results
- **Transparent** — every statistical value is accompanied by its source, method, and assumptions
- **Exportable** — download as JSON or CSV for use in papers, presentations, or further analysis
- **Traceable** — includes a full ISO 19115 / PROV-O provenance record linking the result back to the original upstream data

Each Case File is assigned a unique ID (shown in the workspace top bar) that can be used to reload the same analysis.

---

## Running the analysis

Open Data Analysis from a completed extraction preview, choose a **Seasonal treatment**, select one or more analysis methods, and submit. Opening the page or loading an extraction does not automatically run analysis. When there is no extraction, a live NASA POWER series can be requested only for a supported NASA POWER selection. Provider or analysis failures are shown as errors rather than replaced with generated results.

Available seasonal treatments:

- **Automatic** — uses robust STL (period 12) for complete regular monthly series of at least two years; otherwise it uses calendar-month climatology.
- **Calendar-month climatology** — explicitly removes each calendar month's mean.
- **Robust STL** — requires at least 24 complete consecutive monthly observations; the service reports an error instead of silently substituting another method if the record is unsuitable.
- **No seasonal adjustment** — analyzes the observed values without subtracting a seasonal component.

The pipeline sorts source observations, retains QA flags and missing intervals, and excludes missing/flagged/non-finite values from inference without filling gaps. The selected seasonal treatment is applied before trend and anomaly methods; Seasonal Kendall compares matching calendar months from the observed series.

Select any methods you need:

1. **OLS linear trend and t-test** — estimates a linear slope using elapsed calendar time and tests \(H_0:\beta_1=0\) with an autocorrelation-adjusted effective degrees of freedom.
2. **Hamed–Rao Mann–Kendall test** — tests monotonic trend with tie correction and a variance correction for serial rank autocorrelation.
3. **Seasonal Kendall test** — aggregates like-calendar-month comparisons to test a trend while controlling for recurring annual seasonality.
4. **Sen's slope and 95% interval** — reports a robust median pairwise slope and rank-based confidence interval.
5. **Pettitt change-point screen** — reports an approximate single-breakpoint diagnostic when supported by the record.
6. **Anomaly review** — flags observed |z| ≥ 2 values for review; anomalies are not removed from trend analysis.
7. **Seasonal fingerprint** — displays a year-by-month view of observed values and seasonal anomalies.
8. **Full Case File diagnostics** — adds evidence grade, caveats, robustness, provenance, and supporting context.

Changing the selection clears any prior result. The right pane displays the latest submitted analysis and only the methods selected for that run.

---

## Interpreting selected results

When Hamed–Rao Mann–Kendall is selected, the result includes a plain-language summary:

| Verdict | Meaning |
|---|---|
| **Significant increasing/decreasing trend** | The autocorrelation-adjusted Mann–Kendall test has p < 0.05; slope and uncertainty are reported alongside it |
| **No statistically significant trend detected** | The test did not reach p < 0.05; this does not prove that the trend is zero |

A p-value is not the probability that a trend is true. The page shows p-values and confidence intervals directly instead of converting \(1-p\) to a misleading confidence percentage.

---

## Reading the charts

### Raw vs. deseasonalized signal

The first chart shows two overlaid views of your data:

- **Raw observations** — values from the extraction, with QA-invalid values omitted and gaps left open
- **Seasonal cycle** — observed calendar-month climatology values
- **Deseasonalized anomaly** — the observed value minus its calendar-month mean, with Sen's slope overlaid

Comparing raw and deseasonalized views reveals whether a trend is real or simply a reflection of seasonal timing shifts.

### Anomaly panel

A secondary chart highlights observations that fall outside the expected range. Each anomaly shows:

- Its date and value
- How many standard deviations it is from the seasonal mean
- Whether it is a positive (above) or negative (below) anomaly

> **Why anomalies matter:** A single extreme year can dominate a linear regression slope. The Mann-Kendall test and Sen's slope are specifically chosen because they are resistant to outliers — but anomalies may still indicate measurement errors or physically interesting events worth investigating further.

---

## Statistical summary panel

A summary of key statistical outputs appears for the methods selected:

| Metric | Description |
|---|---|
| **OLS slope and t-test** | Parametric linear rate, t statistic, adjusted degrees of freedom, two-sided p-value, and 95% slope interval |
| **Hamed–Rao Mann–Kendall** | Autocorrelation-adjusted monotonic trend Z, Kendall tau, p-value, lag-1 rank correlation, and effective sample size |
| **Seasonal Kendall** | Like-months-across-years test; unavailable if the record has too few repeated months |
| **Sen's slope and 95% interval** | Robust median pairwise change per decade and rank-based confidence interval |
| **BH FDR q-value** | Adjusted result for the explicitly declared family of tests in this Case File |
| **Change point** | Candidate single breakpoint from Pettitt's non-parametric screen; not proof of a regime shift |

The year-by-month seasonal fingerprint displays actual observed anomalies. Blank cells represent missing or QA-excluded observations. Anomaly flags are review cues and are not deleted from the trend analysis.

---

## Evidence grade

Each Case File receives an **Evidence Grade** (A through D) based on:

| Grade | Criteria |
|---|---|
| **A** | ≥ 30 years of data, ≥ 90% completeness, p < 0.01, parametric/non-parametric concordance |
| **B** | ≥ 20 years, ≥ 80% completeness, p < 0.05 |
| **C** | ≥ 10 years, ≥ 70% completeness, p < 0.10 |
| **D** | Short record, high missingness, or marginally significant result |

Evidence grades are included only when **Full Case File diagnostics** is selected. They provide a quick readability indicator and should not be treated as a substitute for inspecting the method assumptions, data coverage, or provenance.

---

## Provenance record

At the bottom of the Case File, the full provenance chain is displayed:

- Upstream data provider and product version
- Extraction timestamp (UTC)
- Processing pipeline version
- Spatial reduction method used
- Statistical engine parameters
- Unique result hash (SHA-256 of the input data)

This record ensures that any result can be independently verified and reproduced.

---

## Exporting the Case File

Click **"Export"** to download:

- **Full Case File (JSON)** — all statistics, charts data, metadata, and provenance in a structured format
- **Observations (CSV)** — raw and deseasonalized time series with anomaly flags
- **Summary (PDF)** — a formatted report suitable for sharing *(coming soon)*

---

## Detailed Mathematical Formulations & Statistical Engine

Iris implements deterministic scientific algorithms. Every equation is verified against standard literature benchmarks:

### 1. Hamed & Rao (1998) Modified Mann–Kendall Test

To evaluate monotonic trend without inflation from positive serial autocorrelation:

$$\text{Var}^*(S) = \text{Var}(S) \cdot \frac{n}{n^*}$$

where the variance correction factor \(\frac{n}{n^*}\) is calculated using the significant lag-\(k\) autocorrelation coefficients \(\rho_k\) of the ranks of the deseasonalized observations:

$$\frac{n}{n^*} = 1 + \frac{2}{n(n-1)(n-2)} \sum_{k=1}^{n-1} (n-k)(n-k-1)(n-k-2) \rho_k$$

Only lags where \(|\rho_k| > \frac{1.96}{\sqrt{n}}\) are included in the variance summation.

### 2. Sen's Slope Estimator (1968)

The robust median slope across all unique pairs of observations:

$$\beta = \text{Median} \left\{ \frac{x_j - x_i}{t_j - t_i} : 1 \le i < j \le n \right\}$$

The 95% non-parametric confidence interval \([\beta_{\text{low}}, \beta_{\text{high}}]\) is derived from the rank distribution of the sorted pairwise slopes, ensuring complete immunity to severe outliers.

### 3. Pettitt's Change-Point Test (1979)

Identifies a single candidate change point in a continuous time series using the non-parametric Mann-Whitney statistic:

$$U_{t, n} = \sum_{i=1}^t \sum_{j=t+1}^n \text{sgn}(x_i - x_j)$$

The peak statistic is \(K = \max_{1 \le t < n} |U_{t, n}|\), with approximate two-sided significance:

$$p \approx 2 \exp\left( \frac{-6 K^2}{n^3 + n^2} \right)$$

### 4. Benjamini–Hochberg False Discovery Rate (FDR)

When testing across a declared family of \(m\) hypotheses, p-values are ranked in ascending order: \(p_{(1)} \le p_{(2)} \le \dots \le p_{(m)}\). The q-value threshold identifies the largest \(k\) such that:

$$p_{(k)} \le \frac{k}{m} \alpha$$

ensuring that the expected proportion of false positives remains strictly below \(\alpha = 0.05\).

---

## Backend API Specification

The scientific engine is exposed via REST endpoints in FastAPI (`backend/main.py`) and Next.js proxies (`src/app/api/v1/analyze/`):

### Endpoint: `POST /api/v1/analyze/case-file`

**Request Body (`CaseFileAnalysisRequest`):**
```json
{
  "job_id": "job-6cc93cdfef",
  "dataset_id": "temperature",
  "dataset_name": "Near-surface air temperature",
  "parameter_code": "T2M",
  "unit": "°C",
  "location": "Los Angeles County, CA",
  "latitude": 34.05,
  "longitude": -118.24,
  "start_year": 2000,
  "end_year": 2024,
  "alpha": 0.05,
  "seasonal_adjustment": "auto",
  "analysis_methods": [
    "ols",
    "hamed_rao_mk",
    "seasonal_kendall",
    "sen_slope",
    "pettitt",
    "anomalies",
    "seasonal_fingerprint",
    "case_file_diagnostics"
  ]
}
```

**Response Body (`CaseFileAnalysisResponse`):**
Returns a structured JSON document containing:
- `result_id`: Unique identifier for the analysis result
- `provenance_mode`: `"live_extracted_result"`, `"pinned_real_snapshot"`, or `"live_nasa_power"`
- `sha256_hash`: Cryptographic digest of the underlying data payload
- `hamed_rao_mk_z`, `hamed_rao_mk_p`, `kendall_tau`, `effective_sample_size_n_eff`
- `sens_slope_decadal`, `sens_ci_low`, `sens_ci_high`
- `ols_slope_decadal`, `ols_t_statistic`, `ols_p_value`, `ols_ci_low_decadal`, `ols_ci_high_decadal`
- `evidence_grade`: `"A"`, `"B"`, `"C"`, or `"D"` with specific grade justification bullets
- `explanations`: Three audience-tailored narrative explanations (`explorer`, `student`, `scientist`)
- `analysis_series`: Array of observation objects with raw values, seasonal components, residuals, and anomaly Z-scores

---

## Detailed Use Cases

### 1. Long-Term Urban Heat Island Amplification
- **Objective**: Determine whether urban core warming exceeds regional baseline rates.
- **Data**: NASA POWER `T2M` (1985–2024, 40 years).
- **Execution**: Run with STL decomposition and Hamed–Rao Modified Mann–Kendall.
- **Output**: Detects decadal warming (+0.44°C/decade, \(p < 0.001\)), Pettitt change point around 1998, and Grade A evidence.

### 2. Multi-Decadal Precipitation Deficit in Arid Agriculture
- **Objective**: Test whether agricultural drought in California's Central Valley reflects a significant long-term downward trend or cyclical decadal oscillation.
- **Data**: NASA POWER GPCP precipitation rate (1981–2024).
- **Execution**: Apply Calendar Climatology adjustment and Seasonal Kendall test.
- **Output**: Identifies no statistically significant 40-year monotonic drying trend (\(p = 0.38\)), highlighting that drought impacts are driven by inter-annual variability and temperature-driven evapotranspiration rather than permanent rainfall decline.

### 3. High-Latitude Permafrost Soil Moisture Shifts
- **Objective**: Monitor Arctic thaw indicators via root-zone soil wetness (`GWETROOT`).
- **Data**: NASA POWER GLDAS Noah Soil Wetness (2000–2024).
- **Execution**: Sen's slope and anomaly review.
- **Output**: Reveals statistically significant wetting trends in sub-polar tundra zones with prominent positive summer anomalies.

---

## Scientific Literature References

- **Mann, H. B.** (1945). Nonparametric tests against trend. *Econometrica*, 13(3), 245–259.
- **Kendall, M. G.** (1975). *Rank Correlation Methods* (4th ed.). Charles Griffin, London.
- **Hamed, K. H., & Rao, A. R.** (1998). A modified Mann-Kendall trend test for autocorrelated data. *Journal of Hydrology*, 204(1–4), 182–196. [doi:10.1016/S0022-1694(97)00125-X](https://doi.org/10.1016/S0022-1694(97)00125-X)
- **Sen, P. K.** (1968). Estimates of the regression coefficient based on Kendall's tau. *Journal of the American Statistical Association*, 63(324), 1379–1389. [doi:10.1080/01621459.1968.10480934](https://doi.org/10.1080/01621459.1968.10480934)
- **Pettitt, A. N.** (1979). A non-parametric approach to the change-point problem. *Applied Statistics*, 28(2), 126–135. [doi:10.2307/2346729](https://doi.org/10.2307/2346729)
- **Benjamini, Y., & Hochberg, Y.** (1995). Controlling the false discovery rate: a practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B*, 57(1), 289–300.
- **Cleveland, R. B., Cleveland, W. S., McRae, J. E., & Terpenning, I.** (1990). STL: A seasonal-trend decomposition procedure based on Loess. *Journal of Official Statistics*, 6(1), 3–73.

