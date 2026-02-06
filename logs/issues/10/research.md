# Research: Issue #10 — Configure ESLint with flat config

Date: 2026-02-06
Role: Research Agent (Codex)

## Summary
Issue #10 requires a full ESLint 9 flat config across the monorepo, including TypeScript-aware linting, Svelte 5 support, import ordering, cycle detection, and module-boundary enforcement per DD-09. The repo currently has a minimal TS-only ESLint setup and no Svelte or import boundary enforcement.

## Key Findings
- `eslint.config.cjs` is minimal, only covers `*.{js,cjs,mjs,ts}`, and has no Svelte parser/plugin, import ordering, or module boundary rules. (`eslint.config.cjs`)
- All packages run `eslint . --max-warnings=0`, so warnings already fail locally, conflicting with “warn in dev, error in CI” unless scripts or rule severity are made conditional. (`apps/api/package.json`, `apps/web/package.json`, `packages/shared/package.json`)
- DD-09 explicitly mandates: no cross-module internal imports, no circular dependencies, and enforcement through ESLint (`import/no-cycle`) plus additional tooling. (`docs/DD/09_backend_architecture_api.md` Section 1.3)
- Svelte 5 runes are a core frontend standard, implying the ESLint setup must support Svelte 5 parsing and a11y linting. (`docs/DD/08_frontend_architecture_sveltekit.md`)
- The API module layout already follows the `modules/<name>/index.ts` barrel pattern; boundary enforcement should lock this in before more modules are added. (`apps/api/src/modules/health/*`)

## Current Behavior (Observed)
- Root ESLint config (`eslint.config.cjs`) uses `@eslint/js` + `@typescript-eslint` recommended only. No `parserOptions.project`, no type-aware rules, no Svelte support, no import ordering, no `import/no-cycle`.
- Dev dependencies only include `eslint`, `@typescript-eslint/*`, and `@eslint/js`. No `eslint-plugin-svelte`, `svelte-eslint-parser`, `eslint-plugin-import-x`, or resolver packages. (`package.json`)
- Workspace lint scripts run ESLint with `--max-warnings=0` in every package (`apps/api`, `apps/web`, `packages/shared`).
- `.vscode/` is missing; no ESLint extension recommendations or flat-config settings are present.

## Root Cause Analysis
- M0-10 (ESLint flat config) has not been implemented beyond a minimal TS-only setup. The current config lacks the plugins and rule sets required by the issue and DD-09 boundaries. The monorepo is already structured for modules and Svelte, but linting rules are not enforcing those architectural constraints.

## Impacted Modules / Files
- Root ESLint config: `eslint.config.cjs` (needs full flat config with TS, Svelte, import-x, boundary rules, and env/CI conditional severity).
- Root `package.json`: add required ESLint plugin dependencies and a `lint:fix` script.
- Workspace packages: scripts may need `lint:fix` and/or conditional warning handling.
- `apps/web`: `.svelte` files must be included in ESLint scope and a11y rules applied.
- `apps/api`: module boundaries in `src/modules/*` must be enforced; `import/no-cycle` and import ordering should apply.
- `.vscode/settings.json` and `.vscode/extensions.json` should be added for ESLint + Svelte integration.

## Constraints and Requirements
- DD-09 Section 1.3 requires: no cross-module imports of internal files, no circular dependencies, and enforcement via ESLint `import/no-cycle`. (`docs/DD/09_backend_architecture_api.md`)
- Frontend uses Svelte 5 runes (`$state`, `$derived`, `$effect`); ESLint must parse Svelte 5 syntax and include Svelte a11y rules. (`docs/DD/08_frontend_architecture_sveltekit.md`)
- Project standard: no default exports (SOUL.md). However, tool config files like `svelte.config.js` already use default exports and should be excluded or overridden if a no-default-export rule is added.
- Monorepo layout: `apps/*` and `packages/*` with per-package `tsconfig.json`.

## Alternative Approaches
- Boundary enforcement:
  - Use `eslint-plugin-import-x` rule `import-x/no-internal-modules` with `allow` patterns for `**/index.ts` and same-module relative imports.
  - Use `eslint-plugin-boundaries` for explicit element definitions and allowed import rules (stronger but extra dependency; not required by issue).
- Type-aware linting:
  - Use `@typescript-eslint` `recommended-type-checked` configs with `parserOptions.projectService: true` (simplifies multi-tsconfig monorepo).
  - Alternatively, maintain explicit `parserOptions.project` array for `apps/*/tsconfig.json` and `packages/*/tsconfig.json`.
- Import ordering:
  - `import-x/order` with custom `pathGroups` for `$lib`, `$api`, `$ui`, `$stores`, `$utils`, `$game`, and `@the-dmz/*` to classify them as internal.

## Risks / Edge Cases
- `eslint . --max-warnings=0` will fail on warnings even in dev; to allow “warn in dev, error in CI,” scripts or rule severity must be conditional (e.g., based on `process.env.CI`).
- Type-aware linting with `parserOptions.project` can be slow and error-prone if tsconfig paths or `tsconfigRootDir` are misconfigured; `projectService` may be safer.
- `import-x/no-cycle` can be expensive and needs a resolver configured for TS path aliases or it may miss cycles.
- If a no-default-export rule is applied globally, it will likely flag config files like `apps/web/svelte.config.js` which require default exports.
- Svelte linting requires `svelte-eslint-parser`; without it ESLint will fail on `.svelte` files or silently skip them.

## Test Ideas
- Run `pnpm lint` from repo root and ensure it completes without errors across all packages.
- Run `pnpm lint:fix` and verify auto-fixes for import ordering and unused vars.
- Add a temporary cross-module import in `apps/api/src/modules/*` (e.g., importing `health.service.ts` directly from a different module) to confirm boundary enforcement triggers.
- Add a temporary circular import between two files and confirm `import-x/no-cycle` fails.
- Add an unused variable in a TS file and verify warning vs error behavior in local vs CI runs.
- Add a simple Svelte a11y violation (e.g., missing `alt`) to confirm Svelte lint rules are active.

## References
- DD-09 Module Enforcement Rules (Section 1.3): `docs/DD/09_backend_architecture_api.md`
- Svelte 5 runes usage: `docs/DD/08_frontend_architecture_sveltekit.md`
- Current ESLint config: `eslint.config.cjs`
- Workspace scripts and dependencies: `package.json`, `apps/*/package.json`, `packages/shared/package.json`
