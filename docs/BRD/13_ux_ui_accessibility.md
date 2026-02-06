# BRD-13: UX/UI Design & Accessibility Requirements

**Project:** The DMZ: Archive Gate
**Document Type:** Business Requirements Document
**Version:** 1.0
**Date:** 2026-02-05
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Game UI Design](#2-game-ui-design)
3. [UX for Stealth Learning](#3-ux-for-stealth-learning)
4. [Enterprise UX](#4-enterprise-ux)
5. [Accessibility (WCAG 2.1 AA+)](#5-accessibility-wcag-21-aa)
6. [Responsive Design](#6-responsive-design)
7. [Onboarding UX](#7-onboarding-ux)
8. [Design System & Component Library](#8-design-system--component-library)
9. [Performance & Technical Constraints](#9-performance--technical-constraints)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

The DMZ: Archive Gate is a cybersecurity training platform disguised as a post-apocalyptic data center management simulation. The product serves two distinct audiences through two distinct interface layers:

- **Player-facing game interface:** A management sim with a retro-terminal aesthetic where employees make decisions about data access requests, threat assessment, and resource allocation --- unknowingly training their cybersecurity instincts.
- **Enterprise admin interface:** A clean, professional dashboard where security teams configure campaigns, monitor progress, generate compliance reports, and manage user cohorts.

This document defines the UX/UI requirements for both layers, along with accessibility standards, responsive behavior, and onboarding flows. The design philosophy is: **teach through play, never through lecture.** Every interaction should feel like a game decision first and a security lesson second.

### 1.1 Design Principles

| Principle                  | Description                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Diegetic First**         | Every UI element should exist within the game world. Health bars become server load indicators. Notifications become in-world emails. |
| **Friction as Pedagogy**   | Deliberate friction (e.g., verifying sender details) mirrors real-world security workflows. The inconvenience is the lesson.          |
| **Progressive Complexity** | Start simple, layer in systems. Day 1 has three fields to check. Day 30 has twelve.                                                   |
| **Clarity Over Cool**      | The retro aesthetic must never compromise readability or usability. If a CRT scanline makes text harder to read, remove the scanline. |
| **Accessible by Default**  | Accessibility is not an afterthought or an alternative mode. The base experience must be accessible; visual flourishes are additive.  |

### 1.2 Reference Games & Products

| Reference                    | What We Take From It                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Papers, Please**           | Document inspection interface, stamp-based approval/denial, moral weight of bureaucratic decisions, physical desk metaphor |
| **Orwell**                   | Surveillance-as-gameplay, reading documents to find evidence, building a case from fragments                               |
| **Her Story / Telling Lies** | Search-driven narrative discovery, database query as game mechanic                                                         |
| **Frostpunk**                | Resource management under pressure, moral dilemmas with systemic consequences, threat escalation                           |
| **Hacknet**                  | Terminal-as-interface, command-line aesthetic, making hacking feel authentic                                               |
| **KnowBe4 / Hoxhunt**        | Enterprise phishing simulation UX, admin dashboards for security training campaigns                                        |

---

## 2. Game UI Design

### 2.1 Core Interface Architecture

The player interface is structured as a **virtual workstation** --- the player sits at a terminal inside the Matrices GmbH data center. Every screen they see is a screen their character would see. This diegetic framing grounds the experience and eliminates the dissonance between "game UI" and "training tool."

#### 2.1.1 Primary Workspace Layout (Desktop)

```
+------------------------------------------------------------------+
|  [MATRICES GmbH SECURE TERMINAL v4.7]            [DATE] [TIME]  |
|  THREAT LEVEL: ████████░░ ELEVATED     FUNDS: EUR 12,450        |
+------------------------------------------------------------------+
|          |                                    |                  |
|  INBOX   |  DOCUMENT VIEWER                   |  FACILITY        |
|  -----   |  ----------------                  |  STATUS          |
|  [!] New |  From: Dr. K. Varga                |  --------        |
|  Request |  Org: Budapest Tech                |  Racks: 12/16    |
|  -----   |  Subject: Emergency Data           |  Power: 78%      |
|  Pending |  Recovery Request                  |  Cooling: OK     |
|  (3)     |                                    |  Bandwidth: 62%  |
|  -----   |  [FULL EMAIL BODY]                 |  --------        |
|  Archive |  [ATTACHED DOCUMENTS]              |  ACTIVE          |
|  -----   |                                    |  THREATS: 2      |
|  Flagged |  [VERIFICATION CHECKLIST]          |                  |
|  (1)     |                                    |  [VIEW LOGS]     |
|          |                                    |                  |
+----------+------------------------------------+------------------+
|  [APPROVE]  [DENY]  [FLAG FOR REVIEW]  [TOOLS v]               |
+------------------------------------------------------------------+
|  > Terminal ready. Type 'help' for commands.          [_ ][ ][ ] |
+------------------------------------------------------------------+
```

#### 2.1.2 Panel Descriptions

| Panel                              | Purpose                                                                                                                                       | Priority                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Top Bar (Status Bar)**           | Persistent display of threat level, date/time, funds. Always visible. Equivalent to a game's HUD.                                             | Critical --- always visible |
| **Left Panel (Inbox)**             | Email queue with unread indicators, category tabs (New, Pending, Archive, Flagged). Scrollable list.                                          | Primary navigation          |
| **Center Panel (Document Viewer)** | Main workspace. Displays the currently selected email, attached documents, verification checklists, and analysis tools. Scrollable, zoomable. | Primary interaction         |
| **Right Panel (Facility Status)**  | Resource meters (rack space, power, cooling, bandwidth), active threat count, quick-access logs. Collapsible.                                 | Secondary information       |
| **Bottom Bar (Action Bar)**        | Approve/Deny/Flag buttons and a dropdown for additional tools. Also contains a minimal terminal input for power users.                        | Primary action              |
| **Terminal Strip**                 | A single-line command input at the very bottom for typing commands. Optional but thematic. Expands to a full terminal overlay on focus.       | Tertiary / power-user       |

#### 2.1.3 Panel Behavior

- **Left Panel:** Collapses to icon-only mode on smaller viewports. Badge counts always visible.
- **Center Panel:** Takes up remaining space. Documents within it can be "pulled out" into floating sub-windows for comparison (e.g., dragging an email header next to a verification packet).
- **Right Panel:** Collapsible via toggle. On collapse, critical alerts (e.g., "COOLING FAILURE") still appear as toast notifications.
- **Bottom Bar:** Fixed position. Action buttons change context based on the document viewer state. When viewing a completed request, buttons become "Archive" and "Reopen."

### 2.2 Management Sim Interface Patterns

#### 2.2.1 Dashboard-Style Overview

When no email is selected, the center panel displays a **Facility Dashboard** --- a summary of the current state of operations:

```
+------------------------------------------+
|           MATRICES GmbH                  |
|        DAILY OPERATIONS BRIEF            |
|         Day 14 | 08:00 CEST             |
+------------------------------------------+
|                                          |
|  PENDING REQUESTS        7               |
|  APPROVED TODAY          3               |
|  DENIED TODAY            2               |
|  FLAGGED FOR REVIEW      1               |
|                                          |
|  REVENUE (TODAY)         EUR 2,100       |
|  REVENUE (TOTAL)         EUR 12,450      |
|  OPERATING COSTS         EUR 800/day     |
|                                          |
|  THREAT LEVEL            ELEVATED        |
|  ACTIVE INCIDENTS        2               |
|  LAST BREACH             Day 9           |
|                                          |
|  [VIEW UPGRADE SHOP]  [VIEW INTEL BRIEF] |
+------------------------------------------+
```

This dashboard serves as the player's "home screen" and provides at-a-glance situational awareness. It follows established management sim patterns: key metrics prominently displayed, action shortcuts to the most common next steps, and a narrative anchor (the date, the day count) that reinforces progress.

#### 2.2.2 Email Inbox Pattern

The inbox is the primary interface for receiving and triaging access requests. It draws from both email client conventions and document-inspection game patterns.

**Inbox List Item Structure:**

```
+--------------------------------------------------+
| [!] UNREAD INDICATOR                             |
|                                                  |
|  From: Dr. Katarina Varga                        |
|  Org:  Budapest Technical University             |
|  Subject: Emergency Data Recovery - Faculty DB   |
|  Received: Day 14, 06:47 CEST                   |
|  Risk Score: ██████░░░░ MEDIUM                   |
|  Attachments: 3                                  |
+--------------------------------------------------+
```

**Inbox Design Requirements:**

- Unread items display a pulsing indicator (left border glow, not just bold text, for accessibility).
- Risk score is auto-calculated from game systems but can be overridden by player analysis.
- Sorting: By date (default), by risk score, by organization type, by status.
- Filtering: Show All, Unread, Flagged, Approved, Denied.
- Batch actions are not supported --- each request demands individual attention (this is deliberate friction, mirroring real security review workflows).
- Search: A search bar at the top of the inbox allows keyword search across sender, subject, and body text. This subtly teaches email investigation skills.

#### 2.2.3 Terminal Aesthetic

The game interface uses a **terminal-inspired aesthetic** that evokes CRT monitors, command-line interfaces, and the lo-fi visual language of early network infrastructure. This is not merely decorative --- it reinforces the post-apocalyptic setting where computing resources are scarce and visual fidelity is a luxury.

**Visual Language:**

| Element           | Treatment                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------- |
| **Typography**    | Monospaced primary font (e.g., JetBrains Mono, IBM Plex Mono, or Fira Code). Proportional secondary font for longer document bodies where readability is paramount.       |
| **Color Palette** | Dark background (#0a0e14 to #1a1e24). Primary text in phosphor green (#33ff33) or amber (#ffb000). Accent colors for status/threat. White (#e0e0e0) for document content. |
| **Borders**       | Single-character box-drawing borders (e.g., `+--+`, `                                                                                                                     |     | `) for panel outlines. CSS renders these, not actual characters. |
| **Scanlines**     | Subtle horizontal scanline overlay at 5-10% opacity. Adjustable in settings. Disabled in high-contrast mode.                                                              |
| **CRT Curvature** | Slight barrel distortion on the outermost container. Purely cosmetic. Disabled in reduced-motion mode and on mobile.                                                      |
| **Glow Effects**  | Subtle text-shadow glow on primary UI text (0 0 4px rgba(51,255,51,0.3)). Disabled in reduced-motion and high-contrast modes.                                             |
| **Animations**    | Text "types" onto screen character-by-character for narrative moments. All animations respect `prefers-reduced-motion`.                                                   |
| **Noise/Static**  | Very faint noise texture overlay. Static bursts during high-threat events. Both adjustable/disableable.                                                                   |

**CRT Effects Are Layered, Not Structural:**

The CRT aesthetic is implemented as CSS overlay effects on top of a clean, accessible base UI. If all effects are disabled (via accessibility settings or user preference), the interface is a clean dark-mode terminal with excellent readability. Effects are cosmetic sugar, never structural.

```
Base Layer:     Clean dark UI, high-contrast text, clear hierarchy
Effect Layer 1: Scanline overlay (CSS pseudo-element, opacity: 0.05)
Effect Layer 2: CRT curvature (CSS transform on outer container)
Effect Layer 3: Glow (text-shadow on headings and primary text)
Effect Layer 4: Noise (CSS background-image, animated)
Effect Layer 5: Screen flicker (CSS animation, very rare, event-triggered)
```

### 2.3 HUD Design

The Heads-Up Display (HUD) is the persistent information layer that keeps the player aware of critical system state without requiring them to navigate away from their current task.

#### 2.3.1 Threat Level Indicator

The threat level is the single most important status indicator in the game. It is always visible in the top bar and uses a multi-signal encoding system to ensure accessibility:

**Encoding Channels:**

1. **Color:** Background color shifts from cool to warm (blue to green to yellow to orange to red).
2. **Text Label:** Always displayed alongside color (LOW, GUARDED, ELEVATED, HIGH, SEVERE).
3. **Icon:** A shield icon with increasing "damage" states (intact, cracked, broken, shattered, destroyed).
4. **Progress Bar:** A segmented bar showing position within the current threat band.
5. **Audio Cue:** Ambient soundscape shifts (calm hum to tense drone). Optional.
6. **Haptic (mobile):** Subtle vibration patterns at HIGH and SEVERE. Optional.

**Threat Level Definitions:**

| Level | Color (Default)  | Color (CB-Safe) | Label    | Gameplay Effect                              |
| ----- | ---------------- | --------------- | -------- | -------------------------------------------- |
| 1     | #3366ff (Blue)   | #0072B2         | LOW      | Normal operations, minimal attack frequency  |
| 2     | #33cc66 (Green)  | #009E73         | GUARDED  | Slightly elevated attack frequency           |
| 3     | #ffcc00 (Yellow) | #F0E442         | ELEVATED | Moderate attack frequency, new attack types  |
| 4     | #ff6600 (Orange) | #E69F00         | HIGH     | High attack frequency, sophisticated threats |
| 5     | #cc0000 (Red)    | #D55E00         | SEVERE   | Maximum danger, critical events possible     |

Every threat level transition is announced to screen readers via `aria-live="assertive"` regions.

#### 2.3.2 Resource Meters

Resource meters display the four key operational constraints: rack space, power, cooling, and bandwidth.

**Meter Design:**

```
  RACKS    [████████░░░░] 8/12
  POWER    [██████████░░] 83%
  COOLING  [████████████] OK
  BANDWIDTH[██████░░░░░░] 52%
```

**Requirements:**

- Each meter uses a horizontal bar with a numeric value alongside it (never rely on bar length alone).
- Warning thresholds: Below 20% capacity triggers a yellow warning state. Below 10% triggers a red critical state.
- Meters animate smoothly when values change (respecting reduced-motion preferences).
- Tooltips on hover/focus provide detailed breakdowns (e.g., "Power: 83% | 4.2 kW of 5.0 kW capacity | 3 active racks drawing power").
- Screen readers announce meter values as "Rack space: 8 of 12 available" using `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-valuetext`.

#### 2.3.3 Time Pressure

Time is a soft pressure mechanism. The game operates on a day cycle, and requests have implicit urgency:

- **Day Counter:** Displayed prominently in the top bar. Each day is a play session.
- **Request Age:** Each email displays how long it has been waiting. Older requests may expire, costing reputation.
- **Event Timers:** Critical events (active breach, ransom deadline) display countdown timers with clear visual urgency --- pulsing border, color shift, audio alert.
- **No Forced Time Limit on Decisions:** The player can take as long as needed to review a document. Time pressure comes from the queue building up, not from a per-item timer. This is a deliberate accessibility and pedagogy choice --- rushing security decisions teaches the wrong lesson.

#### 2.3.4 Funds Display

```
  FUNDS: EUR 12,450
```

- Always visible in the top bar.
- Animates up (green flash) or down (red flash) on changes, with a floating "+EUR 500" or "-EUR 800" indicator.
- Clicking/focusing opens a financial breakdown panel.

### 2.4 Document-Heavy Interface Design

The core gameplay loop involves reading, analyzing, and acting on documents. This is a text-heavy game, and the document viewer must be exceptional.

#### 2.4.1 Document Types and Their UI Treatment

| Document Type                   | UI Metaphor           | Layout                                                      | Interactive Elements                                  |
| ------------------------------- | --------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| **Email Access Request**        | Email message         | Header (From, Org, Subject, Date) + Body + Attachments list | Click attachments to open, highlight text to annotate |
| **Phishing Analysis Worksheet** | Checklist/form        | Two-column: red flags (left) vs. legitimacy signals (right) | Toggle checkboxes, add notes                          |
| **Verification Packet**         | File folder with tabs | Tabbed view: Identity, Ownership, Chain-of-Custody          | Compare tabs side-by-side, flag discrepancies         |
| **Threat Assessment Sheet**     | Report card           | Header with risk score + categorized threat indicators      | Adjust weighting, override auto-score                 |
| **Incident Log**                | Chronological feed    | Timeline view with expandable entries                       | Filter by type, search, export                        |
| **Data Salvage Contract**       | Legal document        | Numbered clauses, signature block                           | Highlight suspicious clauses, stamp to sign           |
| **Storage Lease Agreement**     | Legal document        | Terms grid, pricing table, term selector                    | Adjust terms, calculate costs                         |
| **Upgrade Proposal**            | Technical brief       | Specs table, cost/benefit analysis, timeline                | Approve/defer/reject                                  |
| **Blacklist Notice**            | Official notice       | Entity details, rationale, evidence links                   | Review evidence, confirm or rescind                   |
| **Whitelist Exception**         | Override form         | Justification, approver chain, conditions                   | Add justification, sign                               |
| **Facility Status Report**      | Dashboard             | Visual meters, trend graphs, alert list                     | Drill into specific systems                           |
| **Intelligence Brief**          | Classified memo       | Executive summary + detailed analysis sections              | Redacted sections that unlock with upgrades           |
| **Ransom Note**                 | Hostile message       | Distorted text, countdown timer, payment details            | Pay or attempt countermeasures                        |

#### 2.4.2 Document Viewer Requirements

- **Scrollable Content:** Documents scroll within the center panel. The action bar remains fixed.
- **Text Selection:** Players can select and highlight text within documents. Highlighted text can be "flagged" as suspicious or noteworthy.
- **Annotation System:** Players can add margin notes to documents. These notes persist and are visible when revisiting the document.
- **Comparison Mode:** Players can open two documents side-by-side in the center panel (e.g., comparing a sender's claimed identity against a verification packet).
- **Zoom:** Documents support zoom in/out. Text reflows at larger sizes.
- **Print/Export:** Documents can be "printed" to the player's in-game archive for later reference. No real-world printing needed.
- **Redaction Awareness:** Some documents contain redacted sections (black bars). These convey that the player does not yet have clearance or tools to access that information, motivating upgrades.

#### 2.4.3 Email Rendering

Emails are the most common document type. They must feel authentic while being readable:

```
+-----------------------------------------------------------+
|  SECURE MAIL TERMINAL                                     |
+-----------------------------------------------------------+
|  From:    d.varga@budapest-tech.edu.hu                    |
|  To:      intake@matrices-gmbh.net                        |
|  Date:    Day 14, 06:47 CEST                              |
|  Subject: Emergency Data Recovery - Faculty Database      |
+-----------------------------------------------------------+
|                                                           |
|  Dear Matrices GmbH Intake Team,                          |
|                                                           |
|  I am writing on behalf of the Budapest Technical         |
|  University Faculty of Computer Science. Following the    |
|  network collapse, we have lost access to 14 years of     |
|  research data stored on our primary file servers.        |
|                                                           |
|  We are requesting emergency data recovery services for   |
|  approximately 2.3 TB of academic research, including:    |
|                                                           |
|   - PhD dissertations (2010-2024)                         |
|   - Grant-funded research datasets                        |
|   - Faculty publication archives                          |
|                                                           |
|  Verification documents are attached. We can provide      |
|  additional proof of institutional identity upon request. |
|                                                           |
|  Sincerely,                                               |
|  Dr. Katarina Varga                                       |
|  Dean, Faculty of Computer Science                        |
|  Budapest Technical University                            |
|                                                           |
+-----------------------------------------------------------+
|  ATTACHMENTS:                                             |
|  [1] institutional_id.pdf     (142 KB)                    |
|  [2] data_manifest.csv        (38 KB)                     |
|  [3] chain_of_custody.pdf     (97 KB)                     |
+-----------------------------------------------------------+
|  QUICK ANALYSIS:                                          |
|  Domain: budapest-tech.edu.hu   [VERIFY]                  |
|  Sender history: First contact  [NOTE]                    |
|  Request size: 2.3 TB           [CAPACITY CHECK]          |
+-----------------------------------------------------------+
```

**Email-Specific Requirements:**

- The "Quick Analysis" section at the bottom provides contextual action buttons that link to verification tools. These teach the player to investigate rather than trust.
- Hovering over the sender's email address shows a tooltip with domain registration info (if the player has the "Domain Lookup" upgrade).
- Suspicious elements (e.g., mismatched domain, unusual phrasing) can be highlighted by the player or auto-flagged by purchased security tools.
- Phishing emails include subtle but detectable anomalies: misspellings in official names, slightly wrong domains (e.g., `budapest-tech.edu.hu` vs. `budapesttech.edu.hu`), urgency language, unusual attachment types.

### 2.5 Color Coding System

Color is used extensively but never exclusively. Every color-coded element has a secondary encoding (text label, icon, pattern, or position).

#### 2.5.1 Semantic Color Map

| Semantic Meaning                | Default Color      | CB-Safe Alternative  | Text Label                 | Icon                 |
| ------------------------------- | ------------------ | -------------------- | -------------------------- | -------------------- |
| Safe / Approved / Low Risk      | #33cc66 (Green)    | #009E73 (Teal)       | SAFE / APPROVED / LOW      | Checkmark / Shield   |
| Warning / Pending / Medium Risk | #ffcc00 (Yellow)   | #F0E442 (Yellow)     | WARNING / PENDING / MEDIUM | Triangle-exclamation |
| Danger / Denied / High Risk     | #cc3333 (Red)      | #D55E00 (Vermillion) | DANGER / DENIED / HIGH     | X-circle / Skull     |
| Information / Neutral           | #3399ff (Blue)     | #0072B2 (Blue)       | INFO / NEUTRAL             | Info-circle          |
| Critical / Breach / Severe      | #cc0000 (Deep Red) | #CC79A7 (Pink)       | CRITICAL / BREACH / SEVERE | Skull-crossbones     |
| Flagged / Review Needed         | #ff9900 (Orange)   | #E69F00 (Amber)      | FLAGGED / REVIEW           | Flag                 |
| Archived / Inactive             | #666666 (Gray)     | #999999 (Gray)       | ARCHIVED / INACTIVE        | Archive-box          |

#### 2.5.2 Trust Signal Color System

When reviewing applicants, a trust signal system helps players assess credibility:

| Trust Level        | Default Color             | Pattern     | Label      |
| ------------------ | ------------------------- | ----------- | ---------- |
| Verified           | Green with solid border   | Solid line  | VERIFIED   |
| Partially Verified | Yellow with dashed border | Dashed line | PARTIAL    |
| Unverified         | Gray with dotted border   | Dotted line | UNVERIFIED |
| Suspicious         | Orange with wavy border   | Wavy line   | SUSPICIOUS |
| Known Threat       | Red with double border    | Double line | THREAT     |

The pattern (line style) provides a redundant signal that does not depend on color discrimination.

---

## 3. UX for Stealth Learning

The fundamental design challenge: teach cybersecurity concepts through gameplay without the player feeling lectured to. The learning must be embedded in the game's mechanics, narrative, and feedback systems such that players absorb security thinking as a byproduct of playing well.

### 3.1 Making Security Decisions Feel Like Natural Game Choices

#### 3.1.1 The Decision Framework

Every access request is structured as a game decision with competing incentives:

- **Approve:** Gain revenue, fill rack space, advance narrative. Risk: the applicant might be a threat.
- **Deny:** Protect the facility, reduce attack surface. Risk: lose revenue, potentially deny a legitimate user.
- **Flag for Review:** Spend time investigating. Risk: the queue builds up, time-sensitive requests expire.

This mirrors real-world security trade-offs (convenience vs. security, false positives vs. false negatives) without ever explicitly labeling them as such.

#### 3.1.2 Embedding Security Concepts in Game Mechanics

| Security Concept             | Game Mechanic                                    | Player Experience                                                                                                  |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Phishing detection           | Email analysis and verification workflow         | "I need to check the sender's domain because last time I approved a fake request and got breached."                |
| Principle of least privilege | Storage allocation limits, tiered access         | "I can only give them the minimum rack space they need. If they want more, they need to prove it."                 |
| Social engineering           | Applicant backstories, emotional manipulation    | "This email is really sad, but the verification documents do not match. I should deny it."                         |
| Patch management             | Upgrade system, security tool purchases          | "I need to buy the email header analysis tool because the attackers are getting more sophisticated."               |
| Incident response            | Breach events, ransom notes, recovery procedures | "The breach happened because I approved that suspicious request. Now I need to pay the ransom or lose everything." |
| Risk assessment              | Risk score calculation, threat level system      | "This request has a medium risk score, but the current threat level is HIGH, so I should be extra cautious."       |
| Supply chain attacks         | Malware hidden in applicant backups              | "The data looks clean on the manifest, but the chain-of-custody has a gap. Could be compromised."                  |
| Zero trust                   | Verification requirements that never go away     | "Even returning clients need to re-verify. Trust is earned each time."                                             |

#### 3.1.3 Avoiding the "Training" Feel

**Do:**

- Frame every interaction as a game action ("Approve this request" not "Identify this as phishing").
- Use in-world consequences, not pop-up quizzes.
- Let players fail and learn from failure narratively, not through a score screen.
- Keep the terminology in-world ("verification packet" not "phishing indicator checklist").

**Do Not:**

- Display learning objectives on screen.
- Show "You learned about X!" pop-ups.
- Use real-world company names or brands in phishing simulations (legal risk and immersion-breaking).
- Pause gameplay for instructional content.
- Grade individual decisions with visible right/wrong indicators.

### 3.2 Contextual Hints That Teach Without Lecturing

#### 3.2.1 The Hint System Architecture

Hints are delivered through in-world channels, never through meta-UI elements:

| Hint Channel                    | Description                                                                                                                      | Example                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Colleague Messages**          | An NPC colleague (e.g., "SYSOP-7") sends terse terminal messages with tactical advice.                                           | `SYSOP-7: Heads up. Three requests today used the same IP block. Might be coordinated.`                                                     |
| **Intelligence Briefs**         | Periodic documents that describe current attacker behavior. Players must read them to benefit.                                   | "INTEL BRIEF Day 14: Adversaries are spoofing .edu domains. Verify all academic institution requests against the registry."                 |
| **Tool Tooltips**               | When a player hovers over or focuses on a verification tool, a brief description explains what it checks.                        | "Domain Lookup: Cross-references the sender's email domain against known registries. Detects typosquatting."                                |
| **Pattern Recognition Prompts** | After the player encounters the same attack pattern twice without catching it, a subtle highlight appears on the relevant field. | The sender's domain gets a faint underline on the third phishing attempt from the same pattern.                                             |
| **Post-Incident Debriefs**      | After a breach, an incident report appears in the inbox explaining what happened and what was missed.                            | "INCIDENT REPORT: Breach traced to Request #47. The sender's domain was registered 2 days ago. A domain age check would have flagged this." |
| **Upgrade Descriptions**        | Each purchasable tool/upgrade has a description that explains the real-world concept it represents.                              | "Email Header Analyzer (EUR 1,500): Automatically checks for spoofed headers, mismatched reply-to addresses, and suspicious routing."       |

#### 3.2.2 Hint Timing and Frequency

- **First encounter:** No hint. Let the player try.
- **Second encounter (same pattern):** Subtle environmental clue (e.g., SYSOP-7 mentions the pattern in passing).
- **Third encounter (still missing it):** Direct contextual highlight on the relevant field.
- **Post-failure:** Detailed incident report that explains the pattern.
- **Never:** Pre-emptive warnings that remove the learning opportunity.

The system tracks which concepts the player has demonstrated understanding of (by correctly identifying threats) and stops hinting on mastered concepts.

### 3.3 Feedback Loops That Reinforce Correct Security Behavior

#### 3.3.1 Positive Feedback

| Correct Action                          | Immediate Feedback                            | Delayed Feedback                                                                     |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Deny a phishing email                   | Denial stamp animation, satisfying sound      | End-of-day report: "0 breaches today." Threat level does not increase.               |
| Flag a suspicious request               | Flag animation, request moves to review queue | Intelligence brief references the pattern you caught: "Thanks to early detection..." |
| Verify before approving                 | Verification checkmarks fill in               | Verified clients have higher payment reliability, fewer incidents over time          |
| Purchase appropriate upgrade            | Upgrade installation animation                | New automated checks catch threats you would have missed, validating the investment  |
| Correctly prioritize high-risk requests | Risk score confirmation                       | Facility status improves, you gain reputation                                        |

#### 3.3.2 Negative Feedback (Consequence-Based)

| Incorrect Action                           | Immediate Feedback                                     | Delayed Feedback                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Approve a phishing email                   | Nothing immediately (this is realistic and terrifying) | Breach event: ransom note, funds lost, operations locked. Incident report explains what was missed.                     |
| Deny a legitimate request                  | Denial confirmation                                    | Reputation decrease. News feed: "Budapest Tech University forced to use less secure provider. Data lost." Moral weight. |
| Ignore a flagged request                   | It sits in the queue                                   | The request expires. If legitimate: reputation hit. If malicious: the attacker tries again with a better disguise.      |
| Overspend on unnecessary upgrades          | Funds decrease                                         | Cannot afford critical upgrades later. Cash flow crisis.                                                                |
| Rush through requests without verification | Fast queue processing                                  | Higher breach rate over time. The game gets harder.                                                                     |

#### 3.3.3 The Breach Sequence (Key Educational Moment)

When a player approves a malicious request and a breach occurs, the following sequence plays out:

1. **Alert:** Screen flickers. Terminal text scrambles briefly. "SECURITY BREACH DETECTED" appears in red across the top bar.
2. **Lockout:** The workspace is replaced by a ransom note (full-screen, diegetic --- it is the character's screen being taken over).
3. **Ransom Note:** Displays the demand (total earnings / 10, minimum EUR 1). The player must pay to resume operations.
4. **Incident Report:** After paying (or losing), an incident report appears in the inbox. This report is the key teaching moment --- it traces the breach back to the specific request, highlights the red flags that were missed, and explains the attack vector in in-world language.
5. **System Recovery:** Operations resume, but the player carries the cost. This financial scar is a persistent reminder.

The breach sequence is designed to be emotionally impactful (the loss is real within the game economy) but never punitive to the point of discouragement. The incident report provides a clear path to improvement.

### 3.4 Error States That Educate

Every error the player makes is an opportunity to teach. The key principle: **show what happened, not what should have happened.** Players learn better from understanding consequences than from being told the right answer.

#### 3.4.1 Error State Design Patterns

| Error Type                         | Error State Design                                                                            | Educational Content                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Approved phishing email**        | Breach sequence (see 3.3.3) with detailed incident report                                     | Attack vector analysis, missed red flags highlighted in the original email                                              |
| **Denied legitimate request**      | Reputation penalty + news feed story about the denied party                                   | The story shows the real-world impact of false positives: legitimate organizations harmed by overly aggressive security |
| **Missed a time-sensitive threat** | Threat level increases, new attacks spawn                                                     | Intel brief explains how the unaddressed threat escalated                                                               |
| **Overspent on wrong upgrade**     | Cash flow crisis, cannot afford needed tools                                                  | Upgrade comparison screen shows what you bought vs. what you needed                                                     |
| **Ignored verification steps**     | Higher error rate (the game tracks whether the player actually opened verification documents) | Breach incident reports become more detailed about the specific checks that were skipped                                |

#### 3.4.2 Error Recovery

- Players can always recover from errors. The game does not have a "you made one mistake and now it is impossible" state.
- Recovery costs (ransom payments, reputation rebuilding) are proportional to the severity of the error.
- The game adjusts difficulty based on the player's error patterns --- if they consistently miss domain-based attacks, more domain-based attacks appear (adaptive difficulty as targeted training).

### 3.5 Progressive Disclosure of Complexity

The game introduces systems gradually, matching the player's growing competence:

#### 3.5.1 Complexity Curve

| Phase            | Days  | Systems Available                                   | Document Types                                  | Attack Sophistication                                                      |
| ---------------- | ----- | --------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| **Tutorial**     | 1-3   | Inbox, basic approve/deny, single resource meter    | Simple emails only                              | Obvious phishing (misspellings, wrong domains)                             |
| **Foundation**   | 4-7   | Full inbox, all resource meters, basic verification | Emails + verification packets                   | Moderate phishing (correct domains, wrong details)                         |
| **Intermediate** | 8-14  | Upgrade shop, threat assessment, flagging system    | All document types except intel briefs          | Sophisticated phishing, social engineering, urgency tactics                |
| **Advanced**     | 15-25 | Full terminal, automated tools, intel briefs        | All document types                              | Supply chain attacks, coordinated campaigns, insider threats               |
| **Expert**       | 26+   | All systems, custom rules, advanced analytics       | All document types + redacted sections unlocked | APT-level attacks, zero-day exploitation narratives, multi-stage campaigns |

#### 3.5.2 Unlock Choreography

New systems are introduced through narrative events, not through tutorial popups:

- **Day 1:** "Welcome to Matrices GmbH. Your terminal is ready. You have 3 pending requests." (Inbox only.)
- **Day 4:** "SYSOP-7: Hey, new intake. We added the verification database to your terminal. Use it." (Verification tools unlock.)
- **Day 8:** "MANAGEMENT: Revenue is up. Here is a budget for facility upgrades." (Upgrade shop unlocks.)
- **Day 15:** "SYSOP-7: Intel division started sharing their briefs with us. Check your inbox." (Intelligence briefs unlock.)

Each unlock is motivated by the narrative and accompanied by a single, contextual, in-world explanation.

---

## 4. Enterprise UX

The enterprise-facing interface serves security team administrators who configure campaigns, manage users, and generate compliance reports. This interface has no game aesthetic --- it is a clean, professional SaaS dashboard.

### 4.1 Design Philosophy

The enterprise UI follows a distinct set of principles:

| Principle                | Description                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Professional Clarity** | Clean, minimal design with no game elements. Admins need efficiency, not immersion.        |
| **Data-Forward**         | Key metrics visible at a glance. Deep data accessible through drill-down.                  |
| **Role-Based Views**     | Different dashboard views for different admin roles (Campaign Manager, IT Admin, C-Suite). |
| **Actionable Insights**  | Every data visualization has a clear "so what" and a path to action.                       |
| **Consistent Patterns**  | Follows established enterprise SaaS conventions (sidebar nav, breadcrumbs, data tables).   |

### 4.2 Admin Dashboard Design

#### 4.2.1 Dashboard Layout

```
+------------------------------------------------------------------+
|  [MATRICES LOGO]  THE DMZ: ARCHIVE GATE        [User] [Settings] |
+------------------------------------------------------------------+
|           |                                                       |
|  NAV      |  DASHBOARD                                           |
|  -----    |  ---------                                            |
|  Dashboard|  Welcome back, Sarah. Here is your campaign summary.  |
|  Campaigns|                                                       |
|  Users    |  +------------------+  +------------------+           |
|  Reports  |  | ACTIVE CAMPAIGNS |  | TOTAL USERS      |           |
|  Settings |  | 3                |  | 247              |           |
|  Help     |  +------------------+  +------------------+           |
|           |  +------------------+  +------------------+           |
|           |  | AVG. PHISHING    |  | COMPLETION RATE  |           |
|           |  | DETECTION RATE   |  | 78%              |           |
|           |  | 72%              |  +------------------+           |
|           |  +------------------+                                 |
|           |                                                       |
|           |  RECENT ACTIVITY                                      |
|           |  -----------------------------------------------      |
|           |  [User] John D. completed Day 14 (Score: 89%)         |
|           |  [Campaign] "Q1 Security Awareness" - 12 new users    |
|           |  [Alert] 3 users failed phishing detection on Day 7   |
|           |                                                       |
+------------------------------------------------------------------+
```

#### 4.2.2 Key Metrics Cards

The dashboard displays four primary metric cards:

1. **Active Campaigns:** Number of currently running training campaigns. Click to view campaign list.
2. **Total Users:** Number of enrolled users across all campaigns. Click to view user list.
3. **Average Phishing Detection Rate:** Aggregate accuracy across all users. Click to view breakdown by campaign, user group, or attack type.
4. **Completion Rate:** Percentage of users who have reached the target day in their current campaign. Click to view dropout analysis.

Each card supports:

- Trend indicator (up/down arrow with percentage change over the selected time period).
- Sparkline graph showing the metric over time.
- Drill-down on click to a detailed view.

#### 4.2.3 Activity Feed

A chronological feed of recent events across all campaigns:

- User milestones (completed days, achieved scores).
- Campaign events (new enrollments, campaign starts/ends).
- Alerts (users failing critical scenarios, unusual patterns).
- System events (scheduled reports generated, integrations synced).

Each feed item is filterable by type and campaign.

### 4.3 Report Generation Interfaces

#### 4.3.1 Report Builder

The report builder allows admins to generate custom reports on training outcomes:

**Report Configuration:**

```
+----------------------------------------------------------+
|  REPORT BUILDER                                          |
+----------------------------------------------------------+
|                                                          |
|  Report Type:  [Dropdown: Summary | Detailed | Compliance|
|                          | Custom]                       |
|                                                          |
|  Campaign:     [Multi-select: Campaign list]             |
|  User Group:   [Multi-select: Department, Role, Custom]  |
|  Date Range:   [Date picker: From - To]                  |
|  Metrics:      [Checkbox list:                           |
|                  Detection Rate                           |
|                  Response Time                            |
|                  Completion Rate                          |
|                  Improvement Over Time                    |
|                  Failed Scenarios                         |
|                  Concept Mastery                          |
|                ]                                         |
|                                                          |
|  [PREVIEW]  [GENERATE PDF]  [SCHEDULE]                   |
+----------------------------------------------------------+
```

**Report Types:**

| Type           | Content                                                             | Audience            |
| -------------- | ------------------------------------------------------------------- | ------------------- |
| **Summary**    | High-level metrics, trend charts, top-line findings                 | C-Suite, Board      |
| **Detailed**   | Per-user breakdowns, scenario-by-scenario analysis, learning curves | Security Team Leads |
| **Compliance** | Regulatory framework mapping, completion attestations, audit trail  | Compliance Officers |
| **Custom**     | User-selected metrics and dimensions                                | Any                 |

#### 4.3.2 Scheduled Reports

- Admins can schedule reports to be generated and emailed on a recurring basis (daily, weekly, monthly, quarterly).
- Scheduled reports use the same configuration as manual reports.
- Reports are generated as PDF and optionally CSV for raw data.
- Integration support for email delivery, Slack notifications, and webhook triggers.

#### 4.3.3 Report Preview

Before generating a full report, a live preview shows:

- The report layout with real data.
- Chart types and positions.
- Data table structure.
- Export format options.

### 4.4 Campaign Management Workflows

#### 4.4.1 Campaign Creation Wizard

A step-by-step wizard for creating new training campaigns:

**Step 1: Campaign Basics**

- Campaign name.
- Description.
- Start date and end date (or ongoing).
- Target audience (select user groups or individual users).

**Step 2: Difficulty Configuration**

- Starting day (1 for new users, higher for returning users).
- Target day (the day the campaign aims to reach).
- Difficulty preset (Beginner, Intermediate, Advanced, Custom).
- Custom scenario selection (if Custom difficulty).

**Step 3: Scenario Mix**

- Phishing email frequency (percentage of malicious requests).
- Attack type distribution (domain spoofing, social engineering, supply chain, etc.).
- Narrative intensity (light story, moderate story, heavy story).
- Custom scenarios (upload or select from library).

**Step 4: Notifications & Reminders**

- Player reminders (email, Slack, Teams).
- Admin alerts (user completion, failure thresholds, campaign milestones).
- Reporting cadence.

**Step 5: Review & Launch**

- Summary of all settings.
- Cost estimate (if applicable).
- Launch or save as draft.

#### 4.4.2 Campaign Dashboard

Each active campaign has its own dashboard:

- **Progress Tracker:** Visual timeline showing campaign progress (percentage of users at each day).
- **Performance Heatmap:** Grid of users vs. scenarios, color-coded by performance. Accessible version uses icon overlays.
- **Trending Metrics:** Line charts showing detection rate, response time, and completion rate over time.
- **At-Risk Users:** List of users who are underperforming or at risk of dropping out.
- **Scenario Effectiveness:** Which scenarios are most/least effective at teaching specific concepts.

#### 4.4.3 Campaign Templates

Pre-built campaign templates for common use cases:

- **New Hire Onboarding:** Gentle introduction, emphasis on basics.
- **Annual Refresher:** Moderate difficulty, tests retention.
- **Incident Response Drill:** High difficulty, breach scenarios.
- **Executive Awareness:** Shorter campaign, focused on business email compromise.
- **Compliance Training:** Mapped to specific regulatory requirements (GDPR, HIPAA, SOC 2, etc.).

### 4.5 User Management Interfaces

#### 4.5.1 User List

A paginated, searchable, sortable table of all users:

| Column          | Description                       | Sortable | Filterable       |
| --------------- | --------------------------------- | -------- | ---------------- |
| Name            | User's display name               | Yes      | Yes (search)     |
| Email           | User's email address              | Yes      | Yes (search)     |
| Department      | Organizational unit               | Yes      | Yes (dropdown)   |
| Role            | Job title / role                  | Yes      | Yes (dropdown)   |
| Active Campaign | Currently enrolled campaign       | Yes      | Yes (dropdown)   |
| Current Day     | Their progress in the game        | Yes      | Yes (range)      |
| Detection Rate  | Their phishing detection accuracy | Yes      | Yes (range)      |
| Last Active     | When they last played             | Yes      | Yes (date range) |
| Status          | Active, Inactive, Suspended       | Yes      | Yes (dropdown)   |

#### 4.5.2 User Detail View

Clicking a user opens their profile:

- **Overview:** Key stats, current campaign, progress chart.
- **Performance History:** Timeline of all decisions, color-coded by correctness. Accessible version uses icon + text labels.
- **Concept Mastery:** Radar chart (with accessible table alternative) showing proficiency across security concepts (phishing detection, social engineering resistance, risk assessment, etc.).
- **Learning Gaps:** Specific areas where the user consistently underperforms, with recommended scenarios.
- **Activity Log:** Chronological list of all game actions.
- **Admin Actions:** Reset progress, reassign campaign, send reminder, suspend account.

#### 4.5.3 Bulk User Management

- CSV import for bulk user creation.
- Bulk campaign assignment.
- Bulk reminder sending.
- Bulk status changes (activate, deactivate, suspend).
- All bulk actions require confirmation and display a preview of affected users.

### 4.6 Admin Visual Design

#### 4.6.1 Design Tokens (Enterprise)

| Token                    | Value                     | Usage                                    |
| ------------------------ | ------------------------- | ---------------------------------------- |
| `--admin-bg-primary`     | #ffffff                   | Page background                          |
| `--admin-bg-secondary`   | #f8f9fa                   | Card backgrounds, alternating table rows |
| `--admin-text-primary`   | #212529                   | Body text                                |
| `--admin-text-secondary` | #6c757d                   | Supporting text, labels                  |
| `--admin-accent`         | #0d6efd                   | Primary actions, links, active states    |
| `--admin-success`        | #198754                   | Positive metrics, success states         |
| `--admin-warning`        | #ffc107                   | Warnings, at-risk indicators             |
| `--admin-danger`         | #dc3545                   | Errors, critical alerts, negative trends |
| `--admin-border`         | #dee2e6                   | Borders, dividers                        |
| `--admin-radius`         | 8px                       | Border radius for cards and buttons      |
| `--admin-shadow`         | 0 1px 3px rgba(0,0,0,0.1) | Card shadows                             |

#### 4.6.2 Typography (Enterprise)

| Element            | Font  | Size            | Weight |
| ------------------ | ----- | --------------- | ------ |
| H1 (Page Title)    | Inter | 28px / 1.75rem  | 700    |
| H2 (Section Title) | Inter | 22px / 1.375rem | 600    |
| H3 (Card Title)    | Inter | 18px / 1.125rem | 600    |
| Body               | Inter | 16px / 1rem     | 400    |
| Small / Label      | Inter | 14px / 0.875rem | 400    |
| Data Table         | Inter | 14px / 0.875rem | 400    |
| Metric Value       | Inter | 32px / 2rem     | 700    |

#### 4.6.3 Dark Mode (Enterprise)

The enterprise interface supports a dark mode toggle:

| Token                    | Light Value | Dark Value |
| ------------------------ | ----------- | ---------- |
| `--admin-bg-primary`     | #ffffff     | #1a1a2e    |
| `--admin-bg-secondary`   | #f8f9fa     | #16213e    |
| `--admin-text-primary`   | #212529     | #e0e0e0    |
| `--admin-text-secondary` | #6c757d     | #a0a0b0    |
| `--admin-border`         | #dee2e6     | #2a2a4a    |

---

## 5. Accessibility (WCAG 2.1 AA+)

Accessibility is not an alternative mode. It is the foundation. The game and enterprise interfaces must meet WCAG 2.1 AA as a minimum, with select AAA criteria targeted where feasible.

### 5.1 Compliance Framework

#### 5.1.1 WCAG 2.1 AA Success Criteria Coverage

The following table maps each WCAG 2.1 AA success criterion to its implementation strategy within the application. Criteria are organized by principle.

**Perceivable:**

| Criterion                       | ID     | Implementation                                                                                                                                              |
| ------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-text Content                | 1.1.1  | All images, icons, and visual indicators have text alternatives. Game icons include `aria-label`. Decorative elements use `aria-hidden="true"`.             |
| Captions (Prerecorded)          | 1.2.2  | All audio content (narrative, alerts, ambient) has closed captions.                                                                                         |
| Audio Description (Prerecorded) | 1.2.3  | Visual-only events (breach animation, screen effects) have audio descriptions available.                                                                    |
| Info and Relationships          | 1.3.1  | Semantic HTML used throughout. Tables have proper headers. Forms have associated labels. ARIA landmarks define page regions.                                |
| Meaningful Sequence             | 1.3.2  | DOM order matches visual order. CSS does not reorder content in a way that changes meaning.                                                                 |
| Sensory Characteristics         | 1.3.3  | Instructions never rely solely on color, shape, or position. "Click the green button" becomes "Click the Approve button (green checkmark)."                 |
| Use of Color                    | 1.4.1  | Color is never the sole means of conveying information. All color-coded elements have text labels, icons, or patterns as secondary indicators.              |
| Contrast (Minimum)              | 1.4.3  | Text contrast ratio of 4.5:1 minimum (7:1 in high-contrast mode). Large text (18px+ bold or 24px+) at 3:1 minimum.                                          |
| Resize Text                     | 1.4.4  | Text resizable up to 200% without loss of content or functionality. Layout reflows.                                                                         |
| Images of Text                  | 1.4.5  | No images of text except for decorative purposes. All text is real text.                                                                                    |
| Reflow                          | 1.4.10 | Content reflows at 320px width (mobile) without horizontal scrolling for primary content.                                                                   |
| Non-text Contrast               | 1.4.11 | UI components and graphical objects have a contrast ratio of at least 3:1 against adjacent colors.                                                          |
| Text Spacing                    | 1.4.12 | Content adapts to user-specified text spacing (line height 1.5x, paragraph spacing 2x, letter spacing 0.12em, word spacing 0.16em) without loss of content. |
| Content on Hover or Focus       | 1.4.13 | Tooltips and hover content are dismissible (Esc), hoverable (mouse can move to the tooltip), and persistent (remain visible until dismissed).               |

**Operable:**

| Criterion           | ID    | Implementation                                                                                                                                               |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keyboard            | 2.1.1 | All functionality operable via keyboard. No keyboard traps. Custom shortcuts documented.                                                                     |
| No Keyboard Trap    | 2.1.2 | Focus can always be moved away from any component using standard keyboard navigation. Modal dialogs trap focus within themselves but can be closed with Esc. |
| Timing Adjustable   | 2.2.1 | No hard time limits on gameplay decisions. Event timers (ransom deadlines) can be paused in accessibility settings. Queue buildup rate adjustable.           |
| Pause, Stop, Hide   | 2.2.2 | All animations (scanlines, glow, type-on effects) can be paused or hidden. Auto-updating content (activity feeds) can be paused.                             |
| Three Flashes       | 2.3.1 | No content flashes more than three times per second. Breach screen effects use slow fades, not strobes.                                                      |
| Bypass Blocks       | 2.4.1 | Skip-to-content links at the top of each page. ARIA landmarks for all major regions.                                                                         |
| Page Titled         | 2.4.2 | Each view has a descriptive title. Game: "The DMZ - Day 14 - Inbox". Admin: "Campaign Dashboard - Q1 Security".                                              |
| Focus Order         | 2.4.3 | Focus order follows logical reading order: top bar, left panel, center panel, right panel, bottom bar.                                                       |
| Link Purpose        | 2.4.4 | All links and buttons have descriptive text. No "Click here" or "Read more" without context.                                                                 |
| Multiple Ways       | 2.4.5 | Multiple navigation paths to all content: sidebar nav, breadcrumbs, search, keyboard shortcuts.                                                              |
| Headings and Labels | 2.4.6 | All sections have descriptive headings. All form inputs have visible labels.                                                                                 |
| Focus Visible       | 2.4.7 | Custom focus indicators: 2px solid outline with 2px offset, using the accent color. High visibility against both dark (game) and light (admin) backgrounds.  |
| Label in Name       | 2.5.3 | Accessible names of UI components contain their visible text labels.                                                                                         |
| Motion Actuation    | 2.5.4 | No functionality that can only be operated by device motion.                                                                                                 |

**Understandable:**

| Criterion                 | ID    | Implementation                                                                                                         |
| ------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| Language of Page          | 3.1.1 | HTML `lang` attribute set correctly (default: `en`).                                                                   |
| Language of Parts         | 3.1.2 | In-game documents in other languages have `lang` attributes on the relevant elements.                                  |
| On Focus                  | 3.2.1 | No context changes on focus alone.                                                                                     |
| On Input                  | 3.2.2 | No context changes on input alone (except where expected, e.g., selecting a filter).                                   |
| Consistent Navigation     | 3.2.3 | Navigation patterns are consistent across all views. The sidebar, top bar, and bottom bar maintain the same structure. |
| Consistent Identification | 3.2.4 | Components with the same functionality use the same labels and icons throughout.                                       |
| Error Identification      | 3.3.1 | Form errors are identified in text, not just color. Error messages appear adjacent to the relevant field.              |
| Labels or Instructions    | 3.3.2 | All form fields have visible labels. Required fields are marked with text ("Required"), not just asterisks.            |
| Error Suggestion          | 3.3.3 | When an error is detected, suggestions for correction are provided.                                                    |
| Error Prevention          | 3.3.4 | Irreversible actions (approve, deny, campaign launch) require confirmation dialogs.                                    |

**Robust:**

| Criterion         | ID    | Implementation                                                                                                                                   |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Parsing           | 4.1.1 | Valid HTML. No duplicate IDs. Proper nesting.                                                                                                    |
| Name, Role, Value | 4.1.2 | All custom components have proper ARIA roles, states, and properties. Custom widgets follow WAI-ARIA authoring practices.                        |
| Status Messages   | 4.1.3 | Status messages (toast notifications, threat level changes, action confirmations) are announced via `aria-live` regions without receiving focus. |

### 5.2 Screen Reader Compatibility

#### 5.2.1 Screen Reader Strategy

The application must be tested with and support:

| Screen Reader | Browser         | Platform   | Priority  |
| ------------- | --------------- | ---------- | --------- |
| NVDA          | Firefox, Chrome | Windows    | Primary   |
| JAWS          | Chrome, Edge    | Windows    | Primary   |
| VoiceOver     | Safari          | macOS, iOS | Primary   |
| TalkBack      | Chrome          | Android    | Secondary |
| Orca          | Firefox         | Linux      | Tertiary  |

#### 5.2.2 Game-Specific Screen Reader Considerations

| Game Element        | Screen Reader Behavior                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inbox list**      | Announced as a list. Each item announces sender, subject, risk level, and unread status. `role="listbox"` with `role="option"` for each item.                    |
| **Document viewer** | Announced as a document region. Heading structure reflects document hierarchy. Attachments announced as links with file type and size.                           |
| **Resource meters** | `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`. Updated values announced via `aria-live="polite"`.                      |
| **Threat level**    | Changes announced via `aria-live="assertive"`. Full description: "Threat level changed to ELEVATED, level 3 of 5."                                               |
| **Action buttons**  | `aria-label` includes the current context: "Approve request from Dr. Varga" not just "Approve."                                                                  |
| **Terminal input**  | `role="textbox"` with `aria-label="Terminal command input"`. Command output announced via `aria-live="polite"`.                                                  |
| **Breach event**    | `role="alert"` for the initial notification. Ransom note content is readable in the document viewer. Screen effects are purely visual (no accessibility impact). |
| **CRT effects**     | All visual effects (scanlines, glow, curvature) are implemented via CSS pseudo-elements or overlays that do not appear in the accessibility tree.                |

#### 5.2.3 ARIA Landmarks

```html
<header role="banner">
  <!-- Top bar: status, threat level, funds -->
  <nav role="navigation">
    <!-- Left panel: inbox categories -->
    <main role="main">
      <!-- Center panel: document viewer -->
      <aside role="complementary">
        <!-- Right panel: facility status -->
        <footer role="contentinfo"><!-- Bottom bar: actions, terminal --></footer>
      </aside>
    </main>
  </nav>
</header>
```

#### 5.2.4 Live Regions

| Region                  | `aria-live` | `aria-atomic` | Content                                        |
| ----------------------- | ----------- | ------------- | ---------------------------------------------- |
| Threat level            | `assertive` | `true`        | Full threat level description                  |
| Resource meters         | `polite`    | `false`       | Only changed values                            |
| Action confirmations    | `polite`    | `true`        | "Request approved" / "Request denied"          |
| Breach alerts           | `assertive` | `true`        | "Security breach detected. Operations locked." |
| New email notifications | `polite`    | `true`        | "New request from [sender]"                    |
| Terminal output         | `polite`    | `false`       | Latest command output                          |

### 5.3 Keyboard-Only Navigation

#### 5.3.1 Tab Order

The tab order follows a predictable, logical path through the interface:

1. Skip-to-content link (hidden until focused).
2. Top bar elements (threat level, funds --- read-only, focusable for screen readers).
3. Left panel (inbox categories, then inbox items).
4. Center panel (document content, interactive elements within documents, attachments).
5. Right panel (resource meters --- read-only, focusable for screen readers).
6. Bottom bar (action buttons: Approve, Deny, Flag, Tools dropdown).
7. Terminal input.

#### 5.3.2 Keyboard Shortcuts

| Shortcut            | Action                                | Context                             |
| ------------------- | ------------------------------------- | ----------------------------------- |
| `Tab` / `Shift+Tab` | Move focus forward / backward         | Global                              |
| `Enter` / `Space`   | Activate focused element              | Global                              |
| `Esc`               | Close modal / panel / dismiss tooltip | Global                              |
| `Arrow Up/Down`     | Navigate inbox items                  | Inbox panel                         |
| `Arrow Left/Right`  | Navigate document tabs / attachments  | Document viewer                     |
| `A`                 | Approve current request               | Document viewer (when request open) |
| `D`                 | Deny current request                  | Document viewer (when request open) |
| `F`                 | Flag current request                  | Document viewer (when request open) |
| `S`                 | Open search                           | Global                              |
| `T`                 | Toggle terminal                       | Global                              |
| `I`                 | Focus inbox                           | Global                              |
| `R`                 | Focus facility status (resources)     | Global                              |
| `?`                 | Open keyboard shortcut reference      | Global                              |
| `1-5`               | Quick-navigate to inbox categories    | Inbox panel                         |

All single-key shortcuts are disabled when focus is in a text input field (terminal, search, annotation). Shortcuts are customizable in settings.

#### 5.3.3 Focus Management

- **Modal dialogs** trap focus and return focus to the triggering element on close.
- **Panel switches** move focus to the first interactive element in the new panel.
- **Dynamic content** (new emails arriving, threat level changes) does not steal focus. They are announced via live regions.
- **Confirmation dialogs** receive focus on open. Cancel is the default focused button (prevent accidental confirms).

### 5.4 Color Blind Modes

#### 5.4.1 Mode Definitions

The application provides four color modes accessible from Settings > Accessibility > Color Vision:

| Mode             | Description                                                    | Palette Source                                                           |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Default**      | Full color palette                                             | Standard design tokens                                                   |
| **Protanopia**   | Red-blind. Reds appear dark/greenish.                          | Palette optimized to avoid red-green confusion. Uses blue-yellow axis.   |
| **Deuteranopia** | Green-blind. Greens appear brownish/reddish. Most common type. | Palette optimized to avoid red-green confusion. Uses blue-orange axis.   |
| **Tritanopia**   | Blue-blind. Blues appear greenish, yellows appear pinkish.     | Palette avoids blue-green and yellow-pink confusion. Uses red-blue axis. |

#### 5.4.2 Color-Blind Safe Palette

Based on the Wong (2011) palette, widely validated for color-blind safety:

| Semantic | Default              | Protanopia     | Deuteranopia   | Tritanopia |
| -------- | -------------------- | -------------- | -------------- | ---------- |
| Safe     | #009E73 (Teal)       | #009E73        | #009E73        | #009E73    |
| Warning  | #F0E442 (Yellow)     | #F0E442        | #E69F00        | #E69F00    |
| Danger   | #D55E00 (Vermillion) | #0072B2 (Blue) | #0072B2 (Blue) | #D55E00    |
| Info     | #0072B2 (Blue)       | #56B4E9 (Sky)  | #56B4E9 (Sky)  | #0072B2    |
| Critical | #CC79A7 (Pink)       | #CC79A7        | #CC79A7        | #CC79A7    |

#### 5.4.3 Redundant Encoding

All color-coded elements also use at least one non-color signal:

| Element              | Color Signal            | Secondary Signal                     | Tertiary Signal            |
| -------------------- | ----------------------- | ------------------------------------ | -------------------------- |
| Threat level         | Background color        | Text label (LOW/HIGH/etc.)           | Icon state (shield damage) |
| Resource meters      | Bar color               | Numeric value                        | Warning icon at thresholds |
| Inbox items          | Left border color       | Badge icon                           | Text label in metadata     |
| Trust signals        | Background/border color | Border pattern (solid/dashed/wavy)   | Text label                 |
| Action confirmations | Text color              | Icon (check/X)                       | Toast message text         |
| Report charts        | Line/bar color          | Pattern fills (solid/striped/dotted) | Data labels                |

### 5.5 High Contrast Mode

#### 5.5.1 Implementation

High contrast mode is available from Settings > Accessibility > High Contrast, and also respects the operating system's `prefers-contrast: more` media query.

**Game Interface (High Contrast):**

| Element         | Default                      | High Contrast                           |
| --------------- | ---------------------------- | --------------------------------------- |
| Background      | #0a0e14 (near-black)         | #000000 (pure black)                    |
| Primary text    | #33ff33 (phosphor green)     | #ffffff (white)                         |
| Secondary text  | #88aa88 (muted green)        | #ffffff (white)                         |
| Borders         | #334433 (dark green)         | #ffffff (white)                         |
| Action buttons  | Semi-transparent backgrounds | Solid white borders, high-contrast text |
| Focus indicator | 2px green outline            | 3px white outline with 2px black offset |
| CRT effects     | Active                       | Disabled                                |
| Scanlines       | Active                       | Disabled                                |
| Glow effects    | Active                       | Disabled                                |

**Enterprise Interface (High Contrast):**

| Element         | Default          | High Contrast                            |
| --------------- | ---------------- | ---------------------------------------- |
| Background      | #ffffff          | #000000                                  |
| Text            | #212529          | #ffffff                                  |
| Borders         | #dee2e6          | #ffffff                                  |
| Links           | #0d6efd          | #00ccff (bright cyan)                    |
| Focus indicator | 2px blue outline | 3px yellow outline with 2px black offset |

#### 5.5.2 Contrast Ratios

| Element Type                   | WCAG AA (Minimum) | WCAG AAA (Target) | High Contrast Mode    |
| ------------------------------ | ----------------- | ----------------- | --------------------- |
| Normal text                    | 4.5:1             | 7:1               | 21:1 (white on black) |
| Large text (18px+ bold, 24px+) | 3:1               | 4.5:1             | 21:1                  |
| UI components / graphics       | 3:1               | N/A               | 21:1                  |
| Focus indicators               | 3:1               | N/A               | 21:1                  |

### 5.6 Adjustable Text Size

#### 5.6.1 Implementation

- All font sizes are defined in `rem` units, relative to a root font size.
- The root font size is adjustable from Settings > Accessibility > Text Size (range: 12px to 32px, default 16px).
- The setting is also applied via a CSS custom property (`--base-font-size`) on the root element.
- The application respects the browser's font size setting and scales accordingly.
- At 200% zoom (32px base), the layout reflows. Side panels collapse to preserve center panel readability.
- No text is clipped or hidden at any supported size.
- Minimum touch target size scales with text size (48px at default, proportionally larger at larger sizes).

#### 5.6.2 Text Size Presets

| Preset      | Root Size | Scale Factor | Use Case                                  |
| ----------- | --------- | ------------ | ----------------------------------------- |
| Small       | 12px      | 0.75x        | High information density (advanced users) |
| Default     | 16px      | 1.0x         | Standard                                  |
| Large       | 20px      | 1.25x        | Mild visual impairment                    |
| Extra Large | 24px      | 1.5x         | Moderate visual impairment                |
| Maximum     | 32px      | 2.0x         | Severe visual impairment                  |

### 5.7 Reduced Motion

#### 5.7.1 Implementation

Reduced motion mode is available from Settings > Accessibility > Reduce Motion, and also respects `prefers-reduced-motion: reduce`.

**Affected Animations:**

| Animation               | Default Behavior             | Reduced Motion Behavior                      |
| ----------------------- | ---------------------------- | -------------------------------------------- |
| CRT scanlines           | Animated scroll              | Static overlay or removed                    |
| Text type-on effect     | Characters appear one by one | Text appears instantly                       |
| Screen flicker (breach) | Rapid brightness changes     | Single brief dim, then static                |
| Glow pulsing            | Subtle pulsation             | Static glow or removed                       |
| Noise texture           | Animated noise               | Static texture or removed                    |
| Toast notifications     | Slide in from edge           | Appear in place (opacity only, if permitted) |
| Panel transitions       | Slide / expand animations    | Instant show/hide                            |
| Loading indicators      | Spinning/pulsing             | Static indicator with text "Loading..."      |
| Chart animations        | Animated draw-in             | Charts render fully immediately              |
| Button hover effects    | Scale/color transitions      | Instant state change                         |
| Inbox item arrival      | Slide-in animation           | Appears in place                             |

#### 5.7.2 Motion Severity Levels

Rather than a simple on/off toggle, the application provides three motion levels:

| Level       | Description                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Full**    | All animations active                                                                        |
| **Reduced** | Essential transitions only (panel switching, focus movement). Decorative animations removed. |
| **None**    | No animations whatsoever. All state changes are instant.                                     |

### 5.8 Closed Captions

#### 5.8.1 Audio Content Inventory

| Audio Type             | Description                                                             | Caption Strategy                                                              |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Ambient soundscape** | Background hum of the data center. Changes with threat level.           | Captioned as `[Data center ambient: calm]` or `[Data center ambient: tense]`. |
| **Alert sounds**       | New email chime, breach alarm, action confirmation.                     | Captioned as `[New email received]`, `[BREACH ALARM]`, `[Request approved]`.  |
| **Narrative audio**    | Voice-acted story moments (if implemented).                             | Full text captions synchronized to audio.                                     |
| **NPC messages**       | SYSOP-7 text messages (primarily text-based, but may have audio tones). | Already text-based. Audio tone captioned as `[Message tone]`.                 |

#### 5.8.2 Caption Display

- Captions appear in a dedicated caption area at the bottom of the screen (above the action bar).
- Caption area has a semi-transparent dark background for readability.
- Caption text uses a high-contrast, sans-serif font.
- Caption size is adjustable (Small, Medium, Large).
- Caption position is configurable (Bottom, Top).
- Captions can be toggled from Settings > Accessibility > Captions and from a quick-access button in the top bar.

#### 5.8.3 Visual Sound Indicators

For deaf and hard-of-hearing players, sound events are also represented visually:

| Sound Event               | Visual Indicator                                                              |
| ------------------------- | ----------------------------------------------------------------------------- |
| New email                 | Inbox badge count increments, left panel border flash                         |
| Breach alarm              | Screen border turns red, "BREACH" banner appears                              |
| Threat level change       | Threat level indicator updates with animation (or instant, in reduced motion) |
| Action confirmation       | Button state change + toast notification                                      |
| Background ambience shift | Subtle background color temperature shift                                     |

### 5.9 Cognitive Accessibility

#### 5.9.1 Clear Language

- All in-game text is written at a Grade 8 reading level maximum (Flesch-Kincaid).
- Technical jargon is used only when it is part of the learning objective (e.g., "phishing" is a term the player is meant to learn, but it is always introduced in context).
- Instructions use short sentences and active voice.
- Error messages explain what happened and what to do next, in plain language.
- Numbers use appropriate formatting (EUR 12,450 not EUR 12450 or 12450 EUR).

#### 5.9.2 Consistent Patterns

- The same action is always in the same position (Approve is always left, Deny is always center-left, Flag is always center-right).
- Navigation patterns do not change between views.
- Icons are always paired with text labels (icon-only buttons are not used except where universally understood, e.g., close "X").
- Confirmation patterns are consistent: all irreversible actions use the same dialog style.

#### 5.9.3 Cognitive Load Management

- **Information chunking:** Complex documents are broken into sections with clear headings.
- **Progressive disclosure:** Advanced information is hidden behind expandable sections, visible on demand.
- **Task focus:** The center panel shows one document at a time by default. Comparison mode is opt-in.
- **Status persistence:** If the player leaves and returns, the game state is preserved exactly. No re-reading required.
- **Undo support:** Flag and archive actions are reversible. Approve and deny require confirmation.
- **Clear hierarchy:** Visual hierarchy (size, weight, color) consistently signals importance.
- **Meaningful defaults:** Form fields and settings have sensible defaults. Players do not need to configure to start.

#### 5.9.4 Reading Support

- **Text-to-speech:** An optional "read aloud" button on documents activates browser-native or system TTS for the selected document.
- **Dyslexia-friendly font option:** OpenDyslexic or similar available in Settings > Accessibility > Font.
- **Line spacing adjustment:** Independent of text size, line spacing can be increased (1.5x, 2.0x).
- **Reading ruler:** An optional semi-transparent overlay that highlights the current line of text, following cursor/focus position.

### 5.10 Motor Accessibility

#### 5.10.1 Adjustable Timing

- No time limits on individual decisions.
- Event timers (ransom deadlines) can be extended or paused in accessibility settings.
- Queue buildup rate is adjustable (Slow, Normal, Fast) to reduce time pressure.
- Double-click speed threshold is adjustable.
- Long-press duration is adjustable.

#### 5.10.2 Large Click Targets

- All interactive elements have a minimum target size of 44x44 CSS pixels (WCAG 2.5.5 AAA recommendation).
- Touch targets on mobile are minimum 48x48 CSS pixels.
- Spacing between adjacent targets is a minimum of 8px.
- Action buttons (Approve, Deny, Flag) are oversized by design (minimum 120x44px) and well-separated.

#### 5.10.3 Alternative Input Support

- Full keyboard support (see 5.3).
- Voice control compatibility (semantic HTML and ARIA labels enable voice control software to identify and activate elements).
- Switch access compatibility (logical tab order, no rapid input requirements).
- Head tracking / eye tracking compatibility (large targets, no hover-dependent functionality --- hover reveals are also available via focus).
- Sticky keys / filter keys support (no rapid key sequences required).
- Single-switch scanning mode (optional setting that enables sequential focus movement with a single switch input).

#### 5.10.4 Drag-and-Drop Alternatives

If any drag-and-drop interactions are implemented (e.g., rearranging documents, adjusting panel sizes):

- Every drag-and-drop action has a keyboard alternative (arrow keys to move, Enter to confirm placement).
- Every drag-and-drop action has a click/tap alternative (select source, click destination).
- Drag handles are large (minimum 44x44px) and visually distinct.

---

## 6. Responsive Design

### 6.1 Design Philosophy

The DMZ: Archive Gate is a **desktop-first** experience. The game involves reading documents, comparing details, and making precise decisions --- all tasks that benefit from screen real estate. However, the application must be usable on tablets and phones for flexibility (e.g., a quick session on a commute).

### 6.2 Breakpoint System

| Breakpoint | Name             | Width           | Target Devices                      |
| ---------- | ---------------- | --------------- | ----------------------------------- |
| XL         | Desktop Large    | 1440px+         | Large monitors, ultrawide           |
| LG         | Desktop Standard | 1024px - 1439px | Standard laptops, monitors          |
| MD         | Tablet           | 768px - 1023px  | iPad, Android tablets (landscape)   |
| SM         | Tablet Small     | 600px - 767px   | Small tablets, iPad mini (portrait) |
| XS         | Mobile           | 320px - 599px   | Phones                              |

### 6.3 Desktop Layout (1024px+)

The full three-panel layout as described in Section 2.1.1:

- **Left panel:** 250px fixed width, collapsible.
- **Center panel:** Flexible, takes remaining space.
- **Right panel:** 220px fixed width, collapsible.
- **Top bar:** Full width, fixed position.
- **Bottom bar:** Full width, fixed position.

All document types render in full fidelity. Comparison mode (side-by-side documents) is available. Terminal overlay can display alongside the workspace (split view).

### 6.4 Tablet Layout (768px - 1023px)

The layout adapts to a **two-panel** system:

```
+------------------------------------------+
|  [STATUS BAR - condensed]                |
+------------------------------------------+
|          |                                |
|  INBOX   |  DOCUMENT VIEWER              |
|  (narrow)|  (expanded)                   |
|          |                                |
+----------+-------------------------------+
|  [ACTION BAR]                            |
+------------------------------------------+
```

**Adaptations:**

- Right panel (facility status) collapses into a slide-out drawer, accessible via a toggle button in the top bar.
- Left panel (inbox) narrows to show sender name and risk indicator only. Full details appear on select.
- Comparison mode stacks documents vertically instead of side-by-side.
- Terminal overlay takes full screen.
- Touch-optimized: larger tap targets, swipe gestures for inbox navigation.

### 6.5 Mobile Layout (320px - 767px)

The layout becomes a **single-panel** system with navigation:

```
+------------------------------------------+
|  [STATUS BAR - minimal]                  |
+------------------------------------------+
|                                          |
|  [CURRENT VIEW]                          |
|  (Full-screen: Inbox OR Document OR      |
|   Facility Status)                       |
|                                          |
+------------------------------------------+
|  [TAB BAR: Inbox | Doc | Status | More]  |
+------------------------------------------+
```

**Adaptations:**

- Only one panel visible at a time, switched via bottom tab bar.
- Top bar shows only threat level icon (with label on tap), day number, and funds.
- Inbox items show sender and subject only. Tap to open full document.
- Documents scroll vertically. Attachments are collapsible sections.
- Action buttons (Approve/Deny/Flag) appear as a floating bottom bar when viewing a request.
- Terminal is a separate full-screen view.
- Comparison mode is not available (screen too small). Documents can be bookmarked for quick switching.
- Resource meters are in the "Status" tab, displayed as a simple list.

### 6.6 Touch vs. Mouse/Keyboard Input

#### 6.6.1 Input Detection

The application detects the input method on interaction:

- **Mouse users:** Get hover states, precise click targets, cursor changes, right-click context menus.
- **Touch users:** Get larger tap targets, swipe gestures, long-press context menus, no hover-dependent information.
- **Keyboard users:** Get visible focus indicators, keyboard shortcuts, skip links.

Detection uses the `pointer` and `hover` CSS media queries, supplemented by JavaScript input type detection on first interaction.

```css
/* Fine pointer (mouse) */
@media (pointer: fine) and (hover: hover) {
  .interactive {
    min-height: 32px;
  }
  .tooltip {
    display: block;
  } /* on hover */
}

/* Coarse pointer (touch) */
@media (pointer: coarse) {
  .interactive {
    min-height: 48px;
    min-width: 48px;
  }
  .tooltip {
    display: none;
  } /* use long-press or info button instead */
}
```

#### 6.6.2 Gesture Support (Touch)

| Gesture          | Action                              | Context                |
| ---------------- | ----------------------------------- | ---------------------- |
| Tap              | Select / activate                   | Global                 |
| Long press       | Context menu / inspect              | Documents, inbox items |
| Swipe left       | Deny request (with confirmation)    | Inbox item             |
| Swipe right      | Approve request (with confirmation) | Inbox item             |
| Swipe down       | Refresh / pull new emails           | Inbox list             |
| Pinch zoom       | Zoom document content               | Document viewer        |
| Two-finger swipe | Navigate between panels             | Global (tablet)        |

All gesture actions have button-based alternatives.

#### 6.6.3 Enterprise Interface Responsiveness

The admin dashboard follows standard responsive SaaS patterns:

- **Desktop:** Full sidebar + content layout.
- **Tablet:** Sidebar collapses to hamburger menu. Content takes full width.
- **Mobile:** Bottom tab bar navigation. Cards stack vertically. Data tables become card-based lists. Charts simplify (fewer data points, larger labels).

---

## 7. Onboarding UX

### 7.1 Game Onboarding: The Opening Chapter

The tutorial is not a tutorial. It is Day 1 of the player's employment at Matrices GmbH. Every teaching moment is framed as a workplace orientation.

#### 7.1.1 Day 1: Orientation

**Narrative Setup:**

```
SECURE MAIL TERMINAL v4.7
MATRICES GmbH | DMZ OPERATIONS CENTER

SYSTEM: Welcome, new Operator.
SYSTEM: Your terminal has been activated.
SYSTEM: Morpheus has authorized your access to the intake queue.

SYSOP-7: Hey, fresh one. Keep it simple today. Read the emails.
         Check the details. Approve or deny. Do not overthink it.

SYSOP-7: You have 3 requests waiting. Start with the easy ones.
```

**Gameplay:**

- Player sees 3 requests. Two are obviously legitimate (clear names, matching domains, reasonable requests). One has a minor red flag (slightly off domain).
- The interface shows only: Inbox (left), Document Viewer (center), Approve/Deny (bottom).
- No resource meters yet. No threat level. No upgrades. No terminal.
- The player processes the requests at their own pace.

**Teaching Moments:**

- Reading an email carefully before acting.
- Noticing details (sender domain, request specifics).
- Making a binary decision (approve/deny) based on available information.

**Feedback:**

- If the player approves the suspicious request: SYSOP-7 messages later that day. `SYSOP-7: That third request... domain looked a little off. Keep an eye out.` No penalty on Day 1.
- If the player denies the suspicious request: SYSOP-7: `SYSOP-7: Good catch on that third one. You will fit in here.`

#### 7.1.2 Day 2: The Queue

**New Elements Introduced:**

- More requests (5 instead of 3).
- The "Flag for Review" button appears. SYSOP-7 explains: `SYSOP-7: New tool for you. If you are not sure about one, flag it. I will take a look later.`
- Facility status panel appears on the right (but only shows rack space).

**Teaching Moments:**

- Triaging under increased volume.
- Using the "unsure" option instead of guessing.
- Awareness of resource constraints (rack space).

#### 7.1.3 Day 3: First Contact

**New Elements Introduced:**

- The first clearly malicious email arrives. It has a urgency-laden subject, a recently registered domain, and a vague "verification" attachment.
- The full resource panel appears (racks, power, cooling, bandwidth).
- The threat level indicator appears for the first time, set to GUARDED.

**Teaching Moments:**

- Recognizing phishing patterns (urgency, suspicious domains, vague attachments).
- Understanding that resources are finite and every approval has a cost.
- Awareness of the threat level as a system-wide indicator.

**If the player approves the malicious email:**

- First breach event (but with reduced consequences --- Morpheus covers the ransom as a "new employee exception"). The incident report is the teaching tool.

#### 7.1.4 Days 4-7: Foundation

Over the next several days, systems unlock organically:

- Day 4: Verification tools unlock.
- Day 5: Financial overview appears.
- Day 6: The upgrade shop opens.
- Day 7: Flagged review queue becomes self-managed (SYSOP-7 stops reviewing flagged items for you).

Each unlock is accompanied by a brief SYSOP-7 message explaining the new tool in character.

### 7.2 Tutorial Pacing Principles

| Principle               | Implementation                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Show, do not tell**   | No tutorial popups with arrows pointing at buttons. SYSOP-7 messages are conversational, not instructional.                                       |
| **Learn by doing**      | The player processes real (game-world) requests from Day 1. The tutorial IS the game.                                                             |
| **Safe to fail**        | Day 1-3 have reduced consequences. The player can make mistakes without feeling punished.                                                         |
| **One thing at a time** | Each day introduces at most one new system or concept.                                                                                            |
| **Natural motivation**  | Systems unlock because the narrative demands them ("Revenue is up, here is a budget for upgrades") not because "you have completed the tutorial." |
| **Respect the player**  | No forced hand-holding. If the player clicks around and figures things out before SYSOP-7 explains, great.                                        |

### 7.3 Skip Option for Experienced Players

Players who have completed the game before, or who are starting a new campaign at an advanced level:

- On account creation or campaign assignment, the player can select "Experienced Operator."
- This skips to Day 4 with all basic systems unlocked.
- A one-time message from SYSOP-7: `SYSOP-7: Morpheus said you have done this before. Terminal is fully active. Good luck.`
- Admin-configurable: Enterprise admins can allow or disallow the skip option per campaign.

### 7.4 Enterprise Onboarding: Admin Setup Wizard

When an organization first deploys the platform, the primary admin goes through a setup wizard:

#### 7.4.1 Setup Wizard Steps

**Step 1: Organization Profile**

- Company name, logo, and branding.
- Industry (affects default scenario selection).
- Size (affects default campaign scale).

**Step 2: Admin Account**

- Name, email, role.
- Multi-factor authentication setup.
- Terms of service acceptance.

**Step 3: User Import**

- CSV upload or directory integration (Azure AD, Okta, Google Workspace).
- User grouping (by department, role, location).
- Preview and confirm import.

**Step 4: First Campaign**

- Campaign template selection or custom creation.
- Target audience selection.
- Schedule configuration.
- Notification preferences.

**Step 5: Review & Launch**

- Summary of all settings.
- "Launch Campaign" button.
- Post-launch: Redirect to the campaign dashboard.

#### 7.4.2 Wizard Design

- Progress indicator at the top (step 1 of 5, step 2 of 5, etc.).
- Back/Next navigation with form validation on Next.
- Save and exit at any point (resume where left off).
- Help tooltips on each field.
- "Need help?" link to documentation on each step.
- The wizard can be re-entered from Settings to modify any step.
- Estimated time to complete: 10-15 minutes.

#### 7.4.3 Post-Setup Guided Tour

After the setup wizard, the admin is offered an optional guided tour of the dashboard:

- Highlights each section of the sidebar navigation.
- Shows where to find key features (campaign management, user list, reports).
- Points out the help center and support channels.
- Can be skipped or dismissed at any time.
- Can be re-triggered from Help > Tour.

---

## 8. Design System & Component Library

### 8.1 Component Taxonomy

The application requires two component sets: **Game Components** (terminal aesthetic) and **Admin Components** (clean SaaS aesthetic).

#### 8.1.1 Game Components

| Component           | Description                                               | Key Props                                                        |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| `TerminalPanel`     | Container with terminal-styled border, optional title bar | `title`, `collapsible`, `collapsed`                              |
| `EmailMessage`      | Renders an email with header, body, attachments           | `email`, `onApprove`, `onDeny`, `onFlag`                         |
| `DocumentViewer`    | Renders any document type with appropriate layout         | `document`, `type`, `annotatable`                                |
| `ResourceMeter`     | Horizontal bar meter with value and label                 | `label`, `value`, `max`, `warningThreshold`, `criticalThreshold` |
| `ThreatIndicator`   | Multi-signal threat level display                         | `level`, `showLabel`, `showIcon`, `showBar`                      |
| `InboxList`         | Scrollable list of inbox items                            | `items`, `onSelect`, `filter`, `sort`                            |
| `InboxItem`         | Single inbox list item                                    | `email`, `selected`, `unread`, `riskLevel`                       |
| `ActionBar`         | Bottom bar with contextual action buttons                 | `actions`, `context`                                             |
| `TerminalInput`     | Command-line style text input                             | `onCommand`, `history`, `prompt`                                 |
| `ToastNotification` | In-world notification popup                               | `message`, `type`, `duration`, `dismissible`                     |
| `ConfirmDialog`     | Confirmation modal for irreversible actions               | `title`, `message`, `onConfirm`, `onCancel`                      |
| `StampAnimation`    | Approve/deny stamp visual feedback                        | `type` (approve/deny), `onComplete`                              |
| `ComparisonView`    | Side-by-side document comparison                          | `documentA`, `documentB`                                         |
| `FundsDisplay`      | Animated funds counter                                    | `amount`, `change`                                               |
| `DayCounter`        | Current day display                                       | `day`, `time`                                                    |
| `RansomNote`        | Full-screen breach overlay                                | `amount`, `deadline`, `onPay`                                    |

#### 8.1.2 Admin Components

| Component         | Description                                         | Key Props                                               |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `AdminCard`       | Metric display card with trend indicator            | `title`, `value`, `trend`, `onClick`                    |
| `DataTable`       | Sortable, filterable, paginated data table          | `columns`, `data`, `onSort`, `onFilter`, `onPageChange` |
| `ChartWidget`     | Wrapper for chart rendering (line, bar, pie, radar) | `type`, `data`, `accessibleTable`                       |
| `WizardStepper`   | Multi-step wizard with progress indicator           | `steps`, `currentStep`, `onNext`, `onBack`              |
| `ReportBuilder`   | Report configuration form                           | `config`, `onGenerate`, `onSchedule`                    |
| `CampaignCard`    | Campaign summary card                               | `campaign`, `onClick`                                   |
| `UserProfile`     | User detail view with tabs                          | `user`, `tabs`                                          |
| `ActivityFeed`    | Chronological event feed                            | `events`, `filter`, `onLoadMore`                        |
| `SidebarNav`      | Sidebar navigation with collapsible sections        | `items`, `activeItem`, `collapsed`                      |
| `BulkActionBar`   | Contextual bar for bulk operations                  | `selectedCount`, `actions`                              |
| `DateRangePicker` | Date range selector for reports                     | `startDate`, `endDate`, `presets`                       |
| `FilterBar`       | Horizontal filter bar with dropdowns                | `filters`, `activeFilters`, `onFilterChange`            |
| `EmptyState`      | Placeholder for empty data views                    | `title`, `description`, `action`                        |
| `AlertBanner`     | Page-level alert banner                             | `type`, `message`, `dismissible`                        |

### 8.2 Design Tokens (Game Interface)

| Token                     | Value                                    | Description                             |
| ------------------------- | ---------------------------------------- | --------------------------------------- |
| `--game-bg-primary`       | #0a0e14                                  | Main background                         |
| `--game-bg-secondary`     | #141a22                                  | Panel backgrounds                       |
| `--game-bg-tertiary`      | #1e2832                                  | Elevated surfaces                       |
| `--game-text-primary`     | #33ff33                                  | Primary terminal text (phosphor green)  |
| `--game-text-secondary`   | #88aa88                                  | Secondary/muted text                    |
| `--game-text-document`    | #e0e0e0                                  | Document body text (higher readability) |
| `--game-text-heading`     | #ffb000                                  | Section headings (amber)                |
| `--game-border`           | #334433                                  | Panel borders                           |
| `--game-accent`           | #33ff33                                  | Interactive element accent              |
| `--game-font-mono`        | 'JetBrains Mono', 'Fira Code', monospace | Terminal/UI text                        |
| `--game-font-body`        | 'IBM Plex Sans', 'Inter', sans-serif     | Document body text                      |
| `--game-radius`           | 0px                                      | Sharp corners (terminal aesthetic)      |
| `--game-shadow`           | none                                     | No shadows (flat terminal aesthetic)    |
| `--game-scanline-opacity` | 0.05                                     | CRT scanline overlay opacity            |
| `--game-glow-radius`      | 4px                                      | Text glow spread                        |

### 8.3 Icon System

Icons use a consistent line-art style that works in both the terminal aesthetic (game) and clean aesthetic (admin).

- **Game icons:** Monochrome, line-drawn, slightly pixelated at small sizes to match the terminal aesthetic. Use the primary text color.
- **Admin icons:** Standard line icons (e.g., Lucide, Phosphor, or Heroicons). Use the text-secondary color, accent color for active states.
- All icons are SVGs with `aria-hidden="true"` when paired with text labels, or with `aria-label` when standalone.
- Icon size: minimum 16x16px, touch-target icons minimum 24x24px (within a 44x44px tap area).

---

## 9. Performance & Technical Constraints

### 9.1 Performance Budgets

| Metric                         | Target           | Measurement                 |
| ------------------------------ | ---------------- | --------------------------- |
| First Contentful Paint (FCP)   | < 1.5s           | Lighthouse on 4G throttling |
| Largest Contentful Paint (LCP) | < 2.5s           | Lighthouse on 4G throttling |
| Cumulative Layout Shift (CLS)  | < 0.1            | Lighthouse                  |
| First Input Delay (FID)        | < 100ms          | Chrome UX Report            |
| Time to Interactive (TTI)      | < 3.5s           | Lighthouse on 4G throttling |
| Total Bundle Size (initial)    | < 500 KB gzipped | Webpack analysis            |
| Animation Frame Rate           | 60 fps           | Browser dev tools           |

### 9.2 Accessibility Performance

- Screen reader response time: < 200ms for live region updates.
- Focus management: < 100ms for focus movement after panel switches.
- Text reflow: No layout shift on text size change (use CSS transitions).
- High contrast mode switch: < 500ms, no page reload.
- Color mode switch: < 500ms, no page reload.

### 9.3 Progressive Enhancement

The application follows progressive enhancement principles:

1. **HTML Foundation:** Semantic HTML that is navigable and functional without CSS or JavaScript.
2. **CSS Enhancement:** Layout, color, typography, and basic interactivity (hover states, transitions).
3. **JavaScript Enhancement:** Dynamic interactions, game logic, real-time updates, CRT effects.
4. **WebGL/Canvas Enhancement (optional):** Advanced visual effects for capable devices. These are purely cosmetic and degrade gracefully.

If JavaScript fails to load, the user sees a meaningful error page explaining that JavaScript is required and providing alternative training options (PDF-based materials).

---

## 10. Appendices

### Appendix A: Accessibility Testing Protocol

#### A.1 Automated Testing

- Run axe-core or Lighthouse accessibility audit on every page/view.
- Integrate automated accessibility testing into CI/CD pipeline.
- Target: zero critical or serious axe violations.

#### A.2 Manual Testing Checklist

| Test                                           | Tool                                   | Frequency           |
| ---------------------------------------------- | -------------------------------------- | ------------------- |
| Keyboard-only navigation                       | Manual                                 | Every sprint        |
| Screen reader walkthrough (NVDA + Firefox)     | Manual                                 | Every sprint        |
| Screen reader walkthrough (VoiceOver + Safari) | Manual                                 | Every sprint        |
| Color contrast verification                    | Colour Contrast Analyser               | Every sprint        |
| Color blind simulation                         | Sim Daltonism or browser dev tools     | Every release       |
| High contrast mode verification                | Manual                                 | Every release       |
| Reduced motion verification                    | Manual (toggle prefers-reduced-motion) | Every release       |
| Text zoom to 200%                              | Manual (browser zoom)                  | Every release       |
| Mobile screen reader (TalkBack, VoiceOver)     | Manual                                 | Every major release |
| Cognitive walkthrough (plain language review)  | Manual                                 | Every major release |

#### A.3 User Testing

- Include users with disabilities in usability testing.
- Minimum: 2 screen reader users, 2 keyboard-only users, 1 user with color vision deficiency per major release cycle.
- Test both game and admin interfaces.

### Appendix B: Color Palette Reference

#### B.1 Game Palette (Default)

| Swatch            | Hex     | Usage                         |
| ----------------- | ------- | ----------------------------- |
| Background        | #0a0e14 | Main background               |
| Surface           | #141a22 | Panels, cards                 |
| Elevated          | #1e2832 | Active states, selected items |
| Phosphor Green    | #33ff33 | Primary UI text               |
| Amber             | #ffb000 | Headings, warnings            |
| Document White    | #e0e0e0 | Document body text            |
| Muted Green       | #88aa88 | Secondary text                |
| Border Green      | #334433 | Borders, dividers             |
| Safe Teal         | #009E73 | Approved, low risk            |
| Warning Yellow    | #F0E442 | Caution, medium risk          |
| Danger Vermillion | #D55E00 | Denied, high risk             |
| Info Blue         | #0072B2 | Informational, neutral        |
| Critical Pink     | #CC79A7 | Critical, breach              |

#### B.2 Enterprise Palette (Light Mode)

| Swatch     | Hex     | Usage                |
| ---------- | ------- | -------------------- |
| White      | #ffffff | Background           |
| Gray 50    | #f8f9fa | Secondary background |
| Gray 900   | #212529 | Primary text         |
| Gray 500   | #6c757d | Secondary text       |
| Blue 600   | #0d6efd | Primary accent       |
| Green 600  | #198754 | Success              |
| Yellow 500 | #ffc107 | Warning              |
| Red 600    | #dc3545 | Danger               |
| Gray 300   | #dee2e6 | Borders              |

### Appendix C: Keyboard Shortcut Reference Card

```
+----------------------------------------------------------+
|  THE DMZ: ARCHIVE GATE - KEYBOARD SHORTCUTS              |
+----------------------------------------------------------+
|                                                          |
|  NAVIGATION                                              |
|  Tab / Shift+Tab     Move focus forward / backward       |
|  I                   Focus inbox                         |
|  R                   Focus facility status               |
|  S                   Open search                         |
|  T                   Toggle terminal                     |
|  1-5                 Inbox categories                    |
|  ?                   Show this reference                 |
|                                                          |
|  DOCUMENT ACTIONS                                        |
|  A                   Approve current request             |
|  D                   Deny current request                |
|  F                   Flag for review                     |
|  Arrow Up/Down       Navigate inbox items                |
|  Arrow Left/Right    Navigate tabs / attachments         |
|  Enter / Space       Activate focused element            |
|  Esc                 Close modal / panel / tooltip        |
|                                                          |
|  ACCESSIBILITY                                           |
|  Ctrl + +/-          Zoom in / out (browser native)      |
|  Ctrl + 0            Reset zoom (browser native)         |
|                                                          |
|  All shortcuts disabled when typing in text fields.      |
|  Customize shortcuts in Settings > Keyboard.             |
+----------------------------------------------------------+
```

### Appendix D: Screen Reader Announcement Examples

**Opening the game:**

> "The DMZ: Archive Gate. Day 14. Threat level: Elevated, level 3 of 5. Funds: 12,450 euros. You have 7 pending requests."

**Selecting an inbox item:**

> "Email from Dr. Katarina Varga, Budapest Technical University. Subject: Emergency Data Recovery. Risk level: Medium. Unread. 3 attachments."

**Reading a resource meter:**

> "Rack space: 8 of 12 available. 67 percent."

**Approving a request:**

> "Request from Dr. Varga approved. Funds increased by 500 euros. Total funds: 12,950 euros."

**Breach event:**

> "Alert: Security breach detected. Operations locked. A ransom of 1,295 euros is demanded. Press Enter to view ransom note."

**Threat level change:**

> "Threat level changed to High, level 4 of 5."

### Appendix E: Responsive Layout Summary

| Feature            | Desktop (1024+)              | Tablet (768-1023)   | Mobile (320-767)         |
| ------------------ | ---------------------------- | ------------------- | ------------------------ |
| Panel layout       | 3-panel                      | 2-panel + drawer    | 1-panel + tabs           |
| Inbox detail       | Full metadata                | Sender + risk only  | Sender + subject only    |
| Comparison mode    | Side-by-side                 | Stacked             | Not available            |
| Terminal           | Inline + overlay             | Full-screen overlay | Full-screen tab          |
| Resource meters    | Always visible (right panel) | Drawer              | Status tab               |
| Action buttons     | Fixed bottom bar             | Fixed bottom bar    | Floating bottom bar      |
| Keyboard shortcuts | Full set                     | Reduced set         | Minimal (system keys)    |
| Touch gestures     | N/A                          | Swipe, pinch        | Swipe, pinch, long-press |
| CRT effects        | Full                         | Reduced             | Disabled                 |
| Text size default  | 16px                         | 16px                | 16px                     |

### Appendix F: WCAG 2.1 AA Compliance Matrix

| Principle      | Criteria Count  | Coverage                          |
| -------------- | --------------- | --------------------------------- |
| Perceivable    | 13 criteria     | All addressed (see Section 5.1.1) |
| Operable       | 12 criteria     | All addressed (see Section 5.1.1) |
| Understandable | 9 criteria      | All addressed (see Section 5.1.1) |
| Robust         | 3 criteria      | All addressed (see Section 5.1.1) |
| **Total**      | **37 criteria** | **Full coverage**                 |

Additional WCAG 2.1 AAA criteria targeted:

- 1.4.6 Contrast (Enhanced): 7:1 ratio in high contrast mode.
- 2.5.5 Target Size: 44x44px minimum for all interactive elements.
- 1.4.8 Visual Presentation: Adjustable foreground/background colors, line spacing, text width.

---

_Document prepared for The DMZ: Archive Gate development team. All specifications are subject to iteration based on user testing and technical feasibility assessment._

_This document should be reviewed alongside:_

- _BRD-01: Project Overview_
- _BRD-02: Game Design Document_
- _BRD-03: Technical Architecture_
- _BRD-14: Testing & QA Strategy_
