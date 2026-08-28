# ADR 0004: Bitemporal Ledger Schema and Event Store

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** Squad 0 (Platform Kernel), CTO  
**Relates to:** ADR 0001 (Bitemporal Ledger decision), Law 1 (Append-only), Law 5 (Tenant isolation), Law 7 (Decision Records)

## Context

ADR 0001 decided that KEEL uses a bitemporal event store with append-only events. This ADR documents the PostgreSQL schema design that enforces this decision at the database role level.

The schema must:

1. **Enforce immutability** — `UPDATE` and `DELETE` grants are revoked on event tables
2. **Track both time dimensions** — valid time (business effective date) and transaction time (when recorded)
3. **Support tenant isolation** — every event carries tenant context; row-level security enforces multi-tenancy
4. **Enable efficient queries** — projections and materialized views for "current state" queries
5. **Support compensating events** — corrections reference the events they reverse
6. **Maintain chain of custody** — decision records link to events that resulted from them

## Design Decision

### Core Event Table

```sql
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_version INT NOT NULL DEFAULT 1,
  
  -- Bitemporal dimensions
  valid_time TIMESTAMP WITH TIME ZONE NOT NULL,    -- When fact was true (effective date)
  transaction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- When recorded
  
  -- Tenancy (enforced by RLS)
  tenant_id UUID NOT NULL,
  group_id UUID NOT NULL,
  legal_entity_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  
  -- Event metadata
  event_type VARCHAR(128) NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  
  -- Actor and provenance
  actor_kind VARCHAR(16) NOT NULL CHECK (actor_kind IN ('HUMAN', 'AGENT')),
  actor_id UUID NOT NULL,
  request_id UUID NOT NULL,
  
  -- Event data (immutable JSON)
  data JSONB NOT NULL,
  
  -- Compensation chain
  compensates_event_id UUID REFERENCES events(event_id),
  
  -- Metadata
  metadata JSONB,
  
  -- Indexes
  INDEX idx_events_tenant_time (tenant_id, transaction_time DESC),
  INDEX idx_events_aggregate (aggregate_id, valid_time DESC),
  INDEX idx_events_type (event_type, valid_time DESC),
  INDEX idx_events_request (request_id),
  UNIQUE(request_id)  -- Idempotency key
);

-- Partitioning by tenant for data residency and query performance
CREATE TABLE events_tenant_01 PARTITION OF events
  FOR VALUES IN ('tenant-01-uuid');  -- Per tenant

-- Enforce immutability at role level (Law 3)
REVOKE UPDATE, DELETE ON events FROM app_role;
GRANT SELECT, INSERT ON events TO app_role;

-- Row-level security (Law 5)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_tenant_isolation ON events
  USING (tenant_id = current_setting('keel.tenant_id')::uuid);
```

### Event Variant Tables

For type-specific event data, we create tables per event type that reference the main events table:

```sql
CREATE TABLE employee_hired_events (
  event_id UUID PRIMARY KEY REFERENCES events(event_id) ON DELETE CASCADE,
  
  employee_id UUID NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  employment_type VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  legal_entity_id UUID NOT NULL
);

-- Append-only constraint
REVOKE UPDATE, DELETE ON employee_hired_events FROM app_role;
GRANT SELECT, INSERT ON employee_hired_events TO app_role;
```

### Decision Records Table

```sql
CREATE TABLE decision_records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenancy
  tenant_id UUID NOT NULL,
  group_id UUID NOT NULL,
  legal_entity_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  
  -- Decision metadata
  category VARCHAR(64) NOT NULL,
  subject_id UUID NOT NULL,
  transaction_intent_type VARCHAR(128),
  
  -- Linked events
  linked_event_ids UUID[] NOT NULL,
  
  -- Decision flow (JSON array of decisions)
  decisions JSONB NOT NULL,
  
  -- Regulatory evidence
  regulatory_evidence JSONB NOT NULL,
  
  -- Chain of custody
  previous_record_id UUID REFERENCES decision_records(record_id),
  record_hash CHAR(64) NOT NULL,  -- SHA-256
  
  -- Signatures
  author_signature VARCHAR(512),
  approver_signature VARCHAR(512),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_decision_records_tenant (tenant_id, created_at DESC),
  INDEX idx_decision_records_subject (subject_id),
  INDEX idx_decision_records_hash (record_hash)
);

-- Append-only
REVOKE UPDATE, DELETE ON decision_records FROM app_role;
GRANT SELECT, INSERT ON decision_records TO app_role;

-- RLS
ALTER TABLE decision_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_records_tenant_isolation ON decision_records
  USING (tenant_id = current_setting('keel.tenant_id')::uuid);
```

### Projections Table

For high-performance queries of "current state," we maintain a materialized view:

```sql
CREATE TABLE employee_current_state (
  employee_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  group_id UUID NOT NULL,
  legal_entity_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  
  -- Current values (reconstructed from events)
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  employment_type VARCHAR(32),
  start_date DATE,
  end_date DATE,
  
  -- Bitemporal metadata
  valid_time TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  last_event_id UUID,
  INDEX idx_projection_tenant (tenant_id)
);

-- Projection is computed, not inserted directly
REVOKE ALL ON employee_current_state FROM app_role;
GRANT SELECT ON employee_current_state TO app_role;
```

## Consequences

### Positive

- **Database-enforced immutability** — `UPDATE`/`DELETE` restrictions at the role level make it impossible to accidentally mutate history
- **Bitemporal tracking** — both `valid_time` and `transaction_time` are first-class columns, enabling "as-of" queries
- **Tenant isolation by default** — RLS policies on every table eliminate isolation bugs hidden in application logic
- **Chain of custody** — decision records link to events, providing audit trail for compliance
- **Scalability** — partitioning by tenant improves query performance and enables data residency control
- **Idempotency** — unique constraint on `request_id` prevents duplicate events from retried requests

### Negative

- **Complex queries** — reconstructing current state requires joining events and projections
- **Projection maintenance** — materialized views must be kept in sync with event log (requires careful trigger design)
- **Schema migrations** — adding new event types requires new tables; requires coordination during deployment
- **Storage overhead** — events consume more disk than snapshots (mitigated by partitioning and compression)

## Implementation Notes

### Phase 1 (Wave 1 Foundations)

1. Create base `events` table with append-only constraints
2. Create `employee_hired_events` as pilot event type
3. Create `decision_records` table
4. Write schema migration and CI test to verify append-only enforcement
5. Build projection for `employee_current_state`

### Phase 2 (Wave 2+)

1. Add event types for each module (e.g., `leave_request_events`, `payroll_run_events`)
2. Build trigger-based projection refresh
3. Add Kafka stream for event replication
4. Implement event schema migration strategy

### Query Patterns

**Current state (from projection):**
```sql
SELECT * FROM employee_current_state
WHERE employee_id = $1
  AND valid_time <= $2
  AND transaction_time <= CURRENT_TIMESTAMP;
```

**Historical state (as-of date):**
```sql
SELECT * FROM employee_current_state
WHERE employee_id = $1
  AND valid_time <= $2
  AND transaction_time <= $3;
```

**Event audit trail:**
```sql
SELECT * FROM events
WHERE aggregate_id = $1
ORDER BY transaction_time DESC;
```

## Related ADRs

- ADR 0001: Bitemporal Ledger Over Snapshot (the decision this implements)
- ADR 0002: Policy-as-Code (policies execute against the ledger)
- ADR 0003: Two-Plane Architecture (the ledger is the core)

## Testing

The CI law `verify-ledger-append-only.mjs` verifies:
1. No `UPDATE` or `DELETE` grants on event tables
2. Event table names follow `*_events` convention
3. Schema enforces immutability

L3 tests verify:
1. Events cannot be mutated once inserted
2. Compensating events correctly reverse previous events
3. As-of queries reconstruct historical state correctly
4. Projections stay in sync with events
