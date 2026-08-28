/**
 * Calculation schemas for policy DSL.
 *
 * Calculations define how to compute amounts (money or duration).
 * Examples: "hourly rate * hours", "base salary * 0.5", "accrual per month"
 *
 * Only pre-approved calculation types; no arbitrary functions.
 * Calculations are compiled to a dependency graph for deterministic execution.
 * See ADR 0004.
 */

import { z } from 'zod';
import { MoneySchema, DurationSchema } from './common.js';

/**
 * Rounding mode for monetary and temporal values.
 *
 * Payroll requires precise control over rounding to avoid cumulative errors.
 * Examples:
 * - Tax withholding: half-up (standard practice)
 * - Accrual: truncate (favor employee when computing accrual, favor employer when consuming)
 */
export const RoundingModeSchema = z.enum([
  'half-up', // Standard banker's rounding
  'half-down', // Round .5 down
  'ceil', // Always round up
  'floor', // Always round down
  'truncate', // Remove decimal places
]);

export type RoundingMode = z.infer<typeof RoundingModeSchema>;

/**
 * Reference to a field or previous calculation result.
 *
 * Scope determines where the reference originates:
 * - "employee": from employee master (e.g., hourlyRate, taxId)
 * - "period": from payroll period (e.g., hoursWorked, startDate)
 * - "rule": from a previous rule in this policy (e.g., overtimeHours)
 * - "constant": a fixed value defined in the policy
 *
 * Examples:
 * - { scope: "employee", path: "hourlyRate" }
 * - { scope: "period", path: "hoursWorked" }
 * - { scope: "rule", path: "overtimeHours" }
 * - { scope: "constant", path: "OT_MULTIPLIER", value: 1.5 }
 */
export const ReferenceSchema = z.object({
  scope: z.enum(['employee', 'period', 'rule', 'constant']),
  path: z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/, 'Invalid reference path'),
  description: z.string().optional().describe('Human-readable description of what this field contains'),
});

export type Reference = z.infer<typeof ReferenceSchema>;

/**
 * A constant value embedded in a policy.
 *
 * Used for statutory multipliers, thresholds, etc.
 * Examples:
 * - { name: "WEEKLY_THRESHOLD", value: 40 } (US FLSA 40-hour threshold)
 * - { name: "OT_MULTIPLIER", value: 1.5 } (Time-and-a-half multiplier)
 */
export const ConstantSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Constant names must be UPPERCASE_SNAKE_CASE'),
  value: z.union([z.number(), z.string(), MoneySchema, DurationSchema]),
  description: z.string().optional(),
  citation: z.string().optional().describe('Statutory reference for this constant'),
});

export type Constant = z.infer<typeof ConstantSchema>;

/**
 * Calculation type: "literal" — a fixed value, no computation.
 *
 * Used for flat allowances, fixed deductions, etc.
 */
export const LiteralCalculationSchema = z.object({
  type: z.literal('literal'),
  value: MoneySchema,
});

export type LiteralCalculation = z.infer<typeof LiteralCalculationSchema>;

/**
 * Calculation type: "multiply" — multiply two values.
 *
 * Examples:
 * - hourlyRate * hoursWorked
 * - baseSalary * 0.5 (for part-time)
 * - amount * OT_MULTIPLIER
 */
export const MultiplyCalculationSchema = z.object({
  type: z.literal('multiply'),
  operands: ReferenceSchema.array().length(2).describe('Exactly two operands to multiply'),
  rounding: RoundingModeSchema.optional().default('half-up'),
});

export type MultiplyCalculation = z.infer<typeof MultiplyCalculationSchema>;

/**
 * Calculation type: "add" — sum multiple values.
 *
 * Examples:
 * - regularPay + overtimePay
 * - base + commission + bonus
 */
export const AddCalculationSchema = z.object({
  type: z.literal('add'),
  operands: ReferenceSchema.array().min(2).describe('Two or more operands to sum'),
});

export type AddCalculation = z.infer<typeof AddCalculationSchema>;

/**
 * Calculation type: "subtract" — subtract operands.
 *
 * Examples:
 * - grossPay - deductions
 * - accrualBalance - hoursConsumed
 */
export const SubtractCalculationSchema = z.object({
  type: z.literal('subtract'),
  operands: ReferenceSchema.array().length(2).describe('Minuend and subtrahend'),
  rounding: RoundingModeSchema.optional().default('half-up'),
});

export type SubtractCalculation = z.infer<typeof SubtractCalculationSchema>;

/**
 * Calculation type: "divide" — divide operands.
 *
 * Examples:
 * - totalHours / weeksInPeriod (to compute average weekly hours)
 * - amount / numberOfPayPeriods
 */
export const DivideCalculationSchema = z.object({
  type: z.literal('divide'),
  operands: ReferenceSchema.array().length(2).describe('Dividend and divisor'),
  rounding: RoundingModeSchema.optional().default('half-up'),
});

export type DivideCalculation = z.infer<typeof DivideCalculationSchema>;

/**
 * Calculation type: "piecewise" — if-then-else calculation.
 *
 * Used for tiered calculations, progressive tax rates, etc.
 * Example:
 * - If hoursWorked <= 40, rate is 1x; if 40 < hoursWorked <= 50, rate is 1.5x; else 2x
 */
export const PiecewiseCalculationSchema = z.object({
  type: z.literal('piecewise'),
  default: z.union([MoneySchema, DurationSchema]).describe('Default/fallback value'),
  cases: z
    .object({
      condition: z.string().describe('Condition (e.g., "hoursWorked > 40")'),
      value: z.union([MoneySchema, DurationSchema, ReferenceSchema]),
    })
    .array()
    .min(1)
    .describe('List of { condition, value } pairs; evaluated in order'),
});

export type PiecewiseCalculation = z.infer<typeof PiecewiseCalculationSchema>;

/**
 * Calculation type: "lookup" — table lookup or formula lookup.
 *
 * Used for tax brackets, leave accrual tables, statutory rate lookups.
 * Example:
 * - lookupTaxBracket(grossIncome) -> { baseRate: 10%, threshold: 10000 }
 */
export const LookupCalculationSchema = z.object({
  type: z.literal('lookup'),
  table: z.string().describe('Name of lookup table (e.g., TAX_BRACKETS_2026)'),
  key: ReferenceSchema.describe('Field to use as lookup key'),
  resultField: z.string().describe('Which field to extract from lookup result'),
});

export type LookupCalculation = z.infer<typeof LookupCalculationSchema>;

/**
 * Calculation type: "min" — minimum of multiple values.
 *
 * Examples:
 * - Min of (OT hours, cap on weekly OT)
 * - Min of (calculated tax, withholding ceiling)
 */
export const MinCalculationSchema = z.object({
  type: z.literal('min'),
  operands: ReferenceSchema.array().min(2).describe('Two or more operands; return minimum'),
});

export type MinCalculation = z.infer<typeof MinCalculationSchema>;

/**
 * Calculation type: "max" — maximum of multiple values.
 *
 * Examples:
 * - Max of (accrued hours, minimum annual entitlement)
 */
export const MaxCalculationSchema = z.object({
  type: z.literal('max'),
  operands: ReferenceSchema.array().min(2).describe('Two or more operands; return maximum'),
});

export type MaxCalculation = z.infer<typeof MaxCalculationSchema>;

/**
 * Union of all calculation types.
 *
 * A rule's effect is always one of these calculation types.
 */
export const CalculationSchema = z.union([
  LiteralCalculationSchema,
  MultiplyCalculationSchema,
  AddCalculationSchema,
  SubtractCalculationSchema,
  DivideCalculationSchema,
  PiecewiseCalculationSchema,
  LookupCalculationSchema,
  MinCalculationSchema,
  MaxCalculationSchema,
]);

export type Calculation = z.infer<typeof CalculationSchema>;

/**
 * Calculated field definition: a named computation with documentation.
 *
 * Used internally to build a DAG of calculated fields.
 * Example:
 * - name: "weeklyOvertimeHours"
 * - description: "Hours worked beyond 40 per week"
 * - calculation: { type: "subtract", operands: [...] }
 * - citation: "29 CFR 516.1"
 */
export const CalculatedFieldSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, 'Field names must be lowercase_snake_case'),
  description: z.string().describe('What this field represents'),
  calculation: CalculationSchema,
  resultType: z.enum(['money', 'duration', 'number', 'boolean']).describe('Type of value this calculation produces'),
  citation: z.string().array().optional().describe('Statutory references'),
});

export type CalculatedField = z.infer<typeof CalculatedFieldSchema>;
