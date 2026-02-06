# BRD-06: Analytics, Reporting & ROI Measurement

**Project:** The DMZ: Archive Gate -- Cybersecurity Awareness Training Platform
**Document Type:** Business Requirements Document
**Document ID:** BRD-06
**Version:** 1.0
**Date:** 2026-02-05
**Status:** Draft
**Author:** Analytics & Data Strategy Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Training Effectiveness KPIs](#2-training-effectiveness-kpis)
3. [Reporting Dashboards](#3-reporting-dashboards)
4. [ROI Measurement Framework](#4-roi-measurement-framework)
5. [Game-Specific Analytics](#5-game-specific-analytics)
6. [Advanced Analytics](#6-advanced-analytics)
7. [Enterprise Reporting Integration](#7-enterprise-reporting-integration)
8. [Consumer Analytics](#8-consumer-analytics)
9. [Data Architecture for Analytics](#9-data-architecture-for-analytics)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

The DMZ: Archive Gate operates across two fundamentally different markets -- enterprise cybersecurity training (B2B) and consumer gaming (B2C) -- each with distinct analytics requirements, success metrics, and reporting audiences. This document defines the comprehensive analytics, reporting, and ROI measurement framework required to serve both markets from a unified data platform.

For enterprise customers, analytics must answer the question that justifies every dollar spent: _Is our workforce actually more secure than it was before we deployed this platform?_ CISOs, compliance officers, and board members need evidence -- not anecdotes -- that training is reducing phishing susceptibility, improving incident reporting rates, and generating measurable return on investment. Industry research consistently demonstrates that well-implemented security awareness training programs deliver extraordinary returns: KnowBe4 reports ROI of up to 50x, the Ponemon Institute calculates average savings of $1.4 million per organization from avoided incidents, and organizations running sustained training programs see phish-prone percentages decline from 34.3% to 4.6% over 12 months. The DMZ must capture, calculate, and present these outcomes with the rigor expected by enterprise buyers in regulated industries.

For the consumer market, analytics must drive product decisions: What keeps players engaged? Where do they churn? Which narrative paths produce the strongest learning outcomes? How does the game economy perform? Consumer analytics draw from the free-to-play gaming industry's mature analytical toolkit -- DAU/MAU ratios, retention curves, monetization funnels, viral coefficients -- while maintaining the platform's unique focus on measuring whether gameplay translates to real-world cybersecurity behavior change.

The unifying principle is that The DMZ generates analytics that no competitor can match. Traditional security awareness training platforms measure completion rates and quiz scores. The DMZ measures behavioral decisions under realistic pressure -- every email triaged, every access request adjudicated, every threat assessment made during gameplay constitutes a behavioral data point with direct analog to real-world security decisions. This behavioral richness is the platform's analytical moat.

### 1.1 Scope

This BRD covers:

- Training effectiveness key performance indicators and measurement methodology
- Dashboard specifications for all stakeholder roles
- ROI calculation models and evidence frameworks
- Game-specific engagement and learning analytics
- AI/ML-driven advanced analytics capabilities
- Enterprise reporting system integration requirements
- Consumer market analytics and growth metrics
- Underlying data architecture for the analytics platform

### 1.2 Audience

- Product Management
- Engineering (Data, Backend, Frontend, ML/AI)
- Sales Engineering and Solutions Architecture
- Customer Success and Professional Services
- Marketing and Growth
- Compliance and Legal

### 1.3 Success Criteria

| Metric                                     | Target                                |
| ------------------------------------------ | ------------------------------------- |
| Dashboard load time (standard reports)     | < 2 seconds (P95)                     |
| Dashboard load time (complex aggregations) | < 5 seconds (P95)                     |
| Real-time event processing latency         | < 30 seconds (event to dashboard)     |
| Scheduled report generation                | < 5 minutes (100K-user tenant)        |
| ROI calculator accuracy (backtested)       | Within 15% of actual observed savings |
| Data pipeline reliability                  | 99.95% (no silent data loss)          |
| Analytics API response time                | < 500ms (P95)                         |
| Compliance report generation for audit     | < 10 minutes                          |
| Historical data query range                | Minimum 3 years                       |
| Concurrent dashboard users per tenant      | 500+                                  |

---

## 2. Training Effectiveness KPIs

### 2.1 Overview

Training effectiveness measurement is the cornerstone of the enterprise value proposition. Every KPI defined in this section must be (a) automatically calculated from platform telemetry, (b) benchmarkable against industry standards, (c) presentable in a format suitable for board-level reporting, and (d) exportable for integration with GRC and SIEM platforms.

The DMZ's stealth-learning model offers a critical advantage: behavioral KPIs are measured through in-game actions (decisions made under pressure in realistic scenarios), not through self-reported surveys or multiple-choice quizzes completed in a compliant but disengaged state.

### 2.2 Phishing Susceptibility Metrics

Phishing remains the primary initial attack vector in the majority of successful breaches. The platform must track granular phishing susceptibility metrics that correlate in-game performance with simulated phishing campaign results.

#### 2.2.1 Core Phishing KPIs

| KPI                              | Definition                                                                                          | Measurement Method                                           | Industry Benchmark                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Phish-Prone Percentage (PPP)** | Percentage of users who click, reply, or interact with a simulated phishing email                   | Simulated phishing campaigns + in-game email triage failures | Baseline: 34.3% (KnowBe4 2024); Target after 12 months: < 5% |
| **Click Rate**                   | Percentage of delivered simulated phishing emails where the user clicked a link                     | Link tracking in simulation campaigns                        | Industry average: 17.8% (Proofpoint 2024)                    |
| **Credential Submission Rate**   | Percentage of clicked users who submitted credentials on a spoofed landing page                     | Landing page form submission tracking                        | Industry average: 4-8% of all recipients                     |
| **Attachment Open Rate**         | Percentage of users who opened a malicious attachment in simulation                                 | Attachment beacon tracking                                   | Industry average: 6-12%                                      |
| **Report Rate**                  | Percentage of users who correctly identified and reported a simulated phish using the report button | Report button / phish alert button telemetry                 | Best-in-class: 60%+; Industry average: 13% (Cofense 2024)    |
| **Time-to-Report**               | Median time between phishing email delivery and user report                                         | Timestamp delta calculation                                  | Target: < 5 minutes for trained users                        |
| **Miss Rate**                    | Percentage of simulated phishes that users neither clicked nor reported (ignored)                   | Derived: 100% - Click Rate - Report Rate                     | Target: < 30%                                                |
| **Repeat Offender Rate**         | Percentage of users who fail phishing simulations more than once in a rolling 90-day window         | Rolling window analysis of per-user failure events           | Target: < 3% after 6 months                                  |

#### 2.2.2 In-Game Phishing Correlation

The DMZ's unique advantage is continuous behavioral measurement through gameplay. Every email the player processes in-game is a phishing detection test.

| In-Game Metric               | Real-World Correlation          | Calculation                                                                                                             |
| ---------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Email Triage Accuracy        | Phishing detection skill        | (Correct email classifications) / (Total emails processed)                                                              |
| False Positive Rate          | Over-reporting tendency         | (Legitimate emails flagged as threats) / (Total legitimate emails)                                                      |
| False Negative Rate          | Phishing susceptibility         | (Phishing emails approved/missed) / (Total phishing emails)                                                             |
| Triage Speed vs. Accuracy    | Decision quality under pressure | Scatter plot of response time vs. correctness                                                                           |
| Difficulty-Adjusted Accuracy | Skill progression tracking      | Accuracy weighted by phishing sophistication tier (1-10)                                                                |
| Contextual Clue Detection    | Analytical skill depth          | Tracking which specific indicators (URL, sender, grammar, urgency, etc.) the player identified before making a decision |

**REQ-ANALYTICS-001:** The platform SHALL calculate a **Phishing Resilience Score (PRS)** for each user, combining in-game email triage performance (weighted 40%), simulated phishing campaign results (weighted 40%), and knowledge assessment scores (weighted 20%). The PRS SHALL be normalized to a 0-100 scale and benchmarkable against the platform-wide population.

**REQ-ANALYTICS-002:** The platform SHALL track phishing susceptibility by attack vector type (email, SMS/smishing, voice/vishing, QR code/quishing, social media) and by social engineering technique (authority, urgency, curiosity, fear, reward, familiarity).

### 2.3 Knowledge Retention Metrics

Traditional training platforms measure knowledge at the point of training completion. The DMZ must measure knowledge retention over time, leveraging spaced repetition principles embedded in the game's recurring mechanics.

#### 2.3.1 Retention Measurement Framework

| Metric                              | Definition                                                                                | Measurement Interval | Target                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Immediate Recall**                | Accuracy on topic-specific challenges within 24 hours of learning event                   | Day 1                | > 90%                                                                                                |
| **Short-Term Retention**            | Accuracy on topic-specific challenges 7 days after learning event                         | Day 7                | > 80%                                                                                                |
| **Medium-Term Retention**           | Accuracy on topic-specific challenges 30 days after learning event                        | Day 30               | > 70%                                                                                                |
| **Long-Term Retention**             | Accuracy on topic-specific challenges 90 days after learning event                        | Day 90               | > 60%                                                                                                |
| **Durable Retention**               | Accuracy on topic-specific challenges 180+ days after learning event                      | Day 180              | > 50%                                                                                                |
| **Retention Decay Rate**            | Rate at which accuracy declines over time, modeled as an exponential decay curve          | Continuous           | Slower than traditional training (Ebbinghaus benchmark: 50% loss within 1 hour for passive learning) |
| **Spaced Repetition Effectiveness** | Improvement in retention at each repetition interval compared to single-exposure learning | Per repetition cycle | Minimum 15% improvement per cycle                                                                    |

**REQ-ANALYTICS-003:** The platform SHALL model individual retention curves per user per topic using the Ebbinghaus forgetting curve as a baseline, adjusting for observed performance. These models SHALL drive the adaptive learning engine's content scheduling decisions.

**REQ-ANALYTICS-004:** The platform SHALL generate a **Knowledge Retention Index (KRI)** per user, per department, and per organization, representing the estimated current knowledge level across all trained topics, accounting for time decay since last reinforcement.

#### 2.3.2 Knowledge Domain Taxonomy

Retention metrics SHALL be tracked across a standardized knowledge domain taxonomy:

| Domain ID | Domain                          | Sub-Domains                                                                     |
| --------- | ------------------------------- | ------------------------------------------------------------------------------- |
| KD-01     | Phishing & Social Engineering   | Email phishing, spear phishing, whaling, vishing, smishing, pretexting, baiting |
| KD-02     | Access Control & Authentication | Password hygiene, MFA, zero trust principles, least privilege, physical access  |
| KD-03     | Data Protection                 | Classification, handling, encryption, DLP, privacy regulations                  |
| KD-04     | Incident Response               | Detection, reporting, containment, evidence preservation, communication         |
| KD-05     | Malware & Ransomware            | Recognition, prevention, response, backup hygiene                               |
| KD-06     | Network Security                | Wi-Fi safety, VPN usage, public network risks, IoT awareness                    |
| KD-07     | Physical Security               | Tailgating, clean desk, device security, visitor management                     |
| KD-08     | Cloud & SaaS Security           | Shadow IT, app permissions, data sharing, configuration                         |
| KD-09     | Regulatory Compliance           | GDPR, HIPAA, PCI DSS, SOX, industry-specific requirements                       |
| KD-10     | Emerging Threats                | AI-generated attacks, deepfakes, supply chain attacks, zero-days                |

### 2.4 Behavioral Change Metrics

The ultimate goal of security awareness training is behavioral change -- not knowledge acquisition alone. The DMZ must measure actual behaviors, both in-game and in the real-world enterprise environment.

#### 2.4.1 In-Game Behavioral Indicators

| Behavior                           | Measurement                                                              | Positive Signal                                                                    | Negative Signal                                         |
| ---------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Email verification thoroughness    | Time spent examining headers, URLs, sender details before decision       | Increased inspection time correlating with higher accuracy                         | Snap decisions (< 3 seconds) on complex emails          |
| Access request scrutiny            | Depth of verification document review before granting/denying            | Checking multiple verification fields, cross-referencing                           | Rubber-stamping approvals without review                |
| Threat escalation behavior         | Rate at which potential threats are escalated vs. ignored                | Increasing escalation of genuine threats, decreasing escalation of false positives | Ignoring alerts, escalating everything indiscriminately |
| Patch/upgrade prioritization       | Whether security-critical upgrades are prioritized over feature upgrades | Security-first upgrade decisions                                                   | Consistently delaying security patches                  |
| Incident response speed            | Time from threat detection to containment action                         | Decreasing response time with maintained accuracy                                  | Slow response or panic-driven incorrect actions         |
| Resource allocation under pressure | Security budget allocation when resources are constrained                | Maintaining security spending even under pressure                                  | Cutting security to fund other priorities               |

#### 2.4.2 Real-World Behavioral Correlation

**REQ-ANALYTICS-005:** The platform SHALL support integration with enterprise security tools to correlate in-game behavior with real-world security behavior:

| Data Source             | Behavioral Signal                                | Integration Method                                            |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Email security gateway  | Phishing report button usage in production email | API integration with Proofpoint, Mimecast, Microsoft Defender |
| IAM/PAM systems         | Password change frequency, MFA adoption          | SCIM events, directory service integration                    |
| DLP systems             | Sensitive data handling compliance               | SIEM event correlation                                        |
| Endpoint protection     | USB device usage, unauthorized software installs | EDR telemetry correlation                                     |
| Physical access systems | Tailgating incidents, badge sharing reports      | Badge system API integration                                  |
| Help desk / ITSM        | Security-related ticket submission rate          | ServiceNow, Jira Service Management integration               |

#### 2.4.3 Behavioral Change Index

**REQ-ANALYTICS-006:** The platform SHALL calculate a **Behavioral Change Index (BCI)** per user that aggregates:

- In-game behavioral trend analysis (improving, stable, declining) -- weighted 30%
- Simulated phishing campaign performance trend -- weighted 30%
- Real-world behavioral signals (where integration data is available) -- weighted 30%
- Self-reported behavior changes via periodic micro-surveys -- weighted 10%

The BCI SHALL be tracked longitudinally and presented as a trend line on executive dashboards.

### 2.5 Training Completion & Engagement Metrics

| KPI                           | Definition                                                                          | Enterprise Target                       | Consumer Target           |
| ----------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- | ------------------------- |
| **Completion Rate**           | Percentage of assigned training completed within the compliance window              | > 95% within deadline                   | N/A (voluntary)           |
| **On-Time Completion Rate**   | Percentage of training completed before the due date (not just within grace period) | > 80%                                   | N/A                       |
| **Voluntary Engagement Rate** | Percentage of users who engage with training beyond mandatory requirements          | > 40%                                   | > 60% (of active players) |
| **Session Frequency**         | Average sessions per user per week                                                  | > 2 (for game-based training)           | > 3                       |
| **Average Session Duration**  | Mean time per training session                                                      | 12-20 minutes (optimal learning window) | 15-30 minutes             |
| **Content Coverage**          | Percentage of knowledge domains in which a user has demonstrated competency         | > 80% within 6 months                   | Progressive               |
| **Training Velocity**         | Rate at which new content/modules are consumed per user per month                   | Varies by role                          | Self-paced                |
| **Active Learning Time**      | Time spent in active decision-making (not passive video/reading)                    | > 70% of session time                   | > 80%                     |

**REQ-ANALYTICS-007:** The platform SHALL distinguish between passive engagement (watching videos, reading text) and active engagement (making decisions, triaging emails, solving challenges). Active learning time SHALL be the primary engagement metric, not total time-on-platform.

### 2.6 Time-to-Competency

Time-to-competency measures how quickly a user reaches a defined proficiency threshold in each knowledge domain.

| Competency Level  | Threshold                                                          | Typical Time (Traditional Training) | Target Time (The DMZ)     |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------- | ------------------------- |
| **Awareness**     | Can recognize common threats when prompted                         | 1-2 hours                           | 30-45 minutes of gameplay |
| **Comprehension** | Can explain why specific behaviors are risky                       | 4-8 hours                           | 2-3 hours of gameplay     |
| **Application**   | Can correctly respond to novel scenarios                           | 8-16 hours                          | 4-6 hours of gameplay     |
| **Analysis**      | Can break down complex scenarios and identify subtle indicators    | 16-40 hours                         | 8-12 hours of gameplay    |
| **Mastery**       | Consistently correct under pressure with near-zero false negatives | 40+ hours                           | 15-20 hours of gameplay   |

**REQ-ANALYTICS-008:** The platform SHALL track time-to-competency per knowledge domain per user and SHALL generate cohort-level reports showing how quickly new employees reach minimum security proficiency. This metric SHALL be benchmarkable against industry averages from SANS, NIST, and platform-wide data.

### 2.7 Skill Progression Tracking

#### 2.7.1 Skill Tree Model

The platform SHALL maintain a detailed skill tree for each user, mapping game progression to security competencies:

```
Security Skill Tree
|
+-- Phishing Detection (KD-01)
|   +-- Email Header Analysis        [Level 0-10]
|   +-- URL Inspection               [Level 0-10]
|   +-- Sender Verification          [Level 0-10]
|   +-- Social Engineering Pattern   [Level 0-10]
|   +-- Attachment Risk Assessment   [Level 0-10]
|   +-- AI-Generated Content ID      [Level 0-10]
|
+-- Access Control (KD-02)
|   +-- Identity Verification        [Level 0-10]
|   +-- Least Privilege Decisions    [Level 0-10]
|   +-- MFA Awareness                [Level 0-10]
|   +-- Privilege Escalation Detect  [Level 0-10]
|
+-- Incident Response (KD-04)
|   +-- Threat Detection Speed       [Level 0-10]
|   +-- Triage Accuracy              [Level 0-10]
|   +-- Escalation Judgment          [Level 0-10]
|   +-- Containment Decisions        [Level 0-10]
|
+-- Risk Management (KD-05)
|   +-- Risk Assessment              [Level 0-10]
|   +-- Resource Prioritization      [Level 0-10]
|   +-- Cost-Benefit Analysis        [Level 0-10]
|   +-- Business Continuity          [Level 0-10]
|
+-- [Additional domains...]
```

**REQ-ANALYTICS-009:** Skill levels SHALL be calculated using Item Response Theory (IRT) or a Bayesian Knowledge Tracing (BKT) model, not simple percentage-correct calculations. This ensures that a user who correctly handles a difficult scenario receives more credit than one who correctly handles an easy one.

#### 2.7.2 Progression Velocity

| Metric                      | Definition                                                                | Use Case                                                                                 |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Skill Velocity**          | Rate of skill level increase per hour of active gameplay                  | Identifies fast learners and struggling users                                            |
| **Plateau Detection**       | Identification of users whose skill progression has stalled for > 14 days | Triggers adaptive content intervention                                                   |
| **Regression Detection**    | Identification of skill level decreases (forgetting curve impact)         | Triggers spaced repetition reinforcement                                                 |
| **Cross-Skill Correlation** | Statistical correlation between skill domains                             | Identifies skill transfer effects (e.g., phishing detection improving incident response) |

### 2.8 Industry Benchmarking

**REQ-ANALYTICS-010:** The platform SHALL provide benchmarking against the following reference datasets:

| Benchmark Source                              | Data Points Available                                       | Update Frequency |
| --------------------------------------------- | ----------------------------------------------------------- | ---------------- |
| **Platform-wide anonymized aggregate**        | All KPIs, segmented by industry, company size, region       | Real-time        |
| **KnowBe4 Phishing by Industry Report**       | PPP by industry, company size, training duration            | Annual           |
| **Proofpoint State of the Phish**             | Click rates, reporting rates, threat awareness by region    | Annual           |
| **SANS Security Awareness Report**            | Maturity model scores, budget benchmarks, FTE allocation    | Annual           |
| **Verizon DBIR**                              | Breach frequency by attack vector, human element percentage | Annual           |
| **Cofense Annual Phishing Report**            | Reporting rates, susceptibility by phishing type            | Annual           |
| **Gartner Security Awareness Maturity Model** | 5-level maturity assessment framework                       | Continuous       |

**REQ-ANALYTICS-011:** Benchmark comparisons SHALL be presented as percentile rankings (e.g., "Your organization's PPP of 6.2% places you in the 82nd percentile among financial services companies with 1,000-5,000 employees").

---

## 3. Reporting Dashboards

### 3.1 Overview

The platform must serve radically different reporting audiences -- from board directors who need a single risk number to SOC analysts who need drill-down behavioral data. Each dashboard is designed for a specific persona, a specific decision it must inform, and a specific cadence at which it is consumed.

### 3.2 Executive Dashboard (C-Suite / Board)

**Persona:** CEO, CFO, CRO, Board Risk Committee
**Decision it informs:** "Is our human risk posture improving and is this investment justified?"
**Cadence:** Quarterly board meetings, monthly executive reviews

#### 3.2.1 Dashboard Components

| Component                       | Visualization                                                        | Data Source                                 |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| **Human Risk Score**            | Single number (0-100) with trend arrow and 12-month sparkline        | Composite of PPP, BCI, KRI, compliance rate |
| **Risk Trend**                  | Line chart showing 12-month risk trajectory                          | Monthly aggregate risk calculation          |
| **Investment ROI**              | Dollar figure with calculation breakdown                             | ROI engine (Section 4)                      |
| **Compliance Status**           | Traffic light indicators per regulation (GDPR, HIPAA, PCI DSS, etc.) | Compliance tracking engine                  |
| **Industry Benchmark Position** | Percentile rank gauge (0-100)                                        | Platform-wide benchmark data                |
| **Key Incidents Prevented**     | Counter with estimated cost avoidance                                | Incident correlation engine                 |
| **Training Participation**      | Completion percentage with trend                                     | LMS completion tracking                     |
| **Top Risks**                   | Top 3 organizational vulnerabilities                                 | Risk analysis engine                        |

**REQ-ANALYTICS-012:** The executive dashboard SHALL load in under 2 seconds and SHALL be presentable in a board meeting without modification. It SHALL support export to PDF (branded) and PowerPoint (editable) formats.

**REQ-ANALYTICS-013:** The executive dashboard SHALL include a "Board Report" generation feature that produces a self-contained PDF document including all charts, explanatory narrative (AI-generated), benchmark context, and recommended actions.

#### 3.2.2 Human Risk Score Methodology

The Human Risk Score (HRS) is the single most important metric on the executive dashboard. Its calculation must be transparent, defensible, and consistent.

```
Human Risk Score (0-100, lower = better)

HRS = w1(PPP_norm) + w2(BCI_inv) + w3(KRI_inv) + w4(CR_inv) + w5(ROR_inv)

Where:
  PPP_norm = Normalized Phish-Prone Percentage (0-100)
  BCI_inv  = Inverted Behavioral Change Index (100 - BCI)
  KRI_inv  = Inverted Knowledge Retention Index (100 - KRI)
  CR_inv   = Inverted Compliance Rate (100 - compliance %)
  ROR_inv  = Inverted Repeat Offender Rate, scaled (0-100)

Default weights:
  w1 = 0.30 (phishing susceptibility is the top human risk factor)
  w2 = 0.25 (behavioral change is the strongest predictor of real-world outcomes)
  w3 = 0.20 (knowledge retention ensures sustained protection)
  w4 = 0.15 (compliance rate reflects program coverage)
  w5 = 0.10 (repeat offenders represent concentrated risk)

Weights are customer-configurable within guardrails (each weight 0.05-0.50).
```

### 3.3 CISO / Security Team Dashboard

**Persona:** CISO, VP of Security, Security Awareness Program Manager, SOC Manager
**Decision it informs:** "Where are our human vulnerabilities and how do we remediate them?"
**Cadence:** Weekly review, daily monitoring

#### 3.3.1 Dashboard Components

| Component                          | Visualization                                                                  | Interactivity                                              |
| ---------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Risk Heat Map**                  | Organizational hierarchy colored by risk level (red/amber/green)               | Click to drill into department, team, individual           |
| **Phishing Campaign Dashboard**    | Campaign-by-campaign results with click/report/miss breakdown                  | Filter by date range, department, difficulty, vector type  |
| **Top Risk Users**                 | Ranked list of highest-risk individuals with contributing factors              | Click to view individual profile, assign remedial training |
| **Vulnerability by Attack Vector** | Stacked bar chart showing susceptibility by phishing type                      | Filter by time period, compare against baseline            |
| **Skill Gap Analysis**             | Radar chart of organizational competency across knowledge domains              | Compare department vs. organization vs. industry           |
| **Training Pipeline**              | Funnel showing assigned > started > in-progress > completed > competent        | Filter by training type, department, deadline              |
| **Incident Correlation Timeline**  | Timeline overlaying training events with real security incidents               | Zoom, filter by incident type, correlation indicators      |
| **Trending Threats**               | Real-time feed of emerging threat types the organization is least prepared for | Click to deploy targeted training campaign                 |

**REQ-ANALYTICS-014:** The CISO dashboard SHALL support role-based drill-down from organization level to individual user level in no more than 3 clicks. Each drill-down level SHALL maintain context (filters, date range) from the parent view.

**REQ-ANALYTICS-015:** The CISO dashboard SHALL include a "Campaign Launcher" widget that allows launching a targeted phishing simulation campaign directly from a risk finding (e.g., "Department X has high susceptibility to authority-based phishing -- launch targeted simulation").

#### 3.3.2 Risk Segmentation Views

| Segmentation       | Dimensions                                                   | Use Case                                                    |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------- |
| By Department      | Business unit, team, cost center                             | Identify highest-risk departments for targeted intervention |
| By Role            | Job function, seniority level, access privilege tier         | Prioritize training for users with elevated access          |
| By Location        | Office, region, country                                      | Address geographic variations in threat awareness           |
| By Tenure          | New hire (< 90 days), established, long-tenured              | Track onboarding effectiveness and complacency risk         |
| By Risk Tier       | Critical (top 5%), High, Medium, Low, Minimal                | Focus resources on users who pose the greatest risk         |
| By Training Status | Not started, in progress, completed, overdue, exempt         | Manage compliance coverage gaps                             |
| By Threat Vector   | Phishing, social engineering, data handling, physical, cloud | Target specific vulnerability categories                    |

### 3.4 Compliance Officer Dashboard

**Persona:** Chief Compliance Officer, Compliance Analyst, Internal Auditor, DPO
**Decision it informs:** "Can we demonstrate compliance to regulators and auditors?"
**Cadence:** Continuous monitoring, audit-triggered deep dives

#### 3.4.1 Dashboard Components

| Component                          | Visualization                                                           | Detail                                                               |
| ---------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Regulation Compliance Matrix**   | Table with regulation rows, requirement columns, and status indicators  | Shows completion percentage per requirement per regulation           |
| **Compliance Calendar**            | Gantt chart of training deadlines per regulation                        | Countdown timers for approaching deadlines                           |
| **Audit Evidence Package**         | One-click generation of all documentation required for a specific audit | Pre-built templates for SOC 2, ISO 27001, HIPAA, PCI DSS, GDPR, NIS2 |
| **Training Completion by Mandate** | Bar chart showing completion rate per regulatory requirement            | Drill down to see non-compliant users                                |
| **Overdue Training Alerts**        | Ranked list of overdue training assignments with escalation status      | Auto-escalation workflow integration                                 |
| **Historical Compliance Trend**    | Line chart showing compliance rate over 24 months                       | Demonstrates continuous improvement for auditors                     |
| **Policy Acknowledgment Tracker**  | Checklist of policy acknowledgments with electronic signatures          | Exportable attestation records                                       |

**REQ-ANALYTICS-016:** The compliance dashboard SHALL generate audit-ready evidence packages containing:

- Training completion records with timestamps and user attestation
- Assessment scores and pass/fail outcomes
- Phishing simulation participation records
- Policy acknowledgment logs with digital signatures
- Remedial training assignment and completion records
- Aggregate compliance statistics with trend data
- System access logs for the compliance data itself (chain of custody)

**REQ-ANALYTICS-017:** Evidence packages SHALL be exportable in formats accepted by major audit firms: PDF (signed), CSV, JSON, and XBRL where applicable. All exports SHALL include tamper-evident hashing (SHA-256) and optional digital signatures.

#### 3.4.2 Regulation-Specific Compliance Mapping

| Regulation                   | Training Requirements Tracked                                                                  | Reporting Frequency                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **GDPR (Art. 39)**           | Data protection awareness, privacy-by-design principles, data breach recognition and reporting | Annual; evidence on request                     |
| **HIPAA (Security Rule)**    | PHI handling, access control, incident reporting, workforce sanctions                          | Annual training; periodic risk assessment       |
| **PCI DSS v4.0 (Req. 12.6)** | Cardholder data protection, social engineering awareness, acceptable use                       | Annual training; quarterly phishing simulations |
| **SOX (Section 404)**        | IT general controls awareness, access management, change management                            | Annual; continuous monitoring                   |
| **NIS2 (Art. 20)**           | Cyber hygiene, risk management, incident handling, supply chain security                       | Continuous; evidence for audits                 |
| **NYDFS 23 NYCRR 500**       | Cybersecurity awareness training for all personnel                                             | Annual; training records retained 5 years       |
| **DORA (Art. 13)**           | ICT-related incident management, digital operational resilience testing                        | Annual; detailed records                        |
| **CMMC 2.0 (AT.L2)**         | Role-based awareness, insider threat awareness, social engineering                             | Per assessment level                            |
| **FedRAMP**                  | Security awareness training for all system users                                               | Annual; continuous monitoring                   |
| **ISO 27001 (A.7.2.2)**      | Information security awareness, education, and training                                        | Annual; audit evidence                          |

### 3.5 Department / Team Manager Dashboard

**Persona:** Department Manager, Team Lead, HR Business Partner
**Decision it informs:** "How is my team performing and who needs additional support?"
**Cadence:** Weekly check-in, monthly team review

#### 3.5.1 Dashboard Components

| Component               | Visualization                                                     | Detail                                                                 |
| ----------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Team Risk Score**     | Gauge (0-100) with comparison to organization average             | Color-coded: green (below org avg), amber (at avg), red (above avg)    |
| **Team Leaderboard**    | Ranked list of team members by security proficiency score         | Anonymizable per customer policy                                       |
| **Completion Status**   | Progress bars per team member for assigned training               | Shows overdue items highlighted                                        |
| **Skill Radar**         | Radar chart comparing team profile against organizational target  | Identifies team-level skill gaps                                       |
| **Engagement Metrics**  | Bar chart of session frequency, duration, voluntary participation | Highlights disengaged team members                                     |
| **Improvement Trend**   | Line chart showing team risk score over 6 months                  | Demonstrates management accountability                                 |
| **Recommended Actions** | AI-generated suggestions for team improvement                     | E.g., "Schedule team phishing drill focusing on urgency-based attacks" |

**REQ-ANALYTICS-018:** Manager dashboards SHALL enforce data privacy controls:

- Managers SHALL only see data for users in their organizational hierarchy
- Individual-level data SHALL be configurable as anonymized (showing only team aggregates) per customer privacy policy
- Detailed individual performance SHALL only be visible to users with explicit "view individual reports" permission
- All manager dashboard access SHALL be audit-logged

### 3.6 Individual Learner Dashboard

**Persona:** Individual employee, game player
**Decision it informs:** "What are my strengths, weaknesses, and what should I focus on next?"
**Cadence:** Per-session, self-directed

#### 3.6.1 Dashboard Components (Enterprise Learner)

| Component                      | Description                                           | Gamification Element                                |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| **Security Proficiency Score** | Personal 0-100 score with trend                       | Presented as "Archive Gate Clearance Level" in-game |
| **Skill Radar**                | Personal competency across knowledge domains          | "Data Center Capabilities" radar in-game            |
| **Achievement Gallery**        | Earned badges, certifications, milestones             | "Commendations from the Archive Council"            |
| **Learning Path**              | Recommended next steps based on skill gaps            | "Next Mission Briefing"                             |
| **Streak Counter**             | Consecutive days/weeks of engagement                  | "Uptime Counter" for the data center                |
| **Peer Comparison**            | Anonymous percentile rank within cohort               | "Facility Ranking" among data centers               |
| **Compliance Status**          | Personal completion status for mandatory training     | "Regulatory Clearance Status"                       |
| **Improvement History**        | Timeline of skill improvements with milestone markers | "Archive Gate Operations Log"                       |

#### 3.6.2 Dashboard Components (Consumer Player)

| Component                    | Description                                                                  | Notes                                                            |
| ---------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Player Profile**           | Level, XP, playtime, achievements                                            | Standard gaming profile                                          |
| **Skill Tree Visualization** | Interactive skill tree with unlock progress                                  | Core progression UI element                                      |
| **Leaderboard Position**     | Global and friends-list rankings                                             | Multiple leaderboard categories                                  |
| **Statistics Page**          | Detailed gameplay stats (emails processed, threats detected, accuracy rates) | "Ops Center Statistics"                                          |
| **Collection Progress**      | Percentage of collectibles, lore entries, endings discovered                 | Completionist appeal                                             |
| **Cyber Score**              | Real-world cybersecurity proficiency estimate                                | "Your real-world security readiness" -- bridges game and reality |

### 3.7 Report Scheduling & Distribution

**REQ-ANALYTICS-019:** The platform SHALL support automated report generation and distribution:

| Feature                      | Specification                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Scheduling**               | Daily, weekly, bi-weekly, monthly, quarterly, annually, custom cron expressions                                                |
| **Distribution**             | Email (with embedded charts and attached full report), Slack/Teams webhook, SFTP drop, API callback                            |
| **Formats**                  | PDF (branded, executive-ready), Excel (pivot-ready data), CSV (raw data), PowerPoint (editable charts), JSON (API consumption) |
| **Templates**                | Pre-built templates for: Board Report, CISO Briefing, Compliance Audit, Department Review, Individual Summary                  |
| **Customization**            | Drag-and-drop report builder for creating custom report layouts from available widgets                                         |
| **White-labeling**           | Customer logo, colors, and branding applied to all generated reports                                                           |
| **Conditional distribution** | Reports sent only when specific thresholds are crossed (e.g., "Send alert report if PPP exceeds 10%")                          |
| **Historical archive**       | All generated reports archived for 7 years with tamper-evident storage                                                         |
| **Access control**           | Reports honor RBAC -- a department manager's report only includes their department's data                                      |

### 3.8 Real-Time vs. Scheduled Reporting

| Reporting Mode          | Use Case                                                                                          | Latency           | Implementation                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| **Real-time streaming** | Active phishing campaign monitoring, live training event tracking, security operations dashboards | < 30 seconds      | WebSocket/SSE connection to event stream        |
| **Near-real-time**      | Dashboard metrics refresh, risk score updates, engagement counters                                | 1-5 minutes       | Materialized views refreshed on short intervals |
| **Hourly aggregation**  | Trend charts, heat maps, departmental roll-ups                                                    | 1 hour            | Scheduled aggregation jobs                      |
| **Daily batch**         | Compliance reports, benchmark recalculations, retention curve updates                             | 24 hours          | Overnight batch processing pipeline             |
| **On-demand**           | Audit evidence packages, custom ad-hoc queries, export generation                                 | Request-triggered | Query against warehouse with caching            |

---

## 4. ROI Measurement Framework

### 4.1 Overview

Demonstrating ROI is the single most critical capability for enterprise sales and renewals. Security awareness training competes for budget against tangible security controls (firewalls, EDR, SIEM) that produce easily understood outputs. The DMZ must provide a rigorous, defensible, and transparent ROI calculation that gives CISOs the ammunition they need to defend their training budget.

### 4.2 Industry ROI Benchmarks

Before defining the ROI model, it is essential to ground expectations in published industry research:

| Source                        | Finding                                                                                                              | Year |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---- |
| **KnowBe4**                   | Organizations report up to **50x ROI** on security awareness training investments; average of **37x** for mid-market | 2024 |
| **Ponemon Institute**         | Average cost savings from SAT programs: **$1.4 million per organization** in avoided incidents                       | 2023 |
| **Osterman Research**         | Every $1 spent on SAT returns an estimated **$5-$50** depending on organization size and industry                    | 2023 |
| **Aberdeen Group**            | Companies with SAT programs experience **70% fewer security incidents** than those without                           | 2022 |
| **Forrester**                 | Total Economic Impact study: SAT delivers **276% ROI** over 3 years with payback period under 3 months               | 2023 |
| **IBM Cost of a Data Breach** | Average cost of a data breach: **$4.88 million** (2024); human error involved in **74%** of breaches                 | 2024 |
| **Verizon DBIR**              | **68%** of breaches involve a human element; phishing is the #1 initial access vector                                | 2024 |
| **SANS**                      | Organizations with mature SAT programs see **$172 saved per employee per year** in reduced incident response costs   | 2023 |

### 4.3 ROI Calculation Model

#### 4.3.1 Core ROI Formula

```
ROI = ((Total Benefits - Total Costs) / Total Costs) x 100

Where:
  Total Benefits = Cost Avoidance + Insurance Savings + Compliance Savings
                   + Productivity Savings + Incident Reduction Savings
  Total Costs    = Platform License + Implementation + Administration
                   + Employee Time + Opportunity Cost
```

#### 4.3.2 Cost Avoidance Metrics (Prevented Breaches)

This is the largest ROI component. The model estimates the number of breaches that would have occurred without training, based on the observed reduction in phishing susceptibility.

```
Breach Prevention Value = P(breach_baseline) x P(human_vector) x Risk_Reduction x Avg_Breach_Cost

Where:
  P(breach_baseline) = Annual probability of experiencing a breach (industry-specific)
  P(human_vector)    = Percentage of breaches attributable to human error (68-74%)
  Risk_Reduction     = Measured reduction in phishing susceptibility (e.g., PPP drop from 30% to 5%)
  Avg_Breach_Cost    = Average cost of a breach (industry-specific, from IBM report)
```

| Industry               | Annual Breach Probability | Average Breach Cost (2024) | Human Element % | Baseline Annual Expected Loss |
| ---------------------- | ------------------------- | -------------------------- | --------------- | ----------------------------- |
| Healthcare             | 33%                       | $9.77M                     | 74%             | $2.38M                        |
| Financial Services     | 28%                       | $6.08M                     | 71%             | $1.21M                        |
| Technology             | 25%                       | $5.45M                     | 68%             | $0.93M                        |
| Energy                 | 22%                       | $5.29M                     | 72%             | $0.84M                        |
| Manufacturing          | 20%                       | $5.56M                     | 70%             | $0.78M                        |
| Retail                 | 24%                       | $3.91M                     | 73%             | $0.68M                        |
| Education              | 30%                       | $3.65M                     | 76%             | $0.83M                        |
| Government             | 18%                       | $4.64M                     | 65%             | $0.54M                        |
| Cross-Industry Average | 24%                       | $4.88M                     | 74%             | $0.87M                        |

**REQ-ANALYTICS-020:** The ROI calculator SHALL use customer-provided inputs where available (actual breach history, actual incident costs) and SHALL fall back to industry-specific benchmarks from IBM, Verizon, and Ponemon for missing values. All assumptions SHALL be explicitly stated and adjustable.

#### 4.3.3 Insurance Premium Reduction

Cyber insurance underwriters increasingly factor security awareness training into their risk models.

| Factor                                    | Impact on Premium                        | Evidence Source                         |
| ----------------------------------------- | ---------------------------------------- | --------------------------------------- |
| Active SAT program in place               | 5-15% premium reduction                  | Coalition, Marsh & McLennan surveys     |
| Regular phishing simulations (quarterly+) | Additional 5-10% reduction               | Hartford, Chubb underwriting guidelines |
| Documented PPP below 10%                  | Additional 3-8% reduction                | Beazley, AIG risk assessment frameworks |
| Completion rate > 90%                     | Prerequisite for coverage (not optional) | Most carriers since 2023                |
| Incident response training documented     | 2-5% reduction                           | CNA, Travelers underwriting             |
| Board-level risk reporting                | Qualitative factor in risk assessment    | Lloyd's market requirements             |

```
Insurance Savings = Current_Premium x Estimated_Reduction_Percentage

Example:
  Current cyber insurance premium: $250,000/year
  Estimated reduction from documented SAT: 15-25%
  Annual savings: $37,500 - $62,500
```

**REQ-ANALYTICS-021:** The platform SHALL generate a **Cyber Insurance Evidence Package** containing all metrics and documentation required by major cyber insurance carriers, including: training completion rates, phishing simulation results with trend data, incident response plan evidence, and board-level risk reporting documentation. This package SHALL be exportable as a PDF with supporting data in CSV.

#### 4.3.4 Compliance Audit Cost Savings

| Savings Category                             | Calculation Method                                                      | Typical Range                      |
| -------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Audit preparation time reduction             | Hours saved x fully loaded hourly rate                                  | 80-200 hours saved per audit cycle |
| Automated evidence generation vs. manual     | Time comparison: auto-generated (minutes) vs. manual compilation (days) | 40-120 hours saved per audit       |
| Reduced audit findings requiring remediation | Fewer findings x average remediation cost per finding                   | $5,000-$50,000 per avoided finding |
| Continuous compliance vs. point-in-time      | Avoided emergency remediation projects before audits                    | $20,000-$100,000 per year          |
| Regulatory fine avoidance                    | Probability of fine x fine amount x reduction factor                    | Varies dramatically by regulation  |

**GDPR Fine Avoidance Example:**

```
GDPR fines for inadequate security training:
  - Maximum: 4% of global annual revenue or EUR 20 million
  - Average GDPR fine (2024): EUR 1.7 million
  - Probability of GDPR enforcement action (estimated): 2-5% per year for non-compliant orgs
  - Training reduces probability by estimated 60-80%

  Expected value of fine avoidance = 0.035 x 1,700,000 x 0.70 = EUR 41,650/year
```

#### 4.3.5 Productivity Impact Measurement

Training has a productivity cost (time employees spend training instead of working) and a productivity benefit (fewer security incidents disrupting work, less time wasted on false alarms).

| Component                        | Calculation                                                                                          | Direction            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- |
| **Training Time Cost**           | Hours_per_user x Users x Hourly_rate                                                                 | Cost (negative)      |
| **Gamified Engagement Premium**  | Voluntary training time x Hourly_rate (this time would be spent on non-productive activities anyway) | Offset (reduce cost) |
| **Incident Response Time Saved** | Reduced_incidents x Avg_hours_per_incident x Avg_hourly_rate                                         | Benefit (positive)   |
| **Help Desk Ticket Reduction**   | Reduced_security_tickets x Avg_cost_per_ticket                                                       | Benefit (positive)   |
| **Phishing Triage Efficiency**   | Faster_report_resolution x SOC_analyst_hourly_rate                                                   | Benefit (positive)   |
| **Reduced Downtime**             | Avoided_downtime_hours x Revenue_per_hour                                                            | Benefit (positive)   |

**The DMZ Productivity Advantage:**

Traditional SAT requires 30-60 minutes per module, typically completed in a single sitting with minimal engagement. The DMZ's game-based model delivers training in 10-20 minute gameplay sessions that produce higher retention and can overlap with natural break periods. Additionally, because players voluntarily engage (40%+ voluntary engagement rate vs. near-zero for traditional SAT), much of the training time is "free" -- it displaces other non-productive time, not productive work.

```
Net Productivity Impact =
  (Incident_Savings + Ticket_Savings + Triage_Savings + Downtime_Savings)
  - (Training_Time_Cost - Voluntary_Engagement_Offset)

Example (1,000-employee organization):
  Training time cost:     1,000 users x 6 hrs/year x $50/hr     = -$300,000
  Voluntary offset:       400 users x 4 hrs/year x $50/hr       = +$80,000
  Incident savings:       12 avoided incidents x $25,000/incident = +$300,000
  Help desk savings:      2,400 fewer tickets x $25/ticket       = +$60,000
  SOC triage savings:     200 hrs saved x $85/hr                 = +$17,000
  Downtime savings:       48 hours avoided x $10,000/hr          = +$480,000
                                                                   ----------
  Net Productivity Impact:                                         +$637,000
```

#### 4.3.6 Employee Behavior Improvement Quantification

| Behavior                              | Before Training | After Training (12 months) | Financial Impact                                            |
| ------------------------------------- | --------------- | -------------------------- | ----------------------------------------------------------- |
| Phishing click rate                   | 30-35%          | 4-6%                       | Each click avoided = potential incident avoided             |
| Phishing report rate                  | 7-13%           | 50-70%                     | Each report = faster SOC response, reduced dwell time       |
| Password reuse rate                   | 65%             | 25%                        | Each unique password = reduced credential stuffing exposure |
| MFA adoption (voluntary)              | 40%             | 85%                        | Each MFA enrollment = 99.9% reduction in account compromise |
| Unauthorized app usage                | 35%             | 10%                        | Each avoided shadow IT app = reduced attack surface         |
| Sensitive data mishandling incidents  | 12/month        | 3/month                    | Each avoided incident = $5K-$50K in potential exposure      |
| USB/removable media policy violations | 8/month         | 1/month                    | Each avoided violation = reduced malware vector             |

### 4.4 ROI Dashboard

**REQ-ANALYTICS-022:** The platform SHALL provide a dedicated ROI dashboard that presents:

| Widget                      | Description                                                                 | Update Frequency            |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------- |
| **Total ROI Multiplier**    | Large number showing Xx ROI (e.g., "37x")                                   | Monthly recalculation       |
| **Net Value Created**       | Dollar figure: Total Benefits minus Total Costs                             | Monthly                     |
| **ROI Breakdown**           | Pie chart of benefit categories                                             | Monthly                     |
| **Cost Per Protected User** | Platform cost / total users -- compared to breach cost per compromised user | Monthly                     |
| **Payback Period**          | Months until cumulative benefits exceeded cumulative costs                  | One-time, updated quarterly |
| **ROI Trend**               | Line chart showing ROI improvement over time                                | Monthly data points         |
| **Benchmark Comparison**    | ROI compared to industry average and platform-wide average                  | Quarterly                   |
| **Sensitivity Analysis**    | Slider-based model showing how ROI changes with different assumptions       | Interactive                 |
| **ROI by Department**       | Department-level ROI decomposition                                          | Monthly                     |

**REQ-ANALYTICS-023:** The ROI calculator SHALL include a **Sensitivity Analysis** mode where users can adjust key assumptions (breach probability, breach cost, attribution percentage) to see how ROI changes. This addresses executive skepticism by showing that even with conservative assumptions, the ROI is strongly positive.

### 4.5 ROI Reporting for Different Audiences

| Audience                          | Report Focus                                                                                       | Format                            | Frequency        |
| --------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------- |
| **Board of Directors**            | Total ROI multiplier, risk reduction trend, benchmark position, cost avoidance highlight           | 2-page PDF executive brief        | Quarterly        |
| **CFO**                           | Detailed cost-benefit analysis, total cost of ownership, budget efficiency, department-level spend | Excel with full calculations      | Quarterly        |
| **CISO**                          | Risk reduction metrics, incident prevention evidence, threat landscape correlation                 | Detailed PDF with drill-down data | Monthly          |
| **Procurement/Vendor Management** | TCO comparison vs. alternatives, contract value analysis                                           | Vendor review format              | Annual (renewal) |
| **Insurance Broker**              | Risk metrics, training evidence, compliance documentation                                          | Insurance evidence package        | Annual (renewal) |
| **External Auditor**              | Compliance evidence, control effectiveness, training completion                                    | Audit evidence bundle             | Per audit cycle  |

---

## 5. Game-Specific Analytics

### 5.1 Overview

The DMZ's game-based delivery model generates a category of analytics unavailable to traditional training platforms. These metrics serve dual purposes: informing game design decisions to maximize engagement and learning outcomes, and providing evidence that the gamified approach is superior to traditional methods.

### 5.2 Player Engagement Metrics

#### 5.2.1 Core Engagement KPIs

| KPI                            | Definition                                                             | Target (B2B)            | Target (B2C)              | Industry Benchmark                             |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------------- | ------------------------- | ---------------------------------------------- |
| **DAU (Daily Active Users)**   | Unique users with at least one session per day                         | > 25% of enrolled users | > 15% of registered users | Mobile games: 10-25% of MAU                    |
| **MAU (Monthly Active Users)** | Unique users with at least one session per month                       | > 80% of enrolled users | > 40% of registered users | Mobile games: varies widely                    |
| **DAU/MAU Ratio (Stickiness)** | DAU divided by MAU                                                     | > 30%                   | > 20%                     | Casual games: 15-25%; Habit-forming apps: 30%+ |
| **Session Length**             | Average duration of a single play session                              | 12-20 minutes           | 15-30 minutes             | Mobile games: 8-12 min; PC games: 20-45 min    |
| **Sessions Per Week**          | Average number of sessions per active user per week                    | > 3                     | > 4                       | Casual games: 3-5                              |
| **D1 Retention**               | Percentage of new users who return on day 1 after first session        | > 70%                   | > 50%                     | Mobile games: 35-40%                           |
| **D7 Retention**               | Percentage of new users who return on day 7                            | > 55%                   | > 25%                     | Mobile games: 15-20%                           |
| **D30 Retention**              | Percentage of new users who return on day 30                           | > 45%                   | > 12%                     | Mobile games: 6-10%                            |
| **D90 Retention**              | Percentage of new users who return on day 90                           | > 35%                   | > 8%                      | Mobile games: 3-5%                             |
| **Churn Rate**                 | Percentage of active users who become inactive (no session in 14 days) | < 5% monthly            | < 15% monthly             | SaaS: 3-8%; Games: 10-25%                      |

**REQ-ANALYTICS-024:** Retention curves SHALL be calculated using cohort analysis, with cohorts defined by signup week (consumer) or enrollment date (enterprise). Retention SHALL be visualized as a retention curve chart showing the full lifecycle from D1 through D365.

#### 5.2.2 Session Analytics

| Metric                     | Definition                                                                                | Use Case                                          |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Session Start Trigger**  | What brought the user back (push notification, email reminder, scheduled time, voluntary) | Optimize re-engagement channels                   |
| **Session Flow**           | Sequence of game activities within a session                                              | Identify common play patterns and optimize UX     |
| **Session Depth**          | Number of meaningful decisions made per session                                           | Measure engagement quality, not just time         |
| **Peak Play Times**        | Distribution of session starts by hour and day                                            | Optimize notification timing and content delivery |
| **Session End Reason**     | Voluntary quit, time limit, ran out of energy, external interruption, crash               | Identify friction points causing premature exits  |
| **Inter-Session Interval** | Time between consecutive sessions for each user                                           | Predict churn risk when interval increases        |

### 5.3 Game Economy Health Metrics

The in-game economy (resources, currency, upgrades) must be monitored for balance and sustainability.

#### 5.3.1 Economy KPIs

| KPI                             | Definition                                                                                | Healthy Range | Action if Out of Range                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| **Source-Sink Ratio**           | Total currency earned / Total currency spent across all players                           | 1.0 - 1.3     | < 1.0: economy is too punishing; > 1.3: inflation risk                |
| **Currency Velocity**           | Average time between earning and spending currency                                        | 1-5 sessions  | < 1 session: nothing to save for; > 5 sessions: progression stall     |
| **Gini Coefficient**            | Wealth inequality among players (0 = perfectly equal, 1 = one player owns everything)     | 0.3 - 0.5     | > 0.6: early players or payers have insurmountable advantage          |
| **Upgrade Adoption Rate**       | Percentage of players who purchase each available upgrade within 30 days of availability  | 20-60%        | < 10%: too expensive or not compelling; > 80%: too cheap or mandatory |
| **Resource Bottleneck Rate**    | Percentage of sessions where a player is blocked from desired action by resource shortage | 5-15%         | < 5%: resources too plentiful; > 25%: frustrating                     |
| **Premium Currency Conversion** | Percentage of earned vs. purchased premium currency in circulation                        | 40-70% earned | < 30% earned: pay-to-win perception                                   |

**REQ-ANALYTICS-025:** Game economy metrics SHALL be tracked in a dedicated economy dashboard accessible to game designers and product managers. The dashboard SHALL include simulation tools that model the impact of economy changes before deployment.

### 5.4 Difficulty Curve Analysis

The game's difficulty must be calibrated to maintain the flow state -- challenging enough to be engaging but not so difficult as to cause frustration or so easy as to cause boredom.

#### 5.4.1 Difficulty Metrics

| Metric                                | Definition                                                                                           | Optimal Range                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Success Rate per Level/Phase**      | Percentage of attempts that result in successful completion                                          | 60-80% (too low = frustrating; too high = boring)                                                                 |
| **Time-to-Complete Distribution**     | Distribution of completion times for each challenge                                                  | Normal distribution centered on design target; long tail indicates stuck players                                  |
| **Fail-Retry-Succeed Pattern**        | Percentage of players who fail, retry, and eventually succeed vs. fail and quit                      | > 70% retry and succeed                                                                                           |
| **Difficulty Spike Detection**        | Statistical identification of challenges where success rate drops > 20% from the preceding challenge | Zero unintentional spikes                                                                                         |
| **Adaptive Difficulty Effectiveness** | Correlation between difficulty adjustment and player retention                                       | Positive correlation (harder for skilled players improves retention; easier for struggling players reduces churn) |
| **Help/Hint Usage Rate**              | Percentage of players who use help systems per challenge                                             | 10-30% (too low: hints hidden; too high: challenge is unclear)                                                    |
| **Rage Quit Detection**               | Sessions ending within 30 seconds of a failure event                                                 | < 5% of failure events                                                                                            |

**REQ-ANALYTICS-026:** The platform SHALL implement automatic difficulty spike detection that alerts game designers when any challenge's success rate deviates more than 2 standard deviations from the expected range, or when the rage-quit rate exceeds 5% for any challenge.

### 5.5 Learning Outcome Correlation with Game Progression

This is the key analytical capability that validates the entire product thesis: proving that game progression drives real learning.

#### 5.5.1 Correlation Metrics

| Correlation                                  | Measurement                                                                                          | Expected Direction                                | Statistical Method                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| **Game Level vs. PPP**                       | Player's current game level correlated with phishing simulation click rate                           | Strong negative (higher level = lower click rate) | Spearman rank correlation                |
| **Gameplay Hours vs. Knowledge Score**       | Total hours played correlated with assessment scores                                                 | Positive, with diminishing returns                | Logarithmic regression                   |
| **In-Game Accuracy vs. Real-World Behavior** | Email triage accuracy in-game correlated with real phishing simulation performance                   | Strong positive                                   | Pearson correlation, controlled for time |
| **Engagement Consistency vs. Retention**     | Regular play (3+ sessions/week) vs. sporadic play correlated with knowledge retention at D90         | Consistent players retain 40%+ more               | Cohort comparison with t-test            |
| **Narrative Engagement vs. Learning**        | Players who read lore/story content vs. those who skip, correlated with knowledge scores             | Positive (narrative context aids memory encoding) | ANOVA across engagement tiers            |
| **Social Play vs. Learning**                 | Players who engage in multiplayer/team challenges vs. solo players, correlated with improvement rate | Positive (social accountability and discussion)   | Cohort comparison                        |

**REQ-ANALYTICS-027:** The platform SHALL conduct and publish (to enterprise customers) quarterly analysis reports demonstrating the statistical correlation between game engagement metrics and security awareness outcomes. These reports SHALL include effect sizes, confidence intervals, and comparison against traditional training benchmarks.

### 5.6 A/B Testing Framework

#### 5.6.1 A/B Testing Infrastructure

**REQ-ANALYTICS-028:** The platform SHALL provide a built-in A/B testing framework with the following capabilities:

| Feature                    | Specification                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| **Traffic splitting**      | Configurable percentage splits across 2-5 variants                                            |
| **Assignment persistence** | Users remain in their assigned variant for the duration of the test                           |
| **Segmentation**           | Target tests to specific user segments (by role, department, skill level, tenure)             |
| **Primary metrics**        | Pre-configured primary metrics: completion rate, engagement, learning outcome, satisfaction   |
| **Statistical rigor**      | Bayesian or frequentist significance testing with configurable confidence level (default 95%) |
| **Minimum sample size**    | Automatic power analysis to determine required sample size before test launch                 |
| **Guardrail metrics**      | Automatic test shutdown if key metrics (churn, complaint rate) degrade beyond threshold       |
| **Test library**           | Historical record of all tests with outcomes for institutional knowledge                      |

#### 5.6.2 Testable Game Elements

| Category       | Testable Variables                                            | Expected Impact                                |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| **Difficulty** | Challenge difficulty curves, time pressure, hint availability | Engagement and completion rates                |
| **Narrative**  | Story framing, character involvement, consequence severity    | Emotional engagement and memory retention      |
| **Feedback**   | Immediate vs. delayed feedback, detail level, tone            | Learning speed and motivation                  |
| **Rewards**    | Currency amounts, achievement thresholds, cosmetic rewards    | Progression satisfaction and session frequency |
| **UX/UI**      | Layout variations, notification timing, onboarding flow       | Conversion and D1 retention                    |
| **Learning**   | Scenario complexity, repetition frequency, explanation depth  | Knowledge retention and behavioral change      |
| **Phishing**   | Email template realism, social engineering technique, timing  | Detection skill improvement                    |

### 5.7 Narrative Path Analytics

**REQ-ANALYTICS-029:** The platform SHALL track narrative-path analytics to understand how story choices correlate with learning outcomes:

| Metric                        | Definition                                                              | Use Case                                             |
| ----------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| **Path Distribution**         | Percentage of players choosing each narrative branch at decision points | Identify dominant paths and underexplored content    |
| **Path-Outcome Correlation**  | Learning outcomes correlated with narrative paths taken                 | Identify which story paths produce the best learning |
| **Narrative Completion Rate** | Percentage of players who reach each narrative endpoint                 | Identify where narrative interest drops              |
| **Lore Engagement**           | Percentage of optional lore content consumed                            | Measure narrative investment                         |
| **Character Affinity**        | Player interactions with and choices regarding specific characters      | Inform character development and story expansion     |
| **Narrative Replay**          | Percentage of players who replay to explore alternative paths           | Measure narrative replayability                      |

---

## 6. Advanced Analytics

### 6.1 Overview

Beyond descriptive reporting, the platform must provide predictive and prescriptive analytics powered by machine learning. These capabilities transform the platform from a reporting tool into an intelligent risk management system that anticipates problems before they manifest.

### 6.2 Predictive Risk Scoring

#### 6.2.1 Individual Risk Prediction Model

**REQ-ANALYTICS-030:** The platform SHALL implement a machine learning model that predicts each user's probability of falling for a real phishing attack within the next 30 days.

| Model Component      | Detail                                                                                                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Algorithm**        | Gradient Boosted Trees (XGBoost/LightGBM) for tabular features; optional LSTM for temporal patterns                                                                                                                                      |
| **Training Data**    | Historical in-game decisions, phishing simulation results, engagement patterns, knowledge assessment scores, time-since-last-training                                                                                                    |
| **Features**         | 50+ features including: email triage accuracy (rolling 30-day), session frequency trend, skill plateau indicators, difficulty-adjusted performance, knowledge decay estimate, peer comparison metrics, time-of-day performance variation |
| **Output**           | Probability (0-1) with risk category (Critical, High, Medium, Low, Minimal)                                                                                                                                                              |
| **Calibration**      | Platt scaling to ensure predicted probabilities match observed frequencies                                                                                                                                                               |
| **Update Frequency** | Re-scored daily; model retrained monthly                                                                                                                                                                                                 |
| **Validation**       | Backtested against historical phishing simulation results; target AUC > 0.85                                                                                                                                                             |
| **Explainability**   | SHAP (SHapley Additive exPlanations) values for each prediction, showing which factors contributed most to the risk score                                                                                                                |

#### 6.2.2 Organizational Risk Prediction

| Prediction                   | Method                                                                                | Horizon           | Action Triggered                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| **Department Risk Forecast** | Aggregate individual predictions + department-level factors                           | 30-90 days        | Auto-generate training recommendations for high-risk departments                                         |
| **Seasonal Risk Pattern**    | Time-series analysis of historical susceptibility data                                | 12-month forecast | Pre-deploy targeted training before historically vulnerable periods (e.g., tax season, holiday shopping) |
| **New Employee Risk**        | Predict risk profile based on role, department, similar user cohort performance       | First 90 days     | Customize onboarding training intensity                                                                  |
| **Post-Incident Risk Surge** | Detect elevated risk across organization following a publicized breach or world event | 1-14 days         | Trigger timely reinforcement training                                                                    |

### 6.3 Behavioral Pattern Analysis

**REQ-ANALYTICS-031:** The platform SHALL identify behavioral patterns that indicate security risk through unsupervised learning techniques:

| Pattern                             | Detection Method                                                                                                              | Significance                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Complacency Drift**               | Gradual decline in email inspection thoroughness over time (measured by decision speed increase without accuracy improvement) | User is developing dangerous automaticity; needs novelty injection          |
| **Authority Susceptibility**        | Disproportionately high approval rate for emails from authority figures (CEO, legal, government)                              | Vulnerability to whaling and BEC attacks                                    |
| **Urgency Susceptibility**          | Higher click rates on emails with time pressure language                                                                      | Vulnerability to urgency-based social engineering                           |
| **Context Switching Vulnerability** | Higher error rates during the first 2 minutes of a session or immediately after a non-security task                           | Vulnerability to attacks timed during distraction                           |
| **Overconfidence Pattern**          | High-speed decisions with declining accuracy, especially after a streak of correct answers                                    | Dunning-Kruger risk; user may not recognize improving attack sophistication |
| **Fatigue Degradation**             | Accuracy decline correlated with time-in-session or time-of-day                                                               | Indicates when user's security judgment is impaired                         |

### 6.4 Anomaly Detection

**REQ-ANALYTICS-032:** The platform SHALL implement anomaly detection to flag unusual patterns in training performance:

| Anomaly Type                    | Detection Method                                                               | Response                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Sudden performance drop**     | Z-score > 3 on per-user rolling accuracy                                       | Alert manager; investigate potential account compromise or personal stress                     |
| **Unusually rapid completion**  | Training completion time < 10th percentile without corresponding high accuracy | Flag for potential cheating or automated completion                                            |
| **Inconsistent performance**    | High variance in accuracy across sessions (some perfect, some near-zero)       | Investigate shared accounts, external help, or selective engagement                            |
| **Mass failure event**          | > 30% of a department failing the same challenge simultaneously                | Investigate whether the challenge is defective or if a real attack is being mimicked           |
| **Counter-training indicators** | User performance improves on simulations but worsens on real-world metrics     | Investigate whether user is gaming the system (learning to spot simulations, not real threats) |

### 6.5 Personalized Learning Path Optimization

**REQ-ANALYTICS-033:** The platform SHALL implement a reinforcement learning-based system that optimizes each user's learning path to minimize time-to-competency while maximizing long-term retention.

| Component         | Specification                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **State Space**   | User's current skill levels across all knowledge domains, engagement history, learning style preference, time constraints                                 |
| **Action Space**  | Next content recommendation: topic, difficulty, format (in-game scenario, interactive lesson, video, assessment), timing                                  |
| **Reward Signal** | Composite of: knowledge retention improvement, engagement maintenance, time efficiency, user satisfaction                                                 |
| **Algorithm**     | Contextual multi-armed bandit (Thompson Sampling) for content selection; separate Q-learning model for session pacing                                     |
| **Cold Start**    | New users assigned to a nearest-neighbor cohort based on role, department, and initial assessment; model personalizes within 3-5 sessions                 |
| **Constraints**   | Must satisfy compliance training requirements; must not create > 72-hour gaps in any critical skill reinforcement; must respect user-set time preferences |

### 6.6 Natural Language Processing for Phishing Assessment

**REQ-ANALYTICS-034:** The platform SHALL use NLP to analyze the quality of user decisions in email triage, going beyond binary correct/incorrect:

| NLP Capability                        | Application                                                                                                                                   | Benefit                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Reasoning Analysis**                | When users are asked to explain why they flagged an email (optional in-game mechanic), NLP analyzes the quality of their reasoning            | Distinguishes between "got lucky" and "genuinely understands the indicators" |
| **Indicator Identification**          | Track which specific textual indicators (urgency language, domain misspelling, grammatical errors, tone mismatch) the user annotated or cited | Map precise sub-skills, not just binary phishing detection                   |
| **Phishing Email Generation Quality** | In advanced game modes where users craft phishing emails (red team training), NLP scores the sophistication and realism                       | Measures deep understanding of social engineering                            |
| **Sentiment Analysis of Feedback**    | Analyze user comments, survey responses, and in-game chat for sentiment                                                                       | Monitor training satisfaction and platform health                            |
| **Automated Report Narrative**        | Generate natural language summaries of analytical findings for non-technical audiences                                                        | Powers the AI-generated board report feature                                 |

### 6.7 Churn Prediction (Consumer Market)

**REQ-ANALYTICS-035:** The platform SHALL implement a consumer churn prediction model:

| Feature Category         | Features                                                                                       | Predictive Power |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ---------------- |
| **Engagement decay**     | Session frequency decline rate, DAU-to-MAU ratio trend, session duration shortening            | High             |
| **Progression stall**    | Time since last level advancement, resource bottleneck frequency, failed attempt streak length | High             |
| **Social disconnection** | Friends list activity decline, guild/team participation drop, leaderboard position decline     | Medium-High      |
| **Economy signals**      | Currency hoarding without spending, shop view without purchase, premium currency depletion     | Medium           |
| **Content exhaustion**   | Percentage of content consumed, repetitive path choices, reduced exploration behavior          | Medium           |
| **External factors**     | Day of week patterns, competing game release dates, seasonal trends                            | Low-Medium       |

**Model Performance Targets:**

| Metric                                     | Target    |
| ------------------------------------------ | --------- |
| AUC-ROC                                    | > 0.82    |
| Precision at top 10% risk                  | > 0.60    |
| Lead time (prediction before actual churn) | 7-14 days |
| False positive rate                        | < 30%     |

---

## 7. Enterprise Reporting Integration

### 7.1 Overview

Enterprise analytics do not exist in isolation. The DMZ's risk metrics, training evidence, and behavioral analytics must integrate seamlessly into the organization's existing reporting and governance ecosystem. This section defines how analytics data flows out of The DMZ and into downstream enterprise systems.

### 7.2 GRC Platform Integration

**REQ-ANALYTICS-036:** The platform SHALL integrate with major GRC (Governance, Risk, Compliance) platforms to feed human risk metrics into the organization's unified risk register.

| GRC Platform             | Integration Method              | Data Exchanged                                                                            |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| **ServiceNow GRC**       | REST API (CMDB + Risk module)   | Risk scores, compliance status, training completion, incident correlation                 |
| **RSA Archer**           | Data feed (XML/JSON) + REST API | Risk assessment data, control effectiveness metrics, policy compliance                    |
| **OneTrust**             | API integration                 | Privacy training completion, data handling compliance scores, GDPR/CCPA awareness metrics |
| **MetricStream**         | Web services integration        | Audit evidence, training records, risk indicators                                         |
| **LogicGate Risk Cloud** | API integration                 | Risk scores, control testing results, compliance evidence                                 |
| **Diligent (Galvanize)** | Data connector                  | Audit evidence, control monitoring data, risk quantification                              |

**Data Mapping for GRC Integration:**

| The DMZ Data Point          | GRC Concept              | Mapping                                                        |
| --------------------------- | ------------------------ | -------------------------------------------------------------- |
| Human Risk Score            | Risk Register Entry      | Risk likelihood/impact input for "Human Factor" risk           |
| PPP                         | Control Effectiveness    | Effectiveness metric for "Security Awareness Training" control |
| Training Completion Rate    | Compliance Status        | Attestation evidence for training-related compliance controls  |
| Knowledge Retention Index   | Risk Trend               | Leading indicator for human risk trajectory                    |
| Phishing Simulation Results | Control Testing          | Periodic testing evidence for phishing awareness control       |
| Behavioral Change Index     | Risk Mitigation Evidence | Quantification of risk reduction from training investment      |

### 7.3 SIEM Correlation

While BRD-07 (Enterprise Integration) covers the technical details of SIEM integration, this section defines the analytics-specific correlation requirements.

**REQ-ANALYTICS-037:** The platform SHALL export analytics-grade data to SIEM platforms that enables correlation between training performance and real security events:

| Correlation Scenario       | The DMZ Data                             | SIEM Data                                       | Insight                                                   |
| -------------------------- | ---------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| **Post-phish behavior**    | User's training score and risk level     | Phishing email click events from email gateway  | Did trained users perform better than untrained?          |
| **Incident attribution**   | User's skill profile at time of incident | Security incident records                       | Was the incident predictable based on training gaps?      |
| **Attack surface mapping** | Department risk scores                   | Vulnerability scan results, asset inventory     | Overlay human risk on technical risk for complete picture |
| **Time-of-day risk**       | Performance by time-of-day analysis      | Authentication and access events by time        | When are users both most active and least vigilant?       |
| **Simulation vs. reality** | Simulated phishing campaign results      | Real phishing attack patterns from threat intel | How well do simulations predict real-world outcomes?      |

### 7.4 Board-Level Risk Reporting

**REQ-ANALYTICS-038:** The platform SHALL generate board-ready risk reports that conform to established governance frameworks:

| Framework                                      | Report Format                                                          | Key Metrics Included                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **NIST CSF**                                   | Maturity assessment across Identify, Protect, Detect, Respond, Recover | Training mapped to CSF functions; human risk score as part of overall cyber risk posture       |
| **FAIR (Factor Analysis of Information Risk)** | Quantitative risk analysis in financial terms                          | Loss event frequency, loss magnitude, human vulnerability factor, control effectiveness        |
| **ISO 27001**                                  | Statement of Applicability compliance                                  | Training control effectiveness (A.7.2.2), awareness metrics                                    |
| **COSO ERM**                                   | Enterprise risk category reporting                                     | Human risk as component of operational risk and compliance risk                                |
| **NACD Cyber-Risk Handbook**                   | Board-level reporting framework                                        | Five key questions: What assets? What threats? How protected? What consequences? How prepared? |

**REQ-ANALYTICS-039:** Board reports SHALL include:

- Trend comparison (quarter-over-quarter, year-over-year)
- Benchmark position (percentile rank against industry peers)
- Risk quantification in financial terms (FAIR methodology)
- Plain-language executive summary (AI-generated, reviewed and editable)
- Recommended actions with estimated impact
- Appendix with detailed data for committee review

### 7.5 Cyber Insurance Evidence Packages

**REQ-ANALYTICS-040:** The platform SHALL generate comprehensive cyber insurance evidence packages:

| Evidence Category                   | Contents                                                                           | Carrier Requirement Source                            |
| ----------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Training Program Documentation**  | Program description, content topics, delivery method, frequency, assignment policy | All major carriers (AM Best, Coalition, Beazley, AIG) |
| **Completion Records**              | Aggregate completion rates with trend, department breakdown, role-based completion | All carriers; often a prerequisite for coverage       |
| **Phishing Simulation Results**     | Campaign frequency, aggregate click rates, trend data, improvement evidence        | Coalition, Hartford, Chubb, Travelers                 |
| **Incident Response Preparedness**  | IR training completion, tabletop exercise participation, response time metrics     | Beazley, AIG, Lloyd's syndicates                      |
| **Risk Quantification**             | Human risk score with methodology, benchmark comparison, year-over-year trend      | Increasingly requested by sophisticated carriers      |
| **Continuous Improvement Evidence** | Quarter-over-quarter improvement in key metrics with statistical significance      | Differentiator for premium negotiation                |

### 7.6 Regulatory Compliance Evidence

**REQ-ANALYTICS-041:** The platform SHALL maintain a compliance evidence repository that automatically collects and organizes evidence required by each supported regulation:

| Regulation             | Evidence Automatically Collected                                                                                     | Retention Period                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **GDPR**               | Training completion, DPA awareness assessment, data handling quiz scores, breach notification procedure test results | Duration of processing + 5 years          |
| **HIPAA**              | Training completion (100% requirement), PHI handling competency, device security awareness                           | 6 years                                   |
| **PCI DSS v4.0**       | Annual training completion, phishing simulation quarterly results, cardholder data handling awareness                | 1 year (current period)                   |
| **SOX**                | IT controls training, access management awareness, change management awareness                                       | 7 years                                   |
| **NIS2**               | Continuous training evidence, incident handling competency, supply chain awareness                                   | As required by member state transposition |
| **CMMC 2.0**           | Role-based training completion, insider threat awareness, social engineering awareness, policy acknowledgments       | Duration of contract + 3 years            |
| **NYDFS 23 NYCRR 500** | Annual training completion for all personnel, cybersecurity program awareness                                        | 5 years                                   |

---

## 8. Consumer Analytics

### 8.1 Overview

Consumer analytics for The DMZ serve a fundamentally different purpose than enterprise analytics. Enterprise analytics prove training effectiveness and ROI. Consumer analytics drive user acquisition, engagement, monetization, and viral growth -- the standard toolkit of free-to-play game analytics, adapted for a product that has the unusual dual mandate of being both entertaining and educational.

### 8.2 Player Acquisition Funnel

**REQ-ANALYTICS-042:** The platform SHALL track the complete player acquisition funnel with attribution:

| Funnel Stage      | Metric                | Definition                                                                                                                 | Target                              |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Awareness**     | Impressions           | Total ad impressions, store page views, social mentions                                                                    | Tracked per channel                 |
| **Interest**      | Click-Through Rate    | Percentage of impressions resulting in store page visit or landing page visit                                              | > 2% (paid); > 5% (organic)         |
| **Consideration** | Store Page Conversion | Percentage of store page visitors who click "Install" / "Download"                                                         | > 30% (mobile); > 15% (Steam)       |
| **Acquisition**   | Install/Download Rate | Percentage of initiations that complete                                                                                    | > 90%                               |
| **Activation**    | Tutorial Completion   | Percentage of installs that complete onboarding tutorial                                                                   | > 70%                               |
| **First Value**   | Day 1 "Aha Moment"    | Percentage of activated users who reach the defined aha moment (first successful phishing detection with narrative payoff) | > 60%                               |
| **Engagement**    | D7 Retention          | Percentage returning after 7 days                                                                                          | > 25%                               |
| **Revenue**       | Conversion to Paying  | Percentage of active users who make a purchase                                                                             | > 3% (mobile); > 5% (premium/Steam) |

**REQ-ANALYTICS-043:** Attribution SHALL be tracked using UTM parameters, platform-specific attribution SDKs (Adjust, AppsFlyer, or Branch), and first-touch/last-touch/multi-touch attribution models. The platform SHALL calculate **Customer Acquisition Cost (CAC)** per channel and **Lifetime Value (LTV)** per cohort, with the target being LTV/CAC > 3x.

### 8.3 Monetization Analytics

| Metric                                      | Definition                                         | Target                                               | Notes                          |
| ------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| **ARPU (Average Revenue Per User)**         | Total revenue / Total active users                 | $0.50-$2.00/month (mobile); $3-$8/month (PC/premium) | Includes all revenue streams   |
| **ARPPU (Average Revenue Per Paying User)** | Total revenue / Paying users                       | $10-$30/month                                        | Measures payer quality         |
| **Conversion Rate**                         | Paying users / Active users                        | 3-7%                                                 | Mobile F2P benchmark: 2-5%     |
| **Revenue by Source**                       | Breakdown of IAP, subscription, ads, DLC           | Track trending mix                                   | Ensure no single source > 70%  |
| **First Purchase Timing**                   | Days from install to first purchase                | Target: 3-14 days                                    | Optimize first offer timing    |
| **Purchase Frequency**                      | Average purchases per paying user per month        | 2-4 transactions                                     | Healthy spending cadence       |
| **Whale Analysis**                          | Revenue concentration in top 1%, 5%, 10% of payers | Top 10% contribute < 50% of revenue                  | Avoid whale dependency         |
| **Refund Rate**                             | Percentage of purchases refunded                   | < 3%                                                 | Platform TOS compliance        |
| **Subscription Retention**                  | Month-over-month retention of subscribers          | > 85% M1; > 70% M6                                   | Critical for recurring revenue |

**REQ-ANALYTICS-044:** The platform SHALL implement a real-time monetization dashboard showing revenue, conversion, and ARPU metrics with the ability to segment by acquisition channel, platform (iOS, Android, Steam, Web), geography, and cohort.

### 8.4 Social and Viral Metrics

| Metric                           | Definition                                                           | Target                                      | Impact                                        |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| **K-Factor (Viral Coefficient)** | Average number of new users each existing user generates             | > 0.3 (aspirational > 1.0 for viral growth) | Reduces CAC                                   |
| **Organic Install Rate**         | Percentage of installs from organic (non-paid) sources               | > 60%                                       | Validates product-market fit                  |
| **Share Rate**                   | Percentage of sessions that include a social share action            | > 5%                                        | Measures share-worthy moments                 |
| **Referral Conversion**          | Percentage of referred users who activate                            | > 40%                                       | Measures referral quality                     |
| **Social Feature Engagement**    | Usage rate of social features (friends, guilds, leaderboards, co-op) | > 30% of active users                       | Correlates with retention                     |
| **User-Generated Content**       | Volume of screenshots, clips, reviews, and forum posts               | Track volume and sentiment                  | Community vitality indicator                  |
| **Net Promoter Score (NPS)**     | Survey-based likelihood to recommend (0-10 scale)                    | > 40                                        | Benchmark against game industry average (~30) |

### 8.5 Platform-Specific Analytics

#### 8.5.1 Steam Analytics

| Metric                      | Source               | Use Case                                                         |
| --------------------------- | -------------------- | ---------------------------------------------------------------- |
| Wishlist conversions        | Steamworks API       | Pre-launch demand forecasting                                    |
| Review score and volume     | Steam Reviews API    | Monitor player sentiment; respond to negative trends             |
| Concurrent players          | SteamDB / Steamworks | Peak and average concurrent player tracking                      |
| Achievement unlock rates    | Steamworks           | Identify content consumption patterns and difficulty calibration |
| Workshop engagement         | Steamworks           | Measure community content creation (if modding supported)        |
| Regional sales distribution | Steamworks           | Localization priority decisions                                  |
| Refund rate and reasons     | Steamworks           | Quality signal; identify systemic issues                         |

#### 8.5.2 Mobile Store Analytics (iOS / Android)

| Metric                     | Source                                  | Use Case                                                  |
| -------------------------- | --------------------------------------- | --------------------------------------------------------- |
| Store page conversion rate | App Store Connect / Google Play Console | ASO (App Store Optimization) effectiveness                |
| Keyword rankings           | App Annie / Sensor Tower                | Search visibility for "cybersecurity" and gaming terms    |
| Rating and review trends   | Store APIs                              | Real-time quality monitoring                              |
| Crash-free rate            | Firebase / Crashlytics                  | Technical quality gate (target: > 99.5%)                  |
| Install source attribution | Adjust / AppsFlyer                      | Marketing channel effectiveness                           |
| Uninstall rate and timing  | Google Play Console / estimates for iOS | Identify critical churn points                            |
| Category ranking           | Store APIs                              | Competitive positioning in Education and Games categories |

### 8.6 Community Health Metrics

| Metric                           | Definition                                                         | Healthy Range               |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| **Forum/Discord Active Members** | Members who post at least once per month                           | > 5% of MAU                 |
| **Sentiment Score**              | Automated sentiment analysis of community posts                    | > 0.6 (on 0-1 scale)        |
| **Toxicity Rate**                | Percentage of posts flagged or moderated for toxicity              | < 2%                        |
| **Developer Response Rate**      | Percentage of significant community concerns addressed by dev team | > 80% within 48 hours       |
| **Content Creator Coverage**     | Number of active YouTubers/streamers covering the game             | Track growth trend          |
| **Bug Report Quality**           | Percentage of community-submitted bug reports that are actionable  | > 50%                       |
| **Feature Request Signal**       | Most-upvoted feature requests correlated with development roadmap  | Qualitative alignment check |

---

## 9. Data Architecture for Analytics

### 9.1 Overview

The analytics platform must process millions of events per day (at enterprise scale with hundreds of thousands of users), store years of historical data for trend analysis and compliance, and serve real-time dashboards alongside complex analytical queries -- all while maintaining strict data privacy, tenant isolation, and regulatory compliance. This section defines the technical architecture required to support these demands.

### 9.2 Event Streaming Architecture

#### 9.2.1 Event Schema

All platform events SHALL conform to a standardized event schema:

```
AnalyticsEvent {
  event_id: UUID                     // Globally unique event identifier
  event_type: string                 // Hierarchical: "game.email.triaged", "sim.phishing.clicked"
  event_version: string              // Schema version: "1.0", "1.1"
  timestamp: ISO 8601 (UTC, ms)      // Event occurrence time
  received_at: ISO 8601 (UTC, ms)    // Server receipt time
  tenant_id: UUID                    // Tenant isolation key
  user_id: UUID                      // Anonymizable user identifier
  session_id: UUID                   // Play session identifier
  device_id: string                  // Hashed device identifier
  platform: enum                     // web, ios, android, steam, enterprise_lms

  // Context
  context: {
    game_version: string             // "1.2.3"
    game_phase: string               // "tutorial", "act_1", "act_2", "endgame"
    game_day: integer                // In-game day number
    difficulty_level: integer        // Current difficulty tier
    ab_test_groups: map<string,string> // Active A/B test assignments
  }

  // Event-specific payload
  payload: json                      // Varies by event_type

  // Privacy
  consent_level: enum                // full, analytics_only, essential_only
  anonymized: boolean                // Whether PII has been stripped
}
```

#### 9.2.2 Event Pipeline Architecture

```
Event Sources                  Streaming Layer           Processing Layer          Storage Layer
+---------------+         +------------------+      +------------------+      +------------------+
| Game Client   |-------->|                  |      |                  |      |                  |
| (browser/app) |         |                  |----->| Stream Processor |----->| Real-time Store  |
+---------------+         |                  |      | (Flink/Kafka     |      | (Redis/Druid)    |
                          |  Message Broker  |      |  Streams)        |      +------------------+
+---------------+         |  (Kafka/         |      |                  |
| Phishing Sim  |-------->|   Redpanda)      |      | - Enrichment     |      +------------------+
| Engine        |         |                  |      | - Sessionization |----->| Data Warehouse   |
+---------------+         |  - Partitioned   |      | - Aggregation    |      | (Snowflake/      |
                          |    by tenant_id  |      | - Anomaly detect |      |  BigQuery/       |
+---------------+         |  - At-least-once |      | - Risk scoring   |      |  ClickHouse)     |
| LMS/SCORM     |-------->|    delivery      |      +------------------+      +------------------+
| Bridge        |         |  - 7-day         |                |
+---------------+         |    retention     |                v               +------------------+
                          |  - Schema        |      +------------------+      | Data Lake        |
+---------------+         |    registry      |      | Batch Processor  |----->| (S3/GCS +        |
| Enterprise    |-------->|                  |      | (Spark/dbt)      |      |  Parquet/Delta)  |
| Integrations  |         +------------------+      |                  |      +------------------+
+---------------+                                   | - Historical     |
                                                    |   aggregation    |
                                                    | - ML training    |
                                                    | - Compliance     |
                                                    |   reports        |
                                                    +------------------+
```

**REQ-ANALYTICS-045:** The event pipeline SHALL:

- Process a sustained throughput of 100,000 events per second with burst capacity to 500,000 events per second
- Guarantee at-least-once delivery (with idempotent processing for exactly-once semantics)
- Maintain event ordering per user within a session
- Support schema evolution without downtime (backward and forward compatible)
- Partition data by tenant_id to enforce isolation at the infrastructure level
- Retain raw events in the message broker for 7 days for reprocessing
- Persist raw events in the data lake for the configured retention period (default 3 years, configurable up to 10 years)

### 9.3 Data Warehouse Design

#### 9.3.1 Schema Design (Dimensional Model)

The analytics warehouse SHALL use a star schema optimized for the most common query patterns:

**Fact Tables:**

| Fact Table                 | Grain                                               | Key Measures                                                               | Approximate Volume       |
| -------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| `fact_email_triage`        | One row per email decision                          | accuracy, response_time_ms, difficulty_score, indicators_checked           | 50M+ rows/month at scale |
| `fact_phishing_simulation` | One row per simulation email delivered              | delivered, opened, clicked, credential_submitted, reported, report_time_ms | 10M+ rows/month          |
| `fact_training_completion` | One row per training module completion              | score, time_spent_seconds, attempts, passed                                | 5M+ rows/month           |
| `fact_game_session`        | One row per play session                            | duration_seconds, decisions_made, accuracy, xp_earned, currency_earned     | 20M+ rows/month          |
| `fact_skill_assessment`    | One row per skill level change event                | old_level, new_level, domain, method                                       | 10M+ rows/month          |
| `fact_monetization`        | One row per purchase/transaction                    | revenue_amount, currency, product_id, source                               | Consumer only            |
| `fact_risk_score`          | One row per risk score calculation per user per day | risk_score, component_scores, factors                                      | 1M+ rows/day at scale    |

**Dimension Tables:**

| Dimension               | Key Attributes                                                                        | Slowly Changing?           |
| ----------------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| `dim_user`              | user_id, display_name, email_hash, role, department, location, tenure_band, risk_tier | SCD Type 2 (track history) |
| `dim_tenant`            | tenant_id, name, industry, size_band, tier, region                                    | SCD Type 2                 |
| `dim_date`              | date_key, year, quarter, month, week, day_of_week, fiscal_period, is_holiday          | Static                     |
| `dim_knowledge_domain`  | domain_id, name, parent_domain, NIST_mapping, compliance_mapping                      | Versioned                  |
| `dim_phishing_template` | template_id, difficulty, vector_type, technique, language                             | Versioned                  |
| `dim_training_module`   | module_id, title, domain, duration, compliance_regulations                            | Versioned                  |
| `dim_game_content`      | content_id, type, narrative_path, difficulty_tier, act                                | Versioned                  |
| `dim_device_platform`   | platform, os, browser, device_category                                                | Static                     |

#### 9.3.2 Materialized Views / Aggregation Tables

For dashboard performance, the following pre-aggregated tables SHALL be maintained:

| Aggregation                    | Grain                                           | Refresh                           | Purpose                             |
| ------------------------------ | ----------------------------------------------- | --------------------------------- | ----------------------------------- |
| `agg_daily_user_metrics`       | One row per user per day                        | Hourly                            | Individual dashboards, trend charts |
| `agg_daily_department_metrics` | One row per department per day                  | Hourly                            | Manager dashboards, heat maps       |
| `agg_daily_tenant_metrics`     | One row per tenant per day                      | Hourly                            | Executive dashboards, benchmarking  |
| `agg_weekly_risk_scores`       | One row per user per week                       | Daily                             | Risk trend analysis                 |
| `agg_monthly_compliance`       | One row per regulation per department per month | Daily                             | Compliance dashboards               |
| `agg_campaign_results`         | One row per campaign                            | Real-time during active campaigns | Campaign monitoring dashboard       |
| `agg_platform_benchmarks`      | One row per industry per size_band per metric   | Weekly                            | Benchmark comparisons               |
| `agg_game_economy`             | One row per currency type per day               | Hourly                            | Economy health dashboard            |

### 9.4 Real-Time vs. Batch Processing

| Processing Type         | Technology                                          | Use Cases                                                                                                                     | Latency                              |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Real-time streaming** | Apache Kafka Streams / Apache Flink                 | Active campaign monitoring, live dashboard counters, anomaly alerts, game economy real-time balance                           | < 30 seconds                         |
| **Micro-batch**         | Apache Spark Structured Streaming / dbt incremental | Materialized view refresh, near-real-time aggregations, engagement metric updates                                             | 1-15 minutes                         |
| **Batch**               | Apache Spark / dbt                                  | Historical aggregation, ML model training, benchmark recalculation, compliance report generation, retention curve calculation | Hourly to daily                      |
| **On-demand**           | SQL query engine (Snowflake/BigQuery/ClickHouse)    | Ad-hoc analytics, custom report generation, data exploration                                                                  | Seconds to minutes (query dependent) |

### 9.5 Data Privacy in Analytics

#### 9.5.1 Privacy-by-Design Principles

**REQ-ANALYTICS-046:** The analytics pipeline SHALL implement privacy-by-design at every layer:

| Principle                   | Implementation                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data minimization**       | Collect only events necessary for defined analytics purposes; no ambient surveillance or keylogging                                                           |
| **Purpose limitation**      | Each data point is tagged with its purpose (training_effectiveness, compliance, engagement, monetization); data cannot be used beyond its stated purpose      |
| **Anonymization at ingest** | Consumer analytics pipeline strips PII at the earliest possible stage; enterprise pipeline retains PII only in the user dimension with strict access controls |
| **Pseudonymization**        | All cross-system analytics use pseudonymous identifiers; real identity mapping stored separately with encryption at rest                                      |
| **Aggregation thresholds**  | No analytics result SHALL be returned if the underlying population is fewer than 5 individuals (k-anonymity with k=5)                                         |
| **Consent management**      | Analytics collection level is tied to the user's consent status; essential_only consent disables all non-essential analytics                                  |
| **Right to erasure**        | User deletion triggers cascade deletion of all analytics data or irreversible anonymization (configurable per regulation)                                     |
| **Tenant isolation**        | Analytics queries are physically or logically partitioned by tenant; no cross-tenant aggregation possible except for anonymized platform-wide benchmarks      |

#### 9.5.2 Data Classification

| Classification   | Examples                                                          | Access Control                                | Encryption                                                                                                   |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Public**       | Platform-wide anonymous benchmarks, industry statistics           | No restriction                                | In transit                                                                                                   |
| **Internal**     | Tenant-level aggregate metrics, anonymized trend data             | Tenant admin role + analytics role            | At rest + in transit                                                                                         |
| **Confidential** | Individual user performance data, risk scores, skill assessments  | Explicit user-level analytics permission      | At rest (AES-256) + in transit (TLS 1.3)                                                                     |
| **Restricted**   | PII mapping tables, de-anonymization keys, raw behavioral streams | DPO approval + break-glass access + audit log | At rest (AES-256 with customer-managed keys) + in transit + in processing (enclaves for sensitive workloads) |

### 9.6 Data Retention Policies

| Data Category              | Default Retention                  | Compliance-Driven Minimum                           | Maximum Allowed                            | Deletion Method                 |
| -------------------------- | ---------------------------------- | --------------------------------------------------- | ------------------------------------------ | ------------------------------- |
| Raw gameplay events        | 1 year                             | N/A                                                 | 3 years                                    | Partition drop + lake lifecycle |
| Aggregated metrics         | 5 years                            | 1 year (PCI DSS); 6 years (HIPAA)                   | 10 years                                   | Scheduled purge                 |
| Compliance evidence        | 7 years                            | 5 years (NYDFS); 6 years (HIPAA); 7 years (SOX)     | 10 years                                   | Immutable archive with expiry   |
| User PII                   | Duration of relationship + 30 days | Per GDPR: erasure on request                        | Duration of relationship + regulatory hold | Crypto-shredding or hard delete |
| Risk scores (historical)   | 3 years                            | 1 year                                              | 7 years                                    | Anonymize then age off          |
| ML training datasets       | 2 years                            | N/A                                                 | 3 years                                    | Dataset versioning with expiry  |
| Audit logs                 | 7 years                            | 1 year (SOC 2); 7 years (SOX)                       | 10 years                                   | Immutable archive with expiry   |
| Consumer monetization data | 3 years                            | Per local tax law (typically 7 years for financial) | 10 years                                   | Financial record retention      |

**REQ-ANALYTICS-047:** The platform SHALL implement automated data lifecycle management that:

- Tracks retention periods per data category per tenant (allowing tenant-specific overrides)
- Provides 30-day advance notification before data deletion
- Executes deletion via crypto-shredding (rotating encryption keys to render data irrecoverable) or physical deletion depending on storage medium
- Generates a deletion certificate for compliance documentation
- Supports litigation holds that suspend deletion for specific data subjects or time ranges

### 9.7 Analytics Infrastructure Sizing

| Scale Tier     | Users          | Events/Day | Warehouse Size (1yr) | Compute                       | Estimated Monthly Cost |
| -------------- | -------------- | ---------- | -------------------- | ----------------------------- | ---------------------- |
| **Startup**    | < 5,000        | < 500K     | < 50 GB              | 2 vCPU, 8 GB RAM              | $200-$500              |
| **Growth**     | 5,000-50,000   | 500K-5M    | 50-500 GB            | 8 vCPU, 32 GB RAM             | $500-$2,000            |
| **Enterprise** | 50,000-500,000 | 5M-50M     | 500 GB-5 TB          | 32 vCPU, 128 GB RAM (cluster) | $2,000-$10,000         |
| **Platform**   | 500,000+       | 50M+       | 5+ TB                | Auto-scaling cluster          | $10,000-$50,000+       |

---

## 10. Appendices

### Appendix A: Glossary

| Term         | Definition                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **ARPU**     | Average Revenue Per User. Total revenue divided by total active users over a time period.                                         |
| **ARPPU**    | Average Revenue Per Paying User. Total revenue divided by number of users who made at least one purchase.                         |
| **AUC-ROC**  | Area Under the Receiver Operating Characteristic Curve. Measure of ML model discrimination ability (0.5 = random, 1.0 = perfect). |
| **BCI**      | Behavioral Change Index. Composite score measuring observed behavioral improvement in security practices.                         |
| **BKT**      | Bayesian Knowledge Tracing. Probabilistic model for estimating student knowledge from response data.                              |
| **CAC**      | Customer Acquisition Cost. Total marketing and sales spend divided by number of new customers acquired.                           |
| **CMMC**     | Cybersecurity Maturity Model Certification. US DoD contractor cybersecurity framework.                                            |
| **DAU**      | Daily Active Users. Unique users with at least one session in a calendar day.                                                     |
| **DBIR**     | Data Breach Investigations Report. Annual report published by Verizon analyzing breach data.                                      |
| **DORA**     | Digital Operational Resilience Act. EU regulation for financial sector ICT risk management.                                       |
| **DPO**      | Data Protection Officer. Individual responsible for data protection compliance under GDPR.                                        |
| **FAIR**     | Factor Analysis of Information Risk. Quantitative risk analysis methodology.                                                      |
| **GRC**      | Governance, Risk, and Compliance. Integrated approach to organizational governance.                                               |
| **HRS**      | Human Risk Score. Composite metric quantifying an organization's human cybersecurity risk exposure.                               |
| **IRT**      | Item Response Theory. Statistical framework for modeling the relationship between item difficulty and examinee ability.           |
| **K-Factor** | Viral coefficient. The number of new users each existing user generates through referrals and sharing.                            |
| **KRI**      | Knowledge Retention Index. Estimated current knowledge level accounting for time-decay since last reinforcement.                  |
| **LTV**      | Lifetime Value. Predicted total revenue from a customer over their entire relationship.                                           |
| **MAU**      | Monthly Active Users. Unique users with at least one session in a calendar month.                                                 |
| **NPS**      | Net Promoter Score. Measure of customer loyalty based on likelihood to recommend (-100 to +100).                                  |
| **PPP**      | Phish-Prone Percentage. The percentage of users who interact with simulated phishing emails.                                      |
| **PRS**      | Phishing Resilience Score. Composite score measuring a user's phishing detection capability.                                      |
| **SAT**      | Security Awareness Training. Programs designed to educate employees about cybersecurity threats.                                  |
| **SCD**      | Slowly Changing Dimension. Data warehouse design pattern for tracking dimension attribute changes over time.                      |
| **SHAP**     | SHapley Additive exPlanations. Method for explaining individual ML predictions.                                                   |
| **SIEM**     | Security Information and Event Management. Platform for aggregating and analyzing security event data.                            |
| **SOAR**     | Security Orchestration, Automation, and Response. Platform for automating security operations workflows.                          |

### Appendix B: KPI Reference Matrix

| KPI                       | Owner            | Dashboard                 | Calculation Frequency         | Benchmark Source         | Alert Threshold                              |
| ------------------------- | ---------------- | ------------------------- | ----------------------------- | ------------------------ | -------------------------------------------- |
| Human Risk Score          | CISO             | Executive, CISO           | Daily                         | Platform-wide            | > 70 (critical risk)                         |
| Phish-Prone Percentage    | Security Team    | CISO, Compliance          | Per campaign + rolling 30-day | KnowBe4, Proofpoint      | > 15% (action required)                      |
| Phishing Report Rate      | Security Team    | CISO                      | Per campaign + rolling 30-day | Cofense                  | < 20% (improvement needed)                   |
| Knowledge Retention Index | Training Manager | CISO, Manager             | Weekly                        | Platform-wide            | < 50 (reinforcement needed)                  |
| Behavioral Change Index   | Training Manager | CISO, Manager, Individual | Monthly                       | Platform-wide            | Declining trend > 2 months                   |
| Training Completion Rate  | Compliance       | Compliance, Manager       | Daily                         | Industry (95%+ target)   | < 80% with deadline in 30 days               |
| Time-to-Competency        | Training Manager | CISO, Manager             | Per user lifecycle            | Platform-wide, SANS      | > 2x median for cohort                       |
| ROI Multiplier            | CFO/CISO         | Executive, ROI            | Monthly                       | KnowBe4, Forrester       | < 5x (investigate program effectiveness)     |
| DAU/MAU Ratio             | Product          | Game Analytics            | Daily                         | Game industry benchmarks | < 15% (engagement crisis)                    |
| D30 Retention             | Product/Growth   | Game Analytics            | Daily (cohort)                | Game industry benchmarks | < 8% consumer; < 40% enterprise              |
| ARPU                      | Revenue          | Consumer Analytics        | Monthly                       | Game industry benchmarks | Declining trend > 2 months                   |
| Churn Rate                | Customer Success | Consumer, Enterprise      | Monthly                       | SaaS/Game benchmarks     | > 10% monthly (enterprise); > 20% (consumer) |

### Appendix C: Dashboard-to-Persona Mapping

| Dashboard          | Primary Persona                | Secondary Persona               | Access Level                | Data Scope                       |
| ------------------ | ------------------------------ | ------------------------------- | --------------------------- | -------------------------------- |
| Executive          | CEO, CFO, Board                | CRO, General Counsel            | Executive role              | Tenant-wide aggregate            |
| CISO               | CISO, VP Security              | SOC Manager, Security Architect | Security admin role         | Tenant-wide, drill to individual |
| Compliance         | CCO, Compliance Analyst        | Internal Auditor, DPO           | Compliance role             | Tenant-wide, regulation-scoped   |
| Department Manager | Department Head, Team Lead     | HR Business Partner             | Manager role                | Own department/team only         |
| Individual Learner | Employee, Player               | N/A                             | Basic user role             | Own data only                    |
| Game Analytics     | Game Designer, Product Manager | Data Analyst                    | Platform admin role         | Platform-wide (anonymized)       |
| Consumer Analytics | Growth Lead, Marketing         | Revenue Operations              | Platform admin role         | Platform-wide consumer           |
| ROI                | CFO, CISO                      | Procurement, Vendor Management  | Executive or security admin | Tenant-wide                      |

### Appendix D: Integration Protocol Summary

| Integration Target           | Protocol                   | Authentication             | Data Format   | Direction       |
| ---------------------------- | -------------------------- | -------------------------- | ------------- | --------------- |
| SIEM (Splunk)                | HTTPS (HEC)                | HEC Token                  | JSON (CIM)    | Outbound        |
| SIEM (Sentinel)              | HTTPS (Data Collector API) | Workspace Key / Azure AD   | JSON          | Outbound        |
| SIEM (QRadar)                | Syslog TLS                 | Certificate                | LEEF/CEF      | Outbound        |
| GRC (ServiceNow)             | REST API                   | OAuth 2.0                  | JSON          | Bidirectional   |
| GRC (Archer)                 | REST/Data Feed             | API Key                    | XML/JSON      | Outbound        |
| Insurance Evidence           | File Export                | N/A (exported document)    | PDF, CSV      | Outbound        |
| BI Tools (Tableau, Power BI) | ODBC/JDBC or REST API      | Service Account            | SQL/JSON      | Outbound (read) |
| Data Lake (S3/GCS)           | Object Storage API         | IAM Role / Service Account | Parquet/Delta | Outbound        |
| Webhook                      | HTTPS POST                 | HMAC signature             | JSON          | Outbound        |

### Appendix E: Compliance Evidence Auto-Collection Matrix

| Regulation                 | Requirement                                                                | Evidence Auto-Collected                                                                     | Export Format |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------- |
| GDPR Art. 39(1)(b)         | Monitor compliance with data protection policies including staff awareness | Training completion records, data handling quiz scores, policy acknowledgments              | PDF, CSV      |
| HIPAA 45 CFR 164.308(a)(5) | Security awareness and training program                                    | 100% completion records, phishing simulation results, sanctions documentation               | PDF, CSV      |
| PCI DSS v4.0 Req. 12.6.1   | Formal security awareness program                                          | Annual training completion, phishing simulation quarterly results                           | PDF, CSV      |
| PCI DSS v4.0 Req. 12.6.2   | Review security awareness program at least annually                        | Program review documentation, content update logs, effectiveness metrics                    | PDF           |
| SOX Section 404            | Internal controls over financial reporting                                 | IT controls training evidence, access management awareness, segregation of duties awareness | PDF, XBRL     |
| NIS2 Art. 20(2)            | Training on cybersecurity risk management                                  | Continuous training evidence, board-level training participation, supply chain awareness    | PDF, CSV      |
| NYDFS 23 NYCRR 500.14      | Monitoring and training                                                    | Annual training records, phishing simulation records, privileged access training            | PDF, CSV      |
| CMMC AT.L2-3.2.1           | Role-based security awareness                                              | Role-specific training completion, insider threat training, social engineering awareness    | PDF, CSV      |
| ISO 27001 A.7.2.2          | Information security awareness, education, and training                    | Training records, competency assessments, awareness campaign evidence                       | PDF, CSV      |
| DORA Art. 13.6             | ICT-related incident management training                                   | Incident response training completion, tabletop exercise results, detection skill metrics   | PDF, CSV      |

### Appendix F: Event Taxonomy (Top-Level)

| Event Category     | Event Types                                                                                                                                          | Volume Estimate     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `game.email.*`     | `received`, `opened`, `triaged.approved`, `triaged.rejected`, `triaged.flagged`, `indicators.checked`, `time.spent`                                  | Highest volume      |
| `game.access.*`    | `request.received`, `request.approved`, `request.denied`, `verification.checked`, `escalated`                                                        | High volume         |
| `game.threat.*`    | `alert.displayed`, `alert.acknowledged`, `threat.contained`, `threat.missed`, `escalated`                                                            | Medium volume       |
| `game.upgrade.*`   | `viewed`, `purchased`, `installed`, `prioritized`                                                                                                    | Low volume          |
| `game.resource.*`  | `allocated`, `spent`, `earned`, `budget.set`                                                                                                         | Medium volume       |
| `game.narrative.*` | `dialog.displayed`, `choice.made`, `lore.viewed`, `ending.reached`                                                                                   | Medium volume       |
| `game.session.*`   | `started`, `ended`, `paused`, `resumed`, `crashed`                                                                                                   | Medium volume       |
| `sim.phishing.*`   | `campaign.launched`, `email.delivered`, `email.opened`, `link.clicked`, `credential.submitted`, `attachment.opened`, `reported`, `training.assigned` | Campaign-dependent  |
| `training.*`       | `assigned`, `started`, `progressed`, `completed`, `assessed`, `passed`, `failed`, `expired`                                                          | Low-Medium volume   |
| `risk.*`           | `score.calculated`, `tier.changed`, `alert.generated`, `prediction.updated`                                                                          | Daily per user      |
| `compliance.*`     | `requirement.met`, `requirement.overdue`, `evidence.generated`, `audit.exported`                                                                     | Low volume          |
| `consumer.*`       | `install`, `activate`, `purchase`, `subscribe`, `share`, `refer`, `rate`, `review`                                                                   | Consumer only       |
| `system.*`         | `health.check`, `pipeline.lag`, `error`, `config.changed`                                                                                            | Internal monitoring |

### Appendix G: ROI Calculation Worksheet

This worksheet provides the step-by-step calculation used by the ROI calculator:

```
=== THE DMZ ROI CALCULATION WORKSHEET ===

SECTION 1: COSTS
  A1. Platform license fee (annual)                          $__________
  A2. Implementation / onboarding fee (one-time, amortized)  $__________
  A3. Administration time (hours/month x hourly rate x 12)   $__________
  A4. Employee training time (users x hours x hourly rate)   $__________
  A5. Opportunity cost (alternative uses of budget)          $__________
  ---------------------------------------------------------------
  A.  TOTAL ANNUAL COST (A1 + A2 + A3 + A4 + A5)           $__________

SECTION 2: BREACH PREVENTION VALUE
  B1. Industry annual breach probability                     _________%
  B2. Percentage of breaches with human element              _________%
  B3. Measured risk reduction (PPP improvement)              _________%
  B4. Average breach cost for your industry                  $__________
  B5. Breach prevention value (B1 x B2 x B3 x B4)          $__________

SECTION 3: INSURANCE SAVINGS
  C1. Current annual cyber insurance premium                 $__________
  C2. Estimated premium reduction from SAT evidence          _________%
  C3. Annual insurance savings (C1 x C2)                     $__________

SECTION 4: COMPLIANCE SAVINGS
  D1. Audit preparation time saved (hours x rate)            $__________
  D2. Automated evidence generation savings                  $__________
  D3. Reduced audit findings (count x cost/finding)          $__________
  D4. Regulatory fine risk reduction                         $__________
  D5. Compliance savings (D1 + D2 + D3 + D4)                $__________

SECTION 5: PRODUCTIVITY SAVINGS
  E1. Reduced incident response costs                        $__________
  E2. Help desk ticket reduction                             $__________
  E3. SOC triage efficiency improvement                      $__________
  E4. Reduced downtime value                                 $__________
  E5. Voluntary engagement offset                            $__________
  E6. Productivity savings (E1 + E2 + E3 + E4 + E5)         $__________

SECTION 6: ROI CALCULATION
  F1. TOTAL ANNUAL BENEFITS (B5 + C3 + D5 + E6)             $__________
  F2. TOTAL ANNUAL COST (A from Section 1)                   $__________
  F3. NET VALUE (F1 - F2)                                    $__________
  F4. ROI PERCENTAGE ((F1 - F2) / F2 x 100)                 __________%
  F5. ROI MULTIPLIER (F1 / F2)                               __________x
  F6. PAYBACK PERIOD (F2 / (F1 / 12))                        __________ months
```

### Appendix H: Benchmark Data Sources

| Source                                           | URL/Reference                            | Update Cycle | Key Data Points                                                |
| ------------------------------------------------ | ---------------------------------------- | ------------ | -------------------------------------------------------------- |
| KnowBe4 Phishing by Industry Benchmarking Report | knowbe4.com/phishing-benchmarking-report | Annual (Q1)  | PPP by industry, company size, training duration               |
| Proofpoint State of the Phish                    | proofpoint.com/state-of-phish            | Annual (Q1)  | Click rates, reporting rates, threat types, regional breakdown |
| Verizon Data Breach Investigations Report (DBIR) | verizon.com/dbir                         | Annual (Q2)  | Breach vectors, human element %, industry breakdown            |
| IBM/Ponemon Cost of a Data Breach                | ibm.com/security/data-breach             | Annual (Q3)  | Breach cost by industry, cost per record, cost factors         |
| SANS Security Awareness Report                   | sans.org/security-awareness-training     | Annual       | Maturity model, budget, FTE, reporting structure               |
| Cofense Annual Phishing Report                   | cofense.com/annual-phishing-report       | Annual       | Reporting rates, phishing types, threat intelligence           |
| Gartner Market Guide for SAT                     | gartner.com                              | As published | Vendor landscape, market direction, maturity model             |
| Forrester Wave / Total Economic Impact           | forrester.com                            | As published | Vendor evaluation, ROI methodology, case studies               |
| NIST Cybersecurity Framework                     | nist.gov/cyberframework                  | Continuous   | Control mappings, maturity assessment                          |
| Osterman Research SAT ROI Studies                | ostermanresearch.com                     | As published | ROI calculations, cost-benefit analysis                        |

---

_Document End -- BRD-06 v1.0_
_Next Review: 2026-03-05_
_Distribution: Product Management, Engineering, Sales, Customer Success, Marketing_
