# Schema Boundary Enforcement

This document describes the schema ownership manifest and how contributors should work with it.

## Overview

The DMZ uses a canonical module-owned schema ownership registry to enforce schema namespace and OpenAPI component boundary integrity. This ensures:

- Each module declares schemas only within its declared namespace
- Duplicate or conflicting schema identifiers are detected
- OpenAPI component names align with module ownership rules
- Cross-module schema usage follows approved shared-source patterns
- Unauthorized cross-module schema imports are blocked

## Registry Location

The schema ownership manifest is located at:

```
apps/api/src/modules/routes/schema-ownership-manifest.ts
```

## Adding Schema Ownership for a New Module

When creating a new backend module with request/response schemas:

1. **Define schema ownership** in `schema-ownership-manifest.ts`:

   ```typescript
   {
     module: 'mymodule',
     schemaNamespace: 'MyModule',
     ownedSchemas: [
       'myModuleResourceJsonSchema',
       'myModuleResponseJsonSchema',
     ],
     ownedComponents: [
       'MyModuleResource',
       'MyModuleResponse',
       'MyModuleModel',
     ],
     componentPatterns: ['^MyModule'],
     sharedSources: ['@the-dmz/shared/schemas'],
     exemptions: [],
   },
   ```

2. **Use schemas in your module routes**:

   ```typescript
   // In your module's routes
   const myModuleResourceSchema = {
     body: myModuleResourceJsonSchema,
     response: {
       200: myModuleResponseJsonSchema,
     },
   };
   ```

3. **Run validation**:
   ```bash
   pnpm --filter api lint:schema-boundaries
   ```

## Schema Naming Conventions

### JSON Schema IDs (Zod)

- Use pattern: `{moduleName}{Resource}JsonSchema`
- Examples: `loginBodyJsonSchema`, `gameSessionBootstrapResponseJsonSchema`

### OpenAPI Components

- Use pattern: `{ModuleNamespace}{Resource}`
- Examples: `AuthLoginResponse`, `GameSessionBootstrapResponse`

### Component Patterns

Component patterns use regex to match component names that follow naming conventions:

- `^Auth` matches all components starting with "Auth"
- `^Game` matches all components starting with "Game"
- `^Health` matches all components starting with "Health"

## Shared Schema Import Boundaries

Modules can only import schemas from approved shared sources:

| Module | Allowed Shared Sources                            |
| ------ | ------------------------------------------------- |
| auth   | `@the-dmz/shared/schemas`, `@the-dmz/shared/auth` |
| game   | `@the-dmz/shared/schemas`                         |
| health | `@the-dmz/shared/schemas`                         |

### Why This Matters

- Prevents implicit cross-module coupling
- Ensures schema contracts are versioned and stable
- Maintains clear ownership boundaries

## Declaring Schema Exemptions

Sometimes a module legitimately needs to use schemas outside its namespace. To request an exemption:

1. Add an `exemptions` array to your module's ownership entry:

   ```typescript
   {
     module: 'auth',
     schemaNamespace: 'Auth',
     ownedSchemas: ['loginBodyJsonSchema'],
     ownedComponents: ['AuthLoginResponse'],
     componentPatterns: ['^Auth'],
     sharedSources: ['@the-dmz/shared/schemas'],
     exemptions: [
       {
         schema: 'externalPartnerResponseJsonSchema',
         reason: 'Temporary integration with partner API',
       },
     ],
   },
   ```

2. Run validation to confirm

## Running the Schema Boundary Gate

### Local Development

```bash
# Run only schema boundary checks
pnpm --filter api lint:schema-boundaries

# Run full lint (includes schema boundaries)
pnpm --filter api lint
```

### CI/Pre-commit

The schema boundary check is automatically included in the main `lint` command and will fail builds if any violations are detected.

## Troubleshooting

### "Schema X defined outside module Y's namespace"

- The schema is not in the module's `ownedSchemas` list
- Either add it to the module's owned schemas, or
- Move the schema definition to the correct module

### "Duplicate schema: X defined by modules Y and Z"

- Two modules are claiming ownership of the same schema
- One module should own this schema
- Add an exemption for the non-owning module if necessary

### "Component X does not match any owned pattern for module Y"

- The OpenAPI component name doesn't follow the module's naming conventions
- Update the component name to match the pattern, or
- Add the component explicitly to `ownedComponents`

### "Unauthorized import: module X imports from Y"

- The module is importing from a non-approved shared source
- Only import from the module's `sharedSources` list
- Request approval for additional shared sources if needed

### "Unregistered schema/component: X not found in ownership manifest"

- A discovered schema or component is not declared in any module
- Add it to the appropriate module's ownership entry

### Lint still fails after adding schema to manifest

- Ensure the schema/component is added to the correct module's list
- Check that names match exactly (case-sensitive)
- Run `pnpm --filter api lint:schema-boundaries` to see detailed diagnostics

## Related Documents

- [DD-09: Backend Architecture API](docs/DD/09_backend_architecture_api.md)
- [DD-10: Database Schema Data Model](docs/DD/10_database_schema_data_model.md)
- [Route Boundary Enforcement](docs/ROUTE_BOUNDARY_ENFORCEMENT.md)
- [Event Boundary Enforcement](docs/EVENT_BOUNDARY_ENFORCEMENT.md)
- [Data Boundary Enforcement](docs/data-boundary-enforcement.md)
