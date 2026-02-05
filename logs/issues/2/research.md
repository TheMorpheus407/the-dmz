# Research: Issue #2 — Scaffold SvelteKit frontend application

## Key Findings
- `apps/web` is currently a stub: only `src/lib/shared.ts` exists and the `package.json` scripts print "not configured"; there is no SvelteKit config, routes, or app shell yet.
- DD-08 specifies the route group boundaries and state layering; the issue requirements map directly to DD-08 Sections 7, 8, and 10.
- Backend API paths are versioned under `/api/v1/*` per DD-09, so the Vite proxy should likely forward `/api` or `/api/v1` to `http://localhost:3001`.

## Current Behavior (Repository State)
- `apps/web/package.json` contains placeholder scripts only; `pnpm --filter web dev` currently prints "dev not configured for web yet" and does not start a dev server. (`apps/web/package.json`)
- `apps/web/src/` contains only `lib/shared.ts` with a trivial re-export; there are no `routes/`, `app.html`, `app.css`, `hooks.*`, or Svelte files. (`apps/web/src/lib/shared.ts`)
- There is no `svelte.config.js`, `vite.config.ts`, or `tsconfig.json` under `apps/web/`.

## Root Cause
The SvelteKit app scaffold has not been created yet. The web workspace is a placeholder without the required SvelteKit project structure, configuration, dependencies, or route groups.

## Requirements Summary (from Issue + DD-08)
- SvelteKit 2.x with Svelte 5 (runes mode), Vite, and `@sveltejs/adapter-node`.
- Route groups: `(public)`, `(auth)`, `(game)`, `(admin)` with minimal placeholder pages.
- `src/lib` structure with placeholders for game state modules, services, UI, stores, utils, and API client stubs.
- `hooks.server.ts`, `hooks.client.ts`, `app.html`, `app.css` created.
- HTML shell has `data-theme="green"` on `<html>`.
- Aliases: `$lib`, `$api`, `$ui`, `$stores`, `$utils`, `$game`.
- Vite proxy to backend API at `http://localhost:3001`.
- `lib/game/state/` must include placeholder types for `GameState` and event types.

## Design Doc Notes (DD-08)
- **Section 7 (Project Structure & Boundaries):** Game modules under `src/lib/game` must not import from `src/lib/admin`, and vice versa. Shared UI primitives live in `src/lib/ui`. API access centralized under `src/lib/api`. Cross-cutting state in `src/lib/stores`.
- **Section 8 (Routing & Layout):** Route groups separate `(public)`, `(auth)`, `(game)`, `(admin)` with dedicated layouts. Auth guards go in `hooks.server.ts`/`+layout.server.ts` later.
- **Section 10 (State Strategy):** Game state is event-sourced in `src/lib/game/state` with reducer + event log; local UI state uses Svelte 5 runes; global stores for session/theme/settings/etc.

## Impacted Modules / Files
- `apps/web/package.json` (scripts, dependencies).
- `apps/web/svelte.config.js` (adapter-node, alias configuration).
- `apps/web/vite.config.ts` (proxy, SvelteKit plugin).
- `apps/web/tsconfig.json` (strict mode, path aliases, link to root `tsconfig.base.json`).
- `apps/web/src/routes/**` (route groups, layouts, placeholder pages).
- `apps/web/src/lib/**` (api, game state, services, ui, stores, utils).
- `apps/web/src/hooks.server.ts`, `apps/web/src/hooks.client.ts`.
- `apps/web/src/app.html`, `apps/web/src/app.css`.

## Constraints & Considerations
- **TypeScript strict:** Root `tsconfig.base.json` must be referenced or extended, while still honoring SvelteKit’s generated `.svelte-kit/tsconfig.json`.
- **No default exports:** Project standard says “Named exports only.” SvelteKit config files typically use default exports; clarify if configs are exempt or use named export patterns if feasible.
- **Content safety:** Placeholder pages must avoid real company names, URLs, or PII.
- **Route boundaries:** Keep game/admin imports separated to respect DD-08 boundary rules.

## Alternatives / Approaches
1. **Use `create-svelte` scaffolding** and then adjust to meet DD-08 structure (preferred for correctness and minimal boilerplate mistakes).
2. **Manual scaffold** with minimal SvelteKit config and files, avoiding extra boilerplate. Faster but higher risk of misconfigured TS/alias settings.

## Risks
- **TS config mismatch:** If `tsconfig.json` doesn’t correctly extend both root base config and SvelteKit generated config, `svelte-check`/TypeScript may fail or path aliases may not resolve.
- **Proxy path mismatch:** Backend routes are `/api/v1/*` (DD-09); proxy should match actual API base.
- **No-default-export conflict:** SvelteKit config files usually require default export; might conflict with code standards without an explicit exception.
- **HMR/Dev server:** Missing or incorrect `svelte.config.js` or `vite.config.ts` will break `pnpm --filter web dev`.

## Test Ideas
- `pnpm --filter web dev` to confirm SvelteKit dev server starts and HMR works.
- `pnpm --filter web typecheck` (or `svelte-check`) to verify TypeScript + alias resolution.
- `pnpm --filter web build` to ensure adapter-node output and Vite config are valid.
- Open the four route groups in dev server to confirm placeholder pages render.

## References
- `docs/DD/08_frontend_architecture_sveltekit.md` (Sections 7, 8, 10)
- `docs/DD/09_backend_architecture_api.md` (API path prefixes `/api/v1/*`)
- `docs/MILESTONES.md` (M0/M1 frontend route groups and exit criteria)
- `apps/web/package.json`, `apps/web/src/lib/shared.ts`
