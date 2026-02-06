# 12 -- Analytics and Learning Assessment Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-12
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Product, Engineering, Compliance
**Authors:** Analytics, Learning Science, and Security Strategy Team

---

## Table of Contents

1. Executive Summary
2. Scope and Non-Goals
3. Alignment With BRD Requirements
4. Analytics Vision and Principles
5. Learning Model and Competency Framework
6. Assessment Architecture
7. Telemetry and Event Taxonomy
8. Data Pipeline and Processing
9. Data Model and Storage
10. Metrics, KPIs, and Calculations
11. Dashboards and Reporting
12. Adaptive Learning and Difficulty Integration
13. Experimentation and Validation
14. Privacy, Ethics, and Compliance
15. Security and Access Control
16. Performance and Scalability
17. Data Quality and Governance
18. Integrations and Exports
19. Failure Modes and Mitigations
20. Implementation Roadmap (Phase 2)
21. Open Questions and Decision Log
22. Appendix A: Metric Dictionary (Selected)
23. Appendix B: Event Schema Examples
24. Appendix C: Learning Assessment Rubrics
25. Appendix D: Glossary (Analytics and Learning)
26. Appendix E: Sample Reports and Data Contracts

---

## 1. Executive Summary

This document defines the analytics and learning assessment design for The DMZ: Archive Gate. It translates the Business Requirements Document into a measurable, auditable system that can prove behavior change, ensure compliance, and preserve the stealth learning experience. The design unifies consumer game analytics, enterprise training reporting, and adaptive learning under a single event sourced architecture, with strict tenant isolation and privacy by design.

The analytics stack is a first class product feature, not an afterthought. It is responsible for capturing and interpreting player decisions across the core game loop, converting those actions into skill signals, and surfacing outcomes through dashboards and reports for CISOs, trainers, and executives. The analytics module defined in the backend architecture is the operational backbone. It ingests events emitted by the game engine, threat engine, and phishing simulation systems, computes player skill profiles, and produces risk heatmaps, compliance evidence, and ROI metrics. This design follows the BRD requirements for measurement of phishing click rates, reporting rates, knowledge retention, and behavioral change, while also supporting consumer retention analytics and experimentation.

Learning assessment is handled through a combination of implicit and explicit signals. Implicit assessment is derived from in game actions such as email triage accuracy, verification usage, incident response quality, and risk scoring calibration. Explicit assessment appears as short, diegetic micro assessments embedded in intelligence briefs, after action reviews, and spaced repetition prompts. The system uses an evidence based scoring model that weights difficulty, context, and recency. It avoids punitive or test like interactions that would break immersion and reduce engagement. The outcome is a continuously updated competency map across the seven domains defined in the BRD: phishing detection, password security, data handling, social engineering resistance, incident response, physical security, and compliance awareness.

The design includes a full telemetry taxonomy and event schema, data processing pipeline, storage model, metric definitions, dashboard requirements, privacy safeguards, and governance controls. It emphasizes determinism and auditability, aligning with the state machine design and event sourcing strategy. The result is a unified measurement system that can prove real security outcomes for enterprise customers while also supporting a rich consumer analytics layer for game optimization.

---

## 2. Scope and Non-Goals

### 2.1 In Scope

- Analytics and learning assessment requirements for both enterprise and consumer modes.
- Event taxonomy and instrumentation guidance for the core loop, threat engine, breach mechanics, and phishing simulation engine.
- Data pipeline design from event ingestion to reporting outputs.
- Skill and competency model aligned to BRD learning objectives and regulatory frameworks.
- Definitions for all required KPIs, including phishing metrics, retention, and behavioral change.
- Dashboard specifications for CISO, trainer, and executive audiences.
- Privacy, compliance, and ethical safeguards for employee training data.
- Integration requirements for LMS, SIEM, SOAR, and reporting export formats.

### 2.2 Out of Scope

- Full UI component specification for analytics views. Those are defined in the UI/UX design document. This document only specifies analytics data requirements and presentation intent.
- Detailed backend implementation. The backend architecture document defines service boundaries and API routes. This document focuses on analytics data logic and assessment design.
- Narrative content production. This document may reference where micro assessments are embedded but does not script story content.
- Multiplayer analytics and competitive esports features beyond baseline tracking for cooperative and competitive sessions.

### 2.3 Design Constraints

- No analytics or assessment interaction may break the stealth learning illusion. All explicit assessment must remain diegetic.
- No per email timers. Time based metrics are observational only and must not be used to pressure players.
- All analytics must be reproducible from the event log to satisfy audit requirements and regulatory evidence.
- Cross tenant data access is forbidden. Benchmarks are anonymized and aggregated.

---

## 3. Alignment With BRD Requirements

This design maps directly to the BRD functional requirements for analytics and reporting and to the learning outcome goals defined in the success metrics. The table below shows traceability from BRD analytics requirements to the elements in this design.

| BRD Requirement                                                        | Design Element in This Document                                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| FR-AN-001 Phishing simulation click rate and reporting rate tracking   | Section 10 metrics definitions, Section 11 dashboards, Section 18 exports                       |
| FR-AN-002 Knowledge retention measurement via spaced repetition        | Section 6 assessment architecture, Section 12 adaptive learning                                 |
| FR-AN-003 Behavioral change metrics                                    | Section 10 metrics and calculations, Section 11 dashboards                                      |
| FR-AN-004 Competency mapping across domains                            | Section 5 competency framework, Section 9 data model                                            |
| FR-AN-005 Cost of breach avoidance calculator                          | Section 10 ROI metrics, Section 11 executive dashboard                                          |
| FR-AN-006 Phishing susceptibility reduction tracking                   | Section 10 baseline and trend model                                                             |
| FR-AN-007 Training cost per employee vs benchmarks                     | Section 11 executive dashboard and benchmarks                                                   |
| FR-AN-008 Cyber insurance premium impact tracking                      | Section 10 ROI metrics and export support                                                       |
| FR-AN-009 CISO dashboard with board-ready visualizations               | Section 11.1 dashboard specification with board-ready visualizations                            |
| FR-AN-010 Organizational risk heat map                                 | Section 11.2 risk heat map                                                                      |
| FR-AN-011 Trend analysis with predictive risk indicators               | Section 11.1 CISO dashboard trend analysis, Section 12 adaptive learning and prediction signals |
| FR-AN-012 Industry benchmarking                                        | Section 11.4 benchmarking and anonymization                                                     |
| FR-AN-013 Framework specific compliance reports                        | Section 11.3 compliance reporting                                                               |
| FR-AN-014 Automated compliance gap identification                      | Section 11.3 compliance reporting logic                                                         |
| FR-AN-015 Training completion certificates                             | Section 11 and Section 18 export integration                                                    |
| FR-AN-016 Policy acknowledgment tracking                               | Section 10 and Section 18 LMS alignment                                                         |
| FR-AN-017 Retention curves                                             | Section 10 consumer analytics, Section 11 retention views                                       |
| FR-AN-018 Session duration and frequency                               | Section 10 consumer analytics                                                                   |
| FR-AN-019 Content effectiveness scoring                                | Section 10 module effectiveness metrics                                                         |
| FR-AN-020 A/B testing framework                                        | Section 13 experimentation                                                                      |
| FR-AN-021 Predictive analytics for at risk players                     | Section 12 adaptive learning and risk modeling                                                  |
| FR-ENT-028 Real-time compliance dashboards per regulatory framework    | Section 11.3 compliance reporting                                                               |
| FR-ENT-029 Audit-ready report generation (PDF, CSV, JSON)              | Section 11.1 and Section 18.4 report export formats                                             |
| FR-ENT-030 Immutable audit logs with SHA-256 integrity                 | Section 15.2 audit logging                                                                      |
| FR-ENT-031 Configurable retention policies (1-7 years)                 | Section 8.5 data retention and archival                                                         |
| FR-ENT-032 Individual training transcripts with audit trail            | Section 11.3 compliance reporting                                                               |
| FR-ENT-033 Certificate generation with digital signature               | Section 6.4 summative assessment, Section 11.3 compliance reporting                             |
| FR-ENT-034 Management training attestation (NIS2 Art. 20, DORA Art. 5) | Section 11.3 compliance reporting                                                               |
| BRD Section 16 Security awareness quiz score                           | Section 10.8 security awareness quiz score                                                      |
| BRD Section 16 NPS tracking (enterprise and consumer)                  | Section 10.9 NPS tracking                                                                       |
| BRD Section 16 Retention targets (D1, D7, D30)                         | Section 10.10 consumer game analytics                                                           |

Additional cross references:

- BRD Section 5.4 and 5.5 skill mapping influences the competency model in Section 5.
- BRD Section 6.2 and 6.5 define enterprise platform expectations for reporting, audit trails, and multi tenancy, addressed in Sections 9, 11, 14, and 15.
- BRD Section 7 non functional requirements for performance, privacy, and availability constrain analytics design in Sections 16 and 17.
- BRD Section 11 learning theory integration guides the assessment design in Sections 5 and 6.
- DD-01 state machine design and telemetry section informs event taxonomy in Section 7.
- DD-09 analytics module and storage model are expanded in Section 9.

---

## 4. Analytics Vision and Principles

The analytics and learning assessment system must satisfy three audiences with distinct objectives: security leadership, training administrators, and players. The system must show measurable reductions in security risk for enterprise buyers, support compliance evidence for auditors, and provide actionable feedback without turning the game into a test. It must also support the consumer growth model by measuring engagement, retention, and content quality.

### 4.1 Principles

- Measurement integrity over vanity metrics. Every metric must be defensible, reproducible, and explainable to an enterprise buyer or regulator.
- Stealth learning preservation. Assessment signals are embedded in play. Any explicit test like interaction must be diegetic and optional.
- Determinism and auditability. Any report must be reproducible by replaying the event log and the same scoring rules.
- Privacy by design. Data should be minimized, pseudonymized where possible, and never used for punitive employee actions without explicit policy.
- Cross mode consistency. Consumer and enterprise analytics share the same underlying event model, enabling a single codebase and consistent instrumentation.
- Actionability. Dashboards must lead to clear recommendations and next steps, not just charts.
- Fairness. Metrics must account for difficulty level, threat tier, and content variation to avoid penalizing users for more challenging scenarios.

### 4.2 Analytics Outputs

The system produces four classes of outputs.

- Operational analytics for the game team. These include retention curves, session length, difficulty balance, and content effectiveness.
- Learning analytics for trainers. These include competency maps, skill gaps, and remediation recommendations.
- Risk analytics for CISOs. These include phishing susceptibility trends, incident response readiness, and risk heat maps.
- Compliance evidence for auditors. These include completion certificates, policy acknowledgement logs, and framework aligned reports.

Each output is derived from the same event stream, but filtered and aggregated based on role and data access permissions.

---

## 5. Learning Model and Competency Framework

The learning model is grounded in the six learning theories described in the BRD and operationalized through the core loop. The competency framework is the central abstraction that allows the platform to convert gameplay into measurable cybersecurity skills.

### 5.1 Competency Domains

The platform tracks seven domains as defined in the BRD functional requirements.

1. Phishing detection
2. Password security
3. Data handling
4. Social engineering resistance
5. Incident response
6. Physical security
7. Compliance awareness

Each domain is further broken into measurable subskills. Subskills are not exposed to learners but are used internally to compute the competency map and to target adaptive learning.

### 5.2 Subskills and Evidence Types

| Domain                        | Subskills                                                                                            | Primary Evidence Types                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Phishing detection            | Header analysis, URL inspection, attachment scrutiny, urgency cue recognition, brand spoof detection | Indicator selection, decision accuracy, verification usage                   |
| Password security             | Strong password recognition, credential handling, MFA awareness                                      | Training prompts, policy acknowledgements, response to credential harvesting |
| Data handling                 | Data classification, retention decisions, contract clause analysis, least privilege                  | Lease decisions, contract review accuracy, data disposal choices             |
| Social engineering resistance | Pretext validation, authority pressure resistance, emotional manipulation detection                  | Decision accuracy under pretext, escalation to verification                  |
| Incident response             | Containment decisions, recovery sequencing, reporting timeliness                                     | Incident log actions, response time, tool deployment                         |
| Physical security             | Access badge validation, facility entry exceptions                                                   | Physical access decisions in narrative events                                |
| Compliance awareness          | Policy acknowledgement, framework specific knowledge                                                 | Policy prompts, compliance quizzes embedded in intel briefs                  |

### 5.3 Competency Scale

Each domain is tracked on a 0 to 100 scale. The scale represents observed mastery, not theoretical knowledge. Scores are updated continuously and include confidence ranges.

- 0 to 39 indicates foundational exposure with inconsistent performance.
- 40 to 69 indicates operational competence with occasional errors.
- 70 to 89 indicates consistent skill across normal conditions.
- 90 to 100 indicates mastery under complex and high pressure conditions.

Scores are not exposed directly to end users in consumer mode. In enterprise mode, scores are presented as bands with descriptive labels to avoid creating a punitive environment.

### 5.4 Evidence Weighting

Evidence is weighted by difficulty tier, threat level, and contextual complexity. For example, a correct decision during SEVERE threat level counts more than the same decision during LOW threat level. This prevents score inflation from easy scenarios and ensures that improvement reflects true skill growth.

The weighting model uses three multiplicative factors.

- Difficulty factor: based on content tier 1 to 5.
- Context factor: based on threat tier and campaign phase.
- Freshness factor: based on recency of evidence and spaced repetition scheduling.

### 5.5 Mapping to Game Mechanics

The competency model aligns with the BRD mechanic to skill mapping and the detailed mapping in Appendix D of the BRD.

| Game Mechanic              | Evidence for Competency                 | Primary Domain                          |
| -------------------------- | --------------------------------------- | --------------------------------------- |
| Email triage and worksheet | Indicator accuracy, false positive rate | Phishing detection                      |
| Verification packet review | Identity validation rate                | Social engineering resistance           |
| Threat assessment sheet    | Risk score calibration                  | Compliance awareness, incident response |
| Approve deny decision      | Risk acceptance alignment               | Phishing detection, data handling       |
| Incident log actions       | Response sequence correctness           | Incident response                       |
| Data salvage contract      | Clause analysis accuracy                | Data handling and compliance            |
| Facility status review     | Resource planning behavior              | Incident response readiness             |

### 5.6 Skill Profile Data Structure

Each player has a skill profile that includes domain scores, subskill confidence, and evidence counts. These profiles power adaptive learning, enterprise reporting, and longitudinal tracking.

Key properties in the skill profile:

- total evidence points per domain
- last updated timestamp
- domain score with confidence interval
- proficiency trend slope over the past 30 and 90 days
- recommended focus area for next sessions

---

## 6. Assessment Architecture

Learning assessment is designed to be mostly implicit. Explicit assessment exists only in short, diegetic interactions that reinforce learning rather than interrupt it. The architecture supports three assessment layers: baseline calibration, continuous implicit assessment, and spaced repetition reinforcement.

### 6.1 Baseline Calibration

The onboarding sequence functions as a baseline assessment. It includes a curated set of low to moderate difficulty emails and verification tasks with clear signal patterns. The system uses these early decisions to initialize the competency profile without exposing a test.

Baseline calibration rules:

- Calibration lasts for the first three in game days or until a minimum evidence threshold per domain is reached.
- Calibration ignores performance penalties in the narrative economy to avoid discouraging new players.
- Calibration outcomes are used only to tune early difficulty and are not shown in enterprise dashboards.

### 6.2 Continuous Implicit Assessment

Every meaningful decision in the core loop produces evidence. The system classifies each decision into one or more evidence categories, such as phishing indicator detection, identity verification, or incident response containment. Evidence is then aggregated into domain scores with weighted confidence.

Implicit assessment rules:

- Evidence is captured only from player actions that have real consequences in the game.
- The system records the chosen action, available evidence, threat tier, and difficulty to contextualize the decision.
- The system avoids binary pass fail grading. Instead, it records degrees of correctness and recognizes partially correct decisions.

### 6.3 Spaced Repetition and Micro Assessments

The platform uses spaced repetition to improve knowledge retention. Micro assessments are delivered as short, optional interactions embedded in intelligence briefs or after action reviews. They are designed to be less than two minutes and always framed as part of the story.

Spaced repetition mechanics:

- The schedule uses a modified Leitner system with SM-2 algorithm as described in the BRD. Intervals range from 1 day for new concepts to 180 days for mastered items. Review sessions are delivered via multiple channels. Interleaving of review topics is applied for improved discrimination.
- Each domain has a queue of items tagged with difficulty, last review date, and performance history.
- Items can be reviewed through short question prompts, quick indicator checks, or short decisions on mock emails.

Performance on micro assessments updates domain scores and also adjusts the scheduling interval. Incorrect responses shorten the interval, while strong performance extends it.

### 6.4 Summative Assessment for Enterprise

Enterprise deployments may require explicit proof of completion. Summative assessments exist as a configurable end of campaign review. They are presented as a final intelligence briefing that includes a small number of direct questions and short case decisions.

Summative assessment rules:

- Summative assessments are optional at the platform level but can be mandated by the tenant policy.
- Summative assessments are always labeled as required training elements, not hidden.
- Results feed into compliance reports and completion certificates. Per BRD FR-ENT-033, certificates include digital signatures, regulatory framework references, and expiration dates.

### 6.5 Assessment Fairness and Normalization

Scores must be comparable across players who experience different content. The system normalizes evidence by difficulty, threat tier, and scenario complexity. It also tracks content quality to avoid penalizing players for flawed or ambiguous content.

Normalization rules:

- Each item has a difficulty rating and confidence rating. Items with low confidence reduce scoring weight.
- The system discards evidence from bugged or retracted scenarios, flagged by content quality checks.
- Time based metrics are treated as secondary signals and are never used as sole indicators of competence.

### 6.6 Feedback to Learners

Feedback is provided through diegetic cues. For example, Morpheus may comment on recurring mistakes, or the intelligence system may highlight a missed indicator in an after action review. The goal is to guide improvement without exposing a score sheet.

---

## 7. Telemetry and Event Taxonomy

Telemetry is the raw material for analytics and assessment. This section defines the event naming scheme, required fields, and the taxonomy of events across the game and enterprise systems. All analytics are derived from events that can be replayed and audited.

### 7.1 Event Design Principles

- Every event is immutable and append only.
- Events must be versioned to support schema evolution.
- Events must include tenant and session context for isolation and replay.
- Event names are human readable and follow a consistent namespace pattern.
- Event payloads minimize PII and store references instead of full content.

### 7.2 Event Schema (Canonical)

All events share a common envelope. The envelope is defined in the backend architecture and extended here with analytics specific fields.

```
EventEnvelope {
  event_id: UUIDv7
  event_name: string
  event_version: int
  user_id: UUID
  tenant_id: UUID
  session_id: UUID
  correlation_id: UUID
  timestamp: ISO-8601
  source: string
  environment: string
  device_info: object
  geo_info: object
  payload: object
}
```

Required analytic fields inside payload for assessment:

- difficulty_tier
- threat_tier
- scenario_id
- content_version
- competency_tags
- outcome
- time_to_decision_ms
- evidence_flags

### 7.3 Event Naming Convention

Events follow a dotted namespace.

- `game.session.*` for session lifecycle
- `game.email.*` for email generation, viewing, and analysis
- `game.decision.*` for approval and denial outcomes
- `game.verification.*` for identity checks and requests
- `game.resource.*` for facility management decisions
- `game.upgrade.*` for security tool purchases
- `threat.*` for attacks, incidents, and breach outcomes
- `training.assessment.*` for micro and summative assessments
- `simulation.phish.*` for phishing simulation campaigns
- `admin.*` for enterprise administrative actions
- `lms.*` for SCORM, xAPI, and LTI events
- `experiment.*` for A/B test assignment and exposure

### 7.4 Core Event Categories

Session lifecycle events:

- `game.session.started`
- `game.session.ended`
- `game.session.paused`
- `game.session.resumed`

Email triage events:

- `game.email.received`
- `game.email.opened`
- `game.email.indicator.marked`
- `game.email.header.viewed`
- `game.email.url.hovered`
- `game.email.attachment.previewed`

Decision events:

- `game.decision.approved`
- `game.decision.denied`
- `game.decision.flagged`
- `game.decision.verification_requested`

Verification events:

- `game.verification.packet_opened`
- `game.verification.out_of_band_initiated`
- `game.verification.result`

Threat and incident events:

- `threat.attack.launched`
- `threat.attack.mitigated`
- `threat.attack.succeeded`
- `threat.breach.occurred`
- `threat.level.changed`
- `incident.response.action_taken`

Assessment events:

- `training.assessment.prompt_presented`
- `training.assessment.response_submitted`
- `training.assessment.scored`
- `training.assessment.remediation_assigned`

Simulation events (covering all channels per BRD FR-ENT-021: email, SMS, voice, QR code):

- `simulation.phish.sent`
- `simulation.phish.clicked`
- `simulation.phish.reported`
- `simulation.phish.completed`

Administrative and compliance events:

- `admin.campaign.created`
- `admin.campaign.scheduled`
- `admin.policy.acknowledged`
- `admin.report.exported`

### 7.5 Event Payload Standards

Payloads are structured to support analytics while minimizing sensitive data.

- Use IDs instead of raw content. For example, store `scenario_id` instead of full email body.
- Store indicator selections as a vector of indicator IDs, not free text.
- Store results as normalized codes, such as `outcome: correct`, `outcome: partial`, `outcome: incorrect`.
- Store response times in milliseconds but cap at a maximum to prevent skew from abandoned sessions.

### 7.6 Versioning and Migration

Event versioning is mandatory. When event schemas evolve, new versions are introduced without deleting or mutating old events. The analytics pipeline supports versioned parsers and can backfill derived metrics when needed.

---

## 8. Data Pipeline and Processing

The analytics pipeline transforms raw events into actionable insights. It supports both real time dashboards and batch analytics for reports and compliance evidence.

### 8.1 Ingestion Flow

1. Game engine and other modules publish events to the in process event bus.
2. The analytics module subscribes to relevant events and writes them to the analytics event store.
3. Events are also queued for enrichment jobs, such as mapping to competency tags and deriving risk scores.

This flow preserves the modular monolith design while allowing future extraction of analytics processing into a dedicated service.

### 8.2 Real Time Processing

Real time dashboards require low latency aggregation. The pipeline computes rolling metrics using Redis Streams or Timescale continuous aggregates. For long-term analytics, ClickHouse or TimescaleDB is used for columnar, time-series optimized aggregation, as specified in the BRD data architecture.

Real time outputs include:

- Live phishing click rate for active campaigns
- Current risk heat map by department
- Near real time alerts for severe failures or breaches

### 8.3 Batch Processing

Batch jobs compute metrics that require longer time windows and more complex joins. These jobs run daily or weekly and populate materialized views and snapshot tables.

Batch outputs include:

- Monthly compliance snapshots
- Cohort based retention curves
- Longitudinal skill progression charts
- ROI and cost of breach estimates

### 8.4 Feature Computation for Adaptive Learning

Adaptive learning requires derived features such as detection rate trends, response timing patterns, and error types. These features are computed in the analytics module and stored in the player profile table. They are then consumed by the game engine to adapt content selection.

### 8.5 Data Retention and Archival

Raw events are retained according to the maximum applicable regulatory requirements. Per BRD FR-ENT-031, retention policies are configurable per framework within a range of 1 to 7 years, with the longest applicable period governing. After the retention window, events are aggregated and anonymized with automated deletion at expiration. The raw event store is partitioned by month to support efficient deletion and compression.

---

## 9. Data Model and Storage

This section expands the analytics module storage model described in the backend architecture document. The goal is to support both time series analytics and deterministic audit replay.

### 9.1 Storage Strategy

- Event log is the source of truth for analytics.
- Materialized aggregates support low latency dashboards.
- Player profiles store computed skill states for adaptive learning.
- Compliance snapshots store point in time evidence for audits.

### 9.2 Core Tables

The analytics module owns the following tables in its database schema.

```
CREATE TABLE analytics.events (
  event_id         UUID PRIMARY KEY,  -- UUIDv7 generated by the application layer per BRD Section 8.5
  correlation_id   UUID NOT NULL,
  user_id          UUID NOT NULL,
  tenant_id        UUID NOT NULL,
  session_id       UUID,
  event_name       VARCHAR(128) NOT NULL,
  event_version    INT NOT NULL DEFAULT 1,
  event_time       TIMESTAMPTZ NOT NULL,
  source           VARCHAR(64) NOT NULL,
  environment      VARCHAR(32) NOT NULL,
  event_properties JSONB NOT NULL DEFAULT '{}',
  device_info      JSONB,
  geo_info         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analytics.player_profiles (
  user_id                   UUID PRIMARY KEY,
  tenant_id                 UUID NOT NULL,
  total_sessions            INT NOT NULL DEFAULT 0,
  total_days_played         INT NOT NULL DEFAULT 0,
  phishing_detection_rate   REAL NOT NULL DEFAULT 0.5,
  false_positive_rate       REAL NOT NULL DEFAULT 0.5,
  avg_decision_time_seconds REAL,
  indicator_proficiency     JSONB DEFAULT '{}',
  competency_scores         JSONB DEFAULT '{}',
  skill_rating              INT NOT NULL DEFAULT 1000,
  last_computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analytics.compliance_snapshots (
  snapshot_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL,
  framework        VARCHAR(32) NOT NULL,
  snapshot_data    JSONB NOT NULL,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9.3 Additional Tables for Assessment

```
CREATE TABLE analytics.assessments (
  assessment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  assessment_type VARCHAR(32) NOT NULL,
  score           REAL NOT NULL,
  max_score       REAL NOT NULL,
  domain_scores   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analytics.assessment_items (
  item_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          VARCHAR(32) NOT NULL,
  difficulty      INT NOT NULL,
  content_ref     UUID NOT NULL,
  correct_answers JSONB NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'
);
```

### 9.4 Experimentation and Cohorts

```
CREATE TABLE analytics.experiments (
  experiment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(128) NOT NULL,
  status          VARCHAR(16) NOT NULL,
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE analytics.experiment_assignments (
  experiment_id   UUID NOT NULL,
  user_id         UUID NOT NULL,
  variant         VARCHAR(32) NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (experiment_id, user_id)
);
```

### 9.5 Content Effectiveness and Quality

```
CREATE TABLE analytics.content_effectiveness (
  content_id      UUID PRIMARY KEY,
  content_type    VARCHAR(32) NOT NULL,
  difficulty      INT NOT NULL,
  detection_rate  REAL NOT NULL,
  false_positive  REAL NOT NULL,
  avg_time_ms     REAL,
  quality_score   REAL NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9.6 State Snapshots

Per BRD Section 8.5, state snapshots must be materialized every 50 events or at day boundaries. This reduces the cost of reconstructing current state from the event log and supports efficient audit replay. Analytics derived metrics can be recomputed from the nearest snapshot rather than replaying the entire event history.

### 9.7 Partitioning and Indexing

- `analytics.events` is partitioned by month and indexed on `tenant_id`, `event_name`, and `created_at`.
- `analytics.player_profiles` is indexed by `tenant_id` to support bulk queries for dashboards.
- `analytics.assessments` is indexed by `tenant_id` and `created_at` to support compliance reporting.

### 9.8 Data Residency

In multi region deployments, analytics data must be stored and processed within the configured region. Cross region aggregation uses anonymized, aggregated metrics and never includes raw events or identifiable data. All cross-border data transfers must be automatically logged, per BRD Section 7.7.

---

## 10. Metrics, KPIs, and Calculations

This section defines the core metrics used for learning assessment and enterprise reporting. Each metric includes a definition, calculation formula, and intended use.

### 10.1 Phishing Metrics

Phishing metrics apply to both in game phishing scenarios and enterprise simulation campaigns. Each is tracked over time and segmented by department, role, and location.

- Phishing click rate: percentage of simulated or in game phishing emails that result in a harmful action. BRD targets are less than 15 percent at 6 months and less than 5 percent at 12 months, from a baseline of approximately 30 percent.
- Phishing reporting rate: percentage of phishing emails correctly reported. BRD targets are greater than 30 percent at 6 months and greater than 60 percent at 12 months, from a baseline of approximately 7 percent.
- False positive rate: percentage of legitimate emails incorrectly flagged.
- Mean time to report: mean time between receiving a phishing email and reporting it. BRD targets are less than 2 hours at 6 months and less than 5 minutes at 12 months, from a baseline of greater than 24 hours.

Formulas:

```
click_rate = clicks / phishing_emails_delivered
report_rate = reports / phishing_emails_delivered
false_positive_rate = false_reports / legitimate_emails_delivered
mean_time_to_report = mean(report_time - email_received_time)
```

### 10.2 Detection Accuracy and Decision Quality

Decision quality is assessed by comparing the player action to the expected risk profile of the scenario. The system uses graded correctness instead of binary outcomes. For example, requesting verification may be scored as partially correct when the email is legitimate but carries ambiguous signals.

Decision quality score is computed as:

```
score = base_value * difficulty_factor * context_factor * confidence_factor
```

- `base_value` is 1.0 for correct, 0.5 for partially correct, 0 for incorrect.
- `difficulty_factor` is scaled from 0.8 to 1.5 based on difficulty tier.
- `context_factor` is scaled from 0.9 to 1.4 based on threat tier.
- `confidence_factor` is scaled based on scenario quality score.

### 10.3 Knowledge Retention

Knowledge retention is measured through spaced repetition assessments and through recall evidence embedded in narrative events. The metric represents the percentage of items that are recalled correctly after a given time window.

```
retention_rate = correct_recall / total_recall_items
```

Retention is reported at 7, 30, and 90 day intervals. BRD targets for 30-day knowledge retention are greater than 60 percent at 6 months and greater than 75 percent at 12 months, compared to a baseline of approximately 5 percent for traditional training methods.

### 10.4 Behavioral Change Metrics

Behavioral change metrics track improvements in real security behaviors rather than quiz performance.

- Mean time to report suspicious emails
- Use of verification steps before approving access
- Reduction in risky approvals under pressure
- Password hygiene score: tracks adoption of strong password practices, credential handling behaviors, and response to credential harvesting scenarios, per BRD FR-AN-003
- Data handling compliance (classification and retention decision accuracy)

Example calculation:

```
verification_usage_rate = verification_actions / total_decisions
risky_approval_rate = risky_approvals / total_decisions
data_handling_compliance_rate = correct_data_handling_decisions / total_data_handling_decisions
```

### 10.5 Incident Response Readiness

Incident response readiness is measured by the quality and timeliness of actions taken during breach events.

Metrics include:

- Response time to incident notification
- Containment correctness score
- Recovery sequencing score
- Post incident review completion

### 10.6 Risk Score and Heat Map

The organizational risk score is a composite metric designed for executive reporting. It combines phishing susceptibility, incident response readiness, and compliance completion.

```
org_risk_score = w1 * (1 - phishing_resilience) + w2 * incident_risk + w3 * compliance_gap
```

Weights are configurable by the tenant. Default weights emphasize phishing resilience and incident readiness.

The risk heat map is a dimensional view of the same composite score and must be available at the department, location, and role levels to satisfy executive reporting requirements. Heat map slices are computed using the same formula with subgroup specific inputs.

### 10.7 ROI and Cost of Breach Avoidance

The ROI model estimates the financial impact of improved awareness. It uses industry baseline breach rates and tenant specific data.

Inputs:

- Baseline phishing click rate
- Current phishing click rate
- Average cost per phishing incident
- Employee count and risk profile

Output metrics:

- Estimated incidents avoided per year
- Estimated cost avoided
- Training cost per employee
- Cyber-insurance premium impact estimate, per BRD FR-AN-008, tracking the relationship between improved security posture and insurance premium reductions (up to 20% discount for compliant organizations per BRD market data)

### 10.8 Security Awareness Quiz Score

Per BRD Section 16 Learning Outcomes, the platform must track a composite security awareness quiz score. This score is derived from summative assessments and spaced repetition performance across all competency domains.

BRD targets:

- Baseline: approximately 50 percent
- 6-month target: greater than 75 percent
- 12-month target: greater than 85 percent

The quiz score is computed as a weighted average of domain assessment results, with domain weights reflecting the regulatory emphasis of the tenant configuration.

### 10.9 NPS Tracking

Per BRD Section 16 Engagement Metrics, Net Promoter Score must be tracked for both enterprise and consumer audiences.

BRD targets:

- Enterprise NPS: greater than 50
- Consumer NPS: greater than 40

NPS data is collected through periodic in-app surveys (diegetic for consumer mode, standard for enterprise mode) and tracked over time to correlate with engagement and retention metrics.

### 10.10 Consumer Game Analytics

Consumer analytics are used to optimize retention and content quality.

Key metrics:

- D1, D7, D30, D60, D90 retention
- Session duration and frequency
- Content drop off points
- Season progression completion
- A/B test outcomes
- Average sessions per week (active players)

These metrics are segmented by platform, device class, and entry channel.

BRD retention targets (Section 16 Engagement Metrics):

- D1 retention: greater than 50 percent
- D7 retention: greater than 30 percent
- D30 retention: greater than 15 percent
- Voluntary return rate: greater than 75 percent D7
- Average sessions per week (active players): 3 to 5
- Session duration (median): 15 to 25 minutes

Retention curve calculation uses cohort based windows:

```
Dn_retention = returning_users_on_day_n / cohort_size
```

Where `returning_users_on_day_n` includes any user with a session on day N after first play. The retention curve is reported at D1, D7, D30, D60, and D90, aligned to BRD requirements.

Churn risk prediction is a derived metric for consumer mode. It estimates the probability that a player will not return within the next 14 days. Inputs include declining session frequency, unfinished chapters, rising error rates, and negative trend in satisfaction signals (where available). Churn risk is used for pacing adjustments and optional re engagement prompts, not for punitive actions.

### 10.11 Content Effectiveness

Content effectiveness measures how well a scenario teaches a skill.

- Detection uplift after scenario exposure
- Error type reduction in the same domain
- Player feedback ratings where collected

Content effectiveness scores influence the rotation of scenarios in the AI content pool.

### 10.12 Metric Confidence and Error Bands

All metrics include confidence intervals where possible. Small sample sizes are flagged. Executive dashboards show ranges rather than single point estimates when data is insufficient.

---

## 11. Dashboards and Reporting

Dashboards translate analytics into action. They are role specific and mapped to enterprise workflows. The UI layout is defined in the UI/UX document; this section specifies data requirements and behavior.

### 11.1 CISO Dashboard

The CISO dashboard provides a high level view of organizational risk and training effectiveness.

Required widgets:

- Risk score trend line
- Phishing click and report rate trend
- Risk heat map by department, location, and role
- Compliance completion status by framework
- Top emerging risk indicators
- ROI summary and cost avoidance estimate

Per BRD FR-AN-009, the CISO dashboard must include board-ready visualizations suitable for non-technical stakeholders. It must also include a trend analysis view with predictive risk indicators per BRD FR-AN-011.

CISO dashboards support export to PDF, CSV, and JSON for board reporting, per BRD FR-ENT-029.

### 11.2 Trainer Dashboard

The trainer dashboard focuses on interventions and learning progress.

Required widgets:

- Competency distribution by domain
- Learners at risk list
- Campaign completion and overdue counts
- Most common error patterns
- Recommended remediation modules

Trainers can drill down to a learner timeline and see evidence based recommendations. Individual detail access is governed by policy and privacy settings.

### 11.3 Compliance Reporting

Compliance reports are framework specific and provide audit ready evidence. Per BRD FR-AN-013, framework specific reports must be generated for GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, and FedRAMP. Each report includes:

- Training completion summary
- Policy acknowledgement logs
- Assessment completion and scores
- Change history and versioning
- Signature and timestamp metadata

Per BRD FR-ENT-028, compliance dashboards must operate in real time per regulatory framework. Reports are generated on demand and stored as snapshots with digital signatures. They are reproducible via event replay.

Per BRD FR-AN-014, the system must perform automated compliance gap identification by comparing current training completion, assessment scores, and policy acknowledgement status against framework-specific requirements, highlighting missing or overdue obligations.

Per BRD FR-ENT-032, individual training transcripts with complete audit trails must be generated. Per BRD FR-ENT-034, management training attestation reports must be produced for NIS2 Article 20 and DORA Article 5 compliance.

### 11.4 Benchmarking and Industry Comparison

Benchmarking is available only in aggregated, anonymized form. The system computes percentile bands for key metrics such as phishing click rate and completion rate. No tenant can identify another tenant or access raw data.

### 11.5 Learner Views

Learner facing analytics are limited to motivational insights. In enterprise deployments, learner views show progress bands and achievements but do not expose raw scores unless policy allows. Consumer players see narrative aligned progress markers and achievements.

---

## 12. Adaptive Learning and Difficulty Integration

The adaptive learning system uses analytics to tune content selection and difficulty. It ensures each player operates within their zone of proximal development without explicit difficulty sliders.

### 12.1 Inputs to Adaptive Learning

- Competency scores and confidence intervals
- Recent error patterns by domain
- Response time trends
- Threat engine state and narrative progression
- Content effectiveness data

### 12.2 Adaptation Rules

- If a player shows high performance in phishing detection, the system increases sophistication and shifts to new vectors such as supply chain attacks, per BRD FR-GAME-020. Similarly, strong perimeter defense triggers insider manipulation scenarios.
- If a player struggles with verification, the system increases exposure to verification packet tasks and provides subtle coaching cues.
- After a major breach, the system provides a recovery phase with lower complexity to prevent churn.

### 12.3 Enterprise Overrides

Enterprise administrators can set minimum competency thresholds per domain. If a learner falls below a threshold, the system assigns remediation content and schedules a short reassessment.

### 12.4 Predictive Risk Indicators

Predictive indicators identify learners or departments at risk of failing assessments, experiencing phishing susceptibility, or churning from the training program. The indicators are based on trends, not single events. They are used to trigger just-in-time training delivery within 60 seconds of the triggering event (per BRD FR-ENT-019), with a maximum of 2 JIT interventions per week per learner to prevent fatigue (per BRD FR-ENT-020).

Churn risk indicators are applied primarily in consumer mode but can be used in enterprise contexts to detect disengagement. Signals include declining session frequency, incomplete campaign progression, repeated low confidence decisions, and reduced interaction with verification or review tools.

---

## 13. Experimentation and Validation

Experimentation is required to validate learning efficacy and optimize engagement. Experiments must respect ethical constraints and avoid compromising training integrity in enterprise contexts.

### 13.1 Experiment Types

- Content experiments to compare scenario effectiveness.
- Game mechanics experiments to test variations in core loop behaviors, per BRD FR-AN-020.
- UX experiments to test interface improvements in consumer mode.
- Assessment prompt experiments to refine spaced repetition.
- Messaging experiments for coaching interventions.

### 13.2 Experiment Governance

- Enterprise tenants can opt out of experiments that may affect compliance outcomes.
- Experiments that could influence learning outcomes are flagged and reviewed by the learning science lead.
- All experiments are logged with start and end dates and explicit hypotheses.

### 13.3 Assignment and Exposure

- Assignment uses deterministic hashing of user ID and experiment ID to ensure stability.
- Exposure events are emitted when a user actually sees the experimental element.
- Analysis uses exposure based cohorts, not assignment only.

### 13.4 Validation of Learning Outcomes

Learning efficacy is validated through controlled comparisons and longitudinal analysis. Primary validation measures include reduced phishing susceptibility and increased retention scores over six months, consistent with the BRD targets. Where possible, controlled studies with design partners are used to validate causality.

---

## 14. Privacy, Ethics, and Compliance

The platform processes sensitive employee training data. Privacy and ethical considerations are core to analytics design.

### 14.1 Data Minimization

- Store IDs instead of personal data in analytics events.
- Avoid storing raw email content in analytics pipelines.
- Store only metadata required for assessment.

### 14.2 Pseudonymization

- Use pseudonymous identifiers for analytic processing via the pseudonymization engine defined in BRD Section 9.3.
- Separate key management for identity mapping, with mapping tables stored in the auth module and protected with stronger access controls.

### 14.3 Employee Privacy Safeguards

- Aggregated reporting is the default (no individual disciplinary use without separate policy), per BRD Section 9.3.
- Individual level reporting is restricted to roles with explicit permission.
- No linking of training performance to HR decisions without explicit policy, per BRD Section 9.3.
- Transparent phishing simulation disclosure, per BRD Section 9.3.

### 14.4 Regulatory Alignment

Analytics data handling must align with all 14+ regulatory frameworks referenced in the BRD, including GDPR, CCPA/CPRA, HIPAA, SOX, PCI-DSS 4.0, NIS2, DORA, ISO 27001, NIST CSF 2.0, SOC 2, FedRAMP, GLBA, FISMA, and CMMC.

Key controls:

- Configurable retention periods per framework.
- Right to access and deletion workflows.
- Audit logs for all report access.
- Data residency controls per tenant.
- Data Protection Impact Assessment (DPIA) required for phishing simulations and behavioral analytics, per BRD Section 9.3.
- Analytics must support 72-hour breach notification capability for GDPR compliance, per BRD Section 9.3.

### 14.5 Ethics and Transparency

The platform must explain in clear language that gameplay data is used to improve security awareness. Enterprise administrators must provide proper notice to employees. Consumer players receive a clear privacy policy and opt out controls for non essential analytics.

---

## 15. Security and Access Control

Analytics data is a high value target and must be protected with strong access controls.

### 15.1 RBAC and ABAC

- All analytics endpoints require role based permissions.
- ABAC policies enforce department and location scoping.
- Tenant admins can define custom access policies for analytics data.

### 15.2 Audit Logging

All access to analytics data is logged with user ID, timestamp, and purpose. Report exports generate immutable, append-only audit records with SHA-256 cryptographic integrity verification, consistent with BRD FR-ENT-030.

### 15.3 Encryption

- Data at rest is encrypted with AES-256 with jurisdiction-specific key management, per BRD Section 7.4.
- Data in transit uses TLS 1.2 or higher with strong cipher suites.
- Field level encryption is used for sensitive identifiers.

---

## 16. Performance and Scalability

Analytics must scale with the dual market strategy. The design targets the performance requirements in the BRD.

### 16.1 Throughput Targets

- Ingestion should handle at least 10,000 concurrent users at launch.
- Event ingestion latency should remain under 200 ms at p95.
- Admin dashboard load time must be under 2 seconds at P95, per BRD non-functional requirements.
- Real time dashboards should update within 5 seconds for high priority metrics.

### 16.2 Scaling Strategy

- Use partitioned time series storage for events.
- Use materialized views for heavy aggregations.
- Extract analytics processing into a dedicated service when write volume exceeds game DB capacity, per BRD Section 7.2 service extraction triggers.

### 16.3 Degradation Modes

- If real time metrics fall behind, dashboards fall back to last computed snapshot.
- Learning assessment continues using local cached profiles if analytics services are temporarily unavailable.

---

## 17. Data Quality and Governance

Analytics quality determines trust. The system includes proactive data validation and governance controls to prevent corrupted metrics and to maintain audit defensibility.

### 17.1 Data Validation

- Schema validation on ingestion for all events.
- Required fields enforced at ingestion to prevent orphaned events.
- Referential integrity checks to ensure content IDs and scenario IDs exist.

### 17.2 Anomaly Detection

- Sudden spikes in click rates trigger alerts to data quality monitors.
- Missing event patterns, such as a session without any decision events, are flagged.
- Content quality checks detect scenarios that consistently produce ambiguous outcomes.

### 17.3 Data Lineage

Every report includes a lineage trail to the event sources and the computation version. This allows auditors to reconstruct how a metric was derived.

### 17.4 Governance Roles

- Data Steward: owns metric definitions and changes.
- Privacy Officer: approves data access policies and retention settings.
- Security Lead: reviews analytics access logs.

---

## 18. Integrations and Exports

Analytics and assessment outputs must integrate with enterprise systems and standards.

### 18.1 LMS Standards

- SCORM 1.2 and SCORM 2004 4th Edition exports must include completion status, assessment scores, and timestamps. All ADL conformance tests must be passed for SCORM 1.2. IMS Simple Sequencing is supported for SCORM 2004 adaptive learning paths.
- xAPI (v1.0.3 and 2.0) statement emission must cover all learning relevant interactions with a custom verb vocabulary. A built-in LRS must be provided for organizations without their own.
- LTI 1.3 with LTI Advantage (Deep Linking, Assignment and Grade Services, Names and Role Provisioning Services) integrations must pass grades and completion status to the LMS.
- cmi5 support must map game sessions and assessments to learning activities.
- AICC HACP protocol support is recommended for legacy LMS compatibility.

Per BRD FR-ENT-041, verified LMS integrations must be maintained with Cornerstone, SAP SuccessFactors, Workday, Moodle, and Canvas. Analytics data exports and grade passback must be validated against each of these platforms.

### 18.2 xAPI Statement Mapping

Each significant learning action maps to xAPI statements. For example:

- Email triage decisions map to `evaluated` statements.
- Incident response actions map to `resolved` statements.
- Assessment completion maps to `completed` and `passed` statements.

### 18.3 SIEM and SOAR Export

Enterprise security teams can export aggregated behavioral risk metrics to SIEM or SOAR platforms. Per BRD Section 10.1, analytics event exports must support the following platform-specific integrations:

- Splunk: HTTP Event Collector with CIM-compliant events and pre-built dashboards
- IBM QRadar: Syslog (LEEF) with custom DSM and QID mapping
- Microsoft Sentinel: Azure Monitor Data Collector API with custom tables and KQL workbooks
- Elastic Security: Elasticsearch Bulk API with ECS-compliant events

Universal SIEM export must support CEF/LEEF/Syslog fallback for unsupported platforms and generic HTTPS webhook output. All exports must use ISO 8601 timestamps and UUIDv7 event deduplication.

SOAR integrations must support Palo Alto Cortex XSOAR and Swimlane with bidirectional API, idempotent operations, and rate limit awareness per BRD Section 10.1.

Exports include:

- Department level risk scores
- Trends in phishing reporting
- Alerts for high risk groups

Exports are aggregated and do not include individual level information unless explicitly enabled by policy.

### 18.4 Report Export Formats

Reports are exportable in PDF, CSV, and JSON. Exports include digital signatures and metadata to validate integrity.

### 18.5 GraphQL Analytics Endpoint

Per BRD Section 10.6, a GraphQL endpoint is provided for complex analytical queries. This endpoint supports flexible querying of analytics data for custom reporting, dashboards, and third-party integrations. All GraphQL queries enforce the same tenant isolation and RBAC permissions as REST endpoints.

---

## 19. Failure Modes and Mitigations

This section identifies common analytics failure modes and the safeguards built into the design.

### 19.1 Instrumentation Gaps

Risk: Missing events can create incomplete metrics.

Mitigation: Required events for key metrics are validated in integration tests. Dashboards show data coverage indicators.

### 19.2 Content Drift

Risk: AI generated scenarios evolve in ways that break assessments.

Mitigation: Content quality scoring and human review gates. Low confidence scenarios reduce scoring weight.

### 19.3 Bias and Fairness

Risk: Certain departments or roles appear worse because they face higher difficulty content.

Mitigation: Normalize metrics by difficulty tier and threat context. Provide confidence intervals and explanatory notes in reports.

### 19.4 Privacy Violations

Risk: Unauthorized access to individual learner data.

Mitigation: Strong RBAC, ABAC, audit logging, and default aggregation. Privacy officer review for access changes.

---

## 20. Implementation Roadmap (Phase 2)

The analytics and learning assessment work aligns with the Phase 2 enterprise feature timeline in the BRD.

### 20.1 Phase 2 Milestones

The analytics and learning assessment milestones align with the BRD Phase 2 Enterprise Features timeline (Months 4 to 9).

- Month 4 to 5: Event taxonomy finalized and instrumentation added to core loop. Analytics telemetry integrated with multi-tenancy architecture and tenant provisioning.
- Month 5 to 6: Analytics module ingest and player profile computation. Analytics data isolated per tenant with SSO and SCIM integration.
- Month 6 to 7: xAPI statement emission for analytics events. Phishing simulation analytics pipeline and initial campaign reporting.
- Month 7 to 8: Compliance reporting analytics, audit trail integration, and certificate generation data flows. Phishing simulation detailed reporting and risk heat map.
- Month 8 to 9: Enterprise analytics dashboards including CISO dashboard, ROI model, and export pipeline. SIEM integration for analytics event export. SOC 2 Type II audit evidence preparation.

### 20.2 Validation Targets

- Initial dashboard data accuracy within 95 percent of audit replay.
- Retention and phishing metrics verified against design partner datasets.

---

## 21. Open Questions and Decision Log

Open questions require stakeholder input before implementation.

- Should the enterprise learner view expose detailed scores or only progress bands.
- Which benchmarks are acceptable for public display in marketing materials.
- What thresholds define high risk for automated interventions.
- How to communicate privacy policies in consumer mode without breaking immersion.

Decision log entries will be appended as these questions are resolved.

---

## 22. Appendix A: Metric Dictionary (Selected)

The following dictionary defines commonly referenced metrics.

| Metric Name                   | Definition                                           | Calculation                       | Primary Use                  |
| ----------------------------- | ---------------------------------------------------- | --------------------------------- | ---------------------------- |
| Phishing Click Rate           | Rate of harmful action on simulated phishing emails  | clicks / delivered                | CISO dashboard, ROI          |
| Phishing Report Rate          | Rate of correct reporting of phishing attempts       | reports / delivered               | Trainer dashboard            |
| Verification Usage Rate       | Frequency of verification actions before approval    | verification_actions / decisions  | Behavioral change            |
| False Positive Rate           | Legitimate emails incorrectly flagged                | false_reports / legit_emails      | Training quality             |
| Detection Accuracy            | Weighted correctness of triage decisions             | weighted_correct / total          | Learning assessment          |
| Incident Response Score       | Quality of incident response actions                 | weighted_response_score           | Readiness                    |
| Mean Time to Report           | Mean time from email receipt to report               | mean(report_time - received_time) | Behavioral change            |
| Knowledge Retention 30D       | Recall accuracy after 30 days                        | correct / total                   | Learning effectiveness       |
| Risk Heat Map Score           | Department level composite risk                      | composite formula                 | Executive reporting          |
| Content Effectiveness         | Improvement after exposure to content                | pre vs post delta                 | Content tuning               |
| D1 Retention                  | Percentage of users returning after 1 day            | returning / cohort                | Consumer analytics           |
| D7 Retention                  | Percentage of users returning after 7 days           | returning / cohort                | Consumer analytics           |
| D30 Retention                 | Percentage of users returning after 30 days          | returning / cohort                | Consumer analytics           |
| D60 Retention                 | Percentage of users returning after 60 days          | returning / cohort                | Consumer analytics           |
| D90 Retention                 | Percentage of users returning after 90 days          | returning / cohort                | Consumer analytics           |
| Churn Risk Score              | Predicted probability of non return in next 14 days  | model output                      | Consumer re engagement       |
| Security Awareness Quiz Score | Composite score across all competency domains        | weighted_domain_avg               | Enterprise learning outcomes |
| Password Hygiene Score        | Score for password practices and credential handling | behavior_signals / total          | Behavioral change            |
| NPS (Enterprise)              | Net Promoter Score for enterprise users              | standard NPS formula              | Engagement tracking          |
| NPS (Consumer)                | Net Promoter Score for consumer players              | standard NPS formula              | Engagement tracking          |
| Cyber Insurance Impact        | Estimated premium reduction from improved posture    | model output                      | ROI reporting                |

---

## 23. Appendix B: Event Schema Examples

Example event for an email decision:

```
{
  "event_id": "0191e5a5-5f4c-7f11-9d54-7c2e99c2b0a1",
  "event_name": "game.decision.approved",
  "event_version": 1,
  "user_id": "0191e5a5-8f11-76e2-b0ad-1a5f9c4c2d31",
  "tenant_id": "0191e5a5-2e88-7a0d-8e99-4e1b0c7b3f09",
  "session_id": "0191e5a5-2f24-7f3a-a8b6-99f2a20a2d4d",
  "correlation_id": "0191e5a5-3e11-7ef1-9e9d-7ac2b3e2f2b0",
  "timestamp": "2026-02-05T10:15:00Z",
  "source": "game-engine",
  "payload": {
    "scenario_id": "0191e5a5-7b13-7c21-8f50-6b1d8e3f6a77",
    "decision": "approve",
    "expected_risk": "high",
    "difficulty_tier": 4,
    "threat_tier": "HIGH",
    "time_to_decision_ms": 12000,
    "competency_tags": ["phishing_detection", "access_control"],
    "outcome": "incorrect"
  }
}
```

Example event for a phishing simulation report:

```
{
  "event_id": "0191e5a5-7f32-7e21-9b21-6d1c7e3d4b90",
  "event_name": "simulation.phish.reported",
  "event_version": 1,
  "user_id": "0191e5a5-8f11-76e2-b0ad-1a5f9c4c2d31",
  "tenant_id": "0191e5a5-2e88-7a0d-8e99-4e1b0c7b3f09",
  "session_id": null,
  "correlation_id": "0191e5a5-3e11-7ef1-9e9d-7ac2b3e2f2b0",
  "timestamp": "2026-02-05T11:15:00Z",
  "source": "phish-sim-engine",
  "payload": {
    "campaign_id": "0191e5a5-5c2f-7a11-9f33-2c1e4a7e2d22",
    "template_id": "0191e5a5-1d2f-7a9f-8b21-2c1e4a7e2d11",
    "reported_via": "email_client_addin",
    "time_to_report_ms": 600000,
    "outcome": "reported"
  }
}
```

---

## 24. Appendix C: Learning Assessment Rubrics

This rubric guides scoring for common decision types. It ensures consistency and transparency for auditors.

### 24.1 Email Triage Decision

- Correct approval of legitimate request: full credit.
- Correct denial of malicious request: full credit.
- Flag for review when risk is ambiguous: partial credit.
- Approval of malicious request: zero credit.
- Denial of legitimate request: partial credit depending on risk signals.

### 24.2 Verification Usage

- Verification requested when identity is uncertain: full credit.
- Verification skipped for high risk: negative weight.
- Verification requested unnecessarily but not harmful: partial credit.

### 24.3 Incident Response

- Containment initiated within defined window: full credit.
- Containment delayed but correct sequence: partial credit.
- Incorrect containment action: zero credit and triggers coaching feedback.

---

## 25. Appendix D: Glossary (Analytics and Learning)

| Term              | Definition                                                        |
| ----------------- | ----------------------------------------------------------------- |
| Adaptive Learning | Real time adjustment of content based on observed competency      |
| Competency Map    | Multi domain profile of observed skill levels                     |
| Evidence          | A recorded action used to infer skill                             |
| Spaced Repetition | Review scheduling algorithm that increases intervals with mastery |
| Retention Curve   | Plot of user return rates over time                               |
| Risk Heat Map     | Visualization of composite risk by department or role             |
| Assessment Item   | A single prompt or decision used for learning measurement         |

---

## 26. Appendix E: Sample Reports and Data Contracts

This appendix provides sample narratives and data contracts for key analytics outputs. The intent is not to define the final UI, but to clarify the information architecture that reports must satisfy.

### 26.1 CISO Board Report Template (Narrative)

The board level report is designed for non technical stakeholders. It uses clear language, explicit baselines, and defensible evidence. The content below is an illustrative narrative, not final copy.

Board Report Narrative Example:

The organization has improved its phishing resilience over the past 6 months. The baseline phishing click rate of 28 percent measured at the start of the program has declined to 9 percent. Reporting rate has increased from 6 percent to 42 percent. These improvements are statistically significant and sustained across departments. Incident response readiness has improved as measured by response time during simulated breach events, now averaging 14 minutes compared to 45 minutes at baseline. The overall risk score has declined from 0.62 to 0.38, driven primarily by improvements in phishing detection and verification behaviors. Compliance completion for GDPR, HIPAA, and PCI DSS is above 95 percent, and training records are available for audit.

The report includes specific recommendations for continued improvement. The sales department remains the highest risk group due to lower reporting rates. Targeted remediation and a short refresher campaign are recommended. The organization is on track to maintain compliance for all frameworks under review. The projected annual cost avoidance based on reduced phishing susceptibility is 1.2 million USD, compared to program costs of 220,000 USD, yielding an estimated ROI of 4.5x.

### 26.2 CISO Dashboard Data Contract

The data contract defines the fields required by the CISO dashboard. Each field includes an expected format and allowable aggregation level.

| Field                   | Type   | Description                             | Aggregation                     | Update Cadence |
| ----------------------- | ------ | --------------------------------------- | ------------------------------- | -------------- |
| org_risk_score          | float  | Composite risk score 0 to 1             | org, department                 | daily          |
| risk_heat_map           | object | Composite risk heat map slices          | org, department, location, role | daily          |
| phishing_click_rate     | float  | Click rate for phishing simulations     | org, department, role           | daily          |
| phishing_report_rate    | float  | Reporting rate for phishing simulations | org, department, role           | daily          |
| incident_response_score | float  | Weighted readiness score                | org, department                 | weekly         |
| compliance_completion   | object | Completion status per framework         | org                             | daily          |
| top_risk_indicators     | array  | List of highest risk signals            | org                             | daily          |
| roi_estimate            | object | Annual cost avoidance and ROI           | org                             | monthly        |

The dashboard must support exporting the same data in PDF, CSV, and JSON for board reporting, consistent with BRD FR-ENT-029.

### 26.3 Trainer Report Template (Narrative)

The trainer report is action oriented. It focuses on which learners need support, which skills need reinforcement, and which modules are performing well.

Trainer Report Narrative Example:

During the last two weeks, 83 percent of learners completed their scheduled campaign. The average phishing detection score improved by 7 points. Verification usage increased by 12 percent, indicating stronger zero trust behavior. The most common error type was approval of legitimate requests with spoofed display names but valid domains, suggesting a need to reinforce display name spoofing cues. The top performing module was the supply chain scenario, which produced a 15 percent improvement in detection accuracy within that domain.

The report highlights 24 learners who show declining performance trends. These learners are concentrated in the operations and marketing departments. The recommended remediation plan is a short micro learning sequence focused on social engineering resistance and verification packet usage. The trainer can schedule the remediation as a just in time intervention or embed it in the next quarterly campaign.

### 26.4 Compliance Snapshot Example

Compliance snapshots provide audit evidence. Each snapshot includes a summary, a completion table, and a set of supporting data tables.

Compliance Snapshot Narrative Example:

Snapshot date: 2026-02-05. Framework: PCI DSS 4.0. Training completion rate for required roles is 97 percent. All training modules required under PCI DSS 12.6 have been completed within the last 12 months. Policy acknowledgement records are available for 100 percent of active users. The snapshot includes all learner transcripts and evidence of remediation where applicable. All records are retained for at least one year in accordance with PCI DSS requirements.

### 26.5 Evidence Trace Example

Evidence traces allow auditors to link a metric to raw events. An evidence trace is a chain of events that demonstrates why a metric is computed as shown.

Example trace for phishing click rate:

1. `simulation.phish.sent` events define the denominator. These events include campaign ID, template ID, and user ID.
2. `simulation.phish.clicked` events define the numerator. These events include the same campaign ID and user ID.
3. The system aggregates by campaign and time window, producing click rate.
4. The report stores the aggregate and references the event IDs used in the calculation.

This trace provides a direct audit path from report to event log.

### 26.6 KPI Calculation Walkthrough

The walkthrough below shows how metrics are derived for a single department over a 30 day window.

Input data:

- Phishing emails delivered: 200
- Phishing clicks: 18
- Phishing reports: 76
- Legitimate emails delivered: 400
- False reports: 12
- Average response time to report: 3 hours
- Baseline click rate at program start: 30 percent
- Current click rate: 9 percent

Calculated metrics:

- Click rate: 18 / 200 = 9 percent
- Report rate: 76 / 200 = 38 percent
- False positive rate: 12 / 400 = 3 percent
- Reduction from baseline: 30 percent - 9 percent = 21 percentage points

Interpretation:

A click rate of 9 percent is below the BRD 6-month target of less than 15 percent and approaching the 12-month target of less than 5 percent, indicating strong detection performance. The report rate of 38 percent exceeds the BRD 6-month target of greater than 30 percent but remains below the 12-month target of greater than 60 percent; remediation should focus on encouraging reporting behavior. The false positive rate is low, suggesting that learners are not over reporting.

### 26.7 Learning Assessment Evidence Trace

Learning assessment scores are calculated from evidence points. Each evidence point has a weight and domain tag. The aggregate score is a weighted average with a confidence interval.

Example for a single learner over one week:

- 10 correct phishing detections at difficulty tiers 3 to 4
- 2 incorrect approvals of high risk emails
- 6 correct verification decisions
- 1 partial credit decision for a flagged ambiguous email

The system computes a phishing detection score using weighted correctness. The incorrect approvals reduce the score more heavily due to high difficulty and threat context. The verification score remains high, indicating that the learner is using verification effectively. The confidence interval is widened because the total evidence points are below the weekly threshold. The system schedules a micro assessment to increase evidence density.

### 26.8 Remediation Recommendation Logic

Remediation recommendations are triggered by a combination of low domain scores and negative trends. The logic follows these rules:

1. If a domain score falls below 40 with a downward trend over 14 days, flag for remediation.
2. If the phishing click rate for a department exceeds the organization threshold by 50 percent or more, recommend a focused campaign.
3. If a learner shows high false positive rates, recommend a review of legitimate email cues and safe reporting practices.

Recommendations are delivered through the trainer dashboard and can be scheduled as a campaign or as just in time interventions.

### 26.9 Benchmarking Methodology

Benchmarking compares a tenant to a peer group of similar size and industry. The methodology is designed to avoid exposing any tenant level data.

- Peer groups are defined by industry and employee count bands.
- Metrics are aggregated to percentiles, not averages, to reduce sensitivity to outliers.
- Benchmarks are updated quarterly and require a minimum number of contributing tenants.
- No tenant can access raw peer data or identify specific peers.

### 26.10 Data Export Bundle Manifest

Exports are delivered as bundles that include metadata, data files, and integrity signatures. The manifest defines the files included.

| File          | Description                                      |
| ------------- | ------------------------------------------------ |
| manifest.json | Export metadata, timestamps, and schema versions |
| report.pdf    | Human readable report                            |
| data.csv      | Raw report data                                  |
| data.json     | JSON format data                                 |
| signature.sig | Digital signature for integrity verification     |

Each bundle includes a verification hash in the manifest. The export service retains a copy of the manifest for audit purposes.

---

### 26.11 Metric Design Rationale

Metrics are selected to satisfy three conditions: they must represent real security behavior, they must be explainable to non technical stakeholders, and they must be derived from verifiable evidence. For example, phishing click rate is a direct measure of a harmful action, making it a clear indicator of risk. Reporting rate represents positive behavior, reinforcing not just detection but correct escalation. False positive rate ensures that defensive behavior does not become counterproductive. These three measures together provide a balanced view of user behavior.

Similarly, knowledge retention is measured as a function of repeated recall across time. It is not based on a single quiz. This aligns with the stealth learning philosophy and avoids the negative effects of test anxiety. Incident response readiness is included because phishing alone does not represent the full scope of awareness. The game simulates breaches, recovery, and containment, providing a realistic environment for practicing response decisions. By measuring response time and action sequencing, the system can detect improvements that are directly relevant to real security operations.

The organizational risk score is a composite metric designed to be used carefully. The score is not a substitute for detailed analysis. It is a shorthand for executive reporting and tracking trends. It is intentionally bounded between 0 and 1 to make it comparable across tenants while still allowing tenant specific weighting.

### 26.12 Data Quality Checklist

The following checklist is used during release validation for analytics features.

1. Event schema validation passes for all emitted events.
2. Required fields are present for all decision and assessment events.
3. Event volume matches expected counts for a typical day cycle.
4. Metrics computed from a sample dataset match expected values within tolerance.
5. Dashboards display data coverage indicators when data is incomplete.
6. Compliance reports reproduce the same values when recomputed from raw events.
7. Benchmarking outputs include only aggregated data and meet minimum tenant threshold rules.

### 26.13 Sample Learner Timeline

A learner timeline provides a narrative view of skill development. This helps trainers understand why a learner is struggling and what interventions are appropriate.

Example narrative timeline:

Week 1: The learner begins with a baseline phishing detection score of 45. They correctly identify obvious phishing attempts but miss a spoofed display name. Verification usage is low. The system recommends a short verification training prompt after Day 2.

Week 2: The learner completes the prompt and begins to request verification more often. False positive rate increases slightly as they become more cautious. This is treated as a normal adjustment period. Phishing detection score improves to 55.

Week 3: The learner encounters a multi day campaign with credential harvesting. They initially approve a risky request, leading to a simulated breach. After the incident, they complete a recovery module and their incident response score improves. The system assigns a spaced repetition item on URL inspection.

Week 4: The learner successfully detects several complex phishing attempts. Their phishing detection score rises to 66, and verification usage stabilizes. The system reduces coaching prompts and increases scenario difficulty modestly.

This narrative timeline shows that progress is not linear and that temporary dips can be part of learning. Trainers can use the timeline to focus on specific behaviors rather than raw scores.

### 26.14 Sample Experiment Analysis

Experiments must be analyzed with both engagement and learning outcomes in mind. A change that increases retention but reduces learning accuracy is not acceptable in enterprise mode.

Example experiment:

- Hypothesis: Adding a short intelligence brief before email triage improves detection accuracy.
- Variant A: Standard flow without brief.
- Variant B: Brief included.

Results:

- Variant B increased phishing detection accuracy by 6 percent.
- Variant B increased average session duration by 2 minutes.
- Variant B had no negative effect on retention.

Conclusion: Variant B is adopted for enterprise mode. For consumer mode, the brief is optional to preserve faster sessions for casual players.

### 26.15 Accessibility and Reporting

Analytics reporting must meet WCAG 2.1 Level AA compliance as the baseline, with Section 508 compliance for US government market access and EN 301 549 compliance for the EU market, per BRD Section 7.5. All dashboards must be usable with keyboard navigation and screen readers. Charts must include text summaries. Color is never the only indicator for risk levels, consistent with the BRD requirement for color-blind safe palette with secondary encoding (text labels, icons, patterns). Reports should include plain language summaries and data tables that can be read without visual charts.

This requirement is part of the compliance obligations in the BRD. It also improves the usability of analytics for all administrators, not just those with accessibility needs.

---

### 26.16 Assessment Calibration Example

Calibration is the process of ensuring that scores are comparable across different cohorts and time periods. The following example illustrates how calibration is applied when new content is introduced.

A new set of spear phishing scenarios is added in Season 2. Early analytics show that detection accuracy for these scenarios is significantly lower than for existing scenarios, even among high performing players. The content review team confirms that the scenarios are more complex and include cues that are not covered in existing guidance. Without calibration, the new scenarios would artificially depress phishing detection scores and trigger unnecessary remediation.

Calibration steps:

1. Assign a provisional difficulty tier of 5 and mark the scenarios as calibration candidates.
2. Collect evidence from a sample of players across skill bands.
3. Compute the expected correctness distribution for each band.
4. Adjust the difficulty factor so that the score impact aligns with historical distributions for tier 5 content.
5. Update the content quality score once the scenario performance stabilizes.

The calibrated difficulty factor ensures that players are not penalized for early exposure to new content. At the same time, it preserves the challenge by keeping the scenarios in a high difficulty tier. Calibration decisions are recorded in the content metadata and stored for audit.

### 26.17 Metric Interpretation Guidance

Metrics can be misinterpreted without context. Reports must include guidance on how to interpret key values.

- A high false positive rate may indicate over reporting. It can also indicate cautious behavior in a period of elevated threat. Interpret in conjunction with threat tier and coaching prompts.
- A low reporting rate may indicate either a lack of reporting knowledge or a culture of silence. Trainers should compare reporting rate to detection accuracy to determine whether learners recognize phishing but fail to report.
- A drop in detection accuracy during a major campaign may be expected due to increased difficulty. This should not automatically trigger remediation unless the decline persists.
- Improvements in response time are valuable only if correctness remains stable. Faster but incorrect actions are not positive outcomes.

Interpretation guidance is included in dashboard tooltips and report footnotes.

### 26.18 Audit Preparation Checklist

The following checklist summarizes the artifacts required for a typical audit.

1. Training completion summary by department and role.
2. Policy acknowledgement logs with timestamps and versions.
3. Assessment scores and evidence for required training modules.
4. Compliance snapshot exports with digital signatures.
5. Data retention policy confirmation aligned to applicable frameworks.
6. Audit log of report access and export events.

This checklist is a baseline and can be customized per framework. The analytics system provides all listed artifacts without requiring manual data manipulation.

---

### 26.19 Change Management for Metric Definitions

Metric definitions must be stable to preserve trust. Any change to a metric definition can alter historical comparisons and must be managed carefully.

Change management rules:

1. Metric changes require a version increment and a documented rationale.
2. Historical data is either recomputed or frozen with an explanation in the report.
3. Dashboards display the current metric version and indicate when a version change occurred.
4. Enterprise tenants receive release notes describing any changes that affect reporting or compliance evidence.

These rules ensure that analysts and auditors can reconcile differences between reports produced at different times.

### 26.20 Data Access Request Process

Access to individual learner analytics is controlled through a formal request process. The process aligns with privacy safeguards and minimizes the risk of misuse.

Process steps:

1. Requester submits a justification aligned to training objectives or compliance requirements.
2. Privacy officer reviews the request and confirms that the scope is appropriate.
3. Access is granted with time bound credentials and is logged.
4. Access is revoked automatically at expiration and included in audit logs.

This process ensures that analytics data is used responsibly and consistently across the organization.

---

### 26.21 Data Retention Example

A tenant operating under both HIPAA and PCI DSS selects a retention policy of 6 years for training records. The analytics system stores raw events for 6 years, then aggregates them into anonymized summaries while preserving compliance snapshots. When the retention window expires, raw events are deleted and the deletion is recorded in an audit log. If the tenant later reduces the retention period, the system applies the shorter window only after validating that no regulatory requirements are violated. This example illustrates how retention policy is both configurable and constrained by compliance rules.

---
