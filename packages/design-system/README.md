# Keel Design System v1

The design foundation for KEEL's UI across web, mobile, kiosk, and admin surfaces.

**Status:** Wave 1 Foundations in progress

## Philosophy

- **Tokens first, components second** — Design decisions are encoded as tokens before components use them
- **Light and dark themes** — Every color works in both modes without degradation
- **Accessibility by default** — WCAG 2.2 AA contrast, keyboard navigation, focus visible
- **Localisation-aware** — Handles string expansion (1.4×), RTL languages, locale-specific formatting
- **Performance-first** — No custom fonts on mobile/kiosk; CSS variables for fast theme switching
- **Explicit over clever** — Every design choice should have exactly one right answer

## Structure

```
packages/design-system/
├── src/
│   ├── tokens/
│   │   ├── colors.ts          # Color palette (semantic, accessible)
│   │   ├── spacing.ts         # Spacing scale (4px grid)
│   │   ├── typography.ts      # Font sizes, weights, line heights
│   │   ├── effects.ts         # Shadows, animations, border radius
│   │   └── index.ts           # Token export barrel
│   ├── components/
│   │   ├── Button.tsx         # Radix + custom styles
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Form.tsx
│   │   ├── Table.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   ├── BottomSheet.tsx
│   │   └── index.ts           # Components barrel
│   ├── styles/
│   │   └── index.css          # CSS variables (light/dark theme)
│   └── index.ts               # Main export
├── tsconfig.json
├── package.json
└── README.md
```

## Tokens

### Colors

Semantic color palette with full light/dark support:

- **Neutral** — grayscale (backgrounds, text, borders)
- **Success** — positive actions, approvals (green)
- **Warning** — caution, non-blocking issues (amber)
- **Error** — blocking issues, destructive actions (red)
- **Info** — informational, contextual (blue)
- **Brand** — primary actions, links (indigo)
- **Accent** — highlights, hover states (teal)

Every color shade (50–950) is available. Contrast is WCAG 2.2 AA across all combinations.

**Usage in CSS:**
```css
.button {
  background-color: var(--color-brand-500);
  color: var(--color-brand-950);  /* Automatically inverts in dark mode */
}
```

**Usage in TypeScript:**
```typescript
import { colorTokens } from '@keel/design-system/tokens';

const buttonColor = colorTokens.brand[500];
```

### Spacing

4px-based scale for consistency:

- `xs` (4px) — Between icon and text
- `sm` (8px) — Form labels
- `md` (12px) — Compact components
- `lg` (16px) — **Default** padding/margin
- `xl` (24px) — Section spacing on mobile
- `2xl` (32px) — Major section spacing
- `3xl` (48px) — Column spacing on desktop
- `4xl` (64px) — Full-page spacing on desktop

Plus numeric tokens (1–64) for precision layouts.

### Typography

Limited, intentional palette:

- **xs** — 12px/13px, hints and captions
- **sm** — 13px/14px, form labels
- **base** — 14px/16px, default body text
- **lg** — 16px/18px, list items
- **h4** — 18px/20px, subsection titles
- **h3** — 20px/24px, major subsections
- **h2** — 24px/28px, page sections
- **h1** — 28px/32px, page title
- **display** — 32px/48px, hero text

**No custom fonts on mobile/kiosk.** System font stack only.

### Effects

**Shadows:** sm, base (default), md, lg, xl — used for depth and layering

**Border radius:** xs, sm, md (default), lg, xl, full

**Animations:** 
- Fast (200ms) — hover, focus, small changes
- Normal (300ms) — modal opens, page transitions
- Slow (400ms) — complex, full-page animations

**Z-index:** base, dropdown, sticky, overlay, modal, alert (no magic numbers)

## Components

Base components are Radix primitives with Keel styling:

### Button
```tsx
import { Button } from '@keel/design-system/components';

<Button variant="primary" size="md" disabled={false}>
  Click me
</Button>
```

**Variants:** primary, secondary, ghost, danger
**Sizes:** sm, md (default), lg
**States:** default, hover, focus, active, disabled, loading

### Input
```tsx
import { Input } from '@keel/design-system/components';

<Input 
  type="text" 
  placeholder="Enter email" 
  disabled={false}
  error="Invalid email"
/>
```

**States:** default, focus, disabled, error, readonly, loading

### Card
```tsx
import { Card } from '@keel/design-system/components';

<Card className="p-lg">
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### Modal
```tsx
import { Modal } from '@keel/design-system/components';

<Modal open={isOpen} onClose={handleClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Submit</Button>
  </Modal.Footer>
</Modal>
```

## Theme Switching

### Automatic (system preference)
```html
<html>
  <!-- Respects prefers-color-scheme media query -->
</html>
```

### Light theme forced
```html
<html data-theme="light">
```

### Dark theme forced
```html
<html data-theme="dark">
```

### JavaScript
```typescript
// Read current theme
const theme = document.documentElement.getAttribute('data-theme');

// Set theme
document.documentElement.setAttribute('data-theme', 'dark');
```

## Accessibility

All components meet WCAG 2.2 AA:

- ✓ Sufficient color contrast (4.5:1 for normal text, 3:1 for large)
- ✓ Keyboard navigation (Tab, Arrow keys, Enter, Escape)
- ✓ Focus visible (3px outline, offset)
- ✓ ARIA labels on interactive elements
- ✓ Semantic HTML (button, input, nav, etc.)
- ✓ Reduced motion support (@media prefers-reduced-motion)

## Localisation

### String Expansion
Assume English strings expand 1.4× when localized. Layouts should not break.

### RTL Languages
Arabic, Hebrew, Urdu automatically mirror layout when locale is set.

### Date/Time/Number Formatting
Locale-aware formatting is built into every component:

```typescript
// English: 12/25/2024, 2:30 PM, 1,234.56
// German: 25.12.2024, 14:30, 1.234,56
// Japanese: 2024/12/25, 14:30, 1,234.56
```

## Contributing

When adding a new component or token:

1. **Start with tokens** — Define the design decision as a token first
2. **Use existing patterns** — Refer to existing components for consistency
3. **Document accessibility** — List keyboard interactions, ARIA attributes
4. **Test light/dark** — Verify contrast and readability in both themes
5. **File an ADR** — Document the decision in `docs/adr/`

## Further Reading

- `docs/adr/0004-design-system-token-strategy.md` — Token architecture decisions
- `docs/05-Unified-Build-Brief-for-Agent-Teams.md` § 6 — UX design brief
- `CLAUDE.md` § "UX Design Brief" — Complete design principles
