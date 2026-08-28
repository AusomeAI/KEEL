/**
 * Common types and schemas used across the Policy DSL.
 *
 * No LLM execution. Policies are compiled to deterministic rule graphs.
 * See ADR 0002, ADR 0004.
 */

import { z } from 'zod';

/**
 * Money type: integer minor units (cents), currency code, and scale.
 *
 * Usage: { amount: 123456, currency: 'USD', scale: 2 } represents $1234.56
 * This prevents floating-point errors in payroll calculations.
 * See Law 4: No floating-point money or time.
 */
export const MoneySchema = z.object({
  amount: z.number().int().describe('Integer minor units (cents, pence, etc.)'),
  currency: z.string().length(3).describe('ISO 4217 currency code'),
  scale: z.number().int().min(0).max(8).describe('Number of decimal places'),
});

export type Money = z.infer<typeof MoneySchema>;

/**
 * Duration type: integer minutes.
 *
 * Usage: { minutes: 480 } represents 8 hours
 * Prevents floating-point errors in leave accrual, overtime calculations.
 * See Law 4.
 */
export const DurationSchema = z.object({
  minutes: z.number().int().min(0).describe('Duration in minutes'),
});

export type Duration = z.infer<typeof DurationSchema>;

/**
 * Jurisdiction code: territory where a policy applies.
 *
 * Examples: 'US-FLSA', 'US-CA', 'GB-HMRC', 'DE-SGB', 'AU-FW'
 * Policies are versioned per jurisdiction.
 */
export const JurisdictionSchema = z
  .string()
  .regex(/^[A-Z]{2}(-[A-Z0-9]+)*$/, 'Invalid jurisdiction code')
  .describe('Jurisdiction identifier (e.g., US-FLSA, GB-HMRC)');

export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

/**
 * Policy ID: unique identifier for a policy artifact.
 *
 * Examples: 'overtime/us-flsa', 'leave/au-nes', 'tax-withholding/us-federal'
 * Format: {domain}/{jurisdiction-slug}
 */
export const PolicyIdSchema = z
  .string()
  .regex(/^[a-z-]+\/[a-z-]+$/, 'Invalid policy ID')
  .describe('Policy identifier (e.g., overtime/us-flsa)');

export type PolicyId = z.infer<typeof PolicyIdSchema>;

/**
 * Policy version: semantic versioning plus effective date.
 *
 * Examples: '2026-Q1', '2026-01-01', '1.2.3'
 * Versions are immutable; changes result in a new version.
 */
export const PolicyVersionSchema = z
  .string()
  .regex(/^\d{4}-[A-Z0-9]+-\d+$|^\d{4}-\d{2}-\d{2}$|^\d+\.\d+\.\d+$/, 'Invalid policy version')
  .describe('Policy version (e.g., 2026-Q1, 2026-01-01, 1.0.0)');

export type PolicyVersion = z.infer<typeof PolicyVersionSchema>;

/**
 * Statutory citation: reference to a law or regulation.
 *
 * Examples: '29 CFR 516.1', 'Fair Work Act 2009', 'Gender Pay Gap Regulations 2017'
 * Every rule must have at least one citation.
 */
export const StatutoryCitationSchema = z
  .string()
  .min(5)
  .max(200)
  .describe('Statutory reference (e.g., 29 CFR 516.1)');

export type StatutoryCitation = z.infer<typeof StatutoryCitationSchema>;

/**
 * Actor identity: person who authored or approved a policy.
 *
 * Carries name, email, and unique ID for audit trails.
 * See Law 10: Per-agent identity with traceable actions.
 */
export const ActorSchema = z.object({
  id: z.string().uuid().describe('Unique actor identifier'),
  name: z.string().min(1).max(100).describe('Full name'),
  email: z.string().email().optional().describe('Contact email'),
  role: z.enum(['author', 'approver', 'administrator']).describe('Role in policy lifecycle'),
});

export type Actor = z.infer<typeof ActorSchema>;

/**
 * Timestamp in ISO 8601 format, stored as UTC.
 */
export const TimestampSchema = z
  .string()
  .datetime({ offset: true })
  .transform((v: string) => new Date(v))
  .describe('ISO 8601 timestamp');

export type Timestamp = Date;

/**
 * Cryptographic signature over a policy artifact.
 *
 * Enables attribution and non-repudiation.
 * Format: Base64-encoded signature; algorithm identified by key metadata.
 */
export const SignatureSchema = z.object({
  algorithm: z.enum(['SHA256-RSA', 'SHA256-ECDSA']).describe('Signature algorithm'),
  value: z.string().base64().describe('Base64-encoded signature'),
  publicKeyId: z.string().describe('Reference to the signing key'),
});

export type Signature = z.infer<typeof SignatureSchema>;

/**
 * Policy metadata: authorship, versioning, and lifecycle.
 */
export const PolicyMetadataSchema = z.object({
  id: PolicyIdSchema,
  version: PolicyVersionSchema,
  effectiveFrom: TimestampSchema.describe('Date when this policy version becomes active'),
  effectiveTo: TimestampSchema.optional().describe('Date when this policy version expires'),
  jurisdiction: JurisdictionSchema,
  description: z.string().min(10).max(1000).describe('Human-readable policy summary'),
  author: ActorSchema,
  approver: ActorSchema.optional().describe('Person who approved this policy for deployment'),
  supersedes: PolicyIdSchema.array()
    .optional()
    .describe('Policy IDs this version supersedes'),
  tags: z.string().array().optional().describe('Metadata tags (e.g., "payroll", "us-federal")'),
});

export type PolicyMetadata = z.infer<typeof PolicyMetadataSchema>;
