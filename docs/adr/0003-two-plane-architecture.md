# ADR 0003: Two-Plane Architecture — Deterministic Core + Agent Plane Separated

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Founder, CEO  
**Relates to:** [Vision & Architecture § 3](../../02-Vision-Architecture-and-Strategy.md#architecture-the-two-plane-model), Unified Build Brief § 1–2

## Context

The agentic AI market is at an inflection point. Over 40% of enterprise agentic projects are being cancelled by end-2027 for cost, unclear value, and inadequate risk controls. The failures are governance failures, not capability failures.

In HR specifically, agents touch pay, promotion, discipline, and termination. The consequences of agent error are legal filings, discrimination claims, and works council disputes. The market is asking: *what happens when the AI is wrong?*

Every incumbent vendor has bolted agents onto systems that were never designed to be replayable, auditable, or safely automated. The agents are new; the substrate is not. This creates a fundamental asymmetry: if you want to turn off an agent, the system degrades from "agent-assisted" to "manual" — but manual operation still depends on the AI's abstraction layer.

## Decision

KEEL separates the system into two distinct planes with a hard architectural boundary:

### 1. The Deterministic Plane (the Keel)
A complete, bitemporal, policy-compiled HRIS covering 203 modules across 16 domains. It computes payroll to the cent, enforces every statutory rule, runs every workflow, and produces every statutory filing. **Contains zero AI.** Can be deployed and operated independently. Passes all tests with agents completely deleted and model endpoints blackholed.

### 2. The Agent Plane
A governed, budgeted, revocable layer of specialist agents that *propose* work into the deterministic plane through the Control Gate. Agents never touch the ledger, never compute calculations, never write policy. Every agent action is a *TransactionIntent* — a typed, schema-validated proposal that the Control Gate validates, simulates, routes for human approval if needed, and executes as an ordinary deterministic transaction.

### The Control Gate (the boundary)
The single write path into the deterministic plane. Humans and agents both use it. It authorises, validates, simulates, routes for approval, executes, and emits Decision Records. The design test: if the Agent Plane did not exist, would the Control Gate still be the correct API for the manual UI? If the answer is no, you have built an AI safety wrapper instead of a transaction boundary.

## Consequences

### Positive

- **The AI is optional.** If LLM endpoints are down, the model is deprecated, the customer disables agents, or legal counsel orders agents disabled pending investigation, the deterministic plane continues operating without loss of capability.
- **Safe autonomy.** Agents can be granted autonomy within guardrails because any error is a reversible transaction, not a corrupted state.
- **Regulatory defensibility.** The system can prove that critical decisions were made deterministically, with human oversight, and are fully auditable.
- **Continuity SLA.** We can publish contractual availability commitments at each Continuity Level, with L3 (deterministic-only) carrying the highest commitment.
- **Moat.** Incumbents retrofitting agents onto batch-era cores cannot follow without replacing their persistence layer. This is a 5-year lead, not a feature lead.
- **Agent simplicity.** Agents are relieved of the burden of correctness; they focus on reasoning, drafting, and explaining.

### Negative

- **Doubled development.** Building a complete HRIS *plus* an agent plane takes longer than building a single monolith.
- **Coordination overhead.** Squads must respect the Control Gate boundary; changes to the deterministic plane must go through Squad 0.
- **Agent adoption.** Some customers may view agents as an afterthought if they can operate without them.
- **Marketing complexity.** "The AI is optional" is not the pitch every CEO wants to lead with (although it becomes a compelling purchase reason after incidents in competing platforms).

## Alternatives Considered

### Alternative A: Single plane with agent-first architecture

**Why not:** This is the incumbent playbook. Agents are the primary interface; the manual UI is a secondary "fallback" that atrophies over time. When agents fail, the system is degraded, not just slower. No vendor publishing this can credibly sign a "full operation without AI" SLA.

### Alternative B: Agents deeply integrated throughout the core

**Why not:** Agents become deeply coupled to the ledger, policies, and calculations. "Turning off" agents becomes a massive refactor. Agents can inadvertently corrupt state by direct writes. Testing in L3 mode (agents disabled) becomes complex.

### Alternative C: Agent layer with sync/adapter to legacy core

**Why not:** This is also the incumbent approach. The adapter layer becomes a maze of special cases. The legacy core was never designed for auditability or replayability, so even with agents disabled, you're still working with an untrustworthy substrate.

## Implementation Strategy

### Phase 1: Build the deterministic plane
Months 0–18 (Horizon 1, Waves 1–4). Manual UI ships before any agent capability. Law 2 enforces this.

### Phase 2: Agent plane and Control Gate
Overlaps with Phase 1 (Months 12–36). The Control Gate is built in Wave 1 so that every module can use it. Agent capabilities are added only after manual paths are complete.

### Phase 3: Continuity Ladder
Months 12–60. L0/L1/L2 agent autonomy levels are introduced after the deterministic core has been battle-hardened with customers.

## Related ADRs

- ADR 0001: Bitemporal ledger (enables deterministic replayability)
- ADR 0002: Policy-as-code (policies execute deterministically, not via LLM)
- ADR 0004: Control Gate as the single write boundary
- ADR 0005: L3 testing is continuous, not asserted

## Success Metrics

1. **Design-partner customer runs 3 error-free payroll cycles with zero AI in the loop.** (Horizon 1)
2. **Customer voluntarily runs a full month at L3 and reports no capability loss.** (Horizon 2)
3. **Independent auditor attests L3 operation is complete and L4 procedures work.** (Horizon 2)

No competitor can claim any of the three today.
