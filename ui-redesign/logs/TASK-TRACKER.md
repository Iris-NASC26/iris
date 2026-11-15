# UI Redesign — Task Tracker

> **Branch:** `ui-redesign` · **Last Updated:** 2026-11-15

---

## Phase 0 — Discovery, Design System & Architecture Plan
- [x] **T0.1** Audit entire Next.js codebase, stylesheets, CSS variables, class collisions, and Playwright test contracts (`03-CODEBASE-AUDIT.md`)
- [x] **T0.2** Establish strict functionality & box-model guardrails (`02-FUNCTIONALITY-GUARDRAILS.md`)
- [x] **T0.3** Author the Iris × HeroUI v3 Design System specification preserving the emerald/green palette in Light & Dark modes (`01-DESIGN-SYSTEM.md`)
- [x] **T0.4** Document legacy CSS variable → HeroUI v3 semantic token mapping (`04-TOKEN-MAPPING-AND-THEME.md`)
- [x] **T0.5** Define HeroUI component adoption matrix & QA verification protocol (`05-HEROUI-COMPONENT-ADOPTION.md`, `06-QA-AND-VERIFICATION.md`, `00-MASTER-PLAN.md`)

## Phase 1 — Foundation Token Bridge & Workspace Dashboard Layout
- [x] **T1.1** Create `src/styles/iris-theme.css` with HeroUI v3 semantic tokens (`--background`, `--foreground`, `--surface`, `--surface-secondary`, `--surface-tertiary`, `--overlay`, `--default`, `--accent`, `--accent-soft`, `--focus`, `--border`, `--separator`, `--surface-shadow`, `--overlay-shadow`, `--field-*`, `--radius-*`) in Light & Dark modes, plus 100% legacy variable aliases
- [x] **T1.2** Import `src/styles/iris-theme.css` into `src/app/globals.css` and upgrade base `:root`, `body`, `.app-shell`, `.topbar`, `.brand-mark`, `.theme-toggle`, `.icon-button`, and `.case-dropdown` rules
- [x] **T1.3** Redesign Workspace Dashboard Shell & Collapsible Sidebar (`.dashboard-shell`, `.dashboard-sidebar`, `.dashboard-brand-row`, `.dashboard-brand`, `.sidebar-collapse`, `.sidebar-mobile-close`, `.dashboard-nav*`, `.dashboard-sidebar-footer`, `.sidebar-collapsed*`) using HeroUI v3 Surface & ListBox item recipes
- [x] **T1.4** Redesign Workspace Topbar, Context Chip & Mobile Drawer (`.dashboard-topbar`, `.dashboard-context-chip`, `.dashboard-menu-trigger`, `.dashboard-drawer-backdrop`, `.dashboard-card`, `.dashboard-kicker`, `.dashboard-section-heading`, `.dashboard-toast`)
- [x] **T1.5** Redesign Workspace OnboardingTour Modal (`.tour-backdrop`, `.tour-dialog`, `.tour-close`, `.tour-copy`, `.tour-progress`, `.tour-skip`, `.tour-back`, `.tour-next`) using HeroUI v3 Modal & Button recipes
- [x] **T1.6** Redesign Workspace Floating AI Assistant (`.iris-assistant*`) using HeroUI v3 Overlay, Message Bubble, and Field recipes
- [x] **T1.7** Verify zero edits to `src/app/workspace/layout.tsx` (all states, `useEffect`s, handlers, and JSX identical) and run unit tests + production build

## Phase 2 — Core Workspace Pages
- [x] **T2.1** Iris Intelligence (`.si-*`, `.si-chat-*`, `.si-review-*`) — Full right pane AI chat workspace, removed bounding box, top action toolbar, HeroUI v3 Card, SearchField, Chip, and Composer styling
- [x] **T2.2** Data Selection (`.ds-*`) — Multi-dataset parameter switcher tabs, (i) tooltips for Variable/Frequency/Aggregation, Global Average planetary extraction backend, catalog official website deep links, sorting/filtering by match % and data source, primary/queued dataset badges, and structured parameter chips
- [x] **T2.3** Data Preview (`.dp-*`, `.preview-*`, `.data-table-*`) — Modern HeroUI empty state card, removed top pipeline banner, parameter chips (frequency, window, region, aggregation), interactive (i) tooltips on all 5 KPI cards, larger regional map (340px), and compact 10-row CSV formatted data table

## Phase 3 — Data Analysis Workbench & Case Studies / Research
- [x] **T3.1** Data Analysis Workbench (`.da-*`) — Locked window scroll past left menu, replaced "Step" with "Analysis 1/2/...", moved "Explore in Visualization Studio" to prominent top-right primary CTA button, added multi-analysis view filter toggle, fixed dual observation period slider, and added interactive (i) parameter tooltips across statistical methods
- [x] **T3.2** Existing Research & Case Studies (`.research-*`, `.case-*`, `src/features/hazards/hazards.css`)

## Phase 4 — Forecasts & ML Forecast Workbench
- [x] **T4.1** Forecasts & ML Forecast section (`src/features/forecasts/forecasts.css`) — HeroUI v3 surfaces & controls while keeping `.result-warning` test-locked RGB values exact

## Phase 5 — Visualization Studio, Living Globe & 3D Presentation Chrome
- [x] **T5.1** Visualization Studio (`src/features/visualization/visualization.css`, `src/features/visualization/presentation/presentation.css`) — Bridge `.viz-immersive` light/dark environment tokens to HeroUI semantic tokens
- [x] **T5.2** Living Globe & MapLibre HUD (`.srs-*`, `.iris-map*`, `.iris-hud*`, `.iris-tool*` in `src/app/globals.css`)

## Phase 6 — Public Site & Marketing Pages
- [x] **T6.1** Landing page (`.landing-*`, `.product-window`, `.signal-*`, `.capability-*`)
- [x] **T6.2** Platform, Methodology, Data Catalog & About pages (`.page-*`, `.platform-*`, `.method-*`, `.catalog-*`, `.about-*`)

## Phase 7 — Final QA & Regression Sign-off
- [x] **T7.1** Full test suite, build verification, and final changelog audit
