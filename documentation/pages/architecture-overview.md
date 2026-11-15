# Architecture Overview

Iris is best understood as a layered system: a public-facing web application, a workspace for scientific investigation, and a backend data-and-analysis service that handles live discovery and statistical methods.

## High-level structure

| Layer | Role | Examples |
|---|---|---|
| Frontend | Product experience and user workflows | App Router pages, dashboards, workspace views |
| Workspace | Analytical operations | Intelligence, data selection, analysis, globe |
| Backend API | Live discovery and scientific computation | FastAPI endpoints, provider adapters, analytics services |
| Data providers | Upstream scientific data access | NASA POWER, NASA CMR, AppEEARS, GES DISC, NOAA |
| Scientific engine | Calculations and evidence generation | Rate-of-change tests, decomposition, anomaly checks |

## Frontend layer

The front end is built with Next.js and the App Router. It provides both public product pages and the investigation workspace.

Public pages include:

- landing page
- platform overview
- methodology
- data explorer
- case study pages
- project information

Workspace routes cover:

- Super Intelligence
- Data Selection
- Data Preview
- Data Analysis
- Plot & Visualize
- Living Globe
- Case Studies
- Precipitation Forecasts
- Existing Research

This separation keeps the product story and analysis experience distinct while reusing the same scientific pipeline.

## Workspace layer

The workspace is the main investigative environment. It is the place where users move from a plain-language question to a verified evidence trail. The core stages are:

1. Discovery and query interpretation
2. Dataset selection and settings
3. Preview and quality inspection
4. Scientific analysis
5. Visualization and export

Each stage maintains context and results so that users can interpret the evidence in a coherent sequence.

## Backend layer

The backend is a decoupled FastAPI application. It exposes API endpoints for:

- conversational dataset search
- provider catalog discovery
- geocoding and location resolution
- dataset metadata retrieval
- extraction jobs and previews
- case file analysis and statistics
- literature exploration

The backend is intentionally modular. The central design goal is to separate the UI from the scientific and live-data logic, which makes it easier to understand, test, and evolve.

## Provider architecture

Iris integrates with multiple upstream data providers, especially Earth observation and climate sources. These include NASA and NOAA-oriented catalog and retrieval systems, with live provider adapters for dataset discovery and extraction.

This matters because the platform is designed around real data and real evidence chains. It does not depend on fabricated examples or fixed static datasets alone.

## Scientific engine

The scientific engine performs analysis on selected series and geospatial datasets. It supports the kinds of methods described in the platform: trend tests, seasonal adjustment, anomaly detection, evidence classification, and reproducible output generation.

The architecture separates:

- AI interpretation of the user question
- scientific calculation of the evidence
- user-facing explanation of the output

This separation reduces the risk of model-led science and keeps the evidence process grounded in reproducible methods.

## Precipitation Forecast System Architecture

To complement historical decadal trend detection with near-term atmospheric expectations, Iris includes a dedicated future-weather prediction pipeline:

- **ECMWF 51-Member Ensemble**: Retrieves 72-hour precipitation forecasts via the Meteomatics Weather API (`precip_3h:mm`, `source=ecmwf-ens`). Includes control member 0 and 50 perturbed members to evaluate probabilistic weather spread.
- **Member-First Accumulation Engine**: Contiguous 3-hour accumulations are summed *within each individual member first*, and then 10th, 50th, and 90th percentiles are evaluated across the 51 totals. This preserves physical atmospheric conservation laws.
- **NASA GPM IMERG Observational Benchmark**: Connects to NASA Earthdata Cloud via CMR and DAP4 to retrieve 7 days of recent daily precipitation observations (`GPM_3IMERGDE.07`) as an empirical antecedent baseline.
- **Durable Snapshot Store & Rate Limits**: Forecasts are persisted in SQLite (`artifacts/runtime/forecasts/catalogue.sqlite3`) with up to 1,500 retained runs. A persistent transaction limits remote calls to 100 requests per UTC day with a 15-minute refresh cooldown.

## Why this matters

The project is not only a website or a visualization demo. It is a complete Earth intelligence system:

- a user experience for non-experts
- a dataset discovery flow for real research questions
- a scientific backend for reproducible analysis
- a data provenance model designed around evidence and trust

This architecture is the foundation for everything users see in the product and in the documentation.
