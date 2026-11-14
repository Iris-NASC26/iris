# Execution status — F01/F02

**Updated:** 14 November 2026, Asia/Colombo.  
**Context:** Practice build outside the official submission, explicitly confirmed by the user. Do not represent this work as eligible event-period development.  
**Approved baseline:** SRS v0.3, TDD v0.3, Implementation Plan v1.0; commit `4b6046a`.  
**Branch:** `feat/F02-local-foundation`. Baseline PR: [#1](https://github.com/Iris-NASC26/earth-system-trend-detective/pull/1).

This ledger records execution without rewriting the approved documents. The user has authorized implementation and provisional H1–H6 roles. Local hosting remains the target. Only F01 and F02 are selected in this change. No additional product feature or architectural change is proposed.

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
| F03 — Versioned scientific/API contracts | P0 / TODO | H1 + H2/H3/H5 / consuming leads | F01; F02 for generation | Pydantic/OpenAPI, generated TypeScript and labelled state fixtures; not started |
| F04 — Independent scientific oracles and gates | P0 / TODO | H3 / independently qualified H2 or other human | F01 | Independent derivations, fixed fixtures/tolerances, primary-paper checks; not started |
| F05 — NASA access and transfer preflight | P0 / TODO | H2 / H1 + H3 | F01, user-local Earthdata configuration | Genuine bounded source samples, quotas and storage/time estimates; not started |

F01/F02 can become REVIEW after local verification, but cannot become DONE before human approval, dependency-ordered merge and post-merge smoke checks (plan D0). Do not start F03–F05 in this execution.

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
