# Research: Issue #11 — Configure Prettier for code formatting

## Key Findings

- Prettier is already installed at the repo root and `pnpm format` / `pnpm format:check` scripts exist in `package.json`.
- There is **no** Prettier config file (`.prettierrc` or `prettier.config.*`) anywhere in the repo.
- `.prettierignore` exists but **does not match** the issue requirements and currently ignores `docs/**`, `logs/**`, and governance files, which conflicts with the requirement to format Markdown consistently.
- ESLint configuration in `eslint.config.mjs` does not include `eslint-config-prettier`, and the dependency is not in `package.json`.
- `.editorconfig` is missing.
- `packages/shared/scripts/generate-json-schemas.ts` calls `prettier.resolveConfig(...)`; adding `.prettierrc` will change generated output formatting.

## Current Behavior

- `pnpm format` runs `prettier --write .` using default Prettier settings, because no config is present.
- `.svelte` formatting is likely **not** enabled because the Svelte plugin is not configured; this can cause Prettier to skip or error on `.svelte` files under `apps/web/src/routes/`.
- `.prettierignore` currently excludes `docs/**` and `logs/**`, so Markdown in those folders is not formatted even though the issue requires consistent MD formatting.

## Root Cause Analysis

- Required Prettier configuration files (`.prettierrc`, `.editorconfig`) are missing.
- `.prettierignore` does not align with the issue’s specified ignore list.
- ESLint/Prettier integration (`eslint-config-prettier`) is absent, so conflicting ESLint formatting rules are not explicitly disabled.

## Impacted Modules / Files

- Root config files: `.prettierrc` (new), `.prettierignore` (update), `.editorconfig` (new).
- ESLint config: `eslint.config.mjs` (needs `eslint-config-prettier` applied).
- Dependencies: `package.json` / `pnpm-lock.yaml` (add `eslint-config-prettier`).
- Svelte source files (e.g. `apps/web/src/routes/(public)/+page.svelte`) rely on the Prettier Svelte plugin to format correctly.
- Generated schema output: `packages/shared/scripts/generate-json-schemas.ts` will format output using the new config.

## Constraints From Issue / Repo

- `.prettierrc` **must** use the JSON config in the issue (printWidth 100, single quotes, trailing commas, Svelte plugin override).
- `.prettierignore` must include at least: `node_modules`, `dist`, `build`, `.svelte-kit`, `coverage`, `*.min.js`, `pnpm-lock.yaml`.
- `.editorconfig` must follow the exact block specified in the issue.
- “Prettier runs AFTER ESLint” implies we should avoid `eslint-plugin-prettier` and only disable conflicting ESLint rules.
- Repo rules prohibit modifying governance files (`SOUL.md`, `AGENTS.md`, `auto-develop.sh`).

## Alternative Approaches

- Use `.prettierrc` (JSON) as required vs. `prettier.config.cjs` (more flexible, but not requested).
- Integrate `eslint-config-prettier` by importing it and appending it as the last entry in the flat config array; alternative is to merge its rules into each config block, but that is more error-prone.
- If large markdown formatting diffs are a concern, keep `docs/**` ignored. This would conflict with the issue requirement, so it should be considered only if the requirement is relaxed.

## Risks / Edge Cases

- Formatting `docs/**` could create huge diffs (reflowed Markdown), which might be undesirable but is required by the issue.
- `prettier-plugin-svelte` requires Svelte as a peer dependency. If resolution fails at the root, Prettier may still error. Consider adding `svelte` at the root devDependencies only if formatting fails.
- `packages/shared/scripts/generate-json-schemas.ts` output may change formatting; regenerated files should be reviewed/committed if the script is run.
- `printWidth: 100` may change formatting and could impact snapshots (if any later introduced).

## Test / Validation Ideas

- Run `pnpm format:check` at repo root.
- Run `pnpm format` and verify `git diff` is clean afterward.
- Run `pnpm lint` to confirm ESLint + `eslint-config-prettier` integration has no conflicts.
- Spot-check a Svelte file and a Markdown doc for formatting output.
