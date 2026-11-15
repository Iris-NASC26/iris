# 06 — QA & Verification Protocol

> Every phase and every commit in the UI redesign must pass these verification checks and record the results in `ui-redesign/logs/CHANGELOG.md`.

---

## 1. Static Code & Guardrail Verification

Before running builds or tests, verify via `git diff`:
1. **Zero Next.js / React logic changes:** Confirm `git diff --name-only` shows only `.css` files and `ui-redesign/**` documentation/logs (unless a static colour constant change in Phase 6 is explicitly logged).
2. **Zero JSX / state / hook edits:** Confirm `src/app/workspace/layout.tsx` and all other `.tsx`/`.ts` files have `0` lines modified.
3. **Zero layout / box-model mutations in CSS:** Confirm no `width`, `height`, `min-*`, `max-*`, `padding*`, `margin*`, `gap`, `display`, `position`, `grid*`, `flex*`, `font-size`, or `line-height` declarations were altered in existing selectors (only paint, surface, border-color, border-radius, box-shadow, outline, and paint transitions).

---

## 2. Build & Unit Test Verification

Run in the workspace root:

```powershell
# 1. TypeScript & Next.js production build
pnpm build

# 2. Visualization & science model unit tests
pnpm test:visualization
```

Both commands must exit with code `0`.

---

## 3. Browser / Playwright Test Verification

When modifying workspace, globe, or forecast styles, run the Playwright visualization suite:

```powershell
pnpm test:visualization:browser
```

Key assertions verified by the suite:
- Workspace header renders `.dashboard-topbar` theme toggle and `.dashboard-sidebar-footer` GitHub link (`workspace.spec.ts`).
- No horizontal or vertical page overflow on desktop or mobile (`390×844` with `reducedMotion: 'reduce'`).
- Forecast warning colour matches exact RGB values (`datasetForecasts.spec.ts`).
- Scientific ramp colours match exact hex values (`layers-styles.test.ts`, `model.test.ts`).

---

## 4. Contrast & Accessibility Check

- All primary text (`--foreground` on `--background` / `--surface`) ≥ 15:1.
- All secondary text (`--muted` on `--surface` / `--surface-tertiary`) ≥ 4.8:1 (Light) and ≥ 7.9:1 (Dark).
- Accent fills (`--accent-foreground` on `--accent`) = 5.00:1 (Light) and 8.22:1 (Dark).
- Soft accent pills (`--accent-soft-foreground` on `--accent-soft`) = 4.57:1 (Light) and 6.42:1 (Dark).
- Focus rings (`2px solid var(--focus)` with `2px` offset) visible on all buttons, links, and inputs in both Light and Dark modes.
