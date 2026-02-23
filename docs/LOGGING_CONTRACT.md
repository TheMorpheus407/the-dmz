# M1 Logging Contract Documentation

## Overview

The M1 Logging Contract defines the structured logging schema and redaction requirements for all foundation API endpoints. This contract ensures consistent observability, auditability, and tenant isolation across the API.

## Contract Location

The logging contract manifest is located at:

- **Manifest**: `packages/shared/src/contracts/logging-manifest.ts`
- **Validation Script**: `apps/api/scripts/check-logging-contract.ts`
- **Tests**: `apps/api/src/shared/middleware/__tests__/logging-contract.test.ts`

## Contract Schema

### Event Categories

The contract defines the following required event categories:

- `request_received` - Emitted when a request is received
- `request_completed` - Emitted when a request completes (success or failure)
- `auth_success` - Emitted on successful authentication
- `auth_failure` - Emitted on authentication failure
- `tenant_context_failure` - Emitted when tenant context is invalid
- `dependency_ready` - Emitted when a dependency becomes ready
- `dependency_degraded` - Emitted when a dependency is degraded

### Required Fields

For `request_received` events:

- `requestId` - Unique request identifier
- `method` - HTTP method
- `url` - Request URL
- `ip` - Client IP address
- `userAgent` - Client user agent
- `service` - Service metadata (name, version, environment)
- `event` - Event category

For `request_completed` events:

- All `request_received` fields plus:
- `statusCode` - HTTP response status code
- `durationMs` - Request duration in milliseconds

Optional context fields (when available):

- `tenantId` - Tenant identifier
- `userId` - User identifier

### Log Level Semantics

- **Info**: 200, 201, 204 (success)
- **Warn**: 400, 401, 403, 404, 409, 422, 429 (client errors)
- **Error**: 500, 502, 503, 504 (server errors)

### Redaction Paths

The contract requires redaction of sensitive data at the following paths:

- Request headers: `authorization`, `cookie`, `x-api-key`, `x_refresh_token`
- Request body: `password`, `passwordConfirm`, `token`, `refreshToken`, `accessToken`, `mfaCode`, `verificationCode`, `secret`, `clientSecret`
- Response headers: `authorization`, `set-cookie`

## Running the Logging Contract Gate

### Local Development

```bash
# Run the contract validation script
pnpm --filter api log-contract:check

# Run the logging contract tests
pnpm --filter api test:log-contract
```

### CI/Pre-commit

The logging contract is integrated into the Turbo pipeline. It runs automatically as part of the `lint` task:

```bash
# This will trigger the logging contract check
pnpm lint
```

### Troubleshooting

If the contract check fails:

1. **Missing fields**: Ensure the request logger middleware includes all required fields
2. **Missing events**: Ensure event types match the contract (e.g., `request_received`, `request_completed`)
3. **Level mapping**: Ensure 4xx errors log at `warn` level and 5xx at `error` level
4. **Redaction**: Ensure sensitive paths are configured in `app.ts` redact configuration

## Adding or Updating Event Categories

To add a new event category or modify existing ones:

1. **Update the manifest**: Edit `packages/shared/src/contracts/logging-manifest.ts`
   - Add new event category to `logEventCategorySchema`
   - Add required fields for the new event
   - Update version number

2. **Update validation**: Edit `apps/api/scripts/check-logging-contract.ts`
   - Add checks for new event types/fields

3. **Add tests**: Add test coverage in `logging-contract.test.ts`

4. **Verify**: Run `pnpm --filter api log-contract:check`

## Contract Versioning

The contract uses semantic versioning. When making breaking changes:

1. Increment the version in `m1LoggingContractManifest`
2. Document changes in this file
3. Update all dependent code and tests

## Related Documentation

- [DD-09: Backend Architecture API](docs/DD/09_backend_architecture_api.md)
- [DD-14: Design Document Integration Infrastructure](docs/DD/14_design_document_integration_infrastructure.md)
- [BRD-02: Regulatory Compliance](docs/BRD/02_regulatory_compliance.md)
