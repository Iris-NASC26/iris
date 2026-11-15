# Seasonal Kendall Trend Test

The **Seasonal Kendall Test** (Hirsch, Slack, & Smith, 1982) tests for a consistent monotonic trend across years while explicitly controlling for recurring seasonal cycles by comparing **only matching calendar months** (e.g., January vs. January, July vs. July).

> **Workspace location:** `Workspace → Data Analysis → Seasonal Kendall`

---

## 1. What This Method Does

Environmental variables such as precipitation, snow cover, and vegetation greenness (NDVI) often have different variances and distributions in winter versus summer. Instead of subtracting an average seasonal cycle and pooling all months together, the Seasonal Kendall test partitions the record into \( m = 1, \dots, 12 \) separate monthly sub-series and computes the Mann–Kendall score \( S_m \) and variance \( \operatorname{Var}(S_m) \) within each calendar month independently:

\[
S_{\text{SK}} = \sum_{m=1}^{12} S_m, \qquad \operatorname{Var}(S_{\text{SK}}) = \sum_{m=1}^{12} \operatorname{Var}(S_m)
\]

Because January values are only ever compared with other January values, seasonal phase differences cannot create spurious trends.

---

## 2. Step-by-Step Pipeline Execution

1. **Monthly Grouping**  
   Valid observations from the time series are grouped by calendar month (`Jan` through `Dec`).
2. **Minimum Repeat Verification**  
   Each calendar month is checked against the **Minimum years per month** parameter. Months with fewer valid years than required are excluded from the seasonal sum.
3. **Within-Month Mann–Kendall & Sen's Slope**  
   For each qualifying month \( m \), Iris computes the within-month Mann–Kendall statistic \( S_m \), tie-corrected variance \( \operatorname{Var}(S_m) \), within-month \( p \)-value, and month-specific decadal Sen's slope.
4. **Global Seasonal Aggregation**  
   The overall test statistic \( Z_{\text{SK}} \) and two-sided \( p \)-value are computed from \( S_{\text{SK}} \) and \( \operatorname{Var}(S_{\text{SK}}) \).

---

## 3. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Significance level (\(\alpha\))** | `0.01`, `0.05`, `0.10` | `0.05` | Threshold used to mark both overall and individual monthly trends as significant. |
| **Minimum years per month** | `2` to `10` years | `2` | Minimum number of valid yearly observations required in a calendar month for that month to be included in the Seasonal Kendall test. |

---

## 4. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Monthly** | ✅ Compatible | **Required** — requires a Monthly series spanning at least 2 years (\(\ge 12\) observations with repeated months). |
| **Daily / 8-Day / 16-Day** | ❌ Incompatible | Sub-monthly cadences do not align to 12 calendar-month blocks; resample or extract at `Monthly` cadence first. |
| **Seasonal / Yearly** | ❌ Incompatible | Annual data has no intra-annual calendar months to compare. |

---

## 5. Interpreting the Output Section

The **Seasonal Kendall** section displays:
- **Overall Seasonal Concordance Summary**: Reports \( Z_{\text{SK}} \), two-sided \( p \)-value, number of contributing calendar months, and dominant warming/wetting or cooling/drying season.
- **12-Month Trend Contribution Chart**: Visualizes the decadal slope and significance for each calendar month (`Jan`–`Dec`) with exact numerical values and PNG image download.
