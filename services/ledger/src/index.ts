/**
 * @keel/ledger — KEEL Bitemporal Event Store
 *
 * Wave 1: Event store service exposing the ledger through a Fastify API.
 * Implements:
 * - Append-only event log (PostgreSQL)
 * - Bitemporal event model (valid time + transaction time)
 * - Row-level security for tenant isolation
 * - Projections for current state queries
 * - Idempotency via request_id deduplication
 *
 * Law 1: The deterministic plane core must contain no AI.
 * Law 3: The ledger is append-only. No UPDATE or DELETE on event tables.
 * Law 5: Tenant isolation is enforced by PostgreSQL RLS.
 */

export interface LedgerConfig {
  postgresUrl: string;
  port: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function createLedgerServer(config: LedgerConfig) {
  // To be implemented in Wave 1
  return {
    start: async () => {
      console.log("Ledger server starting...");
    },
  };
}
