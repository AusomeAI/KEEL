# ADR 0007: Segregation of Duties (SoD) Matrix — Internal Control Framework

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Compliance Officer, Internal Audit Lead  
**Relates to:** Law 10 (Per-actor accountability), ADR 0006 (RBAC Strategy), Internal Controls Framework

## Context

Internal control frameworks (COSO, SOX 302, EU 404) require that high-risk decisions be **segregated**:
- No single person can both approve and execute a transaction
- No single person can both authorize a change and audit it
- No single person can both hire and immediately promote someone

Violations can indicate:
- Fraud (circumventing dual control)
- Error (one person's mistake not caught)
- Regulatory non-compliance (SOX, GDPR, local labor laws)

### Current State

RBAC model (ADR 0006) allows assigning any role to any user.
No constraints on conflicting roles.
No audit trail of SoD violations.

### The Problem

Without SoD enforcement:
- Payroll approver can also execute payroll (fraud risk)
- Hiring manager can also perform background checks on their own hires (bias risk)
- HR admin can modify their own salary and approve it
- Compliance cannot audit the segregation

## Decision

Implement a three-level SoD enforcement system:

### Level 1: SoD Rules (Migration 005)

Define explicit conflicts: Role A + Role B cannot both be held by same actor at same scope.

Create two tables:

1. **`sod_rules`** — Conflict definitions
   - `role_a_id`, `role_b_id` — The two roles that conflict
   - `enforcement_type` — HARD, SOFT, or AUDIT_ONLY
   - `control_objective` — Why this rule exists (e.g., "Segregate financial approval from execution")
   - `statutory_reference` — Regulatory citation (SOX 302, GDPR Article 32, etc.)
   - `scope_level` — At which hierarchy level this rule applies (TENANT, GROUP, ENTITY, BRANCH)

2. **`sod_violations`** — Audit log
   - Records every violation (attempted or approved)
   - `status` → OPEN, ACKNOWLEDGED, APPROVED, REJECTED, REMEDIATED
   - `detected_at`, `reviewed_at`, `closed_at` — Timeline
   - `approval_reason` — If approved, why was exception granted
   - Links to attachments (email approvals, exception justifications, etc.)

3. **`sod_violation_attachments`** — Evidence
   - Exception emails, approval documents, etc.

### Level 2: Enforcement Types

Three enforcement strategies:

1. **HARD** — Violation is rejected immediately
   - Example: PAYROLL_APPROVER + PAYROLL_EXECUTOR
   - Implement: Database trigger raises exception, prevents role assignment
   - Audit: Violation is logged but assignment fails

2. **SOFT** — Violation is allowed with approval
   - Example: HR_ADMIN + PAYROLL_ADMIN (related but not critical)
   - Implement: Assignment succeeds, violation recorded, manual review required
   - Audit: Violation logged, approval tracked with reason

3. **AUDIT_ONLY** — Violation is allowed and logged
   - Example: Manager + Employee of same person (theoretical conflict)
   - Implement: Assignment succeeds, violation recorded for reporting
   - Audit: Violation tracked, no manual review required

### Level 3: Standard SoD Rules

Initialize these rules via seed script (`services/ledger/scripts/seed-sod-rules.mjs`):

| Rule | Role A | Role B | Type | Reason |
|------|--------|--------|------|--------|
| **Payroll Segregation** | PAYROLL_APPROVER | PAYROLL_EXECUTOR | HARD | No single person can approve AND execute payroll (SOX 302) |
| **Hiring Authority** | MANAGER | PAYROLL_ADMIN | SOFT | Reduces fraud risk (related fiefdom) |
| **Admin Separation** | HR_ADMIN | PAYROLL_ADMIN | SOFT | Separate policy-setting from execution (CYA principle) |
| **Self-Promotion** | MANAGER | EMPLOYEE (direct report) | AUDIT_ONLY | Track manager→employee relationships for bias audit |

### SoD Engine (@keel/core)

`SoDEngine` class provides:

```typescript
// Check compliance when assigning a new role
checkCompliance(
  actor, newRole, scope, currentAssignments, customRules
) → SoDComplianceResult {
  isCompliant: boolean,
  violations: SoDViolation[]
}

// Get all current violations for an actor (compliance reporting)
getAllViolations(actor, scope, assignments, customRules) → SoDViolation[]

// Severity scoring (for prioritization)
getViolationSeverity(violation) → number (0-100)

// Get roles that would conflict if assigned
getConflictingRoles(newRole, assignments, scope) → RoleKey[]

// Query applicable rules for a tenant/scope
getApplicableRules(scope, customRules) → SoDRule[]
```

### Control Flow at Role Assignment

```
1. User requests to assign PAYROLL_EXECUTOR to Alice
2. System loads Alice's current assignments in that scope
3. RBACEngine.getRolesAtScope() → [PAYROLL_APPROVER, ...]
4. SoDEngine.checkCompliance(alice, PAYROLL_EXECUTOR, scope, assignments)
   → violations = [SoD rule with enforceType=HARD]
5. Check enforcement type:
   - HARD: Reject assignment, return 403
   - SOFT: Allow assignment, insert into sod_violations with status=OPEN
   - AUDIT_ONLY: Allow assignment, insert into sod_violations with status=AUDIT_ONLY
6. If allowed, create role_assignments record
7. Create decision record (Law 7): proof of who assigned what role and why
```

## Scope Matching for SoD

SoD rules apply at a scope level:

- **TENANT scope rule:** No single person can have both roles anywhere in the tenant
- **ENTITY scope rule:** No single person can have both roles in the same entity (but OK in different entities)
- **BRANCH scope rule:** No single person can have both roles in the same branch (but OK in different branches)

**Example:**
- Rule: PAYROLL_APPROVER/EXECUTOR segregation at ENTITY level
- Alice is PAYROLL_APPROVER for Entity A → Can be PAYROLL_EXECUTOR for Entity B (different entity)
- Bob is PAYROLL_APPROVER for Entity A → Cannot be PAYROLL_EXECUTOR for Entity A (same entity)

## Violations and Remediation

### Detecting Violations

Two scenarios:

1. **At assignment time:** Trigger checks before insert
   - HARD violations → Assignment blocked
   - SOFT violations → Violation recorded, assignment proceeds if approved
   - AUDIT_ONLY violations → Violation recorded, assignment proceeds

2. **Retrospective audit:** Query existing assignments
   - Run compliance report across all actors
   - Identify drift from SoD policies

### Resolving Violations

Options:

1. **Revoke one role** → REMEDIATED
2. **Request exception** → Tracked in violation record
3. **Escalate for review** → Move to APPROVED or REJECTED

## Consequences

### Positive

- **Fraud deterrent** — Segregating approval from execution makes fraud obvious
- **Regulatory defense** — Can prove SoD policies were enforced
- **Flexibility** — SOFT rules allow exceptions with justification
- **Audit trail** — Every violation is logged, even if approved
- **Compliance reporting** — Easy to query current/historical violations

### Negative

- **Operational friction** — Some legitimate assignments blocked (requires exception)
- **Rule maintenance** — Custom rules per customer must be managed
- **False positives** — SOFT/AUDIT_ONLY rules may flag non-issues
- **Complexity** — Large customers need deep understanding of SoD matrix

## Implementation Notes

### Trigger-Based Enforcement

PostgreSQL trigger `enforce_sod_trigger()` fires BEFORE INSERT on `role_assignments`:

```sql
CREATE TRIGGER enforce_sod_on_assignment
BEFORE INSERT ON role_assignments
FOR EACH ROW EXECUTE FUNCTION enforce_sod_trigger();
```

Function:
1. Calls `check_sod_compliance(NEW.actor_id, NEW.role_id, ...)`
2. If HARD violation detected: `RAISE EXCEPTION`
3. If SOFT violation detected: Allow insert, application creates violation record
4. If AUDIT_ONLY: Allow insert silently

### Custom Rules

Customers can add custom SoD rules via API:

```typescript
POST /api/sod-rules {
  rule_name: "Custom Rule: Payroll Lead + Payroll Analyst",
  role_a_key: "PAYROLL_LEAD",
  role_b_key: "PAYROLL_ANALYST",
  enforcement_type: "SOFT",
  control_objective: "...",
  statutory_reference: "..."
}
```

Custom rules are stored with `role_type = CUSTOM` and apply only to that tenant.

### Reporting

Compliance report queries:

```sql
-- All OPEN violations (need review)
SELECT * FROM sod_violations WHERE status = 'OPEN' AND tenant_id = ?

-- All APPROVED violations (exceptions granted)
SELECT * FROM sod_violations WHERE status = 'APPROVED' AND tenant_id = ?

-- Timeline for specific actor
SELECT * FROM sod_violations WHERE actor_id = ? ORDER BY detected_at DESC

-- Violations by rule
SELECT rule_name, COUNT(*) FROM sod_violations
GROUP BY sod_rule_id, rule_name
ORDER BY COUNT(*) DESC
```

## Alternatives Considered

### Alternative A: Prevent conflicting roles entirely (no exceptions)

**Why not:** Legitimate exceptions exist (small companies, shared services).
Flexibility via SOFT rules is better than binary block/allow.

### Alternative B: Only log violations (no enforcement)

**Why not:** Auditors still need assurance violations are *prevented*, not just logged.
HARD rules are non-negotiable for compliance.

### Alternative C: Attribute-based rules (e.g., "manager cannot approve leave for direct report")

**Why not (for Wave 1):** Requires more complex logic and data context.
Role-based segregation is sufficient for Phase 1; resource-level control in Wave 2+.

## Related Decisions

- **ADR 0006: RBAC Strategy** — RBAC foundation that SoD rules constrain
- **Law 10:** Per-actor accountability (SoD enforces it)
- **Decision Record (Law 7):** Every SoD decision is recorded with evidence

## Testing Strategy

### Unit Tests
- Compliance checks at each enforcement level
- Scope matching (different scopes allow same conflict)
- Conflicting role detection
- Severity scoring

### Integration Tests
- Role assignment triggers check SoD
- HARD violations block assignment
- SOFT violations allow assignment with record
- Violations can be approved/rejected
- Compliance report queries work

### Compliance Tests
- Standard SoD rules match industry regulations
- Custom rules can be added without breaking system
- Auditor can generate compliance report

### Fuzz Tests
- Random assignments of conflicting roles → all detected
- 1000 concurrent violations → no race conditions
- Random scope combinations → correct scope matching

## Success Criteria

1. Standard SoD rules are initialized and enforced
2. HARD violations are rejected at database level (trigger succeeds)
3. SOFT violations are logged and can be approved
4. AUDIT_ONLY violations are logged
5. Compliance report runs in < 1 second
6. All integration tests pass
7. Zero false negatives (all violations detected)

## References

- **Internal Controls Framework:** COSO, SOX 302, GDPR Article 32
- **ADR 0006:** RBAC Strategy (foundation for SoD)
- **Law 10:** Per-actor accountability
- **Migration 005:** `services/ledger/migrations/005-create-sod-rules.sql`
- **SoDEngine:** `packages/core/src/auth/sod-engine.ts`
- **Types:** `packages/core/src/types/rbac.ts`
