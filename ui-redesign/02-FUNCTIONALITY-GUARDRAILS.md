# 02 — Functionality Guardrails (HARD RULES)

> These rules override everything else in this folder, including the design system. If a design
> recommendation conflicts with a guardrail, **the guardrail wins** and the conflict is logged in
> `logs/DECISIONS.md`.

The redesign is a **re-skin**, not a refactor. The app is a scientific geospatial tool with maps
(MapLibre), a 3D globe (Cesium, Three.js, Cobe), ECharts, Dockview panels, ResizeObservers and
pointer-coordinate maths. Many of these break silently if a container changes size, a DOM node changes
type, or an effect re-runs.

---

## 1. Code that must NOT change (frozen)

| Category | Frozen | Why |
|----------|--------|-----|
| React hooks | `useEffect`, `useLayoutEffect`, `useState`, `useMemo`, `useCallback`, `useRef`, `useContext`, `useReducer`, all custom hooks (`useTheme`, `useDashboard`, `useScientificAnalysis`, `useCatalogue`, `useStudioTheme`, `useDisplay`…) — their bodies, dependency arrays, order and count | Effects drive data fetching, localStorage, map/globe lifecycles, ResizeObservers. Adding/removing deps or reordering hooks changes behaviour. |
| Event handlers | `onClick`, `onChange`, `onPointer*`, `onKey*`, `onSubmit`, form `action`s, and the functions they call | Functionality |
| Render logic | Conditional rendering (`&&`, ternaries), `.map()` keys, early returns, portals, Suspense boundaries | Functionality / reconciliation |
| Element types | Never change `<button>` → `<div>`, `<a>` → `<button>`, `<select>` → custom listbox, `<input type="range">` → slider component, `<table>` → divs | Accessibility roles are asserted by tests (`button`, `checkbox`, `combobox`, `option`, `spinbutton`, `tab`, `toolbar`, `cell`, `img`, `region`, `status`, `alert`) and used by code (`closest("button")` in `IrisAssistant.tsx`, focus-trap `querySelectorAll` in `OnboardingTour.tsx`) |
| DOM nesting | Do not wrap, unwrap or reorder elements | CSS descendant selectors (e.g. `.case-dropdown button`, `.viz-studio-mobile > label select`) and `getBoundingClientRect()` maths (`Globe.tsx`, `DataPreviewView.tsx`, `RecordScene.tsx`) |
| Accessible names | `aria-*`, `role`, `title`, `alt`, `id`, visible button/heading/tab text | ~150 test queries use exact names (see `reference/test-selector-contract.txt`) |
| `data-*` attributes | e.g. `data-environment` (Workspace.tsx), `data-after-cutoff` | Used by CSS + tests |
| Class names that exist today | **Never remove or rename** an existing class | Used by tests (≈75 selectors), by CSS, by JS (`closest`, `querySelector`) |
| Computed inline styles | Any `style={{…}}` whose value is computed (widths %, `--progress`, transforms, positions) | Layout/functionality |
| Theme state | `ThemeContext.tsx` logic, localStorage key `iris-theme`, `dark` boolean API, the `dark app-shell` class on shell roots | Everything theme-aware reads it |
| Scientific colour scales | `features/visualization/styles.ts`, `layers.ts`, `model.ts` colour ramps, `rampColor()`, `color()`, legend ramps | Asserted in `tests/visualization/layers-styles.test.ts` and `model.test.ts`; also scientific meaning |
| Test-asserted colours | `.result-warning` computed `color` must be `rgb(179, 56, 70)` (light) and `rgb(255, 155, 168)` (dark) — i.e. `--forecast-danger` `#b33846` / `#ff9ba8` | `tests/visualization/browser/datasetForecasts.spec.ts:119,189` |
| Third-party internals | Cesium widget DOM, MapLibre controls DOM, Dockview DOM (`.dv-*`), ECharts option *structure* | Only re-colour through documented CSS variables (`--dv-*`) or static colour values |

## 2. CSS properties: frozen vs allowed ("box-model freeze")

Component **sizes and layout must not change**. Every CSS edit must stay within the **Allowed** column.

| ✅ Allowed (paint-only) | ⚠️ Caution (may shift text metrics — verify with box-diff) | ❌ Frozen (layout) |
|---|---|---|
| `color`, `background`, `background-color`, `background-image` (gradients) | `font-weight` | `width`, `height`, `min-*`, `max-*`, `inline-size`, `block-size`, `aspect-ratio` |
| `border-color`, `outline`, `outline-color`, `outline-offset` | `letter-spacing` | `padding*`, `margin*`, `gap`, `row-gap`, `column-gap` |
| `border-radius` | `text-transform` | `font-size`, `line-height`, `font-family` (except the already-loaded Inter / DM Mono) |
| `box-shadow` (incl. `inset`, focus rings) | `font-variant-numeric: tabular-nums` | `display`, `position`, `top/right/bottom/left`, `inset`, `float` |
| `opacity` (not to 0 on interactive elements) | `-webkit-font-smoothing` | `flex*`, `grid*`, `order`, `place-*`, `align-*`, `justify-*` |
| `transition` (paint props only), `animation` of paint props | `text-decoration` thickness/offset | `overflow*`, `z-index`, `contain`, `isolation` |
| `transform` **only** for press feedback on buttons (`scale(.97)`) — never on maps, canvases, SVG maps or their ancestors | | `border-width` / `border-style` (changes size of auto-sized boxes) — if a border is needed where none existed, use `box-shadow: inset 0 0 0 1px …` instead |
| `backdrop-filter`, `filter` (non-layout) | | `box-sizing`, `transform` on layout containers, `scrollbar-gutter` |
| `cursor`, `accent-color`, `caret-color`, `scrollbar-color` | | `content` of pseudo-elements that are visible text/icons |
| `fill`, `stroke` (UI icons only, not data marks) | | media-query breakpoints (values and existence) |

> **Border trick:** to restyle a border without changing size, only change `border-color`. To *add*
> a border where there was none, use `box-shadow: inset 0 0 0 1px var(--border)`. To *remove* a
> border, set `border-color: transparent` (never `border: 0`).

## 3. What you MAY change

1. **CSS files** (`src/app/globals.css`, `src/features/**/*.css`, new `src/styles/*.css`) within the
   Allowed column above.
2. **Adding** (never removing) class names to JSX `className` strings, **only** when no existing class
   can target the element. Prefer CSS selectors on existing classes. Log every addition.
3. **Static colour literals** in TS/TSX (inline `style={{ color: "#…" }}`, ECharts option colours,
   Three.js colours, Cobe colours) may be replaced by **the same or redesigned static values** taken
   from a central palette module (Phase 6). They may **not** be replaced by runtime reads of CSS
   variables (`getComputedStyle`) because that would require new effects/renders.
4. **New files** that are purely presentational: `src/styles/iris-theme.css`, `src/styles/heroui-bridge.css`,
   `src/theme/palette.ts` (static constants only).
5. **`package.json`**: adding `@heroui/styles` (and later, if approved, `@heroui/react`). No other deps
   (no `next-themes` — it would replace `ThemeContext`, which is frozen).
6. **`src/app/layout.tsx`**: only adding a CSS import or a static `className` on `<body>` — nothing
   else. (See DECISIONS ADR-003 before touching it.)

## 4. Ready-made components policy (summary — full matrix in `05-…`)

- **Default: do not swap existing elements for `@heroui/react` components.** HeroUI components are built on
  React Aria: they use `onPress` instead of `onClick`, render different DOM, manage focus, portal overlays
  out of `.app-shell`, and ship their own padding/heights. Each of those can break functionality, tests or
  sizes.
- Instead, **reproduce HeroUI's visual recipes in CSS on Iris's existing markup** (the "HeroUI look, Iris
  DOM" approach). `01-DESIGN-SYSTEM.md` §8 gives a recipe for each Iris primitive.
- A swap is only allowed for elements on the **Tier B list** in `05-…` and only with a parity checklist
  logged in `DECISIONS.md` and user approval.

## 5. Theme / dark-mode rules

- Dark mode is driven by the `dark` class on `.app-shell` roots (`app/page.tsx`, `PageShell.tsx`,
  `workspace/layout.tsx`). **Keep it.** Do not move theme state to `<html>` via JS.
- HeroUI tokens are bridged to the root with pure CSS (`:root:has(.app-shell.dark)`), see
  `04-TOKEN-MAPPING-AND-THEME.md` §3. No new effects required.
- Never branch component code on colour mode for *new* code; use tokens. Existing `dark ? a : b`
  ternaries for chart colours stay as they are (Phase 6 only swaps the literal values).

## 6. Process rules

- One scope (one CSS section / one page) per commit. Commit message prefix: `ui(redesign): …`.
- Before and after each scope: run the verification in `06-QA-AND-VERIFICATION.md` (build, unit tests,
  browser tests, box-size diff for that page, light + dark screenshots).
- If the box-size diff reports any element moved/resized by > 1 px → revert or fix before committing.
- Every change is logged in `logs/CHANGELOG.md`. Every deviation is proposed in `logs/DECISIONS.md` first.
- When in doubt: **don't**. Ask.

## 7. Pre-commit self-check (copy into each CHANGELOG entry)

- [ ] No hook, handler, conditional, key, element type, aria/role/title/id/data-* changed
- [ ] No class removed or renamed; any added class logged
- [ ] Only Allowed-column CSS properties changed (or Caution ones verified with box-diff)
- [ ] No scientific colour ramp touched; `.result-warning` colours unchanged
- [ ] `pnpm build` ✅ · `pnpm test:visualization` ✅ · `pnpm test:visualization:browser` ✅
- [ ] Box-size diff: 0 elements changed > 1 px on touched pages (light + dark)
- [ ] Light + dark screenshots reviewed at 1440 / 1024 / 768 / 390 px
- [ ] Contrast checked for any new colour pair (WCAG AA: 4.5:1 text, 3:1 UI/large text)
