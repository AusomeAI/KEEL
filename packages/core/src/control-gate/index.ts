/**
 * Control Gate
 *
 * The single boundary between humans and agents and the deterministic plane.
 *
 * Implements Laws 2, 7, 9, 10:
 * - Law 2: Manual UI path for a capability must ship before agent capability
 * - Law 7: Every material decision emits a signed Decision Record
 * - Law 9: Hard autonomy ceilings are compile-time constants
 * - Law 10: Per-agent identity with short-lived scoped tokens
 *
 * Contract:
 * 1. Authenticate actor (per-agent identity, short-lived token)
 * 2. Authorise against tenancy scope (tenant/group/entity/branch)
 * 3. Check autonomy ceiling for this intent type
 * 4. Check budget and rate limits (agents only)
 * 5. Validate against compiled policy — same validation for both
 * 6. Simulate deterministically; attach projected effect
 * 7. Route for human approval if autonomy level requires it
 * 8. Execute as an ordinary ledger transaction
 * 9. Emit signed Decision Record
 *
 * Wave 1 deliverable: TransactionIntent type definitions, control flow interfaces
 * Wave 2+: Full implementation in services/gate
 */

export * from "../types/transaction-intent";
export * from "./pipeline";

/**
 * Control Gate result — outcome of passing an intent through the gate
 */
export type ControlGateResult = import("./pipeline").ControlGateOutcome;

/**
 * Exported instances and utilities
 */
export { getControlGatePipeline, resetControlGatePipeline } from "./pipeline";
