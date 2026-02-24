# Web Security Headers Contract

## Overview

This document describes the canonical web security-header policy for M1 route groups and how to maintain it.

## Policy Location

The security headers policy is defined in:

- **Contract definition**: `packages/shared/src/contracts/security-headers.ts`
- **Runtime implementation**: `apps/web/src/hooks.server.ts`

## Route Groups Covered

The policy covers all M1 route groups:

- `/(game)` - Game surface
- `/(admin)` - Admin surface
- `/(auth)` - Auth surface
- `/(public)` - Public surface
- Error pages (`+error.svelte`) in each group

## Security Headers Applied

The following headers are applied to all SSR HTML responses:

| Header                                    | Production                                           | Development                     |
| ----------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| Content-Security-Policy                   | Strict                                               | Relaxed (HMR-compatible)        |
| X-Frame-Options                           | deny                                                 | deny                            |
| X-Content-Type-Options                    | nosniff                                              | nosniff                         |
| Referrer-Policy                           | strict-origin-when-cross-origin                      | strict-origin-when-cross-origin |
| Permissions-Policy                        | camera=(), microphone=(), geolocation=(), payment=() | Same                            |
| Cross-Origin-Opener-Policy                | same-origin                                          | same-origin                     |
| Cross-Origin-Embedder-Policy              | require-corp (configurable)                          | require-corp                    |
| Cross-Origin-Resource-Policy              | same-origin                                          | same-origin                     |
| Strict-Transport-Security                 | max-age=63072000; includeSubDomains; preload         | Disabled                        |
| X-Content-Security-Policy (Trusted Types) | require-trusted-types-for 'script'                   | Disabled                        |

## CSP Directives

### Production (Strict)

- `default-src 'self'`
- `base-uri 'self'`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline'`
- `object-src 'none'`
- `form-action 'self'`
- `frame-ancestors 'none'` (configurable)

### Development (Relaxed)

- Includes `unsafe-inline` and `unsafe-eval` for script-src
- Includes localhost WebSocket origins
- Includes `blob:` and `https:` for img-src

## Environment Variables

The following environment variables can be used to configure security headers:

| Variable              | Default        | Description                                                                   |
| --------------------- | -------------- | ----------------------------------------------------------------------------- |
| `CSP_FRAME_ANCESTORS` | `none`         | Comma-separated list of allowed origins for frame embedding (LMS integration) |
| `CSP_CONNECT_SRC`     | (empty)        | Additional connect-src sources                                                |
| `CSP_IMG_SRC`         | (empty)        | Additional img-src sources                                                    |
| `COEP_POLICY`         | `require-corp` | Cross-Origin-Embedder-Policy value (`require-corp` or `credentialless`)       |

## Running Contract Tests

To verify the security headers contract:

```bash
# Run only security headers contract tests
pnpm --filter web test:security-headers-contract

# Run all web tests
pnpm --filter web test
```

## Troubleshooting

### HMR not working in development

The development CSP includes `unsafe-eval` for script-src. If HMR still fails, check that your dev server is running on localhost.

### Frame embedding not working

Set `CSP_FRAME_ANCESTORS` to the origin you want to allow (e.g., `https://lms.example.com`).

### Trusted Types errors in production

Ensure all inline scripts use proper CSP nonce or hash, or disable Trusted Types in non-production environments.

## Adding New Route Groups

To add a new route group:

1. Update `ROUTE_GROUPS` in `packages/shared/src/contracts/security-headers.ts`
2. Run tests to verify policy generation: `pnpm --filter web test:security-headers-contract`
3. Verify runtime behavior by checking response headers

## CI Integration

The security headers contract is automatically checked in CI via the `test:security-headers-contract` task in `turbo.json`. This runs as part of the standard quality gates.
