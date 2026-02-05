# The DMZ: Archive Gate - Development Milestone Roadmap

> Synthesized from 7 specialist architecture reviews covering: Core Gameplay, Content & Narrative, Frontend & UX, Backend & Data, Enterprise & Infrastructure, Analytics & Learning, and Social & Monetization systems.

---

## Guiding Principles

These principles emerged as consensus across all 7 architecture reviews:

1. **Event sourcing is canonical from day one** -- the game engine and event store are inseparable. Build them together.
2. **tenant_id on every table from day one** -- even before multi-tenancy is enforced, schema must support it. Retrofitting is catastrophically expensive.
3. **Accessibility is structural, not cosmetic** -- WCAG 2.1 AA is a legal requirement at launch (BRD Section 9.6). Bake into every component.
4. **Privacy by design** -- pseudonymization and data minimization ship with the first event, not bolted on later.
5. **Modular monolith first** -- no premature microservice extraction. Clear module boundaries with future extraction paths.
6. **TimescaleDB over ClickHouse** -- same PostgreSQL stack, same ORM, same tooling. Defer ClickHouse until proven insufficient.
7. **Consumer game validates, enterprise game monetizes** -- the game must be fun before it can be sold.

---

## Phase Overview

| # | Milestone | Duration | Focus | Gate |
|---|-----------|----------|-------|------|
| M0 | Project Bootstrap | 2 weeks | Tooling, CI/CD, project structure | Dev environment operational |
| M1 | Foundation | 3-4 weeks | Skeleton app, design system, DB schema, auth | Running app with auth + design tokens |
| M2 | Core Game Loop | 5-6 weeks | Playable email triage, state machine, facility | One full day cycle completable |
| M3 | Content Pipeline | 3-4 weeks | Handcrafted content, AI pipeline v1, Season 1 Act I | 50+ emails + AI generation working |
| M4 | Terminal Experience | 3-4 weeks | CRT aesthetic, all 13 doc types, sound, polish | Game feels like a terminal |
| M5 | Platform Hardening | 3-4 weeks | Caching, WebSocket, rate limiting, monitoring | Production-ready backend |
| M6 | Consumer Beta | 3-4 weeks | Responsive layout, PWA, offline, Steam build | Playable on web + Steam |
| M7 | Analytics & Assessment | 4-5 weeks | Event pipeline, competency scoring, phishing KPIs | Learning outcomes measurable |
| M8 | Enterprise Foundation | 4-5 weeks | Multi-tenancy, RLS, RBAC, admin panel, audit log | Tenant-isolated admin panel |
| M9 | Enterprise Integration | 5-6 weeks | SSO, SCIM, LMS, phishing simulation, compliance | Enterprise customers onboardable |
| M10 | Social Foundation | 3-4 weeks | Profiles, friends, leaderboards, achievements | Social identity exists |
| M11 | Cooperative Play | 4-5 weeks | 2-player co-op, state sync, role permissions | Two players can complete a day together |
| M12 | Season Content | 3-4 weeks | Season 1 complete, Season 2 dev, narrative depth | Full seasonal content pipeline |
| M13 | Enterprise Advanced | 5-6 weeks | SIEM, SOAR, CISO dashboard, ROI, compliance reporting | Enterprise product-market-fit |
| M14 | Competitive Multiplayer | 5-6 weeks | Red vs. Blue, matchmaking, ranked play | Competitive modes playable |
| M15 | Scale & Expand | 6-8 weeks | Multi-region, 6-player co-op, localization, UGC | Global platform |
| M16 | Monetization & Polish | 4-5 weeks | Store, season pass, mobile IAP, certifications | Revenue systems operational |

**Total estimated range: 65-80 weeks** (16-20 months) for the complete product.

---

## Milestone Details

### M0: Project Bootstrap
**Duration:** 2 weeks
**Teams:** All

| Deliverable | Description |
|------------|-------------|
| Monorepo structure | SvelteKit frontend + Fastify backend + shared types package |
| CI/CD pipeline | GitHub Actions: build, lint, unit tests, container builds |
| Dev environment | Docker Compose with PostgreSQL, Redis, local dev server |
| Database migration framework | Drizzle ORM setup with versioned migrations |
| Shared validation | Zod schemas compiled to JSON Schema for Fastify |
| Code quality | TypeScript strict mode, ESLint, Prettier, Husky hooks |
| Testing infrastructure | Vitest (unit), Playwright (E2E), test database seeding |

**Exit criteria:** `pnpm dev` starts both frontend and backend. CI passes. First migration runs.

---

### M1: Foundation
**Duration:** 3-4 weeks
**Dependencies:** M0
**Teams:** Frontend, Backend

#### Frontend
| System | Description |
|--------|-------------|
| Design token system | CSS custom properties: colors, typography, spacing, borders |
| Game + admin color palettes | Phosphor green, amber, threat tier colors, admin neutral palette |
| Typography & grid | JetBrains Mono stack, type scale, spacing tokens, panel grid |
| Theme architecture | `data-theme` attribute switching, green/amber/high-contrast/admin themes |
| Routing & layout | 4 route groups: `/(game)`, `/(admin)`, `/(auth)`, `/(public)` |
| UI primitives | Button, Panel, Badge, Tabs, Modal, Loading states |
| REST API client | Typed fetch wrapper with Zod response validation |
| Error handling | Categorized errors, diegetic error messages |

#### Backend
| System | Description |
|--------|-------------|
| Fastify app scaffold | Plugin-based modular structure, health/ready endpoints |
| PostgreSQL + Redis clients | Drizzle ORM connection, Redis client, connection pooling |
| Tenant schema (v1) | `public.tenants` table with `tenant_id` on all tables (not yet enforced) |
| Auth module (local) | Email/password, JWT, sessions, user profiles |
| In-process event bus | Module decoupling mechanism for internal events |
| Structured logging | Pino JSON logging with tenant/user context, field redaction |
| OpenAPI generation | Auto-generated API docs from Fastify schemas |
| Error handling | ErrorCodes registry, global error handler, standard response format |

**Exit criteria:** Running SvelteKit app with 4 route groups, design tokens applied, default theme rendering. Backend serves authenticated health check with JWT. OpenAPI docs at `/docs`.

---

### M2: Core Game Loop
**Duration:** 5-6 weeks
**Dependencies:** M1
**Teams:** Frontend, Backend, Game Design

#### Backend - Game Engine
| System | Description |
|--------|-------------|
| Game engine module | Session lifecycle, 11-phase day cycle state machine, action processing |
| Event sourcing system | Immutable `game.events` table, monthly partitioning, sequence enforcement, snapshot materialization (every 50 events or day boundary) |
| Deterministic RNG | Seeded PRNG for email selection, attack outcomes, breach severity |
| Email & decision system | Email instances, indicators, decisions (approve/deny/flag/verify/defer) |
| Verification packet system | Cross-reference documents, indicator marking |
| Facility module | 4 resource systems (rack space, bandwidth, power, cooling), client management |
| Threat engine (v1) | Attack generation, threat tiers (LOW→SEVERE), breach probability |
| Consequence engine | Trust score changes, fund changes, faction relations, backlog pressure |
| Upgrade system | Security tools, facility upgrades, maintenance degradation |
| Economy domain (v1) | Credits/Trust Score/Intel Fragments, wallets, transactions |
| Incident response | Incident creation, containment/recovery actions, resolution |
| Breach & recovery | Ransom mechanic (lifetime earnings / 10), recovery mode, game over |

#### Frontend - Game Screens
| System | Description |
|--------|-------------|
| Main terminal layout | 3-panel CSS Grid (inbox / content / status) |
| InboxList component | Email queue with urgency indicators, status badges |
| EmailViewer | Header inspection, body rendering, attachment preview |
| ActionStamp | Approve/Deny/Flag/Verify stamps with "THUNK" feedback |
| Phishing Analysis Worksheet | Two-column checklist, notes, risk score |
| Verification Packet viewer | Tabbed identity/ownership/chain, flag discrepancies |
| Facility dashboard | Resource meters, client list, utilization display |
| Day summary panel | Net changes, narrative notes, "advance day" control |
| State management | 3-layer: ephemeral UI / synced game state / event sourcing |
| Action pipeline | Intent → validate → submit → reconcile → update UI |
| Phase-driven rendering | UI adapts to current state machine phase |
| Keyboard shortcuts (core) | A/D/F/V for decisions, arrow keys, Tab navigation |
| ResourceMeter | Capacity bars with threshold warnings |
| ThreatIndicator | 5-level threat display with multi-channel encoding |
| NotificationToast | Priority-tiered game event notifications |

**Exit criteria:** A user can log in, start a session, receive emails, inspect headers, mark indicators, request verification, make decisions, see consequences, manage facility resources, purchase upgrades, face threats, resolve incidents, and advance to the next day. Event log captures all actions deterministically.

---

### M3: Content Pipeline
**Duration:** 3-4 weeks
**Dependencies:** M2
**Teams:** Backend, Content, AI

| System | Description |
|--------|-------------|
| Content module | Email templates, scenario library, document templates, localization layer |
| 50 handcrafted email scenarios | Curated across 5 difficulty tiers, covering all major attack types |
| AI pipeline (v1) | Claude API integration: prompt engine → output parser → validator → quality scorer → difficulty classifier |
| Redis email pool | Pre-generated pool of 200+ emails, LPUSH/RPOP management, low-watermark alerts |
| BullMQ job processing | AI generation queue, exponential backoff, dead-letter queues |
| Safety guardrails | No real companies/people/URLs/PII in generated content |
| Narrative module (v1) | Factions, faction relations, Morpheus coaching messages |
| Season 1 Act I content | "Signal Loss" - phishing/access control focus, 3-4 chapters |
| Difficulty classification | 5-tier system aligned with threat tiers |
| Content quality scoring | Automated quality assessment for AI-generated emails |

**Exit criteria:** AI-generated emails appear in the pool and are served to game sessions. 50 handcrafted scenarios available for offline play. Season 1 Act I is playable with faction interactions and Morpheus coaching.

---

### M4: Terminal Experience
**Duration:** 3-4 weeks
**Dependencies:** M2, M3
**Teams:** Frontend, Audio, Art

| System | Description |
|--------|-------------|
| CRT effects suite | Scanlines, screen glow, noise texture, vignette, screen curvature, event-triggered flicker |
| CRT controls panel | Per-effect toggle + intensity slider |
| All 13 document type renderers | Email, PAW, Verification Packet, Threat Assessment, Incident Log, Data Salvage Contract, Storage Lease, Upgrade Proposal, Blacklist Notice, Whitelist Exception, Facility Report, Intelligence Brief, Ransom Note |
| Dialog system | Character dialogue with branching (Morpheus, SYSOP-7, faction characters) |
| Sound system | 6 audio categories: ambient, UI, alerts, stamps, narrative, effects |
| Animation system | 8 patterns: typewriter, flicker, transitions, stamp, meters, toast, cursor, glow |
| Upgrade shop screen | Catalog, cost/benefit, purchase flow |
| Threat monitor screen | Detailed threat intelligence view |
| Incident response view | Evidence logs, containment/recovery action selection |
| Ransom lockout screen | Full-screen takeover with altered CRT effects |
| Tooltip & help system | Diegetic `help` command, in-world documentation |
| Right-click context menus | In-document actions (highlight, flag, note) |
| Drag-and-drop comparison | Side-by-side document review |

**Exit criteria:** The game looks and feels like a terminal. All 13 document types render with proper interactivity. Sound and animation provide satisfying feedback. CRT effects are visually distinctive and individually controllable.

---

### M5: Platform Hardening
**Duration:** 3-4 weeks
**Dependencies:** M2, M3
**Teams:** Backend, DevOps

| System | Description |
|--------|-------------|
| Caching strategy | Redis cache-aside for content, auth policy, feature flags. Write-through for player state. |
| WebSocket protocol | `/api/v1/ws` with SSE fallback. Subscription channels for game session and notifications. <50ms delivery target. |
| Rate limiting | Per-endpoint limits (registration: 5/hr, login: 10/15min, game actions: 30/min). Standard headers. |
| Monitoring & observability | Prometheus metrics, Grafana dashboards, Alertmanager rules. HTTP latency, error rates, queue depths. |
| Redis email pool management | Pre-generation strategy, low-watermark alerts, pool health monitoring |
| MFA/WebAuthn | TOTP and FIDO2/WebAuthn for admin/Super Admin access |
| Security hardening | Container hardening, network policies, OWASP Top 10, dependency scanning |
| Disaster recovery (v1) | Daily PostgreSQL backups with PITR, backup testing |
| Load testing (v1) | Baseline performance under 1K concurrent users |
| API versioning | `v1` prefix, version headers, deprecation strategy |

**Exit criteria:** API meets <200ms P95. WebSocket delivers <50ms P95. Rate limiting protects all endpoints. Monitoring dashboards operational. Cache hit rates measurable in Grafana.

---

### M6: Consumer Beta
**Duration:** 3-4 weeks
**Dependencies:** M4, M5
**Teams:** Frontend, DevOps

| System | Description |
|--------|-------------|
| Responsive layouts | Desktop (3-panel), tablet (2-panel + drawer), mobile (single panel + tabs) |
| Touch interactions | Swipe, pinch-to-zoom, long-press, haptic feedback |
| PWA & service worker | Workbox precaching, runtime caching, push notifications |
| Offline game mode | 50 handcrafted emails playable without connectivity |
| IndexedDB persistence | Offline content and event queue storage |
| Sync strategy | Reconnection and conflict resolution |
| Steam packaging | Electron or Tauri wrapper with local saves |
| Settings system | Display/accessibility/gameplay/audio/account categories |
| Custom theme editor | User-configurable theme with contrast validation |
| Accessibility audit (v1) | Automated axe-core + manual NVDA/VoiceOver testing |
| High-contrast theme | Full WCAG 2.1 AA compliance mode |
| Color-blind modes | Protanopia, deuteranopia, tritanopia palettes |
| Performance optimization | Code splitting, lazy PixiJS/D3 imports, virtualized lists, CSS containment |
| Season 1 Acts II & III + Finale | Complete Season 1 "Signal Loss" narrative |

**Exit criteria:** Game is playable across desktop, tablet, and mobile. PWA works offline. Steam build runs. Performance budgets met. Accessibility audit passes automated checks. Season 1 is complete. **Consumer beta launch.**

---

### M7: Analytics & Assessment
**Duration:** 4-5 weeks
**Dependencies:** M2, M5
**Teams:** Backend, Data

| System | Description |
|--------|-------------|
| Event schema & taxonomy | Canonical event format, naming conventions, payload standards, versioning |
| Core loop instrumentation | Events for all decision points, threats, incidents, upgrades, resources |
| Event ingestion pipeline | Analytics module subscribes to game events, writes to analytics store |
| Analytics event store | TimescaleDB hypertable on `analytics.events`, monthly partitioning |
| Player skill profiles | 7-domain competency scores, trends, recommended focus areas |
| Competency framework | Phishing detection, social engineering resistance, incident response, password security, data handling, physical security, compliance awareness |
| Evidence weighting model | Difficulty-adjusted, context-weighted scoring |
| Baseline calibration | Onboarding as hidden assessment for before/after measurement |
| Continuous implicit assessment | Every decision produces weighted evidence (stealth learning) |
| Phishing metrics | Click rate, report rate, false positive rate, mean time to report |
| Decision quality scoring | Weighted correctness metric proving improvement |
| Behavioral change metrics (v1) | Verification usage rate, risky approval rate |
| Consumer retention analytics | D1/D7/D30/D60/D90 cohort retention |
| Data quality validation | Schema validation on ingestion |
| Pseudonymization (v1) | Privacy-by-design for all analytics events |
| Graceful degradation | Game continues if analytics is temporarily down |

**Exit criteria:** Events flow from game engine through analytics pipeline into TimescaleDB. Player competency profiles computed. Phishing KPIs measurable. Consumer retention trackable. All events schema-validated and pseudonymized.

---

### M8: Enterprise Foundation
**Duration:** 4-5 weeks
**Dependencies:** M5, M7
**Teams:** Backend, Frontend

| System | Description |
|--------|-------------|
| Tenant context middleware | Injected on every request, sets PostgreSQL session variable |
| Row-Level Security (RLS) | Policies on all tenant-scoped tables, defense-in-depth |
| Tenant provisioning | Automated: record creation, default roles, initial admin. Target <5 min. |
| RBAC engine | 5 built-in roles (Super Admin, Tenant Admin, Manager, Trainer, Learner), permission catalog |
| Audit log (v1) | Append-only admin action logging |
| Admin UX foundation | Light theme, sidebar navigation, admin component library |
| Admin dashboard (basic) | Tenant info, active users, basic metrics |
| User management (basic) | CRUD, role assignment, search |
| Basic trainer dashboard | Competency distribution, campaign completion, common errors |
| Certificate generation | Completion certificates with regulatory framework references |
| Compliance snapshot store | Framework completion status per tenant |
| Feature flags | Server-evaluated, A/B testing capable, tenant-isolated |

**Exit criteria:** Tenants can be created with isolated data. Admin panel shows users and basic metrics. RBAC enforces role-based access. Audit log records all admin actions. Trainers can see competency data. Certificates can be generated.

---

### M9: Enterprise Integration
**Duration:** 5-6 weeks
**Dependencies:** M8
**Teams:** Backend, Frontend, Security

| System | Description |
|--------|-------------|
| SAML 2.0 SSO | SP- and IdP-initiated, encrypted assertions, verified for Okta/Entra/Ping |
| OIDC SSO | Authorization Code + PKCE, group-to-role mapping, back-channel logout |
| SCIM 2.0 provisioning | RFC 7643/7644, user + group sync, <60s latency, verified for Okta |
| JIT user provisioning | Create user on first SSO login when SCIM not configured |
| Onboarding wizard | Guided: org profile, IdP config, SCIM token, compliance framework selection |
| Campaign management (v1) | Audience selection, schedule, training content assignment, start/pause/complete |
| Phishing simulation (v1) | Email-channel simulation, custom templates, teachable moment pages |
| Email sending infrastructure (v1) | SPF/DKIM/DMARC alignment, automated IP warm-up |
| SCORM 1.2/2004 export | ADL-conformant LMS integration |
| xAPI statement emission | v1.0.3 and 2.0 with custom verb vocabulary |
| LTI 1.3 with Advantage | Deep Linking, Assignment & Grade Services |
| Webhook system | HMAC-signed delivery, tenant metadata, retry with backoff |
| API keys & service accounts | Scoped keys for service-to-service integration |
| Billing & entitlements (v1) | Seat counting, plan-based feature gates (Starter/Professional/Enterprise/Government) |
| Audit log (enhanced) | SHA-256 chained hashing, integrity verification |
| Data retention engine (v1) | Configurable per-tenant retention policies |

**Exit criteria:** Enterprise tenants can onboard with SSO, provision users via SCIM, run phishing simulation campaigns, track results in LMS via SCORM/xAPI/LTI, and have audit-grade logging. **First 50 enterprise customers targetable.**

---

### M10: Social Foundation
**Duration:** 3-4 weeks
**Dependencies:** M6
**Teams:** Backend, Frontend

| System | Description |
|--------|-------------|
| Player profiles | Display name, avatar, privacy mode, tenant-scoped visibility |
| Social graph | Friends, block, mute with tenant isolation |
| Presence service | Redis-backed online/offline/in-game status |
| Quick signals | Predefined phrase system for safe communication |
| Avatar system | Pre-approved cosmetic assets, curated selection |
| Global/regional leaderboards | Redis sorted sets, daily/weekly/seasonal |
| Enterprise leaderboards | Department-filtered, privacy-configurable |
| Achievement/badge system | Security competency milestones, progression rewards |
| Endorsement system | Post-session structured commendations |
| Reputation system (v1) | Based on endorsements, session completion, reports |
| Moderation pipeline (v1) | Automated filtering, rate limiting, user reporting |
| Enterprise consent & privacy | Anonymous-by-default profiles, tenant policy enforcement |

**Exit criteria:** Players have social identity, can add friends, see who's online, compete on leaderboards, earn achievements, and endorse other players. Enterprise tenants have scoped leaderboards with privacy controls.

---

### M11: Cooperative Play
**Duration:** 4-5 weeks
**Dependencies:** M10
**Teams:** Backend, Frontend, Game Design

| System | Description |
|--------|-------------|
| Party system | Formation, ready-check, role preference |
| Two-player co-op missions | Triage Lead + Verification Lead roles |
| Co-op state synchronization | Server-authoritative, lock-free optimistic concurrency, WebSocket, sequence-numbered events |
| Role-based permission matrix | Server-enforced, designed to extend to 6 roles |
| Decision arbitration | Proposal/confirm/override workflow, Authority Token |
| Co-op threat scaling | Adjusted difficulty for party size |
| Text chat service | Opt-in, moderation-filtered, enterprise-disableable |
| Multiplayer analytics | partyId, coopRole attribution on all session events |
| Co-op UI | Split-pane view, role-specific controls, shared decision queue |

**Exit criteria:** Two players can form a party, complete a full day cycle with role division, rotate the Authority Token, and have their collaborative decisions individually attributed in analytics. Enterprise audit trails correctly log who made each decision.

---

### M12: Season Content
**Duration:** 3-4 weeks
**Dependencies:** M6, M3
**Teams:** Content, AI, Game Design

| System | Description |
|--------|-------------|
| Season 2 development | "Supply Lines" - supply chain security focus |
| Branching narrative engine | River delta model, Nexus Points, Spine/Branches/Tendrils/Echoes |
| Faction depth | 5 faction axes with threshold-triggered events |
| Adaptive difficulty engine (v1) | Basic difficulty adjustment using competency scores and error patterns |
| Spaced repetition engine | SM-2 algorithm, per-domain queues, interval scheduling (1-180 days) |
| Micro assessment delivery | Short diegetic prompts in intelligence briefs |
| Coaching system (enhanced) | Contextual Morpheus messages referencing actual player decisions |
| Content effectiveness scoring | Detection uplift, error reduction per scenario |
| Diegetic learner feedback | Educational notes without breaking the game illusion |

**Exit criteria:** Season 2 content pipeline proven. Adaptive difficulty adjusts based on player performance. Spaced repetition delivers review content. Content effectiveness is measurable.

---

### M13: Enterprise Advanced
**Duration:** 5-6 weeks
**Dependencies:** M9, M7
**Teams:** Backend, Frontend, Data

| System | Description |
|--------|-------------|
| CISO dashboard | Risk posture, phishing trends, heat map, compliance status, board-ready visualizations |
| ROI calculator | Cost-of-breach avoidance, susceptibility reduction, training cost comparison |
| Cyber insurance impact estimate | Security posture vs. insurance premium tracking |
| Compliance reporting engine | 9 framework-specific reports (GDPR, HIPAA, PCI-DSS, NIS2, DORA, SOX, ISO 27001, SOC 2, FedRAMP) |
| Automated gap identification | Current status vs. framework requirements |
| Report export pipeline | PDF/CSV/JSON with digital signatures, integrity hashes |
| SIEM: Splunk connector | HTTP Event Collector + REST API, CIM-compliant, certified App |
| SIEM: Sentinel connector | Azure Monitor Data Collector API, KQL workbook |
| SIEM: Generic/Syslog output | CEF/LEEF/Syslog fallback, HTTPS webhook |
| SOAR: Cortex XSOAR | Certified content pack, bidirectional |
| GraphQL analytics endpoint | Complex analytical queries for dashboards |
| White-label branding | Logo, colors, fonts, custom domains, 60-second propagation |
| SOC 2 Type II audit | All prerequisite controls in place, audit begins |
| Board report generation | Narrative-style executive reports |
| Predictive risk indicators | Trend-based prediction for assessment failure, phishing susceptibility |

**Exit criteria:** Enterprise buyers can see ROI, compliance status, and risk posture in dashboards. SIEM/SOAR integration exports events to security stack. SOC 2 audit underway. **Enterprise product-market-fit validated.**

---

### M14: Competitive Multiplayer
**Duration:** 5-6 weeks
**Dependencies:** M11
**Teams:** Backend, Frontend, Game Design

| System | Description |
|--------|-------------|
| Red vs. Blue mode | Team-swapping rounds, abstracted Red team tooling (Nmap/Metasploit/SET/Cobalt Strike), Blue team SIEM/EDR/Sandboxing/Forensics/Honeypots |
| Matchmaking service | Region/mode pooling, rating-bounded, party-aware |
| Elo-based skill rating | Multi-competency composite, independent Red/Blue/co-op tracks |
| Ranked play system | Seasonal ladders with narrative-themed tiers (Gatekeeper→Overseer) |
| Placement matches | Baseline assessment before visible rank |
| Anti-exploitation controls | Win-trading, smurf, collusion detection, deterministic replay for disputes |
| Spectator mode | Read-only, no hidden info in competitive |
| Streamer tools | Twitch/YouTube overlays, clip-friendly replay exports |
| Named co-op scenarios | 4 BRD scenarios: Cascade Failure, Bandwidth Siege, The Insider, Data Exodus |
| Async challenges | Deterministic seed-based solo challenges compared on scoreboards |
| Community forums | "Operator Bulletin Boards" with structured tags, moderation |
| Consumer guild system | "Network Alliances" with events, shared activities |

**Exit criteria:** Competitive modes are playable with fair matchmaking. Ranked ladders provide long-term engagement. Guilds and forums create persistent community. Async challenges serve enterprise training events.

---

### M15: Scale & Expand
**Duration:** 6-8 weeks
**Dependencies:** M13, M14
**Teams:** All

| System | Description |
|--------|-------------|
| Multi-region infrastructure | EU (Frankfurt), US (US-East/West), UK (London), APAC (Singapore) |
| Data residency enforcement | Region-locked routing, cross-border transfer logging |
| Six-player co-op | 6 SOC roles, dual Authority Tokens, structured coordination board |
| Asymmetric Assault | 1 attacker vs. 3-5 defenders |
| Purple Team mode | Simulate/defend/post-mortem hybrid |
| Enterprise Corporation system | SCIM-mapped org groups, shared treasury, dual-approval, shared SIEM dashboard, joint honeypot network |
| Cross-organization benchmarking | Anonymized peer comparison |
| Enterprise team competitions | CTF events, hackathons, seasonal tournaments |
| Internationalization | ICU message catalog, 12 EU languages (priority) |
| RTL layout support | Arabic, Hebrew, Farsi with CSS logical properties |
| PixiJS facility visualization | Canvas-rendered facility map with SVG/HTML fallback |
| D3.js analytics charts | Admin dashboard visualizations, lazy loaded |
| UGC platform | Community-created threat packs, Steam Workshop, marketplace |
| Season 3 & 4 development | "Dark Channels" (ransomware) + "The Inside Job" (insider threats) |
| SIEM: QRadar + Elastic | Additional SIEM platform connectors |
| HRIS integration | Workday, BambooHR, SAP SuccessFactors, ADP bidirectional sync |
| Teams bot + Slack app | Training reminders, phishing reporting, leaderboards in collaboration tools |
| Advanced phishing sim | SMS, voice, QR code channels beyond email |
| Dedicated DB tiers | Mid-market (dedicated schema) and enterprise (dedicated database) isolation |
| Service extraction preparation | Outbox pattern, NATS JetStream/Kafka readiness for >100K concurrent |

**Exit criteria:** Platform operates globally with data residency. Full multiplayer suite live. 4 seasons of content. 24+ languages supported. Enterprise corporations with shared infrastructure. **Global platform operational.**

---

### M16: Monetization & Polish
**Duration:** 4-5 weeks
**Dependencies:** M10, M12 (consumer), M9 (enterprise)
**Teams:** Backend, Frontend, Product

| System | Description |
|--------|-------------|
| Enterprise billing (full) | Multi-year discounts, volume pricing, MSP/reseller program |
| In-game store | Terminal themes, facility skins, insignia. Cosmetic-only. |
| Season Pass (Battle Pass) | Free + premium tracks, multiplayer milestone contributions |
| Premium currency / IAP | Mobile F2P. Transparent pricing. No loot boxes. |
| Archive Pass subscription | $4.99/month, unlocks all seasonal content |
| Certification commerce | Exportable cybersecurity competency certificates ($9.99-$29.99) |
| Mobile native wrappers | iOS/Android with push notifications |
| FedRAMP Ready designation | Government market entry pathway |
| A/B testing framework | Deterministic assignment, governance, enterprise opt-out |
| Learning outcome validation | Controlled studies, third-party efficacy study |
| Advanced adaptive difficulty | Full predictive model with content effectiveness integration |

**Monetization principles (strictly enforced):**
1. No pay-to-win
2. No predatory mechanics (no loot boxes, no gacha, no energy systems)
3. Educational value first (free players get complete training)
4. Transparency (clear pricing, no hidden costs)
5. Enterprise neutrality (training outcomes never influenced by monetization)

**Exit criteria:** All revenue streams operational. Enterprise billing + consumer store + mobile IAP. Published efficacy study validates learning outcomes.

---

## Cross-Cutting Concerns (Threaded Through All Milestones)

| Concern | When | Details |
|---------|------|---------|
| **Accessibility** | M1→M6 | Baked into every component. Automated axe-core in CI. Manual NVDA/VoiceOver testing. VPAT maintained. |
| **Security** | M0→All | OWASP Top 10, dependency scanning, CSP, Trusted Types, anti-clickjacking. Annual pen test. |
| **Testing** | M0→All | Unit tests for reducers/actions. Integration tests for full day cycles. Property-based tests for event sourcing. E2E with Playwright. |
| **Documentation** | M0→All | OpenAPI auto-generated. Component catalog (Storybook equivalent). Architecture decision records. |
| **Performance** | M5→All | Lighthouse budgets, <3s initial load, <100ms state updates, <200ms API. |

---

## Risk Register (Top 10 Cross-Domain)

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | Event sourcing correctness | Critical | Property-based tests, replay verification tool in CI, >95% test coverage on reducers |
| 2 | RLS misconfiguration (cross-tenant data leak) | Critical | Automated cross-tenant access tests on every PR, mandatory tenant_id on all tables |
| 3 | AI content quality inconsistency | High | Multi-layer validation, human review cadence, pre-generated pool with quality scoring, handcrafted fallback |
| 4 | Terminal aesthetic vs. accessibility tension | High | Effects as CSS overlays only, automated contrast validation in token pipeline, continuous a11y testing |
| 5 | 13 document type renderers complexity | High | Plugin architecture with DocumentTypeConfig interface, incremental delivery across M2→M4 |
| 6 | Client-side event sourcing (offline sync) | High | Online-only first (M2), offline queue added (M6), property-based determinism tests |
| 7 | SCIM 2.0 vendor quirks | Medium | Start with Okta, use their test harness, budget 3x estimated time |
| 8 | Stealth learning vs. measurability tension | Medium | Evidence weighting model validated with design partners early |
| 9 | CRT effects performance on low-end devices | Medium | Auto-disable below frame rate threshold, mobile disables by default |
| 10 | Red team action deck balance | Medium | Extensive playtesting, separate Red/Blue ranks, seasonal balance passes |

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|----------|
| **SvelteKit + Svelte 5** | 90% DOM app (emails, documents). Compiled reactivity = snappiest UI. |
| **Modular monolith → microservices** | Avoid premature decomposition. Clear module boundaries. Extract when proven necessary. |
| **Event sourcing** | Determinism for replay, audit, enterprise compliance. Non-negotiable. |
| **PostgreSQL + RLS** | Proven at scale. RLS for tenant isolation. JSONB for flexible schemas. |
| **TimescaleDB over ClickHouse** | Same PostgreSQL stack. JOINs to operational tables. One line of SQL to create hypertable. Upgrade path to ClickHouse if needed at 100K+ concurrent. |
| **Redis for everything ephemeral** | Sessions, cache, email pool, leaderboards, BullMQ queues, presence. |
| **Claude API primary, self-hosted fallback** | Best content quality. Offline/enterprise fallback with Mistral/Llama. |
| **Shared-schema first** | RLS-enforced shared database for all early tenants. Dedicated schema/DB deferred to M15 when first large contract requires it. |

---

## Parallel Work Streams

The milestones are presented sequentially for clarity, but significant parallelization is possible:

```
Stream 1 (Game):     M0 → M1 → M2 → M3 → M4 → M6 → M12
Stream 2 (Backend):  M0 → M1 → M2 → M5 → M7 → M8 → M9 → M13
Stream 3 (Social):   ----------------------→ M10 → M11 → M14
Stream 4 (Scale):    ----------------------------------------→ M15 → M16
```

With 2-3 engineers per stream, the critical path shortens significantly. The longest sequential chain is:

**M0 → M1 → M2 → M5 → M7 → M8 → M9 → M13** (~35-40 weeks)

---

*This roadmap synthesizes findings from 14 Design Documents, a 1,363-line BRD, and 14 research files totaling ~23,000 lines. It represents the consensus of 7 specialist architecture reviews conducted in parallel.*

*All estimates are ranges. Actual timelines depend on team size, iteration cycles, and market feedback.*

---

**End of Document**
