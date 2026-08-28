# @keel/core — KEEL Platform Kernel

The foundational package containing the entire deterministic plane's core types, interfaces, and contracts.

**Mission:** Define the architectural boundary between the human/agent plane and the deterministic core. Every other squad builds against the contract exported from this package.

**Important:** This package contains **zero imports from LLM providers, model SDKs, or agent frameworks.** This is enforced by Law 1 (dependency-cruiser) and is non-negotiable.

## Structure

```
src/
├── types/               # Core types (Money, Duration, Actor, TenantContext, etc.)
├── tenancy/             # Tenant hierarchy and isolation contracts
├── auth/                # Authorisation layer (RBAC, ABAC, SoD)
├── ledger/              # Event model and ledger contracts
├── control-gate/        # TransactionIntent and control gate contract
└── errors/              # Error types for the deterministic plane
```

## Core Types

### Money (Law 4: No floating-point money)

All monetary values are `Money` types: integer minor units + currency + scale.

```typescript
import { Money, fromDecimal, toDecimal, add, multiply } from "@keel/core";

const salary = fromDecimal("123456.78", "USD", 2);
// { amount: 12345678, currency: "USD", scale: 2 }

const withRaise = add(salary, fromDecimal("5000.00", "USD", 2));
```

### Duration (Law 4: No floating-point time)

All durations are integer minutes (never fractional hours).

```typescript
import { Duration, fromHoursMinutes, toHoursMinutes } from "@keel/core";

const workday: Duration = fromHoursMinutes(8, 30);
// 510 minutes

const [hours, minutes] = toHoursMinutes(workday);
// [8, 30]
```

### Actor (Law 10: Per-agent identity)

Represents who is performing an action—human or agent.

```typescript
import { Actor, human, agent } from "@keel/core";

const manager: Actor = human("550e8400-e29b-41d4-a716-446655440000");
const aiAssistant: Actor = agent("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
```

### TenantContext (Law 5: Tenant isolation in the kernel)

Every operation is scoped to tenant/group/entity/branch.

```typescript
import { TenantContext } from "@keel/core";

const scope: TenantContext = {
  tenantId: "...",       // Top-level customer
  groupId: "...",        // Business unit or subsidiary
  legalEntityId: "...",  // Tax entity
  branchId: "..."        // Physical location or cost center
};
```

### TransactionIntent (Law 2: Manual path first)

Typed, schema-validated proposals from humans or agents.

```typescript
import { TransactionIntent, TransactionIntentType } from "@keel/core";

const intent: TransactionIntent = {
  type: "HIRE_EMPLOYEE",
  subject: employeeId,
  payload: {
    firstName: "Jane",
    lastName: "Doe",
    emailAddress: "jane.doe@example.com",
    // ...
  },
  actor: human(currentUserId),
  tenancy: currentTenantContext,
  temporal: {
    asOf: new Date(),
    effectiveFrom: new Date(),
  },
  provenance: {
    requestId: uuidv4(),
    sourceSystem: "web-ui",
    ipAddress: req.ip,
  },
};
```

### DecisionRecord (Law 7: Every material decision is recorded)

Signed, hash-chained compliance evidence.

```typescript
import { DecisionRecord } from "@keel/core";

const record: DecisionRecord = {
  id: uuidv4(),
  category: "HIRE",
  subject: employeeId,
  tenancy: tenantContext,
  actor: human(hrManagerId),

  // Decision flow
  decisions: [
    {
      deciderId: hrManagerId,
      role: "HR Manager",
      decision: "APPROVED",
      reasoning: "Meets all requirements",
      timestamp: new Date(),
      signature: "...",
    },
  ],

  // Regulatory evidence
  regulatoryEvidence: [
    {
      jurisdiction: "US.FEDERAL",
      rule: "Background check required before hire",
      citation: "FCRA Section 606",
      effectiveDate: new Date("2026-01-01"),
    },
  ],

  recordHash: sha256(record),
  createdAt: new Date(),
};
```

## Wave 1 Deliverables

- ✅ Type definitions for Money, Duration, Actor, TenantContext
- ✅ TransactionIntent registry and types
- ✅ DecisionRecord types and chain-of-custody
- ✅ LedgerEvent bitemporal model
- ✅ Error types (AuthenticationError, ValidationError, etc.)
- 🔄 Tenancy kernel (Tenant/Group/Entity/Branch) — in progress
- 🔄 Authorisation engine (RBAC/ABAC/SoD) — in progress
- 🔄 Control Gate service — in progress

## Breaking Changes

This package owns the contract that every other squad builds against. **Breaking changes require a deprecation window and a codemod.**

Before making a breaking change:
1. File an ADR explaining the change and migration path
2. Implement the new version alongside the old (mark old version `@deprecated`)
3. Provide a codemod script to migrate dependent code
4. Release a minor version with deprecation warnings
5. Release the breaking change in the next major version

## No LLM Imports

This package is part of the deterministic core. It has **zero dependencies on:**

- OpenAI, Anthropic, Google, Cohere, etc.
- LangChain, LlamaIndex, Haystack, etc.
- Agent frameworks (AutoGen, CrewAI, etc.)
- MCP clients (these belong in services/agent-plane)

The dependency-cruiser CI check verifies this automatically.

## Testing

```bash
pnpm --filter @keel/core test
pnpm --filter @keel/core test:watch
```

## References

- [CLAUDE.md — Architecture Overview](../../CLAUDE.md)
- [ADR 0001 — Bitemporal Ledger](../../docs/adr/0001-bitemporal-ledger-over-snapshot.md)
- [ADR 0003 — Two-Plane Architecture](../../docs/adr/0003-two-plane-architecture.md)
- [Unified Build Brief § 5 — Control Gate Contract](../../05-Unified-Build-Brief-for-Agent-Teams.md#5-the-control-gate-contract)
