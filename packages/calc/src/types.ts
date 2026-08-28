/**
 * Core types for policy execution.
 *
 * No LLM. Purely deterministic calculation.
 * See ADR 0002, ADR 0004.
 */

import type { Money, Duration } from '@keel/policy/schemas';

/**
 * Policy execution request: what to calculate.
 *
 * Input to the calculation kernel.
 * Contains employee data, period data, and the policy to apply.
 */
export interface PolicyExecutionRequest {
  policyId: string;
  policyVersion: string;

  // Employee master data
  employee: Record<string, unknown>;

  // Payroll period data
  period: Record<string, unknown>;

  // Results from previous policies (for chaining)
  previousResults?: Record<string, unknown>;

  // Execution options
  executionId?: string; // For audit trails
  asOf?: Date; // Effective date for policy versioning (defaults to effective_from)
}

/**
 * Rule application trace: which rules fired and why.
 *
 * Used for explaining and auditing the result.
 */
export interface RuleApplication {
  ruleId: string;
  applied: boolean;
  reason?: string; // Why this rule did/didn't apply
  contribution?: Record<string, Money | Duration | number | string>;
  precedence: number;
  citations: string[];
}

/**
 * Policy execution result: what was calculated.
 *
 * Output from the calculation kernel.
 * Contains the calculated values, rule applications, and any errors.
 */
export interface PolicyExecutionResult {
  policyId: string;
  policyVersion: string;
  success: boolean;
  executionId?: string;
  executedAt: Date;

  // Calculated output values
  outputs: Record<string, Money | Duration | number | string | boolean>;

  // Which rules applied
  ruleApplications: RuleApplication[];

  // Errors (if success = false)
  errors: string[];
}

/**
 * Batch execution request: multiple policies for multiple employees.
 */
export interface BatchExecutionRequest {
  requests: PolicyExecutionRequest[];

  // Execution options
  parallel?: boolean; // Execute in parallel (default: true)
  stopOnError?: boolean; // Stop on first error (default: false)
}

/**
 * Batch execution result: results for all requests.
 */
export interface BatchExecutionResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  results: PolicyExecutionResult[];
  executedAt: Date;
}

/**
 * Policy cache entry: memoized compiled policy.
 *
 * Compiled policies are expensive to load; cache them.
 */
export interface CachedPolicy {
  policyId: string;
  policyVersion: string;
  loadedAt: Date;
  expiresAt: Date;
  policy: unknown; // CompiledPolicy (not imported to avoid circular dependency)
}
