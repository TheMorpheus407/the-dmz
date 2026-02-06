# Research: Issue #9 — Set up TypeScript strict mode configuration

## Summary
The workspace already has a shared `tsconfig.base.json` and each package extends it, but the base config is **not aligned with the strict settings required by Issue #9**. Several mandatory compiler options are missing (`noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`, `esModuleInterop`, `resolveJsonModule`, `declaration`, `declarationMap`, `sourceMap`). Root `pnpm typecheck` is wired through Turbo and each package has a `typecheck` script, so the wiring is largely in place; the gap is primarily the base config strictness and any resulting type errors.

## Key Findings
- `tsconfig.base.json` exists but is **incomplete** vs the required strict-mode base config; it currently sets only a subset of the required flags. (`tsconfig.base.json`)
- All packages already extend the base config (`apps/web`, `apps/api`, `packages/shared`), so updating the base will propagate strictness everywhere. (`apps/web/tsconfig.json`, `apps/api/tsconfig.json`, `packages/shared/tsconfig.json`)
- `pnpm typecheck` already runs `turbo run typecheck`, and each package defines a `typecheck` script; this aligns with the acceptance criteria but may fail once strict flags are added. (`package.json`, package-level `package.json`)
- `apps/web` already has SvelteKit-specific compiler options and path aliases; `apps/api` already overrides module resolution to `NodeNext`; `packages/shared` already supports dual ESM/CJS via `tsconfig.esm.json` and `tsconfig.cjs.json`. These should remain compatible with a stricter base.

## Current Behavior (Repo Scan)
- **Base config:**
  - `tsconfig.base.json` sets `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noPropertyAccessFromIndexSignature: true`, `forceConsistentCasingInFileNames: true`, `skipLibCheck: true`.
  - Missing required strict options listed in Issue #9.
- **Web:**
  - `apps/web/tsconfig.json` extends base, sets `lib`, `types`, `baseUrl`, `rootDirs`, `paths`, `isolatedModules`, `resolveJsonModule`, `verbatimModuleSyntax`, and includes Svelte files.
- **API:**
  - `apps/api/tsconfig.json` extends base, overrides `module` and `moduleResolution` to `NodeNext`, sets `rootDir`, `outDir`, `types: ["node"]`, plus `sourceMap`, `declaration`, `declarationMap`.
- **Shared:**
  - `packages/shared/tsconfig.json` extends base, sets `rootDir`, `declaration`, `declarationMap`, `sourceMap`.
  - `packages/shared/tsconfig.esm.json` and `tsconfig.cjs.json` handle dual ESM/CJS output.
- **Typecheck wiring:**
  - Root `package.json` uses `turbo run typecheck` and each package defines a `typecheck` script.

## Root Cause Analysis
Issue #1 likely created a **minimal** `tsconfig.base.json` to bootstrap the workspace. Issue #9 now requires a more comprehensive strict-mode baseline. The base config hasn’t been updated to include the mandated strict flags, so strictness is not uniform across packages and several requirements are unmet.

## Impacted Modules / Areas
- `tsconfig.base.json` (primary change)
- `apps/web/tsconfig.json` (inherits new strict flags; may need minor adjustments if errors surface)
- `apps/api/tsconfig.json` (inherits new strict flags; ensure Node-specific overrides remain)
- `packages/shared/tsconfig.json` and build-specific configs (`tsconfig.esm.json`, `tsconfig.cjs.json`)
- Root `pnpm typecheck` (may surface new errors once strict flags apply)

## Requirements & Constraints (Issue + Docs)
- **M0 Code quality** requires strict TypeScript across the repo (`docs/MILESTONES.md`).
- **DD-08 Section 6** mandates TypeScript 5.x with strict mode for SvelteKit. (`docs/DD/08_frontend_architecture_sveltekit.md`)
- **DD-09** defines TypeScript throughout backend architecture. (`docs/DD/09_backend_architecture_api.md`)
- SvelteKit path aliases must keep working in `apps/web`.
- Backend build must still emit valid JS into `apps/api/dist`.

## Alternative Approaches Considered
- **Single shared base config (expected):** Update `tsconfig.base.json` to include all required strict options and let packages inherit. This matches the issue requirements.
- **Separate base configs (web vs node):** Could reduce friction with differing module resolution needs, but conflicts with the requirement for a single shared base.
- **SvelteKit-generated tsconfig layering:** Use `.svelte-kit/tsconfig.json` as an intermediate `extends` and inject the base via `kit.typescript.config` settings. This is more complex and not required by the issue, but could reduce drift with SvelteKit defaults.

## Risks / Edge Cases
- **New strict flags may break existing code:** `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `exactOptionalPropertyTypes` can produce new errors, especially in placeholder scaffolds.
- **`exactOptionalPropertyTypes` adjustments:** May require explicit `undefined` handling or different object typing in some modules.
- **`noUncheckedIndexedAccess` + strictness:** Can require additional checks when indexing arrays/objects, especially in shared types or configuration maps.
- **`moduleResolution: bundler` vs Node:** Ensure Node-targeted configs continue overriding to `NodeNext`/`Node` so runtime/module resolution stays correct.
- **`declaration` in base:** Web uses `svelte-check` (no emit), so declarations should not be generated, but this could slightly change tooling expectations if someone runs `tsc -p` directly.

## Test / Validation Ideas
- `pnpm typecheck` from repo root (Turbo should run typecheck for all packages).
- `pnpm --filter api build` to confirm `dist/` JS output still emits.
- `pnpm --filter web typecheck` to validate SvelteKit typechecking with the updated base.
- `pnpm --filter shared build` to verify ESM + CJS output still produces type declarations.
- **Intentional error test:** temporarily introduce a known type error (e.g., `const x: number = "string"`) and confirm `pnpm typecheck` fails, then remove it.

## Notes for Implementation Agent
- Keep `apps/api` overrides for `module`/`moduleResolution` (`NodeNext`) and `outDir` intact.
- If enabling `noUnusedParameters`, consider prefixing unused params with `_` or removing placeholder params to avoid errors.
- Decide whether to keep existing extra strict flags in the base (`noImplicitOverride`, `noPropertyAccessFromIndexSignature`) or remove them; they are stricter than the issue’s requirements but already present.
