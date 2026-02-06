# Research: Issue #13 — Vitest Unit Testing Infrastructure

**Key Findings**
- The Vitest workspace and per-package configs already exist and match the issue spec: `vitest.workspace.ts`, `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `packages/shared/vitest.config.ts`.
- Web component testing is wired with `@testing-library/svelte` + `jsdom`, plus a smoke component test under `apps/web/src/__tests__/smoke/`.
- API and shared packages have tests and coverage configuration with the v8 provider; API test utilities (`apps/api/src/__tests__/helpers/*`) and setup file are in place.
- Root scripts and Turbo tasks include `test`, `test:watch`, and `test:coverage`; CI runs per-package tests with coverage artifacts.
- Main practical constraint: `@the-dmz/shared` exports point to `dist/`, so direct package tests can fail unless the shared package is built first.

## Current Behavior (Repo)
- Root `pnpm test` runs `turbo run test` (`package.json`) and Turbo’s `test` task depends on `^build` with `coverage/**` outputs (`turbo.json`).
- `vitest.workspace.ts` lists the three workspaces: `apps/api`, `apps/web`, `packages/shared`.
- `apps/api/vitest.config.ts` uses `environment: 'node'`, includes `src/**/__tests__/**/*.test.ts` and `src/**/*.spec.ts`, and configures v8 coverage with `text`, `lcov`, `html` reporters. Setup file: `apps/api/src/__tests__/setup.ts`.
- `apps/web/vitest.config.ts` uses `environment: 'jsdom'`, `sveltekit()` + `svelteTesting()` plugins, alias config matching `svelte.config.js`, and coverage over `src/**/*.{ts,svelte}`. Setup file: `apps/web/src/__tests__/setup.ts`.
- `packages/shared/vitest.config.ts` runs in `node` and includes `src/**/*.test.ts`, `src/**/*.spec.ts`, plus `src/**/__tests__/**/*.test.ts` with v8 coverage.
- CI (`.github/workflows/ci.yml`) builds `@the-dmz/shared` first, then runs tests for shared/api/web with coverage flags and uploads `**/coverage/**` artifacts.

## Alignment With Issue Requirements
- **Root workspace config:** Present and matches spec.
- **API config:** Node env, v8 coverage, setup file, test patterns present. No path aliases are defined in `apps/api/tsconfig.json`, so there are no alias mappings to replicate.
- **Web config:** jsdom + Testing Library Svelte + alias mapping present. Test patterns are broader than spec to include colocated `src/**/*.test.ts`.
- **Shared config:** Node env + v8 coverage present. Includes colocated tests under `src/`.
- **Test utilities:** `apps/api/src/__tests__/setup.ts`, `apps/api/src/__tests__/helpers/db.ts`, `apps/api/src/__tests__/helpers/factory.ts`, `apps/web/src/__tests__/setup.ts`, `apps/web/src/__tests__/helpers/render.ts` are present.
- **Smoke tests:** API health route test, web Svelte component smoke test, and shared type guard/error code tests are present.
- **Scripts:** Root `test`, `test:watch`, `test:coverage` are present; package-level scripts exist in api/web/shared.
- **Coverage output:** `coverage/` directories generated and gitignored.

## Notes From Design Docs
- DD-08 Section 24 expects **unit tests, component tests, and E2E tests** as part of the quality strategy (aligned with this issue’s unit/component scaffolding).
- DD-09 defines module test structure under `__tests__/` for services, routes, and integration tests; the API tests follow this layout.

## Root Cause / Context
- The issue aimed to establish missing Vitest infrastructure across the monorepo. The current codebase already contains the workspace config, per-package configs, test utilities, and smoke tests, indicating the initial gaps were addressed.
- The remaining friction point is dependency resolution for `@the-dmz/shared` because it exports from `dist/`. Tests in `apps/api` and `apps/web` rely on shared being built first; Turbo and CI handle this, but direct per-package test runs may fail if shared isn’t built.

## Impacted Modules / Files
- Root: `vitest.workspace.ts`, `package.json`, `turbo.json`, `.gitignore`.
- API: `apps/api/vitest.config.ts`, `apps/api/src/__tests__/setup.ts`, `apps/api/src/__tests__/helpers/db.ts`, `apps/api/src/__tests__/helpers/factory.ts`, `apps/api/src/modules/health/__tests__/health.routes.test.ts`.
- Web: `apps/web/vitest.config.ts`, `apps/web/src/__tests__/setup.ts`, `apps/web/src/__tests__/helpers/render.ts`, `apps/web/src/__tests__/smoke/smoke-component.test.ts`, `apps/web/src/__tests__/fixtures/Smoke.svelte`, `apps/web/scripts/verify-*.mjs`.
- Shared: `packages/shared/vitest.config.ts`, `packages/shared/src/**/*.test.ts`.
- CI: `.github/workflows/ci.yml` for coverage runs and artifacts.

## Constraints / Dependencies
- ESM repo (`"type": "module"`), so Vitest configs must remain ESM/TS.
- `@the-dmz/shared` publishes from `dist/`; tests in other packages need shared built, or they must alias to source for tests.
- Svelte 5 testing requires `@testing-library/svelte` plus a DOM environment (`jsdom` in use).
- Module test convention in DD-09 expects `__tests__` directories; shared/web have colocated tests, so include globs must remain broader.

## Alternative Approaches
- Use `vitest --workspace` at the root (rather than Turbo) if a single Vitest-native entrypoint is desired.
- Swap `jsdom` for `happy-dom` in `apps/web` for faster DOM emulation (tradeoff: slightly different DOM behavior).
- Add a test-only alias to map `@the-dmz/shared` to `packages/shared/src` to remove the build dependency for local testing (tradeoff: diverges from runtime resolution).

## Risks / Tradeoffs
- **Local per-package tests** may fail if `@the-dmz/shared` hasn’t been built first (especially `apps/web` due to preflight scripts importing shared).
- **Coverage thresholds** are set to `0` in configs but overridden to `1%` in CI via CLI flags; this mismatch can confuse local vs CI outcomes.
- **Test glob drift**: tightening globs to `__tests__` only would drop existing colocated tests in shared/web.

## Test Ideas / Validation
- `pnpm test` at repo root to validate Turbo orchestration and coverage output.
- `pnpm --filter @the-dmz/shared build` then `pnpm --filter @the-dmz/api test` to ensure API tests pass with shared built.
- `pnpm --filter @the-dmz/web test` to validate Svelte component tests under `jsdom`.
- `pnpm test:coverage` to verify `coverage/` directories are produced in each package.
- Optional: `vitest --workspace` (from repo root) to confirm the workspace file functions as expected.
