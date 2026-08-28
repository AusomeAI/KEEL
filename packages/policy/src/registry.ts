/**
 * Policy Registry: Central registry for all policies and golden datasets.
 *
 * Manages:
 * 1. Policy versioning and lookup by ID + version
 * 2. Golden dataset association with policies
 * 3. Validation gate: policies only deployable if golden datasets have 100% coverage
 *
 * This enforces Law 6: "No policy without a golden dataset at 100% rule coverage"
 */

import { CompiledPolicy, GoldenDataset } from './schemas/index.js';
import { ValidationReport } from './golden/harness.js';

/**
 * Registered policy entry with its golden dataset and validation results.
 */
export interface PolicyEntry {
  policy: CompiledPolicy;
  goldenDataset: GoldenDataset;
  validationReport: ValidationReport;
  deployable: boolean; // true if coverage == 100% and all tests pass
  registeredAt: Date;
}

/**
 * Policy Registry: central lookup and validation.
 *
 * In Wave 1, this is in-memory. In Wave 2, it will be backed by a database.
 */
export class PolicyRegistry {
  /**
   * Registered policies, keyed by (policyId, version).
   */
  private policies = new Map<string, PolicyEntry>();

  /**
   * Register a policy with its golden dataset and validation results.
   *
   * Stores the policy, golden dataset, and validation report.
   * Policy becomes deployable only if validation passes (coverage == 100%).
   */
  registerPolicy(
    policy: CompiledPolicy,
    goldenDataset: GoldenDataset,
    validationReport: ValidationReport
  ): void {
    const key = `${policy.metadata.id}@${policy.metadata.version}`;

    // Verify IDs and versions match
    if (policy.metadata.id !== goldenDataset.policyId) {
      throw new Error(
        `Policy ID mismatch: ${policy.metadata.id} !== ${goldenDataset.policyId}`
      );
    }

    if (policy.metadata.version !== goldenDataset.policyVersion) {
      throw new Error(
        `Version mismatch: ${policy.metadata.version} !== ${goldenDataset.policyVersion}`
      );
    }

    const deployable = validationReport.coverage === 1.0 && validationReport.failedTests === 0;

    this.policies.set(key, {
      policy,
      goldenDataset,
      validationReport,
      deployable,
      registeredAt: new Date(),
    });
  }

  /**
   * Retrieve a policy by ID and version.
   *
   * Returns null if not found.
   */
  getPolicy(policyId: string, version: string): PolicyEntry | null {
    const key = `${policyId}@${version}`;
    return this.policies.get(key) || null;
  }

  /**
   * Retrieve the latest version of a policy.
   *
   * Comparison is lexicographic (e.g., 2026-Q4 > 2026-Q1).
   * Returns null if no policy with this ID is registered.
   */
  getLatestPolicy(policyId: string): PolicyEntry | null {
    let latestEntry: PolicyEntry | null = null;
    let latestVersion = '';

    for (const [key, entry] of this.policies) {
      if (entry.policy.metadata.id === policyId) {
        if (entry.policy.metadata.version > latestVersion) {
          latestVersion = entry.policy.metadata.version;
          latestEntry = entry;
        }
      }
    }

    return latestEntry;
  }

  /**
   * Get all registered policy IDs.
   */
  getAllPolicyIds(): string[] {
    const ids = new Set<string>();
    for (const entry of this.policies.values()) {
      ids.add(entry.policy.metadata.id);
    }
    return Array.from(ids).sort();
  }

  /**
   * Get all versions of a policy.
   */
  getVersions(policyId: string): string[] {
    const versions: string[] = [];
    for (const entry of this.policies.values()) {
      if (entry.policy.metadata.id === policyId) {
        versions.push(entry.policy.metadata.version);
      }
    }
    return versions.sort();
  }

  /**
   * Check if a policy is deployable.
   *
   * A policy is deployable if:
   * 1. It has a golden dataset
   * 2. Coverage == 100%
   * 3. All tests pass
   */
  isDeployable(policyId: string, version: string): boolean {
    const entry = this.getPolicy(policyId, version);
    return entry?.deployable ?? false;
  }

  /**
   * Get deployment status for a policy.
   *
   * Returns human-readable status including coverage and test results.
   */
  getDeploymentStatus(policyId: string, version: string): string {
    const entry = this.getPolicy(policyId, version);

    if (!entry) {
      return `Policy ${policyId}@${version} not found`;
    }

    const coverage = Math.floor(entry.validationReport.coverage * 100);
    const passed = entry.validationReport.passedTests;
    const failed = entry.validationReport.failedTests;

    if (entry.deployable) {
      return `✓ Deployable: ${coverage}% coverage, ${passed} tests passed`;
    }

    if (entry.validationReport.coverage < 1.0) {
      const uncovered = entry.validationReport.uncoveredRules.length;
      return `✗ Insufficient coverage: ${coverage}% (${uncovered} rules uncovered)`;
    }

    if (failed > 0) {
      return `✗ Test failures: ${passed} passed, ${failed} failed`;
    }

    return 'Policy registration incomplete';
  }

  /**
   * Throw if a policy is not deployable.
   *
   * Useful for deployment gates.
   */
  assertDeployable(policyId: string, version: string): void {
    if (!this.isDeployable(policyId, version)) {
      const status = this.getDeploymentStatus(policyId, version);
      throw new Error(`Cannot deploy policy: ${status}`);
    }
  }

  /**
   * Clear all registered policies (for testing).
   */
  clear(): void {
    this.policies.clear();
  }

  /**
   * Get number of registered policies (for testing/diagnostics).
   */
  size(): number {
    return this.policies.size;
  }
}

/**
 * Global registry instance.
 */
let globalRegistry: PolicyRegistry | null = null;

/**
 * Get the global policy registry.
 */
export function getGlobalRegistry(): PolicyRegistry {
  if (!globalRegistry) {
    globalRegistry = new PolicyRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing).
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
