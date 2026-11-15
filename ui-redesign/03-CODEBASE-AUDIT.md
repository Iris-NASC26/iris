# 03 — Codebase UI Audit & Architecture Inventory

> **Date:** 2026-11-15 · **Branch:** `ui-redesign` (`9a935d8`)

---

## 1. Framework & Styling Stack

- **Framework:** Next.js 15.2.0 (App Router), React 19.0.0, TypeScript 5.7.0
- **CSS Engine:** Tailwind CSS v4 (`@tailwindcss/postcss`), imported via `@import "tailwindcss";` in `src/app/globals.css`.
- **Styling Pattern:** ~99% semantic/BEM-like custom CSS classes in 5 stylesheet files, with ~39 Tailwind utility class occurrences in TSX.
- **Theme Controller:** `src/context/ThemeContext.tsx` stores `"light"` / `"dark"` in `localStorage` (`"iris-theme"`) and exposes `{ dark, setDark, toggleTheme }`. Shell components apply `.dark.app-shell` on their root `<div>`.

---

## 2. Stylesheet Inventory

| File | Lines | Bytes | Scope |
|------|------:|------:|-------|
| `src/app/globals.css` | 15,190 | 269,128 | Root tokens, public pages, workspace shell, System Intelligence, Data Selection, Data Preview, Data Analysis, Research, Case Studies, Living Globe (`.srs-*`), IrisMap (`.iris-*`), Assistant, OnboardingTour |
| `src/features/visualization/visualization.css` | 241 | 26,747 | Visualization Studio workbench, Dockview theme overrides (`--dv-*`), 2D/3D globe controls |
| `src/features/forecasts/forecasts.css` | 550 | 18,913 | Forecasts & ML Forecast section (`.forecast-*`, `.result-*`, `.ml-*`) |
| `src/features/hazards/hazards.css` | 487 | 9,627 | Disaster investigation & point precipitation outlooks (`.hazard-*`) |
| `src/features/visualization/presentation/presentation.css` | 278 | 5,665 | 3D RecordScene, SeasonalCycle, TimeTrack, ObservationNavigator |

---

## 3. `src/app/globals.css` Section Map

| Line Range | Prefix / Group | Rules | Description |
|------------|----------------|------:|-------------|
| `1–95` | `:root`, `.app-shell`, `.app-shell.dark` | 12 | Base reset, scrollbars, legacy CSS custom properties |
| `96–261` | `.topbar`, `.brand*`, `.nav-*`, `.case-dropdown` | 28 | Public top navigation bar & case dropdown |
| `262–1746` | `.workspace`, `.control-panel`, `.variable-*`, `.map-*`, `.chart-*`, `.verdict*`, `.metric*`, `.skeleton`, `.toast` | 195 | Core interactive investigation & chart primitives |
| `1747–3533` | `.landing-*`, `.product-window`, `.signal-*`, `.capability-*`, `.method-*` | 162 | Public landing page & interactive hero showcase |
| `3534–4385` | `.page-*`, `.platform-*`, `.about-*` | 115 | Public content pages (Platform, Methodology, Data, About) |
| `4386–4911` | `.dashboard-*`, `.sidebar-*`, `.tour-*` | 96 | **Workspace Dashboard Layout**, collapsible sidebar, topbar, OnboardingTour modal |
| `4912–6358` | `.si-*`, `.research-*`, `.visualize-*` | 411 | System Intelligence, Existing Research, Visualize wrapper |
| `6359–6595` | `.dashboard-toast`, `@media` blocks | 42 | Responsive rules for dashboard shell (1180px, 980px, 767px, 680px) |
| `7100–8499` | `.featured-*`, `.catalog-*`, `.case-*`, `.method-*` | 110 | Case studies & data catalog views |
| `8500–11847` | `.ds-*`, `.dp-*` | 380 | Data Selection & Data Preview workbenches |
| `11848–12999` | `.srs-*`, `.iris-map*`, `.iris-hud*`, `.iris-tool*` | 210 | Living Globe & MapLibre HUD controls |
| `13000–14196` | `.ds-*`, `.dp-*`, `.si-chat-*`, `.si-review-*` | 185 | Conversational System Intelligence & Data Selection v2 |
| `14197–14455` | `.iris-assistant*` | 36 | Floating draggable AI assistant |
| `14456–15190` | `.da-*`, `.ols-line`, `.ci-area` | 102 | Data Analysis workbench & method cards |

---

## 4. Class Name Collision Analysis with HeroUI BEM

Scanning all 74 HeroUI v3 BEM block names against Iris's stylesheets and TSX files found only **3 overlapping class names**:
1. `.search-field` (`globals.css:324, 6600`, `research/page.tsx:336`)
2. `.skeleton` (`globals.css:1374`, `page.tsx:1687`)
3. `.toast` (`globals.css:1465, 6867`, `page.tsx:449, 1313`)

**Mitigation:** Do **not** import `@heroui/styles/components` globally (which would inject HeroUI's `.search-field`, `.skeleton`, and `.toast` rules over Iris's existing layout). Instead, use our dedicated `src/styles/iris-theme.css` token layer and apply HeroUI's visual specifications directly to Iris's existing selectors.

---

## 5. Size- & DOM-Sensitive Code (Must Not Be Altered)

- **`ResizeObserver` instances:** `IrisMap.tsx:270`, `CobeGlobe.tsx:97`, `LandscapeChart.tsx:41`, `RecordScene.tsx:317`, `Charts.tsx:53`.
- **`getBoundingClientRect` / `clientWidth` maths:** `page.tsx:282`, `DataPreviewView.tsx:743`, `CobeGlobe.tsx:59,103`, `RecordScene.tsx:249,264,275`, `Globe.tsx:165–167`.
- **DOM traversal queries:**
  - `IrisAssistant.tsx:163,275`: `target.closest("button, a[href], [role='button']")`
  - `OnboardingTour.tsx:47`: `closeButton.current?.closest('[role="dialog"]')`
  - `page.tsx:285`: `getComputedStyle(document.documentElement)` / `document.body`
- **Playwright test contract:**
  - `tests/visualization/browser/workspace.spec.ts:8` asserts `await expect(page.locator('.dashboard-context-chip')).toHaveCount(0);` on `/workspace` when no dataset is active, or expects `.dashboard-context-chip` to be styled cleanly inside `.dashboard-topbar`.
  - `tests/visualization/browser/datasetForecasts.spec.ts:119,189` asserts `.result-warning` computed `color` equals `rgb(179, 56, 70)` (light) and `rgb(255, 155, 168)` (dark).
