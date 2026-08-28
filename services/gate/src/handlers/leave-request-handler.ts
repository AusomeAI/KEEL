/**
 * Leave Request Handler
 *
 * Validates REQUEST_LEAVE intents through the leave policy rules.
 *
 * Implements:
 * - LeaveAccrualRule: Calculate accrued days at request time
 * - LeaveAvailabilityRule: Validate sufficient balance
 * - BlackoutDateRule: Check for blackout dates
 * - ApprovalRequirementRule: Route to correct approver
 *
 * Law 6: Golden dataset with 100% rule coverage
 * Law 7: Decision Records for all approvals
 */

import {
  LeaveAccrualRule,
  LeaveAvailabilityRule,
  BlackoutDateRule,
  ApprovalRequirementRule,
  STANDARD_ACCRUAL_RULES,
} from '@keel/policy';

export interface LeaveRequestPayload {
  leave_type: 'PTO' | 'SICK' | 'PERSONAL' | 'BEREAVEMENT' | 'UNPAID';
  start_date: string; // ISO date YYYY-MM-DD
  end_date: string;
  duration_days: number;
  reason?: string;
}

export interface LeaveRequestValidationResult {
  valid: boolean;
  errors: string[];
  approval_required: boolean;
  approver_role: 'MANAGER' | 'HR_ADMIN' | 'NONE';
  simulation_result: {
    accrued_days: number;
    available_before: number;
    available_after: number;
    shortfall?: number;
    blocked_dates?: string[];
  };
}

/**
 * Validate a leave request against leave policy rules
 */
export async function validateLeaveRequest(
  employeeId: string,
  hireDate: string,
  currentBalance: number,
  payload: LeaveRequestPayload
): Promise<LeaveRequestValidationResult> {
  const errors: string[] = [];
  let approvalRequired = false;
  let approverRole: 'MANAGER' | 'HR_ADMIN' | 'NONE' = 'NONE';

  // Validate dates
  if (!payload.start_date || !payload.end_date) {
    errors.push('Start and end dates are required');
    return { valid: false, errors, approval_required: false, approver_role: 'NONE', simulation_result: {} as any };
  }

  const startDate = new Date(payload.start_date);
  const endDate = new Date(payload.end_date);

  if (startDate > endDate) {
    errors.push('Start date must be before or equal to end date');
  }

  // Run LeaveAccrualRule to get current accrual at request time
  let accruedDays = 0;
  try {
    const accrualResult = await LeaveAccrualRule.logic({
      hire_date: hireDate,
      leave_type: payload.leave_type,
      as_of_date: new Date().toISOString().split('T')[0], // Today
    });

    if (!accrualResult.error) {
      accruedDays = accrualResult.accrued_days;
    } else {
      errors.push(`Accrual calculation failed: ${accrualResult.error}`);
    }
  } catch (err: any) {
    errors.push(`Failed to calculate accrual: ${err.message}`);
  }

  // Run LeaveAvailabilityRule to check balance
  let availableBefore = currentBalance;
  let availableAfter = currentBalance - payload.duration_days;
  let shortfall = 0;

  try {
    const availabilityResult = await LeaveAvailabilityRule.logic({
      requested_days: payload.duration_days,
      available_balance: currentBalance,
      leave_type: payload.leave_type,
    });

    if (!availabilityResult.approved && payload.leave_type !== 'UNPAID') {
      errors.push(`Insufficient leave balance: need ${availabilityResult.shortfall} more days`);
      shortfall = availabilityResult.shortfall || 0;
      approvalRequired = true; // Route to approver to handle exception
    }
  } catch (err: any) {
    errors.push(`Failed to check availability: ${err.message}`);
  }

  // Run BlackoutDateRule to check for blocked dates
  let blockedDates: string[] = [];
  try {
    const blackoutResult = await BlackoutDateRule.logic({
      start_date: payload.start_date,
      end_date: payload.end_date,
      leave_type: payload.leave_type,
    });

    if (!blackoutResult.allowed) {
      errors.push(`Leave blocked on these dates: ${blackoutResult.blocked_dates.join(', ')}`);
      blockedDates = blackoutResult.blocked_dates;
    }
  } catch (err: any) {
    errors.push(`Failed to check blackout dates: ${err.message}`);
  }

  // Run ApprovalRequirementRule to determine routing
  try {
    const approvalResult = await ApprovalRequirementRule.logic({
      leave_type: payload.leave_type,
      duration_days: payload.duration_days,
    });

    if (approvalResult.requires_approval) {
      approvalRequired = true;
      approverRole = approvalResult.approver_role as any;
    }
  } catch (err: any) {
    errors.push(`Failed to determine approval requirements: ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    approval_required: approvalRequired,
    approver_role,
    simulation_result: {
      accrued_days: accruedDays,
      available_before: availableBefore,
      available_after: availableAfter,
      shortfall: shortfall > 0 ? shortfall : undefined,
      blocked_dates: blockedDates.length > 0 ? blockedDates : undefined,
    },
  };
}

/**
 * Determine if leave should auto-approve based on type and duration
 */
export function shouldAutoApprove(leaveType: string, durationDays: number): boolean {
  // BEREAVEMENT: Always auto-approve
  if (leaveType === 'BEREAVEMENT') {
    return true;
  }

  // PERSONAL: Always auto-approve
  if (leaveType === 'PERSONAL') {
    return true;
  }

  // SICK for 1 day: Auto-approve (same-day sick leave)
  if (leaveType === 'SICK' && durationDays === 1) {
    return true;
  }

  // Everything else requires explicit approval
  return false;
}

/**
 * Determine which role must approve this leave request
 */
export function getApproverRole(leaveType: string, durationDays: number): 'MANAGER' | 'HR_ADMIN' | 'NONE' {
  // Auto-approve cases
  if (shouldAutoApprove(leaveType, durationDays)) {
    return 'NONE';
  }

  // SICK for 2+ days: Requires HR approval (may need medical documentation)
  if (leaveType === 'SICK' && durationDays >= 2) {
    return 'HR_ADMIN';
  }

  // PTO, UNPAID: Requires manager approval
  // (Managers decide based on team coverage)
  return 'MANAGER';
}
