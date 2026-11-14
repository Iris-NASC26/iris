# Introduction to Iris

<span class="version-badge">📡 Draft · November 2026</span>

**Iris** is an open Earth intelligence platform that lets anyone investigate long-term environmental change using decades of real satellite and climate observations — without needing a background in data science or remote sensing.

Think of Iris as an **Earth system trend detective**: you pose a question ("Has temperature risen in the Amazon over the last 30 years?"), and Iris walks you through a reproducible, statistically rigorous evidence trail from raw data to a defensible verdict.

---

## Who is Iris for?

Iris is designed for anyone who wants to understand environmental change with real data:

- **Students & researchers** who want to explore climate trends for projects, papers, or courses
- **Journalists & analysts** who need defensible evidence for stories about environmental change
- **Educators** who want to demonstrate Earth science concepts with live satellite data
- **Citizens** who want to explore whether their region is warming, drying, or greening

No programming knowledge is required. All statistics are computed automatically and explained in plain language.

---

## What can Iris do?

| Capability | Description |
|---|---|
| **Live data discovery** | Search NASA, MODIS, and NOAA catalogs using plain English |
| **Time-series extraction** | Pull decades of monthly observations for any region on Earth |
| **Trend detection** | Apply robust non-parametric statistics (Mann-Kendall + Sen's slope) |
| **Anomaly detection** | Automatically flag observations outside expected variability |
| **Global evidence cube** | Browse pre-computed trend maps for the entire planet |
| **Case File export** | Download a full provenance record for any investigation |

---

## The core idea: evidence, not scores

Most environmental tools give you a number and ask you to trust it. Iris is different — every conclusion comes with:

1. **Its source data** — which NASA dataset, which provider, which exact time window
2. **The statistical test** — which method was used and why
3. **The uncertainty** — confidence intervals, p-values, and evidence grades
4. **The full evidence trail** — every step from raw observation to final verdict

> Iris never hands you a mysterious score. If the evidence is inconclusive, it says so.

---

## How the website is structured

The Iris website has two main areas:

### Marketing / Information pages
Accessible from the top navigation bar:

| Page | Purpose |
|---|---|
| **Home (`/`)** | Introduction to the platform and its capabilities |
| **Platform** | Detailed feature overview |
| **Methodology** | Full scientific methodology and statistical methods |
| **Data** | Browse available Earth observation variables |
| **Case Studies** | Pre-built example investigations |
| **About** | Project background and mission |

### Workspace (`/workspace`)
The analytical dashboard where investigations happen. Accessed via "Open workspace" in the navbar.

---

## Two investigation tracks

Iris provides two complementary ways to investigate Earth system trends:

**Track A — Live Ad-Hoc Discovery**
You ask a question → Iris searches live NASA and NOAA catalogs → You select data → Iris extracts and analyzes it. Best for custom regions, time windows, or variables.

**Track B — Global Trend Cube**
Browse pre-computed trend results covering the entire planet from 1981 to 2025. Instantly see which regions are warming, drying, or losing vegetation. Best for global exploration and comparisons.

Both tracks feed into the same **Scientific Analysis Engine** that applies identical statistical rigor to all results.

---

## Next steps

- Read the **[Quick Start Guide](#quick-start)** to run your first investigation in 5 minutes
- Explore the **[Workspace Overview](#workspace-overview)** to understand all the tools available
- Jump to **[Scientific Methodology](#methodology)** if you want to understand the statistics
