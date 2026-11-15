# Dashboard & Investigative Workspace

The Iris workspace (accessible at `/workspace`, with `/dashboard` providing a legacy redirect) is the operating surface for a full Earth investigation. It is not a single screen; it is a coordinated analytical suite that moves from question to evidence to explanation.

## What the workspace is for

The workspace brings together:

- a natural-language discovery layer (Super Intelligence)
- dataset configuration and provenance controls
- data preview and quality checks
- statistical analysis and evidence scoring (Case File)
- visualization and export workflows
- global 3D/2D spatial field rendering (Living Globe)
- short-term precipitation ensembles (Forecasts)
- forensic disaster evidence timelines (Hazards)
- research and literature linkage (OpenAlex / DataCite)

This means a single investigation can start as a plain-language question and end as a reproducible Earth system case file.

## Core user flow

1. Ask a question in the conversational intelligence panel
2. Choose a candidate dataset and set the extraction window
3. Review the raw observations and QA diagnostics
4. Run statistical analysis and generate an immutable Case File
5. Share or export the evidence trail for the final interpretation

## Layout model

The workspace is structured as a left-side operational flow with active panels. The user has a persistent context: the currently selected dataset, selected region, time horizon, and analysis method.

| Area | Route | Responsibility | Typical output |
|---|---|---|---|
| Super Intelligence | `/workspace/intelligence` | Query to product discovery | Ranked dataset candidates |
| Data Selection | `/workspace/data-selection` | Temporal, spatial, and variable settings | Extraction configuration |
| Data Preview | `/workspace/data-preview` | Raw observation quality checks | Time-series preview and table |
| Data Analysis | `/workspace/data-analysis` | Scientific interpretation | Trend, anomalies, evidence report |
| Plot & Visualize | `/workspace/visualize` | Charting and study exploration | Figures, exports, comparisons |
| Living Globe | `/workspace/globe` | Spatial field exploration | 3D/2D gridded NASA POWER fields |
| Case Studies | `/workspace/case-studies` | Pre-built investigations | Solved case files & checkpoints |
| Forecasts | `/workspace/data-analysis?forecastId=...` | Future precipitation outlook | 51-member ECMWF ensemble curves |
| Hazards | `/workspace/case-studies/[caseId]` | Disaster evidence | Official timelines & rainfall |
| Existing Research | `/workspace/research` | Literature context | Scholarly citations & Open Access |

## Operating principles

- Everything is evidence-first.
- The user sees data provenance, not hidden summaries.
- Statistical tests are deterministic and auditable.
- The interface is designed to be understandable to non-specialists without losing research rigor.

## Typical use cases

- Investigating warming or drying in a region
- Testing whether a vegetation signal has strengthened over time
- Comparing a local climate trend against a known evidence record
- Exporting a report for classroom, newsroom, or research workflows

The dashboard is the main instrument panel for the project: it is how the public-facing mission becomes a scientific workflow.
