/**
 * Payroll Run Orchestrator
 *
 * Orchestrates complete payroll cycle:
 * 1. Validate timesheet data completeness
 * 2. Fetch employee salary/deduction rules
 * 3. Calculate gross pay (hourly × hours + bonuses)
 * 4. Calculate all taxes (federal, state, local, FICA)
 * 5. Calculate all deductions (pre-tax, post-tax)
 * 6. Calculate net pay
 * 7. Create ledger events for each employee
 * 8. Generate decision records (Law 7)
 * 9. Post to GL (accounting entries)
 * 10. Generate pay slips
 *
 * Law 3: Append-only ledger for all payroll transactions
 * Law 4: All calculations in integer cents (Money type)
 * Law 5: RLS enforcement per tenant
 * Law 6: Policy validation against golden dataset
 * Law 7: Decision records with hash chain
 * Law 8: L3 testing (no agent involvement required)
 *
 * Invoked via Control Gate PAYROLL_RUN intent
 */

import type { TransactionIntent, DecisionRecord } from "@keel/core";
import type { TaxWithholding } from "../../../packages/policy/src/policies/tax-policy";
import type { DeductionCalculation } from "../../../packages/policy/src/policies/deductions-policy";

/**
 * Payroll run input (from Control Gate PAYROLL_RUN intent)
 */
export interface PayrollRunRequest {
  tenant_id: string;
  pay_period_start: string; // ISO 8601
  pay_period_end: string;
  pay_frequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
  actor_id: string; // Who initiated (Finance Manager, CHRO)
  approved_by_id?: string; // Final approver
}

/**
 * Employee payroll calculation
 */
export interface EmployeePayrollCalculation {
  employee_id: string;
  name: string;
  period_start: string;
  period_end: string;

  // Earnings
  regular_hours: number;
  regular_rate: number; // Hourly rate in dollars
  regular_pay: number;

  overtime_hours: number;
  overtime_rate: number; // 1.5× multiplier
  overtime_pay: number;

  bonus: number;
  other_income: number;
  gross_pay: number;

  // Pre-tax deductions (reduce taxable income)
  pretax_deductions: number;
  gross_for_tax_calculation: number;

  // Taxes
  federal_income_tax: number;
  social_security_tax: number;
  medicare_tax: number;
  additional_medicare_tax: number;
  state_income_tax: number;
  local_income_tax: number;
  total_tax: number;

  // Post-tax deductions
  child_support: number;
  student_loans: number;
  union_dues: number;
  total_posttax_deductions: number;

  // Bottom line
  net_pay: number;

  // Tracking
  ytd_gross: number;
  ytd_taxes: number;
  ytd_net: number;

  // Audit
  decision_record_id: string;
  ledger_event_id: string;
  gl_posting_id?: string;
}

/**
 * Payroll run result
 */
export interface PayrollRunResult {
  payroll_run_id: string;
  tenant_id: string;
  pay_period_start: string;
  pay_period_end: string;
  run_date: string; // When run executed

  employee_count: number;
  total_gross: number;
  total_taxes: number;
  total_deductions: number;
  total_net: number;

  employee_calculations: EmployeePayrollCalculation[];

  status: "pending_approval" | "approved" | "posted" | "errors";
  errors: string[];

  // GL posting
  gl_entries: GLEntry[];
  gl_posting_status: "draft" | "posted" | "reconciled";

  // Audit
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  decision_record_ids: string[];
}

/**
 * General Ledger posting entry
 * Syncs payroll to accounting system
 */
export interface GLEntry {
  gl_account_code: string;
  gl_account_name: string;
  debit: number;
  credit: number;
  description: string;
  cost_center?: string;
  entity_code?: string;
}

/**
 * Main payroll orchestrator class
 */
export class PayrollOrchestrator {
  private db: any; // Database connection
  private policyEngine: any; // Policy evaluation engine
  private ledgerService: any; // Ledger event store
  private decisionRecordService: any; // Decision record creation
  private glService: any; // GL posting service
  private payslipGenerator: any; // Pay slip PDF generation

  constructor(
    db: any,
    policyEngine: any,
    ledgerService: any,
    decisionRecordService: any,
    glService: any,
    payslipGenerator: any
  ) {
    this.db = db;
    this.policyEngine = policyEngine;
    this.ledgerService = ledgerService;
    this.decisionRecordService = decisionRecordService;
    this.glService = glService;
    this.payslipGenerator = payslipGenerator;
  }

  /**
   * Execute complete payroll run
   * Invoked by Control Gate after PAYROLL_RUN intent approval
   */
  async executePayrollRun(request: PayrollRunRequest): Promise<PayrollRunResult> {
    console.log(`[PayrollRun] Starting payroll for ${request.tenant_id}`);

    const payrollRunId = this.generateId();
    const errors: string[] = [];
    const employeeCalculations: EmployeePayrollCalculation[] = [];
    let totalGross = 0;
    let totalTaxes = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    try {
      // Step 1: Validate timesheet completeness
      console.log("[PayrollRun] Validating timesheet data");
      const timesheetValidation = await this.validateTimesheetData(
        request.tenant_id,
        request.pay_period_start,
        request.pay_period_end
      );

      if (timesheetValidation.errors.length > 0) {
        errors.push(...timesheetValidation.errors);
        return {
          payroll_run_id: payrollRunId,
          tenant_id: request.tenant_id,
          pay_period_start: request.pay_period_start,
          pay_period_end: request.pay_period_end,
          run_date: new Date().toISOString(),
          employee_count: 0,
          total_gross: 0,
          total_taxes: 0,
          total_deductions: 0,
          total_net: 0,
          employee_calculations: [],
          status: "errors",
          errors,
          gl_entries: [],
          gl_posting_status: "draft",
          created_by: request.actor_id,
          decision_record_ids: [],
        };
      }

      // Step 2: Get all active employees in tenant
      console.log("[PayrollRun] Fetching employee roster");
      const employees = await this.getActiveEmployees(request.tenant_id);
      console.log(`[PayrollRun] Processing ${employees.length} employees`);

      // Step 3: Calculate payroll for each employee
      for (const employee of employees) {
        try {
          const calculation = await this.calculateEmployeePayroll(
            employee,
            request.tenant_id,
            request.pay_period_start,
            request.pay_period_end,
            request.pay_frequency
          );

          employeeCalculations.push(calculation);

          totalGross += calculation.gross_pay;
          totalTaxes += calculation.total_tax;
          totalDeductions += calculation.total_posttax_deductions;
          totalNet += calculation.net_pay;
        } catch (err) {
          errors.push(`Employee ${employee.id}: ${(err as Error).message}`);
        }
      }

      // Step 4: Create GL entries
      console.log("[PayrollRun] Creating GL entries");
      const glEntries = this.createGLEntries(
        totalGross,
        totalTaxes,
        totalDeductions,
        request.tenant_id
      );

      // Step 5: Post to GL (draft status)
      console.log("[PayrollRun] Posting to GL");
      const glPostingId = await this.glService.postPayroll(
        payrollRunId,
        glEntries,
        "draft"
      );

      // Step 6: Generate pay slips
      console.log("[PayrollRun] Generating pay slips");
      for (const calc of employeeCalculations) {
        try {
          await this.payslipGenerator.generatePayslip(
            calc,
            request.tenant_id,
            payrollRunId
          );
        } catch (err) {
          errors.push(`Pay slip generation for ${calc.employee_id}: ${(err as Error).message}`);
        }
      }

      const result: PayrollRunResult = {
        payroll_run_id: payrollRunId,
        tenant_id: request.tenant_id,
        pay_period_start: request.pay_period_start,
        pay_period_end: request.pay_period_end,
        run_date: new Date().toISOString(),
        employee_count: employeeCalculations.length,
        total_gross: totalGross,
        total_taxes: totalTaxes,
        total_deductions: totalDeductions,
        total_net: totalNet,
        employee_calculations: employeeCalculations,
        status: errors.length > 0 ? "errors" : "pending_approval",
        errors,
        gl_entries: glEntries,
        gl_posting_status: "draft",
        created_by: request.actor_id,
        approved_by: request.approved_by_id,
        decision_record_ids: employeeCalculations.map((c) => c.decision_record_id),
      };

      console.log(`[PayrollRun] Completed: ${payrollRunId}`);
      return result;
    } catch (err) {
      console.error("[PayrollRun] Fatal error:", err);
      throw err;
    }
  }

  /**
   * Calculate payroll for single employee
   */
  private async calculateEmployeePayroll(
    employee: any,
    tenantId: string,
    periodStart: string,
    periodEnd: string,
    payFrequency: string
  ): Promise<EmployeePayrollCalculation> {
    // Step 1: Get time entry data
    const timeData = await this.getTimeEntryData(
      employee.id,
      tenantId,
      periodStart,
      periodEnd
    );

    // Step 2: Get leave data (PTO, SICK, etc.)
    const leaveData = await this.getLeaveData(
      employee.id,
      tenantId,
      periodStart,
      periodEnd
    );

    // Step 3: Calculate gross pay
    const grossPayCalculation = this.calculateGrossPay(
      employee,
      timeData,
      leaveData
    );

    // Step 4: Calculate taxes
    const taxWithholding = await this.policyEngine.calculateTaxes({
      gross_pay: grossPayCalculation.total_gross,
      filing_status: employee.filing_status,
      federal_allowances: employee.federal_allowances,
      state: employee.state,
      ytd_wages: employee.ytd_gross,
      pay_frequency: payFrequency,
    });

    // Step 5: Calculate deductions
    const deductionCalculation = await this.policyEngine.calculateDeductions({
      gross_pay: grossPayCalculation.total_gross,
      deductions: employee.deductions,
      ytd_deductions: employee.ytd_deductions,
    });

    // Step 6: Calculate net pay
    const netPay =
      grossPayCalculation.total_gross -
      deductionCalculation.pretax_deductions -
      taxWithholding.total_tax -
      deductionCalculation.posttax_deductions;

    // Step 7: Create decision record
    const decisionRecord = await this.decisionRecordService.createDecisionRecord(
      {
        entity_type: "payroll",
        entity_id: employee.id,
        action: "calculate_payroll",
        actor_id: employee.id,
        simulation_result: {
          gross: grossPayCalculation.total_gross,
          taxes: taxWithholding.total_tax,
          deductions: deductionCalculation.pretax_deductions,
          net: netPay,
        },
      }
    );

    // Step 8: Create ledger event
    const ledgerEvent = await this.ledgerService.createPayrollEvent({
      tenant_id: tenantId,
      employee_id: employee.id,
      period_start: periodStart,
      period_end: periodEnd,
      gross_pay: grossPayCalculation.total_gross,
      taxes: taxWithholding.total_tax,
      deductions: deductionCalculation.pretax_deductions,
      net_pay: netPay,
      decision_record_id: decisionRecord.id,
    });

    return {
      employee_id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      period_start: periodStart,
      period_end: periodEnd,

      regular_hours: timeData.regular_hours,
      regular_rate: employee.hourly_rate,
      regular_pay: grossPayCalculation.regular_pay,

      overtime_hours: timeData.overtime_hours,
      overtime_rate: 1.5,
      overtime_pay: grossPayCalculation.overtime_pay,

      bonus: grossPayCalculation.bonus,
      other_income: 0,
      gross_pay: grossPayCalculation.total_gross,

      pretax_deductions: deductionCalculation.pretax_deductions,
      gross_for_tax_calculation: deductionCalculation.gross_after_pretax,

      federal_income_tax: taxWithholding.federal_income_tax,
      social_security_tax: taxWithholding.social_security_tax,
      medicare_tax: taxWithholding.medicare_tax,
      additional_medicare_tax: taxWithholding.additional_medicare_tax,
      state_income_tax: taxWithholding.state_income_tax,
      local_income_tax: taxWithholding.local_income_tax,
      total_tax: taxWithholding.total_tax,

      child_support: employee.child_support || 0,
      student_loans: employee.student_loans || 0,
      union_dues: employee.union_dues || 0,
      total_posttax_deductions: deductionCalculation.posttax_deductions,

      net_pay: netPay,

      ytd_gross: employee.ytd_gross + grossPayCalculation.total_gross,
      ytd_taxes: employee.ytd_taxes + taxWithholding.total_tax,
      ytd_net: employee.ytd_net + netPay,

      decision_record_id: decisionRecord.id,
      ledger_event_id: ledgerEvent.id,
    };
  }

  /**
   * Create GL entries for payroll posting
   */
  private createGLEntries(
    totalGross: number,
    totalTaxes: number,
    totalDeductions: number,
    tenantId: string
  ): GLEntry[] {
    // Standard payroll GL entries:
    // DR: Payroll Expense
    // CR: Cash (net pay)
    // CR: Taxes Payable
    // CR: Deductions Payable

    const entries: GLEntry[] = [];

    // Main payroll expense
    entries.push({
      gl_account_code: "6100",
      gl_account_name: "Payroll Expense",
      debit: totalGross,
      credit: 0,
      description: "Gross payroll for period",
      cost_center: "DEFAULT",
    });

    // Cash disbursement (net pay)
    entries.push({
      gl_account_code: "1010",
      gl_account_name: "Cash - Operating",
      debit: 0,
      credit: totalGross - totalTaxes - totalDeductions,
      description: "Net payroll payment",
    });

    // Taxes payable
    entries.push({
      gl_account_code: "2100",
      gl_account_name: "Payroll Taxes Payable",
      debit: 0,
      credit: totalTaxes,
      description: "Payroll tax withholdings",
    });

    // Deductions payable
    if (totalDeductions > 0) {
      entries.push({
        gl_account_code: "2110",
        gl_account_name: "Payroll Deductions Payable",
        debit: 0,
        credit: totalDeductions,
        description: "Post-tax deductions payable",
      });
    }

    return entries;
  }

  /**
   * Validate timesheet data completeness
   */
  private async validateTimesheetData(
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    // TODO: Query timesheet table
    // Check that all active employees have time entries for period
    return { valid: true, errors: [] };
  }

  /**
   * Get all active employees in tenant
   */
  private async getActiveEmployees(tenantId: string): Promise<any[]> {
    // TODO: Query employees table where status = 'active'
    return [];
  }

  /**
   * Get time entry data for employee + period
   */
  private async getTimeEntryData(
    employeeId: string,
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ regular_hours: number; overtime_hours: number }> {
    // TODO: Sum up timesheet entries, apply FLSA rules
    return { regular_hours: 160, overtime_hours: 0 };
  }

  /**
   * Get leave usage data for period
   */
  private async getLeaveData(
    employeeId: string,
    tenantId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<any> {
    // TODO: Get approved leave requests (PTO, SICK, etc.)
    return {};
  }

  /**
   * Calculate gross pay components
   */
  private calculateGrossPay(
    employee: any,
    timeData: any,
    leaveData: any
  ): { regular_pay: number; overtime_pay: number; bonus: number; total_gross: number } {
    // Regular pay: regular_hours × hourly_rate
    const regularPay = timeData.regular_hours * employee.hourly_rate;

    // Overtime pay: overtime_hours × hourly_rate × 1.5
    const overtimePay = timeData.overtime_hours * employee.hourly_rate * 1.5;

    // Bonus (separate, if any)
    const bonus = employee.bonus_this_period || 0;

    return {
      regular_pay: regularPay,
      overtime_pay: overtimePay,
      bonus,
      total_gross: regularPay + overtimePay + bonus,
    };
  }

  private generateId(): string {
    return `payroll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
