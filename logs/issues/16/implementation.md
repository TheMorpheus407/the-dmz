# Implementation: Issue #16 — Configure .env.example and environment variable validation

## Summary

Implemented comprehensive environment variable documentation and Zod-based validation across the monorepo. The `.env.example` documents all required variables with comments classifying secrets vs. public configuration. Shared Zod schemas in `@the-dmz/shared` provide a single source of truth for both backend and frontend env validation. Both applications fail fast with developer-friendly error messages when required variables are missing or misconfigured.

This is the second implementation pass, fixing the two issues identified by reviewers in the first pass:

1. **Lint blocker**: Fixed import order in `apps/web/src/hooks.server.ts` — moved `$lib/config/env.js` import before the type import from `@sveltejs/kit`, with a blank line between import groups (required by `import-x/order`).
2. **Comment discrepancy**: Fixed `.env.example` line 91 — changed `development | staging | production` to `development | test | production` to match the Zod schema's `nodeEnvValues`.

## Changes Made (This Pass)

### 1. `apps/web/src/hooks.server.ts` — FIX
- Reordered imports: `$lib/config/env.js` (value import) now comes before `@sveltejs/kit` (type import)
- Added blank line between import groups to satisfy `import-x/order` ESLint rule

### 2. `.env.example` — FIX
- Changed `PUBLIC_ENVIRONMENT` comment from `development | staging | production` to `development | test | production` to match the Zod schema

## Changes Made (Previous Pass, Retained)

### 3. `.env.example` (root) — REWRITTEN
- Added all missing variables: `API_HOST`, `CORS_ORIGINS`, `JWT_EXPIRES_IN`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `PUBLIC_API_BASE_URL`, `PUBLIC_ENVIRONMENT`
- Added section headers and comments explaining each variable's purpose
- Classified variables as `[SECRET]` or `[PUBLIC]` where applicable
- Documented commented-out optional variables (`DATABASE_POOL_IDLE_TIMEOUT`, `DATABASE_POOL_CONNECT_TIMEOUT`, `DATABASE_SSL`)
- Kept `PORT` alongside `API_PORT` with a comment explaining the fallback behavior

### 4. `packages/shared/src/env.ts` — NEW
- Created `backendEnvSchema` Zod schema validating: `NODE_ENV`, `PORT`, `API_HOST`, `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT`, `DATABASE_POOL_CONNECT_TIMEOUT`, `DATABASE_SSL`, `REDIS_URL`, `LOG_LEVEL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`
- Transform layer computes environment-aware defaults (pool sizes, SSL, `CORS_ORIGINS_LIST`)
- Production guard: `.refine()` rejects `JWT_SECRET` values starting with `dev-` when `NODE_ENV=production`
- Created `frontendEnvSchema` Zod schema validating: `PUBLIC_API_BASE_URL`, `PUBLIC_ENVIRONMENT`
- Exported `parseBackendEnv()` and `parseFrontendEnv()` helper functions with developer-friendly error messages
- Exported types: `BackendEnv`, `FrontendEnv`, `NodeEnv`, `LogLevel`

### 5. `packages/shared/src/env.test.ts` — NEW (20 tests)
- Backend: valid env, defaults, production defaults, CORS parsing, non-numeric PORT, invalid LOG_LEVEL, empty DATABASE_URL, JWT_SECRET production guard (reject + allow), DATABASE_SSL parsing, explicit pool overrides
- Frontend: valid env, defaults, absolute URL, invalid PUBLIC_ENVIRONMENT, empty PUBLIC_API_BASE_URL, production acceptance

### 6. `packages/shared/src/index.ts` — MODIFIED
- Added `export * from './env.js'` re-export

### 7. `apps/api/src/config.ts` — REWRITTEN
- Now imports `BackendEnv` and `parseBackendEnv` from `@the-dmz/shared` instead of maintaining its own Zod schema
- `AppConfig` type alias points to shared `BackendEnv`
- `loadConfig()` still handles the `API_PORT` → `PORT` fallback normalization before delegating to `parseBackendEnv()`
- Removed duplicated Zod schema (~40 lines) in favor of the shared package

### 8. `apps/api/src/app.ts` — MODIFIED
- Replaced hardcoded `localOrigins` Set with `buildCorsOriginSet()` function that builds from `config.CORS_ORIGINS_LIST`
- Automatically includes `127.0.0.1` variants of `localhost` origins
- CORS origin check now uses config-driven `allowedOrigins` instead of hardcoded values

### 9. `apps/api/src/server.ts` — MODIFIED
- Changed `host: '0.0.0.0'` to `host: app.config.API_HOST` so the bind address is configurable

### 10. `apps/web/src/lib/config/env.ts` — NEW
- `loadFrontendConfig()` wraps `parseFrontendEnv()` with caching (validates once on first call)
- `resetFrontendConfigCache()` exposed for test isolation

### 11. `apps/web/src/lib/config/env.test.ts` — NEW (6 tests)
- Valid env, defaults, caching behavior, invalid PUBLIC_ENVIRONMENT, empty PUBLIC_API_BASE_URL, absolute URL

### 12. `apps/api/src/__tests__/config.test.ts` — REWRITTEN (17 tests, up from 5)
- Original 5 port resolution tests preserved (grouped under `port resolution` describe block)
- Added: `API_HOST` (2 tests), `JWT_SECRET` (3 tests), `JWT_EXPIRES_IN` (2 tests), `CORS_ORIGINS` (2 tests), `database pool` (3 tests)

## Files Touched

| File | Action |
|------|--------|
| `.env.example` | Rewritten + comment fix |
| `packages/shared/src/env.ts` | Created |
| `packages/shared/src/env.test.ts` | Created |
| `packages/shared/src/index.ts` | Modified (1 line added) |
| `apps/api/src/config.ts` | Rewritten |
| `apps/api/src/app.ts` | Modified (CORS logic) |
| `apps/api/src/server.ts` | Modified (1 line) |
| `apps/web/src/lib/config/env.ts` | Created |
| `apps/web/src/lib/config/env.test.ts` | Created |
| `apps/web/src/hooks.server.ts` | Modified (import order fix) |
| `apps/api/src/__tests__/config.test.ts` | Rewritten |

## Tests Run

| Workspace | Result | Tests |
|-----------|--------|-------|
| `@the-dmz/shared` | 7 files, **53 passed** | 20 new env tests + 33 existing |
| `@the-dmz/api` | 3 files, **26 passed** | 17 config tests (up from 5) + 9 existing |
| `@the-dmz/web` | 4 files, **16 passed** | 6 new env tests + 10 existing |
| **Total** | **95 tests passing** | 0 failures |

## Quality Checks

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS (0 errors, 0 warnings) |
| `pnpm typecheck` | PASS (0 errors, 0 warnings) |
| `pnpm test` | PASS (95/95 tests) |

## Acceptance Criteria Status

- [x] `.env.example` exists at repo root with all required variables documented
- [x] Zod validation schema exists in shared package for all env vars (`packages/shared/src/env.ts`)
- [x] Backend fails fast with clear error if required env var is missing
- [x] Frontend fails fast with clear error if required env var is missing
- [x] `.env` and `.env.local` are in `.gitignore` (was already done)
- [x] No real secrets in `.env.example` (only safe dev defaults)
- [x] Comments explain each variable's purpose

## Reviewer Feedback Addressed

| Reviewer | Issue | Status |
|----------|-------|--------|
| Review A | Lint error: `import-x/order` in `hooks.server.ts` | FIXED |
| Review A | `.env.example` says "staging" but schema uses "test" | FIXED |
| Review B | Lint error: `import-x/order` in `hooks.server.ts` | FIXED |
| Review B | `.env.example` mentions "staging" but schema rejects it | FIXED |

## Design Decisions

1. **Port**: Kept `3000` as the default, matching the existing codebase and this issue's specification.
2. **Shared schemas**: Followed the issue — both schemas live in `packages/shared/src/env.ts` and are imported by each app.
3. **Backend validation timing**: Kept the existing pattern of validating at `buildApp()` construction time (before `onReady`), which fails even earlier.
4. **Frontend validation timing**: `hooks.server.ts` calls `loadFrontendConfig()` at module load, which validates on the first request in dev mode.
5. **CORS origins**: Config-driven from `CORS_ORIGINS` env var, automatically expanded to include `127.0.0.1` variants of `localhost` origins.
6. **JWT production guard**: Uses `.refine()` to reject secrets starting with `dev-` in production.
7. **`PUBLIC_API_BASE_URL`**: Defaults to `/api/v1` (relative) for development proxy compatibility. Can be set to an absolute URL in production.
