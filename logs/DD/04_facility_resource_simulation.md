# 04 -- Facility & Resource Simulation Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-04
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Game Design / Systems Architecture
**Authors:** Game Design & Systems Architecture Team

---

## Table of Contents

1. Executive Summary
2. Scope and Non-Goals
3. Inputs and Dependencies
4. Design Principles
5. Facility Simulation Overview
6. Canonical Facility State Model
7. Resource Types, Units, and Constraints
8. Facility Tiers and Progression
9. Client Onboarding and Resource Reservation
10. Lease Management, Revenue, and Operating Costs
11. Tick Simulation and Resource Consumption Model
12. Upgrades, Installations, and Maintenance
13. Degradation, Failure Modes, and Recovery
14. Threat Engine Integration and Incident Effects
15. Capacity Pressure, Decision Consequences, and Player Agency
16. UI Mapping and Player Feedback Requirements
17. Telemetry, KPIs, and Learning Outcome Instrumentation
18. Determinism, Save/Load, and Auditability
19. Balancing and Difficulty Scaling Strategy
20. Accessibility, Pace Controls, and Player Stress Management
21. Enterprise Context, Compliance, and Admin Controls
22. Testing and Validation Strategy
23. Open Questions and Decision Log
24. Resource Forecasting, Capacity Planning, and Advisory Tools
25. Policy Controls, Service Classes, and Quotas
26. Narrative and Faction Integration
27. Future Extensions and Multiplayer Considerations
28. Appendix A: Facility Tier Reference Tables
29. Appendix B: Resource Formula Catalog
30. Appendix C: Example Day Walkthrough with Facility Events
31. Appendix D: Event Schema and Pseudocode
32. Appendix E: Upgrade Catalog and Resource Effects
33. Appendix F: Facility Alerts and Messaging Library
34. Appendix G: Scenario Matrix for Balancing and QA
35. Appendix H: Competency Mapping for Facility Decisions

---

## 1. Executive Summary

This document specifies the Facility and Resource Simulation system for The DMZ: Archive Gate. The facility layer is the strategic backbone of the game loop. It translates player decisions in email triage and verification into tangible operational consequences inside a post-apocalyptic data center. This system is also the primary bridge between stealth learning and measurable cybersecurity behavior. Players cannot only approve or deny requests. They must manage rack space, power, cooling, and bandwidth under uncertainty, respond to incidents that stress these resources, and decide how to invest in upgrades that protect the facility. These actions model real-world resource constraints, security budgeting, and operations planning in a way that remains diegetic to the narrative.

The simulation must satisfy three constraints simultaneously. It must be understandable to a casual player who can finish a day in 5 to 15 minutes. It must be deep enough to reward mastery and to justify long-term play. It must be deterministic and auditable for enterprise deployments where analytics, compliance, and repeatability are mandatory. The system described here provides a deterministic, event-sourced model driven by the game engine and exposed through the `facility` module defined in DD-09. It supports the core loop described in DD-01 and integrates with the Threat Engine from DD-05 and the terminal UI from DD-07.

At a high level, the facility simulation tracks four canonical resources: rack capacity (U), power (kW), cooling (tons), and bandwidth (Mbps). These resources are consumed by onboarded clients, by upgrades, and by transient operational states such as incident response and threat activity. The simulation exposes availability checks for the player and for automated systems. It emits events when utilization crosses thresholds, when clients are onboarded or evicted, when upgrades are purchased or completed, and when facility tiers change. These events are visible to the player through facility dashboards and also captured for analytics, skill modeling, and compliance reporting.

The system is not a pure infrastructure simulator. It is a game system that balances resource realism with clarity and player agency. Resource consumption is simplified into a small number of units and deterministic calculations that can be explained to the player. The aim is to teach operational thinking and risk trade-offs, not to model every physical detail of a data center. The simulation is intentionally paired with narrative consequences, faction dynamics, and threat events so that resource decisions are meaningful and emotional, not just numerical.

This document defines the facility state model, resource types, tier progression, client lease management, upgrade mechanics, maintenance and degradation rules, failure modes, and the interaction between facility utilization and the Threat Engine. It also specifies UI requirements for the facility dashboard and status panel, telemetry requirements for analytics, and a testing plan to ensure deterministic behavior across platforms. The design is aligned with the BRD, the existing design documents, and the modular backend architecture.

---

## 2. Scope and Non-Goals

**In scope**

- Canonical resource model for rack, power, cooling, and bandwidth.
- Facility tier progression and capacity scaling aligned to the narrative of Matrices GmbH.
- Client onboarding, resource reservation, lease timelines, and eviction rules.
- Upgrade acquisition, installation timelines, and persistent effects on capacity and defense.
- Deterministic tick simulation that updates resource usage, operating costs, and facility health.
- Incident and threat integration, including DDoS bandwidth pressure and breach-driven resource loss.
- UI requirements for facility dashboards and status displays in the terminal aesthetic.
- Telemetry for operational KPIs and learning outcomes.
- Rules for deterministic replay, save/load, and enterprise auditability.

**Out of scope**

- Detailed narrative scripts for facility events. These are owned by narrative design.
- Full threat generation details beyond integration points. These are owned by DD-05.
- Complete UI component specifications. These are owned by DD-07.
- Backend API design details beyond the facility module interface and events. These are owned by DD-09.
- Multiplayer balancing, guild resource pooling, or PvP infrastructure. These will be handled in later design phases.
- Real-world HVAC or electrical engineering simulation. The model is intentionally abstracted.

---

## 3. Inputs and Dependencies

The facility simulation is derived from and must align with the following sources.

- BRD-DMZ-2026-001: Sections 5 and 11 define the core gameplay loop, resource management, and upgrade mechanisms. Section 5.4 explicitly maps resource management to capacity planning and security budget allocation skills.
- DD-01 Game Core Loop & State Machine: Defines the day cycle phases, including Resource Management and Upgrade Phase, and the deterministic event-sourced approach.
- DD-05 Threat Engine & Breach Mechanics: Defines attack types such as DDoS, resource exhaustion, and breach phases that influence facility resources and require mitigation decisions.
- DD-07 UI/UX Terminal Aesthetic: Defines the facility dashboard placement, status panel behavior, resource meters, and warning states.
- DD-09 Backend Architecture & API: Defines the `facility` module, database tables, and events that this design must implement.

Key dependency assumptions extracted from these documents.

- The facility simulation is implemented in a dedicated module with a stable public interface. It must be callable by the game engine and must publish events for analytics and UI.
- The simulation is deterministic per session and uses the session seed, day index, and event history to produce reproducible outputs.
- Facility resource thresholds drive UI alerts and threat engine decisions. This means facility metrics must be updated before threat generation in the day cycle.
- Facility state is persisted in the `facility.states` table and extended through event-sourcing in the game engine.
- Facility upgrades are purchases with installation timelines and must interact with both resource capacity and security defense systems.

---

## 4. Design Principles

1. **Stealth learning first.** Resource decisions must teach operational security and risk trade-offs without feeling like a formal lesson. Capacity checks and upgrade choices should feel like survival decisions.
2. **Clarity beats complexity.** The simulation uses a small set of resource types and deterministic calculations. The player should always understand why a request is infeasible or why a breach occurred.
3. **Determinism is mandatory.** Given the same session seed and event log, the facility simulation must produce identical results. This is required for enterprise auditability and for fair analytics.
4. **Narrative justification.** Resource changes, failures, and tier upgrades are framed through story beats and in-world systems. No numerical shift should feel arbitrary.
5. **Player agency preserved.** The system creates pressure through resource scarcity but avoids forced timeouts. The player can defer, negotiate, or sacrifice resources rather than being locked out.
6. **Cross-system compatibility.** Facility state must integrate cleanly with threat generation, UI representation, and analytics without conflicting with other modules.
7. **Progression feels earned.** Tier upgrades and capacity expansions are significant milestones tied to both economic success and narrative validation.
8. **Enterprise parity.** The consumer game and enterprise deployment must use the same facility model to avoid divergent analytics and content logic.

---

## 5. Facility Simulation Overview

The facility simulation represents the operational capacity of Matrices GmbH, a post-collapse data center with scarce resources. It is designed to produce meaningful constraints that shape gameplay. Every incoming email request has a resource profile that must fit within available capacity. Every decision to approve or deny has direct operational implications. The facility simulation does not exist in isolation. It is a dynamic layer that converts decisions into resource utilization, generates operating costs, and interacts with threats.

A facility in The DMZ is not a static set of numbers. It is a living system with long-term leases, transient spikes, and gradual wear. A typical day includes the following resource interactions.

- New clients are onboarded, reserving rack units, power, cooling, and bandwidth.
- Existing clients consume resources at a baseline level and may spike due to data intake or events.
- Upgrades are purchased, which may increase capacity or add security controls, but often require temporary resource overhead.
- Threat events, especially DDoS or malware, can temporarily reduce available bandwidth or consume additional compute resources.
- Maintenance events and degradation can reduce effective capacity if ignored.

The simulation is defined on the day cycle. Each day has a set of facility ticks that update resource consumption and operating costs. The default model is one tick per day, triggered during the Resource Management or Day End phase. The model supports additional ticks for incidents that have deadlines or countdowns, but these are still deterministic and pauseable. The facility simulation also supports event-driven resource changes, such as immediate consumption when a client is onboarded or when an upgrade completes.

From a player perspective, the facility is visible through two primary views. The Facility Dashboard in the center panel provides an operational overview when no email is selected. The Facility Status panel on the right shows compact gauges for each resource and active alerts. These displays are updated whenever resource values change. This reinforces that resource constraints are not a background system but a constant strategic consideration.

The simulation aligns with the core loop specified in the BRD. After decisions and consequences, the player enters Resource Management and Upgrade phases. In these phases they can reallocate capacity, accept or reject upgrade proposals, and prepare for the next day. The facility system ensures these choices have measurable consequences and provides feedback that maps to real-world operational planning.

---

## 6. Canonical Facility State Model

The facility simulation uses a canonical state model that matches the backend schema in DD-09. It is the source of truth for resource availability, client leases, and upgrade status. This model is stored in the `facility.states`, `facility.clients`, and `facility.upgrades` tables, and mirrored in the game engine event log.

**FacilityState (logical model)**

- `sessionId`: UUID
- `tier`: enum `outpost | station | vault | fortress | citadel`
- `rackCapacityU`: int
- `rackUsedU`: int
- `powerBudgetKw`: float
- `powerUsedKw`: float
- `coolingTons`: float
- `coolingUsedTons`: float
- `bandwidthMbps`: float
- `bandwidthUsedMbps`: float
- `operatingCostPerDay`: bigint
- `securityToolOpExPerDay`: bigint (sum of recurring OpEx from installed security and operations tools)
- `attackSurfaceScore`: float (0.0 - 1.0, derived from installed upgrades)
- `maintenanceDebt`: float (0.0 - 1.0)
- `facilityHealth`: float (0.0 - 1.0)
- `lastUpdatedDay`: int

The database schema in DD-09 contains the core resource fields. The additional fields in the logical model are derived values or are stored in the game engine state. This separation keeps the database schema stable while allowing the game engine to compute richer facility dynamics. As specified in the BRD tech stack (Section 8.3), the facility models should use Zod for shared client/server validation schemas and Drizzle ORM for type-safe database access to the PostgreSQL facility tables.

**ClientLease (logical model)**

- `clientId`: UUID
- `sessionId`: UUID
- `name`: string
- `organization`: string
- `rackU`: int
- `powerKw`: float
- `coolingTons`: float
- `bandwidthMbps`: float
- `paymentPerDay`: bigint (denominated in Credits (CR), the primary in-game currency)
- `leaseStartDay`: int
- `leaseEndDay`: int
- `trustLevel`: int (0-500+, aligned with the Trust Score (TS) reputation gate defined in the BRD)
- `isLegitimate`: boolean
- `burstProfile`: enum `none | periodic | spiky`
- `priorityClass`: enum `standard | mission-critical | embargoed`

**UpgradeState (logical model)**

- `upgradeId`: string
- `sessionId`: UUID
- `status`: enum `available | purchased | installing | completed`
- `purchasedDay`: int
- `completesDay`: int
- `cost`: bigint
- `resourceDelta`: ResourceDelta
- `securityDelta`: SecurityDelta
- `maintenanceDelta`: float
- `opExPerDay`: bigint (recurring operational cost while installed)
- `threatSurfaceDelta`: float (-1.0 to +1.0, net attack-surface impact)
- `attackVectorModifiers`: map (vector -> delta) for specific upgrade-introduced risks

**ResourceDelta** represents the effect of upgrades on capacity and consumption. It is a mapping from resource type to changes in capacity, usage, or efficiency. This allows upgrades to increase capacity, reduce consumption, or add resilience.

The facility model integrates with the three-layer state management architecture defined in the BRD (Section 8.2). Layer 1 (Svelte stores) handles ephemeral facility UI state such as selected gauge, active panel view, and alert dismissals. Layer 2 (server-authoritative game state store) holds the canonical facility state synchronized between client and server via a TypeScript-typed GameState interface. Layer 3 (event sourcing) records all facility changes as immutable events, such as `facility.client.onboarded` or `facility.upgrade.completed`. This ensures determinism, auditability, and replay capability. The facility module reads the current state, applies the event, and persists the updated values.

---

## 7. Resource Types, Units, and Constraints

The facility simulation tracks four canonical resources. Each resource has a unit, a capacity, a current usage, and threshold levels that trigger warnings.

**Resource types**

- Rack capacity, measured in U (rack units).
- Power capacity, measured in kW.
- Cooling capacity, measured in tons of cooling.
- Bandwidth capacity, measured in Mbps.

These units align with the database schema in DD-09 and the UI language in DD-07. They are simplified to support clarity. The player does not manage phases of electricity or detailed HVAC constraints. They manage high-level capacity and utilization.

**Utilization and thresholds**

Each resource has three critical thresholds. These thresholds are expressed as percentages of capacity and are used for UI warnings, event generation, and threat engine integration.

- Advisory threshold: 70 percent utilization. The resource gauge becomes yellow and the facility report includes a caution.
- Critical threshold: 90 percent utilization. The gauge becomes orange or red, a `facility.resource.critical` event is emitted, and certain upgrades become restricted.
- Failure threshold: 100 percent utilization. The player cannot onboard new clients or activate upgrades that require additional capacity. If utilization reaches above 100 percent due to a surge event, the system triggers a degradation or incident event.

The thresholds may tighten as narrative-driven difficulty escalates and threat levels increase to reinforce pressure. The thresholds are never hidden from the player. The facility status panel clearly displays current usage and capacity and signals risk through color and icon state.

**Resource coupling and constraints**

Resources are modeled as coupled but not identical. A client consumes all four resources. A facility cannot approve a client if any resource would exceed 100 percent. The system uses a minimum-resource constraint. The most constrained resource is called the bottleneck. Bottleneck conditions are explicitly highlighted in the UI. For example, a facility might have rack capacity but insufficient cooling, which makes the approval infeasible. This teaches the real-world principle that the most constrained resource drives the decision.

Some upgrades add capacity but increase other resource usage. For example, a high-performance storage array might increase rack usage and power usage but also improve revenue and security resilience. The simulation must allow this trade-off. The player sees these trade-offs at purchase time in the Upgrade Proposal document. This aligns with the BRD requirement that upgrades map to security architecture and investment strategy.

**Resource rounding rules**

Resource usage is stored with two levels of precision. Rack units are integer. Power, cooling, and bandwidth are floats with one decimal place in the UI and two decimals in the data model. This prevents precision drift while allowing small increments. For determinism, all calculations are rounded to two decimals at each event application.

**Reserved vs. active usage**

The simulation distinguishes between reserved capacity and active usage in three cases.

- Reserved capacity: the resources promised to a client in their lease agreement.
- Active usage: the resources currently being consumed in the tick, which can vary due to burst profiles and incidents.
- Effective capacity: the current capacity after upgrades, degradation, or incidents.

The player primarily sees reserved capacity because that drives approval decisions. Active usage is relevant for incidents, breach impacts, and DDoS events. The Facility Status panel can optionally display both in advanced mode for enterprise deployments or players who enable detailed view.

---

## 8. Facility Tiers and Progression

The facility is structured around discrete tiers that reflect the narrative growth of Matrices GmbH. These tiers also gate upgrades and increase baseline capacity. The tiers are defined in the backend schema as `outpost`, `station`, `vault`, `fortress`, and `citadel`. Each tier represents a major milestone in the game and is unlocked through a combination of revenue, trust, and story progression.

**Tier progression principles**

- Tiers are not purely economic. A player must meet a narrative milestone or faction trigger to unlock the upgrade. This maintains story cohesion.
- Tier upgrades are long-term investments. They require upfront cost and often consume a full day or more to complete.
- Tier upgrades change the facility layout and unlock new upgrade categories, reflecting a larger operational footprint.
- Tier changes are rare events to preserve their meaning and to avoid overwhelming the player with constant capacity recalibration.

**Capacity scaling**

Exact capacity values are configuration-driven to allow balancing without code changes. The baseline for an `outpost` tier matches the database defaults: 42U rack, 10.0 kW power, 5.0 tons cooling, and 100 Mbps bandwidth. Higher tiers multiply or add to these baselines. Example scaling is provided in Appendix A, but these values are not hard-coded.

**Tier unlock criteria**

Tier unlocks are based on three gates. All three must be satisfied to avoid purely grind-based progression.

- Financial gate: total revenue or funds threshold.
- Trust gate: facility trust score or reputation threshold.
- Narrative gate: completion of a story beat or faction decision.

This tri-gate system ensures the player has demonstrated both operational competence and narrative engagement.

**Tier effects beyond capacity**

Tier upgrades also impact the facility simulation beyond raw capacity.

- Operating cost increases due to larger infrastructure.
- Maintenance complexity increases, raising the risk of degradation if the player ignores upkeep.
- A higher tier attracts more sophisticated threats, which are reflected in the Threat Engine by increasing attack severity weighting.
- New upgrade categories become available, including advanced defenses and specialized capacity enhancements.

Tier progression is not strictly linear in pacing. A player can linger at a tier, optimizing operations and building a strong security posture. This is encouraged for cautious play styles and allows the enterprise training context to emphasize risk management rather than rapid expansion.

---

## 9. Client Onboarding and Resource Reservation

Client onboarding is the primary mechanism by which facility resources are reserved and revenue is generated. Each approved email request can result in a new client lease. The facility simulation must evaluate whether the client can be onboarded based on resource availability, risk posture, and current operational constraints.

**Client profile inputs**

Each client request includes a resource profile derived from the Email Access Request and associated documents.

- Required storage or compute size translates to rack units.
- Data type and processing needs translate to power and cooling requirements.
- Expected access patterns translate to bandwidth needs.
- Contract terms define lease length and payment per day.

These inputs can be explicitly provided or inferred from the data salvage contract. The inference rules should be transparent to the player when they review the contract. For example, a large scientific archive implies high storage and moderate bandwidth, while a live communications hub implies high bandwidth.

**Onboarding decision flow**

The game engine calls `facility.calculateClientResources` to translate the client profile into resource requirements. The facility module then checks available capacity. The BRD (FR-GAME-005) specifies four decision options per request: Approve, Deny, Flag for Review, and Request Additional Verification. Of these, only Approve triggers resource reservation and onboarding. Flag for Review and Request Additional Verification defer the resource commitment. If approval would cause any resource to exceed the failure threshold, onboarding is rejected and the decision is blocked or requires explicit override with consequences.

Onboarding results are deterministic. The same client profile and facility state must always produce the same resource requirement. Randomness is not permitted in resource calculation.

**Capacity check and player override**

The default behavior is to block approvals that exceed available capacity. However, to preserve player agency and narrative tension, the system can allow an override if the player has a specific upgrade or emergency policy that permits temporary overcommit. Overcommit is a rare mechanic and is treated as a risk acceptance event. It adds maintenance debt, raises incident probability, and is clearly surfaced in the UI as a warning. This teaches the concept of knowingly accepting risk under resource pressure.

**Lease creation and reservation**

Onboarding creates a `facility.clients` record with lease start and end day. Resources are immediately reserved and reflected in `rackUsedU`, `powerUsedKw`, `coolingUsedTons`, and `bandwidthUsedMbps`. These values represent reserved usage, not necessarily active usage. Active usage is simulated per tick and may fluctuate based on the client burst profile.

**Client legitimacy and risk linkage**

The facility simulation does not directly judge legitimacy. That is handled in the email triage and threat system. However, `isLegitimate` is stored in the client profile for downstream effects. Illegitimate clients introduce hidden risks, such as backdoor activity or increased incident probability. This connection reinforces the learning loop: approving the wrong client has long-term operational consequences.

**Client eviction**

Clients can be evicted for several reasons: lease expiration, failure to pay, player decision, or incident response. Eviction frees reserved capacity but may generate reputational penalties or faction consequences. Eviction is performed via `facility.evictClient` and emits `facility.client.evicted` events.

---

## 10. Lease Management, Revenue, and Operating Costs

Lease management converts approved clients into predictable revenue while adding operational obligations. This system ensures the player experiences the financial trade-offs of security decisions.

**Lease structure**

A lease specifies daily payment, lease duration in days, and service class. Service class influences priority in incidents and can modify resource usage patterns. Examples are standard, mission-critical, and embargoed. Embargoed leases carry reputational risks and may trigger compliance penalties in enterprise deployments.

**Revenue calculation**

Revenue per day is the sum of payments from active leases, denominated in Credits (CR). A lease is active if the current day is within `leaseStartDay` and `leaseEndDay`. Late payments can be introduced as narrative events but are not part of the base simulation. Revenue is posted as part of the day end summary and feeds into the player's Credits balance for upgrades, tools, staff, and ransom payments. The player's economy also includes Trust Score (TS) and Intel Fragments (IF) as defined in the BRD (Section 11.4). Trust Score is a reputation gate (0-500+) that unlocks client tiers, contracts, and narrative content. It cannot be purchased and is earned only through consistent good judgment. Trust Score gates tier unlocks and client access (see Section 8). Intel Fragments are earned through attack analysis and incident investigation and may be spent on detection signatures, threat profiles, and IDS upgrades, but do not directly flow through the facility revenue model.

**Operating costs**

Operating costs are a combination of fixed, variable, and tool-specific components.

- Fixed costs are determined by facility tier.
- Variable costs scale with power usage, cooling usage, and bandwidth usage.
- Security tool OpEx is the daily recurring cost of installed security and operations upgrades.
- Maintenance debt increases operating costs through a super-linear multiplier if not addressed. The BRD mandates super-linear maintenance cost scaling to prevent infinite expansion. As maintenance debt grows, costs accelerate rather than scaling linearly.

Security tool OpEx ensures upgrades are not purely beneficial. Even when a tool does not change capacity, it creates ongoing economic pressure that forces trade-offs between protection and expansion. The operating cost model does not need real-world accuracy but must reflect the principle that higher utilization, larger facilities, and heavier security stacks cost more to run. This reinforces resource planning skills.

**Net income and funds**

Daily net income equals revenue minus operating costs, denominated in Credits (CR). The resulting value is applied to the player's Credits balance. Negative net income is allowed and is communicated clearly in the day summary. If Credits reach zero, the player may enter a crisis state, triggering narrative interventions or forced decisions such as selling assets or accepting risky contracts.

**Lease expiry and renewal**

Leases expire automatically when `leaseEndDay` is reached. On expiry, resources are freed and a `facility.client.evicted` event is emitted with reason `lease_expired`. The system can offer renewal options to the player. Renewals are treated as new leases with updated terms and can include resource requirement changes. Renewal offers are surfaced through the inbox and must be approved like any other request.

---

## 11. Tick Simulation and Resource Consumption Model

The facility simulation uses a deterministic tick model to update active resource usage, maintenance debt, and facility health. The default tick is once per day. Additional ticks can be invoked by incidents or by explicit player actions in enterprise modes.

**Tick order**

The facility tick is executed after the Consequence Application phase and before Threat Processing in the day cycle. This ensures threat generation uses up-to-date facility metrics, including utilization and maintenance debt. The tick order is consistent with DD-01 and DD-05.

**Active usage computation**

Active usage is computed by applying burst profiles to each client.

- `none`: usage equals reserved capacity.
- `periodic`: usage oscillates on a predictable schedule. Example: 0.8x to 1.2x of reserved bandwidth every three days.
- `spiky`: usage has occasional deterministic spikes based on the session seed and day index. Spikes are rare but intense.

The spike pattern is deterministic. It uses a pseudo-random number derived from the session seed and client ID. This keeps gameplay unpredictable but reproducible. Spikes are signaled to the player through facility alerts and can be mitigated by specific upgrades or policies.

**Maintenance debt and facility health**

Maintenance debt represents the accumulated risk from ignoring upkeep, overcommitment, and stress events. It increases when utilization exceeds the advisory threshold, when upgrades are installed without sufficient downtime, and when incidents occur. It decreases when the player purchases maintenance upgrades or allocates downtime. Maintenance debt is a float between 0 and 1.

Facility health is a simplified indicator of infrastructure reliability. It starts at 1.0 and declines as maintenance debt grows. It deterministically shifts failure thresholds and severity (lower health triggers failures earlier and makes degradation effects harsher) and can reduce the effectiveness of certain upgrades. Facility health is visible in advanced mode and is summarized as a qualitative status in the default UI.

**Operating cost adjustment**

Operating costs are updated each tick based on active usage and the recurring OpEx of installed tools. This ensures that spikes and incidents affect the economic model, and that security tooling carries an ongoing economic trade-off as required by the BRD. Recurring OpEx covers licensing, signature feeds, monitoring subscriptions, patch support, and increased staffing overhead. The formula is intentionally simple and is provided in Appendix B.

**Resource limit handling**

If active usage exceeds capacity due to spikes or incidents, the system triggers an overload event. Overload events apply immediate penalties, such as service degradation, reputation loss, or forced eviction of low-priority clients. The player may also be offered emergency actions to redistribute bandwidth or power. These actions are limited and carry costs.

---

## 12. Upgrades, Installations, and Maintenance

Upgrades are the primary mechanism by which the player increases capacity, improves defenses, and mitigates maintenance debt. They are also a core educational tool, modeling security investment strategy and architecture planning.

**Upgrade categories**

- Capacity upgrades: increase rack, power, cooling, or bandwidth capacity.
- Efficiency upgrades: reduce resource consumption for existing clients or improve conversion ratios.
- Security upgrades: add defenses that mitigate threat engine attacks. The BRD (FR-GAME-011) specifies the following security tools: firewall, IDS, IPS, SIEM, EDR, WAF, threat intel feed, SOAR, honeypots, zero-trust gateway, and AI anomaly detection.
- Operations upgrades: improve maintenance efficiency, reduce downtime, or provide better monitoring.
- Staff upgrades: hire personnel to improve breach recovery time, incident response capability, and operational efficiency, as specified in the BRD core gameplay loop and economy model. Staff carry recurring OpEx and may reduce breach recovery duration (FR-GAME-018: 1-7 days scaling with tooling and staff).

Each upgrade is represented as an Upgrade Proposal document and can be purchased during the Upgrade Phase. Purchases require sufficient in-game Credits and may require a minimum facility tier. Per the BRD ethical monetization principles (Section 12.3), no facility upgrade or capacity expansion can be purchased with real money. All facility upgrades that affect gameplay power, difficulty, or security skill assessment must be earned through gameplay. Cosmetic-only facility skins are the only premium purchasable items related to the facility.

**Installation timeline**

Upgrades are not instantaneous. They progress through `purchased`, `installing`, and `completed` states. The installation timeline is measured in days and is deterministic. During installation, the upgrade may consume additional resources or temporarily reduce capacity. For example, a cooling upgrade may reduce effective cooling by 10 percent during installation. This creates short-term risk and forces planning.

**Upgrade effects**

Upgrade effects are expressed as resource deltas, security deltas, maintenance deltas, recurring OpEx, and threat-surface deltas.

- Resource deltas increase capacity or reduce usage.
- Security deltas lower breach probability or mitigate specific attack vectors.
- Maintenance deltas reduce maintenance debt accumulation or increase facility health regeneration.
- OpEx per day adds ongoing operating costs for installed tools.
- Threat-surface deltas model new attack vectors introduced by added tooling, management interfaces, or configuration complexity.

Every upgrade therefore has both upside and downside. For example, a WAF reduces web attack success but adds a management plane that can be misconfigured or targeted. The threat-surface delta feeds into the Threat Engine as an exposure modifier (see Section 14), ensuring upgrades are not strictly beneficial and aligning with the BRD requirement that upgrades introduce new risk.

**Maintenance upgrades**

Maintenance upgrades are a distinct category. They do not change capacity but reduce maintenance debt or improve repair speed after incidents. They are intentionally less glamorous than capacity upgrades but critical for long-term stability. This design reinforces the real-world principle that maintenance is a security investment.

**Upgrade gating**

Upgrades are gated by facility tier, by narrative triggers, and by prerequisite upgrades. This prevents the player from stacking powerful defenses too early. The gating rules are listed in the Upgrade Proposal document and in the upgrade catalog (Appendix A). Gating is enforced by the facility module to ensure deterministic outcomes.

---

## 13. Degradation, Failure Modes, and Recovery

Facility degradation introduces long-term consequences for neglecting maintenance, overcommitting resources, or ignoring threats. It is a key component of the simulation because it prevents players from treating the facility as a static capacity pool.

**Degradation sources**

- Prolonged utilization above advisory thresholds.
- Overcommitment events that exceed 100 percent capacity.
- Incidents such as ransomware or malware that stress systems.
- Deferred maintenance actions or ignored alerts.

**Failure modes**

Failure modes are triggered when maintenance debt or facility health passes thresholds.

- Minor failure: temporary capacity reduction in one resource, resolved automatically after one day with a small cost. May include throttling of affected services.
- Major failure: significant capacity reduction, requires player action to repair, may block onboarding. Can trigger partial shutdown of affected systems.
- Cascading failure: multiple resources degrade simultaneously, often triggered by repeated overcommitment or unmitigated incidents. As specified in FR-GAME-010, resource exhaustion triggers cascading failures including throttling, shutdown, and client loss.

Failure modes are deterministic. The system uses thresholds rather than random chance. This ensures clarity and avoids feelings of unfairness. Randomness may be used for narrative flavor in the description but not for the outcome.

**Recovery actions**

The player can recover from degradation through specific actions.

- Purchase maintenance upgrades or repair services.
- Allocate downtime by delaying onboarding or pausing upgrades.
- Accept temporary reputation penalties by reducing service availability.

Recovery actions are surfaced through the facility dashboard and through inbox alerts. They are tied to the narrative, such as a maintenance team requesting access to repair a cooling system. This keeps the system in-world and reinforces the theme of scarcity.

---

## 14. Threat Engine Integration and Incident Effects

The facility simulation is a key input to the Threat Engine and is also impacted by threat outcomes. Integration points are defined in DD-05 and are elaborated here.

**Inputs to Threat Engine**

The threat engine reads facility metrics to decide attack vectors and severity within the five-tier threat level system defined in the BRD (FR-GAME-019): LOW, GUARDED, ELEVATED, HIGH, and SEVERE. These tiers affect attack frequency and sophistication and are influenced by facility metrics. The following metrics are provided.

- `capacityUtilization`: average utilization across resources.
- `bottleneckResource`: the resource with the highest utilization.
- `maintenanceDebt`: cumulative neglect indicator.
- `facilityTier`: tier influences attacker interest and sophistication.
- `securityInvestmentRatio`: proportion of funds spent on security upgrades vs capacity.
- `attackSurfaceScore`: aggregate exposure from installed upgrades and their management interfaces.
- `attackVectorModifiers`: vector-specific deltas contributed by upgrades.

These metrics shape the probability of certain attacks. For example, high bandwidth utilization increases the likelihood of DDoS. High maintenance debt increases the likelihood of equipment failure or breach escalation. As specified in FR-GAME-020, the threat engine is adaptive: it shifts attack vectors based on player behavior. A well-defended perimeter triggers insider manipulation attempts; strong phishing detection triggers supply-chain attacks. From the facility perspective, heavy investment in one security category shifts threats toward the facility's weaker resource dimensions.

Installed upgrades can also introduce new threat vectors. Each upgrade contributes a threat-surface delta and optional vector modifiers, which increase the probability of specific attacks (for example, management plane compromise, misconfiguration exploitation, or supply-chain targeting). Security upgrades may lower some risks while increasing others. This is intentional and reflects the operational reality that added tooling expands the attack surface.

**Threat effects on facility**

Threat events can modify facility state in deterministic ways.

- DDoS attacks temporarily consume bandwidth, reducing available capacity for clients.
- Malware incidents can increase power or cooling usage by causing rogue compute activity.
- Ransomware can lock storage resources, effectively reducing rack capacity until resolved.
- Breach events can reduce trust score, leading to client churn and reduced revenue.
- Successful breach triggers a full-screen ransom note (FR-GAME-015), locking all facility operations. Ransom cost equals total lifetime Credits earned divided by 10, rounded up, minimum 1 CR (FR-GAME-016). If the player can pay, operations resume with Trust Score penalty and 10-40 percent client attrition. If they cannot pay, the game ends (FR-GAME-017). Breach recovery time scales with installed security tooling and staff, ranging from 1 to 7 days (FR-GAME-018). During recovery, facility capacity is partially locked and resource management is restricted. Following recovery, a 30-day post-breach revenue depression applies, reducing income from client leases during this window. As stated in the BRD economy model, breaches are designed to feel devastating without being unrecoverable.

These effects are implemented as event-driven modifiers with explicit durations. They are removed when the incident is resolved or the duration expires.

**Incident response integration**

When incidents occur, the player enters the Incident Response phase defined in DD-01. Facility actions are available in that phase, such as reallocating bandwidth or temporarily suspending low-priority clients. These actions are controlled by the facility module to ensure resource integrity.

**Resource visibility during incidents**

During incidents, the Facility Status panel emphasizes the affected resource. For example, during DDoS the bandwidth gauge pulses and shows a red overlay. The player receives explicit messaging about the impact and available mitigation actions. This aligns with the UI requirements in DD-07.

---

## 15. Capacity Pressure, Decision Consequences, and Player Agency

The facility simulation is designed to create pressure without forcing the player into a single path. Capacity pressure should lead to meaningful decisions, not dead ends.

**Decision consequences**

As required by FR-GAME-007, no facility decision has a single "correct" answer; all options carry trade-offs mirroring real-world security risk acceptance. Approving a large client can yield immediate revenue but can crowd out future clients or increase vulnerability to attacks. Denying a client can preserve capacity but may harm reputation or narrative alignment. The facility simulation makes these trade-offs explicit by showing resource impacts before final approval.

**Mitigation options**

When capacity is tight, the player has multiple options.

- Defer the decision and request additional verification, buying time.
- Evict or downgrade low-priority clients to free capacity.
- Purchase capacity or efficiency upgrades if funds allow.
- Accept a risky overcommitment with explicit consequences.

These options preserve agency and teach the concept of risk management under scarcity.

**Soft fail states**

The facility system avoids hard fail states whenever possible. If the player mismanages capacity, the system introduces penalties such as reduced revenue, increased incidents, or narrative setbacks rather than immediate game over. Hard fail states are reserved for repeated severe neglect, aligning with the BRD emphasis on learning rather than punishment.

**Long-term consequences and echoes**

Facility decisions have long-term impact. Overcommitment increases maintenance debt, which raises failure risk later. Ignoring maintenance leads to degradation, which can cause cascading incidents. These consequences are consistent and deterministic, allowing players to learn from their actions. As specified in BRD Sections 6.1 (FR-GAME-006) and 11.3, every decision produces three layers of consequence: immediate feedback (revenue/cost change), short-term consequences (threat level shift), and delayed consequences called "echoes" that manifest 1-3 chapters later. For facility decisions, echoes include faction reputation shifts that alter future client availability, maintenance debt that compounds over time, and threat engine adaptations that respond to the player's facility investment patterns.

---

## 16. UI Mapping and Player Feedback Requirements

The facility simulation is only effective if the player can understand it quickly and intuitively. UI requirements are defined in DD-07 and are expanded here to ensure the facility system has clear feedback loops.

**Primary displays**

- Facility Dashboard in the center panel when no email is selected. The facility map visualization uses PixiJS (Canvas/WebGL) as specified in the BRD frontend architecture (Section 8.2).
- Facility Status panel on the right with compact gauges and alerts. Resource trend charts use D3.js for data visualization as specified in the BRD.
- Facility Status Report document, accessible via inbox or dashboard, providing detailed breakdowns and trends. DOM-based content (90% of the UI) provides accessibility, text selection, and screen reader support.

**Resource gauges**

Gauges display current usage and capacity in numeric and bar form. The color states match the threat level palette defined in DD-07. Resource gauges must include labels for both units and percent utilization. At critical thresholds, gauges flash or display an alert icon, but animations must respect `prefers-reduced-motion`.

**Capacity check interactions**

When reviewing an email, the player can click a Quick Analysis link to check capacity. This opens a compact overlay that shows projected utilization if the client is approved. The overlay must clearly indicate which resource becomes the bottleneck. If approval is not possible, the overlay shows a blocked status with a reason.

**Facility alerts**

Alerts appear as part of the facility status panel and also as inbox notifications. Each alert includes a short description, affected resource, and recommended action. Alerts are also logged in the Facility Status Report. Examples include "Cooling approaching critical" or "Bandwidth spike detected." Alerts are always paired with text and icons to satisfy accessibility requirements. Real-time facility alert delivery uses WebSocket with SSE fallback for corporate proxy environments, as specified in the BRD (Section 8.6). WebSocket message delivery must meet the BRD performance target of under 50ms at P95.

**Upgrade feedback**

The Upgrade Proposal document must show resource impacts and installation timelines. The UI should display a before and after view for capacity and usage. This reduces cognitive load and reinforces the connection between upgrades and resource availability.

---

## 17. Telemetry, KPIs, and Learning Outcome Instrumentation

The facility simulation produces rich telemetry that can be used for both game balancing and enterprise learning outcomes. This telemetry is routed through the analytics module defined in DD-09.

**Key telemetry events**

- `facility.resource.critical` when utilization exceeds 90 percent.
- `facility.client.onboarded` when a client is accepted.
- `facility.client.evicted` when a client is removed.
- `facility.upgrade.purchased` and `facility.upgrade.completed`.
- `facility.tier.upgraded` when the tier changes.
- `facility.degradation.event` when a failure mode triggers.

**KPIs tied to learning outcomes**

Facility decisions map to security competencies in the BRD. The analytics system should track the following.

- Capacity planning accuracy: number of approvals that stay within safe utilization thresholds.
- Risk acceptance rate: number of overcommitments and their outcomes.
- Maintenance discipline: frequency of maintenance upgrades or downtime actions.
- Incident response effectiveness: resource recovery time after incidents.
- Upgrade strategy: ratio of security upgrades to capacity upgrades.

These KPIs feed into the adaptive learning engine's seven-domain competency model (FR-AN-004: phishing detection, password security, data handling, social engineering resistance, incident response, physical security, compliance awareness). Facility decisions primarily contribute to the incident response, compliance awareness, and physical security domains. Administrators can set minimum competency thresholds that trigger mandatory remediation as specified in BRD Section 11.6.

These KPIs can be surfaced in enterprise dashboards to show behavioral change in resource planning and risk management.

**Player level progression contribution**

Facility decisions contribute XP toward the player's 30-level progression (Intern to CISO) with prestige levels 31-50 offering cosmetic rewards, as defined in the BRD (Section 11.4). Security-correct facility actions, such as maintaining safe utilization, timely maintenance, effective upgrade strategy, and correct incident response, earn XP. The analytics system should track XP earned from facility decisions as a distinct category to support skill modeling and progression balancing.

**Privacy and compliance**

Telemetry must follow the privacy requirements in the BRD. For enterprise deployments, resource decisions can be linked to user IDs but must respect retention settings. For consumer deployments, telemetry should be pseudonymized and aggregated.

---

## 18. Determinism, Save/Load, and Auditability

Determinism is a non-negotiable requirement. The facility simulation must be fully reproducible for the same session seed and event log.

**Deterministic calculations**

All resource calculations use fixed formulas with deterministic inputs. Any variability, such as client burst profiles, is derived from the session seed and client ID. Random number generation uses a deterministic PRNG with explicit seeding. Facility state updates must meet the BRD performance target of game state update latency under 100ms at P95 (Section 7.1). This constrains the complexity of per-tick calculations and requires efficient snapshot retrieval.

**Event sourcing**

Facility changes are implemented as events emitted by the game engine. The facility module applies these events to its state. This event log is the source of truth for auditability. Replay must produce identical resource trajectories. The event-sourced architecture also supports undo/redo capability as specified in the BRD (Section 8.2), allowing players to reverse recent facility decisions where the game design permits it.

**Save and load behavior**

When a session is saved, the facility state is persisted in the database and can be reconstructed from the event log. State snapshots are materialized every 50 events or at day boundaries, as specified in the BRD data architecture. On load, the facility module recalculates derived values such as active usage and operating costs from the most recent snapshot to avoid drift and minimize replay overhead.

**Offline and PWA behavior**

The BRD (Section 8.2) specifies PWA offline capability with a service worker and Workbox. The facility simulation must function fully offline because all resource calculations are deterministic and client-side computable. In offline mode, the facility state is persisted locally and synced to the server when connectivity is restored. The 50 handcrafted offline email scenarios include client resource profiles that the facility module can process without server interaction. Event logs accumulated offline are replayed server-side on reconnection to maintain audit integrity.

**Enterprise audit**

Enterprise deployments require clear evidence of user decisions and their resource impact. The facility system must expose audit summaries that map decisions to resource consequences. This aligns with the compliance requirements in the BRD.

---

## 19. Balancing and Difficulty Scaling Strategy

Balancing the facility simulation is critical to engagement. The system must create tension without overwhelming new players.

**Dynamic difficulty through narrative escalation**

As specified in the BRD (Section 11.6), difficulty is a function of narrative, not a slider: `Difficulty = f(Player Skill, Story Progress, Player Choices)`. Player skill is inferred from detection rate, response time, resource efficiency, and pattern recognition. Story progress sets a baseline difficulty floor. Player choices modify the curve. For the facility simulation, this translates to the following parameter adjustments driven by narrative progression, not player-selected difficulty settings.

- Resource thresholds (advisory and critical) may tighten as the narrative escalates and threats grow more sophisticated.
- Client resource requests scale with day progression, faction reputation, and player choices.
- Operating costs increase as the facility grows and the narrative introduces new pressures.
- Maintenance debt accumulates faster under higher narrative-driven threat levels.
- Every difficulty change is a story event. Players experience escalation as narrative consequence, not as a settings change.

**Adaptive scaling**

The threat engine can increase pressure if the player consistently maintains low utilization and high security investment. This creates a dynamic challenge. However, adaptive scaling must never produce impossible resource requirements. The facility system maintains a minimum ratio of feasible clients to ensure the player always has viable options.

**Breathing rooms**

As specified in the BRD (Section 11.6), after major incidents such as breaches or cascading failures, the system introduces recovery chapters with lower-threat requests and reduced resource pressure. This prevents burnout and mirrors real-world attack pattern ebbs. The facility simulation supports this by temporarily lowering client resource demands and reducing maintenance debt accumulation during breathing room periods.

**Economic balance**

The balance between revenue and operating cost must allow the player to upgrade at a reasonable pace without forcing constant overcommitment. Early game should allow cautious growth, mid game should encourage strategic expansion, and late game should test resilience under high threat pressure.

**Playtesting guidance**

Balancing requires empirical tuning. Initial values should be conservative. Telemetry and playtesting should be used to adjust resource requests, upgrade costs, and operating cost multipliers.

---

## 20. Accessibility, Pace Controls, and Player Stress Management

The facility simulation creates pressure. This pressure must be adjustable to support accessibility and avoid player burnout.

**WCAG 2.1 AA compliance**

All facility UI elements must meet WCAG 2.1 Level AA as the baseline standard (BRD Section 7.5). This includes minimum 4.5:1 contrast ratio for all text, 3:1 for large text, keyboard accessibility with visible focus indicators for all interactive facility controls, screen reader support with ARIA roles and live regions for resource alerts, and a color-blind safe palette with secondary encoding (text labels, icons, patterns) for resource gauges and threshold indicators. The terminal aesthetic CRT effects on facility displays are implemented as CSS overlays on a clean, accessible base and are fully disableable without losing functionality. A VPAT is maintained and updated with each release.

**Pace controls**

The player can pause the game at any time. Facility ticks do not advance while paused. Incident timers are suspended during pause. This aligns with the accessibility principles in DD-01 and DD-07. As specified in BRD Section 7.5, there are no forced time limits on individual decisions; pressure comes from queue backlog and resource scarcity, not per-item timers.

**Relaxed mode (accessibility accommodation)**

Relaxed mode is an accessibility accommodation, not a difficulty setting. It reduces resource pressure by increasing baseline capacity and lowering operating costs. It also reduces the frequency and severity of incident-driven resource spikes. This mode is appropriate for players who want narrative focus or who are using the game for introductory learning. The BRD's core difficulty model remains narrative-driven even in relaxed mode; this accommodation adjusts the baseline parameters within which the narrative difficulty function operates.

**Clarity over speed**

The facility simulation avoids strict time-based deadlines outside incident response. The primary source of pressure is queue backlog and resource scarcity, not real-time countdowns. This design avoids punishing players with slower reading or cognitive processing speed.

---

## 21. Enterprise Context, Compliance, and Admin Controls

The facility simulation must support enterprise deployments where administrators need control over pacing, reporting, and configuration.

**Admin-configurable parameters**

- Resource threshold settings for advisory and critical alerts.
- Maximum overcommit allowance and whether it is permitted at all.
- Upgrade availability and cost multipliers.
- Facility tier progression speed and gating requirements.

These parameters can be set per tenant to align with training goals. Facility data adheres to the hybrid multi-tenancy isolation model specified in the BRD (FR-ENT-001 through FR-ENT-003): shared database with schema-level isolation for SMB, dedicated schema for mid-market, and dedicated database instance for enterprise. Every facility database table includes a non-nullable `tenant_id` column with row-level security enforced at the database level. Cross-tenant facility queries are impossible from the application layer.

**Compliance reporting**

Facility decisions contribute to compliance training outcomes. Reports should map facility actions to the relevant NIST CSF categories or regulatory frameworks. For example, resource planning aligns with PR.IP-01 and PR.PT-01. This mapping is required in enterprise dashboards. Facility event logs are subject to configurable retention policies per regulatory framework (1-7 years, as specified in BRD Section 9.4 and FR-ENT-031), with the longest applicable period governing. Automated deletion or anonymization occurs at expiration. Immutable audit logs use SHA-256 cryptographic integrity verification (FR-ENT-030).

**Role-based access**

In enterprise deployments, the hybrid RBAC + ABAC model (FR-ENT-011) controls facility access. The built-in roles (Super Admin, Tenant Admin, Manager, Trainer, Learner) determine facility metric visibility and manipulation rights. Learners interact with facility decisions as part of gameplay. Trainers and Managers can view facility metrics and analytics but cannot manipulate player decisions. Tenant Admins and Super Admins can configure facility parameters and view aggregate reporting. This preserves training integrity while supporting administrative oversight.

---

## 22. Testing and Validation Strategy

Testing ensures the facility simulation is correct, deterministic, and balanced.

**Unit tests**

- Resource calculation for client profiles.
- Capacity checks and bottleneck identification.
- Upgrade installation timelines and resource deltas.
- Maintenance debt accumulation and reduction.

**Integration tests**

- Facility module interactions with game engine event log.
- Threat engine consumption of facility metrics.
- UI rendering of facility status under various utilization states.

**Determinism tests**

- Replay a session with identical event logs and confirm exact facility state reproduction.
- Cross-platform consistency test across web and desktop builds.

**Balance tests**

- Simulated playthroughs at different narrative progression stages to ensure feasible paths exist without overcommit.
- Stress tests with high utilization and multiple incidents to ensure system does not produce invalid states.

---

## 23. Open Questions and Decision Log

**Open questions**

- Should facility health be visible by default or only in advanced mode.
- Should overcommit be enabled by default or unlocked as an upgrade or policy.
- How should facility tier upgrades be visually represented in the terminal aesthetic.
- Should maintenance debt affect threat probability directly or only through facility health.

**Decision log (initial)**

- Use four canonical resources with simplified units to preserve clarity.
- Implement deterministic burst profiles to add variability without randomness.
- Tie tier upgrades to narrative gates to reinforce story progression.
- Expose facility metrics in the right panel and detailed report to satisfy UI clarity.

---


## 24. Resource Forecasting, Capacity Planning, and Advisory Tools

Resource management is more than a snapshot of current usage. The player must understand how today's choices affect tomorrow's capacity, costs, and risk. The facility simulation therefore includes forecasting and advisory tools that project resource utilization and operating costs over a short horizon. These tools are intentionally simple but provide just enough forward visibility to teach planning behavior.

**Forecasting horizon**

The default forecasting horizon is three days. This is long enough to show the effect of upcoming lease expirations, upgrade completions, and scheduled maintenance while remaining manageable for a casual player. The horizon is fixed for determinism and can be adjusted for enterprise deployments.

**Forecast inputs**

Forecasts are derived from deterministic data already in the facility state. The projection uses the following inputs.

- Active leases and their expiration dates.
- Installed upgrades and their completion dates.
- Known incident timers and their duration.
- Deterministic burst profiles for clients.
- Fixed operating costs based on facility tier.

This means forecasts are predictable, reproducible, and audit-friendly. They do not include speculative future emails or unknown threats. This choice preserves player agency and avoids a false sense of certainty.

**Projected utilization view**

The Facility Status Report includes a small trend chart for each resource. The chart shows the last three days of utilization and a projection for the next three days. The projection is not a promise. It is annotated as a forecast so players understand that new events could change it. In the UI, projected values are shown in a dashed line with lower contrast.

**Capacity advisory tool**

When a player checks capacity for a specific request, the system provides a projected impact statement. This statement includes two numbers.

- Immediate utilization after approval.
- Predicted utilization at day plus three, assuming no other changes.

The projection helps the player see if approving a high-value request will crowd out other expected events like upgrade installation or lease renewals. This teaches a basic form of capacity planning.

**Warning escalation rules**

Forecasting does not create new failure states, but it can trigger early warnings. If the projected utilization crosses the critical threshold within the forecast horizon, the system raises an advisory alert. The alert uses a softer language, such as "Projected cooling strain in 2 days." This is different from a critical alert and is visually distinct in the UI.

**Decision support without automation**

The forecasting tools are advisory only. They never auto-deny a request or auto-purchase an upgrade. This keeps the player in control and avoids an automated feel that would break the stealth learning theme. The tools exist to make the decision consequences visible, not to make decisions for the player.

**Enterprise analytics usage**

In enterprise deployments, forecast accuracy can be measured. This provides a subtle learning metric: if a player consistently ignores forecasts and suffers consequences, it may indicate poor planning behavior. The system can surface this as coaching feedback after sessions.

---

## 25. Policy Controls, Service Classes, and Quotas

The facility simulation supports policy controls that alter how resources are allocated and how decisions are constrained. Policies are not automatic. They are explicit settings the player can adopt through upgrades, narrative decisions, or enterprise configuration. This system models real-world governance and reinforces the concept that operational policy is a security tool.

**Service classes**

Each client lease is assigned a service class. Service class controls priority during incidents and can influence resource guarantees.

- Standard: default class with no special guarantees.
- Mission-critical: higher priority during incidents, higher payment, and higher penalties if disrupted.
- Embargoed: high risk class used for questionable clients. Embargoed clients may bring immediate revenue but raise incident probabilities.

Service class affects how resources are shed during overload. If a resource exceeds capacity, the system reduces allocation or suspends lower priority classes first. This creates a visible link between policy and operational outcomes.

**Resource quotas**

Quotas allow the player to reserve a portion of capacity for specific factions or for internal use. For example, a player can set a policy that no more than 40 percent of bandwidth is allocated to corporate clients. Quotas are optional and may reduce revenue in the short term, but they protect against overdependence on a single faction. This models diversification and risk distribution.

**Policy enforcement**

Policies are enforced at onboarding and during incident response.

- Onboarding: capacity checks include quota rules. A client may be denied even if capacity exists because a quota would be exceeded.
- Incident response: when shedding load, policies determine which clients are protected and which are throttled.

The enforcement rules are deterministic and visible. The player can always see which policy caused a denial or restriction. This transparency is essential for learning.

**Policy acquisition**

Policies are unlocked through upgrades or narrative decisions. For example, a "Governance Console" upgrade might unlock quota management, while a story decision to align with a faction could unlock preferential service classes. This keeps policies within the narrative and prevents them from feeling like abstract settings.

**Enterprise controls**

Enterprise admins can override or lock policy settings for training consistency. This ensures that training outcomes can be standardized across a tenant. When policies are locked, the UI displays them as read-only with a note explaining the restriction.

---

## 26. Narrative and Faction Integration

Facility decisions are not just operational. They are narrative signals that shape faction relations and story progression. The facility simulation therefore exposes events and triggers that the narrative system can use to create consequences.

**Faction sensitivity to resources**

Each faction has implicit resource preferences.

- The Sovereign Compact values redundancy and expects mission-critical service class.
- Nexion Industries demands high bandwidth and rapid scaling.
- The Librarians favor long-term storage with predictable consumption.
- Hacktivist collectives often request high bandwidth bursts and have ambiguous legitimacy.
- Criminal networks typically request large rack and power allocations under short leases.

These preferences create different stress patterns on the facility. By accepting certain factions, the player indirectly shapes resource utilization profiles and incident risk. The BRD (Section 11.3) defines a Reputation System with five faction axes and threshold-triggered events. When faction reputation crosses thresholds, the narrative system can alter facility conditions, unlock or restrict client types, or trigger faction-specific incidents. This is a narrative tool that also reinforces risk management training.

**Narrative triggers from facility states**

Several facility events can trigger narrative content.

- Reaching a new facility tier unlocks a narrative chapter.
- Prolonged resource strain can trigger Morpheus warnings or faction interventions.
- Overcommitment can lead to narrative events where a faction exploits weakness.
- Successful maintenance recovery can unlock recognition or bonuses.

These narrative hooks ensure that the facility system is not a dry simulation. It is a story engine that reacts to operational behavior.

**Moral tension and operational trade-offs**

The facility system enables moral dilemmas. For example, a request from a humanitarian faction might exceed capacity. Approving it could risk a breach, while denying it could harm the narrative. The system should surface these dilemmas clearly, with resource impacts shown alongside narrative stakes. This is aligned with the "Papers, Please" inspiration in the BRD.

---

## 27. Future Extensions and Multiplayer Considerations

While multiplayer and multi-site operations are out of scope for the current phase, the facility simulation should be extensible. This section outlines future considerations to avoid architectural dead ends.

**Multi-site facilities**

A future expansion could allow the player to operate multiple facilities across regions. The facility model should therefore allow multiple facility states per session in the backend schema, even if only one is active initially. This would enable future data residency mechanics and geo-specific threat profiles.

**Resource trading and alliances**

Future cooperative modes could allow players to trade capacity or share upgrades. This requires a clean separation between local facility state and shared resources. The current model should avoid hardcoding assumptions that a facility is always independent.

**Multiplayer incident response**

In cooperative missions (2-6 players per FR-MP-001), one player could handle triage while another manages resources. The BRD specifies role specialization mapping to real SOC roles (FR-MP-002), including Systems Keeper (SysAdmin) who would directly interact with the facility simulation. Cooperative difficulty tiers (Training, Standard, Hardened, Nightmare per FR-MP-004) should scale facility resource pressure accordingly. This requires clear APIs for facility state retrieval and update, and a locking strategy to avoid conflicting updates. The event-sourced architecture described in DD-09 supports this because events can be merged and replayed.

**Seasonal content and facility modifiers**

The BRD (FR-CON-005, FR-CON-006) defines a seasonal episodic structure with 4 seasons per year, each with 11 chapters over 12 weeks. Season themes have direct facility implications: Season 1 (Signal Loss/Stuxnet) focuses on core facility operations; Season 2 (Supply Lines/SolarWinds) could introduce supply chain-compromised upgrades and vendor trust mechanics; Season 3 (Dark Channels/Ransomware) escalates breach pressure and facility lockdown scenarios; Season 4 (The Inside Job/Insider Threats) could introduce staff-related facility vulnerabilities. The facility simulation should support temporary modifiers layered on top of base capacity without permanent schema changes.

---
## 28. Appendix A: Facility Tier Reference Tables

The following table provides example capacity values for each tier. These values are configuration defaults and can be adjusted during balancing.

| Tier | Rack Capacity (U) | Power Budget (kW) | Cooling (tons) | Bandwidth (Mbps) | Base Operating Cost per Day |
| --- | --- | --- | --- | --- | --- |
| Outpost | 42 | 10.0 | 5.0 | 100 | 500 |
| Station | 84 | 20.0 | 10.0 | 250 | 1200 |
| Vault | 168 | 40.0 | 20.0 | 500 | 2600 |
| Fortress | 252 | 60.0 | 30.0 | 1000 | 4200 |
| Citadel | 336 | 80.0 | 40.0 | 2000 | 6500 |

**Tier progression requirements (example defaults)**

| Tier Upgrade | Funds Required | Trust Required (TS, 0-500+) | Narrative Gate |
| --- | --- | --- | --- |
| Outpost -> Station | 25,000 | 100 | Complete Act I: "Stability" |
| Station -> Vault | 80,000 | 200 | Resolve Nexion contract conflict |
| Vault -> Fortress | 200,000 | 325 | Survive multi-phase breach campaign |
| Fortress -> Citadel | 500,000 | 450 | Achieve "Global Node" status |

---

## 29. Appendix B: Resource Formula Catalog

All formulas are deterministic and use rounded values at two decimals for floating types.

**B1. Utilization**

- `utilization(resource) = used / capacity`

**B2. Bottleneck Resource**

- `bottleneck = max(utilization(rack), utilization(power), utilization(cooling), utilization(bandwidth))`

**B3. Operating Costs**

- `securityOpEx = sum(opExPerDay for all installed upgrades)`
- `operatingCost = baseCost + securityOpEx + (powerUsedKw * powerRate) + (coolingUsedTons * coolingRate) + (bandwidthUsedMbps * bandwidthRate)`
- `operatingCost = operatingCost * (1 + maintenanceDebt^superLinearExponent * maintenanceMultiplier)` (exponent > 1.0, default 1.5, to enforce BRD-mandated super-linear maintenance cost scaling that prevents infinite expansion)

**B4. Maintenance Debt Accumulation**

- `maintenanceDebt += 0.01 for each resource above advisory threshold`
- `maintenanceDebt += 0.03 if any resource above critical threshold`
- `maintenanceDebt += incidentPenalty`
- `maintenanceDebt = clamp(0, 1, maintenanceDebt)`

**B5. Facility Health**

- `facilityHealth = 1.0 - maintenanceDebt * healthMultiplier`

**B6. Burst Usage**

- `activeUsage = reservedUsage * burstFactor`
- `burstFactor` is derived from deterministic PRNG based on seed and day index

---

## 30. Appendix C: Example Day Walkthrough with Facility Events

**Day 12 Summary**

The facility is at Station tier. Current resource usage is 70 percent rack, 65 percent power, 72 percent cooling, and 48 percent bandwidth. Maintenance debt is low at 0.12. The player receives three new requests.

**Request 1: University Archive**

- Requires 12U rack, 2.0 kW power, 1.2 tons cooling, 20 Mbps bandwidth.
- Capacity check shows that rack would rise to 98 percent. Cooling would rise to 90 percent.
- The player approves after verifying legitimacy.
- Facility now sits at 98 percent rack and 90 percent cooling.
- A `facility.resource.critical` event is emitted for rack and cooling.
- The facility dashboard shows critical alerts.

**Request 2: Corporate Logistics**

- Requires 8U rack, 3.0 kW power, 2.0 tons cooling, 50 Mbps bandwidth.
- Capacity check shows rack would exceed 100 percent and cooling would exceed 110 percent.
- The system blocks approval. The player flags for review.

**Request 3: Hacktivist Mirror**

- Requires 4U rack, 1.0 kW power, 0.5 tons cooling, 80 Mbps bandwidth.
- Bandwidth would exceed 100 percent.
- The player denies after noticing suspicious indicators.

**Incident**

During Threat Processing, the threat engine triggers a low-severity DDoS. Bandwidth usage spikes by 60 Mbps. The facility exceeds bandwidth capacity. An overload event reduces bandwidth availability for one day and triggers a warning.

**Resource Management**

The player purchases a bandwidth upgrade. Installation will take two days and reduces bandwidth capacity by 10 percent during installation. The player also decides to evict a low-priority client to free 8U rack.

**Day End**

Revenue is positive but operating costs increase due to high utilization. Maintenance debt rises to 0.18. The player advances the day with clear understanding of the new constraints.

This walkthrough demonstrates how resource pressure creates meaningful decisions and how the facility system communicates consequences to the player.

---

## 31. Appendix D: Event Schema and Pseudocode

**D1. Facility Events (logical)**

```text
facility.client.onboarded
facility.client.evicted
facility.resource.critical
facility.upgrade.purchased
facility.upgrade.completed
facility.tier.upgraded
facility.degradation.event
```

**D2. Pseudocode for Client Onboarding**

```pseudo
function onboardClient(sessionId, clientProfile):
  state = facility.getState(sessionId)
  requirements = facility.calculateClientResources(clientProfile)
  if exceedsCapacity(state, requirements):
    return { ok: false, reason: bottleneckResource(state, requirements) }
  reserveResources(state, requirements)
  createLease(clientProfile)
  emitEvent('facility.client.onboarded', clientProfile.id)
  return { ok: true }
```

**D3. Pseudocode for Daily Tick**

```pseudo
function facilityDailyTick(sessionId, dayIndex):
  state = facility.getState(sessionId)
  activeUsage = computeActiveUsage(state.clients, dayIndex)
  state = applyUsage(state, activeUsage)
  state = applyMaintenanceDebt(state)
  state = computeOperatingCosts(state)
  if anyResourceCritical(state):
    emitEvent('facility.resource.critical')
  saveState(state)
  return state
```

---


## 32. Appendix E: Upgrade Catalog and Resource Effects

The following catalog lists representative upgrades. Values are example defaults and are configuration-driven.

| Upgrade ID | Name | Category | Min Tier | Cost | Install Days | Resource Delta | Security Delta | OpEx / Day | Threat Surface Delta | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UPG-RACK-01 | Expansion Pod A | Capacity | Outpost | 8,000 | 1 | +10U rack | None | 50 | +0.02 | Basic rack expansion kit |
| UPG-RACK-02 | Expansion Pod B | Capacity | Station | 18,000 | 2 | +20U rack | None | 90 | +0.04 | Requires downtime window |
| UPG-RACK-03 | Modular Vault C | Capacity | Vault | 45,000 | 3 | +40U rack | None | 160 | +0.06 | Adds maintenance overhead |
| UPG-POWER-01 | Power Bus Upgrade | Capacity | Outpost | 6,500 | 1 | +2.5 kW | None | 40 | +0.03 | Slight cooling penalty |
| UPG-POWER-02 | Redundant Feed | Capacity | Station | 14,000 | 2 | +5.0 kW | None | 80 | +0.05 | Improves outage resilience |
| UPG-POWER-03 | High Density Feed | Capacity | Vault | 35,000 | 3 | +10.0 kW | None | 140 | +0.07 | Requires rack rebalancing |
| UPG-COOL-01 | Chiller Booster | Capacity | Outpost | 7,500 | 1 | +1.5 tons | None | 45 | +0.03 | Minor power increase |
| UPG-COOL-02 | Liquid Loop Retrofit | Capacity | Station | 16,000 | 2 | +3.0 tons | None | 90 | +0.05 | Reduces maintenance debt growth |
| UPG-COOL-03 | Cryo Stack | Capacity | Fortress | 60,000 | 4 | +8.0 tons | None | 180 | +0.08 | High installation risk |
| UPG-BW-01 | Link Aggregation | Capacity | Outpost | 9,000 | 1 | +50 Mbps | None | 60 | +0.03 | No downtime |
| UPG-BW-02 | Microwave Relay | Capacity | Station | 20,000 | 2 | +150 Mbps | None | 120 | +0.06 | Vulnerable to storms event |
| UPG-BW-03 | Fiber Ring | Capacity | Vault | 55,000 | 3 | +400 Mbps | None | 220 | +0.09 | Adds resilience vs DDoS |
| UPG-EFF-01 | Power Optimization Suite | Efficiency | Outpost | 5,000 | 1 | -5 percent power usage | None | 70 | +0.05 | Requires monitoring upgrade |
| UPG-EFF-02 | Cooling Balancer | Efficiency | Station | 12,000 | 2 | -8 percent cooling usage | None | 110 | +0.06 | Lowers maintenance debt |
| UPG-EFF-03 | Bandwidth Shaper | Efficiency | Station | 14,000 | 2 | -10 percent bandwidth usage | Minor | 130 | +0.07 | Also reduces DDoS impact |
| UPG-SEC-01 | IDS Sensor Grid | Security | Outpost | 10,000 | 1 | None | +Low vs intrusion | 150 | +0.10 | Adds sensor management plane |
| UPG-SEC-02 | WAF Gateway | Security | Station | 18,000 | 2 | None | +Medium vs web attacks | 220 | +0.14 | Misconfig risk and rule updates |
| UPG-SEC-03 | SIEM Core | Security | Vault | 40,000 | 3 | +2U rack, +0.5 kW | +High vs multi-vector | 350 | +0.20 | Centralized data pipeline exposure |
| UPG-SEC-04 | DDoS Mitigation Node | Security | Station | 22,000 | 2 | +0.5 kW | +High vs DDoS | 260 | +0.16 | New edge services surface |
| UPG-SEC-05 | Zero Trust Broker | Security | Fortress | 80,000 | 4 | +4U rack, +1.0 kW | +High vs social engineering | 420 | +0.24 | Complex policy engine |
| UPG-SEC-06 | Perimeter Firewall | Security | Outpost | 8,000 | 1 | +1U rack, +0.3 kW | +Medium vs network intrusion | 130 | +0.08 | Rule management overhead |
| UPG-SEC-07 | IPS Gateway | Security | Station | 15,000 | 2 | +1U rack, +0.5 kW | +Medium vs intrusion, +Low vs malware | 190 | +0.12 | False positive tuning required |
| UPG-SEC-08 | EDR Suite | Security | Vault | 28,000 | 2 | +2U rack, +0.5 kW | +High vs malware, +Medium vs ransomware | 300 | +0.18 | Endpoint agent management plane |
| UPG-SEC-09 | Threat Intel Feed | Security | Station | 12,000 | 1 | None | +Low vs all vectors (early warning) | 200 | +0.06 | Feed integration and parsing |
| UPG-SEC-10 | SOAR Platform | Security | Fortress | 65,000 | 4 | +3U rack, +0.8 kW | +High vs multi-vector (automated response) | 380 | +0.22 | Playbook and API exposure |
| UPG-SEC-11 | Honeypot Network | Security | Vault | 20,000 | 2 | +2U rack, +0.3 kW | +Medium vs intrusion (deception) | 160 | +0.10 | Attacker redirection surface |
| UPG-SEC-12 | AI Anomaly Detection | Security | Fortress | 75,000 | 3 | +4U rack, +1.5 kW | +High vs insider threat, +Medium vs zero-day | 450 | +0.26 | ML model drift and data pipeline |
| UPG-OPS-01 | Maintenance Bay | Operations | Outpost | 6,000 | 1 | None | None | 90 | +0.05 | -15 percent maintenance debt growth |
| UPG-OPS-02 | Spare Parts Cache | Operations | Station | 12,000 | 2 | None | None | 120 | +0.06 | Reduces failure recovery time |
| UPG-OPS-03 | Automation Console | Operations | Vault | 30,000 | 3 | +1U rack, +0.3 kW | None | 180 | +0.10 | Improves forecast accuracy |
| UPG-OPS-04 | Incident Response Suite | Operations | Vault | 35,000 | 3 | None | +Medium response | 200 | +0.12 | Adds response tooling surface |
| UPG-STAFF-01 | Junior Technician | Staff | Outpost | 4,000 | 0 | None | None | 150 | +0.00 | -10% maintenance debt growth, -1 day breach recovery |
| UPG-STAFF-02 | Security Analyst | Staff | Station | 10,000 | 0 | None | +Low vs all vectors | 280 | +0.00 | -1 day breach recovery, improves incident response |
| UPG-STAFF-03 | Senior Engineer | Staff | Vault | 25,000 | 0 | None | None | 400 | +0.00 | -20% maintenance debt growth, -2 day breach recovery |
| UPG-TIER-01 | Station Upgrade | Tier | Outpost | 25,000 | 3 | Tier change | None | 0 | +0.00 | Unlocks Station tier |
| UPG-TIER-02 | Vault Upgrade | Tier | Station | 80,000 | 4 | Tier change | None | 0 | +0.00 | Unlocks Vault tier |
| UPG-TIER-03 | Fortress Upgrade | Tier | Vault | 200,000 | 5 | Tier change | None | 0 | +0.00 | Unlocks Fortress tier |
| UPG-TIER-04 | Citadel Upgrade | Tier | Fortress | 500,000 | 6 | Tier change | None | 0 | +0.00 | Unlocks Citadel tier |

---

## 33. Appendix F: Facility Alerts and Messaging Library

This library standardizes facility alerts for consistent UI copy and analytics tagging. Messages are examples and can be localized.

| Alert Key | Trigger Condition | Player Message | Recommended Action |
| --- | --- | --- | --- |
| FAC-ALERT-001 | Rack utilization > 70 percent | "Rack capacity trending high." | Review pending requests, consider expansion |
| FAC-ALERT-002 | Rack utilization > 90 percent | "Rack capacity critical." | Defer or evict, purchase rack expansion |
| FAC-ALERT-003 | Power utilization > 70 percent | "Power draw approaching limit." | Optimize power usage, install power upgrade |
| FAC-ALERT-004 | Power utilization > 90 percent | "Power grid near overload." | Reduce load, delay installations |
| FAC-ALERT-005 | Cooling utilization > 70 percent | "Cooling headroom shrinking." | Install cooling upgrade, schedule maintenance |
| FAC-ALERT-006 | Cooling utilization > 90 percent | "Cooling critical. Thermal risk." | Reduce heat load, prioritize cooling |
| FAC-ALERT-007 | Bandwidth utilization > 70 percent | "Bandwidth saturation rising." | Review high bandwidth clients |
| FAC-ALERT-008 | Bandwidth utilization > 90 percent | "Bandwidth critical. Latency spikes." | Activate shaping, consider mitigation |
| FAC-ALERT-009 | Maintenance debt > 0.4 | "Maintenance backlog growing." | Purchase maintenance bay, schedule downtime |
| FAC-ALERT-010 | Maintenance debt > 0.7 | "Infrastructure reliability at risk." | Halt expansion, repair critical systems |
| FAC-ALERT-011 | Overcommitment event | "Temporary overcommit active." | Expect instability, plan rollback |
| FAC-ALERT-012 | Upgrade installing | "Upgrade installation in progress." | Plan for reduced capacity |
| FAC-ALERT-013 | Upgrade completed | "Upgrade operational." | Review capacity and adjust plans |
| FAC-ALERT-014 | DDoS active | "External traffic flood detected." | Activate mitigation, reallocate bandwidth |
| FAC-ALERT-015 | Lease expiry upcoming | "Client lease expires in 2 days." | Consider renewal or release |
| FAC-ALERT-016 | Facility tier unlocked | "Expansion path unlocked." | Review tier upgrade proposal |

---

## 34. Appendix G: Scenario Matrix for Balancing and QA

The scenario matrix defines test cases for balancing and quality assurance. Each scenario has a deterministic starting state and expected outcomes. These scenarios can be used for automated simulation testing.

| Scenario ID | Description | Starting Tier | Key Conditions | Expected Outcome |
| --- | --- | --- | --- | --- |
| SCN-001 | Early game steady growth | Outpost | 3 small clients, low threats | Player can expand without overcommit |
| SCN-002 | High bandwidth surge | Station | 70 percent bandwidth, DDoS risk | DDoS causes overload unless mitigated |
| SCN-003 | Cooling bottleneck | Station | Cooling at 88 percent, rack at 40 percent | Capacity check blocks cooling-heavy client |
| SCN-004 | Power constrained upgrade | Vault | Power at 90 percent, upgrade needs +3 kW | Upgrade install blocked or deferred |
| SCN-005 | Maintenance debt spiral | Vault | Debt 0.65, no maintenance upgrades | Minor failure triggers within 2 days |
| SCN-006 | Lease expirations | Station | Two large leases expiring next day | Forecast shows relief, approvals feasible after expiry |
| SCN-007 | Overcommit allowed | Outpost | Policy allows 5 percent overcommit | Overcommit yields short-term revenue, raises debt |
| SCN-008 | Tier upgrade stress | Fortress | Upgrade installation reduces cooling by 10 percent | Cooling critical alert appears |
| SCN-009 | Mixed faction portfolio | Vault | Balanced clients from all factions | No single resource dominates utilization |
| SCN-010 | Criminal network spike | Station | Spiky bandwidth client plus DDoS | Bandwidth overload, client evicted |

---

## 35. Appendix H: Competency Mapping for Facility Decisions

This appendix maps facility decisions to security competencies and NIST CSF categories. It is used in enterprise reporting.

| Facility Action | Security Competency | NIST CSF Category | Measurement Method |
| --- | --- | --- | --- |
| Approve request within safe capacity | Capacity planning | PR.IP-01 | Approval accuracy vs capacity |
| Deny request due to bottleneck | Risk identification | ID.RA-01 | Correct denial rate |
| Overcommit with warning | Risk acceptance | ID.RA-02 | Overcommit frequency and outcomes |
| Purchase capacity upgrade | Security investment planning | PR.IP-01 | Upgrade timing vs utilization |
| Purchase security upgrade | Security budget allocation, defense architecture | PR.PT-01 | Security spend ratio |
| Allocate bandwidth during incident | Incident response | RS.MI-02 | Response time and effectiveness |
| Evict low priority client | Operational decision-making | PR.AC-04 | Eviction correctness |
| Maintain low maintenance debt | Governance and hygiene | ID.GV-01 | Maintenance debt trend |
| Review Facility Status Report | Security monitoring, dashboard interpretation | DE.CM-01 | Dashboard review frequency and response to alerts |
| Use forecasting tools | Strategic planning | ID.RM-01 | Forecast alignment with outcomes |

---
**End of Document**
