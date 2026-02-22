# Error Contract Workflow

This document describes how to safely evolve M1 error contracts across the backend registry, shared schemas/catalog, and frontend mappings.

## Overview

The error contract system ensures that error codes are consistent across:

- `packages/shared/src/constants/error-codes.ts` - Canonical error code definitions
- `apps/api/src/shared/middleware/error-handler.ts` - Backend error handling
- `apps/web/src/lib/api/error-mapper.ts` - Frontend error categorization
- `apps/web/src/lib/api/error-copy.ts` - Route-surface-specific error messages

## Error Code Categories

All error codes must map to one of these categories:

- `authentication` - User authentication failures
- `authorization` - Permission/access denied
- `validation` - Input validation failures
- `rate_limiting` - Rate limit exceeded
- `server` - Internal server errors
- `network` - Network connectivity issues
- `not_found` - Resource not found
- `tenant_blocked` - Tenant is blocked/suspended

## Adding a New Error Code

### Step 1: Add to Shared Package

Add the error code to `packages/shared/src/constants/error-codes.ts`:

```typescript
export const ErrorCodes = {
  // ... existing codes
  NEW_ERROR_CODE: 'NEW_ERROR_CODE',
} as const;
```

Add metadata for the new code:

```typescript
export const errorCodeMetadata: Record<ErrorCode, ErrorCodeMetadata> = {
  // ... existing metadata
  [ErrorCodes.NEW_ERROR_CODE]: {
    category: ErrorCodeCategory.VALIDATION, // Choose appropriate category
    retryable: false, // Whether the operation can be retried
    messageKey: 'errors.new.errorCode', // i18n key for the message
  },
};
```

### Step 2: Update Backend (if applicable)

The API imports from shared and extends with API-specific codes. If the new code is used in the API:

- The API automatically inherits the code from shared
- Add any API-specific codes to `apps/api/src/shared/middleware/error-handler.ts`
- Ensure `ErrorStatusMap` and `ErrorMessages` have entries for the new code

### Step 3: Update Frontend Error Mapper

The frontend error mapper categorizes errors based on codes. If the new code needs special handling:

- Add it to the appropriate category array in `apps/web/src/lib/api/error-mapper.ts`
- Categories: `AUTHENTICATION_CODES`, `AUTHORIZATION_CODES`, `VALIDATION_CODES`, `RATE_LIMIT_CODES`, `SERVER_CODES`, `NOT_FOUND_CODES`

### Step 4: Update Frontend Error Copy (if diegetic UI)

For route-surface-specific error messages, update `apps/web/src/lib/api/error-copy.ts`:

- Add entries for each surface: `game`, `admin`, `auth`, `public`
- Each category must have a complete `ErrorCopy` object with `title`, `message`, and optionally `retryLabel`, `dismissLabel`

### Step 5: Run Contract Checks

Run the error contract checks to verify everything is in sync:

```bash
# Run all error contract checks
pnpm error-contract:check

# Or run individually
pnpm --filter @the-dmz/shared test -- --run packages/shared/src/constants/error-contract.test.ts
pnpm --filter @the-dmz/web test -- --run apps/web/src/lib/api/error-mapping-coverage.test.ts
```

## CI Behavior

The error contract checks are integrated into the lint pipeline:

- `pnpm lint` depends on `error-contract:check`
- The check runs automatically on PRs
- Failing checks block merge

## Testing

### Run Contract Tests

```bash
# All error contract tests
pnpm error-contract:check

# Shared package contract tests
pnpm --filter @the-dmz/shared test -- --run packages/shared/src/constants/error-contract.test.ts

# Frontend mapping coverage tests
pnpm --filter @the-dmz/web test -- --run apps/web/src/lib/api/error-mapping-coverage.test.ts
```

### Test Expectations

The contract tests verify:

1. All shared error codes have metadata (category, retryable, messageKey)
2. All error codes map to valid categories
3. Frontend categorizes all known error codes correctly
4. Retryability rules are applied consistently

## Troubleshooting

### "Error code X is missing metadata"

Add the error code to `errorCodeMetadata` in `packages/shared/src/constants/error-codes.ts`.

### "Error code X is not categorized in frontend"

Add the error code to the appropriate category array in `apps/web/src/lib/api/error-mapper.ts`.

### "Category X is not covered for surface Y"

Add the category to the error copy map in `apps/web/src/lib/api/error-copy.ts` for the specified surface.

## Best Practices

1. **Always add metadata** - Every new error code must have category, retryable, and messageKey
2. **Use shared codes** - Import ErrorCodes from `@the-dmz/shared` in both API and web
3. **Test locally** - Run `pnpm error-contract:check` before pushing
4. **Document new codes** - Add meaningful message keys that can be localized
