# UI Redesign — Detailed Change Log

> Chronological log of all design system & UI redesign changes applied to Project Iris.
> Every entry verifies that Next.js component code, React hooks (`useEffect`, `useState`, `useCallback`, `useMemo`), props, DOM structure, and box-model dimensions remain completely unaltered.

---

## [2026-11-15 14:48] Phase 0 & Phase 1 — HeroUI v3 Token Foundation & Workspace Dashboard Layout Redesign

### 1. Summary
- Completed the full architectural audit and HeroUI v3 design system specification in `ui-redesign/` (`00-MASTER-PLAN.md` through `06-QA-AND-VERIFICATION.md`).
- Created `src/styles/iris-theme.css` implementing the HeroUI v3 semantic CSS variable architecture (`--background`, `--foreground`, `--surface`, `--surface-secondary`, `--surface-tertiary`, `--overlay`, `--default`, `--accent`, `--accent-foreground`, `--accent-soft`, `--accent-soft-foreground`, `--accent-hover`, `--focus`, `--border`, `--border-secondary`, `--separator`, `--surface-shadow`, `--overlay-shadow`, `--field-*`, `--radius-*`, `--ease-*`) customized with Iris's signature Emerald & Green-Tinted Neutral palette in both **Light** and **Dark** modes, while aliasing 100% of legacy Iris variables (`--bg`, `--panel`, `--card`, `--card-soft`, `--border`, `--border-strong`, `--text`, `--muted`, `--faint`, `--green`, `--green-bright`, `--green-soft`).
- Redesigned the **Workspace Dashboard Layout** (`src/app/workspace/layout.tsx` styles in `src/app/globals.css`), including the collapsible sidebar, navigation items, top header bar, context chip, mobile drawer, onboarding tour modal, and floating AI assistant.

### 2. Files Created / Modified
- **Created:**
  - `src/styles/iris-theme.css` (HeroUI v3 semantic theme tokens + Iris Emerald light/dark palettes + Tailwind v4 `@theme inline` bridge)
  - `ui-redesign/README.md`
  - `ui-redesign/00-MASTER-PLAN.md`
  - `ui-redesign/01-DESIGN-SYSTEM.md`
  - `ui-redesign/02-FUNCTIONALITY-GUARDRAILS.md`
  - `ui-redesign/03-CODEBASE-AUDIT.md`
  - `ui-redesign/04-TOKEN-MAPPING-AND-THEME.md`
  - `ui-redesign/05-HEROUI-COMPONENT-ADOPTION.md`
  - `ui-redesign/06-QA-AND-VERIFICATION.md`
  - `ui-redesign/logs/TASK-TRACKER.md`
  - `ui-redesign/logs/DECISIONS.md`
  - `ui-redesign/logs/CHANGELOG.md`
  - `ui-redesign/logs/_TEMPLATE-log-entry.md`
  - `ui-redesign/reference/heroui-default-theme-DESIGN.md`
  - `ui-redesign/reference/test-selector-contract.txt`
- **Modified:**
  - `src/app/globals.css` (Imported `../styles/iris-theme.css`; updated lines `1–260`, `4386–4911`, `6523–6588`, and `14361–14596`)
- **Untouched (Verified via `git diff`):**
  - `src/app/workspace/layout.tsx` — **0 lines changed** (all `useState`, `useEffect`, `useCallback`, `usePathname`, `useDashboard`, `useTheme` hooks and JSX markup are 100% identical).
  - `src/components/dashboard/OnboardingTour.tsx` — **0 lines changed**.
  - `src/components/dashboard/IrisAssistant.tsx` — **0 lines changed**.

### 3. Code & State Parity Check (`Next.js` Guardrails)
- [x] `git diff` on `.tsx` / `.ts` files is empty (zero React hooks, `useEffect`s, states, props, or JSX markup altered)
- [x] No CSS layout / box-model properties (`width`, `height`, `padding`, `margin`, `gap`, `grid`, `flex`, `font-size`, `line-height`) modified on any existing selector
- [x] All existing class names, `aria-*` attributes, and DOM selectors preserved
- [x] Light and dark mode emerald palette tokens verified for WCAG AA contrast

### 4. Selector-by-Selector Design Changes (`src/app/globals.css`)

| Selector Group | Previous Style | Updated HeroUI v3 Style |
|----------------|----------------|-------------------------|
| `:root`, `body`, `.app-shell` | Raw hex variables (`--bg: #fff`, `--panel: #f7f8f7`, etc.); focus outline only on `button, a, input` | Backed by `src/styles/iris-theme.css` OKLCH & hex semantic tokens (`--background`, `--foreground`, `--surface`, `--surface-secondary`, `--surface-tertiary`); focus ring (`2px solid var(--focus)`) extended to `select, textarea, [role="tab"]`; antialiased font smoothing |
| `.brand-mark`, `.orbit-dot` | Flat `#097c5a` fill | Rich emerald gradient (`linear-gradient(145deg, #0b8a64 0%, #097c5a 60%, #065f46 100%)`) with subtle inner top highlight (`inset 0 1px 0 rgba(255,255,255,0.22)`) and soft emerald elevation |
| `.theme-toggle`, `.icon-button`, `.sidebar-collapse`, `.sidebar-mobile-close`, `.dashboard-menu-trigger` | Flat `--card` background, hover `--card-soft`, no press feedback | HeroUI v3 Outline IconButton recipe: `background: var(--surface)`, `border-color: var(--border)`, `box-shadow: var(--field-shadow)`, hover `background: var(--default)` + `border-color: var(--border-secondary)`, tactile `:active { transform: scale(0.95) }` with fluid easing |
| `.dashboard-shell`, `.dashboard-sidebar`, `.dashboard-brand-row`, `.dashboard-sidebar-footer` | Flat `--panel` / `--card` with `--border` dividers | HeroUI v3 layered surface hierarchy: shell frame `--surface-tertiary`, sidebar `--surface` with subtle edge shadow and `--separator` dividers, footer tinted with `color-mix(in srgb, var(--surface-secondary) 45%, var(--surface))` |
| `.dashboard-nav a`, `.dashboard-sidebar-footer a`, `.dashboard-sidebar-footer button` | Hover `--card-soft`; active `--green-soft` with `inset 3px 0 0 var(--green-bright)` | HeroUI v3 ListBox Item recipe: smooth `120ms` transitions, hover `background: var(--default)` + `color: var(--foreground)`, tactile `:active { transform: scale(0.985) }`, `.active` uses `--accent-soft` fill + `--accent-soft-foreground` text + `inset 3px 0 0 var(--iris-accent-bright)` + subtle `1px` inner emerald border (`color-mix(in srgb, var(--accent) 14%, transparent)`), hover on active shifts to `--accent-soft-hover` |
| `.dashboard-topbar`, `.topbar` | `color-mix(in srgb, var(--bg) 94%, transparent)`, `blur(14px)` | HeroUI v3 translucent sticky Navbar: `color-mix(in srgb, var(--surface) 88%, transparent)`, `backdrop-filter: blur(16px) saturate(140%)`, `border-bottom: 1px solid var(--separator)`, subtle bottom elevation |
| `.dashboard-context-chip` | Previously unstyled after commit `e2e3802` | Styled with HeroUI v3 Soft Surface Chip recipe: `background: var(--surface-secondary)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, `--field-shadow`, glowing emerald status indicator `i` (`box-shadow: 0 0 0 2px color-mix(...)`), and clean spacing beside `.dashboard-theme-toggle` |
| `.dashboard-card`, `.dashboard-section-heading > b`, `.dashboard-toast` | Hardcoded `#00000005` / `#0003` shadows | HeroUI v3 `--surface` + `--surface-shadow` (cards), `--accent-soft` + subtle inner border (section pill), `--overlay` + `--overlay-shadow` (toast) |
| `.tour-backdrop`, `.tour-dialog`, `.tour-close`, `.tour-progress i`, `.tour-skip`, `.tour-back`, `.tour-next` | Hardcoded `#07130fc7` backdrop, `#0007` dialog shadow, flat buttons | HeroUI v3 Modal Overlay recipe: `--backdrop` with `blur(8px)`, `--overlay` dialog with `--overlay-shadow`, `--default` progress track, and HeroUI Ghost (`.tour-skip`), Secondary/Outline (`.tour-back`), and Primary Accent (`.tour-next`) button state recipes with hover & `:active` press feedback |
| `.iris-assistant*` | Hardcoded `#07130f40` shadow, unstyled hover/focus states on composer textarea & buttons | HeroUI v3 Overlay & Field recipe: `--overlay` + `--overlay-shadow` panel, tinted header bar, bordered message bubbles (`--surface-secondary` & `--accent-soft`), HeroUI Field states on `textarea` (`--field-background`, `--field-border-hover`, `--iris-focus-ring`), and Primary Accent send button with hover/press/disabled states |

### 5. Verification Results
- **`git diff` on `.tsx` / `.ts` files:** `0` files changed (100% CSS-only implementation)
- **`pnpm test:visualization`:** PASS (`115/115` tests passing across `10` suites)
- **`pnpm build`:** PASS (`34/34` static & dynamic App Router pages compiled and type-checked with `0` errors)

---

## [2026-11-15 15:16] Phase 1 PostCSS Syntax Fix & Phase 2 — Core Workspace Pages (System Intelligence, Data Selection & Data Preview)

### 1. Summary
- **Fixed `src/app/globals.css:91:5` PostCSS Syntax Error (`Unknown word`):**
  - Diagnosed the root cause: during an external merge/auto-format in commit `0739252`, both old (`background 0.25s ease, color 0.25s ease;`) and new (`background var(--iris-duration-slow, 0.25s)...`) lines were left side-by-side in `.app-shell`, leaving a dangling property-less line after the semicolon, and the closing `}` of `@layer base` at line 49 had been removed.
  - Restored `src/app/globals.css` from baseline commit `9a935d8` and cleanly re-applied all Phase 1 rules without `@layer base` nesting or duplicate lines. Verified balanced braces (`open == close`).
- **Implemented Phase 2 — Core Workspace Pages (`T2.1`, `T2.2`, `T2.3`):**
  - Redesigned **System Intelligence** (`.si-*`, `.si-chat-*`, `.si-review-*`, `.si-composer-*`, `.request-card*`), **Data Selection** (`.ds-*`, `.data-selection-workspace`), and **Data Preview** (`.dp-*`, `.preview-*`, `.variable-flashcard*`, `.data-table-*`, `.dashboard-table-wrap`, `.quality-badge*`) in `src/app/globals.css` using HeroUI v3 semantic tokens and interactive state recipes (`Card`, `Surface`, `SearchField`, `TextField`, `Select`, `Chip`, `Button`, and `Table`).
  - Preserved 100% of Iris's emerald/greenish primary palette in both Light and Dark modes and altered **zero** Next.js/React `.tsx` or `.ts` files and **zero** box-model layout properties.

### 2. Files Modified / Verified Untouched
- **Modified:**
  - `src/app/globals.css` (Repaired Phase 1 PostCSS syntax error; upgraded Phase 2 sections at lines `5076–5801`, `8744–12560`, and `13801–15095`)
  - `ui-redesign/logs/TASK-TRACKER.md`
  - `ui-redesign/logs/CHANGELOG.md`
  - `ui-redesign/README.md`
- **Untouched (Verified via `git diff 9a935d8 -- "src/**/*.tsx" "src/**/*.ts"`):**
  - `src/app/workspace/intelligence/page.tsx` — **0 lines changed** (all `useState`, `useEffect`, `useMemo`, `useRef`, `useRouter`, `useDashboard` hooks, event handlers, and JSX markup 100% identical).
  - `src/app/workspace/data-selection/page.tsx` — **0 lines changed** (all state hooks, URL sync `useEffect`s, spatial bbox handlers, and JSX markup 100% identical).
  - `src/app/workspace/data-preview/page.tsx` & `src/components/dashboard/DataPreviewView.tsx` — **0 lines changed** (all table sorting, filtering, pagination, SVG chart interactions, and JSX markup 100% identical).

### 3. Code & State Parity Check (`Next.js` Guardrails)
- [x] `git diff 9a935d8 -- "src/**/*.tsx" "src/**/*.ts"` is completely empty (`0` TypeScript/React changes)
- [x] CSS brace balance verified (`open: 2298, close: 2298`)
- [x] Zero box-model / layout properties (`width`, `height`, `min-*`, `max-*`, `padding`, `margin`, `gap`, `display`, `grid*`, `flex*`, `font-size`, `line-height`, media queries) altered
- [x] Emerald/greenish palette preserved across all primary buttons, active states, badges, and focus rings in both Light and Dark modes

### 4. Selector-by-Selector Design Changes (`src/app/globals.css`)

| Task | Selector Group | Previous Style | Updated HeroUI v3 Style |
|------|----------------|----------------|-------------------------|
| **Hotfix** | `.app-shell` & `@layer base` (`globals.css:40–95`) | Corrupted merge with duplicate `transition` lines and unclosed `@layer base` | Clean top-level rules with single `transition: background var(--iris-duration-slow, 0.25s) var(--ease-smooth, ease), color var(--iris-duration-slow, 0.25s) var(--ease-smooth, ease);` |
| **T2.1** | `.si-chat-shell`, `.si-chat-header`, `.si-chat-thread`, `.si-conversation` | Flat `--card` background and hardcoded `#0000000a` shadow | HeroUI v3 `Card` & `Surface` hierarchy: `--surface` shell with `--surface-shadow`, `--separator` header divider, and `color-mix(in srgb, var(--background) 60%, var(--surface))` thread canvas |
| **T2.1** | `.si-chat-message`, `.si-chat-turn.user .si-chat-message`, `.si-chat-avatar`, `.si-message` | Flat `--card` / `--green-bright` bubbles with `#00000005` shadow | Assistant bubbles use `--surface` + `--border` + `--surface-shadow`; user bubbles use `--accent` + `--accent-foreground` + soft emerald elevation (`0 2px 8px color-mix(in srgb, var(--accent) 24%, transparent)`) |
| **T2.1** | `.si-review-card`, `.si-scope-summary`, `.si-keyword-chip`, `.si-source-option`, `.si-result-source-list` | Hardcoded `#05966935` / `#d9770635` borders and `--card-soft` boxes | HeroUI v3 `Card` with `--accent` border & soft halo (`0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent)`), `--surface-secondary` scope summary, `--accent-soft` + `--accent-soft-foreground` keyword chips & checked source options, and semantic `--warning-soft` / `--warning-soft-foreground` unavailable source pills |
| **T2.1** | `.si-search-bar`, `.si-composer-form`, `.si-composer`, `.si-add-keyword input`, `.si-kw-add input` | `--card-soft` / `--card` with `--border-strong` | HeroUI v3 `SearchField` & `TextField` recipes: `--field-background`, `--field-foreground`, `--field-placeholder`, `--field-border`, `--field-shadow`, hover `--field-border-hover`, and focus-within `--focus` + `--iris-focus-ring` |
| **T2.1** | `.si-submit-btn`, `.si-result-action`, `.si-composer-send`, `.si-new-topic-btn`, `.si-suggestions button` | Flat `--green-bright` or `--card-soft` buttons without press feedback | HeroUI v3 Primary Accent (`--accent`, hover `--accent-hover`, `:active { transform: scale(0.985) }`, `:focus-visible` ring) and Secondary/Chip buttons (`--surface-secondary`, hover `--accent-soft` + `--accent-soft-foreground`) |
| **T2.2** | `.data-selection-workspace`, `.ds-config-card`, `.ds-map-card`, `.ds-products-column` | `--bg` workspace background, `--border` dividers | HeroUI v3 `--background` canvas with `--surface` cards and `--separator` section dividers |
| **T2.2** | `.ds-control-group select`, `.ds-date-fields input`, `.ds-bbox-fields input`, `.ds-field-label select/input`, `.ds-inline-search` | Flat `--card` inputs with `--border` and no hover/focus ring | HeroUI v3 `Select` & `Input` field recipe: `--field-background`, `--field-border`, `--field-shadow`, hover `--field-border-hover`, `:focus` `--focus` + `--iris-focus-ring` |
| **T2.2** | `.ds-product-tile`, `.ds-mini-product-card`, `.ds-source-tile` | `--card-soft` tiles with `--border` | HeroUI v3 selectable `Card` recipe: `--surface-secondary` default, hover transitions to `--surface` + `--border-secondary`, and `.is-primary` / `.active` highlights with `--accent` border + `0 0 0 2px color-mix(in srgb, var(--accent) 14%, transparent)` |
| **T2.2** | `.ds-api-pill`, `.ds-match-pill`, `.ds-retrieval-summary span`, `.ds-capability-notice`, `.ds-demo-notice`, `.ds-guardrail-banner` | Hardcoded hex alphas (`#0596691c`, `#d9770638`, `#f59e0b14`, `#fef3c738`) | HeroUI v3 semantic `Chip` & `Alert` tokens: `--accent-soft` / `--accent-soft-foreground` for API & match pills, and `--warning-soft` / `--warning-soft-foreground` for capability, guardrail, and demo notices across Light & Dark modes |
| **T2.3** | `.dp-step-pill`, `.dp-api-badge`, `.dp-freq-badge`, `.dp-scope-badge`, `.dp-demo-badge`, `.dp-secondary-btn`, `.dp-export-btn`, `.dp-proceed-btn` | `--card-soft` pills & buttons | HeroUI v3 pipeline step pills (`.completed` in `--accent-soft`), `--surface-secondary` secondary/export buttons with `--field-shadow` and `:active` press scale, and Primary Accent `.dp-proceed-btn` |
| **T2.3** | `.dp-chart-svg-wrap`, `.dp-chart-tooltip`, `.dp-toggle-pill`, `.dp-endpoint-code` | `--card-soft` chart wrap and `--card` tooltip | `--surface-secondary` chart frame, `--overlay` + `--field-shadow` tooltip, `--accent` range/checkbox accent-color, and bordered monospace `.dp-endpoint-code` |
| **T2.3** | `.dashboard-table-wrap`, `.data-table-head input`, `.data-quality-row`, `.quality-badge`, `.dp-table-search input`, `.dp-qa-filter-pills`, `.dp-page-btns` | Hardcoded light-mode hexes on `.quality-badge` (`#d1fae5`, `#fef3c7`, `#fee2e2`), no table row hover | HeroUI v3 `Table` & `Chip` recipe: `--surface-secondary` table header & `tbody tr:hover`, `--separator` cell borders, semantic `--success-soft`/`--warning-soft`/`--danger-soft` quality badges (adapting automatically in dark mode), and HeroUI field/button states on search, QA filter pills, and pagination buttons |

### 5. Verification Results
- **`git diff 9a935d8 -- "src/**/*.tsx" "src/**/*.ts"`:** `0` files changed (100% CSS-only implementation)
- **`pnpm test:visualization`:** PASS (`115/115` tests passing across `10` suites)
- **`pnpm build`:** Verified production Next.js build and PostCSS compilation

---

## [2026-11-15 16:48] Phases 3, 4, 5, 6 & 7 — Data Analysis Workbench, Research & Hazards, Forecasts & ML, Visualization Studio & Living Globe, Public Site, and Final QA Sign-Off

### 1. Summary
- Completed **Phase 3 (`T3.1`, `T3.2`) — Data Analysis Workbench, Existing Research & Case Studies / Hazards:**
  - Redesigned the Data Analysis Workbench (`.da-*`, `.control-panel`, `.search-field`, `.phenomenon-tabs`, `.range-track`, `.run-button`, `.variable-card`, `.map-card`, `.analysis-panel`, `.verdict`, `.metric`, `.chart-card`, `.segmented`, `.skeleton`, `.toast`, `.visualize-page .analysis-options`, `.innovation-insights`) in `src/app/globals.css`.
  - Redesigned Existing Research & Case Studies (`.case-library-hero`, `.dashboard-filter-tabs`, `.dashboard-case-body`, `.research-*`) in `src/app/globals.css` and the Hazard Investigation Workbench (`src/features/hazards/hazards.css`) using HeroUI v3 semantic tokens (`Card`, `Surface`, `Select`, `Input`, `Popover`, `Chip`, `Button`, `Tabs`).
- Completed **Phase 4 (`T4.1`) — Forecasts & ML Forecast Workbench:**
  - Redesigned `src/features/forecasts/forecasts.css` (`.forecast-workspace`, `.forecast-fresh`, `.forecast-expired`, `.forecast-metrics`, `.forecast-panel`, `.forecast-inspector`, `.forecast-notice`, `.forecast-loading`, `.ml-forecast`, `.ml-target select`, `.ml-control-bar .ml-generate`, `.result-hero`, `.result-day`, `.ml-job-progress`) with HeroUI v3 field, surface, and button tokens while **preserving 100% of test-locked values** (`--forecast-danger: #b33846` in light mode, `#ff9ba8` in dark mode, and `.result-warning { color: var(--forecast-danger) }`).
- Completed **Phase 5 (`T5.1`, `T5.2`) — Visualization Studio, Living Globe & MapLibre HUD:**
  - Redesigned `src/features/visualization/visualization.css` (`.viz-workbench`, `.viz-button`, `.viz-primary`, `.viz-controls`, `.viz-product`, `.viz-view-tabs`, `.viz-kpis`, `.viz-chart-card`, `.viz-table-card`, `.viz-time-control`, `.viz-provenance`, `.viz-field-controls`, `.viz-globe`, `.viz-segment`, `.viz-map-topbar`, `.viz-map-layers`, `.viz-map-inspector`, `.viz-map-timeline`, `.viz-studio-toolbar`, `.viz-studio-dock`) and `src/features/visualization/presentation/presentation.css` (`.viz-record-scene`, `.viz-record-tooltip`, `.viz-observation-nav`, `.viz-observation-scrub`, `.viz-series-overview`).
  - Redesigned the Living Globe & MapLibre HUD (`.srs-*`, `.iris-map-toolbar`, `.iris-tool-btn`, `.iris-map-error`, `.iris-fullscreen-backdrop`, `.iris-map-fullscreen-container`, `.iris-hud-topleft`, `.iris-hud-search-input-wrap`, `.iris-hud-preset-btn`, `.iris-hud-bottomleft`) in `src/app/globals.css`.
- Completed **Phase 6 (`T6.1`, `T6.2`) — Public Site & Marketing Pages:**
  - Redesigned Landing, Platform, Methodology, Data Catalog, Case Library, and About pages (`.landing-*`, `.signal-marquee`, `.capability-card`, `.method-steps`, `.landing-case-card`, `.landing-footer`, `.page-docs-button`, `.page-workspace-button`, `.platform-workflow-grid`, `.platform-capability-list`, `.page-navigation`, `.primary-page-button`, `.secondary-page-button`, `.site-footer`, `.featured-case`, `.filter-tabs`, `.case-card`, `.catalog-stat`, `.catalog-panel`, `.catalog-search`, `.catalog-table`, `.principle-card`, `.method-intro`, `.method-quote`, `.method-assumptions`, `.method-step`, `.stat-card`, `.faq-list`, `.about-manifesto`, `.audience-list`) in `src/app/globals.css`.
- Completed **Phase 7 (`T7.1`) — Final QA, CSS Brace Audit, Unit Tests & Production Build Sign-Off.**

### 2. Files Modified / Verified Untouched
- **Modified (CSS & Documentation Only):**
  - `src/app/globals.css`
  - `src/features/hazards/hazards.css`
  - `src/features/forecasts/forecasts.css`
  - `src/features/visualization/visualization.css`
  - `src/features/visualization/presentation/presentation.css`
  - `ui-redesign/README.md`
  - `ui-redesign/logs/TASK-TRACKER.md`
  - `ui-redesign/logs/CHANGELOG.md`
- **Untouched (Verified via `git diff 9a935d8 -- "src/**/*.tsx" "src/**/*.ts"`):**
  - **Every single `.tsx` and `.ts` file in `src/` has `0` changes** relative to baseline commit `9a935d8`. All React hooks (`useEffect`, `useState`, `useCallback`, `useMemo`, `useRef`), state transitions, event handlers, props, conditional renders, and DOM geometry are 100% untouched.

### 3. Code & State Parity Check (`Next.js` Guardrails)
- [x] `git diff 9a935d8 -- "src/**/*.tsx" "src/**/*.ts"` returned empty output (`0` modified `.ts`/`.tsx` files across the entire repository)
- [x] CSS brace balance verified across all 6 stylesheets (`iris-theme.css: 3/3`, `globals.css: 2335/2335`, `hazards.css: 97/97`, `forecasts.css: 188/188`, `visualization.css: 315/315`, `presentation.css: 48/48`)
- [x] Zero box-model / layout properties (`width`, `height`, `min-*`, `max-*`, `padding`, `margin`, `gap`, `display`, `grid*`, `flex*`, `font-size`, `line-height`, media queries) altered
- [x] Test-locked RGB colour assertions preserved in `src/features/forecasts/forecasts.css` (`.result-warning` light `#b33846` / `rgb(179, 56, 70)`, dark `#ff9ba8` / `rgb(255, 155, 168)`) and scientific colour scales untouched

### 4. Selector-by-Selector Design Changes Across Phases 3–6

| Phase / Task | File & Selector Group | Previous Style | Updated HeroUI v3 Style |
|--------------|-----------------------|----------------|-------------------------|
| **T3.1** | `globals.css`: `.da-method-card`, `.da-compat-badge`, `.da-step-badge`, `.da-info-popover`, `.da-param-drawer`, `.da-param-row select`, `.da-step-run-btn`, `.da-clear-steps-btn`, `.da-step-nav-bar`, `.da-section-header`, `.da-stale-pill`, `.da-anomaly-chip`, `.da-inline-error` | Flat `--card` / `--card-soft` cards, hardcoded `#10b981` / `#f59e0b` / `#ef4444` alpha badges, `#0000001f` popover shadow | HeroUI v3 `Card` & `Popover` recipes: `--surface` + `--surface-shadow` method cards, `--accent` selected ring (`0 0 0 2px color-mix(...)`), `--overlay` + `--overlay-shadow` info popovers, `--field-*` selects with `--iris-focus-ring`, and semantic `--success-soft` / `--warning-soft` / `--danger-soft` status chips |
| **T3.1** | `globals.css`: `.control-panel`, `.search-field`, `.phenomenon-tabs`, `.range-track`, `.run-button`, `.variable-card`, `.map-card`, `.analysis-panel`, `.verdict`, `.metric`, `.chart-card`, `.segmented`, `.skeleton`, `.toast` | Legacy `--card` / `--panel` surfaces and `#087f5b` hardcoded buttons | HeroUI v3 `--surface`, `--surface-secondary`, `--field-*` inputs, `--accent` primary run buttons with `:active` press scale, `--overlay` toast & map tools, and preserved `.ols-line` / `.ci-area` scientific strokes |
| **T3.2** | `globals.css`: `.case-library-hero`, `.dashboard-filter-tabs`, `.research-context`, `.research-paper*`, `.research-guide-card`, `.research-result-item`, `.research-error-card` | Flat `--card` / `--card-soft` containers and `#b91c1c` error borders | HeroUI v3 `Tabs` pill bar, `--surface` + `--surface-shadow` research paper cards with hover border elevation, `--accent-soft` match & sample chips, and `--danger-soft` error cards |
| **T3.2** | `src/features/hazards/hazards.css`: `.hazard-case-card`, `.hazard-switch a`, `.hazard-view-tabs button`, `.hazard-panel`, `.hazard-button`, `.hazard-source-status`, `.hazard-error`, `.hazard-metrics > div`, `.hazard-table-scroll` | Flat `--card` / `--panel` cards, unstyled input focus | HeroUI v3 `--surface` + `--surface-shadow` panels, `--field-*` inputs with `--focus` ring, `--accent` primary buttons with `:active` scale, semantic `--warning-soft` / `--danger-soft` status banners, and `--surface-secondary` table row hover |
| **T4.1** | `src/features/forecasts/forecasts.css`: `.forecast-workspace`, `.forecast-fresh`, `.forecast-expired`, `.forecast-metrics article`, `.forecast-panel`, `.ml-forecast .ml-grid article`, `.ml-target select`, `.ml-control-bar .ml-generate`, `.result-hero`, `.result-day`, `.ml-job-progress` | Hardcoded dark `#10161d` on `.ml-target select`, `#078665` / `#d99026` alpha pills | HeroUI v3 `--surface` + `--surface-shadow` cards, `--field-background` (adapting cleanly to light & dark modes) on `.ml-target select`, semantic `--success-soft` / `--warning-soft` freshness badges, and **100% preserved** `.result-warning` (`--forecast-danger: #b33846` / `#ff9ba8`) |
| **T5.1** | `src/features/visualization/visualization.css` & `presentation/presentation.css`: `.viz-workbench`, `.viz-button`, `.viz-primary`, `.viz-controls`, `.viz-product`, `.viz-view-tabs`, `.viz-kpis > div`, `.viz-chart-card`, `.viz-table-card`, `.viz-globe`, `.viz-segment`, `.viz-map-*`, `.viz-studio-*`, `.viz-record-scene`, `.viz-record-tooltip`, `.viz-observation-nav`, `.viz-series-overview` | Flat `--panel` / `--card` surfaces, `--green` focus outline | HeroUI v3 `--surface` / `--surface-secondary` cards with `--surface-shadow`, `--field-*` inputs/selects with focus ring, `--overlay` + `--overlay-shadow` floating map HUD & 3D record tooltips, and tactile `:active` button scale |
| **T5.2** | `globals.css`: `.srs-*`, `.iris-map-toolbar`, `.iris-tool-btn`, `.iris-map-error`, `.iris-fullscreen-backdrop`, `.iris-map-fullscreen-container`, `.iris-hud-*` | Hardcoded `#ef4444` / `#f59e0b` alpha callouts, `#00000080` fullscreen backdrop | HeroUI v3 `--surface` / `--surface-secondary` SRS inspector cards, `--backdrop` + `--overlay-shadow` fullscreen map modal, `--overlay` floating MapLibre HUD search & preset buttons, and semantic `--warning-soft` / `--danger-soft` scientific caveat banners |
| **T6.1 & T6.2** | `globals.css`: `.landing-*`, `.capability-card`, `.landing-case-card`, `.page-navigation`, `.primary-page-button`, `.secondary-page-button`, `.featured-case`, `.filter-tabs`, `.case-card`, `.catalog-stat`, `.catalog-panel`, `.catalog-search`, `.catalog-table`, `.method-intro`, `.stat-card`, `.faq-list` | Hardcoded `#087f5b` buttons, `#0000000c` card shadows, unstyled `.catalog-search` focus | HeroUI v3 `--surface` + `--surface-shadow` marketing & catalog cards, `--accent` / `--accent-hover` primary CTAs with `:active` press feedback, `--field-*` + `--focus` ring on `.catalog-search`, and `--surface-secondary` hover rows on `.catalog-table` |

### 5. Final Verification Results (Phase 7)
- **CSS Brace Balance Check:** PASS (`0` mismatches across all 6 stylesheets)
- **React / TypeScript Integrity Check (`git diff 9a935d8 -- "src/**/*.tsx" "src/**/*.ts"`):** PASS (`0` files modified)
- **Unit & Scientific Contract Tests (`pnpm test:visualization`):** PASS (`115/115` tests passing across `10` suites)
- **Production Next.js Build (`pnpm build`):** PASS (`34/34` routes compiled and type-checked with `0` errors)
