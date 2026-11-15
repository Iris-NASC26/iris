# Linear Trend · Ordinary Least Squares (OLS) t-Test

The **Ordinary Least Squares (OLS) Linear Trend** method estimates a parametric, straight-line rate of change across an environmental time series and tests whether the slope is statistically distinguishable from zero after accounting for serial autocorrelation.

> **Workspace location:** `Workspace → Data Analysis → Linear trend · OLS t-test`

---

## 1. What This Method Does

Given a time series of valid observations \( y_1, y_2, \dots, y_n \) recorded at elapsed calendar times \( t_1, t_2, \dots, t_n \) (measured in fractional years from the start of the record), OLS fits the linear model:

\[
y_i = \beta_0 + \beta_1 t_i + \varepsilon_i
\]

where:
- \( \beta_0 \) is the intercept at the start of the analysis window
- \( \beta_1 \) is the annual rate of change (scaled by \( \times 10 \) to report the **decadal slope** in physical units per decade)
- \( \varepsilon_i \) is the residual departure after seasonal treatment

---

## 2. Step-by-Step Pipeline Execution

When you run **Linear trend · OLS t-test** in Iris, the scientific pipeline executes the following steps:

1. **QA Filtering & Gap Preservation**  
   All observations flagged as `Missing` or `Flagged` by the upstream provider are excluded from regression without synthetic gap interpolation.
2. **Seasonal Pre-Treatment**  
   Depending on your selected **Seasonal treatment** (`Automatic`, `Robust STL`, `Calendar-month climatology`, or `No seasonal adjustment`), the recurring seasonal cycle \( S_i \) is subtracted so that intra-annual cycles do not bias the slope estimate when records start or end in different seasons.
3. **Closed-Form Least Squares Estimation**  
   The slope \( \hat{\beta}_1 \), intercept \( \hat{\beta}_0 \), coefficient of determination \( R^2 \), and unadjusted standard error \( \text{SE}(\hat{\beta}_1) \) are computed over exact elapsed calendar timestamps.
4. **Autocorrelation-Adjusted Degrees of Freedom (\( n_{\text{eff}} \))**  
   Because climate and satellite time series exhibit positive lag-1 serial correlation, treating all \( n \) observations as independent underestimates the true standard error. When **Autocorrelation DF adjustment** is enabled (default), Iris scales the residual degrees of freedom using the effective sample size \( n_{\text{eff}} \):
   \[
   df_{\text{adj}} = \max\!\left(1,\; \min(n - 2,\; n_{\text{eff}} - 2)\right)
   \]
   \[
   \text{SE}_{\text{adj}}(\hat{\beta}_1) = \text{SE}(\hat{\beta}_1) \sqrt{\frac{n - 2}{df_{\text{adj}}}}
   \]
5. **Two-Sided Student's t-Test & Confidence Interval**  
   The test statistic \( t = \hat{\beta}_1 / \text{SE}_{\text{adj}}(\hat{\beta}_1) \) is evaluated against a Student's \( t \)-distribution with \( df_{\text{adj}} \) degrees of freedom to obtain the two-sided \( p \)-value and the \((1 - \alpha)\) confidence interval.

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Significance level (\(\alpha\))** | `0.01` (99% CI), `0.05` (95% CI), `0.10` (90% CI) | `0.05` | Sets the hypothesis test rejection threshold (\( p < \alpha \)) and the width of the slope confidence interval. |
| **Autocorrelation DF adjustment** | `Enabled (n_eff)` / `Standard (n - 2)` | `Enabled` | Adjusts degrees of freedom and standard error for serial correlation so \( p \)-values are not artificially deflated. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Daily / 8-Day / 16-Day** | ✅ Compatible | Requires at least 6 valid observations. |
| **Monthly** | ✅ Compatible | Recommended cadence; pairs with STL or calendar-month deseasonalization. |
| **Seasonal / Yearly** | ✅ Compatible | Runs directly on annual or seasonal aggregates. |

---

## 5. Interpreting the Output Section

In the right-hand results pane, the **OLS Linear Trend** section displays:
- **Fitted Regression Chart**: Plots the observed/deseasonalized values alongside the fitted OLS line \( \hat{y}(t) \) and its shaded confidence corridor. Downloadable as a high-resolution PNG image.
- **Parametric Metrics Table**: Reports decadal slope (`unit / decade`), annual slope (`unit / year`), \( t \)-statistic, adjusted degrees of freedom \( df \), two-sided \( p \)-value, \( R^2 \), and confidence bounds.
- **Comparison Note**: Compare the OLS slope against **Sen's slope** to check whether extreme outliers or step changes are pulling the parametric line.
