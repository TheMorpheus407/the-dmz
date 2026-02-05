# Research: M0-06 Configure Docker Compose development environment

## Summary
Issue #6 requires a Docker Compose-based local dev environment with PostgreSQL 16, Redis 7, and an optional Adminer container. The repository currently has no Compose config, no Docker init scripts, and no `.env.example` or `.dockerignore`. Implementing this will touch root-level tooling (scripts, `.gitignore`, `.dockerignore`) and new `docker/postgres` init SQL, while aligning with DD-10 (Postgres 16+, Redis 7.x) and DD-14 (reproducible environments).

## Key Findings
- There is **no existing Docker Compose config** or `docker/` directory; the root only contains app scaffolds and docs.
- `.env.example` is missing and `.gitignore` does not ignore `.env`.
- Root `package.json` does not have `services:up/down/reset` scripts.
- `apps/api/src/config.ts` expects `DATABASE_URL`, `REDIS_URL`, `NODE_ENV`, `PORT`, `LOG_LEVEL` and defaults to `postgres://localhost:5432/the_dmz` and `redis://localhost:6379` — the `.env.example` in the issue should override these defaults.
- DD-10 specifies **PostgreSQL 16+** and **Redis 7.x** as the operational and cache stores.
- BRD Appendix B mentions `docker compose up -d` for local infra and includes TimescaleDB, but Issue #6 only mandates Postgres + Redis (Adminer optional).

## Current Behavior (Repo State)
- No `docker-compose.yml` (or equivalent) exists.
- No `docker/` folder or init scripts exist.
- No `.env.example` or `.env` copy script exists.
- `.dockerignore` is missing.
- `.gitignore` does **not** include `.env`.
- Root `package.json` has no dev-service scripts.
- API health checks (`apps/api/src/shared/database/connection.ts`, `apps/api/src/shared/database/redis.ts`) are placeholders and do not connect yet.

## Root Cause Analysis
M0-06 has not been implemented yet. The repo is in early bootstrap; the dev infrastructure requirements in Issue #6 (compose, init scripts, env files, scripts) are absent by design.

## Impacted Modules / Areas
- **Root tooling**: `package.json` scripts (`services:up`, `services:down`, `services:reset`), `.gitignore`, `.dockerignore`, and `.env.example`.
- **Infrastructure**: new `docker/` folder with `postgres` init SQL scripts.
- **API config**: `apps/api/src/config.ts` uses `DATABASE_URL`/`REDIS_URL`; `.env.example` should align to prevent local confusion.
- **Web app**: `VITE_API_URL` in `.env.example` anticipates frontend wiring.

## Constraints / Requirements (Docs + Issue)
- **Issue #6**: Compose services for Postgres 16, Redis 7, Adminer (optional profile), init scripts to create `dmz_dev`/`dmz_test`, enable `uuid-ossp` + `pgcrypto`, `.env.example`, `.env` ignored, `services:*` scripts, `.dockerignore`.
- **DD-10**: Postgres 16+ is authoritative store; Redis 7.x for real-time/cache.
- **DD-14 §12**: Reproducible local environments; CI/CD consistency.
- **BRD Appendix B**: local dev uses `docker compose up -d` (also mentions TimescaleDB, but not required here).
- **Repo conventions**: `AGENTS.md` and `CLAUDE.md` expect `docker/` at repo root.

## Alternative Approaches / Implementation Notes
- **Compose file location**: Root `docker-compose.yml` is standard; issue explicitly expects `docker/postgres/` for init scripts. BRD shows `infrastructure/docker/docker-compose.yml`, but repo layout in AGENTS favors root `docker/` folder.
- **DB creation**: Could use env-based multiple DB init (custom entrypoint) vs explicit `init.sql`. Issue mandates `docker/postgres/init.sql`.
- **Extensions**: `init-extensions.sql` via `docker-entrypoint-initdb.d` is the canonical approach.
- **Adminer profile**: use Compose `profiles: ["tools"]` so it runs only with `--profile tools`.
- **Optional app services**: Compose can be structured to add API/web later (likely when Dockerfiles land in #32). For now, optional services can be omitted or stubbed.

## Risks / Edge Cases
- **UUIDv7 support**: Issue requires `uuid-ossp` + `pgcrypto`, but neither provides UUIDv7. DD-10 expects UUIDv7; current code generates UUIDv7 in-app (`uuid` npm). If future DB defaults require UUIDv7, an additional extension or SQL function will be needed.
- **Env loading**: Docker Compose auto-loads `.env`, but Node doesn’t unless `dotenv` (or similar) is added. Until then, `pnpm dev` won’t read `.env` automatically.
- **Port conflicts**: 5432/6379/8080 may already be in use locally; consider allowing overrides via environment variables in Compose.
- **`services:reset` data loss**: A `down -v` reset will wipe dev data; acceptable but should be clear.

## Test / Validation Ideas
- `docker compose up -d` starts Postgres and Redis; `docker compose ps` shows healthy.
- Connect to Postgres: `psql postgresql://dmz:dmz_dev@localhost:5432/dmz_dev` and `.../dmz_test`.
- Validate extensions: `SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto');`.
- Redis: `redis-cli -u redis://localhost:6379 ping` returns `PONG`.
- `pnpm services:up`, `pnpm services:down`, `pnpm services:reset` behave as expected.
- `docker compose --profile tools up -d` exposes Adminer at `localhost:8080`.

## Open Questions / Decisions
- Should Compose include an optional **TimescaleDB** service profile to align with BRD Appendix B, or defer to a later milestone?
- Should the API `DATABASE_URL` default be updated to match the `.env.example` DSN, or is `.env`-only sufficient?

## Relevant Files / References
- `docs/MILESTONES.md` (M0 “Dev environment” deliverable)
- `docs/DD/10_database_schema_data_model.md` (Postgres 16+, Redis 7.x)
- `docs/DD/14_design_document_integration_infrastructure.md` §12 (Environment strategy)
- `docs/BRD/14_tech_architecture.md` Appendix B (local dev docker compose)
- `apps/api/src/config.ts` (env variables, defaults)
