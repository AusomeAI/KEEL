/**
 * RBAC Engine: Role-Based Access Control
 *
 * Implements Law 10: Per-actor identity with short-lived scoped tokens.
 * Never shared service accounts or static credentials.
 *
 * This module provides:
 * 1. Permission checking against roles
 * 2. Role queries and filtering
 * 3. Delegation tracking and validation
 */

import { z } from "zod";
import { Actor, ActorKind } from "../types/actor";
import {
  Role,
  Permission,
  RoleAssignment,
  RoleAssignmentScope,
  RoleKey,
  AuthorizationResult,
} from "../types/rbac";
import { ValidatedTenancyContext } from "../tenancy/tenancy-kernel";
import { Result, Ok, Err } from "../types/result";

/**
 * RBAC Engine: Checks permissions and manages roles
 */
export class RBACEngine {
  /**
   * Check if an actor has a specific permission at a given scope
   *
   * Law 10: Permission checks are deterministic and auditable.
   * Every permission check can be logged for compliance.
   *
   * @param actor The actor (HUMAN or AGENT) requesting permission
   * @param permission The permission key (e.g., "hire_employee")
   * @param scope The tenancy scope where permission is needed
   * @param assignments The actor's role assignments (passed in, not queried)
   * @returns true if the actor has the permission, false otherwise
   */
  static hasPermission(
    actor: Actor,
    permission: string,
    scope: RoleAssignmentScope,
    assignments: RoleAssignment[],
  ): boolean {
    // Filter assignments to those active at this scope
    const relevantAssignments = this.getAssignmentsAtScope(assignments, scope);

    if (relevantAssignments.length === 0) {
      return false;
    }

    // Check if any of the roles has this permission
    return relevantAssignments.some((assignment) => {
      return assignment.role.permissions.some((p) => p.permissionKey === permission);
    });
  }

  /**
   * Check if an actor has a specific role at a given scope
   */
  static hasRole(
    actor: Actor,
    roleKey: RoleKey,
    scope: RoleAssignmentScope,
    assignments: RoleAssignment[],
  ): boolean {
    const relevantAssignments = this.getAssignmentsAtScope(assignments, scope);

    return relevantAssignments.some((assignment) => {
      return assignment.role.roleKey === roleKey && assignment.status === "ACTIVE";
    });
  }

  /**
   * Get all active roles for an actor at a given scope
   */
  static getRolesAtScope(
    scope: RoleAssignmentScope,
    assignments: RoleAssignment[],
  ): Role[] {
    return this.getAssignmentsAtScope(assignments, scope)
      .filter((a) => a.status === "ACTIVE")
      .map((a) => a.role);
  }

  /**
   * Get all permissions an actor has at a given scope
   */
  static getPermissionsAtScope(
    scope: RoleAssignmentScope,
    assignments: RoleAssignment[],
  ): Permission[] {
    const roles = this.getRolesAtScope(scope, assignments);

    // Collect unique permissions (by permissionKey)
    const permissionMap = new Map<string, Permission>();
    roles.forEach((role) => {
      role.permissions.forEach((perm) => {
        if (!permissionMap.has(perm.permissionKey)) {
          permissionMap.set(perm.permissionKey, perm);
        }
      });
    });

    return Array.from(permissionMap.values());
  }

  /**
   * Check if an actor can delegate a role to another actor
   * Delegates typically cannot pass on their full authority
   */
  static canDelegate(
    actor: Actor,
    role: Role,
    targetActor: Actor,
    scope: RoleAssignmentScope,
    assignments: RoleAssignment[],
  ): boolean {
    // Actor must have the role to delegate it
    if (!this.hasRole(actor, role.roleKey as RoleKey, scope, assignments)) {
      return false;
    }

    // Agent platform actors can always delegate (they're representing the platform)
    if (actor.kind === "AGENT") {
      return true;
    }

    // HUMAN actors can delegate to other HUMANs only (not to agents)
    if (actor.kind === "HUMAN" && targetActor.kind !== "HUMAN") {
      return false;
    }

    // Cannot delegate to oneself
    if (actor.id === targetActor.id) {
      return false;
    }

    return true;
  }

  /**
   * Filter assignments to only those active at a specific scope
   *
   * Scope matching rules:
   * - Tenant scope: assignment.scopeTenantId matches
   * - Group scope: tenant matches AND (group is null or matches)
   * - Entity scope: tenant matches AND (entity is null or matches)
   * - Branch scope: full hierarchy matches exactly
   */
  private static getAssignmentsAtScope(
    assignments: RoleAssignment[],
    scope: RoleAssignmentScope,
  ): RoleAssignment[] {
    const now = new Date();

    return assignments.filter((assignment) => {
      // Check status
      if (assignment.status !== "ACTIVE") {
        return false;
      }

      // Check validity window
      if (now < assignment.validFrom) {
        return false; // Not yet valid
      }
      if (assignment.validUntil && now > assignment.validUntil) {
        return false; // Expired
      }

      // Check scope match
      const aScope = assignment.scope;

      // Tenant must match
      if (aScope.scopeTenantId !== scope.scopeTenantId) {
        return false;
      }

      // Group can be null (grant at tenant level) or must match
      if (aScope.scopeGroupId && aScope.scopeGroupId !== scope.scopeGroupId) {
        return false;
      }

      // Entity can be null (grant at group level) or must match
      if (aScope.scopeLegalEntityId && aScope.scopeLegalEntityId !== scope.scopeLegalEntityId) {
        return false;
      }

      // Branch can be null (grant at entity level) or must match
      if (aScope.scopeBranchId && aScope.scopeBranchId !== scope.scopeBranchId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if a role assignment is still valid (not expired, not revoked)
   */
  static isAssignmentValid(assignment: RoleAssignment): boolean {
    const now = new Date();

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

    return true;
  }

  /**
   * Get all valid assignments for an actor
   */
  static getValidAssignments(assignments: RoleAssignment[]): RoleAssignment[] {
    return assignments.filter((a) => this.isAssignmentValid(a));
  }

  /**
   * Create a permission check result for logging/auditing
   */
  static createPermissionCheckResult(
    actor: Actor,
    permission: string,
    scope: RoleAssignmentScope,
    isAuthorized: boolean,
    denialReason?: string,
  ): AuthorizationResult {
    return {
      isAuthorized,
      reason: isAuthorized ? `Actor ${actor.id} has permission ${permission}` : undefined,
      denialReason: denialReason || (isAuthorized ? undefined : `No permission for ${permission}`),
    };
  }
}

export default RBACEngine;
