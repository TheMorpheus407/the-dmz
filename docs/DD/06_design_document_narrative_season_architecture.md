# DD-06: Narrative Design and Season Architecture

## Document Control

| Field | Detail |
|---|---|
| Document ID | DD-06 |
| Version | 1.0 |
| Date | 2026-02-05 |
| Classification | Internal -- Design |
| Status | Draft for Stakeholder Review |
| Owner | Narrative Design and Systems Architecture |
| Source Inputs | BRD-DMZ-2026-001, DD-01, DD-05, DD-07, DD-09 |

## Table of Contents

1. Executive Summary
2. Scope and Non-Goals
3. Narrative Design Modules
4. Season Architecture Overview
5. Episode Cadence and Chapter Format
6. Season Summaries
7. Act Pattern and Progression Rules
8. Integration With Core Systems
9. Enterprise and Compliance Alignment
10. Content Production Pipeline
11. Risks and Open Questions
12. Appendix A: Story Seed (story.md, ASCII normalized)
13. Appendix B: BRD Source Text (BRD.md, ASCII normalized)

## Executive Summary

This document defines the narrative design and season architecture for The DMZ: Archive Gate in the second phase of the waterfall process, immediately following the approved BRD. The goal is to translate the business vision into a playable, multi-season story that preserves stealth learning while sustaining long-term engagement for both enterprise and consumer audiences. The narrative is built around a shattered internet caused by the NIDHOGG Stuxnet variant, the last functioning data center operated by Matrices GmbH, and the operator role that decides who gets access and who is denied. The story must feel urgent, grounded, and ethically complex, because real security training is about judgment under pressure rather than rote memorization. The season architecture is the long-range pacing system that ensures escalation, breathers, and major threat events align with the threat tiers, facility progression, and day cycle defined in the core loop and threat engine specifications. This narrative framework treats every email, verification packet, and incident as a story beat, and every season as a coherent arc with a clear beginning, escalation, and payoff. The design also provides explicit alignment points with enterprise requirements such as auditability, replay, and measurable learning outcomes. It keeps the diegetic terminal aesthetic intact while allowing enterprise deployments to present the story in a compliance-friendly wrapper. The sections below define narrative modules, season cadence, chapter structure, act progression rules, and integration constraints, followed by a verbatim BRD appendix to ensure full alignment with the foundational vision and requirements.


## Scope and Non-Goals

Scope includes the narrative pillars, seasonal arc structure, chapter cadence, act progression rules, and the interaction between story content and core mechanics such as email triage, verification review, threat processing, incident response, resource management, and upgrades. The narrative system must work across consumer and enterprise modes without creating two different games. The narrative must respect determinism, event sourcing, and auditability so that enterprise reviewers can replay story decisions and verify learning outcomes. The season architecture must support Phase 1 through Phase 4 milestones in the BRD roadmap, including Season 1 delivery for early access and Season 4 delivery for global scale. Non-goals include full script writing, voice casting, and cinematic cutscene production details. Those are handled in downstream narrative scripting and content pipeline documents. This document focuses on structure, constraints, and integration so that gameplay, story, and compliance targets stay synchronized.


## Narrative Design Modules

Premise and stakes. The collapse of the public internet and the NIDHOGG contagion define the baseline urgency. Within 72 hours of Day Zero, 60% of global BGP routes were corrupted, DNS root servers went dark, and financial networks froze. Only 15-20% of pre-collapse connectivity remains. Every access request is a potential lifeline or exploit, and scarcity makes each approval costly. The gate becomes a symbol of survival and a moral boundary that the player must enforce. Each core loop cycle takes 5-15 minutes, creating natural session boundaries and driving a "just one more email" retention loop comparable to "just one more turn" in Civilization. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Phishing recognition, risk acceptance, and trust calibration under uncertainty. Season impact: Sets the emotional baseline for Season 1 and remains the gravity well for all later seasons.


Player role and Morpheus guidance. The operator is the final authority, while Morpheus serves as mentor, conscience, and strategic foil. System messages, intelligence briefs, and performance notes deliver guidance without breaking immersion. The relationship frames the story as professional duty rather than hero fantasy. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Decision accountability, escalation discipline, and incident response ownership. Season impact: Morpheus commentary adapts per season to reinforce escalation and post-breach recovery arcs.


Scarcity and resource pressure. The four interconnected resource systems -- Rack Space (measured in U), Bandwidth (Mbps), Power (kW), and Cooling (tons) -- are limited and create constant tension. Resource dashboards, lease terms, and upgrade tradeoffs make scarcity visible in every day cycle. Super-linear maintenance cost scaling prevents infinite expansion. Scarcity converts abstract security choices into tangible survival stakes. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Operational risk management, capacity planning, and prioritization. Season impact: Resource constraints evolve from survival in Season 1 to strategic leverage by Season 4.


Faction politics and alignment drift. The five core factions -- The Sovereign Compact (governments), Nexion Industries (corporations), The Librarians (academics and preservationists), hacktivist collectives, and criminal networks -- compete for access and legitimacy, each with believable motives. Reputation, client trust, and faction-specific requests create a living political economy. Allies become liabilities, and enemies can be necessary partners. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Social engineering recognition, zero-trust posture, and bias mitigation. Season impact: Faction arcs structure the main conflicts of each season and drive the season finales.


Email triage as narrative surface. Each email is a micro-story and a decision point in the larger arc. Indicators, headers, and verification requests turn story clues into mechanical evidence. Lore is delivered through the inbox without pausing the game flow. Emails are generated with difficulty levels 1-5 and categories including spear phishing, BEC, credential harvesting, malware delivery, and pretexting, per FR-GAME-003. A pre-generated pool of 200+ emails is maintained across difficulty tiers, with batch generation during off-peak hours. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Signal detection, evidence evaluation, and attention control. Season impact: Email content evolves from obvious scams at difficulty level 1 to near-perfect impersonation at difficulty level 5 by Season 3, spanning all phishing categories.


Verification packets and in-world documents. All 13 in-game document types serve dual purposes as gameplay artifacts and cybersecurity training instruments: Email Access Request, Phishing Analysis Worksheet, Verification Packet, Threat Assessment Sheet, Incident Log, Data Salvage Contract, Storage Lease Agreement, Upgrade Proposal, Blacklist Notice, Whitelist Exception, Facility Status Report, Intelligence Brief, and Ransom Note. Documents are both plot devices and training instruments. Cross-reference, mismatch detection, and chain-of-custody checks build a forensic rhythm. The archive feels real because it produces real paperwork and bureaucracy. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Identity verification, supply chain validation, and document scrutiny. Season impact: Document complexity scales with the threat tier and season progression.


Threat engine as antagonist. The adaptive threat engine is the living enemy behind the scenes. Threat tiers, campaigns, and intensity pacing shape story escalation. Every spike in danger is justified by intelligence briefs and faction intent. The threat engine shifts attack vectors based on player behavior: players skilled at detecting phishing face supply-chain attacks, while players with strong perimeters face insider manipulation (FR-GAME-020). Dynamic difficulty is a function of narrative, not a slider: Difficulty = f(Player Skill, Story Progress, Player Choices). This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Threat intelligence consumption and adaptive defense reasoning. Season impact: Season finales align with SEVERE tier events and multi-day campaigns.


Breach and recovery arcs. Breaches are not an automatic game over; they are narrative pivots when recovery is possible, and unpaid ransoms end the run per the BRD. Ransom cost equals total lifetime earnings divided by 10, rounded up, with a minimum of 1 CR. If the player can pay, operations resume with a Trust Score penalty and 10-40% client attrition; if they cannot pay, the game ends. Recovery takes 1-7 days depending on security tooling and staff, and a 30-day post-breach revenue depression adds sustained narrative consequence. Ransom demands, recovery days, and limited actions create structured recovery play. Failure has weight; recovery advances the story, while inability to pay ends the session. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Incident response, business continuity, and post-incident learning. Season impact: Season 1 introduces breach stakes; later seasons use breaches to trigger larger arcs.


Upgrades as defense engineering. Progression is expressed as better tooling and hardened infrastructure. Players purchase infrastructure upgrades (racks, cooling, power, bandwidth) and security tools (firewall, IDS, IPS, SIEM, EDR, WAF, threat intel feed, SOAR, honeypots, zero-trust gateway, AI anomaly detection) per FR-GAME-011. Security tools have recurring operational costs, modeling real-world security OpEx (FR-GAME-012). Every upgrade introduces new threat vectors, mirroring real-world vulnerability surfaces (FR-GAME-013). Facility progression follows five tiers: Outpost, Station, Vault, Fortress, Citadel (FR-GAME-014). Upgrade proposals, maintenance costs, and degradation model long-term security debt. Technology choices become part of the player identity and moral posture. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Security architecture tradeoffs and tool efficacy awareness. Season impact: Each season introduces a new class of tools tied to the season theme.


Season cadence and act escalation. Seasons are the macro loop that organizes narrative learning curves. Acts align with day ranges, facility tiers (Outpost, Station, Vault, Fortress, Citadel), and faction reputation thresholds. Escalation is earned, not arbitrary, and breathing rooms after major incidents feature recovery chapters with lower-threat requests to prevent burnout and mirror real-world attack pattern ebbs. The narrative leverages the Octalysis Framework's eight Core Drives, leaning White Hat (Epic Meaning, Development, Creativity) for sustained engagement while deploying Black Hat (Scarcity, Unpredictability, Loss) strategically for urgency and stakes. Six learning theories inform the pacing: Experiential Learning (Kolb), Situated Learning (Lave and Wenger), Stealth Learning, Spaced Repetition (modified Leitner system with SM-2 algorithm), Constructivism, and Zone of Proximal Development (Vygotsky). Morpheus provides contextual scaffolding per Vygotsky without solving problems for the player. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Skill scaffolding from basic phishing to advanced APT recognition, with spaced repetition (modified Leitner system with SM-2 algorithm, intervals from 1 day to 180 days) embedded in narrative email sequencing. Review sessions under 2 minutes, delivered via multiple channels, with interleaving of review topics for improved discrimination. The adaptive learning engine maintains a competency model across seven domains and adjusts content selection, ordering, and difficulty per learner in real-time. Season impact: Season transitions reset pressure to GUARDED and reframe the mission.


Enterprise adaptation. The same story must function in compliance-driven environments. Session replays, audit trails, and reporting connect story beats to learning metrics. The fiction is framed as a training simulation without losing immersion. All narrative content must meet WCAG 2.1 Level AA compliance as baseline (legal obligation), with Section 508 compliance for US government and EN 301 549 for EU markets. CRT aesthetic effects (scanlines, curvature, glow, noise) are implemented as CSS overlays on a clean, accessible base and are disableable without losing functionality. No forced time limits on individual decisions (queue pressure, not per-item timers). Color-blind safe palette with secondary encoding (text labels, icons, patterns). prefers-reduced-motion respected for all animations. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Regulatory mapping, role-based awareness, and measurable behavior change. Season impact: Enterprise deployments can run season packs aligned to their compliance calendar.


Consumer live-ops and community. Seasons must sustain engagement for a free-to-play or premium audience. The Season Pass system (FR-CON-004) includes free and premium reward tracks tied to narrative milestones. Cosmetic-only premium purchases include facility skins, terminal themes, and profile insignia (FR-CON-003). The three in-game currencies -- Credits (CR) as operational revenue, Trust Score (TS) as a reputation gate (0-500+) that unlocks client tiers, contracts, and narrative content, and Intel Fragments (IF) as investigation rewards -- anchor the economy to the story. Player progression spans 30 levels (Intern to CISO) with XP earned through security-correct actions, plus prestige levels 31-50 with cosmetic rewards. Time-limited events and community milestones become in-world news, reinforcing the archive mythos. User-Generated Content tools (FR-CON-012 through FR-CON-014) -- including a scenario editor for community-created threat packs, Steam Workshop integration, and a community marketplace -- extend seasonal narrative content through player contributions. This module anchors to the day cycle in DD-01, preserves the no-per-email-timer rule, and keeps decisions player-initiated. It uses threat tier feedback from DD-05 and diegetic terminal cues from DD-07 so that story beats are readable even under pressure. It relies on event-sourced state and replay from DD-09 to keep enterprise audit and narrative continuity intact. Training emphasis: Habit formation and voluntary return rates through narrative hooks. Season impact: Community events are anchored to season midpoints and finales.


## Season Architecture Overview

Seasons are the macro narrative structure that frame the player experience over months of content delivery. Per the BRD, the annual cadence is four seasons per year, each season defined by a central threat and an episodic structure that sustains long-term engagement. Each season follows a three-act escalation with a finale, uses the threat tier system to control pacing, and introduces at least one new mechanic or system that reshapes the core loop without replacing it. Seasons are designed to be playable as a continuous saga for consumer audiences and as modular training packs for enterprise deployments. Season transitions are explicit story moments that justify a reset to GUARDED threat levels and a renewed sense of mission. The arc design keeps the inbox as the primary narrative surface while enabling larger campaigns, facility changes, and faction politics to reshape day-to-day decisions.


## Episode Cadence and Chapter Format

The BRD defines a fixed episodic cadence for consumer seasons: 4 seasons per year, each season spanning 12 weeks with 11 chapters. Chapters are not optional; they are the atomic narrative units used for progression, rewards, and analytics. Each chapter has a required format: a narrative briefing, 3 to 5 core access decisions (each offering four options: Approve, Deny, Flag for Review, or Request Additional Verification per FR-GAME-005), 1 incident event, 1 intelligence update, 1 character moment, and optional side quests. No decision has a single correct answer; all options carry trade-offs mirroring real-world security risk acceptance (FR-GAME-007). Every decision produces immediate feedback (revenue/cost), short-term consequences (threat level shift), and delayed consequences (Echoes manifesting 1 to 3 chapters later, per FR-GAME-006). The 12th week is reserved as a buffer week for recap, recovery, or community events and is not counted as a chapter. This cadence preserves the BRD requirement while allowing breathing rooms after major incidents and providing schedule slack for localization, QA, and live-ops. The episodic model also supports the river delta narrative model defined in the BRD, where narrative branches diverge and reconverge around Nexus Points, with four structural layers: Spine (fixed major events), Branches (visible decision points), Tendrils (minor variations for responsiveness), and Echoes (delayed consequences that manifest 1 to 3 chapters later). Emergent storytelling arises from three interacting systems: the Queue System (randomized email generation), the Reputation System (five faction axes with threshold-triggered events), and the Threat Escalation System (adaptive attack vectors based on player behavior).


## Season Summaries

Season 1 -- Signal Loss. Theme: Survival through disciplined trust in a shattered network. Logline: The operator establishes the last reliable gate while learning to separate desperate allies from patient adversaries. Central threat: Stuxnet variant fallout, phishing waves, and access control failures. New factions and sub-factions: The five core factions are introduced as the baseline political map; seasonal sub-factions include the Relay Wardens (mesh network custodians) and the Grey Freight Couriers (data salvage brokers), each mapped to a core faction for threat engine compatibility. New NPCs: Morpheus (director), Kade Morrow (intake lead), Dr. Alina Reyes (Librarian archivist liaison), and Voss Imani (Sovereign Compact attache). Threat curve: LOW to HIGH across Acts I and II, escalating to a controlled SEVERE spike at the finale for the first breach and recovery cycle, consistent with the rule that season finales align with SEVERE tier events. Key mechanics: Core email triage, verification packets, baseline upgrades, and the first multi-day campaign. Training focus: Phishing basics, identity verification, evidence-driven decisions, and entry-level incident response. Act structure: Act I Setup: Day Zero Intake, Act II Escalation: Pressure Lines, Act III Crisis: Signal Collapse, Finale: The Gate Trial. Terminal presentation: Monospaced primary font, dark background (#0a0e14), phosphor green (#33ff33) or amber (#ffb000) text options, CRT effects as CSS overlays on clean accessible base (all effects disableable), deliberate onboarding overlays. Enterprise packaging: Maps cleanly to baseline awareness modules and phishing simulation kick-off. Exit hook: A coordinated campaign reveals that a supply chain broker has infiltrated archive logistics.


Season 2 -- Supply Lines. Theme: Expansion without trust creates brittle networks. Logline: The archive grows into satellite nodes and vendor partnerships, exposing new attack surfaces and political bargains. Central threat: Supply chain compromise inspired by SolarWinds patterns and vendor trust collapse. New factions and sub-factions: New seasonal factions include the Integrator Guild (vendor consortium), the Ashfall Transit Union (data shipment handlers), and the Marrow Stack Cooperative (small data centers), each mapped to core factions for gameplay analytics. New NPCs: Nina Park (procurement chief), Jonas Rigg (vendor compliance auditor), Tessa Quill (Transit Union negotiator). Threat curve: GUARDED to SEVERE, ending in a coordinated protocol attack across nodes. Key mechanics: Cross-node capacity, supply chain inspection, advanced verification, and early co-op missions. Training focus: Supply chain risk, BEC patterns, multi-step social engineering, and escalation workflows. Act structure: Act I Setup: New Nodes, Act II Escalation: Fractured Alliances, Act III Crisis: Supply Line Breach, Finale: The Relay Collapse. Terminal presentation: Expanded dashboards, multi-node status overlays, and denser intelligence briefs. Enterprise packaging: Aligns with role-based training and phishing simulation sophistication upgrades. Exit hook: Recovered logs show a ransomware broker coordinating across factions through encrypted dark channels.


Season 3 -- Dark Channels. Theme: Ransomware economies turn survival into a negotiation battlefield. Logline: Extortion campaigns and double ransom tactics force the operator to balance containment, disclosure, and survival. Central threat: Ransomware waves, double extortion, and destructive encryption campaigns. New factions and sub-factions: New seasonal factions include the Cipher Cartel (ransomware crew), the Black Ledger Exchange (ransom broker market), and the Rescue Accord (anti-ransom negotiators). New NPCs: Ilya Kane (incident response lead), Maris Holt (ransom negotiator), and Soren Vale (intel analyst). Threat curve: ELEVATED to SEVERE, sustained at peak for the final act. Key mechanics: Advanced incident response chains, breach recovery tradeoffs, escalation deadlines, and Red vs Blue events. Training focus: Ransomware detection, containment strategy, recovery sequencing, and business continuity decisions. Act structure: Act I Setup: Dark Signals, Act II Escalation: Extortion Spiral, Act III Crisis: The Lockdown, Finale: The Ransom Reckoning. Terminal presentation: High-alert terminal overlays, escalated threat bar effects, and deeper incident timelines. Enterprise packaging: Supports advanced tabletop exercises and cross-team coordination training. Exit hook: Internal audit anomalies indicate that trusted insiders may be enabling the next wave of attacks.


Season 4 -- The Inside Job. Theme: Insider threats test the boundary between trust and control. Logline: The archive confronts sabotage, coercion, and privilege abuse from within its own walls. Central threat: Insider threats, credential misuse, and privileged access abuse. New factions and sub-factions: New seasonal factions include the Custodian Bloc (facility staff collective), the Black Badge Syndicate (contractor ring), and the Quiet Key Circle (credential brokers). New NPCs: Lena Hart (operations supervisor), Omar Velez (HR security liaison), and Petra Sloan (internal auditor). Threat curve: GUARDED to HIGH with sharp spikes tied to insider events, escalating to a SEVERE spike at the finale consistent with the rule that season finales align with SEVERE tier events. Key mechanics: Privileged access reviews, insider behavior indicators, dual-approval workflows, and trust restoration tasks. Training focus: Insider threat recognition, least privilege enforcement, anomaly reporting, and ethics under pressure. Act structure: Act I Setup: Trusted Hands, Act II Escalation: Quiet Breaches, Act III Crisis: The Inside Job, Finale: Trust Reset. Terminal presentation: Policy overlays, access review panels, and increased emphasis on audit trails. Enterprise packaging: Maps to insider threat training, least privilege audits, and management accountability reporting. Exit hook: The archive survives but discovers a new class of threats forming outside the gate, setting up future seasons.


## Act Pattern and Progression Rules

Each season uses a consistent act pattern to maintain player comprehension while still allowing surprise. Per the BRD, the season structure uses three acts (Setup, Escalation, Crisis) plus a Finale, with 11 chapters distributed across those acts. Act I establishes the seasonal theme, introduces the new mechanic, and provides a controlled ramp from LOW or GUARDED within the five-tier threat level system (LOW, GUARDED, ELEVATED, HIGH, SEVERE per FR-GAME-019). Act II amplifies faction conflicts and forces the player to reconcile competing priorities under resource pressure. Act III pushes the threat engine to sustained HIGH or SEVERE tiers, culminating in a campaign-level event such as a coordinated breach or multi-day assault. The finale resolves the season's primary conflict and plants the hook for the next season. Progression between acts is controlled by a combination of chapter count, facility tier, and faction reputation thresholds. This keeps pacing consistent across sessions and prevents players from being rushed by timers. Failure states do not block act progression; instead, they branch the narrative into recovery sub-arcs that still rejoin the main track, preserving both player agency and enterprise auditability.


## Integration With Core Systems

Narrative delivery is inseparable from the core loop. EMAIL_TRIAGE and VERIFICATION_REVIEW are the primary story surfaces, while DECISION_RESOLUTION and CONSEQUENCE_APPLICATION deliver narrative feedback in the form of trust, funds, faction response, and intelligence updates. The Threat Engine provides pacing and antagonistic intent, and its tier changes must always be explained through intelligence briefs or Morpheus commentary. Incident response phases are treated as dramatic set pieces that slow the pace and focus the player on containment and recovery. Resource management and upgrades function as character progression, with each upgrade reflecting a story investment and each maintenance lapse implying narrative neglect. The UI remains diegetic, meaning every narrative element is embedded in terminal artifacts, system alerts, and operational paperwork. Backend event sourcing ensures that all story events are replayable, testable, and auditable, which is critical for enterprise use and for debugging seasonal branching logic. Seasonal factions are narrative overlays that map to the core faction taxonomy in the threat engine and analytics pipeline so that new seasonal content does not break systemic balance or reporting. Multiplayer and social features intersect with seasonal narrative: cooperative play (FR-MP-001 through FR-MP-004) supports 2-6 player missions with interconnected data centers facing shared threat campaigns, with role specializations mapping to real SOC roles (Perimeter Warden, Intake Analyst, Threat Hunter, Systems Keeper, Crypto Warden, Comms Officer). Cooperative scenarios such as Cascade Failure (supply chain), Bandwidth Siege (DDoS), The Insider (anomaly detection), and Data Exodus (distributed data protection) align with seasonal threat themes. Competitive Red Team vs. Blue Team play (FR-MP-005 through FR-MP-010) and guild/corporation systems (FR-MP-011 through FR-MP-014) extend the narrative social layer. Enterprise team competitions (FR-MP-015 through FR-MP-018), including capture-the-flag events, seasonal tournaments, and hackathon events, are tied to seasonal content cadence.


## Enterprise and Compliance Alignment

Enterprise deployments require that narrative content map cleanly to regulatory frameworks and measurable outcomes. Season packs therefore include explicit learning objectives, coverage tags, and reporting hooks tied to the 14+ regulatory frameworks supported by the platform (GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, NIST CSF, SOC 2, FedRAMP, and others) and enterprise KPIs. Narrative branches that would significantly alter difficulty are constrained by policy profiles so that training efficacy remains comparable across cohorts. The story is framed as a simulation in admin interfaces, while the player-facing UI retains the full diegetic experience. Audit reports can trace specific story beats to specific behaviors, such as identification of spoofed headers or successful incident containment.


## Content Production Pipeline

Narrative content is produced in a structured pipeline. Each season begins with a theme brief, a faction matrix, and a threat curve plan. Writers then produce act outlines, chapter scripts, email templates, verification packets, intelligence briefs, and incident scripts. Content is reviewed for security accuracy, ethical safety, and localization readiness across 24 official EU languages (regulatory requirement under GDPR, NIS2) with cultural adaptation of phishing simulations per locale and RTL language support (Arabic, Hebrew, Farsi). Approved content is tagged for training outcomes, threat tiers, and faction alignment. The AI content pipeline -- using Anthropic Claude API (Sonnet for generation, Haiku for classification) as primary, with self-hosted Mistral/Llama as fallback for offline enterprise deployments -- can generate variants, but human curation sets the canonical intent. Content safety guardrails prohibit real company names, real people, or functional malicious payloads; output validation rejects emails containing real URLs, phone numbers, or PII. Final assets are integrated into the content module, tested against the state machine for deterministic playback, and validated with telemetry expectations before release.


## Risks and Open Questions

Key risks include narrative overload in the inbox, player fatigue during prolonged SEVERE tiers, and misalignment between seasonal narrative shifts and enterprise training schedules. Another risk is that AI-generated content could dilute the season arc if not tightly curated. Mitigations include clear act boundaries, mandatory breathers after major breaches, and a seasonal governance review that validates alignment with the BRD and the episodic chapter structure.


## Appendix A: Story Seed (story.md, ASCII normalized)

# The DMZ: Archive Gate

## Core Premise
A new Stuxnet variant has crashed most of the public internet. Governments, universities, and major companies are desperate to preserve what they can. Matrices GmbH, led by Morpheus, operates one of the last functioning data centers with a strict policy of safety and security. We decide who gets access to recovery services. Hackers know this and attack constantly. Access is limited. More money means better servers, cooling, and security, but our main job stays the same: deciding who gets in.

## World State
- The public web is fragmented; only a few isolated networks still run.
- Trust is broken. Every request could be a trap.
- Most applicants can only reach us by email.
- Data loss is existential, not just financial.

## Player Role
- Final authority on access decisions.
- Balances survival, ethics, and security.
- Drives profit and increases automation through purchased security tools.
- Manages upgrades funded by accepted clients.

## Access Constraints
- Limited rack space, bandwidth, and power.
- Storage is leased for a fixed number of days, then reclaimed for resale.
- Priority shifts daily based on threat level.
- Each approval increases attack surface.

## Upgrade Loop
- Funds increase capacity, cooling stability, and security tooling.
- Upgrades improve acceptance rate, resilience, and automation.
- Every upgrade triggers new threat vectors.

## Verification and Phishing Simulation
- Requests arrive by email; verification is handled like a real phishing review.
- The game trains players to identify legitimacy and avoid social engineering.

## Breach Consequence
- A successful breach triggers a ransom note.
- The ransom costs total lifetime earnings divided by 10, rounded up with a minimum of 1 CR.
- Operations stay locked behind the ransom note until payment is confirmed.
- If we can pay, we lose money; if we cannot, we lose the game.

## Primary Threats
- External attackers probing for entry.
- Supply chain malware hidden in backups.
- Adversaries become more sophisticated as we scale up.

## Documents
These are the in-world documents that appear as gameplay artifacts or reference material.

- Email Access Request: Applicant profile, assets at risk, and requested services.
- Phishing Analysis Worksheet: Signals of legitimacy and red flags.
- Verification Packet: Proof of identity, ownership, and chain-of-custody.
- Threat Assessment Sheet: Risk score, known indicators, and recommended action.
- Incident Log: Timeline of attacks, breaches, and mitigations.
- Data Salvage Contract: Terms, liabilities, and fee structure.
- Storage Lease Agreement: Capacity, term length, and renewal options.
- Upgrade Proposal: Costs, lead time, and expected capacity gain.
- Blacklist Notice: Entities barred from access and the rationale.
- Whitelist Exception: Emergency access override and signatures.
- Facility Status Report: Power, cooling, and utilization metrics.
- Intelligence Brief: Current attacker behavior and active campaigns.
- Ransom Note: Payment demand and deadline after a breach.


## Appendix B: BRD Source Text (BRD.md, ASCII normalized)

# The DMZ: Archive Gate

## Business Requirements Document

---

### Document Control

| Field | Detail |
|-------|--------|
| **Version** | 1.0 |
| **Date** | 2026-02-05 |
| **Classification** | Confidential -- Internal & Investor Use |
| **Authors** | Matrices GmbH Product & Strategy Team |
| **Status** | Draft for Stakeholder Review |
| **Document ID** | BRD-DMZ-2026-001 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision, Mission & Strategic Objectives](#2-vision-mission--strategic-objectives)
3. [Market Opportunity](#3-market-opportunity)
4. [Target Audiences](#4-target-audiences)
5. [Product Overview](#5-product-overview)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Compliance & Regulatory](#9-compliance--regulatory)
10. [Enterprise Integration](#10-enterprise-integration)
11. [Game Design](#11-game-design)
12. [Monetization Strategy](#12-monetization-strategy)
13. [Go-to-Market Strategy](#13-go-to-market-strategy)
14. [Risk Analysis](#14-risk-analysis)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Success Metrics & KPIs](#16-success-metrics--kpis)
17. [Appendices](#17-appendices)

---

## 1. Executive Summary

### What the Product Is

The DMZ: Archive Gate is a cybersecurity awareness training platform disguised as a post-apocalyptic data center management game. In a world where a Stuxnet variant called NIDHOGG has shattered the public internet, players operate one of the last functioning data centers -- Matrices GmbH -- deciding who gets access, defending against hackers, and upgrading infrastructure. Through this gameplay, they unknowingly acquire real cybersecurity skills: phishing detection, access control, incident response, risk management, and security operations thinking.

The product serves two distinct markets through a single core game engine: an enterprise platform for organizations needing compliance training, and a free-to-play consumer game for everyday people who will never voluntarily enroll in a cybersecurity course.

### Why It Matters

The cybersecurity awareness training market is valued at approximately **$5.8 billion in 2025** and projected to exceed **$10 billion by 2027**. Yet the industry suffers from a structural engagement crisis: **79% of employees** complete training only because it is mandatory, knowledge retention from traditional methods sits at approximately **5%**, and only **7.5% of organizations** use adaptive training. The market optimizes for compliance checkbox fulfillment, not for genuine behavioral change.

Meanwhile, **3.4 billion phishing emails** are sent daily. Ransomware attacks increased **47% year-over-year** in 2025. AI-generated phishing emails now achieve a **54% click-through rate**. The human layer remains the weakest link, and the tools meant to strengthen it are failing.

### Dual-Market Strategy

**Enterprise (B2B):** Per-seat licensing for organizations needing compliance training across 14+ regulatory frameworks (GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, and more). Integrates with SIEM, SOAR, LMS, HRIS, and identity providers. Delivers measurable behavioral change, not just completion certificates.

**Consumer (B2C):** A free-to-play game targeting the casual and simulation gaming audience -- 3.2 billion mobile gamers and a $260 billion global gaming market. The "Duolingo of cybersecurity": a consumer-grade product that teaches real security skills through gameplay. No incumbent competition exists at this intersection.

### Key Differentiators

1. **Stealth learning:** Players learn cybersecurity by surviving a crisis, not by taking a course. Gamified training achieves 75-90% knowledge retention vs. 5-20% for traditional methods.
2. **Dual-market architecture:** One game engine serves both enterprise compliance and consumer entertainment, creating a consumer-to-enterprise pipeline similar to Slack's bottom-up adoption model.
3. **AI-generated dynamic content:** Phishing emails, threat scenarios, and attack campaigns are generated by AI, ensuring content freshness and personalized difficulty.
4. **Full enterprise integration:** SCORM, xAPI, LTI, SIEM, SOAR, SSO, SCIM -- the platform is not a standalone tool but an operational node in the enterprise security ecosystem.
5. **Papers, Please meets cybersecurity:** The document-checking, access-granting gameplay draws from one of indie gaming's most celebrated titles, applied to the most pressing security challenge of our time.

### Investment Thesis

The opportunity combines a large, growing, and underserved enterprise market ($5.8B to $10B+) with an untapped consumer blue ocean (no existing consumer cybersecurity education product) and proven comparable models (Duolingo: $531M revenue, 97M MAU; Papers, Please: 5M+ copies). The platform's dual-market approach creates multiple revenue streams, a defensible competitive moat through consumer brand recognition, and a bottom-up enterprise acquisition channel that reduces customer acquisition costs.

---

## 2. Vision, Mission & Strategic Objectives

### Company Vision

A world where every person -- employee or individual -- possesses the cybersecurity instincts to protect themselves and their organizations, acquired not through mandatory training but through genuinely engaging gameplay.

### Product Mission

To make cybersecurity awareness as accessible, engaging, and habitual as language learning on Duolingo -- by building the world's first consumer-grade cybersecurity education game that simultaneously serves enterprise compliance needs.

### 3-Year Strategic Goals

| Year | Enterprise Goal | Consumer Goal | Technical Goal |
|------|----------------|---------------|----------------|
| **Year 1** | 50 enterprise customers; SOC 2 Type II; 5 LMS integrations | 500K registered players; Steam + Web launch | MVP platform; AI content pipeline; core integrations |
| **Year 2** | 500 enterprise customers; FedRAMP Ready; NIS2 full compliance | 5M registered players; mobile launch; 1M MAU | Multi-tenant at scale; advanced analytics; multiplayer |
| **Year 3** | 2,000 enterprise customers; $50M ARR | 20M registered players; 5M MAU; $20M consumer revenue | Global multi-region; full SIEM/SOAR ecosystem; UGC platform |

### OKRs (Year 1)

**Objective 1: Prove that stealth learning works**
- KR1: Achieve >75% voluntary return rate among consumer players (D7 retention)
- KR2: Demonstrate >40% reduction in phishing click rates among enterprise users within 6 months
- KR3: Publish third-party validated study showing knowledge retention superiority

**Objective 2: Establish enterprise market presence**
- KR1: Close 50 paying enterprise accounts
- KR2: Achieve >90% training completion rates across enterprise deployments
- KR3: Pass SOC 2 Type II audit with zero critical findings

**Objective 3: Build consumer brand**
- KR1: Reach 500,000 registered players
- KR2: Achieve Steam review score of "Very Positive" (>80% positive)
- KR3: Generate 1,000+ organic content creator videos/streams

---

## 3. Market Opportunity

### 3.1 Enterprise Cybersecurity Training Market

The global cybersecurity awareness training market is experiencing rapid expansion:

| Source | 2025 Estimate | 2027-2030 Forecast | CAGR |
|--------|--------------|-------------------|------|
| Cybersecurity Ventures | ~$5.6B | $10B+ by 2027 | ~15% |
| Mordor Intelligence | $5.77B | $12.70B by 2030 | 17.1% |
| Gamified cybersecurity training | $6.27B | $51.28B by 2030 | 52.24% |

**Growth drivers:**
- EU NIS2 Directive mandating role-based training across 18 critical sectors, with **personal liability for management bodies**
- PCI-DSS 4.0 future-dated requirements becoming mandatory (March 2025), explicitly requiring phishing and social engineering training
- Cyber-insurance underwriters requiring quarterly phishing simulations; compliant organizations report premium discounts up to **20%**
- AI-generated phishing rendering traditional defenses inadequate -- organizations running year-long training saw phish-prone rates fall from **34.3% to 4.6%**
- SEC cybersecurity disclosure rules creating board-level urgency for documented training programs

**Regional distribution:** North America 38.2%, Europe ~25% (NIS2 driving procurement surge), Asia-Pacific ~22% (fastest growing at 9.0% CAGR).

### 3.2 Consumer Gaming Market

| Metric | Value |
|--------|-------|
| Global gaming revenue | $260 billion (2025) |
| Active players worldwide | 3.49 billion |
| Mobile gaming revenue | $92.6 billion (49% share) |
| Simulation game market | $3.53B (2024), growing to $26.18B by 2032 at 28% CAGR |
| Serious games market | $17.64B, growing at 17% CAGR |

The management/simulation genre is experiencing a renaissance. Papers, Please sold 5+ million copies. Frostpunk sold 5+ million copies. The simulation genre represents 20% of all mobile game downloads, tied for first place.

The average management sim player is 30-45 years old, has higher-than-average income and education, and is often a professional who manages systems in real life -- precisely the demographic that needs cybersecurity awareness.

### 3.3 Competitive Landscape

| Vendor | Best For | Pricing | Engagement Model | Key Weakness |
|--------|----------|---------|-----------------|--------------|
| **KnowBe4** | Large enterprises | $1.50-$2.54/user/mo | Library + Simulation | Dated UX, compliance-focused |
| **Proofpoint** | Enterprises with email stack | $12-24/user/mo | Threat Intel + Simulation | Expensive, content quality lags |
| **SANS** | Security-conscious orgs | ~$3/user/mo | Expert-led + Compliance | Overwhelming for non-technical users |
| **Hoxhunt** | Metrics-driven orgs | Custom premium | Adaptive AI + Gamification | Narrow phishing focus |
| **CybSafe** | Behavior-change focused | Custom premium | Behavioral science | Small content library |
| **Ninjio** | Engagement-first orgs | $1.50-2/user/mo | Story-driven video | Passive consumption, limited depth |
| **Arctic Wolf** | Under-resourced IT teams | $2.99-4.99/user/mo | Fully managed | Less customization |
| **The DMZ** | **Everyone** | **Freemium + Enterprise** | **Game-native stealth learning** | **New entrant, unproven at scale** |

### 3.4 Market Gaps

**The Engagement Crisis:** 79% of employees complete training only because it is mandatory. Knowledge retention from traditional learning methods is approximately 5%. Experiential, game-based learning achieves up to 90%. The industry optimizes for auditor satisfaction, not behavioral change.

**No Consumer Product:** The entire $5.8B market targets enterprise employees receiving mandatory training. No meaningful product addresses the 3.2 billion people who face phishing, identity theft, and social engineering in their personal lives.

**The Compliance Trap:** Platforms compete on content volume and compliance mapping breadth, not on engagement or outcomes. The buyer (CISO) is not the user (employee), creating misaligned incentives.

### 3.5 Addressable Market & Revenue Projections

**Enterprise TAM:** $10B+ by 2027 (total awareness training market)
**Enterprise SAM:** $2B (organizations seeking next-generation, gamified training)
**Enterprise SOM (Year 3):** $50M ARR (2,000 customers at $25K average contract value)

**Consumer TAM:** 3.2B mobile gamers; 320M interested in "useful" games
**Consumer SAM:** 16M potential active players (5% of interested audience)
**Consumer SOM (Year 3):** $20M (blend of premium purchases, subscriptions, and cosmetics)

**Combined Year 3 Target:** $70M revenue, with enterprise providing 70% and consumer providing 30%.

---

## 4. Target Audiences

### 4.1 Enterprise Segments

| Segment | Size | Key Needs | Buying Triggers | Price Sensitivity |
|---------|------|-----------|-----------------|-------------------|
| **SMB (1-500)** | Fastest growing at 20.1% CAGR | Easy deploy, minimal admin, insurance compliance | Cyber-insurance requirements, post-breach | High |
| **Mid-Market (500-5K)** | Emerging security programs | LMS integration, scalability, phishing simulation | Board mandate, SOC 2 pursuit, audit findings | Moderate |
| **Enterprise (5K+)** | 73.3% of market share | Multi-language, advanced analytics, SIEM/SOAR integration | NIS2/SEC mandates, measurable risk reduction | Low |
| **Government** | Mandated 100% annual training | FedRAMP, Section 508, data sovereignty | FISMA compliance, CISA directives | Moderate (procurement-driven) |
| **Healthcare** | 300% increase in cyberattacks (2022-2024) | HIPAA compliance, short-format, mobile-friendly | OCR audit preparedness, ransomware defense | Moderate |
| **Financial Services** | Most heavily regulated | DORA, NYDFS, PCI-DSS, BEC-focused content | Regulatory examination, wire fraud incidents | Low |

### 4.2 Consumer Segments

| Segment | Description | Engagement Style | Monetization |
|---------|-------------|-----------------|--------------|
| **Casual Gamers** | 73% prefer sessions under 10 minutes; 46% female | Quick sessions, mobile-first, social sharing | Free-to-play with cosmetics |
| **Sim Enthusiasts** | Papers, Please / Frostpunk audience; 30-45 years old | Deep sessions (45-90 min), Steam-primary | Premium purchase ($14.99-$19.99) |
| **Cybersecurity Curious** | 5.5M security professionals + 4.8M unfilled positions | Skill-building, competitive leaderboards | Subscription + certifications |
| **Security Professionals** | Existing practitioners using as fun practice | Red team/blue team PvP, advanced scenarios | Premium competitive features |

### 4.3 Key Buyer Personas

**The CISO:** Primary decision-maker. Needs risk scoring and behavioral analytics that translate to board-level business risk language. Frustrated by inability to demonstrate ROI of awareness training. Wants integration with existing security operations.

**The IT Director:** Operational evaluator and daily administrator. Needs automated provisioning (SCIM, AD sync), minimal administration burden, and reliable platform performance. Evaluates on deployment ease and API quality.

**The HR/L&D Leader:** Influential stakeholder controlling the LMS and training budget. Needs engaging content employees do not dread, seamless LMS integration (SCORM, xAPI, LTI), and positive employee feedback. Primary pain: complaints about boring security training.

**The Compliance Officer:** Requirements definer and validator. Needs pre-built compliance mapping to 14+ regulatory frameworks, one-click audit-ready reporting, and configurable retention periods. Pain: multiple overlapping regulations each requiring different evidence.

---

## 5. Product Overview

### 5.1 Core Concept: Stealth Learning Through Gameplay

The critical design insight: **players never realize they are being trained.** They believe they are surviving an apocalypse. They are, in fact, learning phishing detection, access control, incident response, risk management, and security operations through contextualized, high-stakes decision-making.

Research evidence supports this approach:
- Gamified security training achieves knowledge retention rates of **75-90%**, compared to 5-20% for traditional methods
- Organizations implementing gamified phishing simulations see susceptibility drop from **~29% to ~9%** over 24 months
- Reporting rates increase from **7% to 60%** with gamified training
- Microlearning drives **50% higher engagement** than traditional long-form training

### 5.2 Game Premise

A new Stuxnet variant -- NIDHOGG -- has crashed most of the public internet. Within 72 hours of Day Zero, 60% of global BGP routes were corrupted, DNS root servers went dark, and financial networks froze. The internet did not die all at once; it shattered into islands: national intranets, corporate archipelagos, university mesh networks, and dark zones.

Data became the most valuable commodity on Earth. Matrices GmbH, led by Morpheus, operates one of the last functioning data centers with a strict policy of safety and security. The player is the final authority on access decisions -- balancing survival, ethics, and security while managing upgrades funded by accepted clients.

The world state:
- The public web is fragmented; only 15-20% of pre-collapse connectivity remains
- Trust is broken; every request could be a trap
- Most applicants can only reach us by email
- Data loss is existential, not just financial

Five factions compete for access: The Sovereign Compact (governments), Nexion Industries (corporations), The Librarians (academics/preservationists), hacktivist collectives, and criminal networks. Each has legitimate needs, understandable motivations, and the capacity for both cooperation and betrayal.

### 5.3 Core Gameplay Loop

```
EMAIL ARRIVES --> ANALYZE (sender, content, attachments, headers)
     |
     v
VERIFY (cross-reference against verification packet, threat assessment)
     |
     v
DECIDE (Approve / Deny / Flag for Review / Request Additional Verification)
     |
     v
CONSEQUENCES (revenue gain/loss, reputation change, attack surface shift)
     |
     v
MANAGE RESOURCES (allocate rack space, power, cooling, bandwidth)
     |
     v
UPGRADE (purchase security tools, expand capacity, hire staff)
     |
     v
DEFEND (monitor threats, respond to incidents, pay ransoms or lose the game)
     |
     v
ADVANCE DAY --> REPEAT (with escalating difficulty and evolving narrative)
```

Each cycle takes 5-15 minutes, creating natural session boundaries. The "just one more email" loop drives retention comparable to "just one more turn" in Civilization.

### 5.4 Game Mechanics to Security Skills Mapping

| Game Mechanic | In-Game Action | Real-World Security Skill | Competency Domain |
|---------------|---------------|--------------------------|-------------------|
| **Email Triage** | Read and analyze incoming access requests | Phishing detection, email header analysis, URL inspection | Threat Detection |
| **Verification Packet Review** | Cross-reference claimed identity against proof documents | Identity verification, out-of-band confirmation | Access Control |
| **Threat Assessment Sheet** | Evaluate risk scores and known indicators | Threat intelligence analysis, risk scoring | Risk Management |
| **Access Decision (Approve/Deny)** | Grant or refuse data center access under uncertainty | Zero-trust thinking, risk acceptance frameworks | Security Judgment |
| **Resource Management** | Allocate rack space, power, cooling, bandwidth | Capacity planning, security budget allocation | Operations |
| **Upgrade Loop** | Purchase and deploy security tools (IDS, SIEM, WAF) | Patch management, security architecture | Defense Engineering |
| **Breach/Ransom Mechanic** | Respond to successful attacks; pay ransom or lose everything | Incident response, business continuity planning | Incident Response |
| **Blacklist/Whitelist Management** | Maintain lists of trusted and blocked entities | Access control lists, allow/deny policies | Access Control |
| **Intelligence Briefs** | Review threat intelligence about active campaigns | Threat intelligence consumption, indicator correlation | Threat Intelligence |
| **Facility Status Report** | Monitor power, cooling, utilization metrics | Security monitoring, dashboard interpretation | Security Operations |
| **Data Salvage Contract** | Negotiate terms, liabilities, and fees | Data handling agreements, SLA management | Governance |
| **Supply Chain Analysis** | Detect malware hidden in client backups | Supply chain security, software integrity | Supply Chain Risk |

### 5.5 In-Game Documents

All 13 documents from the game serve dual purposes: gameplay artifacts and cybersecurity training instruments.

1. **Email Access Request** -- Applicant profile, assets at risk, and requested services (teaches phishing analysis)
2. **Phishing Analysis Worksheet** -- Signals of legitimacy and red flags (teaches structured threat assessment)
3. **Verification Packet** -- Proof of identity, ownership, and chain-of-custody (teaches identity verification)
4. **Threat Assessment Sheet** -- Risk score, known indicators, and recommended action (teaches risk scoring)
5. **Incident Log** -- Timeline of attacks, breaches, and mitigations (teaches incident documentation)
6. **Data Salvage Contract** -- Terms, liabilities, and fee structure (teaches data handling agreements)
7. **Storage Lease Agreement** -- Capacity, term length, and renewal options (teaches SLA management)
8. **Upgrade Proposal** -- Costs, lead time, and expected capacity gain (teaches security investment ROI)
9. **Blacklist Notice** -- Entities barred from access and the rationale (teaches access control policy)
10. **Whitelist Exception** -- Emergency access override and signatures (teaches exception management)
11. **Facility Status Report** -- Power, cooling, and utilization metrics (teaches infrastructure monitoring)
12. **Intelligence Brief** -- Current attacker behavior and active campaigns (teaches threat intelligence)
13. **Ransom Note** -- Payment demand and deadline after a breach (teaches incident response under pressure)

### 5.6 Dual-Mode Architecture

The platform operates in two modes from a single codebase:

**Game Mode (Consumer):** Full narrative experience with seasonal episodic content, competitive leaderboards, cosmetic progression, and community features. Free-to-play with optional premium purchases.

**Enterprise Mode (B2B):** All game mechanics plus multi-tenancy, SCORM/xAPI/LTI integration, compliance reporting, phishing simulation campaigns, SSO/SCIM provisioning, SIEM/SOAR integration, and administrative dashboards. Per-seat licensing with SLA guarantees.

Both modes share the same core engine, AI content pipeline, and game mechanics. Enterprise mode adds an administrative layer, compliance reporting, and integration connectors.

---

## 6. Functional Requirements

### 6.1 Core Gameplay

**Email Triage / Phishing Detection**
- FR-GAME-001: The system shall present email access requests with varying levels of legitimacy, from obviously genuine to sophisticated AI-generated phishing
- FR-GAME-002: Emails shall contain analyzable elements: sender domain, display name, email headers (SPF/DKIM), body content, urgency cues, attachment types, and embedded URLs
- FR-GAME-003: The system shall generate phishing emails using AI (Anthropic Claude API primary, self-hosted fallback), with difficulty levels 1-5 and categories including spear phishing, BEC, credential harvesting, malware delivery, and pretexting
- FR-GAME-004: Pre-generated email pool of 200+ emails shall be maintained across difficulty tiers, with batch generation during off-peak hours

**Access Decision Mechanics**
- FR-GAME-005: Players shall have four decision options per request: Approve, Deny, Flag for Review, Request Additional Verification
- FR-GAME-006: Every decision shall produce immediate feedback (revenue/cost), short-term consequences (threat level shift), and delayed consequences (echoes 1-3 chapters later)
- FR-GAME-007: No decision shall have a single "correct" answer; all options carry trade-offs mirroring real-world security risk acceptance

**Resource Management**
- FR-GAME-008: Four interconnected resource systems: Rack Space (measured in U), Bandwidth (Mbps), Power (kW), and Cooling (tons)
- FR-GAME-009: Each accepted client shall consume measurable resources across all four dimensions for the duration of their lease
- FR-GAME-010: Resource exhaustion shall trigger cascading failures (throttling, shutdown, client loss)

**Upgrade Loop**
- FR-GAME-011: Players shall purchase infrastructure upgrades (racks, cooling, power, bandwidth) and security tools (firewall, IDS, IPS, SIEM, EDR, WAF, threat intel feed, SOAR, honeypots, zero-trust gateway, AI anomaly detection)
- FR-GAME-012: Security tools shall have recurring operational costs, modeling real-world security OpEx
- FR-GAME-013: Every upgrade shall introduce new threat vectors (mirroring real-world vulnerability surfaces)
- FR-GAME-014: Facility progression through tiers: Outpost, Station, Vault, Fortress, Citadel

**Breach/Ransom Mechanics**
- FR-GAME-015: A successful breach shall trigger a full-screen ransom note, locking all operations
- FR-GAME-016: Ransom cost equals total lifetime earnings divided by 10, rounded up, minimum 1 CR
- FR-GAME-017: If the player can pay, operations resume with Trust Score penalty and 10-40% client attrition; if they cannot, the game ends
- FR-GAME-018: Breach recovery time scales with security tooling and staff (1-7 days)

**Threat Monitoring**
- FR-GAME-019: Threat level system with five tiers (LOW, GUARDED, ELEVATED, HIGH, SEVERE) affecting attack frequency and sophistication
- FR-GAME-020: Adaptive threat engine that shifts attack vectors based on player behavior (good at detecting phishing triggers supply-chain attacks; strong perimeter triggers insider manipulation)
- FR-GAME-021: Dynamic difficulty through narrative escalation, not a difficulty slider

### 6.2 Enterprise Platform

**Multi-Tenancy & Tenant Isolation**
- FR-ENT-001: Hybrid isolation model -- shared database with schema-level isolation for SMB, dedicated schema for mid-market, dedicated database instance for enterprise
- FR-ENT-002: Every database table shall include non-nullable `tenant_id` column with row-level security enforced at database level
- FR-ENT-003: Cross-tenant queries shall be impossible from the application layer
- FR-ENT-004: Tenant provisioning shall complete in under 5 minutes (automated)
- FR-ENT-005: White-label branding (logo, colors, fonts, custom domains, email templates) with 60-second propagation

**User Provisioning**
- FR-ENT-006: SAML 2.0 SSO (SP-initiated and IdP-initiated) with encrypted assertions
- FR-ENT-007: OIDC/OAuth 2.0 with Authorization Code + PKCE flow
- FR-ENT-008: SCIM 2.0 full compliance (RFC 7643/7644) for automated user provisioning with Okta, Microsoft Entra ID, and Ping Identity
- FR-ENT-009: Just-in-time provisioning on first SSO login for simpler deployments
- FR-ENT-010: SCIM user sync latency under 60 seconds

**Role-Based Access Control**
- FR-ENT-011: Hybrid RBAC + ABAC model with built-in roles: Super Admin, Tenant Admin, Manager, Trainer, Learner
- FR-ENT-012: Custom roles with granular permission composition from platform permission catalog
- FR-ENT-013: Scope restrictions limiting roles to specific departments, teams, or locations
- FR-ENT-014: Time-bound role assignment with expiration dates
- FR-ENT-015: ABAC policy evaluation under 10ms (P99)

**Training Campaign Management**
- FR-ENT-016: Automated campaign scheduling with enrollment rules based on department, role, hire date, risk score
- FR-ENT-017: Escalation workflows: reminder, manager notification, compliance alert
- FR-ENT-018: Configurable training frequencies per regulatory framework (onboarding, quarterly, annual, event-driven)
- FR-ENT-019: Just-in-time training delivery within 60 seconds of triggering event (phishing click, policy violation, DLP alert)
- FR-ENT-020: JIT training throttling (maximum 2 interventions per week per learner)

**Phishing Simulation Engine**
- FR-ENT-021: Multi-channel simulation: email, SMS, voice, QR code
- FR-ENT-022: AI-generated simulation emails using real-time threat intelligence
- FR-ENT-023: Custom simulation templates with visual editor and merge-tag support
- FR-ENT-024: "Teachable moment" landing pages displayed immediately after simulation failure
- FR-ENT-025: Dedicated sending infrastructure with per-customer IP isolation (enterprise tier)
- FR-ENT-026: Full SPF, DKIM (2048-bit RSA minimum), and DMARC alignment
- FR-ENT-027: Email gateway allowlisting documentation and automation for Proofpoint, Mimecast, and Microsoft Defender

**Compliance Reporting & Audit Trails**
- FR-ENT-028: Real-time compliance dashboards per regulatory framework
- FR-ENT-029: Audit-ready report generation with one-click export (PDF, CSV, JSON)
- FR-ENT-030: Immutable, append-only audit logs with SHA-256 cryptographic integrity verification
- FR-ENT-031: Configurable retention policies per framework (1-7 years)
- FR-ENT-032: Individual training transcripts with complete audit trail
- FR-ENT-033: Certificate generation with digital signature, regulatory framework reference, and expiration date
- FR-ENT-034: Management training attestation reports for NIS2 Article 20 and DORA Article 5

**LMS Integration**
- FR-ENT-035: SCORM 1.2 compliant package export (all ADL conformance tests passed)
- FR-ENT-036: SCORM 2004 4th Edition export with IMS Simple Sequencing for adaptive learning paths
- FR-ENT-037: xAPI (v1.0.3 and 2.0) statement emission for all learning-relevant interactions with custom verb vocabulary
- FR-ENT-038: Built-in LRS for organizations without their own
- FR-ENT-039: LTI 1.3 with LTI Advantage (Deep Linking, Assignment & Grade Services, Names & Role Provisioning Services)
- FR-ENT-040: AICC HACP protocol for legacy LMS compatibility
- FR-ENT-041: Verified integrations with Cornerstone, SAP SuccessFactors, Workday, Moodle, and Canvas

**Content Management & Localization**
- FR-ENT-042: Content versioning with full audit trail of changes and reviews
- FR-ENT-043: Annual program review workflow with sign-off (PCI-DSS 12.6.2)
- FR-ENT-044: Professional translation management workflow for 24 EU languages
- FR-ENT-045: Cultural adaptation of phishing simulations (local email conventions, brands, threats)
- FR-ENT-046: RTL language support (Arabic, Hebrew, Farsi)

### 6.3 Consumer Platform

**Free-to-Play Game Mechanics**
- FR-CON-001: Core game playable without payment; no pay-to-win mechanics
- FR-CON-002: Three in-game currencies: Credits (earned through gameplay), Trust Score (reputation gate), Intel Fragments (investigation reward)
- FR-CON-003: Cosmetic-only premium purchases (facility skins, terminal themes, profile insignia)
- FR-CON-004: Season Pass system with free and premium reward tracks

**Season/Episode Content Model**
- FR-CON-005: Seasonal episodic structure: 4 seasons per year, each with 11 chapters over 12 weeks
- FR-CON-006: Each season introduces a central threat, new factions, and new NPCs (Season 1: Signal Loss/Stuxnet; Season 2: Supply Lines/SolarWinds; Season 3: Dark Channels/Ransomware; Season 4: The Inside Job/Insider Threats)
- FR-CON-007: Chapters contain narrative briefing, 3-5 core access decisions, 1 incident event, 1 intelligence update, 1 character moment, and optional side quests

**Social Features & Leaderboards**
- FR-CON-008: Global and regional leaderboards with granular ranking categories
- FR-CON-009: Friend system with social graph
- FR-CON-010: Achievement system with visible and hidden badges mapping to security competencies
- FR-CON-011: Streaming/content creation integration for Twitch and YouTube

**User-Generated Content Tools**
- FR-CON-012: Scenario editor for community-created threat packs
- FR-CON-013: Steam Workshop integration for content distribution
- FR-CON-014: Community marketplace for curated user content

### 6.4 Multiplayer & Social

**Cooperative Play (SOC Team Simulation)**
- FR-MP-001: 2-6 player cooperative missions with interconnected data centers facing shared threat campaigns
- FR-MP-002: Role specialization mapping to real SOC roles: Perimeter Warden (Network Security), Intake Analyst (SOC Tier 1), Threat Hunter (SOC Tier 2/3), Systems Keeper (SysAdmin), Crypto Warden (PKI), Comms Officer (Incident Commander)
- FR-MP-003: Cooperative scenarios: Cascade Failure (supply chain), Bandwidth Siege (DDoS), The Insider (anomaly detection), Data Exodus (distributed data protection)
- FR-MP-004: Difficulty tiers: Training, Standard, Hardened, Nightmare

**Competitive Play (Red Team / Blue Team)**
- FR-MP-005: Classic Red vs. Blue mode with team-swapping rounds
- FR-MP-006: Asymmetric Assault mode (1 skilled attacker vs. 3-5 defenders)
- FR-MP-007: Purple Team cooperative-competitive hybrid
- FR-MP-008: Ranked play with Elo-based matchmaking and independent Red/Blue ranks
- FR-MP-009: Red team tooling (abstracted equivalents of Nmap, Metasploit, SET, Cobalt Strike)
- FR-MP-010: Blue team tooling (abstracted equivalents of SIEM, EDR, sandboxing, forensics, honeypots)

**Guild/Corporation Systems**
- FR-MP-011: Corporation structure mapping to enterprise organizational hierarchy
- FR-MP-012: Corporation progression system with shared intelligence feeds, joint defense operations, and alliance formation
- FR-MP-013: Corporation treasury and shared infrastructure (shared SIEM dashboard, joint honeypot network)
- FR-MP-014: Enterprise Corporation auto-provisioning from organizational structure

**Enterprise Team Competitions**
- FR-MP-015: Department-based team competitions with manager visibility
- FR-MP-016: Organization-wide leaderboards with configurable privacy settings
- FR-MP-017: Cross-organization anonymized benchmarking
- FR-MP-018: Capture-the-flag events, seasonal tournaments, and hackathon events

### 6.5 Analytics & Reporting

**Training Effectiveness KPIs**
- FR-AN-001: Phishing simulation click rate and reporting rate tracking over time
- FR-AN-002: Knowledge retention measurement via spaced repetition assessments
- FR-AN-003: Behavioral change metrics: time-to-report suspicious emails, password hygiene scores, data handling compliance
- FR-AN-004: Competency mapping across domains: phishing detection, password security, data handling, social engineering resistance, incident response, physical security, compliance awareness

**ROI Measurement Framework**
- FR-AN-005: Cost-of-breach avoidance calculator based on organizational risk reduction
- FR-AN-006: Phishing susceptibility reduction tracking (baseline to current)
- FR-AN-007: Training cost per employee comparison against industry benchmarks
- FR-AN-008: Cyber-insurance premium impact tracking

**Executive Dashboards**
- FR-AN-009: CISO dashboard with risk scoring, compliance posture, and board-ready visualizations
- FR-AN-010: Organizational risk heat map by department, location, and role
- FR-AN-011: Trend analysis with predictive risk indicators
- FR-AN-012: Industry benchmarking against anonymized peer data

**Compliance Evidence Generation**
- FR-AN-013: Framework-specific compliance reports (GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, FedRAMP)
- FR-AN-014: Automated compliance gap identification
- FR-AN-015: Training completion certificates with regulatory framework reference
- FR-AN-016: Policy acknowledgment and attestation tracking

**Game Analytics**
- FR-AN-017: Player retention curves (D1, D7, D30, D60, D90)
- FR-AN-018: Session duration and frequency analytics
- FR-AN-019: Content effectiveness scoring per module
- FR-AN-020: A/B testing framework for game mechanics and training content
- FR-AN-021: Predictive analytics for at-risk players (likely to churn or fail assessments)

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|--------|--------|
| Page load time (initial) | < 3 seconds on 4G connection |
| Game state update latency | < 100ms (P95) |
| API response time | < 200ms (P95) |
| Admin dashboard load time | < 2 seconds (P95) |
| Email generation (AI) | < 10 seconds (pre-generated pool eliminates player-perceived latency) |
| WebSocket message delivery | < 50ms (P95) |
| SCIM sync latency | < 60 seconds |

### 7.2 Scalability

| Phase | Concurrent Users | Architecture |
|-------|-----------------|--------------|
| Launch | 10,000 | Modular monolith, single-region |
| Growth | 50,000 | Modular monolith with extracted AI pipeline and analytics services |
| Scale | 100,000+ | Microservices with NATS JetStream or Kafka; multi-region deployment |

Service extraction triggers: AI pipeline extracted when LLM latency affects game loop; analytics extracted when write volume exceeds game DB capacity; threat engine extracted when simulation complexity demands dedicated compute; notification service extracted when WebSocket connections exceed single-process limits.

### 7.3 Availability

| Tier | SLA | Maintenance Window |
|------|-----|-------------------|
| Consumer | 99.5% uptime | Rolling deployments, no scheduled downtime |
| Enterprise Standard | 99.9% uptime | 4-hour monthly maintenance window (scheduled) |
| Enterprise Premium | 99.95% uptime | Zero-downtime deployments |

### 7.4 Security

- OWASP Top 10 compliance for all web application components
- SOC 2 Type II certification (Year 1 target)
- Encryption at rest: AES-256 with jurisdiction-specific key management
- Encryption in transit: TLS 1.2+ with strong cipher suites
- Hardware-backed MFA (FIDO2/WebAuthn) required for Super Admin access
- Maximum Super Admin session duration: 4 hours with no refresh
- Zero-trust integration posture: every integration endpoint authenticated, authorized, encrypted, and audited
- Automated security scanning in CI/CD pipeline
- Annual penetration testing by third-party firm
- Responsible disclosure program

### 7.5 Accessibility

- WCAG 2.1 Level AA compliance as **baseline** (legal obligation, not optional)
- Section 508 compliance for US government market access
- EN 301 549 compliance for EU market (enforcement from June 28, 2025)
- CRT aesthetic effects implemented as CSS overlays on clean, accessible base UI -- all effects disableable
- All interactive elements keyboard accessible with visible focus indicators
- Screen reader support with ARIA roles, properties, and live regions
- Minimum 4.5:1 contrast ratio for all text; 3:1 for large text
- Captions for all video/audio content; transcripts available
- No forced time limits on individual decisions (queue pressure, not per-item timers)
- Color-blind safe palette with secondary encoding (text labels, icons, patterns)
- `prefers-reduced-motion` respected for all animations
- VPAT maintained and updated with each release

### 7.6 Internationalization

- Full support for 24 official EU languages (regulatory requirement under GDPR, NIS2)
- Content localization (not just UI translation) for training modules
- Cultural adaptation of phishing simulations per locale
- RTL language support (Arabic, Hebrew, Farsi)
- Unicode (UTF-8) support across the entire platform
- Locale-specific date, number, and currency formatting

### 7.7 Data Residency

Multi-region deployment model:

| Region | Location | Data Stored | Compliance Driver |
|--------|----------|-------------|-------------------|
| **EU** | Frankfurt / Ireland | EU/EEA resident training data, NIS2/DORA compliance data | GDPR Chapter V, NIS2, DORA |
| **US** | US-East / US-West (GovCloud where required) | US resident data, FedRAMP/FISMA/SOX/HIPAA data | FedRAMP, FISMA, CCPA |
| **UK** | London | UK resident training data | UK GDPR |
| **APAC** | Singapore / Tokyo / Sydney | APAC resident data | APPI, PIPA, local privacy laws |

Customer-configurable data residency preferences. Encryption at rest with jurisdiction-specific key management. Automated logging of all cross-border data transfers.

---

## 8. Technical Architecture

### 8.1 Platform Strategy (Web-First, SvelteKit)

The game is a **web-first application** -- no download, no installation, a URL and a click. This is the lowest-friction entry point in gaming and the most compatible deployment model for enterprise IT environments.

**Key advantages:**
- 0% platform fee on direct web revenue (vs. 30% on app stores)
- Enterprise IT departments more likely to allow browser access than game installations
- Instant updates without app store review cycles
- URL shareability drives organic virality
- PWA capabilities enable offline play and push notifications

### 8.2 Frontend Architecture

**Framework: SvelteKit with Svelte 5 runes**

Archive Gate is fundamentally a DOM application (reading emails, filling worksheets, clicking through documents, monitoring dashboards), not a canvas game. Svelte's compiled reactivity model eliminates virtual DOM diffing overhead, producing the snappiest possible UI transitions for document inspection and panel switching.

**Rendering approach: Hybrid DOM + Canvas**
- **DOM (90% of gameplay):** Emails, worksheets, contracts, dashboards, dialog trees. Provides accessibility, text selection, screen reader support, and native form handling.
- **Canvas/WebGL (10%):** Facility status map, network topology visualization, attack animation overlays. Using PixiJS for 2D visualization and D3.js for data charts.

**State management:**
- Layer 1: Svelte stores for ephemeral UI state (active panel, selected email)
- Layer 2: Game state store (server-authoritative, synced) with TypeScript-typed GameState interface
- Layer 3: Event sourcing -- all game actions recorded as immutable events; state derived by reducing the event log. Provides full replay, undo/redo, deterministic saves, and audit trail.

**Offline capability (PWA):** Service worker with Workbox for precaching app shell and runtime caching game content. Offline content budget: 50 handcrafted email scenarios with graceful degradation when AI content unavailable.

### 8.3 Backend Architecture

**Pattern: Modular monolith evolving to microservices**

Starting with a modular monolith avoids premature microservice decomposition (the leading cause of death in early-stage game backends) while maintaining clear module boundaries for future extraction.

**Module decomposition:**
- `auth` -- Authentication, sessions, JWT
- `game-engine` -- Core game logic, state machine, event processing
- `content` -- Email templates, document generation, scenario library
- `ai-pipeline` -- LLM integration, phishing generation, difficulty engine
- `facility` -- Facility simulation (power, cooling, capacity)
- `threat-engine` -- Attack generation, breach simulation, threat levels
- `analytics` -- Player metrics, learning analytics, reporting
- `billing` -- Subscription management, enterprise licensing
- `admin` -- Admin panel API, player observation
- `notification` -- WebSocket management, push notifications

**Runtime:** Node.js 22 LTS with TypeScript 5.x
**Framework:** Fastify (schema-based validation, plugin system maps to modules)
**ORM:** Drizzle ORM (type-safe, SQL-first)
**Validation:** Zod (shared schemas between client and server)

### 8.4 AI & Dynamic Content Generation

The AI pipeline is the platform's core differentiator for content freshness and personalized difficulty.

**Architecture:** Content Policy (guardrails) --> Prompt Engine (template + context) --> LLM Provider (Claude API / self-hosted) --> Output Parser + Validator --> Quality Score + Difficulty Classification --> Email Pool (Redis)

**LLM provider strategy:**
- Primary: Anthropic Claude API (Sonnet for generation, Haiku for classification)
- Fallback: Self-hosted open-source model (Mistral/Llama) for offline enterprise deployments
- Pre-generation: Batch generate during off-peak; maintain pool of 200+ emails across difficulty tiers

**Safety guardrails:** No real company names, real people, or functional malicious payloads. Output validation rejects emails containing real URLs, phone numbers, or PII.

**Dynamic threat scenario generation:** Multi-step attack scenarios spanning multiple game days, with phases, trigger conditions, and adaptive responses based on player behavior.

### 8.5 Data Architecture

| Data Type | Store | Rationale |
|-----------|-------|-----------|
| Event log (canonical) | PostgreSQL (append-only, partitioned by month) | ACID, queryable, proven at scale |
| Current state snapshot | PostgreSQL (JSONB) | Fast reads without event replay |
| Session data | Redis | Ephemeral, fast, auto-expiring |
| Real-time metrics | Redis Streams | Sub-millisecond reads, time-windowed |
| Long-term analytics | ClickHouse or TimescaleDB | Columnar, optimized for time-series aggregation |
| AI email pool | Redis (list) | LPUSH/RPOP for pool management |
| Leaderboards | Redis sorted sets | ZADD/ZRANGE for ranked queries |

**Event sourcing schema:** Every player action and system event recorded in immutable `game_events` table with session_id, player_id, tenant_id, event_type, event_data (JSONB), timestamps, and monotonic sequence numbers. Snapshots materialized every 50 events or at day boundaries.

### 8.6 Infrastructure & DevOps

**Real-time communication:** WebSocket with SSE fallback for corporate proxy environments.

**Queue systems:** BullMQ on Redis for async operations: AI email generation, analytics event ingestion, notification dispatch, PDF report generation. Pre-generation strategy maintains pool of 20-50 emails per difficulty tier.

**Caching layers:** Browser Cache --> CDN Edge (Cloudflare/CloudFront) --> Application Cache (Redis) --> Database (PostgreSQL). Static assets cached with content-hashed filenames (1-year TTL). Player state cached write-through on state change.

**Deployment:** Containerized (Docker) with Kubernetes orchestration. CI/CD with automated testing, security scanning, and accessibility validation. Blue-green deployments for zero-downtime updates.

### 8.7 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | SvelteKit (Svelte 5) | Application framework, SSR, routing |
| **Language** | TypeScript (strict mode) | Type safety across stack |
| **2D Visualization** | PixiJS | Facility map, network topology, attack animations |
| **Charts** | D3.js | Dashboards, analytics visualizations |
| **Backend Runtime** | Node.js 22 LTS | API server, game logic |
| **Backend Framework** | Fastify | HTTP framework, validation, plugins |
| **ORM** | Drizzle ORM | Type-safe database access |
| **Primary Database** | PostgreSQL | Game state, events, user data |
| **Cache / Realtime** | Redis | Sessions, caching, queues, leaderboards, streams |
| **Analytics DB** | ClickHouse / TimescaleDB | Time-series analytics, learning metrics |
| **AI Provider** | Anthropic Claude API | Phishing email generation, scenario generation |
| **AI Fallback** | Self-hosted Mistral/Llama | Offline enterprise deployments |
| **Queue** | BullMQ | Async job processing |
| **CDN** | Cloudflare / CloudFront | Static assets, edge caching |
| **Infrastructure** | Kubernetes / Docker | Container orchestration |
| **CI/CD** | GitHub Actions | Automated build, test, deploy |
| **Monitoring** | Prometheus + Grafana | Metrics, alerting, observability |

---

## 9. Compliance & Regulatory

### 9.1 Regulatory Framework Summary

The platform operates at the intersection of 14+ overlapping regulatory regimes, functioning both as a **provider of training content** and as a **processor/controller of employee training data**.

| Framework | Training Mandated | Frequency | Phishing Sim Required | Max Penalty | Personal Liability |
|-----------|------------------|-----------|----------------------|-------------|-------------------|
| **GDPR** | Yes (Art. 39, 47) | Annual minimum | Recommended | EUR 20M / 4% turnover | No |
| **CCPA/CPRA** | Yes (Sec. 1798.130) | Annual recommended | No | $7,500/violation | No |
| **HIPAA** | Yes (45 CFR 164.308) | Ongoing; annual minimum | Recommended | ~$2M/category annually | Criminal possible |
| **SOX** | Implicit (Sec. 302, 404) | Annual (audit cycle) | No | $5M + 20 years | **Yes (officers)** |
| **PCI-DSS 4.0** | Yes (Req. 12.6) | Upon hire + annually | Strongly implied | $100K/month | No (contractual) |
| **NIS2** | Yes (Art. 20, 21) | Regular (mandatory for management) | Recommended | EUR 10M / 2% turnover | **Yes (management)** |
| **DORA** | Yes (Art. 5, 13, 16) | Compulsory, regular | Implied by testing | 1% daily turnover | **Yes (management)** |
| **ISO 27001** | Yes (Cl. 7.2, 7.3, A.6.3) | Regular + on policy change | Recommended | Certification loss | No |
| **NIST CSF 2.0** | Recommended (PR.AT) | Per implementation tier | Recommended | N/A (framework) | No |
| **SOC 2** | Yes (CC1.4) | At least annually | Increasingly expected | Attestation loss | No |
| **FedRAMP** | Yes (AT-2, AT-3) | Upon hire + annually | Yes (AT-2(3)) | Authorization revocation | No |
| **GLBA** | Yes (Safeguards Rule) | At least annually | Recommended | $100K/violation | $10K individuals |
| **FISMA** | Yes (NIST 800-53) | Upon hire + annually | Yes (AT-2 enhancements) | N/A (federal) | No |

### 9.2 Training Content Requirements by Framework

**Tier 1 -- Universal Awareness (All Employees):**
Phishing recognition (PCI-DSS, FedRAMP, NIS2, DORA), social engineering awareness (PCI-DSS, FedRAMP, ISO 27001), password management (HIPAA, ISO 27001, NIST), malware prevention (HIPAA, ISO 27001), data classification and handling (GDPR, CCPA, HIPAA, PCI-DSS), incident reporting (all frameworks), acceptable use (PCI-DSS, ISO 27001, SOC 2), insider threat recognition (FedRAMP, FISMA, NIST).

**Tier 2 -- Role-Based Training:**
Secure SDLC (PCI-DSS Req. 6.2.2), incident response procedures (all), access control administration (HIPAA, PCI-DSS), third-party risk management (DORA, NIS2), ICT operational resilience (DORA), data protection impact assessments (GDPR).

**Tier 3 -- Executive and Board Training:**
Cybersecurity risk governance (NIS2 Art. 20, DORA Art. 5, SEC), incident disclosure and communication (SEC, NIS2, GDPR), fiduciary duties related to cyber risk (NIS2 personal liability, SOX).

### 9.3 Data Protection Requirements

**Categories of personal data processed:** Identity data, authentication data, training performance data, phishing simulation data (high sensitivity -- may impact employment), behavioral analytics, communication data, technical data.

**GDPR obligations:** Lawful basis documented per processing activity, data minimization by design, configurable retention periods, individual data export (Art. 15), data deletion capability (Art. 17), DPIA for phishing simulations and behavioral analytics, 72-hour breach notification capability, cross-border transfer mechanisms (SCCs, EU-US DPF).

**Employee privacy safeguards:** Aggregate reporting by default (no individual disciplinary use without separate policy), transparent phishing simulation disclosure, no linking of training performance to HR decisions without explicit policy, pseudonymization engine with separate key management.

### 9.4 Audit Trail & Record Retention

| Framework | Retention Period | Platform Requirement |
|-----------|-----------------|---------------------|
| HIPAA | 6 years | Training records retained 6 years from creation |
| SOX | 7 years | Audit-relevant records retained 7 years |
| FedRAMP/FISMA | 3 years | Individual training records per NIST AT-4 |
| DORA | 5 years | Available for supervisory authority review |
| ISO 27001 | 3 years minimum | Through certification cycle |
| PCI-DSS | 1 year minimum | Logs: 3 months hot, 12 months accessible |
| GLBA | 5 years | Per FTC Safeguards Rule |
| GDPR | Purpose-limited | Delete when no longer needed |

Platform design: configurable retention policies per framework, with longest applicable period governing. Automated deletion/anonymization at expiration. Immutable audit logs with cryptographic integrity verification.

### 9.5 Accessibility Compliance

WCAG 2.1 Level AA is the minimum standard, with Section 508 for US government and EN 301 549 for EU markets. The game's terminal aesthetic is implemented as CSS overlays on a clean, accessible base. All CRT effects (scanlines, curvature, glow, noise) are disableable without losing functionality. Game-based elements have non-game alternatives. Timed assessments allow time extension. VPAT published and maintained.

### 9.6 Compliance Priority Matrix

**Priority 1 -- Must-Have at Launch:** GDPR, HIPAA, PCI-DSS 4.0, ISO 27001, SOC 2, WCAG 2.1 AA, Section 508

**Priority 2 -- Within 6 Months:** NIS2, DORA, FedRAMP authorization pathway, CCPA/CPRA, SOX

**Priority 3 -- Within 12 Months:** NIST CSF 2.0 alignment, GLBA, CMMC, EN 301 549, multi-region data residency, additional state privacy laws

---

## 10. Enterprise Integration

### 10.1 Security Stack (SIEM, SOAR)

**SIEM Integration:**

| Platform | Integration Method | Key Features |
|----------|--------------------|-------------|
| **Splunk** | HTTP Event Collector + REST API | CIM-compliant events, certified Splunk App with pre-built dashboards, adaptive response actions |
| **IBM QRadar** | Syslog (LEEF) + REST API | Custom DSM with QID mapping, offense correlation, reference set updates |
| **Microsoft Sentinel** | Azure Monitor Data Collector API | Custom tables, pre-built workbook with KQL, analytics rules, native data connector |
| **Elastic Security** | Elasticsearch Bulk API + Elastic Agent | ECS-compliant events, ILM policies, detection rules, Kibana dashboards |

**Universal SIEM requirements:** CEF/LEEF/Syslog fallback for unsupported platforms, generic HTTPS webhook output, per-integration event filtering, ISO 8601 timestamps, UUIDv7 event deduplication, published JSON Schema for all event types.

**SOAR Integration:**

| Platform | Integration Method | Key Capabilities |
|----------|--------------------|-----------------|
| **Palo Alto Cortex XSOAR** | Certified content pack + REST API | Custom incident types, indicator enrichment, pre-built playbooks for auto-enrollment and escalation |
| **Swimlane** | Turbine connector + REST API | Actions, triggers, field mappings, reusable playbook components |

All SOAR integrations: bidirectional API (push and pull), idempotent operations, rate limit awareness via response headers.

### 10.2 LMS/LTI Integration

Verified integrations with Cornerstone OnDemand, SAP SuccessFactors, Workday Learning, Moodle, and Canvas. Additional platform compatibility: Docebo, Absorb, TalentLMS, Litmos, Blackboard, Brightspace, Totara, 360Learning, LearnUpon, Google Classroom.

Integration standards: SCORM 1.2 (mandatory), SCORM 2004 4th Ed (mandatory), xAPI 1.0.3/2.0 (mandatory), LTI 1.3 with Advantage (mandatory), cmi5 (mandatory), AICC HACP (recommended for legacy).

### 10.3 Identity Providers (SSO/SAML/OIDC)

| Provider | SSO | SCIM 2.0 | Additional |
|----------|-----|----------|-----------|
| **Okta** | SAML 2.0 + OIDC; OIN listing | Full provisioning + group push | Okta Workflows connector, JIT provisioning |
| **Microsoft Entra ID** | SAML 2.0 + OIDC; Entra Gallery listing | Full provisioning via Entra auto-provisioning | Graph API, Conditional Access, nested groups, B2B/B2C |
| **Ping Identity** | SAML 2.0 + OIDC via PingFederate/PingOne | SCIM via PingOne Directory | PingOne DaVinci connector |

Universal IdP: SAML 2.0 (SP- and IdP-initiated, encrypted assertions), OIDC (Authorization Code + PKCE), SCIM 2.0 (RFC 7643/7644, bulk operations, pagination, filtering), configurable sync frequency (15-minute minimum to real-time push), back-channel logout.

### 10.4 Communication Platforms (Teams, Slack)

**Microsoft Teams:** Bot Framework v4 with adaptive cards; personal and channel tabs; training reminders, phishing report forwarding, micro-learning modules delivered inline, risk dashboard, leaderboards. Published to Teams App Store.

**Slack:** Events API + Web API + Bolt SDK; slash commands (/thedmz status, leaderboard, report, train, risk); Block Kit notifications; App Home dashboard; Enterprise Grid support. Published to Slack App Directory.

**Email:** Dedicated MTA infrastructure with per-customer IP isolation, 1M emails/hour sustained throughput, 99%+ inbox delivery rate, automated IP warm-up, SPF/DKIM/DMARC alignment.

### 10.5 HR Systems (HRIS/HCM)

Bidirectional integration with Workday, BambooHR, SAP SuccessFactors, and ADP for organizational structure synchronization, user lifecycle management, and event-driven training triggers (new hire, department transfer, role change, termination).

### 10.6 API Strategy

**Principles:** API-first design (every UI feature available via documented, versioned API), zero-trust integration posture, event-driven by default (async webhooks over polling), tenant isolation in multi-tenant deployments, graceful degradation with event queuing.

**Technical specifications:**
- RESTful API with OpenAPI 3.0 specification
- GraphQL endpoint for complex analytical queries
- Webhook delivery with HMAC signature verification
- OAuth 2.0 client credentials for service-to-service
- Rate limiting with `X-RateLimit-Remaining` and `Retry-After` headers
- Versioned endpoints (v1, v2) with 12-month deprecation windows

---

## 11. Game Design

### 11.1 Gamification Framework (Octalysis)

The game is designed using Yu-kai Chou's Octalysis Framework, the industry standard for behavioral design with 3,300+ academic citations. All eight Core Drives are engaged:

| Core Drive | Weight | Implementation in Archive Gate |
|-----------|--------|-------------------------------|
| **1. Epic Meaning & Calling** | High | Player is the last line of defense for human knowledge; every decision has existential stakes |
| **2. Development & Accomplishment** | High | Upgrade loop, facility tier progression (Outpost to Citadel), security skill ratings |
| **3. Empowerment of Creativity** | High | Multiple valid strategies (security-first, capacity-first, balanced); no single walkthrough exists |
| **4. Ownership & Possession** | High | Data center as personal domain; client portfolio curated over time; ransom threatens everything built |
| **5. Social Influence & Relatedness** | Medium | Parasocial client relationships; Morpheus as mentor; organizational leaderboards; team challenges |
| **6. Scarcity & Impatience** | High | Limited rack space/bandwidth/power; lease expirations; upgrade lead times |
| **7. Unpredictability & Curiosity** | High | Evolving threat landscape; procedural email generation; hidden lore; unknown outcomes |
| **8. Loss & Avoidance** | Very High | Ransom mechanic (total earnings / 10); full-screen lockout; permanent incident logs; game over risk |

The design leans White Hat (Drives 1-3) for sustained engagement while deploying Black Hat (Drives 6-8) strategically for urgency and stakes.

### 11.2 Learning Theory Integration

Six learning theories inform the design:

**Experiential Learning (Kolb):** The four-stage cycle maps directly to gameplay. Concrete Experience (analyzing a phishing email), Reflective Observation (post-decision feedback), Abstract Conceptualization (Phishing Analysis Worksheet), Active Experimentation (applying lessons to next email).

**Situated Learning (Lave & Wenger):** Learning occurs in context. Players do not study phishing theory; they detect phishing while running a data center. Skills transfer because the context mirrors real-world conditions.

**Stealth Learning:** The guiding principle -- players learn best when they do not know they are learning. The story is the curriculum, the characters are the threat landscape, the moral dilemmas are the exam.

**Spaced Repetition:** Modified Leitner system with SM-2 algorithm. Intervals from 1 day (new concept) to 180 days (mastered). Review sessions under 2 minutes, delivered via multiple channels. Interleaving of review topics for improved discrimination.

**Constructivism:** Players construct their own understanding through active decision-making. No correct playthrough exists; the player builds a personal mental model of security through experience.

**Zone of Proximal Development (Vygotsky):** Dynamic difficulty ensures the player is always operating just beyond their current skill level. Morpheus provides contextual scaffolding without solving problems.

### 11.3 Narrative Architecture

**River delta model:** Narrative branches diverge and reconverge around Nexus Points, allowing player agency while keeping content scope manageable.

**Four structural layers:** Spine (fixed major events), Branches (visible decision points), Tendrils (minor variations creating responsiveness), Echoes (delayed consequences manifesting 1-3 chapters later).

**Emergent storytelling through three interacting systems:** Queue System (randomized email generation), Reputation System (five faction axes with threshold-triggered events), Threat Escalation System (adaptive attack vectors based on player behavior).

**Season structure:** 4 seasons per year, each 12 weeks with 11 chapters across three acts (Setup, Escalation, Crisis) plus a Finale. Season 1: Signal Loss (phishing/access control). Season 2: Supply Lines (supply chain). Season 3: Dark Channels (ransomware). Season 4: The Inside Job (insider threats).

### 11.4 Economy & Progression Systems

**Three currencies:**
- **Credits (CR):** Operational revenue. Earned through client contracts, threat detection, clean operations. Spent on upgrades, tools, staff, ransom payments. Models security as a business decision.
- **Trust Score (TS):** Reputation gate (0-500+). Unlocks client tiers, contracts, and narrative content. Cannot be purchased; earned through consistent good judgment.
- **Intel Fragments (IF):** Investigation reward. Earned through attack analysis and incident investigation. Spent on detection signatures, threat profiles, and IDS upgrades. Rewards curiosity and thoroughness.

**Resource management:** Four interconnected systems (Rack Space, Bandwidth, Power, Cooling) creating constraint-satisfaction puzzles that mirror real data center capacity planning. Super-linear maintenance cost scaling prevents infinite expansion.

**Breach economy:** Operations lock behind ransom note. Cost = total lifetime earnings / 10. Recovery takes 1-7 days. 10-40% client attrition. 30-day post-breach revenue depression. Designed to feel devastating without being unrecoverable.

**Player progression:** 30 levels (Intern to CISO) with XP earned through security-correct actions. Prestige levels 31-50 with cosmetic rewards. Facility tiers: Outpost, Station, Vault, Fortress, Citadel.

### 11.5 UX/UI Design Philosophy

**Diegetic first:** Every UI element exists within the game world. The interface is a virtual workstation at the Matrices GmbH data center.

**Papers, Please-inspired:** Document inspection, stamp-based approval/denial, physical desk metaphor, moral weight of bureaucratic decisions.

**Terminal aesthetic:** Monospaced primary font, dark background (#0a0e14), phosphor green (#33ff33) or amber (#ffb000) text, CRT effects as CSS overlays on clean base. All effects disableable without functional loss.

**Friction as pedagogy:** Deliberate friction (verifying sender details, cross-referencing documents) mirrors real security workflows. The inconvenience is the lesson.

**No batch actions:** Each access request demands individual attention. This is deliberate, mirroring real security review.

### 11.6 Difficulty & Adaptive Learning

**Dynamic difficulty is a function of narrative, not a slider:**

`Difficulty = f(Player Skill, Story Progress, Player Choices)`

Player skill inferred from detection rate, response time, resource efficiency, and pattern recognition. Story progress sets baseline difficulty floor. Player choices modify the curve (well-defended facility faces smarter attackers; poorly defended faces more frequent but simpler attacks).

**Narrative justification:** Every difficulty change is a story event. "Attackers have learned from their failures." "Your data center is famous now." Players experience escalation as narrative consequence.

**Breathing rooms:** After major incidents, recovery chapters with lower-threat requests prevent burnout and mirror real-world attack pattern ebbs.

**Adaptive learning engine:** Adjusts content selection, ordering, and difficulty per learner in real-time. Maintains competency model across seven domains. Administrators can set minimum competency thresholds triggering mandatory remediation.

---

## 12. Monetization Strategy

### 12.1 Enterprise (B2B) Revenue Model

| Tier | Users | Price | Includes |
|------|-------|-------|---------|
| **Starter** | 50-500 | $3-5/user/month | Core game training, phishing simulation, basic reporting, SCORM/LTI export |
| **Professional** | 500-5,000 | $5-8/user/month | + SSO, SCIM, LMS integration, advanced analytics, campaign management |
| **Enterprise** | 5,000+ | $8-15/user/month | + Dedicated instance, SIEM/SOAR integration, custom content, API access, dedicated CSM |
| **Government** | Custom | Custom | + FedRAMP compliance, data sovereignty, air-gapped deployment option |

**Additional revenue streams:**
- Implementation and onboarding fees ($5K-$50K based on complexity)
- Custom content development ($25K-$100K per engagement)
- Premium support tiers (24/7 SLA)
- Annual program review and optimization consulting

**Enterprise pricing strategy:** 15-25% discounts for multi-year (3-year) commitments. Volume discounts above 10,000 seats. MSP/reseller program for channel distribution.

### 12.2 Consumer (B2C) Revenue Model

| Revenue Stream | Model | Price Point | Contribution |
|---------------|-------|-------------|-------------|
| **Web (Direct)** | Premium base game | $14.99 one-time | Primary at launch |
| **Steam** | Premium with seasonal DLC | $14.99 base + $4.99-$9.99/season | High margin after 30% cut |
| **Mobile** | Free-to-play with IAP | Free base; $2.99-$4.99 season pass | Volume driver |
| **Cosmetics** | Terminal themes, facility skins, insignia | $0.99-$4.99 per item | Recurring |
| **Subscription** | "Archive Pass" premium tier | $4.99/month | Recurring; unlocks all seasonal content |
| **Certifications** | Exportable cybersecurity competency certificates | $9.99-$29.99 per certificate | High margin |

### 12.3 Ethical Monetization Principles

1. **No pay-to-win:** No purchasable currency or item affects gameplay power, difficulty, or security skill assessment accuracy
2. **No predatory mechanics:** No loot boxes, no gacha, no artificial energy systems gating core gameplay
3. **Educational value first:** Free-to-play players receive complete cybersecurity training through core gameplay
4. **Transparency:** All purchases clearly described; no hidden costs or confusing currency conversions
5. **Enterprise neutrality:** Enterprise training outcomes never influenced by monetization; compliance reporting integrity is absolute

### 12.4 Revenue Projections

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Enterprise customers | 50 | 500 | 2,000 |
| Enterprise ACV | $15K | $20K | $25K |
| Enterprise ARR | $750K | $10M | $50M |
| Consumer players (registered) | 500K | 5M | 20M |
| Consumer MAU | 100K | 1M | 5M |
| Consumer revenue | $500K | $5M | $20M |
| **Total revenue** | **$1.25M** | **$15M** | **$70M** |

---

## 13. Go-to-Market Strategy

### 13.1 Enterprise GTM

**Phase 1 (Months 1-6): Design Partners**
- Recruit 10 design partner organizations across healthcare, financial services, and technology sectors
- Offer deeply discounted or free access in exchange for feedback, case studies, and referenceable deployments
- Focus on proving behavioral change metrics (phishing click rate reduction, knowledge retention)

**Phase 2 (Months 6-12): Direct Sales**
- Hire sales team targeting mid-market and enterprise CISOs
- Leverage design partner case studies and validated metrics
- Attend RSA Conference, Black Hat, ISACA events
- Publish third-party validated efficacy study

**Phase 3 (Months 12-18): Channel Expansion**
- MSP/reseller partner program for SMB distribution
- Cyber-insurance partnerships (bundled training + insurance offering)
- LMS marketplace listings (Cornerstone, SAP SuccessFactors ecosystem)
- GSA Schedule listing for US government market

### 13.2 Consumer GTM

**Phase 1 (Months 1-3): Community Building**
- Steam Next Fest demo participation
- Reddit engagement (r/cybersecurity, r/gaming, r/IndieGaming, r/tycoon)
- Cybersecurity influencer outreach (content creators, podcast appearances)
- Wishlist campaign targeting 50,000 wishlists before launch

**Phase 2 (Months 3-6): Launch**
- Steam Early Access release at $14.99
- Web browser free demo (first 3 chapters)
- Press outreach emphasizing "Papers, Please meets cybersecurity" hook
- Streamer key distribution (Twitch, YouTube)

**Phase 3 (Months 6-12): Mobile & Scale**
- iOS and Android launch (free-to-play with season pass)
- App Store feature campaign (Apple "Apps We Love" potential)
- Localization into top European languages
- Seasonal content cadence (new season every 12 weeks)

### 13.3 Consumer-to-Enterprise Pipeline

The consumer game creates a bottom-up enterprise acquisition channel:
1. Employee plays Archive Gate on their personal device
2. Employee's cybersecurity awareness improves (measurable through in-game metrics)
3. Employee recommends to IT/security team or HR
4. Organization evaluates enterprise version
5. Enterprise deployment with compliance features and integration

This "reverse enterprise" motion mirrors Slack, Zoom, and Notion -- products that entered organizations through individual adoption. The consumer game reduces enterprise CAC by creating pre-qualified, enthusiastic internal champions.

### 13.4 Marketing Channels

| Channel | Audience | Approach | Budget Allocation |
|---------|----------|----------|-------------------|
| Content marketing (blog, research) | CISOs, IT Directors | Thought leadership on engagement crisis; published research | 20% |
| Industry events (RSA, Black Hat) | Enterprise buyers | Speaking slots, booth presence, demo stations | 15% |
| Steam/App Store optimization | Consumer gamers | Wishlist campaigns, review management, feature negotiations | 15% |
| Influencer/streamer | Gaming + cybersecurity audiences | Key distribution, sponsored content, podcast appearances | 15% |
| Social media (LinkedIn, Reddit, X) | Both audiences | Organic content, community engagement | 10% |
| Paid acquisition | Consumer (mobile) | App Store ads, Facebook/Instagram gaming | 10% |
| PR/media | Both audiences | Launch coverage, feature stories, efficacy research | 10% |
| Partner marketing | Enterprise (channel) | MSP co-marketing, insurance partner campaigns | 5% |

---

## 14. Risk Analysis

### 14.1 Market Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Enterprise buyers skeptical of "game" for compliance training | High | High | Lead with behavioral change data, not game mechanics; design partner case studies; SOC 2 certification |
| Consumer market fails to adopt (Papers, Please was lightning in a bottle) | Medium | High | Web-free demo lowers barrier; mobile F2P provides volume; don't over-invest in consumer before validation |
| Market timing: NIS2 enforcement delays reduce EU urgency | Medium | Medium | Diversify across US (SEC, HIPAA) and EU markets; compliance priority matrix ensures value regardless |
| Competitor response from incumbents (KnowBe4, Proofpoint add gamification) | High | Medium | Incumbents cannot easily retrofit engagement into compliance-first architectures; narrative depth is a multi-year moat |

### 14.2 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| AI content quality inconsistency (bad phishing emails undermine training) | Medium | High | Multi-layer validation pipeline; human review cadence; pre-generated pool with quality scoring |
| Scalability challenges at 100K+ concurrent | Low | High | Modular monolith with clear extraction paths; load testing at 10x target from early development |
| SvelteKit ecosystem maturity (smaller hiring pool) | Medium | Medium | TypeScript competence transfers; Svelte learning curve is short; invest in documentation |
| Cross-platform save sync conflicts | Medium | Medium | Server-authoritative state; event sourcing provides deterministic conflict resolution |

### 14.3 Regulatory Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| GDPR enforcement action for employee training data handling | Low | Critical | Privacy by design; DPIA for phishing simulations; pseudonymization; configurable retention |
| FedRAMP authorization timeline exceeds plan | High | Medium | Phase government market entry; pursue FedRAMP Ready designation first |
| EU AI Act applicability to adaptive learning engine | Medium | Medium | Monitor regulatory guidance; implement explainability features; maintain human override |
| Cross-border data transfer mechanism invalidation (Schrems III) | Low | High | Multi-region deployment ready; data residency controls; technical measures (encryption, pseudonymization) |

### 14.4 Competitive Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Duolingo enters cybersecurity education | Low | Critical | First-mover advantage; enterprise integration depth; narrative quality as moat |
| Major gaming studio creates competing product | Low | High | Speed to market; enterprise compliance expertise; cybersecurity domain knowledge |
| Open-source cybersecurity training game emerges | Medium | Medium | Enterprise features, AI pipeline, and support as differentiators; consider open-sourcing consumer core |
| Price war among enterprise incumbents | High | Medium | Differentiate on engagement and outcomes, not price; prove ROI to justify premium |

### 14.5 Mitigation Strategies

**Build defensible moats:**
1. **Narrative depth:** Multi-season, branching story with emergent gameplay -- years of content investment that cannot be copied quickly
2. **AI pipeline:** Proprietary prompt engineering, content validation, and difficulty calibration for cybersecurity-specific email generation
3. **Enterprise integration depth:** SIEM, SOAR, LMS, HRIS integrations with pre-built apps/connectors create switching costs
4. **Community:** User-generated content, competitive events, and guild systems create network effects
5. **Data advantage:** Aggregate behavioral data from millions of players improves AI content quality, difficulty calibration, and efficacy research

---

## 15. Implementation Roadmap

### Phase 1: MVP / Core Game (Months 1-6)

| Month | Milestone |
|-------|-----------|
| 1-2 | SvelteKit project setup; core email triage UI; game state management; PostgreSQL schema; basic facility dashboard |
| 2-3 | AI phishing email pipeline (Claude API); 50 handcrafted scenarios; phishing analysis worksheet; verification packet viewer |
| 3-4 | Upgrade loop; resource management (4 systems); breach/ransom mechanic; threat level system; Season 1 narrative (Act I) |
| 4-5 | Terminal aesthetic; responsive design; PWA offline support; accessibility audit; Season 1 (Act II) |
| 5-6 | Steam Early Access build; web demo (3 chapters); basic analytics; Season 1 (Act III + Finale); beta testing with design partners |

**Phase 1 Deliverables:** Playable single-player game on web and Steam; AI-generated content pipeline; core email triage, upgrade, and breach mechanics; Season 1 complete; 10 enterprise design partners onboarded.

### Phase 2: Enterprise Features (Months 4-9)

| Month | Milestone |
|-------|-----------|
| 4-5 | Multi-tenancy architecture; tenant provisioning; basic admin dashboard |
| 5-6 | SSO (SAML 2.0, OIDC); SCIM 2.0 provisioning; RBAC with built-in roles |
| 6-7 | SCORM 1.2/2004 export; xAPI statement emission; LTI 1.3 integration; phishing simulation campaign engine |
| 7-8 | Compliance reporting (GDPR, HIPAA, PCI-DSS); audit trail; certificate generation; white-labeling |
| 8-9 | SIEM integration (Splunk, Sentinel); campaign management automation; enterprise analytics dashboards; SOC 2 Type II audit begins |

**Phase 2 Deliverables:** Full enterprise platform; SSO/SCIM/LMS integration; phishing simulation engine; compliance reporting for 7 frameworks; 50 enterprise customers.

### Phase 3: Consumer Launch (Months 6-12)

| Month | Milestone |
|-------|-----------|
| 6-8 | Season 2 development; mobile UI adaptation; cross-platform save sync |
| 8-9 | iOS and Android build; App Store submissions; mobile-specific monetization (F2P + Season Pass) |
| 9-10 | Consumer social features: leaderboards, achievements, friend system; Season 2 launch |
| 10-11 | Cooperative multiplayer (2-player missions); basic guild system; community forums |
| 11-12 | Season 3 development; Steam Workshop integration; streamer tools; competitive Red vs. Blue mode |

**Phase 3 Deliverables:** Mobile launch; 3 seasons of content; multiplayer foundation; 500K registered players; Steam "Very Positive" rating.

### Phase 4: Scale & Expand (Months 12-18)

| Month | Milestone |
|-------|-----------|
| 12-13 | Multi-region deployment (EU, US, UK); data residency controls; FedRAMP Ready designation |
| 13-14 | Advanced SOAR integration; additional SIEM platforms (QRadar, Elastic); GRC platform connectors |
| 14-15 | Full multiplayer suite (6-player co-op, Red vs. Blue ranked, async multiplayer); Season 4 launch |
| 15-16 | Localization into 12 EU languages; cultural adaptation of phishing simulations |
| 16-17 | UGC platform; community marketplace; advanced AI features (personalized threat scenarios) |
| 17-18 | Predictive analytics; ROI measurement framework; MSP/reseller channel launch; Series A metrics achieved |

**Phase 4 Deliverables:** Global multi-region platform; full SIEM/SOAR/GRC ecosystem; 4 seasons of content; complete multiplayer suite; 2,000 enterprise customers; 20M registered players.

---

## 16. Success Metrics & KPIs

### Launch Metrics (Month 6)

| Metric | Target |
|--------|--------|
| Enterprise design partners | 10 |
| Enterprise paid customers | 20 |
| Steam wishlists at launch | 50,000 |
| Registered players (all platforms) | 50,000 |
| Steam review rating | Positive (>80%) |
| Core game session length (median) | 15-25 minutes |

### Growth Metrics (Month 12)

| Metric | Target |
|--------|--------|
| Enterprise customers | 50 |
| Enterprise ARR | $750K |
| Registered players | 500,000 |
| Monthly active users (MAU) | 100,000 |
| Consumer revenue | $500K |
| Mobile downloads | 200,000 |

### Engagement Metrics (Ongoing)

| Metric | Target |
|--------|--------|
| D1 retention (consumer) | >50% |
| D7 retention (consumer) | >30% |
| D30 retention (consumer) | >15% |
| Enterprise training completion rate | >90% |
| Voluntary return rate (consumer) | >75% D7 |
| Average sessions per week (active players) | 3-5 |
| Session duration (median) | 15-25 minutes |
| NPS (enterprise) | >50 |
| NPS (consumer) | >40 |

### Learning Outcomes (Enterprise)

| Metric | Baseline | 6-Month Target | 12-Month Target |
|--------|----------|---------------|-----------------|
| Phishing click rate | ~30% | <15% | <5% |
| Phishing reporting rate | ~7% | >30% | >60% |
| Knowledge retention (30-day assessment) | ~5% (traditional) | >60% | >75% |
| Mean time to report suspicious email | >24 hours | <2 hours | <5 minutes |
| Security awareness quiz score | ~50% | >75% | >85% |

### Revenue Milestones

| Milestone | Target Date |
|-----------|-------------|
| First enterprise revenue | Month 4 |
| $100K ARR | Month 8 |
| $1M ARR | Month 12 |
| $10M ARR | Month 18 |
| $50M ARR | Month 30 |
| Consumer revenue $1M | Month 14 |
| Consumer revenue $10M | Month 24 |

---

## 17. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **ABAC** | Attribute-Based Access Control -- authorization based on dynamic attributes |
| **BEC** | Business Email Compromise -- phishing targeting business transactions |
| **CISO** | Chief Information Security Officer |
| **CRT** | Cathode Ray Tube -- the visual aesthetic reference for the game interface |
| **DORA** | Digital Operational Resilience Act (EU Regulation 2022/2554) |
| **DPIA** | Data Protection Impact Assessment (GDPR Article 35) |
| **EDR** | Endpoint Detection and Response |
| **FedRAMP** | Federal Risk and Authorization Management Program |
| **HRIS** | Human Resource Information System |
| **IDS/IPS** | Intrusion Detection/Prevention System |
| **JIT** | Just-In-Time (training delivered at the moment of a security behavior gap) |
| **LMS** | Learning Management System |
| **LRS** | Learning Record Store (xAPI data repository) |
| **LTI** | Learning Tools Interoperability |
| **NIDHOGG** | The fictional Stuxnet variant in the game's narrative |
| **NIS2** | Network and Information Security Directive 2 (EU Directive 2022/2555) |
| **PCI-DSS** | Payment Card Industry Data Security Standard |
| **PWA** | Progressive Web Application |
| **RBAC** | Role-Based Access Control |
| **SCIM** | System for Cross-domain Identity Management |
| **SCORM** | Sharable Content Object Reference Model |
| **SIEM** | Security Information and Event Management |
| **SOAR** | Security Orchestration, Automation, and Response |
| **SOC** | Security Operations Center |
| **SSO** | Single Sign-On |
| **UGC** | User-Generated Content |
| **xAPI** | Experience API (Tin Can API) -- learning data standard |

### Appendix B: Regulatory Framework Reference Table

| Framework | Primary Legal Text | Key Training Section | Issuing Authority | Penalty Tier |
|-----------|-------------------|---------------------|-------------------|-------------|
| GDPR | Regulation (EU) 2016/679 | Art. 39(1)(b), Art. 47(2)(n) | European Parliament | EUR 20M / 4% |
| CCPA/CPRA | Cal. Civ. Code 1798.100-199.100 | Sec. 1798.130(a)(6) | California Legislature | $7,500/violation |
| HIPAA | 45 CFR Parts 160, 164 | 45 CFR 164.308(a)(5) | HHS (OCR) | ~$2M/category |
| SOX | Pub. L. 107-204 | Sec. 302, 404 | SEC | $5M + imprisonment |
| PCI-DSS | PCI DSS v4.0.1 | Req. 12.6 | PCI SSC | $100K/month |
| NIS2 | Directive (EU) 2022/2555 | Art. 20(2), Art. 21(2)(g) | European Parliament | EUR 10M / 2% |
| DORA | Regulation (EU) 2022/2554 | Art. 5(4), 13(6), 16(1) | European Parliament | 1% daily turnover |
| ISO 27001 | ISO/IEC 27001:2022 | Cl. 7.2, 7.3; Annex A 6.3 | ISO/IEC | Certification loss |
| NIST CSF | NIST CSWP 29 (CSF 2.0) | PR.AT-01, PR.AT-02 | NIST | N/A (framework) |
| SOC 2 | Trust Services Criteria | CC1.4, CC2.2 | AICPA | Attestation loss |
| FedRAMP | NIST SP 800-53 Rev. 5 | AT-1 through AT-6 | FedRAMP PMO | Authorization loss |
| GLBA | 16 CFR Part 314 | Sec. 314.4(e) | FTC | $100K/violation |
| FISMA | 44 U.S.C. 3551-3558 | NIST SP 800-53 AT family | OMB / NIST | N/A (federal) |

### Appendix C: Competitor Comparison Matrix

| Capability | KnowBe4 | Proofpoint | SANS | Hoxhunt | CybSafe | Ninjio | **The DMZ** |
|-----------|---------|-----------|------|---------|---------|--------|------------|
| Content engagement | Low | Low | Medium | High | Medium | High | **Very High** |
| Behavioral change measurement | Low | Medium | Medium | High | High | Low | **High** |
| Consumer product | No | No | No | No | No | No | **Yes** |
| Game-native learning | No | No | No | Partial | No | No | **Yes** |
| Adaptive difficulty | Partial | Partial | No | Yes | No | No | **Yes (AI-driven)** |
| Narrative depth | None | None | None | None | None | Medium | **Very High** |
| Multiplayer / social | None | None | None | Leaderboards | None | None | **Co-op, PvP, Guilds** |
| SIEM/SOAR integration | Limited | Good | Limited | Limited | Limited | None | **Full ecosystem** |
| LMS integration | SCORM | SCORM | SCORM | Limited | Limited | Limited | **SCORM + xAPI + LTI + cmi5** |
| Multi-language | Good | Good | Good | Good | Limited | Good | **24 EU languages** |
| Mobile native | Partial | No | No | Partial | Yes | Partial | **Yes (PWA + native)** |
| Pricing transparency | Low | Low | Low | Low | Low | Medium | **High** |

### Appendix D: Game Mechanic to Security Skill Mapping (Complete)

| Game Mechanic | In-Game Document | Security Skill | NIST CSF Category | Assessment Method |
|---------------|-----------------|----------------|-------------------|-------------------|
| Email triage | Email Access Request | Phishing detection | PR.AT-01 | Click/report rate |
| Header analysis | Email Access Request | Email forensics | DE.AE-02 | Indicator identification accuracy |
| Sender verification | Verification Packet | Identity verification | PR.AC-01 | False approval rate |
| Pretext evaluation | Phishing Analysis Worksheet | Social engineering resistance | PR.AT-01 | Decision accuracy under pressure |
| Risk scoring | Threat Assessment Sheet | Risk assessment | ID.RA-01 | Score calibration accuracy |
| Access decision | Approve/Deny mechanic | Zero-trust thinking | PR.AC-03 | Accept/reject error rates |
| Resource allocation | Facility Status Report | Capacity planning | PR.IP-01 | Resource utilization efficiency |
| Tool deployment | Upgrade Proposal | Security architecture | PR.PT-01 | Tool selection appropriateness |
| Incident response | Incident Log + Ransom Note | Incident handling | RS.RP-01 | Response time, containment success |
| Contract management | Data Salvage Contract | Data governance | ID.GV-01 | SLA compliance, clause analysis |
| Lease management | Storage Lease Agreement | Data lifecycle | PR.DS-01 | Retention compliance, renewal decisions |
| Intelligence consumption | Intelligence Brief | Threat intelligence | ID.RA-02 | Pattern recognition, indicator correlation |
| Access control management | Blacklist/Whitelist | Access control policy | PR.AC-04 | Policy effectiveness, exception management |

### Appendix E: Technology Stack Details

| Component | Technology | Version | License | Rationale |
|-----------|-----------|---------|---------|-----------|
| Frontend framework | SvelteKit | 2.x (Svelte 5) | MIT | Compiled reactivity, smallest bundle, built-in SSR |
| Language | TypeScript | 5.x | Apache-2.0 | Strict mode, shared types client/server |
| 2D engine | PixiJS | 8.x | MIT | WebGL batching for facility visualization |
| Charts | D3.js | 7.x | ISC | Dashboard and analytics visualizations |
| Backend runtime | Node.js | 22 LTS | MIT | Async ecosystem, TypeScript native |
| HTTP framework | Fastify | 5.x | MIT | Fastest Node HTTP, schema validation |
| ORM | Drizzle | Latest | Apache-2.0 | Type-safe, SQL-first, migration tooling |
| Validation | Zod | 3.x | MIT | Shared client/server schemas |
| Primary DB | PostgreSQL | 16+ | PostgreSQL | ACID, JSONB, row-level security |
| Cache / queue | Redis | 7.x | BSD | Sessions, BullMQ, leaderboards, streams |
| Analytics DB | ClickHouse | Latest | Apache-2.0 | Columnar, time-series aggregation |
| AI (primary) | Anthropic Claude API | Sonnet/Haiku | Commercial | Content generation, classification |
| AI (fallback) | Mistral / Llama | Latest OSS | Apache-2.0 / Llama | Offline/self-hosted enterprise |
| Job queue | BullMQ | Latest | MIT | Redis-backed, priorities, retries |
| CDN | Cloudflare | N/A | Commercial | Edge caching, DDoS protection |
| Containers | Docker + Kubernetes | Latest | Apache-2.0 | Orchestration, scaling |
| CI/CD | GitHub Actions | N/A | Commercial | Automated build, test, deploy |
| Monitoring | Prometheus + Grafana | Latest | Apache-2.0 | Metrics, dashboards, alerting |

### Appendix F: Research References

**Market Research:**
- Cybersecurity Ventures: Security Awareness Training Market to Hit $10 Billion by 2027
- Mordor Intelligence: Security Awareness Training Market Size & 2030 Growth
- Brightside AI: Security Awareness Training Statistics 2025 (100+ studies)
- Udonis: Mobile Gaming Statistics 2026

**Engagement & Learning Science:**
- SecureWorld: Boring Training Is Ineffective Training
- UChicago CS: New Study Reveals Gaps in Common Types of Cybersecurity Training
- TechClass: Gamification in Cybersecurity Awareness -- Does It Really Work?
- Yu-kai Chou: Octalysis Framework (3,300+ academic citations)

**Threat Landscape:**
- Anti-Phishing Working Group (APWG): Q1 2025 Phishing Activity Trends
- CrowdStrike: 442% Increase in Vishing (2024)
- Verizon: 2025 Data Breach Investigations Report (DBIR)
- 19 Billion Password Analysis (2024-2025 breach data)

**Regulatory:**
- NIS2 Directive (EU) 2022/2555 and German implementation (NIS2UmsuCG)
- DORA Regulation (EU) 2022/2554
- PCI-DSS v4.0.1 (March 2025 enforcement)
- HIPAA OCR Updated Guidance (January 2025)
- SEC Cybersecurity Disclosure Rules (2024)

**Comparable Products:**
- Papers, Please: 5M+ copies sold, ~$40M gross revenue
- Frostpunk: 5M+ copies sold, ~$53M revenue
- Duolingo: $531M revenue (2023), 97M MAU
- Plague Inc: Evolved: 2M+ PC copies, ~$37M Steam revenue

---

*This document represents the comprehensive business requirements for The DMZ: Archive Gate. It synthesizes findings from 14 research domains covering market analysis, regulatory compliance, enterprise learning management, threat landscape, enterprise administration, analytics, enterprise integration, gamification mechanics, narrative design, game economy, multiplayer systems, consumer market strategy, UX/UI design, and technical architecture.*

*Review and approval required from: Product Management, Engineering Leadership, Legal/Compliance, Finance, and Executive Team.*

---

**End of Document**
