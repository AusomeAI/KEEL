/**
 * Bitemporal Ledger Schema
 *
 * Creates the append-only event store with:
 * - Valid time: When a fact was true in the business
 * - Transaction time: When we came to believe the fact
 * - Row-level security (RLS) for tenant isolation (Law 5)
 * - No UPDATE or DELETE allowed (Law 3)
 *
 * Migration: 001
 * Applied: Wave 2.1
 */

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable RLS at database level
ALTER SYSTEM SET row_security = on;

-- ============================================================================
-- Tenant & Tenancy Hierarchy (from packages/core)
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL, -- e.g., "US.FEDERAL"
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jurisdiction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jurisdiction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- RLS: Tenants can only see their own data
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Event Store (Append-Only Ledger)
-- ============================================================================

CREATE TABLE ledger_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Bitemporal dimensions
  valid_from TIMESTAMPTZ NOT NULL, -- When this fact is valid (business time)
  valid_until TIMESTAMPTZ DEFAULT NULL, -- When this fact expires
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- When we recorded it

  -- Tenancy scope
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  -- Event metadata
  event_type TEXT NOT NULL, -- e.g., "EMPLOYEE_HIRED", "PAYROLL_RUN", "LEAVE_APPROVED"
  aggregate_id UUID NOT NULL, -- Subject of the event (employee, payroll run, etc.)
  aggregate_type TEXT NOT NULL, -- e.g., "Employee", "PayrollRun", "LeaveRequest"

  -- Actor & authorization
  actor_id UUID NOT NULL, -- Who performed the action
  actor_kind TEXT NOT NULL, -- "HUMAN" | "AGENT"
  approved_by_id UUID, -- If approved by someone else

  -- Data payload
  payload JSONB NOT NULL, -- Event-specific data

  -- Audit trail
  transaction_id UUID NOT NULL, -- Which transaction this came from (Control Gate)
  decision_record_id UUID, -- Link to decision record (Law 7)

  -- Encryption (per-entity)
  kms_key_id UUID, -- Which KMS key was used

  -- Append-only enforcement
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT no_deletes CHECK (true) -- Logical constraint
);

-- Indexes for common queries
CREATE INDEX idx_ledger_tenant ON ledger_events(tenant_id);
CREATE INDEX idx_ledger_aggregate ON ledger_events(aggregate_id, aggregate_type);
CREATE INDEX idx_ledger_event_type ON ledger_events(event_type);
CREATE INDEX idx_ledger_recorded_at ON ledger_events(recorded_at);
CREATE INDEX idx_ledger_valid_from ON ledger_events(valid_from);

-- RLS: Users can only see events for their tenants
ALTER TABLE ledger_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Transaction Intents & Pending Approvals
-- ============================================================================

CREATE TABLE transaction_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tenancy
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Intent metadata
  type TEXT NOT NULL, -- "HIRE_EMPLOYEE", "RUN_PAYROLL", etc.
  subject_id UUID NOT NULL, -- Entity being acted upon

  -- Actor & status
  actor_id UUID NOT NULL,
  actor_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, EXECUTED

  -- Payload & simulation
  payload JSONB NOT NULL,
  simulation_result JSONB, -- Projected effect from Control Gate

  -- Approval chain
  approval_level TEXT, -- MANAGER_APPROVAL, HR_APPROVAL, PAYROLL_SIGN_OFF
  approved_at TIMESTAMPTZ,
  approved_by_id UUID,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by_id UUID,

  -- Ledger linking
  execution_transaction_id UUID, -- After execution
  decision_record_id UUID,

  -- Temporal
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_intents_tenant ON transaction_intents(tenant_id);
CREATE INDEX idx_intents_status ON transaction_intents(status);
CREATE INDEX idx_intents_actor ON transaction_intents(actor_id);
CREATE INDEX idx_intents_submitted ON transaction_intents(submitted_at DESC);

ALTER TABLE transaction_intents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Decision Records (Law 7: Signed, Hash-Chained)
-- ============================================================================

CREATE TABLE decision_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tenancy
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Decision metadata
  category TEXT NOT NULL, -- HIRE, TERMINATE, PAY_CHANGE, etc.
  subject_id UUID NOT NULL,
  transaction_intent_type TEXT,
  transaction_intent_id UUID REFERENCES transaction_intents(id),

  -- Actor & decision flow
  actor_id UUID NOT NULL,
  decisions JSONB NOT NULL, -- Array of decision steps with timestamps

  -- Regulatory evidence
  regulatory_evidence JSONB NOT NULL, -- Array of citations/rules

  -- Chain of custody (Law 7)
  previous_record_id UUID REFERENCES decision_records(id),
  record_hash TEXT NOT NULL, -- SHA-256 of this record

  -- Ledger linking
  ledger_event_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Temporal
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Immutability
  CONSTRAINT immutable_hash CHECK (record_hash IS NOT NULL)
);

CREATE INDEX idx_decisions_tenant ON decision_records(tenant_id);
CREATE INDEX idx_decisions_subject ON decision_records(subject_id);
CREATE INDEX idx_decisions_category ON decision_records(category);
CREATE INDEX idx_decisions_created ON decision_records(created_at DESC);

ALTER TABLE decision_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies (Law 5: Tenant Isolation)
-- ============================================================================

-- Ledger events: Users can only see events for their tenant
CREATE POLICY tenant_isolation_ledger ON ledger_events
  USING (tenant_id = current_setting('keel.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('keel.tenant_id')::uuid);

-- Transaction intents: Users can only see intents for their tenant
CREATE POLICY tenant_isolation_intents ON transaction_intents
  USING (tenant_id = current_setting('keel.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('keel.tenant_id')::uuid);

-- Decision records: Users can only see records for their tenant
CREATE POLICY tenant_isolation_decisions ON decision_records
  USING (tenant_id = current_setting('keel.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('keel.tenant_id')::uuid);

-- ============================================================================
-- Append-Only Enforcement (Law 3)
-- ============================================================================

-- Function to prevent updates/deletes on ledger
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Ledger events are immutable. Use compensating events for corrections.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutable
  BEFORE UPDATE OR DELETE ON ledger_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_modification();

-- ============================================================================
-- Bitemporal Query Support
-- ============================================================================

-- Function to get state as of a specific date
CREATE OR REPLACE FUNCTION get_entity_state_at(
  p_aggregate_id UUID,
  p_as_of TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  v_state JSONB := '{}'::JSONB;
  v_event RECORD;
BEGIN
  -- Build state from all events valid at the given point in time
  FOR v_event IN
    SELECT payload
    FROM ledger_events
    WHERE aggregate_id = p_aggregate_id
      AND recorded_at <= p_as_of
      AND valid_from <= p_as_of
      AND (valid_until IS NULL OR valid_until > p_as_of)
    ORDER BY recorded_at
  LOOP
    -- Merge event payload into state
    v_state := v_state || v_event.payload;
  END LOOP;

  RETURN v_state;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Pending approvals for a tenant
CREATE VIEW v_pending_approvals AS
SELECT
  id,
  tenant_id,
  type,
  subject_id,
  actor_id,
  approval_level,
  submitted_at,
  expires_at
FROM transaction_intents
WHERE status = 'PENDING'
  AND expires_at > CURRENT_TIMESTAMP
ORDER BY submitted_at DESC;

-- Recent ledger events
CREATE VIEW v_recent_events AS
SELECT
  id,
  tenant_id,
  event_type,
  aggregate_id,
  aggregate_type,
  actor_id,
  payload,
  recorded_at,
  valid_from
FROM ledger_events
ORDER BY recorded_at DESC
LIMIT 1000;

-- Audit trail for an entity
CREATE VIEW v_entity_audit_trail AS
SELECT
  e.recorded_at,
  e.event_type,
  e.actor_id,
  e.actor_kind,
  e.approved_by_id,
  e.payload,
  d.decisions,
  d.regulatory_evidence
FROM ledger_events e
LEFT JOIN decision_records d ON d.id = e.decision_record_id
ORDER BY e.recorded_at DESC;
