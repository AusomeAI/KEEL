/**
 * Duration type — enforces Law 4: No floating-point time
 *
 * All durations in KEEL are represented in integer minutes.
 * This ensures exact calculation of time-based entitlements (leave accrual, overtime).
 *
 * Example: 8 hours and 30 minutes = 510 minutes
 */

import { z } from "zod";

export const DurationSchema = z
  .number()
  .int()
  .min(0)
  .describe("Duration in minutes (integer, non-negative)");

export type Duration = z.infer<typeof DurationSchema>;

/**
 * Convert hours and minutes to Duration (in minutes)
 */
export function fromHoursMinutes(hours: number, minutes: number): Duration {
  return hours * 60 + minutes;
}

/**
 * Convert Duration to hours and minutes
 */
export function toHoursMinutes(duration: Duration): [hours: number, minutes: number] {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return [hours, minutes];
}

/**
 * Convert Duration to ISO 8601 format (e.g., "PT8H30M" for 510 minutes)
 */
export function toISO8601(duration: Duration): string {
  const [hours, minutes] = toHoursMinutes(duration);
  return `PT${hours}H${minutes}M`;
}

/**
 * Add two durations
 */
export function add(a: Duration, b: Duration): Duration {
  return a + b;
}

/**
 * Multiply a duration by a scalar
 */
export function multiply(duration: Duration, scalar: number): Duration {
  return Math.round(duration * scalar);
}
