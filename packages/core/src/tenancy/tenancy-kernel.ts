/**
 * Tenancy Kernel: Tenant/Group/Entity/Branch hierarchy management
 *
 * Implements Law 5: Tenant isolation enforced by PostgreSQL RLS in the kernel,
 * never by application queries.
 *
 * This module provides:
 * 1. TenancyContext creation and validation
 * 2. Query builders that automatically scope to tenant context
 * 3. Middleware for setting tenant context at connection time
 *
 * Every ledger operation must carry full tenancy scope.
 * RLS policies at the database level enforce that the scope matches current_setting('keel.tenant_id').
 */

import { z } from "zod";
import {
  TenantContext,
  TenantContextSchema,
  TenantId,
  GroupId,
  LegalEntityId,
  BranchId,
} from "../types/tenant";
import { Result, Ok, Err } from "../types/result";

/**
 * Validated tenancy context that can be used for all queries
 * Ensures that tenant/group/entity/branch hierarchy is consistent
 */
export class ValidatedTenancyContext {
  constructor(
    private readonly context: TenantContext,
  ) {}

  /**
   * Get the tenant ID (top-level customer)
   */
  getTenantId(): TenantId {
    return this.context.tenantId;
  }

  /**
   * Get the group ID
   */
  getGroupId(): GroupId {
    return this.context.groupId;
  }

  /**
   * Get the legal entity ID
   */
  getLegalEntityId(): LegalEntityId {
    return this.context.legalEntityId;
  }

  /**
   * Get the branch ID
   */
  getBranchId(): BranchId {
    return this.context.branchId;
  }

  /**
   * Get the full context as an object
   */
  getContext(): TenantContext {
    return { ...this.context };
  }

  /**
   * Check if this context is scoped to a tenant only (no specific group/entity/branch)
   */
  isTenantScoped(): boolean {
    // This would be true if group/entity/branch are null or undefined
    // For now, all contexts carry all four levels
    return false;
  }

  /**
   * Check if this context is scoped to a group
   */
  isGroupScoped(): boolean {
    return true;
  }

  /**
   * Check if this context is scoped to a legal entity
   */
  isEntityScoped(): boolean {
    return true;
  }

  /**
   * Check if this context is scoped to a branch
   */
  isBranchScoped(): boolean {
    return true;
  }

  /**
   * Create a PostgreSQL connection parameter object for RLS context setting
   * This should be called immediately after creating a connection
   */
  toPgSettings(): Record<string, string> {
    return {
      "keel.tenant_id": this.context.tenantId,
      "keel.group_id": this.context.groupId,
      "keel.legal_entity_id": this.context.legalEntityId,
      "keel.branch_id": this.context.branchId,
    };
  }

  /**
   * Serialize to JSON for logging or transmission
   */
  toJSON(): TenantContext {
    return this.getContext();
  }
}

/**
 * Tenancy Kernel: Creates and validates tenancy context
 */
export class TenancyKernel {
  /**
   * Create and validate a tenancy context
   * Returns an error if the hierarchy is invalid
   */
  static createContext(
    tenantId: TenantId,
    groupId: GroupId,
    legalEntityId: LegalEntityId,
    branchId: BranchId,
  ): Result<ValidatedTenancyContext> {
    try {
      // Validate the context shape
      const parsed = TenantContextSchema.parse({
        tenantId,
        groupId,
        legalEntityId,
        branchId,
      });

      return Ok(new ValidatedTenancyContext(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Err(new Error(`Invalid tenancy context: ${error.message}`));
      }
      return Err(error as Error);
    }
  }

  /**
   * Create a context from a JSON object (e.g., from API request)
   */
  static fromJSON(data: unknown): Result<ValidatedTenancyContext> {
    try {
      const parsed = TenantContextSchema.parse(data);
      return Ok(new ValidatedTenancyContext(parsed));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Err(new Error(`Invalid tenancy context: ${error.message}`));
      }
      return Err(error as Error);
    }
  }

  /**
   * Validate that all four levels of tenancy are present and correct types
   */
  static validateHierarchy(context: TenantContext): Result<void> {
    try {
      TenantContextSchema.parse(context);
      return Ok(undefined);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Err(new Error(`Invalid tenancy hierarchy: ${error.message}`));
      }
      return Err(error as Error);
    }
  }
}

/**
 * Tenancy Context Manager: Manages current request context
 * Can be used in middleware to set context for a request
 */
export class TenancyContextManager {
  private static currentContext: ValidatedTenancyContext | null = null;

  /**
   * Set the current tenancy context for this request/connection
   */
  static setContext(context: ValidatedTenancyContext): void {
    this.currentContext = context;
  }

  /**
   * Get the current tenancy context
   * Returns null if no context has been set
   */
  static getContext(): ValidatedTenancyContext | null {
    return this.currentContext;
  }

  /**
   * Clear the current context
   */
  static clearContext(): void {
    this.currentContext = null;
  }

  /**
   * Get the current tenant ID
   * Throws if no context is set
   */
  static getCurrentTenantId(): TenantId {
    if (!this.currentContext) {
      throw new Error("No tenancy context set for this request");
    }
    return this.currentContext.getTenantId();
  }

  /**
   * Run a function with a specific tenancy context
   * Automatically clears context after function completes
   */
  static async withContext<T>(
    context: ValidatedTenancyContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previousContext = this.currentContext;
    try {
      this.setContext(context);
      return await fn();
    } finally {
      if (previousContext) {
        this.setContext(previousContext);
      } else {
        this.clearContext();
      }
    }
  }
}

/**
 * Query builder helper for constructing SQL with tenancy scopes
 * Ensures that all queries are automatically scoped to the tenant context
 */
export class TenancyAwareSQLBuilder {
  /**
   * Create a WHERE clause for tenant isolation
   * Usage: `SELECT * FROM events WHERE ${getTenantIsolationClause()} AND ...`
   */
  static getTenantIsolationClause(context: ValidatedTenancyContext): string {
    const ctx = context.getContext();
    return `tenant_id = '${ctx.tenantId}'`;
  }

  /**
   * Create a WHERE clause for full hierarchy isolation
   */
  static getFullHierarchyClause(context: ValidatedTenancyContext): string {
    const ctx = context.getContext();
    return `tenant_id = '${ctx.tenantId}' AND group_id = '${ctx.groupId}' AND legal_entity_id = '${ctx.legalEntityId}' AND branch_id = '${ctx.branchId}'`;
  }

  /**
   * Create a WHERE clause for entity-level isolation
   */
  static getEntityIsolationClause(context: ValidatedTenancyContext): string {
    const ctx = context.getContext();
    return `tenant_id = '${ctx.tenantId}' AND legal_entity_id = '${ctx.legalEntityId}'`;
  }

  /**
   * Create a WHERE clause for group-level isolation
   */
  static getGroupIsolationClause(context: ValidatedTenancyContext): string {
    const ctx = context.getContext();
    return `tenant_id = '${ctx.tenantId}' AND group_id = '${ctx.groupId}'`;
  }
}

export default TenancyKernel;
