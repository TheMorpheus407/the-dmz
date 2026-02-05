ACCEPTED Review for Issue #6

Summary
- Docker Compose provides Postgres 16, Redis 7, and optional Adminer with health checks, volumes, and init scripts for db creation/extensions.
- Added `.env.example`, `.dockerignore`, `.gitignore` updates, and dev scripts (`env:setup`, `services:*`) matching requirements.
- Added a small helper script to create `.env` from `.env.example`.

Correctness
- Requirements in issue #6 are met; no regressions or correctness issues found.

Tests
- `pnpm test`
