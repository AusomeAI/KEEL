# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**KEEL** is a production-grade, multi-tenant, multi-company, multi-branch HR Operating System built on two distinct architectural planes:

1. **The Deterministic Plane (the Keel)** — A complete HRIS covering 203 modules across 16 domains. It computes payroll to the cent, enforces every statutory rule, runs every workflow, and produces every statutory filing. **Contains zero AI.**

2. **The Agent Plane** — A governed, budgeted, revocable layer of specialist agents that propose work into the deterministic plane through the Control Gate.

**The one sentence that decides every argument:**
> If the entire Agent Plane were deleted from the repository tomorrow, KEEL would still be a complete, competitive, production HRIS — and every automated test would still pass.

This is not aspirational. It is enforced by CI and by the architecture itself.

---

## The Ten Non-Negotiable Laws

These are enforced by CI. A PR that violates any of them is rejected automatically. There is no exception process.

| Law | Requirement | Why |
|-----|-------------|-----|
| **Law 1** | No LLM/model/agent SDK imports in `packages/core/**`, `packages/policy/**`, `packages/calc/**`, or `services/ledger/**` | The deterministic core must be completely decoupled from AI |
| **Law 2** | Every `TransactionIntent` type must register a human UI route before any agent can use it | Manual path always ships first |
| **Law 3** | The ledger is append-only. No `UPDATE` or `DELETE` on event tables, only compensating events | Auditability and replayability depend on immutability |
| **Law 4** | No floating-point money or time. Use `Money` (integer minor units) and `Duration` (integer minutes) types | Payroll must be exact to the cent, always |
| **Law 5** | Tenant isolation enforced by PostgreSQL RLS in the kernel, never by application queries | No isolation bugs hidden in business logic |
| **Law 6** | No policy ships without a golden test dataset at 100% rule coverage with statutory citations | Policy correctness is non-negotiable |
| **Law 7** | Every material HR decision (hire, pay change, promotion, discipline, termination, payroll approval) emits a signed Decision Record | Compliance evidence is a product feature, not afterthought |
| **Law 8** | Full end-to-end test suite must pass identically with Agent Plane scaled to zero and model endpoints blackholed | L3 (Deterministic-only) operation is continuously verified |
| **Law 9** | Hard autonomy ceilings (pay, promotion, discipline, termination, screening, calibration) are compile-time constants, not configuration | No admin screen can escalate agent authority over sensitive decisions |
| **Law 10** | Per-agent identity with short-lived scoped tokens, OAuth 2.1 + PKCE. Never shared service accounts or static credentials | Agent actions are individually traceable and revocable |

**Enforcement:** The CI job `pnpm run ci:laws` runs dependency-cruiser, linting rules, and architectural tests to verify all 10 laws. This is the first step in every CI run.

---

## Architecture: The Two-Plane Model

### The Control Gate

The single boundary between planes. Both humans and agents call it. It never splits into separate code paths.

```
Human or Agent
      │
      ▼
  TransactionIntent  { type, subject, payload, asOf, effectiveFrom,
                       actor: {kind: HUMAN|AGENT, id, onBehalfOf},
                       provenance }
      │
      ▼
┌───────────────────────── CONTROL GATE ─────────────────────────┐
│ 1. Authenticate actor (per-agent identity, short-lived token)   │
│ 2. Authorise against tenancy scope (tenant/group/entity/branch) │
│ 3. Check autonomy ceiling for this intent type                  │
│ 4. Check budget and rate limits (agents only)                   │
│ 5. Validate against compiled policy — same validation for both  │
│ 6. Simulate deterministically; attach projected effect          │
│ 7. Route for human approval if autonomy level requires it       │
│ 8. Execute as an ordinary ledger transaction                    │
│ 9. Emit signed Decision Record                                  │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
  Bitemporal Ledger  (append-only, replayable, reversible)
```

**Critical design test:** If the Agent Plane did not exist, would the Control Gate still be the correct API for the manual UI? If the answer is no, you have built an AI safety wrapper instead of a transaction boundary. Rewrite it.

### Five Architectural Pillars

1. **Bitemporal ledger** — Every fact carries valid time (when it was true) and transaction time (when we came to believe it). Append-only. Corrections are compensating events. This is what makes retroactive payroll *derived* and auditable.

2. **Policy-as-code** — Leave, overtime, tax, eligibility and contributions are authored in a versioned DSL, compiled to a rule graph, tested against golden datasets, signed, and executed by a deterministic engine. LLMs may author or explain policy. They never execute it.

3. **The Control Gate** — The only write path into the deterministic plane. Authorises, validates, simulates, routes for approval, executes, and emits Decision Records. Used identically by humans and agents.

4. **Group-native tenancy** — Tenant → Group → Legal Entity → Branch are architectural dimensions carrying their own policy, calendar, currency, statutory profile, approval chain and data residency. Not configuration filters on a single-company model.

5. **The Continuity Ladder** — L0 (Autonomous) → L1 (Supervised) → L2 (Assisted) → **L3 (Deterministic, zero LLM)** → L4 (Offline/read-only). L3 is the floor, not the fallback.

---

## Repository Structure

```
keel/
├── .github/
│   └── workflows/
│       └── ci.yml              # Enforces Laws 1–10; runs ci:laws, ci:test, ci:coverage
├── apps/                       # User-facing applications
│   ├── web/                    # React 19 + Vite desktop UI
│   ├── mobile/                 # React Native (Expo) with offline-first SQLite
│   ├── kiosk/                  # Hardened PWA, large touch targets, 2G-resilient
│   └── admin/                  # Internal operations
├── services/                   # Backend microservices
│   ├── ledger/                 # Bitemporal event store + projections (TypeScript/Fastify)
│   ├── gate/                   # Control Gate implementation
│   ├── workflow/               # Temporal.io deterministic workflows
│   ├── payroll-run/            # Payroll cycle orchestration
│   ├── integration/            # ERP, GL, banking, identity connectors
│   ├── reporting/              # Analytics, warehouse sync, reverse ETL
│   └── agent-plane/            # Model-agnostic agent router, MCP server, evaluation harness
├── packages/                   # Shared libraries
│   ├── core/                   # Kernel: tenancy, authorisation, RLS, event model
│   ├── policy/                 # Policy DSL, compiler, typed artifacts
│   ├── calc/                   # Rust/WASM calculation kernel (pure functions, byte-identical outputs)
│   ├── design-system/          # Keel DS: Radix-based components with custom tokens
│   ├── sdk/                    # TypeScript SDK for partner integrations
│   └── testing/                # Harness for golden datasets, L3 verification
├── packs/                      # Jurisdiction packs (versioned, signed policy artifacts)
│   ├── us/
│   ├── eu/
│   └── apac/
├── docs/
│   ├── adr/                    # Architecture Decision Records (every decision that would be questioned)
│   ├── 01-Market-Research-and-Competitive-Teardown.md
│   ├── 02-Vision-Architecture-and-Strategy.md
│   ├── 03-Module-and-Continuity-Matrix.xlsx
│   ├── 05-Unified-Build-Brief-for-Agent-Teams.md
│   ├── 06-Wave-1-Execution-Playbook.md
│   └── 07-Operational-Toolkit.md
├── pnpm-workspace.yaml         # Monorepo root
├── turbo.json                  # Turborepo pipeline
└── CLAUDE.md                   # This file
```

---

## Technology Stack

**TypeScript on Node 22** — type-safe across the stack. Fastify for HTTP, OpenAPI 3.1 schemas generated from Zod.

**Calculation kernel in Rust/WASM** (`packages/calc`) — pure functions with no I/O, no clock, no randomness, no network. Given identical inputs it returns byte-identical outputs forever. This is what makes payroll replayable and enables meaningful parallel-run comparison.

**PostgreSQL 16** — event store + projections. Partitioned by tenant. Row-level security on every table. Per-entity envelope encryption via KMS. RLS rules enforced at the kernel level, never at the query layer.

**Temporal.io** — for long-running deterministic workflows (payroll cycles, onboarding journeys, approval chains). Workflows are deterministic by construction — they must never call a model.

**Redis** — cache and rate limiting. **OpenSearch** — search. **Kafka** — ledger event stream.

**React 19 + TypeScript + Vite** — frontend with TanStack Router and Query. Keel Design System built on Radix primitives with custom tokens.

**React Native (Expo)** — mobile with offline-first SQLite store and conflict-resolving sync engine. Offline capture is L4-critical, not optional.

**Kubernetes + Terraform** — per-region deployments for data residency. OpenTelemetry throughout. Feature flags per tenant/entity/branch.

**Agent Plane is a physically separate deployable** — must be scalable to zero without affecting any other service. This is how Law 8 (L3 testing) is implemented.

---

## Development Workflow

### Before Writing Code

1. **State which laws constrain this task** — one paragraph on which laws are most relevant and your plan to satisfy all ten. If you cannot see how, escalate rather than choosing a workaround.

2. **Write the test first** — especially for anything touching money, entitlement, or statutory obligation. Write the golden dataset before the implementation.

3. **File an ADR if needed** — for any decision a future engineer would question. Include it in the same PR.

### Small, Reviewable PRs

- One concern per PR
- Conventional commits
- Trunk-based with short-lived branches

### Key Development Commands

(Once Wave 1 Foundations are built, these commands will be available):

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run all tests
pnpm run test

# Run a single test suite
pnpm run test -- services/ledger

# Lint and type-check
pnpm run lint
pnpm run typecheck

# Run CI law enforcement locally (before committing)
pnpm run ci:laws

# Run L3 test suite (Agent Plane scaled to zero)
pnpm run test:l3

# Build calculation kernel (Rust → WASM)
pnpm run build:calc

# Start local development server
pnpm run dev

# Game-day: test L3 and L4 continuity
pnpm run gameday

# Format code
pnpm run format
```

---

## Horizon 1: Wave 1 — Foundations (Months 0–5)

The build sequence is derived from what payroll depends on, not what demos well.

**Wave 1 deliverables:**
- Bitemporal ledger with event sourcing
- Tenancy kernel (Tenant/Group/Entity/Branch) with RLS
- Authorisation (RBAC + ABAC + Segregation of Duties)
- Control Gate with Decision Records
- Policy DSL and compiler
- Rust/WASM calculation kernel skeleton
- Keel Design System v1
- CI enforcement of Laws 1–10 from day one

**Wave 1 exit criterion:** An engineer can run `pnpm keel:l3` locally (Agent Plane endpoints blackholed, all model calls unavailable) and complete a full hire-to-pay cycle through the UI.

**Horizon 1 exit criterion (by Month 18):** A design-partner customer runs three consecutive error-free payroll cycles with zero AI in the loop.

---

## Definition of Done

A module is done when **all** of the following are true. Partial credit does not exist:

- [ ] Manual UI merged, covering every state (empty, loading, partial, error, offline, read-only, no-permission, L3), on every required form factor
- [ ] `TransactionIntent` types defined, registered, and mapped to UI routes in the manifest
- [ ] Policy artifacts authored in DSL, compiled, signed, and versioned
- [ ] Golden test dataset at 100% rule coverage, with statutory citations
- [ ] Bitemporal correctness test (retro-effective change, as-of reconstruction, compensating reversal)
- [ ] Tenant isolation test passes across all roles for this module's tables
- [ ] Decision Records emitted for every material decision
- [ ] **L3 suite passes with Agent Plane scaled to zero and model endpoints blackholed**
- [ ] L4 behaviour specified and statutory pack output generated
- [ ] OpenAPI/GraphQL schema published; SDK regenerated
- [ ] Migration path documented from at least one named incumbent
- [ ] Accessibility audit passed (WCAG 2.2 AA minimum); localisation strings extracted
- [ ] Observability: traces, metrics, module SLO defined
- [ ] Runbook written for on-call engineer
- [ ] ADR filed for any architectural decision

Only after all of the above may an agent capability be built on the module — and it starts in shadow mode.

---

## Escalation Criteria

Stop and escalate (do not decide) when:

- A statutory rule is ambiguous
- A change would require mutating ledger history
- A design would make a capability reachable only through chat
- Deadline pressure suggests shipping an agent capability before its manual path
- Anyone asks you to relax one of the ten laws for a demo

---

## What Success Looks Like

Not features shipped. Three things:

1. **A design-partner customer runs three consecutive error-free payroll cycles with zero AI in the loop.** (Horizon 1)
2. **A customer voluntarily runs a full month at L3 and reports no capability loss.** (Horizon 2)
3. **An independent auditor attests that L3 operation is complete and L4 procedures work.** (Horizon 2)

No competitor can claim any of the three. That is the moat.

---

## Further Reading

All strategic and operational documentation is in `docs/`:

- **01 — Market Research & Competitive Teardown** — Why this architecture is the opportunity
- **02 — Vision, Architecture & Strategy** — The full two-plane design, continuity ladder, business model
- **03 — Module & Continuity Matrix** — The 203 modules mapped to waves, with continuity levels per module
- **05 — Unified Build Brief for Agent Teams** — The constitution for all engineering and design work (this is **Law Zero**)
- **06 — Wave 1 Execution Playbook** — Detailed execution plan for Foundations
- **07 — Operational Toolkit** — Go-to-market, customer success, and operations

---

## Questions About Architecture?

The answers are in the Strategic Documents. The Unified Build Brief (05) is the system prompt that applies to every engineer and designer on the programme.

The 10 Laws are not negotiable. The Control Gate is not optional. L3 testing is not aspirational. Every module must have a manual UI before any agent capability exists.

If you're about to write code that breaks one of these rules "just this once," stop and escalate instead.
