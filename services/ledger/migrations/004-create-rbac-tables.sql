-- Migration 004: Create RBAC (Role-Based Access Control) tables (Law 10: Per-actor identity and permissions)
-- Date: 2026-08-28
-- Author: Squad 0 (Platform Kernel)
-- Related: ADR 0006 (RBAC Strategy), CLAUDE.md § 3
-- Laws: Law 5 (Tenant isolation), Law 10 (Per-agent identity with short-lived tokens)

-- Creates the RBAC layer: roles, permissions, and role-to-permission mappings.
-- Every actor (HUMAN or AGENT) has roles scoped to tenant → group → entity → branch.
-- Permissions are composable and grant authority over specific actions.

-- ============================================================================
-- ROLES TABLE: Predefined roles (HR_ADMIN, PAYROLL_ADMIN, MANAGER, EMPLOYEE, GUEST, AGENT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  -- Identity
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Role metadata
  role_key VARCHAR(64) NOT NULL,              -- e.g., "HR_ADMIN", "PAYROLL_ADMIN"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Role classification
  role_type VARCHAR(32) NOT NULL CHECK (role_type IN ('SYSTEM', 'CUSTOM')),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),

  -- Scope level: at which hierarchy level this role applies
  -- TENANT: applies to entire tenant
  -- GROUP: applies to specific group
  -- ENTITY: applies to specific legal entity
  -- BRANCH: applies to specific branch
  scope_level VARCHAR(32) NOT NULL DEFAULT 'TENANT' CHECK (scope_level IN ('TENANT', 'GROUP', 'ENTITY', 'BRANCH')),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,

  -- Constraints
  UNIQUE(tenant_id, role_key),
  UNIQUE(tenant_id, name),

  -- Indexes
  INDEX idx_roles_tenant (tenant_id),
  INDEX idx_roles_key (role_key, tenant_id),
  INDEX idx_roles_status (status, tenant_id)
);

COMMENT ON TABLE roles IS 'Role definition (e.g., HR_ADMIN, PAYROLL_ADMIN). Law 10: Roles are per-tenant and scoped to hierarchy level.';

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON roles
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON roles TO keel_app_role;
REVOKE UPDATE, DELETE ON roles FROM keel_app_role;

-- ============================================================================
-- PERMISSIONS TABLE: Fine-grained permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  -- Identity
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Permission metadata
  permission_key VARCHAR(128) NOT NULL,       -- e.g., "hire_employee", "approve_payroll", "view_team"
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Permission classification
  permission_type VARCHAR(32) NOT NULL CHECK (permission_type IN ('ACTION', 'VIEW', 'REPORT')),
  resource VARCHAR(128),                     -- e.g., "EMPLOYEE", "PAYROLL", "TEAM"

  -- Permission level (administrative hierarchy)
  permission_level INT NOT NULL DEFAULT 0,   -- 0=lowest, 100=highest

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,

  -- Constraints
  UNIQUE(tenant_id, permission_key),

  -- Indexes
  INDEX idx_permissions_tenant (tenant_id),
  INDEX idx_permissions_key (permission_key, tenant_id),
  INDEX idx_permissions_resource (resource, tenant_id)
);

COMMENT ON TABLE permissions IS 'Fine-grained permission that can be granted to roles.';

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY permissions_tenant_isolation ON permissions
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON permissions TO keel_app_role;
REVOKE UPDATE, DELETE ON permissions FROM keel_app_role;

-- ============================================================================
-- ROLE_PERMISSIONS TABLE: Junction table (many-to-many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  -- Identity
  role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Foreign keys
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE RESTRICT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,

  -- Constraints
  UNIQUE(tenant_id, role_id, permission_id),

  -- Indexes
  INDEX idx_role_permissions_role (role_id),
  INDEX idx_role_permissions_permission (permission_id),
  INDEX idx_role_permissions_tenant (tenant_id)
);

COMMENT ON TABLE role_permissions IS 'Associates permissions to roles. One role can have many permissions.';

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_permissions_tenant_isolation ON role_permissions
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON role_permissions TO keel_app_role;
REVOKE UPDATE, DELETE ON role_permissions FROM keel_app_role;

-- ============================================================================
-- ACTORS TABLE: Users and agents
-- ============================================================================
CREATE TABLE IF NOT EXISTS actors (
  -- Identity
  actor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Actor metadata
  actor_kind VARCHAR(16) NOT NULL CHECK (actor_kind IN ('HUMAN', 'AGENT')),
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),

  -- Agent-specific fields
  agent_version VARCHAR(64),                 -- e.g., "claude-opus-4-20240514"
  agent_model_id VARCHAR(255),               -- Model ID or name

  -- Status
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,

  -- Constraints
  UNIQUE(tenant_id, email) WHERE email IS NOT NULL,

  -- Indexes
  INDEX idx_actors_tenant (tenant_id),
  INDEX idx_actors_kind (actor_kind, tenant_id),
  INDEX idx_actors_status (status, tenant_id)
);

COMMENT ON TABLE actors IS 'User (HUMAN) or Agent (AGENT). Every action is attributed to a specific actor. Law 10.';

ALTER TABLE actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY actors_tenant_isolation ON actors
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON actors TO keel_app_role;
REVOKE UPDATE, DELETE ON actors FROM keel_app_role;

-- ============================================================================
-- ROLE_ASSIGNMENTS TABLE: Actor-to-role mappings with scope
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_assignments (
  -- Identity
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Foreign keys
  actor_id UUID NOT NULL REFERENCES actors(actor_id) ON DELETE RESTRICT,
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,

  -- Scope of assignment (which tenant/group/entity/branch this role applies to)
  scope_tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
  scope_group_id UUID REFERENCES groups(group_id) ON DELETE RESTRICT,
  scope_legal_entity_id UUID REFERENCES legal_entities(legal_entity_id) ON DELETE RESTRICT,
  scope_branch_id UUID REFERENCES branches(branch_id) ON DELETE RESTRICT,

  -- Assignment validity
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP WITH TIME ZONE,      -- NULL = indefinite

  -- Delegation tracking
  delegated_from_assignment_id UUID REFERENCES role_assignments(assignment_id) ON DELETE SET NULL,
  delegation_reason TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  revocation_reason TEXT,

  -- Constraints
  UNIQUE(actor_id, role_id, scope_tenant_id, scope_group_id, scope_legal_entity_id, scope_branch_id, valid_from),
  CONSTRAINT valid_scope CHECK (
    -- Scope hierarchy must be consistent: branch implies entity, entity implies group, group implies tenant
    (scope_branch_id IS NULL OR scope_legal_entity_id IS NOT NULL) AND
    (scope_legal_entity_id IS NULL OR scope_group_id IS NOT NULL) AND
    (scope_group_id IS NULL OR scope_tenant_id IS NOT NULL)
  ),

  -- Indexes
  INDEX idx_role_assignments_tenant (tenant_id),
  INDEX idx_role_assignments_actor (actor_id, status),
  INDEX idx_role_assignments_role (role_id, status),
  INDEX idx_role_assignments_scope (scope_legal_entity_id, status),
  INDEX idx_role_assignments_valid (valid_from, valid_until),
  INDEX idx_role_assignments_status (status, tenant_id)
);

COMMENT ON TABLE role_assignments IS 'Actor is assigned a role at a specific scope (tenant, group, entity, or branch).';
COMMENT ON COLUMN role_assignments.scope_legal_entity_id IS 'Scope legal entity; NULL means role applies to all entities in group/tenant';
COMMENT ON COLUMN role_assignments.delegated_from_assignment_id IS 'If this role was delegated, link to the original assignment';
COMMENT ON COLUMN role_assignments.valid_until IS 'Temporary role assignments expire at this time; NULL means indefinite';

ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_assignments_tenant_isolation ON role_assignments
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON role_assignments TO keel_app_role;
REVOKE UPDATE, DELETE ON role_assignments FROM keel_app_role;

-- ============================================================================
-- ACTOR_TOKENS TABLE: Short-lived scoped tokens for agents (Law 10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS actor_tokens (
  -- Identity
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,

  -- Token details
  actor_id UUID NOT NULL REFERENCES actors(actor_id) ON DELETE RESTRICT,
  token_hash VARCHAR(128) NOT NULL UNIQUE,   -- SHA-256 hash of the token (never store plaintext)

  -- Scope (which actions can this token authorize)
  scope_permissions TEXT[] NOT NULL,         -- e.g., ["hire_employee", "request_leave"]
  scope_legal_entity_id UUID REFERENCES legal_entities(legal_entity_id) ON DELETE RESTRICT,  -- NULL = all entities

  -- Token validity (Law 10: short-lived)
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,       -- NULL = still valid

  -- Metadata
  source VARCHAR(64) NOT NULL DEFAULT 'API' CHECK (source IN ('API', 'UI', 'AGENT')),
  ip_address INET,
  user_agent VARCHAR(512),

  -- Indexes
  INDEX idx_actor_tokens_actor (actor_id),
  INDEX idx_actor_tokens_expires (expires_at),
  INDEX idx_actor_tokens_hash (token_hash)
);

COMMENT ON TABLE actor_tokens IS 'Short-lived scoped OAuth2 token for agents/humans. Law 10: Never shared service accounts or static credentials.';
COMMENT ON COLUMN actor_tokens.token_hash IS 'SHA-256 hash of token (plaintext never stored)';
COMMENT ON COLUMN actor_tokens.expires_at IS 'Token must be renewed before this time; typically 1 hour for agents';

ALTER TABLE actor_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY actor_tokens_tenant_isolation ON actor_tokens
  USING (
    tenant_id = COALESCE(current_setting('keel.tenant_id', true)::uuid, NULL)
  );

GRANT SELECT, INSERT ON actor_tokens TO keel_app_role;
REVOKE UPDATE, DELETE ON actor_tokens FROM keel_app_role;

-- ============================================================================
-- STANDARD ROLES INITIALIZATION (System roles)
-- ============================================================================
-- These are inserted via a data script, not in the migration, to avoid hardcoding assumptions.
-- See: services/ledger/scripts/seed-system-roles.mjs

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration establishes Law 10: Per-actor identity with short-lived scoped tokens.
--
-- Key design decisions:
-- 1. Every actor (HUMAN or AGENT) has a unique identity
-- 2. Roles are scoped to tenant/group/entity/branch hierarchy
-- 3. Role assignments can be delegated and have validity windows
-- 4. Tokens are short-lived, hashed, and scoped to specific permissions
-- 5. RLS policies enforce isolation at database level
--
-- Law 5 compliance: Every table is scoped by tenant_id with RLS enforcement
-- Law 10 compliance: Per-actor tokens, never shared service accounts
-- Law 3 compliance: No UPDATE/DELETE on tables; all changes are compensating events
