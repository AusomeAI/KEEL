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

### 8 Core Components

All components are built on Radix UI primitives with Keel styling, CVA for variants, and full WCAG 2.2 AA accessibility.

**Every component includes all states:** default, empty, loading, partial, error, offline, read-only, no-permission, L3

**Every component is responsive:** desktop, tablet, mobile, kiosk layouts

#### 1. Button
```tsx
import { Button } from '@keel/design-system/components';

<Button 
  variant="primary" 
  size="md" 
  isLoading={false}
  icon={<Icon />}
  onClick={handleClick}
>
  Click me
</Button>
```

**Variants:** primary (brand), secondary (neutral), danger (error), ghost (transparent)
**Sizes:** sm, md (default), lg
**Props:** icon, iconEnd, isLoading, fullWidth, ariaLabel
**States:** default, hover, focus, active, disabled, loading, readonly, no-permission, L3

#### 2. Input
```tsx
import { Input } from '@keel/design-system/components';

<Input 
  type="text" 
  placeholder="Enter email" 
  label="Email"
  helperText="We'll never share your email"
  error={validationError}
  disabled={false}
  iconStart={<EmailIcon />}
/>
```

**Types:** text, email, password, number, date, search, tel
**Sizes:** sm, md (default), lg
**Props:** label, helperText, error, isRequired, iconStart, iconEnd, state
**States:** default, focus, disabled, error, readonly, no-permission, L3

#### 3. Card
```tsx
import { Card } from '@keel/design-system/components';

<Card 
  variant="elevated" 
  padding="lg"
  isLoading={false}
  state="default"
  header={<h3>Title</h3>}
  footer={<Button>Action</Button>}
>
  Card content
</Card>
```

**Variants:** default (shadow-sm), elevated (shadow-md hover:shadow-lg), outlined
**Padding:** sm, md (default), lg
**Props:** header, footer, isLoading, padding, state
**States:** default, loading, empty, error, L3

#### 4. Modal
```tsx
import { Modal } from '@keel/design-system/components';

<Modal 
  open={isOpen} 
  onOpenChange={setIsOpen}
  title="Confirm Action"
  size="md"
  closeOnBackdropClick={true}
  isLoading={false}
  footer={
    <>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Confirm</Button>
    </>
  }
>
  Are you sure?
</Modal>
```

**Sizes:** sm, md (default), lg
**Props:** title, footer, hideCloseButton, closeOnBackdropClick, isLoading
**Features:** Focus trap, keyboard navigation (Escape), ARIA modal role
**States:** default, loading, L3

#### 5. Form Components
```tsx
import { Form, FormField, FormSubmit } from '@keel/design-system/components';

<Form onSubmit={handleSubmit} isSubmitting={isSubmitting} spacing="md">
  <FormField
    name="email"
    label="Email"
    type="email"
    isRequired={true}
    error={errors.email}
    helperText="Your work email address"
  />
  
  <FormField
    name="password"
    label="Password"
    type="password"
    isRequired={true}
    error={errors.password}
  />
  
  <FormSubmit isLoading={isSubmitting}>
    Sign In
  </FormSubmit>
</Form>
```

**Form:** Wrapper with automatic submit handling, isSubmitting state
**FormField:** Label + Input + Error + Helper text
**FormSubmit:** Submit button with loading state
**Props:** onSubmit, isSubmitting, layout, spacing

#### 6. Table
```tsx
import { Table } from '@keel/design-system/components';

<Table
  data={rows}
  columns={[
    { key: 'name', header: 'Name', render: (row) => row.name, sortable: true },
    { key: 'email', header: 'Email', render: (row) => row.email },
    { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
  ]}
  getRowKey={(row) => row.id}
  selectable={true}
  selectedRows={selected}
  onSelectionChange={setSelected}
  sortBy="name"
  sortDirection="asc"
  onSort={handleSort}
  page={1}
  pageSize={10}
  totalRows={100}
  onPageChange={handlePageChange}
  density="default"
  showPagination={true}
  showDensityToggle={true}
/>
```

**Features:** Sortable columns, pagination, row selection, density toggle (compact/default/comfortable)
**Keyboard:** Arrow keys, Enter for sorting, Space for selection
**Mobile:** Responsive stacking, horizontal scroll
**States:** empty, loading (via aria-busy)

#### 7. Sidebar
```tsx
import { Sidebar } from '@keel/design-system/components';

<Sidebar
  logo={<Logo />}
  items={[
    { id: 'dashboard', label: 'Dashboard', icon: <DashIcon /> },
    { id: 'team', label: 'Team', icon: <TeamIcon />, collapsible: true, items: [...] },
    { id: 'settings', label: 'Settings', icon: <GearIcon /> },
  ]}
  userMenu={[
    { id: 'profile', label: 'Profile', onClick: () => {} },
    { id: 'logout', label: 'Logout', onClick: () => {} },
  ]}
  userName="Jane Doe"
  userAvatar={<Avatar />}
  selectedItemId={selectedId}
  onSelectItem={setSelectedId}
  isOpen={sidebarOpen}
  onToggleMobile={setSidebarOpen}
/>
```

**Features:** Logo, navigation items with icons, submenu support, user profile, collapsible sections
**Mobile:** Drawer sidebar with hamburger menu (hidden on desktop)
**Props:** items[], userMenu[], userName, userAvatar, selectedItemId, isOpen, onToggleMobile
**Responsive:** Fixed sidebar on desktop, drawer on mobile

#### 8. TopNav
```tsx
import { TopNav } from '@keel/design-system/components';

<TopNav
  logo={<Logo />}
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'People', href: '/people' },
    { label: 'Jane Doe', current: true },
  ]}
  currentTenant={{ id: 'acme', label: 'ACME Corp' }}
  tenants={[...]}
  onTenantChange={handleTenantChange}
  currentGroup={...}
  groups={[...]}
  onGroupChange={handleGroupChange}
  currentEntity={...}
  entities={[...]}
  onEntityChange={handleEntityChange}
  currentBranch={...}
  branches={[...]}
  onBranchChange={handleBranchChange}
  userName="Jane Doe"
  userAvatar={<Avatar />}
  userMenu={[
    { label: 'Profile', onClick: () => {} },
    { label: 'Settings', onClick: () => {} },
  ]}
  theme="light"
  onThemeChange={handleThemeChange}
/>
```

**Features:** Logo, breadcrumbs, context switchers (Tenant/Group/Entity/Branch), user menu, theme toggle
**Mobile:** Context switchers stack on secondary row
**Props:** All context items optional; use showContextSwitcher and showBreadcrumbs to hide

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
