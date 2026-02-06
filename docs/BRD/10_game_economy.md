# The DMZ: Archive Gate -- Game Economy, Progression & Monetization Report

**Document ID:** BRD-010
**Version:** 1.0
**Date:** 2026-02-05
**Author:** Systems Design / Economy Design
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [In-Game Economy](#2-in-game-economy)
3. [Progression Systems](#3-progression-systems)
4. [Difficulty Scaling](#4-difficulty-scaling)
5. [Monetization Strategy](#5-monetization-strategy)
6. [Retention Mechanics](#6-retention-mechanics)
7. [Appendices](#7-appendices)

---

## 1. Executive Summary

The DMZ: Archive Gate is a cybersecurity training platform disguised as a post-apocalyptic data center management game. The economy and progression systems must serve a dual purpose: they must function as a compelling game loop that keeps players engaged, and they must accurately model real-world cybersecurity decision-making so that skills transfer outside the game.

Every currency earned, every resource managed, and every upgrade purchased maps to a real cybersecurity concept. The player is never grinding for arbitrary numbers -- they are building a mental model of risk management, infrastructure planning, incident response, and operational security.

This document defines the full economic model, progression framework, difficulty curve, monetization strategy, and retention architecture.

---

## 2. In-Game Economy

### 2.1 Currency Systems

The economy uses a layered currency model. Each currency is earned through correct security decisions and spent on meaningful upgrades. There is no currency that can be purchased with real money that affects gameplay power.

#### 2.1.1 Primary Currency: Credits (CR)

**What it represents:** Operational revenue from data recovery and hosting contracts.

| Source                      | Earning Rate                   | Notes                                                |
| --------------------------- | ------------------------------ | ---------------------------------------------------- |
| Accepted legitimate client  | 50-500 CR per contract         | Scales with contract complexity and storage duration |
| Completed lease term        | Bonus 10-20% of contract value | Paid when a client's lease expires cleanly           |
| Successful threat detection | 25-100 CR bounty               | Identifying and rejecting malicious applicants       |
| Phishing identification     | 15-75 CR per correct ID        | Bonus for catching sophisticated attempts            |
| Clean daily operation       | 10-50 CR passive income        | Scales with facility size and uptime percentage      |
| Emergency data recovery     | 200-1000 CR                    | High-risk, high-reward special contracts             |

**Spending:**

- Infrastructure upgrades (racks, cooling, power, bandwidth)
- Security tool purchases and subscriptions
- Staff/automation hiring
- Facility expansion
- Ransom payments (breach penalty)
- Maintenance and operational costs

**Design Intent:** Credits are the heartbeat of the economy. Every decision the player makes either generates or costs Credits. The player must internalize that security decisions are business decisions -- a concept central to real-world CISO thinking.

#### 2.1.2 Secondary Currency: Trust Score (TS)

**What it represents:** The player's reputation in the post-collapse network community. This is not a spendable currency but a gating metric that unlocks tiers of clients, contracts, and narrative content.

| Action                             | Trust Impact | Notes                                   |
| ---------------------------------- | ------------ | --------------------------------------- |
| Accept legitimate client           | +1 to +5     | Based on client prominence              |
| Reject malicious applicant         | +2 to +10    | Higher for sophisticated threats        |
| Accept malicious applicant         | -10 to -50   | Severity depends on breach outcome      |
| Reject legitimate client           | -1 to -3     | Small penalty, represents lost goodwill |
| Survive a breach without data loss | +5 to +15    | Shows resilience                        |
| Lose client data in breach         | -20 to -100  | Catastrophic reputation damage          |
| Publish threat intelligence        | +3 to +8     | Sharing findings with the community     |
| Complete a certification module    | +5 to +10    | Demonstrates competence                 |

**Trust Score Tiers:**

| Tier       | TS Range | Unlocks                                                     |
| ---------- | -------- | ----------------------------------------------------------- |
| Unknown    | 0-49     | Basic contracts, Tier 1 clients only                        |
| Recognized | 50-149   | Mid-tier contracts, access to government clients            |
| Trusted    | 150-299  | Premium contracts, intelligence sharing network             |
| Respected  | 300-499  | Elite contracts, partnership opportunities, Prestige unlock |
| Legendary  | 500+     | Full narrative access, mentor role, New Game+ modifiers     |

#### 2.1.3 Tertiary Currency: Intel Fragments (IF)

**What it represents:** Actionable threat intelligence gathered from analyzing attacks, reviewing logs, and investigating incidents.

**Earning:**

- Analyzing a blocked attack's payload: 1-5 IF
- Completing an incident investigation: 5-15 IF
- Dissecting malware from a supply chain attack: 10-25 IF
- Correlating attack patterns across multiple incidents: 5-20 IF

**Spending:**

- Unlock advanced detection signatures (3-10 IF)
- Purchase threat actor profiles (5-15 IF)
- Upgrade IDS/IPS rule sets (10-20 IF)
- Trade with allied data centers for resources (variable)

**Design Intent:** Intel Fragments force players to engage with the investigative and analytical side of cybersecurity rather than just the operational side. They reward curiosity and thoroughness.

---

### 2.2 Resource Management

The physical infrastructure of the data center is modeled through four interconnected resource systems. These create a constraint-satisfaction puzzle that mirrors real data center capacity planning.

#### 2.2.1 Rack Space

**Unit:** Rack Units (U), standard 42U racks.

| Tier               | Starting Capacity | Max Capacity      | Notes               |
| ------------------ | ----------------- | ----------------- | ------------------- |
| Starter Room       | 2 racks (84U)     | 4 racks (168U)    | Initial facility    |
| Expansion Wing     | 8 racks (336U)    | 16 racks (672U)   | First major upgrade |
| Full Floor         | 20 racks (840U)   | 40 racks (1680U)  | Mid-game milestone  |
| Multi-Floor Campus | 60 racks (2520U)  | 120 racks (5040U) | Late-game facility  |

**Client Space Requirements:**

- Small archive (personal data): 1-2U
- Medium archive (small business): 4-8U
- Large archive (enterprise/government): 12-42U
- Critical infrastructure backup: 42-84U (1-2 full racks)

**Mechanic:** Every accepted client consumes rack space for the duration of their lease. The player must balance accepting revenue-generating clients against maintaining reserve capacity for emergencies and high-value contracts.

#### 2.2.2 Bandwidth

**Unit:** Megabits per second (Mbps), representing the facility's connection to the surviving network fragments.

| Tier                   | Capacity | Monthly Cost |
| ---------------------- | -------- | ------------ |
| Salvaged Link          | 100 Mbps | 50 CR/day    |
| Restored Fiber         | 500 Mbps | 150 CR/day   |
| Redundant Backbone     | 2 Gbps   | 400 CR/day   |
| Satellite + Fiber Mesh | 10 Gbps  | 1000 CR/day  |

**Consumption Model:**

- Each active client consumes 5-50 Mbps during data transfer operations
- Security scanning overhead: 10-20% of total bandwidth
- Attack traffic during incidents can spike bandwidth 200-500%
- DDoS events can saturate the link entirely if not mitigated

**Design Intent:** Bandwidth is the resource most directly tied to security decisions. More clients means more bandwidth consumption, which means less headroom to absorb attack traffic. Players learn that capacity planning must account for adversarial conditions.

#### 2.2.3 Power

**Unit:** Kilowatts (kW).

| Tier                    | Capacity | Notes                               |
| ----------------------- | -------- | ----------------------------------- |
| Generator Backup        | 20 kW    | Unreliable, 5% daily failure chance |
| Stabilized Grid Tap     | 50 kW    | Requires maintenance every 30 days  |
| Solar + Battery Array   | 80 kW    | Weather-dependent, 70-100% output   |
| Fusion Cell (late-game) | 200 kW   | Narrative-gated, near-unlimited     |

**Consumption:**

- Per rack (loaded): 2-5 kW depending on density
- Cooling systems: 30-50% of compute power draw
- Security appliances: 1-3 kW per device
- Lighting and facility: 2-5 kW base load

**Failure Mechanic:** If power consumption exceeds capacity, systems begin failing in priority order (lowest-priority clients first). A full power failure triggers emergency shutdown -- all active leases are suspended, clients may leave, Trust Score drops.

#### 2.2.4 Cooling

**Unit:** Tons of cooling capacity (abstract).

| Tier                      | Capacity | Notes                                 |
| ------------------------- | -------- | ------------------------------------- |
| Salvaged HVAC             | 5 tons   | Noisy, power-hungry, unreliable       |
| Rebuilt Precision Cooling | 15 tons  | Standard reliability                  |
| Liquid Cooling Loop       | 30 tons  | Efficient, enables high-density racks |
| Deep Earth Exchange       | 60 tons  | Late-game, minimal power draw         |

**Thermal Model:**

- Each loaded rack generates 0.5-2 tons of heat
- Cooling failure cascade: temperature rises over 3-5 in-game hours
- At critical temperature: hardware throttling (-50% performance)
- At emergency temperature: automatic shutdown to prevent damage

**Design Intent:** Cooling is the "hidden" resource that new players underestimate. It teaches the real-world lesson that data center capacity is often cooling-limited, not space-limited.

---

### 2.3 Cost Structures

#### 2.3.1 Infrastructure Upgrade Costs

**Rack Expansion:**

| Upgrade                  | Cost (CR) | Build Time | Prerequisite                  |
| ------------------------ | --------- | ---------- | ----------------------------- |
| Additional Rack (single) | 500       | 1 day      | Available floor space         |
| Rack Row (4 racks)       | 1,800     | 3 days     | Expansion Wing unlocked       |
| Expansion Wing           | 5,000     | 7 days     | Trust Score >= 50, Level 5+   |
| Full Floor Buildout      | 15,000    | 14 days    | Trust Score >= 150, Level 15+ |
| Multi-Floor Campus       | 50,000    | 30 days    | Trust Score >= 300, Level 25+ |

**Security Tool Costs:**

| Tool                          | Cost (CR) | Recurring Cost | Category             |
| ----------------------------- | --------- | -------------- | -------------------- |
| Basic Firewall Rules          | 100       | --             | Network Security     |
| IDS (Signature-based)         | 500       | 25 CR/day      | Threat Detection     |
| IPS (Inline blocking)         | 1,200     | 50 CR/day      | Threat Prevention    |
| SIEM (Log aggregation)        | 2,000     | 75 CR/day      | Monitoring           |
| Endpoint Detection            | 800       | 30 CR/day      | Endpoint Security    |
| Email Gateway Filter          | 600       | 20 CR/day      | Email Security       |
| Vulnerability Scanner         | 1,500     | 40 CR/day      | Assessment           |
| WAF                           | 1,000     | 35 CR/day      | Application Security |
| Threat Intel Feed             | 3,000     | 100 CR/day     | Intelligence         |
| SOAR Platform                 | 5,000     | 150 CR/day     | Automation           |
| Deception Network (Honeypots) | 2,500     | 60 CR/day      | Active Defense       |
| Zero Trust Gateway            | 8,000     | 200 CR/day     | Access Control       |
| AI Anomaly Detection          | 10,000    | 300 CR/day     | Advanced Detection   |
| Quantum-Resistant Encryption  | 15,000    | -- (one-time)  | Cryptography         |

**Design Note:** Recurring costs for security tools model the real-world reality that security is an ongoing operational expense, not a one-time purchase. Players who buy tools they cannot sustain will face difficult decisions about what to cut.

#### 2.3.2 Staffing / Automation Costs

| Role               | Hire Cost (CR) | Salary (CR/day) | Effect                                     |
| ------------------ | -------------- | --------------- | ------------------------------------------ |
| Junior Analyst     | 200            | 15              | Auto-flags obvious phishing (60% accuracy) |
| Senior Analyst     | 800            | 40              | Auto-flags phishing (85% accuracy)         |
| Incident Responder | 1,000          | 50              | Reduces breach containment time by 30%     |
| Threat Hunter      | 1,500          | 75              | Passively generates 1-3 IF/day             |
| Automation Script  | 500            | 5               | Automates one specific repetitive task     |
| AI Assistant       | 3,000          | 100             | Automates triage, reduces alert fatigue    |

---

### 2.4 Economic Sinks and Faucets

Maintaining economic balance is critical. If credits accumulate too fast, decisions lose weight. If they drain too fast, the game feels punishing rather than instructive.

#### 2.4.1 Faucets (Credit Sources)

| Faucet                      | Flow Rate      | Player Control                       | Notes                            |
| --------------------------- | -------------- | ------------------------------------ | -------------------------------- |
| Client contracts            | High           | Full control (accept/reject)         | Primary income                   |
| Lease completion bonuses    | Medium         | Indirect (depends on acceptance)     | Rewards good vetting             |
| Threat bounties             | Low-Medium     | Skill-dependent                      | Rewards correct identification   |
| Daily uptime bonus          | Low            | Indirect (depends on infrastructure) | Passive income floor             |
| Intel trade revenue         | Low            | Moderate                             | Converts IF to CR                |
| Emergency contract premiums | High (burst)   | Risk-dependent                       | High reward, high attack surface |
| Achievement bonuses         | Low (one-time) | Milestone-based                      | Non-repeatable                   |

#### 2.4.2 Sinks (Credit Drains)

| Sink                    | Drain Rate  | Player Control                   | Notes                        |
| ----------------------- | ----------- | -------------------------------- | ---------------------------- |
| Staff salaries          | Steady      | Full control (hire/fire)         | Largest ongoing cost         |
| Tool subscriptions      | Steady      | Full control (subscribe/cancel)  | Second largest ongoing cost  |
| Power and cooling OpEx  | Steady      | Indirect (scales with capacity)  | Baseline operational cost    |
| Infrastructure upgrades | Burst       | Full control (when to build)     | Large one-time costs         |
| Ransom payments         | Emergency   | Indirect (breach = payment)      | Punitive sink                |
| Maintenance events      | Random      | Partial (preventive vs reactive) | Equipment failures, patches  |
| Client compensation     | Conditional | Indirect (SLA violations)        | Triggered by downtime        |
| Bandwidth overage fees  | Conditional | Indirect (traffic spikes)        | Penalizes under-provisioning |

#### 2.4.3 Balancing Mechanisms

**Dynamic Contract Value Scaling:**
Contract values adjust based on the player's current financial state using a hidden modifier:

- If player CR > 2x their daily operating cost \* 30: Contract values decrease by 10-20% (market normalization -- "everyone knows you are flush")
- If player CR < 5x their daily operating cost: Contract values increase by 10-15% (desperation premium -- clients know you need the work)
- Contracts from higher-risk clients always pay more, maintaining the risk/reward tension regardless of economic state

**Maintenance Cost Escalation:**
As the facility grows, maintenance costs scale super-linearly. This prevents infinite expansion and forces the player to make strategic choices about facility size versus capability depth.

| Facility Size | Maintenance Multiplier |
| ------------- | ---------------------- |
| 1-4 racks     | 1.0x                   |
| 5-16 racks    | 1.3x                   |
| 17-40 racks   | 1.7x                   |
| 41-120 racks  | 2.2x                   |

**Entropy Events:**
Unplanned costs that scale with facility size and simulate real-world operational uncertainty:

- Hardware failures (replace or repair)
- Software license audits (retroactive costs)
- Supply chain disruptions (increased procurement costs)
- Environmental events (storms affecting power/cooling)

---

### 2.5 Risk/Reward Mechanics Tied to Security Decisions

Every security decision in the game is an economic decision. This is the core design thesis.

#### 2.5.1 Client Acceptance Risk Matrix

| Client Risk Profile                            | Contract Value     | Attack Surface Increase | Probability of Breach Trigger |
| ---------------------------------------------- | ------------------ | ----------------------- | ----------------------------- |
| Low Risk (verified individual)                 | 50-100 CR          | +1%                     | 2%                            |
| Medium Risk (small org, partial verification)  | 100-250 CR         | +3%                     | 8%                            |
| High Risk (unknown org, urgent request)        | 250-500 CR         | +7%                     | 20%                           |
| Critical Risk (suspicious signals, high value) | 500-1000 CR        | +15%                    | 40%                           |
| Trap (malicious applicant disguised as client) | 0 CR (attack only) | +25%                    | 85%                           |

**Key Mechanic:** The player never knows with certainty which category a client falls into. They must use the verification documents (Phishing Analysis Worksheet, Verification Packet, Threat Assessment Sheet) to make a probabilistic judgment. This mirrors real-world security decision-making under uncertainty.

#### 2.5.2 Security Investment ROI

Every security tool reduces breach probability by a quantifiable amount, allowing players to reason about security spending as an investment:

| Investment     | Cost (annualized) | Breach Probability Reduction    | Expected Value Saved      |
| -------------- | ----------------- | ------------------------------- | ------------------------- |
| Basic Firewall | 100 CR            | -5% base                        | Depends on portfolio      |
| IDS + IPS      | 27,375 CR/year    | -15% base                       | High for large facilities |
| SIEM           | 29,375 CR/year    | -10% base, +25% detection speed | Reduces breach cost       |
| Full Stack     | ~150,000 CR/year  | -60% cumulative                 | Required at scale         |

The game surfaces these calculations through the Facility Status Report, teaching players to think about security budgets in terms of risk reduction per credit spent.

#### 2.5.3 The Breach Economy

When a breach occurs, the following economic cascade triggers:

1. **Immediate:** Operations lock behind ransom note
2. **Ransom Cost:** Total lifetime earnings / 10 (minimum 1 CR)
3. **Downtime Cost:** All active client leases pause; no income during lockout
4. **Recovery Cost:** Incident response time = 1-7 days depending on tooling and staff
5. **Reputation Cost:** Trust Score penalty based on severity
6. **Client Loss:** 10-40% of active clients terminate contracts early
7. **Market Impact:** New contract values drop 10-20% for 30 days post-breach

**Design Intent:** The breach penalty is designed to feel devastating without being unrecoverable. The ransom formula (total earnings / 10) means that breaches become more expensive as the player becomes more successful, maintaining stakes throughout the game. Early-game breaches cost little but teach the lesson. Late-game breaches are catastrophic and test everything the player has learned.

**Breach Survival Scenarios:**

| Player State | Total Earnings | Ransom Cost | Can Pay?                 | Outcome                  |
| ------------ | -------------- | ----------- | ------------------------ | ------------------------ |
| Early game   | 500 CR         | 50 CR       | Likely                   | Painful but recoverable  |
| Mid game     | 10,000 CR      | 1,000 CR    | Depends on reserves      | Tests financial planning |
| Late game    | 100,000 CR     | 10,000 CR   | Only if well-managed     | Tests everything         |
| Overextended | 50,000 CR      | 5,000 CR    | Might not have liquid CR | Potential game over      |

---

## 3. Progression Systems

### 3.1 Player Level / Rank Progression

Player level represents overall cybersecurity competence and facility management capability. Experience points (XP) are earned through gameplay actions, with a strong bias toward security-correct actions.

#### 3.1.1 XP Sources

| Action                                      | XP Earned   | Notes                             |
| ------------------------------------------- | ----------- | --------------------------------- |
| Correct client accept (legitimate)          | 10-30 XP    | Scaled by verification difficulty |
| Correct client reject (malicious)           | 20-50 XP    | Higher reward for harder catches  |
| Incorrect decision (either direction)       | 0 XP        | No XP for mistakes                |
| Complete an incident investigation          | 50-200 XP   | Scaled by complexity              |
| Survive a breach                            | 100-500 XP  | Learning from failure             |
| Complete a daily challenge                  | 25-75 XP    | Consistency reward                |
| Complete a certification module             | 200-1000 XP | Major milestone                   |
| Discover a zero-day in client payload       | 500 XP      | Rare, high-skill action           |
| Maintain 100% uptime for 7 consecutive days | 150 XP      | Operational excellence            |
| Successfully contain an APT campaign        | 300-1000 XP | Boss encounter completion         |

#### 3.1.2 Level Progression Table

The XP curve uses a modified logarithmic scale. Early levels come fast to maintain engagement; later levels require sustained competence.

| Level | Title / Rank      | Total XP Required | Unlocks                                  |
| ----- | ----------------- | ----------------- | ---------------------------------------- |
| 1     | Intern            | 0                 | Tutorial, Basic Firewall                 |
| 2     | Junior Technician | 100               | Email Gateway Filter                     |
| 3     | Technician        | 300               | IDS access, first hire slot              |
| 4     | Senior Technician | 600               | Vulnerability Scanner                    |
| 5     | Junior Analyst    | 1,000             | Expansion Wing, IPS, Skill Tree access   |
| 7     | Analyst           | 2,000             | SIEM, second hire slot                   |
| 10    | Senior Analyst    | 4,000             | Endpoint Detection, WAF                  |
| 13    | Junior Engineer   | 7,500             | Threat Intel Feed, third hire slot       |
| 15    | Security Engineer | 12,000            | Full Floor Buildout, SOAR Platform       |
| 18    | Senior Engineer   | 18,000            | Deception Network, Threat Hunter hire    |
| 20    | Architect         | 25,000            | Zero Trust Gateway, fourth hire slot     |
| 23    | Senior Architect  | 35,000            | AI Anomaly Detection                     |
| 25    | Principal         | 50,000            | Multi-Floor Campus, all tools unlocked   |
| 28    | Director          | 70,000            | Mentor abilities, community features     |
| 30    | CISO              | 100,000           | Prestige mode unlock, Quantum Encryption |
| 31-50 | Prestige Levels   | +10,000/level     | Cosmetic titles, leaderboard tiers       |

#### 3.1.3 Rank Insignia and Display

Each rank has a visual insignia displayed on the player's profile, facility banner, and in multiplayer interactions. Ranks are styled as military-adjacent designations fitting the post-apocalyptic setting:

- Levels 1-5: **Bronze Terminal** (copper circuit-board aesthetic)
- Levels 6-10: **Silver Conduit** (brushed steel, clean lines)
- Levels 11-15: **Gold Relay** (gold traces on dark substrate)
- Levels 16-20: **Platinum Node** (white and chrome, holographic)
- Levels 21-25: **Diamond Core** (crystalline, refractive effects)
- Levels 26-30: **Obsidian Gate** (dark, iridescent, the final form)
- Levels 31+: **Prestige variants** (animated versions of prior tiers)

---

### 3.2 Skill Trees

The skill tree system maps directly to recognized cybersecurity competency domains. Each tree contains nodes that unlock passive bonuses, active abilities, and knowledge that transfers to real-world skills.

#### 3.2.1 Skill Tree: Network Defense

**Maps to:** CompTIA Network+, CySA+ network monitoring, CCNA Security

| Node                   | Tier | Cost  | Effect                                             | Real-World Skill            |
| ---------------------- | ---- | ----- | -------------------------------------------------- | --------------------------- |
| Packet Inspector       | 1    | 3 SP  | View basic network traffic summaries               | Network traffic analysis    |
| Firewall Mastery       | 1    | 3 SP  | +10% firewall effectiveness                        | Firewall rule management    |
| Segmentation           | 2    | 5 SP  | Unlock network segmentation (limits breach spread) | Network segmentation design |
| Traffic Shaping        | 2    | 5 SP  | Reduce bandwidth overhead by 15%                   | QoS and traffic management  |
| Deep Packet Inspection | 3    | 8 SP  | Detect encrypted malicious payloads (partial)      | DPI and SSL inspection      |
| Microsegmentation      | 3    | 8 SP  | Each rack becomes an isolated security zone        | Zero trust networking       |
| Protocol Hardening     | 4    | 12 SP | Eliminate entire categories of network attacks     | Protocol security           |
| Autonomous Defense     | 5    | 15 SP | Network auto-responds to known attack patterns     | SDN security automation     |

#### 3.2.2 Skill Tree: Threat Intelligence

**Maps to:** GIAC GCTI, MITRE ATT&CK knowledge, CTI analyst skills

| Node                   | Tier | Cost  | Effect                                         | Real-World Skill         |
| ---------------------- | ---- | ----- | ---------------------------------------------- | ------------------------ |
| Indicator Recognition  | 1    | 3 SP  | See basic IoCs in attack data                  | IoC identification       |
| Attribution Basics     | 1    | 3 SP  | Partial threat actor identification            | Threat actor profiling   |
| Campaign Tracking      | 2    | 5 SP  | Link related attacks into campaigns            | Campaign analysis        |
| TTP Mapping            | 2    | 5 SP  | Attacks are tagged with MITRE ATT&CK TTPs      | ATT&CK framework usage   |
| Predictive Analysis    | 3    | 8 SP  | Preview likely next attack vectors             | Threat forecasting       |
| Dark Web Monitoring    | 3    | 8 SP  | Early warning of targeted attacks              | OSINT and dark web intel |
| Intelligence Sharing   | 4    | 12 SP | Trade intel with allied facilities for bonuses | ISAC participation       |
| Strategic Intelligence | 5    | 15 SP | Long-term threat landscape visibility          | Strategic CTI            |

#### 3.2.3 Skill Tree: Incident Response

**Maps to:** GIAC GCIH, EC-Council ECIH, incident response procedures

| Node                  | Tier | Cost  | Effect                                            | Real-World Skill        |
| --------------------- | ---- | ----- | ------------------------------------------------- | ----------------------- |
| Triage Basics         | 1    | 3 SP  | Faster alert processing                           | Alert triage            |
| Containment Protocols | 1    | 3 SP  | Reduce breach spread speed by 20%                 | Incident containment    |
| Evidence Collection   | 2    | 5 SP  | Unlock forensic analysis mini-game                | Digital forensics       |
| Root Cause Analysis   | 2    | 5 SP  | Post-incident reports reveal attacker entry point | RCA methodology         |
| Playbook Authoring    | 3    | 8 SP  | Create automated response playbooks               | IR playbook development |
| Memory Forensics      | 3    | 8 SP  | Detect fileless malware                           | Memory analysis         |
| Recovery Optimization | 4    | 12 SP | Reduce post-breach downtime by 50%                | Business continuity     |
| Purple Teaming        | 5    | 15 SP | Run attack simulations against your own facility  | Purple team exercises   |

#### 3.2.4 Skill Tree: Governance, Risk & Compliance

**Maps to:** CISSP domains, CISM, ISO 27001, NIST CSF

| Node                           | Tier | Cost  | Effect                                        | Real-World Skill           |
| ------------------------------ | ---- | ----- | --------------------------------------------- | -------------------------- |
| Risk Register                  | 1    | 3 SP  | See risk scores for each client and system    | Risk assessment            |
| Policy Framework               | 1    | 3 SP  | Unlock facility-wide security policies        | Security policy writing    |
| Compliance Mapping             | 2    | 5 SP  | Clients with compliance needs pay 15% premium | Regulatory compliance      |
| Business Impact Analysis       | 2    | 5 SP  | See projected cost of each potential failure  | BIA methodology            |
| Audit Preparedness             | 3    | 8 SP  | Pass audits for bonus CR and Trust Score      | Audit management           |
| Vendor Risk Management         | 3    | 8 SP  | Reduce supply chain attack probability by 25% | Third-party risk           |
| Crisis Communication           | 4    | 12 SP | Reduce Trust Score loss from breaches by 30%  | Crisis management          |
| Enterprise Risk Quantification | 5    | 15 SP | Full visibility into economic risk model      | FAIR / risk quantification |

#### 3.2.5 Skill Tree: Identity & Access Management

**Maps to:** IAM principles, PAM, authentication technologies

| Node                    | Tier | Cost  | Effect                                            | Real-World Skill    |
| ----------------------- | ---- | ----- | ------------------------------------------------- | ------------------- |
| Password Policy         | 1    | 3 SP  | Reduce credential-based attack success by 10%     | Password management |
| Multi-Factor Auth       | 1    | 3 SP  | Reduce phishing breach success by 25%             | MFA implementation  |
| Role-Based Access       | 2    | 5 SP  | Staff errors reduced by 20%                       | RBAC design         |
| Privileged Access Mgmt  | 2    | 5 SP  | Admin compromise no longer gives full access      | PAM principles      |
| Certificate Management  | 3    | 8 SP  | Eliminate man-in-the-middle attacks               | PKI management      |
| Behavioral Analytics    | 3    | 8 SP  | Detect compromised accounts via anomaly           | UEBA                |
| Just-In-Time Access     | 4    | 12 SP | Minimize standing privileges, reduce blast radius | JIT/JEA concepts    |
| Continuous Verification | 5    | 15 SP | Full zero-trust identity model                    | Zero trust identity |

#### 3.2.6 Skill Point (SP) Economy

Skill Points are earned separately from XP to allow specialization:

| Source                                  | SP Earned |
| --------------------------------------- | --------- |
| Level up                                | 2 SP      |
| Complete certification module           | 3-5 SP    |
| First-time completion of boss encounter | 5 SP      |
| Weekly challenge streak (7/7)           | 1 SP      |
| Prestige level up                       | 3 SP      |

**Total SP available by Level 30:** approximately 80-100 SP
**Total SP to max all trees:** approximately 300 SP

This means a Level 30 player can deeply specialize in 1-2 trees or moderately invest across 3-4 trees. Full mastery requires Prestige levels, encouraging long-term engagement and replayability.

**Respec Mechanic:** Players may reallocate skill points once per prestige cycle for free, or at any time for 1,000 CR. This allows experimentation without permanent punishment.

---

### 3.3 Unlock Systems

#### 3.3.1 Tool Unlocks

Tools are gated by player level and skill tree investment, not just currency. This ensures players understand the tools they acquire.

**Unlock Requirements Matrix:**

| Tool                  | Level Req | Skill Tree Req              | CR Cost |
| --------------------- | --------- | --------------------------- | ------- |
| Basic Firewall        | 1         | None                        | 100     |
| Email Gateway         | 2         | None                        | 600     |
| IDS                   | 3         | Network Defense T1          | 500     |
| Vulnerability Scanner | 4         | None                        | 1,500   |
| IPS                   | 5         | Network Defense T1          | 1,200   |
| Endpoint Detection    | 10        | Incident Response T1        | 800     |
| SIEM                  | 7         | Any tree T2                 | 2,000   |
| WAF                   | 10        | Network Defense T2          | 1,000   |
| Threat Intel Feed     | 13        | Threat Intel T2             | 3,000   |
| SOAR                  | 15        | Incident Response T3        | 5,000   |
| Deception Network     | 18        | Threat Intel T3             | 2,500   |
| Zero Trust Gateway    | 20        | IAM T3 + Network Defense T3 | 8,000   |
| AI Anomaly Detection  | 23        | Any tree T4                 | 10,000  |
| Quantum Encryption    | 30        | GRC T4 + Network Defense T4 | 15,000  |

#### 3.3.2 Scenario Unlocks

New scenario types unlock as the player demonstrates competence in relevant domains:

| Scenario Type            | Unlock Condition                 | Description                           |
| ------------------------ | -------------------------------- | ------------------------------------- |
| Basic Phishing           | Start of game                    | Simple email-based social engineering |
| Spear Phishing           | Level 3 + 5 correct phishing IDs | Targeted, personalized attacks        |
| Supply Chain Attack      | Level 7 + Threat Intel T1        | Malware hidden in client backups      |
| Insider Threat           | Level 10 + IAM T2                | Compromised staff member              |
| Ransomware Campaign      | Level 12 + IR T2                 | Multi-stage ransomware deployment     |
| APT Campaign             | Level 15 + 3 trees at T2+        | Persistent, sophisticated adversary   |
| Nation-State Attack      | Level 20 + Threat Intel T3       | Maximum sophistication                |
| Zero-Day Exploit         | Level 23 + any T4 node           | Attacks using unknown vulnerabilities |
| Coordinated Multi-Vector | Level 25+                        | Combined simultaneous attack types    |
| The Archive Gate (Final) | Level 28 + all T3 nodes          | Endgame narrative scenario            |

#### 3.3.3 Capability Unlocks

Meta-capabilities that change how the game is played:

| Capability           | Unlock   | Effect                                       |
| -------------------- | -------- | -------------------------------------------- |
| Manual Mode          | Default  | Player handles all decisions                 |
| Assisted Mode        | Level 5  | Junior analyst provides recommendations      |
| Delegation           | Level 10 | Auto-resolve low-risk decisions              |
| Automation Scripting | Level 15 | Write rules for automated responses          |
| Full SOC Mode        | Level 20 | Command a team; focus on strategic decisions |
| Architect Mode       | Level 25 | Design security architecture; team executes  |
| Mentor Mode          | Level 28 | Assist other players (multiplayer)           |

---

### 3.4 Prestige / New Game+ Mechanics

#### 3.4.1 Prestige System: "The Reboot"

When a player reaches Level 30 (CISO rank) with a Trust Score of 300+, they unlock the ability to "Reboot" -- a narrative-justified New Game+ where the surviving network fragments have expanded and a new facility must be established.

**What carries over:**

- Skill Points (all retained)
- Certification completions (permanent)
- Cosmetic unlocks (permanent)
- 10% of accumulated Intel Fragments
- Knowledge (player skill, the real training value)

**What resets:**

- Credits (back to starting amount)
- Facility (back to Starter Room)
- Trust Score (back to 0, but with a "Veteran" modifier that accelerates early trust gain)
- Client roster (new set of clients)
- Tools and staff (must be re-acquired)

#### 3.4.2 Prestige Modifiers

Each Reboot allows the player to select one modifier that changes the game's difficulty and focus:

| Modifier            | Effect                                               | Design Intent                |
| ------------------- | ---------------------------------------------------- | ---------------------------- |
| Hardened Threats    | All attacks are one tier more sophisticated          | Tests advanced skills        |
| Budget Crisis       | Starting credits reduced by 50%                      | Tests resource management    |
| Fog of War          | Reduced visibility into client risk profiles         | Tests intuition and analysis |
| Compliance Mandate  | Must maintain specific compliance standards          | Tests GRC knowledge          |
| Zero Trust Required | No default trust; verify everything explicitly       | Tests IAM mastery            |
| Skeleton Crew       | Maximum 2 staff slots                                | Tests personal capability    |
| Glass Cannon        | Double income, triple breach damage                  | Tests risk assessment        |
| The Silent Threat   | No alerts from security tools; manual detection only | Tests fundamental skills     |
| Archipelago         | Multiple small facilities instead of one large one   | Tests distributed security   |
| Clock is Ticking    | Real-time pressure; no pause during incidents        | Tests stress response        |

#### 3.4.3 Prestige Rewards

| Prestige Level | Reward                                                   |
| -------------- | -------------------------------------------------------- |
| Reboot 1       | "Veteran" title, Reboot badge, +5 SP                     |
| Reboot 2       | "Battle-Hardened" title, unique facility skin            |
| Reboot 3       | "Grizzled" title, ability to create custom scenarios     |
| Reboot 5       | "Legend" title, animated profile frame                   |
| Reboot 10      | "Architect of the Archive" title, permanent legacy score |

---

### 3.5 Certification Tracks

In-game certifications are structured learning modules that map directly to real-world cybersecurity competency areas. Completing these certifications earns XP, SP, and Trust Score, and can be exported as verifiable credentials.

#### 3.5.1 Foundation Certifications

| In-Game Certification    | Real-World Mapping         | Modules | Completion Reward   |
| ------------------------ | -------------------------- | ------- | ------------------- |
| DMZ Network Fundamentals | CompTIA Network+ concepts  | 8       | 200 XP, 3 SP, 10 TS |
| DMZ Security Essentials  | CompTIA Security+ concepts | 10      | 300 XP, 4 SP, 15 TS |
| DMZ Linux Operations     | Linux+ / LFCS concepts     | 6       | 150 XP, 2 SP, 8 TS  |

#### 3.5.2 Intermediate Certifications

| In-Game Certification   | Real-World Mapping       | Modules | Completion Reward   |
| ----------------------- | ------------------------ | ------- | ------------------- |
| DMZ Cyber Analyst       | CySA+ concepts           | 12      | 500 XP, 5 SP, 20 TS |
| DMZ Penetration Testing | PenTest+ / OSCP concepts | 14      | 600 XP, 5 SP, 25 TS |
| DMZ Cloud Security      | CCSP / AZ-500 concepts   | 10      | 400 XP, 4 SP, 18 TS |
| DMZ Incident Handler    | GCIH concepts            | 12      | 500 XP, 5 SP, 22 TS |

#### 3.5.3 Advanced Certifications

| In-Game Certification       | Real-World Mapping             | Modules | Completion Reward    |
| --------------------------- | ------------------------------ | ------- | -------------------- |
| DMZ Security Architect      | CISSP concepts (all 8 domains) | 20      | 1000 XP, 8 SP, 40 TS |
| DMZ Threat Intelligence Pro | GCTI / CTIA concepts           | 15      | 750 XP, 6 SP, 30 TS  |
| DMZ Forensics Expert        | GCFE / EnCE concepts           | 16      | 800 XP, 7 SP, 35 TS  |
| DMZ Security Manager        | CISM concepts                  | 14      | 700 XP, 6 SP, 28 TS  |

#### 3.5.4 Certification Module Structure

Each certification module consists of:

1. **Briefing:** Narrative context for the skill being taught (in-world document)
2. **Training Scenario:** Guided gameplay segment teaching the concept
3. **Live Application:** Unguided scenario requiring the skill
4. **Assessment:** Evaluated challenge with pass/fail criteria
5. **Debrief:** Explanation of correct approach and real-world context

**Pass Criteria:** 70% score on assessment (matches real-world certification pass rates). Failed assessments can be retried after a 24-hour cooldown (encourages study rather than brute-force attempts).

#### 3.5.5 Credential Export

Completed certifications generate a verifiable digital badge (Open Badges 3.0 standard) that can be:

- Displayed on the player's in-game profile
- Exported to LinkedIn or other professional networks
- Verified by employers through the DMZ verification portal
- Used as evidence in real-world certification study plans

**Important Disclaimer:** In-game certifications are training tools and do not replace real-world certifications. They demonstrate familiarity with concepts and practical application in simulated environments.

---

## 4. Difficulty Scaling

### 4.1 Adaptive Difficulty System

The game uses a hidden performance tracking system to adjust difficulty dynamically. The goal is to keep the player in a flow state: challenged but not overwhelmed, learning but not bored.

#### 4.1.1 Performance Metrics Tracked

| Metric                      | Weight | Measurement                                         |
| --------------------------- | ------ | --------------------------------------------------- |
| Phishing Detection Accuracy | 25%    | Correct accepts + correct rejects / total decisions |
| Incident Response Time      | 20%    | Time from alert to containment                      |
| Breach Rate                 | 20%    | Breaches per 100 clients accepted                   |
| Resource Efficiency         | 15%    | Revenue per rack unit utilized                      |
| Investigation Thoroughness  | 10%    | % of available evidence examined before decisions   |
| Tool Utilization            | 10%    | % of owned tools actively configured and used       |

#### 4.1.2 Difficulty Adjustment Ranges

The system adjusts along five axes independently:

**Attack Sophistication (1-10 scale):**

- Level 1: Obvious phishing (spelling errors, mismatched domains)
- Level 5: Competent attacks (proper formatting, plausible pretexts)
- Level 8: Expert attacks (domain spoofing, context-aware content)
- Level 10: APT-grade (custom tooling, multi-stage, zero indicators)

**Attack Frequency (attacks per in-game day):**

- Minimum: 0.5 (one attack every 2 days)
- Baseline: 2-3 per day
- Maximum: 10+ per day (sustained campaign)

**Decision Ambiguity (1-10 scale):**

- Level 1: Clear-cut legitimate or clearly malicious
- Level 5: Requires careful analysis; some signals are mixed
- Level 8: Adversary has done significant reconnaissance; mimics real clients
- Level 10: Virtually indistinguishable from legitimate without deep analysis

**Economic Pressure (multiplier on costs):**

- Range: 0.8x to 1.5x
- Affects maintenance costs, supply costs, and random expense events
- Higher pressure forces more risk-taking on client acceptance

**Time Pressure (multiplier on response windows):**

- Range: 0.5x (generous) to 2.0x (urgent)
- Affects how long the player has to make decisions before consequences trigger

#### 4.1.3 Adjustment Algorithm

```
For each metric M:
  If player_performance(M) > target_performance(M) + threshold:
    Increase corresponding difficulty axis by 0.1-0.3
  If player_performance(M) < target_performance(M) - threshold:
    Decrease corresponding difficulty axis by 0.1-0.3
  Else:
    No change (player is in the learning zone)

Adjustments are:
  - Smoothed over a 7-day rolling window
  - Capped at +/- 0.5 change per day
  - Never decrease below the minimum for the player's level
  - Subject to floor/ceiling per difficulty tier
```

**Design Intent:** The player should never feel the system adjusting. Difficulty changes manifest as narrative events: "a new threat actor has emerged," "economic conditions have worsened," or "a client's request is unusually complex." The mechanical adjustment is invisible; the narrative framing is organic.

---

### 4.2 Threat Escalation

As the player's capability grows, so do the threats they face. This is both a gameplay mechanic and a cybersecurity truth.

#### 4.2.1 Threat Tiers

| Tier | Name                 | Level Range | Typical Adversary                 | Attack Characteristics                   |
| ---- | -------------------- | ----------- | --------------------------------- | ---------------------------------------- |
| 1    | Script Kiddies       | 1-5         | Opportunistic scanners            | Automated, noisy, predictable            |
| 2    | Hacktivists          | 5-10        | Ideologically motivated groups    | Targeted but unsophisticated             |
| 3    | Cybercriminals       | 10-15       | Profit-motivated organizations    | Ransomware, credential theft             |
| 4    | Organized Crime      | 15-20       | Sophisticated criminal syndicates | Multi-stage, resource-rich               |
| 5    | Nation-State Proxies | 20-25       | State-sponsored groups            | APT tactics, zero-days                   |
| 6    | Elite Adversaries    | 25-30       | The best in the world             | Supply chain, firmware, novel techniques |

#### 4.2.2 Escalation Triggers

Threat tier increases are triggered by player actions, not just level:

| Trigger                  | Effect                                             |
| ------------------------ | -------------------------------------------------- |
| Accept 10th client       | Tier 2 attacks begin                               |
| First facility expansion | Tier 2 attack frequency increases                  |
| Acquire SIEM or IDS      | Attackers begin evading those specific tools       |
| Reach Trust Score 150    | Tier 3 attacks begin (you are now a known target)  |
| Acquire SOAR             | Attackers use anti-automation techniques           |
| Reach Trust Score 300    | Tier 4 attacks begin (you are a high-value target) |
| Deploy deception network | Attackers probe for honeypots specifically         |
| Reach Level 25           | Tier 5 attacks begin                               |
| Deploy Zero Trust        | Tier 5 attackers attempt identity-based attacks    |
| Enter Prestige           | Tier 6 unlocked                                    |

**Design Principle:** Every defensive investment provokes an offensive adaptation. This is the fundamental dynamic of real-world cybersecurity and the most important lesson the game teaches.

---

### 4.3 Dynamic Challenge Generation

Challenges are procedurally generated from a template library with parameterized difficulty, ensuring replayability and preventing memorization.

#### 4.3.1 Challenge Template Components

Each challenge is assembled from:

1. **Threat Actor Profile** (who): Selected from a library of adversary archetypes with defined TTPs
2. **Attack Vector** (how): Chosen from vectors appropriate to the threat tier
3. **Target** (what): Selected from the player's current client portfolio or infrastructure
4. **Timing** (when): Coordinated with other events for narrative coherence
5. **Indicators** (clues): Procedurally scattered across logs, emails, and alerts
6. **Red Herrings** (noise): False signals scaled to difficulty level

#### 4.3.2 Generation Parameters

| Parameter                   | Range               | Scales With                                      |
| --------------------------- | ------------------- | ------------------------------------------------ |
| Indicator count             | 3-12                | Difficulty (more indicators at lower difficulty) |
| Red herring count           | 0-8                 | Difficulty (more noise at higher difficulty)     |
| Time-to-detection window    | 1 hour - 7 days     | Difficulty + tools available                     |
| Number of attack stages     | 1-7                 | Threat tier                                      |
| Lateral movement complexity | None - Full network | Facility size + segmentation                     |
| Data exfiltration volume    | 0 - 100% of target  | Attack duration before detection                 |

#### 4.3.3 Scenario Archetypes

The generator selects from and combines these base archetypes:

- **The Trojan Client:** A malicious applicant with convincing credentials
- **The Slow Burn:** A legitimate client whose systems are compromised after acceptance
- **The Inside Job:** A staff member is socially engineered or bribed
- **The Supply Chain Bomb:** Malware hidden in a client's backup data
- **The Distraction:** A loud, obvious attack covering a subtle one
- **The Cascade:** One small failure triggers a chain of larger failures
- **The Siege:** Sustained DDoS or attack campaign over multiple days
- **The Ghost:** An attacker already inside, detected only through anomalies
- **The Ultimatum:** An attacker with leverage demands compliance
- **The Fork:** Two simultaneous crises requiring prioritization

---

### 4.4 Difficulty Tiers for Different Audiences

The game serves multiple audience segments with different needs and skill levels.

#### 4.4.1 Tier: Civilian (Casual / General Public)

| Aspect              | Setting                                    |
| ------------------- | ------------------------------------------ |
| Target Audience     | General public, students, career explorers |
| Phishing Difficulty | 1-4 (obvious to moderate)                  |
| Economic Pressure   | Low (forgiving margins)                    |
| Attack Frequency    | Low (1-2 per day)                          |
| Time Pressure       | Relaxed (no real-time deadlines)           |
| Guidance Level      | Full (tutorials, hints, explanations)      |
| Failure Consequence | Light (smaller ransom, faster recovery)    |
| Certification Focus | Foundation level only                      |

#### 4.4.2 Tier: Recruit (Aspiring Professionals)

| Aspect              | Setting                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| Target Audience     | IT professionals transitioning to security, students in security programs |
| Phishing Difficulty | 3-7                                                                       |
| Economic Pressure   | Moderate                                                                  |
| Attack Frequency    | Moderate (2-4 per day)                                                    |
| Time Pressure       | Moderate (deadlines exist but are reasonable)                             |
| Guidance Level      | Partial (hints available but not automatic)                               |
| Failure Consequence | Standard (full ransom formula)                                            |
| Certification Focus | Foundation + Intermediate                                                 |

#### 4.4.3 Tier: Operator (Working Professionals)

| Aspect              | Setting                                                     |
| ------------------- | ----------------------------------------------------------- |
| Target Audience     | Active cybersecurity professionals, SOC analysts, engineers |
| Phishing Difficulty | 5-9                                                         |
| Economic Pressure   | High                                                        |
| Attack Frequency    | High (4-8 per day)                                          |
| Time Pressure       | Realistic (mirrors real incident timelines)                 |
| Guidance Level      | Minimal (tools and data only, no hints)                     |
| Failure Consequence | Severe (enhanced ransom, longer recovery)                   |
| Certification Focus | All levels                                                  |

#### 4.4.4 Tier: Elite (Red Team / Competition)

| Aspect              | Setting                                        |
| ------------------- | ---------------------------------------------- |
| Target Audience     | Senior professionals, CTF players, red teamers |
| Phishing Difficulty | 8-10                                           |
| Economic Pressure   | Extreme                                        |
| Attack Frequency    | Relentless (6-12+ per day)                     |
| Time Pressure       | Real-time (no pause, concurrent events)        |
| Guidance Level      | None (raw data only)                           |
| Failure Consequence | Brutal (one breach can end the run)            |
| Certification Focus | Advanced + Prestige challenges                 |

---

### 4.5 Boss Encounters: APT Campaign Scenarios

Boss encounters are hand-crafted, multi-stage attack scenarios that serve as capstone challenges for each progression phase. They are the game's most narratively rich and mechanically demanding content.

#### 4.5.1 Boss Roster

**Boss 1: "The Phisherman" (Level 5 Gate)**

- **Adversary:** A social engineering specialist
- **Campaign Duration:** 3 in-game days
- **Stages:** 5 increasingly sophisticated phishing attempts targeting the player's client intake process
- **Mechanic:** Each failed detection makes the next attempt more targeted (the attacker learns from success)
- **Victory Condition:** Identify and block all 5 attempts or contain the breach within 6 hours
- **Real-World Mapping:** Business Email Compromise (BEC) campaign

**Boss 2: "Rattlesnake" (Level 10 Gate)**

- **Adversary:** A ransomware-as-a-service operator
- **Campaign Duration:** 5 in-game days
- **Stages:** Initial access via compromised client, lateral movement, encryption deployment
- **Mechanic:** The attacker moves through the kill chain in real-time; the player must detect and contain at each stage
- **Victory Condition:** Prevent encryption or recover without paying ransom
- **Real-World Mapping:** Enterprise ransomware attack lifecycle

**Boss 3: "Phantom Supply" (Level 15 Gate)**

- **Adversary:** A supply chain compromise specialist
- **Campaign Duration:** 7 in-game days
- **Stages:** Compromised software update, persistent backdoor, data staging, exfiltration
- **Mechanic:** The initial compromise is in a trusted component; detection requires questioning trust assumptions
- **Victory Condition:** Identify the compromised supply chain element and remediate
- **Real-World Mapping:** SolarWinds-style supply chain attack

**Boss 4: "The Insider" (Level 20 Gate)**

- **Adversary:** A recruited insider (one of the player's staff)
- **Campaign Duration:** 10 in-game days
- **Stages:** Subtle data access anomalies, credential misuse, data staging, exfiltration attempt
- **Mechanic:** One of the player's hired analysts is compromised; player must identify who without tipping them off
- **Victory Condition:** Identify the insider and preserve evidence for the investigation
- **Real-World Mapping:** Insider threat detection and investigation

**Boss 5: "Operation Blackout" (Level 25 Gate)**

- **Adversary:** A nation-state proxy group
- **Campaign Duration:** 14 in-game days
- **Stages:** Reconnaissance, multiple simultaneous initial access attempts, establishment of persistence in multiple systems, coordinated attack on infrastructure (power, cooling, network), data destruction attempt
- **Mechanic:** The adversary has unlimited resources and adapts to the player's defenses in real-time
- **Victory Condition:** Maintain operational continuity and expel the adversary completely
- **Real-World Mapping:** Advanced Persistent Threat (APT) campaign with destructive intent

**Final Boss: "The Archive Gate" (Level 28+ Gate)**

- **Adversary:** The entity behind the original Stuxnet variant that crashed the internet
- **Campaign Duration:** 21 in-game days
- **Stages:** The attacker attempts to breach the Archive Gate -- the last secure gateway to the preserved internet archives. All previous attack types combined. The attacker also weaponizes trust, turning allied facilities against the player.
- **Mechanic:** Everything the player has learned is tested simultaneously. The economic, technical, and social dimensions of security all matter.
- **Victory Condition:** Protect the Archive Gate, preserve the data, and trace the attacker to their origin
- **Real-World Mapping:** Comprehensive security leadership under sustained, existential threat

#### 4.5.2 Boss Encounter Rewards

| Boss               | CR Reward | XP Reward | SP Reward | Special Reward                       |
| ------------------ | --------- | --------- | --------- | ------------------------------------ |
| The Phisherman     | 1,000     | 300       | 3         | "Phish Slayer" title                 |
| Rattlesnake        | 3,000     | 500       | 4         | Unique IDS signature set             |
| Phantom Supply     | 5,000     | 750       | 5         | Supply Chain Scanner tool            |
| The Insider        | 8,000     | 1,000     | 5         | Behavioral Analytics upgrade         |
| Operation Blackout | 15,000    | 1,500     | 6         | Nation-State Intelligence Feed       |
| The Archive Gate   | 25,000    | 3,000     | 8         | Prestige unlock + "Gatekeeper" title |

---

## 5. Monetization Strategy

### 5.1 Dual-Model Overview

The DMZ: Archive Gate operates on a dual monetization model to serve both enterprise training buyers and individual consumers. The core principle: **the game must be excellent as a game first, and a training platform second.** Forced training wrapped in a game skin fails at both purposes.

```
Revenue Streams:

B2B (Enterprise)                    B2C (Consumer)
+---------------------------+       +---------------------------+
| Per-Seat Licensing        |       | Free-to-Play Base Game    |
| Tiered Plans              |       | Premium Content/Seasons   |
| Custom Content            |       | Cosmetic Purchases        |
| White-Label               |       | Battle Pass               |
| API Access                |       | Family Plans              |
| Reporting & Analytics     |       |                           |
+---------------------------+       +---------------------------+
         \                                   /
          +--- Shared Core Game Engine -----+
```

---

### 5.2 B2B Enterprise Model

#### 5.2.1 Tiered Plans

**Starter Plan -- $15/seat/month (minimum 10 seats)**

| Feature               | Included                             |
| --------------------- | ------------------------------------ |
| Full base game access | Yes                                  |
| Difficulty tiers      | Civilian + Recruit                   |
| Certifications        | Foundation only                      |
| Analytics dashboard   | Basic (completion rates, time spent) |
| Content updates       | Quarterly                            |
| Support               | Email (48-hour response)             |
| Custom scenarios      | No                                   |
| SSO integration       | No                                   |
| API access            | No                                   |
| White-labeling        | No                                   |

**Pro Plan -- $35/seat/month (minimum 25 seats)**

| Feature               | Included                                                |
| --------------------- | ------------------------------------------------------- |
| Full base game access | Yes                                                     |
| Difficulty tiers      | All four tiers                                          |
| Certifications        | Foundation + Intermediate                               |
| Analytics dashboard   | Advanced (skill gaps, trend analysis, team comparisons) |
| Content updates       | Monthly                                                 |
| Support               | Priority email (24-hour response) + chat                |
| Custom scenarios      | Up to 5 per quarter                                     |
| SSO integration       | SAML 2.0 / OIDC                                         |
| API access            | Read-only (reporting)                                   |
| White-labeling        | No                                                      |
| Team features         | Leaderboards, team challenges, manager dashboards       |

**Enterprise Plan -- Custom pricing (minimum 100 seats)**

| Feature               | Included                                                                  |
| --------------------- | ------------------------------------------------------------------------- |
| Full base game access | Yes                                                                       |
| Difficulty tiers      | All four + custom tiers                                                   |
| Certifications        | All levels + custom certification tracks                                  |
| Analytics dashboard   | Full (individual skill matrices, compliance reporting, SCORM/xAPI export) |
| Content updates       | Continuous + early access                                                 |
| Support               | Dedicated account manager, 4-hour SLA                                     |
| Custom scenarios      | Unlimited                                                                 |
| SSO integration       | Full (SAML, OIDC, AD, LDAP)                                               |
| API access            | Full read/write (LMS integration, custom reporting)                       |
| White-labeling        | Full (branding, custom narrative, co-branded certs)                       |
| Deployment            | Cloud, on-premises, or hybrid                                             |
| Team features         | Department hierarchies, role-based access, custom challenge campaigns     |
| Compliance mapping    | Maps to NIST CSF, ISO 27001, SOC 2 control requirements                   |

#### 5.2.2 Add-On Services

| Service                             | Price            | Description                                                                      |
| ----------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| Custom Scenario Pack (10 scenarios) | $5,000 one-time  | Scenarios tailored to client's industry and threat landscape                     |
| Industry Vertical Module            | $10,000 one-time | Full module covering sector-specific threats (healthcare, finance, energy, etc.) |
| Live Tabletop Integration           | $3,000/session   | Facilitator-led session using the game as a tabletop exercise platform           |
| Annual Threat Update Pack           | $8,000/year      | New scenarios based on that year's real-world threat landscape                   |
| Custom Certification Track          | $15,000 one-time | Organization-specific certification mapped to internal competency framework      |
| Dedicated Instance                  | $2,000/month     | Isolated deployment with custom SLAs                                             |
| Onboarding & Training               | $5,000 one-time  | Implementation support, admin training, rollout planning                         |

#### 5.2.3 Enterprise Value Propositions

For procurement justification, the product maps to specific budget categories:

- **Security Awareness Training:** Replaces or supplements existing SAT programs
- **Technical Skills Development:** Maps to professional development budgets
- **Compliance Training:** Satisfies training requirements for various frameworks
- **Incident Response Exercises:** Replaces or supplements tabletop exercises
- **New Hire Onboarding:** Gamified introduction to organization's security culture
- **Metrics & Reporting:** Provides quantifiable skill assessment data for auditors

---

### 5.3 B2C Consumer Model

#### 5.3.1 Free-to-Play Base Game

The free tier must be generous enough to deliver genuine value and create word-of-mouth growth:

**Included Free:**

- Full game loop (client intake, resource management, security decisions)
- Levels 1-15 progression
- Civilian and Recruit difficulty tiers
- 2 skill trees (player's choice)
- Foundation certification track (1 of 3)
- Daily challenges (1 per day)
- Basic facility customization
- Boss encounters 1-3
- Core narrative through mid-game

**Not Included Free:**

- Levels 16-30 and Prestige
- Operator and Elite difficulty tiers
- Remaining 3 skill trees (unlockable individually or as bundle)
- Intermediate and Advanced certifications
- Weekly challenges
- Advanced facility customization
- Boss encounters 4-6
- Full narrative through endgame
- Seasonal content
- Battle Pass

**Design Principle:** A free player should be able to play for 40-60 hours before hitting any paywall. By that point, they have received genuine cybersecurity training and are invested enough to consider paying for more.

#### 5.3.2 Premium Content: Seasonal Model

Content is released in seasonal arcs (approximately 12 weeks each):

| Season Component                | Price  | Contents                                                                                                   |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Season Pass                     | $9.99  | Full season story arc, 1 new boss encounter, 10 new scenarios, 1 new skill tree branch, seasonal cosmetics |
| Individual Season Scenario Pack | $4.99  | 10 new scenarios only                                                                                      |
| Annual Pass (4 seasons)         | $29.99 | All seasonal content for one year (25% discount)                                                           |

**Season Theme Examples:**

- Season 1: "The Rising Tide" -- Maritime infrastructure threats
- Season 2: "Ghost in the Grid" -- Smart grid and SCADA/ICS attacks
- Season 3: "Paper Trail" -- Financial sector threats and fraud
- Season 4: "Vital Signs" -- Healthcare and medical device security
- Season 5: "Orbital Decay" -- Space and satellite system security
- Season 6: "The Human Factor" -- Advanced social engineering and insider threats

#### 5.3.3 Cosmetic Purchases

All cosmetic purchases are purely visual and have zero gameplay impact. This is a non-negotiable design principle.

**Cosmetic Categories:**

| Category          | Price Range   | Examples                                                          |
| ----------------- | ------------- | ----------------------------------------------------------------- |
| Facility Skins    | $1.99 - $4.99 | Arctic Bunker, Undersea Lab, Orbital Station, Jungle Outpost      |
| Terminal Themes   | $0.99 - $2.99 | Retro Green, Neon Cyberpunk, Minimalist White, Amber CRT          |
| Rack Aesthetics   | $0.99 - $1.99 | LED accents, cable management styles, custom rack labels          |
| Profile Frames    | $0.99 - $2.99 | Animated borders, achievement frames, seasonal frames             |
| Alert Sound Packs | $0.99 - $1.99 | Sci-fi alerts, retro chiptune, dramatic orchestral, subtle clicks |
| Staff Uniforms    | $0.99 - $1.99 | Cyberpunk, Military, Corporate, Hacker Chic                       |
| Cursor / UI Packs | $0.99 - $1.99 | Custom cursor styles and UI element skins                         |
| Emote Packs       | $1.99         | Reactions for multiplayer and community features                  |

**Bundle Offers:**

- Starter Cosmetic Bundle: $4.99 (1 facility skin + 1 terminal theme + 1 profile frame)
- Season Cosmetic Bundle: $7.99 (all cosmetics for a season)
- Ultimate Cosmetic Bundle: $14.99 (all available cosmetics at time of purchase)

#### 5.3.4 Battle Pass: "The Operations Log"

A seasonal progression track that rewards consistent play:

**Free Track (available to all players):**

- 30 tiers
- Rewards: Credits, Intel Fragments, XP boosters, 3 cosmetic items

**Premium Track ($4.99 per season):**

- 30 additional tiers (60 total)
- Rewards: Exclusive cosmetics, bonus Credits/IF, exclusive scenario, exclusive certification module, premium facility skin, animated profile elements

**Earning Battle Pass XP:**

- Daily challenge completion: 100 BP XP
- Weekly challenge completion: 500 BP XP
- Correct security decisions: 10-50 BP XP each
- Boss encounter completion: 1000 BP XP
- Certification module completion: 750 BP XP

**Design:** A player who plays 3-4 sessions per week should complete the premium track by season end without requiring additional purchases. There is no way to buy Battle Pass tiers with real money.

#### 5.3.5 Family Plan

| Plan                           | Price        | Details                                                                                                                             |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Family Plan (up to 5 accounts) | $14.99/month | Full premium access for all accounts, shared progress dashboard for parents, age-appropriate difficulty settings, parental controls |

**Design Intent:** Cybersecurity awareness is a family concern. Parents in the industry can use this to teach their children (and partners) while playing themselves. The shared dashboard lets parents monitor progress and discuss scenarios together.

---

### 5.4 Ethical Monetization Principles

These are binding design constraints, not aspirational guidelines:

#### 5.4.1 Absolute Prohibitions

| Practice                          | Status     | Rationale                                                        |
| --------------------------------- | ---------- | ---------------------------------------------------------------- |
| Loot boxes                        | PROHIBITED | Gambling mechanics have no place in an educational product       |
| Randomized purchase outcomes      | PROHIBITED | Players must know exactly what they are buying                   |
| Pay-to-win mechanics              | PROHIBITED | Purchasing gameplay advantages undermines the training mission   |
| Artificial energy/lives systems   | PROHIBITED | Gating play time behind payment is hostile design                |
| FOMO-driven limited purchases     | PROHIBITED | Seasonal cosmetics rotate back; nothing is permanently exclusive |
| Hidden costs                      | PROHIBITED | All prices visible before purchase                               |
| Manipulative UI (dark patterns)   | PROHIBITED | No "are you sure you don't want this deal?" popups               |
| Data selling                      | PROHIBITED | Player data is never sold to third parties                       |
| Mandatory ads                     | PROHIBITED | No advertising in the game, ever                                 |
| Auto-renewal without clear notice | PROHIBITED | Subscriptions require explicit renewal or clear advance notice   |

#### 5.4.2 Transparency Commitments

- All in-game purchases display the exact price in local currency before confirmation
- The game clearly labels free and premium content
- Refund policy: Full refund within 14 days of any purchase, no questions asked
- Pricing page is publicly available with no hidden tiers
- Revenue reports published annually (aggregate, for transparency)

#### 5.4.3 Accessibility Pricing

- Regional pricing adjusted for purchasing power parity
- Educational institution discount: 50% off all plans
- Non-profit discount: 40% off all plans
- Individual hardship: Application-based free premium access
- Student discount: 30% off with valid .edu email

---

## 6. Retention Mechanics

### 6.1 Daily and Weekly Challenge Systems

#### 6.1.1 Daily Challenges

One new challenge every 24 hours, designed to take 10-20 minutes:

| Challenge Type        | Frequency | Reward                    | Example                                          |
| --------------------- | --------- | ------------------------- | ------------------------------------------------ |
| Phishing Gauntlet     | 2x/week   | 50 CR + 25 XP + 100 BP XP | Identify 5 emails as legitimate or phishing      |
| Rapid Response        | 2x/week   | 75 CR + 30 XP + 100 BP XP | Contain a simulated incident in under 10 minutes |
| Risk Assessment       | 1x/week   | 60 CR + 25 XP + 100 BP XP | Evaluate 3 client applications and rank by risk  |
| Forensic Fragment     | 1x/week   | 40 CR + 3 IF + 100 BP XP  | Analyze a log snippet and identify the threat    |
| Infrastructure Puzzle | 1x/week   | 50 CR + 20 XP + 100 BP XP | Optimize a facility layout under constraints     |

**Streak Bonuses:**

- 3-day streak: +25% daily challenge rewards
- 7-day streak: +50% daily challenge rewards + 1 SP
- 14-day streak: +75% daily challenge rewards
- 30-day streak: +100% daily challenge rewards + 3 SP + exclusive cosmetic

**Missed Day Policy:** A missed day resets the streak counter but does not punish the player. The streak system is designed to reward consistency, not punish absence. Players retain all previously earned streak bonuses.

#### 6.1.2 Weekly Challenges

Three challenges released every Monday, designed to take 30-60 minutes each:

| Challenge Type              | Reward                      | Example                                                                      |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------- |
| Campaign Investigation      | 200 CR + 75 XP + 500 BP XP  | Track a multi-stage attack across 5 days of logs                             |
| Economic Optimization       | 150 CR + 50 XP + 500 BP XP  | Maximize revenue while maintaining security posture under budget constraints |
| Scenario Replay (Hard Mode) | 100 CR + 100 XP + 500 BP XP | Replay a previous boss encounter with new constraints                        |

**Weekly Completion Bonus:** Completing all 3 weekly challenges awards a bonus 500 CR + 5 IF + 200 XP.

---

### 6.2 Seasonal Content Drops

#### 6.2.1 Season Structure (12-Week Cycle)

| Week | Content Drop        | Notes                                                              |
| ---- | ------------------- | ------------------------------------------------------------------ |
| 1    | Season Launch       | New story arc begins, new boss revealed, new scenarios available   |
| 2-3  | Act 1               | 3 new story scenarios, Battle Pass begins                          |
| 4    | Mid-Act Event       | Limited-time cooperative challenge                                 |
| 5-6  | Act 2               | 3 new story scenarios, difficulty escalation                       |
| 7    | Community Challenge | Server-wide goal (e.g., "collectively block 1M phishing attempts") |
| 8-9  | Act 3               | 3 new story scenarios, approaching climax                          |
| 10   | Boss Week           | Season boss encounter unlocks                                      |
| 11   | Resolution          | Story conclusion, epilogue scenarios                               |
| 12   | Interlude           | Between-season event, tease next season, catch-up period           |

#### 6.2.2 Between-Season Events

During the 1-2 week interlude between seasons:

- Double XP for daily challenges
- Rotating featured scenarios from past seasons
- Community voting on next season's theme
- Retrospective: "State of the DMZ" report showing aggregate player statistics

---

### 6.3 Event-Driven Content (Real-World Threat Tie-Ins)

This is one of the game's strongest differentiators: the ability to create scenarios inspired by real-world cybersecurity events within days of their occurrence.

#### 6.3.1 Rapid Response Content Pipeline

| Timeline    | Content Type                                        | Approval Required              |
| ----------- | --------------------------------------------------- | ------------------------------ |
| 24-48 hours | Daily challenge themed around the event             | Content lead sign-off          |
| 1 week      | Scenario based on the attack technique (abstracted) | Security review + content lead |
| 2-4 weeks   | Full scenario pack with investigation components    | Full QA cycle                  |
| 1-2 months  | Certification module update if new competency area  | Curriculum review board        |

**Content Guidelines for Real-World Events:**

- Never name specific victim organizations
- Focus on techniques, tactics, and procedures, not attribution
- Abstract the scenario enough to avoid legal or diplomatic issues
- Always include educational context explaining the real-world relevance
- Clearly label as "inspired by real events" without specific citations

#### 6.3.2 Example Event-Driven Content

| Real-World Event Type             | In-Game Content Response                                         |
| --------------------------------- | ---------------------------------------------------------------- |
| Major ransomware campaign         | New ransomware scenario using similar TTP chain                  |
| Zero-day disclosure               | Scenario where player must patch/mitigate before exploitation    |
| Supply chain compromise           | Investigation scenario tracing compromise through trusted vendor |
| Critical CVE announcement         | Time-limited "patch race" challenge                              |
| Nation-state campaign attribution | Intelligence briefing + new threat actor profile                 |
| Major data breach disclosure      | Forensic analysis scenario based on similar indicators           |

---

### 6.4 Long-Term Goals and Collection Systems

#### 6.4.1 The Archive Collection

Players collect and curate a personal archive of cybersecurity knowledge, represented as in-game artifacts:

**Threat Actor Dossiers:**

- Collected by encountering and surviving attacks from each adversary archetype
- Total: 50+ unique threat actors across all tiers
- Completion rewards: Unique title, advanced threat intelligence bonuses

**Attack Technique Catalog:**

- Each unique attack technique encountered is cataloged (mapped to MITRE ATT&CK)
- Total: 200+ techniques
- Completion milestones at 25%, 50%, 75%, 100% with escalating rewards
- At 100%: "Walking Encyclopedia" title and permanent +10% XP bonus

**Tool Mastery Badges:**

- Each security tool has mastery criteria (uses, successful detections, configurations)
- Bronze (basic use), Silver (competent use), Gold (expert use), Platinum (mastery)
- Completing all Gold badges: "Master of Tools" title
- Completing all Platinum badges: "Virtuoso" title (extremely rare)

**Incident Report Library:**

- Every incident the player handles generates a report
- Reports are graded (A through F) based on response quality
- Collecting 50 A-grade reports: "Flawless Responder" achievement
- The library serves as a personal study resource

#### 6.4.2 Facility Museum

A wing of the player's facility that displays:

- Trophies from boss encounters
- Artifacts from notable incidents
- Historical records of the player's greatest decisions
- A timeline of the facility's growth
- Visitor mode: other players can tour your museum (multiplayer feature)

#### 6.4.3 Legacy Score

A permanent, never-resetting score that represents the player's total contribution across all playthroughs and Prestige cycles:

| Component                     | Contribution to Legacy Score |
| ----------------------------- | ---------------------------- |
| Total XP earned (all time)    | 1 point per 100 XP           |
| Total clients safely served   | 1 point per client           |
| Total attacks survived        | 2 points per attack          |
| Certifications completed      | 50 points per cert           |
| Boss encounters completed     | 100 points per boss          |
| Prestige completions          | 500 points per reboot        |
| Daily challenge streak (best) | 1 point per streak day       |
| Community contributions       | Variable                     |

**Legacy Tiers:**

| Tier            | Score   | Title              | Reward                                            |
| --------------- | ------- | ------------------ | ------------------------------------------------- |
| Bronze Legacy   | 1,000   | Archivist Initiate | Bronze legacy badge                               |
| Silver Legacy   | 5,000   | Archivist Adept    | Silver legacy badge + unique terminal theme       |
| Gold Legacy     | 15,000  | Archivist Master   | Gold legacy badge + unique facility skin          |
| Platinum Legacy | 50,000  | Archivist Legend   | Platinum legacy badge + permanent profile effects |
| Diamond Legacy  | 100,000 | Keeper of the Gate | Diamond legacy badge + name in credits            |

#### 6.4.4 Mentor System (Long-Term Social Retention)

Players at Level 25+ can become Mentors:

- Paired with newer players who opt into the program
- Earn Mentor XP by answering questions and reviewing mentee decisions
- Mentor leaderboard (separate from gameplay leaderboard)
- Exclusive Mentor cosmetics
- Top mentors earn "Community Guardian" designation

---

## 7. Appendices

### Appendix A: Economic Balance Parameters (Tuning Reference)

These are the initial tuning parameters. All values are subject to change based on playtesting and live data.

| Parameter                       | Initial Value           | Adjustment Range | Review Cadence |
| ------------------------------- | ----------------------- | ---------------- | -------------- |
| Base daily income (per client)  | 15 CR                   | 10-25 CR         | Monthly        |
| Base daily OpEx (per rack)      | 8 CR                    | 5-15 CR          | Monthly        |
| Ransom divisor                  | 10                      | 8-15             | Quarterly      |
| Trust Score gain rate           | +3 avg/correct decision | +1 to +5         | Monthly        |
| Trust Score loss rate           | -15 avg/breach          | -5 to -30        | Monthly        |
| XP curve exponent               | 1.4                     | 1.2-1.8          | Quarterly      |
| Difficulty adjustment rate      | 0.2/day max             | 0.1-0.5          | Monthly        |
| Contract value variance         | +/- 20%                 | +/- 10-30%       | Monthly        |
| Breach probability base         | 5% per accepted client  | 2-10%            | Quarterly      |
| Security tool effectiveness cap | 80% total reduction     | 70-90%           | Quarterly      |

### Appendix B: Revenue Projection Model (Illustrative)

| Year | B2B Seats | B2B ARPU | B2B Revenue | B2C MAU | B2C Conversion | B2C ARPPU | B2C Revenue | Total  |
| ---- | --------- | -------- | ----------- | ------- | -------------- | --------- | ----------- | ------ |
| 1    | 500       | $20/mo   | $120K       | 50K     | 5%             | $5/mo     | $150K       | $270K  |
| 2    | 2,000     | $25/mo   | $600K       | 200K    | 6%             | $6/mo     | $864K       | $1.46M |
| 3    | 5,000     | $30/mo   | $1.8M       | 500K    | 7%             | $7/mo     | $2.94M      | $4.74M |

_These figures are illustrative targets, not guarantees. Actual performance depends on product quality, market conditions, and execution._

### Appendix C: Key Performance Indicators (KPIs)

**Engagement KPIs:**

- Daily Active Users (DAU) / Monthly Active Users (MAU) ratio (target: 25%+)
- Average session length (target: 25-40 minutes)
- 7-day retention (target: 40%+)
- 30-day retention (target: 25%+)
- Daily challenge completion rate (target: 60%+ of DAU)

**Learning KPIs:**

- Phishing detection accuracy improvement (target: +30% over 30 days)
- Time-to-detection improvement (target: -25% over 30 days)
- Certification completion rate (target: 40%+ of starters)
- Skill tree depth (target: average 2 trees at T3+ by Level 20)

**Revenue KPIs:**

- Customer Acquisition Cost (CAC) for B2B and B2C
- Lifetime Value (LTV) for each segment
- LTV:CAC ratio (target: 3:1+)
- Monthly Recurring Revenue (MRR) growth rate
- Churn rate (target: <5% monthly for B2C, <3% annual for B2B)
- Conversion rate free-to-paid (target: 5-8% of MAU)

**Health KPIs:**

- Player frustration signals (rage quits, negative feedback, rapid difficulty drops)
- Economic inflation/deflation rate (credit accumulation velocity)
- Content consumption rate (are players outpacing content production?)
- Monetization pressure score (ensuring the free experience remains generous)

### Appendix D: Glossary

| Term  | Definition                                       |
| ----- | ------------------------------------------------ |
| CR    | Credits, the primary in-game currency            |
| TS    | Trust Score, the reputation metric               |
| IF    | Intel Fragments, the intelligence currency       |
| SP    | Skill Points, used for skill tree progression    |
| XP    | Experience Points, used for level progression    |
| BP XP | Battle Pass Experience Points                    |
| APT   | Advanced Persistent Threat                       |
| TTP   | Tactics, Techniques, and Procedures              |
| IoC   | Indicator of Compromise                          |
| SOAR  | Security Orchestration, Automation, and Response |
| SIEM  | Security Information and Event Management        |
| IDS   | Intrusion Detection System                       |
| IPS   | Intrusion Prevention System                      |
| WAF   | Web Application Firewall                         |
| BEC   | Business Email Compromise                        |
| ARPU  | Average Revenue Per User                         |
| ARPPU | Average Revenue Per Paying User                  |
| MAU   | Monthly Active Users                             |
| DAU   | Daily Active Users                               |
| LTV   | Lifetime Value                                   |
| CAC   | Customer Acquisition Cost                        |
| MRR   | Monthly Recurring Revenue                        |

---

_This document is a living specification. All values, prices, and parameters are subject to revision based on playtesting data, market research, and player feedback. The design principles -- educational integrity, ethical monetization, and gameplay-first design -- are not subject to revision._

**End of Document**
