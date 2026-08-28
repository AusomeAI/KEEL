# ADR 0002: Policy-as-Code with Compiler — Not LLM-Interpreted

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Payroll Engineering  
**Relates to:** [Vision & Architecture § 3.2](../../02-Vision-Architecture-and-Strategy.md#policy-as-code), Law 1 (No model in core), Law 6 (No policy without golden dataset)

## Context

HR policy — leave accrual, overtime rules, shift differentials, tax withholding, benefit eligibility, statutory contributions, probation rules — must be:

1. **Exact** — payroll must be correct to the cent, every time
2. **Auditable** — we must be able to show *which rule* produced *which figure*
3. **Versioned** — policies change; we must know which version was in force on a historical date
4. **Testable** — every policy must be validated against golden datasets before deployment

The temptation is strong to let LLMs interpret policy or generate payroll calculations. This is disqualifying for two reasons:

1. **Nondeterminism** — LLMs can hallucinate or vary their output; identical inputs may produce different payroll figures across runs
2. **Unauditability** — there is no clear chain from input policy to output figure; a regulator cannot verify correctness

## Decision

HR policy is expressed in a **versioned, typed, declarative DSL** that is compiled to an executable rule graph. 

**Boundary:** LLMs may *author* candidate policies, *explain* policies, or *simulate* policy changes. They never *execute* policies. Between the model and the money there is always:

1. A **compiler** that validates the policy syntax and semantics
2. A **test suite** with golden datasets (input population, expected outputs to the cent, statutory citations)
3. A **human sign-off** before the policy is activated
4. A **deterministic engine** (Rust/WASM) that executes the compiled policy

Every policy artifact is:
- **Versioned** — effective-dated, immutable, with full supersession lineage
- **Tested** — golden datasets per jurisdiction; no policy ships without passing
- **Signed** — cryptographically attributable to an author and approver
- **Explainable** — every calculated figure traces to the specific rule and version that produced it
- **Simulatable** — dry-run against live population before activation

## Consequences

### Positive

- **Byte-identical payroll** — given identical employee and time data, payroll is bit-identical across runs, enabling parallel-run verification
- **Auditability to the rule** — every pay figure traces to a specific rule version and policy version
- **Deterministic agent autonomy** — agents can simulate policy application without risk of hallucination
- **Regulatory evidence** — tax authorities can verify correctness by reviewing the compiled policy and the executed rule
- **Version control** — all policies are versioned and stored in git; changes are reviewable PRs
- **Golden dataset inheritance** — test suites compound with each policy change

### Negative

- **DSL development cost** — building a policy language is non-trivial (estimated 2–3 months of specialized engineering)
- **Policy author ramp-up** — domain experts (payroll specialists, tax practitioners) must learn the DSL syntax
- **Less flexibility** — policies that don't fit the DSL must be handled as special cases (mitigated by a good DSL design)
- **Simulation latency** — policy simulation for "what-if" analysis is slower than LLM-based estimation (mitigated by caching)

## Alternatives Considered

### Alternative A: LLM interprets policies dynamically

**Why not:** LLMs are nondeterministic. Two identical payroll runs could produce different results if the LLM is in a different "mood" or if the model is updated. This is disqualifying for payroll. Also, regulators cannot audit "the model interpreted the policy as..." — there is no artifact to review.

### Alternative B: LLM generates code from policy, which is then reviewed

**Why not:** Code generation from natural language is still nondeterministic (the same policy description may generate different code on different runs). Also, human review of generated code is error-prone for complex tax and statutory rules. Better to use a compiler.

### Alternative C: No versioning; policies are mutable

**Why not:** Retroactive payroll corrections require knowing which policy version was active on the calculation date. Mutable policies make this impossible. Also violates audit requirements (you cannot prove what the rule was at a given historical date).

## Implementation Notes

### Phase 1 (Wave 1)
- Build the DSL grammar (Zod-based, TypeScript)
- Implement the compiler (parses DSL → type-safe rule graph)
- Create the interpreter (executes rule graph deterministically)
- Build the golden-dataset harness (validates policies against test data)

### Phase 2 (Wave 2+)
- Add policy simulation engine for "what-if" analysis
- Build policy diff engine (show changes between versions)
- Create policy advisor agent (drafts policies from natural language, marks as "draft" until human review)

## Related ADRs

- ADR 0001: Bitemporal ledger (enables policy versioning and retroactive correctness)
- ADR 0003: Deterministic calculation kernel in Rust/WASM
- ADR 0007: Agent autonomy ceilings (agents cannot modify policies)

## References

- [XACML: Extensible Access Control Markup Language](https://en.wikipedia.org/wiki/XACML) — inspiration for policy expression
- [Nix language](https://nixos.org/manual/nix/stable/language/) — example of a DSL that prioritizes determinism
- [Temporal Flux Capacitor pattern](https://martinfowler.com/articles/temporal-patterns.html) — Martin Fowler on temporal logic in code
