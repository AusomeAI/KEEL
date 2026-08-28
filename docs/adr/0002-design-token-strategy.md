# ADR 0002: Design Token Strategy for Light/Dark Theming

**Date:** 2026-08-28  
**Status:** Accepted  
**Authors:** Claude (Experience Squad, Phase 1)

## Context

Keel requires:
1. Light and dark theme support (no degradation in either mode)
2. Fast theme switching (without page reload)
3. System preference respect (prefers-color-scheme media query)
4. No JavaScript required to function (theme switching works in static HTML)
5. Accessibility parity (contrast is 4.5:1 in both modes)

Previous design systems often fail because:
- Dark mode is an afterthought (same colors, inverted brightness = poor contrast)
- Theme switching requires JavaScript (slow, flash of wrong color)
- Token definitions are scattered (inconsistent, hard to audit)

## Decision

Adopt a **CSS variable-first, token-based approach** with automatic theme inversion for neutral colors, semantic consistency for semantic colors.

### 1. Token Tiers

**Tier 1: Raw Tokens**
- Pure design decisions: colors, spacing, typography, effects
- No semantic meaning: "neutral-500", "brand-600", not "background-primary"
- Defined in TypeScript (`src/tokens/*.ts`) and exported for programmatic use

**Tier 2: CSS Variables**
- Generated from raw tokens
- Semantic aliases: `--color-bg-primary`, `--color-text-primary`
- Generated in `src/styles/index.css`
- Automatically inverted for dark mode

**Tier 3: Component Usage**
- Components consume CSS variables, never raw tokens
- Example: `className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"`

### 2. Color Inversion Strategy

**Neutral colors** (used for backgrounds, text, borders):
- **Invert completely in dark mode**
- Light theme: neutral-50 (white) background, neutral-950 (black) text
- Dark theme: neutral-50 becomes dark-mode-50 (dark gray), neutral-950 becomes light-gray

**Semantic colors** (success, warning, error, info, brand, accent):
- **Keep hue, adjust lightness**
- Light theme: brand-500 is primary action color
- Dark theme: brand-500 stays same hue, adjusted for dark background readability

**Implementation:**
```css
/* Light theme (default, root) */
:root {
  --color-neutral-50: #FAFAFA;   /* Light background */
  --color-neutral-950: #000000;  /* Dark text */
  --color-brand-500: #6366F1;    /* Primary action */
}

/* Dark theme (media query) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-neutral-50: #0D0D0D;   /* Dark background */
    --color-neutral-950: #FAFAFA;  /* Light text */
    --color-brand-500: #6366F1;    /* Same hue (no change) */
  }
}

/* Dark theme (explicit override) */
:root[data-theme="dark"] {
  --color-neutral-50: #0D0D0D;
  --color-neutral-950: #FAFAFA;
  --color-brand-500: #6366F1;
}
```

### 3. CSS Variable Naming

**Format:** `--category-property-value`

**Categories:**
- `color-` — Colors (hue)
- `space-` — Spacing (4px scale)
- `font-` — Typography (family, size, weight)
- `shadow-` — Elevation (depth)
- `radius-` — Border radius (curvature)
- `duration-` — Animation (timing)
- `easing-` — Animation (curve)
- `z-` — Layering (z-index)

**Examples:**
- `--color-brand-500` — Primary brand color
- `--color-text-primary` — Primary text color (semantic alias)
- `--space-lg` — 16px spacing token
- `--font-size-base` — 16px on desktop, 14px on mobile
- `--shadow-md` — Medium depth shadow
- `--radius-lg` — 8px border radius
- `--duration-fast` — 200ms animation
- `--z-modal` — Modal z-index (1100)

### 4. Semantic Color Aliases

Light and dark modes reuse the same semantic alias names; values differ.

**Aliases:**
```css
--color-bg-primary      /* Page background */
--color-bg-secondary    /* Card, panel background */
--color-bg-tertiary     /* Tertiary background (hover, focus) */
--color-text-primary    /* Default text */
--color-text-secondary  /* Secondary text (muted) */
--color-text-tertiary   /* Tertiary text (hints) */
--color-border          /* Borders, dividers */
--color-border-subtle   /* Faint borders */
```

**Light theme:**
- `--color-bg-primary: var(--color-neutral-50)` (white)
- `--color-text-primary: var(--color-neutral-950)` (black)

**Dark theme:**
- `--color-bg-primary: var(--color-neutral-50)` (dark gray, already inverted)
- `--color-text-primary: var(--color-neutral-950)` (light, already inverted)

### 5. Contrast Verification

Every color pair is **verified for WCAG 2.2 AA contrast** before shipping:

- Normal text (14px+): ≥ 4.5:1
- Large text (18px+): ≥ 3:1
- UI components (icons, borders): ≥ 3:1

**Tool:** WebAIM Contrast Checker. Verification is run as part of token review.

**Stored:** Contrast pairs documented in `src/tokens/colors.ts` with contrast ratios.

### 6. Theme Switching Modes

**System mode (default):**
```html
<html>
  <!-- Respects prefers-color-scheme media query -->
  <!-- Changes when OS theme changes -->
</html>
```

**Light mode forced:**
```html
<html data-theme="light">
  <!-- Always light, regardless of OS preference -->
</html>
```

**Dark mode forced:**
```html
<html data-theme="dark">
  <!-- Always dark, regardless of OS preference -->
</html>
```

**JavaScript to toggle:**
```typescript
// Read current theme
const theme = document.documentElement.getAttribute('data-theme') || 'system';

// Set dark theme
document.documentElement.setAttribute('data-theme', 'dark');

// Use system preference
document.documentElement.removeAttribute('data-theme');
```

### 7. Token Storage and Export

**TypeScript definitions** (`src/tokens/*.ts`):
```typescript
export const colorTokens = {
  neutral: { 50: '#FAFAFA', 100: '#F5F5F5', ... },
  brand: { 50: '#EEF2FF', 500: '#6366F1', ... },
  // ...
} as const;
```

**CSS variables** (`src/styles/index.css`):
- Generated manually (not auto-generated) to allow fine-tuning
- Serves as source of truth for theme switching

**Tailwind config** (`tailwind.config.js`):
- Maps tokens to Tailwind theme
- Allows `className="bg-brand-500 text-neutral-950"`

**Export formats:**
- **TypeScript:** `import { colorTokens } from '@keel/design-system/tokens'`
- **CSS:** `var(--color-brand-500)` in stylesheets
- **JSON:** Token files exported as JSON for tooling (Figma sync, etc.)

### 8. Localization and RTL

**Tokens are locale-agnostic.** Spacing and sizing scale automatically for string expansion (1.4×).

**RTL languages** (Arabic, Hebrew, Urdu):
- CSS `direction: rtl` flips layouts automatically
- Spacing tokens require no change
- Component responsibility: ensure flexbox/grid layouts respect RTL

**Example:**
```css
[dir="rtl"] {
  /* Flexbox automatically mirrors */
  /* No additional token changes needed */
}
```

## Consequences

### Positive

- **No JavaScript required for theme switching** — CSS variables handle it
- **Fast theme toggle** — Attribute change on `<html>` = instant update (no page reload)
- **Consistent contrast** — Contrast pairs verified before shipping
- **Scalable** — Add new colors/tokens without touching components
- **Dark mode parity** — Dark mode is not an afterthought; colors are explicitly designed for both modes
- **Accessible** — High contrast by design, not by accident

### Negative

- **Manual CSS variable maintenance** — Tokens are maintained in two places (TypeScript + CSS). Risk of drift.
- **Figma sync complexity** — Design tool and code need manual synchronization
- **No auto-generation** — Token changes in one place don't auto-generate the other
- **Limited semantic naming** — Semantic aliases are useful but limited to current known states

## Mitigation

1. **Sync tokens:** Write a script that generates CSS variables from TypeScript tokens (future work)
2. **Figma integration:** Use Figma design tokens API to sync colors (future work)
3. **Testing:** Storybook axe-core checks ensure contrast is maintained
4. **Documentation:** Token changes documented in CHANGELOG

## Implementation Checklist

- [x] Color palette defined in `src/tokens/colors.ts`
- [x] CSS variables generated in `src/styles/index.css`
- [x] Light/dark theme modes working
- [x] Semantic aliases working
- [x] Contrast verified (4.5:1 normal, 3:1 large)
- [ ] Tailwind config mapping tokens (in progress)
- [ ] Storybook accessible color contrast audit
- [ ] Documentation of token usage in components
- [ ] Script to generate CSS variables from TypeScript (future)

## References

- WCAG 2.2 AA Contrast: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- Design Tokens Format Module: https://design-tokens.github.io/community-group/format/
- Keel CLAUDE.md: UX Design Brief § Colors
