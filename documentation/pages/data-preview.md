# Data Preview

The **Data Preview** page lets you inspect your extracted time-series data before running the full statistical analysis. This is a critical quality-assurance step — you should always review the data here before proceeding.

> Navigate to it via: **Workspace → Data Preview**, or automatically after extraction completes.

---

## The time-series chart

The main chart shows your extracted observations plotted over time.

**Key features of the chart:**

- **Gap-aware rendering** — missing data periods appear as shaded bands. Lines are never drawn across gaps to create a false impression of continuous data. What you see is exactly what was retrieved.
- **Hover tooltips** — hover over any point to see the exact date, value, units, and quality flag for that observation.
- **Quality flags** — observations with specific QA issues (cloud contamination, sensor anomalies, fill values) are marked distinctly rather than silently excluded.

---

## Quality KPI cards

Below the chart, six summary statistics describe the extracted dataset:

| Metric | What it means |
|---|---|
| **Total observations** | Number of time steps in the requested window |
| **Valid count** | Observations that passed QA filtering |
| **Missing count** | Observations with no valid data (gaps) |
| **Completeness %** | Valid count ÷ Total observations × 100 |
| **Mean** | Average of all valid observations |
| **Std deviation** | Spread of values — higher means more variable |
| **Min / Max** | Extreme observed values and their dates |

---

## Interpreting completeness

Completeness tells you how much of your requested time window has real data.

| Completeness | Guidance |
|---|---|
| **≥ 90%** | Excellent. Proceed with confidence. |
| **75–90%** | Good. Results are reliable but note gaps in the Case File. |
| **50–75%** | Moderate. Consider whether gaps coincide with the period of interest. |
| **< 50%** | Poor. Consider a different provider, a shorter time window, or a coarser spatial resolution. |

> **Warning alert:** Iris automatically shows a warning if completeness falls below **80%**. This does not prevent analysis, but the evidence grade of the resulting Case File will be lower.

---

## The spatial footprint map

The map confirms the actual spatial extent of the extraction — the region where data was retrieved. Verify that it matches your intended study area.

If the footprint looks wrong (e.g., the region is offset, too large, or too small), go back to **Data Selection** and adjust your spatial parameters.

---

## Tabular data view

Below the chart and map, a paginated, sortable data table shows all extracted observations. Columns include:

- **Date** — the observation timestamp (UTC)
- **Value** — the measured quantity in physical units
- **Unit** — the variable's unit (°C, mm/day, fraction, etc.)
- **QA flag** — data quality indicator from the upstream provider
- **Completeness** — the fraction of source observations that contributed to this aggregated value

---

## Exporting raw data

Before proceeding to analysis, you can export the raw observations:

- **CSV** — standard comma-separated format, suitable for Excel, R, or Python
- **JSON** — structured format with full metadata and provenance included

The export includes all QA flags and provenance metadata, not just the numeric values.

---

## Proceeding to analysis

When you are satisfied with the data quality, click **"Proceed to analysis"**. This passes the extraction job ID to **Data Analysis**, which runs the full statistical pipeline.

The extraction result is **immutable** — it is stored with a unique ID and will produce identical analysis results every time. The job ID shown in the top bar is a reference to this specific result.

---

## When to go back and re-extract

Consider re-extracting if:

- **Completeness is below 75%** — especially if gaps occur in the most recent years, which could bias the trend estimate
- **The chart shows an obvious discontinuity** — a sudden step change that coincides with a known sensor change or reprocessing version, not a real environmental shift
- **The spatial footprint is incorrect** — the data is from the wrong region
- **Values are outside physically plausible bounds** — e.g., air temperature above 60°C or below −90°C for most inhabited regions
