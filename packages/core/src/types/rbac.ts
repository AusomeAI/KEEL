/**
 * RBAC Types: Role-Based Access Control
 *
 * Implements Law 10: Per-actor identity with short-lived scoped tokens.
 * Never shared service accounts or static credentials.
 */

import { z } from "zod";
import { ActorSchema } from "./actor";
import { TenancyScope, TenantIdSchema, GroupIdSchema, LegalEntityIdSchema, BranchIdSchema } from "./tenant";

/**
 * Standard KEEL roles
 */
export const RoleKeySchema = z.enum([
  "HR_ADMIN",           // Full HR system administration
  "PAYROLL_ADMIN",      // Payroll administration and configuration
  "PAYROLL_APPROVER",   // Approves payroll runs (segregated from PAYROLL_EXECUTOR)
  "PAYROLL_EXECUTOR",   // Executes payroll (segregated from PAYROLL_APPROVER)
  "MANAGER",            // Manages team members (hiring, scheduling, discipline)
  "EMPLOYEE",           // Base employee access (view own data, request leave)
  "GUEST",              // Read-only guest access (reports, analytics)
  "AGENT",              // Agent platform access (submits TransactionIntents)
  "AUDITOR",            // Compliance and audit access (read-only)
]);

export type RoleKey = z.infer<typeof RoleKeySchema>;

export const RoleIdSchema = z.string().uuid().describe("Role ID");
export type RoleId = z.infer<typeof RoleIdSchema>;

/**
 * Permission: Fine-grained action or view capability
 */
export const PermissionKeySchema = z.string().regex(/^[a-z_]+$/).min(3).max(128);

export const PermissionSchema = z.object({
  permissionId: z.string().uuid(),
  permissionKey: PermissionKeySchema,
  name: z.string(),
  description: z.string().optional(),
  permissionType: z.enum(["ACTION", "VIEW", "REPORT"]),
  resource: z.string().optional(),
  permissionLevel: z.number().int().min(0).max(100),
});

export type Permission = z.infer<typeof PermissionSchema>;

/**
 * Role: Set of permissions
 */
export const RoleSchema = z.object({
  roleId: RoleIdSchema,
  roleKey: RoleKeySchema,
  name: z.string(),
  description: z.string().optional(),
  roleType: z.enum(["SYSTEM", "CUSTOM"]),
  scopeLevel: z.enum(["TENANT", "GROUP", "ENTITY", "BRANCH"]),
  permissions: z.array(PermissionSchema),
});

export type Role = z.infer<typeof RoleSchema>;

/**
 * Role assignment scope (which level of hierarchy this role applies to)
 */
export const RoleAssignmentScopeSchema = z.object({
  scopeTenantId: TenantIdSchema,
  scopeGroupId: GroupIdSchema.optional(),
  scopeLegalEntityId: LegalEntityIdSchema.optional(),
  scopeBranchId: BranchIdSchema.optional(),
});

export type RoleAssignmentScope = z.infer<typeof RoleAssignmentScopeSchema>;

/**
 * Role assignment: Actor → Role at a specific scope
 */
export const RoleAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  actor: ActorSchema,
  role: RoleSchema,
  scope: RoleAssignmentScopeSchema,
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"]),
  validFrom: z.date(),
  validUntil: z.date().optional(),
  delegatedFromAssignmentId: z.string().uuid().optional(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  revokedAt: z.date().optional(),
  revokedBy: z.string().uuid().optional(),
  revocationReason: z.string().optional(),
});

export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;

/**
 * Authorization check result
 */
export const AuthorizationResultSchema = z.object({
  isAuthorized: z.boolean(),
  reason: z.string().optional(),
  denialReason: z.string().optional(),
});

export type AuthorizationResult = z.infer<typeof AuthorizationResultSchema>;

/**
 * SoD Violation details
 */
export const SoDViolationSchema = z.object({
  violationId: z.string().uuid(),
  sodRuleId: z.string().uuid(),
  ruleName: z.string(),
  enforceType: z.enum(["HARD", "SOFT", "AUDIT_ONLY"]),
  conflictingRoleKey: RoleKeySchema,
  controlObjective: z.string().optional(),
  statutoryReference: z.string().optional(),
});

export type SoDViolation = z.infer<typeof SoDViolationSchema>;

/**
 * SoD compliance check result
 */
export const SoDComplianceResultSchema = z.object({
  isCompliant: z.boolean(),
  violations: z.array(SoDViolationSchema),
});

export type SoDComplianceResult = z.infer<typeof SoDComplianceResultSchema>;
