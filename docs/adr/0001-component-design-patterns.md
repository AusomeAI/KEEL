# ADR 0001: Component Design Patterns for Keel DS v1

**Date:** 2026-08-28  
**Status:** Accepted  
**Authors:** Claude (Experience Squad, Phase 1)

## Context

Building 8 foundational UI components for the Keel Design System (Button, Input, Card, Modal, Form, Table, Sidebar, TopNav) requires decisions about:

1. How to layer component abstraction (Radix primitives vs. custom wrapping)
2. How to manage component variants (configuration, not composition)
3. How to encode design decisions (tokens as first-class citizens)
4. How to ensure accessibility across all components
5. How to support all required states without duplication

## Decision

We adopt the following component design patterns:

### 1. Radix UI + Keel Styling

**Pattern:** Components are **styled wrappers** around Radix UI primitives, not reimplementations.

- **Radix provides:** Accessible behavior, keyboard navigation, ARIA attributes, focus management, type safety
- **Keel adds:** Visual design via CSS variables (tokens) and Tailwind classes, component-specific states
- **Benefit:** Low maintenance (Radix handles a11y), fast (battle-tested primitives), decoupling of behavior from styling

**Example:** Modal wraps Radix `Dialog.Root`, adds Keel padding/colors/animations via CSS classes.

### 2. CVA for Variant Management

**Pattern:** Use **Class Variance Authority (CVA)** to define all component variants.

```typescript
const buttonVariants = cva(
  ['base', 'styles'],
  {
    variants: {
      variant: { primary: [...], secondary: [...] },
      size: { sm: [...], md: [...], lg: [...] },
      state: { default: [...], loading: [...], disabled: [...] }
    },
    defaultVariants: { variant: 'primary', size: 'md', state: 'default' }
  }
);
```

- **No boolean props:** No `isPrimary`, `isSmall`, etc. Use variants instead.
- **Composable:** Variants combine via CVA; no conditional class lists.
- **Single source of truth:** All button styling lives in `buttonVariants`.
- **Type-safe:** TypeScript catches invalid variant combinations at compile time.

**Guideline:** If a component has more than 3 conditional properties, convert them to variants.

### 3. Design Tokens as Foundation

**Pattern:** Every color, spacing, shadow, animation uses a **design token**.

- **No magic numbers:** `padding: 'var(--space-lg)'` not `padding: '16px'`
- **No hardcoded colors:** `color: 'var(--color-brand-500)'` not `color: '#6366F1'`
- **Theme consistency:** Tokens auto-switch in dark mode; no component needs to know about themes
- **Localization-ready:** If tokens need adjustment for RTL, one change affects all components

**Tokens defined in:** `/packages/design-system/src/tokens/` (colors, spacing, typography, effects)

**CSS variables generated in:** `/packages/design-system/src/styles/index.css` (light/dark modes)

**Usage in Tailwind:** `tailwind.config.js` maps tokens to Tailwind theme (e.g., `colors.neutral` from `colorTokens.neutral`)

### 4. Eight States, Every Component

**Pattern:** Every component explicitly handles **8 states**:

1. **Default** — Normal, interactive state
2. **Empty** — No data to display (not applicable for all components, but documented)
3. **Loading** — Fetching data or processing (aria-busy="true")
4. **Partial** — Partially loaded, degraded functionality (used in complex components)
5. **Error** — Validation error or exception (aria-invalid="true", error text displayed)
6. **Offline** — Network unavailable (used in mobile/kiosk)
7. **Read-only** — Data present, user cannot edit
8. **No-permission** — User lacks authorization (UI visible, disabled with aria-disabled)
9. **L3** — Deterministic-only mode (special visual indicator, e.g., dashed border)

**Rationale:** L3 mode (zero-LLM operation) is non-negotiable. Every component must remain usable when Agent Plane is scaled to zero. Encoding L3 as a first-class state ensures it's never an afterthought.

**Implementation:** Each component receives a `state` prop or deriv it from other props (disabled → applies "disabled" state).

```typescript
interface ButtonProps {
  state?: 'default' | 'loading' | 'disabled' | 'readonly' | 'no-permission' | 'l3';
}
```

### 5. Responsive by Default, Not Conditional

**Pattern:** Components are **intrinsically responsive**. No media queries inside components; use the token scale.

- **Spacing:** `p-md` (12px on all breakpoints, override in parent if needed)
- **Typography:** Font size adjusts via Tailwind's `responsive: true` (e.g., `text-base` is 16px on desktop, 14px on mobile)
- **Layout:** Flexbox/grid for flexibility; padding and gaps scale with tokens

**Exception:** Sidebar and TopNav have explicit mobile behaviors (drawer vs. sidebar; context switcher stacks on mobile). These are documented as features, not media query hacks.

**Principle:** Responsive design lives in layout and parent components, not in individual components.

### 6. Accessibility First, Not Last

**Pattern:** WCAG 2.2 AA compliance is **built in**, tested, documented.

- **Semantic HTML:** `<button>`, `<input>`, `<nav>`, `<table>`, `<dialog>`, etc.
- **ARIA:** `aria-label`, `aria-describedby`, `aria-busy`, `aria-invalid`, etc. populated correctly
- **Focus:** `focus-visible` outline (3px, offset 2px, brand-500 color) on all interactive elements
- **Contrast:** All color combinations meet 4.5:1 for normal text, 3:1 for large text
- **Keyboard:** Tab, Arrow keys, Enter, Escape work as expected
- **Screen readers:** Form labels, error messages, loading states announced
- **Motion:** Reduced-motion respected (@media prefers-reduced-motion: reduce)

**Testing:** Axe-core and manual testing verify every component before Storybook publish.

### 7. Prop Naming Conventions

**Pattern:** Props follow clear, discoverable naming:

| Purpose | Convention | Example |
|---------|-----------|---------|
| Booleans | `is*` or `show*` or `disable*` | `isLoading`, `showError`, `disabled` |
| Callbacks | `on*` | `onSubmit`, `onClick`, `onSelection Change` |
| Status | `state`, `status`, `variant` | `state="error"` |
| Ref forwarding | Always use `forwardRef` | Allows parent to access DOM |
| Type safeguards | Use `typeof X` or branded types | `state?: 'error' \| 'loading'` (not `state?: string`) |

### 8. Documentation and Storybook

**Pattern:** Every component ships with **Storybook stories** covering all variants and states.

**Story structure:**
```typescript
export const Primary = { args: { variant: 'primary', size: 'md' } };
export const Loading = { args: { isLoading: true } };
export const Disabled = { args: { disabled: true } };
export const StateError = { args: { state: 'error', error: 'Invalid input' } };
export const StateL3 = { args: { state: 'l3' } };
```

**Accessibility audit:** Each story is run through axe-core; audit results displayed in Storybook.

## Consequences

### Positive

- **Low cognitive load:** Components are predictable. New developers understand Button by reading one example.
- **High reusability:** CVA + tokens mean variants compose without duplication.
- **Accessibility by default:** Developers can't accidentally create inaccessible buttons; it's baked in.
- **Fast iteration:** Tokens change → all components update. No manual tweaks.
- **L3 compliance:** L3 state is always present, never afterthought. Deterministic-only operation is guaranteed.

### Negative

- **Learning curve:** Developers must understand Radix, CVA, and tokens. Initial onboarding cost.
- **Ref forwarding overhead:** Every component needs `forwardRef` if parent needs DOM access. Extra boilerplate.
- **Variant explosion:** Complex components (Table, Sidebar) have many variants. Storybook becomes large.

## Implementation Timeline

**Week 1–2:**
- Build 8 core components (Button, Input, Card, Modal, Form, Table, Sidebar, TopNav)
- All components use CVA + Radix + tokens
- All components include 8 states
- Storybook populated with all variants

**Week 2–3:**
- Web app scaffolding (contexts, API client, 3+ screens)
- Mobile and kiosk scaffolding
- E2E tests (Playwright)
- Accessibility audit (axe-core + manual)

## Alternatives Considered

1. **Styled-components / Emotion:** Dropped because we need CSS variable theme switching (no JS required). CSS-in-JS breaks this requirement.

2. **Tailwind only (no Radix):** Dropped because we lose accessibility behaviors (focus management, keyboard navigation, ARIA). We'd rebuild Radix ourselves = waste.

3. **Composition over configuration:** Instead of `<Button variant="primary" size="lg">`, use `<PrimaryButton large>`. Rejected because it creates prop explosion (2^n combinations), harder to maintain, less discoverable.

4. **No design tokens (inline colors):** Rejected because dark mode support would require conditional logic in components. Tokens enable theme switching at the CSS level = cleaner.

## References

- Radix UI: https://www.radix-ui.com/ (primitives, accessibility patterns)
- Class Variance Authority: https://cva.style/ (variant management)
- WCAG 2.2 AA: https://www.w3.org/WAI/WCAG22/quickref/ (accessibility standards)
- Keel CLAUDE.md: Laws 1–10, especially L3 requirement
- Wave 1 Execution Playbook (docs/06-Wave-1-Execution-Playbook.md)
