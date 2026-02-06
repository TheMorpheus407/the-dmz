# 13 -- Multiplayer & Social Systems Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-13
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Game Design & Systems Architecture
**Authors:** Multiplayer Systems, Social Platform, and Game Design Team

---

## Table of Contents

1. Executive Summary
2. Scope and Non-Goals
3. Inputs and Dependencies
4. Design Principles
5. Terminology and Concept Model
6. Multiplayer and Social System Overview
7. Mode Catalog
8. Social Layer Design
9. Gameplay Integration with Core Loop
10. Progression, Rewards, and Economy Alignment
11. Matchmaking, Ranking, and Fairness
12. Technical Architecture and Data Model
13. Enterprise, Compliance, and Tenant Controls
14. Safety, Moderation, and Trust Systems
15. Accessibility and UX Integration
16. Telemetry, KPIs, and Learning Outcomes
17. Testing, Validation, and Live Operations
18. Phased Delivery Plan
19. Open Questions and Decision Log
20. Appendices

---

## 1. Executive Summary

This document defines the multiplayer and social systems for The DMZ: Archive Gate, aligned with the BRD and the existing design documents for the core loop, threat engine, UI/UX, and backend architecture. The goal of multiplayer and social systems is to deepen engagement, build community, and reinforce cybersecurity learning outcomes while preserving the game’s stealth learning mission. Multiplayer is not an optional garnish; it is a strategic pillar in the BRD’s year 2 and year 3 objectives, and a core differentiator in the competitive landscape.

The multiplayer and social design emphasizes four pillars.

First, the system must extend the single-player core loop rather than replace it. Multiplayer modes are derived from the email triage, verification, decision, and incident response mechanics already defined. The game’s primary fantasy remains “last authority in a fractured internet.” Multiplayer introduces additional authorities, allies, and adversaries, but it never removes the player’s sense of responsibility.

Second, social systems must remain compatible with enterprise deployments, including strict tenant isolation, configurable privacy controls, and auditability. Enterprise customers must be able to disable or constrain social features without breaking the core game. At the same time, consumer players should experience a modern social layer: friends, parties, guilds, community forums, leaderboards, achievements, and seasonal competitive events.

Third, the multiplayer architecture must be deterministic, server authoritative, and event sourced. This ensures fairness, reproducibility for enterprise assessments, and compatibility with the backend design in DD-09. The game’s pedagogical value depends on consistent outcomes and traceable decisions. Multiplayer complicates this; therefore, this document defines explicit state machine overlays and data contracts to preserve determinism.

Fourth, safety and moderation are treated as first-class requirements. The product targets a broad audience and can be deployed in regulated enterprises. Chat, identity, presence, and user generated content are carefully scoped to minimize toxicity, protect privacy, and reduce operational risk.

The system is delivered in phases aligned with the BRD roadmap.

Phase 3 (Months 6-12 per BRD, with multiplayer deliverables concentrated in Months 9-12) introduces social foundations and consumer social deliverables: player profiles, friend system, leaderboards, achievements, community forums, and two-player cooperative missions, plus an initial Red vs. Blue competitive mode (unranked or limited ladder) for Month 11-12 readiness. Phase 4 (Months 12-18 per BRD, with core multiplayer deliverables in Months 14-15 and extended features through Month 18) expands into full multiplayer: six-player cooperative operations, ranked Red vs. Blue with independent Red/Blue ranks, additional competitive variants (Asymmetric Assault with 1 vs. 3-5 configuration and Purple Team), asynchronous competition, capture-the-flag and hackathon events, cross-organization anonymized benchmarking, and a mature guild system with community events. Throughout all phases, enterprise administrators retain control over social and multiplayer availability.

---

## 2. Scope and Non-Goals

**In scope**

- Social graph features including friends, blocks, muting, and privacy controls.
- Presence and party systems for coordinating gameplay.
- Global and scoped leaderboards with fair competition rules.
- Achievements, badges, and social-facing progression indicators.
- Cooperative multiplayer missions, initially two-player and later up to six-player.
- Competitive multiplayer modes including Red vs. Blue, Asymmetric Assault, and Purple Team variants.
- Guild or alliance systems, including roles and shared objectives.
- Community forums (in-game, moderated) for consumer social engagement.
- Asynchronous multiplayer interactions that layer onto the single-player loop.
- Matchmaking, ranking, and fairness systems.
- Moderation, reporting, and safety mechanisms.
- Backend data models, services, and API surfaces required to support multiplayer and social features.
- Enterprise controls for privacy, data segregation, and feature toggles.

**Out of scope**

- Narrative scripting and season content authoring beyond the mechanical requirements of multiplayer.
- Full UI component specifications, which remain under DD-07.
- Monetization mechanics, except where multiplayer and social systems require clarity to avoid pay-to-win outcomes.
- Cross-platform account linking workflows, which are handled by identity and auth systems in DD-09.
- Third-party community platforms (external forums, Discord) beyond referral or link-out behavior. In-game community forums are in scope and specified in this document.
- Esports production tooling beyond basic spectator mode and streamer support.

The primary objective is to define the structure, interaction rules, and backend architecture for multiplayer and social systems that integrate cleanly with the existing core gameplay loop and enterprise platform.

---

## 3. Inputs and Dependencies

This design is based on the following sources and must be read together with them.

- BRD-DMZ-2026-001, especially Sections 5, 11, and the Phase 3 and Phase 4 roadmap items related to social and multiplayer.
- DD-01 Game Core Loop & State Machine Design Specification for the canonical day cycle, state transitions, and event model.
- DD-05 Threat Engine & Breach Mechanics for threat tiering, breach events, and incident response requirements.
- DD-07 UI/UX Terminal Aesthetic for interaction patterns and accessibility constraints.
- DD-09 Backend Architecture & API for modular monolith structure, event sourcing, and API standards.

Key dependency assumptions:

- The game engine is server authoritative and event sourced. Multiplayer must use the same event stream model.
- Threat generation and incident resolution are deterministic and must remain so in multiplayer contexts.
- The UI enforces a diegetic terminal aesthetic, with limited reliance on flashy real-time effects.
- The backend provides WebSocket or equivalent real-time transport for multiplayer state updates.
- Feature flags and tenant policies exist to enable or disable social features in enterprise deployments.

---

## 4. Design Principles

1. **Stealth learning remains primary.** Multiplayer and social systems are additive scaffolding for learning outcomes, not a separate game genre that undermines the training goals.
2. **Determinism and auditability.** Multiplayer sessions must reproduce the same outcome given the same seed and action log. This is critical for enterprise compliance and fairness in ranked play.
3. **Server authority.** All multiplayer state changes are validated and applied on the server. Clients are thin, reactive, and never authoritative for outcomes.
4. **Narrative justification.** Multiplayer actions and modes must be diegetically grounded in the game world to preserve immersion.
5. **Fairness over spectacle.** The system prioritizes fair, comprehensible outcomes rather than flashy, opaque mechanics.
6. **Opt-in sociality.** Players can engage with social features without being forced into social exposure. Privacy and safety defaults are conservative.
7. **Accessibility and pacing.** Real-time pressure is limited. Cooperative modes emphasize deliberation and clear responsibilities.
8. **Enterprise safety.** All social features are tenant-aware, isolatable, and can be disabled without breaking core gameplay.
9. **Low toxicity design.** Communication systems are limited in scope, with guided prompts and strong moderation.
10. **Extensibility.** Multiplayer modes should be composable for future content and seasons without breaking existing data.

---

## 5. Terminology and Concept Model

- **Session:** A single run of the game, containing day cycles, state, and events.
- **Party:** A temporary group of players who intend to play a cooperative session together.
- **Squad:** A fixed cooperative unit within a session. A party becomes a squad when the session begins.
- **Guild:** A persistent social group of players with shared identity, roles, and progression.
- **Corporation:** An enterprise-only organizational construct mapped to HRIS/SCIM org charts, with shared treasury and infrastructure.
- **Red Team:** Players acting as adversarial operators in competitive mode.
- **Blue Team:** Players acting as defenders or triage operators in competitive mode.
- **Async Challenge:** A mode where players respond to a shared scenario at different times, compared by score.
- **Role:** A function in co-op sessions that determines interface scope and permitted actions. BRD FR-MP-002 defines six canonical roles: Perimeter Warden, Intake Analyst, Threat Hunter, Systems Keeper, Crypto Warden, and Comms Officer.
- **Authority Token:** A session-level permission that allows a player to finalize a decision in shared workflows.
- **Trust Score:** A shared metric (0-500+ per BRD Section 11.4) representing the facility's operational credibility, affected by player decisions. Functions as a reputation gate that unlocks client tiers, contracts, and narrative content. Cannot be purchased.
- **Skill Rating:** A hidden or visible rating derived from player performance and used for matchmaking.

---

## 6. Multiplayer and Social System Overview

Multiplayer and social systems are layered on top of the single-player core loop. They are composed of three tiers.

**Tier 1: Social Foundations**

- Player profiles and identity.
- Friends and blocked lists.
- Presence and party system.
- Leaderboards and achievements.
- Community forums.

**Tier 2: Cooperative Multiplayer**

- Two-player cooperative missions (Phase 3).
- Shared decision workflows for email triage, verification, and incident response.
- Role-based interface separation to reduce cognitive overload.

**Tier 3: Competitive and Large-Scale Systems**

- Red vs. Blue competitive mode (Phase 3 unranked, Phase 4 ranked).
- Asymmetric Assault competitive variant.
- Purple Team hybrid variant.
- Six-player cooperative operations with specialized roles.
- Asynchronous competitions and global events.
- Mature guild system with seasonal goals and intra-guild competitions.

The system is not designed as a traditional real-time action multiplayer game. It is a structured collaborative and competitive decision platform, more similar to a command room than a shooter. This aligns with the game’s tone, UI style, and educational objectives.

---

## 7. Mode Catalog

This section defines the multiplayer and social modes, the learning outcomes they reinforce, and the technical implications of each.

### 7.1 Global and Scoped Leaderboards

Leaderboards are a foundational social feature available in both consumer and enterprise contexts. Per BRD FR-CON-008, the system provides global and regional leaderboards with granular ranking categories. They are primarily asynchronous and do not require real-time coordination.

Leaderboard types include:

- **Global Scoreboard:** Top performance across all players by season.
- **Regional Scoreboard:** Scoreboards filtered by region for latency and cultural fairness.
- **Guild Scoreboard:** Aggregated performance across guild members.
- **Enterprise Tenant Scoreboard:** Internal leaderboard for organizations.
- **Friends Scoreboard:** Personalized competition among social graph contacts.

Scoring inputs:

- Decision accuracy in email triage.
- Time-to-decision within reasonable thresholds.
- Incident response effectiveness.
- Resource efficiency and uptime.
- Behavior metrics such as reporting suspicious emails in simulation campaigns.

Leaderboards are weighted to discourage reckless speed and to avoid rewarding denial-only play styles. The scoring model uses a composite score with caps and penalties that are consistent with the learning objectives.

### 7.2 Achievements and Badges

Achievements provide durable social proof and help onboard players into desired behaviors. Per BRD FR-CON-010, the achievement system includes both visible and hidden badges, all mapping to security competencies. Achievements are visible on profiles and optionally shareable externally. Hidden achievements are revealed only upon completion, encouraging exploration and rewarding thorough security practices.

Achievement categories:

- **Core Competency:** Accuracy in phishing detection, verification discipline, and incident response. These map directly to security competency domains per BRD FR-CON-010.
- **Operational Mastery:** Efficiency in resource allocation and upgrade planning.
- **Social Contribution:** Participation in co-op missions, mentorship, and guild activities.
- **Narrative Milestones:** Season completion, faction alliances, and story arcs.
- **Hidden Badges:** Discoverable only through specific security-correct behaviors, reinforcing curiosity and thoroughness.

Achievements are intentionally linked to learning goals rather than grindable vanity metrics. Each achievement has a clear educational intention and maps to one or more security competency domains. A subset of achievements is accessible in enterprise contexts and can be mapped to compliance reporting.

### 7.3 Friend System and Presence (BRD FR-CON-009)

Per BRD FR-CON-009, the platform provides a friend system with social graph. Players can add friends via in-game search, shared party codes, or platform integrations. Presence indicates current activity without exposing sensitive data.

Presence states:

- Offline
- Online
- In Session
- In Co-op
- In Ranked

Players can appear offline or restrict presence to friends only. The system honors privacy settings in all contexts.

### 7.4 Party System

The party system allows players to form a temporary group and launch a cooperative session. Parties support voice or text coordination, but default to minimal safe communication.

Party features:

- Invite by friend, code, or guild.
- Pre-session role assignment.
- Shared difficulty selection and accessibility options.
- Ready check and launch flow.

The party system feeds into the matchmaker for cooperative missions, and persists only for the duration of the session unless converted into a guild event.

### 7.5 Two-Player Cooperative Missions

Two-player co-op is the first true multiplayer gameplay mode, targeted for Phase 3. It mirrors the single-player day cycle but introduces division of labor and shared decision-making. Per BRD FR-MP-001, the cooperative system supports 2-6 player cooperative missions with interconnected data centers facing shared threat campaigns; two-player missions are the entry point, with larger party sizes unlocking progressively in Phase 4.

Co-op mission characteristics:

- Shared inbox with split responsibilities.
- Role separation to reduce cognitive overload.
- Joint risk and resource outcomes.
- Shared breach consequences.
- Difficulty tiers per BRD FR-MP-004: Training, Standard, Hardened, Nightmare.

Two-player co-op is designed for consumer players and internal enterprise teams. It is also the entry point for social learning, as players discuss and negotiate decisions.

**Named cooperative scenarios (BRD FR-MP-003):** The co-op system includes the following BRD-specified scenario types, each designed around a distinct threat domain: Cascade Failure (supply chain attack coordination), Bandwidth Siege (DDoS defense and resource triage), The Insider (anomaly detection and internal threat identification), and Data Exodus (distributed data protection under extraction pressure). Additional scenarios may be authored for seasonal content, but these four are required for the cooperative mode launch.

### 7.6 Six-Player Cooperative Operations

The Phase 4 expansion introduces larger cooperative sessions with specialized roles. This is a signature experience that mirrors a real SOC environment. Per BRD FR-MP-001, the system supports 2-6 player cooperative missions with interconnected data centers facing shared threat campaigns; sessions with 3, 4, or 5 players use a subset of the six-player role set with merged responsibilities.

Roles map to real SOC functions and use narrative-appropriate names aligned with BRD FR-MP-002:

- Perimeter Warden (Network Security) -- monitors external boundaries and access points
- Intake Analyst (SOC Tier 1) -- handles inbox scanning, indicator tagging, and initial risk scoring
- Threat Hunter (SOC Tier 2/3) -- interprets intelligence briefs and adjusts threat posture recommendations
- Systems Keeper (SysAdmin) -- allocates resources and manages upgrades
- Crypto Warden (PKI) -- reviews verification packets and external evidence, manages certificate integrity
- Comms Officer (Incident Commander) -- manages active incidents and response actions, coordinates cross-role communication

For clarity in design discussions, the following functional aliases may be used internally: Triage Analyst (Intake Analyst), Verification Officer (Crypto Warden), Incident Commander (Comms Officer), Threat Intelligence Liaison (Threat Hunter), Infrastructure Manager (Systems Keeper). The Compliance Auditor function (observing decisions, annotating risk acceptance, managing audit trails) is distributed across roles or assigned as a secondary responsibility in sessions with fewer than six players.

Each role has a limited interface and toolset, reinforcing the idea of professional specialization. The session has a central authority structure to avoid deadlock.

### 7.7 Red vs. Blue Competitive Mode (Classic Mode per BRD FR-MP-005)

Per BRD FR-MP-005, this is the Classic Red vs. Blue mode with team-swapping rounds. Competitive mode positions one team as adversarial (Red) and one as defenders (Blue). This mode is framed as a sanctioned simulation exercise run by Matrices GmbH rather than a real attack.

Key features:

- Classic Red vs. Blue format with team-swapping rounds per BRD FR-MP-005.
- Symmetrical objectives with asymmetric tools.
- Short rounds with clear scoring.
- Skill-based matchmaking with Elo-based rating and **independent Red and Blue ranks** per BRD FR-MP-008. Players maintain separate skill ratings for attack and defense roles, and matchmaking considers the relevant rank for the assigned side.
- Strong anti-cheat and moderation requirements.
- **Red team tooling** per BRD FR-MP-009: abstracted equivalents of Nmap (network scanning), Metasploit (exploitation framework), SET (social engineering toolkit), and Cobalt Strike (adversary simulation). These are presented as curated action cards rather than freeform tools.
- **Blue team tooling** per BRD FR-MP-010: abstracted equivalents of SIEM (log correlation), EDR (endpoint detection), sandboxing (attachment detonation), forensics (evidence analysis), and honeypots (deception detection). These are integrated into the standard triage and incident response interface.

Red vs. Blue is a core engagement driver for the advanced user segment and the cybersecurity professional audience. It also supports streamer-friendly content, including integration with Twitch and YouTube per BRD FR-CON-011.

### 7.8 Asymmetric Assault Mode

Asymmetric Assault is a required competitive variant per BRD FR-MP-006. The canonical configuration is **1 skilled attacker vs. 3-5 defenders**. The solo attacker operates with constrained visibility and must complete a high-risk objective, while the defending team uses enhanced monitoring tools. The mode is designed to reflect real-world asymmetries between attackers and defenders without teaching offensive exploitation.

Key features:

- Asymmetric objectives (exfiltration or disruption vs. detection and containment).
- Asymmetric player count: 1 attacker vs. 3-5 defenders, as specified in BRD FR-MP-006.
- Tooling asymmetry that reinforces defensive logic rather than offensive hacking.
- Scenario pacing that emphasizes reconnaissance signals and deception detection.
- Explicit debriefs that explain why defensive indicators worked.

Asymmetric Assault is implemented as a competitive variant layered onto the same deterministic scenario engine as Red vs. Blue. It is targeted for the full competitive suite in Phase 4 after the initial Red vs. Blue delivery in Phase 3.

### 7.9 Purple Team Hybrid Mode

Purple Team is a hybrid cooperative-competitive mode where two teams alternate between attack simulation and defense improvement in a shared scenario. The purpose is to accelerate learning by forcing players to see both sides of the security workflow.

Key features:

- Structured round phases: simulate -> defend -> post-mortem review.
- Shared “lessons learned” log that feeds into player skill profiles.
- Scoring that rewards accurate identification of defenses, not destructive outcomes.

Purple Team is especially relevant for enterprise training because it supports cross-functional collaboration and post-incident learning. It is intended for Phase 4 rollout in enterprise-friendly configurations, with an optional consumer variant.

### 7.10 Enterprise Team Competitions (BRD FR-MP-015 to FR-MP-018)

Enterprise team competitions are a distinct category of multiplayer engagement, separate from consumer competitive modes. They are designed for internal organizational use and must comply with enterprise privacy and reporting requirements.

Required features:

- **Department-based team competitions** with manager visibility into team performance (FR-MP-015). Managers can view aggregate team metrics without accessing individual decision logs unless granted explicit permission.
- **Organization-wide leaderboards** with configurable privacy settings (FR-MP-016). Administrators control whether leaderboards display individual names, pseudonyms, or team-level aggregates only.
- **Cross-organization anonymized benchmarking** (FR-MP-017). Organizations can compare their aggregate training metrics against anonymized peer data without exposing individual or organizational identity.
- **Capture-the-flag events, seasonal tournaments, and hackathon events** (FR-MP-018). These are structured competitive events that can be scheduled by tenant administrators or triggered by seasonal content. CTF events use the deterministic scenario engine with time-limited objectives. Hackathon events support custom scenario packs authored by tenant administrators.

Enterprise team competitions are available in Phase 3 (basic department leaderboards) and expanded in Phase 4 (CTF, hackathons, cross-org benchmarking).

### 7.11 Asynchronous Challenges and Tournaments

Async challenges allow players to engage with the same scenario on their own schedule. Results are compared on scoreboards and can be used for seasonal events.

Examples:

- Weekly phishing triage challenge.
- Incident response race.
- Verification packet puzzle.

Async challenges avoid coordination complexity and are more accessible across time zones. They also integrate cleanly with enterprise training deployments.

---

## 8. Social Layer Design

### 8.1 Player Profiles

Player profiles are the public-facing identity within the ecosystem. They display progression, achievements, and selected stats without exposing sensitive data.

Profile components:

- Display name and avatar.
- Season rank and skill rating tier.
- Highlight achievements and badges.
- Selected performance metrics such as accuracy or incident response rating.
- Guild affiliation and role.

Enterprise deployments can restrict profile exposure to tenant-local views.

### 8.2 Social Graph

The social graph defines relationships between players and determines visibility of presence and communication.

Relationships:

- Friend: bi-directional, mutual visibility.
- Follow: optional one-way relationship for creators.
- Block: hides presence, prevents invites and messages.
- Mute: allows presence but silences chat or alerts.

The block system is authoritative and takes precedence over any other relationship.

### 8.3 Communication Systems

Communication must support coordination without enabling toxicity. The system supports two modes.

- **Quick Signals:** Predefined phrases and icons for in-session coordination.
- **Text Chat:** Limited to parties, guilds, and opt-in global channels.

By default, text chat is restricted to friends and guilds. Enterprise tenants can disable all chat or restrict it to pre-approved internal channels. Moderation tooling is integrated at the API layer.

### 8.4 Reputation and Trust

Reputation is a social-layer score separate from in-game trust score. It reflects how other players rate cooperation and sportsmanship. It is used for matchmaking quality and to reduce toxicity.

Reputation signals:

- End-of-session endorsements.
- Reports and moderation actions.
- Consistency in completing co-op sessions.

Reputation does not affect in-game power. It influences matchmaking priority and access to certain social features.

### 8.5 Guilds and Alliances (Consumer) and Corporations (Enterprise)

Guilds are persistent groups with their own identity and shared goals. The narrative framing is that guilds are “network alliances” coordinating access policies across the fragmented internet. In enterprise deployments, the same underlying system is extended into **corporations**, which map to organizational structures and enable shared infrastructure and treasury mechanics required by the BRD.

**Consumer guild features**

- Shared banner, tagline, and optional emblem.
- Roles with permissions for recruitment, scheduling, and event hosting.
- Guild progression based on shared achievements and seasonal performance.
- Optional guild challenges and cooperative missions.

**Enterprise corporation features (BRD FR-MP-011 to FR-MP-014 alignment)**

- **Org mapping and auto-provisioning:** corporation membership is derived from SCIM/HRIS org charts, with automatic updates to reflect department changes. Manual overrides are allowed only for tenant admins (FR-MP-011, FR-MP-014).
- **Shared infrastructure pool:** enterprise corporations have shared resource pools (capacity, tooling slots, and upgrade budgets) that are allocated across teams and tracked in audit logs. Per BRD FR-MP-013, this includes a shared SIEM dashboard and joint honeypot network as specific infrastructure components.
- **Shared treasury:** corporation-level budgets fund upgrades and simulation tooling. Spending is role-gated and requires dual approval in regulated tenants (FR-MP-013).
- **Shared intelligence feeds:** corporations receive aggregated threat intelligence derived from member activity, enabling cross-team situational awareness (FR-MP-012).
- **Joint defense operations:** corporations can organize joint defense missions where multiple departments coordinate against a shared threat campaign (FR-MP-012).
- **Alliance formation:** corporations can form alliances with other corporations (within the same tenant or across approved tenants) for cooperative events and shared leaderboards (FR-MP-012).
- **Corporation progression system:** corporations progress through milestones based on shared intelligence feeds, joint defense operations, and alliance formation outcomes (FR-MP-012).
- **Role and policy enforcement:** corporation roles align with enterprise RBAC, and permissions are enforced across co-op, competitive modes, and forum access.
- **Cross-team objectives:** corporation-wide training goals and compliance milestones are tracked and can be reported to HR/L&D and compliance teams.

Corporations are enabled only in enterprise tenants and can be disabled independently of consumer guilds. Guilds remain optional for consumer players, while corporation membership is typically mandatory based on tenant policy.

### 8.6 User-Generated Content Integration (BRD FR-CON-012 to FR-CON-014)

The social layer integrates with the BRD-specified user-generated content tools. While the full UGC platform design is outside the scope of this document, the social systems must support the following touchpoints:

- **Scenario editor for community-created threat packs** (FR-CON-012): Community-created scenarios are surfaced through guild challenges, async competitions, and community forums. Social systems provide rating, curation, and discovery mechanics for UGC scenarios.
- **Steam Workshop integration** (FR-CON-013): UGC content distributed via Steam Workshop is accessible through the social layer for guild events, community challenges, and leaderboard competitions.
- **Community marketplace for curated user content** (FR-CON-014): The community marketplace is integrated with social features including creator profiles, community ratings, and guild-curated content collections.

These UGC social touchpoints are targeted for Phase 4 (Months 16-17) per the BRD roadmap.

### 8.7 Community Forums

Community forums are a Phase 3 consumer social deliverable in the BRD. Forums are implemented as in-game, moderated discussion spaces that reinforce learning and community engagement without relying on external platforms.

Forum features:

- Categories for announcements, incident post-mortems, verification tips, guild recruitment, and seasonal events.
- Threaded discussions with structured tags (for example, “phishing indicators” or “incident response”).
- Read-only “official” threads for safety advisories and seasonal updates.
- Integration with achievements and guild events to surface relevant discussion prompts.

Enterprise tenants can enable internal-only forums or disable forums entirely. Moderation rules apply consistently across forums and chat, with stronger defaults in enterprise contexts.

---

## 9. Gameplay Integration with Core Loop

Multiplayer modes are implemented as overlays on the existing day cycle from DD-01. The goal is to avoid introducing parallel logic paths that complicate deterministic playback.

### 9.1 Co-op Session Structure

A cooperative session uses a shared day cycle. The state machine remains identical, but each phase includes role-specific actions and shared authority tokens.

Key rules:

- The session has a single authoritative state stream.
- Each player’s actions are appended to the shared event stream with attribution.
- The system enforces per-role allowed actions during each phase.
- A designated Authority role finalizes decisions to preserve determinism.

### 9.2 Role-Based Responsibilities

In co-op, the interface exposes only the relevant subset of tools to each role, reducing cognitive overload and encouraging specialization. Roles can be rotated between days or sessions to encourage learning. Role names follow the BRD FR-MP-002 SOC mapping.

Examples:

- Intake Analyst (SOC Tier 1) reviews incoming emails, marks indicators, and proposes decisions.
- Crypto Warden (PKI) examines verification packets and flags inconsistencies.
- Comms Officer (Incident Commander) selects response actions during breach events.
- Systems Keeper (SysAdmin) allocates resources and purchases upgrades.
- Threat Hunter (SOC Tier 2/3) interprets intelligence briefs and adjusts threat posture.
- Perimeter Warden (Network Security) monitors external boundaries and access points.

### 9.3 Decision Arbitration

Decisions in co-op sessions follow an explicit arbitration model.

- Non-authority roles propose decisions.
- The Authority role confirms or overrides.
- A configurable quorum requirement can enforce consensus in cooperative modes.
- Disagreements are logged as part of the event stream for learning analytics.

The arbitration model is not meant to simulate organizational politics, but it reinforces real-world security workflows where one person signs off on risk acceptance.

### 9.4 Threat Engine Integration

Threat generation remains deterministic. In co-op modes, threat scaling is adjusted based on party size to maintain challenge and avoid trivialization.

Threat scaling rules:

- Increased email volume proportional to party size.
- Higher probability of multi-vector threats that require coordination.
- Incident response tasks split across roles.

Threat tiers and breach mechanics remain aligned with DD-05. Co-op does not introduce new threat types without narrative justification.

### 9.5 Competitive Mode Integration

Competitive modes (Red vs. Blue, Asymmetric Assault, and Purple Team) use specialized variants of the day cycle, structured into short rounds. The Blue team operates a compressed triage loop, while the Red team crafts or selects adversarial actions. Asymmetric Assault adds asymmetric objectives and tooling, while Purple Team introduces a simulate/defend/post-mortem cadence.

Key constraints:

- Red team actions are chosen from a curated toolset rather than freeform hacking. This preserves realism and reduces abuse.
- Blue team uses the standard email triage and incident response mechanics, but with time-limited rounds.
- Both teams share the same deterministic seed to ensure fair generation of scenarios.
- Asymmetric Assault and Purple Team variants reuse the same deterministic content pool with mode-specific scoring and debrief rules.

### 9.6 Asynchronous Challenge Integration

Async challenges are implemented as single-day or short scenario sessions generated from deterministic templates. Each participant receives the same scenario, but decisions are scored and compared.

Async challenges are ideal for enterprise training events, as they allow departments to compete without coordinating schedules.

---

## 10. Progression, Rewards, and Economy Alignment

Multiplayer and social systems must reinforce engagement without undermining learning outcomes or introducing pay-to-win dynamics. Per BRD FR-CON-001 and FR-CON-002, the core game is playable without payment with no pay-to-win mechanics. The three in-game currencies defined in BRD Section 11.4 apply to multiplayer contexts as follows:

- **Credits (CR):** Operational revenue earned through client contracts and threat detection. In co-op, Credits are shared across the session and allocated jointly. In competitive modes, Credits are not a factor.
- **Trust Score (TS):** Reputation gate (0-500+) that unlocks client tiers, contracts, and narrative content. Cannot be purchased. In co-op, Trust Score is shared and affected by joint decisions.
- **Intel Fragments (IF):** Investigation reward earned through attack analysis and incident investigation. In co-op, Intel Fragments are earned jointly and can be distributed or pooled based on guild/corporation policy.

### 10.1 Social Progression

Progression signals displayed in social contexts include:

- Player level (per BRD Section 11.4: 30 levels from Intern to CISO, with prestige levels 31-50 granting cosmetic rewards).
- Facility tier (per BRD Section 11.4: Outpost, Station, Vault, Fortress, Citadel).
- Season rank (competitive).
- Skill rating tier (hidden or visible depending on mode).
- Achievement badges (visible and hidden per BRD FR-CON-010).
- Guild rank and contributions.

These are cosmetic and reputational. No social progression unlocks gameplay advantages in ways that would bias outcomes. Multiplayer activities contribute XP toward the player's level progression, with security-correct actions weighted more heavily per the BRD's player progression design.

### 10.2 Reward Structure

Rewards are designed to emphasize learning and cooperation. Per BRD FR-CON-003, premium purchases are cosmetic-only (facility skins, terminal themes, profile insignia). Per BRD FR-CON-004, a Season Pass system with free and premium reward tracks provides seasonal rewards; multiplayer achievements and competitive milestones contribute progress to both free and premium reward tracks.

Reward categories:

- Cosmetic items tied to themes or factions (per BRD FR-CON-003: facility skins, terminal themes, profile insignia).
- Profile badges and banners.
- Narrative unlocks and lore entries.
- Seasonal guild trophies.
- Season Pass progress from multiplayer milestones (per BRD FR-CON-004).

Any rewards with gameplay impact are limited to single-player or training contexts and are never allowed in ranked competitive play.

### 10.3 Enterprise Alignment

Enterprise environments can restrict or disable cosmetic rewards, but still benefit from social systems that encourage friendly competition and higher training completion rates. Enterprise-specific rewards are aligned with completion certificates and compliance reporting.

---

## 11. Matchmaking, Ranking, and Fairness

### 11.1 Skill Rating Model

The skill rating model is derived from performance metrics such as phishing detection accuracy, incident response effectiveness, and decision quality. It is a composite rating using an Elo-based system per BRD FR-MP-008, tuned for multiple competencies.

Per BRD FR-MP-008, competitive play maintains **independent Red and Blue ranks**. A player's Red rank reflects attack simulation performance, and their Blue rank reflects defensive performance. Cooperative play contributes to a separate cooperative skill rating. All three ratings (Red, Blue, cooperative) are updated independently after each relevant session.

The model emphasizes consistency and learning progress rather than pure speed. It is updated after each multiplayer session and can be reset at season boundaries.

### 11.2 Matchmaking Rules

Matchmaking prioritizes fairness, low latency, and social preferences.

Rules:

- Parties are matched against parties of similar size and rating.
- Players with low reputation are matched together to protect others.
- Region and latency are considered before rating differences.
- Cross-platform play is allowed but can be disabled by the player or enterprise policy.

### 11.3 Ranked Play

Ranked play is only available to accounts that meet minimum training milestones to reduce smurfing and unprepared players. Ranked ladders are seasonal and include promotion and demotion thresholds.

Ranked outcomes are deterministic given the shared scenario seeds, which allows post-match review and auditing.

### 11.4 Anti-Exploitation Controls

The system includes safeguards against win-trading, smurfing, and intentional losses.

Controls include:

- Abnormal performance detection.
- Repeated matches against the same opponent are limited.
- Session review tools for moderators.
- Optional identity verification for ranked play in certain regions.

---

## 12. Technical Architecture and Data Model

This section defines the multiplayer and social services required to implement the system while remaining aligned with the backend architecture in DD-09.

### 12.1 Service Components

The multiplayer system is implemented as modules within the modular monolith, with clear boundaries for future extraction.

Key modules:

- **Presence Service:** Tracks player online status and activity state.
- **Party Service:** Manages party lifecycle, invites, and readiness.
- **Matchmaking Service:** Pairs players or parties into sessions.
- **Co-op Session Service:** Orchestrates shared sessions and role assignment.
- **Competitive Service:** Manages ranked matches and ladders.
- **Leaderboard Service:** Aggregates scores across various scopes.
- **Guild Service:** Manages guild creation, membership, and events.
- **Corporation Service:** Enterprise-only extension for org-mapped groups, shared treasury, infrastructure pools (including shared SIEM dashboard and joint honeypot network per FR-MP-013), shared intelligence feeds, joint defense operations, and alliance formation (per FR-MP-012).
- **Forum Service:** Provides in-game community forums with moderation workflows.
- **Chat Service:** Provides limited, moderated messaging channels.

### 12.2 Real-Time Transport

Real-time session updates are delivered via WebSocket. Per BRD Section 7.1, WebSocket message delivery must be under 50ms (P95). The transport layer supports:

- Reliable message delivery with sequence numbers.
- Server authoritative state broadcasts.
- Rate limiting at the connection level.

When WebSocket is unavailable, SSE (Server-Sent Events) serves as the fallback for corporate proxy environments, per BRD Section 8.6.

### 12.3 Event Sourcing and Determinism

All multiplayer actions are represented as events in the same stream used for single-player sessions. Events include actor attribution and role context.

Example event schema:

- type: EMAIL_DECISION
- sessionId
- actorId
- role
- payload
- timestamp
- seq

The game state reducer applies events in order. Per BRD Section 8.5, state snapshots are materialized every 50 events or at day boundaries; in multiplayer sessions with higher event volume from multiple players, snapshot frequency may be increased to maintain recovery performance. This ensures that replay and audit are consistent, and that enterprise reporting can trace exactly who made each decision.

### 12.4 Data Model Overview

The following are canonical data entities. The exact schema is defined in the backend implementation, but these entities must exist.

- `player_profile`
- `social_relationship`
- `presence`
- `party`
- `party_member`
- `matchmaking_ticket`
- `coop_session`
- `coop_role_assignment`
- `competitive_match`
- `leaderboard_entry`
- `guild`
- `guild_member`
- `guild_event`
- `corporation`
- `corporation_member`
- `corporation_treasury`
- `forum_category`
- `forum_thread`
- `forum_post`
- `chat_channel`
- `chat_message`
- `moderation_report`

All entities include tenantId for isolation and auditing where relevant.

### 12.5 Caching and Performance

Presence and matchmaking are latency sensitive. Per BRD Section 7.1, game state update latency must be under 100ms (P95) and WebSocket message delivery must be under 50ms (P95); these targets apply to all multiplayer state synchronization. Redis is used for:

- Presence state.
- Matchmaking queues.
- Party invite tokens.
- Leaderboard caching.

Persistent storage remains in PostgreSQL with analytic aggregation in ClickHouse or TimescaleDB for leaderboards and performance metrics.

### 12.6 Security and Validation

All incoming actions are validated against role permissions, session state, and anti-cheat rules. The server rejects any client action that is not valid for the current phase.

Rate limits are enforced at the API gateway and at the WebSocket message level to prevent spam or denial of service.

---

### 12.7 Co-op State Synchronization

Cooperative sessions rely on a synchronized shared state that is updated through event sourcing. The system uses a lock-free optimistic concurrency model, where each action includes the latest known sequence number. The server validates sequence numbers to prevent conflicting edits and to ensure deterministic order.

Synchronization rules:

- The server is authoritative for session state.
- Clients submit intent actions, not state deltas.
- Each accepted action increments the session sequence number.
- Clients reconcile to the server’s latest snapshot when out of sync.
- The server may reject actions if they are based on stale state, returning a resync instruction.

This model keeps the interaction responsive while maintaining determinism.

### 12.8 Role Permission Matrix

Role-based permissions are a core component of co-op sessions. The matrix defines which actions are available to each role during each phase.

Example permissions (using BRD FR-MP-002 role names):

- **Intake Analyst (SOC Tier 1):** view inbox, mark indicators, propose decisions, request verification.
- **Crypto Warden (PKI):** view verification packets, mark inconsistencies, propose decisions.
- **Comms Officer (Incident Commander):** execute incident response actions, allocate emergency resources.
- **Systems Keeper (SysAdmin):** manage upgrades, allocate power and capacity.
- **Threat Hunter (SOC Tier 2/3):** interpret intelligence briefs, recommend threat posture changes.
- **Perimeter Warden (Network Security):** monitor external boundaries, flag network-level anomalies.
- **Compliance Auditor (secondary function):** view logs, annotate decisions for audit purposes. This function is distributed across roles or assigned as an observer seat.
- **Authority Role:** finalize decisions and approve end-of-day transitions.

Permissions are enforced server-side and reflected in the UI, aligning with DD-07’s interface rules.

### 12.9 Matchmaking Algorithms

Matchmaking balances three objectives.

- Fairness: similar skill ratings within a configurable range.
- Latency: regional proximity and network conditions.
- Social preference: party members play together, guilds can queue as a group.

The algorithm operates in two stages. Stage one creates candidate pools based on region and mode. Stage two applies rating bounds that widen over time to avoid excessive queue time. Competitive ranked play uses stricter bounds; casual co-op uses looser bounds.

### 12.10 Leaderboard Pipeline

Leaderboards are computed from validated session summaries. The computation pipeline is as follows.

1. Session ends, server computes session summary metrics.
2. Summary is written to PostgreSQL and emitted to analytics pipeline.
3. Aggregator jobs compute leaderboard scores per scope and write to ClickHouse or TimescaleDB.
4. Leaderboard service caches the top N entries in Redis sorted sets (using ZADD/ZRANGE per BRD Section 8.5) for low-latency ranked queries.

This pipeline ensures that leaderboards are resistant to manipulation and are recalculated based on authoritative data.

### 12.11 Guild Events and Scheduling

Guild events allow organized play and seasonal competitions.

Event types:

- Scheduled co-op sessions.
- Guild vs guild async challenges.
- Seasonal contribution targets.

Guild event scheduling integrates with calendar exports, but exports are optional and enterprise tenants can disable them.

### 12.12 Analytics Integration

Multiplayer sessions emit the same analytics events as single-player sessions, with additional metadata.

Additional metadata includes:

- partyId
- coopRole
- opponentTeamId (competitive mode)
- reputationDelta
- endorsementVotes

This data is critical for evaluating how multiplayer affects training outcomes and retention metrics.

### 12.13 Data Retention and Deletion

Social systems collect additional personal data. Retention policies align with privacy requirements.

Retention rules:

- Chat messages are retained for 30 days by default and can be configured per tenant.
- Forum posts and threads are retained for 180 days by default and can be configured per tenant.
- Moderation reports are retained for 24 months.
- Presence data is ephemeral and not stored long-term.
- Leaderboard data is retained for the season duration plus one archival period.

All retention periods are configurable to meet GDPR and enterprise requirements.

---

## 13. Enterprise, Compliance, and Tenant Controls

The multiplayer and social system must operate in both consumer and enterprise contexts. Enterprise customers require strict controls to ensure compliance and minimize risk.

### 13.1 Tenant Isolation

All multiplayer sessions are tagged with tenantId. Cross-tenant interactions are prohibited by default. Enterprise tenants may optionally enable cross-tenant competition for partner organizations, but only via explicit allowlists.

### 13.2 Feature Flags

Enterprise administrators can enable or disable the following features:

- Friend system
- Presence
- Party system
- Chat
- Guilds
- Corporations (enterprise org-mapped groups)
- Community forums
- Leaderboards
- Ranked competitive play
- Competitive variants (Asymmetric Assault, Purple Team)
- External visibility of achievements

Defaults are conservative. For regulated customers, only internal leaderboards and co-op missions are enabled by default.

### 13.3 Audit and Reporting

Every multiplayer action is logged in the same event stream used for training reporting. This ensures that compliance teams can trace decisions to individuals. Audit logs include role context, decision proposals, and final approvals.

### 13.4 Data Residency

Enterprise tenants may require region-specific hosting. Multiplayer services must respect the data residency configuration. Cross-region matchmaking is disabled for tenants with strict residency settings.

### 13.5 Corporation Controls

Enterprise tenants can configure corporation behavior to align with org policies.

Controls include:

- Auto-provisioning rules tied to HRIS/SCIM org units.
- Treasury approval workflows and spending thresholds.
- Shared infrastructure visibility and audit logging.
- Corporation-level privacy defaults for profiles and forums.

### 13.6 Consent and Privacy

Players within enterprise tenants are subject to employer-managed consent policies. The system must support a default mode where profiles are anonymous within the tenant and no personal identifiers are shown.

---

## 14. Safety, Moderation, and Trust Systems

Multiplayer features introduce risks of toxicity, harassment, and misuse. The system is designed to minimize these risks by default.

### 14.1 Communication Safety

- Default communication uses quick signals and pre-defined phrases.
- Text chat is opt-in and restricted to friends or guilds.
- Forums use structured tags, rate limits, and read-only announcements to reduce abuse.
- Global chat channels are not provided in default builds.

### 14.2 Moderation Pipeline

Moderation combines automated detection and human review.

Pipeline steps:

1. Automated filtering for profanity and slurs.
2. Rate limiting and spam detection.
3. User reporting system with evidence attachments.
4. Moderator review and enforcement actions.

Moderation actions include warnings, temporary mutes, thread locks, content removal, and account restrictions.

### 14.3 Reputation Impact

Player reputation is impacted by verified reports and abandoned sessions. Reputation is decayed over time to allow rehabilitation. Severe violations can disable access to ranked play or social features.

### 14.4 Enterprise-Specific Controls

Enterprise tenants can disable public profiles and enforce real-name policies or anonymization. Moderation can be delegated to tenant administrators for internal-only social features.

---

## 15. Accessibility and UX Integration

Multiplayer systems must respect the game’s accessibility requirements and UI aesthetic.

### 15.1 Accessibility Requirements

Per BRD Section 7.5, all multiplayer features must comply with WCAG 2.1 Level AA as baseline, Section 508 for US government market access, and EN 301 549 for EU market compliance. Specific multiplayer accessibility requirements include:

- No mandatory real-time actions without pause.
- All multiplayer modes support adjustable time pressure.
- No forced time limits on individual decisions (queue pressure, not per-item timers) per BRD Section 7.5.
- Chat and quick signals are available in text-only and screen-reader friendly formats with ARIA roles and live regions.
- Color cues have text equivalents to support color-blind players, using the BRD's color-blind safe palette with secondary encoding (text labels, icons, patterns).
- All CRT aesthetic effects in multiplayer UI are disableable without losing functionality per BRD Section 7.5.
- `prefers-reduced-motion` respected for all multiplayer animations.

### 15.2 UI Integration

The terminal aesthetic in DD-07 applies. Multiplayer UI elements are framed as operational tools.

Examples:

- Parties are “shift teams.”
- Guilds are “network alliances.”
- Leaderboards are “operator performance indices.”
- Forums are “operator bulletin boards.”

This preserves immersion and reduces the feeling of gamification for enterprise players.

---

## 16. Telemetry, KPIs, and Learning Outcomes

Multiplayer impacts key product metrics. The system must track and report on these effects.

### 16.1 Core Metrics

- Co-op participation rate.
- Session completion rate in co-op vs solo.
- Decision accuracy in co-op vs solo.
- Incident response success rate in co-op vs solo.
- Chat toxicity rate and moderation actions.
- Forum participation rate and moderation actions.
- Retention uplift attributed to social features.

### 16.2 Learning Outcomes

Multiplayer is expected to improve certain competencies.

Hypotheses:

- Co-op increases verification diligence because players are observed by peers.
- Competitive play improves rapid detection of phishing indicators.
- Guild-based challenges increase regular training cadence.

These hypotheses are tested via A/B experiments and reported in enterprise analytics.

---

## 17. Testing, Validation, and Live Operations

### 17.1 Testing Strategy

Testing includes:

- Unit tests for permission enforcement and matchmaking.
- Integration tests for co-op session synchronization.
- Load testing for presence and real-time updates.
- Security testing for abuse vectors and chat input.

### 17.2 Live Operations

Live ops includes seasonal resets, leaderboard rotations, and event scheduling. Per BRD FR-CON-005, the game follows a seasonal episodic structure of 4 seasons per year, each with 11 chapters over 12 weeks. Competitive ranked seasons, guild seasonal goals, and tournament cycles align with this 12-week cadence. The system must support graceful rollback if a season configuration is misapplied.

### 17.3 Incident Response

Multiplayer services are critical. Incident response playbooks must include degraded mode operation, where multiplayer features are disabled but core single-player gameplay remains operational.

---

## 18. Phased Delivery Plan

### Phase 3 (Months 6-12, aligned with BRD Consumer Launch phase)

Multiplayer and social deliverables within Phase 3 are concentrated in the Months 9-12 window, but the phase boundary aligns with the BRD's Phase 3 definition of Months 6-12.

- Player profiles and minimal presence (Months 9-10).
- Friend system and party invites (Months 9-10).
- Leaderboards and achievements (Months 9-10).
- Community forums -- consumer social deliverable (Months 10-11).
- Two-player cooperative missions (Months 10-11).
- Basic guild system (consumer) and initial enterprise corporation mapping -- org sync only (Months 10-11).
- Department-based team competitions and basic enterprise leaderboards (Months 10-11, per BRD FR-MP-015, FR-MP-016).
- Red vs. Blue competitive mode -- initial unranked or limited ladder (Months 11-12).
- Basic spectator mode and streamer tools for Twitch and YouTube integration per BRD FR-CON-011 (Months 11-12).

### Phase 4 (Months 12-18, aligned with BRD Scale & Expand phase)

Multiplayer and social deliverables within Phase 4 are concentrated in the Months 14-15 window for core features, with extended features through Month 18. The phase boundary aligns with the BRD's Phase 4 definition of Months 12-18.

- Six-player cooperative operations with specialized roles (Months 14-15).
- Ranked Red vs. Blue mode -- full ladder, anti-cheat, seasonal tiers, independent Red/Blue ranks (Months 14-15).
- Competitive variants: Asymmetric Assault (1 vs. 3-5) and Purple Team (Months 14-15).
- Asynchronous competitive events (Months 14-15).
- Advanced guild features and seasonal competitions (Months 14-15).
- Full enterprise corporation features -- shared treasury, shared SIEM dashboard, joint honeypot network, infrastructure pools, approval workflows, alliance formation (Months 14-16).
- Capture-the-flag events, hackathon events, and cross-organization anonymized benchmarking (Months 15-17, per BRD FR-MP-017, FR-MP-018).
- UGC social integration: scenario editor community features, Steam Workshop integration, and community marketplace discovery (Months 16-17, per BRD FR-CON-012 to FR-CON-014).
- Seasonal tournament infrastructure (Months 16-18).

---

## 19. Open Questions and Decision Log

Open questions:

- What is the minimum viable communication system for co-op without adding toxicity risk.
- Whether ranked play should be available in enterprise contexts or remain consumer-only.
- How to balance co-op rewards so that solo play remains viable.
- How community forum moderation is staffed for consumer vs enterprise tenants.

Decision log:

- Multiplayer will be server authoritative and event sourced.
- Text chat is opt-in and restricted by default.
- Co-op roles are enforced server-side and cannot be overridden by clients.
- Seasonal reset cadence aligns with BRD FR-CON-005: 4 seasons per year, each 12 weeks with 11 chapters. Competitive ranked seasons, guild seasonal goals, and tournament cycles follow this 12-week cadence.

---

## 20. Appendices

### Appendix A: Co-op Session Flow

```
Party Created
  -> Role Selection
  -> Session Seed Generated
  -> Shared Day Cycle
  -> Role Actions + Authority Confirmation
  -> Incident Response
  -> Day Summary
  -> Session End
```

### Appendix B: Competitive Match Flow

```
Matchmaking Ticket
  -> Team Assignment
  -> Scenario Seed
  -> Round 1 (Blue Triage / Red Actions)
  -> Round 2 (Team Swap: Red becomes Blue, Blue becomes Red per BRD FR-MP-005)
  -> Final Score
  -> Rank Update
```

### Appendix C: Sample Role Action Mapping

| Phase        | Intake Analyst (SOC T1) | Crypto Warden (PKI) | Comms Officer (IC) | Authority |
| ------------ | ----------------------- | ------------------- | ------------------ | --------- |
| Inbox        | Review, tag             | --                  | --                 | --        |
| Verification | --                      | Review packets      | --                 | --        |
| Decision     | Propose                 | Propose             | --                 | Finalize  |
| Incident     | --                      | --                  | Respond            | Approve   |
| Resources    | --                      | --                  | --                 | Finalize  |

This table is illustrative. Actual role permissions are defined in the permission matrix.

### Appendix D: Privacy Defaults

- Profiles visible to friends only.
- Chat restricted to parties and guilds.
- Cross-tenant visibility disabled by default.

---

## Addendum A: Detailed Multiplayer Mode Specifications

This addendum provides deeper specifications for each multiplayer mode. It is intended to remove ambiguity for engineering and content teams and to ensure that each mode reinforces the cybersecurity learning objectives specified in the BRD.

### A.1 Two-Player Cooperative Missions

Two-player co-op is the foundational multiplayer mode. It is designed to be approachable, short-session friendly, and compatible with both consumer and enterprise contexts. A two-player co-op session is a modified day cycle with explicit role division and a shared accountability model.

**Primary objectives**

- Reinforce verification discipline by requiring two-person collaboration.
- Increase retention through social bonding and peer accountability.
- Preserve determinism and auditability for training reporting.

**Role model**

Two-player co-op uses two primary roles by default. Optional role variants can be introduced for specific scenarios, but the default roles are stable to reduce cognitive load.

- **Triage Lead:** Focuses on inbox review, indicator tagging, and initial decision proposals.
- **Verification Lead:** Focuses on verification packet review, cross-reference checks, and final decision validation.

The Authority Token rotates daily between players. The Authority holder is responsible for finalizing decisions and advancing the day. Rotation ensures balanced learning outcomes and prevents one player from dominating.

**Shared decision flow**

- The Triage Lead marks indicators and proposes a decision.
- The Verification Lead reviews packets and flags inconsistencies.
- The Authority holder confirms or overrides the proposal.
- The decision event is appended to the session event stream with role attribution.

If disagreement occurs, the Authority holder must select a final decision. Disagreement is recorded as a “decision conflict” event for analytics. The UI provides a lightweight prompt that captures the reason for disagreement using structured tags, such as “insufficient verification” or “risk tolerance.”

**Difficulty tiers**

Per BRD FR-MP-004, co-op missions support four difficulty tiers: Training, Standard, Hardened, and Nightmare. Training is recommended for onboarding and enterprise introductory sessions. Nightmare is available only after completing at least one Standard or Hardened session.

**Session composition**

Two-player co-op sessions are built from a curated scenario pack. Composition scales with difficulty tier. At Standard difficulty, a session includes:

- 10 to 14 emails per day.
- A minimum of 40 percent legitimate requests.
- One mid-tier incident response scenario every two days.
- One faction-specific narrative element per day.

Training tier reduces volume and threat sophistication. Hardened and Nightmare tiers increase volume, reduce the proportion of legitimate requests, and introduce multi-vector threats. This composition ensures that the learning goals remain intact and that co-op does not devolve into constant adversarial play.

**Scoring model**

The co-op score is shared and emphasizes collaboration. The score formula includes:

- Decision accuracy.
- Verification diligence, measured by whether verification packets were requested when necessary.
- Incident response effectiveness.
- Agreement efficiency, measured by number of conflicts resolved.
- Resource management efficiency.

The score does not include raw speed metrics beyond a cap threshold. This prevents players from encouraging reckless quick decisions.

**Failure states and recovery**

Failure states in co-op follow the same breach and resource collapse rules as single-player. Co-op adds a recovery option where a player can initiate a “peer assist” that temporarily reduces penalties in exchange for a shared cost. This mechanic mirrors real-world incident response collaboration.

### A.2 Six-Player Cooperative Operations

Six-player co-op is the flagship collaborative mode introduced in Phase 4. It is intended to resemble an operational SOC and to provide a deep cooperative experience for advanced players and enterprise teams. Six-player sessions use the same named scenario types defined in BRD FR-MP-003 (Cascade Failure, Bandwidth Siege, The Insider, Data Exodus) at higher complexity tiers, plus additional scenarios authored for the larger team format. All four BRD difficulty tiers (Training, Standard, Hardened, Nightmare per FR-MP-004) are supported.

**Role set**

Six-player co-op uses fixed roles with specialized capabilities, named per BRD FR-MP-002 to map to real SOC functions with narrative-appropriate titles. Each role has a reduced interface, limiting cognitive overload and encouraging specialization.

- **Intake Analyst (SOC Tier 1):** Handles inbox scanning, indicator tagging, and initial risk scoring.
- **Crypto Warden (PKI):** Reviews verification packets and external evidence, manages certificate integrity.
- **Comms Officer (Incident Commander):** Manages active incidents, response actions, and cross-role coordination.
- **Threat Hunter (SOC Tier 2/3):** Interprets intelligence briefs and adjusts threat posture recommendations.
- **Systems Keeper (SysAdmin):** Allocates resources and manages upgrades.
- **Perimeter Warden (Network Security):** Monitors external boundaries, access points, and network-level threat indicators.

The Compliance Auditor function (observing decisions, annotating risk acceptance, managing audit trails) is distributed as a secondary responsibility across roles, or can be assigned as a dedicated seventh observer seat in enterprise training configurations.

**Authority and governance**

Six-player co-op uses a governance model with two authority tokens.

- The **Operational Authority** can finalize day cycle transitions and approve resource allocations.
- The **Security Authority** can finalize access decisions and incident responses.

Authority tokens are assigned at session creation but can be rotated daily. This mirrors real-world organizations where multiple authorities exist for different categories of decision-making.

**Phase mapping**

Each phase of the day cycle has assigned responsibility. The system enforces that only the role with responsibility can initiate actions, but other roles can submit annotations or recommendations. This is important for minimizing chaos in large groups.

**Coordination tooling**

Six-player co-op includes a structured coordination board. The board is not a freeform chat log but a task list with statuses and ownership fields. Roles can create tasks such as “verify sovereign compact credentials” or “review suspicious attachment.” This board replaces the need for intense freeform chat while preserving collaboration.

**Incident response escalation**

Large co-op sessions include multi-stage incidents that require sequential actions from different roles. For example, the Comms Officer (Incident Commander) may start a containment action, the Systems Keeper (SysAdmin) may allocate emergency power, and the designated audit observer may log the event. This encourages cross-role awareness and simulates realistic incident response workflows.

### A.3 Red vs. Blue Competitive Mode (Classic Mode per BRD FR-MP-005)

The Classic Red vs. Blue mode is a structured competitive simulation with team-swapping rounds per BRD FR-MP-005. It is not intended to teach offensive hacking techniques; instead it teaches defenders to recognize adversarial patterns and teaches adversaries to understand detection logic.

**Red team model**

Red team players select adversarial actions from a curated action deck. Per BRD FR-MP-009, the Red team tooling consists of abstracted equivalents of real-world offensive tools:

- **Network Scanner (Nmap equivalent):** Probe defender infrastructure for open services and misconfigurations.
- **Exploitation Framework (Metasploit equivalent):** Select and deploy exploits against identified vulnerabilities.
- **Social Engineering Toolkit (SET equivalent):** Craft spoofed emails with specific tactics and pretexting.
- **Adversary Simulation (Cobalt Strike equivalent):** Coordinate multi-stage attack campaigns with persistence and lateral movement.

Additional actions include launching timed incidents such as ransomware or denial-of-service attacks and planting misleading verification packets. The action deck is generated from templates that align with the BRD's threat landscape. This ensures realism while preventing misuse.

**Blue team model**

Blue team players operate a compressed triage loop with a fixed number of emails and incidents per round. Per BRD FR-MP-010, the Blue team tooling consists of abstracted equivalents of real-world defensive tools:

- **SIEM (log correlation and alert triage).**
- **EDR (endpoint detection and behavioral analysis).**
- **Sandboxing (attachment and URL detonation).**
- **Forensics (evidence collection and analysis).**
- **Honeypots (deception-based detection).**

The Blue team score is derived from accuracy, response time within thresholds, and incident containment.

**Ranking model**

Per BRD FR-MP-008, ranked play uses Elo-based matchmaking with **independent Red and Blue ranks**. Players maintain separate skill ratings for their attack and defense performance, and matchmaking considers the relevant rank for the assigned side each round.

**Match structure**

- Two rounds of 10 to 12 minutes each.
- Teams swap sides between rounds (Red becomes Blue and vice versa) per BRD FR-MP-005 team-swapping rounds, ensuring both teams are evaluated on attack and defense.
- A combined score determines the winner.

**Learning objectives**

- Blue team practices rapid detection under pressure.
- Red team learns how defenders interpret signals, reinforcing defensive thinking.

**Rollout timing**

- Phase 3 delivers an initial unranked or limited-ladder version for consumer launch readiness.
- Phase 4 introduces full ranked ladders, seasonal tiers, and enterprise-ready governance controls.

### A.4 Asymmetric Assault Mode

Asymmetric Assault is a competitive variant per BRD FR-MP-006 that emphasizes attacker/defender imbalance while staying within safe, defensive-learning boundaries. The canonical player configuration is **1 skilled attacker vs. 3-5 defenders**. The mode is designed to expose defenders to asymmetric pressure rather than to teach offensive exploitation.

**Mode structure**

- **1 attacker ("Assault" role)** selects objectives such as data extraction or operational disruption. The solo attacker has access to the full Red team action deck (abstracted Nmap, Metasploit, SET, and Cobalt Strike equivalents per FR-MP-009).
- **3-5 defenders ("Defense" team)** use enhanced monitoring tools (abstracted SIEM, EDR, sandboxing, forensics, and honeypots per FR-MP-010) and must detect and contain attacks. Defenders divide roles according to the co-op role system (subset of the six-player role set).
- Scenario outcomes are determined by detection timing and containment effectiveness, not destructive impact.

**Learning objectives**

- Improve recognition of weak signals under asymmetric pressure.
- Reinforce the value of layered defenses and early detection.

**Rollout timing**

- Targeted for Phase 4 as part of the full competitive suite.
- Optional limited beta during late Phase 3 if scenario authoring capacity permits.

### A.5 Purple Team Hybrid Mode

Purple Team is a hybrid cooperative-competitive mode where players alternate between attacker simulation and defender refinement. The mode concludes with a structured post-mortem that feeds into player skill profiles and enterprise reports.

**Mode structure**

- Round 1: one team simulates adversarial tactics using a curated action deck.
- Round 2: the opposing team defends and logs detections.
- Round 3: joint post-mortem where both teams identify improvements.

**Learning objectives**

- Encourage cross-role empathy and shared language between offense and defense.
- Convert competitive insights into defensive best practices.

**Rollout timing**

- Targeted for Phase 4 with enterprise-friendly defaults and optional consumer variant.

### A.6 Asynchronous Competitive Challenges

Async challenges are essential for global accessibility and enterprise deployments. They allow players to compete without real-time coordination and are ideal for scheduled training events.

**Challenge types**

- Phishing triage sprint.
- Verification forensics puzzle.
- Incident response decision tree.

Each challenge is based on a deterministic seed and uses a standard scoring rubric so results are comparable. The system provides a post-challenge debrief that explains correct decisions, reinforcing learning.

---

## Addendum B: Social Systems Deep Dive

### B.1 Identity and Display Names

Identity must balance personalization with privacy. The default display name is user-selected, but the system discourages real names in consumer contexts. Enterprise tenants can enforce real name policy or pseudonymization.

Display name rules:

- Unique within a tenant.
- Length between 3 and 20 characters.
- Moderated for inappropriate content.

### B.2 Avatar System

Avatars are cosmetic. They can be selected from pre-approved assets or from a curated marketplace. User-uploaded avatars are not supported in early phases to reduce moderation complexity. Enterprise tenants can disable avatars or restrict them to corporate-approved options.

### B.3 Friend Invites

Friend invites use short-lived tokens. Invites can be sent by username, by friend code, or by platform link.

Invite state machine:

- Sent
- Accepted
- Declined
- Expired

All invite actions are logged for moderation and abuse analysis.

### B.4 Presence and Status Privacy

Presence is a core social signal but can also reveal activity patterns. The system supports privacy modes:

- Visible to friends.
- Visible to guild.
- Invisible.

Presence data is ephemeral and not used for analytics beyond concurrency statistics.

### B.5 Social Graph Limits

To protect performance and prevent spam, the social graph is limited.

- Maximum friends: 500.
- Maximum blocked users: 1000.
- Rate limits on outgoing invites.

These limits can be adjusted in enterprise contexts.

### B.6 Endorsements and Commendations

Players can endorse teammates after a co-op session. Endorsements include structured tags such as “careful verifier,” “clear communicator,” or “steady incident commander.” This avoids freeform text while still providing recognition.

Endorsements contribute to reputation but decay over time. This encourages consistent positive behavior rather than one-time performance.

### B.7 Community Forums Behavior

Forum participation is designed to promote constructive learning rather than idle chatter. Posts are categorized by topic tags, and high-quality posts can be elevated by moderators into “official guidance” threads. The system discourages doxxing or sharing real personal data through automatic detection and firm enforcement.

---

## Addendum C: Ranking and Matchmaking Details

### C.1 Skill Rating Components

Skill rating is computed from multiple competency categories. Each category is normalized to a 0 to 100 scale.

Categories:

- Phishing detection accuracy.
- Verification discipline.
- Incident response effectiveness.
- Resource allocation efficiency.
- Decision consistency under pressure.

The composite rating is a weighted sum. Weights are configurable and can be tuned per season. The system avoids a single-score bias that might over-reward one behavior, such as aggressive denial.

### C.2 Rating Update Model

The rating update is similar to Elo, with adjustments for multi-competency scoring. The update formula is expressed as:

`new_rating = old_rating + K * (performance - expected)`

Where performance is derived from session metrics and expected is computed from opponent ratings or scenario difficulty. K is season-specific and may be lower for experienced players to reduce volatility.

### C.3 Placement Matches

New players complete a small number of placement matches before receiving a visible rank. Placement uses baseline scenarios to evaluate fundamental skills without exposing players to advanced tactics.

### C.4 Rank Tiers

Rank tiers provide a psychological progression. Tier names follow the game’s narrative and avoid generic esports labeling.

Example tiers:

- Gatekeeper
- Archivist
- Sentinel
- Warden
- Overseer

Tiers are cosmetic; only the underlying rating drives matchmaking.

### C.5 Party and Guild Queue Rules

Queue rules ensure fairness in group play.

Rules:

- Parties are matched against parties of the same size.
- Mixed-skill parties are matched using average and maximum rating to prevent boosting.
- Guild queues are available only for unranked or event modes unless specifically configured.

---

## Addendum D: Anti-Abuse and Integrity Controls

### D.1 Anti-Cheat Philosophy

The game’s primary risk is not classic cheating but data manipulation or collusion. The design focuses on server validation, deterministic replay, and anomaly detection.

### D.2 Server Validation

Every action is validated against:

- Current session phase.
- Role permissions.
- Rate limits.
- Scenario constraints.

Invalid actions are rejected and logged. Repeat violations flag the account for review.

### D.3 Collusion and Win-Trading Detection

Competitive modes include detection for unusual win patterns.

Signals include:

- Repeated matches against the same opponent in short intervals.
- Abnormally fast decision times correlated with perfect accuracy.
- Sudden rating gains followed by suspicious inactivity.

These signals trigger manual review or automated penalties.

### D.4 Session Integrity and Replay

All sessions are stored with event logs, enabling deterministic replay for moderators. This is critical for resolving disputes in ranked play and for enterprise audit requirements.

### D.5 Abuse of Communication

Communication abuse is mitigated with rate limits, pre-defined quick signals, and optional text chat. Automated moderation uses a layered approach with blocklists, pattern detection, and manual review. Enterprise tenants can override moderation policies for internal-only contexts.

---

## Addendum E: UX Interaction Details

### E.1 Co-op Decision UI

The co-op UI displays a split-pane view. The left pane shows the email or verification packet. The right pane shows role-specific controls and the shared decision queue. The Authority role has a distinct confirmation panel with clear indicators of who proposed each decision.

To reduce confusion, each decision in the queue displays:

- Proposal author and role.
- Supporting indicators or evidence tags.
- Current status: proposed, reviewed, finalized.

### E.2 Communication UI

Quick signals are displayed as subtle badges rather than chat bubbles to preserve the terminal aesthetic. Each signal has a short textual label so it remains accessible for screen readers.

Text chat, when enabled, appears in a separate tab with strict length limits and no rich media. This reduces moderation risk and keeps the interface clean.

### E.3 Guild UI

The guild interface is presented as a “Network Alliance Console.” It includes member roster, role permissions, seasonal contributions, and scheduled events. The console is informational rather than a social feed, maintaining the operational tone of the game.

Enterprise tenants see an extended “Corporation Console” view with treasury status, shared infrastructure allocations, and approval workflows.

### E.4 Community Forums UI

Forums are presented as “Operator Bulletin Boards.” The interface emphasizes readability and moderation controls over social feed mechanics. Threads display structured tags and a short “operational summary” line to keep discussions anchored to learning outcomes.

### E.5 Spectator and Streamer Support

Spectator mode is read-only and does not reveal hidden information in competitive matches. Streamer overlays can display decision queues, threat levels, and performance metrics without exposing sensitive player data. Per BRD FR-CON-011, streaming and content creation integration targets Twitch and YouTube specifically, including overlay widgets, viewer interaction hooks, and clip-friendly replay exports. Streamer tools are optional and can be disabled in enterprise tenants.

---

## Addendum F: Enterprise Use Cases

### F.1 Departmental Training Drills

Enterprise teams can schedule co-op missions as departmental drills. Employees are grouped into parties based on department or role, and a facilitator can observe sessions through a read-only dashboard. The system captures collaboration metrics for training assessment.

### F.2 Compliance Evidence Generation

Co-op sessions generate rich evidence for compliance frameworks. Audit logs capture who made decisions and how verification steps were performed. This supports frameworks that require demonstrable training effectiveness.

### F.3 Executive Tabletop Exercises

Six-player co-op sessions can be configured as tabletop simulations for executives. The Compliance Auditor function (distributed across roles or assigned as a dedicated observer seat) is used to capture decision rationale for board-level review.

### F.4 Internal Leaderboards and Recognition

Enterprise leaderboards can be used to recognize high-performing teams. Recognition is configured to avoid shaming and to focus on positive reinforcement. This aligns with HR and L&D best practices.

### F.5 Corporation Treasury and Shared Infrastructure

Enterprise corporations can run resource allocation drills where departments negotiate shared treasury spending for upgrades. Per BRD FR-MP-013, shared infrastructure includes a shared SIEM dashboard (aggregating alerts across departments) and a joint honeypot network (collectively maintained deception infrastructure). This produces evidence for governance processes and mirrors real budgeting trade-offs. Treasury actions are logged with approval chains for compliance review.

---

## Addendum G: Metrics and Experimentation

### G.1 Experiment Design

Multiplayer features are rolled out with controlled experiments to measure impact on retention and learning outcomes.

Experiment examples:

- Comparing solo-only cohorts with co-op-enabled cohorts.
- Measuring phishing detection improvement in teams vs individuals.
- Evaluating the effect of endorsements on repeat co-op participation.

### G.2 KPI Targets

The following targets are aligned with BRD objectives.

- Co-op adoption rate above 35 percent of active players within 3 months of launch.
- Co-op D7 retention uplift of at least 10 percentage points compared to solo.
- Reduction in false positive denial rates in co-op sessions by 15 percent compared to solo.
- Enterprise tenant satisfaction increase measured via training NPS.

---

## Addendum H: Detailed Data Entity Sketches

This section provides a more detailed view of core data entities. The data models below are conceptual and will be refined by engineering, but they describe required fields and relationships.

### H.1 player_profile

Fields:

- id
- tenantId
- displayName
- avatarId
- countryCode
- privacyMode
- reputationScore
- createdAt
- updatedAt

### H.2 social_relationship

Fields:

- id
- tenantId
- sourcePlayerId
- targetPlayerId
- relationshipType (friend, follow, block, mute)
- createdAt
- updatedAt

### H.3 party

Fields:

- id
- tenantId
- leaderPlayerId
- status (open, ready, in_session, closed)
- createdAt
- updatedAt

### H.4 party_member

Fields:

- id
- partyId
- playerId
- rolePreference
- readyState
- joinedAt

### H.5 coop_session

Fields:

- id
- tenantId
- seed
- status
- partyId
- authorityPlayerId
- createdAt
- completedAt

### H.6 coop_role_assignment

Fields:

- id
- coopSessionId
- playerId
- role
- assignedAt

### H.7 competitive_match

Fields:

- id
- tenantId
- matchType
- seed
- redTeamId
- blueTeamId
- outcome
- createdAt
- completedAt

### H.8 leaderboard_entry

Fields:

- id
- leaderboardId
- playerId
- score
- rank
- updatedAt

### H.9 guild

Fields:

- id
- tenantId
- name
- bannerId
- description
- createdAt

### H.10 guild_member

Fields:

- id
- guildId
- playerId
- role
- joinedAt

### H.11 chat_channel

Fields:

- id
- tenantId
- channelType (party, guild, direct)
- createdAt

### H.12 chat_message

Fields:

- id
- channelId
- senderPlayerId
- content
- createdAt
- moderationStatus

### H.13 corporation

Fields:

- id
- tenantId
- name
- orgUnitId
- treasuryBalance
- createdAt

### H.14 corporation_member

Fields:

- id
- corporationId
- playerId
- role
- orgUnitId
- joinedAt

### H.15 corporation_treasury

Fields:

- id
- corporationId
- budgetCycle
- allocated
- spent
- approvalsRequired
- updatedAt

### H.16 forum_category

Fields:

- id
- tenantId
- name
- isOfficial
- createdAt

### H.17 forum_thread

Fields:

- id
- categoryId
- authorPlayerId
- title
- tags
- isLocked
- createdAt

### H.18 forum_post

Fields:

- id
- threadId
- authorPlayerId
- content
- createdAt
- moderationStatus

---

## Addendum I: Example Co-op Day Walkthrough

This example illustrates a full co-op day cycle to ensure clarity across teams.

1. The party is formed and roles are assigned. Player A is Triage Lead, Player B is Verification Lead. Player A holds the Authority Token for Day 1.
2. DAY_START is initialized. An intelligence brief indicates increased risk from Nexion Industries.
3. INBOX_INTAKE loads 12 emails. Player A reviews the list and tags high urgency messages.
4. EMAIL_TRIAGE begins. Player A inspects Email 4, marks indicators of spoofed headers, and proposes a denial.
5. Player B enters VERIFICATION_REVIEW. The packet shows mismatched signatures. Player B flags the inconsistency.
6. Player A finalizes the denial. The decision event logs both players’ contributions.
7. CONSEQUENCE_APPLICATION updates trust score and funds. The denial avoids a breach but loses a moderate revenue opportunity.
8. THREAT_PROCESSING triggers a minor ransomware incident. Player B proposes a response.
9. INCIDENT_RESPONSE is executed by Player A as Authority. The team chooses containment and pays a small operational cost.
10. RESOURCE_MANAGEMENT allocates power to high priority clients. Player B suggests a cautious allocation; Player A approves.
11. DAY_END summary shows accuracy 92 percent, two conflicts resolved, and one commendation earned.
12. Authority Token rotates to Player B for Day 2.

This walkthrough demonstrates how collaboration is explicit and auditable while remaining within the single-player core loop structure.

---

## Addendum J: Alignment with Narrative Themes

Multiplayer features are framed within the narrative to avoid a dissonant “gamey” feel. Terminology and presentation are always grounded in the fiction of the post-collapse data center.

Narrative mappings:

- Friends are “trusted operators.”
- Parties are “shift teams.”
- Guilds are “network alliances.”
- Corporations are “federated divisions.”
- Competitive matches are “simulation exercises.”
- Leaderboards are “performance indices.”
- Community forums are “operator bulletin boards.”

This mapping is consistently applied across UI and documentation so that enterprise users and consumer players experience the same cohesive world.

---

## Addendum K: Risk Analysis for Multiplayer Systems

Multiplayer introduces additional risks beyond those noted in the BRD. These are documented here to ensure proper mitigation planning.

### K.1 Toxicity Risk

Risk: Social features can introduce harassment or negative interactions that damage retention.

Mitigation:

- Default communication limited to quick signals.
- Strong block and mute tools.
- Reputation-based matchmaking.

### K.2 Compliance Risk

Risk: Social data may violate privacy regulations if not controlled.

Mitigation:

- Tenant-level feature flags.
- Configurable retention periods.
- Data minimization and anonymization for enterprise deployments.

### K.3 Integrity Risk

Risk: Competitive modes may be exploited via collusion or automation.

Mitigation:

- Server authoritative decisions.
- Anomaly detection.
- Mandatory training completion before ranked access.

### K.4 Operational Risk

Risk: Multiplayer services add operational complexity and may reduce platform availability.

Mitigation:

- Degraded mode where multiplayer is disabled but core gameplay remains online.
- Modular service boundaries for isolation.
- Load testing at 10x expected concurrency.

### K.5 Community Forum Risk

Risk: Forums can become vectors for misinformation or harassment if not moderated.

Mitigation:

- Structured tags and rate limits to discourage low-quality posts.
- Moderator tooling with thread lock and content removal actions.
- Enterprise option for internal-only or disabled forums.

---

## Addendum L: Glossary Extensions

- **Authority Token:** The session-level permission that allows final decisions in co-op.
- **Endorsement:** A structured commendation given to teammates after a session.
- **Reputation Score:** A social metric used for matchmaking and moderation.
- **Shift Team:** Narrative term for a party or co-op group.
- **Network Alliance:** Narrative term for a guild.
- **Simulation Exercise:** Narrative term for competitive mode.
- **Corporation:** Enterprise-only guild variant mapped to org structure with shared treasury.
- **Operator Bulletin Board:** Narrative term for community forums.
- **Asymmetric Assault:** Competitive variant with asymmetric objectives and tooling.
- **Purple Team:** Hybrid competitive/cooperative mode with post-mortem learning.

---

## Addendum M: State Machine Overlay for Multiplayer

This addendum describes how multiplayer states overlay the core loop state machine defined in DD-01. The core loop phases remain authoritative. Multiplayer adds coordination states but does not replace the existing sequence.

### M.1 Overlay States

The overlay introduces the following coordination states. These are transient and only apply when multiple players are in a shared session.

- **COOP_LOBBY:** Party is assembled, roles selected, readiness confirmed.
- **COOP_SYNC:** Server verifies all clients have current state before entering DAY_START.
- **COOP_ACTION_WINDOW:** A role-specific action window within a phase, used to collect proposals.
- **COOP_AUTH_CONFIRM:** Authority token holder finalizes decisions.
- **COOP_RESOLUTION:** Server applies decision and broadcasts updated state.

These overlay states are not visible to the player as explicit states; they are represented through UI cues and the coordination board.

### M.2 Phase Entry and Exit Rules

For each phase, the overlay rules are consistent.

- The server enters the phase as defined by the core state machine.
- Each role receives a role-specific “action window” for the phase.
- The phase exits only when the authority confirms that required actions are complete.

If a role is idle, the system can issue a “ready” status to avoid blocking the phase. This ensures that co-op sessions do not stall due to inactivity.

### M.3 Time Pressure Controls

Co-op sessions support optional time constraints for advanced players. Time pressure is configured at session creation and is expressed as soft thresholds rather than hard deadlines.

- Soft thresholds: scoring penalties apply when exceeded.
- Hard deadlines: only used in ranked competitive modes.

Accessibility settings can disable time pressure even in co-op, unless the mode is explicitly marked as “competitive.”

### M.4 Conflict Resolution

Conflicts occur when role proposals disagree. The system handles conflicts without deadlocks.

- Proposals are tagged as “agree” or “conflict.”
- The authority holder must select a final decision.
- Conflict frequency is tracked as a collaboration metric.

The system does not force consensus, but it does surface disagreement to encourage discussion.

---

## Addendum N: Detailed Permission and Policy Matrix

This addendum provides a more detailed permission matrix and policy configuration, intended for backend and admin interface implementation.

### N.1 Permission Matrix by Role

| Action                     | Intake Analyst (SOC T1) | Crypto Warden (PKI) | Comms Officer (IC) | Threat Hunter (SOC T2/3) | Systems Keeper (SysAdmin) | Perimeter Warden (NetSec) | Authority |
| -------------------------- | ----------------------- | ------------------- | ------------------ | ------------------------ | ------------------------- | ------------------------- | --------- |
| View inbox                 | Yes                     | Read-only           | Read-only          | Read-only                | Read-only                 | Read-only                 | Yes       |
| Mark indicators            | Yes                     | Yes                 | No                 | Yes                      | No                        | Yes                       | Yes       |
| Request verification       | Yes                     | Yes                 | No                 | No                       | No                        | No                        | Yes       |
| View verification packets  | Read-only               | Yes                 | No                 | No                       | No                        | No                        | Yes       |
| Propose decision           | Yes                     | Yes                 | No                 | No                       | No                        | No                        | Yes       |
| Finalize decision          | No                      | No                  | No                 | No                       | No                        | No                        | Yes       |
| Initiate incident response | No                      | No                  | Yes                | No                       | No                        | No                        | Yes       |
| Interpret intelligence     | No                      | No                  | No                 | Yes                      | No                        | No                        | Yes       |
| Monitor network boundaries | No                      | No                  | No                 | No                       | No                        | Yes                       | Yes       |
| Allocate resources         | No                      | No                  | No                 | No                       | Yes                       | No                        | Yes       |
| Purchase upgrades          | No                      | No                  | No                 | No                       | Yes                       | No                        | Yes       |
| Annotate audit log         | Read-only               | Read-only           | Read-only          | Read-only                | Read-only                 | Read-only                 | Yes       |
| Advance day                | No                      | No                  | No                 | No                       | No                        | No                        | Yes       |

This matrix is configurable. Smaller co-op sessions use a simplified matrix with merged roles.

### N.2 Tenant Policy Configuration

Tenant policies determine what social and multiplayer features are available.

Policy options include:

- `social.friends.enabled`
- `social.chat.enabled`
- `social.guilds.enabled`
- `social.forums.enabled`
- `enterprise.corporations.enabled`
- `social.leaderboards.scope` (global, regional, tenant-only, disabled)
- `multiplayer.coop.enabled`
- `multiplayer.rank.enabled`
- `multiplayer.variants.enabled` (asymmetric_assault, purple_team)
- `multiplayer.maxPartySize`
- `privacy.profileVisibility` (public, friends, tenant-only)

Policies are stored per tenant and enforced at the API and UI layers. Defaults are conservative for regulated tenants.

---

## Addendum O: Scenario and Content Requirements

Multiplayer modes require specialized content to remain engaging and educational.

### O.1 Co-op Scenario Requirements

Co-op scenarios must include:

- Clear decision points that benefit from collaboration.
- Multiple verification artifacts so the Verification role has meaningful work.
- Incident response events that require coordination between roles.
- Narrative justification for multiple operators working simultaneously.

Co-op scenarios should avoid overly linear flows to preserve agency. Each day should contain at least two branching decision paths.

### O.2 Competitive Scenario Requirements

Competitive scenarios must be balanced and symmetric. The system uses mirrored scenario sets so that Red and Blue teams face equivalent difficulty.

Scenario elements:

- A fixed set of phishing templates with controlled randomness.
- Incident actions with predictable risk profiles.
- Verification packets with known difficulty tiers.

Competitive scenarios are reviewed quarterly to ensure they remain representative of current threat patterns. Asymmetric Assault uses calibrated asymmetry rules, while Purple Team scenarios include structured post-mortem prompts.

### O.3 Seasonal Events

Seasonal events are social drivers and must integrate with narrative arcs. Each season includes at least one multi-week guild challenge and one global async competition.

Event design rules:

- Events must not require real-time participation.
- Events must provide meaningful rewards without impacting competitive fairness.
- Events must align with the core narrative to avoid thematic drift.

---

## Addendum P: API Surface Sketch for Multiplayer Services

This addendum provides an API sketch aligned with the conventions in DD-09. It is not a final contract but illustrates expected endpoints.

### P.1 Party and Presence

- `POST /api/v1/social/party` create party
- `POST /api/v1/social/party/:id/invite` invite user
- `POST /api/v1/social/party/:id/ready` set ready state
- `GET /api/v1/social/presence/:userId` get presence

### P.2 Cooperative Sessions

- `POST /api/v1/coop/sessions` create co-op session
- `GET /api/v1/coop/sessions/:id` get co-op session state
- `POST /api/v1/coop/sessions/:id/actions` submit action
- `POST /api/v1/coop/sessions/:id/roles` assign role

### P.3 Competitive Matches

- `POST /api/v1/competitive/queue` join ranked queue
- `GET /api/v1/competitive/matches/:id` get match state
- `POST /api/v1/competitive/matches/:id/actions` submit action
- `POST /api/v1/competitive/matches/:id/report` report player

### P.4 Social Graph

- `POST /api/v1/social/friends` send friend request
- `DELETE /api/v1/social/friends/:id` remove friend
- `POST /api/v1/social/block` block user
- `POST /api/v1/social/report` report user

### P.5 Community Forums

- `GET /api/v1/forums/categories` list categories
- `POST /api/v1/forums/threads` create thread
- `GET /api/v1/forums/threads/:id` get thread
- `POST /api/v1/forums/threads/:id/posts` create post
- `POST /api/v1/forums/moderate` moderation action

### P.6 Enterprise Corporations

- `GET /api/v1/corporations` list corporations (tenant-only)
- `GET /api/v1/corporations/:id` get corporation detail
- `POST /api/v1/corporations/:id/treasury/approve` approve spend
- `GET /api/v1/corporations/:id/infrastructure` get shared infrastructure

API endpoints use the same response envelope and auth conventions defined in DD-09.

---

## Addendum Q: Error Handling and Resilience

Multiplayer systems must degrade gracefully when errors occur.

### Q.1 Connection Loss

If a player disconnects during co-op:

- The session enters a brief grace period.
- The player can rejoin without penalty.
- If the player does not return, the system assigns their role to AI assistance or redistributes responsibilities.

This ensures that sessions do not collapse due to transient connectivity issues.

### Q.2 Partial Failure

If the multiplayer service experiences partial outages:

- New matchmaking is disabled.
- Existing sessions continue if possible.
- The system switches to read-only mode for leaderboards.

### Q.3 Data Consistency

Event sourcing provides a consistent audit trail. If a state mismatch is detected, the server replays events from the last snapshot and re-broadcasts authoritative state to all clients.

---

## Addendum R: Training Alignment and Behavioral Science Notes

Multiplayer systems can either enhance or undermine behavioral change. This addendum clarifies design choices that support the educational mission.

### R.1 Peer Observation Effect

Co-op play introduces peer observation, which tends to increase adherence to verification steps. The system reinforces this by logging and displaying when verification steps were skipped. The display is subtle and framed as operational oversight rather than social shaming.

### R.2 Distributed Cognition

Large co-op sessions are structured to support distributed cognition. Each role has a narrow focus, encouraging deeper attention to specific tasks. This mirrors real-world SOC practices and improves skill transfer.

### R.3 Avoiding Social Loafing

The design avoids social loafing by making each role’s actions visible and by including role-specific performance feedback in the session summary. This is intended to promote accountability without introducing competitive hostility within a team.

### R.4 Reinforcement Loops

Achievements and endorsements serve as reinforcement for desirable behaviors. These are explicitly tied to learning outcomes, such as careful verification or accurate incident response. Avoiding vanity-only rewards helps preserve the training integrity.

### R.5 Competitive Variant Learning Effects

Asymmetric Assault and Purple Team are designed to teach defenders how adversarial pressure changes decision quality. Purple Team post-mortems transform competitive behavior into reflective learning, which is essential for long-term retention and enterprise training value.

---

## Addendum S: Localization and Cultural Considerations

Multiplayer and social systems operate across regions and cultures. Social features that are acceptable in one region may be sensitive in another. The following considerations ensure global readiness.

### S.1 Language and Tone

All social system labels and prompts must be localized into the same language set as the core game, which per BRD Section 7.6 includes full support for 24 official EU languages with RTL language support (Arabic, Hebrew, Farsi). The tone should remain professional and operational, even in casual modes. This avoids cultural misinterpretations that could arise from overly playful or sarcastic phrasing.

### S.2 Name Policies

Display name rules differ by region. In some regions, pseudonymity is expected, while in enterprise contexts real-name policies may apply. The system must support both without exposing real names outside the intended scope. For example, a user may have a global display name and a tenant-specific alias.

### S.3 Moderation Sensitivity

Moderation policies should support regional differences in profanity or sensitive topics. The moderation system must allow regional dictionaries and tenant-level overrides, while still enforcing a baseline of safety and professionalism.

### S.4 Competitive Fairness Across Regions

Global leaderboards can disadvantage regions with slower average network latency. The system should provide regional leaderboards and normalize scoring to avoid penalizing players based on connectivity. This is especially important for competitive modes where reaction time is a factor.

### S.5 Privacy and Data Export

Regions with strict privacy laws may require in-game mechanisms for data access and deletion. Multiplayer systems must respect these requirements by allowing players and enterprises to export or delete social data without breaking leaderboards or session history.

---
