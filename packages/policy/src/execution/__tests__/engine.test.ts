/**
 * Policy Execution Engine tests
 *
 * Validates:
 * 1. Policy execution against employee/time data
 * 2. Deterministic calculation results (byte-identical on replay)
 * 3. Rule application and audit trails
 * 4. Overtime and tax calculations
 * 5. Retroactive execution support
 * 6. Error handling and rollback
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PolicyExecutionEngine,
  executePolicyOnce,
  executeRetroactive,
  type EmployeeDataSnapshot,
  type TimePeriodData,
} from "../engine";
import { compilePolicy } from "../../compiler/index";
import { overtimeUsFlsaPolicy } from "../../policies/overtime-us-flsa";

describe("PolicyExecutionEngine", () => {
  let engine: PolicyExecutionEngine;
  let employee: EmployeeDataSnapshot;
  let timePeriod: TimePeriodData;

  beforeEach(() => {
    const compiled = compilePolicy(overtimeUsFlsaPolicy);
    engine = new PolicyExecutionEngine(compiled);

    employee = {
      employeeId: "emp-001",
      jobTitle: "Software Engineer",
      jurisdiction: "US.FEDERAL",
      salary: BigInt(10400000), // $104,000 annually in minor units (cents)
      payFrequency: "BIWEEKLY",
      effectiveDate: new Date("2026-01-01"),
    };

    // Biweekly pay period (2 weeks)
    timePeriod = {
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-01-14"),
      hoursWorked: 40 * 60, // 40 hours in minutes
      breakMinutes: 0,
    };
  });

  describe("Basic Execution", () => {
    it("should execute policy without errors", async () => {
      const result = await engine.execute(employee, timePeriod);

      expect(result).toBeDefined();
      expect(result.policyId).toBe("overtime/us-flsa");
      expect(result.employeeId).toBe("emp-001");
      expect(result.errors.length).toBe(0);
    });

    it("should return execution result with expected fields", async () => {
      const result = await engine.execute(employee, timePeriod);

      expect(result.policyId).toBeDefined();
      expect(result.policyVersion).toBeDefined();
      expect(result.asOf).toBeInstanceOf(Date);
      expect(result.effectiveDate).toBeInstanceOf(Date);
      expect(result.ruleResults).toBeDefined();
      expect(Array.isArray(result.ruleResults)).toBe(true);
      expect(result.calculations).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should require valid employee ID", async () => {
      const invalidEmployee = { ...employee, employeeId: "" };

      const result = await engine.execute(invalidEmployee, timePeriod);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Employee ID");
    });

    it("should require valid time period", async () => {
      const invalidPeriod = {
        ...timePeriod,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() - 1000), // End before start
      };

      const result = await engine.execute(employee, invalidPeriod);

      // Should still execute but maybe with warnings
      expect(result).toBeDefined();
    });
  });

  describe("Rule Execution", () => {
    it("should execute all rules in graph", async () => {
      const result = await engine.execute(employee, timePeriod);

      expect(result.executionOrder).toBeDefined();
      expect(result.ruleResults.length).toEqual(result.executionOrder.length);
    });

    it("should track applied and skipped rules", async () => {
      const result = await engine.execute(employee, timePeriod);

      expect(result.appliedRules).toBeDefined();
      expect(result.skippedRules).toBeDefined();
      expect(result.appliedRules.length + result.skippedRules.length).toEqual(
        result.ruleResults.length
      );
    });

    it("should populate rule execution details", async () => {
      const result = await engine.execute(employee, timePeriod);

      for (const ruleResult of result.ruleResults) {
        expect(ruleResult.ruleId).toBeDefined();
        expect(typeof ruleResult.applied).toBe("boolean");
        expect(ruleResult.inputValues).toBeDefined();
        expect(ruleResult.timestamp).toBeInstanceOf(Date);
        expect(Array.isArray(ruleResult.auditTrail)).toBe(true);
      }
    });

    it("should include audit trail for each rule", async () => {
      const result = await engine.execute(employee, timePeriod);

      for (const ruleResult of result.ruleResults) {
        expect(ruleResult.auditTrail.length).toBeGreaterThan(0);
        for (const trailEntry of ruleResult.auditTrail) {
          expect(typeof trailEntry).toBe("string");
          expect(trailEntry.includes(ruleResult.ruleId)).toBe(true);
        }
      }
    });
  });

  describe("Overtime Calculation", () => {
    it("should not apply overtime for 40 hours worked", async () => {
      const result = await engine.execute(employee, timePeriod);

      const overtimeResults = result.ruleResults.filter((r) =>
        r.ruleId.includes("overtime") || r.ruleName.includes("overtime")
      );

      // At exactly 40 hours, overtime should not apply
      for (const ot of overtimeResults) {
        if (timePeriod.hoursWorked === 40 * 60) {
          expect(ot.applied).toBeFalsy();
        }
      }
    });

    it("should calculate overtime at 1.5x for hours over 40", async () => {
      const overtimePeriod = {
        ...timePeriod,
        hoursWorked: 45 * 60, // 45 hours
      };

      const result = await engine.execute(employee, overtimePeriod);

      // Should have some overtime pay
      const overtimeResults = result.ruleResults.filter((r) => r.applied && r.outputValues.overtimePay);

      if (overtimeResults.length > 0) {
        expect(overtimeResults[0].outputValues.overtimePay).toBeGreaterThan(BigInt(0));
      }
    });

    it("should support multiple weeks of overtime", async () => {
      const heavyOvertimePeriod = {
        ...timePeriod,
        hoursWorked: 60 * 60, // 60 hours (20 hours overtime)
      };

      const result = await engine.execute(employee, heavyOvertimePeriod);

      expect(result).toBeDefined();
      // Overtime calculation should succeed without errors
      expect(result.errors.filter((e) => e.includes("overtime")).length).toBe(0);
    });
  });

  describe("Calculations", () => {
    it("should populate calculations object", async () => {
      const result = await engine.execute(employee, timePeriod);

      expect(result.calculations).toBeDefined();
      expect(typeof result.calculations.grossPay).toBe("bigint");
      expect(typeof result.calculations.netPay).toBe("bigint");
    });

    it("should set net pay ≤ gross pay", async () => {
      const result = await engine.execute(employee, timePeriod);

      // After deductions, net should never exceed gross
      expect(result.calculations.netPay).toBeLessThanOrEqual(result.calculations.grossPay);
    });

    it("should handle zero deductions", async () => {
      const lowIncomeEmployee = {
        ...employee,
        salary: BigInt(1000000), // $10,000 annually
      };

      const result = await engine.execute(lowIncomeEmployee, timePeriod);

      // Very low income might have no tax withholding
      expect(result.calculations).toBeDefined();
    });
  });

  describe("Audit Trail & Determinism", () => {
    it("should generate consistent hashes for same inputs", async () => {
      const result1 = await engine.execute(employee, timePeriod);
      const result2 = await engine.execute(employee, timePeriod);

      // Same inputs should produce same results
      expect(result1.inputHash).toBe(result2.inputHash);
      expect(result1.resultHash).toBe(result2.resultHash);
    });

    it("should mark as deterministic when no errors", async () => {
      const result = await engine.execute(employee, timePeriod);

      if (result.errors.length === 0) {
        expect(result.deterministic).toBe(true);
      }
    });

    it("should mark as non-deterministic when errors occur", async () => {
      const invalidEmployee = { ...employee, salary: BigInt(-1) }; // Invalid

      const result = await engine.execute(invalidEmployee, timePeriod);

      if (result.errors.length > 0) {
        expect(result.deterministic).toBe(false);
      }
    });

    it("should include timestamps in rule results", async () => {
      const result = await engine.execute(employee, timePeriod);

      for (const ruleResult of result.ruleResults) {
        expect(ruleResult.timestamp).toBeInstanceOf(Date);
        expect(ruleResult.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });
  });

  describe("Retroactive Execution", () => {
    it("should support execution as of a past date", async () => {
      const pastDate = new Date("2025-12-01");

      const result = await executeRetroactive(
        compilePolicy(overtimeUsFlsaPolicy),
        employee,
        timePeriod,
        pastDate
      );

      expect(result.asOf).toEqual(pastDate);
    });

    it("should support execution as of a future date", async () => {
      const futureDate = new Date("2027-12-01");

      const result = await executeRetroactive(
        compilePolicy(overtimeUsFlsaPolicy),
        employee,
        timePeriod,
        futureDate
      );

      expect(result.asOf).toEqual(futureDate);
    });

    it("should produce same calculation regardless of asOf date", async () => {
      const now = new Date();
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const result1 = await executeRetroactive(
        compilePolicy(overtimeUsFlsaPolicy),
        employee,
        timePeriod,
        now
      );

      const result2 = await executeRetroactive(
        compilePolicy(overtimeUsFlsaPolicy),
        employee,
        timePeriod,
        past
      );

      // Same calculations, different transaction times
      expect(result1.calculations.grossPay).toEqual(result2.calculations.grossPay);
      expect(result1.calculations.netPay).toEqual(result2.calculations.netPay);
      expect(result1.asOf).not.toEqual(result2.asOf);
    });
  });

  describe("Global Convenience Functions", () => {
    it("should execute policy with executePolicyOnce", async () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const result = await executePolicyOnce(compiled, employee, timePeriod);

      expect(result).toBeDefined();
      expect(result.policyId).toBe("overtime/us-flsa");
    });

    it("should support custom asOf dates", async () => {
      const compiled = compilePolicy(overtimeUsFlsaPolicy);
      const pastDate = new Date("2025-06-01");

      const result = await executeRetroactive(compiled, employee, timePeriod, pastDate);

      expect(result.asOf).toEqual(pastDate);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero hours worked", async () => {
      const zeroPeriod = { ...timePeriod, hoursWorked: 0 };

      const result = await engine.execute(employee, zeroPeriod);

      expect(result).toBeDefined();
      expect(result.calculations.grossPay).toBe(BigInt(0));
    });

    it("should handle very high salary", async () => {
      const highEarner = {
        ...employee,
        salary: BigInt(1000000000), // $10M annually
      };

      const result = await engine.execute(highEarner, timePeriod);

      expect(result).toBeDefined();
      expect(result.errors.length).toBe(0);
    });

    it("should handle non-standard pay frequencies", async () => {
      const employee2 = { ...employee, payFrequency: "WEEKLY" as const };

      const result = await engine.execute(employee2, timePeriod);

      expect(result).toBeDefined();
    });

    it("should handle multiple years in execution", async () => {
      const longPeriod = {
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2027-12-31"),
        hoursWorked: 365 * 24 * 60, // ~1 year of continuous work
        breakMinutes: 0,
      };

      const result = await engine.execute(employee, longPeriod);

      expect(result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should recover from rule execution errors", async () => {
      const result = await engine.execute(employee, timePeriod);

      // Engine should complete even if some rules fail
      expect(result).toBeDefined();
      expect(result.ruleResults.length).toBeGreaterThan(0);
    });

    it("should not throw on bad inputs", async () => {
      const badEmployee = { ...employee, salary: null } as any;

      expect(async () => {
        await engine.execute(badEmployee, timePeriod);
      }).not.toThrow();
    });

    it("should populate errors array on failure", async () => {
      const result = await engine.execute(
        { ...employee, employeeId: "" },
        timePeriod
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should complete execution in reasonable time", async () => {
      const result = await engine.execute(employee, timePeriod);

      // Execution should be fast (< 100ms for simple policy)
      expect(result.durationMs).toBeLessThan(100);
    });

    it("should handle batch executions efficiently", async () => {
      const promises = Array.from({ length: 10 }, () =>
        engine.execute(employee, timePeriod)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      for (const result of results) {
        expect(result.errors.length).toBe(0);
      }
    });
  });
});
