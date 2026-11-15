# 00 — Master UI Redesign Plan

> **Branch:** `ui-redesign` · **Baseline commit:** `9a935d8`
> **Design System:** HeroUI v3 (`@heroui/styles` token architecture + Iris Emerald brand palette)
> **Hard Constraint:** Zero functionality changes, zero React hook/state/render modifications, zero layout/box-model changes.

---

## Phased Rollout Overview

| Phase | Scope | Primary Files | Status |
|-------|-------|---------------|--------|
| **Phase 0** | Discovery, Codebase Audit, Guardrails & Design System Specification | `ui-redesign/*` | ✅ Done |
| **Phase 1** | Foundation Token Bridge & Workspace Dashboard Layout Redesign | `src/styles/iris-theme.css`, `src/app/globals.css` (dashboard shell, sidebar, topbar, tour, assistant) | 🔄 In Progress |
| **Phase 2** | Core Workspace Pages (System Intelligence, Data Selection, Data Preview) | `src/app/globals.css` (`.si-*`, `.ds-*`, `.dp-*`) | ⏳ Todo |
| **Phase 3** | Data Analysis Workbench & Existing Research / Case Studies | `src/app/globals.css` (`.da-*`, `.research-*`, `.case-*`), `src/features/hazards/hazards.css` | ⏳ Todo |
| **Phase 4** | Forecasts & ML Forecast Workbench | `src/features/forecasts/forecasts.css` | ⏳ Todo |
| **Phase 5** | Visualization Studio, Living Globe & 3D Presentation Chrome | `src/features/visualization/visualization.css`, `src/features/visualization/presentation/presentation.css`, `src/app/globals.css` (`.srs-*`, `.iris-map-*`, `.visualize-*`) | ⏳ Todo |
| **Phase 6** | Public Site & Marketing Pages (Landing, Platform, Methodology, Data, About) | `src/app/globals.css` (`.topbar`, `.landing-*`, `.platform-*`, `.page-*`, `.about-*`, `.method-*`, `.catalog-*`) | ⏳ Todo |
| **Phase 7** | Full Verification, Contrast Audit & Regression Sign-off | `ui-redesign/logs/*`, Playwright & unit test suites | ⏳ Todo |

---

## Detailed Phase Breakdown

### Phase 1: Foundation Token Bridge & Workspace Dashboard Layout (Current)
**Goal:** Establish the HeroUI v3 semantic CSS token layer (`--background`, `--foreground`, `--surface`, `--surface-secondary`, `--surface-tertiary`, `--overlay`, `--default`, `--accent`, `--accent-foreground`, `--accent-soft`, `--accent-soft-foreground`, `--accent-hover`, `--focus`, `--border`, `--border-secondary`, `--separator`, `--surface-shadow`, `--overlay-shadow`, `--field-*`, `--radius-*`) mapped to Iris's emerald palette in both light and dark modes, and redesign the Workspace Dashboard Layout (`src/app/workspace/layout.tsx` styles in `src/app/globals.css`) without touching `layout.tsx` code or states.

**Deliverables:**
1. Create `src/styles/iris-theme.css` containing the complete HeroUI v3 semantic token system (Light + Dark) and legacy variable aliases (`--bg`, `--panel`, `--card`, `--card-soft`, `--border`, `--border-strong`, `--text`, `--muted`, `--faint`, `--green`, `--green-bright`, `--green-soft`).
2. Import `src/styles/iris-theme.css` in `src/app/globals.css`.
3. Redesign the Workspace Dashboard Layout CSS in `src/app/globals.css`:
   - `.dashboard-shell`, `.dashboard-page`, `.dashboard-content` (HeroUI canvas & surface hierarchy)
   - `.dashboard-sidebar`, `.dashboard-brand-row`, `.dashboard-brand`, `.brand-mark`, `.orbit-dot`, `.sidebar-collapse`, `.sidebar-mobile-close` (HeroUI Surface + Ghost/Outline Icon Button recipes)
   - `.dashboard-nav`, `.dashboard-nav-group`, `.dashboard-nav-label`, `.dashboard-nav a`, `.dashboard-nav a.active` (HeroUI ListBox item states: hover `--default`, active `--accent-soft` + `--accent-soft-foreground` + `--accent` indicator, focus-visible ring, active press states)
   - `.dashboard-sidebar-footer` links & buttons
   - `.dashboard-topbar`, `.dashboard-menu-trigger`, `.dashboard-context-chip`, `.dashboard-theme-toggle` (HeroUI sticky translucent Navbar + Chip + IconButton recipes)
   - `.dashboard-card`, `.dashboard-kicker`, `.dashboard-section-heading`, `.dashboard-toast`, `.dashboard-drawer-backdrop`
   - `.tour-*` (OnboardingTour modal overlay, dialog, progress pills, action buttons)
   - `.iris-assistant*` (Floating launcher, draggable panel, message bubbles, composer field & send button)
4. Verify zero changes to `src/app/workspace/layout.tsx` (all states, `useEffect`s, and JSX untouched) and pass build + tests.

### Phase 2: Core Workspace Pages (System Intelligence, Data Selection, Data Preview)
- Apply HeroUI Card, SearchField, Input, Chip, Badge, Button, and Table recipes to `.si-*`, `.ds-*`, and `.dp-*` selectors in `src/app/globals.css`.
- Keep all dimensions, grid templates, and media queries untouched.

### Phase 3: Data Analysis Workbench & Case Studies / Research
- Apply HeroUI Card, Accordion/Disclosure, Popover, Pill/Badge, and Alert recipes to `.da-*`, `.research-*`, `.case-*`, and `hazards.css`.

### Phase 4: Forecasts & ML Forecast Workbench
- Apply HeroUI surface tokens, segmented controls, and table/metric styling to `src/features/forecasts/forecasts.css`.
- **Critical guardrail:** Keep `.result-warning` (`--forecast-danger`) computed RGB colors exact (`rgb(179, 56, 70)` in light mode, `rgb(255, 155, 168)` in dark mode) for Playwright test compatibility.

### Phase 5: Visualization Studio, Living Globe & 3D Presentation Chrome
- Bridge `.viz-immersive` light/dark environment tokens to HeroUI semantic tokens in `visualization.css` and `presentation.css`.
- Restyle `.srs-*`, `.iris-map-*`, `.iris-hud*`, and `.visualize-*` in `globals.css`.

### Phase 6: Public Site & Marketing Pages
- Apply HeroUI Navbar, Card, Surface, Hero, and Badge styling to `.topbar`, `.landing-*`, `.platform-*`, `.page-*`, `.about-*`, `.method-*`, and `.catalog-*`.

### Phase 7: Final Verification & Audit
- Run full unit test suite (`pnpm test:visualization`), build (`pnpm build`), and verify all logs in `ui-redesign/logs/` are complete.
