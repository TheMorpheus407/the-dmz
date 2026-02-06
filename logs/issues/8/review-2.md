ACCEPTED

Summary:
- CI workflow added with lint/typecheck/format, unit tests + coverage artifacts/thresholds, build verification, and integration placeholder using Postgres/Redis services.
- Docker workflow added for API/Web images with SHA + latest tags, plus Dockerfile stubs for both apps.
- Branch protection rules documented, and API db smoke script wired for integration placeholder.

Tests:
- `pnpm test`
- `pnpm --filter @the-dmz/api test -- --coverage --coverage.thresholds.lines=1 --coverage.thresholds.functions=1 --coverage.thresholds.branches=1 --coverage.thresholds.statements=1`

Not run:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Docker image builds
