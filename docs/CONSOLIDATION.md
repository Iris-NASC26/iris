# Iris single-application consolidation

**State:** REVIEW, 14 November 2026. Canonical repository: `Iris-NASC26/iris`. Branch: `feat/consolidate-earth-trend`. No main-branch merge is implied by passing checks.

## Authorized decision

Keep Navida's root Next.js interface and integrate the Earth Trend working modules into that application. The team reserved shared files for this branch. Next.js, FastAPI, local hosting, scientific contracts and approved scientific requirements remain in force. This changes directory placement and service composition, not the approved numerical methods or feature scope.

There is one root Node package, one Next application and one canonical FastAPI app factory. `backend/main.py` is a compatibility import of that factory. No unrelated-history merge or second frontend is required.

## Preserved revisions and recovery

- Iris root baseline: `0d8a96639611803bacd65873b6768323805d9b59`, tag `archive/iris-before-consolidation`.
- Latest Earth Trend main: `84d941f8aefc4d7c99a0c068fd364c4cc5ebcb21`, tag `archive/earth-trend-source-84d941f`.
- All 215 files from that source revision are accounted for in [the blob inventory](consolidation-source-inventory.json). A destination can be adapted rather than byte-identical; null means deliberately superseded/archive-only. Exact originals remain recoverable with `git show <tag>:<source-path>`.
- The duplicate tracked `earth-trend/` and `model context/earth-trend/` snapshots were removed only after the mapped destinations existed and both revisions were preserved.
- Selected prototype layouts and the unverified durable store remain under `reference/navida/`, excluded from active compilation and application test discovery. Remaining Navida provider/adapter/service modules and dormant map components are kept but are not invoked by the canonical routes.
- Original repositories, linked worktrees, private dotenv files and ignored raw artifacts are untouched. Root `.env` is not transferred or committed.

## Capability mapping

| Contribution | Canonical location / treatment | Implementation-plan implication |
| --- | --- | --- |
| Navida public design, sidebar, theme, onboarding, icons | Root `src/app`, shared components and theme context; retained | Reuses U01/U14 presentation work; no scientific completion inferred |
| Working backend and source safety | `backend/src/earth_trend`, immutable hash-aware raw transport caches and tests | Supports F02/F03 and parts of D02/D04; canonical registry, provider admission and full processing gates remain |
| Independent scientific references | `validation/`, isolated lock/environment, fixtures and reports | F04 evidence preserved; qualified H3 review and remaining method/calibration gates are still required |
| Real POWER point series, raw box means and geocoder | Root `src/features/preview`, `src/data`, fixed API proxies | Reuses partial U04/U07; raw cell/box calculations do not complete D13-D15 or A01 |
| Three.js globe, NASA GIBS local basemap and raw fields | `src/features/globe`, `public/globe` | U03 renderer work retained; device benchmark is not global-layer/performance acceptance |
| Approved variable cards and deterministic assistant | `src/features/catalog`, `src/features/discovery` inside Navida shell | Partial U06; planned product descriptions do not complete D01 registry admission |
| Python/TypeScript contracts and fixtures | `backend/src/earth_trend/api/schemas`, root `contracts/`, `src/contracts/`, contract tests | F03 definitions retained without hand-written replacements |
| Navida analysis, cube, case-board, forecast and editor prototypes | Layout/source preserved; routes visibly unavailable and relevant API methods return `INTEGRATION_REVIEW_REQUIRED` 503 | Useful starting points for A03/U08/U11/U12/U13; never mark done from the existence of UI or constants |
| Navida reading list and public concept charts | Explicitly unverified / illustrative; fabricated numeric findings and PASSED registry removed from active presentation | Future source verification required; no scientific evidence derived from these pages |

A release snapshot provider, validated dataset registry, complete area/mask/QA coverage, admitted science engine, forecasts, exports and demonstrated end-to-end scientific Case File remain future work. No backlog task is silently waived. Existing U-series execution notes are partial progress records, not completion of every similarly numbered plan requirement.

## Runtime and integration decisions

- Root `src/`, `public/`, `tests/`, `scripts/` replace the former `web/*` layout. Approved SRS/TDD/plan content is preserved; historic paths in those documents resolve through this mapping. Historical Navida `model context/` documents are superseded by approved `docs/` documents.
- Browser stays on loopback 5173; FastAPI stays on loopback 8000. All proxy targets are fixed. Local Host/Origin checks remain. No cloud infrastructure is provisioned.
- One theme owner (Navida ThemeContext), one explanation/motion preference provider. Each actual data panel owns its source/coordinates; a prototype default Los Angeles chip no longer describes unrelated real data.
- Single TypeScript compiler 5.9.3 satisfies the contract generator's peer requirements. The former web-only 7.0.2 split is removed. Package age and strict peer checks remain enabled. MapLibre's compatible style-spec is pinned to 26.6.0 after policy rejected a too-recent transitive 26.7.0 lock entry.
- Original Google Fonts CSS network import is removed; system font fallbacks retain the interface without a mandatory external font request. The globe/basemap renderer remains local and does not make an external font request.
- Unlike the former nested frontend, root Next automatically loads root dotenv files. Existing private settings are not copied. No secret is intentionally exported to the client and no protected-data authentication is needed for these anonymous raw previews. Follow [development instructions](DEVELOPMENT.md) before configuring protected preflight.
- Licence metadata for the consolidated JavaScript graph is recorded in [the dependency supplement](CONSOLIDATION_DEPENDENCIES.md). Final licence-text/redistribution review remains F06/R06; no additional blanket licence exception is inferred.

## Verification

The following were executed in the independent Iris checkout, not assumed from source history:

- Frozen root dependency install; contract drift check; Ruff lint/format; strict Python and frontend type checks; production build.
- 206 backend tests, 41 frontend unit/component tests, six Node generator/drift tests.
- 37 launcher/provider-preflight script tests.
- 71 isolated scientific-reference tests; fixture and report checks reproduce without rewriting expected results.
- 23 ordinary Chromium journeys passed; two live checks are deliberately skipped by default. They cover raw point/box series, fields, place selection, missing values, catalog/discovery, Navida navigation, persistence, mobile viewport, onboarding keyboard focus, renderer cleanup, WebGL fallback, server boundaries and unavailable science.
- The two explicit live Chromium checks passed separately: authentic NASA POWER V01/V12 series and V01 raw field traverse Next and FastAPI; chart/table/readout consistency is checked. A live Colombo geocoder request also returned five candidates.

Initial consolidation browser failures were stale banner expectations and a GET assertion against an existing POST route; corrected tests passed. An initial manual geocoder probe used an unsupported query parameter and returned 422; the declared `name` contract returned 200. No validation was bypassed or expected scientific value refreshed to hide a failure.

Known warnings: Starlette's httpx test-client deprecation; headless software rendering measured approximately 15-20 fps in development, below the 30 fps reference-laptop target. This is a measured device limitation, not renderer performance acceptance. Final hardware/accessibility/release checks remain open. Ordinary mocked transport tests and live source access do not certify statistical validity or complete spatial/QA processing.

## Review and move-forward gate

H1 reviews the flattened launcher, package graph and canonical app entry; H2/H3 review scientific/data boundaries; H5 reviews preserved Navida UX and consumers; H6 independently reruns checks. Named human reviewers are still to be assigned to provisional roles. Merge only after human review of this PR and these limitations. Use a separate branch for the next approved task.

After the PR is accepted, use this Iris checkout as the shared development repository. Keep the older checkout/worktree until any unpublished commits and private artifacts have been inventoried and intentionally migrated. Existing issue/PR links in historic records still refer to the older repository; this change does not automatically migrate issue boards, reviewer assignments, private credentials or ignored source caches.
