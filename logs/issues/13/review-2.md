DENIED Changes largely satisfy the Vitest infrastructure requirements, but the diff includes a prohibited, out-of-scope modification.

Summary:
- Vitest workspace config, per-package configs, test utilities, and smoke tests are in place for api/web/shared.
- Test scripts and dependencies are added; coverage configuration is present and producing reports.

Findings:
- Blocker: `auto-develop.sh` is modified in this change set. AGENTS.md explicitly forbids modifying governance files without user instruction, and it is unrelated to issue #13.

Tests:
- `pnpm test`
- `pnpm test:coverage`

Untracked files:
- none
