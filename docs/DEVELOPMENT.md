# Local foundation development — F02

This is a practice build. F02 provides React/TypeScript/Vite and FastAPI/Pydantic/Uvicorn with a browser-to-backend health check. Analysis is explicitly unavailable. See [execution ownership and gates](EXECUTION_STATUS.md). Full local release packaging is R01/R07, not this development launcher.

## Prerequisites and setup

Use **Node 24.19.0** (includes npm/npx), **uv 0.12.9**, and a bootstrap Python **3.13 or newer** on PATH. Application Python is **3.13.15**, selected by `.python-version` and installed by uv if necessary. Runtime versions are deliberate pins; update them with the lockfiles and repeat checks together. No global pnpm installation, Docker, cloud account or Earthdata login is required.

From the repository root:

```powershell
python scripts/dev.py setup
python scripts/dev.py start
```

Setup uses `uv sync --locked` and `npx --yes pnpm@12.18.0 install --frozen-lockfile`. Internet is needed to retrieve package-manager/runtime/dependency artifacts on first setup. Setup makes no NASA calls and reads no NASA credentials. Start uses installed executables and starts only loopback services: React at `http://127.0.0.1:5173`, FastAPI at `http://127.0.0.1:8000`. Ctrl+C stops both. The launcher rejects occupied ports and stops the remaining server if either exits. Start does not install packages. This is a development server, not an approved public-hosting configuration.

The Vite proxy forwards `/api` to FastAPI, keeping browser requests on one origin. FastAPI rejects unexpected Host and browser Origin headers. No permissive CORS is enabled. The health route is a small F02 liveness contract (`health.v1`); F03 owns future scientific contracts. `analysis_ready: false` must stay false until a separately reviewed readiness design exists.

## Verification commands

```powershell
python scripts/dev.py check
npx --yes pnpm@12.18.0 --dir web exec playwright install chromium
python scripts/dev.py browser
```

`check` runs Ruff lint/format, strict mypy, pytest, TypeScript, Vitest/Testing Library and a Vite build. The browser installation is a one-time test-tool download; `browser` starts real servers, renders React in Chromium and checks the real FastAPI response through the proxy. Stop any existing development servers first. A browser smoke test proves connectivity, not scientific correctness. Ordinary tests use no external APIs. Test output is captured in the PR and [execution record](EXECUTION_STATUS.md).

## Boundaries and maintenance

```text
backend/src/earth_trend/api/    HTTP models, local Host/Origin protection, app factory
backend/src/earth_trend/cli.py  loopback server entry point
backend/tests/unit/            isolated HTTP behavior checks
web/src/app/                  React entry and foundation connection states
web/src/data/                 validated health fetch with timeout/cancellation
web/src/styles/               responsive foundation styling
web/tests/unit/               response validation and loading/error/retry checks
web/tests/browser/            one real browser-to-backend smoke
scripts/dev.py                setup, supervised start and check entry points
```

Create future science/providers/geometry/storage modules only when their approved tasks start. Keep numerical calculations out of React and HTTP handlers. Never put observations or passwords into demonstration placeholders. `.env`, netrc files, private keys, build artifacts, raw data and environments are ignored; secrets belong outside the repository. The current app needs no environment file.

H1 owns shared root configuration, Python dependencies and both lockfiles for F02. Coordinate future lockfile updates through one owner. Dependencies are exact at direct declarations and resolved in `pnpm-lock.yaml` / `backend/uv.lock`; the [licence inventory](DEPENDENCY_LICENSES.md) records installed transitive packages. Comprehensive CI, automated secret/license checks and branch protection remain F06. Human approval and post-merge checks are required before marking tasks DONE.

The frontend uses Vite's built-in TSX transform; React fast-refresh and the full UI stack are deferred to U01. This avoids adding unused libraries to the foundation. Current technical references: [Vite setup](https://vite.dev/guide/), [uv project management](https://docs.astral.sh/uv/guides/projects/), [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/).
