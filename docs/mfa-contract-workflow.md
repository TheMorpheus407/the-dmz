# MFA Contract Workflow

This document describes how to safely evolve M1 MFA (Multi-Factor Authentication) contracts across the backend, shared schemas, and frontend.

## Overview

The MFA contract system ensures that WebAuthn MFA behavior is consistent across:

- `packages/shared/src/schemas/mfa.schema.ts` - Canonical MFA schema definitions
- `packages/shared/src/constants/error-codes.ts` - MFA error codes
- `apps/api/src/modules/auth/mfa.routes.ts` - MFA API endpoints
- `apps/api/src/shared/middleware/mfa-guard.ts` - MFA access control middleware
- `apps/web/src/lib/api/error-mapper.ts` - Frontend MFA error handling

## MFA Contract Artifacts

### Canonical Schemas (Shared Package)

Location: `packages/shared/src/schemas/mfa.schema.ts`

Schema definitions:

- `mfaMethodSchema` - Valid MFA methods (webauthn, totp, sms, email)
- `mfaChallengeStateSchema` - Challenge request/response structure
- `mfaVerificationSchema` - MFA verification request
- `mfaStatusResponseSchema` - MFA status endpoint response
- `webauthnCredentialSchema` - WebAuthn credential metadata

Session state fields:

- `mfaRequired` - Whether MFA is required for this user (based on role)
- `mfaVerified` - Whether MFA has been verified in current session
- `mfaMethod` - The MFA method used (webauthn, totp, etc.)
- `mfaVerifiedAt` - Timestamp of when MFA was last verified

### Error Codes

Location: `packages/shared/src/constants/error-codes.ts`

MFA-related error codes:

- `AUTH_MFA_REQUIRED` - Super Admin access requires MFA
- `AUTH_MFA_ALREADY_ENABLED` - MFA already enabled for user
- `AUTH_MFA_NOT_ENABLED` - No MFA credentials found
- `AUTH_MFA_INVALID_CODE` - Invalid MFA verification code
- `AUTH_MFA_EXPIRED` - MFA verification code expired
- `AUTH_WEBAUTHN_CHALLENGE_EXPIRED` - WebAuthn challenge expired
- `AUTH_WEBAUTHN_VERIFICATION_FAILED` - WebAuthn verification failed
- `AUTH_WEBAUTHN_NOT_SUPPORTED` - WebAuthn not supported
- `AUTH_WEBAUTHN_CREDENTIAL_NOT_FOUND` - WebAuthn credential not found
- `AUTH_WEBAUTHN_CREDENTIAL_EXISTS` - WebAuthn credential already exists
- `AUTH_WEBAUTHN_REGISTRATION_FAILED` - WebAuthn registration failed
- `AUTH_WEBAUTHN_ASSERTION_FAILED` - WebAuthn assertion failed

### API Endpoints

Location: `apps/api/src/modules/auth/mfa.routes.ts`

MFA endpoints:

- `POST /api/v1/auth/mfa/webauthn/challenge` - Create WebAuthn challenge
- `POST /api/v1/auth/mfa/webauthn/register` - Register WebAuthn credential
- `POST /api/v1/auth/mfa/webauthn/verify` - Verify WebAuthn assertion
- `GET /api/v1/auth/mfa/status` - Get MFA status for current session
- `GET /api/v1/auth/mfa/webauthn/credentials` - List user's WebAuthn credentials
- `DELETE /api/v1/auth/mfa/webauthn/credentials/:credentialId` - Delete credential

## Adding New MFA Features

### Step 1: Update Shared Schema

Add new schemas to `packages/shared/src/schemas/mfa.schema.ts`:

```typescript
import { z } from 'zod';

export const newMfaFeatureSchema = z.object({
  // Define the schema
});
```

Export in `packages/shared/src/schemas/index.ts`:

```typescript
export * from './mfa.schema.js';
```

### Step 2: Update API Routes

Add endpoint in `apps/api/src/modules/auth/mfa.routes.ts`:

```typescript
fastify.post(
  '/mfa/webauthn/new-feature',
  {
    preHandler: [authGuard, tenantContext, requireMfaForSuperAdmin],
    schema: {
      /* ... */
    },
  },
  async (request, reply) => {
    // Implementation
  },
);
```

### Step 3: Update Contract Parity Checks

Update `apps/api/scripts/check-contract-parity.ts`:

```typescript
const M1_ENDPOINTS = [
  // ... existing endpoints
  '/api/v1/auth/mfa/webauthn/new-feature',
];
```

### Step 4: Update Frontend Error Mapping

Add error codes to `apps/web/src/lib/api/error-mapper.ts`:

```typescript
export const AUTH_WEBAUTHN_CODES = [
  // ... existing codes
  'AUTH_NEW_ERROR_CODE',
];
```

### Step 5: Add Coverage Tests

Add to `apps/web/src/lib/api/error-mapping-coverage.test.ts`:

```typescript
it('AUTH_NEW_ERROR_CODE has frontend mapping', () => {
  expect(AUTH_WEBAUTHN_CODES).toContain('AUTH_NEW_ERROR_CODE');
});
```

## MFA Gate Commands

The project provides dedicated commands for MFA contract verification:

```bash
# Run MFA contract drift tests
pnpm mfa:parity

# Run MFA smoke tests
pnpm mfa:smoke

# Run full MFA gate (contract + smoke)
pnpm mfa:gate
```

## Smoke Test Requirements

Before merging MFA changes, the following smoke tests must pass:

### Access Control Tests

1. **Super Admin Access Denied** - Verify that super-admin users are denied access to `/api/v1/auth/admin/users` whenmfaVerifiedAt`is not set` in session
2. **Non-Super Admin Access non** - Verify that access admin routes without-super-admin users can MFA
3. **M** - Verify thatFA Verified Access ` super-admin users withmfaVerifiedAt` set can access admin routes

### Session State Tests

1. **ars MFA State** - Verify that logging out invalidates theLogout Cle MFA verification session and clears
2. **Session Expiration** - Verify that expired sessions cannot access MFA-protected routes regardless of MFA state

### Error Response Tests

1. **No Information Leakage** - Verify error responses don't leak internal details (session IDs, internal state)
2. **Status Endpoint** - Verify `/api/v1/auth/mfa/status` returns correct MFA state

## Running Tests

### Run MFA Access Control Tests

```bash
pnpm --filter api test -- --run apps/api/src/modules/auth/__tests__/mfa-access-control.test.ts
```

### Run MFA Contract Drift Tests

```bash
pnpm --filter api test -- --run apps/api/src/modules/auth/__tests__/mfa-contract-drift.test.ts
```

### Run MFA Smoke Tests

```bash
pnpm --filter api test -- --run apps/api/src/modules/auth/__tests__/mfa-smoke.test.ts
```

### Run Full MFA Gate

```bash
pnpm mfa:gate
```

## Troubleshooting

### "MFA endpoint not found in contract parity"

Add the endpoint to `M1_ENDPOINTS` in `apps/api/scripts/check-contract-parity.ts`.

### "MFA error code not mapped in frontend"

Add the error code to the appropriate category in `apps/web/src/lib/api/error-mapper.ts`.

### "Access control test failing"

1. Verify the user has `role: 'super_admin'` in the users table
2. Verify the session has `mfaVerifiedAt` set (or not set for denial tests)
3. Check that `requireMfaForSuperAdmin` preHandler is applied to the route

### "Session state not clearing on logout"

The logout endpoint calls `deleteSessionByTokenHash()` which deletes the session entirely. This is correct behavior - when the session is deleted, MFA state is implicitly cleared.

## Best Practices

1. **Always use shared schemas** - Import MFA schemas from `@the-dmz/shared`
2. **Test access control** - Add tests for both allowed and denied paths
3. **Test session lifecycle** - Verify MFA state is cleared on logout/expiration
4. **No information leakage** - Error responses must not expose internal details
5. **Run gate before merge** - Always run `pnpm mfa:gate` before creating a PR
