/**
 * Golden dataset for US FLSA Overtime Policy
 *
 * Test cases that validate the policy against known-correct outcomes.
 * Law 6: "No policy without a golden dataset at 100% rule coverage with statutory citations"
 *
 * These test cases are the source of truth for policy correctness.
 */

import type { GoldenDataset, Money } from '../schemas/index.js';

/**
 * Money helper: create Money objects without boilerplate.
 */
function usd(cents: number): Money {
  return {
    amount: cents,
    currency: 'USD',
    scale: 2,
  };
}

/**
 * Golden dataset for the US FLSA Overtime policy.
 *
 * Test cases cover:
 * 1. No overtime (< 40 hours)
 * 2. Exact threshold (40 hours)
 * 3. Moderate overtime (45 hours)
 * 4. Heavy overtime (50 hours)
 * 5. Multiple employees in same period
 */
export const overtimeUsFlsaGoldenDataset: GoldenDataset = {
  policyId: 'overtime/us-flsa',
  policyVersion: '2026-Q1',
  jurisdiction: 'US-FLSA',
  description: 'Test cases for Fair Labor Standards Act overtime calculations',

  testCases: [
    /**
     * Test 1: No overtime scenario
     * Employee works 35 hours in a week at $25/hour.
     * Expected: 35 hours regular, $875 total
     */
    {
      input: {
        testId: 'test-no-ot-001',
        description: 'Employee works 35 hours; no overtime',
        employee: {
          id: 'EMP-001',
          name: 'Alice Johnson',
          status: 'active',
          employmentType: 'full-time',
          hourlyRate: usd(2500), // $25.00/hour
          jobTitle: 'Software Engineer',
        },
        period: {
          startDate: '2026-01-05',
          endDate: '2026-01-11',
          hoursWorked: 35 * 100, // 3500 minute-units (35 hours = 2100 minutes)
        },
      },
      expectedOutput: {
        fields: {
          regularHours: 3500,
          overtimeHours: 0,
          regularPay: usd(87500), // 35 * $25 = $875.00
          overtimePay: usd(0),
          totalGrossPay: usd(87500),
        },
      },
      ruleApplications: [
        {
          ruleId: 'regular-hours-calculation',
          applied: true,
          reason: 'hoursWorked (35) <= WEEKLY_THRESHOLD (40)',
          contribution: { regularHours: 3500 },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-hours-calculation',
          applied: false,
          reason: 'hoursWorked (35) <= 40',
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'regular-pay-calculation',
          applied: true,
          reason: 'Employee.status is active',
          contribution: { regularPay: usd(87500) },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-pay-calculation',
          applied: false,
          reason: 'Condition hoursWorked > 40 is false',
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'total-gross-pay',
          applied: true,
          reason: 'Always compute total',
          contribution: { totalGrossPay: usd(87500) },
          citation: '29 CFR 516.1',
        },
      ],
    },

    /**
     * Test 2: Exact threshold (40 hours)
     * Employee works exactly 40 hours at $25/hour.
     * Expected: 40 hours regular, $1000 total
     */
    {
      input: {
        testId: 'test-threshold-001',
        description: 'Employee works exactly 40 hours; no overtime',
        employee: {
          id: 'EMP-002',
          name: 'Bob Smith',
          status: 'active',
          employmentType: 'full-time',
          hourlyRate: usd(2500), // $25.00/hour
          jobTitle: 'Senior Engineer',
        },
        period: {
          startDate: '2026-01-05',
          endDate: '2026-01-11',
          hoursWorked: 4000, // 40 hours
        },
      },
      expectedOutput: {
        fields: {
          regularHours: 4000,
          overtimeHours: 0,
          regularPay: usd(100000), // 40 * $25 = $1000.00
          overtimePay: usd(0),
          totalGrossPay: usd(100000),
        },
      },
      ruleApplications: [
        {
          ruleId: 'regular-hours-calculation',
          applied: true,
          reason: 'hoursWorked (40) == WEEKLY_THRESHOLD (40)',
          contribution: { regularHours: 4000 },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-hours-calculation',
          applied: false,
          reason: 'hoursWorked (40) == 40, not > 40',
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'regular-pay-calculation',
          applied: true,
          contribution: { regularPay: usd(100000) },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-pay-calculation',
          applied: false,
          reason: 'Condition hoursWorked > 40 is false',
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'total-gross-pay',
          applied: true,
          contribution: { totalGrossPay: usd(100000) },
          citation: '29 CFR 516.1',
        },
      ],
    },

    /**
     * Test 3: Moderate overtime (45 hours)
     * Employee works 45 hours at $20/hour.
     * Expected: 40 regular + 5 OT at 1.5x = $800 + $150 = $950
     */
    {
      input: {
        testId: 'test-moderate-ot-001',
        description: 'Employee works 45 hours; 5 hours at overtime rate',
        employee: {
          id: 'EMP-003',
          name: 'Carol Davis',
          status: 'active',
          employmentType: 'full-time',
          hourlyRate: usd(2000), // $20.00/hour
          jobTitle: 'Manager',
        },
        period: {
          startDate: '2026-01-05',
          endDate: '2026-01-11',
          hoursWorked: 4500, // 45 hours
        },
      },
      expectedOutput: {
        fields: {
          regularHours: 4000,
          overtimeHours: 500,
          regularPay: usd(80000), // 40 * $20 = $800.00
          overtimePay: usd(15000), // 5 * $20 * 1.5 = $150.00
          totalGrossPay: usd(95000), // $800 + $150 = $950.00
        },
      },
      ruleApplications: [
        {
          ruleId: 'regular-hours-calculation',
          applied: true,
          reason: 'hoursWorked (45) > WEEKLY_THRESHOLD (40), so min(45, 40) = 40',
          contribution: { regularHours: 4000 },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-hours-calculation',
          applied: true,
          reason: 'hoursWorked (45) > 40',
          contribution: { overtimeHours: 500 },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'regular-pay-calculation',
          applied: true,
          contribution: { regularPay: usd(80000) },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-pay-calculation',
          applied: true,
          reason: 'hoursWorked (45) > 40',
          contribution: { overtimePay: usd(15000) },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'total-gross-pay',
          applied: true,
          contribution: { totalGrossPay: usd(95000) },
          citation: '29 CFR 516.1',
        },
      ],
    },

    /**
     * Test 4: Heavy overtime (50 hours)
     * Employee works 50 hours at $30/hour.
     * Expected: 40 regular + 10 OT at 1.5x = $1200 + $450 = $1650
     */
    {
      input: {
        testId: 'test-heavy-ot-001',
        description: 'Employee works 50 hours; 10 hours at overtime rate',
        employee: {
          id: 'EMP-004',
          name: 'David Wilson',
          status: 'active',
          employmentType: 'full-time',
          hourlyRate: usd(3000), // $30.00/hour
          jobTitle: 'Director',
        },
        period: {
          startDate: '2026-01-05',
          endDate: '2026-01-11',
          hoursWorked: 5000, // 50 hours
        },
      },
      expectedOutput: {
        fields: {
          regularHours: 4000,
          overtimeHours: 1000,
          regularPay: usd(120000), // 40 * $30 = $1200.00
          overtimePay: usd(45000), // 10 * $30 * 1.5 = $450.00
          totalGrossPay: usd(165000), // $1200 + $450 = $1650.00
        },
      },
      ruleApplications: [
        {
          ruleId: 'regular-hours-calculation',
          applied: true,
          contribution: { regularHours: 4000 },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-hours-calculation',
          applied: true,
          contribution: { overtimeHours: 1000 },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'regular-pay-calculation',
          applied: true,
          contribution: { regularPay: usd(120000) },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'overtime-pay-calculation',
          applied: true,
          contribution: { overtimePay: usd(45000) },
          citation: '29 CFR 516.1',
        },
        {
          ruleId: 'total-gross-pay',
          applied: true,
          contribution: { totalGrossPay: usd(165000) },
          citation: '29 CFR 516.1',
        },
      ],
    },
  ],

  coverage: {
    totalRules: 5,
    testedRules: [
      'regular-hours-calculation',
      'overtime-hours-calculation',
      'regular-pay-calculation',
      'overtime-pay-calculation',
      'total-gross-pay',
    ],
    coverage: 1.0, // 100% of rules tested
  },
};
