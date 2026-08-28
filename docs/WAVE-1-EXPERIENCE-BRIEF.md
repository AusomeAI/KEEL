# Wave 1 Experience Brief — Squad 5

**Status:** Approved  
**Scope:** Months 0–5  
**Owner:** Squad 5 — Experience  
**Related:** [CLAUDE.md](../CLAUDE.md) § "UX Design Brief"; [Unified Build Brief](../05-Unified-Build-Brief-for-Agent-Teams.md) § 6

---

## Mission

Build the manual UX paths first. Assume agents will never exist. Every screen must be beautiful, functional, and usable by a frontline worker under stress on a 5-year-old Android tablet in poor light.

**Success criterion:** A frontline worker (kiosk + mobile) can clock in/out, submit timesheets, and request leave without a manual, in poor light, with gloves, on 2G.

---

## Design Principles (Non-Negotiable)

These are from the Unified Build Brief § 6. Every screen must satisfy all six.

1. **The manual path is the product** — Design as if agents will never exist. Agents accelerate, never replace.

2. **Explain, don't assert** — Every calculated number (leave balance, net pay, proration) must show the "why": the rule, rule version, and inputs.

3. **Context is always visible** — User's current Group / Entity / Branch context is persistent in the chrome. One interaction to switch.

4. **Degradation is announced** — L3 mode banner (calm, factual, not error state). Design L3 as first-class, not broken.

5. **Frontline first** — Design kiosk and mobile *before* desktop. Assume shared device, queue behind user, poor light, gloves, 2G.

6. **Approval is the highest-traffic surface** — Every approval item shows projected effect, governing policy, and what happens if approved/rejected.

---

## Deliverables

### Phase 1: Design System (Week 1–2) ✓ COMPLETE

- [x] **Keel DS v1 token structure** — colors, spacing, typography, effects
- [x] **CSS variables** — light/dark theme, accessible contrasts
- [x] **Radix-based primitives** — Button, Input, Card, Modal, Form, Table, Sidebar, TopNav, BottomSheet
- [x] **ADR 0004** — design system token strategy

**Output:** `packages/design-system/src/tokens/` and `src/styles/index.css`

### Phase 2: Web App Foundation (Week 2–3) IN PROGRESS

**Scope:** React 19 + Vite, TanStack Router, Query. Desktop and tablet layouts.

#### 2.1: Route Structure

```
/auth
  /login                         # Password + SSO button
  /sso-redirect                  # OAuth callback
  /mfa                           # MFA challenge (if configured)
  /session-expired               # Session timeout prompt

/app                             # Protected (requires auth + tenancy context)
  /dashboard                     # Role-based dashboard
  /dashboard/manager             # Manager view
  /dashboard/hr                  # HR admin view
  /dashboard/employee            # Employee view
  
  /context                       # Context switcher (persistent in chrome)
  
  /people
    /                            # Employee directory + org chart
    /:id                         # Employee profile (L3: read-only)
    /:id/edit                    # Edit employee (HR only)
  
  /approval                      # Approval inbox (highest-traffic surface)
    /                            # Approval queue
    /:id                         # Approval detail
  
  /time
    /clock-in                    # Time entry
    /timesheets                  # Timesheet list
    /timesheets/:id              # Timesheet detail
  
  /leave
    /balances                    # Leave balance (explain accrual)
    /requests                    # Leave request list
    /requests/new                # Leave request form
  
  /settings
    /profile                     # User preferences
    /notifications               # Notification settings
    /appearance                  # Theme, language
```

#### 2.2: Core Components (Built from Tokens)

Each component must have:
- Desktop, tablet, mobile, kiosk layouts
- All states: empty, loading, partial, error, offline, read-only, no-permission, L3
- Accessibility: WCAG 2.2 AA, keyboard paths documented
- Localisation: string expansion, date/number/name formatting

**Components to build:**

| Component | Mobile | Desktop | Kiosk | Tablet | L3 State |
|-----------|--------|---------|-------|--------|----------|
| Button | ✓ | ✓ | ✓ (large) | ✓ | Read-only |
| Input | ✓ | ✓ | ✓ (large) | ✓ | Read-only |
| Card | ✓ | ✓ | ✓ | ✓ | Read-only |
| Modal | ✓ | ✓ | — | ✓ | Not used |
| Form | ✓ | ✓ | — | ✓ | Read-only |
| Table | — | ✓ | — | ✓ | Scrollable |
| Sidebar | — | ✓ | — | — | Sticky |
| TopNav | ✓ | ✓ | — | ✓ | Context visible |
| BottomSheet | ✓ | — | — | ✓ | Scrollable |
| ContextSwitcher | ✓ | ✓ | ✓ | ✓ | Always visible |
| L3Banner | ✓ | ✓ | ✓ | ✓ | Central feature |
| ApprovalCard | ✓ | ✓ | ✓ | ✓ | Projected effect shown |

### Phase 3: Kiosk Time-Punch Flow (Week 3–4) IN PROGRESS

**Principle:** Single-tap interactions. Large touch targets (48dp minimum). 2G-resilient. Offline buffer.

**Flow:**

```
Kiosk Home
├─ Employee badge/PIN entry (48dp buttons, soft keyboard)
│
├─ [Clock In] [Clock Out] [Break] [Meal]
│  (color-coded, clear state indication)
│
├─ Confirmation
│  "Clocked in at 08:30"
│  "In: Building A, Level 3"
│  [Dismiss]
│
└─ Offline buffer
   (if network down, stores punch locally, syncs when reconnected)
```

**Screens:**

1. **Kiosk Home** — login or "tap to punch"
2. **Punch Menu** — [Clock In] [Clock Out] [Break] [Meal]
3. **Punch Confirmation** — timestamp, location, next action
4. **Error States** — already clocked in, network error, sync pending
5. **Offline Mode** — "Offline — your punch will sync when connected"

**Offline-first strategy:**
- Mobile/kiosk captures all punches locally (SQLite)
- Syncs when network returns (with conflict resolution)
- User sees "Sync pending" badge until confirmed
- Never shows a confusing error to the worker

### Phase 4: Mobile App Foundation (Week 4–5)

**Scope:** React Native + Expo, offline-first SQLite, conflict-resolving sync.

**Key surfaces:**

1. **Punch (same as kiosk)** — Clock in/out, break, meal
2. **Timesheet** — View, edit, submit
3. **Leave** — Balance, request form, approval status
4. **ESS** — Personal data, emergency contacts, documents

**Offline-first architecture:**

```typescript
// Device-local SQLite database
const db = new SQLiteDatabase('keel-mobile');

// Sync engine: captures changes, queues for sync
const changes = db.getPendingChanges(); // Stored locally
await syncToServer(changes);            // When online

// Conflict resolution: server wins, local edits flag as stale
if (serverVersion > localVersion) {
  markAsStale('timestamp-id');          // User sees "Stale"
  refetch();                             // Fetch fresh copy
}
```

### Phase 5: Accessibility & Localisation (Week 5)

- [ ] WCAG 2.2 AA audit (all screens)
- [ ] Keyboard paths documented (Tab order, Arrow keys, Enter, Escape)
- [ ] Focus order verified
- [ ] Localisation strings extracted (1.4× expansion planning)
- [ ] RTL layout verified (CSS `direction: rtl`)
- [ ] Date/number/name formatting by locale
- [ ] Color-blind palette verified (Deuteranopia, Protanopia)

---

## Continuity States

Every screen must have:

| State | Definition | UI Treatment |
|-------|-----------|--|
| **L0** | Autonomous (agents making decisions) | Not in Wave 1 |
| **L1** | Supervised (agent proposes, human approves) | Not in Wave 1 |
| **L2** | Assisted (agent suggests, human enters) | Not in Wave 1 |
| **L3** | Deterministic (zero LLM) | ← Default for Wave 1 |
| **L4** | Offline/read-only | Secondary (mobile/kiosk optimised) |
| **Empty** | No data (first-time user) | Helpful placeholder, not sad |
| **Loading** | Fetching data | Skeleton or spinner, not indefinite |
| **Partial** | Some data missing (network error) | Show what we have, "Offline" badge |
| **Error** | Critical failure | Clear, actionable error message |
| **Read-only** | No editing (L3, no permission) | Grayed-out fields, "L3 Mode" banner |
| **No-permission** | User lacks role/authorization | "You don't have access to this" |

---

## High-Traffic Surfaces (Optimise These)

### 1. Approval Inbox
- **Traffic:** Every manager's day is approvals
- **Requirement:** Show projected effect on each item
  - "If approved: leaves available balance 12 days → 10 days"
  - "Policy: Annual leave, accrued 2.5 days/month"
- **Bulk action:** Approve/reject multiple in one go
- **Offline:** Queue approvals, sync later

### 2. Time Entry
- **Traffic:** Every frontline worker, every day, often under time pressure
- **Requirement:** Single-tap from home screen (kiosk)
- **Offline buffer:** Store punch locally, sync on reconnect
- **Keyboard:** No mouse required (mobile with gloves)
- **Feedback:** Clear timestamp and location confirmation

### 3. Leave Request
- **Traffic:** Monthly, but during busy periods (holidays)
- **Requirement:** Show available balance before submitting
  - "Applying for 5 days, balance after: 7 days"
- **Explain:** "Annual leave accrued 2.5 days/month, policy allows 30 days/year"
- **Offline:** Draft locally, submit when online

---

## L3 Mode Banner

A persistent, calm banner showing continuity level:

```
┌─────────────────────────────────────────────────────────┐
│ ℹ L3 Mode: All features available. Agents are offline.  │
└─────────────────────────────────────────────────────────┘
```

**Not an error state.** L3 is the default, most resilient mode.

On high-traffic surfaces, briefly explain what "L3" means:
- "This is Keel's most reliable mode. No AI assistance, all decisions are manual. Same features, no agent latency."

---

## Design System Governance

### Adding a Component

1. **Define tokens first** — Colors, spacing, typography from `packages/design-system/tokens`
2. **Use Radix primitives** — Build on Dialog, Label, etc., never from scratch
3. **Apply CVA** — Type-safe variant composition
4. **Document states** — Empty, loading, error, disabled, readonly, L3
5. **Test accessibility** — Keyboard, focus, ARIA
6. **File ADR if needed** — For novel patterns (e.g., "approval card with projected effect")

### Never

- Build a one-off component; always contribute to DS
- Use hex colors; always use token names
- Hard-code spacing; always use spacing presets
- Custom font sizes; always use typography tokens
- Add animation without checking `prefers-reduced-motion`

---

## Testing Strategy

### Unit Tests
```typescript
// tokens.test.ts
import { colorTokens } from '@keel/design-system/tokens';
import { WCAG2_AA } from '@keel/testing';

test('all color combinations meet WCAG 2.2 AA', () => {
  for (const [name, color] of Object.entries(colorTokens)) {
    for (const bg of backgrounds) {
      const contrast = calculateContrast(color, bg);
      expect(contrast).toBeGreaterThanOrEqual(4.5); // normal text
    }
  }
});
```

### Visual Tests (Storybook)
```typescript
// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = { args: { variant: 'primary', children: 'Click' } };
export const Secondary = { args: { variant: 'secondary', children: 'Click' } };
export const Disabled = { args: { disabled: true, children: 'Click' } };
export const Loading = { args: { loading: true, children: 'Click' } };
export const LightTheme = { parameters: { theme: 'light' } };
export const DarkTheme = { parameters: { theme: 'dark' } };
```

### E2E Tests (Playwright)
```typescript
// time-punch.spec.ts
test('kiosk time punch works offline', async ({ page }) => {
  // Simulate offline
  await page.context().setOffline(true);

  // Tap "Clock In"
  await page.click('button:has-text("Clock In")');

  // See confirmation (stored locally)
  await expect(page).toContainText('Clocked in at 08:30');
  await expect(page).toContainText('Sync pending');

  // Go back online
  await page.context().setOffline(false);

  // See "Synced" confirmation
  await expect(page).toContainText('Synced');
});
```

---

## Localisation Checklist

- [ ] Extract all strings to `locales/en.json`
- [ ] Test with 1.4× string expansion
- [ ] RTL layout tested (Arabic, Hebrew)
- [ ] Date formatting by locale (MM/DD/YYYY vs DD/MM/YYYY)
- [ ] Number formatting by locale (1,234.56 vs 1.234,56)
- [ ] Name order by locale (first last vs last first)
- [ ] Time formatting by locale (12-hour vs 24-hour)
- [ ] Currency symbol and placement

---

## Accessibility Checklist

- [ ] All text has sufficient contrast (4.5:1 normal, 3:1 large)
- [ ] All interactive elements have visible focus (3px outline)
- [ ] Keyboard paths documented (Tab, Arrow, Enter, Escape)
- [ ] No color used alone to convey information
- [ ] All images have alt text
- [ ] Form labels properly associated with inputs
- [ ] Error messages clear and actionable
- [ ] Motion respected (`prefers-reduced-motion`)
- [ ] Mobile: touch targets 44px minimum
- [ ] Kiosk: touch targets 48px minimum
- [ ] ARIA labels on interactive elements
- [ ] Semantic HTML (button, nav, main, etc.)
- [ ] No infinite scroll; finite lists with pagination
- [ ] Focus not trapped in modals (can escape)

---

## Definition of Done

A Wave 1 Experience deliverable is done when:

- [ ] Manual UI merged, covering every state on every form factor
- [ ] Design tokens defined in `packages/design-system/src/tokens`
- [ ] CSS variables generated and tested in light/dark modes
- [ ] Components built on Radix + CVA, not one-off
- [ ] Desktop, tablet, mobile, kiosk layouts all functional
- [ ] Empty, loading, partial, error, offline, readonly, no-permission, L3 states all beautiful
- [ ] Accessibility audit passed (WCAG 2.2 AA)
- [ ] Localisation strings extracted, 1.4× expansion verified
- [ ] Storybook or design system documentation updated
- [ ] ADR filed for novel patterns
- [ ] L3 mode banner implemented and tested
- [ ] Offline-first sync verified on mobile/kiosk

---

## Success Metrics (Per Wave 1 Exit)

Not features shipped. Measurable outcomes:

1. **An engineer can run `pnpm keel:l3` and complete a full hire-to-pay cycle** through the UI (no agent plane)
2. **Frontline workers (kiosk + mobile) can punch in/out offline**, with automatic sync
3. **Leave requests show balance and accrual rules**, not just a number
4. **Every screen works on 5-year-old Android tablet, 2G, poor light, gloves**
5. **WCAG 2.2 AA on every screen**, light and dark themes equally
6. **No design patterns or components that violate the UX design principles**
7. **Adoption metrics** (baseline by Month 1, trending up by Month 5)

---

## Next Steps

1. ✓ Design system tokens and CSS variables
2. → Web app routing and authentication flow (next)
3. → Kiosk time-punch wireframes and interaction patterns
4. → Mobile offline-first sync engine
5. → Storybook setup and component library
6. → Accessibility and localisation audit
7. → User testing with frontline workers (real workers, real environment)
8. → Design refinements based on feedback

---

## References

- [CLAUDE.md](../CLAUDE.md) — Architecture and non-negotiable laws
- [Unified Build Brief](../05-Unified-Build-Brief-for-Agent-Teams.md) — Complete requirements
- [Wave 1 Execution Playbook](../06-Wave-1-Execution-Playbook.md) — Detailed timeline
- ADR 0004 — Design system token strategy
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/) — Accessibility standards
