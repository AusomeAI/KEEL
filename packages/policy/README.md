# @keel/policy — Policy DSL & Compiler

Policy-as-Code infrastructure for KEEL. Policies are authored in a declarative DSL, compiled to typed rule graphs, and executed deterministically by the Rust/WASM kernel.

**No LLM execution.** Policies are never interpreted by an AI system. They are compiled to deterministic rule graphs and executed by pure functions.

## Architecture

### Three-Layer Model

1. **DSL Layer** — Engineers author policies in TypeScript using Zod schemas
2. **Compiler Layer** — TypeScript compiler converts DSL → rule graph + metadata
3. **Execution Layer** — Rust/WASM kernel executes compiled policies (see `packages/calc`)

### Key Files

- `src/schemas/` — Zod schema definitions for all policy artifacts
  - `common.ts` — Money, Duration, Jurisdiction, etc.
  - `conditions.ts` — Boolean logic for rule applicability
  - `calculations.ts` — Arithmetic operations (multiply, add, divide, lookup, etc.)
  - `rules.ts` — Rule structure and organization
  - `policy.ts` — Top-level policy artifacts
  - `golden.ts` — Test dataset schemas

- `src/builder.ts` — Fluent API for authoring policies

- `src/policies/` — Reference policy implementations
  - `overtime-us-flsa.ts` — Fair Labor Standards Act overtime (Wave 1 example)

- `src/golden/` — Golden dataset harness for testing
  - `harness.ts` — Validator that ensures 100% rule coverage
  - `overtime-us-flsa.golden.ts` — Example test data

## Usage

### Define a Policy

```typescript
import { definePolicy, defineRule } from '@keel/policy';

const policy = definePolicy('overtime/us-flsa', {
  version: '2026-Q1',
  jurisdiction: 'US-FLSA',
  author: { id: '...', name: 'Payroll Team', role: 'author' },
})
  .withDescription('US FLSA overtime: time-and-a-half for 40+ hours/week')
  .requireEmployeeFields('hourlyRate', 'status')
  .requirePeriodFields('hoursWorked')
  .produceFields(
    { name: 'overtimePay', type: 'money', description: 'Gross overtime pay' }
  )
  .build();
```

### Create Rules

```typescript
const rule = defineRule('weekly-ot')
  .withDescription('Hours beyond 40/week trigger 1.5x multiplier')
  .withEffect({
    type: 'apply',
    calculation: {
      type: 'multiply',
      operands: [
        { scope: 'employee', path: 'hourlyRate' },
        { scope: 'period', path: 'hoursWorked' },
        { scope: 'constant', path: 'OT_MULTIPLIER' },
      ],
      rounding: 'half-up',
    },
    output: 'overtimePay',
  })
  .withCitations('29 CFR 516.1')
  .withPrecedence(100)
  .build();
```

### Validate Against Golden Dataset

```typescript
import { GoldenDatasetValidator } from '@keel/policy/golden';
import { overtimeUsFlsaGoldenDataset } from '@keel/policy/golden/overtime-us-flsa.golden';

const validator = new GoldenDatasetValidator();
const report = validator.validatePolicy(compiledPolicy, overtimeUsFlsaGoldenDataset);

validator.assertFullCoverage(report); // Throws if coverage < 100%
console.log(`Policy validation: ${report.passedTests}/${report.totalTests} tests passed`);
```

## Law 6 — No Policy Without Golden Dataset

Every policy must include:
1. A golden dataset with at least one test case per rule
2. Coverage **exactly 100%** (no untested rules allowed)
3. Statutory citations for each rule
4. Example scenarios demonstrating the policy in action

**The compiler will reject any policy without 100% golden test coverage.**

## Design Principles

### Declarative, Not Imperative

```typescript
// ✓ Good: declarative rule
{ condition: { hoursWorked > 40 }, effect: multiply(rate, hours, 1.5) }

// ✗ Bad: imperative logic
if (hoursWorked > 40) { overtimePay = rate * hoursWorked * 1.5; }
```

### No Arbitrary Functions

Policies support only pre-approved calculation types:
- `literal` — fixed amount
- `multiply`, `add`, `subtract`, `divide` — arithmetic
- `piecewise` — if-then-else
- `lookup` — table lookup
- `min`, `max` — comparison

Custom functions or network calls are not supported. If you need them, escalate to define a new calculation type (with a proposal and review).

### Versioning & Lineage

Every policy has:
- An immutable version identifier (e.g., `2026-Q1`)
- An effective date (when it becomes active)
- An optional expiration date
- Supersession lineage (which prior policies it replaces)

This enables retroactive payroll recalculation: given a date, we can determine which policy version was active.

### Determinism

Given identical employee and period data, a policy **always** produces identical output, byte-for-byte, across:
- Multiple runs
- Different machines
- Different times of day
- Before and after updates to other policies

This is what enables parallel-run comparison and audit trails.

## Testing

```bash
# Type-check policy definitions
pnpm typecheck

# Lint and validate
pnpm lint

# Run unit tests
pnpm test

# Watch mode
pnpm test:watch
```

## Wave 1 Deliverables

- [x] Zod-based DSL grammar for all policy artifacts
- [x] Policy builder API for fluent policy authorship
- [x] Reference implementation: US FLSA overtime policy
- [x] Golden dataset harness with coverage validation
- [x] ADR 0004: DSL design decisions and trade-offs

## Wave 2+ Roadmap

- Policy simulation engine for "what-if" analysis
- Policy diff engine (show changes between versions)
- Policy advisor agent (drafts policies from natural language)
- Support for more jurisdiction packs (EU, AU, APAC)
- Performance optimizations for large payrolls

## See Also

- ADR 0002: Policy-as-Code (why policies are compiled, not LLM-interpreted)
- ADR 0004: Policy DSL Design (this package's architecture)
- Law 2: Manual paths ship before agent capabilities
- Law 6: No policy without golden dataset at 100% coverage

---

**No LLM is permitted to execute, generate, or modify policies in this package.** The boundary between human authorship and deterministic execution is inviolable. If you're tempted to relax this, re-read ADR 0002.
