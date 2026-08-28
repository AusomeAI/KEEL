# KEEL Web App E2E Tests

End-to-end tests for the KEEL HR Operating System using Playwright.

These tests verify the complete workflow from user interface through Control Gate to ledger persistence, with explicit verification of all 10 Non-Negotiable Laws.

## Test Suite

### `hire-employee.spec.ts`

**Main Workflow Test:** `should complete hire employee flow through Control Gate`

Tests the complete happy path:
1. User navigates to `/people/hire` (Law 2: manual UI)
2. Fills employee form (first name, last name, email, title, salary, start date)
3. Submits form to Control Gate API
4. Form submission creates a TransactionIntent (PENDING status)
5. Manager navigates to `/approvals`
6. Manager approves the pending intent
7. Control Gate pipeline executes steps 8-9:
   - Creates ledger event (append-only, Law 3)
   - Emits signed Decision Record (Law 7)
   - RLS policies enforce tenant isolation (Law 5)
8. Bitemporal correctness verified:
   - Employee state reconstructed as-of hire date
   - Temporal dimensions (valid_from, recorded_at) correct
9. Tenant isolation verified:
   - Different tenant cannot see the hire event (Law 5)

**Rejection Test:** `should reject hire employee intent with reason`

Tests approval rejection flow:
1. User submits hire intent (same as above)
2. Manager provides rejection reason
3. Intent status changes to REJECTED
4. Rejection reason persisted to database
5. Rejected intents removed from pending list

**Autonomy Ceiling Test:** `should auto-approve low-autonomy hire and execute immediately`

Tests compile-time autonomy constants:
1. Low-autonomy hire (intern, low salary) submitted
2. Verifies that autonomy ceiling (compile-time constant) determines approval routing
3. Hire either auto-executes (L0) or requires approval (L1+) based on ceiling
4. Demonstrates that autonomy ceiling cannot be changed at runtime (Law 9)

### Law Compliance Tests

**Law 3: Append-Only Ledger**
```typescript
test('should enforce Law 3: append-only ledger')
```
- Attempts PATCH/DELETE on ledger event (should fail)
- Database trigger blocks modifications
- Corrections must be compensating events only

**Law 5: Tenant Isolation**
```typescript
test('should enforce Law 5: tenant isolation via RLS')
```
- Creates hire event in Tenant A
- Tenant B token attempts to access Tenant A's event
- RLS policy blocks access (403 Forbidden)
- Verifies tenant isolation at database kernel level, not application

**Law 7: Decision Records**
```typescript
test('should emit Law 7: Decision Records on hire')
```
- Submits hire intent
- Verifies decision_record_id in response
- Fetches decision record from database
- Verifies record is signed and hash-chained
- Confirms regulatory evidence citations present

## Setup

### Prerequisites

- Node.js 22+
- PostgreSQL 16+
- pnpm

### Installation

```bash
# Install dependencies (from workspace root)
pnpm install

# Build web app and dependencies
pnpm run build -F web-app

# Install Chromium (one-time)
pnpm -C apps/web exec playwright install chromium
```

### Environment Setup

1. **Start PostgreSQL:**
```bash
# Create database
createdb keel_ledger

# Apply schema
psql -d keel_ledger -f services/ledger/migrations/001-create-bitemporal-ledger.sql
```

2. **Start services:**
```bash
# Terminal 1: Web app (Vite dev server on :5173)
cd apps/web
pnpm run dev

# Terminal 2: Control Gate service (on :3000)
cd services/gate
pnpm run migrate  # Initialize database
pnpm run dev
```

3. **Run tests:**
```bash
cd apps/web
pnpm run test:e2e
```

## Running Tests

### Run All Tests
```bash
pnpm run test:e2e
```

### Run Specific Test File
```bash
pnpm run test:e2e -- e2e/hire-employee.spec.ts
```

### Run Specific Test
```bash
pnpm run test:e2e -- -g "should complete hire employee flow"
```

### Headed Mode (See Browser)
```bash
pnpm run test:e2e:headed
```

### Debug Mode (Step Through)
```bash
pnpm run test:e2e:debug
```

### Generate HTML Report
```bash
pnpm run test:e2e
npx playwright show-report
```

## CI Integration

In `.github/workflows/ci.yml`, tests run automatically:

```yaml
- name: Run E2E tests
  run: |
    pnpm install
    pnpm run build -F web-app
    pnpm -C apps/web run test:e2e
```

**Test Environment Variables:**
```bash
CI=true              # Use retries and single worker
DB_HOST=localhost
DB_PORT=5432
DB_NAME=keel_ledger
```

## Test Data

Tests use mock authentication tokens with embedded tenant/actor claims:

```javascript
const token = generateMockJWT({
  tenant_id: '550e8400-e29b-41d4-a716-446655440000',
  actor_id: '550e8400-e29b-41d4-a716-446655440001',
  actor_kind: 'HUMAN',
});
```

In production: OAuth 2.1 + PKCE validation by Control Gate service.

## Mocking & Fixtures

### Authentication Flow

The `createAuthContext(page)` helper:
1. Generates mock JWT with tenant_id, actor_id, actor_kind claims
2. Stores token in localStorage (simulates OAuth callback)
3. Subsequent API calls include `Authorization: Bearer <token>` header

### API Mocking (Optional)

For fast, isolated tests without real database:
```typescript
await page.route('**/api/gate/**', route => {
  return route.abort(); // Simulate failure
  // or return route.continue(); // Pass through
});
```

## Assertions & Verification

### Bitemporal Correctness

Tests verify that employee state can be reconstructed as-of any point in time:

```javascript
// Reconstruct state on hire date
const state = await getEntityStateAt(intentId, '2026-09-01T00:00:00Z');
expect(state.first_name).toBe('John');
expect(state.salary).toBe(150000);

// State before hire date returns empty
const beforeState = await getEntityStateAt(intentId, '2026-08-31T23:59:59Z');
expect(beforeState).toBeEmpty();
```

### RLS Enforcement

Tests verify tenant isolation at database kernel:

```javascript
// Tenant A can see their event
const eventA = await fetch(/* Tenant A token */);
expect(eventA.ok).toBe(true);

// Tenant B cannot access Tenant A's event
const eventB = await fetch(/* Tenant B token */);
expect(eventB.status).toBe(403);
```

### Decision Record Integrity

Tests verify hash chaining and regulatory evidence:

```javascript
const record = await getDecisionRecord(recordId);
expect(record.record_hash).toBeTruthy();
expect(record.regulatory_evidence).toContainEqual({
  citation: 'Fair Labor Standards Act Section 7',
  rule: 'Minimum wage',
});
```

## Troubleshooting

### "Target page, context or browser has been closed"

Web server didn't start. Check:
```bash
# Verify Vite on :5173
lsof -i :5173

# Verify Control Gate on :3000
lsof -i :3000
```

### "Connection refused to database"

PostgreSQL not running:
```bash
createdb keel_ledger
psql -d keel_ledger -f services/ledger/migrations/001-create-bitemporal-ledger.sql
```

### "Unauthorized - please log in again"

Mock JWT expired or incorrect. Verify token generation:
```javascript
// Decode the token
const [header, payload, signature] = token.split('.');
console.log(JSON.parse(atob(payload)));
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:
```typescript
use: {
  navigationTimeout: 30000,  // 30 seconds
  actionTimeout: 10000,      // 10 seconds
}
```

## Continuous Testing

To watch for changes and re-run tests:
```bash
# Not directly supported by Playwright, but can use nodemon:
npx nodemon --watch e2e --ext ts --exec "pnpm run test:e2e"
```

## Performance Benchmarks

Expected test execution times (local machine):
- Single test: ~5 seconds
- Full suite: ~30 seconds
- With retries (CI): ~60 seconds

## Future Improvements

- [ ] GraphQL subscription tests (real-time approval notifications)
- [ ] Performance test (payroll run with 10k employees)
- [ ] Visual regression tests (Design System changes)
- [ ] Accessibility tests (WCAG 2.2 AA)
- [ ] Mobile tests (React Native app on iOS/Android)
- [ ] Load testing (concurrent users, high transaction volume)

## References

- **Playwright Docs:** https://playwright.dev
- **Control Gate API:** `services/gate/README.md`
- **Law Enforcement:** `CLAUDE.md` (The 10 Non-Negotiable Laws)
- **Bitemporal Ledger:** `services/ledger/migrations/001-create-bitemporal-ledger.sql`
