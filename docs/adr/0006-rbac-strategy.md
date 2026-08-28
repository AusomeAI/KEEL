# ADR 0006: RBAC Strategy — Role-Based Access Control for Multi-Tenant HR System

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Squad 0 Lead, Security Lead  
**Relates to:** CLAUDE.md § 1 (Law 10), ADR 0005 (Tenancy Kernel), ADR 0007 (Segregation of Duties)

## Context

Every material HR decision (hire, pay, promote, discipline, terminate) carries legal liability:
- Wrongful termination
- Discrimination claims
- Wage and hour violations
- Breach of fiduciary duty

The system must support:

1. **Per-actor accountability** — Every action is attributed to a specific person or agent
2. **Fine-grained permissions** — Some users can hire but not fire; some can approve payroll but not execute it
3. **Scoped authority** — A manager can approve leave for their team, but not across all teams
4. **Audit trail** — Who changed what, when, and why
5. **Delegation** — Temporary delegation of authority with tracking
6. **Revocation** — Permissions can be revoked immediately

### Current State

`@keel/core` has actor types (`HUMAN`, `AGENT`) but no permission model.
No role-to-permission mapping.
No delegation tracking.

## Decision

Implement a complete RBAC layer:

### Part 1: Permission Model (Migration 004)

Create five tables:

1. **`roles`** — Role definitions
   - `role_key` (e.g., "HR_ADMIN", "PAYROLL_APPROVER")
   - `role_type` (SYSTEM vs CUSTOM)
   - `scope_level` (TENANT, GROUP, ENTITY, BRANCH)
   - Status (ACTIVE, ARCHIVED)

2. **`permissions`** — Fine-grained actions
   - `permission_key` (e.g., "hire_employee", "approve_leave")
   - `permission_type` (ACTION, VIEW, REPORT)
   - `resource` (e.g., "EMPLOYEE", "PAYROLL")
   - `permission_level` (0-100, for hierarchical checking)

3. **`role_permissions`** — Many-to-many junction
   - Links roles to their permissions
   - Unique constraint: one role cannot have same permission twice

4. **`actors`** — Users and agents
   - `actor_kind` (HUMAN or AGENT)
   - `display_name`, `email`
   - Agent-specific fields: `agent_version`, `agent_model_id`
   - Status (ACTIVE, SUSPENDED, ARCHIVED)

5. **`role_assignments`** — Actor → Role at a scope
   - Links `actor` to `role`
   - Scoped to tenant/group/entity/branch
   - Status: ACTIVE, SUSPENDED, EXPIRED, REVOKED
   - `valid_from`, `valid_until` (temporary assignments)
   - Delegation tracking: `delegated_from_assignment_id`, `delegation_reason`
   - Audit: `created_by`, `revoked_by`, `revocation_reason`

6. **`actor_tokens`** — Short-lived OAuth2 tokens (Law 10)
   - Token hash (never store plaintext)
   - Scoped permissions
   - Expires quickly (1 hour for agents, session for humans)
   - Revocable immediately
   - Audit: `ip_address`, `user_agent`

### Part 2: RBAC Engine (@keel/core)

`RBACEngine` class provides:

```typescript
// Permission checks
hasPermission(actor, permission, scope, assignments) → boolean
hasRole(actor, roleKey, scope, assignments) → boolean

// Role queries
getRolesAtScope(scope, assignments) → Role[]
getPermissionsAtScope(scope, assignments) → Permission[]

// Delegation
canDelegate(actor, role, targetActor, scope, assignments) → boolean

// Validity checks
isAssignmentValid(assignment) → boolean
getValidAssignments(assignments) → Assignment[]
```

All methods are **deterministic** (no I/O, no network) and suitable for use in:
- Decision Record generation (reproducible proof)
- Control Gate authorization checks
- Audit log queries

### Part 3: Standard Roles

Six system roles are initialized via seed script (`services/ledger/scripts/seed-system-roles.mjs`):

1. **HR_ADMIN** — Full HR system administration
   - Permissions: hire_employee, terminate_employee, approve_leave, modify_compensation, view_all_data
   - Scope: TENANT

2. **PAYROLL_ADMIN** — Payroll configuration (segregated from PAYROLL_EXECUTOR)
   - Permissions: configure_payroll, configure_taxes, view_payroll_data
   - Scope: ENTITY (per legal entity for multi-entity tenants)

3. **PAYROLL_APPROVER** — Approves payroll runs (segregated from PAYROLL_EXECUTOR)
   - Permissions: approve_payroll_run
   - Scope: ENTITY

4. **PAYROLL_EXECUTOR** — Executes payroll (segregated from PAYROLL_APPROVER)
   - Permissions: execute_payroll_run
   - Scope: ENTITY

5. **MANAGER** — Manages team members
   - Permissions: hire_employee_in_team, schedule_employee, approve_leave_for_team, view_team_data
   - Scope: BRANCH

6. **EMPLOYEE** — Base access
   - Permissions: view_own_data, request_leave, view_team_data
   - Scope: BRANCH

7. **GUEST** — Read-only
   - Permissions: view_report, view_analytics
   - Scope: BRANCH

8. **AGENT** — Agent platform access
   - Permissions: submit_transaction_intent (all actions routed through Control Gate)
   - Scope: ENTITY (scoped by agent's subscription)

## Scope Matching Algorithm

A role assignment applies at a scope if:

1. The assignment's `scopeTenantId` matches the query scope's `scopeTenantId`
2. If the assignment has a `scopeGroupId`, it must match the query scope's `scopeGroupId`
3. If the assignment has a `scopeLegalEntityId`, it must match the query scope's `scopeLegalEntityId`
4. If the assignment has a `scopeBranchId`, it must match the query scope's `scopeBranchId`

**Example:**
- Assignment: `role = HR_ADMIN, scope = Tenant A only` → grants permission at tenant and any group/entity/branch level
- Assignment: `role = MANAGER, scope = Tenant A, Entity X, Branch Y` → grants permission only at that specific branch

## Delegation Model

Temporary delegation of authority:

```typescript
// Delegate a role to another person (temporary)
assignment = {
  actor: Alice,
  role: PAYROLL_APPROVER,
  scope: Entity X,
  valid_from: today,
  valid_until: today + 2 weeks,
  delegated_from_assignment_id: Bob's original PAYROLL_APPROVER assignment
}
```

**Key constraints:**
- Can only delegate a role you currently have (and assignment is ACTIVE)
- Human can only delegate to another human (not to agent)
- Agent can delegate to anyone
- Delegation is logged with reason (e.g., "Bob on vacation")
- Delegation expires at `valid_until` (temporary by design)

## Token Model (Law 10)

Per-actor tokens with scoped authority:

```sql
INSERT INTO actor_tokens (actor_id, token_hash, scope_permissions, scope_legal_entity_id, expires_at)
VALUES (agent_id, sha256(token), ['hire_employee', 'request_leave'], entity_id, now() + interval '1 hour')
```

**Properties:**
- Short-lived (1 hour for agents, session for humans)
- Scoped to specific permissions (not all permissions)
- Scoped to specific entity if needed (multi-entity isolation)
- Immediately revocable (set `revoked_at`)
- Never stored as plaintext (only hash)
- Audited (ip_address, user_agent for humans; logged for agents)

## Consequences

### Positive

- **Compliance** — Every action is auditable to a specific person (or agent with traced lineage)
- **Flexibility** — Customers can create custom roles and permissions
- **Safety** — Delegation is temporary and audited
- **Scalability** — Permission checks are deterministic (no database queries in Control Gate)
- **Revocation** — Permissions revoked immediately; tokens can be revoked in real-time
- **Tokens** — Law 10 compliant: no shared service accounts, short-lived tokens with scoped authority

### Negative

- **Operational overhead** — Customers must manage role assignments (either via UI or API)
- **Permission explosion** — Large customers may have many custom permissions
- **Scope complexity** — Understanding which scope a permission applies at requires care

## Implementation Notes

### Permission Checks in Control Gate

When a request arrives at the Control Gate:

```
1. Authenticate actor (verify token or session)
2. Load actor's role assignments from cache
3. Call RBACEngine.hasPermission(actor, intent.type, intent.scope, assignments)
4. If denied, return 403 Unauthorized
5. If permitted, proceed to validation and execution
```

No database query is needed for permission checking (all in-memory after initial load).

### Caching

Role assignments should be cached per actor with invalidation on assignment changes.
Cache invalidation happens via:
- Event bus notification when assignment is created/revoked
- TTL of 15 minutes (conservative; no long-lived auth decisions in flight)

### Custom Roles

Customers can create custom roles by:
1. Defining permissions in the system (if not already defined)
2. Creating a role record with `role_type = CUSTOM`
3. Linking permissions via `role_permissions` junction table

Standard roles are `role_type = SYSTEM` and cannot be deleted (only archived).

## Alternatives Considered

### Alternative A: ABAC (Attribute-Based Access Control)

**Why not (for Wave 1):** ABAC is more flexible but requires complex rule engines.
RBAC is simpler to implement and audit. We can add ABAC in Wave 2+ for fine-grained resource-level control
(e.g., "can view payroll only for employees in my department").

### Alternative B: Permission inheritance (hierarchical roles)

**Why not:** Would make deletion/modification of roles complex (breaking changes).
Instead, we compose permissions at assignment time (flatten before checking).

### Alternative C: Embedded permissions in events

**Why not:** Events are immutable. We need to change who has permission without rewriting history.

## Related Decisions

- **ADR 0005: Tenancy Kernel** — Roles are scoped to tenancy hierarchy
- **ADR 0007: Segregation of Duties** — RBAC rules are validated against SoD constraints
- **Law 10:** Per-actor identity with short-lived scoped tokens (this ADR implements it)
- **Control Gate (ADR 0004)** — Uses RBACEngine for authorization

## Testing Strategy

### Unit Tests
- Permission checks at each scope level
- Delegation rules (can delegate, cannot delegate)
- Scope matching algorithm
- Token expiration

### Integration Tests
- Cross-tenant isolation (role in Tenant A doesn't apply in Tenant B)
- Hierarchical scope matching (entity-level role applies to branches in that entity)
- Token revocation works immediately
- Delegation tracking is audited

### Fuzz Tests
- Random actor/role/scope combinations → deterministic results
- 10k concurrent permission checks → no race conditions

## Success Criteria

1. All standard roles are seeded and working
2. Permission check is < 1ms (all in-memory)
3. Delegation is tracked and auditable
4. Tokens expire as configured
5. Revocation takes effect immediately
6. Cross-tenant isolation verified by fuzz test
7. All integration tests pass

## References

- **CLAUDE.md § 1:** Law 10 (Per-agent identity with short-lived tokens)
- **ADR 0005:** Tenancy Kernel (roles are scoped to hierarchy)
- **ADR 0007:** Segregation of Duties (SoD rules constrain RBAC)
- **Migration 004:** `services/ledger/migrations/004-create-rbac-tables.sql`
- **RBACEngine:** `packages/core/src/auth/rbac-engine.ts`
- **Types:** `packages/core/src/types/rbac.ts`
