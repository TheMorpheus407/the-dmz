Research complete for #8.

Key findings:
- No `.github/workflows` exists yet; CI/CD is entirely missing.
- Lint scripts in all workspaces are placeholders, so CI lint would be a stub until Issue #10.
- No `apps/api/Dockerfile` or `apps/web/Dockerfile`; Docker workflow will fail until added.
- Integration tests aren’t implemented; placeholder should at least run DB migrations with Postgres/Redis service containers.
- DD-14 (12.2, 34.4) calls for GitHub Actions, plus security scanning/SBOM (likely Issue #23).

Full research is in `logs/issues/8/research.md`.
