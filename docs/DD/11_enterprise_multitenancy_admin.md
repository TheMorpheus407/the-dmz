# 11 -- Enterprise Multi-tenancy & Admin Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-11
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Engineering + Product + Compliance
**Authors:** Enterprise Platform Architecture Team
**Parent Documents:** BRD-DMZ-2026-001, DD-07, DD-09

---

## Table of Contents

1. Executive Summary
2. Scope and Non-Goals
3. Inputs and Dependencies
4. Terminology and Definitions
5. Design Principles
6. Tenant Model and Segmentation Strategy
7. Tenant Lifecycle and Provisioning
8. Multi-tenancy Architecture and Isolation Controls
9. Identity, SSO, and User Provisioning
10. Authorization Model (RBAC + ABAC)
11. Organization and Group Model
12. Enterprise Admin Product Surface
13. Admin UX and Visual System
14. Compliance, Audit Trails, and Evidence
15. Integrations and External Systems
16. Billing, Licensing, and Entitlements
17. Observability and Operational Controls
18. Security, Privacy, and Data Protection
19. Data Retention, Export, and Deletion
20. Testing, Validation, and Assurance
21. Scalability, Migration, and Service Extraction
22. Implementation Roadmap (Phase 2)
23. Open Questions and Decision Log
24. Appendix A: Detailed Data Model
25. Appendix B: Admin Information Architecture
26. Appendix C: Workflow Narratives
27. Appendix D: RLS and Isolation Examples
28. Appendix E: Operational Playbooks and Risk Controls

---

## 1. Executive Summary

The DMZ: Archive Gate operates as a dual-mode platform: a consumer game with stealth learning and an enterprise-grade compliance training system. This design document defines the enterprise multi-tenancy model and the admin product surface that enables organizations to deploy, administer, measure, and audit training across thousands of learners while preserving strict tenant isolation and regulatory compliance. The enterprise platform must function as a secure, reliable, and extensible SaaS product without compromising the game engine that powers the training experience. Multi-tenancy and admin capabilities are therefore foundational, not optional. They must support the enterprise roadmap in the BRD, meet Phase 2 delivery timelines, and integrate cleanly with the modular monolith backend and UI system described in DD-09 and DD-07.

The multi-tenancy strategy is explicitly hybrid, as mandated by the BRD. Small and mid-market customers can share a database with schema-level isolation and row-level security, while enterprise and government customers are placed on dedicated database instances. Dedicated schemas are reserved for mid-market tiers only and are not used for enterprise deployments. The goal is to preserve operational efficiency for smaller customers while guaranteeing isolation, performance, and compliance for large or regulated tenants. Tenant isolation is enforced at multiple layers: database RLS policies, strict tenant context propagation in the application layer, and audit logs that include tenant identity on every access. The `tenant_id` column is mandatory and non-null in all tenant-scoped tables, and the tenant context is injected via middleware on every request in the Fastify application. Cross-tenant queries are prohibited by design, and any attempt to access data without a tenant context is rejected at the database level.

The enterprise admin system is a clean, professional dashboard that intentionally breaks the game's diegetic interface. It provides features for tenant configuration, user and group management, role assignment, campaign creation, phishing simulation scheduling, compliance reporting, integration setup, white-label branding, and audit evidence generation. The UI and UX are aligned with DD-07, using a standard SaaS visual system and avoiding terminal aesthetics. The admin API is delivered by the `admin` module in DD-09, coordinated with `auth`, `analytics`, `billing`, `notification`, and `game-engine` modules through explicit service interfaces and event-driven workflows.

Key objectives for this design include the following outcomes.

- Guarantee tenant isolation, even under high concurrency and asynchronous job execution.
- Provide tenant provisioning within five minutes with automated onboarding workflows.
- Offer white-label branding with propagation in sixty seconds and custom domains per tenant.
- Support enterprise identity standards: SAML 2.0, OIDC, SCIM 2.0, and JIT provisioning.
- Enforce RBAC and ABAC with low-latency policy evaluation and role scoping by department, location, or team.
- Deliver audit-ready evidence with immutable logs and configurable retention aligned to regulatory frameworks.
- Allow enterprise admins to operate the program without the game tone, while keeping the actual training experience consistent with the narrative gameplay.

This document focuses on design decisions and system behaviors rather than implementation details of unrelated modules. It ties enterprise requirements from the BRD to a concrete multi-tenant architecture and admin experience, defining how tenant data, user identities, training campaigns, compliance evidence, and administrative actions are managed in a consistent, scalable, and secure manner.

---

## 2. Scope and Non-Goals

**In scope**

- The tenant model and isolation strategy for enterprise deployment.
- Tenant lifecycle, provisioning, and configuration workflows.
- Admin-facing capabilities that enable enterprise deployment, compliance reporting, and training operations.
- Identity, provisioning, and access control for enterprise tenants.
- UI and UX requirements for the admin dashboard as specified by DD-07.
- Compliance evidence and audit logging needs tied to enterprise governance.
- Integration surfaces and configuration that are managed by admins.
- Operational safeguards, data residency, and security controls for tenant data.

**Out of scope**

- Game core loop logic, session state machine, or threat engine details that are already specified in DD-01 and DD-05.
- Consumer product flows such as season pass, cosmetics, or public leaderboards.
- Detailed UX for the player experience within the terminal aesthetic; that is defined in DD-07.
- Low-level implementation of the AI pipeline or content generation mechanics.
- Marketing, go-to-market execution, or pricing policy beyond licensing mechanics tied to admin features.

This document is intended to be a system design reference for the enterprise platform. It does not replace the BRD but operationalizes the BRD requirements for multi-tenancy and admin into an implementable plan.

---

## 3. Inputs and Dependencies

This design is derived from and must remain consistent with the following inputs.

- BRD-DMZ-2026-001. Primary source for enterprise requirements, including multi-tenancy isolation, RBAC and ABAC, SSO, SCIM, compliance reporting, audit trails, white-labeling, and data residency.
- DD-07 UI/UX and Terminal Aesthetic. Source of the admin dashboard visual system and the explicit requirement to avoid game UI motifs in admin interfaces.
- DD-09 Backend Architecture and API. Source of module boundaries, admin module responsibilities, and tenant-aware middleware and database conventions.
- DD-01 Core Loop and State Machine. Source for session observation behavior for trainers and the event-sourced architecture that must remain tenant-safe.
- DD-05 Threat Engine and Breach Mechanics. Source for incident data and analytics that feed enterprise reporting and admin dashboards.

Dependencies and assumptions used in this design.

- The backend is a Fastify modular monolith using TypeScript, with Drizzle ORM and PostgreSQL, and uses Redis for caching, BullMQ for jobs, and event sourcing for game state.
- The admin module is a first-class module with tenant and campaign tables, and the auth module provides RBAC and SCIM capabilities.
- Row-level security is used in PostgreSQL, and tenant context is enforced at the middleware level.
- The admin interface is a separate visual theme from the game interface and uses a standard SaaS design language.

---

## 4. Terminology and Definitions

| Term | Definition |
|---|---|
| Tenant | A single enterprise customer instance, representing one organization with users, data, and configuration isolated from other organizations. |
| Tenant Isolation | The technical and procedural controls that prevent data access across tenants and enforce separation. |
| Shared Schema | Multi-tenant database model where tenants share a schema and data is separated by `tenant_id` with RLS enforcement. |
| Dedicated Schema | Multi-tenant database model where each tenant has its own schema in a shared database server. |
| Dedicated Database | Single-tenant database instance (and optionally server) isolated per enterprise tenant. |
| Tenant Admin | A user within a tenant who administers their organization, including configuration, users, and campaigns. |
| Super Admin | Platform operator with tenant metadata visibility for support and provisioning. Access to tenant data is always performed with an explicit tenant context and never via cross-tenant queries. |
| Trainer | A role responsible for creating training campaigns and reviewing user performance. |
| Learner | A standard end user participating in training through the game experience. |
| RBAC | Role-based access control using predefined or custom roles. |
| ABAC | Attribute-based access control using attributes like department, location, or time. |
| JIT Provisioning | Just-in-time account creation on first SSO login. |
| SCIM | System for Cross-domain Identity Management used for automated provisioning. |
| White-labeling | Tenant-specific branding across admin and optionally in-game interfaces. |
| Audit Log | Immutable record of administrative actions and evidence events. |
| Evidence | Reports, certificates, or logs that demonstrate training compliance to regulators. |

---

## 5. Design Principles

The enterprise multi-tenant and admin system is guided by these principles.

- Isolation by default. Every system must assume it is operating in a multi-tenant environment and must actively enforce tenant boundaries.
- Defense in depth. No single control is trusted to prevent cross-tenant access; database, application, and logging layers all enforce isolation.
- Compliance is a product feature. Reporting, evidence, and audit trails are first-class outputs, not afterthoughts.
- Admin UX clarity over aesthetics. The admin system prioritizes clarity, speed, and professional familiarity.
- Provisioning must be quick and repeatable. Automated onboarding is mandatory to meet the five-minute provisioning requirement.
- Shared codebase, different surfaces. Admin experiences and game experiences are integrated but visually and conceptually distinct.
- Scalable segmentation. The architecture must allow the platform to migrate tenants between isolation tiers without data loss.
- Explicit tenant context. All services, events, and analytics must carry tenant identifiers, and any missing context is treated as an error.
- Integrations are enterprise-grade. SSO, SCIM, LMS, SIEM, SOAR, and HRIS integrations must be reliable, observable, and documented.
- Privacy and fairness. Training data must not be used for disciplinary action by default, and privacy controls must be strong enough to support GDPR and other regulations.

---

## 6. Tenant Model and Segmentation Strategy

### 6.1 Tenant Definition

A tenant represents a single organization. It contains all organizational configuration, users, role mappings, campaign definitions, reporting data, compliance evidence, and integration settings. Tenants are the top-level scope for data isolation. All data written by a tenant must be addressable by `tenant_id`, and all access is mediated through tenant-aware access controls.

### 6.2 Segmentation Tiers

The BRD mandates a hybrid multi-tenancy model to balance scalability with isolation and enterprise expectations. We define three tiers.

- Shared schema tier for SMB. Data resides in a shared schema in a shared database. Isolation is enforced via RLS and strict tenant context handling.
- Dedicated schema tier for mid-market. Each tenant has its own schema in a shared database instance. This provides cleaner logical separation and easier per-tenant export.
- Dedicated database tier for enterprise and government. Each tenant has its own database instance, with optional dedicated database server or cluster for high-compliance requirements. Enterprise tenants are never placed on shared schemas.

### 6.3 Tenant Tier Criteria

Tenant tier assignment is based on measurable criteria.

- Regulatory sensitivity. Government, healthcare, or financial services tenants are defaulted to dedicated database.
- Seat count. Mid-market tenants above a defined threshold move to dedicated schema. Enterprise tenants above the enterprise threshold move to dedicated database.
- Data residency requirements. Tenants with strict regional requirements may require dedicated infrastructure in-region.
- Performance and uptime SLAs. The BRD defines three availability tiers: Consumer (99.5% uptime), Enterprise Standard (99.9% uptime with 4-hour monthly maintenance window), and Enterprise Premium (99.95% uptime with zero-downtime deployments), per BRD Section 7.3. Premium SLA commitments require more isolation.

The platform must support tenant tier migration without service interruption. Migration occurs through controlled data replication and cutover procedures defined in Section 21.

### 6.4 Tenant Metadata

A tenant has a rich configuration profile. The tenant metadata must include the following attributes.

- `tenant_id` as a UUID primary key.
- `name` and `slug` for display and URL routing.
- `domain` for custom domains and SSO email verification.
- `plan_id` and tier designation for billing and entitlements.
- `data_region` and residency policy.
- `branding` configuration for white-label UI.
- `settings` for feature flags and enterprise-specific options.
- `is_active` and lifecycle status fields.

The metadata model aligns with the table defined in DD-09 and extends it with additional settings and configuration for multi-tenant isolation routing.

---

## 7. Tenant Lifecycle and Provisioning

### 7.1 Lifecycle States

Tenant lifecycle states determine what actions are permitted and how the system behaves.

- Provisioning. Tenant record created, infrastructure initialized, baseline configuration applied.
- Active. Tenant is live with full access, SSO configured, and users provisioned.
- Suspended. Tenant access is paused due to non-payment, security issue, or admin request.
- Archived. Tenant is closed and data retained for compliance until deletion window passes.
- Deleted. Tenant data removed or anonymized based on retention policy.

These states are represented as explicit status flags and logged in the audit system. State transitions require a super admin action and a recorded reason.

### 7.2 Provisioning Workflow

Tenant provisioning must complete in under five minutes as required by the BRD. The workflow is automated and includes the following steps.

1. Create tenant record with metadata, plan, and region.
2. Allocate tenant resources based on tier. For shared schema, only metadata is created. For dedicated schema (mid-market only), schema is created and migrations are applied. For dedicated database (enterprise and government), a database is provisioned and migrations are applied.
3. Configure default roles and permissions. Default roles include Super Admin, Tenant Admin, Manager, Trainer, and Learner.
4. Provision initial admin user and send activation email.
5. Configure default branding and optional custom domain placeholders.
6. Initialize analytics and compliance baselines.
7. Create audit log entries for tenant creation.

Automated provisioning is implemented as an asynchronous job in BullMQ to ensure that heavy tasks, such as schema creation or migration, do not block the API response. A provisioning status endpoint allows the UI to show progress.

### 7.3 Onboarding and Setup Wizards

After provisioning, tenant admins are guided through a structured onboarding wizard in the admin dashboard. The wizard covers configuration steps in a logical order.

- Organization profile and branding setup.
- Identity provider configuration for SAML or OIDC.
- SCIM token generation and provisioning test.
- LMS integration selection and configuration.
- Initial campaign creation, including baseline phishing simulation and onboarding training.
- Compliance framework selection to activate reporting requirements.
- Data retention and privacy settings confirmation.

The wizard enforces a minimum viable configuration so that training is not launched without essential compliance settings.

### 7.4 Suspension and Reactivation

When a tenant is suspended, the system enforces the following behaviors.

- User authentication is blocked, but data remains intact.
- Active campaigns pause and resume when the tenant is reactivated.
- Notifications are halted except for billing or compliance alerts.
- Audit logs record the suspension reason and initiating admin.

Reactivation restores access with no data loss and triggers a compliance integrity check to verify that retention policies were not violated during suspension.

### 7.5 Offboarding and Deletion

Offboarding is a controlled process aligned with regulatory retention requirements. The system must support the following options.

- Data export in CSV, JSON, and PDF formats for audit purposes.
- Data retention schedules aligned with regulatory requirements. The longest applicable requirement governs retention, per BRD.
- Anonymization of personal data where immediate deletion is not permitted.
- Deletion of tenant data after the retention period expires, with a deletion certificate generated for the tenant.

All offboarding actions are recorded in the audit log, and deletion events are tamper-evident.

---

## 8. Multi-tenancy Architecture and Isolation Controls

### 8.1 Multi-layer Isolation Model

Tenant isolation is enforced at three layers.

- Database layer. Row-level security in PostgreSQL enforces tenant-level data access for shared schema. Dedicated schemas provide isolation for mid-market tenants, and dedicated databases provide physical separation for enterprise and government tenants.
- Application layer. Tenant context is injected via middleware and required for all data access. APIs reject requests without tenant context.
- Observability layer. Logs, metrics, and analytics streams include tenant identifiers to prevent confusion and to enable compliance auditing.

This defense-in-depth approach ensures that even if one layer is misconfigured, cross-tenant access is still blocked.

### 8.2 Row-Level Security Enforcement

Every table that is tenant-scoped includes a non-null `tenant_id`. RLS policies are enforced as follows.

- The database connection sets an `app.tenant_id` session variable at the start of each request.
- RLS policies compare `tenant_id` to the session variable for reads and writes.
- Cross-tenant access from the application layer is not permitted. Any multi-tenant aggregation is performed through a separate anonymized analytics pipeline that never bypasses tenant scoping.

RLS policies are applied to all schemas containing tenant data, including analytics snapshots, audit logs, and training records. The policy design is consistent with the `tenant-context` middleware described in DD-09.

### 8.3 Shared Schema Partitioning

In shared schema mode, all tables are in a shared schema (such as `public`), and `tenant_id` acts as the primary partition key. Where possible, tables are partitioned by tenant and time for performance and retention management. For example, event logs may be partitioned monthly with tenant_id as an index for query efficiency.

### 8.4 Dedicated Schema Model

In dedicated schema mode, each tenant is assigned a schema namespace, for example `tenant_acme`. The tenant schema includes all tenant-scoped tables, while shared system tables remain in the `public` schema. RLS remains active as a safety net, but the primary separation is the schema boundary. Dedicated schema is used for mid-market tenants that require stronger isolation and simpler export, and it is not used for enterprise or government deployments.

### 8.5 Dedicated Database Model

In dedicated database mode, a tenant receives a separate database instance. The database is created in the tenant's data region and uses separate encryption keys. This model is required for enterprise and government tenants and supports FedRAMP-ready deployments. It also enables per-tenant maintenance windows and dedicated performance scaling.

### 8.6 Tenant Context Propagation

Tenant context must be propagated across all internal services and asynchronous jobs.

- API requests. The tenant context is derived from authentication tokens, SSO assertions, or API key metadata.
- Event bus. Domain events include `tenantId` in metadata for downstream services.
- Asynchronous jobs. Background tasks include `tenantId` and are denied if absent.
- WebSocket sessions. Each connection is bound to a tenant and only receives tenant-scoped messages.

Any missing or inconsistent tenant context results in a hard failure and a security audit log entry.

### 8.7 Caching and Data Leakage Prevention

Redis caches must be tenant-aware. Cache keys always include `tenant_id` to avoid leakage. Shared caches are acceptable if key names are strictly namespaced. For dedicated database tenants, per-tenant Redis clusters may be provisioned if required by compliance.

### 8.8 Analytics Isolation

Analytics data is produced from game events and training outcomes. It is stored in ClickHouse or TimescaleDB. Each record includes `tenant_id`. Access to analytics is always scoped by tenant. Aggregated benchmarks across tenants are only presented when data is anonymized and when the tenant has opted in to benchmarking.

### 8.9 Data Residency and Region Controls

The platform supports EU (Frankfurt/Ireland), US (US-East/US-West, GovCloud where required), UK (London), and APAC (Singapore/Tokyo/Sydney) regions as defined in BRD Section 7.7. Tenant data is stored in the selected region. Cross-region replication is disabled by default. If a tenant opts into multi-region redundancy, data is encrypted with regional keys and audit logs record cross-border transfers.

### 8.10 Custom Domains and White-labeling

Custom domains are provisioned per tenant for the admin portal and optionally for the training experience. DNS verification and TLS certificates are handled automatically. Branding changes propagate within sixty seconds, as required by the BRD, through cache invalidation and theme configuration refresh in the frontend.

---

## 9. Identity, SSO, and User Provisioning

### 9.1 Authentication Modes

Enterprise authentication supports local credentials, SAML 2.0, and OIDC. Local credentials are allowed for bootstrap admin accounts and optional for tenants that require local emergency access. SSO is the primary mode for most enterprise customers.

### 9.2 SAML 2.0 Requirements

SAML support includes SP-initiated and IdP-initiated flows with encrypted assertions. Each tenant can configure multiple SAML connections. SAML metadata is stored in tenant settings. The system validates assertion signatures, enforces `audience` and `recipient` checks, and supports JIT provisioning.

### 9.3 OIDC Requirements

OIDC is supported with Authorization Code plus PKCE (FR-ENT-007). Tenants can configure multiple OIDC providers. Tokens are validated for issuer, audience, and nonce. Group claims can be mapped to roles and scopes. Back-channel logout is supported for both SAML and OIDC, as specified in BRD Section 10.3.

### 9.4 SCIM 2.0 Provisioning

SCIM 2.0 full compliance (RFC 7643/7644) is required for automated provisioning with verified support for Okta, Microsoft Entra ID, and Ping Identity, as specified in BRD FR-ENT-008. The SCIM service implements the standard endpoints for Users and Groups, including Bulk operations, pagination, and filtering. SCIM user sync latency must be under sixty seconds (FR-ENT-010). Configurable sync frequency is supported, with a fifteen-minute minimum interval for scheduled sync and real-time push mode, as specified in BRD Section 10.3. When SCIM pushes updates, the platform reconciles user status, department, manager, and location attributes with the organization model.

### 9.5 Just-in-Time Provisioning

JIT provisioning creates users on first successful SSO login when SCIM is not configured. JIT assigns a default role based on SSO group mapping or tenant defaults. JIT users are flagged so that the admin can review and finalize their profile.

### 9.6 User Lifecycle Management

User lifecycle events include creation, activation, suspension, deactivation, and deletion. Deactivation retains training data but blocks access. Deletion follows retention rules. All lifecycle changes are recorded in the audit log.

### 9.7 API Keys and Service Accounts

Enterprise integrations use API keys with scoped permissions. API keys are bound to a tenant and can be restricted to specific scopes such as analytics read, webhook management, or SCIM. Keys are rotated and audited. Service accounts are represented as users with role assignments and API key privileges, and they are always tenant-scoped with no cross-tenant access.

---

## 10. Authorization Model (RBAC + ABAC)

### 10.1 Role Definitions

The platform includes built-in roles aligned with the BRD.

- Super Admin. Platform-wide privileges for provisioning and support with tenant metadata visibility. Access to tenant data requires explicit tenant-scoped context and never uses cross-tenant queries.
- Tenant Admin. Full control of tenant configuration, users, integrations, and reports.
- Manager. Visibility into their team's performance and campaign status.
- Trainer. Capability to create campaigns, view results, and observe training sessions.
- Learner. Access to training and personal progress only.

### 10.2 Custom Roles

Tenants can create custom roles by composing permissions from a defined permission catalog. Permissions are grouped by domain, such as user management, campaign management, integration configuration, compliance reporting, or billing. Custom roles are only available to tenants with appropriate plan entitlements.

### 10.3 Scope Restrictions

Roles can be scoped by department, team, or location. Scope enforcement is an ABAC rule that combines role permissions with attribute filters. This enables a regional admin to manage only their region while a global admin can access all data.

### 10.4 Time-bound Role Assignment

Role assignments can include expiration dates. The system automatically revokes expired roles and logs the event. This supports temporary access for auditors, contractors, or incident response teams.

### 10.5 Policy Evaluation Performance

ABAC evaluations must complete under ten milliseconds at P99, per BRD. Policies are cached in Redis and evaluated locally in the auth module. Cache invalidation occurs when role or scope definitions change.

### 10.6 Permission Catalog

The permission catalog defines the explicit actions that roles can perform. Examples include:

- tenant.read
- tenant.update
- user.read
- user.update
- user.suspend
- campaign.create
- campaign.start
- campaign.read
- phishing.simulate
- compliance.report.read
- audit.log.read
- integration.configure
- billing.read
- billing.update
- analytics.view
- session.observe

Each permission is logged when executed to support auditability and anomaly detection.

---

## 11. Organization and Group Model

### 11.1 Organizational Structure

The enterprise admin system models organization hierarchy to support role scoping and reporting. The structure includes departments, teams, locations, and optional cost centers. Each user can be assigned to multiple groups but must have a primary department and location for reporting.

### 11.2 Manager Relationships

The platform supports manager attributes for each user. Manager relationships are imported from SCIM or HRIS. Manager visibility determines which metrics and reports a manager can access.

### 11.3 Groups and Cohorts

Groups represent logical cohorts for training campaigns. Groups can be dynamic based on attributes or static lists. Dynamic groups are evaluated periodically and are used for campaign targeting and reporting.

### 11.4 Learner Attributes

Learners have attributes that influence training assignment and reporting. These include hire date, role, department, location, risk score, and compliance requirements. Attributes are the basis for ABAC policies and training rules.

---

## 12. Enterprise Admin Product Surface

### 12.1 Admin Dashboard Overview

The admin dashboard is the primary entry point for tenant administrators. It provides a summary of current campaigns, user engagement, phishing simulation outcomes, compliance status, and key performance metrics. The dashboard is tailored to the tenant's selected compliance frameworks and highlights gaps that require action.

The dashboard includes the following metrics.

- Active campaigns and enrollment counts.
- Training completion rates by department and location.
- Phishing simulation click rates and reporting rates.
- Risk heat map by department, location, and role (FR-AN-010).
- Compliance posture by framework.
- Recent activity feed and alerts.

### 12.2 User and Group Management

Admins can view, search, and manage users. The user management interface includes status, role, training progress, and last login. Admins can suspend or deactivate users, assign roles, and adjust training assignments. Group management supports dynamic rules and manual overrides.

### 12.3 Campaign Management

Campaign management is a core admin feature. Admins and trainers can create campaigns for onboarding, quarterly training, or event-driven interventions. Campaign configuration includes:

- Target audience selection by group, department, or attribute.
- Training frequency and reminder cadence.
- Phishing simulation setup and templates.
- Escalation workflows including reminder, manager notification, and compliance alert, as specified in BRD FR-ENT-017.
- Configurable training frequencies per regulatory framework, supporting onboarding, quarterly, annual, and event-driven cadences (FR-ENT-018).
- Just-in-time training delivery within sixty seconds of a triggering event such as a phishing click, policy violation, or DLP alert (FR-ENT-019), with throttling limited to a maximum of two interventions per week per learner (FR-ENT-020).
- Campaign start, pause, and completion controls.

Campaigns produce results that feed analytics and compliance reporting. Campaign templates can be reused across departments. Training content used in campaigns supports content versioning with a full audit trail of changes and reviews (FR-ENT-042). An annual program review workflow with sign-off is supported to meet PCI-DSS 12.6.2 requirements (FR-ENT-043).

### 12.4 Phishing Simulation Management

The admin system includes a phishing simulation engine. Admins can choose from templates or create custom simulations. Simulations can target multiple channels, including email, SMS, voice, and QR code (FR-ENT-021). Custom simulation templates include a visual editor with merge-tag support (FR-ENT-023). Post-failure "teachable moment" landing pages are displayed immediately after simulation failure and are configurable (FR-ENT-024). Dedicated sending infrastructure and email authentication are managed per tenant, with enterprise tiers supporting per-tenant IP isolation (FR-ENT-025). Email authentication requires full SPF, DKIM with 2048-bit RSA minimum, and DMARC alignment (FR-ENT-026). The dedicated MTA infrastructure supports one million emails per hour sustained throughput, 99%+ inbox delivery rate, and automated IP warm-up, as specified in BRD Section 10.4. Email gateway allowlisting documentation and automation are provided for Proofpoint, Mimecast, and Microsoft Defender (FR-ENT-027).

### 12.5 Compliance Reporting

Compliance reporting is built into the admin platform with real-time compliance dashboards per regulatory framework (FR-ENT-028). Admins can generate audit-ready reports with one-click export in PDF, CSV, and JSON (FR-ENT-029). Reports include training completion, policy acknowledgment and attestation tracking (FR-AN-016), certificates, and audit logs. The platform includes automated compliance gap identification to highlight missing training or expired certifications (FR-AN-014). The platform supports compliance reporting for GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, and FedRAMP as specified in BRD FR-AN-013.

### 12.6 Analytics and Insights

Admin analytics provide training effectiveness metrics and ROI indicators. Metrics include knowledge retention measurement via spaced repetition assessments (FR-AN-002), behavioral change metrics including time-to-report suspicious emails, password hygiene scores, and data handling compliance (FR-AN-003), competency mapping across seven domains (phishing detection, password security, data handling, social engineering resistance, incident response, physical security, compliance awareness) per FR-AN-004, phishing susceptibility trends, and departmental comparisons. The platform includes a cost-of-breach avoidance calculator based on organizational risk reduction (FR-AN-005), phishing susceptibility reduction tracking from baseline to current (FR-AN-006), training cost per employee comparison against industry benchmarks (FR-AN-007), and cyber-insurance premium impact tracking (FR-AN-008). A dedicated CISO dashboard provides risk scoring, compliance posture, and board-ready visualizations (FR-AN-009). Content effectiveness scoring per module is tracked to enable continuous improvement (FR-AN-019). An A/B testing framework supports experimentation with game mechanics and training content (FR-AN-020). Predictive analytics highlight at-risk players likely to churn or fail assessments, with trend analysis and predictive risk indicators (FR-AN-011, FR-AN-021). Industry benchmarking against anonymized peer data is available for tenants that opt in (FR-AN-012). Executive dashboards provide board-ready summaries.

### 12.7 Integration Configuration

The admin UI allows configuration of integrations. These include SSO providers, SCIM provisioning, LMS connectors, SIEM and SOAR outputs, HRIS syncs, and communication platform integrations. Admins can generate API keys, configure webhooks, and test integration health.

### 12.8 White-label Branding

Admins can configure branding for the admin interface and optional in-game overlays. Branding includes logo, colors, fonts, custom domains, and email templates, as defined in BRD FR-ENT-005. Changes propagate within sixty seconds. White-labeling is constrained by accessibility requirements to ensure contrast compliance.

### 12.9 Session Observation and Coaching

Trainers can observe learner sessions in a read-only mode to provide coaching or remediation. Observation uses the event-sourced game state, allowing a trainer to replay decision sequences and provide feedback. Observation is logged for audit purposes.

### 12.10 Enterprise Team Competitions and Leaderboards

The admin platform supports enterprise team competitions and leaderboard management as defined in BRD Section 6.4. Admins can configure department-based team competitions with manager visibility (FR-MP-015) and organization-wide leaderboards with configurable privacy settings (FR-MP-016). Cross-organization anonymized benchmarking is available for tenants that opt in (FR-MP-017). Admins can schedule capture-the-flag events, seasonal tournaments, and hackathon events (FR-MP-018). Enterprise Corporation auto-provisioning from organizational structure is supported, allowing the in-game guild and corporation systems to map directly to tenant organizational hierarchies (FR-MP-014). Leaderboard and competition data is tenant-scoped and respects RBAC scope restrictions.

### 12.11 Content Localization and Language Support

The admin platform supports content localization for training materials across 24 official EU languages, as required by the BRD (FR-ENT-044). A professional translation management workflow allows admins to track translation progress and approve localized content. Cultural adaptation of phishing simulations is supported per locale, including local email conventions, brands, and threat patterns (FR-ENT-045). RTL language support for Arabic, Hebrew, and Farsi is included (FR-ENT-046). Admins can configure which languages are active for their tenant and assign locale-appropriate training to users based on their profile attributes.

### 12.12 Notifications and Alerts

Admins can configure notification preferences. Alerts include campaign completion reminders, phishing failures, compliance deadlines, seat limit warnings, and integration failures. Notifications are delivered through email, in-app alerts, and optionally Slack or Teams.

---

## 13. Admin UX and Visual System

### 13.1 Visual Separation from Game UI

The admin interface intentionally breaks the game's diegetic terminal aesthetic. It uses a clean SaaS design language with a light default theme and an optional dark mode. This is consistent with DD-07. Admin users are not playing a character; they are managing a program.

### 13.2 Layout and Navigation

The admin interface uses a sidebar navigation pattern with top-level sections: Dashboard, Campaigns, Users, Phishing Sim, Compliance, Reports, Integrations, Settings, and Help. Breadcrumb navigation is used for context in deep views such as campaign detail or user profile.

### 13.3 Component System

Admin components reuse the shared Svelte 5 component library but with an `admin` variant that uses the enterprise palette and typography. Tables are sortable, filterable, and paginated. Charts use standard data visualization styles with clear legends and accessible colors.

### 13.4 Accessibility Requirements

The admin UI is WCAG 2.1 AA compliant as a baseline, with Section 508 compliance for US government market access and EN 301 549 compliance for EU market, as required by the BRD (Section 7.5). All interactive elements are keyboard accessible with visible focus states. Color is never the sole channel for meaning. The interface respects `prefers-reduced-motion` and supports screen readers. A VPAT is maintained and updated with each release. Admin-specific theming is constrained to maintain contrast and legibility.

### 13.5 White-label UX Controls

White-labeling must not compromise UX. Custom colors are validated for contrast. Custom fonts must include accessible fallbacks. Admins can preview branding changes before publishing. Branding changes are versioned for auditability.

---

## 14. Compliance, Audit Trails, and Evidence

### 14.1 Audit Log Requirements

The platform maintains immutable, append-only audit logs. Every admin action is logged with tenant, user, action, resource type, resource ID, IP address, and timestamp. Audit logs are tamper-evident through a chained hash mechanism using SHA-256 cryptographic integrity verification, as required by the BRD (FR-ENT-030).

### 14.2 Evidence Generation

Evidence outputs include individual training transcripts with complete audit trails (FR-ENT-032), training certificates with digital signatures, regulatory framework references, and expiration dates (FR-ENT-033), compliance reports, and management training attestation reports for NIS2 Article 20 and DORA Article 5 (FR-ENT-034). Reports can be generated on demand and scheduled for periodic delivery.

### 14.3 Retention Policies

Retention is configurable by framework within a range of one to seven years, with the longest applicable period enforced, as specified by the BRD (FR-ENT-031). The admin UI allows configuration of retention policies and displays the effective retention period. Deletion and anonymization are automated when retention periods expire.

### 14.4 Transparency and Employee Privacy

The platform defaults to aggregate reporting for managers, with no individual disciplinary use without separate policy, as specified in BRD Section 9.3. Individual performance details are restricted to authorized roles. Transparent phishing simulation disclosure is required per BRD employee privacy safeguards. Tenant admins must explicitly enable individual disciplinary reporting if required by policy, and such enablement is logged.

---

## 15. Integrations and External Systems

### 15.1 LMS and Learning Standards

The platform supports SCORM 1.2 compliant package export with all ADL conformance tests passed (FR-ENT-035), SCORM 2004 4th Edition with IMS Simple Sequencing for adaptive learning paths (FR-ENT-036), xAPI 1.0.3 and 2.0 with custom verb vocabulary for all learning-relevant interactions (FR-ENT-037), LTI 1.3 with LTI Advantage including Deep Linking, Assignment and Grade Services, and Names and Role Provisioning Services (FR-ENT-039), cmi5, and AICC HACP for legacy LMS compatibility (FR-ENT-040). The platform includes a built-in Learning Record Store (LRS) for organizations that do not operate their own, as required by the BRD (FR-ENT-038). Verified LMS integrations include Cornerstone, SAP SuccessFactors, Workday, Moodle, and Canvas (FR-ENT-041). Additional platform compatibility is supported for Docebo, Absorb, TalentLMS, Litmos, Blackboard, Brightspace, Totara, 360Learning, LearnUpon, and Google Classroom, as specified in BRD Section 10.2. Admins can export packages or connect via LTI for embedded training. The admin interface provides integration health checks and validation logs.

### 15.2 SIEM and SOAR Integrations

SIEM integrations send events for phishing simulation outcomes, training completion, and user risk scoring. Verified SIEM platforms include Splunk (HTTP Event Collector and REST API), IBM QRadar (Syslog LEEF and REST API), Microsoft Sentinel (Azure Monitor Data Collector API), and Elastic Security (Elasticsearch Bulk API and Elastic Agent), as specified in BRD Section 10.1. Universal SIEM requirements include CEF/LEEF/Syslog fallback for unsupported platforms and generic HTTPS webhook output. SOAR integrations provide bidirectional workflows for automated remediation, with verified platforms including Palo Alto Cortex XSOAR (certified content pack and REST API) and Swimlane (Turbine connector and REST API), per BRD Section 10.1. All SOAR integrations support bidirectional API, idempotent operations, and rate limit awareness. Admins can configure event filtering and rate limits. All integration events carry tenant identifiers and are signed to prevent spoofing.

### 15.3 HRIS and HCM Integrations

HRIS integrations synchronize user data and organizational structure. Verified HRIS platforms include Workday, BambooHR, SAP SuccessFactors, and ADP, as specified in BRD Section 10.5. Integration is bidirectional and supports organizational structure synchronization and user lifecycle management. New hires, role changes, department transfers, and terminations trigger event-driven training events. Admins can enable or disable HRIS sync and view synchronization logs.

### 15.4 Communication Platforms

Microsoft Teams integration uses Bot Framework v4 with adaptive cards, providing personal and channel tabs, training reminders, phishing report forwarding, microlearning modules delivered inline, risk dashboards, and leaderboards, published to the Teams App Store. Slack integration uses Events API, Web API, and Bolt SDK, with slash commands (/thedmz status, leaderboard, report, train, risk), Block Kit notifications, App Home dashboard, and Enterprise Grid support, published to the Slack App Directory. These integrations are specified in BRD Section 10.4. Admins can configure which channels are enabled and control notification frequency.

### 15.5 API and Webhooks

The platform provides a RESTful API with OpenAPI 3.0 specification and a GraphQL endpoint for complex analytical queries, as defined in BRD Section 10.6. API authentication uses OAuth 2.0 client credentials for service-to-service communication. Rate limiting is enforced with `X-RateLimit-Remaining` and `Retry-After` response headers. API endpoints are versioned (v1, v2) with twelve-month deprecation windows. Webhooks deliver event notifications for integrations. All webhooks are signed with HMAC signature verification and include tenant metadata. Admins can manage webhook endpoints and view delivery logs.

---

## 16. Billing, Licensing, and Entitlements

### 16.1 Seat Counting and Limits

Seat counts are calculated based on active users. The billing module tracks seat usage and triggers alerts when limits are reached. Admins can view seat usage in the billing section of the admin UI.

### 16.2 Plan-based Feature Entitlements

Features are enabled based on plan tier, aligned with the BRD pricing tiers (Section 12.1): Starter (50-500 users, $3-5/user/month, core game training, phishing simulation, basic reporting, and SCORM/LTI export), Professional (500-5,000 users, $5-8/user/month, adds SSO, SCIM, LMS integration, advanced analytics, and campaign management), Enterprise (5,000+ users, $8-15/user/month, adds dedicated instance, SIEM/SOAR integration, custom content, API access, and dedicated CSM), and Government (custom pricing, adds FedRAMP compliance, data sovereignty, and air-gapped deployment option). Enterprise pricing supports 15-25% discounts for multi-year (3-year) commitments and volume discounts above 10,000 seats, as specified in BRD Section 12.1. An MSP/reseller program supports channel distribution. The admin UI displays which features are active and which require an upgrade.

### 16.3 License Keys and Contracts

Enterprise licenses may include contract-specific entitlements. License keys are stored per tenant and used to unlock custom features or dedicated infrastructure. Additional revenue streams supported by the billing system include implementation and onboarding fees ($5K-$50K based on complexity), custom content development ($25K-$100K per engagement), premium support tiers (24/7 SLA), and annual program review and optimization consulting, as specified in BRD Section 12.1. Contract details are visible to tenant admins with billing privileges.

---

## 17. Observability and Operational Controls

### 17.1 Logging and Metrics

All admin actions, provisioning steps, and integration events are logged with tenant context. Metrics are collected using Prometheus and visualized in Grafana, as specified in BRD Section 8.7. Key metrics include API latency by tenant, campaign scheduling performance, and SCIM sync latency. Alerts are triggered for anomalies such as cross-tenant access attempts or high error rates.

### 17.2 Health Dashboards

Super admins have access to a system health dashboard showing tenant status, integration health, and service uptime. Tenant admins see a limited health view for their own tenant.

### 17.3 Rate Limiting and Abuse Prevention

Rate limits are applied per tenant and per endpoint. Sensitive admin actions, such as user suspension or deletion, have stricter limits. Rate limit events are logged and visible to super admins.

### 17.4 Incident Management

Admin-related incidents are tracked separately from game incidents. Incident playbooks include communication to affected tenants, temporary suspension of integrations, and rapid audit log review.

---

## 18. Security, Privacy, and Data Protection

### 18.1 Encryption

All data is encrypted in transit with TLS 1.2 or higher with strong cipher suites and at rest with AES-256. Dedicated database tenants can use tenant-specific encryption keys. Key management is jurisdiction-specific to support data residency, as specified in the BRD (Section 7.4).

### 18.2 MFA and Session Controls

Super admin access requires hardware-backed MFA using FIDO2/WebAuthn, as specified in the BRD (Section 7.4). Maximum super admin session duration is four hours with no refresh. Tenant admin access requires MFA with strong authentication policies. Sessions have maximum durations and idle timeouts. Session policies are enforced by tenant configuration.

### 18.3 Zero-trust Integration Posture

Every integration endpoint is authenticated, authorized, encrypted, and audited. Webhooks are signed. API keys are scoped. Integration tokens are rotated regularly and stored encrypted.

### 18.4 Privacy Controls

The platform supports data export and deletion under GDPR. Lawful basis is documented per processing activity, and data minimization is enforced by design. A Data Protection Impact Assessment (DPIA) is required for phishing simulations and behavioral analytics, as specified in BRD Section 9.3. A pseudonymization engine with separate key management is available for sensitive analytics. Cross-border data transfer mechanisms include Standard Contractual Clauses (SCCs) and EU-US Data Privacy Framework (DPF) compliance, as specified in BRD Section 9.3. Training data is not used for HR disciplinary actions by default, and no linking of training performance to HR decisions is permitted without explicit policy, consistent with the BRD's employee privacy safeguards. Any exception requires explicit tenant policy configuration.

### 18.5 Breach Notification

The platform supports a 72-hour breach notification capability as required by GDPR (BRD Section 9.3). The admin system provides workflows for tenant notification in the event of a data breach, including automated evidence collection and audit log review. Cross-border data transfer logging supports the notification requirements.

### 18.6 Secure Admin Actions

Sensitive admin actions require elevated permission checks and are logged. For example, changing retention policy, exporting data, or configuring SSO requires a tenant admin role and may require step-up authentication.

---

## 19. Data Retention, Export, and Deletion

### 19.1 Retention Policies

Retention policies are configurable by regulatory framework within a range of one to seven years (FR-ENT-031). The system calculates an effective retention period based on tenant selections and legal requirements, with the longest applicable period governing. Specific framework retention periods include HIPAA (six years), SOX (seven years), FedRAMP/FISMA (three years), DORA (five years), ISO 27001 (three years minimum), PCI-DSS (one year minimum with three months hot and twelve months accessible for logs), and GLBA (five years), as detailed in BRD Section 9.4. Retention applies to training records, audit logs, and compliance evidence.

### 19.2 Data Export

Admins can export data for audits. The platform supports individual data export under GDPR Article 15 (right of access) and data deletion capability under GDPR Article 17 (right to erasure), as specified in BRD Section 9.3. Exports include user training transcripts, campaign results, and compliance reports. Exports are signed and include integrity hashes. Export operations are logged.

### 19.3 Deletion and Anonymization

Data deletion follows retention schedules. When deletion is required, personal data is removed or anonymized. The system generates a deletion certificate and records the action in the audit log.

---

## 20. Testing, Validation, and Assurance

### 20.1 Isolation Tests

Automated tests validate that tenant data cannot be accessed across tenants. Tests include RLS policy enforcement, API request scoping, and cache key isolation.

### 20.2 Security Testing

Security testing includes annual penetration testing by a third-party firm, SSO and SCIM validation, and audit log integrity verification, as specified in BRD Section 7.4. Automated security scanning is integrated into the CI/CD pipeline. The admin interface is tested for OWASP Top 10 vulnerabilities. A responsible disclosure program is maintained for external vulnerability reporting.

### 20.3 Compliance Validation

Compliance reports are validated against framework requirements. Audit logs are tested for immutability, and retention policies are verified through simulated data expiry.

### 20.4 Performance Testing

Performance tests ensure admin dashboards load within two seconds at P95 and that SCIM synchronization completes within sixty seconds. Campaign scheduling and report generation are tested under load.

---

## 21. Scalability, Migration, and Service Extraction

### 21.1 Tenant Tier Migration

Migration is supported from shared schema to dedicated schema for SMB to mid-market growth, and from dedicated schema to dedicated database for mid-market to enterprise transitions. Enterprise tenants are never migrated into shared schemas. Migration is performed by exporting tenant data, applying migrations in the target environment, and cutover through a controlled maintenance window. Audit logs record the migration.

### 21.2 Service Extraction Readiness

The platform must support BRD scalability phases: Launch (10,000 concurrent users, modular monolith, single-region), Growth (50,000 concurrent, extracted AI pipeline and analytics), and Scale (100,000+ concurrent, microservices with NATS JetStream or Kafka, multi-region), per BRD Section 7.2. As usage grows, the admin and analytics modules can be extracted into independent services. The event bus architecture supports this by publishing events and consuming them asynchronously. Tenant context remains mandatory in all event payloads.

### 21.3 Multi-region Scaling

Multi-region deployments are supported with region-specific databases and caches. Tenant data remains in its selected region. Cross-region reporting is disabled by default and only enabled when regulatory and contractual conditions allow.

---

## 22. Implementation Roadmap (Phase 2)

Phase 2 of the roadmap focuses on enterprise features. The multi-tenancy and admin system aligns to the following milestones.

- Months 4 to 5. Implement multi-tenancy architecture, tenant provisioning, tenant context middleware, and basic admin dashboard.
- Months 5 to 6. Add SSO (SAML 2.0, OIDC), SCIM 2.0 provisioning, RBAC with built-in roles, and user management interfaces.
- Months 6 to 7. Implement SCORM 1.2/2004 export, xAPI statement emission, LTI 1.3 integration, and phishing simulation campaign engine.
- Months 7 to 8. Deliver compliance reporting (GDPR, HIPAA, PCI-DSS), audit trail, certificate generation, and white-label branding.
- Months 8 to 9. Integrate SIEM connectors (Splunk, Sentinel), campaign management automation, enterprise analytics dashboards, and begin SOC 2 Type II audit.

Phase 2 deliverables per BRD: full enterprise platform, SSO/SCIM/LMS integration, phishing simulation engine, compliance reporting for 7 frameworks, and 50 enterprise customers. This roadmap aligns with the BRD Phase 2 deliverables and ensures enterprise readiness for customer onboarding.

---

## 23. Open Questions and Decision Log

This section records outstanding questions that require product or engineering decision.

- What are the exact seat thresholds for migrating tenants from shared to dedicated schema (SMB to mid-market) and from dedicated schema to dedicated database (mid-market to enterprise)?
- Which features are gated by plan tier beyond SSO and SCIM?
- What level of anonymized benchmarking is acceptable for enterprise customers?
- How do we define the default retention policy when multiple frameworks overlap and the tenant has not selected frameworks explicitly?
- What is the minimum set of admin dashboards required at launch versus post-launch?

Each open question must be resolved in the next design review and documented in a decision log with owner, date, and rationale.

---

## Appendix A: Detailed Data Model

This appendix provides a detailed data model reference that expands on the tenant and admin tables described in DD-09. The goal is not to define the exact physical schema for every table in the platform, but to provide a consistent conceptual model so that product, engineering, and compliance all share the same understanding of what data exists, why it exists, and how it is scoped by tenant.

### A.1 Core Tenant Tables

The tenant tables define the top-level organizational record and its configuration.

| Table | Purpose | Key Fields |
|---|---|---|
| `public.tenants` | Canonical tenant record for all tenants. | `tenant_id`, `name`, `slug`, `domain`, `plan_id`, `data_region`, `branding`, `settings`, `is_active`, `created_at`, `updated_at` |
| `public.tenant_domains` | Stores custom domains and verification status. | `tenant_id`, `domain`, `status`, `verification_token`, `verified_at` |
| `public.tenant_branding_versions` | Versioned history of branding changes. | `tenant_id`, `version`, `branding`, `created_by`, `created_at` |
| `public.tenant_feature_flags` | Per-tenant feature toggles tied to plan or pilot programs. | `tenant_id`, `feature`, `enabled`, `source` |

The `public.tenants` table is the single source of truth for tenant identity. The domain and branding tables are intentionally separated to allow faster update and caching of branding changes without forcing updates to the core tenant row.

### A.2 Identity and Access Tables

Identity tables are tenant-scoped and must always contain a `tenant_id`. The schema supports multiple authentication modes and a flexible RBAC system.

| Table | Purpose | Key Fields |
|---|---|---|
| `auth.users` | Stores user records with tenant scoping. | `user_id`, `tenant_id`, `email`, `display_name`, `status`, `password_hash`, `last_login_at` |
| `auth.sessions` | Active session records for audit and security. | `session_id`, `tenant_id`, `user_id`, `created_at`, `expires_at` |
| `auth.roles` | Role definitions scoped to a tenant. | `role_id`, `tenant_id`, `name`, `description` |
| `auth.role_permissions` | Mapping of roles to permission strings. | `role_id`, `tenant_id`, `permission` |
| `auth.user_roles` | Role assignments with optional scope and expiration. | `user_id`, `tenant_id`, `role_id`, `scope_json`, `expires_at` |
| `auth.api_keys` | Scoped API keys for service access. | `key_id`, `tenant_id`, `name`, `scopes`, `created_at`, `revoked_at` |

System roles are defined as templates in code (or a non-tenant configuration catalog) and are materialized into each tenant during provisioning so that every auth table remains tenant-scoped with non-null `tenant_id`. The `scope_json` field stores ABAC scoping information such as department or location filters.

### A.3 SSO and SCIM Tables

SSO configuration and SCIM mapping data must be separated from core user tables for security and operational clarity.

| Table | Purpose | Key Fields |
|---|---|---|
| `auth.sso_connections` | SAML or OIDC configuration per tenant. | `tenant_id`, `provider`, `metadata`, `certificate`, `created_at` |
| `auth.scim_tokens` | SCIM bearer tokens for provisioning. | `tenant_id`, `token_hash`, `created_at`, `revoked_at` |
| `auth.scim_group_mappings` | Mapping of IdP groups to roles and scopes. | `tenant_id`, `external_group_id`, `role_id`, `scope_json` |
| `auth.idp_audit` | Logs of SSO assertions and SCIM operations for auditing. | `tenant_id`, `event_type`, `subject`, `details`, `created_at` |

These tables allow admins to configure multiple IdPs per tenant, rotate certificates, and map IdP groups to roles without modifying user records directly.

### A.4 Organization and Group Tables

The organization model enables ABAC scoping, reporting, and campaign targeting.

| Table | Purpose | Key Fields |
|---|---|---|
| `org.departments` | Department definitions. | `department_id`, `tenant_id`, `name`, `parent_id` |
| `org.locations` | Location definitions. | `location_id`, `tenant_id`, `name`, `country_code`, `timezone` |
| `org.teams` | Team definitions, optionally nested under departments. | `team_id`, `tenant_id`, `department_id`, `name` |
| `org.user_attributes` | Attribute assignments for each user. | `user_id`, `tenant_id`, `department_id`, `location_id`, `manager_id` |
| `org.groups` | Dynamic or static groups for campaign targeting. | `group_id`, `tenant_id`, `name`, `type`, `rule_json` |
| `org.group_memberships` | Explicit group membership records. | `group_id`, `user_id`, `tenant_id`, `created_at` |

Dynamic groups store rules in `rule_json`, which are evaluated by the campaign engine to update membership. Static groups store explicit memberships. The admin UI must support both models without conflating them.

### A.5 Campaign and Training Tables

Campaign tables support the training and phishing simulation engines. These tables are owned by the `admin` module but are strongly tied to analytics and compliance reporting.

| Table | Purpose | Key Fields |
|---|---|---|
| `admin.campaigns` | Stores campaign definitions and status. | `campaign_id`, `tenant_id`, `type`, `config`, `schedule`, `status`, `created_by` |
| `admin.campaign_enrollments` | Enrollment records for campaign participants. | `campaign_id`, `tenant_id`, `user_id`, `status`, `enrolled_at` |
| `admin.campaign_events` | Event log for campaign state changes. | `campaign_id`, `tenant_id`, `event_type`, `details`, `created_at` |
| `admin.phishing_simulations` | Template and configuration for phishing simulations. | `simulation_id`, `tenant_id`, `template_id`, `channel`, `config` |
| `admin.phishing_results` | Outcomes of phishing simulations. | `simulation_id`, `tenant_id`, `user_id`, `result`, `timestamp` |

Campaign configuration is stored in JSON to allow flexibility while maintaining strict validation schemas at the application layer.

### A.6 Compliance and Evidence Tables

Compliance tables store evidence, certificates, and reporting snapshots required by regulatory frameworks.

| Table | Purpose | Key Fields |
|---|---|---|
| `compliance.frameworks` | Enabled frameworks per tenant. | `tenant_id`, `framework_id`, `enabled_at` |
| `compliance.reports` | Generated compliance reports. | `report_id`, `tenant_id`, `framework_id`, `format`, `generated_at` |
| `compliance.certificates` | Training certificates for users. | `certificate_id`, `tenant_id`, `user_id`, `framework_id`, `expires_at` |
| `compliance.attestations` | Management attestation records. | `tenant_id`, `attestor_id`, `framework_id`, `signed_at` |
| `compliance.retention_policies` | Retention policy configuration. | `tenant_id`, `policy_json`, `effective_from` |

Reports are stored with integrity hashes and optional digital signatures. Certificates include reference to the underlying training event that produced them.

### A.7 Audit and Logging Tables

Audit logs provide immutable evidence of admin actions and system events.

| Table | Purpose | Key Fields |
|---|---|---|
| `admin.audit_log` | Append-only admin audit events. | `log_id`, `tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `details`, `created_at` |
| `admin.audit_hash_chain` | SHA-256 chain-of-hash material for tamper detection per BRD FR-ENT-030. | `log_id`, `prev_hash`, `hash` |

Audit logs are retained per policy and support export. The hash chain is validated by periodic integrity checks, and any mismatch triggers an alert to the security team.

### A.8 Integration Tables

Integration tables store tenant-specific configuration and health status for external systems.

| Table | Purpose | Key Fields |
|---|---|---|
| `integrations.connections` | Generic integration configuration. | `connection_id`, `tenant_id`, `type`, `config`, `status`, `created_at` |
| `integrations.webhooks` | Webhook endpoints and secrets. | `webhook_id`, `tenant_id`, `url`, `secret_hash`, `status` |
| `integrations.delivery_log` | Delivery records for webhooks and outbound events. | `tenant_id`, `connection_id`, `status`, `response_code`, `created_at` |

Integration secrets are stored encrypted. Delivery logs are retained for troubleshooting and compliance evidence.

### A.9 Analytics and Reporting Tables

Analytics data is large and time-series oriented. It is stored in ClickHouse or TimescaleDB with tenant scoping on each record.

| Table | Purpose | Key Fields |
|---|---|---|
| `analytics.events` | Raw event stream from game and training. | `tenant_id`, `event_type`, `event_ts`, `payload` |
| `analytics.user_metrics` | Aggregated metrics per user. | `tenant_id`, `user_id`, `metric`, `value`, `period_start` |
| `analytics.department_metrics` | Aggregated metrics per department or group. | `tenant_id`, `department_id`, `metric`, `value`, `period_start` |
| `analytics.compliance_snapshots` | Point in time snapshots for audit. | `tenant_id`, `framework_id`, `snapshot_ts`, `summary` |

These tables are used to generate dashboards and compliance reports. Aggregations are computed via scheduled jobs that are tenant-scoped.

---

## Appendix B: Admin Information Architecture

This appendix provides a detailed view of the admin interface information architecture. It is aligned with the admin visual system described in DD-07 and is intended to guide UI implementation and QA.

### B.1 Global Navigation Map

The admin interface uses a persistent sidebar with the following sections.

- Dashboard
- Campaigns
- Users
- Groups
- Phishing Sim
- Compliance
- Reports
- Integrations
- Settings
- Billing
- Help and Docs

Navigation items are role-aware. Users only see the items permitted by their roles and scopes.

### B.2 Page Specifications

| Page | Purpose | Primary Actions | Primary Data Sources |
|---|---|---|---|
| Dashboard | Overview of program health and compliance posture. | Filter by time range, download summary. | Analytics, compliance snapshots |
| Campaigns | Manage training campaigns. | Create, edit, start, pause. | Admin campaigns, enrollment tables |
| Campaign Detail | View campaign performance and participant status. | Export results, send reminders. | Campaign results, analytics |
| Users | Manage tenant users and roles. | Invite, suspend, assign roles. | Auth users, org attributes |
| User Detail | View user training history and performance. | Assign campaign, reset progress. | Analytics user metrics |
| Groups | Manage dynamic and static groups. | Create group, edit rules. | Org groups, memberships |
| Phishing Sim | Configure phishing simulations. | Create template, schedule test. | Admin phishing templates and results |
| Compliance | View compliance framework status. | Generate report, schedule export. | Compliance snapshots, reports |
| Reports | Archive of generated reports and evidence. | Download, regenerate. | Compliance reports |
| Integrations | Configure SSO, SCIM, LMS, SIEM, SOAR, HRIS. | Add connection, test, rotate secrets. | Integration connections |
| Competitions | Manage team competitions and leaderboards. | Create event, configure privacy, view results. | Campaign data, analytics |
| Localization | Manage language settings and translations. | Enable languages, review translations. | Tenant settings, content |
| Settings | Tenant profile, branding, and localization. | Update branding, configure retention. | Tenant settings |
| Billing | Seat counts and plan details. | Upgrade plan, download invoice. | Billing module |
| Help and Docs | Documentation and support. | Open support ticket. | External docs |

### B.3 Dashboard Widgets

Dashboard widgets are standardized and configurable. A tenant can choose which widgets to display, within a set of approved widgets. Widgets include completion rate trend, phishing susceptibility trend, risk heat map, and compliance status by framework. Each widget supports filtering by department, role, or location.

### B.4 Campaign Builder UX

The campaign builder is a multi-step interface.

1. Select campaign type, such as onboarding, quarterly training, or targeted remediation.
2. Choose target audience by group, department, or rule.
3. Configure schedule, including start date, frequency, and reminders.
4. Add training content and optional phishing simulations.
5. Review and launch.

The builder enforces compliance requirements by warning when a framework's required frequency is not met.

### B.5 User Detail View

The user detail page is designed for coaching and audit. It includes training history, phishing simulation outcomes, and completion certificates. Managers with scoped permissions can view high-level metrics but not detailed behavioral events unless explicitly permitted.

### B.6 Integration Setup Wizards

Integration setup is guided by wizards that include step-by-step instructions, connection tests, and validation results. For example, the SSO wizard verifies metadata, allows test logins, and confirms attribute mappings. SCIM setup includes a token generation step and a live provisioning test.

### B.7 Admin Search and Audit Visibility

Admin search supports global search across users, campaigns, and reports. Audit visibility allows an admin to filter by action, user, or time period. Audit logs are read-only and exportable.

---

## Appendix C: Workflow Narratives

This appendix provides concrete narratives that illustrate how the system is expected to behave from a tenant admin perspective.

### C.1 New Tenant Onboarding with SSO and SCIM

1. A super admin creates a tenant record, selects a data region, and assigns a plan. The system provisions the tenant and notifies the initial tenant admin by email.
2. The tenant admin logs in and is guided through the onboarding wizard. They provide organization details and upload branding assets.
3. The admin configures SAML, uploads IdP metadata, and performs a test login. The system validates the assertion and confirms attribute mapping for name, email, and department.
4. The admin generates a SCIM token and configures it in their IdP. A test user is provisioned. The system shows the new user in the Users page within sixty seconds.
5. The admin maps IdP groups to roles, assigning managers and trainers. The system updates permissions immediately and logs the changes in the audit log.

This flow ensures that the tenant can provision users at scale while preserving a clean audit trail of configuration changes.

### C.2 Quarterly Training Campaign with Phishing Simulation

1. A trainer opens the Campaigns page and chooses the quarterly training template. The system preconfigures the schedule and required modules based on enabled compliance frameworks.
2. The trainer selects the target audience by department and location, then adds an email phishing simulation and a QR simulation. They choose a teachable moment landing page.
3. The trainer reviews the campaign summary. The system warns that marketing has a lower completion rate, suggesting additional reminders.
4. The trainer launches the campaign. The system enrolls users, schedules email delivery, and logs the campaign start event.
5. As the campaign runs, the trainer monitors results. Phishing simulation failures trigger immediate microlearning modules.

The campaign concludes with an automatically generated compliance report and an analytics summary for the CISO dashboard.

### C.3 Incident-triggered JIT Training

1. A phishing simulation campaign detects a spike in failures from a specific department. The analytics module flags the department as high risk.
2. The admin configures a just-in-time training rule that triggers a microlearning module within sixty seconds of a failed simulation.
3. The system sends the training module and records the completion. The risk score decreases over time as improvements are measured.
4. The admin reviews a trend chart showing improved reporting behavior. The audit log captures the rule creation and changes.

This flow demonstrates the connection between analytics and automated training interventions.

### C.4 Offboarding and Data Export

1. A tenant decides to terminate the service. The tenant admin requests a data export and selects formats for reports and transcripts.
2. The system generates the export package with integrity hashes and a summary manifest. The admin downloads the package and confirms receipt.
3. The tenant enters an archived state. Data retention policies remain active until expiration.
4. When retention expires, the system anonymizes personal data and deletes training records. A deletion certificate is generated.

This flow ensures compliance with retention policies and provides verifiable proof of data disposal.

### C.5 White-label Branding Update

1. The tenant admin uploads a new logo and selects a custom color palette. The UI validates contrast ratios and warns about accessibility issues.
2. The admin previews the changes in a staging view, then publishes.
3. The system propagates the new branding within sixty seconds across the admin interface and training portal.
4. The branding version is stored in the branding history table, and the audit log records the change.

This flow illustrates how branding changes remain controlled, auditable, and compliant with accessibility requirements.

---

## Appendix D: RLS and Isolation Examples

This appendix illustrates how row-level security and tenant isolation are enforced in practice. The examples are simplified and are intended to guide implementation and review.

### D.1 RLS Policy Example

```sql
-- Enable RLS on a tenant-scoped table
ALTER TABLE admin.campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: only allow access to rows matching current tenant
CREATE POLICY tenant_isolation_campaigns
  ON admin.campaigns
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Enforce tenant_id for inserts
CREATE POLICY tenant_insert_campaigns
  ON admin.campaigns
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

The `app.tenant_id` session variable is set by the tenant context middleware in the application layer. Any request without a tenant context fails by default.

### D.2 Tenant Context Injection Example

```typescript
// Fastify hook to inject tenant context
app.addHook('preHandler', async (req) => {
  const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
  if (!tenantId) throw new Error('Tenant context missing');
  await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
});
```

This approach ensures that every database query is executed with the correct tenant context, and RLS policies enforce the final boundary.

### D.3 Isolation in Background Jobs

Background jobs must also respect tenant boundaries. Each job payload includes `tenantId`, and workers validate this before executing any database query. Job queues are namespaced by tenant where required. Cross-tenant jobs are not permitted; any multi-tenant aggregation must be performed via an anonymized pipeline that never bypasses tenant scoping.

### D.4 Object Storage and File Isolation

Training exports, certificates, and report PDFs are stored in object storage with tenant-aware prefixes. For shared buckets, object keys include `tenant_id` in their path. For dedicated database tenants, object storage buckets may be dedicated as well. Access to objects is mediated by signed URLs that include tenant validation.

### D.5 Common Failure Modes and Mitigations

- Missing tenant context. Mitigation: fail closed, log error, and alert security.
- Misconfigured RLS policy. Mitigation: automated tests validate that each tenant-scoped table has RLS enabled.
- Cache key collision. Mitigation: enforced cache key prefixes including tenant_id.
- Cross-tenant analytics query. Mitigation: analytics access layer validates tenant scope before query execution.

These examples are intended to be used as a reference for code reviews and security audits.

---


## Appendix E: Operational Playbooks and Risk Controls

Enterprise multi-tenancy introduces operational risks that must be addressed with explicit playbooks and controls. This appendix documents the most critical operational scenarios and the controls required to manage them in a predictable and auditable way.

### E.1 Risk Categories

The following risk categories are considered high impact for the enterprise admin and multi-tenant platform.

- Cross-tenant data exposure due to misconfigured tenant context or cache key collisions.
- Misconfigured SSO or SCIM resulting in unauthorized access or user lockout.
- Role escalation or improper permissions granting admin-level access to non-admin users.
- Data export abuse where sensitive training data is exported without appropriate authorization.
- Brand misconfiguration that reduces accessibility or violates enterprise policies.
- Data residency drift where data is stored in an unintended region.
- Integration failures that cause inconsistent training records or compliance reporting gaps.
- Admin insider risk, including misuse of audit log access or impersonation.

Each risk category has a corresponding set of mitigations described below.

### E.2 Cross-tenant Exposure Controls

Cross-tenant exposure is the most critical failure mode in multi-tenant systems. The controls for this risk are layered and mandatory.

- Database RLS enforced on all tenant-scoped tables. Any table missing RLS is treated as a security defect.
- Tenant context middleware that fails closed when context is missing.
- Cache key namespace enforcement, with automated linting in code review.
- Automated tests that validate tenant isolation for every major API route.
- Security alerts triggered on any query attempt with a missing or invalid tenant context.

Operationally, if a cross-tenant exposure is detected, the platform enters a containment procedure that includes immediate tenant notification, evidence collection, and a post-incident audit log review.

### E.3 Identity Provider Misconfiguration Playbook

SSO misconfiguration is common during onboarding. The playbook for SSO failures includes:

1. Confirm that the tenant has at least one local admin account with MFA enabled as a break-glass mechanism.
2. Validate IdP metadata, certificate validity, and assertion audience restrictions.
3. Run a test login using a non-admin account to avoid lockouts.
4. Validate attribute mappings for email, name, and group claims.
5. If SSO is broken, temporarily disable SSO enforcement and allow local admin access for remediation.

All changes must be recorded in the audit log with the reason, and SSO enforcement must not be re-enabled until a successful test login is recorded.

### E.4 SCIM Sync Failure Playbook

SCIM failures typically manifest as missing users, stale group memberships, or delayed deprovisioning. The SCIM playbook includes:

1. Verify token validity and expiration.
2. Check SCIM service health and rate limit responses.
3. Re-run a test provisioning with a temporary user.
4. Compare IdP group mappings to internal role assignments.
5. If synchronization is delayed, schedule a manual sync job and notify tenant admin.

SCIM failures are logged as integration incidents and surfaced in the admin dashboard with clear remediation guidance.

### E.5 Role Escalation Controls

Role escalation is prevented through a combination of design and operational controls.

- Role assignment actions require a user to already hold a role with `user.update` and `role.assign` permissions.
- Step-up authentication is required for assigning Tenant Admin or Super Admin roles.
- Role assignment is logged with before and after snapshots of permissions.
- Role assignment events trigger notifications to existing tenant admins.

These controls reduce the risk of silent privilege escalation and ensure that any changes are visible to multiple administrators.

### E.6 Data Export Approval Workflow

Data exports can contain sensitive training data. To reduce abuse, the platform supports an optional approval workflow.

- Large exports or exports containing individual-level data require an approval from a second tenant admin.
- Approval requests are time-bound and logged.
- Export packages are signed and expire after a short time window.

This workflow is configurable by tenant and is recommended for regulated industries.

### E.7 Accessibility and Branding Compliance

Branding changes can inadvertently reduce accessibility. The platform enforces validation checks on color contrast and font readability. If a tenant attempts to apply a branding configuration that violates WCAG 2.1 AA, the system blocks the change and provides corrective guidance. All branding changes are versioned and can be rolled back.

### E.8 Data Residency Drift Prevention

Tenant data must remain in the selected region. The platform enforces residency by binding each tenant to region-specific database and storage endpoints. The following controls prevent drift.

- Region locking at the infrastructure routing layer.
- Data residency checks at provisioning time and during migrations.
- Periodic verification jobs that compare tenant metadata to actual storage location.

Any detected drift triggers an alert and a compliance incident workflow.

### E.9 Integration Failure Detection

Integrations are monitored for health and data delivery. Failures are categorized by severity.

- Warning. Delayed webhook delivery or transient errors.
- Error. Persistent delivery failures or authentication errors.
- Critical. Data loss or missing compliance evidence.

The admin UI surfaces integration health with clear instructions. Critical failures generate alerts and may pause dependent workflows until resolved.

### E.10 Admin Insider Risk Controls

Admin users have privileged access. The platform includes controls to reduce insider risk.

- Mandatory MFA for all admins.
- Session duration limits and idle timeouts.
- Immutable audit logs for all admin actions.
- Optional alerts for high-risk actions such as role assignment or data export.

These controls create accountability and reduce the probability of unnoticed misuse.

### E.11 Support Access and Break-glass Procedures

Support staff may need temporary access to a tenant for troubleshooting. Support access is provided through a controlled break-glass mechanism.

1. A tenant admin approves support access.
2. A temporary support role is assigned with a fixed expiration.
3. Support actions are logged with a special audit flag.
4. Support access is revoked automatically after the expiration period.

This procedure ensures that support access is visible and time-bound.

### E.12 Operational Playbooks

The following playbooks define standard responses to common enterprise admin incidents.

**Tenant Provisioning Failure**

- Confirm that the provisioning job failed gracefully and logged a cause.
- Retry provisioning with idempotent steps.
- If schema or database creation failed, roll back partially created resources.
- Notify the tenant admin with updated status.

**Training Campaign Misfire**

- Pause the campaign to prevent further notifications.
- Review enrollment criteria and audience filters.
- Restart the campaign with corrected settings.
- Document the issue in the audit log.

**Audit Log Integrity Check Failure**

- Quarantine audit log export capabilities.
- Run integrity verification against backup snapshots.
- Notify security leadership.
- Generate a post-incident report with remediation steps.

**Data Export Delays**

- Check export job queue and storage status.
- If export fails, retry in a controlled manner and inform the tenant admin.
- Provide a temporary partial export if the tenant requires urgent evidence.

### E.13 Change Management and Configuration Versioning

Tenant configuration changes can have wide impact. The platform uses configuration versioning for critical settings such as SSO, SCIM, retention policy, and branding. Each change creates a new version entry with the following metadata.

- Change timestamp and actor.
- Previous and new values.
- Reason or comment provided by the admin.
- Associated approval workflow if enabled.

Versioning enables rollback and supports auditability.

### E.14 Residual Risks and Acceptance

Not all risks can be eliminated. Residual risks include:

- Third-party integration outages that block SCIM or SSO flows.
- Human error in campaign configuration despite guardrails.
- Regulatory changes that require new reporting formats.

These risks are monitored through quarterly reviews and are documented in the compliance risk register.

---
*End of Document*
