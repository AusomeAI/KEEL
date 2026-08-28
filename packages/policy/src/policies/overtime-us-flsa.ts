/**
 * US FLSA Overtime Policy
 *
 * Fair Labor Standards Act (29 CFR 516) requires:
 * - Time and a half for hours worked over 40 per week
 * - Time and a half for hours worked over 8 per day (in some states)
 *
 * This is a reference implementation for Wave 1 golden dataset testing.
 *
 * No LLM execution. This policy is compiled and executed deterministically by Rust/WASM.
 */

import { definePolicy, defineRule } from '../builder.js';
import type {
  PolicyDefinition,
  Rule,
  RuleGroup,
  Condition,
  Calculation,
  PolicyInputSpec,
  PolicyOutputSpec,
  Money,
} from '../schemas/index.js';

/**
 * Create the US FLSA Overtime policy definition.
 *
 * This is the DSL representation; it will be compiled to a rule graph.
 */
export function createUsFlsaOvertimePolicy(): PolicyDefinition {
  const now = new Date();
  const author = {
    id: 'author-001',
    name: 'Payroll Engineering',
    email: 'payroll@keel.local',
    role: 'author' as const,
  };

  const policy = definePolicy('overtime/us-flsa', {
    version: '2026-Q1',
    jurisdiction: 'US-FLSA',
    author,
  })
    .withDescription(
      'US Fair Labor Standards Act (29 CFR 516) overtime rules: time and a half for hours beyond 40 per week'
    )
    .effectiveFrom(new Date('2026-01-01'))
    .requireEmployeeFields('hourlyRate', 'status', 'employmentType', 'jobTitle')
    .requirePeriodFields('hoursWorked', 'startDate', 'endDate')
    .produceFields(
      { name: 'regularHours', type: 'duration', description: 'Hours up to 40 per week, paid at regular rate' },
      { name: 'overtimeHours', type: 'duration', description: 'Hours beyond 40 per week, paid at 1.5x rate' },
      { name: 'regularPay', type: 'money', description: 'Gross pay for regular hours' },
      { name: 'overtimePay', type: 'money', description: 'Gross pay for overtime hours (at 1.5x rate)' },
      { name: 'totalGrossPay', type: 'money', description: 'Regular pay + overtime pay' }
    );

  // Rule 1: Calculate regular hours (up to 40 per week)
  const regularHoursRule: Rule = {
    id: 'regular-hours-calculation',
    description: 'Hours worked up to 40 per week are paid at regular rate',
    applicability: {
      jurisdictions: ['US-FLSA'],
      employeeStatus: ['active'],
      employmentType: ['full-time', 'part-time'],
    },
    condition: {
      operator: 'all',
      predicates: [
        {
          field: 'employee.status',
          operator: '==',
          value: 'active',
        },
      ],
    },
    effect: {
      type: 'compute',
      calculation: {
        type: 'min',
        operands: [
          { scope: 'period', path: 'hoursWorked' },
          { scope: 'constant', path: 'WEEKLY_THRESHOLD' },
        ],
      },
      output: 'regularHours',
    },
    citations: ['29 CFR 516.1'],
    precedence: 10,
  };

  // Rule 2: Calculate overtime hours (beyond 40 per week)
  const overtimeHoursRule: Rule = {
    id: 'overtime-hours-calculation',
    description: 'Hours worked beyond 40 per week are overtime',
    applicability: {
      jurisdictions: ['US-FLSA'],
      employeeStatus: ['active'],
    },
    condition: {
      operator: 'all',
      predicates: [
        {
          field: 'period.hoursWorked',
          operator: '>',
          value: 40,
        },
      ],
    },
    effect: {
      type: 'compute',
      calculation: {
        type: 'subtract',
        operands: [
          { scope: 'period', path: 'hoursWorked' },
          { scope: 'rule', path: 'regular-hours-calculation.regularHours' },
        ],
      },
      output: 'overtimeHours',
    },
    citations: ['29 CFR 516.1'],
    precedence: 20,
  };

  // Rule 3: Calculate regular pay
  const regularPayRule: Rule = {
    id: 'regular-pay-calculation',
    description: 'Regular pay is hourly rate times regular hours',
    applicability: {
      jurisdictions: ['US-FLSA'],
    },
    effect: {
      type: 'compute',
      calculation: {
        type: 'multiply',
        operands: [
          { scope: 'employee', path: 'hourlyRate' },
          { scope: 'rule', path: 'regular-hours-calculation.regularHours' },
        ],
        rounding: 'half-up',
      },
      output: 'regularPay',
    },
    citations: ['29 CFR 516.1'],
    precedence: 30,
  };

  // Rule 4: Calculate overtime pay
  const overtimePayRule: Rule = {
    id: 'overtime-pay-calculation',
    description: 'Overtime pay is hourly rate times 1.5 times overtime hours',
    applicability: {
      jurisdictions: ['US-FLSA'],
    },
    condition: {
      operator: 'all',
      predicates: [
        {
          field: 'period.hoursWorked',
          operator: '>',
          value: 40,
        },
      ],
    },
    effect: {
      type: 'compute',
      calculation: {
        type: 'multiply',
        operands: [
          { scope: 'employee', path: 'hourlyRate' },
          { scope: 'rule', path: 'overtime-hours-calculation.overtimeHours' },
          { scope: 'constant', path: 'OT_MULTIPLIER' },
        ],
        rounding: 'half-up',
      },
      output: 'overtimePay',
    },
    citations: ['29 CFR 516.1'],
    precedence: 40,
  };

  // Rule 5: Calculate total gross pay
  const totalGrossPayRule: Rule = {
    id: 'total-gross-pay',
    description: 'Total gross pay is regular pay plus overtime pay',
    applicability: {
      jurisdictions: ['US-FLSA'],
    },
    effect: {
      type: 'apply',
      calculation: {
        type: 'add',
        operands: [
          { scope: 'rule', path: 'regular-pay-calculation.regularPay' },
          { scope: 'rule', path: 'overtime-pay-calculation.overtimePay' },
        ],
      },
      output: 'totalGrossPay',
    },
    citations: ['29 CFR 516.1'],
    precedence: 50,
  };

  const ruleGroup: RuleGroup = {
    name: 'US FLSA Overtime Calculations',
    description: 'Rules for calculating overtime under the Fair Labor Standards Act',
    rules: [regularHoursRule, overtimeHoursRule, regularPayRule, overtimePayRule, totalGrossPayRule],
  };

  // Note: The builder is incomplete; we're manually building the PolicyDefinition here.
  // In a full implementation, the builder would construct this automatically.

  return {
    metadata: {
      id: 'overtime/us-flsa',
      version: '2026-Q1',
      jurisdiction: 'US-FLSA',
      description:
        'US Fair Labor Standards Act (29 CFR 516) overtime rules: time and a half for hours beyond 40 per week',
      author,
      effectiveFrom: new Date('2026-01-01'),
    },
    ruleGroups: [ruleGroup],
    inputSpec: {
      employee: {
        fields: ['hourlyRate', 'status', 'employmentType', 'jobTitle'],
      },
      period: {
        fields: ['hoursWorked', 'startDate', 'endDate'],
      },
    },
    outputSpec: {
      fields: [
        {
          name: 'regularHours',
          type: 'duration',
          description: 'Hours up to 40 per week, paid at regular rate',
        },
        {
          name: 'overtimeHours',
          type: 'duration',
          description: 'Hours beyond 40 per week, paid at 1.5x rate',
        },
        {
          name: 'regularPay',
          type: 'money',
          description: 'Gross pay for regular hours',
        },
        {
          name: 'overtimePay',
          type: 'money',
          description: 'Gross pay for overtime hours (at 1.5x rate)',
        },
        {
          name: 'totalGrossPay',
          type: 'money',
          description: 'Regular pay + overtime pay',
        },
      ],
    },
  };
}

export default createUsFlsaOvertimePolicy;
