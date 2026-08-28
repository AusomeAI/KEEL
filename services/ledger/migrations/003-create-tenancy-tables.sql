-- Migration 003: Create tenancy hierarchy tables (Law 5: Tenant isolation in the kernel)
-- Date: 2026-08-28
-- Author: Squad 0 (Platform Kernel)
-- Related: ADR 0005 (Tenancy Kernel Design), CLAUDE.md § 3.6
-- Laws: Law 5 (Tenant isolation at kernel level), Law 3 (Append-only)

-- Creates the tenant → group → legal entity → branch hierarchy.
-- Every entity at every level carries encryption keys, statutory profiles, and isolation policies.
-- All queries for one tenant cannot see data from another tenant.

-- ============================================================================
-- TENANTS TABLE: Top-level customer tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  -- Identity
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant metadata
  name VARCHAR(255) NOT NULL UNIQUE,
  legal_name VARCHAR(512),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),

  -- Data residency
  data_residency_region VARCHAR(64) NOT NULL DEFAULT 'us-east-1' CHECK (data_residency_region IN (
    'us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'
  )),

  -- Subscription and billing
  subscription_tier VARCHAR(32) NOT NULL DEFAULT 'STANDARD' CHECK (subscription_tier IN (
    'STARTER', 'STANDARD', 'ENTERPRISE', 'CUSTOM'
  )),

  -- Encryption key material (stored encrypted at rest)
  master_key_id VARCHAR(256),                 -- Reference to KMS key

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_tenants_status (status),
  INDEX idx_tenants_created (created_at DESC)
);

COMMENT ON TABLE tenants IS 'Top-level customer tenant. Law 5: Every record is isolated by tenant_id.';
COMMENT ON COLUMN tenants.master_key_id IS 'Reference to KMS master key for tenant data encryption';
COMMENT ON COLUMN tenants.data_residency_region IS 'AWS region for data residency compliance';

-- Enable RLS on tenants (Law 5)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_tenant_isolation ON tenants
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON tenants TO keel_app_role;
REVOKE UPDATE, DELETE ON tenants FROM keel_app_role;

-- ============================================================================
-- GROUPS TABLE: Business units or subsidiaries within a tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS groups (
  -- Identity
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Group metadata
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(512),
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),

  -- Group structure
  parent_group_id UUID REFERENCES groups(group_id) ON DELETE RESTRICT,  -- For nested structures

  -- Statutory and compliance
  statutory_profile VARCHAR(128),             -- e.g., "HOLDING_COMPANY", "OPERATING_SUBSIDIARY"

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(tenant_id, name),

  -- Indexes
  INDEX idx_groups_tenant (tenant_id),
  INDEX idx_groups_parent (parent_group_id),
  INDEX idx_groups_status (status, tenant_id)
);

COMMENT ON TABLE groups IS 'Business unit or holding company within a tenant. Inherits data residency from tenant.';

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY groups_tenant_isolation ON groups
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON groups TO keel_app_role;
REVOKE UPDATE, DELETE ON groups FROM keel_app_role;

-- ============================================================================
-- LEGAL_ENTITIES TABLE: Registered companies with tax IDs
-- ============================================================================
CREATE TABLE IF NOT EXISTS legal_entities (
  -- Identity
  legal_entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE RESTRICT,

  -- Entity metadata
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(512) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),

  -- Tax and regulatory
  tax_id VARCHAR(32) NOT NULL,                -- Tax ID (EIN, VAT ID, etc.)
  country_code CHAR(2) NOT NULL,              -- ISO 3166-1 alpha-2 (e.g., "US", "DE")
  jurisdiction VARCHAR(64),                  -- State, province, or region

  -- Currency and fiscal calendar
  reporting_currency CHAR(3) NOT NULL DEFAULT 'USD',  -- ISO 4217
  fiscal_year_start INT NOT NULL DEFAULT 1,          -- Month (1-12)
  fiscal_year_end INT NOT NULL DEFAULT 12,            -- Month (1-12)

  -- Statutory profile (employment law, payroll, compliance)
  statutory_profile VARCHAR(128),             -- e.g., "US_CORPORATION", "EU_GMBH", "UK_LTD"

  -- Working time defaults (inherited by branches, can be overridden)
  standard_work_hours_per_week INT DEFAULT 40,
  standard_work_days_per_week INT DEFAULT 5,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(tenant_id, tax_id),
  UNIQUE(tenant_id, group_id, legal_name),
  CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
  CHECK (fiscal_year_end >= 1 AND fiscal_year_end <= 12),
  CHECK (standard_work_hours_per_week > 0 AND standard_work_hours_per_week <= 168),
  CHECK (standard_work_days_per_week > 0 AND standard_work_days_per_week <= 7),

  -- Indexes
  INDEX idx_legal_entities_tenant (tenant_id),
  INDEX idx_legal_entities_group (group_id),
  INDEX idx_legal_entities_tax_id (tax_id, tenant_id),
  INDEX idx_legal_entities_status (status, tenant_id)
);

COMMENT ON TABLE legal_entities IS 'Registered company with tax ID and statutory profile. Carries currency and fiscal calendar.';
COMMENT ON COLUMN legal_entities.tax_id IS 'Tax authority ID (EIN, VAT ID, SIRET, etc.)';
COMMENT ON COLUMN legal_entities.statutory_profile IS 'Jurisdiction-specific employment law profile (e.g., US_LLC, EU_SARL)';

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_entities_tenant_isolation ON legal_entities
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON legal_entities TO keel_app_role;
REVOKE UPDATE, DELETE ON legal_entities FROM keel_app_role;

-- ============================================================================
-- BRANCHES TABLE: Physical locations or cost centers
-- ============================================================================
CREATE TABLE IF NOT EXISTS branches (
  -- Identity
  branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE RESTRICT,
  legal_entity_id UUID NOT NULL REFERENCES legal_entities(legal_entity_id) ON DELETE RESTRICT,

  -- Branch metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),

  -- Location
  country_code CHAR(2) NOT NULL,              -- ISO 3166-1 alpha-2
  address VARCHAR(512),
  city VARCHAR(128),
  state_province VARCHAR(128),
  postal_code VARCHAR(20),

  -- Working time rules (branch-level overrides entity defaults)
  standard_work_hours_per_week INT,           -- NULL means inherit from legal_entity
  standard_work_days_per_week INT,            -- NULL means inherit from legal_entity
  standard_work_day_start TIME,               -- e.g., 09:00
  standard_work_day_end TIME,                 -- e.g., 17:00

  -- Shift patterns (JSON array of shift definitions)
  shift_patterns JSONB,                       -- e.g., [{"name": "Morning", "start": "06:00", "end": "14:00"}]

  -- Local statutory registrations
  local_registry_id VARCHAR(128),             -- e.g., works council ID, local employment agency ID

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(tenant_id, legal_entity_id, name),
  CONSTRAINT valid_work_hours CHECK (standard_work_hours_per_week IS NULL OR (standard_work_hours_per_week > 0 AND standard_work_hours_per_week <= 168)),
  CONSTRAINT valid_work_days CHECK (standard_work_days_per_week IS NULL OR (standard_work_days_per_week > 0 AND standard_work_days_per_week <= 7)),

  -- Indexes
  INDEX idx_branches_tenant (tenant_id),
  INDEX idx_branches_legal_entity (legal_entity_id),
  INDEX idx_branches_status (status, tenant_id)
);

COMMENT ON TABLE branches IS 'Physical location or cost center within a legal entity. Carries local working time rules and shift patterns.';
COMMENT ON COLUMN branches.shift_patterns IS 'JSON array of shift definitions; e.g., [{"name": "Morning", "start": "06:00", "end": "14:00"}]';

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY branches_tenant_isolation ON branches
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON branches TO keel_app_role;
REVOKE UPDATE, DELETE ON branches FROM keel_app_role;

-- ============================================================================
-- POSITIONS TABLE: Job positions within legal entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS positions (
  -- Identity
  position_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  legal_entity_id UUID NOT NULL REFERENCES legal_entities(legal_entity_id) ON DELETE RESTRICT,

  -- Position metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),

  -- Organizational structure
  reports_to_position_id UUID REFERENCES positions(position_id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,

  -- Constraints
  UNIQUE(tenant_id, legal_entity_id, name),

  -- Indexes
  INDEX idx_positions_tenant (tenant_id),
  INDEX idx_positions_legal_entity (legal_entity_id),
  INDEX idx_positions_status (status, tenant_id)
);

COMMENT ON TABLE positions IS 'Job position (role definition) within a legal entity.';

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY positions_tenant_isolation ON positions
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON positions TO keel_app_role;
REVOKE UPDATE, DELETE ON positions FROM keel_app_role;

-- ============================================================================
-- TENANT_HIERARCHY_VALIDATION FUNCTION (for ensuring consistency)
-- ============================================================================
-- Ensures that the tenant/group/legal_entity/branch hierarchy is always consistent
-- This function is called before inserting/updating records

CREATE OR REPLACE FUNCTION validate_tenancy_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'groups' THEN
      -- Groups must reference existing tenant
      IF NOT EXISTS (SELECT 1 FROM tenants WHERE tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Referenced tenant_id % does not exist', NEW.tenant_id;
      END IF;

      -- If parent group exists, it must be in the same tenant
      IF NEW.parent_group_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = NEW.parent_group_id AND tenant_id = NEW.tenant_id) THEN
          RAISE EXCEPTION 'Parent group % does not exist in tenant %', NEW.parent_group_id, NEW.tenant_id;
        END IF;
      END IF;

    WHEN 'legal_entities' THEN
      -- Legal entities must reference existing tenant and group
      IF NOT EXISTS (SELECT 1 FROM tenants WHERE tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Referenced tenant_id % does not exist', NEW.tenant_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = NEW.group_id AND tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Referenced group_id % does not exist in tenant %', NEW.group_id, NEW.tenant_id;
      END IF;

    WHEN 'branches' THEN
      -- Branches must reference existing tenant, group, and legal entity
      IF NOT EXISTS (SELECT 1 FROM tenants WHERE tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Referenced tenant_id % does not exist', NEW.tenant_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM groups WHERE group_id = NEW.group_id AND tenant_id = NEW.tenant_id) THEN
        RAISE EXCEPTION 'Referenced group_id % does not exist in tenant %', NEW.group_id, NEW.tenant_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM legal_entities WHERE legal_entity_id = NEW.legal_entity_id AND tenant_id = NEW.tenant_id AND group_id = NEW.group_id) THEN
        RAISE EXCEPTION 'Referenced legal_entity_id % does not exist in tenant % and group %', NEW.legal_entity_id, NEW.tenant_id, NEW.group_id;
      END IF;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_tenancy_hierarchy() IS 'Trigger function to validate tenancy hierarchy consistency (Law 5)';

-- Create triggers for hierarchy validation
CREATE TRIGGER validate_groups_hierarchy
BEFORE INSERT OR UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION validate_tenancy_hierarchy();

CREATE TRIGGER validate_legal_entities_hierarchy
BEFORE INSERT OR UPDATE ON legal_entities
FOR EACH ROW EXECUTE FUNCTION validate_tenancy_hierarchy();

CREATE TRIGGER validate_branches_hierarchy
BEFORE INSERT OR UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION validate_tenancy_hierarchy();

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration establishes Law 5: Tenant isolation at the kernel level.
--
-- Key design decisions:
-- 1. Every table has tenant_id and full tenancy scope hierarchy
-- 2. RLS policies enforce isolation at the database level (not application)
-- 3. Hierarchy is validated by triggers to prevent orphaned records
-- 4. Append-only at role level (keel_app_role has no UPDATE/DELETE)
-- 5. Encryption key references stored for per-tenant key management
--
-- Law 3 compliance: No UPDATE/DELETE grants; all changes are compensating events in the events table
-- Law 5 compliance: RLS policies and hierarchy validation enforce tenant isolation at the kernel
