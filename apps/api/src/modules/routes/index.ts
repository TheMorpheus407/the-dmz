export {
  ROUTE_OWNERSHIP_MANIFEST,
  getRouteOwnership,
  isRouteOwnedByModule,
  getRouteOwner,
  isRouteRegistered,
} from './ownership-manifest.js';

export {
  SCHEMA_OWNERSHIP_MANIFEST,
  getSchemaOwnership,
  isSchemaOwnedByModule,
  isComponentOwnedByModule,
  isSharedSourceAllowed,
  getSchemaOwner,
  getComponentOwner,
  isSchemaRegistered,
  isComponentRegistered,
} from './schema-ownership-manifest.js';

export type {
  RouteOwnershipManifest,
  RouteOwnershipEntry,
  RouteExemption,
  RouteBoundaryViolation,
  SchemaOwnershipManifest,
  SchemaOwnershipEntry,
  SchemaExemption,
  SchemaBoundaryViolation,
} from './ownership.types.js';
