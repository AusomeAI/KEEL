# KEEL — The Agentic HR Operating System

**Working codename:** KEEL — *Agents on top. Deterministic core underneath.*

**Status:** Horizon 1, Wave 1 — Foundations (In Progress)

---

## What Is KEEL?

KEEL is a production-grade HR Operating System built on a revolutionary two-plane architecture:

1. **The Deterministic Plane** — A complete, bitemporal, policy-compiled HRIS covering 203 modules across 16 domains. Computes payroll to the cent. Contains zero AI. Runs independently of agents.

2. **The Agent Plane** — A governed, budgeted, revocable layer of specialist agents that propose work through the Control Gate, never touching the ledger or calculations.

**The core promise:** If the entire Agent Plane were deleted tomorrow, KEEL would still be a complete, competitive production HRIS — and every automated test would pass.

---

## Quick Start

### Prerequisites

- **Node 22** or later
- **pnpm 9.1.0** or later (`npm install -g pnpm`)
- **PostgreSQL 16** (for ledger service)
- **Rust** (for the calculation kernel in `packages/calc`)

### Installation

```bash
# Install dependencies
pnpm install

# Run the law enforcement checks locally (before committing)
pnpm run ci:laws

# Run all tests
pnpm run test

# Run L3 tests (deterministic-only mode, no agents)
pnpm run test:l3

# Start development environment
pnpm run dev

# Run game-day continuity tests
pnpm run gameday
```

### First Time Setup

1. **Read CLAUDE.md** — Understand the architecture and the 10 non-negotiable laws
2. **Read the strategic documents** in `docs/`:
   - `01-Market-Research-and-Competitive-Teardown.md`
   - `02-Vision-Architecture-and-Strategy.md`
   - `05-Unified-Build-Brief-for-Agent-Teams.md`
3. **Check the ADRs** in `docs/adr/` — especially ADR 0001–0003 for foundational decisions
4. **Set up your local environment:**
   ```bash
   cp .env.example .env.local
   pnpm install
   pnpm run build
   ```

---

## Repository Structure

```
keel/
├── apps/                  # User-facing applications (web, mobile, kiosk, admin)
├── services/              # Backend microservices (ledger, gate, workflow, payroll-run, etc.)
├── packages/              # Shared libraries (core, policy, calc, design-system, sdk, testing)
├── packs/                 # Jurisdiction packs (versioned policy artifacts)
├── docs/
│   ├── adr/               # Architecture Decision Records
│   └── *.md               # Strategic and operational documentation
├── scripts/ci-laws/       # CI enforcement for the 10 laws
├── CLAUDE.md              # Guidance for Claude Code (this repo's AI assistant)
├── .dependency-cruiserrc.js  # Dependency rules (Law 1 enforcement)
├── .github/workflows/     # CI pipeline
└── pnpm-workspace.yaml    # Monorepo configuration
```

---

## The 10 Non-Negotiable Laws

These are enforced by CI. Read [CLAUDE.md](./CLAUDE.md) for details.

| Law | What | Why |
|-----|------|-----|
| 1 | No LLM imports in core packages | Deterministic core must be independent |
| 2 | Manual UI before agent capability | Users first, agents second |
| 3 | Ledger is append-only | Auditability and replayability |
| 4 | No floating-point money/time | Payroll precision to the cent |
| 5 | Tenant isolation in kernel | No isolation bugs hidden in queries |
| 6 | No policy without golden dataset | Correctness is non-negotiable |
| 7 | Decision Records for all material decisions | Compliance evidence by construction |
| 8 | L3 test suite must pass with agents disabled | AI is optional |
| 9 | Hard autonomy ceilings in code | No admin screen can escalate agent authority |
| 10 | Per-agent identity, short-lived tokens | Individual accountability and revocability |

---

## Development Workflow

### Before Writing Code

1. **State which laws constrain your task** — one paragraph on your plan
2. **Write tests first** — especially for payroll, entitlements, statutory logic
3. **File an ADR if needed** — for architectural decisions

### Making a PR

- Small, reviewable PRs (one concern each)
- Conventional commits
- Run `pnpm run ci:laws` locally before pushing
- Reference relevant strategic documents and ADRs in PR body

### Testing

```bash
# Run all tests
pnpm run test

# Run L3 deterministic-only mode
pnpm run test:l3

# Run a single package's tests
pnpm run test -- packages/core

# Watch mode
pnpm run test:watch

# Generate coverage
pnpm run ci:coverage
```

---

## Horizon 1 Roadmap

### Wave 1 — Foundations (Months 0–5) ✓ In Progress
- Bitemporal ledger
- Tenancy kernel (Tenant/Group/Entity/Branch) with RLS
- Authorisation (RBAC + ABAC + SoD)
- Control Gate with Decision Records
- Policy DSL and compiler
- Rust/WASM calc kernel skeleton
- Keel Design System v1
- CI with Laws 1–10 enforced

**Exit criterion:** Engineer can run `pnpm keel:l3` and complete hire-to-pay cycle

### Wave 2 — Core HR and Time (Months 4–10)
- Employee master, org structure, positions
- Time capture (biometric, RFID, mobile, kiosk, web)
- Leave engine, accrual, statutory packs
- ESS/MSS on web and mobile

### Wave 3 — Payroll (Months 8–15)
- Gross-to-net engine
- Tax and statutory contribution packs (3 jurisdictions)
- Retroactive processing
- Parallel-run comparison engine (the sales weapon)

### Wave 4 — Operations & Continuity (Months 12–18)
- Onboarding/movement/offboarding
- Continuity Ladder (L3 and L4 fully operational)
- Migration accelerators
- Integration hub

**Horizon 1 exit criterion:** Design-partner customer runs 3 error-free payroll cycles with zero AI

---

## Documentation

- **CLAUDE.md** — Guidance for Claude Code working in this repo
- **docs/01–07** — Strategic documents (market, vision, module matrix, build brief, playbook, toolkit)
- **docs/adr/** — Architecture decisions and rationale
- **docs/adr/0000-record-decisions.md** — How to write ADRs

---

## Support and Questions

- **Architecture questions?** See CLAUDE.md § "Further Reading"
- **Design pattern questions?** Check docs/adr/ for precedent
- **Stuck on a law?** File an ADR and escalate rather than working around
- **Need to know about an incumbent?** See docs/01-Market-Research...

---

## License

Copyright © 2026. All rights reserved.

---

## Success Metrics

We are not measuring features shipped. We are measuring:

1. **A design-partner customer runs 3 error-free payroll cycles with zero AI in the loop.** (Horizon 1)
2. **A customer voluntarily runs a full month at L3 and reports no capability loss.** (Horizon 2)
3. **An independent auditor attests that L3 operation is complete and L4 procedures work.** (Horizon 2)

No competitor can claim any of the three today. That is the moat.
