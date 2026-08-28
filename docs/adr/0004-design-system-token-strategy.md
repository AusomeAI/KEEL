# ADR 0004: Design System Token Strategy

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** Squad 5 (Experience)  
**Relates to:** [Unified Build Brief](../../05-Unified-Build-Brief-for-Agent-Teams.md) § 6; [CLAUDE.md](../../CLAUDE.md) § "UX Design Brief"

## Context

KEEL's mission is to achieve 80%+ HRIS adoption by building the manual path first and assuming agents will never exist. The design system must support:

1. **Light and dark themes** — deployed simultaneously, not as an afterthought
2. **Accessibility by default** — WCAG 2.2 AA minimum, no degradation in either theme
3. **Localisation** — string expansion (1.4×), RTL mirroring, locale-specific date/number/name formatting
4. **Performance** — CSS variables for fast theme switching (0ms on mobile, L4-critical)
5. **Consistency** — every design decision encoded as a token before any component is built
6. **Maintenance** — tokens live in TypeScript, CSS, and documentation in one source of truth

The system must work on a 5-year-old Android tablet on 2G with poor light and gloved input. It must also feel premium on a desktop with modern browsers.

We are not building an off-the-shelf component kit. We are building a **deterministic design system** where every pixel is intentional.

## Decision

We will adopt a **token-first, Radix-based component strategy** with the following architecture:

### 1. Token Layers (TypeScript)

All design decisions are defined as exportable, type-safe tokens in TypeScript:

```
packages/design-system/src/tokens/
├── colors.ts          # Semantic color palette (light/dark friendly)
├── spacing.ts         # 4px grid, component presets
├── typography.ts      # Font sizes, weights, line heights, locale formatting
├── effects.ts         # Shadows, animations, border radius, z-index
└── index.ts           # Barrel export, ThemeContext interface
```

**Each token file:**
- Exports named constants (e.g., `colorTokens`, `spacingTokens`)
- Includes TypeScript types (e.g., `ColorToken`, `SpacingToken`)
- Documents the rationale in JSDoc comments
- Includes accessibility and localisation notes

### 2. CSS Variables (Generated)

From the tokens, we generate CSS custom properties:

```css
:root {
  --color-neutral-50: #FAFAFA;
  --color-brand-500: #6366F1;
  --space-lg: 16px;
  --font-size-base: 16px;
  /* ... ~150 variables */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-neutral-50: #0D0D0D;  /* Inverted */
    /* ... all colors, shadows adjusted for dark mode */
  }
}
```

**Theme switching:**
- Default: respects `prefers-color-scheme` (system setting)
- Override: `data-theme="light"` or `data-theme="dark"` attribute on `<html>`
- Performance: no JavaScript needed for theme switch (pure CSS)

### 3. Radix + CVA Components

Components are built using:

1. **Radix UI primitives** — unstyled, accessible components (Dialog, Label, Popover, etc.)
2. **Class Variance Authority (CVA)** — type-safe CSS class composition
3. **CSS custom properties** — all colors, spacing, shadows via variables

```typescript
// Button.tsx
import { cva } from 'class-variance-authority';

export const Button = cva('inline-flex items-center justify-center', {
  variants: {
    variant: {
      primary: 'bg-brand-500 text-brand-50 hover:bg-brand-600',
      secondary: 'bg-neutral-200 text-neutral-950 hover:bg-neutral-300',
      ghost: 'text-neutral-950 hover:bg-neutral-100',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    },
  },
});
```

**No inline styles.** All styling via tokens → CSS variables → CVA.

### 4. Naming Convention

Tokens follow a **semantic, not numeric** naming convention:

**Colors:** `{semantic}-{lightness}`
- `neutral-50`, `neutral-200`, `neutral-950`
- `brand-500`, `success-400`, `error-600`
- `bg-primary`, `text-secondary`, `border-subtle`

**Spacing:** `{alias}` (xs, sm, md, lg, xl, 2xl, 3xl, 4xl) or `{number}` (1–64)
- `space-lg`, `space-3xl`
- `space-4` (16px), `space-12` (48px)

**Typography:** `{role}-{mobile|desktop}`
- `font-size-h2`, `line-height-normal`, `font-weight-bold`

**Effects:** `{effect}-{intensity}`
- `shadow-sm`, `shadow-base`, `shadow-lg`
- `radius-md`, `radius-xl`
- `duration-fast`, `easing-out`

## Consequences

### Positive

1. **Type safety across the stack** — token usage is verified at compile time
2. **Centralised design decisions** — one place to change a color, spacing, or animation
3. **Light/dark theme support** — automatic, performant, no JavaScript
4. **Localisation-ready** — locale data (date formats, RTL) built into tokens
5. **Accessibility by default** — contrast ratios and animation timing pre-checked
6. **Performance** — no runtime theme switching, no style injection
7. **Consistency** — every component uses the same token palette
8. **Documentation** — tokens are self-documenting code
9. **Maintenance** — new engineers can understand design decisions from token definitions
10. **Testability** — token values are verifiable in unit tests

### Negative

1. **Token proliferation** — must resist the urge to add "just one more" custom color
2. **Indirection** — designers/developers must reference token names, not hex values
3. **Initial investment** — upfront work to define comprehensive token set
4. **CSS generation** — requires a build step (not critical, but adds complexity)
5. **Learning curve** — new engineers must learn token naming conventions

## Alternatives Considered

### Alternative A: Design Tokens as JSON (Figma-aligned)

**Why not:** While JSON is portable (Figma, Style Dictionary, etc.), it:
- Loses TypeScript type safety
- Requires build tooling to generate TypeScript and CSS
- Makes tokens harder to test and document in code
- Separates token definition from usage patterns

We chose TypeScript-first to ensure type safety and self-documentation.

### Alternative B: Tailwind CSS with custom config

**Why not:** Tailwind's approach is opinionated and prescriptive:
- Hard to enforce custom constraints (e.g., no arbitrary colors)
- Generates a large CSS file (even with purging)
- Couples component styling to class composition
- Less suitable for the strict accessibility and performance requirements of frontline workers

We chose Radix + CVA for greater control and smaller CSS.

### Alternative C: Styled Components or emotion (CSS-in-JS)

**Why not:** Runtime CSS injection:
- Slower theme switching (requires JavaScript)
- Larger bundle size
- Cannot support L4 (offline) mode on mobile without serialisation
- Violates the "no JavaScript for styling" principle

We chose CSS variables (static) for L4 resilience.

### Alternative D: Design System as npm package from another vendor

**Why not:** Off-the-shelf kits (Material UI, Chakra, Ant Design):
- Designed for general-purpose web apps, not HRIS
- Hard to customise accessibility for frontline workers
- Often include bloat (animations, complex components)
- Localisation is an afterthought
- Cannot be modified without forking

We chose to build Keel DS v1 as a bespoke system.

## Related ADRs

- ADR 0003: Two-plane architecture — this token strategy supports L3 operation without the Agent Plane
- ADR 0005 (planned): Component library structure
- ADR 0006 (planned): Accessibility annotation strategy

## Validation

This ADR is validated by:

1. ✓ Design tokens defined and exported in TypeScript (`packages/design-system/src/tokens/*`)
2. ✓ CSS variables generated and available in all themes
3. ✓ Radix dependencies added to design-system package.json
4. ✓ CVA (class-variance-authority) integrated for type-safe styling
5. ✓ Accessibility checker: WCAG 2.2 AA contrast verified for all color combinations
6. ✓ Light/dark theme automatically inverts semantic colors
7. ✓ Localisation settings included (date/number/RTL handling)
8. ✓ Component template (Button) demonstrates token usage

## How This Enables Squad 5's Mission

This token strategy enables:

- **Faster UI delivery** — tokens → reusable components → whole app
- **Consistent design** — tokens enforce one right answer
- **Frontline-first** — accessibility, performance, and simplicity are built-in
- **Adoption through beauty** — design quality is a product feature, not an afterthought
- **L3 resilience** — no runtime dependencies, works offline
- **Measurable success** — adoption increases when the UI is a joy to use

## References

- [Lea Verou: CSS Variables Crash Course](https://www.smashingmagazine.com/2017/04/start-using-css-custom-properties/)
- [Sam Baldwin: Tokens for Designers and Developers](https://uxdesign.cc/design-tokens-cheatsheet-927fc1404099)
- [Radix UI: Unstyled, Accessible Components](https://www.radix-ui.com/)
- [Class Variance Authority: Type-safe CSS class composition](https://cva.style/)
- [WCAG 2.2 Level AA Compliance](https://www.w3.org/WAI/WCAG22/quickref/)
