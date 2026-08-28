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
 * 2. Rule graph (flattened, topologically sorted)
 * 3. Execution order (computed from dependencies)
 * 4. Input/output specifications
 * 5. Signatures (author + approver)
 *
 * Once signed, a policy is immutable. Changes result in a new version.
 * Compiled policies are deterministic: identical inputs produce identical output.
 */
export const CompiledPolicySchema = z.object({
  id: z.string().describe('Policy ID (e.g., overtime/us-flsa)'),
  version: z.string().describe('Policy version (e.g., 2026-Q1)'),
  jurisdiction: z.string().describe('Jurisdiction code (e.g., US-FLSA)'),
  author: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email().optional(),
    role: z.enum(['author', 'approver', 'administrator']),
  }).describe('Author of this policy'),
  approver: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email().optional(),
    role: z.enum(['author', 'approver', 'administrator']),
  }).optional().describe('Approver of this policy'),
  signature: z.string().describe('Cryptographic signature'),
  compiledAt: z.date().describe('When this policy was compiled'),
  metadata: PolicyMetadataSchema,
  ruleGraph: z.any().array().min(1).describe('Flattened rule graph with dependency metadata'),
  inputs: z.string().array().describe('Input field names required by this policy'),
  outputs: z.object({
    name: z.string(),
    type: z.enum(['money', 'duration', 'number', 'boolean', 'string']),
    description: z.string(),
    citation: z.string().optional(),
  }).array().min(1).describe('Output fields produced by this policy'),
  executionOrder: z.any().array().describe('Rules in topologically sorted execution order'),
  signatures: z.object({
    author: SignatureSchema,
    approver: SignatureSchema.optional().describe('Approver signature (required for production)'),
  }).optional(),
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
