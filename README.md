# Project Iris — Earth System Trend Detective

**NASA International Space Apps Challenge 2026 — "Be An Earth System Trend Detective!"**

Project Iris is an interactive, AI-guided geospatial investigation platform built with **Next.js (App Router, React 19, TypeScript, Tailwind CSS v4)** and a decoupled **Python FastAPI** statistical middleware layer.

## Architecture & Routes

### Public Website
- `/` — Landing page with interactive workbench preview, capabilities, signal demo, methodology overview, data catalog teaser, and featured case cards.
- `/platform` — End-to-end investigation workflow and platform capabilities.
- `/methodology` — 5-stage scientific evidence pipeline, Mann–Kendall & Sen's slope formulas, and interactive FAQ.
- `/data` — Searchable and category-filterable GCMD Earth observation catalog.
- `/case-studies` — Featured investigation (`IR–042`) and filterable public case library.
- `/about` — Mission manifesto, principles, and target investigators.

### Investigative Workspace (`/workspace/*`)
- `/workspace/intelligence` — **System Intelligence**: Natural-language query and AI Headline Clue Matcher routing questions to GCMD datasets.
- `/workspace/data-preview` — **Data Preview**: Variable Flashcard, spatial bounding-box slice, quality summary, and filterable monthly observation table.
- `/workspace/visualize` — **Plot & Visualize**: Detective Wizard, Region Selector map, 3-way One-Click Seasonal Cycle Stripper (*Raw signal*, *Seasonal cycle*, *Deseasonalized anomaly*), Mann–Kendall & Sen's slope metrics, Seesaw Dipole Finder, Significance Horizon Predictor, and CSV/PNG/Report exports.
- `/workspace/case-studies` — **Curated Solved Case Files**: Instant-loading benchmark investigations (`IR–042`, `IR–038`, `IR–031`, `IR–024`).
- `/workspace/research` — **Existing Research**: Dataset-matched peer-reviewed literature with search, topic filtering, and citation copying.
- `/workspace/advanced` — **Custom Code Sandbox**: Interactive Python/Pandas transformation preview environment.

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
