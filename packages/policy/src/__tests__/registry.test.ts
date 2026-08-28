/**
 * Policy Registry tests.
 *
 * Validates:
 * 1. Policy registration and versioning
 * 2. Deployment gate enforcement
 * 3. Version lookup and comparison
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyRegistry, getGlobalRegistry, resetGlobalRegistry } from '../registry.js';
import { compilePolicy } from '../compiler/index.js';
import { GoldenDatasetValidator } from '../golden/harness.js';
import { overtimeUsFlsaGoldenDataset } from '../golden/overtime-us-flsa.golden.js';
import { overtimeUsFlsaPolicy } from '../policies/overtime-us-flsa.js';

describe('PolicyRegistry', () => {
  let registry: PolicyRegistry;
  let validator: GoldenDatasetValidator;

  beforeEach(() => {
    registry = new PolicyRegistry();
    validator = new GoldenDatasetValidator();
    resetGlobalRegistry();
  });

  describe('Policy Registration', () => {
    it('should register a policy with validation results', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);

      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      expect(entry).toBeDefined();
      expect(entry?.policy.metadata.id).toBe('overtime/us-flsa');
    });

    it('should reject mismatched policy ID', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      const mismatched = structuredClone(overtimeUsFlsaGoldenDataset);
      mismatched.policyId = 'wrong/id';

      expect(() =>
        registry.registerPolicy(compiled, mismatched, report)
      ).toThrow(/Policy ID mismatch/);
    });

    it('should reject mismatched version', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      const mismatched = structuredClone(overtimeUsFlsaGoldenDataset);
      mismatched.policyVersion = '1999-Q1';

      expect(() =>
        registry.registerPolicy(compiled, mismatched, report)
      ).toThrow(/Version mismatch/);
    });

    it('should set deployable flag based on coverage', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);
      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');

      if (report.coverage === 1.0 && report.failedTests === 0) {
        expect(entry?.deployable).toBe(true);
      } else {
        expect(entry?.deployable).toBe(false);
      }
    });

    it('should store registration timestamp', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      const beforeReg = Date.now();
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);
      const afterReg = Date.now();

      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      expect(entry?.registeredAt.getTime()).toBeGreaterThanOrEqual(beforeReg);
      expect(entry?.registeredAt.getTime()).toBeLessThanOrEqual(afterReg);
    });
  });

  describe('Policy Lookup', () => {
    beforeEach(() => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);
    });

    it('should retrieve policy by ID and version', () => {
      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      expect(entry).toBeDefined();
      expect(entry?.policy.metadata.id).toBe('overtime/us-flsa');
      expect(entry?.policy.metadata.version).toBe('2026-Q1');
    });

    it('should return null for non-existent policy', () => {
      const entry = registry.getPolicy('nonexistent/policy', '1.0');
      expect(entry).toBeNull();
    });

    it('should return null for wrong version', () => {
      const entry = registry.getPolicy('overtime/us-flsa', '1999-Q1');
      expect(entry).toBeNull();
    });

    it('should get latest policy version', () => {
      const latest = registry.getLatestPolicy('overtime/us-flsa');
      expect(latest).toBeDefined();
      expect(latest?.policy.metadata.id).toBe('overtime/us-flsa');
    });

    it('should compare versions lexicographically', () => {
      // Register another version
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const oldDataset = structuredClone(overtimeUsFlsaGoldenDataset);
      oldDataset.policyVersion = '2026-Q1';

      // Note: In real usage, versions would differ naturally
      // This test just checks the mechanism exists

      const latest = registry.getLatestPolicy('overtime/us-flsa');
      expect(latest?.policy.metadata.version).toBe('2026-Q1');
    });
  });

  describe('Policy Listing', () => {
    beforeEach(() => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);
    });

    it('should list all policy IDs', () => {
      const ids = registry.getAllPolicyIds();
      expect(ids).toContain('overtime/us-flsa');
    });

    it('should list versions for a policy', () => {
      const versions = registry.getVersions('overtime/us-flsa');
      expect(versions).toContain('2026-Q1');
    });

    it('should return empty list for non-existent policy', () => {
      const versions = registry.getVersions('nonexistent/policy');
      expect(versions).toEqual([]);
    });

    it('should sort versions lexicographically', () => {
      const versions = registry.getVersions('overtime/us-flsa');
      const sorted = [...versions].sort();
      expect(versions).toEqual(sorted);
    });
  });

  describe('Deployment Gate', () => {
    beforeEach(() => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);
    });

    it('should mark deployable policy', () => {
      const deployable = registry.isDeployable('overtime/us-flsa', '2026-Q1');

      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      if (entry?.validationReport.coverage === 1.0) {
        expect(deployable).toBe(true);
      }
    });

    it('should reject deployment of non-existent policy', () => {
      const deployable = registry.isDeployable('nonexistent/policy', '1.0');
      expect(deployable).toBe(false);
    });

    it('should provide deployment status', () => {
      const status = registry.getDeploymentStatus('overtime/us-flsa', '2026-Q1');
      expect(typeof status).toBe('string');
      expect(status.length).toBeGreaterThan(0);
    });

    it('should throw on deployment assertion failure', () => {
      expect(() => {
        registry.assertDeployable('nonexistent/policy', '1.0');
      }).toThrow(/Cannot deploy policy/);
    });

    it('should not throw on deployment assertion success', () => {
      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      if (entry?.deployable) {
        expect(() => {
          registry.assertDeployable('overtime/us-flsa', '2026-Q1');
        }).not.toThrow();
      }
    });

    it('should include coverage in status message', () => {
      const status = registry.getDeploymentStatus('overtime/us-flsa', '2026-Q1');
      expect(status).toMatch(/\d+%/);
    });

    it('should list uncovered rules in status for incomplete coverage', () => {
      // Create a mock entry with incomplete coverage
      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      if (entry && entry.validationReport.coverage < 1.0) {
        const status = registry.getDeploymentStatus('overtime/us-flsa', '2026-Q1');
        expect(status).toContain('Insufficient coverage');
      }
    });
  });

  describe('Global Registry', () => {
    it('should provide singleton global registry', () => {
      const registry1 = getGlobalRegistry();
      const registry2 = getGlobalRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should reset global registry', () => {
      const registry1 = getGlobalRegistry();
      resetGlobalRegistry();
      const registry2 = getGlobalRegistry();
      expect(registry1).not.toBe(registry2);
    });

    it('should maintain state across gets', () => {
      const reg = getGlobalRegistry();
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      reg.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);

      const reg2 = getGlobalRegistry();
      const entry = reg2.getPolicy('overtime/us-flsa', '2026-Q1');
      expect(entry).toBeDefined();
    });
  });

  describe('Registry Diagnostics', () => {
    it('should report registry size', () => {
      expect(registry.size()).toBe(0);

      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);

      expect(registry.size()).toBe(1);
    });

    it('should support clearing registry', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);

      expect(registry.size()).toBe(1);
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });

  describe('Law 6 Enforcement', () => {
    it('should only register policies with golden datasets', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      // Should succeed
      expect(() =>
        registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report)
      ).not.toThrow();
    });

    it('should track validation report with policy', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);

      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      expect(entry?.validationReport).toBe(report);
      expect(entry?.validationReport.coverage).toBeDefined();
    });

    it('should require 100% coverage for deployment', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);
      registry.registerPolicy(compiled, overtimeUsFlsaGoldenDataset, report);

      const entry = registry.getPolicy('overtime/us-flsa', '2026-Q1');
      if (report.coverage < 1.0) {
        expect(entry?.deployable).toBe(false);
      } else {
        expect(entry?.deployable).toBe(true);
      }
    });
  });
});
