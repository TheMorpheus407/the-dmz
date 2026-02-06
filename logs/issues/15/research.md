# Research: Issue #15 — Unified `pnpm dev` Orchestration

Date: 2026-02-06  
Role: Research Agent (Codex)

## Issue Context
- Issue reviewed via `gh issue view 15 --json ...`.
- Issue comments: none (`comments: []`).
- Required outcome: root-level dev orchestration that starts web+api together, with port/env configurability, port conflict handling, Docker prereq checks, and additional scripts (`dev:web`, `dev:api`, `dev:services`).

## Key Findings
1. Root `pnpm dev` exists, but it currently runs **all workspace `dev` tasks**, including `@the-dmz/shared`, not just web+api.
2. Required scripts `dev:web`, `dev:api`, `dev:services` are missing from root `package.json`.
3. Port strategy is inconsistent with the issue text:
   - Repository baseline is API `3001` (not `3000`) across config, proxy, E2E, CI, and docs in this repo.
   - API uses `PORT`, not `API_PORT`.
   - Web dev uses default Vite port and does not read `WEB_PORT`.
4. There is no root preflight check for Docker services (PostgreSQL/Redis) before app startup.
5. API startup does not require dependencies to be ready; it starts and `/ready` degrades (503) when services are down.
6. Port conflict handling is not implemented as a clear, user-friendly preflight:
   - API surfaces Fastify `EADDRINUSE` logs.
   - Web script does not pass `--strictPort` (Vite flag exists, but not enabled in app dev script).

## Sources Reviewed
- Issue: `logs/issues/15/issue.json`
- Milestone/doc constraints:
  - `docs/MILESTONES.md:64`
  - `docs/DD/08_frontend_architecture_sveltekit.md:202`
  - `docs/DD/09_backend_architecture_api.md:1247`
- Current orchestration/scripts/config:
  - `package.json:10`
  - `turbo.json:8`
  - `apps/web/package.json:6`
  - `apps/api/package.json:6`
  - `packages/shared/package.json:36`
  - `apps/api/src/config.ts:20`
  - `apps/api/src/server.ts:5`
  - `apps/web/vite.config.ts:6`
  - `.env.example:11`
  - `docker-compose.yml:3`
- Runtime/E2E alignment:
  - `playwright.config.ts:46`
  - `e2e/helpers/api.ts:1`
  - `.github/workflows/ci.yml:146`
- Command set expectations:
  - `AGENTS.md:55`

## Current Behavior vs Acceptance Criteria

| Requirement | Current State | Evidence | Status |
| --- | --- | --- | --- |
| Root `pnpm dev` starts web+api concurrently | `pnpm dev` runs Turbo `dev` for all workspaces in scope (`api`, `web`, `shared`) | `package.json:11`, runtime output (`Packages in scope: @the-dmz/api, @the-dmz/shared, @the-dmz/web`) | Partial |
| Labeled stdout/stderr | Turbo prefixes logs by package/task (`@the-dmz/api:dev`, etc.) | runtime output from `pnpm dev` | Mostly met |
| Ctrl+C cleanly stops child processes | Turbo propagates interruption; child watch process is force-killed by `tsx` (`exit 130`) | PTY probe with `turbo run dev --filter=@the-dmz/api` | Partial (works, but noisy/non-graceful UX) |
| Port conflicts produce clear error | No dedicated preflight. API conflict shows raw `EADDRINUSE`; no friendly root message | API conflict probe + `apps/api/src/server.ts:5` | Not met |
| `pnpm dev:web`, `pnpm dev:api`, `pnpm dev:services` | Missing scripts | `package.json:10`; `pnpm run dev:web` => missing script | Not met |
| Docker prerequisite check before starting apps | Not implemented. API can start with services down and only `/ready` returns 503 degraded | no preflight script; probe with services down + `/ready` result | Not met |

## Root Cause Analysis

### Primary Cause
Root orchestration is a generic Turbo call (`turbo run dev --parallel`) with no filtering or preflight logic (`package.json:11`). This delegates behavior to package-local scripts and misses issue-specific requirements (service checks, port checks, explicit commands).

### Secondary Causes
1. **Script surface incomplete at root**
   - Missing `dev:web`, `dev:api`, `dev:services` scripts.
2. **Port contract drift**
   - Issue requests API default `3000`, but repository ecosystem is already standardized around API `3001`:
     - `apps/api/src/config.ts:23`
     - `apps/web/vite.config.ts:9`
     - `.env.example:11-12`
     - `e2e/helpers/api.ts:2`
     - `playwright.config.ts:49-67`
     - `.github/workflows/ci.yml:151-152`
3. **No centralized preflight module**
   - No script currently checks Docker service health or port availability before spawning app servers.
4. **Web dev script lacks strict port behavior**
   - `apps/web/package.json:7` uses `vite dev` without `--strictPort`.

## Runtime Probes Performed

### 1) Root dev behavior
Command: `timeout 20s pnpm dev`  
Observed:
- Turbo started `api`, `web`, and `shared` dev tasks.
- Log prefixes are present per package.
- Local environment hit a permissions artifact in `apps/web/node_modules/.vite/deps/_metadata.json` (root-owned cache file), which caused web startup failure unrelated to issue logic.

### 2) Missing root scripts
Commands:
- `pnpm run dev:web`
- `pnpm run dev:api`
- `pnpm run dev:services`

Observed: all fail with `ERR_PNPM_NO_SCRIPT`.

### 3) Port conflict behavior (API)
Command (with temporary blocker on 3001): `pnpm --filter @the-dmz/api dev`  
Observed:
- Fastify emits `listen EADDRINUSE` with structured error log.
- Process stack comes from `tsx watch`; no user-friendly preflight guidance from root orchestration.

### 4) Docker dependency behavior
Procedure:
- Brought services down.
- Started API dev.
- Called `/health` and `/ready`.

Observed:
- API still started and served `/health` 200.
- `/ready` returned degraded payload with 503:
  - database: `Database connection failed`
  - redis: `Redis connection not configured`
- Confirms no startup prerequisite gate.

## Impacted Modules
- Root orchestration/scripts:
  - `package.json`
  - potentially `scripts/` (new preflight/orchestration helper)
- Workspace dev scripts:
  - `apps/web/package.json`
  - `apps/api/package.json`
- Port/env plumbing:
  - `apps/api/src/config.ts`
  - `apps/web/vite.config.ts`
  - `.env.example`
- Integration consumers (if port contract changes):
  - `playwright.config.ts`
  - `e2e/helpers/api.ts`
  - `.github/workflows/ci.yml`

## Constraints and Decision Points
1. **Port baseline decision required**
   - Issue text says API `3000`, but repository currently aligns on `3001`.
   - Changing to `3000` requires coordinated updates across web proxy, E2E, CI, env examples, and possibly Docker/service docs.
2. **Docker preflight semantics**
   - A strict Docker-running check may block valid non-Docker setups (remote DB/Redis URLs).
   - Better behavior: check only when configured URLs target local defaults, or add opt-out env (e.g., `SKIP_DEV_PREREQ_CHECKS=true`).
3. **Cross-platform implementation**
   - Port and service checks should avoid Linux-specific utilities if possible (prefer Node APIs + `docker compose ps --format json` fallback parsing).
4. **Turbo vs custom orchestrator**
   - Turbo gives labels and process management quickly.
   - Custom script gives stronger control over preflight and error UX.

## Alternative Implementation Approaches

### Approach A: Turbo-centered (minimal delta)
- Keep Turbo for process orchestration and labels.
- Add root scripts:
  - `dev`: preflight script + `turbo run dev --parallel --filter=@the-dmz/web --filter=@the-dmz/api`
  - `dev:web`: `pnpm --filter @the-dmz/web dev`
  - `dev:api`: `pnpm --filter @the-dmz/api dev`
  - `dev:services`: `docker compose up -d`
- Add Node preflight script to:
  - validate ports,
  - verify Docker services health,
  - print actionable failures.

Pros: low risk, keeps existing task graph.  
Cons: preflight and process lifecycle split across shell/Turbo.

### Approach B: `concurrently` orchestration
- Use `concurrently` with named commands `[web]` and `[api]`.
- Add `kill-others-on-fail`, signal handling flags.
- Preflight in `predev` or wrapper script.

Pros: explicit labels and control in one place.  
Cons: extra dependency; diverges from current Turbo-first pattern.

### Approach C: custom Node orchestrator
- Single `scripts/dev-orchestrator.mjs` that:
  - runs preflight checks,
  - spawns `pnpm --filter` child processes,
  - prefixes logs,
  - forwards SIGINT/SIGTERM,
  - ensures cleanup.

Pros: maximum control and testability.  
Cons: highest implementation complexity.

## Risks
1. **Breaking existing 3001 assumptions** if adopting issue’s API 3000 default literally.
2. **False-negative Docker checks** in remote-dev setups.
3. **Race condition between preflight and bind** (TOCTOU) for ports; still need runtime error handling.
4. **Dev UX regressions** if orchestration becomes over-strict or noisy.
5. **Shared package startup coupling** may accidentally persist if Turbo filters are omitted.

## Test Ideas

### Functional smoke tests
1. `pnpm dev` starts only web+api with labeled output.
2. `pnpm dev:web`, `pnpm dev:api`, `pnpm dev:services` each run independently.
3. `Ctrl+C` from root leaves no orphan `vite`/`tsx` processes.

### Negative tests
1. Occupy web port and run `pnpm dev` -> fail fast with clear message naming the port and owning process (if available).
2. Occupy api port and run `pnpm dev` -> same behavior.
3. Stop Docker services and run `pnpm dev` -> actionable message: `Run docker compose up -d first`.

### Config tests
1. `WEB_PORT` and `API_PORT` override defaults and are reflected in startup logs.
2. Web API proxy target follows configured API port.
3. E2E config remains aligned with whichever port contract is chosen.

### Regression tests
1. Existing `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm test:e2e` still pass after script changes.
2. CI env vars in `.github/workflows/ci.yml` remain consistent.

## Recommendation for Implementer
- Prefer **Approach A (Turbo-centered + preflight script)** for least risk.
- First resolve the API default port decision (3000 issue text vs current 3001 repo baseline).
- Implement preflight in Node (not shell-only) for portability and clearer testability.
- Keep `pnpm dev` scoped explicitly to `@the-dmz/web` and `@the-dmz/api` to avoid accidentally starting `@the-dmz/shared` watch mode.
