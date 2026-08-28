/**
 * Event types for the bitemporal ledger
 *
 * Enforces Law 1: The ledger is append-only, bitemporal
 *
 * Every event carries:
 * - validTime: when the fact was true in the business world
 * - transactionTime: when the system came to believe it
 *
 * Events are never updated or deleted, only superseded by new events.
 */

import { z } from "zod";
import { ActorSchema, type Actor } from "./actor";
import { TenantContextSchema, type TenantContext } from "./tenant";

/**
 * Core event structure
 *
 * All ledger events inherit from this base schema
 */
export const LedgerEventSchema = z.object({
  id: z.string().uuid().describe("Unique event ID"),
  version: z.number().int().positive().describe("Event schema version"),

  // Bitemporal dimensions
  validTime: z.date().describe("When this fact was true in the business (effective date)"),
  transactionTime: z
    .date()
    .describe("When the system recorded this fact (when we came to believe it)"),

  // Tenancy and audit
  tenancy: TenantContextSchema,
  actor: ActorSchema.describe("Who recorded this event"),
  requestId: z.string().uuid().describe("Request ID for tracing"),

  // Event payload
  eventType: z.string().describe("Type-specific event category"),
  aggregateId: z.string().uuid().describe("The entity this event describes"),
  aggregateType: z
    .enum([
      "EMPLOYEE",
      "PAYROLL_RUN",
      "LEAVE_REQUEST",
      "POSITION",
      "ORGANIZATION",
      "POLICY",
      "OTHER",
    ])
    .describe("Entity type"),

  data: z.record(z.unknown()).describe("Event-specific payload"),

  // Compensation chains (if this is a correction)
  compensatesEventId: z
    .string()
    .uuid()
    .optional()
    .describe("If set, this event compensates (reverses) a previous event"),
  compensatedByEventId: z
    .string()
    .uuid()
    .optional()
    .describe("If set, this event is compensated by a later event"),

  // Metadata
  metadata: z
    .record(z.unknown())
    .optional()
    .describe("Implementation-specific metadata"),
});

export type LedgerEvent = z.infer<typeof LedgerEventSchema>;

/**
 * Employee hired event (example domain event)
 */
export const EmployeeHiredEventSchema = LedgerEventSchema.extend({
  eventType: z.literal("EMPLOYEE_HIRED"),
  aggregateType: z.literal("EMPLOYEE"),
  data: z.object({
    employeeId: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    emailAddress: z.string().email(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR", "TEMPORARY"]),
    startDate: z.date(),
    legalEntityId: z.string().uuid(),
  }),
});

export type EmployeeHiredEvent = z.infer<typeof EmployeeHiredEventSchema>;
