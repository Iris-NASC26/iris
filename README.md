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
- `/workspace/data-analysis` — **Data Analysis**: Scientific Case File, seasonal adjustment, trend and anomaly methods, evidence diagnostics, provenance, and data exports.
- `/workspace/visualize` — **Plot & Visualize**: Placeholder that links to Data Analysis.
- `/workspace/case-studies` — **Curated Solved Case Files**: Instant-loading benchmark investigations (`IR–042`, `IR–038`, `IR–031`, `IR–024`).
- `/workspace/research` — **Existing Research**: Dataset-matched peer-reviewed literature with search, topic filtering, and citation copying.

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
