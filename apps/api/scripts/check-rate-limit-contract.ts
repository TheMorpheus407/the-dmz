import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  m1RateLimitPolicyManifest,
  type RateLimitPolicyEntry,
  type ExemptRoute,
  RateLimitCategory,
} from '@the-dmz/shared/contracts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

const MODULE_DIRS = ['auth', 'game', 'health'];

interface DiscoveredRoute {
  file: string;
  module: string;
  route: string;
  method: string;
  rateLimit?: unknown;
}

interface RateLimitViolation {
  type: 'unclassified_route' | 'misclassified_route' | 'missing_exempt' | 'unauthorized_override';
  file: string;
  route: string;
  method: string;
  expected?: string;
  actual?: string;
  message: string;
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

      let rateLimit: unknown = undefined;

      const configBlockMatch = content.match(/config:\s*\{[^}]*rateLimit:\s*([^,}]+)/g);
      if (configBlockMatch) {
        for (const block of configBlockMatch) {
          if (block.includes('rateLimit')) {
            if (block.includes('false')) {
              rateLimit = false;
            } else if (block.includes('{')) {
              rateLimit = { custom: true };
            }
          }
        }
      }

      routes.push({
        file: filePath,
        module: moduleName,
        route,
        method,
        rateLimit,
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

function findPolicyEntry(
  route: string,
  method: string,
  policyRoutes: RateLimitPolicyEntry[],
): RateLimitPolicyEntry | undefined {
  for (const entry of policyRoutes) {
    const routeMatches = route.startsWith(entry.route) || entry.route === route;
    const methodMatches = !entry.method || entry.method === method;

    if (routeMatches && methodMatches) {
      return entry;
    }
  }
  return undefined;
}

function findExemptEntry(route: string, exemptRoutes: ExemptRoute[]): ExemptRoute | undefined {
  return exemptRoutes.find((e) => route === e.path || route.startsWith(e.path));
}

function parseRateLimitConfig(
  content: string,
  route: string,
): {
  exempt: boolean;
  max?: number | undefined;
  windowMs?: number | undefined;
} {
  const routeRegex = new RegExp(
    `(['"\`])${route.replace(/:param/g, '[^/]+')}\\1\\s*,\\s*\\{[^}]*config:[^}]*rateLimit:\\s*([^,\\}]+)`,
    'g',
  );

  const matches = content.match(routeRegex);
  if (matches) {
    for (const match of matches) {
      if (match.includes('false')) {
        return { exempt: true };
      }
      const maxMatch = match.match(/max:\s*(\d+)/);
      const timeWindowMatch = match.match(/timeWindow:\s*['"](\d+)\s*(second|minute|ms)['"]/);
      if (maxMatch || timeWindowMatch) {
        const max = maxMatch ? parseInt(maxMatch[1]!, 10) : undefined;
        let windowMs: number | undefined;
        if (timeWindowMatch) {
          const value = parseInt(timeWindowMatch[1]!, 10);
          const unit = timeWindowMatch[2]!;
          windowMs = unit === 'ms' ? value : unit === 'second' ? value * 1000 : value * 60_000;
        }
        return { exempt: false, max: max, windowMs: windowMs };
      }
    }
  }

  return { exempt: false };
}

function validateRoutesAgainstPolicy(routes: DiscoveredRoute[]): RateLimitViolation[] {
  const violations: RateLimitViolation[] = [];
  const { routes: policyRoutes, exemptRoutes } = m1RateLimitPolicyManifest;

  for (const route of routes) {
    const content = readFileSync(route.file, 'utf-8');
    const { exempt: isExempt, max, windowMs } = parseRateLimitConfig(content, route.route);

    const policyEntry = findPolicyEntry(route.route, route.method, policyRoutes);
    const exemptEntry = findExemptEntry(route.route, exemptRoutes);

    if (isExempt && !exemptEntry) {
      violations.push({
        type: 'missing_exempt',
        file: route.file,
        route: route.route,
        method: route.method,
        message: `Route '${route.route}' (${route.method}) is marked rate-limit exempt but is not in the policy exempt list`,
      });
      continue;
    }

    if (!isExempt && exemptEntry) {
      violations.push({
        type: 'unauthorized_override',
        file: route.file,
        route: route.route,
        method: route.method,
        message: `Route '${route.route}' (${route.method}) is in policy exempt list but has rate limiting enabled`,
      });
      continue;
    }

    if (!isExempt && !policyEntry) {
      violations.push({
        type: 'unclassified_route',
        file: route.file,
        route: route.route,
        method: route.method,
        message: `Route '${route.route}' (${route.method}) is missing from rate-limit policy`,
      });
      continue;
    }

    if (policyEntry && max !== undefined && policyEntry.max !== max) {
      violations.push({
        type: 'misclassified_route',
        file: route.file,
        route: route.route,
        method: route.method,
        expected: `max: ${policyEntry.max}`,
        actual: `max: ${max}`,
        message: `Route '${route.route}' (${route.method}) has rate limit max=${max} but policy expects ${policyEntry.max}`,
      });
    }

    if (policyEntry && windowMs !== undefined && policyEntry.windowMs !== windowMs) {
      violations.push({
        type: 'misclassified_route',
        file: route.file,
        route: route.route,
        method: route.method,
        expected: `windowMs: ${policyEntry.windowMs}`,
        actual: `windowMs: ${windowMs}`,
        message: `Route '${route.route}' (${route.method}) has rate limit windowMs=${windowMs} but policy expects ${policyEntry.windowMs}`,
      });
    }
  }

  return violations;
}

function validateExemptRoutes(routes: DiscoveredRoute[]): RateLimitViolation[] {
  const violations: RateLimitViolation[] = [];
  const { exemptRoutes, routes: policyRoutes } = m1RateLimitPolicyManifest;

  for (const exempt of exemptRoutes) {
    const hasRoute = routes.some(
      (r: DiscoveredRoute) => r.route === exempt.path || r.route.startsWith(exempt.path + '/'),
    );
    const hasPolicyEntry = policyRoutes.some(
      (p: RateLimitPolicyEntry) => p.route === exempt.path || p.route.startsWith(exempt.path + '/'),
    );

    if (!hasRoute && !hasPolicyEntry) {
      console.log(
        `  ℹ️  Policy exempt route '${exempt.path}' is not currently registered in the app`,
      );
    }
  }

  return violations;
}

function printViolations(violations: RateLimitViolation[]): void {
  const byType: Record<string, RateLimitViolation[]> = {};
  for (const v of violations) {
    if (!byType[v.type]) {
      byType[v.type] = [];
    }
    byType[v.type]!.push(v);
  }

  for (const [type, typeViolations] of Object.entries(byType)) {
    console.log(`\n[${type.toUpperCase().replace('_', ' ')}]`);
    for (const v of typeViolations) {
      const location = ` (${v.file})`;
      const expected = v.expected ? `, expected ${v.expected}` : '';
      const actual = v.actual ? `, actual ${v.actual}` : '';
      console.log(`  ❌ ${v.message}${location}${expected}${actual}`);
    }
  }
}

async function runValidation(): Promise<void> {
  console.log('Running Rate-Limit Contract Validation...\n');
  console.log('='.repeat(50));
  console.log(`Policy version: ${m1RateLimitPolicyManifest.version}`);
  console.log(`Defined routes: ${m1RateLimitPolicyManifest.routes.length}`);
  console.log(`Exempt routes: ${m1RateLimitPolicyManifest.exemptRoutes.length}`);

  const allViolations: RateLimitViolation[] = [];

  console.log('\n[1/2] Discovering routes from module files...');
  const routes = discoverRoutes();
  console.log(`  Found ${routes.length} route(s) in ${MODULE_DIRS.length} modules`);

  if (routes.length === 0) {
    console.log('\n❌ ERROR: No routes discovered. Aborting.');
    process.exit(1);
  }

  console.log('\n[2/2] Validating routes against rate-limit policy...');
  const routeViolations = validateRoutesAgainstPolicy(routes);
  allViolations.push(...routeViolations);

  if (routeViolations.length > 0) {
    console.log(`  ❌ ${routeViolations.length} policy violation(s)`);
  } else {
    console.log('  ✅ All routes comply with rate-limit policy');
  }

  validateExemptRoutes(routes);

  console.log('\n' + '='.repeat(50));

  if (allViolations.length > 0) {
    console.error(`\n❌ FAILED: ${allViolations.length} violation(s) found\n`);
    printViolations(allViolations);
    console.log('\nTo fix: Update the rate-limit policy or route definitions');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All rate-limit contract checks passed');
    console.log('\nPolicy summary:');
    console.log(
      `  - Auth routes: ${m1RateLimitPolicyManifest.routes.filter((r) => r.category === RateLimitCategory.AUTH).length}`,
    );
    console.log(
      `  - Protected read: ${m1RateLimitPolicyManifest.routes.filter((r) => r.category === RateLimitCategory.PROTECTED_READ).length}`,
    );
    console.log(
      `  - Protected write: ${m1RateLimitPolicyManifest.routes.filter((r) => r.category === RateLimitCategory.PROTECTED_WRITE).length}`,
    );
    console.log(`  - Exempt routes: ${m1RateLimitPolicyManifest.exemptRoutes.length}`);
    process.exit(0);
  }
}

runValidation().catch((err) => {
  console.error('Rate-limit contract validation failed:', err);
  process.exit(1);
});
