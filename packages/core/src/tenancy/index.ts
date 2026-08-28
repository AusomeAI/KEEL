/**
 * Tenancy Kernel
 *
 * Implements Law 5: Tenant isolation enforced by PostgreSQL RLS in the kernel,
 * never by application queries.
 *
 * This module defines the tenancy hierarchy and provides utilities for
 * scoping operations to tenant context.
 *
 * Wave 1 deliverable: Type definitions and kernel implementation
 * - ValidatedTenancyContext: Typed context for all operations
 * - TenancyKernel: Factory and validation methods
 * - TenancyContextManager: Request-scoped context management
 * - TenancyAwareSQLBuilder: Query builders with automatic tenancy scoping
 */

export * from "../types/tenant";
export {
  ValidatedTenancyContext,
  TenancyKernel,
  TenancyContextManager,
  TenancyAwareSQLBuilder,
} from "./tenancy-kernel";
