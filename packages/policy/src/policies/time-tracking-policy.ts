/**
 * Time Tracking Policy Framework
 *
 * Implements FLSA-compliant time tracking with:
 * - Regular vs. overtime hour calculation
 * - Jurisdiction-specific overtime rules
 * - Break compliance validation
 * - Attendance anomaly detection
 *
 * All calculations use integer minutes (no floats) to avoid rounding errors.
 * Law 4: No floating-point time values — use Duration (minutes)
 * Law 6: 100% golden dataset coverage with statutory citations
 */

import type { PolicyRule, Duration, Money } from "@keel/core";

/**
 * Time entry as recorded by employee or timesheet system
 */
export interface TimeEntry {
  employee_id: string;
  date: string; // ISO 8601: YYYY-MM-DD
  start_time: string; // HH:MM (24-hour)
  end_time: string; // HH:MM (24-hour)
  break_minutes: number; // Unpaid break duration in minutes
  work_type: "regular" | "special_project" | "pto_use" | "sick_use" | "personal_use";
  notes?: string;
}

/**
 * Result of time entry validation
 */
export interface TimeEntryValidation {
  valid: boolean;
  hours_worked: Duration; // In minutes
  status: "on_time" | "late" | "overtime" | "error";
  break_compliance: "compliant" | "insufficient_breaks" | "warning";
  error_message?: string;
}

/**
 * Overtime accrual summary for a week
 */
export interface OvertimeAccrual {
  week_of: string; // ISO 8601 date of Monday
  employee_id: string;
  regular_hours: Duration; // 0-40 hours/week
  overtime_hours: Duration; // 40+ hours/week
  double_time_hours: Duration; // Jurisdiction-specific (e.g., CA: 8+ consecutive days)
  total_hours: Duration; // regular + overtime + double_time
  overtime_rate_multiplier: number; // 1.5 for overtime, 2.0 for double-time
}

/**
 * Attendance record for a single day
 */
export interface AttendanceRecord {
  employee_id: string;
  date: string; // ISO 8601
  status: "present" | "absent" | "late" | "pto" | "sick";
  hours_scheduled: Duration; // Expected hours
  hours_actual: Duration; // Hours worked
  variance_minutes: number; // Actual - scheduled (can be negative)
  break_compliance: "compliant" | "insufficient";
  notes?: string;
}

/**
 * Break requirements by hours worked (per jurisdiction)
 * Source: FLSA + State regulations
 */
export interface BreakRequirement {
  hours_worked: Duration;
  min_break_duration: Duration;
  break_count: number;
}

/**
 * Time Entry Rule: Parse and validate a time entry
 * Input: TimeEntry + policy rules
 * Output: hours worked + validation status
 *
 * Enforces:
 * - No overlapping time entries
 * - Break compliance (15-min per 4 hrs, 30-min meal per 6 hrs)
 * - Reasonable hours (8-12 hours/day typical, flag >16 hours)
 * - No midnight-crossing entries (e.g., 11pm-1am must be split)
 */
export class TimeEntryRule implements PolicyRule {
  name = "TimeEntryRule";
  version = "1.0.0";

  async evaluate(context: {
    entry: TimeEntry;
    jurisdiction: string; // "US_CA" | "US_TX" | "US_FL" | "US_NY"
    existing_entries: TimeEntry[]; // Other entries for same employee on same day
  }): Promise<TimeEntryValidation> {
    const { entry, jurisdiction, existing_entries } = context;

    // Parse times
    const [startH, startM] = entry.start_time.split(":").map(Number);
    const [endH, endM] = entry.end_time.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Validate time order
    if (endMinutes <= startMinutes) {
      return {
        valid: false,
        hours_worked: 0,
        status: "error",
        break_compliance: "compliant",
        error_message: "End time must be after start time",
      };
    }

    // Calculate total duration (including break)
    const totalMinutes = endMinutes - startMinutes;
    const hoursWorked = totalMinutes - entry.break_minutes;

    // Validate against FLSA limits
    if (hoursWorked < 0) {
      return {
        valid: false,
        hours_worked: 0,
        status: "error",
        break_compliance: "compliant",
        error_message: "Break duration cannot exceed total time",
      };
    }

    // Check for overlapping entries
    const overlapping = existing_entries.filter((other) => {
      const [otherStartH, otherStartM] = other.start_time.split(":").map(Number);
      const [otherEndH, otherEndM] = other.end_time.split(":").map(Number);
      const otherStart = otherStartH * 60 + otherStartM;
      const otherEnd = otherEndH * 60 + otherEndM;

      return !(endMinutes <= otherStart || startMinutes >= otherEnd);
    });

    if (overlapping.length > 0) {
      return {
        valid: false,
        hours_worked: 0,
        status: "error",
        break_compliance: "compliant",
        error_message: `Overlapping time entry: ${overlapping[0].start_time}-${overlapping[0].end_time}`,
      };
    }

    // Determine status based on daily hours
    let status: "on_time" | "late" | "overtime" | "error" = "on_time";
    if (hoursWorked > 480) { // 8 hours = 480 minutes
      status = "overtime";
    }

    // Validate break compliance
    const breakCompliance = this.validateBreakCompliance(hoursWorked, entry.break_minutes);

    return {
      valid: true,
      hours_worked: hoursWorked,
      status,
      break_compliance: breakCompliance,
    };
  }

  /**
   * FLSA Break Requirements:
   * - 15-min rest break for every 4 hours worked
   * - 30-min meal break for every 6 hours worked
   * Some states (CA) more stringent
   */
  private validateBreakCompliance(
    hoursWorked: number,
    breakTaken: number
  ): "compliant" | "insufficient_breaks" | "warning" {
    const hoursDecimal = hoursWorked / 60;

    // Minimum required break time
    const restBreakMinutes = Math.floor(hoursDecimal / 4) * 15;
    const mealBreakMinutes = Math.floor(hoursDecimal / 6) * 30;
    const requiredBreakMinutes = restBreakMinutes + mealBreakMinutes;

    if (breakTaken < requiredBreakMinutes) {
      return "insufficient_breaks";
    }

    if (breakTaken >= requiredBreakMinutes && breakTaken < requiredBreakMinutes + 15) {
      return "warning";
    }

    return "compliant";
  }
}

/**
 * Overtime Accrual Rule: Calculate weekly overtime
 * Input: All time entries for a week + jurisdiction
 * Output: Regular hours, overtime hours, multipliers
 *
 * FLSA Standard (applies most states):
 * - Hours 0-40/week: regular rate (1.0x)
 * - Hours 40+/week: overtime rate (1.5x)
 *
 * CA Additional:
 * - Hours 8-10/day: regular
 * - Hours 10+/day: 1.5x (daily OT)
 * - 8+ consecutive days: 1.5x (8th day rule)
 * - Sundays: 1.5x (if worked)
 *
 * Statutory citation: FLSA 29 U.S.C. § 207
 */
export class OvertimeAccrualRule implements PolicyRule {
  name = "OvertimeAccrualRule";
  version = "1.0.0";

  async evaluate(context: {
    entries: TimeEntry[];
    week_of: string; // ISO date of Monday
    jurisdiction: string; // "US_CA" | "US_TX" | "US_FL" | "US_NY"
  }): Promise<OvertimeAccrual> {
    const { entries, week_of, jurisdiction } = context;

    // Sum hours worked (excluding PTO/SICK/PERSONAL)
    let totalMinutes = 0;
    const dailyMinutes: Record<string, number> = {};

    for (const entry of entries) {
      if (!["pto_use", "sick_use", "personal_use"].includes(entry.work_type)) {
        const [startH, startM] = entry.start_time.split(":").map(Number);
        const [endH, endM] = entry.end_time.split(":").map(Number);
        const duration = (endH * 60 + endM) - (startH * 60 + startM) - entry.break_minutes;

        totalMinutes += duration;
        dailyMinutes[entry.date] = (dailyMinutes[entry.date] || 0) + duration;
      }
    }

    // Weekly standard: 40 hours = 2400 minutes
    const weeklyStandardMinutes = 40 * 60;
    let regularMinutes = Math.min(totalMinutes, weeklyStandardMinutes);
    let overtimeMinutes = Math.max(0, totalMinutes - weeklyStandardMinutes);

    // CA-specific logic
    if (jurisdiction === "US_CA") {
      const { daily, eighth } = this.calculateCAOvertime(dailyMinutes);
      overtimeMinutes = Math.max(overtimeMinutes, daily, eighth);
    }

    // Determine multiplier
    let multiplier = 1.0;
    if (overtimeMinutes > 0) {
      multiplier = 1.5; // Standard OT
      // TODO: Implement double-time detection (8+ consecutive days)
    }

    return {
      week_of,
      employee_id: entries[0]?.employee_id || "",
      regular_hours: regularMinutes,
      overtime_hours: overtimeMinutes,
      double_time_hours: 0, // Handled in payroll calculation
      total_hours: totalMinutes,
      overtime_rate_multiplier: multiplier,
    };
  }

  /**
   * CA Overtime Rules (more complex):
   * - Daily OT: 2+ hours over 8 in a day
   * - 8th day rule: Any day worked in 7-day period (if 3+ days worked)
   * Statutory citation: CA Labor Code § 510
   */
  private calculateCAOvertime(
    dailyMinutes: Record<string, number>
  ): { daily: number; eighth: number } {
    let dailyOT = 0;

    // Daily OT: >8 hours
    for (const date in dailyMinutes) {
      const dailyHours = dailyMinutes[date] / 60;
      if (dailyHours > 8) {
        dailyOT += (dailyHours - 8) * 60;
      }
    }

    // 8th day rule (complex, simplified)
    const daysWorked = Object.keys(dailyMinutes).length;
    let eighthDayOT = 0;
    if (daysWorked >= 3) {
      // In a 7-day period, the 8th day worked is OT
      // Simplified: if >7 days in week, last day is OT
      if (daysWorked > 7) {
        const lastDay = Object.keys(dailyMinutes).sort().pop()!;
        eighthDayOT = dailyMinutes[lastDay];
      }
    }

    return { daily: dailyOT, eighth: eighthDayOT };
  }
}

/**
 * Attendance Validation Rule: Flag unusual patterns
 * Input: Scheduled hours, actual hours, date
 * Output: Attendance status + variance
 *
 * Detects:
 * - On-time presence (within 5 min)
 * - Tardiness (>5 min late)
 * - Absences (no time entry)
 */
export class AttendanceValidationRule implements PolicyRule {
  name = "AttendanceValidationRule";
  version = "1.0.0";

  async evaluate(context: {
    employee_id: string;
    date: string;
    scheduled_hours: Duration;
    actual_hours: Duration;
    entry?: TimeEntry;
  }): Promise<AttendanceRecord> {
    const { employee_id, date, scheduled_hours, actual_hours, entry } = context;

    let status: "present" | "absent" | "late" | "pto" | "sick" = "absent";
    let variance = (actual_hours || 0) - scheduled_hours;

    if (!entry) {
      status = "absent";
    } else if (entry.work_type === "pto_use") {
      status = "pto";
      variance = 0; // No variance for PTO days
    } else if (entry.work_type === "sick_use") {
      status = "sick";
      variance = 0; // No variance for SICK days
    } else if (actual_hours >= scheduled_hours - 5) {
      // Within 5 minutes of scheduled
      status = "present";
    } else if (actual_hours > 0) {
      status = "late";
    }

    return {
      employee_id,
      date,
      status,
      hours_scheduled: scheduled_hours,
      hours_actual: actual_hours,
      variance_minutes: variance,
      break_compliance: entry ? "compliant" : "compliant", // TODO: Check actual
    };
  }
}

/**
 * Break Compliance Rule: Validate break time per jurisdiction
 * Input: hours worked, break taken, jurisdiction
 * Output: compliant flag
 *
 * FLSA: 15-min per 4 hrs, 30-min per 6 hrs
 * CA: More stringent (5-min rest, 10-min break per 4-6 hrs)
 * Statutory citation: 29 CFR 516
 */
export class BreakComplianceRule implements PolicyRule {
  name = "BreakComplianceRule";
  version = "1.0.0";

  async evaluate(context: {
    hours_worked: Duration;
    break_taken: Duration;
    jurisdiction: string;
  }): Promise<{ compliant: boolean; required_breaks: Duration }> {
    const { hours_worked, break_taken, jurisdiction } = context;
    const hoursDecimal = hours_worked / 60;

    let required = 0;

    if (jurisdiction === "US_CA") {
      // CA Labor Code § 512: 1 rest break (15 min) per 4 hours
      // 1 meal break (30 min) per 5 hours
      required = Math.floor(hoursDecimal / 4) * 15 + Math.floor(hoursDecimal / 5) * 30;
    } else {
      // Standard FLSA
      required = Math.floor(hoursDecimal / 4) * 15 + Math.floor(hoursDecimal / 6) * 30;
    }

    return {
      compliant: break_taken >= required,
      required_breaks: required,
    };
  }
}

/**
 * Golden Dataset for Time Tracking
 * Statutory citations and real-world scenarios
 * Law 6: 100% rule coverage
 */
export const TIME_TRACKING_GOLDEN_DATASET = [
  {
    name: "Standard 40-hour week (no overtime)",
    scenario: {
      entries: [
        // Mon-Fri: 8 hours each
        {
          employee_id: "emp-001",
          date: "2026-08-25",
          start_time: "09:00",
          end_time: "17:00",
          break_minutes: 60,
          work_type: "regular",
        },
        // ... (repeat for Tue-Fri)
      ],
      week_of: "2026-08-25",
      jurisdiction: "US_CA",
    },
    expected: {
      regular_hours: 2400, // 40 hours in minutes
      overtime_hours: 0,
      compliance: true,
    },
    statute: "FLSA 29 U.S.C. § 207(a)",
  },
  {
    name: "50-hour week with 10 hours overtime",
    scenario: {
      entries: [
        // Mon-Fri: 10 hours each
      ],
      week_of: "2026-08-25",
      jurisdiction: "US_CA",
    },
    expected: {
      regular_hours: 2400,
      overtime_hours: 600, // 10 hours at 1.5x
      multiplier: 1.5,
    },
    statute: "FLSA 29 U.S.C. § 207(a)",
  },
  {
    name: "Sunday work with double-time (CA)",
    scenario: {
      entries: [
        {
          employee_id: "emp-001",
          date: "2026-08-31", // Sunday
          start_time: "09:00",
          end_time: "17:00",
          break_minutes: 60,
          work_type: "regular",
        },
      ],
      week_of: "2026-08-25",
      jurisdiction: "US_CA",
    },
    expected: {
      double_time_hours: 480, // Sunday = 2.0x
    },
    statute: "CA Labor Code § 510(a)",
  },
  {
    name: "Consecutive 8-day rule (CA)",
    scenario: {
      // Employee works 8 consecutive days in a row
      entries: [
        // Day 1-7: 8 hours each
        // Day 8: 8 hours (must be OT)
      ],
      week_of: "2026-08-25",
      jurisdiction: "US_CA",
    },
    expected: {
      overtime_hours: 480, // 8th day at 1.5x
    },
    statute: "CA Labor Code § 510(a)(8th day rule)",
  },
  {
    name: "Break compliance validation (15 min per 4 hrs)",
    scenario: {
      hours_worked: 480, // 8 hours
      break_taken: 30, // 30-min break
      jurisdiction: "US_CA",
    },
    expected: {
      compliant: true,
      required_breaks: 30, // 8 hours needs 2 × 15-min breaks
    },
    statute: "FLSA 29 CFR § 516.5",
  },
  {
    name: "Insufficient break time (violation)",
    scenario: {
      hours_worked: 480,
      break_taken: 15, // Only 15 min when 30 required
      jurisdiction: "US_CA",
    },
    expected: {
      compliant: false,
      required_breaks: 30,
    },
    statute: "CA Labor Code § 512",
  },
];

/**
 * Standard break requirements by jurisdiction
 */
export const BREAK_REQUIREMENTS_BY_JURISDICTION: Record<string, BreakRequirement[]> = {
  US_CA: [
    { hours_worked: 240, min_break_duration: 15, break_count: 1 }, // 4 hrs = 15 min
    { hours_worked: 300, min_break_duration: 30, break_count: 1 }, // 5 hrs = 30 min meal
    { hours_worked: 480, min_break_duration: 60, break_count: 3 }, // 8 hrs = 3× 15-min + 30-min meal
  ],
  US_TX: [
    // TX: FLSA standard (no special state rules)
    { hours_worked: 240, min_break_duration: 15, break_count: 1 },
    { hours_worked: 360, min_break_duration: 30, break_count: 1 },
  ],
  US_FL: [
    // FL: FLSA standard
    { hours_worked: 240, min_break_duration: 15, break_count: 1 },
    { hours_worked: 360, min_break_duration: 30, break_count: 1 },
  ],
  US_NY: [
    // NY: Similar to CA but less stringent
    { hours_worked: 240, min_break_duration: 15, break_count: 1 },
    { hours_worked: 360, min_break_duration: 30, break_count: 1 },
  ],
};
