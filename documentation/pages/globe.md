# Living Globe

The **Living Globe** is Iris's 3D interactive global visualization — an entry point for the Track B investigation workflow. It renders pre-computed trend results for every 0.5° × 0.5° grid cell on Earth across six core climate variables.

> Navigate to it via: **Workspace → Living Globe** in the left sidebar.

---

## What the globe shows

The Living Globe displays the **Global Trend Cube** — a pre-computed dataset covering monthly observations from **1981 to 2025** (45 years, 540 monthly time slices) for six core Earth system variables:

| Variable | Units | Color palette |
|---|---|---|
| Near-surface Air Temperature (2m) | °C/decade | Blue → Red (Coolwarm) |
| Total Precipitation Rate | mm/day/decade | Brown → Teal |
| Topsoil Moisture Index (0–5cm) | index/decade | Yellow → Blue |
| Vegetation Index (NDVI) | index/decade | Pink → Green |
| Solar Radiation (Downward) | kWh/m²/day/decade | Purple → Gold |
| Relative Humidity (2m) | %/decade | Orange → Purple |

Colors show the **decadal rate of change** (Sen's slope) for each grid cell. The palette is centered at zero — cells showing no significant change appear neutral, warming cells appear red-toned, and cooling cells appear blue-toned (for temperature).

---

## Navigating the globe

**Rotation:** Click and drag to rotate the globe freely.

**Zoom:** Scroll or pinch to zoom in and out. At high zoom, individual 0.5° grid cells become visible.

**Layer selector:** Choose which variable to display using the layer panel on the right side of the screen.

---

## Significance filter

By default, the globe shows trend rates for all grid cells regardless of statistical significance. Toggle the **"Show only significant trends"** filter to mask cells where the Benjamini-Hochberg FDR q-value > 0.05.

This filter is useful for identifying regions where the trend evidence is robust enough to be confident — filtering reduces visual noise from cells where apparent trends could be due to random variability.

---

## Time-lapse mode

The **Time-lapse controller** animates the globe through the available record from 1981 to 2025, showing anomaly maps for each year. Use this to visualize how conditions have evolved over time and identify periods of sudden change.

Controls:
- **Play / Pause** — start or stop the animation
- **Speed** — adjust animation speed
- **Year scrubber** — jump to a specific year

---

## Dipole mode

**Opposite-Trends Dipole Mode** automatically identifies pairs of regions with strongly opposite trend directions — for example, areas warming rapidly while nearby areas cool, or one region drying while another wets.

These dipole patterns may reflect physical teleconnections: large-scale atmospheric circulation patterns that link distant parts of the climate system. Iris identifies them algorithmically but does not interpret causation.

---

## Cell inspector

Click any grid cell to open the **Cell Inspector** tooltip showing:

- Geographic coordinates of the cell centroid
- Sen's slope value (rate per decade)
- Mann-Kendall p-value and BH FDR q-value
- Evidence grade (A–D)
- 45-year baseline mean and standard deviation
- An **"Open in Case Board"** button that loads this cell's region into the Regional Case Board for a full multi-variable scan

---

## From globe to investigation

The Living Globe is a discovery tool. When you find a region of interest:

1. Click the cell to open the Cell Inspector
2. Click **"Open in Case Board"** to see all six variables for that region simultaneously
3. From the Case Board, click any variable to open its full Case File analysis in Plot & Visualize
