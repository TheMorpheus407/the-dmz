ACCEPTED

Summary:
- Shared Zod schemas exist for auth, common, and health with inferred types and a barrel export; JSON Schemas are precompiled via a build-time generator and exported for Fastify use.
- API health routes now wire compiled JSON Schemas for querystring and responses, and a test confirms invalid input returns structured validation errors.
- Shared package exports `./schemas` for frontend/backend reuse, satisfying the shared validation flow.

Tests:
- `pnpm --filter @the-dmz/shared test`
- `pnpm --filter api test`
