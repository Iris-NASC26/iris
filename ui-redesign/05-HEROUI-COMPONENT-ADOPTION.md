# 05 — HeroUI Component Adoption Matrix

> **Rule of thumb:** Adopt HeroUI v3's **visual design system** (tokens, surface layers, state styling, focus rings, elevation, radii, motion curves) on Iris's **existing DOM elements**. Do **not** replace existing interactive JSX elements with `@heroui/react` components.

---

## Why Ready-Made `@heroui/react` Components Are Risky Here

1. **Event Handler Incompatibility (`onPress` vs `onClick`):** HeroUI v3 components are built on React Aria Components, which use `onPress` and synthetic pointer state machines instead of native `onClick` / `onChange`. Swapping a `<button>` or `<select>` requires rewriting props and handlers—violating the functionality freeze.
2. **DOM Structure & Selector Contract:** Playwright tests and internal DOM utilities (`closest("button")`, `querySelectorAll`, `.viz-studio-mobile > label select`) rely on exact native HTML tags (`<button>`, `<select>`, `<option>`, `<input type="number">`, `<table>`) and existing class names.
3. **Portal Escape from `.app-shell`:** HeroUI `Modal`, `Popover`, `Dropdown`, and `Select` portal their overlay DOM directly into `document.body` outside `.app-shell`, which can break descendant CSS selectors (`.app-shell.dark ...`) or focus-trap checks (`OnboardingTour.tsx`).
4. **Box-Model Shifts:** Ready-made components enforce their own internal padding, line-height, and minimum heights, which can trigger `ResizeObserver` recalculations or cause horizontal overflow on 390px viewports (`ui.noOverflow()` in `workspace.spec.ts`).

---

## Component Classification Matrix

| Tier | Category | Components | Policy |
|------|----------|------------|--------|
| **Tier A — CSS Recipe Only (Mandatory)** | Interactive controls & stateful containers | `Button`, `ToggleButton`, `Select`, `ComboBox`, `SearchField`, `TextField`, `NumberField`, `Slider`, `Checkbox`, `RadioGroup`, `Switch`, `Tabs`, `Table`, `Modal`, `Drawer`, `Popover`, `Dropdown`, `Toast`, `Tooltip` | **Never swap JSX.** Apply the HeroUI v3 visual recipe in CSS (`01-DESIGN-SYSTEM.md` §8) directly to the existing Iris classes and HTML elements. |
| **Tier B — Pure Presentational (Optional, CSS Still Preferred)** | Static display badges & dividers | `Chip`, `Badge`, `Kbd`, `Separator`, `Surface`, `Card`, `Skeleton`, `Spinner` | Even for static elements, **CSS-only restyling on existing markup is strictly preferred** so zero JSX files or component trees change. |
| **Tier C — Forbidden** | Domain-specific scientific & canvas views | MapLibre (`IrisMap`), Cesium (`engine.ts`), Three.js (`RecordScene`, `Globe`), Cobe (`CobeGlobe`), Dockview (`StudioShell`), ECharts (`Charts`, `ForecastResult`) | Never wrap or replace. Only style surrounding chrome or static palette constants as specified in `01-DESIGN-SYSTEM.md` §9. |
