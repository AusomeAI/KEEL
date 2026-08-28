-- Migration 001: Create events table (bitemporal ledger foundation)
-- Date: 2026-08-28
-- Author: Squad 0 (Platform Kernel)
-- Related: ADR 0001 (Bitemporal Ledger), ADR 0004 (Ledger Schema)

-- Creates the base events table that forms the immutable ledger.
-- All events in KEEL are appended here; none are modified or deleted.

CREATE TABLE IF NOT EXISTS events (
  -- Event identity
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_version INT NOT NULL DEFAULT 1,

  -- Bitemporal dimensions
  -- valid_time: when the fact was true in the business world
  -- transaction_time: when the system recorded the fact
  valid_time TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Tenancy (for RLS and data residency)
  tenant_id UUID NOT NULL,
  group_id UUID NOT NULL,
  legal_entity_id UUID NOT NULL,
  branch_id UUID NOT NULL,

  -- Event classification
  event_type VARCHAR(128) NOT NULL,          -- e.g., "EMPLOYEE_HIRED", "LEAVE_REQUESTED"
  aggregate_id UUID NOT NULL,                -- The entity being changed
  aggregate_type VARCHAR(64) NOT NULL,       -- e.g., "EMPLOYEE", "LEAVE_REQUEST"

  -- Actor and provenance
  actor_kind VARCHAR(16) NOT NULL DEFAULT 'HUMAN' CHECK (actor_kind IN ('HUMAN', 'AGENT')),
  actor_id UUID NOT NULL,                    -- Who recorded this event
  request_id UUID NOT NULL UNIQUE,           -- Idempotency key; prevents duplicate events from retried requests

  -- Event data (immutable JSON payload)
  data JSONB NOT NULL,

  -- Compensation chain (Law 3: corrections via compensating events, not mutations)
  compensates_event_id UUID REFERENCES events(event_id) ON DELETE RESTRICT,

  -- Metadata
  metadata JSONB,

  -- Indexes for query performance
  INDEX idx_events_tenant_time (tenant_id, transaction_time DESC),
  INDEX idx_events_aggregate (aggregate_id, valid_time DESC),
  INDEX idx_events_type (event_type, valid_time DESC),
  INDEX idx_events_request (request_id)
);

-- Comment for documentation
COMMENT ON TABLE events IS 'Bitemporal event ledger. Append-only. Law 3: No UPDATE or DELETE grants.';
COMMENT ON COLUMN events.valid_time IS 'When the fact was true in the business (effective date)';
COMMENT ON COLUMN events.transaction_time IS 'When the system came to believe it (recorded timestamp)';
COMMENT ON COLUMN events.request_id IS 'Unique request ID for idempotency; prevents duplicate events from retries';
COMMENT ON COLUMN events.compensates_event_id IS 'If set, this event corrects a prior event (Law 3: no mutations, only compensating events)';

-- Enable row-level security (Law 5: Tenant isolation in the kernel)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only read/write events in their tenant
CREATE POLICY events_tenant_isolation ON events
  USING (
    -- User can only access events in their assigned tenant context
    -- The tenant_id must match current_setting('keel.tenant_id')
    -- This is set by the application at connection time
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

-- Enforce immutability at the role level (Law 3)
-- The application role gets SELECT and INSERT only; no UPDATE or DELETE
-- This prevents accidental or malicious mutations of history
DO $$
BEGIN
  -- Create the app role if it doesn't exist
  CREATE ROLE keel_app_role WITH LOGIN;
EXCEPTION WHEN OTHERS THEN
  -- Role already exists; ignore
END
$$;

-- Grant permissions: SELECT and INSERT only (no UPDATE, DELETE)
GRANT SELECT, INSERT ON events TO keel_app_role;

-- Explicitly revoke UPDATE and DELETE to enforce append-only at role level
REVOKE UPDATE, DELETE ON events FROM keel_app_role;

-- Create the request_id index for idempotency checks
CREATE UNIQUE INDEX idx_events_request_id ON events(request_id);
