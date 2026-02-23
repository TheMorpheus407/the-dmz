import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HOOK_CHAIN_MANIFEST,
  getRequiredHooksForCategory,
  getCategoryForRoute,
  isRouteExcepted,
  isHookAllowed,
  type HookChainViolation,
  type HookName,
} from '../src/shared/middleware/hook-chain-manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

const MODULE_DIRS = ['auth', 'game', 'health'];

const KNOWN_HOOKS = new Set([
  'authGuard',
  'tenantContext',
  'tenantStatusGuard',
  'requirePermission',
  'requireRole',
  'requireMfaForSuperAdmin',
  'validateCsrf',
  'rateLimiter',
]);

interface DiscoveredRoute {
  file: string;
  module: string;
  route: string;
  method: string;
  preHandler: string[];
}

function extractRoutesFromFile(filePath: string, moduleName: string): DiscoveredRoute[] {
  const content = readFileSync(filePath, 'utf-8');
  const routes: DiscoveredRoute[] = [];

  const routePattern = /fastify\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/g;

  let routeMatch;
  while ((routeMatch = routePattern.exec(content)) !== null) {
    const method = routeMatch[1]!.toUpperCase();
    let route = routeMatch[2] ?? '';

    route = route.replace(/:[\w]+/g, ':param');

    if (!route.startsWith('/')) {
      route = '/' + route;
    }

    const routeEndPos = routeMatch.index + routeMatch[0].length;
    const afterRoute = content.substring(routeEndPos, routeEndPos + 600);

    const preHandlerMatch = afterRoute.match(/preHandler\s*:\s*\[([^\]]+)\]/);

    const hooks: string[] = [];
    if (preHandlerMatch) {
      const hookContent = preHandlerMatch[1] ?? '';
      const parts = hookContent.split(',').map((h) => h.trim());
      for (const part of parts) {
        const hookName = part.replace(/\s*\(.*$/, '').trim();
        if (hookName && KNOWN_HOOKS.has(hookName) && !hooks.includes(hookName)) {
          hooks.push(hookName);
        }
      }
    }

    routes.push({
      file: filePath,
      module: moduleName,
      route,
      method,
      preHandler: hooks,
    });
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

function validateHookPresence(route: DiscoveredRoute): HookChainViolation[] {
  const violations: HookChainViolation[] = [];

  const exception = isRouteExcepted(route.route);
  if (exception) {
    return violations;
  }

  const category = getCategoryForRoute(route.route);
  const requiredHooks = getRequiredHooksForCategory(category);

  if (category === 'public' || category === 'system') {
    return violations;
  }

  for (const required of requiredHooks) {
    const hasHook = route.preHandler.some((h) => {
      const hookName = h.replace(/[()]/g, '').trim();
      return hookName === required.hook || hookName.startsWith(required.hook);
    });

    if (!hasHook) {
      violations.push({
        type: 'missing_hook',
        route: route.route,
        file: route.file,
        expected: required.hook,
        observed: route.preHandler.join(', ') || 'none',
        message: `Route '${route.route}' is missing required hook '${required.hook}' (position ${required.position}) for category '${category}'`,
      });
    }
  }

  return violations;
}

function validateHookOrder(route: DiscoveredRoute): HookChainViolation[] {
  const violations: HookChainViolation[] = [];

  const exception = isRouteExcepted(route.route);
  if (exception) {
    return violations;
  }

  const category = getCategoryForRoute(route.route);
  const requiredHooks = getRequiredHooksForCategory(category);

  if (category === 'public' || category === 'system') {
    return violations;
  }

  const hookPositions: Map<string, number> = new Map();
  for (const required of requiredHooks) {
    hookPositions.set(required.hook, required.position);
  }

  const observedOrder: number[] = [];
  for (const hook of route.preHandler) {
    const hookName = hook.replace(/[()]/g, '').trim();
    const pos = hookPositions.get(hookName);
    if (pos !== undefined) {
      observedOrder.push(pos);
    }
  }

  for (let i = 1; i < observedOrder.length; i++) {
    if (observedOrder[i]! < observedOrder[i - 1]!) {
      const requiredOrder = requiredHooks
        .sort((a, b) => a.position - b.position)
        .map((h) => h.hook)
        .join(' -> ');
      violations.push({
        type: 'wrong_order',
        route: route.route,
        file: route.file,
        expected: requiredOrder,
        observed: route.preHandler.join(' -> '),
        message: `Route '${route.route}' has hooks in wrong order. Expected: ${requiredOrder}. Observed: ${route.preHandler.join(' -> ')}`,
      });
      break;
    }
  }

  return violations;
}

function validateHookSources(route: DiscoveredRoute): HookChainViolation[] {
  const violations: HookChainViolation[] = [];

  for (const hook of route.preHandler) {
    const hookName = hook.replace(/[()]/g, '').trim();

    if (!isHookAllowed(hookName as HookName)) {
      violations.push({
        type: 'unapproved_hook',
        route: route.route,
        file: route.file,
        expected: 'allowed hooks from HOOK_CHAIN_MANIFEST',
        observed: hookName,
        message: `Route '${route.route}' uses unapproved hook '${hookName}'`,
      });
    }
  }

  return violations;
}

function validateDuplicateHooks(route: DiscoveredRoute): HookChainViolation[] {
  const violations: HookChainViolation[] = [];

  const seen = new Set<string>();
  for (const hook of route.preHandler) {
    const hookName = hook.replace(/[()]/g, '').trim();
    if (seen.has(hookName)) {
      violations.push({
        type: 'duplicate_hook',
        route: route.route,
        file: route.file,
        expected: 'no duplicates',
        observed: hookName,
        message: `Route '${route.route}' has duplicate hook '${hookName}'`,
      });
    }
    seen.add(hookName);
  }

  return violations;
}

function validateAllRoutes(routes: DiscoveredRoute[]): HookChainViolation[] {
  const allViolations: HookChainViolation[] = [];

  for (const route of routes) {
    allViolations.push(...validateHookPresence(route));
    allViolations.push(...validateHookOrder(route));
    allViolations.push(...validateHookSources(route));
    allViolations.push(...validateDuplicateHooks(route));
  }

  return allViolations;
}

function printViolations(violations: HookChainViolation[]): void {
  const byType: Record<string, HookChainViolation[]> = {};
  for (const v of violations) {
    if (!byType[v.type]) {
      byType[v.type] = [];
    }
    byType[v.type]!.push(v);
  }

  for (const [type, typeViolations] of Object.entries(byType)) {
    console.log(`\n[${type.toUpperCase().replace('_', ' ')}]`);
    for (const v of typeViolations) {
      const fileName = v.file.split('/').pop() ?? v.file;
      console.log(`  ❌ ${v.message}`);
      console.log(`     File: ${fileName}`);
    }
  }
}

async function runValidation(): Promise<void> {
  console.log('Running Hook-Chain Integrity Validation...\n');
  console.log('='.repeat(50));

  const allViolations: HookChainViolation[] = [];

  console.log('\n[1/3] Discovering routes from module files...');
  const routes = discoverRoutes();
  console.log(`  Found ${routes.length} route(s) in ${MODULE_DIRS.length} modules`);

  if (routes.length === 0) {
    console.log('\n❌ ERROR: No routes discovered. Aborting.');
    process.exit(1);
  }

  console.log('\n[2/3] Validating hook chains...');
  const violations = validateAllRoutes(routes);
  allViolations.push(...violations);

  if (violations.length > 0) {
    console.log(`  ❌ ${violations.length} hook-chain violation(s)`);
  } else {
    console.log('  ✅ All routes comply with hook-chain contract');
  }

  console.log('\n[3/3] Validating hook source boundaries...');
  const sourceViolations: HookChainViolation[] = [];
  for (const route of routes) {
    sourceViolations.push(...validateHookSources(route));
  }
  allViolations.push(...sourceViolations);

  if (sourceViolations.length > 0) {
    console.log(`  ❌ ${sourceViolations.length} hook source violation(s)`);
  } else {
    console.log('  ✅ All hooks sourced from allowed locations');
  }

  console.log('\n' + '='.repeat(50));

  console.log('\nContract Summary:');
  console.log(`  Version: ${HOOK_CHAIN_MANIFEST.version}`);
  console.log(`  Categories: ${HOOK_CHAIN_MANIFEST.categories.join(', ')}`);
  console.log(`  Required hooks: ${HOOK_CHAIN_MANIFEST.requiredHooks.length}`);
  console.log(`  Allowed hooks: ${HOOK_CHAIN_MANIFEST.allowedHooks.join(', ')}`);
  console.log(`  Exceptions: ${HOOK_CHAIN_MANIFEST.exceptions.length}`);

  if (allViolations.length > 0) {
    console.log(`\n❌ FAILED: ${allViolations.length} violation(s) found\n`);
    printViolations(allViolations);
    console.log('\nTo fix: Update route preHandler configuration or request an exception');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All hook-chain integrity checks passed');
    process.exit(0);
  }
}

runValidation().catch((err) => {
  console.error('Hook-chain validation failed:', err);
  process.exit(1);
});
