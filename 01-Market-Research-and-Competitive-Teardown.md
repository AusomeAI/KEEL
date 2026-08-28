# Agentic HRIS Operating System
## Part 1 — Market Research & Competitive Teardown

**Prepared:** August 2026
**Working codename:** **KEEL** — *Agents on top. Deterministic core underneath.*
**Status:** Internal research brief supporting the venture thesis, product strategy, and Series A materials.

---

## 0. Executive summary

The HR software market is in the middle of the largest architectural re-platforming since the move to cloud in 2008. Every major vendor has, in the last 18 months, announced agentic AI inside their HCM suite. Not one of them has changed the thing underneath.

That is the opportunity.

**Six findings drive the venture thesis:**

1. **The market is large, growing, and consolidating.** The HR applications market was roughly **$61.1B in CY2025**, with the ten largest vendors holding under half of it. The narrower HRIS segment is worth roughly **$19.9B in 2026** and is compounding at ~13.8% toward ~$37.8B by 2031. Fragmentation at this scale is unusual for a 20-year-old category, and it means no incumbent can defend on distribution alone.

2. **Every incumbent is retrofitting agents onto a batch-era core.** Workday, SAP, Oracle, UKG, Dayforce, ADP, and the mid-market challengers have all shipped or announced agents in the last four quarters. They are layering reasoning on top of record stores that were never designed to be replayable, bitemporal, or explainable to the cent. The agents are new; the substrate is not.

3. **Agentic projects are failing at scale, and the reasons are structural, not model-related.** Gartner's forecast that **over 40% of agentic AI projects will be cancelled by end-2027** has aged well: adoption is broad but production deployment sits in the low teens as a percentage. The named causes are escalating cost, unclear value, and inadequate risk controls — governance and operational failures, not capability failures. Gartner also estimated that only ~130 of the thousands of vendors claiming agentic capability actually deliver it ("agent washing").

4. **Trust, not capability, is the binding constraint in HR specifically.** HR agents touch pay, promotion, discipline, and termination. Only a small minority of organisations treat agents as identity-bearing entities in their security model; most run them on shared service accounts and static credentials, and a large majority reported confirmed or suspected agent security incidents in the past year. In a domain where a wrong action is a wage claim, a discrimination suit, or a works-council dispute, that is disqualifying.

5. **Regulation is about to make "explainable and reversible" a purchasing requirement, not a virtue.** The EU AI Act classifies employment AI — recruitment, task allocation, performance evaluation, promotion, termination — as high-risk. The Digital Omnibus (in force 27 July 2026) deferred the heaviest high-risk obligations to December 2027 and August 2028, but the transparency regime, the enforcement powers and the full penalty framework land from **2 August 2026**, and the obligation to inform and consult worker representatives before deploying high-risk AI already applies. Buyers are being told to procure for a 2027–28 audit today.

6. **Nobody sells continuity.** Every vendor markets what happens when the AI works. No vendor publishes what happens when it doesn't. In a system that must pay people on the 25th regardless of whether an inference endpoint is up, that is a gap you can build a company in.

**The thesis in one sentence:** build the HR Operating System where the deterministic system is the product and the agents are an accelerant — so that the platform is *strictly more correct, more auditable, and more available* than any AI-first competitor, and degrades to a fully functional manual HRIS without loss of capability.

---

## 1. Market sizing and structure

| Measure | Figure | Note |
|---|---|---|
| HR applications market | ~$61.1B (CY2025) | Broadest definition; includes payroll services |
| HCM software market | ~$58.7B (2024) → ~$81.1B (2029), ~6.7% CAGR | Suite-level view |
| HRIS market (narrow) | ~$19.9B (2026) → ~$37.8B (2031), ~13.8% CAGR | The segment we sell into |
| Top-10 vendor concentration | ~45.6% of HCM applications | Long tail is unusually deep |
| Typical mid-market price point | $15–40 PEPM for HRIS + payroll | $4–10 SMB, $30–100+ enterprise |
| First-year TCO multiplier | 1.5×–2.5× quoted subscription | Implementation, migration, integration |
| HR tech implementation failure | ~1 in 4 fail to meet expectations | Broader enterprise software: 50–75% |
| Average HRIS employee adoption | ~32% | The quietest number in the industry |

**Reading of the structure.** This is a market where the product is bought by HR and finance, paid for per head, priced opaquely, implemented badly, and adopted by a third of the workforce. The switching cost is real but not insurmountable — it is mostly data migration and payroll parallel-run risk, both of which are engineering problems we can attack directly.

**Where the money actually leaks.** EY's benchmark work put payroll error correction at up to ~$922K annually for a 1,000-employee company, with roughly one in five payroll runs containing an error and an average of ~15 corrections per cycle. Industry estimates put payroll non-compliance at ~$845 per employee per year once fines, back wages and remediation are counted. A platform that provably reduces payroll variance has a hard-dollar ROI story that does not depend on AI at all — which is exactly why it is the right wedge.

---

## 2. The top 10 vendor teardown

Ranked by relevance to our positioning rather than pure revenue. Where market share is cited, it is against the ~$61.1B HR applications market for CY2025.

### 2.1 Workday
**Position:** ~8.3% share (~$5.1B). The reference enterprise suite; increasingly mid-market via the Launch program targeting 500–3,500 employees.

**Agentic posture:** The most strategically coherent of the incumbents. Workday reframed itself from "system of record" to "platform of agents," backed by roughly $3B of acquisitions (HiredScore, Evisort, Paradox, Sana). Its **Agent System of Record (ASOR)** manages first- and third-party agents through a register→configure→activate→deactivate lifecycle with an analytics hub, plus an Agent Gateway and an Entra Agent ID integration. Illuminate agents are role-based rather than task-based. Workday Build and Flowise Agent Builder give customers a low-code path.

**Where it is genuinely strong:** ASOR is the closest thing in market to a governance layer for a blended human/agent workforce, and it is a real idea. Analysts noticed.

**Exploitable weaknesses:**
- **Flex Credits** introduce consumption-based pricing for agents. Customers now carry an unbudgeted, usage-scaling line item for functions they previously bought at a fixed PEPM. This is the single most reliable objection to raise in a competitive deal.
- Agents are sold separately, on top of already-licensed applications. Every agent is an upsell, which slows deployment and makes ROI a per-agent argument rather than a platform argument.
- ASOR governs *agents*. It does not make the underlying transaction ledger replayable or the underlying policy executable outside the agent path. Governance sits beside the core, not inside it.
- Implementation cost and time remain the standing complaint, even after Launch.

### 2.2 SAP SuccessFactors
**Position:** ~4.5% share (~$2.8B), but the deepest functional suite after the 1H/2H 2026 releases, and now bolted to SAP's broader "autonomous enterprise" story.

**Agentic posture:** Joule as an orchestration layer, not just an assistant. Specialised agents rather than one generalist: Career & Talent Development, HR Service, People Intelligence, Payroll, Performance Preparation, Employee Data Integration. Joule Assistants coordinate multiple underlying agents and skills. SmartRecruiters acquisition shores up ATS. New Workforce Scheduling module attacks UKG's core. People Intelligence replaces years of fragmented analytics products.

**Where it is genuinely strong:** Breadth. If the evaluation is a feature matrix, SAP wins a lot of rows. The Business Data Cloud anchoring of people analytics is architecturally sensible.

**Exploitable weaknesses:**
- The suite is a federation of acquisitions and modules with genuinely different data models underneath. "Employee Data Integration Agent" as a named product is itself an admission.
- Implementation gravity is extreme; SI dependency is near-total.
- Time-to-value is measured in quarters even for module-level deployments.
- Its own research reports that only ~10% of HR leaders feel confident their workforce has the skills needed for the next 12–24 months — a striking admission from the vendor selling skills infrastructure.

### 2.3 Oracle Fusion Cloud HCM
**Position:** ~4.1% share (~$2.5B), but the fastest-growing of the big four in HR — from ~$1.44B (CY2022) to ~$2.49B (CY2025), a ~73% three-year increase.

**Agentic posture:** Fusion Agentic Applications for HR launched April 2026, expanded through releases 26B and 26C across recruiting, talent, workforce management and HR service delivery. Coordinated teams of specialised agents operating against unified enterprise data, workflows, policies, approval hierarchies and permissions. AI Agent Studio for customer-built agents. Crucially, Oracle bundles agents **at no additional cost** — an explicit shot at Workday's credit model.

**Where it is genuinely strong:** The "agents belong inside the system of record, where the mission-critical data already sits" argument is correct, and Oracle can make it credibly because Fusion genuinely is one data model. Free-with-suite pricing is a serious commercial weapon.

**Exploitable weaknesses:**
- Implementation typically runs to a year with external consultants; ad-hoc reporting remains a documented weak point requiring custom development.
- Configuration complexity for multi-entity structures is high — precisely the segment we target.
- "No additional cost" means agents are a defensive feature for suite retention, not a product line with its own roadmap discipline.

### 2.4 ADP (Workforce Now / Lyric HCM)
**Position:** Market leader by revenue, ~14.2% share (~$8.7B). Unmatched payroll compliance depth and filing infrastructure in the US.

**Agentic posture:** Lyric HCM as the modern enterprise platform, ADP Assist for conversational interaction (PTO balances, headcount queries), DataCloud for benchmarking analytics across an enormous payroll dataset.

**Where it is genuinely strong:** Payroll tax filing, statutory compliance, and the data asset from processing payroll at national scale. Nobody out-compliance-es ADP in the US.

**Exploitable weaknesses:**
- ADP is a services company with software attached. That is a strength in payroll and a weakness in product velocity.
- Lyric is the third or fourth attempt at a modern platform; installed-base fragmentation across Workforce Now, Vantage, Lyric and legacy is significant.
- Weak outside its core geographies relative to its US position.
- The agentic story is assistive, not autonomous, and lags the suite vendors.

### 2.5 UKG (Pro / Pro Workforce Management)
**Position:** ~6.8% share (~$4.1B). The workforce-management specialist; unbeatable in complex hourly, shift-based, unionised environments.

**Agentic posture:** **Bryte AI**, split explicitly into Assistive (conversational reporting, policy Q&A, timecard and accrual help, onboarding guidance) and Agentic (multi-step delegates operating within guardrails). Named agent concepts include Dynamic Labor Operations responding to callouts and demand shifts in real time, proactive payroll and compliance agents, and HR support agents that reduce ticket volume. UKG leans on Large Action Model framing and 30 years of people/work/culture data including Great Place To Work benchmarks. Next-gen People Assist and Document Manager went global in early 2026.

**Where it is genuinely strong:** The guardrail framing is the most operationally honest in market. Frontline and shift-work depth is a real moat. The data asset is distinctive.

**Exploitable weaknesses:**
- Core HR and talent are thinner than WFM; UKG wins on scheduling, not on employee lifecycle.
- Bryte is priced as an optional GenAI suite — the same consumption/upsell objection as Workday.
- Multi-country payroll depth is limited relative to Dayforce or ADP.
- Post-merger platform consolidation (Ultimate + Kronos) is still visible to customers.

### 2.6 Dayforce (formerly Ceridian)
**Position:** ~7,000 customers, ~$1.9–2.0B revenue run-rate, taken private by Thoma Bravo for **$12.3B, completed 4 February 2026** at $70/share, with a significant minority investment from an ADIA subsidiary. Global payroll expanded past 200 countries.

**Agentic posture:** Agentic AI embedded across payroll, scheduling and talent, on top of the continuous-calculation engine. A suite of agents launched November 2025 handles training course generation, job postings, time-off requests and shift changes; the Pay Clarity agent handles payroll inquiries, flags anomalies and answers employees in real time. Acquisitions: eloomi (learning), Ideal (talent intelligence).

**Where it is genuinely strong:** **Continuous calculation is the closest any incumbent gets to our architectural thesis.** A single data model with real-time payroll means no sync lag between HR, time and pay. Dayforce is the competitor whose architecture we most respect.

**Exploitable weaknesses:**
- PE ownership creates a 3–5 year value-creation clock. Historically that means price increases, module unbundling, and slower long-horizon R&D — regardless of what management says today.
- Continuous calculation is real-time but not *bitemporal* and not *replayable*. It computes now; it does not let you re-derive what the answer would have been under the policy version in force on a date, which is what audit and retro-effective correction actually require.
- Complexity: broadly acknowledged as overkill for straightforward single-country payroll.
- Delisting removes the public disclosure that made Dayforce easy to benchmark — and that cuts both ways in enterprise deals.

### 2.7 Rippling
**Position:** ~$1B ARR (March 2026), up from ~$850M at end-2025; ~78% YoY growth. Valued at $16.8B on a $450M Series G. 650+ native integrations. 20,000+ customers.

**Agentic posture:** Automation-first rather than agent-first. The differentiator is the unified employee graph spanning HR, IT and spend — a hire in the ATS chains through payroll, device provisioning and app access without a second system.

**Where it is genuinely strong:** The workflow graph is the best in market. Product velocity is exceptional — 10+ product lines each past $1M ARR, new products typically reaching that within 5–6 months.

**Exploitable weaknesses:**
- Mandatory platform fee plus modular pricing means real costs land well above the headline; global payroll pushes the effective rate substantially higher.
- Implementation complexity is a documented and growing complaint as they move upmarket.
- Ongoing bilateral litigation with Deel survived multiple dismissal motions in a February 2026 federal order — a distraction and a procurement risk flag in regulated buyers.
- Regulatory surface across 80+ countries of payroll and EOR is enormous relative to company age.
- Weak in complex WFM, unionised environments, and heavy multi-entity statutory reporting.

### 2.8 Deel
**Position:** ~$17.3B valuation on a $300M raise. Global EOR and contractor payments leader; 300+ integrations.

**Where it is genuinely strong:** Cross-border employment. If the buying trigger is "we need to hire in 12 countries next quarter," Deel wins.

**Exploitable weaknesses:**
- EOR economics are structurally different from HRIS economics — it is a services margin business wearing a SaaS multiple.
- Core HRIS depth (WFM, complex payroll for owned entities, talent, ER/case management) is shallow.
- Same litigation overhang as Rippling.
- Customers routinely run Deel *alongside* a real HRIS. That is our integration opportunity, not our competitive threat.

### 2.9 HiBob, BambooHR, Personio (the modern mid-market tier)
**Position:** HiBob typically lands ~$16–25 PEPM for 50–1,000 employees; BambooHR and Gusto own sub-300-employee SMB; Personio owns European SMB at roughly $5–15 PEPM.

**Where they are genuinely strong:** Employee experience, time-to-value, adoption. These products are *liked*, which almost nothing else in this list is. HiBob's culture and engagement layer is best-in-class.

**Exploitable weaknesses:**
- Documented ceilings on advanced workforce analytics — no predictive modelling, limited cross-functional reporting.
- Multi-state and international payroll complexity is where customers outgrow them.
- Effectively no multi-entity / multi-branch group architecture. A holding company with 14 subsidiaries across 6 jurisdictions cannot run on these.
- Their AI is assistive and thin; they lack the engineering capacity to build a governed agent plane.

**This is our upgrade path.** These vendors define the segment that will need to graduate within 24 months and does not want to graduate to Workday.

### 2.10 Darwinbox, Paycom, Paylocity, Zoho People (regional and niche)
**Darwinbox** raised $140M co-led by KKR and Partners Group (March 2025) to expand internationally from an India/APAC base — the most credible emerging-market challenger, and the vendor whose beachhead most resembles ours. **Paycom** wins on employee-driven payroll (Beti) and single-database purity. **Paylocity** wins mid-market on employee experience — social feeds, surveys, recognition, on-demand pay. **Zoho People** wins on price and ecosystem lock-in.

**Collective weakness:** All four are single- or few-region depth players. None has a governed agent architecture. Darwinbox is the one to watch: platform approach plus stated intent to go significantly deeper on AI.

---

## 3. Cross-vendor pattern analysis

### 3.1 What everyone is doing (so none of it is differentiation)

| Capability | Who has it |
|---|---|
| Conversational HR assistant | All ten |
| Task-level agents (leave requests, job postings, Q&A) | Workday, SAP, Oracle, UKG, Dayforce |
| Role-based / multi-step agents | Workday, SAP, Oracle, UKG |
| Agent builder / studio for customers | Workday (Build, Flowise), Oracle (AI Agent Studio), SAP |
| Agent governance register | Workday (ASOR) — genuinely alone here |
| Skills ontology / inference | Workday, SAP, Oracle, Dayforce |
| Unified data model claim | Oracle, Dayforce, Paycom, Rippling |

By 2027 every row above is table stakes. Building any of them is not a company.

### 3.2 What nobody is doing

These are the seven gaps that define the whitespace.

**Gap 1 — Determinism is not architectural anywhere.**
Every vendor treats the agent as a smarter user of an existing transactional API. None has made the guarantee that *every agent action resolves to a deterministic transaction a human could have performed identically through the UI, replayable from an immutable log*. Without that, "human oversight" is a review of a black box, not oversight.

**Gap 2 — No published continuity behaviour.**
Not one vendor publishes what its HRIS does when the LLM provider is down, the agent budget is exhausted, the model is deprecated, or the customer's legal counsel orders agents disabled pending an investigation. This will become a standard RFP question within 24 months. We should be the ones who put it there.

**Gap 3 — Agent cost is unpredictable exactly where budgets are not.**
Consumption pricing (Workday Flex Credits) collides with HR budgeting reality, where headcount-based PEPM has been the norm for two decades. Oracle's free-with-suite is the counter-move, but it makes agents a feature, not a product. Neither is a good answer.

**Gap 4 — Bitemporality is missing.**
HR is the most retro-effective domain in enterprise software: backdated hires, retroactive pay increases, corrected timesheets, mid-cycle policy changes, effective-dated org restructures. Almost every HRIS models effective dating (valid time) but not transaction time. Without both, you cannot answer "what did the system believe on 14 March, and why?" — which is precisely the question in every wage claim, tax audit, and discrimination case.

**Gap 5 — Multi-entity is a configuration burden, not a product.**
41% of payroll automation non-adopters cite multi-EIN and multi-entity structure as a barrier, adding 6–12 months to implementation. Every vendor supports multi-company by parameterising a single-company model. None treats the corporate group as the primary object with legal entities and branches as first-class dimensions carrying their own policy, calendar, currency, statutory profile and data residency.

**Gap 6 — Compliance evidence is generated after the fact.**
Vendors are adding AI governance dashboards. Nobody generates a signed, immutable Decision Record at the moment of each material HR decision, capturing inputs, policy version, model version, human reviewer identity, and rationale. The EU AI Act deployer obligations — clear explanation of the AI's role and logic, records showing who reviewed AI-assisted decisions and what they considered beyond the AI output — describe an artifact that does not currently exist as a product feature.

**Gap 7 — Agents are not managed as workers.**
Workday's ASOR is the only serious attempt, and it is a register, not an employment model. Agents need: an identity, a manager, a cost centre, a budget, an entitlement scope, a performance record, an incident history, and an offboarding process. Only ~22% of organisations treat agents as independent identity-bearing entities; ~70% of security leaders say AI systems hold more access than a human in the equivalent role; ~67% rely on static credentials. In an HR system, that is not a security problem — it is a segregation-of-duties failure.

---

## 4. The trust and reliability evidence base

The single strongest argument for our architecture is that the market has already run the experiment.

| Finding | Source period |
|---|---|
| >40% of agentic AI projects to be cancelled by end-2027 (cost, unclear value, inadequate risk controls) | Gartner, Jun 2025; still cited Jul 2026 |
| Only ~130 of thousands of self-described agentic vendors judged real; rest "agent washing" | Gartner |
| ~79–80% of organisations deploying agents; only ~10–15% reach production | Industry surveys, 2026 |
| 42% of companies abandoned most AI initiatives in 2025, up from 17% a year earlier | S&P Global Market Intelligence |
| >80% of AI projects fail to deliver intended business value — ~2× the rate of comparable non-AI IT projects | RAND |
| 56% of CEOs report no measurable revenue increase from AI | PwC 29th Global CEO Survey, Jan 2026 |
| Only ~6% of companies fully trust AI agents to run core business processes | HBR |
| 88% of organisations reported confirmed or suspected AI agent security incidents in the past year | 2026 identity research |
| Only 14.4% have full IT/security approval for their entire agent fleet | 2026 identity research |
| Four enterprise agentic failures publicly disclosed in Q1 2026 alone; common pattern = insufficient human oversight in production execution | Corporate filings and press, Q1 2026 |
| Gartner sizes up to $234B of enterprise application spend exposed to "agentic arbitrage" by 2030 | Gartner, Jul 2026 |

**The correct reading is not that agents don't work.** Gartner simultaneously projects that by 2028, 15% of day-to-day work decisions will be made autonomously (from 0% in 2024) and a third of enterprise software will include agentic capability. Agents work. *Ungoverned, non-deterministic, unbudgeted agents deployed into critical-path workflows do not.*

That distinction is our entire product.

---

## 5. Regulatory landscape

### 5.1 EU AI Act — the operative timeline as of August 2026

| Date | What applies |
|---|---|
| 1 Aug 2024 | Act entered into force |
| 2 Feb 2025 | Prohibited practices banned — including emotion recognition in the workplace and biometric categorisation. AI literacy obligations begin. |
| 2 Aug 2025 | General-purpose AI model obligations begin |
| **2 Aug 2026** | **Article 50 transparency obligations, enforcement powers over GPAI, and the full penalty regime apply** |
| 2 Dec 2026 | Grace period expiry for certain existing systems |
| **2 Dec 2027** | Annex III high-risk obligations (deferred from 2 Aug 2026 by the Digital Omnibus, in force 27 July 2026) |
| 2 Aug 2028 | Annex I high-risk obligations (product-embedded) |

**What this means commercially.** The deferral removed the panic but not the requirement, and it is widely misread. Two things are true simultaneously: the heavy conformity-assessment burden moved to late 2027/2028, *and* 2 August 2026 is not a quiet date. Meanwhile Article 26(7) — informing and consulting worker representatives before deploying a high-risk system — already applies regardless of the deferral, as does GDPR Article 22 on solely automated decisions.

Employment AI is squarely in Annex III Section 4: recruitment, CV filtering, candidate ranking, task allocation, worker monitoring, performance evaluation, promotion and termination. Penalties reach €35M or 7% of global turnover for prohibited uses, €15M or 3% for other breaches. Extraterritorial reach applies: a US company using AI output in the EU is covered.

**Deployer obligations that describe a product we should build:**
- Clear explanations of the AI's role and logic, available to affected persons
- Records showing who reviewed AI-assisted decisions and what was considered beyond the AI output
- Human overseers who are trained, qualified, and have the *effective capacity to intervene and modify the system's decisions*
- Provider information sufficient to complete the deployer's DPIA
- Logging and post-market monitoring

Building a compliant high-risk system — risk management, technical documentation, data quality, human oversight, post-market monitoring — is generally estimated at 12–18 months of work. A platform that ships this by construction is selling 12–18 months of avoided programme cost to every EU-exposed buyer.

### 5.2 The wider regulatory surface

- **Pay transparency:** EU Pay Transparency Directive, June 2026 deadline. Requires structured, defensible pay-gap reporting — which requires a compensation data model most HRIS platforms don't have.
- **Payroll digital enforcement:** mandatory e-filing, real-time validation, and far more granular payroll data demanded by tax authorities globally.
- **Payroll data as protected personal data** under expanding privacy regimes, with storage, access and security obligations.
- **US state and municipal AI hiring rules** continuing to proliferate below the federal level.
- **Data residency** becoming a hard requirement in an increasing number of jurisdictions — a tenancy architecture problem, not a hosting problem.

### 5.3 Agent governance standards — immature, and that is an opportunity

MCP and A2A are both Linux Foundation projects with overlapping membership and a stated joint interoperability effort. MCP mandates OAuth 2.1 with PKCE for protected HTTP deployments. Microsoft Entra Agent ID and AWS Agent Registry (Bedrock AgentCore, preview since April 2026) provide agent catalogues with conditional access and audit integration. NIST launched an AI Agent Standards Initiative on 17 February 2026 across security, interoperability and identity. The Agent Control Standard arrived May 2026.

But: there is still **no standardised audit trail format**, no unified way for an agent to carry who it is, who it acts for, and what it may do across layers. Research in early 2026 documented over 1,800 MCP servers exposed publicly with no authentication at all. Analysts expect agent identity to be the defining standards fight of 2027.

**Implication:** we should implement to the emerging standards (MCP server, signed A2A agent cards, OAuth 2.1, per-agent identity, short-lived scoped credentials) while owning the audit-record format inside our own domain. Standards will converge around whoever ships the credible reference implementation in a regulated vertical. HR is the most regulated vertical that agents will touch at scale.

---

## 6. The whitespace thesis

Synthesising the above, the defensible position is not "the best AI HRIS." It is:

> **The HR Operating System that is correct by construction, auditable by default, and fully functional without AI — where agents are a governed, budgeted, revocable workforce operating on top of a deterministic core, never inside it.**

**Five things this lets us claim that no incumbent can claim without re-architecting:**

1. **Every agent action is a replayable deterministic transaction.** Not "the AI did something and we logged it." The agent constructs a transaction; the deterministic engine validates and executes it; the ledger records both the intent and the execution; either can be replayed or reversed.

2. **Turning the AI off degrades speed, never capability.** A published Continuity Ladder with contractual SLAs at each level. Level 3 — the deterministic-only mode — is the complete HRIS every legacy vendor sells, and it is our *floor*, not our fallback.

3. **Payroll is computed by a deterministic policy engine, never by a language model.** Explainable to the cent, to the rule, to the policy version, on any historical date. LLMs draft policy; a compiler validates it; a deterministic engine runs it.

4. **The corporate group is the primary object.** Multi-tenant, multi-company, multi-branch as an architectural dimension carrying its own policy, calendar, currency, statutory profile, approval chain and data residency — not as configuration on a single-company model.

5. **Humans and agents are managed in one workforce register.** Same lifecycle, same cost accounting, same entitlement model, same audit trail, same offboarding. This is Workday's ASOR idea taken to its logical conclusion and put *inside* the HR system rather than beside it.

**Why this is five years ahead rather than one:** the incumbents cannot follow without replacing their persistence layer. Bitemporal event sourcing, deterministic policy compilation, and transaction-level agent constraint are not features you add — they are the shape of the system. Workday's ASOR took years and $3B of acquisitions and still governs agents from outside the record. Dayforce's continuous calculation is the closest architectural cousin in market and it still cannot replay a decision under a superseded policy version. A vendor with a decade of installed-base commitments cannot rewrite its ledger.

---

## 7. Competitive positioning map

| | Deterministic core | Governed agent plane | Multi-entity native | Published continuity | Compliance evidence by construction |
|---|---|---|---|---|---|
| Workday | Partial | **Strong (ASOR)** | Partial | No | Partial |
| SAP SuccessFactors | Partial | Strong | Partial | No | Partial |
| Oracle HCM | Partial | Strong | Partial | No | Partial |
| Dayforce | **Strong (continuous calc)** | Moderate | Moderate | No | Partial |
| ADP | Strong (payroll only) | Weak | Moderate | No | Partial |
| UKG | Moderate | Moderate | Weak | No | Partial |
| Rippling | Moderate | Weak | Weak | No | Weak |
| Deel | Weak | Weak | Moderate (EOR) | No | Weak |
| HiBob / BambooHR / Personio | Weak | Weak | Weak | No | Weak |
| Darwinbox / Paycom / Paylocity | Moderate | Weak | Weak | No | Weak |
| **KEEL** | **Native** | **Native** | **Native** | **Native** | **Native** |

The empty "Published continuity" column is the market gap in one image.

---

## 8. Risks to the thesis, stated honestly

An investor will ask these. We should ask them first.

**1. Determinism may be a technical virtue the market doesn't pay for.**
*Mitigation:* We do not sell determinism. We sell payroll that is right, audits that pass, and a system that runs when the AI doesn't. Determinism is the mechanism, not the pitch. The hard-dollar ROI (payroll error reduction, audit cost avoidance, avoided 12–18 month compliance programmes) is legible to a CFO with no reference to architecture.

**2. Incumbents can announce continuity guarantees without building them.**
*Mitigation:* They can announce; they cannot certify. Our answer is a contractual SLA per continuity level plus published third-party attestation of degraded-mode operation. A vendor whose payroll engine cannot run without its inference layer cannot sign that document.

**3. Building the full module surface is enormous.**
This is the real risk. A complete HRIS is 60+ modules across 15 domains. *Mitigation:* horizon-sequenced build (see the strategy document), a deterministic kernel that makes each subsequent module cheaper rather than more expensive, and jurisdiction packs as versioned artifacts built by a partner network rather than in-house.

**4. Regulatory deferral could soften the compliance urgency.**
The Digital Omnibus already moved Annex III to December 2027. *Mitigation:* our compliance value is not deadline-dependent — it is the same artifact that wins wage claims, passes tax audits, and satisfies works councils. Also, deferral has historically slipped once and been enforced hard afterward.

**5. Model costs and capabilities are moving fast in both directions.**
Reports of AI pricing increasing through 2026, alongside frontier models commoditising. *Mitigation:* our architecture is model-agnostic by design — the agent plane is replaceable, the deterministic core is not. A fixed-price agent tier is only underwritable *because* the core does the expensive work deterministically.

**6. Incumbent price response.**
Oracle bundling agents at no cost signals where suite pricing is heading. *Mitigation:* we do not win on agent price. We win on the total cost of a correct HR operation — subscription plus implementation plus error correction plus compliance programme.

---

## 9. Sources

Market and vendor: AppsRunTheWorld top-10 HCM vendor analysis and forecast; Mordor Intelligence HRIS market report; Futurum Group enterprise software market sizing and Oracle agentic HCM analysis; ISG 2026 Buyers Guides for HCM Suites and Workforce Management; Constellation Research; Josh Bersin analyses of Workday and SAP; Viewpoint Analysis HCM options 2026; OutSail vendor comparisons and pricing breakdowns; Sacra and Latka on Rippling; TechCrunch on Darwinbox.

Vendor primary sources: Workday newsroom (Agent System of Record, Illuminate expansion, Flex Credits, Workday Build); SAP SuccessFactors Joule agents documentation and 1H 2026 release material; Oracle newsroom (Fusion Agentic Applications for HR, August 2026); UKG newsroom (Bryte AI agents, People Assist, Document Manager); Thoma Bravo (Dayforce acquisition and completion); Dayforce/Ceridian platform material.

Reliability and adoption: Gartner (agentic AI cancellation forecast, agent washing estimate, agentic arbitrage sizing, CIO and Technology Executive Survey); S&P Global Market Intelligence; RAND; MIT NANDA State of AI in Business; PwC 29th Global CEO Survey; HBR agent trust research; Forbes and Forrester 2026 assessments.

Regulatory: EU AI Act text and Annex III; European Commission Digital Omnibus on AI (in force 27 July 2026); DLA Piper, Crowell & Moring, Ogletree Deakins client alerts; EU Pay Transparency Directive guidance.

Agent standards: Linux Foundation MCP and A2A projects; MCP 2026 roadmap; NIST AI Agent Standards Initiative; Microsoft Entra Agent ID; AWS Bedrock AgentCore Agent Registry; Cloud Security Alliance AIUC-1 Q2 2026; agent identity research published 2026.

Payroll economics: EY payroll accuracy survey; Deloitte Global Payroll Survey; Thomson Reuters 2026 Payroll and Tax Compliance Report; IRIS 2026 payroll compliance analysis; SHRM on HR technology implementation outcomes.

*All third-party figures are paraphrased from published summaries and should be re-verified against primary sources before use in a priced investor document.*
