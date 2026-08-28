/**
 * Policy executor: deterministically executes compiled policies.
 *
 * Pure function: no I/O, no clock, no randomness.
 * Given identical inputs, output is byte-identical forever.
 *
 * This is the Wave 1 TypeScript reference implementation.
 * In Wave 2, the Rust/WASM version replaces this for production.
 *
 * See ADR 0002, ADR 0004.
 */

import type { CompiledPolicy, Rule } from '@keel/policy/schemas';
import type {
  PolicyExecutionRequest,
  PolicyExecutionResult,
  RuleApplication,
  BatchExecutionRequest,
  BatchExecutionResult,
} from './types.js';

/**
 * Execute a single policy against employee/period data.
 *
 * Steps:
 * 1. Load the compiled policy (stub in Wave 1; loaded from policy store in Wave 2)
 * 2. Sort rules by precedence
 * 3. For each rule:
 *    a. Evaluate applicability condition
 *    b. Evaluate rule condition
 *    c. If both true, compute effect and store result
 * 4. Return outputs + rule application trace
 *
 * TODO(Wave 2): Integrate with policy store to load compiled policies
 * TODO(Wave 2): Integrate with Rust/WASM for actual calculations
 */
export async function executePolicyAsync(
  request: PolicyExecutionRequest
): Promise<PolicyExecutionResult> {
  const startTime = new Date();

  const result: PolicyExecutionResult = {
    policyId: request.policyId,
    policyVersion: request.policyVersion,
    success: false,
    executionId: request.executionId,
    executedAt: startTime,
    outputs: {},
    ruleApplications: [],
    errors: [],
  };

  try {
    // Wave 1: This is a placeholder.
    // In Wave 2, we will:
    // 1. Load the compiled policy from the policy store
    // 2. Create a rule executor context
    // 3. Evaluate each rule in precedence order
    // 4. Accumulate outputs

    // For now, return empty result
    result.success = true;
  } catch (err) {
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}

/**
 * Batch execute multiple policies.
 *
 * Optionally executes in parallel for performance.
 */
export async function executePoliciesBatch(
  request: BatchExecutionRequest
): Promise<BatchExecutionResult> {
  const startTime = new Date();
  const results: PolicyExecutionResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  try {
    if (request.parallel) {
      // Execute all requests in parallel
      const promises = request.requests.map((req) => executePolicyAsync(req));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } else {
      // Execute sequentially
      for (const req of request.requests) {
        const result = await executePolicyAsync(req);
        results.push(result);

        if (request.stopOnError && !result.success) {
          failureCount++;
          break;
        }
      }
    }

    // Count successes/failures
    for (const result of results) {
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  } catch (err) {
    // Batch-level error
    failureCount = request.requests.length;
  }

  return {
    totalRequests: request.requests.length,
    successfulRequests: successCount,
    failedRequests: failureCount,
    results,
    executedAt: startTime,
  };
}

/**
 * RuleContext: mutable state during rule evaluation.
 *
 * Tracks computed values, rule applications, and intermediate results.
 */
interface RuleContext {
  employee: Record<string, unknown>;
  period: Record<string, unknown>;
  previousResults: Record<string, unknown>;
  computed: Record<string, unknown>; // Intermediate computed values
  ruleApplications: RuleApplication[];
}

/**
 * Evaluate a single rule against a context.
 *
 * Steps:
 * 1. Check applicability condition (jurisdiction, employment type, etc.)
 * 2. Check rule condition (if present)
 * 3. If both pass, compute the effect
 * 4. Store result in context
 * 5. Record rule application
 *
 * TODO(Wave 2): Implement actual condition and calculation evaluation
 */
function evaluateRule(rule: Rule, context: RuleContext): RuleApplication {
  const application: RuleApplication = {
    ruleId: rule.id,
    applied: false,
    precedence: rule.precedence,
    citations: rule.citations,
  };

  // In Wave 1, this is a stub.
  // In Wave 2, we will:
  // 1. Evaluate rule.applicability against context
  // 2. Evaluate rule.condition against context
  // 3. If both pass, evaluate rule.effect (calculation)
  // 4. Store result in context.computed
  // 5. Update application.applied = true

  context.ruleApplications.push(application);
  return application;
}

/**
 * Evaluate a calculation (multiply, add, etc.).
 *
 * This is where the actual arithmetic happens.
 * Calculations reference fields from employee, period, or prior computed values.
 *
 * TODO(Wave 2): Implement calculation evaluation
 */
function evaluateCalculation(calculation: unknown, context: RuleContext): unknown {
  // Stub in Wave 1
  return null;
}
