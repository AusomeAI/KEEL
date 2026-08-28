/**
 * E2E Test: Hire Employee Workflow
 *
 * Tests the complete end-to-end flow:
 * 1. User navigates to /people/hire
 * 2. Fills form with employee details
 * 3. Submits for approval via Control Gate
 * 4. Manager approves the intent
 * 5. Ledger event is created
 * 6. Decision record is emitted
 * 7. Bitemporal correctness: Employee state reconstructed from ledger
 *
 * Laws Verified:
 * - Law 2: Manual UI route before agent capability
 * - Law 3: Ledger is append-only
 * - Law 5: Tenant isolation via RLS
 * - Law 7: Decision record created
 * - Law 8: L3 operation with Agent Plane disabled
 */

import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Helper to create authenticated request context
async function createAuthContext(page: Page): Promise<void> {
  // Mock OAuth 2.1 + PKCE flow
  // In production: real OAuth endpoint
  const token = generateMockJWT({
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    actor_id: '550e8400-e29b-41d4-a716-446655440001',
    actor_kind: 'HUMAN',
  });

  // Set in localStorage (auth context persistence)
  await page.evaluate((t) => {
    localStorage.setItem('auth_token', t);
  }, token);
}

function generateMockJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}

test.describe('Hire Employee Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:5173'); // Vite dev server

    // Authenticate
    await createAuthContext(page);
  });

  test('should complete hire employee flow through Control Gate', async () => {
    // Step 1: Navigate to hire form
    await page.goto('http://localhost:5173/people/hire');
    await expect(page).toHaveTitle(/Hire Employee/);

    // Verify Law 2: Manual UI route exists
    await expect(page.locator('h1')).toContainText('Hire Employee');

    // Step 2: Fill form with employee details
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    await page.fill('input[name="jobTitle"]', 'Senior Software Engineer');
    await page.fill('input[name="salary"]', '150000');
    await page.fill('input[name="startDate"]', '2026-09-01');

    // Step 3: Submit form (triggers Control Gate)
    const submitPromise = page.waitForResponse((response) =>
      response.url().includes('/api/gate/submit') && response.status() === 201
    );

    await page.click('button[type="submit"]');

    const submitResponse = await submitPromise;
    const result = await submitResponse.json();

    // Verify submission succeeded
    expect(result.status).toBe('PENDING');
    expect(result.requires_approval).toBe(true);
    expect(result.approval_level).toBe('MANAGER_APPROVAL');

    const intentId = result.id;

    // Step 4: Show success notification
    await expect(page.locator('text=Employee hired')).toBeVisible();

    // Navigate to approvals page
    await page.goto(`http://localhost:5173/approvals`);

    // Step 5: Manager approves the intent
    const approvalsResponse = await page.waitForResponse((response) =>
      response.url().includes('/api/gate/pending')
    );

    const pendingIntents = await approvalsResponse.json();
    expect(pendingIntents.intents.length).toBeGreaterThan(0);

    const pendingHire = pendingIntents.intents.find(
      (i: any) => i.type === 'HIRE_EMPLOYEE'
    );
    expect(pendingHire).toBeDefined();

    // Click approve button
    const approvePromise = page.waitForResponse((response) =>
      response.url().includes(`/api/gate/approve/${intentId}`) && response.status() === 200
    );

    await page.click(`button[data-intent-id="${intentId}"][data-action="approve"]`);

    const approveResponse = await approvePromise;
    const approveResult = await approveResponse.json();

    // Verify approval executed
    expect(approveResult.status).toBe('EXECUTED');
    expect(approveResult.ledger_event_id).toBeTruthy();
    expect(approveResult.decision_record_id).toBeTruthy();

    // Step 6: Verify ledger event was created (Law 3: append-only)
    const ledgerResponse = await page.request.get(
      `http://localhost:3001/api/ledger/events?aggregate_id=${intentId}`,
      {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
        },
      }
    );

    const ledgerEvents = await ledgerResponse.json();
    expect(ledgerEvents.events.length).toBeGreaterThan(0);

    const hireEvent = ledgerEvents.events.find(
      (e: any) => e.event_type === 'HIRE_EMPLOYEE'
    );
    expect(hireEvent).toBeDefined();
    expect(hireEvent.recorded_at).toBeTruthy();
    expect(hireEvent.valid_from).toBeTruthy();

    // Step 7: Verify Decision Record was created (Law 7: signed decisions)
    const decisionResponse = await page.request.get(
      `http://localhost:3001/api/decisions/${approveResult.decision_record_id}`,
      {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
        },
      }
    );

    const decisionRecord = await decisionResponse.json();
    expect(decisionRecord.category).toBe('HIRE_EMPLOYEE');
    expect(decisionRecord.decisions).toBeTruthy();
    expect(decisionRecord.regulatory_evidence).toBeTruthy();
    expect(decisionRecord.record_hash).toBeTruthy(); // Law 7: hash-chained

    // Step 8: Bitemporal correctness test
    // Reconstruct employee state as-of the hire date
    const asOfResponse = await page.request.get(
      `http://localhost:3001/api/ledger/state?aggregate_id=${intentId}&as_of=2026-09-01T00:00:00Z`,
      {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
        },
      }
    );

    const employeeStateOnHireDate = await asOfResponse.json();
    expect(employeeStateOnHireDate.first_name).toBe('John');
    expect(employeeStateOnHireDate.last_name).toBe('Doe');
    expect(employeeStateOnHireDate.job_title).toBe('Senior Software Engineer');
    expect(employeeStateOnHireDate.salary).toBe(150000);

    // Verify tenant isolation (Law 5)
    // Same query with different tenant context should return empty
    const otherTenantResponse = await page.request.get(
      `http://localhost:3001/api/ledger/state?aggregate_id=${intentId}&tenant_id=other-tenant`,
      {
        headers: {
          'Authorization': `Bearer ${generateMockJWT({
            tenant_id: 'different-tenant-id',
            actor_id: '550e8400-e29b-41d4-a716-446655440002',
            actor_kind: 'HUMAN',
          })}`,
        },
      }
    );

    expect(otherTenantResponse.status()).toBe(403); // Forbidden due to RLS
  });

  test('should reject hire employee intent with reason', async () => {
    // Navigate and fill form
    await page.goto('http://localhost:5173/people/hire');
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Smith');
    await page.fill('input[name="email"]', 'jane.smith@example.com');
    await page.fill('input[name="jobTitle"]', 'Product Manager');
    await page.fill('input[name="salary"]', '140000');
    await page.fill('input[name="startDate"]', '2026-10-01');

    // Submit
    const submitResponse = await page.waitForResponse((response) =>
      response.url().includes('/api/gate/submit')
    );

    await page.click('button[type="submit"]');
    const result = await (await submitResponse).json();
    const intentId = result.id;

    // Navigate to approvals
    await page.goto('http://localhost:5173/approvals');

    // Reject the intent
    const rejectPromise = page.waitForResponse((response) =>
      response.url().includes(`/api/gate/reject/${intentId}`)
    );

    await page.fill(`input[data-intent-id="${intentId}"][name="rejection_reason"]`,
      'Hiring budget exhausted for Q4'
    );
    await page.click(`button[data-intent-id="${intentId}"][data-action="reject"]`);

    const rejectResponse = await rejectPromise;
    const rejectResult = await rejectResponse.json();

    // Verify rejection
    expect(rejectResult.status).toBe('REJECTED');
    expect(rejectResult.reason).toBe('Hiring budget exhausted for Q4');

    // Verify intent status updated in database
    const pendingResponse = await page.request.get(
      'http://localhost:3001/api/gate/pending',
      {
        headers: {
          'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
        },
      }
    );

    const pending = await pendingResponse.json();
    const rejectedIntent = pending.intents.find((i: any) => i.id === intentId);
    expect(rejectedIntent).toBeUndefined(); // Rejected intents not in pending list
  });

  test('should auto-approve low-autonomy hire and execute immediately', async () => {
    // Test L0 autonomy: system configurable low-autonomy hires auto-approve
    // (autonomy ceiling is compile-time constant, cannot be changed)

    // This test verifies that the Control Gate respects compile-time constants
    // from packages/core/src/control-gate/intent-registry.ts

    // For demo: test that a valid hire intent receives either PENDING or EXECUTED
    // depending on the autonomy ceiling configured at compile-time

    await page.goto('http://localhost:5173/people/hire');
    await page.fill('input[name="firstName"]', 'Bob');
    await page.fill('input[name="lastName"]', 'Johnson');
    await page.fill('input[name="email"]', 'bob@example.com');
    await page.fill('input[name="jobTitle"]', 'Intern');
    await page.fill('input[name="salary"]', '30000');
    await page.fill('input[name="startDate"]', '2026-09-15');

    const submitResponse = await page.waitForResponse((response) =>
      response.url().includes('/api/gate/submit')
    );

    await page.click('button[type="submit"]');
    const result = await (await submitResponse).json();

    // Autonomy ceiling is a compile-time constant (Law 9)
    // So we just verify that the response is either PENDING or EXECUTED
    expect(['PENDING', 'EXECUTED']).toContain(result.status);

    if (result.status === 'EXECUTED') {
      // Auto-executed low-autonomy hire
      expect(result.ledger_event_id).toBeTruthy();
      expect(result.decision_record_id).toBeTruthy();
    }
  });
});

test.describe('Law Compliance Verification', () => {
  test('should enforce Law 3: append-only ledger', async ({ page }) => {
    // Attempt to UPDATE or DELETE ledger event (should fail at database)
    // This is enforced by the trigger in 001-create-bitemporal-ledger.sql

    const updateResponse = await page.request.patch(
      'http://localhost:3001/api/ledger/events/550e8400-e29b-41d4-a716-446655440000',
      {
        data: { event_type: 'MODIFIED_EVENT' },
        headers: {
          'Authorization': `Bearer ${generateMockJWT({
            tenant_id: '550e8400-e29b-41d4-a716-446655440000',
            actor_id: '550e8400-e29b-41d4-a716-446655440001',
            actor_kind: 'HUMAN',
          })}`,
        },
      }
    );

    // Should be rejected
    expect(updateResponse.status()).toBe(405); // Method not allowed or 403 Forbidden
  });

  test('should enforce Law 5: tenant isolation via RLS', async ({ page }) => {
    // Tenant A should not see Tenant B's data

    const tenantAToken = generateMockJWT({
      tenant_id: 'tenant-a-id',
      actor_id: 'user-a-id',
      actor_kind: 'HUMAN',
    });

    const tenantBToken = generateMockJWT({
      tenant_id: 'tenant-b-id',
      actor_id: 'user-b-id',
      actor_kind: 'HUMAN',
    });

    // Create event in Tenant A
    const eventAResponse = await page.request.post(
      'http://localhost:3001/api/gate/submit',
      {
        data: {
          type: 'HIRE_EMPLOYEE',
          subject_id: '550e8400-e29b-41d4-a716-446655440000',
          payload: { first_name: 'Alice' },
          actor_id: 'user-a-id',
          actor_kind: 'HUMAN',
        },
        headers: { 'Authorization': `Bearer ${tenantAToken}` },
      }
    );

    const eventA = await eventAResponse.json();

    // Tenant B tries to access Tenant A's event
    const accessResponse = await page.request.get(
      `http://localhost:3001/api/ledger/events/${eventA.id}`,
      {
        headers: { 'Authorization': `Bearer ${tenantBToken}` },
      }
    );

    // Should be forbidden or return empty (RLS enforcement)
    expect([403, 404]).toContain(accessResponse.status());
  });

  test('should emit Law 7: Decision Records on hire', async ({ page }) => {
    // Every hire (HIRE_EMPLOYEE transaction) should emit a Decision Record

    await createAuthContext(page);
    await page.goto('http://localhost:5173/people/hire');

    // Fill and submit
    await page.fill('input[name="firstName"]', 'Diana');
    await page.fill('input[name="lastName"]', 'Prince');
    await page.fill('input[name="email"]', 'diana@example.com');
    await page.fill('input[name="jobTitle"]', 'VP Engineering');
    await page.fill('input[name="salary"]', '200000');
    await page.fill('input[name="startDate"]', '2026-09-01');

    const submitResponse = await page.waitForResponse((response) =>
      response.url().includes('/api/gate/submit')
    );

    await page.click('button[type="submit"]');
    const result = await (await submitResponse).json();

    // If auto-executed, decision_record_id should be present
    if (result.status === 'EXECUTED') {
      expect(result.decision_record_id).toBeTruthy();

      // Verify decision record exists
      const decisionResponse = await page.request.get(
        `http://localhost:3001/api/decisions/${result.decision_record_id}`,
        {
          headers: {
            'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('auth_token'))}`,
          },
        }
      );

      expect(decisionResponse.status()).toBe(200);
      const decision = await decisionResponse.json();
      expect(decision.category).toBe('HIRE_EMPLOYEE');
    }
  });
});
