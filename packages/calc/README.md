# @keel/calc — Deterministic Calculation Kernel

The pure calculation engine for KEEL. Policies are compiled to rule graphs and executed by this kernel as WASM functions.

**Design invariants:**
- No I/O (no database, no network, no filesystem access)
- No clock (no `Date.now()`, no timers, deterministic everywhere)
- No randomness (no `Math.random()`, no nondeterministic ordering)
- No external state (all data is passed as function arguments)

**Given identical inputs, output is byte-identical forever.** This enables:
- Audit trails (reproduce any historical calculation)
- Parallel-run comparison (test new policies against incumbent systems)
- Reversibility (correct mistakes with compensating transactions)

## Architecture

### Two Implementations

**TypeScript version** (`src/ts/`)
- Used in development and testing
- Easier to debug and understand
- Type definitions and Zod schemas from `@keel/policy`

**Rust/WASM version** (`src/rs/`)
- Compiled to WebAssembly
- Production execution
- Same behavior as TypeScript version (bit-identical outputs)

### Core Types

```typescript
// Input to a calculation
PolicyExecutionRequest {
  policyId: string;
  policyVersion: string;
  employee: Record<string, unknown>;  // Employee data
  period: Record<string, unknown>;    // Period data
  previousResults?: Record<string, unknown>; // From prior policies
}

// Output from a calculation
PolicyExecutionResult {
  success: boolean;
  outputs: Record<string, Money | Duration | number>;
  ruleApplications: RuleApplication[];
  errors?: string[];
}
```

## Usage

### Execute a Policy

```typescript
import { executePolicyAsync } from '@keel/calc';
import type { PolicyExecutionRequest } from '@keel/calc';

const request: PolicyExecutionRequest = {
  policyId: 'overtime/us-flsa',
  policyVersion: '2026-Q1',
  employee: {
    id: 'EMP-001',
    status: 'active',
    hourlyRate: { amount: 2500, currency: 'USD', scale: 2 },
  },
  period: {
    hoursWorked: 4500, // 45 hours in minute-units
    startDate: '2026-01-05',
    endDate: '2026-01-11',
  },
};

const result = await executePolicyAsync(request);
console.log(result.outputs);
// { regularPay: Money, overtimePay: Money, totalGrossPay: Money }
```

### Batch Processing

For payroll runs with hundreds/thousands of employees, use the batch interface:

```typescript
import { executePoliciesBatch } from '@keel/calc';

const requests = [/* array of PolicyExecutionRequest */];
const results = await executePoliciesBatch(requests);
```

## Implementation Notes (Wave 1)

### TypeScript Version

The TS version is a reference implementation. It:
1. Loads the compiled policy artifact (rule graph)
2. Evaluates each rule in precedence order
3. Tracks which rules applied and why
4. Returns outputs + rule application trace

**Entry point:** `src/ts/executor.ts`

### Rust/WASM Version

The Rust version is being built in parallel. It:
1. Receives the same inputs as TS version
2. Executes policy rules using fixed-point decimal arithmetic
3. Produces byte-identical outputs to TS version
4. Runs in browser (via WASM) or Node.js (via WASM)

**Build:** `pnpm build:calc` (requires Rust toolchain and `wasm-pack`)

## Wave 1 Deliverables

- [x] TypeScript reference implementation of policy executor
- [x] Type definitions for policy execution requests/results
- [x] Support for basic calculation types (multiply, add, subtract, etc.)
- [x] Rule dependency graph evaluation
- [x] Rule application tracing
- [ ] Rust/WASM implementation (Months 2–5 of Wave 1)
- [ ] Fixed-point decimal arithmetic (Rust, for precision)
- [ ] Batch processing optimizations

## Wave 2+ Roadmap

- Policy simulation engine (dry-run for "what-if" analysis)
- Performance benchmarks and optimizations
- Parallel execution of independent rules
- Caching layer for repeated calculations

## Testing

```bash
# Type-check
pnpm typecheck

# Run unit tests (TS version)
pnpm test

# Watch mode
pnpm test:watch

# Lint
pnpm lint

# Build WASM (requires Rust + wasm-pack)
pnpm build
```

## Laws & Constraints

This kernel implements:
- **Law 1:** No LLM/model imports; pure functions only
- **Law 4:** No floating-point money or time; use Money and Duration types
- **Law 6:** Every calculated value traces back to a specific rule and policy version

## See Also

- ADR 0002: Policy-as-Code (why policies are compiled, not LLM-interpreted)
- ADR 0004: Policy DSL Design
- `packages/policy` — Policy DSL and golden dataset harness
- CLAUDE.md § Architecture: The Two-Plane Model

---

**If you're tempted to add a network call, a database query, or a timestamp check, stop and escalate.** These are the boundaries that keep the system deterministic. Violating them destroys auditability and testability.
