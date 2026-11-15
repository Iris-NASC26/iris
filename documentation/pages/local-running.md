# Local Running

Iris is designed to run locally for development and for full exploration of the documentation and frontend experience. The project is structured around a Next.js frontend and a decoupled Python backend.

## Required tools

Before running the project locally, install:

- Node.js 20+
- pnpm
- Python 3.11+
- pip for backend dependencies

## Frontend

From the project root:

```bash
pnpm install
pnpm dev
```

This starts the Next.js app, usually on a local development port such as 3000.

## Backend

The backend is the scientific and data-discovery layer behind the investigation flow. Two entrypoints are available:

### 1. Full Platform Suite (Recommended)
Loads the core analysis pipeline along with the Living Globe spatial field services (`/api/v1/visualization/...`), the Precipitation Forecast background worker (`/api/v1/forecasts/...`), and Disaster Evidence hazard investigations (`/api/v1/hazards/...`):

```bash
cd backend
pip install -r requirements.txt
pip install -r visualization-requirements.txt
uvicorn visualization_app:app --reload --port 8000
```

### 2. Core Pipeline Only
Runs the primary FastAPI service providing conversational discovery, catalog search, time-series extraction, and statistical Case File generation:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend exposes the API surfaces that support dataset discovery, spatial extraction, and scientific analysis.

## Documentation site

To serve the documentation locally:

```bash
pnpm docs:dev
```

This runs the static documentation site from the `documentation` folder. The project includes a local port configuration for a docs server on port 3001.

## Typical project startup flow

1. Start the frontend with `pnpm dev`
2. Start the backend for live datasets and analysis
3. Open the workspace and run a query in Super Intelligence
4. Use the docs site to understand the architecture and workflows

## Environment notes

- The app uses a Next.js App Router setup for public pages and workspace routes.
- Backend services are separated to keep scientific logic and live-data retrieval decoupled from the UI.
- Local development works best when both the frontend and backend are running together for full feature fidelity.

## Troubleshooting

If the app does not load data or search results correctly, check:

- the backend status on the configured API host
- environment variables for provider access or external service setup
- whether optional dependencies are installed for the visualization or live extraction path

The docs site itself is intentionally isolated from the rest of the application, so it can be modified and served independently without touching the product code.
