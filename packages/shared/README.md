# @the-dmz/shared

Shared types, Zod schemas, constants, and utilities for The DMZ monorepo.

## API Contracts

This package contains canonical M1 API contracts used by both the API (`apps/api`) and Web (`apps/web`) applications. These contracts ensure type safety and schema validation consistency across the entire application.

### Contract Location

- **Auth Schemas**: `src/schemas/auth.schema.ts` (Zod) + `src/schemas/json-schemas.generated.ts` (JSON Schema)
- **API Envelope Schemas**: `src/schemas/api-envelope.schema.ts`
- **Error Codes**: `src/constants/error-codes.ts`
- **Common Schemas**: `src/schemas/common.schema.ts`, `src/schemas/health.schema.ts`

### Using Shared Contracts

#### In the API (Fastify)

Import JSON schemas directly from `@the-dmz/shared/schemas`:

```typescript
import { loginJsonSchema, registerJsonSchema } from '@the-dmz/shared/schemas';

fastify.post(
  '/auth/login',
  {
    schema: {
      body: loginJsonSchema,
    },
  },
  handler,
);
```

#### In the Web (SvelteKit)

Import Zod schemas and types for runtime validation:

```typescript
import { loginSchema, type LoginInput } from '@the-dmz/shared/schemas';

const validateLogin = (data: unknown) => {
  return loginSchema.safeParse(data);
};
```

### Adding or Modifying a Contract

1. **Add/Edit the Zod Schema** in `src/schemas/<domain>.schema.ts`
2. **Export the Type** (automatically inferred via `z.infer<typeof schema>`)
3. **Run Schema Generation** to create JSON schemas:

```bash
cd packages/shared
pnpm run generate:schemas
```

4. **Verify Tests Pass**:

```bash
pnpm test
```

5. **Update API Routes** if needed to import the new/modified schemas

### Anti-Drift Tests

Contract drift is prevented by tests that verify API routes use shared schemas:

- **API Tests**: `apps/api/src/modules/auth/__tests__/contract-drift.test.ts`

Run the anti-drift tests:

```bash
pnpm --filter api test -- --run src/modules/auth/__tests__/contract-drift.test.ts
```

If these tests fail, it means the API routes are not using the shared contracts and need to be updated.

### Error Codes

Error codes are defined in `src/constants/error-codes.ts` and shared between API and Web for consistent error handling.

### Export Summary

| Export                                                 | Description                         |
| ------------------------------------------------------ | ----------------------------------- |
| `loginSchema`, `loginJsonSchema`                       | Login request payload               |
| `registerSchema`, `registerJsonSchema`                 | Registration request payload        |
| `refreshTokenSchema`, `refreshTokenJsonSchema`         | Token refresh request               |
| `loginResponseSchema`, `loginResponseJsonSchema`       | Login response (user + accessToken) |
| `registerResponseSchema`, `registerResponseJsonSchema` | Register response                   |
| `refreshResponseSchema`, `refreshResponseJsonSchema`   | Token refresh response              |
| `userSchema`, `userJsonSchema`                         | User data shape                     |
| `profileSchema`, `profileJsonSchema`                   | User profile data                   |
| `updateProfileSchema`, `updateProfileJsonSchema`       | Profile update payload              |
| `meResponseSchema`, `meResponseJsonSchema`             | Current user response               |
| `logoutResponseSchema`, `logoutResponseJsonSchema`     | Logout response                     |
| `apiErrorSchema`, `apiErrorJsonSchema`                 | Error response shape                |
| `apiErrorEnvelopeSchema`, `apiErrorEnvelopeJsonSchema` | Wrapped error response              |
| `ErrorCodeCategory`                                    | Error category enum                 |
| `ErrorCodes`                                           | Error code constants                |
| `apiErrorCategoryMap`                                  | Maps error codes to categories      |

## Taxonomy

This package contains canonical taxonomies for threat tiers, themes, and surfaces. These definitions are shared across all applications in the monorepo.

### Taxonomy Definitions

- **Threat Tiers**: `src/constants/taxonomy.ts` - Contains `THREAT_TIERS`, `THREAT_TIER_RANKS`, and `THREAT_TIER_METADATA`
- **Theme IDs**: `src/constants/taxonomy.ts` - Contains `THEME_IDS` and `THEME_METADATA`
- **Surface IDs**: `src/constants/taxonomy.ts` - Contains `SURFACE_IDS` for route surface classification
- **Zod Schemas**: `src/schemas/taxonomy.schema.ts` - Runtime validation schemas for all taxonomy types

### Taxonomy Ownership

All taxonomy definitions are owned by `@the-dmz/shared`. Applications must import from this package rather than defining their own local copies.

| Taxonomy    | Canonical Source            | Consumers          |
| ----------- | --------------------------- | ------------------ |
| Threat Tier | `@the-dmz/shared` constants | API, Web           |
| Theme ID    | `@the-dmz/shared` constants | Web (primary), API |
| Surface ID  | `@the-dmz/shared` constants | Web (primary)      |

Adding or modifying a taxonomy:

1. **Add/Edit constants** in `src/constants/taxonomy.ts`
2. **Add/Edit Zod schemas** in `src/schemas/taxonomy.schema.ts`
3. **Update exports** in `src/constants/index.ts` and `src/schemas/index.ts`
4. **Verify tests pass**: `pnpm test`
5. **Update consumers** to use shared taxonomy imports

## Development

```bash
# Generate JSON schemas from Zod schemas
pnpm run generate:schemas

# Run tests
pnpm test

# Run typecheck
pnpm typecheck

# Run lint
pnpm lint
```
