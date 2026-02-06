# BRD-05: Enterprise User Management, Administration & Multi-Tenancy

**Project:** The DMZ -- Cybersecurity Awareness Training Platform
**Document Type:** Business Requirements Document
**Version:** 1.0
**Date:** 2026-02-05
**Status:** Draft
**Author:** Enterprise Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Multi-Tenancy Architecture](#2-multi-tenancy-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Organization Structure](#4-organization-structure)
5. [Identity & Access Management](#5-identity--access-management)
6. [User Lifecycle Management](#6-user-lifecycle-management)
7. [Admin Dashboard](#7-admin-dashboard)
8. [Notification System](#8-notification-system)
9. [API & Automation](#9-api--automation)
10. [Data Management](#10-data-management)
11. [Enterprise Deployment Options](#11-enterprise-deployment-options)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

The DMZ is a cybersecurity awareness training platform that simulates real-world threat scenarios -- phishing reviews, social engineering attacks, breach response exercises, and access-decision training -- within a narrative-driven environment. To serve enterprise customers ranging from 50-seat startups to 500,000-seat multinational corporations, the platform requires a mature, secure, and extensible administration layer.

This document defines the complete set of requirements for enterprise user management, administration, and multi-tenancy. It covers the architectural decisions needed to isolate tenant data, manage complex organizational hierarchies, integrate with enterprise identity providers, automate user lifecycle operations, and provide actionable administrative dashboards. Every requirement in this document is grounded in the operational realities of selling into regulated industries (financial services, healthcare, government, defense) where compliance, auditability, and data sovereignty are non-negotiable.

### 1.1 Scope

This BRD covers:

- Tenant isolation and white-label architecture
- Role-based and attribute-based access control
- Hierarchical organizational modeling
- Identity federation and provisioning
- User onboarding, offboarding, and license management
- Administrative dashboards and reporting
- Notification and escalation systems
- API design and third-party automation
- Data governance, retention, and deletion
- Deployment topologies including air-gapped environments

### 1.2 Audience

- Product Management
- Engineering (Backend, Frontend, Infrastructure, Security)
- Sales Engineering and Solutions Architecture
- Compliance and Legal
- Customer Success

### 1.3 Success Criteria

| Metric                                        | Target                   |
| --------------------------------------------- | ------------------------ |
| Tenant provisioning time                      | < 5 minutes (automated)  |
| SSO integration time                          | < 2 hours (self-service) |
| SCIM user sync latency                        | < 60 seconds             |
| Admin dashboard load time                     | < 2 seconds (P95)        |
| API response time                             | < 200ms (P95)            |
| Tenant data isolation violations              | Zero                     |
| SOC 2 Type II audit findings (admin controls) | Zero critical            |

---

## 2. Multi-Tenancy Architecture

### 2.1 Overview

The DMZ must support full multi-tenancy where each customer organization operates as an isolated tenant. The architecture must guarantee that no tenant can access, infer, or influence another tenant's data, configuration, or operational state. At the same time, the platform must remain operationally efficient -- shared infrastructure where safe, dedicated resources where required.

### 2.2 Tenant Isolation Model

#### 2.2.1 Data Isolation Strategy

The platform shall implement a **hybrid isolation model** with three tiers:

| Tier         | Database Strategy                                                                  | Compute Strategy                                               | Target Segment                                    |
| ------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| Standard     | Shared database, schema-level isolation via `tenant_id` foreign key on every table | Shared application instances                                   | SMB (< 500 users)                                 |
| Professional | Shared database cluster, dedicated schema per tenant                               | Shared application instances with tenant-aware resource limits | Mid-market (500 -- 10,000 users)                  |
| Enterprise   | Dedicated database instance per tenant, optional dedicated cluster                 | Dedicated application instances in isolated namespace          | Enterprise (> 10,000 users), regulated industries |

**REQ-MT-001:** Every database table containing tenant-scoped data SHALL include a non-nullable `tenant_id` column. All queries SHALL include tenant filtering enforced at the ORM/query-builder level, not at the application logic level. Row-level security (RLS) policies SHALL be applied as a defense-in-depth measure at the database level.

**REQ-MT-002:** The system SHALL support migrating a tenant between isolation tiers without data loss or downtime exceeding 15 minutes.

**REQ-MT-003:** Cross-tenant queries SHALL be impossible from the application layer. The only cross-tenant operations permitted are those executed by the platform super-admin through a dedicated internal administration service with full audit logging.

#### 2.2.2 Tenant Identifier Architecture

Each tenant shall be identified by:

- **Tenant UUID:** Immutable, system-generated, used in all internal operations and API calls.
- **Tenant Slug:** Human-readable, URL-safe identifier (e.g., `acme-corp`), mutable with redirect support.
- **Tenant Display Name:** The full legal or brand name of the organization.

```
Tenant {
  id: UUID (primary key, immutable)
  slug: string (unique, URL-safe, 3-63 chars, [a-z0-9-])
  display_name: string (1-256 chars)
  status: enum (provisioning, active, suspended, deactivated, archived)
  tier: enum (standard, professional, enterprise)
  created_at: timestamp
  updated_at: timestamp
  metadata: jsonb
}
```

**REQ-MT-004:** Tenant slugs SHALL be globally unique and SHALL NOT be recyclable for 365 days after tenant deletion to prevent subdomain takeover attacks.

#### 2.2.3 Request-Level Tenant Resolution

Tenant context SHALL be resolved on every inbound request through the following precedence chain:

1. **Subdomain:** `{tenant_slug}.thedmz.io` or `{tenant_slug}.{custom_domain}`
2. **HTTP Header:** `X-Tenant-ID` (for API consumers)
3. **JWT Claim:** `tenant_id` embedded in the authentication token
4. **Path Parameter:** `/api/v1/tenants/{tenant_id}/...` (for super-admin operations)

**REQ-MT-005:** If tenant context cannot be resolved, the request SHALL be rejected with HTTP 400. If the resolved tenant is suspended or deactivated, the request SHALL be rejected with HTTP 403 and a structured error body indicating the tenant status.

### 2.3 White-Labeling & Custom Branding

#### 2.3.1 Branding Configuration

Each tenant SHALL be able to customize the following visual and textual elements:

| Element                | Customization                                        | Constraints                             |
| ---------------------- | ---------------------------------------------------- | --------------------------------------- |
| Primary Logo           | Upload (SVG, PNG)                                    | Max 2MB, min 100x100px, max 2000x2000px |
| Favicon                | Upload (ICO, PNG, SVG)                               | Max 256KB                               |
| Primary Color          | Hex code                                             | Must meet WCAG 2.1 AA contrast ratio    |
| Secondary Color        | Hex code                                             | Must meet WCAG 2.1 AA contrast ratio    |
| Accent Color           | Hex code                                             | --                                      |
| Background Color       | Hex code                                             | --                                      |
| Font Family            | Selection from approved set or custom upload (WOFF2) | Max 1MB per font file, max 4 variants   |
| Login Page Background  | Upload (JPG, PNG, WebP) or CSS gradient              | Max 5MB                                 |
| Email Header/Footer    | Rich text + images                                   | Max 500KB total                         |
| Platform Name Override | Text                                                 | Max 64 characters                       |
| Copyright Notice       | Text                                                 | Max 256 characters                      |
| Support Contact        | Email, URL, phone                                    | Validated formats                       |
| Custom CSS             | Raw CSS                                              | Sandboxed, max 100KB, no `@import`      |

**REQ-WL-001:** Branding changes SHALL take effect within 60 seconds of saving without requiring a deployment or cache purge by platform operators.

**REQ-WL-002:** The platform SHALL provide a live preview of branding changes before they are published.

**REQ-WL-003:** All tenant-branded pages SHALL gracefully degrade to platform defaults if a custom asset fails to load.

#### 2.3.2 Custom Domain & Subdomain Support

**REQ-WL-004:** Each tenant SHALL be able to configure one or more custom domains (e.g., `training.acme.com`) that serve the fully branded experience.

**REQ-WL-005:** Custom domain setup SHALL require:

1. DNS CNAME or A record verification (automated check with retry).
2. Automated TLS certificate provisioning via Let's Encrypt or tenant-provided certificate upload.
3. Certificate renewal handled automatically with 30-day advance warnings on failure.

**REQ-WL-006:** The system SHALL support wildcard subdomains for tenants that require department-level branding (e.g., `engineering.training.acme.com`, `finance.training.acme.com`).

#### 2.3.3 Email White-Labeling

**REQ-WL-007:** Phishing simulation emails, notification emails, and report emails SHALL be sent from tenant-configured sender domains with full SPF, DKIM, and DMARC alignment. The platform SHALL provide a guided setup wizard for DNS record configuration and SHALL verify deliverability before activating a custom sender domain.

**REQ-WL-008:** Tenants SHALL be able to customize email templates (subject lines, body content, headers, footers) using a visual editor with merge-tag support (e.g., `{{user.first_name}}`, `{{organization.name}}`).

### 2.4 Tenant Lifecycle

```
[Provisioning] --> [Active] --> [Suspended] --> [Deactivated] --> [Archived] --> [Deleted]
                      |              |                |
                      |              +-- [Active] <---+  (reactivation)
                      |              |
                      +-- [Suspended] (billing failure, policy violation)
```

**REQ-MT-006:** Tenant provisioning SHALL be fully automated and SHALL complete in under 5 minutes, including database setup, default configuration, initial admin user creation, and welcome email delivery.

**REQ-MT-007:** Tenant suspension SHALL immediately revoke all user sessions (within 30 seconds) and block new logins while preserving all data. Suspended tenants SHALL display a branded suspension notice page.

**REQ-MT-008:** Tenant deletion SHALL trigger a 30-day grace period during which data can be recovered. After the grace period, all tenant data SHALL be cryptographically erased (encryption key destruction for Enterprise tier) or overwritten (Standard/Professional tier). A deletion certificate SHALL be generated for compliance records.

### 2.5 Tenant Configuration Inheritance

The platform SHALL support a configuration hierarchy:

```
Platform Defaults
  --> Tenant Defaults
    --> Department Overrides
      --> Team Overrides
        --> User Overrides
```

**REQ-MT-009:** Configuration values SHALL cascade downward. A value set at a higher level applies to all lower levels unless explicitly overridden. Tenant admins SHALL be able to lock specific configurations to prevent lower-level overrides.

**REQ-MT-010:** Configuration changes SHALL be versioned and auditable. The system SHALL maintain a complete history of who changed what, when, and the previous value.

---

## 3. User Roles & Permissions

### 3.1 Role Architecture

The platform SHALL implement a hybrid RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control) model. RBAC provides the structural foundation; ABAC extends it with contextual, attribute-driven policy evaluation for fine-grained authorization.

### 3.2 Built-In Roles

#### 3.2.1 Super Admin (Platform Level)

**Scope:** Entire platform, all tenants.

| Permission Category    | Capabilities                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Tenant Management      | Create, read, update, suspend, delete tenants. Migrate tenant tiers.                                    |
| Platform Configuration | Feature flags, global rate limits, maintenance windows, platform branding.                              |
| Billing & Licensing    | View and modify all tenant subscriptions, apply credits, manage invoices.                               |
| Security Operations    | View cross-tenant security events, initiate platform-wide incident response, force-expire all sessions. |
| Impersonation          | Impersonate any user in any tenant with full audit trail.                                               |
| Data Operations        | Execute cross-tenant analytics (aggregated, anonymized), trigger data exports for compliance requests.  |
| System Health          | Access platform-wide metrics, error rates, queue depths, database performance.                          |

**REQ-RBAC-001:** Super Admin access SHALL require hardware-backed MFA (FIDO2/WebAuthn) and SHALL be restricted to named individuals. Shared Super Admin accounts are prohibited.

**REQ-RBAC-002:** Super Admin sessions SHALL have a maximum duration of 4 hours with no refresh capability. Re-authentication is required after expiry.

#### 3.2.2 Tenant Admin

**Scope:** Single tenant.

| Permission Category    | Capabilities                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| User Management        | Create, read, update, deactivate, delete users within the tenant. Assign roles. Reset passwords. Force MFA enrollment. |
| Organization Structure | Create and manage departments, teams, locations, cost centers.                                                         |
| Training Configuration | Create training campaigns, assign content, set deadlines, configure phishing simulations.                              |
| Reporting              | Access all tenant-level reports, export data, schedule reports.                                                        |
| Integrations           | Configure SSO, SCIM, HRIS integrations, webhooks, API keys.                                                            |
| Branding               | Manage all white-label settings, custom domains, email templates.                                                      |
| Compliance             | Configure data retention policies, execute data subject requests, manage consent records.                              |
| Billing                | View subscription details, manage payment methods, download invoices.                                                  |
| Audit                  | View complete audit log for the tenant.                                                                                |
| Security Policy        | Set password policies, MFA requirements, session timeouts, IP allowlists.                                              |

**REQ-RBAC-003:** Tenant Admin SHALL be the highest-privileged role within a tenant. Only Tenant Admins can create other Tenant Admins. The system SHALL enforce a minimum of one active Tenant Admin per tenant at all times (prevent last-admin deletion).

#### 3.2.3 Manager

**Scope:** Assigned departments, teams, or organizational units within a tenant.

| Permission Category | Capabilities                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| User Oversight      | View user profiles, training status, risk scores, and compliance status for direct and indirect reports.   |
| Training Management | Assign training content to their teams, set deadlines, send reminders. Cannot create new training content. |
| Reporting           | Access reports scoped to their organizational units. Export scoped data.                                   |
| Escalation          | Escalate non-compliant users to Tenant Admin.                                                              |
| Approval            | Approve training completion exceptions, deadline extensions (if policy allows).                            |

**REQ-RBAC-004:** Manager visibility SHALL be strictly scoped to their assigned organizational units. A manager of "Engineering" SHALL NOT see data from "Finance" unless explicitly granted cross-department access.

#### 3.2.4 Trainer (Content Creator)

**Scope:** Training content and simulation management within a tenant.

| Permission Category | Capabilities                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Content Authoring   | Create, edit, publish, archive training modules, quizzes, and interactive scenarios.                             |
| Simulation Design   | Design and configure phishing simulation campaigns, social engineering scenarios, and breach response exercises. |
| Template Management | Create and manage email templates, landing pages, and reporting templates for simulations.                       |
| Analytics (Content) | View engagement metrics, completion rates, and effectiveness scores for their content.                           |
| Content Library     | Manage the tenant's content library, import from the platform marketplace.                                       |

**REQ-RBAC-005:** Trainers SHALL NOT have access to individual user performance data. They see aggregated, anonymized content effectiveness metrics only. Trainers who also need user-level visibility must be granted the Manager role additionally.

#### 3.2.5 Learner (End User)

**Scope:** Own profile and assigned training.

| Permission Category | Capabilities                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| Training            | Access and complete assigned training modules, quizzes, and simulations.  |
| Profile             | View and update own profile (name, avatar, notification preferences).     |
| Progress            | View own training history, scores, certifications, and compliance status. |
| Reporting (Self)    | Download own training transcripts and certificates.                       |
| Feedback            | Submit feedback on training content, report issues.                       |

**REQ-RBAC-006:** Learners SHALL NOT be able to view other learners' data, scores, or compliance status. Leaderboards, if enabled, SHALL be opt-in and anonymizable.

### 3.3 Custom Roles

**REQ-RBAC-007:** Tenant Admins SHALL be able to create custom roles by composing permissions from the platform's permission catalog. Custom roles SHALL support:

- **Granular Permissions:** Individual permission toggles (e.g., `users.read`, `users.create`, `users.delete`, `reports.export`, `campaigns.manage`).
- **Scope Restrictions:** Limiting a role to specific departments, teams, locations, or user attributes.
- **Time-Bound Assignment:** Roles can be assigned with an expiration date (e.g., temporary audit access).
- **Delegated Administration:** The ability to define which roles a custom role can assign to others (preventing privilege escalation).

**REQ-RBAC-008:** The permission model SHALL enforce the following hierarchy constraint: no role can grant permissions that exceed the permissions of the role assigning it. This SHALL be enforced at the API level, not just the UI level.

### 3.4 Permission Catalog

The platform SHALL maintain a structured permission catalog organized by resource and action:

```
Resource              Actions
-------------------------------------------
tenants               read, update
users                 list, read, create, update, delete, impersonate
users.mfa             enforce, reset
users.sessions        list, revoke
roles                 list, read, create, update, delete, assign
departments           list, read, create, update, delete
teams                 list, read, create, update, delete
training.modules      list, read, create, update, delete, publish, archive
training.campaigns    list, read, create, update, delete, launch, pause, stop
training.assignments  list, read, create, update, delete
simulations           list, read, create, update, delete, launch, pause, stop
simulations.results   list, read, export
reports               list, read, create, schedule, export
reports.compliance    read, export
reports.risk          read, export
audit.logs            list, read, export
integrations.sso      read, create, update, delete, test
integrations.scim     read, create, update, delete
integrations.webhooks read, create, update, delete, test
settings.branding     read, update
settings.security     read, update
settings.billing      read, update
data.export           execute
data.deletion         request, execute
api.keys              list, read, create, revoke
```

**REQ-RBAC-009:** Every API endpoint SHALL declare its required permission(s). Authorization SHALL be checked before any business logic executes. Failed authorization SHALL return HTTP 403 with a structured error body that identifies the missing permission (in non-production environments) or a generic denial (in production).

### 3.5 Attribute-Based Access Control (ABAC) Extensions

Beyond static RBAC, the platform SHALL support policy rules based on dynamic attributes:

| Attribute Source | Example Attributes                          | Example Policy                                                     |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| User             | department, location, risk_score, hire_date | "Managers can only view users in their own location"               |
| Resource         | sensitivity_level, owner, created_date      | "Only content owners can edit unpublished modules"                 |
| Environment      | time_of_day, ip_address, device_type        | "Admin operations blocked outside business hours from unknown IPs" |
| Action Context   | bulk_operation, export_size                 | "Exports exceeding 10,000 records require Tenant Admin approval"   |

**REQ-RBAC-010:** ABAC policies SHALL be evaluated in under 10ms per request (P99). Policies SHALL be cached and invalidated on relevant attribute changes.

---

## 4. Organization Structure

### 4.1 Hierarchical Organization Model

The platform SHALL support a flexible, multi-dimensional organizational structure that mirrors real-world enterprise configurations.

#### 4.1.1 Core Organizational Entities

```
Tenant (root)
  |
  +-- Division (optional top-level grouping)
  |     |
  |     +-- Department
  |     |     |
  |     |     +-- Team
  |     |     |     |
  |     |     |     +-- Sub-Team (unlimited nesting)
  |     |     |
  |     |     +-- Team
  |     |
  |     +-- Department
  |
  +-- Location (geographic hierarchy)
  |     |
  |     +-- Region
  |           |
  |           +-- Office
  |                 |
  |                 +-- Floor / Zone
  |
  +-- Cost Center (financial hierarchy)
  |
  +-- Legal Entity (for multi-national structures)
```

**REQ-ORG-001:** The organizational hierarchy SHALL support unlimited nesting depth with a recommended maximum of 10 levels. The system SHALL warn administrators when nesting exceeds 7 levels due to performance and usability implications.

**REQ-ORG-002:** Users SHALL be able to belong to multiple organizational units simultaneously (e.g., a user can be in the "Engineering" department, the "London" location, and the "Project Alpha" team). This is a many-to-many relationship with one primary assignment per dimension.

#### 4.1.2 Organizational Unit Entity Model

```
OrganizationalUnit {
  id: UUID
  tenant_id: UUID (foreign key)
  parent_id: UUID (nullable, self-referencing foreign key)
  type: enum (division, department, team, sub_team, location, region,
              office, floor, cost_center, legal_entity, custom)
  name: string (1-256 chars)
  code: string (optional, unique within tenant, e.g., "ENG-001")
  description: text (optional)
  manager_id: UUID (nullable, foreign key to users)
  metadata: jsonb (extensible attributes)
  status: enum (active, inactive, archived)
  effective_from: date (nullable, for planned reorganizations)
  effective_to: date (nullable)
  sort_order: integer
  created_at: timestamp
  updated_at: timestamp
}
```

**REQ-ORG-003:** The system SHALL support scheduled organizational changes. An administrator SHALL be able to create a future-dated reorganization (e.g., "Move Team X from Department A to Department B on March 1") that automatically takes effect at the specified time. All historical organizational assignments SHALL be preserved for audit and compliance reporting.

#### 4.1.3 User-Organization Membership

```
UserOrganizationMembership {
  id: UUID
  user_id: UUID
  organizational_unit_id: UUID
  membership_type: enum (primary, secondary, temporary)
  role_in_unit: string (optional, e.g., "lead", "member", "observer")
  effective_from: date
  effective_to: date (nullable)
  created_by: UUID
  created_at: timestamp
}
```

**REQ-ORG-004:** When a user's organizational membership changes, all scoped permissions, report visibility, and training assignments SHALL be recalculated within 5 minutes.

### 4.2 Organizational Templates

**REQ-ORG-005:** The platform SHALL provide industry-specific organizational templates that tenants can use as starting points:

- **Corporate Standard:** Divisions > Departments > Teams
- **Government/Military:** Agencies > Bureaus > Divisions > Branches > Sections
- **Healthcare:** Health Systems > Hospitals > Departments > Units
- **Education:** Universities > Colleges > Departments > Research Groups
- **Financial Services:** Business Lines > Regions > Branches

### 4.3 Bulk Organization Management

**REQ-ORG-006:** Administrators SHALL be able to import and export organizational structures via:

- **CSV Upload:** With header mapping and validation preview.
- **API:** Full CRUD for organizational units with batch endpoints.
- **HRIS Sync:** Automatic synchronization from HR systems (Workday, BambooHR, SAP SuccessFactors, ADP) with configurable field mapping and conflict resolution rules.

### 4.4 Organizational Reporting Rollup

**REQ-ORG-007:** All metrics (training completion, risk scores, compliance rates, simulation results) SHALL automatically aggregate up the organizational hierarchy. A VP viewing the "Engineering" division SHALL see aggregated metrics for all departments, teams, and individuals within that division.

**REQ-ORG-008:** Rollup calculations SHALL support weighted averages (e.g., a department's risk score weighted by team size), simple averages, sums, minimums, and maximums. The aggregation method SHALL be configurable per metric.

---

## 5. Identity & Access Management

### 5.1 Authentication Architecture

The platform SHALL support multiple authentication methods simultaneously, with federation as the recommended approach for enterprise tenants.

#### 5.1.1 Authentication Methods

| Method                     | Use Case                                                                  | Priority           |
| -------------------------- | ------------------------------------------------------------------------- | ------------------ |
| Email + Password           | Default for non-federated tenants, fallback                               | Baseline           |
| SAML 2.0 SSO               | Enterprise IdP integration (ADFS, Azure AD, Okta, OneLogin, PingFederate) | High               |
| OAuth 2.0 / OpenID Connect | Modern IdP integration, social login (if applicable)                      | High               |
| FIDO2 / WebAuthn           | Passwordless authentication, hardware key support                         | Medium             |
| Magic Link (Email)         | Low-friction authentication for infrequent users                          | Medium             |
| Certificate-Based (mTLS)   | Government/defense environments, API authentication                       | Medium             |
| Kerberos / IWA             | On-premises deployments with Active Directory                             | Low (on-prem only) |

### 5.2 Single Sign-On (SSO)

#### 5.2.1 SAML 2.0 Support

**REQ-IAM-001:** The platform SHALL function as a SAML 2.0 Service Provider (SP) supporting the following:

- **SP-Initiated SSO:** User starts at The DMZ, is redirected to the IdP for authentication, then returned with a SAML assertion.
- **IdP-Initiated SSO:** User starts at the IdP, clicks the The DMZ application tile, and is authenticated via a pushed SAML assertion.
- **Single Logout (SLO):** Both SP-initiated and IdP-initiated logout.
- **Signed Requests:** Outbound AuthnRequests SHALL be signed.
- **Encrypted Assertions:** Support for encrypted SAML assertions using AES-256.
- **Multiple IdP Support:** A single tenant SHALL be able to configure multiple SAML IdPs (e.g., one for employees, one for contractors).

**REQ-IAM-002:** SAML configuration SHALL support:

- Metadata XML upload (auto-parsing of IdP metadata).
- Manual configuration (Entity ID, SSO URL, SLO URL, certificate upload).
- Metadata URL with automatic refresh (daily or on-demand).
- Attribute mapping configuration (mapping IdP attributes to platform user fields).
- Just-In-Time (JIT) provisioning based on SAML assertions.

**REQ-IAM-003:** The SAML attribute mapping SHALL support the following platform fields:

```
IdP Attribute          --> Platform Field
-------------------------------------------------
NameID / email         --> user.email (required)
givenName              --> user.first_name
surname                --> user.last_name
displayName            --> user.display_name
department             --> user.department
title                  --> user.job_title
employeeID             --> user.employee_id
groups / memberOf      --> user.groups (for role mapping)
location               --> user.location
manager                --> user.manager_email
custom_attribute_*     --> user.metadata.*
```

#### 5.2.2 OAuth 2.0 / OpenID Connect Support

**REQ-IAM-004:** The platform SHALL support OpenID Connect (OIDC) as both a Relying Party (RP) and, optionally, an OpenID Provider (OP) for downstream integrations.

As a Relying Party:

- Authorization Code Flow with PKCE (required for all clients).
- Support for `response_type=code`, `scope=openid profile email groups`.
- Token validation using JWKS endpoint with key rotation support.
- Refresh token support with configurable lifetime.

**REQ-IAM-005:** Pre-built OIDC integration templates SHALL be provided for:

| Provider                      | Configuration Complexity | Notes                                             |
| ----------------------------- | ------------------------ | ------------------------------------------------- |
| Microsoft Azure AD / Entra ID | Guided wizard            | Including group claim mapping, conditional access |
| Okta                          | Guided wizard            | Including Universal Directory attribute mapping   |
| OneLogin                      | Guided wizard            | Including SmartHooks support                      |
| Google Workspace              | Guided wizard            | Including organizational unit mapping             |
| Auth0                         | Guided wizard            | Including Actions/Rules passthrough               |
| PingFederate                  | Advanced                 | Manual configuration with documentation           |
| Keycloak                      | Advanced                 | For on-premises deployments                       |
| AWS Cognito                   | Advanced                 | For AWS-native deployments                        |
| Custom OIDC Provider          | Manual                   | Any standards-compliant provider                  |

### 5.3 Multi-Factor Authentication (MFA)

**REQ-IAM-006:** The platform SHALL support the following MFA methods:

| Method                             | Security Level | User Experience                              |
| ---------------------------------- | -------------- | -------------------------------------------- |
| TOTP (Authenticator App)           | High           | Standard                                     |
| FIDO2 / WebAuthn (Hardware Key)    | Very High      | Excellent (passwordless capable)             |
| Push Notification (via mobile app) | High           | Excellent                                    |
| SMS OTP                            | Medium         | Standard (not recommended for high-security) |
| Email OTP                          | Medium         | Standard (fallback only)                     |
| Recovery Codes                     | N/A (backup)   | One-time use, 10 codes generated             |

**REQ-IAM-007:** MFA policies SHALL be configurable at the tenant level with the following granularity:

- **Enforcement Level:** Disabled, Optional, Required for Admins, Required for All Users.
- **Allowed Methods:** Tenant admin selects which MFA methods are available.
- **Grace Period:** Number of days a user can defer MFA enrollment after it becomes required (0-30 days).
- **Trusted Devices:** Optional "remember this device" functionality with configurable duration (1-90 days).
- **Step-Up Authentication:** Require re-authentication with MFA for sensitive operations (e.g., data export, role changes) even within an active session.
- **Adaptive MFA:** Risk-based MFA challenges triggered by anomalous login patterns (new device, new location, impossible travel).

**REQ-IAM-008:** For Super Admin and Tenant Admin roles, hardware-backed MFA (FIDO2/WebAuthn) SHALL be strongly recommended and optionally enforced via platform policy.

### 5.4 SCIM User Provisioning

**REQ-IAM-009:** The platform SHALL implement a SCIM 2.0 server (RFC 7644) supporting the following:

- **Resources:** Users (`/scim/v2/Users`), Groups (`/scim/v2/Groups`)
- **Operations:** Create, Read (GET by ID, GET with filter), Update (PUT, PATCH), Delete
- **Filtering:** `eq`, `co`, `sw`, `pr`, `gt`, `lt`, `and`, `or` operators on user attributes
- **Pagination:** `startIndex` and `count` parameters, cursor-based pagination for large result sets
- **Bulk Operations:** `/scim/v2/Bulk` endpoint for batch create/update/delete (max 1,000 operations per request)
- **Schema Discovery:** `/scim/v2/Schemas`, `/scim/v2/ResourceTypes`, `/scim/v2/ServiceProviderConfig`

**REQ-IAM-010:** SCIM provisioning SHALL support the following user lifecycle operations:

| IdP Event                | Platform Action                                                       |
| ------------------------ | --------------------------------------------------------------------- |
| User created in IdP      | User created in platform, assigned default role, onboarding triggered |
| User updated in IdP      | User profile updated, organizational membership recalculated          |
| User disabled in IdP     | User deactivated, sessions revoked, license released                  |
| User deleted in IdP      | User deactivated (soft delete), data retained per policy              |
| User re-enabled in IdP   | User reactivated, license re-assigned (if available)                  |
| Group membership changed | Role and scope assignments recalculated                               |

**REQ-IAM-011:** SCIM attribute mapping SHALL be configurable per tenant. Conflict resolution rules SHALL be defined for when SCIM updates conflict with manual admin changes (SCIM wins, Admin wins, or Last Write wins, configurable per attribute).

### 5.5 Directory Synchronization

#### 5.5.1 Active Directory / LDAP Sync

**REQ-IAM-012:** For on-premises and hybrid deployments, the platform SHALL provide an AD/LDAP sync agent that:

- Runs as a lightweight service on a customer-managed server within their network.
- Connects to Active Directory or any LDAPv3-compliant directory.
- Synchronizes users, groups, and organizational units on a configurable schedule (minimum: every 15 minutes) or in real-time via AD Change Notifications / DirSync.
- Supports multiple domains and forests.
- Communicates with the platform via outbound-only HTTPS (no inbound firewall rules required).
- Supports delta sync (only changed objects) after initial full sync.
- Provides a local admin UI for configuration, monitoring, and troubleshooting.

#### 5.5.2 Azure AD / Entra ID Integration

**REQ-IAM-013:** The platform SHALL support native Azure AD integration via Microsoft Graph API for:

- User and group synchronization (using `/users` and `/groups` endpoints with delta queries).
- Organizational hierarchy import (using `/directReports` and `/manager` relationships).
- License assignment based on Azure AD group membership.
- Conditional Access policy awareness (respecting Azure AD authentication context).

#### 5.5.3 Okta Integration

**REQ-IAM-014:** The platform SHALL be listed in the Okta Integration Network (OIN) with support for:

- SAML 2.0 SSO (pre-configured)
- SCIM 2.0 provisioning (pre-configured)
- Okta Lifecycle Management hooks
- Okta Workflows integration for custom automation

#### 5.5.4 OneLogin Integration

**REQ-IAM-015:** The platform SHALL be listed in the OneLogin app catalog with support for:

- SAML 2.0 SSO (pre-configured)
- SCIM 2.0 provisioning (pre-configured)
- OneLogin SmartHooks for custom provisioning logic
- OneLogin User Provisioning with real-time sync

### 5.6 Session Management

**REQ-IAM-016:** Session management SHALL support the following configuration options per tenant:

| Setting                         | Default    | Range                                     |
| ------------------------------- | ---------- | ----------------------------------------- |
| Session Timeout (Idle)          | 30 minutes | 5 minutes -- 24 hours                     |
| Session Timeout (Absolute)      | 12 hours   | 1 hour -- 72 hours                        |
| Concurrent Sessions per User    | Unlimited  | 1 -- Unlimited                            |
| Session Binding                 | None       | None, IP, Device Fingerprint, IP + Device |
| Force Logout on Password Change | Yes        | Yes, No                                   |
| Force Logout on Role Change     | Yes        | Yes, No                                   |

**REQ-IAM-017:** The system SHALL maintain a session registry that allows administrators to:

- View all active sessions for any user (device, IP, location, start time, last activity).
- Revoke individual sessions or all sessions for a user.
- Revoke all sessions tenant-wide (emergency response).

### 5.7 Password Policy

**REQ-IAM-018:** For tenants using password-based authentication, the following policies SHALL be configurable:

| Policy                  | Default                           | Range                                      |
| ----------------------- | --------------------------------- | ------------------------------------------ |
| Minimum Length          | 12                                | 8 -- 128                                   |
| Complexity Requirements | At least 3 of 4 character classes | Configurable                               |
| Password History        | 12 previous passwords             | 0 -- 50                                    |
| Maximum Age             | 90 days                           | 0 (never expires) -- 365 days              |
| Minimum Age             | 1 day                             | 0 -- 30 days                               |
| Lockout Threshold       | 10 failed attempts                | 3 -- 100                                   |
| Lockout Duration        | 30 minutes                        | 1 minute -- 24 hours or until admin unlock |
| Breach Database Check   | Enabled (Have I Been Pwned API)   | Enabled / Disabled                         |

---

## 6. User Lifecycle Management

### 6.1 Onboarding Workflows

#### 6.1.1 Automated Onboarding Pipeline

**REQ-ULM-001:** The platform SHALL support configurable, multi-step onboarding workflows triggered by user creation (manual, SCIM, JIT, or CSV import).

Standard onboarding pipeline:

```
User Created
  |
  v
[1. Account Activation]
  - Welcome email sent with activation link (configurable expiry: 1-30 days)
  - Brand-appropriate welcome page
  |
  v
[2. Profile Completion]
  - Required fields validation (configurable per tenant)
  - Profile photo upload (optional)
  - Notification preferences
  |
  v
[3. Security Setup]
  - MFA enrollment (if required by policy)
  - Recovery method configuration
  - Security awareness agreement acceptance
  |
  v
[4. Training Assignment]
  - Baseline security assessment (configurable)
  - Mandatory onboarding training modules auto-assigned
  - Personalized learning path generated based on role and risk profile
  |
  v
[5. Manager Notification]
  - Manager notified of new team member onboarding
  - Manager receives link to monitor onboarding progress
  |
  v
[Onboarding Complete]
```

**REQ-ULM-002:** Each onboarding step SHALL have configurable:

- Deadline (relative to user creation date).
- Reminder cadence (e.g., remind every 3 days).
- Escalation rules (e.g., notify manager if not completed in 7 days, notify Tenant Admin if not completed in 14 days).
- Skip conditions (e.g., skip MFA enrollment if SSO-only tenant).

**REQ-ULM-003:** The platform SHALL support multiple onboarding templates. Different user populations can have different workflows (e.g., executives get a streamlined flow, IT staff get an advanced flow with additional phishing simulation enrollment).

#### 6.1.2 Bulk Onboarding

**REQ-ULM-004:** The platform SHALL support bulk user creation via:

- **CSV Import:** With column mapping UI, validation preview (showing errors and warnings before commit), and async processing for large files (> 1,000 users). Maximum file size: 50MB.
- **API Batch:** `/api/v1/users/batch` endpoint accepting up to 1,000 users per request with transactional semantics (all or nothing, with detailed error reporting).
- **SCIM Bulk:** As specified in Section 5.4.
- **Directory Sync:** As specified in Section 5.5.

**REQ-ULM-005:** Bulk import SHALL support a dry-run mode that validates all records and reports issues without creating any users.

### 6.2 Offboarding

**REQ-ULM-006:** User offboarding SHALL be automated through the following triggers:

| Trigger                              | Action                                      | Timing                                           |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------ |
| SCIM delete/disable                  | Deactivate user, revoke sessions            | Immediate                                        |
| AD/LDAP sync (user disabled/deleted) | Deactivate user, revoke sessions            | Next sync cycle (configurable: 15 min -- 24 hrs) |
| Manual admin deactivation            | Deactivate user, revoke sessions            | Immediate                                        |
| License expiration                   | Suspend user (read-only access to own data) | On expiration date                               |
| Scheduled offboarding date           | Deactivate user, revoke sessions            | On scheduled date                                |
| Inactivity timeout                   | Notify admin, optionally deactivate         | After configurable period (30-365 days)          |

**REQ-ULM-007:** Upon offboarding, the system SHALL:

1. Immediately revoke all active sessions and API tokens.
2. Remove the user from all active training campaigns and simulations.
3. Reassign any content or campaigns owned by the user to a designated successor or the Tenant Admin.
4. Retain the user's historical data (training completions, simulation results, compliance records) per the tenant's data retention policy.
5. Release the user's license seat.
6. Generate an offboarding summary report available to the Tenant Admin.
7. Send configurable notifications (to the user's manager, HR, IT, Tenant Admin).

**REQ-ULM-008:** Offboarded users SHALL be restorable within the data retention period. Restoration SHALL re-associate historical data and allow re-licensing without data loss.

### 6.3 License Management

#### 6.3.1 Licensing Models

The platform SHALL support the following licensing models:

| Model                    | Description                                                                         | Billing Basis                      |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------- |
| Seat-Based (Named User)  | Each active user consumes one license seat. Deactivated users release seats.        | Monthly/Annual per seat            |
| Seat-Based (Concurrent)  | A pool of seats shared across users. Only users with active sessions consume seats. | Monthly/Annual per concurrent seat |
| Usage-Based              | Charged per training completion, simulation sent, or API call.                      | Monthly metered billing            |
| Tiered                   | Flat fee per tier (e.g., 1-100 users, 101-500 users, 501+ users).                   | Monthly/Annual per tier            |
| Unlimited (Site License) | All users in the tenant covered. No seat management required.                       | Annual flat fee                    |
| Hybrid                   | Combination (e.g., seat-based for core platform + usage-based for simulations).     | Monthly/Annual + metered           |

#### 6.3.2 License Enforcement

**REQ-ULM-009:** The license enforcement system SHALL:

- Track real-time seat utilization with less than 1-minute latency.
- Prevent new user activation when seat limits are reached (with configurable grace: 0-10% overage allowed for 30 days).
- Provide 30, 14, and 7-day warnings before license renewals.
- Support license reservations (pre-allocating seats for planned onboarding).
- Allow Tenant Admins to prioritize which users get seats when capacity is constrained (priority queue).
- Generate automated license utilization reports (daily, weekly, monthly).

**REQ-ULM-010:** True-up and true-down SHALL be supported for annual contracts:

- Quarterly true-up: tenant pays for peak usage above committed seats.
- Annual true-down: tenant can reduce committed seats at renewal with 60-day notice.

#### 6.3.3 Feature Entitlements

**REQ-ULM-011:** Beyond user seats, the licensing system SHALL manage feature-level entitlements:

```
Entitlement {
  id: UUID
  tenant_id: UUID
  feature_code: string (e.g., "phishing_simulations", "advanced_reporting",
                         "api_access", "custom_content", "white_labeling")
  enabled: boolean
  quota: integer (nullable, e.g., max 10,000 phishing emails per month)
  usage: integer (current period usage)
  period: enum (monthly, quarterly, annual, lifetime)
  expires_at: timestamp (nullable)
}
```

---

## 7. Admin Dashboard

### 7.1 Dashboard Architecture

The admin dashboard SHALL be a real-time, role-aware interface that presents actionable intelligence to administrators at every level. The dashboard SHALL load within 2 seconds (P95) and support real-time updates via WebSocket or Server-Sent Events.

### 7.2 Super Admin Dashboard (Platform Level)

**REQ-DASH-001:** The Super Admin dashboard SHALL display:

| Widget              | Data                                                                  | Refresh Rate   |
| ------------------- | --------------------------------------------------------------------- | -------------- |
| Platform Health     | Service status, error rates, latency percentiles, queue depths        | Real-time (5s) |
| Tenant Overview     | Total tenants, active/suspended/trial, new this period                | Real-time (1m) |
| Global User Metrics | Total users, active sessions, new registrations, churn                | Real-time (1m) |
| Revenue Metrics     | MRR, ARR, seat utilization across all tenants                         | Hourly         |
| System Alerts       | Critical events: failed provisioning, sync errors, security incidents | Real-time      |
| Feature Adoption    | Usage rates per feature across tenants                                | Daily          |
| Support Escalations | Open tickets, SLA compliance, trending issues                         | Real-time (5m) |

### 7.3 Tenant Admin Dashboard

**REQ-DASH-002:** The Tenant Admin dashboard SHALL provide the following sections:

#### 7.3.1 Security Posture Overview

- **Organization Risk Score:** A composite score (0-100) calculated from training completion, simulation performance, reported incidents, and compliance status. Updated hourly.
- **Risk Trend:** 30/60/90-day risk score trend with annotations for significant events (training campaigns launched, breaches simulated).
- **Risk Heatmap:** A visual heatmap of risk scores across the organizational hierarchy (departments, teams, locations).
- **Top Risk Areas:** The five departments/teams with the highest risk scores, with drill-down capability.

#### 7.3.2 Training Status

- **Overall Completion Rate:** Percentage of assigned training completed across the organization. Broken down by: overdue, in progress, completed, not started.
- **Campaign Performance:** Active training campaigns with completion rates, average scores, and time-to-completion.
- **Compliance Training:** Status of mandatory compliance modules (SOC 2, HIPAA, GDPR, PCI DSS) with deadline tracking.
- **Learning Path Progress:** Aggregated progress across personalized learning paths.
- **Content Effectiveness:** Top-performing and bottom-performing training modules by engagement and knowledge retention.

#### 7.3.3 Phishing Simulation Results

- **Simulation Dashboard:** Active and recent simulation campaigns with key metrics.
- **Click Rate:** Percentage of users who clicked simulated phishing links, trended over time.
- **Report Rate:** Percentage of users who correctly reported simulated phishing emails.
- **Susceptibility Matrix:** Cross-tabulation of user segments (department, role, seniority) against simulation difficulty levels.
- **Repeat Offenders:** Users who have failed multiple simulations (configurable threshold).
- **Improvement Tracking:** Per-user and per-group improvement over successive simulation campaigns.

#### 7.3.4 Compliance Status

- **Regulatory Framework Tracker:** Status against configured compliance frameworks (NIST CSF, ISO 27001, SOC 2, HIPAA, GDPR, PCI DSS, CMMC).
- **Policy Acknowledgments:** Percentage of users who have acknowledged required policies (acceptable use, data handling, incident reporting).
- **Certification Status:** Users with expiring or expired certifications, upcoming renewal deadlines.
- **Audit Readiness Score:** Composite metric indicating readiness for an external audit.

#### 7.3.5 User Management Summary

- **User Statistics:** Total users, active, inactive, pending onboarding, locked out.
- **License Utilization:** Current seat usage vs. allocated, projected utilization.
- **Onboarding Funnel:** Conversion through onboarding steps, bottleneck identification.
- **Recent Activity:** Last 50 admin actions (user creates, role changes, configuration changes).

### 7.4 Manager Dashboard

**REQ-DASH-003:** The Manager dashboard SHALL present all metrics from Sections 7.3.2 through 7.3.4, scoped to the manager's organizational units. Additionally:

- **Team Leaderboard:** Optional, opt-in ranking of teams by training completion and simulation performance.
- **Action Items:** A prioritized list of required actions (approve extension requests, review escalations, remind overdue users).
- **Direct Reports Status:** Individual-level view of each direct report's training progress, risk score, and compliance status.

### 7.5 Dashboard Customization

**REQ-DASH-004:** All dashboards SHALL support:

- **Widget Customization:** Admins can add, remove, resize, and rearrange dashboard widgets using a drag-and-drop interface.
- **Saved Views:** Multiple named dashboard configurations per user.
- **Scheduled Snapshots:** Automated daily/weekly/monthly dashboard screenshots delivered via email as PDF.
- **Embedding:** Individual widgets can be embedded in external systems (Sharepoint, Confluence, internal portals) via secure, token-authenticated iframes.
- **Drill-Down:** Every aggregate metric SHALL be clickable to reveal underlying data, down to the individual user level (subject to permission checks).

### 7.6 Report Builder

**REQ-DASH-005:** The platform SHALL include a self-service report builder allowing Tenant Admins and authorized Managers to:

- Select data sources (users, training, simulations, compliance, audit logs).
- Apply filters (date range, department, team, role, status).
- Choose visualization types (table, bar chart, line chart, pie chart, heatmap, funnel).
- Schedule recurring report generation and distribution.
- Export reports in CSV, PDF, Excel (XLSX), and JSON formats.
- Share reports with other admins via link (with permission enforcement).

---

## 8. Notification System

### 8.1 Notification Architecture

The notification system SHALL be a centralized, multi-channel delivery platform that routes messages to users and administrators based on configurable rules, preferences, and escalation policies.

### 8.2 Notification Channels

#### 8.2.1 Email Notifications

**REQ-NOTIF-001:** Email notifications SHALL support:

- Tenant-branded templates (see Section 2.3.3).
- HTML and plain-text multipart messages.
- Configurable sender address and display name per notification type.
- Delivery tracking (sent, delivered, opened, clicked, bounced, complained).
- Rate limiting per user (configurable max emails per day, default: 10).
- Digest mode: aggregate multiple notifications into a single periodic email (hourly, daily, weekly).
- Unsubscribe management compliant with CAN-SPAM, GDPR, and CASL.

**Notification Types (Email):**

| Category       | Examples                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| Account        | Welcome, password reset, MFA setup, account locked, session from new device                |
| Training       | Assignment notification, deadline reminder, completion confirmation, certificate available |
| Simulation     | (Intentionally NOT notified -- phishing simulations must be covert)                        |
| Compliance     | Policy acknowledgment required, certification expiring, compliance deadline approaching    |
| Administrative | Role change, organizational change, license warning, system maintenance                    |
| Reports        | Scheduled report delivery, export ready for download                                       |
| Security       | Suspicious login detected, MFA recovery codes used, API key created                        |

#### 8.2.2 In-App Notifications

**REQ-NOTIF-002:** The platform SHALL provide a real-time in-app notification system:

- Bell icon with unread count badge in the application header.
- Notification drawer/panel with categorized, chronological list.
- Mark as read (individual and bulk).
- Action buttons inline (e.g., "Start Training", "Acknowledge Policy", "View Report").
- Toast/snackbar notifications for high-priority real-time alerts.
- Notification center with search and filter capabilities.
- Persistence: notifications retained for 90 days (configurable).

#### 8.2.3 Slack Integration

**REQ-NOTIF-003:** The platform SHALL integrate with Slack via:

- **Slack App (preferred):** A certified Slack app installable from the Slack App Directory. Supports channel notifications, direct messages, and interactive message actions (buttons for approvals, acknowledgments).
- **Incoming Webhooks (fallback):** Simple webhook-based posting to designated channels.

Configurable routing:

- Map notification categories to specific Slack channels (e.g., security alerts to `#security-ops`, training reminders to `#training`, compliance to `#compliance`).
- Direct message delivery for user-specific notifications.
- Thread replies for related notification sequences.
- Interactive elements: buttons for quick actions (approve, deny, remind later).

#### 8.2.4 Microsoft Teams Integration

**REQ-NOTIF-004:** The platform SHALL integrate with Microsoft Teams via:

- **Teams App:** A certified Teams app published to the organization's Teams app catalog. Supports channel posts, adaptive cards, and task module interactions.
- **Power Automate Connector:** A custom connector in the Power Automate ecosystem for workflow-driven notifications.
- **Incoming Webhook (fallback):** Simple webhook-based posting to designated channels.

Adaptive Card support for:

- Training assignment with "Start Now" button.
- Compliance acknowledgment with inline approval.
- Risk score alerts with drill-down link.
- Manager escalation with "Review" and "Dismiss" actions.

#### 8.2.5 SMS Notifications (Optional)

**REQ-NOTIF-005:** For critical notifications (account lockout, security incidents, MFA recovery), SMS delivery SHALL be available as an opt-in channel. SMS SHALL only be used for time-sensitive, security-critical notifications and SHALL comply with TCPA and equivalent regulations.

#### 8.2.6 Push Notifications (Mobile App)

**REQ-NOTIF-006:** If a mobile application is offered, push notifications SHALL be delivered via APNs (iOS) and FCM (Android) with:

- Silent push for background data sync.
- Rich push with images and action buttons.
- Notification grouping by category.
- Opt-in/opt-out granularity per notification category.

### 8.3 Notification Preferences

**REQ-NOTIF-007:** Users SHALL be able to configure their notification preferences with the following granularity:

```
For each notification category:
  - Channel: Email / In-App / Slack / Teams / SMS / Push (multi-select)
  - Frequency: Immediate / Digest (hourly/daily/weekly) / Disabled
  - Quiet Hours: Time windows during which non-critical notifications are held

Tenant Admins can:
  - Set default preferences for all users.
  - Mark specific notification types as mandatory (cannot be disabled by users).
  - Override user preferences for compliance-critical notifications.
```

### 8.4 Escalation Workflows

**REQ-NOTIF-008:** The platform SHALL support configurable escalation workflows:

```
Escalation Workflow {
  name: string
  trigger: enum (training_overdue, simulation_failed, compliance_deadline,
                 risk_score_threshold, custom)
  trigger_conditions: json (e.g., {"days_overdue": 7, "risk_score_above": 80})

  steps: [
    {
      delay: duration (e.g., "0 days" for immediate)
      action: enum (notify, remind, escalate, auto_action)
      recipients: enum (user, manager, manager_chain, tenant_admin, custom_group)
      channel: enum (email, in_app, slack, teams)
      template: string (notification template ID)
    },
    {
      delay: duration (e.g., "3 days" after previous step)
      action: "remind"
      recipients: "user"
      channel: ["email", "in_app"]
    },
    {
      delay: duration (e.g., "7 days" after trigger)
      action: "escalate"
      recipients: "manager"
      channel: ["email", "slack"]
    },
    {
      delay: duration (e.g., "14 days" after trigger)
      action: "escalate"
      recipients: "tenant_admin"
      channel: ["email", "slack", "in_app"]
    },
    {
      delay: duration (e.g., "21 days" after trigger)
      action: "auto_action"
      auto_action: enum (suspend_user, restrict_access, generate_incident)
    }
  ]
}
```

**REQ-NOTIF-009:** Escalation workflows SHALL be auditable. The system SHALL log every escalation step execution, including: trigger evaluation time, step executed, recipients notified, delivery status, and any acknowledgments received.

### 8.5 Notification Templates

**REQ-NOTIF-010:** All notification content SHALL be managed through a template system that supports:

- Tenant-level template customization (override platform defaults).
- Localization (multi-language support with fallback chain: user language > tenant language > platform default).
- Merge tags for dynamic content (user attributes, organization attributes, training details, deadlines, links).
- A/B testing for notification effectiveness (optional).
- Template versioning with rollback capability.

---

## 9. API & Automation

### 9.1 REST API

#### 9.1.1 API Design Principles

**REQ-API-001:** The platform SHALL expose a comprehensive REST API adhering to the following principles:

- **OpenAPI 3.1 Specification:** The API SHALL be fully documented in OpenAPI format, auto-generated from code annotations, and published as an interactive API explorer (Swagger UI / Redoc).
- **Versioning:** URL path versioning (`/api/v1/`, `/api/v2/`) with a minimum 24-month deprecation window for major versions.
- **Content Type:** `application/json` for all request and response bodies. Support `application/json-patch+json` for PATCH operations.
- **Pagination:** Cursor-based pagination for all list endpoints. Support `limit` (1-100, default 25) and `cursor` parameters. Response includes `next_cursor`, `has_more`, and `total_count` (when feasible).
- **Filtering:** Consistent query parameter syntax: `?filter[field]=value`, `?filter[field][operator]=value` (operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `co`, `sw`).
- **Sorting:** `?sort=field` (ascending), `?sort=-field` (descending), multi-field: `?sort=-created_at,name`.
- **Field Selection:** `?fields=id,name,email` to reduce payload size.
- **Error Format:** RFC 7807 Problem Details (`type`, `title`, `status`, `detail`, `instance`).
- **Rate Limiting:** Token bucket algorithm. Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. HTTP 429 with `Retry-After` header on exhaustion.
- **Idempotency:** All POST endpoints SHALL support an `Idempotency-Key` header for safe retries.

#### 9.1.2 API Resource Coverage

The API SHALL provide full CRUD operations for the following resources:

```
/api/v1/users                    - User management
/api/v1/users/{id}/sessions      - Session management
/api/v1/users/{id}/roles         - Role assignments
/api/v1/users/{id}/training      - Training assignments and progress
/api/v1/users/{id}/simulations   - Simulation results
/api/v1/users/{id}/compliance    - Compliance status

/api/v1/roles                    - Role definitions
/api/v1/permissions              - Permission catalog

/api/v1/organizations            - Organizational units
/api/v1/organizations/{id}/members - Unit memberships

/api/v1/training/modules         - Training content management
/api/v1/training/campaigns       - Training campaign management
/api/v1/training/assignments     - Bulk assignment management

/api/v1/simulations/campaigns    - Simulation campaign management
/api/v1/simulations/templates    - Simulation template management
/api/v1/simulations/results      - Simulation result queries

/api/v1/reports                  - Report management
/api/v1/reports/{id}/export      - Report export

/api/v1/compliance/frameworks    - Compliance framework configuration
/api/v1/compliance/policies      - Policy management
/api/v1/compliance/acknowledgments - Acknowledgment tracking

/api/v1/integrations/sso         - SSO configuration
/api/v1/integrations/scim        - SCIM configuration
/api/v1/integrations/webhooks    - Webhook configuration

/api/v1/audit/logs               - Audit log queries

/api/v1/settings                 - Tenant settings
/api/v1/settings/branding        - Branding configuration
/api/v1/settings/security        - Security policy configuration

/api/v1/licenses                 - License and entitlement queries

/api/v1/notifications            - Notification management
/api/v1/notifications/templates  - Notification template management
```

#### 9.1.3 API Authentication

**REQ-API-002:** The API SHALL support the following authentication methods:

| Method                              | Use Case                                    | Token Lifetime                   |
| ----------------------------------- | ------------------------------------------- | -------------------------------- |
| API Key (Bearer Token)              | Server-to-server integrations               | No expiry (revocable)            |
| OAuth 2.0 Client Credentials        | Machine-to-machine with scoped access       | Configurable (1 hour default)    |
| OAuth 2.0 Authorization Code + PKCE | User-context integrations, third-party apps | Access: 1 hour, Refresh: 30 days |
| Personal Access Token (PAT)         | Developer/admin scripting                   | Configurable (max 1 year)        |

**REQ-API-003:** API keys and PATs SHALL support scope restrictions. An API key can be limited to specific resources and actions (e.g., `users:read`, `reports:export`). This prevents over-privileged integrations.

**REQ-API-004:** All API keys SHALL be rotatable without downtime. The system SHALL support a grace period where both the old and new key are valid (configurable: 1-72 hours).

#### 9.1.4 Rate Limiting

**REQ-API-005:** Rate limits SHALL be configurable per tenant tier:

| Tier         | Requests/Minute | Requests/Hour | Burst      |
| ------------ | --------------- | ------------- | ---------- |
| Standard     | 60              | 1,000         | 20         |
| Professional | 300             | 10,000        | 50         |
| Enterprise   | 1,000           | 100,000       | 200        |
| Custom       | Negotiated      | Negotiated    | Negotiated |

Rate limits SHALL be applied per API key. Enterprise tenants SHALL be able to request rate limit increases for specific integration use cases.

### 9.2 Webhooks

**REQ-API-006:** The platform SHALL support outbound webhooks for real-time event notification:

#### 9.2.1 Webhook Events

```
Category: User Events
  - user.created
  - user.updated
  - user.activated
  - user.deactivated
  - user.deleted
  - user.login.success
  - user.login.failure
  - user.mfa.enrolled
  - user.mfa.challenged
  - user.password.changed
  - user.role.assigned
  - user.role.revoked

Category: Training Events
  - training.assigned
  - training.started
  - training.completed
  - training.failed
  - training.overdue
  - training.campaign.launched
  - training.campaign.completed

Category: Simulation Events
  - simulation.campaign.launched
  - simulation.email.sent
  - simulation.email.opened
  - simulation.link.clicked
  - simulation.credentials.submitted
  - simulation.reported
  - simulation.campaign.completed

Category: Compliance Events
  - compliance.policy.acknowledged
  - compliance.certification.earned
  - compliance.certification.expired
  - compliance.deadline.approaching
  - compliance.deadline.missed

Category: Administrative Events
  - organization.created
  - organization.updated
  - organization.deleted
  - settings.changed
  - integration.configured
  - integration.error

Category: Security Events
  - security.incident.detected
  - security.anomaly.detected
  - security.api_key.created
  - security.api_key.revoked
```

#### 9.2.2 Webhook Delivery

**REQ-API-007:** Webhook delivery SHALL implement:

- **Payload Signing:** Every webhook payload SHALL include an HMAC-SHA256 signature in the `X-Webhook-Signature` header, computed using a per-endpoint secret key. Recipients MUST verify the signature.
- **Retry Policy:** Failed deliveries (non-2xx responses, timeouts) SHALL be retried with exponential backoff: 1 minute, 5 minutes, 30 minutes, 2 hours, 12 hours, 24 hours (6 attempts total, configurable).
- **Delivery Log:** The platform SHALL maintain a 30-day delivery log for each webhook endpoint showing: event type, payload, response status, latency, retry count.
- **Circuit Breaker:** If a webhook endpoint fails consistently (> 95% failure rate over 24 hours), the endpoint SHALL be automatically disabled with an admin notification. Admins can re-enable and test.
- **Filtering:** Each webhook endpoint can subscribe to specific event types. Payload filtering by attributes is supported (e.g., only `user.created` events for the "Engineering" department).
- **Batching:** Optional batching mode that aggregates events into a single delivery at configurable intervals (1-60 minutes, max 100 events per batch).

### 9.3 Third-Party Integration Platform

#### 9.3.1 Zapier Integration

**REQ-API-008:** The platform SHALL publish a Zapier integration supporting:

- **Triggers:** All webhook events available as Zapier triggers with user-friendly descriptions and sample data.
- **Actions:** Create user, update user, assign training, create report, send notification.
- **Searches:** Find user by email, find training by name, find department by code.
- **Multi-step Zap Support:** Full data passthrough between steps.

#### 9.3.2 Microsoft Power Automate Connector

**REQ-API-009:** The platform SHALL publish a certified Microsoft Power Automate custom connector supporting:

- All triggers and actions available in the Zapier integration.
- Integration with Microsoft 365 ecosystem (SharePoint, Outlook, Teams, Excel).
- Support for Power Automate desktop flows for on-premises hybrid scenarios.
- Connector published in the Power Platform connector directory.

#### 9.3.3 Additional Integration Support

**REQ-API-010:** The platform SHALL provide:

- **Workato Recipe:** Pre-built recipes for common HR and IT workflows.
- **Tray.io Connector:** For advanced enterprise automation scenarios.
- **n8n / Make.com Templates:** For customers using open-source automation platforms.
- **CLI Tool:** A command-line interface (`dmz-cli`) for scripting and CI/CD integration, distributed via npm, pip, Homebrew, and direct binary download.

### 9.4 Bulk Operations API

**REQ-API-011:** The API SHALL provide bulk operation endpoints for high-volume administrative tasks:

```
POST /api/v1/bulk/users           - Create/update up to 1,000 users
POST /api/v1/bulk/assignments     - Assign training to up to 10,000 users
POST /api/v1/bulk/roles           - Assign/revoke roles for up to 1,000 users
POST /api/v1/bulk/organizations   - Create/update up to 500 organizational units
DELETE /api/v1/bulk/users         - Deactivate up to 1,000 users
```

**REQ-API-012:** Bulk operations SHALL:

- Be processed asynchronously. The API returns HTTP 202 Accepted with a job ID.
- Provide status polling via `GET /api/v1/jobs/{job_id}` (status, progress percentage, errors, result summary).
- Support cancellation via `DELETE /api/v1/jobs/{job_id}` (best-effort, already-processed items are not rolled back).
- Emit webhook events for job completion (`bulk.job.completed`, `bulk.job.failed`).
- Support dry-run mode for validation without execution.

---

## 10. Data Management

### 10.1 Data Export

#### 10.1.1 Export Formats

**REQ-DATA-001:** The platform SHALL support data export in the following formats:

| Format             | Use Case                                                    | Max Records           |
| ------------------ | ----------------------------------------------------------- | --------------------- |
| CSV                | Spreadsheet analysis, HRIS import, simple data exchange     | 1,000,000             |
| Excel (XLSX)       | Business reporting, formatted tables with multiple sheets   | 500,000               |
| PDF                | Compliance documentation, executive summaries, certificates | N/A (report-based)    |
| JSON               | API integration, programmatic consumption                   | 1,000,000             |
| JSON Lines (JSONL) | Streaming ingestion, large dataset processing               | Unlimited (streaming) |
| XML                | Legacy system integration                                   | 500,000               |

#### 10.1.2 Export Mechanisms

**REQ-DATA-002:** Data export SHALL be available through:

- **UI Export:** One-click export from any report, dashboard widget, or data table. Small exports (< 10,000 records) download immediately. Large exports are processed asynchronously with email notification when ready.
- **Scheduled Export:** Recurring exports (daily, weekly, monthly) delivered via email, SFTP, S3 bucket, Azure Blob Storage, or Google Cloud Storage.
- **API Export:** `POST /api/v1/exports` endpoint that accepts export configuration (data source, filters, format, destination) and returns a job ID for async tracking.
- **Streaming Export:** For very large datasets, a streaming API endpoint (`GET /api/v1/exports/{id}/stream`) that delivers data as a chunked transfer-encoded response.

**REQ-DATA-003:** All exports SHALL:

- Respect the requesting user's permission scope (a manager can only export data for their organizational units).
- Include metadata: export timestamp, data range, filters applied, exporting user, tenant.
- Support column selection (users choose which fields to include).
- Be logged in the audit trail with full details (who, what, when, how many records, destination).

#### 10.1.3 Compliance Reporting Exports

**REQ-DATA-004:** The platform SHALL provide pre-built export templates for common compliance frameworks:

- **SOC 2 Evidence Pack:** User access reviews, training completion evidence, policy acknowledgments, security incident logs.
- **ISO 27001 Evidence:** Security awareness training records, competency assessments, management review data.
- **HIPAA Training Records:** HIPAA-specific module completions, dates, scores, re-certification status.
- **PCI DSS Training Evidence:** PCI DSS awareness training records for all personnel.
- **CMMC Evidence:** Cybersecurity maturity model compliance evidence (for defense contractors).
- **GDPR Training Records:** Data protection training completion, DPO certification status.

### 10.2 Data Retention Policies

**REQ-DATA-005:** The platform SHALL support configurable data retention policies at the tenant level:

```
DataRetentionPolicy {
  tenant_id: UUID
  data_category: enum (user_profiles, training_records, simulation_results,
                        compliance_records, audit_logs, session_logs,
                        notification_logs, api_logs, exported_files)
  retention_period: duration (e.g., "365 days", "7 years", "forever")
  action_on_expiry: enum (delete, anonymize, archive)
  archive_destination: enum (cold_storage, external_s3, none)
  applies_to: enum (all_users, deactivated_users, deleted_users)
  legal_hold_override: boolean (if true, retention is suspended during legal hold)
}
```

**REQ-DATA-006:** Default retention periods SHALL be:

| Data Category               | Default Retention   | Minimum Allowed | Regulatory Driver |
| --------------------------- | ------------------- | --------------- | ----------------- |
| User Profiles (Active)      | Duration of account | N/A             | --                |
| User Profiles (Deactivated) | 90 days             | 30 days         | GDPR Art. 17      |
| Training Records            | 7 years             | 1 year          | SOC 2, ISO 27001  |
| Simulation Results          | 3 years             | 6 months        | --                |
| Compliance Records          | 7 years             | 3 years         | HIPAA, PCI DSS    |
| Audit Logs                  | 7 years             | 1 year          | SOC 2, ISO 27001  |
| Session Logs                | 90 days             | 30 days         | --                |
| Notification Logs           | 90 days             | 30 days         | --                |
| API Logs                    | 90 days             | 30 days         | --                |
| Exported Files              | 30 days             | 7 days          | --                |

**REQ-DATA-007:** The platform SHALL execute retention policy enforcement as an automated background process that runs daily. Expired data SHALL be processed according to the configured action (delete, anonymize, or archive). The process SHALL generate an execution report available to Tenant Admins.

**REQ-DATA-008:** Legal hold functionality SHALL allow Tenant Admins or platform legal/compliance staff to suspend data deletion for specific users, departments, or the entire tenant. Legal holds SHALL override all retention policies until explicitly released. Legal hold events SHALL be immutably logged.

### 10.3 Right to Deletion (GDPR Article 17)

**REQ-DATA-009:** The platform SHALL provide a Data Subject Request (DSR) workflow:

```
Data Subject Request Workflow:

[1. Request Received]
  - Via user self-service portal, admin submission, or API
  - Request types: Access (Art. 15), Rectification (Art. 16),
    Erasure (Art. 17), Portability (Art. 20), Restriction (Art. 18)
  - Acknowledgment sent within 24 hours
  |
  v
[2. Identity Verification]
  - System verifies the requestor's identity
  - Multi-factor verification for sensitive requests
  |
  v
[3. Impact Assessment]
  - System generates a report of all data associated with the subject
  - Identifies data categories, storage locations, and sharing relationships
  - Flags potential conflicts (legal holds, regulatory retention requirements)
  |
  v
[4. Admin Review]
  - Tenant Admin or DPO reviews the request
  - Approves, denies (with documented justification), or requests more information
  - Denial reasons: legal obligation, legitimate interest, freedom of expression
  |
  v
[5. Execution]
  - For erasure: data is cryptographically erased or overwritten
  - For access/portability: data is compiled into a machine-readable format
  - For rectification: data is updated per the request
  - Execution includes: database records, backups (flagged for exclusion on next
    restoration), file storage, search indexes, caches, logs (anonymized)
  |
  v
[6. Confirmation]
  - Completion report generated (audit trail)
  - Confirmation sent to the data subject
  - Any third parties who received the data are notified (Art. 19)
  |
  v
[7. Compliance Record]
  - DSR record retained for 3 years (documenting the request, actions taken, timeline)
  - Available for regulatory audit
```

**REQ-DATA-010:** The DSR workflow SHALL complete within 30 calendar days of the request, as required by GDPR. The system SHALL track deadlines and send escalation notifications at 14 days and 21 days if the request has not been resolved.

**REQ-DATA-011:** For erasure requests, the system SHALL handle the following edge cases:

- **Aggregated/Anonymized Data:** Data that has already been aggregated and cannot be attributed to the individual is NOT required to be deleted. The system SHALL document this exception.
- **Backup Tapes:** The system SHALL maintain a deletion queue for backup restoration. If a backup containing the deleted user's data is restored, the deletion SHALL be automatically re-applied.
- **Third-Party Processors:** The system SHALL notify all configured third-party processors (via API or automated email) of the deletion obligation.
- **Training Content Authored:** If the user authored training content, ownership SHALL be transferred to a designated successor before deletion. Completion records referencing the content SHALL be anonymized, not deleted.

### 10.4 Data Anonymization

**REQ-DATA-012:** The platform SHALL support data anonymization as an alternative to deletion:

| Data Field          | Anonymization Method                          |
| ------------------- | --------------------------------------------- |
| Name                | Replaced with "Anonymous User [hash]"         |
| Email               | Replaced with "[hash]@anonymized.invalid"     |
| Phone               | Deleted                                       |
| IP Address          | Truncated to /24 (IPv4) or /48 (IPv6)         |
| Location            | Generalized to country level                  |
| Department          | Retained (for aggregate reporting)            |
| Training Scores     | Retained (for aggregate reporting)            |
| Free-Text Responses | Deleted                                       |
| Profile Photo       | Replaced with default avatar                  |
| Custom Attributes   | Deleted or generalized based on configuration |

**REQ-DATA-013:** Anonymization SHALL be irreversible. The system SHALL verify that no combination of retained anonymized attributes can be used to re-identify the individual (k-anonymity with k >= 5 within the tenant's dataset).

### 10.5 Data Encryption

**REQ-DATA-014:** Data protection SHALL be implemented at multiple layers:

| Layer                   | Encryption                                                        | Standard                   |
| ----------------------- | ----------------------------------------------------------------- | -------------------------- |
| Data in Transit         | TLS 1.2+ (TLS 1.3 preferred)                                      | All communications         |
| Data at Rest (Storage)  | AES-256-GCM                                                       | All persistent storage     |
| Data at Rest (Database) | Transparent Data Encryption (TDE) or application-level encryption | All database instances     |
| Sensitive Fields        | Application-level field encryption with tenant-specific keys      | PII, credentials, API keys |
| Backup Encryption       | AES-256-GCM with separate key hierarchy                           | All backups                |
| Key Management          | Hardware Security Module (HSM) or cloud KMS                       | FIPS 140-2 Level 2+        |

**REQ-DATA-015:** Enterprise-tier tenants SHALL be able to provide their own encryption keys (Bring Your Own Key / BYOK) or manage keys through their own KMS (Hold Your Own Key / HYOK). The platform SHALL support AWS KMS, Azure Key Vault, Google Cloud KMS, and HashiCorp Vault as external key management providers.

---

## 11. Enterprise Deployment Options

### 11.1 Deployment Topology Overview

The platform SHALL support multiple deployment topologies to meet diverse enterprise requirements for data sovereignty, security, and operational control.

```
+--------------------------------------------------------------------+
|                    Deployment Options                                |
+--------------------------------------------------------------------+
|                                                                      |
|  [SaaS]          [Private Cloud]    [On-Premises]    [Hybrid]       |
|  Multi-tenant    Single-tenant      Customer DC      Split deploy   |
|  Shared infra    Dedicated infra    Full control     Best of both   |
|  Managed by us   Managed by us      Managed by cust  Shared mgmt   |
|                                                                      |
|  [Air-Gapped]                                                        |
|  No internet                                                         |
|  Sneakernet updates                                                  |
|  Gov/Defense                                                         |
+--------------------------------------------------------------------+
```

### 11.2 SaaS (Multi-Tenant)

**REQ-DEPLOY-001:** The primary deployment model SHALL be multi-tenant SaaS:

- **Infrastructure:** Shared Kubernetes clusters in multiple regions (US, EU, APAC, with expandability).
- **Data Residency:** Tenant data SHALL reside in the region selected at tenant creation. Cross-region data transfer SHALL NOT occur without explicit consent and legal basis.
- **Available Regions:**
  - US East (Virginia)
  - US West (Oregon)
  - EU West (Ireland)
  - EU Central (Frankfurt)
  - APAC Southeast (Singapore)
  - APAC Northeast (Tokyo)
  - Additional regions on demand (Canada, Australia, UK, Brazil, Middle East)
- **SLA:** 99.9% uptime (Standard), 99.95% (Professional), 99.99% (Enterprise).
- **Maintenance Windows:** Zero-downtime deployments. Database migrations use online schema change tools. Feature releases via feature flags.
- **Disaster Recovery:** RPO < 1 hour, RTO < 4 hours (Standard); RPO < 15 minutes, RTO < 1 hour (Enterprise).

### 11.3 Private Cloud (Single-Tenant)

**REQ-DEPLOY-002:** For customers requiring dedicated infrastructure:

- **Dedicated Compute:** Isolated Kubernetes cluster (or VM fleet) in the customer's preferred cloud provider and region.
- **Dedicated Database:** Single-tenant database instance with customer-managed encryption keys.
- **Network Isolation:** VPC peering, private endpoints, no shared network paths.
- **Customization:** Custom resource sizing, scaling policies, maintenance windows.
- **Management:** Fully managed by The DMZ operations team with customer oversight via a management portal.
- **Supported Cloud Providers:**
  - Amazon Web Services (EKS, RDS, S3, CloudFront)
  - Microsoft Azure (AKS, Azure SQL, Blob Storage, Azure CDN)
  - Google Cloud Platform (GKE, Cloud SQL, GCS, Cloud CDN)
  - Oracle Cloud Infrastructure (OKE, Oracle DB, Object Storage)

**REQ-DEPLOY-003:** Private cloud deployments SHALL be provisioned via Infrastructure as Code (Terraform) with the following components:

```
Terraform Module: dmz-private-cloud
  |
  +-- networking/       (VPC, subnets, security groups, load balancers)
  +-- compute/          (Kubernetes cluster, node pools, autoscaling)
  +-- database/         (Primary DB, read replicas, automated backups)
  +-- storage/          (Object storage, CDN, file storage)
  +-- security/         (KMS, secrets manager, WAF, DDoS protection)
  +-- monitoring/       (CloudWatch/Azure Monitor/Stackdriver, alerting)
  +-- dns/              (Route53/Azure DNS/Cloud DNS, SSL certificates)
  +-- backup/           (Automated backup, cross-region replication)
```

### 11.4 On-Premises

**REQ-DEPLOY-004:** For customers requiring full control over their infrastructure:

#### 11.4.1 System Requirements

| Component           | Minimum (< 1,000 users)         | Recommended (1,000 -- 10,000 users)               | Large (> 10,000 users)          |
| ------------------- | ------------------------------- | ------------------------------------------------- | ------------------------------- |
| Application Servers | 2 x 4 vCPU, 16GB RAM            | 4 x 8 vCPU, 32GB RAM                              | 8+ x 16 vCPU, 64GB RAM          |
| Database            | 1 x 4 vCPU, 32GB RAM, 500GB SSD | 2 x 8 vCPU, 64GB RAM, 1TB SSD (primary + replica) | Clustered, 3+ nodes, 128GB+ RAM |
| Object Storage      | 100GB                           | 1TB                                               | 10TB+                           |
| Load Balancer       | 1 (software)                    | 2 (HA pair)                                       | Hardware or cloud-native        |
| Redis/Cache         | 1 x 2 vCPU, 8GB RAM             | 2 x 4 vCPU, 16GB RAM (HA)                         | Clustered, 3+ nodes             |
| Message Queue       | Included in app server          | 2 x 2 vCPU, 8GB RAM (HA)                          | Clustered, 3+ nodes             |

#### 11.4.2 Supported Platforms

**REQ-DEPLOY-005:** On-premises deployments SHALL support:

- **Container Orchestration:** Kubernetes (1.27+), OpenShift (4.12+), Docker Swarm (limited support).
- **Operating Systems (bare metal/VM):** RHEL 8/9, Ubuntu 22.04/24.04, Rocky Linux 8/9, Amazon Linux 2023.
- **Databases:** PostgreSQL 15+, MySQL 8.0+ (limited), Oracle 19c+ (Enterprise tier).
- **Reverse Proxy:** Nginx, HAProxy, Apache (with provided configuration templates).
- **Certificate Management:** Integration with internal PKI, cert-manager for Kubernetes, manual certificate upload.

#### 11.4.3 Installation and Updates

**REQ-DEPLOY-006:** On-premises installation SHALL be delivered as:

- **Helm Chart:** For Kubernetes deployments. Fully configurable via `values.yaml`.
- **Docker Compose:** For small/evaluation deployments (not recommended for production).
- **RPM/DEB Packages:** For non-containerized deployments.
- **Ansible Playbooks:** For automated provisioning and configuration of all components.
- **VM Images (OVA/QCOW2):** Pre-built images for VMware and KVM environments.

**REQ-DEPLOY-007:** Updates SHALL be delivered as:

- **Helm Chart Updates:** `helm upgrade` with automated database migration execution.
- **Package Repositories:** Private RPM/DEB repository with GPG-signed packages.
- **Offline Bundles:** Tarball containing all container images, packages, and migration scripts for air-gapped environments.
- **Update Process:** Rolling updates with automatic health checks and rollback on failure.
- **Update Frequency:** Monthly feature releases, weekly security patches, emergency hotfixes as needed.

### 11.5 Hybrid Deployment

**REQ-DEPLOY-008:** The platform SHALL support hybrid deployments where:

- **Control Plane in Cloud:** User management, configuration, reporting dashboard, and API hosted in the cloud (SaaS or private cloud).
- **Data Plane On-Premises:** Training content delivery, simulation execution, and user activity data stored on-premises.
- **Sync Agent:** A lightweight agent deployed on-premises that synchronizes configuration from the cloud control plane, executes training/simulation workloads locally, and reports aggregated (optionally anonymized) metrics back to the cloud dashboard.

**REQ-DEPLOY-009:** Hybrid deployments SHALL support intermittent connectivity. The on-premises data plane SHALL operate independently for up to 72 hours without cloud connectivity, queuing all sync operations for execution when connectivity is restored.

### 11.6 Air-Gapped Environments

**REQ-DEPLOY-010:** For government, defense, and high-security customers, the platform SHALL support fully air-gapped deployment:

#### 11.6.1 Air-Gap Requirements

| Requirement              | Implementation                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| No Internet Connectivity | All components function without any outbound network access                                                                          |
| Content Delivery         | Training content, simulation templates, and platform updates delivered via physical media (encrypted USB, DVD) or one-way data diode |
| License Validation       | Offline license validation using cryptographic license files (no phone-home)                                                         |
| Time Synchronization     | Supports NTP from internal time servers; no dependency on public NTP                                                                 |
| DNS                      | Internal DNS only; no external DNS resolution required                                                                               |
| Certificate Management   | Internal CA support; no Let's Encrypt or external CA dependency                                                                      |
| Update Mechanism         | Manual update via signed, encrypted offline bundles. Integrity verification via SHA-256 checksums and GPG signatures                 |
| Telemetry                | All telemetry disabled. No usage data leaves the environment                                                                         |
| Authentication           | Local authentication, internal LDAP/AD, or on-premises IdP only. No cloud SSO                                                        |
| Content Updates          | Quarterly content packs delivered as encrypted archives with digital signatures                                                      |

#### 11.6.2 Air-Gap Content Management

**REQ-DEPLOY-011:** Content for air-gapped environments SHALL be managed through:

- **Content Export Tool:** A utility that packages selected training modules, simulation templates, and configuration into a signed, encrypted archive.
- **Content Import Tool:** An on-premises utility that verifies the archive integrity, decrypts, and imports content into the local instance.
- **Differential Updates:** Content updates SHALL support delta packaging (only changed/new content) to minimize transfer size.
- **Content Signing:** All content SHALL be digitally signed by The DMZ's content authority. The air-gapped instance SHALL verify signatures before import.

#### 11.6.3 Air-Gap Security Hardening

**REQ-DEPLOY-012:** Air-gapped deployments SHALL include additional security hardening:

- STIG (Security Technical Implementation Guide) compliance for all OS and application configurations.
- FIPS 140-2 validated cryptographic modules for all encryption operations.
- CIS Benchmark compliance for all infrastructure components.
- SELinux/AppArmor enforcement policies provided.
- Hardened container images based on Chainguard, Iron Bank, or equivalent DOD-approved base images.
- Complete SBOM (Software Bill of Materials) delivered with every release.
- Vulnerability scan reports (Trivy, Grype) delivered with every release.

#### 11.6.4 Classification Level Support

**REQ-DEPLOY-013:** The platform architecture SHALL support deployment at the following classification levels (with appropriate accreditation by the customer's Authorizing Official):

- Unclassified (CUI/FOUO)
- Secret (with IL4/IL5 compliant infrastructure)
- Top Secret (with IL6 compliant infrastructure, customer-managed)

The platform code itself SHALL NOT process or store classified data -- it provides the training framework. Classified content is the customer's responsibility to manage within their accredited environment.

### 11.7 Deployment Configuration Matrix

| Capability            | SaaS      | Private Cloud | On-Premises         | Hybrid            | Air-Gapped         |
| --------------------- | --------- | ------------- | ------------------- | ----------------- | ------------------ |
| Auto-scaling          | Yes       | Yes           | Manual              | Partial           | Manual             |
| Zero-downtime updates | Yes       | Yes           | Rolling             | Partial           | Maintenance window |
| Automatic backups     | Yes       | Yes           | Customer-managed    | Partial           | Customer-managed   |
| SSO (Cloud IdP)       | Yes       | Yes           | Yes (via network)   | Yes               | No                 |
| SSO (On-Prem IdP)     | Via agent | Via agent     | Yes                 | Yes               | Yes                |
| SCIM Provisioning     | Yes       | Yes           | Yes                 | Yes               | Limited (AD sync)  |
| Webhook Delivery      | Yes       | Yes           | Yes (internal only) | Yes               | Internal only      |
| Platform Telemetry    | Yes       | Opt-in        | Opt-in              | Opt-in            | Disabled           |
| Multi-region          | Yes       | Per customer  | N/A                 | Partial           | N/A                |
| Custom Domain         | Yes       | Yes           | Yes                 | Yes               | Internal DNS       |
| Content Updates       | Automatic | Automatic     | Semi-automatic      | Automatic (cloud) | Manual (offline)   |

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric                            | Target                    |
| --------------------------------- | ------------------------- |
| Page load time (dashboard)        | < 2s (P95)                |
| API response time (CRUD)          | < 200ms (P95)             |
| API response time (reports)       | < 5s (P95)                |
| SSO authentication flow           | < 3s (P95)                |
| SCIM sync event processing        | < 60s                     |
| Webhook delivery latency          | < 5s (P95)                |
| Search (users, content)           | < 500ms (P95)             |
| Bulk import (1,000 users)         | < 60s                     |
| Bulk import (100,000 users)       | < 30 minutes              |
| Real-time dashboard updates       | < 5s latency              |
| Report generation (standard)      | < 30s                     |
| Report generation (complex/large) | < 5 minutes               |
| Concurrent users per tenant       | 10,000+ (Enterprise tier) |

### 12.2 Scalability

| Dimension                          | Target           |
| ---------------------------------- | ---------------- |
| Total platform users               | 10,000,000+      |
| Tenants per platform instance      | 10,000+          |
| Users per tenant                   | 500,000+         |
| Organizational units per tenant    | 50,000+          |
| Training modules per tenant        | 10,000+          |
| Concurrent simulations (platform)  | 1,000+ campaigns |
| API requests per second (platform) | 50,000+          |

### 12.3 Availability

| Tier         | Uptime SLA                    | RPO        | RTO     |
| ------------ | ----------------------------- | ---------- | ------- |
| Standard     | 99.9% (8.76 hrs/yr downtime)  | 1 hour     | 4 hours |
| Professional | 99.95% (4.38 hrs/yr downtime) | 30 minutes | 2 hours |
| Enterprise   | 99.99% (52.6 min/yr downtime) | 15 minutes | 1 hour  |

### 12.4 Security

- SOC 2 Type II certified (all controls).
- ISO 27001 certified.
- PCI DSS compliant (if processing payments).
- HIPAA compliant (BAA available).
- FedRAMP Moderate (for US government SaaS).
- Pen-tested quarterly by an independent firm.
- Bug bounty program (HackerOne or equivalent).
- OWASP Top 10 mitigations verified.
- NIST CSF aligned.

### 12.5 Audit Logging

**REQ-NFR-001:** The platform SHALL maintain an immutable audit log capturing:

```
AuditLogEntry {
  id: UUID
  timestamp: ISO 8601 (UTC, microsecond precision)
  tenant_id: UUID
  actor_id: UUID (user who performed the action)
  actor_type: enum (user, system, api_key, scim, webhook)
  actor_ip: string
  actor_user_agent: string
  action: string (e.g., "user.create", "role.assign", "settings.update")
  resource_type: string (e.g., "user", "role", "training_campaign")
  resource_id: UUID
  changes: json (before/after values for update operations)
  result: enum (success, failure, denied)
  failure_reason: string (nullable)
  request_id: UUID (correlation ID for distributed tracing)
  session_id: UUID (nullable)
  metadata: json (additional context)
}
```

**REQ-NFR-002:** Audit logs SHALL:

- Be immutable (append-only, no update or delete).
- Be tamper-evident (hash-chained or signed).
- Be retained for the configured retention period (minimum 1 year, default 7 years).
- Be searchable and filterable via the admin UI and API.
- Support export in JSON, CSV, and CEF (Common Event Format) for SIEM integration.
- Be streamable to external SIEM systems via Syslog (RFC 5424), Splunk HEC, Elasticsearch, or custom webhook.

---

## 13. Appendices

### Appendix A: Glossary

| Term  | Definition                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------- |
| ABAC  | Attribute-Based Access Control. Authorization model using user, resource, and environmental attributes. |
| BYOK  | Bring Your Own Key. Customer provides their own encryption keys.                                        |
| CMMC  | Cybersecurity Maturity Model Certification. DoD contractor requirement.                                 |
| CUI   | Controlled Unclassified Information. US government data classification.                                 |
| DSR   | Data Subject Request. GDPR mechanism for individuals to exercise data rights.                           |
| FIDO2 | Fast Identity Online 2. Passwordless authentication standard.                                           |
| HYOK  | Hold Your Own Key. Customer retains full control of encryption keys in their KMS.                       |
| IdP   | Identity Provider. System that authenticates users (e.g., Azure AD, Okta).                              |
| JIT   | Just-In-Time provisioning. Creating user accounts on first SSO login.                                   |
| OIDC  | OpenID Connect. Identity layer on top of OAuth 2.0.                                                     |
| RBAC  | Role-Based Access Control. Authorization model based on assigned roles.                                 |
| RLS   | Row-Level Security. Database-enforced data isolation.                                                   |
| RPO   | Recovery Point Objective. Maximum acceptable data loss duration.                                        |
| RTO   | Recovery Time Objective. Maximum acceptable service restoration time.                                   |
| SAML  | Security Assertion Markup Language. XML-based SSO protocol.                                             |
| SBOM  | Software Bill of Materials. List of all software components.                                            |
| SCIM  | System for Cross-domain Identity Management. User provisioning protocol.                                |
| SLO   | Single Logout. Terminating sessions across all connected systems.                                       |
| SP    | Service Provider. Application that relies on an IdP for authentication.                                 |
| STIG  | Security Technical Implementation Guide. DoD security configuration standard.                           |
| TDE   | Transparent Data Encryption. Database-level encryption at rest.                                         |

### Appendix B: Compliance Framework Mapping

| Requirement ID                     | SOC 2 | ISO 27001 | NIST CSF | HIPAA      | GDPR         | FedRAMP |
| ---------------------------------- | ----- | --------- | -------- | ---------- | ------------ | ------- |
| REQ-MT-001 (Tenant isolation)      | CC6.1 | A.8.3     | PR.DS-5  | 164.312(a) | Art. 32      | AC-4    |
| REQ-RBAC-001 (Super admin MFA)     | CC6.1 | A.9.4     | PR.AC-7  | 164.312(d) | Art. 32      | IA-2    |
| REQ-IAM-006 (MFA)                  | CC6.1 | A.9.4     | PR.AC-7  | 164.312(d) | Art. 32      | IA-2    |
| REQ-IAM-009 (SCIM)                 | CC6.2 | A.9.2     | PR.AC-1  | 164.312(a) | Art. 25      | AC-2    |
| REQ-DATA-005 (Retention)           | CC6.5 | A.8.10    | PR.DS-3  | 164.530(j) | Art. 5(1)(e) | SI-12   |
| REQ-DATA-009 (DSR/Erasure)         | --    | A.18.1    | --       | --         | Art. 17      | --      |
| REQ-NFR-001 (Audit logging)        | CC7.2 | A.8.15    | DE.CM-3  | 164.312(b) | Art. 30      | AU-2    |
| REQ-DEPLOY-012 (Air-gap hardening) | --    | A.8.9     | PR.IP-1  | --         | --           | CM-6    |

### Appendix C: Integration Priority Matrix

| Integration                      | Priority | Complexity | Customer Demand |
| -------------------------------- | -------- | ---------- | --------------- |
| Azure AD / Entra ID (SSO + SCIM) | P0       | Medium     | Very High       |
| Okta (SSO + SCIM)                | P0       | Medium     | Very High       |
| Google Workspace                 | P1       | Low        | High            |
| OneLogin                         | P1       | Medium     | Medium          |
| Active Directory (on-prem sync)  | P1       | High       | High            |
| Slack notifications              | P1       | Low        | High            |
| Microsoft Teams notifications    | P1       | Medium     | High            |
| Zapier                           | P2       | Medium     | Medium          |
| Power Automate                   | P2       | Medium     | Medium          |
| Workday (HRIS)                   | P2       | High       | Medium          |
| BambooHR (HRIS)                  | P2       | Medium     | Medium          |
| SAP SuccessFactors (HRIS)        | P3       | High       | Low-Medium      |
| Splunk (SIEM)                    | P2       | Medium     | High            |
| PingFederate                     | P3       | Medium     | Low             |
| Keycloak                         | P3       | Low        | Low             |

### Appendix D: Requirement Traceability

Total requirements defined in this document: 78

| Category                     | Count | IDs                                   |
| ---------------------------- | ----- | ------------------------------------- |
| Multi-Tenancy                | 10    | REQ-MT-001 through REQ-MT-010         |
| White-Labeling               | 8     | REQ-WL-001 through REQ-WL-008         |
| Roles & Permissions          | 10    | REQ-RBAC-001 through REQ-RBAC-010     |
| Organization Structure       | 8     | REQ-ORG-001 through REQ-ORG-008       |
| Identity & Access Management | 18    | REQ-IAM-001 through REQ-IAM-018       |
| User Lifecycle Management    | 11    | REQ-ULM-001 through REQ-ULM-011       |
| Admin Dashboard              | 5     | REQ-DASH-001 through REQ-DASH-005     |
| Notification System          | 10    | REQ-NOTIF-001 through REQ-NOTIF-010   |
| API & Automation             | 12    | REQ-API-001 through REQ-API-012       |
| Data Management              | 15    | REQ-DATA-001 through REQ-DATA-015     |
| Deployment                   | 13    | REQ-DEPLOY-001 through REQ-DEPLOY-013 |
| Non-Functional               | 2     | REQ-NFR-001 through REQ-NFR-002       |

---

_End of Document_
_BRD-05: Enterprise User Management, Administration & Multi-Tenancy_
_Version 1.0 -- 2026-02-05_
