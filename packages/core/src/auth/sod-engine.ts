/**
 * SoD (Segregation of Duties) Engine
 *
 * Implements internal control: no person can have both roles
 * that create a conflict of interest or control violation.
 *
 * Example conflicts:
 * - Cannot be both PAYROLL_APPROVER and PAYROLL_EXECUTOR
 * - Cannot be both HIRING_MANAGER and BACKGROUND_CHECK_APPROVER
 * - Cannot be both MANAGER and EMPLOYEE of the same person
 *
 * Law 5: Tenant isolation (rules are tenant-scoped)
 * Law 10: Per-actor accountability (violations are logged per actor)
 */

import { Actor } from "../types/actor";
import {
  Role,
  RoleKey,
  RoleAssignment,
  RoleAssignmentScope,
  SoDViolation,
  SoDComplianceResult,
} from "../types/rbac";
import { Result, Ok, Err } from "../types/result";

/**
 * SoD Rule: Role A and Role B cannot both be held by the same actor at the same scope
 */
export interface SoDRule {
  ruleId: string;
  ruleName: string;
  roleAKey: RoleKey;
  roleBKey: RoleKey;
  enforceType: "HARD" | "SOFT" | "AUDIT_ONLY";
  controlObjective?: string;
  statutoryReference?: string;
}

/**
 * SoD Engine: Validates segregation of duties
 */
export class SoDEngine {
  /**
   * Standard KEEL SoD rules
   * These are the minimum required; customers can add more via configuration
   */
  private static readonly STANDARD_SOD_RULES: SoDRule[] = [
    {
      ruleId: "sod-payroll-segregation",
      ruleName: "Payroll Approval/Execution Segregation",
      roleAKey: "PAYROLL_APPROVER",
      roleBKey: "PAYROLL_EXECUTOR",
      enforceType: "HARD",
      controlObjective: "Prevent unauthorized payroll changes",
      statutoryReference: "SOX 302, Internal Accounting Controls",
    },
    {
      ruleId: "sod-hiring-segregation",
      ruleName: "Hiring Authority Segregation",
      roleAKey: "MANAGER",
      roleBKey: "PAYROLL_ADMIN",
      enforceType: "SOFT",
      controlObjective: "Reduce hiring fraud risk",
      statutoryReference: "Internal audit best practices",
    },
    {
      ruleId: "sod-admin-separation",
      ruleName: "HR Admin and Payroll Admin Separation",
      roleAKey: "HR_ADMIN",
      roleBKey: "PAYROLL_ADMIN",
      enforceType: "SOFT",
      controlObjective: "Separate policy-setting from execution",
      statutoryReference: "Corporate governance standards",
    },
  ];

  /**
   * Check if assigning a role to an actor violates any SoD rules
   *
   * Returns a list of violations (if any) and their enforcement type.
   * HARD violations should prevent the assignment.
   * SOFT violations should be logged but can be approved with justification.
   * AUDIT_ONLY violations are logged but don't prevent assignment.
   */
  static checkCompliance(
    actor: Actor,
    newRole: Role,
    scope: RoleAssignmentScope,
    currentAssignments: RoleAssignment[],
    customRules: SoDRule[] = [],
  ): SoDComplianceResult {
    const violations: SoDViolation[] = [];

    // Combine standard and custom rules
    const allRules = [...this.STANDARD_SOD_RULES, ...customRules];

    // Get actor's current roles at this scope
    const currentRoles = this.getRolesAtScope(currentAssignments, scope);
    const currentRoleKeys = new Set(currentRoles.map((r) => r.roleKey));

    // Check each SoD rule
    for (const rule of allRules) {
      // Does this rule involve the new role?
      const isRoleA = rule.roleAKey === newRole.roleKey;
      const isRoleB = rule.roleBKey === newRole.roleKey;

      if (!isRoleA && !isRoleB) {
        continue; // This rule doesn't apply to the new role
      }

      // Check if the conflicting role is already assigned
      const conflictingRoleKey = isRoleA ? rule.roleBKey : rule.roleAKey;

      if (currentRoleKeys.has(conflictingRoleKey)) {
        violations.push({
          violationId: `violation-${Date.now()}-${Math.random()}`,
          sodRuleId: rule.ruleId,
          ruleName: rule.ruleName,
          enforceType: rule.enforceType,
          conflictingRoleKey,
          controlObjective: rule.controlObjective,
          statutoryReference: rule.statutoryReference,
        });
      }
    }

    const hasHardViolations = violations.some((v) => v.enforceType === "HARD");

    return {
      isCompliant: !hasHardViolations,
      violations,
    };
  }

  /**
   * Get all violations for an actor at a scope
   * Useful for compliance reporting
   */
  static getAllViolations(
    actor: Actor,
    scope: RoleAssignmentScope,
    currentAssignments: RoleAssignment[],
    customRules: SoDRule[] = [],
  ): SoDViolation[] {
    const violations: SoDViolation[] = [];
    const allRules = [...this.STANDARD_SOD_RULES, ...customRules];

    // Get all roles at this scope
    const roles = this.getRolesAtScope(currentAssignments, scope);
    const roleKeys = new Set(roles.map((r) => r.roleKey));

    // Check each rule against all pairs of current roles
    for (const rule of allRules) {
      const hasRoleA = roleKeys.has(rule.roleAKey);
      const hasRoleB = roleKeys.has(rule.roleBKey);

      if (hasRoleA && hasRoleB) {
        violations.push({
          violationId: `violation-${Date.now()}-${Math.random()}`,
          sodRuleId: rule.ruleId,
          ruleName: rule.ruleName,
          enforceType: rule.enforceType,
          conflictingRoleKey: rule.roleBKey,
          controlObjective: rule.controlObjective,
          statutoryReference: rule.statutoryReference,
        });
      }
    }

    return violations;
  }

  /**
   * Get the severity of a compliance violation (0 = low, 100 = critical)
   */
  static getViolationSeverity(violation: SoDViolation): number {
    switch (violation.enforceType) {
      case "HARD":
        return 100; // Critical: should never happen
      case "SOFT":
        return 50; // Medium: requires approval
      case "AUDIT_ONLY":
        return 10; // Low: informational
    }
  }

  /**
   * Filter out roles that would cause hard SoD violations
   * Useful for UI to show which roles cannot be assigned
   */
  static getConflictingRoles(
    newRole: Role,
    currentAssignments: RoleAssignment[],
    scope: RoleAssignmentScope,
    customRules: SoDRule[] = [],
  ): RoleKey[] {
    const conflicting: RoleKey[] = [];
    const allRules = [...this.STANDARD_SOD_RULES, ...customRules];

    const currentRoles = this.getRolesAtScope(currentAssignments, scope);
    const currentRoleKeys = new Set(currentRoles.map((r) => r.roleKey));

    for (const rule of allRules) {
      if (rule.enforceType !== "HARD") {
        continue; // Only check HARD rules for conflict detection
      }

      const isRoleA = rule.roleAKey === newRole.roleKey;
      const isRoleB = rule.roleBKey === newRole.roleKey;

      if (!isRoleA && !isRoleB) {
        continue;
      }

      const conflictingRoleKey = isRoleA ? rule.roleBKey : rule.roleAKey;

      if (currentRoleKeys.has(conflictingRoleKey)) {
        conflicting.push(conflictingRoleKey);
      }
    }

    return Array.from(new Set(conflicting)); // Deduplicate
  }

  /**
   * Get rules applicable to a tenant/scope
   * (Useful for compliance reporting)
   */
  static getApplicableRules(
    scope: RoleAssignmentScope,
    customRules: SoDRule[] = [],
  ): SoDRule[] {
    // All SoD rules apply tenant-wide (they're not scope-specific)
    // But can be filtered by custom rules
    return [...this.STANDARD_SOD_RULES, ...customRules];
  }

  /**
   * Private helper: Get active roles at a scope
   */
  private static getRolesAtScope(
    assignments: RoleAssignment[],
    scope: RoleAssignmentScope,
  ): Role[] {
    const now = new Date();

    return assignments
      .filter((assignment) => {
        // Check status
        if (assignment.status !== "ACTIVE") {
          return false;
        }

        // Check validity window
        if (now < assignment.validFrom) {
          return false;
        }
        if (assignment.validUntil && now > assignment.validUntil) {
          return false;
        }

        // Check scope match
        const aScope = assignment.scope;

        if (aScope.scopeTenantId !== scope.scopeTenantId) {
          return false;
        }

        if (aScope.scopeGroupId && aScope.scopeGroupId !== scope.scopeGroupId) {
          return false;
        }

        if (aScope.scopeLegalEntityId && aScope.scopeLegalEntityId !== scope.scopeLegalEntityId) {
          return false;
        }

        if (aScope.scopeBranchId && aScope.scopeBranchId !== scope.scopeBranchId) {
          return false;
        }

        return true;
      })
      .map((a) => a.role);
  }
}

export default SoDEngine;
