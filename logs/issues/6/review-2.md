ACCEPTED Review for Issue #6

Summary
- Docker Compose configuration covers Postgres 16, Redis 7, and optional Adminer with correct ports, volume, init scripts, and health checks.
- Added `.env.example`, `.dockerignore`, `.gitignore` updates, and `env:setup` + `services:*` scripts per requirements.
- Docker init SQL creates `dmz_dev`/`dmz_test` and enables `uuid-ossp` + `pgcrypto`.

Coverage
- All explicit requirements and acceptance criteria from the issue are satisfied by the current uncommitted changes.

Tests
- `pnpm test`
