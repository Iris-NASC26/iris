# Architecture & Design Decisions Log (ADR)

> Any design or technical decision that clarifies or adapts the redesign plan is recorded here before implementation.

---

## ADR-001: Pure-CSS HeroUI v3 Token & Recipe Architecture (No JSX Component Replacement)
- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** HeroUI v3 (`@heroui/react`) builds interactive components on React Aria Components, which require `onPress` instead of `onClick`, render custom DOM trees, portal overlays outside `.app-shell`, and apply opinionated box sizing. Meanwhile, the user requires zero impact on functionality, `useEffect`s, states, renders, or component sizes.
- **Decision:** Implement the HeroUI v3 design system via a dedicated CSS token stylesheet (`src/styles/iris-theme.css`) and apply HeroUI v3 surface, border, radius, shadow, focus-ring, and interactive state recipes (`:hover`, `:active`, `:focus-visible`, `.active`, `:disabled`) directly to Iris's existing CSS selectors. Keep all `.tsx` / `.ts` component files 100% untouched.

## ADR-002: Preserving the Iris Emerald Palette in Light & Dark Modes
- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** HeroUI v3's default theme uses a blue accent (`oklch(0.6204 0.195 253.83)`) and violet-tinted neutrals (`hue ~286°`). The user explicitly requested keeping Iris's primary colours and greenish palette in both light and dark modes.
- **Decision:** Override HeroUI's semantic tokens with Iris's emerald scale (`--accent: oklch(0.5292 0.1098 164.67)` / `#087f5b` in light mode; `--accent: oklch(0.7729 0.1535 163.22)` / `#34d399` in dark mode) and subtle green-tinted neutral surfaces (`hue ~155–165°`), while aliasing all 21 legacy Iris CSS variables (`--bg`, `--panel`, `--card`, `--card-soft`, `--border`, `--border-strong`, `--text`, `--muted`, `--faint`, `--green`, `--green-bright`, `--green-soft`, etc.) to the HeroUI semantic tokens.

## ADR-003: Zero-JS Dark Mode Synchronization via `:root:has(.app-shell.dark)`
- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** `ThemeContext.tsx` toggles `.dark` on `.app-shell` wrapper divs (`src/app/workspace/layout.tsx`, `src/app/page.tsx`, `src/components/layout/PageShell.tsx`). Modifying `ThemeContext.tsx` to mutate `document.documentElement` would alter a `useEffect`.
- **Decision:** Use `:root:has(.app-shell.dark), .dark, .app-shell.dark` in `src/styles/iris-theme.css` so dark mode tokens resolve both on `.app-shell.dark` and at `:root` with zero JavaScript or `useEffect` changes.

## ADR-004: `.dashboard-context-chip` Styling Restoration in Workspace Topbar
- **Date:** 2026-11-15
- **Status:** Accepted
- **Context:** `src/app/workspace/layout.tsx` renders `<div className="dashboard-context-chip">` in `.dashboard-topbar`, but its CSS rules were accidentally removed in an earlier commit (`e2e3802`), leaving its text and `<i>` status dot unstyled.
- **Decision:** Style `.dashboard-context-chip` in `src/app/globals.css` using the HeroUI v3 Soft Surface Chip recipe (`background: var(--surface-secondary)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, pulsing emerald status dot `i`, and compact typography) without altering a single line of `src/app/workspace/layout.tsx`.
