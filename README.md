# Iris - Earth System Trend Detective

NASA Space Apps Challenge 2026: **Be An Earth System Trend Detective!**

This repository contains one local Next.js application (`src/`) and one FastAPI application (`backend/src/earth_trend/`). Navida's root interface is the shared user experience; the Earth Trend backend, generated contracts, source inspection, validation environment and real-data renderer are integrated into it. This is a practice build outside the official submission.

## Run locally

Prerequisites: Node **24.19.0**, uv **0.12.9**, bootstrap Python **3.13+**. From this repository root:

```powershell
python scripts/dev.py setup
python scripts/dev.py start
```

Open **http://127.0.0.1:5173**. FastAPI runs on loopback port 8000. Stop any older checkout using those ports first. Ctrl+C stops both owned services. Neither command creates cloud infrastructure.

## Available now

- Navida's public layout, workspace sidebar, theme controls and onboarding.
- Approved 13-variable source list and rule-based, confirm-before-search discovery (no AI service).
- Raw NASA POWER V01 air-temperature and V12 solar-radiation monthly series; nearest native-cell selection, bounded box means, units, missing values and provenance.
- Open-Meteo place search with explicit candidate confirmation.
- Three.js Living Globe with attributed local NASA GIBS basemap, bounded raw monthly fields, camera controls and explicit WebGL fallback.
- Generated Python/TypeScript contracts, offline regression checks and an isolated scientific reference environment.

Raw retrieval **does not establish scientifically validated trends**. Trend inference, significance, global trend cube, case files, forecasts and code execution remain unavailable pending their approved implementation and scientific gates. Prototype charts on public pages are explicitly labelled design illustrations. The research reading list is unverified.

## Verify

```powershell
python scripts/dev.py check
npx --yes pnpm@12.18.0 exec playwright install chromium
python scripts/dev.py browser
python -m unittest discover -s scripts/tests
uv --directory validation sync --locked
uv --directory validation run --locked pytest
uv --directory validation run --locked python -m reference.build_fixtures --check
uv --directory validation run --locked python -m reference.run_checks --check
```

Ordinary checks use transport/synthetic fixtures and make no NASA requests. Explicit opt-in live browser checks are documented in [development instructions](docs/DEVELOPMENT.md).

## Project records

- [Approved SRS](docs/SRS.md), [technical design](docs/TECHNICAL_DESIGN.md), [implementation plan](docs/IMPLEMENTATION_PLAN.md).
- [Consolidation decisions and capability mapping](docs/CONSOLIDATION.md), [source inventory](docs/consolidation-source-inventory.json), [execution history](docs/EXECUTION_STATUS.md).
- [Original challenge/source README](docs/CHALLENGE_AND_SOURCE_README.md).

The approved documents retain their existing requirements and task IDs. Historical `web/` paths now resolve at the repository root (`web/src/` -> `src/`, `web/tests/` -> `tests/`). `model context/` and `reference/navida/` contain historical/prototype material, not additional applications or authoritative specifications.

## Credentials

No credentials are needed for the current POWER preview, local basemap or geocoder. Do not commit passwords, Earthdata tokens, provider keys, downloaded source arrays or `.env` files. Existing private settings in the older checkout are not copied by Git or needed to start this app. [Development instructions](docs/DEVELOPMENT.md) explain the root dotenv boundary before you configure protected-data preflight.
