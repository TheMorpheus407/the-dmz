# 02 -- Email and Document System Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-02
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Game Design and Content Systems
**Authors:** Systems Design and Content Engineering Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Non-Goals](#2-scope-and-non-goals)
3. [Inputs and Dependencies](#3-inputs-and-dependencies)
4. [Design Principles](#4-design-principles)
5. [System Overview](#5-system-overview)
6. [Email System](#6-email-system)
7. [Document System](#7-document-system)
8. [AI and Content Generation Pipeline](#8-ai-and-content-generation-pipeline)
9. [Narrative and Faction Integration](#9-narrative-and-faction-integration)
10. [Enterprise Mode and Compliance Alignment](#10-enterprise-mode-and-compliance-alignment)
11. [Data Model and API Contracts](#11-data-model-and-api-contracts)
12. [Telemetry and Learning Analytics](#12-telemetry-and-learning-analytics)
13. [Accessibility and UX Requirements](#13-accessibility-and-ux-requirements)
14. [Localization and Cultural Adaptation](#14-localization-and-cultural-adaptation)
15. [Security, Safety, and Privacy](#15-security-safety-and-privacy)
16. [Performance and Scalability](#16-performance-and-scalability)
17. [Testing and Validation Strategy](#17-testing-and-validation-strategy)
18. [Content Operations Workflow](#18-content-operations-workflow)
19. [Risks and Mitigations](#19-risks-and-mitigations)
20. [Open Questions and Decision Log](#20-open-questions-and-decision-log)
21. [Appendix A: Email Field Dictionary](#appendix-a-email-field-dictionary)
22. [Appendix B: Indicator Catalog](#appendix-b-indicator-catalog)
23. [Appendix C: Example Email JSON](#appendix-c-example-email-json)
24. [Appendix D: Document Template Skeletons](#appendix-d-document-template-skeletons)
25. [Appendix E: Glossary](#appendix-e-glossary)

---

## 1. Executive Summary

The Email and Document System is the heart of The DMZ: Archive Gate. It is the primary interface through which players learn phishing detection, identity verification, risk assessment, and incident response. Every access decision begins with an incoming email, and every meaningful verification step is mediated by one of the thirteen in game documents. This system must therefore be realistic enough to teach real behavior, but safe enough to avoid creating actionable malicious content or real world risk.

This design document defines the full lifecycle of emails and documents, from generation and storage to rendering, decision logic, and analytics. It specifies how emails are constructed from templates and AI generated content, how documents are linked to emails, how verification packets are produced, and how indicators are planted for player discovery. It also specifies the controls and guardrails that ensure determinism, accessibility, privacy, and regulatory alignment.

The system supports both consumer and enterprise deployments from a single codebase. In consumer mode, it powers the stealth learning loop and narrative progression. In enterprise mode, it aligns with phishing simulation requirements, SCORM and xAPI reporting, and compliance evidence generation. The design integrates directly with the game state machine (DD-01), the Threat Engine (DD-05), the terminal UI system (DD-07), and the backend architecture (DD-09). Its success is measured by engagement and measurable behavior change, not by the volume of content or completion checkboxes.

---

## 2. Scope and Non-Goals

**In scope**

- Email Access Request content model, lifecycle, and decision workflow.
- The full set of in game documents and their use in verification, assessment, and incident response.
- Content generation pipeline, including AI generation, pre generation pools, validation, and quality scoring.
- Document rendering behavior, annotation, and comparison tools as needed for email triage and verification.
- Deterministic content selection and replay compatibility for enterprise audit requirements.
- Localization and cultural adaptation strategy for email and document content.
- Telemetry and learning analytics emitted by email and document interactions.
- Safety guardrails to prevent real world harm from generated content.

**Out of scope**

- Full narrative scripting and season content pacing, which are owned by Narrative Design.
- Detailed Threat Engine logic beyond the points where email content is used for attacks or intelligence.
- Complete UI component specification and visual design beyond the document viewer and interaction constraints.
- Backend infrastructure details that are already defined in DD-09.
- Multiplayer specific variations of email or document workflows beyond extensibility notes.

---

## 3. Inputs and Dependencies

The Email and Document System is defined by the following source documents and requirements.

- BRD-DMZ-2026-001, especially Sections 5, 6, 11, and Appendix D.
- DD-01 Game Core Loop and State Machine, for phase ordering and determinism.
- DD-05 Threat Engine and Breach Mechanics, for threat tier integration and incident hooks.
- DD-07 UI and Terminal Aesthetic, for document readability, CRT overlays, and accessibility.
- DD-09 Backend Architecture and API, for the content module boundaries and event sourcing.

Key dependency assumptions derived from those documents.

- All email and document interactions are logged as events in the event sourcing system.
- The AI content pipeline uses a primary external provider with a self hosted fallback, and pre generates content into a pool.
- Threat tier and narrative progression determine the composition of the daily email queue.
- The UI uses a terminal aesthetic but must remain fully accessible when CRT effects are disabled.
- Enterprise mode requires audit ready evidence and deterministic replay of training content.

---

## 4. Design Principles

1. Stealth learning is the primary objective. Emails and documents must feel like narrative artifacts first and training content second.
2. Realism without risk. Content must reflect authentic security cues while avoiding real world malicious payloads or real brand impersonation.
3. Determinism and auditability. Given the same seed and action log, content selection and outcomes must be reproducible.
4. Player agency with bounded ambiguity. No single decision is always correct, but evidence must support the possibility of a correct choice.
5. Accessibility is mandatory. The system must support screen readers, keyboard only use, and no per email timers.
6. Localization is a first class feature. Emails and documents must be culturally adapted and not just translated.
7. Systems integration is non optional. Email content must integrate with threat simulation, analytics, and enterprise reporting.
8. Progressive complexity. Difficulty increases through narrative and threat levels, not through hidden stats alone.

---

## 5. System Overview

The Email and Document System is a content pipeline and runtime subsystem with three layers.

- Content authoring and generation. A mix of handcrafted templates, AI generated content, and curated variants.
- Content storage and selection. A versioned library and a pre generated email pool with metadata for difficulty, faction, and threat level.
- Runtime presentation and interaction. The inbox, email viewer, document viewer, verification packet flow, and decision resolution.

At runtime, the system provides a deterministic set of emails per day. Each email contains metadata, headers, body content, attachments, and a link to one or more documents. The player examines the email, opens documents, marks indicators, and decides an action. The system evaluates the decision, updates game state, and records telemetry. The Threat Engine consumes decision outcomes to adjust attack strategies, and the analytics system aggregates behavior data for learning outcomes.

High level flow.

1. Day start triggers inbox generation with deterministic seed.
2. Email queue is assembled using content pool, difficulty, and faction constraints.
3. Player interacts with emails and documents, marking indicators and requesting verification.
4. Decisions are resolved into consequences and events.
5. Threat Engine consumes the day outcomes to schedule attacks and incidents.

This flow maps directly to the state machine in DD-01 and to the email triage loop in the BRD.

---

## 6. Email System

### 6.1 Role of Email in the Core Loop

Email is the primary input to the core loop. Every day begins by generating a queue of Email Access Requests. Each request is an artifact that combines narrative context with security learning content. The email system is not only a narrative delivery vehicle but also a structured learning engine. It must teach players how to evaluate sender authenticity, detect social engineering, and apply zero trust decisions.

The email system is also the primary control surface for difficulty. By varying the sophistication of the emails, the system adjusts how hard it is to distinguish legitimate requests from threats. This avoids artificial difficulty sliders and embeds escalation inside the story.

### 6.2 Email Lifecycle in the Day Cycle

The email lifecycle is bound to the day phases defined in DD-01.

- INBOX_INTAKE: The content system selects and orders a deterministic queue. Each email receives metadata for urgency, faction, and verification requirements.
- EMAIL_TRIAGE: The player opens and inspects emails, marks indicators, and may request verification.
- VERIFICATION_REVIEW: The player opens associated documents and cross references claims.
- DECISION_RESOLUTION: The decision is validated, scored, and recorded.
- CONSEQUENCE_APPLICATION: Funds, trust score, faction relations, and threat posture are updated.

At every phase transition, the email state is updated and an event is emitted. The system must prevent skipping and ensure that deferred emails carry forward with explicit penalties.

### 6.3 Email Taxonomy and Categories

Emails are categorized by intent and by security technique. The taxonomy supports analytics, adaptive difficulty, and enterprise reporting.

Intent categories.

- Legitimate access requests. These are operational emails from real factions or clients with true needs.
- Malicious access requests. These are phishing, credential harvesting, or malware delivery attempts.
- Ambiguous requests. These are intentionally mixed signals to force risk based judgment rather than pattern matching.

Technique categories aligned to BRD requirements.

- Phishing.
- Spear phishing.
- Business email compromise.
- Credential harvesting.
- Malware delivery.
- Pretexting and authority impersonation.
- Supply chain compromise.
- Insider threat signals.

Every email is tagged with a primary technique and may include secondary techniques. Analytics treats primary technique as the target skill, while secondary techniques support variant detection and indicator placement.

### 6.4 Difficulty Tiers and Content Calibration

Email difficulty is defined on a 1 to 5 scale as in the BRD. Difficulty is determined by the number and subtlety of indicators, the plausibility of the request, and the consistency of attached documents.

Difficulty calibration rules.

- Difficulty 1. Obvious red flags, mismatched sender, broken language, unrealistic urgency.
- Difficulty 2. Plausible sender with one or two clear errors, simple spoofing cues.
- Difficulty 3. Mostly consistent content, subtle anomalies in headers or documents.
- Difficulty 4. High realism with only advanced cues, such as domain look alike or timing mismatches.
- Difficulty 5. Near perfect phishing with ambiguities, minimal indicators, and high narrative stakes.

Difficulty is not purely adversarial. Legitimate emails at higher difficulty must also be plausible but can include benign anomalies to train against false positives. This aligns with the BRD requirement that no decision is always correct.

### 6.5 Email Data Model Overview

An Email Access Request is a structured object with content and metadata. The runtime representation is a JSON object stored in the content system and referenced in the game state. Each email includes both player visible fields and system fields for evaluation.

Core fields.

- emailId, tenantId, sessionId, dayNumber, and deterministic seed.
- sender profile including display name, email address, domain registry entry, and faction.
- header metadata such as SPF, DKIM, and DMARC results, return path, and message id.
- body content including subject, preview, full body, and embedded link data.
- structured access request block including applicant profile, assets at risk, and requested services.
- attachments list with references to document objects.
- classification tags for difficulty, intent, and technique.
- indicator map defining the planted indicators and their weights.
- indicator ground truth and action trade off profile used for risk based scoring.

The object is designed to be stable and serializable for event sourcing and replay.

### 6.6 Sender Identity and Domain Registry

The domain registry is a canonical list of in world domains. It includes legitimate domains for each faction and clients, as well as common attacker look alike variants. The registry ensures consistency across emails and documents and supports deterministic generation of look alike domains.

Domain registry features.

- Canonical domain per faction and per client organization.
- Authorized subdomains used for legitimate communication.
- Look alike variants generated with homographs, typos, and altered TLDs that remain non real.
- Domain reputation score used as an indicator for both legitimate and malicious cases.
- A safe TLD list, using reserved or invalid TLDs such as .invalid to prevent real world action.

Sender profiles are built from the registry. A sender profile includes a display name, job role, organization, and relationship history. The profile is reused across emails to support narrative continuity and to create realistic sender patterns.

### 6.7 Header Simulation and Authentication Results

Email header analysis is a core learning objective. The system generates realistic but safe header fields to train SPF, DKIM, and DMARC interpretation.

Header simulation rules.

- All headers are synthetic but adhere to RFC formatting to support realistic parsing.
- SPF, DKIM, and DMARC results can be PASS, FAIL, SOFTFAIL, or NONE.
- Legitimate emails generally pass all checks but can include benign anomalies to avoid training that all failures are malicious.
- Malicious emails use plausible but inconsistent combinations such as DKIM pass with DMARC fail, or SPF pass from a look alike domain.
- Message ID and Received headers include realistic routing chains without actual real world domains.

The UI exposes simplified header views by default and a full header view for advanced analysis. This aligns with the progressive complexity strategy.

### 6.8 URL System and Safe Link Rendering

URLs are among the most common phishing indicators. The system must provide realistic link structures while preventing actual navigation to the public internet.

URL rules.

- All links are synthetic and routed through an internal sandboxed domain.
- Display text can differ from actual target to teach mismatch detection.
- Unicode and punycode look alike variants are supported, but are rendered safely and never resolve outside the sandbox.
- Hover preview shows the canonical target domain.
- Link clicks open an in game preview panel, not a browser window.

The link system supports detection indicators such as shortened URLs, mixed domain endings, and suspicious path structures.

### 6.9 Attachment System and Safe Files

Attachments represent the primary connection between emails and documents. The system supports safe, non executable file types such as PDF like documents, text summaries, and images of scanned signatures.

Attachment rules.

- No executable files and no real macros.
- Attachments are rendered as document objects, not raw files.
- Attachments include metadata such as file name, file type, size, and hash.
- Hashes are synthetic but consistent within a document lifecycle to support chain of custody logic.

Attachment metadata is used by players for indicator detection, such as unusual file types or mismatched file names.

### 6.10 Indicator System and Evidence Model

The indicator system defines the evidence players can discover in emails and documents. Indicators are deterministic and are stored in the email object. Each indicator has a type, severity, and explanation. Some indicators are visible in the email body, while others are hidden in headers or documents.

Indicator types include, but are not limited to.

- Domain mismatch and sender display name mismatch.
- Suspicious link and URL mismatch.
- Urgency cues and authority claims.
- Grammar anomalies and tone mismatch.
- Attachment mismatch and suspicious file type.
- Inconsistent dates, signatures, or organization details.

Indicator placement must support training objectives and avoid over reliance on any single cue. Difficulty is controlled by the number, clarity, and combination of indicators.

### 6.11 Verification Requests and Packet Assembly

When the player requests additional verification, the system assembles a verification packet. This packet is a bundle of documents selected to either confirm or cast doubt on the request. The packet may include a mix of legitimate documents and anomalies to simulate real world ambiguity.

Verification packet rules.

- Each packet includes at least two documents, and no more than five, to avoid overwhelming the player.
- The documents are selected to cover identity, ownership, and chain of custody claims.
- Verification packets can include a supporting intelligence brief when narrative requires it.
- Packets are deterministic and reproducible, stored in the event log with references to the document IDs.

Verification packets are central to the zero trust learning loop and should be used frequently, but not required for every email.

### 6.12 Decision Outcomes and Consequence Hooks

Email decisions produce both immediate and delayed consequences. The immediate consequences include changes to all three in-game currencies -- Credits (CR) for operational funds, Trust Score (TS, range 0-500+) for reputation gating, and Intel Fragments (IF) for investigation rewards -- as well as faction reputation changes. Delayed consequences are handled by the Threat Engine and narrative system.

Decision outcome rules.

- Every decision is evaluated against a trade off model. Multiple actions can be reasonable depending on evidence, risk appetite, and operational constraints.
- False positives reduce trust and can harm faction relationships.
- False negatives increase threat posture and can trigger attacks or breaches.
- Delayed consequences manifest as "Echoes" 1-3 chapters later per BRD FR-GAME-006 and Section 11.3, handled by the narrative and Threat Engine systems.
- Flag for review delays the decision and introduces queue penalties.
- Request verification adds time cost but can reduce uncertainty and improve accuracy.

The outcome evaluation produces a feedback packet containing indicator explanations and optional educational notes. Feedback must be concise and must not reveal ground truth before the decision is finalized.

### 6.13 Email Pool Management

Email content is pre generated into pools by difficulty and category. Pools are stored in Redis for fast access and are refreshed during off peak hours. The pool management system ensures there are always enough emails for deterministic queue generation.

Pool management rules.

- Minimum total pool size is 200 emails across all difficulty tiers, per BRD (FR-GAME-004), with a target of 20-50 emails per individual difficulty tier in the queue system.
- The pool is rebalanced daily to maintain target distributions per threat tier.
- Duplicate detection prevents near identical emails from appearing in the same session.
- Seasonal content is tagged and can be weighted to appear during seasonal narrative arcs.

The pool system supports offline mode by maintaining a local cache of a subset of emails.

### 6.14 Offline and Degraded Mode Behavior

The system must work when AI generation is unavailable or the user is offline. Offline mode uses a fixed set of handcrafted emails and documents stored in the client cache.

Offline rules.

- Minimum offline set includes 50 emails across difficulty tiers and at least one example of each document type.
- Offline emails are tagged to avoid narrative conflicts and avoid reliance on dynamic threat states.
- When connectivity returns, the system syncs events and restores the normal pool.

### 6.15 Email System Extensibility

The email system is designed to expand with new factions, new document types, and new training objectives without breaking existing content. Each email template is versioned and includes compatibility metadata. The content system supports migration scripts to update old templates while preserving event replay.

### 6.16 Daily Queue Assembly Algorithm

The daily inbox is assembled by a deterministic algorithm that balances narrative variety, training objectives, and threat pressure. The algorithm must produce the same queue for the same seed, day number, and session settings. This is required for enterprise auditability and for cross device replay.

Queue assembly steps.

1. Compute target counts for legitimate, malicious, and ambiguous emails using threat tier and the minimum legitimate ratios defined in DD-01.
2. Build candidate pools by filtering the email pool by locale, season, difficulty range, and enterprise policy.
3. Apply narrative weights so that active factions are more likely to appear.
4. Sample without replacement using a seeded RNG to avoid duplicates.
5. Apply ordering rules that push high urgency items toward the top while still allowing the player to choose any order.

The algorithm uses constraint validation after sampling. If a constraint fails, such as a missing faction mix or a difficulty imbalance, the queue is rebuilt with adjusted weights. This rebuild is still deterministic because it uses the same seed and a fixed retry sequence.

Example pseudo code.

```
seed = hash(sessionSeed, dayNumber, locale)
rng = seededRng(seed)
targets = computeTargets(threatTier)
candidates = filterPool(pool, locale, season, enterpriseFlags)
queue = []
queue += sample(candidates.legit, targets.legit, rng)
queue += sample(candidates.malicious, targets.malicious, rng)
queue += sample(candidates.ambiguous, targets.ambiguous, rng)
queue = applyFactionWeights(queue, narrativeState, rng)
queue = orderByUrgency(queue, rng)
assertConstraints(queue)
```

The algorithm treats the email pool as a source of reusable content, but it enforces a short term uniqueness window so the player does not see the same template too frequently. The uniqueness window defaults to 14 game days for consumer mode and 30 days for enterprise mode.

The queue assembly also integrates with the spaced repetition system defined in BRD Section 11.2. A modified Leitner system with SM-2 algorithm schedules review of technique categories at intervals from 1 day (new concept) to 180 days (mastered). The queue can include review emails that revisit previously weak skill areas, with review sessions targeted at under 2 minutes. Interleaving of review topics improves discrimination per BRD learning theory requirements.

### 6.17 Email Aging, Deferral, and Queue Pressure

Queue pressure is the primary pacing tool and replaces per email timers. Each email has an age counter that increments when carried into the next day. Age affects urgency and can trigger consequences if the email expires. This behavior mirrors real operational backlog pressure.

Aging rules align to DD-01.

- Age 0, normal priority.
- Age 1, urgency increases by one tier.
- Age 2, marked overdue and applies a trust score penalty if still unresolved.
- Age 3, email expires, revenue is lost, and a faction relation penalty is applied.

Deferrals are explicit actions. A player may defer an email during triage. Deferrals are tracked separately from unread emails so analytics can distinguish avoidance from backlog. Deferring high urgency items imposes additional penalties and may trigger narrative reactions.

### 6.18 Evidence Surfacing and Progressive Disclosure

The system uses progressive disclosure to avoid overwhelming new players. By default, the email viewer shows the subject, sender, body, and attachments. Advanced headers and link previews are available but not forced.

Evidence surfacing rules.

- Header details are collapsed by default and require a deliberate expand action.
- Link previews are shown on hover or focus to encourage cautious inspection.
- Attachment metadata is shown inline with file name, type, and size.
- Indicator hints appear only after a minimum time threshold and are disabled in competitive modes.

This approach teaches correct behavior without demanding expert level analysis on day one. The adaptive learning engine adjusts content selection, ordering, and difficulty per learner in real-time per BRD Section 11.6, maintaining a competency model across the seven domains defined in FR-AN-004. The engine can expose more evidence channels as player skill increases and set minimum competency thresholds that trigger mandatory remediation in enterprise mode.

### 6.19 Feedback, Scoring, and Anti Guessing

Decision feedback is multi layered. Immediate feedback reflects operational consequences. Educational feedback is delivered after the decision and is brief. It should not overwhelm or penalize players for experimentation.

Scoring rules.

- Correct decisions grant trust and resources but at varying levels depending on risk.
- False positives reduce trust more than they reduce funds to reflect reputational harm.
- False negatives increase threat posture and may trigger follow up attacks.
- Partial credit is possible when the player marks correct indicators but chooses a higher risk action.

Anti guessing logic detects rapid decision patterns and unusual accuracy spikes. When detected, the system increases verification requirements and reduces reward multipliers to discourage random clicking. This is recorded in analytics but is not shown as punitive feedback.

### 6.20 Email UI Field Layout and Interaction Contract

The email viewer is structured to match the terminal UI layout in DD-07. The left panel lists emails with urgency markers. The center panel shows the email body and attachments. The right panel shows the threat tier, faction badge, and key metadata.

Interaction requirements.

- Every field must be keyboard focusable with visible focus state.
- Email list supports quick navigation via arrow keys and type ahead.
- The action bar provides Approve, Deny, Flag, and Request Verification.
- The header panel includes a toggle for full header view.

The UI should emphasize the diegetic feel. For example, the header panel is labeled as a system diagnostic view and uses a monospaced font even when the email body uses proportional text.

### 6.21 Edge Cases and Error Handling

The email system must be robust to missing or inconsistent content. The player should never be blocked by a rendering error.

Edge case handling rules.

- Missing attachment references are displayed as corrupted files with a narrative explanation.
- Email content that fails validation is replaced with a fallback template and logged.
- Duplicate emails in a queue are prevented by the sampling algorithm, but if detected, they are merged into a single queue entry with a warning.
- Expired emails are moved to an archive panel rather than removed, preserving auditability.

Every error condition emits an event so that content ops can investigate and adjust templates or generation prompts.

### 6.22 Anti Abuse Controls for Enterprise Mode

Enterprise deployments require stricter controls to prevent content misuse. The system supports optional restrictions that do not break accessibility.

Controls include.

- Disable copy to clipboard for email bodies unless accessibility mode is enabled.
- Watermark email content with tenant and session metadata in the rendering layer.
- Rate limit content export APIs and restrict to admin roles.
- Redact AI prompts and generation parameters from admin UI logs.

These controls protect the enterprise customer while preserving the core learning experience.

---

## 7. Document System

### 7.1 Role of Documents in the Game

Documents are the second pillar of the stealth learning loop. They are the evidence that players use to verify identity, assess risk, and respond to incidents. Documents must look like real world artifacts but remain purely synthetic. They must also support the diegetic UI principle by appearing as outputs of a terminal document renderer, not as a modern web page.

The document system is more than a set of static templates. It is a dynamic generator of evidence, inconsistency, and ambiguity. The player is trained to cross reference information across documents, compare signatures, inspect dates, and detect mismatched metadata. These behaviors mirror real security workflows.

### 7.2 Canonical Document Types

The system includes thirteen documents, each mapped to a specific security skill. These are authoritative across both consumer and enterprise modes.

| Document Type | Purpose | Primary Skill | Key Signals |
| --- | --- | --- | --- |
| Email Access Request | Primary request narrative | Phishing detection | Sender identity, tone, urgency |
| Phishing Analysis Worksheet | Player annotation space | Structured analysis | Indicator marking, reasoning |
| Verification Packet | Identity evidence bundle | Identity verification | Consistency and authenticity |
| Threat Assessment Sheet | Risk scoring and intel | Risk assessment | Threat tier, indicator summary |
| Incident Log | Timeline of events | Incident response | Sequence and containment |
| Data Salvage Contract | Terms and liabilities | Governance and legal | SLA, liability clauses |
| Storage Lease Agreement | Capacity and term | Operations planning | Capacity, renewal, limits |
| Upgrade Proposal | Tool and infra options | Security architecture | Cost, benefits, risk |
| Blacklist Notice | Access denial policy | Access control | Rationale, signatures |
| Whitelist Exception | Emergency access | Exception handling | Justification, approvals |
| Facility Status Report | Infra telemetry | Monitoring | Power, cooling, utilization |
| Intelligence Brief | Threat intel | Threat intelligence | Campaign indicators |
| Ransom Note | Breach response | Incident response | Deadline, demand |

The Email Access Request is both an email and a document artifact; it is represented in both systems. The other twelve are generated and rendered via the document system.

### 7.3 Document Template Architecture

Each document type is defined by a template with a structured data schema. Templates are stored as HTML fragments with layout rules and token placeholders. The data schema is a JSON object with required fields and optional variants. The rendering engine binds data into the template and produces a final document view.

Template design rules.

- Templates must be stable and versioned to support deterministic replay.
- Each field has a type, validation rules, and localization keys.
- Layout uses the document font defined in DD-07 for readability.
- CRT effects are applied as an overlay and never distort text.
- Templates must support accessibility labels for all fields.

### 7.4 Document Metadata and Trust Signals

Every document includes metadata that supports verification. Metadata is surfaced partially to the player and used in scoring.

Metadata fields.

- Document ID, version, and creation timestamp.
- Issuer and signer identity, with role and organization.
- Signature block with a synthetic signature image or typed signature.
- Document hash and chain of custody reference where appropriate.
- Classification and sensitivity label.
- Expiration date or effective period if applicable.

Trust signals are not binary. A legitimate document may have a minor anomaly such as a formatting inconsistency, while a malicious document may include mostly correct metadata with a single subtle inconsistency. This supports the ambiguity requirement.

### 7.5 Document Rendering and Viewer Behavior

The document viewer is a critical UI component. It must support deep inspection without cognitive overload.

Viewer features.

- Zoom and pan with keyboard and mouse controls.
- Section highlighting to show related fields when cross referencing.
- Side by side comparison of two documents.
- Toggle to show metadata panel with hashes and signature details.
- Search within a document for key terms.
- Annotation layer for player notes and indicator marking.

The viewer must be fully functional without CRT overlays and must be compatible with screen readers. All annotations are stored as events and may be used for analytics.

### 7.6 Document Annotation and the Phishing Worksheet

The Phishing Analysis Worksheet is a special document that captures player reasoning. It is both a gameplay artifact and a training data source. The worksheet includes fields for detected indicators, risk rating, and reasoning notes.

Worksheet rules.

- The worksheet is optional but provides small rewards for completion.
- It supports quick tagging with a fixed indicator catalog.
- It is stored as structured data for analytics.
- It never penalizes the player directly for incorrect notes, to avoid discouraging reflection.

Annotations on other documents are lighter weight and are used primarily for analytics and player memory.

### 7.7 Cross Reference and Consistency System

A core learning objective is to cross reference information across documents. The system supports this by maintaining consistency rules between related documents.

Consistency rules.

- Sender identity must match verification packet claims and contract signatory.
- Dates must align across emails, contracts, and intelligence briefs.
- Facility status metrics must match resource state at the time of generation.
- Threat assessment sheet must align with threat tier and known indicators.

When the system injects anomalies, it chooses which rules to break based on difficulty and narrative context. These anomalies become indicators that the player can detect.

### 7.8 Document Anomaly Injection

Documents can include anomalies to indicate risk or deception. The anomaly system uses a library of patterns.

Anomaly patterns.

- Signature mismatches or missing signatures.
- Incorrect organization seals or letterhead.
- Date format inconsistencies or impossible timestamps.
- Numerical values that contradict other documents.
- Missing attachments referenced by the text.
- Hash values that do not match the referenced file.

Anomalies are always synthetic and are never tied to real world entities. The system ensures anomalies are plausible and meaningful, not arbitrary typos.

### 7.9 Document Lifecycle and Versioning

Documents are versioned assets. When a template changes, the system creates a new version and preserves older versions for replay.

Versioning rules.

- Document templates are immutable once used in a live session.
- A template update creates a new version and a migration mapping if fields change.
- All document instances store the template version ID used to generate them.

This ensures that enterprise audit replay produces the original document exactly as seen by the learner.

### 7.10 Document Storage and Caching

Document instances are stored in the content system and referenced by email objects. Large documents are cached on the client after first view to reduce load time. The cache respects data residency and privacy rules.

Caching rules.

- Document data stored in the client cache is encrypted at rest.
- Cache size is capped and managed by LRU eviction.
- Cached documents are scoped to the session and deleted on logout in enterprise mode.

### 7.11 Document System Extensibility

The document system supports new document types and variations. New types must include a schema, template, indicator mapping, and learning objective. The pipeline supports experimental document types in A B testing but requires explicit tagging to prevent leakage into compliance reporting.

### 7.12 Document Layout Specifications

Document layout is standardized to support quick scanning and consistent training. Each document has a clear header, body, and footer region. The header includes the issuing organization, document type, and classification. The body presents the core content in a readable proportional font. The footer includes signature blocks and hash references when applicable.

Layout rules.

- Headers use the terminal font and uppercase styling for strong visual separation.
- Body text uses the document font with generous line height for readability.
- Tables must have visible borders and labeled headers for screen readers.
- The footer includes a document ID and page number when multi page.

Documents are rendered as HTML in the client but are visually styled to resemble scanned paper or thermal printouts within the terminal aesthetic defined in BRD Section 11.5: monospaced primary font, dark background (#0a0e14), phosphor green (#33ff33) or amber (#ffb000) text, with CRT effects as CSS overlays on a clean accessible base. This preserves the Papers, Please aesthetic without sacrificing accessibility.

### 7.13 Document Comparison and Cross Link Tools

Cross referencing is a core skill. The viewer supports explicit comparison to reduce cognitive load without solving the puzzle. Comparison mode allows two documents to be displayed side by side with synchronized scrolling.

Comparison features.

- Pin a field in one document and highlight the corresponding field in the other.
- Highlight numerical mismatches such as dates, amounts, or IDs.
- Provide a manual compare toggle instead of automatic mismatch detection in normal mode.

In advanced training modes, the system can enable automatic diff highlights for use in enterprise remediation modules. This is opt in and should not be enabled in default consumer mode.

### 7.14 Signature, Seal, and Chain of Custody System

Authenticity signals are primarily communicated through signatures, seals, and custody lines. The system maintains a library of synthetic signatures per faction and per role. Seals are stylized icons with consistent typography and patterning. Both are generated from templates to ensure consistency.

Chain of custody lines include a series of hand offs with timestamps and pseudo hash values. These lines are used to teach verification of data provenance. The values are synthetic but internally consistent. When the system wants to introduce an anomaly, it may insert a missing hand off or a mismatch between a stated hash and the attachment hash.

### 7.15 Document Accessibility and Text Extraction

Every document must be fully readable by screen readers. This requires a structured semantic representation separate from the visual layout. The system generates a linearized text version that preserves headings, tables, and field labels.

Accessibility rules.

- Images such as signatures and seals include descriptive alt text that indicates their presence but does not reveal authenticity.
- Tables are rendered with proper thead and tbody semantics.
- Document fields are labeled using aria descriptors that match the visible label text.

The user can toggle an accessibility view that shows the linear text representation with all metadata fields visible. This ensures that non visual players can still perform verification tasks.

### 7.16 Document Error Handling and Degraded Mode

If a document fails to render due to missing data or template mismatch, the system falls back to a minimal text view. The fallback includes a warning banner and a narrative explanation such as "DOCUMENT CORRUPTED DURING TRANSFER". This maintains diegesis and avoids breaking the player experience.

All rendering failures emit events and are logged for investigation. The fallback is deterministic, so replay yields the same degraded view.

### 7.17 Document Security Classification and Redaction

Some documents are intentionally redacted to reflect real world data handling constraints. Redactions can be used to increase ambiguity and to teach that missing information is a risk factor.

Redaction rules.

- Redacted sections are explicitly marked and not simply removed.
- Redactions must be consistent across related documents when narrative requires it.
- Redaction is never used to hide mandatory information required for a correct decision.

Classification labels such as PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED are displayed in the header and align with the document sensitivity in analytics.

---

## 8. AI and Content Generation Pipeline

### 8.1 Content Sources

Content is generated from three sources.

- Handcrafted templates written by content designers and security SMEs.
- AI generated variants to increase volume and freshness.
- Community generated content in later phases, gated by review.

Handcrafted templates establish the baseline quality and are used for offline mode. AI generated content is used to scale and to personalize difficulty.

### 8.2 Prompting Strategy and Context Inputs

The AI pipeline uses the Anthropic Claude API as the primary provider (Sonnet for content generation, Haiku for classification and safety screening) with a self-hosted open-source fallback model (Mistral or Llama) for offline enterprise deployments. Prompt templates include faction voice, threat tier, and scenario context. Prompts are constrained by safety rules and structured output requirements.

Prompt inputs include.

- Faction identity, goals, and tone.
- Difficulty target and indicator count.
- Document references required by the scenario.
- Current season and narrative context.
- Locale and cultural adaptation parameters.

Outputs are required to follow a JSON schema to ensure validity. The parser rejects any content that violates schema or safety rules.

### 8.3 Safety Guardrails and Content Validation

The pipeline enforces strict guardrails to prevent generation of harmful or real world actionable content.

Guardrails include.

- No real company names, people, or domains.
- No real phone numbers, IP addresses, or executable payloads.
- No direct instructions for exploitation.
- All URLs must use reserved or invalid TLDs.

Validation includes automated checks for disallowed content, regex detection of PII, and a secondary classification step for risk scoring. Failing content is discarded and regenerated.

### 8.4 Quality Scoring and Difficulty Classification

Each AI generated email is scored for quality and classified into a difficulty tier. The scoring model considers grammar, realism, indicator clarity, and internal consistency. Emails that fall below a quality threshold are discarded.

Quality scoring must also avoid creating over polished phishing that teaches unrealistic expectations. A mix of realistic but slightly flawed emails is required across all difficulties.

### 8.5 Pre Generation Schedule and Pool Refill

AI generation runs during off peak windows. The system maintains a queue of generation tasks for each difficulty tier and category. The target total pool size is 200 or more emails across all difficulty tiers per BRD (FR-GAME-004), with 20-50 emails per individual tier in the queue system, plus an additional buffer for seasonal content.

Pool refill rules.

- If the total pool drops below 150 emails or any individual tier drops below 15, it triggers a refill batch.
- Refills are distributed across categories to maintain balance.
- Newly generated emails are quarantined until validation completes.

### 8.6 Human Review Cadence

A portion of AI generated content is reviewed by human SMEs each week. Review focuses on realism, safety, and educational value. Reviews also calibrate the scoring model and update prompt templates.

Human review rules.

- At least 5 percent of AI content per week is sampled for review.
- All content used in enterprise compliance modules undergoes review before release.
- Review feedback is recorded as metadata in the content system.

### 8.7 Content Diversity and Bias Control

Email content must be diverse and balanced. Because the game involves social engineering, it is easy to unintentionally reinforce stereotypes or bias. The system therefore includes a bias control layer in the content pipeline.

Bias control rules.

- Names, roles, and organizations are drawn from a global synthetic dataset with balanced representation.
- No single region or demographic is disproportionately associated with malicious intent.
- Legitimate and malicious emails appear across all factions and roles, avoiding a single group being framed as the default threat.
- Narrative context can justify hostile behavior, but the system never implies that any real world group is inherently untrustworthy.

The content review tool includes a bias checklist that reviewers must complete for new template sets. This ensures that content remains aligned with the vision of universal cybersecurity education.

### 8.8 Prompt Versioning and Regression Testing

Prompts are versioned artifacts. Each prompt template has a semantic version and a change log. The prompt version used to generate an email is stored in metadata to support replay and debugging.

Regression testing uses a golden set of prompts and expected outputs. For each prompt version, the system generates a small batch and compares structural features such as indicator count, difficulty classification, and schema compliance. This does not compare full text, but it does detect shifts in output quality or safety.

Prompt versioning rules.

- Prompt updates require a review and approval step.
- A new prompt version triggers a limited rollout to a small pool segment.
- If quality metrics drop below thresholds, the system automatically rolls back to the previous prompt version.

### 8.9 Model Fallback and Quality Normalization

The primary AI provider (Anthropic Claude API) is used for generation, with a self-hosted open-source model (Mistral or Llama) as fallback for offline enterprise deployments. The fallback model may produce different stylistic outputs. To prevent noticeable quality variance, the system applies a normalization pass that adjusts structure and phrasing to match the baseline style guidelines.

Fallback behavior rules.

- If the primary provider fails, generation is routed to the fallback without blocking gameplay.
- Fallback outputs are tagged and reviewed more aggressively during human review.
- When both providers are unavailable, the system uses the handcrafted pool.

This ensures that the content pipeline remains resilient while maintaining a consistent player experience.

---

## 9. Narrative and Faction Integration

The email and document system is the primary delivery mechanism for narrative. Five factions compete for access as defined in BRD Section 5.2: The Sovereign Compact (governments), Nexion Industries (corporations), The Librarians (academics and preservationists), hacktivist collectives, and criminal networks. Each faction has a consistent voice, vocabulary, and pattern of requests. Each has legitimate needs, understandable motivations, and the capacity for both cooperation and betrayal. The system must support continuity so that repeated interactions with the same faction feel coherent.

Faction integration rules.

- Each of the five factions has a tone profile that shapes subject lines, greetings, and urgency.
- Faction relationships influence the availability of certain document types.
- Seasonal arcs introduce new faction behaviors and new document variants. Season 1 focuses on Signal Loss (phishing and access control), Season 2 on Supply Lines (supply chain), Season 3 on Dark Channels (ransomware), and Season 4 on The Inside Job (insider threats), per BRD Section 11.3.
- Narrative milestones are reflected in email volume and request stakes.

The system should avoid hard gating content to prevent narrative collisions. Instead it uses weighted selection based on narrative progress and faction reputation.

---

## 10. Enterprise Mode and Compliance Alignment

Enterprise mode uses the same email and document system but with additional constraints for compliance and reporting.

Enterprise requirements.

- All emails used in phishing simulations must map to compliance frameworks and learning objectives.
- Decision outcomes must be traceable in audit logs.
- Content must be versioned and retained according to retention policies.
- Simulations must support multi channel delivery in future phases, but the email system remains the canonical model.

Enterprise mode also supports just-in-time (JIT) training delivery. Per BRD FR-ENT-019, targeted email and document training content must be deliverable within 60 seconds of a triggering event such as a phishing click, policy violation, or DLP alert. JIT training is throttled to a maximum of 2 interventions per week per learner per BRD FR-ENT-020, to avoid fatigue.

Enterprise mode also requires that learner performance data is handled with privacy safeguards. Individual results are visible to admins only when policy permits, otherwise aggregate metrics are used. Aggregate reporting is the default; no individual training performance is linked to HR decisions without explicit policy per BRD Section 9.3.

The document system supports compliance evidence by linking training transcripts to the exact content shown. This is achieved by storing the template version ID and the deterministic seed in the event log.

### 10.1 Phishing Simulation Parity and Multi Channel Readiness

Enterprise phishing simulations reuse the same email content model as the core game. This ensures that the learning objective and indicator mapping remain consistent across consumer and enterprise modes. The simulation engine can select from the same email pool but applies enterprise specific constraints such as department targeting and campaign scheduling.

Multi channel simulations are supported at the system design level even if initial releases focus on email. SMS, voice, and QR simulations use a derived template format that maps to the same indicator catalog. For example, a suspicious link indicator in email maps to a shortened URL indicator in SMS. This keeps analytics consistent across channels.

Simulation parity rules.

- A simulation email must be representable as a standard Email Access Request instance.
- Indicators must map to the same catalog used in the game.
- Simulation outcomes must generate the same event types as game outcomes with an additional simulation context field.
- When a learner fails a simulation (clicks a phishing link or approves a malicious request), a "teachable moment" landing page is displayed immediately per BRD FR-ENT-024, showing relevant indicators and educational content.
- Enterprise phishing simulations use dedicated sending infrastructure with per-customer IP isolation for the enterprise tier, and maintain full SPF, DKIM (2048-bit RSA minimum), and DMARC alignment per BRD FR-ENT-025 and FR-ENT-026.
- Email gateway allowlisting documentation and automation is provided for Proofpoint, Mimecast, and Microsoft Defender per BRD FR-ENT-027.

### 10.2 Learning Standards and Reporting Alignment

Enterprise customers require training records compatible with LMS standards. The email and document system emits xAPI statements for every learning relevant interaction. These statements map to verbs such as experienced, analyzed, and decided. The system also supports SCORM packaging by summarizing a completed day or session as a learning object. Additionally, the system supports cmi5 packaging as required by BRD Section 10.2, ensuring compatibility with the full set of mandatory learning standards (SCORM 1.2, SCORM 2004, xAPI, LTI 1.3 with Advantage, cmi5, and AICC HACP for legacy LMS compatibility).

Reporting rules.

- Every email decision generates an xAPI statement with verb "decided" and a result score.
- Opening a verification packet generates an xAPI statement with verb "analyzed".
- Completing a day generates a SCORM completion event with total time and accuracy metrics.

The system aggregates these statements into compliance reports aligned to frameworks such as PCI-DSS, NIS2, DORA, HIPAA, GDPR, SOX, ISO 27001, SOC 2, and FedRAMP per BRD FR-AN-013. Training completion generates certificates with digital signature, regulatory framework reference, and expiration date per BRD FR-ENT-033. Management training attestation reports are generated for NIS2 Article 20 and DORA Article 5 per BRD FR-ENT-034. This does not alter gameplay but ensures audit readiness.

### 10.3 Enterprise Customization and Policy Controls

Enterprise administrators can customize certain elements of the email and document system without breaking safety constraints. Customization is used to align training with organizational context while avoiding real world exploitation risks.

Customization rules.

- Administrators may adjust white-label branding elements including organization names, logos, colors, fonts, custom domains, and email templates within the synthetic domain registry, with changes propagating within 60 seconds per BRD FR-ENT-005.
- Administrators may define internal role labels to match real departments, but external company impersonation is blocked by default.
- Custom email templates are created via a visual editor with merge-tag support per BRD FR-ENT-023, must pass safety validation, and be reviewed before activation.
- Custom content is stored in a separate namespace and is never mixed into the consumer pool.

These controls provide flexibility while keeping the core safety guarantees intact.

---

## 11. Data Model and API Contracts

### 11.1 Content Module Ownership

The content module owns email templates, document templates, and generated instances. It exposes a narrow public interface to the game engine.

Key content tables.

- content.email_templates
- content.email_instances
- content.document_templates
- content.document_instances
- content.indicator_catalog
- content.email_pool

The game engine references content instances via IDs and stores them in the event log for replay.

### 11.2 Email Instance Schema

An email instance is a fully realized Email Access Request. It is stored in the content system and referenced in game events.

Key fields.

- email_id, template_id, template_version
- day_number, session_id, tenant_id
- sender_profile_id, faction_id
- subject, preview, body_html, body_text
- access_request_json (structured applicant_profile, assets_at_risk, requested_services)
- headers_json, url_list, attachment_ids
- difficulty, intent, technique tags
- indicator_map, indicator_truth_hash, action_tradeoff_profile_id

### 11.3 Document Instance Schema

Documents are stored similarly with template and data bindings.

Key fields.

- document_id, template_id, template_version
- email_id or packet_id association
- document_type, locale
- data_json with typed fields
- metadata_json with signature and hash info
- anomaly_tags and indicator_map

### 11.4 API Touchpoints

The email and document system is exposed to the game engine via content APIs defined in DD-09. Primary endpoints include.

- GET /content/emails for template management in admin mode.
- GET /content/documents/:type for template retrieval.
- POST /content/generate for AI content generation.
- GET /game/sessions/:id/inbox for current day emails.
- GET /game/sessions/:id/emails/:emailId for email detail.

The API envelope uses the standard { data, meta, error } response structure.

### 11.5 Event Emission

Every key interaction emits an event for analytics and enterprise audit.

Core events include.

- game.email.opened
- game.email.indicator_marked
- game.email.verification_requested
- game.email.decision_submitted
- game.email.decision_resolved
- game.document.opened
- game.document.annotation_added

Events include references to email_id, document_id, and indicator types. Events never include sensitive or personally identifiable data. All event logs are immutable and append-only with SHA-256 cryptographic integrity verification per BRD FR-ENT-030.

### 11.6 Indicator and Scoring Schema

Indicator objects are stored in a normalized structure to support consistent scoring and analytics. Each indicator is defined by a catalog entry and an instance record.

Indicator instance fields.

- indicator_id: UUID for the instance.
- catalog_type: string key from the indicator catalog.
- severity: low | medium | high.
- location: email_body | header | document | metadata.
- evidence_text: a short snippet for feedback, stored server side only.
- weight: numeric contribution to decision evaluation.

Scoring uses a weighted sum of indicators detected by the player. Each indicator has a base weight, and the weight can be adjusted by difficulty. The scoring engine also considers false positives, which are indicators the player marked but were not present. Action evaluation uses a trade off profile rather than a single expected action.

Scoring rules.

- If the player marks a correct indicator, they earn its weight.
- If the player marks an indicator that is not present, they incur a small penalty.
- If the player ignores a high severity indicator, they incur a larger penalty.

The final decision evaluation is computed by combining indicator scoring with an action trade off matrix that encodes risk and consequence weights. This allows partial credit for strong analysis even when the chosen action carries costs. The same model is used across consumer and enterprise modes to maintain consistent learning metrics.

### 11.7 Deterministic Seed and Snapshot Links

For auditability, the email and document system stores a deterministic seed reference for every generated instance. The seed is derived from session, day, and template version. This allows the system to reconstruct the original content without storing large blobs for every instance.

Seed rules.

- The seed is stored in the email instance metadata and in the event log.
- If a template changes, the seed still points to the original version, ensuring replay correctness.
- Snapshots are materialized every 50 events or at day boundaries per BRD Section 8.5, and include the list of email IDs and document IDs to avoid regeneration drift.

This approach minimizes storage while preserving deterministic playback in enterprise reviews.

### 11.8 Data Retention and Archival

Email and document instances are retained according to enterprise retention policies. The system supports configurable retention windows that match compliance requirements per BRD Section 9.4: HIPAA (6 years), SOX (7 years), FedRAMP/FISMA (3 years), DORA (5 years), ISO 27001 (3 years minimum), PCI-DSS (1 year minimum, logs 3 months hot and 12 months accessible), GLBA (5 years), and GDPR (purpose-limited, delete when no longer needed). The longest applicable period governs when frameworks overlap. When data is due for deletion, content instances are anonymized rather than hard deleted to preserve aggregate analytics.

Archival rules.

- After the retention window, email instances are scrubbed of body content and replaced with metadata only.
- Document instances are replaced with a hash and template reference.
- Event logs remain intact but no longer reference content bodies.

This allows the platform to maintain learning analytics without retaining sensitive training artifacts beyond the required period.

---

## 12. Telemetry and Learning Analytics

The email and document system provides the primary data for learning analytics. Metrics are computed from event logs and mapped to competency domains.

Key metrics.

- Decision accuracy by technique category.
- False positive and false negative rates by difficulty.
- Indicator detection rate and time to detect.
- Verification usage rate and its effect on accuracy.
- Document anomaly detection rate.
- Time spent per email and per document.

Analytics must support both consumer engagement metrics and enterprise compliance reporting. The system must also support A B testing of indicator placement and feedback styles without altering the core learning outcome mapping.

### 12.1 Competency Mapping and Skill Profiles

Each email and document interaction maps to a competency domain defined in the BRD. The analytics pipeline aggregates these interactions into a skill profile per player or per cohort. The profile includes both accuracy and behavioral measures such as time to report or propensity to verify.

Competency domains include, per BRD FR-AN-004.

- Phishing detection.
- Password security.
- Data handling.
- Social engineering resistance.
- Incident response.
- Physical security.
- Compliance awareness.

The system generates a rolling competency score for each domain using weighted events. For example, repeated correct detection of domain mismatches increases phishing detection score, while consistent use of verification packets increases identity verification score. This profile feeds adaptive difficulty and enterprise dashboards.

### 12.2 Benchmarking and Cohort Comparison

Enterprise analytics require benchmarking against peers and against internal cohorts. The email and document system provides normalized metrics that can be compared across departments, locations, or roles.

Benchmarking rules.

- Metrics are normalized by difficulty to avoid penalizing users who receive harder emails.
- Benchmarks are aggregated and anonymized when shared across organizations.
- Cohort comparisons are based on consistent training exposure windows.

These rules prevent misleading comparisons and maintain privacy obligations.

### 12.3 Data Quality and Anomaly Detection

Analytics are only useful if the data is reliable. The system includes data quality checks that detect missing events, suspiciously fast decisions, or inconsistent sequences. When anomalies are detected, the system flags the session for review and excludes it from benchmark calculations.

Data quality rules.

- If time spent per email is below a threshold for multiple consecutive emails, the session is tagged as low engagement.
- If event order breaks the state machine sequence, the session is marked as invalid for analytics.
- If network issues cause missing events, the system attempts to reconstruct from client cache, otherwise it marks the gap.

These checks protect the integrity of learning metrics and enterprise reporting.

---

## 13. Accessibility and UX Requirements

The email and document system must meet WCAG 2.1 AA as the baseline, Section 508 for US government market access, and EN 301 549 for EU market compliance, along with the additional accessibility requirements in the BRD (Section 7.5) and DD-07.

Accessibility requirements.

- No per email countdown timers. Queue pressure only.
- All content accessible via keyboard navigation.
- Screen reader friendly structure with correct ARIA labels and live regions.
- Minimum 4.5:1 contrast ratio for all text; 3:1 for large text, per BRD Section 7.5.
- High contrast theme with all CRT effects disabled.
- Color-blind safe palette with secondary encoding (text labels, icons, patterns) so that no information is conveyed by color alone.
- `prefers-reduced-motion` respected for all animations, including any email or document transition effects.
- Text resize up to 200 percent without layout loss.
- Alternative modes such as Screen Reader Optimized and One Switch.
- Captions and transcripts for any audio or video content embedded in emails or documents.
- VPAT maintained and updated with each release to document accessibility conformance.

The document viewer must expose content in a linearized text representation for screen readers. This ensures that visually dense documents remain accessible.

### 13.1 Keyboard and Focus Model

The email and document workflows must be fully usable with a keyboard. Focus order follows the logical workflow of the screen: inbox list, email viewer, attachment list, action bar, then status panel. Skip links allow instant navigation to the inbox, document viewer, or action bar.

Keyboard requirements.

- Arrow keys move within the inbox list.
- Enter opens the selected email or document.
- Tab cycles through action buttons with visible focus states.
- Shortcut keys for Approve, Deny, Flag, and Request Verification are configurable and always displayed in the UI.

These features are essential for accessibility and also support power users in enterprise contexts.

### 13.2 Readability and Cognitive Load

Emails and documents can be dense. The system reduces cognitive load by controlling line length, spacing, and visual hierarchy. Long emails are segmented into logical paragraphs with clear headings. Documents with tables include alternating row shading and fixed column headers.

Readability rules.

- Maximum line length for body text is 80 characters in the default view.
- Key metadata such as sender, subject, and date are pinned at the top of the viewer.
- The viewer provides a summary panel that can be toggled on or off.

These measures ensure that the system remains usable in both casual and professional contexts without sacrificing the training objective.

---

## 14. Localization and Cultural Adaptation

Localization is a core requirement for enterprise adoption and for global consumer reach. The email and document system must support 24 EU languages and cultural adaptation of phishing content.

Localization requirements.

- All templates use localization keys, not hard coded text.
- Right to left layout support for Arabic, Hebrew, and Farsi.
- Locale specific date, currency, and numbering formats.
- Cultural adaptation of references, brand like entities, and writing styles.

Phishing cues must be adapted to local conventions. For example, the format of government agencies or common invoice patterns differs by locale. The system uses localized template variants to preserve realism.

---

## 15. Security, Safety, and Privacy

The email and document system deals with sensitive training data and must maintain strict safety standards.

Safety requirements.

- Generated content must never include real world URLs, phone numbers, or executable instructions.
- All domains must be synthetic and non resolvable.
- Attachments must be rendered, not downloaded, and must not execute any code.

Privacy requirements.

- Content data must not include real personal data, even in enterprise mode.
- Event logs must store only anonymized references.
- Retention policies must follow the longest applicable compliance requirement.

The system must also prevent content leakage that could be used for real world phishing training. That includes limiting export of raw templates and restricting AI prompt visibility to authorized staff.

---

## 16. Performance and Scalability

Performance targets for email and document operations must align with BRD non functional requirements.

Targets.

- Email list load under 200 ms P95.
- Document open under 300 ms P95 with caching.
- AI email generation under 10 seconds per BRD Section 7.1 (pre-generated pool eliminates player-perceived latency).
- AI generation off the critical path and never blocking gameplay.
- Game state update latency under 100 ms P95 for decision resolution.
- WebSocket message delivery under 50 ms P95 for real-time event propagation.

Scalability considerations.

- Email pool stored in Redis with fast fetch.
- Document templates cached in memory for rapid rendering.
- Heavy analytics queries offloaded to ClickHouse or TimescaleDB.

---

## 17. Testing and Validation Strategy

Testing is essential to ensure content correctness, safety, and determinism.

Testing categories.

- Unit tests for template rendering and schema validation.
- Integration tests for full email generation and document packet assembly.
- Determinism tests comparing replay output across runs.
- Accessibility tests for document viewer and email triage screens.
- Safety tests to ensure no real world data leaks.

QA should include manual playthroughs that validate indicator clarity and realism at each difficulty tier.

---

## 18. Content Operations Workflow

Content operations is the ongoing process of creating, validating, and shipping email and document content.

Workflow steps.

- Author writes or edits template in content system.
- Automated checks validate schema and safety.
- SME review approves for release.
- Template is versioned and deployed.
- AI generation uses new template as seed.
- Monitoring detects anomalies and low quality content.

Content ops must align with seasonal release cadence and enterprise compliance review cycles.

---

## 19. Risks and Mitigations

**Risk:** AI generated emails become too realistic and teach users to distrust all emails.

Mitigation: Maintain minimum legitimate ratio and include benign anomalies in legitimate emails.

**Risk:** Document system becomes too complex and slows gameplay.

Mitigation: Limit verification packets to a manageable size and provide optional hints.

**Risk:** Localization introduces inconsistent cues that break indicator logic.

Mitigation: Localize templates with region specific SMEs and run locale specific QA.

**Risk:** Safety guardrails fail and generate real world actionable content.

Mitigation: Multi layer validation, domain allow lists, and automated PII detection.

---

## 20. Open Questions and Decision Log

Open questions to be resolved in future design iterations.

1. Should the Phishing Analysis Worksheet be mandatory in enterprise mode to improve analytics, or remain optional to reduce friction.
2. What is the maximum number of verification documents that preserves learning without slowing pacing.
3. Should certain high risk emails require verification before decision, and how does that affect agency.
4. How should community generated content be moderated and versioned in enterprise environments.
5. Should the document viewer support automated diff highlighting for advanced modes.

Decision log will be maintained in the content system repository with date, decision owner, and rationale.

---

## Appendix A: Email Field Dictionary

The following field dictionary defines the canonical email instance fields. Fields are grouped by category.

Identity and routing.

- email_id: UUID for the email instance.
- template_id: UUID for the template.
- template_version: integer.
- tenant_id: UUID.
- session_id: UUID.
- day_number: integer.
- sender_profile_id: UUID.
- faction_id: string.
- from_name: string.
- from_address: string.
- reply_to: string.
- return_path: string.
- message_id: string.
- received_chain: array of header hops.

Content.

- subject: string.
- preview: string.
- body_text: string.
- body_html: string.
- attachments: array of document_id.
- links: array of link objects.

Access request (structured).

- applicant_profile: object (name, organization, role, credentials, contact_channel, affiliation_history).
- assets_at_risk: array of asset descriptors (asset_type, sensitivity, volume, criticality, provenance).
- requested_services: array of service requests (service_type, retention_period, access_scope, urgency, compliance_flags).

Classification.

- intent: legitimate | malicious | ambiguous.
- technique_primary: string.
- technique_secondary: array.
- difficulty: 1 to 5.
- urgency: low | medium | high | critical.

Evaluation.

- indicator_map: array of indicator objects.
- indicator_weights: map.
- indicator_truth_hash: string.
- action_tradeoff_profile_id: string.

---

## Appendix B: Indicator Catalog

The indicator catalog defines the types of signals that can be embedded in emails and documents. Indicators are grouped by category but share a common schema.

Common indicator fields.

- type: identifier string.
- severity: low | medium | high.
- description: short explanation.
- visibility: email_body | header | document | metadata.
- learning_goal: mapped skill domain.

Indicator types.

- domain_mismatch
- display_name_mismatch
- suspicious_link
- url_mismatch
- shortened_url
- spoofed_header
- spf_fail
- dkim_fail
- dmarc_fail
- urgent_language
- authority_claim
- emotional_manipulation
- grammar_anomaly
- attachment_mismatch
- file_type_risk
- date_inconsistency
- signature_mismatch
- seal_mismatch
- hash_mismatch
- inconsistent_org_name
- unusual_payment_request
- abnormal_timing

---

## Appendix C: Example Email JSON

```json
{
  "email_id": "7f4b3b7e-9c8c-4e7a-9a7b-3f1a5b9e7d21",
  "template_id": "2bb3a5d1-3f1b-4f48-8f6a-9d2e4cbb8f2a",
  "template_version": 4,
  "tenant_id": "00000000-0000-0000-0000-000000000000",
  "session_id": "11111111-1111-1111-1111-111111111111",
  "day_number": 12,
  "faction_id": "librarians",
  "from_name": "Dr. Alina Voss",
  "from_address": "avoss@library-archive.invalid",
  "reply_to": "avoss@library-archive.invalid",
  "return_path": "bounce@library-archive.invalid",
  "message_id": "<20260205.120045.8831@library-archive.invalid>",
  "headers": {
    "spf": "PASS",
    "dkim": "PASS",
    "dmarc": "PASS",
    "received": [
      "from relay01.library-archive.invalid by mx.matrices.invalid"
    ]
  },
  "subject": "Request for archival access - Northern Grid Logs",
  "preview": "We are requesting secure storage of recovered grid telemetry...",
  "body_text": "Morpheus,\n\nWe recovered telemetry from the Northern Grid collapse. We request secure archival access for 90 days...",
  "access_request": {
    "applicant_profile": {
      "name": "Dr. Alina Voss",
      "organization": "The Librarians",
      "role": "Archivist",
      "credentials": ["Archivist-07", "ChainCustody-Verified"],
      "contact_channel": "email",
      "affiliation_history": ["Librarians"]
    },
    "assets_at_risk": [
      {
        "asset_type": "grid_telemetry",
        "sensitivity": "high",
        "volume": "2.4 TB",
        "criticality": "regional",
        "provenance": "Northern Grid Recovery"
      }
    ],
    "requested_services": [
      {
        "service_type": "archival_storage",
        "retention_period": "90 days",
        "access_scope": "read_only",
        "urgency": "medium",
        "compliance_flags": ["chain_of_custody"]
      }
    ]
  },
  "attachments": [
    "doc-verification-packet-2",
    "doc-data-salvage-contract-7"
  ],
  "links": [
    {
      "label": "Verification portal",
      "url": "https://verify.matrices.invalid/packet/74a1",
      "display_url": "https://matrices.invalid/verify/74a1"
    }
  ],
  "intent": "legitimate",
  "technique_primary": "phishing",
  "difficulty": 3,
  "urgency": "medium",
  "indicator_map": [
    {
      "type": "url_mismatch",
      "severity": "low",
      "visibility": "email_body"
    }
  ]
}
```

---

## Appendix D: Document Template Skeletons

Example template skeleton for a Verification Packet document.

```json
{
  "document_type": "verification_packet",
  "template_version": 2,
  "locale": "en-US",
  "fields": {
    "requester_name": "string",
    "organization": "string",
    "request_id": "string",
    "issued_at": "date",
    "chain_of_custody": "string",
    "signatory_name": "string",
    "signatory_role": "string",
    "signature_block": "image",
    "hashes": [
      {"file": "string", "sha256": "string"}
    ]
  },
  "metadata": {
    "document_id": "uuid",
    "issuer": "string",
    "classification": "confidential",
    "expires_at": "date"
  }
}
```

---

## Appendix E: Glossary

- Email Access Request: The primary email artifact representing a request for access to the data center.
- Verification Packet: A bundle of documents used to verify identity and claims.
- Indicator: A discrete signal embedded in email or document content that suggests legitimacy or deception.
- Template Version: The immutable revision of a content template used for deterministic replay.
- Threat Tier: The global difficulty tier that influences email selection and attack frequency.
- Pool: The pre generated set of emails stored for runtime selection.

---

**End of Document**
