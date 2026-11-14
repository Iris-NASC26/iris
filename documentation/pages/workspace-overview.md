# Workspace Overview

The Iris workspace is the analytical dashboard where all investigation work happens. It is accessible at `/workspace` and uses a persistent left sidebar for navigation.

---

## Layout

```
┌──────────────┬──────────────────────────────────────────────┐
│              │  Top bar: active dataset, region, job ID     │
│   Sidebar    ├──────────────────────────────────────────────┤
│              │                                              │
│  Navigation  │          Main content area                   │
│  groups      │          (changes per page)                  │
│              │                                              │
│  Theme /     │                                              │
│  Docs footer │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**The sidebar** can be collapsed to icons-only mode using the chevron button at the top. On mobile, it opens as a drawer.

**The top bar** shows context about the active investigation: the current dataset code, the selected region, and a unique job ID when a data extraction is active.

---

## The two investigation tracks

Iris provides two parallel investigation workflows that share the same statistical engine.

### Track A — Live Ad-Hoc Discovery

For custom, user-directed investigations using live data from NASA and NOAA.

```
System Intelligence
       ↓
Data Selection
       ↓
Data Preview
       ↓
Data Analysis (Case File)
```

Use this track when you want to investigate a specific region, variable, or time window that may not be in the pre-computed Global Trend Cube.

---

### Track B — Global Evidence Cube

For instant exploration of pre-computed global trend maps covering 1981–2025.

```
Living Globe
     ↓
Data Analysis (Case File)
```

Use this track to explore pre-computed global trends and open selected locations in detailed case files.

---

## Workspace sections

### 🤖 System Intelligence
*Entry point for Track A.*

A natural language interface that translates your investigation question into structured data catalog searches across NASA CMR, POWER, AppEEARS, and other providers.

[Learn more →](#system-intelligence)

---

### 📊 Data Selection
*Step 2 of Track A.*

Configure your extraction parameters: dataset, time window, spatial extent, cadence, and aggregation method. Includes an interactive map for spatial selection.

[Learn more →](#data-selection)

---

### 👁️ Data Preview
*Step 3 of Track A.*

Inspect the extracted time-series before analysis. Shows a gap-aware chart, quality KPIs, a footprint map, and allows CSV/JSON export of raw observations.

[Learn more →](#data-preview)

---

### 📈 Data Analysis (Case File)
*The shared scientific analysis engine for both tracks.*

Runs the full statistical pipeline: STL seasonal decomposition, Mann-Kendall trend test, Sen's slope, change-point detection, and anomaly identification. Produces a complete, exportable Case File.

[Learn more →](#visualize)

---

### 🌐 Living Globe
*Entry point for Track B.*

A 3D interactive globe showing pre-computed trend direction and significance for every 0.5° × 0.5° grid cell on Earth across six core climate variables.

[Learn more →](#globe)

---

### 📋 Case Studies
Pre-built, guided investigations that demonstrate how Iris works. Each case study is based on real data and walks through the full evidence trail for a known environmental event or trend.

[Learn more →](#case-studies)

---

### 📄 Existing Research
Connects the active dataset to published peer-reviewed literature, NASA technical reports, and IPCC references relevant to the variable and region under investigation.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `[` / `]` | Collapse / expand sidebar |
| `Escape` | Close mobile navigation drawer |

---

## Context chip (top bar)

The top bar shows three pieces of active context:

- **Dataset code** — the short identifier for the currently loaded dataset (e.g., `T2M` for near-surface temperature)
- **Region** — the name or coordinates of the active spatial selection
- **Job ID** — appears when a data extraction result is loaded; this is a unique immutable ID that can be used to reload the same extraction later

---

## Sidebar footer

The sidebar footer contains three persistent controls:

- **Replay tour** — reopens the onboarding walkthrough
- **Documentation** — opens this documentation in a new tab
- **Theme toggle** — switches between light and dark mode
