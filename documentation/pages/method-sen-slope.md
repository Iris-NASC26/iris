# Sen's Slope Estimator (Theil–Sen Robust Rate)

The **Theil–Sen Estimator (Sen's Slope)** calculates a non-parametric, outlier-resistant rate of change and a rank-based confidence interval across an environmental time series.

> **Workspace location:** `Workspace → Data Analysis → Sen’s slope`

---

## 1. What This Method Does

In environmental records, a single extreme event (such as a major El Niño spike, wildfire smoke event, or flood) can heavily skew an Ordinary Least Squares (OLS) regression line. **Sen's slope** overcomes this by computing the slope between every pair of valid observations \((t_i, y_i)\) and \((t_j, y_j)\) with \( t_j > t_i \):

\[
d_{ij} = \frac{y_j - y_i}{t_j - t_i}, \qquad 1 \le i < j \le n
\]

The Sen's slope estimator \( \hat{\beta}_{\text{Sen}} \) is the **median** of all \( N = n(n-1)/2 \) pairwise slopes:

\[
\hat{\beta}_{\text{Sen}} = \operatorname{median}\!\left(\{ d_{ij} \}\right)
\]

It has a breakdown point of approximately **29.3%**, meaning nearly a third of the observations can be arbitrary outliers without corrupting the trend rate.

---

## 2. Step-by-Step Pipeline Execution

1. **Exact Elapsed-Time Pairwise Slopes**  
   After seasonal adjustment, Iris converts observation timestamps to exact elapsed years \( t_i \) and computes all \( n(n-1)/2 \) pairwise slopes \( d_{ij} \).
2. **Median Slope & Robust Intercept**  
   The median slope \( \hat{\beta}_{\text{Sen}} \) is scaled to your chosen rate unit (`per decade` or `per year`), and the Conover robust median intercept is computed as:
   \[
   \hat{\beta}_0 = \operatorname{median}\!\left(y_i - \hat{\beta}_{\text{Sen}} t_i\right)
   \]
3. **Distribution-Free Confidence Interval**  
   Using the tie-corrected Mann–Kendall variance \( \operatorname{Var}(S) \) and the normal quantile \( z_{1 - \alpha/2} \) corresponding to your selected **Confidence level**, Iris locates the lower and upper order statistics \( M_1, M_2 \) in the sorted pairwise slope array to bound the true rate of change.

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Confidence level** | `90%`, `95%`, `99%` | `95%` | Sets the rank-based confidence interval bounds around Sen's slope. |
| **Rate scaling** | `Per decade (10 yr)` / `Per year (1 yr)` | `Per decade` | Controls whether the slope and confidence bounds are displayed per decade or per year in the section view. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Daily / 8-Day / 16-Day** | ✅ Compatible | Requires \(\ge 6\) valid observations. |
| **Monthly** | ✅ Compatible | Recommended for multi-year climate trend rate estimation. |
| **Seasonal / Yearly** | ✅ Compatible | Works directly on annual or seasonal series. |

---

## 5. Interpreting the Output Section

The **Sen's Slope** section on the right pane displays:
- **Robust Trend & Confidence Corridor Chart**: Plots the deseasonalized series, the Theil–Sen trend line, the upper and lower confidence corridor bounds, and start-to-end cumulative change callouts. Downloadable as a PNG image.
- **Parametric vs. Non-Parametric Concordance Check**: Compares \( \hat{\beta}_{\text{Sen}} \) against \( \hat{\beta}_{\text{OLS}} \) to diagnose outlier leverage.
