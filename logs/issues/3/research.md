# Issue #3 Research - Scaffold Fastify backend application

## Summary
Issue #3 asks to scaffold the Fastify backend in `apps/api` following DD-09's modular monolith layout, with health/readiness endpoints, config validation, structured logging, and a global error handler. Current repo state shows `apps/api` is a minimal placeholder with no server, no tsconfig, and no module structure yet.

## Key Findings
- `apps/api` currently has only `package.json`, `scripts/verify-shared-import.mjs`, and a single placeholder file `apps/api/src/shared/shared-import.ts`. There is no `server.ts`, `app.ts`, `config.ts`, or `tsconfig.json` yet.
- DD-09 defines a precise module directory layout and a Fastify app structure with plugin encapsulation, Pino logging, UUIDv7 request IDs, and `/health` + `/ready` endpoints.
- There are spec conflicts to resolve: DD-09 examples use default exports for plugins, but repo-wide standards forbid default exports; issue requirements specify an error envelope with `success: false`, while DD-09's standard error envelope omits a `success` field.
- Health endpoints are shown in DD-09 as app-level routes, while the issue requires a dedicated `modules/health` plugin with service/routes.
- Event bus and DB/Redis connections are explicitly placeholders for M0; issue #28 will implement the event bus. The readiness endpoint still needs to check DB/Redis connectivity but should degrade gracefully when placeholders are used.

## Current Behavior (Repo State)
- `apps/api/package.json` contains placeholder scripts (dev/build/lint/typecheck all echo "not configured").
- No `apps/api/tsconfig.json` exists. `apps/api/src` contains only `shared/shared-import.ts`, which imports `@the-dmz/shared`.
- There is no Fastify app, no config validation, no health endpoints, and no logging configuration.

## Relevant Design Docs and Constraints
### DD-09 (Backend Architecture and API)
- Module directory layout (Section 1.2) specifies `src/modules/{module-name}/{module-name}.plugin.ts`, `.routes.ts`, `.service.ts`, plus shared `events`, `middleware`, `database`, `types`, `utils`.
- Fastify app structure (Section 2): encapsulated plugins, global hooks, decorators, and health endpoints.
- Error handling (Section 2.5): standardized error envelope with registry (`ErrorCodes`) and Fastify error handler.
- Logging (Section 2.6): structured JSON logs via Pino with redaction of auth/cookie/password fields and request ID/tenant context.
- Request IDs: example uses UUIDv7 for `genReqId`.

### DD-14 (Integration and Infrastructure)
- Reinforces modular monolith, route schema as source of truth, and Fastify backend on Node 22 / TS 5.

### Repo Standards (SOUL.md + AGENTS)
- No default exports (conflicts with DD-09 sample plugin export). Must use named exports.
- TypeScript strict everywhere, `moduleResolution: Bundler` from `tsconfig.base.json`.
- No secrets committed; env vars only.

## Root Cause Analysis
This issue exists because M0 scaffolding is not yet done: `apps/api` is still a placeholder and lacks the required Fastify structure, config, and endpoints. The monorepo base exists, but the backend app itself is uninitialized.

## Impacted Modules and Files
Expected additions or changes:
- `apps/api/src/server.ts` (entry point)
- `apps/api/src/app.ts` (build Fastify app, register plugins)
- `apps/api/src/config.ts` (Zod env validation)
- `apps/api/src/modules/health/*` (health plugin/routes/service)
- `apps/api/src/shared/events/*` (placeholder event-bus + event-types)
- `apps/api/src/shared/middleware/*` (error handler, request logger)
- `apps/api/src/shared/database/*` (connection + redis placeholder + migrations dir)
- `apps/api/src/shared/types/*` (Fastify type augments + ApiResponse/Pagination)
- `apps/api/src/shared/utils/*` (UUIDv7 + date helpers)
- `apps/api/tsconfig.json`
- `apps/api/package.json` scripts and deps

## Spec Conflicts and Decisions to Resolve
1. Default exports vs repo rule: DD-09 sample uses `export default fp(authPlugin, ...)`, but repo forbids default exports. Use named exports and register via named import.
2. Error envelope format: Issue demands `{ success: false, error: { ... } }`, while DD-09's standard error envelope omits `success` and uses `{ error: { ... } }`. Decide which to follow; likely honor issue requirement but note divergence for future consistency.
3. Health endpoint placement: DD-09 example uses app-level routes, but issue requires a `health` module. Implement health as a plugin per issue to satisfy acceptance.

## Alternative Implementation Approaches
- Minimal scaffolding: create skeleton files with simple placeholders for DB/Redis and event bus; keep config minimal and avoid non-required plugins (cors/helmet/rate-limit) until later issues. Fastest path to acceptance criteria.
- Full DD-09 scaffolding: include cors/helmet/rate-limit/websocket and request hooks immediately. More aligned with architecture, but risks scope creep and dependency churn before related issues (#29, #33, etc.).
- Use `@fastify/healthcheck` instead of custom module: quicker but diverges from DD-09 and issue-required module structure.

## Risks and Edge Cases
- Readiness check: With placeholder DB/Redis clients, `/ready` may always fail unless placeholders intentionally simulate connectivity. Need a safe, deterministic failure that returns 503 when not connected.
- Logging: Pino redaction and request ID propagation must be configured carefully in Fastify 5 with ESM. If `pino-pretty` is used for dev, ensure it does not break structured JSON requirement in non-dev.
- ESM + tsx: Node 22 ESM + Fastify 5 requires correct `tsx` invocation and `tsconfig` module settings. Mismatched module settings can break runtime imports.
- Error format divergence: choosing `success: false` now may require a follow-up alignment across endpoints later.

## Test Ideas
- Unit: build app and `inject` GET `/health` returns 200 with `{ status: "ok" }`.
- Unit: stub DB/Redis to fail and verify `/ready` returns 503 with degraded payload.
- Unit: config validation rejects missing required env vars and logs a clear error.
- Unit: global error handler formats errors with `error.code`, `error.message`, and request ID; ensure validation errors map to `VALIDATION_FAILED`.
- Integration smoke: `pnpm --filter api dev` starts server on port 3001 and serves `/api/v1/` root with version info.

## Dependencies and Related Issues
- Depends on #1 (workspace initialization) but workspace exists. Event bus implementation is deferred to #28.

## Suggested Implementation Scope (Research Opinion)
Start with minimal scaffolding that satisfies the acceptance criteria and avoids pulling in unrelated middleware (helmet, rate-limit, etc.) until their dedicated issues. Implement health module, config validation, request logging, error handler, and placeholder DB/Redis/event bus with safe readiness behavior.
