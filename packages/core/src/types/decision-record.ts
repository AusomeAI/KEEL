/**
 * Decision Record types
 *
 * Enforces Law 7: Every material HR decision emits a signed, hash-chained Decision Record
 *
 * A Decision Record is:
 * - Signed (cryptographically attributable to an author and approver)
 * - Hash-chained (linked to previous decision records for chain of custody)
 * - Immutable (appended to the ledger, never modified)
 * - Complete (contains the decision, rationale, and regulatory evidence)
 *
 * Decision Records are the compliance artifact - they prove to regulators
 * why a decision was made and what rule governed it.
 */

import { z } from "zod";
import { ActorSchema, type Actor } from "./actor";
import { TenantContextSchema, type TenantContext } from "./tenant";
import { TransactionIntentTypeSchema } from "./transaction-intent";

/**
 * Decision categories (material decisions that require a record)
 */
export const DecisionCategorySchema = z.enum([
  "HIRE",
  "TERMINATE",
  "PAY_CHANGE",
  "PROMOTION",
  "DEMOTION",
  "DISCIPLINE",
  "LEAVE_APPROVAL",
  "PAYROLL_APPROVAL",
  "POLICY_CHANGE",
  "BENEFIT_ENROLLMENT",
  "OTHER",
]);

export type DecisionCategory = z.infer<typeof DecisionCategorySchema>;

/**
 * A single decision (a step in a decision flow, e.g., manager approval, HR approval, payroll sign-off)
 */
export const DecisionSchema = z.object({
  deciderId: z
    .string()
    .uuid()
    .describe("Person or agent who made this decision"),
  role: z.string().describe("Their role/title (for audit trail)"),
  decision: z.enum(["APPROVED", "REJECTED", "ESCALATED"]).describe("The decision outcome"),
  reasoning: z.string().optional().describe("Free-text justification or notes"),
  timestamp: z.date().describe("When the decision was made"),
  signature: z
    .string()
    .optional()
    .describe("Digital signature (for critical decisions)"),
});

export type Decision = z.infer<typeof DecisionSchema>;

/**
 * Regulatory evidence linked to a decision
 * (e.g., "Minimum wage 2024: $15.13/hr per FLSA")
 */
export const RegulatoryEvidenceSchema = z.object({
  jurisdiction: z.string().describe("Tax authority or regulatory body (e.g., 'US.FEDERAL')"),
  rule: z.string().describe("The specific rule that governs this decision"),
  citation: z.string().optional().describe("Statutory reference or citation"),
  effectiveDate: z.date().describe("When this rule is in effect"),
  policyVersion: z.string().optional().describe("Version of the compiled policy applied"),
});

export type RegulatoryEvidence = z.infer<typeof RegulatoryEvidenceSchema>;

/**
 * Decision Record — the compliance artifact
 */
export const DecisionRecordSchema = z.object({
  id: z.string().uuid().describe("Unique decision record ID"),
  category: DecisionCategorySchema,
  subject: z.string().uuid().describe("Entity being decided upon (employee, payroll run, etc.)"),

  transactionIntentType: TransactionIntentTypeSchema.optional(),
  ledgerEventIds: z
    .array(z.string().uuid())
    .describe("Ledger event IDs that resulted from this decision"),

  tenancy: TenantContextSchema,
  actor: ActorSchema.describe("Actor who initiated this decision"),

  // Decision flow
  decisions: z
    .array(DecisionSchema)
    .min(1)
    .describe("Sequence of decisions (e.g., manager approval, then HR approval)"),

  // Compliance context
  regulatoryEvidence: z
    .array(RegulatoryEvidenceSchema)
    .describe("Rules and citations that governed this decision"),

  // Chain of custody
  previousRecordId: z
    .string()
    .uuid()
    .optional()
    .describe("Hash of previous decision record (chain of custody)"),
  recordHash: z
    .string()
    .describe("SHA-256 hash of this record (for integrity verification)"),

  // Metadata
  createdAt: z.date(),
  expiresAt: z.date().optional().describe("When this record is no longer needed for compliance"),
  archivedAt: z.date().optional().describe("When this record was moved to cold storage"),
});

export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
