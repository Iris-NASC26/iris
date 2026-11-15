# Pettitt Change-Point Screen

The **Pettitt (1979) Change-Point Test** is a non-parametric diagnostic that scans a time series for a single structural breakpoint (step change in the central tendency) without prior knowledge of when the shift occurred.

> **Workspace location:** `Workspace → Data Analysis → Change-point screen`

---

## 1. What This Method Does

Linear trend tests assume gradual change over time. However, real-world Earth observation records frequently contain **abrupt regime shifts** caused by:
- Large-scale climate mode transitions (e.g., Pacific Decadal Oscillation shifts, multi-year drought onset)
- Land-use changes (e.g., reservoir impoundment, deforestation, wildfire)
- Satellite sensor transitions or reprocessing boundaries

Pettitt's test adapts the rank-based Mann–Whitney two-sample statistic \( U_{t,n} \) to test every candidate split point \( t \) across the series of length \( n \):

\[
U_{t,n} = 2 W_t - t(n + 1), \qquad W_t = \sum_{i=1}^{t} R_i
\]

where \( R_i \) is the rank of the \( i \)-th deseasonalized observation. The candidate change-point \( t^* \) is the timestamp that maximizes \( |U_{t,n}| \):

\[
K_T = \max_{1 \le t < n} |U_{t,n}|
\]

And its approximate two-sided significance probability is:

\[
p \approx 2 \exp\!\left( \frac{-6 K_T^2}{n^3 + n^2} \right)
\]

---

## 2. Step-by-Step Pipeline Execution

1. **Seasonal Removal & Ranking**  
   Valid deseasonalized observations are ranked from \( 1 \) to \( n \).
2. **Boundary Guard (`min_segment_length`)**  
   To prevent noisy edge effects at the very beginning or end of the record, candidate split indices within `min_segment_length` observations of either endpoint are excluded when locating \( K_T \).
3. **Full \(U_{t,n}\) Profile & Step Shift Quantification**  
   Iris computes the complete \( U_{t,n} \) curve across all timestamps, identifies the peak candidate breakpoint \( t^* \), and calculates the pre-change mean \( \mu_{\text{before}} \) and post-change mean \( \mu_{\text{after}} \) to quantify the physical step magnitude \( \Delta = \mu_{\text{after}} - \mu_{\text{before}} \).

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Significance level (\(\alpha\))** | `0.01`, `0.05`, `0.10` | `0.05` | Sets the threshold for classifying a candidate breakpoint as statistically significant. |
| **Minimum segment length** | `3` to `24` observations | `6` | Minimum number of valid observations required before and after a candidate breakpoint. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Daily / 8-Day / 16-Day** | ✅ Compatible | Requires at least \(\ge 10\) valid observations (and \( 2 \times \text{min\_segment} \)). |
| **Monthly** | ✅ Compatible | Ideal for detecting climate regime shifts and sensor calibration boundaries. |
| **Seasonal / Yearly** | ✅ Compatible | Requires \(\ge 10\) valid observations. |

---

## 5. Interpreting the Output Section

The **Pettitt Change-Point Screen** section displays:
- **Regime-Shift & \(U_t\) Diagnostic Chart**: Plots the observed/deseasonalized series with a vertical breakpoint marker at \( t^* \), horizontal regime mean lines before and after \( t^* \), and the normalized \( |U_t| \) curve. Downloadable as a PNG image.
- **Caution Note**: A statistically significant Pettitt breakpoint is a diagnostic cue—always cross-check against the **Caveat Registry** to verify whether the date coincides with a satellite sensor transition.
