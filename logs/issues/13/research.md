# Research: Issue #13 — Vitest Unit Testing Infrastructure

## Scope And Inputs
- Read issue `#13` body and all comments via `gh issue view 13 --comments --json ...`.
- Reviewed current implementation files across root, API, web, shared, and CI.
- Reviewed design constraints in:
  - `docs/DD/08_frontend_architecture_sveltekit.md` (Section 24: Testing and Quality Strategy, Section 26: CI requirements)
  - `docs/DD/09_backend_architecture_api.md` (module structure requiring `__tests__/` under modules)
  - `docs/MILESTONES.md` (M0 testing infrastructure deliverable)
- Executed verification commands locally (tests, coverage, watch mode probes).

## Key Findings
- The issue’s requested Vitest infrastructure is already present and functioning in the current tree.
- All three packages have passing tests and coverage output directories:
  - `packages/shared`
  - `apps/api`
  - `apps/web`
- `@testing-library/svelte` + `jsdom` integration is correctly wired for web component tests.
- API smoke tests are implemented with Fastify `inject` and are passing.
- CI already runs tests with coverage and uploads coverage artifacts.
- Remaining friction is operational, not structural:
  - root `vitest.workspace.ts` is not currently executable from repo root via `pnpm exec vitest` (no root-level `vitest` binary),
  - API/web consume `@the-dmz/shared` from `dist/`, so direct package runs are coupled to shared build state.

## Current Behavior (Observed)

### 1) Scripts And Task Graph
- Root scripts in `package.json` include `test`, `test:watch`, `test:coverage`.
- Turbo tasks in `turbo.json` define:
  - `test` and `test:coverage` with `dependsOn: ["^build"]`
  - `test:watch` as persistent/non-cached.
- Root workspace file exists:
  - `vitest.workspace.ts` exports `['apps/api', 'apps/web', 'packages/shared']`.

### 2) Per-Package Vitest Configuration
- API: `apps/api/vitest.config.ts`
  - `environment: 'node'`
  - `setupFiles: ['src/__tests__/setup.ts']`
  - includes `src/**/__tests__/**/*.test.ts`, `src/**/*.spec.ts`
  - v8 coverage with `text`, `lcov`, `html`.
- Web: `apps/web/vitest.config.ts`
  - plugins: `sveltekit()` and `svelteTesting()`
  - `environment: 'jsdom'`
  - `setupFiles: ['src/__tests__/setup.ts']`
  - alias map matches `apps/web/svelte.config.js`
  - coverage includes `src/**/*.{ts,svelte}`.
- Shared: `packages/shared/vitest.config.ts`
  - `environment: 'node'`
  - includes both colocated tests and `__tests__` patterns
  - v8 coverage with `text`, `lcov`, `html`.

### 3) Test Utilities And Smoke Tests
- API utilities exist:
  - `apps/api/src/__tests__/setup.ts`
  - `apps/api/src/__tests__/helpers/db.ts`
  - `apps/api/src/__tests__/helpers/factory.ts`
- Web utilities exist:
  - `apps/web/src/__tests__/setup.ts`
  - `apps/web/src/__tests__/helpers/render.ts`
- Smoke tests exist and pass:
  - shared: `packages/shared/src/utils/type-guards.test.ts`, `packages/shared/src/constants/error-codes.test.ts`
  - api: `apps/api/src/modules/health/__tests__/health.routes.test.ts`
  - web: `apps/web/src/__tests__/smoke/smoke-component.test.ts`.

### 4) CI Integration
- `.github/workflows/ci.yml` has a `unit-tests` job that:
  - installs dependencies,
  - builds `@the-dmz/shared`,
  - runs shared/api/web tests with coverage flags,
  - uploads `**/coverage/**` artifacts.

### 5) Command Validation Results
- `pnpm test`: PASS.
- `pnpm --filter @the-dmz/shared test && pnpm --filter @the-dmz/api test && pnpm --filter @the-dmz/web test`: PASS.
- `pnpm --filter @the-dmz/shared test -- --coverage && pnpm --filter @the-dmz/api test -- --coverage && pnpm --filter @the-dmz/web test -- --coverage`: PASS.
- Coverage directories confirmed:
  - `apps/api/coverage`
  - `apps/web/coverage`
  - `packages/shared/coverage`.
- Watch mode behavior:
  - non-interactive run (`pnpm test:watch` in non-TTY) executes once and exits,
  - interactive probe (`timeout 8s pnpm --filter @the-dmz/api test:watch` with TTY) enters `DEV` mode and waits for file changes.
- Workspace execution caveat:
  - `pnpm exec vitest --workspace vitest.workspace.ts --run` fails at root with `Command "vitest" not found`.

## Requirement Coverage Matrix
- Root config (`vitest.workspace.ts`): Met.
- API Vitest config (node/v8/setup/globs): Met.
- Web Vitest config (jsdom/testing-library/v8/aliases/globs): Met.
- Shared Vitest config (node/v8): Met.
- Test utility scaffolding: Met.
- Initial smoke tests in all packages: Met.
- Coverage reporters/output: Met.
- Scripts (`test`, `test:watch`, `test:coverage`): Met.
- CI integration for tests + coverage artifacts: Met.

## Root Cause Analysis
- Original issue intent: establish missing unit-test infrastructure during M0 bootstrap.
- Current state indicates this was implemented after the issue was opened.
- Evidence in issue comments shows a progression from “missing configs/dependencies” to “infrastructure complete,” matching current code.
- Remaining root causes are secondary:
  - **Tooling entrypoint mismatch:** workspace file exists, but root package does not provide a `vitest` binary for direct workspace execution.
  - **Build-coupled imports:** `@the-dmz/shared` exports compiled `dist` artifacts, so dependent package tests rely on build availability.
  - **Config/CI drift risk:** local config thresholds are `0`, CI enforces `1%` via CLI overrides.

## Impacted Modules
- Root:
  - `vitest.workspace.ts`
  - `package.json`
  - `turbo.json`
  - `.gitignore`
- API:
  - `apps/api/vitest.config.ts`
  - `apps/api/src/__tests__/setup.ts`
  - `apps/api/src/__tests__/helpers/db.ts`
  - `apps/api/src/__tests__/helpers/factory.ts`
  - `apps/api/src/modules/health/__tests__/health.routes.test.ts`
  - `apps/api/src/shared/database/connection.ts`
- Web:
  - `apps/web/vitest.config.ts`
  - `apps/web/src/__tests__/setup.ts`
  - `apps/web/src/__tests__/helpers/render.ts`
  - `apps/web/src/__tests__/smoke/smoke-component.test.ts`
  - `apps/web/src/__tests__/fixtures/Smoke.svelte`
  - `apps/web/scripts/verify-shared-import.mjs`
  - `apps/web/scripts/verify-scaffold.mjs`
- Shared:
  - `packages/shared/vitest.config.ts`
  - `packages/shared/package.json`
  - `packages/shared/src/**/*.test.ts`
- CI:
  - `.github/workflows/ci.yml`.

## Constraints
- ESM monorepo (`"type": "module"`): Vitest configs/scripts must remain ESM-compatible.
- DD-08 requires unit + component + E2E quality gates; DD-09 defines backend `__tests__` structure.
- Shared package export contract targets `dist/*`; test-time source aliasing would change behavior from runtime resolution.
- Existing colocated tests in web/shared require broader globs than strict `__tests__`-only patterns.

## Alternative Approaches
1. Keep Turbo as test orchestrator (current approach).
- Pros: aligns with build graph, cache, existing CI.
- Cons: Vitest workspace file is underused.

2. Add root-level `vitest` devDependency and root script using workspace mode.
- Pros: direct use of `vitest.workspace.ts`, simpler local Vitest debugging from root.
- Cons: duplicates orchestration surface with Turbo.

3. Add test-only alias to map `@the-dmz/shared` to source (`packages/shared/src`).
- Pros: reduces local build coupling for API/web tests.
- Cons: diverges from production import path behavior and can hide packaging issues.

4. Standardize coverage thresholds in config and CI.
- Pros: eliminates local-vs-CI ambiguity.
- Cons: may require immediate threshold policy decision.

## Risks And Tradeoffs
- Medium: root workspace config can become stale because default workflows use Turbo/package scripts, not `vitest --workspace`.
- Medium: direct package test runs can fail in some states if shared dist is stale/missing.
- Low: non-interactive watch execution may appear non-watch in automation contexts; true watch works in TTY.
- Low: coverage threshold values differ between local configs (`0`) and CI CLI flags (`1`).

## Test Ideas (Next Iteration)
- Add a lightweight root verification command in CI to validate `vitest.workspace.ts` still references valid projects.
- Add a regression test for API test helper transaction rollback (`withTestTransaction`) against a disposable test DB.
- Add one accessibility-oriented component test in web (keyboard/focus assertion) to align more directly with DD-08.
- Add one failure-path schema test in shared for malformed payload roundtrips.

## Conclusion
- Issue #13 requirements are satisfied in the current repository state.
- No structural implementation gap remains for Vitest infrastructure.
- Remaining work, if desired, is hardening and developer-experience polish around workspace entrypoints, shared build coupling, and policy consistency (coverage thresholds).
