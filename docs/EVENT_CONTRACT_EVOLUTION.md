# Event Contract Evolution Guide

This document describes how to safely evolve auth DomainEvent contracts in The DMZ project.

## Overview

Auth lifecycle events are defined in `packages/shared/src/contracts/event-manifest.ts` and emitted from `apps/api/src/modules/auth/auth.events.ts`. The event contract system ensures:

- Emitted events conform to canonical contracts
- Consumer compatibility is maintained
- Sensitive data never leaks in event payloads
- Event versioning is enforced

## M1 Auth Event Contracts

The following events are covered by M1 contracts:

| Event Type              | Version | Required Payload Fields                |
| ----------------------- | ------- | -------------------------------------- |
| `auth.user.created`     | 1       | userId, email, tenantId                |
| `auth.user.updated`     | 1       | userId, email, tenantId, changes       |
| `auth.user.deactivated` | 1       | userId, email, tenantId                |
| `auth.session.created`  | 1       | sessionId, userId, tenantId            |
| `auth.session.revoked`  | 1       | sessionId, userId, tenantId, reason    |
| `auth.login.failed`     | 1       | tenantId, email, reason, correlationId |

## Common Metadata Fields

All events include these metadata fields:

- `eventId` - Unique event identifier (UUID)
- `eventType` - Event type string (e.g., "auth.user.created")
- `timestamp` - ISO 8601 timestamp
- `correlationId` - Request correlation identifier
- `tenantId` - Tenant context
- `userId` - User context
- `source` - Event source module
- `version` - Contract version number

## Forbidden Payload Fields

The following fields are explicitly forbidden in all auth event payloads:

- password, passwordHash, passwordSalt
- accessToken, refreshToken, token
- mfaSecret, mfaCode, mfaBackupCodes
- cookies, sessionToken

## How to Evolve an Event Contract

### Adding a New Field to an Event

1. **Update the contract** in `packages/shared/src/contracts/event-manifest.ts`:
   - Add the field to `requiredPayloadFields` or `optionalPayloadFields`
   - Increment the version if it's a breaking change

2. **Update the payload interface** in `apps/api/src/modules/auth/auth.events.ts`:
   - Add the new field to the appropriate `Auth*Payload` interface
   - Update the event factory to include the new field

3. **Update consumers**:
   - Check any modules that subscribe to this event
   - Ensure they handle the new field gracefully

4. **Run verification**:
   ```bash
   pnpm --filter api test -- --run event-contract-parity
   pnpm --filter api test -- --run sensitive-data-exclusion
   pnpm --filter api test -- --run event-consumer-compatibility
   pnpm event-contract:check
   ```

### Adding a New Event

1. **Define the contract** in `packages/shared/src/contracts/event-manifest.ts`:
   - Add new entry with eventType, version, required/optional/forbidden fields

2. **Create the event factory** in `apps/api/src/modules/auth/auth.events.ts`:
   - Add event constant to `AUTH_EVENTS`
   - Create payload interface
   - Create factory function

3. **Add tests**:
   - Contract parity test
   - Consumer compatibility test
   - Sensitive data exclusion test
   - Integration test for actual event emission

4. **Run verification**:
   ```bash
   pnpm --filter api test -- --run event
   pnpm event-contract:check
   ```

### Removing a Field

1. **Deprecate first** - Mark field as optional in the contract
2. **Update consumers** - Ensure all consumers handle missing field
3. **Remove in next major version** - Update version number

## Versioning Rules

- **Patch version** (1.0 -> 1.1): Adding optional fields, documentation changes
- **Minor version** (1.0 -> 2.0): Adding required fields, changing field types
- **Major version** (1.0 -> 2.0): Removing fields, changing event semantics

## Verification Commands

### Local Development

```bash
# Run all event contract tests
pnpm --filter api test -- --run event

# Run specific test suites
pnpm --filter api test -- --run event-contract-parity
pnpm --filter api test -- --run event-consumer-compatibility
pnpm --filter api test -- --run sensitive-data-exclusion

# Run the CLI gate check
pnpm event-contract:check
```

### CI Pipeline

The event contract check is integrated into the lint pipeline:

```bash
# This runs automatically as part of pnpm lint
pnpm lint
```

The gate will fail if:

- Emitted events don't match canonical contracts
- Required fields are missing
- Forbidden fields are present
- Event version is missing or invalid

## Troubleshooting

### "Missing required payload field"

The emitted event doesn't have a field defined in the contract. Check:

1. The payload interface in `auth.events.ts`
2. The factory function implementation

### "Forbidden payload field found"

A sensitive field was found in the event payload. Remove it immediately and review:

1. What data is being passed to the event factory
2. Whether the field is actually sensitive

### "Contract version mismatch"

The event version doesn't match the canonical contract. Update the version in the factory or contract.

## Files Reference

- **Contract manifest**: `packages/shared/src/contracts/event-manifest.ts`
- **Event definitions**: `apps/api/src/modules/auth/auth.events.ts`
- **Parity tests**: `apps/api/src/modules/auth/__tests__/event-contract-parity.test.ts`
- **Compatibility tests**: `apps/api/src/modules/auth/__tests__/event-consumer-compatibility.test.ts`
- **Sensitive data tests**: `apps/api/src/modules/auth/__tests__/sensitive-data-exclusion.test.ts`
- **CLI gate**: `apps/api/scripts/check-event-contract.ts`
