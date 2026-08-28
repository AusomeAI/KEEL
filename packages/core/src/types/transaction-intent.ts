/**
 * TransactionIntent type — the unit of work for the Control Gate
 *
 * Enforces Law 2: Every TransactionIntent type must have a registered human UI route.
 *
 * A TransactionIntent is:
 * - A typed, schema-validated proposal from a human or agent
 * - Passed through the Control Gate for validation, approval, and execution
 * - Never directly executed; always goes through Control Gate
 *
 * The Control Gate ensures:
 * 1. Authentication
 * 2. Authorisation (tenant scope, role-based access)
 * 3. Autonomy ceiling check
 * 4. Budget/rate limit check (agents only)
 * 5. Policy validation (deterministic, same for humans and agents)
 * 6. Simulation and projection
 * 7. Routing for human approval if needed
 * 8. Execution as ledger transaction
 * 9. Signed Decision Record emission
 */

import { z } from "zod";
import { ActorSchema, type Actor } from "./actor";
import { TenantContextSchema, type TenantContext } from "./tenant";

/**
 * All possible transaction intent types
 * This registry is enforced by the CI law: verify-transaction-intent-routes.mjs
 * A new type cannot be added without also adding a human UI route (Law 2)
 */
export const TransactionIntentTypeSchema = z.enum([
  // Core entitlement
  "HIRE_EMPLOYEE",
  "TERMINATE_EMPLOYEE",
  "CHANGE_JOB",
  "CHANGE_PAY",

  // Time and leave
  "SUBMIT_TIMESHEET",
  "REQUEST_LEAVE",
  "APPROVE_LEAVE",
  "CANCEL_LEAVE",

  // Payroll
  "RUN_PAYROLL",
  "APPROVE_PAYROLL",
  "POST_PAYROLL_TO_GL",

  // Approvals
  "APPROVE_TRANSACTION",
  "REJECT_TRANSACTION",
  "ESCALATE_TRANSACTION",
]);

export type TransactionIntentType = z.infer<typeof TransactionIntentTypeSchema>;

/**
 * Temporal metadata for a transaction
 */
export const TransactionTemporalSchema = z.object({
  asOf: z
    .date()
    .describe("Point in transaction time (when we come to believe this fact)"),
  effectiveFrom: z
    .date()
    .describe("Point in valid time (when this fact becomes effective in the business)"),
  efficitiveUntil: z
    .date()
    .optional()
    .describe("When this fact expires (if it is time-bound)"),
});

export type TransactionTemporal = z.infer<typeof TransactionTemporalSchema>;

/**
 * Provenance metadata for audit and compliance
 */
export const ProvenanceSchema = z.object({
  requestId: z.string().uuid().describe("Unique request tracking ID"),
  correlationId: z
    .string()
    .optional()
    .describe("Correlation ID for tracing across microservices"),
  sourceSystem: z
    .string()
    .optional()
    .describe("System that originated this request (UI, API, agent)"),
  ipAddress: z
    .string()
    .ip()
    .optional()
    .describe("IP address of the requesting client"),
  userAgent: z
    .string()
    .optional()
    .describe("User-Agent header (for web requests)"),
});

export type Provenance = z.infer<typeof ProvenanceSchema>;

/**
 * TransactionIntent — the core request type for all work
 */
export const TransactionIntentSchema = z.object({
  type: TransactionIntentTypeSchema,
  subject: z.string().uuid().describe("The entity being acted upon (employee, payroll run, etc.)"),
  payload: z.record(z.unknown()).describe("Type-specific payload (validated by intent handler)"),

  actor: ActorSchema.describe("Who is making this request (human or agent)"),
  tenancy: TenantContextSchema.describe("Tenant scope context for this request"),

  temporal: TransactionTemporalSchema,
  provenance: ProvenanceSchema,
});

export type TransactionIntent = z.infer<typeof TransactionIntentSchema>;

/**
 * Autonomy level for a TransactionIntent type
 *
 * Enforces Law 9: Hard autonomy ceilings are compile-time constants
 *
 * L0 = Fully autonomous (agent decides and executes)
 * L1 = Supervised (agent proposes, human approves before execution)
 * L2 = Assisted (agent informs a human who decides)
 * L3 = Manual only (no agent involvement)
 */
export const AutonomyLevelSchema = z.enum(["L0", "L1", "L2", "L3"]);
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;

/**
 * Intent registration metadata
 * Used to define which intent types are supported, their routes, autonomy levels, etc.
 */
export const IntentRegistrationSchema = z.object({
  type: TransactionIntentTypeSchema,
  autonomyLevel: AutonomyLevelSchema.describe(
    "Max autonomy level for agents (compile-time constant, cannot be escalated)"
  ),
  requiresApproval: z
    .boolean()
    .describe("Whether humans must approve before execution"),
  uiRoute: z
    .string()
    .describe("Human UI route path (must exist before agent capability)"),
  description: z.string(),
});

export type IntentRegistration = z.infer<typeof IntentRegistrationSchema>;
