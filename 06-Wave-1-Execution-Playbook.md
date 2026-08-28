# KEEL — Wave 1 Execution Playbook
## Months 0–18. From hire to payroll.

**From:** CTO / VP Engineering
**To:** All team leads, squad leads, delivery partners
**Status:** This document is binding. Deviations require a written ADR and CEO sign-off.
**Companion:** Unified Build Brief (05), Vision & Strategy (02), Module Matrix (03)

---

## PART 1: Wave 1 STRUCTURE

### The Timeline

```
WEEK 1–2:   Team assembly, stack setup, infra skeleton
WEEK 3–6:   Ledger v0.1 + tenancy kernel (Squad 0, 1)
WEEK 7–10:  Authorization framework, Control Gate v0.1 (Squad 0)
WEEK 11–14: Policy DSL skeleton, first golden datasets (Squad 1)
WEEK 15–18: Design System v1, auth UI, settings (Squad 5)
WEEK 19–22: Employee master + org chart (Squad 2)
WEEK 23–26: Time capture (mobile/kiosk/web) + offline (Squad 3)
WEEK 27–34: Leave accrual engine (Squad 3)
WEEK 35–42: Core payroll (gross-to-net, first jurisdiction) (Squad 4)
WEEK 43–52: Parallel-run engine, bank file generation (Squad 4)
WEEK 53–60: Onboarding/movement/offboarding (Squad 2, 4)
WEEK 61–70: Continuity procedures, L3/L4 game-day, migrations (Squad 8, 0)
WEEK 71–78: Polish, refactor, hardening, documentation
```

**Wave 1 exit criterion:** A design-partner customer runs three consecutive error-free payroll cycles with zero AI in the loop, on a multi-entity, multi-country structure.

---

## PART 2: SQUAD STAFFING & KICKOFF

### Squad 0 — Platform Kernel (8 people)
**Hiring profile:** Database architects, systems engineers, security, CI/CD specialists.
**Owned systems:** Ledger, tenancy, RBAC/ABAC, Control Gate, CI enforcement.
**First 4 weeks:** Build the bitemporal ledger on Postgres + Kafka event stream. No application code reads the ledger until the schema is frozen and RLS is verified.

**Week 1 kickoff agenda:**
- Database architecture deep-dive (bitemporal modeling, partitioning strategy)
- Event schema design (immutability constraints, hash chaining)
- Row-level security rules per tenant + entity
- CI rule implementation (Law 1–10 automated enforcement)
- Set up nightly RLS fuzz test suite

**First deliverable (end of Week 6):**
```
- Ledger schema with 100% row-level security
- Event producer/consumer skeleton with Kafka
- All 10 Laws enforced in CI
- nightly RLS fuzz suite passing (no cross-tenant reads)
```

**Escalation points:** Any schema change after Week 6 requires Squad 0 lead approval + ADR.

---

### Squad 1 — Policy & Calculation (6 people)
**Hiring profile:** Payroll accountants, compliance engineers, Rust engineers, DSL/compiler specialists.
**Owned systems:** Policy DSL, compiler, Rust/WASM calc kernel, golden datasets.
**First 4 weeks:** Design and implement the policy DSL. Write the first golden dataset (simple leave accrual). Build the WASM skeleton.

**Week 1 kickoff agenda:**
- Policy DSL design (how leave, tax, overtime, contributions are authored)
- Compiler architecture (validation, rule graph, signing, versioning)
- WASM kernel constraints (no I/O, no clock, no randomness, byte-identical output)
- Golden dataset format and test harness
- Review Payroll Cube (tax/contribution reference pack for first jurisdiction)

**First deliverable (end of Week 8):**
```
- Policy DSL spec (v0.1, 20 pages)
- Compiler skeleton (parses DSL, validates rule graph, outputs signed artifact)
- WASM kernel compiles, runs leave accrual correctly, 100% golden test pass
- First golden dataset: annual leave accrual, 5 employees, 12 months
```

**Escalation points:** Any DSL breaking change, or any model call in the kernel, requires CTO sign-off.

---

### Squad 2 — Workforce Domain (5 people)
**Hiring profile:** HR product designers, employee data architects, bitemporal DB specialists.
**Owned systems:** Employee master, org structure, positions, movements (transfer/promotion/demotion).
**Starts:** Week 11 (after Control Gate v0.1 exists).

**Week 11 kickoff agenda:**
- Bitemporal modeling for employee history (effective-dated changes, retroactivity)
- Employee master data model (core fields, extended fields, legal identity separation)
- Org chart (hierarchy, matrix, cost-center assignment)
- Position architecture (title, level, salary range, approval chain)
- TransactionIntent types for hire, transfer, promotion, demotion, termination
- As-of reconstruction test (every screen must show correct state as of any date)

**First deliverable (end of Week 22):**
```
- Employee master schema with as-of reconstruction tests
- Org chart hierarchy model with path materialization
- Positions data model with effective dating
- Hire/transfer/promotion intents, all with manual UI routes
- Mobile ESS (employee view of own profile, org context)
```

**Escalation points:** Any retroactive change to an employee record after Week 20 requires approval from Squad 0 + Squad 4 (payroll may be affected).

---

### Squad 3 — Time & Leave (6 people)
**Hiring profile:** Mobile engineers, offline-first experts, time-tracking specialists, leave compliance specialists.
**Owned systems:** Time capture (mobile/kiosk/web/biometric), offline sync, leave accrual, statutory leave packs.
**Starts:** Week 15 (after Design System v1).

**Week 15 kickoff agenda:**
- Offline-first sync engine (conflict resolution, eventual consistency)
- Time capture design (mobile punch, kiosk punch, geofenced, biometric, manual entry)
- Timesheet UI (weekly view, approval workflow, bulk corrections)
- Leave policy types (annual, sick, statutory, unpaid, LOA)
- Accrual engine integration with Squad 1's policy DSL
- Rostering solver (shift patterns, coverage, statutory limits)

**First deliverable (end of Week 34):**
```
- Mobile offline sync engine (power loss mid-punch, network delay, reconciliation)
- Time capture across 4 channels (biometric, RFID, geofenced mobile, web punch clock)
- Timesheet grid UI with manager approval workflow
- Leave accrual integrated with policy engine (100% golden dataset pass)
- Roster solver producing valid shift assignments
```

**Escalation points:** Any time recorded without provenance (capture method + timestamp), or any leave processed without accrual audit trail, fails the build.

---

### Squad 4 — Payroll Operations (7 people)
**Hiring profile:** Payroll engineers, tax compliance specialists, banking/GL integration engineers.
**Owned systems:** Payroll runs, gross-to-net, tax/contribution, bank files, GL posting, parallel-run engine.
**Starts:** Week 27 (after leave + time are in CI).

**Week 27 kickoff agenda:**
- Payroll run lifecycle (validation → simulation → approval → execution → posting)
- Gross-to-net calculation integration with WASM kernel
- Tax and contribution rule packs for first jurisdiction (golden dataset 100% coverage)
- Bank file generation (dual control, audit trail)
- GL posting integration (nominal accounts, cost center rollup)
- Parallel-run engine (run incumbent + KEEL side-by-side, compare to the cent)
- Payslip generation and delivery

**First deliverable (end of Week 42):**
```
- Full payroll run for 100 employees, 1 entity, 1 jurisdiction, 3 cycles
- All payslips generated, matches incumbent to the cent
- Bank file generated with dual-control release
- GL postings verified
- Parallel-run engine producing exception report (where they differ, show the rule)
```

**Escalation points:** Any variance > 1 cent between KEEL and incumbent that is not traced to a declared rule difference requires immediate escalation.

---

### Squad 5 — Experience (7 people)
**Hiring profile:** UX designers, product designers, mobile designers, accessibility specialists, front-end engineers.
**Owned systems:** Design System, web, mobile, kiosk, offline, accessibility, localization.
**Starts:** Week 7 (Design System kicks off immediately).

**Week 7 kickoff agenda:**
- Keel Design System architecture (tokens, primitives, component library based on Radix)
- Design language and visual direction (authentication flow, settings, timekeeping, approval)
- Mobile-first approach for time capture and ESS
- Kiosk hardening (5-year-old Android tablets, 2G, shared device, gloved interaction)
- Accessibility approach (WCAG 2.2 AA, keyboard-navigable, screen reader support)
- Localization strategy (11 locales for H1: EN, DE, FR, IT, ES, PT, PL, HU, RU, ZH, JA)

**First deliverable (end of Week 18):**
```
- Design System v1 (80+ components, all documented, storybook live)
- Login/auth flow (web + mobile)
- Settings/preferences (language, timezone, notification, personal data)
- Mobile punch clock UI (kiosk variant + responsive)
- Manager approval inbox (skeleton, responsive)
- All screens: empty, loading, partial, error, offline, read-only, L3 (no agent) states
```

**Escalation points:** Any feature shipped without an L3 state blocks the merge. Any UI accessible only via chat is a veto.

---

### Squad 6 — Integration & Data (4 people)
**Hiring profile:** API engineers, data integration specialists, migration specialists.
**Owned systems:** OpenAPI/GraphQL schemas, webhooks, connectors (SSO/SCIM, ERP, banking, payroll bureaus), reporting warehouse, migration tooling.
**Starts:** Week 35 (after core payroll is in CI).

**Week 35 kickoff agenda:**
- OpenAPI schema generation from Zod (every endpoint generated, not hand-written)
- GraphQL read-only layer for reporting (no mutations)
- Webhook system for ledger events (subscriber management, retry logic, idempotency)
- First connectors: Okta SSO/SCIM, SAP ERP GL sync, banking file parsers
- Migration accelerators: Workday, ADP, SuccessFactors (3 named incumbents)
- Data warehouse sync (daily refresh to analyst-safe schema)

**First deliverable (end of Wave 1):**
```
- OpenAPI v3.1 spec published, SDK generated
- GraphQL schema (read-only, no auth vulnerabilities)
- Webhook subscriber infrastructure (Kafka-backed, exactly-once delivery)
- Okta SCIM connector (two-way sync, conflict resolution)
- Migration accelerator for incumbent #1 (data mapping, validation)
```

**Escalation points:** Any schema change that would break existing clients requires deprecation window + codemod.

---

### Squad 7 — Agent Plane (3 people, available mid-Wave 2)
**Hiring profile:** AI engineers, prompt engineers, evaluation specialists.
**Owned systems:** Agent plane is a separate deployable. Does not exist in Wave 1.
**Status:** Not staffed during Wave 1. Preparations begin Week 65.

**Why Wave 1 has no agents:** Because agents are only valuable if the deterministic core is already bulletproof. Building agents first would corrupt priorities.

---

### Squad 8 — Assurance (5 people)
**Hiring profile:** Security engineers, compliance engineers, QA engineers, reliability engineers.
**Owned systems:** CI enforcement, security testing, tenant isolation fuzzing, compliance evidence, continuity procedures, game-days.
**Starts:** Week 1 (runs in parallel with all squads).

**Week 1 kickoff agenda:**
- Dependency-cruiser rules for Law 1 (no LLM in core)
- Architectural test suite (Law 2: manual path first, intent registry validation)
- Lint rules (Law 4: no floating-point money/time)
- RLS fuzz suite (Law 5: cross-tenant isolation)
- Golden dataset infrastructure (Law 6: coverage reporting)
- Signature verification for policy and Decision Records (Law 7)
- **L3 test suite (Law 8):** CI runs every test twice — normal, and with Agent Plane scaled to zero + model endpoints blackholed. Both must pass identically.
- SOC 2 readiness (audit prep, control evidence gathering)

**First deliverable (end of Week 4):**
```
- All 10 Laws enforced in CI
- Nightly RLS fuzz suite running
- L3 test harness (infrastructure to blackhole model endpoints + scale Agent Plane to zero)
- Evidence logs for SOC 2 controls
```

**Escalation points:** Any CI failure is immediate (build stops). Any RLS leak is security incident (pages on-call). L3 test failure blocks release.

---

## PART 3: OPERATIONAL CADENCE

### Daily Standup (8:30am PT, 15 min)
**Attendees:** All squad leads + CTO
**Format:**
- One blocker per squad (if none, "clear")
- One at-risk delivery (if none, "green")
- One escalation or question

**If escalation:** CTO makes decision in real-time or flags for office hours (same day).

### Weekly Sync (Tuesday 10am PT, 1 hour)
**Attendees:** Squad leads, product lead, CEO
**Agenda:**
1. Wave 1 progress against milestones (5 min)
2. Blockers (if any) + decisions needed (10 min)
3. Metrics dashboard review (10 min — see Part 4)
4. Risk review (see Part 5)
5. Any ADRs filed that week (5 min, context only)

### Bi-weekly All-Hands (Thursdays 3pm PT, 30 min)
**Attendees:** All engineers + design + product + ops
**Agenda:**
1. Major merged PRs (architecture or cross-squad impact only)
2. One "learn" from the week (a bug found, a pattern emerged, a decision we made)
3. Recruiting/hiring needs

### Office Hours (Async, documented)
**CTO holds 2-hour async window each Friday** for technical decisions that don't fit standups.
- Squad leads post questions in Slack thread by Thursday EOD
- CTO responds with written decision + reasoning + any follow-ups needed
- All decisions are logged in a decision ledger (source of ADRs)

---

## PART 4: METRICS & EXECUTIVE DASHBOARD

The CEO will see this every Friday. The metrics are real-time, from CI.

### Dashboard Components

#### 1. Build Health
```
[Metric]              [Target]    [Current]  [Trend]
─────────────────────────────────────────────────────
Laws enforced        10/10        10/10      ✓
CI pass rate         ≥98%         99.2%      ✓
Nightly fuzz pass    ≥99%         100%       ✓
RLS leak incidents   0            0          ✓
```

#### 2. Delivery Milestones (Wave 1, Months 0–18)
```
[Milestone]                    [Target]    [Status]    [ETA]
─────────────────────────────────────────────────────────────
Ledger v0.1 + RLS            Week 6      On track    2 Sep
Control Gate v0.1            Week 10     On track    1 Oct
Policy DSL + golden v1       Week 14     On track    29 Oct
Design System v1             Week 18     On track    26 Nov
Employee master              Week 22     On track    23 Dec
Leave accrual                Week 34     Not yet     TBD
Payroll (first country)      Week 42     Not yet     TBD
Parallel-run engine          Week 52     Not yet     TBD
L3/L4 fully operational      Week 70     Not yet     TBD
Customer 3-cycle sign-off    Week 78     Not yet     TBD
```

#### 3. Squads at a Glance
```
[Squad]                  [Headcount]  [On Schedule]  [Blockers]
──────────────────────────────────────────────────────────────
Squad 0 — Kernel         8            ✓              None
Squad 1 — Policy         6            ✓              Rust expertise (hiring)
Squad 2 — Workforce      5            Not started    Waiting for Gate
Squad 3 — Time & Leave   6            Not started    Waiting for DS v1
Squad 4 — Payroll        7            Not started    Waiting for accrual
Squad 5 — Experience     7            ✓              None
Squad 6 — Integration    4            Not started    Waiting for schemas
Squad 8 — Assurance      5            ✓              None
───────────────────────────────────────────────────────────
Total: 48 headcount
```

#### 4. Code Metrics
```
[Metric]                   [Target]      [Current]
──────────────────────────────────────────────────────
Test coverage (core)       ≥95%          87% (ramp-up)
Test coverage (policy)     ≥98%          42% (in progress)
Cyclomatic complexity      ≤8 (avg)      6.2
Dependency bloat           ≤20 (core)    12
Vendored deps              0             0
```

#### 5. Golden Dataset Coverage
```
[Domain]                   [Rules]  [Tested]  [%]     [Status]
──────────────────────────────────────────────────────────
Leave accrual              47       47        100%    ✓
Tax & contributions        0        0         —       Not started
Overtime                   0        0         —       Not started
Benefits eligibility       0        0         —       Not started
```

#### 6. Escalation Log (this week)
```
[Date]  [Squad]  [Issue]                          [Status]      [Resolution]
───────────────────────────────────────────────────────────────────────────
8/29    0        RLS query performance             Resolved      Index added
8/31    1        Rust/WASM build time               Escalated     CTO: use sccache
```

---

## PART 5: RISK REGISTER & MITIGATION

**Update:** Every Monday, Squad 0 lead.

| # | Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | Policy DSL proves insufficient for real tax rules | Medium | High | Create 3 reference jurisdiction packs by Week 10; discover gaps early | Squad 1 |
| 2 | Bitemporal ledger performance (query latency on as-of reconstruction) | Medium | Medium | Benchmark with 1M events by Week 8; pre-materialize common as-of queries | Squad 0 |
| 3 | WASM/Rust build pipeline fragility (takes >2 min per change) | Medium | Medium | Use sccache + incremental builds; target <30s by Week 8 | Squad 1 |
| 4 | Payroll golden dataset coverage (find tax rules we didn't model) | High | High | Work with external tax/payroll specialist as advisor from Week 20 | Squad 4 |
| 5 | Mobile offline sync race conditions (eventual consistency bug) | Medium | High | Build fuzz suite for conflict scenarios; test on low-bandwidth/loss network simulators | Squad 3 |
| 6 | Design System component library shipped but never adopted (squad inertia) | Medium | Medium | Require DS contribution for every PR; code review veto on new components | Squad 5 |
| 7 | Design partner customer not ready by Week 70 (availability, complexity) | Low | High | Start customer recruitment Week 30; run weekly working sessions Week 40+ | Product |
| 8 | RLS fuzz suite finds a leak late (compliance / security incident) | Low | Critical | Run nightly, fail the build immediately; establish incident response (24h fix SLA) | Squad 8 |
| 9 | Agent Plane "quarantine" breaks down under deadline pressure | Medium | Critical | CTO makes the call; no override without investor sign-off | CTO |
| 10 | Contractor payroll (gig workers, consultants) forces payroll redesign mid-Wave 2 | Low | High | Explicitly out of scope for H1; document assumption in Wave 1 | Product |

**How to read this:** Any Medium/High risk goes into the weekly sync. Squad lead has action.

---

## PART 6: PR REVIEW CHECKLIST

Every PR is reviewed against:

### Automatic (CI, no human needed)
- [ ] All 10 Laws pass (dependency-cruiser, lint, architectural tests)
- [ ] L3 test suite passes (with Agent Plane scaled to zero)
- [ ] Test coverage: core ≥95%, policy ≥98%, other ≥85%
- [ ] No commits to `docs/adr/` without an ADR follow-up
- [ ] Signature valid on any policy artifact

### Human Review (squad lead + CTO if cross-squad)
- [ ] One concern per PR
- [ ] Commit message follows conventional commit (feat/fix/refactor/test/docs + scope)
- [ ] Bitemporal correctness: if this touches history or effective dating, include a "as-of reconstruction" test
- [ ] Decision Records: if this is a material decision, is a Decision Record emitted?
- [ ] Manual path first: if this adds an agent capability, show the manual UI route in the same PR
- [ ] Definition of Done: for module completeness, is the checklist addressed?
- [ ] ADR: if this is architectural, was an ADR filed?

### Example: Squad 3 (time capture) PR adding "geofenced punch"
```
Title: feat(capture): geofenced punch via mobile

Automated checks:
  ✓ Laws 1–10 pass
  ✓ L3 suite passes (geofence logic works without agent plane)
  ✓ Test coverage: 92% (crew, needs +3%)

Human review:
  - One concern: mobile geofence accuracy
  - Commits follow conventional
  - Bitemporal: timestamp and location both recorded, can reconstruct as-of any date ✓
  - Decision Record: if geofence fails, system records fallback (manual entry) ✓
  - Manual path first: manager can override geofence decision in UI ✓
  - Module complete: not yet (still awaiting time-off reconciliation)
  - ADR: "Why geofence vs. time-card" filed in docs/adr/0037-geofence-model.md ✓

Approval: Ship it.
```

---

## PART 7: ESCALATION PATHS

### Tier 1: Daily (squad lead decides immediately)
- Lint rule violation (add exception + ADR)
- Test failure (add test, fix code)
- Performance regression <10% (optimize in place)

### Tier 2: Office hours (CTO decides same day)
- Law violation proposed as a "small exception"
- Cross-squad dependency blocked
- Policy DSL ambiguity
- Bitemporal edge case

### Tier 3: Weekly sync (CEO + CTO decide)
- Milestone at risk (trade-off discussion)
- Architectural redesign needed
- Hire plan change
- Customer blocking issue

### Tier 4: Investor escalation (CTO + CEO + CFO)
- Budget overrun >15%
- Runway impact
- Release delay >4 weeks
- Regulatory blocker

**How to escalate:** Write a one-page memo (context, options, recommendation, decision date needed). Post in Slack in #escalations. Tag the decision-maker. 24-hour turnaround.

---

## PART 8: SQUAD KICKOFF SCHEDULE

**Week 1**
- Mon: Squad 0 kickoff (8am PT)
- Tue: Squad 1 kickoff (8am PT)
- Tue: Squad 5 kickoff (10am PT)
- Wed: Squad 8 kickoff (8am PT)
- Thu: Full-team standup + all-hands

**Week 7**
- Squad 2 kickoff (prep ongoing, formal kickoff when Control Gate v0.1 ships)

**Week 11**
- Squad 2 kickoff

**Week 15**
- Squad 3 kickoff

**Week 27**
- Squad 4 kickoff

**Week 35**
- Squad 6 kickoff

**Week 65** (H2 planning begins)
- Squad 7 (Agent Plane) kickoff

---

## PART 9: TECHNICAL DECISIONS THAT WILL BE QUESTIONED

Pre-answer these before the questions come. File ADRs now.

**Q: Why Rust/WASM for payroll instead of TypeScript?**
A: Payroll outputs must be byte-identical forever. Rust's compile-time guarantees + WASM's sandboxing + fixed-point arithmetic give us that. TypeScript can't guarantee bit-for-bit replay across Node.js versions.

**Q: Why build the Design System first instead of shipping fast?**
A: If every squad designs its own components, we ship 8 different "approve buttons." That kills adoption. DS first, all squads contribute, consistency is default.

**Q: Why is the Agent Plane a separate deployable?**
A: Because Law 8 requires L3 tests to run with the Agent Plane scaled to zero. If agents live in the same container, we can't test that. Quarantine is the test infrastructure.

**Q: Why spend 70 weeks on a design-partner customer instead of 10 customers?**
A: Because the first customer will expose edge cases (multi-country tax, unusual org structure) that invalidate the architecture. Better to find that with one customer than to launch broken.

**Q: Why no consumption pricing for agents (like Workday)?**
A: Because HR directors cannot budget unknown agent spend. We absorb the inference cost, agents are included, costs are predictable. That's the competitive advantage.

**File ADRs now for:**
- 0001-rust-payroll-kernel
- 0002-bitemporal-ledger-design
- 0003-control-gate-authorization
- 0004-policy-dsl-syntax
- 0005-design-system-approach
- 0006-agent-plane-quarantine

---

## PART 10: HIRING MAP (Months 0–6)

We need 48 people in Wave 1. Here's the sequence.

| Month | Role | Count | Rationale |
|---|---|---|---|
| 0 | Engineering lead (Squad 0) | 1 | First hire, designs ledger |
| 0 | Principal engineer (Rust/WASM, Squad 1) | 1 | Risk mitigation (Rust expertise rare) |
| 0 | Design lead (Squad 5) | 1 | Start DS v1, long lead |
| 0 | Product/requirements | 1 | Gather design-partner demand |
| 1 | Backend engineers (Postgres, Node.js) | 4 | Squad 0 fills out |
| 1 | Payroll accountant (Squad 4 prep) | 1 | Start jurisdiction pack research |
| 1 | Security/compliance (Squad 8) | 2 | SOC 2 / RLS testing |
| 2 | Product designers | 4 | Design System build-out |
| 2 | Frontend engineers | 3 | React/mobile/kiosk UI |
| 3 | Payroll engineers (Squad 4) | 3 | Hire after tax/contribution rules modeled |
| 3 | Accountant/tax specialist (contract) | 1 | Advise on golden datasets |
| 4 | Core backend (Squad 2, 3) | 6 | Add when Control Gate stable |
| 5 | Integrations/data (Squad 6) | 2 | Prep connectors |

**Hiring principles:**
- Avoid "proven HRIS" experience (teaches bad habits)
- Look for "built fintech ledgers" or "tax compliance systems"
- Generalists > specialists (they'll all learn HRIS together)
- Remote-friendly (pay market rate for best people)

---

## PART 11: Week 1 KICKOFF AGENDA (Monday, Sep 2)

**Time:** 8:00–10:00am PT
**Attendees:** All founders, all initial hires, engineering leads

**8:00–8:10 — CEO: The ask** (2 min)
- We're building the only HRIS that works without AI.
- Three years ahead of the market.
- $25M to get there. You are the $25M.

**8:10–8:30 — CTO: The architecture** (5 min)
- Two planes: deterministic core (no AI ever), agent plane on top.
- If agents are deleted, the product still works.
- The ten laws are the guard rails.

**8:30–9:00 — Squad kickoffs in parallel** (30 min)
- Squad 0 (ledger): 8:30–8:50 (ledger design, RLS model)
- Squad 1 (policy): 8:50–9:05 (DSL design, golden datasets)
- Squad 5 (design): 8:30–8:50 (design language, component inventory)
- Squad 8 (assurance): 8:50–9:05 (CI rules, testing strategy)

**9:00–9:15 — Stack walk** (15 min)
- Repo structure, monorepo setup, branch strategy
- CI/CD pipeline (tests that must pass)
- Observability & metrics

**9:15–9:30 — Operational rhythm** (5 min)
- Daily standups: 8:30am, 15min, squad leads
- Weekly sync: Tuesdays 10am, all leads + CEO
- Escalation: office hours Friday, or weekly sync

**9:30–10:00 — Q&A and breakout time** (30 min)
- Open bar for "what if" questions
- Squad leads can line up 1-on-1s with CTO
- Product shows roadmap slides

---

## PART 12: GO/NO-GO CRITERIA FOR WAVE 1 EXIT

**On Week 78, we evaluate:** Can a customer run 3 consecutive error-free payroll cycles on KEEL at L3 (zero AI)?

### Mandatory checks
- [ ] Ledger: 100% RLS coverage, nightly fuzz suite passing, no leaks in 12 weeks
- [ ] Control Gate: all 10 Laws enforced, all intents have manual UI routes
- [ ] Policy: all rules golden-tested, coverage 100%, every tax/leave/contribution pack signed
- [ ] Payroll: 3 jurisdiction packs, matches incumbent to the cent, parallel-run engine validates all diffs
- [ ] Experience: all modules ship L3 state (no agent fallback), mobile/kiosk offline tested
- [ ] Continuity: L3 game-day passes weekly, L4 procedures documented and drilled
- [ ] Documentation: migration guides, runbooks, architecture docs
- [ ] Design partner: ready to run, data migrated, team trained, parallel runs scheduled

### If any check fails
- **If <8 weeks remain:** Slip release (next 8-week cohort)
- **If 8+ weeks remain:** Fix the gap, re-baseline, continue
- **If it's a Law violation:** All hands on deck, fix immediately, no workaround

---

## PART 13: WHAT HAPPENS AFTER WEEK 78

Assuming GO:

**Week 79–86:** Design-partner payroll runs (3 cycles, observed by CTO)
- Results published internally every Friday
- Any variance >1 cent investigated to a rule/policy version mismatch
- Customer trained on escalation procedures

**Week 87–104:** Second and third design-partner customers (parallel)
- Each customer different geography (expand to 2–3 jurisdictions)
- Each customer different org structure (multi-branch, matrix org)
- Migration accelerators refined

**Week 104–130:** Hardening and H2 prep
- Observability dashboards built
- Runbooks finalized
- Squad 7 (Agent Plane) staffing begins
- H2 roadmap locked

**Wave 1 success condition:** 3 reference customers, all profitable, all running at L3, all pushing back on "when do agents launch?"

---

## END OF PLAYBOOK

**Questions?** File an ADR (docs/adr/) or escalate in office hours.

**Owner:** CTO. Last updated: $(date).
