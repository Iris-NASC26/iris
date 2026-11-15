# Quick Start Guide

This guide walks you through your first complete investigation in Iris — from asking a question to reading a statistical verdict — in about 5 minutes.

---

## Before you begin

Make sure you have:
- A modern web browser (Chrome, Firefox, Safari, Edge)
- An internet connection (for live data retrieval)

No account or login is required during the current development phase.

---

## Step 1 — Open the workspace

From the Iris home page, click **"Open workspace"** in the top-right corner of the navigation bar.

You will land in **Data Analysis** by default. The workspace has a sidebar on the left with all available tools. For a fresh investigation, start at the top: **Super Intelligence**.

---

## Step 2 — Describe what you want to investigate

Click **Super Intelligence** in the left sidebar.

You will see a natural language input field. Type a plain-English description of your investigation question. Some examples:

- `Has air temperature increased in Los Angeles over the last 20 years?`
- `Investigate precipitation trends in the Sahel region`
- `Show me vegetation changes in the Amazon Basin since 2000`
- `Is there a warming trend in the Arctic?`

Click **Search** or press `Enter`. Iris will:
1. Parse your query using its AI intent router
2. Search multiple NASA and NOAA data catalogs simultaneously
3. Return a list of relevant datasets with provider details

> **Tip:** Be specific about the region and phenomenon you care about. The more context you provide, the better the dataset matches will be.

---

## Step 3 — Select a dataset

Review the dataset cards returned by Super Intelligence. Each card shows:

- **Variable name** and physical units
- **Data provider** (e.g., NASA POWER, MODIS, MERRA-2)
- **Temporal coverage** (e.g., 2000–2025)
- **Spatial resolution** (e.g., 0.5° × 0.5°)
- **Extraction readiness** — whether live data retrieval is currently available

Click **"Use this dataset"** on the dataset you want to investigate. You will be taken to **Data Selection**.

---

## Step 4 — Configure your investigation parameters

In **Data Selection**, you configure exactly what data to extract:

**Time window**
Set a start and end date. Use the preset buttons (Last 10 Years, Full Record) for convenience. Iris enforces the dataset's authoritative bounds — you cannot select dates outside the available record.

**Spatial extent**
Choose how to define your study area:
- **Point** — a single latitude/longitude coordinate
- **Bounding Box** — draw a rectangle on the map
- **Preset Region** — choose from pre-defined regions like "Amazon Basin", "Sahel", or "Arctic"
- **Country** — select an entire country

**Cadence**
Choose the temporal frequency: daily, monthly, seasonal, or annual. Monthly is recommended for trend analysis (at least 10 years of monthly data gives the most reliable results).

**Spatial aggregation**
Choose how to summarize the spatial data: mean (average across the region), median (robust to outliers), or preserve the full grid.

When ready, click **"Extract data"** to submit the retrieval request.

---

## Step 5 — Preview the extracted data

You will be taken to **Data Preview** where Iris shows:

- **A time-series chart** of the extracted observations. Missing data gaps appear as shaded regions — they are never silently interpolated.
- **Quality metrics**: total observations, valid count, missingness percentage, mean, standard deviation, min, and max.
- **A footprint map** confirming your selected spatial region.

Review the completeness. If missingness is above 20%, consider a shorter time window or a different dataset.

When satisfied, click **"Proceed to analysis"**.

---

## Step 6 — Read the Case File verdict

**Data Analysis** runs the full statistical pipeline and produces a **Case File** — a complete, reproducible evidence record.

The top of the Case File shows the **detective verdict**:

- **Significant increasing trend** — statistically credible warming/greening/wetting
- **Significant decreasing trend** — credible cooling/browning/drying
- **Inconclusive** — data does not meet the significance threshold

Below the verdict you will find:

| Section | What it shows |
|---|---|
| **Trend charts** | Raw observations alongside the deseasonalized signal and Sen's slope line |
| **Statistical summary** | Mann-Kendall test statistic, p-value, Sen's slope rate, 95% confidence interval |
| **Anomaly panel** | Observations flagged as outside ±2 standard deviations |
| **Evidence grade** | A–D quality rating based on data length, completeness, and statistical robustness |
| **Provenance record** | Full chain of custody from raw NASA data to final verdict |

---

## Congratulations — you've completed your first investigation!

You can now:
- **Export the Case File** as JSON or CSV
- **Share the investigation** via URL
- **Investigate related variables** using the "Next clue" suggestions
- **Explore global trends** using the [Living Globe](#globe)

---

## Common questions

**How long does data extraction take?**
Usually 10–60 seconds depending on the dataset, region size, and time window. Progress is shown in real-time.

**What if no datasets match my query?**
Try rephrasing your question or use a broader term. You can also browse the full data catalog directly in [Data Selection](#data-selection).

**Is the data real?**
Yes. Iris has a strict zero-synthetic-data policy in production. All numbers come from real upstream NASA and NOAA APIs or verified, pinned real data snapshots. Synthetic data is only used in internal test fixtures.
