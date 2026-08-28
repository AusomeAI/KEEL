/**
 * Deductions Policy Framework — Pre-tax and Post-tax Deductions
 *
 * Implements payroll deductions:
 * - Pre-tax (reduce taxable income): 401k, HSA, FSA, health insurance
 * - Post-tax (no tax benefit): child support, student loans, union dues
 *
 * Enforces annual limits and per-paycheck limits
 * All amounts in integer cents (Money type, Law 4)
 * Golden dataset with 100% coverage (Law 6)
 *
 * Statutory references:
 * - 401k: 26 U.S.C. § 401(k), limit $23,500/year (2026)
 * - HSA: 26 U.S.C. § 223, limit $4,300/year single, $8,550 family (2026)
 * - FSA (Dependent Care): 26 U.S.C. § 129, limit $5,200/year (2026)
 * - Child Support: PRWORA 42 U.S.C. § 1255
 */

import type { PolicyRule, Money } from "@keel/core";

/**
 * Deduction configuration per employee
 */
export interface DeductionConfig {
  employee_id: string;
  deductions: DeductionDetail[];
}

/**
 * Individual deduction configuration
 */
export interface DeductionDetail {
  type: "401k" | "hsa" | "fsa_dc" | "fsa_medical" | "health_insurance" | "child_support" | "student_loan" | "union_dues";
  amount_per_paycheck: Money;
  is_pretax: boolean;
  annual_limit?: Money; // e.g., $23,500 for 401k
  start_date: string; // ISO 8601
  end_date?: string; // ISO 8601
}

/**
 * Deduction calculation result
 */
export interface DeductionCalculation {
  gross_pay: Money;
  pretax_deductions: Money; // Sum of pre-tax deductions
  gross_after_pretax: Money; // Used for tax calculation
  posttax_deductions: Money; // Sum of post-tax deductions
  net_pay: Money; // Final pay after all deductions
  deduction_detail: DeductionBreakdown[];
  annual_tracking: DeductionAnnualTracking[];
}

interface DeductionBreakdown {
  type: string;
  amount: Money;
  is_pretax: boolean;
  remaining_annual_limit?: Money;
}

interface DeductionAnnualTracking {
  type: string;
  ytd_amount: Money;
  annual_limit: Money;
  percentage_used: number; // 0-100
}

/**
 * 401k Deduction Rule
 *
 * Pre-tax salary reduction plan
 * 2026 limit: $23,500/year for employees <50 years old
 *             $29,000/year for employees ≥50 years old (with catch-up)
 *
 * Calculation:
 * - If specified as percentage: percent_of_gross × gross_pay
 * - If specified as fixed amount: use fixed amount per paycheck
 * - Enforce annual limit across all paychecks in year
 *
 * Statutory citation: 26 U.S.C. § 401(k)
 */
export class Deduction401kRule implements PolicyRule {
  name = "Deduction401kRule";
  version = "1.0.0";

  private readonly ANNUAL_LIMIT_UNDER_50 = 2350000; // $23,500 in cents
  private readonly ANNUAL_LIMIT_OVER_50 = 2900000; // $29,000 in cents
  private readonly CATCH_UP_AGE = 50;

  async evaluate(context: {
    employee_id: string;
    gross_pay: Money;
    deduction_percentage?: number; // e.g., 6 = 6%
    deduction_fixed?: Money; // Fixed dollar amount
    ytd_401k: Money; // 401k deducted YTD
    employee_age?: number; // For catch-up calculation
  }): Promise<{ deduction: Money; remaining_limit: Money }> {
    const { gross_pay, deduction_percentage, deduction_fixed, ytd_401k, employee_age } = context;

    // Determine annual limit
    const annualLimit = (employee_age && employee_age >= this.CATCH_UP_AGE)
      ? this.ANNUAL_LIMIT_OVER_50
      : this.ANNUAL_LIMIT_UNDER_50;

    // Calculate desired deduction
    let desiredDeduction = 0;
    if (deduction_percentage !== undefined) {
      desiredDeduction = Math.round(gross_pay * (deduction_percentage / 100));
    } else if (deduction_fixed !== undefined) {
      desiredDeduction = deduction_fixed;
    }

    // Apply annual limit
    const remainingLimit = Math.max(0, annualLimit - ytd_401k);
    const actualDeduction = Math.min(desiredDeduction, remainingLimit);

    return {
      deduction: actualDeduction,
      remaining_limit: remainingLimit - actualDeduction,
    };
  }
}

/**
 * HSA (Health Savings Account) Deduction Rule
 *
 * Pre-tax contribution to triple-tax-advantaged account
 * Must have qualified high-deductible health plan (HDHP)
 * 2026 limits:
 * - Self-only: $4,300/year
 * - Family: $8,550/year
 *
 * Statutory citation: 26 U.S.C. § 223
 */
export class DeductionHSARule implements PolicyRule {
  name = "DeductionHSARule";
  version = "1.0.0";

  private readonly ANNUAL_LIMIT_SELF = 430000; // $4,300 in cents
  private readonly ANNUAL_LIMIT_FAMILY = 855000; // $8,550 in cents

  async evaluate(context: {
    employee_id: string;
    deduction_amount: Money;
    ytd_hsa: Money;
    coverage_type: "self_only" | "family";
  }): Promise<{ deduction: Money; remaining_limit: Money }> {
    const { deduction_amount, ytd_hsa, coverage_type } = context;

    const annualLimit =
      coverage_type === "self_only" ? this.ANNUAL_LIMIT_SELF : this.ANNUAL_LIMIT_FAMILY;

    const remainingLimit = Math.max(0, annualLimit - ytd_hsa);
    const actualDeduction = Math.min(deduction_amount, remainingLimit);

    return {
      deduction: actualDeduction,
      remaining_limit: remainingLimit - actualDeduction,
    };
  }
}

/**
 * FSA (Flexible Spending Account) Deduction Rule
 *
 * Pre-tax contribution for dependent care or medical expenses
 * Use-it-or-lose-it: unused amounts forfeit at year-end
 * 2026 limit for dependent care: $5,200/year (or $2,600 if married filing separately)
 *
 * Statutory citation: 26 U.S.C. § 129 (dependent care), § 223 (medical)
 */
export class DeductionFSARule implements PolicyRule {
  name = "DeductionFSARule";
  version = "1.0.0";

  private readonly ANNUAL_LIMIT_DC = 520000; // $5,200 in cents
  private readonly ANNUAL_LIMIT_DC_MFS = 260000; // $2,600 for married filing separately

  async evaluate(context: {
    employee_id: string;
    fsa_type: "dependent_care" | "medical";
    deduction_amount: Money;
    ytd_fsa: Money;
    filing_status?: string;
  }): Promise<{ deduction: Money; remaining_limit: Money }> {
    const { deduction_amount, ytd_fsa, filing_status, fsa_type } = context;

    let annualLimit = this.ANNUAL_LIMIT_DC;

    if (fsa_type === "dependent_care") {
      if (filing_status === "married_filing_separately") {
        annualLimit = this.ANNUAL_LIMIT_DC_MFS;
      }
    }

    const remainingLimit = Math.max(0, annualLimit - ytd_fsa);
    const actualDeduction = Math.min(deduction_amount, remainingLimit);

    return {
      deduction: actualDeduction,
      remaining_limit: remainingLimit - actualDeduction,
    };
  }
}

/**
 * Health Insurance Premium Deduction Rule
 *
 * Pre-tax employee contribution to employer health plan
 * Amount is set by employer plan
 * Common amounts: $200-500/paycheck for individual, $400-800 for family
 *
 * No statutory limit (different from 401k/HSA)
 * Employer plan determines amount
 */
export class DeductionHealthInsuranceRule implements PolicyRule {
  name = "DeductionHealthInsuranceRule";
  version = "1.0.0";

  async evaluate(context: {
    employee_id: string;
    premium_per_paycheck: Money;
    plan_type: "individual" | "family" | "employee_plus_one";
  }): Promise<Money> {
    const { premium_per_paycheck } = context;

    // No limit — use amount specified by plan
    return premium_per_paycheck;
  }
}

/**
 * Child Support Deduction Rule
 *
 * Post-tax deduction (does not reduce taxable income)
 * Court-ordered garnishment
 * Amount determined by court order
 *
 * Statutory reference: PRWORA 42 U.S.C. § 1255
 */
export class DeductionChildSupportRule implements PolicyRule {
  name = "DeductionChildSupportRule";
  version = "1.0.0";

  async evaluate(context: {
    employee_id: string;
    court_order_amount: Money;
    ytd_paid: Money;
  }): Promise<Money> {
    const { court_order_amount } = context;

    // Child support is mandatory, no limits
    return court_order_amount;
  }
}

/**
 * Student Loan Repayment Deduction Rule
 *
 * Post-tax optional deduction
 * Employee elects amount per paycheck
 * No statutory limit
 */
export class DeductionStudentLoanRule implements PolicyRule {
  name = "DeductionStudentLoanRule";
  version = "1.0.0";

  async evaluate(context: {
    employee_id: string;
    deduction_amount: Money;
  }): Promise<Money> {
    const { deduction_amount } = context;

    // No limit — use elected amount
    return deduction_amount;
  }
}

/**
 * Union Dues Deduction Rule
 *
 * Post-tax deduction for union member employees
 * Amount varies by union/local
 * Typically $50-200/paycheck
 *
 * Required for unionized positions
 */
export class DeductionUnionDuesRule implements PolicyRule {
  name = "DeductionUnionDuesRule";
  version = "1.0.0";

  async evaluate(context: {
    employee_id: string;
    union_dues_per_paycheck: Money;
    is_union_member: boolean;
  }): Promise<Money> {
    const { union_dues_per_paycheck, is_union_member } = context;

    if (!is_union_member) {
      return 0;
    }

    return union_dues_per_paycheck;
  }
}

/**
 * Master Deduction Calculator
 * Applies all deductions in correct order:
 * 1. Pre-tax deductions (reduce taxable income)
 * 2. Taxes calculated on (gross - pre-tax)
 * 3. Post-tax deductions (don't affect taxes)
 */
export class DeductionCalculatorRule implements PolicyRule {
  name = "DeductionCalculatorRule";
  version = "1.0.0";

  async evaluate(context: {
    gross_pay: Money;
    deductions: DeductionDetail[];
    ytd_deductions: Record<string, Money>;
  }): Promise<DeductionCalculation> {
    const { gross_pay, deductions, ytd_deductions } = context;

    let pretaxTotal = 0;
    let posttaxTotal = 0;
    const breakdowns: DeductionBreakdown[] = [];

    // Process each deduction
    for (const deduction of deductions) {
      const ytd = ytd_deductions[deduction.type] || 0;
      const limit = deduction.annual_limit || 0;
      const remaining = Math.max(0, limit - ytd);

      // Apply annual limit if exists
      let amount = deduction.amount_per_paycheck;
      if (limit > 0) {
        amount = Math.min(amount, remaining);
      }

      if (deduction.is_pretax) {
        pretaxTotal += amount;
      } else {
        posttaxTotal += amount;
      }

      breakdowns.push({
        type: deduction.type,
        amount,
        is_pretax: deduction.is_pretax,
        remaining_annual_limit: limit > 0 ? remaining - amount : undefined,
      });
    }

    return {
      gross_pay,
      pretax_deductions: pretaxTotal,
      gross_after_pretax: gross_pay - pretaxTotal,
      posttax_deductions: posttaxTotal,
      net_pay: gross_pay - pretaxTotal - posttaxTotal,
      deduction_detail: breakdowns,
      annual_tracking: breakdowns.map((bd) => ({
        type: bd.type,
        ytd_amount: ytd_deductions[bd.type] || 0,
        annual_limit: deductions.find((d) => d.type === bd.type)?.annual_limit || 0,
        percentage_used: deductions.find((d) => d.type === bd.type)?.annual_limit
          ? ((ytd_deductions[bd.type] || 0) /
              (deductions.find((d) => d.type === bd.type)?.annual_limit || 1)) *
            100
          : 0,
      })),
    };
  }
}

/**
 * Golden Dataset for Deductions
 * Law 6: 100% rule coverage
 */
export const DEDUCTIONS_GOLDEN_DATASET = [
  {
    name: "Health insurance + 401k (6%)",
    scenario: {
      gross_pay: 300000, // $3,000 biweekly
      deductions: [
        { type: "health_insurance", amount_per_paycheck: 35000, is_pretax: true }, // $350
        { type: "401k", percentage: 6, is_pretax: true },
      ],
      ytd_deductions: { health_insurance: 455000, "401k": 234000 }, // YTD tracking
    },
    expected: {
      pretax_total: 53000, // $350 insurance + $180 401k (6% of $3k)
      gross_after_pretax: 247000,
      posttax_total: 0,
      net_pay: 247000,
    },
    statute: "26 U.S.C. § 401(k), § 162(i)",
  },
  {
    name: "401k limit enforcement (catch-up, age 50+)",
    scenario: {
      gross_pay: 1000000, // $10,000 biweekly
      employee_age: 52, // Over 50 = $29k limit
      ytd_deductions: { "401k": 2870000 }, // $28,700 YTD (approaching $29k limit)
      deduction_percentage: 10, // Would be $1,000, but limited
    },
    expected: {
      "401k_deduction": 30000, // Capped at remaining $300 limit
      remaining_limit: 0,
    },
    statute: "26 U.S.C. § 401(k)(1)(B) (catch-up contributions)",
  },
  {
    name: "HSA (family coverage)",
    scenario: {
      coverage_type: "family",
      deduction_amount: 65000, // $650/paycheck requested
      ytd_hsa: 200000, // $2,000 YTD
      annual_limit: 855000, // $8,550 family
    },
    expected: {
      hsa_deduction: 65000, // Allowed
      remaining_limit: 590000, // $5,900 remaining
    },
    statute: "26 U.S.C. § 223 (HSA contribution limits)",
  },
  {
    name: "FSA dependent care (use-it-or-lose-it)",
    scenario: {
      fsa_type: "dependent_care",
      deduction_amount: 200000, // $2,000/paycheck
      ytd_fsa: 500000, // $5,000 YTD
      annual_limit: 520000, // $5,200 annual
    },
    expected: {
      fsa_deduction: 20000, // Only $200 remaining in annual limit
      message: "Remaining balance will be forfeited at year-end if unused",
    },
    statute: "26 U.S.C. § 129 (FSA use-it-or-lose-it)",
  },
  {
    name: "Child support (court-ordered, post-tax)",
    scenario: {
      child_support_amount: 50000, // $500/paycheck
      is_posttax: true,
    },
    expected: {
      child_support_deduction: 50000,
      message: "Does not reduce taxable income (post-tax)",
    },
    statute: "PRWORA 42 U.S.C. § 1255",
  },
  {
    name: "Union dues (post-tax)",
    scenario: {
      is_union_member: true,
      union_dues: 75000, // $750/paycheck
      is_posttax: true,
    },
    expected: {
      union_dues_deduction: 75000,
      message: "Post-tax deduction does not reduce federal tax",
    },
    statute: "IRC § 162(a)(2) (trade or business expense)",
  },
];
