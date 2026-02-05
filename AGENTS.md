# Agent Instructions — The DMZ: Archive Gate

> **FIRST:** Read `SOUL.md` for project identity, tech stack, and standards. Read `MEMORY.md` for current project state. These files are your primary context.

## Boundary: Project Root Only

All work MUST stay within this repository. Never read, write, or execute anything outside the project root.

## Repository Layout

```
the-dmz/
├── apps/                  # Application workspaces (created in M0, may not exist yet)
│   ├── web/               # SvelteKit frontend (Svelte 5) — filter: pnpm --filter web
│   └── api/               # Fastify backend (Node.js/TS) — filter: pnpm --filter api
├── packages/              # Library workspaces
│   └── shared/            # Shared types, Zod schemas, constants — @the-dmz/shared
├── docs/                  # All project documentation
│   ├── BRD.md             # Business Requirements Document
│   ├── story.md           # Game premise and mechanics
│   ├── MILESTONES.md      # Development roadmap (M0–M16)
│   ├── BRD/               # 14 BRD research files
│   └── DD/                # 14 Design Documents (DD-01 to DD-14)
├── e2e/                   # Playwright E2E tests (root-level)
├── docker/                # Docker init scripts (postgres/, etc.)
├── .claude/agents/        # Task-specialized sub-agent instructions (Claude Code)
├── logs/issues/{N}/       # Per-issue artifacts (created by auto-develop.sh)
│   ├── issue.json         # Issue snapshot from GitHub
│   ├── research.md        # Research agent output
│   ├── implementation.md  # Implementer agent summary
│   ├── review-1.md        # Reviewer A verdict (ACCEPTED/DENIED)
│   └── review-2.md        # Reviewer B verdict (ACCEPTED/DENIED)
├── pnpm-workspace.yaml    # Workspace definitions: apps/*, packages/*
├── turbo.json             # Turborepo pipeline config
├── tsconfig.base.json     # Shared TypeScript base config
├── SOUL.md                # Project identity, tech stack, standards (do not modify)
├── MEMORY.md              # Living project state (update as you work)
├── AGENTS.md              # This file (do not modify without user instruction)
├── CLAUDE.md              # Claude Code extensions
└── auto-develop.sh        # Multi-agent development loop
```

## Environment

- Node.js 22.x, pnpm 9.x (install if missing: `corepack enable` or `npm i -g pnpm`)
- Turborepo for build orchestration (`turbo.json` at repo root)
- Git, gh CLI (authenticated), Docker
- Repository: github.com/TheMorpheus407/the-dmz (master branch)

## Commands (M0+)

```sh
# Core
pnpm install              # Install all workspace dependencies
pnpm dev                  # Start frontend + backend dev servers (via Turborepo)
pnpm dev:web              # Start only SvelteKit (port 5173)
pnpm dev:api              # Start only Fastify (port 3001)
pnpm dev:services         # Start only Docker Compose services
pnpm build                # Production build (via Turborepo)

# Quality
pnpm lint                 # ESLint check (via Turborepo)
pnpm lint:fix             # Auto-fix lint issues
pnpm format               # Format all files (Prettier)
pnpm format:check         # Check formatting (CI mode)
pnpm typecheck            # TypeScript strict check across all packages

# Testing
pnpm test                 # Run all Vitest tests (via Turborepo)
pnpm test:watch           # Watch mode for active development
pnpm test:coverage        # Run tests with coverage report
pnpm test:e2e             # Run Playwright E2E tests
pnpm --filter api test    # Run API tests only
pnpm --filter web test    # Run web tests only

# Database
pnpm db:migrate           # Run Drizzle migrations
pnpm db:seed              # Seed development data
pnpm db:seed:test         # Seed test database
pnpm db:reset             # Drop, re-migrate, re-seed (dev only)
pnpm --filter api db:generate  # Generate migration from schema changes
pnpm --filter api db:studio    # Open Drizzle Studio

# Infrastructure
pnpm services:up          # Start PostgreSQL + Redis (Docker Compose)
pnpm services:down        # Stop infrastructure services
pnpm services:reset       # Stop, remove volumes, restart (clean slate)
pnpm services:logs        # Tail infrastructure service logs
```

## Workflow

1. Work is driven by GitHub Issues (`gh issue list`).
2. Read the issue, all comments, and relevant Design Documents before starting.
3. Research before implementing. Check `docs/DD/` for the relevant system specification.
4. Implement in small, testable increments.
5. Write or update tests for every change.
6. Run tests before considering work complete.
7. Never commit without passing tests.
8. Update `MEMORY.md` when completing milestones or making significant decisions.

### auto-develop.sh Pipeline

The script orchestrates four agent roles against the lowest-numbered open issue (filtered to issues created by the repo owner):

```
Research Agent  -->  Implementer Agent  -->  Reviewer A (correctness)
                                         -->  Reviewer B (issue coverage)
                         ^                          |
                         |  loop if DENIED          |
                         +--------------------------+
                    On both ACCEPTED: commit, push, close issue
```

- **Research:** Reads the issue, codebase, and docs. Writes `logs/issues/{N}/research.md`.
- **Implement:** Reads research + issue. Implements code and tests. Writes `implementation.md`. Does NOT commit.
- **Review A:** Checks uncommitted changes for correctness, quality, and security. First word: `ACCEPTED` or `DENIED`.
- **Review B:** Checks whether changes fully solve the issue. First word: `ACCEPTED` or `DENIED`.
- If either reviewer says `DENIED`, the implement-review loop restarts.
- Each role can be assigned to `claude` or `codex` independently via CLI flags.
- The script works on the current branch. It requires a clean working tree before starting.

## Git Conventions

- **Branches:** `issue-{number}-{short-description}` (e.g., `issue-42-auth-module`)
- **Commits:** `Issue #{number}: {imperative description}` (e.g., `Issue #42: Add JWT validation middleware`)
- One concern per commit. No mixed changes.
- Never force-push to master.
- Never amend published commits.
- Never skip hooks (`--no-verify`).
- When running inside `auto-develop.sh`: the script handles commit, push, and issue close. Do NOT commit yourself.

## File Conventions

- Tests colocated: `module/thing.ts` -> `module/thing.test.ts`
- Backend module tests in `__tests__/` subdirectories: `module/__tests__/module.service.test.ts`
- Shared types in `packages/shared/` (npm scope: `@the-dmz/shared`)
- Database schema in `apps/api/src/db/schema/` (Drizzle TypeScript DSL)
- Migrations in `apps/api/src/shared/database/migrations/` — numbered, never edited after merge
- E2E tests in root-level `e2e/` directory (Playwright)
- No default exports. Named exports only.

## Before Implementing Any System

Read its Design Document first. The DD index is in `SOUL.md`.

## Prohibited Actions

### Filesystem
- Read, write, or execute anything outside the project root
- Delete top-level directories (`rm -rf docs/`, `rm -rf apps/`, `rm -rf packages/`)
- Modify `.git/config` or `.git/hooks/` directly
- Modify governance files (`SOUL.md`, `AGENTS.md`, `auto-develop.sh`) without explicit user instruction
- Write to `/tmp`, `/etc`, `/usr`, `~/.ssh`, or any path outside this repo
- Write secrets, API keys, or tokens into any tracked file

### Git
- `git push --force` to master
- `git reset --hard` without explicit user instruction
- `git clean -fd` without explicit user instruction
- Amend pushed commits
- Skip pre-commit hooks (`--no-verify`)

### System
- Install system-level packages (apt, pacman, nix-env)
- Run network scanners, exploit tools, or miners
- Start persistent background services or daemons
- Modify shell profiles or environment files
- Access other users' home directories
- Download and execute remote binaries
- Open network listeners on non-standard ports

### Content
- Generate real company names, real person names, real URLs, or real PII in game content
- Commit copyrighted content without attribution
- Write offensive, discriminatory, or harmful content

## When Stuck

1. Re-read the relevant Design Document (`docs/DD/`).
2. Check `MEMORY.md` for recent decisions and context.
3. Search existing code for established patterns.
4. Document the blocker clearly and ask for guidance.
