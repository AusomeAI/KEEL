/**
 * Tenancy Kernel
 *
 * Implements Law 5: Tenant isolation enforced by PostgreSQL RLS in the kernel,
 * never by application queries.
 *
 * This module defines the tenancy hierarchy and provides utilities for
 * scoping operations to tenant context.
 *
 * Wave 1 deliverable: Type definitions and kernel interfaces
 * Wave 2+: PostgreSQL RLS policy enforcement
 */

export * from "../types/tenant";

/**
 * Stub for tenancy kernel implementation (Wave 1+)
 */
export interface TenancyKernel {
  // To be implemented
}
