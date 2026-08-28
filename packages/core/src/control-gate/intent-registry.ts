/**
 * Transaction Intent Registry
 *
 * Enforces Law 2: Every TransactionIntent type must register a human UI route
 * before any agent capability exists for that intent.
 *
 * This file is the source of truth for all supported intent types,
 * their autonomy levels, and UI route paths.
 *
 * CI Check: Any new TransactionIntentType that is not registered here
 * will cause the build to fail (verify-transaction-intent-routes.mjs).
 */

import { registerIntentType, type IntentRegistration } from "./pipeline";
import { TransactionIntentType } from "../types/transaction-intent";

/**
 * Complete registry of all supported transaction intents
 * Organized by domain and maturity level (Wave 1, Wave 2, etc.)
 */

// =============================================================================
// WAVE 1 — Foundations (Phase 1: Infrastructure only)
// =============================================================================
// These are defined but may not have full implementations yet

/**
 * Wave 1: Hire Employee
 * Domain: Entitlements
 * Autonomy Ceiling: L2 (Assisted — agent informs, human decides)
 * Requires: Employee create in people master, benefits enrollment, payroll setup
 */
export const HIRE_EMPLOYEE: IntentRegistration = {
  type: "HIRE_EMPLOYEE",
  autonomyLevel: "L2",
  requiresApproval: true,
  uiRoute: "/people/hire",
  description: "Hire a new employee with role, pay, and benefits assignment",
};

/**
 * Wave 1: Terminate Employee
 * Domain: Entitlements
 * Autonomy Ceiling: L2 (Assisted)
 * Requires: Separation workflow, final paycheck, offboarding
 */
export const TERMINATE_EMPLOYEE: IntentRegistration = {
  type: "TERMINATE_EMPLOYEE",
  autonomyLevel: "L2",
  requiresApproval: true,
  uiRoute: "/people/terminate",
  description: "Terminate an employee with separation type and final paycheck",
};

/**
 * Wave 1: Change Job
 * Domain: Entitlements
 * Autonomy Ceiling: L1 (Supervised — agent proposes, human approves)
 * Requires: Job change workflow, benefits review, pay adjustment
 */
export const CHANGE_JOB: IntentRegistration = {
  type: "CHANGE_JOB",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/people/change-job",
  description: "Change employee job title, department, or reporting line",
};

/**
 * Wave 1: Change Pay
 * Domain: Compensation
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: Pay change effective dating, retroactive adjustment, policy validation
 */
export const CHANGE_PAY: IntentRegistration = {
  type: "CHANGE_PAY",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/compensation/change-pay",
  description: "Change employee salary, bonus structure, or benefits deduction",
};

// =============================================================================
// WAVE 2 — Core HR & Time (Weeks 4–10)
// =============================================================================

/**
 * Wave 2: Submit Timesheet
 * Domain: Time & Attendance
 * Autonomy Ceiling: L0 (Autonomous — no approval needed if within policy)
 * Requires: Time policy validation, hour accumulation, overtime calculation
 */
export const SUBMIT_TIMESHEET: IntentRegistration = {
  type: "SUBMIT_TIMESHEET",
  autonomyLevel: "L0",
  requiresApproval: false,
  uiRoute: "/time/timesheet",
  description: "Submit hours worked for a pay period",
};

/**
 * Wave 2: Request Leave
 * Domain: Time & Attendance
 * Autonomy Ceiling: L3 (Manual only — no agent involvement)
 * Note: Employees request, managers approve separately
 */
export const REQUEST_LEAVE: IntentRegistration = {
  type: "REQUEST_LEAVE",
  autonomyLevel: "L3",
  requiresApproval: false,
  uiRoute: "/time/request-leave",
  description: "Employee requests leave (PTO, sick, bereavement, etc.)",
};

/**
 * Wave 2: Approve Leave
 * Domain: Time & Attendance
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: Manager approval of pending leave request
 */
export const APPROVE_LEAVE: IntentRegistration = {
  type: "APPROVE_LEAVE",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/time/approve-leave",
  description: "Manager approves or rejects pending leave request",
};

/**
 * Wave 2: Cancel Leave
 * Domain: Time & Attendance
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: Cancellation reason, reversal of accrual adjustments
 */
export const CANCEL_LEAVE: IntentRegistration = {
  type: "CANCEL_LEAVE",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/time/cancel-leave",
  description: "Cancel previously approved leave",
};

/**
 * Wave 2: Run Payroll
 * Domain: Payroll
 * Autonomy Ceiling: L2 (Assisted)
 * Requires: Complete time capture, policy execution, calculation verification
 */
export const RUN_PAYROLL: IntentRegistration = {
  type: "RUN_PAYROLL",
  autonomyLevel: "L2",
  requiresApproval: true,
  uiRoute: "/payroll/run",
  description: "Execute payroll calculation for a period (Wave 2+)",
};

/**
 * Wave 2: Approve Payroll
 * Domain: Payroll
 * Autonomy Ceiling: L2 (Assisted)
 * Requires: Payroll sign-off review, variance investigation
 */
export const APPROVE_PAYROLL: IntentRegistration = {
  type: "APPROVE_PAYROLL",
  autonomyLevel: "L2",
  requiresApproval: true,
  uiRoute: "/payroll/approve",
  description: "Payroll administrator approves calculated payroll",
};

/**
 * Wave 2: Post Payroll to GL
 * Domain: Payroll & Accounting
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: GL coding, journal entry creation
 */
export const POST_PAYROLL_TO_GL: IntentRegistration = {
  type: "POST_PAYROLL_TO_GL",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/payroll/post-gl",
  description: "Post approved payroll to general ledger",
};

// =============================================================================
// WAVE 3+ — Approvals & Workflow
// =============================================================================

/**
 * Wave 2+: Approve Transaction
 * Domain: Workflow & Approvals
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: Route to appropriate approver, record approval decision
 */
export const APPROVE_TRANSACTION: IntentRegistration = {
  type: "APPROVE_TRANSACTION",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/approvals/approve",
  description: "Approve a pending transaction in workflow",
};

/**
 * Wave 2+: Reject Transaction
 * Domain: Workflow & Approvals
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: Rejection reason, route back to initiator
 */
export const REJECT_TRANSACTION: IntentRegistration = {
  type: "REJECT_TRANSACTION",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/approvals/reject",
  description: "Reject a pending transaction with reason",
};

/**
 * Wave 2+: Escalate Transaction
 * Domain: Workflow & Approvals
 * Autonomy Ceiling: L1 (Supervised)
 * Requires: Escalation reason, route to higher approver
 */
export const ESCALATE_TRANSACTION: IntentRegistration = {
  type: "ESCALATE_TRANSACTION",
  autonomyLevel: "L1",
  requiresApproval: true,
  uiRoute: "/approvals/escalate",
  description: "Escalate a pending transaction to higher authority",
};

/**
 * Initialize registry by registering all intent types
 * Call this at application startup (Wave 2+)
 */
export function initializeIntentRegistry(): void {
  // Entitlements
  registerIntentType(HIRE_EMPLOYEE);
  registerIntentType(TERMINATE_EMPLOYEE);
  registerIntentType(CHANGE_JOB);
  registerIntentType(CHANGE_PAY);

  // Time & Attendance
  registerIntentType(SUBMIT_TIMESHEET);
  registerIntentType(REQUEST_LEAVE);
  registerIntentType(APPROVE_LEAVE);
  registerIntentType(CANCEL_LEAVE);

  // Payroll
  registerIntentType(RUN_PAYROLL);
  registerIntentType(APPROVE_PAYROLL);
  registerIntentType(POST_PAYROLL_TO_GL);

  // Approvals
  registerIntentType(APPROVE_TRANSACTION);
  registerIntentType(REJECT_TRANSACTION);
  registerIntentType(ESCALATE_TRANSACTION);
}

/**
 * Get all registered intents (for verification and diagnostics)
 */
export const ALL_REGISTERED_INTENTS: Record<TransactionIntentType, IntentRegistration> = {
  // Entitlements
  HIRE_EMPLOYEE,
  TERMINATE_EMPLOYEE,
  CHANGE_JOB,
  CHANGE_PAY,

  // Time & Attendance
  SUBMIT_TIMESHEET,
  REQUEST_LEAVE,
  APPROVE_LEAVE,
  CANCEL_LEAVE,

  // Payroll
  RUN_PAYROLL,
  APPROVE_PAYROLL,
  POST_PAYROLL_TO_GL,

  // Approvals
  APPROVE_TRANSACTION,
  REJECT_TRANSACTION,
  ESCALATE_TRANSACTION,
};
