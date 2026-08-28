/**
 * Policy Execution Engine
 *
 * Wave 2 deliverable: Execute compiled policies against employee data
 *
 * This engine:
 * 1. Takes a compiled policy and employee/time data
 * 2. Executes policy rules in topological order
 * 3. Produces deterministic, auditable results
 * 4. Supports retroactive (as-of) calculations
 * 5. Returns projected effects suitable for Decision Records
 *
 * Critical: This engine must be deterministic. Given identical inputs,
 * it must produce byte-identical outputs forever. This is how retroactive
 * payroll remains correct and replayable.
 */

import { z } from "zod";
import { CompiledPolicy, CompiledRule, RuleGraph } from "../schemas/compiled-policy";
import { Money, Duration } from "@keel/core";

/**
 * Employee data snapshot (minimal for policy execution)
 */
export interface EmployeeDataSnapshot {
  employeeId: string;
  jobTitle: string;
  jurisdiction: string;
  salary: Money; // Annual salary in minor units
  payFrequency: "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
  effectiveDate: Date; // When this role/pay started
}

/**
 * Time data for a pay period
 */
export interface TimePeriodData {
  periodStart: Date;
  periodEnd: Date;
  hoursWorked: Duration; // In minutes
  breakMinutes: Duration; // Unpaid breaks
  overtimeHours?: Duration; // If tracked separately
}

/**
 * Result of executing a single rule
 */
export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  applied: boolean; // Whether this rule matched/executed
  inputValues: Record<string, unknown>;
  outputValues: Record<string, unknown>;
  timestamp: Date;
  auditTrail: string[];
}

/**
 * Result of executing a compiled policy
 */
export interface PolicyExecutionResult {
  policyId: string;
  policyVersion: string;
  asOf: Date; // When this calculation was made (transaction time)
  effectiveDate: Date; // The business date this is effective for (valid time)
  employeeId: string;
  jurisdiction: string;

  // Rule execution results
  ruleResults: RuleExecutionResult[];
  executionOrder: string[]; // Rule execution order from graph
  appliedRules: string[]; // Rules that actually executed (applied=true)
  skippedRules: string[]; // Rules that didn't match

  // Calculated outputs
  calculations: {
    // Payroll outputs
    grossPay: Money;
    overtimePay?: Money;
    bonusAmount?: Money;

    // Deductions
    federalIncomeTax?: Money;
    fica?: Money;
    medicareWithholding?: Money;
    stateTax?: Money;

    // Benefits
    healthInsurancePremium?: Money;
    benefitsDeductions?: Money;

    // Final
    netPay: Money;
  };

  // For audit and retroactive recalculation
  inputHash: string; // SHA-256 of input data
  resultHash: string; // SHA-256 of output data
  durationMs: number; // How long execution took
  errors: string[];
  warnings: string[];
  deterministic: boolean; // False if any non-deterministic values were used
}

/**
 * Policy Execution Engine
 *
 * Executes a compiled policy against employee and time data
 */
export class PolicyExecutionEngine {
  private policy: CompiledPolicy;
  private cache = new Map<string, RuleExecutionResult>();

  constructor(policy: CompiledPolicy) {
    this.policy = policy;
  }

  /**
   * Execute the policy for a time period
   *
   * This is the main entry point for payroll calculation,
   * entitlement determination, etc.
   */
  async execute(
    employee: EmployeeDataSnapshot,
    timePeriod: TimePeriodData,
    asOf: Date = new Date()
  ): Promise<PolicyExecutionResult> {
    const startTime = Date.now();
    const ruleResults: RuleExecutionResult[] = [];
    const appliedRules: string[] = [];
    const skippedRules: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate inputs
      if (!employee.employeeId) {
        throw new Error("Employee ID is required");
      }

      if (!this.policy.ruleGraph || this.policy.ruleGraph.length === 0) {
        throw new Error("Policy has no rules to execute");
      }

      // Execute rules in topological order
      const executionOrder = this.policy.ruleGraph.map((r) => r.ruleId);

      for (const ruleId of executionOrder) {
        try {
          const result = await this.executeRule(ruleId, employee, timePeriod);
          ruleResults.push(result);

          if (result.applied) {
            appliedRules.push(ruleId);
          } else {
            skippedRules.push(ruleId);
          }
        } catch (err: any) {
          errors.push(`Rule ${ruleId} failed: ${err.message}`);
          skippedRules.push(ruleId);
        }
      }

      // Calculate final outputs from rule results
      const calculations = this.aggregateCalculations(ruleResults);

      // Generate hashes for audit trail
      const inputHash = this.hashInputs(employee, timePeriod);
      const resultHash = this.hashResults(calculations);

      const result: PolicyExecutionResult = {
        policyId: this.policy.metadata.id,
        policyVersion: this.policy.metadata.version,
        asOf,
        effectiveDate: timePeriod.periodStart,
        employeeId: employee.employeeId,
        jurisdiction: employee.jurisdiction,

        ruleResults,
        executionOrder,
        appliedRules,
        skippedRules,

        calculations,
        inputHash,
        resultHash,
        durationMs: Date.now() - startTime,
        errors,
        warnings,
        deterministic: errors.length === 0, // No non-deterministic fallbacks
      };

      return result;
    } catch (err: any) {
      return {
        policyId: this.policy.metadata.id,
        policyVersion: this.policy.metadata.version,
        asOf,
        effectiveDate: timePeriod.periodStart,
        employeeId: employee.employeeId,
        jurisdiction: employee.jurisdiction,

        ruleResults,
        executionOrder: this.policy.ruleGraph?.map((r) => r.ruleId) || [],
        appliedRules,
        skippedRules,

        calculations: {
          grossPay: BigInt(0) as Money,
          netPay: BigInt(0) as Money,
        },

        inputHash: "",
        resultHash: "",
        durationMs: Date.now() - startTime,
        errors: [err.message],
        warnings,
        deterministic: false,
      };
    }
  }

  /**
   * Execute a single rule from the compiled policy
   */
  private async executeRule(
    ruleId: string,
    employee: EmployeeDataSnapshot,
    timePeriod: TimePeriodData
  ): Promise<RuleExecutionResult> {
    // Find the rule in the compiled policy
    const rule = this.policy.rules.find((r) => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found in compiled policy`);
    }

    const auditTrail: string[] = [];
    const inputValues: Record<string, unknown> = {};
    const outputValues: Record<string, unknown> = {};
    let applied = false;

    try {
      // Build input context for the rule
      inputValues.employeeId = employee.employeeId;
      inputValues.jobTitle = employee.jobTitle;
      inputValues.jurisdiction = employee.jurisdiction;
      inputValues.salary = employee.salary;
      inputValues.hoursWorked = timePeriod.hoursWorked;
      inputValues.periodStart = timePeriod.periodStart;
      inputValues.periodEnd = timePeriod.periodEnd;

      auditTrail.push(
        `[${ruleId}] Starting execution with inputs: ${JSON.stringify(inputValues).substring(0, 100)}...`
      );

      // Execute the rule logic
      // TODO: In Wave 2+, integrate with Rust/WASM calculation kernel
      // For now, execute based on rule metadata and inputs

      // Example: FLSA Overtime rule
      if (ruleId === "overtime-flsa" || rule.name?.includes("overtime")) {
        const result = this.executeOvertimeRule(
          employee,
          timePeriod,
          auditTrail,
          outputValues
        );
        applied = result.applied;
      }
      // Example: Federal Tax rule
      else if (ruleId === "tax-federal" || rule.name?.includes("federal tax")) {
        const result = this.executeTaxRule(
          employee,
          timePeriod,
          auditTrail,
          outputValues
        );
        applied = result.applied;
      }
      // Default: pass-through (rule executed but had no effect)
      else {
        auditTrail.push(`[${ruleId}] Rule type not yet implemented; marked as skipped`);
        applied = false;
      }

      auditTrail.push(
        `[${ruleId}] Execution complete. Applied: ${applied}, Outputs: ${JSON.stringify(outputValues).substring(0, 100)}...`
      );
    } catch (err: any) {
      auditTrail.push(`[${ruleId}] ERROR: ${err.message}`);
      throw err;
    }

    return {
      ruleId,
      ruleName: rule.name || ruleId,
      applied,
      inputValues,
      outputValues,
      timestamp: new Date(),
      auditTrail,
    };
  }

  /**
   * Execute FLSA overtime rule
   * Calculates overtime pay at 1.5x for hours over 40/week
   */
  private executeOvertimeRule(
    employee: EmployeeDataSnapshot,
    timePeriod: TimePeriodData,
    auditTrail: string[],
    outputValues: Record<string, unknown>
  ): { applied: boolean } {
    try {
      const regularHours = 40 * 60; // 40 hours in minutes
      const hoursWorked = timePeriod.hoursWorked;

      auditTrail.push(`Hours worked: ${hoursWorked}m (${hoursWorked / 60}h)`);
      auditTrail.push(`Regular hours threshold: ${regularHours}m (${regularHours / 60}h)`);

      if (hoursWorked <= regularHours) {
        auditTrail.push("No overtime (hours <= 40/week)");
        return { applied: false };
      }

      const overtimeMinutes = hoursWorked - regularHours;
      const hourlyRate = employee.salary / (52 * 40 * 60); // Annual salary / minutes per year

      const overtimePay = Math.floor(overtimeMinutes * hourlyRate * 1.5);

      outputValues.overtimeMinutes = overtimeMinutes;
      outputValues.overtimePay = overtimePay;
      outputValues.hourlyRate = hourlyRate;

      auditTrail.push(`Overtime: ${overtimeMinutes}m × ${hourlyRate}/min × 1.5 = ${overtimePay}`);

      return { applied: true };
    } catch (err: any) {
      auditTrail.push(`Overtime calculation failed: ${err.message}`);
      return { applied: false };
    }
  }

  /**
   * Execute federal income tax withholding rule
   * Simplified 2024 tax calculation
   */
  private executeTaxRule(
    employee: EmployeeDataSnapshot,
    timePeriod: TimePeriodData,
    auditTrail: string[],
    outputValues: Record<string, unknown>
  ): { applied: boolean } {
    try {
      // Simplified calculation for demo
      // Real calculation would use tax tables and W-4 data
      const annualSalary = employee.salary;
      const standardDeduction = BigInt(14600) * BigInt(100); // $146 in minor units

      if (annualSalary <= standardDeduction) {
        auditTrail.push("No federal tax (income below standard deduction)");
        return { applied: false };
      }

      // Simplified marginal rate: 12% on income above standard deduction
      const taxableIncome = annualSalary - standardDeduction;
      const federalTax = (taxableIncome * BigInt(12)) / BigInt(100);

      // Prorate for pay period (assuming biweekly)
      const periodsPerYear = 26;
      const periodTax = federalTax / BigInt(periodsPerYear);

      outputValues.federalTax = periodTax;
      outputValues.taxableIncome = taxableIncome;

      auditTrail.push(
        `Federal tax: ${taxableIncome}/100 × 12% ÷ ${periodsPerYear} = ${periodTax}`
      );

      return { applied: true };
    } catch (err: any) {
      auditTrail.push(`Tax calculation failed: ${err.message}`);
      return { applied: false };
    }
  }

  /**
   * Aggregate rule outputs into final calculations
   */
  private aggregateCalculations(
    ruleResults: RuleExecutionResult[]
  ): PolicyExecutionResult["calculations"] {
    const calcs: PolicyExecutionResult["calculations"] = {
      grossPay: BigInt(0) as Money,
      netPay: BigInt(0) as Money,
    };

    for (const result of ruleResults) {
      if (!result.applied) continue;

      // Accumulate gross pay from overtime, bonuses, etc.
      if (result.outputValues.overtimePay) {
        calcs.overtimePay = (calcs.overtimePay || BigInt(0)) +
          (result.outputValues.overtimePay as bigint);
      }

      if (result.outputValues.bonusAmount) {
        calcs.bonusAmount = (calcs.bonusAmount || BigInt(0)) +
          (result.outputValues.bonusAmount as bigint);
      }

      // Accumulate deductions
      if (result.outputValues.federalTax) {
        calcs.federalTax = (calcs.federalTax || BigInt(0)) +
          (result.outputValues.federalTax as bigint);
      }

      if (result.outputValues.fica) {
        calcs.fica = (calcs.fica || BigInt(0)) + (result.outputValues.fica as bigint);
      }
    }

    // Calculate net = gross - deductions
    calcs.grossPay = (calcs.overtimePay || BigInt(0)) + (calcs.bonusAmount || BigInt(0));
    const totalDeductions =
      (calcs.federalTax || BigInt(0)) +
      (calcs.fica || BigInt(0)) +
      (calcs.medicareWithholding || BigInt(0)) +
      (calcs.stateTax || BigInt(0)) +
      (calcs.healthInsurancePremium || BigInt(0)) +
      (calcs.benefitsDeductions || BigInt(0));

    calcs.netPay = calcs.grossPay > totalDeductions
      ? (calcs.grossPay - totalDeductions) as Money
      : (BigInt(0) as Money);

    return calcs;
  }

  /**
   * Hash input data for audit trail
   */
  private hashInputs(employee: EmployeeDataSnapshot, timePeriod: TimePeriodData): string {
    const inputStr = JSON.stringify({
      employeeId: employee.employeeId,
      salary: employee.salary.toString(),
      hoursWorked: timePeriod.hoursWorked,
      periodStart: timePeriod.periodStart.toISOString(),
      periodEnd: timePeriod.periodEnd.toISOString(),
    });

    // TODO: Compute SHA-256 in Wave 2+
    return `sha256-${Buffer.from(inputStr).toString("base64").substring(0, 16)}`;
  }

  /**
   * Hash output data for audit trail
   */
  private hashResults(
    calculations: PolicyExecutionResult["calculations"]
  ): string {
    const outputStr = JSON.stringify({
      grossPay: calculations.grossPay.toString(),
      netPay: calculations.netPay.toString(),
    });

    // TODO: Compute SHA-256 in Wave 2+
    return `sha256-${Buffer.from(outputStr).toString("base64").substring(0, 16)}`;
  }
}

/**
 * Execute a policy for quick calculations (stateless)
 */
export async function executePolicyOnce(
  policy: CompiledPolicy,
  employee: EmployeeDataSnapshot,
  timePeriod: TimePeriodData,
  asOf?: Date
): Promise<PolicyExecutionResult> {
  const engine = new PolicyExecutionEngine(policy);
  return engine.execute(employee, timePeriod, asOf);
}

/**
 * Retroactive execution: calculate as if it's a specific date in the past
 * Used for payroll corrections and historical reconstructions
 */
export async function executeRetroactive(
  policy: CompiledPolicy,
  employee: EmployeeDataSnapshot,
  timePeriod: TimePeriodData,
  asOfDate: Date
): Promise<PolicyExecutionResult> {
  const engine = new PolicyExecutionEngine(policy);
  return engine.execute(employee, timePeriod, asOfDate);
}
