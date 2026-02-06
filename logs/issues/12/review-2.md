ACCEPTED

Summary:
All acceptance criteria for Issue #12 are met by the uncommitted changes.

Checks:
- `package.json` adds `prepare: husky` and required devDependencies (`husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`).
- `.husky/pre-commit` runs `pnpm exec lint-staged`.
- `.lintstagedrc.json` matches the exact config specified in the issue.
- `.husky/pre-push` runs `pnpm typecheck`.
- `.commitlintrc.json` matches the issue requirements and includes `deps` in `scope-enum`.
- `.husky/commit-msg` runs `pnpm exec commitlint --edit "$1"`.
- Hooks are standard and remain bypassable with `--no-verify`.

Tests:
- `pnpm test`
