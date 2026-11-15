## [YYYY-MM-DD HH:MM] Phase X — <Scope Title>

### Summary
Brief description of what visual design changes were applied.

### Files Modified
- `path/to/file.css` — description of selectors updated

### Code & State Parity Check (`Next.js` Guardrails)
- [ ] `git diff` on `.tsx` / `.ts` files is empty (zero React hooks, `useEffect`s, states, props, or JSX markup altered)
- [ ] No CSS layout / box-model properties (`width`, `height`, `padding`, `margin`, `gap`, `grid`, `flex`, `font-size`, `line-height`) modified
- [ ] All existing class names and DOM selectors preserved
- [ ] Light and dark mode emerald palette tokens verified

### Selector-by-Selector Design Changes
| Selector | Previous Style | Updated HeroUI v3 Style |
|----------|----------------|-------------------------|
| `.example` | `background: var(--card)` | `background: var(--surface); box-shadow: var(--surface-shadow)` |

### Verification Results
- `pnpm test:visualization`: PASS / FAIL
- `pnpm build`: PASS / FAIL
