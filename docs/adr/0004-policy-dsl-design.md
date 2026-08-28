# ADR 0004: Policy DSL Design — Declarative, Typed, Compiled

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** Squad 1 Lead, Payroll Engineering  
**Relates to:** ADR 0002 (Policy-as-Code), Law 6 (Golden datasets), CLAUDE.md § Development Workflow

## Context

HR policies — leave accrual, overtime rules, tax withholding, benefit eligibility — are complex, jurisdiction-specific, and subject to legal constraints. The policy DSL must:

1. **Be declarative** — authors express *what* rules apply, not *how* to compute them
2. **Be type-safe** — policies are validated at compile time; no runtime type errors
3. **Be versioned** — effective dates, immutable, supersession lineage
4. **Be testable** — golden datasets validate 100% rule coverage
5. **Be auditable** — every pay figure traces to a specific rule and policy version
6. **Support jurisdiction packs** — policies are authored once, reused across tenants

## Decision

The Policy DSL uses **Zod-based schemas** compiled to a **typed rule graph**.

### Architecture

**Phase 1: DSL Authorship**
Authors write policies in TypeScript using Zod schemas. Policies are declarative, strongly typed, and immutable at definition time.

```typescript
const overtimePolicy = createPolicy('overtime/us-flsa', {
  version: '2026-Q1',
  effectiveFrom: new Date('2026-01-01'),
  jurisdiction: 'US-FLSA',
  rules: [
    defineRule('weeklyOvertimeThreshold', {
      description: 'Hours worked beyond 40/week trigger OT rate',
      condition: (employee, period) => period.hoursWorked > 40,
      effect: (amount) => amount * 1.5,
      citations: ['29 CFR 516.1'],
    }),
  ],
});
```

**Phase 2: Compilation**
The compiler parses the policy definition and generates:
1. A **rule graph** (directed acyclic graph of rule dependencies)
2. **TypeScript types** for input and output
3. **Test validators** (golden dataset checker)

**Phase 3: Execution**
The compiled policy is serialized and passed to the Rust/WASM kernel for deterministic execution.

### DSL Grammar (Zod Schemas)

#### Policy Artifact
```
Policy
  ├── metadata: PolicyMetadata
  │   ├── id: string (e.g., "overtime/us-flsa")
  │   ├── version: string (e.g., "2026-Q1")
  │   ├── effectiveFrom: ISO8601 date
  │   ├── supersedes: PolicyId[] (lineage)
  │   ├── jurisdiction: string
  │   └── author: { id, name, timestamp }
  │
  ├── rules: Rule[]
  │   ├── id: string
  │   ├── description: string
  │   ├── applicability: Condition (who/when)
  │   ├── calculation: Calculation (what amount)
  │   ├── citations: string[] (statutory references)
  │   └── examples: TestCase[] (for documentation)
  │
  └── signature: PolicySignature
      ├── author: CryptoSignature
      ├── approver: CryptoSignature
      └── timestamp: ISO8601
```

#### Core Types

**Condition** — predicate applied to employee/period state
```
Condition
  ├── type: 'all' | 'any' | 'none' (boolean logic)
  ├── predicates: Predicate[]
  │   ├── field: string (path, e.g., "employee.status", "period.hoursWorked")
  │   ├── operator: '==', '!=', '>', '<', '>=', '<=', 'in', 'contains'
  │   └── value: Literal | Reference
  └── nested: Condition[] (for complex logic)
```

**Calculation** — computes a monetary or temporal amount
```
Calculation
  ├── type: 'literal' | 'multiply' | 'add' | 'lookup' | 'piecewise'
  ├── inputs: Reference[] (which fields to use)
  ├── formula: Formula (for 'multiply', 'add', etc.)
  └── rounding: 'half-up' | 'truncate' | 'ceil' | 'floor'
```

**Reference** — identifies a field or previous calculation
```
Reference
  ├── scope: 'employee' | 'period' | 'rule' | 'constant'
  ├── path: string (e.g., "hourlyRate", "hoursWorked", "previousRuleId.result")
  └── type: 'money' | 'duration' | 'number' | 'boolean'
```

### Compiler Pipeline

```
DSL Schemas (.ts)
  ↓ Parse & Validate
Rule Definitions (strongly typed)
  ↓ Build Dependency Graph
Rule Graph (DAG)
  ↓ Generate Serializable Format
Compiled Policy Artifact (.json)
  ↓ Sign & Version
Deployed Policy (immutable, signed)
  ↓ Execute in Rust/WASM
Deterministic Calculation (byte-identical)
```

### Golden Dataset Harness

Every policy ships with a golden test file: `policies/{id}/{version}.golden.json`

```json
{
  "policyId": "overtime/us-flsa",
  "policyVersion": "2026-Q1",
  "testCases": [
    {
      "description": "Employee works 45 hours; first 40 are regular, last 5 are OT",
      "employee": {
        "id": "EMP001",
        "status": "active",
        "hourlyRate": { "amount": 2000, "currency": "USD", "scale": 2 }
      },
      "period": {
        "hoursWorked": 4500,
        "startDate": "2026-01-01",
        "endDate": "2026-01-07"
      },
      "expectedOutputs": {
        "regularPay": { "amount": 80000, "currency": "USD", "scale": 2 },
        "overtimePay": { "amount": 15000, "currency": "USD", "scale": 2 }
      },
      "appliedRules": [
        {
          "ruleId": "weeklyOvertimeThreshold",
          "citation": "29 CFR 516.1",
          "calculation": "hoursWorked > 40 ? (hoursWorked - 40) * rate * 1.5 : 0"
        }
      ]
    }
  ]
}
```

### Benefits

- **Type safety** — Zod schemas prevent invalid policy definitions at compile time
- **Auditability** — policies are version-controlled, signed, and fully serializable
- **Testability** — golden datasets are declarative; no need for procedural test code
- **Determinism** — compiled policies are executed as pure functions
- **Versioning** — policies carry effective dates and supersession lineage
- **Reusability** — jurisdiction packs are authored once, deployed to many tenants

### Constraints & Limitations

- **No dynamic logic** — policies cannot make network calls or depend on external state
- **No arbitrary functions** — only pre-approved calculation types (multiply, add, lookup, piecewise)
- **Jurisdiction-specific** — rules must be authored per jurisdiction; no single "global" rule
- **Compile-time finality** — policies are immutable once compiled; no hot patches

## Consequences

### Positive

- **Complete auditability** — every calculated figure traces to a rule version and statutory citation
- **Safe policy changes** — policies are tested before deployment; golden datasets catch breaking changes
- **Reproducibility** — given the same policy version and employee data, output is always identical
- **No hallucination risk** — policies are deterministic by construction; no LLM variance

### Negative

- **DSL learning curve** — policy authors (payroll specialists, tax practitioners) must learn Zod + DSL conventions
- **Slower initial authorship** — writing policies in code is slower than natural language, but more precise
- **Limited flexibility** — policies that don't fit the DSL framework require special handling (mitigated by good DSL design)

## Alternatives Considered

### Alternative A: YAML-based DSL

**Why not:** YAML lacks type safety. A typo in a policy definition would not be caught until runtime. Also, YAML is harder to extend with functions and validation logic.

### Alternative B: Direct Rust code

**Why not:** Rust code is more performant but requires deep Rust expertise from policy authors. TypeScript + Zod is more accessible to payroll domain experts.

### Alternative C: LLM-generated policies from natural language

**Why not:** LLMs are nondeterministic. The same policy description may generate different compiled policies on different runs. This violates auditability and determinism requirements.

## Implementation Plan

### Wave 1 (Months 0–5)

1. **Phase 1a (Weeks 1–3):** Define Zod schemas for DSL grammar
2. **Phase 1b (Weeks 2–4):** Build compiler (DSL → rule graph)
3. **Phase 1c (Weeks 3–5):** Golden dataset harness + validators
4. **Phase 2a (Weeks 4–6):** Rust/WASM kernel skeleton (input/output types)
5. **Phase 2b (Weeks 5–8):** Implement first policy (US FLSA overtime)
6. **Phase 2c (Weeks 6–10):** Build policy versioning + signing + deployment

### Test Coverage

- **Unit tests** — DSL schema validation, compiler correctness
- **Integration tests** — compile → execute → verify golden dataset matches
- **L3 tests** — policies execute identically on every run (bitwise comparison)

## Related ADRs

- ADR 0002: Policy-as-Code (why policies are compiled, not LLM-interpreted)
- ADR 0001: Bitemporal ledger (enables policy versioning and retroactive correctness)

## References

- Zod: https://zod.dev/ (runtime TypeScript schema validation)
- XACML: https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html (policy expression language)
- SQL Alchemy Type System: https://docs.sqlalchemy.org/en/14/core/types.html (inspiration for type hierarchies)
