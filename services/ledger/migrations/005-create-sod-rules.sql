-- Migration 005: Create Segregation of Duties (SoD) enforcement tables
-- Date: 2026-08-28
-- Author: Squad 0 (Platform Kernel)
-- Related: ADR 0007 (Segregation of Duties Matrix), CLAUDE.md § 1 (Law 5, Law 10)
-- Laws: Law 5 (Tenant isolation), Law 10 (Per-actor accountability)

-- Creates the SoD matrix: rules preventing conflicting role assignments within a scope.
-- Ensures internal control: no person can both approve payroll and execute it, etc.

-- ============================================================================
-- SOD_RULES TABLE: Conflict definitions (which roles cannot coexist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sod_rules (
  -- Identity
  sod_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Rule metadata
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ARCHIVED')),

  -- Scope level (at which hierarchy level this rule applies)
  scope_level VARCHAR(32) NOT NULL CHECK (scope_level IN ('TENANT', 'GROUP', 'ENTITY', 'BRANCH')),

  -- Conflicting roles: role A and role B cannot both be assigned to the same actor at the same scope
  role_a_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  role_b_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,

  -- Rule details
  control_objective VARCHAR(128),             -- e.g., "Segregate financial approval from execution"
  statutory_reference VARCHAR(255),          -- e.g., "SOX 302, Internal Accounting Controls"
  enforcement_type VARCHAR(32) NOT NULL DEFAULT 'HARD' CHECK (enforcement_type IN (
    'HARD',       -- Violation is never allowed; system rejects role assignment
    'SOFT',       -- Violation is allowed with approval from compliance
    'AUDIT_ONLY'  -- Violation is allowed but logged for audit
  )),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,

  -- Constraints
  UNIQUE(tenant_id, role_a_id, role_b_id),   -- (A, B) and (B, A) are the same rule
  CHECK (role_a_id <> role_b_id),            -- A role cannot conflict with itself
  CHECK (role_a_id < role_b_id),             -- Enforce canonical order to prevent duplicate rules

  -- Indexes
  INDEX idx_sod_rules_tenant (tenant_id),
  INDEX idx_sod_rules_status (status, tenant_id),
  INDEX idx_sod_rules_role_a (role_a_id),
  INDEX idx_sod_rules_role_b (role_b_id)
);

COMMENT ON TABLE sod_rules IS 'Segregation of Duties: role A and role B cannot both be assigned to the same actor at the same scope.';
COMMENT ON COLUMN sod_rules.enforcement_type IS 'HARD: reject assignment; SOFT: allow with approval; AUDIT_ONLY: allow but audit';
COMMENT ON COLUMN sod_rules.statutory_reference IS 'Regulatory citation for this SoD rule (e.g., SOX, GDPR, local labor law)';

ALTER TABLE sod_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY sod_rules_tenant_isolation ON sod_rules
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON sod_rules TO keel_app_role;
REVOKE UPDATE, DELETE ON sod_rules FROM keel_app_role;

-- ============================================================================
-- SOD_VIOLATIONS TABLE: Audit log of SoD violations
-- ============================================================================
CREATE TABLE IF NOT EXISTS sod_violations (
  -- Identity
  violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Violation details
  sod_rule_id UUID NOT NULL REFERENCES sod_rules(sod_rule_id) ON DELETE RESTRICT,
  actor_id UUID NOT NULL REFERENCES actors(actor_id) ON DELETE RESTRICT,

  -- Scope at which violation occurred
  scope_level VARCHAR(32) NOT NULL,
  scope_tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  scope_group_id UUID REFERENCES groups(group_id) ON DELETE RESTRICT,
  scope_legal_entity_id UUID REFERENCES legal_entities(legal_entity_id) ON DELETE RESTRICT,
  scope_branch_id UUID REFERENCES branches(branch_id) ON DELETE RESTRICT,

  -- Violation status
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',           -- New violation, not yet reviewed
    'ACKNOWLEDGED',   -- Violation noted but decision pending
    'APPROVED',       -- Violation approved (e.g., SOFT enforcement with exception)
    'REJECTED',       -- Violation rejected; role assignment will not proceed
    'REMEDIATED'      -- One of the conflicting assignments has been removed
  )),

  -- Roles involved
  conflict_role_a_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  conflict_role_b_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,

  -- Assignment that triggered violation
  attempted_assignment_id UUID REFERENCES role_assignments(assignment_id) ON DELETE SET NULL,

  -- Reason for violation (if approved)
  approval_reason TEXT,

  -- Audit
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detected_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,

  -- Indexes
  INDEX idx_sod_violations_tenant (tenant_id),
  INDEX idx_sod_violations_actor (actor_id),
  INDEX idx_sod_violations_status (status, tenant_id),
  INDEX idx_sod_violations_detected (detected_at DESC),
  INDEX idx_sod_violations_scope (scope_legal_entity_id)
);

COMMENT ON TABLE sod_violations IS 'Audit log of SoD violations. Law 5: Tenant-scoped. Every violation is logged for compliance review.';
COMMENT ON COLUMN sod_violations.status IS 'OPEN → ACKNOWLEDGED → (APPROVED|REJECTED) or REMEDIATED';
COMMENT ON COLUMN sod_violations.attempted_assignment_id IS 'The role_assignments record that caused the violation (may be NULL if assignment failed before insertion)';

ALTER TABLE sod_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sod_violations_tenant_isolation ON sod_violations
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON sod_violations TO keel_app_role;
REVOKE UPDATE, DELETE ON sod_violations FROM keel_app_role;

-- ============================================================================
-- SOD_VIOLATION_ATTACHMENTS TABLE: Evidence files for violations
-- ============================================================================
CREATE TABLE IF NOT EXISTS sod_violation_attachments (
  -- Identity
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Foreign key
  violation_id UUID NOT NULL REFERENCES sod_violations(violation_id) ON DELETE CASCADE,

  -- Attachment details
  filename VARCHAR(512) NOT NULL,
  file_url VARCHAR(2048),                    -- S3 URL or other storage reference
  file_hash VARCHAR(128),                    -- SHA-256 hash of file
  file_size_bytes INT,

  -- Audit
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_by UUID NOT NULL,

  -- Indexes
  INDEX idx_sod_violation_attachments_violation (violation_id),
  INDEX idx_sod_violation_attachments_tenant (tenant_id)
);

COMMENT ON TABLE sod_violation_attachments IS 'Evidence attachments (approval emails, exception justifications, etc.) for SoD violations.';

ALTER TABLE sod_violation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sod_violation_attachments_tenant_isolation ON sod_violation_attachments
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON sod_violation_attachments TO keel_app_role;
REVOKE UPDATE, DELETE ON sod_violation_attachments FROM keel_app_role;

-- ============================================================================
-- CHECK_SOD_COMPLIANCE FUNCTION: Validates SoD before role assignment
-- ============================================================================
-- Called by services before inserting into role_assignments
-- Returns violations if any exist; application must decide how to handle

CREATE OR REPLACE FUNCTION check_sod_compliance(
  p_actor_id UUID,
  p_role_id UUID,
  p_tenant_id UUID,
  p_group_id UUID,
  p_legal_entity_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  violation_count INT,
  violations JSON
) AS $$
DECLARE
  v_conflicts JSON;
  v_count INT;
BEGIN
  -- Find conflicting roles: any role already assigned to this actor at this scope
  -- that has a SoD rule against the new role
  WITH conflicts AS (
    SELECT DISTINCT
      sr.sod_rule_id,
      sr.rule_name,
      sr.enforcement_type,
      CASE WHEN sr.role_a_id = p_role_id THEN sr.role_b_id ELSE sr.role_a_id END AS conflicting_role_id,
      r.role_key AS conflicting_role_key,
      sr.control_objective,
      sr.statutory_reference
    FROM sod_rules sr
    JOIN roles r ON (sr.role_a_id = r.role_id OR sr.role_b_id = r.role_id)
    WHERE sr.tenant_id = p_tenant_id
      AND sr.status = 'ACTIVE'
      AND (sr.role_a_id = p_role_id OR sr.role_b_id = p_role_id)
      AND EXISTS (
        SELECT 1
        FROM role_assignments ra
        WHERE ra.actor_id = p_actor_id
          AND ra.role_id = (CASE WHEN sr.role_a_id = p_role_id THEN sr.role_b_id ELSE sr.role_a_id END)
          AND ra.status IN ('ACTIVE', 'SUSPENDED')
          -- Scope must match for SoD enforcement
          AND ra.scope_branch_id IS NOT DISTINCT FROM p_branch_id
          AND ra.scope_legal_entity_id IS NOT DISTINCT FROM p_legal_entity_id
          AND ra.scope_group_id IS NOT DISTINCT FROM p_group_id
          AND ra.scope_tenant_id = p_tenant_id
      )
  )
  SELECT
    COUNT(*)::INT,
    COALESCE(json_agg(json_build_object(
      'sod_rule_id', conflicts.sod_rule_id,
      'rule_name', conflicts.rule_name,
      'enforcement_type', conflicts.enforcement_type,
      'conflicting_role_key', conflicts.conflicting_role_key,
      'control_objective', conflicts.control_objective,
      'statutory_reference', conflicts.statutory_reference
    )), '[]'::json)
  INTO v_count, v_conflicts
  FROM conflicts;

  RETURN QUERY SELECT v_count, v_conflicts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_sod_compliance(UUID, UUID, UUID, UUID, UUID, UUID) IS
  'Check if assigning a role to an actor violates any SoD rules at the given scope. Returns violations with enforcement type.';

-- ============================================================================
-- ENFORCE_SOD_TRIGGER: Enforce SoD on role assignment (for HARD violations)
-- ============================================================================
-- This trigger is called BEFORE inserting into role_assignments
-- For HARD violations, it raises an exception
-- For SOFT violations, it logs but allows (application will create violation record)

CREATE OR REPLACE FUNCTION enforce_sod_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_violation_count INT;
  v_violations JSON;
  v_hard_conflict BOOLEAN;
BEGIN
  -- Check for SoD conflicts
  SELECT
    violation_count,
    violations
  INTO v_violation_count, v_violations
  FROM check_sod_compliance(
    NEW.actor_id,
    NEW.role_id,
    NEW.scope_tenant_id,
    NEW.scope_group_id,
    NEW.scope_legal_entity_id,
    NEW.scope_branch_id
  );

  -- If there are any violations, check enforcement type
  IF v_violation_count > 0 THEN
    -- Check if any violation is HARD (reject immediately)
    v_hard_conflict := EXISTS (
      SELECT 1
      FROM json_array_elements(v_violations) AS violation
      WHERE violation->>'enforcement_type' = 'HARD'
    );

    IF v_hard_conflict THEN
      RAISE EXCEPTION 'SoD violation: Cannot assign role (HARD constraint) - %', v_violations;
    END IF;
    -- If SOFT or AUDIT_ONLY, allow the assignment but the application will create a violation record
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_sod_on_assignment
BEFORE INSERT ON role_assignments
FOR EACH ROW EXECUTE FUNCTION enforce_sod_trigger();

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration establishes Segregation of Duties (SoD) enforcement.
--
-- Key design decisions:
-- 1. SoD rules are explicit: role A and role B cannot coexist at same scope
-- 2. Three enforcement levels: HARD (reject), SOFT (allow with approval), AUDIT_ONLY (log)
-- 3. Violations are audited in sod_violations table
-- 4. HARD violations trigger exceptions at database level (prevent insertion)
-- 5. SOFT violations are allowed but logged for compliance review
--
-- Law 5 compliance: Every table is tenant-scoped with RLS enforcement
-- Law 10 compliance: Every violation is attributed to an actor and logged
-- Law 3 compliance: SoD violations are append-only audit log
--
-- Standard SoD rules include:
-- 1. Cannot be both PAYROLL_APPROVER and PAYROLL_EXECUTOR in same scope
-- 2. Cannot be both HIRING_MANAGER and BACKGROUND_CHECK_APPROVER in same scope
-- 3. Cannot be both EMPLOYEE and MANAGER of same employee (potential conflict of interest)
--
-- See: services/ledger/scripts/seed-sod-rules.mjs for standard rule initialization
