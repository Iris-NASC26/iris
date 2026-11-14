# Local development after repository consolidation

The canonical checkout is `Iris-NASC26/iris`. One root Next.js 16.4.6 / React 19.3.1 app proxies implemented data requests to one loopback FastAPI app. The former nested `earth-trend/` snapshot is removed. The original approved scientific scope and review gates remain unchanged; see [consolidation record](CONSOLIDATION.md).

## Setup and operation

Use Node 24.19.0, uv 0.12.9 and bootstrap Python 3.13+. Application Python is pinned to 3.13.15. From the root:

```powershell
python scripts/dev.py setup
python scripts/dev.py start
```

Setup runs `uv sync --locked` in backend and frozen pnpm installation at root. Start installs nothing; it binds Next to `127.0.0.1:5173` and FastAPI to `127.0.0.1:8000`, rejects occupied ports and supervises its owned child processes. Stop older checkout servers before starting. Ctrl+C stops both services. `backend/main.py` is a compatibility entry to the same `create_app` factory; it does not run Navida's old service graph. No public deployment is configured.

Development writes `.next-dev/`, production builds `.next/`. `next-env.d.ts`, build caches, artifacts and environments are ignored. The generated `AGENTS.md` requires reading the installed version's Next guides before changes.

## Checks

```powershell
python scripts/dev.py check
npx --yes pnpm@12.18.0 exec playwright install chromium
python scripts/dev.py browser
python -m unittest discover -s scripts/tests
```

`check` runs contract drift, Ruff lint/format, strict Python types, pytest, TypeScript, Vitest, Node generator tests and production build. Browser checks start actual servers unless explicitly using an existing owned server:

```powershell
$env:EARTH_TREND_TEST_EXISTING_SERVER = '1'
npx --yes pnpm@12.18.0 test:browser
Remove-Item Env:EARTH_TREND_TEST_EXISTING_SERVER
```

For deliberate live anonymous NASA checks, also set `EARTH_TREND_LIVE=1`; run `pnpm test:browser` (through the pinned npx manager above), then remove the flag. Otherwise the two live checks are skipped and responses are explicitly test fixtures intercepted only inside tests. Live success establishes connectivity and source transport, not trend validity. Renderer benchmark output is device-specific; headless software rendering does not establish reference-laptop performance.

Independent scientific checks use the isolated `validation/` environment. Follow [validation instructions](../validation/README.md); do not import its oracles into production. Protected source-format inspection has a separate `validation/preflight/` environment.

## Layout and ownership

```text
src/app/                       Navida public/workspace routes; local API proxies
src/features/                  catalog, discovery, preview, evidence, Three.js globe
src/contracts/generated.ts     generated authoritative scientific types
src/data/                      runtime payload validation and request clients
src/server/                    fixed backend targets and local boundary
src/context/                   Navida theme; isolated legacy dashboard context
src/state/                     explanation level and motion preferences
backend/src/earth_trend/        single FastAPI runtime, models, POWER and geocoder
backend/tests/                 contracts and source/transport unit tests
contracts/openapi.json         generated Python contract document
scripts/                       launcher, contract generation, explicit source probes
validation/                    isolated independent scientific references
reference/navida/              unadmitted prototype files; not runnable applications
```

H1 owns shared root package/lockfiles, launcher, backend entry and schema generation. H2/H3 review source/scientific semantics; H5 reviews consumers and H6 independently reruns checks. Shared files are reserved for the consolidation branch. Never hand-edit generated scientific definitions. Run `python scripts/dev.py contracts` to regenerate, or `contracts-check` to check without writes. TypeScript 5.9.3 is the single compiler: it satisfies openapi-typescript 7.13.0's peer range and checks the root application. The former split compiler environments are removed. Package-age and strict-peer policies stay enabled; MapLibre style-spec is pinned to compatible 26.6.0 to avoid a too-recent transitive release.

## Runtime data and scientific boundary

Current routes: health, `series/{V01|V12}`, `regional-series/{V01|V12}`, `field/{V01|V12}` and geocode. All other prototype API routes return review-required 503 for their declared methods, never a constant-generated cube or fallback product. Unknown inputs fail explicitly. Raw POWER metadata, units, retrieval timestamps, artifact hashes, missing values and stale-cache disclosures are preserved. V01 is already Celsius; V12 uses W/m? and its source time standard. Neither raw cells nor box means are certified D01 scientific series. Host/Origin protection remains local-only, no permissive CORS or generic URL proxy.

POWER HTTPS targets are fixed, redirect/size/time bounded and cached under ignored `artifacts/runtime/`. The existing valid-cell area-weighted raw box aggregation has documented limits; it does not establish canonical land masks, scientific coverage or per-month QA admission. Displayed trends and significance remain unavailable. Test-only synthetic renderer patterns require explicit opt-in and are labelled; they are never loaded as Earth observations.

Navida's prototype backend provider/adapter/service modules remain source material, not imports of the canonical app. Archived case-board/analysis/editor/preview components require scientific and contract review before reconnection. Merely having code does not complete an implementation-plan task.

## Credentials and root dotenv boundary

The consolidation does not copy or expose the older checkout's private `.env`. Current raw previews need no Earthdata, Gemini, Meteomatics or cloud key. For protected preflight, retain credentials in an external user-only netrc file or explicitly configure the existing preflight token input without putting values in chat. If you choose a root ignored `.env`, note that **root Next.js automatically reads root dotenv files**. This differs from the old nested `web/` layout. Never use `NEXT_PUBLIC_` for a secret, export secrets in Next config, pass them as client props or put them under `public/`. The application does not activate a provider merely because a key exists; preflight reads only its declared token field. Review that boundary before adding any integration.

No credential migration or protected NASA job is performed by this consolidation. Scientific source and reviewer gates remain in the approved documents and [execution ledger](EXECUTION_STATUS.md).
