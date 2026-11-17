# Project Iris — Earth System Trend Detective

**NASA International Space Apps Challenge 2026 — "Be An Earth System Trend Detective!"**

Project Iris is an interactive, AI-guided geospatial investigation platform built with **Next.js (App Router, React 19, TypeScript, Tailwind CSS v4)** and a decoupled **Python FastAPI** statistical middleware layer.

## Architecture & Routes

### Public Website
- `/` — Landing page with interactive forecast navigation globe, 4 investigation pathways, 6-step user workflow guide, workbench overview, featured case files & disaster studies, team contributors, and FAQ.
- `/platform` — End-to-end 6-step investigation workflow, Case File workbench showcase, and core platform capabilities.
- `/methodology` — Clear guide to how the platform works, 6-step user investigation workflow, 6 reasons our solution is unique, 8 statistical analysis methods & 4 seasonal adjustments, Evidence Grades (A–D), and 10 connected public data providers.
- `/data` — Searchable and category-filterable catalog of 22 Earth observation & climate variables, 10 connected space and weather providers, and data quality labels.
- `/case-studies` — Featured investigation (`IR–042`), disaster event studies, and filterable public case library.
- `/about` — Mission manifesto, principles, 6 team & research contributors, audience overview, and contact link (`mailto:info@projectiris.earth`).

### Investigative Workspace (`/workspace/*`)
- `/workspace/intelligence` — **Iris Intelligence**: Plain-English search and keyword confirmation across 10 connected public space and weather catalogs.
- `/workspace/data-selection` — **Data Selection**: Configure your study region, date range, and time frequency on an interactive map.
- `/workspace/data-preview` — **Data Preview**: Check data completeness, inspect the gap-aware time-series chart and quality labels, and download CSV/JSON tables.
- `/workspace/data-analysis` — **Data Analysis · Case File**: Remove seasonality and run up to 8 statistical trend and anomaly methods across Explorer, Student, and Scientist explanation modes.
- `/workspace/visualize` — **Data Visualization · Case File**: Multi-panel studio with linked 2D charts, 3D Time Track, 3D Seasonal Landscape, 3D Seasonal Orbit, and multi-location trend comparisons.
- `/workspace/globe` — **Geometric Visualization · Living Globe**: Interactive 3D globe and 2D map displaying 11 monthly global environmental layers and climate benchmark locations.
- `/workspace/forecasts` — **Forecasts**: Short-term environmental outlooks trained on historical observations for any location or region on Earth, with uncertainty ranges and baseline accuracy checks.
- `/workspace/case-studies` — **Case Studies & Disaster Evidence**: Guided multi-decade investigations (`IR–042`, `IR–038`, `IR–031`, `IR–024`) and disaster reconstructions (`Nepal Floods 2024`, `Cyclone Ditwah 2025`).
- `/workspace/research` — **Existing Research**: Connect your active dataset and region to peer-reviewed scientific articles and published dataset citations.

## Getting Started

### Frontend (Next.js)
```bash
pnpm install
pnpm dev
```

### Backend (Optional Decoupled FastAPI Service)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```


## Visualization contribution

The visualization workspace now supports selected SI datasets and locations, multiple chart types, a CesiumJS globe with progressively tiled NASA GIBS imagery (token-free; local NASA image fallback), bounded native NASA POWER spatial fields and a documented global/Europe overview path with cosine-latitude-weighted aggregation, QA-aware tables and provenance exports. The globe view is arranged as a map-centred investigation surface (selection bar, layer tree with keyboard reordering, cell inspector, spatial timeline, field styling) and the landing page carries an illustrative, lazily loaded COBE globe whose study-location markers prefill the workspace — it is navigation, not a data layer. The existing public design and scientific-analysis screen are retained. See [visualization setup, source limits and verification](docs/VISUALIZATION.md).

Use the additive `visualization_app:app` backend entry for spatial fields; it registers the new routes on the existing app without editing its source. The optional pinned setup also supplies the baseline's missing EODAG import dependency. This is raw-data visualization, not a declaration that the global trend cube or statistical release gates are complete.
