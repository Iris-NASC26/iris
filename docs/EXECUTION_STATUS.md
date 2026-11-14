# Execution status — F01/F02/F03/F04/F05 and selective U01 integration

**Updated:** 14 November 2026, Asia/Colombo.  
**Context:** Practice build outside the official submission, explicitly confirmed by the user. Do not represent this work as eligible event-period development.  
**Approved baseline:** SRS v0.3, TDD v0.3, Implementation Plan v1.0; commit `4b6046a`.  
**Current branch:** `feat/F05-provider-preflight`, based on F04 commit `a35672e`. Baseline PR: [#1](https://github.com/Iris-NASC26/earth-system-trend-detective/pull/1); foundation PR: [#7](https://github.com/Iris-NASC26/earth-system-trend-detective/pull/7); F04 PR: [#8](https://github.com/Iris-NASC26/earth-system-trend-detective/pull/8). Remote merges were observed during F05; scientific review/sign-off is not inferred from a merge.

This ledger records execution without rewriting the approved documents. The user authorized F01/F02, provisional H1–H6 roles, F03, and then F04 in the latest attached request. For F04 the user separately approved a pinned isolated validation environment and retained H3 as the provisional owner with no named GitHub reviewer. Local hosting remains the target. The current change is F04 only; no additional product feature or application architecture change is proposed.

## Latest update — U01 selective workspace integration

The user authorized the recommended selective port from `initial-navida`, retaining
our Vite/FastAPI/Three.js architecture and prioritizing a visible, truthful workspace.
Branch `feat/U01-navida-workspace` starts at main `553680e`; source snapshot is
Navida's `cabc793`. The prior F01–F05 paragraphs/tables below remain historical
records, not a declaration that the latest change is still F04/F05.

**State: REVIEW — bounded U01 integration slice; partial U02/U04/U06/U14 groundwork.**
The [integration/reuse ledger](NAVIDA_INTEGRATION.md) records source attribution,
future-task credit and exclusions. No whole scientific/data task is marked DONE.
Human UI/accessibility review remains due; F04/F05 domain gates are unchanged.

Delivered: grouped navigation, responsive mobile drawer, optional four-step tour,
dark/light theme, actual three-level content, reduced-motion controls, persistent
view preferences, planned V01–V13 search/theme filtering and source flashcards,
URL-preserved selection, unknown/empty states, typed observation-table groundwork,
evidence/AI/contribution disclosure. Analysis/scan/globe remain unavailable. No
synthetic observations, generated cube metrics, source-store results, AI service or
new NASA requests are connected to the runtime. Only liveness is operational.

The existing private `.env` was moved intact into the Git-ignored project root at
the user's explicit request. ACL is current user + SYSTEM. Vite dotenv loading is
disabled; opt-in preflight reads only Earthdata's key from the new path with legacy
fallback. Existing report hashes remain historical evidence, not regenerated claims.

Verification on 14 November 2026:

| Check | Result and limit |
| --- | --- |
| `python scripts/dev.py check` | PASS: contract drift, backend Ruff/format, strict mypy, 156 pytest, TypeScript, 12 Vitest, six Node generator tests and Vite production build |
| Browser suite, real local services | PASS: five Chromium journeys; health/retry, planned catalog→preview/reload, tour focus trap/Escape/restoration, 390px drawer/theme/reduced-motion and no horizontal overflow |
| `python -m unittest discover -s scripts/tests -q` | PASS: 35 offline tests including three credential-file regression tests; no actual credentials/network used by tests |
| Preflight isolated format tests | PASS: seven; source/format assertions only, not new NASA/scientific acceptance |
| Changed preflight lint/format/strict mypy | PASS; two source files |
| Browser/private-file boundary | Root `/.env` returns SPA HTML only; absolute `/@fs/` credential file access returns 403; no file content exposed |
| New dependency review | 28 MIT declarations inspected; distributed notices checked where present. `react-remove-scroll-bar` full upstream notice remains a release F06/R06 item |

The first browser run found the reused Vite process returning HTML for its health
proxy. The verified workspace Vite process was restarted; direct/proxied health then
matched and all five tests passed. A unit check's ambiguous availability-text selector
was resolved by clarifying the workflow card copy. No failures were skipped.

Build warnings about third-party `use client` directives remain visible; this is a
client-only Vite app. The existing Starlette/httpx deprecation warning is unchanged.
These passes do not certify scientific methods or full U01/U02/U04/U06 acceptance.
Recommended next independent task after review: D01 admitted catalog/caveat registry,
then the real V01 data path; remaining Navida chart/provider helpers stay candidates.

## Ownership and first assignment board

| Role | Responsibility | Reviewer / coordination |
| --- | --- | --- |
| H1 | Technical lead, contracts, backend, integration, local release | H6 independently reruns setup; consuming leads review contracts |
| H2 | NASA sources, QA, units, GIS, cube, provenance | H3 scientific interpretation; H1 persistence/security |
| H3 | Independent numerical references, methods, uncertainty, scientific sign-off | H2 or another qualified human independently reviews science |
| H4 | Globe, picking, lens, layers and graphics performance | H5 accessibility; H2 layer semantics |
| H5 | React application, charts, controls, exports and accessibility | H4 graphics integration; H3 scientific labels |
| H6 | Acceptance evidence, software QA, content, rehearsal and submission | H1 release integration; H2/H3 evidence authenticity |

These are role assignments, not assertions about six people's actual qualifications. Named implementers/reviewers and an independently qualified scientific reviewer must be recorded by H1 before the relevant merge/sign-off. Maximum two active Devin tasks across the project; this change is authored by Codex, with no delegated agents.

| Task | Priority / state | Human owner / reviewer | Dependencies | Deliverable and evidence |
| --- | --- | --- | --- | --- |
| F01 — Freeze scope, assignments and acceptance ledger | P0 / REVIEW | H1 + leads / H6 | User implementation approval, received | This ledger, five initial assignments, all AC owners; pending team walkthrough and current guide check |
| F02 — Minimal local runtime and isolated tests | P0 / REVIEW | H1 / H6 setup rerun + H5 frontend review | F01's baseline/ownership record | Clean setup, browser-to-health path, checks and licence seed verified locally; human rerun/review pending |
| F03 — Versioned scientific/API contracts | P0 / REVIEW | H1 + H2/H3/H5 / consuming leads; H6 rerun | F01; F02 for generation; follow-up authorization received | Authoritative Pydantic schemas, OpenAPI/TS export, disclosed fixtures, drift checks and consumer compilation passed locally; human review pending |
| F04 — Independent scientific oracles and gates | P0 / REVIEW | H3 / independently qualified H2 or other human; H6 rerun | F01; explicit F04/environment approval received | Reference foundation and tests verified; method/source/calibration gates remain open or BLOCKED; no scientific sign-off |
| F05 — NASA access and transfer preflight | P0 / REVIEW | H2 / H1 + H3 | F01, user-local Earthdata configuration, received | Technical preflight and focused checks complete; genuine source/service outputs, QA/scaling findings and estimates recorded; human domain acceptance pending |

F01–F04 retain REVIEW. None can become DONE before human approval, dependency-ordered merge and post-merge smoke checks (plan D0). Follow-up authorizations supersede previous turn-specific stop restrictions for F03/F04. F05, F06 and S01 are not started in the F04 execution.

**F05 follow-up authorization:** the user requested the local app run, then the next task;
configured external Earthdata credentials, authorized the B01/B02 January 2005 probes, requested
an external token file, and explicitly directed merge after completion. This authorizes the
verified F05 code/evidence merge. It does not establish qualified scientific sign-off, accept
all P0 criteria or waive remaining release gates. F06/S01 and production adapters remain unstarted.

The first five task cards are tracked as GitHub issues: [F01 #2](https://github.com/Iris-NASC26/earth-system-trend-detective/issues/2), [F02 #3](https://github.com/Iris-NASC26/earth-system-trend-detective/issues/3), [F03 #4](https://github.com/Iris-NASC26/earth-system-trend-detective/issues/4), [F04 #5](https://github.com/Iris-NASC26/earth-system-trend-detective/issues/5), [F05 #6](https://github.com/Iris-NASC26/earth-system-trend-detective/issues/6). This table is the status board; no GitHub account assignments are invented for provisional roles.

## Reference machine and clock

The inspected development machine is a **provisional** benchmark laptop: Windows 11 Pro 10.0.26100, Intel Core i7-1185G7, Intel Iris Xe, approximately 31.7 GiB RAM and 106.5 GiB free on C: before setup. These are hardware observations, not data-build or frame-rate benchmarks. H1/H2/H4 must record actual memory, disk, cold/warm scientific latency and browser/GPU results in R04; H6 confirms whether this is the team's accepted reference laptop before performance acceptance.

Record creation began at approximately **01:15 on 14 November, Asia/Colombo**. This is practice time, not official H0. The [official general schedule](https://www.spaceappschallenge.org/2026/) opens submissions at 09:00 November 14 and closes at 23:59 November 15 local time. [Organizer guidance](https://github.com/nasa/spaceapps/discussions/1827) distinguishes permitted preparation from event development. The user confirmed this build is outside the official submission. No event eligibility or actual team registration is asserted here.

The [current Resources page](https://www.spaceappschallenge.org/resources/) returned HTTP 502 during this check. [The organizer's submission announcement](https://github.com/nasa/spaceapps/discussions/1973) identifies that page as the current guide location. Required current assets, exact format/length limits, registered-event timezone and any earlier local presentation deadline remain **unverified**. H6 must inspect the actual current guide and event instructions before an official-event execution or submission; do not substitute older guides or invent video limits.

## Predeclared geographic benchmarks

These are engineering test inputs declared before seeing data, not NASA observations, published findings or product presets. Coordinates use longitude/latitude degrees in WGS84; later F03/D14 defines their canonical executable representation. Window: **2003-01 through 2023-12 inclusive**. Preserve these inputs and report failed eligibility rather than selecting regions after seeing scan results.

| ID | Input | Intended evidence |
| --- | --- | --- |
| B01 | Box west -100, south 35, east -95, north 40 | Candidate benchmark land region for AC-12; H2 must establish ≥8 genuinely eligible variables |
| B02 | Box west -91, south 42, east -86, north 47 | Second candidate land-region benchmark, following the TDD example; lake/coastal coverage must be reported |
| B03 | Polygon ring `[[-99,36],[-96,36],[-97,39],[-99,38],[-99,36]]` | Arbitrary non-preset polygon path, regional weights and exclusions |
| B04 | Whole world, including poles and dateline | Independent V01 mean oracle; not a promise of eight eligible products worldwide |

H2/H3 review geographic/domain suitability before AC-12 tests. If an input fails eligibility, keep the failed result and obtain a documented team decision before adding a replacement. These four inputs do not replace D14's dateline, polar, hole and fractional-coast fixtures.

## Acceptance ownership and evidence destinations

Every row is **NOT RUN** at ledger creation. F02 health/unit/browser checks do not pass an application or scientific acceptance criterion. Paths below are planned evidence destinations; reports and results must only be created from actual checks. H6 coordinates evidence collection; H2/H3 sign scientific conclusions. AC-21's SI-on check is conditional on the approved P1 SI feature; SI-off flows remain mandatory.

| Criterion | Accountable owner | Tasks | Planned evidence destination |
| --- | --- | --- | --- |
| AC-01 | H4 | U03, R04 | `validation/reports/AC-01-globe-performance.md` |
| AC-02 | H4 + H5 | A03, U08, U18 | `validation/reports/AC-02-layer-accessibility.md` |
| AC-03 | H4 | U08 | `validation/reports/AC-03-relief.md` |
| AC-04 | H4 + H1 | U07, U08, A02, R04 | `validation/reports/AC-04-lens-picking.md` |
| AC-05 | H4 + H2 | U09, R04 | `validation/reports/AC-05-time-lapse.md` |
| AC-06 | H4 + H3 | U10 | `validation/reports/AC-06-opposite-trends.md` |
| AC-07 | H2 + H3 | D14, D15, U07 | `validation/reports/AC-07-regional-weights.md` |
| AC-08 | H2 + H5 | D14, D15, U07 | `validation/reports/AC-08-domain-coverage.md` |
| AC-09 | H3 + H5 | S10, A04, U10 | `validation/reports/AC-09-comparison.md` |
| AC-10 | H2 | D01, U06 | `validation/reports/AC-10-catalog.md` |
| AC-11 | H5 + H3 | U06, U11 | `validation/reports/AC-11-discovery.md` |
| AC-12 | H1 + H2 | A02, R04 | `validation/reports/AC-12-scan-eligibility-latency.md` |
| AC-13 | H3 | F04, S01–S05 | `validation/reports/AC-13-trend-oracles.md` |
| AC-14 | H3 | S07 | `validation/reports/AC-14-seasonal-fdr.md` |
| AC-15 | H3 | S08 | `validation/reports/AC-15-evidence-grades.md` |
| AC-16 | H3 | S09 | `validation/reports/AC-16-detectability.md` |
| AC-17 | H1 + H5 | A01, U12, R04 | `validation/reports/AC-17-control-updates.md` |
| AC-18 | H5 + H3 | U04, U12, U13 | `validation/reports/AC-18-views-recommendations.md` |
| AC-19 | H3 + H5 | S11, U13 | `validation/reports/AC-19-projection-intervals.md` |
| AC-20 | H3 | S12, U13 | `validation/reports/AC-20-backtests.md` |
| AC-21 | H5 + H6 | U06, R03; P114 if shipped | `validation/reports/AC-21-si-modes.md` |
| AC-22 | H6 | U14, R05, R06 | `validation/reports/AC-22-si-disclosure.md` |
| AC-23 | H5 + H6 | U06, U12 | `validation/reports/AC-23-learning-levels.md` |
| AC-24 | H6 + H2 + H3 | D17, U15–U17 | `validation/reports/AC-24-investigations.md` |
| AC-25 | H2 | D04–D16 | `validation/reports/AC-25-cube-build.md` |
| AC-26 | H2 | D10 | `validation/reports/AC-26-giovanni.md` |
| AC-27 | H2 | D12 | `validation/reports/AC-27-appeears.md` |
| AC-28 | H6 | R02, R03 | `validation/reports/AC-28-offline.md` |
| AC-29 | H2 + H1 | D02, A05, U14 | `validation/reports/AC-29-export-lineage.md` |
| AC-30 | H3 | S13 | `validation/reports/AC-30-calibration.md` |
| AC-31 | H2 + H3 | S14 | `validation/reports/AC-31-paper-reproduction.md` |
| AC-32 | H1 + H6 | F06, R06 | `validation/reports/AC-32-secret-scan.md` |
| AC-33 | H5 + H6 | U18, R03 | `validation/reports/AC-33-keyboard-motion.md` |
| AC-34 | H6 | F06, R06 | `validation/reports/AC-34-licences-citations.md` |
| AC-35 | H1 + H6 | R01, R07 | `validation/reports/AC-35-local-release.md` |

## Open gates and decision owners

| Gate | Owner | Required by | Current evidence / next action |
| --- | --- | --- | --- |
| Human walkthrough, actual names and scientific review capacity | H1 / H6 | F01 acceptance and before respective merges | Provisional roles authorized; named review and team walkthrough pending |
| Current event guide and registered-event details | H6 | Before official-event execution / R09 | Current guide fetch failed; practice-only status confirmed |
| Reference laptop and geographic benchmark review | H1 / H2 / H3 / H4 | Before R04 / AC-12 | Provisional inspected laptop and fixed inputs above; no performance or eligibility assertion |
| Source authentication, quota, actual headers and transfer budget | H2 | F05, before bulk jobs | Not attempted; user-local Earthdata configuration needed later, never passwords in chat/Git |
| Numerical conventions, primary equations and paper boxes/window | H3 / H2 | F04 and before inferential outputs | Not verified; no science implemented |
| Setup, tests, dependency licence review and client secret check | H1 / H6 | F02 review | Local checks below passed; human rerun and full F06/R06 audits pending |
| Application/release licence | H1 / team | Before redistribution / R06 | Repository has no project licence; do not infer a licence from dependency licences |

## AI assistance disclosure

Codex read the approved documents, inspected Git/runtime metadata, researched official sources, prepared the F01 ledger and authored the selected F02 foundation/tests. No AI-generated imagery, scientific observations, statistical results or NASA data have been created. Human review is pending. This development record is an input to the future CMP-3/AC-22 disclosure page, not evidence that the page exists.

For the separately authorized F03 task, Codex reread the relevant documents/code, authored the Pydantic contracts, export/generation scripts, synthetic structural fixtures, verification and decision notes. One implementation agent was used. Generated fixture numbers are disclosed test-shape values, not calculated environmental or statistical results. No NASA request or statistical algorithm was executed.

For F04, Codex authored validation-only mathematical fixtures, independent references, focused tests and method/source registers. Existing system PyMuPDF rendered retrieved public papers for visual inspection. Synthetic reference statistics were calculated and labelled; no NASA observations or production science algorithms were created. Human scientific acceptance remains pending. This task used one implementation agent.

## F02 verification evidence

Verified on 14 November 2026 on the reference development machine with Node 24.19.0, pnpm 12.18.0, Python 3.13.15 and uv 0.12.9. A fresh directory exported from the Git index had no virtual environment or node_modules; it successfully ran the documented setup and checks. Shared download caches were retained. This demonstrates a clean environment recreation on this Windows machine, not cross-platform acceptance.

| Check | Actual result |
| --- | --- |
| `python scripts/dev.py setup` in clean export | PASS: new Python environment and frontend dependencies installed using both frozen lockfiles |
| `python scripts/dev.py check` in clean export | PASS: Ruff lint/format, strict mypy (6 files), TypeScript, 8 pytest tests, 7 Vitest tests and Vite production build |
| `python scripts/dev.py browser` in clean export | PASS: 2 real Chromium tests; React → Vite proxy → FastAPI health, plus failure/retry by keyboard at 390 px with no horizontal overflow |
| Built application | PASS: 17 modules; JavaScript approximately 221.68 kB / 69.53 kB gzip; no scientific layers or dataset assets |
| Credential-pattern scan | PASS: 39 indexed/build paths, zero findings for selected GitHub/AWS/JWT/private-key patterns; this is a limited pattern check, not final AC-32 certification |
| Dependency inventory seed | 29 installed Python dependencies and 98 Node packages recorded in DEPENDENCY_LICENSES.md; final build/platform/notices audit remains F06/R06 |
| Approved document preservation | SRS, TDD and Implementation Plan unchanged by F01/F02 |
| Server lifecycle after browser tests | No listeners remained on local ports 8000/5173 |
| Occupied-port negative check | PASS: a temporary listener on 8000 caused startup to exit with code 1 and a clear error before starting services |

The current Starlette TestClient emits one upstream deprecation warning for its `httpx` compatibility path. The HTTP tests pass; migration to its preferred test transport can be assessed in F06. Playwright also reports inherited terminal colour-variable warnings, with both browser tests passing. No warning is suppressed to claim a clean run.

**Scientific validation:** NOT STARTED. No NASA data were retrieved, no statistical calculations implemented and no AC-01–35 criterion passed by these foundation checks. Remaining F01 acceptance includes the human walkthrough and the unresolved decisions above. Next proposed implementation task after review: F03, with F04/F05 available as separate human-led workstreams once their gates are met.

## F03 changes and verification evidence

The attached follow-up explicitly authorized implementation of F03 and superseded the previous turn's task stop restriction. The dedicated branch starts from the verified F02 commit; outstanding F01/F02 human-review/merge gates are preserved. Scope is contracts and verification only. No additional operational endpoint, statistical algorithm, NASA acquisition, spatial computation, storage, job execution or visualization was implemented. Runtime health behavior remains `analysis_ready: false`.

Implemented `RegionSpec`, dataset identity/units/transforms, monthly/annual `Series`, versioned requests, estimates/tests/grades/FDR context, analysis/scan/Outlook/comparison results, layer manifests, provenance, job/accepted-job records, capabilities and structured problems. **22 public contracts plus supporting definitions and existing health produce 77 exported OpenAPI components.** `paths` contains only `/api/v1/health`. Detailed field decisions and owner review points are in [CONTRACTS.md](CONTRACTS.md).

The generated artifacts are `contracts/openapi.json` and `web/src/contracts/generated.ts`. `python scripts/dev.py contracts` regenerates them; `python scripts/dev.py contracts-check` compares in memory without writes, and is part of `check`. The generator's TypeScript 5.9.3 peer is isolated at the workspace root; the application keeps TypeScript 7.0.2 and strict peer validation. No Python dependency changes were needed. The refreshed licence seed records 29 installed Python dependencies and 129 Node package/version entries, selecting MIT for the dual MIT/CC0 type-fest dependency.

Verified on 14 November 2026 with the existing pinned Windows environment:

| Exact check / evidence | Actual result |
| --- | --- |
| `npx --yes pnpm@12.18.0 install --lockfile-only`, then `install --frozen-lockfile` | PASS: new generation-tool dependencies resolved and installed; lockfile updated |
| `python scripts/dev.py contracts` | PASS: both artifacts generated from the authoritative Python models |
| `python scripts/dev.py contracts-check` | PASS: current schema/types match fresh expected content; no output written |
| `python scripts/dev.py check` | PASS: drift check, Ruff lint/format, strict mypy on 17 source/test files, TypeScript consumer compilation, 156 pytest tests, 7 Vitest tests, 6 real Node generator/drift tests, and production build |
| `python scripts/dev.py browser` | PASS: 2 Chromium tests exercising unchanged real health connectivity and keyboard retry on a narrow layout |
| Synthetic specimens | 44 disclosed valid JSON specimens covering all public contracts and states; 16 invalid delta specimens with expected validation errors; additional parametrized invariants/boundaries |
| Deliberate drift | Enum, unit, nullability, generated TypeScript and missing outputs all failed as expected in isolated temporary output directories, with no repair/mutation in check mode |
| Determinism | Two real generations produced identical OpenAPI/TypeScript content; subsequent check preserved output modification times |
| Source preservation | Approved SRS, TDD and Implementation Plan unchanged |
| Precommit checks | PASS: whitespace check and selected credential-pattern scan across 101 indexed/build paths with zero findings; limited check, not final AC-32 certification |
| Runtime boundary | Health test remains false for analysis readiness; export added no operational paths; no listeners remained on 8000/5173 after browser verification |

Existing upstream Starlette/httpx TestClient and terminal colour-variable warnings remain visible; checks pass without suppressing them. Generated artifacts are approximately 180 KB OpenAPI and 91 KB TypeScript on this tree. The runtime production bundle remains approximately 221.68 KB JavaScript / 69.53 KB gzip: generated contracts and fixture data add no product payload.

**Limitations and review gates:** model validation proves structure/internal consistency, not authentic metadata, matching artifact/family hashes, geometry topology, scientific eligibility, numerical accuracy or valid uncertainty. F04 still owns gap-aware Hamed–Rao, Sen CI/rank conventions, OLS calibration, Weatherhead sampling and paper details; F05 still owns genuine source/header/auth/quota evidence. H1/H2/H3/H5 must jointly review contracts/examples, including estimator/branch identity, different-window FDR context and explicit reasons; H6 independently reruns checks. F03 is REVIEW, not DONE or scientific acceptance. No credentials are required for this task. Next recommended task: human-led F04; F05 source preflight and F06 quality automation can be assigned separately according to their dependencies, after review/authorization.

## F04 reference foundation and actual evidence

The user explicitly authorized F04 only and approved an isolated `validation/` environment: NumPy 2.5.4, SciPy 1.18.1, pyMannKendall 1.4.3, pytest 9.2.0, Python 3.13.15 and its own `uv.lock`. Shared application dependencies/lockfiles and F03 contracts remain unchanged. Issue [#5](https://github.com/Iris-NASC26/earth-system-trend-detective/issues/5) is the task record. The user confirmed H3 remains provisional and the formal GitHub reviewer should stay unassigned for now; no direct reviewer notification is claimed.

The [reference guide](../validation/README.md) describes independent exact/analytic examples and matrix/library comparisons, fixed inputs/seeds/tolerances, explicit unavailable methods and rerun commands. There are **13 synthetic series fixtures**, exact BH/weight families and **6 dimensional unit cases**. Every case discloses generation and limitations. Reference functions import no application algorithms or schemas; tests verify that independence and that the isolated environment has no installed `earth_trend` package. They must never become production imports.

Implemented references support calendar midpoints/gaps, baseline climatology/monthly/annual anomalies, actual-time Sen point slopes, matrix OLS/R²/F/p and iid slope intervals, ordinary MK/ties, a restricted HR library comparator, supplied-rho effective-df algebra, exact BH and area-weighted support. The fixed OLS/rank/weight/FDR expectations are independent mathematical constants, not copied production output. The HR library uses index-based detrending, so its correction is explicitly **not** declared equivalent to the TDD's actual-time detrending.

Primary-source evidence:

- Acker NTRS PDF SHA-256 `5209cee13b536f0b4df59b6e4fac9f631fafd1458f1e4d936d2cfab5edda0ab3`: visual checks of pages 4/17/22 confirmed boxes, Table 5 source p/signs and the candidate date interval. Discrepancies/footnotes remain recorded; this is not SeaWiFS reproduction.
- Santer PDF SHA-256 `32236286c58b1fbd560d0f198cf1eb8f1a6d9d66fb8f818754f7e6543b79234f`: visually inspected printed pages 7343–7344 for the effective-n/adjusted variance/df conventions. Calibration and residual-ACF normalization remain provisional.
- Hamed–Rao publisher full text returned 403. Weatherhead primary text was available, but equation rendering/download failed; no unverified horizon formula is implemented. Exact anchors and access limits are in `validation/reference/sources.json`.

The [method register](../validation/fixtures/method-gates.json) uses VERIFIED for established facts/arithmetic only; PROVISIONAL for approximations/applicability; BLOCKED for unsupported methods/evidence. It does not confer human approval or set F03 methods to validated. Gap-aware HR and autocorrelation-adjusted Sen CI explicitly remain unavailable. Weatherhead, complete calibration and authentic paper reproduction also remain blocked. The reference year ruler (explicit 365.2425 days/year) requires H3 agreement before production.

| Exact verification command / evidence | Actual result |
| --- | --- |
| `uv --directory validation sync --locked` | PASS: approved isolated pins installed; neither application lockfile changed |
| `uv --directory validation run --locked pytest` | PASS: **71 reference tests**; no production imports, deterministic fixtures, finite/invalid/missing input checks, hand/library agreement, explicit blocked methods |
| `uv --directory validation run --locked python -m reference.build_fixtures --check` | PASS: deterministic fixture generation, no write |
| `uv --directory validation run --locked python -m reference.run_checks --check` | PASS: **28 recorded numerical/reference invariants** and identical report for this pinned environment; no write |
| Existing Ruff / mypy commands in reference README | PASS: lint/format and strict mypy for 5 reference/test source files |
| `python scripts/dev.py check` | PASS: unchanged contract drift check, lint/format/type checks, **156 backend, 7 Vitest, 6 generator tests**, and Vite production build |
| `python scripts/dev.py browser` | PASS: **2 Chromium tests**, existing real health behavior and keyboard recovery |
| Scope preservation | Approved SRS/TDD/Implementation Plan, application code/contracts, and both shared lockfiles unchanged |
| Precommit hygiene | PASS: whitespace and selected credential-pattern scan across 116 indexed/build paths, zero findings; limited check rather than final AC-32 certification |

The committed report binds fixture/reference/test/source/lockfile hashes and tool versions. Its flags explicitly say full SM-12 and NASA reproduction **NOT_RUN**, human sign-off **PENDING**. Existing application TestClient/terminal-colour warnings remain visible; no warning was suppressed to declare scientific validity.

Remaining acceptance: H3 and an independently qualified human must review conventions, references and source transcriptions; H6 reruns decisive checks; H1 integrates in dependency order. NumPy's declared bundled CC0 component and SciPy wheel notices are recorded in the validation-only licence inventory: review them against CMP-1 before any runtime/release reuse, without claiming AC-34 passed. No Earthdata credentials were accessed/requested and no observation downloads occurred.

**F04 is REVIEW with blocked scientific gates, not DONE.** Next action is human scientific review and resolving the F04 gate register before affected production methods. Do not automatically begin F05, F06 or S01.

## F05 provider preflight and local preview

The subsequent user request authorized running the current app and starting F05,
then explicitly requested merge after completion. The existing Vite instance was
reused and the FastAPI backend started on loopback. Real Chromium checks confirmed
React→Vite proxy→FastAPI, the explicit analysis-unavailable message, keyboard
failure/retry recovery and a 390 px layout with no overflow or JavaScript errors.
The app remains a foundation preview at `http://127.0.0.1:5173/`, not a working globe
or scientific analysis UI. Both servers are deliberately left running for the user.

The user configured external `.netrc` credentials, completed service authorization,
and approved B01/B02 January 2005 AppEEARS probes. An optional empty token file was
created under `%LOCALAPPDATA%\EarthTrendDetective\secrets\.env` with private ACLs.
No credential is in this ledger, Git, browser code or source/data manifests.

The [F05 report](../validation/reports/provider-preflight.md) and JSON evidence
record authentic POWER chunk/coordinate/point reads, eight protected source-range
checks, seven HDF5 header inspections, a real Giovanni CSV/map, a successful HOSS
subset and two completed AppEEARS NDVI/QA tasks. Exact source identities, actual
units/fill/calendars, job IDs, request parameters, elapsed times and hashes are
preserved. Source/field mismatches and failed probes remain visible. No production
adapter, cube, scientific engine, job runner, endpoint, chart or release was added.

Technical findings: POWER C/solar units and source filters confirmed; no future
time-axis value becomes an observation; GPCP's actual field is `sat_gauge_precip`;
OMI attributes are case-sensitive; IMERG source calendar is Julian; AIRS raw HDF4
is distinct from its verified Giovanni GeoTIFF. Raw-provider and HOSS GLDAS subsets
match by decoded hash, and the independently weighted mean matches Giovanni within
0.0000014 kg/m². These are sample-specific checks, not full product validation.

Both AppEEARS tasks returned raw integer TIFFs with scale 0.0001, while CSV means
are already scaled and include cloud/snow/marginal pixels. This confirms the
approved QA-raster/local-calculation path is needed. B01/B02 remain engineering
benchmarks, not silently selected product presets; no monthly eligibility is
inferred from a successful request.

| Verification | Actual result |
| --- | --- |
| Offline transport/redirect/range/path/budget checks | PASS: 32 unittest cases, no NASA requests |
| Isolated codec/calendar/NDVI format checks | PASS: 7 cases with disclosed synthetic fixtures |
| Ruff lint/format and strict mypy | PASS: focused F05 checks; strict mypy on 7 tool/test source files |
| Existing `python scripts/dev.py check` | PASS: contract drift, types/lint, 156 backend, 7 Vitest, 6 generator tests and Vite build |
| Real local browser | PASS: health connectivity, unavailable-science label, keyboard recovery and narrow layout |
| Genuine provider probes | Outputs retrieved, checksummed and inspected; exact evidence in F05 report |
| Existing F04 references | PASS: 71 tests and both deterministic fixture/report checks; no writes or scientific sign-off |
| Limited precommit secret check | PASS: 130 indexed/untracked/client-build paths; selected token/key patterns and exact configured private values had zero findings; not final AC-32 |
| Scope | Approved documents, application code/contracts and shared locks unchanged; F04 environment untouched |

F05 tools have a separately locked environment and [licence inventory](../validation/preflight/DEPENDENCY_LICENSES.md).
Pillow is used only for read-only format inspection; runtime GIS selection remains
rasterio. NumPy/bundled-notice review remains a release gate, as already recorded
for F04. No CMP-1/AC-34 certification or scientific sign-off is implied.

The access preflight is technically complete. **F05 remains REVIEW pending human
domain acceptance**, independently of the user's explicit code-merge direction.
The observed cold AIRS-map latency would give about 20.2 hours for the 287-month
sizing scenario if serial; PERF-5/bulk-build feasibility has not passed. Complete
windows, source citations, QA/support/masks and safe batch capacity remain
downstream admission/feasibility gates. AC-25–27 and all inference/calibration
acceptance remain unpassed. F06/S01 and other implementation tasks were not started.

Codex authored the F05 tools, tests and sanitized evidence and performed the
explicitly authorized probes as one implementation agent. No delegated agent or
Devin task was started. Synthetic test-format bytes are disclosed; environmental
sample values come from NASA source/service outputs. No scientific sign-off,
full acceptance, eligible-event development or completed product feature is claimed.
