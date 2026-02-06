# 08 -- Frontend Architecture & SvelteKit Design Specification

## The DMZ: Archive Gate -- Design Document

**Document ID:** DD-08
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Engineering & Design
**Authors:** Frontend Architecture Team, Matrices GmbH

---

## Table of Contents

1. Executive Summary
2. Scope and Non-Goals
3. Inputs and Dependencies
4. Architecture Principles
5. Product Surfaces and User Journeys
6. SvelteKit Stack and Build Targets
7. Project Structure and Module Boundaries
8. Routing and Layout Architecture
9. Rendering Model and Data Loading
10. State Management Strategy
11. Game Client Architecture
12. Enterprise Admin Architecture
13. UI System, Theming, and Terminal Aesthetic
14. Component Architecture and Reuse Patterns
15. API Integration Layer
16. Authentication, Authorization, and Tenant Context
17. Real-Time, Event Streams, and Multiplayer Readiness
18. Offline, PWA, and Resilience
19. Persistence, Local Data, and Sync
20. Accessibility Implementation Plan
21. Performance and Optimization
22. Security and Privacy Controls
23. Internationalization and Localization
24. Testing and Quality Strategy
25. Observability, Telemetry, and Analytics
26. Deployment, Environments, and CI/CD
27. Cross-Platform Packaging (Web, Steam, Mobile)
28. Feature Flags and Experimentation
29. Risks and Mitigations
30. Open Questions and Decision Log
31. Appendices
32. Detailed Route Map and Navigation Rules
33. Detailed Client Data Contracts
34. Panel-Level UI Specification
35. Admin View Specification
36. Theming Implementation Details
37. Accessibility Scenarios and Controls
38. Performance Budgets and Profiling Plan
39. Offline Sync and Conflict Resolution
40. Frontend Implementation Roadmap
41. Detailed Data Flow Walkthrough
42. Security Threat Model and Content Safety
43. UX Feedback and Microinteractions
44. Settings and Configuration Model
45. API Interaction Examples and Error Handling
46. Localization Pipeline and Content Governance

---

## 1. Executive Summary

This document defines the frontend architecture for The DMZ: Archive Gate using SvelteKit 2.x with Svelte 5 and TypeScript. The frontend must deliver a stealth-learning game experience that feels like a real terminal while simultaneously supporting enterprise administration, compliance reporting, and analytics. It must align with the deterministic state machine, the Threat Engine and breach mechanics, the terminal UI system, and the backend modular monolith with event-sourced game sessions.

The architecture is designed to serve two audiences with one codebase. The game experience is a highly responsive, terminal-themed client that prioritizes immersion, accessibility, and determinism. The enterprise experience is a clean, professional SaaS dashboard that prioritizes clarity, compliance evidence, and administrative control. Both experiences share a unified design token system and a shared API layer, but they are separated at the routing and layout level to prevent visual and cognitive crossover.

The SvelteKit architecture centers on a server-authoritative game model with client-side state mirrors. Client actions are captured as events, validated locally for UX responsiveness, and then submitted to the backend game engine, which remains the source of truth. The client maintains a local event queue with deterministic replay to support offline and intermittent connectivity. This aligns with the BRD requirement for cross-device determinism and the backend requirement for event sourcing.

The frontend architecture explicitly supports multi-tenant enterprise deployments, SSO and SCIM provisioning flows, and LMS integrations. It also supports consumer gameplay at scale with PWA offline support, aggressive asset caching, and deterministic content delivery. This document describes the technical structure, data flow, and operational practices required to meet those goals.

---

## 2. Scope and Non-Goals

**In scope**

- A complete frontend architecture specification for SvelteKit 2.x (Svelte 5) covering game UI, enterprise admin UI, and shared infrastructure.
- Routing, layouts, and data-loading patterns for game and admin surfaces.
- State management, event queueing, and deterministic replay for the game client.
- Integration patterns for REST, GraphQL, and WebSocket interfaces described in the backend design.
- Theming and accessibility implementation aligned with the terminal aesthetic specification.
- Offline/PWA support, performance strategies, and security posture for the web client.
- Cross-platform packaging strategy for web, Steam, and mobile with a shared SvelteKit core.

**Out of scope**

- Backend services, APIs, or database schema beyond the necessary client integration assumptions.
- Narrative content authoring, scenario generation, and AI content pipeline implementation.
- Detailed UI mockups or art direction beyond the system-level guidance in DD-07.
- Multiplayer gameplay rules or peer-to-peer networking details (only frontend readiness).
- Marketing website implementation (only minimal routing considerations).

---

## 3. Inputs and Dependencies

The frontend architecture is anchored in the following authoritative sources and must remain consistent with them:

- **BRD-DMZ-2026-001** for overall vision, dual-market strategy, stealth learning approach, platform targets, and non-functional requirements.
- **DD-01 Game Core Loop & State Machine** for the authoritative gameplay phases, event names, and deterministic state transitions.
- **DD-05 Threat Engine & Breach Mechanics** for threat tiers, tier visual encoding, incident and breach flows, and attack cadence.
- **DD-07 UI/UX Terminal Aesthetic** for the terminal aesthetic, layout architecture, accessibility, theming system, and diegetic UI rules.
- **DD-09 Backend Architecture & API** for REST/GraphQL endpoint design, event sourcing, authentication, and WebSocket integration.

Key dependency assumptions extracted and enforced in this architecture:

- The backend is authoritative for game state, and the frontend must never become a source of truth.
- Determinism is mandatory for enterprise audit, requiring that the frontend maintain event logs and stable identifiers.
- Threat tier naming and iconography are canonical and must match DD-05 and DD-07.
- The game UI and admin UI are separate surfaces with separate layout and styling systems, even when sharing code.
- SvelteKit is the official frontend framework and must be used with TypeScript in strict mode.

---

## 4. Architecture Principles

The architecture follows these principles to preserve product intent and ensure implementation clarity.

1. **Server-authoritative, client-responsive.** The backend owns game truth. The client maintains a responsive mirror with optimistic UI bounded by local validation, but the backend resolves final state. The client always reconciles to server state and event sequence.

2. **Determinism first.** Every client action is represented as an event with a stable ID and sequence. Replays must be possible using the same seed and event history. The client must be able to reconstruct its view from events and snapshots.

3. **Separation of surfaces.** The game UI and admin UI share a repository but are separated at the route and layout level. Visual systems and interaction models are distinct to avoid cross-contamination.

4. **Accessibility over immersion.** The terminal aesthetic is optional and never blocks readability or functionality. All effects are layered and disableable.

5. **Progressive enhancement.** The app must work on modern browsers without WebGL or advanced graphics. Enhanced features such as PixiJS facility views or CRT effects layer on top of a functional base.

6. **Offline and resilience.** Offline play is supported for the consumer game and guided demo. Enterprise deployments may disable offline if policy requires, but the architecture must support it.

7. **Scalable modularity.** The frontend codebase is partitioned by domain and feature. It must remain navigable as the content and feature set expands across seasons and enterprise integrations.

8. **Security by default.** All user content is treated as untrusted. HTML rendering is sanitized and CSP is strict. PII storage is minimized and protected.

9. **Observability and auditability.** Client actions produce telemetry that matches backend event types, enabling end-to-end auditing and behavior analytics.

---

## 5. Product Surfaces and User Journeys

The frontend serves multiple surfaces with distinct user journeys.

**Game surface**

- Primary gameplay loop with email triage, verification, decisions, consequences, threat and incident response, resource management, upgrades, and day advancement.
- Seasonal episodic content delivery: 4 seasons per year, each with 11 chapters over 12 weeks (BRD FR-CON-005). Each chapter contains narrative briefing, 3-5 core access decisions, 1 incident event, 1 intelligence update, 1 character moment, and optional side quests (BRD FR-CON-007).
- Narrative delivery via intelligence briefs, Morpheus messages, and faction communications.
- Spaced repetition review sessions delivered via the frontend, using a modified Leitner system with SM-2 algorithm (BRD Section 11.2). Review sessions are under 2 minutes, with intervals from 1 day (new concept) to 180 days (mastered). Content is interleaved for improved discrimination.
- Player settings, accessibility configuration, and terminal customization.
- PWA features and offline-friendly demo mode.

**Enterprise admin surface**

- Tenant management, user provisioning, RBAC, SCIM synchronization.
- Campaign management for phishing simulations.
- Compliance reporting and export workflows.
- Analytics dashboards for CISO and training outcomes.

**Shared surface**

- Authentication (local and SSO), account management, password reset.
- Legal documents and support pages.
- Settings and profile preferences that span game and admin, such as language and notification settings.

**Key journeys and constraints**

- The game journey must be playable end-to-end without entering the admin surface.
- Enterprise admin users may never play the game, but must still access reporting, audit logs, and export flows.
- Consumer players may never sign up for enterprise features but still need cross-device save sync and stable progression.
- The architecture must allow white-labeling of admin UI and branding tweaks for enterprise tenants.

---

## 6. SvelteKit Stack and Build Targets

**Frontend stack**

- **Framework:** SvelteKit 2.x with Svelte 5 runes.
- **Language:** TypeScript 5.x, strict mode enabled.
- **Bundler:** Vite (SvelteKit standard).
- **Styling:** CSS custom properties and component-scoped styles. PostCSS optional for autoprefixing.
- **Graphics:** PixiJS 8.x for facility visualization. D3.js 7.x for analytics charts.
- **Testing:** Vitest, Playwright, and Testing Library.

**Build targets**

- **Web (primary):** SvelteKit with Node adapter for SSR and API proxy routes.
- **PWA:** Service worker enabled, offline caching for demo and optional consumer gameplay.
- **Steam (desktop):** Electron or Tauri wrapper around the SvelteKit build, using the same web bundle.
- **Mobile (later):** Web PWA and optional native wrapper for iOS/Android with full offline and push support.

**Adapter strategy**

- The main app uses `adapter-node` to support SSR, secure cookies, and server hooks.
- Static marketing or documentation pages can be built with `adapter-static` in a separate project if needed, but are not the primary focus of this architecture.

---

## 7. Project Structure and Module Boundaries

The frontend codebase is organized to mirror backend domains and ensure strong boundaries between game and admin surfaces.

```
src/
  routes/
    (public)/
      +layout.svelte
      +layout.ts
      +page.svelte
      legal/
      support/
    (auth)/
      +layout.svelte
      login/+page.svelte
      sso/+page.svelte
      reset/+page.svelte
    (game)/
      +layout.svelte
      +layout.ts
      +page.svelte
      inbox/+page.svelte
      incident/+page.svelte
      facility/+page.svelte
      upgrades/+page.svelte
      settings/+page.svelte
    (admin)/
      +layout.svelte
      +layout.ts
      dashboard/+page.svelte
      users/+page.svelte
      campaigns/+page.svelte
      reports/+page.svelte
      audit/+page.svelte
      settings/+page.svelte
  lib/
    api/
      client.ts
      endpoints.ts
      graphql.ts
      websocket.ts
      schemas.ts
    game/
      state/
        reducer.ts
        events.ts
        selectors.ts
        state-machine.ts
      ui/
        panels/
        components/
      services/
        action-queue.ts
        replay.ts
        sync.ts
    admin/
      ui/
      analytics/
      reports/
    ui/
      components/
      layout/
      icons/
      tokens/
    stores/
      session.ts
      theme.ts
      settings.ts
      connectivity.ts
      notifications.ts
    utils/
      time.ts
      format.ts
      id.ts
      security.ts
  hooks.server.ts
  hooks.client.ts
  app.css
  service-worker.ts
  app.d.ts
```

**Boundary rules**

- Game modules under `src/lib/game` should not import from `src/lib/admin` or vice versa.
- Shared UI primitives live in `src/lib/ui` and are visually neutral, with theming applied at the layout level.
- API access is centralized under `src/lib/api` to ensure consistency in auth headers, error handling, and response validation.
- Stores are focused on cross-cutting concerns. Feature-specific state is contained within feature modules.

---

## 8. Routing and Layout Architecture

SvelteKit route groups separate the game and admin surfaces while sharing core infrastructure.

**Route groups**

- `(public)` for marketing and legal pages, minimal styling and no authentication.
- `(auth)` for login, SSO, and password recovery, with a neutral layout.
- `(game)` for all gameplay routes and terminal aesthetic layout.
- `(admin)` for enterprise dashboards, analytics, and management UI.

**Layout layers**

- `src/routes/(game)/+layout.svelte` sets the terminal theme, CRT effect layers, keyboard shortcuts, and game context providers.
- `src/routes/(admin)/+layout.svelte` sets the enterprise theme, admin navigation, and RBAC guards.
- `src/routes/(auth)/+layout.svelte` uses neutral styling and minimal layout to reduce cognitive load during authentication.
- Shared top-level layout establishes base metadata, error boundaries, and app-level stores.

**Guarding and redirects**

- Authentication guards are enforced in `+layout.server.ts` and `hooks.server.ts`, using server-side redirects to avoid UI flicker.
- Role-based access checks occur in the `(admin)` layout using server-provided claims and backend permissions.
- Game sessions are preloaded in `(game)` layout to ensure that nested routes can reuse session data without re-fetching.

---

## 9. Rendering Model and Data Loading

The frontend uses a hybrid rendering model optimized for rapid interactivity and deterministic state.

**SSR for entry and auth**

- Initial load for each surface uses SSR to reduce time to first content and to enable secure cookie validation.
- Authenticated user context and tenant metadata are loaded in `+layout.server.ts` and passed to the client as serialized data.

**CSR for gameplay**

- Once inside the game, most updates are client-driven and use incremental API calls to avoid full page reloads.
- The game view is treated as an application shell with internal panels and tabs. Route changes within `(game)` are shallow and typically preserve session state.

**Data loading patterns**

- Use `+page.server.ts` for authenticated data that should never be exposed client-side without validation.
- Use `+page.ts` for lightweight client-side fetches such as in-game panel updates or optional data.
- Use `defer` to stream large datasets for admin analytics without blocking UI rendering.

**Error handling and boundaries**

- Each route has a `+error.svelte` for user-friendly error states.
- Errors from API calls are normalized at the API client layer and mapped to error panels or modals.

---

## 10. State Management Strategy

The frontend uses a layered state approach to ensure clarity and determinism. This aligns with the BRD's three-layer state management model (Section 8.2) while extending it for the admin surface.

**Layer 1: Ephemeral UI state (local component state)**

- Svelte 5 runes (`$state`, `$derived`, `$effect`) and Svelte stores for ephemeral UI state such as active panel, selected email, temporary input, and visual toggles.
- Local state is preferred for UI controls that do not need cross-component sharing.

**Layer 2: Game state store (server-authoritative, synced)**

- Global stores exist for session, theme, settings, connectivity, and notifications.
- Stores are implemented with `writable` and `readable` and exposed through typed accessors.
- The game state store uses a TypeScript-typed `GameState` interface that is server-authoritative and synced.

**Layer 3: Event sourcing**

- Game state is event-sourced locally in `src/lib/game/state` to mirror backend behavior.
- All game actions are recorded as immutable events; state is derived by reducing the event log. This provides full replay, undo/redo, deterministic saves, and audit trail.
- The client maintains a `GameState` object and an `EventLog` with sequence numbers.
- Actions are validated against the current phase before submission.
- When server responses arrive, the local state is reconciled against authoritative events.

**Admin state (extension)**

- Admin pages use query-based state for filters and pagination, stored in the URL query string for shareable views.
- GraphQL responses are normalized and cached per view to avoid redundant loads.

---

## 11. Game Client Architecture

The game client is the most complex frontend surface. It must implement a deterministic phase-driven loop while preserving player agency and accessibility.

### 11.1 Core Game Shell

The game surface is structured as an application shell with named panels:

- Inbox panel for email list and triage flow.
- Document viewer panel for email body and attachments.
- Verification panel for identity and supporting documents.
- Status panel for threat level, funds, trust, and facility state.
- Action bar for approve, deny, flag, and verification actions.
- Terminal panel for system messages, coaching, and narrative notes.

The shell is persistent across game routes, reducing re-rendering and preserving context during navigation.

The game must render all 13 in-game document types defined in BRD Section 5.5, each serving dual purposes as gameplay artifacts and cybersecurity training instruments:

1. **Email Access Request** -- applicant profile, assets at risk, and requested services (teaches phishing analysis).
2. **Phishing Analysis Worksheet** -- signals of legitimacy and red flags (teaches structured threat assessment).
3. **Verification Packet** -- proof of identity, ownership, and chain-of-custody (teaches identity verification).
4. **Threat Assessment Sheet** -- risk score, known indicators, and recommended action (teaches risk scoring).
5. **Incident Log** -- timeline of attacks, breaches, and mitigations (teaches incident documentation).
6. **Data Salvage Contract** -- terms, liabilities, and fee structure (teaches data handling agreements).
7. **Storage Lease Agreement** -- capacity, term length, and renewal options (teaches SLA management).
8. **Upgrade Proposal** -- costs, lead time, and expected capacity gain (teaches security investment ROI).
9. **Blacklist Notice** -- entities barred from access and the rationale (teaches access control policy).
10. **Whitelist Exception** -- emergency access override and signatures (teaches exception management).
11. **Facility Status Report** -- power, cooling, and utilization metrics (teaches infrastructure monitoring).
12. **Intelligence Brief** -- current attacker behavior and active campaigns (teaches threat intelligence).
13. **Ransom Note** -- payment demand and deadline after a breach (teaches incident response under pressure).

### 11.2 Phase-driven Rendering

The UI adapts to the current state machine phase defined in DD-01. Each phase maps to a view model with explicit allowed actions.

- `DAY_START`: Show daily brief and intelligence summary. Only acknowledgement allowed.
- `INBOX_INTAKE`: Loading animation and queue summary.
- `EMAIL_TRIAGE`: Full triage view with inbox and email reader.
- `VERIFICATION_REVIEW`: Verification document viewer and cross-reference tools.
- `DECISION_RESOLUTION`: Submission confirmation and action summary.
- `CONSEQUENCE_APPLICATION`: Feedback toasts and day summary updates.
- `THREAT_PROCESSING`: Threat indicator animation and intelligence updates.
- `INCIDENT_RESPONSE`: Incident panel and response actions.
- `RESOURCE_MANAGEMENT`: Facility dashboard and allocation controls.
- `UPGRADE_PHASE`: Procurement system and upgrade catalog.
- `DAY_END`: Summary panel and explicit advance control.

The client does not invent phases. It renders according to the authoritative state machine snapshot retrieved from the backend.

### 11.3 Action Pipeline

Player actions follow a consistent pipeline:

1. **Local intent creation.** The UI constructs a typed action object and attaches local metadata such as time spent and UI context.
2. **Local validation.** The action is validated against the current phase and UI constraints. Invalid actions are rejected with a diegetic error message.
3. **Optimistic update.** If permitted, the client applies a provisional state update to keep the UI responsive.
4. **Event submission.** The action is submitted to the backend as a game action via the REST API.
5. **Reconciliation.** The server response returns authoritative outcomes, feedback, and event sequence numbers. The client replays server events and updates local state accordingly.

Local optimistic updates are always bounded by server reconciliation. The client never assumes correctness of a decision, only that it was submitted.

### 11.4 Event Queue and Sync

The event queue supports offline play and intermittent connectivity:

- Every action is stored in an IndexedDB-backed queue with a monotonically increasing client sequence ID.
- When connectivity is available, queued events are flushed in order.
- Server responses include authoritative sequence numbers. If divergence occurs, the client replays events from the last snapshot.
- The queue is encrypted at rest for consumer mode and disabled by policy for enterprise mode when required.

### 11.5 Deterministic Replay

The client maintains deterministic replay tools for debug and audit:

- A local replay function can rebuild UI state from the last server snapshot plus event log.
- Replay is used to recover from disconnects, corruption, or mismatched state.
- The replay system mirrors the backend reducer logic, using the same event definitions and versioning.

### 11.6 Facility Visualization

Facility visualization is an enhancement, not a dependency. The BRD establishes a hybrid DOM + Canvas rendering approach where DOM handles approximately 90% of gameplay (emails, worksheets, contracts, dashboards, dialog trees) and Canvas/WebGL handles approximately 10% (facility status map, network topology visualization, attack animation overlays). This section covers the Canvas portion.

- PixiJS renders a facility map, network topology visualization, and attack animation overlays.
- If WebGL is unavailable, the UI falls back to a static SVG or HTML representation.
- The visualization reads from derived state rather than owning state itself.
- The DOM base provides accessibility, text selection, screen reader support, and native form handling for the majority of the gameplay experience.

---

## 12. Enterprise Admin Architecture

The admin surface is structurally separate and optimized for clarity, scale, and audit workflows.

### 12.1 Layout and Navigation

- A persistent sidebar with sections for Dashboard, Users, Campaigns, Reports, Audit, and Settings.
- Breadcrumbs and page titles provide context for administrators managing multiple sections.
- Quick filters and search are prominent for user lists and campaign results.

### 12.2 Data Loading Strategy

- Admin pages use GraphQL for analytics views and REST for CRUD operations.
- Filters are reflected in the URL query string for shareable and reproducible views.
- Heavy charts are loaded lazily and rendered with D3.js using `requestIdleCallback` where supported.

### 12.3 Admin-specific State

- Tenant context, role permissions, and feature flags are loaded at layout level.
- Admin pages use local view state for filters and pagination, with caches for recent queries.

### 12.4 Export and Reporting

- Export requests are asynchronous, with job status polling.
- Download links are time-limited and include tenant scoping.

### 12.5 LMS Integration Support

The frontend must support the following LMS integration standards mandated by the BRD:

- **SCORM 1.2** compliant package export (all ADL conformance tests passed).
- **SCORM 2004 4th Edition** export with IMS Simple Sequencing for adaptive learning paths.
- **xAPI** (v1.0.3 and 2.0) statement emission for all learning-relevant interactions with custom verb vocabulary.
- **LTI 1.3** with LTI Advantage (Deep Linking, Assignment & Grade Services, Names & Role Provisioning Services).
- **cmi5** compliance (mandatory per BRD).
- **AICC HACP** protocol support for legacy LMS compatibility (recommended).

The frontend provides the client-side integration points required for these standards, including embedding support for LTI launches, xAPI event emission hooks tied to gameplay telemetry, and SCORM communication adapters. The admin UI includes configuration screens for LMS connection setup and status monitoring. Verified LMS integrations include Cornerstone, SAP SuccessFactors, Workday, Moodle, and Canvas.

---

## 13. UI System, Theming, and Terminal Aesthetic

The UI system implements the design tokens and rules defined in DD-07.

### 13.0 UX Design Philosophy (from BRD Section 11.5)

The game UI must adhere to the following UX principles from the BRD:

- **Diegetic first:** Every UI element exists within the game world. The interface is a virtual workstation at the Matrices GmbH data center.
- **Papers, Please-inspired:** Document inspection, stamp-based approval/denial, physical desk metaphor, moral weight of bureaucratic decisions.
- **Friction as pedagogy:** Deliberate friction (verifying sender details, cross-referencing documents) mirrors real security workflows. The inconvenience is the lesson.
- **No batch actions:** Each access request demands individual attention. This is deliberate, mirroring real security review.

### 13.1 Token System

- All colors, fonts, spacing, and effects are defined as CSS custom properties.
- The game and admin themes override the same token names to reduce duplication.
- Theme switching is applied by setting data attributes on the root element.

### 13.2 CRT Effects Layer

CRT effects are CSS overlays with `pointer-events: none` and are fully disableable.

- Scanlines, curvature, glow, and noise are separate toggles (per BRD Section 9.5).
- Effects respect `prefers-reduced-motion` and `prefers-contrast`.
- The base UI remains fully functional with all effects disabled.

### 13.3 Theming Controls

Theme state is stored in a `theme` store and persisted to `localStorage` for consumer and to user preferences for enterprise.

Theme options include:

- Green phosphor (default) -- dark background (#0a0e14), phosphor green (#33ff33) text per BRD Section 11.5
- Amber terminal -- dark background (#0a0e14), amber (#ffb000) text per BRD Section 11.5
- High contrast
- Enterprise clean
- Custom theme with contrast validation

### 13.4 Typography

- Terminal UI uses monospaced fonts for UI text and a proportional font for document bodies.
- Admin UI uses a clean proportional font stack.
- Dyslexia-friendly fonts are supported as an optional accessibility setting.

---

## 14. Component Architecture and Reuse Patterns

The component system aims for reuse without violating the separation of surfaces.

### 14.1 Shared Components

- `Panel`, `Badge`, `Button`, `Tabs`, `Modal`, `Tooltip`, `Toast`, `DataTable`, `Pagination`, `SearchInput`.
- Shared components do not include theme-specific styling. They are styled via tokens and layout-level classes.

### 14.2 Game Components

- `InboxList`, `EmailViewer`, `IndicatorList`, `VerificationPanel`, `ThreatMeter`, `IncidentLog`, `FacilityDashboard`, `UpgradeCatalog`, `ActionBar`, `DaySummary`, `TerminalOutput`.

### 14.3 Admin Components

- `MetricCard`, `ChartPanel`, `ComplianceMatrix`, `CampaignTable`, `AuditTimeline`, `UserRoleBadge`, `ExportStatus`.

### 14.4 Component Guidelines

- Components are functional and stateless where possible.
- State that must be shared is lifted into stores or passed down as props.
- All interactive components are keyboard accessible and emit analytics events.

---

## 15. API Integration Layer

A unified API client provides typed access to REST and GraphQL endpoints.

### 15.1 REST Client

- Uses `fetch` with credentials and tenant headers against RESTful API endpoints conforming to OpenAPI 3.0 specification (BRD Section 10.6).
- Endpoints are versioned (v1, v2) with 12-month deprecation windows per BRD API strategy.
- The client reads `X-RateLimit-Remaining` and `Retry-After` response headers (BRD Section 10.6) to implement rate limit awareness and automatic backoff.
- Zod schemas are shared between client and server (per BRD Section 8.3) and validate responses for safety and to catch backend regressions.
- Standard error envelope is normalized into a single error type.

### 15.2 GraphQL Client

- A lightweight GraphQL client is used for analytics queries.
- Responses are cached per query and invalidated on filter changes.

### 15.3 API Error Handling

- Errors are categorized into authentication, authorization, validation, rate limiting, and server failures.
- The UI maps error categories to user-friendly, diegetic messages for the game and standard alerts for admin.

---

## 16. Authentication, Authorization, and Tenant Context

### 16.1 Session Handling

- Access tokens are stored in HttpOnly cookies managed by the backend.
- `hooks.server.ts` extracts session data and attaches it to `locals`.
- Client code never reads raw tokens and relies on server-side session validation.
- Maximum Super Admin session duration is 4 hours with no refresh, as mandated by the BRD security requirements. The frontend must enforce session expiration and redirect to re-authentication when this limit is reached.

### 16.2 Tenant Context

- Tenant context is determined from subdomain or tenant slug and stored in `locals`.
- Tenant ID is included in all API requests as a header or derived from the cookie.

### 16.3 Role-Based Access

- The platform implements a hybrid RBAC + ABAC model with the following built-in roles defined in the BRD: Super Admin, Tenant Admin, Manager, Trainer, and Learner. Custom roles with granular permission composition are also supported.
- Admin routes verify role permissions on the server before rendering. ABAC policy evaluation must remain under 10ms (P99).
- UI elements are conditionally displayed based on permission claims.
- Scope restrictions may limit roles to specific departments, teams, or locations, and time-bound role assignments with expiration dates are supported.

### 16.4 SSO and SCIM

- SSO flows redirect to the IdP and return to a dedicated callback route. Both SAML 2.0 (SP-initiated and IdP-initiated with encrypted assertions) and OIDC (Authorization Code + PKCE) are supported per the BRD.
- SCIM 2.0 provisioning (RFC 7643/7644) is backend-driven, with SCIM user sync latency under 60 seconds. The admin UI exposes configuration and status, and supports just-in-time provisioning on first SSO login for simpler deployments.

### 16.5 Hardware-Backed MFA for Super Admins (WebAuthn)

BRD security requirements mandate hardware-backed MFA (FIDO2/WebAuthn) for Super Admin access. The frontend must implement both enrollment and authentication flows using the WebAuthn API (`navigator.credentials`) and provide clear UI/UX around device registration, naming, and verification.

Required capabilities:

- **Enrollment:** Super Admins must enroll at least one hardware-backed authenticator (security key or platform authenticator) before being granted privileged access. Enrollment includes device naming, attestation verification, and explicit confirmation.
- **Authentication:** Super Admin login requires a WebAuthn challenge-response flow after primary authentication. The UI must block access to privileged admin routes until the WebAuthn assertion succeeds.
- **Policy enforcement:** If WebAuthn enrollment is missing or revoked, the admin surface should show a blocking screen with guidance rather than offering weaker factors.
- **Fallback control:** No SMS or email MFA fallback is permitted for Super Admins unless explicitly approved by security policy. Recovery flows must be handled through audited, out-of-band admin processes.
- **Device management:** The admin settings surface must allow viewing, renaming, and revoking registered authenticators, with audit log entries for every change.
- **Browser support:** The UI must detect WebAuthn availability and provide remediation steps for unsupported environments.

Integration notes:

- WebAuthn challenges are issued by the backend and consumed by the client. The frontend must pass challenge payloads to `navigator.credentials.get` and return signed assertions to the backend for verification.
- Enrollment uses `navigator.credentials.create` with resident keys if required by policy.
- All WebAuthn responses must be submitted over secure, same-site requests and validated by Zod schemas before submission.

---

## 17. Real-Time, Event Streams, and Multiplayer Readiness

### 17.1 WebSocket and SSE Integration

- WebSockets are used for real-time updates such as campaign status, threat alerts, and admin notifications.
- The client maintains a single WebSocket connection per authenticated session and monitors health via heartbeat.
- If WebSockets are blocked or fail to connect within a short timeout, the client falls back to Server-Sent Events (SSE) for the same event stream. The client periodically retries WebSocket upgrade while SSE remains active.
- SSE uses `Last-Event-ID` for resume to avoid missed events in corporate proxy environments.
- Messages are validated with Zod before processing.

### 17.2 Event Types

- `game.event` for gameplay updates.
- `admin.notification` for audit and compliance events.
- `system.status` for maintenance or outage notices.

### 17.3 Multiplayer Readiness

- The client state architecture is designed to support future cooperative modes (2-6 player co-op missions per BRD FR-MP-001) and competitive modes (Red Team / Blue Team per BRD FR-MP-005 through FR-MP-010).
- Event payloads include a `sessionId` and `actorId` to support multi-actor events.
- Role specialization UI must support real SOC role mapping: Perimeter Warden, Intake Analyst, Threat Hunter, Systems Keeper, Crypto Warden, Comms Officer (BRD FR-MP-002).
- Guild/Corporation UI scaffolding must support organizational hierarchy mapping, shared intelligence feeds, joint defense operations, alliance formation, and corporation treasury (BRD FR-MP-011 through FR-MP-014).
- Enterprise team competition features must support department-based competitions with manager visibility, organization-wide leaderboards with configurable privacy, cross-organization anonymized benchmarking, and CTF/tournament events (BRD FR-MP-015 through FR-MP-018).
- Ranked play UI must support Elo-based matchmaking with independent Red/Blue ranks (BRD FR-MP-008).

---

## 18. Offline, PWA, and Resilience

Offline support is a key differentiator for consumer engagement and demo accessibility.

### 18.1 Service Worker Strategy

- The service worker is implemented using Workbox for precaching the app shell and runtime caching of game content, as specified in the BRD.
- Static assets use a cache-first strategy with content-hashed filenames (1-year TTL).
- API requests use network-first with a fallback to cached data for non-sensitive endpoints.
- Sensitive endpoints are never cached.

### 18.2 Offline Game Mode

- Offline play is available for consumer demo and non-enterprise sessions.
- The client uses pre-generated content bundles and deterministic seeds. The full pre-generated email pool maintained across difficulty tiers is 200+ emails (BRD FR-GAME-004), with an offline content budget of 50 handcrafted email scenarios for offline play with graceful degradation when AI-generated content is unavailable, matching the BRD offline content specification (Section 8.2).
- Actions are queued and synced when connectivity returns.

### 18.3 Enterprise Policy Controls

- Enterprise tenants can disable offline mode and local persistence.
- The UI respects tenant policy and hides offline settings when disabled.

---

## 19. Persistence, Local Data, and Sync

### 19.1 Local Storage Usage

- Theme and accessibility preferences are stored locally for consumer players.
- Enterprise preferences are stored server-side and synced on login.

### 19.2 IndexedDB

- Used for event queues, offline content bundles, and cached assets.
- Data is encrypted at rest for consumer mode when feasible.

### 19.3 Sync Strategy

- Sync uses an exponential backoff retry strategy.
- Conflicts are resolved by replaying server-authoritative events.

---

## 20. Accessibility Implementation Plan

Accessibility is a primary requirement and is implemented at multiple layers. The platform targets WCAG 2.1 Level AA compliance as a baseline (legal obligation, not optional), Section 508 compliance for US government market access, and EN 301 549 compliance for EU market per the BRD.

- All interactive elements are keyboard accessible with visible focus indicators and follow logical focus order.
- CRT effects are optional and can be disabled entirely. CRT aesthetic effects are implemented as CSS overlays on a clean, accessible base UI.
- High-contrast mode is available and overrides all colors. Minimum 4.5:1 contrast ratio for all text; 3:1 for large text.
- Screen reader support with ARIA roles, properties, and live regions. Screen reader optimized mode provides simplified layouts and enhanced ARIA labels.
- One-switch mode provides sequential focus scanning.
- No per-email timers are used; time pressure is simulated via queue aging only. Timed assessments allow time extension.
- Color-blind safe palette with secondary encoding (text labels, icons, patterns).
- `prefers-reduced-motion` respected for all animations.
- Captions for all video/audio content; transcripts available.
- A VPAT (Voluntary Product Accessibility Template) is maintained and updated with each release per BRD requirements.

---

## 21. Performance and Optimization

Performance must remain high even with heavy UI effects and large datasets.

- Code splitting by route group reduces initial bundle size.
- PixiJS and D3 are loaded dynamically only on pages that require them.
- Large lists such as inbox or user tables use virtualization to avoid DOM bloat.
- CSS effects are offloaded to compositing layers where possible.
- API responses are cached with short TTLs to reduce redundant calls.
- Static assets are served through the CDN edge layer (Cloudflare/CloudFront) as specified in the BRD, with content-hashed filenames for long-term caching. The caching hierarchy follows: Browser Cache --> CDN Edge --> Application Cache (Redis) --> Database (PostgreSQL).

---

## 22. Security and Privacy Controls

- OWASP Top 10 compliance for all web application components per BRD Section 7.4.
- All connections require TLS 1.2+ with strong cipher suites per BRD Section 7.4.
- All HTML content is sanitized before rendering.
- CSP is enforced to prevent inline script execution.
- Trusted Types are enabled to reduce XSS risk.
- Session tokens are stored only in HttpOnly cookies.
- Sensitive data is never cached in the service worker.
- PII is not stored in local persistence for enterprise mode.

---

## 23. Internationalization and Localization

- The UI uses a message catalog with ICU message formatting.
- Language selection is stored per user and per tenant.
- Locale-specific date, number, and currency formatting follows locale settings (BRD Section 7.6).
- Unicode (UTF-8) support across the entire frontend (BRD Section 7.6).
- All text is extracted into translation files to support the 24 official EU languages plus RTL languages (Arabic, Hebrew, Farsi) mandated by the BRD.
- Content localization (not just UI translation) for training modules (BRD Section 7.6).

---

## 24. Testing and Quality Strategy

- Unit tests for reducers, selectors, and utility functions.
- Component tests for key UI flows and accessibility behaviors.
- End-to-end tests for critical journeys: login, game day cycle, admin report export.
- Performance testing with Lighthouse and WebPageTest.
- Accessibility testing with automated tooling and manual audits.

---

## 25. Observability, Telemetry, and Analytics

- Client events mirror backend event types for consistency.
- Telemetry includes action timings, error rates, and UI performance metrics.
- Analytics data is batched and sent to the backend to avoid network spam.
- Enterprise deployments can disable consumer analytics and limit telemetry to compliance metrics.
- Frontend observability integrates with the platform-wide Prometheus + Grafana monitoring stack specified in the BRD. Client-side metrics are exported to Prometheus-compatible endpoints for alerting and dashboarding.

---

## 26. Deployment, Environments, and CI/CD

- Environments: local, staging, production, enterprise dedicated.
- Environment variables are injected at build time and validated at runtime.
- CI runs lint, unit tests, component tests, and E2E tests before deploy. Automated security scanning and accessibility validation are included in the CI/CD pipeline per the BRD. Annual penetration testing by third-party firm and a responsible disclosure program are additionally mandated by BRD Section 7.4.
- Blue-green deployments are used for zero-downtime updates as specified in the BRD. Canary deployments are additionally supported for consumer releases with staged rollouts.
- Deployment strategy must support BRD availability SLAs: Consumer 99.5% uptime (rolling deployments, no scheduled downtime), Enterprise Standard 99.9% uptime (4-hour monthly maintenance window), and Enterprise Premium 99.95% uptime (zero-downtime deployments). The frontend must display appropriate maintenance notices and graceful degradation during planned windows.

---

## 27. Cross-Platform Packaging (Web, Steam, Mobile)

- Web is the source of truth and receives all features first.
- Steam builds wrap the web client in a desktop shell with local file access for saves.
- Mobile builds prioritize PWA performance and offline support, with optional native wrappers for push notifications.

---

## 28. Feature Flags and Experimentation

- Feature flags are evaluated server-side and passed in session payloads.
- Flags support A/B testing for onboarding flows, hinting systems, UI layouts, game mechanics, and training content (BRD FR-AN-020).
- Experiments are isolated by tenant to avoid cross-contamination.
- The frontend must instrument player retention tracking at D1, D7, D30, D60, and D90 intervals (BRD FR-AN-017), session duration and frequency analytics (BRD FR-AN-018), and content effectiveness scoring per module (BRD FR-AN-019).
- Predictive analytics hooks must support identification of at-risk players likely to churn or fail assessments (BRD FR-AN-021).

---

## 29. Risks and Mitigations

- **Risk:** SvelteKit ecosystem maturity and smaller hiring pool (BRD Section 14.2). **Mitigation:** strict TypeScript (competence transfers from React/Vue), internal docs, component library discipline, and investment in documentation. Svelte learning curve is short per BRD assessment.
- **Risk:** Terminal UI accessibility. **Mitigation:** effects optional, high contrast, screen reader mode.
- **Risk:** Offline consistency. **Mitigation:** deterministic event replay and server reconciliation.
- **Risk:** Performance on low-end devices. **Mitigation:** code splitting, reduced effects, fallback rendering.

---

## 30. Open Questions and Decision Log

- Final packaging choice for Steam: Electron vs Tauri.
- Extent of offline support for enterprise tenants.
- Degree of client-side caching permitted under various compliance regimes.

---

## 31. Appendices

### Appendix A: Example Action Submission Flow

```
Player clicks APPROVE
-> UI validates phase
-> Action queued locally
-> Optimistic UI update
-> POST /api/v1/game/sessions/:id/emails/:emailId/decide
-> Server returns decision outcome and event sequence
-> Client replays authoritative events
```

### Appendix B: Example Theme Application

```typescript
function applyTheme(theme: ThemeState): void {
  const root = document.documentElement;
  root.dataset.theme = theme.current;
  root.dataset.scanlines = theme.effects.scanlines ? 'on' : 'off';
  root.dataset.curvature = theme.effects.curvature ? 'on' : 'off';
  root.dataset.glow = theme.effects.glow ? 'on' : 'off';
  root.dataset.noise = theme.effects.noise ? 'on' : 'off';
  root.dataset.highContrast = theme.current === 'high-contrast' ? 'on' : 'off';
  root.style.setProperty('--base-font-size', `${theme.fontSize}px`);
}
```

### Appendix C: Example Store Shape

```typescript
export interface SessionStore {
  user: User | null;
  tenant: Tenant | null;
  roles: string[];
  permissions: string[];
  authenticated: boolean;
  lastSyncAt: string | null;
}
```

---

## 32. Detailed Route Map and Navigation Rules

This section expands the routing architecture into a concrete navigation map. The intent is to keep the game surface coherent while supporting admin workflows that can be bookmarked, shared, and audited. The approach relies on SvelteKit route groups with a small set of top-level entries. Each game route must preserve session context and panel state, and each admin route must make filter state visible in the URL.

### 32.1 Game Route Map

The game surface is structured as a primary shell with internal panels. Routes exist to support deep links, accessibility, and platform integration. The shell is persistent and all route changes inside `(game)` are shallow by default.

Recommended route map:

- `/game` as the default entry point. Loads or creates the current session and redirects into the default view for the current phase.
- `/game/inbox` for the triage view. This is the canonical deep link to the email triage phase and should remain stable across releases.
- `/game/incident` for active incidents and breach response view. Used when the phase is `INCIDENT_RESPONSE` or for a forced modal overlay triggered by threat events.
- `/game/facility` for the resource management dashboard and facility visualization. Accessible during `RESOURCE_MANAGEMENT` and optionally during other phases in relaxed or practice modes.
- `/game/upgrades` for the procurement catalog. Accessible during `UPGRADE_PHASE` and optionally as read-only during other phases.
- `/game/settings` for terminal configuration, accessibility options, and account preferences.

Route rules:

- When the phase does not match the route, the route must redirect or render a phase-specific banner. Example: if the user navigates to `/game/facility` during `EMAIL_TRIAGE`, the UI should show a warning, keep the route, and provide a quick link back to inbox. This preserves user agency without violating the state machine.
- The route should never allow actions that violate the current phase. All actions must be validated against the phase stored in the session state.
- Route changes should be silent with no full-page reload unless the session changes or authentication expires.

### 32.2 Admin Route Map

The admin surface requires stable URLs for audits, reports, and saved views. It must also support tenant-level navigation when a single admin manages multiple organizations.

Recommended route map:

- `/admin/dashboard` for the primary CISO dashboard and KPI overview.
- `/admin/users` for user management. Query parameters support filtering, search, and pagination.
- `/admin/campaigns` for phishing simulation campaigns and training programs. Query parameters include status, date range, and owner.
- `/admin/reports` for compliance and export workflows. Sub-routes for each framework can be implemented with dynamic params, for example `/admin/reports/gdpr`.
- `/admin/audit` for audit logs with time range and event type filters.
- `/admin/settings` for tenant configuration, branding, SSO, and SCIM.

Admin route rules:

- Each admin route must validate permissions on the server. If a user lacks permission, the route must render a permission error rather than silently hiding data.
- Filters should be expressed in the URL query string to allow sharing and bookmarking. Example: `/admin/users?status=active&role=trainer&limit=50`.
- The admin layout should preserve navigation state when moving between pages to avoid repeated refetches of tenant metadata.

### 32.3 Auth and Public Routes

Authentication and public routes must remain minimal to reduce attack surface and cognitive load.

- `/login` provides local authentication and SSO entry points.
- `/sso` and `/sso/callback` handle the return flow from identity providers.
- `/reset` handles password recovery.
- `/legal/*` for privacy, terms, and compliance documentation.

The auth routes are always rendered without game or admin layouts to prevent confusion and to ensure they remain lightweight.

---

## 33. Detailed Client Data Contracts

This section defines the client-side data contracts that align with backend APIs and the game engine. These contracts should be treated as canonical and versioned with semantic versioning. The client may add derived fields for UI convenience but must never mutate authoritative fields.

### 33.1 Core Session Contract

The session contract is loaded at game entry and updated when the server confirms actions. Fields are aligned with the backend `game.sessions` table.

Key fields include:

- `sessionId` as UUID
- `userId` as UUID
- `tenantId` as UUID
- `seed` as integer
- `status` as enum: `active`, `paused`, `completed`, `breached`, `abandoned`
- `difficultyMode` as enum: `adaptive`, `fixed`, `relaxed`, `practice`
- `currentDay` as integer
- `currentPhase` as enum matching DD-01
- `currentFunds` as integer (Credits/CR per BRD FR-CON-002)
- `trustScore` as integer (Trust Score/TS per BRD FR-CON-002, range 0-500+, reputation gate that unlocks client tiers, contracts, and narrative content)
- `intelFragments` as integer (Intel Fragments/IF per BRD FR-CON-002, the third in-game currency earned through attack analysis and incident investigation)
- `threatTier` as enum from DD-05
- `lastPlayedAt` as ISO timestamp

### 33.2 Email Contract

Email objects are central to gameplay and must include both the display payload and the underlying indicators used for evaluation. The client should never see the ground truth of legitimacy before decision resolution. Ground truth is delivered only in decision outcomes.

Recommended fields per BRD FR-GAME-002 (emails must contain analyzable elements: sender domain, display name, email headers SPF/DKIM, body content, urgency cues, attachment types, and embedded URLs):

- `emailId` as UUID
- `subject` as string
- `senderName` as string (display name)
- `senderDomain` as string (sender domain)
- `senderAddress` as string
- `headers` as object containing inspectable SPF/DKIM results (per BRD FR-GAME-002)
- `receivedAt` as ISO timestamp
- `urgency` as enum (urgency cues)
- `faction` as enum: `sovereign_compact` (governments), `nexion_industries` (corporations), `librarians` (academics/preservationists), `hacktivist_collective`, `criminal_network` per BRD Section 5.2
- `previewText` as string
- `bodyHtml` as sanitized HTML (body content)
- `embeddedUrls` as array of URL descriptors (embedded URLs per BRD FR-GAME-002)
- `attachments` as array of attachment descriptors (attachment types)
- `verificationRequired` as boolean
- `status` as enum: `unopened`, `opened`, `decided`, `deferred`
- `difficultyLevel` as integer (1-5 per BRD FR-GAME-003)
- `phishingCategory` as optional enum: `spear_phishing`, `bec`, `credential_harvesting`, `malware_delivery`, `pretexting` (per BRD FR-GAME-003, revealed only in decision outcomes)

### 33.3 Verification Packet Contract

Verification packets are loaded on demand. They may include multiple document types, each with metadata to support inspection. The packet is rendered in the document viewer with cross-reference tools.

Fields:

- `packetId` as UUID
- `emailId` as UUID
- `documents` as array of document descriptors
- `riskHints` as array of strings
- `documentMap` as structured metadata for cross-linking

### 33.4 Indicator Contract

Indicators are submitted by players when evaluating emails. They are stored with location and notes to support coaching and analytics.

Fields:

- `type` as enum of indicator types
- `location` as string
- `description` as optional string
- `severity` as enum or numeric ranking

### 33.5 Decision Outcome Contract

Decision outcomes are returned by the backend to provide feedback and update game state.

Fields:

- `decision` as enum: `approve`, `deny`, `flag`, `request_verification`
- `correct` as boolean
- `feedbackType` as enum: `correct`, `false_positive`, `missed_phishing`, `wrong_indicators`
- `trustScoreChange` as integer
- `fundsChange` as integer
- `educationalNotes` as array of strings
- `indicatorResults` as array of indicator results with explanations

### 33.6 Threat and Incident Contracts

Threat tier and incident payloads must map directly to DD-05. The UI uses these fields to render threat indicators, incident logs, and breach warnings.

Threat fields:

- `currentTier` as enum: `LOW`, `GUARDED`, `ELEVATED`, `HIGH`, `SEVERE` (five tiers per BRD FR-GAME-019)
- `threatScore` as number
- `pacingPhase` as enum
- `breathingRoomRemaining` as integer

Incident fields:

- `incidentId` as UUID
- `classification` as enum
- `severity` as integer
- `status` as enum
- `evidence` as array
- `responseActions` as array

### 33.7 Player Progression Contract

Player progression fields align with BRD Section 11.4:

- `playerLevel` as integer (1-30, Intern to CISO, with XP earned through security-correct actions)
- `prestigeLevel` as integer (31-50 with cosmetic rewards, optional after reaching level 30)
- `currentXP` as integer
- `xpToNextLevel` as integer
- `levelTitle` as string (current rank title)

### 33.8 Upgrade and Facility Contracts

Facility and upgrade data are used for resource management and purchasing decisions.

Facility fields:

- `facilityTier` as enum: `Outpost`, `Station`, `Vault`, `Fortress`, `Citadel` (per BRD FR-GAME-014)
- `rackSpaceUsed` as integer (measured in U) and `rackSpaceTotal` as integer -- per BRD FR-GAME-008 four interconnected resource systems
- `bandwidthUsage` as number (Mbps)
- `powerUsage` as number (kW)
- `coolingStatus` as number (tons)
- `staffAvailability` as integer

Upgrade fields:

- `upgradeId` as string
- `name` as string
- `description` as string
- `purchaseCost` as integer
- `maintenanceCost` as integer
- `effects` as array
- `purchased` as boolean

---

## 34. Panel-Level UI Specification

This section provides deeper detail on the UI panels and their interactions. It is an implementation guide for the terminal layout described in DD-07 and the phase mapping described in DD-01.

### 34.1 Inbox Panel

Responsibilities:

- Display the email queue with urgency and faction indicators.
- Allow selection and quick filtering without leaving the triage phase.
- Highlight aged or deferred emails to reinforce queue pressure.

Behavior:

- The inbox list is virtualized for performance when queues are large.
- Selection changes update the email viewer without route changes.
- The list shows a local status badge for each email: opened, decided, deferred.

Accessibility:

- Each list item is a button with ARIA role `option` within a listbox.
- Keyboard navigation supports up and down arrows and quick jump by typing the first letter.

### 34.2 Email Viewer Panel

Responsibilities:

- Render email body content, metadata, and attachments.
- Provide indicator marking and inspection tools.

Behavior:

- Email body is sanitized HTML and rendered inside a safe container.
- Hovering or focusing on suspicious elements can reveal metadata such as URL targets.
- Attachments are opened in the document viewer, not inline.

Accessibility:

- Links and attachments are reachable by keyboard.
- A text-only mode strips decorative formatting for screen reader use.

### 34.3 Verification Panel

Responsibilities:

- Display verification packets and supporting documents.
- Allow cross-referencing and flagging anomalies.

Behavior:

- Documents render in a scrollable viewer with zoom and rotation options.
- A comparison mode allows side-by-side views for two documents.

### 34.4 Action Bar

Responsibilities:

- Provide approve, deny, flag for review, and request additional verification actions (BRD FR-GAME-005).
- Display action confirmation and prevent double submission.
- Implement Papers, Please-inspired stamp-based approval/denial UX with physical desk metaphor, conveying moral weight of bureaucratic decisions (BRD Section 11.5).

Behavior:

- Buttons reflect current phase and are disabled when action is invalid.
- Confirmation modals appear for high-risk decisions or when no indicators were marked.
- Every decision produces immediate feedback (revenue/cost), short-term consequences (threat level shift), and delayed consequences (echoes 1-3 chapters later per BRD FR-GAME-006). No decision has a single "correct" answer; all options carry trade-offs mirroring real-world security risk acceptance (BRD FR-GAME-007).

### 34.5 Status Panel

Responsibilities:

- Display threat tier (LOW, GUARDED, ELEVATED, HIGH, SEVERE per BRD FR-GAME-019), trust score, funds, intel fragments, and facility status at a glance.
- Provide micro alerts for threat escalations or incidents.
- Communicate adaptive threat engine behavior: attack vectors shift based on player behavior (e.g., good phishing detection triggers supply-chain attacks; strong perimeter triggers insider manipulation per BRD FR-GAME-020). Difficulty changes are expressed through narrative escalation, not a difficulty slider (BRD FR-GAME-021).

Behavior:

- Threat tier uses color, label, and shield icon per DD-07.
- Status panel updates are animated only when allowed by motion settings.

### 34.6 Terminal Panel

Responsibilities:

- Display system messages, coaching tips, and narrative notes.
- Act as a log for player actions and results.

Behavior:

- Terminal output is append-only and can be scrolled.
- The most recent messages are announced to screen readers.

### 34.7 Incident Panel

Responsibilities:

- Present incident details, evidence, and response options.
- Allow containment and recovery actions with resource costs.
- Display breach/ransom mechanics per BRD: a successful breach triggers a full-screen ransom note locking all operations (FR-GAME-015). Ransom cost equals total lifetime earnings divided by 10, rounded up, minimum 1 CR (FR-GAME-016). If the player can pay, operations resume with Trust Score penalty and 10-40% client attrition; if they cannot pay, the game ends (FR-GAME-017). Breach recovery time scales with security tooling and staff (1-7 days, FR-GAME-018).

Behavior:

- Evidence items are grouped by relevance and displayed with filters.
- Response actions show estimated time and cost impact.
- Ransom note is rendered as a full-screen overlay blocking all other interactions per BRD FR-GAME-015.

### 34.8 Facility Dashboard

Responsibilities:

- Visualize resource usage and capacity constraints.
- Allow allocation and throttling decisions.

Behavior:

- Charts are rendered with D3 and updated via derived state.
- PixiJS visualization is optional and may be disabled in low-power mode.

### 34.9 Upgrade Catalog

Responsibilities:

- Display available infrastructure upgrades (racks, cooling, power, bandwidth) and security tools per BRD FR-GAME-011: firewall, IDS, IPS, SIEM, EDR, WAF, threat intel feed, SOAR, honeypots, zero-trust gateway, and AI anomaly detection.
- Show recurring operational costs for security tools, modeling real-world security OpEx (BRD FR-GAME-012).
- Communicate that every upgrade introduces new threat vectors, mirroring real-world vulnerability surfaces (BRD FR-GAME-013).
- Display facility progression through tiers: Outpost, Station, Vault, Fortress, Citadel (BRD FR-GAME-014).
- Enable purchase or maintenance actions.

Behavior:

- Upgrades are grouped by category and show effect summaries.
- Disabled upgrades include tooltips explaining requirements.
- New threat vector warnings are displayed when purchasing upgrades to reinforce security education.

### 34.10 Day Summary Panel

Responsibilities:

- Provide a concise summary of the day with funds, trust, and incident outcomes.
- Present narrative updates and prompts for next day.

Behavior:

- Summary is always visible before day advancement.
- The advance button is disabled until summary is acknowledged.

---

## 35. Admin View Specification

This section expands the admin surface to align with enterprise requirements and the backend API design.

### 35.1 CISO Dashboard

Responsibilities:

- Present organizational risk posture with risk scoring, compliance posture, and board-ready visualizations (BRD FR-AN-009).
- Display organizational risk heat map by department, location, and role (BRD FR-AN-010).
- Provide trend analysis with predictive risk indicators (BRD FR-AN-011).
- Support industry benchmarking against anonymized peer data (BRD FR-AN-012).
- Present training completion and phishing metrics.
- Highlight top risk departments and trend lines.

Data sources:

- GraphQL `cisoDashboard` query provides aggregated metrics.
- Trend charts are rendered with D3 and include comparisons to historical baselines.

### 35.2 Training Dashboard

Responsibilities:

- Present training completion rates, module performance, and improvement over time.
- Provide drill-down into department or team cohorts.
- Display phishing simulation click rate and reporting rate tracking over time (BRD FR-AN-001).
- Show knowledge retention measurement via spaced repetition assessments (BRD FR-AN-002).
- Present behavioral change metrics: time-to-report suspicious emails, password hygiene scores, data handling compliance (BRD FR-AN-003).
- Map competency across domains: phishing detection, password security, data handling, social engineering resistance, incident response, physical security, compliance awareness (BRD FR-AN-004).

UI features:

- Time range selector with predefined presets and custom ranges.
- Export button to generate CSV or PDF reports.

### 35.2a ROI Measurement Dashboard

Responsibilities:

- Cost-of-breach avoidance calculator based on organizational risk reduction (BRD FR-AN-005).
- Phishing susceptibility reduction tracking from baseline to current (BRD FR-AN-006).
- Training cost per employee comparison against industry benchmarks (BRD FR-AN-007).
- Cyber-insurance premium impact tracking (BRD FR-AN-008).

UI features:

- Interactive ROI calculator with configurable organizational parameters.
- Visualization of risk reduction trends over time.
- Exportable ROI reports for executive stakeholders.

### 35.3 Campaign Management

Responsibilities:

- Create and schedule multi-channel phishing simulation campaigns across email, SMS, voice, and QR code channels (per BRD FR-ENT-021).
- Monitor campaign progress and results.
- Support AI-generated simulation emails using real-time threat intelligence (FR-ENT-022) and custom simulation templates with visual editor and merge-tag support (FR-ENT-023).

UI features:

- Campaign list with status, owner, channel, start and end dates.
- Detail view with participant lists and click/report rates.
- Action buttons to start, pause, or end a campaign.
- "Teachable moment" landing page configuration for display immediately after simulation failure (FR-ENT-024).
- Dedicated sending infrastructure status with per-customer IP isolation visibility for enterprise tier (BRD FR-ENT-025).
- SPF, DKIM (2048-bit RSA minimum), and DMARC alignment status display (BRD FR-ENT-026).
- Email gateway allowlisting documentation and automation configuration for Proofpoint, Mimecast, and Microsoft Defender (BRD FR-ENT-027).
- Enrollment rules based on department, role, hire date, and risk score (FR-ENT-016).
- Escalation workflow configuration: reminder, manager notification, compliance alert (FR-ENT-017).
- Configurable training frequencies per regulatory framework: onboarding, quarterly, annual, event-driven (FR-ENT-018).
- Just-in-time training delivery configuration within 60 seconds of triggering event such as phishing click, policy violation, or DLP alert (BRD FR-ENT-019), with JIT training throttling at maximum 2 interventions per week per learner (BRD FR-ENT-020).
- Adaptive learning engine configuration: administrators can set minimum competency thresholds across seven domains triggering mandatory remediation (BRD Section 11.6).

### 35.4 User Management

Responsibilities:

- Provision, suspend, or edit user accounts.
- Assign roles and scopes.

UI features:

- Table with filters for status, role, and department.
- Bulk actions for suspend or role assignment.
- Side panel for per-user audit trail.

### 35.5 Compliance Reporting

Responsibilities:

- Map training outcomes to regulatory frameworks (GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, FedRAMP per BRD FR-AN-013).
- Generate audit-ready evidence with one-click export in PDF, CSV, and JSON formats (BRD FR-ENT-029).
- Support certificate generation with digital signature, regulatory framework reference, and expiration date (BRD FR-ENT-033).

UI features:

- Framework selector with real-time compliance status indicators (BRD FR-ENT-028).
- Automated compliance gap identification view (BRD FR-AN-014).
- Report builder for custom time ranges.
- Download links with expiration and tenant scoping.
- Management training attestation reports for NIS2 Article 20 and DORA Article 5 (BRD FR-ENT-034).

### 35.6 Audit Log

Responsibilities:

- Display security and administrative actions across the tenant.
- Provide immutable, append-only audit evidence with SHA-256 cryptographic integrity verification for compliance (BRD FR-ENT-030).

UI features:

- Filter by event type, actor, and time range.
- Configurable retention policies per regulatory framework (1-7 years per BRD FR-ENT-031).
- Export for external review.
- Individual training transcripts with complete audit trail (BRD FR-ENT-032).

### 35.7 Content Management and Localization Admin

Responsibilities:

- Content versioning with full audit trail of changes and reviews (BRD FR-ENT-042).
- Annual program review workflow with sign-off for PCI-DSS 12.6.2 compliance (BRD FR-ENT-043).
- Professional translation management workflow for 24 EU languages (BRD FR-ENT-044).
- Cultural adaptation of phishing simulations per locale, including local email conventions, brands, and threats (BRD FR-ENT-045).
- RTL language support configuration for Arabic, Hebrew, and Farsi (BRD FR-ENT-046).

UI features:

- Content version history with diff viewer and review status.
- Annual review scheduler with sign-off tracking and compliance calendar.
- Translation workflow dashboard showing progress per language.
- Cultural adaptation preview for phishing simulation templates per locale.

### 35.8 Integration Configuration (SIEM/SOAR/HRIS)

Responsibilities:

- Provide admin UI for configuring SIEM integrations (Splunk, IBM QRadar, Microsoft Sentinel, Elastic Security per BRD Section 10.1) including event filtering, endpoint configuration, and connection health monitoring.
- Provide admin UI for configuring SOAR integrations (Palo Alto Cortex XSOAR, Swimlane per BRD Section 10.1) including playbook triggers and bidirectional API settings.
- Provide admin UI for HRIS/HCM integration settings (Workday, BambooHR, SAP SuccessFactors, ADP per BRD Section 10.5) for organizational structure synchronization and event-driven training triggers.
- Provide admin UI for communication platform integrations (Microsoft Teams, Slack per BRD Section 10.4).

UI features:

- Integration catalog with connection status indicators.
- Per-integration configuration forms with credential management.
- Event filtering controls to limit which events are sent to external systems.
- Connection health monitoring and test buttons.
- Webhook configuration with HMAC signature verification settings.

---

## 36. Theming Implementation Details

This section expands the theming system to ensure correctness and flexibility across surfaces.

### 36.1 Token Definitions

Tokens are defined in `src/lib/ui/tokens` and applied globally via CSS custom properties. Game and admin themes override the same tokens for shared components.

Key token groups:

- Background layers (`--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`)
- Text colors (`--color-text-primary`, `--color-text-secondary`)
- Semantic colors (`--color-safe`, `--color-warning`, `--color-danger`, `--color-critical`)
- Border and divider colors (`--color-border`, `--color-divider`)
- Spacing and sizing tokens (`--space-1` through `--space-8`)
- Typography tokens (`--font-terminal`, `--font-document`, `--font-admin`)

### 36.2 Theme Switching

Theme switching is client-driven but synced with server preferences. The process is:

1. Load server preferences on login.
2. Apply theme by setting root data attributes.
3. Persist local overrides when allowed.
4. Re-sync with server when preferences change.

### 36.3 White Labeling

Enterprise tenants can override tokens for branding. The admin UI supports per-tenant logos, accent colors, fonts, custom domains, and email templates. White-label branding changes must propagate within 60 seconds as specified in BRD FR-ENT-005. The game UI supports optional branding in the status bar and boot screen, but core terminal aesthetic remains unchanged to preserve narrative consistency.

---

## 37. Accessibility Scenarios and Controls

Accessibility requirements are embedded into UI design and code. This section expands the scenarios and their implementation.

### 37.1 Screen Reader Optimized Mode

- Simplified layout with linear reading order.
- Automatic announcements for new emails, incident alerts, and phase transitions.
- Shortcut keys for critical actions such as approve and deny.

### 37.2 One-Switch Mode

- Sequential focus scanning across all interactive elements.
- Single action key triggers the focused element.
- Visual and audio cues indicate current focus.

### 37.3 Reduced Motion and Effects

- All animations are disabled when motion is set to none.
- CRT flicker is removed entirely in reduced motion mode.
- Transitions are reduced to minimal opacity changes.

### 37.4 Color Blind Modes

- Alternative color palettes replace red-green contrasts.
- Every color-coded element includes text labels and icons.

### 37.5 Cognitive Load Reduction

- Optional hinting and coaching messages can be enabled or disabled.
- The game can switch to Relaxed mode with slower queue pressure.

---

## 38. Performance Budgets and Profiling Plan

Performance budgets ensure a consistent experience across devices.

### 38.1 Performance Targets

**BRD-mandated targets (non-negotiable):**

- Initial page load time: < 3 seconds on a 4G connection.
- Game state update latency: < 100ms (P95).
- API response time: < 200ms (P95).
- Admin dashboard load time: < 2 seconds (P95).
- Email generation (AI): < 10 seconds (pre-generated pool eliminates player-perceived latency).
- WebSocket message delivery: < 50ms (P95).
- SCIM sync latency: < 60 seconds.

**Scalability targets (from BRD Section 7.2):**

The frontend must support the following concurrent user targets without degrading performance:

- Launch: 10,000 concurrent users (modular monolith, single-region).
- Growth: 50,000 concurrent users (modular monolith with extracted services).
- Scale: 100,000+ concurrent users (microservices with multi-region deployment).

**Frontend-specific refinements:**

- First Contentful Paint under 1.8s on desktop and 2.5s on mobile.
- Largest Contentful Paint under 2.5s on desktop and 3.5s on mobile.
- Total Blocking Time under 200ms on desktop and 350ms on mobile.
- Bundle size under 250kb for initial game shell, excluding lazy-loaded assets.

### 38.2 Profiling Strategy

- Use Lighthouse and WebPageTest for baseline audits.
- Use SvelteKit performance instrumentation in development builds.
- Monitor runtime performance with browser performance APIs and custom telemetry.

### 38.3 Optimization Techniques

- Dynamic imports for PixiJS and D3.
- Virtualization for list-heavy components.
- Cache critical assets in the service worker.
- Use CSS containment to limit layout recalculation.

---

## 39. Offline Sync and Conflict Resolution

Offline play relies on deterministic event replay with conflict resolution controlled by the server.

### 39.1 Event Queue Design

- Each action is stored with a local sequence and timestamp.
- The queue is flushed in order once connectivity returns.
- Server responses include authoritative sequence numbers.

### 39.2 Conflict Resolution

- If the server rejects an action, the client discards it and replays from the last snapshot.
- If sequence mismatch occurs, the client requests a fresh snapshot and replays queued actions.

### 39.3 Snapshot Strategy

- The client stores a snapshot every 50 events or at day boundaries, matching the backend snapshot materialization cadence defined in the BRD. Snapshots are also stored after major incidents.
- Snapshots include the last server sequence ID to ensure replay accuracy.

---

## 40. Frontend Implementation Roadmap

41. Detailed Data Flow Walkthrough
42. Security Threat Model and Content Safety
43. UX Feedback and Microinteractions
44. Settings and Configuration Model
45. API Interaction Examples and Error Handling
46. Localization Pipeline and Content Governance

The frontend roadmap aligns with the BRD phases.

### Phase 1: MVP (Months 1-6)

- Establish SvelteKit project with game shell layout.
- Implement core triage UI and decision pipeline.
- Build basic facility dashboard and upgrade catalog.
- Integrate with backend game engine and content APIs.
- Implement terminal aesthetic and basic accessibility settings.
- Deliver PWA demo with offline support for three chapters.

### Phase 2: Enterprise Features (Months 4-9)

- Build admin dashboard and analytics views.
- Implement user management, RBAC UI, and audit logs.
- Add SSO settings and SCIM configuration UI.
- Implement compliance reports and export workflows.
- Expand telemetry and analytics instrumentation.

### Phase 3: Consumer Launch (Months 6-12)

- Expand accessibility modes and mobile-responsive layouts.
- Add social features such as leaderboards, achievements, and friend system (BRD FR-CON-008 through FR-CON-011).
- Implement Season Pass UI with free and premium reward tracks (BRD FR-CON-004).
- Implement cosmetic-only premium purchase UI for facility skins, terminal themes, and profile insignia (BRD FR-CON-003).
- Enhance offline sync and cross-platform save support.
- Implement streaming/content creation integration support for Twitch and YouTube (BRD FR-CON-011).
- Build "Archive Pass" subscription management UI ($4.99/month premium tier per BRD Section 12.2) and exportable cybersecurity competency certificate purchase flow ($9.99-$29.99 per BRD Section 12.2).
- Implement ethical monetization per BRD Section 12.3: no pay-to-win, no loot boxes, no gacha, no artificial energy systems. All purchases clearly described with no hidden costs or confusing currency conversions.

### Phase 4: Scale and Expand (Months 12-18)

- Deliver localization for 24 official EU languages plus RTL locales required by BRD (Arabic, Hebrew, Farsi), including full QA.
- Build UGC tools: scenario editor for community-created threat packs (BRD FR-CON-012), Steam Workshop integration for content distribution (BRD FR-CON-013), and community marketplace for curated user content (BRD FR-CON-014).
- Prepare multiplayer UI scaffolding for cooperative play (2-6 players, BRD FR-MP-001) and competitive Red Team / Blue Team modes (BRD FR-MP-005 through FR-MP-010).

---

## 41. Detailed Data Flow Walkthrough

This section provides a concrete walkthrough of data flow across the core game loop, demonstrating how SvelteKit data loading, client state, and backend events interact. The goal is to ensure the frontend architecture remains consistent with the deterministic state machine and the event-sourced backend.

### 41.1 Session Start

1. User navigates to `/game`.
2. `+layout.server.ts` verifies authentication and tenant context.
3. The layout loads the current session via `/api/v1/game/sessions/:id` or creates a new session if no active session exists.
4. The session snapshot is serialized and sent to the client.
5. The game store initializes its local state from the snapshot and sets the current phase.

The result is a fully hydrated game shell with accurate phase and baseline state before any client action occurs.

### 41.2 Inbox Intake

1. When the phase is `INBOX_INTAKE`, the client displays a loading state.
2. The backend generates the inbox queue and returns it as part of the phase transition or in a dedicated inbox endpoint.
3. The inbox list is stored in a local store and rendered in the inbox panel.
4. The email viewer remains empty until a user selects an email.

The inbox list is treated as read-only until a decision action is submitted. The client does not attempt to determine legitimacy or correctness.

### 41.3 Email Triage

1. The user selects an email.
2. The UI marks the email as opened locally for UX feedback.
3. The client emits a `game.email.opened` telemetry event with timing and UI context.
4. Indicators are marked by the user and stored locally as part of the decision draft.
5. The user submits a decision using the action bar.

At this stage, the client has not modified the authoritative state. It has only collected user input and prepared an action payload.

### 41.4 Decision Submission

1. The action is validated against current phase and local constraints.
2. The action is added to the local event queue.
3. The UI enters a pending state to prevent duplicate submissions.
4. The action is sent to `/api/v1/game/sessions/:id/emails/:emailId/decide`.
5. The server responds with decision outcome, feedback, and updated funds and trust deltas.

The client then applies the authoritative response and clears the pending flag. If the response arrives out of order or conflicts with local state, the client replays from the last snapshot.

### 41.5 Consequence and Threat Processing

Consequences are delivered as part of the decision response or during the phase transition. Threat processing may occur in the backend as a separate step during day advancement. The frontend must treat these changes as authoritative.

1. The backend emits `game.consequences.applied` and `game.threats.generated` events.
2. The client receives updated threat tier, incident list, and narrative messages.
3. The status panel updates with threat tier changes and corresponding UI signals.

### 41.6 Incident Response

Incident data is presented in the incident panel and includes evidence, suggested response actions, and deadlines.

1. The user selects containment and recovery actions.
2. The client sends the response action to `/api/v1/game/sessions/:id/actions` as a typed game action.
3. The backend returns incident resolution updates and any remaining issues.

### 41.7 Day End and Snapshot

At day end, the client displays the summary panel and awaits explicit advancement by the user. When the user advances, the backend produces a new snapshot and the client stores it locally.

This flow ensures deterministic replay and supports offline or interrupted sessions without violating the state machine.

---

## 42. Security Threat Model and Content Safety

The frontend must be hardened against common attack vectors, especially because the game renders untrusted content that mimics phishing emails. This section details the threat model and the mitigation strategy.

### 42.1 Content Rendering Risks

Email bodies and verification documents can contain arbitrary text, links, and file attachments. Even though this content is fictional, it is generated by systems that could accidentally include unsafe HTML.

Mitigations:

- All HTML content must be sanitized using a vetted sanitizer before rendering.
- Scripts, inline event handlers, and external iframes must be stripped.
- Links are rendered with `rel="noopener noreferrer"` and `target="_blank"` when appropriate, but the default behavior in the game UI is to show link previews without navigating.
- Attachments are rendered in a sandboxed viewer that does not allow script execution.

### 42.2 CSP and Trusted Types

Content Security Policy is enforced at the root layout.

- Disallow `unsafe-inline` for scripts.
- Restrict `connect-src` to API and WebSocket endpoints.
- Restrict `img-src` to trusted asset domains and data URLs for inline icons.
- Enable Trusted Types to guard against DOM injection in runtime code.

### 42.3 Session and Token Security

- Tokens are never stored in local storage.
- Session cookies are HttpOnly and Secure.
- The frontend handles session expiration by redirecting to login and preserving the intended route for post-login return.

### 42.4 Clickjacking and Embedding

- The game should not be embeddable in iframes by default. The admin UI should also prevent framing unless explicitly allowed for LMS integrations (required for LTI 1.3 launches and SCORM package embedding per BRD).
- Frame ancestors are restricted via CSP, with allowlisted origins for configured LMS platforms.

### 42.5 File Handling

- Attachment previews are generated on the server and delivered as safe images or sanitized text.
- File downloads are initiated only with explicit user action and include warning dialogs in the game UI.

### 42.6 Phishing Simulation Safety

The game trains phishing detection, which implies intentional presentation of risky content. The frontend must ensure that training content cannot be abused to phish the user outside the game.

- Links are not clickable by default. Instead, clicking a link opens a game-specific inspection modal.
- Email addresses are not directly copyable without explicit user action.
- A global banner reminds players that all content is fictional and belongs within the game environment.

---

## 43. UX Feedback and Microinteractions

Microinteractions are essential for creating the "terminal operator" feel while reinforcing learning outcomes. They must remain subtle and accessible.

### 43.1 Action Feedback

- Approve and deny actions trigger stamp animations and subtle sound cues.
- If sound is disabled, visual cues must still convey the action.
- Incorrect decisions prompt educational notes that appear in the terminal panel or as inline callouts.

### 43.2 Threat Feedback

- Threat tier changes trigger a brief animation in the status panel.
- High-threat transitions may trigger screen flicker if effects are enabled.
- Threat changes are always accompanied by text labels to avoid reliance on color alone.

### 43.3 Queue Pressure Feedback

- Deferred emails show subtle aging indicators.
- The inbox list includes a small counter for overdue items.
- Warnings appear when deferrals approach penalty thresholds.

### 43.4 Incident Feedback

- Incident creation triggers an alert toast and a terminal message.
- Incident resolution triggers a short summary message and a trust score update.

### 43.5 Progress Feedback

- End-of-day summaries include a visual breakdown of gains and losses.
- Longer-term progress is communicated through narrative messages and facility upgrades rather than explicit scores.

---

## 44. Settings and Configuration Model

45. API Interaction Examples and Error Handling
46. Localization Pipeline and Content Governance

The frontend exposes a comprehensive settings system to support accessibility, personalization, and enterprise policy controls.

### 44.1 Settings Categories

- Display settings for CRT effects, theme, font size, and contrast.
- Accessibility settings for motion, screen reader mode, and one-switch mode.
- Gameplay settings for hints, difficulty mode, and queue pressure (where allowed).
- Audio settings for UI sounds, ambient sound, and alerts.
- Account settings for language, notifications, and privacy preferences.

### 44.2 Persistence Strategy

- Consumer settings are stored locally and synced to the server when online.
- Enterprise settings are stored server-side and enforced as policy, with local overrides disabled when policy conflicts.

### 44.3 Policy Controls

- Tenants can disable offline mode.
- Tenants can enforce high-contrast or reduced-motion defaults.
- Tenants can disable cosmetic effects for compliance or accessibility requirements.

### 44.4 Settings UI Behavior

- Settings changes apply immediately with live preview.
- A reset-to-default action is available for each category.
- Settings changes are reversible and logged for enterprise auditing when required.

---

## 45. API Interaction Examples and Error Handling

The frontend architecture relies on predictable, typed API interactions. This section provides concrete examples and error handling rules to reduce ambiguity during implementation.

### 45.1 Game Action Submission Example

A typical action submission includes a decision payload, a list of indicators, and metadata about time spent. The client uses a dedicated API client that enforces request schema.

Steps:

1. Build the action payload from the current email context and user input.
2. Validate required fields locally to prevent empty submissions.
3. POST to the decision endpoint.
4. Normalize response and apply results to local state.

The action is never assumed to be correct until the server responds. The UI must handle temporary pending states gracefully and avoid showing correctness before the server response.

### 45.2 Error Categories

Errors are mapped to user-facing messages based on category.

- **Authentication errors:** Redirect to login with a session-expired message.
- **Authorization errors:** Show a permission error panel and hide restricted controls.
- **Validation errors:** Display inline errors and keep the user in the current context.
- **Rate limiting:** Show a cooldown message and backoff retry.
- **Server errors:** Display a generic error toast and allow retry.

### 45.3 Retry Strategy

The API client implements a retry strategy for transient errors.

- Retry only on network errors and 503 responses.
- Use exponential backoff with a capped maximum.
- Never retry idempotent-sensitive actions unless the server confirms safe replay.

### 45.4 Response Validation

Every response is validated against a Zod schema. If validation fails, the client logs a telemetry error and displays a fallback error message. This protects against backend regressions and malformed payloads.

### 45.5 Admin API Interaction

Admin views use REST for CRUD and GraphQL for analytics. The GraphQL client uses query caching with manual invalidation when filters change or after actions that mutate data. All mutations return a standard envelope that includes a request ID for audit correlation.

### 45.6 File Export Workflow

Exports are asynchronous.

1. Admin requests an export.
2. Backend returns a job ID.
3. Client polls the job status endpoint until ready.
4. Client downloads the file via a time-limited URL.

The UI must handle long-running exports gracefully and provide clear feedback about progress.

---

## 46. Localization Pipeline and Content Governance

Localization is a core requirement for enterprise adoption and consumer scale. The frontend architecture must support fast translation turnaround without introducing inconsistencies in narrative tone or technical accuracy.

Localization scope is defined by the BRD: full coverage of the 24 official EU languages plus explicit RTL support for Arabic, Hebrew, and Farsi, including full UI QA and compliance validation.

### 46.1 Localization Workflow

- All UI strings are stored in locale files under `src/lib/i18n`.
- Strings use ICU message syntax to support plurals and formatting.
- Content authors provide canonical English strings that are then translated by professional translators.

### 46.2 Language Selection

- User-level language selection overrides tenant defaults.
- Tenant defaults are set in admin settings and applied to new users.
- The app respects browser language during first-time onboarding when no preference exists.

### 46.3 Dynamic Content Translation

Some content is generated dynamically by the AI pipeline. This content must be tagged with language metadata before it reaches the client. The client should never attempt to translate AI-generated text on the fly, to avoid inaccuracies. Instead, the backend should provide localized content when possible, and the client should display fallback warnings when localized content is unavailable.

### 46.4 Narrative Tone Governance

To preserve the game tone, translations must be vetted for tone and accuracy. The frontend provides a content review mode for translators and reviewers that displays strings in context, including their UI placement and typical surrounding text.

### 46.5 Right-to-Left Support

RTL languages (Arabic, Hebrew, Farsi) are explicitly supported per the BRD. The UI must render in RTL with full layout mirroring, bidirectional text handling, and QA coverage. Layout components should use logical properties (margin-inline, padding-inline) and avoid hard-coded left-right assumptions, and icons, charts, and terminal layouts must be reviewed for directionality.

### 46.6 Date, Time, and Number Formats

All formatting uses locale-aware functions. The game time system remains canonical but is displayed using local formats where appropriate. This includes timezone-aware timestamps for audit logs and compliance reporting.

---

## 47. Telemetry and Learning Outcome Mapping

The frontend plays a critical role in measuring learning outcomes without breaking immersion. This section defines the telemetry strategy and how it maps to the educational goals described in the BRD.

### 47.1 Telemetry Principles

- Telemetry is event-based and aligns with backend event names.
- Data is collected only for gameplay actions and system performance, not for unrelated browsing.
- Telemetry must be transparent in enterprise mode, with clear documentation and opt-out controls where legally required.

### 47.2 Core Event Taxonomy

Events are grouped into four categories.

1. **Gameplay actions** such as `game.email.opened`, `game.email.decision_submitted`, and `game.incident.resolved`.
2. **System actions** such as `game.session.paused` and `game.day.ended`.
3. **UI interactions** such as indicator marking or hint usage that can inform learning outcomes.
4. **Performance events** such as load times, error rates, and client-side crashes.

Each event includes:

- `eventId` as UUID
- `timestamp` in ISO format
- `sessionId`, `tenantId`, and `userId`
- `eventType` as string
- `payload` with event-specific data

### 47.3 Learning Outcome Mapping

The telemetry system maps player actions to specific security competencies.

Examples:

- **Phishing detection:** indicator marking accuracy, time spent per email, decision correctness.
- **Identity verification:** use of verification packets and accuracy in resolving identity anomalies.
- **Incident response:** response time, selected actions, and outcome quality.
- **Risk management:** acceptance of high-risk clients and corresponding trust impact.

These mappings align with the skill domains and NIST CSF categories defined in the BRD and DD-01.

### 47.4 Hint and Coaching Telemetry

Hints and coaching are optional and must be tracked to avoid contaminating learning outcome data.

- When hints are used, the event is recorded with the hint type and timing.
- Coaching messages are logged with trigger reason, allowing analysis of common failure patterns.
- Reports should differentiate between unassisted and assisted performance.

### 47.5 Privacy and Compliance

Telemetry must respect privacy regulations.

- PII is minimized in telemetry payloads.
- Enterprise tenants can configure retention periods.
- All telemetry events include a request ID for audit tracing.

### 47.6 Client-Side Batching

To reduce network overhead, telemetry events are batched and sent on a short interval or when the queue reaches a threshold. Batching respects offline mode by storing events locally and syncing later.

### 47.7 Analytics Integration

For enterprise dashboards, telemetry data flows into analytics pipelines that drive compliance reports, risk heat maps, and training effectiveness metrics. The frontend ensures that event metadata is consistent and well-formed to support these downstream workflows.

---

## 48. Frontend Glossary

This glossary defines frontend-specific terms used in this document to avoid ambiguity.

- **Application shell:** The persistent layout and panel structure that remains mounted while internal views change. In the game UI, the shell includes the inbox, viewer, status, and terminal panels.
- **Phase:** The current step in the game state machine. Phases determine which actions are allowed and which panels are active.
- **Event log:** The ordered sequence of game events used to reconstruct state and support deterministic replay.
- **Snapshot:** A serialized summary of game state at a point in time, typically stored at day end to accelerate replay.
- **Route group:** A SvelteKit grouping mechanism that allows distinct layouts and guards for game, admin, and auth surfaces.
- **Optimistic update:** A local UI change applied before server confirmation, used to keep the UI responsive. These updates are reconciled when authoritative responses arrive.
- **Tenant context:** The organization-specific scope that determines branding, permissions, and data boundaries in enterprise deployments.
- **CRT effects:** Optional visual overlays that emulate a retro terminal display. These effects are layered on top of the base UI and can be disabled.
- **Service worker:** A browser script that enables offline caching and background sync for the PWA.

---

**End of Document**
