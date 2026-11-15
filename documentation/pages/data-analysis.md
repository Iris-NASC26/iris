# Data Analysis — Interactive Workbench & Step-by-Step Case File

The **Data Analysis** page is Iris's interactive statistical workbench. Instead of a static batch of checkboxes, it provides an intuitive card-based method selector, per-method parameter controls, automatic dataset compatibility checks, step-by-step cumulative execution, and downloadable high-resolution charts.

> Navigate to it via: **Workspace → Data Analysis** in the left sidebar.

---

## 1. What is a Case File?

A Case File is Iris's structured, auditable evidence output for a completed environmental investigation. It is:

- **Reproducible** — Given identical inputs (dataset, spatial extent, time window, and seasonal parameters), it deterministically produces identical statistics.
- **Transparent** — Every numerical value is accompanied by its underlying formula, effective sample size (\(n_{\text{eff}}\)), degrees of freedom, and assumptions.
- **Exportable** — Downloadable as structured JSON or CSV for academic publications, policy briefs, or external modeling.
- **Traceable** — Includes a full ISO 19115 / PROV-O provenance trail with SHA-256 manifests linking findings directly back to raw upstream satellite or reanalysis granules.

---

## 2. Dataset Compatibility & Readiness

Not every statistical method is valid for every temporal cadence or sample size. For example, **Daily** or **Yearly** datasets cannot be analyzed with calendar-month methods such as **Seasonal Kendall** or the **12-Month Seasonal Fingerprint**, whereas **Monthly** records spanning multiple years support all analytical methods.

At the top of the left control panel, Iris inspects your active extraction or dataset and presents a **Dataset Compatibility Profile**:
- **Cadence Badge**: Displays whether the active series is `Daily`, `8-Day`, `16-Day`, `Monthly`, `Seasonal`, or `Yearly`.
- **Observation Coverage**: Reports valid observation count, completeness percentage, and year span.
- **Per-Method Eligibility Gates**: Each analysis card displays a clear `Compatible` badge or an explicit prerequisite badge (e.g., `Requires Monthly Data` or `Requires ≥ 10 Valid Points`), explaining why a method is active or locked.

---

## 3. Intuitive Method Cards, Parameters & `(i)` Documentation Links

Each statistical method is presented as an interactive card in the left control pane:

1. **Hover `(i)` Tooltip**: Hovering over the info icon reveals a concise summary of the method, what statistical hypothesis it tests, and when it is indicated.
2. **Click `(i)` to Open Dedicated Reference Pages**: Clicking the `(i)` icon opens a comprehensive standalone guide in a new tab with mathematical proofs, step-by-step algorithms, parameter definitions, and failure modes:
   - [Linear Trend · OLS t-Test](#method-ols)
   - [Mann–Kendall Trend Test (Hamed–Rao)](#method-hamed-rao-mk)
   - [Seasonal Kendall Test](#method-seasonal-kendall)
   - [Sen's Slope Estimator](#method-sen-slope)
   - [Pettitt Change-Point Screen](#method-pettitt)
   - [Anomaly Review (Z-Score & Robust MAD)](#method-anomalies)
   - [Seasonal Fingerprint Heatmap](#method-seasonal-fingerprint)
   - [Full Case File Diagnostics & Robustness](#method-case-file-diagnostics)
3. **Adjustable Method Parameters**: Expanding a method card lets you customize its statistical parameters before running or re-running that method:
   - Significance level (\(\alpha\)): `0.01`, `0.05`, or `0.10`
   - Autocorrelation correction mode (`hamed_rao`, `none`, or `standard`) and maximum lag limit (`mk_max_lag`, 3–60 lags)
   - Sen's slope confidence level (80%–99.9%) and rate scale (`decade` vs. `year`)
   - Anomaly dispersion metric (`std` vs. `robust_mad`) and \(|z|\) threshold (1.0–4.0)
   - Minimum segment length for Pettitt change-point detection (1–36 periods)
   - Trend triangle minimum window span (3–15 years)

---

## 4. Step-by-Step Cumulative Analysis Workflow

You do **not** have to select and run all analyses simultaneously:

- **Run One Method at a Time**: You can start by selecting and running **Linear trend · OLS t-test**. Its results immediately appear in a dedicated section on the right pane.
- **Append Additional Analyses Incrementally**: Later, select **Mann–Kendall trend test** or **Pettitt change-point screen** and submit. Iris preserves your earlier OLS results and appends the new analysis section below—you never have to rerun existing calculations.
- **In-Place Parameter Updates**: If you adjust a parameter for a previously executed method (for instance, switching the anomaly dispersion from sample standard deviation to robust MAD), you can re-run just that card to update its section in place while keeping all other sections untouched.

---

## 5. Seasonal Pre-Treatments

Seasonality can easily create spurious trends if an environmental time series starts in a high-value season and ends in a low-value season. Iris provides four explicit seasonal treatments:

| Treatment | Methodology | Requirement |
|---|---|---|
| **Automatic (Recommended)** | Uses robust STL decomposition when the series is regular monthly with \(\ge 24\) months; otherwise falls back to calendar-month climatology. | \(\ge 12\) observations |
| **Calendar-Month Climatology** | Subtracts each calendar month's multi-year mean (\(\mu_m\)): \(y'_i = y_i - \mu_{\text{month}(i)}\). | Multi-year monthly data |
| **Robust STL Decomposition** | Separates the signal into smooth trend, seasonal, and remainder components using iteratively reweighted Loess regression resistant to outliers. | Complete monthly data (\(\ge 24\) consecutive steps) |
| **No Seasonal Adjustment** | Analyzes the raw observations directly. Recommended only for annual aggregates, deseasonalized anomalies, or non-seasonal variables. | None |

---

## 6. Interpreting Results & Downloadable Charts

On the right-hand results pane:
- **Completed Analyses Bar**: Lists all executed analysis steps so you can quickly jump to any method or export the combined Case File.
- **Download Image (PNG)**: Every chart card includes a dedicated export button to download publication-ready figures with complete titles, axes, and legends.
- **Hamed–Rao Mann–Kendall Verdict**:
  - **Significant Trend (\(p < \alpha\))**: Reports the autocorrelation-corrected \(Z\) score, effective sample size \(n_{\text{eff}}\), Kendall's \(\tau\), and decadal Sen's slope with 95% confidence intervals.
  - **No Statistically Significant Trend**: Clearly states that empirical evidence does not reach the significance threshold, avoiding unwarranted claims.
- **Trend Triangle**: A visual matrix showing Sen's slopes and \(p\)-values across all combinations of start and end years to verify that the trend is persistent rather than an artifact of endpoint selection.
- **Lag Correlogram**: Displays empirical autocorrelation coefficients \(r_k\) for lags 1 through 24 against the \(1.96/\sqrt{n}\) white-noise significance boundary.

---

## 7. Evidence Grades (A–D)

Iris assigns a deterministic Evidence Grade to summarize scientific reliability:

| Grade | Classification | Standard Criteria |
|---|---|---|
| **Grade A** | High Reliability | Complete data coverage (\(\ge 90\%\)), no significant sensor caveats, robust convergence between parametric and non-parametric tests, and controlled false discovery rate. |
| **Grade B** | Moderate Reliability | Minor gaps (\(75\%–89\%\) completeness) or known minor observational caveats (such as seasonal cloud obscuration in optical MODIS data) that do not compromise the overall direction. |
| **Grade C** | Tentative / Caveated | Significant missing intervals (\(50\%–74\%\)), high serial autocorrelation reducing \(n_{\text{eff}}\) substantially, or conflicting test diagnostics. |
| **Grade D** | Inconclusive | Data completeness \(< 50\%\), insufficient span for decadal trend assessment, or severe calibration discontinuities in the upstream record. |
