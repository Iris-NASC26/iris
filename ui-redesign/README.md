# Iris UI Redesign — HeroUI v3 Design Language

> **Status:** Phase 0 (Discovery, Design System & Plan) — ✅ complete · Phase 1 (Token Bridge & Workspace Dashboard Layout) — ✅ complete · Phase 2 — ⏳ next up
> **Branch:** `ui-redesign` · **Baseline commit:** `9a935d8` · **Started:** 2026-11-15

This folder is the single source of truth for the Iris UI redesign. Any agent (human or AI) working on the
redesign **must read these files in order before touching code**, and **must log every change** in `logs/`.

## The one-sentence brief

Re-skin the entire Next.js app in the **HeroUI v3 visual language** (semantic tokens, surfaces, states,
focus, motion) while **keeping Iris's emerald/green primary palette in light and dark mode**, and
**changing zero functionality, zero hooks/effects, zero render logic and zero component dimensions**.

## Reading order

| # | File | What it is | Who needs it |
|---|------|-----------|--------------|
| 1 | [02-FUNCTIONALITY-GUARDRAILS.md](./02-FUNCTIONALITY-GUARDRAILS.md) | **Hard rules.** What you may and may not change. Read first. | Everyone |
| 2 | [01-DESIGN-SYSTEM.md](./01-DESIGN-SYSTEM.md) | The Iris × HeroUI design system: tokens, type, radius, elevation, states, motion, component recipes | Everyone |
| 3 | [04-TOKEN-MAPPING-AND-THEME.md](./04-TOKEN-MAPPING-AND-THEME.md) | Legacy CSS variable → HeroUI semantic token map + the full draft theme CSS | Phase 1+ implementers |
| 4 | [05-HEROUI-COMPONENT-ADOPTION.md](./05-HEROUI-COMPONENT-ADOPTION.md) | Which HeroUI React components are safe, risky, or forbidden, and why | Anyone tempted to import from `@heroui/react` |
| 5 | [03-CODEBASE-AUDIT.md](./03-CODEBASE-AUDIT.md) | Inventory of the current UI: files, CSS sections, tokens, collisions, size-sensitive code | Implementers, reviewers |
| 6 | [00-MASTER-PLAN.md](./00-MASTER-PLAN.md) | Phased implementation plan with tasks and acceptance criteria | Everyone |
| 7 | [06-QA-AND-VERIFICATION.md](./06-QA-AND-VERIFICATION.md) | How to prove nothing broke (tests, box-size diff, screenshots, contrast) | Implementers, reviewers |

## Logs (mandatory)

| File | Purpose |
|------|---------|
| [logs/CHANGELOG.md](./logs/CHANGELOG.md) | Chronological log of every work session: what was changed, files, verification results |
| [logs/TASK-TRACKER.md](./logs/TASK-TRACKER.md) | Every task in the plan with status (`todo` / `in-progress` / `done` / `blocked`) |
| [logs/DECISIONS.md](./logs/DECISIONS.md) | Architecture/design decision records (ADR-style). Anything that deviates from the docs goes here first |
| [logs/_TEMPLATE-log-entry.md](./logs/_TEMPLATE-log-entry.md) | Copy-paste template for a CHANGELOG entry |

## Reference

| File | Purpose |
|------|---------|
| [reference/heroui-default-theme-DESIGN.md](./reference/heroui-default-theme-DESIGN.md) | Offline copy of HeroUI's official `DESIGN.md` (visual contract for agents) |
| [reference/test-selector-contract.txt](./reference/test-selector-contract.txt) | Every CSS selector, role and accessible name the test-suite depends on. **Never break these.** |
| HeroUI docs index | https://heroui.com/react/llms.txt |
| HeroUI full docs for agents | https://heroui.com/react/llms-full.txt |
| HeroUI theme variables (source of truth) | https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css |

## Workflow for every work session (agent protocol)

1. Read `02-FUNCTIONALITY-GUARDRAILS.md` (every session — rules don't change, your memory does).
2. Pick the next `todo` task in `logs/TASK-TRACKER.md`; set it to `in-progress`.
3. Implement **only CSS / className-addition / static-colour changes** permitted by the guardrails.
4. Run the verification steps in `06-QA-AND-VERIFICATION.md` for the scope you touched.
5. Append an entry to `logs/CHANGELOG.md` using the template; set the task to `done` (or `blocked` with reason).
6. If you needed to do anything not covered by the docs → stop, write an entry in `logs/DECISIONS.md` as
   `Proposed`, and ask the user before proceeding.
