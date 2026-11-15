# Plot & Visualize

The **Plot & Visualize** studio explores retrieved point time series using coordinated charts and observation tables. Choose datasets through SI or the data drawer, confirm a location and period, then explicitly load observations.

Use **Explore**, **Compare**, or **Seasonal** presets. Resize, dock, close and reopen panels, or use the tabbed layout on a phone. Source values, missing observations and QA information remain available in the table and exports. Outlook and forecasting remain on **Data Analysis**; saved studio layouts cannot restore the removed Outlook panel.

The globe and spatial-field loading belong to **Workspace → Living Globe**. They are not studio panels; older saved globe arrangements recover to a chart-only preset. The first-to-last difference is descriptive and is not an estimated trend.

The complete scientific Case File workflow is available under **Workspace → Data Analysis**. Analysis is explicit, uses the supplied immutable extraction result and preserves method limitations. Display filters and layout changes do not themselves rerun scientific analysis.

---

## Studio Layout & Panel Registry

The Plot & Visualize studio is built on a responsive, dockable tile architecture (powered by Dockview) that allows multi-panel scientific exploration.

```
┌───────────────────────────────────────────────┬────────────────────────────┐
│  Top Main Group:                              │  Side Group:               │
│  - Time Series (2D Line/Area/Bar/Dist + 3D)   │  - Trend Evidence          │
│  - Seasonal Landscape (3D Surface/Cols/Heat)  │  - Trend Intervals (95% CI)│
│  - Seasonal Cycles (3D Orbit / Profile / Heat)│                            │
├───────────────────────────────────────────────┴────────────────────────────┤
│  Bottom Dock / Drawer:                                                     │
│  - Observation Navigator / Playback Scrubber (650 ms loop)                │
│  - Data Controls (Point selection, Cadence, Date filters)                  │
│  - Raw Observations Table & Export (CSV / JSON)                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Registered Studio Panels

1. **Time Series Panel (`timeSeries`)**:
   - Primary 2D temporal visualization supporting Line, Gradient Area, Bar, and Distribution views.
   - Optional **3D Time Track** rendering actual elapsed UTC time along the horizontal axis and physical values along the vertical axis with authentic Three.js geometry.
   - Brush zoom navigator for local temporal sub-selection without triggering pipeline re-extraction.
   - Crosshair inspector displaying exact timestamp, physical value, units, and provider quality flag.

2. **Seasonal Landscape Panel (`landscape`)**:
   - 3D time-by-calendar-month mesh rendering calendar years along one axis and calendar months (Jan–Dec) along the other.
   - Elevation and colour ramp both represent physical values (or calendar-month departures).
   - Display modes: 3D Continuous Surface, 3D Discrete Columns, and 2D Calendar Heatmap.
   - Perspective and orthographic projection toggles, vertical emphasis scaling, and camera reset controls.

3. **Seasonal Cycles Panel (`seasonal`)**:
   - **3D Seasonal Orbit**: Calendar month maps to angle (\(0^\circ\) to \(360^\circ\)), calendar year maps to vertical height, and radial distance maps to physical value.
   - **Seasonal Profile**: Overlays individual historical years against the multi-decadal calendar-month mean and observed min–max envelope.
   - **Year-by-Month Departures**: Heatmap showing departures from the visible period's monthly mean.

4. **Trend Evidence Panel (`trendEvidence`)**:
   - Displays statistical results from completed Data Analysis runs: Hamed–Rao Mann–Kendall Z and p-value, Sen's decadal slope, and parametric OLS regression line.
   - Analysis-adjusted series display: overlays fitted lines only onto seasonally adjusted residuals.

5. **Trend Intervals Panel (`trendIntervals`)**:
   - Multi-location 95% confidence interval comparison chart.
   - Compares Sen's slope intervals across compatible locations (matching variable, units, temporal bounds, and cadence).

---

## Interactive Controls & Playback

- **Time Playback Scrubber**: Steps through retrieved timestamps sequentially every **650 ms**, looping automatically. Highlighting an observation publishes its timestamp across all open views simultaneously (3D landscape, 2D timeline, heatmap, and table).
- **Point Picking**: Clicking any point in 3D orbit, 3D landscape, or 2D timeline selects that exact observation across the entire workspace.
- **Theme Synchronization**: The studio and all 3D canvas renderers automatically synchronize with the global application light/dark theme.
- **Display Transforms**:
  - *Observed values*: Raw physical values in original units (°C, mm/day, W/m², etc.).
  - *Calendar-month departures*: Value minus the multi-year mean of that specific calendar month.
  - *Standardized Z-scores*: Departure divided by sample standard deviation for dimensionless comparison.

---

## Scientific Boundaries & Guardrails

To prevent visual artifacts from being misinterpreted as physical reality, Iris enforces strict scientific display rules:

1. **Gap-Safe Surface Partitioning**: Missing or QA-excluded observations are never bridged by artificial interpolation. Neighboring 4-point quads are partitioned into independent surface patches; if a month is missing, a visible gap remains.
2. **Descriptive vs. Inferential Distinction**: Calendar-month departures in the studio represent descriptive baselines within the visible window, not fixed 30-year WMO climate normals or STL decomposed components.
3. **No Automatic Inference on Filter Changes**: Changing brush zoom, display dates, or QA thresholds updates the visualization but never reruns backend statistical tests.
4. **Rendering Budget**: Scenes are capped at 6,000 active 3D vertices to maintain 60 FPS performance on standard hardware; larger series seamlessly fall back to high-performance 2D canvas views.
5. **Context-Loss Fallback**: If WebGL context is lost or unsupported, Iris gracefully falls back to 2D SVG/Canvas views without data loss.

---

## Use Cases for Plot & Visualize Studio

### Use Case 1: Isolating Phenological Shifts
- **Scenario**: An agricultural researcher investigates whether spring warming is occurring earlier in the Pacific Northwest.
- **Workflow**: Load 30 years of NASA POWER `T2M` monthly observations. Open **Seasonal Cycles → 3D Seasonal Orbit**. Use the year emphasis slider to highlight recent decades (2015–2025) against historical decades (1985–1995). Observe whether March and April points spiral outward earlier in the season.

### Use Case 2: Detecting Inter-Annual Drought Pulses
- **Scenario**: A water resources board needs to visualize multi-year dry spells in the Mediterranean basin.
- **Workflow**: Load root-zone soil wetness (`GWETROOT`). Switch to **Seasonal Landscape → 3D Columns**. Identify multi-year troughs where dry seasons persist across consecutive calendar years.

### Use Case 3: Regional Climate Sensitivity Comparison
- **Scenario**: A graduate student compares temperature trends between urban Los Angeles and rural Central Valley.
- **Workflow**: Run Data Analysis for both locations. Open **Trend Intervals Panel**. Compare the 95% Sen's slope confidence intervals side-by-side to verify whether the urban warming rate significantly exceeds the rural baseline.

---

## API & Data Export Integration

Data displayed in Plot & Visualize can be exported directly from the toolbar:
- **Export Raw Series (CSV)**: ISO-8601 UTC timestamps, values, secondary variables, and provider QA flags.
- **Export Full Session (JSON)**: Complete data array, camera coordinates, display transform settings, and SHA-256 data provenance hashes.
- **Upstream Source Linkage**: Directly references NASA POWER, AppEEARS, or GES DISC endpoints with exact retrieval parameters.
