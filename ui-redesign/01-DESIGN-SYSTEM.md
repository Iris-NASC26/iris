# 01 — Iris × HeroUI Design System

> **Version:** 1.0 (2026-11-15) · **Based on:** HeroUI v3 default theme (`@heroui/styles`) ·
> **Brand constraint:** keep Iris's emerald/green primary palette in light **and** dark mode.
>
> Read `02-FUNCTIONALITY-GUARDRAILS.md` first. Everything here is applied **within** those rules:
> paint-only changes, no size or layout changes, no logic changes.

---

## 0. How to use this document

- **§1–§7** define the *foundations* (tokens). Implementation code for them lives in
  `04-TOKEN-MAPPING-AND-THEME.md`.
- **§8** gives a *recipe* for every Iris UI primitive: which HeroUI component it should look like, which
  tokens it uses per state, and which existing CSS selectors to restyle.
- **§9** covers data-viz / maps / 3D chrome. **§10** accessibility. **§11** do / don't.
- When a token name is shown as `--accent`, it is the HeroUI semantic CSS variable. Tailwind utilities
  (`bg-accent`, `text-muted`, …) map 1:1 once `@heroui/styles` theme is imported, but Iris's codebase is
  ~99 % hand-written CSS classes, so **CSS variables are the primary implementation handle**.

### Design direction (HeroUI principles, Iris flavour)

1. **Calm scientific instrument.** Whitespace, typography and surface levels create hierarchy — not
   decoration. Data (maps, charts, numbers) is the hero; chrome recedes.
2. **One strong accent: Iris emerald.** Used for primary actions, focus, selection and "live" signals.
   Status colours (success / warning / danger / info) are reserved for meaning.
3. **Surface levels over borders.** Canvas → surface → secondary → tertiary. Borders are quiet; dark mode
   relies on surface steps instead of shadows.
4. **Visible, consistent states.** Every interactive element has hover, pressed, focus-visible, selected,
   disabled — all from tokens.
5. **Same token in both modes.** Components never branch by mode; CSS variables resolve light/dark.
6. **Density is a feature.** Iris is a dense pro tool (font sizes down to 7–11 px, 34 px controls). We keep
   all existing sizes; the redesign changes *paint*, not *geometry*.

---

## 1. Colour system

### 1.1 Brand palette (primitive scale — "Iris Emerald")

Iris's greens are Tailwind *emerald*. They become the primitive scale behind the semantic tokens.
Primitives are **never used directly in component CSS** — only through semantic tokens.

| Primitive | Hex | OKLCH | Current Iris usage |
|-----------|-----|-------|--------------------|
| `--iris-emerald-50` | `#ecfdf5` | `oklch(0.9793 0.0207 166.11)` | — |
| `--iris-emerald-100` | `#d1fae5` | `oklch(0.9505 0.0507 163.05)` | chips/backgrounds |
| `--iris-emerald-200` | `#a7f3d0` | `oklch(0.9049 0.0895 164.15)` | orbit dot, highlights |
| `--iris-emerald-300` | `#6ee7b7` | `oklch(0.8452 0.1299 164.98)` | — |
| `--iris-emerald-400` | `#34d399` | `oklch(0.7729 0.1535 163.22)` | **dark-mode accent** (`--green` dark) |
| `--iris-emerald-500` | `#10b981` | `oklch(0.6959 0.1491 162.48)` | indicators |
| `--iris-emerald-600` | `#059669` | `oklch(0.5960 0.1274 163.23)` | **focus ring, `--green-bright`** |
| `--iris-emerald-700` | `#087f5b` | `oklch(0.5292 0.1098 164.67)` | **light-mode accent** (`--green`), brand mark `#097c5a` |
| `--iris-emerald-800` | `#065f46` | `oklch(0.4318 0.0865 166.91)` | accent hover (light) |
| `--iris-emerald-900` | `#064e3b` | `oklch(0.3780 0.0730 168.94)` | — |
| `--iris-emerald-950` | `#022c22` | `oklch(0.2621 0.0487 172.55)` | accent foreground (dark) |
| `--iris-mint-soft` | `#eaf8f1` | `oklch(0.9668 0.0174 164.66)` | **`--green-soft` light** |
| `--iris-forest-soft` | `#173b2e` | `oklch(0.3213 0.0481 167.14)` | **`--green-soft` dark** |

### 1.2 Neutral palette (green-tinted greys)

Iris neutrals carry a faint green hue (~150–165°) instead of HeroUI's default violet-grey (~286°).
**Keep the green tint** — it is part of the brand.

| Role | Light hex | Light OKLCH | Dark hex | Dark OKLCH |
|------|-----------|-------------|----------|------------|
| Ink / foreground | `#171b1a` | `oklch(0.2175 0.0063 179.01)` | `#f3f6f4` | `oklch(0.9703 0.0041 157.18)` |
| Muted text | `#66706b` | `oklch(0.5351 0.0144 164.42)` | `#b1b9b4` | `oklch(0.7780 0.0113 158.77)` |
| Faint text | `#8b948f` | `oklch(0.6577 0.0127 161.87)` | `#89928d` | `oklch(0.6511 0.0127 161.86)` |
| Border | `#e3e7e4` | `oklch(0.9241 0.0059 153.77)` | `#343936` | `oklch(0.3387 0.0085 159.64)` |
| Border strong | `#d5dad7` | `oklch(0.8837 0.0068 160.06)` | `#444a46` | `oklch(0.4022 0.0102 156.74)` |
| Panel | `#f7f8f7` | `oklch(0.9781 0.0017 145.56)` | `#202321` | `oklch(0.2523 0.0058 156.79)` |
| Card soft | `#fafbfa` | `oklch(0.9871 0.0017 145.56)` | `#242725` | `oklch(0.2689 0.0057 156.83)` |
| Canvas | `#ffffff` | `oklch(1 0 0)` | `#171918` | `oklch(0.2108 0.0036 164.68)` |

### 1.3 Semantic tokens (HeroUI names → Iris values)

These are the **only** colour handles component CSS should use. "Phase 1" = legacy-exact value used to
land the foundation with zero visual diff. "Target" = redesigned value adopted in Phase 2 (token tuning),
after which every component that uses the token updates automatically.

#### Light mode

| HeroUI token | Purpose | Phase 1 (legacy-exact) | Target (redesign) |
|---|---|---|---|
| `--background` | Page canvas | `#ffffff` | `oklch(0.9781 0.0030 160)` ≈ `#f6f8f7` (HeroUI-style tinted canvas so white surfaces float) |
| `--foreground` | Primary text | `#171b1a` | same |
| `--surface` | Cards, panels, non-floating containers | `#ffffff` | `#ffffff` |
| `--surface-foreground` | Text on surface | `var(--foreground)` | same |
| `--surface-secondary` | Nested / lower-emphasis regions | `#fafbfa` (card-soft) | `oklch(0.9690 0.0035 160)` |
| `--surface-tertiary` | Stronger separation, sidebars, wells | `#f7f8f7` (panel) | `oklch(0.9560 0.0045 160)` |
| `--overlay` | Popovers, dropdowns, tour dialog, toasts | `#ffffff` | `#ffffff` |
| `--overlay-foreground` | Text on overlay | `var(--foreground)` | same |
| `--backdrop` | Dim behind overlays/drawers | `rgb(0 0 0 / 0.5)` | `oklch(0.2175 0.0063 179 / 0.45)` (green-black) |
| `--muted` | Secondary text & icons | `#66706b` | same (5.13:1 on white ✅) |
| `--default` | Neutral control fill (secondary buttons, segmented track) | `oklch(0.9560 0.0045 160)` | same |
| `--default-foreground` | Text on default | `#171b1a` | same |
| `--accent` | **Primary actions, selection, focus emphasis** | `#087f5b` | `#087f5b` ✅ brand kept |
| `--accent-foreground` | Text on accent | `#ffffff` (5.00:1 ✅) | same |
| `--accent-soft` | Soft accent fill (chips, selected rows, active nav) | `#eaf8f1` | same |
| `--accent-soft-foreground` | Text on accent-soft | `#087f5b` (4.57:1 ✅) | same |
| `--accent-hover` | Hover for accent fills | `#065f46` | `color-mix(in oklab, var(--accent) 88%, black)` |
| `--focus` | Focus ring | `#059669` | same |
| `--link` | Inline links | `#087f5b` | same |
| `--success` / `-foreground` | Positive outcome | `#059669` / `#ffffff`* | same |
| `--warning` / `-foreground` | Caution | `#d97706` / `#171b1a` (5.46:1 ✅) | same; **text-on-surface warning uses `#b45309`** (5.02:1) |
| `--danger` / `-foreground` | Errors, destructive | `#dc2626` / `#ffffff` (4.83:1 ✅) | same |
| `--info` / `-foreground` (Iris extension) | Neutral info, data-source badges | `#0284c7` / `#ffffff` | text-on-surface info uses `#0369a1` |
| `--border` | Component boundaries | `#e3e7e4` | same |
| `--border-secondary` | Stronger boundary (inputs, hovered cards) | `#d5dad7` | same |
| `--separator` | Quiet dividers | `#e3e7e4` | `oklch(0.9400 0.0050 155)` |
| `--field-background` | Inputs | `#ffffff` | same |
| `--field-foreground` | Input text | `#171b1a` | same |
| `--field-placeholder` | Placeholder | `#8b948f` | same (placeholder is exempt from AA, but never use for labels) |
| `--field-border` | Input border | `#d5dad7` | same |
| `--segment` | Selected item in segmented control | `#ffffff` | same |

\* white on `#059669` is 3.77:1 — OK for large/bold text and icons only. For small text on a success
fill, use `--accent` (`#087f5b`) instead.

#### Dark mode

| HeroUI token | Phase 1 (legacy-exact) | Target (redesign) |
|---|---|---|
| `--background` | `#171918` | `oklch(0.1850 0.0040 165)` ≈ `#121514` (deeper canvas so surfaces step up) |
| `--foreground` | `#f3f6f4` | same |
| `--surface` | `#202321` | same |
| `--surface-secondary` | `#242725` | same |
| `--surface-tertiary` | `#202321` | `oklch(0.2900 0.0060 160)` |
| `--overlay` | `#202321` | `oklch(0.2700 0.0060 160)` + inset edge (HeroUI dark overlay style) |
| `--backdrop` | `rgb(0 0 0 / 0.6)` | same |
| `--muted` | `#b1b9b4` | same (8.81:1 ✅) |
| `--default` | `#2b2f2c` | same |
| `--default-foreground` | `#f3f6f4` | same |
| `--accent` | `#34d399` ✅ brand kept | same |
| `--accent-foreground` | `#06281d` (8.22:1 ✅) | same |
| `--accent-soft` | `#173b2e` | same |
| `--accent-soft-foreground` | `#34d399` (6.42:1 ✅) | same |
| `--accent-hover` | `#6ee7b7` | `color-mix(in oklab, var(--accent) 85%, white)` |
| `--focus` | `#34d399` | same |
| `--link` | `#34d399` | same |
| `--success` | `#34d399` / fg `#06281d` | same |
| `--warning` | `#f59e0b` / fg `#171b1a` | same |
| `--danger` | `#f87171` / fg `#171b1a` | same |
| `--info` | `#38bdf8` / fg `#06202c` | same |
| `--border` | `#343936` | same |
| `--border-secondary` | `#444a46` | same |
| `--separator` | `#343936` | `#2c302e` |
| `--field-background` | `#202321` | `#1b1e1c` |
| `--field-border` | `#444a46` | same |

#### Iris extension tokens (not in HeroUI; prefixed `--iris-` to avoid collisions)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--iris-faint` | `#8b948f` | `#89928d` | Tertiary text: captions, timestamps (≥ 12 px bold or decorative only — 3.12:1 on white) |
| `--iris-accent-bright` | `#059669` | `#34d399` | Live dots, progress, highlights (legacy `--green-bright`) |
| `--iris-brand-mark` | `#097c5a` | `#097c5a` | Logo tile (constant across modes) |
| `--iris-brand-orbit` | `#a7f3d0` | `#a7f3d0` | Logo orbit dot |
| `--iris-map-bg` / `-road` / `-line` / `-water` / `-label` | legacy values | legacy values | Map placeholder art (unchanged) |
| `--iris-landing-mint` / `-blue` / `-ink` | legacy values | legacy values | Landing hero art (unchanged) |
| `--iris-forecast-danger` | `#b33846` | `#ff9ba8` | **Test-locked.** Forecast warnings |
| `--iris-studio-*` | see §9.4 | see §9.4 | Visualization studio environment |

### 1.4 Colour usage rules

- **Accent budget:** at most **one filled accent element per view region** (e.g. "Run analysis"). Other
  actions use `secondary` / `outline` / `ghost` recipes.
- **Selection** = `--accent-soft` fill + `--accent-soft-foreground` text (+ optional `inset 3px 0 0
  var(--accent)` indicator — already used by Iris nav).
- **Hover** on neutral items = `--default` fill (light) / `--surface-secondary` (dark) — never accent.
- **Status** colours always come with an icon or label (never colour alone).
- **Never** use raw hex in component CSS after Phase 2; use tokens. Raw hex is allowed only in
  `iris-theme.css` and `src/theme/palette.ts`.

---

## 2. Typography

HeroUI inherits the app font. Iris keeps its fonts — **no new font loads**.

| Token | Value | Notes |
|---|---|---|
| `--font-sans` | `"Inter", ui-sans-serif, system-ui, sans-serif` | Already loaded (400/500/600/700) |
| `--font-mono` | `"DM Mono", ui-monospace, monospace` | Already loaded (400/500); used for IDs, coordinates, kbd, numeric readouts |

### 2.1 Type roles (for consistent *styling*; sizes of existing elements are frozen)

Existing elements keep their `font-size` and `line-height`. The roles below define **colour, weight,
tracking and case** — which *may* be harmonised (weight/tracking are "Caution" properties: verify with
box-diff). Sizes listed are for **new** elements only.

| Role | New-element size / line-height | Weight | Tracking | Colour token | Iris examples |
|---|---|---|---|---|---|
| Display | 44–72 px (clamp) / 1.05 | 600 | -0.04em | `--foreground` | landing hero, `.result-big-number` |
| H1 page title | 20–24 px / 1.2 | 650 | -0.025em | `--foreground` | `.dashboard-topbar h1` |
| H2 section | 16–18 px / 1.3 | 600 | -0.015em | `--foreground` | card headings |
| H3 / card title | 13–14 px / 1.35 | 600 | -0.01em | `--foreground` | `.chart-title-row` |
| Body | 13–14 px / 1.55 | 400 | 0 | `--foreground` | copy |
| Body small | 12 px / 1.5 | 400–500 | 0 | `--muted` | descriptions |
| Label | 11–12 px / 1.3 | 500–600 | 0 | `--foreground` | field labels, buttons |
| Overline / kicker | 9–10 px / 1.2 | 700 | +0.08em, UPPERCASE | `--iris-faint` or `--accent` | `.section-kicker`, `.dropdown-label`, `.dashboard-nav-label` (an established convention — keep) |
| Caption | 9–11 px / 1.3 | 500 | +0.01em | `--muted` / `--iris-faint` | timestamps, source lines |
| Numeric / metric | inherit | 500–600 | -0.02em | `--foreground` | `font-variant-numeric: tabular-nums` (Caution property) |
| Code / ID | inherit | 400–500 | 0 | `--accent-soft-foreground` on `--accent-soft` | job IDs, `kbd` |

Rules: sentence case for headings and buttons; ALL-CAPS only for overlines; never more than 3 weights in
one component; numbers that update live use tabular figures.

---

## 3. Spacing & layout

- HeroUI base: `--spacing: 0.25rem` (4 px rhythm). Iris already uses multiples of ~4 px.
- **All existing padding/margin/gap/sizes are frozen.** The spacing scale applies only to brand-new
  elements (if any are approved).
- Breakpoints in use (frozen): 1650, 1180, 1150, 1100, 1050, 1000, 980, 950, 900, 860, 850, 767/760,
  700, 680, 640, 600, 560, 480, 430, 390 px.

## 4. Shape (radius)

| Token | Value | Use |
|---|---|---|
| `--radius` | `0.5rem` (8 px) | HeroUI base |
| `--field-radius` | `calc(var(--radius) * 1)` = 8 px | Iris override (HeroUI default is 12 px; Iris stays compact) |
| `rounded-xs` / `--radius-xs` | 2 px | progress tracks, tiny tags |
| `rounded-sm` | 4 px | inline code, kbd, small badges |
| `rounded-md` | 6 px | small buttons, menu items, nav items |
| `rounded-lg` | 8 px | buttons, inputs, icon buttons, segmented items |
| `rounded-xl` | 12 px | cards, dropdowns, popovers, toasts |
| `rounded-2xl` | 16 px | hero cards, large panels, modals/tour |
| `rounded-3xl` | 24 px | landing showcase frames |
| full | `999px` | chips, pills, dots, avatars |

Radius **is** an allowed (paint-only) change. Iris currently uses 33 distinct radii (most common: 8, 6,
10, 7, 9, 5, 12 px). Normalise to the scale above: 5–7 px → 6 px, 8–9 px → 8 px, 10–12 px → 12 px,
14 px+ → 16 px. Nested surfaces use a smaller radius than their parent (`inner = outer − padding`, min 4 px).

## 5. Elevation

| Token | Light | Dark | Use |
|---|---|---|---|
| `--surface-shadow` | `0 2px 4px 0 rgb(0 0 0 / .04), 0 1px 2px 0 rgb(0 0 0 / .06), 0 0 1px 0 rgb(0 0 0 / .06)` | `none` (use border/surface step) | cards, panels |
| `--overlay-shadow` | `0 4px 16px 0 rgb(23 27 26 / .08), 0 8px 24px 0 rgb(23 27 26 / .09)` | `inset 0 0 0 1px rgb(255 255 255 / .06)` | dropdowns, tour, toasts, popovers |
| `--field-shadow` | `none` (Iris uses visible borders) | `none` | inputs |
| `--iris-focus-ring` | `0 0 0 3px color-mix(in srgb, var(--focus) 18%, transparent)` | same | soft halo on focused fields (existing Iris pattern) |

Rules: max one shadow level per element; do not stack custom shadows on top of these; dark mode has no
drop shadows.

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--iris-duration-fast` | 120 ms | hover colour, press |
| `--iris-duration-base` | 180 ms | focus ring, selection, theme colour transitions |
| `--iris-duration-slow` | 250 ms | overlays fade/scale, sidebar (existing) |
| `--ease-smooth` | `ease` | default |
| `--ease-out-quart` | `cubic-bezier(.165,.84,.44,1)` | overlays entering |
| `--ease-out-fluid` | `cubic-bezier(.32,.72,0,1)` | press release |

- Animate only paint properties (`color`, `background-color`, `border-color`, `box-shadow`, `opacity`,
  `transform` on buttons). **Never** add transitions to `width/height/top/left/grid` (existing ones, e.g.
  sidebar `width .22s`, stay untouched).
- Button press: `transform: scale(0.97)` on `:active` — buttons only, never map/canvas/SVG ancestors.
- Every new animation is wrapped by the existing `@media (prefers-reduced-motion: reduce)` blocks
  (set `transition: none; animation: none`).

## 7. Iconography

- Keep `lucide-react` + `components/ui/Icon.tsx`; sizes (`size={17}` etc.) are frozen.
- Icons use `currentColor`; colour comes from the parent token (`--muted` default, `--foreground` on hover,
  `--accent` when active).
- Icon-only buttons keep their `aria-label` (tests depend on it).

---

## 8. Component recipes ("HeroUI look, Iris DOM")

Each recipe maps an **existing Iris CSS class** to the **HeroUI component whose look it adopts**. Apply by
editing the existing selector's paint properties only. State selectors: `:hover`, `:active`,
`:focus-visible`, `[aria-current]`, `[aria-selected=true]`, `[aria-pressed=true]`, `.active`, `:disabled`,
`[aria-disabled=true]`.

### 8.1 Buttons → HeroUI `Button` variants

| HeroUI variant | Iris classes (examples) | Rest | Hover | Pressed | Focus-visible | Disabled |
|---|---|---|---|---|---|---|
| `primary` | `.run-button`, `.da-primary`, primary CTAs on landing, "Generate forecast…" | bg `--accent`, fg `--accent-foreground`, border-color `transparent` | bg `--accent-hover` | `scale(.97)` | `outline: 2px solid var(--focus); outline-offset: 2px` | `opacity: .5; cursor: not-allowed` (no transform) |
| `secondary` | `.share-button`, secondary toolbar buttons | bg `--default`, fg `--default-foreground` | bg `color-mix(in oklab, var(--default) 90%, var(--foreground))` | `scale(.97)` | same | same |
| `tertiary` | dismiss / cancel buttons, `.da-clear` | bg transparent, fg `--muted` | bg `--default`, fg `--foreground` | `scale(.97)` | same | same |
| `outline` | `.icon-button`, `.theme-toggle`, export buttons | bg `--surface`, border-color `--border`, fg `--muted` | bg `--surface-secondary`, border-color `--border-secondary`, fg `--foreground` | `scale(.97)` | same | same |
| `ghost` | `.nav-button`, `.dashboard-sidebar-footer button/a`, `.sidebar-collapse` | bg transparent, fg `--muted` | bg `--default` (light) / `--surface-secondary` (dark), fg `--foreground` | — | same | same |
| `danger` | destructive confirm (if any) | bg `--danger`, fg `--danger-foreground` | `color-mix(in oklab, var(--danger) 88%, black)` | `scale(.97)` | outline `--danger` | same |
| `danger-soft` | "remove", "clear all" | bg `color-mix(in srgb, var(--danger) 10%, transparent)`, fg `--danger` | 16 % mix | `scale(.97)` | same | same |
| loading | `.button-spinner` inside a button | keep spinner geometry; spinner colour `currentColor` | — | — | — | — |

Icon-only buttons (`.theme-toggle`, `.icon-button`, `.sidebar-collapse`, `.iris-tool`): `outline` or `ghost`
recipe, radius `--radius-lg`, keep 34 px (etc.) frozen sizes.

### 8.2 Navigation

| Iris | HeroUI look | Spec |
|---|---|---|
| `.topbar`, `.dashboard-topbar` | Navbar surface | bg `color-mix(in srgb, var(--background) 92%, transparent)` + existing `backdrop-filter`; bottom border-color `--separator` |
| `.dashboard-sidebar` | Surface (tertiary) + ListBox items | bg `--surface-tertiary` (target) ; right border-color `--separator` |
| `.dashboard-nav a` | ListBox item | rest fg `--muted`, radius `--radius-md`; hover bg `--default` fg `--foreground`; `.active` / `[aria-current=page]` bg `--accent-soft`, fg `--accent-soft-foreground`, icon `--accent`, optional `inset 3px 0 0 var(--accent)` |
| `.dashboard-nav-label`, `.dropdown-label` | ListBox section header | overline role, colour `--iris-faint` |
| `.phenomenon-tabs`, studio tabs (`role=tab`) | Tabs (primary) | track bg `--default`, radius `--radius-lg`; selected tab bg `--segment` + `--surface-shadow` (light) / `--surface-secondary` (dark), fg `--foreground`; unselected fg `--muted` |
| `.segmented` / chart-controls toggles | ToggleButtonGroup | same as Tabs recipe, `[aria-pressed=true]` = selected |
| breadcrumbs (if any) | Breadcrumbs | fg `--muted`, current `--foreground`, separators `--iris-faint` |
| `.dashboard-menu-trigger` (hamburger) | Button ghost icon-only | bars colour `--foreground` |

### 8.3 Inputs & selection controls

| Iris | HeroUI look | Spec |
|---|---|---|
| `.search-field` (wrapper with `input` + `kbd`) | SearchField | bg `--field-background`, border-color `--field-border`, radius `--field-radius`; hover border-color `--border-secondary`; `:focus-within` border-color `--focus` + `box-shadow: var(--iris-focus-ring)`; placeholder `--field-placeholder` |
| text/number inputs, `textarea`, native `select` | TextField / Input / NumberField / Select | same as above. **Keep native elements** (`combobox`, `option`, `spinbutton` roles are test-locked) |
| `kbd`, `.shortcut` | Kbd | bg `--default`, fg `--muted`, border-color `--border`, radius `--radius-sm`, font `--font-mono` |
| `input[type=range]` (`.range-inputs`, `.range-track`) | Slider | track `--default`, fill `--accent`, thumb `--surface` with `0 0 0 1px var(--border-secondary)` + `--surface-shadow`; focus ring `--focus`. Use `accent-color: var(--accent)` where custom thumbs aren't styled |
| checkboxes / radios (native) | Checkbox / Radio | `accent-color: var(--accent)`; focus outline `--focus` |
| toggle switches (if custom) | Switch | off track `--default`, on track `--accent`, thumb white |
| `.field-label` | Label | `--foreground`, weight 500–600 |
| helper / error text | Description / FieldError | `--muted` / `--danger` |

### 8.4 Containers

| Iris | HeroUI look | Spec |
|---|---|---|
| `.map-card`, `.chart-card`, `.variable-card`, `.metric`, `.ds-*` cards, `.si-*` cards, `.da-method`, `.featured-*`, `.catalog-*` | Card (default) | bg `--surface`, border-color `--border`, radius `--radius-xl`, shadow `--surface-shadow` (light only) |
| hover-able cards (clickable) | Card + hover | hover border-color `--border-secondary`; selected: border-color `--accent`, `box-shadow: 0 0 0 1px var(--accent)` (inset if no room) |
| `.control-panel`, `.panel-scroll`, wells | Surface secondary | bg `--surface-secondary` |
| `.empty-state`, `.empty-visual` | Surface tertiary + muted content | bg `--surface-tertiary`, icon `--iris-faint` |
| section dividers | Separator | border-color `--separator` |
| `.case-dropdown`, popover menus | Dropdown / Popover | bg `--overlay`, border-color `--border`, radius `--radius-xl`, shadow `--overlay-shadow`; items radius `--radius-md`, hover bg `--default` |
| `.tour-*` (OnboardingTour dialog) | Modal | dialog bg `--overlay`, radius `--radius-2xl`, shadow `--overlay-shadow`; backdrop `--backdrop` |
| `.dashboard-drawer-backdrop` | Drawer backdrop | bg `--backdrop` |
| `.iris-assistant` panel | Sheet / Drawer surface | bg `--overlay`, border-color `--border`, shadow `--overlay-shadow` |
| `.toast` | Toast | bg `--overlay`, fg `--overlay-foreground`, border-color `--border`, radius `--radius-xl`, shadow `--overlay-shadow`; status stripe/icon by status token |

### 8.5 Feedback & status

| Iris | HeroUI look | Spec |
|---|---|---|
| `.live-chip`, `.data-chip`, `.ai-chip`, `.dashboard-context-chip`, `.active-pill`, `.source-badge-*`, `.da-step-badge`, `.da-compat-badge` | Chip (soft) | radius full; `accent` chip: bg `--accent-soft`, fg `--accent-soft-foreground`; `default`: bg `--default`, fg `--muted`; `warning`: bg `color-mix(in srgb, var(--warning) 14%, transparent)`, fg `#b45309` / dark `--warning`; `danger`: mix 12 %, fg `--danger`; `info`: mix 12 %, fg `#0369a1` / dark `--info` |
| live status dots (`i` inside chips) | Badge dot | `--iris-accent-bright`; pulsing animation kept, reduced-motion safe |
| `.verdict`, `.confidence`, `.srs-caveat`, `.da-incompat`, `.ds-demo-notice`, `.iris-map-error`, warnings | Alert | bg mix of status 8–10 % on `--surface`, border-color mix 24 %, icon + title in status colour, body `--foreground` |
| `.result-warning` | Alert (danger) | **colour locked** to `--iris-forecast-danger`; you may restyle radius/border mix only |
| `.skeleton`, `.verdict-skeleton` | Skeleton (shimmer) | base `--default`, shimmer `color-mix(in srgb, var(--surface) 60%, transparent)`; reduced-motion: static |
| `.button-spinner`, loaders | Spinner | `currentColor` / `--accent` |
| progress (`--progress` var) | ProgressBar | track `--default`, fill `--accent`, radius full. **Do not touch the computed width** |
| tooltips (native `title`) | — | keep native `title` (no HeroUI Tooltip swap) |

### 8.6 Data display

| Iris | HeroUI look | Spec |
|---|---|---|
| `<table>` (ml-forecast, data preview, catalog) | Table | header bg `--surface-secondary`, header fg `--muted` (overline-ish, weight 600), row border-color `--separator`, row hover bg `color-mix(in srgb, var(--default) 60%, transparent)`, numeric cells tabular-nums, selected row bg `--accent-soft` |
| `.metrics-grid .metric` | Card + stat | label `--muted`, value `--foreground` tabular, positive `--accent`, negative `--danger` |
| `.metadata` lists | Description list | term `--muted`, value `--foreground` |
| code / IDs (inline `code`) | Kbd/Code | bg `--accent-soft`, fg `--accent-soft-foreground`, radius `--radius-sm`, font `--font-mono` |
| `.si-markdown`, `AssistantMarkdown` | Typography | links `--link` underline offset 3 px; blockquote border-color `--accent`; code bg `--default` |

### 8.7 Page-level patterns

| Pattern | Spec |
|---|---|
| Public site shell (`.landing-site`, `.content-site`) | canvas `--background`, navbar recipe §8.2, footer bg `--surface-tertiary` |
| Landing hero / showcase | keep art/gradients; re-express gradient stops via `--accent`, `--iris-landing-*`; product-window frames = Card `rounded-3xl`, `--overlay-shadow` |
| Workspace shell (`.dashboard-shell`) | canvas `--background`, sidebar §8.2, topbar §8.2, content cards §8.4 |
| Visualization Studio (`.viz-immersive`) | separate environment, see §9.4 |

---

## 9. Data visualisation, maps & 3D

### 9.1 Never change

- Scientific colour ramps and their stops (`styles.ts`, `layers.ts`, `model.ts`, legends) — they carry
  meaning and are test-locked.
- ECharts series *structure*, MapLibre style JSON structure, Cesium imagery, Three.js scene graph.
- Canvas/SVG container sizes and their ancestors' sizes.

### 9.2 Chart chrome palette (static, Phase 6)

Chart *chrome* (axis labels, split lines, tooltip bg, heatmap cell borders) is currently hard-coded per
file with `dark ? a : b`. Phase 6 moves these literals into `src/theme/palette.ts` (static object, no
runtime CSS reads) so every chart shares one palette:

| Key | Light | Dark |
|---|---|---|
| `axisLabel` | `#53665e` | `#c9d8d2` |
| `axisName` | `#46645c` | `#c8ddd6` |
| `splitLine` | `#e5ece8` | `#283e36` |
| `cellBorder` | `#ffffff` | `#10271e` |
| `accentSeries` | `#078665` | `#50d2b1` |
| `previewSeries` | `#b75e39` | `#f2a27d` |
| `tooltipBg` | `#ffffff` | `#202321` |
| `tooltipBorder` | `#e3e7e4` | `#343936` |

(Values above are today's most common literals — Phase 6 starts by centralising *unchanged* values, then
optionally tunes them in one reviewed commit.)

### 9.3 Map & globe UI overlays

`.iris-tool`, `.iris-hud`, `.iris-expand`, `.iris-fullscreen`, `.map-tools`, `.viz-map-topbar`,
`.viz-layer-controls`: Surface-on-map recipe — bg `color-mix(in srgb, var(--overlay) 88%, transparent)`,
`backdrop-filter: blur(12px)` (allowed), border-color `--border`, radius `--radius-lg`, shadow
`--overlay-shadow`; icons `--foreground`; active tool = `--accent-soft` + `--accent`.

### 9.4 Visualization Studio environment (`.viz-immersive`)

The studio intentionally uses a cooler slate-teal environment (`--green: #137d70`, bg `#f3f6fa` / dark
`#0c1421`) distinct from the rest of the app. **Keep the distinct environment.** In Phase 5 the
`.viz-immersive` and `.viz-immersive[data-environment=dark]` blocks must define the HeroUI semantic
tokens as well (not only legacy names), so recipes work inside the studio:

| Token | Studio light | Studio dark |
|---|---|---|
| `--background` | `#f3f6fa` | `#0c1421` |
| `--surface` | `#ffffff` | `#152235` |
| `--surface-secondary` / `--surface-tertiary` | `#eaf0f6` | `#111d2c` |
| `--foreground` | `#203247` | `#e5eef6` |
| `--muted` | `#52677c` | `#a4b5c8` |
| `--border` | `#cfdce8` | `#293a50` |
| `--accent` / `--focus` | `#137d70` | `#78e2c7` |
| `--accent-soft` | `#dcefe9` | `#173a38` |

Dockview theming continues through its `--dv-*` variables, now pointed at these tokens.

---

## 10. Accessibility

- Contrast targets: text ≥ 4.5:1, large/bold text & UI boundaries ≥ 3:1. Verified pairs:
  accent/white 5.00, accent on accent-soft 4.57, muted/white 5.13, dark muted/bg 8.81, dark accent/bg 9.19,
  dark accent-fg/accent 8.22, warning-text `#b45309`/white 5.02, danger/white 4.83.
- Known weak pair: `--iris-faint` on white = 3.12:1 → only for ≥ 14 px bold, decorative or redundant text.
- Focus: every interactive element shows `outline: 2px solid var(--focus); outline-offset: 2px` on
  `:focus-visible` (Iris already does this globally for `button, a, input` — extend to `select, textarea,
  [role=tab], [tabindex]`).
- Disabled: `opacity: .5`, `cursor: not-allowed`; never rely on colour only.
- Respect `prefers-reduced-motion` and `hover: none` (existing media queries).

## 11. Do / Don't

**Do**
- Use semantic tokens; let CSS resolve light/dark.
- Build hierarchy with surface levels, then borders, then shadows.
- Keep one primary (accent) action per region.
- Keep every existing class, size, breakpoint and DOM node.
- Log every change.

**Don't**
- Don't import HeroUI React components to replace working Iris elements (see `05-…`).
- Don't hardcode colours, radii or shadows outside `iris-theme.css` / `palette.ts`.
- Don't use HeroUI's default blue accent anywhere — the accent is Iris emerald.
- Don't change font sizes, paddings, gaps, widths, heights or breakpoints.
- Don't animate layout properties.
- Don't touch scientific colour scales or `--iris-forecast-danger`.
