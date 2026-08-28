# Wave 5: Advanced Features & Agent Plane Production

**Date:** 2026-08-28  
**Status:** 🟢 **PLANNING PHASE**  
**User Approval:** Approved for planning and implementation  
**Entry Criterion:** Wave 4.1 (Leave Management) complete ✅  
**Exit Criterion:** All 4 sub-waves complete with 100% Law compliance

---

## Executive Summary

Wave 5 completes the KEEL HR Operating System by implementing four critical sub-waves:

1. **Wave 4.2: Time Tracking** — Timesheet entry, attendance tracking, FLSA compliance
2. **Wave 4.3: Payroll Enhancements** — Full tax engine, deductions, GL posting, pay slips
3. **Wave 4.4: Reporting & Analytics** — Compliance dashboards, audit queries, attestations
4. **Wave 5: Agent Plane Production** — Move agents from shadow mode to active decisioning

**Total Estimated Code:** 8,000+ lines  
**Total Estimated Tests:** 200+ E2E test cases  
**Total Estimated Commits:** 24-28 commits  
**Timeline:** 2 weeks (intensive, parallel sub-teams)

---

## Wave 4.2: Time Tracking Implementation

### Objective
Complete timesheet entry, attendance tracking, and FLSA (Fair Labor Standards Act) compliance.

### Key Components

#### 1. Time Tracking Policy Framework
**File:** `packages/policy/src/policies/time-tracking-policy.ts` (450 lines)

**Policy Rules:**
- **TimeEntryRule:** Input (employee_id, date, start_time, end_time, break_minutes) → Output (hours_worked, overtime_flag)
- **OvertimeAccrualRule:** Input (hours_worked, base_hours, week_date) → Output (overtime_hours, rate_multiplier)
- **AttendanceValidationRule:** Input (scheduled_hours, actual_hours, policy_tolerance) → Output (on_time_flag, variance)
- **BreakComplianceRule:** Input (hours_worked, jurisdiction) → Output (compliant, required_breaks)

**Accrual Logic:**
- Regular hours: 0-40/week at standard rate (1.0x)
- Overtime: 40+ hours/week at 1.5x rate
- Double-time: Sunday hours or 8+ consecutive days (varies by state)
- Breaks: Mandatory 15-min break per 4 hours, 30-min meal break per 6 hours

**Golden Dataset:** 10 test cases covering:
- Standard 40-hour week (no overtime)
- 50-hour week with 10 hours overtime
- Weekend work with double-time
- Consecutive day tracking
- Break compliance validation
- Jurisdiction-specific rules (CA vs. TX vs. FL)

#### 2. Timesheet Entry Forms
**Files:** 
- `apps/web/src/pages/time/TimesheetEntryPage.tsx` (300 lines)
- `apps/web/src/pages/time/AttendanceCalendarPage.tsx` (280 lines)

**TimesheetEntryPage:**
- Weekly timesheet grid (Mon-Sun)
- Daily entry: start time, end time, break duration
- Real-time overtime calculation
- Lunch/break notation
- Work type selector (regular, special project, PTO use)
- Approval status indicator
- Notes field for exceptions

**AttendanceCalendarPage:**
- Monthly calendar view
- Color-coded: on-time (green), late (yellow), absent (red), PTO (blue)
- Attendance summary: present, absent, PTO, sick, late
- Tardiness tracking with auto-notifications
- Integration with leave management (auto-exclude PTO days)

#### 3. Control Gate Integration
**File:** `services/gate/src/routes/time-tracking.ts` (220 lines)

**New Endpoints:**
- `POST /api/gate/timesheet/submit` — Submit weekly timesheet
- `GET /api/gate/timesheet/:employeeId` — Retrieve timesheet (current week + history)
- `GET /api/gate/timesheet/:employeeId/overtime` — Overtime accrual summary
- `GET /api/gate/attendance/:employeeId` — Attendance record (monthly)

**Validation:**
- Time entries within business hours (configurable per entity)
- No overlap between entries
- Break compliance per jurisdiction
- Overtime calculation accuracy

#### 4. Timesheet Handler & API
**File:** `services/gate/src/handlers/timesheet-handler.ts` (250 lines)

**Functions:**
- `validateTimesheet(entries, policyRules)` — Check compliance
- `calculateOvertimeAccrual(hours, week, jurisdiction)` — Overtime computation
- `detectAttendanceAnomaly(scheduled, actual)` — Flag unusual patterns
- `generateAttendanceReport(employeeId, month)` — Compliance summary

**File:** `apps/web/src/api/client.ts` (4 new methods)
- `submitTimesheet(employeeId, entries)`
- `getTimesheet(employeeId, weekOf)`
- `getOvertimeAccrual(employeeId, period)`
- `getAttendanceRecord(employeeId, month)`

#### 5. E2E Tests
**File:** `apps/web/e2e/time-tracking.spec.ts` (350 lines)

**Test Coverage (60+ cases):**
- Standard 40-hour week calculation
- Overtime accrual (40-50 hours)
- Double-time scenarios
- Break compliance validation
- Attendance pattern detection
- Jurisdiction-specific rules (CA/TX/FL/NY)
- RLS enforcement (can't view other tenant's timesheets)
- L3 verification (no Agent Plane required)
- Golden dataset coverage

---

## Wave 4.3: Payroll Enhancements

### Objective
Implement complete tax engine, deductions framework, GL posting, and employee pay slip generation.

### Key Components

#### 1. Tax Policy Engine
**File:** `packages/policy/src/policies/tax-policy.ts` (800 lines)

**Tax Rules Implemented:**
- **FederalIncomeWithholding:** Input (gross_pay, filing_status, allowances, period) → Output (fed_tax)
  - Uses IRS tax tables 2026
  - Supports FEDRLO (request more allowances)
  - Handles supplemental income (bonus)
  
- **SocialSecurityTax:** Input (gross_pay, ytd_earnings) → Output (ss_tax, is_maxed)
  - 6.2% rate up to $168,600 annual (2026)
  - Stops accrual at annual max
  
- **MedicareTax:** Input (gross_pay, ytd_earnings) → Output (medicare_tax)
  - 1.45% on all earnings
  - Additional 0.9% on earnings >$200k single (triggers at higher threshold)
  
- **StateIncomeWithholding:** Input (gross, state, filing_status) → Output (state_tax)
  - CA/TX/FL/NY/IL/OH/PA/GA/NC implemented
  - Each state has its own withholding tables
  
- **LocalIncomeWithholding:** Input (gross, locality) → Output (local_tax)
  - NYC, Philadelphia, Columbus, DC implemented

**Golden Dataset:** 15 test cases covering:
- Single employee, standard withholding
- Married filing jointly, multiple allowances
- Supplemental pay (bonus) tax calculation
- Year-to-date max tracking (SS tax)
- State/local variations
- Statutory citations for each rule

#### 2. Deductions Framework
**File:** `packages/policy/src/policies/deductions-policy.ts` (600 lines)

**Deduction Types:**
- **HealthInsurancePremium:** Pre-tax, bi-weekly from payroll
- **401kContribution:** Pre-tax, % of gross (up to $23,500 annual limit 2026)
- **DependentCareAccount:** Pre-tax FSA (up to $5,200/year)
- **HSAContribution:** Health Savings Account (pre-tax, family plan)
- **ChildSupport:** Court-ordered deduction (post-tax)
- **StudentLoanRepayment:** Optional post-tax
- **UnionDues:** Post-tax, varies by union

**Gross Calculation:**
1. Start with hourly rate × hours worked + bonuses
2. Subtract pre-tax deductions (401k, FSA, HSA, health insurance)
3. Calculate federal/state/local taxes on remaining
4. Apply post-tax deductions
5. Result = net pay

**Golden Dataset:** 10 test cases covering:
- Health insurance + 401k
- Married employee with dependent care
- Union member with dues
- Student loan repayment
- Annual max enforcement
- Bi-weekly vs. semi-monthly vs. monthly pay cycles

#### 3. Payroll Run Orchestration
**File:** `services/payroll-run/src/payroll-runner.ts` (500 lines)

**Payroll Workflow:**
1. Manager initiates PayrollRunPage form
2. Submit PAYROLL_RUN intent to Control Gate
3. Control Gate executes:
   - Validate timesheet data (all employees have time entries)
   - Validate leave taken (against approved leave requests)
   - Fetch current salary/deduction rules
   - For each employee:
     * Calculate gross (hourly × hours + bonuses)
     * Calculate taxes (federal, state, local)
     * Calculate deductions (pre-tax, post-tax)
     * Calculate net (gross - taxes - deductions)
     * Validate against policy rules
     * Create ledger event (PAYROLL_ENTRY)
   - Sum totals (total gross, total tax, total net)
   - Create PAYROLL_RUN event in ledger
   - Generate pay slips (PDF, email)
   - Trigger GL posting (via Finance service)
4. Payroll appears in employee pay history
5. Audit trail created (Decision Records)

**GL Integration:**
- Create chart of accounts entries:
  - Debit: Payroll Expense (cost center)
  - Credit: Cash (bank account)
  - Separate entries for taxes payable, benefits payable
- Reconciliation support (payroll vs. GL)

#### 4. Pay Slip Generation
**File:** `services/payroll-run/src/payslip-generator.ts` (350 lines)

**Pay Slip Contents:**
- Employee name, ID, pay period
- Earnings section:
  - Regular hours × rate = regular pay
  - Overtime hours × 1.5 rate = overtime pay
  - Bonuses (if any)
  - Total gross
- Deductions section:
  - Federal income tax
  - Social Security tax
  - Medicare tax
  - State tax (if applicable)
  - Local tax (if applicable)
  - Health insurance premium
  - 401k contribution
  - Other deductions
  - Total deductions
- Net pay calculation
- YTD summary (gross, taxes, net)
- Bank deposit info

#### 5. Payroll Management UI
**File:** `apps/web/src/pages/payroll/PayrollRunPage.tsx` (350 lines)

**Payroll Run Form:**
- Pay period selection (weekly, bi-weekly, semi-monthly, monthly)
- Employee roster with status (ready, timesheet missing, leave conflict)
- Run summary: total gross, total taxes, total net
- Preview before commit
- Approval required (Finance/Controller role)
- Submit to Control Gate
- Success notification with payroll ID

**File:** `apps/web/src/pages/payroll/PayrollHistoryPage.tsx` (280 lines)

**Payroll History:**
- List of past payroll runs
- Pay period, run date, total paid
- Employee count, gross total
- GL posting status (draft, posted, reconciled)
- Download pay slips (as ZIP of PDFs)
- Drill-down to individual employee pay slip

#### 6. E2E Tests
**File:** `apps/web/e2e/payroll.spec.ts` (400 lines)

**Test Coverage (80+ cases):**
- Single employee payroll (hourly)
- Multiple employees with various rates
- Overtime inclusion
- Deductions (401k, health insurance, FSA)
- Tax calculations (federal, state, local)
- Annual max enforcement (401k, FSA)
- Bonus handling
- GL posting verification
- Pay slip generation
- Retroactive payroll (correction scenario)
- RLS enforcement (can't view other tenant's payroll)
- L3 verification (deterministic, zero AI)
- Law compliance (Laws 3, 4, 5, 6, 7)

---

## Wave 4.4: Reporting & Analytics

### Objective
Provide compliance dashboards, audit trail queries, and attestation reports for regulatory evidence.

### Key Components

#### 1. Compliance Dashboard
**File:** `apps/web/src/pages/reporting/ComplianceDashboard.tsx` (450 lines)

**Metrics Displayed:**
- **HR Compliance:**
  - Headcount (current, vs. budget)
  - Open requisitions
  - Time-to-hire (days)
  - Offers pending, accepted, declined
  
- **Payroll Compliance:**
  - Payroll runs completed (on-time %)
  - Tax deposits made (quarterly)
  - Pay slip delivery rate (email sent %)
  - Overpayment corrections (count)
  
- **Leave Compliance:**
  - Leave requests submitted (current year)
  - Approval rate (% auto vs. manager approved)
  - Leave balance accuracy (vs. policy)
  - Blackout date blocking (% applied)
  
- **Audit Trail:**
  - Decision records created (count)
  - Verification status (verified, pending, failed)
  - Missing documentation (count)

**Drill-down Views:**
- Click any metric → detailed report
- Filter by date range, department, entity
- Export to CSV/Excel

#### 2. Audit Trail Query Interface
**File:** `apps/web/src/pages/reporting/AuditTrailPage.tsx` (380 lines)

**Query Capabilities:**
- Search by:
  - Employee name, ID
  - Action type (HIRE, TERMINATE, CHANGE_JOB, CHANGE_PAY, LEAVE_REQUEST, PAYROLL_RUN)
  - Date range
  - Actor (who initiated)
  - Status (pending, approved, rejected, executed)
  - Audit status (verified, unverified, failed)

**Result Display:**
- Decision record ID
- Action taken
- Employee affected
- Change details (before → after)
- Actor and timestamp
- Approval chain (who reviewed, when)
- Verification status
- Hash chain validation (Law 7)

**Features:**
- Export results as CSV
- Generate compliance report (PDF)
- Permalink to specific decision record
- Annotations/case notes capability

#### 3. Decision Record Verification Engine
**File:** `services/reporting/src/decision-record-verifier.ts` (300 lines)

**Verification Process:**
1. Fetch decision record from ledger
2. Verify hash chain:
   - Previous record hash matches
   - Current record hash is correct (re-compute)
   - No tampering detected
3. Verify signatures:
   - Actor token valid
   - Approver signature valid (if required)
4. Verify data integrity:
   - All required fields present
   - Policy evaluation matches recorded result
   - Ledger event exists for execution
5. Report: ✅ Verified | ⚠️ Unverified | ❌ Failed

**Verification Results Cached** (for performance, re-verified on audit)

#### 4. Compliance Attestation Report
**File:** `services/reporting/src/attestation-generator.ts` (250 lines)

**Report Contents:**
- **Executive Summary:**
  - Reporting period (month/quarter/year)
  - Company, prepared by, date
  - Overall compliance status
  
- **Hiring Attestation:**
  - Employees hired (count, dates)
  - Offer process compliance (all offers have decision records)
  - EEO attestation (no discrimination flagged)
  
- **Payroll Attestation:**
  - Payroll cycles run (count, dates)
  - All employees paid on time
  - Tax deposits made (evidence)
  - Overtime rules enforced (sample verification)
  
- **Leave Attestation:**
  - Leave requests processed (count, approval rates)
  - Leave balances accurate (policy compliance)
  - Blackout dates enforced
  
- **Audit Trail Attestation:**
  - All decisions recorded
  - Hash chain verified
  - No missing records
  - Retention policy met

**Output:** PDF report with:
- Generated timestamp
- Audit verification checkmark
- Statutory citations
- Exception list (any failures)
- Signature line (for CFO/CHRO)

#### 5. Historical State Reconstruction
**File:** `services/reporting/src/state-reconstructor.ts` (280 lines)

**Capability:**
- Specify date and employee → get that employee's state as of that date
- Uses bitemporal ledger (valid_time dimension)
- Recomputes all derived values (leave balance, salary, etc.)
- Returns:
  - Personal info
  - Current role/salary
  - Leave balances (with accrual detail)
  - Allowances/deductions
  - Decision record trail leading to current state

**Use Case:**
- "What was John's leave balance on June 15?" (even if today is August 28)
- Audit support: reconstruct state at time of dispute
- Retroactive correction verification

#### 6. E2E Tests
**File:** `apps/web/e2e/reporting.spec.ts` (300 lines)

**Test Coverage (50+ cases):**
- Dashboard metrics calculation
- Audit trail query (single/multiple results)
- Date range filtering
- Decision record verification (valid/invalid scenarios)
- Attestation report generation
- Historical state reconstruction
- Export functionality (CSV)
- PDF generation
- RLS enforcement (can't access other tenant's reports)
- L3 verification (no Agent Plane needed)

---

## Wave 5: Agent Plane Production Implementation

### Objective
Transition agents from shadow mode (observation-only) to active decisioning with full budgeting, autonomy control, and audit integration.

### Key Components

#### 1. Agent Architecture Framework
**File:** `services/agent-plane/src/agent-framework.ts` (500 lines)

**Agent Types:**
- **HiringAgent** — Candidate screening, offer recommendation
- **CompensationAgent** — Salary benchmarking, equity grants
- **TimeTrackingAgent** — Time entry correction suggestions, anomaly detection
- **PayrollAgent** — Payroll review, tax accuracy verification
- **LeaveAgent** — Leave request auto-approval (within policy)
- **ComplianceAgent** — Audit flag detection, documentation recommendations

**Agent Interface:**
```typescript
interface Agent {
  id: string;                          // e.g., "hiring-agent-001"
  name: string;
  domain: string;                      // hiring|compensation|time|payroll|leave|compliance
  autonomyLevel: "L0"|"L1"|"L2";       // See autonomy ladder
  budget: {
    dailySpend: Money;                 // Max decision value per day
    monthlySpend: Money;               // Max decision value per month
    currentSpend: Money;               // Tracked in real-time
  };
  policies: PolicyRule[];              // Agent-specific rules
  evaluationMode: "shadow"|"active";   // shadow = observe only, active = decide
  scopes: string[];                    // Tenant IDs this agent can access
}
```

**Autonomy Ladder (replacing simple L0-L3):**
- **L0: Autonomous** — Agent decides alone (leave auto-approval, time entry correction)
- **L1: Supervised** — Agent proposes, human must approve (offer, termination)
- **L2: Assisted** — Agent suggests in UI, human makes decision (compensation benchmarking)
- **L3: Deterministic** — No agents present

#### 2. Agent Budget & Rate Limiting
**File:** `services/agent-plane/src/budget-manager.ts` (350 lines)

**Budget Tracking:**
- Per-agent daily and monthly spend limits (in dollars/EUR/etc.)
- Real-time deduction when agent makes decision
- Prevents budget overrun (agent decision rejected if insufficient budget)
- Alerts when budget usage >80%
- Daily/monthly reset (configurable)

**Rate Limiting:**
- Max decisions per hour (e.g., 10 hire decisions/hour)
- Max decisions per day (e.g., 50 hire decisions/day)
- Prevents spam/misconfiguration from flooding system
- Backpressure: queue if rate exceeded, process in FIFO order

**Audit:**
- All budget deductions logged
- Budget audit trail shows every decision's cost
- Monthly spend report for finance

#### 3. Agent Decision Routing
**File:** `services/agent-plane/src/agent-router.ts` (400 lines)

**Routing Logic:**
1. Receipt of TransactionIntent (e.g., from timekeeping app)
2. Check autonomy level:
   - **L3 (deterministic-only):** Route to Control Gate, no agent consideration
   - **L2 (assisted):** Offer agent suggestions in UI, human decides via Control Gate
   - **L1 (supervised):** Agent proposes via special "AGENT_PROPOSES_XYZ" intent, human reviews
   - **L0 (autonomous):** Agent decides, submits intent to Control Gate as "HUMAN" actor with "onBehalfOf" field
3. Check budget:
   - If insufficient, reject or queue
4. Get agent decision (via MCP call or local invocation)
5. Wrap in TransactionIntent with agent metadata
6. Submit to Control Gate (Control Gate enforces autonomy ceiling via policy)
7. Ledger event captures agent_id and autonomy_level_at_execution

**Key:** Agents never bypass Control Gate. Every agent decision flows through the same 9-step pipeline.

#### 4. Agent Evaluation Harness
**File:** `services/agent-plane/src/evaluation-harness.ts` (450 lines)

**Capability:**
- Run agent against golden dataset
- Compare agent output vs. expected output
- Calculate accuracy, precision, recall
- Track error types (false positive, false negative, wrong recommendation)
- Generate evaluation report

**Usage:**
```typescript
const evaluation = await harness.evaluate({
  agent: hiringAgent,
  testDataset: goldenDataset,  // 50 hiring scenarios
  outputFormat: "hiring_decision",
});
// Result: { accuracy: 0.96, precision: 0.94, recall: 0.98, errors: [...] }
```

**Dashboard Display:**
- Per-agent accuracy metrics
- Error breakdown
- Drift detection (accuracy changing over time)
- A/B test comparison (new model vs. production)

#### 5. MCP Server for Agent Orchestration
**File:** `services/agent-plane/src/mcp-server.ts` (300 lines)

**MCP Resources:**
- `agent://hiring/screen-candidate` — Evaluate resume, interview notes
- `agent://compensation/benchmark-salary` — Market rate lookup
- `agent://payroll/verify-tax` — Tax calculation verification
- `agent://leave/check-balance` — Real-time leave balance
- `agent://compliance/flag-risk` — Audit risk detection

**MCP Tools:**
- `agent/decide` — Agent makes decision (with budget check)
- `agent/propose` — Agent proposes (for human review)
- `agent/evaluate` — Test agent against dataset
- `agent/budget/check` — Query agent remaining budget

**Integration with Claude/external LLMs:**
- External Claude instances can call these MCP tools
- Decisions are proxied through Control Gate
- All autonomy/budget/audit rules enforced server-side

#### 6. Agent Observability & Audit
**File:** `services/agent-plane/src/agent-audit-logger.ts` (250 lines)

**Captured Per Decision:**
- Agent ID
- Domain (hiring, payroll, etc.)
- Decision type and output
- Reasoning (if LLM-based)
- Confidence score
- Budget deducted
- Timestamp
- Result (accepted, rejected, appealed)
- Eventual outcome (hire confirmed, decision overridden, etc.)

**Audit Dashboard Columns:**
- Agent Name
- Timestamp
- Decision Type
- Accuracy (if known)
- Budget Used
- Status
- Appeal/Correction

**Compliance Evidence:**
- Agent decisions exportable for regulatory review
- Drift alerts (if accuracy dropping)
- Bias detection (if hiring agent favors certain demographics)

#### 7. Agent Governance UI
**File:** `apps/web/src/pages/admin/AgentGovernancePanel.tsx` (350 lines)

**Admin Functions:**
- List all agents with status (active, shadow, disabled)
- View/edit autonomy level per agent
- Set daily/monthly budget limits
- View budget consumption (live chart)
- Toggle evaluation mode (shadow ↔ active)
- View agent decisions (with drill-down)
- Appeal/override specific decisions
- View accuracy metrics and error trends

**Audit Trail:**
- Who adjusted agent settings (when, what changed)
- Why agent was disabled/limited (if applicable)
- Appeal justifications

#### 8. E2E Tests
**File:** `apps/web/e2e/agent-plane.spec.ts` (500 lines)

**Test Coverage (100+ cases):**
- Agent decision routing (L0 autonomous)
- Budget enforcement (daily limit)
- Rate limiting (max decisions/hour)
- Agent proposal workflow (L1 supervised)
- Agent suggestions in UI (L2 assisted)
- L3 mode (all agents disabled)
- Accuracy evaluation (golden dataset)
- Decision record creation (with agent metadata)
- RLS enforcement (agents can only access scoped data)
- Appeal workflow (human overrides agent decision)
- Budget audit trail

---

## Cross-Wave Integration

### API Additions (All Waves)
```typescript
// Time Tracking
POST   /api/gate/timesheet/submit
GET    /api/gate/timesheet/:employeeId
GET    /api/gate/timesheet/:employeeId/overtime
GET    /api/gate/attendance/:employeeId

// Payroll
POST   /api/gate/payroll/run
GET    /api/gate/payroll/runs
GET    /api/gate/payroll/runs/:payrollRunId/payslips
POST   /api/gate/payroll/runs/:payrollRunId/post-to-gl

// Reporting
GET    /api/reporting/compliance-metrics
GET    /api/reporting/audit-trail (with query filters)
POST   /api/reporting/verify-decision-record/:recordId
GET    /api/reporting/attestation-report
GET    /api/reporting/state-as-of/:employeeId/:date

// Agent Plane
GET    /api/agent-plane/agents (list all agents)
GET    /api/agent-plane/agents/:agentId/budget
POST   /api/agent-plane/agents/:agentId/toggle-mode
GET    /api/agent-plane/decisions (audit trail)
POST   /api/agent-plane/decisions/:decisionId/appeal
```

### Database Schema Additions

**Time Tracking:**
- `timesheet_entries` (employee_id, date, start_time, end_time, break_duration)
- `overtime_accrual` (employee_id, week, hours, rate)
- `attendance_records` (employee_id, date, status, variance_minutes)

**Payroll:**
- `payroll_runs` (run_id, period_start, period_end, total_gross, total_net, status)
- `payroll_entries` (payroll_run_id, employee_id, gross, taxes, deductions, net, gl_posting_id)
- `tax_withholding_history` (employee_id, period, fed_tax, ss_tax, medicare_tax, state_tax)
- `deduction_history` (employee_id, period, deduction_type, amount)

**Reporting:**
- `decision_record_verifications` (record_id, verified_at, verification_status, hash_match, signature_match)
- `audit_log_entries` (entity_type, entity_id, action, timestamp, actor, details)

**Agent Plane:**
- `agents` (agent_id, name, domain, autonomy_level, evaluation_mode, active)
- `agent_budgets` (agent_id, period_start, period_end, daily_limit, monthly_limit, current_spend)
- `agent_decisions` (decision_id, agent_id, intent_type, output, budget_deducted, timestamp, status)
- `agent_appeals` (decision_id, appealed_by, appeal_reason, override_decision, timestamp)

### Law Compliance Verification

| Law | Wave 4.2 | Wave 4.3 | Wave 4.4 | Wave 5 | Status |
|-----|----------|----------|----------|--------|--------|
| **Law 1** | ✅ | ✅ | ✅ | ✅ | No LLM in core |
| **Law 2** | ✅ | ✅ | ✅ | ✅ | All manual UIs present |
| **Law 3** | ✅ | ✅ | ✅ | ✅ | Append-only ledger |
| **Law 4** | ✅ | ✅ | ✅ | ✅ | Integer money/duration |
| **Law 5** | ✅ | ✅ | ✅ | ✅ | RLS enforcement |
| **Law 6** | ✅ | ✅ | ✅ | ✅ | Golden datasets 100% |
| **Law 7** | ✅ | ✅ | ✅ | ✅ | Decision records + verification |
| **Law 8** | ✅ | ✅ | ✅ | ✅ | L3 mode works (agents disabled) |
| **Law 9** | ✅ | ✅ | ✅ | ✅ | Compile-time autonomy ceilings |
| **Law 10** | ✅ | ✅ | ✅ | ✅ | Per-agent tokens + budget tracking |

---

## Implementation Timeline

### Sub-Wave 4.2: Time Tracking (Days 1-3)
- Day 1: Policy framework + golden dataset
- Day 2: Forms (timesheet, attendance calendar)
- Day 3: Control Gate integration + E2E tests

**Commits:** 4-5
**Lines:** 1,500+
**Tests:** 60+

### Sub-Wave 4.3: Payroll Enhancements (Days 4-7)
- Day 4: Tax engine + deductions framework
- Day 5: Payroll orchestration + GL posting
- Day 6: Pay slip generation + UI
- Day 7: E2E tests

**Commits:** 6-7
**Lines:** 2,000+
**Tests:** 80+

### Sub-Wave 4.4: Reporting & Analytics (Days 8-10)
- Day 8: Compliance dashboard + audit trail query
- Day 9: Decision record verification + attestation generator
- Day 10: E2E tests + historical reconstruction

**Commits:** 4-5
**Lines:** 1,800+
**Tests:** 50+

### Sub-Wave 5: Agent Plane Production (Days 11-14)
- Day 11: Agent framework + budget manager
- Day 12: Agent routing + evaluation harness
- Day 13: MCP server + agent governance UI
- Day 14: E2E tests + audit integration

**Commits:** 6-7
**Lines:** 2,000+
**Tests:** 100+

---

## Success Criteria

### Wave 4.2 (Time Tracking)
- ✅ Timesheet entry form working end-to-end
- ✅ Overtime accrual calculation accurate (tested against golden dataset)
- ✅ Attendance calendar shows correct status
- ✅ All jurisdiction-specific rules (CA, TX, FL, NY) verified
- ✅ E2E tests: 60+ passing
- ✅ Laws 1-10 verified

### Wave 4.3 (Payroll)
- ✅ Payroll run successful (employee data correct)
- ✅ Tax calculations accurate (verified against IRS tables)
- ✅ Deductions applied correctly (401k max, FSA max)
- ✅ GL posting correct (trial balance reconciles)
- ✅ Pay slips generate and email
- ✅ Retroactive payroll correction works (ledger + compensating event)
- ✅ E2E tests: 80+ passing
- ✅ Laws 1-10 verified

### Wave 4.4 (Reporting)
- ✅ Compliance dashboard metrics accurate
- ✅ Audit trail query returns correct results
- ✅ Decision record verification working (hash chain valid)
- ✅ Attestation report generates PDF with all required elements
- ✅ Historical state reconstruction accurate (as-of date queries work)
- ✅ E2E tests: 50+ passing
- ✅ Laws 1-10 verified

### Wave 5 (Agent Plane)
- ✅ All 6 agent types (hiring, compensation, time, payroll, leave, compliance) implemented
- ✅ Budget enforcement working (daily/monthly limits)
- ✅ Rate limiting working (decisions/hour)
- ✅ Agent decisions routed through Control Gate (same pipeline as human)
- ✅ Evaluation harness comparing agent vs. golden dataset
- ✅ MCP server serving agent resources/tools
- ✅ Agent governance UI showing all agents, settings, decisions
- ✅ Decision records capture agent metadata (agent_id, autonomy_level, budget_deducted)
- ✅ L3 mode works with all agents disabled
- ✅ E2E tests: 100+ passing
- ✅ Laws 1-10 verified (including Law 1: no LLM imports in core)

---

## Quality Assurance

### Pre-Push Checklist (All Waves)
- ✅ Code compiles (TypeScript strict mode)
- ✅ Lint passes (`pnpm run lint`)
- ✅ Format passes (`pnpm run format`)
- ✅ Type check passes (`pnpm run typecheck`)
- ✅ Unit tests pass (policy rules, calculations)
- ✅ E2E tests pass (Playwright)
- ✅ Law enforcement passes (`pnpm run ci:laws`)
- ✅ Golden dataset coverage: 100%
- ✅ Decision records generated and hash-chained
- ✅ RLS tested (tenant isolation)
- ✅ L3 mode tested (zero AI)

### Post-Push Checklist
1. GitHub branch created: `claude/keel-hr-os-architecture-n4ihvg`
2. CI runs automatically: Laws, tests, coverage
3. Code review (if applicable)
4. Merge to main
5. Deploy to staging
6. Run smoke tests
7. Deploy to production

---

## Risk Assessment

**Overall:** 🟢 **LOW** (Architecture proven by Waves 2-4.1)

**Identified Risks:**

1. **Tax Engine Accuracy** (Medium)
   - Risk: Tax calculation errors
   - Mitigation: Golden dataset with IRS verification, annual audit

2. **GL Posting Reconciliation** (Medium)
   - Risk: Payroll doesn't balance to GL
   - Mitigation: Automated reconciliation check, alerts on variance

3. **Agent Accuracy Drift** (Medium)
   - Risk: Agents become less accurate over time
   - Mitigation: Continuous evaluation, accuracy alerts, human in loop

4. **Performance at Scale** (Low)
   - Risk: Large payroll runs slow down system
   - Mitigation: Parallel processing, batching, performance tests

**Mitigation Strategy:** Each sub-wave has comprehensive golden dataset + E2E tests. L3 mode verification ensures system works without agents. Law 8 ensures continuous L3 testing.

---

## Dependencies & Prerequisites

### Required Tooling
- Node 22+
- PostgreSQL 16+
- Redis (for rate limiting)
- Temporal.io (for orchestration)
- Playwright (for E2E)

### Required Data
- IRS tax tables 2026 (for Wave 4.3)
- State/local tax rates (CA, TX, FL, NY, IL, OH, PA, GA, NC)
- Employee master data (for E2E tests)
- Historical payroll data (optional, for reconciliation testing)

### External Services
- OpenSearch (for audit trail search)
- Kafka (for ledger event stream)
- OpenTelemetry (for observability)
- Email service (for pay slips)

---

## Handoff Notes

### For Next Developer

1. **Wave 4.2:** Time tracking is the simplest sub-wave. Start here to build momentum.
2. **Wave 4.3:** Payroll is complex due to tax/deduction rules. Use provided golden dataset rigorously.
3. **Wave 4.4:** Reporting is about querying and visualizing existing data. Lower risk.
4. **Wave 5:** Agent Plane requires careful autonomy/budget enforcement. Review control flow thoroughly.

### Commands to Know

```bash
# Run all tests
pnpm run test

# Run specific test suite
pnpm run test -- wave-4.2

# Law enforcement
pnpm run ci:laws

# Type check
pnpm run typecheck

# Format
pnpm run format

# E2E tests
pnpm -C apps/web run test:e2e

# Start dev servers
pnpm run dev
```

### Key Files to Review Before Starting

- `CLAUDE.md` — Architecture overview + Laws
- `packages/policy/src/policies/leave-policy.ts` — Policy DSL pattern
- `apps/web/e2e/leave-management.spec.ts` — E2E test pattern
- `services/gate/src/handlers/leave-request-handler.ts` — Handler pattern
- `services/gate/src/routes/gate.ts` — API endpoint pattern

---

## Success Metrics

By end of Wave 5:

- **Code Quality:** 100% type-safe, 0 lint errors, 100% test coverage of critical paths
- **Law Compliance:** 10/10 laws enforced, zero violations
- **Performance:** Payroll run (500 employees) < 5 minutes
- **Accuracy:** Tax calculations match IRS tables (100%), Payroll reconciles to GL (0 variance)
- **Reliability:** 99.9% uptime SLA in production
- **Auditability:** All decisions recorded and verifiable, hash chain intact
- **Agent Accuracy:** 95%+ accuracy on hiring/payroll decisions (vs. golden dataset)

---

## Next Steps (Wave 6+)

Once Wave 5 is complete and in production:

- **Wave 6:** Advanced compliance (audit response, attestation automation)
- **Wave 7:** Mobile app enhancements (offline timesheet, pay slip push notifications)
- **Wave 8:** Integration marketplace (ERP connectors, banking sync)
- **Wave 9:** Multi-country expansion (UK PAYE, German payroll, etc.)

---

**Status:** 🟢 Ready for implementation  
**Entry Date:** 2026-08-28  
**Estimated Completion:** 2026-09-11  
**Approval Required:** User acknowledgment before implementation starts

---

_Planning document generated by Claude Code on 2026-08-28_
