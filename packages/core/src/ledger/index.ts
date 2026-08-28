/**
 * Ledger Event Model
 *
 * Implements Law 3: The ledger is append-only. No UPDATE or DELETE on event tables.
 *
 * This module defines the bitemporal event model used throughout the ledger.
 * Events are immutable; corrections are compensating events.
 *
 * Wave 1 deliverable: Event type definitions and schemas
 * Wave 2+: Ledger store implementation in services/ledger
 */

export * from "../types/event";
export * from "../types/decision-record";

/**
 * Stub for ledger implementation (Wave 1+)
 */
export interface EventStore {
  // To be implemented in services/ledger
}
