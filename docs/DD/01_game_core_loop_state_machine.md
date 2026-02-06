# 01 -- Game Core Loop & State Machine Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-01
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Game Design
**Authors:** Game Design & Systems Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Non-Goals](#2-scope-and-non-goals)
3. [Inputs and Dependencies](#3-inputs-and-dependencies)
4. [Design Principles](#4-design-principles)
5. [Core Loop Overview](#5-core-loop-overview)
6. [Session Lifecycle (Macro Loop)](#6-session-lifecycle-macro-loop)
7. [Day Cycle (Primary Loop)](#7-day-cycle-primary-loop)
8. [Inbox and Email Triage Loop](#8-inbox-and-email-triage-loop)
9. [Verification and Risk Assessment Loop](#9-verification-and-risk-assessment-loop)
10. [Decision Loop and Player Actions](#10-decision-loop-and-player-actions)
11. [Consequence Resolution Loop](#11-consequence-resolution-loop)
12. [Threat, Breach, and Incident Integration](#12-threat-breach-and-incident-integration)
13. [Resource Management and Upgrade Loop](#13-resource-management-and-upgrade-loop)
14. [Narrative Progression and Faction Influence](#14-narrative-progression-and-faction-influence)
15. [Difficulty, Adaptation, and Skill Modeling](#15-difficulty-adaptation-and-skill-modeling)
16. [State Machine Specification](#16-state-machine-specification)
17. [Data Model and Event Sourcing](#17-data-model-and-event-sourcing)
18. [UI Mapping and Player Feedback](#18-ui-mapping-and-player-feedback)
19. [Accessibility and Time Pressure Model](#19-accessibility-and-time-pressure-model)
20. [Telemetry, KPIs, and Learning Outcomes](#20-telemetry-kpis-and-learning-outcomes)
21. [Failure, Recovery, and End States](#21-failure-recovery-and-end-states)
22. [Determinism, Save/Load, and Replay](#22-determinism-saveload-and-replay)
23. [Anti-Frustration and Coaching Systems](#23-anti-frustration-and-coaching-systems)
24. [Testing and Validation Strategy](#24-testing-and-validation-strategy)
25. [Open Questions and Decision Log](#25-open-questions-and-decision-log)
26. [Appendix A: ASCII Diagrams](#26-appendix-a-ascii-diagrams)
27. [Appendix B: Example Event Flow](#27-appendix-b-example-event-flow)
28. [Appendix C: State Table Details](#28-appendix-c-state-table-details)
29. [Appendix D: Example Day Walkthrough](#29-appendix-d-example-day-walkthrough)

---

## 1. Executive Summary

This document defines the core gameplay loop and the authoritative state machine for The DMZ: Archive Gate. The core loop operationalizes the stealth learning concept specified in the BRD by embedding phishing detection, access control, incident response, and risk management skills inside a repeatable, high-stakes management loop. The state machine formalizes how the player moves through a game day, how decisions are validated, and how outcomes affect the next cycle.

The core loop is deliberately simple at the top level to ensure onboarding clarity and long-term mastery. A player receives access requests, analyzes them, verifies identity claims, decides to approve or deny, then observes consequences, allocates resources, upgrades defenses, and advances to the next day. That loop is reinforced by a state machine that ensures deterministic, auditable progression across devices, sessions, and enterprise deployments.

The state machine is structured in two layers. The macro layer governs session lifecycle states such as session creation, active play, breach recovery, and completion. The micro layer governs per-day phases such as inbox intake, triage, verification, decision processing, threat processing, incident response, and day end. Each state is associated with entry actions, exit conditions, legal player actions, and events emitted to the analytics pipeline. This design integrates with the backend modular monolith (game-engine module) and aligns with the Threat Engine and breach mechanics document by treating threat generation and breach resolution as explicit phases with clear inputs and outputs.

The specification prioritizes determinism, clarity, and narrative justification. Every state transition must be explainable to the player through diegetic UI cues, and every difficulty shift must be narratively contextualized. This is a foundational document for implementation, telemetry, and QA. It is also a reference for future content designers and enterprise stakeholders to understand how gameplay maps to security skills.

---

## 2. Scope and Non-Goals

**In scope**

- The canonical core loop for a single-player session in the core game mode.
- The deterministic state machine for the session lifecycle and the day cycle.
- The integration points between the core loop, the Threat Engine, and breach/incident response systems.
- The mapping between player actions and state transitions.
- The core data structures and event types required to implement the state machine.
- UI and feedback requirements that are necessary for state clarity and user understanding.
- Telemetry and learning outcome tracking derived from state transitions.

**Out of scope (depth), but in-scope for alignment**

This document does not replace other design documents, but it must remain aligned with all BRD-required capabilities. The following areas are treated as _interfaces_ or _touchpoints_ in DD-01, with full detail specified elsewhere:

- Full narrative script details, handled by narrative design.
- Full threat engine design details, covered in DD-05.
- Full UI component specifications, covered in DD-07.
- Full backend architecture and API structure, covered in DD-09.
- Multiplayer, cooperative, or competitive modes: DD-01 defines how the core loop and state machine must remain extensible for multiplayer and shared decision ownership, but does not specify multiplayer mechanics in depth.
- Monetization, storefront logic, and platform packaging: DD-01 specifies where monetization or platform constraints must not break the core loop (for example, no monetized shortcuts that bypass per-request decisions), but commercial details are covered in product and monetization docs.

The primary objective of this document is to eliminate ambiguity in the core loop and state transitions so that engineering, content, UI, and analytics can implement a consistent, testable system.

---

## 3. Inputs and Dependencies

This document is grounded in the following sources and must be read alongside them for complete context.

- BRD-DMZ-2026-001, especially Sections 5 and 11 for the core gameplay loop and skill mapping.
- DD-05 Threat Engine & Breach Mechanics for attack generation, threat level transitions, and breach recovery logic.
- DD-07 UI/UX Terminal Aesthetic for interaction patterns, screen layout, accessibility, and timing constraints.
- DD-09 Backend Architecture & API for the game-engine module, event sourcing strategy, and API surface.

Key dependency assumptions derived from those documents:

- The game engine uses event sourcing and a reducer-based state update model.
- Threat generation and breach simulation are services invoked during day advancement.
- The UI uses a terminal aesthetic with diegetic justification for every system panel.
- The game uses deterministic seeds per session for reproducibility and enterprise review.
- The day cycle is player-controlled and not driven by per-email timers, with queue pressure as the primary pacing tool.
- Event timers are permitted only for incident and ransom deadlines and must remain pauseable and adjustable per accessibility settings.
- Threat tier color mapping is canonicalized to DD-05. UI representations in DD-07 must align to those tier names, labels, and shield states.

---

## 4. Design Principles

The core loop and state machine are built on the following principles.

1. Stealth learning is the primary objective. Players should internalize cybersecurity behaviors by making survival decisions, not by completing explicit lessons.
2. Clarity beats surprise. The player must always understand their current state, the available actions, and the consequences at stake.
3. Determinism and auditability are mandatory for enterprise use. Given the same seed and action history, the game must reproduce identical outcomes.
4. Narrative justification is required for difficulty shifts and unusual events. The state machine may not “rubber band” without a story explanation.
5. Player agency must be preserved. The system can create pressure through queues and consequences, but must avoid forced timeouts or hidden penalties.
6. The loop must be short enough for casual play and deep enough for mastery. A single day should be 5 to 15 minutes in typical play. The BRD's success metrics target a median session length of 15-25 minutes, meaning a typical session spans one to three game days.
7. Every meaningful player action must map to a security skill or operational concept.
8. The game should remain playable when CRT effects, animations, or audio are disabled.
9. The state machine must be extensible without breaking current saves or analytics pipelines.
10. The loop must support both consumer and enterprise contexts without branching into two different game engines.
11. The loop engages all eight Core Drives of the Octalysis Framework (BRD Section 11.1), with emphasis on Epic Meaning & Calling (existential stakes), Development & Accomplishment (facility tier progression), Ownership & Possession (data center as personal domain), Scarcity & Impatience (resource constraints), Unpredictability & Curiosity (evolving threats), and Loss & Avoidance (breach/ransom mechanics, rated "Very High" weight in the BRD). The design leans White Hat (Drives 1-3) for sustained engagement while deploying Black Hat (Drives 6-8) strategically for urgency and stakes.

---

## 5. Core Loop Overview

The core loop is the repeated sequence of player activity that forms the experiential and educational heart of the game. It is built around a single unit of time, the “game day,” which the player controls. Each day advances the narrative, triggers threats, generates emails, and yields resource changes.

At its simplest, the core loop can be expressed as:

```
Receive access requests (EMAIL ARRIVES)
Analyze and verify (ANALYZE + VERIFY)
Decide access outcome (DECIDE)
Apply consequences (CONSEQUENCES)
Manage resources (MANAGE RESOURCES)
Purchase upgrades (UPGRADE)
Defend against threats and respond to incidents (DEFEND)
Advance to next day (ADVANCE DAY)
```

This mirrors the BRD's canonical core loop (Section 5.3), which proceeds: EMAIL ARRIVES --> ANALYZE --> VERIFY --> DECIDE --> CONSEQUENCES --> MANAGE RESOURCES --> UPGRADE --> DEFEND --> ADVANCE DAY.

This loop captures both the moment-to-moment decision-making (email analysis and approval) and the longer-term strategic management (resource allocation and upgrades). The skill mapping from the BRD is preserved at each step. Email analysis maps to phishing detection and social engineering resistance. Verification maps to identity validation and zero-trust thinking. Decisions map to risk acceptance. Consequences map to incident response and business impact. Resource management maps to operational security planning. Upgrades map to security architecture and investment strategy.

The core loop integrates all 13 in-game document types defined in the BRD (Section 5.5): Email Access Request, Phishing Analysis Worksheet, Verification Packet, Threat Assessment Sheet, Incident Log, Data Salvage Contract, Storage Lease Agreement, Upgrade Proposal, Blacklist Notice, Whitelist Exception, Facility Status Report, Intelligence Brief, and Ransom Note. Each document serves a dual purpose as both a gameplay artifact and a cybersecurity training instrument.

The loop is designed to support “just one more email” play while still being bounded within a session. The player can stop at the end of any day, and the game never forces a day to end automatically. This aligns with the accessibility mandate and ensures the loop is not driven by external clocks.

The core loop is implemented in the state machine as a set of phases, each with explicit entry and exit conditions. The player cannot bypass required states, but they can choose when to move forward within a phase. This preserves agency while keeping the loop structured and predictable.

---

## 6. Session Lifecycle (Macro Loop)

The session lifecycle is the outermost state machine governing a playthrough. It defines the start, pause, recovery, and end conditions of a session. It also aligns with the event-sourced backend, where each session is represented by a game.session record and a stream of game.events.

### 6.1 Macro States

The canonical macro states are:

- SESSION_INIT
- SESSION_ACTIVE
- SESSION_PAUSED
- SESSION_BREACH_RECOVERY
- SESSION_COMPLETED
- SESSION_ABANDONED

Each macro state has a clear purpose.

SESSION_INIT is the entry state after creating or loading a session. It initializes deterministic seed values, loads the initial narrative context, and creates the Day 1 queue.

SESSION_ACTIVE is the default state in which the player can progress through day cycles. All primary gameplay occurs here.

SESSION_PAUSED is a non-terminal state entered when the player explicitly pauses or exits mid-day. The state machine guarantees no time-based penalties occur while paused.

SESSION_BREACH_RECOVERY is a temporary macro state entered when a breach event triggers a recovery mode that restricts player actions. It overlays a recovery sub-loop across day cycles.

SESSION_COMPLETED is a terminal state entered when narrative or win conditions are met. It produces completion analytics and may unlock endgame content.

SESSION_ABANDONED is a terminal state for voluntary exit or administrative termination in enterprise contexts.

### 6.2 Macro State Transitions

The macro transitions are intentionally minimal.

- SESSION_INIT transitions to SESSION_ACTIVE after initial state creation succeeds.
- SESSION_ACTIVE transitions to SESSION_PAUSED when the player triggers a pause or exits mid-day.
- SESSION_PAUSED transitions to SESSION_ACTIVE when the player resumes.
- SESSION_ACTIVE transitions to SESSION_BREACH_RECOVERY when a breach event with recoveryDays > 0 is applied.
- SESSION_BREACH_RECOVERY transitions to SESSION_ACTIVE after recoveryDays elapse (1-7 days, scaled by security tooling and staff).
- SESSION_BREACH_RECOVERY transitions to SESSION_COMPLETED (with failure reason) if the player cannot pay the ransom.
- SESSION_ACTIVE transitions to SESSION_COMPLETED when completion conditions are met.
- SESSION_ACTIVE transitions to SESSION_ABANDONED when the player abandons or an enterprise admin ends the session.

Macro transitions are never hidden. Each transition emits a game.session event for analytics and for enterprise audit requirements.

---

## 7. Day Cycle (Primary Loop)

Within SESSION_ACTIVE, the player repeatedly executes the day cycle. The day cycle state machine is the authoritative source of truth for which actions are allowed and which systems are invoked. It enforces a specific sequence, but allows flexibility within each phase.

### 7.1 Day Cycle Phases

The day cycle uses the following canonical phases.

- DAY_START
- INBOX_INTAKE
- EMAIL_TRIAGE
- VERIFICATION_REVIEW
- DECISION_RESOLUTION
- CONSEQUENCE_APPLICATION
- THREAT_PROCESSING
- INCIDENT_RESPONSE
- RESOURCE_MANAGEMENT
- UPGRADE_PHASE
- DAY_END

The phases are structured to mirror how a security operator works. First they start the day, then they look at the inbox, triage requests, verify claims, decide, and then handle consequences and threats. Only after operational duties are complete do they manage resources and upgrade infrastructure.

### 7.2 Phase Descriptions

DAY_START initializes day-specific variables, generates the daily intelligence brief, and resets per-day counters. It is also the entry point for narrative triggers.

INBOX_INTAKE pulls the daily queue of emails from the content system. It assigns urgency, faction, and risk hints, and applies any campaign-specific modifiers.

EMAIL_TRIAGE is the primary player-facing phase. The player reads each email, marks indicators, and decides whether deeper verification is needed.

VERIFICATION_REVIEW is entered when the player requests or receives verification packets. It allows cross-reference of claims with documents and intelligence.

DECISION_RESOLUTION captures the player’s final decision for each email and converts that decision into a game action event.

CONSEQUENCE_APPLICATION updates trust score, funds, reputation, faction relations, and risk posture based on decisions.

THREAT_PROCESSING invokes the Threat Engine and applies any attacks or incidents generated during the day.

INCIDENT_RESPONSE is a player-facing phase if any incidents are active. The player chooses response actions, pays ransoms, or mitigates damage.

RESOURCE_MANAGEMENT allows allocation of capacity, staff, and budget changes based on the day’s outcomes.

UPGRADE_PHASE offers purchasing or maintenance of security tools and facility upgrades.

DAY_END finalizes the day, writes a snapshot, and presents a summary. The player must explicitly advance to the next day.

### 7.3 Phase Sequencing and Flexibility

The phase ordering is fixed, but a player can complete tasks in any order inside a phase. For example, during EMAIL_TRIAGE the player can switch between emails without completing them in queue order. The state machine treats an email as pending until a decision action is emitted. It allows backtracking within a phase but forbids skipping to later phases without satisfying exit conditions.

The state machine's exit conditions are functional rather than time-based. EMAIL_TRIAGE ends only when every email has an explicit per-request outcome (approve, deny, flag for review, request additional verification, or defer) and no items remain in a pending state. Deferral is a per-email queue management action (not a decision on the merits) that marks the request for carryover with explicit penalties. The four BRD-canonical decision types (approve, deny, flag for review, request additional verification) plus deferral constitute the complete set of per-email outcomes. Bulk deferral is not allowed in core play; if an accessibility override permits batch deferral (for example, one-switch mode), the system must still emit one deferral event per email for audit and analytics.

### 7.4 Detailed Phase Specifications

#### 7.4.1 DAY_START

DAY_START is the anchoring phase that turns a continuous session into discrete, digestible days. It initializes per-day counters, such as the maximum number of emails to be pulled from the pool, daily operating costs, and any staff availability modifiers. It also applies narrative triggers, including faction communications and intelligence briefs. DAY_START is the only phase where the system may inject new long-form narrative content without interrupting player actions. This ensures the player is not forced to read story content mid-decision, which would erode the sense of professional responsibility.

DAY_START must be deterministic and idempotent. If the player pauses at DAY_START and later resumes, the same day initialization must be re-used rather than regenerated. This requirement is critical for cross-device play and enterprise audit. Any randomness is derived from the session seed and current day number, and the resulting generated values are stored in the day metadata so that replay produces identical outcomes. The player explicitly acknowledges the brief with the ACK_DAY_START action, which transitions to INBOX_INTAKE. DAY_START may surface accessibility or training sandbox toggles (such as relaxed pacing or practice sandbox) when permitted by session settings. These are assistive modes, not difficulty selectors, and they do not override narrative threat scaling.

#### 7.4.2 INBOX_INTAKE

INBOX_INTAKE is responsible for selecting and ordering the day’s email queue. This selection uses weighted random sampling from the content pool, with modifiers based on threat tier, faction relationships, and active campaigns. The selection algorithm must enforce a minimum ratio of legitimate emails to prevent a purely adversarial experience, even at high threat tiers. That ratio can tighten over time but should never collapse into a “everything is a trap” pattern, because that would teach a harmful behavior of blanket denial.

INBOX_INTAKE produces a deterministic queue with metadata, including urgency, category, faction, and required verification. Queue pressure is modeled at the queue level, not by per-email timers or expiration. INBOX_INTAKE is not a player-interactive phase. The UI should display a loading animation and a concise summary of the day’s intake, such as “12 requests received, 4 flagged by intelligence.” This short summary provides framing without leaking precise ground truth.

#### 7.4.3 EMAIL_TRIAGE

EMAIL_TRIAGE is the primary interactive phase and the longest in a typical day. The player can inspect, annotate, and decide on any email in the queue. The interface must support non-linear navigation to avoid forcing a rigid order, reflecting how real operators often skip to high-urgency items first. The system records a detailed action trail, including which parts of an email were inspected, which indicators were marked, and how long the player spent before choosing an action.

EMAIL_TRIAGE is also where most educational scaffolding occurs. If hinting is enabled, the game can surface a subtle overlay or highlight for one or two indicators, but only after the player has spent a minimum time on the email. Hints are deliberately delayed to encourage initial independent analysis. The system must also guard against “clicking through” behavior by tracking decision speed and evidence usage, flagging suspected guessing for analytics and adaptive pacing.

#### 7.4.4 VERIFICATION_REVIEW

VERIFICATION_REVIEW is a sub-phase that deepens the analysis of a specific email. It is entered from EMAIL_TRIAGE whenever the player requests verification or opens a packet. The packet should be structured to reward careful cross-referencing rather than quick scanning. Examples include mismatched signatures, incorrect date formats, or inconsistencies between claimed affiliations and known faction behaviors.

This phase reinforces zero-trust thinking. It should not make a single answer obvious every time. Instead, it should supply evidence that either strengthens confidence or exposes inconsistencies. The player can return to the email and use the new information to decide. VERIFICATION_REVIEW is intentionally isolated so that the player’s focus is on a single request, reducing cognitive load. Exiting the phase returns the player to EMAIL_TRIAGE without resolving the email, preserving agency.

#### 7.4.5 DECISION_RESOLUTION

DECISION_RESOLUTION converts player intent into authoritative game actions. It validates that the player is allowed to decide on the email at this point and that the email has not already been resolved. It also checks for conflicting actions, such as approving and denying the same email. If a conflict is detected, the system must reject the second action and surface an error message.

This phase evaluates the decision against the risk model and the available evidence, then simulates outcomes. Some emails are intentionally ambiguous, so the system avoids a single “correct” label. Instead, it classifies decisions by risk alignment (for example, risk-averse, risk-balanced, risk-permissive) and attaches educational notes, such as “The sender domain was registered two days ago,” to the response event. These notes are rendered in micro feedback without framing the decision as right or wrong.

#### 7.4.6 CONSEQUENCE_APPLICATION

CONSEQUENCE_APPLICATION applies the economic, reputational, and narrative effects of all decisions from the day. It should be executed as a single atomic transaction to avoid partial updates. The consequence model combines per-email outcomes into aggregate changes to funds, trust score, faction relations, and operational risk. If an email decision triggers a campaign branch or a story event, that trigger is queued here for delivery at DAY_END or DAY_START.

The consequence model is intentionally asymmetrical. Overly permissive approvals can be dramatically more costly than cautious denials because they can lead to a breach. However, excessive caution still carries penalties to discourage blanket denial and reflect lost revenue or damaged relationships. The balance is tuned via coefficients that are part of the game configuration and can be adjusted during playtests. This phase also applies the operational cost of the day, such as staff maintenance and tool upkeep, reinforcing the idea that security is a continuous investment.

#### 7.4.7 THREAT_PROCESSING

THREAT_PROCESSING is the phase where the Threat Engine is invoked. It uses the current state to generate attacks, campaign updates, and threat level adjustments. The output is a list of attack events, which are applied sequentially to preserve determinism. If multiple attacks occur, their order is stable and derived from the day seed to avoid subtle divergence between clients.

Threat processing also evaluates whether a breach occurs, based on the combination of player decisions and security tools. If a breach is triggered, the phase emits a game.breach.occurred event and prepares the breach recovery state. This phase is non-interactive, but the UI should show a narrative indicator such as “Network scans detected” or “Incident flagged by IDS” to keep the player informed of why the next phase is changing.

#### 7.4.8 INCIDENT_RESPONSE

INCIDENT_RESPONSE is entered only when incidents are active. It presents the player with an incident summary, evidence items, and a set of response actions. Each action has a cost, time impact, and effectiveness. The player can choose one or more actions, which are then applied to determine incident outcome and recovery duration.

This phase is where the game teaches incident response frameworks. The player must choose between containment, eradication, and recovery actions, each with tradeoffs. The system records which actions were chosen and how quickly, feeding into incident response quality metrics. If the player fails to respond adequately, the incident can escalate into a breach. If the player responds well, the incident may be contained with minimal damage and may even generate trust gains through successful defense.

#### 7.4.9 RESOURCE_MANAGEMENT

RESOURCE_MANAGEMENT exposes the facility dashboard and allows the player to adjust allocations. This phase is not mandatory for every day, but it should be available. It includes decisions such as throttling lower-value clients to maintain headroom or shifting power and cooling to critical systems. It also includes blacklist and whitelist management, allowing the player to maintain lists of trusted and blocked entities. Blacklist/whitelist management maps to the access control lists and allow/deny policy skill domain defined in the BRD (Section 5.4). These choices affect the facility scale input used by the Threat Engine and the economic output of the next day.

The system should visualize resource pressure clearly. Over-commitment should be obvious, and the player should understand that accepting too many clients creates strain. However, resource management is not meant to be a punishing spreadsheet. It should be expressible in a few clear decisions per day, with the option for advanced players to dive deeper.

#### 7.4.10 UPGRADE_PHASE

UPGRADE_PHASE presents the available security tools, facility expansions, and maintenance options. The phase is designed to reinforce long-term planning. Security tools degrade over time and require updates. If the player neglects maintenance, tool effectiveness decays, increasing breach probability. This models the reality that security is not a one-time purchase.

Upgrades are intentionally expensive relative to daily revenue to create meaningful tradeoffs. The player must decide between growing capacity, improving defenses, or maintaining existing tools. The game should surface the expected impact of each upgrade in clear terms, such as "+15% detection against credential harvesting." The tool catalog is curated to avoid overwhelming players; new tool types unlock gradually with narrative progression. The BRD defines five facility tiers -- Outpost, Station, Vault, Fortress, Citadel (FR-GAME-014) -- each representing a qualitative leap in capacity and capability. Tier progression is gated by infrastructure upgrades and drives narrative escalation.

The BRD (FR-GAME-011) specifies the following security tool categories available for purchase: firewall, IDS, IPS, SIEM, EDR, WAF, threat intel feed, SOAR, honeypots, zero-trust gateway, and AI anomaly detection. All security tools have recurring operational costs modeling real-world security OpEx (FR-GAME-012). Every upgrade introduces new threat vectors, mirroring real-world vulnerability surfaces (FR-GAME-013); this mechanic is enforced by the Threat Engine, which recalculates attack probabilities after each purchase event.

#### 7.4.11 DAY_END

DAY_END is the closure phase that provides feedback and prepares the player to advance. It displays a summary of decisions, trust score changes, funds, faction shifts, and any narrative consequences. The summary must be scannable and must highlight the most significant outcomes to avoid information overload.

DAY_END is also the safest point for the player to stop playing. It writes a state snapshot and ensures that all pending events are resolved. The player can review key decisions before advancing, which supports reflection and learning. Advancing to the next day is a conscious choice, reinforcing the sense of control.

---

## 8. Inbox and Email Triage Loop

Email triage is the core interaction loop that embodies the game’s security training goals. It must be cognitively engaging while maintaining the pacing expectations of a simulation game.

### 8.1 Email Categories and Generation

Emails arrive in a daily batch plus intermittent arrivals governed by the queue pressure system. Each email is tagged with metadata that informs scoring and narrative.

Key email categories:

- Legitimate access request.
- Legitimate but risky access request.
- Phishing attempt with obvious red flags.
- Spear phishing attempt with personalized details.
- Business email compromise (BEC) attempt.
- Credential harvesting attempt.
- Malware delivery attempt (including supply chain bait with embedded malware).
- Pretexting attempt (social engineering through fabricated scenarios).
- Insider threat signal from a previously approved client.
- Campaign-specific lure associated with a faction storyline.

The BRD (FR-GAME-003) specifies five AI-generated phishing categories: spear phishing, BEC, credential harvesting, malware delivery, and pretexting. All five must be represented in the email pool. Phishing emails are generated with difficulty levels 1-5 (FR-GAME-003), and a pre-generated pool of 200+ emails must be maintained across difficulty tiers (FR-GAME-004), with batch generation during off-peak hours. For offline/PWA play, a budget of 50 handcrafted email scenarios provides graceful degradation when AI content is unavailable (BRD Section 8.2).

The content system provides email bodies and attachments, while the Threat Engine and narrative system set probabilities and modifiers for malicious vs legitimate ratios. Email categories are never explicitly labeled to the player. Instead, the player infers intent based on indicators and verification.

### 8.2 Triage Actions

Each email contains the analyzable elements specified in the BRD (FR-GAME-002): sender domain, display name, email headers (SPF/DKIM), body content, urgency cues, attachment types, and embedded URLs. These elements provide the raw material for player analysis and skill assessment.

In EMAIL_TRIAGE, the player can take the following actions on any email.

- Read the email body and metadata.
- Inspect sender details and header anomalies (SPF/DKIM records).
- Review attachments and link previews.
- Examine embedded URLs and urgency cues.
- Mark indicators on suspicious content.
- Flag the email for deeper verification.
- Request additional verification from the sender.
- Make a provisional approve or deny choice, which becomes final in DECISION_RESOLUTION.
- Defer the request to the next day (per-email holdover).

Each action is captured as an event for skill assessment. For example, inspecting headers increases the headerCheckRate metric, while requesting verification increases verificationDepth. These metrics feed the player competence profile used by narrative-driven scaling.

### 8.3 Queue Pressure and Aging

Email triage does not use per-email timers. Instead, queue pressure is applied through three mechanisms.

- New arrivals that expand the queue if the player lingers too long in triage.
- A backlog pressure score based on the total number of unresolved requests at day end.
- A carryover surcharge applied to the next day’s operational strain if deferred volume remains high.

Queue pressure is adjustable via accessibility settings only. In practice, this creates a gentle sense of urgency without forcing rushed decisions. It preserves the core training message: careful analysis beats speed.

### 8.4 Triage Exit Conditions

The state machine exits EMAIL_TRIAGE when one of the following occurs.

- All emails in the current day queue have explicit per-email outcomes (approve, deny, flag for review, request additional verification, or defer).
- A system-level interrupt occurs, such as a critical breach event that requires immediate incident response.

---

## 9. Verification and Risk Assessment Loop

Verification is the bridge between raw email content and final access decisions. It models real-world identity and trust validation processes and provides an additional layer of gameplay depth.

### 9.1 Verification Packets

When verification is requested, the system presents a packet of documents and corroborating evidence. The packet might include identity records, organizational references, digital signatures, payment histories, and prior interactions with the data center.

Verification packets serve multiple functions.

- They provide tangible evidence for or against legitimacy.
- They introduce new red flags that the email alone cannot reveal.
- They support narrative hooks and faction lore.
- They teach the player to seek corroboration rather than rely on surface impressions.

### 9.2 Phishing Analysis Worksheet and Threat Assessment Sheet

Two BRD-defined documents (Section 5.5) are integral to the verification and risk assessment loop:

**Phishing Analysis Worksheet** (BRD document #2): A structured form where the player records signals of legitimacy and red flags. This teaches structured threat assessment methodology and provides the player with a systematic framework for analyzing suspicious communications.

**Threat Assessment Sheet** (BRD document #4): A structured summary of the request that includes risk score indicators, faction affiliation signals, and known threat intelligence. The player can compare their own assessment with system-provided hints. This is important for educational scaffolding because it models how real-world analysts consult threat intelligence.

Neither document provides a definitive answer. Both can be partially wrong or ambiguous. Their purpose is to guide the player through structured analysis, not to automate decisions.

### 9.3 Verification Actions

In VERIFICATION_REVIEW, the player can take the following actions.

- Cross-reference claims with known client records.
- Inspect digital signatures and metadata.
- Review supporting documents in the packet.
- Consult intelligence briefs for active campaigns.
- Mark indicators within verification documents.
- Decide to accept the verification as sufficient or request more.

### 9.4 Verification Exit Conditions

VERIFICATION_REVIEW exits when the player closes the verification view for an email. The email returns to the triage queue with updated context. The player can move back and forth between triage and verification without restriction until a final decision is made.

---

## 10. Decision Loop and Player Actions

The decision loop is the core choice point where training outcomes are measured. It is intentionally explicit and requires the player to take responsibility for risk acceptance.

### 10.1 Decision Types

Each email must resolve into one of the following four decision types, as defined in the BRD (FR-GAME-005).

- Approve access.
- Deny access.
- Flag for review.
- Request additional verification.

Approve and deny are final decisions that resolve the email. Flag and request verification are intermediate decisions that keep the email active in the queue for the current day. In addition to these four decision types, a queue management action -- defer to next day -- is available as a per-email holdover that moves the request into the next day's queue with explicit penalties. Defer is not a decision on the merits of the request; it is an operational postponement. No decision is universally "correct." Each option carries trade-offs between security exposure, revenue, reputation, and operational risk. The system simulates outcomes and reinforces risk acceptance rather than right-or-wrong answers.

Batch actions are prohibited. Every request must receive an explicit per-email resolution (approve, deny, flag, request verification, or defer), even when accessibility overrides are enabled.

### 10.2 Decision Actions and Data Capture

When the player confirms a decision, the system records:

- Decision type.
- Indicators selected.
- Notes or rationale provided by the player.
- Time spent on the decision.
- Whether verification was consulted.
- Whether intelligence briefs were opened.

These data points are essential for both narrative-driven scaling and enterprise analytics. They allow the system to differentiate between evidence-based decisions and low-evidence decisions, and to model risk alignment without framing outcomes as purely right or wrong.

### 10.3 Decision Exit Conditions

DECISION_RESOLUTION exits when all emails have explicit final per-email outcomes (approve, deny, or defer) and no items remain in a pending, flagged, or request-verification state. Flag for review and request additional verification are intermediate outcomes that must be resolved to a final outcome (approve, deny, or defer) before the day's DECISION_RESOLUTION phase can exit. Each decision emits a game.action event that feeds into CONSEQUENCE_APPLICATION.

---

## 11. Consequence Resolution Loop

Consequences translate player decisions into tangible outcomes. This is the pedagogical reinforcement point, making the cost of mistakes visible and emotionally resonant.

### 11.1 Consequence Dimensions

Each decision affects multiple dimensions, mapped to the BRD's three-currency economy (Credits, Trust Score, Intel Fragments) and supporting state variables.

- Credits (CR): Funds and revenue.
- Trust Score (TS): Reputation gate (0-500+), unlocking client tiers, contracts, and narrative content. Cannot be purchased.
- Intel Fragments (IF): Investigation reward earned through attack analysis and incident investigation. Spent on detection signatures, threat profiles, and IDS upgrades. IF is earned during VERIFICATION_REVIEW, INCIDENT_RESPONSE, and when the player successfully identifies sophisticated attacks.
- Faction relationships.
- Threat level and attack probability.
- Operational capacity utilization.
- Narrative branching triggers.

The consequence system uses weighted formulas that align with the BRD’s skill mapping. Overly permissive approvals can trigger incidents or breaches, while overly cautious denials reduce revenue and damage relationships with legitimate factions. This asymmetry is intentional because the impact of a breach is larger than the impact of missed revenue, but both outcomes are meaningful trade-offs.

### 11.2 Feedback Timing

Consequences are presented in three layers, aligned with the BRD's consequence model (FR-GAME-006):

- **Immediate feedback** on each decision: revenue gain/loss, trade-off notes, and compact impact summaries.
- **Short-term consequences** visible within the same day: threat level shifts, faction relationship changes, and operational risk adjustments surfaced during CONSEQUENCE_APPLICATION and THREAT_PROCESSING.
- **Delayed consequences (Echoes):** narrative and mechanical effects that manifest 1-3 chapters later, as defined in the BRD's narrative architecture (Section 11.3). Echoes are queued during CONSEQUENCE_APPLICATION and delivered at future DAY_START phases through the narrative trigger system. These delayed consequences are a core part of the pedagogical model, reinforcing that security decisions have long-term ramifications.

Additionally, an **aggregated day summary** at DAY_END shows net changes in funds, trust, and risk, providing a reflective checkpoint.

Immediate feedback is necessary for learning, but the system must avoid overwhelming the player. Thus the primary narrative and emotional beats are delivered in the day summary and through delayed echoes, while immediate feedback is compact and focused.

### 11.3 Consequence Exit Conditions

CONSEQUENCE_APPLICATION exits after all decision outcomes are applied and any immediate narrative triggers are queued. If a critical consequence such as a breach is triggered, the state machine may branch to THREAT_PROCESSING immediately.

---

## 12. Threat, Breach, and Incident Integration

Threat processing integrates the adaptive adversary system into the core loop. It is the primary driver of tension and narrative escalation.

### 12.1 Threat Processing Phase

THREAT_PROCESSING invokes the Threat Engine with the current game state, player competence metrics, and narrative progress. The engine returns a list of attack events and campaign updates for the day. These events are then applied to the game state, potentially generating incidents or breaches. Per the BRD (FR-GAME-020), the threat engine is adaptive: it shifts attack vectors based on player behavior. A player who is strong at detecting phishing will face supply-chain attacks; a player with strong perimeter defenses will face insider manipulation. This vector-shifting is a core requirement and must be reflected in the competence signals passed from the core loop to the threat engine during this phase.

Threat processing is a discrete phase rather than a background system to ensure determinism and to make the flow auditable. All generated attacks are recorded as events.

### 12.2 Incident Response Phase

If any attack results in an incident, the state machine enters INCIDENT_RESPONSE. The player is presented with an incident log, evidence, and response actions. This phase implements the incident response skill mapping in the BRD.

The incident response system provides structured choices rather than freeform. Each response action has time cost, resource cost, and effectiveness values. The player’s choices affect breach severity and recovery time.

### 12.3 Breach Recovery

A breach is the most severe outcome. Per the BRD (FR-GAME-015, FR-GAME-016, FR-GAME-017), a successful breach triggers a full-screen ransom note that locks all operations. The ransom cost equals total lifetime earnings divided by 10, rounded up, with a minimum of 1 CR. If the player can pay, operations resume with a Trust Score penalty and 10-40% client attrition, and the macro state transitions to SESSION_BREACH_RECOVERY. If the player cannot pay, the session ends (game over). During recovery, the player has limited actions. The day cycle still progresses, but with reduced capacity and forced consequences. Breach recovery time scales with security tooling and staff, ranging from 1 to 7 days (FR-GAME-018). A 30-day post-breach revenue depression applies after recovery, as specified in the BRD's breach economy model.

This integration ensures the threat system is not a separate minigame, but a direct continuation of the core loop. The player's email decisions and security investments feed directly into whether attacks succeed.

---

## 13. Resource Management and Upgrade Loop

Resource management and upgrades provide the long-term strategic layer of the game. This is where players express their risk appetite and build durable defenses.

### 13.1 Resource Model

The facility has four core resource systems as defined in the BRD (FR-GAME-008).

- Rack Space (measured in U).
- Bandwidth (Mbps).
- Power (kW).
- Cooling (tons).

Each resource has a current utilization value and a maximum capacity. Each accepted client consumes measurable resources across all four dimensions for the duration of their lease (FR-GAME-009). Accepting legitimate clients increases utilization and revenue, while overcommitment increases risk and operational strain. Resource exhaustion triggers cascading failures including throttling, shutdown, and client loss (FR-GAME-010).

Two additional operational dimensions influence the day cycle but are not part of the core resource constraint model: staff capacity (affecting operational throughput and incident response) and security budget (governing tool maintenance and upgrades). These are tracked as game state variables rather than as constraint-satisfaction resources.

### 13.2 Resource Management Phase

RESOURCE_MANAGEMENT allows players to view current utilization across the four core resource systems (Rack Space, Bandwidth, Power, Cooling), adjust allocations, and make tradeoff decisions. Examples include throttling bandwidth for certain clients or reallocating power to high-value systems. This phase also surfaces Data Salvage Contracts and Storage Lease Agreements (BRD Section 5.5), which teach data handling agreements and SLA management respectively. These choices affect the risk profile of the data center. Super-linear maintenance cost scaling prevents infinite expansion, as specified in the BRD.

### 13.3 Upgrade Phase

UPGRADE_PHASE offers the purchase or maintenance of security tools and facility expansions. It is the primary means of increasing defense coverage and reducing breach probability. Tools degrade over time, requiring maintenance or updates. This forces players to balance short-term cash needs with long-term resilience.

Upgrades are tied directly to detection probabilities defined in the Threat Engine document. This ensures a consistent, measurable impact on incident outcomes.

### 13.4 Upgrade Exit Conditions

UPGRADE_PHASE exits when the player closes the upgrade menu. All purchases are recorded as events and applied immediately to detection matrices.

---

## 14. Narrative Progression and Faction Influence

The core loop is embedded in a narrative framework where factions vie for access. Narrative progression provides context and meaning to the repetitive cycle, transforming routine decisions into moral and strategic dilemmas.

The BRD (Section 11.3) defines a **river delta model** for narrative architecture, where branches diverge and reconverge around Nexus Points. The narrative has four structural layers that the core loop must support:

- **Spine:** Fixed major events that all players experience regardless of choices.
- **Branches:** Visible decision points that create meaningful divergence.
- **Tendrils:** Minor variations that create responsiveness to player behavior.
- **Echoes:** Delayed consequences that manifest 1-3 chapters after the triggering decision. Echoes are queued during CONSEQUENCE_APPLICATION and delivered at future DAY_START phases.

Emergent storytelling arises from three interacting systems (BRD Section 11.3): the **Queue System** (randomized email generation), the **Reputation System** (five faction axes with threshold-triggered events), and the **Threat Escalation System** (adaptive attack vectors based on player behavior). The core loop's phases must feed data into all three systems and consume their outputs at the appropriate phases.

### 14.1 Narrative Gating

Narrative beats occur at specific days, at certain facility tiers, or after specific decision patterns. The state machine incorporates narrative triggers during DAY_START and CONSEQUENCE_APPLICATION. This ensures story events are tied to player actions rather than arbitrary timers.

The BRD (FR-CON-005, FR-CON-006, FR-CON-007) specifies seasonal episodic structure: 4 seasons per year, each containing 11 chapters over 12 weeks across three acts (Setup, Escalation, Crisis) plus a Finale. Each season introduces a central threat, new factions, and new NPCs. Season 1: Signal Loss (phishing/access control). Season 2: Supply Lines (supply chain). Season 3: Dark Channels (ransomware). Season 4: The Inside Job (insider threats). Each chapter contains a narrative briefing, 3-5 core access decisions, 1 incident event, 1 intelligence update, 1 character moment, and optional side quests (FR-CON-007).

### 14.2 Faction Influence

Five factions compete for access, as defined in the BRD (Section 5.2): **The Sovereign Compact** (governments), **Nexion Industries** (corporations), **The Librarians** (academics/preservationists), **hacktivist collectives**, and **criminal networks**. Each has legitimate needs, understandable motivations, and the capacity for both cooperation and betrayal.

Each email and client is associated with a faction. Decisions affect faction relationships, which in turn influence the type of requests and threats the player encounters. A faction relationship is a state variable that can rise or fall. High trust with a faction increases legitimate requests but can also increase exposure to that faction's enemies.

### 14.3 Narrative and Threat Alignment

Narrative events and threat escalation are synchronized. When the story indicates heightened conflict, the Threat Engine is allowed to move to a higher tier. Conversely, successful defense of a faction campaign can produce a narrative cooldown. This ensures that the threat system feels like a story actor rather than a mechanical slider.

---

## 15. Difficulty, Adaptation, and Skill Modeling

Difficulty is narrative-driven. The core game has no difficulty selector and no fixed profiles (FR-GAME-021). Threat escalation and challenge pacing are governed by narrative progress, facility scale, and player competence signals, and must always be explainable through story events. Per the BRD (Section 11.6), the difficulty formula is: `Difficulty = f(Player Skill, Story Progress, Player Choices)`. Player skill is inferred from detection rate, response time, resource efficiency, and pattern recognition. Story progress sets the baseline difficulty floor. Player choices modify the curve: a well-defended facility faces smarter attackers, while a poorly-defended facility faces more frequent but simpler attacks.

### 15.1 Narrative-Driven Scaling and Assistive Modes

Narrative-driven scaling is the default and only difficulty model in core play. Assistive modes exist for accessibility or training sandbox purposes, but they are not presented as difficulty choices. Examples include relaxed queue pacing for accessibility and a practice sandbox with no breach consequences. These modes must be explicitly labeled as assistive or non-evaluative, require admin permission in enterprise deployments, and are excluded from formal scoring and competitive metrics. They also do not override narrative escalation rules; instead, they adjust pacing and penalties within the same narrative arc.

### 15.2 Competence Metrics

The player’s competence score is derived from metrics such as indicator identification rate, verification depth, response time, and tool maintenance. These metrics are updated after each decision and inform the Threat Engine’s narrative-driven scaling.

Competence is never displayed as a single number to the player. Instead, it is translated into narrative feedback and tooltips. This avoids turning the game into a transparent optimization puzzle, preserving immersion.

### 15.3 Anti-Plateau and Mastery

To prevent the loop from stagnating, the system introduces new email formats, factions, and narrative scenarios as competence increases. Mastery is rewarded with more ambiguous cases and greater agency, not just higher attack volume.

### 15.3.1 Player Level Progression

The BRD defines a 30-level progression system (Intern to CISO) with XP earned through security-correct actions. Prestige levels 31-50 provide cosmetic rewards for continued engagement. Player level is a separate axis from facility tier and competence metrics. Level progression is driven by day completion, decision quality, and incident response outcomes. The core loop emits XP-relevant events at CONSEQUENCE_APPLICATION and DAY_END, and the progression system consumes those events to update the player's level. Level-gated content (such as new email categories or tool unlocks) must align with facility tier requirements and narrative progression to avoid contradictions.

### 15.4 Skill Scoring and Feedback Model

The adaptive system relies on a structured skill model rather than a single accuracy number. This model tracks multiple competencies aligned with the BRD’s mapping, and it feeds narrative-driven scaling and player-facing feedback. The goal is to create a learning system that is sensitive to how the player made a decision and the consequences that followed, not just a binary right-or-wrong label.

Each competency is tracked as a score between 0 and 1. Scores are updated after every relevant action using a weighted moving average. The moving average ensures that recent behavior has more influence without erasing long-term trends. The BRD (FR-AN-004, Section 11.6) defines seven competency domains: phishing detection, password security, data handling, social engineering resistance, incident response, physical security, and compliance awareness. Within the core loop, these map to observable gameplay competencies including header analysis, verification depth, risk calibration, incident response quality, and operational planning. These metrics are derived from observable actions rather than self-reporting. For example, “header analysis” increases when the player opens full header views before deciding, while “verification depth” increases when the player requests verification and spends adequate time reviewing evidence.

The system also tracks confidence, which is inferred from decision speed and whether indicators were marked. A fast decision made without evidence is treated as low-confidence and is weighted less in skill updates, regardless of outcome, because it may reflect guessing. A decision supported by multiple indicators and a coherent rationale produces a stronger update, especially if the subsequent outcome aligns with the chosen risk posture. High-confidence decisions that lead to adverse outcomes produce stronger corrective signals, reinforcing the learning loop without framing the decision as a simple mistake.

Skill scores decay slowly over time if the player stops practicing a competency. For example, if a player avoids verification for many days, their verification depth score gradually decreases, which nudges the system to surface more verification-relevant scenarios. This decay is not punitive. It mirrors the reality that skills atrophy without use and encourages balanced play. The decay and resurfacing behavior aligns with the BRD's spaced repetition system (Section 11.2), which specifies a modified Leitner system with SM-2 algorithm and intervals from 1 day (new concept) to 180 days (mastered). The core loop's scenario selection must integrate with this spaced repetition schedule so that concepts the player has not practiced recently are reintroduced at appropriate intervals.

The model also supports “calibration” metrics that measure how well the player’s risk assessments align with observed outcomes and policy posture. When a player marks many indicators on a legitimate email and then denies it, the system interprets this as over-caution and adjusts the risk calibration score. When a player approves a suspicious email but marks multiple indicators, the system interprets this as inconsistent reasoning and provides targeted coaching in subsequent days.

Feedback based on the skill model is delivered through two channels. The first is immediate micro feedback in the form of educational notes after each decision. These notes explicitly connect the player’s action to a real-world security concept, such as “Domain age is a common indicator of malicious infrastructure.” The second is day-end feedback that highlights one or two competencies to improve. This avoids overwhelming the player with too many metrics at once.

The system must avoid exposing raw scores, because that would encourage optimization behavior at the expense of authentic decision-making. Instead, the UI uses qualitative labels, such as “Strong at detection, needs deeper verification,” and ties them to narrative framing, such as Morpheus praising caution or warning against over-reliance on a single signal.

For enterprise reporting, the skill scores are aggregated across users and mapped to compliance frameworks. This requires stable definitions of competencies and consistent scoring across sessions. Therefore, the model’s weights and decay rates must be versioned, and changes should be recorded in a configuration registry. When analytics are generated, the report includes the model version used, ensuring that enterprise customers can interpret metrics correctly.

This skill model is also used to adapt scenario mix. For example, a player with high phishing detection but low incident response quality will see more scenarios that lead to minor incidents, allowing practice of response actions. This adaptation is controlled by the Threat Engine, but the core loop provides the signals and the structure for it to operate. The state machine therefore must guarantee the timely emission of these signals at the end of each decision and at the close of each day.

---

## 16. State Machine Specification

The state machine is divided into macro and micro layers. Macro states govern session lifecycle. Micro states govern day phases. This section defines the state machine in precise terms.

### 16.1 Macro State Machine

**States**

- SESSION_INIT
- SESSION_ACTIVE
- SESSION_PAUSED
- SESSION_BREACH_RECOVERY
- SESSION_COMPLETED
- SESSION_ABANDONED

**Allowed Transitions**

- SESSION_INIT -> SESSION_ACTIVE
- SESSION_ACTIVE -> SESSION_PAUSED
- SESSION_PAUSED -> SESSION_ACTIVE
- SESSION_ACTIVE -> SESSION_BREACH_RECOVERY
- SESSION_BREACH_RECOVERY -> SESSION_ACTIVE
- SESSION_BREACH_RECOVERY -> SESSION_COMPLETED (game over: unable to pay ransom)
- SESSION_ACTIVE -> SESSION_COMPLETED
- SESSION_ACTIVE -> SESSION_ABANDONED

**Illegal Transitions**

Any transition not listed above is illegal and must be rejected by the state validator. Illegal transition attempts produce a GAME_INVALID_ACTION error and are logged for audit.

### 16.2 Day Cycle State Machine

**States**

- DAY_START
- INBOX_INTAKE
- EMAIL_TRIAGE
- VERIFICATION_REVIEW
- DECISION_RESOLUTION
- CONSEQUENCE_APPLICATION
- THREAT_PROCESSING
- INCIDENT_RESPONSE
- RESOURCE_MANAGEMENT
- UPGRADE_PHASE
- DAY_END

**General Rules**

- The day cycle starts at DAY_START and ends at DAY_END.
- The player can only advance to the next state when the exit conditions of the current state are satisfied.
- VERIFICATION_REVIEW is a substate reachable from EMAIL_TRIAGE and returns to EMAIL_TRIAGE after completion.
- INCIDENT_RESPONSE is only entered if there are active incidents. Otherwise the state machine skips directly to RESOURCE_MANAGEMENT.
- The player can pause at any state, which moves the macro state to SESSION_PAUSED without changing the micro state. Resuming returns to the same micro state.

### 16.3 State Entry and Exit Actions

Each state has entry actions and exit actions that are executed by the game-engine service.

- DAY_START entry actions: reset daily counters, generate intelligence brief, apply narrative triggers.
- INBOX_INTAKE entry actions: generate email queue, apply campaign modifiers.
- EMAIL_TRIAGE entry actions: load inbox UI, set focus to most urgent email.
- VERIFICATION_REVIEW entry actions: load verification packet and related documents.
- DECISION_RESOLUTION entry actions: validate decisions, calculate impact and risk alignment.
- CONSEQUENCE_APPLICATION entry actions: apply financial and reputation changes.
- THREAT_PROCESSING entry actions: invoke Threat Engine and apply attack events.
- INCIDENT_RESPONSE entry actions: open incident panel, load evidence.
- RESOURCE_MANAGEMENT entry actions: load facility dashboard, calculate utilization.
- UPGRADE_PHASE entry actions: load upgrade catalog and maintenance alerts.
- DAY_END entry actions: generate summary, snapshot state, await player confirmation.

Exit actions primarily emit events for analytics and update state snapshots.

### 16.4 Transition Guards and Invariants

The state machine is protected by guard conditions and invariants that prevent invalid or exploitative transitions. These are enforced by the game-engine validator before any action is applied.

**Core invariants**
All game days are strictly ordered and non-decreasing. The currentDay value may never skip forward or backward except through explicit ADVANCE_DAY actions.

Each email may be resolved at most once. If a decision is submitted for an already resolved email, the action must be rejected.

Funds, trust score, and resource capacities are bounded by defined minimum and maximum values. If a consequence would push a value outside its bounds, it is clamped and a warning event is emitted for analytics.

Threat tier transitions may only occur in THREAT_PROCESSING or DAY_START. This prevents mid-phase changes that would confuse the player.

Incidents are immutable once closed. If an action attempts to modify a closed incident, it must be rejected.

**Transition guards**
ADVANCE_DAY is only legal in DAY_END. Attempts to advance the day from any other phase are invalid.

ACK_DAY_START is only legal in DAY_START. It acknowledges the daily brief and allows inbox generation.

PROCESS_THREATS is only legal in THREAT_PROCESSING. This ensures that attacks are never generated twice for the same day.

SUBMIT_DECISION is only legal in EMAIL_TRIAGE or DECISION_RESOLUTION. It is illegal in VERIFICATION_REVIEW to prevent premature commitment while the verification view is open.

PURCHASE_UPGRADE is only legal in UPGRADE_PHASE, unless a narrative event temporarily unlocks an urgent upgrade path. Such exceptions must be explicit and logged.

RESOLVE_INCIDENT is only legal in INCIDENT_RESPONSE and only for incidents marked as open. Attempting to resolve a non-existent incident must return a RESOURCE_NOT_FOUND error.

**Concurrency and multi-device rules**
The state machine is designed to support multiple open clients for the same session, which is a common scenario for enterprise training review or a player who switches devices. To prevent conflicts, actions carry a sequence number that represents the client’s last known event. The server rejects actions that do not match the current sequence, forcing the client to reload. This is an optimistic concurrency strategy that preserves determinism without requiring server-side locks.

If simultaneous actions arrive with the same sequence number, the server applies them in arrival order and rejects any that become invalid after the first is processed. This must be reflected in error messages so the client can display a “state updated elsewhere” notice.

**Atomicity and rollback**
Actions that produce multiple downstream effects, such as a decision that triggers a breach, must be applied atomically. If any part of the action fails, the entire action is rejected and no events are emitted. This prevents partial state updates that would break replay determinism.

**Validation of external data**
Because the content system and Threat Engine are external modules, all inputs from those systems must be validated. The validator ensures that email IDs, attack IDs, and incident references exist and match the current session. If a mismatch is detected, the system should fall back to a safe default, such as regenerating the email queue or deferring the attack, and emit a diagnostic event for monitoring.

**Anti-cheat constraints**
The validator enforces timeSpentMs bounds to prevent unrealistic values that could distort analytics. It also enforces a maximum number of indicator marks per email to prevent the player from clicking every possible indicator and receiving full credit. These constraints are not punitive; they ensure the integrity of skill assessment data.

---

## 17. Data Model and Event Sourcing

The state machine is implemented on top of an event-sourced data model. Each player action produces an event, and the game state is the reduction of all events in order.

### 17.1 Core State Structure

The game state is composed of the following top-level fields, aligned with the BRD's three-currency economy and progression systems.

- sessionId
- userId
- tenantId
- seed
- currentDay
- currentPhase
- funds (Credits / CR)
- trustScore (Trust Score / TS, range 0-500+)
- intelFragments (Intel Fragments / IF)
- playerLevel (1-30 core, 31-50 prestige)
- playerXP
- threatTier
- facilityState (includes facilityTier: Outpost | Station | Vault | Fortress | Citadel)
- inboxState
- verificationState
- incidents
- breachState
- narrativeState
- factionRelations
- blacklist
- whitelist
- analyticsState

The state structure must be stable across versions. When new fields are added, defaults must be defined so that old saves remain valid.

### 17.2 Action Types

The following action types are required for core loop operation.

- START_SESSION
- ACK_DAY_START
- ADVANCE_DAY
- OPEN_EMAIL
- MARK_INDICATOR
- REQUEST_VERIFICATION
- OPEN_VERIFICATION
- SUBMIT_DECISION
- APPLY_CONSEQUENCES
- PROCESS_THREATS
- RESOLVE_INCIDENT
- PURCHASE_UPGRADE
- ADJUST_RESOURCE
- PAUSE_SESSION
- RESUME_SESSION
- ABANDON_SESSION

Each action is validated against the current phase. For example, SUBMIT_DECISION is only valid in EMAIL_TRIAGE or DECISION_RESOLUTION. PROCESS_THREATS is only valid in THREAT_PROCESSING. ADVANCE_DAY is the only player action that moves from DAY_END to DAY_START. The end-of-day summary itself is emitted as a system event, not a player action.

### 17.3 Action Payload Baselines

The following payload shapes establish baseline expectations for implementation. These are not exhaustive schemas, but they define the minimum fields required for determinism and analytics. Fields marked optional are used for deeper analytics and coaching but are not mandatory for core logic.

| Action               | Required Payload Fields              | Optional Fields       | Notes                                                                  |
| -------------------- | ------------------------------------ | --------------------- | ---------------------------------------------------------------------- |
| ACK_DAY_START        | none                                 | none                  | Confirms the daily brief and allows inbox generation.                  |
| ADVANCE_DAY          | none                                 | none                  | Only legal in DAY_END.                                                 |
| OPEN_EMAIL           | `emailId`                            | `viewMode`            | Records that the email was opened.                                     |
| MARK_INDICATOR       | `emailId`, `indicatorType`           | `location`, `note`    | `indicatorType` must be one of the indicator registry values.          |
| REQUEST_VERIFICATION | `emailId`                            | none                  | Initiates verification packet creation or retrieval.                   |
| OPEN_VERIFICATION    | `emailId`                            | `packetId`            | Opens the verification view for a specific email.                      |
| SUBMIT_DECISION      | `emailId`, `decision`, `timeSpentMs` | `indicators`, `notes` | `decision` is one of approve, deny, flag, request_verification, defer. |
| APPLY_CONSEQUENCES   | `dayNumber`                          | `summaryId`           | System action emitted at the end of decision resolution.               |
| PROCESS_THREATS      | `dayNumber`                          | `threatSeed`          | System action that invokes the Threat Engine.                          |
| RESOLVE_INCIDENT     | `incidentId`, `responseActions`      | `notes`               | `responseActions` is an array of action IDs.                           |
| PURCHASE_UPGRADE     | `upgradeId`                          | `purchaseContext`     | Context may include maintenance vs new purchase.                       |
| ADJUST_RESOURCE      | `resourceId`, `delta`                | `reason`              | `delta` can be negative or positive within bounds.                     |
| PAUSE_SESSION        | none                                 | none                  | Pauses without changing micro state.                                   |
| RESUME_SESSION       | none                                 | none                  | Resumes at the same micro state.                                       |
| ABANDON_SESSION      | none                                 | `reason`              | Used for user-initiated or admin-initiated termination.                |

### 17.4 Event Types

Events are the immutable record of actions and system outcomes. The following events are required.

- game.session.started
- game.day.started
- game.inbox.generated
- game.email.opened
- game.email.indicator_marked
- game.email.verification_requested
- game.email.decision_submitted
- game.email.decision_resolved
- game.consequences.applied
- game.threats.generated
- game.incident.created
- game.incident.resolved
- game.breach.occurred
- game.upgrade.purchased
- game.resource.adjusted
- game.day.ended
- game.session.paused
- game.session.resumed
- game.session.abandoned
- game.session.completed

### 17.5 Deterministic Randomness

The game uses a deterministic random number generator seeded at session start. Any system-generated outcome that depends on randomness must use this seeded RNG. This includes:

- Email selection and ordering.
- Attack generation outcomes.
- Breach severity calculations.
- Loot or reward distributions, if any.

Determinism supports replay, audit, and consistent analytics across devices.

### 17.6 Baseline Parameter Tables

The following baseline parameters are intended to make implementation concrete and testable. Values are tunable during playtesting, but the structure must remain stable for analytics and balancing. These parameters should live in a configuration registry with explicit versioning.

**Daily inbox size by threat tier**
| Threat Tier | Min Emails | Max Emails |
|-------------|------------|------------|
| LOW | 4 | 6 |
| GUARDED | 6 | 9 |
| ELEVATED | 8 | 12 |
| HIGH | 10 | 15 |
| SEVERE | 12 | 18 |

**Minimum legitimate ratio by threat tier**
| Threat Tier | Minimum Legitimate Share |
|-------------|--------------------------|
| LOW | 80% |
| GUARDED | 70% |
| ELEVATED | 60% |
| HIGH | 50% |
| SEVERE | 40% |

**Deferral penalties (action-based, no timers)**
| Condition | Penalty |
|-----------|---------|
| Defer action on an email | Trust score -1 per action |
| Defer action on high-urgency email | Additional trust score -1 |
| Repeated defer on same email | Escalating reputation penalty per action |
| Large daily backlog (queue-level) | Additional trust score -X based on backlog size |

**Backlog pressure (queue-level)**
| Condition | Effect |
|-----------|--------|
| Backlog <= 2 | No additional pressure |
| Backlog 3-5 | Minor trust penalty, narrative warning |
| Backlog 6-9 | Moderate trust penalty, faction patience reduced |
| Backlog 10+ | Major trust penalty, operational strain event |

**Indicator mark limit**
| Rule | Value |
|------|-------|
| Max indicators per email | 6 |
| Max indicators per verification packet | 4 |

---

## 18. UI Mapping and Player Feedback

The UI is designed to make state transitions visible and understandable without breaking diegesis. Each state maps to one or more panels within the terminal interface.

### 18.1 State to UI Panel Mapping

- DAY_START maps to the Daily Brief panel and system status bar.
- INBOX_INTAKE maps to inbox loading animations and queue display.
- EMAIL_TRIAGE maps to the inbox list, email viewer, and action bar.
- VERIFICATION_REVIEW maps to the document viewer and verification pane.
- DECISION_RESOLUTION maps to the action bar confirmation dialog.
- CONSEQUENCE_APPLICATION maps to immediate feedback overlays and alert toasts.
- THREAT_PROCESSING maps to intelligence brief updates and threat indicator animations.
- INCIDENT_RESPONSE maps to the incident log and response action panel.
- RESOURCE_MANAGEMENT maps to facility dashboard and capacity meters.
- UPGRADE_PHASE maps to the procurement system and upgrade catalog.
- DAY_END maps to the day summary screen and “advance day” control.

Threat tier visual encoding must use the DD-05 tier mapping as the source of truth. If a theme or accessibility mode changes colors, the tier name label and shield icon state must remain consistent with DD-05 to avoid UI and simulation mismatch.

### 18.2 Feedback Principles

Feedback is delivered in three tiers.

- Micro feedback: immediate confirmation of actions such as indicator marking.
- Meso feedback: decision impact and short educational notes.
- Macro feedback: day summary with net changes and narrative updates.

This layered approach reduces cognitive overload while ensuring each decision is connected to a learning outcome.

### 18.3 Error and Invalid Action Handling

When a player attempts an action not allowed in the current state, the UI must show a clear, diegetic error message. For example, attempting to purchase upgrades during EMAIL_TRIAGE should display “PROCUREMENT SYSTEM LOCKED: COMPLETE ACCESS REQUESTS.” The action is rejected, the state remains unchanged, and an error event is logged.

---

## 19. Accessibility and Time Pressure Model

Accessibility is a core requirement. The state machine is designed to avoid forcing players into quick reactions.

### 19.1 No Per-Email Timers

There are no countdown timers on individual emails. The player can take as long as needed to analyze an email without penalty. This aligns with accessibility and with careful security behavior.

### 19.2 Queue Pressure

Time pressure is simulated via queue growth and backlog pressure, not per-email timers. The player can always pause the game or switch to a reduced queue rate in accessibility settings.

### 19.3 Incident and Ransom Timers (Exception)

Event timers are allowed for incident response deadlines and ransom demands. These timers are part of narrative and consequence systems, not email triage. They must be pauseable, extendable in accessibility settings, and clearly signposted to avoid hidden time pressure. This aligns with the UI guidance in DD-07 while preserving the no-per-email-timers rule.

### 19.4 Pause and Resume

Pausing freezes the state machine and prevents background changes. The game must be stable across long pauses, especially for enterprise users who may be interrupted.

### 19.5 Reduced Motion and Visual Effects

CRT effects, flicker, and animation are layered on top of a fully functional base UI. All visual effects can be disabled without altering state transitions.

---

## 20. Telemetry, KPIs, and Learning Outcomes

Telemetry is embedded into the state machine through event emission. This enables both consumer analytics and enterprise reporting.

### 20.1 Core Metrics

- Decision accuracy by category.
- Overly cautious denial rate and overly permissive approval rate.
- Time spent per email.
- Verification usage rates.
- Incident response quality metrics.
- Upgrade purchase patterns.
- Breach frequency and severity.
- Session length and day completion rate.

### 20.2 Learning Outcomes Mapping

Each state transition corresponds to a skill measurement. For example, marking indicators in EMAIL_TRIAGE maps to phishing detection capability. Resolving incidents maps to incident response capability. Resource allocation choices map to operational security judgment.

The day cycle directly implements the Experiential Learning (Kolb) cycle defined in the BRD (Section 11.2): Concrete Experience (analyzing emails in EMAIL_TRIAGE), Reflective Observation (post-decision feedback in CONSEQUENCE_APPLICATION), Abstract Conceptualization (Phishing Analysis Worksheet and educational notes), and Active Experimentation (applying learned patterns to the next day's emails). The BRD also specifies Situated Learning (skills learned in context transfer to real-world conditions), Constructivism (no single correct playthrough), and Zone of Proximal Development (Morpheus provides contextual scaffolding without solving problems), all of which are operationalized through the core loop's coaching, hints, and narrative-driven scaling systems.

### 20.3 Enterprise Reporting

For enterprise deployments, aggregated metrics feed compliance reports. These reports must be reproducible by replaying event logs. This is one of the reasons the state machine is deterministic and event-sourced.

---

## 21. Failure, Recovery, and End States

Failure in The DMZ is not a single abrupt game over. It is a managed process designed to reinforce learning and maintain engagement.

### 21.1 Failure Types

- Minor failure: a bad decision with limited impact.
- Major failure: a breach event with temporary recovery.
- Catastrophic failure: repeated breaches leading to total loss of trust or funds.

### 21.2 Recovery Mode

Recovery mode is triggered by major failures where the player can afford the ransom. It restricts available actions and forces the player to prioritize recovery tasks. Recovery mode ends after 1-7 recovery days (scaled by security tooling and staff) or after a successful mitigation action. During recovery, the player experiences 10-40% client attrition and a 30-day post-breach revenue depression. If the player cannot pay the ransom (total lifetime earnings / 10, minimum 1 CR), the session transitions to a game-over state (SESSION_COMPLETED with a failure reason). This hard-fail condition is critical to the breach economy's pedagogical impact (BRD FR-GAME-017).

### 21.3 Completion Conditions

Completion conditions vary by mode. In narrative mode, completion may be tied to season finale events. In enterprise mode, completion may be tied to training program requirements. Both are represented as SESSION_COMPLETED with metadata describing the reason.

---

## 22. Determinism, Save/Load, and Replay

Determinism is essential for multi-platform play, enterprise auditing, and player trust.

### 22.1 Save Strategy

The game uses event logs and periodic snapshots. Snapshots are materialized every 50 events or at day boundaries (DAY_END), whichever comes first, as specified in the BRD (Section 8.5). An additional snapshot is written on player pause. Loading a session replays events after the last snapshot to restore state.

### 22.2 Replay and Review

Enterprise administrators may review sessions. The event log provides a complete replay of the session. The state machine guarantees that replay produces identical results.

### 22.3 Versioning

Event versions are explicitly stored. When schema changes occur, migration scripts must transform old events or reducers must support old versions.

---

## 23. Anti-Frustration and Coaching Systems

The core loop is challenging by design. The state machine includes guardrails that reduce rage-quit scenarios without trivializing the experience.

### 23.1 Breathing Room

After major incidents, recovery chapters with lower-threat requests prevent burnout and mirror real-world attack pattern ebbs (BRD Section 11.6). The threat system can force a temporary threat tier reduction after major breaches or campaign defeats. This is managed by the Threat Engine but enforced by the state machine through a "breathingRoomRemaining" flag.

### 23.2 Coaching Messages

Morpheus and the intelligence system deliver coaching messages when the player repeats common mistakes. Coaching is contextual and must reference actual decisions, not generic tips.

### 23.3 Optional Hints

Hints can be toggled. When enabled, the UI can highlight a subset of indicators or recommend verification. Hints reduce rewards and are recorded for analytics to avoid contaminating training outcomes.

---

## 24. Testing and Validation Strategy

The state machine must be rigorously tested to avoid invalid transitions and hidden bugs.

### 24.1 Unit Tests

Unit tests validate reducer logic for each action type and state transition. Each test starts from a known state and applies an action, then checks resulting state and emitted events.

### 24.2 Integration Tests

Integration tests simulate full day cycles, including threat generation and incident response. Determinism is verified by running the same sequence with the same seed and confirming identical outputs.

### 24.3 QA Scenario Scripts

QA should be provided with scenario scripts that define a series of actions and expected outcomes. These scripts double as training verification, ensuring that core loop actions map correctly to learning outcomes.

---

## 25. Open Questions and Decision Log

The following items require future decisions and may affect the state machine.

- Should carryover emails persist indefinitely, or should the queue-level backlog pressure trigger additional systemic consequences?
- Should certain high-risk emails force a mandatory verification phase?
- How should narrative events override normal state progression without breaking determinism?
- Should the player be able to reorder phase sequence in sandbox mode?
- How will cooperative multiplayer affect incident response states and decision ownership?

A decision log should be maintained to record outcomes and update the state machine accordingly.

---

## 26. Appendix A: ASCII Diagrams

### 26.1 Macro State Diagram

```
[SESSION_INIT] --> [SESSION_ACTIVE] --> [SESSION_COMPLETED]
                        |       ^              ^
                        |       |              |
                        v       |              |
                   [SESSION_PAUSED]            |
                        |                      |
                        v                      |
                   [SESSION_ACTIVE] --> [SESSION_BREACH_RECOVERY]
                        |                      |
                        v                      v
                   [SESSION_ABANDONED]  [SESSION_COMPLETED (game over)]

Transitions:
  SESSION_INIT -> SESSION_ACTIVE
  SESSION_ACTIVE <-> SESSION_PAUSED
  SESSION_ACTIVE -> SESSION_BREACH_RECOVERY (breach with recoveryDays > 0)
  SESSION_BREACH_RECOVERY -> SESSION_ACTIVE (recovery complete)
  SESSION_BREACH_RECOVERY -> SESSION_COMPLETED (cannot pay ransom: game over)
  SESSION_ACTIVE -> SESSION_COMPLETED (narrative/win conditions met)
  SESSION_ACTIVE -> SESSION_ABANDONED (player quits or admin terminates)
```

### 26.2 Day Cycle Diagram

```
DAY_START -> INBOX_INTAKE -> EMAIL_TRIAGE <-> VERIFICATION_REVIEW
     -> DECISION_RESOLUTION -> CONSEQUENCE_APPLICATION -> THREAT_PROCESSING
     -> INCIDENT_RESPONSE -> RESOURCE_MANAGEMENT -> UPGRADE_PHASE -> DAY_END
```

---

## 27. Appendix B: Example Event Flow

The following sequence illustrates a typical day event flow.

1. game.day.started
2. game.inbox.generated
3. game.email.opened
4. game.email.indicator_marked
5. game.email.verification_requested
6. game.email.opened
7. game.email.decision_submitted
8. game.email.decision_resolved
9. game.consequences.applied
10. game.threats.generated
11. game.incident.created
12. game.incident.resolved
13. game.upgrade.purchased
14. game.day.ended

This flow demonstrates how actions and system outcomes are interleaved within a single day cycle.

---

## 28. Appendix C: State Table Details

The following table summarizes key states, legal actions, and exit conditions. This is not exhaustive but defines the minimum required behavior.

| State                   | Legal Actions                                                     | Exit Condition                                                                          | Next State                               |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| DAY_START               | ACK_DAY_START                                                     | Brief acknowledged                                                                      | INBOX_INTAKE                             |
| INBOX_INTAKE            | None (system)                                                     | Inbox generated                                                                         | EMAIL_TRIAGE                             |
| EMAIL_TRIAGE            | OPEN_EMAIL, MARK_INDICATOR, REQUEST_VERIFICATION, SUBMIT_DECISION | All emails have explicit outcomes (approve, deny, flag, request verification, or defer) | DECISION_RESOLUTION                      |
| VERIFICATION_REVIEW     | OPEN_VERIFICATION, MARK_INDICATOR                                 | Verification closed                                                                     | EMAIL_TRIAGE                             |
| DECISION_RESOLUTION     | SUBMIT_DECISION                                                   | Decisions validated                                                                     | CONSEQUENCE_APPLICATION                  |
| CONSEQUENCE_APPLICATION | APPLY_CONSEQUENCES                                                | Consequences applied                                                                    | THREAT_PROCESSING                        |
| THREAT_PROCESSING       | PROCESS_THREATS                                                   | Threats applied                                                                         | INCIDENT_RESPONSE or RESOURCE_MANAGEMENT |
| INCIDENT_RESPONSE       | RESOLVE_INCIDENT                                                  | No active incidents                                                                     | RESOURCE_MANAGEMENT                      |
| RESOURCE_MANAGEMENT     | ADJUST_RESOURCE                                                   | Player exits dashboard                                                                  | UPGRADE_PHASE                            |
| UPGRADE_PHASE           | PURCHASE_UPGRADE                                                  | Player exits catalog                                                                    | DAY_END                                  |
| DAY_END                 | ADVANCE_DAY                                                       | Player confirms advance                                                                 | DAY_START                                |

---

## 29. Appendix D: Example Day Walkthrough

This walkthrough illustrates how a single day flows through the state machine. It is intentionally verbose to show how multiple systems interact without breaking determinism. The day described here is Day 12, with the player at the Vault facility tier (tier 3 of 5: Outpost, Station, Vault, Fortress, Citadel) and the threat level at ELEVATED. The session is in the default narrative-driven scaling mode, and the player has moderate competence, with a tendency toward cautious decisions.

The day begins in DAY_START. The system loads the daily brief and applies a narrative trigger about increased hacktivist activity. The player reads a short Morpheus message explaining that the Sovereign Compact has tightened access policies, which raises the reputational stakes of denying legitimate government requests. The daily operating cost is applied, reducing funds by a fixed amount. The session seed and day number are used to generate deterministic modifiers for this day’s email pool.

The state machine transitions into INBOX_INTAKE. The content system pulls 9 emails from the pool, with a 60 percent legitimate ratio. The threat tier and an active campaign add two spear phishing attempts to the mix. Each email receives metadata such as urgency and faction affiliation. The queue is ordered with two high-urgency items near the top, but the player is not forced to resolve them first. The UI shows a brief “9 requests received” banner and the inbox list populates.

In EMAIL_TRIAGE, the player opens the first email, a request from a Librarian faction archivist. The sender domain looks legitimate, but the message includes a shortened URL. The player inspects the link preview and marks “suspicious link.” The system records an indicator event. The player requests verification, which pushes the email into VERIFICATION_REVIEW. The packet includes a signed letter but the signature is dated two days in the future, a small anomaly that the player notices and marks. They return to the inbox.

The second email is a corporate request from Nexion Industries with an attached contract. The contract matches the document templates used for legitimate requests. The player opens the attachment, checks the headers, and finds no anomalies. They approve the request. The system records the decision and immediately shows a small feedback toast confirming that the action was recorded, without judging the decision.

The third email is a high-urgency request claiming to be from the Sovereign Compact. It includes an authority claim and a demand for immediate access. The player opens the headers and sees a mismatch between the display name and the sending domain. They mark “domain mismatch” and “authority claim,” then deny the request. This is a risk-averse decision that reduces exposure, and the system later rewards the player with a trust score boost during consequence resolution.

The player continues through the inbox, flagging two emails for review and deferring one that lacks enough information. The deferral is recorded as an explicit action, which will generate a reputation penalty at day end. After all other emails are resolved, the player returns to the deferred email, which is from a hacktivist collective claiming to possess critical infrastructure logs. The player requests verification and receives a packet containing mismatched file hashes. The player denies the request.

With all emails resolved or deferred, the state machine moves to DECISION_RESOLUTION. The game engine validates that no email is decided twice and classifies decisions by risk alignment. It generates brief educational notes when decisions are over-cautious or overly permissive. In this walkthrough, the player denied a legitimate Librarian request due to a time zone misinterpretation. The system classifies this as over-cautious and prepares feedback about relationship impact and verification practices.

CONSEQUENCE_APPLICATION aggregates results. The player gains funds from the approved Nexion request, loses a small amount of trust from denying the Librarian, and gains a larger trust increase from denying the high-risk Sovereign Compact request. Faction relations are adjusted accordingly. The deferral results in a small reputation penalty and a warning that backlog pressure will increase if the queue remains large. The system also applies the daily tool maintenance cost, reducing funds slightly.

THREAT_PROCESSING begins. The Threat Engine evaluates the player’s competence and current threat tier and selects one active campaign and one standalone attack. It generates a spear phishing follow-up from the earlier hacktivist request and a credential harvesting attempt associated with an unrelated email. The system determines that one attack is detected by the player’s IDS tool, while the other bypasses defenses. The undetected attack becomes a level 2 incident and emits game.incident.created.

The state machine enters INCIDENT_RESPONSE. The incident panel appears with evidence logs showing suspicious authentication attempts. The player selects a containment action that isolates the affected account and a recovery action to rotate credentials. The actions have a resource cost but prevent escalation. The incident is resolved, and the system awards a small trust bonus for effective response.

RESOURCE_MANAGEMENT follows. The facility dashboard shows utilization at 85 percent, with cooling at a critical threshold. The player decides to throttle a low-value client to regain headroom. This choice reduces revenue slightly but lowers operational risk. The adjustment is recorded as a resource event.

In UPGRADE_PHASE, the player purchases a maintenance update for the IDS tool and declines a new WAF upgrade due to limited funds. The update restores IDS effectiveness and reduces the degradation rate. The purchase event is recorded for analytics and will influence future detection probabilities.

At DAY_END, a summary panel appears. The player reviews net changes: funds up slightly, trust score stable, threat tier unchanged, one incident resolved, and one faction relationship slightly harmed. The day summary also includes a short narrative note about the Librarians questioning the denial. The player chooses to advance to the next day, which transitions back to DAY_START and writes a snapshot of the completed day.

This walkthrough illustrates the core loop in practice. Every decision triggers measurable outcomes, every phase has a clear purpose, and the player retains control over pacing. The state machine ensures this flow is repeatable, auditable, and consistent across platforms and sessions.

---

**End of Document**
