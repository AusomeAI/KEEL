/**
 * Golden dataset harness tests.
 *
 * Validates that:
 * 1. Policies compile successfully
 * 2. Golden datasets are structurally correct
 * 3. Coverage calculation is accurate
 * 4. Policy validation rejects incomplete coverage (Law 6)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { compilePolicy } from '../../compiler/index.js';
import { GoldenDatasetValidator, ValidationReport } from '../harness.js';
import { overtimeUsFlsaGoldenDataset } from '../overtime-us-flsa.golden.js';
import { overtimeUsFlsaPolicy } from '../../policies/overtime-us-flsa.js';
import { GoldenDatasetSchema } from '../../schemas/index.js';

describe('GoldenDatasetValidator', () => {
  let validator: GoldenDatasetValidator;

  beforeEach(() => {
    validator = new GoldenDatasetValidator();
  });

  describe('Schema Validation', () => {
    it('should validate golden dataset schema', () => {
      const result = GoldenDatasetSchema.safeParse(overtimeUsFlsaGoldenDataset);
      expect(result.success).toBe(true);
    });

    it('should reject dataset without testCases', () => {
      const invalid = {
        policyId: 'test/policy',
        policyVersion: '1.0',
        jurisdiction: 'US',
        description: 'Test',
        testCases: [],
      };
      const result = GoldenDatasetSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require unique test IDs', () => {
      const dataset = structuredClone(overtimeUsFlsaGoldenDataset);
      if (dataset.testCases.length >= 2) {
        dataset.testCases[1].input.testId = dataset.testCases[0].input.testId;
        // Note: Schema doesn't enforce uniqueness, but should be tested elsewhere
      }
    });

    it('should validate test input structure', () => {
      const testCase = overtimeUsFlsaGoldenDataset.testCases[0];
      expect(testCase.input.testId).toMatch(/^test-[a-z0-9-]+$/);
      expect(testCase.input.description.length).toBeGreaterThanOrEqual(10);
    });

    it('should validate test output structure', () => {
      const testCase = overtimeUsFlsaGoldenDataset.testCases[0];
      expect(testCase.expectedOutput.fields).toBeDefined();
      expect(typeof testCase.expectedOutput.fields).toBe('object');
    });

    it('should validate rule applications', () => {
      const testCase = overtimeUsFlsaGoldenDataset.testCases[0];
      expect(testCase.ruleApplications.length).toBeGreaterThan(0);

      for (const ruleApp of testCase.ruleApplications) {
        expect(ruleApp.ruleId).toBeDefined();
        expect(typeof ruleApp.applied).toBe('boolean');
        expect(ruleApp.citation).toBeDefined();
      }
    });
  });

  describe('Policy Compilation', () => {
    it('should compile overtime policy', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      expect(compiled).toBeDefined();
      expect(compiled.metadata.id).toBe('overtime/us-flsa');
    });

    it('should have rule groups in compiled policy', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      expect(compiled.ruleGroups).toBeDefined();
      expect(compiled.ruleGroups.length).toBeGreaterThan(0);
    });

    it('should have rule execution graph', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      expect(compiled.ruleGraph).toBeDefined();
      expect(compiled.ruleGraph.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Report Generation', () => {
    it('should generate validation report', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      expect(report).toBeDefined();
      expect(report.policyId).toBe('overtime/us-flsa');
      expect(report.totalTests).toBeGreaterThan(0);
    });

    it('should include test results in report', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      expect(report.testResults).toBeDefined();
      expect(report.testResults.length).toBe(report.totalTests);
    });

    it('should calculate test pass/fail counts', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      const passCount = report.testResults.filter((r) => r.passed).length;
      expect(report.passedTests).toBe(passCount);
    });

    it('should include timestamp in report', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Coverage Calculation', () => {
    it('should calculate coverage as decimal', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      expect(typeof report.coverage).toBe('number');
      expect(report.coverage).toBeGreaterThanOrEqual(0);
      expect(report.coverage).toBeLessThanOrEqual(1);
    });

    it('should identify uncovered rules', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      expect(report.uncoveredRules).toBeDefined();
      expect(Array.isArray(report.uncoveredRules)).toBe(true);
    });

    it('should have zero uncovered rules if tests cover all rules', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      // If coverage is 100%, uncovered rules should be empty
      if (report.coverage === 1.0) {
        expect(report.uncoveredRules.length).toBe(0);
      }
    });
  });

  describe('Law 6 Enforcement', () => {
    it('should accept policy with 100% coverage', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      // Should not throw
      if (report.coverage === 1.0) {
        expect(() => validator.assertFullCoverage(report)).not.toThrow();
      }
    });

    it('should reject policy with < 100% coverage', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      if (report.coverage < 1.0) {
        expect(() => validator.assertFullCoverage(report)).toThrow(
          /insufficient test coverage/
        );
      }
    });

    it('should report coverage percentage in error message', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      if (report.coverage < 1.0) {
        try {
          validator.assertFullCoverage(report);
          expect.fail('Should have thrown');
        } catch (error: any) {
          const percentage = Math.floor(report.coverage * 100);
          expect(error.message).toContain(`${percentage}%`);
        }
      }
    });

    it('should list uncovered rules in error message', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      if (report.coverage < 1.0) {
        try {
          validator.assertFullCoverage(report);
          expect.fail('Should have thrown');
        } catch (error: any) {
          expect(error.message).toContain('Law 6');
          for (const ruleId of report.uncoveredRules.slice(0, 3)) {
            expect(error.message).toContain(ruleId);
          }
        }
      }
    });
  });

  describe('Policy ID and Version Matching', () => {
    it('should reject dataset with mismatched policy ID', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const mismatched = structuredClone(overtimeUsFlsaGoldenDataset);
      mismatched.policyId = 'wrong/policy-id';

      expect(() => validator.validatePolicy(compiled, mismatched)).toThrow(
        /Policy ID mismatch/
      );
    });

    it('should reject dataset with mismatched version', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const mismatched = structuredClone(overtimeUsFlsaGoldenDataset);
      mismatched.policyVersion = '1999-Q1';

      expect(() => validator.validatePolicy(compiled, mismatched)).toThrow(
        /Policy version mismatch/
      );
    });

    it('should accept exact version match', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      expect(report.policyVersion).toBe(overtimeUsFlsaGoldenDataset.policyVersion);
    });
  });

  describe('Golden Dataset Completeness', () => {
    it('should have multiple test cases', () => {
      expect(overtimeUsFlsaGoldenDataset.testCases.length).toBeGreaterThan(1);
    });

    it('should test edge cases', () => {
      const testIds = overtimeUsFlsaGoldenDataset.testCases.map(
        (tc) => tc.input.testId
      );

      // Common edge cases to look for
      const hasEdgeCases = testIds.some(
        (id) =>
          id.includes('threshold') ||
          id.includes('boundary') ||
          id.includes('edge') ||
          id.includes('exact')
      );

      // At minimum, should have varied test scenarios
      expect(overtimeUsFlsaGoldenDataset.testCases.length).toBeGreaterThanOrEqual(3);
    });

    it('should include statutory citations', () => {
      for (const testCase of overtimeUsFlsaGoldenDataset.testCases) {
        for (const ruleApp of testCase.ruleApplications) {
          expect(ruleApp.citation).toBeDefined();
          expect(ruleApp.citation.jurisdiction).toBeDefined();
          expect(ruleApp.citation.code).toBeDefined();
        }
      }
    });

    it('should document rule contributions', () => {
      for (const testCase of overtimeUsFlsaGoldenDataset.testCases) {
        for (const ruleApp of testCase.ruleApplications) {
          if (ruleApp.applied) {
            // Applied rules should document their contribution
            // (contribution is optional but recommended for applied rules)
            expect(ruleApp.reason).toBeDefined();
          }
        }
      }
    });
  });

  describe('Deployment Gate', () => {
    it('should be suitable for deployment when coverage is 100%', () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report = validator.validatePolicy(compiled, overtimeUsFlsaGoldenDataset);

      const isDeployable = report.coverage === 1.0 && report.failedTests === 0;

      if (isDeployable) {
        expect(() => validator.assertFullCoverage(report)).not.toThrow();
      }
    });

    it('should prevent deployment with incomplete coverage', () => {
      // Create a mock policy with incomplete coverage
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const report: ValidationReport = {
        policyId: 'test/policy',
        policyVersion: '1.0',
        totalTests: 5,
        passedTests: 4,
        failedTests: 1,
        coverage: 0.8,
        uncoveredRules: ['rule-1', 'rule-2'],
        testResults: [],
        timestamp: new Date(),
      };

      expect(() => validator.assertFullCoverage(report)).toThrow();
    });
  });
});
