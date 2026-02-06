# Enterprise Learning Management & Training Delivery Requirements

## Business Requirements Document -- Cybersecurity Awareness Training Platform

**Document ID:** BRD-03
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Enterprise Architecture
**Project:** The DMZ: Archive Gate -- Cybersecurity Awareness Training Platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [LMS Integration Standards & Platform Compatibility](#2-lms-integration-standards--platform-compatibility)
3. [Content Delivery Architecture](#3-content-delivery-architecture)
4. [Phishing Simulation Engine](#4-phishing-simulation-engine)
5. [Training Content Types & Modalities](#5-training-content-types--modalities)
6. [Curriculum Management & Learning Paths](#6-curriculum-management--learning-paths)
7. [User Management & Identity Integration](#7-user-management--identity-integration)
8. [Campaign Management & Automation](#8-campaign-management--automation)
9. [Mobile Learning Platform](#9-mobile-learning-platform)
10. [Compliance & Regulatory Alignment](#10-compliance--regulatory-alignment)
11. [Analytics & Reporting](#11-analytics--reporting)
12. [Technical Architecture Summary](#12-technical-architecture-summary)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

This document specifies the enterprise learning management and training delivery requirements for a cybersecurity awareness training platform built around The DMZ: Archive Gate. The platform must deliver immersive, gamified security awareness training -- anchored in a narrative where a Stuxnet variant has destroyed most of the public internet and employees must learn to identify phishing, social engineering, and supply chain threats in a high-stakes environment.

The enterprise deployment of this training platform requires seamless integration with existing corporate Learning Management Systems (LMS), Human Capital Management (HCM) platforms, identity providers, and campaign management workflows. This document defines the technical specifications, functional requirements, and operational standards required to deliver cybersecurity awareness training at enterprise scale across organizations ranging from 500 to 500,000+ employees.

### 1.1 Scope

This BRD covers eight primary requirement domains:

- **LMS Integration** -- Standards-based interoperability with enterprise learning ecosystems
- **Content Delivery** -- Microlearning, adaptive paths, and retention-optimized delivery
- **Phishing Simulation** -- Realistic attack simulation with behavioral measurement
- **Training Content** -- Interactive, multi-modal content types and assessment frameworks
- **Curriculum Management** -- Role-based paths, localization, and content customization
- **User Management** -- Enterprise identity, provisioning, and access control
- **Campaign Management** -- Automated enrollment, scheduling, and escalation
- **Mobile Learning** -- Cross-platform delivery with offline capability

### 1.2 Business Objectives

| Objective                                    | Target Metric                              |
| -------------------------------------------- | ------------------------------------------ |
| Reduce organizational phish-prone percentage | From ~30% baseline to <5% within 12 months |
| Achieve training completion rates            | >90% within assigned deadlines             |
| Maintain learner engagement scores           | >4.0/5.0 average satisfaction              |
| Achieve regulatory compliance coverage       | 100% of required personnel trained         |
| Reduce mean time to report suspicious emails | <5 minutes from receipt                    |
| Support concurrent enterprise deployments    | 50+ tenant organizations simultaneously    |

---

## 2. LMS Integration Standards & Platform Compatibility

### 2.1 eLearning Standards Support

The platform must support all major eLearning interoperability standards to ensure compatibility across the fragmented enterprise LMS landscape. Each standard serves a distinct purpose in the learning technology ecosystem and must be implemented according to its full specification.

#### 2.1.1 SCORM 1.2

**Requirement Level:** MANDATORY

SCORM 1.2 (Sharable Content Object Reference Model) remains the most universally supported eLearning standard across enterprise LMS platforms. Despite being superseded by SCORM 2004, SCORM 1.2 maintains the broadest installed base and must be supported for backward compatibility.

**Technical Requirements:**

| Requirement       | Specification                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime API       | Full implementation of the SCORM 1.2 Runtime Environment API                                                                           |
| Data Model        | Complete `cmi` data model support including `cmi.core.lesson_status`, `cmi.core.score`, `cmi.suspend_data`, `cmi.core.lesson_location` |
| Content Packaging | IMS Content Packaging 1.1.4 compliant manifest files (`imsmanifest.xml`)                                                               |
| SCO Communication | JavaScript API adapter using `API` object discovery via DOM hierarchy traversal                                                        |
| Status Tracking   | Support for `passed`, `completed`, `failed`, `incomplete`, `browsed`, `not attempted`                                                  |
| Score Reporting   | `cmi.core.score.raw`, `cmi.core.score.min`, `cmi.core.score.max`                                                                       |
| Bookmark/Resume   | `cmi.core.lesson_location` for session persistence                                                                                     |
| Suspend Data      | Minimum 4,096 characters in `cmi.suspend_data` for state persistence                                                                   |
| Packaging         | ZIP-based PIF (Package Interchange Format) with manifest at root                                                                       |
| Launch Mechanism  | Content launched via LMS in new window or iframe with API adapter accessible                                                           |

**Functional Requirements:**

- FR-SCORM12-001: The platform SHALL export all training modules as SCORM 1.2 compliant packages.
- FR-SCORM12-002: The platform SHALL generate valid `imsmanifest.xml` files with proper organization, resources, and metadata elements.
- FR-SCORM12-003: SCOs SHALL implement the full SCORM 1.2 Runtime API (`LMSInitialize`, `LMSFinish`, `LMSGetValue`, `LMSSetValue`, `LMSCommit`, `LMSGetLastError`, `LMSGetErrorString`, `LMSGetDiagnostic`).
- FR-SCORM12-004: The platform SHALL support multi-SCO packages with sequencing defined through prerequisite rules in the manifest.
- FR-SCORM12-005: All SCORM 1.2 packages SHALL pass ADL SCORM conformance testing.

#### 2.1.2 SCORM 2004 (Editions 2, 3, and 4)

**Requirement Level:** MANDATORY

SCORM 2004 introduces sequencing and navigation capabilities essential for adaptive learning paths and branching scenarios central to the platform's cybersecurity training methodology.

**Technical Requirements:**

| Requirement       | Specification                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime API       | SCORM 2004 RTE API (`Initialize`, `Terminate`, `GetValue`, `SetValue`, `Commit`, `GetLastError`, `GetErrorString`, `GetDiagnostic`)                                |
| Data Model        | IEEE 1484.11.1-2004 data model (`cmi.completion_status`, `cmi.success_status`, `cmi.score.scaled`, `cmi.interactions`)                                             |
| Sequencing        | IMS Simple Sequencing 1.0 with activity trees, sequencing rules, rollup rules, and navigation controls                                                             |
| Navigation        | Adl.nav.request for `continue`, `previous`, `choice`, `exit`, `exitAll`, `abandon`, `abandonAll`                                                                   |
| Objectives        | Global and local objectives with objective mapping for cross-activity state sharing                                                                                |
| Interactions      | Full `cmi.interactions` array support for `true-false`, `choice`, `fill-in`, `long-fill-in`, `matching`, `performance`, `sequencing`, `likert`, `numeric`, `other` |
| Scaled Score      | `cmi.score.scaled` (-1.0 to 1.0) as primary score mechanism                                                                                                        |
| Content Packaging | IMS Content Packaging 1.1.4 with SCORM 2004 CAM (Content Aggregation Model) extensions                                                                             |

**Functional Requirements:**

- FR-SCORM04-001: The platform SHALL export training modules as SCORM 2004 4th Edition compliant packages.
- FR-SCORM04-002: Sequencing and navigation rules SHALL support branching scenarios where learner performance on phishing identification exercises determines subsequent content delivery.
- FR-SCORM04-003: The platform SHALL use SCORM 2004 objectives to track mastery across multiple security awareness competency domains (phishing identification, password hygiene, data handling, incident reporting, social engineering resistance).
- FR-SCORM04-004: Interaction data SHALL capture individual question-level responses for detailed analytics on learner behavior during scenario-based assessments.
- FR-SCORM04-005: The platform SHALL support SCORM 2004 Editions 2, 3, and 4 to maximize LMS compatibility.
- FR-SCORM04-006: All SCORM 2004 packages SHALL pass ADL SCORM 2004 conformance testing using the ADL Test Suite.

#### 2.1.3 xAPI (Experience API / Tin Can API)

**Requirement Level:** MANDATORY

xAPI (specification version 1.0.3 and 2.0) is essential for capturing learning experiences that occur outside the traditional LMS environment -- including phishing simulation responses, in-app security decisions during gameplay, informal learning activities, and mobile/offline learning events.

**Technical Requirements:**

| Requirement        | Specification                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Statement Format   | JSON-LD compliant xAPI statements following the `Actor-Verb-Object` triple pattern                                                                                      |
| LRS Compatibility  | Full conformance with xAPI LRS requirements; compatible with any conformant LRS (Learning Locker, Watershed, Veracity, SCORM Cloud)                                     |
| Authentication     | OAuth 1.0a or HTTP Basic Authentication for LRS communication                                                                                                           |
| Verb Registry      | Use of ADL Verb Registry and custom verb extensions under a platform-controlled IRI namespace                                                                           |
| Activity Types     | Custom activity types for `phishing-simulation`, `scenario-decision`, `knowledge-check`, `gamified-assessment`, `policy-acknowledgment`                                 |
| Context Extensions | Organizational context (`department`, `role`, `risk-tier`), campaign context (`campaign-id`, `simulation-wave`), environmental context (`device-type`, `location-type`) |
| Result Extensions  | Detailed result data including `response-time-ms`, `confidence-level`, `attempts-count`, `hint-usage`                                                                   |
| State API          | Activity state persistence for cross-session and cross-device continuity                                                                                                |
| Agent Profile      | Learner profile storage for adaptive learning algorithm data                                                                                                            |
| Voiding            | Statement voiding support for data correction and GDPR compliance                                                                                                       |

**Functional Requirements:**

- FR-XAPI-001: The platform SHALL emit xAPI statements for ALL learning-relevant interactions, including but not limited to: module launches, completions, assessment responses, phishing simulation clicks, email report actions, scenario decisions, and gamification achievements.
- FR-XAPI-002: The platform SHALL support forwarding xAPI statements to one or more external LRS endpoints configured per tenant organization.
- FR-XAPI-003: The platform SHALL include a built-in LRS for organizations that do not operate their own, with full xAPI query API support.
- FR-XAPI-004: xAPI statement batching SHALL be supported with configurable flush intervals (default: 30 seconds or 50 statements, whichever comes first).
- FR-XAPI-005: The platform SHALL implement the xAPI State API to enable cross-device learning continuity (e.g., starting a module on desktop and resuming on mobile).
- FR-XAPI-006: All xAPI statements SHALL include a `context.extensions` object containing the tenant organization identifier, campaign identifier (if applicable), and learner risk-tier classification.
- FR-XAPI-007: The platform SHALL support xAPI profiles/recipes for cybersecurity training, defining standardized verb-activity combinations for industry-consistent analytics.
- FR-XAPI-008: The platform SHALL support cmi5 (the xAPI companion specification for LMS-launched content) as a bridge between SCORM-style launch and xAPI data collection.

**xAPI Verb Vocabulary (Platform-Specific):**

| Verb IRI                                             | Display               | Usage Context                                                    |
| ---------------------------------------------------- | --------------------- | ---------------------------------------------------------------- |
| `https://thedmz.io/xapi/verbs/identified-phish`      | Identified Phish      | Learner correctly reported a simulated phishing email            |
| `https://thedmz.io/xapi/verbs/clicked-phish`         | Clicked Phish         | Learner clicked a link in a simulated phishing email             |
| `https://thedmz.io/xapi/verbs/submitted-credentials` | Submitted Credentials | Learner entered credentials on a simulated phishing landing page |
| `https://thedmz.io/xapi/verbs/approved-access`       | Approved Access       | Learner approved an access request in the DMZ scenario           |
| `https://thedmz.io/xapi/verbs/denied-access`         | Denied Access         | Learner denied an access request in the DMZ scenario             |
| `https://thedmz.io/xapi/verbs/detected-threat`       | Detected Threat       | Learner correctly identified a threat indicator                  |
| `https://thedmz.io/xapi/verbs/missed-threat`         | Missed Threat         | Learner failed to identify a threat indicator                    |
| `https://thedmz.io/xapi/verbs/upgraded-facility`     | Upgraded Facility     | Learner completed a facility upgrade decision in gameplay        |
| `https://thedmz.io/xapi/verbs/paid-ransom`           | Paid Ransom           | Learner paid a ransom after a simulated breach                   |
| `https://thedmz.io/xapi/verbs/earned-badge`          | Earned Badge          | Learner earned an achievement badge                              |

#### 2.1.4 LTI (Learning Tools Interoperability)

**Requirement Level:** MANDATORY

LTI enables the platform to function as an external tool provider that integrates seamlessly into existing LMS interfaces. This is particularly important for organizations that want to deliver DMZ training content directly within their existing learning environment without requiring learners to navigate to a separate platform.

**Technical Requirements:**

| Requirement       | Specification                                                                           |
| ----------------- | --------------------------------------------------------------------------------------- |
| LTI Version       | LTI 1.3 with LTI Advantage (mandatory); LTI 1.1 (backward compatibility)                |
| Launch Types      | Basic launch, deep linking (LTI Content-Item / Deep Linking 2.0)                        |
| Services          | Assignment and Grade Services (AGS) 2.0 for score passback                              |
| Services          | Names and Role Provisioning Services (NRPS) 2.0 for roster sync                         |
| Authentication    | OpenID Connect (OIDC) launch flow with platform-initiated login                         |
| Security          | RS256 JWT-based message signing; JWKS endpoint for public key distribution              |
| Content Selection | Deep Linking for instructor/admin-driven content selection within LMS                   |
| Placement         | Support for course navigation, assignment, editor button, and link selection placements |
| Claims            | Standard LTI claims plus custom claims for organizational context                       |

**Functional Requirements:**

- FR-LTI-001: The platform SHALL function as an LTI 1.3 Tool Provider, enabling any LTI-compliant LMS to embed DMZ training modules and phishing simulation dashboards.
- FR-LTI-002: The platform SHALL support LTI Deep Linking to allow LMS administrators to browse and select specific training modules, campaigns, or learning paths for embedding.
- FR-LTI-003: Assignment and Grade Services SHALL be implemented to pass completion status, scores, and competency achievements back to the LMS gradebook.
- FR-LTI-004: Names and Role Provisioning Services SHALL be used to synchronize enrolled learners and their roles for automatic role-based content assignment.
- FR-LTI-005: The platform SHALL support LTI 1.1 with OAuth 1.0a for backward compatibility with legacy LMS deployments.
- FR-LTI-006: LTI launches SHALL support single sign-on, eliminating the need for separate platform credentials.
- FR-LTI-007: The platform SHALL provide an LTI configuration URL (JSON) and manual configuration parameters (client ID, deployment ID, OIDC auth endpoint, JWKS URL, token endpoint) for each supported LMS.

#### 2.1.5 AICC (Aviation Industry Computer-Based Training Committee)

**Requirement Level:** RECOMMENDED (for legacy system compatibility)

While AICC has been officially sunset, many legacy LMS deployments -- particularly in government, defense, and heavily regulated industries -- still rely on AICC protocols. Given that cybersecurity training frequently targets these sectors, AICC support is necessary.

**Technical Requirements:**

| Requirement   | Specification                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Protocol      | HACP (HTTP-based AICC/CMI Protocol)                                                                 |
| Communication | HTTP POST-based communication between content and LMS                                               |
| Data Elements | CMI data model elements: `core.lesson_status`, `core.score`, `core.lesson_location`, `suspend_data` |
| Launch        | URL-based launch with `aicc_sid` and `aicc_url` parameters                                          |
| Commands      | `GetParam`, `PutParam`, `ExitAU`, `PutInteractions`, `PutComments`, `PutPath`                       |

**Functional Requirements:**

- FR-AICC-001: The platform SHALL support AICC HACP protocol for content launch and data exchange with legacy LMS platforms.
- FR-AICC-002: AICC packages SHALL include proper course structure files (`.au`, `.crs`, `.des`, `.cst`) for LMS import.
- FR-AICC-003: The platform SHALL handle AICC session management including `GetParam` initialization and `PutParam` data persistence.

### 2.2 Enterprise LMS Platform Compatibility

The platform must provide verified, tested integrations with the following enterprise LMS/LXP platforms. Each integration must include documentation, configuration guides, and dedicated support.

#### 2.2.1 Cornerstone OnDemand (CSOD)

| Integration Point | Method                                                 | Details                                                               |
| ----------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Content Import    | SCORM 1.2/2004 package upload                          | Via Cornerstone Content Management                                    |
| Content Delivery  | LTI 1.3 Tool Provider                                  | Inline embed within Cornerstone learning assignments                  |
| Grade Passback    | LTI AGS or SCORM completion                            | Completion and score sync to Cornerstone transcript                   |
| User Sync         | SCIM 2.0 or Cornerstone REST API                       | Bidirectional user and group synchronization                          |
| SSO               | SAML 2.0 federated                                     | Cornerstone as SP, customer IdP as IdP, platform as secondary SP      |
| Catalog Listing   | Cornerstone Content Anytime connector                  | Automated catalog listing with metadata, thumbnails, and descriptions |
| Reporting         | xAPI statement forwarding + Cornerstone Custom Reports | Phishing simulation data available in Cornerstone reporting           |
| Enrollment        | Cornerstone REST API webhook                           | Automated enrollment triggers based on Cornerstone events             |

**Implementation Notes:**

- Cornerstone requires SCORM packages to include specific metadata tags for proper catalog classification.
- LTI integration requires registration through Cornerstone's Edge Marketplace or direct tool registration.
- The Cornerstone REST API v2 should be used for user synchronization; legacy SOAP APIs are deprecated.
- Custom report data sources can be populated via Cornerstone's Data Load Wizard using xAPI-derived CSV exports.

#### 2.2.2 SAP SuccessFactors Learning

| Integration Point | Method                                  | Details                                                                |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Content Import    | SCORM 1.2/2004 package upload           | Via SF Learning content management; AICC also supported natively       |
| Content Delivery  | LTI 1.3 or embedded SCORM               | SF Learning supports both inline SCORM and LTI tool launch             |
| Grade Passback    | SCORM data model or LTI AGS             | `cmi.core.lesson_status` and `cmi.core.score` mapped to SF item status |
| User Sync         | SAP SuccessFactors OData API or SCIM    | User and assignment sync via the SF HCM OData API                      |
| SSO               | SAML 2.0 federated with SAP IAS         | Integration via SAP Identity Authentication Service                    |
| Catalog Listing   | SF Learning Content Connector           | Structured content metadata with competency mapping                    |
| Reporting         | SF Learning Analytics + xAPI forwarding | Custom reporting through SF People Analytics                           |
| Assignment        | SF Learning Assignment API              | Rule-based automatic assignment by job code, department, or location   |

**Implementation Notes:**

- SAP SuccessFactors Learning supports SCORM 1.2 and SCORM 2004 API calls natively; however, certain SCORM 2004 sequencing features may behave differently than the ADL reference implementation.
- The OData API (v2 and v4) provides comprehensive user, assignment, and completion management.
- AICC HACP protocol is natively supported, making it a viable option for organizations with strict proxy/firewall configurations that interfere with JavaScript-based SCORM API communication.
- Content must comply with SAP's content packaging guidelines, including specific manifest metadata extensions.

#### 2.2.3 Workday Learning

| Integration Point | Method                                         | Details                                                                 |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Content Import    | SCORM 1.2/2004 or linked content               | Workday supports SCORM package hosting and external URL links           |
| Content Delivery  | LTI 1.3 (preferred) or SCORM                   | LTI provides richer integration within Workday's learning experience    |
| Grade Passback    | LTI AGS or SCORM completion                    | Mapped to Workday Learning completion events and transcript records     |
| User Sync         | Workday REST API (Prism Analytics) or SCIM 2.0 | Leveraging Workday's HCM data model for organizational context          |
| SSO               | SAML 2.0 or OIDC via Workday IdP               | Workday can act as both IdP and SP in federated configurations          |
| Catalog Listing   | Workday Learning Content API                   | Automated course listing with competency and skill tag mapping          |
| Reporting         | Workday Prism Analytics + xAPI                 | Custom analytics dashboards combining training and HR data              |
| Enrollment        | Workday Business Process Framework             | Triggering enrollment through Workday BP events (new hire, role change) |

**Implementation Notes:**

- Workday Learning favors LTI 1.3 for third-party tool integration; SCORM support exists but with some limitations on SCORM 2004 advanced sequencing.
- Workday's SCIM 2.0 implementation supports user provisioning and group membership synchronization.
- The Workday Business Process Framework enables powerful event-driven enrollment automation (e.g., automatically assigning security awareness training upon hire, department transfer, or promotion).
- Workday Prism Analytics can ingest xAPI data for combined HR-security analytics (e.g., correlating phishing click rates with department, tenure, or job level).

#### 2.2.4 Moodle

| Integration Point | Method                                             | Details                                                  |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Content Import    | SCORM 1.2/2004 package upload                      | Native Moodle SCORM/AICC activity module                 |
| Content Delivery  | LTI 1.3 External Tool                              | Configured as external tool in Moodle course structure   |
| Grade Passback    | LTI AGS or SCORM gradebook sync                    | Automatic grade sync to Moodle gradebook                 |
| User Sync         | Moodle Web Services REST API or LDAP               | API-based user creation and enrollment management        |
| SSO               | SAML 2.0 (via plugin), OAuth 2.0, OIDC             | Moodle SAML2 plugin or OpenID Connect plugin             |
| Catalog Listing   | Moodle Web Services Course API                     | Programmatic course creation and content deployment      |
| Reporting         | Moodle Completion API + xAPI (via Logstore plugin) | xAPI logstore plugin forwards statements to external LRS |
| Enrollment        | Moodle Enrollment API                              | Cohort-based and manual enrollment via REST API          |

**Implementation Notes:**

- Moodle's open-source nature allows for deep customization; a dedicated Moodle plugin can provide richer integration than standard LTI.
- The Moodle xAPI Logstore plugin (Logstore xAPI) can forward native Moodle events as xAPI statements to the platform's LRS, enabling unified analytics.
- Moodle supports SCORM 1.2 and 2004 natively with comprehensive data model support.
- For large-scale deployments, Moodle Workplace (the enterprise edition) provides multi-tenancy and enhanced reporting that aligns with enterprise requirements.

#### 2.2.5 Canvas (Instructure)

| Integration Point | Method                                            | Details                                                  |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------- |
| Content Import    | SCORM package via Canvas Commons or direct upload | Via External Apps or Modules                             |
| Content Delivery  | LTI 1.3 (native support, preferred method)        | Canvas has best-in-class LTI 1.3 support                 |
| Grade Passback    | LTI AGS with line item management                 | Full assignment-level grade sync with Canvas assignments |
| User Sync         | Canvas REST API or SIS Import (CSV/API)           | Comprehensive user, course, and enrollment management    |
| SSO               | SAML 2.0, OIDC, CAS                               | Canvas natively supports multiple SSO protocols          |
| Catalog Listing   | Canvas Catalog API or LTI Deep Linking            | Learner-facing course catalog integration                |
| Reporting         | Canvas Data 2 (API) + xAPI forwarding             | Canvas Data 2 provides comprehensive analytics export    |
| Enrollment        | Canvas SIS API or REST Enrollment API             | Automated enrollment via SIS integration or API calls    |

**Implementation Notes:**

- Canvas has the most mature LTI 1.3 Advantage implementation in the industry; LTI is the strongly preferred integration method.
- Canvas supports LTI Dynamic Registration (OpenID Connect Discovery), enabling simplified tool installation.
- The Canvas REST API is comprehensive and well-documented, supporting all aspects of course management, user management, and content delivery.
- SCORM packages in Canvas are typically delivered via an LTI-based SCORM player (e.g., SCORM Cloud) rather than a native SCORM engine, which may require additional configuration.

### 2.3 Additional Platform Compatibility Requirements

| Platform         | Integration Method              | Priority |
| ---------------- | ------------------------------- | -------- |
| Docebo           | LTI 1.3, SCORM, REST API        | HIGH     |
| Absorb LMS       | LTI 1.3, SCORM, API             | HIGH     |
| TalentLMS        | SCORM, xAPI, REST API           | MEDIUM   |
| Litmos (SAP)     | SCORM, LTI, API                 | MEDIUM   |
| Blackboard Learn | LTI 1.3, SCORM, Building Blocks | MEDIUM   |
| D2L Brightspace  | LTI 1.3 Advantage, SCORM        | MEDIUM   |
| Totara Learn     | SCORM, LTI, API (Moodle-based)  | MEDIUM   |
| 360Learning      | LTI, SCORM, API                 | LOW      |
| LearnUpon        | SCORM, LTI, API                 | LOW      |
| Google Classroom | LTI 1.3, Assignments API        | LOW      |

### 2.4 Integration Testing Requirements

- INT-TEST-001: All SCORM packages SHALL pass the ADL SCORM Conformance Test Suite for both SCORM 1.2 and 2004.
- INT-TEST-002: LTI integration SHALL be validated using the IMS Global LTI Certification Suite.
- INT-TEST-003: Each enterprise LMS integration SHALL be validated through a dedicated test environment with end-to-end testing covering: content launch, progress tracking, completion reporting, score passback, SSO authentication, and user synchronization.
- INT-TEST-004: Integration regression tests SHALL be executed quarterly and upon any major platform version update.
- INT-TEST-005: The platform SHALL maintain a public integration compatibility matrix documenting verified LMS platforms, versions, and supported features.

---

## 3. Content Delivery Architecture

### 3.1 Microlearning Framework (2-5 Minute Modules)

Research demonstrates that microlearning drives 50% higher engagement rates and significantly better knowledge retention compared to traditional long-form training, making it the optimal delivery method for cybersecurity awareness content where sustained attention is critical.

#### 3.1.1 Module Structure

| Component             | Duration       | Purpose                                                                           |
| --------------------- | -------------- | --------------------------------------------------------------------------------- |
| Hook/Scenario Setup   | 15-30 seconds  | Narrative context from The DMZ universe; immediate engagement                     |
| Core Concept Delivery | 60-120 seconds | Single focused security concept with visual demonstration                         |
| Interactive Practice  | 60-90 seconds  | Hands-on exercise: phishing identification, decision scenario, or threat analysis |
| Knowledge Check       | 30-60 seconds  | 2-3 assessment questions with immediate feedback                                  |
| Summary/Takeaway      | 15-30 seconds  | Key behavioral reinforcement; connection to real-world application                |

**Total Module Duration:** 3-5 minutes (hard maximum: 7 minutes for complex scenarios)

#### 3.1.2 Microlearning Content Categories

| Category                  | Module Count (Minimum) | Description                                                            |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Phishing Fundamentals     | 12 modules             | Email phishing, spear phishing, whaling, BEC, smishing, vishing        |
| Password & Authentication | 8 modules              | Password hygiene, MFA, passkeys, credential management                 |
| Data Handling             | 10 modules             | Classification, encryption, sharing, disposal, privacy regulations     |
| Social Engineering        | 10 modules             | Pretexting, baiting, tailgating, quid pro quo, authority exploitation  |
| Incident Response         | 8 modules              | Reporting procedures, escalation, evidence preservation, communication |
| Physical Security         | 6 modules              | Clean desk, secure printing, visitor management, device security       |
| Remote Work Security      | 8 modules              | VPN, Wi-Fi security, home network, device management                   |
| Emerging Threats          | 6 modules              | AI-generated attacks, deepfakes, QR code attacks, supply chain         |
| Compliance Essentials     | 8 modules              | GDPR, HIPAA, PCI DSS, SOX, regulatory frameworks                       |
| DMZ Scenario Missions     | 15 modules             | Archive Gate narrative-driven training scenarios                       |

**Functional Requirements:**

- FR-MICRO-001: Each microlearning module SHALL be completable in 2-5 minutes with a hard maximum of 7 minutes.
- FR-MICRO-002: Modules SHALL focus on a single learning objective with no more than 3 key takeaways.
- FR-MICRO-003: All modules SHALL include at least one interactive element (drag-and-drop, click-to-reveal, decision point, or similar).
- FR-MICRO-004: Modules SHALL be independently launchable -- no prerequisite module completion required except where explicitly defined in a learning path sequence.
- FR-MICRO-005: Module content SHALL be authored in a responsive format that renders correctly on screens from 320px to 2560px width.

### 3.2 Just-in-Time Training

Just-in-time (JIT) training delivers contextually relevant security awareness content at the precise moment when a learner demonstrates a security behavior gap or encounters a security-relevant situation.

#### 3.2.1 Trigger Events for JIT Training

| Trigger                                | Content Delivered                                  | Delivery Channel                                 |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Phishing simulation click              | Targeted phishing awareness module                 | Immediate redirect to landing page with training |
| Credential submission on phishing page | Password security + phishing identification module | Immediate landing page + email follow-up         |
| Failed knowledge check                 | Remediation module for specific competency gap     | In-platform assignment                           |
| Policy violation detected (DLP)        | Data handling best practices module                | Email notification with direct training link     |
| Suspicious login attempt reported      | Account security awareness module                  | Push notification + email                        |
| USB device insertion policy event      | Removable media security module                    | Endpoint notification                            |
| External file sharing event            | Data classification and sharing module             | Email notification                               |
| New threat intelligence bulletin       | Threat-specific awareness brief                    | Push notification + in-app alert                 |

#### 3.2.2 JIT Delivery Requirements

- FR-JIT-001: The platform SHALL deliver just-in-time training within 60 seconds of a triggering event.
- FR-JIT-002: JIT training modules SHALL be contextual, referencing the specific behavior that triggered the training without shaming the learner.
- FR-JIT-003: JIT training SHALL be tracked separately from scheduled training in reporting, with clear attribution to the triggering event.
- FR-JIT-004: The platform SHALL support configurable JIT training throttling to prevent learner fatigue (e.g., maximum 2 JIT interventions per week per learner).
- FR-JIT-005: JIT modules SHALL integrate with SIEM/SOAR platforms via webhook or API to receive external trigger events.
- FR-JIT-006: The platform SHALL support "teachable moment" landing pages that are displayed immediately after a phishing simulation failure, combining brief training with the specific email the learner interacted with.

### 3.3 Adaptive Learning Paths

Adaptive learning uses algorithmic personalization to dynamically adjust content difficulty, topic focus, and learning pace based on individual learner performance and behavior data.

#### 3.3.1 Adaptive Algorithm Inputs

| Data Source                                               | Weight | Usage                                                 |
| --------------------------------------------------------- | ------ | ----------------------------------------------------- |
| Phishing simulation performance (click rate, report rate) | 30%    | Primary risk indicator; drives topic prioritization   |
| Knowledge check scores                                    | 25%    | Competency gap identification; difficulty calibration |
| Module completion patterns (time-on-task, skip behavior)  | 15%    | Engagement optimization; pacing adjustment            |
| Role and department risk profile                          | 15%    | Contextual relevance weighting                        |
| Historical training performance (trend analysis)          | 10%    | Long-term learning curve modeling                     |
| Self-reported confidence levels                           | 5%     | Metacognitive calibration                             |

#### 3.3.2 Adaptation Mechanisms

| Mechanism                  | Description                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Difficulty Scaling         | Adjusts scenario complexity based on demonstrated competency (e.g., basic phishing emails for beginners versus sophisticated BEC scenarios for advanced learners) |
| Topic Prioritization       | Reorders learning path to front-load topics where the learner shows the greatest knowledge gaps                                                                   |
| Content Modality Switching | Shifts between video, interactive, text, and scenario formats based on engagement metrics for each modality                                                       |
| Assessment Frequency       | Increases checkpoint frequency for struggling learners; reduces for high-performers to avoid fatigue                                                              |
| Reinforcement Scheduling   | Triggers spaced repetition reviews for concepts where retention has decayed                                                                                       |
| Challenge Escalation       | Introduces progressively more sophisticated threat scenarios as competency increases                                                                              |

**Functional Requirements:**

- FR-ADAPT-001: The platform SHALL implement an adaptive learning engine that dynamically adjusts content selection, ordering, and difficulty for each learner.
- FR-ADAPT-002: Adaptive path adjustments SHALL occur in real-time after each completed module or assessment.
- FR-ADAPT-003: The adaptive engine SHALL maintain a learner competency model across the following domains: phishing identification, password security, data handling, social engineering resistance, incident response, physical security, and compliance awareness.
- FR-ADAPT-004: Administrators SHALL be able to set minimum competency thresholds per domain that trigger mandatory remediation regardless of adaptive path optimization.
- FR-ADAPT-005: The adaptive engine SHALL provide transparency through a learner-facing competency dashboard showing strengths, growth areas, and recommended next steps.
- FR-ADAPT-006: The platform SHALL support A/B testing of adaptive algorithm parameters to continuously optimize learning outcomes.

### 3.4 Spaced Repetition for Retention

Research demonstrates that revisiting technical content at increasing intervals improves skill retention by 50% compared to single-session learning. Spaced repetition is a cornerstone of the platform's approach to ensuring long-term behavioral change in security awareness.

#### 3.4.1 Spaced Repetition Algorithm

The platform SHALL implement a modified Leitner system combined with SM-2 (SuperMemo) algorithm principles, tailored for security awareness training.

| Retention Level | Initial Interval | Success Multiplier | Failure Multiplier | Maximum Interval |
| --------------- | ---------------- | ------------------ | ------------------ | ---------------- |
| New Concept     | 1 day            | 2.5x               | Reset to 1 day     | N/A              |
| Level 1         | 3 days           | 2.5x               | Reset to 1 day     | N/A              |
| Level 2         | 7 days           | 2.0x               | Level 1 (3 days)   | N/A              |
| Level 3         | 14 days          | 2.0x               | Level 2 (7 days)   | N/A              |
| Level 4         | 30 days          | 1.5x               | Level 3 (14 days)  | N/A              |
| Level 5         | 60 days          | 1.5x               | Level 4 (30 days)  | N/A              |
| Mastered        | 90 days          | N/A                | Level 5 (60 days)  | 180 days         |

#### 3.4.2 Spaced Repetition Content Types

| Content Type     | Repetition Format                                                | Duration                         |
| ---------------- | ---------------------------------------------------------------- | -------------------------------- |
| Concept Review   | Quick-fire flashcard quiz (5-10 questions)                       | 60-90 seconds                    |
| Scenario Refresh | Abbreviated scenario with single decision point                  | 90-120 seconds                   |
| Phishing Re-test | New phishing simulation email targeting previously failed topics | Passive (embedded in email flow) |
| Policy Recall    | Policy statement recognition and application exercise            | 60 seconds                       |
| Threat Update    | Brief update on evolution of previously covered threat type      | 60-90 seconds                    |

**Functional Requirements:**

- FR-SPACE-001: The platform SHALL implement a spaced repetition engine that schedules review activities based on individual learner retention data.
- FR-SPACE-002: Spaced repetition intervals SHALL adjust based on learner performance -- correct responses increase the interval; incorrect responses decrease it.
- FR-SPACE-003: Review activities SHALL be delivered via multiple channels: in-platform notifications, email, push notifications, and embedded in phishing simulation campaigns.
- FR-SPACE-004: The platform SHALL track retention decay curves per learner per competency domain.
- FR-SPACE-005: Spaced repetition review sessions SHALL not exceed 2 minutes in duration.
- FR-SPACE-006: The platform SHALL support "interleaving" -- mixing review topics from different security domains within a single review session to improve discrimination and transfer.
- FR-SPACE-007: Learners SHALL be able to view their upcoming review schedule and optionally complete reviews ahead of schedule.

---

## 4. Phishing Simulation Engine

### 4.1 Campaign Architecture

The phishing simulation engine is a core differentiator, integrating narrative elements from The DMZ: Archive Gate with enterprise-grade phishing simulation capabilities. The system must support realistic, customizable phishing campaigns that measure employee susceptibility and drive behavioral change.

#### 4.1.1 Simulation Types

| Simulation Type                 | Description                                                                    | Difficulty Level |
| ------------------------------- | ------------------------------------------------------------------------------ | ---------------- |
| Mass Phishing                   | Generic phishing emails sent to broad populations                              | Basic            |
| Spear Phishing                  | Targeted emails using organizational context (department, role, recent events) | Intermediate     |
| Whaling                         | Executive-targeted campaigns with high-value pretexts                          | Advanced         |
| Business Email Compromise (BEC) | Impersonation of internal personnel (CEO, CFO, HR) requesting action           | Advanced         |
| Smishing (SMS)                  | Text message-based phishing simulations                                        | Intermediate     |
| Vishing (Voice)                 | Voice-based social engineering simulations (via callback number)               | Advanced         |
| QR Code Phishing (Quishing)     | Malicious QR codes in emails, documents, or physical placements                | Intermediate     |
| Multi-Vector                    | Coordinated campaigns using multiple channels (email + SMS + voice)            | Expert           |
| Supply Chain                    | Simulated compromise via trusted vendor/partner communications                 | Expert           |
| AI-Generated                    | AI-crafted personalized phishing leveraging OSINT data                         | Expert           |

#### 4.1.2 Campaign Configuration Parameters

| Parameter             | Options                                                                           | Description                                   |
| --------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| Target Audience       | All employees, department, role, risk group, custom list, random sample           | Who receives the simulation                   |
| Send Schedule         | Immediate, scheduled date/time, randomized window (e.g., over 5 business days)    | When emails are sent                          |
| Send Throttling       | N emails per hour/minute                                                          | Rate limiting to avoid email system detection |
| Template Selection    | Single template, random from pool, difficulty-matched                             | Which email template(s) to use                |
| Landing Page          | Standard awareness, credential capture, download prompt, MFA prompt               | Post-click experience                         |
| Tracking Duration     | 1-30 days (default: 7 days)                                                       | How long to track interactions                |
| Repeat Policy         | Allow repeat targets, exclude recently simulated, minimum gap between simulations | Preventing simulation fatigue                 |
| Follow-up Training    | None, immediate teachable moment, assigned remediation, manager notification      | Post-failure response                         |
| Difficulty Escalation | Fixed, progressive (increase difficulty on success), adaptive (based on history)  | How difficulty evolves across campaigns       |

### 4.2 Customizable Email Templates

#### 4.2.1 Template Library

The platform SHALL include a minimum of 500 pre-built phishing email templates organized by the following taxonomies:

| Taxonomy          | Categories                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Attack Vector     | Credential harvesting, malware delivery, BEC, invoice fraud, gift card scam, payroll redirect, data exfiltration                                                   |
| Pretext Theme     | IT support, HR notification, delivery notification, financial alert, social media, cloud storage, meeting invite, COVID/health, legal notice, vendor communication |
| Difficulty Level  | Novice (obvious red flags), Intermediate (subtle indicators), Advanced (minimal indicators), Expert (near-indistinguishable from legitimate)                       |
| Industry Vertical | Healthcare, finance, government, education, technology, manufacturing, retail, legal                                                                               |
| Seasonal/Topical  | Tax season, holiday shopping, annual review, benefits enrollment, conference invitations                                                                           |
| The DMZ Themed    | Archive Gate access requests, data center alerts, Matrices GmbH communications, threat intelligence briefings                                                      |

#### 4.2.2 Template Customization Engine

**Functional Requirements:**

- FR-TMPL-001: Administrators SHALL be able to create custom phishing email templates using a WYSIWYG editor with HTML/CSS source editing capability.
- FR-TMPL-002: Templates SHALL support dynamic merge fields: `{{first_name}}`, `{{last_name}}`, `{{full_name}}`, `{{email}}`, `{{department}}`, `{{manager_name}}`, `{{company_name}}`, `{{job_title}}`, `{{office_location}}`, `{{custom_field_N}}`.
- FR-TMPL-003: Templates SHALL support configurable sender display names, sender email addresses (with SPF/DKIM alignment options), reply-to addresses, and custom email headers.
- FR-TMPL-004: The platform SHALL provide template difficulty scoring based on the number and subtlety of phishing indicators present (e.g., mismatched URLs, urgency language, sender anomalies).
- FR-TMPL-005: Templates SHALL support embedded images, attachments (simulated malicious files), and inline tracking pixels.
- FR-TMPL-006: The platform SHALL provide a template preview function showing how the email renders across major email clients (Outlook desktop, Outlook web, Gmail, Apple Mail, mobile clients).
- FR-TMPL-007: Templates SHALL be versionable with change history and approval workflows.
- FR-TMPL-008: The platform SHALL support importing templates from common phishing simulation template formats (KnowBe4, Proofpoint, Cofense compatible exports).

### 4.3 Landing Pages

#### 4.3.1 Landing Page Types

| Type               | Purpose                                                        | Data Captured                                                         |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Awareness Page     | Immediate teachable moment after click                         | Click timestamp, device info, browser info                            |
| Credential Capture | Simulated login page to measure credential submission behavior | Click + submission event + field interaction (NOT actual credentials) |
| Download Prompt    | Simulated malware download to measure download behavior        | Click + download initiation event                                     |
| MFA Prompt         | Simulated MFA code entry to measure MFA bypass susceptibility  | Click + code entry event                                              |
| Redirect Page      | Brief interstitial before redirecting to training              | Click + redirect confirmation                                         |
| Data Entry Form    | Simulated form requesting sensitive information                | Click + form field interaction events                                 |

**CRITICAL SECURITY REQUIREMENT:** The platform SHALL NEVER capture, store, or transmit actual user credentials. Credential capture landing pages SHALL record only the EVENT of submission (timestamp, form field names interacted with) and immediately discard any entered data.

#### 4.3.2 Landing Page Requirements

- FR-LAND-001: The platform SHALL provide a landing page builder with drag-and-drop components for creating custom post-click experiences.
- FR-LAND-002: Landing pages SHALL be brandable with customer organization logos, colors, and messaging.
- FR-LAND-003: All landing pages SHALL include a clearly identifiable "This was a simulation" disclosure within 10 seconds of user interaction.
- FR-LAND-004: Landing pages SHALL be responsive and render correctly on desktop and mobile browsers.
- FR-LAND-005: The platform SHALL provide 50+ pre-built landing page templates matching common phishing pretext themes.
- FR-LAND-006: Landing pages SHALL support A/B testing to optimize teachable moment effectiveness.
- FR-LAND-007: Landing pages SHALL be hosted on configurable domains (customer-provided or platform-provided) with valid TLS certificates.
- FR-LAND-008: Landing pages SHALL automatically embed the corresponding just-in-time training module when configured.

### 4.4 Reporting & Behavioral Metrics

#### 4.4.1 Core Phishing Simulation Metrics

| Metric                         | Definition                                                                                   | Target Benchmark                      |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Click Rate**                 | Percentage of recipients who clicked the phishing link                                       | <5% (industry target after 12 months) |
| **Credential Submission Rate** | Percentage of recipients who submitted credentials on the landing page                       | <2%                                   |
| **Report Rate**                | Percentage of recipients who reported the email as suspicious via the report phishing button | >70%                                  |
| **Report-to-Click Ratio**      | Ratio of reports to clicks (higher is better)                                                | >15:1                                 |
| **Mean Time to Click**         | Average time between email delivery and first click                                          | Tracking only (no target)             |
| **Mean Time to Report**        | Average time between email delivery and first report                                         | <5 minutes                            |
| **Repeat Offender Rate**       | Percentage of clickers who clicked in previous campaigns                                     | <10%                                  |
| **Resilience Score**           | Composite score combining report rate, non-click rate, and speed of reporting                | >85/100                               |
| **Attachment Open Rate**       | Percentage who opened simulated malicious attachments                                        | <3%                                   |
| **Data Entry Rate**            | Percentage who entered data on phishing forms                                                | <2%                                   |

#### 4.4.2 Reporting Dimensions

All metrics SHALL be filterable and aggregable across the following dimensions:

- **Organizational**: Company, division, department, team, cost center
- **Demographic**: Job level (executive, manager, individual contributor), tenure band, location, office
- **Campaign**: Campaign name, template used, difficulty level, simulation type, date range
- **Temporal**: Daily, weekly, monthly, quarterly, year-over-year trends
- **Risk**: Risk tier (critical, high, medium, low), repeat offender status
- **Comparative**: Benchmarking against industry peers, internal baselines, and historical performance

#### 4.4.3 Reporting Requirements

- FR-RPT-001: The platform SHALL provide real-time campaign dashboards updated within 60 seconds of user interactions.
- FR-RPT-002: The platform SHALL generate executive summary reports suitable for board-level presentation, with visual trend lines and industry benchmarking.
- FR-RPT-003: The platform SHALL support scheduled automated report generation and distribution via email (PDF and CSV formats).
- FR-RPT-004: The platform SHALL provide a Phishing Report Button (browser extension and email client plugin for Outlook and Gmail) that captures report events and integrates with the simulation tracking system.
- FR-RPT-005: The platform SHALL integrate with the organization's existing security operations reporting (SIEM integration via syslog, CEF, or API) for correlation of simulation data with real threat data.
- FR-RPT-006: The platform SHALL identify and flag "repeat offenders" (learners who fail multiple simulations) for targeted intervention workflows.
- FR-RPT-007: All reporting data SHALL be exportable via API (REST, GraphQL) for integration with external business intelligence tools (Power BI, Tableau, Looker).
- FR-RPT-008: The platform SHALL provide anonymized benchmarking data comparing organizational performance against industry peers of similar size and sector.

### 4.5 Phishing Report Button

| Feature                | Requirement                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Outlook Desktop Plugin | Native COM add-in and/or web add-in for Outlook 2016+                                                                    |
| Outlook Web (OWA)      | Manifest-based add-in compatible with Exchange Online                                                                    |
| Gmail                  | Chrome extension and Google Workspace add-on                                                                             |
| Apple Mail             | Mail plugin or mailbox rule integration                                                                                  |
| Mobile (iOS/Android)   | Integration with native mail apps via accessibility API or custom mail handler                                           |
| Reporting Workflow     | One-click report that sends email headers and body to platform for classification                                        |
| Feedback Loop          | Immediate classification feedback ("This was a simulation -- great catch!" or "Forwarded to security team for analysis") |
| Integration            | SOAR/SIEM forwarding for real phishing reports; simulation report matching for simulated phishing                        |

---

## 5. Training Content Types & Modalities

### 5.1 Interactive Modules

#### 5.1.1 Interaction Types

| Interaction             | Description                                                                       | Use Case                                         |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Drag-and-Drop           | Categorize emails as legitimate or phishing; classify data by sensitivity level   | Phishing identification, data classification     |
| Click-to-Reveal         | Explore email headers, hover over URLs to inspect, examine document properties    | Email forensics, URL inspection                  |
| Branching Scenarios     | Decision trees where choices lead to different outcomes and consequences          | Incident response, social engineering resistance |
| Simulated Environments  | Realistic replicas of email clients, file systems, login pages                    | Phishing identification, credential security     |
| Timeline Sequencing     | Order incident response steps, arrange security procedures chronologically        | Incident response procedures                     |
| Hotspot Identification  | Identify red flags in screenshots of emails, websites, or documents               | Visual threat detection                          |
| Configuration Exercises | Simulate configuring security settings (MFA, privacy settings, password managers) | Practical security skills                        |
| Chat Simulations        | Interactive chat-based social engineering scenarios                               | Social engineering awareness                     |

#### 5.1.2 Interactive Module Requirements

- FR-INT-001: All interactive modules SHALL comply with WCAG 2.1 Level AA accessibility standards.
- FR-INT-002: Interactive modules SHALL function on modern browsers (Chrome, Firefox, Safari, Edge -- current version minus 2) without plugins.
- FR-INT-003: Interactive elements SHALL provide meaningful feedback for both correct and incorrect responses, explaining the rationale.
- FR-INT-004: The platform SHALL support HTML5-based interactive content authored in industry-standard tools (Articulate Storyline/Rise, Adobe Captivate, iSpring, Lectora, H5P).
- FR-INT-005: All interactive modules SHALL include a text-based alternative for screen reader users.
- FR-INT-006: Interactive modules SHALL track granular interaction data via xAPI statements (not just completion/score).

### 5.2 Video-Based Training

#### 5.2.1 Video Content Categories

| Category             | Format                                | Duration        | Description                                                              |
| -------------------- | ------------------------------------- | --------------- | ------------------------------------------------------------------------ |
| Concept Explainers   | Motion graphics + narration           | 60-120 seconds  | Core security concepts animated with visual metaphors                    |
| Dramatic Scenarios   | Live-action or high-quality animation | 120-180 seconds | Realistic workplace scenarios showing consequences of security decisions |
| Expert Interviews    | Talking head + B-roll                 | 120-180 seconds | Security professionals explaining threats and best practices             |
| News-Style Briefings | Newsroom format                       | 60-90 seconds   | Threat intelligence updates presented as news broadcasts                 |
| DMZ Story Episodes   | Cinematic animation or live-action    | 180-300 seconds | Narrative episodes from The DMZ: Archive Gate storyline                  |
| How-To Guides        | Screen recording + narration          | 120-180 seconds | Step-by-step demonstrations (configuring MFA, using a password manager)  |
| Micro-Testimonials   | Employee perspectives                 | 30-60 seconds   | Real employee stories about security incidents (anonymized)              |

#### 5.2.2 Video Technical Requirements

- FR-VID-001: All video content SHALL be encoded in H.264/AVC (baseline for compatibility) and H.265/HEVC (for quality at lower bitrates) with AAC audio.
- FR-VID-002: The platform SHALL support adaptive bitrate streaming (HLS and DASH) for optimal playback across network conditions.
- FR-VID-003: All video content SHALL include closed captions (WebVTT or SRT format) in the default language and all supported languages.
- FR-VID-004: Video content SHALL include audio description tracks for visually impaired learners where visual-only information is present.
- FR-VID-005: The platform SHALL support interactive video elements: in-video knowledge checks (pause for question), clickable hotspots, chapter markers, and branching paths.
- FR-VID-006: Video hosting SHALL support a CDN with global edge nodes for sub-2-second start times worldwide.
- FR-VID-007: The platform SHALL provide video analytics: play rate, average watch time, drop-off points, replay segments, knowledge check responses.
- FR-VID-008: All video content SHALL be downloadable for offline viewing on mobile devices (with DRM protection via encrypted HLS or Widevine).

### 5.3 Scenario-Based Training

#### 5.3.1 Scenario Framework

Scenario-based training uses the DMZ: Archive Gate narrative to create immersive, consequential decision-making exercises where learners experience the outcomes of their security decisions.

| Scenario Type                | Description                                                                                       | Mechanics                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Email Triage                 | Learner reviews a queue of incoming emails and must approve, deny, or escalate each               | Decision-based with feedback per email           |
| Access Request Evaluation    | Learner evaluates access requests to the data center (per DMZ game mechanics)                     | Multi-criteria evaluation with risk scoring      |
| Incident Response Simulation | Learner manages a simulated security incident from detection to resolution                        | Time-pressured sequential decision making        |
| Social Engineering Encounter | Learner interacts with a simulated social engineer via email, chat, or phone                      | Conversational AI-driven with branching dialogue |
| Data Breach Tabletop         | Learner participates in a simulated data breach response tabletop exercise                        | Team-based or individual role-based decisions    |
| Supply Chain Risk Assessment | Learner evaluates third-party vendors for security risk (per DMZ backup verification mechanics)   | Document analysis and risk rating                |
| Ransom Negotiation           | Learner faces a simulated ransomware scenario and must decide response (per DMZ ransom mechanics) | Resource management under pressure               |
| Threat Hunt                  | Learner reviews logs, alerts, and indicators to identify compromises                              | Pattern recognition and analytical skills        |

#### 5.3.2 Scenario Requirements

- FR-SCEN-001: Scenarios SHALL present realistic, contextualized situations based on real-world threat intelligence and the DMZ narrative.
- FR-SCEN-002: Each scenario SHALL have multiple resolution paths with distinct consequences that reflect the quality of the learner's decisions.
- FR-SCEN-003: Scenarios SHALL provide a post-scenario debrief explaining optimal decisions, common mistakes, and real-world parallels.
- FR-SCEN-004: Scenario difficulty SHALL scale based on the learner's adaptive profile.
- FR-SCEN-005: The platform SHALL support collaborative scenarios where multiple learners participate in team-based incident response exercises.
- FR-SCEN-006: Scenarios SHALL integrate with the DMZ game economy -- performance in scenarios affects in-game resources, reputation, and threat level.

### 5.4 Gamified Assessments

#### 5.4.1 Gamification Framework

| Element            | Implementation                                                                      | Purpose                                           |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| Points (XP)        | Earned for correct decisions, fast reporting, completed modules                     | Progress quantification and leaderboard ranking   |
| Badges             | Achievement unlocks for competency milestones, streaks, and special accomplishments | Recognition and collection motivation             |
| Leaderboards       | Department, team, and organizational leaderboards (opt-in, anonymizable)            | Social motivation and healthy competition         |
| Levels/Ranks       | Security clearance levels tied to cumulative achievement                            | Status progression and role-playing immersion     |
| Streaks            | Consecutive daily/weekly training engagement tracking                               | Habit formation                                   |
| Challenges         | Time-limited special events and competitive challenges                              | Engagement spikes and team building               |
| Narrative Progress | Advancement through DMZ: Archive Gate storyline chapters                            | Intrinsic motivation through narrative investment |
| Virtual Currency   | In-game currency (aligned with DMZ game economy) earned through training            | Resource management and decision-making practice  |

#### 5.4.2 Assessment Gamification Requirements

- FR-GAME-001: The platform SHALL implement a comprehensive gamification engine with points, badges, leaderboards, levels, and achievements.
- FR-GAME-002: Gamification elements SHALL be configurable per tenant -- organizations can enable, disable, or customize each element.
- FR-GAME-003: Leaderboards SHALL support anonymization options (display name, department only, fully anonymous) to comply with organizational culture and privacy requirements.
- FR-GAME-004: The platform SHALL support team-based competitions where departments or groups compete on aggregate security metrics.
- FR-GAME-005: Badges and achievements SHALL be mapped to specific security competencies, providing meaningful recognition rather than arbitrary rewards.
- FR-GAME-006: The gamification system SHALL integrate with the DMZ: Archive Gate narrative, so training achievements translate to in-game progression (upgraded facilities, enhanced security tools, expanded capacity).
- FR-GAME-007: The platform SHALL support custom gamification campaigns (e.g., "Cybersecurity Awareness Month Challenge," "Phishing Olympics") with configurable rules, durations, and rewards.

### 5.5 Quizzes & Knowledge Checks

#### 5.5.1 Question Types

| Type                            | Description                                                                 | xAPI Interaction Type |
| ------------------------------- | --------------------------------------------------------------------------- | --------------------- |
| Multiple Choice (Single Answer) | Select one correct answer from 4-5 options                                  | `choice`              |
| Multiple Choice (Multi-Select)  | Select all correct answers from 5-7 options                                 | `choice`              |
| True/False                      | Binary determination on security statements                                 | `true-false`          |
| Matching                        | Pair threats with mitigations, terms with definitions                       | `matching`            |
| Sequencing                      | Order incident response steps, prioritize actions                           | `sequencing`          |
| Fill-in-the-Blank               | Complete security policy statements or procedures                           | `fill-in`             |
| Hotspot                         | Click on suspicious elements in a screenshot                                | `performance`         |
| Likert Scale                    | Self-assessment of confidence or agreement                                  | `likert`              |
| Drag-and-Drop Categorization    | Sort items into categories (phishing vs. legitimate, classified vs. public) | `performance`         |
| Scenario-Based (Multi-Part)     | Series of questions tied to a single scenario with progressive disclosure   | `other` (custom)      |

#### 5.5.2 Quiz Engine Requirements

- FR-QUIZ-001: The platform SHALL support all question types listed above with randomization of answer options.
- FR-QUIZ-002: Question banks SHALL support tagging by topic, difficulty level, competency domain, and Bloom's taxonomy level.
- FR-QUIZ-003: The platform SHALL support adaptive quizzing where question selection is influenced by previous response correctness (CAT -- Computerized Adaptive Testing principles).
- FR-QUIZ-004: All questions SHALL provide immediate, detailed feedback explaining why each answer is correct or incorrect.
- FR-QUIZ-005: The platform SHALL support configurable passing thresholds (default: 80%) with automatic remediation assignment for failures.
- FR-QUIZ-006: Quiz attempts SHALL be fully tracked with per-question response data, response time, and confidence indicators reported via xAPI.
- FR-QUIZ-007: The platform SHALL support proctoring features for compliance-critical assessments (webcam monitoring, tab-switch detection, time limits).
- FR-QUIZ-008: Question pools SHALL support randomized draw (e.g., "10 questions randomly selected from a pool of 50") to prevent answer sharing.

---

## 6. Curriculum Management & Learning Paths

### 6.1 Role-Based Learning Paths

#### 6.1.1 Predefined Role Paths

The platform SHALL include pre-built, customizable learning paths for the following standard enterprise roles. Each path includes a defined curriculum, assessment cadence, and phishing simulation difficulty profile.

**Path 1: Executive / C-Suite**

| Component           | Details                                                                                |
| ------------------- | -------------------------------------------------------------------------------------- |
| Focus Areas         | Whaling attacks, BEC fraud, board-level cyber risk governance, executive impersonation |
| Module Count        | 15-20 modules                                                                          |
| Total Duration      | ~60 minutes (delivered over 4-6 weeks)                                                 |
| Module Length       | 3-5 minutes each                                                                       |
| Phishing Difficulty | Advanced to Expert (whaling, BEC, sophisticated spear phishing)                        |
| Assessment Type     | Scenario-based decision exercises, risk governance knowledge checks                    |
| Simulation Focus    | CEO/CFO impersonation, board communication compromise, strategic data theft            |
| Compliance Modules  | Data breach notification obligations, fiduciary responsibility, regulatory awareness   |
| Renewal Cadence     | Quarterly refresher + annual full recertification                                      |

**Path 2: IT Staff / Technical Personnel**

| Component           | Details                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Focus Areas         | Advanced threat identification, supply chain attacks, technical social engineering, privilege escalation, secure configuration |
| Module Count        | 25-35 modules                                                                                                                  |
| Total Duration      | ~120 minutes (delivered over 6-8 weeks)                                                                                        |
| Module Length       | 3-7 minutes each (including hands-on technical exercises)                                                                      |
| Phishing Difficulty | Intermediate to Expert (technical pretexts, tool-based attacks, code injection lures)                                          |
| Assessment Type     | Technical scenario simulations, log analysis exercises, configuration reviews                                                  |
| Simulation Focus    | Fake security alerts, compromised admin tools, malicious package/dependency notifications, infrastructure attack vectors       |
| Compliance Modules  | Change management security, access control policies, incident response procedures                                              |
| Renewal Cadence     | Monthly micro-assessments + semi-annual comprehensive review                                                                   |

**Path 3: General Employee**

| Component           | Details                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Focus Areas         | Phishing fundamentals, password hygiene, data handling, physical security, reporting procedures, social engineering basics |
| Module Count        | 12-18 modules                                                                                                              |
| Total Duration      | ~45 minutes (delivered over 4-6 weeks)                                                                                     |
| Module Length       | 2-4 minutes each                                                                                                           |
| Phishing Difficulty | Novice to Intermediate (progressive difficulty based on adaptive engine)                                                   |
| Assessment Type     | Knowledge checks, email triage exercises, interactive scenarios                                                            |
| Simulation Focus    | Common phishing themes (delivery notifications, IT support, HR notifications, financial alerts)                            |
| Compliance Modules  | Acceptable use policy, data classification, privacy obligations                                                            |
| Renewal Cadence     | Monthly microlearning + quarterly simulation campaigns + annual recertification                                            |

**Path 4: New Hire / Onboarding**

| Component           | Details                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Focus Areas         | Security policy overview, essential phishing identification, reporting procedures, acceptable use, clean desk policy, device security |
| Module Count        | 8-12 modules                                                                                                                          |
| Total Duration      | ~30 minutes (delivered within first 2 weeks of employment)                                                                            |
| Module Length       | 2-4 minutes each                                                                                                                      |
| Phishing Difficulty | Novice (establishes baseline)                                                                                                         |
| Assessment Type     | Knowledge checks with mandatory passing threshold; baseline phishing simulation                                                       |
| Simulation Focus    | Baseline assessment simulation to establish initial risk profile                                                                      |
| Compliance Modules  | Security policy acknowledgment, regulatory training as required by role                                                               |
| Renewal Cadence     | Transitions to role-appropriate path after 90-day probationary period                                                                 |

**Path 5: High-Risk Personnel (Finance, HR, Legal, Procurement)**

| Component           | Details                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Focus Areas         | BEC fraud, invoice fraud, payroll redirect, W-2/tax scams, sensitive data handling, insider threat, vendor impersonation    |
| Module Count        | 20-25 modules                                                                                                               |
| Total Duration      | ~75 minutes (delivered over 4-6 weeks)                                                                                      |
| Module Length       | 3-5 minutes each                                                                                                            |
| Phishing Difficulty | Intermediate to Advanced (role-specific pretexts targeting financial processes)                                             |
| Assessment Type     | Financial fraud scenario simulations, data handling exercises, vendor verification procedures                               |
| Simulation Focus    | Invoice manipulation, payroll redirect requests, executive impersonation for wire transfers, vendor account change requests |
| Compliance Modules  | SOX compliance (if applicable), PCI DSS (if applicable), data privacy (GDPR/CCPA)                                           |
| Renewal Cadence     | Bi-weekly micro-assessments + monthly simulation campaigns + quarterly recertification                                      |

**Path 6: Remote / Hybrid Workers**

| Component           | Details                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Focus Areas         | Home network security, VPN usage, public Wi-Fi risks, physical security at home, device management, video conferencing security |
| Module Count        | 10-15 modules                                                                                                                   |
| Total Duration      | ~40 minutes (delivered over 3-4 weeks)                                                                                          |
| Module Length       | 2-4 minutes each                                                                                                                |
| Phishing Difficulty | Novice to Intermediate (home-environment pretexts)                                                                              |
| Assessment Type     | Configuration checklists, home office security audit, scenario exercises                                                        |
| Simulation Focus    | Fake VPN alerts, cloud storage sharing, video conference hijacking, router compromise                                           |
| Compliance Modules  | Remote work security policy, BYOD policy, data handling outside office                                                          |
| Renewal Cadence     | Monthly microlearning + quarterly simulations                                                                                   |

#### 6.1.2 Learning Path Management Requirements

- FR-PATH-001: The platform SHALL provide a visual learning path designer with drag-and-drop module sequencing, branching logic, and prerequisite configuration.
- FR-PATH-002: Learning paths SHALL support mandatory and optional modules, with clear visual distinction for learners.
- FR-PATH-003: Learning paths SHALL support time-gated content release (e.g., Module 3 unlocks 7 days after Module 2 completion).
- FR-PATH-004: The platform SHALL support automatic path assignment based on user attributes (role, department, location, hire date, risk tier).
- FR-PATH-005: Learning paths SHALL be clonable and customizable per tenant organization.
- FR-PATH-006: The platform SHALL track and report learning path progress, completion rates, and time-to-completion at individual and aggregate levels.
- FR-PATH-007: The platform SHALL support path versioning, allowing updates to curriculum without disrupting in-progress learner assignments.

### 6.2 Customizable Content

#### 6.2.1 Content Customization Levels

| Level            | Scope            | User Role        | Description                                           |
| ---------------- | ---------------- | ---------------- | ----------------------------------------------------- |
| Platform-Level   | Global defaults  | Platform Admin   | Base content, templates, and configurations           |
| Tenant-Level     | Per-organization | Tenant Admin     | Organization-specific branding, policies, and content |
| Department-Level | Per-department   | Department Admin | Department-specific scenarios and emphasis            |
| Campaign-Level   | Per-campaign     | Campaign Manager | Campaign-specific content selection and sequencing    |
| Learner-Level    | Per-individual   | Adaptive Engine  | Algorithmically personalized content delivery         |

#### 6.2.2 Content Customization Requirements

- FR-CUST-001: The platform SHALL support white-labeling of all learner-facing content with organizational branding (logo, color scheme, terminology).
- FR-CUST-002: Organizations SHALL be able to upload custom training modules in SCORM, xAPI, video (MP4/WebM), PDF, and HTML5 formats.
- FR-CUST-003: The platform SHALL provide a content authoring toolkit for creating custom microlearning modules without requiring technical expertise (no-code/low-code).
- FR-CUST-004: Custom content SHALL integrate seamlessly with platform analytics, gamification, and adaptive learning systems.
- FR-CUST-005: The platform SHALL support content approval workflows (draft, review, approved, published, archived) with role-based permissions.
- FR-CUST-006: Organizations SHALL be able to customize policy references, regulatory language, and compliance terminology within pre-built modules using configurable text replacement.
- FR-CUST-007: The platform SHALL support custom assessment questions that integrate with existing question banks and adaptive testing algorithms.
- FR-CUST-008: The platform SHALL provide a content marketplace or exchange where organizations can share anonymized, non-proprietary custom content.

### 6.3 Multilingual Support

#### 6.3.1 Language Requirements

| Tier                   | Languages                                                                                                                                               | Support Level                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Tier 1 (Full Support)  | English (US), English (UK), German, French, Spanish (Castilian), Spanish (Latin American), Portuguese (Brazilian), Japanese, Simplified Chinese, Korean | Full UI, all content, voice-over, captions, assessments, phishing templates |
| Tier 2 (Comprehensive) | Italian, Dutch, Polish, Turkish, Arabic, Hindi, Thai, Vietnamese, Indonesian, Russian                                                                   | Full UI, core content library, captions, assessments, phishing templates    |
| Tier 3 (Essential)     | Swedish, Norwegian, Danish, Finnish, Czech, Hungarian, Romanian, Greek, Hebrew, Malay, Tagalog, Ukrainian                                               | Full UI, essential content, captions, key phishing templates                |
| Tier 4 (UI + Custom)   | Additional languages via customer-provided translations                                                                                                 | UI localization framework, custom content upload                            |

#### 6.3.2 Localization Requirements

- FR-LANG-001: The platform UI SHALL be fully localized in all Tier 1 and Tier 2 languages, including navigation, labels, notifications, and system messages.
- FR-LANG-002: Training content SHALL be professionally localized (not machine-translated) for Tier 1 languages, with cultural adaptation for idioms, examples, and scenarios.
- FR-LANG-003: Phishing simulation templates SHALL be localized by native speakers for each supported language, accounting for language-specific phishing patterns and cultural norms.
- FR-LANG-004: The platform SHALL support right-to-left (RTL) languages (Arabic, Hebrew) throughout the UI and content rendering engine.
- FR-LANG-005: Video content SHALL support dubbed audio tracks and/or subtitles in all Tier 1 and Tier 2 languages.
- FR-LANG-006: The platform SHALL support automatic language detection based on user profile, browser locale, or organizational default, with manual override capability.
- FR-LANG-007: The platform SHALL provide a translation management interface allowing organizations to review, approve, and override machine-translated content.
- FR-LANG-008: Assessment questions SHALL be independently validated in each language to ensure semantic equivalence and appropriate difficulty.
- FR-LANG-009: The platform SHALL support Unicode (UTF-8) throughout all system components, including database storage, API communication, and file processing.
- FR-LANG-010: Date, time, number, and currency formatting SHALL respect the learner's locale settings.

---

## 7. User Management & Identity Integration

### 7.1 Single Sign-On (SSO)

#### 7.1.1 SAML 2.0

**Requirement Level:** MANDATORY

| Requirement            | Specification                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SAML Version           | SAML 2.0                                                                                                                   |
| Binding                | HTTP-POST (mandatory), HTTP-Redirect (recommended)                                                                         |
| Profiles               | Web Browser SSO Profile, Single Logout Profile                                                                             |
| IdP Metadata           | Automatic import via metadata URL or XML file upload                                                                       |
| SP Metadata            | Auto-generated SP metadata endpoint for IdP configuration                                                                  |
| Attribute Mapping      | Configurable mapping of SAML attributes to platform user fields (email, name, department, role, groups)                    |
| Name ID Formats        | `emailAddress`, `persistent`, `transient`, `unspecified`                                                                   |
| Encryption             | Support for signed assertions (mandatory), encrypted assertions (recommended), and signed AuthnRequests                    |
| Certificate Management | Automated certificate rotation with grace period for dual-certificate validation                                           |
| IdP Compatibility      | Verified with: Microsoft Entra ID (Azure AD), Okta, Ping Identity, OneLogin, ADFS, Google Workspace, JumpCloud, Duo, Auth0 |
| Multi-IdP              | Support for multiple IdP configurations per tenant (e.g., corporate IdP + contractor IdP)                                  |

#### 7.1.2 OAuth 2.0

**Requirement Level:** MANDATORY

| Requirement         | Specification                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grant Types         | Authorization Code (with PKCE -- mandatory), Client Credentials (for API access), Refresh Token                                                            |
| Token Format        | JWT (JSON Web Token) with RS256 or ES256 signing                                                                                                           |
| Scopes              | Standard scopes (`openid`, `profile`, `email`) + custom platform scopes (`training:read`, `training:write`, `admin:read`, `admin:write`, `reporting:read`) |
| Token Lifetime      | Configurable access token lifetime (default: 1 hour); configurable refresh token lifetime (default: 30 days)                                               |
| Token Revocation    | RFC 7009 compliant token revocation endpoint                                                                                                               |
| Token Introspection | RFC 7662 compliant token introspection endpoint                                                                                                            |

#### 7.1.3 OpenID Connect (OIDC)

**Requirement Level:** MANDATORY

| Requirement            | Specification                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| OIDC Version           | OpenID Connect 1.0                                                                                                                    |
| Discovery              | Support for `.well-known/openid-configuration` auto-discovery                                                                         |
| Flows                  | Authorization Code Flow with PKCE (mandatory); Implicit Flow (deprecated, backward compatibility only)                                |
| Claims                 | Standard claims (`sub`, `name`, `email`, `email_verified`, `preferred_username`, `locale`) + custom claims for organizational context |
| ID Token               | JWT-based ID token with configurable claims inclusion                                                                                 |
| UserInfo Endpoint      | Standard OIDC UserInfo endpoint for additional claim retrieval                                                                        |
| Session Management     | OIDC Session Management and RP-Initiated Logout                                                                                       |
| Provider Compatibility | Verified with: Microsoft Entra ID, Okta, Auth0, Keycloak, Google, Ping Identity, OneLogin, JumpCloud                                  |

#### 7.1.4 SSO Functional Requirements

- FR-SSO-001: The platform SHALL support SAML 2.0, OAuth 2.0, and OIDC for single sign-on, configurable per tenant.
- FR-SSO-002: SSO SHALL be the default (and optionally the only) authentication method, with the ability to enforce SSO-only access.
- FR-SSO-003: The platform SHALL support IdP-initiated and SP-initiated SSO flows for SAML 2.0.
- FR-SSO-004: Failed SSO authentication SHALL provide clear, actionable error messages to administrators (not learners) for troubleshooting.
- FR-SSO-005: The platform SHALL support Just-in-Time (JIT) user provisioning via SSO -- creating user accounts automatically on first login based on SSO attributes.
- FR-SSO-006: The platform SHALL provide an SSO configuration testing tool that validates the end-to-end authentication flow before enabling it for production users.
- FR-SSO-007: Session management SHALL support configurable session durations, idle timeouts, and concurrent session limits.
- FR-SSO-008: The platform SHALL support Multi-Factor Authentication (MFA) as a secondary factor for administrative access, independent of SSO.

### 7.2 SCIM Provisioning

**Requirement Level:** MANDATORY

SCIM (System for Cross-domain Identity Management) automates the lifecycle management of user accounts, ensuring that the platform's user directory stays synchronized with the organization's identity provider without manual intervention.

#### 7.2.1 SCIM Technical Requirements

| Requirement     | Specification                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| SCIM Version    | SCIM 2.0 (RFC 7642, 7643, 7644)                                                                             |
| Endpoints       | `/Users`, `/Groups`, `/ServiceProviderConfig`, `/ResourceTypes`, `/Schemas`                                 |
| Operations      | Create (POST), Read (GET), Replace (PUT), Update (PATCH), Delete (DELETE), Search (GET with filter)         |
| Filtering       | Support for `eq`, `ne`, `co`, `sw`, `ew`, `gt`, `lt`, `ge`, `le`, `and`, `or`, `not` operators              |
| Pagination      | Support for `startIndex` and `count` pagination parameters                                                  |
| Bulk Operations | RFC 7644 bulk endpoint for batch user/group operations                                                      |
| Schema          | Core User schema + Enterprise User extension (`urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`) |
| Authentication  | OAuth 2.0 Bearer Token for SCIM endpoint authentication                                                     |
| Rate Limiting   | Configurable rate limits with HTTP 429 responses and `Retry-After` headers                                  |

#### 7.2.2 SCIM User Attributes Mapping

| SCIM Attribute                               | Platform Field               | Required | Description                                     |
| -------------------------------------------- | ---------------------------- | -------- | ----------------------------------------------- |
| `userName`                                   | `email` (primary identifier) | Yes      | Unique username, typically email address        |
| `name.givenName`                             | `first_name`                 | Yes      | First name                                      |
| `name.familyName`                            | `last_name`                  | Yes      | Last name                                       |
| `emails[primary].value`                      | `email`                      | Yes      | Primary email address                           |
| `active`                                     | `account_status`             | Yes      | Account active/inactive status                  |
| `displayName`                                | `display_name`               | No       | Display name for leaderboards and UI            |
| `title`                                      | `job_title`                  | No       | Job title for role-based path assignment        |
| `urn:...:enterprise:2.0:User:department`     | `department`                 | No       | Department for group-based assignment           |
| `urn:...:enterprise:2.0:User:division`       | `division`                   | No       | Division for organizational reporting           |
| `urn:...:enterprise:2.0:User:manager`        | `manager_id`                 | No       | Manager reference for escalation workflows      |
| `urn:...:enterprise:2.0:User:costCenter`     | `cost_center`                | No       | Cost center for billing and reporting           |
| `urn:...:enterprise:2.0:User:organization`   | `organization`               | No       | Organization unit                               |
| `urn:...:enterprise:2.0:User:employeeNumber` | `employee_id`                | No       | Employee number for cross-system correlation    |
| `locale`                                     | `preferred_language`         | No       | Preferred locale for language selection         |
| `timezone`                                   | `timezone`                   | No       | Timezone for scheduling and notifications       |
| `addresses[work].country`                    | `country`                    | No       | Country for content localization and compliance |
| Custom: `riskTier`                           | `risk_tier`                  | No       | Security risk classification (custom extension) |
| Custom: `hireDate`                           | `hire_date`                  | No       | Hire date for onboarding path triggers          |

#### 7.2.3 SCIM Functional Requirements

- FR-SCIM-001: The platform SHALL implement a SCIM 2.0 compliant server endpoint for receiving provisioning requests from identity providers.
- FR-SCIM-002: User creation via SCIM SHALL automatically trigger the appropriate onboarding learning path assignment based on mapped attributes (role, department, location).
- FR-SCIM-003: User deactivation via SCIM SHALL immediately suspend all active training assignments, remove the user from active campaigns, and archive their training records (not delete, for compliance audit trail).
- FR-SCIM-004: Group membership changes via SCIM SHALL trigger automatic reassignment of learning paths and campaign enrollment based on group-to-path mapping rules.
- FR-SCIM-005: The platform SHALL support SCIM provisioning from multiple identity providers simultaneously (e.g., corporate Entra ID for employees + separate IdP for contractors).
- FR-SCIM-006: SCIM operations SHALL be logged in an audit trail capturing the operation type, affected user/group, source IdP, timestamp, and result.
- FR-SCIM-007: The platform SHALL provide SCIM provisioning monitoring dashboards showing sync status, error rates, and user lifecycle events.

### 7.3 Active Directory / LDAP Synchronization

#### 7.3.1 Directory Integration Requirements

| Requirement       | Specification                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Protocols         | LDAP v3, LDAPS (LDAP over TLS), Microsoft Active Directory specific extensions                              |
| Connectivity      | Direct LDAP bind (for on-premises) or via secure connector agent (for hybrid environments)                  |
| Sync Direction    | One-way (directory to platform) for user attributes; bidirectional for training status writeback (optional) |
| Sync Frequency    | Configurable: real-time (change notification), scheduled (every N minutes/hours), manual trigger            |
| Scope             | Configurable base DN, search filter, and organizational unit scope                                          |
| Group Sync        | Nested group resolution with configurable depth limit (default: 5 levels)                                   |
| Attribute Mapping | Configurable mapping from AD/LDAP attributes to platform user fields                                        |
| Delta Sync        | Support for incremental synchronization using `uSNChanged` (AD) or `modifyTimestamp` (LDAP)                 |
| Failover          | Support for multiple directory server endpoints with automatic failover                                     |

#### 7.3.2 AD/LDAP Attribute Mapping

| AD/LDAP Attribute                       | Platform Field       | Notes                                      |
| --------------------------------------- | -------------------- | ------------------------------------------ |
| `sAMAccountName` or `userPrincipalName` | `username`           | Configurable primary identifier            |
| `mail`                                  | `email`              | Primary email address                      |
| `givenName`                             | `first_name`         | First name                                 |
| `sn`                                    | `last_name`          | Last name                                  |
| `displayName`                           | `display_name`       | Display name                               |
| `title`                                 | `job_title`          | Job title                                  |
| `department`                            | `department`         | Department                                 |
| `company`                               | `organization`       | Organization                               |
| `manager` (DN reference)                | `manager_id`         | Resolved to platform user ID               |
| `memberOf`                              | `groups`             | Group memberships for role/path assignment |
| `userAccountControl`                    | `account_status`     | Active/disabled status flag parsing        |
| `whenCreated`                           | `hire_date`          | Approximate hire date                      |
| `physicalDeliveryOfficeName`            | `office_location`    | Office location                            |
| `co` or `c`                             | `country`            | Country for localization                   |
| `preferredLanguage`                     | `preferred_language` | Language preference                        |

#### 7.3.3 AD/LDAP Functional Requirements

- FR-LDAP-001: The platform SHALL support direct LDAP/LDAPS integration with on-premises Active Directory and other LDAP-compliant directories.
- FR-LDAP-002: For environments where direct LDAP connectivity is not possible (cloud-only, firewall restrictions), the platform SHALL provide a lightweight connector agent installable on-premises that communicates outbound to the platform via HTTPS.
- FR-LDAP-003: Group membership SHALL be mappable to platform roles, learning paths, and campaign enrollment rules.
- FR-LDAP-004: The platform SHALL support OU-based (Organizational Unit) scoping to synchronize only specific segments of the directory.
- FR-LDAP-005: Directory synchronization SHALL support dry-run mode that previews changes before applying them.
- FR-LDAP-006: The platform SHALL handle AD group nesting with configurable maximum depth to prevent circular reference loops.
- FR-LDAP-007: Synchronization errors SHALL generate alerts (email, webhook) to designated administrators with detailed error context.

### 7.4 Group-Based Assignment

#### 7.4.1 Group Sources

| Source                         | Sync Method          | Description                                        |
| ------------------------------ | -------------------- | -------------------------------------------------- |
| Active Directory / LDAP Groups | AD/LDAP sync         | Security groups and distribution lists             |
| SCIM Groups                    | SCIM provisioning    | IdP-managed groups                                 |
| SSO Claims / Attributes        | SAML/OIDC attributes | Group membership from SSO assertions               |
| HRIS Integration               | API sync             | Department, cost center, job level from HR systems |
| Manual / Platform-Defined      | Admin UI             | Custom groups created within the platform          |
| Dynamic / Rule-Based           | Attribute rules      | Auto-membership based on attribute conditions      |

#### 7.4.2 Group Assignment Rules

- FR-GRP-001: The platform SHALL support rule-based automatic group membership using Boolean logic on user attributes (e.g., `department = "Finance" AND country = "US" AND hire_date > 2025-01-01`).
- FR-GRP-002: Groups SHALL be assignable to learning paths, campaigns, phishing simulation target lists, and reporting segments.
- FR-GRP-003: Group changes (membership add/remove) SHALL automatically trigger learning path assignment/unassignment and campaign enrollment/unenrollment.
- FR-GRP-004: The platform SHALL support group hierarchies (parent/child groups) with inheritance of learning path assignments.
- FR-GRP-005: Group membership SHALL be auditable with historical records of membership changes, sources, and timestamps.
- FR-GRP-006: The platform SHALL support exclusion groups that exempt members from specific campaigns or training assignments (e.g., "Security Team -- exclude from phishing simulations").

---

## 8. Campaign Management & Automation

### 8.1 Automated Enrollment

#### 8.1.1 Enrollment Trigger Types

| Trigger                     | Description                                                 | Latency Requirement                           |
| --------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| New User Created            | SCIM/SSO/LDAP creates a new user account                    | <5 minutes                                    |
| Group Membership Change     | User added to a group mapped to a learning path             | <5 minutes                                    |
| Role Change                 | Job title or role attribute updated                         | <15 minutes                                   |
| Department Transfer         | Department attribute changes                                | <15 minutes                                   |
| Phishing Simulation Failure | User clicks a phishing simulation link                      | <60 seconds                                   |
| Assessment Failure          | User fails a knowledge check or assessment                  | <5 minutes                                    |
| Compliance Deadline         | Approaching regulatory training deadline                    | Configurable (default: 30/14/7/1 days before) |
| Manager Request             | Manager nominates a direct report for training              | <15 minutes                                   |
| Risk Score Change           | User's risk tier changes based on behavioral data           | <30 minutes                                   |
| Scheduled Date              | Calendar-based enrollment (annual refresh, awareness month) | At scheduled time                             |
| Onboarding Milestone        | Days since hire (e.g., Day 1, Day 30, Day 90)               | At milestone date                             |
| External Event              | Webhook from external system (HR, ITSM, SIEM)               | <5 minutes                                    |

#### 8.1.2 Enrollment Automation Requirements

- FR-ENRL-001: The platform SHALL support rule-based automatic enrollment triggered by any of the events listed above.
- FR-ENRL-002: Enrollment rules SHALL be configurable through a visual rule builder interface with AND/OR/NOT logic.
- FR-ENRL-003: The platform SHALL support enrollment rule testing (dry-run) that shows which users would be affected before activation.
- FR-ENRL-004: Enrollment rules SHALL support priority ordering to resolve conflicts when multiple rules apply to the same user.
- FR-ENRL-005: The platform SHALL maintain an enrollment audit log capturing the rule that triggered enrollment, the triggering event, and the resulting assignment.
- FR-ENRL-006: Bulk enrollment SHALL be supported via CSV upload, API call, or group selection, with validation and error reporting.
- FR-ENRL-007: The platform SHALL support enrollment caps and waitlists for capacity-constrained training (e.g., live virtual sessions).

### 8.2 Scheduling

#### 8.2.1 Schedule Configuration

| Parameter            | Options                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Start Date/Time      | Immediate, specific date/time, relative to enrollment (e.g., 3 days after enrollment)                                           |
| Due Date             | Specific date, relative to start (e.g., 14 days after assignment), relative to event (e.g., 30 days before compliance deadline) |
| Available Window     | Date range during which content is accessible                                                                                   |
| Recurrence           | One-time, daily, weekly, monthly, quarterly, annually, custom interval                                                          |
| Timezone Handling    | Learner's local timezone (default), organizational timezone, UTC                                                                |
| Blackout Periods     | Dates/date ranges when training should not be assigned or reminders sent (holidays, code freezes, all-hands)                    |
| Business Hours       | Configurable business hours for sending simulations and notifications                                                           |
| Randomization Window | Spread assignment or simulation delivery across a configurable window (e.g., random day within a 5-business-day window)         |

#### 8.2.2 Scheduling Requirements

- FR-SCHED-001: The platform SHALL support campaign scheduling with configurable start dates, due dates, and recurrence patterns.
- FR-SCHED-002: Due dates SHALL be enforceable with automatic escalation when deadlines are missed.
- FR-SCHED-003: The platform SHALL support relative scheduling (e.g., "due 14 days after assignment") for dynamic enrollment scenarios.
- FR-SCHED-004: Phishing simulation scheduling SHALL support randomized delivery windows to prevent predictable patterns that reduce simulation effectiveness.
- FR-SCHED-005: The platform SHALL provide a campaign calendar view showing all active and scheduled campaigns, simulations, and deadlines across the organization.
- FR-SCHED-006: Schedule conflicts (overlapping campaigns, excessive training load on a single user) SHALL be detected and flagged to administrators.
- FR-SCHED-007: The platform SHALL respect organizational blackout periods and automatically reschedule affected assignments.

### 8.3 Reminders & Notifications

#### 8.3.1 Notification Types

| Notification            | Trigger                                             | Channel                     | Audience                |
| ----------------------- | --------------------------------------------------- | --------------------------- | ----------------------- |
| Assignment Notification | New training assigned                               | Email, in-app, push         | Learner                 |
| Reminder (First)        | Configurable days before due date (default: 7 days) | Email, push                 | Learner                 |
| Reminder (Second)       | Configurable days before due date (default: 3 days) | Email, push                 | Learner                 |
| Reminder (Final)        | Configurable days before due date (default: 1 day)  | Email, push, SMS (optional) | Learner                 |
| Overdue Notification    | Due date passed                                     | Email, push                 | Learner + Manager       |
| Completion Confirmation | Training completed                                  | Email, in-app               | Learner                 |
| Certificate Available   | Compliance certificate generated                    | Email, in-app               | Learner                 |
| Manager Summary         | Weekly/monthly summary of team training status      | Email                       | Manager                 |
| Escalation Alert        | Overdue beyond configurable threshold               | Email                       | Manager + HR/Compliance |
| Campaign Launch         | New campaign activated                              | Email, in-app               | Target audience         |
| Achievement Earned      | Badge, level-up, or milestone reached               | In-app, push                | Learner                 |
| Leaderboard Update      | Position change on leaderboard                      | In-app, push                | Learner (if opted in)   |

#### 8.3.2 Notification Requirements

- FR-NOTIF-001: All notification templates SHALL be customizable per tenant with support for merge fields, branding, and tone/voice configuration.
- FR-NOTIF-002: The platform SHALL support multi-channel notification delivery: email, in-app notification center, push notification (mobile), SMS (optional add-on), and Microsoft Teams/Slack integration.
- FR-NOTIF-003: Notification frequency SHALL be configurable with global and per-user throttling to prevent notification fatigue (e.g., maximum 3 training-related emails per week).
- FR-NOTIF-004: Learners SHALL be able to configure notification preferences (channel preference, quiet hours) within platform-defined boundaries.
- FR-NOTIF-005: Notification delivery SHALL be tracked with open rates, click-through rates, and bounce/failure monitoring.
- FR-NOTIF-006: The platform SHALL support notification digests that consolidate multiple pending notifications into a single summary communication.

### 8.4 Escalation Workflows

#### 8.4.1 Escalation Tiers

| Tier   | Trigger                                       | Action                        | Stakeholder                                |
| ------ | --------------------------------------------- | ----------------------------- | ------------------------------------------ |
| Tier 0 | Training assigned                             | Assignment notification       | Learner                                    |
| Tier 1 | 50% of due date elapsed, training not started | Reminder escalation           | Learner + optional manager visibility      |
| Tier 2 | Due date passed                               | Overdue notification          | Learner + Direct Manager                   |
| Tier 3 | 7 days overdue                                | Manager escalation            | Direct Manager + Skip-level Manager        |
| Tier 4 | 14 days overdue                               | HR/Compliance escalation      | Manager chain + HR Business Partner        |
| Tier 5 | 30 days overdue                               | Executive escalation          | Department Head + CISO/Compliance Officer  |
| Tier 6 | 60+ days overdue (compliance-critical)        | Access restriction (optional) | Automated system action + All stakeholders |

#### 8.4.2 Escalation Requirements

- FR-ESC-001: The platform SHALL support configurable multi-tier escalation workflows with customizable triggers, timing, actions, and stakeholder notifications.
- FR-ESC-002: Escalation workflows SHALL be configurable per campaign, per learning path, and per compliance requirement.
- FR-ESC-003: The platform SHALL support automatic escalation actions including: notification sending, manager dashboard flagging, HRIS status update (via API), and access restriction (via integration with IdP/NAC).
- FR-ESC-004: Escalation history SHALL be maintained per user with complete audit trail of all escalation actions taken.
- FR-ESC-005: The platform SHALL support escalation pause/override for approved exceptions (e.g., employee on leave, approved deferral).
- FR-ESC-006: Manager dashboards SHALL prominently display team members with active escalations and provide one-click options to send personal reminders or approve deferrals.

### 8.5 Manager Notifications & Dashboards

#### 8.5.1 Manager Dashboard Components

| Component              | Description                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| Team Compliance Status | Traffic-light indicator (green/yellow/red) for each team member's training status |
| Completion Progress    | Bar chart showing team progress toward campaign completion goals                  |
| Overdue List           | Sortable list of team members with overdue assignments and escalation status      |
| Phishing Risk View     | Team members' phishing simulation performance with risk-tier indicators           |
| Trend Analysis         | Month-over-month and quarter-over-quarter team security awareness trends          |
| Upcoming Deadlines     | Calendar view of approaching training deadlines for all team members              |
| Action Center          | Pending actions: approve deferrals, send reminders, acknowledge escalations       |
| Comparative View       | Team performance compared to department and organizational averages               |

#### 8.5.2 Manager Requirements

- FR-MGR-001: Managers SHALL have access to a dedicated dashboard showing their direct reports' training status, compliance posture, and phishing simulation performance.
- FR-MGR-002: Manager visibility SHALL respect the organizational hierarchy -- managers can only see their direct and indirect reports as defined by the directory/HRIS integration.
- FR-MGR-003: Managers SHALL receive automated weekly summary emails with team training status and required actions.
- FR-MGR-004: Managers SHALL be able to send personalized training reminders to individual team members directly from the dashboard.
- FR-MGR-005: The platform SHALL support delegated management -- managers can nominate a delegate (e.g., admin assistant) to manage training oversight on their behalf.
- FR-MGR-006: Manager dashboards SHALL be accessible via mobile-responsive web interface and native mobile applications.

---

## 9. Mobile Learning Platform

### 9.1 Responsive Design

#### 9.1.1 Responsive Design Requirements

| Requirement    | Specification                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Breakpoints    | 320px (mobile S), 375px (mobile M), 414px (mobile L), 768px (tablet), 1024px (laptop), 1280px+ (desktop) |
| Framework      | Mobile-first responsive design; all content designed for smallest viewport first                         |
| Touch Targets  | Minimum 44x44px touch targets per WCAG 2.1                                                               |
| Orientation    | Support for portrait and landscape orientations with appropriate layout adaptation                       |
| Input Methods  | Touch, stylus, keyboard, mouse; all interactive elements accessible via all input methods                |
| Performance    | First Contentful Paint <1.5s on 4G connection; Time to Interactive <3s                                   |
| Image Handling | Responsive images with `srcset` and `sizes` attributes; WebP with JPEG fallback                          |
| Video          | Adaptive bitrate streaming; automatic quality adjustment based on connection speed                       |

#### 9.1.2 Responsive Functional Requirements

- FR-RESP-001: All training content SHALL render correctly and be fully interactive on screen sizes from 320px to 2560px width.
- FR-RESP-002: The platform SHALL detect device type and optimize content delivery accordingly (e.g., simplified animations on lower-powered devices).
- FR-RESP-003: Interactive elements designed for desktop (hover states, drag-and-drop) SHALL have equivalent touch-friendly alternatives on mobile.
- FR-RESP-004: Text content SHALL be readable without horizontal scrolling on all supported screen sizes.
- FR-RESP-005: Navigation SHALL adapt to device type -- hamburger menu on mobile, sidebar on tablet, full navigation bar on desktop.

### 9.2 Native Mobile Applications

#### 9.2.1 Platform Requirements

| Platform | Minimum Version              | Distribution                                                    |
| -------- | ---------------------------- | --------------------------------------------------------------- |
| iOS      | iOS 16.0+                    | Apple App Store + Apple Business Manager (managed distribution) |
| Android  | Android 10.0+ (API level 29) | Google Play Store + Managed Google Play (EMM distribution)      |

#### 9.2.2 Native App Features

| Feature                  | Description                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Biometric Authentication | Face ID, Touch ID (iOS); Fingerprint, Face Unlock (Android)                                        |
| Push Notifications       | Native push via APNs (iOS) and FCM (Android)                                                       |
| Offline Mode             | Content download, offline completion, sync on reconnect                                            |
| Background Sync          | Periodic background data synchronization                                                           |
| Deep Linking             | Universal links (iOS) / App Links (Android) for direct navigation from emails/notifications        |
| Camera Integration       | QR code scanning for physical security exercises; photo upload for verification activities         |
| MDM/EMM Compatibility    | Managed app configuration via AppConfig standard                                                   |
| App Wrapping             | Support for enterprise app wrapping solutions (Microsoft Intune, VMware Workspace ONE, MobileIron) |
| Data Protection          | iOS Data Protection class `NSFileProtectionComplete`; Android encrypted storage                    |
| Crash Reporting          | Integrated crash analytics and performance monitoring                                              |

#### 9.2.3 Native App Requirements

- FR-APP-001: The platform SHALL provide native mobile applications for iOS and Android with feature parity for all learner-facing functionality.
- FR-APP-002: Native apps SHALL support managed distribution via Apple Business Manager and Managed Google Play for corporate device deployments.
- FR-APP-003: Native apps SHALL support MDM/EMM managed app configuration (AppConfig) for zero-touch deployment of SSO settings, server URLs, and organizational branding.
- FR-APP-004: Native apps SHALL implement certificate pinning for API communication to prevent man-in-the-middle attacks.
- FR-APP-005: Native apps SHALL comply with Apple App Store Review Guidelines and Google Play Developer Program Policies.
- FR-APP-006: Native app updates SHALL support forced minimum version enforcement with in-app update prompts.
- FR-APP-007: Native apps SHALL support enterprise-grade security features: jailbreak/root detection, screenshot prevention for sensitive content, and remote data wipe capability via MDM.

### 9.3 Offline Capability

#### 9.3.1 Offline Content Model

| Content Type                  | Offline Support                                 | Storage Estimate (per module) |
| ----------------------------- | ----------------------------------------------- | ----------------------------- |
| Microlearning Modules (HTML5) | Full offline playback                           | 2-10 MB                       |
| Video Content (compressed)    | Downloadable for offline viewing                | 15-50 MB                      |
| Interactive Scenarios         | Full offline interaction with local state       | 5-15 MB                       |
| Knowledge Checks / Quizzes    | Full offline completion                         | 1-3 MB                        |
| PDF Documents                 | Downloadable                                    | 0.5-5 MB                      |
| Gamification Data             | Cached leaderboard and progress                 | <1 MB                         |
| Phishing Simulations          | NOT available offline (requires email delivery) | N/A                           |

#### 9.3.2 Offline Synchronization

| Aspect              | Specification                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Download Manager    | User-initiated and auto-download (on Wi-Fi) for assigned content                               |
| Storage Management  | Configurable maximum offline storage limit; automatic cleanup of completed content             |
| Conflict Resolution | Last-write-wins with server-side validation; offline completions are reconciled on sync        |
| Sync Protocol       | Delta sync -- only changed data transmitted on reconnection                                    |
| Sync Triggers       | Automatic on network reconnection; manual sync button; background sync (configurable interval) |
| Offline Duration    | Content accessible for up to 30 days without server validation (configurable)                  |
| Encryption          | All offline content encrypted at rest using platform-managed keys                              |

#### 9.3.3 Offline Requirements

- FR-OFFL-001: The platform SHALL support offline content consumption for all non-simulation training content types.
- FR-OFFL-002: Learners SHALL be able to download assigned training content for offline access via Wi-Fi or cellular (with configuration control).
- FR-OFFL-003: Training progress and assessment responses generated offline SHALL be queued and synchronized to the server upon reconnection.
- FR-OFFL-004: Offline progress SHALL be reflected in xAPI statements with accurate timestamps (device clock) and an `offline: true` context extension.
- FR-OFFL-005: The platform SHALL handle offline-online transitions gracefully with no data loss, even if the connection is interrupted during synchronization.
- FR-OFFL-006: Administrators SHALL be able to control which content is available for offline download and set maximum offline storage limits per user.
- FR-OFFL-007: Offline content SHALL expire after a configurable period (default: 30 days), requiring re-download to prevent use of outdated content.

### 9.4 Push Notifications

#### 9.4.1 Push Notification Types

| Notification Type        | Priority | Content                                           | Action on Tap          |
| ------------------------ | -------- | ------------------------------------------------- | ---------------------- |
| Training Assignment      | Normal   | "New training assigned: {module_name}"            | Open module            |
| Reminder                 | Normal   | "Training due in {days}: {module_name}"           | Open module            |
| Overdue Alert            | High     | "Overdue: {module_name} was due {date}"           | Open module            |
| Achievement              | Normal   | "You earned: {badge_name}!"                       | Open achievements      |
| Leaderboard Update       | Low      | "You moved to #{position} on the leaderboard"     | Open leaderboard       |
| Spaced Repetition Review | Normal   | "Quick review: {topic_name} (2 min)"              | Open review session    |
| Campaign Launch          | Normal   | "New awareness campaign: {campaign_name}"         | Open campaign          |
| Threat Alert             | High     | "New threat advisory: {threat_name}"              | Open advisory          |
| Completion Confirmation  | Normal   | "Completed: {module_name} -- Score: {score}"      | Open transcript        |
| Manager Action Required  | High     | "Team action needed: {count} overdue assignments" | Open manager dashboard |

#### 9.4.2 Push Notification Requirements

- FR-PUSH-001: The platform SHALL deliver push notifications via Apple Push Notification service (APNs) for iOS and Firebase Cloud Messaging (FCM) for Android.
- FR-PUSH-002: Push notifications SHALL support rich content: images, action buttons (e.g., "Start Training," "Snooze," "Dismiss"), and deep links to specific content.
- FR-PUSH-003: Push notification delivery SHALL respect the learner's configured quiet hours (e.g., no notifications between 8 PM and 8 AM local time).
- FR-PUSH-004: Push notification frequency SHALL be governed by per-user throttling rules (configurable maximum per day and per week).
- FR-PUSH-005: The platform SHALL track push notification delivery rates, open rates, and action rates for optimization.
- FR-PUSH-006: Push notifications SHALL be configurable per campaign with the ability to enable/disable specific notification types.
- FR-PUSH-007: The platform SHALL support notification channels/categories (iOS) and notification channels (Android) for user-controlled granular notification preferences.
- FR-PUSH-008: Silent/background push notifications SHALL be used for triggering content pre-downloads and data synchronization without user interruption.

---

## 10. Compliance & Regulatory Alignment

### 10.1 Supported Compliance Frameworks

| Framework          | Training Requirements                                                               | Platform Support                                                        |
| ------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **NIST CSF 2.0**   | Awareness and training (PR.AT) across all identified roles                          | Pre-built modules mapped to NIST categories                             |
| **ISO 27001:2022** | A.6.3 Information security awareness, education, and training                       | Audit-ready completion evidence and certification                       |
| **SOC 2 Type II**  | CC1.4 Security awareness training for personnel                                     | Automated compliance reporting with evidence collection                 |
| **PCI DSS 4.0**    | Req 12.6 Security awareness program for all personnel                               | PCI-specific content modules with annual recertification tracking       |
| **HIPAA**          | Security awareness training per 45 CFR 164.308(a)(5)                                | Healthcare-specific content with PHI handling scenarios                 |
| **GDPR**           | Article 39(1)(b) -- awareness-raising and training for data processing              | Data protection modules with EU-specific scenarios; DPO reporting       |
| **CCPA/CPRA**      | Staff training on consumer privacy rights and handling                              | California-specific privacy content modules                             |
| **CMMC 2.0**       | AT.L2-3.2.1 through AT.L2-3.2.3 Awareness and training                              | Defense contractor-specific content; evidence export for CMMC assessors |
| **DORA**           | Article 13(6) -- ICT security awareness and digital operational resilience training | Financial services EU content; ICT risk management scenarios            |
| **NIS2**           | Article 20 -- Cybersecurity training for management bodies and employees            | EU-wide critical infrastructure training modules                        |
| **FedRAMP**        | AT-1 through AT-4 controls (NIST 800-53 family)                                     | Federal government-appropriate content with FedRAMP evidence package    |

### 10.2 Compliance Reporting Requirements

- FR-COMP-001: The platform SHALL generate compliance evidence packages per framework, including completion certificates, assessment scores, training dates, and module content summaries.
- FR-COMP-002: Compliance reporting SHALL be exportable in PDF, CSV, and API-accessible JSON formats.
- FR-COMP-003: The platform SHALL support compliance deadline tracking with automatic alerts when certification renewal is approaching.
- FR-COMP-004: The platform SHALL maintain immutable audit logs of all training completions, assessment results, and phishing simulation interactions for a configurable retention period (default: 7 years).
- FR-COMP-005: The platform SHALL support electronic signature capture for policy acknowledgments and compliance certifications.

---

## 11. Analytics & Reporting

### 11.1 Analytics Architecture

| Layer           | Components                                                    | Purpose                                           |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Data Collection | xAPI statements, SCORM data, simulation events, system events | Raw event capture                                 |
| Data Processing | Real-time stream processing + batch ETL                       | Event enrichment, aggregation, and transformation |
| Data Storage    | Time-series database + data warehouse + LRS                   | Queryable analytics storage                       |
| Visualization   | Built-in dashboards + API for external BI tools               | Insights delivery                                 |
| Intelligence    | ML-based risk scoring + trend analysis + anomaly detection    | Predictive and prescriptive analytics             |

### 11.2 Dashboard Categories

| Dashboard             | Audience                | Key Metrics                                                                           |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| Executive Summary     | CISO, Board, C-Suite    | Organizational risk score, compliance posture, trend lines, industry benchmarking     |
| Operational           | Security Awareness Team | Campaign performance, completion rates, engagement metrics, content effectiveness     |
| Manager               | Line Managers           | Team compliance status, individual performance, overdue assignments, risk individuals |
| Learner               | Individual Employees    | Personal progress, competency scores, achievements, upcoming assignments              |
| Compliance            | GRC Team, Auditors      | Framework-specific compliance status, evidence packages, certification tracking       |
| Phishing              | Security Operations     | Simulation results, click rates, report rates, repeat offenders, trend analysis       |
| Content Effectiveness | Content Developers      | Module engagement, completion rates, assessment performance, feedback scores          |
| Technical             | Platform Administrators | System health, integration status, sync errors, API usage, performance metrics        |

### 11.3 API & Export

- FR-ANAL-001: The platform SHALL provide a RESTful analytics API with pagination, filtering, and sorting for all reporting data.
- FR-ANAL-002: The platform SHALL support GraphQL query interface for flexible, client-defined data retrieval.
- FR-ANAL-003: The platform SHALL support scheduled data exports to S3-compatible storage, SFTP, or webhook endpoints.
- FR-ANAL-004: The platform SHALL provide pre-built connectors for Power BI, Tableau, and Looker.
- FR-ANAL-005: All analytics data SHALL be available with a maximum latency of 5 minutes from event occurrence (real-time dashboards: 60 seconds).

---

## 12. Technical Architecture Summary

### 12.1 Integration Architecture

```
                    +-------------------+
                    |   Identity Layer  |
                    |  (SAML/OIDC/SCIM) |
                    +--------+----------+
                             |
    +----------+    +--------v----------+    +------------------+
    | AD/LDAP  +--->|                   |<---+ HRIS/HCM         |
    | Directory|    |   DMZ Training    |    | (Workday, SAP,   |
    +----------+    |   Platform Core   |    |  BambooHR)       |
                    |                   |    +------------------+
    +----------+    |  +-------------+  |
    | Email    +--->|  | Simulation  |  |    +------------------+
    | Gateway  |    |  | Engine      |  +--->| LRS (xAPI)       |
    | (O365,   |<---+  +-------------+  |    | Learning Record  |
    |  Gmail)  |    |                   |    | Store             |
    +----------+    |  +-------------+  |    +------------------+
                    |  | Content     |  |
    +----------+    |  | Delivery    |  |    +------------------+
    | LMS      |<-->|  | Engine      |  +--->| SIEM/SOAR        |
    | Platforms|    |  +-------------+  |    | (Splunk, Sentinel,|
    | (SCORM,  |    |                   |    |  Palo Alto XSOAR) |
    | LTI,xAPI)|    |  +-------------+  |    +------------------+
    +----------+    |  | Analytics   |  |
                    |  | Engine      |  |    +------------------+
    +----------+    |  +-------------+  +--->| BI Tools         |
    | Mobile   |<-->|                   |    | (Power BI,       |
    | Apps     |    |  +-------------+  |    |  Tableau, Looker) |
    | (iOS,    |    |  | Campaign    |  |    +------------------+
    |  Android)|    |  | Manager     |  |
    +----------+    |  +-------------+  |    +------------------+
                    |                   +--->| Notification     |
    +----------+    +-------------------+    | Services (Email, |
    | CDN      |<-->|   Content CDN     |    | Push, SMS, Slack)|
    | (Global) |    +-------------------+    +------------------+
    +----------+
```

### 12.2 Non-Functional Requirements

| Requirement     | Specification                                                       |
| --------------- | ------------------------------------------------------------------- |
| Availability    | 99.9% uptime SLA (excluding scheduled maintenance)                  |
| Scalability     | Support 500,000+ concurrent users across all tenants                |
| Performance     | API response time <200ms (p95); page load <2s; video start <2s      |
| Data Residency  | Configurable data residency (US, EU, APAC, custom regions)          |
| Encryption      | TLS 1.3 in transit; AES-256 at rest; field-level encryption for PII |
| Backup          | RPO <1 hour; RTO <4 hours                                           |
| Multi-Tenancy   | Full logical tenant isolation with configurable data segregation    |
| API Rate Limits | Configurable per-tenant API rate limits with graceful degradation   |
| Accessibility   | WCAG 2.1 Level AA compliance across all user interfaces             |
| Browser Support | Chrome, Firefox, Safari, Edge (current version minus 2)             |

### 12.3 Security Requirements

| Requirement              | Specification                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| Penetration Testing      | Annual third-party penetration test; continuous automated scanning                              |
| SOC 2 Type II            | Platform provider must maintain SOC 2 Type II certification                                     |
| ISO 27001                | Platform provider should maintain ISO 27001 certification                                       |
| Data Classification      | All platform data classified and handled per organizational policy                              |
| Audit Logging            | Immutable audit logs for all administrative actions, authentication events, and data access     |
| Incident Response        | Documented security incident response plan with <1 hour notification SLA for critical incidents |
| Vulnerability Management | Critical vulnerabilities patched within 24 hours; high within 7 days                            |

---

## 13. Appendices

### Appendix A: Glossary

| Term  | Definition                                                                                  |
| ----- | ------------------------------------------------------------------------------------------- |
| AICC  | Aviation Industry Computer-Based Training Committee; legacy eLearning standard              |
| AGS   | Assignment and Grade Services; LTI service for grade passback                               |
| BEC   | Business Email Compromise; targeted email fraud impersonating executives                    |
| CAT   | Computerized Adaptive Testing; assessment algorithm adjusting difficulty per response       |
| CDN   | Content Delivery Network; globally distributed content caching infrastructure               |
| cmi5  | xAPI profile for LMS-launched content; bridge between SCORM and xAPI                        |
| HACP  | HTTP-based AICC/CMI Protocol; AICC communication method                                     |
| JIT   | Just-in-Time; training delivered at the moment of need                                      |
| LRS   | Learning Record Store; database for xAPI learning event data                                |
| LTI   | Learning Tools Interoperability; standard for embedding external tools in LMS               |
| NRPS  | Names and Role Provisioning Services; LTI service for learner roster sync                   |
| PIF   | Package Interchange Format; SCORM content packaging specification                           |
| PKCE  | Proof Key for Code Exchange; OAuth 2.0 extension preventing authorization code interception |
| SCIM  | System for Cross-domain Identity Management; user provisioning standard                     |
| SCO   | Sharable Content Object; individual SCORM learning content unit                             |
| SCORM | Sharable Content Object Reference Model; eLearning interoperability standard                |
| xAPI  | Experience API; modern learning event tracking specification (also known as Tin Can API)    |

### Appendix B: Reference Standards

| Standard   | Version         | Specification URL                                                  |
| ---------- | --------------- | ------------------------------------------------------------------ |
| SCORM 1.2  | 1.2             | https://adlnet.gov/projects/scorm-2004-4th-edition/                |
| SCORM 2004 | 4th Edition     | https://adlnet.gov/projects/scorm-2004-4th-edition/                |
| xAPI       | 1.0.3 / 2.0     | https://github.com/adlnet/xAPI-Spec                                |
| cmi5       | 1.0             | https://github.com/AICC/CMI-5_Spec_Current                         |
| LTI        | 1.3 + Advantage | https://www.imsglobal.org/activity/learning-tools-interoperability |
| AICC       | HACP 1.0        | https://aicc.org/joomla/dev/aicc/                                  |
| SCIM       | 2.0             | https://datatracker.ietf.org/doc/html/rfc7644                      |
| SAML       | 2.0             | https://docs.oasis-open.org/security/saml/v2.0/                    |
| OIDC       | 1.0             | https://openid.net/specs/openid-connect-core-1_0.html              |
| OAuth      | 2.0 / 2.1       | https://datatracker.ietf.org/doc/html/rfc6749                      |
| WCAG       | 2.1             | https://www.w3.org/TR/WCAG21/                                      |

### Appendix C: Acceptance Criteria Summary

| Domain                | Critical Acceptance Criteria                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LMS Integration       | SCORM 1.2/2004 packages pass ADL conformance tests; LTI 1.3 certified; xAPI statements conform to specification; verified integration with all 5 Tier 1 LMS platforms         |
| Content Delivery      | Microlearning modules completable in <5 min; adaptive engine adjusts within 1 module; spaced repetition intervals dynamically calculated                                      |
| Phishing Simulation   | 500+ templates available; simulations indistinguishable from real email in target mail clients; zero actual credential storage; report button functional in Outlook and Gmail |
| Training Content      | All content WCAG 2.1 AA compliant; interactive modules functional across all supported browsers/devices; gamification elements configurable per tenant                        |
| Curriculum Management | 6+ pre-built role paths; content available in 10+ Tier 1 languages; custom content integrated with analytics/gamification                                                     |
| User Management       | SSO functional with all Tier 1 IdPs; SCIM provisioning handles full lifecycle; AD/LDAP sync supports 500K+ users                                                              |
| Campaign Management   | Automated enrollment triggers within specified latency; escalation workflows configurable per campaign; manager dashboards show real-time team status                         |
| Mobile Learning       | Native apps on iOS and Android; offline content available for 30 days; push notifications delivered within 60 seconds of trigger; content renders correctly on 320px screens  |

---

_This document is a living specification and will be updated as platform requirements evolve. All requirements are subject to prioritization during implementation planning._

**Document Control:**

| Version | Date       | Author                           | Changes         |
| ------- | ---------- | -------------------------------- | --------------- |
| 1.0     | 2026-02-05 | Enterprise L&D Architecture Team | Initial release |
