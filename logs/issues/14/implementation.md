# Implementation: Issue #14 - Playwright E2E Testing Infrastructure

## Summary
Implemented Playwright E2E infrastructure at the monorepo root with cross-browser projects, global setup/teardown, smoke tests, accessibility placeholder coverage, and CI execution in the Playwright container.

This pass also addressed the review denials:
- Made `pnpm test:e2e` self-sufficient from a clean checkout by building `@the-dmz/shared` before Playwright starts web/API servers.
- Ignored transient Playwright temp output (`e2e/.tmp-results/`) to avoid noisy untracked files.

## Changes Made
- Added root Playwright setup:
  - `playwright.config.ts` with Chromium/Firefox/WebKit projects.
  - `baseURL` and API URL support (`PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_BASE_URL`).
  - Local/CI split for retries/workers.
  - Screenshots on failure and trace on first retry.
  - `webServer` entries for API + web dev servers.
  - `globalSetup` + `globalTeardown` hooks.
- Added E2E structure and tests:
  - Fixtures: `e2e/fixtures/base.ts`, `e2e/fixtures/auth.ts`.
  - Helpers: `e2e/helpers/api.ts`, `e2e/helpers/db-seed.ts`, `e2e/helpers/cleanup.ts`, `e2e/helpers/setup-state.ts`.
  - Lifecycle: `e2e/global-setup.ts`, `e2e/global-teardown.ts`.
  - Specs: `e2e/smoke/health.spec.ts`, `e2e/smoke/navigation.spec.ts`, `e2e/smoke/accessibility.spec.ts`.
- Implemented E2E DB safety/seeding behavior:
  - Enforced test DB usage (`dmz_test`) via URL validation.
  - Added tenant seeding + temporary `e2e_test_users` table seeding.
  - Added teardown cleanup of seeded E2E data.
- Added root scripts/dependencies for Playwright and axe:
  - `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:e2e:debug`.
  - `test:e2e:prepare` now runs `pnpm --filter @the-dmz/shared build` to fix clean-checkout reproducibility.
  - Added `@playwright/test` and `@axe-core/playwright`.
- Added CI E2E job (`.github/workflows/ci.yml`):
  - Runs in `mcr.microsoft.com/playwright:v1.58.1-jammy`.
  - Uses PostgreSQL + Redis services.
  - Executes `pnpm test:e2e` and uploads Playwright artifacts on failure.
- Added Playwright-related ignores in `.gitignore`:
  - `playwright-report/`, `test-results/`, `e2e/.setup-state.json`, `e2e/.tmp-results/`.
- Updated web layout title for smoke assertion compatibility.
- Extended root lint coverage to include `playwright.config.ts` and `e2e/**`.

## Files Touched
- `.github/workflows/ci.yml`
- `.gitignore`
- `apps/web/package.json`
- `apps/web/src/routes/+layout.svelte`
- `eslint.config.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `playwright.config.ts`
- `e2e/fixtures/base.ts`
- `e2e/fixtures/auth.ts`
- `e2e/global-setup.ts`
- `e2e/global-teardown.ts`
- `e2e/helpers/api.ts`
- `e2e/helpers/db-seed.ts`
- `e2e/helpers/cleanup.ts`
- `e2e/helpers/setup-state.ts`
- `e2e/smoke/health.spec.ts`
- `e2e/smoke/navigation.spec.ts`
- `e2e/smoke/accessibility.spec.ts`
- `logs/issues/14/implementation.md`

## Tests Run
1. `pnpm lint`
- Result: PASS

2. `pnpm typecheck`
- Result: PASS

3. `pnpm test`
- Result: PASS

4. `pnpm services:up`
- Result: PASS (PostgreSQL + Redis running)

5. Clean-state E2E reproducibility check in CI-equivalent Playwright container
- Pre-step: removed `packages/shared/dist` to simulate clean checkout.
- Command:
  ```bash
  docker run --rm --network the-dmz_default \
    -v "$PWD:/work" -w /work \
    -e CI=true \
    -e NODE_ENV=test \
    -e DATABASE_TEST_URL=postgres://dmz:dmz_dev@postgres:5432/dmz_test \
    -e REDIS_URL=redis://redis:6379 \
    -e PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 \
    -e PLAYWRIGHT_API_BASE_URL=http://127.0.0.1:3001 \
    mcr.microsoft.com/playwright:v1.58.1-jammy \
    bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e"
  ```
- Result: PASS (`18 passed` across Chromium/Firefox/WebKit)

6. Host run: `pnpm test:e2e`
- Result: FAIL (environmental)
- Reason: host machine lacks required browser system libraries for Playwright (`libnspr4.so` and additional GTK/GStreamer dependencies).
- Note: failure is environment-specific; the CI-equivalent Playwright container run passes.

## Outcome
Issue #14 implementation is complete with the denial blockers resolved: `pnpm test:e2e` now builds shared artifacts automatically and succeeds from a clean state in CI-equivalent execution.
