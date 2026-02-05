# Backend Architecture & API Design Specification

**Document ID:** DD-009
**Version:** 1.0
**Date:** 2026-02-05
**Classification:** Internal -- Engineering
**Parent:** BRD-DMZ-2026-001, BRD-014 (Technical Architecture Report)

---

## Table of Contents

1. [Modular Monolith Architecture](#1-modular-monolith-architecture)
2. [Fastify Application Structure](#2-fastify-application-structure)
3. [API Design -- RESTful + GraphQL](#3-api-design----restful--graphql)
4. [WebSocket Protocol](#4-websocket-protocol)
5. [Authentication & Authorization Backend](#5-authentication--authorization-backend)
6. [Async Job Processing -- BullMQ Architecture](#6-async-job-processing----bullmq-architecture)
7. [Caching Strategy](#7-caching-strategy)
8. [Service Extraction Strategy](#8-service-extraction-strategy)
9. [Webhook System](#9-webhook-system)
10. [Rate Limiting and Security](#10-rate-limiting-and-security)

---

### Backend Performance Targets (BRD 7.1)

All backend components must meet the following performance targets from the BRD:

| Metric | Target |
|--------|--------|
| API response time | < 200ms (P95) |
| Game state update latency | < 100ms (P95) |
| WebSocket message delivery | < 50ms (P95) |
| Admin dashboard load time | < 2 seconds (P95) |
| AI email generation | < 10 seconds (pre-generated pool eliminates player-perceived latency) |
| SCIM sync latency | < 60 seconds (FR-ENT-010) |
| ABAC policy evaluation | < 10ms (P99) (FR-ENT-015) |

---

## 1. Modular Monolith Architecture

### 1.1 Architectural Philosophy

The DMZ: Archive Gate backend starts as a **modular monolith** -- a single deployable unit with rigorously enforced internal module boundaries. This avoids premature microservice decomposition (the leading cause of death in early-stage game backends) while preserving the ability to extract modules into independent services when scale demands it.

The monolith is organized around **domain modules**, each owning its own database tables, exposing a narrow public interface, and communicating with siblings through either direct function calls (synchronous, within the same process) or an in-process message bus (asynchronous, for eventual consistency patterns).

**Multi-Tenancy Isolation Model (BRD FR-ENT-001):** The backend supports a hybrid isolation model tiered by customer segment:
- **SMB (1-500 users):** Shared database with schema-level isolation (each tenant gets its own PostgreSQL schema within a shared database instance). All tables include non-nullable `tenant_id` with row-level security enforced at the database level (FR-ENT-002).
- **Mid-Market (500-5K users):** Dedicated PostgreSQL schema per tenant, providing stronger isolation without infrastructure overhead.
- **Enterprise (5K+ users):** Dedicated database instance per tenant for full data isolation and independent scaling.

All modules must be isolation-tier-agnostic: the `tenant-context` middleware resolves the appropriate connection pool/schema based on the tenant's configured isolation tier. Cross-tenant queries are impossible from the application layer (BRD FR-ENT-003).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Fastify Application                          │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │   auth   │ │  game-   │ │ content  │ │   ai-    │ │ facility │ │
│  │          │ │  engine  │ │          │ │ pipeline │ │          │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │             │            │             │            │       │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ │
│  │ threat-  │ │analytics │ │ billing  │ │  admin   │ │notifica- │ │
│  │ engine   │ │          │ │          │ │          │ │  tion    │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │             │            │             │            │       │
│  ─────┴─────────────┴────────────┴─────────────┴────────────┴───── │
│                        In-Process Event Bus                         │
│  ──────────────────────────────────────────────────────────────────│
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Shared Infrastructure                      │  │
│  │  PostgreSQL (Drizzle ORM) │ Redis │ BullMQ │ Pino Logger     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Module Directory Structure

Every module follows an identical internal layout. This uniformity enables tooling, code generation, and onboarding:

```
src/
  modules/
    {module-name}/
      index.ts                 # Public interface (barrel export)
      {module-name}.plugin.ts  # Fastify plugin registration
      {module-name}.routes.ts  # Route definitions
      {module-name}.service.ts # Business logic (stateless)
      {module-name}.repo.ts    # Data access layer
      {module-name}.schema.ts  # Zod schemas (request/response)
      {module-name}.events.ts  # Event definitions (published/consumed)
      {module-name}.types.ts   # Module-specific TypeScript types
      {module-name}.errors.ts  # Module-specific error classes
      __tests__/
        {module-name}.service.test.ts
        {module-name}.routes.test.ts
        {module-name}.integration.test.ts
  shared/
    events/
      event-bus.ts             # In-process event bus implementation
      event-types.ts           # Global event type registry
    middleware/
      auth-guard.ts            # JWT verification hook
      tenant-context.ts        # RLS tenant isolation
      rate-limiter.ts          # Rate limiting hook
      request-logger.ts        # Structured logging hook
      error-handler.ts         # Global error handler
    database/
      connection.ts            # PostgreSQL connection pool (Drizzle)
      redis.ts                 # Redis client singleton
      migrations/              # Drizzle migration files
    types/
      fastify.d.ts             # Fastify type augmentations
      common.ts                # Shared types (Pagination, ApiResponse, etc.)
    utils/
      crypto.ts                # Encryption helpers
      date.ts                  # Date formatting
      id.ts                    # UUIDv7 generator
```

### 1.3 Module Enforcement Rules

To prevent the monolith from degrading into a distributed monolith or a ball of mud:

1. **No cross-module imports of internal files.** Modules may only import from another module's `index.ts` barrel export.
2. **No shared database tables.** Each module owns its tables. Cross-module data access uses the owning module's public service interface.
3. **No circular dependencies.** The dependency graph is a DAG. Enforced via ESLint `import/no-cycle` and a custom architecture test.
4. **Async communication for side effects.** If Module A's action triggers a side effect in Module B, it publishes an event. Module B subscribes. This decouples the modules and is the foundation for later service extraction.

```typescript
// shared/events/event-bus.ts
import { EventEmitter } from 'node:events';

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  metadata: {
    eventId: string;
    timestamp: Date;
    correlationId: string;
    tenantId?: string;
    userId?: string;
    source: string;
  };
}

type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export class EventBus {
  private emitter = new EventEmitter();
  private handlers = new Map<string, Set<EventHandler>>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const typedHandler = handler as EventHandler;
    this.handlers.get(eventType)!.add(typedHandler);
    this.emitter.on(eventType, typedHandler);

    return () => {
      this.handlers.get(eventType)?.delete(typedHandler);
      this.emitter.off(eventType, typedHandler);
    };
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();

    const allHandlers = [...handlers, ...wildcardHandlers];
    const results = await Promise.allSettled(
      allHandlers.map((h) => h(event as DomainEvent))
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        // Log but do not throw -- event handlers must not break the publisher
        logger.error(
          { err: result.reason, eventType: event.type },
          'Event handler failed'
        );
      }
    }
  }

  // For testing: remove all handlers
  reset(): void {
    this.emitter.removeAllListeners();
    this.handlers.clear();
  }
}
```

### 1.4 Module Specifications

---

#### 1.4.1 `auth` -- Authentication & Session Management

**Responsibility:** User authentication, session lifecycle, JWT issuance/validation, SSO federation (SAML 2.0, OIDC), SCIM provisioning, password management.

**Built-In Roles (BRD FR-ENT-011):** Super Admin, Tenant Admin, Manager, Trainer, Learner. Custom roles with granular permission composition are also supported (FR-ENT-012).

**Performance Target (BRD FR-ENT-015):** ABAC policy evaluation must complete under 10ms (P99).

**Public Interface:**

```typescript
// modules/auth/index.ts
export interface AuthModule {
  // Authentication
  authenticateLocal(email: string, password: string): Promise<AuthResult>;
  authenticateSSO(provider: SSOProvider, assertion: string): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  logout(sessionId: string): Promise<void>;

  // Session management
  getSession(sessionId: string): Promise<Session | null>;
  invalidateAllSessions(userId: string): Promise<void>;

  // User management (used by SCIM and admin)
  createUser(data: CreateUserInput): Promise<User>;
  updateUser(userId: string, data: UpdateUserInput): Promise<User>;
  deactivateUser(userId: string): Promise<void>;
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;

  // RBAC
  evaluatePermission(userId: string, resource: string, action: string): Promise<boolean>;
  getUserRoles(userId: string): Promise<Role[]>;
  assignRole(userId: string, roleId: string, scope?: RoleScope, expiresAt?: Date): Promise<void>;

  // OAuth 2.0 client credentials (service-to-service)
  createOAuthClient(tenantId: string, name: string, scopes: string[]): Promise<OAuthClient>;
  rotateOAuthClientSecret(clientId: string): Promise<OAuthClientSecret>;
  revokeOAuthClient(clientId: string): Promise<void>;
  issueClientCredentialsToken(
    clientId: string,
    clientSecret: string,
    scopes?: string[]
  ): Promise<AccessToken>;
}
```

**Service-to-service authentication:** OAuth 2.0 client-credentials is the only supported mechanism for external integrations. API keys are not used for S2S access.

**Internal Structure:**
- `auth.service.ts` -- Core authentication logic, password hashing (argon2), token generation
- `auth.sso.ts` -- SAML 2.0 SP implementation (SP- and IdP-initiated, encrypted assertions), OIDC client (Authorization Code + PKCE), IdP metadata parsing, back-channel logout (BRD 10.3)
- `auth.scim.ts` -- SCIM 2.0 server endpoints (RFC 7643/7644); sync latency must be under 60 seconds (BRD FR-ENT-010)
- `auth.rbac.ts` -- RBAC + ABAC evaluation engine with Redis-cached policy lookup
- `auth.repo.ts` -- User, session, role, permission data access

**Dependencies on Other Modules:** None (leaf module; other modules depend on auth).

**Database Tables Owned:**

```sql
-- users: Core identity table
CREATE TABLE auth.users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    email           VARCHAR(255) NOT NULL,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    password_hash   VARCHAR(255),  -- NULL for SSO-only users
    display_name    VARCHAR(128) NOT NULL,
    avatar_url      VARCHAR(512),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
        -- CHECK status IN ('active','suspended','deactivated','pending')
    mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
    mfa_secret      VARCHAR(255),  -- Encrypted TOTP secret
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, email)
);

-- sessions: Active sessions (Redis-backed for hot path, PG for audit)
CREATE TABLE auth.sessions (
    session_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(user_id),
    tenant_id       UUID NOT NULL,
    refresh_token   VARCHAR(512) NOT NULL UNIQUE,
    device_info     JSONB,
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);

-- roles: RBAC role definitions
CREATE TABLE auth.roles (
    role_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID,  -- NULL = system-wide role
    name            VARCHAR(64) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

-- permissions: Granular permission catalog
CREATE TABLE auth.permissions (
    permission_id   VARCHAR(128) PRIMARY KEY,  -- e.g. 'game:session:create'
    description     TEXT NOT NULL,
    resource        VARCHAR(64) NOT NULL,
    action          VARCHAR(32) NOT NULL
);

-- role_permissions: Many-to-many join
CREATE TABLE auth.role_permissions (
    role_id         UUID NOT NULL REFERENCES auth.roles(role_id),
    permission_id   VARCHAR(128) NOT NULL REFERENCES auth.permissions(permission_id),
    PRIMARY KEY (role_id, permission_id)
);

-- user_roles: Role assignments with optional scope and expiry
CREATE TABLE auth.user_roles (
    user_id         UUID NOT NULL REFERENCES auth.users(user_id),
    role_id         UUID NOT NULL REFERENCES auth.roles(role_id),
    scope_type      VARCHAR(32),   -- 'department','team','location'
    scope_value     VARCHAR(128),  -- The specific scope identifier
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    granted_by      UUID REFERENCES auth.users(user_id),
    PRIMARY KEY (user_id, role_id, COALESCE(scope_type,''), COALESCE(scope_value,''))
);

-- sso_connections: IdP configurations per tenant
CREATE TABLE auth.sso_connections (
    connection_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    provider_type   VARCHAR(16) NOT NULL,  -- 'saml', 'oidc'
    name            VARCHAR(128) NOT NULL,
    config          JSONB NOT NULL,        -- IdP metadata, endpoints, certs
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- oauth_clients: Service-to-service authentication (OAuth 2.0 client-credentials per BRD 10.6)
CREATE TABLE auth.oauth_clients (
    client_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id),
    name            VARCHAR(128) NOT NULL,
    secret_hash     VARCHAR(255) NOT NULL,  -- argon2 hash of client secret
    scopes          TEXT[] NOT NULL DEFAULT '{}',
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);
```

**Events Published:**
- `auth.user.created` -- New user registered or provisioned via SCIM
- `auth.user.updated` -- User profile changed
- `auth.user.deactivated` -- User deactivated
- `auth.session.created` -- New login session
- `auth.session.revoked` -- Logout or forced session termination
- `auth.login.failed` -- Failed login attempt (consumed by threat-engine for anomaly detection)

---

#### 1.4.2 `game-engine` -- Core Game Logic

**Responsibility:** Game state machine, event processing, game session lifecycle, day advancement, decision processing, game save/load, event sourcing.

**Public Interface:**

```typescript
// modules/game-engine/index.ts
export interface GameEngineModule {
  // Session lifecycle
  startSession(userId: string, options: SessionOptions): Promise<GameSession>;
  loadSession(sessionId: string): Promise<GameSession>;
  saveSession(sessionId: string): Promise<void>;
  endSession(sessionId: string, reason: EndReason): Promise<void>;

  // Game actions
  processAction(sessionId: string, action: GameAction): Promise<ActionResult>;
  advanceDay(sessionId: string): Promise<DayAdvanceResult>;

  // State queries
  getState(sessionId: string): Promise<GameState>;
  getStateSnapshot(sessionId: string): Promise<GameStateSnapshot>;
  getEventHistory(sessionId: string, filter?: EventFilter): Promise<GameEvent[]>;

  // Replay (enterprise: trainer review)
  replaySession(sessionId: string, upToSequence?: number): Promise<GameState>;
}
```

**Internal Structure:**
- `game-engine.service.ts` -- Orchestrates game actions, validates transitions
- `game-engine.state-machine.ts` -- State machine definitions (DAY_START, EMAIL_TRIAGE, ATTACKS, BREACH_CHECK, UPGRADE, DAY_END)
- `game-engine.reducer.ts` -- Pure function: `(state, event) => state` for event sourcing
- `game-engine.validator.ts` -- Validates actions against current state
- `game-engine.repo.ts` -- Event log persistence, snapshot management (snapshots materialized every 50 events or at day boundaries per BRD 8.5)

**Dependencies:**
- `auth` -- User identity for session creation
- `content` -- Fetch email content for the current day
- `facility` -- Resource calculations for client onboarding
- `threat-engine` -- Attack generation during day advancement
- `ai-pipeline` -- Dynamic difficulty parameters
- `analytics` -- Publish game events for analytics processing

**Database Tables Owned:**

```sql
-- game_sessions: One per playthrough
CREATE TABLE game.sessions (
    session_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(user_id),
    tenant_id       UUID NOT NULL,
    seed            BIGINT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
        -- CHECK status IN ('active','paused','completed','breached','abandoned')
    difficulty_mode VARCHAR(20) NOT NULL DEFAULT 'adaptive',
    current_day     INT NOT NULL DEFAULT 1,
    current_phase   VARCHAR(32) NOT NULL DEFAULT 'DAY_START',
    current_funds   BIGINT NOT NULL DEFAULT 0,
    trust_score     INT NOT NULL DEFAULT 100,
    threat_level    INT NOT NULL DEFAULT 0,
    snapshot        JSONB,
    snapshot_seq    BIGINT NOT NULL DEFAULT 0,
    event_count     BIGINT NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_played_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ
);

-- game_events: Immutable event log (append-only, partitioned)
CREATE TABLE game.events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    user_id         UUID NOT NULL,
    tenant_id       UUID NOT NULL,
    event_type      VARCHAR(64) NOT NULL,
    event_data      JSONB NOT NULL,
    event_version   INT NOT NULL DEFAULT 1,
    sequence_num    BIGINT NOT NULL,
    server_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
    client_time     TIMESTAMPTZ,
    UNIQUE(session_id, sequence_num)
) PARTITION BY RANGE (server_time);

-- Create monthly partitions
CREATE TABLE game.events_2026_01 PARTITION OF game.events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE game.events_2026_02 PARTITION OF game.events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes
CREATE INDEX idx_game_events_session_seq ON game.events(session_id, sequence_num);
CREATE INDEX idx_game_events_user_time ON game.events(user_id, server_time);
CREATE INDEX idx_game_events_type ON game.events(event_type, server_time);
```

**Events Published:**
- `game.session.started` -- New session created
- `game.session.ended` -- Session completed or abandoned
- `game.action.processed` -- Any game action (for analytics)
- `game.day.advanced` -- Day transition complete
- `game.breach.occurred` -- Security breach in game
- `game.achievement.unlocked` -- Achievement triggered

---

#### 1.4.3 `content` -- Email Templates & Document Generation

**Responsibility:** Managing the content library (handcrafted + AI-generated emails, documents, scenarios), content versioning, localization, content delivery to the game engine.

**Public Interface:**

```typescript
// modules/content/index.ts
export interface ContentModule {
  // Email content
  getEmailsForDay(params: DayContentParams): Promise<GameEmail[]>;
  getEmailById(emailId: string): Promise<GameEmail | null>;
  getEmailPool(difficulty: number, count: number): Promise<GameEmail[]>;

  // Document templates
  getDocument(type: DocumentType, context: DocumentContext): Promise<GameDocument>;
  generateVerificationPacket(clientId: string): Promise<VerificationPacket>;

  // Scenario library
  getScenario(scenarioId: string): Promise<ThreatScenario | null>;
  getAvailableScenarios(filter: ScenarioFilter): Promise<ThreatScenario[]>;

  // Content management (admin)
  createContent(item: CreateContentInput): Promise<ContentItem>;
  updateContent(itemId: string, data: UpdateContentInput): Promise<ContentItem>;
  publishContent(itemId: string): Promise<ContentItem>;
  archiveContent(itemId: string): Promise<void>;

  // Localization
  getLocalizedContent(itemId: string, locale: string): Promise<ContentItem>;

  // LMS export (BRD 10.2, FR-ENT-035 through FR-ENT-041)
  exportSCORM12(contentId: string): Promise<Buffer>;
  exportSCORM2004(contentId: string): Promise<Buffer>;
  emitXAPIStatement(userId: string, verb: string, object: XAPIObject): Promise<void>;
  exportCmi5Package(contentId: string): Promise<Buffer>;
  exportAICCPackage(contentId: string): Promise<Buffer>;

  // Built-in LRS for organizations without their own (FR-ENT-038)
  queryLRS(tenantId: string, query: LRSQuery): Promise<XAPIStatement[]>;
  storeLRSStatement(tenantId: string, statement: XAPIStatement): Promise<void>;

  // LTI 1.3 with LTI Advantage (FR-ENT-039)
  // Deep Linking, Assignment & Grade Services, Names & Role Provisioning Services
  handleLTILaunch(params: LTILaunchParams): Promise<LTILaunchResult>;
  registerLTIPlatform(tenantId: string, config: LTIPlatformConfig): Promise<LTIPlatform>;
  syncLTIGrades(tenantId: string, contextId: string): Promise<GradeSyncResult>;
  getLTIRoster(tenantId: string, contextId: string): Promise<LTIRosterEntry[]>;
}
```

**Dependencies:**
- `ai-pipeline` -- Request AI-generated emails when pool is low
- `auth` -- Permission checks for content management

**Database Tables Owned:**

```sql
CREATE TABLE content.items (
    content_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    content_type    VARCHAR(64) NOT NULL,
        -- 'email_template','scenario','document_template','upgrade_def',
        -- 'achievement_def','intel_brief','tutorial'
    version         INT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    difficulty      INT,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    payload         JSONB NOT NULL,
    locale          VARCHAR(10) NOT NULL DEFAULT 'en',
    created_by      UUID NOT NULL,
    reviewed_by     UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    changelog       TEXT
);

CREATE TABLE content.localized (
    content_id      UUID NOT NULL REFERENCES content.items(content_id),
    tenant_id       UUID NOT NULL,
    locale          VARCHAR(10) NOT NULL,
    payload         JSONB NOT NULL,
    translator      UUID,
    reviewed        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (content_id, locale)
);

-- Full-text search index
CREATE INDEX idx_content_fts ON content.items
    USING GIN (to_tsvector('english', payload::text));
CREATE INDEX idx_content_type_status ON content.items(content_type, status);
CREATE INDEX idx_content_difficulty ON content.items(difficulty) WHERE difficulty IS NOT NULL;
```

**Redis Email Pool (BRD 8.4, 8.5, 8.6, FR-GAME-004):**
- Pre-generated emails are stored in Redis lists for low-latency delivery.
- Keyed by difficulty: `email_pool:{difficulty}` (e.g., `email_pool:3`).
- Producers use `LPUSH` to add generated emails; consumers use `RPOP` to serve game sessions.
- Payloads are stored as compact JSON with an `emailId` (backed by Postgres) to preserve auditability.
- **Pool targets:** 200+ total emails across all difficulty tiers (FR-GAME-004); 20-50 emails per difficulty tier (BRD 8.6).
- Low-watermark triggers `content.pool.low` events for the AI pipeline to replenish.

**Events Published:**
- `content.published` -- New content published (triggers cache invalidation)
- `content.pool.low` -- Email pool below threshold (triggers AI generation)

---

#### 1.4.4 `ai-pipeline` -- LLM Integration & Phishing Generation

**Responsibility:** LLM provider management, prompt engineering, phishing email generation, output validation, quality scoring, difficulty classification, email pool maintenance.

**Public Interface:**

```typescript
// modules/ai-pipeline/index.ts
export interface AIPipelineModule {
  // Email generation
  generatePhishingEmail(params: PhishingGenParams): Promise<GeneratedEmail>;
  generateLegitimateEmail(params: LegitGenParams): Promise<GeneratedEmail>;
  batchGenerate(params: BatchGenParams): Promise<GeneratedEmail[]>;

  // Pool management
  getPoolStatus(): Promise<PoolStatus>;
  replenishPool(difficulty: number, count: number): Promise<void>;
  consumeFromPool(difficulty: number): Promise<GeneratedEmail | null>;

  // Scenario generation
  generateScenarioVariation(base: ThreatScenario): Promise<ThreatScenario>;

  // Classification
  classifyDifficulty(email: RawEmail): Promise<DifficultyClassification>;
  scoreQuality(email: GeneratedEmail): Promise<QualityScore>;

  // Personalized learning (enterprise)
  generateLearningRecommendation(userId: string): Promise<LearningRecommendation>;
}
```

**Dependencies:**
- `content` -- Store generated emails in the content library
- `analytics` -- Player skill profiles for personalized difficulty

**Database Tables Owned:**

```sql
CREATE TABLE ai.generation_log (
    generation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    provider        VARCHAR(32) NOT NULL,   -- 'claude_sonnet','claude_haiku','self_hosted'
    model_version   VARCHAR(64) NOT NULL,
    prompt_template VARCHAR(64) NOT NULL,
    input_tokens    INT NOT NULL,
    output_tokens   INT NOT NULL,
    latency_ms      INT NOT NULL,
    quality_score   REAL,
    difficulty      INT,
    status          VARCHAR(16) NOT NULL,    -- 'success','failed','filtered'
    error_message   TEXT,
    cost_usd        NUMERIC(10,6),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai.prompt_templates (
    template_id     VARCHAR(64) PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    category        VARCHAR(32) NOT NULL,
    system_prompt   TEXT NOT NULL,
    user_template   TEXT NOT NULL,  -- Handlebars-style template
    output_schema   JSONB NOT NULL, -- JSON Schema for structured output
    guardrails      JSONB NOT NULL, -- Validation rules
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Events Published:**
- `ai.generation.completed` -- Email generated (for monitoring/cost tracking)
- `ai.generation.failed` -- Generation failed (triggers fallback)
- `ai.pool.replenished` -- Pool refilled to threshold

---

#### 1.4.5 `facility` -- Facility Simulation

**Responsibility:** Data center resource simulation (rack space, power, cooling, bandwidth), client lease management, upgrade processing, resource consumption calculation, facility tier progression.

**Public Interface:**

```typescript
// modules/facility/index.ts
export interface FacilityModule {
  // Resource queries
  getFacilityState(sessionId: string): Promise<FacilityState>;
  getResourceAvailability(sessionId: string): Promise<ResourceAvailability>;
  calculateClientResources(client: ClientProfile): Promise<ResourceRequirement>;

  // Client management
  onboardClient(sessionId: string, client: ClientProfile): Promise<OnboardResult>;
  evictClient(sessionId: string, clientId: string): Promise<void>;
  processLeaseExpiry(sessionId: string): Promise<ExpiredLease[]>;

  // Upgrades
  getAvailableUpgrades(sessionId: string): Promise<Upgrade[]>;
  purchaseUpgrade(sessionId: string, upgradeId: string): Promise<PurchaseResult>;
  completeUpgrade(sessionId: string, upgradeId: string): Promise<void>;

  // Metrics
  simulateTick(sessionId: string): Promise<FacilityMetrics>;
  getFacilityTier(sessionId: string): Promise<FacilityTier>;
}
```

**Dependencies:**
- `game-engine` -- Receives session context, publishes state changes back

**Database Tables Owned:**

```sql
CREATE TABLE facility.states (
    session_id       UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    tier             VARCHAR(16) NOT NULL DEFAULT 'outpost',
        -- 'outpost','station','vault','fortress','citadel'
    rack_capacity_u  INT NOT NULL DEFAULT 42,
    rack_used_u      INT NOT NULL DEFAULT 0,
    power_budget_kw  REAL NOT NULL DEFAULT 10.0,
    power_used_kw    REAL NOT NULL DEFAULT 0.0,
    cooling_tons     REAL NOT NULL DEFAULT 5.0,
    cooling_used     REAL NOT NULL DEFAULT 0.0,
    bandwidth_mbps   REAL NOT NULL DEFAULT 100.0,
    bandwidth_used   REAL NOT NULL DEFAULT 0.0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE facility.clients (
    client_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    name             VARCHAR(128) NOT NULL,
    organization     VARCHAR(128),
    rack_u           INT NOT NULL,
    power_kw         REAL NOT NULL,
    cooling_tons     REAL NOT NULL,
    bandwidth_mbps   REAL NOT NULL,
    payment_per_day  BIGINT NOT NULL,
    lease_start_day  INT NOT NULL,
    lease_end_day    INT NOT NULL,
    trust_level      INT NOT NULL DEFAULT 50,
    is_legitimate    BOOLEAN NOT NULL,
    onboarded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE facility.upgrades (
    upgrade_id       VARCHAR(64) NOT NULL,
    session_id       UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'available',
        -- 'available','purchased','installing','completed'
    purchased_day    INT,
    completes_day    INT,
    cost             BIGINT,
    PRIMARY KEY (upgrade_id, session_id)
);
```

**Events Published:**
- `facility.resource.critical` -- Resource utilization above 90%
- `facility.client.onboarded` -- New client added
- `facility.client.evicted` -- Client removed
- `facility.tier.upgraded` -- Facility tier changed
- `facility.upgrade.purchased` -- Upgrade bought
- `facility.upgrade.completed` -- Upgrade installed

---

#### 1.4.6 `threat-engine` -- Attack Generation & Breach Simulation

**Responsibility:** Dynamic threat generation, attack vector selection based on player behavior, breach probability calculation, threat level management, the adaptive threat system that shifts attack patterns based on player strengths and weaknesses.

**Public Interface:**

```typescript
// modules/threat-engine/index.ts
export interface ThreatEngineModule {
  // Threat generation
  generateAttacks(sessionId: string, dayParams: DayParams): Promise<Attack[]>;
  evaluateBreachProbability(sessionId: string, attack: Attack): Promise<BreachResult>;
  getThreatLevel(sessionId: string): Promise<ThreatLevel>;

  // Adaptive behavior
  getPlayerWeaknesses(userId: string): Promise<WeaknessProfile>;
  selectAttackVector(sessionId: string): Promise<AttackVector>;

  // Threat intelligence (in-game)
  generateIntelBrief(sessionId: string, day: number): Promise<IntelBrief>;

  // Scenario management
  activateScenario(sessionId: string, scenarioId: string): Promise<void>;
  getActiveScenarios(sessionId: string): Promise<ActiveScenario[]>;
}
```

**Dependencies:**
- `game-engine` -- Reads game state for context
- `facility` -- Reads installed defenses to calculate mitigation
- `analytics` -- Player skill profile for adaptive difficulty
- `ai-pipeline` -- Generate dynamic threat scenarios

**Database Tables Owned:**

```sql
CREATE TABLE threat.attacks (
    attack_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    vector           VARCHAR(64) NOT NULL,
    severity         INT NOT NULL,      -- 1-10
    day              INT NOT NULL,
    phase            VARCHAR(32),       -- Multi-phase attack tracking
    status           VARCHAR(16) NOT NULL DEFAULT 'pending',
        -- 'pending','active','mitigated','succeeded'
    mitigated_by     VARCHAR(64),       -- Upgrade that stopped it
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE threat.scenarios_active (
    scenario_id      UUID NOT NULL,
    session_id       UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    current_phase    INT NOT NULL DEFAULT 0,
    started_day      INT NOT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'active',
    PRIMARY KEY (scenario_id, session_id)
);
```

**Events Published:**
- `threat.attack.launched` -- New attack began
- `threat.attack.mitigated` -- Attack stopped by defenses
- `threat.attack.succeeded` -- Attack penetrated defenses
- `threat.breach.occurred` -- Full breach (triggers ransom mechanic)
- `threat.level.changed` -- Threat level tier changed

---

#### 1.4.7 `analytics` -- Player Metrics & Learning Analytics

**Responsibility:** Ingesting game events, computing player skill profiles, generating compliance reports, training effectiveness KPIs, executive dashboards, A/B test tracking, game analytics (retention, engagement).

**Public Interface:**

```typescript
// modules/analytics/index.ts
export interface AnalyticsModule {
  // Event ingestion
  ingest(event: AnalyticsEvent): Promise<void>;
  ingestBatch(events: AnalyticsEvent[]): Promise<void>;

  // Player analytics
  getPlayerProfile(userId: string): Promise<PlayerSkillProfile>;
  getPlayerTimeline(userId: string, range: DateRange): Promise<TimelineData>;
  getCompetencyMap(userId: string): Promise<CompetencyMap>;

  // Training effectiveness (enterprise)
  getPhishingClickRate(tenantId: string, range: DateRange): Promise<ClickRateData>;
  getComplianceStatus(tenantId: string, framework: string): Promise<ComplianceReport>;
  generateAuditReport(tenantId: string, params: AuditParams): Promise<AuditReport>;

  // Dashboards
  getCISODashboard(tenantId: string): Promise<CISODashboardData>;
  getOrgRiskHeatMap(tenantId: string): Promise<RiskHeatMap>;

  // Game analytics
  getRetentionCurve(cohort: CohortFilter): Promise<RetentionData>;
  getSessionMetrics(range: DateRange): Promise<SessionMetrics>;

  // Export
  exportReport(reportId: string, format: 'pdf' | 'csv' | 'json'): Promise<ExportResult>;

  // Retention policies (BRD FR-ENT-031)
  getRetentionPolicy(tenantId: string, framework: string): Promise<RetentionPolicy>;
  setRetentionPolicy(tenantId: string, framework: string, retentionYears: number): Promise<void>;
  runRetentionCleanup(tenantId: string): Promise<RetentionCleanupResult>;
}
```

**Dependencies:**
- `auth` -- User/tenant context for scoped analytics
- `game-engine` -- Subscribes to game events

**Real-Time Metrics (BRD 8.5):**
- Redis Streams provide the fast path for live dashboards and alerts.
- Streams are partitioned by tenant and category (example: `metrics:{tenantId}:events`).
- Producers append with `XADD`; consumers (dashboard workers) read via consumer groups.
- Stream entries are windowed (e.g., 24h retention) and aggregated into ClickHouse/TimescaleDB for long-term analytics.

**Database Tables Owned:**

```sql
-- Analytics events (ClickHouse or TimescaleDB)
CREATE TABLE analytics.events (
    event_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    session_id       UUID,
    event_name       VARCHAR(128) NOT NULL,
    event_properties JSONB NOT NULL DEFAULT '{}',
    device_info      JSONB,
    geo_info         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- If TimescaleDB:
SELECT create_hypertable('analytics.events', 'created_at');

-- Materialized player skill profiles
CREATE TABLE analytics.player_profiles (
    user_id                      UUID PRIMARY KEY,
    tenant_id                    UUID NOT NULL,
    total_sessions               INT NOT NULL DEFAULT 0,
    total_days_played            INT NOT NULL DEFAULT 0,
    phishing_detection_rate      REAL NOT NULL DEFAULT 0.5,
    false_positive_rate          REAL NOT NULL DEFAULT 0.5,
    avg_decision_time_seconds    REAL,
    indicator_proficiency        JSONB DEFAULT '{}',
    competency_scores            JSONB DEFAULT '{}',
    skill_rating                 INT NOT NULL DEFAULT 1000,
    last_computed_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance snapshots (point-in-time for audit)
CREATE TABLE analytics.compliance_snapshots (
    snapshot_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL,
    framework        VARCHAR(32) NOT NULL,
    snapshot_data    JSONB NOT NULL,
    computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Events Consumed:**
- `game.action.processed` -- All game actions for metric computation
- `game.session.started`, `game.session.ended` -- Session lifecycle tracking
- `auth.user.created` -- New user for cohort analysis

---

#### 1.4.8 `billing` -- Subscription & Enterprise Licensing

**Responsibility:** Subscription plan management, seat counting, usage metering, Stripe integration, invoice generation, enterprise license key management.

**Public Interface:**

```typescript
// modules/billing/index.ts
export interface BillingModule {
  // Subscription management
  getSubscription(tenantId: string): Promise<Subscription>;
  createSubscription(tenantId: string, plan: PlanId): Promise<Subscription>;
  updateSubscription(tenantId: string, plan: PlanId): Promise<Subscription>;
  cancelSubscription(tenantId: string): Promise<void>;

  // Seat management
  getSeatCount(tenantId: string): Promise<SeatCount>;
  checkSeatAvailability(tenantId: string): Promise<boolean>;

  // Usage metering
  recordUsage(tenantId: string, metric: UsageMetric): Promise<void>;
  getUsageSummary(tenantId: string, period: BillingPeriod): Promise<UsageSummary>;

  // Entitlements
  checkEntitlement(tenantId: string, feature: string): Promise<boolean>;
  getEntitlements(tenantId: string): Promise<Entitlement[]>;
}
```

**Dependencies:**
- `auth` -- User counts for seat metering

**Database Tables Owned:**

```sql
CREATE TABLE billing.subscriptions (
    subscription_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL UNIQUE,
    plan_id          VARCHAR(32) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    stripe_sub_id    VARCHAR(128),
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    seat_limit       INT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at     TIMESTAMPTZ
);

CREATE TABLE billing.usage_records (
    record_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL,
    metric           VARCHAR(64) NOT NULL,
    quantity         BIGINT NOT NULL,
    period_start     TIMESTAMPTZ NOT NULL,
    period_end       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE billing.plans (
    plan_id          VARCHAR(32) PRIMARY KEY,
    name             VARCHAR(64) NOT NULL,
    tier             VARCHAR(16) NOT NULL,  -- 'free','starter','professional','enterprise','government' (BRD 12.1)
    price_cents      INT NOT NULL,
    billing_interval VARCHAR(16) NOT NULL,  -- 'monthly','annual'
    seat_limit       INT,
    features         JSONB NOT NULL DEFAULT '{}',
    is_active        BOOLEAN NOT NULL DEFAULT true
);
```

**Events Published:**
- `billing.subscription.created` -- New subscription
- `billing.subscription.upgraded` -- Plan upgraded
- `billing.subscription.cancelled` -- Cancellation
- `billing.seat.limit_reached` -- Seat limit hit (triggers admin notification)

---

#### 1.4.9 `admin` -- Admin Panel API & Tenant Management

**Responsibility:** Enterprise admin dashboard API, tenant CRUD, user management views, campaign management, player observation (live session viewing for trainers), tenant configuration.

**Performance Targets:**
- Tenant provisioning must complete in under 5 minutes, fully automated (BRD FR-ENT-004).
- White-label branding changes (logo, colors, fonts, custom domains, email templates) must propagate within 60 seconds (BRD FR-ENT-005).

**Public Interface:**

```typescript
// modules/admin/index.ts
export interface AdminModule {
  // Tenant management
  createTenant(data: CreateTenantInput): Promise<Tenant>;
  updateTenant(tenantId: string, data: UpdateTenantInput): Promise<Tenant>;
  getTenant(tenantId: string): Promise<Tenant>;
  listTenants(filter: TenantFilter): Promise<PaginatedResult<Tenant>>;
  configureBranding(tenantId: string, branding: BrandingConfig): Promise<void>;

  // User management (admin view)
  listUsers(tenantId: string, filter: UserFilter): Promise<PaginatedResult<UserView>>;
  observeSession(sessionId: string): Promise<ObservationStream>;

  // Campaign management
  createCampaign(tenantId: string, campaign: CampaignInput): Promise<Campaign>;
  scheduleCampaign(campaignId: string, schedule: CampaignSchedule): Promise<void>;
  getCampaignResults(campaignId: string): Promise<CampaignResults>;

  // System administration (super admin)
  getSystemHealth(): Promise<SystemHealth>;
  getAuditLog(filter: AuditLogFilter): Promise<PaginatedResult<AuditEntry>>;
}
```

**Dependencies:**
- `auth` -- User/tenant CRUD delegated to auth module
- `analytics` -- Dashboard data
- `billing` -- Subscription status
- `game-engine` -- Session observation
- `notification` -- Campaign delivery

**Database Tables Owned:**

```sql
-- Core tenant table (shared infrastructure)
CREATE TABLE public.tenants (
    tenant_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    slug             VARCHAR(64) UNIQUE NOT NULL,
    domain           VARCHAR(255),
    plan_id          VARCHAR(32),
    branding         JSONB DEFAULT '{}',
    settings         JSONB NOT NULL DEFAULT '{}',
    data_region      VARCHAR(16) NOT NULL DEFAULT 'eu',
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin.campaigns (
    campaign_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL,
    name             VARCHAR(255) NOT NULL,
    type             VARCHAR(32) NOT NULL,  -- 'phishing_sim','training','assessment'
    config           JSONB NOT NULL,
    schedule         JSONB,
    status           VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by       UUID NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ
);

-- Immutable, append-only audit log with SHA-256 cryptographic integrity verification (BRD FR-ENT-030)
CREATE TABLE admin.audit_log (
    log_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID,
    user_id          UUID,
    action           VARCHAR(128) NOT NULL,
    resource_type    VARCHAR(64) NOT NULL,
    resource_id      VARCHAR(128),
    details          JSONB NOT NULL DEFAULT '{}',
    ip_address       INET,
    user_agent       TEXT,
    previous_hash    VARCHAR(64),        -- SHA-256 hash of previous entry (chain)
    integrity_hash   VARCHAR(64) NOT NULL, -- SHA-256 of (previous_hash + log_id + action + details + created_at)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- SHA-256 chain for tamper detection: each entry's integrity_hash includes the previous entry's hash,
-- forming an append-only verifiable chain.
CREATE INDEX idx_audit_log_tenant ON admin.audit_log(tenant_id, created_at);
```

**Events Published:**
- `admin.tenant.created` -- New tenant provisioned
- `admin.tenant.updated` -- Tenant configuration changed
- `admin.campaign.started` -- Campaign kicked off
- `admin.campaign.completed` -- Campaign finished

---

#### 1.4.10 `notification` -- WebSocket Management & Notifications

**Responsibility:** WebSocket connection lifecycle, real-time message delivery, push notifications (web push, email), notification preferences, SSE fallback for restrictive corporate networks.

**Public Interface:**

```typescript
// modules/notification/index.ts
export interface NotificationModule {
  // WebSocket management
  registerConnection(userId: string, socket: WebSocket): Promise<void>;
  removeConnection(userId: string, connectionId: string): Promise<void>;
  getActiveConnections(userId: string): Promise<ConnectionInfo[]>;

  // Real-time messaging
  sendToUser(userId: string, message: WSMessage): Promise<void>;
  sendToSession(sessionId: string, message: WSMessage): Promise<void>;
  broadcastToTenant(tenantId: string, message: WSMessage): Promise<void>;
  broadcastToRoom(roomId: string, message: WSMessage): Promise<void>;

  // Push notifications
  sendPushNotification(userId: string, notification: PushPayload): Promise<void>;
  sendEmail(userId: string, template: EmailTemplate, data: object): Promise<void>;

  // Preferences
  getPreferences(userId: string): Promise<NotificationPreferences>;
  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void>;

  // Room management (multiplayer)
  createRoom(roomId: string, config: RoomConfig): Promise<void>;
  joinRoom(roomId: string, userId: string): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
}
```

**Dependencies:**
- `auth` -- User identity, connection authentication

**Database Tables Owned:**

```sql
CREATE TABLE notification.preferences (
    user_id          UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL,
    push_enabled     BOOLEAN NOT NULL DEFAULT true,
    email_enabled    BOOLEAN NOT NULL DEFAULT true,
    in_game_enabled  BOOLEAN NOT NULL DEFAULT true,
    quiet_hours      JSONB,   -- { start: '22:00', end: '08:00', timezone: 'Europe/Berlin' }
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification.push_subscriptions (
    subscription_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    endpoint         TEXT NOT NULL,
    keys             JSONB NOT NULL,   -- p256dh + auth for web push
    user_agent       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification.delivery_log (
    delivery_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    tenant_id        UUID NOT NULL,
    channel          VARCHAR(16) NOT NULL,  -- 'websocket','push','email','sms'
    template         VARCHAR(64),
    status           VARCHAR(16) NOT NULL,  -- 'sent','delivered','failed','bounced'
    error_message    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Events Consumed:**
- `game.breach.occurred` -- Send urgent breach notification
- `game.achievement.unlocked` -- Send achievement notification
- `admin.campaign.started` -- Trigger campaign notifications
- `billing.seat.limit_reached` -- Notify tenant admin
- `threat.level.changed` -- Send threat level alert

### 1.5 Module Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Communication Matrix                              │
├──────────────┬──────────────────────────────────────────────────────┤
│              │   Synchronous (Direct Call)                          │
│              │   ─────────────────────────                          │
│ game-engine ──► auth.evaluatePermission()                          │
│ game-engine ──► content.getEmailsForDay()                          │
│ game-engine ──► facility.onboardClient()                           │
│ game-engine ──► threat-engine.generateAttacks()                    │
│ admin       ──► auth.createUser()                                  │
│ admin       ──► analytics.getCISODashboard()                       │
│ admin       ──► billing.getSubscription()                          │
│              │                                                      │
│              │   Asynchronous (Event Bus)                           │
│              │   ─────────────────────────                          │
│ game-engine ~~► analytics.ingest()     [game.action.processed]     │
│ game-engine ~~► notification.send()    [game.breach.occurred]      │
│ auth        ~~► analytics.ingest()     [auth.user.created]         │
│ auth        ~~► threat-engine.detect() [auth.login.failed]         │
│ content     ~~► ai-pipeline.replenish()[content.pool.low]          │
│ billing     ~~► notification.send()    [billing.seat.limit_reached]│
│ admin       ~~► notification.send()    [admin.campaign.started]    │
└──────────────────────────────────────────────────────────────────────┘

Legend:  ──►  Direct function call (synchronous, in-process)
        ~~►  Event bus publish (asynchronous, eventually consistent)
```

**Rule of thumb:** If the caller needs the result to continue (query or command with immediate feedback), use a direct call. If the caller does not care about the result or the side effect can be delayed, use the event bus.

---

## 2. Fastify Application Structure

### 2.1 Plugin System Mapping to Modules

Fastify's encapsulated plugin architecture maps directly to our module system. Each module registers as a Fastify plugin, receiving an encapsulated Fastify instance with its own decorators, hooks, and routes that do not leak into sibling plugins.

```typescript
// src/app.ts -- Application root
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { EventBus } from './shared/events/event-bus.js';
import { createDatabasePool } from './shared/database/connection.js';
import { createRedisClient } from './shared/database/redis.js';
import { generateUUIDv7 } from './shared/utils/id.js';

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            requestId: req.id,
            tenantId: (req as any).tenantId,
            userId: (req as any).userId,
          };
        },
      },
    },
    genReqId: () => generateUUIDv7(),  // UUIDv7 request IDs (BRD 10.1: UUIDv7 for event deduplication)
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // ─── Global Infrastructure Plugins ───────────────────────────────
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production'
      ? cspConfig
      : false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: createRedisClient(config.REDIS_URL),
  });

  await app.register(websocket, {
    options: {
      maxPayload: 1048576,  // 1MB max message size
      clientTracking: true,
    },
  });

  // ─── Shared Decorators ───────────────────────────────────────────
  const db = createDatabasePool(config.DATABASE_URL);
  const redis = createRedisClient(config.REDIS_URL);
  const eventBus = new EventBus();

  app.decorate('db', db);
  app.decorate('redis', redis);
  app.decorate('eventBus', eventBus);
  app.decorate('config', config);

  // ─── Global Hooks ────────────────────────────────────────────────
  app.addHook('onRequest', requestLoggerHook);
  app.addHook('onResponse', responseMetricsHook);
  app.addHook('onError', errorTrackingHook);

  // ─── Module Registration (order matters for dependency injection) ─
  // Each module is a Fastify plugin with its own encapsulated context
  await app.register(import('./modules/auth/auth.plugin.js'), {
    prefix: '/api/v1/auth',
  });

  await app.register(import('./modules/game-engine/game-engine.plugin.js'), {
    prefix: '/api/v1/game',
  });

  await app.register(import('./modules/content/content.plugin.js'), {
    prefix: '/api/v1/content',
  });

  await app.register(import('./modules/ai-pipeline/ai-pipeline.plugin.js'), {
    prefix: '/api/v1/ai',
  });

  await app.register(import('./modules/facility/facility.plugin.js'), {
    prefix: '/api/v1/facility',
  });

  await app.register(import('./modules/threat-engine/threat-engine.plugin.js'), {
    prefix: '/api/v1/threats',
  });

  await app.register(import('./modules/analytics/analytics.plugin.js'), {
    prefix: '/api/v1/analytics',
  });

  await app.register(import('./modules/billing/billing.plugin.js'), {
    prefix: '/api/v1/billing',
  });

  await app.register(import('./modules/admin/admin.plugin.js'), {
    prefix: '/api/v1/admin',
  });

  await app.register(import('./modules/notification/notification.plugin.js'), {
    prefix: '/api/v1/notifications',
  });

  // ─── Health & Readiness ──────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date() }));
  app.get('/ready', async () => {
    const dbOk = await db.execute(sql`SELECT 1`).then(() => true).catch(() => false);
    const redisOk = await redis.ping().then(() => true).catch(() => false);
    const ready = dbOk && redisOk;
    return { status: ready ? 'ready' : 'degraded', db: dbOk, redis: redisOk };
  });

  return app;
}
```

### 2.2 Module Plugin Pattern

Each module follows the same plugin registration pattern:

```typescript
// modules/auth/auth.plugin.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repo.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerSCIMRoutes } from './auth.scim.js';

const authPlugin: FastifyPluginAsync = async (fastify, opts) => {
  // ─── Instantiate module services ─────────────────────────────────
  const repo = new AuthRepository(fastify.db);
  const service = new AuthService(repo, fastify.redis, fastify.config);

  // ─── Decorate this encapsulated context ──────────────────────────
  fastify.decorate('authService', service);

  // ─── Module-scoped hooks ─────────────────────────────────────────
  // These hooks only apply to routes registered within this plugin
  fastify.addHook('onRequest', async (req) => {
    req.requestContext = { startTime: Date.now() };
  });

  // ─── Register routes ─────────────────────────────────────────────
  await registerAuthRoutes(fastify, service);

  // ─── Register SCIM sub-routes ────────────────────────────────────
  await fastify.register(registerSCIMRoutes, { prefix: '/scim/v2' });

  // ─── Subscribe to events from other modules ──────────────────────
  // (none for auth -- it is a leaf dependency)

  // ─── Publish event subscriptions ─────────────────────────────────
  fastify.log.info('Auth module loaded');
};

// fp() prevents encapsulation -- decorators visible to parent
// Only use fp() for modules that MUST expose decorators globally
// For most modules, do NOT use fp() -- keep them encapsulated
export default fp(authPlugin, {
  name: 'auth-module',
  dependencies: [],  // No dependencies on other modules
});
```

### 2.3 Schema-Based Validation (Zod to JSON Schema)

Schemas are defined once in Zod (for TypeScript type inference and runtime validation) and compiled to JSON Schema for Fastify's built-in AJV validator:

```typescript
// modules/auth/auth.schema.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ─── Zod Schemas (source of truth) ──────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  mfaCode: z.string().length(6).optional(),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string(),
    roles: z.array(z.string()),
    tenantId: z.string().uuid(),
  }),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(128)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  displayName: z.string().min(2).max(128),
  tenantSlug: z.string().min(2).max(64).optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string().uuid(),
  }),
});

// ─── TypeScript types derived from Zod ───────────────────────────────

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// ─── JSON Schema for Fastify (compiled once at startup) ──────────────

export const loginJsonSchema = {
  body: zodToJsonSchema(LoginRequestSchema),
  response: {
    200: zodToJsonSchema(LoginResponseSchema),
    401: zodToJsonSchema(ErrorResponseSchema),
  },
};

export const registerJsonSchema = {
  body: zodToJsonSchema(RegisterRequestSchema),
  response: {
    201: zodToJsonSchema(LoginResponseSchema),
    400: zodToJsonSchema(ErrorResponseSchema),
    409: zodToJsonSchema(ErrorResponseSchema),
  },
};
```

### 2.4 Request Lifecycle Hooks

Fastify's hook system provides precise control over the request lifecycle. The following diagram shows the execution order and where our middleware hooks attach:

```
Client Request
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ onRequest                                                     │
│  ├── requestLoggerHook (global)   -- Log request start        │
│  ├── requestIdHook (global)       -- Ensure X-Request-ID      │
│  └── corsHook (global)            -- CORS preflight           │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ preParsing                                                    │
│  └── requestSizeLimitHook         -- Enforce body size limits │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
              [ Body Parsing ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ preValidation                                                 │
│  └── sanitizeInputHook            -- Strip null bytes, trim   │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
              [ Schema Validation (AJV) ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ preHandler                                                    │
│  ├── authGuardHook (per-route)    -- JWT verification         │
│  ├── tenantContextHook (per-route)-- Set RLS tenant_id        │
│  ├── rateLimiterHook (per-route)  -- Endpoint-specific limits │
│  └── permissionCheckHook (per-rte)-- RBAC/ABAC evaluation     │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
              [ Route Handler ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ preSerialization                                              │
│  └── responseEnvelopeHook         -- Wrap in standard format  │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
              [ Serialization ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ onSend                                                        │
│  ├── securityHeadersHook          -- CSP, HSTS, X-Frame, etc │
│  └── cacheControlHook             -- Set Cache-Control header │
└──────────────────────┬───────────────────────────────────────┘
                       ▼
              [ Response Sent ]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ onResponse                                                    │
│  ├── responseMetricsHook          -- Prometheus histogram      │
│  └── auditLogHook (admin routes)  -- Write audit log entry    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ onError (if error thrown at any stage)                        │
│  ├── errorTrackingHook            -- Sentry / error tracker   │
│  └── errorFormatterHook           -- Standard error response  │
└──────────────────────────────────────────────────────────────┘
```

### 2.5 Error Handling Strategy

All errors are mapped to a consistent envelope format with machine-readable error codes:

```typescript
// shared/middleware/error-handler.ts

export interface ApiError {
  code: string;        // Machine-readable: 'AUTH_TOKEN_EXPIRED'
  message: string;     // Human-readable: 'Your session has expired'
  details?: Record<string, unknown>;
  requestId: string;
}

// Error code registry
export const ErrorCodes = {
  // Auth errors (401, 403)
  AUTH_INVALID_CREDENTIALS:  { status: 401, code: 'AUTH_INVALID_CREDENTIALS' },
  AUTH_TOKEN_EXPIRED:        { status: 401, code: 'AUTH_TOKEN_EXPIRED' },
  AUTH_TOKEN_INVALID:        { status: 401, code: 'AUTH_TOKEN_INVALID' },
  AUTH_MFA_REQUIRED:         { status: 403, code: 'AUTH_MFA_REQUIRED' },
  AUTH_INSUFFICIENT_PERMS:   { status: 403, code: 'AUTH_INSUFFICIENT_PERMS' },
  AUTH_ACCOUNT_SUSPENDED:    { status: 403, code: 'AUTH_ACCOUNT_SUSPENDED' },

  // Validation errors (400)
  VALIDATION_FAILED:         { status: 400, code: 'VALIDATION_FAILED' },
  INVALID_INPUT:             { status: 400, code: 'INVALID_INPUT' },

  // Game errors (409, 422)
  GAME_INVALID_ACTION:       { status: 422, code: 'GAME_INVALID_ACTION' },
  GAME_SESSION_NOT_FOUND:    { status: 404, code: 'GAME_SESSION_NOT_FOUND' },
  GAME_SESSION_ENDED:        { status: 409, code: 'GAME_SESSION_ENDED' },
  GAME_INSUFFICIENT_FUNDS:   { status: 422, code: 'GAME_INSUFFICIENT_FUNDS' },
  GAME_RESOURCE_EXHAUSTED:   { status: 422, code: 'GAME_RESOURCE_EXHAUSTED' },
  GAME_BREACH_ACTIVE:        { status: 409, code: 'GAME_BREACH_ACTIVE' },

  // Resource errors (404, 409)
  RESOURCE_NOT_FOUND:        { status: 404, code: 'RESOURCE_NOT_FOUND' },
  RESOURCE_CONFLICT:         { status: 409, code: 'RESOURCE_CONFLICT' },
  RESOURCE_GONE:             { status: 410, code: 'RESOURCE_GONE' },

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED:       { status: 429, code: 'RATE_LIMIT_EXCEEDED' },

  // Billing errors (402, 403)
  BILLING_SEAT_LIMIT:        { status: 403, code: 'BILLING_SEAT_LIMIT' },
  BILLING_PLAN_REQUIRED:     { status: 402, code: 'BILLING_PLAN_REQUIRED' },

  // Server errors (500, 503)
  INTERNAL_ERROR:            { status: 500, code: 'INTERNAL_ERROR' },
  SERVICE_UNAVAILABLE:       { status: 503, code: 'SERVICE_UNAVAILABLE' },
  AI_GENERATION_FAILED:      { status: 503, code: 'AI_GENERATION_FAILED' },
} as const;

// Fastify error handler
export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id;

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    });
    return;
  }

  // Fastify validation errors
  if (error.validation) {
    reply.status(400).send({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: { validationErrors: error.validation },
        requestId,
      },
    });
    return;
  }

  // Unexpected errors -- log full stack, return generic message
  request.log.error({ err: error, requestId }, 'Unhandled error');
  reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  });
}
```

### 2.6 Logging Configuration

Structured JSON logging via Pino (Fastify's built-in logger), with contextual fields for tenant isolation and request tracing:

```typescript
// Logging configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: Record<string, unknown>) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      service: 'archive-gate-api',
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION,
    }),
  },
  serializers: {
    req(req: FastifyRequest) {
      return {
        method: req.method,
        url: req.url,
        requestId: req.id,
        tenantId: req.tenantId,
        userId: req.userId,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };
    },
    res(res: FastifyReply) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.mfaCode',
      'req.body.refreshToken',
    ],
    censor: '[REDACTED]',
  },
};
```

Sample log output:

```json
{
  "level": "info",
  "time": "2026-02-05T14:23:01.234Z",
  "pid": 12345,
  "hostname": "dmz-api-7d8f9-abc12",
  "service": "archive-gate-api",
  "environment": "production",
  "version": "1.2.3",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tenantId": "tenant-uuid-here",
  "userId": "user-uuid-here",
  "msg": "POST /api/v1/game/action 200 - 12ms"
}
```

---

## 3. API Design -- RESTful + GraphQL

### 3.1 API Design Principles

1. **RESTful by default.** Standard HTTP methods, resource-oriented URLs, JSON request/response bodies.
2. **GraphQL for complex analytics.** A single `/api/v1/graphql` endpoint serves the admin dashboard and analytics views where queries span multiple resources.
3. **Consistent envelope.** All responses use the same structure: `{ data, meta, error }`.
4. **Versioned via URL path.** `/api/v1/...` with 12-month deprecation window for older versions.
5. **Schema-first.** Every endpoint has a Zod schema defining request and response shapes; these compile to OpenAPI 3.0 and JSON Schema for Fastify.
6. **Pagination standardized.** Cursor-based pagination for lists (`?cursor=xxx&limit=25`).
7. **Rate limited per endpoint category with required headers.** Auth endpoints: strict. Game actions: moderate. Read endpoints: generous. Responses include `X-RateLimit-Remaining`, and `Retry-After` is returned on `429` responses.

### 3.2 Standard Response Envelope

```typescript
// Success response
interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    pagination?: {
      cursor: string | null;
      hasMore: boolean;
      total?: number;
    };
  };
}

// Error response
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
```

### 3.3 REST API Endpoint Catalog

#### Auth Module -- `/api/v1/auth`

| Method | Path | Description | Auth | Rate Limit | Request Schema | Response Schema |
|--------|------|-------------|------|------------|----------------|-----------------|
| `POST` | `/auth/register` | Create new account | None | 5/hour/IP | `{ email, password, displayName, tenantSlug? }` | `{ data: { accessToken, user } }` |
| `POST` | `/auth/login` | Authenticate | None | 10/15min/IP | `{ email, password, mfaCode? }` | `{ data: { accessToken, expiresIn, user } }` |
| `POST` | `/auth/refresh` | Refresh access token | Refresh cookie | 30/min/user | (httpOnly cookie) | `{ data: { accessToken, expiresIn } }` |
| `POST` | `/auth/oauth/token` | OAuth 2.0 client-credentials token | Client Credentials | 60/min/client | `{ grant_type: 'client_credentials', client_id, client_secret, scope? }` | `{ data: { accessToken, expiresIn, tokenType } }` |
| `POST` | `/auth/oauth/clients` | Create OAuth client | Tenant Admin | 20/min | `{ name, scopes }` | `{ data: { clientId, clientSecret, scopes } }` |
| `POST` | `/auth/oauth/clients/:id/rotate-secret` | Rotate client secret | Tenant Admin | 10/min | -- | `{ data: { clientId, clientSecret } }` |
| `DELETE` | `/auth/oauth/clients/:id` | Revoke OAuth client | Tenant Admin | 10/min | -- | `204 No Content` |
| `DELETE` | `/auth/logout` | End session | Bearer | Unlimited | -- | `204 No Content` |
| `POST` | `/auth/sso/saml` | SAML assertion consumer | None (IdP-initiated) | 50/min/IP | SAML Response (form POST) | Redirect to app with session |
| `GET` | `/auth/sso/saml/metadata` | SP metadata XML | None | 100/min | -- | XML (SAML metadata) |
| `GET` | `/auth/sso/oidc/authorize` | OIDC authorization redirect | None | 50/min/IP | `?provider=...&state=...` | 302 Redirect to IdP |
| `POST` | `/auth/sso/oidc/callback` | OIDC callback | None | 50/min/IP | `{ code, state }` | `{ data: { accessToken, user } }` |
| `POST` | `/auth/password/reset` | Request password reset | None | 3/hour/IP | `{ email }` | `204 No Content` |
| `POST` | `/auth/password/change` | Change password | Bearer | 5/hour/user | `{ currentPassword, newPassword }` | `204 No Content` |
| `POST` | `/auth/mfa/enable` | Enable MFA | Bearer | 5/hour/user | `{ type: 'totp' \| 'webauthn' }` | `{ data: { secret?, qrCodeUrl?, challengeOptions? } }` |
| `POST` | `/auth/mfa/verify` | Verify MFA setup | Bearer | 10/hour/user | `{ code?, attestation? }` | `{ data: { backupCodes } }` |
| `POST` | `/auth/mfa/webauthn/register` | Register FIDO2/WebAuthn credential | Bearer | 5/hour/user | `{ attestationResponse }` | `{ data: { credentialId } }` |
| `POST` | `/auth/mfa/webauthn/authenticate` | Authenticate via WebAuthn | None (challenge-based) | 10/min/IP | `{ assertionResponse }` | `{ data: { accessToken, expiresIn } }` |

**Note:** Hardware-backed MFA (FIDO2/WebAuthn) is **required** for Super Admin access per BRD 7.4.

#### SCIM 2.0 Endpoints -- `/api/v1/auth/scim/v2`

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/scim/v2/Users` | List users | OAuth2 (client credentials) | 100/min |
| `GET` | `/scim/v2/Users/:id` | Get user | OAuth2 (client credentials) | 100/min |
| `POST` | `/scim/v2/Users` | Create user | OAuth2 (client credentials) | 50/min |
| `PUT` | `/scim/v2/Users/:id` | Replace user | OAuth2 (client credentials) | 50/min |
| `PATCH` | `/scim/v2/Users/:id` | Update user (PatchOp) | OAuth2 (client credentials) | 50/min |
| `DELETE` | `/scim/v2/Users/:id` | Deactivate user | OAuth2 (client credentials) | 50/min |
| `GET` | `/scim/v2/Groups` | List groups | OAuth2 (client credentials) | 100/min |
| `GET` | `/scim/v2/Groups/:id` | Get group | OAuth2 (client credentials) | 100/min |
| `POST` | `/scim/v2/Groups` | Create group | OAuth2 (client credentials) | 50/min |
| `PUT` | `/scim/v2/Groups/:id` | Replace group | OAuth2 (client credentials) | 50/min |
| `PATCH` | `/scim/v2/Groups/:id` | Update group (PatchOp) | OAuth2 (client credentials) | 50/min |
| `DELETE` | `/scim/v2/Groups/:id` | Delete group | OAuth2 (client credentials) | 50/min |
| `POST` | `/scim/v2/Bulk` | Bulk operations | OAuth2 (client credentials) | 10/min |
| `GET` | `/scim/v2/ServiceProviderConfig` | Service provider config | OAuth2 (client credentials) | 100/min |
| `GET` | `/scim/v2/Schemas` | Schema discovery | OAuth2 (client credentials) | 100/min |
| `GET` | `/scim/v2/ResourceTypes` | Resource types | OAuth2 (client credentials) | 100/min |

#### Game Engine -- `/api/v1/game`

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `POST` | `/game/sessions` | Start new game | Bearer | 5/min |
| `GET` | `/game/sessions/:id` | Get session state | Bearer | 60/min |
| `POST` | `/game/sessions/:id/save` | Save session | Bearer | 10/min |
| `DELETE` | `/game/sessions/:id` | End/abandon session | Bearer | 5/min |
| `GET` | `/game/sessions/:id/state` | Get full game state | Bearer | 60/min |
| `POST` | `/game/sessions/:id/actions` | Submit game action | Bearer | 30/min |
| `POST` | `/game/sessions/:id/advance-day` | Advance to next day | Bearer | 5/min |
| `GET` | `/game/sessions/:id/history` | Get event history | Bearer | 20/min |
| `GET` | `/game/sessions/:id/inbox` | Get current day emails | Bearer | 60/min |
| `GET` | `/game/sessions/:id/emails/:emailId` | Get email detail | Bearer | 120/min |
| `POST` | `/game/sessions/:id/emails/:emailId/decide` | Submit email decision | Bearer | 30/min |
| `GET` | `/game/sessions/:id/facility` | Get facility state | Bearer | 60/min |
| `GET` | `/game/sessions/:id/upgrades` | List available upgrades | Bearer | 30/min |
| `POST` | `/game/sessions/:id/upgrades/:upgradeId` | Purchase upgrade | Bearer | 10/min |
| `GET` | `/game/sessions/:id/intel` | Get intel briefs | Bearer | 30/min |
| `POST` | `/game/sessions/:id/ransom/pay` | Pay ransom | Bearer | 5/min |
| `GET` | `/game/leaderboard` | Global leaderboard | Bearer (opt.) | 30/min |
| `GET` | `/game/achievements` | Player achievements | Bearer | 30/min |

**Example: Email Decision Endpoint**

```typescript
// modules/game-engine/game-engine.routes.ts (excerpt)

const emailDecideSchema = {
  params: zodToJsonSchema(z.object({
    id: z.string().uuid(),
    emailId: z.string().uuid(),
  })),
  body: zodToJsonSchema(z.object({
    decision: z.enum(['approve', 'deny', 'flag', 'request_verification']),
    indicators: z.array(z.object({
      type: z.enum([
        'urgency', 'domain_mismatch', 'grammar', 'spoofed_header',
        'suspicious_link', 'attachment_risk', 'impersonation',
        'emotional_manipulation', 'too_good_to_be_true', 'authority_claim',
      ]),
      location: z.string().max(200),
      description: z.string().max(500).optional(),
    })).optional(),
    notes: z.string().max(1000).optional(),
    timeSpentMs: z.number().int().min(0).max(600000),
  })),
  response: {
    200: zodToJsonSchema(z.object({
      data: z.object({
        correct: z.boolean(),
        feedbackType: z.enum(['correct', 'false_positive', 'missed_phishing', 'wrong_indicators']),
        trustScoreChange: z.number(),
        fundsChange: z.number(),
        educationalNotes: z.array(z.string()),
        indicatorResults: z.array(z.object({
          type: z.string(),
          found: z.boolean(),
          explanation: z.string(),
        })).optional(),
      }),
    })),
  },
};

fastify.post<{
  Params: { id: string; emailId: string };
  Body: EmailDecisionInput;
}>('/sessions/:id/emails/:emailId/decide', {
  schema: emailDecideSchema,
  preHandler: [authGuard, rateLimiter({ max: 30, window: '1m' })],
}, async (request, reply) => {
  const { id: sessionId, emailId } = request.params;
  const action: GameAction = {
    type: 'EMAIL_DECISION',
    payload: { emailId, ...request.body },
  };

  const result = await gameEngine.processAction(sessionId, action);
  return { data: result };
});
```

#### Content Module -- `/api/v1/content`

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/content/emails` | List email templates | Admin | 30/min |
| `GET` | `/content/emails/:id` | Get email template | Admin | 60/min |
| `POST` | `/content/emails` | Create email template | Admin | 20/min |
| `PUT` | `/content/emails/:id` | Update email template | Admin | 20/min |
| `GET` | `/content/documents/:type` | Get document template | Bearer | 60/min |
| `POST` | `/content/generate` | Trigger AI content gen | Admin | 5/min |
| `GET` | `/content/scenarios` | List scenarios | Admin | 30/min |
| `GET` | `/content/scenarios/:id` | Get scenario detail | Admin | 60/min |
| `GET` | `/content/pool/status` | Email pool status | Admin | 60/min |

#### Admin Module -- `/api/v1/admin`

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/admin/tenants` | List tenants | Super Admin | 30/min |
| `POST` | `/admin/tenants` | Create tenant | Super Admin | 10/min |
| `GET` | `/admin/tenants/:id` | Get tenant | Tenant Admin | 60/min |
| `PUT` | `/admin/tenants/:id` | Update tenant | Tenant Admin | 20/min |
| `GET` | `/admin/users` | List users in tenant | Tenant Admin | 30/min |
| `GET` | `/admin/users/:id` | Get user detail | Tenant Admin | 60/min |
| `PUT` | `/admin/users/:id` | Update user | Tenant Admin | 20/min |
| `POST` | `/admin/users/:id/suspend` | Suspend user | Tenant Admin | 10/min |
| `POST` | `/admin/campaigns` | Create campaign | Trainer | 10/min |
| `GET` | `/admin/campaigns` | List campaigns | Trainer | 30/min |
| `GET` | `/admin/campaigns/:id` | Get campaign | Trainer | 60/min |
| `PUT` | `/admin/campaigns/:id` | Update campaign | Trainer | 20/min |
| `POST` | `/admin/campaigns/:id/start` | Start campaign | Trainer | 5/min |
| `GET` | `/admin/campaigns/:id/results` | Campaign results | Trainer | 30/min |
| `GET` | `/admin/audit-log` | Get audit log | Tenant Admin | 20/min |
| `GET` | `/admin/system/health` | System health | Super Admin | 60/min |

#### Analytics Module -- `/api/v1/analytics`

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/analytics/dashboard/ciso` | CISO dashboard | Admin | 20/min |
| `GET` | `/analytics/dashboard/training` | Training dashboard | Trainer | 20/min |
| `GET` | `/analytics/reports/compliance/:framework` | Compliance report | Admin | 10/min |
| `GET` | `/analytics/reports/phishing` | Phishing sim report | Admin | 10/min |
| `GET` | `/analytics/reports/retention` | Retention report | Admin | 10/min |
| `GET` | `/analytics/player/:id/profile` | Player skill profile | Admin | 30/min |
| `GET` | `/analytics/player/:id/timeline` | Player progress over time | Admin | 20/min |
| `GET` | `/analytics/org/risk-heatmap` | Org risk heat map | Admin | 10/min |
| `GET` | `/analytics/org/benchmarks` | Industry benchmarks | Admin | 10/min |
| `POST` | `/analytics/export` | Export report | Admin | 5/min |
| `GET` | `/analytics/export/:jobId` | Check export status | Admin | 30/min |
| `GET` | `/analytics/export/:jobId/download` | Download export | Admin | 10/min |

### 3.4 GraphQL Endpoint

A single GraphQL endpoint at `/api/v1/graphql` serves complex analytical queries that would require multiple REST calls or deeply nested data:

```typescript
// modules/analytics/analytics.graphql.ts
const typeDefs = `
  type Query {
    # Dashboard queries
    cisoDashboard(tenantId: ID!, dateRange: DateRangeInput!): CISODashboard!
    trainingEffectiveness(tenantId: ID!, dateRange: DateRangeInput!): TrainingMetrics!

    # Player analytics
    playerProfile(userId: ID!): PlayerProfile!
    playerTimeline(userId: ID!, dateRange: DateRangeInput!): [TimelineEntry!]!

    # Organizational analytics
    orgRiskHeatMap(tenantId: ID!): RiskHeatMap!
    departmentComparison(tenantId: ID!, departmentIds: [ID!]!): [DepartmentMetrics!]!

    # Compliance
    complianceStatus(tenantId: ID!, frameworks: [String!]!): [ComplianceFramework!]!
  }

  type CISODashboard {
    overallRiskScore: Float!
    phishingClickRate: Float!
    phishingReportRate: Float!
    trainingCompletionRate: Float!
    topRiskDepartments: [DepartmentRisk!]!
    trendData: TrendData!
    compliancePosture: [CompliancePosture!]!
  }

  type PlayerProfile {
    userId: ID!
    displayName: String!
    skillRating: Int!
    competencies: [Competency!]!
    recentSessions: [SessionSummary!]!
    weakAreas: [WeakArea!]!
    improvementTrend: Float!
  }

  input DateRangeInput {
    start: DateTime!
    end: DateTime!
  }
`;
```

### 3.5 OpenAPI 3.0 Specification

The OpenAPI specification is auto-generated from Fastify route schemas at build time using `@fastify/swagger`:

```typescript
// plugins/swagger.ts
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

await app.register(swagger, {
  openapi: {
    info: {
      title: 'The DMZ: Archive Gate API',
      description: 'Backend API for the cybersecurity training game',
      version: '1.0.0',
      contact: { name: 'Matrices GmbH', email: 'api@archivedmz.io' },
    },
    servers: [
      { url: 'https://api.archivedmz.io', description: 'Production' },
      { url: 'https://api-staging.archivedmz.io', description: 'Staging' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        OAuth2ClientCredentials: {
          type: 'oauth2',
          flows: {
            clientCredentials: {
              tokenUrl: '/api/v1/auth/oauth/token',
              scopes: {
                'scim.read': 'Read SCIM resources',
                'scim.write': 'Write SCIM resources',
                'webhooks.manage': 'Manage webhook subscriptions',
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'auth', description: 'Authentication & authorization' },
      { name: 'game', description: 'Core game engine' },
      { name: 'content', description: 'Content management' },
      { name: 'admin', description: 'Administration' },
      { name: 'analytics', description: 'Analytics & reporting' },
      { name: 'billing', description: 'Subscription & billing' },
      { name: 'scim', description: 'SCIM 2.0 provisioning' },
    ],
  },
});

await app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});
```

### 3.6 API Versioning Strategy

**Approach:** URL path versioning (`/api/v1/`, `/api/v2/`).

**Rationale:** URL versioning is the most visible and debuggable approach. For a public-facing API consumed by enterprise integrations (SIEM, SOAR, LMS), explicitness outweighs URL aesthetics. The BRD specifies a 12-month deprecation window per version.

**Versioning rules:**
1. **Minor changes** (additive fields, new optional parameters) do NOT require a new version. These are backward-compatible.
2. **Breaking changes** (removed fields, renamed endpoints, changed semantics) require a new major version.
3. **Deprecation flow:** Announce v2 -> 6-month dual-run period -> 6-month deprecation warnings in response headers -> sunset v1.
4. **Sunset header:** All deprecated endpoints include `Sunset: <date>` and `Deprecation: true` headers per RFC 8594.

```typescript
// Deprecation middleware for v1 routes
function deprecationWarning(sunsetDate: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header('Deprecation', 'true');
    reply.header('Sunset', sunsetDate);
    reply.header('Link', '</api/v2/docs>; rel="successor-version"');
  };
}
```

---

## 4. WebSocket Protocol

Real-time features (live game updates, dashboards, and notifications) use WebSockets with **SSE fallback** to satisfy BRD requirements for real-time delivery in restricted networks.

### 4.1 Transport & Endpoints

- Primary: WebSocket at `/api/v1/ws`
- Fallback: Server-Sent Events at `/api/v1/sse`
- Final fallback: REST polling with standard endpoints and ETags

Authentication uses the same JWT access tokens as REST. The `Authorization: Bearer <token>` header is required on the upgrade request; SSE uses the standard `Authorization` header.

### 4.2 Message Envelope

```json
{
  "type": "game.state.updated",
  "data": { "sessionId": "sess_...", "day": 12 },
  "meta": {
    "timestamp": "2026-02-05T15:10:44.120Z",
    "tenantId": "tenant_...",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

### 4.3 Subscriptions & Channels

Clients subscribe to topics after connection:
- `game.session.{sessionId}`
- `analytics.tenant.{tenantId}`
- `notifications.user.{userId}`

The server acknowledges with `subscription.ack`. Ping/pong keepalives are sent every 30 seconds; idle connections are closed after 2 missed pings.

---

## 5. Authentication & Authorization Backend

### 5.1 Authentication Flows

- **End-user auth:** email/password + MFA, JWT access tokens, refresh tokens via httpOnly cookies.
- **SSO:** SAML 2.0 and OIDC (Authorization Code + PKCE).
- **Service-to-service:** OAuth 2.0 client-credentials with scoped access tokens.
- **SCIM:** OAuth 2.0 client-credentials scoped to `scim.read`/`scim.write`.

### 5.2 Authorization Model

RBAC + ABAC policy evaluation with tenant isolation. Policies are cached in Redis with short TTL and invalidated on role changes. All data access enforces tenant scoping at the query layer.

### 5.3 Session & Token Controls

- Short-lived access tokens; refresh token rotation on use.
- **Super Admin sessions:** Maximum 4-hour duration with no refresh token renewal (BRD 7.4). Super Admin sessions require hardware-backed MFA (FIDO2/WebAuthn) for establishment.
- Session revocation by user, admin, or risk engine.
- Audit logging for auth events (login, MFA, token issuance, client creation).

---

## 6. Async Job Processing -- BullMQ Architecture

BullMQ (Redis-backed) is used for all asynchronous and long-running work to keep request latency consistent.

### 6.1 Core Queues

- `ai-generation` -- batch LLM email generation
- `webhooks` -- delivery attempts and retries
- `analytics-rollup` -- aggregation and materialized view updates
- `exports` -- report export jobs
- `notifications` -- email/SMS/push delivery
- `billing` -- invoice generation and reconciliation
- `maintenance` -- cleanup, reindex, and archive tasks

### 6.2 Reliability & Idempotency

- Exponential backoff retries with max attempts and dead-letter queues.
- Idempotency keys for externally-triggered jobs (exports, webhooks).
- Worker concurrency tuned per queue and isolated in separate processes.

### 6.3 Scheduling

Repeatable jobs handle hourly/daily rollups and cleanup tasks. Jobs emit audit events for traceability.

---

## 7. Caching Strategy

Redis is the primary cache layer, used with a cache-aside pattern:

- **Content cache:** email templates, scenarios, and document payloads.
- **Auth cache:** role/permission evaluation results (short TTL).
- **Rate limiting:** token-bucket counters and burst protection.
- **Feature flags/config:** environment-scoped configuration reads.

All keys are tenant-namespaced. Cache invalidation is triggered by domain events (e.g., `content.published`).

---

## 8. Service Extraction Strategy

The modular monolith is designed for **progressive extraction** when scale or isolation demands it.

**Scalability Phases (BRD 7.2):**

| Phase | Concurrent Users | Architecture |
|-------|-----------------|--------------|
| Launch | 10,000 | Modular monolith, single-region |
| Growth | 50,000 | Modular monolith with extracted AI pipeline and analytics services |
| Scale | 100,000+ | Microservices with NATS JetStream or Kafka; multi-region deployment |

### 8.1 Extraction Candidates

Per BRD 7.2 service extraction triggers:

- `ai-pipeline` -- extracted when LLM latency affects the game loop (high compute, vendor isolation)
- `analytics` -- extracted when write volume exceeds game DB capacity (high write volume, streaming needs)
- `threat-engine` -- extracted when simulation complexity demands dedicated compute
- `notification` -- extracted when WebSocket connections exceed single-process limits

### 8.2 Inter-Service Messaging (Post-Extraction)

At Scale phase (100,000+ concurrent users), extracted services communicate via **NATS JetStream or Kafka** (BRD 7.2) instead of the in-process event bus, enabling multi-region deployment.

### 8.3 Extraction Process

1. Replace in-process calls with async events or HTTP APIs.
2. Split data ownership into dedicated databases with replication as needed.
3. Introduce an internal API gateway and service contracts (OpenAPI/JSON Schema).
4. Use outbox pattern to preserve event ordering during the transition.
5. Replace in-process event bus with NATS JetStream or Kafka for cross-service messaging.

---

## 9. Webhook System

The platform is **event-driven by default**. External systems (SIEM/SOAR/LMS/HRIS) receive asynchronous webhook deliveries for key domain events. Webhooks are **HMAC-signed** to meet BRD 10.6 and provide integrity + authenticity.

### 9.1 Webhook Subscription Model

Each tenant can create multiple webhook subscriptions:
- `id`, `tenantId`, `name`, `targetUrl`, `eventTypes[]`, `status`, `createdAt`
- `secret` is generated server-side, returned once, stored hashed
- Optional per-subscription filters (e.g., `campaignId`, `departmentId`)

**Management endpoints (Tenant Admin or OAuth2 client with `webhooks.manage` scope):**

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `POST` | `/webhooks/subscriptions` | Create subscription | Bearer / OAuth2 | 20/min |
| `GET` | `/webhooks/subscriptions` | List subscriptions | Bearer / OAuth2 | 60/min |
| `GET` | `/webhooks/subscriptions/:id` | Get subscription | Bearer / OAuth2 | 60/min |
| `PATCH` | `/webhooks/subscriptions/:id` | Update subscription | Bearer / OAuth2 | 20/min |
| `DELETE` | `/webhooks/subscriptions/:id` | Disable subscription | Bearer / OAuth2 | 20/min |
| `POST` | `/webhooks/subscriptions/:id/test` | Send test event | Bearer / OAuth2 | 10/min |

### 9.2 Event Payload Shape

All events use a consistent envelope:

```json
{
  "id": "evt_01J8K7W9QW0Y2R1F4Z4Y9Z1M3G",
  "type": "campaign.completed",
  "occurredAt": "2026-02-05T15:10:44.120Z",
  "tenantId": "tenant_01J8K7V6G7H9E4P2Q0Z4R4G3PZ",
  "data": {
    "campaignId": "cmp_01J8K7V9J9P3C0T5Z2Q8K0Y1M2",
    "completionRate": 0.87
  },
  "version": "v1"
}
```

### 9.3 Delivery Semantics

- **At-least-once delivery** via BullMQ-backed queue.
- A `2xx` response acknowledges success; non-`2xx` responses trigger retry.
- Retries use exponential backoff (e.g., 30s, 2m, 10m, 30m, 2h) up to a max attempt count (default 10).
- After max attempts, the delivery is moved to a dead-letter queue and visible in the admin audit log.

### 9.4 HMAC Signing

Webhook requests include:
- `X-DMZ-Webhook-Id`: delivery UUIDv7
- `X-DMZ-Webhook-Timestamp`: epoch seconds
- `X-DMZ-Webhook-Signature`: `v1=<hex(hmac_sha256(secret, "${timestamp}.${rawBody}"))>`

Consumers must:
1. Recompute the HMAC using the shared secret and raw request body.
2. Compare using constant-time comparison.
3. Reject requests where the timestamp is older than 5 minutes (replay protection).

### 9.5 Event Catalog (Initial)

- `user.created`, `user.deactivated`
- `campaign.started`, `campaign.completed`
- `phishing.reported`, `phishing.clicked`
- `training.completed`
- `billing.invoice.paid`
- `webhook.test`

Event schemas are published with the OpenAPI spec and versioned under `/api/v1/webhooks/schemas`.

---

## 10. Rate Limiting and Security

### 10.1 Rate Limiting Policy

Rate limits are enforced per **tenant**, **client**, and **IP** with category-specific buckets (auth, write, read, analytics). Limits are enforced in `onRequest` and apply consistently across REST and GraphQL.

**Required response headers (BRD 10.6):**
- `X-RateLimit-Remaining`: remaining requests in the current window for the evaluated bucket (returned on all responses).
- `Retry-After`: integer seconds to wait before retrying (returned on `429` responses).

Optional transparency headers:
- `X-RateLimit-Limit` and `X-RateLimit-Reset` (epoch seconds) where supported by the limiter.

**429 response example:**

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Remaining: 0
Retry-After: 120

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry later.",
    "details": { "retryAfterSeconds": 120 },
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

### 10.2 Abuse Protection

- Burst control for auth endpoints (login, token, password reset).
- Per-client throttling for service-to-service OAuth tokens.
- Automatic IP blocking on repeated failed auth attempts.
- Bot mitigation for public endpoints (reCAPTCHA or hCaptcha at the edge).

### 10.3 Security Baseline (BRD 7.4)

The backend must satisfy the following security requirements from the BRD:

- **OWASP Top 10** compliance for all web application components.
- **Encryption at rest:** AES-256 with jurisdiction-specific key management for all data stores.
- **Encryption in transit:** TLS 1.2+ with strong cipher suites for all connections (client-to-server and service-to-service).
- **Automated security scanning** integrated into the CI/CD pipeline (SAST, DAST, dependency scanning).
- **Annual penetration testing** by a third-party firm.
- **Responsible disclosure program** for vulnerability reporting.
- **Zero-trust integration posture:** every integration endpoint authenticated, authorized, encrypted, and audited.

### 10.4 Monitoring & Observability (BRD 8.7)

Backend observability uses Prometheus + Grafana as specified in the BRD technology stack:

- **Metrics:** Prometheus client library exposes HTTP request latency histograms, error rates, queue depths, Redis hit/miss rates, active WebSocket connections, game session counts, and AI generation latency per provider.
- **Dashboards:** Grafana dashboards for API performance (P50/P95/P99 latency), error budgets, queue backpressure, tenant-level resource usage, and infrastructure health.
- **Alerting:** Prometheus Alertmanager triggers on SLA thresholds (API P95 > 200ms, WebSocket P95 > 50ms, error rate > 1%), queue depth exceeding thresholds, and failed health checks.
- **Structured logging:** Pino JSON logs (as defined in Section 2.6) with correlation IDs for distributed tracing readiness.
- **Health endpoints:** `/health` and `/ready` endpoints (Section 2.1) for Kubernetes liveness and readiness probes.

### 10.5 Availability & Deployment (BRD 7.3, 8.6)

The backend must support tiered availability SLAs:

| Tier | SLA | Deployment Strategy |
|------|-----|---------------------|
| Consumer | 99.5% uptime | Rolling deployments, no scheduled downtime |
| Enterprise Standard | 99.9% uptime | 4-hour monthly maintenance window (scheduled) |
| Enterprise Premium | 99.95% uptime | Zero-downtime deployments |

Blue-green deployments are used for zero-downtime updates (BRD 8.6). Containerized with Docker and orchestrated via Kubernetes. CI/CD via GitHub Actions with automated testing, security scanning, and accessibility validation.
