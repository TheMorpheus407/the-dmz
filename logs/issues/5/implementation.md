# Implementation Summary
- moved JSON Schema generation to a build-time script that emits `json-schemas.generated.ts`, and updated shared build/test/dev scripts to run it before compiling
- refactored shared schema modules to export Zod schemas/types only, with compiled JSON Schemas exported from the generated file via the schemas barrel
- added a health query schema (enum-based) and wired Fastify health routes to validate querystrings using compiled JSON Schemas
- updated shared schema tests to use barrel exports and added coverage for the health query schema; added API test to assert validation errors on invalid query values

## Files Touched
- apps/api/src/modules/health/__tests__/health.routes.test.ts
- apps/api/src/modules/health/health.routes.ts
- packages/shared/package.json
- packages/shared/scripts/generate-json-schemas.ts
- packages/shared/src/index.ts
- packages/shared/src/schemas/auth.schema.test.ts
- packages/shared/src/schemas/auth.schema.ts
- packages/shared/src/schemas/common.schema.test.ts
- packages/shared/src/schemas/common.schema.ts
- packages/shared/src/schemas/health.schema.test.ts
- packages/shared/src/schemas/health.schema.ts
- packages/shared/src/schemas/index.ts
- packages/shared/src/schemas/json-schemas.generated.ts
- pnpm-lock.yaml

## Tests
- pnpm --filter @the-dmz/shared test
- pnpm --filter @the-dmz/shared build
- pnpm --filter @the-dmz/api test
