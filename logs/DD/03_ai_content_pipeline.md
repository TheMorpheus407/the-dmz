# 03 -- AI Content Pipeline Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-03
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Game Design / Engineering / Compliance
**Authors:** Systems Architecture, AI/ML Engineering, Narrative Design, Security Research

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Non-Goals](#2-scope-and-non-goals)
3. [Inputs, Dependencies, and Alignment](#3-inputs-dependencies-and-alignment)
4. [Design Principles](#4-design-principles)
5. [Requirements Summary](#5-requirements-summary)
6. [Content Taxonomy and Canonical Outputs](#6-content-taxonomy-and-canonical-outputs)
7. [Pipeline Architecture Overview](#7-pipeline-architecture-overview)
8. [Content Lifecycle](#8-content-lifecycle)
9. [Prompt System and Template Management](#9-prompt-system-and-template-management)
10. [Context Assembly and World State Integration](#10-context-assembly-and-world-state-integration)
11. [Generation Modes and Scheduling](#11-generation-modes-and-scheduling)
12. [Safety Guardrails and Output Validation](#12-safety-guardrails-and-output-validation)
13. [Difficulty Classification and Quality Scoring](#13-difficulty-classification-and-quality-scoring)
14. [Adaptive Learning and Personalization Loop](#14-adaptive-learning-and-personalization-loop)
15. [Scenario and Campaign Generation](#15-scenario-and-campaign-generation)
16. [Document Generation Strategy](#16-document-generation-strategy)
17. [Localization and Cultural Adaptation](#17-localization-and-cultural-adaptation)
18. [Governance, Review, and Compliance Workflow](#18-governance-review-and-compliance-workflow)
19. [Storage, Caching, and Pool Management](#19-storage-caching-and-pool-management)
20. [Integration with Game Engine and Threat Engine](#20-integration-with-game-engine-and-threat-engine)
21. [Enterprise Platform Integration](#21-enterprise-platform-integration)
22. [Security, Privacy, and Data Protection](#22-security-privacy-and-data-protection)
23. [Observability, Metrics, and SLOs](#23-observability-metrics-and-slos)
24. [Failure Handling and Fallback Strategies](#24-failure-handling-and-fallback-strategies)
25. [Cost Management and Provider Strategy](#25-cost-management-and-provider-strategy)
26. [Testing, Evaluation, and Red Teaming](#26-testing-evaluation-and-red-teaming)
27. [Rollout Plan and Milestones](#27-rollout-plan-and-milestones)
28. [Open Questions and Decision Log](#28-open-questions-and-decision-log)
29. [Appendices](#29-appendices)

---

## 1. Executive Summary

This document specifies the AI Content Pipeline for The DMZ: Archive Gate, the system that generates, validates, and delivers dynamic cybersecurity content across both consumer and enterprise modes. The pipeline is a core differentiator in the BRD and sits at the intersection of narrative design, threat simulation, compliance training, and operational resilience. It produces phishing emails, legitimate access requests, intelligence briefs, scenario variations, and select in-game documents with freshness, personalization, and difficulty calibration, while respecting strict safety rules that prohibit real company names, real people, real URLs, phone numbers, or functional malicious payloads.

The design aligns with the game core loop and state machine (DD-01), threat engine and breach mechanics (DD-05), UI/UX terminal aesthetic (DD-07), and backend architecture (DD-09). It operationalizes the BRD requirements for AI-generated dynamic content, a pre-generated pool of 200+ emails across difficulty tiers, and an enterprise-grade compliance posture. The pipeline must be deterministic enough for audit and reproducibility, yet adaptive enough to personalize difficulty and narrative context. It also must be resilient to LLM variability and perform within strict latency targets without blocking gameplay.

At a high level, the pipeline is a modular service embedded in the initial monolith, with clear extraction boundaries. It uses a multi-stage architecture: policy guardrails, prompt assembly, LLM generation, output parsing, validation and safety filtering, difficulty classification, quality scoring, and storage into the content library. It supports batch pre-generation, on-demand generation, and offline self-hosted operation. It integrates tightly with the content module (content library), threat engine (attack selection and campaign context), analytics (player skill profiles), and enterprise admin features (campaign scheduling, content review, and reporting).

The remainder of this document details functional requirements, architecture, schemas, guardrails, and implementation plans. It is intended as a shared blueprint for engineering, narrative, AI/ML, security, and compliance teams, and as a reference for QA and audit readiness.

---

## 2. Scope and Non-Goals

### 2.1 Scope

The AI Content Pipeline includes the systems, data structures, and operational workflows required to generate, validate, and distribute dynamic content that powers the core game loop and enterprise training features. In scope are:

- Generation of phishing and legitimate access request emails aligned to difficulty tiers and attack types.
- Generation of intelligence briefs, incident summaries, and select dynamic narrative variations.
- Scenario and campaign variation generation for multi-day attacks.
- Difficulty classification, quality scoring, and safety filtering.
- Content pool management and pre-generation strategy.
- Localization and cultural adaptation workflows for AI-generated content.
- Integration with content storage, analytics, threat engine, and game engine.
- Audit, governance, and compliance controls for AI-generated content.

### 2.2 Non-Goals

The AI pipeline does not replace the human narrative team, nor does it generate the core seasonal story spine. It is not responsible for primary UI design, animation, or core game mechanics. Explicitly out of scope are:

- Full narrative scriptwriting for seasons, chapters, or character arcs.
- Manual content authoring tools and WYSIWYG editors (handled in content tooling roadmap).
- Full policy engines for compliance frameworks beyond the content mapping defined here.
- Player-facing AI chat or generative assistant features (not required in BRD).
- Real-world phishing simulation infrastructure beyond content generation (handled by enterprise campaign engine).

The pipeline also does not generate real malicious payloads, real-world exploit instructions, or any content that could be deployed outside the game or training context.

---

## 3. Inputs, Dependencies, and Alignment

### 3.1 Primary Inputs

- BRD-DMZ-2026-001, especially sections on AI content, core loop, functional requirements, and compliance.
- DD-01 Game Core Loop and State Machine, for integration points and deterministic state requirements.
- DD-05 Threat Engine and Breach Mechanics, for attack types, campaign phases, and difficulty scaling.
- DD-07 UI/UX Terminal Aesthetic, for content formatting, document layout constraints, and accessibility.
- DD-09 Backend Architecture and API, for module boundaries, schemas, events, and operational contracts.

### 3.2 Alignment Constraints

The AI pipeline must adhere to the following project-wide constraints:

- Web-first architecture with SvelteKit and a modular monolith backend.
- Event sourcing for game state and auditability.
- AI provider strategy: Anthropic Claude API (Sonnet for generation, Haiku for classification) as primary, with self-hosted open-source fallback (Mistral/Llama) for offline or air-gapped enterprise deployments.
- Safety guardrails: no real company names, real people, real URLs, phone numbers, or PII.
- Pre-generated email pool with off-peak batch generation to avoid gameplay latency.
- Difficulty scaling based on player performance, narrative progression, and threat level rather than a manual slider.

### 3.3 Dependency Interfaces

The pipeline relies on the following modules and services defined in DD-09:

- `content` module for storing and retrieving generated content.
- `analytics` module for player skill profiles, detection rates, and personalization signals.
- `threat-engine` module for attack type selection and campaign context.
- `game-engine` module for session state, day advancement, and decision outcomes.
- `notification` module for any asynchronous alerts related to content issues or pool depletion.

---

## 4. Design Principles

1. Stealth learning is the north star. AI-generated content must feel like a narrative access request or operational document, not a training exercise.
2. Safety before cleverness. The pipeline rejects content that could be actionable or legally sensitive, even at the cost of creativity.
3. Deterministic traceability. Every generated item is attributable to a prompt template version, model version, and input context, enabling audit and reproducibility.
4. Narrative justification. Difficulty shifts and attack sophistication changes must be supported by in-world context and threat briefs.
5. Adaptive but bounded. Personalization is constrained to safe, interpretable ranges so that training outcomes remain comparable across users and enterprises.
6. Human review is essential. AI content is a force multiplier, not an autonomous publisher. Review gates are mandatory for enterprise usage and for any new template releases.
7. Availability is part of pedagogy. The pipeline cannot introduce gameplay blocking; pre-generation and caching are required to preserve flow.
8. Localization is not translation only. Cultural adaptation is required to preserve realism without using real brands or people.
9. Defense in depth for AI safety. Multiple independent filters must agree before content is published.
10. Metrics drive iteration. Content quality is continuously measured with user outcomes, not just model outputs.

---

## 5. Requirements Summary

### 5.1 Functional Requirements

The AI pipeline must:

- Generate phishing emails across difficulty tiers 1-5 aligned to attack types defined in DD-05.
- Generate legitimate access request emails that are indistinguishable in tone and structure from phishing, but with verifiable signals of authenticity.
- Produce content that maps to the core loop decision options: Approve, Deny, Flag for Review, Request Additional Verification.
- Attach structured metadata, including faction, threat level, attack type, MITRE ATT&CK mapping, difficulty tier, and narrative tags.
- Maintain a pre-generated pool of at least 200 emails across difficulty tiers at any time, with local thresholds per tier.
- Support scenario variation generation for multi-day campaigns and adaptive threat responses.
- Provide quality scores and difficulty classification for each generated item.
- Enforce safety guardrails and reject output containing disallowed entities or actionable content.
- Integrate with localization workflows for all 24 official EU languages (per BRD FR-ENT-044 and Section 7.6), with phased rollout: 12 languages in Phase 4, expanding to full 24 in subsequent phases. RTL language support (Arabic, Hebrew, Farsi) per BRD Section 7.6.
- Support enterprise JIT training recommendations and micro-lessons derived from in-game decisions.

### 5.2 Non-Functional Requirements

The AI pipeline must:

- Provide generation latency under 10 seconds for on-demand requests, with pre-generation eliminating player-visible latency.
- Scale to support 100,000+ concurrent users through asynchronous batch generation and caching.
- Operate under strict audit trails with immutable generation logs and versioned templates.
- Support offline or air-gapped deployments with self-hosted models and local content caches.
- Maintain high reliability with fallback to handcrafted content when AI generation fails.
- Respect data protection and privacy mandates (GDPR, HIPAA, PCI-DSS, SOC 2, FedRAMP readiness, NIS2, DORA).

---
## 6. Content Taxonomy and Canonical Outputs

The AI pipeline produces content in a constrained taxonomy so that generated items can be validated, localized, and rendered consistently in the UI. All AI outputs are structured JSON objects with strict schemas that map to document templates and gameplay widgets. Narrative text is only one part of the object; metadata, tags, and signal annotations are equally important for gameplay and analytics.

### 6.1 Primary Content Types

The pipeline generates or augments the following content types:

- Email Access Requests (legitimate and phishing variants).
- Intelligence Briefs that explain current threat shifts and campaign context.
- Incident Summaries for post-attack reflection and learning reinforcement.
- Scenario Variations for multi-day campaigns (attack sequences, trigger conditions).
- Micro-Lesson Recommendations for enterprise remediation and spaced repetition.

Other document types (Verification Packet, Threat Assessment Sheet, Contracts, Facility Status) are template-driven with minimal dynamic text and are mostly generated deterministically from game state. The AI pipeline may enrich these with narrative flavor text but does not own their core data fields.

### 6.2 Metadata Tags

Every content item includes a metadata envelope used by the game engine, threat engine, and analytics. Required fields include:

- `content_type` (email, intel_brief, incident_summary, scenario_variation, micro_lesson).
- `difficulty` (1-5).
- `faction` (Sovereign Compact, Nexion Industries, Librarians, Hacktivists, Criminal Networks).
- `attack_type` (phishing, spear_phishing, BEC, credential_harvesting, malware_delivery, pretexting, supply_chain, ransomware, insider, etc). All attack types from BRD FR-GAME-003 (spear phishing, BEC, credential harvesting, malware delivery, and pretexting) must be represented.
- `mitre_mapping` (list of ATT&CK technique IDs).
- `threat_level` (LOW, GUARDED, ELEVATED, HIGH, SEVERE).
- `season` and `chapter` context (if applicable).
- `language` and `locale`.
- `safety_flags` (output policy checks and outcomes).
- `quality_score` and `difficulty_score` (computed by classification models).

### 6.3 Email Access Request Structure

Emails are the primary unit of gameplay. AI-generated emails must include both a human-readable body and a machine-readable signal map for analysis feedback. The canonical structure includes:

- Header fields: From, To, Subject, Date, Message-ID, Reply-To, Received chain, SPF/DKIM/DMARC status fields.
- Body fields: Greeting, request summary, justification, call to action, attachments list, signature block.
- Link fields: Sanitized URLs using reserved TLDs such as `.example`, `.invalid`, or `.test`.
- Attachment fields: Simulated attachments with safe metadata, never actual executable content.
- Signal annotations: A list of red flags and green flags linked to text spans, used for post-decision feedback.
- Verification hints: Internal references that can be cross-checked against Verification Packets or Threat Assessment Sheets.

### 6.4 Intelligence Brief Structure

Intelligence briefs are short documents delivered at day boundaries. They explain why threat levels shift, which satisfies the narrative justification principle. The AI pipeline generates these briefs with strict guardrails so that they never reveal the correct answer to an upcoming email. Structure includes:

- Executive summary (2-3 sentences).
- Observed indicators (bullet list of non-actionable signs).
- Expected adversary tactics (mapped to attack types).
- Recommended posture adjustments (narrative, not prescriptive).
- Tone consistent with Morpheus or the intelligence team.

### 6.5 Scenario Variations

Scenario variations extend multi-day campaigns without ballooning hand-authored content. The AI pipeline generates variations of campaign beats, including phishing waves, supply chain probes, and insider anomalies. These variations are structured with trigger conditions, required preconditions, and deterministic outcomes. They are not open-ended narratives.

---

## 7. Pipeline Architecture Overview

The AI content pipeline is a multi-stage system designed to balance creativity with strict safety, determinism, and scalability. Each stage is separately testable and provides traceable outputs.

### 7.1 High-Level Flow

1. Content request is created by game engine, threat engine, or admin tooling.
2. Policy guardrails validate the request against allowable content types and contexts.
3. Prompt assembly builds a structured prompt from templates, context, and constraints.
4. LLM generation is executed using the primary provider or fallback model.
5. Output parsing converts the response into a structured JSON object.
6. Validation and safety filters run on the structured output.
7. Difficulty classification and quality scoring are applied.
8. Content is stored in the content library and optionally added to the pre-generated pool.
9. Analytics events are emitted for cost, quality, and usage tracking.

### 7.2 Architecture Diagram (Conceptual)

```
Content Request
   |
   v
Policy Gatekeeper
   |
   v
Prompt Assembly --> Prompt Template Store (versioned)
   |
   v
LLM Provider (Claude Sonnet / Haiku / Self-hosted)
   |
   v
Output Parser + Schema Validator
   |
   v
Safety Filters + Redaction
   |
   v
Difficulty Classifier + Quality Scorer
   |
   v
Content Library (content.items) + AI Logs
   |
   v
Email Pool (Redis list, LPUSH/RPOP) + Pool Manager + Delivery
```

### 7.3 Module Placement

- The pipeline runs inside the `ai-pipeline` module in the modular monolith, as defined in DD-09.
- It communicates with the `content` module to persist items and with `analytics` to log quality metrics.
- It listens for `content.pool.low` events and triggers batch replenishment.
- It can be extracted into a standalone service when LLM latency or volume dictates.

---

## 8. Content Lifecycle

The AI pipeline supports a full lifecycle from generation to retirement, with governance and compliance controls at each step.

### 8.1 Lifecycle Stages

1. **Ideation and Request**: A content request is generated by the game engine (day queue), threat engine (campaign beat), or admin tool (enterprise campaign).
2. **Generation**: The LLM produces a structured draft, including narrative text and metadata.
3. **Validation**: Automated validators enforce schema, safety, and formatting rules.
4. **Classification and Scoring**: Difficulty and quality scores are computed and attached.
5. **Review (optional or mandatory depending on use case)**: Human reviewers approve, reject, or edit content.
6. **Publication**: Approved content is marked as published and made available to the game engine.
7. **Localization**: Translated versions are generated and reviewed.
8. **Deployment**: Content is added to pre-generated pools and deployed to active sessions.
9. **Monitoring and Feedback**: Player outcomes and analytics are associated with each content item.
10. **Retirement**: Items are archived based on age, performance, or policy.

### 8.2 Governance Gates by Mode

- Consumer gameplay content can be auto-published if it passes strict automated checks and is not associated with new or untested prompt templates.
- Enterprise phishing simulations and compliance training content require mandatory human review and approval.
- Any content generated from new prompt template versions must be flagged for QA review before publication.

### 8.3 Auditability

Every item includes a full provenance record: template version, model version, input context, generation latency, tokens, and reviewer decisions. This supports SOC 2 audits, PCI-DSS annual review requirements, and internal quality control.

---
## 9. Prompt System and Template Management

Prompt design is the heart of the pipeline. To prevent drift, every prompt is versioned, structured, and audited. The system uses a template registry stored in `ai.prompt_templates` with explicit JSON schemas for output.

### 9.1 Template Categories

Templates are organized by category:

- `email_phishing` -- malicious access requests across attack types.
- `email_legitimate` -- valid access requests with verifiable signals.
- `intel_brief` -- narrative justification for threat level shifts.
- `incident_summary` -- post-incident reflection and lesson reinforcement.
- `scenario_variation` -- multi-day campaign beats and event sequences.
- `micro_lesson` -- short remediation content for enterprise JIT training.

### 9.2 Template Versioning and Release Process

Each template has a semantic version (major.minor.patch) and a content safety classification. Major versions require mandatory QA review and sign-off from security and narrative design. Minor versions require automated regression tests and a smaller content sampling review. Patch versions are limited to typo fixes or metadata adjustments.

A template cannot be used for production generation unless it is marked `is_active = true` and is associated with a passing test suite. Deprecated templates remain in the database for audit but are not used in generation.

### 9.3 Prompt Structure

Prompts are built from three sections:

- System prompt: defines role, safety rules, and format constraints.
- User template: provides dynamic context and explicit output schema expectations.
- Output schema: JSON schema for strict parsing and validation.

All prompts explicitly instruct the model to avoid real company names, real people, real URLs, phone numbers, or PII. The system prompt contains the canonical policy language, which is shared across templates to minimize drift.

### 9.4 Structured Output Requirement

The pipeline requires JSON outputs. Free-form text is rejected. If the model returns invalid JSON, the system triggers a retry with a lower temperature and a reminder of schema constraints. After three failed attempts, it falls back to a pre-generated item or a handcrafted template.

### 9.5 Example Prompt Policy Excerpt (Non-Operational)

The system prompt always includes constraints such as:

- Use only fictional organizations defined in the context registry.
- Use only reserved domains (.example, .invalid, .test) and never include phone numbers.
- Do not include instructions that could be executed outside the game.
- Output JSON that conforms to the provided schema.

### 9.6 Prompt Libraries and Retrieval

Templates are stored in the AI pipeline registry and are indexed by content type, attack type, season, and difficulty. The pipeline selects the template with the closest match to the requested context, then applies context assembly and runtime constraints.

---

## 10. Context Assembly and World State Integration

The pipeline uses a structured context builder to ensure outputs are grounded in the game's world state without leaking sensitive or real data. Context is assembled from internal sources and sanitized before inclusion in prompts.

### 10.1 Context Sources

- Session metadata (day number, facility tier, current threat level).
- Faction relationships and reputation scores.
- Current season and narrative act.
- Player skill profile (detection rates, false positive rates, time-to-decision).
- Threat engine signals (active campaign, current attack vector bias).
- Enterprise policy constraints (allowed content types, review requirements).

### 10.2 Sanitization Rules

All context is sanitized to remove PII and disallowed entities. Only synthetic names and in-world factions are used. Numeric identifiers are converted to short tokens. Any free-text input provided by humans (such as admin-entered campaign notes) is stripped of sensitive content and reduced to safe topic tags.

### 10.3 Context Bundles

Context is passed to the prompt in a minimal JSON bundle. An example bundle includes:

- `world`: { season: 1, act: 2, chapter: 5, setting: "Matrices GmbH" }
- `threat`: { level: "ELEVATED", active_campaign: "supply_chain_probe" }
- `player_profile`: { phishing_detection_rate: 0.68, false_positive_rate: 0.18 }
- `constraints`: { difficulty: 3, attack_type: "spear_phishing" }

### 10.4 Narrative Consistency

The context builder ensures that references to factions, facility tiers, and recent events are consistent with the player’s timeline. The system does not invent new factions or major events. It can only reference the existing canon defined by narrative design and BRD.

---

## 11. Generation Modes and Scheduling

The AI pipeline supports multiple generation modes to meet latency, quality, and compliance requirements.

### 11.1 Batch Pre-Generation

Batch pre-generation is the default mode for gameplay content. It runs during off-peak hours via BullMQ on Redis (per BRD Section 8.6) and ensures the pool maintains at least 200 items across difficulty tiers, with 20-50 per difficulty tier. The scheduler prioritizes underrepresented combinations of difficulty, attack type, and faction to keep content diverse.

### 11.2 On-Demand Generation

On-demand generation is used when a specific context requires a unique item, such as a campaign beat that depends on recent player actions. This mode is rate-limited and must complete within the 10-second latency budget. If on-demand generation fails, the system substitutes a pre-generated item with the closest matching tags and logs the mismatch for later analysis.

### 11.3 Enterprise Campaign Generation

Enterprise phishing simulations and training modules may be generated on request by admins. These requests trigger mandatory human review, even if the content passes automated validation. This protects compliance requirements and reduces risk of inappropriate content.

### 11.4 Offline and Air-Gapped Mode

For regulated or air-gapped deployments, the pipeline runs with a self-hosted model (Mistral/Llama per BRD Section 8.4) and uses a local prompt registry. If AI generation is disabled entirely, the system operates in a deterministic handcrafted-only mode using the offline content budget of 50 handcrafted email scenarios (per BRD Section 8.2), providing graceful degradation when AI content is unavailable. This ensures the platform remains functional in environments where external API access is prohibited.

---

## 12. Safety Guardrails and Output Validation

Safety is enforced through layered guardrails. No single filter is trusted. Content must pass every stage to be published.

### 12.1 Policy Guardrails

Policy rules are encoded in the system prompt and enforced in post-processing. Core rules include:

- No real company names, real people, or real brands.
- No real URLs, IPs, domains, or phone numbers.
- No functional malware instructions or executable payloads.
- No content that could be interpreted as real-world credential harvesting.
- No references to real-world incidents or organizations.

### 12.2 Schema Validation

All output must conform to JSON schemas. Schema validation includes length limits, required fields, allowed enums, and text constraints. Invalid output is rejected.

### 12.3 Safety Linting

Automated safety linting includes:

- Regex detection for phone numbers, real email domains, or IP addresses.
- A blocklist of real brands and public sector entities.
- A whitelist of synthetic in-world entities.
- URL validation enforcing reserved TLDs only.
- Attachment type enforcement to prevent unsafe file types.

### 12.4 Human Review Triggers

Human review is required when:

- A new template version is used for the first time.
- The model’s confidence score is below a threshold.
- The content is intended for enterprise campaigns.
- The item contains edge-case patterns that pass automated checks but are close to policy boundaries.

### 12.5 Explainable Filtering

Every rejection produces a structured reason code. This is critical for debugging prompt issues and for compliance evidence that guardrails are active and effective.

---

## 13. Difficulty Classification and Quality Scoring

Difficulty classification ensures content aligns with player skill and narrative progression. Quality scoring ensures that content is realistic, pedagogically useful, and aligned with attack patterns.

### 13.1 Difficulty Model

Difficulty is computed using a classifier model (Claude Haiku or a small self-hosted model). The model reads the generated item and assigns a difficulty tier based on linguistic complexity, signal subtlety, and the number of detectable indicators.

### 13.2 Difficulty Features

Key features include:

- Red flag density (number of indicators per 100 words).
- Sophistication of impersonation (tone, formatting, and context accuracy).
- Presence or absence of verification hooks.
- Header complexity and spoofing indicators.
- Emotional manipulation techniques.

### 13.3 Quality Score

Quality score is a weighted composite:

- Narrative plausibility and consistency with world state.
- Grammar and clarity (not too perfect in low difficulty).
- Alignment with attack type patterns from DD-05.
- Diversity of signal patterns to avoid repetitiveness.
- Learnability, meaning the player can identify meaningful indicators.

### 13.4 Feedback Loop

Items with poor outcomes (high false positive rates, low educational value, or player confusion) are flagged for review and eventually retired. This ensures the content pool improves over time.

---

## 14. Adaptive Learning and Personalization Loop

Adaptive learning aligns difficulty and content selection with player skill while preserving fairness and narrative coherence. The adaptive learning engine maintains a competency model across seven domains (per BRD Section 11.6 and FR-AN-004): phishing detection, password security, data handling, social engineering resistance, incident response, physical security, and compliance awareness. Administrators can set minimum competency thresholds triggering mandatory remediation.

### 14.1 Player Skill Profile Inputs

The analytics module provides aggregated skill indicators, including:

- Phishing detection rate per attack type.
- False positive rate (denying legitimate emails).
- Time-to-decision and time spent on header inspection.
- Request verification usage rate.
- Resource management efficiency.

### 14.2 Personalization Rules

Personalization operates within bounded ranges. For example:

- Difficulty may shift by at most one tier relative to the narrative baseline.
- Attack type emphasis may shift to target weak areas, consistent with the BRD's adaptive threat engine (FR-GAME-020): players good at detecting phishing trigger supply-chain attacks; strong perimeter defense triggers insider manipulation. However, personalization cannot eliminate core seasonal themes.
- Legitimate email frequency cannot drop below the threat-level ratios defined in DD-05.

### 14.3 Enterprise Remediation

For enterprise training, personalization also triggers micro-lessons and spaced repetition sessions. AI-generated micro-lessons are grounded in pre-approved knowledge base snippets to avoid factual errors. The AI paraphrases and contextualizes rather than inventing new guidance. JIT training delivery must occur within 60 seconds of the triggering event (per BRD FR-ENT-019), and interventions are throttled to a maximum of 2 per week per learner (per BRD FR-ENT-020) to avoid fatigue.

---

## 15. Scenario and Campaign Generation

Multi-day campaigns require structured content that evolves across days. The AI pipeline generates variations of campaign beats while preserving deterministic outcomes.

### 15.1 Campaign Beat Structure

Each beat includes:

- Entry conditions (threat level, day range, player actions).
- Attack vector focus (phishing, supply chain, ransomware, insider).
- Required deliverables (email wave, incident event, intelligence brief).
- Consequences and follow-up triggers.

### 15.2 Variation Strategy

AI-generated variations adjust names, timing, and surface details while keeping the underlying mechanics consistent. This ensures replayability without breaking balance.

### 15.3 Threat Engine Integration

The threat engine uses the campaign beat definitions to select attacks, while the AI pipeline provides content payloads that match those selections. The two systems communicate via shared tags and identifiers to ensure consistency.

---
## 16. Document Generation Strategy

The game features 13 in-game documents that serve dual purposes as gameplay artifacts and training instruments. The AI pipeline contributes selectively to document generation while maintaining deterministic structure for audit and UI consistency.

### 16.1 Document Ownership Model

- Email Access Requests: AI generated and fully dynamic.
- Phishing Analysis Worksheet: Template-driven, populated from email metadata and signal map.
- Verification Packet: Template-driven with dynamic fields derived from the synthetic client profile.
- Threat Assessment Sheet: Generated by deterministic risk model; AI may add narrative notes.
- Incident Log: Deterministic event log; AI may generate short summaries.
- Data Salvage Contract: Template-driven with variables; AI can add minor flavor text.
- Storage Lease Agreement: Template-driven; no AI content.
- Upgrade Proposal: Template-driven; AI may add descriptive rationale.
- Blacklist Notice: Deterministic; AI may generate justification text.
- Whitelist Exception: Deterministic; AI may generate emergency narrative.
- Facility Status Report: Deterministic telemetry; no AI content.
- Intelligence Brief: AI generated with strict constraints.
- Ransom Note: AI generated from safe templates with constrained variability.

### 16.2 Document Formatting Constraints

All documents must conform to UI constraints from DD-07. That includes length limits, maximum line width, and accessibility requirements. AI-generated text must not exceed the expected document layout; content that would overflow is truncated or regenerated.

### 16.3 Signal Maps and Explanations

For training feedback, each email includes a signal map that ties to the Phishing Analysis Worksheet and the post-decision feedback screen. The AI pipeline must produce clear, explainable indicators rather than opaque cues.

---

## 17. Localization and Cultural Adaptation

Localization is mandatory for both enterprise and consumer modes. AI-generated content must be linguistically accurate and culturally plausible while maintaining safety rules.

### 17.1 Localization Workflow

1. Base content is generated in English.
2. Machine translation is applied using a controlled translation model.
3. Human reviewers validate the translation for tone and cultural fit.
4. Localization metadata is stored in `content.localized`.

### 17.2 Cultural Adaptation Without Real Brands

Because the pipeline cannot use real company names, cultural adaptation relies on fictional regional cues: naming conventions, salutations, date formats, and job titles. The pipeline uses a locale-specific synthetic entity registry to generate credible but fictional organizations.

### 17.3 RTL Support

All outputs are stored as UTF-8 and must support RTL rendering. The AI pipeline is required to output proper directionality markers when generating RTL languages.

---

## 18. Governance, Review, and Compliance Workflow

The AI pipeline must satisfy compliance obligations, including annual program review, audit trails, and demonstrable control over content changes.

### 18.1 Review Tiers

- Tier A (Auto-Approved): Low-risk consumer gameplay content generated from mature templates.
- Tier B (Reviewer Required): Enterprise simulations, new templates, or content flagged by safety linting.
- Tier C (Security Approval): Content used in regulated sectors or government deployments.

### 18.2 Change Management

Every content item has a changelog and version number. Updates create a new version rather than overwriting. Reviewers can compare diffs between versions, and audit reports can show which version was used for a given training session.

### 18.3 Annual Program Review

The pipeline supports PCI-DSS 12.6.2 and other frameworks by providing a consolidated report of all AI-generated content, review outcomes, and template changes over the last year. This report is exportable via the admin interface.

---

## 19. Storage, Caching, and Pool Management

Content storage is handled by the `content` module. The AI pipeline writes to this module using its public interface and never bypasses its governance layers.

### 19.1 Storage Structure

Generated items are stored in `content.items`, with localization in `content.localized`. AI generation metadata is stored separately in `ai.generation_log` to avoid mixing operational logs with gameplay content.

### 19.2 Pool Strategy

- Target pool size: 200+ emails across difficulty tiers (per BRD FR-GAME-004 and Section 8.4).
- Per-tier target: 20-50 emails per difficulty tier (per BRD Section 8.6), with higher thresholds at mid difficulties where most gameplay occurs.
- The email pool is stored in Redis (list) using LPUSH/RPOP for pool management (per BRD Section 8.5).
- Pool depletion triggers `content.pool.low` events, which start batch generation via BullMQ on Redis (per BRD Section 8.6).

### 19.3 Cache Invalidation

When new content is published, the system emits `content.published` to invalidate caches and refresh pools. This ensures that players receive updated content quickly without manual deployment.

---

## 20. Integration with Game Engine and Threat Engine

The AI pipeline is not a standalone service. It is an integral subsystem for the game engine and threat engine.

### 20.1 Game Engine Integration

The game engine requests email batches for each day. It expects a mix of legitimate and malicious emails based on the threat level ratios defined in DD-05. The AI pipeline provides the content, with deterministic IDs and metadata to support event sourcing.

### 20.2 Threat Engine Integration

The threat engine selects attack vectors and campaign beats. The AI pipeline generates email content and intelligence briefs that align with those vectors. The output includes attack type and MITRE technique IDs so the threat engine can correlate training outcomes.

### 20.3 Deterministic Replays

To support audit and replay, each generated item is referenced by ID in the event log. Replays use the stored content rather than re-generating, ensuring deterministic outcomes. Per BRD Section 8.5, game state snapshots are materialized every 50 events or at day boundaries, providing efficient replay without full event log reduction.

---

## 21. Enterprise Platform Integration

Enterprise mode introduces additional requirements for content generation and delivery.

### 21.1 Phishing Simulation Campaigns

The AI pipeline generates simulation emails for enterprise campaigns. These are stored separately from consumer gameplay pools and are subject to stricter review. The campaign engine can request specific attack types, difficulty tiers, and localization settings.

Enterprise simulations must incorporate real-time threat intelligence, per BRD FR-ENT-022. The pipeline achieves this through a dedicated threat-intel adapter that ingests vetted threat intelligence feeds, normalizes signals into safe, synthetic training cues, and injects them into prompt context without leaking real-world identifiers.

Real-time threat intel integration operates as follows:

- Ingests feeds from approved sources (commercial TI provider, MISP/TAXII feed, and vendor advisories) into a normalized `threat_intel.signals` store with timestamps and TTLs.
- Maps indicators to MITRE ATT&CK technique IDs and attack-type tags used by the threat engine, enabling campaign selection based on current adversary activity.
- Converts real-world lures into synthetic equivalents using the entity registry and reserved domains, ensuring no real brands, people, or URLs appear in output.
- Provides an `intel_context` bundle to the prompt builder that includes current techniques, pretext patterns, and safe “theme” cues, which the generator must weave into the simulation email.
- Exposes a “last updated” timestamp and feed provenance for audit and reporting, so enterprises can prove simulations were aligned to current threat trends.

For air-gapped or restricted deployments, the adapter supports offline TI bundles uploaded by admins. These bundles are validated and applied with the same normalization and safety transformations as online feeds.

### 21.2 Teachable Moments

When a user fails a simulation, the pipeline provides a short remediation message. This message is generated from pre-approved knowledge snippets and tailored to the exact indicators missed.

### 21.3 LMS and Reporting Integration

Each AI-generated item includes metadata required for xAPI (v1.0.3 and 2.0) statements with custom verb vocabulary, SCORM (1.2 and 2004 4th Edition with IMS Simple Sequencing) reporting, LTI 1.3 with LTI Advantage (Deep Linking, Assignment & Grade Services, Names & Role Provisioning Services), cmi5 package compatibility, AICC HACP protocol support for legacy LMS, and compliance transcripts. This ensures that training outcomes can be exported to enterprise LMS platforms across all supported integration standards defined in BRD Sections 6.2 (FR-ENT-035 through FR-ENT-041) and 10.2.

---

## 22. Security, Privacy, and Data Protection

The AI pipeline handles sensitive behavioral data, so it must follow strict privacy and security standards.

### 22.1 Data Minimization

Only minimal context is passed to the LLM. User identifiers are replaced with anonymized tokens. No HR data, personal email addresses, or real organizational names are included in prompts.

### 22.2 Data Residency

For EU customers, AI generation occurs within EU data centers or within self-hosted environments. Cross-border transfers are avoided by design. Prompt and output logs are stored in the same region as the tenant data.

### 22.3 Audit and Integrity

All AI generation logs are append-only and hashed. This supports SOC 2 auditability and evidence for regulatory reviews. Templates and content items include immutable version histories.

---
## 23. Observability, Metrics, and SLOs

The AI pipeline is a production system that must be observable and measurable. Observability is required for performance tuning, cost management, and compliance reporting.

### 23.1 Core Metrics

The system tracks metrics across five categories:

- Generation performance: latency, throughput, retries, token usage, provider errors.
- Safety performance: rejection rate, policy violations, false positive and false negative rates in filtering.
- Quality performance: average quality scores, distribution by difficulty, human review acceptance rate.
- Gameplay impact: player detection rates per content item, false positives, confusion signals, and completion metrics. Supports predictive analytics for at-risk players likely to churn or fail assessments (per BRD FR-AN-021).
- Enterprise impact: phishing simulation outcomes, reporting rates, remediation effectiveness.

### 23.2 SLO Targets

- P95 generation latency under 10 seconds for on-demand requests.
- P99 policy compliance with zero tolerance for disallowed entities.
- Pool availability above 98% for each difficulty tier.
- Template regression failure rate under 2% for stable templates.

### 23.3 Monitoring Infrastructure

Pipeline metrics are exported to Prometheus and visualized through Grafana dashboards (per BRD Section 8.7). This includes generation latency histograms, safety rejection counters, pool level gauges, and cost tracking. Alerts are configured for SLO violations.

### 23.4 Logging and Traceability

Each generation request emits structured logs with correlation IDs. Logs include request parameters, template version, model version, latency, cost, quality score, and safety outcomes. Logs are retained according to compliance requirements and are available for audit reporting.

---

## 24. Failure Handling and Fallback Strategies

Failure handling is designed to protect gameplay flow and compliance commitments.

### 24.1 Generation Failures

If a model fails to generate valid output, the pipeline retries up to three times with decreasing temperature and simplified prompts. If retries fail, a pre-generated content item is selected. This ensures the game never blocks on AI generation.

### 24.2 Provider Outages

If the primary provider is unavailable, the pipeline automatically switches to the fallback model (self-hosted Mistral/Llama per BRD Section 8.4). If no model is available, it operates in handcrafted-only mode using the offline content budget of 50 handcrafted email scenarios (per BRD Section 8.2). This is a defined operational mode, not an exception.

### 24.3 Safety Filter Failures

If safety filters are overly strict and block too many items, the system emits alerts and throttles new generation. However, it never bypasses safety rules. The only response is to adjust templates or guardrails after review.

### 24.4 Pool Depletion

If a pool is depleted below the minimum threshold, the game engine requests the next available tier or a slightly lower difficulty to preserve flow. This is logged as a mismatch for later balancing.

---

## 25. Cost Management and Provider Strategy

AI generation can be expensive, so cost management is a core design requirement.

### 25.1 Provider Selection

- Claude Sonnet is used for creative generation due to higher quality.
- Claude Haiku is used for classification and lightweight tasks.
- Self-hosted open-source models (Mistral/Llama per BRD tech stack) handle offline enterprise deployments and bulk generation when cost efficiency is required.

### 25.2 Cost Controls

- Token budgets per prompt template.
- Maximum output length caps per content type.
- Batch generation during off-peak hours to leverage lower rates where applicable.
- Adaptive regeneration to avoid repeated expensive calls.

### 25.3 Cost Reporting

The pipeline logs per-item cost and aggregates it by tenant and by content type. Enterprise customers can optionally receive cost reports for transparency.

---

## 26. Testing, Evaluation, and Red Teaming

Testing ensures that AI outputs are safe, realistic, and effective for training.

### 26.1 Automated Tests

- Schema validation tests for each template.
- Safety linting tests with adversarial inputs.
- Regression tests comparing outputs from old and new template versions.

### 26.2 Human Evaluation

Human reviewers evaluate a sample of generated content each week. They score realism, pedagogical value, and narrative consistency. This data informs template updates.

### 26.3 Red Teaming

Security experts attempt to force unsafe outputs through prompt injection or context manipulation. These exercises are documented and used to strengthen guardrails.

### 26.4 A/B Testing Framework

The pipeline supports A/B testing of AI-generated content (per BRD FR-AN-020). Variant content items can be assigned to test groups, with outcomes (detection rates, reporting rates, learning gain) compared to control groups. This enables data-driven iteration on prompt templates, difficulty calibration, and content strategies.

### 26.5 Outcome Validation

The ultimate test is learning effectiveness. Content items are evaluated based on player outcomes, including detection rates and improvement over time. Items that underperform are retired or rewritten.

---

## 27. Rollout Plan and Milestones

The AI pipeline rollout aligns with the BRD implementation roadmap.

### 27.1 Phase 1 (Months 1-6)

- Build core AI pipeline with phishing email generation and validation.
- Establish pre-generated pool and content storage integration.
- Create initial prompt templates for phishing and legitimate emails.
- Run limited beta tests with design partners.

### 27.2 Phase 2 (Months 4-9)

- Add scenario variation generation and intelligence briefs.
- Integrate localization workflows for top EU languages.
- Introduce enterprise campaign generation with review gates.

### 27.3 Phase 3 (Months 6-12)

- Expand to multi-channel simulations (SMS, QR, voice) for enterprise use.
- Introduce adaptive learning recommendations and micro-lessons.
- Expand prompt library and template registry.

### 27.4 Phase 4 (Months 12-18)

- Extract AI pipeline service if scaling requirements demand it.
- Add UGC moderation support for community content.
- Expand cultural adaptation to 12 EU languages (aligning with BRD Phase 4 target), with full 24 EU language coverage in subsequent phases.

---

## 28. Open Questions and Decision Log

Open questions require cross-team decisions. This section will be updated as answers are finalized.

1. What is the maximum allowable personalization delta before compliance reporting becomes incomparable across users?
2. Should enterprise customers be allowed to opt into limited use of their own brand names in private deployments, or does the no-real-names rule remain absolute?
3. What is the acceptable reviewer workload per week, and how many content items should be auto-approved?
4. How should we balance pool diversity with content freshness during high-scale usage?
5. Which specific self-hosted model is approved for FedRAMP-ready environments?

---

## 29. Appendices

### Appendix A: Canonical Email JSON Schema (Simplified)

```json
{
  "content_type": "email",
  "email_id": "uuid",
  "difficulty": 3,
  "faction": "Nexion Industries",
  "attack_type": "spear_phishing",
  "mitre_mapping": ["T1566.001", "T1566.002"],
  "threat_level": "ELEVATED",
  "locale": "en",
  "headers": {
    "from": "liaison@nexion.test",
    "to": "intake@matrices.invalid",
    "subject": "Updated Access Credentials",
    "date": "2063-09-14T14:22:00Z",
    "message_id": "<msg-7742@nexion.test>",
    "spf": "fail",
    "dkim": "neutral",
    "dmarc": "fail"
  },
  "body": {
    "greeting": "Director,",
    "summary": "Requesting updated credentials for our storage lease.",
    "justification": "Our liaison was rotated after the signal loss update.",
    "call_to_action": "Please review the attached verification packet.",
    "signature": "-- Liaison K. NEXION"
  },
  "links": [
    {
      "label": "Verification Portal",
      "url": "https://verify.nexion.invalid/portal",
      "is_suspicious": true
    }
  ],
  "attachments": [
    {
      "name": "verification_packet.pdf",
      "type": "pdf",
      "is_suspicious": false
    }
  ],
  "signals": [
    {
      "type": "domain_mismatch",
      "location": "headers.from",
      "explanation": "Sender domain uses a non-standard TLD"
    },
    {
      "type": "urgency",
      "location": "body.call_to_action",
      "explanation": "Requests immediate action without verification"
    }
  ],
  "quality_score": 0.84,
  "difficulty_score": 0.62,
  "safety_flags": ["ok"]
}
```

### Appendix B: Quality Scoring Rubric (Excerpt)

Quality scoring uses a 0-1 scale across weighted dimensions:

- Plausibility (0.25): Does the email feel credible within the game world?
- Signal clarity (0.20): Are there detectable indicators without being trivial?
- Variety (0.15): Does this item avoid repeating common patterns?
- Pedagogical value (0.20): Does it reinforce a security concept aligned with the BRD?
- Narrative alignment (0.20): Does it fit the current season, faction, and threat level?

Items scoring below 0.60 require review. Items below 0.45 are automatically rejected.

### Appendix C: Difficulty Tier Descriptor Table

| Tier | Description | Indicator Density | Typical Use |
|------|-------------|------------------|-------------|
| 1 | Obvious, low sophistication | High | Onboarding, LOW threat levels |
| 2 | Moderate cues, some realism | Medium-high | Early progression |
| 3 | Professional tone, mixed cues | Medium | Core gameplay |
| 4 | High realism, subtle indicators | Low-medium | Advanced play |
| 5 | Near indistinguishable | Low | High and SEVERE threat levels |

### Appendix D: Content Tag Taxonomy (Excerpt)

- `attack_type:phishing`
- `attack_type:spear_phishing`
- `attack_type:bec`
- `attack_type:credential_harvesting`
- `attack_type:malware_delivery`
- `attack_type:pretexting`
- `attack_type:supply_chain`
- `attack_type:ransomware`
- `attack_type:insider`
- `faction:sovereign_compact`
- `faction:nexion_industries`
- `faction:librarians`
- `faction:hacktivists`
- `faction:criminal_networks`
- `season:1_signal_loss`
- `season:2_supply_lines`
- `season:3_dark_channels`
- `season:4_inside_job`

### Appendix E: Safety Rules Matrix (Excerpt)

| Rule | Description | Enforcement Layer |
|------|-------------|------------------|
| No real brands | Block public brands and real orgs | Prompt + filter |
| No real people | Use synthetic name registry | Prompt + filter |
| No real URLs | Reserved TLDs only | Validator |
| No phone numbers | Regex rejection | Validator |
| No executable payloads | Attachment whitelist | Validator |
| No real incidents | Canon-only references | Prompt + review |

### Appendix F: Example Prompt Template (Redacted)

```json
{
  "template_id": "email_phishing_spear_v1",
  "version": 1,
  "category": "email_phishing",
  "system_prompt": "You are generating a fictional email for a cybersecurity training game...",
  "user_template": "Generate a spear phishing email using the following context: {{context}}",
  "output_schema": { "type": "object", "properties": { "headers": {"type": "object"} } },
  "guardrails": { "no_real_urls": true, "no_real_people": true }
}
```

### Appendix G: Pool Threshold Configuration (Example)

Per BRD Section 8.6, the pre-generation strategy maintains a pool of 20-50 emails per difficulty tier:

| Difficulty | Min Pool | Target Pool | Max Pool |
|------------|----------|-------------|----------|
| 1 | 20 | 35 | 50 |
| 2 | 20 | 40 | 50 |
| 3 | 20 | 50 | 50 |
| 4 | 20 | 40 | 50 |
| 5 | 20 | 35 | 50 |

Note: Target pool values align with the BRD's 20-50 per-tier range. All per-tier maximums are capped at 50 per the BRD constraint. Mid-difficulty tiers (2-4) are weighted toward higher targets where most gameplay occurs. Total pool must always exceed 200 across all tiers (BRD FR-GAME-004).


### Appendix H: Synthetic Entity Registry and Canon Data

The synthetic entity registry is the source of truth for all fictional organizations, departments, roles, and naming conventions used in AI-generated content. It exists to satisfy safety constraints while preserving realism and cultural plausibility. The registry is designed as a structured dataset rather than a flat list of names. Each entity entry contains a canonical name, a short code, permitted variants, email address patterns, domain patterns, preferred salutations, and localized aliases. These fields allow the AI pipeline to produce credible communications without ever referencing real entities.

The registry is split into three tiers. Tier 1 includes the five factions defined in the BRD and any core organizations required by the narrative spine (Matrices GmbH, Nexion Industries, the Sovereign Compact, the Librarians, hacktivist collectives, and criminal networks). Tier 2 includes generic industry archetypes that mirror real-world sectors without copying real brands. Examples include regional health networks, municipal data bureaus, logistics consortia, and academic archives. Tier 3 includes procedurally generated entities that are ephemeral and session-specific, such as small contractors or unaffiliated applicants. Tier 3 entries are generated from safe name lists and are never persisted across tenants.

To support localization, each entity includes locale-specific name variants, titles, and organizational forms. For example, an EU locale may use naming patterns like "Consortium" or "Archive Trust" while APAC locales may use "Data Cooperative" or "Records Authority". The registry does not use real legal entity forms (such as GmbH or Inc.) unless they are part of the in-world canon. This avoids accidentally matching a real company name. The domain patterns use reserved TLDs such as `.example`, `.invalid`, and `.test`, and they intentionally avoid any patterns that could collide with real domains.

The registry also includes a "signal profile" per entity. This profile defines typical communication style, preferred document formats, and common metadata fields that a legitimate communication would include. The AI pipeline uses this signal profile to generate legitimate emails that can be verified against known patterns. Conversely, phishing emails can be generated by intentionally deviating from the signal profile, which creates detectable indicators without resorting to unrealistic errors. This creates a consistent and teachable signal system that scales across different factions and attack types.

The registry is versioned and audited. Changes to the registry are treated as content changes, requiring review and a changelog. This is crucial because the registry directly affects every AI-generated email. A change in naming patterns can influence difficulty levels and detection rates, so the registry is treated as a controlled asset rather than a casual configuration file.

**Registry fields (representative):**

- `entity_id`: unique identifier.
- `canonical_name`: primary name in English.
- `aliases`: list of safe variants.
- `faction`: canonical faction association.
- `locale_variants`: map of locale to localized names.
- `email_domain_patterns`: reserved TLD patterns.
- `signature_styles`: standard sign-offs and titles.
- `document_preferences`: preferred document types and references.
- `signal_profile`: expected metadata for legitimate messages.
- `risk_profile`: typical threat posture and history.

### Appendix I: Safety Threat Model and Mitigation Map

The AI pipeline is exposed to multiple safety risks, including prompt injection, model hallucination of real entities, and unintended generation of actionable malicious content. The threat model assumes that any external input may be malicious or untrusted, including admin-entered notes, community content prompts, and integration metadata from third-party systems. Safety measures are layered across input sanitation, prompt constraints, output validation, and human review.

**Threat: Prompt Injection via Context**

An attacker could attempt to embed prompt-injection instructions into a campaign name or a custom scenario description. Mitigation includes strict sanitization, a whitelist of allowed topic tags, and stripping of any free-form text prior to prompt assembly. The system prompt explicitly instructs the model to ignore any instructions in user-provided content and to follow the output schema only. Additionally, the prompt builder enforces a maximum context length and truncates any unstructured input before it reaches the model.

**Threat: Hallucination of Real Entities**

LLMs can hallucinate real brand names or public figures. Mitigation includes a hard blocklist and a positive allowlist of synthetic entities. Output validation scans for known real entity patterns and rejects any item that contains a match. The model is also forced to choose from a provided list of entity options in the prompt, which reduces the probability of unauthorized names.

**Threat: Actionable Malicious Content**

The pipeline must never produce functional attack steps, real phishing URLs, or payload instructions. Mitigation includes strict URL validation, rejection of any code-like content in email bodies, and an attachment whitelist that limits output to inert document types. Content is treated as narrative-only, and any field that resembles instructions is rejected.

**Threat: Safety Filter Bypass**

A single safety layer may fail or be incomplete. The pipeline uses independent filters and does not allow any single filter to pass content if another rejects it. Filters include regexes, semantic classifiers, and manual review triggers. Each filter produces reason codes that are logged for later analysis.

**Threat: Data Leakage**

The pipeline is designed to minimize exposure of sensitive data. No direct user or organization identifiers are provided to the model. For enterprise tenants, any contextual references are replaced with neutral tokens. This reduces the risk that sensitive details appear in generated content or are exposed through logs.

**Threat: Localization Drift**

Localization can introduce unintended meanings or culturally sensitive phrasing. Mitigation includes human review for each locale, with a focus on realism without using real brands. The translation workflow includes a secondary review step for safety and compliance.

### Appendix J: AI Pipeline Data Contracts and Events

The AI pipeline publishes and consumes events through the shared event bus. These events provide traceability, monitoring, and integration with analytics and admin dashboards. The core events are:

- `ai.generation.completed`: fired when content generation succeeds. Includes template ID, model version, latency, token usage, cost, quality score, and difficulty score.
- `ai.generation.failed`: fired after all retries are exhausted. Includes error category, template ID, and fallback applied.
- `ai.pool.replenished`: fired when the pool crosses a target threshold. Includes pool size by difficulty.
- `content.pool.low`: consumed event indicating depletion. Triggers batch generation.

Events follow the global event schema with metadata fields: event ID, timestamp, correlation ID, tenant ID, and source. The AI pipeline adds a `generation_id` that maps to the `ai.generation_log` table. This enables a complete chain from request to output to delivery in the gameplay session.

The pipeline also exposes internal state through a metrics endpoint. This includes active queue depth, average generation latency, and safety filter rejection rates. These metrics are critical for operational monitoring. The event data is stored for long-term analytics to correlate content performance with player learning outcomes.

For enterprise deployments, events are linked to compliance evidence. The system can produce a report showing all AI-generated content used in a campaign, including template versions and review approvals. This supports audit and regulatory requirements for training content provenance.

### Appendix K: Micro-Lesson Architecture and Spaced Repetition

The pipeline supports micro-lessons for enterprise remediation and for optional consumer coaching. Micro-lessons are short, focused interventions (30 to 90 seconds) that reinforce a single skill. They are not meant to replace the stealth learning core loop, but to complement it after a failure or when a user shows persistent weakness.

Micro-lessons are generated using a constrained template system. The templates draw from a knowledge base of pre-approved security guidance. The AI does not invent new advice; it rephrases and contextualizes existing content. This is a critical safety and compliance constraint because incorrect advice could undermine training effectiveness or expose the company to liability.

Each micro-lesson includes:

- A one-sentence recap of the mistake.
- A concise explanation of the indicator(s) missed.
- A reminder of the general rule (for example, "Always verify a sender through an out-of-band channel when authority and urgency are combined").
- A short practice prompt or reflective question.

Micro-lessons are scheduled using the spaced repetition engine described in the BRD (Section 11.2), which uses a modified Leitner system with SM-2 algorithm. Intervals range from 1 day (new concept) to 180 days (mastered). Review sessions are kept under 2 minutes each, delivered via multiple channels. When a user fails a phishing simulation, the system schedules a follow-up micro-lesson within 24 hours, then repeats at increasing intervals per the SM-2 algorithm if the user continues to struggle with the same concept. Interleaving of review topics is applied for improved discrimination between attack types. The pipeline tags each micro-lesson with a competency domain and a difficulty level, enabling the analytics module to track improvements over time.

The micro-lesson system is also localized. Because the lessons are short and formulaic, they are easier to translate while maintaining accuracy. They are tested with human reviewers in each locale to ensure cultural clarity without sacrificing the safety restrictions around real entities.

### Appendix L: Content Diversity and Bias Monitoring

To avoid repetitive patterns and unintended bias, the pipeline includes a diversity monitoring layer. This layer tracks the distribution of content across factions, attack types, and linguistic patterns. It ensures that the pipeline does not disproportionately associate certain factions with malicious behavior or certain roles with incompetence. Because the game is a narrative simulation, balance matters both for fairness and for player trust.

The diversity monitor operates on two axes. The first is quantitative distribution: it checks that legitimate and malicious emails are distributed across factions in line with narrative design goals and threat level ratios. The second is qualitative language analysis: it checks for repeated phrasing, consistent tone bias, or problematic stereotypes. When issues are detected, the system flags templates or content items for review.

Bias monitoring also applies to localization. Some cultural references may be inappropriate or unintentionally sensitive in certain regions. The localization review process includes checks for such issues, and any problematic phrases are corrected or removed. This is documented in the content changelog for transparency.

This monitoring is not purely automated. Human reviewers periodically review a random sample of generated content for tone and cultural balance. Their findings are fed back into prompt refinements and entity registry updates. This helps maintain a professional, ethical, and globally appropriate training experience.

---

### Appendix M: Evaluation Dataset and Benchmark Suite

The AI pipeline is continuously evaluated against a benchmark suite designed to simulate real gameplay conditions and detect regressions in quality or safety. The benchmark suite is composed of multiple datasets, each with a specific purpose. A baseline dataset contains curated examples of phishing and legitimate emails across all difficulty tiers. This baseline set is static and used for regression testing whenever prompt templates or models are updated. It ensures that core metrics such as difficulty classification accuracy and signal clarity do not drift over time.

A second dataset is the adversarial set, containing prompts and contexts designed to trigger unsafe outputs. This includes intentionally malformed context bundles, simulated prompt injection attempts, and edge cases such as extremely short or extremely long requests. The goal of the adversarial set is not to achieve realistic content but to confirm that safety filters and validation layers respond correctly. Items in this dataset are expected to be rejected; any acceptance is treated as a high-severity issue.

A third dataset focuses on localization. It contains translated and culturally adapted examples in at least ten high-priority languages during early phases, expanding to all 24 EU languages in later phases. The localization dataset tests not only grammatical correctness but also retention of attack indicators after translation. This is critical because subtle indicators can be lost or misrepresented during translation, reducing training effectiveness.

Benchmark evaluation is automated and run in CI for each prompt template change. The system outputs a report with pass/fail status and detailed metric distributions. If the report fails thresholds, the template change is blocked from release. The benchmark suite is versioned so that historical performance can be compared over time, enabling the team to identify whether models are improving or regressing.

In addition to automated benchmarks, the evaluation framework includes a human review panel that assesses a rotating sample of generated items. The panel scores realism, pedagogical clarity, and narrative fit using a standardized rubric. The results are tracked over time and correlated with in-game outcomes. Items that score poorly or lead to negative player outcomes are flagged for prompt adjustments.

### Appendix N: Multi-Channel Simulation Content Guidelines

Enterprise phishing simulations require multiple channels beyond email, including SMS, QR codes, and voice. The AI pipeline supports these channels by generating channel-specific content with tailored constraints. SMS content is short, high-urgency, and constrained to a narrow character limit. It must avoid any real phone numbers or URL shorteners that could look real. Instead, it uses reserved domains and in-world references. QR simulations do not include real QR images; they include a placeholder token and a safe label that the UI renders as a simulated QR code. Voice simulations use text that is later converted to synthetic audio, with specific attention to natural cadence and scripted pacing.

Each channel has its own schema and validation rules. SMS messages have strict length limits and cannot include attachments. QR messages must include a description field that explains what the QR would allegedly do. Voice scripts must avoid real company names and must include a clear separation of speaker identity and content so that voice conversion can be performed safely. The pipeline ensures that these channels remain consistent with the same attack types and difficulty tiers used in email generation. This consistency is essential for analytics and reporting, enabling cross-channel comparisons of detection rates.

Multi-channel content also uses additional context signals. For example, SMS phishing often includes a pretext that references a recent event, while voice phishing may exploit authority bias. The pipeline maintains a library of channel-specific pretext patterns that align with the BRD's pedagogical goals. These patterns are reviewed by security experts and are kept within safe boundaries.

### Appendix O: Enterprise Policy Profiles and Content Governance

Enterprise customers require governance controls that go beyond consumer gameplay. The AI pipeline supports policy profiles that define how content is generated, reviewed, and retained for a tenant. A policy profile includes content type permissions, review requirements, localization rules, and retention settings. It also defines the maximum allowed personalization delta to ensure compliance reporting remains consistent across the organization.

Policy profiles are applied at generation time. For example, a regulated healthcare tenant may require all AI-generated content to be reviewed before use, while an SMB tenant may allow auto-approval for low-risk content. Policy profiles also control which attack types are permissible in simulations. An organization may choose to exclude certain scenarios if they are deemed too sensitive or if they conflict with internal policies.

Governance settings include a review workflow configuration. The workflow defines reviewer roles, required approvals, and escalation rules if reviews are delayed. All review actions are logged in the audit trail. If a content item is used in a campaign, the pipeline records which policy profile governed its generation. This supports audit and compliance evidence.

Retention policies are aligned to regulatory requirements. The pipeline ensures that content items and associated logs are retained for the longest applicable period. It also supports anonymization or deletion when retention periods expire. This is especially important for enterprise training records, which may be subject to GDPR or other privacy laws.

Policy profiles are versioned and changes require explicit approval. When a profile changes, the pipeline records the effective date and ensures that new content uses the updated policy while existing content retains its original governance metadata. This preserves audit integrity and prevents retroactive changes to training evidence.

---

**End of Document**
