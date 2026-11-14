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

When many statistical tests are run simultaneously (e.g., testing every grid cell in the Global Trend Cube, or every variable in a Case Board scan), some will appear significant by chance alone. The **Benjamini-Hochberg procedure** controls the expected proportion of false discoveries among all significant results.

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

## What Iris does NOT do

- **Iris does not establish causation.** A statistically significant trend shows that something has changed consistently; it does not explain why.
- **Iris does not forecast.** Trend continuation projections (if shown) are mathematical extrapolations with widening uncertainty bounds, not climate model predictions.
- **Iris does not use AI for scientific computation.** All statistics are deterministic. The AI component (Gemini) is limited to parsing your query and explaining results in plain language.
