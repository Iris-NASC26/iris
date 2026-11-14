# Selective integration of Navida's Iris contribution

Reviewed and implemented 14 November 2026, Asia/Colombo. Practice build only.

## Latest amendment ? native Next.js integration

The user superseded the earlier Vite decision with Next.js on 14 November 2026.
[ADR-001](decisions/0001-nextjs.md) records that explicit authorization and the
local Node/FastAPI topology. Branch `feat/U01-nextjs-navida-integration` extends
`1fbdab0` with native App Router pages/layouts/navigation plus further source reuse:

| Navida source | Integrated work |
| --- | --- |
| `src/components/layout/PublicNavbar.tsx` | Public navigation, actual routes, theme toggle and Radix mobile dialog |
| `src/components/layout/PageShell.tsx` | Shared public header, hero, footer and capability/liveness display |
| `src/components/layout/InfoCard.tsx` | Attributed direct information-card port |
| `src/app/about/page.tsx` | About/mission/principles/audience composition with truthful current-scope copy |
| `src/app/platform/page.tsx` | Workflow-card pattern, excluding invented numeric product demonstrations |
| Public data/methodology patterns | Planned sources and evidence pages reuse our approved metadata/explanations |

The workspace, contracts, preflight tools and source/science exclusions below are
preserved. UI reuse is broader; it does not make D01/S01?S14, the global cube,
forecasts, scientific stories or release packaging complete. No original marketing
statistics or unsupported validation badges are imported. Historical sections below
describe the first port; references to Vite/React Router there are superseded.

## Original decision and source snapshots

The user approved porting useful UI into the existing Vite/FastAPI/Three.js design,
prioritizing a visible workspace with truthful availability. No architecture change,
wholesale merge or scientific waiver is authorized by this integration.

- Baseline: `main` at `553680e12bb77856750b1c5dd6f6c7a4e5857a22`.
- Source: `initial-navida` at `cabc7938bd4cd249389df2b4156109c19338953e` (`data-analysis`),
  including its initial commit `68c5315`.
- Working branch: `feat/U01-navida-workspace`, created from the main baseline.
- The two source histories have no merge base. The source branch is preserved intact.
- Authority remains SRS v0.3, TDD v0.3 and Implementation Plan v1.0. Navida's separate
  integrated-v1.0 specification/context is not adopted as a replacement.

## Contribution and implemented scope

Credit: **Navida Jayaweera**, Project Iris. His workspace frame, grouped navigation,
theme-persistence pattern, skippable four-step tour, source flashcards and data-preview
patterns informed this port; his SVG icon component was copied with attribution.
Next.js routing/context integration was adapted to our React Router and generated
contract types. Styling was reduced/reworked from the Iris visual vocabulary rather
than importing the 13,000-line global stylesheet or remote fonts.

| Source file/pattern | Integrated destination | Change needed |
| --- | --- | --- |
| `src/app/workspace/layout.tsx` | `web/src/features/workspace/Workspace.tsx` | React Router, approved navigation, capability banner, keyboard focus and mobile Radix drawer |
| `src/context/ThemeContext.tsx` | `web/src/state/preferences.tsx` | View-only preferences, new namespaced storage, storage-failure handling; no extraction/credential state |
| `src/components/dashboard/OnboardingTour.tsx` | `web/src/features/workspace/OnboardingTour.tsx` | Retained four-step pattern; truthful current scope; Radix focus management; optional replay |
| `src/components/ui/Icon.tsx` | `web/src/components/ui/Icon.tsx` | Attributed direct port; no new icon library |
| Data-selection cards / preview workflow | `web/src/features/catalog/`, `web/src/features/preview/` | SRS-aligned planned products, generated identifier/unit types, explicit empty state; no provider calls |
| Information cards, space/emerald styling | Overview/evidence components, `web/src/styles/base.css` | Responsive system-font styling, decorative non-data sphere, no fabricated numeric results |

The approved 13-variable presentation list is **not D01's validated binding/caveat registry**.
F05-confirmed field/unit clarifications are reflected in copy (for example GPCP
`sat_gauge_precip`, POWER Celsius and NDVI scaling). Acquisition, QA policy, complete
record windows, source evidence and admitted availability remain backend work.

No invented series is bundled. The F03 synthetic fixture is imported only by a test
of the typed observation-table component. Runtime preview remains empty. Analysis,
Case Board and globe screens show unavailable states. The decorative overview sphere
has no scientific values and is hidden from assistive technology; it is not U03.

## Future-task reuse ledger

This table records useful material, not completed task credits. Each original task
still requires its own dependencies, acceptance evidence, testing and human review.

| Plan tasks | Reusable work / current credit | Outstanding before acceptance |
| --- | --- | --- |
| U01 | Workspace navigation, theme, explanation levels, tour, reduced-motion and responsive frame ported | Human UI/accessibility review; remaining approved shared UI system integration as consumers need it |
| U02 | Health loading/error/retry preserved; selected variable survives URL reload | Real HTTP/snapshot provider, capability validation, pending/cancel/race handling and snapshot limits |
| U04 / U12 | Inspection layout and typed table; source chart layouts remain candidates | Authentic series, chart/table agreement, all significance outputs, baseline/window controls, supported views |
| U06 / D01 | Planned V01–V13 browsing, themes, search and source flashcard | Admitted backend catalog, full caveat registry, sphere browsing, deterministic guided discovery and glossary coverage |
| U07 / D14 | Original map drawing is reference material only | Preserve actual polygon instead of bounding-box substitution; geodesic overlaps/dateline/poles/global coverage; approved renderer integration |
| U03 / U08 / U09 | Globe panel layouts may guide later controls; no scientific globe port | Three.js/globe.gl, GIBS attribution/offline texture, 64,800 cells, real layers/picking/relief/year frames and benchmarks |
| U10 / U11 | Case Board/comparison panel layouts remain candidates | Real weighted regional series, eligibility, complete-family FDR and paired difference uncertainty |
| U13 / S11 / S12 | Outlook layout can be adapted | Prediction intervals, rolling-origin 12–24-month evaluation and both approved baselines; no-skill gate |
| U14 | Explanation patterns, contribution/AI disclosure and methods presentation ported partly | Running provenance graph, actual versioned validation reports, credits/licence release evidence |
| U15–U17 / D17 / S14 | Story renderer/card structure may be adapted | The three approved investigations and authentic Giovanni evidence; original LA/Amazon/Himalaya findings are not substituted |
| D04 | POWER monthly parser is a candidate; one saved point series independently checked | Approved Zarr binding, calendar/grid/unit/QC/coverage/provenance, bounded acquisition and independent aggregation |
| D05 / D10 / D12 | CMR/AppEEARS catalog and Giovanni parsing code are candidates | Approved routes, secure redirect/auth handling, quota gates, durable jobs, genuine QA-aware outputs |
| D02 / D03 | Request/result identity ideas can inform implementation | Approved SQLite/artifact design, complete keys, atomic writes, restart/corruption/cancel behavior; JSON store not imported |
| S01–S10 / S13 | Isolated helper code and tests may be studied | Independent numerical comparisons, corrected gap/CI/OLS/FDR conventions, calibration and qualified scientific approval |
| P1/P2 features | NOAA, SI chat, research/code-sandbox and other provider code preserved on source branch | Explicit scope/priority review; not part of this P0 UI integration |

## Scientific exclusions and evidence

Source inspection found generated cube slopes/p-values/q-values/intervals and regional
coverage in both `backend/services/cube_service.py` and `src/lib/srsCubeAndScienceEngine.ts`.
`q = p × 1.35` is not the approved BH-family calculation. Fixed validation-registry
"PASSED" measurements have no matching committed reproduction evidence. Those modules,
the hard-coded story findings, manifests and badges are excluded.

The latest scientific OLS helper, isolated with NumPy/SciPy, returned slope 20/decade,
t=0, p=1 and CI [20,20] for `x=0..9`, `y=2x`; this degeneracy needs correction.
Hamed–Rao compresses missing time positions and clips the correction; Sen intervals
do not implement our corrected variance; OLS uses the MK-derived effective n; FDR
mixes methods/months; forecast validation differs from approved rolling origins.
No statistical code is admitted by passing UI tests.

Provider review also found centroid sampling for boxes, polygon-to-box conversion,
sampled OPeNDAP granules with default product substitution, and Open-Meteo ERA5
retrieval behind some Copernicus/EODAG paths. Source identity and full sampling support
must be corrected before those adapters can be used under the approved data rules.

There are 27 saved extraction records at the source commit; their stored row hashes
match, which demonstrates internal consistency only. One saved NASA POWER T2M point
record was independently re-requested: all 84 months (2018–2024) matched exactly in C.
This limited public check does not authenticate the other records or validate regional
statistics. The original store is preserved only on the source branch, not bundled.

## Credentials and verification boundary

The user's existing external `.env` was moved unchanged into the ignored project root;
its pre/post file hashes matched (hash/value not published). ACL allows current user
and SYSTEM. Existing `.gitignore` already excludes it. The user-requested relocation
is the only secret-file change; no key was copied into a tracked file or browser state.

Vite dotenv loading is disabled. Only the explicitly invoked F05 preflight reader
understands the project token location, with environment/legacy/netrc fallbacks.
It reads only the Earthdata key and never exports or evaluates the other settings.
Gemini/NOAA/other credentials do not activate unimplemented integrations.

Verification results are recorded in [the execution ledger](EXECUTION_STATUS.md).
SRS/TDD/Implementation Plan and generated scientific contracts remain unchanged.
No additional provider job, bulk build, forecast, scientific readiness change or
scientific sign-off is performed by this integration.
