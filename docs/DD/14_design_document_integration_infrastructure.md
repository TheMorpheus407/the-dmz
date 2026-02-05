# 14 -- Design Document Integration & Infrastructure Specification

## The DMZ: Archive Gate -- Design Document (Phase 2)

**Document ID:** DD-14  
**Version:** 1.0  
**Date:** 2026-02-05  
**Classification:** Internal -- Engineering & Platform  
**Author:** Design Integration & Infrastructure Lead  
**Status:** Draft for Stakeholder Review

---

## Table of Contents

1. Executive Summary
2. Scope, Goals, and Non-Goals
3. Source Documents and Alignment Commitments
4. Integration Principles and System Invariants
5. Cross-Document Integration Map
6. End-to-End System Context
7. Core Runtime Integration
8. Content and AI Pipeline Integration
9. Enterprise Integration Surface
10. Data Architecture and Event Flow
11. Infrastructure Architecture Overview
12. Environment Strategy and Release Management
13. Security, Privacy, and Compliance Controls
14. Observability and Operational Tooling
15. Reliability, Scalability, and Disaster Recovery
16. Phase 2 Delivery Plan and Acceptance Criteria
17. Risks, Dependencies, and Open Questions
18. Appendix: Terminology and Abbreviations

---

## 1. Executive Summary

This document integrates the design specifications defined across the BRD and Design Documents into a coherent infrastructure and system-integration blueprint for The DMZ: Archive Gate. It establishes how the core game loop, threat engine, UI/UX terminal aesthetic, and backend architecture assemble into a single operational platform that serves both the consumer game and enterprise training deployments. It is specifically scoped to Phase 2 of the program, where enterprise features, multi-tenancy, and integrations become first-class requirements.

The key deliverable is a unified integration map and infrastructure plan that is fully aligned with the BRD vision of stealth learning, dual-market architecture, and enterprise ecosystem integration. This plan ensures deterministic gameplay with event-sourced state management, scalable threat simulation, AI-driven content pipelines, and compliance-grade observability. It also ensures that the platform can serve consumer and enterprise users from the same core engine without bifurcating the product or compromising training outcomes.

The infrastructure design is built around a modular monolith running on a Kubernetes-based platform with Cloudflare/CloudFront at the edge, PostgreSQL as the authoritative transactional store, Redis for caching and queues, and ClickHouse or TimescaleDB for analytics. This architecture matches the BRD technical stack and DD-09 backend architecture, while providing a credible path to service extraction in later phases for the threat engine, AI pipeline, and analytics.

This document also defines integration invariants, cross-module contracts, and operational controls required to satisfy enterprise compliance and data residency demands (GDPR, HIPAA, PCI-DSS, NIS2, SOC 2, FedRAMP readiness). It outlines how identity, access control, LMS integration, SIEM/SOAR export, and audit logging are wired end-to-end while preserving the game’s stealth learning experience.

The result is a single, integrated platform capable of delivering high-retention cybersecurity learning through compelling gameplay, backed by enterprise-grade infrastructure and regulatory controls.

---

## 2. Scope, Goals, and Non-Goals

### 2.1 Scope

This document focuses on integration and infrastructure. It formalizes how the system components defined elsewhere work together in production, and how the platform will be deployed, monitored, and scaled. It is intentionally implementation-focused, but remains within the design phase to guide engineering.

Included in scope:

- System integration across game engine, threat engine, UI, content pipeline, analytics, and enterprise services.
- Infrastructure topology and environment segmentation.
- Identity, access, and multi-tenant isolation requirements.
- Enterprise integration surfaces (SSO, SCIM, LMS, SIEM/SOAR, webhooks).
- Data flow patterns, event sourcing, and analytics pipeline alignment.
- Operational requirements for logging, observability, compliance, and security.
- Phase 2 delivery milestones and acceptance criteria for integration and infrastructure readiness.

### 2.2 Goals

- Maintain strict alignment with BRD requirements for stealth learning, dual-market architecture, and enterprise compliance integration.
- Preserve deterministic gameplay and reproducible analytics by enforcing event-sourced state as the single source of truth.
- Ensure the platform supports both consumer and enterprise modes without divergent game logic or data models.
- Provide a secure, scalable, and auditable infrastructure plan compatible with SOC 2 Type II and FedRAMP readiness.
- Define clear integration boundaries and contracts between modules to prevent future architecture drift.

### 2.3 Non-Goals

- Detailed UI component implementation (covered in DD-07).
- Threat model specifics and adversary simulation logic (covered in DD-05).
- Core loop state machine definitions (covered in DD-01).
- Low-level API specification and route-by-route behavior (covered in DD-09).
- Game narrative, content scripting, or monetization systems.

---

## 3. Source Documents and Alignment Commitments

This document must align with and integrate the following sources. The integration requirements below are binding unless explicitly updated in a future revision.

### 3.1 Primary Sources

- BRD-DMZ-2026-001 (Business Requirements Document)
- DD-01 Game Core Loop & State Machine Design Specification
- DD-05 Threat Engine & Breach Mechanics Design Specification
- DD-07 UI/UX and Terminal Aesthetic Design Specification
- DD-09 Backend Architecture & API Design Specification

### 3.2 Alignment Commitments

The following commitments are treated as system invariants for integration and infrastructure design.

- Deterministic gameplay and auditability are mandatory for enterprise deployments.
- A single game engine serves both consumer and enterprise products.
- Threat generation and breach simulation are explicit phases in the day cycle and must be deterministic given seed and event log.
- The terminal aesthetic is implemented purely as a presentation layer; accessibility must be preserved with all CRT effects disabled.
- Multi-tenancy is required in Phase 2 and must be enforced at data, API, and operational layers.
- Event sourcing is the authoritative state mechanism for game sessions.
- AI-generated content must pass validation and quality gates before entering the production content pool.

---

## 4. Integration Principles and System Invariants

### 4.1 Integration Principles

1. One engine, two markets. Consumer and enterprise experiences are contextual overlays on the same game engine, not separate code paths.
2. Auditability first. Every decision, consequence, and threat outcome is captured in the event log and replayable.
3. Diegetic UI is visual only. Presentation layers must never alter game logic or player outcomes.
4. Explicit contracts between modules. Each module exposes an interface, publishes events, and owns its database tables.
5. Operational parity across environments. Production behaviors (rate limits, validation, audit, encryption) are mirrored in staging and test where feasible.
6. Security and compliance are infrastructure features, not afterthoughts.

### 4.2 System Invariants

The following invariants must remain true throughout integration work:

- The day cycle state machine is authoritative and cannot be bypassed by UI shortcuts or admin commands.
- Threat tier representations are consistent across UI, analytics, and threat engine, using a shared canonical mapping.
- Event versioning guarantees backward compatibility for analytics and replay.
- User identity and tenant context are always attached to events, logs, and analytics records.
- The platform remains functional without real-time connectivity via PWA offline mode for consumer use.
- Enterprise deployments can enforce data residency and retention policies without altering game logic.

---

## 5. Cross-Document Integration Map

This section defines how the four existing design documents integrate into the system and where their boundaries meet.

### 5.1 DD-01 (Core Loop & State Machine) Integration

Integration requirements:

- The game engine module implements the state machine phases defined in DD-01.
- The threat engine is invoked only during THREAT_PROCESSING and INCIDENT_RESPONSE phases, not during email triage.
- UI state transitions align one-to-one with state machine phases to ensure player clarity.
- Event naming and telemetry emitted by the game engine match the event list in DD-01 for analytics consistency.
- Deterministic seeds are passed from session initialization through content selection, threat generation, and incident outcomes.

### 5.2 DD-05 (Threat Engine & Breach Mechanics) Integration

Integration requirements:

- The threat engine uses the threat tier system, thresholds, and colors defined in DD-05, and these map to UI tokens in DD-07.
- The threat engine consumes player competence signals derived from game events (decision accuracy, response time, verification depth).
- Breach events trigger a macro state transition into BREACH_RECOVERY as defined in DD-01.
- Incident response actions must be exposed to the UI as structured, deterministic choices defined in DD-05.
- Attack vectors map to MITRE ATT&CK codes for analytics and enterprise reporting.

### 5.3 DD-07 (UI/UX Terminal Aesthetic) Integration

Integration requirements:

- UI panels map directly to state machine phases in DD-01.
- Threat level labels, color tokens, and icon states match DD-05 tier definitions without variation.
- The document viewer uses the dual font strategy: monospace for terminal UI, proportional for documents.
- Accessibility toggles (reduced motion, high contrast, effects off) must never alter game logic or metrics.
- The enterprise admin UI is visually distinct and clean, with shared authentication and tenant context only.

### 5.4 DD-09 (Backend Architecture & API) Integration

Integration requirements:

- The modular monolith structure is enforced, with module boundaries respected via index exports.
- Event sourcing is mandatory for game sessions and used to populate analytics.
- Fastify route schemas are the source of truth for request/response validation and OpenAPI generation.
- REST is primary for game operations, GraphQL is for analytics dashboards.
- WebSockets provide real-time updates to client UI, particularly for threat alerts and campaign events, with SSE fallback for corporate proxy environments.

---

## 6. End-to-End System Context

### 6.1 Platform Overview

The DMZ: Archive Gate platform consists of five tightly integrated subsystems:

- Game Runtime: The interactive gameplay layer executed in the client and orchestrated by the game engine backend.
- Threat Simulation: The adversary engine that injects attacks, incidents, and narrative escalations.
- Content & AI Pipeline: The system that generates, validates, and serves email scenarios, documents, and threat narratives.
- Enterprise Services: Identity, compliance reporting, LMS integration, SIEM/SOAR export, and administrative controls.
- Analytics & Telemetry: Event ingestion, transformation, and reporting for learning outcomes and compliance evidence.

### 6.2 Actor Roles

- Consumer Player: Plays the game via web, Steam, or mobile. No enterprise integration required.
- Enterprise Learner: Plays the game under a tenant, with training requirements and reporting.
- Enterprise Admin (Trainer or Compliance Officer): Views dashboards, configures campaigns, exports reports.
- Security Operator (CISO, IT Director): Uses analytics and SIEM export for organizational security insights.
- Content Designer: Manages scenario and document templates, validates AI-generated content.

### 6.3 Platform Boundaries

- The game client is a SvelteKit (Svelte 5 runes) web application packaged as PWA and shipped to Steam via web wrapper when applicable.
- The backend is a Node.js 22 LTS / TypeScript 5.x / Fastify modular monolith deployed on Kubernetes per BRD Section 8.3. ORM: Drizzle ORM (type-safe, SQL-first). Validation: Zod (shared schemas between client and server).
- External integrations (SSO, LMS, SIEM, SOAR) connect through REST, webhook, SCIM, or export feeds.
- AI services: Primary provider is Anthropic Claude API (Sonnet for generation, Haiku for classification per BRD Section 8.4). Fallback: self-hosted open-source model (Mistral/Llama) for offline enterprise deployments. AI services may run in a separate compute cluster or managed API, depending on tenant preferences.

---

## 7. Core Runtime Integration

This section defines the runtime contract between the client, game engine, threat engine, and analytics pipeline.

### 7.1 Game Session Lifecycle

1. Session Creation: The client requests `POST /game/sessions`, providing mode (consumer or enterprise), difficulty, and platform metadata. The game engine creates a deterministic seed, initializes state at DAY_START, and returns a session token.
2. Day Execution: The client progresses through the DD-01 phases, submitting actions as `POST /game/sessions/:id/actions`. Each action is validated against the state machine. Invalid actions are rejected without side effects.
3. Threat Processing: When the player advances the day, the game engine triggers the threat engine with session state and competence metrics. The threat engine returns attack events which the game engine applies as part of THREAT_PROCESSING.
4. Incident Response: The client receives incident events and presents actions defined in DD-05. Player actions are captured as game events.
5. Snapshot and Save: At DAY_END or explicit save, a snapshot is stored and the event stream continues. The session can be resumed on any device with identical results.
6. Session Completion: Upon narrative completion or training completion, the session moves to SESSION_COMPLETED. A completion event is sent to analytics and compliance reporting.

### 7.2 Determinism and Replay

Deterministic replay is a core integration requirement. It requires:

- Single source of randomness: the session seed used by both content selection and threat generation.
- Event log as the authoritative state record, with snapshots materialized every 50 events or at day boundaries (per BRD section 8.5) serving only performance.
- Strict versioning of events and deterministic reducers.
- Invariant ordering of side effects: for any given event history, the game state must be identical across environments.

### 7.3 UI and State Synchronization

The client UI uses the state machine phase to determine active panels. State transitions are emitted as events to the client via WebSocket, ensuring the UI remains consistent even if the player uses multiple devices. All client-side animations and CRT effects are cosmetic and must not affect interaction timing or event processing.

### 7.4 Threat Engine Invocation Contract

The game engine invokes the threat engine with a compact payload:

- Session ID, tenant ID, and user ID
- Current day and phase
- Threat tier and facility scale
- Player competence profile (rolling accuracy, response time, false positives)
- Security tool inventory and maintenance levels
- Active campaigns and faction relationships

The threat engine returns:

- Attack event list, with deterministic seeds for each attack
- Campaign updates (phase progress, triggers)
- Breach events, if applicable
- Narrative or intelligence brief messages tied to threat escalations

The game engine applies these as events and records them for analytics and replay.

### 7.5 Analytics Integration

Every game action, threat event, and consequence emits a standardized event to the analytics module via the in-process event bus. The analytics module then writes events to the analytics warehouse (ClickHouse or TimescaleDB) and produces rollups for dashboards and compliance reporting.

Events include:

- User and tenant identifiers
- Session ID and sequence number
- Event type, payload, and metadata
- Client platform and device category
- Correlation IDs to support campaign-level analysis

---

## 8. Content and AI Pipeline Integration

### 8.1 Content Sources

Content originates from two sources:

- Handcrafted scenarios: authored by the design team, reviewed for accuracy, stored in the content library.
- AI-generated scenarios: created by the AI pipeline, validated through automatic and human review gates.

Both sources are stored in the content module and served through the same APIs.

### 8.2 AI Pipeline Stages

The AI pipeline is implemented as a sequence of asynchronous jobs executed via BullMQ. Per BRD Section 8.4, the architecture follows: Content Policy (guardrails) --> Prompt Engine (template + context) --> LLM Provider (Claude API / self-hosted) --> Output Parser + Validator --> Quality Score + Difficulty Classification --> Email Pool (Redis).

1. Prompt Generation: Uses threat tier, faction profile, and educational objective to generate a prompt.
2. Content Generation: Calls the AI provider (Anthropic Claude API primary -- Sonnet for generation, Haiku for classification; Mistral/Llama fallback for offline enterprise).
3. Automated Validation: Checks for factual consistency, profanity, and pedagogical goals. Flags risky outputs. Safety guardrails per BRD: no real company names, real people, or functional malicious payloads. Output validation rejects emails containing real URLs, phone numbers, or PII.
4. Scoring and Classification: Scores scenario for difficulty (levels 1-5), realism, and indicator clarity. Categories include spear phishing, BEC, credential harvesting, malware delivery, and pretexting per BRD FR-GAME-003.
5. Human Review (if flagged): Designer review and approval required for production inclusion.
6. Pool Insertion: Approved scenarios are versioned and placed in the active content pool. Pre-generated email pool of 200+ emails maintained across difficulty tiers per BRD FR-GAME-004, with batch generation during off-peak hours.

### 8.3 Content Delivery to Game Engine

During INBOX_INTAKE, the game engine requests a daily content set from the content module. The content module returns a deterministic list based on the session seed and day number. The list includes metadata (faction, urgency, difficulty) and references to document templates (verification packet, contracts, intelligence briefs).

### 8.4 Content Governance

- Each scenario is tagged with the skills it teaches and the associated MITRE ATT&CK mapping.
- Content versions are immutable once used in production to preserve replay consistency for enterprise audits.
- Content libraries are segmented by tenant when required for data residency or customer-specific training.

---

## 9. Enterprise Integration Surface

Enterprise integration is the primary differentiator in Phase 2. This section defines the integration surfaces and infrastructure support required.

### 9.1 Identity and Access

- SSO via SAML 2.0 (SP-initiated and IdP-initiated, with encrypted assertions) and OIDC (Authorization Code + PKCE flow), with tenant-specific IdP configurations.
- SCIM 2.0 full compliance (RFC 7643/7644) for automated user provisioning, with verified support for Okta, Microsoft Entra ID, and Ping Identity. SCIM user sync latency under 60 seconds (per BRD FR-ENT-010).
- Just-in-time (JIT) provisioning on first SSO login for simpler deployments (per BRD FR-ENT-009).
- RBAC and ABAC enforcement in the backend with tenant-scoped permissions. ABAC policy evaluation under 10ms (P99) per BRD FR-ENT-015.
- Built-in roles: Super Admin, Tenant Admin, Manager, Trainer, Learner. Custom roles with granular permission composition. Scope restrictions by department, team, or location. Time-bound role assignment with expiration dates.
- API keys for service-to-service integrations with scoped access. OAuth 2.0 client credentials for service-to-service authentication.
- Configurable sync frequency (15-minute minimum to real-time push) and back-channel logout support.

### 9.2 LMS Integration

- SCORM 1.2 compliant package export (all ADL conformance tests passed) per BRD FR-ENT-035.
- SCORM 2004 4th Edition export with IMS Simple Sequencing for adaptive learning paths per BRD FR-ENT-036.
- xAPI (v1.0.3 and 2.0) statement emission to external LRS, including detailed skill metrics and custom verb vocabulary per BRD FR-ENT-037.
- Built-in LRS for organizations without their own per BRD FR-ENT-038.
- LTI 1.3 with LTI Advantage (Deep Linking, Assignment and Grade Services, Names and Role Provisioning Services) per BRD FR-ENT-039.
- cmi5 support (mandatory per BRD integration standards).
- AICC HACP protocol support for legacy LMS compatibility per BRD FR-ENT-040.
- Verified integrations with Cornerstone OnDemand, SAP SuccessFactors, Workday Learning, Moodle, and Canvas per BRD FR-ENT-041. Additional platform compatibility: Docebo, Absorb, TalentLMS, Litmos, Blackboard, Brightspace, Totara, 360Learning, LearnUpon, Google Classroom.

### 9.2.1 Phishing Simulation Engine Integration

The BRD defines extensive phishing simulation capabilities that are core enterprise integration requirements:

- Multi-channel simulation: email, SMS, voice, QR code per BRD FR-ENT-021.
- AI-generated simulation emails using real-time threat intelligence per BRD FR-ENT-022.
- Custom simulation templates with visual editor and merge-tag support per BRD FR-ENT-023.
- "Teachable moment" landing pages displayed immediately after simulation failure per BRD FR-ENT-024.
- Dedicated sending infrastructure with per-customer IP isolation (enterprise tier) per BRD FR-ENT-025.
- Full SPF, DKIM (2048-bit RSA minimum), and DMARC alignment per BRD FR-ENT-026.
- Email gateway allowlisting documentation and automation for Proofpoint, Mimecast, and Microsoft Defender per BRD FR-ENT-027.

### 9.2.2 Training Campaign Management Integration

- Automated campaign scheduling with enrollment rules based on department, role, hire date, risk score per BRD FR-ENT-016.
- Escalation workflows: reminder, manager notification, compliance alert per BRD FR-ENT-017.
- Configurable training frequencies per regulatory framework (onboarding, quarterly, annual, event-driven) per BRD FR-ENT-018.
- Just-in-time training delivery within 60 seconds of triggering event (phishing click, policy violation, DLP alert) per BRD FR-ENT-019.
- JIT training throttling: maximum 2 interventions per week per learner per BRD FR-ENT-020.

### 9.3 SIEM/SOAR Integration

- Streaming of training events to SIEM via webhook or polling export.
- Prebuilt connectors for Splunk (HTTP Event Collector + REST API, CIM-compliant events, certified Splunk App with pre-built dashboards, adaptive response actions) and Microsoft Sentinel (Azure Monitor Data Collector API, custom tables, pre-built workbook with KQL, analytics rules, native data connector) in Phase 2. IBM QRadar and Elastic Security connectors planned for Phase 4.
- CEF/LEEF/Syslog fallback for unsupported SIEM platforms; generic HTTPS webhook output.
- Per-integration event filtering, ISO 8601 timestamps, UUIDv7 event deduplication, and published JSON Schema for all event types.
- SOAR integration via webhook-based playbooks, enabling automated follow-up training. Prebuilt integrations for Palo Alto Cortex XSOAR (certified content pack + REST API, custom incident types, indicator enrichment, pre-built playbooks for auto-enrollment and escalation) and Swimlane (Turbine connector + REST API, actions, triggers, field mappings, reusable playbook components). All SOAR integrations support bidirectional API, idempotent operations, and rate limit awareness via response headers.

### 9.3.1 API Strategy Alignment

Per BRD Section 10.6, the platform's API strategy must include:

- API-first design: every UI feature available via documented, versioned API.
- Zero-trust integration posture: every integration endpoint authenticated, authorized, encrypted, and audited.
- RESTful API with OpenAPI 3.0 specification.
- GraphQL endpoint for complex analytical queries.
- Webhook delivery with HMAC signature verification per BRD Section 10.6.
- OAuth 2.0 client credentials for service-to-service communication.
- Rate limiting with `X-RateLimit-Remaining` and `Retry-After` headers per BRD Section 10.6.
- Versioned endpoints (v1, v2) with 12-month deprecation windows.
- Event-driven by default (async webhooks over polling).
- Tenant isolation in multi-tenant deployments.
- Graceful degradation with event queuing.

### 9.4 Compliance Reporting

- Framework mapping to GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, FedRAMP, and others per BRD FR-AN-013.
- Immutable, append-only audit logs with SHA-256 cryptographic integrity verification per BRD FR-ENT-030.
- Certificate generation with digital signature, regulatory framework reference, and expiration date per BRD FR-ENT-033.
- Management training attestation reports for NIS2 Article 20 and DORA Article 5 per BRD FR-ENT-034.
- Configurable retention policies per framework (1-7 years) per BRD FR-ENT-031.
- Individual training transcripts with complete audit trail per BRD FR-ENT-032.
- Exportable reports in CSV, PDF, and JSON per BRD FR-ENT-029 (one-click export).
- Content versioning with full audit trail of changes and reviews per BRD FR-ENT-042.
- Annual program review workflow with sign-off for PCI-DSS 12.6.2 per BRD FR-ENT-043.

### 9.5 Collaboration and Messaging Integrations (Teams/Slack)

The BRD requires collaboration platform integrations as part of the enterprise surface. These integrations support training nudges, incident awareness, and program engagement.

- **Microsoft Teams:** Bot Framework v4 with adaptive cards; personal and channel tabs; training reminders, phishing report forwarding, micro-learning modules delivered inline, risk dashboard, leaderboards. Published to Teams App Store per BRD Section 10.4.
- **Slack:** Events API + Web API + Bolt SDK; slash commands (/thedmz status, leaderboard, report, train, risk); Block Kit notifications; App Home dashboard; Enterprise Grid support. Published to Slack App Directory per BRD Section 10.4.
- Webhook-based message delivery with tenant-configurable templates.
- Opt-in delivery controls to satisfy privacy and workplace policy requirements.

### 9.5.1 Email Sending Infrastructure

The BRD (Section 10.4) requires dedicated email infrastructure for phishing simulation campaigns:

- Dedicated MTA infrastructure with per-customer IP isolation (enterprise tier) per BRD FR-ENT-025.
- Sustained throughput of 1M emails/hour with 99%+ inbox delivery rate.
- Automated IP warm-up process for new customer deployments.
- Full SPF, DKIM (2048-bit RSA minimum), and DMARC alignment per BRD FR-ENT-026.
- Email gateway allowlisting documentation and automation for Proofpoint, Mimecast, and Microsoft Defender per BRD FR-ENT-027.

### 9.6 HRIS/HCM Integrations

The BRD also calls for HRIS/HCM connectors to align training records with organizational structures.

- HRIS/HCM data import for departments, roles, locations, and manager hierarchies.
- Synchronization of employment status to support automated provisioning and deprovisioning rules.
- Mapping of training requirements to role-based curricula and compliance reporting.
- Bidirectional integration with Workday, BambooHR, SAP SuccessFactors, and ADP for organizational structure synchronization, user lifecycle management, and event-driven training triggers (new hire, department transfer, role change, termination). Implementation detail is phased but the integration surface is reserved in Phase 2.

---

## 10. Data Architecture and Event Flow

### 10.1 Data Stores

- PostgreSQL: Authoritative transactional store for event logs (append-only, partitioned by month), snapshots (JSONB for fast reads without event replay), users, tenant configuration, and content metadata. Session metadata and snapshots persist here for audit and replay.
- Redis: Authoritative ephemeral session state (fast, auto-expiring per BRD Section 8.5), cache layer, and queue backend for BullMQ. Also used for: real-time metrics via Redis Streams (sub-millisecond reads, time-windowed), AI email pool via Redis lists (LPUSH/RPOP for pool management, maintaining 20-50 emails per difficulty tier per BRD Section 8.6), leaderboards via Redis sorted sets (ZADD/ZRANGE for ranked queries), and real-time state caching and presence.
- ClickHouse or TimescaleDB: Analytics warehouse for telemetry and reporting (columnar, optimized for time-series aggregation).
- Object Storage: Scenario attachments, verification packets, and generated documents. (Note: Object storage is a proposed infrastructure addition not explicitly listed in BRD Section 8.5 data architecture; subject to engineering approval.)

### 10.2 Event Flow

1. Game events are emitted by the game engine and stored in PostgreSQL.
2. Analytics module subscribes to events and writes to the analytics warehouse (ClickHouse or TimescaleDB).
3. Compliance reporting queries are generated from the analytics warehouse, with event references for auditability.
4. SIEM export jobs extract event subsets and push to external systems.

### 10.3 Data Retention

- Default retention is 24 months for analytics data, configurable per tenant.
- Configurable retention policies per framework supporting 1-7 years (per BRD FR-ENT-031), with the longest applicable period governing. HIPAA: 6 years, SOX: 7 years, FedRAMP/FISMA: 3 years, DORA: 5 years, ISO 27001: 3 years minimum, PCI-DSS: 1 year minimum.
- Event logs for enterprise tenants are retained for the full compliance period required by the framework in use. Automated deletion/anonymization at expiration.
- Consumer data is minimized and anonymized according to GDPR and CCPA requirements.

---

## 11. Infrastructure Architecture Overview

### 11.1 High-Level Topology

The platform is designed for multi-region operation, but Phase 2 deployment remains single-region per the BRD roadmap. The infrastructure is built to add additional regions and data residency controls in Phase 4 (months 12–18).

Key components:

- Edge: Cloudflare (primary) or CloudFront for CDN, DDoS protection, and WAF.
- API Layer: Fastify monolith running in Kubernetes pods.
- Worker Layer: BullMQ workers and AI pipeline jobs.
- Data Layer: PostgreSQL primary with read replicas, Redis cluster, ClickHouse or TimescaleDB cluster.
- Storage: Object storage with lifecycle policies.
- Monitoring: Prometheus, Grafana, and centralized log aggregation.

### 11.2 Multi-Region Strategy

Phase 2 is single-region with multi-region readiness. The BRD roadmap defers data residency and multi-region deployment to Phase 4 (months 12–18). Phase 2 therefore focuses on architectural hooks:

- Tenant region metadata and routing configuration (inactive until Phase 4).
- Region-aware object storage layout and bucket policies.
- Database schemas and migration patterns that support future regional partitioning.
- CDN rules prepared for regional asset overrides when multi-region is enabled.

Phase 4 enables at least four regions per BRD Section 7.7:

| Region | Location | Data Stored | Compliance Driver |
|--------|----------|-------------|-------------------|
| **EU** | Frankfurt / Ireland | EU/EEA resident training data, NIS2/DORA compliance data | GDPR Chapter V, NIS2, DORA |
| **US** | US-East / US-West (GovCloud where required) | US resident data, FedRAMP/FISMA/SOX/HIPAA data | FedRAMP, FISMA, CCPA |
| **UK** | London | UK resident training data | UK GDPR |
| **APAC** | Singapore / Tokyo / Sydney | APAC resident data | APPI, PIPA, local privacy laws |

Each region has its own PostgreSQL primary and analytics warehouse (ClickHouse or TimescaleDB) cluster to satisfy data residency requirements. Customer-configurable data residency preferences with automated logging of all cross-border data transfers per BRD Section 7.7.

### 11.3 Network Segmentation

The Kubernetes cluster is segmented into namespaces with network policies. The backend module decomposition follows BRD Section 8.3: `auth`, `game-engine`, `content`, `ai-pipeline`, `facility`, `threat-engine`, `analytics`, `billing`, `admin`, `notification`.

Namespace mapping:

- `core`: API, auth, game-engine, content, facility, threat-engine, billing, notification
- `workers`: BullMQ workers, AI pipeline jobs
- `analytics`: Analytics warehouse (ClickHouse or TimescaleDB) ingestion, reporting services
- `admin`: Admin UI services, reporting exporters
- `infra`: monitoring, logging, and shared tools

Services are protected by ingress rules and internal service mesh policies.

---

## 12. Environment Strategy and Release Management

### 12.1 Environments

- Development: Local and shared dev cluster for rapid iteration.
- Staging: Mirrors production with reduced scale; used for integration testing and enterprise validation.
- Production: Single-region high availability in Phase 2; multi-region/data residency enabled in Phase 4 (months 12–18), SOC 2 compliant.

### 12.2 CI/CD Pipeline

- GitHub Actions for build, test, and deployment.
- Automated unit and integration tests for game engine, threat engine, and API.
- Playwright E2E testing for critical user flows and cross-browser validation.
- Automated security scanning and accessibility validation (WCAG 2.1 Level AA baseline, Section 508, EN 301 549 per BRD Section 7.5) in CI/CD pipeline.
- Blue-green deployments for zero-downtime updates per BRD Section 8.6.
- Feature flags for incremental rollout of new content and mechanics.

### 12.3 Versioning and Migration

- API versioning via `/api/v1` with 12-month deprecation policy.
- Database migrations managed by Drizzle, executed in rolling fashion.
- Event versioning to preserve replay compatibility.

---

## 13. Security, Privacy, and Compliance Controls

### 13.1 Security Baseline

- TLS 1.2+ for all external communication.
- Encryption at rest using AES-256 with jurisdiction-specific key management for PostgreSQL and object storage.
- Secrets managed by a centralized secrets manager and rotated quarterly.
- Least privilege IAM for all services.

### 13.2 Privacy Controls

- Data minimization for consumer accounts.
- Pseudonymization engine with separate key management per BRD Section 9.3.
- Aggregate reporting by default; no individual disciplinary use without separate policy per BRD Section 9.3.
- Transparent phishing simulation disclosure per BRD Section 9.3.
- No linking of training performance to HR decisions without explicit tenant policy per BRD Section 9.3.
- Tenant-level retention and deletion policies.
- GDPR data subject access and deletion workflows.

### 13.3 Compliance Roadmap

Per BRD Section 9.6 Compliance Priority Matrix:

**Priority 1 -- Must-Have at Launch:** GDPR, HIPAA, PCI-DSS 4.0, ISO 27001, SOC 2, WCAG 2.1 AA, Section 508.

**Priority 2 -- Within 6 Months:** NIS2, DORA, FedRAMP authorization pathway, CCPA/CPRA, SOX.

**Priority 3 -- Within 12 Months:** NIST CSF 2.0 alignment, GLBA, CMMC, EN 301 549, multi-region data residency, additional state privacy laws.

Key milestones:

- SOC 2 Type II audit begins Month 8-9 per BRD Section 15 Phase 2 roadmap, with compliance targeted in Year 1.
- FedRAMP Ready designation targeted in Phase 4 (months 12-13) per BRD Section 15.
- NIS2 and DORA alignment within 6 months for EU deployments.

---

## 14. Observability and Operational Tooling

### 14.1 Logging

- Structured JSON logging with request IDs and tenant IDs. (Note: Pino is a proposed implementation choice not specified in the BRD; subject to engineering approval.)
- Centralized log aggregation with retention for compliance.

### 14.2 Metrics and Tracing

- Prometheus for metrics collection.
- Grafana dashboards for SLOs and operational health.
- Distributed tracing for cross-service diagnostics. (Note: OpenTelemetry is a proposed implementation choice not specified in the BRD; subject to engineering approval.)

### 14.3 Alerting

- Alerting system for critical alerts. (Note: PagerDuty is a proposed implementation choice not specified in the BRD; subject to engineering approval.)
- Separate alert channels for security incidents, performance degradation, and availability.

---

## 15. Reliability, Scalability, and Disaster Recovery

### 15.1 Availability Targets

Tiered SLA per BRD:

- Consumer: 99.5% uptime with rolling deployments, no scheduled downtime.
- Enterprise Standard: 99.9% uptime with 4-hour monthly maintenance window (scheduled).
- Enterprise Premium: 99.95% uptime with zero-downtime deployments.
- Game session continuity: No more than 1% of sessions affected by outages.

### 15.2 Scalability

- Horizontal scaling for API pods based on CPU and latency.
- Redis and analytics warehouse (ClickHouse or TimescaleDB) scaling via clustering.
- Asynchronous queue processing for AI pipeline and reporting exports.

### 15.3 Disaster Recovery

- Daily PostgreSQL backups with point-in-time recovery.
- Cross-region replication for enterprise tenants is a Phase 4 capability; Phase 2 relies on backups and single-region restoration procedures.
- Disaster recovery drills twice per year.

---

## 16. Phase 2 Delivery Plan and Acceptance Criteria

### 16.1 Phase 2 Integration Deliverables

- Multi-tenant support with tenant-aware event sourcing.
- SSO, SCIM, RBAC, and compliance reporting.
- LMS and SIEM integrations operational in staging.
- Threat engine integrated into day cycle with deterministic replay.
- AI pipeline integrated with content module and quality validation.

### 16.2 Acceptance Criteria

- Enterprise tenant can provision users via SCIM and enforce SSO login.
- Game sessions are fully replayable, with deterministic outcomes verified across devices.
- Compliance reports generate within 5 minutes for a 10,000-user tenant.
- Threat tier and UI indicators remain consistent across all interfaces.
- SOC 2 readiness checklist completed for Phase 2 scope.

---

## 17. Risks, Dependencies, and Open Questions

### 17.1 Risks

- AI content quality variability may undermine training outcomes if validation is insufficient.
- Multi-region deployment complexity in Phase 4 may delay data residency compliance.
- Integration with diverse LMS and SIEM ecosystems may require custom adapters.

### 17.2 Dependencies

- Threat engine readiness (DD-05 alignment)
- Game engine state machine implementation (DD-01 alignment)
- UI and accessibility compliance (DD-07 alignment)
- Backend module boundaries and API contracts (DD-09 alignment)

### 17.3 Open Questions

- Should enterprise tenants be allowed to disable AI-generated content entirely?
- What is the minimum analytics granularity acceptable for privacy-sensitive deployments?
- Do we need a dedicated SIEM connector framework or can we standardize on webhooks?

---

## 18. Appendix: Terminology and Abbreviations

- ABAC: Attribute-Based Access Control
- AICC: Aviation Industry Computer-Based Training Committee
- BRD: Business Requirements Document
- CEF: Common Event Format
- cmi5: Computer Managed Instruction (xAPI profile for LMS)
- DD: Design Document
- HACP: HTTP AICC Communication Protocol
- HPA: Horizontal Pod Autoscaling
- HRIS: Human Resource Information System
- HCM: Human Capital Management
- LEEF: Log Event Extended Format
- LMS: Learning Management System
- LRS: Learning Record Store
- LTI: Learning Tools Interoperability
- PITR: Point-In-Time Recovery
- PWA: Progressive Web Application
- RBAC: Role-Based Access Control
- RLS: Row-Level Security
- SBOM: Software Bill of Materials
- SCIM: System for Cross-domain Identity Management
- SCORM: Sharable Content Object Reference Model
- SIEM: Security Information and Event Management
- SLO: Service Level Objective
- SOAR: Security Orchestration, Automation, and Response
- SSE: Server-Sent Events
- SSO: Single Sign-On
- WAL: Write-Ahead Log
- xAPI: Experience API

---

## 19. Detailed Cross-Module Contracts

This section provides the authoritative integration contracts between modules, expressed as interface expectations, event semantics, and data ownership boundaries. These contracts are required to prevent divergence between the game runtime, enterprise functionality, and compliance reporting.

### 19.1 Canonical Identifiers and Shared Schemas

All modules use a shared identifier strategy and canonical enumerations to preserve determinism and analytics consistency.

- Identifiers use UUIDv7 for ordered, timestamp-friendly uniqueness.
- Event sequence numbers are per session and strictly increasing.
- Threat tiers, faction IDs, and attack categories are centralized enumerations.
- Skill IDs map to NIST CSF categories for enterprise reporting.

Canonical enumerations:

- Threat tiers: `LOW`, `GUARDED`, `ELEVATED`, `HIGH`, `SEVERE`
- Factions: `sovereign_compact`, `nexion_industries`, `the_librarians`, `hacktivist_collective`, `criminal_network`
- Game phases: `DAY_START`, `INBOX_INTAKE`, `EMAIL_TRIAGE`, `VERIFICATION_REVIEW`, `DECISION_RESOLUTION`, `CONSEQUENCE_APPLICATION`, `THREAT_PROCESSING`, `INCIDENT_RESPONSE`, `RESOURCE_MANAGEMENT`, `UPGRADE_PHASE`, `DAY_END`
- Core skills: `phishing_detection`, `identity_verification`, `risk_assessment`, `zero_trust_judgment`, `incident_response`, `security_operations`, `supply_chain_risk`, `governance`

### 19.2 Auth Module Integration

Responsibilities:

- Authenticate users, issue JWTs, enforce RBAC/ABAC.
- Provide tenant context to all API requests.
- Publish user lifecycle events for analytics and provisioning.

Integration contract:

- All downstream modules must require a verified user identity and tenant ID.
- SCIM operations emit `auth.user.created` and `auth.user.deactivated` events, consumed by analytics and admin modules.
- Auth module is the only owner of password credentials and SSO configuration.

Key invariants:

- SSO users may not have password hashes unless explicitly configured.
- All tokens include tenant ID, role IDs, and session context for traceability.

### 19.3 Game Engine Integration

Responsibilities:

- Owns session lifecycle, state machine, event sourcing, and deterministic progression.
- Validates all actions against the active phase.

Integration contract:

- Game engine is the only module allowed to mutate `game.sessions` (metadata and snapshot references) and `game.events` tables; active session state is stored in Redis per BRD §8.5.
- Threat engine and content module provide inputs, but the game engine decides how they become events.
- The UI can only request actions through the API; it cannot bypass state validation.

Key invariants:

- Every action produces either a single event or a deterministic rejection.
- The session seed is generated once at creation and never changes.
- All state transitions are logged for audit and replay.

### 19.4 Threat Engine Integration

Responsibilities:

- Generate attacks, campaigns, and breaches based on player state and narrative progress.
- Provide deterministic outputs for a given input state and seed.

Integration contract:

- Threat engine is invoked only during `THREAT_PROCESSING` and returns a structured set of attack events.
- It must not directly write to game tables; instead it returns events for the game engine to persist.
- Any adaptive behavior must be derived from player metrics supplied in the input payload.

Key invariants:

- Threat tier escalation must be narratively justified and reported in an intelligence brief.
- Breach events include recovery metadata and enforce BREACH_RECOVERY macro state.

### 19.5 Content Module Integration

Responsibilities:

- Store handcrafted and AI-generated scenarios.
- Provide deterministic daily email queues.

Integration contract:

- Content selection is deterministic given session seed, day number, and content pool version.
- Content module owns scenario metadata, skill tags, and difficulty ratings.
- Game engine only consumes content through the content module interface.

Key invariants:

- Content versions are immutable once used in production sessions.
- Content used for enterprise tenants must remain accessible for audit as long as the associated event logs are retained.

### 19.6 AI Pipeline Integration

Responsibilities:

- Generate, validate, and approve new scenarios.
- Enforce content quality and safety checks.

Integration contract:

- AI pipeline outputs are never served to players until validation gates are passed.
- The pipeline outputs scenario metadata aligned with canonical skill tags and MITRE ATT&CK mappings.
- Failure in AI generation does not block the game engine; fallback content is always available.

Key invariants:

- AI models and prompts are versioned for reproducibility.
- Human review decisions are logged and traceable.

### 19.7 Analytics Module Integration

Responsibilities:

- Consume game events and produce reports.
- Provide compliance and learning outcome dashboards.

Integration contract:

- Analytics consumes events asynchronously and never blocks gameplay.
- Analytics warehouse (ClickHouse or TimescaleDB) storage schema matches event versions; migrations include backfill logic.
- Analytics outputs are referenced by compliance reporting and export modules.

Key invariants:

- Analytics accuracy is reproducible from event logs.
- Tenant boundaries are enforced in all queries.

### 19.8 Admin Module Integration

Responsibilities:

- Manage tenant configuration, campaigns, and compliance settings.
- Provide white-label branding options for enterprise tenants.

Integration contract:

- Admin actions write to dedicated configuration tables and emit configuration change events.
- Admin UI has no direct access to player data outside its tenant.

Key invariants:

- All admin actions are audited and retained for compliance.
- Tenant settings are applied only after validation and documented change logs.

---

## 20. End-to-End Data Flow Narratives

This section provides concrete, end-to-end flow descriptions that show integration across components. These narratives serve as reference for QA, operations, and integration testing.

### 20.1 Daily Game Loop Flow

1. Player loads session in `DAY_START`. Game engine returns day metadata and intelligence brief.
2. Game engine requests content for the day from the content module using the session seed and day number.
3. Content module returns a deterministic queue of emails and associated documents.
4. Player triages emails and submits decisions. Each decision is validated and stored as an event.
5. Game engine applies consequences, updates funds and trust, and emits consequence events.
6. When the player advances the day, the game engine invokes the threat engine with current state and competence metrics.
7. Threat engine returns attacks and incidents, which the game engine logs and exposes to the UI.
8. Player performs incident response actions. Game engine records outcomes and updates metrics.
9. Player manages resources and upgrades. Actions are recorded as events.
10. At `DAY_END`, the engine snapshots state, writes summary events, and awaits player confirmation to advance.

### 20.2 Breach and Recovery Flow

1. Threat engine generates a breach event with severity, recovery days, and narrative impact.
2. Game engine transitions session to `SESSION_BREACH_RECOVERY` and records `game.breach.occurred`.
3. UI presents a breach alert with mandatory narrative and recovery options.
4. Recovery actions are constrained to a reduced action set defined in DD-05.
5. Each recovery day advances only after required actions are completed and logged.
6. Upon completion of recovery, session returns to `SESSION_ACTIVE` and threat tier de-escalation logic is applied.

### 20.3 Enterprise User Onboarding Flow

1. Tenant admin configures SSO and SCIM in the admin UI.
2. SCIM provisioning creates users and assigns default roles.
3. Users log in via SSO and are mapped to tenant context.
4. Game sessions are created with enterprise settings: reporting enabled, data retention policy enforced.
5. Completion events are captured for compliance reporting and audit logs.

### 20.4 LMS Integration Flow (SCORM and xAPI)

1. Admin generates a SCORM package for a training campaign.
2. LMS launches the game via the SCORM wrapper.
3. The game engine emits xAPI statements to the tenant’s LRS with detailed skill metrics.
4. Completion and score data are pushed back to the LMS using SCORM runtime calls.
5. The admin dashboard reconciles LMS status with game event logs to ensure consistency.

### 20.5 SIEM Export Flow

1. Tenant admin enables SIEM integration and configures a webhook or connector.
2. Analytics module filters game events mapped to threat and risk outcomes.
3. Export worker sends event summaries to SIEM, including user anonymization if configured.
4. Delivery logs and failures are stored in the audit log for compliance.

### 20.6 AI Content Refresh Flow

1. Content team defines a new campaign template and objective.
2. AI pipeline generates candidate scenarios and documents.
3. Automated validation rejects low-quality outputs and flags ambiguous scenarios.
4. Human review approves a subset for release.
5. Approved content is versioned and added to the pool with a deployment tag.
6. Content pool version increments, enabling controlled rollout via feature flags.

### 20.7 Cross-Platform Save Sync Flow

1. Player pauses a session on device A. Snapshot is created at the nearest safe phase boundary.
2. Event log is updated with pause metadata and sync token.
3. Player resumes on device B. The server replays events from the last snapshot.
4. Deterministic seed ensures the same content and outcomes.

### 20.8 Consumer-to-Enterprise Adoption Flow

1. Consumer player engages with the game outside an enterprise tenant.
2. Player shares achievement or score within their organization.
3. Enterprise admin creates a tenant and invites users.
4. Players link their consumer account to the enterprise tenant, preserving progress where allowed.
5. Enterprise campaign uses the same game engine with enhanced reporting and compliance overlays.

---

## 21. Infrastructure Component Details

This section expands the infrastructure overview into concrete component-level design, deployment topology, and operational boundaries. The intent is to eliminate ambiguity for implementation and compliance review.

### 21.1 Edge and CDN Layer

The edge layer is built on Cloudflare (primary) or CloudFront, providing the following capabilities:

- Global CDN for static assets, game bundles, and documentation.
- WAF rules tuned for API endpoints and admin dashboards.
- DDoS mitigation with automatic rate limits for high-risk endpoints.
- TLS termination with managed certificates and strict TLS versions.
- Bot management for consumer endpoints to reduce abuse.

Edge routing policy:

- Static assets and public marketing content are served from the CDN.
- Phase 2 routes all API requests to the primary region. When multi-region is enabled in Phase 4, requests are routed to the nearest region and aligned with tenant data residency.
- WebSockets are supported via Cloudflare’s WebSocket proxy for real-time updates.

### 21.2 Kubernetes Cluster Topology

Phase 2 uses a single regional Kubernetes cluster with dedicated node pools. The layout is designed to scale into additional regions in Phase 4 without architectural changes.

Node pools:

- `api-pool`: Fastify API pods, game engine, auth, content module.
- `worker-pool`: BullMQ workers, AI pipeline jobs, export jobs.
- `analytics-pool`: Analytics warehouse (ClickHouse or TimescaleDB) ingestion, analytics APIs, reporting services.
- `admin-pool`: Admin UI backends and report generation endpoints.
- `infra-pool`: Monitoring, logging, internal tools.

Workload isolation:

- Namespace-based separation with network policies to restrict lateral movement.
- Pod Security Standards enforced to prevent privileged containers.
- Resource quotas per namespace to prevent noisy neighbor impact.

Scaling:

- Horizontal Pod Autoscaling (HPA) based on CPU and latency metrics for API pods.
- Queue-based autoscaling for worker pods, using Redis queue depth as a metric.
- Analytics workloads are scaled based on query concurrency and ingestion lag.

### 21.3 Database Architecture

#### 21.3.1 PostgreSQL

PostgreSQL is the authoritative transactional store. Architecture details:

- Primary instance with streaming replicas in-region (Phase 2). Cross-region replication is added in Phase 4.
- Read replicas serve analytics and admin read workloads to offload the primary.
- Point-in-time recovery (PITR) enabled via WAL archiving.
- Hybrid tenant isolation model per BRD: shared database with schema-level isolation and RLS for SMB tenants, dedicated schema for mid-market tenants, and dedicated database instance for enterprise tenants.
- Logical replication hooks reserved for Phase 4 cross-region disaster recovery.

Backups:

- Full backup daily.
- WAL archive continuously for PITR.
- Backup retention aligned with compliance retention policies.

#### 21.3.2 Redis

Redis provides caching, session state, and BullMQ queues.

- Cluster mode enabled for high availability.
- Keyspace partitioning to separate game session cache, auth sessions, and job queues.
- Persistence configured with AOF to mitigate data loss.

#### 21.3.3 Analytics Warehouse (ClickHouse or TimescaleDB)

The analytics warehouse (ClickHouse or TimescaleDB per BRD Section 8.5) stores event telemetry.

- Sharded cluster with replication for high availability.
- Materialized views for daily rollups and compliance dashboards.
- Tiered storage policies for cost optimization.
- Query access controlled by tenant ID filters.

### 21.4 Object Storage

Object storage holds:

- Generated documents (verification packets, intelligence briefs).
- Assets for the game and admin UI.
- SCORM packages and LMS exports.

Key controls:

- Bucket-level encryption with customer-managed keys for enterprise tenants when required.
- Signed URLs with short TTLs for secure asset delivery.
- Lifecycle policies for deletion or archival based on retention settings.

### 21.5 WebSocket and Real-Time Updates

WebSockets (with SSE fallback for corporate proxy environments) are used for:

- Threat alerts and incident notifications.
- Synchronization of session state when multiple devices are active.
- Admin dashboard live updates (campaign progress, training completion).

The WebSocket server runs as part of the Fastify API layer with a dedicated gateway to manage connection counts. SSE is provided as a fallback transport for environments where WebSocket connections are blocked by corporate proxies. Rate limits and heartbeat checks prevent abuse.

### 21.6 Secret and Configuration Management

Configuration is managed via environment variables and a secrets manager. Secrets are never stored in Git or in container images.

- Secrets manager provides per-environment and per-tenant secret scopes.
- Rotation policy: quarterly for standard secrets, monthly for high-sensitivity keys.
- Audit logs for secret access and rotation events.

### 21.7 Build and Artifact Management

- Game client builds are produced in CI and stored in a versioned artifact registry.
- Backend container images are tagged by commit and version.
- Artifact promotion flows from dev to staging to production with immutable tags.

---

## 22. Security Architecture

Security controls are embedded throughout the infrastructure, aligned with the BRD’s emphasis on compliance and enterprise readiness.

### 22.1 Identity and Access Control

- JWT-based authentication with short-lived access tokens.
- Refresh tokens stored in secure, httpOnly cookies for web clients.
- Hardware-backed MFA (FIDO2/WebAuthn) required for Super Admin access per BRD Section 7.4. MFA available for all admin roles.
- Maximum Super Admin session duration: 4 hours with no refresh per BRD Section 7.4.
- RBAC role definitions and ABAC for context-aware decisions.

### 22.2 Network Security

- Public ingress restricted to API and WebSocket endpoints.
- Internal services accessible only through cluster network policies.
- Egress restrictions for worker pods to prevent arbitrary outbound connections.
- OWASP Top 10 compliance for all web application components per BRD Section 7.4. WAF rules to block common OWASP Top 10 attacks.
- Annual penetration testing by third-party firm per BRD Section 7.4.
- Responsible disclosure program per BRD Section 7.4.

### 22.3 Data Security

- Encryption in transit with TLS 1.2+ and strong cipher suites.
- Encryption at rest using AES-256 with jurisdiction-specific key management for all storage layers.
- Tenant data isolation enforced at database and application layers.
- Secure deletion policies for tenant offboarding.

### 22.4 Secure SDLC

- Static analysis for TypeScript code in CI.
- Dependency scanning for known vulnerabilities.
- Automated container image scanning before deployment.
- Optional dynamic testing for staging environments.

### 22.5 Security Monitoring

- Audit logs for admin actions and access to sensitive endpoints.
- Alerting on anomalous authentication failures.
- Rate limiting and IP blocking for suspicious activity.

### 22.6 Incident Response

- Incident playbooks defined for outages, data breaches, and suspicious access.
- Security incident drills executed at least twice per year.
- Integration with external incident response tools through SOAR webhooks.

---

## 23. Compliance Controls and Mapping

The platform must support enterprise compliance requirements from day one. This section provides explicit mapping between platform features and regulatory expectations.

### 23.1 GDPR and EU Data Protection

- Data minimization: only collect data required for gameplay and training metrics.
- Lawful basis: enterprise tenants provide consent or contractual necessity.
- Data subject rights: export and deletion workflows supported.
- DPIA documented for phishing simulations and behavioral analytics.
- 72-hour breach notification capability per BRD Section 9.3 (GDPR obligation).
- Cross-border transfer mechanisms (SCCs, EU-US DPF) per BRD Section 9.3.
- Data residency: EU tenants hosted in EU region with no cross-border transfers.

### 23.2 HIPAA Alignment

- Business Associate Agreement (BAA) available for healthcare tenants.
- Access logs and audit trails maintained for all training interactions.
- PHI is never required for gameplay, reducing exposure.

### 23.3 PCI-DSS Alignment

- Training records and phishing simulations mapped to PCI-DSS 4.0 requirement 12.6.
- Access to compliance reports requires admin role with least privilege.
- Logs retained for required durations and protected from alteration.

### 23.4 NIS2 and DORA Alignment

- Role-based training evidence captured in compliance reports.
- Incident response metrics and reporting timelines aligned with regulatory expectations.
- Data retention policies configurable to meet national implementation requirements.

### 23.5 ISO 27001 and SOC 2 Alignment

- Access control (A.9) enforced through RBAC and MFA.
- Logging and monitoring (A.12) implemented through centralized observability.
- Supplier risk management covered through AI provider fallback strategy.
- SOC 2 trust criteria mapped to security, availability, confidentiality, and processing integrity controls.

### 23.6 Internationalization and Localization Infrastructure

Per BRD Section 7.6, the platform must support:

- Full support for 24 official EU languages (regulatory requirement under GDPR, NIS2) per BRD FR-ENT-044.
- Content localization (not just UI translation) for training modules.
- Cultural adaptation of phishing simulations per locale per BRD FR-ENT-045.
- RTL language support (Arabic, Hebrew, Farsi) per BRD FR-ENT-046.
- Unicode (UTF-8) support across the entire platform.
- Locale-specific date, number, and currency formatting.

Infrastructure implications: content delivery must support locale-specific routing, content storage must accommodate multiple language versions per scenario, and the AI pipeline must generate locale-appropriate phishing content.

### 23.7 FedRAMP Readiness

- Infrastructure design supports separation of duties and security baselines.
- Documentation of controls, SSP preparation, and continuous monitoring planned in Phase 2 to Phase 3.
- Data residency and encryption requirements align with FedRAMP moderate baseline.

---

## 24. Observability Deep Dive

Observability is a compliance, reliability, and product learning requirement. It must be designed to satisfy two distinct audiences: engineering operations and enterprise compliance auditors. The architecture therefore separates raw telemetry, aggregated analytics, and audit trails, while maintaining traceability between them.

### 24.1 Logging Strategy

The logging strategy emphasizes structured, tenant-aware records with correlation IDs.

Log categories:

- Request logs: every API request with method, path, status, latency, tenant ID, user ID, request ID.
- Action logs: game actions, validation outcomes, and phase transitions.
- Integration logs: SSO, SCIM, LMS, SIEM export events and failures.
- Admin logs: tenant configuration changes, compliance export actions, role changes.
- Security logs: authentication failures, permission denials, unusual access patterns.

Log retention policies:

- Operational logs: 30 to 90 days depending on environment.
- Security and audit logs: 12 to 36 months, tenant-configurable.
- Compliance exports: retained to match regulatory requirements.

All logs are redacted to remove sensitive fields (passwords, tokens, MFA codes) and are tagged with a data classification level.

### 24.2 Metrics and Dashboards

Metrics are split into operational metrics and learning metrics.

Operational metrics:

- API latency percentiles (p50, p95, p99).
- Error rate by endpoint and tenant.
- Queue depth and job success rates.
- Database replication lag and connection utilization.
- WebSocket connection count and drop rate.

Learning metrics:

- Decision accuracy by skill category.
- False positive and false negative rates.
- Time-to-decision distributions.
- Incident response quality scores.
- Training completion rates.

Dashboards are provided for:

- Platform health (engineering).
- Tenant health (admin and customer success).
- Compliance readiness (audit and legal).

### 24.3 Tracing and Correlation

Distributed traces provide end-to-end visibility across the API, worker jobs, and database queries. Trace IDs are injected into logs and events to enable correlation. Traces are mandatory for:

- Game action processing.
- Threat engine invocation.
- AI pipeline generation.
- Compliance report exports.

### 24.4 Auditability and Evidence

Audit evidence is stored as immutable, append-only logs with SHA-256 cryptographic integrity verification (per BRD FR-ENT-030). Evidence includes:

- Training completion records with timestamps.
- Content versions used in each session.
- Administrative configuration changes.
- SIEM export histories.

Evidence is exportable in a compliance-ready format and can be re-validated by replaying event logs.

---

## 25. Reliability, Scalability, and Performance Engineering

The system must provide a high-quality consumer experience and enterprise-grade reliability. This requires explicit SLOs, capacity planning, and performance budgets.

### 25.1 Service Level Objectives

Phase 2 SLOs (tiered per BRD):

- API availability: 99.5% monthly (consumer), 99.9% monthly (enterprise standard), 99.95% monthly (enterprise premium).
- Page load time (initial): under 3 seconds on 4G connection per BRD Section 7.1.
- Game state update latency: under 100 ms (P95) per BRD Section 7.1.
- API response time: under 200 ms (P95) per BRD Section 7.1.
- Admin dashboard load time: under 2 seconds (P95) per BRD Section 7.1.
- Email generation (AI): under 10 seconds (pre-generated pool eliminates player-perceived latency) per BRD Section 7.1.
- WebSocket message delivery: under 50 ms (P95) per BRD Section 7.1.
- SCIM sync latency: under 60 seconds per BRD Section 7.1.
- WebSocket availability: 99.5% monthly.
- Analytics dashboard freshness: under 15 minutes for standard reports.

### 25.2 Capacity Planning

Capacity planning is driven by the BRD's Year 1 targets:

- 500,000 registered players.
- 50 enterprise customers.
- Target 100,000 MAU.

BRD scalability phases (Section 7.2):

| Phase | Concurrent Users | Architecture |
|-------|-----------------|--------------|
| Launch | 10,000 | Modular monolith, single-region |
| Growth | 50,000 | Modular monolith with extracted AI pipeline and analytics services |
| Scale | 100,000+ | Microservices with NATS JetStream or Kafka; multi-region deployment |

Service extraction triggers per BRD: AI pipeline extracted when LLM latency affects game loop; analytics extracted when write volume exceeds game DB capacity; threat engine extracted when simulation complexity demands dedicated compute; notification service extracted when WebSocket connections exceed single-process limits.

Capacity assumptions:

- 5% concurrency peak for consumer gameplay.
- 1,000 concurrent enterprise learners during campaign peaks.
- AI pipeline generates 500 to 1,000 new scenarios per week.

Scaling plan:

- API layer scales horizontally with HPA.
- PostgreSQL scaling uses read replicas and partitioning for event logs.
- Analytics warehouse (ClickHouse or TimescaleDB) scaling uses shard expansion and query optimization.

### 25.3 Performance Budgets

Performance budgets are established for critical paths:

- Session load: under 300 ms server-side processing.
- Email decision submission: under 250 ms server-side processing.
- Day advancement: under 1,000 ms for threat processing and response.
- Compliance report generation: under 5 minutes for 10,000 users.

### 25.4 Caching Strategy

Caching follows the four-tier hierarchy defined in BRD Section 8.6: Browser Cache --> CDN Edge (Cloudflare/CloudFront) --> Application Cache (Redis) --> Database (PostgreSQL).

- Static assets cached with content-hashed filenames (1-year TTL) per BRD Section 8.6.
- Player state cached write-through on state change per BRD Section 8.6.
- Redis caches session state snapshots for quick resume.
- Content module caches daily content selections per session seed.
- Admin dashboards cache aggregates for short intervals (1 to 5 minutes).
- CDN caches static assets and documentation.

### 25.5 Load Testing and Simulation

Load tests emulate peak enterprise campaigns and consumer spikes.

- Synthetic load uses recorded event distributions.
- Determinism tests validate repeatability under load.
- Threat engine performance is tested separately to avoid blocking gameplay.

### 25.6 Resilience Patterns

- Circuit breakers for AI provider calls.
- Bulkheads between API and worker layers.
- Backpressure policies on queues to prevent overload.

---

## 26. Data Governance, Retention, and Privacy Operations

Data governance ensures compliance and user trust. It defines classification, retention, and deletion policies aligned with the BRD.

### 26.1 Data Classification

Data is classified into four levels:

- Public: marketing content, public documentation.
- Internal: system metrics without user identifiers.
- Confidential: user profiles, session event logs.
- Restricted: enterprise audit logs, compliance reports, SSO metadata.

### 26.2 Retention Policies

Retention is configurable per tenant. Default policies:

- Session event logs: 24 months.
- Analytics aggregates: 24 months.
- Audit logs: 36 months.
- SCIM and SSO configuration logs: 36 months.

Enterprise tenants can set longer retention for regulatory compliance. Consumer data can be retained for shorter periods with anonymized aggregates preserved.

### 26.3 Data Deletion and Export

- GDPR data subject access requests are handled via automated workflows.
- Deletion requests remove identifiable data while retaining anonymized aggregates for system metrics.
- Exports provide a complete record of a user’s session history and learning outcomes.

### 26.4 Pseudonymization and Anonymization

- Analytics events store user IDs in pseudonymized form when tenant settings require.
- Data exports for SIEM can remove personal identifiers if configured.
- Consumer analytics uses aggregated, anonymized metrics.

### 26.5 Cross-Border Data Controls

- Tenant configuration specifies allowed regions for data storage.
- Data residency enforcement is implemented at database and object storage layers.
- Cross-region replication is disabled unless explicitly allowed.

---

## 27. Integration Testing and Validation

Integration testing is required to verify that the system functions as a coherent whole and preserves deterministic behavior across modules.

### 27.1 Test Environments

- Staging environment mirrors production topology.
- Synthetic tenants and users are created for integration testing.
- Test data is generated to simulate multiple threat tiers and campaigns.

### 27.2 Determinism Tests

- A fixed seed and action sequence are run in multiple environments.
- State hashes are compared at each phase to confirm determinism.
- Event version migrations are validated against historical sessions.

### 27.3 Enterprise Integration Tests

- SCIM provisioning tests create, update, and deactivate users.
- SSO login tests verify IdP interoperability.
- LMS tests verify SCORM 1.2/2004 packaging, xAPI (v1.0.3 and 2.0) statements, LTI 1.3 with Advantage deep linking, cmi5, and AICC HACP.
- SIEM export tests validate event format and delivery reliability.

### 27.4 Performance and Load Tests

- API load tests validate latency and error rates.
- Queue processing tests validate AI pipeline throughput.
- Analytics warehouse (ClickHouse or TimescaleDB) tests validate report generation times.

---

## 28. Operational Runbooks and Support Model

Operational readiness requires defined procedures and escalation paths.

### 28.1 Incident Response Runbooks

Runbooks are documented for:

- API outages.
- Database replication failures.
- Threat engine malfunction.
- AI pipeline degradation.
- Security incidents or suspected breaches.

Each runbook includes detection signals, containment steps, rollback procedures, and customer communication templates.

### 28.2 Change Management

- All production changes require peer review and automated tests.
- High-risk changes (auth, billing, tenant isolation) require staged rollout.
- Emergency changes are documented and reviewed post-incident.

### 28.3 Customer Support Escalation

- Tiered support model: L1 (support), L2 (engineering), L3 (architecture).
- Enterprise support includes defined response times and escalation paths.
- Consumer support uses in-app feedback and community channels.

---

## 29. Phase 2 Implementation Roadmap (Detailed)

This section expands the Phase 2 roadmap with integration and infrastructure sequencing. The goal is to ensure that dependencies are addressed in the correct order.

### 29.1 Month 4 to 5: Multi-Tenancy Foundation

- Implement hybrid tenant isolation model: shared database with schema-level isolation and RLS for SMB, dedicated schema for mid-market, dedicated database instance for enterprise.
- Add tenant context middleware in Fastify with non-nullable `tenant_id` on all tables.
- Build tenant provisioning workflows in admin UI (provisioning target: under 5 minutes).
- Add base RBAC roles and permissions (Super Admin, Tenant Admin, Manager, Trainer, Learner).

### 29.2 Month 5 to 6: Identity and Provisioning

- Implement SAML and OIDC SSO endpoints.
- Build SCIM 2.0 provisioning endpoints.
- Integrate user lifecycle events into analytics.
- Implement MFA for admin roles.

### 29.3 Month 6 to 7: LMS Integration

- Build SCORM 1.2/2004 export pipeline.
- Implement xAPI (v1.0.3 and 2.0) statement emission with LRS integration, including built-in LRS.
- Add LTI 1.3 with LTI Advantage (Deep Linking, Assignment and Grade Services, Names and Role Provisioning Services).
- Implement cmi5 support and AICC HACP for legacy LMS compatibility.

### 29.4 Month 7 to 8: Compliance Reporting and Audit

- Build compliance report generator with framework mapping.
- Implement audit log export and retention settings.
- Add certificate generation and compliance dashboards.

### 29.5 Month 8 to 9: SIEM and Analytics Integration

- Implement Splunk (HTTP Event Collector + REST API, CIM-compliant, certified Splunk App with pre-built dashboards, adaptive response actions) and Microsoft Sentinel (Azure Monitor Data Collector API, custom tables, pre-built workbook with KQL, analytics rules, native data connector) connectors.
- Provide generic webhook, syslog (CEF/LEEF), and HTTPS output for unsupported platforms.
- Optimize analytics dashboards for enterprise scale.
- Note: IBM QRadar and Elastic Security connectors deferred to Phase 4 (months 13-14) per BRD roadmap.

### 29.6 Phase 2 Exit Criteria

- 50 enterprise customers onboarded.
- SOC 2 Type II audit in progress with no critical gaps.
- LMS integration validated by at least two pilot customers.
- SIEM export delivering consistent data with <1% error rate.

---

## 30. Final Alignment Statement

This integration and infrastructure specification is aligned with the BRD vision of a dual-market cybersecurity training game that combines stealth learning with enterprise-grade compliance. The architecture ensures that the core gameplay loop, threat simulation, and terminal UI are integrated into a deterministic, audit-friendly platform that scales across consumer and enterprise audiences. The infrastructure plan provides a credible path to SOC 2 compliance and Phase 4 multi-region data residency without compromising the game’s narrative and educational impact.

---

## 31. Client Platform and Distribution Infrastructure

The platform must deliver a consistent, deterministic gameplay experience across web, Steam, and mobile, while respecting the BRD’s emphasis on accessibility and stealth learning. Infrastructure and integration considerations for each distribution channel are defined here.

### 31.1 Web and PWA Delivery

The web client is the primary delivery mechanism and baseline for all other platforms. It must support:

- Fast initial load through CDN caching and code-splitting.
- Offline play through PWA caching of assets and limited session data.
- Deterministic sync with the backend when connectivity is restored.

Caching strategy:

- Application shell cached with a versioned service worker using Workbox for precaching and runtime caching per BRD Section 8.2.
- Static assets hashed for immutable caching.
- Session snapshots cached locally for offline play, with conflict resolution handled server-side.

Offline behavior:

- The player can continue a session offline if the last snapshot is present.
- Offline content budget: 50 handcrafted email scenarios with graceful degradation when AI content unavailable per BRD Section 8.2.
- Actions are queued locally and replayed when connectivity resumes.
- If the server state changes in the meantime, the event log resolves conflicts using deterministic ordering, with the server as authority.

### 31.2 Steam Distribution

Steam is a key consumer channel. The platform strategy is to package the web client with a lightweight wrapper, ensuring the same game engine and asset pipeline are used.

Integration requirements:

- Steam authentication token can be used to create or link accounts.
- Steam achievements are mapped to the same internal achievement system.
- Steam-specific builds are distributed through the same CI pipeline but with platform-specific configuration and branding.

### 31.3 Mobile Distribution

Mobile builds target iOS and Android with an embedded web view or PWA wrapper. This approach aligns with the BRD’s multi-platform strategy and preserves a single core codebase.

Mobile-specific integration considerations:

- Touch-first UI adjustments as defined in DD-07.
- Push notifications for new daily challenges and enterprise reminders.
- App store compliance with data privacy requirements and disclosure of analytics usage.

### 31.4 Asset and Patch Management

Asset distribution is handled via the CDN with hashed URLs to prevent cache collisions. Patches are delivered as incremental updates:

- Game bundles are versioned by git commit and semantic version.
- Content updates are delivered through the content module without requiring client updates.
- Critical fixes can be hotpatched via feature flags and remote configuration.

### 31.5 Client Telemetry and Privacy

Client telemetry is limited to:

- Session start and end events.
- UI performance metrics (load times, render times).
- Accessibility setting usage for product improvement.

Telemetry is anonymized for consumer users and tenant-scoped for enterprise users.

---

## 32. Configuration and Feature Flag Integration

The platform relies on a configuration layer to support multi-tenant customizations, feature rollouts, and experimentation without destabilizing the core engine.

### 32.1 Configuration Hierarchy

Configuration values are applied in the following order:

1. System defaults (global).
2. Tenant overrides (enterprise-specific).
3. User preferences (accessibility and personalization).
4. Session-level flags (temporary overrides for experiments).

### 32.2 Feature Flag System

Feature flags are managed centrally and evaluated server-side to preserve determinism and auditability. Flags include:

- New content pools or campaigns.
- Experimental threat engine tuning.
- UI variants for accessibility testing.
- Enterprise-only reporting features.

Feature flags are always recorded in the event log so that sessions can be replayed under the same conditions.

### 32.3 White-Labeling and Branding

Enterprise tenants can apply branding in the admin UI and limited branding in the game interface per BRD FR-ENT-005.

Branding controls:

- Logo, colors, fonts, custom domains, and email templates per BRD FR-ENT-005.
- Admin dashboard logos and color accents.
- Game terminal boot message and status bar branding.
- Optional enterprise theme override to reduce the terminal aesthetic.

Branding propagation must complete within 60 seconds of configuration change per BRD FR-ENT-005. All branding configurations are stored per tenant and versioned to allow audit and rollback.

---

## 33. Data Model and Analytics Schema Alignment

A consistent data model across transactional and analytics layers is essential for compliance and business insights. This section defines the alignment strategy for events, analytics, and reporting.

### 33.1 Event Taxonomy

Events are classified into four categories:

- Gameplay events: decisions, outcomes, phase transitions.
- Threat events: attacks, incidents, breaches, campaign changes.
- Operational events: system errors, latency metrics, job failures.
- Compliance events: training completion, certificate issuance, report exports.

Each event includes:

- `event_id` (UUIDv7)
- `session_id`
- `tenant_id`
- `user_id` (pseudonymized if required)
- `event_type`
- `payload`
- `sequence_num`
- `event_version`
- `timestamp`

### 33.2 Analytics Schema Design

The analytics warehouse (ClickHouse or TimescaleDB) schema mirrors the event taxonomy with denormalized tables for fast querying.

Key tables:

- `events_raw`: append-only event ingestion table.
- `events_gameplay_daily`: daily rollups for accuracy, time spent, and session counts.
- `events_threat_daily`: daily rollups for incidents, breaches, and threat tiers.
- `events_compliance`: completion and certificate data.
- `events_admin`: admin actions and configuration changes.

Materialized views generate:

- Department and role-level training performance.
- Trend analysis for phishing susceptibility over time per BRD FR-AN-011.
- Risk heatmaps by department, location, and role for organizational reporting per BRD FR-AN-010.
- CISO dashboard aggregates with risk scoring, compliance posture, and board-ready visualizations per BRD FR-AN-009.
- Cost-of-breach avoidance calculations based on organizational risk reduction per BRD FR-AN-005.
- A/B testing framework data for game mechanics and training content per BRD FR-AN-020.
- Predictive analytics for at-risk players (likely to churn or fail assessments) per BRD FR-AN-021.

### 33.3 Reporting Consistency

Reporting queries always reference `events_raw` for audit validation. Aggregated tables are used for speed but must be reconcilable to raw events. If discrepancies occur, the raw event log is considered authoritative.

### 33.4 Data Quality Controls

- Validation jobs check for missing or out-of-order sequence numbers.
- Duplicate event detection uses event ID and sequence constraints.
- Anomaly detection flags sudden drops in event volume or sudden spikes in errors.

---

## 34. Security Hardening and Infrastructure Baselines

While Section 22 describes security architecture at a high level, this section specifies concrete hardening baselines that must be applied to the platform infrastructure. These baselines are mandatory to support SOC 2 readiness and to reduce risk during enterprise adoption.

### 34.1 Container and Runtime Hardening

- All containers use minimal base images with only required binaries.
- Containers run as non-root users with read-only file systems where possible.
- Linux capabilities are dropped by default and only explicitly added when required.
- Seccomp and AppArmor profiles are enforced for all workloads.
- Image signing is enabled and verified at deployment time.

### 34.2 Network Hardening

- Ingress is restricted to explicitly defined routes.
- Egress filtering prevents uncontrolled outbound traffic, particularly from worker pods.
- Service-to-service communication is restricted by network policy rules.
- Administrative endpoints are isolated and require additional authentication.

### 34.3 Database Hardening

- Database connections use TLS with certificate pinning in production.
- Access to production databases is restricted to approved roles and audited.
- Queries from application services are executed using least privilege accounts.
- Sensitive columns (SSO metadata, API keys) are encrypted at the application layer.

### 34.4 CI/CD and Supply Chain Security

- Build pipeline generates a Software Bill of Materials (SBOM) for each release.
- Dependency scanning runs on every pull request and blocks known critical vulnerabilities.
- Container images are scanned before promotion to production.
- Build artifacts are stored in a private registry with role-based access.

### 34.5 Key Management and Secrets

- Keys are stored in a centralized KMS with per-tenant namespaces when needed.
- Envelope encryption is used for sensitive data stored in PostgreSQL or object storage.
- Key rotation is automated and logged.
- Secrets are never logged or exposed in error responses.

### 34.6 Third-Party Risk Management

Third-party services include AI providers, CDN, and analytics tooling. Controls include:

- Vendor assessments and contractual security obligations.
- Failover strategies for AI providers to avoid service disruption.
- Data minimization in API calls to external services.
- Regular review of vendor compliance attestations.

---

## 35. Integration and Infrastructure Readiness Checklists

The following checklists are used to validate readiness before Phase 2 release. They provide a practical gate for integration completeness and infrastructure stability.

### 35.1 Integration Checklist

- Game engine actions are validated against the DD-01 state machine in all phases.
- Threat engine invocation occurs only during `THREAT_PROCESSING` and produces deterministic results.
- UI panels map one-to-one with state machine phases and do not allow bypassing required actions.
- Content selection is deterministic and versioned.
- AI-generated content is not served without validation.
- Analytics events are emitted for all actions and consequences.
- Enterprise features (SSO, SCIM, LMS, SIEM) function with tenant isolation.

### 35.2 Infrastructure Checklist

- Kubernetes cluster deploys successfully in single primary region (multi-region readiness validated in staging; full multi-region deployment deferred to Phase 4).
- PostgreSQL has PITR enabled and backups tested.
- Redis cluster supports queue and session workloads without data loss.
- Analytics warehouse (ClickHouse or TimescaleDB) ingestion maintains <5 minute lag under load.
- CDN and WAF rules are active and validated.
- Monitoring dashboards and alerting routes are configured.

### 35.3 Compliance Checklist

- Audit logs capture all admin actions and configuration changes.
- Data retention settings are configurable per tenant.
- Privacy workflows for export and deletion are tested.
- SOC 2 readiness artifacts are documented.
- GDPR and NIS2 requirements are mapped to system controls.

### 35.4 Operational Checklist

- Incident response runbooks are reviewed and approved.
- On-call rotation and escalation paths are defined.
- Status page and customer communication templates are prepared.
- Disaster recovery drills completed in staging.

---

## 36. Enterprise Analytics and Compliance Reporting Deep Dive

Enterprise adoption depends on credible, audit-ready reporting. This section clarifies how reporting pipelines are integrated with the core event system while preserving deterministic evidence.

### 36.1 Report Generation Pipeline

Compliance reports are generated from analytics warehouse (ClickHouse or TimescaleDB) aggregates, with traceability to raw events.

Pipeline steps:

1. Report request is submitted through the admin UI.
2. A report job is queued in BullMQ with tenant context and report scope.
3. The analytics module queries analytics warehouse (ClickHouse or TimescaleDB) aggregates for performance and completeness.
4. Raw event references are attached to each report section to allow audit validation.
5. The report is rendered into PDF, CSV, and JSON formats.
6. Report artifacts are stored in object storage with signed URL access.

### 36.2 Report Types

Core report categories include:

- Compliance framework reports (GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, FedRAMP) per BRD FR-AN-013.
- Phishing simulation effectiveness reports.
- Training completion and certification reports.
- Department and role-based risk profiles.

Each report includes:

- Population statistics (number of learners, completion rate).
- Skill outcome metrics (accuracy, reporting rates, response time).
- Narrative summaries for executive audiences.
- Evidence references for auditors.

### 36.3 Evidence Integrity and Verification

Evidence integrity is maintained by:

- Immutable event logs with sequence numbers.
- Report metadata containing event log snapshot references.
- Cryptographic hashes of report artifacts to detect tampering.

Auditors can verify a report by replaying event logs and comparing outcomes to the report output.

### 36.4 Reporting Performance Targets

- Standard reports for 10,000-user tenants should generate in under 5 minutes.
- Exported datasets should be paginated and streamed to avoid memory pressure.
- Reports requested during peak gameplay should be queued with priority to avoid impacting game performance.

### 36.5 Data Privacy in Reporting

- Reports can be generated with anonymized or pseudonymized user identifiers when required.
- Aggregation thresholds prevent identification of individuals in small groups.
- Sensitive data is excluded by default unless explicitly requested by a tenant admin.

---

## 37. Service Extraction Roadmap and Integration Strategy

The modular monolith is designed for eventual service extraction without breaking determinism or analytics consistency. This section defines the extraction path and integration strategy.

### 37.1 Extraction Candidates

1. Threat Engine: computationally intensive and highly scalable. Good candidate for a dedicated service when simulation complexity demands dedicated compute (per BRD Section 7.2).
2. AI Pipeline: can be isolated due to external model dependencies and heavy worker usage. Extracted when LLM latency affects the game loop (per BRD Section 7.2).
3. Analytics: Analytics warehouse (ClickHouse or TimescaleDB) ingestion and reporting workloads can scale independently. Extracted when write volume exceeds game DB capacity (per BRD Section 7.2).
4. Notification Service: WebSocket management and push notifications. Extracted when WebSocket connections exceed single-process limits (per BRD Section 7.2).

### 37.2 Extraction Principles

- Preserve API contracts and event semantics.
- Introduce asynchronous communication via a message bus (NATS JetStream or Kafka per BRD scalability plan) for cross-service events.
- Maintain event ordering guarantees by assigning sequence numbers in the game engine.
- Ensure deterministic results by passing seeds and configuration with each request.

### 37.3 Migration Phases

Phase A: Internal service interface defined within the monolith, with feature flags controlling whether a module runs locally or via RPC.

Phase B: Module deployed as a separate service in the same cluster, using internal networking and shared authentication.

Phase C: Service extracted to separate cluster or region with dedicated scaling and SLOs.

### 37.4 Risk Mitigation

- Dual-run testing where the monolith and extracted service generate results in parallel, comparing outputs.
- Rollback to monolith on discrepancy or performance regression.
- Centralized tracing to maintain observability across service boundaries.

### 37.5 Long-Term Outcome

Service extraction enables scaling the platform to the BRD’s Year 3 targets without sacrificing deterministic game behavior or compliance-grade reporting.

---

## 38. Alignment Summary and Sign-Off Requirements

This document is the integration bridge between BRD intent and executable system architecture. It confirms that the Phase 2 infrastructure and integration plan preserves the stealth-learning vision, keeps the gameplay loop deterministic, and provides the enterprise compliance controls required to sell into regulated industries. It also ensures that the consumer experience remains fast, accessible, and engaging across platforms without fragmenting the product into parallel codebases.

Before Phase 2 implementation begins, the following sign-offs are required:

- Product Management confirms that all integration points align with the BRD narrative and dual-market strategy.
- Engineering Leadership confirms feasibility and staffing for the infrastructure plan.
- Security and Compliance confirm that SOC 2 readiness artifacts and regulatory control mappings are on track.
- Design confirms that UI integration does not compromise accessibility or diegetic consistency.
- Data and Analytics confirm that event schemas, retention policies, and reporting outputs are accurate and auditable.

Sign-off is not a formality. It is a checkpoint that the platform can meet enterprise expectations while retaining the game’s unique narrative identity. Any deviation from this integration plan must be reviewed through a formal change process and reflected in updated design documents.

---

**End of Document**
