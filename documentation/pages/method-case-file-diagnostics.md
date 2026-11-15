# Full Case File Diagnostics (Evidence Grade, Robustness & Outlook)

The **Full Case File Diagnostics** module synthesizes multi-method concordance, sub-window sensitivity (Trend Triangle), annual warming/anomaly stripes, sensor caveats, SHA-256 provenance, and a skill-gated statistical outlook into a complete audit report.

> **Workspace location:** `Workspace → Data Analysis → Full Case File diagnostics`

---

## 1. What This Method Does

A single \( p \)-value or slope is rarely sufficient for scientific decision-making. **Full Case File Diagnostics** evaluates the structural trustworthiness of a time-series investigation across five pillars:

1. **Deterministic Evidence Grade (A–D)**  
   Evaluates record length, valid observation coverage, Hamed–Rao Mann–Kendall significance, parametric/non-parametric concordance (\(\hat{\beta}_{\text{Sen}}\) vs. \(\hat{\beta}_{\text{OLS}}\)), and sensor caveats.
2. **Three-Level Audience Explanations (`Explorer` / `Student` / `Scientist`)**  
   Generates strictly templated, deterministic interpretations where every number comes directly from the verified statistical engine (zero LLM-invented figures).
3. **Annual Anomaly Stripes**  
   Computes annual means and standardized annual anomalies for every calendar year meeting the minimum valid-observations rule (default \(\ge 10\) valid months per year).
4. **Multi-Window Trend Triangle (Sensitivity Matrix)**  
   Tests Sen's slope and Hamed–Rao Mann–Kendall significance across multiple combinations of start year and end year to verify whether the trend persists across sub-windows or is an artifact of isolated endpoint years.
5. **Caveat Registry & Skill-Gated Outlook ("Not a Prediction")**  
   Lists known satellite mission transitions (e.g., MODIS orbital drift, MERRA-2 assimilation boundaries) and runs an 80%/20% train/test hindcast backtest. A short-term statistical projection is shown **only** if the Prediction Skill Score (\(\text{PSS} = 1 - \text{RMSE}_{\text{model}} / \text{RMSE}_{\text{climatology}}\)) exceeds \(+0.05\).

---

## 2. Adjustable Parameters

| Parameter | Options / Range | Default | Effect on Analysis |
|---|---|---|---|
| **Outlook horizon (years)** | `5`, `10`, `15`, `20` years | `10` years | Sets how many years ahead the conditional Sen's slope continuation corridor is evaluated. |
| **Min valid months / year (Stripes)** | `8` to `12` months | `10` months | Minimum valid monthly observations required in a calendar year to include that year in the Annual Anomaly Stripes and hindcast backtest. |
| **Trend Triangle min window** | `5` to `10` years | `5` years | Minimum sub-window span (in years) evaluated in the start/end year sensitivity matrix. |

---

## 3. Dataset Compatibility

| Cadence / Property | Compatibility | Notes |
|---|---|---|
| **Monthly** | ✅ Compatible | Full support for all diagnostic panels (Evidence Grade, Stripes, 12-Month Fingerprint, Trend Triangle, Caveats, and Skill-Gated Outlook). |
| **Daily / 8-Day / 16-Day / Yearly** | ✅ Compatible (Core Audit) | Computes Evidence Grade, Caveats, Multi-Window Robustness, and Outlook; 12-month sub-views adapt to the dataset's native cadence. |

---

## 4. Interpreting the Output Section

The **Full Case File Diagnostics** section renders:
- **Identity & Provenance Header**: Displays the unique Case File ID (`cf-...`), SHA-256 input digest, Evidence Grade badge (`Grade A`–`Grade D`), and one-click **Case File JSON** export.
- **Downloadable Diagnostic Charts**: Both the **Annual Anomaly Stripes** and **Trend Continuation Corridor** charts include exact numerical values and one-click PNG image download buttons.
