# KEEL Web App

React 19 + Vite + TanStack Router.

Desktop-first, but responsive to tablet (iPad, Android tablets).

**Status:** Wave 1 Foundations

---

## Project Structure

```
apps/web/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component
│   ├── router.ts                   # TanStack Router config
│   ├── env.d.ts                    # Environment types
│   ├── contexts/
│   │   ├── ThemeContext.tsx        # Light/dark theme
│   │   ├── AuthContext.tsx         # Auth state (user, token, role)
│   │   ├── TenancyContext.tsx      # Current tenant/group/entity/branch
│   │   ├── NotificationContext.tsx # Toast notifications
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth state + login/logout
│   │   ├── useTenancy.ts           # Context switcher
│   │   ├── useTheme.ts             # Theme toggle
│   │   ├── useNotification.ts      # Show toast
│   │   └── index.ts
│   ├── layouts/
│   │   ├── AuthLayout.tsx          # Login, MFA, etc.
│   │   ├── AppLayout.tsx           # Main layout with sidebar/topnav
│   │   ├── KioskLayout.tsx         # Minimal layout (not used in web, placeholder)
│   │   └── index.ts
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SSORedirectPage.tsx
│   │   │   ├── MFAPage.tsx
│   │   │   └── SessionExpiredPage.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx   # Role-based routing
│   │   │   ├── ManagerDashboard.tsx
│   │   │   ├── HRDashboard.tsx
│   │   │   └── EmployeeDashboard.tsx
│   │   ├── people/
│   │   │   ├── DirectoryPage.tsx   # List + org chart
│   │   │   ├── ProfilePage.tsx     # View employee
│   │   │   └── EditPage.tsx
│   │   ├── approval/
│   │   │   ├── InboxPage.tsx       # Approval queue
│   │   │   └── DetailPage.tsx
│   │   ├── time/
│   │   │   ├── ClockInPage.tsx
│   │   │   ├── TimesheetListPage.tsx
│   │   │   └── TimesheetDetailPage.tsx
│   │   ├── leave/
│   │   │   ├── BalancesPage.tsx    # Accrual explained
│   │   │   ├── RequestListPage.tsx
│   │   │   └── RequestFormPage.tsx
│   │   ├── settings/
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── NotificationsPage.tsx
│   │   │   └── AppearancePage.tsx
│   │   ├── ErrorPage.tsx           # 404, 403, error boundary
│   │   └── index.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx          # Top navigation
│   │   │   ├── Sidebar.tsx         # Left sidebar
│   │   │   ├── ContextSwitcher.tsx # Tenant/group/entity picker
│   │   │   ├── L3Banner.tsx        # Continuity level banner
│   │   │   ├── UserMenu.tsx        # User profile dropdown
│   │   │   └── index.ts
│   │   ├── approval/
│   │   │   ├── ApprovalCard.tsx    # Shows projected effect
│   │   │   ├── ApprovalDetail.tsx  # Full approval flow
│   │   │   └── BulkApproval.tsx    # Multi-select actions
│   │   ├── forms/
│   │   │   ├── FormField.tsx       # Label + input wrapper
│   │   │   ├── FormError.tsx       # Error message display
│   │   │   └── FormSubmit.tsx      # Submit button with loading
│   │   └── index.ts
│   ├── api/
│   │   ├── client.ts               # API client (axios + interceptors)
│   │   ├── auth.ts                 # /auth endpoints
│   │   ├── people.ts               # /people endpoints
│   │   ├── approval.ts             # /approval endpoints
│   │   ├── time.ts                 # /time endpoints
│   │   ├── leave.ts                # /leave endpoints
│   │   └── types.ts                # API response types
│   ├── utils/
│   │   ├── format.ts               # Date, money, duration formatting
│   │   ├── validate.ts             # Form validation
│   │   ├── storage.ts              # localStorage helpers
│   │   └── index.ts
│   ├── styles/
│   │   ├── index.css               # Global styles, Keel DS imports
│   │   ├── tailwind.css            # Tailwind (if used)
│   │   └── theme.css               # Theme overrides (if needed)
│   └── vite-env.d.ts               # Vite types
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Route Structure

All routes except `/auth/*` require authentication and valid tenancy context.

```
GET  /auth/login                    # Login form
POST /auth/login                    # Handle login
GET  /auth/sso-redirect             # OAuth callback (from provider)
GET  /auth/mfa                      # MFA challenge
POST /auth/mfa                      # Handle MFA
GET  /auth/session-expired          # Session timeout page

GET  /app/dashboard                 # Role-based dashboard (redirects to role-specific)
GET  /app/dashboard/manager         # Manager view
GET  /app/dashboard/hr              # HR admin view
GET  /app/dashboard/employee        # Employee self-service

GET  /app/context                   # Context switcher modal (or drawer on mobile)

GET  /app/people                    # Employee directory + org chart
GET  /app/people/:employeeId        # Employee profile (readonly on L3)
GET  /app/people/:employeeId/edit   # Edit employee (HR only)

GET  /app/approval                  # Approval inbox (main page)
GET  /app/approval/:approvalId      # Approval detail + decision flow

GET  /app/time/clock-in             # Time entry quick-punch
GET  /app/time/timesheets           # Timesheet list
GET  /app/time/timesheets/:id       # Timesheet detail + edit

GET  /app/leave/balances            # Leave balance explanation
GET  /app/leave/requests            # Leave request list
GET  /app/leave/requests/new        # Leave request form

GET  /app/settings/profile          # User profile
GET  /app/settings/notifications    # Notification preferences
GET  /app/settings/appearance       # Theme, language, etc.

GET  /404                           # Not found
GET  /403                           # Forbidden (no permission)
GET  /500                           # Server error
```

---

## Authentication Flow

### Login (Password + SSO)

```
User → Login Page
      ├─ Enter email + password
      ├─ [Continue with Single Sign-On]
      │  └─ Redirect to provider → OAuth callback → Token → Redirect /app/dashboard
      └─ [Sign In]
         ├─ POST /auth/login (email, password)
         ├─ Response: { token, user, tenancy }
         ├─ Store token in secure context
         └─ Redirect /app/dashboard
```

### Session Management

- **Token storage:** Secure (httpOnly cookie, not localStorage for XSS protection)
- **Token refresh:** Automatic refresh token rotation (server returns new token on request)
- **Timeout:** Idle timeout → redirect to /auth/session-expired
- **Logout:** Clear token, redirect to /auth/login

---

## Context & State Management

### Contexts (Provider Pattern)

1. **ThemeContext** — Light/dark mode toggle
   - Reads `prefers-color-scheme`, allows override via `data-theme` attribute
   - No re-renders; pure CSS custom property changes

2. **AuthContext** — Auth state, login/logout
   - User: { id, email, firstName, lastName, role, avatar }
   - Token: JWT (short-lived, refreshed automatically)
   - Permissions: array of capability strings

3. **TenancyContext** — Current Tenant/Group/Entity/Branch
   - Persistent in chrome (stored in localStorage)
   - Accessible in every component via `useTenancy()`
   - One-interaction switch via context picker

4. **NotificationContext** — Toast notifications
   - Show/hide toasts (success, error, warning, info)
   - Auto-dismiss after 4 seconds (or user click)

### State Management (React Query)

TanStack Query for server state:

```typescript
// Fetch employee list
const { data: employees, isLoading, error } = useQuery({
  queryKey: ['employees'],
  queryFn: () => api.employees.list(),
});

// Fetch single employee
const { data: employee } = useQuery({
  queryKey: ['employees', employeeId],
  queryFn: () => api.employees.get(employeeId),
});

// Mutation: create approval decision
const { mutate: approveRequest } = useMutation({
  mutationFn: (payload: ApprovalPayload) => api.approval.decide(payload),
  onSuccess: () => {
    // Invalidate queries, show toast, redirect
    queryClient.invalidateQueries({ queryKey: ['approval'] });
    showNotification('Approved', 'success');
  },
});
```

---

## API Client

```typescript
// api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
});

// Interceptors
apiClient.interceptors.request.use((config) => {
  // Add auth token
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add tenancy headers
  const tenancy = getTenancyContext();
  if (tenancy) {
    config.headers['X-Tenant'] = tenancy.tenant;
    config.headers['X-Group'] = tenancy.group;
    config.headers['X-Entity'] = tenancy.entity;
  }

  return config;
});

// Response interceptor for refresh-on-401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Component Patterns

### Page Component

```typescript
// pages/leave/BalancesPage.tsx
export function BalancesPage() {
  const { employeeId } = useAuth();
  const { data: balances, isLoading, error } = useQuery({
    queryKey: ['leave-balances', employeeId],
    queryFn: () => api.leave.getBalances(employeeId),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!balances?.length) return <EmptyState />;

  return (
    <AppLayout>
      <h1>Leave Balances</h1>
      {balances.map((balance) => (
        <BalanceCard key={balance.type} balance={balance} />
      ))}
    </AppLayout>
  );
}
```

### Form Component

```typescript
// pages/leave/RequestFormPage.tsx
export function RequestFormPage() {
  const navigate = useNavigate();
  const { mutate: submitRequest, isPending } = useMutation({
    mutationFn: (payload: LeaveRequest) => api.leave.request(payload),
    onSuccess: () => {
      navigate({ to: '/app/leave/requests' });
      showNotification('Leave request submitted', 'success');
    },
  });

  return (
    <AppLayout>
      <form onSubmit={(e) => {
        e.preventDefault();
        submitRequest(formData);
      }}>
        <FormField label="Start Date">
          <DateInput name="startDate" />
        </FormField>
        <FormField label="End Date">
          <DateInput name="endDate" />
        </FormField>
        <FormField label="Reason">
          <TextArea name="reason" />
        </FormField>
        <FormSubmit loading={isPending}>Submit Request</FormSubmit>
      </form>
    </AppLayout>
  );
}
```

---

## Styling

All styles via **Keel Design System tokens**:

```tsx
// Button.tsx (from @keel/design-system)
import { Button as DSButton } from '@keel/design-system/components';

// Automatically inherits:
// - Theme colors (light/dark)
// - Spacing tokens
// - Font sizes and weights
// - Shadows
// - Focus ring
// - Accessibility (keyboard, ARIA)

// Use in pages:
import { Button } from '@keel/design-system/components';

export function ApprovalPage() {
  return (
    <Button variant="primary" size="lg" onClick={handleApprove}>
      Approve
    </Button>
  );
}
```

**Never:**
- Use hex colors directly
- Hard-code spacing (use `var(--space-lg)` or Tailwind class)
- Create custom components without checking Keel DS

---

## Testing

### Unit Tests (Vitest)

```typescript
// pages/__tests__/DashboardPage.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from '../DashboardPage';

test('shows manager dashboard when user is manager', () => {
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider user={{ role: 'MANAGER' }}>
        <DashboardPage />
      </AuthProvider>
    </QueryClientProvider>
  );

  expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
});
```

### E2E Tests (Playwright)

```typescript
// e2e/approval.spec.ts
test('manager can approve leave request', async ({ page, loginAsManager }) => {
  await loginAsManager();
  await page.goto('/app/approval');

  const card = page.locator('[data-testid="approval-card"]').first();
  await expect(card).toContainText('Leave Request');
  await expect(card).toContainText('Projected balance: 7 days');

  await card.locator('button:has-text("Approve")').click();
  await expect(page).toContainText('Approved');
});
```

---

## Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm run test
```

---

## Environment Variables

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_AUTH_PROVIDER_ID=google      # or 'okta', 'azure', etc.
VITE_AUTH_CLIENT_ID=xxx
VITE_AUTH_REDIRECT_URI=http://localhost:5173/auth/sso-redirect
VITE_ENABLE_MOCKING=false         # MSW for development
```

---

## Accessibility Checklist

- [ ] Keyboard navigation (Tab, Arrow, Enter, Escape)
- [ ] Focus visible on all interactive elements
- [ ] Focus order logical (top-to-bottom, left-to-right)
- [ ] Color contrast 4.5:1 (normal), 3:1 (large)
- [ ] Form labels properly associated
- [ ] Error messages clear and linked to fields
- [ ] No color used alone to convey info
- [ ] Images have alt text
- [ ] ARIA labels on custom components
- [ ] No infinite scroll
- [ ] Focus not trapped (can escape modals)

---

## Next Steps

1. Set up Vite + React 19 scaffolding
2. Implement AuthContext + AuthProvider
3. Implement TenancyContext + ContextSwitcher
4. Build auth pages (login, MFA, SSO)
5. Build AppLayout (header, sidebar, main)
6. Build dashboard (role-based routing)
7. Build approval inbox (high-traffic surface)
8. Build leave request form + balance explanation
9. Build time entry (clock in/out)
10. Accessibility audit and refinements

---

## Related Documents

- [CLAUDE.md](../../CLAUDE.md) — Architecture and laws
- [Unified Build Brief](../../05-Unified-Build-Brief-for-Agent-Teams.md) — UX requirements
- [WAVE-1-EXPERIENCE-BRIEF.md](../../docs/WAVE-1-EXPERIENCE-BRIEF.md) — Detailed deliverables
- ADR 0004 — Design system token strategy
