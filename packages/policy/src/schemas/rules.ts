/**
 * Rule schemas for policy DSL.
 *
 * A rule is: IF condition(s) THEN apply calculation(s).
 * Rules are the primary building blocks of a policy.
 * See ADR 0004.
 */

import { z } from 'zod';
import { StatutoryCitationSchema } from './common.js';
import { ApplicabilityConditionSchema, ConditionSchema } from './conditions.js';
import { CalculationSchema, CalculatedFieldSchema } from './calculations.js';

/**
 * Rule effect: what happens when a rule applies.
 *
 * Effects can be:
 * - "compute": calculate and store a result
 * - "apply": apply a calculation to produce output
 * - "validate": check a constraint and fail if violated
 */
export const RuleEffectTypeSchema = z.enum(['compute', 'apply', 'validate']);
export type RuleEffectType = z.infer<typeof RuleEffectTypeSchema>;

/**
 * A single rule: the atomic unit of policy logic.
 *
 * Structure:
 * 1. Applicability: when does this rule apply?
 * 2. Condition: under what circumstances?
 * 3. Effect: what calculation is performed?
 * 4. Citations: what statutory references justify this?
 *
 * Example (US FLSA overtime):
 * {
 *   id: "us-flsa-weekly-ot",
 *   description: "Hours beyond 40/week are paid at 1.5x rate",
 *   applicability: { jurisdictions: ["US-FLSA"] },
 *   condition: { operator: "all", predicates: [...] },
 *   effect: { type: "apply", calculation: {...} },
 *   citations: ["29 CFR 516.1"],
 *   precedence: 100
 * }
 */
export const RuleSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/, 'Rule IDs must be lowercase with hyphens')
    .describe('Unique identifier within the policy'),
  description: z.string().min(10).max(500).describe('Human-readable rule summary'),
  applicability: ApplicabilityConditionSchema.optional().describe(
    'Who/where/when this rule applies'
  ),
  condition: ConditionSchema.optional().describe(
    'Condition that must be true for this rule to fire'
  ),
  effect: z.object({
    type: RuleEffectTypeSchema,
    calculation: CalculationSchema.optional().describe('Calculation to perform'),
    output: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/)
      .optional()
      .describe('Output field to store the result in'),
  }),
  citations: StatutoryCitationSchema.array().min(1).describe('At least one statutory reference'),
  precedence: z.number().int().min(0).max(9999).describe('Order of evaluation (lower = earlier)'),
  examples: z
    .object({
      description: z.string(),
      input: z.record(z.unknown()),
      expectedOutput: z.unknown(),
    })
    .array()
    .optional()
    .describe('Example scenarios for documentation and testing'),
});

export type Rule = z.infer<typeof RuleSchema>;

/**
 * Rule group: a named collection of related rules.
 *
 * Used to organize policies into logical sections.
 * Examples:
 * - "Regular Hours Calculation"
 * - "Overtime Rules"
 * - "Deductions and Withholdings"
 */
export const RuleGroupSchema = z.object({
  name: z.string().min(5).max(100).describe('Group name'),
  description: z.string().min(10).max(500).optional(),
  rules: RuleSchema.array().min(1).describe('Rules in this group'),
});

export type RuleGroup = z.infer<typeof RuleGroupSchema>;

/**
 * Policy input specification: what data the policy needs to execute.
 *
 * Defines the schema of inputs required to run this policy.
 * Example: US FLSA overtime policy requires employee.hourlyRate, period.hoursWorked, etc.
 */
export const PolicyInputSpecSchema = z.object({
  employee: z.object({
    fields: z
      .string()
      .array()
      .describe('Required employee fields (e.g., status, jobTitle, hourlyRate)'),
  }),
  period: z.object({
    fields: z
      .string()
      .array()
      .describe('Required period fields (e.g., hoursWorked, startDate, endDate)'),
  }),
  previousResults: z
    .string()
    .array()
    .optional()
    .describe('Results from previous policies to import'),
});

export type PolicyInputSpec = z.infer<typeof PolicyInputSpecSchema>;

/**
 * Policy output specification: what this policy produces.
 *
 * Example: US FLSA overtime policy outputs { regularPay, overtimePay, totalOvertimeHours }
 */
export const PolicyOutputSpecSchema = z.object({
  fields: z
    .object({
      name: z.string(),
      type: z.enum(['money', 'duration', 'number', 'boolean', 'string']),
      description: z.string(),
      citation: z.string().optional(),
    })
    .array()
    .min(1)
    .describe('Output fields produced by this policy'),
});

export type PolicyOutputSpec = z.infer<typeof PolicyOutputSpecSchema>;
