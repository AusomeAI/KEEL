# KEEL — Operational Toolkit
## Templates, checklists, and examples for Wave 1 execution

---

## SECTION 1: ADR (Architecture Decision Record) Template

**Location:** `docs/adr/000X-{kebab-case-title}.md`
**Format:** Every ADR is one file. File immediately when a decision is made (not retroactively).

### Template

```markdown
# ADR-NNNN: {Decision Title}

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Superseded | Deprecated
**Squad:** {Squad name}
**Decider:** {Name, role}

## Context

{Why are we making this decision now?
What are the constraints?
What triggered the decision?}

## Decision

{What are we deciding? Write it in past tense as if the decision is already made.}

We will {action} because {rationale}.

## Rationale

{Why is this the right choice? What did we consider?}

### Options considered
- **Option A:** {Brief description. Pros: X, Y. Cons: A, B.}
- **Option B:** {Brief description. Pros: X, Y. Cons: A, B.}
- **Option C (chosen):** {Why this one?}

### Risk of this decision
- {Risk 1 and mitigation}
- {Risk 2 and mitigation}

## Consequences

**Good:**
- {Consequence 1}
- {Consequence 2}

**Bad:**
- {Consequence 1}
- {Consequence 2}

## Related ADRs
- ADR-NNNN: {Related decision}

## References
- [Link to issue]
- [Link to PR]
```

### Example ADR-0001: Bitemporal Ledger Design

```markdown
# ADR-0001: Bitemporal event sourcing for the ledger

**Date:** 2026-09-01
**Status:** Accepted
**Squad:** Squad 0 (Platform Kernel)
**Decider:** CTO

## Context

The HRIS must support as-of reconstruction: "show me this employee's benefits as of 6 months ago."
We also must support payroll correction: "the tax rate changed, recompute March retroactively."
Traditional UPDATE/DELETE ledgers can't do this without loss.

## Decision

We will implement the ledger as append-only bitemporal event store with two timestamps:
- **Valid time:** when the fact was true in the business world
- **Transaction time:** when we came to believe it (when the event was recorded)

All employee history, pay history, leave accrual, etc. will be recorded as events.
Corrections will be compensating events, never in-place updates.

## Rationale

### Options considered
- **Option A (traditional DB):** UPDATE/DELETE on every change. 
  - Pro: simpler to build, familiar to most engineers
  - Con: Impossible to reconstruct history, payroll corrections corrupt the ledger, no audit trail, risk of accidental data loss
  - Con: Violates Law 3 (ledger is append-only)

- **Option B (audit table):** Keep current record in main table, store changes in audit history.
  - Pro: easier than full bitemporal
  - Con: still requires UPDATE on main table; history is secondary; hard to query "as of date X"

- **Option C (bitemporal, chosen):** Append-only events with valid + transaction time.
  - Pro: complete history, no data loss, reconstruction is deterministic, audit trail is immutable
  - Pro: Enables payroll replay (run March payroll 3 times, same result)
  - Pro: Differentiates us (competitors can't do this)
  - Con: Requires bitemporal thinking from engineers (learning curve)
  - Con: Query complexity increases (but we pre-materialize common views)

### Risk mitigation
- **Risk:** Queries on "as of date" are slow. 
  - Mitigation: Pre-materialize daily snapshots for common queries (employee status, payroll balance). Index on valid_time. Benchmark by Week 8.
- **Risk:** Engineers used to traditional SQL will make mistakes.
  - Mitigation: No UPDATE/DELETE grants on event tables (DB role level). CI lint rule. Code review.

## Consequences

**Good:**
- Payroll is replayed bit-for-bit (critical for compliance + parallel runs)
- Audit trail is immutable (Law 7)
- Corrections are explicit (compensation events, never hidden)
- "As of" reconstruction works correctly (employee lifecycle queries)
- Regulatory compliance (we have proof of what we calculated and when)

**Bad:**
- Team needs training on bitemporal thinking
- Query complexity (SQL is harder than traditional CRUD)
- Storage cost (every event takes space; we don't delete anything)
  - Mitigation: Archive old events after 7 years; keeps online partition small

## Related ADRs
- ADR-0003: Control Gate (writes only through gate)
- ADR-0007: Decision Records (every decision is an event)

## References
- [Temporal Databases](https://en.wikipedia.org/wiki/Temporal_database)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
```

---

## SECTION 2: Pull Request Review Checklist

Use this for every PR. Paste it in the PR template.

```markdown
# Pull Request Checklist

## Automated (CI must pass)
- [ ] All 10 Laws pass (dependency-cruiser, lint, architectural tests)
- [ ] L3 test suite passes (Agent Plane scaled to zero, model endpoints blackholed)
- [ ] Test coverage: core ≥95%, policy ≥98%, other ≥85%
- [ ] No `console.log`, only structured logging (winston/pino)
- [ ] TypeScript strict mode, no `any`

## Conventional Commits
- [ ] Commit message starts with `feat/fix/refactor/test/docs` + scope
- [ ] Example: `feat(payroll): add retroactive processing for tax corrections`
- [ ] Scope is module or service name (single word/hyphen)

## Bitemporal & History
- [ ] If this touches employee history or effective dating:
  - [ ] Include "as-of reconstruction" test
  - [ ] Verify compensating-event pattern for corrections
  - [ ] No UPDATE/DELETE on event tables

## Decision Records & Provenance
- [ ] If this implements a material HR decision (hire, promotion, pay change):
  - [ ] Verify Decision Record is emitted with: inputs, policy version, human reviewer, hash
  - [ ] Test that the record is retrievable by audit trail

## Manual Path First (Law 2)
- [ ] If this adds an agent capability:
  - [ ] Show the manual UI route in the same PR or linked PR
  - [ ] Verify the route is registered in the intent manifest
  - [ ] Manual path ships first or in this same PR (not later)

## Definition of Done
- [ ] For module completeness (if applicable), check against the DoD checklist:
  - [ ] Manual UI complete (all states: empty, loading, error, offline, L3)
  - [ ] Policy (if payroll/leave/benefits)
  - [ ] Golden dataset (if calculations)
  - [ ] Tenant isolation tests
  - [ ] Accessibility & localization annotations
  - [ ] Observability (traces + metrics)

## Squads: Cross-Squad Impact
- [ ] If this affects `packages/core`, `packages/policy`, or `packages/calc`: 
  - [ ] Coordinate with Squad 0 lead / Squad 1 lead
  - [ ] Deprecation window required if breaking
- [ ] If this adds a new `TransactionIntent` type:
  - [ ] Squad 0 reviewed + approved
  - [ ] Manifest updated + manual route verified
- [ ] If this changes policy DSL or compiler:
  - [ ] Existing golden datasets still pass
  - [ ] Migration path for existing policy artifacts documented

## Architecture & Risk
- [ ] Is there an ADR filed? (If not, should there be?)
- [ ] Could this violate any of the 10 Laws?
- [ ] Performance regression? (Check metrics in CI)

## Example: A solid PR (timekeeping)

**Title:** `feat(time): add geofenced punch with fallback to manual entry`

**Automated:**
- ✓ Laws 1–10 pass
- ✓ L3 suite passes (geofence works without agent plane)
- ✓ Coverage: 93% (added 4 unit tests, 1 integration test)
- ✓ Conventional commits

**Bitemporal:**
- Timestamp + GPS coordinates recorded as immutable event
- Fallback (manual punch) stored as separate event
- Both retrievable in audit trail
- ✓ As-of reconstruction test (shows correct punch at any date)

**Decision Records:**
- Geofence failure → fallback to manual entry
- Manual entry triggers manager notification (optional Decision Record if approval needed)
- ✓ Test verifies Decision Record emitted

**Manual Path First:**
- Manager can override geofence decision in Timesheets UI
- Route already exists (previous PR)
- ✓ Verified in manifest

**Definition of Done (module not yet complete):**
- Manual UI: Yes (geofence + manual entry both present)
- Policy: Not applicable (no rules, pure capture)
- Golden dataset: Not applicable
- Tenant isolation: ✓ Tested (employee can only see own punch)
- Accessibility: ✓ Keyboard navigation, screen reader labels
- Localization: ✓ Strings extracted
- Observability: ✓ Added trace for geofence latency
- Note: Module complete pending time-off reconciliation (separate work)

**Cross-squad:**
- No impact on core, policy, or calc
- TransactionIntent: none (capture is read-side only)

**Risk:**
- GPS accuracy on older devices
- ADR-filed: ADR-0031 (geofence vs. RFID model)
- No Laws violated
- Performance: Geofence query <50ms (checked, passes)

**Approval:** ✓ Ship it.
```

---

## SECTION 3: Weekly Metrics Dashboard Template

**Updated:** Every Friday, 4pm PT (automated)
**Audience:** CEO, all squad leads
**Format:** Rendered as HTML or Slack post (update script pulls from CI)

```markdown
# KEEL Wave 1 Metrics Dashboard
**Week of September 8, 2026**

---

## 🟢 BUILD HEALTH — All systems go

| Metric | Target | Current | Trend | Notes |
|--------|--------|---------|-------|-------|
| Laws enforced (CI) | 10/10 | 10/10 | ↑ | All rules active |
| CI pass rate | ≥98% | 99.4% | ↑ | 437/439 builds passed |
| Nightly RLS fuzz | ≥99% | 100% | ↔ | 0 cross-tenant leaks |
| RLS incidents | 0 | 0 | — | None this week |
| Test coverage (core) | ≥95% | 94.2% | ↓ | New code in progress (Squad 0 auth) |
| Test coverage (policy) | ≥98% | 42% | ↑ | 15 golden datasets added |

---

## 📊 DELIVERY MILESTONES (Wave 1)

| Milestone | Target | Status | ETA | Blocker |
|-----------|--------|--------|-----|---------|
| Ledger v0.1 + RLS | Week 6 | ✓ Shipped | Sep 15 | — |
| Control Gate v0.1 | Week 10 | 🟡 80% | Oct 1 | PostgreSQL RLS performance |
| Policy DSL v1 + golden | Week 14 | 🟢 Started | Oct 29 | — |
| Design System v1 | Week 18 | 🟢 Started | Nov 26 | Radix audit pending |
| Employee master | Week 22 | ⏳ Waiting | Dec 24 | Blocked on Gate v0.1 |
| Leave accrual | Week 34 | ⏳ Waiting | — | — |
| Payroll (3 countries) | Week 42 | ⏳ Waiting | — | — |
| Parallel-run engine | Week 52 | ⏳ Waiting | — | — |
| L3/L4 game-day ready | Week 70 | ⏳ Waiting | — | — |
| Customer sign-off | Week 78 | ⏳ Not started | — | — |

---

## 👥 SQUADS AT A GLANCE

| Squad | Role | Headcount | On Schedule | Notes |
|-------|------|-----------|-------------|-------|
| 0 — Kernel | Ledger, tenancy, Gate | 8 | ✓ | RLS performance concern (watch) |
| 1 — Policy | DSL, compiler, WASM | 6 | ✓ | Rust hire pending (1 offer out) |
| 2 — Workforce | Employee master, org | 5 | — | Not started (waiting for Gate) |
| 3 — Time & Leave | Capture, accrual | 6 | — | Not started (waiting for DS) |
| 4 — Payroll | Runs, tax, bank | 7 | — | Not started (waiting for accrual) |
| 5 — Experience | UX/design/front-end | 7 | ✓ | Kiosk PWA research underway |
| 6 — Integration | APIs, connectors, migration | 4 | — | Not started (waiting for schemas) |
| 8 — Assurance | Security, testing, compliance | 5 | ✓ | SOC 2 evidence collection started |
| **Total** | | **48** | **6/8 on track** | **2 awaiting dependency** |

---

## 🚨 ESCALATIONS THIS WEEK

| Date | Squad | Issue | Status | Resolution |
|------|-------|-------|--------|------------|
| Sep 6 | 0 | RLS query on employee_ledger slow (>200ms for as-of) | Resolved | Added partial index on valid_time; down to 45ms |
| Sep 7 | 1 | Rust/WASM build time regression (5min → 8min) | Resolved | Enabled sccache; down to 2min |
| Sep 8 | 5 | Radix primitives accessibility audit finding | Pending | CTO reviewing; no blocker yet |

---

## 🎯 GOLDEN DATASET COVERAGE

| Domain | Rules | Tested | % | Status | Blockers |
|--------|-------|--------|---|--------|----------|
| Leave accrual | 47 | 47 | 100% | ✓ Ready | None |
| Overtime | 12 | 0 | 0% | — | Not started (Squad 3 in W15) |
| Tax & contributions | 89 | 0 | 0% | — | Not started (Squad 4 in W27) |
| Benefits eligibility | 34 | 0 | 0% | — | Not started (H2) |

---

## 📈 CODE METRICS

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Cyclomatic complexity (avg) | ≤8 | 6.1 | ↓ |
| Functions >20 lines | <10% | 7% | ↓ |
| Dependency count (core) | ≤20 | 14 | ↔ |
| Vendored dependencies | 0 | 0 | — |
| Type coverage (TypeScript) | 100% | 99.8% | ↔ |

---

## 🔗 DEPENDENCY STATUS

- **Squad 0 → Squad 1:** ✓ Ledger schema frozen. Ready for Policy DSL input.
- **Squad 0 → Squad 2:** 🟡 Control Gate auth in review. Unblock by Oct 1.
- **Squad 1 → Squad 4:** 🟡 Golden datasets in progress. Unblock by Oct 15.
- **Squad 5 → Squad 2, 3:** 🟢 Design System v0.1 in review. Ship by Sep 20.

---

## 📋 UPCOMING MILESTONES (Next 2 weeks)

- **Sep 15:** Ledger v0.1 ships (on track)
- **Sep 20:** Design System v0.1 shipped
- **Sep 22:** Squad 1 decision: DSL syntax finalized or revised
- **Sep 29:** Control Gate v0.1 review (may slip to Oct 1)

---

## 🟡 WATCH LIST

1. **RLS query performance** — currently acceptable, but may regress as schema grows. Establish baseline + monitoring.
2. **Rust/WASM expertise** — 1 hire pending. Backup plan: contractor for Q4 if hire doesn't land.
3. **Design System adoption** — initial PR in Squad 2 will show if teams use it. Plan review session if resistance.
4. **Customer readiness** — recruiting design partner(s) starts Week 30. Begin outreach Week 20.

---

**Questions?** Post in #metrics-discussion. CTO reviews Friday office hours.
**Next update:** September 15, 2026.
```

---

## SECTION 4: Incident/Escalation Template

**Location:** Opened when severity is P1 or Risk Register item is triggered.

```markdown
# Incident Report: {Title}

**Date:** YYYY-MM-DD HH:MM
**Severity:** P1 (blocks release) | P2 (risk to schedule) | P3 (track but no action)
**Discoverer:** {Name, squad}
**Incident lead:** {Name}

## Summary
{One paragraph. What happened, why it matters, what we're doing about it.}

## Timeline
- **HH:MM:** {Event}
- **HH:MM:** {Response action}

## Root Cause
{Why did this happen? What assumptions were wrong?}

## Impact
- {System impact}
- {Schedule impact}
- {Risk impact}

## Resolution
{What are we doing to fix it?}
- Action 1 (owner, ETA)
- Action 2 (owner, ETA)

## Prevention
{How do we prevent this next time?}
- Add CI test for {condition}
- Add lint rule for {pattern}
- Add to risk register

## Related ADR
{If this requires an architectural change, file an ADR}
```

### Example: Incident-0001

```markdown
# Incident Report: RLS Leak in Employee Ledger

**Date:** 2026-09-07 14:30
**Severity:** P1
**Discoverer:** Squad 8 (fuzz test)
**Incident lead:** CTO

## Summary
Nightly RLS fuzz suite found that a user in Tenant A could read employee_ledger rows from Tenant B
if they guessed the internal employee ID. The leak is in the `employee_as_of(employee_id, date)` query
which did not include a tenant_id filter. This affects L3/L4 testing and audit trail access.

## Timeline
- **2026-09-07 03:15:** Fuzz suite runs, finds leak
- **2026-09-07 08:00:** Squad 8 alerts CTO
- **2026-09-07 10:00:** CTO + Squad 0 lead begin investigation
- **2026-09-07 14:30:** Root cause identified, fix underway

## Root Cause
The query was written as:
```sql
SELECT * FROM employee_ledger 
WHERE employee_id = $1 AND valid_time <= $2
ORDER BY transaction_time DESC
```

The RLS policy on employee_ledger checks (tenant_id, entity_id) but the query
didn't filter by those columns. PostgreSQL RLS is "deny by default," but we relied
on application filters instead of letting the DB enforce it.

We violated Law 5 during the first review. The fix should have been caught in code review.

## Impact
- **System:** Any query that reconstructs employee history is vulnerable
- **Schedule:** Build is now broken (test failure in CI). Blocks all squads.
- **Risk:** If this made it to production, we'd have a compliance incident

## Resolution
1. **Fix query** (Squad 0, by Sep 7 EOD): Add `AND rls_tenant_id = $3 AND rls_entity_id = $4` to all employee_ledger queries
2. **Audit all queries** (Squad 0, by Sep 8): Walk every query on employee_ledger, timesheet_ledger, leave_ledger. Check for tenant context.
3. **Add lint rule** (Squad 0 + 8, by Sep 9): Static analysis to flag queries on event tables without tenant/entity filters
4. **Fix code review** (CTO, by Sep 9): Add "check for tenant filter in RLS-protected tables" to PR checklist

## Prevention
- [ ] Lint rule: queries on `*_ledger` tables must include tenant+entity context
- [ ] Code review checklist: "Does this query include RLS-enforced columns?"
- [ ] New CI check: Fuzz suite runs after every merge (currently nightly)
- [ ] Add to onboarding: Law 5 deep-dive (30 min)

## Related ADR
- ADR-0005: RLS as the source of truth (not application filters)
```

---

## SECTION 5: Runbook Template

**Location:** `docs/runbooks/{concern}.md`
**Updated:** When procedures change (linked from ADRs)

```markdown
# Runbook: {Concern}

**For:** {Role, e.g., "On-call SRE"}
**Severity:** P1 | P2 | P3
**Escalation:** {Who to page}
**Last verified:** YYYY-MM-DD

---

## Quick Diagnosis

If you see **{symptom}**, go to **[Step X](#step-x)**.

| Symptom | Step |
|---------|------|
| L3 tests failing | [Diagnosis: Test Suite](#diagnosis-l3-test-suite-failure) |
| RLS fuzz alert | [Diagnosis: RLS Leak](#diagnosis-rls-leak) |
| Payroll golden dataset mismatch | [Diagnosis: Golden Dataset](#diagnosis-golden-dataset-mismatch) |

---

## Diagnosis: L3 Test Suite Failure

The L3 suite runs the full end-to-end with Agent Plane scaled to zero. If it fails, the build is broken.

### Step 1: Identify the failure
```bash
# Look at CI logs
# Find the test name and failure message
# Is it:
# - A flaky test (network timeout)?
# - A logic error (calculation mismatch)?
# - A dependency (missing schema)?
```

### Step 2: Check agent plane status
```bash
# If the issue is "Agent Plane still running," check:
kubectl scale deployment agent-plane --replicas=0 -n keel-test

# Verify it's scaled down:
kubectl get deployment -n keel-test | grep agent-plane
# Should show "0/0 Ready"
```

### Step 3: Check model endpoints
```bash
# If "model endpoint still responding," blackhole it:
# (Usually done by CI, but verify)

# Check network policy:
kubectl get networkpolicies -n keel-test | grep model
# Should show "deny all"
```

### Step 4: Re-run the suite
```bash
# Local re-run (from repo root):
pnpm keel:l3

# If it passes locally but fails in CI, it's environmental
# Page the CTO
```

### Step 5: Escalate
If Steps 1–4 don't resolve it:
- Post in #incidents
- Tag: @cto, @squad-0-lead
- Attach: CI log link, local re-run output

---

## Diagnosis: RLS Leak

An employee in Tenant A accessed data from Tenant B. This is a security incident.

### Step 1: Confirm the leak
```bash
# Check the fuzz logs:
tail -f logs/fuzz-rls.log | grep "LEAK"

# Find the query:
# "Query: SELECT * FROM employee_ledger WHERE employee_id = 123"
# "Tenant context: tenant_id = acme-corp"
# "Returned rows from: tenant_id = another-tenant"
```

### Step 2: Kill the build immediately
```bash
# Cancel CI:
# Go to {CI-link} → click "Cancel workflow"

# This prevents the merge
```

### Step 3: Identify the bad query
```bash
# The fuzz logs show the SQL that leaked
# Find it in the codebase:
git grep "SELECT.*FROM employee_ledger" | grep -v "WHERE.*tenant"

# Found it? That's the bug.
```

### Step 4: Fix it
```bash
# Add the tenant context:
# FROM employee_ledger
# WHERE employee_id = $1 
#   AND tenant_id = $2       ← Add this
#   AND entity_id = $3       ← Add this
#   AND valid_time <= $4

# Commit message:
# fix(security): RLS leak in employee_as_of query

# Test locally:
pnpm test:rls-fuzz
# Should pass
```

### Step 5: Escalate
- Post in #incidents
- Page: @cto, @squad-8-lead, @security
- Include: commit hash, test that caught it, time to fix

---

## Diagnosis: Golden Dataset Mismatch

A golden test is failing: KEEL output ≠ expected output.

### Step 1: Identify which test
```bash
# CI logs show:
# "Golden test failed: leave_accrual.yaml"
# "Input: employee X, accrual rule v1.2"
# "Expected: 25.0 days"
# "Got: 24.5 days"
```

### Step 2: Check the rule version
```bash
# The test input specifies the policy version:
# policy_version: "leave-accrual/2026-09-v1.2"

# Did this version recently change?
git log --oneline -- packs/policy/leave-accrual/v1.2.rego

# If yes, that's the issue. Update the test or revert the policy change.
```

### Step 3: Check if the test is wrong
```bash
# Maybe the expected output was incorrect.
# Verify against the statutory rule:
# EU: "Annual leave accrual is 20 days minimum per 5-day week"
# If the rule says 25 days but statute says 20, fix the golden dataset.

# Update:
# docs/golden-datasets/leave_accrual.yaml
# Find the row for this employee, update "expected: 25.0" to "expected: 20.0"
# (plus citation: "EU Working Time Directive, Art. 7")
```

### Step 4: Check if the rule is wrong
```bash
# Maybe the policy implementation is buggy.
# Golden test shows we're computing 24.5 instead of 25.0.

# Debug the WASM:
# Run the payroll kernel in isolation:
cargo run --manifest-path packages/calc/Cargo.toml --example debug_leave
# Input: same employee data as golden test
# Check the intermediate calculations

# If you find the bug, fix it in packages/calc/src/leave.rs
# Re-test:
pnpm test:golden
```

### Step 5: Escalate
- If the statute is unclear, post in #escalations
- Tag: @squad-1-lead (policy), @payroll-accountant (jurisdiction expertise)
- Include: golden dataset file, rule version, statute reference

---

## Escalation Matrix

| Condition | Severity | Page | Notify |
|-----------|----------|------|--------|
| L3 suite fails, can't fix in 1h | P1 | @cto | @squad-0, @squad-8 |
| RLS leak detected | P1 | @cto | @security, @squad-0, @squad-8 |
| Golden dataset mismatch, ambiguous rule | P2 | — | @squad-1, @payroll-accountant |
| Test flake, passes on retry | P3 | — | #incidents (async) |

---

**Questions?** Post in #runbooks. On-call SRE owns updates.
**Last verified:** Sep 8, 2026 (CTO tested all steps).
```

---

## SECTION 6: Squad Lead Weekly Report Template

**Due:** Every Friday, 3pm PT (to CTO + CEO)
**Format:** Async Slack thread or doc (5 min read)

```markdown
# Squad [N] Weekly Report
**Week of September 8, 2026**
**Squad lead:** {Name}

---

## Status: 🟢 On Track | 🟡 At Risk | 🔴 Blocked

### What we shipped this week
- {PR 1, impact}: {merge time}
- {PR 2, impact}: {merge time}

Example:
- feat(ledger): bitemporal event store schema + RLS (Sep 8): Unblocks all downstream squads
- test(ledger): nightly RLS fuzz suite + CI integration (Sep 7): Catches cross-tenant leaks

### What we're working on now
- {Work 1, ETA}
- {Work 2, ETA}

Example:
- Control Gate auth + authorization framework (ship by Oct 1)
- PostgreSQL partitioning strategy for large tenant (decision needed by Sep 15)

### Blockers
- {Blocker 1}: {Owner of blocker}, ETA {date}
- None this week

Example:
- Blocked on Squad 5 Design System (waiting for Radix audit) — no impact on our schedule

### Risk / Concern
- {Risk 1}: {Mitigation}
- None this week

Example:
- RLS query performance may regress as employee_ledger grows → added monitoring + baseline benchmark by Sep 15

### Headcount
- Hired: {N} ({roles})
- Pending: {N} ({roles})
- Total: {N}/{target}

Example:
- Hired: 1 (Postgres DBA)
- Pending: 1 offer (Rust engineer)
- Total: 6/8 (on track)

### Asks for next week
- {Ask 1}: {From whom, priority}
- None

Example:
- Design System v0.1 review from Squad 5 (Squad 5 lead), P1 (unblocks Squad 2)

---

**Questions?** Slack @cto. CTO responds in office hours (Friday 4pm).
```

---

## SECTION 7: CEO Weekly Briefing Template

**Due:** Every Monday, 8am PT (to CEO + investors if applicable)
**Format:** One page, 3-minute read

```markdown
# KEEL Wave 1 Executive Brief
**Week ending September 12, 2026**

---

## TL;DR
**Status:** On track to H1 Horizon 1 exit (Week 78, design-partner sign-off).
**Confidence:** 95% (no surprises).
**Headcount:** 48 hired, all squads staffing on plan.

---

## Metrics that matter
| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Delivery (Wave 1 on track) | Yes | 6/8 squads shipped | ↑ |
| Build stability (CI pass rate) | ≥98% | 99.4% | ↑ |
| Security (RLS incidents) | 0 | 0 | — |
| Schedule risk (milestones) | 0 slips | 1 watch (Control Gate, +2w) | ↔ |
| Runway months | 30 | ~31 (hiring efficiency) | ↑ |

---

## One thing we fixed this week
**RLS Leak (Sep 7):** Fuzz suite caught that tenant A could read tenant B data. Fixed same day.
**Why it matters:** This is exactly what the system is designed to catch. CI is working.

---

## One thing we're watching
**Design System adoption:** Squad 2 will be the first to use it (next week). If they build custom components instead, we have a culture problem. CTO will run a retro and course-correct if needed.

---

## One ask
**Recruiting:** Rust engineer (for Squad 1) is critical path. Offer out this week. If they decline, we'll use a contractor Q4. Offer is at market rate + equity.

---

## Next major milestone
**Oct 1, Week 10:** Control Gate v0.1 ships. Unblocks 3 squads. CTO confident but watching query performance.

---

**Full dashboard:** See weekly metrics (Section 3) for details.
**Questions?** CTO syncs with CEO after this brief.
```

---

## SECTION 8: 1-on-1 Template (Squad Lead + CTO)

**Cadence:** Every 2 weeks, 30 min
**Format:** Human conversation (this is just the agenda)

```markdown
# 1-on-1: {Squad lead name}
**Date:** YYYY-MM-DD
**Duration:** 30 min

---

## Agenda
1. **How are you?** (5 min)
   - Energy level? Personal blockers? Anything I should know?

2. **Your squad's delivery** (10 min)
   - On track to milestones?
   - Anything you need from me (decision, unblock, hire)?
   - Any surprises or learnings from the week?

3. **Career / growth** (5 min)
   - What are you learning?
   - What's frustrating?
   - What do you want to do next?

4. **Anything else?** (10 min)
   - Compensation / leveling / team dynamics?
   - Something you wanted to bring up?

---

## Template notes
- These are **confidential** (1-on-1)
- CTO takes notes and follows up on action items
- Not for performance reviews (separate cadence)
- Safe space to disagree, ask hard questions, surface concerns
```

---

## SECTION 9: Definition of Ready (Pre-Squad Kickoff)

Before a squad starts work, verify:

- [ ] Headcount hired (100% or >80% with clear plan for rest)
- [ ] Laptop + dev environment set up (can `git clone` and `pnpm install` successfully)
- [ ] Access to CI/CD pipeline, monitoring, incident management
- [ ] All dependencies (upstream squads) have shipped v0.1 or committed to date
- [ ] Epic-level work broken into 1–2 week stories
- [ ] Golden datasets (if applicable) written and baselined
- [ ] ADRs filed for major decisions (link from epic)
- [ ] Squad lead has met with CTO (alignment on definition of done)
- [ ] First PR merged (proves CI, build, review process works)

---

## SECTION 10: Retrospective Template

**Cadence:** End of each Wave
**Attendees:** Full squad + CTO
**Duration:** 90 min

```markdown
# Wave 1 Retrospective

**Date:** TBD (Week 78)
**Attendees:** {Squad name, full roster}

---

## Format (60-20-10 rule)
- **60 min:** What we learned
  - What went well? (Celebrate)
  - What went poorly? (Diagnose)
  - What surprised us? (Extract patterns)
  
- **20 min:** What we'll change
  - Top 3 process changes for Wave 2
  - Assign owners for change

- **10 min:** Appreciation + close

---

## Output
- One document: "Wave 1 Retrospective — {Squad name}"
- Includes: 3 things that worked, 3 things to improve, 3 process changes
- Shared with other squads (patterns matter)
- Filed in docs/retrospectives/
```

---

## END OF TOOLKIT

**Next step:** Print this, share it with all squads, and reference it daily.

**Owner:** CTO. Contact for questions or updates.
