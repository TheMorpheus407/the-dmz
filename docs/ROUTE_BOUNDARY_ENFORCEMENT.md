# Route Boundary Enforcement

This document describes the route ownership manifest and how contributors should work with it.

## Overview

The DMZ uses a canonical module-owned route ownership registry to enforce HTTP API namespace boundaries. This ensures:

- Each module registers routes only under its declared prefix
- Duplicate or conflicting routes are detected
- OpenAPI route metadata aligns with module ownership rules
- Cross-module route exceptions are explicitly approved

## Registry Location

The route ownership manifest is located at:

```
apps/api/src/modules/routes/ownership-manifest.ts
```

## Adding Route Ownership for a New Module

When creating a new backend module with HTTP routes:

1. **Define route ownership** in `ownership-manifest.ts`:

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

2. **Register routes in your module** using the Fastify plugin pattern:

   ```typescript
   // In your module's index.ts
   export const myModulePlugin: FastifyPluginAsync<MyModuleOptions> = async (fastify) => {
     fastify.get('/mymodule/resource', handler);
   };
   ```

3. **Run validation**:
   ```bash
   pnpm --filter api lint:route-boundaries
   ```

## Declaring Cross-Module Route Exemptions

Sometimes a module legitimately needs to register routes outside its prefix. To request an exemption:

1. Add an `exemptions` array to your module's ownership entry:

   ```typescript
   {
     module: 'auth',
     routePrefix: '/auth',
     routeTags: ['Auth'],
     ownedRoutes: ['/auth/login', '/auth/register'],
     exemptions: [
       {
         route: '/health/authenticated',
         reason: 'Auth module provides authenticated health check',
       },
     ],
   },
   ```

2. Run validation to confirm

## Running the Route Boundary Gate

### Local Development

```bash
# Run only route boundary checks
pnpm --filter api lint:route-boundaries

# Run full lint (includes route boundaries)
pnpm --filter api lint
```

### CI/Pre-commit

The route boundary check is automatically included in the main `lint` command and will fail builds if any violations are detected.

## Troubleshooting

### "Module X registers route /Y/\* outside its declared prefix"

- The module is registering routes that don't start with its declared `routePrefix`
- Either register routes under the correct prefix, or
- Add an exemption in the ownership manifest

### "Duplicate route: /path defined by modules X and Y"

- Two modules are registering the same route
- One module should own this route, or
- Add an exemption for one of them

### "Unregistered route: /path not found in ownership manifest"

- A discovered route is not in the ownership manifest
- Add it to the appropriate module's `ownedRoutes` list

### Lint still fails after adding route to manifest

- Ensure the route is added to the correct module's `ownedRoutes`
- Check that the route path matches exactly (case-sensitive)
- Run `pnpm --filter api lint:route-boundaries` to see detailed diagnostics

## Related Documents

- [DD-09: Backend Architecture API](docs/DD/09_backend_architecture_api.md)
- [Module Registration](docs/backend/module-registration.md)
- [Data Boundary Enforcement](docs/data-boundary-enforcement.md)
- [Event Boundary Enforcement](docs/EVENT_BOUNDARY_ENFORCEMENT.md)
