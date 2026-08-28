# ADR 0001: Bitemporal Ledger Over Snapshot-with-Audit Model

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Architecture Review  
**Relates to:** [Vision & Architecture § 3.1](../../02-Vision-Architecture-and-Strategy.md#bitemporal-employment-ledger), Law 3 (Ledger is append-only), Law 7 (Decision Records)

## Context

HR systems must answer questions that most transactional systems never face:

- *"What was this employee's pay rate on 14 March, and what did we believe it was when we ran the March payroll?"*
- *"Recompute Q1 payroll under the policy version in force at the time, then under the corrected version, and show me the delta."*
- *"Show every state this employee record passed through, who changed it, and under what authority."*

These questions require tracking two time dimensions:
1. **Valid time** — when a fact was true in the world (effective date of a promotion)
2. **Transaction time** — when the system came to believe it (when HR entered it)

Traditional HRIS systems model only valid time, with a separate audit table tracking who changed what. This creates two problems:

1. **Audit drift** — the audit table can fall out of sync with the primary table, leaving regulatory questions unanswerable
2. **Retroactive reconstruction** — recomputing payroll on a historical date requires knowing which policy version was in force at that time, which isn't easily derivable from a snapshot-based model

## Decision

KEEL uses a **bitemporal event store** with append-only events. Every fact carries both valid and transaction time. Nothing is updated in place. Corrections are **compensating events** (events that undo previous events).

This means:
- The ledger is immutable by design (PostgreSQL role-level UPDATE/DELETE revocation)
- Every state transition is discoverable via event replay
- Retroactive payroll is *derived* (recalculate under the superseded policy), not *patched*
- Complete audit trail is an automatic byproduct of the data model, not a separate reporting system

## Consequences

### Positive

- **Payroll correctness verification** — we can recompute any historical period under any policy version and prove the delta to the cent
- **Auditability without separate audit tables** — audit is built into the ledger, eliminating sync bugs
- **Agent reversibility** — any agent action can be replayed or undone via compensating events, making autonomy safer
- **Regulatory evidence** — tax audits, wage claims, works council disputes can be answered with byte-identical reconstructions
- **Point-in-time reporting** — org charts, headcount, compensation snapshots as-of any date
- **Policy change impact analysis** — simulate what retroactive policy changes would have cost

### Negative

- **Query complexity** — "current state" queries must filter by transaction time, adding a WHERE clause to most reads
- **Projection maintenance** — we need to maintain materialized views (projections) of the current state for performance, and these must be kept in sync with the event log
- **Event versioning** — if event schemas evolve, we need migration paths that don't break history
- **Storage** — events take more disk space than snapshots (mitigated by partitioning and compression)
- **Developer learning curve** — event sourcing is not the default mental model for most engineers

## Alternatives Considered

### Alternative A: Snapshot-based with separate audit table

**Why not:** Audit tables drift out of sync with snapshots. Questions like "what was the correct payroll on date X under policy version Y" become impossible to answer definitively. Tax audits require reconstructing state; without bitemporal tracking, we can only say "the record now says X" rather than "the record said Y on this date."

### Alternative B: Time-versioned rows (start_date/end_date columns)

**Why not:** Time-versioning is a halfway house that lacks transaction time. We'd still struggle to answer "what did we calculate payroll as under the policy in force on March 14?" without separate audit machinery. Also creates complex update logic (close the old row, open a new one) that is error-prone.

## Related ADRs

- ADR 0002: Policy-as-code compilation (policies must be versioned to be replay-able)
- ADR 0003: Deterministic calculation kernel (pure functions + immutable events = reproducibility)

## Compliance and Regulatory

This model satisfies:
- EU AI Act Article 50 (clear explanation of inputs and logic)
- GDPR Article 22 (right to explanation of automated decision)
- Works council consultation requirements (transparency on system behaviour)
- Wage-and-hour audits (prove what was calculated and why)
