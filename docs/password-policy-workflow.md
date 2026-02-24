# Password Policy Workflow

This document describes how to work with the password policy contract in The DMZ.

## Overview

The password policy system ensures consistent password requirements across the application:

- `packages/shared/src/contracts/password-policy.ts` - Canonical password policy artifact
- `apps/api/src/modules/auth/auth.service.ts` - Policy enforcement in registration
- `apps/api/src/modules/auth/auth.errors.ts` - Password policy error responses
- `apps/api/src/shared/services/compromised-credential.service.ts` - Compromised credential screening

## Default M1 Policy

The default M1 password policy is defined in `m1PasswordPolicyManifest`:

| Requirement              | Default Value | Guardrail Range |
| ------------------------ | ------------- | --------------- |
| minLength                | 12            | 8-64            |
| maxLength                | 128           | 64-128          |
| requireUppercase         | true          | -               |
| requireLowercase         | true          | -               |
| requireNumber            | true          | -               |
| requireSpecial           | true          | -               |
| characterClassesRequired | 3             | 1-4             |

## Changing the Policy Safely

### Option 1: Modify Defaults

To change the default policy, edit `packages/shared/src/contracts/password-policy.ts`:

```typescript
const M1_DEFAULTS = {
  minLength: 12, // Change this
  maxLength: 128, // Change this
  // ...
};
```

### Option 2: Tenant-Specific Overrides

For multi-tenant scenarios, you can override policies within guardrails:

```typescript
import { getTenantPolicy } from '@the-dmz/shared';

const tenantPolicy = getTenantPolicy(
  { minLength: 16, characterClassesRequired: 4 },
  m1PasswordPolicyManifest,
);
```

The `getTenantPolicy` function automatically clamps values to guardrails:

- `minLengthMin: 8`, `minLengthMax: 64`
- `maxLengthMin: 64`, `maxLengthMax: 128`

## Compromised Credential Screening

The system supports checking passwords against known data breaches using the Have I Been Pwned (HIBP) API.

### Configuration

Configure in your environment:

```typescript
// Environment variables
HIBP_ENABLED = true; // Enable/disable screening
HIBP_MODE = enabled; // enabled, disabled, degraded
HIBP_TIMEOUT_MS = 5000; // Provider timeout
```

### Degraded Mode

When the HIBP API is unavailable:

- `failOpen` (default): Allow password but log warning
- `failClosed`: Reject password

### Custom Provider

Implement `CompromisedCredentialProvider` interface for custom backends:

```typescript
interface CompromisedCredentialProvider {
  checkPassword: (password: string) => Promise<CompromisedCredentialScreeningResult>;
  getProviderName: () => string;
}
```

## Running Contract Tests

Run the password policy contract tests:

```bash
# Run all password policy tests
pnpm --filter shared test

# Run API password policy tests
pnpm --filter api test:password-policy-contract
```

### Test Coverage

The test suite verifies:

- Policy evaluation for all requirement types
- Tenant override behavior within guardrails
- Character class detection
- Error code mapping

### Expected Test Output

```
✓ password-policy > m1PasswordPolicyManifest
✓ password-policy > evaluatePasswordPolicy
✓ password-policy > getCharacterClassesInPassword
✓ password-policy > getTenantPolicy
✓ password-policy > PASSWORD_ERROR_CODES
```

## Error Codes

| Code                          | Description                           |
| ----------------------------- | ------------------------------------- |
| AUTH_PASSWORD_TOO_SHORT       | Password below minimum length         |
| AUTH_PASSWORD_TOO_LONG        | Password exceeds maximum length       |
| AUTH_PASSWORD_TOO_WEAK        | Does not meet complexity requirements |
| AUTH_PASSWORD_COMPROMISED     | Found in known data breach            |
| AUTH_PASSWORD_POLICY_VOLATION | General policy violation              |

## OpenAPI Documentation

Password policy error responses are documented in `apps/api/openapi/openapi.v1.json` for the register endpoint.

## Adding New Requirements

1. Add to `PasswordRequirement` enum in `password-policy.ts`
2. Add to `passwordRequirementSchema`
3. Update `evaluatePasswordPolicy()` function
4. Add test cases
5. Update OpenAPI spec if needed
6. Update this documentation
