DENIED Prettier is configured to skip all Markdown, which violates the issue requirements.

Findings
1. `.prettierignore` now includes `*.md` (and explicitly lists several `.md` files). This causes `pnpm format` and `pnpm format:check` to skip all Markdown, but the issue requires consistent formatting for Markdown files. Remove the `*.md` ignore (and avoid ignoring the docs directory) so Markdown is formatted as required.

Tests
1. `pnpm format:check`
2. `pnpm test`

Notes
1. New config files `.prettierrc` and `.editorconfig` are currently untracked; ensure they are added before commit so CI and local formatting use the intended settings.
