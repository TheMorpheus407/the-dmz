# Claude Code Instructions — The DMZ: Archive Gate

@AGENTS.md
@SOUL.md
@MEMORY.md

## Sub-Agents

Use task-specialized sub-agents from `.claude/agents/` for focused work:

| Agent | Domain | When to Use |
|-------|--------|-------------|
| frontend | SvelteKit, Svelte 5, PixiJS, terminal UI, a11y | Component creation, styling, client state, routing, theming in `apps/web` |
| backend | Fastify, game engine, event sourcing, API design | Route handlers, middleware, module implementation, business logic in `apps/api` |
| database | PostgreSQL, Drizzle ORM, RLS | Schema changes, migrations, RLS policies, queries in `apps/api/src/db/` |
| testing | Vitest, Playwright | Writing tests, coverage analysis, test infrastructure. E2E tests at repo root `e2e/` |
| devops | Docker, Kubernetes, Turborepo, CI/CD, GitHub Actions | Containers, pipelines, deployment, infrastructure config, build orchestration |
| reviewer | Correctness, security, performance, a11y | Post-implementation review, security audit (read-only — no Edit/Write) |

### Agent Strategy

- Launch independent agents in parallel when tasks don't depend on each other.
- Always run the reviewer agent after significant implementation work.
- Use background agents for research that takes time.
- Each agent should read the relevant DD before starting implementation.

## Monorepo Layout

Deployable apps live in `apps/`, shared libraries in `packages/`. Turborepo orchestrates builds.

```
the-dmz/
├── apps/
│   ├── web/              # SvelteKit frontend (Svelte 5) — pnpm --filter web
│   └── api/              # Fastify backend (Node.js/TS) — pnpm --filter api
├── packages/
│   └── shared/           # Shared types, Zod schemas, constants — @the-dmz/shared
├── e2e/                  # Playwright E2E tests (monorepo root)
├── docker/               # Docker init scripts (postgres/)
├── turbo.json            # Turborepo pipeline config
├── pnpm-workspace.yaml   # Workspaces: apps/*, packages/*
└── tsconfig.base.json    # Shared TypeScript config
```

## Tool Preferences

- Use Read/Edit/Write/Grep/Glob for file operations. Reserve Bash for git, gh, npm/pnpm, docker, and system commands.
- Use `gh` for all GitHub interactions (issues, PRs, checks).
- Run tests with Bash (`pnpm test`), not by reading test output files.
- Workspace-specific commands use `pnpm --filter`: e.g. `pnpm --filter api db:migrate`, `pnpm --filter web build`.
- Turborepo orchestrates cross-workspace tasks: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm typecheck`.
- Additional scripts: `pnpm format`, `pnpm format:check`, `pnpm services:up`, `pnpm services:down`, `pnpm services:reset`.

## Automation

The `auto-develop.sh` script automates issue lifecycle: Research, Implement, Review (2 passes), Commit, Close. When working interactively, follow the same flow from `AGENTS.md` and additionally:

- Self-review against the prohibited actions list before committing.
- Prefer dispatching to sub-agents over doing everything in one thread.
