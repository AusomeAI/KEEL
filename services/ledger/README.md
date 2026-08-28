# @keel/ledger — Bitemporal Event Store

The ledger service: the append-only event store that forms the foundation of KEEL's deterministic core.

**Mission:** Implement the bitemporal ledger design from ADR 0001 and ADR 0004. Enforce Law 3 (append-only) at the database role level. Provide the API that other services use to read events and emit decision records.

## Key Decisions (Wave 1)

1. **Bitemporal events** — Every event carries both valid time (when the fact was true) and transaction time (when recorded)
2. **Append-only by design** — `UPDATE` and `DELETE` are revoked at the PostgreSQL role level
3. **Tenant isolation via RLS** — Row-level security enforces tenant boundaries
4. **Compensation chains** — Corrections are new events that reference the events they reverse, not mutations
5. **Idempotency via request_id** — Retried requests produce the same result (unique constraint)
6. **Decision records** — Every material decision is signed and hash-chained for compliance

## Schema

See [ADR 0004: Bitemporal Ledger Schema](../../docs/adr/0004-bitemporal-ledger-schema.md) for the complete design.

### Core Tables

- **events** — The immutable event log
- **decision_records** — Signed compliance evidence
- **{type}_events** — Event-specific variant tables (e.g., employee_hired_events)
- **{type}_current_state** — Projections for efficient current-state queries (e.g., employee_current_state)

## API (Wave 2+)

The ledger service exposes a Fastify API:

```
POST   /ledger/events              — Append an event
GET    /ledger/events/:id          — Fetch an event
GET    /ledger/events/aggregate/:id — Fetch all events for an aggregate
GET    /ledger/current-state/:type/:id — Fetch current state
POST   /ledger/decision-records    — Record a decision
GET    /ledger/decision-records/:id — Fetch a decision record
```

## Running Migrations

```bash
# Create database and run migrations
pnpm --filter @keel/ledger run migrate

# This will:
# 1. Create the events table (001-create-events-table.sql)
# 2. Create the decision_records table (002-create-decision-records-table.sql)
# 3. Set up RLS policies and role permissions
# 4. Verify append-only constraints
```

## Laws Enforced

- **Law 1** — No LLM/model/agent imports (verified by dependency-cruiser)
- **Law 3** — Ledger is append-only; `UPDATE`/`DELETE` revoked at role level
- **Law 5** — Tenant isolation via PostgreSQL RLS
- **Law 7** — Decision records required for material decisions

## Testing

```bash
# Run all ledger tests
pnpm --filter @keel/ledger test

# Run L3 tests (no agent plane, no LLM endpoints)
pnpm --filter @keel/ledger test:l3

# Watch mode
pnpm --filter @keel/ledger test:watch
```

## Development

```bash
# Build the ledger service
pnpm --filter @keel/ledger build

# Type-check
pnpm --filter @keel/ledger typecheck

# Lint
pnpm --filter @keel/ledger lint

# Format
pnpm --filter @keel/ledger format
```

## Wave 1 Scope

- ✅ Event and decision record table creation
- ✅ Append-only enforcement at role level
- ✅ RLS policies for tenant isolation
- ✅ Migration framework
- 🔄 Fastify API endpoints (in progress)
- 🔄 Projection refresh logic (in progress)

## Wave 2+ Scope

- Event stream to Kafka
- Projection materialized views
- Event schema versioning and migration
- Compensation event support
- Search and filtering via OpenSearch
- Archival and retention policies

## Important Notes

### No LLM Integration

This service is part of the deterministic core. It has zero dependencies on LLM providers or agent frameworks. All decision-making is deterministic and auditable.

### Idempotency

The unique constraint on `events.request_id` ensures that a retried request (same `request_id`) will not create duplicate events. This is critical for safe retry semantics.

### Tenant Isolation

Every query automatically filters by tenant via PostgreSQL RLS policies. A tenant cannot read or write events outside their tenant context, even if they try.

### Chain of Custody

Decision records link to events and are hash-chained to previous records. This forms an unbroken audit trail for regulatory compliance.

## References

- [CLAUDE.md § Architecture](../../CLAUDE.md#architecture-the-two-plane-model)
- [ADR 0001 — Bitemporal Ledger Decision](../../docs/adr/0001-bitemporal-ledger-over-snapshot.md)
- [ADR 0004 — Ledger Schema Design](../../docs/adr/0004-bitemporal-ledger-schema.md)
- [@keel/core — Platform Kernel](../packages/core)
