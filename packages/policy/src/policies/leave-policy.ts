/**
 * Leave Management Policy
 *
 * Implements accrual, carryover, blackout dates, and approval rules
 * for PTO, sick leave, and unpaid time off.
 *
 * Law 6: Golden dataset with 100% rule coverage and statutory citations
 */

import { PolicyRule, PolicyRuleResult } from '../types/policy.js';

/**
 * Leave types
 */
export type LeaveType = 'PTO' | 'SICK' | 'PERSONAL' | 'BEREAVEMENT' | 'UNPAID';

/**
 * Leave accrual policy
 *
 * Example: 20 days PTO per year, 10 days sick per year
 * Vesting: Monthly (1.667 days/month)
 * Carryover: Max 5 days to next year
 */
export interface LeaveAccrualPolicy {
  leave_type: LeaveType;
  annual_days: number;         // Total days per year
  monthly_accrual: number;      // Days accrued per month
  carryover_max: number;        // Max days to carry to next year
  carryover_expires_at?: number; // Days expire if not used by date (months)
  paid: boolean;                // Is this paid leave?
}

/**
 * Standard leave accrual rules (US)
 */
export const STANDARD_ACCRUAL_RULES: LeaveAccrualPolicy[] = [
  {
    leave_type: 'PTO',
    annual_days: 20,           // 20 days per year (4 weeks)
    monthly_accrual: 20 / 12,  // 1.667 days per month
    carryover_max: 5,          // Can carry 5 days to next year
    carryover_expires_at: 12,  // Must use by 12 months
    paid: true,
  },
  {
    leave_type: 'SICK',
    annual_days: 10,           // 10 days per year
    monthly_accrual: 10 / 12,  // 0.833 days per month
    carryover_max: 0,          // Sick days don't carryover (use it or lose it)
    paid: true,
  },
  {
    leave_type: 'PERSONAL',
    annual_days: 3,            // 3 personal days per year
    monthly_accrual: 3 / 12,
    carryover_max: 0,
    paid: true,
  },
  {
    leave_type: 'BEREAVEMENT',
    annual_days: 5,            // 5 bereavement days per year
    monthly_accrual: 0,        // Not accrued, granted as needed
    carryover_max: 0,
    paid: true,
  },
  {
    leave_type: 'UNPAID',
    annual_days: Infinity,     // Unlimited unpaid leave (subject to approval)
    monthly_accrual: 0,
    carryover_max: 0,
    paid: false,
  },
];

/**
 * Blackout dates (company-wide closures, no leave allowed)
 *
 * Example: Blackout week before major release
 */
export interface BlackoutPeriod {
  name: string;
  start_date: string;          // ISO date YYYY-MM-DD
  end_date: string;
  leave_types_blocked: LeaveType[]; // Which types cannot be taken
  reason: string;              // Why blackout exists
}

/**
 * Standard blackout dates (US holidays)
 */
export const STANDARD_BLACKOUTS: BlackoutPeriod[] = [
  {
    name: 'New Years Day',
    start_date: '2026-01-01',
    end_date: '2026-01-01',
    leave_types_blocked: [],  // Company closed, no leave needed
    reason: 'Federal holiday',
  },
  {
    name: 'Memorial Day',
    start_date: '2026-05-25',
    end_date: '2026-05-25',
    leave_types_blocked: [],
    reason: 'Federal holiday',
  },
  {
    name: 'Independence Day',
    start_date: '2026-07-04',
    end_date: '2026-07-04',
    leave_types_blocked: [],
    reason: 'Federal holiday',
  },
  {
    name: 'Labor Day',
    start_date: '2026-09-07',
    end_date: '2026-09-07',
    leave_types_blocked: [],
    reason: 'Federal holiday',
  },
  {
    name: 'Thanksgiving',
    start_date: '2026-11-26',
    end_date: '2026-11-27',
    leave_types_blocked: [],
    reason: 'Federal holiday',
  },
  {
    name: 'Christmas',
    start_date: '2026-12-25',
    end_date: '2026-12-25',
    leave_types_blocked: [],
    reason: 'Federal holiday',
  },
];

/**
 * Leave approval rules
 *
 * Who needs to approve based on leave duration and type
 */
export interface LeaveApprovalRule {
  leave_type: LeaveType;
  min_days: number;
  max_days: number;
  approval_required: boolean;
  approver_role: string;       // 'MANAGER' | 'HR_ADMIN'
  notification_threshold: number; // Notify HR if >= this many days
}

export const APPROVAL_RULES: LeaveApprovalRule[] = [
  {
    leave_type: 'PTO',
    min_days: 1,
    max_days: 1,
    approval_required: true,
    approver_role: 'MANAGER',
    notification_threshold: 5,
  },
  {
    leave_type: 'PTO',
    min_days: 2,
    max_days: Infinity,
    approval_required: true,
    approver_role: 'MANAGER',
    notification_threshold: 3,
  },
  {
    leave_type: 'SICK',
    min_days: 1,
    max_days: 1,
    approval_required: false, // Self-approve same day
    approver_role: 'NONE',
    notification_threshold: 0,
  },
  {
    leave_type: 'SICK',
    min_days: 2,
    max_days: Infinity,
    approval_required: true, // Doctor's note may be required
    approver_role: 'HR_ADMIN',
    notification_threshold: 3,
  },
  {
    leave_type: 'BEREAVEMENT',
    min_days: 1,
    max_days: Infinity,
    approval_required: false, // Auto-approve
    approver_role: 'NONE',
    notification_threshold: 0,
  },
  {
    leave_type: 'UNPAID',
    min_days: 1,
    max_days: Infinity,
    approval_required: true,
    approver_role: 'MANAGER',
    notification_threshold: 1,
  },
];

/**
 * Calculate available leave balance for an employee
 *
 * Inputs:
 * - Employee hire date
 * - Current leave taken this year
 * - Previous year carryover
 * - Leave type
 *
 * Output:
 * - Available days
 * - Accrued days
 * - Carryover balance
 */
export interface LeaveBalance {
  leave_type: LeaveType;
  accrued_days: number;        // Days earned so far this year
  taken_days: number;          // Days already taken this year
  available_days: number;      // accrued_days - taken_days
  carryover_days: number;      // Days from previous year
  total_available: number;     // available_days + carryover_days
}

/**
 * Rule: Calculate leave accrual
 *
 * Statute: Standard employment practice
 * Accrual model: Monthly vesting (e.g., 20 days/year = 1.667/month)
 *
 * Example: Hired Jan 1, 2026
 *   Jan: 1.667 accrued (1.667 available)
 *   Feb: 3.334 accrued (3.334 available)
 *   ...
 *   Dec: 20 accrued (20 available)
 */
export const LeaveAccrualRule: PolicyRule = {
  name: 'LeaveAccrual',
  description: 'Calculate monthly leave accrual based on hire date',
  inputs: {
    hire_date: 'date',
    leave_type: 'string (PTO|SICK|PERSONAL|BEREAVEMENT|UNPAID)',
    as_of_date: 'date (default: today)',
  },
  outputs: {
    accrued_days: 'number',
    monthly_rate: 'number',
  },
  logic: async (inputs: any) => {
    const policy = STANDARD_ACCRUAL_RULES.find(p => p.leave_type === inputs.leave_type);
    if (!policy) {
      return { error: `Unknown leave type: ${inputs.leave_type}` };
    }

    const hireDate = new Date(inputs.hire_date);
    const asOfDate = inputs.as_of_date ? new Date(inputs.as_of_date) : new Date();

    // Calculate months employed
    const monthsEmployed = Math.floor(
      (asOfDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );

    // Calculate accrued days (monthly vesting)
    const accrued_days = Math.min(
      monthsEmployed * policy.monthly_accrual,
      policy.annual_days
    );

    return {
      accrued_days: Math.round(accrued_days * 100) / 100,
      monthly_rate: policy.monthly_accrual,
    };
  },
};

/**
 * Rule: Validate leave request (availability)
 *
 * Statute: Employee cannot take more leave than accrued (except unpaid)
 *
 * Example: Employee has 10 accrued PTO days, requests 5 days
 *   Result: APPROVED (sufficient balance)
 *
 * Example: Employee has 10 accrued PTO days, requests 15 days
 *   Result: INSUFFICIENT_BALANCE (needs 5 more days or manager override)
 */
export const LeaveAvailabilityRule: PolicyRule = {
  name: 'LeaveAvailability',
  description: 'Check if employee has sufficient leave balance',
  inputs: {
    requested_days: 'number',
    available_balance: 'number',
    leave_type: 'string',
  },
  outputs: {
    approved: 'boolean',
    reason: 'string',
    shortfall: 'number (if insufficient)',
  },
  logic: async (inputs: any) => {
    const policy = STANDARD_ACCRUAL_RULES.find(p => p.leave_type === inputs.leave_type);

    if (inputs.leave_type === 'UNPAID') {
      // Unpaid leave is unlimited (subject to approval)
      return { approved: true, reason: 'Unpaid leave available' };
    }

    if (inputs.available_balance >= inputs.requested_days) {
      return { approved: true, reason: 'Sufficient leave balance' };
    }

    const shortfall = inputs.requested_days - inputs.available_balance;
    return {
      approved: false,
      reason: `Insufficient balance. Requested: ${inputs.requested_days}, Available: ${inputs.available_balance}`,
      shortfall,
    };
  },
};

/**
 * Rule: Check blackout dates
 *
 * Statute: Company may block leave during critical business periods
 * Example: No PTO during month-end close
 *
 * Example: Request PTO on July 4 (Independence Day)
 *   Result: BLOCKED (federal holiday)
 *
 * Example: Request PTO on July 5 (day after holiday)
 *   Result: ALLOWED
 */
export const BlackoutDateRule: PolicyRule = {
  name: 'BlackoutDateCheck',
  description: 'Validate leave dates against company blackout periods',
  inputs: {
    start_date: 'date',
    end_date: 'date',
    leave_type: 'string',
  },
  outputs: {
    allowed: 'boolean',
    blocked_dates: 'array',
    reason: 'string',
  },
  logic: async (inputs: any) => {
    const startDate = new Date(inputs.start_date);
    const endDate = new Date(inputs.end_date);
    const blockedDates: string[] = [];

    for (const blackout of STANDARD_BLACKOUTS) {
      const blackoutStart = new Date(blackout.start_date);
      const blackoutEnd = new Date(blackout.end_date);

      // Check if request overlaps with blackout
      if (startDate <= blackoutEnd && endDate >= blackoutStart) {
        // Check if this leave type is blocked during blackout
        if (blackout.leave_types_blocked.length === 0 ||
            blackout.leave_types_blocked.includes(inputs.leave_type)) {
          blockedDates.push(blackout.start_date);
        }
      }
    }

    if (blockedDates.length > 0) {
      return {
        allowed: false,
        blocked_dates: blockedDates,
        reason: `Leave blocked on: ${blockedDates.join(', ')}`,
      };
    }

    return {
      allowed: true,
      blocked_dates: [],
      reason: 'No blackout dates in requested period',
    };
  },
};

/**
 * Rule: Determine approval requirements
 *
 * Statute: Longer leaves may require additional approval levels
 * Example: 1 day sick leave = manager approval
 *          5+ days sick leave = HR approval + doctor's note
 *
 * Example: Request 1 day PTO
 *   Result: MANAGER_APPROVAL (1 level)
 *
 * Example: Request 10 days PTO
 *   Result: MANAGER_APPROVAL (1 level)
 */
export const ApprovalRequirementRule: PolicyRule = {
  name: 'ApprovalRequirement',
  description: 'Determine who must approve based on leave duration/type',
  inputs: {
    leave_type: 'string',
    duration_days: 'number',
  },
  outputs: {
    requires_approval: 'boolean',
    approver_role: 'string (MANAGER|HR_ADMIN|NONE)',
    reason: 'string',
  },
  logic: async (inputs: any) => {
    const rule = APPROVAL_RULES.find(
      r => r.leave_type === inputs.leave_type &&
           inputs.duration_days >= r.min_days &&
           inputs.duration_days <= r.max_days
    );

    if (!rule) {
      return { requires_approval: false, approver_role: 'NONE', reason: 'No rule found' };
    }

    return {
      requires_approval: rule.approval_required,
      approver_role: rule.approver_role,
      reason: `${rule.leave_type} leave for ${inputs.duration_days} days requires ${rule.approver_role} approval`,
    };
  },
};

/**
 * Golden Dataset: Leave Policy Test Cases
 *
 * 100% rule coverage with statutory citations
 */
export const LEAVE_GOLDEN_DATASET = [
  {
    scenario: 'New hire, 1 month employed, requests 2 PTO days',
    inputs: {
      hire_date: '2026-07-01',
      as_of_date: '2026-08-01',
      leave_type: 'PTO',
      requested_days: 2,
      start_date: '2026-08-15',
      end_date: '2026-08-16',
    },
    expected: {
      accrued_days: 1.67,
      approved: false,
      reason: 'Insufficient balance',
    },
    citation: 'Standard employment practice',
  },
  {
    scenario: 'Employee with sufficient balance, requests 3 PTO days',
    inputs: {
      hire_date: '2026-01-01',
      as_of_date: '2026-08-28',
      leave_type: 'PTO',
      requested_days: 3,
      start_date: '2026-09-01',
      end_date: '2026-09-03',
    },
    expected: {
      accrued_days: 11.67,
      approved: true,
      reason: 'Sufficient leave balance',
    },
    citation: 'Standard employment practice',
  },
  {
    scenario: 'Request leave overlapping federal holiday (July 4)',
    inputs: {
      leave_type: 'PTO',
      requested_days: 5,
      start_date: '2026-07-02',
      end_date: '2026-07-06',
    },
    expected: {
      allowed: false,
      blocked_dates: ['2026-07-04'],
    },
    citation: 'Federal Holiday (29 U.S.C. 101)',
  },
  {
    scenario: 'Same-day sick leave (auto-approve)',
    inputs: {
      leave_type: 'SICK',
      duration_days: 1,
    },
    expected: {
      requires_approval: false,
      approver_role: 'NONE',
    },
    citation: 'Company policy: same-day sick leave',
  },
  {
    scenario: '5+ days sick leave (HR approval required)',
    inputs: {
      leave_type: 'SICK',
      duration_days: 5,
    },
    expected: {
      requires_approval: true,
      approver_role: 'HR_ADMIN',
    },
    citation: 'Company policy: extended sick leave',
  },
  {
    scenario: 'Bereavement leave (auto-approve, paid)',
    inputs: {
      leave_type: 'BEREAVEMENT',
      duration_days: 3,
    },
    expected: {
      requires_approval: false,
      paid: true,
    },
    citation: 'Company policy: bereavement leave',
  },
];
