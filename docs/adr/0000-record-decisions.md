# ADR 0000: Architecture Decision Records

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** Engineering Team  
**Relates to:** [Unified Build Brief](../../05-Unified-Build-Brief-for-Agent-Teams.md) Section 7

## Context

KEEL is a deterministic-first HR Operating System with strict architectural constraints and a long build horizon (Horizon 1: 18 months to first customer production payroll). We need a durable record of architectural and significant implementation decisions so that:

1. Future engineers understand *why* a constraint exists, not just that it exists
2. Decisions are defensible against deadline pressure ("we decided this for *reason X*")
3. Trade-offs are explicit and can be revisited with full context

## Decision

Every engineering decision that a future engineer would question — especially decisions made quickly or under time pressure — must be recorded as an Architecture Decision Record (ADR) in this directory.

An ADR must include:

- **Context** — the problem space and constraints
- **Decision** — what we decided and why
- **Consequences** — what this enables and what it costs
- **Alternatives considered** — why we didn't choose X or Y
- **Related ADRs** — cross-references to related decisions

## Consequences

### Positive

- Architectural reasoning survives engineer turnover
- New engineers can rapidly understand the *intent* of constraints
- Trade-offs are explicit and can be revisited with evidence
- Decisions become case law for similar decisions

### Negative

- ADR review adds a small overhead to significant decisions
- ADRs must be kept in sync if decisions change (forces intentional updates)

## Naming Convention

```
NNNN-slug-of-decision.md

where NNNN is a zero-padded sequence number starting from 0001
```

Examples:
- `0001-bitemporal-ledger-over-snapshot.md`
- `0002-rust-wasm-calculation-kernel.md`
- `0003-policy-dsl-compiler-not-llm.md`

## When to File an ADR

File an ADR when:

- You are making an architectural choice (e.g., "bitemporal ledger" vs. "snapshot with audit table")
- You are deciding to *not* do something that would be the obvious default (e.g., "we will not use floating-point for money")
- You are explaining why a Law exists or what it enables
- You are making a significant technology choice (e.g., "Rust for the calc kernel, not Python")
- You are choosing a constraint that affects multiple squads

Do *not* file an ADR for:

- Bug fixes
- Refactorings
- Performance optimizations that don't change architecture
- Library or dependency upgrades
- Local implementation details that don't affect other squads

## Templates

Use this template for new ADRs:

```markdown
# ADR NNNN: [Short title in present tense: "Bitemporal ledger over snapshot audit table"]

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Superseded by ADR NNNN  
**Deciders:** [Who made the decision or consensus]  
**Relates to:** [Strategic document section, law, module, or other ADR]

## Context

[What problem are we solving? What are the constraints? What are the requirements?]

## Decision

[What did we decide? Use imperative present tense: "We will use X because..."]

## Consequences

### Positive

- [What does this enable?]
- [What becomes simpler or more robust?]

### Negative

- [What does this cost?]
- [What becomes harder?]

## Alternatives Considered

- **Alternative A:** [Why not? Trade-offs?]
- **Alternative B:** [Why not? Trade-offs?]

## Related ADRs

- ADR 0001: [Related title]
- ADR 0003: [Related title]
```

## References

- [Joël Spolsky on ADRs](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/)
- [Michael Nygard's ADR template](https://github.com/adr/madr)
- [AWS Well-Architected Framework on decisions](https://docs.aws.amazon.com/wellarchitected/latest/userguide/workload-review.html)
