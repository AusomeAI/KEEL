# ADR 0005: Tenancy Kernel Design — Tenant/Group/Entity/Branch Hierarchy

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Squad 0 Lead, Architect  
**Relates to:** CLAUDE.md § 3.6, Law 5, ADR 0001 (Bitemporal Ledger), ADR 0003 (Two-Plane Architecture)

## Context

KEEL is a multi-tenant, multi-company, multi-branch HR system serving customers ranging from small startups (single legal entity) to large enterprises (hundreds of entities across multiple jurisdictions, currencies, and statutory regimes).

The tenancy model must support:

1. **Complete isolation** — Data from Tenant A must never be visible to Tenant B or Tenant A's users without explicit authorization
2. **Hierarchical scoping** — Roles, permissions, and policies are scoped to tenant → group → entity → branch levels
3. **Enforcement at the kernel** — Isolation is enforced by PostgreSQL Row-Level Security (RLS) in the kernel, not by application logic
4. **Statutory compliance** — Each legal entity carries its own tax ID, currency, fiscal calendar, statutory profile, and compliance obligations
5. **Operational flexibility** — Customers can structure their organizations differently (some with many entities, others with one; some with branches, others without)

### Current State

Wave 1 scaffolding has defined UUIDs for the hierarchy (`TenantId`, `GroupId`, `LegalEntityId`, `BranchId`) in `@keel/core` types. The ledger schema (Migration 001-002) has basic tenancy columns but no dedicated tenancy tables.

### The Problem

Without explicit tenancy tables with enforcement rules, we have:
- No validation of hierarchy consistency (orphaned records possible)
- No encryption key management per tenant
- No data residency configuration
- No shift patterns or working time rules per branch
- No audit trail of who created what tenancy structure

## Decision

Implement a complete tenancy kernel in three layers:

### Layer 1: Tenancy Tables (Migration 003)

Create five core tables with full RLS enforcement:

1. **`tenants`** — Top-level customer
   - Encryption key references (KMS)
   - Data residency region
   - Subscription tier
   - Status lifecycle (ACTIVE, SUSPENDED, ARCHIVED)

2. **`groups`** — Business units, holding companies, subsidiaries
   - Parent group link (for nested structures)
   - Statutory profile (e.g., holding company vs operating subsidiary)
   - Inherit data residency from tenant

3. **`legal_entities`** — Companies registered with tax authorities
   - Tax ID (unique per tenant)
   - Country, jurisdiction
   - Currency, fiscal year start/end
   - Statutory profile per jurisdiction
   - Standard working hours (can be overridden per branch)

4. **`branches`** — Physical locations or cost centers
   - Address, city, state, postal code
   - Local working time rules (overrides legal entity defaults)
   - Shift patterns (JSON array of shift definitions)
   - Local statutory registrations (works council ID, etc.)

5. **`positions`** — Job position definitions
   - Parent position (for org chart hierarchy)
   - Status lifecycle

### Layer 2: Hierarchy Validation (Migration 003 Triggers)

Each table has a trigger `validate_tenancy_hierarchy()` that ensures:
- Every group references an existing tenant
- Every legal entity references an existing group in the same tenant
- Every branch references an existing legal entity in the same tenant and group
- Parent/child relationships are consistent

### Layer 3: RLS Enforcement (All Tenancy Tables)

Every table has:
- RLS policy: `WHERE tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)`
- Append-only at role level: `GRANT SELECT, INSERT; REVOKE UPDATE, DELETE` (Law 3)
- Indexed on (tenant_id, status) for efficient lookups

### TenancyKernel Implementation (@keel/core)

Four TypeScript classes provide the kernel interface:

1. **`TenancyKernel`** — Factory and validation
   - `createContext(tenantId, groupId, entityId, branchId)` → `ValidatedTenancyContext`
   - `fromJSON(data)` → `ValidatedTenancyContext`
   - `validateHierarchy(context)` → Result

2. **`ValidatedTenancyContext`** — Immutable, typed context
   - `getTenantId()`, `getGroupId()`, `getLegalEntityId()`, `getBranchId()`
   - `toPgSettings()` → PostgreSQL connection parameters for RLS
   - `isTenantScoped()`, `isGroupScoped()`, `isEntityScoped()`, `isBranchScoped()`

3. **`TenancyContextManager`** — Request-scoped singleton
   - `setContext(context)`, `getContext()` — per-request context
   - `withContext(context, fn)` — scoped execution with automatic cleanup
   - `getCurrentTenantId()` — convenience getter

4. **`TenancyAwareSQLBuilder`** — Query helpers
   - `getTenantIsolationClause(context)` → SQL WHERE clause for tenant_id
   - `getFullHierarchyClause(context)` → Clause for full scope
   - `getEntityIsolationClause(context)` → Clause for entity-level queries
   - `getGroupIsolationClause(context)` → Clause for group-level queries

## Consequences

### Positive

- **Kernel-level enforcement** — RLS policies in PostgreSQL prevent accidental data leakage (Law 5)
- **Consistency** — Triggers prevent orphaned records and hierarchy violations
- **Auditability** — Every tenancy change is logged in the events table (bitemporal)
- **Flexibility** — Customers can structure orgs however they need (1 or 1000 entities)
- **Compliance** — Each entity carries its own legal/fiscal/statutory profile
- **Scalability** — Tenant isolation at the database level scales with customer count

### Negative

- **Operational complexity** — Customers must understand the hierarchy (tenant → group → entity → branch)
- **Migration burden** — Moving entities between groups/tenants is complex and requires careful audit logging
- **Query complexity** — Every query must explicitly pass tenancy scope; no implicit current context available outside request handlers

## Implementation Notes

### Hierarchy Traversal

Applications should never query "upward" in the hierarchy (e.g., "give me all entities in this group").
Instead, every operation should receive explicit tenancy scope.

This prevents:
- Hidden scope creep (accidentally accessing more data than intended)
- Performance issues (cross-tenant queries that bypass RLS)
- Authorization bugs (checking permissions at wrong scope level)

### Data Residency

The `tenants.data_residency_region` field must be checked before:
- Writing data (must write to region-specific database)
- Reading data (must read from region-specific replica)

This is enforced at the application level (not in the database).
Storage will be implemented in Wave 2+ with per-region deployments.

### Encryption Keys

The `tenants.master_key_id` references an AWS KMS key for tenant data encryption.
All sensitive fields (SSN, bank account, health data) are encrypted with this key.
Encryption/decryption happens in the application layer (not in the database).

## Alternatives Considered

### Alternative A: Single flat customer table with type field

**Why not:** Different "levels" (tenant vs entity) have radically different purposes:
- Tenant = billing boundary, data residency, encryption key
- Group = statutory profile, approval chain, budget center
- Entity = currency, tax ID, fiscal calendar
- Branch = location, working time, shift patterns

A single table would require extensive conditional logic in queries.

### Alternative B: Hierarchical JSON in ledger events only

**Why not:** We need to query by hierarchy level independently (e.g., "which employees in this entity?").
Storing structure only in events requires replaying all events to construct hierarchy.

### Alternative C: No hierarchy enforcement (application-only isolation)

**Why not:** This violates Law 5. Application bugs can leak data across tenants.
Database-level enforcement is non-negotiable for regulatory compliance (SOX, GDPR, etc.).

## Related Decisions

- **ADR 0001: Bitemporal Ledger** — Tenancy changes are recorded as compensation events
- **ADR 0003: Two-Plane Architecture** — Tenancy is immutable to agents; they operate within a single tenant context
- **ADR 0004: Bitemporal Ledger Schema** — Events table carries full tenancy scope
- **ADR 0006: RBAC Strategy** — Roles are scoped to tenancy hierarchy
- **ADR 0007: Segregation of Duties** — SoD rules are tenant-scoped

## Testing Strategy

### Unit Tests
- Hierarchy validation: invalid combinations are rejected
- Scope helpers: SQL clauses are correct

### Integration Tests
- Cross-tenant isolation: User A's query cannot access User B's data
- RLS enforcement: Direct SQL queries respect tenant context
- Hierarchy constraints: Orphaned records are prevented

### Fuzz Tests
- Random hierarchy combinations → all valid
- Random invalid combinations → all rejected
- 1000 concurrent requests from different tenants → zero cross-tenant leaks

## Success Criteria

1. All 10 Laws pass CI enforcement (especially Law 5: RLS isolation)
2. Cross-tenant isolation fuzz test passes (10k iterations, zero violations)
3. Hierarchy trigger test passes (invalid combos are rejected)
4. Performance test: querying 10k entities in different tenants < 100ms (with RLS)
5. No SELECT queries bypass RLS (enforced by policy analyzer)

## References

- **CLAUDE.md § 3.6:** Group-native tenancy architectural principle
- **Law 5:** Tenant isolation enforced by PostgreSQL RLS in the kernel
- **ADR 0001:** Bitemporal Ledger (events carry tenancy scope)
- **Migration 003:** `services/ledger/migrations/003-create-tenancy-tables.sql`
- **TenancyKernel:** `packages/core/src/tenancy/tenancy-kernel.ts`
