/**
 * Golden dataset schemas.
 *
 * A golden dataset is a collection of test cases that validate a policy.
 * Every policy must include a golden dataset with 100% rule coverage.
 *
 * See Law 6: "No policy without a golden dataset at 100% rule coverage with statutory citations"
 * See ADR 0004.
 */

import { z } from 'zod';
import { MoneySchema, DurationSchema, StatutoryCitationSchema } from './common.js';

/**
 * A single test input: employee and period data.
 *
 * Represents one employee-period combination to test.
 * Example: "Employee EMP001 works 45 hours in week Jan 1–7"
 */
export const GoldenTestInputSchema = z.object({
  testId: z
    .string()
    .regex(/^test-[a-z0-9-]+$/)
    .describe('Unique identifier for this test case'),
  description: z.string().min(10).describe('What this test case validates'),
  employee: z.record(z.unknown()).describe('Employee data (status, hourlyRate, etc.)'),
  period: z.record(z.unknown()).describe('Period data (hoursWorked, startDate, etc.)'),
});

export type GoldenTestInput = z.infer<typeof GoldenTestInputSchema>;

/**
 * A single test output: what the policy should produce.
 *
 * Includes both the calculated amounts and the rule citations.
 */
export const GoldenTestOutputSchema = z.object({
  fields: z.record(z.union([MoneySchema, DurationSchema, z.number(), z.boolean(), z.string()])),
});

export type GoldenTestOutput = z.infer<typeof GoldenTestOutputSchema>;

/**
 * Rule application trace: which rules fired and why.
 *
 * Used for debugging and explaining the result to stakeholders.
 * Example:
 * {
 *   ruleId: "us-flsa-weekly-ot",
 *   applied: true,
 *   reason: "employee.status == active && period.hoursWorked > 40",
 *   contribution: { overtimePay: { amount: 15000, ... } },
 *   citation: "29 CFR 516.1"
 * }
 */
export const RuleApplicationSchema = z.object({
  ruleId: z.string().describe('ID of the rule'),
  applied: z.boolean().describe('Whether this rule fired'),
  reason: z.string().optional().describe('Why or why not this rule applied'),
  contribution: z.record(z.union([MoneySchema, DurationSchema, z.number()])).optional(),
  citation: StatutoryCitationSchema,
});

export type RuleApplication = z.infer<typeof RuleApplicationSchema>;

/**
 * A complete test case: input + expected output + rule trace.
 *
 * The "source of truth" for policy correctness.
 */
export const GoldenTestCaseSchema = z.object({
  input: GoldenTestInputSchema,
  expectedOutput: GoldenTestOutputSchema,
  ruleApplications: RuleApplicationSchema.array().min(1).describe('Which rules should apply and why'),
});

export type GoldenTestCase = z.infer<typeof GoldenTestCaseSchema>;

/**
 * Coverage metadata: which rules are tested.
 *
 * Ensures 100% coverage before deployment.
 */
export const CoverageMetadataSchema = z.object({
  totalRules: z.number().int().min(1),
  testedRules: z.string().array().describe('Rule IDs with at least one passing test'),
  uncoveredRules: z.string().array().optional().describe('Rule IDs without test coverage'),
  coverage: z.number().min(0).max(1).describe('Coverage percentage (0.0 to 1.0)'),
});

export type CoverageMetadata = z.infer<typeof CoverageMetadataSchema>;

/**
 * The complete golden dataset for a policy.
 *
 * This is the definitive test suite that validates a policy before deployment.
 */
export const GoldenDatasetSchema = z.object({
  policyId: z.string(),
  policyVersion: z.string(),
  jurisdiction: z.string(),
  description: z.string().optional(),
  testCases: GoldenTestCaseSchema.array().min(1).describe('At least one test case per rule'),
  coverage: CoverageMetadataSchema,
  generatedAt: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v))
    .optional(),
});

export type GoldenDataset = z.infer<typeof GoldenDatasetSchema>;
