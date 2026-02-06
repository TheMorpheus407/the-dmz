# Research: Issue #13 — Vitest Unit Testing Infrastructure

**Key Findings**
- The Vitest workspace and per-package configs already exist: `vitest.workspace.ts`, `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, and `packages/shared/vitest.config.ts`.
- Svelte component testing is wired up: `@testing-library/svelte` and `jsdom` are in `apps/web` devDependencies, the Vitest config uses `svelteTesting` + `jsdom`, and a smoke component test exists under `apps/web/src/__tests__/smoke/`.
- API + shared packages have passing unit tests and coverage configuration with v8 reporters; API test utilities (`apps/api/src/__tests__/helpers/*`) and setup file exist.
- Root scripts and Turbo tasks include `test`, `test:watch`, and `test:coverage`, while CI runs per-package tests with coverage and overrides thresholds via CLI.

## Current Behavior (Repo)
- Root `pnpm test` runs `turbo run test` (`package.json`), and Turbo’s `test` task depends on `^build` with `coverage/**` outputs (`turbo.json`).
- `vitest.workspace.ts` exists at repo root and lists `apps/api`, `apps/web`, `packages/shared`.
- `apps/api` runs `vitest run` and includes `apps/api/vitest.config.ts` with `node` env, setup file, include globs for `__tests__` and `*.spec.ts`, and v8 coverage config.
- `apps/web` runs `vitest run` after two preflight scripts; its config uses `jsdom`, `sveltekit()` + `svelteTesting()` plugins, alias config matching `svelte.config.js`, and coverage over `src/**/*.{ts,svelte}`.
- `packages/shared` runs `generate:schemas` before tests and has a Vitest config covering `src/**/*.test.ts`/`*.spec.ts` with v8 coverage.
- CI (`.github/workflows/ci.yml`) builds `@the-dmz/shared` first, then runs per-package tests with coverage and low thresholds set via CLI flags.

## Gaps / Deviations vs Issue Requirements
- No functional gaps found relative to the issue spec; the required configs, setup files, helpers, and smoke tests are present.
- `apps/web` and `packages/shared` test globs are broader than the spec (they include colocated `src/**/*.test.ts`), which is intentional to cover existing tests outside `__tests__`.
- Root `pnpm test` uses Turbo instead of `vitest --workspace`; the workspace file is still useful for direct `vitest` runs but is not the default path.
- `apps/web` `test:coverage` re-runs the preflight scripts via `pnpm run test -- --coverage`, which can fail if `@the-dmz/shared` is not built locally.

## Root Cause Analysis
- The original issue likely stemmed from incomplete testing scaffolding (missing workspace config, per-package configs, DOM test dependencies, and setup utilities). The current repo state shows these have been added, and smoke tests are present across packages, indicating the root cause has been addressed.

## Impacted Modules / Files
- Root: `vitest.workspace.ts`, `package.json`, `turbo.json`.
- API: `apps/api/vitest.config.ts`, `apps/api/src/__tests__/setup.ts`, `apps/api/src/__tests__/helpers/db.ts`, `apps/api/src/__tests__/helpers/factory.ts`, `apps/api/src/modules/health/__tests__/health.routes.test.ts`.
- Web: `apps/web/vitest.config.ts`, `apps/web/src/__tests__/setup.ts`, `apps/web/src/__tests__/helpers/render.ts`, `apps/web/src/__tests__/smoke/smoke-component.test.ts`, `apps/web/src/__tests__/fixtures/Smoke.svelte`.
- Shared: `packages/shared/vitest.config.ts`, `packages/shared/src/**/*.test.ts`.
- CI: `.github/workflows/ci.yml` (coverage thresholds enforced via CLI overrides).

## Constraints / Dependencies
- ESM repo (`"type": "module"`), so Vitest configs are ESM/TS and must remain compatible.
- `@the-dmz/shared` exports point to `dist/`; tests in other packages rely on a built shared package (Turbo test depends on build; CI builds shared explicitly).
- Svelte 5 testing requires `@testing-library/svelte` + a DOM implementation (`jsdom` is currently used).
- Backend module structure in DD-09 expects tests under `__tests__` directories; shared and web already include colocated tests, so include globs must allow both.

## Alternative Approaches
- Use `vitest --workspace` at the root instead of Turbo, if a single command should orchestrate all packages without build dependency.
- Swap `jsdom` for `happy-dom` in web tests for faster DOM simulation if needed.
- Add a path alias to map `@the-dmz/shared` to source in tests to avoid pre-building the shared package (tradeoff: diverges from runtime resolution).

## Risks / Tradeoffs
- Preflight scripts in `apps/web` `test`/`test:coverage` can fail if `@the-dmz/shared` isn’t built locally; Turbo mitigates this, but direct package runs need care.
- CI coverage thresholds are enforced via CLI flags (currently `1%`), which override the `0%` thresholds in config; discrepancies could confuse local vs CI outcomes.
- API test helpers include DB utilities (`resetTestDatabase`, transaction rollback) that will require a live test database when used; they are placeholders today.

## Test Ideas / Validation
- `pnpm test` at repo root to ensure Turbo orchestration and coverage outputs.
- `pnpm --filter @the-dmz/api test` to validate Fastify `inject` health tests.
- `pnpm --filter @the-dmz/web test` to confirm Svelte component tests run under `jsdom`.
- `pnpm --filter @the-dmz/shared test` to confirm schema generation + unit tests.
- `pnpm test:coverage` to verify `coverage/` directories are produced across packages.
