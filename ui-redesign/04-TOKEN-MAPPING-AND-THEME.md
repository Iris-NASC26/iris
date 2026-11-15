# 04 — Token Mapping & Theme Implementation

> **File implemented in:** `src/styles/iris-theme.css` (imported at the top of `src/app/globals.css`)

---

## 1. Legacy Variable → HeroUI v3 Token Mapping

To guarantee zero regressions across the 1,351 existing `var(--...)` usages in `globals.css` and feature stylesheets, all legacy variables remain defined on `.app-shell` and `.app-shell.dark`, aliased directly to the new HeroUI v3 semantic tokens:

| Legacy Iris Variable | Usage Count | HeroUI v3 Semantic Token | Light Value (OKLCH / Hex) | Dark Value (OKLCH / Hex) |
|----------------------|------------:|--------------------------|---------------------------|--------------------------|
| `--bg` | 19 | `var(--background)` | `oklch(0.9850 0.0025 160)` (`#f9fbfa`) | `oklch(0.1850 0.0040 165)` (`#121514`) |
| `--panel` | 44 | `var(--surface-tertiary)` | `oklch(0.9680 0.0040 160)` (`#f3f6f4`) | `oklch(0.2280 0.0055 160)` (`#1b1e1c`) |
| `--card` | 140 | `var(--surface)` | `oklch(1 0 0)` (`#ffffff`) | `oklch(0.2523 0.0058 156.79)` (`#202321`) |
| `--card-soft` | 118 | `var(--surface-secondary)` | `oklch(0.9780 0.0030 160)` (`#f6f9f7`) | `oklch(0.2720 0.0062 158)` (`#252927`) |
| `--border` | 374 | `var(--border)` | `oklch(0.9241 0.0059 153.77)` (`#e3e7e4`) | `oklch(0.3387 0.0085 159.64)` (`#343936`) |
| `--border-strong` | 23 | `var(--border-secondary)` | `oklch(0.8837 0.0068 160.06)` (`#d5dad7`) | `oklch(0.4022 0.0102 156.74)` (`#444a46`) |
| `--text` | 147 | `var(--foreground)` | `oklch(0.2175 0.0063 179.01)` (`#171b1a`) | `oklch(0.9703 0.0041 157.18)` (`#f3f6f4`) |
| `--muted` | 304 | `var(--muted)` | `oklch(0.5351 0.0144 164.42)` (`#66706b`) | `oklch(0.7780 0.0113 158.77)` (`#b1b9b4`) |
| `--faint` | 78 | `var(--iris-faint)` | `oklch(0.6577 0.0127 161.87)` (`#8b948f`) | `oklch(0.6511 0.0127 161.86)` (`#89928d`) |
| `--green` | 222 | `var(--accent)` | `oklch(0.5292 0.1098 164.67)` (`#087f5b`) | `oklch(0.7729 0.1535 163.22)` (`#34d399`) |
| `--green-bright` | 104 | `var(--iris-accent-bright)` | `oklch(0.5960 0.1274 163.23)` (`#059669`) | `oklch(0.7729 0.1535 163.22)` (`#34d399`) |
| `--green-soft` | 91 | `var(--accent-soft)` | `oklch(0.9668 0.0174 164.66)` (`#eaf8f1`) | `oklch(0.3213 0.0481 167.14)` (`#173b2e`) |

---

## 2. HeroUI v3 Semantic Tokens Added

In addition to the legacy variables, `src/styles/iris-theme.css` defines the full HeroUI v3 token contract:

- **Canvas & Surfaces:**
  - `--background`, `--foreground`
  - `--surface`, `--surface-foreground`, `--surface-hover`
  - `--surface-secondary`, `--surface-secondary-foreground`
  - `--surface-tertiary`, `--surface-tertiary-foreground`
  - `--overlay`, `--overlay-foreground`
  - `--backdrop`
- **Interactive Controls & Accent (Iris Emerald):**
  - `--default`, `--default-foreground`, `--default-hover`
  - `--accent`, `--accent-foreground`, `--accent-hover`
  - `--accent-soft`, `--accent-soft-foreground`, `--accent-soft-hover`
  - `--segment`, `--segment-foreground`
  - `--focus`, `--link`
- **Form Fields:**
  - `--field-background`, `--field-foreground`, `--field-placeholder`, `--field-border`, `--field-border-hover`, `--field-border-focus`, `--field-radius`
  - `--iris-focus-ring`
- **Status Tokens:**
  - `--success`, `--success-foreground`, `--success-soft`, `--success-soft-foreground`
  - `--warning`, `--warning-foreground`, `--warning-soft`, `--warning-soft-foreground`
  - `--danger`, `--danger-foreground`, `--danger-soft`, `--danger-soft-foreground`
  - `--info`, `--info-foreground`, `--info-soft`, `--info-soft-foreground`
- **Borders, Radii, Shadows & Motion:**
  - `--border`, `--border-secondary`, `--border-tertiary`, `--separator`, `--separator-secondary`
  - `--radius` (`0.5rem`), `--radius-xs` (`2px`) through `--radius-4xl` (`32px`)
  - `--surface-shadow`, `--overlay-shadow`, `--field-shadow`
  - `--ease-smooth`, `--ease-out-quart`, `--ease-out-fluid`, `--iris-duration-fast` (`120ms`), `--iris-duration-base` (`180ms`), `--iris-duration-slow` (`250ms`)

---

## 3. Pure-CSS Root Dark Mode Synchronization

Because `ThemeContext.tsx` and the `.app-shell.dark` class on the root page wrapper are frozen, `src/styles/iris-theme.css` uses `:root, .light, .app-shell` for light tokens and `:root:has(.app-shell.dark), .dark, .app-shell.dark` for dark tokens. This ensures that `document.documentElement` (`:root`) and `document.body` automatically reflect the active theme tokens without modifying `ThemeContext.tsx` or adding any `useEffect`.
