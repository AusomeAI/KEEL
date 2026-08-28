/**
 * Money type — enforces Law 4: No floating-point money
 *
 * All monetary values in KEEL are represented as:
 * - amount: integer (minor units, e.g., cents for USD)
 * - currency: ISO 4217 currency code
 * - scale: number of decimal places for the currency
 *
 * This ensures:
 * - Exact calculation to the last cent
 * - No rounding errors
 * - Auditability of every calculation
 *
 * Example: $123.45 USD is represented as:
 * { amount: 12345, currency: "USD", scale: 2 }
 */

import { z } from "zod";

export const MoneySchema = z.object({
  amount: z.number().int().describe("Amount in minor units (e.g., cents)"),
  currency: z
    .string()
    .length(3)
    .toUpperCase()
    .describe("ISO 4217 currency code (e.g., USD, GBP, EUR)"),
  scale: z
    .number()
    .int()
    .min(0)
    .max(8)
    .describe("Number of decimal places (e.g., 2 for USD)"),
});

export type Money = z.infer<typeof MoneySchema>;

/**
 * Create a Money value from a decimal string and currency
 *
 * Example: fromDecimal("123.45", "USD") => { amount: 12345, currency: "USD", scale: 2 }
 */
export function fromDecimal(decimalString: string, currency: string, scale: number): Money {
  const parts = decimalString.split(".");
  const integerPart = parts[0] || "0";
  const fractionalPart = (parts[1] || "").padEnd(scale, "0").slice(0, scale);

  const amount = parseInt(`${integerPart}${fractionalPart}`, 10);

  return {
    amount,
    currency: currency.toUpperCase(),
    scale,
  };
}

/**
 * Convert Money back to a decimal string
 *
 * Example: toDecimal({ amount: 12345, currency: "USD", scale: 2 }) => "123.45"
 */
export function toDecimal(money: Money): string {
  const str = Math.abs(money.amount).toString().padStart(money.scale + 1, "0");
  const intPart = str.slice(0, -money.scale) || "0";
  const fracPart = str.slice(-money.scale);
  const sign = money.amount < 0 ? "-" : "";

  if (money.scale === 0) {
    return `${sign}${intPart}`;
  }

  return `${sign}${intPart}.${fracPart}`;
}

/**
 * Add two Money values (must be same currency)
 */
export function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot add ${a.currency} and ${b.currency}: currency mismatch`
    );
  }
  if (a.scale !== b.scale) {
    throw new Error(
      `Cannot add amounts with different scales: ${a.scale} vs ${b.scale}`
    );
  }

  return {
    amount: a.amount + b.amount,
    currency: a.currency,
    scale: a.scale,
  };
}

/**
 * Multiply a Money value by a scalar
 */
export function multiply(money: Money, scalar: number): Money {
  if (!Number.isInteger(scalar) && Math.abs(scalar) >= 1) {
    throw new Error("Scalar multiplication of Money must be exact to the scale");
  }

  return {
    amount: Math.round(money.amount * scalar),
    currency: money.currency,
    scale: money.scale,
  };
}
