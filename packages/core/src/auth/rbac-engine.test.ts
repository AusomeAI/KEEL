/**
 * RBAC Engine Tests
 *
 * Verifies Law 10: Per-actor identity with role-based access control.
 * Tests that:
 * 1. Permission checks work correctly at each scope level
 * 2. Roles are properly assigned and validated
 * 3. Delegation is tracked correctly
 * 4. Assignment validity is checked (status, time window)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RBACEngine } from "./rbac-engine";
import { Actor, ActorKind } from "../types/actor";
import {
  Role,
  RoleAssignment,
  RoleAssignmentScope,
  Permission,
} from "../types/rbac";

describe("RBACEngine", () => {
  let humanActor: Actor;
  let agentActor: Actor;
  let hrAdminRole: Role;
  let managerRole: Role;
  let employeeRole: Role;
  let hirePermission: Permission;
  let approveLeavePermission: Permission;
  let viewReportPermission: Permission;
  let tenantScope: RoleAssignmentScope;

  beforeEach(() => {
    humanActor = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      kind: "HUMAN",
      displayName: "Alice",
      email: "alice@example.com",
    };

    agentActor = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      kind: "AGENT",
      displayName: "Agent 1",
      agentVersion: "claude-opus-4",
    };

    hirePermission = {
      permissionId: "550e8400-e29b-41d4-a716-446655440010",
      permissionKey: "hire_employee",
      name: "Hire Employee",
      permissionType: "ACTION",
      resource: "EMPLOYEE",
      permissionLevel: 50,
    };

    approveLeavePermission = {
      permissionId: "550e8400-e29b-41d4-a716-446655440011",
      permissionKey: "approve_leave",
      name: "Approve Leave",
      permissionType: "ACTION",
      resource: "LEAVE",
      permissionLevel: 40,
    };

    viewReportPermission = {
      permissionId: "550e8400-e29b-41d4-a716-446655440012",
      permissionKey: "view_report",
      name: "View Report",
      permissionType: "VIEW",
      resource: "REPORT",
      permissionLevel: 10,
    };

    hrAdminRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440100",
      roleKey: "HR_ADMIN",
      name: "HR Administrator",
      roleType: "SYSTEM",
      scopeLevel: "TENANT",
      permissions: [hirePermission, approveLeavePermission, viewReportPermission],
    };

    managerRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440101",
      roleKey: "MANAGER",
      name: "Manager",
      roleType: "SYSTEM",
      scopeLevel: "BRANCH",
      permissions: [approveLeavePermission, viewReportPermission],
    };

    employeeRole = {
      roleId: "550e8400-e29b-41d4-a716-446655440102",
      roleKey: "EMPLOYEE",
      name: "Employee",
      roleType: "SYSTEM",
      scopeLevel: "BRANCH",
      permissions: [viewReportPermission],
    };

    tenantScope = {
      scopeTenantId: "550e8400-e29b-41d4-a716-446655440001",
      scopeGroupId: "550e8400-e29b-41d4-a716-446655440002",
      scopeLegalEntityId: "550e8400-e29b-41d4-a716-446655440003",
      scopeBranchId: "550e8400-e29b-41d4-a716-446655440004",
    };
  });

  describe("hasPermission", () => {
    it("grants permission when actor has role with permission", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasPermission = RBACEngine.hasPermission(
        humanActor,
        "hire_employee",
        tenantScope,
        [assignment],
      );

      expect(hasPermission).toBe(true);
    });

    it("denies permission when actor lacks role", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: employeeRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasPermission = RBACEngine.hasPermission(
        humanActor,
        "hire_employee",
        tenantScope,
        [assignment],
      );

      expect(hasPermission).toBe(false);
    });

    it("denies permission when assignment is inactive", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "REVOKED",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasPermission = RBACEngine.hasPermission(
        humanActor,
        "hire_employee",
        tenantScope,
        [assignment],
      );

      expect(hasPermission).toBe(false);
    });

    it("denies permission when assignment has not yet become valid", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: futureDate,
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasPermission = RBACEngine.hasPermission(
        humanActor,
        "hire_employee",
        tenantScope,
        [assignment],
      );

      expect(hasPermission).toBe(false);
    });

    it("denies permission when assignment has expired", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        validUntil: pastDate,
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasPermission = RBACEngine.hasPermission(
        humanActor,
        "hire_employee",
        tenantScope,
        [assignment],
      );

      expect(hasPermission).toBe(false);
    });

    it("grants permission at different scope levels", () => {
      const entityScope: RoleAssignmentScope = {
        scopeTenantId: tenantScope.scopeTenantId,
        scopeGroupId: tenantScope.scopeGroupId,
        scopeLegalEntityId: tenantScope.scopeLegalEntityId,
        // No branch specified
      };

      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: entityScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasPermission = RBACEngine.hasPermission(
        humanActor,
        "hire_employee",
        tenantScope,
        [assignment],
      );

      expect(hasPermission).toBe(true);
    });
  });

  describe("hasRole", () => {
    it("returns true when actor has role", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasRole = RBACEngine.hasRole(humanActor, "HR_ADMIN", tenantScope, [assignment]);

      expect(hasRole).toBe(true);
    });

    it("returns false when actor does not have role", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: employeeRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const hasRole = RBACEngine.hasRole(humanActor, "HR_ADMIN", tenantScope, [assignment]);

      expect(hasRole).toBe(false);
    });
  });

  describe("getRolesAtScope", () => {
    it("returns all active roles at scope", () => {
      const assignment1: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const assignment2: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440201",
        actor: humanActor,
        role: managerRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const roles = RBACEngine.getRolesAtScope(tenantScope, [assignment1, assignment2]);

      expect(roles).toHaveLength(2);
      expect(roles.map((r) => r.roleKey)).toContain("HR_ADMIN");
      expect(roles.map((r) => r.roleKey)).toContain("MANAGER");
    });

    it("filters out inactive roles", () => {
      const assignment1: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const assignment2: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440201",
        actor: humanActor,
        role: managerRole,
        scope: tenantScope,
        status: "REVOKED",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const roles = RBACEngine.getRolesAtScope(tenantScope, [assignment1, assignment2]);

      expect(roles).toHaveLength(1);
      expect(roles[0].roleKey).toBe("HR_ADMIN");
    });
  });

  describe("getPermissionsAtScope", () => {
    it("returns all permissions from all roles at scope", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const permissions = RBACEngine.getPermissionsAtScope(tenantScope, [assignment]);

      expect(permissions).toHaveLength(3);
      expect(permissions.map((p) => p.permissionKey)).toContain("hire_employee");
      expect(permissions.map((p) => p.permissionKey)).toContain("approve_leave");
      expect(permissions.map((p) => p.permissionKey)).toContain("view_report");
    });

    it("deduplicates permissions from multiple roles", () => {
      const assignment1: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const assignment2: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440201",
        actor: humanActor,
        role: managerRole, // Also has "approve_leave" and "view_report"
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const permissions = RBACEngine.getPermissionsAtScope(tenantScope, [
        assignment1,
        assignment2,
      ]);

      // Should have 3: hire_employee, approve_leave, view_report (deduplicated)
      expect(permissions).toHaveLength(3);
    });
  });

  describe("canDelegate", () => {
    it("allows human to delegate to another human", () => {
      const otherHuman: Actor = {
        id: "550e8400-e29b-41d4-a716-446655440003",
        kind: "HUMAN",
        displayName: "Bob",
        email: "bob@example.com",
      };

      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const canDelegate = RBACEngine.canDelegate(
        humanActor,
        hrAdminRole,
        otherHuman,
        tenantScope,
        [assignment],
      );

      expect(canDelegate).toBe(true);
    });

    it("denies delegation to oneself", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const canDelegate = RBACEngine.canDelegate(
        humanActor,
        hrAdminRole,
        humanActor,
        tenantScope,
        [assignment],
      );

      expect(canDelegate).toBe(false);
    });

    it("allows agent to delegate to any actor", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: agentActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const canDelegate = RBACEngine.canDelegate(
        agentActor,
        hrAdminRole,
        humanActor,
        tenantScope,
        [assignment],
      );

      expect(canDelegate).toBe(true);
    });

    it("denies delegation when actor does not have role", () => {
      const otherHuman: Actor = {
        id: "550e8400-e29b-41d4-a716-446655440003",
        kind: "HUMAN",
        displayName: "Bob",
        email: "bob@example.com",
      };

      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: employeeRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const canDelegate = RBACEngine.canDelegate(
        humanActor,
        hrAdminRole,
        otherHuman,
        tenantScope,
        [assignment],
      );

      expect(canDelegate).toBe(false);
    });
  });

  describe("isAssignmentValid", () => {
    it("returns true for active, valid assignment", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      expect(RBACEngine.isAssignmentValid(assignment)).toBe(true);
    });

    it("returns false for revoked assignment", () => {
      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "REVOKED",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      expect(RBACEngine.isAssignmentValid(assignment)).toBe(false);
    });

    it("returns false for expired assignment", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const assignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        validUntil: pastDate,
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      expect(RBACEngine.isAssignmentValid(assignment)).toBe(false);
    });
  });

  describe("getValidAssignments", () => {
    it("returns only valid assignments", () => {
      const validAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440200",
        actor: humanActor,
        role: hrAdminRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const expiredAssignment: RoleAssignment = {
        assignmentId: "550e8400-e29b-41d4-a716-446655440201",
        actor: humanActor,
        role: managerRole,
        scope: tenantScope,
        status: "ACTIVE",
        validFrom: new Date(),
        validUntil: pastDate,
        createdAt: new Date(),
        createdBy: "550e8400-e29b-41d4-a716-446655440001",
      };

      const validAssignments = RBACEngine.getValidAssignments([
        validAssignment,
        expiredAssignment,
      ]);

      expect(validAssignments).toHaveLength(1);
      expect(validAssignments[0]).toBe(validAssignment);
    });
  });
});
