# Implementation: Issue #15 — Unified `pnpm dev` orchestration

Date: 2026-02-06  
Role: Implementer Agent (Codex)

## Summary
Implemented unified root dev orchestration for web+api with preflight checks, port/env configurability, and standalone dev scripts, then completed a full validation pass against issue #15 acceptance criteria.

This implementation now provides:
- Root `pnpm dev` scoped to `@the-dmz/web` and `@the-dmz/api` with labeled output (Turbo task prefixes).
- `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev:services` scripts.
- Preflight validation before `dev`:
  - Docker services check for `postgres` and `redis` with actionable guidance.
  - Port validation for `WEB_PORT` and `API_PORT` including duplicate/conflict detection.
- Environment-driven port behavior (`WEB_PORT`, `API_PORT`, `PORT`) aligned across preflight, API config, and web proxy resolution.
- API graceful shutdown hooks for `SIGINT`/`SIGTERM`.

## Changes Made
1. Root orchestration and script surface.
- Added `predev`, updated `dev` to filtered parallel Turbo execution, and added `dev:web`, `dev:api`, `dev:services` in `package.json`.
- Added `test:scripts` for preflight unit coverage in `package.json`.
- Added Turbo env pass-through for dev tasks in `turbo.json`.

2. Preflight checks.
- Added `scripts/dev-preflight.mjs` with:
  - Port parsing/validation and fallback logic.
  - Docker running-service verification.
  - Conflict detection and clear failure messages.

3. Preflight tests.
- Added `scripts/dev-preflight.test.mjs` (Node test runner) covering defaults, env overrides, malformed inputs, duplicate ports, port-in-use detection, and Docker warning behavior.

4. API configuration and shutdown behavior.
- Updated API port default and env normalization in `apps/api/src/config.ts` (`API_PORT` -> `PORT` fallback semantics).
- Added API config tests in `apps/api/src/__tests__/config.test.ts`.
- Added SIGINT/SIGTERM shutdown handling in `apps/api/src/server.ts`.
- Updated API dev command to `node --watch --import tsx src/server.ts` in `apps/api/package.json`.

5. Web dev port/proxy alignment.
- Added `apps/web/src/lib/config/dev-ports.ts` and tests in `apps/web/src/lib/config/dev-ports.test.ts`.
- Updated `apps/web/vite.config.ts` to use resolved ports/proxy target and enforce strict web port binding.

6. Port baseline alignment artifacts.
- Updated `.env.example`, `e2e/helpers/api.ts`, `.github/workflows/ci.yml`, and `apps/api/Dockerfile` to API port `3000` baseline.

7. Workspace blocker remediation (validation-only).
- Resolved pre-existing permission artifact by fixing ownership on `packages/shared/dist` so `pnpm test` could run successfully.

## Files Touched
- `.env.example`
- `.github/workflows/ci.yml`
- `apps/api/Dockerfile`
- `apps/api/package.json`
- `apps/api/src/config.ts`
- `apps/api/src/server.ts`
- `apps/api/src/__tests__/config.test.ts`
- `apps/web/vite.config.ts`
- `apps/web/src/lib/config/dev-ports.ts`
- `apps/web/src/lib/config/dev-ports.test.ts`
- `e2e/helpers/api.ts`
- `package.json`
- `scripts/dev-preflight.mjs`
- `scripts/dev-preflight.test.mjs`
- `turbo.json`
- `logs/issues/15/implementation.md`

## Tests and Validation Run
- `pnpm test:scripts` — PASS (16/16)
- `pnpm --filter @the-dmz/api test` — PASS (14/14)
- `pnpm --filter @the-dmz/web test` — PASS (10/10)
- `pnpm lint` — PASS
- `pnpm typecheck` — PASS
- `pnpm predev` — PASS
- `pnpm test` — PASS (after fixing `packages/shared/dist` ownership artifact)

Runtime smoke checks:
- `pnpm dev` — PASS (web+api started concurrently with labeled output; predev ran first)
- Interactive `Ctrl+C` during `pnpm dev` — PASS (SIGINT propagated; API logged graceful shutdown; no orphan dev processes)
- `timeout 20s pnpm dev:web` — PASS startup (terminated by timeout as expected)
- `timeout 20s pnpm dev:api` — PASS startup (terminated by timeout as expected)
- `pnpm dev:services` — PASS

Negative-path checks:
- Port conflict: binding `5173` externally then running `pnpm predev` returned:
  - `Dev preflight failed: WEB_PORT port 5173 is already in use. Set WEB_PORT/API_PORT to open ports and retry.`
- Docker down: `docker compose down` then `pnpm predev` returned:
  - `Dev preflight failed: Docker services not running: postgres, redis. Run \`docker compose up -d\` first.`

## Commit Status
No commit created (per instruction).
