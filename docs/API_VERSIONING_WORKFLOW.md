# API Versioning Workflow

This document describes the API versioning policy and how contributors should work with it.

## Overview

The DMZ uses a canonical API versioning policy to enforce consistent API versioning across all foundation APIs. This ensures:

- All module routes are registered under the approved versioned base path (`/api/v1`)
- Unversioned routes are explicitly allowed only for approved exceptions
- Deprecated endpoints emit RFC-compliant deprecation headers
- OpenAPI artifacts reflect the versioning contract

## Policy Location

The API versioning policy is defined at:

```
apps/api/src/shared/policies/api-versioning-policy.ts
```

## Understanding the Policy

The policy declares:

- **Active major version**: `v1`
- **Versioned base path**: `/api/v1`
- **Module-specific rules**: Each module has a required version prefix
- **Allowed exceptions**: Paths that can remain unversioned (`/health`, `/ready`, `/docs`)
- **Deprecation contract**: RFC 8594 headers required for deprecated routes

## Adding a New Versioned Endpoint

When creating a new backend endpoint:

1. **Ensure route follows versioned prefix**:
   - Auth routes: `/api/v1/auth/*`
   - Game routes: `/api/v1/game/*`

2. **Register ownership** in `apps/api/src/modules/routes/ownership-manifest.ts`:

   ```typescript
   {
     module: 'mymodule',
     routePrefix: '/mymodule',
     routeTags: ['MyModule'],
     ownedRoutes: [
       '/mymodule/resource',
       '/mymodule/resource/:id',
     ],
     exemptions: [],
   },
   ```

3. **Register the module version rule** in `api-versioning-policy.ts`:

   ```typescript
   modules: [
     // ...existing modules
     {
       module: 'mymodule',
       requiredVersionPrefix: '/api/v1/mymodule',
       allowedUnversioned: false,
     },
   ],
   ```

4. **Run validation**:
   ```bash
   pnpm --filter api lint:api-versioning
   ```

## Registering Temporary Exceptions

Sometimes a route legitimately needs to remain unversioned. To request an exception:

1. Add an entry to `allowedUnversionedExceptions` in the policy:

   ```typescript
   allowedUnversionedExceptions: [
     // ...existing exceptions
     {
       path: '/my-temp-endpoint',
       reason: 'Temporary endpoint for migration',
       expiryDate: '2026-06-01',  // Required if reviewRequired is true
       reviewRequired: true,      // Set to true for temporary exceptions
       allowSubpaths: false,
     },
   ],
   ```

2. **Temporary exceptions require**:
   - `expiryDate`: When the exception expires
   - `reviewRequired`: Must be `true` for temporary exceptions
   - A clear `reason` explaining why the exception is needed

3. Run validation to confirm:
   ```bash
   pnpm --filter api lint:api-versioning
   ```

## Deprecating an Endpoint

When deprecating an endpoint:

1. **Add deprecation config** to your route:

   ```typescript
   fastify.get('/old-endpoint', handler, {
     config: {
       deprecation: {
         sunsetDate: '2026-06-01',
         successorPath: '/api/v1/new-endpoint',
       },
     },
   });
   ```

2. **Required deprecation headers**:
   - `sunsetDate`: When the endpoint will be removed (required)
   - `successorPath`: Path to the replacement endpoint (optional)

3. The deprecation middleware automatically adds:
   - `Deprecation` header with sunset date
   - `Sunset` header with the sunset timestamp
   - `Link` header pointing to the successor version

## Running the Versioning Gate

### Local Development

```bash
# Run only API versioning checks
pnpm --filter api lint:api-versioning

# Run full lint (includes API versioning)
pnpm --filter api lint
```

### CI/Pre-commit

The API versioning check is automatically included in the main `lint` command and will fail builds if any violations are detected.

## Troubleshooting

### "Route '/X' must be under '/api/v1/Y', found under '/Z'"

- The route is not registered under the correct versioned prefix
- Either update the route path, or
- Add a module version rule if this is a new module

### "Unversioned route '/X' is not registered as an exception"

- The route is not under `/api/v1` and is not in the allowed exceptions list
- Either prefix the route with `/api/v1`, or
- Register an exception in `allowedUnversionedExceptions`

### "Deprecated route missing required 'sunsetDate'"

- A route has deprecation config but is missing the `sunsetDate` field
- Add `sunsetDate` to the deprecation config with the removal date

### Lint still fails after changes

- Ensure the module is added to both the ownership manifest AND the versioning policy
- Run `pnpm --filter api lint:api-versioning` for detailed diagnostics
- Check that route paths match exactly (case-sensitive)

## Related Documents

- [DD-09: Backend Architecture API](docs/DD/09_backend_architecture_api.md)
- [Route Boundary Enforcement](docs/ROUTE_BOUNDARY_ENFORCEMENT.md)
- [OpenAPI Workflow](docs/OPENAPI_WORKFLOW.md)
- [Deprecation Middleware](apps/api/src/shared/middleware/deprecation.ts)
