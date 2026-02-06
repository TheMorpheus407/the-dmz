# Research: Issue #19 — Repository Configuration (.gitignore, .gitattributes, LICENSE)

## 1. Issue Summary

Configure the three foundational repository files:
1. **`.gitignore`** — comprehensive patterns for a Node.js/TypeScript/SvelteKit/Turborepo monorepo
2. **`.gitattributes`** — LF line ending enforcement + binary file handling
3. **`LICENSE`** — proprietary license with Matrices GmbH copyright

References: DD-14 Section 34.5 (Key Management and Secrets — "Secrets are never logged or exposed"), MILESTONES.md Cross-Cutting Security.

## 2. Current State Analysis

### 2.1 `.gitignore` (14 lines, partially complete)

Current contents:
```gitignore
/.idea/
node_modules/
.turbo/
dist/
coverage/
.svelte-kit/
apps/web/build/
playwright-report/
test-results/
e2e/.setup-state.json
e2e/.tmp-results/
.env
.env.*
!.env.example
```

**What's already covered:**
- `node_modules/`, `.turbo/`, `dist/`, `coverage/` — core build/dependency patterns
- `.svelte-kit/`, `apps/web/build/`, `playwright-report/`, `test-results/` — SvelteKit and test output
- `.env`, `.env.*`, `!.env.example` — environment files with allowlist
- `.idea/`, `e2e/.setup-state.json`, `e2e/.tmp-results/` — IDE and test state

**What's missing (verified by `git check-ignore`):**

| Pattern | Risk | Notes |
|---------|------|-------|
| `.pnpm-store/` | Low | Local pnpm store leaking into commits |
| `build/` | Medium | Generic build output (only `apps/web/build/` is covered) |
| `.nyc_output/` | Low | Legacy coverage tool output |
| `pgdata/` | High | Docker volume data if mounted locally |
| `*.log` | Medium | Runtime log files (not currently tracked, but unprotected) |
| `logs/` | **CONFLICT** | See Section 3.1 |
| `*.tsbuildinfo` | Medium | TypeScript incremental build cache |
| `*.sql.bak` | Medium | Database backup files with potential secrets |
| `.DS_Store` | Low | macOS filesystem metadata |
| `Thumbs.db` | Low | Windows thumbnail cache |
| `*.swp` / `*.swo` | Low | Vim swap files |
| `.vscode/*` (with allowlist) | Medium | IDE config leaking, but need to keep tracked files |

### 2.2 `.gitattributes` (1 effective line, needs expansion)

Current contents:
```gitattributes
* text=auto eol=lf
```

This single line already handles the core requirement: auto-detect text files and normalize to LF. However, the issue requests:
- Explicit per-extension LF enforcement (`.ts`, `.tsx`, `.js`, `.json`, `.md`, `.css`, `.html`, `.svelte`, `.yaml`, `.yml`, `.sh`)
- Binary file declarations (`.png`, `.jpg`, `.gif`, `.ico`, `.woff`, `.woff2`)
- Export-ignore patterns for IDE directories

The current config is functionally correct for line endings but lacks binary declarations and export-ignore.

### 2.3 `LICENSE` (does not exist)

No `LICENSE` file exists at the repo root. No license files are tracked in the project (only in `node_modules/`).

### 2.4 `.vscode/` files (tracked, need allowlisting)

Currently tracked:
- `.vscode/settings.json` — ESLint flat config settings
- `.vscode/extensions.json` — Recommended extensions (eslint, svelte)

The issue requires: `.vscode/*` ignored EXCEPT `settings.json`, `extensions.json`, `launch.json`. This means:
- Current tracked files remain tracked (good)
- Future random `.vscode/` files won't be committed (good)
- `launch.json` doesn't exist yet but should be allowlisted for issue #25

## 3. Key Findings & Conflicts

### 3.1 CRITICAL: `logs/` Directory Conflict

The issue spec includes `logs/` in the `.gitignore` pattern list. However:

- **84 files** are currently tracked under `logs/issues/` — these are auto-develop.sh pipeline artifacts (research.md, implementation.md, review-1.md, review-2.md, commit-message.txt, issue.json per issue)
- `auto-develop.sh` writes to `logs/issues/{N}/` and the finalization step commits these files
- `.prettierignore` already excludes `logs/` and `logs/**`
- `.dockerignore` already excludes `logs/`

**Resolution options:**

| Option | Approach | Impact |
|--------|----------|--------|
| A) Ignore `logs/` entirely | Add `logs/` to `.gitignore`, `git rm -r --cached logs/` | Breaks auto-develop.sh commit flow; loses pipeline audit trail |
| B) Only ignore `*.log` files | Add `*.log` but NOT `logs/` | Pipeline artifacts stay tracked; `.log` runtime files ignored |
| C) Selective ignore | Ignore `logs/` but allowlist `logs/issues/` | Complex pattern; still ignores untracked issue artifacts |

**Recommendation: Option B** — ignore `*.log` file extension only. The `logs/issues/` directory serves as an audit trail for the auto-develop pipeline and is intentionally tracked. The issue's `*.log` and `logs/` patterns serve different purposes. Adding `*.log` protects against runtime log files. The `logs/` directory pattern should be **omitted** from `.gitignore` to avoid breaking the existing pipeline. If the user later decides to stop tracking pipeline artifacts, that should be a separate decision.

### 3.2 `.env` Patterns Already Correct

The current `.env` / `.env.*` / `!.env.example` pattern is correct and matches the issue requirements. The `.env.example` file is tracked and contains only placeholder/dev values (no production secrets). DD-14 Section 34.5 requires secrets never be logged or exposed — the current ignore pattern satisfies this.

### 3.3 `.vscode/` Allowlist Pattern

The issue specifies allowlisting three files:
```gitignore
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json
```

Both `settings.json` and `extensions.json` are already tracked. Adding `.vscode/*` as an ignore pattern with negations will keep these tracked while preventing future `.vscode/` clutter. `launch.json` doesn't exist yet (issue #25 will create it) but pre-allowlisting it is correct.

### 3.4 Line Ending Enforcement

The current `.gitattributes` (`* text=auto eol=lf`) already forces LF. The issue wants explicit per-extension rules. This is a **defense-in-depth** approach — the `* text=auto eol=lf` catchall handles everything, and per-extension rules provide explicit documentation of which files are text. Both approaches coexist without conflict.

The `.editorconfig` already sets `end_of_line = lf` for all files, reinforcing the LF-everywhere policy.

### 3.5 License Decision

The issue suggests "proprietary with Matrices GmbH copyright" and provides the copyright line: `Copyright 2025-2026 Matrices GmbH`. Since this is a commercial product (B2B enterprise + B2C consumer), a proprietary license is appropriate. A common format is:

```
Copyright (c) 2025-2026 Matrices GmbH. All rights reserved.

This software is proprietary and confidential.
Unauthorized copying, modification, distribution, or use of this
software, via any medium, is strictly prohibited.
```

The user should confirm the exact license text.

## 4. Impacted Modules

| Module | Impact | Reason |
|--------|--------|--------|
| Root config | **Primary** | All three files live at repo root |
| `auto-develop.sh` | **Indirect** | `logs/` ignore decision affects pipeline |
| `.dockerignore` | None | Already has comprehensive ignore patterns |
| `.prettierignore` | None | Already excludes irrelevant paths |
| CI (`.github/workflows/ci.yml`) | None | No impact on CI — these are git-level configs |
| `.vscode/` | **Minor** | Allowlist pattern affects which IDE files get tracked |

## 5. Implementation Plan

### Step 1: Update `.gitignore`

Replace the 14-line file with the comprehensive version from the issue, with these adjustments:
- **Keep** all existing patterns (they're all correct)
- **Add** missing patterns: `.pnpm-store/`, `build/`, `.nyc_output/`, `pgdata/`, `*.log`, `*.tsbuildinfo`, `*.sql.bak`, `.DS_Store`, `Thumbs.db`, `*.swp`, `*.swo`
- **Add** `.vscode/*` with `!.vscode/settings.json`, `!.vscode/extensions.json`, `!.vscode/launch.json`
- **Do NOT add** `logs/` — omit this to preserve auto-develop pipeline artifacts
- **Verify** `.env.example` is still tracked after changes (`!.env.example` negation)

### Step 2: Update `.gitattributes`

Replace the 1-line file with the expanded version from the issue:
- Keep `* text=auto` as the base rule
- Add per-extension `text eol=lf` rules for all project file types
- Add `.svelte` (project-specific)
- Add binary declarations for image and font files
- Add `export-ignore` for `.idea/` and `.vscode/`

### Step 3: Create `LICENSE`

Create a proprietary license file at repo root with:
- Copyright 2025-2026 Matrices GmbH
- All rights reserved
- Proprietary/confidential terms

### Step 4: Verify

- Run `git check-ignore` on all critical patterns to confirm they're ignored
- Verify `.vscode/settings.json` and `.vscode/extensions.json` are NOT ignored
- Verify `.env.example` is NOT ignored
- Verify `logs/issues/` directory files remain tracked
- Verify no tracked files become untracked unexpectedly

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Adding `.vscode/*` to `.gitignore` causes tracked files to "disappear" | Low | Git doesn't untrack already-tracked files when adding ignore patterns. Only new files are affected. |
| `logs/` conflict breaks auto-develop pipeline | Medium | Omit `logs/` from `.gitignore` (Option B). If later desired, handle as separate cleanup issue. |
| License text needs legal review | Medium | Use standard proprietary boilerplate; user can refine later |
| Missing patterns for future tools (e.g., Storybook, Docker volumes) | Low | `.gitignore` can be extended incrementally |
| `*.log` pattern might ignore intentional `.log` extension files | Very low | No `.log` files are tracked or expected in the codebase |

## 7. Test Ideas

1. **Pattern coverage test**: After changes, run `git check-ignore` on every pattern listed in the issue's acceptance criteria:
   - `.env`, `.env.local`, `.env.production.local` → should be ignored
   - `.env.example` → should NOT be ignored
   - `node_modules/`, `dist/`, `.turbo/`, `.svelte-kit/` → should be ignored
   - `.vscode/random-file.json` → should be ignored
   - `.vscode/settings.json`, `.vscode/extensions.json`, `.vscode/launch.json` → should NOT be ignored
   - `.DS_Store`, `Thumbs.db`, `test.log`, `test.tsbuildinfo` → should be ignored

2. **No untracked regressions**: `git status` should show only the three modified/new files (`.gitignore`, `.gitattributes`, `LICENSE`), not suddenly untracked files from existing paths.

3. **Line ending verification**: After `.gitattributes` update, `git ls-files --eol` can verify LF normalization on text files.

4. **Export archive test**: `git archive HEAD | tar -t` should not include `.idea/` or `.vscode/` (export-ignore).

5. **Docker build test**: Ensure `.dockerignore` and `.gitignore` don't conflict — Docker uses `.dockerignore` independently, so no conflict expected.

## 8. Open Questions for Implementer

1. **License text**: The issue says "discuss with team" for the license. Use proprietary boilerplate as described unless the user specifies otherwise.
2. **`logs/` directory**: Recommend NOT adding `logs/` to `.gitignore` (see Section 3.1). The issue spec includes it, but 84 tracked pipeline artifacts would be affected.
3. **`.idea/` pattern**: Currently `.idea/` is in `.gitignore` as `/.idea/` (root-only). The issue doesn't mention changing this. Keep as-is — it's correct.
