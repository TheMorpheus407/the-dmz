# Token Contract Guide

This document describes the M1 frontend design token contract system and how to work with it safely.

## Overview

The token contract system ensures design token regressions (missing required token keys, inconsistent theme coverage, or accidental route-surface default drift) are caught early in CI/Turbo before broader E2E or accessibility checks fail.

## Canonical Token Contract

The token contract is defined in:

```
apps/web/src/lib/ui/tokens/contract.ts
```

This file contains:

- **Required theme IDs**: `green`, `amber`, `high-contrast`, `enterprise`
- **Required surface IDs**: `game`, `admin`, `auth`, `public`
- **Required token groups**: background/surface, text, semantic, border/accent, typography, spacing, effects
- **Route-surface default mappings**: which theme each surface uses by default

## Token Groups

The contract defines these token groups that must be present for each theme:

| Group               | Tokens                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `backgroundSurface` | `--color-bg`, `--color-surface`                                                                    |
| `text`              | `--color-text`, `--color-text-muted`                                                               |
| `semantic`          | `--color-safe`, `--color-warning`, `--color-danger`, `--color-info`, `--color-critical`            |
| `borderAccent`      | `--color-border`, `--color-accent`                                                                 |
| `typography`        | `--font-terminal`, `--font-document`, `--font-admin`, `--text-*`                                   |
| `spacing`           | `--space-0`, `--space-1`, `--space-2`, `--space-4`, `--space-8`                                    |
| `effects`           | `--effect-scanlines`, `--effect-curvature`, `--effect-glow`, `--effect-noise`, `--effect-vignette` |

## Running the Token Gate

### Local Development

```bash
# Run token contract validation
pnpm --filter web test:tokens

# Or use check:tokens
pnpm --filter web check:tokens

# Run all web tests including token contract tests
pnpm --filter web test
```

### CI/Turbo

The token check is integrated into the pipeline:

```bash
# Runs via turbo when checking the web app
turbo run check:tokens --filter=web
```

## Adding or Renaming Tokens

### Before Making Changes

1. Run the token validation to see current state:

   ```bash
   pnpm --filter web check:tokens
   ```

2. Ensure all tests pass before making changes.

### Adding a New Token

1. Add the token to `index.css` in the appropriate theme block
2. If the token is required for all themes, add it to the appropriate token group in `contract.ts`
3. Run validation to ensure compliance:
   ```bash
   pnpm --filter web check:tokens
   ```
4. Run the full test suite:
   ```bash
   pnpm --filter web test
   ```

### Renaming or Removing a Token

1. Update the token contract in `contract.ts` if needed
2. Update the CSS in `index.css`
3. Run validation to check for drift:
   ```bash
   pnpm --filter web check:tokens
   ```

### Adding a New Theme

1. Add the theme ID to `REQUIRED_THEME_IDS` in `contract.ts`
2. Add the theme to `packages/shared/src/constants/taxonomy.ts`
3. Create the theme block in `index.css`
4. Ensure all required token groups are defined for the theme
5. Run validation:
   ```bash
   pnpm --filter web check:tokens
   ```

### Changing Route-Surface Defaults

If you need to change which theme a surface uses by default:

1. Update `ROUTE_SURFACE_DEFAULTS` in `contract.ts`
2. Update `getRouteDefaultTheme()` in `apps/web/src/lib/stores/theme.ts`
3. Update `THEME_METADATA` in `packages/shared/src/constants/taxonomy.ts`
4. Run validation to ensure consistency:
   ```bash
   pnpm --filter web check:tokens
   ```

## Troubleshooting

### "Required theme 'X' is missing from CSS"

The theme is defined in the contract but not in `index.css`. Add the theme block to the CSS file.

### "Theme 'X' is missing required tokens in 'Y'"

The theme block in `index.css` is missing tokens from the specified group. Add the missing tokens.

### "Route-surface 'X' maps to 'Y' but contract expects 'Z'"

The runtime theme store (`theme.ts`) doesn't match the contract. Update the theme store to match the contract.

### "High-contrast theme must disable CRT effects"

The high-contrast theme must set `--effect-scanlines: 0`, `--effect-curvature: 0`, and `--effect-glow: 0`.

### "Enterprise theme must disable CRT effects"

The enterprise theme must set `--effect-scanlines: 0`, `--effect-curvature: 0`, and `--effect-glow: 0`.

## Files Reference

| File                     | Purpose                                |
| ------------------------ | -------------------------------------- |
| `contract.ts`            | Canonical token contract definition    |
| `validate.ts`            | Token integrity validation script      |
| `index.css`              | Design tokens CSS                      |
| `tokens.test.ts`         | Basic token presence tests             |
| `theme-contract.test.ts` | Token contract and runtime theme tests |
