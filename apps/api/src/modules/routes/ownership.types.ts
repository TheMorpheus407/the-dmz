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
