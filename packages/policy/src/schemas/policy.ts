/**
 * Top-level policy artifact schema.
 *
 * A policy is a versioned, signed collection of rules that produce deterministic outputs.
 * Policies are compiled to rule graphs and executed by the Rust/WASM kernel.
 * See ADR 0002, ADR 0004.
 */

import { z } from 'zod';
import { PolicyMetadataSchema, SignatureSchema } from './common.js';
import { RuleGroupSchema, PolicyInputSpecSchema, PolicyOutputSpecSchema } from './rules.js';

/**
 * Compiled policy artifact: the immutable, signed representation of a policy.
 *
 * This is what gets deployed to the kernel and executed deterministically.
 * Contains:
 * 1. Metadata (authorship, version, jurisdiction)
 * 2. Rules (grouped for clarity)
 * 3. Input/output specifications
 * 4. Signatures (author + approver)
 *
 * Once signed, a policy is immutable. Changes result in a new version.
 */
export const CompiledPolicySchema = z.object({
  metadata: PolicyMetadataSchema,
  ruleGroups: RuleGroupSchema.array().min(1).describe('Organized rules'),
  inputSpec: PolicyInputSpecSchema,
  outputSpec: PolicyOutputSpecSchema,
  signatures: z.object({
    author: SignatureSchema,
    approver: SignatureSchema.optional().describe('Approver signature (required for production)'),
  }),
  compiledAt: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v))
    .describe('When this policy was compiled'),
});

export type CompiledPolicy = z.infer<typeof CompiledPolicySchema>;

/**
 * Policy DSL definition: the human-authored, uncompiled policy.
 *
 * This is what engineers/domain experts write in TypeScript/DSL.
 * After validation and compilation, it becomes a CompiledPolicy.
 */
export const PolicyDefinitionSchema = z.object({
  metadata: PolicyMetadataSchema,
  ruleGroups: RuleGroupSchema.array().min(1),
  inputSpec: PolicyInputSpecSchema,
  outputSpec: PolicyOutputSpecSchema,
});

export type PolicyDefinition = z.infer<typeof PolicyDefinitionSchema>;

/**
 * Policy versioning lineage: tracks supersession relationships.
 *
 * Used to determine which version of a policy was in effect on a historical date.
 * Enables retroactive payroll recalculation.
 */
export const PolicyLineageSchema = z.object({
  policyId: z.string(),
  versions: z
    .object({
      version: z.string(),
      effectiveFrom: z.date(),
      effectiveTo: z.date().optional(),
      supersededBy: z.string().optional(),
    })
    .array(),
});

export type PolicyLineage = z.infer<typeof PolicyLineageSchema>;
