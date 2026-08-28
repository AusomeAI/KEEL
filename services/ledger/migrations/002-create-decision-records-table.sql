-- Migration 002: Create decision_records table (Law 7: Decision Records)
-- Date: 2026-08-28
-- Author: Squad 0 (Platform Kernel)
-- Related: ADR 0004 (Ledger Schema), Law 7 (Decision Records are not optional)

-- Creates the decision records table that stores compliance evidence for every material decision.
-- Decision records link events to the decisions that caused them, providing chain of custody
-- for regulatory audits.

CREATE TABLE IF NOT EXISTS decision_records (
  -- Record identity
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenancy
  tenant_id UUID NOT NULL,
  group_id UUID NOT NULL,
  legal_entity_id UUID NOT NULL,
  branch_id UUID NOT NULL,

  -- Decision classification
  category VARCHAR(64) NOT NULL,             -- e.g., "HIRE", "TERMINATION", "PAY_CHANGE"
  subject_id UUID NOT NULL,                  -- Entity being decided upon (e.g., employee ID)
  transaction_intent_type VARCHAR(128),      -- e.g., "HIRE_EMPLOYEE"

  -- Linked events (array of event IDs that resulted from this decision)
  linked_event_ids UUID[] NOT NULL,

  -- Decision flow (JSON array of decision steps, e.g., manager approval, then HR approval)
  decisions JSONB NOT NULL,

  -- Regulatory evidence (JSON array citing rules and statutory references)
  regulatory_evidence JSONB NOT NULL,

  -- Chain of custody
  previous_record_id UUID REFERENCES decision_records(record_id) ON DELETE RESTRICT,
  record_hash CHAR(64) NOT NULL,             -- SHA-256 hash of this record (for integrity)

  -- Digital signatures (for critical decisions)
  author_signature VARCHAR(512),
  approver_signature VARCHAR(512),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,       -- When this record is no longer needed for compliance
  archived_at TIMESTAMP WITH TIME ZONE,      -- When moved to cold storage

  -- Indexes
  INDEX idx_decision_records_tenant (tenant_id, created_at DESC),
  INDEX idx_decision_records_subject (subject_id),
  INDEX idx_decision_records_hash (record_hash)
);

-- Comment for documentation
COMMENT ON TABLE decision_records IS 'Compliance artifact: signed, hash-chained decision records. Law 7: Every material HR decision emits a Decision Record.';
COMMENT ON COLUMN decision_records.record_hash IS 'SHA-256 hash; enables integrity verification';
COMMENT ON COLUMN decision_records.previous_record_id IS 'Links to prior decision record; forms chain of custody';

-- Enable row-level security (Law 5)
ALTER TABLE decision_records ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only read/write records in their tenant
CREATE POLICY decision_records_tenant_isolation ON decision_records
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

-- Enforce append-only at role level (Law 3, Law 7: decision records are immutable)
GRANT SELECT, INSERT ON decision_records TO keel_app_role;
REVOKE UPDATE, DELETE ON decision_records FROM keel_app_role;
