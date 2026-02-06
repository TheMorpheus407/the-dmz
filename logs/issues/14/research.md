# Research: Issue #14 - Playwright E2E Testing Infrastructure

## Scope And Inputs
- Read issue `#14` and all comments using:
  - `gh issue view 14 --comments --json number,title,body,state,author,assignees,labels,comments,url`
- Read relevant project identity and state documents:
  - `SOUL.md`
  - `MEMORY.md`
- Read implementation and infra files tied to E2E requirements:
  - root scripts/config (`package.json`, `.gitignore`, `pnpm-workspace.yaml`, `turbo.json`)
  - CI workflows (`.github/workflows/ci.yml`)
  - API health and database setup (`apps/api/src/modules/health/*`, `apps/api/src/shared/database/*`, `apps/api/src/config.ts`)
  - web route surfaces used by smoke navigation tests (`apps/web/src/routes/**`)
  - Docker/database initialization (`docker-compose.yml`, `docker/postgres/*.sql`)
  - design constraints in DD and milestone docs.

## Key Findings
- Issue #14 has no thread comments yet; only the original requirement set is present.
- Playwright infrastructure is currently missing end-to-end:
  - No `playwright.config.ts` at repo root.
  - No `e2e/` directory.
  - No root scripts `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:e2e:debug`.
  - No `@playwright/test` or `@axe-core/playwright` in root `devDependencies`.
- Reproducible current behavior confirms this:
  - `pnpm test:e2e` -> `Command "test:e2e" not found`.
  - `pnpm exec playwright --version` -> `Command "playwright" not found`.
- Core prerequisites for smoke tests do exist:
  - API has `/health` and `/ready` routes (`apps/api/src/modules/health/health.routes.ts:13` and `apps/api/src/modules/health/health.routes.ts:26`).
  - Web has working placeholder pages for `/`, `/login`, `/game`, `/admin` (`apps/web/src/routes/(public)/+page.svelte:2`, `apps/web/src/routes/(auth)/login/+page.svelte:2`, `apps/web/src/routes/(game)/game/+page.svelte:2`, `apps/web/src/routes/(admin)/admin/+page.svelte:2`).
- CI does not run any Playwright job today. Current CI jobs are lint/typecheck/unit/build plus a placeholder DB integration job (`.github/workflows/ci.yml:132`).
- Test DB plumbing is partial:
  - `dmz_test` database is created by Docker init scripts (`docker/postgres/init.sql:4`, `docker/postgres/init-extensions.sql:4`).
  - `.env.example` defines `DATABASE_TEST_URL` (`.env.example:3`).
  - But API runtime config ignores `DATABASE_TEST_URL` entirely and only consumes `DATABASE_URL` (`apps/api/src/config.ts:24`).
- The issue asks for seeding `tenant + test user`, but current schema only has `tenants` table (`apps/api/src/shared/database/schema/tenants.ts:4`), so a real test user cannot be seeded yet without schema/auth work from later milestones.

## Design And Milestone Constraints
- M0 requires Playwright E2E with test DB seeding (`docs/MILESTONES.md:62`).
- DD-14 requires Playwright cross-browser E2E in CI/CD (`docs/DD/14_design_document_integration_infrastructure.md:503`).
- DD-14 also requires synthetic tenants/users in integration environments (`docs/DD/14_design_document_integration_infrastructure.md:1334`).
- DD-08 requires E2E coverage for critical journeys and accessibility automation in quality strategy (`docs/DD/08_frontend_architecture_sveltekit.md:780`, `docs/DD/08_frontend_architecture_sveltekit.md:782`, `docs/DD/08_frontend_architecture_sveltekit.md:800`).

## Current Behavior (Observed)

### 1) Tooling and scripts
- Root scripts stop at unit-testing and do not include any E2E script (`package.json:10`).
- Root devDependencies do not include Playwright or axe Playwright bindings (`package.json:28`).
- `.gitignore` currently lacks common Playwright outputs like `playwright-report/` and `test-results/` (`.gitignore:1`).

### 2) API readiness for smoke E2E
- API service can be started on `3001` from `apps/api` via `dev` (`apps/api/package.json:8`).
- `/health` returns static OK and is a stable smoke target (`apps/api/src/modules/health/health.routes.ts:13`, `apps/api/src/modules/health/health.routes.ts:22`).
- Existing unit tests prove `/health` and `/api/v1/` behavior (`apps/api/src/modules/health/__tests__/health.routes.test.ts:26`, `apps/api/src/modules/health/__tests__/health.routes.test.ts:77`).
- Verified locally: `pnpm --filter @the-dmz/api test -- src/modules/health/__tests__/health.routes.test.ts` passes.

### 3) Web readiness for smoke E2E
- Web dev server exists (`apps/web/package.json:7`), and route-group placeholders are present for required navigation checks.
- However, no page title is currently set in app shell (`apps/web/src/app.html:1`-`apps/web/src/app.html:10`), so the issue example assertion `toHaveTitle(/DMZ/)` will fail unless the app or test is adjusted.

### 4) Database seeding and cleanup
- Migration and seed scripts exist (`apps/api/package.json:13`, `apps/api/package.json:16`).
- Seed currently inserts only tenants (`apps/api/src/shared/database/seed.ts:13`), no users.
- DB reset script exists and is non-production guarded (`apps/api/src/shared/database/reset.ts:16`) but drops/recreates the entire schema; that is heavy for per-suite teardown.
- API config reads only `DATABASE_URL` (`apps/api/src/config.ts:24`), so test runs must explicitly set `DATABASE_URL=$DATABASE_TEST_URL` during global setup.

### 5) CI state relative to issue requirements
- CI has no Playwright E2E stage and no artifact upload for E2E traces/screenshots.
- Existing `integration-tests` job runs DB migration/smoke against `dmz_dev` under `NODE_ENV=test` (`.github/workflows/ci.yml:174`), but this is not browser E2E and not multi-browser.

## Root Cause Analysis
1. Missing foundational scaffolding
- Playwright package, config, and directory structure were never introduced in this branch history for issue #14.

2. Dependency mismatch between issue text and current schema maturity
- Issue requests auth fixture and test user seeding, but auth/user schema is not available in current M0 code. Only tenant schema exists.

3. Environment variable contract gap
- Repository introduces `DATABASE_TEST_URL` in example env, but app config and DB helpers are single-URL (`DATABASE_URL`) only.
- Without explicit remapping in setup, E2E could accidentally mutate `dmz_dev`.

4. CI pipeline not yet extended past unit/integration placeholders
- Current CI structure has no browser runtime container, no Playwright install, and no artifact lifecycle for failures.

## Impacted Modules (for implementation planning)
- Root tooling
  - `package.json`
  - `.gitignore`
  - `playwright.config.ts` (new)
  - `e2e/**` (new)
- API integration hooks
  - `apps/api/src/shared/database/migrate.ts`
  - `apps/api/src/shared/database/seed.ts`
  - Possibly `apps/api/src/config.ts` (if explicit `DATABASE_TEST_URL` support is added)
- CI
  - `.github/workflows/ci.yml` (add E2E job with Playwright image + artifacts)

## Constraints
- Must keep implementation root-scoped for E2E (issue requires monorepo root config).
- No default exports by project convention; E2E helper modules should use named exports.
- ESM project (`"type": "module"`) means Playwright config/helpers should be TS/ESM compatible.
- Current schema does not support real auth login yet; auth fixture must be placeholder or API-level bypass until auth modules land.
- Parallel workers against one shared `dmz_test` DB can cause race/flakiness if tests mutate global tables without per-test isolation.

## Alternative Approaches
1. Minimal M0-compliant implementation (recommended)
- Add Playwright config + smoke tests + global setup/teardown.
- Seed only tenant now; leave user seeding as TODO tied to auth schema issue.
- Add axe placeholder test on `/`.
- Add CI Playwright job with artifacts.
- Pros: Delivers issue intent now with low coupling.
- Cons: Auth fixture is mostly structural placeholder.

2. Strict interpretation (block until user/auth schema exists)
- Implement full auth fixture and true login flow only after auth/rbac schema work.
- Pros: No placeholder debt.
- Cons: Delays M0 testing deliverable and CI E2E gate.

3. Hybrid with temporary API test endpoint/seed hook
- Add test-only endpoint/flag to create test user for login fixture.
- Pros: Enables meaningful auth E2E now.
- Cons: Introduces temporary surface area and security hardening burden.

## Risks
- Flaky startup timing between `webServer` boot and first browser request.
- Database contamination if setup accidentally points to `dmz_dev`.
- False-negative smoke test if title assertion uses `/DMZ/` before title is implemented.
- CI runtime cost increase from cross-browser matrix + trace/screenshot retention.
- Hidden dependency on Docker availability for local developers running E2E.

## Test Ideas
- Baseline smoke
  - `/health` returns 200 and `{ status: 'ok' }`.
  - `/` renders `Archive Gate` text.
  - `/login` renders `Access Portal`.
  - `/game` and `/admin` route surfaces render expected headings.
- Accessibility placeholder
  - Axe run on `/` with `@axe-core/playwright` and permissive initial assertion strategy (document known violations if any).
- Setup/teardown validation
  - Assert migration table exists after global setup.
  - Assert seeded tenant slug `system` exists.
  - Assert cleanup removes test-created tenant rows.
- CI-specific
  - Verify screenshots/traces are uploaded only on failure.
  - Verify retries/workers differ by `CI` env as configured.

## Acceptance Criteria Readiness Matrix (Current State)
- `pnpm test:e2e` runs Playwright tests: Not met.
- Smoke tests for frontend + API: Not met.
- Test DB seeded/cleaned automatically: Partially met (building blocks exist, orchestration missing).
- Chromium/Firefox/WebKit execution: Not met.
- Screenshots on failure: Not met.
- Playwright UI mode script: Not met.
- Dev servers auto-start from Playwright: Not met.
- `@axe-core/playwright` placeholder: Not met.
- CI E2E with artifacts: Not met.

## Recommended Implementation Sequence
1. Install `@playwright/test` and `@axe-core/playwright` at root and add E2E scripts.
2. Add root `playwright.config.ts` with:
   - projects for chromium/firefox/webkit
   - retries/workers split by `CI`
   - screenshot on failure, trace on first retry
   - `webServer` entries for API and web dev servers.
3. Scaffold `e2e/` structure from issue.
4. Implement `global-setup.ts` to:
   - verify DB/Redis reachability
   - run migrations with `DATABASE_URL` set from `DATABASE_TEST_URL` fallback
   - run seed and record seeded entities.
5. Implement `global-teardown.ts` cleanup/truncate strategy safe for current schema.
6. Add smoke specs and axe placeholder with assertions aligned to current UI (avoid title regex until title exists).
7. Extend CI with dedicated Playwright job using `mcr.microsoft.com/playwright`, service containers, and artifact uploads on failure.

## Conclusion
Issue #14 is currently open because Playwright E2E infrastructure has not been scaffolded yet. The repository has enough backend/web/database primitives to implement the requested smoke pipeline now, but auth-specific fixtures and true test-user seeding are constrained by current schema maturity. The safest near-term path is to ship root Playwright scaffolding with tenant-level seed, explicit test DB wiring, cross-browser smoke tests, and CI artifact support, while documenting auth fixture expansion as follow-on work.
