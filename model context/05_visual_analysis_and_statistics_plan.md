# Plot & Visualize: Analysis and Visualization Plan

**Status:** Implementation plan for the Plot & Visualize scientific Case File  
**Scope:** `/workspace/visualize`, its shared statistical response contract, and the analysis route it consumes  
**Controlling references:** Integrated SRS v1.0, especially AN-01–AN-07, VZ-01–VZ-02, EX-03–EX-06, DP-03, and the zero-synthetic-data principle; `03_global_trend_cube_and_science_pipeline.md`; `04_codebase_developer_handbook.md`.

## 1. Goals and scientific constraints

The page shall turn the selected, provenance-bearing observation series into a transparent analysis, not generate a representative series for the user. Every plotted value and reported statistic must come from the active extraction result, a live provider response, or a separately identified and verified real snapshot. If none is available, show an actionable empty/error state; never substitute demonstration values, fabricated confidence, or synthetic observations.

The analysis must:

- Retain source timestamps, units, product/provider provenance, QA flags, and missing intervals.
- Exclude missing, flagged, and non-finite observations from inference without filling gaps or connecting chart lines across them.
- Identify monotonic and linear trends with effect sizes, uncertainty intervals, and explicit test assumptions.
- Account for annual seasonality and serial dependence in trend significance.
- Make the data transformation and test choices visible at Explorer, Student, and Scientist detail levels.
- Distinguish statistical significance from practical magnitude and avoid causal or forecast claims.

## 2. Input selection and quality control

1. Prefer the immutable `PreviewResponse` passed from the completed extraction (`job_id`, product, extraction configuration, provenance, `chart_series`). Preserve only rows whose `qa_flag` is valid and whose value is finite. Report excluded/missing/flagged counts and the source completeness rather than silently dropping them.
2. If the page was opened without an extraction job, a live Case File request may be made only when the backend can fetch the requested real product and location. The server response must identify its live provenance and include the actual analysis observations needed by the chart.
3. The current Case File endpoint accepts monthly series only. Reject other cadences with a clear resampling instruction rather than applying a monthly seasonal model to daily/irregular values.
4. Sort observations by timestamp and reject duplicate timestamps instead of silently selecting arbitrary values. Use elapsed calendar time for regression/slope x-values. Preserve gaps; do not interpolate or generate dates to fill them.
5. If the selected range contains too few valid observations for a method, return an explicit unavailable reason for that method. Do not return zero slopes or default p-values as if they were measured results.
6. Backend/provider failure must surface as an error with a retry or extraction action. Offline fallback is permitted only for an explicitly pinned, verified real observation series with its actual provenance and observations—not for synthetic summaries.

## 3. Transformations and data products

### 3.1 Seasonal adjustment

For complete, regular monthly series with at least two annual cycles, apply robust STL with period 12 to separate the seasonal component. Subtract the estimated seasonal component from observations before trend inference. STL must not receive synthetic gap-filled values.

If the source has missing/QA-excluded months, irregular cadence, or fewer than two annual cycles, use an explicitly labeled calendar-month climatology fallback. For each calendar month \(m\), calculate:

\[
C_m = \operatorname{mean}\{y_t : \operatorname{month}(t)=m\}, \qquad
A_t = y_t - C_{\operatorname{month}(t)}.
\]

Retain \(y_t\), seasonal component, and \(A_t\) separately. The climatology fallback removes the recurring annual level while preserving within-month temporal differences; it is not gap filling. Report the exact method used with each result. Calculate a seasonal-fingerprint matrix by year and month from the observed values/anomalies, leaving missing cells visibly empty. Also provide a monthly climatology profile and year-by-month anomaly heatmap so users can inspect recurring cycles and shifts directly.

For irregular or non-monthly cadence, use the actual supplied cadence and only apply a seasonal period when the data support it. State the chosen period and method in the result metadata.

### 3.2 Anomaly strip

For seasonally adjusted values, compute \(z_t=(A_t-\bar A)/s_A\) using the sample standard deviation, and flag \(|z_t|\ge2\) as a review cue, not an automatic outlier deletion. Show the underlying value, timestamp, QA status, and threshold. If the standard deviation is zero or the record is too short, mark z-scores unavailable.

## 4. Trend estimators and significance

### 4.1 Linear trend and Student's t-test

Fit ordinary least squares to \(A_t=\beta_0+\beta_1 x_t+\epsilon_t\), where \(x_t\) is elapsed time in years (not row number, so missing months do not compress time). Report \(\hat\beta_1\) in source units/year and source units/decade, fitted values, residuals, and \(R^2\).

Test \(H_0:\beta_1=0\) against a two-sided alternative using \(t=\hat\beta_1/SE(\hat\beta_1)\). Because environmental observations are serially dependent, use the estimated effective sample size for the t degrees of freedom when estimating the p-value and confidence interval; clearly label this as an autocorrelation-adjusted OLS t-test. Report t statistic, degrees of freedom, p-value, and 95% slope interval. If the required sample size or residual variance is insufficient, mark the test unavailable.

### 4.2 Mann–Kendall monotonic trend test

Compute the score over valid, time-ordered observations:

\[
S=\sum_{i<j}\operatorname{sgn}(A_j-A_i).
\]

Use the tie-corrected null variance:

\[
\operatorname{Var}(S)=\frac{n(n-1)(2n+5)-\sum_g t_g(t_g-1)(2t_g+5)}{18},
\]

where \(t_g\) are tie-group sizes. Apply continuity correction to \(Z\), then calculate a two-sided normal p-value. Report \(S\), \(Z\), Kendall \(\tau\), and p.

For the primary monthly trend result, estimate rank autocorrelation from Sen-detrended ranks and apply the Hamed–Rao variance inflation correction over statistically supported lags (bounded by available sample size). Report the correction, lag-1 autocorrelation, and effective sample size alongside the corrected p-value. A non-positive/degenerate variance or insufficient series must be reported as unavailable, not coerced into a significant result.

### 4.3 Seasonal Kendall test

For monthly records, group observations by calendar month, calculate each month's Kendall score and tie-corrected variance, then sum scores and variances across months. The resulting seasonal-Kendall statistic tests a monotonic trend while comparing like seasons. Report it as a separate test from the Hamed–Rao overall result; do not approximate it by taking the median of 12 unrelated p-values.

### 4.4 Sen's slope and confidence interval

Use actual elapsed time for every valid pair:

\[
\hat\beta_S=\operatorname{median}_{i<j}
\left(\frac{A_j-A_i}{x_j-x_i}\right).
\]

Scale the estimate to units/decade. Calculate the non-parametric 95% confidence bounds by ordering pairwise slopes and selecting rank limits from the normal approximation to the tie-corrected Mann–Kendall variance:

\[
C=z_{0.975}\sqrt{\operatorname{Var}(S)},\quad
L=\left\lfloor\frac{N'-C}{2}\right\rfloor,\quad
U=\left\lceil\frac{N'+C}{2}\right\rceil,
\]

where \(N'=n(n-1)/2\); clamp ranks to the valid sorted-slope range. State that this is a rank-based interval and disclose that the classic interval does not itself correct for serial correlation. Report the Sen estimate and both bounds, not a percent-style “confidence score.”

### 4.5 Change-point diagnostic

For sufficiently long valid records, compute Pettitt's non-parametric single-change-point statistic:

\[
U_t=\sum_{i\le t}\sum_{j>t}\operatorname{sgn}(A_i-A_j),\qquad
K=\max_t|U_t|,\qquad
p\approx \min(1,2e^{-6K^2/(n^3+n^2)}).
\]

Report the candidate timestamp, statistic, approximate p-value, and the limitation that this is a single-breakpoint screen and can be affected by seasonality/autocorrelation. Do not label it a confirmed regime shift without corroborating evidence.

## 5. Multiple testing, evidence, and interpretation

- For a single series, show the raw method-specific p-values. For a family of months, variables, or grid cells, calculate Benjamini–Hochberg adjusted q-values over the complete declared family; never present a q-value computed from a partial family as global correction.
- Use the backend's evidence-grade rules and caveat registry only when their inputs are observed. Show sample span, valid coverage, method-specific p-values, and sensor/data caveats that contributed to the grade.
- A p-value is not the probability that a trend is true. Do not convert \(1-p\) to a “confidence percentage.” Report estimates and intervals next to p-values.
- State that the diagnostic is observational and non-causal. Trend continuation, if displayed, must be explicitly conditional and separated from forecasts.

## 6. Page visualizations and interaction

The user controls when analysis runs. The left pane shall expose seasonal-treatment choices (automatic STL/climatology, explicit calendar-month climatology, robust STL, or no adjustment) and selectable methods (OLS t-test, Hamed–Rao Mann–Kendall, Seasonal Kendall, Sen slope/interval, Pettitt, anomaly review, seasonal fingerprint, and full Case File diagnostics). No analysis runs merely because an extraction was loaded or the page was opened. The Run action submits the selected methods and transformation to the analysis service; changing a selection invalidates old results, and the right pane displays only output corresponding to the latest submitted selection. An unsupported explicit transformation, such as STL on a gapped series, returns a clear error rather than silently switching methods.

1. **Observation and trend chart:** Plot actual timestamp/value observations, missing-data gaps, the user-selected seasonal-adjusted series, and fitted OLS/Sen trend lines when those methods were selected. Use a legend and units; show the time window, cadence, source, and QA exclusions. Do not draw a line through missing intervals.
2. **Seasonal fingerprint:** Show a year-by-month heatmap for observed anomalies, a missing-cell treatment, and a diverging zero-centered scale. Tooltips provide year, month, raw value, anomaly, and unit.
3. **Anomaly strip:** Show observed z-scores and the \(\pm2\) review thresholds; retain all source observations.
4. **Trend results:** Display OLS slope and adjusted t-test; Hamed–Rao Mann–Kendall p-value; seasonal Kendall result; Sen slope with 95% interval; and Pettitt candidate breakpoint where supported. Clearly label each test and its null hypothesis.
5. **Robustness/provenance:** Keep the existing backend-generated trend-window, caveat, outlook, evidence-grade, and progressive-disclosure sections only when backed by the returned real Case File response.
6. **Exports:** Export the actual rows used, QA exclusions, transformations, methods, statistics, and provenance. Never export placeholder rows or stale values from an earlier request.

## 7. Implementation boundaries and verification

- The backend scientific pipeline is the authoritative source for Case File statistics; the frontend is responsible for truthful, gap-aware controls, explicit user-triggered requests, and showing only the selected results.
- Extend the response/schema with only the observed analysis series and method outputs needed by the page. Validate types at the API boundary, propagate HTTP/provider failures, and cancel stale requests.
- Remove the local deterministic synthetic series generator, hard-coded benchmark outputs, fabricated graph points, and synthetic offline Case File fallback from the page's execution path.
- Verify with focused scientific tests: constant series; increasing/decreasing trend; ties; seasonal cycle with no trend; positive serial dependence; missing months; insufficient record; known step change; p-value/CI consistency; and timestamps with gaps. Confirm no-result and API-failure states show no chart or fabricated significance.
- Run backend unit tests and the frontend production build/type check after implementation. Document any method that remains unavailable rather than silently substituting another calculation.
