export interface RouteExemption {
  route: string;
  reason: string;
}

export interface RouteOwnershipEntry {
  module: string;
  routePrefix: string;
  routeTags: string[];
  ownedRoutes: string[];
  exemptions: RouteExemption[];
}

export interface RouteOwnershipManifest {
  ownership: RouteOwnershipEntry[];
}

export interface RouteBoundaryViolation {
  type: 'foreign_prefix' | 'duplicate_route' | 'unregistered_route' | 'missing_tag';
  file: string;
  module: string;
  route: string;
  message: string;
}

export interface SchemaExemption {
  schema: string;
  reason: string;
}

export interface SchemaOwnershipEntry {
  module: string;
  schemaNamespace: string;
  ownedSchemas: string[];
  ownedComponents: string[];
  componentPatterns: string[];
  sharedSources: string[];
  exemptions: SchemaExemption[];
}

export interface SchemaOwnershipManifest {
  ownership: SchemaOwnershipEntry[];
}

export interface SchemaBoundaryViolation {
  type:
    | 'foreign_namespace'
    | 'duplicate_schema'
    | 'duplicate_component'
    | 'unregistered_schema'
    | 'unauthorized_import'
    | 'missing_declaration';
  file: string;
  module: string;
  schema?: string;
  component?: string;
  message: string;
}
