# Issue #5 Research: Shared Zod Schemas → JSON Schema

**Key Findings**
- `packages/shared` has no `schemas/` directory, no `zod` or `zod-to-json-schema` dependency, and the export map in `packages/shared/package.json` does not expose a `./schemas` entry, so `@the-dmz/shared/schemas` imports cannot work yet.
- Fastify routes in `apps/api` currently define no `schema` blocks (see `apps/api/src/modules/health/health.routes.ts`), so AJV validation never runs; the error handler already formats AJV/Zod validation errors but will not be hit until route schemas are wired.
- DD-09 (Section 2.3/3.1) prescribes Zod-as-source-of-truth compiled to JSON Schema for Fastify, and DD-08 (Section 15) expects frontend response validation via shared Zod schemas; this issue needs shared schema exports that can be consumed by both web and api.

**Current Behavior**
- Shared package exports `constants`, `types`, and `utils` only (`packages/shared/src/index.ts` and `packages/shared/package.json` exports map). There are no schema files or JSON Schema compilation utilities.
- API has Zod in `apps/api/package.json` and uses it for config validation (`apps/api/src/config.ts`), but routes do not reference JSON Schemas.
- Error formatting already supports `error.validation` (AJV) and `ZodError` (`apps/api/src/shared/middleware/error-handler.ts`), returning `success: false` with `details.issues` — this is ready to surface field-level details once schema validation is active.

**Root Cause Analysis**
- M0-05 implementation has not started: no shared schema source files, no JSON Schema compilation, no export path, and no route usage. This blocks the single-source-of-truth validation flow required by the issue and by DD-08/09.

**Impacted Modules and Files**
- `packages/shared`:
- `packages/shared/package.json` (add `zod`, `zod-to-json-schema`, and `./schemas` export)
- `packages/shared/src/index.ts` (re-export schemas)
- `packages/shared/src/schemas/*` (new Zod + JSON Schema definitions)
- `apps/api`:
- `apps/api/src/modules/*/*.routes.ts` (add `schema` blocks using JSON Schemas)
- `apps/api/src/shared/middleware/error-handler.ts` (already supports AJV/Zod, may need alignment with shared error codes)
- `apps/web`:
- Potential future consumers for shared Zod schemas; currently no usage.

**Constraints and Requirements**
- No default exports (project-wide standard).
- ESM + `.js` import specifiers in TS (`packages/shared/src/index.ts` pattern).
- JSON Schema compilation must be done once, not per request; acceptance criteria mentions “build time,” which implies precompiled constants or generated artifacts, not on-demand conversion.
- Keep schemas compatible with AJV validation in Fastify; avoid Zod features that cannot be represented in JSON Schema unless you handle them separately.

**Alternative Approaches**
- **Runtime-at-startup compilation (simpler):** Export Zod schemas and compute JSON Schemas in `packages/shared/src/schemas/index.ts` at module init. This compiles once per process, not per request. It may or may not satisfy the “build time” wording, but it matches DD-09’s example and is low-friction.
- **Build-step generation (strict build-time):** Add a build script in `packages/shared` that emits `.json` schema files into `dist/` (or `src/generated/`) using `zod-to-json-schema`. API imports JSON directly. This satisfies strict build-time compilation but requires more tooling and a watch/regen step for dev.
- **Fastify Zod type provider:** Use `@fastify/type-provider-zod` and runtime Zod validation instead of JSON Schema. This is simpler and aligns with Zod features, but conflicts with the explicit requirement to compile to JSON Schema for Fastify.

**Risks and Edge Cases**
- **Zod effects/coerce/defaults:** `z.coerce.number()` and `.default()` do not map to JSON Schema behavior unless AJV is configured with `coerceTypes` and `useDefaults`. If the API relies on defaults (pagination) or coercion, JSON Schema-only validation may reject inputs that Zod would accept on the client.
- **Schema mismatch between shared and api types:** `packages/shared/src/types/common.ts` uses `page`/`limit`/`totalPages`, while `apps/api/src/shared/types/common.ts` uses `pageSize`. Adding pagination schemas should pick one shape and align both sides to avoid drift.
- **Naming/IDs in JSON Schema:** `zod-to-json-schema` can generate `$id`/`definitions`; inconsistent naming can cause collisions if multiple schemas are combined.
- **Error code alignment:** API error handler uses its own `ErrorCodes` enum; shared package has a different set in `packages/shared/src/constants/error-codes.ts`. A shared validation schema for error responses should decide which set to standardize.

**Test Ideas**
- Shared package unit tests:
- `auth.schema.test.ts`: verify `loginSchema` and `registerSchema` parse valid/invalid inputs; ensure `z.infer` types compile.
- `json-schema.test.ts`: verify `loginJsonSchema.body` and `registerJsonSchema.body` are valid JSON Schema objects and include required fields.
- API route tests:
- `health.routes.test.ts`: add `schema` and validate that malformed requests (if any) return `400` with `error.details.issues`.
- Auth route tests (when added): invalid email/password returns `400` with field-level issues, and valid payload passes.
- Optional integration test: ensure JSON Schema compilation is not happening per request (can be checked by spying on compilation or ensuring schema constants are reused).

**Notes for Implementation**
- Health schemas should reflect both `/health` (`{ status: "ok" }`) and `/ready` (`{ status: "ok" | "degraded", checks: { database, redis } }`) based on `apps/api/src/modules/health/health.service.ts`.
- Consider adding a `schemas` export path in `packages/shared/package.json` mirroring existing `./types`/`./constants` patterns to allow `@the-dmz/shared/schemas` imports.
