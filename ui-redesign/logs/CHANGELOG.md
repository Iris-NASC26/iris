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
