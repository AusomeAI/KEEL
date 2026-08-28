# ADR 0005: Policy Compiler Design — DSL to Rule Graph Compilation

**Date:** 2026-08-28  
**Status:** Accepted  
**Deciders:** CTO, Payroll Engineering  
**Relates to:** ADR 0002 (Policy-as-Code), ADR 0004 (Policy DSL Design)

## Context

Policies are authored in a declarative DSL (Zod schemas defined in ADR 0004), but the runtime execution layer needs:

1. **Deterministic rule ordering** — rules must execute in a consistent, dependency-respecting order
2. **Dependency resolution** — rules can depend on outputs of other rules; we must respect these
3. **Semantic validation** — policies must be validated for consistency before deployment
4. **Immutability** — compiled policies are signed and versioned for audit trails
5. **Portability** — compiled policies can be serialized to JSON and deployed to execution engines

The compiler bridges the DSL and the execution layer, providing this transformation and validation.

## Decision

Build a **policy compiler** that transforms a `PolicyDefinition` (DSL) to a `CompiledPolicy` (executable rule graph) in four phases:

### Phase 1: Syntax Validation
Validate the policy definition against Zod schemas. Ensures:
- All required fields are present
- Field types match schema expectations
- No extraneous fields

**Implementation:** `validatePolicySyntax(policyDef)` → Zod parsing

### Phase 2: Semantic Validation
Validate logical consistency and consistency:
- All input fields referenced in calculations exist in input specs
- All output fields declared in outputSpec are produced by at least one rule
- No circular dependencies in the rule graph
- Rule IDs are unique within the policy
- Precedence values are in valid range [0, 9999]

**Implementation:** `validateSemantics(policyDef)` → Set-based validation with DFS cycle detection

### Phase 3: Rule Graph Construction
Build a rule dependency graph:
- Flatten all rules from rule groups
- Identify dependencies between rules (rule A depends on rule B if it references B's output)
- Attach dependency metadata (dependencies, dependents) to each rule
- Perform topological sort to determine execution order

**Algorithm:**
1. Parse each rule's calculation to extract rule references (scope='rule', path='rule-id.field')
2. Build adjacency list: rule → [dependencies]
3. Kahn's algorithm for topological sort, with precedence as tiebreaker
4. Verify no cycles (validation catches this, but double-check for safety)

**Implementation:** `buildRuleGraph(policyDef)` → `RuleNode[]`, then `topologicalSort(ruleGraph)` → `Rule[]`

### Phase 4: Artifact Generation
Create the immutable `CompiledPolicy` artifact:
- Flatten rule groups into a single rule list (ruleGraph)
- Extract execution order
- Extract input/output specifications
- Initialize signature placeholders (author + approver)
- Serialize to JSON
- Compute deterministic hash for versioning
- Sign with author credentials

**Implementation:** `compilePolicy(policyDef)` → `CompiledPolicy`

## Consequences

### Positive

- **Determinism:** Compilation is deterministic; identical policy definitions produce identical compiled artifacts (byte-for-byte, hash-identical)
- **Auditability:** Every compiled policy has a hash; any change produces a new hash, enabling tamper detection
- **Explainability:** Rule execution order is deterministic and verifiable; we can show *why* this rule ran before that one
- **Dependency clarity:** The compiler explicitly models dependencies, enabling debugging of "why didn't my rule fire?" issues
- **Versioning:** Compiled policies are immutable artifacts; versions can be traced historically
- **Testing:** The compiler can be thoroughly tested (unit tests for each validation phase, integration tests with reference policies)

### Negative

- **Compilation overhead:** Policies must be compiled before execution (mitigated by caching compiled policies)
- **Limited expressiveness:** Some policy patterns may not fit the DSL (mitigated by good DSL design in ADR 0004)
- **Debugging complexity:** Errors in the compiler are harder to debug than simple execution (mitigated by comprehensive error messages and tests)

## Implementation Details

### Compiler Structure

```
packages/policy/src/compiler/
├── index.ts           — Main API: compilePolicy(policyDef) → CompiledPolicy
├── validator.ts       — Syntax + semantic validation
├── graph.ts           — Rule graph construction & topological sort
├── serializer.ts      — JSON serialization & versioning
└── signer.ts          — Cryptographic signatures for authorship
```

### RuleNode Structure

A `RuleNode` extends `Rule` with dependency metadata:

```typescript
interface RuleNode extends Rule {
  dependencies: Set<string>;  // Rule IDs this rule depends on
  dependents: Set<string>;    // Rule IDs that depend on this rule
}
```

### Execution Order Guarantee

The compiler ensures:

1. **Precedence order:** Rules are sorted by precedence (ascending)
2. **Dependency order:** If rule A depends on rule B, B executes before A
3. **Stability:** Given identical input, execution order is always identical

Example (US FLSA Overtime):
```
1. regular-hours-calculation (precedence 10) — no deps
2. overtime-hours-calculation (precedence 20) — depends on regular-hours-calculation
3. regular-pay-calculation (precedence 30) — depends on regular-hours-calculation
4. overtime-pay-calculation (precedence 40) — depends on overtime-hours-calculation
5. total-gross-pay (precedence 50) — depends on regular-pay, overtime-pay
```

### Error Handling

The compiler throws `ValidationError` with rich context:

```typescript
class ValidationError extends Error {
  constructor(message: string, context?: Record<string, unknown>)
}
```

Examples:
- "Field not found in employee spec: undefinedField" (context: { availableFields: [...] })
- "Output field not produced by any rule: newField" (context: { producedOutputs: [...] })
- "Circular dependency detected: rule-a → rule-b → rule-a" (context: { cycle: [...] })

### Serialization & Versioning

Compiled policies are serialized to JSON and stored with metadata:

```typescript
interface VersionedPolicyArtifact {
  policy: CompiledPolicy;
  metadata: PolicyMetadata;  // authorship, dates, etc.
  hash: string;              // SHA-256 of policy
  serialized: string;        // JSON representation
}
```

The hash is deterministic: identical policies produce identical hashes, enabling:
- Tamper detection (any change → different hash)
- Deduplication (same policy version → same hash)
- Content-addressable storage

### Signing & Attribution

Policies are signed with author credentials:

```typescript
policy = await signPolicy(policy, author, privateKey, options);
```

This adds:
- Author signature (mandatory)
- Approver signature (optional, required for production deployment)
- Key IDs for key rotation and auditing

Signatures are computed over a canonical JSON representation (excluding signatures themselves), ensuring reproducibility.

## Testing Strategy

### Unit Tests
- Compiler transforms US FLSA overtime policy correctly
- Rule execution order respects dependencies
- Validation rejects invalid policies with clear error messages
- Serialization round-trips (serialize → deserialize → byte-identical)
- Signing/verification work correctly

### Integration Tests
- Compile reference policies (US FLSA overtime, leave accrual, simple tax)
- Golden dataset validation (100% rule coverage)
- Policy versioning and temporal lookups

### Property Tests (Future)
- Compilation is deterministic (same input → same output)
- Serialization is lossless (deserialize(serialize(x)) == x)
- Dependency order is valid (if A depends on B, B.index < A.index)

## Alternatives Considered

### Alternative A: Lazy Compilation
**Idea:** Compile policies on-demand at runtime.  
**Why not:** Reduces predictability; compilation errors surface at run time, not deployment time.

### Alternative B: Compile to Executable Code
**Idea:** Generate TypeScript/JavaScript code from the DSL.  
**Why not:** Generated code is harder to audit and sign; makes policy changes require code review and rebuild.

### Alternative C: Single-Pass Compilation
**Idea:** Combine validation and graph building into one pass.  
**Why not:** Harder to debug; harder to provide incremental error messages.

## Related ADRs

- ADR 0002: Policy-as-Code (why policies are compiled, not LLM-interpreted)
- ADR 0004: Policy DSL Design (the language being compiled)
- ADR 0001: Bitemporal Ledger (enables versioning and retroactive correctness)

## References

- [Topological Sort (Kahn's Algorithm)](https://en.wikipedia.org/wiki/Topological_sorting)
- [Deterministic Builds & Reproducibility](https://reproducible-builds.org/)
- [Cryptographic Signatures & Non-Repudiation](https://en.wikipedia.org/wiki/Non-repudiation)

---

**Next Steps:**
1. Wave 2: Policy simulation engine (dry-run policies before activation)
2. Wave 2: Policy diff engine (show changes between versions)
3. Wave 2: Policy advisor agent (drafts policies, but humans approve)
4. Wave 3: Support for more jurisdiction packs (EU, AU, APAC)
5. Wave 3: Performance optimizations (compiled policy caching, parallel execution)
