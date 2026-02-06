# Technical Architecture Report: The DMZ: Archive Gate

**Document ID:** BRD-014
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal — Architecture

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [AI & Dynamic Content](#4-ai--dynamic-content)
5. [Data Architecture](#5-data-architecture)
6. [DevOps & Infrastructure](#6-devops--infrastructure)
7. [Performance Requirements](#7-performance-requirements)
8. [Security Architecture](#8-security-architecture)
9. [Technology Stack Summary](#9-technology-stack-summary)
10. [Risk Matrix](#10-risk-matrix)
11. [Appendices](#11-appendices)

---

## 1. Executive Summary

**The DMZ: Archive Gate** is a web-first cybersecurity training game set in a post-internet-collapse world where players manage one of the last functioning data centers. Players evaluate email-based access requests, identify phishing attacks, manage infrastructure upgrades, and defend against increasingly sophisticated adversaries. The game teaches real-world cybersecurity skills (phishing identification, threat assessment, incident response) through immersive narrative gameplay.

This report defines the technical architecture required to deliver the game as a performant, scalable, secure web application. The project has migrated from a Godot prototype to a from-scratch web build, and this document establishes the canonical technical blueprint going forward.

### Key Architectural Drivers

| Driver        | Constraint                                             |
| ------------- | ------------------------------------------------------ |
| Platform      | Web-first (browser); desktop/mobile responsive         |
| Core loop     | Email triage, phishing analysis, resource management   |
| Content model | AI-generated + handcrafted hybrid                      |
| Scale target  | 10K concurrent users at launch, 100K+ at maturity      |
| Monetization  | Subscription + enterprise licensing (multi-tenant)     |
| Regulatory    | GDPR, SOC 2 alignment (training platform handling PII) |

---

## 2. Frontend Architecture

### 2.1 Web Technologies

The frontend is built on modern web standards:

- **HTML5** — semantic markup, `<dialog>` for modals, `<template>` for dynamic document rendering, `<details>` for collapsible threat reports
- **CSS3** — custom properties for theming (dark terminal aesthetic), CSS Grid for dashboard layouts, CSS animations for alert states and status transitions, `@container` queries for responsive game panels
- **TypeScript** — strict mode throughout; no raw JavaScript in production code; provides compile-time safety for complex game state types

### 2.2 Framework Recommendation: SvelteKit

**Primary recommendation: SvelteKit** (with Svelte 5 runes)

| Framework     | Pros                                                                                                                      | Cons                                                               | Verdict                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| **React**     | Massive ecosystem, hiring pool, mature tooling                                                                            | Virtual DOM overhead, bundle size, boilerplate for game state      | Viable but not optimal |
| **Vue 3**     | Good DX, Composition API, lighter than React                                                                              | Smaller game-dev ecosystem, two-way binding can obscure state flow | Viable                 |
| **SvelteKit** | No virtual DOM (compiled), smallest bundle, built-in SSR/routing, native reactivity model, excellent animation primitives | Smaller ecosystem, fewer hires                                     | **Recommended**        |

**Rationale:** Archive Gate is a UI-heavy game — the core loop involves reading emails, filling worksheets, clicking through documents, and monitoring dashboards. This is fundamentally a DOM application, not a canvas game. Svelte's compiled reactivity model eliminates virtual DOM diffing overhead, producing the snappiest possible UI transitions for document inspection and panel switching. SvelteKit provides file-based routing, SSR for initial loads, and API routes — a complete full-stack solution in one framework.

**Component Architecture:**

```
src/
  lib/
    components/
      email/           # Email viewer, inbox list, compose
      documents/       # Verification packets, contracts, threat sheets
      dashboard/       # Facility status, power/cooling/utilization
      terminal/        # Command-line interface overlay
      notifications/   # Alert toasts, breach warnings
      upgrade/         # Upgrade shop, proposal viewer
    stores/            # Svelte stores for game state
    engine/            # Game loop, tick system, event bus
    ai/                # Client-side AI interaction layer
    utils/             # Formatters, validators, crypto helpers
  routes/
    /                  # Landing / login
    /game              # Main game shell
    /game/inbox        # Email triage view
    /game/facility     # Facility management
    /game/intel        # Intelligence briefs
    /game/blacklist    # Blacklist/whitelist management
    /admin             # Admin panel (enterprise)
```

### 2.3 Game Engine Considerations

**Recommendation: Hybrid DOM + Canvas approach**

The game has two distinct rendering needs:

1. **Document/UI layer (DOM):** Emails, worksheets, contracts, dashboards, dialog trees. This is 90% of the gameplay. DOM rendering is the correct choice — it provides accessibility, text selection, screen reader support, and native form handling. Svelte handles this natively.

2. **Visualization layer (Canvas/WebGL):** Facility status map, network topology visualization, attack animation overlays, real-time threat radar. This is where a lightweight engine adds value.

| Engine          | Use Case                                                     | Recommendation                                                                  |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **PixiJS**      | 2D facility map, network graph, particle effects for attacks | **Use for visualization layer**                                                 |
| **Phaser**      | Full 2D game engine                                          | Overkill — we do not need physics, tilemaps, or sprite-based gameplay           |
| **Three.js**    | 3D server room visualization                                 | Future consideration for "walk the data center" mode; not MVP                   |
| **D3.js**       | Data visualization (threat metrics, analytics)               | **Use for dashboards and charts**                                               |
| **Pure Canvas** | Lightweight custom rendering                                 | Viable for very simple overlays, but PixiJS's WebGL batching is worth the 200KB |

**Integration pattern:** Mount PixiJS `Application` instances inside Svelte components using `bind:this` and `onMount`. The PixiJS canvas receives game state via Svelte stores and renders the visual layer, while the DOM handles all interactive UI. This avoids the "everything in canvas" trap that kills accessibility and increases development cost.

```svelte
<!-- FacilityMap.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Application, Container } from 'pixi.js';
  import { facilityState } from '$lib/stores/facility';

  let canvas: HTMLCanvasElement;
  let app: Application;

  onMount(async () => {
    app = new Application();
    await app.init({ canvas, resizeTo: canvas.parentElement });
    // Subscribe to facility state changes and update PixiJS scene
    const unsub = facilityState.subscribe((state) => renderFacility(app, state));
    return unsub;
  });

  onDestroy(() => app?.destroy());
</script>

<canvas bind:this={canvas} class="facility-canvas"></canvas>
```

### 2.4 State Management

Game state is complex and hierarchical. The architecture uses a layered state model:

**Layer 1 — Svelte Stores (Client-Authoritative UI State)**

```typescript
// Ephemeral UI state — never persisted
export const activePanel = writable<'inbox' | 'facility' | 'intel'>('inbox');
export const selectedEmailId = writable<string | null>(null);
export const terminalOpen = writable(false);
```

**Layer 2 — Game State Store (Server-Authoritative, Synced)**

```typescript
// Core game state — persisted, server-validated
interface GameState {
  day: number;
  funds: number; // euros
  threatLevel: number; // 0-100
  facility: FacilityState;
  inbox: Email[];
  clients: Client[];
  blacklist: string[];
  whitelist: string[];
  incidentLog: Incident[];
  upgrades: UpgradeState;
  breachActive: boolean;
  ransomAmount: number | null;
}

// Implemented as a derived store from event log
export const gameState = derived(eventLog, ($events) => {
  return reduceEvents($events, initialState);
});
```

**Layer 3 — Event Sourcing (Canonical State)**

All game actions are events. State is derived by reducing the event log. This provides:

- Full replay capability
- Undo/redo
- Deterministic saves
- Audit trail for learning analytics
- Server-side validation by replaying events

```typescript
type GameEvent =
  | { type: 'EMAIL_RECEIVED'; payload: Email }
  | { type: 'EMAIL_APPROVED'; payload: { emailId: string; clientId: string } }
  | { type: 'EMAIL_REJECTED'; payload: { emailId: string; reason: string } }
  | { type: 'PHISHING_DETECTED'; payload: { emailId: string; indicators: string[] } }
  | { type: 'PHISHING_MISSED'; payload: { emailId: string } }
  | { type: 'UPGRADE_PURCHASED'; payload: { upgradeId: string; cost: number } }
  | { type: 'ATTACK_STARTED'; payload: { attackId: string; vector: AttackVector } }
  | { type: 'BREACH_OCCURRED'; payload: { attackId: string; ransomAmount: number } }
  | { type: 'RANSOM_PAID'; payload: { amount: number } }
  | { type: 'DAY_ADVANCED'; payload: { newDay: number } }
  | { type: 'FACILITY_STATUS_UPDATED'; payload: FacilityMetrics };
```

**State Persistence Strategy:**

- Event log snapshots saved to IndexedDB every 30 seconds
- Full state synced to server on day transitions and critical events
- Server maintains authoritative event log; client log is optimistic
- Conflict resolution: server wins, client replays from last confirmed snapshot

### 2.5 Offline Capability (PWA)

The game must function offline for single-player mode. This is critical for enterprise deployments where employees may train during travel.

**Service Worker Strategy:**

```
sw.js
  ├── Precache: App shell, core assets, fonts, icons
  ├── Runtime cache: Game content (emails, documents) — StaleWhileRevalidate
  ├── Network-first: AI-generated content, leaderboards
  └── Cache-only: Static assets (images, audio)
```

**Implementation with Workbox (via SvelteKit adapter):**

```typescript
// service-worker.ts
import { build, files, version } from '$service-worker';

const CACHE_NAME = `dmz-cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
```

**PWA manifest:**

```json
{
  "name": "The DMZ: Archive Gate",
  "short_name": "Archive Gate",
  "start_url": "/game",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#00ff41",
  "icons": [...]
}
```

**Offline content budget:** Pre-cache up to 50 handcrafted email scenarios and associated documents. AI-generated content requires network but gracefully degrades to cached content pools when offline.

### 2.6 WebSocket for Real-Time Features

Real-time communication is needed for:

- Live threat alerts and attack notifications
- Multiplayer/co-op scenarios (future)
- Real-time facility status updates (power draw, temperature)
- Admin observation of player sessions (enterprise)
- Leaderboard updates

**Protocol: WebSocket with SSE fallback**

```typescript
// Connection manager with automatic reconnection
class GameSocket {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  connect(sessionId: string) {
    this.ws = new WebSocket(`wss://api.archivedmz.io/ws?session=${sessionId}`);

    this.ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      gameEventBus.dispatch(msg);
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(sessionId), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    };
  }

  send(event: GameEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      offlineQueue.enqueue(event); // Drain when reconnected
    }
  }
}
```

**Message protocol:** JSON over WebSocket for simplicity at current scale. Migrate to binary (MessagePack or Protocol Buffers) if profiling shows serialization bottleneck above 50K concurrent connections.

**Server-Sent Events (SSE) fallback:** For environments where WebSocket is blocked (corporate proxies), fall back to SSE for server-to-client messages with HTTP POST for client-to-server events.

---

## 3. Backend Architecture

### 3.1 Architecture Pattern: Modular Monolith (Evolving to Microservices)

**Recommendation: Start with a modular monolith; extract services when scale demands.**

Premature microservice decomposition is the leading cause of death in early-stage game backends. A modular monolith provides:

- Single deployment unit (simpler ops)
- In-process communication (no network latency between modules)
- Shared database with schema-level isolation
- Clear module boundaries that map to future service boundaries

**Module Decomposition:**

```
src/
  modules/
    auth/              # Authentication, sessions, JWT
    game-engine/       # Core game logic, state machine, event processing
    content/           # Email templates, document generation, scenario library
    ai-pipeline/       # LLM integration, phishing generation, difficulty engine
    facility/          # Facility simulation (power, cooling, capacity)
    threat-engine/     # Attack generation, breach simulation, threat levels
    analytics/         # Player metrics, learning analytics, reporting
    billing/           # Subscription management, enterprise licensing
    admin/             # Admin panel API, player observation
    notification/      # WebSocket management, push notifications
  shared/
    events/            # Event definitions, event bus interface
    models/            # Shared domain models
    middleware/        # Auth, rate limiting, logging
    database/          # Connection pool, migrations, query builder
```

**Runtime:** Node.js with TypeScript (matches frontend language, shared types, large async ecosystem) or, if performance-critical simulation is required, a Go or Rust service for the threat engine with Node.js for the API layer.

**Recommended stack:**

- **Runtime:** Node.js 22 LTS with TypeScript 5.x
- **Framework:** Fastify (fastest Node HTTP framework, schema-based validation, plugin system maps to modules)
- **ORM:** Drizzle ORM (type-safe, SQL-first, excellent migration story)
- **Validation:** Zod (shared schemas between client and server via monorepo)

**Service extraction triggers:**

| Module          | Extract when...                                                             |
| --------------- | --------------------------------------------------------------------------- |
| `ai-pipeline`   | LLM latency affects game loop; needs GPU-backed infrastructure              |
| `analytics`     | Write volume exceeds game DB capacity; needs dedicated time-series store    |
| `threat-engine` | Simulation complexity requires dedicated compute; needs independent scaling |
| `notification`  | WebSocket connection count exceeds single-process limits                    |
| `billing`       | Regulatory or compliance requires isolation                                 |

### 3.2 Game State Management and Persistence

**State Machine Architecture:**

The game operates as a day-based state machine with real-time sub-states:

```
                    ┌──────────────┐
                    │  DAY_START   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ EMAIL_TRIAGE │◄──── New emails arrive
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ APPROVE  │ │ REJECT   │ │ ANALYZE  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │            │
             └─────────────┼────────────┘
                           │
                    ┌──────▼───────┐
                    │   ATTACKS    │◄──── Threat engine runs
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
              ┌─────┤BREACH_CHECK  ├─────┐
              │     └──────────────┘     │
              ▼                          ▼
       ┌──────────┐              ┌──────────────┐
       │  SAFE    │              │ BREACH_ACTIVE│
       └────┬─────┘              └──────┬───────┘
            │                           │
            │                    ┌──────▼───────┐
            │                    │ RANSOM_NOTE  │
            │                    └──────┬───────┘
            │                           │
            │              ┌────────────┼────────────┐
            │              ▼                         ▼
            │       ┌──────────┐              ┌──────────┐
            │       │  PAY     │              │ GAME_OVER│
            │       └────┬─────┘              └──────────┘
            │            │
            └────────────┤
                         │
                  ┌──────▼───────┐
                  │  UPGRADE     │◄──── Optional: purchase upgrades
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  DAY_END     │──── Advance day counter
                  └──────┬───────┘
                         │
                         └──► DAY_START (loop)
```

**Persistence strategy:**

| Data Type              | Store                          | Rationale                                            |
| ---------------------- | ------------------------------ | ---------------------------------------------------- |
| Event log (canonical)  | PostgreSQL (append-only table) | ACID, queryable, proven at scale                     |
| Current state snapshot | PostgreSQL (JSONB column)      | Fast reads, no event replay needed for current state |
| Session data           | Redis                          | Ephemeral, fast, auto-expiring                       |
| Asset metadata         | PostgreSQL                     | Relational, joins with player data                   |
| Real-time metrics      | Redis Streams                  | Sub-millisecond reads, time-windowed                 |
| Long-term analytics    | ClickHouse or TimescaleDB      | Columnar, optimized for time-series aggregation      |

### 3.3 Event Sourcing for Game Actions

Every player action and system event is recorded as an immutable event:

```sql
CREATE TABLE game_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES game_sessions(session_id),
    player_id       UUID NOT NULL REFERENCES players(player_id),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    event_type      VARCHAR(64) NOT NULL,
    event_data      JSONB NOT NULL,
    event_version   INT NOT NULL DEFAULT 1,
    server_time     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_time     TIMESTAMPTZ,
    sequence_num    BIGINT NOT NULL,  -- per-session monotonic
    UNIQUE(session_id, sequence_num)
);

-- Partitioned by month for retention management
CREATE INDEX idx_events_session ON game_events(session_id, sequence_num);
CREATE INDEX idx_events_player ON game_events(player_id, server_time);
CREATE INDEX idx_events_type ON game_events(event_type, server_time);
```

**Benefits for a training game:**

- **Audit trail:** Enterprise clients can review exactly what decisions a trainee made and in what order
- **Replay:** Instructors can replay a session to debrief with the trainee
- **Analytics:** Compute metrics like "average time to identify phishing" by querying event streams
- **Determinism:** Given the same event sequence, the game state is identical — critical for bug reproduction

**Snapshot strategy:** Materialize a state snapshot every 50 events or at day boundaries. Store snapshots in a separate table. To load a game, read the latest snapshot and replay only subsequent events.

### 3.4 Real-Time Event Processing

```
Player Action ──► API Gateway ──► Event Validator ──► Event Store (Postgres)
                                        │
                                        ▼
                                  Event Bus (in-process)
                                  /     |      \
                                 ▼      ▼       ▼
                            State    Threat   Analytics
                           Reducer   Engine   Collector
                              │        │         │
                              ▼        ▼         ▼
                           Snapshot  Attack   ClickHouse
                           (Postgres) Events  (async batch)
                              │        │
                              ▼        ▼
                         WebSocket  WebSocket
                         (state     (threat
                          update)    alerts)
```

**In-process event bus (modular monolith phase):**

```typescript
class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): Unsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)!.delete(handler);
  }

  async publish(event: GameEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();
    await Promise.all([...handlers, ...wildcardHandlers].map((h) => h(event)));
  }
}
```

**Migration path:** When extracting to microservices, replace the in-process EventBus with NATS JetStream or Apache Kafka. The handler signatures remain identical.

### 3.5 Queue Systems for Async Operations

Certain operations should not block the game loop:

| Operation                          | Queue Strategy                          | Latency Tolerance                |
| ---------------------------------- | --------------------------------------- | -------------------------------- |
| AI-generated phishing emails       | Job queue with priority                 | 2-10 seconds (pre-generate pool) |
| Analytics event ingestion          | Batched write queue                     | 30 seconds                       |
| Email delivery simulation          | Delayed queue (simulates network delay) | 1-30 seconds (in-game time)      |
| Threat scenario compilation        | Background job                          | Minutes (pre-computed)           |
| PDF report generation (enterprise) | Background job                          | Minutes                          |
| Notification dispatch              | Priority queue                          | < 1 second                       |

**Implementation: BullMQ on Redis**

```typescript
import { Queue, Worker } from 'bullmq';

const emailGenQueue = new Queue('email-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 3600 },
  },
});

// Pre-generate email pool
const worker = new Worker(
  'email-generation',
  async (job) => {
    const { difficulty, threatProfile, day } = job.data;
    const email = await aiPipeline.generatePhishingEmail({
      difficulty,
      threatProfile,
      day,
    });
    await emailPool.insert(email);
  },
  { connection: redisConnection, concurrency: 5 },
);
```

**Pre-generation strategy:** Maintain a pool of 20-50 pre-generated emails per difficulty tier. When pool drops below threshold, queue generation jobs. This eliminates player-perceived latency for AI content.

### 3.6 Caching Strategies

**Multi-layer caching:**

```
Browser Cache (HTTP Cache-Control)
    │
    ▼
CDN Edge (Cloudflare / CloudFront)
    │
    ▼
Application Cache (Redis)
    │
    ▼
Database (PostgreSQL)
```

| Data                            | Cache Layer       | TTL                               | Invalidation                  |
| ------------------------------- | ----------------- | --------------------------------- | ----------------------------- |
| Static assets (JS, CSS, images) | CDN + Browser     | 1 year (content-hashed filenames) | Deploy new hash               |
| Game content templates          | CDN + Redis       | 1 hour                            | Publish event                 |
| Player state snapshot           | Redis             | Session duration                  | Write-through on state change |
| Leaderboards                    | Redis sorted sets | 30 seconds                        | Scheduled refresh             |
| AI email pool                   | Redis             | Until consumed                    | Consumed = deleted            |
| Session tokens                  | Redis             | 24 hours                          | Logout = delete               |
| Configuration / feature flags   | Redis + local     | 60 seconds                        | Admin publish                 |

**Redis data structures:**

```
# Player session state
HSET session:{sessionId} state {json} day 5 funds 2400

# Leaderboard
ZADD leaderboard:global {score} {playerId}
ZADD leaderboard:tenant:{tenantId} {score} {playerId}

# Pre-generated email pool
LPUSH email-pool:difficulty:3 {emailJson}
RPOP email-pool:difficulty:3

# Rate limiting
INCR ratelimit:{ip}:{endpoint}
EXPIRE ratelimit:{ip}:{endpoint} 60

# Real-time facility metrics
XADD facility:{sessionId} * temp 68.2 power 84.1 cpu 72.3
XRANGE facility:{sessionId} - + COUNT 100
```

---

## 4. AI & Dynamic Content

### 4.1 AI-Generated Phishing Emails

This is the core training mechanic. The AI must generate phishing emails that are realistic, varied, pedagogically appropriate, and contextually relevant to the game world.

**Architecture:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Content Policy  │     │  Prompt Engine    │     │   LLM Provider  │
│  (guardrails)    │────►│  (template +      │────►│  (Claude API /  │
│                  │     │   context window)  │     │   self-hosted)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Output Parser   │
                                                 │  + Validator     │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Quality Score   │
                                                 │  + Difficulty    │
                                                 │  Classification  │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Email Pool      │
                                                 │  (Redis)         │
                                                 └─────────────────┘
```

**Prompt engineering for phishing emails:**

```typescript
interface PhishingEmailRequest {
  difficulty: 1 | 2 | 3 | 4 | 5;
  category:
    | 'legitimate'
    | 'spear_phish'
    | 'bec'
    | 'credential_harvest'
    | 'malware_delivery'
    | 'pretexting'
    | 'whaling';
  worldContext: {
    day: number;
    knownClients: string[];
    recentIncidents: string[];
    threatLevel: number;
  };
  pedagogicalFocus?: string[]; // e.g., ['urgency_cues', 'domain_spoofing']
}
```

**Structured output schema (enforced via LLM tool use / function calling):**

```typescript
interface GeneratedEmail {
  from: { name: string; address: string };
  to: { name: string; address: string };
  subject: string;
  body: string;
  headers: Record<string, string>; // Includes spoofed headers for analysis
  attachments?: { name: string; type: string; isMalicious: boolean }[];
  metadata: {
    isPhishing: boolean;
    difficulty: number;
    indicators: PhishingIndicator[]; // Ground truth for scoring
    category: string;
    educationalNotes: string[]; // Shown post-decision
  };
}

interface PhishingIndicator {
  type:
    | 'urgency'
    | 'domain_mismatch'
    | 'grammar'
    | 'spoofed_header'
    | 'suspicious_link'
    | 'attachment_risk'
    | 'impersonation'
    | 'emotional_manipulation'
    | 'too_good_to_be_true'
    | 'authority_claim';
  location: string; // Where in the email
  description: string; // Human-readable explanation
  severity: 'low' | 'medium' | 'high';
}
```

**LLM provider strategy:**

- **Primary:** Anthropic Claude API (Claude Sonnet for generation, Claude Haiku for classification/scoring)
- **Fallback:** Self-hosted open-source model (Mistral/Llama variant) for offline enterprise deployments
- **Pre-generation:** Batch generate during off-peak; maintain pool of 200+ emails across difficulty tiers
- **Cost control:** Cache-friendly prompts; avoid per-player generation for common scenarios; use template hydration for simple variations

**Safety guardrails:**

- Generated emails must not contain real company names, real people, or functional malicious payloads
- Output validation rejects emails containing real URLs, real phone numbers, or PII
- Content policy layer filters outputs before pool insertion
- All generated content is reviewed by automated quality checks and periodically by humans

### 4.2 Dynamic Threat Scenario Generation

Beyond individual emails, the AI generates multi-step attack scenarios:

```typescript
interface ThreatScenario {
  id: string;
  name: string;
  description: string;
  phases: ScenarioPhase[];
  difficulty: number;
  duration: number; // in game days
  triggerConditions: {
    minDay: number;
    minThreatLevel: number;
    requiredUpgrades?: string[];
    playerSkillRange?: [number, number];
  };
}

interface ScenarioPhase {
  day: number; // relative to scenario start
  events: GameEvent[]; // emails, attacks, intel briefs
  successCondition: string; // what the player must do
  failureConsequence: string;
}
```

**Generation approach:**

- Core scenarios are hand-authored by cybersecurity experts (30-50 scenarios)
- AI generates variations: different sender names, altered email text, shuffled indicators, new pretexts
- AI combines scenario building blocks into novel multi-phase attacks
- Each generated scenario is validated against a difficulty rubric before deployment

### 4.3 Adaptive Difficulty Engine

The game must feel challenging but not overwhelming. The difficulty engine adjusts in real-time:

```typescript
interface PlayerSkillProfile {
  phishingDetectionRate: number; // 0-1
  falsePositiveRate: number; // 0-1
  averageDecisionTime: number; // seconds
  indicatorIdentificationRate: Record<IndicatorType, number>;
  scenariosCompleted: number;
  currentStreak: number; // correct decisions in a row
  recentAccuracy: number[]; // last 20 decisions
}

function computeDifficulty(profile: PlayerSkillProfile): DifficultyParams {
  // Target: 70-80% success rate (flow state)
  const currentSuccessRate = mean(profile.recentAccuracy);

  if (currentSuccessRate > 0.85) {
    // Player is coasting: increase difficulty
    return {
      phishingRatio: increase(), // more phishing emails
      subtlety: increase(), // fewer obvious indicators
      newIndicatorTypes: introduce(), // introduce unseen attack patterns
      timePresure: increase(), // more emails per day
    };
  } else if (currentSuccessRate < 0.6) {
    // Player is struggling: decrease difficulty
    return {
      phishingRatio: decrease(),
      subtlety: decrease(),
      hints: enable(), // show tutorial hints
      timePresure: decrease(),
    };
  }
  // else: maintain current difficulty
}
```

**Difficulty dimensions:**

1. **Phishing subtlety:** Number and obviousness of indicators
2. **Volume:** Emails per game day
3. **Time pressure:** Urgency of decisions (client deadlines, active attacks)
4. **Complexity:** Multi-step vs. single-step attacks
5. **Novelty:** Introduction of unseen attack categories
6. **Stakes:** Facility capacity margin (less margin = higher consequence per mistake)

### 4.4 NPC Behavior Systems

NPCs in Archive Gate are not traditional game NPCs — they are email senders, clients, and adversaries. Their "behavior" manifests through communication patterns.

**Client NPC archetypes:**

```typescript
interface ClientProfile {
  id: string;
  name: string;
  organization: string;
  archetype:
    | 'university_researcher'
    | 'government_official'
    | 'startup_founder'
    | 'hospital_admin'
    | 'journalist'
    | 'military_contractor'
    | 'elderly_citizen'
    | 'competing_datacenter';
  communicationStyle: {
    formality: number; // 0 (casual) to 1 (very formal)
    urgency: number; // 0 (patient) to 1 (desperate)
    technicalLevel: number; // 0 (non-technical) to 1 (expert)
    emotionality: number; // 0 (stoic) to 1 (emotional)
  };
  trustScore: number; // internal, hidden from player
  backstory: string;
  dataAtRisk: string;
  isLegitimate: boolean;
}
```

**Adversary NPC behavior:**

- Adversaries adapt to player patterns (if player always checks headers, adversaries improve header spoofing)
- Adversaries share intelligence (if one attack vector fails, they try different vectors)
- Adversary sophistication scales with player progression and game day
- Named adversary groups with distinct TTPs (Tactics, Techniques, and Procedures) — inspired by real APT groups but fictionalized

### 4.5 Procedural Content Generation

Beyond AI-generated text, the game uses procedural generation for:

- **Organization names and domains:** Markov chain on real patterns + validation against existing entities
- **Document artifacts:** Generated verification packets, contracts, and intel briefs with procedurally varied details
- **Facility events:** Random but weighted events (power fluctuations, cooling failures, bandwidth spikes)
- **Financial parameters:** Client offer amounts, operational costs, ransom calculations

**Seed-based generation:** Each game session uses a deterministic seed so sessions can be replayed exactly. AI-generated content is fetched from pre-generated pools rather than generated on-the-fly, preserving determinism.

### 4.6 AI for Personalized Learning Paths

For enterprise deployments, the AI generates personalized training recommendations:

```typescript
interface LearningRecommendation {
  playerId: string;
  weakAreas: {
    category: string; // e.g., "Business Email Compromise"
    proficiency: number; // 0-1
    recommendedScenarios: string[];
    externalResources: string[];
  }[];
  suggestedNextSession: {
    focusArea: string;
    difficulty: number;
    estimatedDuration: number; // minutes
  };
  progressSummary: string; // Natural language summary for managers
}
```

The system analyzes the player's event history to identify specific weakness patterns (e.g., "fails to check email headers" or "susceptible to authority-based pretexting") and generates targeted scenarios that focus on those weaknesses.

---

## 5. Data Architecture

### 5.1 Player Progression Data Model

```sql
-- Core player identity
CREATE TABLE players (
    player_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(tenant_id),
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login      TIMESTAMPTZ,
    account_status  VARCHAR(20) NOT NULL DEFAULT 'active'
);

-- Game session (one per playthrough)
CREATE TABLE game_sessions (
    session_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id       UUID NOT NULL REFERENCES players(player_id),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    -- CHECK status IN ('active', 'completed', 'abandoned', 'breached')
    seed            BIGINT NOT NULL,
    difficulty_mode VARCHAR(20) NOT NULL DEFAULT 'adaptive',
    current_day     INT NOT NULL DEFAULT 1,
    current_funds   INT NOT NULL DEFAULT 0,
    snapshot        JSONB,              -- latest state snapshot
    snapshot_at     TIMESTAMPTZ,
    event_count     BIGINT NOT NULL DEFAULT 0
);

-- Player skill profile (computed, updated periodically)
CREATE TABLE player_profiles (
    player_id                   UUID PRIMARY KEY REFERENCES players(player_id),
    total_sessions              INT NOT NULL DEFAULT 0,
    total_days_played           INT NOT NULL DEFAULT 0,
    highest_day_reached         INT NOT NULL DEFAULT 0,
    highest_funds_reached       INT NOT NULL DEFAULT 0,
    phishing_detection_rate     REAL NOT NULL DEFAULT 0.5,
    false_positive_rate         REAL NOT NULL DEFAULT 0.5,
    avg_decision_time_seconds   REAL,
    favorite_upgrades           JSONB DEFAULT '[]',
    indicator_proficiency       JSONB DEFAULT '{}', -- type -> rate
    completed_scenarios         JSONB DEFAULT '[]',
    skill_rating                INT NOT NULL DEFAULT 1000, -- Elo-like
    last_computed               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements / badges
CREATE TABLE achievements (
    achievement_id  VARCHAR(64) PRIMARY KEY,
    name            VARCHAR(128) NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(32) NOT NULL,
    icon_url        VARCHAR(255),
    criteria        JSONB NOT NULL       -- machine-readable unlock condition
);

CREATE TABLE player_achievements (
    player_id       UUID NOT NULL REFERENCES players(player_id),
    achievement_id  VARCHAR(64) NOT NULL REFERENCES achievements(achievement_id),
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id      UUID REFERENCES game_sessions(session_id),
    PRIMARY KEY (player_id, achievement_id)
);
```

### 5.2 Analytics Event Schema

Analytics events are separate from game events. They track meta-information about player behavior for product analytics and learning outcomes.

```sql
CREATE TABLE analytics_events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id       UUID NOT NULL,
    tenant_id       UUID NOT NULL,
    session_id      UUID,
    event_name      VARCHAR(128) NOT NULL,
    event_properties JSONB NOT NULL DEFAULT '{}',
    device_info     JSONB,              -- browser, OS, screen size
    geo_info        JSONB,              -- country, region (from IP)
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by week; retained for 2 years
-- Bulk-inserted via async queue (not in game loop hot path)
```

**Key analytics events:**

| Event Name             | Properties                                   | Purpose                     |
| ---------------------- | -------------------------------------------- | --------------------------- |
| `session.started`      | `{difficulty, seed}`                         | Funnel analysis             |
| `session.ended`        | `{day, funds, reason}`                       | Retention, completion rates |
| `email.viewed`         | `{emailId, timeSpent}`                       | Engagement analysis         |
| `email.decided`        | `{emailId, decision, correct, timeToDecide}` | Core training metric        |
| `indicator.identified` | `{indicatorType, correct}`                   | Skill decomposition         |
| `upgrade.purchased`    | `{upgradeId, cost}`                          | Game economy analytics      |
| `breach.occurred`      | `{day, attackVector}`                        | Difficulty tuning           |
| `hint.requested`       | `{context}`                                  | Struggling player detection |
| `tutorial.completed`   | `{tutorialId, timeSpent}`                    | Onboarding analysis         |

### 5.3 Multi-Tenant Data Isolation

Enterprise clients each get an isolated tenant:

```sql
CREATE TABLE tenants (
    tenant_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(64) UNIQUE NOT NULL,
    plan            VARCHAR(32) NOT NULL DEFAULT 'free',
    -- CHECK plan IN ('free', 'pro', 'enterprise')
    settings        JSONB NOT NULL DEFAULT '{}',
    branding        JSONB,              -- custom logo, colors
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active          BOOLEAN NOT NULL DEFAULT true
);
```

**Isolation strategy: Row-Level Security (RLS) in PostgreSQL**

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON game_sessions
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation ON game_events
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Middleware sets tenant context on every request:**

```typescript
async function tenantMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new UnauthorizedError();
  await req.server.db.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
}
```

**Data residency:** For enterprise clients requiring data residency (EU-only, etc.), deploy tenant-specific database instances in the required region. The application layer routes by tenant to the correct database.

### 5.4 Time-Series Data for Metrics

**Player performance over time and facility simulation both produce time-series data.**

**Recommended store: TimescaleDB (PostgreSQL extension)**

This avoids introducing a separate database technology while providing time-series optimizations (automatic partitioning, compression, continuous aggregates).

```sql
-- Hypertable for facility metrics
CREATE TABLE facility_metrics (
    session_id      UUID NOT NULL,
    time            TIMESTAMPTZ NOT NULL,
    power_usage     REAL,
    cooling_temp    REAL,
    cpu_utilization REAL,
    bandwidth_usage REAL,
    rack_occupancy  REAL,
    threat_level    REAL
);

SELECT create_hypertable('facility_metrics', 'time');

-- Continuous aggregate for dashboard
CREATE MATERIALIZED VIEW facility_hourly
WITH (timescaledb.continuous) AS
SELECT session_id,
       time_bucket('1 hour', time) AS bucket,
       AVG(power_usage) AS avg_power,
       MAX(threat_level) AS max_threat,
       AVG(cpu_utilization) AS avg_cpu
FROM facility_metrics
GROUP BY session_id, bucket;
```

**Player skill time-series:**

```sql
CREATE TABLE skill_snapshots (
    player_id       UUID NOT NULL,
    time            TIMESTAMPTZ NOT NULL,
    phishing_rate   REAL,
    false_pos_rate  REAL,
    skill_rating    INT,
    sessions_total  INT
);

SELECT create_hypertable('skill_snapshots', 'time');
```

### 5.5 Content Management System

Game content (emails, documents, scenarios, upgrade definitions) is managed through a structured CMS layer, not a general-purpose CMS like WordPress.

**Content types:**

```typescript
// All content is versioned and tagged
interface ContentItem {
  id: string;
  type:
    | 'email_template'
    | 'scenario'
    | 'upgrade'
    | 'document_template'
    | 'achievement'
    | 'intel_brief'
    | 'tutorial';
  version: number;
  status: 'draft' | 'review' | 'published' | 'archived';
  tags: string[];
  difficulty?: number;
  content: Record<string, unknown>; // Type-specific payload
  createdBy: string;
  createdAt: Date;
  publishedAt?: Date;
  changelog: string;
}
```

**Storage:**

```sql
CREATE TABLE content_items (
    content_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type    VARCHAR(64) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    tags            TEXT[] NOT NULL DEFAULT '{}',
    difficulty      INT,
    payload         JSONB NOT NULL,
    created_by      UUID NOT NULL REFERENCES players(player_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,
    changelog       TEXT,
    UNIQUE(content_id, version)
);

-- Full-text search on content
CREATE INDEX idx_content_fts ON content_items
    USING GIN (to_tsvector('english', payload::text));
```

**Admin interface:** SvelteKit admin routes (`/admin/content`) with:

- Content editor with live preview
- Version comparison (diff view)
- Bulk publish/archive
- Import/export (JSON, CSV)
- Content validation (schema checks, difficulty scoring)

### 5.6 Versioning for Game Balance Changes

Game balance (economy values, difficulty curves, upgrade costs, threat parameters) changes frequently. These must be versioned, deployable without code changes, and rollbackable.

```typescript
interface BalanceConfig {
  version: string; // semver
  effectiveFrom: Date;
  description: string;
  economy: {
    startingFunds: number;
    baseClientPayment: [number, number]; // min, max
    storageLeaseCostPerDay: number;
    upgradeCosts: Record<string, number>;
    ransomDivisor: number; // currently 10
    ransomMinimum: number; // currently 1
  };
  difficulty: {
    basePhishingRatio: number;
    difficultyScalePerDay: number;
    maxEmailsPerDay: [number, number]; // by difficulty
    indicatorCountByDifficulty: Record<number, [number, number]>;
  };
  facility: {
    baseRackCapacity: number;
    basePowerBudget: number;
    coolingDegradationRate: number;
    upgradeCapacityGains: Record<string, number>;
  };
  threats: {
    baseAttackProbability: number;
    attackProbabilityPerClient: number;
    breachProbabilityReduction: Record<string, number>; // per upgrade
  };
}
```

**Delivery:** Balance configs are stored in the database and cached in Redis. Feature flags (see section 6) control which balance version is active. A/B testing different balance configs is supported natively.

```sql
CREATE TABLE balance_configs (
    config_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version         VARCHAR(20) NOT NULL UNIQUE,
    effective_from  TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,
    payload         JSONB NOT NULL,
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN NOT NULL DEFAULT false
);
```

---

## 6. DevOps & Infrastructure

### 6.1 CI/CD Pipeline

**Platform: GitHub Actions**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint # ESLint + Prettier check
      - run: npm run typecheck # tsc --noEmit

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run test:unit # Vitest
      - run: npm run test:integration
      - run: npm run test:e2e # Playwright

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: build/

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - run: ./scripts/deploy.sh staging

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production # requires manual approval
    steps:
      - uses: actions/download-artifact@v4
      - run: ./scripts/deploy.sh production
```

**Pipeline stages:**

```
Code Push ──► Lint ──► Type Check ──► Unit Tests ──► Integration Tests
                                                          │
                                                          ▼
                                                     E2E Tests
                                                          │
                                                          ▼
                                                     Build ──► Container Image
                                                          │
                                                          ▼
                                              Security Scan (Snyk/Trivy)
                                                          │
                                          ┌───────────────┼───────────────┐
                                          ▼               ▼               ▼
                                     Staging         Canary (10%)    Production
                                     (auto)          (auto)          (manual gate)
```

### 6.2 Infrastructure as Code

**Recommended: Pulumi with TypeScript**

Rationale: Same language as the application (TypeScript), full programming language expressiveness (loops, conditionals, functions), strong typing for infrastructure definitions. Terraform is also viable but requires learning HCL.

```typescript
// infrastructure/index.ts
import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';

const config = new pulumi.Config();
const env = pulumi.getStack(); // 'staging' | 'production'

// VPC
const vpc = new aws.ec2.Vpc('dmz-vpc', {
  cidrBlock: '10.0.0.0/16',
  enableDnsHostnames: true,
  tags: { Environment: env, Project: 'archive-gate' },
});

// EKS Cluster
const cluster = new aws.eks.Cluster('dmz-cluster', {
  vpcConfig: {
    subnetIds: privateSubnets.map((s) => s.id),
    securityGroupIds: [clusterSg.id],
  },
  version: '1.29',
});

// RDS PostgreSQL with TimescaleDB
const db = new aws.rds.Instance('dmz-db', {
  engine: 'postgres',
  engineVersion: '16',
  instanceClass: env === 'production' ? 'db.r6g.xlarge' : 'db.t4g.medium',
  allocatedStorage: 100,
  storageEncrypted: true,
  multiAz: env === 'production',
  dbName: 'archivedmz',
  username: 'dmz_admin',
  password: config.requireSecret('db-password'),
});

// ElastiCache Redis
const redis = new aws.elasticache.ReplicationGroup('dmz-redis', {
  description: 'DMZ game cache and queues',
  nodeType: env === 'production' ? 'cache.r6g.large' : 'cache.t4g.medium',
  numCacheClusters: env === 'production' ? 3 : 1,
  atRestEncryptionEnabled: true,
  transitEncryptionEnabled: true,
});
```

**Infrastructure components:**

| Component      | Service                         | Staging                  | Production                          |
| -------------- | ------------------------------- | ------------------------ | ----------------------------------- |
| Compute        | EKS (Kubernetes)                | 2 nodes, t3.large        | 4-8 nodes, m6i.xlarge, auto-scaling |
| Database       | RDS PostgreSQL 16 + TimescaleDB | Single AZ, db.t4g.medium | Multi-AZ, db.r6g.xlarge             |
| Cache          | ElastiCache Redis 7             | Single node              | 3-node replication group            |
| CDN            | CloudFront                      | Single distribution      | Multi-origin with failover          |
| Object Storage | S3                              | Single bucket            | Cross-region replication            |
| DNS            | Route 53                        | Subdomain                | Primary domain with health checks   |
| Secrets        | AWS Secrets Manager             | Shared                   | Per-environment                     |
| Monitoring     | CloudWatch + Grafana Cloud      | Basic                    | Full observability stack            |
| AI             | Claude API                      | Shared key               | Dedicated throughput                |

### 6.3 Container Orchestration

**Kubernetes deployment architecture:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dmz-api
  namespace: archive-gate
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: dmz-api
  template:
    metadata:
      labels:
        app: dmz-api
    spec:
      containers:
        - name: api
          image: ghcr.io/matrices-gmbh/archive-gate-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: dmz-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: dmz-secrets
                  key: redis-url
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dmz-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dmz-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Namespace isolation:**

```
archive-gate/           # Main application
archive-gate-workers/   # Background job workers (AI generation, analytics)
archive-gate-monitoring/ # Prometheus, Grafana
archive-gate-ingress/   # Nginx ingress controller
```

### 6.4 Monitoring and Observability

**Three Pillars of Observability:**

**1. Metrics (Prometheus + Grafana)**

```typescript
// Custom game metrics
import { Counter, Histogram, Gauge } from 'prom-client';

const emailDecisions = new Counter({
  name: 'dmz_email_decisions_total',
  help: 'Total email decisions made by players',
  labelNames: ['decision', 'correct', 'difficulty'],
});

const decisionLatency = new Histogram({
  name: 'dmz_decision_latency_seconds',
  help: 'Time taken for player to make email decision',
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

const activeSessions = new Gauge({
  name: 'dmz_active_sessions',
  help: 'Number of currently active game sessions',
});

const wsConnections = new Gauge({
  name: 'dmz_websocket_connections',
  help: 'Current WebSocket connection count',
});

const aiGenerationLatency = new Histogram({
  name: 'dmz_ai_generation_seconds',
  help: 'Time to generate AI content',
  labelNames: ['content_type'],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

const emailPoolSize = new Gauge({
  name: 'dmz_email_pool_size',
  help: 'Pre-generated email pool size',
  labelNames: ['difficulty'],
});
```

**Key dashboards:**

- **Game Health:** Active sessions, decisions/minute, error rate, WebSocket connections
- **AI Pipeline:** Generation latency, pool sizes, LLM API costs, fallback rate
- **Infrastructure:** CPU/memory, database connections, Redis memory, queue depths
- **Business:** DAU/MAU, session length, retention, completion rate
- **Training Efficacy:** Phishing detection rate over time, learning curve by cohort

**2. Logs (Structured JSON, shipped to Loki or CloudWatch)**

```typescript
// Structured logging with pino
const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      playerId: req.user?.playerId,
      tenantId: req.user?.tenantId,
    }),
  },
});

// Game event logging
logger.info(
  {
    event: 'email_decision',
    playerId: player.id,
    sessionId: session.id,
    emailId: email.id,
    decision: 'approve',
    correct: true,
    timeMs: 4200,
  },
  'Player made email decision',
);
```

**3. Traces (OpenTelemetry)**

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('archive-gate');

async function handleEmailDecision(req: Request) {
  const span = tracer.startSpan('email.decision', {
    attributes: {
      'game.session_id': req.sessionId,
      'game.email_id': req.emailId,
      'game.decision': req.decision,
    },
  });

  try {
    const result = await processDecision(req);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    throw err;
  } finally {
    span.end();
  }
}
```

**Alerting rules:**

| Alert                          | Condition                                            | Severity |
| ------------------------------ | ---------------------------------------------------- | -------- |
| High error rate                | 5xx rate > 1% for 5 min                              | Critical |
| Slow decisions                 | p99 API latency > 500ms for 10 min                   | Warning  |
| Email pool depleted            | Pool size < 5 for any difficulty tier                | Critical |
| Database connections exhausted | Active connections > 80% of max                      | Critical |
| WebSocket storm                | Connections spike > 200% in 1 min                    | Warning  |
| AI API failure                 | LLM API error rate > 10%                             | Critical |
| Breach rate anomaly            | Player breach rate > 80% (difficulty miscalibration) | Warning  |

### 6.5 Feature Flags for A/B Testing

**Recommended: OpenFeature-compliant SDK with a lightweight backend (Unleash or custom)**

```typescript
import { OpenFeature } from '@openfeature/server-sdk';

const client = OpenFeature.getClient();

// Check feature flag with context
const showNewThreatRadar = await client.getBooleanValue('new-threat-radar', false, {
  targetingKey: player.id,
  tenantId: player.tenantId,
  plan: tenant.plan,
  playerSkill: profile.skillRating,
});

// Numeric variant for A/B testing balance
const ransomDivisor = await client.getNumberValue(
  'ransom-divisor',
  10, // default from story.md
  { targetingKey: player.id },
);
```

**Feature flag categories:**

| Category               | Examples                                        | Rollout Strategy         |
| ---------------------- | ----------------------------------------------- | ------------------------ |
| **Kill switches**      | `ai-generation-enabled`, `websocket-enabled`    | 100% or 0%               |
| **Gradual rollouts**   | `new-email-viewer`, `threat-radar-v2`           | 5% -> 25% -> 50% -> 100% |
| **A/B tests**          | `ransom-divisor-variant`, `difficulty-curve-v2` | 50/50 split              |
| **Enterprise toggles** | `custom-branding`, `sso-enabled`, `data-export` | Per-tenant               |
| **Dev/debug**          | `show-phishing-indicators`, `skip-tutorial`     | Dev environment only     |

### 6.6 Blue-Green / Canary Deployments

**Strategy: Canary deployments via Kubernetes + Istio (or Argo Rollouts)**

```yaml
# argo-rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: dmz-api
spec:
  replicas: 6
  strategy:
    canary:
      steps:
        - setWeight: 10 # 10% traffic to canary
        - pause: { duration: 5m } # observe for 5 minutes
        - analysis: # automated analysis
            templates:
              - templateName: success-rate
              - templateName: latency-check
        - setWeight: 30
        - pause: { duration: 5m }
        - setWeight: 60
        - pause: { duration: 5m }
        - setWeight: 100 # full rollout
      canaryMetadata:
        labels:
          deployment: canary
      stableMetadata:
        labels:
          deployment: stable
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 60s
      successCondition: result[0] > 0.99
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{status=~"2.*",deployment="canary"}[2m]))
            /
            sum(rate(http_requests_total{deployment="canary"}[2m]))
```

**Deployment workflow:**

1. Code merged to `main`
2. CI builds container image, pushes to registry
3. Argo Rollouts creates canary pods (10% traffic)
4. Automated analysis checks error rates, latency, game metrics
5. If healthy, progressive traffic shift: 10% -> 30% -> 60% -> 100%
6. If unhealthy, automatic rollback to stable version
7. Zero-downtime guaranteed; WebSocket connections gracefully drained

**Database migrations:**

- Forward-only migrations (no destructive changes in production)
- Expand-contract pattern: add new column -> backfill -> update code -> drop old column
- Migrations run as a pre-deployment Kubernetes Job
- Rollbacks are handled by deploying a new forward migration, not reverting

---

## 7. Performance Requirements

### 7.1 Page Load Time Targets

| Metric                         | Target | Strategy                                 |
| ------------------------------ | ------ | ---------------------------------------- |
| First Contentful Paint (FCP)   | < 1.0s | SSR via SvelteKit, critical CSS inlined  |
| Largest Contentful Paint (LCP) | < 2.0s | Preload hero assets, optimize images     |
| Time to Interactive (TTI)      | < 3.0s | Code splitting, deferred non-critical JS |
| Cumulative Layout Shift (CLS)  | < 0.1  | Reserved dimensions for dynamic content  |
| First Input Delay (FID)        | < 50ms | Minimal main-thread work on load         |

**Strategies:**

- **SvelteKit SSR + streaming:** Server renders the game shell immediately; game state hydrates from cached snapshot
- **Code splitting by route:** Each game panel (inbox, facility, intel) is a separate chunk loaded on navigation
- **Asset fingerprinting:** Content-hashed filenames with 1-year cache headers
- **Font optimization:** System font stack for body text; single custom font (monospace) for terminal aesthetic, subset to Latin characters, preloaded via `<link rel="preload">`
- **Image optimization:** WebP/AVIF with `<picture>` fallback; SVG for icons and UI elements; spritesheet for PixiJS visualizations

**Bundle budget:**

| Chunk                  | Budget               | Contents                                 |
| ---------------------- | -------------------- | ---------------------------------------- |
| Framework runtime      | < 15 KB gzipped      | Svelte runtime                           |
| App shell              | < 50 KB gzipped      | Layout, navigation, auth                 |
| Inbox module           | < 40 KB gzipped      | Email viewer, list, decision UI          |
| Facility module        | < 60 KB gzipped      | PixiJS visualization, dashboard          |
| Intel module           | < 30 KB gzipped      | Intelligence briefs, D3 charts           |
| Shared utilities       | < 20 KB gzipped      | State management, API client, formatters |
| **Total initial load** | **< 100 KB gzipped** | Shell + first route                      |

### 7.2 Game Action Response Time

| Action                          | Target  | Architecture                                           |
| ------------------------------- | ------- | ------------------------------------------------------ |
| Email list load                 | < 100ms | Pre-fetched, cached in store                           |
| Email decision (approve/reject) | < 100ms | Optimistic UI update; server confirms async            |
| Phishing indicator selection    | < 50ms  | Pure client-side state                                 |
| Upgrade purchase                | < 150ms | Optimistic with server validation                      |
| Day advance                     | < 500ms | Server computes next day, streams events via WebSocket |
| Facility status poll            | < 50ms  | WebSocket push, no request needed                      |
| Save game                       | < 200ms | Background IndexedDB write + async server sync         |

**Optimistic updates pattern:**

```typescript
async function approveEmail(emailId: string) {
  // 1. Immediately update local state (< 1ms)
  const event: GameEvent = {
    type: 'EMAIL_APPROVED',
    payload: { emailId, clientId: email.clientId },
  };
  localEventLog.append(event); // Triggers derived store recomputation

  // 2. Send to server (fire and forget with retry)
  try {
    const confirmed = await api.submitEvent(event);
    // Server may reject (e.g., stale state) — reconcile
    if (!confirmed.accepted) {
      localEventLog.rollback(event);
      showConflictDialog(confirmed.reason);
    }
  } catch (err) {
    offlineQueue.enqueue(event);
  }
}
```

### 7.3 Concurrent User Support

**Scaling tiers:**

| Tier       | Users    | Infrastructure                                                       |
| ---------- | -------- | -------------------------------------------------------------------- |
| Launch     | 1K-10K   | 3 API pods, 1 worker pod, single RDS, single Redis                   |
| Growth     | 10K-50K  | 6-10 API pods, 3 worker pods, RDS read replicas, Redis cluster       |
| Scale      | 50K-100K | 15-20 API pods, 5+ worker pods, RDS multi-region, Redis cluster mode |
| Enterprise | 100K+    | Regional deployments, database sharding, dedicated tenant clusters   |

**Connection budget per API pod:**

| Resource              | Budget                    |
| --------------------- | ------------------------- |
| HTTP connections      | 1,000 concurrent          |
| WebSocket connections | 5,000 concurrent          |
| Database connections  | 20 (pooled via PgBouncer) |
| Redis connections     | 50                        |
| Memory                | 1 GB                      |
| CPU                   | 1 vCPU                    |

**WebSocket scaling:** Use Redis pub/sub to broadcast events across API pods. Each pod subscribes to channels for its connected sessions. Alternatively, use a dedicated WebSocket gateway (e.g., Centrifugo or Soketi) that handles connections at scale and publishes to the API via HTTP.

### 7.4 Global Latency Optimization

**Multi-region strategy (at scale):**

```
                    ┌──────────────────┐
                    │   Cloudflare     │
                    │   (Global CDN    │
                    │    + DDoS)       │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐    ┌────────┐    ┌────────┐
         │ EU-West│    │US-East │    │AP-South│
         │ (FRA)  │    │ (IAD)  │    │ (SIN)  │
         └────────┘    └────────┘    └────────┘
         API + DB       API + DB      API + DB
         (primary)     (read replica) (read replica)
```

**CDN strategy:**

- Static assets served from CDN edge (< 50ms globally)
- API requests routed to nearest region via GeoDNS or Cloudflare Workers
- WebSocket connections pinned to nearest region
- Database writes route to primary region; reads are regional

**Edge computing (future):** Use Cloudflare Workers or AWS Lambda@Edge for:

- Authentication token validation
- Feature flag evaluation
- Simple game state reads (from regional KV store)
- Rate limiting

### 7.5 Asset Optimization and Lazy Loading

**Lazy loading strategy:**

```typescript
// Route-level code splitting (SvelteKit handles automatically)
// src/routes/game/facility/+page.ts
export const load = async ({ fetch }) => {
  // Only loaded when player navigates to facility
  const [facilityData, metricsData] = await Promise.all([
    fetch('/api/facility'),
    fetch('/api/metrics/recent'),
  ]);
  return { facility: await facilityData.json(), metrics: await metricsData.json() };
};
```

```typescript
// Component-level lazy loading for heavy visualizations
// Only load PixiJS when the facility map is needed
const FacilityMap = lazy(() => import('$lib/components/facility/FacilityMap.svelte'));
```

**Asset pipeline:**

```
Source Assets
    │
    ├── Images: Sharp pipeline → WebP/AVIF + fallback PNG
    │   └── Responsive sizes: 1x, 2x, 3x
    │
    ├── Icons: SVG → SVGO optimization → inline or sprite
    │
    ├── Fonts: Subset → WOFF2 only (modern browsers)
    │
    ├── Audio: Opus/Vorbis + MP3 fallback
    │   └── Streaming for ambient; preload for alerts
    │
    └── Game data: JSON → compressed (gzip/brotli by CDN)
```

**Resource hints:**

```html
<!-- Preload critical assets -->
<link rel="preload" href="/fonts/mono-subset.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/api/game/state" as="fetch" crossorigin />

<!-- Prefetch likely next routes -->
<link rel="prefetch" href="/game/facility" />

<!-- DNS prefetch for AI API -->
<link rel="dns-prefetch" href="https://api.anthropic.com" />
```

---

## 8. Security Architecture

### Meta-Context

A cybersecurity training game must itself be exceptionally secure. A breach of the training platform would be devastating to credibility. This section defines defense-in-depth security measures.

### 8.1 OWASP Top 10 Mitigation

| OWASP Category                     | Risk in Archive Gate                                               | Mitigation                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **A01: Broken Access Control**     | Tenant data leakage; admin escalation                              | RLS in PostgreSQL, RBAC middleware, tenant ID in JWT, comprehensive access control tests                  |
| **A02: Cryptographic Failures**    | Player PII exposure; session hijacking                             | TLS 1.3 everywhere, AES-256 for data at rest, bcrypt/argon2 for passwords, no secrets in client bundles   |
| **A03: Injection**                 | SQL injection via game content; XSS via AI-generated email display | Parameterized queries (Drizzle ORM), CSP headers, DOMPurify for AI content rendering, no `innerHTML`      |
| **A04: Insecure Design**           | Game state manipulation; economy exploits                          | Server-authoritative state, event validation, rate limiting on game actions, anomaly detection            |
| **A05: Security Misconfiguration** | Default credentials; exposed debug endpoints                       | IaC enforces configurations, no default passwords, debug endpoints behind feature flags, security headers |
| **A06: Vulnerable Components**     | Supply chain attack via npm packages                               | Dependabot, `npm audit`, lockfile integrity, minimal dependency policy, Snyk in CI                        |
| **A07: Authentication Failures**   | Account takeover; session fixation                                 | OAuth 2.0 / OIDC (enterprise SSO), MFA support, secure session management, password complexity rules      |
| **A08: Data Integrity Failures**   | Tampered game state; modified client code                          | Event sourcing with server validation, SRI for CDN assets, signed API responses for critical state        |
| **A09: Logging Failures**          | Undetected breaches; missing audit trail                           | Structured logging, immutable audit log, alert on anomalous patterns, SIEM integration for enterprise     |
| **A10: SSRF**                      | AI pipeline fetching malicious URLs                                | AI-generated content never triggers server-side fetches, URL allowlisting, network segmentation           |

### 8.2 API Security

**Authentication flow:**

```
                    ┌──────────────┐
                    │   Client     │
                    │   (Browser)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Auth Guard   │ ◄── JWT verification
                    │  (Middleware) │     Token refresh (httpOnly cookie)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Rate Limiter │ ◄── Per-user, per-endpoint
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Input        │ ◄── Zod schema validation
                    │  Validation   │     Type coercion, sanitization
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Tenant       │ ◄── Set RLS context
                    │  Context      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Route        │ ◄── Business logic
                    │  Handler      │
                    └──────────────┘
```

**API security measures:**

```typescript
// JWT with short-lived access tokens
const accessTokenConfig = {
  algorithm: 'ES256', // ECDSA, not RSA (faster, smaller)
  expiresIn: '15m', // Short-lived
  issuer: 'archive-gate',
  audience: 'archive-gate-api',
};

// Refresh tokens in httpOnly, Secure, SameSite=Strict cookies
const refreshTokenConfig = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/api/auth/refresh', // Scoped to refresh endpoint only
};
```

**Input validation (every endpoint):**

```typescript
import { z } from 'zod';

const emailDecisionSchema = z.object({
  emailId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  indicators: z
    .array(
      z.object({
        type: z.enum(['urgency', 'domain_mismatch', 'grammar' /* ... */]),
        location: z.string().max(200),
      }),
    )
    .optional(),
  notes: z.string().max(1000).optional(),
});

// Applied via Fastify schema validation
app.post('/api/game/email/decide', {
  schema: { body: zodToJsonSchema(emailDecisionSchema) },
  preHandler: [authGuard, rateLimiter, tenantContext],
  handler: emailDecisionHandler,
});
```

### 8.3 Data Encryption

| Data State             | Method                                     | Key Management                                |
| ---------------------- | ------------------------------------------ | --------------------------------------------- |
| **In transit**         | TLS 1.3 (minimum TLS 1.2)                  | Managed certificates via ACM or Let's Encrypt |
| **At rest (database)** | AES-256 (RDS encryption)                   | AWS KMS managed keys                          |
| **At rest (Redis)**    | ElastiCache encryption                     | AWS KMS managed keys                          |
| **At rest (S3)**       | SSE-S3 or SSE-KMS                          | AWS KMS with key rotation                     |
| **Player PII**         | Application-level encryption (AES-256-GCM) | Customer-managed keys (enterprise)            |
| **Backups**            | Encrypted at rest                          | Same KMS keys as source                       |

**Application-level encryption for PII:**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class FieldEncryption {
  private algorithm = 'aes-256-gcm';

  encrypt(plaintext: string, key: Buffer): EncryptedField {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      version: 1,
    };
  }

  decrypt(field: EncryptedField, key: Buffer): string {
    const decipher = createDecipheriv(this.algorithm, key, Buffer.from(field.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(field.tag, 'base64'));
    return decipher.update(field.ciphertext, 'base64', 'utf8') + decipher.final('utf8');
  }
}
```

### 8.4 Rate Limiting and Abuse Prevention

**Multi-layer rate limiting:**

```typescript
// Layer 1: Global rate limit (Cloudflare / CDN level)
// 1000 requests/minute per IP

// Layer 2: API rate limit (application level)
const rateLimitConfig = {
  // Authentication endpoints
  '/api/auth/login': { window: '15m', max: 10 },
  '/api/auth/register': { window: '1h', max: 5 },
  '/api/auth/reset-password': { window: '1h', max: 3 },

  // Game action endpoints
  '/api/game/email/decide': { window: '1m', max: 30 },
  '/api/game/upgrade/purchase': { window: '1m', max: 10 },
  '/api/game/day/advance': { window: '1m', max: 5 },

  // AI generation (expensive)
  '/api/ai/generate': { window: '1m', max: 5, byUser: true },

  // Default
  '*': { window: '1m', max: 100 },
};

// Layer 3: Game-level anomaly detection
// Detect impossible action sequences (e.g., 100 decisions in 10 seconds)
// Detect score manipulation (impossible fund accumulation rates)
// Flag and quarantine suspicious sessions for review
```

**Implementation using sliding window with Redis:**

```typescript
async function slidingWindowRateLimit(
  key: string,
  window: number, // seconds
  max: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - window * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired
  pipeline.zadd(key, now, `${now}:${Math.random()}`); // Add current
  pipeline.zcard(key); // Count in window
  pipeline.expire(key, window);

  const results = await pipeline.exec();
  const count = results[2][1] as number;

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: windowStart + window * 1000,
  };
}
```

**Abuse prevention beyond rate limiting:**

- **Bot detection:** Challenge suspicious clients with CAPTCHA on authentication
- **Session fingerprinting:** Detect session sharing/token theft via device fingerprint changes
- **Game state validation:** Server rejects impossible state transitions
- **Economy exploit detection:** Flag sessions where fund growth exceeds statistical norms by > 3 sigma
- **IP reputation:** Integrate with threat intelligence feeds to block known-bad IPs

### 8.5 Security Headers and CSP

```typescript
// Fastify security headers plugin
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"], // CSP Level 3 with nonces
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Svelte scoped styles
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'wss://*.archivedmz.io', // WebSocket
        'https://api.anthropic.com', // AI API (if client-side)
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true, // nosniff
  xFrameOptions: { action: 'deny' },
  xXssProtection: false, // Deprecated; CSP is the modern protection
});
```

**Additional headers:**

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
X-Request-ID: {uuid}          // Correlation ID for tracing
Cache-Control: no-store        // For API responses with game state
```

### 8.6 Regular Penetration Testing

**Security testing cadence:**

| Test Type                          | Frequency        | Scope                                    |
| ---------------------------------- | ---------------- | ---------------------------------------- |
| Automated SAST (Semgrep, CodeQL)   | Every PR         | All source code                          |
| Automated DAST (OWASP ZAP)         | Weekly (CI)      | Staging environment                      |
| Dependency audit (npm audit, Snyk) | Every build      | All dependencies                         |
| Container scan (Trivy)             | Every build      | Docker images                            |
| Infrastructure scan (Checkov)      | Every IaC change | Pulumi/Terraform configs                 |
| Manual penetration test            | Quarterly        | Full application                         |
| Bug bounty program                 | Continuous       | Production (with rules of engagement)    |
| Red team exercise                  | Annually         | Full infrastructure + social engineering |

**Specific game-security concerns to test:**

- Can a player manipulate their game state to achieve impossible outcomes?
- Can a player access another player's session or another tenant's data?
- Can AI-generated content be poisoned via prompt injection in game inputs?
- Can WebSocket messages be replayed or forged?
- Does the AI content pipeline contain any SSRF vectors?
- Can rate limits be bypassed via distributed requests?
- Are game event logs tamper-proof for enterprise audit requirements?

---

## 9. Technology Stack Summary

### Core Stack

| Layer                  | Technology                           | Version        | Rationale                                          |
| ---------------------- | ------------------------------------ | -------------- | -------------------------------------------------- |
| **Frontend framework** | SvelteKit                            | 2.x (Svelte 5) | Compiled reactivity, smallest bundle, SSR built-in |
| **Language**           | TypeScript                           | 5.x            | Type safety across full stack                      |
| **Visualization**      | PixiJS                               | 8.x            | WebGL 2D rendering for facility map and effects    |
| **Charts**             | D3.js                                | 7.x            | Flexible data visualization for dashboards         |
| **Backend runtime**    | Node.js                              | 22 LTS         | Async I/O, shared language with frontend           |
| **HTTP framework**     | Fastify                              | 5.x            | Performance, schema validation, plugin system      |
| **ORM**                | Drizzle                              | Latest         | Type-safe SQL, excellent migration story           |
| **Database**           | PostgreSQL + TimescaleDB             | 16 + latest    | Relational + time-series in one engine             |
| **Cache/Queue**        | Redis                                | 7.x            | Caching, queues (BullMQ), pub/sub, rate limiting   |
| **AI**                 | Anthropic Claude API                 | Latest         | Phishing email generation, content scoring         |
| **Real-time**          | WebSocket (native) + SSE fallback    | -              | Server push for game events                        |
| **Testing**            | Vitest + Playwright                  | Latest         | Unit/integration + E2E                             |
| **CI/CD**              | GitHub Actions                       | -              | Integrated with repository                         |
| **IaC**                | Pulumi (TypeScript)                  | Latest         | Same language as application                       |
| **Container**          | Docker + Kubernetes                  | Latest         | Standardized deployment                            |
| **CDN**                | Cloudflare                           | -              | Global edge, DDoS protection, Workers              |
| **Monitoring**         | Prometheus + Grafana + OpenTelemetry | -              | Open-source observability stack                    |
| **Feature flags**      | Unleash (or OpenFeature-compatible)  | -              | A/B testing, gradual rollouts                      |

### Development Tools

| Tool                         | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| **Biome**                    | Fast linter + formatter (replacing ESLint + Prettier) |
| **Turborepo**                | Monorepo build orchestration (if monorepo)            |
| **Docker Compose**           | Local development environment                         |
| **Playwright**               | E2E testing, visual regression                        |
| **Storybook**                | Component development and documentation               |
| **pgAdmin / Drizzle Studio** | Database management                                   |

---

## 10. Risk Matrix

| Risk                                              | Probability | Impact   | Mitigation                                                                         |
| ------------------------------------------------- | ----------- | -------- | ---------------------------------------------------------------------------------- |
| AI-generated content quality is inconsistent      | High        | Medium   | Pre-generation pool + human review pipeline + quality scoring                      |
| LLM API cost exceeds budget                       | Medium      | High     | Aggressive caching, pre-generation batching, cost caps, fallback to templates      |
| WebSocket scaling hits limits                     | Medium      | Medium   | Dedicated WS gateway (Centrifugo), Redis pub/sub for cross-pod                     |
| Player state desync (client vs. server)           | Medium      | High     | Server-authoritative state, conflict resolution protocol, periodic full-state sync |
| AI prompt injection via player inputs             | Medium      | Medium   | Input sanitization, output validation, sandboxed AI context                        |
| Supply chain vulnerability in npm dependencies    | Medium      | High     | Minimal dependencies, lockfile integrity, automated scanning                       |
| Database performance degradation at scale         | Low         | Critical | Read replicas, connection pooling, query optimization, partitioning                |
| Multi-tenant data leakage                         | Low         | Critical | RLS, automated isolation tests, penetration testing                                |
| CDN cache poisoning                               | Low         | High     | Cache key validation, origin shielding, signed URLs for sensitive content          |
| Game economy exploits                             | High        | Low      | Server validation, anomaly detection, balance config hot-patching                  |
| Browser compatibility issues                      | Medium      | Medium   | Progressive enhancement, feature detection, automated cross-browser testing        |
| Developer productivity loss from over-engineering | Medium      | Medium   | Start simple (modular monolith), extract complexity only when measured need arises |

---

## 11. Appendices

### Appendix A: Repository Structure (Proposed)

```
the-dmz/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml
│   └── CODEOWNERS
├── apps/
│   └── web/                     # SvelteKit application
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/  # Svelte components
│       │   │   ├── stores/      # State management
│       │   │   ├── engine/      # Game engine core
│       │   │   ├── ai/          # AI integration client
│       │   │   └── utils/       # Shared utilities
│       │   ├── routes/          # SvelteKit routes
│       │   ├── hooks.server.ts  # Server hooks (auth, tenant)
│       │   └── app.html         # HTML shell
│       ├── static/              # Static assets
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── svelte.config.js
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   ├── shared-types/            # TypeScript interfaces shared across apps
│   ├── game-logic/              # Pure game logic (testable without framework)
│   ├── content-schemas/         # Zod schemas for content validation
│   └── ai-prompts/              # LLM prompt templates and validators
├── infrastructure/
│   ├── pulumi/                  # Infrastructure as Code
│   ├── k8s/                     # Kubernetes manifests
│   └── docker/
│       ├── Dockerfile.web
│       └── docker-compose.yml
├── scripts/
│   ├── deploy.sh
│   ├── seed-db.ts
│   └── generate-content.ts
├── logs/
│   └── BRD/                     # Business requirements documents
├── story.md                     # Game narrative source of truth
├── turbo.json                   # Monorepo config
├── package.json                 # Root package.json
└── tsconfig.json                # Root TypeScript config
```

### Appendix B: Local Development Setup

```bash
# Prerequisites: Node.js 22, Docker, pnpm

# Clone and install
git clone <repo-url>
cd the-dmz
pnpm install

# Start infrastructure (Postgres, Redis, TimescaleDB)
docker compose up -d

# Run database migrations
pnpm run db:migrate

# Seed development data (sample emails, scenarios, balance config)
pnpm run db:seed

# Start development server
pnpm run dev

# Run tests
pnpm run test          # Unit tests (Vitest)
pnpm run test:e2e      # E2E tests (Playwright)
pnpm run test:all      # Everything

# Type check
pnpm run typecheck
```

### Appendix C: API Endpoint Map (Core)

| Method | Endpoint                     | Description                               |
| ------ | ---------------------------- | ----------------------------------------- |
| POST   | `/api/auth/login`            | Authenticate player                       |
| POST   | `/api/auth/register`         | Create account                            |
| POST   | `/api/auth/refresh`          | Refresh access token                      |
| GET    | `/api/game/session`          | Get current session state                 |
| POST   | `/api/game/session/new`      | Start new game session                    |
| GET    | `/api/game/inbox`            | Get current day's emails                  |
| GET    | `/api/game/email/:id`        | Get email detail                          |
| POST   | `/api/game/email/:id/decide` | Submit email decision                     |
| POST   | `/api/game/day/advance`      | Advance to next day                       |
| GET    | `/api/game/facility`         | Get facility status                       |
| POST   | `/api/game/upgrade/purchase` | Purchase upgrade                          |
| GET    | `/api/game/upgrades`         | List available upgrades                   |
| GET    | `/api/game/intel`            | Get intelligence briefs                   |
| POST   | `/api/game/ransom/pay`       | Pay ransom (after breach)                 |
| GET    | `/api/player/profile`        | Get player skill profile                  |
| GET    | `/api/player/achievements`   | Get player achievements                   |
| GET    | `/api/leaderboard`           | Get leaderboard                           |
| WS     | `/ws`                        | WebSocket connection for real-time events |
| GET    | `/api/admin/sessions`        | Admin: list active sessions               |
| GET    | `/api/admin/analytics`       | Admin: analytics dashboard data           |
| POST   | `/api/admin/content`         | Admin: create/update content              |
| GET    | `/api/health`                | Health check                              |
| GET    | `/api/ready`                 | Readiness check                           |

### Appendix D: Game Event Type Catalog

```typescript
// Complete event type union for the event sourcing system
type GameEvent =
  // Session lifecycle
  | { type: 'SESSION_STARTED'; payload: { seed: number; difficulty: string } }
  | { type: 'SESSION_ENDED'; payload: { reason: 'completed' | 'abandoned' | 'breached' } }

  // Email triage
  | {
      type: 'EMAIL_RECEIVED';
      payload: { emailId: string; isPhishing: boolean; difficulty: number };
    }
  | { type: 'EMAIL_VIEWED'; payload: { emailId: string; timestamp: number } }
  | { type: 'EMAIL_APPROVED'; payload: { emailId: string; clientId: string } }
  | { type: 'EMAIL_REJECTED'; payload: { emailId: string; reason: string } }
  | { type: 'PHISHING_IDENTIFIED'; payload: { emailId: string; indicators: string[] } }
  | { type: 'PHISHING_MISSED'; payload: { emailId: string; indicators: string[] } }
  | { type: 'LEGITIMATE_REJECTED'; payload: { emailId: string } } // false positive

  // Facility management
  | { type: 'CLIENT_ONBOARDED'; payload: { clientId: string; payment: number; duration: number } }
  | { type: 'CLIENT_LEASE_EXPIRED'; payload: { clientId: string } }
  | { type: 'UPGRADE_PURCHASED'; payload: { upgradeId: string; cost: number } }
  | { type: 'UPGRADE_COMPLETED'; payload: { upgradeId: string } }
  | { type: 'FACILITY_METRICS_UPDATED'; payload: FacilityMetrics }

  // Threats and breaches
  | { type: 'ATTACK_INITIATED'; payload: { attackId: string; vector: string; severity: number } }
  | { type: 'ATTACK_MITIGATED'; payload: { attackId: string; upgradeId?: string } }
  | { type: 'ATTACK_SUCCEEDED'; payload: { attackId: string } }
  | { type: 'BREACH_OCCURRED'; payload: { attackId: string; ransomAmount: number } }
  | { type: 'RANSOM_PAID'; payload: { amount: number } }
  | { type: 'RANSOM_DEFAULTED'; payload: {} } // game over

  // Day progression
  | { type: 'DAY_STARTED'; payload: { day: number; threatLevel: number } }
  | { type: 'DAY_ENDED'; payload: { day: number; funds: number; clientCount: number } }

  // Meta
  | { type: 'DIFFICULTY_ADJUSTED'; payload: { from: number; to: number; reason: string } }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: { achievementId: string } }
  | { type: 'HINT_REQUESTED'; payload: { context: string } };
```

---

**Document Status:** Draft
**Next Review:** Upon commencement of implementation sprint
**Owner:** Architecture Team
**Stakeholders:** Engineering, Product, Security, DevOps
