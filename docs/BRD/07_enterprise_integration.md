# 07 -- Enterprise Integration & Infrastructure Requirements

## Business Requirements Document: The DMZ Cybersecurity Awareness Training Platform

**Document Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Architecture & Engineering
**Author:** Enterprise Integration Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security Stack Integration](#2-security-stack-integration)
3. [Communication Platform Integration](#3-communication-platform-integration)
4. [HR & IT Service Management Integration](#4-hr--it-service-management-integration)
5. [Technical Architecture Requirements](#5-technical-architecture-requirements)
6. [Security Requirements for the Platform Itself](#6-security-requirements-for-the-platform-itself)
7. [API Strategy](#7-api-strategy)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Appendices](#9-appendices)

---

## 1. Executive Summary

This document specifies the enterprise integration and infrastructure requirements for The DMZ, a cybersecurity awareness training platform designed to operate at enterprise scale within regulated industries. The platform must integrate seamlessly into existing security operations centers (SOCs), human resources workflows, IT service management pipelines, and communication platforms while maintaining its own rigorous security posture.

The DMZ is not a standalone tool. It is an operational node within an organization's broader security ecosystem. Every phishing simulation launched, every training module completed, every risk score recalculated must propagate through the enterprise's existing toolchain -- feeding SIEMs, updating GRC dashboards, triggering SOAR playbooks, and syncing with identity providers. This document defines the technical contracts, protocols, data flows, and architectural patterns required to make that integration reliable, secure, and scalable.

### Guiding Principles

- **Zero-trust integration posture**: Every integration endpoint is authenticated, authorized, encrypted, and audited. No implicit trust between systems.
- **Event-driven by default**: Integrations favor asynchronous, event-driven patterns over polling. Real-time where it matters; eventual consistency where it does not.
- **API-first design**: Every feature exposed through the UI is also available through a documented, versioned API. Integrations are first-class citizens, not afterthoughts.
- **Tenant isolation**: In multi-tenant deployments, no integration configuration, credential, or data flow from one tenant is ever visible to or accessible by another.
- **Graceful degradation**: If an upstream or downstream system is unavailable, The DMZ continues to function. Events are queued and delivered when connectivity resumes. No silent data loss.

---

## 2. Security Stack Integration

### 2.1 SIEM Integration

The platform must export structured security event data to all major SIEM platforms in real time. SIEM integration is the primary mechanism by which The DMZ's operational data becomes part of an organization's unified threat picture.

#### 2.1.1 Splunk

**Integration Method:** HTTP Event Collector (HEC) + REST API

| Requirement        | Specification                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Protocol**       | HTTPS POST to Splunk HEC endpoint                                                                                         |
| **Authentication** | HEC token (per-index, per-sourcetype), stored encrypted in platform vault                                                 |
| **Data Format**    | JSON, conforming to Splunk Common Information Model (CIM)                                                                 |
| **Sourcetype**     | `thedmz:training:events`, `thedmz:phishing:campaigns`, `thedmz:risk:scores`, `thedmz:auth:events`                         |
| **Index Strategy** | Customer-configurable target index; default recommendation is a dedicated `security_awareness` index                      |
| **Batching**       | Events batched in 5-second windows or 100-event batches (whichever threshold is reached first) to optimize HEC throughput |
| **Retry Logic**    | Exponential backoff with jitter; maximum 5 retries over 10 minutes; dead-letter queue for persistent failures             |
| **TLS**            | TLS 1.2+ required; certificate pinning optional; customer-provided CA bundle supported                                    |
| **Throughput**     | Sustained 10,000 events/second per tenant; burst to 50,000 events/second during large campaign launches                   |

**Event Categories Exported:**

- **Phishing Simulation Events**: Campaign launch, email delivered, email opened, link clicked, credential submitted, attachment opened, report button used
- **Training Events**: Module assigned, module started, module completed, assessment passed/failed, compliance deadline approaching, compliance deadline missed
- **Risk Score Changes**: User risk score recalculated, department risk score aggregated, organization risk trend changed
- **Administrative Events**: Campaign created/modified/deleted, user provisioned/deprovisioned, integration configured, policy changed
- **Authentication Events**: Login success, login failure, MFA challenge issued, MFA challenge passed/failed, session created, session terminated

**Splunk App/Add-on:**

The platform must provide a certified Splunk App (available on Splunkbase) that includes:

- Pre-built dashboards for phishing simulation metrics, training compliance, and risk trends
- Saved searches and alerts for common use cases (e.g., "user clicked phishing link 3+ times in 30 days")
- CIM-compliant field mappings
- Adaptive response actions (e.g., "enroll user in remedial training" triggered from Splunk ES)
- Lookup tables for risk score enrichment

#### 2.1.2 IBM QRadar

**Integration Method:** Syslog (CEF/LEEF) + QRadar REST API

| Requirement                   | Specification                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Protocol**                  | Syslog over TLS (TCP/6514) or HTTPS REST API                                                                                                                    |
| **Data Format**               | Log Event Extended Format (LEEF) 2.0 for native QRadar parsing; Common Event Format (CEF) as fallback                                                           |
| **Log Source Type**           | Custom DSM (Device Support Module) provided as installable extension                                                                                            |
| **QID Mapping**               | Pre-defined QRadar Event IDs for all platform event types                                                                                                       |
| **Offense Correlation**       | Events tagged with custom properties enabling QRadar offense rules (e.g., "high-risk user clicked simulated phish AND accessed sensitive system within 1 hour") |
| **Reference Set Integration** | API-driven updates to QRadar reference sets (e.g., "users currently in remedial training", "departments below compliance threshold")                            |
| **Magnitude Contribution**    | Risk scores mapped to QRadar's magnitude calculation for offense prioritization                                                                                 |

**Custom DSM Requirements:**

- Automatic parsing of all event fields without manual regex configuration
- Property extraction for: `user_email`, `campaign_id`, `event_type`, `risk_score`, `department`, `timestamp`, `source_ip`, `training_module_id`
- Pre-built rules for common correlation scenarios
- Installable via QRadar Extensions Management

#### 2.1.3 Microsoft Sentinel

**Integration Method:** Azure Monitor Data Collector API + Logic Apps + Native Connector

| Requirement              | Specification                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Protocol**             | HTTPS POST to Azure Monitor HTTP Data Collector API (Log Analytics workspace)                                                       |
| **Authentication**       | Workspace ID + shared key, or Azure AD service principal with Log Analytics Contributor role                                        |
| **Data Format**          | JSON conforming to Azure Sentinel schema conventions                                                                                |
| **Custom Tables**        | `TheDMZ_PhishingEvents_CL`, `TheDMZ_TrainingEvents_CL`, `TheDMZ_RiskScores_CL`, `TheDMZ_AuditLog_CL`                                |
| **Workbook**             | Pre-built Sentinel workbook with KQL queries for phishing analytics, training compliance heat maps, and user risk timelines         |
| **Analytics Rules**      | Template analytics rules for: repeated phishing failures, training non-compliance, risk score spikes, anomalous login patterns      |
| **Hunting Queries**      | Library of KQL hunting queries for proactive threat hunting related to human risk                                                   |
| **Playbook Integration** | Logic App connectors for automated response (detailed in SOAR section below)                                                        |
| **Data Connector**       | Native Sentinel data connector, deployable from Sentinel Content Hub                                                                |
| **Cost Optimization**    | Configurable event filtering to control Log Analytics ingestion costs; support for Basic Logs tier for high-volume/low-query tables |

#### 2.1.4 Elastic Security (ELK Stack)

**Integration Method:** Elasticsearch REST API + Logstash Pipeline + Elastic Agent Integration

| Requirement           | Specification                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Protocol**          | HTTPS to Elasticsearch Bulk API or Logstash HTTP input                                                                     |
| **Authentication**    | API key or Elasticsearch native credentials; Elastic Cloud API key supported                                               |
| **Data Format**       | JSON conforming to Elastic Common Schema (ECS)                                                                             |
| **Index Pattern**     | `thedmz-phishing-*`, `thedmz-training-*`, `thedmz-risk-*`, `thedmz-audit-*` with ILM (Index Lifecycle Management) policies |
| **ILM Policy**        | Hot (7 days) -> Warm (30 days) -> Cold (90 days) -> Delete (365 days), customer-configurable                               |
| **Kibana Dashboards** | Pre-built dashboards and visualizations importable via Kibana Saved Objects API                                            |
| **Detection Rules**   | SIEM detection rules in Elastic's rule format for anomaly detection on training and phishing data                          |
| **Fleet Integration** | Custom Elastic Agent integration package for pull-based data collection where push is not feasible                         |
| **Transforms**        | Pre-configured Elasticsearch transforms for aggregating user risk scores and department-level compliance metrics           |

#### 2.1.5 Universal SIEM Requirements

Regardless of specific SIEM platform:

- **CEF/LEEF/Syslog Fallback**: For any SIEM not explicitly supported, the platform must offer generic syslog output in CEF format over TLS, configurable to any syslog receiver endpoint.
- **Webhook Output**: Generic HTTPS webhook output with configurable payload templates (JSON, XML), headers, and authentication (API key, Bearer token, Basic auth, HMAC signature).
- **Event Filtering**: Per-integration event type filtering so customers export only the event categories relevant to their use case.
- **Event Enrichment**: Events include contextual fields (department, location, manager, job title) sourced from HR integrations, reducing the need for downstream enrichment lookups.
- **Timestamp Standardization**: All timestamps in ISO 8601 format with UTC timezone. Original event timestamp and transmission timestamp both included.
- **Deduplication**: Each event carries a globally unique `event_id` (UUIDv7) to support downstream deduplication.
- **Schema Registry**: Published JSON Schema and Avro schema for all event types, versioned alongside the API.

---

### 2.2 SOAR Integration

SOAR integration enables automated response to human risk indicators. When The DMZ detects a pattern (e.g., a user repeatedly fails phishing simulations), the SOAR platform can orchestrate a cross-system response without manual intervention.

#### 2.2.1 Palo Alto Cortex XSOAR

**Integration Method:** XSOAR Integration Pack + REST API + Generic Webhook

| Requirement              | Specification                                                                                                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Integration Pack**     | Certified content pack published to XSOAR Marketplace                                                                                                                                                                                                    |
| **Authentication**       | API key with configurable RBAC scopes; support for XSOAR credential store                                                                                                                                                                                |
| **Incident Creation**    | Platform events (configurable) trigger XSOAR incidents via webhook or API push                                                                                                                                                                           |
| **Incident Types**       | Custom incident types: `TheDMZ - Phishing Failure`, `TheDMZ - Training Non-Compliance`, `TheDMZ - Risk Score Alert`, `TheDMZ - Suspicious Report`                                                                                                        |
| **Indicator Enrichment** | XSOAR can query The DMZ API to enrich indicators with user risk profile, training history, phishing simulation history                                                                                                                                   |
| **Commands Exposed**     | `thedmz-get-user-risk`, `thedmz-get-training-status`, `thedmz-enroll-training`, `thedmz-get-campaign-results`, `thedmz-update-user-group`, `thedmz-get-phishing-history`                                                                                 |
| **Playbook Templates**   | Pre-built playbooks for: (1) Auto-enroll repeat phishing failures in remedial training, (2) Escalate high-risk users to security team, (3) Correlate phishing simulation failure with real phishing incident, (4) Automate training compliance reminders |
| **Bidirectional Sync**   | XSOAR incident status changes reflected in The DMZ (e.g., "security team reviewed" status on user risk record)                                                                                                                                           |
| **War Room Integration** | Commands output formatted for XSOAR War Room display (Markdown tables, context data)                                                                                                                                                                     |

#### 2.2.2 Swimlane

**Integration Method:** Swimlane Plugin + REST API

| Requirement             | Specification                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Plugin**              | Swimlane Turbine connector published to Swimlane marketplace                                                                      |
| **Authentication**      | OAuth 2.0 client credentials or API key                                                                                           |
| **Actions**             | Retrieve user risk data, enroll users in training, fetch campaign results, update user metadata, create/modify phishing campaigns |
| **Triggers**            | Webhook receiver in Swimlane triggers workflows on The DMZ events                                                                 |
| **Record Mapping**      | Pre-configured field mappings between The DMZ event schema and Swimlane record types                                              |
| **Playbook Components** | Reusable playbook components for common awareness training automation scenarios                                                   |

#### 2.2.3 Generic SOAR Requirements

- **Webhook Trigger**: All SOAR integrations fundamentally rely on The DMZ's ability to send authenticated HTTPS webhooks with configurable payloads to arbitrary endpoints.
- **Bidirectional API**: SOAR platforms must be able to both receive events from The DMZ (webhook push) and query The DMZ (REST API pull).
- **Idempotency**: All API operations exposed to SOAR platforms must be idempotent. Playbooks may retry operations, and duplicate execution must not cause data corruption.
- **Rate Limit Awareness**: API responses include `X-RateLimit-Remaining` and `Retry-After` headers so SOAR platforms can implement backoff automatically.

---

### 2.3 Email Security Gateway Integration

Email security gateways are critical integration points because The DMZ's phishing simulations must bypass these gateways (allowlisting) while simultaneously consuming threat intelligence from them.

#### 2.3.1 Proofpoint

**Integration Method:** Proofpoint TAP API + Email Relay Configuration

| Requirement                  | Specification                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Allowlisting**             | IP allowlisting of The DMZ's sending infrastructure in Proofpoint's email gateway; documented procedure for customers                                    |
| **TAP API Integration**      | Consume Proofpoint Targeted Attack Protection (TAP) API data: clicks permitted, clicks blocked, messages delivered, threats identified                   |
| **SIEM API Correlation**     | Correlate Proofpoint real-world threat data with The DMZ simulation data to identify users who are both targeted by real attacks AND failing simulations |
| **SecurityCoach**            | Integration with Proofpoint SecurityCoach for real-time coaching triggers based on actual user email behavior                                            |
| **Threat Intelligence Feed** | Ingest Proofpoint threat intelligence to inform simulation template design (e.g., simulate attack patterns currently active in the wild)                 |
| **Header Injection**         | Custom `X-TheDMZ-SimulationID` header on all simulation emails for gateway identification and policy bypass                                              |
| **SPF/DKIM/DMARC**           | Full SPF, DKIM, and DMARC alignment for simulation emails; customer-specific DKIM signing with delegated subdomain                                       |

#### 2.3.2 Mimecast

**Integration Method:** Mimecast API 2.0 + Email Relay Configuration

| Requirement                 | Specification                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Allowlisting**            | Managed sender policy configuration via Mimecast API or documented manual procedure                                              |
| **Threat Feed**             | Consume Mimecast threat intelligence (Threat Remediation API) for simulation template enrichment                                 |
| **URL Rewriting**           | Configuration guidance for Mimecast URL rewriting bypass for simulation tracking links                                           |
| **Attachment Protection**   | Bypass configuration for simulation attachment payloads                                                                          |
| **Awareness Training Sync** | If customer uses both Mimecast Awareness Training and The DMZ, synchronization of completion data to avoid duplicate assignments |
| **Journal Stream**          | Optional consumption of Mimecast journal stream for email behavior analytics                                                     |

#### 2.3.3 Microsoft Defender for Office 365

**Integration Method:** Microsoft Graph API + Exchange Online PowerShell + Advanced Delivery Policy

| Requirement                                | Specification                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Advanced Delivery**                      | Configuration via Microsoft 365 Advanced Delivery policy for third-party phishing simulation recognition; The DMZ's sending IPs and simulation URL domains registered |
| **Graph API**                              | Microsoft Graph Security API for retrieving threat intelligence, safe links status, and user risk signals                                                             |
| **Safe Links Bypass**                      | Simulation tracking URLs excluded from Safe Links rewriting via Advanced Delivery policy                                                                              |
| **Safe Attachments Bypass**                | Simulation attachments excluded from Safe Attachments detonation via Advanced Delivery policy                                                                         |
| **Threat Explorer**                        | Documented correlation between The DMZ simulation data and Defender Threat Explorer data                                                                              |
| **Attack Simulation Training Coexistence** | If customer also uses Microsoft's native Attack Simulation Training, deduplication logic and unified reporting                                                        |

#### 2.3.4 Universal Email Gateway Requirements

- **IP Allowlist Documentation**: Maintain a published, up-to-date list of The DMZ's sending IP ranges (both IPv4 and IPv6) for customer allowlisting across any email gateway.
- **Dedicated Sending Infrastructure**: Per-customer dedicated IP addresses available for enterprise tier; shared IP pools for standard tier with strict reputation management.
- **Email Authentication**: Full SPF, DKIM (2048-bit RSA minimum), and DMARC support. Customer DKIM signing supported via DNS delegation (e.g., `sim._domainkey.customer.com CNAME thedmz-selector.dkim.thedmz.io`).
- **Delivery Monitoring**: Real-time delivery monitoring dashboard showing: sent, delivered, bounced, deferred, spam-filtered, and gateway-blocked counts per campaign.
- **Feedback Loops**: Integration with ISP and gateway feedback loops (ARF format) to detect and respond to abuse complaints about simulation emails.

---

### 2.4 Endpoint Protection Platform Integration

| Requirement                         | Specification                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **CrowdStrike Falcon**              | REST API integration to correlate endpoint incidents with user risk scores; enrich endpoint alerts with user's training/phishing history |
| **Microsoft Defender for Endpoint** | Graph Security API integration; correlate endpoint risk score with The DMZ human risk score                                              |
| **SentinelOne**                     | REST API integration for bidirectional risk signal exchange                                                                              |
| **Carbon Black (VMware)**           | API integration for endpoint incident correlation                                                                                        |
| **Generic EDR**                     | Webhook-based event exchange for unsupported endpoint platforms                                                                          |

**Correlation Use Cases:**

1. User who failed phishing simulation subsequently triggered an endpoint alert -> escalated risk score and automated incident
2. Endpoint detection of credential harvesting tool on user's machine -> automatically assign targeted anti-phishing training
3. User's machine flagged for policy violation -> correlate with security awareness training completion status

---

### 2.5 Identity Provider Integration

Identity provider integration serves two purposes: (1) single sign-on for platform access, and (2) directory synchronization for user lifecycle management.

#### 2.5.1 Okta

| Requirement           | Specification                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SSO**               | SAML 2.0 and OIDC (OpenID Connect) for single sign-on; published in Okta Integration Network (OIN)                                                   |
| **SCIM 2.0**          | Full SCIM 2.0 provisioning: Create, Read, Update, Deactivate users; Group push for department/role mapping                                           |
| **SCIM Endpoints**    | `/Users`, `/Groups`, `/Schemas`, `/ServiceProviderConfig`, `/ResourceTypes`                                                                          |
| **Attribute Mapping** | Configurable attribute mapping: `userName`, `displayName`, `emails`, `department`, `title`, `manager`, `active`, `groups`, custom attributes         |
| **JIT Provisioning**  | Just-in-time provisioning on first SSO login as alternative to SCIM for simpler deployments                                                          |
| **Lifecycle Events**  | User deactivation in Okta triggers deprovisioning in The DMZ (training assignments paused, excluded from active campaigns, data retained per policy) |
| **MFA Context**       | Consume Okta's authentication context (AMR claims) to enforce MFA for administrative actions                                                         |
| **Okta Workflows**    | Pre-built Okta Workflows connector for custom automation (e.g., "when user changes department, reassign training plan")                              |

#### 2.5.2 Microsoft Entra ID (Azure AD)

| Requirement                        | Specification                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **SSO**                            | SAML 2.0 and OIDC; published as Enterprise Application in Microsoft Entra Gallery                                      |
| **SCIM 2.0**                       | Full SCIM provisioning via Entra ID automatic provisioning engine                                                      |
| **Conditional Access**             | Support for Entra Conditional Access signals; platform can act as a Conditional Access authentication context provider |
| **Graph API**                      | Microsoft Graph API integration for directory queries, group membership, organizational hierarchy                      |
| **Nested Groups**                  | Support for Entra ID nested group resolution for hierarchical department/role targeting                                |
| **B2B/B2C**                        | Support for Entra B2B guest users (external contractors) and B2C scenarios (partner training programs)                 |
| **Privileged Identity Management** | Integration awareness: users with active PIM roles may receive elevated training requirements                          |

#### 2.5.3 Ping Identity

| Requirement         | Specification                                                               |
| ------------------- | --------------------------------------------------------------------------- |
| **SSO**             | SAML 2.0 and OIDC via PingFederate or PingOne                               |
| **SCIM 2.0**        | SCIM provisioning via PingOne Directory or PingFederate provisioning engine |
| **PingOne DaVinci** | Pre-built DaVinci connector for orchestration workflows                     |
| **MFA Integration** | PingID MFA context consumption for adaptive access control                  |

#### 2.5.4 Universal IdP Requirements

- **SAML 2.0**: SP-initiated and IdP-initiated SSO; signed assertions required; encrypted assertions supported; configurable NameID format (email, persistent, transient).
- **OIDC/OAuth 2.0**: Authorization Code flow with PKCE; support for `openid`, `profile`, `email`, `groups` scopes; token introspection endpoint; refresh token rotation.
- **SCIM 2.0**: Full compliance with RFC 7643 (Core Schema) and RFC 7644 (Protocol); support for bulk operations; pagination; filtering (`filter=userName eq "john@example.com"`); ETags for conflict resolution.
- **Directory Sync Scheduling**: Configurable sync frequency (minimum: every 15 minutes; maximum: real-time via SCIM push). Full sync and incremental (delta) sync supported.
- **Conflict Resolution**: When the same user exists in multiple IdPs (e.g., during M&A), the platform supports configurable identity linking rules based on email, employee ID, or custom attribute.
- **Session Management**: Platform sessions honor IdP session lifetime; back-channel logout (OIDC) and Single Logout (SAML SLO) supported.

---

### 2.6 GRC Platform Integration

GRC integration ensures that human risk data flows into governance, risk, and compliance workflows.

#### 2.6.1 ServiceNow GRC

**Integration Method:** ServiceNow REST API + IntegrationHub

| Requirement           | Specification                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Register**     | Push human risk scores into ServiceNow Risk Register as risk indicators                                                                                                  |
| **Control Testing**   | Training completion rates mapped to ServiceNow control test results (e.g., "Security Awareness Training Control" auto-passes when >95% of department completes training) |
| **Policy Management** | Sync policy acknowledgment status between The DMZ (where users complete training on the policy) and ServiceNow GRC (where the policy is managed)                         |
| **Audit Evidence**    | Automated export of training completion reports, phishing simulation results, and risk score trends as audit evidence artifacts                                          |
| **Compliance Tasks**  | Training compliance deadlines create ServiceNow GRC compliance tasks; completion closes the task                                                                         |
| **CMDB Enrichment**   | User records in ServiceNow CMDB enriched with security awareness risk score                                                                                              |
| **Scoped App**        | Certified ServiceNow Scoped Application available in ServiceNow Store                                                                                                    |

#### 2.6.2 RSA Archer

**Integration Method:** RSA Archer REST API + Data Feed

| Requirement                | Specification                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Data Feed**              | Scheduled and on-demand data feeds pushing training metrics and risk scores into Archer        |
| **Application Mapping**    | Pre-built field mappings for Archer's Security Awareness Management application                |
| **Risk Quantification**    | Human risk scores integrated into Archer's quantitative risk analysis models                   |
| **Assessment Integration** | The DMZ assessment results (knowledge checks, simulations) mapped to Archer assessment records |
| **Incident Correlation**   | Archer security incident records enriched with involved user's training and simulation history |
| **Reporting**              | Archer reports and dashboards can query The DMZ data via API for real-time compliance views    |

#### 2.6.3 OneTrust

**Integration Method:** OneTrust REST API + Webhook

| Requirement                 | Specification                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Training Management**     | Sync training assignments and completions with OneTrust's training management module                                   |
| **Privacy Training**        | Special integration for privacy-specific training content linked to OneTrust's privacy program management              |
| **Risk Assessment**         | Human risk data contributes to OneTrust's organizational risk assessments                                              |
| **Vendor Risk**             | For third-party training scenarios, data feeds into OneTrust's vendor risk management module                           |
| **Regulatory Intelligence** | Consume OneTrust's regulatory intelligence to trigger training when new regulations require updated employee awareness |

#### 2.6.4 Universal GRC Requirements

- **Compliance Framework Mapping**: Training modules and campaigns mapped to compliance framework controls (NIST CSF, ISO 27001, CIS Controls, PCI DSS, HIPAA, GDPR, SOX).
- **Evidence Export**: On-demand and scheduled export of audit evidence in standard formats (PDF reports, CSV data, JSON API).
- **Risk Score API**: RESTful API endpoint returning current risk scores at user, department, business unit, and organization level, with historical trend data.
- **Custom Fields**: GRC integrations support customer-defined custom field mappings to accommodate unique GRC platform configurations.

---

## 3. Communication Platform Integration

### 3.1 Microsoft Teams

#### 3.1.1 Teams Bot

| Requirement               | Specification                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Bot Framework**         | Built on Microsoft Bot Framework SDK v4; registered as a multi-tenant Azure Bot                                              |
| **Capabilities**          | Personal chat, group chat, channel messaging, adaptive cards, task modules                                                   |
| **App Manifest**          | Published to Microsoft Teams App Store (or available for sideloading/org-wide deployment via Teams Admin Center)             |
| **Authentication**        | SSO via Teams SSO token exchange (OAuth 2.0 On-Behalf-Of flow)                                                               |
| **Graph API Permissions** | Minimal required permissions: `User.Read`, `TeamsActivity.Send`, `ChannelMessage.Send` (application-level for notifications) |

**Bot Interactions:**

| Interaction                | Description                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Training Reminders**     | Proactive notifications to users with upcoming or overdue training assignments                                    |
| **Phishing Report**        | Users can forward suspicious emails to the bot for analysis (simulated or real); bot responds with classification |
| **Quick Training**         | Micro-learning modules delivered as adaptive cards directly within Teams                                          |
| **Risk Dashboard**         | Managers can query their team's risk posture via conversational commands or a tab                                 |
| **Campaign Notifications** | Security team receives real-time notifications in a dedicated channel when campaign thresholds are triggered      |
| **Leaderboard**            | Gamification leaderboard displayed as an adaptive card on request                                                 |

#### 3.1.2 Teams Tabs

| Requirement           | Specification                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Personal Tab**      | User dashboard showing: assigned training, completion status, personal risk score, phishing simulation history |
| **Channel Tab**       | Team/department dashboard showing: aggregate compliance, team risk trends, upcoming deadlines                  |
| **Configuration Tab** | Admin tab for managing integration settings without leaving Teams                                              |
| **SSO**               | Seamless authentication via Teams SSO; no separate login required                                              |
| **Responsive**        | Adaptive layout for Teams desktop, web, and mobile clients                                                     |
| **Deep Linking**      | Support for Teams deep links to specific training modules or dashboard views                                   |

#### 3.1.3 Teams Notifications

| Requirement              | Specification                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Activity Feed**        | Push notifications to user activity feed for training assignments and reminders                                                                       |
| **Adaptive Cards**       | Rich interactive cards with action buttons (e.g., "Start Training", "Snooze Reminder", "View Details")                                                |
| **Webhooks (Workflows)** | Outgoing webhooks via Power Automate Workflows for custom notification routing to Teams channels                                                      |
| **Rate Limiting**        | Respect Microsoft Graph API rate limits; implement per-user notification throttling (maximum 2 notifications per user per day for non-critical items) |
| **Quiet Hours**          | Configurable quiet hours aligned with user's timezone; notifications queued outside working hours                                                     |

#### 3.1.4 Teams Meeting Integration

| Requirement       | Specification                                                           |
| ----------------- | ----------------------------------------------------------------------- |
| **Meeting App**   | In-meeting app for live security training sessions and quizzes          |
| **Together Mode** | Custom Together Mode scenes for security training events (stretch goal) |
| **Meeting Recap** | Post-meeting summary with training completion status for attendees      |

---

### 3.2 Slack

#### 3.2.1 Slack Bot

| Requirement             | Specification                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| **Platform**            | Slack API (Events API + Web API + Bolt SDK)                                                            |
| **Distribution**        | Published to Slack App Directory; also available for enterprise grid org-wide deployment               |
| **OAuth Scopes**        | `chat:write`, `commands`, `im:write`, `users:read`, `users:read.email`, `channels:read`, `groups:read` |
| **Event Subscriptions** | Subscribed events: `app_mention`, `message.im`, `team_join`, `member_joined_channel`                   |
| **Authentication**      | OAuth 2.0 V2 with granular bot and user token scopes; PKCE for user authorization                      |
| **Enterprise Grid**     | Org-level app installation for Enterprise Grid customers; cross-workspace functionality                |

**Bot Interactions:**

| Interaction            | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Training Reminders** | Direct messages with interactive blocks (buttons, menus) for training assignments                    |
| **Phishing Report**    | Slack message shortcut ("Report as Phishing") that forwards message metadata to The DMZ for analysis |
| **Security Tips**      | Scheduled "Security Tip of the Day" posts in designated channels with engagement reactions           |
| **Quick Quiz**         | Interactive Block Kit quizzes delivered in DM; results feed into user's training profile             |
| **Status Updates**     | Campaign status updates posted to security team channel                                              |
| **Help Command**       | `/thedmz help` returns available commands and current user status                                    |

#### 3.2.2 Slack Slash Commands

| Command                             | Description                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `/thedmz status`                    | Returns user's current training status, risk score, and upcoming assignments |
| `/thedmz leaderboard`               | Displays department or organization leaderboard                              |
| `/thedmz report [message-link]`     | Reports a message as suspicious; bot analyzes and responds                   |
| `/thedmz train`                     | Launches next assigned micro-training module inline                          |
| `/thedmz risk [user\|team]`         | (Manager/Admin) Returns risk summary for specified user or team              |
| `/thedmz campaign [status\|create]` | (Admin) Campaign management shortcuts                                        |
| `/thedmz settings`                  | Opens app home settings panel                                                |

#### 3.2.3 Slack Notifications

| Requirement                  | Specification                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Block Kit**                | All notifications use Slack Block Kit for rich, interactive formatting                      |
| **Scheduling**               | Scheduled messages for timezone-appropriate delivery                                        |
| **Unfurling**                | Link unfurling for The DMZ URLs shared in Slack (training modules, dashboards)              |
| **Notification Preferences** | User-configurable notification preferences via App Home                                     |
| **Escalation**               | Configurable escalation: DM -> channel mention -> manager notification for overdue training |
| **Rate Limiting**            | Respect Slack API rate limits (tier-based); implement internal queuing and rate smoothing   |

#### 3.2.4 Slack App Home

| Requirement       | Specification                                                                   |
| ----------------- | ------------------------------------------------------------------------------- |
| **Dashboard**     | Personal training dashboard in App Home tab                                     |
| **Settings**      | Notification preferences, timezone, language                                    |
| **Quick Actions** | Buttons for common actions (start training, view risk score, check leaderboard) |
| **Admin View**    | Administrative controls for security team members                               |

---

### 3.3 Email Integration

#### 3.3.1 SMTP/Sending Infrastructure

| Requirement               | Specification                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Sending Architecture**  | Dedicated MTA infrastructure with per-customer IP isolation (enterprise tier)                              |
| **Protocols**             | SMTP with STARTTLS, SMTPS (implicit TLS), HTTPS API                                                        |
| **Authentication**        | SPF, DKIM (2048-bit RSA or Ed25519), DMARC alignment                                                       |
| **IP Warm-up**            | Automated IP warm-up schedule for new dedicated IPs                                                        |
| **Reputation Monitoring** | Real-time sender reputation monitoring across major ISPs and enterprise gateways                           |
| **Bounce Handling**       | Automated hard/soft bounce processing; hard bounces suppress future sends; soft bounces retry with backoff |
| **Feedback Loop**         | ARF-format feedback loop processing; complaint-based suppression                                           |
| **Throughput**            | 1 million emails/hour sustained; 5 million emails/hour burst for large campaign launches                   |
| **Deliverability SLA**    | 99%+ inbox delivery rate for properly configured customers                                                 |

#### 3.3.2 Microsoft Exchange / Exchange Online

| Requirement             | Specification                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Graph API**           | Microsoft Graph Mail API for sending via customer's own Exchange infrastructure (delegated or application permissions) |
| **Transport Rules**     | Documentation and automation scripts for Exchange transport rule configuration (simulation bypass)                     |
| **Journal Rules**       | Optional: consume Exchange journal stream for email behavior analytics                                                 |
| **Distribution Groups** | Resolve Exchange distribution groups and Microsoft 365 groups for campaign targeting                                   |
| **Shared Mailboxes**    | Support for shared mailbox as "phishing report" destination                                                            |

#### 3.3.3 Google Workspace

| Requirement       | Specification                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Gmail API**     | Google Workspace Gmail API for sending via customer's domain (service account with domain-wide delegation) |
| **Google Groups** | Resolve Google Groups membership for campaign targeting                                                    |
| **Admin SDK**     | Google Workspace Admin SDK for user directory synchronization                                              |
| **Routing Rules** | Documentation for Google Workspace routing rules to bypass spam filters for simulations                    |
| **Google Chat**   | Optional: Google Chat bot integration (cards, notifications) mirroring Slack/Teams capabilities            |

#### 3.3.4 Phishing Report Button

| Requirement               | Specification                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Outlook Add-in**        | Microsoft Outlook add-in (web, desktop, mobile) for one-click phishing reporting                                                                                                                                         |
| **Gmail Add-on**          | Google Workspace Gmail add-on for one-click phishing reporting                                                                                                                                                           |
| **Thunderbird Extension** | Mozilla Thunderbird extension for phishing reporting                                                                                                                                                                     |
| **Report Processing**     | Reported emails analyzed for: (1) Is this a known simulation? Provide positive reinforcement. (2) Is this a real threat? Forward to security team and/or email gateway for remediation. (3) Is this benign? Inform user. |
| **Feedback Loop**         | User receives immediate feedback on report (simulation identified, forwarded to security, benign)                                                                                                                        |
| **Metrics**               | Report button usage tracked as a positive security behavior metric, contributing to risk score reduction                                                                                                                 |

---

## 4. HR & IT Service Management Integration

### 4.1 HRIS Integration

HRIS integration is the authoritative source for organizational structure, employee lifecycle events, and demographic data used for training targeting, campaign segmentation, and compliance reporting.

#### 4.1.1 Workday

**Integration Method:** Workday REST API + Workday Report-as-a-Service (RaaS) + SCIM

| Requirement                      | Specification                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API Version**                  | Workday REST API v1 (WQL) and SOAP API (for legacy endpoints)                                                                                                            |
| **Authentication**               | OAuth 2.0 (Authorization Code or Client Credentials) via Workday API Client registration                                                                                 |
| **Data Sync**                    | Bidirectional: Pull employee data from Workday; push training completion data back to Workday's Learning module                                                          |
| **Worker Data**                  | Sync: employee ID, name, email, department, cost center, location, manager, hire date, termination date, job title, job family, worker type (employee/contractor/intern) |
| **Organizational Data**          | Sync: supervisory org hierarchy, cost center hierarchy, company hierarchy, location hierarchy                                                                            |
| **Lifecycle Events**             | Real-time or near-real-time event consumption: new hire, termination, transfer, promotion, leave of absence, return from leave                                           |
| **Training Records**             | Push training completions into Workday Learning as external learning content completions                                                                                 |
| **Custom Reports**               | Consume Workday custom reports (RaaS) for complex organizational queries                                                                                                 |
| **Business Process Integration** | Trigger Workday business processes (e.g., "security training required" task in onboarding checklist)                                                                     |
| **Calculated Fields**            | Map Workday calculated fields for derived attributes (e.g., "months in role", "geographic region")                                                                       |

**Workday-Specific Automation Workflows:**

1. **Onboarding**: New hire event -> The DMZ creates user -> assigns onboarding training plan -> tracks completion -> reports back to Workday onboarding checklist
2. **Role Change**: Transfer/promotion event -> The DMZ evaluates new role's training requirements -> assigns delta training modules
3. **Offboarding**: Termination event -> The DMZ deactivates user -> removes from active campaigns -> archives data per retention policy
4. **Leave Management**: Leave of absence -> pause training deadlines -> return from leave -> resume with adjusted deadlines

#### 4.1.2 BambooHR

**Integration Method:** BambooHR REST API

| Requirement           | Specification                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- |
| **API Version**       | BambooHR API v1                                                                     |
| **Authentication**    | API key (per-account)                                                               |
| **Data Sync**         | Pull: employee directory, department structure, job information, employment status  |
| **Webhook Events**    | BambooHR webhook events for employee changes (new hire, termination, field changes) |
| **Custom Fields**     | Support for BambooHR custom fields mapped to The DMZ user attributes                |
| **Employee Reports**  | Consume BambooHR custom reports for bulk data operations                            |
| **Training Tracking** | Push training completion data to BambooHR custom tables or fields                   |

#### 4.1.3 ADP

**Integration Method:** ADP Marketplace API + ADP Data Cloud

| Requirement             | Specification                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Platform Support**    | ADP Workforce Now, ADP Vantage HCM, ADP TotalSource, ADP Run                                      |
| **ADP Marketplace**     | Published integration on ADP Marketplace for customer discovery and consent-based data sharing    |
| **Authentication**      | ADP OAuth 2.0 (authorization code with consent)                                                   |
| **Data Sync**           | Worker demographics, organizational assignment, worker status, pay group (for location mapping)   |
| **Event Notifications** | ADP event notification subscriptions: worker.hire, worker.terminate, worker.rehire, worker.change |
| **Data Mapping**        | ADP-specific code set mapping (e.g., ADP department codes to The DMZ department taxonomy)         |

#### 4.1.4 Universal HRIS Requirements

- **Unified HRIS API**: For HRIS platforms not explicitly supported, the platform must offer integration via unified HRIS API providers (e.g., Merge.dev, Finch, Knit) covering 50+ HRIS platforms through a single integration.
- **CSV/SFTP Import**: For organizations without API-capable HRIS, support scheduled CSV file import via SFTP (PGP-encrypted) with configurable column mapping and validation rules.
- **Manual Upload**: Web UI for manual CSV upload with preview, validation, error reporting, and rollback capability.
- **Data Reconciliation**: Periodic full reconciliation between HRIS and The DMZ user database; discrepancy reports generated for admin review.
- **Attribute Mapping Engine**: Visual, no-code attribute mapping interface allowing administrators to map any HRIS field to any DMZ user attribute.
- **Transformation Rules**: Support for data transformation during sync (e.g., "if HRIS department = 'ENG-01', map to DMZ department = 'Engineering'").
- **Sync Monitoring**: Dashboard showing sync status, last sync time, records created/updated/deactivated/errors, with alerting on sync failures.

---

### 4.2 ITSM Integration

#### 4.2.1 ServiceNow ITSM

**Integration Method:** ServiceNow REST API (Table API + Import Set API) + IntegrationHub + Flow Designer

| Requirement           | Specification                                                                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incident Creation** | Automatically create ServiceNow incidents when: (a) user reports a real phishing email via report button, (b) risk score threshold breach triggers investigation, (c) campaign anomaly detected |
| **Incident Template** | Pre-configured incident templates with auto-populated fields: category, subcategory, assignment group, priority, description, affected user, related CI                                         |
| **CMDB Integration**  | Link incidents to CMDB CIs (user record, department, business service)                                                                                                                          |
| **Knowledge Base**    | Sync training content metadata into ServiceNow Knowledge Base for self-service                                                                                                                  |
| **Service Catalog**   | ServiceNow catalog item for "Request Security Training" with workflow approval                                                                                                                  |
| **Change Management** | Campaign launches optionally create change requests for change advisory board awareness                                                                                                         |
| **SLA Tracking**      | Training compliance SLAs tracked as ServiceNow SLA records                                                                                                                                      |
| **Flow Designer**     | Pre-built Flow Designer actions: "Get User Risk Score", "Enroll User in Training", "Get Campaign Status"                                                                                        |
| **Scoped App**        | Certified ServiceNow Scoped Application                                                                                                                                                         |

#### 4.2.2 Jira Service Management

**Integration Method:** Atlassian REST API + Jira Automation + Forge/Connect App

| Requirement                | Specification                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Issue Creation**         | Automatically create Jira issues for phishing reports, risk escalations, and compliance violations                              |
| **Project Configuration**  | Dedicated Jira project template for security awareness management with pre-configured issue types, workflows, and custom fields |
| **Issue Types**            | `Phishing Report`, `Risk Escalation`, `Training Non-Compliance`, `Simulation Anomaly`                                           |
| **Custom Fields**          | `Risk Score`, `User Department`, `Campaign ID`, `Training Module`, `Simulation Result`                                          |
| **Workflow**               | Pre-built workflow: New -> Triaged -> Investigating -> Resolved (with configurable sub-statuses)                                |
| **Automation Rules**       | Jira Automation rules: auto-assign based on department, auto-transition on DMZ API callback, SLA breach escalation              |
| **Confluence Integration** | Training content cross-referenced with Confluence knowledge base articles                                                       |
| **Forge App**              | Atlassian Forge app for deep integration within Jira UI (custom panels, glances)                                                |
| **Jira Assets**            | Integration with Jira Assets (formerly Insight) for CMDB correlation                                                            |

#### 4.2.3 Ticketing System Universal Requirements

- **Bidirectional Status Sync**: Ticket status changes in ITSM reflected in The DMZ (e.g., phishing report marked "false positive" in Jira updates the report status in The DMZ).
- **Webhook-based Updates**: The DMZ receives webhook notifications when ticket status changes, avoiding polling overhead.
- **Custom Ticket Templates**: Customer-configurable ticket templates with field mapping for any ticketing system with a REST API.
- **Escalation Rules**: Configurable escalation rules: if a phishing report ticket is not triaged within N minutes, escalate to on-call security analyst (via PagerDuty, OpsGenie, or native ITSM escalation).
- **SLA Metrics**: Track mean time to triage (MTTT) and mean time to resolve (MTTR) for phishing reports; surface in The DMZ reporting dashboards.
- **Bulk Operations**: Support for bulk ticket creation (e.g., "create compliance violation tickets for all users in department X who missed training deadline").

---

### 4.3 Incident Response Workflow Integration

The platform must support integration into the full incident response lifecycle:

| Phase               | Integration Point                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Detection**       | User reports phishing email via report button -> ticket created in ITSM                                                                         |
| **Triage**          | SOAR playbook auto-classifies report (simulation vs. real vs. benign) -> updates ticket                                                         |
| **Investigation**   | SIEM correlation: reported email indicators enriched with threat intelligence; user's risk profile and training history pulled from The DMZ API |
| **Containment**     | If real threat: email gateway integration removes matching emails from all mailboxes; SOAR orchestrates endpoint isolation if needed            |
| **Eradication**     | Threat intelligence from real incident feeds back into The DMZ simulation template library                                                      |
| **Recovery**        | Affected users automatically enrolled in targeted training based on the specific attack vector                                                  |
| **Lessons Learned** | Incident data informs future simulation campaigns; risk models updated with real-world attack patterns                                          |

---

## 5. Technical Architecture Requirements

### 5.1 Scalability

#### 5.1.1 Capacity Targets

| Metric                        | Target                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| **Total Users**               | 10 million+ across all tenants                                    |
| **Concurrent Users**          | 100,000+ simultaneous active sessions                             |
| **Concurrent Campaigns**      | 10,000+ active phishing campaigns simultaneously                  |
| **Email Throughput**          | 5 million simulation emails per hour (burst); 1 million sustained |
| **Training Content Delivery** | 50,000 concurrent video streams                                   |
| **API Requests**              | 50,000 requests per second aggregate                              |
| **Event Processing**          | 1 million events per minute through event pipeline                |
| **Data Storage**              | 500TB+ aggregate across all tenants with linear cost scaling      |

#### 5.1.2 Horizontal Scaling Strategy

```
                    +-----------------+
                    |   Global Load   |
                    |    Balancer     |
                    |  (Anycast DNS)  |
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
     +--------+-------+ +---+---+ +--------+--------+
     | Region: US-East| |US-West| | Region: EU-West |
     +--------+-------+ +---+---+ +--------+--------+
              |              |              |
         +----+----+    +---+---+     +----+----+
         |  K8s    |    |  K8s  |     |  K8s    |
         | Cluster |    |Cluster|     | Cluster |
         +----+----+    +---+---+     +----+----+
              |              |              |
    +---------+---------+    |    +---------+---------+
    |    |    |    |    |    |    |    |    |    |    |
   API Train Sim  Event  |   ...  API Train Sim  Event
   Svc  Svc  Svc  Proc  |        Svc  Svc  Svc  Proc
                         |
                   (Same pattern)
```

**Kubernetes Configuration:**

| Component          | Min Replicas | Max Replicas | Scaling Metric    | Target                      |
| ------------------ | ------------ | ------------ | ----------------- | --------------------------- |
| API Gateway        | 6            | 50           | Requests/sec      | 5,000 req/s per pod         |
| Training Service   | 4            | 100          | Active sessions   | 500 sessions per pod        |
| Simulation Service | 4            | 80           | Active campaigns  | 50 campaigns per pod        |
| Event Processor    | 6            | 120          | Queue depth       | <1,000 pending events       |
| Email Sender       | 4            | 60           | Send queue depth  | <10,000 pending emails      |
| Report Generator   | 2            | 20           | CPU utilization   | 70% target                  |
| Risk Calculator    | 4            | 40           | Calculation queue | <500 pending recalculations |

**Auto-scaling:**

- Horizontal Pod Autoscaler (HPA) driven by custom metrics (not just CPU/memory)
- Kubernetes Event-Driven Autoscaling (KEDA) for event-driven services scaling on queue depth
- Cluster Autoscaler for node-level scaling
- Predictive autoscaling using historical patterns (e.g., scale up 30 minutes before typical campaign launch times)
- Warm pools: pre-provisioned standby capacity for known peak patterns

#### 5.1.3 Multi-tenancy Architecture

| Requirement                   | Specification                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Isolation Model**           | Logical tenant isolation at application layer; dedicated database schemas per tenant; shared compute with strict resource quotas                              |
| **Noisy Neighbor Prevention** | Per-tenant rate limiting, resource quotas, and fair scheduling; no single tenant can degrade service for others                                               |
| **Tenant Routing**            | Request routing based on tenant identifier (subdomain or API key); tenant context propagated through all service calls                                        |
| **Data Residency**            | Tenant data pinned to specified geographic region; cross-region replication only with explicit consent                                                        |
| **Tenant Onboarding**         | Fully automated tenant provisioning: database schema creation, default configuration, integration endpoint setup, admin account creation (target: <5 minutes) |
| **Tenant Offboarding**        | Data export (full data portability), followed by cryptographic erasure and resource deallocation                                                              |

---

### 5.2 High Availability

#### 5.2.1 Availability Targets

| Tier                      | SLA    | Monthly Downtime Budget | Scope                                                   |
| ------------------------- | ------ | ----------------------- | ------------------------------------------------------- |
| **Platform Core**         | 99.95% | 21.9 minutes            | User-facing features: training delivery, dashboard, API |
| **Simulation Engine**     | 99.9%  | 43.8 minutes            | Phishing campaign execution, email delivery             |
| **Integration Layer**     | 99.9%  | 43.8 minutes            | SIEM, SOAR, IdP, HRIS, ITSM integrations                |
| **Reporting & Analytics** | 99.5%  | 3.65 hours              | Report generation, analytics dashboards, data exports   |
| **Admin Console**         | 99.9%  | 43.8 minutes            | Administrative configuration and management             |

#### 5.2.2 Redundancy Architecture

| Layer                        | Strategy                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **DNS**                      | Multi-provider DNS (Route 53 + Cloudflare) with health-check-based failover; anycast routing                                 |
| **Load Balancing**           | Active-active global load balancing; regional load balancers with health checks (5-second interval, 3 failures to unhealthy) |
| **Compute**                  | Multi-AZ Kubernetes clusters in each region; pod anti-affinity rules ensure replicas span AZs                                |
| **Database (Primary)**       | Multi-AZ deployment with synchronous replication; automatic failover (RTO <30 seconds)                                       |
| **Database (Read Replicas)** | Cross-region async read replicas for reporting and analytics workloads                                                       |
| **Cache**                    | Redis Cluster with 3+ nodes per AZ; automatic failover; persistence (AOF + RDB)                                              |
| **Message Queue**            | Kafka cluster (3+ brokers per AZ, replication factor 3, min ISR 2); or managed equivalent (Amazon MSK, Confluent Cloud)      |
| **Object Storage**           | Cloud-native object storage (S3, GCS, Azure Blob) with cross-region replication for critical assets                          |
| **CDN**                      | Multi-CDN strategy with automatic failover (detailed in section 5.3)                                                         |

#### 5.2.3 Disaster Recovery

| Metric                             | Target                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **RPO (Recovery Point Objective)** | <5 minutes for transactional data; <1 hour for analytics data                                                    |
| **RTO (Recovery Time Objective)**  | <30 minutes for single-AZ failure; <4 hours for full-region failure                                              |
| **Backup Frequency**               | Continuous (WAL streaming) for databases; hourly snapshots for configuration; daily for cold storage             |
| **Backup Retention**               | 30 days for daily backups; 12 months for monthly backups; 7 years for annual compliance backups                  |
| **DR Testing**                     | Quarterly DR failover drills; annual full-region failover test; chaos engineering continuous (in non-production) |
| **Runbooks**                       | Documented and rehearsed runbooks for all failure scenarios; automated where possible                            |

#### 5.2.4 Resilience Patterns

- **Circuit Breaker**: All inter-service and external integration calls wrapped in circuit breakers (closed -> open -> half-open). Open threshold: 50% failure rate in 10-second window. Half-open probe: 1 request every 30 seconds.
- **Bulkhead**: Each integration isolated in its own thread pool / connection pool. SIEM integration failure cannot starve HRIS integration of resources.
- **Retry with Backoff**: Exponential backoff with jitter for transient failures. Maximum 5 retries. Dead-letter queue for exhausted retries.
- **Timeout**: All external calls have configurable timeouts (default: 5 seconds for API calls, 30 seconds for bulk operations).
- **Fallback**: Degraded functionality when dependencies are unavailable (e.g., if HRIS is down, use cached organizational data; if SIEM is unreachable, queue events for later delivery).
- **Health Checks**: Liveness probes (is the process alive?), readiness probes (can it handle traffic?), and startup probes (has it finished initialization?) for every service.

---

### 5.3 CDN for Global Content Delivery

#### 5.3.1 CDN Architecture

| Requirement           | Specification                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Provider Strategy** | Multi-CDN: Primary CDN (Cloudflare or CloudFront) + secondary CDN for failover; CDN load balancing via DNS or edge decision                                                  |
| **Coverage**          | Global PoP presence with emphasis on: North America, Western Europe, UK, Australia, India, Singapore, Japan, Brazil                                                          |
| **Content Types**     | Static assets (JS, CSS, images), training video content (HLS/DASH adaptive streaming), SCORM/xAPI packages, PDF documents, interactive module assets                         |
| **Video Delivery**    | Adaptive bitrate streaming (HLS + DASH); multiple quality tiers (360p, 720p, 1080p, 4K); server-side ad insertion for optional branded intros                                |
| **Caching Strategy**  | Static assets: 1-year cache with content-hash-based cache busting; video segments: 24-hour cache; API responses: no-cache (with optional short TTL for read-heavy endpoints) |
| **Edge Compute**      | Cloudflare Workers or CloudFront Functions for: geo-routing, A/B testing, bot detection, request signing, and edge-side personalization                                      |
| **DDoS Protection**   | CDN-layer DDoS mitigation (L3/L4/L7); rate limiting at edge; Web Application Firewall (WAF) rules at CDN level                                                               |
| **TLS Termination**   | TLS 1.3 preferred; TLS 1.2 minimum; HSTS with 1-year max-age; OCSP stapling; certificate transparency logging                                                                |

#### 5.3.2 Content Delivery Performance Targets

| Metric                            | Target                                         |
| --------------------------------- | ---------------------------------------------- |
| **First Byte Time (Global P95)**  | <200ms                                         |
| **Full Page Load (Global P95)**   | <2 seconds                                     |
| **Video Start Time (Global P95)** | <1 second                                      |
| **Video Rebuffer Rate**           | <0.5%                                          |
| **Cache Hit Ratio**               | >95% for static assets; >85% for video content |
| **Availability**                  | 99.99% (CDN-layer)                             |

#### 5.3.3 Content Security

- **Signed URLs**: All training content served via time-limited, signed URLs to prevent unauthorized access and content piracy.
- **Token Authentication**: CDN-level token authentication for premium content (video, interactive modules).
- **Geo-restriction**: Optional per-tenant geo-restriction to comply with data sovereignty requirements (e.g., content only served from EU edge locations for EU tenants).
- **Hotlink Protection**: Referrer-based and token-based hotlink protection to prevent content embedding on unauthorized domains.
- **DRM**: Optional DRM (Widevine + FairPlay + PlayReady) for sensitive training content that must not be downloaded or screen-recorded.

---

### 5.4 Microservices Architecture

#### 5.4.1 Service Decomposition

```
+----------------------------------------------------------------------+
|                           API Gateway                                 |
|          (Authentication, Rate Limiting, Routing, Logging)           |
+----+--------+--------+--------+--------+--------+--------+-----------+
     |        |        |        |        |        |        |
+----+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+--------+
|Identity| |Train-| |Simul-| | Risk | |Report| |Integ-| |Notific-   |
|Service | |ing   | |ation | |Engine| |ing   | |ration| |ation      |
|        | |Svc   | |Svc   | |      | |Svc   | |Hub   | |Service    |
+----+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+--------+
     |        |        |        |        |        |        |
+----+--------+--------+--------+--------+--------+--------+-----------+
|                        Event Bus (Kafka)                             |
+----+--------+--------+--------+--------+--------+--------+-----------+
     |        |        |        |        |        |        |
+----+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+---+ +--+--------+
|User    | |Content| |Campaign| |Time  | |Audit | |Config| |Analytics |
|Store   | |Store  | |Store   | |Series| |Log   | |Store | |Warehouse |
|(Pg)    | |(Mongo)| |(Pg)    | |(TSDB)| |(Imm.)| |(etcd)| |(OLAP)   |
+--------+ +------+ +--------+ +------+ +------+ +------+ +----------+
```

**Core Services:**

| Service                   | Responsibility                                                                                                  | Primary Technology                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **API Gateway**           | Request routing, authentication, rate limiting, request/response transformation, API versioning                 | Kong Gateway or AWS API Gateway          |
| **Identity Service**      | User authentication, SSO, SCIM provisioning, session management, RBAC                                           | Custom + IdP SDK integrations            |
| **Training Service**      | Training module management, assignment engine, progress tracking, LMS protocol support (SCORM, xAPI, cmi5)      | Node.js/Go + LRS (Learning Record Store) |
| **Simulation Service**    | Phishing campaign lifecycle, email template engine, landing page engine, payload tracking                       | Go/Rust (high-throughput email sending)  |
| **Risk Engine**           | User risk score calculation, department aggregation, trend analysis, anomaly detection, ML model serving        | Python (ML) + Go (scoring API)           |
| **Reporting Service**     | Report generation, scheduled reports, data export, compliance evidence packaging                                | Python + headless browser for PDF        |
| **Integration Hub**       | Manages all outbound integrations (SIEM, SOAR, HRIS, ITSM, GRC); connector framework; transformation engine     | Go/Java + Apache Camel or custom         |
| **Notification Service**  | Multi-channel notification delivery (email, Teams, Slack, push, in-app); template management; delivery tracking | Node.js + message queue consumers        |
| **Content Service**       | Training content storage, versioning, transcoding pipeline, SCORM package management                            | Node.js + FFmpeg workers                 |
| **Analytics Service**     | Real-time dashboards, aggregate metrics, benchmarking, predictive analytics                                     | Python + ClickHouse/BigQuery             |
| **Audit Service**         | Immutable audit log, compliance event recording, tamper-evident logging                                         | Go + append-only storage                 |
| **Configuration Service** | Tenant configuration, feature flags, A/B testing, environment configuration                                     | Go + etcd/Consul                         |

#### 5.4.2 Service Communication

| Pattern                            | Use Case                                                                     | Technology                            |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| **Synchronous (Request/Response)** | User-facing API calls, real-time queries                                     | gRPC (internal) + REST (external)     |
| **Asynchronous (Event-Driven)**    | Inter-service events, integration delivery, analytics                        | Apache Kafka                          |
| **Async (Task Queue)**             | Long-running operations (report generation, bulk emails, risk recalculation) | Redis Streams or dedicated task queue |
| **Service Mesh**                   | mTLS, observability, traffic management                                      | Istio or Linkerd                      |

#### 5.4.3 Service Governance

- **API Contracts**: All inter-service APIs defined via Protocol Buffers (gRPC) or OpenAPI 3.1 (REST). Breaking changes require versioned endpoints and deprecation notice.
- **Dependency Rules**: No circular dependencies. Services may only depend on services in the same tier or lower. The event bus is the escape hatch for cross-cutting concerns.
- **Ownership**: Each service has a designated owning team, an SLO (Service Level Objective), and an error budget.
- **Deployment Independence**: Each service is independently deployable. No coordinated deployments required. Database schema changes are backward-compatible (expand-and-contract migration pattern).
- **Observability**: Every service emits structured logs (JSON), metrics (Prometheus/OpenTelemetry), and distributed traces (OpenTelemetry). Correlation IDs propagated across all service boundaries.

---

### 5.5 Event-Driven Architecture

#### 5.5.1 Event Bus

**Technology:** Apache Kafka (self-managed or managed service: Confluent Cloud, Amazon MSK, Azure Event Hubs with Kafka protocol)

| Configuration          | Specification                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Cluster Size**       | Minimum 6 brokers (3 per AZ in 2-AZ setup)                                                                                    |
| **Replication Factor** | 3 for all topics                                                                                                              |
| **Min ISR**            | 2 (ensures writes survive single broker failure)                                                                              |
| **Retention**          | 7 days default; 30 days for compliance-critical topics; configurable per topic                                                |
| **Compacted Topics**   | Used for state-transfer topics (e.g., current user risk scores, current campaign status)                                      |
| **Partitioning**       | Partition key based on tenant ID for tenant-level ordering; sub-partitioning by user ID within tenant for user-level ordering |
| **Throughput**         | 1 million messages/minute sustained; 5 million messages/minute burst                                                          |
| **Schema Registry**    | Confluent Schema Registry (or compatible) with Avro schemas; schema evolution rules enforced (backward compatibility)         |

#### 5.5.2 Event Taxonomy

| Domain             | Event Examples                                                                                                                                                          | Producers          | Consumers                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| **User Lifecycle** | `user.created`, `user.updated`, `user.deactivated`, `user.deleted`                                                                                                      | Identity Service   | Training, Simulation, Risk, Integration Hub, Notification |
| **Training**       | `training.assigned`, `training.started`, `training.completed`, `training.failed`, `training.expired`                                                                    | Training Service   | Risk, Reporting, Integration Hub, Notification            |
| **Simulation**     | `campaign.created`, `campaign.launched`, `email.sent`, `email.delivered`, `email.opened`, `link.clicked`, `credential.submitted`, `attachment.opened`, `email.reported` | Simulation Service | Risk, Reporting, Integration Hub, Notification            |
| **Risk**           | `risk.score.updated`, `risk.threshold.breached`, `risk.trend.changed`                                                                                                   | Risk Engine        | Reporting, Integration Hub, Notification                  |
| **Integration**    | `integration.event.sent`, `integration.event.failed`, `integration.sync.completed`                                                                                      | Integration Hub    | Audit, Reporting                                          |
| **Admin**          | `config.changed`, `campaign.modified`, `policy.updated`                                                                                                                 | Various            | Audit, Integration Hub                                    |

#### 5.5.3 Event Processing Patterns

- **Event Sourcing**: Phishing simulation events are event-sourced. The complete history of every user's interaction with every simulation is stored as an immutable event stream. Current state is derived by replaying events. This enables: (a) perfect audit trail, (b) retroactive analysis with new risk models, (c) point-in-time reconstruction for compliance investigations.
- **CQRS (Command Query Responsibility Segregation)**: Write operations (commands) are processed through the event pipeline. Read operations (queries) are served from materialized views optimized for specific query patterns. This enables independent scaling of read and write paths.
- **Saga Pattern**: Multi-step workflows (e.g., "launch campaign" = create campaign -> validate targets -> generate emails -> queue sends -> update status) are implemented as sagas with compensating transactions for rollback on failure.
- **Dead Letter Queue**: Events that fail processing after exhausting retries are routed to a dead-letter topic. Dead-letter events are monitored, alerted on, and can be replayed after the root cause is fixed.
- **Event Replay**: The platform supports replaying events from any point in time for: disaster recovery, new service bootstrapping, analytics backfill, and debugging.

#### 5.5.4 Real-Time Features

| Feature                              | Implementation                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live Campaign Dashboard**          | WebSocket connection from browser to Notification Service; Notification Service consumes Kafka events and pushes updates to connected clients                                                     |
| **Real-Time Risk Score**             | Risk Engine consumes simulation and training events; recalculates scores within 5 seconds of triggering event; publishes updated score to Kafka; dashboard and integrations consume updated score |
| **Instant Phishing Report Feedback** | Report button submission -> Simulation Service checks if email is a known simulation (sub-second lookup) -> immediate response to user -> event published for downstream processing               |
| **Live Training Progress**           | Training Service emits progress events (video position, quiz answers) via WebSocket; aggregated for real-time manager dashboards                                                                  |

---

### 5.6 Database Strategy

#### 5.6.1 Polyglot Persistence

| Database Type            | Technology                                     | Use Case                                                                                                                           | Justification                                                                          |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Relational (Primary)** | PostgreSQL 16+                                 | User accounts, tenant configuration, campaign definitions, training assignments, RBAC, transactional data                          | ACID compliance, complex queries, foreign key integrity, mature ecosystem              |
| **Document Store**       | MongoDB 7+ (or PostgreSQL JSONB)               | Training content metadata, email templates, simulation landing page configurations, flexible schema content                        | Variable-schema content, nested documents, rapid iteration on content structure        |
| **Time-Series**          | TimescaleDB (PostgreSQL extension) or InfluxDB | Risk score history, campaign metrics over time, platform performance metrics, user activity timelines                              | Optimized time-range queries, automatic partitioning, downsampling, retention policies |
| **Search Engine**        | Elasticsearch / OpenSearch                     | Full-text search across training content, campaign templates, audit logs, user directory                                           | Fast full-text search, faceted search, log analytics                                   |
| **Cache**                | Redis 7+ (Cluster mode)                        | Session store, rate limit counters, real-time leaderboards, frequently accessed configuration, hot data cache                      | Sub-millisecond reads, atomic operations, pub/sub for real-time features               |
| **Object Store**         | S3 / GCS / Azure Blob                          | Training videos, SCORM packages, report PDFs, email attachments, backup archives                                                   | Unlimited scale, durability (11 9s), cost-effective for large binary assets            |
| **Analytics (OLAP)**     | ClickHouse or BigQuery                         | Aggregate analytics, benchmarking, cross-tenant anonymized analytics, trend analysis                                               | Columnar storage for fast aggregation, sub-second query on billions of rows            |
| **Graph (Optional)**     | Neo4j or Amazon Neptune                        | Organizational hierarchy visualization, influence mapping (who are the "super-spreaders" of risky behavior?), attack path modeling | Relationship-first queries, path analysis, community detection                         |

#### 5.6.2 Data Partitioning Strategy

| Strategy                    | Scope                       | Implementation                                                                                                                                                              |
| --------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant-Level Sharding**   | Primary relational database | Each tenant gets a dedicated PostgreSQL schema within a shared database (small tenants) or a dedicated database instance (large tenants). Shard routing based on tenant ID. |
| **Time-Based Partitioning** | Time-series and event data  | Native time-based partitioning (TimescaleDB hypertables, Kafka topic retention). Hot/warm/cold tiering.                                                                     |
| **Geographic Partitioning** | Data residency compliance   | Tenant data stored in customer-specified region. Cross-region queries prohibited by default.                                                                                |
| **Functional Partitioning** | Service-level isolation     | Each microservice owns its database. No shared databases between services. Data shared via events and APIs.                                                                 |

#### 5.6.3 Data Migration & Schema Management

- **Migration Tool**: Flyway or Liquibase for relational schema migrations; version-controlled, audited, reversible.
- **Expand-Contract Pattern**: Schema changes follow expand-and-contract: (1) add new column/table, (2) dual-write to old and new, (3) migrate existing data, (4) switch reads to new, (5) remove old column/table. Minimum two deployment cycles between expand and contract.
- **Zero-Downtime Migrations**: All schema changes must be backward-compatible with the previous application version. No locking DDL operations on large tables during peak hours.
- **Data Versioning**: Event schemas versioned in schema registry. Database schemas versioned via migration tool. API schemas versioned via OpenAPI spec.

---

## 6. Security Requirements for the Platform Itself

### 6.1 Compliance Certifications

#### 6.1.1 SOC 2 Type II

| Requirement                | Specification                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trust Service Criteria** | All five: Security, Availability, Processing Integrity, Confidentiality, Privacy                                                                         |
| **Audit Frequency**        | Annual SOC 2 Type II audit by a qualified CPA firm (AICPA member)                                                                                        |
| **Observation Period**     | Minimum 6-month observation period (12 months preferred)                                                                                                 |
| **Report Availability**    | SOC 2 report available to customers under NDA within 30 days of audit completion                                                                         |
| **Continuous Monitoring**  | Automated evidence collection via compliance automation platform (Vanta, Drata, or Secureframe); 1,200+ automated control tests                          |
| **Control Categories**     | Access controls, change management, risk assessment, incident response, vendor management, data classification, encryption, logging, business continuity |
| **Bridge Letters**         | SOC 2 bridge letters available for periods between audit reports                                                                                         |

#### 6.1.2 Additional Certifications

| Certification          | Timeline | Scope                                                                                           |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| **ISO 27001:2022**     | Year 1   | Information Security Management System covering all platform operations                         |
| **ISO 27701**          | Year 2   | Privacy Information Management System (extension to ISO 27001)                                  |
| **CSA STAR Level 2**   | Year 1   | Cloud Security Alliance assessment, leveraging SOC 2 + ISO 27001                                |
| **FedRAMP (Moderate)** | Year 2-3 | Required for US federal government customers (if pursuing public sector)                        |
| **IRAP (Protected)**   | Year 2-3 | Required for Australian government customers                                                    |
| **C5 (Germany)**       | Year 2   | BSI Cloud Computing Compliance Criteria Catalogue for German market                             |
| **HIPAA**              | Year 1   | BAA-ready for healthcare customers; PHI handling procedures documented                          |
| **GDPR**               | Day 1    | Data processing agreement template; privacy impact assessment; Article 30 records of processing |
| **CCPA/CPRA**          | Day 1    | California privacy compliance; data subject request handling                                    |

---

### 6.2 Penetration Testing

#### 6.2.1 Testing Program

| Test Type                      | Frequency                | Scope                                                         | Methodology                        |
| ------------------------------ | ------------------------ | ------------------------------------------------------------- | ---------------------------------- |
| **External Network Pentest**   | Quarterly                | All internet-facing infrastructure                            | OSSTMM, PTES                       |
| **Web Application Pentest**    | Bi-annually              | All web interfaces, APIs, and webhooks                        | OWASP Testing Guide v4, ASVS       |
| **API Security Assessment**    | Bi-annually              | All public and integration APIs                               | OWASP API Security Top 10          |
| **Mobile Application Pentest** | Annually (if applicable) | iOS and Android applications                                  | OWASP Mobile Testing Guide         |
| **Internal Network Pentest**   | Annually                 | Internal infrastructure, lateral movement                     | MITRE ATT&CK framework             |
| **Red Team Exercise**          | Annually                 | Full-scope adversary simulation including social engineering  | Custom threat scenario modeling    |
| **Cloud Configuration Review** | Quarterly                | AWS/Azure/GCP configuration against CIS Benchmarks            | CIS Benchmarks, cloud-native tools |
| **Source Code Review**         | Annually                 | Security-critical components (auth, crypto, input validation) | Manual review + SAST tools         |

#### 6.2.2 Vulnerability SLAs

| Severity          | CVSS Score | Remediation SLA | Notification                                                                           |
| ----------------- | ---------- | --------------- | -------------------------------------------------------------------------------------- |
| **Critical**      | 9.0 - 10.0 | 72 hours        | Immediate notification to CISO; customer notification within 24 hours if data impacted |
| **High**          | 7.0 - 8.9  | 14 days         | Included in weekly security report                                                     |
| **Medium**        | 4.0 - 6.9  | 30 days         | Included in monthly security report                                                    |
| **Low**           | 0.1 - 3.9  | 90 days         | Addressed in normal development cycle                                                  |
| **Informational** | 0.0        | Best effort     | Logged for tracking                                                                    |

#### 6.2.3 Bug Bounty Program

- **Platform**: HackerOne or Bugcrowd managed program
- **Scope**: All production domains, APIs, and applications
- **Rewards**: $200 (Low) to $15,000 (Critical) based on severity and impact
- **Response SLA**: Acknowledge within 24 hours; triage within 72 hours
- **Safe Harbor**: Published safe harbor policy; researchers will not be pursued for good-faith security research
- **Hall of Fame**: Public acknowledgment for researchers (with consent)

---

### 6.3 Encryption

#### 6.3.1 Encryption in Transit

| Requirement                     | Specification                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **External TLS**                | TLS 1.3 preferred; TLS 1.2 minimum (TLS 1.0 and 1.1 disabled); HSTS with `max-age=31536000; includeSubDomains; preload`     |
| **Internal TLS (Service Mesh)** | mTLS between all services via service mesh (Istio/Linkerd); certificate rotation every 24 hours; SPIFFE-based identity      |
| **Certificate Management**      | Automated certificate provisioning and renewal via Let's Encrypt (public) and internal CA (private); zero-downtime rotation |
| **Cipher Suites**               | TLS 1.3: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256; TLS 1.2: ECDHE+AESGCM only                                   |
| **Certificate Transparency**    | All public certificates logged to CT logs; monitoring for unauthorized certificate issuance                                 |
| **DNSSEC**                      | DNSSEC enabled for all platform domains                                                                                     |
| **Email Encryption**            | TLS for SMTP (STARTTLS enforced where supported; MTA-STS published); optional S/MIME for sensitive communications           |

#### 6.3.2 Encryption at Rest

| Requirement                      | Specification                                                                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database Encryption**          | AES-256 Transparent Data Encryption (TDE) for all databases; cloud-provider managed keys or customer-managed keys (CMK) via KMS                                                                                   |
| **Object Storage**               | Server-side encryption with AES-256; customer-managed encryption keys (SSE-KMS) supported                                                                                                                         |
| **Application-Level Encryption** | Sensitive fields (PII, risk scores, assessment results) additionally encrypted at application layer using envelope encryption                                                                                     |
| **Key Management**               | AWS KMS, Azure Key Vault, or Google Cloud KMS; HSM-backed key storage (FIPS 140-2 Level 3)                                                                                                                        |
| **Key Rotation**                 | Automatic key rotation every 365 days; manual rotation capability on demand; old keys retained for decryption of existing data                                                                                    |
| **Backup Encryption**            | All backups encrypted with separate backup encryption key; cross-region backup keys managed independently                                                                                                         |
| **Tenant Key Isolation**         | Each tenant's sensitive data encrypted with a tenant-specific data encryption key (DEK) wrapped by a tenant-specific key encryption key (KEK); compromise of one tenant's key does not expose other tenants' data |
| **Cryptographic Erasure**        | Tenant offboarding destroys the tenant's KEK, rendering all encrypted data irrecoverable without data-level deletion                                                                                              |

#### 6.3.3 Encryption Key Hierarchy

```
+---------------------------+
|   Root Key (HSM-backed)   |   <-- Managed by cloud KMS; never exported
+-------------+-------------+
              |
    +---------+---------+
    |                   |
+---+---+         +-----+-----+
|Tenant |  ...    |  Tenant   |   <-- One KEK per tenant; stored in KMS
|KEK #1 |         |  KEK #N   |
+---+---+         +-----+-----+
    |                   |
+---+---+         +-----+-----+
|Tenant |         |  Tenant   |   <-- DEKs rotated frequently; encrypted
|DEK #1 |         |  DEK #N   |       by tenant KEK; stored alongside data
+---+---+         +-----+-----+
    |                   |
 [Data]              [Data]       <-- AES-256-GCM encrypted
```

---

### 6.4 Vulnerability Management

| Requirement                  | Specification                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **SAST**                     | Static Application Security Testing in CI/CD pipeline (Semgrep, SonarQube, or Checkmarx); blocking on Critical/High findings                 |
| **DAST**                     | Dynamic Application Security Testing against staging environment (OWASP ZAP, Burp Suite Enterprise); weekly scans                            |
| **SCA**                      | Software Composition Analysis for dependency vulnerabilities (Snyk, Dependabot, or Grype); automated PR creation for vulnerable dependencies |
| **Container Scanning**       | Container image scanning in CI/CD (Trivy, Prisma Cloud, or Aqua); no Critical vulnerabilities in production images                           |
| **IaC Scanning**             | Infrastructure-as-Code scanning (Checkov, tfsec, or Bridgecrew); all Terraform/CloudFormation/Helm reviewed before apply                     |
| **Secret Scanning**          | Pre-commit and CI/CD secret detection (GitLeaks, TruffleHog); blocking on any detected secret                                                |
| **SBOM**                     | Software Bill of Materials generated for every release (SPDX or CycloneDX format); stored and queryable                                      |
| **Vulnerability Database**   | Centralized vulnerability tracking (Jira, or dedicated VRM tool); dashboards for remediation progress                                        |
| **Patch Management**         | OS and runtime patches applied within: 72 hours (Critical), 14 days (High), 30 days (Medium); automated where possible                       |
| **Dependency Update Policy** | Major dependencies updated within 30 days of release; security patches within SLA above; end-of-life dependencies replaced before EOL date   |

---

### 6.5 Secure SDLC Practices

#### 6.5.1 Development Lifecycle Security

| Phase              | Security Activity                                                                                    | Tools / Process                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Requirements**   | Threat modeling for new features; abuse case definition; security requirements documentation         | STRIDE/DREAD analysis; security champion review        |
| **Design**         | Architecture security review; data flow analysis; trust boundary identification                      | Design review checklist; architecture decision records |
| **Implementation** | Secure coding standards; pre-commit hooks for secret detection; peer code review with security focus | Language-specific secure coding guides; linting rules  |
| **Build**          | SAST, SCA, container scanning, IaC scanning in CI pipeline; build reproducibility                    | GitHub Actions / GitLab CI with security gates         |
| **Test**           | DAST against staging; integration security tests; fuzz testing for parsers and input handlers        | OWASP ZAP, custom security test suites                 |
| **Release**        | Security sign-off for major releases; SBOM generation; release notes include security changes        | Release checklist; automated SBOM generation           |
| **Deploy**         | Immutable infrastructure; blue-green deployments; canary analysis; automated rollback                | Kubernetes rolling updates; Argo Rollouts              |
| **Operate**        | Runtime protection (RASP optional); WAF tuning; anomaly detection; security monitoring               | Cloud WAF, SIEM integration, alerting                  |
| **Monitor**        | Bug bounty program; vulnerability scanning; log analysis; threat intelligence consumption            | HackerOne/Bugcrowd; Splunk/ELK; threat feeds           |

#### 6.5.2 Access Controls for Development

| Control                    | Specification                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Source Code Access**     | Role-based access to repositories; branch protection rules on main branches; signed commits required for production branches                                 |
| **CI/CD Pipeline**         | Pipeline definitions version-controlled and reviewed; secrets managed via vault (HashiCorp Vault, GitHub Secrets); no plaintext credentials                  |
| **Production Access**      | No direct production access for developers; break-glass procedure with MFA, approval, time-limited access, full audit logging                                |
| **Database Access**        | No direct production database access; read-only access for on-call via audited bastion; write access requires change request                                 |
| **Infrastructure Changes** | All infrastructure changes via IaC (Terraform/Pulumi); manual changes prohibited; drift detection alerting                                                   |
| **Dependency Management**  | Private artifact repository (Artifactory/Nexus); dependencies proxied through internal registry; no direct pulls from public registries in production builds |

#### 6.5.3 Incident Response

| Requirement                | Specification                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Incident Response Plan** | Documented, rehearsed plan covering: detection, triage, containment, eradication, recovery, post-mortem                               |
| **Severity Levels**        | SEV1 (Critical: data breach, full outage) through SEV4 (Low: minor bug, cosmetic issue)                                               |
| **Response Times**         | SEV1: 15-minute response, 1-hour executive notification; SEV2: 30-minute response; SEV3: 4-hour response; SEV4: next business day     |
| **Communication**          | Customer-facing status page (statuspage.io or equivalent); proactive customer notification for impactful incidents                    |
| **Post-Mortem**            | Blameless post-mortem for all SEV1/SEV2 incidents within 5 business days; action items tracked to completion                          |
| **Tabletop Exercises**     | Quarterly tabletop exercises simulating various incident scenarios (ransomware, data breach, insider threat, supply chain compromise) |

---

## 7. API Strategy

### 7.1 RESTful API

#### 7.1.1 Design Standards

| Standard            | Specification                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Base URL**        | `https://api.thedmz.io/v{major}`                                                                                                                                                                                                                 |
| **Resource Naming** | Plural nouns, lowercase, hyphen-separated (e.g., `/v1/phishing-campaigns`, `/v1/training-modules`)                                                                                                                                               |
| **HTTP Methods**    | `GET` (read), `POST` (create), `PUT` (full update), `PATCH` (partial update), `DELETE` (remove)                                                                                                                                                  |
| **Status Codes**    | Standard HTTP status codes: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity), 429 (Too Many Requests), 500 (Internal Server Error) |
| **Content Type**    | `application/json` (primary); `application/json; charset=utf-8`                                                                                                                                                                                  |
| **Pagination**      | Cursor-based pagination for all list endpoints; `?cursor=<opaque-token>&limit=<int>`; response includes `next_cursor` and `has_more`                                                                                                             |
| **Filtering**       | Query parameter filtering: `?status=active&department=engineering&created_after=2025-01-01T00:00:00Z`                                                                                                                                            |
| **Sorting**         | `?sort=created_at:desc,name:asc`                                                                                                                                                                                                                 |
| **Field Selection** | `?fields=id,name,email,risk_score` for bandwidth optimization                                                                                                                                                                                    |
| **Envelope**        | Consistent response envelope: `{ "data": {...}, "meta": {...}, "errors": [...] }`                                                                                                                                                                |
| **Error Format**    | RFC 7807 Problem Details: `{ "type": "https://api.thedmz.io/errors/validation-error", "title": "Validation Error", "status": 422, "detail": "...", "instance": "...", "errors": [...] }`                                                         |
| **Date/Time**       | ISO 8601 with UTC timezone (e.g., `2025-07-15T14:30:00Z`)                                                                                                                                                                                        |
| **Idempotency**     | POST requests support `Idempotency-Key` header for safe retries                                                                                                                                                                                  |
| **Compression**     | `Accept-Encoding: gzip, br` supported; Brotli preferred for text payloads                                                                                                                                                                        |
| **CORS**            | Configurable per-tenant CORS origins; strict `Access-Control-Allow-Origin`                                                                                                                                                                       |

#### 7.1.2 Core API Resources

| Resource                 | Endpoints                                      | Description                             |
| ------------------------ | ---------------------------------------------- | --------------------------------------- |
| **Users**                | `GET/POST/PATCH/DELETE /v1/users`              | User management, profile, risk scores   |
| **Groups**               | `GET/POST/PATCH/DELETE /v1/groups`             | User groups for targeting and reporting |
| **Training Modules**     | `GET/POST/PATCH/DELETE /v1/training-modules`   | Training content management             |
| **Training Assignments** | `GET/POST/PATCH /v1/training-assignments`      | Assign, track, and manage training      |
| **Phishing Campaigns**   | `GET/POST/PATCH/DELETE /v1/phishing-campaigns` | Campaign lifecycle management           |
| **Phishing Templates**   | `GET/POST/PATCH/DELETE /v1/phishing-templates` | Email and landing page templates        |
| **Campaign Results**     | `GET /v1/phishing-campaigns/{id}/results`      | Campaign outcome data                   |
| **Risk Scores**          | `GET /v1/risk-scores`                          | User, group, and org-level risk data    |
| **Reports**              | `GET/POST /v1/reports`                         | Report generation and retrieval         |
| **Webhooks**             | `GET/POST/PATCH/DELETE /v1/webhooks`           | Webhook subscription management         |
| **Audit Logs**           | `GET /v1/audit-logs`                           | Immutable audit trail                   |
| **Integrations**         | `GET/POST/PATCH/DELETE /v1/integrations`       | Integration configuration               |

#### 7.1.3 Webhook Subscription API

Customers and partners can subscribe to platform events via webhooks:

```json
POST /v1/webhooks
{
  "url": "https://customer.example.com/thedmz-events",
  "events": [
    "phishing_campaign.completed",
    "training.completed",
    "risk_score.threshold_breached"
  ],
  "secret": "whsec_...",
  "metadata": {
    "environment": "production"
  }
}
```

**Webhook Delivery Guarantees:**

- At-least-once delivery; consumers must be idempotent
- HMAC-SHA256 signature in `X-TheDMZ-Signature` header for payload verification
- Retry policy: 3 retries with exponential backoff (1 min, 5 min, 30 min)
- Webhook delivery logs accessible via API for debugging
- Webhook test endpoint for validating consumer implementation

---

### 7.2 GraphQL Consideration

#### 7.2.1 GraphQL Strategy

The platform adopts a **REST-first, GraphQL-second** approach:

| Decision                      | Rationale                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REST as primary API**       | Broader enterprise adoption; simpler for SIEM/SOAR/ITSM integrations; easier to cache at CDN/proxy layer; straightforward rate limiting                       |
| **GraphQL as opt-in overlay** | Available for: dashboard frontends (reduce over-fetching), custom reporting queries, mobile applications, partner integrations requiring flexible data access |
| **GraphQL Gateway**           | Single GraphQL endpoint federating across microservice REST APIs; implemented via Apollo Federation or similar                                                |

#### 7.2.2 GraphQL Implementation

| Requirement           | Specification                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Endpoint**          | `https://api.thedmz.io/graphql`                                                                                  |
| **Schema**            | SDL-first schema design; published schema as documentation                                                       |
| **Authentication**    | Same OAuth 2.0 / API key authentication as REST API                                                              |
| **Authorization**     | Field-level authorization; tenant isolation enforced at resolver level                                           |
| **Query Complexity**  | Query complexity analysis and limits (max depth: 10, max complexity score: 1000) to prevent abuse                |
| **Rate Limiting**     | Cost-based rate limiting (each field has a cost; total query cost counted against rate limit)                    |
| **Persisted Queries** | Support for persisted queries (APQ - Automatic Persisted Queries) to reduce payload size and enable allowlisting |
| **Subscriptions**     | GraphQL subscriptions over WebSocket for real-time dashboard updates                                             |
| **Introspection**     | Enabled in development/staging; disabled in production (use published schema documentation)                      |
| **Batching**          | Query batching supported with per-batch cost limits                                                              |

#### 7.2.3 Example GraphQL Query

```graphql
query DepartmentRiskOverview($departmentId: ID!, $dateRange: DateRange!) {
  department(id: $departmentId) {
    name
    riskScore {
      current
      trend(period: $dateRange) {
        date
        score
      }
    }
    trainingCompliance {
      percentage
      overdueCount
      upcomingDeadlines(limit: 5) {
        user {
          name
          email
        }
        module {
          title
        }
        dueDate
      }
    }
    phishingMetrics(period: $dateRange) {
      campaignsRun
      averageClickRate
      averageReportRate
      topVulnerableUsers(limit: 10) {
        user {
          name
          email
        }
        clickRate
        riskScore
      }
    }
  }
}
```

---

### 7.3 Rate Limiting

#### 7.3.1 Rate Limit Tiers

| Tier                | Requests/Minute | Requests/Hour | Concurrent Connections | Use Case                                        |
| ------------------- | --------------- | ------------- | ---------------------- | ----------------------------------------------- |
| **Free/Trial**      | 60              | 1,000         | 5                      | Evaluation, proof of concept                    |
| **Standard**        | 600             | 20,000        | 25                     | Small to medium organizations                   |
| **Enterprise**      | 6,000           | 200,000       | 100                    | Large organizations                             |
| **Enterprise Plus** | 30,000          | 1,000,000     | 500                    | Very large organizations with heavy integration |
| **Custom**          | Negotiated      | Negotiated    | Negotiated             | Strategic accounts                              |

#### 7.3.2 Rate Limit Implementation

| Requirement            | Specification                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Algorithm**          | Token bucket with sliding window (hybrid approach); burst-friendly with sustained rate enforcement                           |
| **Granularity**        | Per API key, per endpoint category, per tenant; most restrictive limit applies                                               |
| **Headers**            | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix timestamp), `Retry-After` (seconds) on 429 responses |
| **Response**           | HTTP 429 with JSON body including: limit exceeded details, retry timing, link to rate limit documentation, upgrade path      |
| **Distributed**        | Rate limit state stored in Redis Cluster; consistent across all API gateway instances                                        |
| **Endpoint Weighting** | Write operations cost 5x read operations; bulk operations cost 10x; report generation costs 50x                              |
| **Burst Handling**     | Short bursts (up to 2x sustained rate for 10 seconds) allowed before enforcement                                             |
| **Admin Override**     | Platform operators can temporarily increase limits for specific tenants during migrations or incident response               |

---

### 7.4 API Versioning

#### 7.4.1 Versioning Strategy

| Requirement                    | Specification                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Method**                     | URI path versioning: `/v1/`, `/v2/`                                                                                                                                                                                                                                                                               |
| **Versioning Scope**           | Major versions for breaking changes; minor/patch changes are backward-compatible within the same major version                                                                                                                                                                                                    |
| **Breaking Change Definition** | Removing a field, changing a field type, changing required status of a field, changing URL structure, changing error format, changing authentication mechanism                                                                                                                                                    |
| **Non-Breaking Changes**       | Adding optional fields, adding new endpoints, adding new enum values (with documented extensibility), adding new optional query parameters                                                                                                                                                                        |
| **Support Window**             | Minimum 18 months of support for each major API version after the next major version is released                                                                                                                                                                                                                  |
| **Deprecation Process**        | (1) Announce deprecation 12+ months before end-of-life, (2) `Sunset` HTTP header on deprecated endpoints, (3) Deprecation warnings in API response headers, (4) Migration guide published, (5) Usage analytics to identify and contact affected customers, (6) End-of-life: 410 Gone response with migration link |
| **Changelog**                  | Public changelog updated with every release; RSS feed available; email notification for breaking changes                                                                                                                                                                                                          |

#### 7.4.2 API Evolution Guidelines

- **Robustness Principle (Postel's Law)**: The API is conservative in what it produces and liberal in what it accepts. Unknown fields in requests are silently ignored (not rejected). Consumers should ignore unknown fields in responses.
- **Additive Changes Only**: Within a major version, only additive, backward-compatible changes are permitted.
- **Feature Flags for API Features**: New API features can be gated behind feature flags for gradual rollout and customer opt-in.
- **API Preview Program**: Upcoming breaking changes available as "preview" endpoints (`/v2-preview/`) for customer testing before GA release.

---

### 7.5 Developer Documentation

#### 7.5.1 Developer Portal

| Requirement          | Specification                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| **URL**              | `https://developers.thedmz.io`                                                                  |
| **Platform**         | Custom portal built on open-source documentation framework (Docusaurus, Mintlify, or ReadMe.io) |
| **Authentication**   | Self-service API key generation and management                                                  |
| **Interactive Docs** | OpenAPI 3.1 specification with Swagger UI / Redoc for interactive API exploration               |
| **Try It**           | "Try It" functionality with sandbox environment (no production data)                            |
| **Code Examples**    | Code examples in: Python, JavaScript/TypeScript, Go, Java, C#, Ruby, PHP, cURL                  |
| **Search**           | Full-text search across all documentation                                                       |
| **Versioned Docs**   | Documentation versioned alongside API versions; version selector in UI                          |

#### 7.5.2 Documentation Structure

| Section             | Content                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Getting Started** | Quick start guide (5-minute time to first API call); authentication setup; sandbox environment access                                |
| **API Reference**   | Complete endpoint documentation auto-generated from OpenAPI spec; request/response examples; error code reference                    |
| **Guides**          | Step-by-step integration guides for each supported platform (SIEM, SOAR, IdP, HRIS, ITSM, etc.)                                      |
| **Tutorials**       | End-to-end tutorials: "Launch your first phishing campaign via API", "Automate training enrollment", "Build a custom risk dashboard" |
| **Webhooks**        | Webhook event catalog; payload schemas; verification guide; testing tools                                                            |
| **GraphQL**         | Schema documentation; query playground (GraphiQL); query optimization guide                                                          |
| **SDKs**            | SDK installation, configuration, and usage documentation                                                                             |
| **Changelog**       | Version history with breaking change alerts; migration guides                                                                        |
| **Status**          | API status page; planned maintenance schedule; incident history                                                                      |
| **Community**       | Community forum; GitHub discussions; Stack Overflow tag                                                                              |

#### 7.5.3 OpenAPI Specification

- **Version**: OpenAPI 3.1 (JSON Schema-compatible)
- **Hosting**: Specification file hosted at `https://api.thedmz.io/openapi.json` and `https://api.thedmz.io/openapi.yaml`
- **Validation**: Specification validated against OpenAPI 3.1 schema in CI/CD pipeline; spec changes require review
- **Code Generation**: Specification designed to produce clean, usable code via OpenAPI Generator for all supported languages
- **Postman Collection**: Auto-generated Postman collection published alongside each API version

---

### 7.6 SDK Provision

#### 7.6.1 Official SDKs

| Language                  | Package Manager                                   | Repository                       | Minimum Version               |
| ------------------------- | ------------------------------------------------- | -------------------------------- | ----------------------------- |
| **Python**                | PyPI (`pip install thedmz`)                       | GitHub (open source, Apache 2.0) | Python 3.9+                   |
| **JavaScript/TypeScript** | npm (`npm install @thedmz/sdk`)                   | GitHub (open source, Apache 2.0) | Node.js 18+ / Browser ES2020+ |
| **Go**                    | Go modules (`go get github.com/thedmz/thedmz-go`) | GitHub (open source, Apache 2.0) | Go 1.21+                      |
| **Java**                  | Maven Central (`com.thedmz:thedmz-java`)          | GitHub (open source, Apache 2.0) | Java 17+                      |
| **C# / .NET**             | NuGet (`TheDMZ.SDK`)                              | GitHub (open source, Apache 2.0) | .NET 6+                       |
| **Ruby**                  | RubyGems (`gem install thedmz`)                   | GitHub (open source, Apache 2.0) | Ruby 3.1+                     |
| **PHP**                   | Packagist (`composer require thedmz/sdk`)         | GitHub (open source, Apache 2.0) | PHP 8.1+                      |

#### 7.6.2 SDK Requirements

| Requirement              | Specification                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-generation**      | SDKs generated from OpenAPI specification using OpenAPI Generator with customized templates for each language's idiomatic patterns |
| **Authentication**       | Built-in support for API key, OAuth 2.0 (client credentials, authorization code with PKCE), and JWT bearer token                   |
| **Error Handling**       | Typed exceptions/errors for all API error responses; automatic deserialization of RFC 7807 error bodies                            |
| **Retry Logic**          | Built-in retry with exponential backoff for transient errors (5xx, 429); configurable retry count and backoff parameters           |
| **Rate Limit Handling**  | Automatic rate limit detection and backoff based on response headers; optional blocking mode (wait for rate limit reset)           |
| **Pagination**           | Iterator/generator-based pagination helpers that abstract cursor-based pagination                                                  |
| **Webhook Verification** | Helper function for HMAC-SHA256 webhook signature verification                                                                     |
| **Logging**              | Configurable logging (debug, info, warn, error) compatible with language-standard logging frameworks                               |
| **Testing**              | Comprehensive unit and integration test suites; mocked HTTP responses for unit tests                                               |
| **CI/CD**                | Automated release pipeline: OpenAPI spec change triggers SDK regeneration, testing, and publishing                                 |
| **Documentation**        | SDK-specific documentation; inline code documentation (docstrings/JavaDoc/GoDoc); README with quick start                          |
| **Versioning**           | SDK major version tracks API major version; minor versions for SDK improvements                                                    |

#### 7.6.3 Community SDKs and Tools

- **Terraform Provider**: Official Terraform provider for managing The DMZ resources as infrastructure-as-code (`terraform-provider-thedmz`)
- **Ansible Collection**: Ansible collection for automated deployment and configuration
- **PowerShell Module**: PowerShell module for Windows/Azure administrators
- **CLI Tool**: Command-line interface for scripting and automation (`thedmz-cli`); available via Homebrew, apt, and direct download
- **Postman Collection**: Maintained Postman collection with environment variables and example requests
- **OpenAPI Generator Templates**: Custom templates published for community SDK generation in additional languages

---

## 8. Implementation Roadmap

### 8.1 Phase 1: Foundation (Months 1-6)

| Priority | Integration                                     | Milestone                            |
| -------- | ----------------------------------------------- | ------------------------------------ |
| **P0**   | REST API v1 (core endpoints)                    | API GA with developer portal         |
| **P0**   | SAML 2.0 + OIDC SSO (Okta, Entra ID)            | SSO GA                               |
| **P0**   | SCIM 2.0 provisioning (Okta, Entra ID)          | Automated user lifecycle             |
| **P0**   | Email sending infrastructure (SPF, DKIM, DMARC) | Simulation email delivery            |
| **P0**   | Webhook system (outbound)                       | Event delivery to customer endpoints |
| **P1**   | Splunk HEC integration                          | SIEM event delivery                  |
| **P1**   | Microsoft Sentinel connector                    | SIEM event delivery                  |
| **P1**   | Outlook phishing report add-in                  | End-user phishing reporting          |
| **P1**   | Python and JavaScript SDKs                      | Developer tooling                    |

### 8.2 Phase 2: Enterprise Expansion (Months 7-12)

| Priority | Integration                          | Milestone                           |
| -------- | ------------------------------------ | ----------------------------------- |
| **P0**   | GraphQL API                          | Flexible data access for dashboards |
| **P0**   | Microsoft Teams bot + tabs           | Communication platform integration  |
| **P0**   | Workday HRIS integration             | HR lifecycle automation             |
| **P1**   | Slack bot + slash commands           | Communication platform integration  |
| **P1**   | QRadar DSM + Elastic integration     | Full SIEM coverage                  |
| **P1**   | Cortex XSOAR integration pack        | SOAR automation                     |
| **P1**   | ServiceNow ITSM scoped app           | Ticketing and incident workflow     |
| **P1**   | Proofpoint email gateway integration | Email security coordination         |
| **P1**   | Go, Java, C# SDKs                    | Expanded developer tooling          |
| **P2**   | Gmail phishing report add-on         | Google Workspace support            |
| **P2**   | BambooHR + ADP integration           | Mid-market HRIS coverage            |

### 8.3 Phase 3: Ecosystem Maturity (Months 13-18)

| Priority | Integration                                 | Milestone                      |
| -------- | ------------------------------------------- | ------------------------------ |
| **P0**   | SOC 2 Type II certification                 | Compliance assurance           |
| **P0**   | ISO 27001 certification                     | International compliance       |
| **P1**   | ServiceNow GRC integration                  | Compliance workflow automation |
| **P1**   | Swimlane SOAR integration                   | Expanded SOAR coverage         |
| **P1**   | Mimecast + Defender email gateway           | Full email security coverage   |
| **P1**   | Jira Service Management integration         | Atlassian ecosystem support    |
| **P1**   | Ping Identity SSO + SCIM                    | IdP coverage expansion         |
| **P2**   | RSA Archer + OneTrust GRC                   | GRC ecosystem coverage         |
| **P2**   | CrowdStrike + Defender endpoint integration | Endpoint correlation           |
| **P2**   | Terraform provider                          | Infrastructure-as-code         |
| **P2**   | Bug bounty program launch                   | Community security testing     |

### 8.4 Phase 4: Advanced Capabilities (Months 19-24)

| Priority | Integration                                       | Milestone                   |
| -------- | ------------------------------------------------- | --------------------------- |
| **P1**   | Unified HRIS API (Merge/Finch)                    | 50+ HRIS platform coverage  |
| **P1**   | API v2 preview program                            | Next-generation API         |
| **P1**   | Real-time risk correlation with EDR               | Advanced threat correlation |
| **P2**   | FedRAMP authorization (if pursuing public sector) | Government market access    |
| **P2**   | Custom integration SDK (connector framework)      | Partner-built integrations  |
| **P2**   | Marketplace for community integrations            | Ecosystem growth            |

---

## 9. Appendices

### Appendix A: Integration Authentication Summary

| Integration Type   | Primary Auth Method                     | Fallback Auth Method |
| ------------------ | --------------------------------------- | -------------------- |
| SIEM (Splunk)      | HEC Token                               | API Key              |
| SIEM (QRadar)      | Certificate (mTLS)                      | API Key              |
| SIEM (Sentinel)    | Azure AD Service Principal              | Workspace Key        |
| SIEM (Elastic)     | API Key                                 | Basic Auth           |
| SOAR (XSOAR)       | API Key                                 | Basic Auth           |
| SOAR (Swimlane)    | OAuth 2.0 Client Credentials            | API Key              |
| IdP (Okta)         | OAuth 2.0                               | SAML 2.0             |
| IdP (Entra ID)     | OAuth 2.0 (Microsoft Identity Platform) | SAML 2.0             |
| IdP (Ping)         | OAuth 2.0                               | SAML 2.0             |
| HRIS (Workday)     | OAuth 2.0                               | API Key              |
| HRIS (BambooHR)    | API Key                                 | N/A                  |
| HRIS (ADP)         | OAuth 2.0 (ADP Marketplace)             | N/A                  |
| ITSM (ServiceNow)  | OAuth 2.0                               | Basic Auth           |
| ITSM (Jira)        | OAuth 2.0 (Atlassian)                   | API Token            |
| GRC (ServiceNow)   | OAuth 2.0                               | Basic Auth           |
| GRC (RSA Archer)   | API Token                               | Basic Auth           |
| GRC (OneTrust)     | OAuth 2.0                               | API Key              |
| Email (Proofpoint) | API Key                                 | N/A                  |
| Email (Mimecast)   | OAuth 2.0                               | Application Key      |
| Email (Microsoft)  | Graph API (OAuth 2.0)                   | N/A                  |
| Email (Google)     | Service Account (OAuth 2.0)             | N/A                  |
| Comms (Teams)      | Bot Framework Token                     | N/A                  |
| Comms (Slack)      | OAuth 2.0 V2 (Bot Token)                | N/A                  |

### Appendix B: Data Flow Diagram -- Integration Hub

```
                 +-------------------+
                 |   Event Bus       |
                 |   (Kafka)         |
                 +--------+----------+
                          |
                          v
              +-----------+-----------+
              |   Integration Hub     |
              |                       |
              |  +------------------+ |
              |  | Connector        | |
              |  | Registry         | |
              |  +------------------+ |
              |                       |
              |  +------------------+ |
              |  | Transformation   | |
              |  | Engine           | |
              |  +------------------+ |
              |                       |
              |  +------------------+ |
              |  | Delivery         | |
              |  | Manager          | |
              |  +------------------+ |
              |                       |
              |  +------------------+ |
              |  | Retry / DLQ      | |
              |  | Handler          | |
              |  +------------------+ |
              |                       |
              |  +------------------+ |
              |  | Credential       | |
              |  | Vault            | |
              |  +------------------+ |
              +-----------+-----------+
                          |
         +-------+-------+-------+-------+-------+
         |       |       |       |       |       |
         v       v       v       v       v       v
      +-----+ +-----+ +-----+ +-----+ +-----+ +-----+
      |SIEM | |SOAR | |ITSM | |HRIS | |GRC  | |Comms|
      +-----+ +-----+ +-----+ +-----+ +-----+ +-----+
```

### Appendix C: Event Schema Example

```json
{
  "$schema": "https://schema.thedmz.io/events/v1/phishing.email.clicked.json",
  "event_id": "01913a3c-7e4b-7d90-b4b2-1a2b3c4d5e6f",
  "event_type": "phishing.email.clicked",
  "event_version": "1.0",
  "timestamp": "2025-07-15T14:30:00.000Z",
  "tenant_id": "tenant_abc123",
  "data": {
    "campaign_id": "camp_xyz789",
    "campaign_name": "Q3 2025 Executive Phishing Test",
    "template_id": "tmpl_001",
    "template_category": "credential_harvest",
    "user": {
      "user_id": "user_456",
      "email": "jane.doe@example.com",
      "department": "Finance",
      "location": "New York",
      "manager_email": "john.smith@example.com",
      "risk_score_before": 42,
      "risk_score_after": 58
    },
    "interaction": {
      "type": "link_clicked",
      "timestamp": "2025-07-15T14:30:00.000Z",
      "source_ip": "203.0.113.42",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "device_type": "desktop",
      "landing_page_reached": true,
      "credential_submitted": false,
      "time_to_click_seconds": 47
    }
  },
  "metadata": {
    "source_service": "simulation-service",
    "source_version": "2.3.1",
    "correlation_id": "corr_aabbccdd"
  }
}
```

### Appendix D: Non-Functional Requirements Summary

| Requirement                       | Target                   | Measurement                         |
| --------------------------------- | ------------------------ | ----------------------------------- |
| API Response Time (P50)           | <100ms                   | Application Performance Monitoring  |
| API Response Time (P99)           | <500ms                   | Application Performance Monitoring  |
| Event Processing Latency (P95)    | <5 seconds               | End-to-end event trace              |
| SIEM Event Delivery Latency (P95) | <30 seconds              | Integration monitoring dashboard    |
| User Provisioning (SCIM)          | <60 seconds              | SCIM sync monitoring                |
| Training Content Load Time (P95)  | <2 seconds               | Real User Monitoring                |
| Report Generation (standard)      | <30 seconds              | Job queue monitoring                |
| Report Generation (complex/large) | <5 minutes               | Job queue monitoring                |
| Platform Availability             | 99.95%                   | Uptime monitoring (external)        |
| Data Durability                   | 99.999999999% (11 nines) | Cloud provider SLA (object storage) |
| Concurrent Users Supported        | 100,000+                 | Load testing (quarterly)            |
| API Throughput                    | 50,000 req/s             | Load testing (quarterly)            |
| Deployment Frequency              | Multiple times per day   | CI/CD metrics                       |
| Mean Time to Recovery (MTTR)      | <30 minutes              | Incident tracking                   |
| Change Failure Rate               | <5%                      | Deployment tracking                 |

### Appendix E: Glossary

| Term     | Definition                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------- |
| **SIEM** | Security Information and Event Management -- centralized security event collection and correlation |
| **SOAR** | Security Orchestration, Automation, and Response -- automated security workflow execution          |
| **SCIM** | System for Cross-domain Identity Management -- standard protocol for user provisioning             |
| **HRIS** | Human Resource Information System -- employee data management platform                             |
| **ITSM** | IT Service Management -- IT operations ticketing and workflow platform                             |
| **GRC**  | Governance, Risk, and Compliance -- organizational risk and compliance management                  |
| **HEC**  | HTTP Event Collector -- Splunk's API for ingesting events over HTTPS                               |
| **CEF**  | Common Event Format -- standard log format for security events                                     |
| **LEEF** | Log Event Extended Format -- IBM's standard log format for QRadar                                  |
| **KQL**  | Kusto Query Language -- Microsoft's query language for Sentinel/Log Analytics                      |
| **ECS**  | Elastic Common Schema -- Elastic's standardized field naming convention                            |
| **CIM**  | Common Information Model -- Splunk's standardized data model                                       |
| **mTLS** | Mutual TLS -- bidirectional certificate-based authentication                                       |
| **RBAC** | Role-Based Access Control -- permission model based on user roles                                  |
| **DLQ**  | Dead Letter Queue -- storage for messages that failed processing                                   |
| **CQRS** | Command Query Responsibility Segregation -- pattern separating read and write operations           |
| **HPA**  | Horizontal Pod Autoscaler -- Kubernetes automatic scaling mechanism                                |
| **KEDA** | Kubernetes Event-Driven Autoscaling -- event-based scaling for Kubernetes                          |
| **WAL**  | Write-Ahead Log -- database durability mechanism                                                   |
| **ILM**  | Index Lifecycle Management -- Elasticsearch index management policy                                |
| **SBOM** | Software Bill of Materials -- inventory of software components                                     |
| **SAST** | Static Application Security Testing -- source code security analysis                               |
| **DAST** | Dynamic Application Security Testing -- running application security analysis                      |
| **SCA**  | Software Composition Analysis -- dependency vulnerability scanning                                 |
| **IaC**  | Infrastructure as Code -- managing infrastructure via version-controlled code                      |
| **APQ**  | Automatic Persisted Queries -- GraphQL optimization technique                                      |

---

_This document is a living specification. It will be revised as integration requirements evolve, new platforms emerge, and customer feedback is incorporated. All changes are tracked in version control alongside the platform codebase._

**Document Control:**

| Version | Date       | Author                                   | Changes         |
| ------- | ---------- | ---------------------------------------- | --------------- |
| 1.0     | 2026-02-05 | Enterprise Integration Architecture Team | Initial release |
