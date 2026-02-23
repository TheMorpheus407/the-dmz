import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ROUTE_OWNERSHIP_MANIFEST,
  getRouteOwnership,
  isRouteOwnedByModule,
  getRouteOwner,
  type RouteBoundaryViolation,
} from '../src/modules/routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

const MODULE_DIRS = ['auth', 'game', 'health'];

interface DiscoveredRoute {
  file: string;
  module: string;
  route: string;
  method: string;
}

function extractRoutesFromFile(filePath: string, moduleName: string): DiscoveredRoute[] {
  const content = readFileSync(filePath, 'utf-8');
  const routes: DiscoveredRoute[] = [];

  const routePatterns = [
    /fastify\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/g,
    /fastify\.(get|post|put|patch|delete|options|head)\s*\(\s*`([^`]+)`/g,
  ];

  for (const pattern of routePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const method = (match[1] ?? '').toUpperCase();
      let route = match[2] ?? '';

      route = route.replace(/:[\w]+/g, ':param');

      if (!route.startsWith('/')) {
        route = '/' + route;
      }

      routes.push({
        file: filePath,
        module: moduleName,
        route,
        method,
      });
    }
  }

  return routes;
}

function discoverRoutes(): DiscoveredRoute[] {
  const allRoutes: DiscoveredRoute[] = [];

  for (const moduleName of MODULE_DIRS) {
    const modulePath = join(MODULES_DIR, moduleName);
    if (!existsSync(modulePath)) continue;

    const files = readdirSync(modulePath, { recursive: true }).filter(
      (f) => typeof f === 'string' && f.endsWith('.routes.ts'),
    );

    for (const file of files) {
      const fullPath = join(modulePath, file as string);
      if (existsSync(fullPath)) {
        const routes = extractRoutesFromFile(fullPath, moduleName);
        allRoutes.push(...routes);
      }
    }
  }

  return allRoutes;
}

function validateRoutePrefixBoundaries(routes: DiscoveredRoute[]): RouteBoundaryViolation[] {
  const violations: RouteBoundaryViolation[] = [];

  for (const route of routes) {
    const ownership = getRouteOwnership(route.module);

    if (!ownership) {
      violations.push({
        type: 'unregistered_route',
        file: route.file,
        module: route.module,
        route: route.route,
        message: `Module '${route.module}' has no route ownership manifest entry`,
      });
      continue;
    }

    if (!isRouteOwnedByModule(route.module, route.route)) {
      const owner = getRouteOwner(route.route);
      violations.push({
        type: 'foreign_prefix',
        file: route.file,
        module: route.module,
        route: route.route,
        message: `Module '${route.module}' registers route '${route.route}' which belongs to '${owner || 'unknown'}' (expected prefix: ${ownership.routePrefix})`,
      });
    }
  }

  return violations;
}

function validateDuplicateRoutes(routes: DiscoveredRoute[]): RouteBoundaryViolation[] {
  const violations: RouteBoundaryViolation[] = [];
  const routeKeyToModules = new Map<string, string[]>();

  for (const route of routes) {
    const key = `${route.method}:${route.route}`;
    const existing = routeKeyToModules.get(key) || [];
    existing.push(route.module);
    routeKeyToModules.set(key, existing);
  }

  for (const [routeKey, modules] of routeKeyToModules) {
    if (modules.length > 1) {
      const parts = routeKey.split(':');
      const method = parts[0] ?? '';
      const route = parts[1] ?? '';
      violations.push({
        type: 'duplicate_route',
        file: 'multiple',
        module: modules.join(', '),
        route,
        message: `Route '${method} ${route}' is registered by multiple modules: ${modules.join(', ')}`,
      });
    }
  }

  return violations;
}

function validateUnregisteredRoutes(routes: DiscoveredRoute[]): RouteBoundaryViolation[] {
  const violations: RouteBoundaryViolation[] = [];

  const registeredPrefixes = ROUTE_OWNERSHIP_MANIFEST.ownership.map((o) => o.routePrefix);

  for (const route of routes) {
    const isRegistered = registeredPrefixes.some((prefix) => route.route.startsWith(prefix));
    const ownership = getRouteOwnership(route.module);
    const hasExemption = ownership?.exemptions.some((e) => route.route.startsWith(e.route));

    if (!isRegistered && !hasExemption) {
      violations.push({
        type: 'unregistered_route',
        file: route.file,
        module: route.module,
        route: route.route,
        message: `Route '${route.route}' is not registered in any module ownership manifest`,
      });
    }
  }

  return violations;
}

function printViolations(violations: RouteBoundaryViolation[]): void {
  const byType: Record<string, RouteBoundaryViolation[]> = {};
  for (const v of violations) {
    if (!byType[v.type]) {
      byType[v.type] = [];
    }
    byType[v.type]!.push(v);
  }

  for (const [type, typeViolations] of Object.entries(byType)) {
    console.log(`\n[${type.toUpperCase().replace('_', ' ')}]`);
    for (const v of typeViolations) {
      const location = v.file !== 'multiple' ? ` (${v.file})` : '';
      console.log(`  ❌ ${v.message}${location}`);
    }
  }
}

async function runValidation(): Promise<void> {
  console.log('Running Route Boundary Validation...\n');
  console.log('='.repeat(50));

  const allViolations: RouteBoundaryViolation[] = [];

  console.log('\n[1/3] Discovering routes from module files...');
  const routes = discoverRoutes();
  console.log(`  Found ${routes.length} route(s) in ${MODULE_DIRS.length} modules`);

  if (routes.length === 0) {
    console.log('\n❌ ERROR: No routes discovered. Aborting.');
    process.exit(1);
  }

  console.log('\n[2/3] Validating route prefix boundaries...');
  const prefixViolations = validateRoutePrefixBoundaries(routes);
  allViolations.push(...prefixViolations);
  if (prefixViolations.length > 0) {
    console.log(`  ❌ ${prefixViolations.length} prefix violation(s)`);
  } else {
    console.log('  ✅ All routes comply with module prefix boundaries');
  }

  console.log('\n[3/3] Checking for duplicate routes...');
  const duplicateViolations = validateDuplicateRoutes(routes);
  allViolations.push(...duplicateViolations);
  if (duplicateViolations.length > 0) {
    console.log(`  ❌ ${duplicateViolations.length} duplicate route(s)`);
  } else {
    console.log('  ✅ No duplicate routes detected');
  }

  console.log('\n[Bonus] Checking for unregistered routes...');
  const unregisteredViolations = validateUnregisteredRoutes(routes);
  allViolations.push(...unregisteredViolations);
  if (unregisteredViolations.length > 0) {
    console.log(`  ❌ ${unregisteredViolations.length} unregistered route(s)`);
  } else {
    console.log('  ✅ All routes are registered');
  }

  console.log('\n' + '='.repeat(50));

  if (allViolations.length > 0) {
    console.error(`\n❌ FAILED: ${allViolations.length} violation(s) found\n`);
    printViolations(allViolations);
    console.log('\nTo fix: Update the route ownership manifest or route definitions');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All route boundary checks passed');
    console.log(`\nOwnership manifest contains:`);
    for (const entry of ROUTE_OWNERSHIP_MANIFEST.ownership) {
      console.log(
        `  - ${entry.module}: ${entry.ownedRoutes.length} routes, ${entry.exemptions.length} exemptions`,
      );
    }
    process.exit(0);
  }
}

runValidation().catch((err) => {
  console.error('Route boundary validation failed:', err);
  process.exit(1);
});
