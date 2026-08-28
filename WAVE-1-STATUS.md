# Wave 1 Status: Foundations Scaffolding

**Commit:** `feat: scaffold Wave 1 foundations with core package and bitemporal ledger schema`

**Date:** 2026-08-28

**Squad:** Squad 0 — Platform Kernel

---

## ✅ Completed: Wave 1 Scaffolding (Iteration 1)

### Monorepo Infrastructure

- ✅ Directory structure created (apps, services, packages, packs)
- ✅ Root `tsconfig.json` with path aliases
- ✅ Root `.prettierrc.json` with project formatting rules
- ✅ `pnpm-workspace.yaml` already configured with all packages

### @keel/core Package (Platform Kernel)

The deterministic core's foundational types. **No LLM imports (Law 1).**

**Type Definitions:**

- ✅ `Money` type (integer minor units + currency + scale) — Law 4
- ✅ `Duration` type (integer minutes) — Law 4
- ✅ `Actor` type (HUMAN | AGENT) — Law 10
- ✅ `TenantContext` (tenant/group/entity/branch hierarchy) — Law 5
- ✅ `TransactionIntent` (schema-validated proposals) — Law 2
- ✅ `LedgerEvent` (bitemporal event model) — Law 3
- ✅ `DecisionRecord` (signed, hash-chained compliance evidence) — Law 7
- ✅ `Result<T>` type (recoverable errors)
- ✅ Error classes (AuthenticationError, ValidationError, ControlGateError, etc.)

**Module Stubs:**

- ✅ `tenancy/` — To implement Tenant/Group/Entity/Branch kernel (Wave 1+)
- ✅ `auth/` — To implement RBAC/ABAC/SoD (Wave 1+)
- ✅ `ledger/` — To implement event store queries (Wave 1+)
- ✅ `control-gate/` — To implement transaction processing (Wave 1+)

**Documentation:**

- ✅ `packages/core/README.md` — Type usage guide and Wave 1 deliverables

### @keel/ledger Service (Bitemporal Event Store)

The append-only ledger service. **No LLM imports (Law 1). Append-only enforced at PostgreSQL role level (Law 3).**

**Database Schema:**

- ✅ `migrations/001-create-events-table.sql`
  - Core `events` table with bitemporal dimensions
  - Tenant isolation via RLS
  - Append-only constraints (UPDATE/DELETE revoked at role level)
  - Idempotency via unique `request_id`
  - Compensation chain support

- ✅ `migrations/002-create-decision-records-table.sql`
  - `decision_records` table for signed compliance evidence
  - Links events to decisions
  - Hash-chaining for chain of custody
  - Tenant isolation via RLS

**Code:**

- ✅ `services/ledger/src/index.ts` — Service stub
- ✅ Service `package.json` and `tsconfig.json`

**Documentation:**

- ✅ `services/ledger/README.md` — Schema overview and Wave 1 scope
- ✅ `docs/adr/0004-bitemporal-ledger-schema.md` — Full design decision (includes query patterns)

### ADRs Filed

- ✅ ADR 0004: Bitemporal Ledger Schema
  - Explains core `events` table design
  - Rationale for bitemporal dimensions
  - RLS and append-only enforcement
  - Decision records for compliance
  - Query patterns
  - Testing strategy

### Package Scaffolds

All packages and services created with placeholder `package.json` files:

- ✅ `packages/policy` — Policy DSL and compiler
- ✅ `packages/calc` — Rust/WASM calculation kernel
- ✅ `packages/design-system` — Keel DS
- ✅ `packages/sdk` — Partner integration SDK
- ✅ `packages/testing` — Golden dataset harness
- ✅ `services/gate` — Control Gate implementation
- ✅ `services/workflow` — Temporal.io workflows
- ✅ `services/payroll-run` — Payroll orchestration
- ✅ `services/integration` — ERP/GL/banking connectors
- ✅ `services/reporting` — Analytics and warehouse
- ✅ `services/agent-plane` — Physically separate AI plane
- ✅ `apps/web`, `apps/mobile`, `apps/kiosk`, `apps/admin` — Frontend applications
- ✅ `packs/us`, `packs/eu`, `packs/apac` — Jurisdiction packs

---

## 🔄 Next Steps: Wave 1 Core Implementation

### Immediate Priority (This Week)

1. **Implement @keel/core tenancy kernel**
   - Tenant/Group/Entity/Branch hierarchy validation
   - Tenancy scope enforcement
   - RLS context setting helpers

2. **Implement @keel/core authorisation layer**
   - RBAC roles and permissions
   - ABAC attribute matching
   - Segregation of duties matrix

3. **Implement @keel/ledger Fastify API**
   - POST /ledger/events — Append event
   - GET /ledger/events/:id — Fetch event
   - GET /ledger/aggregate/:id — Fetch aggregate's events
   - POST /ledger/decision-records — Record decision
   - Error handling with Law 3 validation

4. **Create @keel/core Control Gate contract**
   - TransactionIntent processing pipeline
   - Autonomy level checking
   - Approval routing logic (stubs)

### Phase 2 (Next Sprint)

5. **Implement @keel/policy DSL**
   - Grammar and parser for policy language
   - Compiler to rule graph
   - Golden dataset test harness

6. **Create @keel/calc skeleton**
   - Rust/WASM project setup
   - Pure function framework
   - Test infrastructure

7. **Build services/gate Control Gate service**
   - Full implementation of 9-step contract
   - Tenant isolation enforcement
   - Approval workflow routing

8. **Write L3 test harness**
   - Test entire hire-to-pay cycle
   - Verify deterministic-only operation
   - Blackhole model endpoints

### Phase 3 (Wave 1 Exit)

9. **Manual UI for first TransactionIntent**
   - HIRE_EMPLOYEE in web app
   - Connected to Control Gate
   - L3 passing

10. **Decision Record signing**
    - Digital signature infrastructure
    - Hash-chaining verification
    - Compliance evidence export

11. **L3 Game-day Test**
    - Full hire-to-pay with Agent Plane scaled to zero
    - Model endpoints blackholed
    - All 10 Laws verified

---

## 🚀 How to Run

### Install Dependencies

```bash
pnpm install
```

### Build Core Package

```bash
pnpm --filter @keel/core build
pnpm --filter @keel/core typecheck
```

### Run Core Tests

```bash
pnpm --filter @keel/core test
```

### Run CI Law Checks

```bash
pnpm run ci:laws
```

This will verify:
- Law 1: No LLM imports in core packages (dependency-cruiser)
- Law 3: Ledger append-only enforcement (verify-ledger-append-only.mjs)
- (Law 2 check will pass once we add TransactionIntent routes)

---

## 📋 Laws Satisfied in This Iteration

| Law | Status | Evidence |
|-----|--------|----------|
| Law 1 | ✅ | @keel/core has zero LLM imports; dependency-cruiser enforces |
| Law 2 | ⏳ | TransactionIntent types defined; routes manifest not yet created |
| Law 3 | ✅ | Ledger schema: UPDATE/DELETE revoked at role level |
| Law 4 | ✅ | Money and Duration types prevent floating-point arithmetic |
| Law 5 | ✅ | RLS policies on events and decision_records tables |
| Law 6 | ⏳ | Golden dataset harness skeleton in place |
| Law 7 | ✅ | DecisionRecord type with signatures and chain-of-custody |
| Law 8 | ⏳ | L3 test infrastructure planned |
| Law 9 | ⏳ | AutonomyLevel enum defined in TransactionIntent; enforcement in Gate (Wave 1+) |
| Law 10 | ✅ | Actor type with HUMAN/AGENT distinction; short-lived tokens in design |

---

## 📚 Key Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Architecture and Ten Laws
- **[05-Unified-Build-Brief-for-Agent-Teams.md](./05-Unified-Build-Brief-for-Agent-Teams.md)** § 5 — Control Gate contract
- **[docs/adr/0001-bitemporal-ledger-over-snapshot.md](./docs/adr/0001-bitemporal-ledger-over-snapshot.md)** — Bitemporal decision
- **[docs/adr/0004-bitemporal-ledger-schema.md](./docs/adr/0004-bitemporal-ledger-schema.md)** — Schema design (NEW)
- **[packages/core/README.md](./packages/core/README.md)** — Type usage guide
- **[services/ledger/README.md](./services/ledger/README.md)** — Ledger service overview

---

## ⚠️ Important Notes

### No Floating-Point Arithmetic

```typescript
// ❌ WRONG
const salary = 123456.78; // Floating-point precision errors

// ✅ RIGHT
const salary = fromDecimal("123456.78", "USD", 2);
// { amount: 12345678, currency: "USD", scale: 2 }
```

### Append-Only is Non-Negotiable

```sql
-- ❌ This will fail at the role level
UPDATE events SET data = '{}' WHERE event_id = ...;
REVOKE UPDATE ON events: Permission denied

-- ✅ Correct way: compensate with a new event
INSERT INTO events (event_id, ..., data, compensates_event_id)
VALUES (new_uuid(), ..., new_data, old_event_id);
```

### Every TransactionIntent Needs a UI Route

Before any agent can use a `HIRE_EMPLOYEE` intent:
1. Add it to the TransactionIntent registry in @keel/core
2. Create a human UI route in apps/web/src/routes.manifest.json
3. The CI check `verify-transaction-intent-routes.mjs` will fail until both exist

---

## 🎯 Success Criteria (End of Wave 1)

An engineer can run:

```bash
pnpm keel:l3
```

With all model endpoints blackholed and complete a full hire-to-pay cycle through the UI.

This commit gets us ~15% of the way there. The core types and ledger schema form the bedrock; everything else builds on top.
