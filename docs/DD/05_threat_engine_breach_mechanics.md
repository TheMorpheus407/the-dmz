# 05 -- Threat Engine & Breach Mechanics Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-05
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Game Design
**Author:** Game Design & Cybersecurity Division, Matrices GmbH

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Threat Level System](#2-threat-level-system)
3. [Adaptive Threat Engine](#3-adaptive-threat-engine)
4. [Attack Type Catalog](#4-attack-type-catalog)
5. [Breach Simulation System](#5-breach-simulation-system)
6. [Incident Response System](#6-incident-response-system)
7. [Multi-Day Attack Campaigns](#7-multi-day-attack-campaigns)
8. [Security Tool Effectiveness Model](#8-security-tool-effectiveness-model)
9. [Faction Threat Profiles](#9-faction-threat-profiles)
10. [Appendix A: TypeScript Interfaces](#appendix-a-typescript-interfaces)
11. [Appendix B: Probability Tables](#appendix-b-probability-tables)
12. [Appendix C: MITRE ATT&CK Coverage Matrix](#appendix-c-mitre-attck-coverage-matrix)
13. [Appendix D: References](#appendix-d-references)

---

## 1. Executive Summary

The Threat Engine is the adversary simulation system of The DMZ: Archive Gate -- the "opponent AI" that generates, selects, sequences, and escalates cyber attacks against the player's data center. It is the invisible game master that ensures every session feels dangerous, fair, and educational.

This document specifies the complete design of the Threat Engine and its companion systems: the five-tier Threat Level framework, the Adaptive Threat Engine (inspired by Left 4 Dead's AI Director and Alien: Isolation's dual-layer xenomorph AI), a comprehensive attack catalog mapped to MITRE ATT&CK techniques, the Breach Simulation System (what happens when defenses fail), the Incident Response System (the player's defensive toolkit), Multi-Day Attack Campaigns, the Security Tool Effectiveness Model, and Faction Threat Profiles.

### Design Philosophy

The Threat Engine operates under three governing principles:

1. **Narrative Justification:** Every difficulty change is a story event. The engine never silently adjusts numbers. If attacks become harder, an Intelligence Brief explains why. If there is a lull, Morpheus comments on the quiet. The player experiences an evolving adversary, not a rubber-banding algorithm.

2. **Pedagogical Fidelity:** Every attack the engine generates maps to a real-world threat technique. The engine does not invent fictional attack types. When a player defeats a spear-phishing campaign in-game, they have practiced detecting spear phishing as defined by MITRE ATT&CK T1566.001. The game is a cybersecurity simulator wearing a narrative costume.

3. **Psychopathic Serendipity:** Borrowed from Alien: Isolation's design vocabulary -- the Threat Engine should feel like an intelligent adversary that always finds the player's weakness, even though it operates on deterministic rules. The player should feel hunted, not managed.

### Architectural Position

The Threat Engine is a backend module (`threat-engine`) in the modular monolith, consuming player state from the `game-engine` module and producing attack events that feed back into the game loop. It is a candidate for early service extraction when simulation complexity demands dedicated compute (per BRD Section 7.2).

**Content Pipeline Dependency:** The Threat Engine selects attack vectors and difficulty parameters, then requests content from the `ai-pipeline` and `content` modules. Per BRD FR-GAME-004, a pre-generated email pool of 200+ emails is maintained across difficulty tiers (1-5) with batch generation during off-peak hours. Per BRD Section 8.6, the pool maintains 20-50 emails per difficulty tier. The Threat Engine draws from this pool for immediate delivery, eliminating player-perceived latency. When the pool runs low for a specific difficulty tier or attack category, the engine signals the AI pipeline to generate replenishments.

```
┌─────────────────────────────────────────────────────────┐
│                    GAME ENGINE                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Player   │  │ Facility │  │ Content  │              │
│  │  State    │  │  State   │  │ Pipeline │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       ▼              ▼              ▼                    │
│  ┌──────────────────────────────────────────┐           │
│  │          THREAT ENGINE                    │           │
│  │  ┌────────┐ ┌──────────┐ ┌────────────┐ │           │
│  │  │ Player │ │ Attack   │ │ Campaign   │ │           │
│  │  │Profile │ │Selector  │ │ Manager    │ │           │
│  │  └───┬────┘ └────┬─────┘ └─────┬──────┘ │           │
│  │      │           │              │         │           │
│  │      ▼           ▼              ▼         │           │
│  │  ┌──────────────────────────────────────┐│           │
│  │  │        THREAT LEVEL CONTROLLER       ││           │
│  │  └──────────────────────────────────────┘│           │
│  │      │                                    │           │
│  │      ▼                                    │           │
│  │  ┌──────────────────────────────────────┐│           │
│  │  │     BREACH SIMULATION SYSTEM         ││           │
│  │  └──────────────────────────────────────┘│           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Threat Level System

The Threat Level System is the macro-state controller for the game's tension curve. It operates on a five-tier model inspired by the US Department of Homeland Security's Homeland Security Advisory System (HSAS) and adapted for game pacing. Each tier defines the frequency, sophistication, and variety of attacks the player faces.

### 2.1 Tier Definitions

#### 2.1.1 Tier 1: LOW (Green)

**Narrative Context:** The network is quiet. Threat actors are regrouping, probing, or focused elsewhere. This is the calm before or after a storm.

**Attack Parameters:**

| Parameter                                    | Value                              |
| -------------------------------------------- | ---------------------------------- |
| Attack frequency                             | 0-1 attacks per game day           |
| Phishing ratio (malicious:legitimate emails) | 20:80                              |
| Sophistication ceiling                       | Difficulty 1-2 (obvious red flags) |
| Attack vectors active                        | Email phishing only                |
| Concurrent incidents                         | 0                                  |
| Campaign activity                            | None (reconnaissance only)         |

**Email Characteristics:**

- Obvious grammatical errors and spelling mistakes
- Mismatched sender names and domains (e.g., "Berlin University" from `freemailer99@gmail.com`)
- Unrealistic urgency or too-good-to-be-true offers
- No attempt to match organizational formatting
- Generic greetings ("Dear Sir/Madam")
- Easily verifiable false claims

**Trigger Conditions (Entry):**

- Game start (Days 1-3)
- Post-breach recovery period (forced 2-3 day cooldown)
- After completing a major campaign defense (breathing room)
- Seasonal narrative transition points

**Visual Indicators:**

| Element           | Specification                  |
| ----------------- | ------------------------------ |
| Threat bar color  | `#33ff33` (phosphor green)     |
| Threat bar fill   | 0-20%                          |
| Terminal border   | Standard green glow            |
| Ambient sound     | Low hum, occasional data chirp |
| Facility lighting | Normal operating levels        |
| Morpheus status   | "Systems nominal."             |

---

#### 2.1.2 Tier 2: GUARDED (Blue)

**Narrative Context:** Intelligence suggests increased adversary interest. Probing has been detected. The data center's growing reputation has attracted attention.

**Attack Parameters:**

| Parameter              | Value                                       |
| ---------------------- | ------------------------------------------- |
| Attack frequency       | 1-2 attacks per game day                    |
| Phishing ratio         | 30:70                                       |
| Sophistication ceiling | Difficulty 2-3                              |
| Attack vectors active  | Email phishing, credential harvesting       |
| Concurrent incidents   | 0-1                                         |
| Campaign activity      | Reconnaissance phase of campaigns may begin |

**New Attack Vectors Introduced:**

- Spear phishing with personalized details referencing in-game events
- Credential harvesting pages (player must inspect URLs in emails)
- Pretexting attacks with plausible but unverifiable backstories
- Emotionally manipulative narratives (sympathy-based pretexts)

**Trigger Conditions (Escalation from LOW):**

- Player reaches Day 4 or accepts 5+ clients (whichever comes first)
- Player achieves Facility Tier 2 (Station)
- Two consecutive game days with 100% detection rate (engine responds to competence)
- Narrative trigger: Intelligence Brief reports increased scanning activity

**Visual Indicators:**

| Element           | Specification                                 |
| ----------------- | --------------------------------------------- |
| Threat bar color  | `#3399ff` (blue)                              |
| Threat bar fill   | 20-40%                                        |
| Terminal border   | Subtle blue pulse every 30s                   |
| Ambient sound     | Slightly elevated hum, intermittent scan beep |
| Facility lighting | Normal with occasional flicker                |
| Morpheus status   | "Stay alert. We're being watched."            |

---

#### 2.1.3 Tier 3: ELEVATED (Yellow)

**Narrative Context:** Active threat campaigns targeting the data center. Multiple adversary groups are engaged. The player is now a known target.

**Attack Parameters:**

| Parameter              | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| Attack frequency       | 2-4 attacks per game day                                 |
| Phishing ratio         | 40:60                                                    |
| Sophistication ceiling | Difficulty 3-4                                           |
| Attack vectors active  | All phishing variants, supply chain probing, brute force |
| Concurrent incidents   | 1-2                                                      |
| Campaign activity      | Active campaigns (1 running)                             |

**New Attack Vectors Introduced:**

- Supply chain attacks (malware hidden in client backup data)
- Multi-step social engineering (trust-building emails preceding attack)
- Look-alike domain spoofing (near-identical domains)
- Insider threat indicators (existing clients behaving anomalously)
- Brute force attempts against authentication (background event)

**Trigger Conditions (Escalation from GUARDED):**

- Player reaches Day 10 or accepts 15+ clients
- Player achieves Facility Tier 3 (Vault)
- Active campaign enters delivery phase
- Narrative trigger: Intelligence Brief identifies specific threat actors targeting the facility

**Visual Indicators:**

| Element           | Specification                                    |
| ----------------- | ------------------------------------------------ |
| Threat bar color  | `#ffcc00` (amber/yellow)                         |
| Threat bar fill   | 40-60%                                           |
| Terminal border   | Yellow pulse every 15s                           |
| Ambient sound     | Elevated hum, periodic warning tone, data noise  |
| Facility lighting | Warm amber wash, alert indicator active          |
| Morpheus status   | "Multiple threat vectors active. Trust nothing." |

---

#### 2.1.4 Tier 4: HIGH (Orange)

**Narrative Context:** Advanced persistent threat operations underway. Coordinated, multi-vector attacks. The adversary has studied the player's defenses and is targeting weaknesses.

**Attack Parameters:**

| Parameter              | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| Attack frequency       | 4-7 attacks per game day                                |
| Phishing ratio         | 50:50                                                   |
| Sophistication ceiling | Difficulty 4-5                                          |
| Attack vectors active  | All vectors including APT campaigns, zero-day analogues |
| Concurrent incidents   | 2-3                                                     |
| Campaign activity      | 1-2 active campaigns, multi-phase operations            |

**New Attack Vectors Introduced:**

- APT simulation: multi-phase campaigns spanning multiple game days
- Coordinated multi-vector attacks (phishing + supply chain + infrastructure)
- AI-generated pretexts with deep personalization
- Attacks against the player's security tools (attempting to degrade defenses)
- False flag operations (attacks designed to look like a different faction)
- Zero-day analogues (novel attack patterns not seen before)

**Trigger Conditions (Escalation from ELEVATED):**

- Player reaches Day 20 or accepts 30+ clients
- Player achieves Facility Tier 4 (Fortress)
- Player successfully defends against first full campaign
- Two or more factions actively hostile
- Narrative trigger: Major story event (e.g., high-value data attracts nation-state interest)

**Visual Indicators:**

| Element           | Specification                                                         |
| ----------------- | --------------------------------------------------------------------- |
| Threat bar color  | `#ff6600` (orange)                                                    |
| Threat bar fill   | 60-80%                                                                |
| Terminal border   | Orange pulse every 8s, occasional static                              |
| Ambient sound     | High tension drone, frequent warning tones, data corruption artifacts |
| Facility lighting | Orange alert wash, strobing on incident                               |
| Morpheus status   | "We are under coordinated assault. Every decision matters."           |

---

#### 2.1.5 Tier 5: SEVERE (Red)

**Narrative Context:** End-game crisis. Full-spectrum assault. All factions involved. The data center's survival is at stake. This is the culmination of a season arc.

**Attack Parameters:**

| Parameter              | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| Attack frequency       | 6-12 attacks per game day                                 |
| Phishing ratio         | 60:40 (majority malicious)                                |
| Sophistication ceiling | Difficulty 5 (maximum)                                    |
| Attack vectors active  | Everything -- coordinated campaigns across all categories |
| Concurrent incidents   | 3-5                                                       |
| Campaign activity      | 2-3 active campaigns, climactic operations                |

**Attack Characteristics:**

- Near-perfect social engineering with minimal detectable indicators
- Strategic adversary operations with defined campaign objectives
- Deep-fake-style identity fraud (synthetic verification packets)
- Attacks against security tools and player's decision-making processes
- Deliberate disinformation through compromised intelligence channels
- Ethical dilemmas where security and humanitarian needs conflict
- Genuinely ambiguous scenarios with no clear "correct" answer

**Trigger Conditions (Escalation from HIGH):**

- Season finale narrative events
- Player reaches Day 30+ or achieves Facility Tier 5 (Citadel)
- Player triggers specific narrative branch (e.g., accepting a high-value target client)
- All factions active in the narrative
- Narrative trigger: "The Siege" -- coordinated multi-faction assault

**Visual Indicators:**

| Element           | Specification                                                    |
| ----------------- | ---------------------------------------------------------------- |
| Threat bar color  | `#ff0033` (red)                                                  |
| Threat bar fill   | 80-100%                                                          |
| Terminal border   | Red pulse every 4s, heavy static, scan lines intensify           |
| Ambient sound     | Klaxon on incident, constant tension drone, system stress sounds |
| Facility lighting | Red alert wash, emergency lighting mode                          |
| Morpheus status   | "This is it. Everything we've built is on the line."             |

---

### 2.2 Threat Level Transition Logic

#### 2.2.1 Escalation Model

Threat level is calculated as a composite score from four input signals:

```
ThreatScore = (w1 * NarrativeProgress) + (w2 * PlayerCompetence) +
              (w3 * FacilityScale) + (w4 * EventTriggers)

Where:
  NarrativeProgress : 0.0 - 1.0 (story chapter / total chapters)
  PlayerCompetence  : 0.0 - 1.0 (rolling detection rate, response quality)
  FacilityScale     : 0.0 - 1.0 (current tier / max tier, client count / max)
  EventTriggers     : 0.0 or 1.0 (binary -- specific narrative events)

Weights:
  w1 = 0.35  (narrative is the primary driver)
  w2 = 0.25  (player skill accelerates or decelerates)
  w3 = 0.25  (bigger target = bigger threats)
  w4 = 0.15  (story beats can force transitions)
```

**Tier Thresholds:**

| Tier     | ThreatScore Range | Minimum Day |
| -------- | ----------------- | ----------- |
| LOW      | 0.00 - 0.19       | Day 1       |
| GUARDED  | 0.20 - 0.39       | Day 4       |
| ELEVATED | 0.40 - 0.59       | Day 10      |
| HIGH     | 0.60 - 0.79       | Day 20      |
| SEVERE   | 0.80 - 1.00       | Day 30      |

The `Minimum Day` acts as a floor -- a player cannot reach ELEVATED before Day 10 regardless of score, preventing overwhelming new players. However, narrative `EventTriggers` can override this floor for scripted story moments.

#### 2.2.2 De-escalation Conditions

Threat level can decrease under specific conditions, always narratively justified:

| Condition                                       | Effect                   | Narrative Justification                                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Post-breach recovery                            | Drop 1 tier for 2-3 days | "Attackers achieved their objective; activity reduces while they exploit stolen data." Incident data yields Intel Fragments (IF) for post-incident analysis per BRD Section 11.4.                           |
| Major campaign defeated                         | Drop 1 tier for 1-2 days | "The threat group is regrouping after their failed operation." Player earns Intel Fragments (IF) proportional to campaign complexity, spendable on detection signatures, threat profiles, and IDS upgrades. |
| Season transition                               | Reset to GUARDED         | "A new chapter begins. New threats are forming."                                                                                                                                                            |
| Player on losing streak (3+ breaches in 5 days) | Drop 1 tier              | "Intelligence suggests attackers are shifting focus to softer targets." (Anti-frustration)                                                                                                                  |

#### 2.2.3 Hysteresis Buffer

To prevent rapid oscillation between tiers, a hysteresis buffer of 0.05 is applied:

- Escalation requires ThreatScore >= threshold + 0.05
- De-escalation requires ThreatScore <= threshold - 0.05
- Minimum hold time at any tier: 2 game days

#### 2.2.4 State Diagram

```
                    ┌─────────┐
          ┌────────►│  LOW    │◄────────┐
          │         └────┬────┘         │
          │              │              │
    [post-breach]   [score>0.25]   [de-escalate]
          │              │              │
          │              ▼              │
          │         ┌─────────┐        │
          ├────────►│ GUARDED │────────┤
          │         └────┬────┘        │
          │              │              │
          │         [score>0.45]        │
          │              │              │
          │              ▼              │
          │         ┌──────────┐       │
          ├────────►│ ELEVATED │───────┤
          │         └────┬─────┘       │
          │              │              │
          │         [score>0.65]        │
          │              │              │
          │              ▼              │
          │         ┌─────────┐        │
          ├────────►│  HIGH   │────────┤
          │         └────┬────┘        │
          │              │              │
          │         [score>0.85]        │
          │              │              │
          │              ▼              │
          │         ┌─────────┐        │
          └────────►│ SEVERE  │────────┘
                    └─────────┘
```

---

## 3. Adaptive Threat Engine

The Adaptive Threat Engine is the core AI opponent of The DMZ: Archive Gate. Its design draws from two landmark game AI systems:

- **Left 4 Dead's AI Director:** The concept of intensity management -- monitoring player stress through a "menace gauge," creating build-up/peak/relax cycles, and ensuring every playthrough feels dynamic. The Director never tells the zombies exactly where you are; it nudges them toward you and lets emergence do the rest.

- **Alien: Isolation's Dual-Layer System:** The separation between a high-level Director (which manages pacing and periodically points the alien toward the player) and a low-level Behavior Tree (which governs moment-to-moment alien decisions using sensory data). The alien never cheats -- it finds you through its senses, but the Director ensures it keeps finding itself in the right neighborhood.

The Threat Engine adapts this two-layer architecture for a cybersecurity context.

### 3.1 Architecture: Director Layer + Behavior Layer

```
┌──────────────────────────────────────────────────┐
│               DIRECTOR LAYER                      │
│  (Macro-pacing, intensity management, narrative)  │
│                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Intensity  │  │  Narrative   │  │  Breathing │ │
│  │  Monitor    │  │  Scheduler   │  │  Room Ctrl │ │
│  └──────┬─────┘  └──────┬──────┘  └──────┬─────┘ │
│         │               │                │        │
│         ▼               ▼                ▼        │
│  ┌────────────────────────────────────────────┐   │
│  │         ATTACK SELECTION ORACLE            │   │
│  └────────────────────┬───────────────────────┘   │
└───────────────────────┼───────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│               BEHAVIOR LAYER                      │
│  (Attack generation, difficulty tuning, delivery) │
│                                                    │
│  ┌────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Attack     │  │  Difficulty  │  │  Content   │ │
│  │  Generator  │  │  Calibrator  │  │  Assembler │ │
│  └─────────────┘  └─────────────┘  └────────────┘ │
└──────────────────────────────────────────────────┘
```

### 3.2 Player Behavior Profiling

The engine maintains a real-time player profile that tracks performance across multiple dimensions. This profile drives attack vector selection, difficulty calibration, and pacing decisions.

#### 3.2.1 Tracked Metrics

**Detection Performance (per attack category):**

| Metric                    | Description                                             | Window               |
| ------------------------- | ------------------------------------------------------- | -------------------- |
| `detectionRate[category]` | Percentage of attacks correctly identified per category | Rolling 20 decisions |
| `falsePositiveRate`       | Percentage of legitimate emails incorrectly flagged     | Rolling 20 decisions |
| `responseTime[category]`  | Average seconds to decision per category                | Rolling 10 decisions |
| `streakCorrect`           | Current consecutive correct detections                  | Running counter      |
| `streakIncorrect`         | Current consecutive missed attacks                      | Running counter      |

**Verification Behavior:**

| Metric               | Description                                                      | Window               |
| -------------------- | ---------------------------------------------------------------- | -------------------- |
| `verificationDepth`  | Average verification steps completed before decision (0-5 scale) | Rolling 10 decisions |
| `headerCheckRate`    | Percentage of emails where headers were inspected                | Rolling 20 decisions |
| `urlInspectionRate`  | Percentage of URLs hovered/inspected before decision             | Rolling 20 decisions |
| `crossReferenceRate` | Percentage of decisions where verification packet was consulted  | Rolling 20 decisions |

**Resource Management:**

| Metric                 | Description                                                | Snapshot      |
| ---------------------- | ---------------------------------------------------------- | ------------- |
| `securityToolCoverage` | Percentage of attack categories covered by purchased tools | Current state |
| `toolMaintenanceLevel` | Average update level across all security tools (0-1)       | Current state |
| `financialReserve`     | Current credits as ratio of potential ransom cost          | Current state |
| `capacityUtilization`  | Rack/bandwidth/power utilization percentage                | Current state |

**Strategic Indicators:**

| Metric                        | Description                                                        | Derived              |
| ----------------------------- | ------------------------------------------------------------------ | -------------------- |
| `riskAppetite`                | Ratio of high-risk clients accepted to total decisions             | Rolling 30 decisions |
| `securityInvestmentRatio`     | Percentage of spending on security vs. capacity                    | Lifetime             |
| `intelligenceBriefEngagement` | Percentage of intelligence briefs read                             | Rolling 10 briefs    |
| `incidentResponseQuality`     | Composite score of containment speed, evidence gathering, recovery | Rolling 5 incidents  |

#### 3.2.2 Player Competence Score

A composite competence score is derived from the profile. Per BRD Section 11.6, player skill is inferred from detection rate, response time, resource efficiency, and pattern recognition:

```
CompetenceScore = (0.25 * avgDetectionRate) +
                  (0.15 * verificationDepth / 5) +
                  (0.10 * (1 - falsePositiveRate)) +
                  (0.15 * normalizedResponseTime) +
                  (0.10 * securityToolCoverage) +
                  (0.10 * incidentResponseQuality) +
                  (0.10 * intelligenceBriefEngagement) +
                  (0.05 * patternRecognitionScore)

Where:
  normalizedResponseTime = 1.0 - clamp(avgResponseTime / maxExpectedTime, 0, 1)
    // Faster decisions score higher
  patternRecognitionScore = rate of correctly identifying multi-step campaigns
    // Rewards connecting seemingly unrelated attack events

Range: 0.0 (novice) to 1.0 (expert)
```

This score feeds into both the Threat Level calculation (Section 2.2.1) and the Attack Selection Algorithm (Section 3.3).

### 3.3 Attack Vector Selection Algorithm

The core of the Adaptive Threat Engine is the attack selection algorithm: "What do we throw at the player next?" The algorithm implements the key BRD requirement: "Good at phishing detection leads to pivot to supply chain attacks; strong perimeter leads to pivot to insider manipulation."

#### 3.3.1 Attack Portfolio and Weights

Each attack category has a base weight that is dynamically modified by player performance:

| Category                          | Base Weight | Player Performance Modifier                              |
| --------------------------------- | ----------- | -------------------------------------------------------- |
| Email Phishing (bulk)             | 0.25        | `weight *= (1.0 - detectionRate['phishing'] * 0.7)`      |
| Spear Phishing                    | 0.20        | `weight *= (1.0 - detectionRate['spearPhishing'] * 0.6)` |
| BEC / Whaling                     | 0.10        | `weight *= (1.0 - detectionRate['bec'] * 0.5)`           |
| Supply Chain                      | 0.15        | `weight *= (1.0 + detectionRate['phishing'] * 0.5)`      |
| Insider Threat                    | 0.10        | `weight *= (1.0 + securityToolCoverage * 0.4)`           |
| Infrastructure (DDoS/Brute Force) | 0.10        | `weight *= (1.0 - securityToolCoverage * 0.3)`           |
| APT Campaign                      | 0.05        | `weight *= (1.0 + CompetenceScore * 0.6)`                |
| Zero-Day Analogue                 | 0.05        | `weight *= (1.0 + CompetenceScore * 0.8)`                |

**The Pivot Logic Explained:**

When `detectionRate['phishing']` is high (player is good at catching phishing), the phishing weight **decreases** (less rewarding for the engine to keep throwing what the player catches), while `supplyChain` weight **increases** (pivoting to the player's blind spots). When `securityToolCoverage` is high (player has invested in perimeter defense), `insiderThreat` weight **increases** (bypassing the perimeter entirely).

#### 3.3.2 Selection Algorithm

```
function selectAttackVector(playerProfile, threatLevel, activeCampaigns):
    // 1. Calculate dynamic weights
    weights = calculateDynamicWeights(playerProfile)

    // 2. Filter by threat level (not all vectors available at all tiers)
    availableVectors = filterByThreatLevel(weights, threatLevel)

    // 3. Boost weights for active campaign requirements
    for campaign in activeCampaigns:
        if campaign.currentPhase.requiredVector:
            availableVectors[campaign.currentPhase.requiredVector] *= 2.0

    // 4. Apply anti-repetition penalty (same vector twice in a row: 50% weight reduction)
    if lastAttackVector:
        availableVectors[lastAttackVector] *= 0.5

    // 5. Normalize weights to probabilities
    totalWeight = sum(availableVectors.values())
    probabilities = { k: v / totalWeight for k, v in availableVectors }

    // 6. Weighted random selection
    return weightedRandomChoice(probabilities)
```

#### 3.3.3 Vector Availability by Threat Level

| Attack Vector            | LOW | GUARDED | ELEVATED | HIGH | SEVERE |
| ------------------------ | --- | ------- | -------- | ---- | ------ |
| Email Phishing (bulk)    | Yes | Yes     | Yes      | Yes  | Yes    |
| Spear Phishing           | --  | Yes     | Yes      | Yes  | Yes    |
| BEC / Whaling            | --  | --      | Yes      | Yes  | Yes    |
| Credential Harvesting    | --  | Yes     | Yes      | Yes  | Yes    |
| Supply Chain             | --  | --      | Yes      | Yes  | Yes    |
| Insider Threat           | --  | --      | Yes      | Yes  | Yes    |
| DDoS                     | --  | --      | --       | Yes  | Yes    |
| Brute Force              | --  | --      | Yes      | Yes  | Yes    |
| APT Campaign             | --  | --      | --       | Yes  | Yes    |
| Zero-Day Analogue        | --  | --      | --       | --   | Yes    |
| Coordinated Multi-Vector | --  | --      | --       | Yes  | Yes    |

### 3.4 Intensity Management (The Director)

Directly inspired by Left 4 Dead's AI Director, the Threat Engine manages player intensity through build-up/peak/relax cycles.

#### 3.4.1 Intensity Gauge

The engine maintains an `IntensityGauge` (0.0 to 1.0) that measures the player's current stress level:

```
IntensityGauge += attacksThisDay * 0.1
IntensityGauge += activeIncidents * 0.15
IntensityGauge += (1.0 - playerHealth) * 0.2    // playerHealth = financialReserve
IntensityGauge += recentBreachPenalty * 0.3       // 0.3 if breach in last 2 days
IntensityGauge -= timeSinceLastAttack * 0.02      // decays over quiet periods
IntensityGauge = clamp(IntensityGauge, 0.0, 1.0)
```

#### 3.4.2 Pacing Phases

| Phase        | IntensityGauge   | Director Behavior                                                                                                                       |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Build-Up** | 0.0 - 0.3        | Increasing attack frequency and sophistication. New vectors introduced. Intelligence Briefs warn of gathering threats.                  |
| **Sustain**  | 0.3 - 0.6        | Steady attack pressure. Player is engaged but not overwhelmed. Mix of difficulties.                                                     |
| **Peak**     | 0.6 - 0.8        | Maximum pressure for the current threat level. Concurrent incidents. Campaign climax events.                                            |
| **Relax**    | 0.8+ (triggered) | Director suppresses new attacks for 1-2 days. Only low-difficulty probes. Morpheus comments on the quiet. Player can recover resources. |

#### 3.4.3 Breathing Room Mechanics

After specific high-stress events, the Director enforces mandatory breathing room:

| Trigger Event                          | Breathing Room Duration | Behavior                                                            |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Successful breach + ransom payment     | 2-3 game days           | Threat level drops 1 tier. Only Tier 1-2 difficulty attacks.        |
| Defeated major campaign                | 1-2 game days           | Attack frequency halved. Intelligence Brief celebrates the victory. |
| Player loses 30%+ clients in attrition | 1 game day              | Reduced attack volume. Morpheus provides encouragement.             |
| IntensityGauge hits 0.85+              | Auto-triggered 1 day    | "The storm passes." No new attacks initiated.                       |
| Three consecutive failed detections    | Immediate               | Next 2 attacks reduced to Difficulty 1-2. Morpheus provides hints.  |

### 3.5 Narrative Justification System

Every difficulty change produces a corresponding narrative event. The player never experiences a silent adjustment -- they experience an evolving world.

| Engine Action                          | Narrative Justification                                                 | Delivery Method             |
| -------------------------------------- | ----------------------------------------------------------------------- | --------------------------- |
| Threat level escalation                | "Our intelligence network reports increased adversary coordination."    | Intelligence Brief          |
| Threat level de-escalation             | "The attackers appear to be regrouping. Use this time wisely."          | Morpheus message            |
| Attack vector pivot                    | "They've changed tactics. They know we're watching for phishing."       | Intelligence Brief          |
| Difficulty increase                    | "Our growing reputation has attracted more capable adversaries."        | Morpheus message            |
| Difficulty decrease (anti-frustration) | "The storm has passed for now. But they'll be back."                    | Morpheus message            |
| Campaign begins                        | "We've intercepted chatter about a coordinated operation targeting us." | Intelligence Brief (urgent) |
| Campaign defeated                      | "The operation against us has failed. Outstanding work."                | Morpheus commendation       |
| Breathing room                         | "Quiet on the wire. Almost too quiet."                                  | Ambient narrative           |

### 3.6 Threat Escalation Curves by Season

Each season has a pre-defined difficulty envelope within which the adaptive engine operates. Per the BRD, each season runs 12 weeks with 11 chapters across three acts (Setup, Escalation, Crisis) plus a Finale:

```
Difficulty
   5 │                                                    ╱──╲
     │                                              ╱────╱    ╲
   4 │                                        ╱────╱           ╲
     │                                  ╱────╱                  ╲
   3 │                           ╱─────╱
     │                     ╱────╱
   2 │               ╱────╱
     │         ╱────╱
   1 │────────╱
     └──┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──
        Ch1  Ch2  Ch3  Ch4  Ch5  Ch6  Ch7  Ch8  Ch9  Ch10 Ch11 Finale
        ╰── Act I ──╯  ╰──── Act II ────╯  ╰── Act III ──╯  ╰Finale╯
        (Setup)         (Escalation)         (Crisis)
```

**Season 1 (Signal Loss -- Phishing/Access Control, real-world analogue: Stuxnet):**

- Act I (Ch 1-3): LOW to GUARDED. Email phishing only. Learning fundamentals.
- Act II (Ch 4-7): GUARDED to ELEVATED. Spear phishing, credential harvesting, first supply chain probes.
- Act III (Ch 8-11): ELEVATED to HIGH/SEVERE. Multi-vector attacks. Season climax campaign.
- Finale: Season-ending crisis event. Threat level peaks at SEVERE.

**Season 2 (Supply Lines -- Supply Chain, real-world analogue: SolarWinds):**

- Act I: GUARDED baseline. Supply chain focus from the start.
- Act II: ELEVATED. Complex supply chain campaigns. Third-party compromise.
- Act III: HIGH to SEVERE. Cascading supply chain failures.
- Finale: Full supply chain cascade event.

**Season 3 (Dark Channels -- Ransomware):**

- Act I: ELEVATED baseline. Ransomware-as-a-Service emergence.
- Act II: HIGH. Coordinated ransomware campaigns. Double extortion.
- Act III: SEVERE. "The Big One" -- existential ransomware event.
- Finale: Maximum ransomware crisis.

**Season 4 (The Inside Job -- Insider Threats):**

- Act I: GUARDED. Subtle anomalies. Trust erosion.
- Act II: HIGH. Confirmed insider activity. Paranoia mechanics.
- Act III: SEVERE. Full insider + external coordination. Trust collapse.
- Finale: Trust collapse climax -- insider + external coordination at maximum intensity.

---

## 4. Attack Type Catalog

Each attack type in the catalog includes: description, game mechanics implementation, player detection methods, consequences if missed, difficulty scaling across tiers, and MITRE ATT&CK mapping.

### 4.1 Phishing Variants

#### 4.1.1 Bulk Email Phishing

**Description:** Mass-distributed fraudulent access requests impersonating known organization types. The bread-and-butter attack throughout the game.

**MITRE ATT&CK:** T1566 (Phishing), T1036 (Masquerading)

**Game Mechanics:**

- Email arrives in the queue with spoofed sender identity
- Red flags embedded in headers, domain, content, and attachments
- Player must analyze and decide: Approve / Deny / Flag for Review / Request Additional Verification

**Detection Methods Available to Player:**

- Sender domain inspection (mismatched or suspicious domains)
- Header analysis (SPF/DKIM failure indicators)
- Content analysis (grammatical errors, urgency cues, generic greetings)
- Cross-reference with Verification Packet
- Check against Threat Assessment Sheet indicators
- URL hover-inspection for suspicious destinations

**Consequences if Missed:**

- Minor: Trust Score penalty (-5 to -15)
- Moderate: Malware installation begins supply chain compromise
- Severe: Credential theft leads to breach trigger (see Section 5)

**Difficulty Scaling:**

| Difficulty | Characteristics                                                                              |
| ---------- | -------------------------------------------------------------------------------------------- |
| 1          | Obvious misspellings, freemail domains, generic content, impossible claims                   |
| 2          | Correct grammar but wrong tone, similar-but-wrong domains, vague pretext                     |
| 3          | Professional language, plausible domains, contextual details, emotional hooks                |
| 4          | Near-perfect impersonation, registered look-alike domains, references to real in-game events |
| 5          | Indistinguishable from legitimate without deep header analysis or out-of-band verification   |

---

#### 4.1.2 Spear Phishing

**Description:** Targeted attacks crafted specifically for the player's data center, referencing real clients, events, and personnel.

**MITRE ATT&CK:** T1566.001 (Spearphishing Attachment), T1566.002 (Spearphishing Link), T1589 (Gather Victim Identity Information)

**Game Mechanics:**

- Email references specific clients the player has accepted
- May appear to come from a known client's contact
- Attachments labeled as "updated documentation" for existing contracts
- Links to "new verification portal" or "updated threat intelligence"

**Detection Methods:**

- Cross-reference sender with known client contact records
- Verify that the referenced contract or event actually exists
- Check attachment types against expected document formats
- Inspect URLs for redirect chains or unusual domains
- Contact the supposed sender through a separate channel (Request Additional Verification)

**Consequences if Missed:**

- Client data compromise (specific client's stored data at risk)
- Lateral movement potential (attacker gains foothold in systems)
- Trust Score penalty proportional to compromised client value

**Difficulty Scaling:**

| Difficulty | Characteristics                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 2          | References a client by name but gets details wrong (wrong contract dates, wrong data type)                        |
| 3          | Accurate client details but sender domain is slightly off; timing is suspicious                                   |
| 4          | Perfect client details, correct domain format, but sent outside normal communication patterns                     |
| 5          | Identical to a real client communication; only detectable via out-of-band verification or subtle header anomalies |

---

#### 4.1.3 Business Email Compromise (BEC)

**Description:** Impersonation of authority figures -- Morpheus, facility administrators, or high-profile clients -- requesting urgent, unusual actions.

**MITRE ATT&CK:** T1656 (Impersonation), T1534 (Internal Spearphishing)

**Game Mechanics:**

- Email appears to come from Morpheus or senior staff
- Requests bypass of normal verification procedures
- Claims emergency authorization for immediate access
- May request transfer of Credits to external account

**Detection Methods:**

- Verify sender through independent channel
- Check whether Morpheus typically communicates this way
- Evaluate whether the requested action aligns with established procedures
- Look for urgency + authority + request to bypass controls (the BEC triad)

**Consequences if Missed:**

- Direct financial loss (Credits transferred to attacker)
- Unauthorized high-risk client access
- Major Trust Score penalty
- Potential breach trigger if access leads to system compromise

**Difficulty Scaling:**

| Difficulty | Characteristics                                                                           |
| ---------- | ----------------------------------------------------------------------------------------- |
| 3          | Impersonates Morpheus but uses wrong communication style, wrong sign-off                  |
| 4          | Accurate style and tone, but requests action that contradicts established policy          |
| 5          | Perfect impersonation; only detectable by verifying through Morpheus's known-good channel |

---

#### 4.1.4 Credential Harvesting

**Description:** Emails directing the player to fake login pages or requesting authentication credentials directly.

**MITRE ATT&CK:** T1566.002 (Spearphishing Link), T1078 (Valid Accounts)

**Game Mechanics:**

- Email contains link to "updated admin portal" or "mandatory security re-verification"
- Link destination is a look-alike domain
- May claim that the player's credentials have been compromised and need reset
- Successful harvest gives attacker valid credentials for future attacks

**Detection Methods:**

- URL inspection (hover to reveal true destination)
- Domain verification (check for homoglyphs, extra characters, wrong TLD)
- Context evaluation (does the data center actually use this portal?)
- Security tool alerts (WAF or threat intel feed may flag known bad domains)

**Consequences if Missed:**

- Attacker gains valid session token
- Future attacks gain +1 difficulty bonus (attacker has inside knowledge)
- Sets up conditions for insider threat attacks using compromised credentials

---

#### 4.1.5 Clone Phishing

**Description:** A previously legitimate email is re-sent with malicious modifications -- replaced attachments or altered links.

**MITRE ATT&CK:** T1566.001 (Spearphishing Attachment), T1036 (Masquerading)

**Game Mechanics:**

- Player receives an email identical to one they previously approved
- The "follow-up" or "updated version" contains malicious payload
- Only difference: attachment hash, link destination, or subtle content change
- Exploits the player's trust in a previously verified communication

**Detection Methods:**

- Compare with original email (why is this being re-sent?)
- Check attachment hash against original (if player kept records)
- Verify with sender why a new version was sent
- Timestamp analysis (sent at unusual time)

**Consequences if Missed:**

- Particularly damaging because it bypasses established trust
- Immediate supply chain compromise vector
- Trust Score penalty plus breach risk

---

#### 4.1.6 Pretexting

**Description:** Elaborate false narratives designed to build trust over multiple interactions before the attack payload is delivered.

**MITRE ATT&CK:** T1598 (Phishing for Information), T1589 (Gather Victim Identity Information)

**Game Mechanics:**

- Multi-email sequence: first email is benign (information request)
- Second email references the first interaction to build rapport
- Third email contains the actual attack (leveraging established trust)
- Each individual email appears harmless; the threat is in the sequence

**Detection Methods:**

- Track communication patterns (new contact escalating quickly)
- Evaluate whether the sequence of requests makes operational sense
- Check for information extraction in early "innocent" emails
- Intelligence Brief may warn about known pretexting campaigns

**Consequences if Missed:**

- Progressive compromise: each successful email gives attacker more information
- Final-stage compromise can lead to full breach
- Especially dangerous because the player actively cooperated in building the attack chain

---

#### 4.1.7 Whaling

**Description:** Ultra-targeted attacks impersonating or targeting the highest-value entities in the game world -- government officials, major faction leaders, or Morpheus himself.

**MITRE ATT&CK:** T1566 (Phishing), T1656 (Impersonation)

**Game Mechanics:**

- Email from a "government minister" demanding immediate priority access
- Request from "Nexion Industries CEO" offering enormous contract with conditions
- Communication appearing to be from another surviving data center requesting mutual aid
- High stakes: approval carries huge reward but enormous risk

**Detection Methods:**

- Out-of-band verification is essential (cannot rely on email alone)
- Cross-reference with Intelligence Briefs for known impersonation campaigns
- Evaluate whether the offer is too good to be true
- Check whether the claimed entity has any prior verified contact

**Consequences if Missed:**

- Maximum severity breach potential
- Massive Trust Score loss
- Potential game-ending scenario at higher threat levels

---

### 4.2 Supply Chain Attacks

#### 4.2.1 Malware in Client Backups

**Description:** Accepted client data contains embedded malware that activates after a delay, compromising the data center from within.

**MITRE ATT&CK:** T1195 (Supply Chain Compromise), T1204.002 (User Execution: Malicious File)

**Game Mechanics:**

- Client passes initial email verification and appears legitimate
- Data accepted for storage contains dormant malware
- Malware activates after 1-3 game days (delay increases with difficulty)
- Detection window between acceptance and activation
- Security tools (if purchased) may detect during intake scan

**Detection Methods:**

- Data integrity scanning tools (if purchased and maintained)
- Anomalous resource consumption patterns after data intake
- Intelligence Brief warnings about compromised sources
- Threat Assessment Sheet risk scores for the data source
- Post-acceptance monitoring of client data behavior

**Consequences if Missed:**

- Delayed breach (1-3 days after acceptance)
- More severe than direct phishing breach (attacker already inside)
- Potential to compromise other clients' data (lateral spread)
- Recovery takes longer (must identify and clean all affected systems)

**Difficulty Scaling:**

| Difficulty | Characteristics                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 3          | Malware detectable by basic scanning tools; unusual file types in backup                                         |
| 4          | Malware evades basic scanning; only detectable by behavioral analysis or advanced tools                          |
| 5          | Sophisticated fileless malware; only detectable through anomalous resource patterns or pre-existing intelligence |

---

#### 4.2.2 Compromised Updates

**Description:** A trusted client's "software update" or "data patch" contains malicious code, exploiting the trusted update channel.

**MITRE ATT&CK:** T1195.002 (Compromise Software Supply Chain)

**Game Mechanics:**

- Existing trusted client sends an "update" to their stored data
- Update package contains malicious payload alongside legitimate changes
- Player must decide whether to apply the update or verify first
- Applying without verification triggers supply chain compromise

**Detection Methods:**

- Verify update hash against known-good values
- Contact client through independent channel to confirm update was sent
- Sandbox testing (if player has purchased sandboxing capability)
- Compare update timing with client's established update schedule

**Consequences if Missed:**

- Immediate compromise of client's data segment
- Potential lateral movement to other segments
- Trust in update channel destroyed (all future updates from this client are suspect)

---

#### 4.2.3 Third-Party Data Injection

**Description:** Attacker compromises a legitimate client and uses their access to inject malicious data into the data center.

**MITRE ATT&CK:** T1199 (Trusted Relationship), T1195 (Supply Chain Compromise)

**Game Mechanics:**

- A previously verified, trusted client submits new data
- The data itself is clean, but the client's account has been compromised
- The "new data" is actually an attacker payload using the client's trusted access
- Only detectable through anomalous behavior from an established client

**Detection Methods:**

- Behavioral analysis (is this request consistent with client's patterns?)
- Volume analysis (is this more data than the client typically sends?)
- Timing analysis (unusual submission time)
- Content analysis (data type inconsistent with client's profile)

**Consequences if Missed:**

- Breach via trusted channel (most damaging breach type)
- The compromised client must be blacklisted (loss of revenue and relationship)
- Extensive forensic investigation required

---

### 4.3 Insider Threats

#### 4.3.1 Compromised Existing Client

**Description:** A previously legitimate client has been turned or compromised, and now uses their authorized access for malicious purposes.

**MITRE ATT&CK:** T1078 (Valid Accounts), T1098 (Account Manipulation)

**Game Mechanics:**

- A trusted client begins requesting expanded access beyond their contract
- Access requests are technically within policy but represent a pattern change
- Client may begin accessing data outside their allocated segment
- Anomaly detection tools (if purchased) flag unusual behavior

**Detection Methods:**

- Monitor access patterns against contractual baseline
- Flag requests that exceed contracted scope
- Review client behavior through Incident Log analytics
- Investigate sudden changes in communication style or frequency

**Consequences if Missed:**

- Data exfiltration from the data center
- Other clients' data potentially compromised
- Trust Score penalty for failing to protect client data
- Revenue loss from affected clients

---

#### 4.3.2 Social Engineering of Staff

**Description:** Adversaries target the player's "staff" (automated systems) through social engineering, attempting to gain access through the human layer.

**MITRE ATT&CK:** T1566.004 (Spearphishing Voice), T1598 (Phishing for Information)

**Game Mechanics:**

- Event notification: "A caller claiming to be from [Client] is requesting password reset for their account"
- Player must decide whether to authorize the reset or verify independently
- If the player has hired staff NPCs, they may be targeted independently (staff competence varies)
- Staff with low security training may comply with social engineering without consulting the player

**Detection Methods:**

- Implement callback verification procedures
- Require multi-factor authorization for sensitive actions
- Train staff (upgrade option) to resist social engineering
- Log all staff-initiated actions for review

**Consequences if Missed:**

- Unauthorized access through compromised staff action
- May lead to credential compromise or data breach
- Staff NPC trust rating decreases

---

### 4.4 Infrastructure Attacks

#### 4.4.1 DDoS (Distributed Denial of Service)

**Description:** Volumetric attacks overwhelming the data center's bandwidth and processing capacity.

**MITRE ATT&CK:** T1498 (Network Denial of Service), T1499 (Endpoint Denial of Service)

**Game Mechanics:**

- Bandwidth utilization spikes to critical levels over 1-3 rounds
- Legitimate client services degrade (SLA violations)
- Player must allocate bandwidth resources: absorb, mitigate, or sacrifice some services
- Can purchase DDoS mitigation tools (CDN, scrubbing, rate limiting)
- DDoS may be a distraction for a simultaneous targeted attack

**Detection Methods:**

- Facility Status Report shows bandwidth anomaly
- Traffic analysis tools identify attack traffic patterns
- Intelligence Brief may warn of DDoS campaign targeting the facility

**Consequences if Missed/Unmitigated:**

- Service degradation for all clients (Trust Score penalty)
- SLA violations trigger client complaints and potential attrition
- If bandwidth fully consumed, all operations halt temporarily
- DDoS-as-distraction may mask a more damaging concurrent attack

---

#### 4.4.2 Brute Force Authentication

**Description:** Automated credential guessing attacks against the data center's authentication systems.

**MITRE ATT&CK:** T1110 (Brute Force), T1110.001 (Password Guessing), T1110.003 (Password Spraying)

**Game Mechanics:**

- Background event: authentication log shows increasing failed login attempts
- Player must respond by adjusting authentication policies
- If ignored, attacker may eventually gain valid credentials
- Can deploy account lockout, rate limiting, MFA (security tool purchases)

**Detection Methods:**

- Incident Log shows spike in failed authentication
- Security tools (IDS/IPS) generate alerts
- Facility Status Report shows increased processing load

**Consequences if Missed:**

- Credential compromise (attacker gains valid access)
- Leads to insider threat scenario (attacker operating as authorized user)
- Resource drain from sustained attack

---

#### 4.4.3 Zero-Day Exploits Against Player Tools

**Description:** Adversaries discover and exploit vulnerabilities in the player's purchased security tools.

**MITRE ATT&CK:** T1190 (Exploit Public-Facing Application), T1068 (Exploitation for Privilege Escalation)

**Game Mechanics:**

- Intelligence Brief warns of vulnerability in a specific security tool
- Player must decide: patch immediately (temporary tool downtime) or accept risk
- If unpatched, attacker can disable or bypass that specific tool
- Creates a temporary gap in the player's defense coverage matrix

**Detection Methods:**

- Intelligence Brief is the primary detection method
- Tool status indicator shows "vulnerability detected"
- Post-exploitation: tool effectiveness drops visibly

**Consequences if Missed:**

- Security tool rendered ineffective until patched
- All attacks that tool normally detects now bypass detection
- Cascading risk if the compromised tool was a keystone of the defense strategy

---

### 4.5 Advanced Persistent Threats (APTs)

#### 4.5.1 Multi-Phase Campaigns

**Description:** Coordinated operations spanning multiple game days with distinct phases, each building on the success of the previous phase.

**MITRE ATT&CK:** Multiple techniques across the full kill chain (TA0043 through TA0040)

**Game Mechanics:**

**Phase 1 -- Reconnaissance (Days 1-2):**

- Seemingly innocent emails requesting general information about the facility
- Information-gathering pretexts ("We are writing a report on surviving data centers")
- If the player responds, attacker gains intelligence for Phase 2

**Phase 2 -- Weaponization & Delivery (Days 3-4):**

- Targeted spear phishing using intelligence gathered in Phase 1
- Custom-crafted emails referencing specific details the player revealed
- May include supply chain probes to secondary attack channels

**Phase 3 -- Exploitation (Day 5):**

- Main attack payload delivered through the most promising vector
- May coordinate multiple vectors simultaneously (phishing + supply chain)
- Designed to overwhelm detection capacity

**Phase 4 -- Actions on Objective (Day 6+):**

- If any phase succeeds, attacker establishes persistence
- Data exfiltration, service disruption, or ransomware deployment
- Post-compromise: attacker may sell access to other factions

**Detection Methods:**

- Pattern recognition across the campaign timeline
- Correlating seemingly unrelated events (information request followed by targeted attack)
- Intelligence Briefs that hint at campaign activity without revealing specifics
- Threat Assessment Sheets that aggregate indicators across multiple days

**Consequences if Missed:**

- Full campaign success leads to maximum-severity breach
- Extended recovery time (campaign compromise is deeper than single-vector attack)
- Narrative consequences: the faction responsible gains power in the story

---

## 5. Breach Simulation System

The Breach Simulation System handles the most dramatic moment in the game: what happens when defenses fail. This system must be devastating enough to teach the real-world consequences of security failures while remaining recoverable enough to keep the game playable.

### 5.1 Incident and Breach Trigger Conditions

An incident or breach is triggered when any of the following conditions are met. Severity 1-2 outcomes are contained incidents (no ransom lockout). Successful breaches begin at Severity 3 and always trigger the full-screen ransom note and operations lockout (per BRD FR-GAME-015).

**Currency Context:** Trust Score (TS) operates on a 0-500+ scale as a reputation gate (BRD Section 11.4). All TS penalties in this section are deducted from the player's current Trust Score. Credits (CR) are the operational currency for ransom calculations. Intel Fragments (IF) are awarded for successful detection and incident investigation.

| Trigger                         | Description                                           | Severity                                  |
| ------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Accepted phishing email         | Player approved a malicious access request            | Variable (based on attack sophistication) |
| Undetected supply chain malware | Dormant malware in accepted data activates            | High                                      |
| Successful credential harvest   | Attacker uses stolen credentials to gain access       | Medium-High                               |
| Brute force success             | Automated attack succeeds against weak authentication | Medium                                    |
| Insider compromise              | Compromised client exfiltrates data                   | High                                      |
| Campaign objective achieved     | APT campaign reaches Actions on Objective phase       | Critical                                  |
| Zero-day tool exploit           | Unpatched security tool vulnerability exploited       | High                                      |
| DDoS + secondary attack         | DDoS distracts while real attack succeeds             | High                                      |

### 5.2 Incident and Breach Severity Levels

Not all security failures are equal. Severity determines the scope of consequences, with breaches starting at Severity 3.

#### 5.2.1 Minor Incident (Severity 1, Non-Breach)

**Trigger:** Low-sophistication attack attempt is detected and contained before ransomware lockout or data exfiltration.

**Consequences:**

- Trust Score: -5 to -10
- Client attrition: 0-5% (random low-value clients may leave)
- Revenue impact: 1-day revenue depression (10% reduction)
- Recovery time: Immediate (no lockout; operations remain online)
- No ransom note (incident contained; not a breach)
- Incident Log entry generated

**Narrative:** Morpheus notes the incident. "We caught it fast, but the fact it got through at all is a concern. Review what happened."

---

#### 5.2.2 Major Incident (Severity 2, Non-Breach)

**Trigger:** Medium-sophistication attack is contained after limited compromise, or supply chain malware activates but is contained before ransomware lockout.

**Consequences:**

- Trust Score: -15 to -30
- Client attrition: 10-20%
- Revenue impact: 7-day revenue depression (25% reduction)
- Recovery time: 1-3 days (operations continue but degraded; no lockout)
- No ransom note (incident contained; close call warning)
- Incident Log entry with detailed timeline
- One security tool may be temporarily disabled

**Narrative:** "We've been hit. Systems are compromised. I need you to contain this NOW."

---

#### 5.2.3 Critical Breach (Severity 3)

**Trigger:** High-sophistication attack succeeds, APT campaign achieves objectives, or coordinated multi-vector attack succeeds.

**Consequences:**

- Full-screen ransom note sequence (see Section 5.3)
- Ransom calculation: `ceil(totalLifetimeEarnings / 10)`, minimum 1 CR
- Trust Score: -30 to -60
- Client attrition: 10-40% (per BRD FR-GAME-017)
- Revenue impact: 30-day revenue depression (50% reduction)
- Recovery time: 1-7 days based on security tooling
- All operations locked until ransom resolved

**Narrative:** Full ransom note sequence. See below.

---

#### 5.2.4 Total Compromise (Severity 4)

**Trigger:** Only at SEVERE threat level. Campaign-ending event where the data center is completely overrun.

**Consequences:**

- Same as Critical Breach, plus:
- If player cannot pay ransom: **Game Over**
- If player pays: Operations resume; all security tools require re-verification; client attrition 30-40% (per Appendix B.3)
- Narrative: Season-ending event with significant story consequences

---

### 5.3 Full-Screen Ransom Note Sequence

The ransom note is the game's most impactful UI moment. It must feel like a real ransomware lockscreen: terrifying, urgent, and inescapable.

#### 5.3.1 UI Flow

```
PHASE 1: SCREEN CORRUPTION (2-3 seconds)
├── Current game UI begins glitching
├── Terminal text scrambles
├── CRT static intensifies
├── Audio: digital corruption sound, rising pitch
└── All interactive elements become unresponsive

PHASE 2: BLACKOUT (1 second)
├── Screen goes completely black
├── Audio: silence (0.5s), then heavy bass impact
└── Player cannot interact

PHASE 3: RANSOM NOTE FADE-IN (3-4 seconds)
├── Red-tinted terminal screen fades in
├── ASCII art skull or lock icon renders line-by-line
├── Ransom message types out character by character (typewriter effect)
├── Audio: ominous low drone, keyboard typing sounds
└── Ransom amount displays with emphasis animation

PHASE 4: PLAYER OPTIONS (no time limit)
├── Two buttons appear after full message renders:
│   ├── [PAY RANSOM: X CR] (enabled if player has sufficient funds)
│   └── [CANNOT PAY] (always available)
├── Countdown timer displays (narrative tension only -- no actual time limit)
├── Additional context available: "View Incident Details"
└── Player decides at their own pace (accessibility: no forced time pressure)

ACCESSIBILITY (per BRD Section 7.5):
├── All CRT effects (static, glitch, scanlines) are CSS overlays on a clean base -- disableable without functional loss
├── `prefers-reduced-motion` respected: skip Phases 1-2 animation, display ransom note immediately
├── Screen reader support: ransom note content delivered via ARIA live region
├── Minimum 4.5:1 contrast ratio maintained on ransom note text
└── No forced time limits on player decision (queue pressure, not per-item timers)
```

#### 5.3.2 Ransom Note Content Template

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║    ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ║
║    ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗  ║
║    ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔██╗ ║
║    ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╗║
║    ███████║   ██║   ███████║   ██║   ███████╗██║ ╚██║║
║    ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═║
║              YOUR SYSTEMS ARE ENCRYPTED               ║
║                                                       ║
║  All data center operations have been locked.         ║
║  Client data is encrypted and inaccessible.           ║
║                                                       ║
║  To restore operations, transfer:                     ║
║                                                       ║
║              ██  {RANSOM_AMOUNT} CR  ██               ║
║                                                       ║
║  Your facility earnings to date: {LIFETIME_EARNINGS}  ║
║  Ransom calculated: {LIFETIME_EARNINGS} / 10          ║
║                                                       ║
║  Failure to pay will result in permanent data loss    ║
║  and operational shutdown.                            ║
║                                                       ║
║  ┌──────────────────┐  ┌───────────────────┐         ║
║  │  [PAY: {X} CR]   │  │  [CANNOT PAY]     │         ║
║  └──────────────────┘  └───────────────────┘         ║
╚══════════════════════════════════════════════════════╝
```

#### 5.3.3 Ransom Calculation

```
ransomAmount = Math.max(1, Math.ceil(totalLifetimeEarnings / 10))
```

- `totalLifetimeEarnings`: Sum of all Credits earned since game start (not current balance -- lifetime total)
- Division by 10: Ransom is always 10% of lifetime earnings
- Rounded up: Always rounds to next whole Credit
- Minimum 1 CR: Even a brand-new player faces a minimum ransom
- This means players who have spent heavily on upgrades may not have enough Credits on hand to pay, even though their lifetime earnings are high

### 5.4 Payment Decision Tree

```
                    ┌─────────────────┐
                    │  RANSOM NOTE    │
                    │  DISPLAYED      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  Can player     │
                    │  afford ransom? │
                    └────────┬────────┘
                        ┌────┴────┐
                       YES        NO
                        │          │
                        ▼          ▼
              ┌─────────────┐ ┌──────────────┐
              │ PAY RANSOM  │ │ CANNOT PAY   │
              └──────┬──────┘ └──────┬───────┘
                     │               │
                     ▼               ▼
              ┌─────────────┐ ┌──────────────┐
              │ Deduct CR   │ │ GAME OVER    │
              │ Apply post- │ │ Show final   │
              │ breach      │ │ statistics   │
              │ penalties   │ │ Offer replay │
              └──────┬──────┘ │ or new game  │
                     │        └──────────────┘
                     ▼
              ┌─────────────┐
              │ RECOVERY    │
              │ SEQUENCE    │
              │ (1-7 days)  │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │ POST-BREACH │
              │ EFFECTS     │
              │ (30 days)   │
              └─────────────┘
```

### 5.5 Recovery Sequence

After paying the ransom, the player enters a recovery phase. Recovery duration scales inversely with the player's security infrastructure:

#### 5.5.1 Recovery Time Calculation

```
baseRecoveryDays = 7

reductions:
  - hasBackupSystem:    -2 days
  - hasIncidentResponse: -1 day
  - hasSIEM:            -1 day
  - hasEDR:             -1 day
  - staffSecurityLevel > 3: -1 day

recoveryDays = max(1, baseRecoveryDays - totalReductions)
```

| Security Tooling Level   | Recovery Time |
| ------------------------ | ------------- |
| No security tools        | 7 days        |
| Basic tools (1-2)        | 5-6 days      |
| Moderate tools (3-4)     | 3-4 days      |
| Comprehensive tools (5+) | 1-2 days      |

#### 5.5.2 Recovery Timeline Events

| Day   | Event                                                            |
| ----- | ---------------------------------------------------------------- |
| Day 1 | "Systems assessment underway. Cataloging affected assets."       |
| Day 2 | "Malware identified and isolated. Beginning eradication."        |
| Day 3 | "Core systems restored. Verifying data integrity."               |
| Day 4 | "Client data verification in progress. Some data unrecoverable." |
| Day 5 | "Security patches applied. Hardening entry points."              |
| Day 6 | "Monitoring systems restored. Enhanced surveillance active."     |
| Day 7 | "Full operations restored. Post-incident review initiated."      |

During recovery, the player can perform limited actions (review Incident Log, read Intelligence Briefs, plan upgrades) but cannot process new access requests or accept clients.

### 5.6 Post-Breach Effects

After recovery, lasting effects persist for 30 game days:

| Effect                     | Duration                   | Magnitude                                              |
| -------------------------- | -------------------------- | ------------------------------------------------------ |
| Trust Score penalty        | Permanent (does not decay) | -30 to -60 based on severity                           |
| Client attrition           | Immediate                  | 10-40% of clients leave                                |
| Revenue depression         | 30 game days               | Revenue per client reduced 25-50%                      |
| Increased scrutiny         | 14 game days               | Some clients request security audits before renewing   |
| Reputation impact          | 30 game days               | New high-value clients less likely to apply            |
| Threat level de-escalation | 2-3 game days              | Temporary breathing room                               |
| Intelligence opportunity   | Permanent                  | Incident data reveals attacker TTPs for future defense |

---

## 6. Incident Response System

The Incident Response System provides the player's defensive toolkit for detecting, classifying, containing, and recovering from security incidents. It maps directly to the NIST SP 800-61 Incident Response Lifecycle: Preparation, Detection & Analysis, Containment/Eradication/Recovery, and Post-Incident Activity.

### 6.1 Incident Detection

Security tools purchased by the player surface threats through multiple channels:

| Detection Source      | Alert Type               | Triggered By                                             |
| --------------------- | ------------------------ | -------------------------------------------------------- |
| Email Analysis Engine | Suspicious email flagged | Pattern matching against known indicators                |
| IDS/IPS               | Network anomaly alert    | Unusual traffic patterns, known attack signatures        |
| SIEM                  | Correlated event alert   | Multiple low-severity events forming a pattern           |
| EDR                   | Endpoint behavior alert  | Anomalous process execution on facility systems          |
| WAF                   | Web attack alert         | Malicious requests against facility web interfaces       |
| Threat Intel Feed     | Preemptive warning       | Known threat actor campaign targeting similar facilities |
| Honeypot              | Deception trigger        | Attacker interacts with decoy systems                    |
| AI Anomaly Detection  | Behavioral alert         | Statistical deviation from baseline behavior             |
| Manual Detection      | Player observation       | Player notices something suspicious during gameplay      |

**Alert Fidelity:** Each tool has a true positive rate and a false positive rate (see Section 8). More alerts are not always better -- alert fatigue is a real mechanic that the player must manage.

### 6.2 Incident Log Mechanics

When an incident is detected (either by tools or by the player), it enters the Incident Log:

**Incident Log Entry Fields:**

| Field            | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| Incident ID      | Auto-generated unique identifier                                       |
| Timestamp        | Game day and time of detection                                         |
| Detection Source | Which tool or observation triggered the incident                       |
| Classification   | Attack category (phishing, supply chain, insider, infrastructure, APT) |
| Severity         | 1 (Low) to 4 (Critical)                                                |
| Affected Assets  | Which clients, systems, or data are at risk                            |
| Evidence         | Collected indicators: email headers, log entries, traffic data         |
| Status           | Open / Investigating / Contained / Eradicated / Recovered / Closed     |
| Timeline         | Chronological record of all actions taken                              |
| Response Actions | Player's chosen response actions                                       |
| Outcome          | Resolution details and lessons learned                                 |

### 6.3 Response Options per Incident Type

| Incident Type                           | Available Responses                                                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phishing (detected before approval)** | Deny email, Add sender to blacklist, Report indicators to threat intel, Flag for investigation                                                |
| **Phishing (detected after approval)**  | Revoke access, Quarantine client data, Initiate forensic scan, Notify affected parties                                                        |
| **Supply Chain Compromise**             | Isolate affected data segment, Run integrity scan on all client data, Revoke compromised client access, Deploy additional monitoring          |
| **Insider Threat**                      | Restrict client to read-only access, Deploy honeytokens in client's data segment, Initiate behavioral monitoring, Revoke access and blacklist |
| **DDoS**                                | Activate mitigation tools, Implement rate limiting, Re-allocate bandwidth priority, Sacrifice low-priority services                           |
| **Brute Force**                         | Enable account lockout, Deploy MFA requirement, Block attacking IP ranges, Increase monitoring                                                |
| **APT Campaign**                        | Correlate all related events, Brief Morpheus on campaign scope, Deploy comprehensive containment, Prepare for follow-on attacks               |
| **Zero-Day Exploit**                    | Patch affected tool (causes downtime), Deploy compensating controls, Increase manual monitoring, Accept risk until patch available            |

### 6.4 Containment, Eradication, Recovery Phases

Each incident progresses through NIST-aligned phases:

**Containment (Immediate):**

- Isolate affected systems (player action: click to isolate segment)
- Block attack vector (player action: update blacklist, firewall rules)
- Preserve evidence (automatic if SIEM is deployed)
- Time-critical: faster containment = less damage

**Eradication (Short-term):**

- Remove malware or malicious access (automated if EDR deployed, manual otherwise)
- Patch exploited vulnerability (requires upgrade proposal if tool update needed)
- Verify that no attacker persistence mechanisms remain
- Duration: 1-3 game hours (in-game time)

**Recovery (Medium-term):**

- Restore affected services to normal operation
- Verify data integrity (automatic with backup systems)
- Monitor for recurrence (enhanced monitoring for 7 game days)
- Communicate status to affected clients

### 6.5 Post-Incident Review ("Lessons Learned")

After every incident is closed, a Post-Incident Review screen appears:

**Review Components:**

1. **Timeline Replay:** Step-by-step walkthrough of the incident with timestamps
2. **Detection Analysis:** How was the incident detected? How long did it take? Could it have been detected earlier?
3. **Response Evaluation:** Were the player's response actions optimal? What alternatives existed?
4. **Root Cause:** What was the fundamental vulnerability that was exploited?
5. **Recommendations:** Specific upgrades, policy changes, or behaviors that would prevent recurrence
6. **Security Skill Impact:** Which of the seven security competency domains (per BRD FR-AN-004: phishing detection, password security, data handling, social engineering resistance, incident response, physical security, compliance awareness) were tested? How did the player perform?

**Stealth Learning Integration:** The post-incident review is the game's most explicit teaching moment, but it is framed as operational debriefing, not as a lesson. The player is a security professional reviewing their own performance, not a student receiving a grade.

**Enterprise Adaptive Learning:** Per BRD Section 11.6, the adaptive learning engine maintains a competency model across all seven domains. The Threat Engine uses competency gaps identified by this model to select attack vectors that target the player's weakest domains. Enterprise administrators can set minimum competency thresholds per domain; when a learner falls below a threshold, the Threat Engine prioritizes attacks in that domain to trigger mandatory remediation through gameplay.

**Just-in-Time Training Integration (Enterprise):** Per BRD FR-ENT-019, breach events and failed detections in the Threat Engine generate JIT training triggers. When a player fails to detect a phishing attack or clicks a simulated malicious link, the system delivers a targeted training intervention within 60 seconds. JIT training is throttled to a maximum of 2 interventions per week per learner (FR-ENT-020).

---

## 7. Multi-Day Attack Campaigns

Multi-day campaigns are the Threat Engine's most complex productions -- extended operations with interconnected phases, narrative arcs, and meaningful player decision points. They transform individual attack events into coherent adversary operations that mirror real-world APT campaigns.

**Multiplayer Difficulty Tiers:** Per BRD FR-MP-004, cooperative campaigns support four difficulty tiers: Training, Standard, Hardened, and Nightmare. The Threat Engine scales campaign parameters (attack frequency, sophistication ceiling, concurrent incidents, and campaign phase duration) based on the selected tier. Training reduces all attack parameters by 50%; Standard uses baseline values; Hardened increases sophistication by +1 and attack frequency by 50%; Nightmare uses maximum sophistication with 2x attack frequency and removes breathing room cooldowns.

### 7.1 Campaign Data Model

```
Campaign {
  id: string
  name: string                          // "Operation Cascade"
  faction: FactionId                    // Which faction is behind this
  phases: Phase[]                       // Ordered array of campaign phases
  currentPhaseIndex: number             // Which phase is active
  status: 'dormant' | 'active' | 'succeeded' | 'defeated' | 'abandoned'
  narrativeArc: NarrativeArc            // Story beats tied to campaign progression
  triggerConditions: TriggerCondition[]  // What starts this campaign
  successConditions: SuccessCondition[] // What counts as campaign success for the attacker
  defeatConditions: DefeatCondition[]   // What counts as player victory
  abandonConditions: AbandonCondition[] // What makes the attacker give up
  playerChoiceEffects: Map<string, Effect[]>  // How player decisions modify the campaign
}

Phase {
  id: string
  name: string                          // "Reconnaissance", "Initial Compromise"
  duration: { min: number, max: number } // Game days this phase lasts
  requiredVector: AttackVector | null    // Force specific attack type, or null for any
  attackCount: { min: number, max: number }
  sophistication: number                // 1-5
  objectives: string[]                  // What the attacker is trying to achieve
  successCriteria: Condition[]          // What advances to next phase
  failureCriteria: Condition[]          // What blocks this phase
  narrativeEvents: NarrativeEvent[]     // Story beats during this phase
  intelligenceBriefHints: string[]      // What the player sees in Intel Briefs
}
```

### 7.2 Campaign Interaction with Narrative

Each campaign is a story arc within the season narrative:

| Campaign Element          | Narrative Delivery                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Campaign start            | Intelligence Brief: "We've detected coordinated scanning activity consistent with [Faction]'s known tactics." |
| Phase transition          | Intelligence Brief with updated threat assessment. Morpheus commentary.                                       |
| Player detects campaign   | Morpheus: "I think these attacks are connected. Look at the pattern." Achievement unlock possibility.         |
| Campaign escalation       | Narrative tension increases. Client NPCs express concern. Ambient threat indicators rise.                     |
| Campaign defeated         | Morpheus commendation. Faction reputation impact. Intelligence Brief post-mortem. Breathing room.             |
| Campaign success (breach) | Full breach sequence with campaign-specific narrative. Faction gains power in story.                          |

### 7.3 Player Choices Affecting Campaign Progression

Player decisions during a campaign can accelerate, slow, redirect, or terminate the campaign:

| Player Action                                            | Campaign Effect                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Detect and block Phase 1 attacks                         | Campaign may be abandoned (if attacker assesses target is too difficult) |
| Ignore Phase 1 information gathering                     | Phase 2 attacks are more targeted (+1 difficulty)                        |
| Accept a client who is a campaign asset                  | Campaign advances directly to Phase 3                                    |
| Read Intelligence Briefs about campaign                  | Player gains detection bonuses against campaign attacks                  |
| Deploy honeypot during campaign                          | Attacker reveals TTPs, reducing Phase 3+ difficulty by 1                 |
| Share intelligence with other data centers (multiplayer) | Campaign difficulty reduced for all players                              |

### 7.4 Campaign Examples

#### 7.4.1 "Cascade Failure" (Supply Chain Campaign)

**Faction:** Nexion Industries (corporate espionage)
**Season:** 2 (Supply Lines)
**Duration:** 5-8 game days

| Phase                        | Day | Description                                                                                                                                                             | Attack Vector                     |
| ---------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1: Reconnaissance            | 1-2 | Nexion sends seemingly legitimate business inquiries about data center services. Emails gather intelligence about security posture, client base, and backup procedures. | Pretexting (T1598)                |
| 2: Establish Trust           | 3-4 | A new "client" (Nexion front company) applies for legitimate data storage. Application passes verification if player is not suspicious of timing.                       | Trusted Relationship (T1199)      |
| 3: Payload Delivery          | 4-5 | The front company submits "backup data" containing dormant malware. Malware is designed to spread to adjacent data segments.                                            | Supply Chain (T1195)              |
| 4: Activation                | 6-7 | Malware activates. Begins exfiltrating data from high-value clients to Nexion. If undetected, escalates to full ransomware deployment.                                  | Data Encrypted for Impact (T1486) |
| 5: Extraction or Destruction | 7-8 | If player detects and contains: Nexion abandons operation. If undetected: full data exfiltration followed by ransomware to cover tracks.                                | Financial Theft (T1657)           |

**Defeat Conditions:** Player denies the front company access, or detects malware before Phase 4 activation.
**Abandon Conditions:** Player blocks 3+ Phase 1 reconnaissance emails.

---

#### 7.4.2 "Bandwidth Siege" (DDoS Campaign)

**Faction:** Hacktivist Collective
**Season:** 3 (Dark Channels)
**Duration:** 3-5 game days

| Phase           | Day | Description                                                                                                                                                       | Attack Vector                             |
| --------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1: Warning Shot | 1   | Brief bandwidth spike. Hacktivist manifesto email declaring intent. "Your data center serves the corrupt. We will free the data."                                 | DDoS (T1498) + Phishing (T1566)           |
| 2: Escalation   | 2-3 | Sustained DDoS reducing bandwidth to 50%. Simultaneous phishing campaign exploiting the chaos. Clients complain about service degradation.                        | DDoS (T1498) + Spear Phishing (T1566.002) |
| 3: Full Siege   | 3-4 | Maximum DDoS intensity. Bandwidth at 10-20%. Player must choose which clients to prioritize. Meanwhile, a sophisticated targeted attack arrives amidst the noise. | DDoS (T1498) + APT delivery (T1195)       |
| 4: Resolution   | 4-5 | DDoS subsides. But if the targeted attack in Phase 3 succeeded, a breach is imminent.                                                                             | Varies                                    |

**Defeat Conditions:** Player mitigates DDoS (has mitigation tools), identifies the real attack in Phase 3, and blocks it.
**Abandon Conditions:** Player has DDoS mitigation and blocks all phishing in Phase 2.

---

#### 7.4.3 "The Insider" (Anomaly Detection Campaign)

**Faction:** Criminal Network
**Season:** 4 (The Inside Job)
**Duration:** 7-10 game days

| Phase          | Day  | Description                                                                                                                                     | Attack Vector                |
| -------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1: Recruitment | 1-3  | An existing trusted client's communication style subtly changes. Requests become slightly unusual. The client has been compromised (or bribed). | Valid Accounts (T1078)       |
| 2: Testing     | 4-5  | Compromised client begins small access scope violations. Accessing logs they normally wouldn't. Requesting data from other segments.            | Account Manipulation (T1098) |
| 3: Escalation  | 6-7  | Full insider operation. Client attempts to exfiltrate high-value data from other clients' segments. Increased volume and boldness.              | Data from Info Repos (T1213) |
| 4: Extraction  | 8-10 | Attempts to smuggle data out disguised as normal data retrievals. If successful, data is sold on dark web.                                      | Exfiltration (TA0010)        |

**Defeat Conditions:** Player detects anomalous behavior before Phase 3, revokes access, and blacklists the client.
**Abandon Conditions:** Player deploys advanced behavioral analytics that immediately flag Phase 1 anomalies.

---

#### 7.4.4 "Data Exodus" (Distributed Data Protection Campaign)

**Faction:** The Sovereign Compact + Nexion Industries (coordinated)
**Season:** Cross-season (referenced in BRD FR-MP-003 as cooperative scenario)
**Duration:** 5-7 game days

**Overview:** Multiple factions simultaneously attempt to extract or destroy data across distributed storage segments. In cooperative multiplayer mode, this becomes a shared defense operation where interconnected data centers must coordinate to protect distributed data.

| Phase                 | Day | Description                                                                                                                                                                                      | Attack Vector                                                                        |
| --------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1: Probing            | 1-2 | Multiple factions submit concurrent access requests targeting different data segments across the facility network. Intelligence Briefs suggest coordinated activity.                             | Reconnaissance (TA0043) + Pretexting (T1598)                                         |
| 2: Fragmented Assault | 3-4 | Simultaneous targeted attacks from different factions against separate data segments. Each individual attack is moderate difficulty, but the volume overwhelms single-player detection capacity. | Multi-vector: Phishing (T1566) + Supply Chain (T1195) + Trusted Relationship (T1199) |
| 3: Data Race          | 5-6 | Factions race to exfiltrate target data before the player can secure all segments. Priority calls required -- which data to protect first?                                                       | Exfiltration (TA0010) + Collection (TA0009)                                          |
| 4: Aftermath          | 6-7 | Surviving factions regroup. Any successfully exfiltrated data affects the narrative balance of power between factions.                                                                           | Varies                                                                               |

**Defeat Conditions:** Player (or cooperative team) successfully defends all critical data segments and blocks exfiltration attempts.
**Abandon Conditions:** Factions assess coordinated defense is too strong and retreat to individual operations.

**Multiplayer Note:** Per BRD FR-MP-003, Data Exodus is designed as a cooperative scenario for 2-6 players with interconnected data centers facing the shared threat campaign. In single-player mode, the campaign scope is reduced to the player's facility only.

---

## 8. Security Tool Effectiveness Model

Security tools are the player's primary investment for automated defense. Each tool provides detection coverage against specific attack types, but with important limitations: diminishing returns when stacking tools, degradation over time requiring maintenance, and false positive generation that creates alert fatigue.

**Upgrade-Driven Threat Expansion (BRD FR-GAME-013):** Every infrastructure upgrade and security tool purchase introduces new threat vectors, mirroring real-world vulnerability surfaces. When a player purchases a new security tool, the Threat Engine unlocks attack vectors that specifically target that tool (e.g., purchasing a SIEM unlocks SIEM-evasion attacks; purchasing a WAF unlocks WAF bypass techniques). This ensures that growth in defensive capability always accompanies growth in attack surface, modeling the real-world principle that complexity creates vulnerability.

### 8.1 Detection Probability Matrix

**Design Note (IDS/IPS):** BRD FR-GAME-011 lists IDS and IPS as separate purchasable tools. This design document combines them into a single "IDS/IPS" tool for gameplay simplification, reflecting the real-world convergence where most commercial products (e.g., Snort, Suricata) offer both functions as a unified system. If playtesting or stakeholder review indicates that separating IDS (passive detection) and IPS (active prevention) into distinct purchases would provide meaningful pedagogical value, this decision should be revisited.

Base detection probability per tool per attack category (before modifiers):

| Tool                     | Phishing | Spear Phish | BEC  | Supply Chain | Insider | DDoS | Brute Force | APT  | Zero-Day |
| ------------------------ | -------- | ----------- | ---- | ------------ | ------- | ---- | ----------- | ---- | -------- |
| **Firewall**             | 0.10     | 0.05        | 0.00 | 0.05         | 0.00    | 0.30 | 0.40        | 0.05 | 0.00     |
| **IDS/IPS**              | 0.20     | 0.15        | 0.05 | 0.15         | 0.10    | 0.50 | 0.60        | 0.15 | 0.05     |
| **SIEM**                 | 0.30     | 0.25        | 0.15 | 0.25         | 0.30    | 0.20 | 0.30        | 0.35 | 0.10     |
| **EDR**                  | 0.15     | 0.10        | 0.05 | 0.40         | 0.20    | 0.05 | 0.10        | 0.25 | 0.15     |
| **WAF**                  | 0.25     | 0.20        | 0.10 | 0.10         | 0.05    | 0.40 | 0.50        | 0.10 | 0.05     |
| **Threat Intel Feed**    | 0.35     | 0.30        | 0.20 | 0.30         | 0.15    | 0.25 | 0.20        | 0.40 | 0.20     |
| **Honeypot**             | 0.05     | 0.10        | 0.05 | 0.15         | 0.35    | 0.05 | 0.15        | 0.30 | 0.25     |
| **AI Anomaly Detection** | 0.25     | 0.30        | 0.25 | 0.35         | 0.45    | 0.15 | 0.25        | 0.40 | 0.30     |
| **Zero-Trust Gateway**   | 0.20     | 0.15        | 0.10 | 0.20         | 0.25    | 0.10 | 0.45        | 0.20 | 0.10     |
| **SOAR**                 | 0.10     | 0.10        | 0.10 | 0.15         | 0.15    | 0.20 | 0.20        | 0.20 | 0.10     |

**Note:** SOAR does not detect attacks directly but improves response time and coordination. Its "detection" values represent its ability to correlate events from other tools.

### 8.2 Tool Stacking and Diminishing Returns

When multiple tools cover the same attack category, combined detection probability uses the complementary probability formula with a diminishing returns modifier:

```
P(detect) = 1 - (1 - p1)(1 - p2)(1 - p3)... * diminishingFactor

diminishingFactor = 1.0 - (0.05 * (numberOfTools - 1))
// Each additional tool beyond the first reduces effective combination by 5%
```

**Example:** Three tools with individual detection of 0.30, 0.25, 0.20 against phishing:

```
Raw combined: 1 - (0.70 * 0.75 * 0.80) = 1 - 0.42 = 0.58
Diminishing factor: 1.0 - (0.05 * 2) = 0.90
Effective: 0.58 * 0.90 = 0.522
```

This ensures that stacking many tools yields diminishing benefits, encouraging strategic tool selection over brute-force purchasing.

### 8.3 Tool Degradation Over Time

Security tools degrade without maintenance, modeling real-world signature staleness and software decay:

```
effectiveProbability = baseProbability * maintenanceLevel

maintenanceLevel starts at 1.0
maintenanceLevel decreases by 0.02 per game day without update
minimum maintenanceLevel = 0.3 (tool still functions but poorly)

Update cost: 10% of original tool purchase price per update
Update restores maintenanceLevel to 1.0
```

**Narrative Justification:** "Your IDS signatures are 14 days old. New threat variants may bypass detection." / "SIEM correlation rules need updating -- false positive rate is climbing."

### 8.4 False Positive Generation

Every security tool generates false positives that the player must evaluate, creating the real-world phenomenon of alert fatigue:

| Tool                 | False Positive Rate (alerts/day) | Description                                                                |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| Firewall             | 0.5                              | Blocked legitimate traffic, flagged benign connections                     |
| IDS/IPS              | 1.5                              | Signature matches on legitimate activity                                   |
| SIEM                 | 1.0                              | Correlated events that appear suspicious but are benign                    |
| EDR                  | 0.8                              | Legitimate processes flagged as anomalous                                  |
| WAF                  | 1.2                              | Legitimate web requests matching attack patterns                           |
| Threat Intel Feed    | 0.3                              | Stale or overly broad indicators matching legitimate entities              |
| Honeypot             | 0.2                              | Very low (honeypots have few false positives by design)                    |
| AI Anomaly Detection | 2.0                              | Highest false positive rate (statistical anomalies are not always threats) |
| Zero-Trust Gateway   | 0.7                              | Legitimate access requests from unusual patterns                           |
| SOAR                 | 0.4                              | Automated response triggers on false positives from other tools            |

**Alert Fatigue Mechanic:** If total daily false positive alerts exceed 5, the player's detection interface becomes cluttered with notifications. Players who ignore alerts (failing to dismiss or investigate them) receive a small Trust Score penalty, modeling the real-world consequence of unmanaged alert fatigue.

---

## 9. Faction Threat Profiles

Five factions serve as the game's threat actors, each with distinct motivations, preferred attack methods, sophistication levels, and narrative roles. The faction system ensures that attacks feel purposeful and connected rather than random.

**Faction Reputation Axes (per BRD Section 11.3):** The Threat Engine interacts with the Reputation System, which tracks the player's standing with each of the five factions on independent reputation axes. Player decisions (approving/denying faction requests, defeating faction campaigns, cooperating with factions) shift reputation values. Threshold-triggered events fire when reputation crosses defined boundaries -- for example, a faction whose reputation drops below a hostile threshold may launch targeted campaigns, while a faction above an allied threshold may provide intelligence or cease attacks.

### 9.1 The Sovereign Compact (State-Sponsored Threats)

**Motivation:** Control of information. Governments want to ensure that data preserved by Matrices GmbH aligns with their narrative. They want access to monitor, censor, and if necessary, destroy inconvenient data.

**Threat Actor Profile:**

| Attribute         | Value                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| Sophistication    | 5/5 (highest)                                                              |
| Resources         | Unlimited (state-backed)                                                   |
| Patience          | Very high (willing to run multi-week campaigns)                            |
| Preferred Vectors | APT campaigns, zero-day exploits, insider recruitment, diplomatic pressure |
| Attack Tempo      | Low frequency, extremely high quality                                      |
| MITRE Tactics     | Full kill chain -- Reconnaissance through Actions on Objectives            |

**Signature Attack Patterns:**

- Multi-phase APT campaigns spanning 10+ game days
- Recruitment or coercion of existing clients as insider assets
- Deployment of zero-day analogues against security tools
- Diplomatic cover: legitimate-appearing government requests that are actually intelligence operations
- Disinformation through compromised intelligence channels
- False flag operations designed to blame other factions

**Narrative Role:** The Sovereign Compact represents the tension between security and sovereignty. Their requests often appear legitimate because governments have genuine data preservation needs. But their true objectives may include surveillance, censorship, or sabotage of rival factions' data.

---

### 9.2 Nexion Industries (Corporate Espionage)

**Motivation:** Profit and competitive advantage. Nexion wants to access, copy, and monetize the data stored at Matrices GmbH. They will pay premium prices for legitimate access and steal what they cannot buy.

**Threat Actor Profile:**

| Attribute         | Value                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| Sophistication    | 4/5                                                                                  |
| Resources         | High (corporate budget)                                                              |
| Patience          | Moderate (quarterly earnings pressure drives timelines)                              |
| Preferred Vectors | Supply chain compromise, BEC, corporate espionage, trusted relationship exploitation |
| Attack Tempo      | Moderate frequency, high quality                                                     |
| MITRE Tactics     | Initial Access, Collection, Exfiltration                                             |

**Signature Attack Patterns:**

- Supply chain campaigns using front companies (see "Cascade Failure" campaign)
- BEC attacks impersonating Nexion executives or partners
- Competitive intelligence gathering disguised as legitimate business inquiries
- Hiring away staff NPCs (if available) for insider knowledge
- Economic pressure tactics: offering above-market rates for access, then exploiting the position

**Narrative Role:** Nexion represents the moral ambiguity of corporate power. They are not evil -- they provide genuine services and their data is worth preserving. But their pursuit of profit leads them to cross ethical lines, and the player must decide how much to trust a client whose motives are mixed.

---

### 9.3 The Librarians (Well-Intentioned but Risky)

**Motivation:** Preservation of all knowledge, regardless of classification, ownership, or political sensitivity. The Librarians believe data should be free and preserved universally.

**Threat Actor Profile:**

| Attribute         | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Sophistication    | 3/5                                                                                           |
| Resources         | Limited (volunteer-driven, crowdfunded)                                                       |
| Patience          | High (ideologically motivated, not deadline-driven)                                           |
| Preferred Vectors | Social engineering (appeals to shared values), unauthorized data copying, policy exploitation |
| Attack Tempo      | Infrequent but persistent                                                                     |
| MITRE Tactics     | Initial Access (social engineering), Collection, Exfiltration                                 |

**Signature Attack Patterns:**

- Emotionally manipulative access requests ("If you deny us, this knowledge dies forever")
- Attempts to copy data beyond contracted scope for "preservation"
- Exploiting whitelist exceptions and emergency access procedures
- Recruiting sympathetic staff NPCs through ideological appeal
- Submitting data that contains hidden requests for data from other clients

**Narrative Role:** The Librarians are the game's moral compass test. They are not malicious -- their goals align with the player's mission to preserve data. But their methods ignore security protocols, creating genuine risk. The player must decide whether noble intentions justify insecure behavior. There is no right answer.

---

### 9.4 Hacktivist Collectives (Ideological Attacks)

**Motivation:** Political and social disruption. They target what they perceive as unjust power structures, corrupt data, and information hoarding by elites.

**Threat Actor Profile:**

| Attribute         | Value                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| Sophistication    | 2-4/5 (highly variable -- ranges from script kiddies to elite hackers)      |
| Resources         | Low-moderate (volunteer-driven, but technically skilled)                    |
| Patience          | Low (reactive, driven by current events and outrage)                        |
| Preferred Vectors | DDoS, website defacement, phishing with ideological payload, public shaming |
| Attack Tempo      | High frequency, variable quality (swarm tactics)                            |
| MITRE Tactics     | Initial Access, Impact (DDoS, Defacement)                                   |

**Signature Attack Patterns:**

- DDoS campaigns preceded by public declarations (see "Bandwidth Siege" campaign)
- Phishing emails containing ideological manifestos alongside attack payloads
- Targeting specific clients they consider "corrupt" (government or corporate data)
- Social media pressure campaigns that affect the data center's reputation
- Opportunistic attacks during other factions' operations (pile-on strategy)

**Narrative Role:** Hacktivists force the player to confront questions of justice and fairness. When they target a government client known to store surveillance data, is the player defending the right to privacy or protecting a surveillance apparatus? Their attacks are disruptive but sometimes raise legitimate ethical concerns.

---

### 9.5 Criminal Networks (Profit-Motivated)

**Motivation:** Money. Ransomware deployment, data theft for sale, credential harvesting, and extortion.

**Threat Actor Profile:**

| Attribute         | Value                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Sophistication    | 3-4/5 (Ransomware-as-a-Service provides tools above their natural skill level)            |
| Resources         | Moderate (profit-funded, reinvested from previous operations)                             |
| Patience          | Low-moderate (ROI-driven; will abandon unprofitable targets)                              |
| Preferred Vectors | Ransomware, credential harvesting, insider recruitment via bribery, phishing-as-a-service |
| Attack Tempo      | High frequency, moderate quality                                                          |
| MITRE Tactics     | Initial Access, Execution, Impact (Ransomware), Financial Theft                           |

**Signature Attack Patterns:**

- Commodity phishing campaigns (high volume, moderate quality)
- Ransomware deployment as primary objective
- Credential harvesting for resale on dark markets
- Bribing or coercing staff NPCs for insider access (see "The Insider" campaign)
- Double extortion: threatening to publish stolen data if ransom is not paid
- Selling access to other factions when direct exploitation is unprofitable

**Narrative Role:** Criminal networks are the game's most straightforward antagonists. Their motivation is pure profit, making them predictable in goals but unpredictable in methods. They serve as the baseline threat that is always present, forcing the player to maintain defenses even during quiet periods.

### 9.6 Faction Interaction Matrix

Factions do not operate in isolation. Their relationships affect campaign coordination:

|                       | Sovereign Compact    | Nexion Industries                                      | The Librarians                                 | Hacktivists                                      | Criminal Networks                                           |
| --------------------- | -------------------- | ------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| **Sovereign Compact** | --                   | Uneasy alliance (share intelligence, compete for data) | Hostile (Librarians resist government control) | Hostile (hacktivists target governments)         | Occasionally buys criminal services for deniable operations |
| **Nexion Industries** | Uneasy alliance      | --                                                     | Dismissive (views Librarians as naive)         | Target (hacktivists attack corporations)         | Hires criminal networks for operations                      |
| **The Librarians**    | Hostile              | Wary (corporate data is still data worth preserving)   | --                                             | Sympathetic (share information-freedom ideology) | Neutral (different goals, no conflict)                      |
| **Hacktivists**       | Hostile              | Hostile                                                | Sympathetic                                    | --                                               | Occasionally cooperate for common targets                   |
| **Criminal Networks** | Mercenary (for hire) | Mercenary (for hire)                                   | Neutral                                        | Occasionally cooperate                           | -- (internal competition)                                   |

**Gameplay Impact:** At HIGH and SEVERE threat levels, faction cooperation can produce coordinated attacks that combine different factions' signature methods, creating compound threats that are harder to attribute and defend against.

### 9.7 PvP Mode: Human-Controlled Threat Actors

Per BRD FR-MP-005 through FR-MP-010, the competitive Red vs. Blue mode replaces the AI Threat Engine with human-controlled attackers. In this mode:

- **Red team players** use abstracted equivalents of real-world tools (Nmap, Metasploit, SET, Cobalt Strike per FR-MP-009) to plan and execute attacks against blue team data centers
- **Blue team players** use the same security tools defined in Section 8 (SIEM, EDR, sandboxing, forensics, honeypots per FR-MP-010)
- **Purple Team mode** (FR-MP-007) is a cooperative-competitive hybrid where players alternate between attack and defense roles within the same session, with the Threat Engine providing baseline environmental threats that both sides must account for
- The Threat Engine still governs NPC faction activity, environmental threats, and narrative events in PvP matches
- Ranked play uses Elo-based matchmaking with independent Red/Blue ranks (FR-MP-008)
- Asymmetric Assault mode (FR-MP-006) pits 1 skilled attacker vs. 3-5 defenders, with the Threat Engine scaling environmental pressure based on team size

---

## Appendix A: TypeScript Interfaces

Core data structures for the Threat Engine implementation:

```typescript
// ─── Threat Level System ─────────────────────────────────────

enum ThreatTier {
  LOW = 'LOW',
  GUARDED = 'GUARDED',
  ELEVATED = 'ELEVATED',
  HIGH = 'HIGH',
  SEVERE = 'SEVERE',
}

interface ThreatLevelState {
  currentTier: ThreatTier;
  threatScore: number; // 0.0 - 1.0
  dayEnteredCurrentTier: number;
  intensityGauge: number; // 0.0 - 1.0
  pacingPhase: 'build-up' | 'sustain' | 'peak' | 'relax';
  breathingRoomRemaining: number; // game days
}

interface ThreatScoreInputs {
  narrativeProgress: number; // 0.0 - 1.0
  playerCompetence: number; // 0.0 - 1.0
  facilityScale: number; // 0.0 - 1.0
  eventTriggers: boolean; // binary override
}

const THREAT_WEIGHTS = {
  narrative: 0.35,
  competence: 0.25,
  facility: 0.25,
  events: 0.15,
} as const;

const TIER_THRESHOLDS: Record<ThreatTier, { min: number; minDay: number }> = {
  [ThreatTier.LOW]: { min: 0.0, minDay: 1 },
  [ThreatTier.GUARDED]: { min: 0.2, minDay: 4 },
  [ThreatTier.ELEVATED]: { min: 0.4, minDay: 10 },
  [ThreatTier.HIGH]: { min: 0.6, minDay: 20 },
  [ThreatTier.SEVERE]: { min: 0.8, minDay: 30 },
};

const HYSTERESIS_BUFFER = 0.05;
const MIN_TIER_HOLD_DAYS = 2;

// ─── Player Profile ──────────────────────────────────────────

interface PlayerProfile {
  detectionRate: Record<AttackCategory, number>;
  falsePositiveRate: number;
  responseTime: Record<AttackCategory, number>;
  streakCorrect: number;
  streakIncorrect: number;
  verificationDepth: number;
  headerCheckRate: number;
  urlInspectionRate: number;
  crossReferenceRate: number;
  securityToolCoverage: number;
  toolMaintenanceLevel: number;
  financialReserve: number;
  capacityUtilization: number;
  riskAppetite: number;
  securityInvestmentRatio: number;
  intelligenceBriefEngagement: number;
  incidentResponseQuality: number;
  competenceScore: number; // derived composite 0.0 - 1.0
}

type AttackCategory =
  | 'phishing'
  | 'spearPhishing'
  | 'bec'
  | 'credentialHarvesting'
  | 'supplyChain'
  | 'insiderThreat'
  | 'ddos'
  | 'bruteForce'
  | 'apt'
  | 'zeroDay';

// ─── Attack System ───────────────────────────────────────────

interface AttackVector {
  id: string;
  category: AttackCategory;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  mitreAttackIds: string[]; // e.g., ['T1566', 'T1036']
  baseWeight: number; // base selection probability weight
  minThreatTier: ThreatTier; // minimum tier for this vector to appear
  factionAffinity: Record<FactionId, number>; // 0.0 - 1.0 per faction
  detectionMethods: DetectionMethod[];
  consequences: ConsequenceSet;
  narrativeTemplate: string;
}

interface DetectionMethod {
  toolId: SecurityToolId | 'manual';
  baseProbability: number;
  description: string;
}

interface ConsequenceSet {
  ifMissed: {
    breachSeverity: 0 | 1 | 2 | 3 | 4;
    trustScorePenalty: [number, number]; // [min, max]
    clientAttritionPercent: [number, number];
    revenuePenaltyDays: number;
    narrativeConsequence: string;
  };
  ifDetected: {
    trustScoreBonus: number;
    intelFragmentsAwarded: number;
    xpAwarded: number;
    narrativeConsequence: string;
  };
}

// ─── Campaign System ─────────────────────────────────────────

type CampaignStatus = 'dormant' | 'active' | 'succeeded' | 'defeated' | 'abandoned';

interface Campaign {
  id: string;
  name: string;
  faction: FactionId;
  phases: CampaignPhase[];
  currentPhaseIndex: number;
  status: CampaignStatus;
  startDay: number;
  narrativeArc: NarrativeArc;
  triggerConditions: TriggerCondition[];
  successConditions: Condition[];
  defeatConditions: Condition[];
  abandonConditions: Condition[];
  playerChoiceEffects: Map<string, CampaignEffect[]>;
}

interface CampaignPhase {
  id: string;
  name: string;
  durationRange: { min: number; max: number };
  requiredVector: AttackCategory | null;
  attackCountRange: { min: number; max: number };
  sophistication: 1 | 2 | 3 | 4 | 5;
  objectives: string[];
  successCriteria: Condition[];
  failureCriteria: Condition[];
  narrativeEvents: NarrativeEvent[];
  intelligenceHints: string[];
}

interface CampaignEffect {
  type: 'difficulty_modifier' | 'phase_skip' | 'phase_extend' | 'abandon' | 'escalate';
  value: number;
  description: string;
}

// ─── Breach System ───────────────────────────────────────────

type BreachSeverity = 1 | 2 | 3 | 4;

interface BreachEvent {
  id: string;
  trigger: AttackVector;
  severity: BreachSeverity;
  timestamp: number; // game day
  ransomAmount: number; // calculated: ceil(lifetimeEarnings / 10)
  playerCanPay: boolean;
  recoveryDays: number; // 1-7 based on tooling
  consequences: {
    trustScorePenalty: number;
    clientAttritionPercent: number;
    revenueDepressionDays: number;
    revenueDepressionMultiplier: number;
    threatLevelEffect: ThreatTier;
    narrativeImpact: string;
  };
}

interface BreachRecoveryState {
  isRecovering: boolean;
  recoveryDay: number; // current day of recovery (1-7)
  totalRecoveryDays: number;
  limitedActionsAvailable: string[];
  recoveryEvents: RecoveryEvent[];
}

interface RecoveryEvent {
  day: number;
  description: string;
  playerAction: string | null; // optional action player can take
}

// ─── Security Tools ──────────────────────────────────────────

type SecurityToolId =
  | 'firewall'
  | 'ids_ips'
  | 'siem'
  | 'edr'
  | 'waf'
  | 'threat_intel_feed'
  | 'honeypot'
  | 'ai_anomaly_detection'
  | 'zero_trust_gateway'
  | 'soar';

interface SecurityTool {
  id: SecurityToolId;
  name: string;
  purchaseCost: number;
  maintenanceCostPerDay: number;
  maintenanceLevel: number; // 0.3 - 1.0
  degradationRate: number; // per game day (default 0.02)
  updateCost: number; // 10% of purchase cost
  detectionMatrix: Record<AttackCategory, number>; // base probability
  falsePositiveRate: number; // alerts per day
  purchased: boolean;
  dayPurchased: number;
  lastUpdated: number; // game day
}

// ─── Incident Response ───────────────────────────────────────

type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'contained'
  | 'eradicated'
  | 'recovered'
  | 'closed';

interface Incident {
  id: string;
  timestamp: number;
  detectionSource: SecurityToolId | 'manual';
  classification: AttackCategory;
  severity: 1 | 2 | 3 | 4;
  affectedAssets: string[];
  evidence: EvidenceItem[];
  status: IncidentStatus;
  timeline: TimelineEntry[];
  responseActions: ResponseAction[];
  outcome: IncidentOutcome | null;
  postIncidentReview: PostIncidentReview | null;
}

interface EvidenceItem {
  type: 'email_header' | 'log_entry' | 'traffic_data' | 'file_hash' | 'behavioral_pattern';
  description: string;
  relevance: 'low' | 'medium' | 'high' | 'critical';
}

interface ResponseAction {
  id: string;
  name: string;
  description: string;
  phase: 'containment' | 'eradication' | 'recovery';
  effectivenessForCategory: Record<AttackCategory, number>;
  timeCost: number; // in-game hours
  resourceCost: number; // Credits
}

interface PostIncidentReview {
  timelineReplay: TimelineEntry[];
  detectionAnalysis: string;
  responseEvaluation: string;
  rootCause: string;
  recommendations: string[];
  securitySkillImpact: Record<string, number>;
}

// ─── Factions ────────────────────────────────────────────────

type FactionId =
  | 'sovereign_compact'
  | 'nexion_industries'
  | 'the_librarians'
  | 'hacktivist_collective'
  | 'criminal_network';

interface Faction {
  id: FactionId;
  name: string;
  sophistication: number; // 1-5
  patience: number; // 1-5
  resources: number; // 1-5
  preferredVectors: AttackCategory[];
  attackTempo: 'low' | 'moderate' | 'high';
  narrativeRole: string;
  relationships: Record<FactionId, 'allied' | 'neutral' | 'hostile' | 'mercenary'>;
  signaturePatterns: string[];
}

// ─── Director Layer ──────────────────────────────────────────

interface DirectorState {
  intensityGauge: number; // 0.0 - 1.0
  pacingPhase: 'build-up' | 'sustain' | 'peak' | 'relax';
  lastAttackDay: number;
  lastAttackVector: AttackCategory | null;
  breathingRoomActive: boolean;
  breathingRoomRemaining: number;
  activeCampaigns: Campaign[];
  pendingNarrativeEvents: NarrativeEvent[];
}

interface NarrativeEvent {
  id: string;
  type: 'intelligence_brief' | 'morpheus_message' | 'ambient' | 'client_reaction';
  content: string;
  triggerCondition: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}
```

---

## Appendix B: Probability Tables

### B.1 Attack Frequency by Threat Level and Game Day

| Game Day Range | LOW     | GUARDED | ELEVATED | HIGH    | SEVERE |
| -------------- | ------- | ------- | -------- | ------- | ------ |
| 1-5            | 0.5/day | 1/day   | --       | --      | --     |
| 6-10           | 0.5/day | 1.5/day | 2.5/day  | --      | --     |
| 11-15          | --      | 1.5/day | 3/day    | 4.5/day | --     |
| 16-20          | --      | --      | 3.5/day  | 5.5/day | --     |
| 21-25          | --      | --      | --       | 6/day   | 7/day  |
| 26-30          | --      | --      | --       | 6.5/day | 9/day  |
| 31+            | --      | --      | --       | --      | 10/day |

### B.2 Breach Probability by Attack Difficulty vs Player Competence

|                  | Competence 0.0-0.2 | 0.2-0.4 | 0.4-0.6 | 0.6-0.8 | 0.8-1.0 |
| ---------------- | ------------------ | ------- | ------- | ------- | ------- |
| **Difficulty 1** | 0.40               | 0.25    | 0.10    | 0.03    | 0.01    |
| **Difficulty 2** | 0.55               | 0.40    | 0.25    | 0.10    | 0.05    |
| **Difficulty 3** | 0.70               | 0.55    | 0.40    | 0.25    | 0.12    |
| **Difficulty 4** | 0.85               | 0.70    | 0.55    | 0.40    | 0.22    |
| **Difficulty 5** | 0.95               | 0.85    | 0.70    | 0.55    | 0.35    |

**Note:** These represent the probability that an attack succeeds _if the player fails to manually detect it and has no security tools covering that vector._ Security tools provide additional detection layers per Section 8.

### B.3 Client Attrition Rates by Breach Severity

| Severity     | Min Attrition | Max Attrition | Attrition Targeting                                     |
| ------------ | ------------- | ------------- | ------------------------------------------------------- |
| 1 (Minor)    | 0%            | 5%            | Random low-value clients                                |
| 2 (Major)    | 10%           | 20%           | Clients whose data was directly affected + random       |
| 3 (Critical) | 10%           | 40%           | All directly affected + 50% chance per remaining client |
| 4 (Total)    | 30%           | 40%           | All directly affected + 75% chance per remaining client |

### B.4 Revenue Depression Curve (Post-Breach)

Revenue multiplier over 30 game days following a Critical breach:

| Days Post-Breach | Revenue Multiplier             |
| ---------------- | ------------------------------ |
| 1-3              | 0.00 (recovery, no operations) |
| 4-7              | 0.25                           |
| 8-14             | 0.50                           |
| 15-21            | 0.70                           |
| 22-28            | 0.85                           |
| 29-30            | 0.95                           |
| 31+              | 1.00 (full recovery)           |

---

## Appendix C: MITRE ATT&CK Coverage Matrix

Complete mapping of in-game attack types to MITRE ATT&CK techniques:

### C.1 Tactics Coverage

| ATT&CK Tactic        | ID     | In-Game Coverage                                                                | Priority |
| -------------------- | ------ | ------------------------------------------------------------------------------- | -------- |
| Reconnaissance       | TA0043 | Pretexting emails, information-gathering pretexts                               | High     |
| Resource Development | TA0042 | Faction resource buildup (narrative only)                                       | Low      |
| Initial Access       | TA0001 | **Primary focus** -- all phishing variants, supply chain, trusted relationships | Critical |
| Execution            | TA0002 | Malware activation from accepted data                                           | High     |
| Persistence          | TA0003 | Account manipulation, new identity creation                                     | Medium   |
| Privilege Escalation | TA0004 | Scope creep by compromised clients                                              | Medium   |
| Defense Evasion      | TA0005 | Masquerading, impersonation, indicator removal                                  | High     |
| Credential Access    | TA0006 | Brute force, phishing for credentials, token theft                              | High     |
| Discovery            | TA0007 | Attacker reconnaissance of facility (narrative)                                 | Low      |
| Lateral Movement     | TA0008 | Supply chain malware spreading between data segments                            | Medium   |
| Collection           | TA0009 | Data exfiltration from compromised segments                                     | High     |
| Command and Control  | TA0011 | Malware C2 channels (narrative/background event)                                | Low      |
| Exfiltration         | TA0010 | Insider data theft, supply chain exfiltration                                   | High     |
| Impact               | TA0040 | **Primary focus** -- ransomware, data destruction, service disruption           | Critical |

### C.2 Technique Detail (Priority 1)

| Technique                      | ID        | In-Game Implementation           | Attack Category       |
| ------------------------------ | --------- | -------------------------------- | --------------------- |
| Phishing                       | T1566     | Core email triage mechanic       | Phishing              |
| Spearphishing Attachment       | T1566.001 | Malicious verification documents | Spear Phishing        |
| Spearphishing Link             | T1566.002 | URLs in access requests          | Credential Harvesting |
| Spearphishing via Service      | T1566.003 | Non-standard channel requests    | Spear Phishing        |
| Spearphishing Voice            | T1566.004 | Staff social engineering events  | Insider Threat        |
| Supply Chain Compromise        | T1195     | Malware in client backups        | Supply Chain          |
| Trusted Relationship           | T1199     | Compromised client exploitation  | Insider Threat        |
| Valid Accounts                 | T1078     | Compromised credentials          | Insider Threat        |
| User Execution: Malicious File | T1204.002 | Accepting contaminated data      | Supply Chain          |
| Masquerading                   | T1036     | Fake organizational identities   | Phishing              |
| Impersonation                  | T1656     | Identity fraud in requests       | BEC                   |
| Brute Force                    | T1110     | Authentication attacks           | Brute Force           |
| Network DoS                    | T1498     | DDoS campaigns                   | DDoS                  |
| Data Encrypted for Impact      | T1486     | Ransomware breach                | Breach System         |
| Data Destruction               | T1485     | Destructive attacks              | Breach System         |
| Financial Theft                | T1657     | Ransom payment mechanic          | Breach System         |

---

## Appendix D: References

### Game AI and Adaptive Systems

- Booth, M. (2009). "The AI Systems of Left 4 Dead." Valve Software. [steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf](https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf)
- Thompson, T. "Revisiting the AI of Alien: Isolation." [gamedeveloper.com](https://www.gamedeveloper.com/design/revisiting-the-ai-of-alien-isolation)
- Thompson, T. "The Perfect Organism: The AI of Alien: Isolation." [gamedeveloper.com](https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation)
- Left 4 Dead Wiki. "The Director." [left4dead.fandom.com](https://left4dead.fandom.com/wiki/The_Director)
- "More Than Meets the Eye: The Secrets of Dynamic Difficulty Adjustment." [gamedeveloper.com](https://www.gamedeveloper.com/design/more-than-meets-the-eye-the-secrets-of-dynamic-difficulty-adjustment)
- ScienceDirect (2024). "Rethinking dynamic difficulty adjustment for video game design."
- Springer Nature (2024). "Dynamic difficulty adjustment approaches in video games: a systematic literature review." [link.springer.com](https://link.springer.com/article/10.1007/s11042-024-18768-x)

### Cybersecurity Frameworks

- MITRE ATT&CK. "Phishing, Technique T1566." [attack.mitre.org](https://attack.mitre.org/techniques/T1566/)
- MITRE ATT&CK. "Spearphishing Attachment, T1566.001." [attack.mitre.org](https://attack.mitre.org/techniques/T1566/001/)
- MITRE ATT&CK. "Spearphishing Link, T1566.002." [attack.mitre.org](https://attack.mitre.org/techniques/T1566/002/)
- MITRE ATT&CK. "Spearphishing Voice, T1566.004." [attack.mitre.org](https://attack.mitre.org/techniques/T1566/004/)
- Lockheed Martin. "Cyber Kill Chain." [lockheedmartin.com](https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html)
- Lockheed Martin. "Intelligence-Driven Computer Network Defense." [lockheedmartin.com](https://www.lockheedmartin.com/content/dam/lockheed-martin/rms/documents/cyber/LM-White-Paper-Intel-Driven-Defense.pdf)
- NIST SP 800-61 Rev. 3. "Incident Response Recommendations and Considerations for Cybersecurity Risk Management." [nvlpubs.nist.gov](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf)
- Splunk. "Cyber Kill Chains: Strategies & Tactics." [splunk.com](https://www.splunk.com/en_us/blog/learn/cyber-kill-chains.html)
- CrowdStrike. "What is the Cyber Kill Chain?" [crowdstrike.com](https://www.crowdstrike.com/en-us/cybersecurity-101/cyberattacks/cyber-kill-chain/)

### Ransomware Recovery Data

- Cigent (2025). "Ransomware Recovery Time & What To Expect in 2025." [cigent.com](https://www.cigent.com/blog/ransomware-and-recovery-time-what-you-should-expect/)
- Varonis (2026). "Ransomware Statistics, Data, Trends, and Facts." [varonis.com](https://www.varonis.com/blog/ransomware-statistics)
- VikingCloud (2026). "46 Ransomware Statistics and Trends Report 2026." [vikingcloud.com](https://www.vikingcloud.com/blog/ransomware-statistics)
- Bright Defense (2026). "500+ Ransomware Statistics for 2026." [brightdefense.com](https://www.brightdefense.com/resources/ransomware-statistics/)

### Threat Landscape

- BRD Research File 04: "Cybersecurity Threat Landscape & Training Content Requirements" (internal)
- BRD Research File 08: "Gamification Mechanics & Learning Science Report" (internal)
- CrowdStrike. _2025 Global Threat Report_. 2025.
- Verizon. _2025 Data Breach Investigations Report_. 2025.
- APWG. _Phishing Activity Trends Report, Q1 2025_. 2025.

---

_This document is a living specification. It will be updated as playtesting data refines probability tables, new MITRE ATT&CK techniques become relevant, and seasonal content introduces new attack types and campaigns. Next scheduled review: 2026-05-05._

---

**End of Document**
