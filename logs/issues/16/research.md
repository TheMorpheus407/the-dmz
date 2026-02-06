# Research: Issue #16 — Configure .env.example and environment variable validation

## 1. Issue Summary

Create `.env.example` template files and implement Zod-based environment variable validation for both frontend and backend. Applications must fail fast with actionable errors when required variables are missing.

**References:** DD-09 Section 2.1, DD-14 Section 13.1, MILESTONES.md Cross-Cutting Security M0→All

**Dependencies:** #1 (monorepo — CLOSED), #4 (shared packages — CLOSED), #5 (Zod — CLOSED)
**Blocks:** #15 (`pnpm dev` needs env vars — CLOSED, already implemented)

## 2. Current State Analysis

### 2.1 What Already Exists

The codebase has **significant partial implementation** of this issue's requirements:

#### `.env.example` (root) — EXISTS, PARTIAL
File: `.env.example` (18 lines)
```
DATABASE_URL=postgresql://dmz:dmz_dev@localhost:5432/dmz_dev
DATABASE_TEST_URL=postgresql://dmz:dmz_dev@localhost:5432/dmz_test
POSTGRES_USER=dmz
POSTGRES_PASSWORD=dmz_dev
REDIS_URL=redis://localhost:6379
WEB_PORT=5173
API_PORT=3000
PORT=3000
VITE_API_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
JWT_SECRET=dev-secret-change-in-production
```

**Gaps vs. issue requirements:**
- Missing `API_HOST` (issue says `API_HOST=0.0.0.0`)
- Missing `CORS_ORIGINS` (issue says `CORS_ORIGINS=http://localhost:5173`)
- Missing `JWT_EXPIRES_IN` (issue says `JWT_EXPIRES_IN=7d`)
- Missing `DATABASE_POOL_MIN` and `DATABASE_POOL_MAX` (issue says both)
- Missing `PUBLIC_API_BASE_URL` (issue says `PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`)
- Missing `PUBLIC_ENVIRONMENT` (issue mentions frontend validation for this)
- No comments documenting variable purposes
- No classification of secrets vs. public configuration
- Has `PORT` AND `API_PORT` (redundant — the code already handles the fallback)
- Has `VITE_API_URL` but issue calls for `PUBLIC_API_BASE_URL` (SvelteKit convention mismatch discussed below)

#### `.gitignore` — COMPLETE
`.env` and `.env.*` are already ignored, with `!.env.example` exception. This acceptance criterion is already met.

#### Backend Zod Validation — EXISTS, STRONG
File: `apps/api/src/config.ts` (76 lines)
- Zod schema validates: `NODE_ENV`, `PORT`, `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT`, `DATABASE_POOL_CONNECT_TIMEOUT`, `DATABASE_SSL`, `REDIS_URL`, `LOG_LEVEL`
- `loadConfig()` function with `safeParse` and developer-friendly error messages
- `API_PORT` → `PORT` fallback logic (prefers `API_PORT` when both set)
- Transform layer computes production defaults for pool settings
- Type `AppConfig` exported and used to augment Fastify via `fastify.d.ts`
- Tests: `apps/api/src/__tests__/config.test.ts` (5 tests covering port resolution)

**Gaps vs. issue requirements:**
- Does NOT validate `JWT_SECRET` (issue requires it)
- Does NOT validate `CORS_ORIGINS` (issue requires it; currently hardcoded in `app.ts` as `localOrigins` set)
- Does NOT validate `API_HOST` (issue mentions it)
- Does NOT validate `JWT_EXPIRES_IN` (issue mentions it)
- `buildApp()` in `app.ts` calls `loadConfig()` at construction time (line 29), which means validation happens on app build, not in an `onReady` hook. This is actually *better* than the issue's suggestion — it fails immediately, before the server starts listening.

#### Frontend Validation — DOES NOT EXIST
- `apps/web/src/hooks.server.ts` is a no-op stub: `export const handle: Handle = async ({ event, resolve }) => resolve(event);`
- No env validation at all for the SvelteKit app
- `apps/web/src/lib/config/dev-ports.ts` resolves port values from `process.env` but does NOT validate them in a Zod schema
- `apps/web/src/lib/api/client.ts` uses a hardcoded `baseUrl: '/api/v1'` — no env-driven URL

#### Shared Package Env Schema — DOES NOT EXIST
- Issue calls for `packages/shared/src/env.ts` with Zod schemas for backend and frontend
- No such file exists. The backend has its own config validation in `apps/api/src/config.ts`

#### `env:setup` Script — EXISTS
- `scripts/copy-env.mjs` copies `.env.example` → `.env` if `.env` doesn't exist
- Root `package.json` has `"env:setup": "node scripts/copy-env.mjs"`

### 2.2 Port Number Discrepancy

The issue body says `API_PORT=3000`. The MEMORY.md notes an inconsistency:
> API port is 3001 in issues #3/#6/#14/#32 but 3000 in #15/#16. Agent files standardized on 3001.

The existing code uses `3000` as the default everywhere:
- `apps/api/src/config.ts`: `.default(3000)` on PORT
- `scripts/dev-preflight.mjs`: `DEFAULT_API_PORT = 3000`
- `apps/web/src/lib/config/dev-ports.ts`: `DEFAULT_API_PORT = 3000`
- `.env.example`: `API_PORT=3000`, `PORT=3000`
- `app.ts` CORS: `localOrigins` includes `http://localhost:3000`

**Recommendation:** Keep `3000` since the entire codebase already uses it and this issue explicitly says `3000`.

### 2.3 SvelteKit Environment Variable Conventions

SvelteKit has specific conventions for environment variables:
- **`$env/static/private`** — server-only, baked in at build time
- **`$env/static/public`** — client+server, baked in, must start with `PUBLIC_`
- **`$env/dynamic/private`** — server-only, read at runtime
- **`$env/dynamic/public`** — client+server, runtime, must start with `PUBLIC_`

The issue mentions `PUBLIC_API_BASE_URL` and `PUBLIC_ENVIRONMENT`. These align with SvelteKit's `PUBLIC_` prefix convention for client-accessible vars.

However, the current code uses `VITE_API_URL` (a Vite convention, not SvelteKit). This should be migrated to `PUBLIC_API_BASE_URL` to align with SvelteKit conventions.

## 3. Gap Analysis — What Needs to Be Done

### 3.1 `.env.example` Updates (MODIFY)
1. Add missing variables: `API_HOST`, `CORS_ORIGINS`, `JWT_EXPIRES_IN`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `PUBLIC_API_BASE_URL`, `PUBLIC_ENVIRONMENT`
2. Add comments explaining each variable's purpose
3. Mark which variables are secrets vs. public config
4. Decide on `VITE_API_URL` vs. `PUBLIC_API_BASE_URL` (see Section 4.1)
5. Remove redundant `PORT` if `API_PORT` is the canonical variable (or document the fallback)

### 3.2 Shared Package Env Schema (NEW)
The issue requests `packages/shared/src/env.ts`. This is a design decision point:

**Option A (Issue's request):** Create Zod schemas in `packages/shared/src/env.ts`
- Pro: Single source of truth, reusable across apps
- Con: The backend already has its own `config.ts` with working validation — adding a shared version creates duplication. Also, backend env vars (DATABASE_URL, REDIS_URL) are meaningless to the frontend, and vice versa.

**Option B (Pragmatic):** Keep backend validation in `apps/api/src/config.ts`, add frontend validation in `apps/web/src/lib/config/env.ts`, and put only truly shared schemas (if any) in the shared package
- Pro: Each app validates only its own concerns; no circular dependency risk
- Con: Deviates from issue text

**Recommendation:** Option A as written in the issue, but structure it so each app imports only what it needs. The shared package defines the schemas; each app calls validation at startup.

### 3.3 Backend Config Gaps (MODIFY `apps/api/src/config.ts`)
Add validation for:
- `JWT_SECRET` — `z.string().min(1)` (required, no default in production)
- `CORS_ORIGINS` — `z.string().default('http://localhost:5173')` (comma-separated list)
- `API_HOST` — `z.string().default('0.0.0.0')`
- `JWT_EXPIRES_IN` — `z.string().default('7d')`
- `DATABASE_POOL_MIN` — `z.coerce.number().int().positive().optional()`

### 3.4 Frontend Validation (NEW)
Add validation in `apps/web/src/hooks.server.ts` or a dedicated config module:
- `PUBLIC_API_BASE_URL` — validate at server startup
- `PUBLIC_ENVIRONMENT` — validate allowed values

SvelteKit's `hooks.server.ts` runs once on server startup. Alternatively, a dedicated `$lib/config/env.ts` module can be imported from `hooks.server.ts`.

### 3.5 Existing Tests (UPDATE)
- `apps/api/src/__tests__/config.test.ts` — add tests for new fields (JWT_SECRET, CORS_ORIGINS, etc.)
- Add `apps/web/src/lib/config/env.test.ts` for frontend validation
- If creating `packages/shared/src/env.ts`, add `packages/shared/src/env.test.ts`

## 4. Design Decisions Required

### 4.1 `VITE_API_URL` vs. `PUBLIC_API_BASE_URL`

The issue says `PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`. The current code uses `VITE_API_URL=http://localhost:3000` (no `/api/v1` suffix).

However, in the current architecture, the SvelteKit dev server proxies `/api` requests to the Fastify backend. The `client.ts` uses a hardcoded `baseUrl: '/api/v1'`. This means the frontend doesn't actually need to know the backend's absolute URL — it just uses relative paths.

**In development:** Vite proxy handles `/api` → `http://localhost:3000`
**In production:** SvelteKit adapter-node serves static files; API is either co-located or behind a reverse proxy

`PUBLIC_API_BASE_URL` makes most sense for production deployments where the API is on a different origin. For development, the proxy makes it unnecessary.

**Recommendation:** Add `PUBLIC_API_BASE_URL` with a default of `/api/v1` (relative). Only set it to an absolute URL in production if the API is on a different origin. Keep `VITE_API_URL` as the Vite proxy target (build-time only, not exposed to the client).

### 4.2 Shared Schema Location

The issue specifically says `packages/shared/src/env.ts`. The current backend config (`apps/api/src/config.ts`) is well-structured and tested. Options:

1. **Move everything to shared** — Risk: shared package would depend on all env var semantics
2. **Keep app-specific configs, add shared base types** — Shared defines `NodeEnv`, `LogLevel` enums; each app extends
3. **Follow issue literally** — Create `packages/shared/src/env.ts` with both schemas

**Recommendation:** Follow the issue. Create `packages/shared/src/env.ts` with `backendEnvSchema` and `frontendEnvSchema`. The backend `config.ts` can then import from shared or be replaced. Keep it DRY.

### 4.3 JWT_SECRET Production Guard

The issue's `.env.example` shows `JWT_SECRET=dev-only-change-in-production`. The existing `.env.example` has `JWT_SECRET=dev-secret-change-in-production`. Either way, in production, using a default is dangerous.

**Recommendation:** The Zod schema should have a `.refine()` that rejects default/weak JWT secrets when `NODE_ENV=production`. Example:
```typescript
JWT_SECRET: z.string().min(1).refine(
  (val) => process.env.NODE_ENV !== 'production' || !val.startsWith('dev-'),
  'JWT_SECRET must be changed from the default in production'
)
```

### 4.4 Validation Timing

Issue says: "Call validation at application startup (Fastify `onReady` hook, SvelteKit `hooks.server.ts`)"

Current behavior: `buildApp()` calls `loadConfig()` synchronously at construction time, which is *before* `onReady`. This is fine — it fails even earlier, which is better.

**Recommendation:** Keep the current backend pattern (validate on app construction). For frontend, validate in a module imported by `hooks.server.ts` so it fails on first request (SvelteKit doesn't have a true "startup" hook — `hooks.server.ts` is loaded lazily on first request in dev mode).

## 5. Impacted Modules

| File | Change Type | Description |
|------|-------------|-------------|
| `.env.example` | MODIFY | Add missing vars, add comments, classify secrets |
| `packages/shared/src/env.ts` | NEW | Zod schemas for backend + frontend env vars |
| `packages/shared/src/env.test.ts` | NEW | Tests for shared env schemas |
| `packages/shared/src/index.ts` | MODIFY | Re-export env schemas |
| `apps/api/src/config.ts` | MODIFY | Import from shared, add missing fields |
| `apps/api/src/__tests__/config.test.ts` | MODIFY | Add tests for new fields |
| `apps/api/src/server.ts` | POSSIBLY | Use `API_HOST` from config |
| `apps/api/src/app.ts` | MODIFY | Use `CORS_ORIGINS` from config instead of hardcoded set |
| `apps/web/src/hooks.server.ts` | MODIFY | Add env validation call |
| `apps/web/src/lib/config/env.ts` | NEW or reuse `dev-ports.ts` | Frontend env validation |
| `apps/web/src/lib/config/env.test.ts` | NEW | Frontend env validation tests |
| `scripts/dev-preflight.mjs` | REVIEW | Ensure env vars align with new schema |

## 6. Risks and Concerns

### 6.1 Breaking Existing `pnpm dev`
Issue #15 is already closed and working. Adding required env vars that aren't in the current `.env.example` could break the dev workflow if developers haven't run `env:setup` recently. Mitigation: keep all new vars with safe defaults.

### 6.2 Shared Package Build Order
The shared package must be built before `apps/api` and `apps/web` can use its exports. This is already handled by Turborepo's `dependsOn` in `turbo.json`. Ensure `packages/shared/src/env.ts` is included in the build output.

### 6.3 SvelteKit `$env` vs. `process.env`
SvelteKit has its own env handling via `$env/static/*` and `$env/dynamic/*`. Using `process.env` directly in SvelteKit code may not work as expected during SSR. The validation should use SvelteKit's `$env` modules for runtime access and `process.env` only in `vite.config.ts` (which runs in Node.js context).

### 6.4 Test Isolation
Config tests must not pollute `process.env`. The existing backend tests pass env objects to `loadConfig(env)` — this pattern should be followed for all new tests.

### 6.5 Circular Dependency Risk
If the shared package exports env schemas and the apps import them, ensure the shared package doesn't import anything from the apps. Currently `@the-dmz/shared` has no app dependencies, and env schemas are pure Zod — no risk.

## 7. Test Strategy

### Unit Tests
1. **Shared env schema** (`packages/shared/src/env.test.ts`):
   - Valid complete env passes validation
   - Missing required fields fail with clear messages
   - Invalid types (non-numeric PORT, invalid LOG_LEVEL) are rejected
   - Defaults are applied correctly for development
   - JWT_SECRET production guard triggers
   - CORS_ORIGINS parsing works with single and multiple origins

2. **Backend config** (`apps/api/src/__tests__/config.test.ts`):
   - Existing 5 tests continue to pass
   - New fields (JWT_SECRET, CORS_ORIGINS, API_HOST) validated
   - Production mode rejects weak JWT_SECRET
   - DATABASE_POOL_MIN handled correctly

3. **Frontend config** (`apps/web/src/lib/config/env.test.ts`):
   - PUBLIC_API_BASE_URL validation
   - PUBLIC_ENVIRONMENT validation
   - Missing required fields produce actionable errors

### Integration Tests
- `pnpm dev` still starts successfully with current `.env.example` values
- Application startup fails with clear error when DATABASE_URL is missing
- Application startup fails with clear error when JWT_SECRET is missing in production mode

## 8. Implementation Approach

### Recommended Order
1. Update `.env.example` with all variables and comments
2. Create `packages/shared/src/env.ts` with both schemas
3. Add tests for shared schemas
4. Update `apps/api/src/config.ts` to use shared schema (or extend it)
5. Add missing fields to backend config schema
6. Update `apps/api/src/app.ts` to use CORS_ORIGINS from config
7. Update `apps/api/src/server.ts` to use API_HOST from config
8. Create frontend env validation module
9. Wire frontend validation into `hooks.server.ts`
10. Update all tests
11. Verify `pnpm dev` still works end-to-end

### Key Constraint
All new env vars MUST have safe development defaults. No env var should be required without a default unless it genuinely cannot have one (like `DATABASE_URL` — but even that already has a default for local dev).
