# 10 -- Database Schema & Data Model Design Specification

**Project:** The DMZ: Archive Gate  
**Document Type:** Design Document (Waterfall Phase 2)  
**Document ID:** DD-10  
**Version:** 1.0  
**Date:** 2026-02-05  
**Classification:** Internal -- Engineering + Product + Compliance  
**Authors:** Data Architecture & Platform Engineering Team

---

**Table of Contents**

1. Executive Summary
2. Scope and Non-Goals
3. Inputs and Dependencies
4. Data Model Principles
5. Data Architecture Overview
6. Multi-Tenancy, Isolation, and Data Residency
7. Schema Conventions and Cross-Cutting Standards
8. Core Domain Model Overview
9. Tenant, Organization, and Identity Domain
10. Access Control Domain (RBAC + ABAC)
11. Game Session, Event Sourcing, and State Domain
12. Game Content, Documents, and Localization Domain
13. Threat Engine and Incident Response Domain
14. Facility, Resources, and Upgrade Domain
15. Economy, Progression, and Rewards Domain
16. Narrative, Factions, Seasons, and Chapters Domain
17. Multiplayer, Social, and Corporation Domain
18. User-Generated Content Domain
19. Training, Compliance, and Learning Record Domain
20. Phishing Simulation Domain
21. LMS, LTI, SCORM, xAPI, and LRS Domain
22. Analytics and Telemetry Domain
23. Integration, Webhooks, and External Systems Domain
24. Notification and Messaging Domain
25. Billing, Licensing, and Entitlements Domain
26. Audit Logging, Security, and Governance Domain
27. Data Lifecycle, Retention, and Privacy Controls
28. Performance, Indexing, and Partitioning Strategy
29. Migration, Versioning, and Backward Compatibility
30. Appendices (Enums, Reference Tables, Example Queries)

---

**Executive Summary**
The DMZ: Archive Gate is a dual-market product with a single engine serving a consumer game and an enterprise training platform. The database schema and data model must therefore satisfy three simultaneous constraints.

First, the schema must support an immersive, deterministic game loop with event sourcing, replays, and fast state reads while preserving narrative fidelity. Second, the schema must support enterprise-grade compliance evidence, auditability, and strict data governance across multiple regulatory frameworks. Third, the schema must remain modular and scalable, aligning with the modular monolith strategy and future extraction into microservices without breaking data contracts.

This design document defines the authoritative data model for Phase 2 of the waterfall process. It covers operational storage in PostgreSQL, real-time and cache storage in Redis, and analytics storage in ClickHouse or TimescaleDB. It defines tenant isolation, row-level security, data residency controls, append-only audit and game event logs, and explicit structures for every gameplay mechanic, training workflow, and integration surface described in the BRD and supporting design documents.

This model is intentionally verbose and explicit. Its goal is to reduce ambiguity for implementation, QA, compliance review, and enterprise procurement. It is also designed for long-term evolution: every core table includes versioning and migration hooks, and every schema boundary aligns with a backend module so that future service extraction can be done without data rewriting.

---

**Scope and Non-Goals**
Scope includes the logical and physical data model for the operational platform (PostgreSQL), the event sourcing model for the core game loop, and the analytics data model for training outcomes, engagement, and compliance reporting. It includes tenant isolation, authentication and authorization tables, game content and content generation metadata, phishing simulation, LMS integrations, billing, notifications, and audit logging. It also includes data residency and retention controls mandated by GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOC 2, and other frameworks defined in the BRD.

Non-goals include choosing a specific cloud provider, defining Terraform or Kubernetes manifests, or providing an exhaustive physical infrastructure layout. Those concerns are handled in infrastructure design documents and DevOps implementation plans. This document also does not define the UI or API shapes in detail, except where necessary to explain how data is structured and consumed.

---

**Inputs and Dependencies**
This data model is derived from and must remain consistent with:

- BRD-DMZ-2026-001 (Business Requirements Document) in full.
- DD-01 Game Core Loop & State Machine.
- DD-05 Threat Engine & Breach Mechanics.
- DD-07 UI/UX Terminal Aesthetic.
- DD-09 Backend Architecture & API Design.

Where there is a conflict, the BRD is the source of truth. Where details are missing, this document proposes structures that can be refined during implementation, but the overall entity boundaries should remain stable to preserve auditability and cross-system integration.

---

**Data Model Principles**
The schema adheres to the following principles. Each principle is binding and has architectural implications that are reflected in the table designs.

1. Multi-tenancy is mandatory. Every operational table includes a non-nullable `tenant_id`, and every query is subject to row-level security. Tenant isolation is enforced at the database layer, not only in application logic.
2. Event sourcing is canonical for the game engine. Game state is always derived from an immutable event stream, with snapshots used only for performance. Snapshots are never authoritative without an event sequence reference.
3. Auditability is a first-class requirement. Administrative and training actions must be append-only, cryptographically verifiable, and exportable for regulators.
4. Determinism and replayability are required for enterprise trust. The data model must preserve seeds, action sequences, and outcomes in a form that can be replayed deterministically.
5. Data residency is enforced per tenant. Regional partitioning and deployment must prevent unauthorized cross-border data movement. All cross-region transfers are logged.
6. Privacy and compliance are built in. Pseudonymization, configurable retention, data export, and deletion are built into the schema rather than treated as afterthoughts.
7. The schema is modular. Each backend module owns its schema namespace and tables. Cross-module data access occurs via service interfaces, not direct joins.
8. Localization is ubiquitous. All player-facing content, including AI-generated content, must be localizable. The schema includes translation layers for content and metadata.
9. Performance must be predictable. High-write tables use partitioning and narrow indexes. High-read tables use cached snapshots or denormalized materializations.
10. Backward compatibility is preserved. Version fields are included for content, events, and configuration objects so older clients and archived evidence remain interpretable.

---

**Data Architecture Overview**
The data layer is intentionally polyglot, with each store chosen for a specific workload.

Operational store: PostgreSQL 16+ is the primary system of record for all transactional data, game events, training records, configurations, and audit logs. It provides ACID guarantees, row-level security, and rich JSONB support for evolving payloads.

Real-time and cache store: Redis 7.x is used for hot session state, queues, leaderboards, and transient notification fanout. Redis is not authoritative for compliance data or anything requiring retention.

Analytics store: ClickHouse or TimescaleDB holds time-series events and aggregated analytics. It is optimized for large-scale reporting, cohort analysis, and training effectiveness metrics. Analytics data can be rebuilt from canonical event logs if required.

Object storage: Files, attachments, and large binary artifacts (e.g., SCORM packages, certificates, PDF reports, user-uploaded UGC) are stored in object storage. PostgreSQL stores metadata, pointers, and integrity hashes.

Search index: Full-text search indexes are implemented in PostgreSQL for content and templates. External search services may be added later but are not required in Phase 2.

**Redis Data Structures (BRD Section 8.5 and 8.6)**

The BRD defines specific Redis data structures for real-time and cache workloads. These are not stored in PostgreSQL but are documented here for completeness and cross-referencing.

| Key Pattern                    | Data Structure           | Purpose                                                       | BRD Reference    |
| ------------------------------ | ------------------------ | ------------------------------------------------------------- | ---------------- |
| `session:{session_id}`         | Hash                     | Hot session state (ephemeral, auto-expiring)                  | Section 8.5      |
| `email_pool:{difficulty}`      | List (LPUSH/RPOP)        | AI-generated email pool, 20-50 emails per difficulty tier 1-5 | Section 8.5, 8.6 |
| `leaderboard:{scope}:{metric}` | Sorted Set (ZADD/ZRANGE) | Ranked leaderboard queries                                    | Section 8.5      |
| `metrics:{stream_name}`        | Redis Stream             | Real-time metrics with sub-millisecond reads, time-windowed   | Section 8.5      |
| `queue:ai_generation`          | BullMQ (Redis-backed)    | Async AI email generation jobs                                | Section 8.6      |
| `queue:analytics_ingestion`    | BullMQ (Redis-backed)    | Analytics event ingestion                                     | Section 8.6      |
| `queue:notification_dispatch`  | BullMQ (Redis-backed)    | Notification dispatch                                         | Section 8.6      |
| `queue:pdf_report`             | BullMQ (Redis-backed)    | PDF report generation                                         | Section 8.6      |
| `cache:player_state:{user_id}` | String (JSON)            | Write-through player state cache                              | Section 8.6      |

The pre-generation strategy requires maintaining a pool of 20-50 emails per difficulty tier (BRD Section 8.6). The pool is replenished during off-peak hours via BullMQ jobs. The total pre-generated pool must contain 200+ emails across difficulty tiers (BRD FR-GAME-004).

---

**Multi-Tenancy, Isolation, and Data Residency**
Tenant isolation follows the hybrid model defined in the BRD.

- SMB: shared database with schema-level isolation and row-level security.
- Mid-market: dedicated schema in a shared cluster.
- Enterprise: dedicated database instance (and potentially dedicated cluster).

Every table outside of system reference tables includes `tenant_id` as a non-nullable column. PostgreSQL row-level security policies enforce that the `tenant_id` in the session context matches the row. The `tenant_context` middleware in the backend establishes this value, and all queries are executed under an RLS role.

Data residency is enforced by deploying separate clusters per region and assigning each tenant to a region. The `tenants` table includes a `data_region` attribute that is referenced by connection routing logic. Cross-region transfers are prohibited by default, and if they occur due to explicit customer configuration they are logged in a dedicated transfer ledger.

The model also supports “tenant-local encryption keys.” Every tenant may have one or more KMS key identifiers used to encrypt sensitive columns and file objects. Key identifiers are stored in the tenant security profile and referenced by encryption helpers in the data access layer.

---

**Schema Conventions and Cross-Cutting Standards**
The schema follows consistent naming and typing conventions to reduce cognitive load and enable automation.

- All table names are plural and snake_case.
- All primary keys use UUIDv7 in application logic; the database defaults to a UUIDv7 generator (e.g., `uuid_generate_v7()`), or inserts must provide UUIDv7 explicitly.
- All timestamps are stored in `TIMESTAMPTZ` and are UTC by default.
- Soft deletion uses `deleted_at` for entities that require recovery or audit continuity.
- Every table includes `created_at` and `updated_at`, except append-only log tables.
- JSONB is used for extensible fields but is never the only storage for high-value query fields.

Each module owns a schema namespace. Representative namespaces include `auth`, `game`, `content`, `ai`, `facility`, `threat`, `analytics`, `billing`, `admin`, `notification`, `training`, `lrs`, `integration`, `ugc`, and `social`.

Common reference tables live in the `public` schema. These are read-mostly and include regulatory frameworks, locales, country codes, and canonical enumerations.

---

**Core Domain Model Overview**
The platform can be decomposed into a set of core domains, each with explicit entities and relationships.

- Tenant and organization domain: tenants, branding, settings, regions, and retention policies.
- Identity and access domain: users, identities, roles, permissions, and ABAC policies.
- Game domain: sessions, events, emails, decisions, verification packets, and state snapshots.
- Threat domain: attack vectors, campaigns, breaches, incidents, and intelligence briefs.
- Facility domain: resource models, client leases, upgrades, and capacity.
- Content domain: templates, scenarios, documents, and localization layers.
- Economy domain: currencies, wallets, inventories, cosmetics, and season passes.
- Narrative domain: seasons, chapters, factions, and story nodes.
- Multiplayer and social domain: leaderboards, friends, guilds, and match records.
- Training and compliance domain: learning modules, assignments, certificates, and audit records.
- Integration domain: LMS, SIEM, SOAR, HRIS, Slack, Teams, and webhooks.
- Billing domain: subscriptions, entitlements, invoices, and usage.
- Notification domain: preferences, delivery logs, and templates.

The remainder of this document specifies these domains in detail.

---

**Tenant, Organization, and Identity Domain**
This domain defines the foundational entities that represent an organization (tenant), its configuration, and its users. The same model supports both enterprise tenants and the consumer platform, where consumer accounts are treated as members of a special “consumer tenant” with different entitlements.

**Table: `public.tenants`**

| Column      | Type         | Notes                                                                                                                        |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| tenant_id   | UUID PK      | Primary identifier for a tenant. Tenant provisioning must complete in under 5 minutes (BRD FR-ENT-004).                      |
| name        | VARCHAR(255) | Organization display name.                                                                                                   |
| slug        | VARCHAR(64)  | URL-safe identifier, unique.                                                                                                 |
| domain      | VARCHAR(255) | Primary email or SSO domain.                                                                                                 |
| plan_id     | VARCHAR(32)  | Links to `billing.plans`.                                                                                                    |
| branding    | JSONB        | Logo URLs, theme colors, fonts, custom domains, and email template overrides (BRD FR-ENT-005; 60-second propagation target). |
| settings    | JSONB        | Feature flags and tenant-level configuration.                                                                                |
| data_region | VARCHAR(16)  | `eu`, `us`, `uk`, `apac`, etc.                                                                                               |
| is_active   | BOOLEAN      | Deactivation soft-switch.                                                                                                    |
| created_at  | TIMESTAMPTZ  | Created timestamp.                                                                                                           |
| updated_at  | TIMESTAMPTZ  | Updated timestamp.                                                                                                           |

**Table: `public.tenant_security_profiles`**

| Column            | Type         | Notes                                                  |
| ----------------- | ------------ | ------------------------------------------------------ |
| tenant_id         | UUID PK      | FK to `public.tenants`.                                |
| kms_key_id        | VARCHAR(128) | Reference to KMS key for encryption.                   |
| encryption_policy | JSONB        | Column-level encryption choices and rotation settings. |
| mfa_policy        | JSONB        | MFA enforcement for roles and IP ranges.               |
| ip_allowlist      | INET[]       | Optional allowlist for admin access.                   |
| created_at        | TIMESTAMPTZ  | Created timestamp.                                     |
| updated_at        | TIMESTAMPTZ  | Updated timestamp.                                     |

**Table: `public.tenant_retention_policies`**

| Column              | Type        | Notes                                                                             |
| ------------------- | ----------- | --------------------------------------------------------------------------------- |
| tenant_id           | UUID PK     | FK to `public.tenants`.                                                           |
| policy_version      | INT         | Incremented on policy change.                                                     |
| retention_rules     | JSONB       | Map of data type to retention period (configurable 1-7 years per BRD FR-ENT-031). |
| anonymization_rules | JSONB       | Maps to pseudonymization actions.                                                 |
| created_at          | TIMESTAMPTZ | Created timestamp.                                                                |
| updated_at          | TIMESTAMPTZ | Updated timestamp.                                                                |

**Table: `public.tenant_domains`**

| Column              | Type         | Notes                            |
| ------------------- | ------------ | -------------------------------- |
| tenant_id           | UUID         | FK to `public.tenants`.          |
| domain              | VARCHAR(255) | Verified domain.                 |
| verification_status | VARCHAR(16)  | `pending`, `verified`, `failed`. |
| verified_at         | TIMESTAMPTZ  | When domain was verified.        |
| created_at          | TIMESTAMPTZ  | Created timestamp.               |
| updated_at          | TIMESTAMPTZ  | Updated timestamp.               |

**Table: `public.regulatory_frameworks`**

| Column                  | Type           | Notes                                                                                                                                                     |
| ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| framework_id            | VARCHAR(32) PK | `gdpr`, `ccpa`, `hipaa`, `sox`, `pci_dss`, `nis2`, `dora`, `iso_27001`, `nist_csf`, `soc2`, `fedramp`, `glba`, `fisma` (BRD Section 9.1; 14+ frameworks). |
| name                    | VARCHAR(128)   | Display name.                                                                                                                                             |
| default_retention_years | INT            | Recommended retention period.                                                                                                                             |
| is_active               | BOOLEAN        | Enable/disable.                                                                                                                                           |
| created_at              | TIMESTAMPTZ    | Created timestamp.                                                                                                                                        |

**Table: `public.locales`**

| Column    | Type           | Notes                        |
| --------- | -------------- | ---------------------------- |
| locale    | VARCHAR(10) PK | `en`, `de`, `fr`, `ar`, etc. |
| name      | VARCHAR(64)    | Human readable.              |
| rtl       | BOOLEAN        | RTL languages flag.          |
| is_active | BOOLEAN        | Enabled for localization.    |

---

**Identity and Authentication Tables (Schema: `auth`)**
These tables align with DD-09 and represent the canonical user identity model.

**Table: `auth.users`**

| Column         | Type         | Notes                                            |
| -------------- | ------------ | ------------------------------------------------ |
| user_id        | UUID PK      | Primary identifier.                              |
| tenant_id      | UUID         | FK to `public.tenants`.                          |
| email          | VARCHAR(255) | Unique per tenant.                               |
| email_verified | BOOLEAN      | Verified status.                                 |
| password_hash  | VARCHAR(255) | Null for SSO-only users.                         |
| display_name   | VARCHAR(128) | Name shown in UI.                                |
| avatar_url     | VARCHAR(512) | Optional profile image.                          |
| status         | VARCHAR(20)  | `active`, `suspended`, `deactivated`, `pending`. |
| mfa_enabled    | BOOLEAN      | MFA enabled flag.                                |
| mfa_secret     | VARCHAR(255) | Encrypted secret (TOTP).                         |
| last_login_at  | TIMESTAMPTZ  | Last login time.                                 |
| created_at     | TIMESTAMPTZ  | Created timestamp.                               |
| updated_at     | TIMESTAMPTZ  | Updated timestamp.                               |

**Table: `auth.user_profiles`**

| Column                 | Type        | Notes                                         |
| ---------------------- | ----------- | --------------------------------------------- |
| user_id                | UUID PK     | FK to `auth.users`.                           |
| tenant_id              | UUID        | FK to `public.tenants` for RLS.               |
| locale                 | VARCHAR(10) | Preferred locale.                             |
| timezone               | VARCHAR(64) | Preferred time zone.                          |
| accessibility_settings | JSONB       | CRT effects, font overrides, motion settings. |
| notification_settings  | JSONB       | User overrides for notifications.             |
| created_at             | TIMESTAMPTZ | Created timestamp.                            |
| updated_at             | TIMESTAMPTZ | Updated timestamp.                            |

**Table: `auth.identities`**

| Column           | Type         | Notes                                                |
| ---------------- | ------------ | ---------------------------------------------------- |
| identity_id      | UUID PK      | Primary identifier.                                  |
| user_id          | UUID         | FK to `auth.users`.                                  |
| tenant_id        | UUID         | FK to `public.tenants`.                              |
| provider_type    | VARCHAR(16)  | `local`, `saml`, `oidc`, `steam`, `apple`, etc.      |
| provider_subject | VARCHAR(255) | External user identifier.                            |
| email            | VARCHAR(255) | External email address.                              |
| metadata         | JSONB        | IdP attributes, claims, or platform-specific fields. |
| created_at       | TIMESTAMPTZ  | Created timestamp.                                   |

**Table: `auth.sessions`**

| Column        | Type         | Notes                                                                                                 |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------------- |
| session_id    | UUID PK      | Auth session id.                                                                                      |
| user_id       | UUID         | FK to `auth.users`.                                                                                   |
| tenant_id     | UUID         | FK to `public.tenants`.                                                                               |
| refresh_token | VARCHAR(512) | Hashed or encrypted.                                                                                  |
| device_info   | JSONB        | Device fingerprint.                                                                                   |
| ip_address    | INET         | IP address at login.                                                                                  |
| expires_at    | TIMESTAMPTZ  | Expiration. Super Admin sessions must expire after maximum 4 hours with no refresh (BRD Section 7.4). |
| revoked_at    | TIMESTAMPTZ  | Revocation time.                                                                                      |
| created_at    | TIMESTAMPTZ  | Created timestamp.                                                                                    |

**Table: `auth.sso_connections`**

| Column        | Type         | Notes                           |
| ------------- | ------------ | ------------------------------- |
| connection_id | UUID PK      | Connection id.                  |
| tenant_id     | UUID         | FK to `public.tenants`.         |
| provider_type | VARCHAR(16)  | `saml`, `oidc`.                 |
| name          | VARCHAR(128) | Display name.                   |
| config        | JSONB        | IdP metadata, endpoints, certs. |
| is_active     | BOOLEAN      | Active flag.                    |
| created_at    | TIMESTAMPTZ  | Created timestamp.              |

**Table: `auth.scim_connections`**

BRD FR-ENT-008 requires SCIM 2.0 full compliance (RFC 7643/7644) with Okta, Microsoft Entra ID, and Ping Identity. FR-ENT-010 requires sync latency under 60 seconds. This table tracks SCIM provisioning connections and sync status.

| Column                 | Type         | Notes                                                 |
| ---------------------- | ------------ | ----------------------------------------------------- |
| scim_connection_id     | UUID PK      | Connection id.                                        |
| tenant_id              | UUID         | FK to `public.tenants`.                               |
| provider               | VARCHAR(32)  | `okta`, `entra_id`, `ping_identity`, `generic`.       |
| endpoint_url           | TEXT         | SCIM endpoint.                                        |
| bearer_token_hash      | VARCHAR(255) | Hashed bearer token.                                  |
| sync_frequency_seconds | INT          | Sync frequency (minimum 900 per BRD Section 10.3).    |
| last_sync_at           | TIMESTAMPTZ  | Last successful sync.                                 |
| last_sync_latency_ms   | INT          | Last sync latency (target < 60,000ms per FR-ENT-010). |
| is_active              | BOOLEAN      | Active flag.                                          |
| created_at             | TIMESTAMPTZ  | Created timestamp.                                    |

**Table: `auth.api_keys`**

| Column       | Type         | Notes                         |
| ------------ | ------------ | ----------------------------- |
| key_id       | UUID PK      | Key id.                       |
| tenant_id    | UUID         | FK to `public.tenants`.       |
| name         | VARCHAR(128) | Key name.                     |
| key_hash     | VARCHAR(255) | Hash of API key.              |
| key_prefix   | VARCHAR(8)   | First characters for display. |
| scopes       | TEXT[]       | Permissions.                  |
| last_used_at | TIMESTAMPTZ  | Last used.                    |
| expires_at   | TIMESTAMPTZ  | Expiration.                   |
| revoked_at   | TIMESTAMPTZ  | Revocation.                   |
| created_at   | TIMESTAMPTZ  | Created timestamp.            |

**Table: `auth.password_history`**

| Column        | Type         | Notes                                            |
| ------------- | ------------ | ------------------------------------------------ |
| user_id       | UUID         | FK to `auth.users`.                              |
| tenant_id     | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| password_hash | VARCHAR(255) | Prior password hash.                             |
| created_at    | TIMESTAMPTZ  | Recorded timestamp.                              |

**Table: `auth.webauthn_credentials`**

BRD Section 7.4 requires hardware-backed MFA (FIDO2/WebAuthn) for Super Admin access. This table stores registered WebAuthn credentials.

| Column             | Type         | Notes                                   |
| ------------------ | ------------ | --------------------------------------- |
| credential_id      | UUID PK      | Credential id.                          |
| user_id            | UUID         | FK to `auth.users`.                     |
| tenant_id          | UUID         | FK to `public.tenants` for RLS.         |
| credential_key     | BYTEA        | Public key.                             |
| attestation_object | BYTEA        | WebAuthn attestation.                   |
| sign_count         | BIGINT       | Signature counter for replay detection. |
| transports         | TEXT[]       | `usb`, `ble`, `nfc`, `internal`.        |
| aaguid             | VARCHAR(36)  | Authenticator AAGUID.                   |
| name               | VARCHAR(128) | User-assigned credential name.          |
| last_used_at       | TIMESTAMPTZ  | Last use time.                          |
| created_at         | TIMESTAMPTZ  | Created timestamp.                      |

---

**Organization Structure Tables (Schema: `org`)**
Enterprise tenants require organizational hierarchy for RBAC scope, reporting, and training campaign targeting.

**Table: `org.departments`**

| Column               | Type         | Notes                   |
| -------------------- | ------------ | ----------------------- |
| department_id        | UUID PK      | Department id.          |
| tenant_id            | UUID         | FK to `public.tenants`. |
| name                 | VARCHAR(128) | Department name.        |
| parent_department_id | UUID         | Optional parent.        |
| created_at           | TIMESTAMPTZ  | Created timestamp.      |
| updated_at           | TIMESTAMPTZ  | Updated timestamp.      |

**Table: `org.teams`**

| Column        | Type         | Notes                    |
| ------------- | ------------ | ------------------------ |
| team_id       | UUID PK      | Team id.                 |
| tenant_id     | UUID         | FK to `public.tenants`.  |
| department_id | UUID         | FK to `org.departments`. |
| name          | VARCHAR(128) | Team name.               |
| created_at    | TIMESTAMPTZ  | Created timestamp.       |
| updated_at    | TIMESTAMPTZ  | Updated timestamp.       |

**Table: `org.locations`**

| Column       | Type         | Notes                   |
| ------------ | ------------ | ----------------------- |
| location_id  | UUID PK      | Location id.            |
| tenant_id    | UUID         | FK to `public.tenants`. |
| name         | VARCHAR(128) | Office/site name.       |
| country_code | CHAR(2)      | ISO 3166-1 alpha-2.     |
| timezone     | VARCHAR(64)  | Location time zone.     |
| created_at   | TIMESTAMPTZ  | Created timestamp.      |

**Table: `org.user_assignments`**

| Column          | Type         | Notes                           |
| --------------- | ------------ | ------------------------------- |
| user_id         | UUID         | FK to `auth.users`.             |
| tenant_id       | UUID         | FK to `public.tenants` for RLS. |
| department_id   | UUID         | FK to `org.departments`.        |
| team_id         | UUID         | FK to `org.teams`.              |
| location_id     | UUID         | FK to `org.locations`.          |
| manager_user_id | UUID         | FK to `auth.users`.             |
| job_title       | VARCHAR(128) | Job title.                      |
| start_date      | DATE         | Employment start.               |
| end_date        | DATE         | Employment end.                 |
| created_at      | TIMESTAMPTZ  | Created timestamp.              |
| updated_at      | TIMESTAMPTZ  | Updated timestamp.              |

---

**Access Control Domain (Schema: `auth`)**
Access control merges RBAC and ABAC. RBAC roles define coarse permissions, while ABAC policies define conditional access based on tenant attributes, user attributes, or context.

**Table: `auth.roles`**

| Column      | Type        | Notes                                                                                                     |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| role_id     | UUID PK     | Role identifier.                                                                                          |
| tenant_id   | UUID        | Null for system-wide roles.                                                                               |
| name        | VARCHAR(64) | Role name.                                                                                                |
| description | TEXT        | Role description.                                                                                         |
| is_system   | BOOLEAN     | True for built-in roles: `super_admin`, `tenant_admin`, `manager`, `trainer`, `learner` (BRD FR-ENT-011). |
| created_at  | TIMESTAMPTZ | Created timestamp.                                                                                        |

**Table: `auth.permissions`**

| Column        | Type            | Notes                           |
| ------------- | --------------- | ------------------------------- |
| permission_id | VARCHAR(128) PK | Example: `game:session:create`. |
| resource      | VARCHAR(64)     | Resource domain.                |
| action        | VARCHAR(32)     | Action verb.                    |
| description   | TEXT            | Human readable description.     |

**Table: `auth.role_permissions`**

| Column        | Type         | Notes                                                                                           |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| role_id       | UUID         | FK to `auth.roles`.                                                                             |
| tenant_id     | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). Null for system-wide role-permission bindings. |
| permission_id | VARCHAR(128) | FK to `auth.permissions`.                                                                       |
| created_at    | TIMESTAMPTZ  | Created timestamp.                                                                              |

**Table: `auth.user_roles`**

| Column      | Type         | Notes                                            |
| ----------- | ------------ | ------------------------------------------------ |
| user_id     | UUID         | FK to `auth.users`.                              |
| tenant_id   | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| role_id     | UUID         | FK to `auth.roles`.                              |
| scope_type  | VARCHAR(32)  | `department`, `team`, `location`.                |
| scope_value | VARCHAR(128) | Scope key.                                       |
| granted_at  | TIMESTAMPTZ  | When granted.                                    |
| expires_at  | TIMESTAMPTZ  | Optional expiration.                             |
| granted_by  | UUID         | Admin user who granted.                          |

**Table: `auth.abac_policies`**

| Column      | Type         | Notes                                                                                                                                |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| policy_id   | UUID PK      | Policy id.                                                                                                                           |
| tenant_id   | UUID         | FK to `public.tenants`.                                                                                                              |
| name        | VARCHAR(128) | Policy name.                                                                                                                         |
| description | TEXT         | Policy purpose.                                                                                                                      |
| effect      | VARCHAR(8)   | `allow` or `deny`.                                                                                                                   |
| priority    | INT          | Higher priority evaluated first.                                                                                                     |
| conditions  | JSONB        | Attribute conditions. Policy evaluation must complete under 10ms P99 (BRD FR-ENT-015); consider caching evaluated policies in Redis. |
| created_at  | TIMESTAMPTZ  | Created timestamp.                                                                                                                   |
| updated_at  | TIMESTAMPTZ  | Updated timestamp.                                                                                                                   |

**Table: `auth.abac_policy_bindings`**

| Column        | Type         | Notes                                            |
| ------------- | ------------ | ------------------------------------------------ |
| policy_id     | UUID         | FK to `auth.abac_policies`.                      |
| tenant_id     | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| role_id       | UUID         | Optional role binding.                           |
| permission_id | VARCHAR(128) | Optional permission binding.                     |
| created_at    | TIMESTAMPTZ  | Created timestamp.                               |

---

**Game Session, Event Sourcing, and State Domain (Schema: `game`)**
The game domain is event-sourced, deterministic, and aligned with DD-01. The core entities are game sessions, event streams, and state snapshots. All gameplay decisions and system outcomes are expressed as events.

**Table: `game.sessions`**

| Column          | Type        | Notes                                                                          |
| --------------- | ----------- | ------------------------------------------------------------------------------ |
| session_id      | UUID PK     | One per playthrough.                                                           |
| user_id         | UUID        | FK to `auth.users`.                                                            |
| tenant_id       | UUID        | FK to `public.tenants`.                                                        |
| seed            | BIGINT      | Deterministic RNG seed.                                                        |
| status          | VARCHAR(20) | `active`, `paused`, `completed`, `breached`, `abandoned`.                      |
| difficulty_mode | VARCHAR(20) | `adaptive` or future static modes.                                             |
| current_day     | INT         | Current game day.                                                              |
| current_phase   | VARCHAR(32) | State machine phase.                                                           |
| current_funds   | BIGINT      | Credits.                                                                       |
| trust_score     | INT         | Player trust score (0-500+ per BRD Section 11.4).                              |
| threat_level    | VARCHAR(16) | Threat tier: `LOW`, `GUARDED`, `ELEVATED`, `HIGH`, `SEVERE` (BRD FR-GAME-019). |
| snapshot        | JSONB       | Cached state snapshot.                                                         |
| snapshot_seq    | BIGINT      | Sequence number of snapshot.                                                   |
| event_count     | BIGINT      | Number of events.                                                              |
| started_at      | TIMESTAMPTZ | Start timestamp.                                                               |
| last_played_at  | TIMESTAMPTZ | Last activity.                                                                 |
| ended_at        | TIMESTAMPTZ | End timestamp.                                                                 |

**Table: `game.events`**

| Column        | Type        | Notes                     |
| ------------- | ----------- | ------------------------- |
| event_id      | UUID PK     | Event identifier.         |
| session_id    | UUID        | FK to `game.sessions`.    |
| user_id       | UUID        | FK to `auth.users`.       |
| tenant_id     | UUID        | FK to `public.tenants`.   |
| event_type    | VARCHAR(64) | `game.email.opened`, etc. |
| event_data    | JSONB       | Event payload.            |
| event_version | INT         | Payload version.          |
| sequence_num  | BIGINT      | Monotonic per session.    |
| server_time   | TIMESTAMPTZ | Server time.              |
| client_time   | TIMESTAMPTZ | Client time.              |

The `game.events` table is partitioned monthly by `server_time` to manage write volume and retention.

**Table: `game.state_snapshots`**

Snapshots are materialized every 50 events or at day boundaries, as specified in BRD Section 8.5. Snapshots are never authoritative without their corresponding event sequence reference.

| Column       | Type        | Notes                           |
| ------------ | ----------- | ------------------------------- |
| session_id   | UUID        | FK to `game.sessions`.          |
| tenant_id    | UUID        | FK to `public.tenants` for RLS. |
| sequence_num | BIGINT      | Event sequence of snapshot.     |
| state_json   | JSONB       | Full derived state.             |
| created_at   | TIMESTAMPTZ | Snapshot time.                  |

**Table: `game.day_summaries`**

| Column     | Type        | Notes                                  |
| ---------- | ----------- | -------------------------------------- |
| session_id | UUID        | FK to `game.sessions`.                 |
| tenant_id  | UUID        | FK to `public.tenants` for RLS.        |
| day_number | INT         | Game day.                              |
| summary    | JSONB       | Resource changes, incidents, outcomes. |
| created_at | TIMESTAMPTZ | Created timestamp.                     |

**Table: `game.actions`**

| Column      | Type        | Notes                   |
| ----------- | ----------- | ----------------------- |
| action_id   | UUID PK     | Canonical action id.    |
| session_id  | UUID        | FK to `game.sessions`.  |
| user_id     | UUID        | FK to `auth.users`.     |
| tenant_id   | UUID        | FK to `public.tenants`. |
| action_type | VARCHAR(64) | `SUBMIT_DECISION`, etc. |
| payload     | JSONB       | Action details.         |
| created_at  | TIMESTAMPTZ | Action time.            |

The `game.actions` table is optional in strict event-sourcing because all actions are in `game.events`, but it enables fast admin review and additional validation records without unpacking event streams.

---

**Email, Verification, and Decision Tables (Schema: `game`)**
Emails and supporting documents are core gameplay objects. These tables store instantiated emails for a session and track the player's interactions.

**Table: `game.email_instances`**

| Column         | Type         | Notes                        |
| -------------- | ------------ | ---------------------------- |
| email_id       | UUID PK      | Email instance id.           |
| session_id     | UUID         | FK to `game.sessions`.       |
| tenant_id      | UUID         | FK to `public.tenants`.      |
| content_id     | UUID         | FK to `content.items`.       |
| sender_name    | VARCHAR(128) | Display name.                |
| sender_email   | VARCHAR(255) | Sender address.              |
| subject        | VARCHAR(255) | Email subject.               |
| body           | TEXT         | Email body (localized).      |
| difficulty     | INT          | Difficulty 1-5.              |
| category       | VARCHAR(32)  | `phishing`, `legit`, etc.    |
| has_attachment | BOOLEAN      | True if attachments present. |
| has_links      | BOOLEAN      | True if links present.       |
| created_day    | INT          | Day email appears.           |
| expires_day    | INT          | Optional expiry.             |
| generated_by   | VARCHAR(16)  | `handcrafted`, `ai`.         |
| created_at     | TIMESTAMPTZ  | Created timestamp.           |

**Table: `game.email_headers`**

| Column       | Type         | Notes                                            |
| ------------ | ------------ | ------------------------------------------------ |
| email_id     | UUID         | FK to `game.email_instances`.                    |
| tenant_id    | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| header_name  | VARCHAR(128) | Header name.                                     |
| header_value | TEXT         | Header value.                                    |
| created_at   | TIMESTAMPTZ  | Created timestamp.                               |

**Table: `game.email_attachments`**

| Column          | Type         | Notes                                            |
| --------------- | ------------ | ------------------------------------------------ |
| attachment_id   | UUID PK      | Attachment id.                                   |
| email_id        | UUID         | FK to `game.email_instances`.                    |
| tenant_id       | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| filename        | VARCHAR(255) | Attachment name.                                 |
| file_type       | VARCHAR(64)  | MIME type.                                       |
| file_size       | BIGINT       | Size in bytes.                                   |
| object_key      | VARCHAR(512) | Object storage path.                             |
| checksum_sha256 | VARCHAR(64)  | Integrity hash.                                  |
| created_at      | TIMESTAMPTZ  | Created timestamp.                               |

**Table: `game.email_indicators`**

| Column         | Type         | Notes                                            |
| -------------- | ------------ | ------------------------------------------------ |
| indicator_id   | UUID PK      | Indicator id.                                    |
| email_id       | UUID         | FK to `game.email_instances`.                    |
| tenant_id      | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| indicator_type | VARCHAR(64)  | `spoofed_domain`, `urgency`, etc.                |
| is_malicious   | BOOLEAN      | Ground truth.                                    |
| location       | VARCHAR(128) | Optional UI location.                            |
| created_at     | TIMESTAMPTZ  | Created timestamp.                               |

**Table: `game.email_decisions`**

| Column              | Type        | Notes                                              |
| ------------------- | ----------- | -------------------------------------------------- |
| decision_id         | UUID PK     | Decision id.                                       |
| email_id            | UUID        | FK to `game.email_instances`.                      |
| session_id          | UUID        | FK to `game.sessions`.                             |
| tenant_id           | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002).   |
| user_id             | UUID        | FK to `auth.users`.                                |
| decision            | VARCHAR(16) | `approve`, `deny`, `flag`, `request_verification`. |
| time_spent_ms       | BIGINT      | Time spent on decision.                            |
| correct             | BOOLEAN     | Whether decision matched training criteria.        |
| consequence_summary | JSONB       | Revenue and threat impact.                         |
| created_at          | TIMESTAMPTZ | Decision time.                                     |

**Table: `game.verification_packets`**

| Column     | Type        | Notes                                            |
| ---------- | ----------- | ------------------------------------------------ |
| packet_id  | UUID PK     | Packet id.                                       |
| email_id   | UUID        | FK to `game.email_instances`.                    |
| tenant_id  | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| content_id | UUID        | FK to `content.items`.                           |
| status     | VARCHAR(16) | `generated`, `reviewed`, `expired`.              |
| created_at | TIMESTAMPTZ | Created timestamp.                               |

**Table: `game.verification_artifacts`**

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| artifact_id   | UUID PK     | Artifact id.                                     |
| packet_id     | UUID        | FK to `game.verification_packets`.               |
| tenant_id     | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| artifact_type | VARCHAR(64) | `id_doc`, `chain_of_custody`, etc.               |
| payload       | JSONB       | Structured data or reference.                    |
| created_at    | TIMESTAMPTZ | Created timestamp.                               |

**Table: `game.phishing_worksheets`**

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| worksheet_id  | UUID PK     | Worksheet id.                                    |
| email_id      | UUID        | FK to `game.email_instances`.                    |
| tenant_id     | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| player_inputs | JSONB       | Indicators marked, notes, risk notes.            |
| result_score  | REAL        | Scoring for analytics.                           |
| created_at    | TIMESTAMPTZ | Created timestamp.                               |

**Table: `game.threat_assessments`**

| Column         | Type        | Notes                                            |
| -------------- | ----------- | ------------------------------------------------ |
| assessment_id  | UUID PK     | Assessment id.                                   |
| email_id       | UUID        | FK to `game.email_instances`.                    |
| tenant_id      | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| risk_score     | REAL        | Computed risk score.                             |
| recommendation | VARCHAR(16) | `approve`, `deny`, etc.                          |
| created_at     | TIMESTAMPTZ | Created timestamp.                               |

---

**Blacklist/Whitelist Management Tables (Schema: `game`)**
BRD Section 5.4 defines Blacklist/Whitelist Management as a core game mechanic mapping to real-world access control lists and allow/deny policies. BRD Section 5.5 defines in-game documents #9 (Blacklist Notice) and #10 (Whitelist Exception). These tables model the player's managed access control lists and the corresponding in-game documents.

**Table: `game.blacklist_entries`**

| Column      | Type         | Notes                                                     |
| ----------- | ------------ | --------------------------------------------------------- |
| entry_id    | UUID PK      | Blacklist entry id.                                       |
| session_id  | UUID         | FK to `game.sessions`.                                    |
| tenant_id   | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002).          |
| entity_name | VARCHAR(128) | Blocked entity name.                                      |
| entity_type | VARCHAR(32)  | `individual`, `organization`, `domain`, `ip_range`.       |
| faction_id  | VARCHAR(32)  | FK to `story.factions`. Optional.                         |
| reason      | TEXT         | Rationale for blacklisting (BRD Section 5.5 document #9). |
| added_day   | INT          | Game day added.                                           |
| removed_day | INT          | Game day removed (null if still active).                  |
| created_at  | TIMESTAMPTZ  | Created timestamp.                                        |

**Table: `game.whitelist_exceptions`**

| Column          | Type         | Notes                                                                                                  |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| exception_id    | UUID PK      | Whitelist exception id.                                                                                |
| session_id      | UUID         | FK to `game.sessions`.                                                                                 |
| tenant_id       | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002).                                                       |
| entity_name     | VARCHAR(128) | Entity granted emergency access.                                                                       |
| entity_type     | VARCHAR(32)  | `individual`, `organization`, `domain`.                                                                |
| justification   | TEXT         | Emergency access justification.                                                                        |
| approved_by_npc | VARCHAR(128) | NPC who signed the exception (BRD Section 5.5 document #10: emergency access override and signatures). |
| granted_day     | INT          | Game day granted.                                                                                      |
| expires_day     | INT          | Game day expiration.                                                                                   |
| revoked_day     | INT          | Game day revoked (null if still active).                                                               |
| created_at      | TIMESTAMPTZ  | Created timestamp.                                                                                     |

---

**Game Content, Documents, and Localization Domain (Schema: `content`)**
This domain houses templates and narrative artifacts. It supports full localization for 24 EU languages and additional locales for consumer reach.

**Table: `content.items`**

| Column       | Type        | Notes                                                                  |
| ------------ | ----------- | ---------------------------------------------------------------------- |
| content_id   | UUID PK     | Content id.                                                            |
| content_type | VARCHAR(64) | `email_template`, `scenario`, `document_template`, `intel_brief`, etc. |
| version      | INT         | Content version.                                                       |
| status       | VARCHAR(20) | `draft`, `review`, `published`, `archived`.                            |
| difficulty   | INT         | Difficulty 1-5 where applicable.                                       |
| tags         | TEXT[]      | Tagging.                                                               |
| payload      | JSONB       | Template fields and structured content.                                |
| locale       | VARCHAR(10) | Primary locale.                                                        |
| created_by   | UUID        | Author user id.                                                        |
| reviewed_by  | UUID        | Reviewer user id.                                                      |
| created_at   | TIMESTAMPTZ | Created timestamp.                                                     |
| published_at | TIMESTAMPTZ | Published time.                                                        |
| archived_at  | TIMESTAMPTZ | Archived time.                                                         |
| changelog    | TEXT        | Human-readable change notes.                                           |

**Table: `content.localized`**

| Column     | Type        | Notes                      |
| ---------- | ----------- | -------------------------- |
| content_id | UUID        | FK to `content.items`.     |
| locale     | VARCHAR(10) | Locale.                    |
| payload    | JSONB       | Localized content payload. |
| translator | UUID        | Translator user id.        |
| reviewed   | BOOLEAN     | QA review completed.       |
| created_at | TIMESTAMPTZ | Created timestamp.         |

**Table: `content.asset_library`**

| Column          | Type         | Notes                           |
| --------------- | ------------ | ------------------------------- |
| asset_id        | UUID PK      | Asset id.                       |
| content_id      | UUID         | Optional FK to `content.items`. |
| object_key      | VARCHAR(512) | Object storage reference.       |
| mime_type       | VARCHAR(64)  | Asset type.                     |
| checksum_sha256 | VARCHAR(64)  | Integrity hash.                 |
| created_at      | TIMESTAMPTZ  | Created timestamp.              |

The content domain is intentionally independent of tenant-specific records. Content is shared across tenants, but content selection in enterprise mode is filtered by compliance and locale.

---

**AI Pipeline Domain (Schema: `ai`)**
This domain captures metadata around generation, quality control, and prompt management.

**Table: `ai.generation_log`**

| Column          | Type          | Notes                                                                                    |
| --------------- | ------------- | ---------------------------------------------------------------------------------------- |
| generation_id   | UUID PK       | Generation id.                                                                           |
| tenant_id       | UUID          | FK to `public.tenants` for RLS (BRD FR-ENT-002). Null for platform-wide pool generation. |
| provider        | VARCHAR(32)   | `claude_sonnet`, `claude_haiku`, `self_hosted`.                                          |
| model_version   | VARCHAR(64)   | Model version.                                                                           |
| prompt_template | VARCHAR(64)   | Prompt template id.                                                                      |
| input_tokens    | INT           | Input tokens.                                                                            |
| output_tokens   | INT           | Output tokens.                                                                           |
| latency_ms      | INT           | Generation latency.                                                                      |
| quality_score   | REAL          | Quality classification.                                                                  |
| difficulty      | INT           | Difficulty classification.                                                               |
| status          | VARCHAR(16)   | `success`, `failed`, `filtered`.                                                         |
| error_message   | TEXT          | Failure reason if any.                                                                   |
| cost_usd        | NUMERIC(10,6) | Estimated cost.                                                                          |
| created_at      | TIMESTAMPTZ   | Created timestamp.                                                                       |

**Table: `ai.prompt_templates`**

| Column        | Type           | Notes                            |
| ------------- | -------------- | -------------------------------- |
| template_id   | VARCHAR(64) PK | Template id.                     |
| version       | INT            | Version.                         |
| category      | VARCHAR(32)    | `phishing`, `legit`, `scenario`. |
| system_prompt | TEXT           | System instructions.             |
| user_template | TEXT           | User prompt template.            |
| output_schema | JSONB          | JSON schema for outputs.         |
| guardrails    | JSONB          | Validation rules and filters.    |
| is_active     | BOOLEAN        | Active flag.                     |
| created_at    | TIMESTAMPTZ    | Created timestamp.               |

---

**Threat Engine and Incident Response Domain (Schema: `threat`)**
This domain is aligned with DD-05. It stores attack instances, campaigns, breaches, and incident records. The threat engine operates on player state but persists outcomes for audit and analytics.

**Table: `threat.attack_vectors`**

| Column          | Type         | Notes                                       |
| --------------- | ------------ | ------------------------------------------- |
| vector_id       | UUID PK      | Attack vector id.                           |
| category        | VARCHAR(32)  | `phishing`, `supply_chain`, `insider`, etc. |
| name            | VARCHAR(128) | Display name.                               |
| description     | TEXT         | Description.                                |
| difficulty      | INT          | 1-5.                                        |
| mitre_ids       | TEXT[]       | MITRE ATT&CK references.                    |
| min_threat_tier | VARCHAR(16)  | `LOW`, `GUARDED`, etc.                      |
| base_weight     | REAL         | Selection weight.                           |
| created_at      | TIMESTAMPTZ  | Created timestamp.                          |

**Table: `threat.attacks`**

| Column       | Type        | Notes                                          |
| ------------ | ----------- | ---------------------------------------------- |
| attack_id    | UUID PK     | Attack id.                                     |
| session_id   | UUID        | FK to `game.sessions`.                         |
| tenant_id    | UUID        | FK to `public.tenants`.                        |
| vector       | VARCHAR(64) | Attack vector category.                        |
| severity     | INT         | 1-10.                                          |
| day          | INT         | Game day.                                      |
| phase        | VARCHAR(32) | Phase label.                                   |
| status       | VARCHAR(16) | `pending`, `active`, `mitigated`, `succeeded`. |
| mitigated_by | VARCHAR(64) | Security tool id.                              |
| created_at   | TIMESTAMPTZ | Created timestamp.                             |

**Table: `threat.campaigns`**

| Column              | Type         | Notes                                                      |
| ------------------- | ------------ | ---------------------------------------------------------- |
| campaign_id         | UUID PK      | Campaign id.                                               |
| tenant_id           | UUID         | FK to `public.tenants` for RLS.                            |
| session_id          | UUID         | FK to `game.sessions`.                                     |
| name                | VARCHAR(128) | Campaign name.                                             |
| faction_id          | VARCHAR(32)  | Faction identifier.                                        |
| status              | VARCHAR(16)  | `dormant`, `active`, `succeeded`, `defeated`, `abandoned`. |
| start_day           | INT          | Start day.                                                 |
| current_phase_index | INT          | Phase index.                                               |
| narrative_arc       | JSONB        | Narrative description.                                     |
| created_at          | TIMESTAMPTZ  | Created timestamp.                                         |

**Table: `threat.campaign_phases`**

| Column          | Type         | Notes                                            |
| --------------- | ------------ | ------------------------------------------------ |
| phase_id        | UUID PK      | Phase id.                                        |
| campaign_id     | UUID         | FK to `threat.campaigns`.                        |
| tenant_id       | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| name            | VARCHAR(128) | Phase name.                                      |
| duration_min    | INT          | Minimum days.                                    |
| duration_max    | INT          | Maximum days.                                    |
| attack_category | VARCHAR(32)  | Required vector.                                 |
| sophistication  | INT          | 1-5.                                             |
| objectives      | TEXT[]       | Phase objectives.                                |
| created_at      | TIMESTAMPTZ  | Created timestamp.                               |

**Table: `threat.breaches`**

| Column         | Type        | Notes                                                                                                                |
| -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| breach_id      | UUID PK     | Breach id.                                                                                                           |
| tenant_id      | UUID        | FK to `public.tenants` for RLS.                                                                                      |
| session_id     | UUID        | FK to `game.sessions`.                                                                                               |
| attack_id      | UUID        | FK to `threat.attacks`.                                                                                              |
| severity       | INT         | 1-4.                                                                                                                 |
| ransom_amount  | BIGINT      | Credits demanded (total lifetime earnings / 10, rounded up, minimum 1 CR per BRD FR-GAME-016).                       |
| player_can_pay | BOOLEAN     | Affordability.                                                                                                       |
| recovery_days  | INT         | Recovery duration (1-7 days, scales with security tooling and staff per BRD FR-GAME-018).                            |
| consequences   | JSONB       | Trust Score penalty, 10-40% client attrition, 30-day post-breach revenue depression (BRD FR-GAME-017, Section 11.4). |
| created_at     | TIMESTAMPTZ | Breach time.                                                                                                         |

**Table: `threat.incidents`**

| Column           | Type        | Notes                                                                      |
| ---------------- | ----------- | -------------------------------------------------------------------------- |
| incident_id      | UUID PK     | Incident id.                                                               |
| tenant_id        | UUID        | FK to `public.tenants` for RLS.                                            |
| session_id       | UUID        | FK to `game.sessions`.                                                     |
| attack_id        | UUID        | FK to `threat.attacks`.                                                    |
| detection_source | VARCHAR(32) | `manual` or tool id.                                                       |
| classification   | VARCHAR(32) | Attack category.                                                           |
| severity         | INT         | 1-4.                                                                       |
| status           | VARCHAR(16) | `open`, `investigating`, `contained`, `eradicated`, `recovered`, `closed`. |
| evidence         | JSONB       | Evidence list.                                                             |
| response_actions | JSONB       | Actions taken.                                                             |
| outcome          | JSONB       | Outcome data.                                                              |
| created_at       | TIMESTAMPTZ | Created timestamp.                                                         |

---

**Facility, Resources, and Upgrade Domain (Schema: `facility`)**
This domain simulates data center capacity and upgrades.

**Table: `facility.states`**

| Column          | Type        | Notes                                                 |
| --------------- | ----------- | ----------------------------------------------------- |
| session_id      | UUID PK     | FK to `game.sessions`.                                |
| tenant_id       | UUID        | FK to `public.tenants` for RLS.                       |
| tier            | VARCHAR(16) | `outpost`, `station`, `vault`, `fortress`, `citadel`. |
| rack_capacity_u | INT         | Total rack capacity.                                  |
| rack_used_u     | INT         | Used capacity.                                        |
| power_budget_kw | REAL        | Power capacity.                                       |
| power_used_kw   | REAL        | Power used.                                           |
| cooling_tons    | REAL        | Cooling capacity.                                     |
| cooling_used    | REAL        | Cooling used.                                         |
| bandwidth_mbps  | REAL        | Bandwidth capacity.                                   |
| bandwidth_used  | REAL        | Bandwidth used.                                       |
| updated_at      | TIMESTAMPTZ | Updated timestamp.                                    |

**Table: `facility.clients`**

| Column          | Type         | Notes                                                                                                                       |
| --------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| client_id       | UUID PK      | Client id.                                                                                                                  |
| tenant_id       | UUID         | FK to `public.tenants` for RLS.                                                                                             |
| session_id      | UUID         | FK to `game.sessions`.                                                                                                      |
| name            | VARCHAR(128) | Client name.                                                                                                                |
| organization    | VARCHAR(128) | Client org.                                                                                                                 |
| faction_id      | VARCHAR(32)  | FK to `story.factions` (BRD Section 5.2: Sovereign Compact, Nexion Industries, Librarians, hacktivists, criminal networks). |
| rack_u          | INT          | Rack usage.                                                                                                                 |
| power_kw        | REAL         | Power usage.                                                                                                                |
| cooling_tons    | REAL         | Cooling usage.                                                                                                              |
| bandwidth_mbps  | REAL         | Bandwidth usage.                                                                                                            |
| payment_per_day | BIGINT       | Revenue per day.                                                                                                            |
| lease_start_day | INT          | Lease start.                                                                                                                |
| lease_end_day   | INT          | Lease end.                                                                                                                  |
| trust_level     | INT          | Client trust.                                                                                                               |
| is_legitimate   | BOOLEAN      | Legitimate flag.                                                                                                            |
| onboarded_at    | TIMESTAMPTZ  | Onboarded timestamp.                                                                                                        |

**Table: `facility.upgrades`**

| Column                    | Type        | Notes                                                                                                                                                                                                          |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| upgrade_id                | VARCHAR(64) | Upgrade identifier.                                                                                                                                                                                            |
| tenant_id                 | UUID        | FK to `public.tenants` for RLS.                                                                                                                                                                                |
| session_id                | UUID        | FK to `game.sessions`.                                                                                                                                                                                         |
| category                  | VARCHAR(32) | `infrastructure` (racks, cooling, power, bandwidth) or `security_tool` (firewall, IDS, IPS, SIEM, EDR, WAF, threat intel feed, SOAR, honeypots, zero-trust gateway, AI anomaly detection) per BRD FR-GAME-011. |
| status                    | VARCHAR(16) | `available`, `purchased`, `installing`, `completed`.                                                                                                                                                           |
| purchased_day             | INT         | Day purchased.                                                                                                                                                                                                 |
| completes_day             | INT         | Day completed.                                                                                                                                                                                                 |
| cost                      | BIGINT      | Upgrade cost (one-time).                                                                                                                                                                                       |
| recurring_cost_per_day    | BIGINT      | Recurring operational cost for security tools (BRD FR-GAME-012).                                                                                                                                               |
| threat_vectors_introduced | TEXT[]      | New threat vectors introduced by this upgrade (BRD FR-GAME-013).                                                                                                                                               |
| created_at                | TIMESTAMPTZ | Created timestamp.                                                                                                                                                                                             |

---

**Economy, Progression, and Rewards Domain (Schema: `economy`)**
The economy domain tracks currencies, player progression, cosmetics, and season passes. It supports both consumer and enterprise modes with a strict no-pay-to-win policy.

**Table: `economy.wallets`**

| Column          | Type        | Notes                                                                            |
| --------------- | ----------- | -------------------------------------------------------------------------------- |
| user_id         | UUID PK     | FK to `auth.users`.                                                              |
| tenant_id       | UUID        | FK to `public.tenants`.                                                          |
| credits         | BIGINT      | Credits balance.                                                                 |
| trust_score     | INT         | Trust score (0-500+ per BRD Section 11.4; reputation gate, cannot be purchased). |
| intel_fragments | BIGINT      | Intel fragments.                                                                 |
| updated_at      | TIMESTAMPTZ | Updated timestamp.                                                               |

**Table: `economy.transactions`**

| Column         | Type         | Notes                                           |
| -------------- | ------------ | ----------------------------------------------- |
| transaction_id | UUID PK      | Transaction id.                                 |
| user_id        | UUID         | FK to `auth.users`.                             |
| tenant_id      | UUID         | FK to `public.tenants`.                         |
| currency       | VARCHAR(16)  | `credits`, `trust`, `intel`.                    |
| amount         | BIGINT       | Positive or negative.                           |
| reason         | VARCHAR(128) | `upgrade_purchase`, `reward`, `ransom_payment`. |
| metadata       | JSONB        | Context for audit.                              |
| created_at     | TIMESTAMPTZ  | Created timestamp.                              |

**Table: `economy.levels`**

| Column         | Type        | Notes                                                                     |
| -------------- | ----------- | ------------------------------------------------------------------------- |
| user_id        | UUID PK     | FK to `auth.users`.                                                       |
| tenant_id      | UUID        | FK to `public.tenants` for RLS.                                           |
| level          | INT         | Player level (1-30, Intern to CISO).                                      |
| xp             | BIGINT      | XP total.                                                                 |
| prestige_level | INT         | Prestige tier (levels 31-50 per BRD Section 11.4; cosmetic rewards only). |
| updated_at     | TIMESTAMPTZ | Updated timestamp.                                                        |

**Table: `economy.achievements`**

| Column         | Type           | Notes                                 |
| -------------- | -------------- | ------------------------------------- |
| achievement_id | VARCHAR(64) PK | Achievement id.                       |
| name           | VARCHAR(128)   | Display name.                         |
| description    | TEXT           | Description.                          |
| category       | VARCHAR(64)    | `phishing`, `incident_response`, etc. |
| hidden         | BOOLEAN        | Hidden flag.                          |
| created_at     | TIMESTAMPTZ    | Created timestamp.                    |

**Table: `economy.user_achievements`**

| Column         | Type        | Notes                           |
| -------------- | ----------- | ------------------------------- |
| user_id        | UUID        | FK to `auth.users`.             |
| tenant_id      | UUID        | FK to `public.tenants` for RLS. |
| achievement_id | VARCHAR(64) | FK to `economy.achievements`.   |
| unlocked_at    | TIMESTAMPTZ | Unlock time.                    |

**Table: `economy.inventory`**

| Column      | Type        | Notes                                |
| ----------- | ----------- | ------------------------------------ |
| item_id     | UUID PK     | Inventory item id.                   |
| user_id     | UUID        | FK to `auth.users`.                  |
| tenant_id   | UUID        | FK to `public.tenants` for RLS.      |
| item_type   | VARCHAR(32) | `cosmetic`, `theme`, `insignia`.     |
| item_ref    | VARCHAR(64) | Reference id.                        |
| acquired_at | TIMESTAMPTZ | Acquired time.                       |
| source      | VARCHAR(32) | `purchase`, `reward`, `season_pass`. |

**Table: `economy.season_passes`**

| Column         | Type        | Notes                           |
| -------------- | ----------- | ------------------------------- |
| season_pass_id | UUID PK     | Season pass id.                 |
| user_id        | UUID        | FK to `auth.users`.             |
| tenant_id      | UUID        | FK to `public.tenants` for RLS. |
| season_id      | UUID        | FK to `story.seasons`.          |
| tier           | VARCHAR(16) | `free`, `premium`.              |
| purchased_at   | TIMESTAMPTZ | Purchase time.                  |
| expires_at     | TIMESTAMPTZ | Expiration time.                |

---

**Narrative, Factions, Seasons, and Chapters Domain (Schema: `story`)**
The narrative domain encodes the seasonal structure, chapters, and faction relations in the BRD.

**Table: `story.seasons`**

| Column     | Type         | Notes                                                                                                                                              |
| ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| season_id  | UUID PK      | Season id.                                                                                                                                         |
| name       | VARCHAR(128) | Season name.                                                                                                                                       |
| theme      | VARCHAR(128) | Threat theme (BRD FR-CON-006: S1 Signal Loss/Stuxnet, S2 Supply Lines/SolarWinds, S3 Dark Channels/Ransomware, S4 The Inside Job/Insider Threats). |
| start_date | DATE         | Start date.                                                                                                                                        |
| end_date   | DATE         | End date.                                                                                                                                          |
| status     | VARCHAR(16)  | `planned`, `active`, `archived`.                                                                                                                   |
| created_at | TIMESTAMPTZ  | Created timestamp.                                                                                                                                 |

**Table: `story.chapters`**

| Column         | Type         | Notes                                                                                                                                                                       |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chapter_id     | UUID PK      | Chapter id.                                                                                                                                                                 |
| season_id      | UUID         | FK to `story.seasons`.                                                                                                                                                      |
| chapter_number | INT          | 1-11.                                                                                                                                                                       |
| title          | VARCHAR(128) | Title.                                                                                                                                                                      |
| summary        | TEXT         | Narrative summary.                                                                                                                                                          |
| act            | VARCHAR(16)  | `setup`, `escalation`, `crisis`, `finale` (BRD Section 11.3).                                                                                                               |
| structure      | JSONB        | Chapter content structure per FR-CON-007: narrative briefing, 3-5 core access decisions, 1 incident event, 1 intelligence update, 1 character moment, optional side quests. |
| required_level | INT          | Player level gating.                                                                                                                                                        |
| created_at     | TIMESTAMPTZ  | Created timestamp.                                                                                                                                                          |

**Table: `story.factions`**

| Column         | Type           | Notes                                                                                                         |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| faction_id     | VARCHAR(32) PK | `sovereign_compact`, `nexion_industries`, `librarians`, `hacktivists`, `criminal_networks` (BRD Section 5.2). |
| name           | VARCHAR(128)   | Faction name.                                                                                                 |
| description    | TEXT           | Narrative role.                                                                                               |
| sophistication | INT            | 1-5.                                                                                                          |
| resources      | INT            | 1-5.                                                                                                          |
| created_at     | TIMESTAMPTZ    | Created timestamp.                                                                                            |

**Table: `story.faction_relations`**

| Column           | Type        | Notes                                                                                                                                                                   |
| ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user_id          | UUID        | FK to `auth.users`.                                                                                                                                                     |
| session_id       | UUID        | FK to `game.sessions`. Faction relations are per-playthrough state tied to the Reputation System (BRD Section 11.3: five faction axes with threshold-triggered events). |
| tenant_id        | UUID        | FK to `public.tenants` for RLS.                                                                                                                                         |
| faction_id       | VARCHAR(32) | FK to `story.factions`.                                                                                                                                                 |
| relation_score   | INT         | Relationship score.                                                                                                                                                     |
| last_updated_day | INT         | Game day last updated.                                                                                                                                                  |
| updated_at       | TIMESTAMPTZ | Updated timestamp.                                                                                                                                                      |

---

**Multiplayer, Social, and Corporation Domain (Schema: `social`)**
The social domain supports friends, leaderboards, and corporate teams. It applies to consumer and enterprise contexts with optional visibility controls.

**Table: `social.friends`**

| Column         | Type        | Notes                             |
| -------------- | ----------- | --------------------------------- |
| user_id        | UUID        | FK to `auth.users`.               |
| tenant_id      | UUID        | FK to `public.tenants` for RLS.   |
| friend_user_id | UUID        | FK to `auth.users`.               |
| status         | VARCHAR(16) | `pending`, `accepted`, `blocked`. |
| created_at     | TIMESTAMPTZ | Created timestamp.                |

**Table: `social.leaderboards`**

| Column           | Type         | Notes                                                                                                                                               |
| ---------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| leaderboard_id   | UUID PK      | Leaderboard id.                                                                                                                                     |
| tenant_id        | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). Null for global leaderboards.                                                                      |
| name             | VARCHAR(128) | Display name.                                                                                                                                       |
| scope            | VARCHAR(32)  | `global`, `region`, `tenant`, `department`.                                                                                                         |
| metric           | VARCHAR(64)  | `trust_score`, `skill_rating`.                                                                                                                      |
| privacy_settings | JSONB        | Configurable privacy settings for organization-wide leaderboards (BRD FR-MP-016): visibility controls, anonymization options, opt-in/opt-out flags. |
| season_id        | UUID         | Optional season scope.                                                                                                                              |
| created_at       | TIMESTAMPTZ  | Created timestamp.                                                                                                                                  |

**Table: `social.leaderboard_entries`**

| Column         | Type        | Notes                           |
| -------------- | ----------- | ------------------------------- |
| leaderboard_id | UUID        | FK to `social.leaderboards`.    |
| user_id        | UUID        | FK to `auth.users`.             |
| tenant_id      | UUID        | FK to `public.tenants` for RLS. |
| score          | BIGINT      | Score value.                    |
| rank           | INT         | Cached rank.                    |
| updated_at     | TIMESTAMPTZ | Updated timestamp.              |

**Table: `social.corporations`**

| Column                | Type         | Notes                                                                                  |
| --------------------- | ------------ | -------------------------------------------------------------------------------------- |
| corp_id               | UUID PK      | Corporation id.                                                                        |
| tenant_id             | UUID         | FK to `public.tenants`.                                                                |
| name                  | VARCHAR(128) | Corporation name.                                                                      |
| description           | TEXT         | Description.                                                                           |
| level                 | INT          | Corporation progression level.                                                         |
| treasury_credits      | BIGINT       | Shared corporation treasury (FR-MP-013).                                               |
| shared_infrastructure | JSONB        | Shared assets: SIEM dashboard, joint honeypot network, intelligence feeds (FR-MP-013). |
| created_at            | TIMESTAMPTZ  | Created timestamp.                                                                     |
| updated_at            | TIMESTAMPTZ  | Updated timestamp.                                                                     |

**Table: `social.corp_alliances`**

| Column      | Type         | Notes                                                                                      |
| ----------- | ------------ | ------------------------------------------------------------------------------------------ |
| alliance_id | UUID PK      | Alliance id.                                                                               |
| tenant_id   | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). Null for cross-tenant consumer alliances. |
| name        | VARCHAR(128) | Alliance name.                                                                             |
| created_at  | TIMESTAMPTZ  | Created timestamp.                                                                         |

**Table: `social.corp_alliance_members`**

| Column      | Type        | Notes                                            |
| ----------- | ----------- | ------------------------------------------------ |
| alliance_id | UUID        | FK to `social.corp_alliances`.                   |
| corp_id     | UUID        | FK to `social.corporations`.                     |
| tenant_id   | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| joined_at   | TIMESTAMPTZ | Joined time.                                     |

**Table: `social.corp_members`**

| Column    | Type        | Notes                           |
| --------- | ----------- | ------------------------------- |
| corp_id   | UUID        | FK to `social.corporations`.    |
| user_id   | UUID        | FK to `auth.users`.             |
| tenant_id | UUID        | FK to `public.tenants` for RLS. |
| role      | VARCHAR(32) | `leader`, `member`.             |
| joined_at | TIMESTAMPTZ | Joined time.                    |

**Table: `social.matches`**

| Column          | Type        | Notes                                                                                                                                                               |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| match_id        | UUID PK     | Match id.                                                                                                                                                           |
| tenant_id       | UUID        | FK to `public.tenants` for RLS.                                                                                                                                     |
| mode            | VARCHAR(32) | `coop`, `pvp`, `asymmetric_assault`, `purple_team` (BRD FR-MP-005 through FR-MP-007).                                                                               |
| is_ranked       | BOOLEAN     | Whether this match is a ranked match with Elo-based matchmaking (BRD FR-MP-008). Ranked matches update independent Red/Blue ratings in `analytics.player_profiles`. |
| difficulty_tier | VARCHAR(16) | `training`, `standard`, `hardened`, `nightmare` (FR-MP-004).                                                                                                        |
| min_players     | INT         | Minimum players (2 for coop per FR-MP-001; 2 for PvP).                                                                                                              |
| max_players     | INT         | Maximum players (6 for coop per FR-MP-001; asymmetric: 1 attacker + 3-5 defenders per FR-MP-006).                                                                   |
| scenario        | VARCHAR(64) | Cooperative scenario: `cascade_failure`, `bandwidth_siege`, `the_insider`, `data_exodus` (FR-MP-003).                                                               |
| status          | VARCHAR(16) | `pending`, `active`, `completed`.                                                                                                                                   |
| started_at      | TIMESTAMPTZ | Start time.                                                                                                                                                         |
| ended_at        | TIMESTAMPTZ | End time.                                                                                                                                                           |

**Table: `social.match_participants`**

| Column     | Type        | Notes                                                                                                                                |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| match_id   | UUID        | FK to `social.matches`.                                                                                                              |
| user_id    | UUID        | FK to `auth.users`.                                                                                                                  |
| tenant_id  | UUID        | FK to `public.tenants` for RLS.                                                                                                      |
| team       | VARCHAR(16) | `red`, `blue`, `neutral`.                                                                                                            |
| role       | VARCHAR(32) | SOC role: `perimeter_warden`, `intake_analyst`, `threat_hunter`, `systems_keeper`, `crypto_warden`, `comms_officer` (BRD FR-MP-002). |
| score      | BIGINT      | Participant score.                                                                                                                   |
| created_at | TIMESTAMPTZ | Created timestamp.                                                                                                                   |

**Table: `social.competitive_events`**

BRD FR-MP-018 requires capture-the-flag events, seasonal tournaments, and hackathon events. This table models all competitive event types.

| Column     | Type         | Notes                                                          |
| ---------- | ------------ | -------------------------------------------------------------- |
| event_id   | UUID PK      | Event id.                                                      |
| tenant_id  | UUID         | Null for global events; FK to `public.tenants` for enterprise. |
| name       | VARCHAR(128) | Event name.                                                    |
| event_type | VARCHAR(32)  | `ctf`, `tournament`, `hackathon`.                              |
| season_id  | UUID         | Optional FK to `story.seasons`.                                |
| status     | VARCHAR(16)  | `scheduled`, `active`, `completed`, `cancelled`.               |
| rules      | JSONB        | Event-specific rules and scoring.                              |
| start_at   | TIMESTAMPTZ  | Scheduled start.                                               |
| end_at     | TIMESTAMPTZ  | Scheduled end.                                                 |
| created_at | TIMESTAMPTZ  | Created timestamp.                                             |

**Table: `social.competitive_event_participants`**

| Column     | Type        | Notes                                            |
| ---------- | ----------- | ------------------------------------------------ |
| event_id   | UUID        | FK to `social.competitive_events`.               |
| user_id    | UUID        | FK to `auth.users`.                              |
| tenant_id  | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| team_id    | UUID        | Optional team grouping within event.             |
| score      | BIGINT      | Participant score.                               |
| rank       | INT         | Final rank.                                      |
| created_at | TIMESTAMPTZ | Registration time.                               |

---

**User-Generated Content Domain (Schema: `ugc`)**
UGC supports community-created threat packs and scenarios, with moderation and marketplace workflows.

**Table: `ugc.projects`**

| Column      | Type         | Notes                                         |
| ----------- | ------------ | --------------------------------------------- |
| project_id  | UUID PK      | UGC project id.                               |
| user_id     | UUID         | FK to `auth.users`.                           |
| tenant_id   | UUID         | FK to `public.tenants` for RLS.               |
| name        | VARCHAR(128) | Project name.                                 |
| description | TEXT         | Description.                                  |
| status      | VARCHAR(16)  | `draft`, `submitted`, `approved`, `rejected`. |
| created_at  | TIMESTAMPTZ  | Created timestamp.                            |

**Table: `ugc.versions`**

| Column          | Type        | Notes                                            |
| --------------- | ----------- | ------------------------------------------------ |
| version_id      | UUID PK     | Version id.                                      |
| project_id      | UUID        | FK to `ugc.projects`.                            |
| tenant_id       | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| content_payload | JSONB       | Scenario data.                                   |
| created_at      | TIMESTAMPTZ | Created timestamp.                               |

**Table: `ugc.reviews`**

| Column      | Type        | Notes                                            |
| ----------- | ----------- | ------------------------------------------------ |
| review_id   | UUID PK     | Review id.                                       |
| project_id  | UUID        | FK to `ugc.projects`.                            |
| tenant_id   | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| reviewer_id | UUID        | FK to `auth.users`.                              |
| status      | VARCHAR(16) | `approved`, `rejected`, `changes_requested`.     |
| notes       | TEXT        | Review notes.                                    |
| created_at  | TIMESTAMPTZ | Created timestamp.                               |

**Table: `ugc.marketplace_listings`**

| Column      | Type        | Notes                                            |
| ----------- | ----------- | ------------------------------------------------ |
| listing_id  | UUID PK     | Listing id.                                      |
| project_id  | UUID        | FK to `ugc.projects`.                            |
| tenant_id   | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| price_cents | INT         | Optional price.                                  |
| currency    | VARCHAR(8)  | Currency code.                                   |
| is_active   | BOOLEAN     | Availability.                                    |
| created_at  | TIMESTAMPTZ | Created timestamp.                               |

---

**Training, Compliance, and Learning Record Domain (Schema: `training`)**
This domain captures formal learning content, assignments, completion records, and compliance evidence. It is the enterprise backbone.

**Table: `training.programs`**

| Column       | Type         | Notes                                                                 |
| ------------ | ------------ | --------------------------------------------------------------------- |
| program_id   | UUID PK      | Program id.                                                           |
| tenant_id    | UUID         | FK to `public.tenants`.                                               |
| name         | VARCHAR(128) | Program name.                                                         |
| description  | TEXT         | Description.                                                          |
| framework_id | VARCHAR(32)  | Regulatory framework.                                                 |
| cadence      | VARCHAR(32)  | `onboarding`, `quarterly`, `annual`, `event_driven` (BRD FR-ENT-018). |
| created_at   | TIMESTAMPTZ  | Created timestamp.                                                    |

**Table: `training.modules`**

| Column           | Type         | Notes                                            |
| ---------------- | ------------ | ------------------------------------------------ |
| module_id        | UUID PK      | Module id.                                       |
| program_id       | UUID         | FK to `training.programs`.                       |
| tenant_id        | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| content_id       | UUID         | FK to `content.items`.                           |
| name             | VARCHAR(128) | Module name.                                     |
| order_index      | INT          | Sequence.                                        |
| duration_minutes | INT          | Expected duration.                               |
| created_at       | TIMESTAMPTZ  | Created timestamp.                               |

**Table: `training.assignments`**

| Column        | Type        | Notes                                              |
| ------------- | ----------- | -------------------------------------------------- |
| assignment_id | UUID PK     | Assignment id.                                     |
| tenant_id     | UUID        | FK to `public.tenants`.                            |
| program_id    | UUID        | FK to `training.programs`.                         |
| user_id       | UUID        | FK to `auth.users`.                                |
| due_date      | DATE        | Due date.                                          |
| status        | VARCHAR(16) | `assigned`, `in_progress`, `completed`, `overdue`. |
| assigned_at   | TIMESTAMPTZ | Assigned time.                                     |
| completed_at  | TIMESTAMPTZ | Completion time.                                   |

**Table: `training.escalations`**

BRD FR-ENT-017 requires escalation workflows: reminder, manager notification, compliance alert. This table tracks escalation steps for overdue or incomplete training assignments.

| Column            | Type        | Notes                                                                    |
| ----------------- | ----------- | ------------------------------------------------------------------------ |
| escalation_id     | UUID PK     | Escalation id.                                                           |
| tenant_id         | UUID        | FK to `public.tenants` for RLS.                                          |
| assignment_id     | UUID        | FK to `training.assignments`.                                            |
| escalation_type   | VARCHAR(32) | `reminder`, `manager_notification`, `compliance_alert` (BRD FR-ENT-017). |
| recipient_user_id | UUID        | FK to `auth.users` (learner, manager, or compliance officer).            |
| sent_at           | TIMESTAMPTZ | When escalation was sent.                                                |
| acknowledged_at   | TIMESTAMPTZ | When escalation was acknowledged.                                        |
| created_at        | TIMESTAMPTZ | Created timestamp.                                                       |

**Table: `training.assessments`**

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| assessment_id | UUID PK     | Assessment id.                                   |
| assignment_id | UUID        | FK to `training.assignments`.                    |
| tenant_id     | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| score         | REAL        | Score value.                                     |
| passed        | BOOLEAN     | Pass flag.                                       |
| responses     | JSONB       | Question responses.                              |
| created_at    | TIMESTAMPTZ | Created timestamp.                               |

**Table: `training.jit_interventions`**

BRD FR-ENT-019 requires just-in-time training delivery within 60 seconds of a triggering event (phishing click, policy violation, DLP alert). FR-ENT-020 enforces a maximum of 2 interventions per week per learner to prevent training fatigue.

| Column              | Type         | Notes                                                                                |
| ------------------- | ------------ | ------------------------------------------------------------------------------------ |
| intervention_id     | UUID PK      | Intervention id.                                                                     |
| tenant_id           | UUID         | FK to `public.tenants` for RLS.                                                      |
| user_id             | UUID         | FK to `auth.users`.                                                                  |
| trigger_type        | VARCHAR(32)  | `phishing_click`, `policy_violation`, `dlp_alert`.                                   |
| trigger_event_id    | VARCHAR(128) | Reference to triggering event.                                                       |
| module_id           | UUID         | FK to `training.modules`.                                                            |
| delivery_latency_ms | INT          | Time from trigger to delivery (target < 60,000ms per FR-ENT-019).                    |
| status              | VARCHAR(16)  | `pending`, `delivered`, `completed`, `throttled`.                                    |
| throttle_reason     | VARCHAR(64)  | Reason if throttled (e.g., weekly limit reached per FR-ENT-020: max 2/week/learner). |
| delivered_at        | TIMESTAMPTZ  | Delivery time.                                                                       |
| completed_at        | TIMESTAMPTZ  | Completion time.                                                                     |
| created_at          | TIMESTAMPTZ  | Created timestamp.                                                                   |

**Table: `training.certificates`**

| Column         | Type        | Notes                                            |
| -------------- | ----------- | ------------------------------------------------ |
| certificate_id | UUID PK     | Certificate id.                                  |
| tenant_id      | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| user_id        | UUID        | FK to `auth.users`.                              |
| framework_id   | VARCHAR(32) | Regulatory framework.                            |
| issued_at      | TIMESTAMPTZ | Issue date.                                      |
| expires_at     | TIMESTAMPTZ | Expiration.                                      |
| signature_hash | VARCHAR(64) | Digital signature hash.                          |
| metadata       | JSONB       | Certificate details.                             |

**Table: `training.attestations`**

| Column         | Type        | Notes                                            |
| -------------- | ----------- | ------------------------------------------------ |
| attestation_id | UUID PK     | Attestation id.                                  |
| tenant_id      | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| user_id        | UUID        | FK to `auth.users`.                              |
| policy_id      | UUID        | FK to `training.policies`.                       |
| attested_at    | TIMESTAMPTZ | Attestation time.                                |
| ip_address     | INET        | IP address for audit.                            |
| user_agent     | TEXT        | User agent string.                               |

**Table: `training.policies`**

| Column         | Type         | Notes                   |
| -------------- | ------------ | ----------------------- |
| policy_id      | UUID PK      | Policy id.              |
| tenant_id      | UUID         | FK to `public.tenants`. |
| name           | VARCHAR(128) | Policy name.            |
| version        | INT          | Policy version.         |
| content_id     | UUID         | FK to `content.items`.  |
| effective_date | DATE         | Effective date.         |
| created_at     | TIMESTAMPTZ  | Created timestamp.      |

**Table: `training.spaced_repetition_state`**

The BRD (Section 11.2) specifies a modified Leitner system with SM-2 algorithm for spaced repetition. Intervals range from 1 day (new concept) to 180 days (mastered). Review sessions are delivered via multiple channels with interleaving of review topics.

| Column            | Type         | Notes                                                                                                                                                                                                           |
| ----------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user_id           | UUID         | FK to `auth.users`.                                                                                                                                                                                             |
| tenant_id         | UUID         | FK to `public.tenants` for RLS.                                                                                                                                                                                 |
| concept_id        | VARCHAR(128) | Concept or skill identifier.                                                                                                                                                                                    |
| competency_domain | VARCHAR(64)  | One of seven competency domains (BRD FR-AN-004): `phishing_detection`, `password_security`, `data_handling`, `social_engineering_resistance`, `incident_response`, `physical_security`, `compliance_awareness`. |
| easiness_factor   | REAL         | SM-2 easiness factor (default 2.5).                                                                                                                                                                             |
| interval_days     | INT          | Current review interval in days (1-180).                                                                                                                                                                        |
| repetitions       | INT          | Number of successful consecutive reviews.                                                                                                                                                                       |
| next_review_at    | TIMESTAMPTZ  | Next scheduled review time.                                                                                                                                                                                     |
| last_reviewed_at  | TIMESTAMPTZ  | Last review time.                                                                                                                                                                                               |
| last_quality      | INT          | Last review quality score (0-5 per SM-2).                                                                                                                                                                       |
| created_at        | TIMESTAMPTZ  | Created timestamp.                                                                                                                                                                                              |
| updated_at        | TIMESTAMPTZ  | Updated timestamp.                                                                                                                                                                                              |

**Table: `training.spaced_repetition_reviews`**

| Column           | Type         | Notes                              |
| ---------------- | ------------ | ---------------------------------- |
| review_id        | UUID PK      | Review id.                         |
| user_id          | UUID         | FK to `auth.users`.                |
| tenant_id        | UUID         | FK to `public.tenants` for RLS.    |
| concept_id       | VARCHAR(128) | Concept or skill identifier.       |
| quality          | INT          | SM-2 quality score (0-5).          |
| channel          | VARCHAR(16)  | `in_game`, `push`, `email`, `sms`. |
| duration_seconds | INT          | Time spent on review.              |
| created_at       | TIMESTAMPTZ  | Review timestamp.                  |

**Table: `training.management_attestations`**

BRD FR-ENT-034 requires management training attestation reports for NIS2 Article 20 and DORA Article 5. Management bodies must demonstrate they have received and understood cybersecurity training, with personal liability implications.

| Column              | Type        | Notes                                        |
| ------------------- | ----------- | -------------------------------------------- |
| attestation_id      | UUID PK     | Attestation id.                              |
| tenant_id           | UUID        | FK to `public.tenants` for RLS.              |
| user_id             | UUID        | FK to `auth.users` (management body member). |
| framework_id        | VARCHAR(32) | `nis2` or `dora`.                            |
| training_program_id | UUID        | FK to `training.programs`.                   |
| attestation_date    | DATE        | Date of attestation.                         |
| attestation_text    | TEXT        | Attestation statement.                       |
| signed              | BOOLEAN     | Whether digitally signed.                    |
| signature_hash      | VARCHAR(64) | Digital signature hash.                      |
| ip_address          | INET        | IP address for audit.                        |
| user_agent          | TEXT        | User agent for audit.                        |
| created_at          | TIMESTAMPTZ | Created timestamp.                           |

**Table: `training.program_reviews`**

BRD FR-ENT-043 requires an annual program review workflow with sign-off (PCI-DSS 12.6.2). This table tracks the review cycle, reviewer assignments, and sign-off status.

| Column           | Type        | Notes                                           |
| ---------------- | ----------- | ----------------------------------------------- |
| review_id        | UUID PK     | Review id.                                      |
| tenant_id        | UUID        | FK to `public.tenants` for RLS.                 |
| program_id       | UUID        | FK to `training.programs`.                      |
| review_year      | INT         | Year of review.                                 |
| reviewer_user_id | UUID        | FK to `auth.users`.                             |
| status           | VARCHAR(16) | `pending`, `in_review`, `approved`, `rejected`. |
| findings         | JSONB       | Review findings.                                |
| signed_off_at    | TIMESTAMPTZ | Sign-off time.                                  |
| signed_off_by    | UUID        | FK to `auth.users`.                             |
| created_at       | TIMESTAMPTZ | Created timestamp.                              |

---

**Phishing Simulation Domain (Schema: `phishing`)**
This domain implements the multi-channel phishing simulation engine required for compliance.

**Table: `phishing.campaigns`**

| Column        | Type         | Notes                                                           |
| ------------- | ------------ | --------------------------------------------------------------- |
| campaign_id   | UUID PK      | Campaign id.                                                    |
| tenant_id     | UUID         | FK to `public.tenants`.                                         |
| name          | VARCHAR(128) | Campaign name.                                                  |
| channel       | VARCHAR(16)  | `email`, `sms`, `voice`, `qr`.                                  |
| status        | VARCHAR(16)  | `draft`, `scheduled`, `active`, `completed`.                    |
| sending_ip    | INET         | Per-customer IP isolation for enterprise tier (BRD FR-ENT-025). |
| spf_aligned   | BOOLEAN      | SPF alignment verified (BRD FR-ENT-026).                        |
| dkim_aligned  | BOOLEAN      | DKIM alignment verified (2048-bit RSA minimum per FR-ENT-026).  |
| dmarc_aligned | BOOLEAN      | DMARC alignment verified (BRD FR-ENT-026).                      |
| start_at      | TIMESTAMPTZ  | Start time.                                                     |
| end_at        | TIMESTAMPTZ  | End time.                                                       |
| created_at    | TIMESTAMPTZ  | Created timestamp.                                              |

**Table: `phishing.templates`**

| Column      | Type         | Notes                   |
| ----------- | ------------ | ----------------------- |
| template_id | UUID PK      | Template id.            |
| tenant_id   | UUID         | FK to `public.tenants`. |
| content_id  | UUID         | FK to `content.items`.  |
| name        | VARCHAR(128) | Template name.          |
| merge_tags  | TEXT[]       | Supported merge tags.   |
| created_at  | TIMESTAMPTZ  | Created timestamp.      |

**Table: `phishing.sends`**

| Column       | Type        | Notes                                                                                                                 |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| send_id      | UUID PK     | Send id.                                                                                                              |
| campaign_id  | UUID        | FK to `phishing.campaigns`.                                                                                           |
| tenant_id    | UUID        | FK to `public.tenants` for RLS.                                                                                       |
| user_id      | UUID        | FK to `auth.users`.                                                                                                   |
| status       | VARCHAR(16) | `sent`, `delivered`, `opened`, `clicked`, `reported` (supports BRD FR-AN-001 click rate and reporting rate tracking). |
| sent_at      | TIMESTAMPTZ | Sent time.                                                                                                            |
| delivered_at | TIMESTAMPTZ | Delivery time.                                                                                                        |
| opened_at    | TIMESTAMPTZ | Open time (tracking pixel).                                                                                           |
| clicked_at   | TIMESTAMPTZ | Click time.                                                                                                           |
| reported_at  | TIMESTAMPTZ | Report time.                                                                                                          |
| metadata     | JSONB       | User agent, geo, etc.                                                                                                 |

**Table: `phishing.teachable_moments`**

| Column          | Type        | Notes                                            |
| --------------- | ----------- | ------------------------------------------------ |
| moment_id       | UUID PK     | Moment id.                                       |
| send_id         | UUID        | FK to `phishing.sends`.                          |
| tenant_id       | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| landing_page_id | UUID        | FK to `phishing.landing_pages`.                  |
| displayed_at    | TIMESTAMPTZ | Display time.                                    |
| completed_at    | TIMESTAMPTZ | Completion time.                                 |

**Table: `phishing.landing_pages`**

| Column          | Type        | Notes                                            |
| --------------- | ----------- | ------------------------------------------------ |
| landing_page_id | UUID PK     | Landing page id.                                 |
| tenant_id       | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| content_id      | UUID        | FK to `content.items`.                           |
| created_at      | TIMESTAMPTZ | Created timestamp.                               |

---

**LMS, LTI, SCORM, xAPI, and LRS Domain (Schema: `lrs`)**
This domain provides learning record storage and LMS interoperability.

**Table: `lrs.statements`**

| Column       | Type        | Notes                   |
| ------------ | ----------- | ----------------------- |
| statement_id | UUID PK     | xAPI statement id.      |
| tenant_id    | UUID        | FK to `public.tenants`. |
| actor        | JSONB       | xAPI actor.             |
| verb         | JSONB       | xAPI verb.              |
| object       | JSONB       | xAPI object.            |
| result       | JSONB       | xAPI result.            |
| context      | JSONB       | xAPI context.           |
| timestamp    | TIMESTAMPTZ | Statement time.         |
| stored_at    | TIMESTAMPTZ | Storage time.           |

**Table: `lrs.lti_deployments`**

| Column        | Type         | Notes                   |
| ------------- | ------------ | ----------------------- |
| deployment_id | UUID PK      | Deployment id.          |
| tenant_id     | UUID         | FK to `public.tenants`. |
| issuer        | VARCHAR(255) | LTI issuer.             |
| client_id     | VARCHAR(255) | LTI client id.          |
| jwks_url      | VARCHAR(512) | JWKS endpoint.          |
| created_at    | TIMESTAMPTZ  | Created timestamp.      |

**Table: `lrs.scorm_packages`**

| Column          | Type         | Notes                   |
| --------------- | ------------ | ----------------------- |
| package_id      | UUID PK      | Package id.             |
| tenant_id       | UUID         | FK to `public.tenants`. |
| version         | VARCHAR(32)  | SCORM version.          |
| object_key      | VARCHAR(512) | Package file location.  |
| checksum_sha256 | VARCHAR(64)  | Integrity hash.         |
| created_at      | TIMESTAMPTZ  | Created timestamp.      |

**Table: `lrs.scorm_registrations`**

| Column          | Type        | Notes                                            |
| --------------- | ----------- | ------------------------------------------------ |
| registration_id | UUID PK     | Registration id.                                 |
| package_id      | UUID        | FK to `lrs.scorm_packages`.                      |
| tenant_id       | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| user_id         | UUID        | FK to `auth.users`.                              |
| status          | VARCHAR(16) | `in_progress`, `completed`, `failed`.            |
| score           | REAL        | Completion score.                                |
| created_at      | TIMESTAMPTZ | Created timestamp.                               |

---

**cmi5 Support (Schema: `lrs`)**
cmi5 is listed as a mandatory integration standard in BRD Section 10.2. It builds on xAPI but adds LMS-defined constraints for launch, completion, and session management. The following tables capture cmi5 course structure, registration, and session state.

**Table: `lrs.cmi5_courses`**

| Column           | Type         | Notes                                       |
| ---------------- | ------------ | ------------------------------------------- |
| course_id        | UUID PK      | cmi5 course id.                             |
| tenant_id        | UUID         | FK to `public.tenants`.                     |
| title            | VARCHAR(255) | Course title.                               |
| description      | TEXT         | Course description.                         |
| publisher_id     | VARCHAR(128) | Publisher identifier from course structure. |
| course_structure | JSONB        | cmi5 course structure (blocks and AUs).     |
| created_at       | TIMESTAMPTZ  | Created timestamp.                          |

**Table: `lrs.cmi5_registrations`**

| Column          | Type        | Notes                                 |
| --------------- | ----------- | ------------------------------------- |
| registration_id | UUID PK     | Registration id.                      |
| course_id       | UUID        | FK to `lrs.cmi5_courses`.             |
| tenant_id       | UUID        | FK to `public.tenants`.               |
| user_id         | UUID        | FK to `auth.users`.                   |
| status          | VARCHAR(16) | `in_progress`, `completed`, `failed`. |
| created_at      | TIMESTAMPTZ | Created timestamp.                    |

**Table: `lrs.cmi5_sessions`**

| Column          | Type         | Notes                                                                              |
| --------------- | ------------ | ---------------------------------------------------------------------------------- |
| session_id      | UUID PK      | cmi5 session id.                                                                   |
| registration_id | UUID         | FK to `lrs.cmi5_registrations`.                                                    |
| tenant_id       | UUID         | FK to `public.tenants`.                                                            |
| au_id           | VARCHAR(128) | Assignable Unit identifier.                                                        |
| launch_mode     | VARCHAR(16)  | `Normal`, `Browse`, `Review`.                                                      |
| mastery_score   | REAL         | Mastery score threshold from course structure.                                     |
| move_on         | VARCHAR(16)  | `Passed`, `Completed`, `CompletedAndPassed`, `CompletedOrPassed`, `NotApplicable`. |
| status          | VARCHAR(16)  | `launched`, `completed`, `passed`, `failed`, `abandoned`, `waived`.                |
| score           | REAL         | Session score.                                                                     |
| launched_at     | TIMESTAMPTZ  | Launch time.                                                                       |
| completed_at    | TIMESTAMPTZ  | Completion time.                                                                   |
| created_at      | TIMESTAMPTZ  | Created timestamp.                                                                 |

---

**AICC / HACP Support (Schema: `lrs`)**
Legacy LMS integrations require AICC HACP support (BRD FR-ENT-040). This data model stores AICC course metadata, registrations, launch parameters, and completion outcomes. The key HACP parameters `AICC_SID` and `AICC_URL` are persisted for traceability and replay.

**Table: `lrs.aicc_courses`**

| Column     | Type         | Notes                       |
| ---------- | ------------ | --------------------------- |
| course_id  | UUID PK      | AICC course id.             |
| tenant_id  | UUID         | FK to `public.tenants`.     |
| code       | VARCHAR(64)  | AICC course code.           |
| title      | VARCHAR(255) | Course title.               |
| version    | VARCHAR(32)  | Course version.             |
| launch_url | TEXT         | Launch URL provided to LMS. |
| created_at | TIMESTAMPTZ  | Created timestamp.          |

**Table: `lrs.aicc_registrations`**

| Column          | Type         | Notes                                              |
| --------------- | ------------ | -------------------------------------------------- |
| registration_id | UUID PK      | Registration id.                                   |
| course_id       | UUID         | FK to `lrs.aicc_courses`.                          |
| tenant_id       | UUID         | FK to `public.tenants`.                            |
| user_id         | UUID         | FK to `auth.users`.                                |
| aicc_sid        | VARCHAR(128) | AICC session id.                                   |
| status          | VARCHAR(16)  | `in_progress`, `completed`, `failed`, `abandoned`. |
| created_at      | TIMESTAMPTZ  | Created timestamp.                                 |

**Table: `lrs.aicc_sessions`**

| Column            | Type        | Notes                            |
| ----------------- | ----------- | -------------------------------- |
| session_id        | UUID PK     | Session id.                      |
| registration_id   | UUID        | FK to `lrs.aicc_registrations`.  |
| tenant_id         | UUID        | FK to `public.tenants`.          |
| aicc_url          | TEXT        | LMS endpoint for HACP callbacks. |
| launch_params     | JSONB       | HACP launch parameters.          |
| last_heartbeat_at | TIMESTAMPTZ | Last LMS ping.                   |
| created_at        | TIMESTAMPTZ | Created timestamp.               |

**Table: `lrs.aicc_results`**

| Column              | Type         | Notes                                          |
| ------------------- | ------------ | ---------------------------------------------- |
| result_id           | UUID PK      | Result id.                                     |
| registration_id     | UUID         | FK to `lrs.aicc_registrations`.                |
| tenant_id           | UUID         | FK to `public.tenants`.                        |
| lesson_status       | VARCHAR(32)  | `passed`, `failed`, `completed`, `incomplete`. |
| score               | REAL         | AICC score.                                    |
| time_spent_seconds  | INT          | Total time spent.                              |
| lesson_location     | VARCHAR(255) | LMS lesson location.                           |
| suspend_data        | TEXT         | AICC suspend data.                             |
| last_interaction_at | TIMESTAMPTZ  | Last interaction time.                         |
| created_at          | TIMESTAMPTZ  | Created timestamp.                             |

---

**Analytics and Telemetry Domain (Schema: `analytics`)**
Analytics data is stored in a time-series system, but a subset of derived snapshots lives in PostgreSQL for fast dashboards and audit. The canonical analytics store is ClickHouse or TimescaleDB (BRD Section 8.5), optimized for columnar time-series aggregation. The `analytics.events` table below is the PostgreSQL staging table; events are replicated to the analytics store for long-term retention and high-performance reporting. Player retention curves (D1, D7, D30, D60, D90 per FR-AN-017), session duration/frequency analytics (FR-AN-018), content effectiveness scoring (FR-AN-019), and predictive analytics for at-risk players (FR-AN-021) are computed in the analytics store.

**Table: `analytics.events`**

| Column           | Type         | Notes                   |
| ---------------- | ------------ | ----------------------- |
| event_id         | UUID         | Event id.               |
| user_id          | UUID         | FK to `auth.users`.     |
| tenant_id        | UUID         | FK to `public.tenants`. |
| session_id       | UUID         | FK to `game.sessions`.  |
| event_name       | VARCHAR(128) | Event name.             |
| event_properties | JSONB        | Event data.             |
| device_info      | JSONB        | Device info.            |
| geo_info         | JSONB        | Geo info.               |
| created_at       | TIMESTAMPTZ  | Event time.             |

**Table: `analytics.player_profiles`**

| Column                    | Type        | Notes                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------- |
| user_id                   | UUID PK     | FK to `auth.users`.                                         |
| tenant_id                 | UUID        | FK to `public.tenants`.                                     |
| total_sessions            | INT         | Total sessions.                                             |
| total_days_played         | INT         | Total days.                                                 |
| phishing_detection_rate   | REAL        | Detection rate.                                             |
| false_positive_rate       | REAL        | False positives.                                            |
| avg_decision_time_seconds | REAL        | Decision time.                                              |
| indicator_proficiency     | JSONB       | Indicator proficiency.                                      |
| competency_scores         | JSONB       | Skill scores by domain.                                     |
| skill_rating              | INT         | Elo-like rating (overall).                                  |
| red_team_rating           | INT         | Independent Elo-like rating for Red Team play (FR-MP-008).  |
| blue_team_rating          | INT         | Independent Elo-like rating for Blue Team play (FR-MP-008). |
| last_computed_at          | TIMESTAMPTZ | Last update.                                                |

**Table: `analytics.compliance_snapshots`**

| Column        | Type        | Notes                   |
| ------------- | ----------- | ----------------------- |
| snapshot_id   | UUID PK     | Snapshot id.            |
| tenant_id     | UUID        | FK to `public.tenants`. |
| framework     | VARCHAR(32) | Framework id.           |
| snapshot_data | JSONB       | Compliance data.        |
| computed_at   | TIMESTAMPTZ | Computed time.          |

**Table: `analytics.ab_experiments`**

BRD FR-AN-020 requires an A/B testing framework for game mechanics and training content. The following tables track experiments, variant assignments, and outcome metrics.

| Column             | Type         | Notes                                                     |
| ------------------ | ------------ | --------------------------------------------------------- |
| experiment_id      | UUID PK      | Experiment id.                                            |
| tenant_id          | UUID         | Null for platform-wide experiments; FK for tenant-scoped. |
| name               | VARCHAR(128) | Experiment name.                                          |
| description        | TEXT         | Hypothesis and test description.                          |
| target_metric      | VARCHAR(64)  | Primary success metric.                                   |
| status             | VARCHAR(16)  | `draft`, `running`, `concluded`, `cancelled`.             |
| traffic_percentage | INT          | Percentage of eligible users enrolled (1-100).            |
| start_at           | TIMESTAMPTZ  | Experiment start.                                         |
| end_at             | TIMESTAMPTZ  | Experiment end.                                           |
| created_at         | TIMESTAMPTZ  | Created timestamp.                                        |

**Table: `analytics.ab_variants`**

| Column        | Type        | Notes                                                                                |
| ------------- | ----------- | ------------------------------------------------------------------------------------ |
| variant_id    | UUID PK     | Variant id.                                                                          |
| experiment_id | UUID        | FK to `analytics.ab_experiments`.                                                    |
| tenant_id     | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). Null for platform-wide experiments. |
| name          | VARCHAR(64) | Variant name (`control`, `treatment_a`, etc.).                                       |
| config        | JSONB       | Variant-specific configuration.                                                      |
| weight        | INT         | Traffic weight for random assignment.                                                |
| created_at    | TIMESTAMPTZ | Created timestamp.                                                                   |

**Table: `analytics.ab_assignments`**

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| experiment_id | UUID        | FK to `analytics.ab_experiments`.                |
| user_id       | UUID        | FK to `auth.users`.                              |
| tenant_id     | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| variant_id    | UUID        | FK to `analytics.ab_variants`.                   |
| assigned_at   | TIMESTAMPTZ | Assignment time.                                 |

---

**Integration, Webhooks, and External Systems Domain (Schema: `integration`)**
This domain standardizes integration configuration and webhooks for SIEM, SOAR, HRIS, Slack, Teams, and LMS.

**Table: `integration.configs`**

| Column           | Type         | Notes                                       |
| ---------------- | ------------ | ------------------------------------------- |
| config_id        | UUID PK      | Config id.                                  |
| tenant_id        | UUID         | FK to `public.tenants`.                     |
| integration_type | VARCHAR(32)  | `splunk`, `sentinel`, `okta`, `slack`, etc. |
| name             | VARCHAR(128) | Display name.                               |
| config           | JSONB        | Integration-specific config.                |
| is_active        | BOOLEAN      | Active flag.                                |
| created_at       | TIMESTAMPTZ  | Created timestamp.                          |

**Table: `integration.credentials`**

| Column           | Type        | Notes                                            |
| ---------------- | ----------- | ------------------------------------------------ |
| credential_id    | UUID PK     | Credential id.                                   |
| config_id        | UUID        | FK to `integration.configs`.                     |
| tenant_id        | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| credential_type  | VARCHAR(32) | `api_key`, `oauth`, `client_secret`.             |
| encrypted_secret | BYTEA       | Encrypted secret.                                |
| created_at       | TIMESTAMPTZ | Created timestamp.                               |

**Table: `integration.hris_sync_events`**

BRD Section 10.5 requires bidirectional HRIS integration with Workday, BambooHR, SAP SuccessFactors, and ADP. User lifecycle events (new hire, department transfer, role change, termination) trigger training enrollment and deprovisioning actions.

| Column            | Type         | Notes                                                            |
| ----------------- | ------------ | ---------------------------------------------------------------- |
| event_id          | UUID PK      | Sync event id.                                                   |
| config_id         | UUID         | FK to `integration.configs`.                                     |
| tenant_id         | UUID         | FK to `public.tenants`.                                          |
| event_type        | VARCHAR(32)  | `new_hire`, `department_transfer`, `role_change`, `termination`. |
| user_id           | UUID         | FK to `auth.users` (null for new hire before provisioning).      |
| external_user_id  | VARCHAR(255) | User identifier in the HRIS system.                              |
| payload           | JSONB        | Event data from HRIS.                                            |
| processing_status | VARCHAR(16)  | `pending`, `processed`, `failed`.                                |
| processed_at      | TIMESTAMPTZ  | Processing time.                                                 |
| created_at        | TIMESTAMPTZ  | Created timestamp.                                               |

**Table: `integration.webhook_subscriptions`**

| Column          | Type         | Notes                   |
| --------------- | ------------ | ----------------------- |
| subscription_id | UUID PK      | Subscription id.        |
| tenant_id       | UUID         | FK to `public.tenants`. |
| target_url      | TEXT         | Endpoint URL.           |
| secret          | VARCHAR(128) | HMAC secret.            |
| event_types     | TEXT[]       | Subscribed events.      |
| status          | VARCHAR(16)  | `active`, `paused`.     |
| created_at      | TIMESTAMPTZ  | Created timestamp.      |

**Table: `integration.webhook_deliveries`**

| Column          | Type        | Notes                                            |
| --------------- | ----------- | ------------------------------------------------ |
| delivery_id     | UUID PK     | Delivery id.                                     |
| subscription_id | UUID        | FK to `integration.webhook_subscriptions`.       |
| tenant_id       | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| event_type      | VARCHAR(64) | Event type.                                      |
| payload         | JSONB       | Delivered payload.                               |
| status          | VARCHAR(16) | `success`, `failed`, `retrying`.                 |
| attempts        | INT         | Attempt count.                                   |
| last_attempt_at | TIMESTAMPTZ | Last attempt.                                    |
| created_at      | TIMESTAMPTZ | Created timestamp.                               |

---

**Notification and Messaging Domain (Schema: `notification`)**

**Table: `notification.preferences`**

| Column          | Type        | Notes                           |
| --------------- | ----------- | ------------------------------- |
| user_id         | UUID PK     | FK to `auth.users`.             |
| tenant_id       | UUID        | FK to `public.tenants` for RLS. |
| push_enabled    | BOOLEAN     | Push notifications enabled.     |
| email_enabled   | BOOLEAN     | Email notifications enabled.    |
| in_game_enabled | BOOLEAN     | In-game notifications enabled.  |
| quiet_hours     | JSONB       | Quiet hours.                    |
| updated_at      | TIMESTAMPTZ | Updated timestamp.              |

**Table: `notification.push_subscriptions`**

| Column          | Type        | Notes                           |
| --------------- | ----------- | ------------------------------- |
| subscription_id | UUID PK     | Subscription id.                |
| user_id         | UUID        | FK to `auth.users`.             |
| tenant_id       | UUID        | FK to `public.tenants` for RLS. |
| endpoint        | TEXT        | Push endpoint.                  |
| keys            | JSONB       | Push keys.                      |
| user_agent      | TEXT        | User agent.                     |
| created_at      | TIMESTAMPTZ | Created timestamp.              |

**Table: `notification.delivery_log`**

| Column        | Type        | Notes                                |
| ------------- | ----------- | ------------------------------------ |
| delivery_id   | UUID PK     | Delivery id.                         |
| user_id       | UUID        | FK to `auth.users`.                  |
| tenant_id     | UUID        | FK to `public.tenants` for RLS.      |
| channel       | VARCHAR(16) | `websocket`, `push`, `email`, `sms`. |
| template      | VARCHAR(64) | Template id.                         |
| status        | VARCHAR(16) | `sent`, `delivered`, `failed`.       |
| error_message | TEXT        | Failure reason.                      |
| created_at    | TIMESTAMPTZ | Created timestamp.                   |

---

**Billing, Licensing, and Entitlements Domain (Schema: `billing`)**

**Table: `billing.plans`**

| Column           | Type           | Notes                                                                             |
| ---------------- | -------------- | --------------------------------------------------------------------------------- |
| plan_id          | VARCHAR(32) PK | Plan id.                                                                          |
| name             | VARCHAR(64)    | Plan name.                                                                        |
| tier             | VARCHAR(16)    | `free`, `starter`, `professional`, `enterprise`, `government` (BRD Section 12.1). |
| price_cents      | INT            | Price in cents.                                                                   |
| billing_interval | VARCHAR(16)    | `monthly`, `annual`.                                                              |
| seat_limit       | INT            | Seat limit.                                                                       |
| features         | JSONB          | Entitlement flags.                                                                |
| is_active        | BOOLEAN        | Active plan.                                                                      |
| created_at       | TIMESTAMPTZ    | Created timestamp.                                                                |

**Table: `billing.subscriptions`**

| Column               | Type         | Notes                             |
| -------------------- | ------------ | --------------------------------- |
| subscription_id      | UUID PK      | Subscription id.                  |
| tenant_id            | UUID         | FK to `public.tenants`.           |
| plan_id              | VARCHAR(32)  | FK to `billing.plans`.            |
| status               | VARCHAR(20)  | `active`, `past_due`, `canceled`. |
| stripe_sub_id        | VARCHAR(128) | External subscription id.         |
| current_period_start | TIMESTAMPTZ  | Period start.                     |
| current_period_end   | TIMESTAMPTZ  | Period end.                       |
| seat_limit           | INT          | Cached seat limit.                |
| created_at           | TIMESTAMPTZ  | Created timestamp.                |
| cancelled_at         | TIMESTAMPTZ  | Cancel time.                      |

**Table: `billing.usage_records`**

| Column       | Type        | Notes                   |
| ------------ | ----------- | ----------------------- |
| record_id    | UUID PK     | Usage record id.        |
| tenant_id    | UUID        | FK to `public.tenants`. |
| metric       | VARCHAR(64) | Usage metric.           |
| quantity     | BIGINT      | Quantity.               |
| period_start | TIMESTAMPTZ | Period start.           |
| period_end   | TIMESTAMPTZ | Period end.             |
| created_at   | TIMESTAMPTZ | Created timestamp.      |

**Table: `billing.entitlements`**

| Column         | Type        | Notes                      |
| -------------- | ----------- | -------------------------- |
| entitlement_id | UUID PK     | Entitlement id.            |
| tenant_id      | UUID        | FK to `public.tenants`.    |
| feature        | VARCHAR(64) | Feature key.               |
| value          | JSONB       | Entitlement configuration. |
| created_at     | TIMESTAMPTZ | Created timestamp.         |

---

**Audit Logging, Security, and Governance Domain (Schema: `admin`)**
All administrative actions are logged in an append-only log with integrity verification.

**Table: `admin.audit_log`**

| Column        | Type         | Notes                         |
| ------------- | ------------ | ----------------------------- |
| log_id        | UUID PK      | Log id.                       |
| tenant_id     | UUID         | FK to `public.tenants`.       |
| user_id       | UUID         | FK to `auth.users`.           |
| action        | VARCHAR(128) | Action name.                  |
| resource_type | VARCHAR(64)  | `user`, `campaign`, `policy`. |
| resource_id   | VARCHAR(128) | Resource id.                  |
| details       | JSONB        | Additional detail.            |
| ip_address    | INET         | IP address.                   |
| user_agent    | TEXT         | User agent.                   |
| created_at    | TIMESTAMPTZ  | Created timestamp.            |

**Table: `admin.audit_hash_chain`**

| Column     | Type        | Notes                                                |
| ---------- | ----------- | ---------------------------------------------------- |
| log_id     | UUID        | FK to `admin.audit_log`.                             |
| tenant_id  | UUID        | FK to `public.tenants` for RLS (BRD FR-ENT-002).     |
| prev_hash  | VARCHAR(64) | SHA-256 hash of previous log entry (BRD FR-ENT-030). |
| hash       | VARCHAR(64) | SHA-256 hash of current entry (BRD FR-ENT-030).      |
| created_at | TIMESTAMPTZ | Created timestamp.                                   |

---

**Data Lifecycle, Retention, and Privacy Controls**
Retention and privacy controls are implemented through explicit tables and procedures.

**Table: `privacy.deletion_requests`**

| Column       | Type        | Notes                                 |
| ------------ | ----------- | ------------------------------------- |
| request_id   | UUID PK     | Request id.                           |
| tenant_id    | UUID        | FK to `public.tenants`.               |
| user_id      | UUID        | FK to `auth.users`.                   |
| request_type | VARCHAR(16) | `export`, `delete`.                   |
| status       | VARCHAR(16) | `pending`, `processing`, `completed`. |
| requested_at | TIMESTAMPTZ | Request time.                         |
| completed_at | TIMESTAMPTZ | Completion time.                      |

**Table: `privacy.pseudonymization_keys`**

| Column     | Type         | Notes                   |
| ---------- | ------------ | ----------------------- |
| tenant_id  | UUID         | FK to `public.tenants`. |
| key_id     | VARCHAR(128) | Key identifier.         |
| created_at | TIMESTAMPTZ  | Created timestamp.      |

---

**Performance, Indexing, and Partitioning Strategy**
High-write tables such as `game.events`, `analytics.events`, and `admin.audit_log` are partitioned by time. The partitioning strategy keeps hot data in small partitions, enabling fast writes and efficient retention deletes. Indexes are minimized on write-heavy tables and focused on query patterns used by dashboards and compliance reports.

Key indexing rules:

- `game.events`: composite index on `(session_id, sequence_num)` and `(event_type, server_time)`.
- `auth.users`: unique index on `(tenant_id, email)`.
- `training.assignments`: index on `(tenant_id, status)` for overdue reports.
- `phishing.sends`: index on `(campaign_id, status)` for campaign analytics.
- `admin.audit_log`: index on `(tenant_id, created_at)` for compliance export.

---

**Migration, Versioning, and Backward Compatibility**
Every table that stores evolving payloads includes a `version` field. The application layer enforces a migration registry to translate old versions into current schemas. For event-sourced data, versioning is mandatory and immutable. A change in event schema must be additive; existing events are never mutated.

Schema migrations follow a two-step approach.

1. Additive migrations first: new columns, new tables, new defaults.
2. Contract migrations later: only after all consumers are upgraded, with data backfills performed in the background.

This approach preserves uptime and prevents incompatibilities between clients.

---

**Operational Data Flows, Invariants, and Data Integrity**
This section consolidates the cross-domain invariants that must hold true for the system to be trustworthy. These rules are not optional. They drive the constraints and validation logic in data access layers and influence which columns are required in the schema.

Game event invariants are the most critical. A game session has an ordered event stream, and every event in a session must have a unique `(session_id, sequence_num)` pair. Sequence numbers must be contiguous for replay, and gaps are only allowed when the event stream is explicitly marked as corrupted for forensic analysis. The event payloads are immutable; the only permitted edits are to add additional derived views in supplemental tables. For example, a decision correction requested by an admin results in a new event with a `correction` type, not a mutation of the prior decision.

Determinism requires that every source of randomness has a recorded seed. The `game.sessions.seed` value initializes the RNG, but multi-day attack campaigns and AI content generation also require reference seeds. Those seeds are stored in `game.events.event_data` for relevant event types and must be replayed when reconstructing state. This ensures that replay and audit are possible even if the AI generation pipeline is not available in a future environment.

Compliance evidence must be traceable back to immutable records. Training completions, phishing simulation results, policy attestations, and certificate issuance are all stored in tables that are append-only by design. Soft deletes are not permitted on those tables; instead, if a record is invalidated, a new record is inserted with a status change or explicit invalidation flag. This prevents silent deletion and supports evidentiary audit trails.

Data integrity also extends to organizational reporting. A user can belong to multiple departments and teams, but the schema enforces that at least one organizational assignment is active in enterprise mode for any user that is assigned training. This is enforced by a combination of application validation and database-level constraints on the `training.assignments` table, which references `org.user_assignments` for current organizational membership.

To reduce reconciliation errors, system-wide identifiers follow consistent patterns. User IDs are globally unique and never re-used after deletion. Tenant slugs are unique across all regions. Campaign and phishing send IDs are unique to a tenant to support per-tenant reporting export, but their global UUIDs ensure safety in cross-tenant analytics pipelines.

---

**Object Storage Metadata and File Governance (Schema: `files`)**
The platform stores large objects externally and tracks their metadata in PostgreSQL for auditability and retention enforcement. Object storage is not considered authoritative for lifecycle control; the metadata tables define retention, encryption, and deletion requirements.

**Table: `files.objects`**

| Column            | Type         | Notes                          |
| ----------------- | ------------ | ------------------------------ |
| object_id         | UUID PK      | Object id.                     |
| tenant_id         | UUID         | FK to `public.tenants`.        |
| object_key        | VARCHAR(512) | Storage path or key.           |
| content_type      | VARCHAR(64)  | MIME type.                     |
| size_bytes        | BIGINT       | Size in bytes.                 |
| checksum_sha256   | VARCHAR(64)  | Integrity hash.                |
| encryption_key_id | VARCHAR(128) | KMS key reference.             |
| retention_until   | TIMESTAMPTZ  | Required retention date.       |
| legal_hold        | BOOLEAN      | Legal hold flag.               |
| created_at        | TIMESTAMPTZ  | Created timestamp.             |
| deleted_at        | TIMESTAMPTZ  | Deletion timestamp if removed. |

**Table: `files.references`**

| Column        | Type         | Notes                                            |
| ------------- | ------------ | ------------------------------------------------ |
| object_id     | UUID         | FK to `files.objects`.                           |
| tenant_id     | UUID         | FK to `public.tenants` for RLS (BRD FR-ENT-002). |
| resource_type | VARCHAR(64)  | `scorm_package`, `certificate`, `ugc_asset`.     |
| resource_id   | VARCHAR(128) | Resource identifier.                             |
| created_at    | TIMESTAMPTZ  | Created timestamp.                               |

This schema allows a single file to be referenced by multiple resources, while still enforcing retention and encryption policies at the object level.

---

**Data Residency Transfer Ledger (Schema: `governance`)**
Any cross-region movement of tenant data is recorded in a transfer ledger to satisfy GDPR Chapter V and customer data residency contracts.

**Table: `governance.transfer_log`**

| Column             | Type         | Notes                                         |
| ------------------ | ------------ | --------------------------------------------- |
| transfer_id        | UUID PK      | Transfer id.                                  |
| tenant_id          | UUID         | FK to `public.tenants`.                       |
| source_region      | VARCHAR(16)  | Source region code.                           |
| target_region      | VARCHAR(16)  | Target region code.                           |
| transfer_reason    | VARCHAR(128) | `customer_request`, `incident_response`, etc. |
| data_categories    | TEXT[]       | Categories of data transferred.               |
| approved_by        | UUID         | Admin user id.                                |
| approval_reference | VARCHAR(128) | Ticket or approval id.                        |
| transferred_at     | TIMESTAMPTZ  | Transfer time.                                |

Transfers are expected to be rare. This table enables a complete audit trail and supports data protection impact assessments by providing concrete evidence of cross-border data flows.

---

**Quality Controls and Data Validation**
The schema includes guardrails to reduce data quality drift. For example, `training.certificates.signature_hash` is required and computed by a deterministic signing pipeline, while `training.attestations` stores the IP address and user agent to support audit queries. For event-sourced tables, a strict constraint enforces monotonic sequence numbers per session. For phishing simulations, a unique constraint on `(campaign_id, user_id)` prevents duplicate targeting unless explicitly configured.

Where JSONB is used for extensible payloads, a parallel set of `json_schema_version` columns can be added without breaking compatibility. This is especially important for AI-generated content and external integration payloads, which can evolve quickly. The version field should be included in `content.items.payload`, `ai.generation_log`, and `integration.webhook_deliveries` so that stored data can be validated and reprocessed when schemas change.

---

**Appendices**

Appendix A: Canonical Enums

| Enum               | Values                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ThreatTier         | `LOW`, `GUARDED`, `ELEVATED`, `HIGH`, `SEVERE`                                                                                                                                                                                                                                                                                                        |
| FacilityTier       | `outpost`, `station`, `vault`, `fortress`, `citadel`                                                                                                                                                                                                                                                                                                  |
| DecisionType       | `approve`, `deny`, `flag`, `request_verification`                                                                                                                                                                                                                                                                                                     |
| CampaignStatus     | `dormant`, `active`, `succeeded`, `defeated`, `abandoned`                                                                                                                                                                                                                                                                                             |
| IncidentStatus     | `open`, `investigating`, `contained`, `eradicated`, `recovered`, `closed`                                                                                                                                                                                                                                                                             |
| MatchMode          | `coop`, `pvp`, `asymmetric_assault`, `purple_team`                                                                                                                                                                                                                                                                                                    |
| DifficultyTier     | `training`, `standard`, `hardened`, `nightmare`                                                                                                                                                                                                                                                                                                       |
| SOCRole            | `perimeter_warden`, `intake_analyst`, `threat_hunter`, `systems_keeper`, `crypto_warden`, `comms_officer`                                                                                                                                                                                                                                             |
| BuiltInRole        | `super_admin`, `tenant_admin`, `manager`, `trainer`, `learner`                                                                                                                                                                                                                                                                                        |
| BillingTier        | `free`, `starter`, `professional`, `enterprise`, `government`                                                                                                                                                                                                                                                                                         |
| Currency           | `credits`, `trust`, `intel`                                                                                                                                                                                                                                                                                                                           |
| PhishingChannel    | `email`, `sms`, `voice`, `qr`                                                                                                                                                                                                                                                                                                                         |
| TrainingCadence    | `onboarding`, `quarterly`, `annual`, `event_driven`                                                                                                                                                                                                                                                                                                   |
| CoopScenario       | `cascade_failure`, `bandwidth_siege`, `the_insider`, `data_exodus`                                                                                                                                                                                                                                                                                    |
| InGameDocumentType | `email_access_request`, `phishing_analysis_worksheet`, `verification_packet`, `threat_assessment_sheet`, `incident_log`, `data_salvage_contract`, `storage_lease_agreement`, `upgrade_proposal`, `blacklist_notice`, `whitelist_exception`, `facility_status_report`, `intelligence_brief`, `ransom_note` (BRD Section 5.5: all 13 in-game documents) |

Appendix B: Example Queries

```sql
-- Retrieve a player's last 50 decisions for audit
SELECT d.*
FROM game.email_decisions d
WHERE d.user_id = $1
ORDER BY d.created_at DESC
LIMIT 50;

-- Compliance snapshot for PCI-DSS
SELECT snapshot_data
FROM analytics.compliance_snapshots
WHERE tenant_id = $1 AND framework = 'pci_dss'
ORDER BY computed_at DESC
LIMIT 1;
```

Appendix C: Data Dictionary Notes

The schema definitions above form the minimum viable data model for Phase 2. Additional fields may be added for enterprise-specific reporting or platform optimization, but all extensions must preserve the core entity relationships and the event-sourcing invariants.

---

**End of Document**
