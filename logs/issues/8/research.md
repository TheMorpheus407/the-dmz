# Research: Issue #8 — M0-08 GitHub Actions CI/CD Pipeline

## Summary
Issue #8 asks for two GitHub Actions workflows: a CI pipeline (lint, typecheck, unit tests, build, integration-test placeholder) and a Docker build workflow, plus Dockerfile stubs. The repository currently has no `.github/workflows`, no Dockerfiles under `apps/`, and linting is still placeholder scripts. Tests and builds exist but are minimal. DD-14 explicitly calls for GitHub Actions CI/CD plus security scanning and accessibility validation (the latter likely handled by Issue #23). M0 milestone requires CI/CD as a bootstrap deliverable.

## Current State (Repo Audit)
- No `.github/` directory exists. There are no workflows configured yet.
- Root scripts exist for `lint`, `typecheck`, `test`, `build`, all delegating to Turborepo:
  - `package.json` scripts: `turbo run lint|typecheck|test|build`.
  - `turbo.json` defines outputs for build/test.
- Lint scripts are placeholders in all workspaces (API, Web, Shared) and simply print messages.
- Unit tests exist:
  - API: `vitest run` and basic route tests.
  - Shared: `vitest run` plus schema generation.
  - Web: a pair of Node scripts to verify scaffold and shared import.
- There is no Vitest config file yet in any workspace.
- There are database migrations and a working `pnpm --filter api db:migrate` script; the migration folder already exists.
- Docker Compose exists for local Postgres/Redis, but there are **no** `apps/api/Dockerfile` or `apps/web/Dockerfile` yet.

## Relevant Docs
- `docs/MILESTONES.md` M0 deliverables include CI/CD: build, lint, unit tests, container builds.
- `docs/DD/14_design_document_integration_infrastructure.md` section 12.2 calls for GitHub Actions CI/CD with automated unit/integration tests and Playwright E2E; section 34.4 calls for SBOM generation and dependency/container scanning (likely covered by Issue #23).

## Root Cause Analysis
- CI/CD has not been implemented: `.github/workflows` is missing entirely.
- Dockerfiles required for container builds are missing.
- Linting is not yet configured (Issue #10), so any lint job today would be a stub.
- Coverage thresholds are not configured; `vitest run` can generate coverage, but no config is present for enforcement.

## Impacted Modules / Files (Expected)
- New workflow files:
  - `.github/workflows/ci.yml`
  - `.github/workflows/docker.yml`
- Dockerfiles:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
- Potential additions/adjustments (if required by CI):
  - `package.json` / workspace scripts (only if CI needs extra scripts for coverage or integration checks)
  - `turbo.json` (if CI requires additional tasks)

## Constraints and Dependencies
- Node.js 22 and pnpm 9 are the baseline (`.nvmrc` = 22, `packageManager` = pnpm@9.0.0).
- Turborepo is the orchestration layer; CI should use `pnpm <script>` for consistency.
- Linting and Vitest infra are separate M0 issues (#10, #13); current scripts are placeholders.
- Security scanning, SBOM, and accessibility validation are in DD-14 but are likely deferred to Issue #23.
- Docker build workflow depends on Dockerfiles (Issue #32 is related).

## Alternative Approaches
- **CI command strategy**
  - Option A: Use root scripts (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) to keep workflows minimal and tied to Turborepo.
  - Option B: Use `pnpm --filter` for finer control per workspace (could avoid running placeholder lint in web/api/shared).
- **Caching**
  - Use `actions/setup-node` with `cache: pnpm` (standard) vs a manual pnpm store cache step.
- **Build order**
  - Rely on Turborepo dependency graph (preferred) vs explicit build order in CI.
- **Integration placeholder**
  - Minimal: `pnpm --filter api db:migrate` with service containers and a smoke check.
  - Full: add a trivial integration test suite (not currently present).
- **Docker build**
  - Use `docker/build-push-action` in build-only mode (no registry push yet) vs simple `docker build` steps.

## Risks / Gotchas
- CI may appear green even though linting is not real (placeholder scripts).
- Unit test coverage enforcement will not work until Vitest config is added.
- Docker build workflow will fail unless Dockerfiles are created in `apps/api` and `apps/web`.
- Integration-test job may fail if environment variables for DB/Redis are not set; the API uses `DATABASE_URL` and `REDIS_URL` defaults not matching docker-compose settings.
- Web build may require `adapter-node` configuration (already present), but missing env vars or build output checks could cause false negatives.

## Test Ideas for CI
- CI:
  - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` executed via Turborepo.
  - Ensure `pnpm test` uploads coverage artifacts even if thresholds are not enforced yet.
- Integration placeholder:
  - Use Postgres and Redis service containers.
  - Set `DATABASE_URL=postgres://dmz:dmz_dev@localhost:5432/dmz_dev` (matching docker-compose defaults).
  - Run `pnpm --filter api db:migrate` and a trivial smoke command (e.g., `node -e "console.log('ok')"`) until true integration tests exist.
- Docker:
  - Build each Dockerfile locally in CI to catch missing files or runtime build errors.

## Key Findings (TL;DR)
- No workflows exist; CI/CD is entirely missing.
- Linting is a stub and should not be treated as real quality gate yet.
- Dockerfiles needed by the Docker workflow do not exist.
- Integration tests are not implemented; pipeline should use a placeholder migration/db-connection check.

