# ADR-001 — Next.js frontend and selective Navida integration

**Status:** Approved by the user's explicit instruction on 14 November 2026,
Asia/Colombo: “we're moving from vite to next.js … after that integrate his work with mine”.

## Decision

Use pinned Next.js 16.4.6 App Router in `web/`, retaining React 19.3.1 and TypeScript.
Next.js owns page/layout routing, frontend rendering and a narrow same-origin API
boundary. FastAPI remains the authoritative scientific/backend application with
Pydantic/OpenAPI-generated TypeScript contracts. Three.js/globe.gl remains the
selected future renderer. No dataset or scientific-method change is approved here.

The practical reason is compatibility with Navida's native Next.js work and the
team's chosen frontend direction. This is not a claim that Next.js is universally
better or faster for scientific visualization. It adds a Node server to the full
local release and a server/client hydration boundary that must be tested.

SRS v0.4 DEP-01, TDD v0.4 and Plan v1.1 receive targeted architecture/topology
amendments; the original backlog and scientific acceptance requirements are retained.
Local hosting is still the target. No Vercel account or public compute is provisioned.

## Integration

Branch `feat/U01-nextjs-navida-integration` builds on the reviewed U01 port at
`1fbdab0`, with Navida source pinned to `cabc793`. Use App Router pages/layouts,
`next/link`, `usePathname`, `useRouter` and Suspense-wrapped query selection.
Preserve the source attribution and reuse ledger in `docs/NAVIDA_INTEGRATION.md`.

Port Navida's public PageShell, PublicNavbar, InfoCard and About composition, adapting
content/actions to actual capabilities. Landing, Platform, Methodology and Data
pages reuse these patterns. Exclude source marketing statistics, generated global
cube values, fixed validation badges and unverified story findings. The source
branch remains intact; no wholesale unrelated-history merge is performed.

SSR and initial hydration use deterministic preference defaults. Browser storage
is read after mount; it contains only view preferences. No scientific arrays or
credential state is added to React.

## Local operating and security boundary

- Browser origin stays `http://127.0.0.1:5173`; FastAPI stays on port 8000.
- Only the implemented health route is proxied to a fixed local backend URL.
  No arbitrary upstream URL, browser credentials, provider tokens or cookies are
  forwarded. Health is uncached; failures return 503 instead of fake readiness.
- The Next.js Proxy checks Host and Origin against fixed loopback values. Backend
  Host/Origin checks remain intact. Both runtimes bind to loopback.
- The private `.env` remains ignored in the repository root. Next.js is launched
  with `web/` as its application directory; it does not load that parent file.
  No configuration exports env values or passes secrets as serialized props.
  Never put secrets in `NEXT_PUBLIC_`, `next.config`'s `env`, or `web/public/`.
- The launcher disables Next telemetry and uses `.next-dev` for development and
  `.next` for production builds. Both are ignored. Windows cleanup must terminate
  the owned frontend process tree so a Next child cannot retain the port.
- Vitest uses Vite internally only as a test runner. Vite/React Router application
  entry/configuration and direct dependencies are removed.

## Acceptance and remaining release work

Verify type checks, contract drift, unit tests, real Next/FastAPI browser journeys,
direct URL/reload/back behavior, saved preferences without hydration errors, local
security rejection, missing routes, production build and local production startup.
Scientific readiness remains false. Public pages and interface tests do not certify
NASA-series eligibility, inference, global rendering or forecast skill.

R01/R07 must package the Node frontend alongside the Python backend, including
start/stop/restart and offline operation. R02 must separately build/verify the
limited static snapshot; the default Next build contains a dynamic health route
and Proxy and is not a standalone static snapshot. No automatic static-export
compatibility or completed release acceptance is claimed.

Dependency metadata adds caniuse-lite browser-compatibility **data** under CC-BY-4.0
and a Windows Sharp binary with Apache-2.0/LGPL-3.0-or-later notices. The user
explicitly approved a narrow attribution exception for ancillary browser data on
14 November 2026. SRS CMP-1/AC-34 now name that exception while retaining OSI-only
software libraries. The data is unmodified by this project; its upstream repository,
package-author credit, licence link/copy and exception appear in the inventory and
methods page. This does not certify the full final release licence/notice audit.
Check all required notices, including the prior react-remove-scroll-bar notice item,
in F06/R06. Development/build verification is separate from release acceptance.

Sources: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation),
[server/client components](https://nextjs.org/docs/app/getting-started/server-and-client-components),
[environment variables](https://nextjs.org/docs/app/guides/environment-variables),
[Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy),
[Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest), and the matching
guides shipped under `web/node_modules/next/dist/docs/`. The generated `web/AGENTS.md`
is retained as supplied by Next.js; it requests consulting those versioned guides.
