# Wave 1: Policy & Calculation Implementation Plan

**Squad 1 — Policy & Calculation**  
**Status:** Foundation phase (Months 0–5)

This document outlines the complete build plan for Squad 1's Wave 1 deliverables. The goal is to establish a deterministic policy engine that computes payroll to the cent with 100% auditability.

---

## I. Foundation (Weeks 0–2)

### 1.1 Architecture & Design

**Completed:**
- [x] ADR 0002: Policy-as-Code with Compiler (why policies are compiled, not LLM-interpreted)
- [x] ADR 0003: Two-Plane Architecture (deterministic core + agent plane)
- [x] ADR 0004: Policy DSL Design (declarative, typed, compiled)

**Decisions locked in:**
- Policy DSL based on Zod schemas (type-safe)
- Compiler: DSL → rule graph (TypeScript)
- Execution: Rust/WASM kernel (pure functions, byte-identical outputs)
- Versioning: immutable artifacts, supersession lineage
- Testing: golden datasets with 100% rule coverage (Law 6)

### 1.2 Repository Structure

**Packages created:**
- `packages/policy/` — DSL, compiler, golden dataset harness
  - `src/schemas/` — Zod schema definitions (common, conditions, calculations, rules, policies, golden)
  - `src/builder.ts` — Fluent API for policy authorship
  - `src/policies/` — Reference implementations
  - `src/golden/` — Golden dataset validator
  - `README.md` — Complete usage guide

- `packages/calc/` — Deterministic calculation kernel
  - `src/types.ts` — Core types for execution
  - `src/executor.ts` — Policy executor (Wave 1: TypeScript reference)
  - Placeholder for Rust/WASM (Wave 2)

**Configuration files:**
- `tsconfig.json` for each package
- `package.json` with complete dependency declarations

---

## II. Policy DSL (Weeks 1–3)

### 2.1 Zod Schema Hierarchy

**Completed:**
```
Common Types (money, duration, jurisdiction, citations)
  ↓
Conditions (predicates, boolean logic, applicability)
  ↓
Calculations (multiply, add, lookup, piecewise, etc.)
  ↓
Rules (single if-then units)
  ↓
Policies (versioned collections of rules)
  ↓
Golden Datasets (test cases with 100% coverage)
```

**Schema files:**
- `common.ts` — Money, Duration, Jurisdiction, PolicyId, PolicyVersion, Actor, Signature
- `conditions.ts` — Predicate, Condition, BooleanOperator, ApplicabilityCondition
- `calculations.ts` — Reference, Literal, Multiply, Add, Subtract, Divide, Piecewise, Lookup, Min, Max
- `rules.ts` — Rule, RuleGroup, PolicyInputSpec, PolicyOutputSpec
- `policy.ts` — CompiledPolicy, PolicyDefinition, PolicyLineage
- `golden.ts` — GoldenTestCase, GoldenDataset, CoverageMetadata

**Key design principles:**
1. **Declarative** — authors specify *what*, not *how*
2. **Type-safe** — Zod validates at compile time
3. **Auditable** — every rule has statutory citations
4. **Testable** — schemas integrate with golden datasets
5. **Versioned** — policies carry effective dates and lineage

### 2.2 Builder API

**Completed:**
- `PolicyBuilder` — fluent interface for policy authorship
- `RuleBuilder` — fluent interface for rule definitions
- `definePolicy()` — entry point for creating policies
- `defineRule()` — entry point for creating rules

**Example:**
```typescript
const policy = definePolicy('overtime/us-flsa', {
  version: '2026-Q1',
  jurisdiction: 'US-FLSA',
  author: { id: '...', name: 'Payroll Team', role: 'author' },
})
  .withDescription('US FLSA overtime: time-and-a-half for 40+ hours/week')
  .requireEmployeeFields('hourlyRate', 'status')
  .requirePeriodFields('hoursWorked')
  .produceFields({ name: 'overtimePay', type: 'money', ... })
  .build();
```

---

## III. Reference Policy Implementation (Weeks 2–4)

### 3.1 US FLSA Overtime Policy

**Completed:**
- Policy definition: `src/policies/overtime-us-flsa.ts`
- 5 rules covering:
  1. Regular hours calculation (up to 40/week)
  2. Overtime hours calculation (beyond 40/week)
  3. Regular pay (hourly rate × regular hours)
  4. Overtime pay (hourly rate × OT hours × 1.5)
  5. Total gross pay (regular + overtime)

**Statutory citations:**
- 29 CFR 516.1 (Fair Labor Standards Act)

### 3.2 Golden Dataset

**Completed:**
- `src/golden/overtime-us-flsa.golden.ts`
- 4 test cases covering:
  1. No overtime (35 hours)
  2. Exact threshold (40 hours)
  3. Moderate overtime (45 hours)
  4. Heavy overtime (50 hours)
- Coverage: 100% (all 5 rules tested)
- Expected outputs verified to the cent

---

## IV. Golden Dataset Harness (Weeks 3–5)

### 4.1 Validator

**Completed:**
- `GoldenDatasetValidator` class
- `validatePolicy()` method — validates policy against golden dataset
- `assertFullCoverage()` method — fails if coverage < 100%
- Coverage calculation and uncovered rule detection

**Key features:**
- Validates schema correctness
- Calculates coverage: (tested rules) / (total rules)
- Identifies uncovered rules by name
- Fails build if coverage < 100% (Law 6)

### 4.2 Integration

In Wave 2, the validator will:
1. Load compiled policies from policy store
2. Execute policies via Rust/WASM kernel
3. Compare actual outputs to expected outputs
4. Verify rule applications match expected

For now (Wave 1), the validator checks schema correctness and coverage metrics.

---

## V. Calculation Kernel (Weeks 4–8)

### 5.1 TypeScript Reference Implementation

**Completed:**
- Core types: `PolicyExecutionRequest`, `PolicyExecutionResult`, `RuleApplication`
- Executor skeleton: `executePolicyAsync()`, `executePoliciesBatch()`
- Context management for rule evaluation
- Placeholder for calculation evaluation

**Wave 1 status:**
- Structure is in place
- Stubs are ready for implementation
- Tests can be written against interfaces

### 5.2 Rust/WASM Implementation (Planned for Weeks 5–8)

**Deliverables:**
- `src/rs/` — Rust source
- Fixed-point decimal arithmetic (for precise monetary calculations)
- Policy executor ported from TypeScript
- WASM build configuration
- Byte-identical output verification tests

**Build configuration:**
- `wasm-pack` for WASM compilation
- TypeScript bindings generated from Rust types
- Bundle both TS and WASM versions in dist/

---

## VI. Testing Infrastructure (Weeks 6–9)

### 6.1 Unit Tests

**Test files:**
- `packages/policy/src/**/*.test.ts` — schema validation, builder
- `packages/calc/src/**/*.test.ts` — executor logic

**Test categories:**
- Schema validation (Zod)
- Policy builder (fluent API)
- Golden dataset coverage (100% rule testing)
- Executor correctness (identical outputs)

### 6.2 Integration Tests

- Policy compilation → execution → verification
- Golden dataset validation against actual results
- Rust/WASM vs TypeScript output comparison

### 6.3 L3 Testing

- Full policy execution with Agent Plane disabled
- Bitwise output comparison across runs
- No external dependencies, no I/O

---

## VII. Documentation (Weeks 7–10)

### 7.1 Completed

- `packages/policy/README.md` — usage, design principles, examples
- `packages/calc/README.md` — architecture, execution model, limitations
- ADR 0004 — Policy DSL Design (rationale, alternatives, implementation)
- This plan document

### 7.2 To Come

- "How to author a policy" guide (Wave 2)
- "How to test a policy" guide (Wave 2)
- "How to deploy a policy" guide (Wave 2)
- Example policies for additional jurisdictions

---

## VIII. Deliverables Checklist

### Wave 1 Exit Criteria (Month 5)

- [x] ADRs filed (0002, 0003, 0004)
- [x] Policy DSL with Zod schemas (fully typed)
- [x] Builder API for policy authorship
- [x] Reference policy (US FLSA overtime)
- [x] Golden dataset structure and harness
- [x] Calculation kernel types defined
- [ ] Calculation kernel executor implemented (in progress)
- [ ] Rust/WASM kernel skeleton (planned Weeks 5–8)
- [ ] Full test suite (100% coverage of DSL and executor)
- [ ] CI enforcement (Laws 1, 4, 6)
- [ ] Documentation (README, guides, examples)

### Success Criterion

**An engineer can:**
1. Author a new policy in TypeScript using Zod schemas
2. Write 100% rule coverage golden dataset
3. Compile the policy (TypeScript → rule graph)
4. Execute the policy against employee/period data
5. Verify outputs match golden dataset to the cent
6. Deploy the policy with author + approver signatures
7. See a full audit trail of which rules applied and why

**Example: "How to author US FLSA overtime policy"**
```typescript
// 1. Define the policy
const policy = definePolicy('overtime/us-flsa', {...})
  .addRule(defineRule('weekly-ot').withEffect({...}).build())
  .build();

// 2. Create golden dataset
const golden = {
  policyId: 'overtime/us-flsa',
  testCases: [
    { input: {...}, expectedOutput: {...}, appliedRules: [...] },
    // ... more test cases ...
  ],
  coverage: { totalRules: 1, testedRules: ['weekly-ot'], coverage: 1.0 }
};

// 3. Compile and validate
const compiled = compilePolicy(policy);
const validator = new GoldenDatasetValidator();
const report = validator.validatePolicy(compiled, golden);
validator.assertFullCoverage(report); // Throws if coverage < 100%

// 4. Execute
const result = await executePolicyAsync({
  policyId: 'overtime/us-flsa',
  policyVersion: '2026-Q1',
  employee: { hourlyRate: usd(2500), ... },
  period: { hoursWorked: 4500, ... },
});
console.log(result.outputs); // { overtimePay: Money, ... }
```

---

## IX. Architectural Boundaries (Do Not Cross)

### Law 1: No LLM in Core

No imports of model SDKs, HTTP clients to model providers, or agent libraries in:
- `packages/policy/**`
- `packages/calc/**`
- `packages/core/**` (when Squad 0 builds it)
- `services/ledger/**` (when Squad 0 builds it)

**Enforced by:** CI dependency-cruiser rule

### Law 4: No Floating-Point Money or Time

All monetary values use `Money` type (integer minor units + currency + scale).  
All durations use `Duration` type (integer minutes).

**Enforced by:** Zod schemas + lint rules

### Law 6: No Policy Without Golden Dataset

Every policy must have a golden dataset with 100% rule coverage. Coverage < 100% blocks merge.

**Enforced by:** CI validator (`GoldenDatasetValidator`)

### Law 8: L3 Testing

The full test suite must pass identically with:
- Agent Plane scaled to zero
- All model endpoints blackholed at the network level

Policy execution must work with zero LLM involvement.

---

## X. Timeline & Milestones

| Week | Squad 1 Deliverable | Status |
|------|---------------------|--------|
| 0–2 | ADRs, DSL design, repo structure | ✅ Done |
| 1–3 | Zod schemas (common, conditions, calculations, rules, policies, golden) | ✅ Done |
| 2–4 | Builder API, reference policy (US FLSA), golden dataset | ✅ Done |
| 3–5 | Golden dataset harness, validator | ✅ Done |
| 4–8 | Calculation kernel (TypeScript reference + Rust/WASM) | 🚧 In Progress |
| 6–9 | Test suite (unit + integration + L3) | ⏳ Planned |
| 7–10 | Documentation, guides, examples | ⏳ Planned |

---

## XI. Known Unknowns & Risks

### Risks

1. **Rust/WASM implementation latency** — WASM compilation and debugging can be slower than expected. Mitigation: Start early, use TS reference for testing first.

2. **Fixed-point decimal arithmetic** — Rust requires careful handling to match TS exactly. Mitigation: Property-based testing (QuickCheck), fuzz testing.

3. **Policy store integration (Wave 2)** — Loading compiled policies requires the ledger service to be ready. Mitigation: Stub the store in Wave 1, integrate in Wave 2.

4. **Complexity of retroactive payroll** — Policy versioning and historical lookups add complexity. Mitigation: Golden datasets include retroactive scenarios.

### Unknowns

- Exact latency requirements for policy execution (Weeks 8+)
- WASM bundle size and browser compatibility (Weeks 7+)
- Performance of batch execution at scale (1000+ employees/run)

---

## XII. Success Metrics (Horizon 1)

**By end of Horizon 1 (Month 18):**

1. ✅ **A design-partner customer runs three consecutive error-free payroll cycles with zero AI in the loop.**
   - Uses KEEL for complete hire-to-pay cycle
   - No Agent Plane (L3 operation)
   - Outputs match incumbent to the cent (with rule citations where they differ)

2. ✅ **A customer voluntarily runs a full month at L3 and reports no capability loss.**
   - Demonstrates that L3 operation is complete and useful
   - Proves Agent Plane is optional, not essential

3. ✅ **Independent auditor attests L3 operation is complete and L4 procedures work.**
   - Compliance evidence
   - Continuity procedures verified

**These three successes are the moat. No competitor can claim them.**

---

## Appendix A: Related ADRs

- ADR 0001: Bitemporal Ledger (enables policy versioning)
- ADR 0002: Policy-as-Code (why compiled, not LLM-interpreted)
- ADR 0003: Two-Plane Architecture (deterministic core + agents)
- ADR 0004: Policy DSL Design (this DSL's grammar and semantics)

## Appendix B: Related Documentation

- CLAUDE.md § Architecture: The Two-Plane Model
- CLAUDE.md § Development Workflow
- Unified Build Brief § 3 (Non-negotiable laws)
- Wave 1 Execution Playbook § Policy & Calculation

---

**Last updated:** 2026-08-28  
**Next review:** End of Week 4  
**Owner:** Squad 1 — Policy & Calculation
