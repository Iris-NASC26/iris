# Local development — foundation and F05 preflight

This is a practice build. The U01 integration adds a visible Iris workspace to the F02 Next.js App Router/React/TypeScript and FastAPI foundation, selectively porting Navida's UI. Analysis is explicitly unavailable. See [execution ownership and gates](EXECUTION_STATUS.md) and the [integration/reuse ledger](NAVIDA_INTEGRATION.md). Full local release packaging is R01/R07, not this development launcher.

## Prerequisites and setup

Use **Node 24.19.0** (includes npm/npx), **uv 0.12.9**, and a bootstrap Python **3.13 or newer** on PATH. Application Python is **3.13.15**, selected by `.python-version` and installed by uv if necessary. Runtime versions are deliberate pins; update them with the lockfiles and repeat checks together. No global pnpm installation, Docker, cloud account or Earthdata login is required.

From the repository root:

```powershell
python scripts/dev.py setup
python scripts/dev.py start
```

Setup uses `uv sync --locked` and `npx --yes pnpm@12.18.0 install --frozen-lockfile`. Internet is needed to retrieve package-manager/runtime/dependency artifacts on first setup. Setup makes no NASA calls and reads no NASA credentials. Start uses installed executables and starts only loopback services: Next.js at `http://127.0.0.1:5173`, FastAPI at `http://127.0.0.1:8000`. Ctrl+C stops both. The launcher rejects occupied ports and stops the remaining server if either exits. Start does not install packages. This is a development server, not an approved public-hosting configuration.

Next.js serves the browser origin and forwards the implemented `/api/v1/health` route to a fixed loopback FastAPI URL. Other API routes remain unimplemented; no generic provider proxy is exposed. Next.js and FastAPI both reject unexpected Host/Origin values. FastAPI rejects unexpected Host and browser Origin headers. No permissive CORS is enabled. The health route is a small F02 liveness contract (`health.v1`); F03 owns future scientific contracts. `analysis_ready: false` must stay false until a separately reviewed readiness design exists.

## Verification commands

```powershell
python scripts/dev.py check
npx --yes pnpm@12.18.0 --dir web exec playwright install chromium
python scripts/dev.py browser
```

`check` runs Ruff lint/format, strict mypy, pytest, TypeScript, Vitest/Testing Library and a Next.js production build. The browser installation is a one-time test-tool download; `browser` starts real servers, renders React in Chromium and checks the real FastAPI response through the proxy. Stop any existing development servers first. A browser smoke test proves connectivity, not scientific correctness. Ordinary tests use no external APIs. Test output is captured in the PR and [execution record](EXECUTION_STATUS.md).

F03 adds contract drift checking before the normal checks, synthetic contract tests in pytest, compile-only frontend consumers and six Node generator/drift tests. Scientific algorithms and NASA data acquisition remain unimplemented. The health route and `analysis_ready: false` behavior are preserved.

## Contract generation and ownership

```powershell
python scripts/dev.py contracts
python scripts/dev.py contracts-check
```

`contracts` regenerates `contracts/openapi.json` and `web/src/contracts/generated.ts` from the authoritative Python models. Commit/review both artifacts with model changes. `contracts-check` generates expected content in memory and compares without writing; stale or missing outputs cause a nonzero exit. `python scripts/dev.py check` runs this drift check automatically. Standalone exporter inspection: run `uv run --locked python -m earth_trend.api.schemas.export` from `backend/`.

H1 owns `backend/src/earth_trend/api/schemas/`, the export registry and generation tooling. H2/H3/H5 review source/scientific/consumer semantics jointly, and H6 independently reruns checks. Never hand-edit scientific TypeScript interfaces or generated artifacts. Import types from `web/src/contracts/generated.ts`; generated compile-time types do not replace runtime wire validation. No fake endpoints expose the definitions: `paths` contains the existing health route only.

The pinned generator is `openapi-typescript` 7.13.0 with a TypeScript 5.9.3 tooling peer at the workspace root; the frontend continues to compile using its own TypeScript 7.0.2. See [contract decisions and remaining review gates](CONTRACTS.md), the [synthetic fixture disclosure](../backend/tests/contracts/fixtures/README.md) and the [dependency inventory](DEPENDENCY_LICENSES.md).

## Boundaries and maintenance

```text
backend/src/earth_trend/api/    HTTP models, local Host/Origin protection, app factory
backend/src/earth_trend/cli.py  loopback server entry point
backend/tests/unit/            isolated HTTP behavior checks
backend/src/earth_trend/api/schemas/ authoritative Pydantic wire contracts/export
backend/tests/contracts/       disclosed synthetic round trips and rejection checks
contracts/openapi.json        generated components plus existing operational paths
web/src/app/                  Next.js pages, layouts, error states and health proxy
web/src/data/                 validated health fetch with timeout/cancellation
web/src/styles/               responsive foundation styling
web/tests/unit/               response validation and loading/error/retry checks
web/tests/browser/            one real browser-to-backend smoke
web/src/contracts/            generated TypeScript; no handwritten scientific interfaces
web/tests/contracts/          compile-only consumers and negative type assertions
web/scripts/contracts*.mjs    generation, non-mutating check and isolated drift tests
scripts/dev.py                setup, supervised start and check entry points
```

Create future science/providers/geometry/storage modules only when their approved tasks start. Keep numerical calculations out of React and HTTP handlers. Never put observations or passwords into demonstration placeholders. `.env`, netrc files, private keys, build artifacts, raw data and environments are ignored. By explicit user decision during U01, private settings were moved intact into the ignored project-root `.env`; its permissions are restricted to the current Windows user and SYSTEM. Never copy it into `web/` or stage it. The UI and health server need no credentials and do not load this file.

H1 owns shared root configuration, Python dependencies and both lockfiles for F02. Coordinate future lockfile updates through one owner. Dependencies are exact at direct declarations and resolved in `pnpm-lock.yaml` / `backend/uv.lock`; the [licence inventory](DEPENDENCY_LICENSES.md) records installed transitive packages. Comprehensive CI, automated secret/license checks and branch protection remain F06. Human approval and post-merge checks are required before marking tasks DONE.

The user replaced Vite/React Router with Next.js on 14 November 2026; see [ADR-001](decisions/0001-nextjs.md). Vite remains an internal Vitest dependency only. Next.js uses the existing Node runtime and its App Router/fast refresh; no second application router remains. Current references: [Next.js](https://nextjs.org/docs/app), [uv](https://docs.astral.sh/uv/guides/projects/), [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/).

## Independent scientific references — F04

The separately approved environment under `validation/` owns its own dependency pins/lockfile and imports no application code. Application setup, dependencies, contracts and scientific readiness are unchanged. See the [F04 reference guide](../validation/README.md), [method gates](../validation/fixtures/method-gates.json) and [validation-only licence inventory](../validation/DEPENDENCY_LICENSES.md).

From the repository root:

```powershell
uv --directory validation sync --locked
uv --directory validation run --locked pytest
uv --directory validation run --locked python -m reference.build_fixtures --check
uv --directory validation run --locked python -m reference.run_checks --check
```

H3 owns these references, with independent human scientific review required. Shared application lockfiles stay with H1. Synthetic fixtures and reference reports must not be exposed as NASA observations, prepared product results or proof that SM-12/VL-01/VL-02 passed. Scientific gates remain open even when deterministic tests pass. F04 checks are separate commands; adding full CI enforcement belongs to F06.

## NASA provider preflight — F05

F05 adds opt-in inspection tools and [actual provider evidence](../validation/reports/provider-preflight.md),
not application adapters or scientific readiness. POWER chunks/coordinates, seven HDF5 source
headers, the approved AIRS map, a Giovanni CSV, a supported HOSS subset and two AppEEARS
NDVI/QA probes were checked. Raw artifacts stay in ignored `artifacts/f05/`; sanitized metadata,
hashes, failures and estimates are committed. Full build feasibility and scientific admission
remain explicit gates.

The [isolated preflight guide](../validation/preflight/README.md) documents setup, live opt-ins,
the external token file, reproducibility and offline tests. It has its own pinned environment
and lockfile, separate from both the application and F04. The public probe uses only stdlib;
no NASA call or credential read is added to application setup or ordinary checks.

```powershell
backend/.venv/Scripts/python.exe -m unittest discover -s scripts/tests -v
uv run --project validation/preflight --locked python -m unittest discover -s validation/preflight/tests -v
```

F05 tools may read the ignored project-root `.env` (`EARTHDATA_TOKEN=`),
an environment token, the legacy `%LOCALAPPDATA%\EarthTrendDetective\secrets\.env`, or the external `.netrc`, with explicit authenticated opt-in. Verify private
file permissions first. React and the health server do not read these files. Never commit
credentials/signed URLs or label synthetic format fixtures as NASA observations. F06 owns
future automated CI enforcement; H2/H3 review source/QA findings before release admission.

## U01 — selective Iris workspace integration

Open `http://127.0.0.1:5173/workspace`. Next.js App Router now provides native pages/layouts and navigation;
Radix Dialog supplies modal focus trapping/restoration for the tour and mobile drawer.
View preferences (theme, explanation level, reduced motion and sidebar) alone use localStorage.
The tour is user-invoked and skippable. System reduced-motion preferences are also respected.
UI components are owned CSS/React; the full Tailwind/shadcn, query/state, globe and chart
dependencies will be introduced by their consuming tasks. No additional renderer is installed.

The searchable list presents all 13 approved P0 variable targets, not an admitted D01
registry or installed data catalog. URL selection survives reload; unknown variable IDs
produce an explicit error state. Preview stays empty; globe, analysis and scan routes
explain their unavailable state. The typed observation table is verified against a
test-only F03 fixture and is not connected to production data. No synthetic fixtures,
Navida-generated cube metrics, saved extraction store, provider adapters or AI calls
enter the application bundle. The only implemented backend API requested by these flows is `/api/v1/health`; Next.js also makes internal page/RSC navigation requests.

Next.js is launched with `web/` as its application directory; it does not load the
parent project-root `.env`. Do not copy private settings into `web/.env*`,
`web/public/`, client props, `NEXT_PUBLIC_` variables or `next.config`'s `env`. The application does not automatically
activate Gemini, NOAA or other integrations because keys exist. The trusted opt-in
preflight reader extracts only `EARTHDATA_TOKEN`, without exporting/evaluating other keys.
Token precedence: process environment, root `.env`, legacy Windows file, external netrc.
An invalid nonempty configured token fails rather than silently switching sources.

After changing dependencies or Next.js configuration, restart the existing frontend. Check `/api/v1/health` through port 5173 returns JSON with `analysis_ready: false`.
For deliberate browser verification against already-running local servers:

```powershell
$env:EARTH_TREND_TEST_EXISTING_SERVER = '1'
npx --yes pnpm@12.18.0 --dir web test:browser
Remove-Item Env:EARTH_TREND_TEST_EXISTING_SERVER
```

The normal `python scripts/dev.py browser` remains a managed-server run with free ports.
CI never reuses a server even if the override is set. New journeys live in
`web/tests/e2e/workspace/`, with a page object in `web/tests/pages/`.

## Next.js local runtime and public pages

The current frontend is Next.js **16.4.6**, with React **19.3.1** and the existing
pinned TypeScript. `web/scripts/next.mjs` launches `dev`, `build` or `start` with
telemetry disabled. Development writes ignored `.next-dev/`; production builds
write ignored `.next/`, so building does not overwrite a live development server.
Generated `next-env.d.ts` and TypeScript build caches are ignored; Next generates
them when needed. `web/AGENTS.md` is Next's generated versioned-guide instruction.

Routes: `/` landing; `/platform`, `/about`, `/methodology`, `/data`; and the existing
`/workspace/*` investigation pages. Public PageShell, PublicNavbar, InfoCard and
About composition are adapted from Navida's contribution with current availability
copy. Native routing, reloads, server/client boundaries and persisted preferences
are exercised in real Chromium tests. API consumers still use generated Python
contracts; no scientific work moves into Next route handlers or components.

For a production frontend check (backend must already run separately on port 8000):

```powershell
npx --yes pnpm@12.18.0 --dir web build
npx --yes pnpm@12.18.0 --dir web start
```

Stop any development frontend on port 5173 before `start`; it deliberately does not
fall back to another port. The managed development command remains
`python scripts/dev.py start`. Its Windows shutdown targets only owned process
IDs and their children, including the Next server. Full production packaging,
offline snapshot export and second-device recovery remain R01/R02/R07.

The methods page includes the user-approved caniuse-lite browser-data attribution.
See the updated licence inventory and SRS CMP-1/AC-34; the exception applies only
to named ancillary browser-compatibility data, not software libraries.
