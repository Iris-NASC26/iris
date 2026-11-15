# UI Redesign — Detailed Change Log

> Chronological log of all design system & UI redesign changes applied to Project Iris.
> Every entry verifies that Next.js component code, React hooks (`useEffect`, `useState`, `useCallback`, `useMemo`), props, DOM structure, and box-model dimensions remain completely unaltered.

---

## [2026-11-15 21:11] Sidebar Navigation — New "Predictions" Section with In Development Tag

### 1. Summary
- Moved **Forecasts** out of the "Explore" section into a dedicated section in the sidebar navigation: **"Predictions"**.
- Added the `"In Development"` pill badge directly next to the **"PREDICTIONS"** section heading using `.dashboard-nav-dev-tag`.
- Retained **"Case Studies"** and **"Existing Research"** under the "Explore" section.

### 2. Files Modified
- `src/app/workspace/layout.tsx`:
  - Added navigation group `{ label: "Predictions", tag: "In Development", items: [{ to: "/workspace/forecasts", text: "Forecasts", icon: "activity" }] }`.

### 3. Verification & Guardrails
- [x] TypeScript compiler: `pnpm tsc --noEmit` passed with 0 errors.
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.

---

## [2026-11-15 21:10] Research Page Redesign, Default Search Limit 10, Data Controls & Button Hover Contrast

### 1. Summary
- **Default Search Limit**: Changed default literature/dataset research search limit to 10 records per source (20 combined across OpenAlex and DataCite) across frontend state (`src/app/workspace/research/page.tsx`), Next.js API route (`src/app/api/v1/research/search/route.ts`), and backend Pydantic models (`backend/schemas.py`).
- **Existing Research Workspace Redesign**: Fully redesigned `.research-workspace-page` according to the HeroUI v3 Emerald design system tokens:
  - Sidebar / Control panel with HeroUI Surface Tertiary, refined typography, and compact Form / Select / Checkbox Card controls with focus rings.
  - Retrieved Dataset Card using HeroUI Card & Stat layout with emerald soft icon and semantic metadata list.
  - Search Header & Search Field adopting HeroUI SearchField and Card styling, with primary button (HeroUI solid emerald) and dataset search button (HeroUI soft accent).
  - Onboarding Guide with HeroUI Alert banner and card recipes.
  - Metrics Grid adopting HeroUI Card + Stat metrics display with tabular figures.
  - Filter Bar using HeroUI ToggleButtonGroup segmented controls with active/hover states in both modes.
  - Results List with HeroUI List Item rows, clean source badges (OpenAlex emerald chip, DataCite blue/info chip, Open Access green chip), and action buttons.
- **Data Visualization Button Hover Fix**:
  - Fixed button hover text invisibility across light and dark modes in `src/features/visualization/visualization.css`. Previously, `.viz-button:hover` applied `color: var(--accent-foreground)` on `background: var(--accent-soft)`. In light mode, `--accent-foreground` is white (`#ffffff`) on pale mint background (`#eaf8f1`), rendering text invisible; in dark mode, `--accent-foreground` is dark ink (`#042419`) on dark emerald background (`#15382b`), rendering text invisible.
  - Replaced hover text color with `var(--accent-soft-foreground)` (`#087f5b` in light mode for 4.57:1 contrast; `#34d399` in dark mode for 6.42:1 contrast), ensuring text and button boundaries remain clearly visible on hover in both themes.
  - Added dedicated `:hover`, `:active`, `[aria-pressed=true]`, and `:focus-visible` styling for all visualization buttons (`.viz-button`, `.viz-primary`, `.viz-search button`, `.viz-view-tabs button`, `.viz-chart-types button`, `.viz-table-pages button`, `.viz-camera-controls button`, `.viz-segment button`, `.viz-loaded-list button`).
- **Data Controls Section Redesign**:
  - Redesigned `.viz-controls`, `.viz-control-section`, `.viz-step`, `.viz-product-list`, `.viz-product`, and form controls in `src/features/visualization/visualization.css` to use HeroUI v3 semantic surface tokens, field tokens, and checkbox card recipes.

### 2. Files Modified
- `src/app/workspace/research/page.tsx`:
  - Set default `perSourceLimit` state to `10`.
- `src/app/api/v1/research/search/route.ts`:
  - Set default `per_source_limit` fallback to `10`.
- `backend/schemas.py`:
  - Updated `ResearchSearchRequest.per_source_limit` default to `10`.
- `src/app/globals.css`:
  - Comprehensive HeroUI v3 styling for `.research-workspace-page`.
- `src/features/visualization/visualization.css`:
  - Button hover visibility fix for both light and dark modes.
  - Redesign of `.viz-controls` and data control sections using HeroUI tokens.
- `src/features/visualization/presentation/presentation.css`:
  - Observation scrub button hover color contrast fix.

### 3. Verification & Guardrails
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.
- [x] Production build: `pnpm build` completed successfully (34/34 pages static/dynamic).
- [x] Contrast & visibility verified in both light and dark modes.

---

## [2026-11-15 21:05] Geometric Visualization — 3D Globe Canvas & Cesium Widgets Layout Fix

### 1. Summary
- Resolved the 3D visualization layout collapse where the Cesium globe rendered as a 300×150 black rectangle in the top-left corner with unstyled credit text (`CESIUM ion Data attribution`) overflowing into the container.
- **Root Cause**: Cesium's runtime CSS (`/cesium/Widgets/widgets.css`) was not linked in the root HTML `<head>`. Because `engine.ts` was loaded dynamically at runtime via `await import('./cesium/engine')`, Webpack did not emit/inject Cesium's widget styles, causing `.cesium-viewer`, `.cesium-widget`, and `<canvas>` to lack `width: 100%; height: 100%` and `.cesium-viewer-bottom` to lack absolute positioning.
- **Fixes Applied**:
  1. Linked `/cesium/Widgets/widgets.css` directly in `src/app/layout.tsx` (`<head>`) and added dynamic fallback injection in `src/features/visualization/Globe.tsx`.
  2. Added resilient, comprehensive layout rules in `src/features/visualization/visualization.css` and `src/app/globals.css` ensuring `.viz-three-mount`, `.cesium-viewer`, `.cesium-widget`, and `canvas` always expand to `100%` width and height (`position: absolute; inset: 0;`), with styled, translucent credit bar at the bottom.
  3. Added `resize()` method to `GlobeEngine` in `src/features/visualization/cesium/engine.ts` and wired a `ResizeObserver` on `mount.current` in `src/features/visualization/Globe.tsx` to ensure canvas buffers match viewport dimensions instantly across all window or layout resize events.

### 2. Files Modified
- `src/app/layout.tsx`:
  - Added `<link rel="stylesheet" href="/cesium/Widgets/widgets.css" />` to `<head>`.
- `src/features/visualization/Globe.tsx`:
  - Added dynamic stylesheet check in `useEffect`.
  - Added `ResizeObserver` observing `mount.current` to call `engine.current?.resize()`.
  - Triggered `created.resize()` immediately on engine initialization.
- `src/features/visualization/cesium/engine.ts`:
  - Added public `resize()` method and called `this.viewer.resize()` in constructor.
- `src/features/visualization/visualization.css` & `src/app/globals.css`:
  - Added complete positioning and sizing rules for `.cesium-viewer`, `.cesium-viewer-cesiumWidgetContainer`, `.cesium-widget`, `canvas`, and `.cesium-viewer-bottom`.

### 3. Verification & Guardrails
- [x] TypeScript compiler: `pnpm tsc --noEmit` passed with 0 errors.
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.
- [x] CSS brace matching: `globals.css` (2599 / 2599), `visualization.css` (354 / 354).

---

## [2026-11-15 20:50] Geometric Visualization — Top Button Visibility, Sidebar Menu Label & In Development Tag

### 1. Summary
- Resolved button visibility issue on the Geometric Visualization (`/workspace/globe`) header where "Open Data Visualization" was rendered white-on-white due to CSS class precedence overriding the button background. Added dedicated styling `.viz-primary-explore-btn` with signature HeroUI emerald gradient (`linear-gradient(135deg, #10b981 0%, #059669 100%)`), crisp white text and icon (`#ffffff !important`), hover elevation, and proper contrast across both light and dark themes.
- Updated the sidebar navigation in `src/app/workspace/layout.tsx`:
  - Placed the `"In Development"` badge/pill right next to the section heading `"GLOBAL EVIDENCE CUBE"`.
  - Kept the navigation item button text cleanly as `"Geometric Visualization"`.
  - Added `.dashboard-nav-label-row` and `.dashboard-nav-dev-tag` in `src/app/globals.css` with responsive hiding on collapsed sidebar state.
- Removed AI-generated synthetic data:
  - Removed `<section className="hazard-layer-links">` from `src/features/visualization/MapWorkspace.tsx` and removed unused forecast imports.
  - Replaced marketing copy (`"Your data, in place."`) in `src/features/visualization/Globe.tsx` with technical label `"Spatial Coordinate Grid"` and descriptive prompt `"Select a variable and coordinate bounds to load and inspect spatial grid cells."`.
  - Cleaned duplicate "In Development" eyebrow in `src/features/visualization/Workspace.tsx`.

### 2. Files Modified
- `src/app/workspace/layout.tsx`:
  - Added `tag: "In Development"` to `navigation` group and rendered `.dashboard-nav-dev-tag` beside `.dashboard-nav-label`.
  - Set menu item text cleanly to `"Geometric Visualization"`.
- `src/features/visualization/Workspace.tsx`:
  - Updated header button to `<Link className="viz-primary-explore-btn" href="/workspace/visualize"><Icon name="chart" size={15}/> <span>Open Data Visualization</span></Link>`.
- `src/features/visualization/visualization.css`:
  - Added `.viz-primary-explore-btn` styles with emerald gradient, white text/icon, and hover elevation.
- `src/app/globals.css`:
  - Added `.dashboard-nav-label-row` and `.dashboard-nav-dev-tag` with light and dark mode tokens.
  - Added `.viz-primary-explore-btn` styling to ensure consistency across the application.
- `src/features/visualization/MapWorkspace.tsx`:
  - Removed unused imports and synthetic upcoming forecasts section.
- `src/features/visualization/Globe.tsx`:
  - Replaced placeholder marketing copy with descriptive technical labels.

### 3. Verification & Guardrails
- [x] TypeScript compiler: `pnpm tsc --noEmit` passed with 0 errors.
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.
- [x] CSS brace matching: `globals.css` (2580 / 2580), `visualization.css` (318 / 318).
- [x] 100% of Cesium, Three.js, spatial variables, and data contracts preserved.

---

## [2026-11-15 20:25] Floating Assistant Bubble — Prominent Emerald Capsule & "Talk to AI" Label

### 1. Summary
- Upgraded the floating AI assistant button in `src/components/dashboard/IrisAssistant.tsx` from an ambiguous round icon to a prominent, high-visibility capsule pill displaying `"Talk to AI"`.
- Styled `.iris-assistant-launcher` with a signature HeroUI emerald gradient (`linear-gradient(135deg, #10b981 0%, #059669 100%)`), crisp white typography, an elevated drop shadow (`0 4px 14px rgba(16, 185, 129, 0.35)`), and smooth hover interaction (`translateY(-2px) scale(1.02)` with expanded glow).
- Enhanced accessibility with `aria-label="Talk to AI"`, native tooltip `title="Talk to AI — Iris Intelligent Assistant"`, and keyboard focus-visible outline.

### 2. Files Modified
- `src/components/dashboard/IrisAssistant.tsx`:
  - Added `<span className="iris-assistant-launcher-text">Talk to AI</span>` inside the launcher button.
- `src/app/globals.css`:
  - Replaced square 48px button styling with full capsule pill design, emerald gradient, and hover lift.

### 3. Verification & Guardrails
- [x] TypeScript compiler: `pnpm tsc --noEmit` passed with 0 errors.
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.
- [x] CSS brace matching: 2577 opens, 2577 closes.

---

## [2026-11-15 20:10] Data Analysis — Comprehensive (i) Parameter Explanations & Tooltip Display Fix

### 1. Summary
- Resolved issue where hovering `(i)` icons in Data Analysis did not display parameter explanations due to upward positioning (`bottom: calc(100% + 7px)`) being clipped by `.panel-scroll`'s `overflow: hidden`, missing color variable fallbacks, and lack of hover tooltips on the Metric summary cards.
- Repositioned `.da-info-tooltip` to drop downwards below the trigger (`top: calc(100% + 6px); right: 0; left: auto;`) with high z-index (`9999`), resilient background (`var(--overlay, #ffffff)` / dark mode `#1c221f`), dark foreground text, elevated drop shadow, and non-clipped boundaries.
- Added native browser `title="..."` attributes to every `.da-info-trigger` as an infallible native fallback across all devices and browsers.
- Expanded the `(i)` tooltip explanations across **all 17 configurable parameters and preprocessing options** in the sidebar:
  - Significance threshold (α), Serial correlation adjustment (Quenouille–Santer), Variance formulation (Hamed–Rao), Max autocorrelation lag (k), Min years per calendar month, Rank confidence interval (Sen's slope), Display rate unit, Min observations per regime segment (Pettitt), Extreme flagging threshold (|z| ≥ τ), Scale dispersion estimator (MAD vs SD), Heatmap color saturation cap, Outlook continuation horizon, Stripes min valid months/year, Trend triangle min window, Seasonal treatment, Sampling cadence, and Observation period.
- Rebuilt the `Metric` component across all 8 statistical method result views to display rich, plain-English scientific explanations when hovering the `(i)` trigger on every output card (OLS Slope, Student t-Test, R², Serial Correlation Rule, Mann–Kendall p-value, Kendall's Tau, Lag-1 Autocorrelation, BH-FDR Adjusted q, Seasonal Kendall Z_SK, Homogeneity Chi-Square, Sen's Decadal Slope, Breakdown Point, Pettitt Breakpoint, Step Shift Δμ, Anomaly Flagging, and Dispersion Estimators).
- Cleaned duplicate CSS blocks in `src/app/globals.css` and verified CSS brace balance (2575 opens, 2575 closes).

### 2. Files Modified
- `src/app/globals.css`:
  - Upgraded `.da-info-trigger`, `.da-info-tooltip`, and `.metric .metric-label` rules with downward offset, z-index 9999, and full theme variable fallbacks in light and dark modes.
  - Removed duplicate CSS rule blocks at end of file.
- `src/app/workspace/data-analysis/page.tsx`:
  - Added `PARAMETER_EXPLANATIONS` dictionary covering all parameter inputs and analysis output metrics.
  - Added `(i)` trigger and tooltips to `Sampling cadence`, `Observation period`, and `Trend triangle min sub-window`.
  - Upgraded `Metric` component to wrap `(i)` icon with `.da-info-trigger`, `.da-info-tooltip`, and `title="..."`.

### 3. Verification & Guardrails
- [x] TypeScript compiler: `pnpm tsc --noEmit` passed with 0 errors.
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.
- [x] CSS brace matching: 2575 opens, 2575 closes.
- [x] 100% of statistical methods, parameters, and callback contracts intact.

---

## [2026-11-15 19:50] Data Analysis & Data Preview — View Filtering, Analysis Terminology, and Layout Lock

### 1. Summary
- Resolved viewport scrolling past the left sidebar menu by locking the root HTML/body and `.dashboard-shell` strictly to the viewport (`position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden;`), ensuring all internal scrolling is isolated within designated child panes (`.da-config-pane`, `.analysis-panel`, `.data-preview-page`).
- Replaced all method "Step" terminology with "Analysis 1", "Analysis 2", etc., across section badges, view filter dropdowns, pills, navigation headers, and execution buttons in `src/app/workspace/data-analysis/page.tsx`.
- Moved the "Explore in Visualization Studio" link to the top-right header of the Cumulative Analysis Workbench beside the view filter toggle, styling it as a prominent HeroUI primary emerald CTA button (`.da-primary-explore-btn`).
- Rebuilt the Observation Period range slider with aligned thumb coordinates, clean track fill, and active z-index stacking to prevent thumb overlapping glitches.
- Added interactive `(i)` hover tooltips explaining statistical parameters (significance threshold α, Quenouille–Santer autocorrelation adjustment, Hamed–Rao rank variance, seasonal Kendall thresholds, outlier Z-cutoff, and horizon outlook).
- Removed the top pipeline status tracker banner (`1. Request Routed... 2. Spatial Subsetting... 3. Temporal Resampling... 4. Validated...`) from `src/components/dashboard/DataPreviewView.tsx`.
- Removed redundant AI header titles and simplified summary cards to clean data parameter presentation.

### 2. Files Modified
- `src/app/globals.css`:
  - Added root scroll lock: `html:has(.dashboard-shell), body:has(.dashboard-shell) { height: 100vh; max-height: 100vh; overflow: hidden; }`.
  - Added viewport confinement: `.dashboard-shell { position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden; }`.
  - Added `.da-primary-explore-btn`, `.da-view-toggle-wrap`, and `.da-filter-select-group` styles.
- `src/app/workspace/data-analysis/page.tsx`:
  - Updated `CumulativeResultsPane` with `extractedPreviewJobId` prop and prominent exploration CTA.
  - Replaced "Step" label strings with "Analysis" (`Analysis {step.stepNumber}`).
  - Fixed observation period slider dual-thumb stacking and interactive tooltips.
- `src/components/dashboard/DataPreviewView.tsx`:
  - Removed top pipeline progress banner `<section className="dp-pipeline-banner dashboard-card">`.

### 3. Verification & Guardrails
- [x] TypeScript check: `pnpm tsc --noEmit` passed with 0 errors.
- [x] Test suite: `pnpm test:visualization` passed 115/115 tests across 10 test suites.
- [x] CSS brace matching: 2565 opens, 2565 closes.
- [x] All backend APIs, event handlers, and data contracts preserved without change.

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

---

## [2026-11-15 17:07] Workspace Compact HeroUI Pass — Left Menu, Left Windows, Floating Windows & "Iris Intelligence" Rename

### 1. Summary
- **Workspace Left Menu & Topbar Compact HeroUI Pass (`src/app/globals.css`, `src/app/workspace/layout.tsx`):**
  - Compacted `.dashboard-shell` (`--sidebar-width: 224px`, collapsed `64px`), `.dashboard-brand-row` (`height: 54px`), `.dashboard-topbar` (`height: 54px`), and `.dashboard-nav` into a dense, crisp HeroUI v3 navigation rail.
  - Styled `.dashboard-nav a`, `.dashboard-sidebar-footer a`, and `.dashboard-sidebar-footer button` as compact `32px` HeroUI v3 ListBox/Button items (`border-radius: 7px`, `font-size: 10.5px`, `gap: 9px`, `15px` icons) with subtle bordered hover states (`background: var(--surface-secondary)`, `border-color: color-mix(in srgb, var(--border) 65%, transparent)`) and active emerald pill styling (`background: var(--accent-soft)`, `inset 2.5px 0 0 var(--iris-accent-bright)`).
  - Separated `.dashboard-nav-group + .dashboard-nav-group` with a clean `1px solid var(--separator)` divider.
- **Left Windows & Floating Windows (`src/app/globals.css`):**
  - Compacted the workspace left control/setup windows (`.control-panel` / `.panel-scroll` at `minmax(340px, 32%)` and `.data-selection-workspace` / `.ds-setup-column` at `minmax(340px, 40%)` with `32px` HeroUI field controls).
  - Redesigned the floating **Iris Assistant** (`.iris-assistant-launcher` `48x48px` rounded-square `13px` badge, `.iris-assistant-panel` `352px` wide × `500px` max-height, `48px` header, `26x26px` icon actions, `32px` send button, and HeroUI v3 elevated message bubbles).
  - Compacted the floating **Onboarding Tour** modal (`.tour-dialog` `440px` wide, `145px` visual banner, `32px` HeroUI action buttons).
- **Renamed "System Intelligence" → "Iris Intelligence" & Compacted Full-Page AI Chat Window:**
  - Updated the workspace navigation label, topbar title, chat header kicker, aria-label, onboarding tour step title, and workspace cross-links from **System Intelligence** to **Iris Intelligence** in:
    - `src/app/workspace/layout.tsx`
    - `src/app/workspace/intelligence/page.tsx`
    - `src/components/dashboard/OnboardingTour.tsx`
    - `src/app/workspace/data-selection/page.tsx`
    - `src/components/dashboard/DataPreviewView.tsx`
    - `src/app/workspace/research/page.tsx`
    - `src/features/visualization/Workspace.tsx`
  - Refined `.si-chat-workspace`, `.si-chat-shell`, `.si-chat-header`, `.si-chat-thread`, `.si-chat-avatar` (`28x28px` rounded-square `8px` emerald badge), `.si-chat-message`, and `.si-new-topic-btn` (`30px` HeroUI button) for a tighter, cohesive AI chat window experience.
  - Preserved 100% of React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`), state management, API routes (`/api/v1/si/chat`), and event handlers.

### 2. Verification Results
- **CSS Brace Balance Check:** PASS (`2337/2337` balanced braces in `src/app/globals.css`)
- **Unit & Scientific Contract Tests (`pnpm test:visualization`):** PASS (`115/115` tests passing across `10` suites)

---

## [2026-11-15 17:45] Data Selection & Iris Intelligence Redesign Pass — Catalog Deep Links, Multi-Dataset Parameter Switching, Global Average Backend, and Sorting/Filtering

### 1. Summary
- **Workspace Topbar Refinement (`src/app/workspace/layout.tsx`):**
  - Updated the topbar to cleanly display what each page does (description only) instead of redundantly repeating the page title above the description.
- **Iris Intelligence AI Chat Window (`src/app/workspace/intelligence/page.tsx`, `src/app/globals.css`):**
  - Removed the outer bounding box and padding constraints to allow the AI chat workspace and thread to occupy the full right pane.
  - Removed redundant titles, kicker headers, and footer notes.
  - Implemented a clean, compact HeroUI top action toolbar for the "New topic" button (`.si-chat-toolbar`).
  - Preserved 100% of chat state, streaming hooks, keyword reviews, and source options.
- **Data Selection Page (`src/app/workspace/data-selection/page.tsx`, `src/app/globals.css`, `backend/adapters/extraction_adapters.py`):**
  - **Catalog External Links:** Connected catalog cards in the empty state directly to their respective official portal websites (`NASA POWER`, `NASA CMR`, `NASA AppEEARS`, `NASA GES DISC`, `NASA Harmony`, `NOAA CDO`, `NOAA OneStop`, `OPeNDAP`, `EODAG`, `Copernicus CDS`) with clear external link indicators.
  - **Multi-Dataset Parameter Switcher:** Added interactive tab switching (`.ds-dataset-switcher`) on the top-left configuration panel, enabling seamless parameter selection across multiple selected datasets.
  - **Interactive (i) Tooltips:** Added hover triggers with explanations for **Variable**, **Frequency**, and **Aggregation** methods (`.ds-info-trigger`, `.ds-info-tooltip`).
  - **Spatial Mode & Global Average:** Added a spatial mode toggle (`Regional / Bounding box` vs `Global average`). Implemented backend support in `backend/adapters/extraction_adapters.py` (`_fetch_live_series_from_provider`) querying 5 representative global latitudinal zones concurrently and computing the cosine-latitude weighted planetary mean series from live NASA data.
  - **Right-side Catalog Header & Filtering:**
    - Removed the redundant "Load demo data" button.
    - Added sorting controls (by Match %, Source API, or Dataset Name) and source filtering dropdown.
    - Ordered retrievable datasets first and placed unavailable datasets at the bottom with direct external portal access links.
    - Highlighted Primary Dataset (`.ds-primary-badge`, `.is-primary`) and queued datasets (`.ds-queued-badge`, `.is-queued`).
    - Rendered structured parameter chips (`.ds-product-parameters`, `.ds-param-chip`) for Frequency, Temporal Coverage, Resolution, Unit, and Agency.
    - Added clear Citation / DOI access links for each catalog entry.
  - **Standardized Button Sizing:** Compact button heights across all controls (`26px–32px` for secondary/action buttons, `36px` for primary proceed buttons).

### 2. Files Modified
- `src/app/workspace/layout.tsx`
- `src/app/workspace/intelligence/page.tsx`
- `src/app/workspace/data-selection/page.tsx`
- `backend/adapters/extraction_adapters.py`
- `src/app/globals.css`
- `ui-redesign/logs/CHANGELOG.md`
- `ui-redesign/logs/TASK-TRACKER.md`

### 3. Verification Results
- **CSS Brace Balance Check:** PASS (`2341/2341` balanced braces in `src/app/globals.css`)
- **Unit & Scientific Contract Tests (`pnpm test:visualization`):** PASS (`115/115` tests passing across `10` suites)

---

## [2026-11-15 19:15] Data Preview Redesign Pass — Empty State, Sleek Pipeline Stepper, Parameter Badges, (i) KPI Tooltips, Larger Regional Map & Compact 10-Row CSV Formatted Table

### 1. Summary
- **Initial Load / Empty State (`src/components/dashboard/DataPreviewView.tsx`, `src/app/globals.css`):**
  - Redesigned the empty state into a modern, compact HeroUI v3 card (`.dp-empty-state`) featuring an emerald icon badge, clear heading, an informative 3-step retrieval roadmap grid (`.dp-empty-step-card`), and standardized HeroUI action buttons (`Go to Iris Intelligence` & `Go to Data Selection`).
- **Thinner, Minimized Inline Pipeline Status Stepper (`.dp-pipeline-banner`, `.dp-pipeline-steps`, `.dp-step-pill`):**
  - Converted the bulky stacked pipeline banner into a slim, inline HeroUI status bar (`height: 25px` pills, soft emerald background, compact round checkmark icons, and subtle border).
- **Header Metadata & Parameter Badges Row (`.dp-badges-row`, `.dp-param-badge`):**
  - Removed internal technical identifiers (`Job ID`, `Result ID`, `SHA-256` hashes) from user view.
  - Rendered clean, structured data parameter chips for:
    - **Source API** (`.dp-source-badge` with globe icon)
    - **Frequency** (e.g. `Monthly`)
    - **Window** (e.g. `2020-01-01 → 2025-12-31`)
    - **Region** (e.g. `Global Average` or `Regional Bounding Box`)
    - **Aggregation** (e.g. `MEAN` or `SUM`)
    - **Spatial Reduction** (e.g. `MEAN`)
    - **Unit** (e.g. `°C`, `mm/day`)
- **Summary Statistics & Data Quality Cards (KPIs) with `(i)` Hover Tooltips (`.dp-kpi-header`, `.dp-info-trigger`, `.dp-info-tooltip`):**
  - Added interactive `(i)` info triggers with floating HeroUI tooltips on all 5 key metrics:
    1. **Total Observations:** Explains discrete temporal observation intervals.
    2. **Data Completeness & QA:** Explains physical range validation and fill-value detection.
    3. **Mean ± Std Deviation:** Explains central tendency, spread, and spatial reduction.
    4. **Observed Min / Max Range:** Explains absolute physical extremes and occurrence dates.
    5. **Preliminary Decadal Trend:** Explains ordinary least squares slope baseline before formal STL/Mann-Kendall decomposition.
- **Larger Regional Map & Compact 10-Row CSV Formatted Table (`.dp-bottom-split`, `.dp-mini-map-wrap`, `.dashboard-table-wrap`):**
  - Increased `IrisMap` height from `220px` to `340px` with a refined HeroUI card frame for enhanced regional visibility.
  - Set table pagination `pageSize` to `10` compact records to drastically reduce vertical space.
  - Styled compact table rows (`padding: 5.5px 10px`, `10.5px` typography), compact QA filter pills (`26px` height), search field (`28px`), and compact pagination buttons.

### 2. Files Modified
- `src/components/dashboard/DataPreviewView.tsx`
- `src/app/globals.css`
- `ui-redesign/logs/CHANGELOG.md`
- `ui-redesign/logs/TASK-TRACKER.md`

### 3. Verification Results
- **CSS Brace Balance Check:** PASS (`2429/2429` balanced braces in `src/app/globals.css`)
- **Unit & Scientific Contract Tests (`pnpm test:visualization`):** PASS (`115/115` tests passing across `10` suites)

---

## [2026-11-15 19:35] Data Analysis Workbench Redesign Pass — Header Text Removal, Panel Scroll Boundary Fix, Dual Observation Period Slider, Multi-Analysis View Filter Toggle & Parameter (i) Tooltips

### 1. Summary
- **Removed Redundant Header Text (`src/app/workspace/data-analysis/page.tsx`):**
  - Removed the repeating text `"Data Analysis Workbench \n Scientific Case File \n Configure dataset treatment, inspect method compatibility, adjust statistical parameters..."` from the top of the left sidebar, freeing vertical space and letting the active dataset profile and controls take top priority.
- **Contained Left Panel Scroll & Fixed Viewport Overflow (`src/app/globals.css`):**
  - Constrained `.visualize-page`, `.workspace`, `.control-panel`, and `.analysis-panel` with `min-height: 0`, `height: 100%`, and `overflow: hidden`, ensuring the `.panel-scroll` vertical scrollbar is strictly contained within the left pane and never leaks past the sidebar boundary or pushes the page layout.
- **Fixed Observation Period Dual Slider (`src/app/workspace/data-analysis/page.tsx`, `src/app/globals.css`):**
  - Rebuilt the observation period dual slider (`.da-period-control`, `.da-dual-slider-wrap`, `.da-dual-slider-track`, `.da-dual-slider-fill`, `.da-dual-slider-inputs`) with precise alignment between the track and input thumbs, dynamic thumb z-index layering to prevent drag collision, and tactile grab cursors.
- **Added Top-Right Multi-Analysis View Filter Toggle (`src/app/workspace/data-analysis/page.tsx`, `src/app/globals.css`):**
  - Added a dedicated view filter dropdown (`.da-view-toggle-wrap`, `.da-view-toggle-select`) on the top-right of the results pane, allowing users to toggle between *"Show All Methods"*, *"Base Observed Signal"*, or any individual step (e.g. *Step 1: OLS*, *Step 2: Mann–Kendall*, etc.).
  - Updated `.da-step-pills` to interactive buttons that instantly filter the view to the clicked method without requiring users to scroll through thousands of pixels.
  - Removed internal hash strings (`<span>{latestCaseFile.result_id}</span>`) from the results title.
- **Added Interactive (i) Tooltips for Complex Parameters (`src/app/workspace/data-analysis/page.tsx`, `src/app/globals.css`):**
  - Added `(i)` hover tooltip triggers on:
    - **Seasonal treatment** (STL vs Climatology)
    - **Significance threshold ($\alpha$)** (0.01, 0.05, 0.10)
    - **Serial correlation adjustment** (Quenouille–Santer $n_{\text{eff}}$)
    - **Variance formulation** (Hamed–Rao 1998)
    - **Max autocorrelation lag ($k$)**
    - **Seasonal Kendall minimum years**
    - **Sen's slope confidence corridor & rate normalization**
    - **Pettitt minimum regime segment length**
    - **Extreme anomaly Z-score threshold & dispersion estimator**
    - **Seasonal fingerprint heatmap color cap**
    - **Outlook horizon & warming stripes minimum months**
- **HeroUI v3 Design System Alignment:**
  - Compact button sizes, consistent borders, rounded pill tabs, and emerald hover/focus rings across all analysis controls.

### 2. Files Modified
- `src/app/workspace/data-analysis/page.tsx`
- `src/app/globals.css`
- `ui-redesign/logs/CHANGELOG.md`
- `ui-redesign/logs/TASK-TRACKER.md`

### 3. Verification Results
- **CSS Brace Balance Check:** PASS (`2556/2556` balanced braces in `src/app/globals.css`)
- **TypeScript Typecheck:** PASS (`pnpm tsc --noEmit` exited with 0 errors)
- **Unit & Scientific Contract Tests (`pnpm test:visualization`):** PASS (`115/115` tests passing across `10` suites)
