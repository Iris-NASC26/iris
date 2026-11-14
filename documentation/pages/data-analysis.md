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
