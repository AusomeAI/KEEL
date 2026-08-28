# KEEL Wave 3 — First Module Implementation
**Status:** Planning Phase  
**Scope:** Hire Employee end-to-end with complete infrastructure  
**Timeline:** Week 3-4  

---

## Objective

Complete the **HIRE_EMPLOYEE** workflow from form submission through ledger persistence, decision record emission, and law compliance verification. This is the first "golden path" module that validates the entire architecture.

---

## Wave 3 Deliverables (Priority Order)

### 3.1: OAuth 2.1 + PKCE Implementation *(Week 3, Day 1-2)*

**Scope:** Real token validation in Control Gate

**Files to Create:**
- `services/gate/src/auth/oauth.ts` — OAuth 2.1 + PKCE flows
- `services/gate/src/auth/token-validator.ts` — JWT signature verification
- `apps/web/src/auth/oauth-flow.ts` — PKCE authorization code flow
- `apps/web/src/auth/token-refresh.ts` — Token refresh on 401

**Requirements:**
- RS256 signature validation (public key from JWKS)
- Token expiration check
- Scope validation (tenant_id, actor_id, actor_kind)
- Refresh token rotation
- Scoped token generation for agents (Law 10)

**Tests:**
- Valid token accepted
- Expired token rejected
- Invalid signature rejected
- Scope mismatch rejected
- Refresh flow working

---

### 3.2: Form Implementations *(Week 3, Day 2-3)*

**Scope:** Complete all 13 TransactionIntent forms (Law 2)

**Files to Update:**
1. **Entitlements:**
   - `apps/web/src/pages/intents/TerminateEmployeePage.tsx` — Full form
   - `apps/web/src/pages/intents/ChangeJobPage.tsx` — Full form
   - `apps/web/src/pages/intents/ChangePayPage.tsx` — Full form

2. **Time & Attendance:**
   - `apps/web/src/pages/time/TimeTrackerPage.tsx` — Timesheet entry
   - `apps/web/src/pages/time/LeaveRequestPage.tsx` — Leave request
   - `apps/web/src/pages/time/LeaveApprovalsPage.tsx` — Leave approval

3. **Payroll:**
   - `apps/web/src/pages/payroll/PayrollRunPage.tsx` — Payroll cycle
   - `apps/web/src/pages/payroll/PayrollApprovalsPage.tsx` — Payroll approval

4. **Generic:**
   - `apps/web/src/pages/approvals/ApprovalDetailPage.tsx` — Approval review
   - `apps/web/src/pages/people/EmployeeDetailPage.tsx` — Employee view

**Each Form Includes:**
- Field validation
- Control Gate submission
- Success/error notifications
- Pending approval status display

---

### 3.3: Hire Employee End-to-End *(Week 3-4)*

**Scope:** Complete workflow from form to ledger verification

**Flow:**
1. User fills HireEmployeePage form
2. Form validates (name, email, salary, start date)
3. Submits HIRE_EMPLOYEE intent to Control Gate
4. Control Gate executes 9-step pipeline:
   - Authenticate actor (OAuth token)
   - Authorize tenancy scope
   - Check autonomy ceiling
   - Validate policy (hire eligibility rules)
   - Simulate effect (salary, benefits)
   - Route for approval (if required)
   - Execute ledger transaction
   - Emit decision record
5. Ledger event created with bitemporal dimensions
6. Decision record hash-chained
7. Approval page shows pending hire
8. Manager reviews and approves
9. Status updates to EXECUTED
10. Ledger entry verified

**Files:**
- `apps/web/src/pages/intents/HireEmployeePage.tsx` — Already started, complete form
- `services/gate/src/routes/gate.ts` — Already implemented, verify integration
- `apps/web/e2e/hire-employee.spec.ts` — Already written, ensure tests pass

---

### 3.4: Policy Validation for Hiring *(Week 3-4)*

**Scope:** Implement hire eligibility rules

**Policy Rules:**
- Salary minimum/maximum validation
- Position availability check
- Entity budget validation
- Hiring freeze compliance
- Equal employment opportunity rules

**Files to Create:**
- `packages/policy/src/policies/hire-employee-policy.ts` — Policy DSL compilation
- `packages/policy/src/rules/hiring-rules.ts` — Rule implementations

**Integration:**
- Control Gate validates against policy on submit
- Policy execution engine computes projections
- Simulation result attached to TransactionIntent

---

### 3.5: Payroll Integration Preview *(Week 4)*

**Scope:** Wire payroll engine to ledger

**Minimal Implementation:**
- Create PayrollRunPage form
- Submit PAYROLL_RUN intent
- Execute policy engine on all hired employees
- Store payroll result in ledger

**Does NOT Include:**
- Tax calculation refinement (Wave 4)
- Deduction rules (Wave 4)
- GL posting (Wave 4)
- Employee pay slip generation (Wave 4)

---

### 3.6: Decision Records & Audit *(Week 4)*

**Scope:** Verify Law 7 compliance

**Files to Create:**
- `services/gate/src/ledger/decision-record-signer.ts` — Hash computation & signing
- `apps/web/src/pages/decisions/DecisionDetailPage.tsx` — View decision record

**Features:**
- SHA-256 hash of decision record
- Hash chain verification (previous_record_id)
- Regulatory evidence citations
- Audit trail display

---

## Wave 3 Dependencies

✅ **Already Satisfied by Wave 2:**
- Control Gate pipeline (9-step implementation)
- Ledger schema (append-only, RLS)
- Web app router (all 13 routes)
- API client (typed endpoints)
- E2E test harness (Playwright)
- Database microservice (services/gate)

⏳ **Required Before Wave 3 Starts:**
- GitHub authorization (to push Wave 2 commits)
- Database initialization script
- Local development environment (Node 22, PostgreSQL 16)

---

## Success Criteria

- [x] All 13 forms implemented and styled
- [ ] OAuth 2.1 + PKCE token validation working
- [ ] Hire Employee form → Control Gate → Ledger → Verification
- [ ] E2E test suite passes (Playwright)
- [ ] Decision records created and hash-chained
- [ ] Tenant isolation verified in all flows
- [ ] Payroll engine wired to ledger
- [ ] Complete audit trail viewable in UI

---

## Wave 3 Statistics (Projected)

- **TypeScript:** 2,000+ lines (forms, OAuth, policy, E2E)
- **Policy DSL:** 500+ lines (hiring rules)
- **E2E Tests:** 20+ test cases
- **Documentation:** 500+ lines (guides, ADRs)

---

## Integration with Wave 2

Wave 3 **does not modify** any Wave 2 code. It:
- Uses Control Gate API as-is
- Consumes ledger schema as-is
- Extends web app routes (already defined)
- Adds policy implementations
- Expands E2E test coverage

---

## Next: Wave 4 Preview

**Wave 4 — Additional Modules** (Weeks 5-8)

- Leave management (request, approval, accrual)
- Time tracking (timesheet, attendance)
- Payroll enhancements (tax rules, deductions, GL)
- Reporting (audit trail, decision records)
- Agent Plane integration (shadow mode)

Each module follows the same pattern:
1. Manual UI route ✅
2. Form implementation ✅
3. Policy validation ✅
4. Ledger integration ✅
5. E2E verification ✅
6. Agent capability (shadow mode)

---

**Wave 3 Start:** Immediate (upon user approval)  
**Wave 3 Exit Criterion:** Hire Employee workflow end-to-end verified by E2E tests  
**Confidence:** 🟢 High (architecture proven, only form/rule implementation remains)
