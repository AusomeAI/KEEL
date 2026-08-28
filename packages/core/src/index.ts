/**
 * @keel/core — KEEL Platform Kernel
 *
 * Foundational package containing:
 * - Tenancy kernel (Tenant → Group → Entity → Branch)
 * - Authorisation (RBAC + ABAC + SoD)
 * - Bitemporal ledger event model
 * - Control Gate contract (TransactionIntent)
 * - Decision Record infrastructure
 *
 * This package contains NO imports from LLM providers, model SDKs, or agent frameworks.
 * Law 1 is enforced by dependency-cruiser.
 */

// Type exports
export * from "./types";

// Error exports
export * from "./errors";

// Module exports (implemented in Wave 1)
export * from "./tenancy";
export * from "./auth";
export * from "./ledger";
export * from "./control-gate";
