/**
 * Authorisation Layer
 *
 * Implements Law 10: Per-agent identity with short-lived scoped tokens.
 * Never shared service accounts or static credentials.
 *
 * This module provides RBAC (Role-Based Access Control) and SoD (Segregation of Duties)
 * for the deterministic plane.
 *
 * Wave 1 deliverable:
 * - RBAC Engine: Permission checking, role queries, delegation
 * - SoD Engine: Segregation of duties validation
 * - Types: Role, Permission, RoleAssignment, SoD violations
 */

export * from "../types/actor";
export * from "../types/rbac";
export { RBACEngine } from "./rbac-engine";
export { SoDEngine, type SoDRule } from "./sod-engine";
