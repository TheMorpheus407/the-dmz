# Research: Issue #12 — Husky git hooks with lint-staged

## Summary
The repository already has ESLint/Prettier tooling and a Turbo-based `typecheck` pipeline, but there is no Husky setup, no lint-staged config, and no commitlint configuration. Issue #12 requires adding Husky 9.x hooks, lint-staged rules, and commit message validation. The work is primarily root-level tooling and hook files under `.husky/`.

## Key Findings
- No `.husky/` directory exists; git hooks are not configured.
- No `.lintstagedrc.json` or commitlint config exists.
- Root `package.json` lacks a `prepare` script and does not include `husky`, `lint-staged`, `commitlint`, or `@commitlint/config-conventional` dependencies.
- ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc`) are already in place, and root scripts (`lint`, `lint:fix`, `format`, `typecheck`) exist.
- The Turbo pipeline defines a `typecheck` task; each workspace package defines `typecheck` scripts.

## Current Behavior
- `pnpm install` does not set up git hooks (no `prepare` script).
- Pre-commit hook does not exist, so staged files are not linted/formatted automatically.
- Pre-push hook does not exist; `pnpm typecheck` is not enforced on push.
- Commit messages are not validated.

## Root Cause Analysis
The tooling for Husky/lint-staged/commitlint has not been implemented yet. The repository is in M0 bootstrap and currently only includes ESLint/Prettier/Turbo scaffolding without git hook automation.

## Impacted Modules / Areas
- Root tooling: `package.json` (scripts + devDependencies)
- Hook files: `.husky/pre-commit`, `.husky/pre-push`, `.husky/commit-msg` (and Husky bootstrap files)
- Config files: `.lintstagedrc.json`, `.commitlintrc.json`
- Developer workflow: git commit/push operations

## Constraints & Requirements (Issue + Repo)
- Husky 9.x required; hooks must live in `.husky/`.
- `prepare` script in root `package.json` must auto-install hooks on `pnpm install`.
- Pre-commit hook runs `lint-staged` on staged files only.
- lint-staged config must follow the exact patterns provided in the issue.
- Pre-push hook runs `pnpm typecheck`.
- Commit message validation required via commitlint with Conventional Commits (scopes include `deps`).
- Hooks must remain bypassable via `--no-verify` (default git behavior).
- Do not modify governance files (`SOUL.md`, `AGENTS.md`, `auto-develop.sh`).

## Relevant Repo Context
- Root `package.json` already defines `lint`, `lint:fix`, `format`, `typecheck`, and Turbo tasks.
- `eslint.config.mjs` expects tsconfig paths under `apps/web`, `apps/api`, `packages/shared` (all exist).
- `.prettierrc` already includes `prettier-plugin-svelte`, so the explicit `--plugin` flag for Svelte is likely redundant but still acceptable for lint-staged.
- `pnpm typecheck` runs `turbo run typecheck`, which executes workspace `typecheck` scripts. In `packages/shared`, `typecheck` runs `generate:schemas`, which writes a generated TS file; output should be stable but can create diffs if schema changes.

## Alternative Approaches Considered
- **Manual git hooks (no Husky)**: Rejected by issue requirements; Husky 9.x is mandated.
- **Use `lefthook` / `pre-commit` frameworks**: Rejected by requirements.
- **Use `lint`/`format` scripts instead of `eslint --fix`/`prettier --write`**: Might be acceptable but the issue specifies explicit lint-staged commands. Follow the issue.
- **Skip commitlint**: Not acceptable; acceptance criteria requires commit message validation.

## Risks / Edge Cases
- **Husky v9 hook bootstrap format**: Husky 9 changed parts of setup compared to v8. Ensure hook files use the correct bootstrap line for v9 (avoid stale `_ / husky.sh` usage if no longer applicable).
- **Typecheck on pre-push is heavy**: `pnpm typecheck` runs across all workspaces; this is required but may slow pushes.
- **Generated schema file in shared package**: `typecheck` triggers schema generation; if output changes, this can cause unexpected diffs during pre-push.
- **lint-staged + ESLint type-aware config**: ESLint uses type-aware rules for TS/Svelte; ensure lint-staged passes explicit file paths to avoid scanning the entire repo.

## Test / Validation Ideas
- `pnpm install` should run the `prepare` script and set `core.hooksPath` to `.husky` (verify with `git config core.hooksPath`).
- Create a staged change in a `.ts` or `.svelte` file; run `git commit` and confirm only staged files are linted/formatted by lint-staged.
- Push a branch and confirm `pnpm typecheck` runs and blocks push on errors.
- Try a bad commit message (e.g., `bad message`) and verify commitlint rejects with a clear error.
- Try a valid commit message (e.g., `feat(api): add health check endpoint`) and confirm it passes.

## Notes for Implementation Agent
- Add devDependencies: `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`.
- Add `prepare` script in root `package.json` to run `husky install` (confirm exact Husky 9 command).
- Add `.lintstagedrc.json` and `.commitlintrc.json` with the issue-provided content.
- Create `.husky/pre-commit` (runs lint-staged), `.husky/pre-push` (runs `pnpm typecheck`), `.husky/commit-msg` (runs commitlint).

