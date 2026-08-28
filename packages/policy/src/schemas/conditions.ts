/**
 * Condition schemas for policy DSL.
 *
 * Conditions are predicates that determine whether a rule applies.
 * Examples: "employee status is active", "hours worked > 40", "date is in Q1"
 *
 * No dynamic evaluation; conditions are compiled to a DAG.
 * See ADR 0004.
 */

import { z } from 'zod';
import { JurisdictionSchema, DurationSchema, MoneySchema } from './common.js';

/**
 * A single predicate: "field OPERATOR value"
 *
 * Examples:
 * - { field: "employee.status", operator: "==", value: "active" }
 * - { field: "period.hoursWorked", operator: ">", value: 40 }
 * - { field: "employee.jobTitle", operator: "in", value: ["Manager", "Director"] }
 */
export const PredicateValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.string().datetime(),
  MoneySchema,
  DurationSchema,
]);

export type PredicateValue = z.infer<typeof PredicateValueSchema>;

export const ComparisonOperatorSchema = z.enum([
  '==', // equality
  '!=', // inequality
  '>', // greater than
  '>=', // greater than or equal
  '<', // less than
  '<=', // less than or equal
  'in', // value in array
  'not-in', // value not in array
  'contains', // string contains
  'starts-with', // string starts with
  'ends-with', // string ends with
  'matches-regex', // regex match
]);

export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;

export const PredicateSchema = z.object({
  field: z
    .string()
    .regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/, 'Invalid field path')
    .describe('Dotted path to employee/period field (e.g., employee.status, period.hoursWorked)'),
  operator: ComparisonOperatorSchema,
  value: PredicateValueSchema,
});

export type Predicate = z.infer<typeof PredicateSchema>;

/**
 * Boolean operator: combine multiple predicates.
 */
export const BooleanOperatorSchema = z.enum(['all', 'any', 'none']);
export type BooleanOperator = z.infer<typeof BooleanOperatorSchema>;

/**
 * Condition: recursive structure for complex boolean logic.
 *
 * Examples:
 * - Simple: { operator: "all", predicates: [{ field: "...", operator: "==", value: "..." }] }
 * - Complex: { operator: "any", conditions: [ {nested condition}, {nested condition} ] }
 */
export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.object({
    operator: BooleanOperatorSchema,
    predicates: PredicateSchema.array().optional().describe('List of predicates to combine'),
    conditions: ConditionSchema.array()
      .optional()
      .describe('Nested conditions for complex boolean logic'),
  })
);

export type Condition = {
  operator: BooleanOperator;
  predicates?: Predicate[];
  conditions?: Condition[];
};

/**
 * Applicability condition: determines if a rule applies to an employee/period.
 *
 * Used for employer/jurisdiction-specific rules.
 * Example: "applies to employees in the US, not in California, and earning < $100k"
 */
export const ApplicabilityConditionSchema = z.object({
  jurisdictions: JurisdictionSchema.array().optional().describe('Jurisdictions where this rule applies'),
  employeeStatus: z
    .enum(['active', 'on-leave', 'suspended', 'terminated', 'all'])
    .array()
    .optional()
    .describe('Employee statuses this rule applies to'),
  employmentType: z
    .enum(['full-time', 'part-time', 'contractor', 'intern', 'all'])
    .array()
    .optional()
    .describe('Employment types this rule applies to'),
  minTenure: DurationSchema.optional().describe('Minimum employment duration'),
  condition: ConditionSchema.optional().describe('Custom condition expression'),
});

export type ApplicabilityCondition = z.infer<typeof ApplicabilityConditionSchema>;
