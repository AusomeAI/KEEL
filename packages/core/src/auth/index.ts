/**
 * Authorisation Layer
 *
 * Implements Law 10: Per-agent identity with short-lived scoped tokens.
 * Never shared service accounts or static credentials.
 *
 * This module provides RBAC (Role-Based Access Control) and ABAC (Attribute-Based
 * Access Control) for the deterministic plane.
 *
 * Wave 1 deliverable: Type definitions and interfaces
 * Wave 2+: RBAC/ABAC engine, SoD (Segregation of Duties) matrix
 */

export * from "../types/actor";

/**
 * Stub for authorisation implementation (Wave 1+)
 */
export interface AuthorisationEngine {
  // To be implemented
}
