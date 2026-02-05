# Claude Code Instructions — The DMZ: Archive Gate

@AGENTS.md
@SOUL.md
@MEMORY.md

## Sub-Agents

Use task-specialized sub-agents from `.claude/agents/` for focused work:

| Agent | Domain | When to Use |
|-------|--------|-------------|
| frontend | SvelteKit, Svelte 5, PixiJS, UI, a11y | Component creation, styling, client state, routing |
| backend | Fastify, game engine, event sourcing | Route handlers, middleware, business logic |
| database | PostgreSQL, Drizzle ORM, RLS | Schema changes, migrations, queries |
| testing | Vitest, Playwright | Writing tests, coverage analysis, test infrastructure |
| devops | Docker, CI/CD, GitHub Actions | Containers, pipelines, deployment, monitoring |
| reviewer | Code quality, security, standards | Post-implementation review, security audit (read-only — no Edit/Write) |

### Agent Strategy

- Launch independent agents in parallel when tasks don't depend on each other.
- Always run the reviewer agent after significant implementation work.
- Use background agents for research that takes time.
- Each agent should read the relevant DD before starting implementation.

## Tool Preferences

- Use Read/Edit/Write/Grep/Glob for file operations. Reserve Bash for git, gh, npm/pnpm, docker, and system commands.
- Use `gh` for all GitHub interactions (issues, PRs, checks).
- Run tests with Bash (`pnpm test`), not by reading test output files.

## Automation

The `auto-develop.sh` script automates issue lifecycle: Research, Implement, Review (2 passes), Commit, Close. When working interactively, follow the same flow from `AGENTS.md` and additionally:

- Self-review against the prohibited actions list before committing.
- Prefer dispatching to sub-agents over doing everything in one thread.
