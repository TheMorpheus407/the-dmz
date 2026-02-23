export {
  ROUTE_OWNERSHIP_MANIFEST,
  getRouteOwnership,
  isRouteOwnedByModule,
  getRouteOwner,
  isRouteRegistered,
} from './ownership-manifest.js';

export type {
  RouteOwnershipManifest,
  RouteOwnershipEntry,
  RouteExemption,
  RouteBoundaryViolation,
} from './ownership.types.js';
