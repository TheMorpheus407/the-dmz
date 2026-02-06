ACCEPTED Review of issue #9 (coverage)

Summary
- `tsconfig.base.json` now includes all strict-mode compiler options required by the issue, plus existing stricter flags.
- All packages still extend the shared base config, and web now runs `tsc --noEmit` during typecheck.
- Builds and typechecks complete successfully with the updated strict settings.

Findings
- None.

Verification
- Confirmed required base config options are present in `tsconfig.base.json`.
- Confirmed `apps/web/tsconfig.json`, `apps/api/tsconfig.json`, and `packages/shared/tsconfig.json` extend the base.
- Intentional error test: added a temporary `packages/shared/src/__intentional_type_error__.ts` with a type mismatch, ran shared typecheck to confirm failure, then removed the file.

Tests
- `pnpm typecheck`
- `pnpm --filter @the-dmz/api build`
- `pnpm --filter @the-dmz/shared build`
- Intentional error test (expected failure): `pnpm --filter @the-dmz/shared typecheck`
