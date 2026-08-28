# KEEL — The Agentic HR Operating System
## Part 2 — Vision, Architecture & Strategy

**Working codename:** KEEL
**Positioning line:** *Agents on top. Deterministic core underneath.*
**Document status:** Founding strategy document. Companion to Part 1 (Research), Part 3 (Module & Continuity Matrix), Part 4 (Investor Deck).

---

## 1. Vision

**In ten years, every organisation will run a workforce of humans and agents. The system that keeps that workforce paid, compliant, and accountable will be the most critical piece of business software a company owns — and it will have to be right every time, whether or not the AI is working.**

KEEL is that system.

We are not building an AI HRIS. We are building the HR Operating System that agents run *on* — a deterministic, bitemporal, policy-compiled kernel that computes pay, entitlements and obligations exactly and identically every time; and above it, a governed agent plane that does the reasoning, the drafting, the anticipating and the explaining.

The two planes are separated by a hard boundary. Agents never compute payroll. Agents never write to the ledger directly. Every action an agent takes is a transaction a human could have made through the same UI, validated by the same rules, recorded in the same log, and reversible by the same mechanism.

**This is why we are five years ahead: not because our agents are better, but because ours are the only ones you can safely turn off.**

---

## 2. The strategic insight

Three facts, taken together, define the opportunity.

**Fact 1: Every incumbent has bolted agents onto a batch-era record store.** Workday, SAP, Oracle, UKG and Dayforce have all shipped agents in the last four quarters. None changed the substrate. Their agents are smarter API clients.

**Fact 2: The market has already learned that ungoverned agents fail.** Over 40% of agentic projects forecast to be cancelled by end-2027 — for cost, unclear value, and inadequate risk controls. Deployment breadth near 80%, production reach 10–15%. Only ~6% of companies fully trust agents in core processes. The failures are governance failures, not model failures.

**Fact 3: HR is the highest-stakes, most-regulated place an agent will ever act.** Pay, promotion, discipline, termination. EU AI Act Annex III. GDPR Article 22. Works councils. Wage-and-hour litigation. This is where "the AI made a mistake" becomes a legal filing.

**The synthesis:** the winning architecture in HR is not the most autonomous one. It is the one where autonomy is *bounded by construction* — where the blast radius of any agent error is a reversible transaction rather than a corrupted state, and where removing the agents entirely leaves a complete, competitive HRIS standing.

Every competitor's continuity story is "our AI is very reliable." Ours is "our AI is optional."

---

## 3. Architecture: the Two-Plane Model

```
┌──────────────────────────────────────────────────────────────────────┐
│  EXPERIENCE PLANE                                                     │
│  Web · Mobile · Kiosk · Offline · Chat · Voice · Email · Chat-ops     │
│  Every function reachable through conventional UI. No AI-only paths.  │
└──────────────────────────────────────────────────────────────────────┘
                    ▲                              ▲
                    │ (human)                      │ (agent-proposed)
┌───────────────────┴──────────────────────────────┴───────────────────┐
│  AGENT PLANE  — probabilistic, replaceable, revocable                 │
│  ┌────────────┬────────────┬────────────┬────────────┬────────────┐  │
│  │ Domain     │ Orchestr-  │ Agent      │ Budget &   │ Evaluation │  │
│  │ Agents     │ ator       │ Registry   │ Rate Gov.  │ Harness    │  │
│  └────────────┴────────────┴────────────┴────────────┴────────────┘  │
│  Model-agnostic · MCP client + server · signed A2A cards              │
└──────────────────────────────────────────────────────────────────────┘
                    │  proposes ONLY typed Transaction Intents
                    ▼
╔══════════════════════════════════════════════════════════════════════╗
║  THE CONTROL GATE  — the hard boundary                                ║
║  Authorisation · Policy validation · Segregation of duties            ║
║  Autonomy-level check · Budget check · Human approval routing         ║
║  Decision Record generation · Deterministic simulation before commit  ║
╚══════════════════════════════════════════════════════════════════════╝
                    │  validated Transactions only
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DETERMINISTIC PLANE  — the Keel. No LLM ever executes here.          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Bitemporal Employment Ledger (event-sourced, immutable)        │  │
│  │ Policy Engine (compiled rules: pay, leave, time, eligibility)  │  │
│  │ Calculation Engines (payroll, accrual, costing, entitlement)   │  │
│  │ Workflow & Approval Engine (deterministic state machines)      │  │
│  │ Tenancy & Authorisation Kernel (group/entity/branch/role)      │  │
│  │ Scheduler (cutoffs, cycles, statutory calendars, batch jobs)   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.1 The Bitemporal Employment Ledger

The core persistence model. Every fact carries two time dimensions:

- **Valid time** — when the fact was true in the world (effective date of the promotion)
- **Transaction time** — when the system came to believe it (when HR keyed it in)

This is not an academic nicety. It is the only way to answer the questions that HR is actually asked:

- *"What was this employee's pay rate on 14 March, and what did we believe it was when we ran the March payroll?"*
- *"Recompute Q1 payroll under the policy version in force at the time, then under the corrected version, and show me the delta per employee."*
- *"Show every state this employee record passed through, who changed it, and under what authority."*

Everything is an append-only event. Nothing is updated in place. Nothing is deleted. Corrections are compensating events. This gives us, for free:

- Retroactive payroll that is *derived*, not patched
- Complete audit trail with no separate audit table to drift out of sync
- Point-in-time reporting and "as-of" org charts
- **Agent action replay and reversal** — the single most important property for safe autonomy
- Regulatory evidence that is a byproduct of operation rather than a reporting project

### 3.2 Policy-as-Code

HR policy — leave accrual, overtime rules, shift differentials, tax withholding, benefit eligibility, statutory contributions, probation rules, notice periods — is expressed in a versioned, typed, declarative policy language, compiled to an executable rule graph.

**The critical discipline:** an LLM may *author* a candidate policy. It may *explain* a policy. It may *simulate* a policy change. It never *executes* one. The compiler validates. The deterministic engine runs. Between the model and the money there is always a compiler, a test suite, and a human sign-off.

Every policy artifact is:
- **Versioned** — effective-dated, immutable, with full supersession lineage
- **Tested** — golden datasets per jurisdiction; no policy ships without passing
- **Signed** — cryptographically attributable to an author and approver
- **Explainable** — every calculated figure traces to the specific rule and version that produced it
- **Simulatable** — dry-run against live population before activation

Both the manual path and the agent path execute the *same compiled policy*. This is what makes the fallback genuinely equivalent rather than a degraded stub: there is only one implementation of the rules.

### 3.3 The Control Gate

The boundary between planes, and the most important component in the system.

Agents cannot call the database, the payroll engine, or the workflow engine. They can only emit a **Transaction Intent** — a typed, schema-validated proposal. The Gate then:

1. **Authenticates** the agent against its own identity (never a shared service account, never a static credential — short-lived, scoped, per-agent)
2. **Authorises** against the agent's entitlement scope in the tenancy kernel
3. **Checks autonomy level** for this transaction class in this tenant, entity and branch
4. **Checks budget** — token, cost, and action-rate ceilings
5. **Validates** against compiled policy — the same validation a human submission passes
6. **Simulates** deterministically and attaches the projected effect
7. **Routes for human approval** if the autonomy level requires it, presenting the simulation, not the prompt
8. **Executes** as an ordinary transaction, indistinguishable in the ledger from a human one except for its provenance stamp
9. **Emits a Decision Record**

A useful test of the design: **if we deleted the entire agent plane, the Control Gate would still be the correct API for the manual UI.** It is not an AI safety wrapper. It is the transaction boundary, which agents happen to also use.

### 3.4 Decision Records

Every material HR decision produces a signed, immutable Decision Record containing:

- The decision and its subject
- Every input considered, with provenance
- The policy version applied
- Whether an agent was involved; if so, which agent, which model, which version, which prompt template
- The confidence and the alternatives considered
- The human reviewer's identity, what they saw, what they changed, and how long they spent
- The rationale, in natural language, attributable to whoever wrote it
- A cryptographic hash chained to the preceding record

**Why this is a product, not a log:** the EU AI Act deployer obligations require clear explanations of the AI's role and logic available to affected persons, plus records showing who reviewed AI-assisted decisions and what they considered beyond the AI's output. That is a description of this artifact. We ship it as a feature. Competitors will ship it as a services engagement.

The same record wins wage claims, satisfies works councils, survives tax audits, and answers subject access requests. Compliance is not a module — it is exhaust.

### 3.5 The Workforce Register — humans and agents in one model

Agents are onboarded like employees:

| Employee concept | Agent equivalent |
|---|---|
| Employment contract | Agent charter: scope, permitted transaction classes, autonomy ceiling |
| Manager | Accountable human owner (named, not a team) |
| Cost centre & budget | Cost centre, token budget, action-rate limit |
| Job description | Capability manifest (signed A2A card) |
| Access entitlements | Scoped, short-lived credentials per transaction class |
| Probation | Shadow mode: proposes, never executes, scored against human decisions |
| Performance review | Evaluation harness: accuracy, override rate, escalation rate, cost per outcome |
| Disciplinary record | Incident log; automatic autonomy demotion on threshold breach |
| Termination / offboarding | Revocation with full credential teardown and action replay for review |
| Org chart | Agents appear in the org chart, under their accountable human |

Workday's Agent System of Record is the closest thing in market and it is a register beside the HR system. Ours is *inside* it, using the same lifecycle machinery — which means an agent's cost lands in the same cost centre report as a contractor's, and an agent's misconduct follows the same investigation workflow as an employee's.

### 3.6 Multi-tenant / multi-company / multi-branch

Tenancy is a first-class dimension, not a filter.

```
Platform
 └─ Tenant (customer, own encryption keys, own residency)
     └─ Group (corporate group / holding structure)
         └─ Legal Entity (own statutory profile, tax ID, currency, calendar,
            payroll cycles, policy overlay, data residency, retention rules)
             └─ Branch / Establishment (own working-time rules, shift patterns,
                local statutory registrations, holiday calendar, cost centres)
                 └─ Org Unit → Position → Assignment
```

**Design commitments:**

- **Policy inheritance with explicit override.** Group policy cascades; entity and branch may override; every override is versioned and attributable. No silent divergence.
- **Cross-entity employment as a first-class case.** Secondments, dual employment, shared services, inter-entity cost recharge, expat assignments and split payroll are modelled, not worked around.
- **Consolidated operation with strict isolation.** A group HR leader sees the whole workforce; a Philippine entity's payroll administrator sees only what their statutory role permits — enforced at the kernel, not the query layer.
- **Per-entity data residency and encryption keys.** Not per-tenant. Per-entity. This is the requirement that will disqualify most competitors in the segments we target.
- **Row-level security enforced in the kernel**, with tenant isolation verified by continuous automated tests in CI, not by convention.

41% of organisations cite multi-EIN and multi-entity structure as a blocker adding 6–12 months to implementations. We treat that as the beachhead, not the edge case.

---

## 4. The Continuity Ladder — the differentiator nobody sells

The founding requirement: **if AI is unavailable, degraded, disabled, deprecated, or legally prohibited, the customer must still run their entire HR operation.**

We turn that requirement into a published, contractual product feature.

### The five levels

| Level | Name | What operates | Trigger | Customer experience |
|---|---|---|---|---|
| **L0** | **Autonomous** | Agents execute within charter, budget and autonomy ceiling. Humans notified, can reverse. | Normal, for pre-approved transaction classes | Work happens before you ask |
| **L1** | **Supervised** | Agents propose with deterministic simulation attached; human approves in-flow. | Default for material decisions | One-click approve, full context |
| **L2** | **Assisted** | Agents draft, summarise, explain, search. No transaction authority. | Elevated risk, budget near ceiling, model drift detected, customer preference | Copilot, not colleague |
| **L3** | **Deterministic** | **Zero LLM involvement.** Full HRIS: all modules, all workflows, all calculations, all reports, all batch jobs, all integrations. | LLM outage, provider incident, customer kill-switch, legal hold, regulatory order | A complete, competitive HRIS — indistinguishable from a conventional best-in-class system |
| **L4** | **Continuity** | Read-only core plus offline operation: cached authoritative data, offline time capture with buffered sync, printable statutory packs, emergency payroll from last-good validated state, break-glass approvals with dual control. | Regional infrastructure failure, network partition, disaster recovery | Payroll still runs. People still get paid. |

### The design rules that make this real

1. **No capability exists only in the agent plane.** If an agent can do it, a human can do it through the UI, and the code path is the same one. Enforced by architectural test: every Transaction Intent type must have a corresponding manual UI route, verified in CI.
2. **No calculation depends on a model.** Payroll, accruals, entitlements, costing, statutory contributions and tax are compiled deterministic policy. Full stop.
3. **The kill switch is instant, scoped and audited.** Per tenant, entity, branch, module, agent class or individual agent. Sub-second. Requires two approvers above L1. Logged as a first-class event.
4. **L3 is continuously tested, not theoretically available.** Weekly automated L3 game-days in production-equivalent environments. A monthly L3 window in every customer's sandbox. Results published to the customer.
5. **L4 has a physical fallback.** Statutory packs — payroll register, attendance sheets, leave balances, bank instruction files, statutory return drafts — generate as signed PDFs and CSVs on every cycle, whether or not anyone asks. If the platform is unreachable, the last cycle's operational pack is already in the customer's hands.
6. **Degradation is announced, never silent.** A persistent, visible mode banner. Customers always know which level they are at and why.

### The commercial expression

- **The Continuity SLA.** Contractual availability commitments *per level*, with L3 carrying the highest commitment because it has the fewest dependencies.
- **Independent attestation.** Annual third-party verification that L3 operation is complete and L4 procedures work. This becomes the document a competitor cannot produce.
- **The Continuity Clause.** Standard contract language: if the customer disables AI entirely, permanently, for any reason, the platform remains fully warranted and the price does not change for the deterministic tier.

**Why competitors cannot copy this quickly:** their agents are not constrained to a transaction boundary, their calculations are increasingly model-assisted, and their record stores are not replayable. They can announce a continuity mode. They cannot certify one.

---

## 5. Module catalogue — complete HRIS coverage

Every module ships with a full manual path (L3-complete) before any agent capability is built on it. **Manual first is a build rule, not a preference.** The complete module-by-module specification, with manual path, agent capability and degradation behaviour for each, is in Part 3 (the Module & Continuity Matrix workbook).

### Domain 1 — Foundation & Tenancy
Tenant administration · Corporate group registry · Legal entity master (statutory profile, tax registrations, currency, fiscal calendar) · Branch/establishment master · Organisation structure (versioned, effective-dated) · Position management · Job architecture & job catalogue · Grade/band structures · Cost centre & GL dimension mapping · Work calendars & holiday calendars · Currency & FX · RBAC/ABAC authorisation · Delegation & proxy · Segregation-of-duties matrix · Audit & event log · Data residency & retention policy · Encryption key management

### Domain 2 — Core HR
Employee master (bitemporal) · Personal, contact and dependent data · Job & assignment history · Contract management · Document vault with retention rules · Government IDs, visas, work permits and expiry tracking · Professional licences & certifications with renewal · Asset assignment · Emergency contacts · Letter & document generation · Org chart (as-of any date) · Employee self-service · Manager self-service · Mobile, kiosk and offline clients · Bulk data operations · Data import/export & migration tooling

### Domain 3 — Talent Acquisition
Manpower planning & requisition · Budget & headcount approval chain · Job posting & multi-board distribution · Branded career site · Referral programme · Candidate CRM & sourcing · Applicant tracking pipeline · Interview scheduling & panel management · Structured scorecards · Assessments & tests · Offer management, approval and versioning · Background verification orchestration · Pre-boarding portal · Recruitment analytics & funnel reporting · Agency/vendor management

### Domain 4 — Onboarding, Movement & Offboarding
Onboarding checklists & task orchestration · IT/asset/access provisioning integration · Digital forms & e-signature · Statutory registrations for new joiners · Probation management & confirmation · Internal transfers, promotions, demotions · Secondments & cross-entity movement · Reorganisation & mass change tooling · Resignation & notice management · Clearance workflow · Exit interviews · Final settlement calculation · Rehire eligibility · Alumni management

### Domain 5 — Time & Attendance
Time capture: biometric, RFID, geofenced mobile, kiosk, web, offline buffer · Device management & connector library · Timesheets (daily, weekly, project) · Shift patterns & rotation templates · Rostering & schedule optimisation · Shift bidding, swapping and open-shift marketplace · Overtime rules & authorisation · Break and meal-period compliance · Attendance regularisation · Late/early/absence tracking · Working-time-directive and local statutory limits · Project & activity time allocation · Labour cost accrual

### Domain 6 — Leave & Absence
Leave type & policy configuration · Accrual engine (proration, tenure bands, carry-forward, expiry, encashment) · Statutory leave packs by jurisdiction · Leave request, approval and cancellation workflows · Leave calendar & team visibility · Blackout and minimum-staffing rules · Long-term leave of absence · Parental, medical and jurisdiction-specific programmes · Medical certificate management · Return-to-work workflow · Absence pattern reporting · Leave liability valuation & GL provisioning

### Domain 7 — Payroll
Multi-country, multi-entity, multi-currency payroll · Pay element & pay component library · Earnings, deductions, benefits-in-kind · Gross-to-net calculation engine (deterministic, versioned) · Tax engine & jurisdiction rule packs · Statutory contributions (social security, provident funds, levies) · Retroactive processing (derived, not patched) · Off-cycle and supplementary runs · Arrears management · Garnishments & court orders · Loans, advances & salary deductions · Final settlement · Payslip generation & multi-language delivery · Bank file & payment instruction generation · Payment reconciliation · GL posting & multi-dimensional cost allocation · Payroll register & control reports · Parallel-run comparison engine · Year-end processing & statutory filings · Payroll approval & sign-off workflow with dual control

### Domain 8 — Benefits & Rewards Administration
Benefit plan design · Eligibility rule engine · Open enrolment & life-event processing · Dependent management & verification · Carrier/provider feeds · Flexible benefit plans & allowance baskets · Insurance administration · Retirement, pension and provident fund administration · Claims & reimbursement workflow · Expense integration · Wellness programmes · Benefit cost reporting & employer contribution analysis

### Domain 9 — Compensation Management
Pay structures, ranges and grades · Market benchmarking integration · Annual merit & increment cycles · Budget allocation and cascade · Manager compensation worksheets with guardrails · Bonus & incentive plans · Sales commission engine · Long-term incentive & equity tracking · Off-cycle adjustments · Pay equity analysis · Pay transparency reporting (EU Directive-ready) · Total rewards statements · Compensation approval chains

### Domain 10 — Performance & Goals
Goal and OKR management with cascade · Continuous feedback & check-ins · Review cycle configuration (annual, quarterly, project, probation) · 360 / multi-rater feedback · Calibration sessions & distribution management · Rating models & competency frameworks · Performance improvement plans · Recognition & praise · Manager coaching prompts · Performance analytics & rating distribution

### Domain 11 — Learning, Skills & Succession
Learning management (courses, paths, blended, ILT/VILT) · Content authoring & third-party library integration · Compliance and mandatory training with attestation · Certification and licence tracking with renewal enforcement · Skills ontology & taxonomy management · Skills inference and validation · Career pathing · Individual development plans · Mentoring & coaching programmes · Internal talent marketplace (gigs, projects, internal mobility) · Succession planning & talent pools · 9-box and talent review · Learning analytics & training ROI

### Domain 12 — Employee Relations, Compliance & Safety
Case management & HR ticketing · Grievance handling · Disciplinary process management · Investigation workspace with restricted access · Whistleblower channel · Policy library, distribution and acknowledgment tracking · Health & safety incident reporting · Occupational injury & illness logs · Risk assessments · Union & collective bargaining agreement management · Works council consultation tracking · Contingent workforce & vendor management · Compliance calendar & statutory obligation tracker · Regulatory reporting library

### Domain 13 — HR Service Delivery & Experience
Knowledge base with entity/branch scoping · Service catalogue & request routing · SLA management & escalation · Document generation & templating · E-signature · Employee communications & announcements · Surveys, engagement and eNPS · Pulse and lifecycle surveys · Onboarding/offboarding experience journeys · Multi-language and accessibility support · Employee helpdesk analytics

### Domain 14 — Analytics, Planning & Reporting
Operational report library (200+ prebuilt) · Ad-hoc query builder · Dashboards by role · Headcount planning & establishment control · Workforce planning & scenario modelling · Labour budget & forecast · Attrition and retention analytics · Diversity, equity and inclusion reporting · ESG and human capital disclosure reporting · Statutory report packs by jurisdiction · Benchmarking · Data warehouse sync & reverse ETL · Point-in-time and as-of reporting (native, from the bitemporal ledger)

### Domain 15 — Platform, Integration & Extensibility
Public REST and GraphQL APIs · Event streaming & webhooks · Integration hub with prebuilt connectors (ERP, GL, banking, benefits carriers, background check, job boards, identity providers, biometric devices, collaboration tools) · SSO (SAML/OIDC) & SCIM provisioning · Low-code workflow and form builder · Custom fields and objects · Sandbox and release management · Migration accelerators from named incumbents · **MCP server exposing the HR ledger to customer-owned agents** · Agent registry and marketplace · Jurisdiction pack SDK · Partner/ISV programme

### Domain 16 — The Agent Plane (our layer, listed for completeness)
Agent registry & lifecycle · Agent charters & capability manifests · Autonomy-level policy per transaction class · Budget & rate governance · Evaluation harness & shadow mode · Model routing & fallback (model-agnostic) · Prompt and policy versioning · Decision Record store · Agent incident management · Agent cost accounting · Continuity Ladder controller & kill switch · Customer-facing agent observability

---

## 6. The agent portfolio

Not one assistant. A managed workforce of specialists, each with a charter, a budget, and an accountable human owner.

**Operations agents (highest ROI, lowest risk — build first)**
- **Payroll Preflight Agent** — reconciles time, leave, comp changes and joiners/leavers against the coming cycle; flags anomalies against historical variance; produces a pre-run exception pack. *Never computes pay.*
- **Data Integrity Agent** — continuously audits master data against policy and statutory requirements; opens correction transactions for approval.
- **Compliance Watch Agent** — monitors jurisdiction rule changes, maps them to affected entities and populations, drafts policy diffs for human review and compiler validation.
- **Document Agent** — generates letters, contracts and statutory forms from templates and ledger data, with citation to source fields.

**Service agents (highest volume)**
- **Employee Answers Agent** — policy, pay, leave and benefits questions, answered from the customer's own policy versions with citation to the governing clause and the employee's own data. Never guesses; escalates.
- **Case Triage Agent** — classifies, routes, prioritises and drafts responses for HR cases.
- **Onboarding Concierge** — orchestrates the joiner journey across systems and chases blockers.

**Manager agents**
- **Manager Briefing Agent** — team-level insight, upcoming actions, approval queue with context.
- **Scheduling Agent** — proposes rosters against demand, skills, availability, cost and statutory limits; the deterministic scheduler validates and the manager approves.
- **Performance Preparation Agent** — assembles evidence for review conversations. Drafts nothing evaluative without human authorship.

**Talent agents**
- **Sourcing Agent**, **Screening Agent** (structured, criteria-explicit, bias-tested, always L1 minimum), **Interview Logistics Agent**, **Offer Modelling Agent**.

**Analyst agents**
- **Workforce Analyst Agent** — natural-language querying over the bitemporal ledger, returning deterministic results with the query shown.
- **Scenario Agent** — models restructures, pay reviews, and headcount plans by running the deterministic engines, not by estimating.

**Hard constraints across the portfolio**
- Screening, performance, promotion, discipline and termination agents are **capped at L1** and cannot be raised to L0 by configuration. This is a code-level constraint, not a policy setting.
- No agent may act on protected-characteristic data unless the transaction class explicitly requires it and a documented lawful basis is attached.
- Every agent output that will be shown to an employee carries a visible AI-involvement disclosure.

---

## 7. Business model

### 7.1 Pricing architecture

Three lines, deliberately simple, and deliberately the opposite of consumption pricing.

**1. Deterministic Core — PEPM, all modules included**
Every module in Section 5. Unlimited manual use. Full L3 capability. This is the entire product a conventional HRIS buyer is purchasing, priced against the market it replaces.

*Indicative: $9–14 PEPM mid-market, $6–9 at 10,000+ employees. Modules are not sold separately. The bundle is the point — it removes the upsell conversation that makes incumbent renewals adversarial.*

**2. Agent Plane — flat PEPM, not metered**
Fixed price. No credits, no tokens, no consumption surprise. We absorb inference cost variability because our deterministic core does the expensive computation, our agents are narrow, and our model routing is ours to optimise.

*Indicative: $5–8 PEPM. Sold as a whole, not per agent.*

**This is the sharpest commercial weapon in the deck.** Workday's Flex Credits mean an HR director cannot forecast next year's agent spend. Oracle's answer is to make agents free and therefore strategically secondary. Ours is a predictable line item for a product with a roadmap.

**3. Jurisdiction Packs — per entity, per country, per year**
Statutory payroll, tax, leave and reporting rules as versioned, signed, tested artifacts. Bought per legal entity. Partner-buildable via the SDK with revenue share.

*Indicative: $2,000–12,000 per entity per country per year depending on complexity.*

**Plus:** implementation (fixed-fee, capped, with published median timelines), marketplace revenue share (20–30%), and premium continuity attestation for regulated buyers.

### 7.2 Unit economics logic

- **Blended $16–24 PEPM** for a full-stack customer — deliberately positioned below enterprise suites and at parity with modern mid-market once modules are counted honestly.
- **Gross margin target 76–82%.** Lower than classic SaaS because of inference cost; protected by the deterministic core carrying the compute load and by aggressive small-model routing for the ~80% of agent calls that don't need frontier capability.
- **Implementation as a loss leader, capped at 0.35× first-year ACV** and delivered by us for the first 50 customers to build the migration accelerators that later make it partner-deliverable.
- **The pre-sale parallel run is charged to CAC, not implementation.** It is real delivery work given away to invert the risk of the sale. Modelling it anywhere else would flatter the numbers.
- **NRR target 125%+** driven by entity expansion (groups acquire), jurisdiction packs (groups expand), and agent-tier attach.
- **Target gross-margin payback under 12 months.** The illustrative model in Part 3 produces ~8 months on a 4,000-employee, 9-entity reference customer. Note that the same model produces an LTV:CAC near 10× — a ratio that high usually means under-investment in distribution rather than out-performance, and we would treat it as a signal to spend more.

### 7.3 Why bundling everything is right here

The incumbent playbook is to unbundle modules and monetise the renewal. It produces the highest-friction relationship in enterprise software. Our bet: a group with 14 entities in 6 countries will pay a fair blended rate for *everything working together*, and the expansion vector is entities and jurisdictions, not modules. That aligns our revenue with our customers' growth rather than with their frustration.

---

## 8. Go-to-market

### 8.1 Beachhead: multi-entity groups in high-complexity, under-served geographies

**Target profile**
- 500–25,000 employees
- 3+ legal entities, often 10+ branches
- 2+ countries, or one country with genuinely complex statutory requirements
- Currently running: a mid-market HRIS they've outgrown, spreadsheets bridging the gaps, and a separate payroll bureau per country
- Sector bias: manufacturing, BPO/shared services, retail chains, healthcare networks, logistics, construction, financial services

**Geographic sequence**
1. **ASEAN + Middle East (Year 1–2).** Philippines, Indonesia, Vietnam, Malaysia, Singapore, UAE, Saudi. Rationale: dense multi-entity conglomerate structures, high statutory complexity, weak incumbent localisation, price sensitivity that punishes Workday and Oracle, and a large addressable base that Darwinbox has proved is winnable.
2. **India + broader APAC (Year 2–3).** Scale plays; Darwinbox is the competitor to beat on its home ground, and the fight is on architecture.
3. **EMEA (Year 3–4).** Entering on the compliance story into the EU AI Act and Pay Transparency window, with works-council-ready evidence as the wedge.
4. **North America (Year 4–5).** Enter through multinational groups already running us elsewhere, and through the mid-market upgrade path from HiBob/BambooHR/Paylocity.

**Why not start in the US:** ADP's payroll compliance moat is the deepest in the industry and the sales cycle is the most crowded. We earn the right to enter it with a proven multi-entity engine and reference logos, not with a pitch deck.

### 8.2 The wedge: Payroll Parallel Run as the sales motion

Do not sell a platform migration. Sell a **90-day parallel run**.

1. We ingest historical payroll and master data (migration accelerators do the work).
2. We run our deterministic engine alongside their current system for three cycles.
3. We produce a variance report, to the cent, per employee, per element, with every difference traced to a specific rule and policy version.
4. **We find their errors.** With one in five payroll cycles containing errors and ~15 corrections per cycle typical, we will find them.

This inverts the risk of the sale. The customer is not betting on a new vendor; the customer is running a free audit that either validates their incumbent or indicts it. Conversion economics on this motion should be far better than a conventional HRIS bake-off, and the artifact it produces — a payroll variance report — is the single most persuasive document that can be put in front of a CFO.

### 8.3 Channels

- **Direct** for groups above 2,000 employees.
- **Regional SI and payroll-bureau partners** — critically, we should recruit *incumbent payroll bureaus* as partners rather than fight them. A bureau running payroll for 200 SMEs is a distribution channel with the statutory expertise to build jurisdiction packs.
- **Jurisdiction Pack partner network** — local labour-law and tax firms build and maintain packs on our SDK, earning revenue share. This is how we get to 40+ countries without hiring 40 payroll teams, and it creates a partner ecosystem with a financial stake in our success.
- **Compliance-led content** — the EU AI Act and Pay Transparency windows create a two-year demand-generation runway on regulatory readiness. We should own the "what does your HRIS do when the AI is off" question as a category.

### 8.4 Land, expand, defend

**Land** on payroll + core HR + time for one country's entities.
**Expand** by entity (groups acquire), by country (jurisdiction packs), by module (the bundle means this is adoption, not upsell), and by agent tier.
**Defend** with the bitemporal ledger. After 24 months a customer's complete, replayable, audit-grade employment history lives in our ledger. That is a switching cost no feature can match — and unlike hostile lock-in, we can make the data fully exportable and still hold the position, because what they'd lose is the *replayability*, not the data.

---

## 9. Roadmap

### Horizon 1 — The Keel (Months 0–18)
**Goal: the best deterministic multi-entity HRIS in the target geographies. AI optional.**

- Bitemporal ledger, tenancy kernel, policy compiler, workflow engine
- Core HR, Time & Attendance, Leave, Payroll (3 jurisdictions), Benefits basics
- Full manual UI, mobile, kiosk, offline capture
- Control Gate and Decision Record infrastructure (built now, used later)
- Parallel-run comparison engine — the sales weapon
- Migration accelerators for 3 named incumbents
- L3 and L4 continuity operational and game-day tested
- **First 10 design partners live on payroll**

*Milestone: a customer runs three consecutive error-free payroll cycles with zero AI in the loop.*

### Horizon 2 — The Agent Plane (Months 12–36)
**Goal: governed autonomy that customers trust because they can switch it off.**

- Agent registry, charters, budgets, evaluation harness, shadow mode
- Operations and service agents (Payroll Preflight, Employee Answers, Case Triage, Data Integrity, Compliance Watch)
- Continuity Ladder controller, kill switch, mode banner, published SLA
- Talent Acquisition, Performance, Compensation, Learning modules
- MCP server — customers' own agents operate on our ledger
- 12 jurisdiction packs; Pack SDK opened to partners
- First independent continuity attestation
- **Target: 100+ customers, first eight-figure ARR**

*Milestone: a customer voluntarily runs a full month at L3 and reports no capability loss.*

### Horizon 3 — The Operating System (Months 30–60)
**Goal: the substrate for human-and-agent workforces.**

- Full Workforce Register: agents as managed workers with cost, performance and lifecycle
- Agent marketplace with third-party agents governed by our Control Gate
- Advanced planning: scenario modelling, skills-based workforce planning, org design
- 40+ jurisdiction packs, majority partner-built
- EU and North America entry at scale
- Agent-to-agent commerce: our agents transacting with customers', suppliers' and government systems' agents under signed, auditable mandates
- **Target: category leadership in multi-entity agentic HR; the reference implementation for governed agents in a regulated domain**

---

## 10. Moat

Ranked by durability.

1. **Architectural.** Bitemporal event sourcing plus deterministic policy compilation cannot be retrofitted. Incumbents would have to replace their persistence layer under a live installed base. This is a 5-year lead, not a 12-month one.
2. **Evidentiary.** Once a customer's Decision Records and replayable history live with us, we are the system of proof for their employment decisions. That is stickier than the data itself.
3. **Regulatory.** Being first to ship EU AI Act deployer obligations as product features — and first to hold an independent continuity attestation — creates a procurement checkbox we wrote.
4. **Jurisdiction pack network.** Partner-built, revenue-shared, versioned and tested. Each pack raises the barrier for the next entrant in that country, and the partners are financially committed to us.
5. **Golden dataset.** Every parallel run produces a validated corpus of real-world payroll edge cases per jurisdiction. This is the most valuable proprietary dataset in the business and it compounds with each deal.
6. **Trust brand.** The vendor whose AI you can turn off is a positioning no AI-first competitor can adopt without undermining their own narrative.

---

## 11. Organisation and hiring

**Founding principle:** this is an engineering-led company selling to a services-led market. The ratio should reflect that.

**First 25 hires (Series A):**
- **Platform engineering (8)** — bitemporal ledger, policy compiler, tenancy kernel. Hire distributed-systems and financial-ledger people, not HR-tech people.
- **Payroll & compliance engineering (5)** — the calculation engines and jurisdiction packs. Hire from payroll bureaus and statutory practice, not from product.
- **Agent engineering (4)** — the plane, the gate, the evaluation harness. Hire from AI infrastructure, and hold them to the discipline that they never touch the deterministic plane.
- **Product & design (3)** — the manual UI has to be genuinely excellent, because 32% average HRIS adoption is our real competition.
- **Customer/implementation (3)** — the first 50 implementations are R&D for the migration accelerators.
- **GTM (2)** — founder-led sales until 30 customers.

**Cultural rules worth writing down now:**
- Manual path ships before agent path. Always. No exceptions, no "we'll add the UI later."
- Every engineer runs an L3 game-day in their first month.
- Nobody ships a policy without a golden test dataset.
- The words "the model will handle it" require a written justification.

---

## 12. What could kill us

**The honest list. An investor who doesn't hear this from us will assume we haven't thought about it.**

1. **Scope.** A complete HRIS is genuinely enormous. Horizon 1 is 18 months of building before we can sell to anyone but design partners. Mitigation: the deterministic kernel makes each subsequent module cheaper, and we sequence by what payroll requires rather than by what a feature matrix requires.

2. **Incumbent bundling.** Oracle giving agents away is a preview. If suites make agents free and cut PEPM, our agent tier revenue compresses. Mitigation: we don't need the agent tier to be profitable in Horizon 1 — the deterministic core carries the P&L, and agents are the reason customers choose us over a legacy HRIS.

3. **A well-capitalised challenger reaches the same conclusion.** Rippling has the velocity and the capital; Dayforce under Thoma Bravo has the architecture and now the patience. Mitigation: speed and beachhead focus. We win the multi-entity emerging-market segment before either turns to look at it.

4. **Model economics move against fixed pricing.** AI prices have been rising through 2026. Mitigation: model-agnostic routing, aggressive small-model use for the 80% case, deterministic core absorbing the compute-heavy work, and pricing headroom built in from launch.

5. **Payroll is unforgiving.** One catastrophic payroll error at a reference customer is an existential brand event. Mitigation: parallel run before every go-live, dual control on every run approval, and L4 statutory packs so the customer is never without a payable output.

6. **Founder-market fit on statutory depth.** We are strong on architecture and weak, today, on the accumulated statutory knowledge that ADP has spent 75 years acquiring. Mitigation: acquire it through the jurisdiction pack partner network rather than trying to build it — and be honest that this is a partnership strategy, not a hiring one.

---

## 13. The one-paragraph version

*Every HR vendor is racing to add agents to systems that were never built to be audited, replayed, or safely automated — and over 40% of enterprise agent projects are being cancelled for exactly that reason. KEEL inverts the order. We are building the deterministic, bitemporal, multi-entity HR ledger first — a complete HRIS that computes payroll to the cent, explains every figure to the governing rule, and runs with no AI at all — and then putting a governed agent plane on top, where every agent action is a reversible transaction a human could have made, subject to budget, autonomy limits and an immutable decision record. The result is the only HR Operating System you can safely give autonomy to, because it is the only one you can safely take autonomy away from.*
