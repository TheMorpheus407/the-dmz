# The DMZ: Archive Gate

Cybersecurity awareness training platform disguised as a post-apocalyptic data center management game. Built by [Matrices GmbH](https://matrices.de).

**Tech stack:** SvelteKit 2 (Svelte 5) + Fastify 5 + PostgreSQL + Redis + Drizzle ORM

## Prerequisites

| Tool    | Version    | Install                                                                                             |
| ------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Node.js | >= 22      | [nodejs.org](https://nodejs.org) or `nvm use` (reads `.nvmrc`)                                      |
| pnpm    | >= 9       | `corepack enable` (bundled with Node 22) or `npm i -g pnpm@9`                                       |
| Docker  | Compose v2 | [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose plugin |
| Git     | any modern | [git-scm.com](https://git-scm.com)                                                                  |

## Quick Start

```bash
git clone git@github.com:TheMorpheus407/the-dmz.git
cd the-dmz
pnpm install
cp .env.example .env        # or: pnpm env:setup
docker compose up -d         # start PostgreSQL + Redis
pnpm db:migrate              # run database migrations
pnpm db:seed                 # seed development data
pnpm dev                     # start web (localhost:5173) + API (localhost:3000)
```

`pnpm dev` runs a preflight check that verifies Docker services are running and required ports are available. If something is wrong, you'll get a clear error message.

## Project Structure

```
the-dmz/
├── apps/
│   ├── web/               # SvelteKit frontend (Svelte 5)
│   └── api/               # Fastify backend (Node.js/TypeScript)
├── packages/
│   └── shared/            # Shared types, Zod schemas, constants (@the-dmz/shared)
├── e2e/                   # Playwright E2E tests
├── docker/                # Docker init scripts (postgres/)
├── docs/                  # Design Documents, BRD, milestones
│   └── DD/                # 14 Design Documents (DD-01 through DD-14)
├── scripts/               # Dev tooling scripts
├── turbo.json             # Turborepo pipeline config
├── pnpm-workspace.yaml    # Workspace definitions (apps/*, packages/*)
└── tsconfig.base.json     # Shared TypeScript base config
```

Workspaces are managed by pnpm. Turborepo orchestrates cross-workspace tasks like `build`, `lint`, `test`, and `typecheck`.

## Available Scripts

Run from the repo root:

| Command               | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `pnpm dev`            | Start frontend + backend dev servers (Turborepo, parallel) |
| `pnpm dev:web`        | Start only SvelteKit (port 5173)                           |
| `pnpm dev:api`        | Start only Fastify (port 3000)                             |
| `pnpm dev:services`   | Start Docker Compose services                              |
| `pnpm build`          | Production build all packages                              |
| `pnpm lint`           | ESLint check across all packages                           |
| `pnpm lint:fix`       | Auto-fix lint issues                                       |
| `pnpm format`         | Format all files with Prettier                             |
| `pnpm format:check`   | Check formatting (CI mode)                                 |
| `pnpm test`           | Run all Vitest unit tests                                  |
| `pnpm test:watch`     | Watch mode for active development                          |
| `pnpm test:coverage`  | Run tests with coverage report                             |
| `pnpm test:e2e`       | Run Playwright E2E tests                                   |
| `pnpm typecheck`      | TypeScript strict check all packages                       |
| `pnpm clean`          | Remove build artifacts                                     |
| `pnpm env:setup`      | Copy `.env.example` to `.env`                              |
| `pnpm db:migrate`     | Run Drizzle database migrations                            |
| `pnpm db:seed`        | Seed development database                                  |
| `pnpm db:seed:test`   | Seed test database                                         |
| `pnpm db:reset`       | Drop, re-migrate, re-seed (dev only)                       |
| `pnpm services:up`    | Start Docker Compose services                              |
| `pnpm services:down`  | Stop Docker Compose services                               |
| `pnpm services:reset` | Stop, remove volumes, restart (clean slate)                |
| `pnpm services:logs`  | Tail Docker Compose logs                                   |

Target a specific workspace with `pnpm --filter`:

```bash
pnpm --filter @the-dmz/api test    # API tests only
pnpm --filter @the-dmz/web dev     # frontend dev server only
pnpm --filter @the-dmz/shared build # build shared package
```

## Environment Variables

Copy `.env.example` to `.env` and review the values. All variables are documented inline. Key defaults:

| Variable       | Default                                           | Description               |
| -------------- | ------------------------------------------------- | ------------------------- |
| `API_PORT`     | `3000`                                            | Fastify server port       |
| `WEB_PORT`     | `5173`                                            | SvelteKit dev server port |
| `DATABASE_URL` | `postgresql://dmz:dmz_dev@localhost:5432/dmz_dev` | PostgreSQL connection     |
| `REDIS_URL`    | `redis://localhost:6379`                          | Redis connection          |

Override any port by editing `.env`. The dev preflight and Docker Compose both read from it.

## Troubleshooting

### Docker daemon not running

`pnpm dev` preflight fails with "Unable to verify Docker services." Start Docker Desktop or run `systemctl start docker`.

### Port already in use

The preflight check reports a port conflict. Set `WEB_PORT` or `API_PORT` in `.env` to an available port.

### Database migration fails

PostgreSQL may not be ready yet. Check service health:

```bash
docker compose ps    # look for "healthy" status
```

Wait for the health check to pass (takes ~10 s after first start), then retry `pnpm db:migrate`.

### pnpm not found or wrong version

The project requires pnpm 9+. Install with `corepack enable` (Node 22 bundles corepack) or `npm i -g pnpm@9`.

### Missing .env file

Scripts fail if `.env` is absent. Run `pnpm env:setup` or `cp .env.example .env`.

### Shared package build errors

`packages/shared` must be built before `apps/web` or `apps/api` can import from it. `pnpm dev` and `pnpm build` handle this automatically via Turborepo's `dependsOn` graph. If you see import errors after a fresh clone, run `pnpm build` once.

### Node version mismatch

`.nvmrc` specifies Node 22. Use `nvm use` or `fnm use` to switch. The `engines` field in `package.json` rejects Node < 22.

### Pre-commit hook failures

`lint-staged` runs ESLint + Prettier on staged files. Fix reported issues, re-stage, and commit again. Do not use `--no-verify`.

## Documentation

| Document                                 | Description                                                        |
| ---------------------------------------- | ------------------------------------------------------------------ |
| [CONTRIBUTING.md](CONTRIBUTING.md)       | Branch naming, commit conventions, PR workflow, development guides |
| [docs/BRD.md](docs/BRD.md)               | Business Requirements Document                                     |
| [docs/MILESTONES.md](docs/MILESTONES.md) | Development roadmap (M0 through M16)                               |
| [docs/DD/](docs/DD/)                     | 14 Design Documents covering all major systems                     |
| [docs/story.md](docs/story.md)           | Game premise and narrative                                         |
| [.env.example](.env.example)             | Environment variable reference                                     |

## License

Copyright (c) 2025-2026 Matrices GmbH. All rights reserved. See [LICENSE](LICENSE).
