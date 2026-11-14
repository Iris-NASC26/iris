# Regional Case Board

The **Regional Case Board** provides an instant multi-variable environmental health scan for any geographic region. It is Step 2 in the Track B workflow, reached from the Living Globe or directly from the sidebar.

> Navigate to it via: **Workspace → Regional Case Board** in the left sidebar.

---

## What it does

Where the Living Globe shows one variable at a time across the whole planet, the Case Board shows **all six core climate variables simultaneously** for one specific region — giving you an immediate picture of the environmental health of that area.

For each variable, the Case Board shows:
- The decadal trend rate (Sen's slope)
- Statistical significance (Mann-Kendall p-value)
- Evidence grade (A–D)
- Trend direction (warming, cooling, drying, wetting, greening, browning)

---

## Selecting a region

The Case Board accepts any spatial selection compatible with the Global Trend Cube:

- **Click on the Living Globe** — clicking a cell automatically loads it into the Case Board
- **Region name** — type a region name (country, basin, climate zone) in the search field
- **Coordinates** — enter a bounding box in decimal degrees
- **Preset regions** — use the dropdown of pre-defined study areas

The region is aggregated using the same spatial averaging as the rest of the cube (area-weighted mean of all grid cells within the boundary).

---

## Reading the evidence grid

The Case Board displays a card for each of the six core variables. Each card shows:

**Trend direction badge**
- 🔴 **Increasing** — the variable has a statistically significant upward trend
- 🔵 **Decreasing** — statistically significant downward trend
- ⚪ **Stable / Inconclusive** — the trend does not exceed the significance threshold

**Key numbers**
- Sen's slope rate per decade (in the variable's native units)
- p-value from the Hamed-Rao autocorrelation-corrected Mann-Kendall test
- BH FDR q-value (multiple comparison correction)

**Evidence grade badge** (A through D)

**Mini time-series chart** — a small sparkline showing the 45-year record for that variable and region

---

## Evidence grades in the Case Board

The Case Board uses the same A–D Evidence Grade system as individual Case Files:

| Grade | Meaning in context |
|---|---|
| **A** | Robust result — 30+ years, high completeness, strong significance |
| **B** | Reliable — 20+ years, good completeness, significant |
| **C** | Preliminary — 10+ years or moderate significance |
| **D** | Low confidence — short record, high missingness, or marginal result |

If a variable has insufficient data for a region (e.g., NDVI for ocean cells), the card is shown in a "not applicable" state.

---

## Comparing two regions

The Case Board supports **side-by-side comparison** of two geographic regions:

1. Click **"Compare region"** to add a second region selector
2. Choose a second region (by name, coordinates, or preset)
3. All six variable cards expand to show both regions' trends side by side

Comparison is useful for:
- Detecting asymmetric patterns (e.g., one basin warming while a neighboring one cools)
- Investigating potential teleconnections
- Comparing urban vs. rural areas

---

## From Case Board to Case File

Click **"Open full analysis"** on any variable card to open the complete **Plot & Visualize Case File** for that variable and region. The Case File includes the full time-series chart, anomaly panel, statistical summary, and provenance record.
