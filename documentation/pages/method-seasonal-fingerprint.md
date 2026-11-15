# Seasonal Fingerprint (Year-by-Month Matrix & Monthly Slopes)

The **Seasonal Fingerprint** method decomposes a monthly time series into a two-dimensional **Year × Calendar Month** anomaly matrix and estimates separate trend rates for each of the 12 calendar months (`Jan`–`Dec`).

> **Workspace location:** `Workspace → Data Analysis → Seasonal fingerprint`

---

## 1. What This Method Does

An annual or overall trend rate can hide critical seasonal asymmetries. For example:
- Nighttime or winter temperatures may be warming twice as fast as summer temperatures
- Dry-season soil moisture may be declining sharply while wet-season peaks remain stable
- Snowpack loss may be concentrated in spring melt months (`Apr`–`Jun`)

The Seasonal Fingerprint constructs:
1. **Year × Month Anomaly Heatmap**: Every cell \((Y, M)\) displays the exact observation and standardized anomaly \( z \)-score for year \( Y \) and calendar month \( M \in \{\text{Jan}, \dots, \text{Dec}\} \).
2. **12-Month Climatology & Slope Profile**: For each calendar month \( m = 1, \dots, 12 \), Iris computes the long-term climatological mean, the within-month decadal **Sen's slope**, the within-month **Hamed–Rao Mann–Kendall \( p \)-value**, and the percentage contribution of month \( m \) to total seasonal change.

---

## 2. Step-by-Step Pipeline Execution

1. **Calendar Grid Alignment**  
   Valid monthly observations are mapped into a strict `[Year × 12 Months]` matrix. Missing or QA-flagged months are left explicitly blank—never interpolated across adjacent months.
2. **Month-Specific Trend Estimation**  
   For each month with at least 4 valid years, Iris computes the exact elapsed-time Theil–Sen decadal slope; for months with at least 6 valid years, Iris also computes the Hamed–Rao Mann–Kendall \( p \)-value.
3. **Color Scale Normalization**  
   Anomaly \( z \)-scores are mapped to a diverging blue-neutral-red color ramp centered at `0.0` and capped at \( \pm z_{\text{cap}} \).

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Monthly significance (\(\alpha\))** | `0.01`, `0.05`, `0.10` | `0.05` | Highlights individual calendar months whose trend passes \( p < \alpha \). |
| **Heatmap \(|z|\) saturation cap** | `2.0`, `2.5`, `3.0` | `2.5` | Sets the \(|z|\)-score value at which the diverging heatmap color reaches full saturation. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Monthly** | ✅ Compatible | **Required** — constructs a 12-month (`Jan`–`Dec`) calendar matrix across years. |
| **Daily / 8-Day / 16-Day** | ❌ Incompatible | Sub-monthly series contain 30–365 points per year and cannot be mapped 1-to-1 into a 12-column monthly cell grid without resampling to `Monthly` first. |
| **Seasonal / Yearly** | ❌ Incompatible | Yearly series contain only 1 value per year and do not resolve the 12 calendar months. |

---

## 5. Interpreting the Output Section

The **Seasonal Fingerprint** section provides:
- **Interactive & Downloadable Year × Month SVG Heatmap**: Displays both color-coded anomaly intensity and exact numerical cell values (toggleable between `Z-score` and physical `Value`), complete with a calibrated scale bar and PNG image export.
- **12-Month Slope & Climatology Cards**: Shows each calendar month's mean, decadal Sen's slope, \( p \)-value, and contribution share.
