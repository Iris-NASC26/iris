# Mann–Kendall Trend Test (Hamed–Rao Correction)

The **Hamed–Rao (1998) Modified Mann–Kendall Trend Test** is Iris's primary non-parametric hypothesis test for detecting monotonic upward or downward trends in environmental time series with serial autocorrelation.

> **Workspace location:** `Workspace → Data Analysis → Mann–Kendall trend test`

---

## 1. What This Method Does

Unlike parametric linear regression, the Mann–Kendall test makes **no assumption of normality or linearity**. It evaluates whether later observations in a time series tend to be consistently larger or smaller than earlier observations across all \( n(n-1)/2 \) pairwise comparisons:

\[
S = \sum_{i=1}^{n-1} \sum_{j=i+1}^{n} \operatorname{sgn}(x_j - x_i)
\]

where \( \operatorname{sgn}(\Delta) \) is \( +1 \) if \( \Delta > 0 \), \( 0 \) if \( \Delta = 0 \), and \( -1 \) if \( \Delta < 0 \).

---

## 2. Step-by-Step Pipeline Execution

1. **Seasonal Pre-Treatment & QA Filtering**  
   Valid observations are extracted in strict chronological order and deseasonalized using the active seasonal treatment. Missing values are never interpolated.
2. **Pairwise Concordance & Kendall's \(\tau\)**  
   Iris computes the Mann–Kendall score \( S \), applies tie corrections for identical values, and calculates **Kendall's rank correlation coefficient (\(\tau\))**, which ranges from \(-1.0\) (strictly decreasing) to \(+1.0\) (strictly increasing).
3. **Detrended Rank Autocorrelation (\(r_k\))**  
   The series is detrended using the non-parametric Theil–Sen slope, converted to ranks, and the serial rank autocorrelation coefficients \( r_k \) are computed for lags \( k = 1, 2, \dots, L_{\max} \).
4. **Hamed–Rao (1998) Variance Inflation Factor (VIF)**  
   Positive autocorrelation inflates the variance of \( S \). Lags where \( |r_k| > 1.96 / \sqrt{n} \) contribute to the variance correction factor:
   \[
   \text{VIF} = 1 + \frac{2}{n(n-1)(n-2)} \sum_{k=1}^{L_{\max}} (n-k)(n-k-1)(n-k-2)\, r_k
   \]
   \[
   \operatorname{Var}^*(S) = \operatorname{Var}_0(S) \times \text{VIF}, \qquad n_{\text{eff}} = \frac{n}{\max(1, \text{VIF})}
   \]
5. **Standardized \(Z_{\text{HR}}\), \(p\)-value, and BH-FDR \(q\)-value**  
   Continuity-corrected \( Z_{\text{HR}} \) is evaluated under the standard normal distribution to yield the two-sided \( p \)-value, and adjusted across the active test family via the Benjamini–Hochberg False Discovery Rate (BH-FDR) procedure.

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Significance level (\(\alpha\))** | `0.01`, `0.05`, `0.10` | `0.05` | Sets the significance threshold for the monotonic trend verdict. |
| **Autocorrelation mode** | `Hamed–Rao (1998)` / `Classical (Unadjusted)` | `Hamed–Rao (1998)` | Controls whether variance inflation from serial correlation is corrected. |
| **Max autocorrelation lag (\(L_{\max}\))** | `6` to `48` steps | `24` | Maximum lag \( k \) inspected when computing the Hamed–Rao variance inflation sum. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Daily / 8-Day / 16-Day** | ✅ Compatible | Requires \(\ge 6\) valid observations; Hamed–Rao correction is essential for daily persistence. |
| **Monthly** | ✅ Compatible | Standard cadence for climate trend attribution. |
| **Seasonal / Yearly** | ✅ Compatible | Requires \(\ge 6\) valid annual/seasonal points. |

---

## 5. Interpreting the Output Section

The **Mann–Kendall Trend Test** section on the right pane includes:
- **Trend Verdict Banner**: Plain-language statistical conclusion with \( p \)-value, \( Z_{\text{HR}} \), Kendall's \(\tau\), and effective sample size \( n_{\text{eff}} \).
- **Rank Autocorrelation Correlogram Chart**: Bar chart of lag correlations \( r_1 \dots r_{L} \) against the 95% independence bounds \( \pm 1.96/\sqrt{n} \), downloadable as a PNG image.
