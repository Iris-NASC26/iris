# Anomaly Review (Standardized Residual Z-Scores)

The **Anomaly Review** method identifies extreme positive and negative departures from the seasonal baseline without deleting or censoring observations from trend inference.

> **Workspace location:** `Workspace → Data Analysis → Anomaly review`

---

## 1. What This Method Does

Raw environmental observations combine a recurring seasonal cycle with transient weather/climate anomalies and long-term change. After subtracting the seasonal component \( S_i \), the deseasonalized residual \( d_i = y_i - S_i \) measures how unusual each observation is relative to its expected seasonal value.

Iris standardizes these departures into dimensionless **anomaly \(z\)-scores**:

- **Standard Deviation Mode (`std`)**:
  \[
  z_i = \frac{d_i - \bar{d}}{s_d}
  \]
  where \( \bar{d} \) is the sample mean and \( s_d \) is the sample standard deviation of the valid deseasonalized residuals.

- **Robust MAD Mode (`mad`)**:
  \[
  z_i = \frac{0.6745 \left(d_i - \operatorname{median}(d)\right)}{\operatorname{MAD}(d)}, \qquad \operatorname{MAD}(d) = \operatorname{median}\!\left(|d - \operatorname{median}(d)|\right)
  \]
  which prevents a single extreme event from inflating the denominator and masking secondary anomalies.

Any timestamp satisfying \( |z_i| \ge z_{\text{threshold}} \) (default `2.0`, corresponding to the outer ~4.5% of a normal distribution) is flagged for scientific review.

---

## 2. Step-by-Step Pipeline Execution

1. **Seasonal Baseline Subtraction**  
   Computes \( d_i = y_i - S_i \) for all QA-valid observations using the active seasonal treatment.
2. **Standardization**  
   Calculates \( z_i \) across all valid timestamps using either classical standard deviation (`std`) or robust median absolute deviation (`mad`).
3. **Threshold Screening & Ranking**  
   Flags all records where \( |z_i| \ge z_{\text{threshold}} \) while preserving all valid points in trend calculations.

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Anomaly \(|z|\) threshold** | `1.5`, `2.0`, `2.5`, `3.0` | `2.0` | Controls how many standard deviations from the seasonal baseline are required to flag an observation as an anomaly. |
| **Dispersion estimator** | `Standard Deviation (SD)` / `Robust MAD` | `Standard Deviation (SD)` | Selects classical \(z\)-score scaling or outlier-resistant Median Absolute Deviation scaling. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Daily / 8-Day / 16-Day** | ✅ Compatible | Flags extreme weather spikes, heatwaves, or heavy precipitation days. |
| **Monthly** | ✅ Compatible | Identifies anomalous climate months (e.g., ENSO peaks, severe drought months). |
| **Seasonal / Yearly** | ✅ Compatible | Flags extreme multi-month seasons or calendar years. |

---

## 5. Interpreting the Output Section

The **Anomaly Review** section displays:
- **Standardized Anomaly Stem & Barcode Chart**: Plots \( z_i \) for every timestamp with horizontal threshold lines at \( \pm z_{\text{threshold}} \) and direct value callouts on the most extreme positive and negative anomalies. Downloadable as a PNG image.
- **Detected Anomalies Table**: Lists every flagged timestamp with its exact raw value, seasonal baseline, deseasonalized departure, and \( z \)-score.
