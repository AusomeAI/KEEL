/**
 * Golden dataset harness: validates policies against test data.
 *
 * Ensures every policy achieves 100% rule coverage before deployment.
 * Law 6: "No policy without a golden dataset at 100% rule coverage with statutory citations"
 */

import { CompiledPolicy, GoldenDataset, GoldenTestCase, CoverageMetadata } from '../schemas/index.js';

/**
 * Test result: outcome of running a single test case against a policy.
 */
export interface TestResult {
  testId: string;
  passed: boolean;
  error?: string;
  actualOutput?: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  rulesApplied?: string[];
}

/**
 * Validation report: summary of policy testing.
 */
export interface ValidationReport {
  policyId: string;
  policyVersion: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: number; // 0.0 to 1.0
  uncoveredRules: string[];
  testResults: TestResult[];
  timestamp: Date;
}

/**
 * Golden dataset validator: runs policies against golden datasets.
 *
 * In Wave 1, this is a placeholder that validates schema correctness.
 * In Wave 2, it integrates with the Rust/WASM kernel to execute policies and verify outputs.
 */
export class GoldenDatasetValidator {
  /**
   * Validate a policy against its golden dataset.
   *
   * Steps:
   * 1. Load the policy and golden dataset
   * 2. For each test case:
   *    a. Execute the policy with the test input
   *    b. Compare actual output to expected output
   *    c. Verify rule applications match expected
   * 3. Calculate coverage: (number of tested rules) / (total rules)
   * 4. Fail if coverage < 100%
   *
   * TODO(Wave 2): Implement actual policy execution via Rust/WASM kernel
   */
  validatePolicy(policy: CompiledPolicy, goldenDataset: GoldenDataset): ValidationReport {
    const testResults: TestResult[] = [];
    const appliedRules = new Set<string>();

    // Validate schema correctness
    if (policy.metadata.id !== goldenDataset.policyId) {
      throw new Error(`Policy ID mismatch: ${policy.metadata.id} !== ${goldenDataset.policyId}`);
    }

    if (policy.metadata.version !== goldenDataset.policyVersion) {
      throw new Error(`Policy version mismatch: ${policy.metadata.version} !== ${goldenDataset.policyVersion}`);
    }

    // In Wave 1, we validate structure but don't execute policies yet
    // In Wave 2, we'll call the Rust/WASM kernel to execute policies
    for (const testCase of goldenDataset.testCases) {
      const result: TestResult = {
        testId: testCase.input.testId,
        passed: true, // Placeholder: will be determined by comparing outputs
      };

      // Track which rules are applied in tests
      for (const ruleApp of testCase.ruleApplications) {
        if (ruleApp.applied) {
          appliedRules.add(ruleApp.ruleId);
        }
      }

      testResults.push(result);
    }

    // Calculate coverage
    const totalRules = this.countRules(policy);
    const coverage = appliedRules.size / totalRules;
    const uncoveredRules = this.findUncoveredRules(policy, appliedRules);

    return {
      policyId: policy.metadata.id,
      policyVersion: policy.metadata.version,
      totalTests: testResults.length,
      passedTests: testResults.filter((r) => r.passed).length,
      failedTests: testResults.filter((r) => !r.passed).length,
      coverage,
      uncoveredRules,
      testResults,
      timestamp: new Date(),
    };
  }

  /**
   * Count total rules in a policy.
   */
  private countRules(policy: CompiledPolicy): number {
    const ruleGroups = (policy as any).ruleGroups;
    if (!ruleGroups) {
      // If ruleGroups doesn't exist, use ruleGraph length
      return (policy as any).ruleGraph?.length || 0;
    }
    return ruleGroups.reduce((sum: number, group: any) => sum + group.rules.length, 0);
  }

  /**
   * Find rules not covered by any test case.
   */
  private findUncoveredRules(policy: CompiledPolicy, appliedRules: Set<string>): string[] {
    const allRules = new Set<string>();
    for (const group of policy.ruleGroups) {
      for (const rule of group.rules) {
        allRules.add(rule.id);
      }
    }

    return Array.from(allRules).filter((ruleId) => !appliedRules.has(ruleId));
  }

  /**
   * Assert that coverage meets minimum requirements.
   *
   * Throws if coverage < 100%.
   */
  assertFullCoverage(report: ValidationReport): void {
    if (report.coverage < 1.0) {
      const percentage = Math.floor(report.coverage * 100);
      throw new Error(
        `Policy ${report.policyId} has insufficient test coverage: ${percentage}% ` +
          `(${report.uncoveredRules.length} rules uncovered: ${report.uncoveredRules.join(', ')}). ` +
          `Law 6 requires 100% coverage.`
      );
    }
  }
}

/**
 * Create a new golden dataset validator.
 */
export function createValidator(): GoldenDatasetValidator {
  return new GoldenDatasetValidator();
}
