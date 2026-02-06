# BRD-11: Multiplayer & Social Features

## The DMZ: Archive Gate

**Document Version:** 1.0
**Last Updated:** 2026-02-05
**Status:** Draft
**Author:** Game Design & Social Systems Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Philosophy](#2-design-philosophy)
3. [Multiplayer Modes](#3-multiplayer-modes)
   - 3.1 Cooperative Play
   - 3.2 Competitive Play
   - 3.3 Asynchronous Multiplayer
   - 3.4 Guild / Corporation Systems
   - 3.5 Raid Events
4. [Social Features](#4-social-features)
   - 4.1 Friend Systems & Social Graphs
   - 4.2 Chat Systems
   - 4.3 Mentorship System
   - 4.4 Community Forums & Knowledge Sharing
   - 4.5 Player Profiles & Achievement Showcases
5. [Enterprise Social Features](#5-enterprise-social-features)
   - 5.1 Department-Based Teams & Competitions
   - 5.2 Organization-Wide Leaderboards
   - 5.3 Inter-Department Challenges
   - 5.4 Manager Visibility Into Team Engagement
   - 5.5 Peer Recognition & Reward Systems
   - 5.6 Cross-Organization Anonymized Benchmarking
6. [Competitive Events](#6-competitive-events)
   - 6.1 Capture-the-Flag Style Events
   - 6.2 Seasonal Tournaments
   - 6.3 Hackathon Events
   - 6.4 Defense Challenges
   - 6.5 Speed-Run Challenges
7. [Community Building](#7-community-building)
   - 7.1 User-Generated Content Tools
   - 7.2 Modding Support for Custom Scenarios
   - 7.3 Community Marketplace
   - 7.4 Streaming / Content Creation Integration
   - 7.5 Bug Bounty Program
8. [Trust & Safety](#8-trust--safety)
   - 8.1 Content Moderation
   - 8.2 Anti-Cheat Systems
   - 8.3 Reporting Mechanisms
   - 8.4 Age-Appropriate Content Filtering
   - 8.5 Privacy in Social Features
9. [Technical Architecture Overview](#9-technical-architecture-overview)
10. [Rollout Phases](#10-rollout-phases)
11. [Success Metrics](#11-success-metrics)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

The DMZ: Archive Gate is a cybersecurity training platform disguised as a post-apocalyptic data center survival game. In its single-player form, the player operates one of the last functioning data centers after a Stuxnet variant has shattered the public internet -- triaging access requests, detecting phishing, managing upgrades, and defending against escalating threats. The multiplayer and social layer transforms this isolated survival experience into a living ecosystem where players cooperate, compete, mentor, and build communities -- all while deepening their cybersecurity skills through social reinforcement.

This document specifies every multiplayer mode, social feature, enterprise integration, competitive event format, community-building tool, and trust-and-safety mechanism required to ship and sustain the social dimension of The DMZ: Archive Gate. It is written for engineering, product, design, QA, legal, and executive stakeholders.

### Why Multiplayer Matters for Cybersecurity Training

Cybersecurity is inherently a team discipline. Incident response, threat hunting, and red-team/blue-team exercises are collaborative by nature. A single-player training game teaches detection and decision-making. A multiplayer training game teaches coordination, communication under pressure, knowledge transfer, and adversarial thinking -- the skills that determine whether an organization survives a real breach. Every multiplayer feature in this document is designed to map directly to a real-world cybersecurity competency.

### Core Multiplayer Pillars

| Pillar                     | Real-World Mapping                     | Primary Mode                |
| -------------------------- | -------------------------------------- | --------------------------- |
| Cooperative Defense        | SOC team coordination                  | Co-op missions              |
| Adversarial Thinking       | Red team / blue team exercises         | Competitive PvP             |
| Persistent Threat Modeling | Continuous security posture management | Async multiplayer           |
| Organizational Resilience  | Enterprise-wide security culture       | Guild / Corporation systems |
| Incident Response Drills   | Tabletop exercises at scale            | Raid events                 |

---

## 2. Design Philosophy

### 2.1 Narrative Integration

Every multiplayer feature must be explainable within the game's fiction. The public internet is shattered. Isolated networks still run. Players are operators of rare, functioning data centers. Multiplayer is framed as inter-facility cooperation, rivalry, or conflict over scarce bandwidth, data, and trust.

- **Cooperative play** = allied data centers pooling resources against a coordinated threat campaign.
- **Competitive play** = rival facilities testing each other's defenses (red team / blue team) or competing for the same contract.
- **Asynchronous multiplayer** = automated probes and attack scripts left running against rival facilities while the operator sleeps.
- **Guilds / Corporations** = coalitions of data centers forming trust networks -- the in-world equivalent of ISACs (Information Sharing and Analysis Centers).
- **Raid events** = coordinated APT (Advanced Persistent Threat) campaigns that require multiple facilities to share intelligence and mount a unified defense.

### 2.2 Training Fidelity

Multiplayer must never become a pure entertainment layer that dilutes training value. Every social interaction should reinforce a cybersecurity concept:

- Chat is modeled on incident response communication channels.
- Mentorship mirrors the SOC analyst tier structure (Tier 1 / Tier 2 / Tier 3).
- Leaderboards measure defensive competency, not just speed.
- Competitive modes reflect real-world adversarial dynamics, not abstract "deathmatch."

### 2.3 Inclusive Skill Range

The player population will span complete beginners to seasoned penetration testers. The multiplayer system must provide meaningful experiences at every skill tier without forcing mismatched encounters. Skill-based matchmaking, tiered competitions, and asymmetric cooperative roles ensure that novices learn and experts are challenged.

### 2.4 Enterprise-First, Consumer-Compatible

The DMZ: Archive Gate serves two markets: enterprise cybersecurity training deployments and direct-to-consumer gaming audiences. The social architecture must satisfy enterprise requirements (privacy, compliance, managerial reporting, SSO integration) while remaining engaging enough for consumer players who expect a modern multiplayer game.

---

## 3. Multiplayer Modes

### 3.1 Cooperative Play (Team-Based Data Center Defense)

#### 3.1.1 Concept

Two to six players operate interconnected data centers, each with their own rack space, bandwidth, power budget, and client roster. A shared threat campaign targets all facilities simultaneously. Players must coordinate detection, share intelligence, allocate shared defense resources, and prevent cascading failures.

#### 3.1.2 Cooperative Scenarios

**Scenario: Cascade Failure**
A supply-chain attack is embedded in a backup set that has been distributed to all allied facilities. Each player receives a slightly different variant. Players must compare indicators of compromise (IOCs), identify the common root, and develop a shared signature before the payload activates. Communication is the primary skill tested.

**Scenario: Bandwidth Siege**
A DDoS campaign targets the shared uplink between allied facilities. Players must collectively decide which traffic to prioritize, which clients to temporarily deny service, and how to reroute critical data. This scenario trains triage and resource allocation under pressure.

**Scenario: The Insider**
One player's facility has been compromised by an insider threat (simulated by the game engine, not an actual player acting as a traitor -- see Section 3.2 for adversarial roles). The compromised facility begins leaking intelligence to the attacker. Other players must detect anomalous behavior in shared telemetry, identify the compromised node, and isolate it without severing the trust network entirely.

**Scenario: Data Exodus**
A government agency requests emergency migration of a massive dataset across all allied facilities. Each facility must accept a shard, verify its integrity, and defend its shard against targeted extraction attempts. Success requires all shards to survive. This scenario trains distributed data protection and chain-of-custody concepts.

#### 3.1.3 Role Specialization

In cooperative play, each player can adopt a specialization that maps to a real-world cybersecurity role:

| In-Game Role     | Real-World Equivalent         | Primary Responsibility                                           |
| ---------------- | ----------------------------- | ---------------------------------------------------------------- |
| Perimeter Warden | Network Security Engineer     | Firewall rules, IDS/IPS tuning, traffic analysis                 |
| Intake Analyst   | SOC Tier 1 Analyst            | Email triage, phishing detection, access request review          |
| Threat Hunter    | SOC Tier 2/3 Analyst          | IOC correlation, threat intelligence, lateral movement detection |
| Systems Keeper   | Systems Administrator         | Patching, configuration hardening, backup verification           |
| Crypto Warden    | Cryptography / PKI Specialist | Certificate management, encryption, key rotation                 |
| Comms Officer    | Incident Commander            | Team coordination, status reporting, decision authority          |

Specialization is not mandatory. Solo players can generalize. In cooperative play, specialization unlocks synergy bonuses that reward division of labor.

#### 3.1.4 Difficulty Scaling

Cooperative difficulty scales based on:

- Number of players (more players = more attack surface, but more hands).
- Aggregate skill rating of the team.
- Selected difficulty tier (Training, Standard, Hardened, Nightmare).
- The specific scenario selected.

At **Training** difficulty, the game provides explicit hints and slows attack timers. At **Nightmare** difficulty, attacks arrive at realistic speed with minimal telemetry, simulating a real-world SOC environment with incomplete information.

#### 3.1.5 Rewards

Cooperative play rewards:

- **Shared loot** -- upgrade components, currency, and cosmetic items split among participants.
- **Trust tokens** -- a currency earned only through cooperation, used to unlock cooperative-exclusive upgrades (shared monitoring dashboards, cross-facility alerting).
- **Training certifications** -- in-game certificates that map to specific competency areas, exportable for enterprise training records.

#### 3.1.6 Matchmaking

- **Quick Match**: The system assembles a balanced team from the queue based on skill rating, role preference, and latency.
- **Custom Lobby**: Players create a lobby, invite friends, and configure scenario parameters.
- **Enterprise Match**: Restricted to members of the same organization (see Section 5). Used for internal training exercises.

---

### 3.2 Competitive Play (Red Team vs. Blue Team Scenarios)

#### 3.2.1 Concept

The defining competitive mode. One team (Red) attempts to breach a target data center. The other team (Blue) defends it. This directly mirrors real-world red team / blue team exercises, which are the gold standard for organizational security testing.

#### 3.2.2 Mode Variants

**Classic Red vs. Blue (Symmetric)**

- Teams of 2-4 players each.
- Red team has a fixed time window (e.g., 20 minutes) to achieve objectives: exfiltrate data, plant ransomware, establish persistence.
- Blue team must detect, contain, and eradicate the attack within the same window.
- After the round, teams swap sides. The team with the better aggregate score wins.

**Asymmetric Assault**

- Red team is a single highly skilled player (or AI-augmented player) with advanced tools.
- Blue team is 3-5 players operating a full SOC.
- This mode simulates the real-world asymmetry where a single sophisticated attacker can occupy an entire security team.

**Purple Team (Cooperative-Competitive Hybrid)**

- Both teams work toward a shared goal but from different angles.
- The Red team probes for vulnerabilities and reports them. The Blue team patches them in real time.
- Scoring rewards both discovery (Red) and remediation speed (Blue).
- This mode is especially valuable for enterprise training because it teaches collaboration between offensive and defensive security teams.

**King of the Rack**

- Free-for-all mode. Each player defends their own single rack while attempting to compromise rivals.
- Last rack standing wins.
- Teaches simultaneous offensive and defensive thinking.

#### 3.2.3 Attack Tooling for Red Team

Red team players are provided with in-game equivalents of real attack tools, abstracted to the game's fiction:

| In-Game Tool     | Real-World Equivalent            | Function                                     |
| ---------------- | -------------------------------- | -------------------------------------------- |
| Signal Scanner   | Nmap / Masscan                   | Port scanning and service enumeration        |
| Packet Sniffer   | Wireshark / tcpdump              | Traffic interception and analysis            |
| Exploit Compiler | Metasploit                       | Exploit selection and delivery               |
| Social Probe     | SET (Social Engineering Toolkit) | Phishing email crafting and delivery         |
| Persistence Kit  | Cobalt Strike / C2 frameworks    | Establishing and maintaining backdoor access |
| Crypto Breaker   | Hashcat / John the Ripper        | Password cracking and hash analysis          |
| Lateral Crawler  | BloodHound / Mimikatz            | Privilege escalation and lateral movement    |

Red team tools are unlocked progressively based on player skill tier. Beginners start with Signal Scanner and Social Probe. Advanced tools require demonstrated competency.

#### 3.2.4 Defense Tooling for Blue Team

| In-Game Tool      | Real-World Equivalent        | Function                                    |
| ----------------- | ---------------------------- | ------------------------------------------- |
| Perimeter Shield  | Firewall / WAF               | Traffic filtering and rule management       |
| Alert Console     | SIEM (Splunk, QRadar)        | Log aggregation and alert triage            |
| Threat Feed       | Threat Intelligence Platform | IOC ingestion and correlation               |
| Quarantine Module | EDR / Sandboxing             | Isolating suspicious processes or hosts     |
| Forensics Kit     | Volatility / Autopsy         | Memory and disk forensic analysis           |
| Patch Deployer    | Configuration Management     | Applying security patches under pressure    |
| Deception Grid    | Honeypots / Honey Tokens     | Deploying decoys to detect lateral movement |

#### 3.2.5 Scoring

Competitive scoring reflects real-world security metrics:

**Red Team Scoring:**

- +Points for each objective completed (data exfiltration, persistence established, ransomware deployed).
- +Points for stealth (achieving objectives without triggering alerts).
- +Points for speed (faster completion = higher score).
- -Points for detection (each alert generated reduces score).

**Blue Team Scoring:**

- +Points for detection (each true-positive alert).
- +Points for containment speed (time from detection to isolation).
- +Points for eradication (fully removing attacker presence).
- +Points for evidence quality (forensic report completeness).
- -Points for false positives (each false alarm reduces score).
- -Points for missed detections (each undetected objective reduces score).

#### 3.2.6 Ranked Play

- **Placement Matches**: 10 matches to establish initial rank.
- **Rank Tiers**: Intern, Analyst, Engineer, Architect, Director, CISO.
- **Seasonal Resets**: Soft reset each season (rank compressed toward median, not fully reset).
- **Separate Ranks**: Red and Blue ranks are tracked independently. A player can be a Director-level attacker and an Analyst-level defender.
- **Elo-Based Matchmaking**: Modified Elo system that accounts for team composition, role selection, and historical performance on the specific scenario.

#### 3.2.7 Anti-Griefing in Competitive Play

- AFK detection with automatic replacement by AI at the player's skill level.
- Surrender vote system (requires majority) to end lopsided matches early.
- Post-match sportsmanship rating (anonymous, optional) that feeds into matchmaking quality.
- Escalating penalties for intentional sabotage (feeding intelligence to the opposing team, deliberately weakening defenses).

---

### 3.3 Asynchronous Multiplayer (Attack / Defend Other Players' Data Centers)

#### 3.3.1 Concept

Players can configure automated attack scripts and deploy them against other players' data centers while both parties are offline. Conversely, players configure automated defenses that respond to incoming async attacks. This mode provides continuous engagement without requiring simultaneous online presence.

This maps to the real-world concept of **continuous security monitoring** -- your defenses must function even when the SOC team is asleep.

#### 3.3.2 Mechanics

**Offense (Scripted Attacks)**

- Players design attack sequences using a visual scripting tool (node-based graph editor).
- Each node represents an attack phase: reconnaissance, initial access, execution, persistence, exfiltration.
- The player defines conditional logic: "If port 443 is open, attempt exploit X. If that fails, attempt social engineering Y."
- Attack scripts consume "Processing Cycles" (a rate-limited resource) to prevent spam.
- Scripts run against a snapshot of the target's data center configuration at the time of execution.

**Defense (Automated Response Playbooks)**

- Players configure automated response playbooks using a similar visual scripting tool.
- Playbooks define: alert thresholds, automatic quarantine rules, escalation procedures, and failover protocols.
- This directly trains players in SOAR (Security Orchestration, Automation, and Response) concepts.
- Players review attack logs when they return online, analyze what succeeded and failed, and refine their playbooks.

#### 3.3.3 The Attack Log

When a player returns online, they receive a detailed log of all async attacks that occurred during their absence:

- Timeline of each attack phase.
- Which automated defenses triggered and their outcomes.
- Damage sustained (if any): data loss, ransom triggered, client attrition.
- Attacker identity (optionally anonymized in ranked async play).

The attack log is formatted as an **incident report**, training players to read and interpret real-world security incident documentation.

#### 3.3.4 Revenge Mechanic

If a player's data center is successfully breached in async play, they can initiate a **Revenge Attack** against the attacker's facility. Revenge attacks receive a small bonus to processing cycles, creating a natural escalation dynamic that mirrors real-world adversarial back-and-forth.

#### 3.3.5 Leaderboards

Async multiplayer maintains two leaderboards:

- **Resilience Board**: Ranked by successful defenses and uptime percentage.
- **Intrusion Board**: Ranked by successful async attacks and stealth metrics.

#### 3.3.6 Opt-In / Opt-Out

- Async multiplayer is **opt-in** by default for consumer players.
- Enterprise deployments can disable async PvP entirely if the organization prefers a purely cooperative training environment.
- Players can set "attack windows" during which their facility is vulnerable to async attacks, preventing 24/7 exposure for casual players.

---

### 3.4 Guild / Corporation Systems (Organizations as In-Game Entities)

#### 3.4.1 Concept

Players can form or join **Corporations** -- in-game organizations that function as trust networks. Within the fiction, a Corporation is a coalition of data center operators who share intelligence, resources, and mutual defense agreements. In gameplay terms, a Corporation provides social structure, shared objectives, and a sense of belonging.

For enterprise deployments, the Corporation maps directly to the real-world organization, with departments as subdivisions.

#### 3.4.2 Corporation Structure

```
Corporation (Organization)
  |
  +-- Division (Department / Business Unit)
  |     |
  |     +-- Squad (Team / Shift)
  |           |
  |           +-- Operator (Individual Player)
  |
  +-- Division
        |
        +-- Squad
              |
              +-- Operator
```

**Corporation Roles:**

| Role                 | Permissions                                                               | Enterprise Mapping     |
| -------------------- | ------------------------------------------------------------------------- | ---------------------- |
| CEO / Director       | Full administrative control, treasury management, alliance diplomacy      | CISO / VP of Security  |
| Division Lead        | Manage division membership, assign squad leaders, set division objectives | Department Manager     |
| Squad Commander      | Manage squad membership, assign missions, run training sessions           | Team Lead              |
| Operator             | Participate in missions, contribute to corporation resources              | Individual Contributor |
| Recruit              | Limited access, probationary period, assigned a mentor                    | New Hire               |
| Intelligence Officer | Access to cross-division threat intelligence, can issue advisories        | Threat Intel Analyst   |
| Quartermaster        | Manage corporation inventory, handle resource allocation                  | IT Operations          |

#### 3.4.3 Corporation Progression

Corporations level up by earning **Trust Score**, which is accumulated through:

- Members completing cooperative missions.
- Successful defense of Corporation assets in raids.
- Contributing to the Corporation's shared intelligence feed.
- Winning inter-Corporation competitions.
- Member training completion rates (enterprise metric).

Corporation level unlocks:

| Level | Unlock                                                       |
| ----- | ------------------------------------------------------------ |
| 1     | Corporation founded, basic shared chat                       |
| 3     | Shared threat intelligence feed                              |
| 5     | Corporation-wide alert system                                |
| 8     | Joint defense operations (cross-squad raids)                 |
| 10    | Corporation war declarations (competitive inter-Corp events) |
| 15    | Alliance formation (multi-Corporation coalitions)            |
| 20    | Custom Corporation scenarios and private tournament hosting  |
| 25    | Corporation emblem on global leaderboard, prestige cosmetics |

#### 3.4.4 Corporation Treasury & Shared Resources

- Members can contribute currency, upgrade components, and intelligence reports to the Corporation treasury.
- The Corporation can fund shared infrastructure: a **shared SIEM dashboard** that aggregates alerts across all member facilities, a **joint honeypot network**, or a **shared patch repository**.
- Shared resources provide tangible gameplay benefits, reinforcing the real-world concept that organizational security investment benefits everyone.

#### 3.4.5 Corporation Diplomacy

- Corporations can form **Alliances** (mutual defense pacts) or declare **Rivalries** (competitive challenges).
- Allied Corporations share a subset of their threat intelligence feeds automatically.
- Rival Corporations can initiate structured competitive events (see Section 6).
- A **Non-Aggression Pact** can be signed to exclude specific Corporations from async attacks.

#### 3.4.6 Enterprise Corporation Provisioning

For enterprise customers, Corporations are pre-provisioned based on the organization's structure:

- SSO integration maps employees to their Division and Squad automatically.
- Roles are derived from the organization's directory (with override capability).
- The Corporation cannot be dissolved or merged with consumer Corporations (isolation).
- Enterprise Corporations exist in a separate namespace but can optionally participate in global events.

---

### 3.5 Raid Events (Organization-Wide Coordinated Defense Against APTs)

#### 3.5.1 Concept

Raids are the pinnacle PvE multiplayer experience. An Advanced Persistent Threat (APT) campaign is launched against a Corporation's entire network of data centers. The APT is multi-phase, multi-vector, and operates on a timeline measured in days (real-world time). Successfully surviving the raid requires coordination across all Divisions and Squads.

This directly simulates real-world APT campaigns, which unfold over weeks or months and require sustained organizational vigilance.

#### 3.5.2 Raid Structure

A full Raid consists of five phases, each lasting 12-48 hours of real-world time:

**Phase 1: Reconnaissance**

- The APT begins scanning Corporation infrastructure.
- Players who detect the scanning activity earn early-warning bonuses.
- Shared intelligence contribution is critical: each detected scan signature improves the Corporation's collective detection capability.

**Phase 2: Initial Access**

- The APT launches targeted phishing campaigns against individual operators.
- Social engineering attempts arrive via the in-game email system, crafted to be highly convincing.
- Players must triage phishing attempts individually and share findings with their Squad.
- Each successful phish gives the APT a foothold in that operator's facility.

**Phase 3: Lateral Movement**

- The APT leverages compromised facilities to probe connected facilities.
- The Corporation must identify which facilities are compromised and isolate them without severing critical supply chains.
- This phase tests the Corporation's ability to balance security with operational continuity.

**Phase 4: Objective Execution**

- The APT attempts to exfiltrate priority data, deploy ransomware, or sabotage critical systems.
- The Corporation must mount an active defense: deploying countermeasures, hunting for persistence mechanisms, and protecting high-value assets.
- This phase features a real-time countdown and is the most intense cooperative experience in the game.

**Phase 5: Attribution & Recovery**

- The APT withdraws (or is expelled).
- The Corporation must compile a forensic report: what was the attack chain, what was compromised, what was the attacker's likely identity and motivation.
- Quality of the forensic report determines bonus rewards.
- This phase trains incident reporting and post-mortem analysis.

#### 3.5.3 Raid Difficulty Tiers

| Tier   | APT Name                  | Sophistication | Real-World Analogue                                           |
| ------ | ------------------------- | -------------- | ------------------------------------------------------------- |
| Tier 1 | Script Kiddies Collective | Low            | Opportunistic attackers using public exploits                 |
| Tier 2 | Shadow Syndicate          | Medium         | Organized cybercrime group                                    |
| Tier 3 | Nation-State Ghost        | High           | State-sponsored APT (APT28, APT29 style)                      |
| Tier 4 | The Architect             | Extreme        | Hypothetical super-APT with zero-day chain and insider access |

#### 3.5.4 Raid Rewards

- **Corporation-wide rewards**: Shared upgrade components, prestige rank, cosmetic Corporation banner.
- **Individual rewards**: Based on personal contribution metrics (phishing emails correctly triaged, IOCs shared, attacks contained).
- **Certification rewards**: Successful raid completion at Tier 2+ grants in-game certifications in Incident Response, Threat Hunting, or Forensic Analysis (exportable for enterprise training records).

#### 3.5.5 Raid Scheduling

- Raids are scheduled events announced 48 hours in advance.
- Enterprise Corporations can schedule private raids at their preferred time.
- Consumer Corporations vote on raid timing via an in-game poll.
- Each phase has a participation window long enough that players in different time zones can contribute.

---

## 4. Social Features

### 4.1 Friend Systems & Social Graphs

#### 4.1.1 Friend List

- Bidirectional friendship model (both players must accept).
- Friends can see each other's online status, current activity (mission, competitive match, idle), and facility overview (opt-in).
- Friends receive priority in matchmaking when queuing simultaneously.
- Maximum friend list size: 500 (expandable for enterprise with custom limits).

#### 4.1.2 Social Graph Tiers

Beyond binary friendship, the system supports relationship tiers that unlock different levels of visibility and interaction:

| Tier | Name     | Unlock Condition                              | Permissions                                         |
| ---- | -------- | --------------------------------------------- | --------------------------------------------------- |
| 0    | Stranger | Default                                       | See public profile only                             |
| 1    | Contact  | Mutual acceptance                             | See online status, send direct messages             |
| 2    | Ally     | 3+ cooperative missions completed together    | Share threat intelligence feed, view facility stats |
| 3    | Trusted  | 10+ cooperative missions + mutual endorsement | Joint facility operations, shared inventory access  |

This tiered system mirrors the real-world concept of **trust establishment** in cybersecurity -- access is earned, not assumed.

#### 4.1.3 Suggested Connections

The system suggests potential friends based on:

- Complementary role preferences (a Perimeter Warden suggesting a Threat Hunter).
- Similar skill rating (within one tier).
- Shared Corporation membership.
- Recent cooperative matches with positive outcomes.
- Enterprise: same department or cross-functional team.

#### 4.1.4 Blocking & Muting

- Players can block other players, preventing all communication and matchmaking overlap.
- Blocked players cannot see the blocker's profile, status, or activity.
- Block lists are private and never disclosed.
- Enterprise administrators can enforce mandatory blocks (e.g., separating employees in different security clearance tiers).

---

### 4.2 Chat Systems

#### 4.2.1 Chat Channels

The chat system is modeled on real-world incident response communication structures:

| Channel Type        | Equivalent         | Scope                                      | Persistence                   |
| ------------------- | ------------------ | ------------------------------------------ | ----------------------------- |
| Direct Message      | Peer-to-peer       | Two players                                | Persistent (90-day retention) |
| Squad Channel       | Team chat          | Squad members                              | Persistent                    |
| Division Channel    | Department chat    | Division members                           | Persistent                    |
| Corporation Channel | Org-wide broadcast | All Corp members                           | Persistent                    |
| Mission Channel     | Incident bridge    | Active mission participants                | Mission duration only         |
| Global Channel      | Public forum       | All online players                         | Ephemeral (no history)        |
| Whisper             | Secure DM          | Two players, end-to-end conceptual privacy | Ephemeral                     |

#### 4.2.2 Structured Communication Tools

Beyond free-text chat, the system provides structured communication templates that mirror real SOC workflows:

- **IOC Share**: A formatted template for sharing Indicators of Compromise (IP addresses, hashes, domains, behavioral signatures) with one click.
- **SITREP (Situation Report)**: A structured status update template with fields for current threat level, active incidents, resource status, and next actions.
- **Escalation Request**: A formal request for higher-tier assistance, routed to the appropriate player(s) based on role and availability.
- **Alert Forward**: Forward an in-game alert (from the SIEM console) directly to a teammate's view with attached context.

These structured tools train players to communicate efficiently during incidents, a skill that directly transfers to real-world SOC operations.

#### 4.2.3 Voice Communication

- Built-in proximity-based voice chat during missions (optional).
- Push-to-talk by default.
- Voice channels per Squad and Division (always-on, joinable).
- Enterprise deployments can disable voice chat or route it through approved platforms via integration hooks (e.g., Microsoft Teams, Slack).

#### 4.2.4 Communication Under Duress

During high-intensity scenarios (Phase 4 of a raid, final minutes of a competitive match), the game can optionally introduce **communication interference** -- simulated network degradation that drops messages, adds latency, or garbles text. This trains players to communicate critical information concisely and to build redundancy into their communication plans.

This feature is opt-in and clearly labeled as a training mechanic.

---

### 4.3 Mentorship System

#### 4.3.1 Concept

Experienced players are matched with newcomers in a structured mentorship program. This mirrors the real-world cybersecurity practice of pairing junior SOC analysts with senior mentors.

#### 4.3.2 Mentor Eligibility

To become a mentor, a player must:

- Have reached Analyst rank or higher in competitive play.
- Have completed at least 20 cooperative missions.
- Have a positive community reputation score (based on peer feedback).
- Pass a brief "teaching aptitude" challenge (explaining a concept clearly to an AI-simulated student).

#### 4.3.3 Mentee Matching

Mentees are matched to mentors based on:

- Skill gap (mentor should be 2-3 tiers above mentee).
- Role preference alignment (a mentee interested in Threat Hunting is matched with a Threat Hunter mentor).
- Schedule compatibility (timezone and typical play hours).
- Language preference.
- Enterprise: same organization preferred, but cross-org mentorship available.

#### 4.3.4 Mentorship Activities

| Activity          | Description                                                                                                           | Training Value             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Guided Missions   | Mentor observes mentee's facility and provides real-time advice via a spectator overlay                               | On-the-job training        |
| Scenario Reviews  | Mentor and mentee replay a recorded mission and discuss decisions                                                     | Post-incident review       |
| Skill Challenges  | Mentor assigns specific challenges (e.g., "Detect 5 phishing emails in 10 minutes")                                   | Targeted skill development |
| Knowledge Quizzes | Mentor quizzes mentee on cybersecurity concepts using the in-game quiz tool                                           | Knowledge assessment       |
| Co-Piloting       | Mentor and mentee operate the same facility simultaneously, with the mentor observing and the mentee making decisions | Supervised practice        |

#### 4.3.5 Mentor Rewards

- **Mentor XP**: A separate XP track that unlocks mentor-exclusive cosmetics (a "Mentor" title, unique facility decorations).
- **Training Contribution Score**: Visible on the mentor's profile, reflecting how many mentees they have helped advance in rank.
- **Enterprise**: Mentor activity is logged as professional development and can count toward performance review metrics (with employee consent).

#### 4.3.6 Mentorship Program Lifecycle

1. **Matching Phase**: System proposes mentor-mentee pairs. Both parties accept or decline.
2. **Onboarding Phase** (1 week): Introductory missions and goal-setting.
3. **Active Phase** (4-8 weeks): Regular scheduled sessions (at least 2 per week).
4. **Graduation Phase**: Mentee completes a capstone mission solo. Mentor provides a final assessment.
5. **Alumni Phase**: The pair remains connected as Allies. The mentee can request ad-hoc advice.

---

### 4.4 Community Forums & Knowledge Sharing

#### 4.4.1 In-Game Knowledge Base ("The Archive")

A wiki-style knowledge base maintained collaboratively by the player community, framed in-game as "The Archive" -- the surviving fragments of cybersecurity documentation salvaged from the shattered internet.

- **Articles** can be created, edited, and versioned by any player above Recruit rank.
- **Voting** surfaces the highest-quality content.
- **Tags** categorize content by topic (phishing, network security, cryptography, incident response, etc.).
- **Verification** by mentor-rank players marks articles as "Reviewed" for accuracy.
- **Enterprise private Archives** allow organizations to maintain internal knowledge bases visible only to their Corporation.

#### 4.4.2 Discussion Forums

- Threaded discussion boards organized by topic.
- Integrated with the game: players can link to specific missions, scenarios, replays, and configurations from forum posts.
- "Ask the Community" button available from any in-game screen that opens a pre-populated forum post with context.
- Reputation system: helpful answers earn community reputation, which feeds into mentor eligibility.

#### 4.4.3 Replay Sharing

- Any mission (cooperative, competitive, or solo) can be saved as a replay.
- Replays can be shared publicly or within a Corporation.
- Replays include a timeline, all player actions, and outcomes.
- Community members can annotate replays with commentary, creating tutorial content.
- "Top Replays" are curated weekly by community moderators.

#### 4.4.4 Strategy Guides & Loadout Sharing

- Players can publish their defense configurations ("loadouts") as shareable templates.
- Loadouts include: firewall rules, automated playbook configurations, SIEM alert thresholds, and facility layout.
- Other players can import loadouts, study them, and adapt them.
- This mirrors the real-world practice of sharing security configurations, playbooks, and detection rules across organizations (SIGMA rules, YARA rules, etc.).

---

### 4.5 Player Profiles & Achievement Showcases

#### 4.5.1 Profile Components

| Component               | Description                                                    | Privacy Setting                           |
| ----------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| Operator Name           | Display name (not necessarily real name)                       | Always visible                            |
| Operator Title          | Earned through rank and achievements                           | Always visible                            |
| Facility Overview       | Visual representation of the player's data center              | Configurable (public / friends / private) |
| Rank Badges             | Current competitive ranks (Red and Blue)                       | Configurable                              |
| Achievement Wall        | Earned achievements displayed as virtual plaques               | Configurable                              |
| Statistics Dashboard    | Win/loss, missions completed, uptime record, response time avg | Configurable                              |
| Specialization Radar    | Radar chart showing proficiency across cybersecurity domains   | Configurable                              |
| Corporation Affiliation | Current Corporation and role                                   | Configurable                              |
| Mentor Status           | Mentor rank and mentee count                                   | Configurable                              |
| Recent Activity         | Last 10 completed missions with outcomes                       | Friends only or private                   |

#### 4.5.2 Achievement System

Achievements are grouped into categories that map to cybersecurity competency areas:

**Detection & Analysis:**

- "Eagle Eye" -- Detect 100 phishing emails with zero false positives.
- "Signal in the Noise" -- Identify a hidden attack in a high-volume alert stream.
- "Pattern Recognition" -- Correctly correlate 3 seemingly unrelated IOCs into a single campaign.

**Defense & Hardening:**

- "Fortress" -- Maintain 99.9% uptime for 30 consecutive days.
- "Zero Day Survivor" -- Successfully defend against a zero-day exploit scenario.
- "Patch Perfect" -- Apply all critical patches within 1 hour of release for 10 consecutive cycles.

**Offense & Red Teaming:**

- "Ghost in the Machine" -- Complete a red team mission without triggering a single alert.
- "Social Engineer" -- Successfully craft a phishing email that bypasses the target's defenses.
- "Persistent Threat" -- Maintain access to a target facility for an entire async cycle undetected.

**Cooperation & Leadership:**

- "Trust Network" -- Complete 50 cooperative missions with a 90%+ success rate.
- "Incident Commander" -- Successfully coordinate a 6-player cooperative defense.
- "Mentor of the Year" -- Graduate 10 mentees from the mentorship program.

**Enterprise-Specific:**

- "Team Player" -- Complete all assigned training scenarios within the deadline.
- "Department Champion" -- Achieve the highest score in a department challenge.
- "Security Culture" -- Engage with The DMZ at least once per week for 12 consecutive weeks.

#### 4.5.3 Profile Customization

- **Facility Skins**: Visual themes for the player's data center (industrial, clean-room, underground bunker, repurposed warehouse).
- **Avatar Frames**: Earned through achievements and milestones.
- **Profile Backgrounds**: Unlocked through gameplay progression or Corporation membership.
- **Custom Status**: A short text status visible to friends ("Hunting threats", "Training recruits", "AFK -- deploying patches IRL").

---

## 5. Enterprise Social Features

### 5.1 Department-Based Teams & Competitions

#### 5.1.1 Concept

Enterprise deployments map the organization's departmental structure onto the Corporation system. Each department becomes a Division within the Corporation, and teams become Squads. This enables department-level competitions, training tracking, and social cohesion.

#### 5.1.2 Department Team Setup

- **Automatic Provisioning**: When an enterprise deploys The DMZ, the SSO integration and directory sync automatically create Divisions and Squads based on the org chart.
- **Manual Override**: Administrators can restructure Divisions/Squads to create cross-functional teams for training purposes (e.g., mixing IT, Finance, and HR for a phishing simulation).
- **Temporary Teams**: Time-limited teams for specific training campaigns or events.

#### 5.1.3 Department Competitions

- **Weekly Challenges**: Each department receives a challenge tailored to their role (e.g., Finance gets a business email compromise scenario, IT gets a network intrusion scenario).
- **Department Leaderboard**: Aggregated scores from individual members.
- **Cross-Department Face-Offs**: Two departments compete head-to-head in a scheduled event (e.g., IT vs. Engineering in a red team / blue team match).

#### 5.1.4 Skill-Level Normalization

To prevent unfair competition between departments with different baseline cybersecurity knowledge (e.g., the SOC team vs. the marketing department), scores are normalized based on:

- Individual improvement from baseline (pre-assessment score).
- Participation rate (departments with higher engagement earn bonus multipliers).
- Difficulty adjustment (the system adjusts challenge difficulty per department).

---

### 5.2 Organization-Wide Leaderboards

#### 5.2.1 Leaderboard Types

| Leaderboard            | Metric                                                    | Scope                     | Update Frequency |
| ---------------------- | --------------------------------------------------------- | ------------------------- | ---------------- |
| Individual Skill       | Composite cybersecurity skill score                       | Organization              | Real-time        |
| Department Performance | Aggregated department score (normalized)                  | Organization              | Weekly           |
| Phishing Resilience    | Phishing detection accuracy rate                          | Organization              | Per campaign     |
| Incident Response Time | Average time to detect and respond to simulated incidents | Organization              | Per event        |
| Training Completion    | Percentage of assigned training completed                 | Organization / Department | Real-time        |
| Most Improved          | Largest skill improvement over rolling 30-day window      | Organization              | Weekly           |
| Cooperation Index      | Frequency and quality of cross-department collaboration   | Organization              | Monthly          |

#### 5.2.2 Leaderboard Display

- Displayed on a dedicated "War Room" screen accessible to all organization members.
- Anonymization options: individual names can be replaced with anonymous IDs (per organizational policy).
- Opt-out: individual employees can request removal from public leaderboards (hidden but still tracked internally for training records).
- Top performers receive in-game recognition: facility glow effects, special titles, and access to elite challenges.

#### 5.2.3 Historical Trends

- All leaderboard data is stored historically with full time-series analysis.
- Organization administrators can view trends over weeks, months, and quarters.
- Trend reports are exportable as PDF/CSV for inclusion in security training reports.

---

### 5.3 Inter-Department Challenges

#### 5.3.1 Challenge Types

**The Phishing Gauntlet**
Two departments receive the same set of emails (mix of legitimate and phishing). The department with the highest collective accuracy wins. Tests organizational phishing awareness without favoring technical departments.

**Data Center Derby**
Each department fields a team. Teams must build and defend a data center from scratch within a time limit, then withstand a standardized wave of attacks. The department with the most uptime wins.

**Incident Race**
Both departments receive the same simulated security incident. The department that correctly identifies the root cause, contains the threat, and submits a complete forensic report first wins. Tests incident response speed and accuracy.

**Escape Room: The Compromised Server**
A puzzle-based challenge where a department team must investigate a compromised server, piece together the attack chain, and recover the stolen data. Combines forensics, reverse engineering, and teamwork.

**Supply Chain Audit**
Departments compete to identify the most vulnerabilities in a simulated software supply chain. Tests supply chain risk assessment skills.

#### 5.3.2 Challenge Scheduling

- Challenges can be initiated by department leads or organization administrators.
- Challenges can be scheduled for specific dates/times or set as always-available (asynchronous participation within a deadline).
- Calendar integration (Google Calendar, Outlook) sends invitations to participants.
- Participation reminders are sent via the organization's preferred communication channel (email, Slack, Teams).

#### 5.3.3 Challenge Rewards

- **In-Game**: Winning department receives a trophy displayed in their shared facility, cosmetic upgrades, and bonus currency.
- **Real-World** (configured by organization admin): Integration with corporate reward platforms (gift cards, extra PTO, recognition in company newsletter). These are configured by the enterprise administrator, not baked into the game.

---

### 5.4 Manager Visibility Into Team Engagement

#### 5.4.1 Manager Dashboard

Organization administrators and designated managers receive access to a dedicated dashboard providing:

**Engagement Metrics:**

- Login frequency per team member (daily/weekly/monthly active usage).
- Average session duration.
- Training scenario completion rate.
- Participation in cooperative and competitive events.

**Skill Metrics:**

- Individual skill progression over time (radar chart across cybersecurity domains).
- Team average skill level compared to organizational baseline.
- Weakest competency areas for the team (highlighting training gaps).
- Pre/post assessment score comparisons.

**Behavioral Metrics:**

- Phishing email detection rate per individual (anonymized aggregation available).
- Average incident response time.
- False positive/negative rates.
- Improvement trajectory (trending up, plateau, declining).

#### 5.4.2 Privacy Guardrails

Manager visibility is subject to strict privacy controls:

- **Aggregate by Default**: Managers see team-level aggregates by default. Individual-level data requires explicit opt-in by the employee or organizational policy declaration.
- **No Surveillance Mode**: The dashboard does not track idle time, mouse movements, or non-gameplay activity.
- **Consent Banner**: Upon first login, enterprise users see a clear explanation of what data is collected, who can see it, and how it is used.
- **Data Retention**: Engagement data is retained for the duration configured by the organization (default: 12 months). Deleted thereafter.
- **Export Controls**: Individual data can only be exported by the individual themselves or by an authorized administrator (audit-logged).
- **Right to Explanation**: If a metric is used in any performance-related context, the employee can request a detailed explanation of how the metric was calculated.

#### 5.4.3 Compliance Reporting

The manager dashboard supports export of compliance-ready reports:

- Training completion reports aligned with frameworks: NIST CSF, ISO 27001, SOC 2, PCI-DSS, HIPAA.
- Evidence of training for audit purposes (date, duration, content, assessment score).
- Certification tracking for in-game certifications mapped to real-world competency frameworks.

---

### 5.5 Peer Recognition & Reward Systems

#### 5.5.1 Kudos System

Any player can send a "Kudos" to another player in their Corporation. Kudos are categorized:

- **Sharp Eye**: Recognized for excellent threat detection.
- **Quick Response**: Recognized for fast incident response.
- **Team Player**: Recognized for exceptional cooperation.
- **Great Teacher**: Recognized for helping others learn.
- **Creative Thinker**: Recognized for innovative defense strategies.

Kudos are displayed on the recipient's profile and contribute to their community reputation score.

#### 5.5.2 Weekly Highlights

Each Monday, the Corporation's shared dashboard displays:

- **MVP of the Week**: The player with the most Kudos received.
- **Most Improved**: The player with the largest skill increase.
- **Top Collaborator**: The player who participated in the most cooperative activities.
- **Defense Champion**: The player with the longest unbroken uptime streak.

#### 5.5.3 Enterprise Reward Integration

- Kudos counts can be synced to corporate reward platforms (Bonusly, Achievers, WorkVivo, etc.) via API.
- Organization administrators can configure thresholds: e.g., "10 Kudos in a month = 500 reward points in the corporate system."
- Physical reward fulfillment (swag, certificates) can be triggered through the admin portal.

---

### 5.6 Cross-Organization Anonymized Benchmarking

#### 5.6.1 Concept

Organizations want to know how their cybersecurity readiness compares to peers. Cross-organization benchmarking provides this without exposing sensitive data.

#### 5.6.2 Benchmarking Metrics

| Metric                      | Description                                    | Anonymization Level                       |
| --------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Phishing Detection Rate     | % of phishing emails correctly identified      | Industry average, percentile rank         |
| Mean Time to Detect (MTTD)  | Average time to detect simulated incidents     | Industry average, percentile rank         |
| Mean Time to Respond (MTTR) | Average time to respond to simulated incidents | Industry average, percentile rank         |
| Training Completion Rate    | % of assigned training completed               | Industry average, percentile rank         |
| Skill Distribution          | Distribution of skill levels across the org    | Comparison to industry distribution curve |
| Raid Survival Rate          | % of raids successfully completed              | Tier-specific percentile rank             |

#### 5.6.3 Anonymization Protocol

- All benchmarking data is aggregated at the organizational level (no individual data crosses org boundaries).
- Organizations are identified only by industry vertical and size band (e.g., "Financial Services, 1000-5000 employees"), never by name.
- Minimum anonymity set: benchmarking data is only published when at least 10 organizations in the same vertical and size band are participating.
- Differential privacy techniques are applied to prevent inference attacks.
- Organizations can opt out of benchmarking entirely.

#### 5.6.4 Benchmarking Reports

- Quarterly benchmarking reports are delivered to organization administrators.
- Reports include: percentile rank, trend over time, areas above and below industry median, and recommended training focus areas.
- Reports are designed to be presentable to executive leadership (clean visualizations, executive summary).

---

## 6. Competitive Events

### 6.1 Capture-the-Flag (CTF) Style Events

#### 6.1.1 Concept

Classic CTF events adapted to The DMZ's fiction. Players or teams solve cybersecurity challenges to capture "data fragments" (flags) hidden in intentionally vulnerable systems.

#### 6.1.2 CTF Formats

**Jeopardy-Style CTF**

- Challenges organized in categories: Cryptography, Web Security, Network Analysis, Reverse Engineering, Forensics, OSINT (Open-Source Intelligence).
- Each challenge has a point value based on difficulty.
- Hints available for reduced points.
- Time-limited (typically 24-48 hours for a major event).

**Attack-Defense CTF**

- Each team has a vulnerable server.
- Teams must simultaneously patch their own server's vulnerabilities and exploit other teams' servers.
- Flags are rotated periodically to prevent hoarding.
- This is the most operationally complex format and reserved for major seasonal events.

**King of the Hill CTF**

- A single contested server.
- Teams compete to control the server by planting their flag and defending it.
- Control time is the primary scoring metric.

#### 6.1.3 In-Game Integration

CTF challenges are framed within the game's narrative:

- "A fragmented dataset has been scattered across compromised relay nodes. Recover the fragments before the data decays."
- Each challenge is a relay node with its own set of security layers to bypass.
- The competition arena is a visually distinct "contested zone" on the world map.

#### 6.1.4 Skill-Tier Segregation

CTF events run in parallel tiers to prevent mismatched competition:

| Tier         | Eligible Ranks       | Challenge Difficulty                                                             |
| ------------ | -------------------- | -------------------------------------------------------------------------------- |
| Novice       | Intern - Analyst     | Fundamentals: basic encoding, simple web vulnerabilities, clear-text credentials |
| Intermediate | Engineer - Architect | Moderate: chained exploits, encrypted payloads, multi-step forensics             |
| Expert       | Director - CISO      | Advanced: zero-day simulation, custom binary exploitation, APT-level forensics   |
| Open         | All ranks            | Mixed difficulty, handicap scoring based on rank                                 |

---

### 6.2 Seasonal Tournaments

#### 6.2.1 Season Structure

Each season lasts 12 weeks and follows a thematic narrative arc:

| Week | Phase         | Activity                                                                |
| ---- | ------------- | ----------------------------------------------------------------------- |
| 1-2  | Qualification | Open ranked matches, top performers qualify for bracket                 |
| 3-4  | Group Stage   | Qualified players/teams placed in round-robin groups                    |
| 5-8  | Bracket Stage | Single-elimination bracket with best-of-3 matches                       |
| 9-10 | Semifinals    | Best-of-5 matches, streamed with commentary                             |
| 11   | Finals        | Best-of-7 championship match                                            |
| 12   | Off-Season    | Replay review, community voting on next season's theme, balance patches |

#### 6.2.2 Season Themes

Each season introduces a thematic twist that modifies gameplay:

- **Season: Zero Trust** -- All default trust relationships are disabled. Players must verify every connection from scratch. Tests zero-trust architecture principles.
- **Season: Supply Chain** -- Attacks are embedded in software updates. Players must balance patching with supply chain verification. Tests software supply chain security.
- **Season: Insider Threat** -- Automated "insider" agents are embedded in every team. Players must detect and contain them while completing objectives. Tests insider threat detection.
- **Season: Quantum Threat** -- A simulated quantum computer threatens all classical encryption. Players must migrate to post-quantum cryptography while maintaining operations. Tests cryptographic agility.

#### 6.2.3 Season Rewards

- **Season Pass**: A free and premium reward track offering cosmetics, currency, and exclusive scenarios.
- **Ranked Rewards**: End-of-season rewards based on final rank (facility skins, titles, profile decorations).
- **Tournament Prizes**: In-game trophies and titles for bracket participants. Top 3 receive permanent profile badges.
- **Enterprise Rewards**: Organizations can configure custom rewards for employees who participate in seasonal events.

---

### 6.3 Hackathon Events

#### 6.3.1 Concept

Time-limited creative events where players build, not just compete. Hackathons challenge players to create new defense strategies, automated playbooks, detection rules, or even custom scenarios within a 24-72 hour window.

#### 6.3.2 Hackathon Categories

**Automation Hackathon**
Build the most effective automated defense playbook using the visual scripting tool. Playbooks are tested against a standardized attack suite. The playbook with the highest defense score wins.

**Detection Rule Hackathon**
Write custom detection rules (in-game SIGMA/YARA equivalents) that correctly identify the most attack variants with the fewest false positives.

**Scenario Design Hackathon**
Design a custom cooperative or competitive scenario using the scenario editor. Community voting determines the winner. The winning scenario is added to the official rotation.

**Phishing Hackathon (Red)**
Craft the most convincing phishing emails that bypass other players' detection. Strictly contained within the game environment and subject to ethical guidelines.

**Incident Response Hackathon**
Teams race to resolve a series of escalating incidents. Scored on speed, accuracy, and completeness of forensic reporting.

#### 6.3.3 Hackathon Rewards

- Winning entries are featured in the game (scenarios added to rotation, playbooks added to the community library).
- Creators receive credit and ongoing royalties (in-game currency) when their content is used.
- Top creators are invited to join the **Architect Council** -- a community advisory board that influences game development.

---

### 6.4 Defense Challenges (Survive Waves of Attacks)

#### 6.4.1 Concept

Horde-mode style events. Players defend their data center against escalating waves of increasingly sophisticated attacks. Each wave introduces new attack vectors, higher volumes, and more complex evasion techniques.

#### 6.4.2 Wave Structure

| Wave          | Attack Type                               | Volume    | Sophistication   |
| ------------- | ----------------------------------------- | --------- | ---------------- |
| 1-5           | Automated scans, basic phishing           | Low       | Script-level     |
| 6-10          | Targeted exploits, spear-phishing         | Medium    | Intermediate     |
| 11-15         | Multi-vector attacks, encrypted payloads  | High      | Advanced         |
| 16-20         | APT-level campaigns with lateral movement | Very High | Expert           |
| 21+ (Endless) | Randomized with increasing intensity      | Extreme   | Randomized elite |

#### 6.4.3 Modifiers

Each wave can include random modifiers that add additional challenge:

- **Fog of War**: Reduced telemetry visibility (fewer log sources available).
- **Budget Cuts**: Random defense tools are disabled for the wave.
- **Insider Alert**: One automated defense component begins acting erratically (simulated insider compromise).
- **Bandwidth Crunch**: Communication between cooperative players is throttled.
- **Zero-Day Drop**: An unknown exploit is introduced with no existing signature.

#### 6.4.4 Scoring & Leaderboards

- Scored by waves survived, data integrity maintained, and efficiency (resources consumed per wave).
- Global leaderboard for solo and cooperative defense challenges.
- Weekly rotating challenge with unique modifier combinations.
- Enterprise leaderboard for department teams.

---

### 6.5 Speed-Run Challenges

#### 6.5.1 Concept

Timed challenges where players must complete a specific objective as quickly as possible. Speed-runs test efficiency, preparation, and mastery of game systems.

#### 6.5.2 Speed-Run Categories

| Category          | Objective                                                        | Typical Time  |
| ----------------- | ---------------------------------------------------------------- | ------------- |
| Lockdown Sprint   | Fully harden a bare data center from scratch                     | 5-15 minutes  |
| Incident Blitz    | Resolve 10 security incidents in sequence                        | 10-20 minutes |
| Phishing Gauntlet | Correctly classify 50 emails (phishing vs. legitimate)           | 5-10 minutes  |
| Forensic Dash     | Complete a full forensic investigation of a compromised system   | 15-30 minutes |
| Patch Marathon    | Apply 20 patches in the correct priority order                   | 8-15 minutes  |
| Red Team Rush     | Compromise a target facility from initial access to exfiltration | 10-25 minutes |

#### 6.5.3 Speed-Run Validation

- All speed-runs are recorded and submitted as replays.
- Automated verification ensures no exploits or glitches were used.
- Community-verified leaderboard with replay links for every entry.
- Categories can be filtered by input method (keyboard-only, controller, touch).

#### 6.5.4 Speed-Run Events

- Weekly featured speed-run challenge with bonus rewards.
- Monthly speed-run tournament with bracket-style elimination.
- Annual "Archive Sprint" -- a marathon event combining all speed-run categories into a single decathlon-style competition.

---

## 7. Community Building

### 7.1 User-Generated Content Tools

#### 7.1.1 Scenario Editor

A visual editor allowing players to create custom cooperative, competitive, and solo scenarios:

- **Threat Designer**: Define custom attack sequences, timings, and behaviors.
- **Environment Builder**: Configure facility layout, available resources, and environmental conditions.
- **Narrative Editor**: Write briefing text, in-game emails, and scenario-specific documents.
- **Scoring Configurator**: Define custom scoring criteria and win/loss conditions.
- **Trigger System**: Event-driven logic (e.g., "When player detects the first IOC, spawn a second attack vector").

#### 7.1.2 Email Template Creator

Players can create custom phishing and legitimate email templates:

- Templates include sender profile, email body, attachments, and embedded links.
- Templates are tagged with difficulty level and category (BEC, credential phishing, malware delivery, etc.).
- Community-rated templates are added to the game's email pool.
- Enterprise administrators can submit organization-specific templates (e.g., emails that mimic internal systems).

#### 7.1.3 Detection Rule Authoring

Players can author custom detection rules using an in-game Domain-Specific Language (DSL) inspired by real-world formats:

- Syntax modeled on SIGMA rules (for log-based detection).
- Visual builder for players who prefer drag-and-drop.
- Rules can be tested against a library of known-good and known-bad scenarios.
- Published rules are available to the community with attribution.

#### 7.1.4 Playbook Builder

The visual scripting tool used for async multiplayer automated responses is also available as a standalone content creation tool:

- Published playbooks can be imported by any player.
- Playbooks can be forked, modified, and republished.
- Version history is maintained.
- Performance metrics (how well the playbook defends against standard attack suites) are publicly visible.

---

### 7.2 Modding Support for Custom Scenarios

#### 7.2.1 Modding Framework

The game provides a modding SDK that allows deeper customization than the built-in editors:

- **Custom Attack Types**: Define entirely new attack vectors with custom animations, behaviors, and detection profiles.
- **Custom Defense Tools**: Create new defensive tools with custom mechanics.
- **Custom UI Panels**: Add new information panels to the player's dashboard.
- **Custom Scoring Systems**: Override the default scoring logic with custom algorithms.
- **Custom Campaign Chains**: Link multiple scenarios into a narrative campaign.

#### 7.2.2 Modding SDK

- SDK distributed via package manager (npm / pip / cargo depending on implementation).
- TypeScript/JavaScript primary language for mods (matching the web-app architecture).
- Sandboxed execution environment (mods cannot access the host filesystem, network, or other mods' data without permission).
- Hot-reload support for rapid iteration during development.
- Documentation website with tutorials, API reference, and example mods.

#### 7.2.3 Mod Review Pipeline

- All mods submitted to the public registry undergo automated security scanning.
- Mods are sandboxed and cannot execute arbitrary code outside the game environment.
- Community review: mods are flagged by users if they exhibit unexpected behavior.
- Curated "Verified Mods" collection for mods that pass both automated and manual review.
- Enterprise deployments can restrict mod installation to Verified Mods only or disable modding entirely.

---

### 7.3 Community Marketplace

#### 7.3.1 Marketplace Contents

| Content Type               | Creator                        | Currency                             | Enterprise Policy             |
| -------------------------- | ------------------------------ | ------------------------------------ | ----------------------------- |
| Custom Scenarios           | Players                        | In-game currency (free or priced)    | Configurable (allow/deny)     |
| Phishing Email Templates   | Players                        | Free (community contribution)        | Review-gated                  |
| Detection Rules            | Players                        | Free (community contribution)        | Review-gated                  |
| Automated Playbooks        | Players                        | In-game currency                     | Configurable                  |
| Facility Skins / Cosmetics | Players & Official             | Premium currency or in-game currency | Cosmetic-only; always allowed |
| Campaign Packs             | Verified Creators              | Premium currency                     | Configurable                  |
| Training Modules           | Enterprise / Verified Creators | License-based                        | Admin-controlled              |

#### 7.3.2 Creator Economy

- Creators earn in-game currency when their content is purchased or used.
- Top creators (based on cumulative downloads, ratings, and usage) earn a "Verified Creator" badge.
- Verified Creators may be eligible for revenue sharing on premium content (real-world monetary compensation, subject to separate agreement).
- Creator analytics dashboard shows downloads, ratings, usage trends, and earnings.

#### 7.3.3 Quality Control

- All marketplace content undergoes automated validation (scenario playability, rule syntax, mod security scan).
- Community ratings (1-5 stars) and reviews.
- "Staff Pick" designation for exceptionally high-quality content.
- Takedown process for content that violates guidelines (offensive material, game-breaking bugs, intellectual property violations).
- Enterprise administrators can curate an approved content list for their organization.

---

### 7.4 Streaming / Content Creation Integration

#### 7.4.1 Spectator Mode

- Any match (cooperative or competitive) can be spectated by friends or Corporation members.
- Spectators see a dedicated UI with player perspectives, timeline controls, and a global overview map.
- Spectator count is visible to players (opt-in) as a motivational element.
- Delayed spectating (5-minute delay) is enforced in ranked competitive matches to prevent ghosting.

#### 7.4.2 Streaming Overlay

- Built-in OBS/Streamlabs overlay with real-time game state information:
  - Current threat level and active alerts.
  - Player health (facility status, uptime, resource levels).
  - Score and objectives.
  - Custom branding area (streamer's logo and social links).
- Overlay is activated via a simple toggle in settings (no external configuration required).

#### 7.4.3 Clip System

- Players can capture 30-second clips of notable moments (successful detection, clutch defense, impressive exploit).
- Clips can be shared directly to social media platforms, Discord, or the in-game community feed.
- A weekly "Top Clips" compilation is auto-generated from the most-shared clips.

#### 7.4.4 Community Events for Streamers

- Monthly "Streamer Showdown" -- invited content creators compete in a special event with unique rules and high stakes.
- "Community Day" events where streamers host viewer participation lobbies.
- Creator codes: content creators receive unique referral codes that grant bonuses to both the creator and the referred player.

#### 7.4.5 Educational Content Support

- "Training Mode" overlay for educational streamers that explains each action's real-world cybersecurity equivalent.
- Pause-and-explain feature for streamers recording tutorials.
- Integration with learning management systems (LMS) for educational institutions streaming lectures using The DMZ as a teaching tool.

---

### 7.5 Bug Bounty Program (Meta)

#### 7.5.1 Concept

This is a deliberate meta-layer: The DMZ is a cybersecurity training game, and the game itself runs a bug bounty program. Finding security vulnerabilities in the game platform is itself a cybersecurity exercise, creating a self-referential training loop.

#### 7.5.2 Scope

| In Scope                                                | Out of Scope                                         |
| ------------------------------------------------------- | ---------------------------------------------------- |
| Web application vulnerabilities (XSS, CSRF, SQLi, etc.) | Social engineering of Matrices GmbH employees        |
| API security issues                                     | Physical attacks on infrastructure                   |
| Authentication/authorization bypasses                   | Denial of service (testing must not degrade service) |
| Data exposure or leakage                                | Third-party service vulnerabilities                  |
| Game logic exploits that provide unfair advantage       | Automated scanning without prior approval            |
| Client-side code injection                              |                                                      |
| Privilege escalation within the game                    |                                                      |

#### 7.5.3 Rewards

| Severity      | In-Game Reward                                         | Recognition                               |
| ------------- | ------------------------------------------------------ | ----------------------------------------- |
| Critical      | 10,000 premium currency + exclusive "Bug Hunter" title | Hall of Fame listing, name in patch notes |
| High          | 5,000 premium currency + exclusive cosmetic            | Hall of Fame listing                      |
| Medium        | 2,000 premium currency                                 | Acknowledgment in patch notes             |
| Low           | 500 premium currency                                   | Thank-you message                         |
| Informational | 100 premium currency                                   | --                                        |

Real-world monetary rewards may be offered for critical vulnerabilities (subject to separate responsible disclosure agreement).

#### 7.5.4 Submission Process

1. Discoverer reports the vulnerability via a dedicated in-game portal or secure email.
2. Triage team acknowledges receipt within 24 hours.
3. Severity is assessed and communicated within 72 hours.
4. Fix is developed and deployed.
5. Discoverer is notified when the fix is live.
6. Reward is distributed.
7. (Optional) Discoverer publishes a write-up after the fix is deployed, earning additional community reputation.

#### 7.5.5 Educational Value

- Each resolved bug bounty is (with permission) published as a case study in The Archive.
- Case studies include: vulnerability description, exploitation technique, fix applied, and lessons learned.
- Players can study real vulnerabilities found in a system they use daily, creating powerful training moments.

---

## 8. Trust & Safety

### 8.1 Content Moderation

#### 8.1.1 Moderation Philosophy

The DMZ serves both consumer gaming and enterprise training audiences. Content moderation must be robust enough for enterprise compliance while not being so restrictive that it stifles the authentically adversarial nature of the game (players are literally practicing attacks -- the content itself involves phishing, exploitation, and social engineering in a controlled environment).

**Core Principle**: Game-sanctioned adversarial content (phishing simulations, attack scenarios, vulnerability exploitation) is allowed within the game context. Harassment, hate speech, real-world threats, and abuse targeting other players are never allowed.

#### 8.1.2 Automated Moderation

- **Text Chat**: All chat messages pass through a content filter that detects:
  - Hate speech and slurs (hard block -- message is suppressed and sender is warned).
  - Personal information (PII) sharing (soft block -- sender is warned, message is held for review).
  - Real-world threat language (hard block -- escalated to human review immediately).
  - Spam and commercial solicitation (rate-limited, then blocked).
  - Profanity (configurable per organization -- enterprise can set to strict, consumer defaults to moderate).

- **User-Generated Content**: All scenarios, email templates, detection rules, and playbooks are scanned for:
  - Offensive or inappropriate content in narrative text.
  - Actual malware or exploit code (as opposed to in-game simulated exploits).
  - Intellectual property violations (copyrighted logos, trademarked content).

- **Voice Chat**: Real-time voice moderation using speech-to-text and content classification (with clear user notification that voice is processed for safety).

#### 8.1.3 Human Moderation

- A dedicated Trust & Safety team reviews escalated content.
- Community moderators (volunteer players with proven track records) assist with forum moderation and in-game report review.
- Community moderators have limited powers: mute (temporary), flag for review, and warn. Only Trust & Safety staff can issue bans.
- All moderation actions are logged with reason codes and are auditable.

#### 8.1.4 Appeal Process

1. Player receives a moderation action (warning, mute, suspension, ban).
2. Player submits an appeal through the in-game portal with a written explanation.
3. Appeal is reviewed by a Trust & Safety team member who was not involved in the original action.
4. Decision is communicated within 48 hours.
5. If the appeal is upheld, the action is reversed and the player's record is cleared.

---

### 8.2 Anti-Cheat Systems

#### 8.2.1 Cheat Categories

| Category             | Description                                                                              | Detection Method                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Information Cheats   | Accessing information not available to the player (wall hacks, reading opponent's cards) | Server-side validation; client never receives data the player should not see                                        |
| Automation Cheats    | Bots or macros that automate gameplay actions                                            | Behavioral analysis, CAPTCHA-like challenges, input pattern detection                                               |
| Exploitation Cheats  | Exploiting game bugs for unfair advantage                                                | Anomaly detection on game state, bug bounty program incentivizes reporting over exploiting                          |
| Collusion Cheats     | Players on opposing teams sharing information                                            | Communication channel monitoring between opponents, statistical analysis of suspicious win patterns                 |
| Account Manipulation | Smurfing (high-skill player on low-skill account), account sharing, boosting             | Login pattern analysis, skill trajectory anomaly detection, hardware fingerprinting (consumer only, not enterprise) |

#### 8.2.2 Server-Authoritative Architecture

The DMZ uses a server-authoritative architecture where all game state is computed server-side:

- The client is a thin rendering layer. It sends player inputs and receives authorized game state.
- The client never has access to hidden information (opponent's defense configuration, unrevealed attack details).
- All score calculations occur server-side.
- Replay validation is server-side (replays cannot be tampered with).

This architecture eliminates the majority of client-side cheats by design.

#### 8.2.3 Statistical Anti-Cheat

- Machine learning models trained on legitimate player behavior detect anomalous patterns:
  - Superhuman reaction times (detecting phishing emails faster than reading speed).
  - Impossible knowledge (defending against an attack before it is visible).
  - Unnatural consistency (100% accuracy over hundreds of decisions with zero hesitation).
- Flagged accounts are reviewed by the anti-cheat team before action is taken.
- False positive rate target: below 0.1%.

#### 8.2.4 Competitive Integrity

- Ranked matches are played on dedicated servers with enhanced logging.
- Tournament matches require identity verification (linked account with email confirmation).
- Enterprise matches require SSO authentication (no anonymous participation).
- Post-match replay analysis is automated for top-100 ranked players.

#### 8.2.5 Penalties

| Offense                                                 | First Violation                   | Second Violation      | Third Violation        |
| ------------------------------------------------------- | --------------------------------- | --------------------- | ---------------------- |
| Minor (automation, minor exploits)                      | Warning + 24-hour competitive ban | 7-day competitive ban | 30-day competitive ban |
| Major (information cheats, collusion)                   | 30-day competitive ban            | Season ban            | Permanent ban          |
| Severe (real-world exploitation, hacking other players) | Permanent ban                     | --                    | --                     |

Enterprise administrators can configure custom penalty policies for their organization.

---

### 8.3 Reporting Mechanisms

#### 8.3.1 In-Game Reporting

- **Quick Report**: Right-click any player's name to report. Pre-defined categories: Cheating, Harassment, Inappropriate Content, Griefing, Spam.
- **Detailed Report**: Accessible from the pause menu or post-match screen. Includes text description, category selection, and optional screenshot/replay attachment.
- **Automatic Context**: Reports automatically include the match ID, chat log excerpt, and relevant game state (the reporter does not need to manually gather evidence).

#### 8.3.2 Out-of-Game Reporting

- **Web Portal**: A dedicated reporting page on the game's website for issues that cannot be reported in-game.
- **Email**: A security@[domain] address for sensitive reports (vulnerability disclosure, data privacy concerns).
- **Enterprise Admin Portal**: Organization administrators can file reports on behalf of employees and track resolution.

#### 8.3.3 Report Processing

1. Reports are triaged by automated classification (severity, category).
2. High-severity reports (threats, harassment, data exposure) are escalated immediately.
3. Standard reports are queued for review with a target response time of 24 hours.
4. Reporters receive a notification when their report is resolved (with a generic outcome: "Action taken" or "No violation found").
5. Report outcomes are logged for trend analysis (e.g., rising reports of a specific cheat method trigger an engineering investigation).

#### 8.3.4 False Report Deterrence

- Submitting reports does not require excessive effort (to encourage legitimate reporting), but serial false reporters are flagged.
- Players who repeatedly submit false reports receive warnings, then temporary reporting cooldowns.
- False report patterns are tracked per account and factored into report priority (frequent false reporters' future reports are deprioritized).

---

### 8.4 Age-Appropriate Content Filtering

#### 8.4.1 Age Gate

- Account creation requires date of birth verification.
- Players under 13 are blocked (COPPA compliance).
- Players 13-17 have restricted access (see below).
- Enterprise deployments may set a minimum age based on organizational policy.

#### 8.4.2 Age-Based Restrictions

| Feature                            | 13-17                                           | 18+               |
| ---------------------------------- | ----------------------------------------------- | ----------------- |
| Global Chat                        | Disabled                                        | Enabled           |
| Direct Messages                    | Friends only, filtered                          | Enabled           |
| Voice Chat                         | Disabled by default, parent-enabled             | Enabled           |
| User-Generated Content Creation    | Allowed (moderated)                             | Allowed           |
| User-Generated Content Consumption | Curated/Verified only                           | All               |
| Bug Bounty Participation           | Not allowed (liability)                         | Allowed           |
| Competitive Ranked Play            | Allowed (age-appropriate matchmaking)           | Allowed           |
| Friend Requests                    | Requires mutual acceptance, parent notification | Mutual acceptance |
| Profile Visibility                 | Minimal by default (name and rank only)         | Configurable      |

#### 8.4.3 Parental Controls

- Parent/guardian account can be linked to a minor's account.
- Parent can configure: play time limits, chat access, friend request approval, spending limits.
- Weekly activity summary emailed to parent (opt-in).
- Parent can suspend or delete the minor's account at any time.

#### 8.4.4 Content Ratings

- The game content itself is appropriate for ages 13+ (no violence, gore, or explicit content; themes involve cybersecurity concepts, not warfare).
- User-generated content is tagged with a maturity rating by the creator and validated by the moderation system.
- Enterprise deployments operate in a separate content pool with organization-controlled maturity settings.

---

### 8.5 Privacy in Social Features (Especially for Enterprise Users)

#### 8.5.1 Privacy Principles

1. **Data Minimization**: Collect only the data necessary for the feature to function.
2. **Purpose Limitation**: Data collected for gameplay is not used for non-gameplay purposes without explicit consent.
3. **User Control**: Players control the visibility of their profile, activity, and statistics.
4. **Enterprise Isolation**: Enterprise data is logically isolated from consumer data and from other enterprises.
5. **Transparency**: Players can view, export, and delete their data at any time.

#### 8.5.2 Enterprise Privacy Architecture

| Data Category               | Visible to Self | Visible to Team        | Visible to Manager      | Visible to Org Admin  | Visible Outside Org                    |
| --------------------------- | --------------- | ---------------------- | ----------------------- | --------------------- | -------------------------------------- |
| Gameplay Actions (detailed) | Yes             | No                     | No                      | No                    | No                                     |
| Skill Scores                | Yes             | Configurable           | Aggregate by default    | Aggregate by default  | Never (except anonymized benchmarking) |
| Training Completion         | Yes             | Configurable           | Yes (audit requirement) | Yes                   | Never                                  |
| Chat Messages               | Yes (own)       | Squad/Division members | No (unless escalated)   | No (unless escalated) | No                                     |
| Login Activity              | Yes             | No                     | Aggregate               | Aggregate             | Never                                  |
| Friend List                 | Yes             | No                     | No                      | No                    | No                                     |
| Achievement History         | Yes             | Configurable           | Configurable            | Aggregate             | Never                                  |

#### 8.5.3 Data Residency

- Enterprise deployments can specify data residency requirements (EU, US, APAC, etc.).
- Player data is stored in the specified region and does not leave it.
- Global multiplayer matchmaking uses region-aware routing (players can play across regions, but their persistent data remains in their home region).

#### 8.5.4 GDPR / CCPA Compliance

- **Right of Access**: Players can export all their data in machine-readable format (JSON).
- **Right to Erasure**: Players can request deletion of their account and all associated data. Deletion is completed within 30 days, with immediate anonymization of public-facing data.
- **Right to Rectification**: Players can correct inaccurate personal data.
- **Data Portability**: Player data (scores, achievements, training records) can be exported for use in other systems.
- **Consent Management**: Granular consent controls for: analytics, benchmarking, marketing communications, and social features.

#### 8.5.5 Enterprise SSO & Identity

- Enterprise accounts are provisioned via SSO (SAML 2.0 / OIDC).
- Player identity within the game can be a pseudonym (real name is known only to the enterprise admin and the player themselves).
- When an employee leaves the organization, their enterprise account is deprovisioned (data is archived per retention policy, then deleted).
- Enterprise accounts cannot be converted to consumer accounts (and vice versa) to prevent data leakage.

#### 8.5.6 Audit Logging

- All access to player data by administrators or support staff is logged.
- Audit logs include: who accessed what data, when, and why (requires a justification note).
- Audit logs are retained for the duration required by the organization's compliance framework (minimum 12 months).
- Audit logs are immutable and tamper-evident.

---

## 9. Technical Architecture Overview

### 9.1 Multiplayer Infrastructure

```
                    +---------------------+
                    |   Global Match-     |
                    |   making Service    |
                    +---------+-----------+
                              |
              +---------------+---------------+
              |               |               |
     +--------v------+ +-----v-------+ +-----v-------+
     | Region: US-E  | | Region: EU-W| | Region: APAC|
     | Game Servers   | | Game Servers| | Game Servers|
     +--------+------+ +-----+-------+ +-----+-------+
              |               |               |
     +--------v------+ +-----v-------+ +-----v-------+
     | Session State  | | Session     | | Session     |
     | (Redis Cluster)| | State       | | State       |
     +--------+------+ +-----+-------+ +-----+-------+
              |               |               |
     +--------v---------------v---------------v-------+
     |           Persistent Data Layer                 |
     |   (PostgreSQL + Object Storage per region)      |
     +------------------------------------------------+
```

### 9.2 Social Infrastructure

```
     +-----------+    +-----------+    +-------------+
     | Chat      |    | Social    |    | Community   |
     | Service   |    | Graph     |    | Content     |
     | (WebSocket|    | Service   |    | Service     |
     | + Pub/Sub)|    | (Graph DB)|    | (CMS + CDN) |
     +-----------+    +-----------+    +-------------+
          |                |                 |
     +----v----------------v-----------------v--------+
     |           Event Bus (Message Queue)             |
     +-------------------------------------------------+
          |                |                 |
     +----v-----+    +----v-------+    +----v--------+
     | Moderation|    | Analytics  |    | Notification|
     | Pipeline  |    | Pipeline   |    | Service     |
     +-----------+    +------------+    +-------------+
```

### 9.3 Enterprise Integration

```
     +-------------------+
     | Enterprise IdP    |
     | (SAML/OIDC)       |
     +---------+---------+
               |
     +---------v---------+
     | SSO Gateway        |
     +---------+---------+
               |
     +---------v---------+     +---------------------+
     | Enterprise         |<--->| HRIS / Directory    |
     | Account Service    |     | Sync Service        |
     +---------+----------+     +---------------------+
               |
     +---------v---------+     +---------------------+
     | Enterprise         |<--->| LMS Integration     |
     | Analytics Service  |     | (SCORM/xAPI export) |
     +--------------------+     +---------------------+
```

### 9.4 Key Technical Decisions

| Decision                  | Choice                                               | Rationale                                                                    |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Game state authority      | Server-authoritative                                 | Anti-cheat, consistency, enterprise security                                 |
| Real-time communication   | WebSocket with fallback to SSE                       | Low latency for chat and game state sync                                     |
| Async attack execution    | Serverless compute (isolated per execution)          | Cost-efficient, scalable, sandboxed                                          |
| Social graph storage      | Graph database (e.g., Neo4j)                         | Efficient traversal for friend-of-friend, Corporation hierarchy, matchmaking |
| Content moderation        | ML pipeline + human escalation                       | Balance speed with accuracy                                                  |
| Enterprise data isolation | Logical isolation with encryption at rest per tenant | Compliance requirement; physical isolation available as premium option       |
| Matchmaking algorithm     | Modified Glicko-2 with role and latency factors      | Better uncertainty modeling than Elo for the variable team compositions      |

---

## 10. Rollout Phases

### Phase 1: Foundation (Months 1-3)

**Multiplayer:**

- 2-player cooperative play (single scenario: Cascade Failure).
- Basic matchmaking (skill-based, region-aware).

**Social:**

- Friend list and direct messaging.
- Basic player profiles.

**Enterprise:**

- SSO integration.
- Basic team structure (Corporation with Divisions).

**Trust & Safety:**

- Automated text moderation.
- In-game reporting (Quick Report).
- Server-authoritative architecture (anti-cheat by design).

### Phase 2: Competition (Months 4-6)

**Multiplayer:**

- Red Team vs. Blue Team (Classic format, 2v2).
- Ranked play with placement matches.
- Asynchronous multiplayer (basic attack scripts).

**Social:**

- Squad and Division chat channels.
- Achievement system (first wave of achievements).
- Replay sharing.

**Enterprise:**

- Department leaderboards.
- Manager dashboard (aggregate metrics only).
- Training completion tracking.

**Competitive Events:**

- First Jeopardy-style CTF event.
- First defense challenge (waves 1-10 only).

**Trust & Safety:**

- Voice chat with moderation.
- Anti-cheat statistical analysis (first models deployed).
- Age gate and parental controls.

### Phase 3: Community (Months 7-9)

**Multiplayer:**

- 6-player cooperative play (full scenario library).
- Asymmetric competitive modes.
- Full async multiplayer with visual scripting.

**Social:**

- Mentorship system.
- The Archive (community knowledge base).
- Discussion forums.

**Enterprise:**

- Inter-department challenges.
- Peer recognition (Kudos system).
- Compliance reporting.

**Community:**

- Scenario editor (beta).
- Detection rule authoring.
- Community marketplace (beta).

**Trust & Safety:**

- Community moderator program.
- Appeal process.
- UGC moderation pipeline.

### Phase 4: Scale (Months 10-12)

**Multiplayer:**

- Corporation systems (full hierarchy, diplomacy, treasury).
- Raid events (Tier 1 and Tier 2).
- Purple Team mode.

**Social:**

- Social graph tiers.
- Streaming overlay and spectator mode.
- Clip system.

**Enterprise:**

- Cross-organization benchmarking.
- LMS integration (SCORM/xAPI).
- Enterprise reward integration.

**Competitive Events:**

- First seasonal tournament.
- Attack-Defense CTF.
- Hackathon events.

**Community:**

- Modding SDK (beta).
- Bug bounty program launch.
- Creator economy (revenue sharing for verified creators).

**Trust & Safety:**

- Full GDPR/CCPA compliance audit.
- Enterprise data residency options.
- Advanced anti-cheat (ML models v2).

### Phase 5: Maturity (Months 13+)

- Tier 3 and Tier 4 raids.
- Alliance system (multi-Corporation coalitions).
- Speed-run validated leaderboards.
- Annual championship events.
- Modding SDK (stable release).
- Educational institution licensing and LMS integration.
- Continuous improvement based on community feedback and telemetry.

---

## 11. Success Metrics

### 11.1 Engagement Metrics

| Metric                         | Target (Phase 2)         | Target (Phase 4)         | Measurement                             |
| ------------------------------ | ------------------------ | ------------------------ | --------------------------------------- |
| DAU / MAU ratio                | 25%                      | 40%                      | Daily/monthly active users              |
| Average session length         | 25 min                   | 35 min                   | Time from login to logout               |
| Multiplayer participation rate | 30% of sessions          | 60% of sessions          | Sessions including any multiplayer mode |
| Friend list utilization        | 3 avg friends per player | 8 avg friends per player | Friends added and interacted with       |
| Corporation membership         | 20% of active players    | 50% of active players    | Players in a Corporation                |
| Retention (D30)                | 30%                      | 45%                      | Players returning after 30 days         |

### 11.2 Training Effectiveness Metrics

| Metric                             | Target                                               | Measurement                                                 |
| ---------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| Phishing detection improvement     | 40% improvement from baseline after 4 weeks          | Pre/post assessment scores                                  |
| Incident response time improvement | 30% reduction after 8 weeks                          | Average MTTD and MTTR in-game                               |
| Knowledge retention (90-day)       | 70% of skills retained                               | Re-assessment scores at 90 days                             |
| Cross-skill transfer               | Measurable improvement in related real-world metrics | Enterprise customer surveys and phishing simulation results |

### 11.3 Enterprise Metrics

| Metric                                 | Target                 | Measurement                      |
| -------------------------------------- | ---------------------- | -------------------------------- |
| Enterprise employee participation rate | 70% monthly active     | MAU / total provisioned accounts |
| Training completion rate               | 85% within deadline    | Assigned vs. completed scenarios |
| Manager dashboard usage                | 60% of managers weekly | Manager login frequency          |
| License renewal rate                   | 90%                    | Annual renewal vs. new licenses  |
| NPS (enterprise buyer)                 | 50+                    | Quarterly survey                 |

### 11.4 Community Health Metrics

| Metric                            | Target                                 | Measurement                             |
| --------------------------------- | -------------------------------------- | --------------------------------------- |
| UGC creation rate                 | 100+ new scenarios per month (Phase 4) | Submissions to marketplace              |
| Mentor-mentee matches             | 500+ active pairs (Phase 4)            | Active mentorship relationships         |
| Community knowledge base articles | 1000+ articles (Phase 4)               | Archive article count                   |
| Report resolution time            | < 24 hours (median)                    | Time from report to resolution          |
| False positive moderation rate    | < 5%                                   | Moderation actions overturned on appeal |

---

## 12. Appendices

### Appendix A: Glossary

| Term  | Definition                                                                                      |
| ----- | ----------------------------------------------------------------------------------------------- |
| APT   | Advanced Persistent Threat -- a sophisticated, long-term cyberattack campaign                   |
| BEC   | Business Email Compromise -- a phishing variant targeting financial transactions                |
| C2    | Command and Control -- infrastructure used by attackers to communicate with compromised systems |
| COPPA | Children's Online Privacy Protection Act                                                        |
| CTF   | Capture the Flag -- a cybersecurity competition format                                          |
| DSL   | Domain-Specific Language -- a programming language designed for a specific problem domain       |
| EDR   | Endpoint Detection and Response -- a security tool for monitoring endpoints                     |
| IOC   | Indicator of Compromise -- an artifact that indicates a security breach                         |
| ISAC  | Information Sharing and Analysis Center -- a sector-specific threat intelligence organization   |
| LMS   | Learning Management System                                                                      |
| MTTD  | Mean Time to Detect                                                                             |
| MTTR  | Mean Time to Respond                                                                            |
| OIDC  | OpenID Connect -- an authentication protocol                                                    |
| PII   | Personally Identifiable Information                                                             |
| SAML  | Security Assertion Markup Language -- an authentication standard                                |
| SCORM | Sharable Content Object Reference Model -- an e-learning standard                               |
| SIEM  | Security Information and Event Management                                                       |
| SOAR  | Security Orchestration, Automation, and Response                                                |
| SOC   | Security Operations Center                                                                      |
| SSO   | Single Sign-On                                                                                  |
| xAPI  | Experience API -- a modern e-learning data standard                                             |

### Appendix B: Competitive Mode Balance Considerations

Red team / blue team balance is critical for competitive integrity. Key considerations:

1. **Information Asymmetry**: Red team has the advantage of choosing when and how to attack. Blue team has the advantage of knowing their own infrastructure. Balance these by giving Blue team preparation time before Red team begins.

2. **Tool Parity**: Each new Red team tool should have a corresponding Blue team countermeasure (and vice versa). No tool should be uncounterable.

3. **Skill Floor vs. Skill Ceiling**: Red team should have a higher skill floor (harder to get started) but comparable skill ceiling. This reflects real-world dynamics where attacking requires more specialized knowledge than basic defense.

4. **Role Swapping**: Mandatory role swapping in ranked play prevents one-dimensional skill development and ensures all players understand both perspectives.

5. **Map/Scenario Rotation**: Competitive scenarios rotate to prevent meta-stagnation. New scenarios are playtested extensively before entering ranked rotation.

### Appendix C: Enterprise Deployment Checklist

- [ ] SSO integration configured and tested
- [ ] Organizational structure mapped to Corporation / Division / Squad hierarchy
- [ ] Manager dashboard roles assigned
- [ ] Privacy policy reviewed and consent banners configured
- [ ] Data residency region selected
- [ ] Moderation strictness level configured
- [ ] Async PvP enabled/disabled per organizational preference
- [ ] Custom training scenarios uploaded (if any)
- [ ] Reward integration configured (if applicable)
- [ ] LMS integration configured (if applicable)
- [ ] Employee onboarding communication prepared
- [ ] Support escalation path defined
- [ ] Compliance reporting templates selected

### Appendix D: Dependencies on Other BRD Documents

| BRD                     | Dependency Description                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| BRD-01 (Core Gameplay)  | Multiplayer modes extend the single-player facility management loop                                 |
| BRD-02 (Email System)   | Phishing simulation system must support multi-player scenarios (shared inboxes, targeted campaigns) |
| BRD-03 (Upgrade System) | Cooperative upgrades and Corporation-shared infrastructure extend the upgrade tree                  |
| BRD-04 (Threat System)  | Raid events and competitive modes require the full threat model library                             |
| BRD-05 (Economy)        | Corporation treasury, marketplace currency, and creator revenue share integrate with the economy    |
| BRD-06 (UI/UX)          | Multiplayer UI (lobbies, spectator, overlay) must follow the established design language            |
| BRD-07 (Narrative)      | Seasonal themes and raid narratives must align with the world-building bible                        |
| BRD-08 (Audio)          | Voice chat infrastructure, multiplayer audio cues, and raid event soundscapes                       |
| BRD-09 (Analytics)      | All multiplayer and social metrics feed into the analytics pipeline                                 |
| BRD-10 (Onboarding)     | Multiplayer onboarding flow (first cooperative mission, first friend, first Corporation)            |

---

_This document is a living specification. It will be updated as features are implemented, playtested, and refined based on player feedback and enterprise customer requirements._

_Last review: 2026-02-05_
_Next scheduled review: 2026-03-05_
