# Keel Design System — Components Reference

## Overview

8 core components built on Radix UI primitives with Keel styling. All components:
- Meet WCAG 2.2 AA accessibility standards
- Support light/dark themes via CSS variables
- Include all required states (empty, loading, error, offline, read-only, no-permission, L3)
- Are responsive across desktop, tablet, mobile, and kiosk layouts
- Have full TypeScript support with JSDoc documentation

## Quick Navigation

1. [Button](#button) — Primary interaction element
2. [Input](#input) — Text, email, password, number, date inputs
3. [Card](#card) — Content container with optional header/footer
4. [Modal](#modal) — Dialog for focused user interactions
5. [Form Components](#form-components) — Form, FormField, FormSubmit
6. [Table](#table) — Data display with sorting, pagination, selection
7. [Sidebar](#sidebar) — Navigation sidebar with logo and user menu
8. [TopNav](#topnav) — Header with breadcrumbs and context switchers

---

## Button

Primary interaction element with variants, sizes, and full keyboard support.

### Imports
```typescript
import { Button, buttonVariants } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

### Variants
- `primary` — Brand color (indigo), primary action
- `secondary` — Neutral background, secondary action
- `danger` — Red, destructive action
- `ghost` — Transparent background, subtle action

### Sizes
- `sm` — 8px height with icon, 32px total
- `md` — 10px height (default), 40px total
- `lg` — 12px height, 48px total

### States
- `default` — Normal interactive state
- `loading` — Spinner + disabled cursor, `aria-busy="true"`
- `disabled` — Gray out, `aria-disabled="true"`, cursor not-allowed
- `readonly` — Interactive but read-only state
- `no-permission` — Very faded, `aria-disabled="true"`
- `l3` — Dashed border (deterministic-only mode)

### Props
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'loading' | 'disabled' | 'readonly' | 'no-permission' | 'l3';
  isLoading?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  ariaLabel?: string;
}
```

### Accessibility
- Keyboard: Space/Enter to activate
- Focus: 3px outline, offset 2px, brand-500 color
- Screen reader: `aria-label` for icon-only buttons
- Loading: `aria-busy="true"` announced

### Examples

**Primary button with icon:**
```tsx
<Button variant="primary" icon={<SaveIcon />}>
  Save Changes
</Button>
```

**Loading state:**
```tsx
<Button isLoading={isSaving}>
  Save
</Button>
```

**Danger button:**
```tsx
<Button variant="danger" onClick={handleDelete}>
  Delete Account
</Button>
```

---

## Input

Text input supporting multiple types with error messages and helper text.

### Imports
```typescript
import { Input, inputVariants } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<Input
  type="email"
  placeholder="name@example.com"
  label="Email Address"
  isRequired={true}
/>
```

### Types
- `text` — Default text input
- `email` — Email validation
- `password` — Masked text
- `number` — Numeric input
- `date` — Date picker
- `search` — Search input (with clear button)
- `tel` — Telephone number
- Any standard HTML input type

### Sizes
- `sm` — 8px height, 32px total
- `md` — 10px height (default), 40px total
- `lg` — 12px height, 48px total

### States
- `default` — Normal input
- `error` — Red border + error message, `aria-invalid="true"`
- `readonly` — Disabled editing
- `no-permission` — Faded + disabled
- `l3` — Dashed border (deterministic-only mode)

### Props
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  isRequired?: boolean;
  showRequired?: boolean;
  inputState?: 'default' | 'error' | 'readonly' | 'no-permission' | 'l3';
  size?: 'sm' | 'md' | 'lg';
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}
```

### Accessibility
- Keyboard: Standard input navigation
- Label: Always associated via `htmlFor`
- Error: `aria-invalid="true"`, `aria-describedby` to error message
- Helper text: `aria-describedby` to helper text
- Required: `aria-required="true"` when needed

### Examples

**Email with helper text:**
```tsx
<Input
  type="email"
  label="Work Email"
  placeholder="you@company.com"
  helperText="Use your company email address"
  isRequired={true}
/>
```

**Password with error:**
```tsx
<Input
  type="password"
  label="Password"
  error={passwordError}
  helperText="At least 8 characters"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
```

**Number input:**
```tsx
<Input
  type="number"
  label="Hours Worked"
  min="0"
  max="24"
  step="0.5"
/>
```

---

## Card

Container component for organizing content.

### Imports
```typescript
import { Card, cardVariants } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<Card padding="lg">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

### Variants
- `default` — Shadow-sm, subtle elevation
- `elevated` — Shadow-md, hover effect (shadow-lg)
- `outlined` — 2px border, no shadow

### Padding
- `sm` — 8px
- `md` — 12px (default)
- `lg` — 16px

### States
- `default` — Normal state
- `loading` — Overlay spinner, pointer-events-none
- `empty` — No visual change, use for semantic meaning
- `error` — Red-tinted border
- `l3` — Dashed border (deterministic-only mode)

### Props
```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  state?: 'default' | 'loading' | 'empty' | 'error' | 'l3';
  padding?: 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  children?: ReactNode;
}
```

### Accessibility
- No role assumptions (let parent decide)
- Loading state: `aria-busy="true"`

### Examples

**Card with header and footer:**
```tsx
<Card
  header={<h2>Team Members</h2>}
  footer={<Button>Add Member</Button>}
>
  <Table data={members} columns={columns} />
</Card>
```

**Error state:**
```tsx
<Card state="error" padding="lg">
  <p>⚠️ Unable to load data. Please try again.</p>
</Card>
```

---

## Modal

Dialog for focused user interactions with focus trap and keyboard support.

### Imports
```typescript
import { Modal } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Confirm Action"
>
  Are you sure you want to proceed?
</Modal>
```

### Sizes
- `sm` — Max 24rem (384px)
- `md` — Max 28rem (448px) (default)
- `lg` — Max 32rem (512px)

### Props
```typescript
interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  hideCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  ariaLabel?: string;
  className?: string;
}
```

### Accessibility
- Focus trap: Focus stays inside modal while open
- Keyboard: Escape closes modal (if `closeOnBackdropClick` allows)
- Role: `role="dialog"`, `aria-modal="true"`
- Label: `aria-labelledby` to title, `aria-describedby` to content
- Backdrop: Click to close (configurable)

### Examples

**Confirmation dialog:**
```tsx
<Modal
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Item"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </>
  }
>
  This action cannot be undone.
</Modal>
```

---

## Form Components

Suite of form-related components for building forms.

### Imports
```typescript
import { Form, FormField, FormSubmit } from '@keel/design-system/components';
```

### Form (Wrapper)
```tsx
<Form
  onSubmit={handleSubmit}
  isSubmitting={isSubmitting}
  spacing="md"
  layout="vertical"
>
  {/* Form fields */}
</Form>
```

**Props:**
- `onSubmit?: (e: FormEvent) => void | Promise<void>` — Form submit handler
- `isSubmitting?: boolean` — Shows loading state
- `layout?: 'vertical' | 'horizontal'` — Field layout (currently vertical only)
- `spacing?: 'sm' | 'md' | 'lg'` — Gap between fields

### FormField (Input Wrapper)
```tsx
<FormField
  name="email"
  label="Email Address"
  type="email"
  isRequired={true}
  error={errors.email}
  helperText="We'll never share this"
/>
```

**Props:**
- Inherits all Input props
- `name: string` — Field name for form submission
- `error?: string` — Error message (if validation fails)
- `isRequired?: boolean` — Mark as required
- `render?: (props) => ReactNode` — Custom input component

### FormSubmit (Submit Button)
```tsx
<FormSubmit isLoading={isSubmitting}>
  Sign In
</FormSubmit>
```

**Props:**
- Inherits Button props
- `isLoading?: boolean` — Loading state during submission

### Complete Example
```tsx
import { Form, FormField, FormSubmit } from '@keel/design-system/components';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    setIsSubmitting(true);
    try {
      const result = await loginAPI({ email, password });
      if (result.ok) {
        // Redirect
      } else {
        setErrors(result.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} isSubmitting={isSubmitting}>
      <FormField
        name="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        isRequired={true}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        isRequired={true}
      />
      <FormSubmit isLoading={isSubmitting}>
        Sign In
      </FormSubmit>
    </Form>
  );
}
```

---

## Table

Data display component with sorting, pagination, and selection.

### Imports
```typescript
import { Table } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<Table
  data={rows}
  columns={[
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'email', header: 'Email', render: (row) => row.email },
  ]}
  getRowKey={(row) => row.id}
/>
```

### Column Definition
```typescript
interface TableColumn<T> {
  key: string;                           // Unique identifier
  header: ReactNode;                      // Column header text
  render: (row: T, index: number) => ReactNode; // Cell renderer
  sortable?: boolean;                    // Enable sorting for this column
  width?: string;                        // Optional CSS width
}
```

### Props
```typescript
interface TableProps<T> {
  data: T[];                              // Table rows
  columns: TableColumn<T>[];              // Column definitions
  getRowKey: (row: T, index: number) => string | number; // Row identifier
  selectable?: boolean;                  // Enable checkboxes
  selectedRows?: (string | number)[];    // Selected row IDs
  onSelectionChange?: (ids: (string | number)[]) => void;
  sortBy?: string;                       // Currently sorted column key
  sortDirection?: 'asc' | 'desc' | null; // Sort direction
  onSort?: (key: string, direction: SortDirection) => void;
  page?: number;                         // Current page (1-indexed)
  pageSize?: number;                     // Rows per page (default: 10)
  totalRows?: number;                    // Total row count
  onPageChange?: (page: number) => void;
  isLoading?: boolean;                   // Show loading overlay
  emptyMessage?: ReactNode;              // Message when no data
  density?: 'compact' | 'default' | 'comfortable';
  showPagination?: boolean;
  showDensityToggle?: boolean;
}
```

### Accessibility
- Keyboard: Arrow keys for sorting, Space for selection, Tab through
- ARIA: `role="table"`, `aria-busy` for loading, `aria-sort` on headers
- Screen readers: Announces sorting, selection, pagination
- Mobile: Responsive stacking with horizontal scroll

### Examples

**Table with sorting and pagination:**
```tsx
const [sortBy, setSortBy] = useState('name');
const [sortDir, setSortDir] = useState('asc');
const [page, setPage] = useState(1);

<Table
  data={filteredRows}
  columns={[
    { key: 'name', header: 'Name', render: (row) => row.name, sortable: true },
    { key: 'email', header: 'Email', render: (row) => row.email, sortable: true },
    { key: 'role', header: 'Role', render: (row) => <Badge>{row.role}</Badge> },
  ]}
  getRowKey={(row) => row.id}
  sortBy={sortBy}
  sortDirection={sortDir}
  onSort={(key, dir) => { setSortBy(key); setSortDir(dir); }}
  page={page}
  pageSize={10}
  totalRows={total}
  onPageChange={setPage}
  selectable={true}
  selectedRows={selected}
  onSelectionChange={setSelected}
  density="default"
  showPagination={true}
  showDensityToggle={true}
/>
```

---

## Sidebar

Navigation sidebar with collapsible menu and user profile.

### Imports
```typescript
import { Sidebar } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<Sidebar
  logo={<Logo />}
  items={[
    { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    { id: 'people', label: 'People', icon: <PeopleIcon /> },
    { id: 'settings', label: 'Settings', icon: <GearIcon /> },
  ]}
  selectedItemId={selectedId}
  onSelectItem={setSelectedId}
/>
```

### Item Structure
```typescript
interface SidebarItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
  active?: boolean;
  items?: SidebarItem[];        // Submenu
  collapsible?: boolean;        // Allow collapse
}
```

### Props
```typescript
interface SidebarProps {
  logo?: ReactNode;
  items: SidebarItem[];
  userMenu?: SidebarItem[];
  userName?: string;
  userAvatar?: ReactNode;
  isOpen?: boolean;             // Mobile drawer state
  onToggleMobile?: (open: boolean) => void;
  selectedItemId?: string;
  onSelectItem?: (id: string) => void;
  collapsedItems?: Set<string>; // IDs of collapsed items
  onToggleCollapse?: (id: string) => void;
}
```

### Accessibility
- Keyboard: Tab, Arrow keys, Enter to select
- Mobile: Hamburger menu (hidden on desktop)
- ARIA: `role="navigation"`, `aria-current="page"` on active item

### Examples

**Sidebar with nested menu:**
```tsx
<Sidebar
  logo={<h1>KEEL</h1>}
  items={[
    { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: <CheckIcon />,
      collapsible: true,
      items: [
        { id: 'pending', label: 'Pending', onClick: () => nav('/approvals/pending') },
        { id: 'history', label: 'History', onClick: () => nav('/approvals/history') },
      ],
    },
    { id: 'settings', label: 'Settings', icon: <GearIcon /> },
  ]}
  userMenu={[
    { id: 'profile', label: 'Profile', onClick: handleProfile },
    { id: 'logout', label: 'Logout', onClick: handleLogout },
  ]}
  userName="Jane Doe"
  userAvatar={<img src="avatar.jpg" />}
  selectedItemId={selected}
  onSelectItem={setSelected}
  isOpen={sidebarOpen}
  onToggleMobile={setSidebarOpen}
/>
```

---

## TopNav

Header navigation with breadcrumbs and context switchers.

### Imports
```typescript
import { TopNav } from '@keel/design-system/components';
```

### Basic Usage
```tsx
<TopNav
  logo={<Logo />}
  breadcrumbs={[
    { label: 'Home', href: '/' },
    { label: 'People', href: '/people' },
    { label: 'John Smith', current: true },
  ]}
  userName="Jane Doe"
  userAvatar={<Avatar />}
/>
```

### Context Item
```typescript
interface ContextItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}
```

### Props
```typescript
interface TopNavProps {
  logo?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  currentTenant?: ContextItem;
  tenants?: ContextItem[];
  onTenantChange?: (id: string) => void;
  currentGroup?: ContextItem;
  groups?: ContextItem[];
  onGroupChange?: (id: string) => void;
  currentEntity?: ContextItem;
  entities?: ContextItem[];
  onEntityChange?: (id: string) => void;
  currentBranch?: ContextItem;
  branches?: ContextItem[];
  onBranchChange?: (id: string) => void;
  userName?: string;
  userAvatar?: ReactNode;
  userMenu?: { label: ReactNode; onClick: () => void }[];
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  actions?: ReactNode;
  showContextSwitcher?: boolean;
  showBreadcrumbs?: boolean;
}
```

### Accessibility
- Keyboard: Tab through nav items, Enter to select
- ARIA: `aria-label="Breadcrumb"`, `aria-current="page"` on current breadcrumb
- Mobile: Context switchers stack on secondary row

### Examples

**Full-featured TopNav:**
```tsx
<TopNav
  logo={<h1>KEEL</h1>}
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Payroll', href: '/payroll' },
    { label: 'Run 2024-08', current: true },
  ]}
  currentTenant={{ id: 'acme', label: 'ACME Corp' }}
  tenants={tenants}
  onTenantChange={handleTenantChange}
  currentGroup={{ id: 'hr', label: 'HR' }}
  groups={groups}
  onGroupChange={handleGroupChange}
  currentEntity={{ id: 'us-ca', label: 'US - California' }}
  entities={entities}
  onEntityChange={handleEntityChange}
  currentBranch={{ id: 'main', label: 'Main Office' }}
  branches={branches}
  onBranchChange={handleBranchChange}
  userName="Jane Doe"
  userAvatar={<img src="avatar.jpg" />}
  userMenu={[
    { label: 'Profile', onClick: () => nav('/profile') },
    { label: 'Settings', onClick: () => nav('/settings') },
    { label: 'Logout', onClick: handleLogout },
  ]}
  theme={theme}
  onThemeChange={setTheme}
/>
```

---

## Common Patterns

### Using States
All components support explicit state management:

```tsx
// Error state
<Input state="error" error="Email already registered" />

// Loading state
<Card isLoading={true}>
  <Skeleton />
</Card>

// L3 (Deterministic-only) state
<Button state="l3">Approve (Deterministic)</Button>

// No permission state
<Input state="no-permission" disabled />
```

### Theme Switching
```tsx
const [theme, setTheme] = useState('light');

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);

return (
  <TopNav
    theme={theme}
    onThemeChange={setTheme}
  />
);
```

### Responsive Layouts
Sidebar + TopNav + Main content:

```tsx
export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <TopNav
        logo={<Logo />}
        // ...
      />
      <Sidebar
        isOpen={sidebarOpen}
        onToggleMobile={setSidebarOpen}
        // ...
      />
      <main className="flex-1 p-lg">
        {children}
      </main>
    </>
  );
}
```

---

## Testing

All components are tested with:
- **Vitest** — Unit and integration tests
- **Playwright** — E2E and visual regression
- **axe-core** — Accessibility audit
- **Storybook** — Visual documentation and manual testing

Run tests:
```bash
pnpm run test          # All tests
pnpm run test Button   # Single component
```

---

## Styling Reference

### CSS Classes
Use Tailwind classes directly. Examples:
- Background: `bg-brand-500`, `bg-neutral-50`
- Text: `text-neutral-950`, `text-lg`
- Spacing: `p-md`, `gap-lg`, `m-xl`
- Shadows: `shadow-base`, `shadow-lg`
- Rounded: `rounded-md`, `rounded-full`

### CSS Variables
Use in custom CSS:
```css
.custom {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-md);
}
```

---

## Further Reading

- **ADR 0001:** Component Design Patterns — `docs/adr/0001-component-design-patterns.md`
- **ADR 0002:** Design Token Strategy — `docs/adr/0002-design-token-strategy.md`
- **WCAG 2.2:** https://www.w3.org/WAI/WCAG22/quickref/
- **Radix UI:** https://www.radix-ui.com/docs/primitives/overview/introduction
