/**
 * Segregation of Duties (SoD) Engine Tests
 *
 * Verifies that:
 * 1. SoD violations are detected correctly
 * 2. Enforcement types (HARD, SOFT, AUDIT_ONLY) are respected
 * 3. Conflicting roles cannot be assigned
 * 4. SoD compliance is enforced at assignment time
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SoDEngine } from "./sod-engine";
import { Actor } from "../types/actor";
import { Role, RoleAssignment, RoleAssignmentScope } from "../types/rbac";

describe("SoDEngine", () => {
  let actor: Actor;
  let payrollApproverRole: Role;
  let payrollExecutorRole: Role;
  let hrAdminRole: Role;
  let payrollAdminRole: Role;
  let managerRole: Role;
  let tenantScope: RoleAssignmentScope;

  beforeEach(() => {
    actor = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      kind: "HUMAN",
      displayName: "Alice",
      email: "alice@example.com",
    };

    payrollApproverRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440100",
      roleKey: "PAYROLL_APPROVER",
      name: "Payroll Approver",
      roleType: "SYSTEM",
      scopeLevel: "ENTITY",
      permissions: [],
    };

    payrollExecutorRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440101",
      roleKey: "PAYROLL_EXECUTOR",
      name: "Payroll Executor",
      roleType: "SYSTEM",
      scopeLevel: "ENTITY",
      permissions: [],
    };

    hrAdminRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440102",
      roleKey: "HR_ADMIN",
      name: "HR Admin",
      roleType: "SYSTEM",
      scopeLevel: "TENANT",
      permissions: [],
    };

    payrollAdminRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440103",
      roleKey: "PAYROLL_ADMIN",
      name: "Payroll Admin",
      roleType: "SYSTEM",
      scopeLevel: "TENANT",
      permissions: [],
    };

    managerRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440104",
      roleKey: "MANAGER",
      name: "Manager",
      roleType: "SYSTEM",
      scopeLevel: "BRANCH",
      permissions: [],
    };

    tenantScope = {
      scopeTenantId: "550e8400-e29b-41d4-a716-446655440001",
      scopeGroupId: "550e8400-e29b-41d4-a716-446655440002",
      scopeLegalEntityId: "550e8400-e29b-41d4-a716-446655440003",
      scopeBranchId: "550e8400-e29b-41d4-a716-446655440004",
    };
  });

  describe("checkCompliance", () => {
    it("allows role when no conflicts exist", () => {
      const result = SoDEngine.checkCompliance(
        actor,
        managerRole,
        tenantScope,
        [],
      );

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("detects HARD violation when assigning conflicting role", () => {
      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: payrollApproverRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = SoDEngine.checkCompliance(
        actor,
        payrollExecutorRole,
        tenantScope,
        [existingAssignment],
      );

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].enforceType).toBe("HARD");
      expect(result.violations[0].conflictingRoleKey).toBe("PAYROLL_APPROVER");
    });

    it("detects SOFT violation", () => {
      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = SoDEngine.checkCompliance(
        actor,
        payrollAdminRole,
        tenantScope,
        [existingAssignment],
      );

      expect(result.violations.some((v) => v.enforceType === "SOFT")).toBe(true);
    });

    it("ignores violations at different scopes", () => {
      const differentScope: RoleAssignmentScope = {
        scopeTenantId: "550e8400-e29b-41d4-a716-446655440001",
        scopeGroupId: "550e8400-e29b-41d4-a716-446655440005", // Different group
        scopeLegalEntityId: "550e8400-e29b-41d4-a716-446655440006",
        scopeBranchId: "550e8400-e29b-41d4-a716-446655440007",
      };

      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: payrollApproverRole,
        scope: differentScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = SoDEngine.checkCompliance(
        actor,
        payrollExecutorRole,
        tenantScope,
        [existingAssignment],
      );

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("ignores revoked assignments", () => {
      const revokedAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: payrollApproverRole,
        scope: tenantScope,
        status: "REVOKED",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = SoDEngine.checkCompliance(
        actor,
        payrollExecutorRole,
        tenantScope,
        [revokedAssignment],
      );

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("ignores expired assignments", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const expiredAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: payrollApproverRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        validUntil: pastDate,
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = SoDEngine.checkCompliance(
        actor,
        payrollExecutorRole,
        tenantScope,
        [expiredAssignment],
      );

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("allows custom SoD rules", () => {
      const customRule = {
        ruleId: "custom-1",
        ruleName: "Custom Conflict",
        roleAKey: "MANAGER" as const,
        roleBKey: "PAYROLL_ADMIN" as const,
        enforceType: "HARD" as const,
      };

      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: managerRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const result = SoDEngine.checkCompliance(
        actor,
        payrollAdminRole,
        tenantScope,
        [existingAssignment],
        [customRule],
      );

      // Should detect both SOFT violation from standard rules and custom rule violation
      expect(result.isCompliant).toBe(false);
    });
  });

  describe("getAllViolations", () => {
    it("returns all current violations", () => {
      const assignment1: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: payrollApproverRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const assignment2: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440201",
        actor,
        role: payrollExecutorRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const violations = SoDEngine.getAllViolations(
        actor,
        tenantScope,
        [assignment1, assignment2],
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => v.enforceType === "HARD")).toBe(true);
    });

    it("returns empty array when no violations", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: managerRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const violations = SoDEngine.getAllViolations(
        actor,
        tenantScope,
        [assignment],
      );

      expect(violations).toHaveLength(0);
    });
  });

  describe("getViolationSeverity", () => {
    it("returns highest severity for HARD violations", () => {
      const violation = {
        violationId: "v1",
        sodRuleId: "r1",
        ruleName: "Test",
        enforceType: "HARD" as const,
        conflictingRoleKey: "PAYROLL_EXECUTOR" as const,
      };

      const severity = SoDEngine.getViolationSeverity(violation);
      expect(severity).toBe(100);
    });

    it("returns medium severity for SOFT violations", () => {
      const violation = {
        violationId: "v1",
        sodRuleId: "r1",
        ruleName: "Test",
        enforceType: "SOFT" as const,
        conflictingRoleKey: "PAYROLL_EXECUTOR" as const,
      };

      const severity = SoDEngine.getViolationSeverity(violation);
      expect(severity).toBe(50);
    });

    it("returns low severity for AUDIT_ONLY violations", () => {
      const violation = {
        violationId: "v1",
        sodRuleId: "r1",
        ruleName: "Test",
        enforceType: "AUDIT_ONLY" as const,
        conflictingRoleKey: "PAYROLL_EXECUTOR" as const,
      };

      const severity = SoDEngine.getViolationSeverity(violation);
      expect(severity).toBe(10);
    });
  });

  describe("getConflictingRoles", () => {
    it("returns roles that would conflict when assigned", () => {
      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: payrollApproverRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const conflicts = SoDEngine.getConflictingRoles(
        payrollExecutorRole,
        [existingAssignment],
        tenantScope,
      );

      expect(conflicts).toContain("PAYROLL_APPROVER");
    });

    it("returns empty array when no conflicts", () => {
      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: managerRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const conflicts = SoDEngine.getConflictingRoles(
        payrollExecutorRole,
        [existingAssignment],
        tenantScope,
      );

      expect(conflicts).toHaveLength(0);
    });

    it("only considers HARD conflicts", () => {
      const existingAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const conflicts = SoDEngine.getConflictingRoles(
        payrollAdminRole,
        [existingAssignment],
        tenantScope,
      );

      // HR_ADMIN and PAYROLL_ADMIN have a SOFT conflict, not HARD
      // So getConflictingRoles (which only checks HARD) should return empty
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("getApplicableRules", () => {
    it("returns standard rules", () => {
      const rules = SoDEngine.getApplicableRules(tenantScope);

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.ruleName.includes("Payroll"))).toBe(true);
    });

    it("includes custom rules", () => {
      const customRule = {
        ruleId: "custom-1",
        ruleName: "Custom Rule",
        roleAKey: "MANAGER" as const,
        roleBKey: "PAYROLL_ADMIN" as const,
        enforceType: "HARD" as const,
      };

      const rules = SoDEngine.getApplicableRules(tenantScope, [customRule]);

      expect(rules.some((r) => r.ruleName === "Custom Rule")).toBe(true);
    });
  });
});
