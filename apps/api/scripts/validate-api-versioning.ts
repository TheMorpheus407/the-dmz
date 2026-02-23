import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  API_VERSIONING_POLICY,
  isPathVersioned,
  isPathAllowedUnversioned,
  validateVersioningPolicy,
  getModuleVersionRule,
} from '../src/shared/policies/index.js';
import { ROUTE_OWNERSHIP_MANIFEST } from '../src/modules/routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

const MODULE_DIRS = ['auth', 'game', 'health'];

interface DiscoveredRoute {
  file: string;
  module: string;
  route: string;
  method: string;
  hasDeprecation?: boolean;
}

interface VersioningViolation {
  type:
    | 'unversioned_route'
    | 'invalid_version_prefix'
    | 'unregistered_exception'
    | 'missing_deprecation_headers';
  file: string;
  module: string;
  route: string;
  message: string;
  severity: 'error' | 'warning';
}

function extractRoutesFromFile(filePath: string, moduleName: string): DiscoveredRoute[] {
  const content = readFileSync(filePath, 'utf-8');
  const routes: DiscoveredRoute[] = [];

  const routePatterns = [
    /fastify\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/g,
    /fastify\.(get|post|put|patch|delete|options|head)\s*\(\s*`([^`]+)`/g,
  ];

  const deprecationPatterns = [/config:\s*\{[^}]*deprecation:/s, /deprecation:\s*\{/];

  const hasDeprecation = deprecationPatterns.some((pattern) => pattern.test(content));

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
        hasDeprecation,
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

function validateVersioningPolicyExists(): VersioningViolation[] {
  const violations: VersioningViolation[] = [];

  const validation = validateVersioningPolicy();
  if (!validation.valid) {
    violations.push({
      type: 'invalid_version_prefix',
      file: 'api-versioning-policy.ts',
      module: 'policy',
      route: '/',
      message: `Policy validation failed: ${validation.errors.join(', ')}`,
      severity: 'error',
    });
  }

  return violations;
}

function validateVersionedRoutePrefix(routes: DiscoveredRoute[]): VersioningViolation[] {
  const violations: VersioningViolation[] = [];
  const versionedBasePath = API_VERSIONING_POLICY.versionedBasePath;

  for (const route of routes) {
    const versionRule = getModuleVersionRule(route.module);

    if (!versionRule) {
      continue;
    }

    if (versionRule.allowedUnversioned) {
      continue;
    }

    const ownership = ROUTE_OWNERSHIP_MANIFEST.ownership.find((o) => o.module === route.module);
    if (ownership) {
      const isExemption = ownership.exemptions.some((e) => e.route === route.route);
      if (isExemption) {
        continue;
      }
    }

    const fullPath = versionedBasePath + route.route;

    if (!fullPath.startsWith(versionRule.requiredVersionPrefix)) {
      violations.push({
        type: 'invalid_version_prefix',
        file: route.file,
        module: route.module,
        route: route.route,
        message: `Route '${route.route}' for module '${route.module}' must be under '${versionRule.requiredVersionPrefix}', found under '${fullPath}'`,
        severity: 'error',
      });
    }
  }

  return violations;
}

function validateExceptionRegistration(routes: DiscoveredRoute[]): VersioningViolation[] {
  const violations: VersioningViolation[] = [];
  const versionedBasePath = API_VERSIONING_POLICY.versionedBasePath;

  for (const route of routes) {
    if (!route.route.startsWith('/')) {
      continue;
    }

    const ownership = ROUTE_OWNERSHIP_MANIFEST.ownership.find((o) => o.module === route.module);
    if (ownership) {
      const isExemption = ownership.exemptions.some((e) => e.route === route.route);
      if (isExemption) {
        continue;
      }
    }

    const fullPath = versionedBasePath + route.route;
    const isVersioned = isPathVersioned(fullPath);
    const isAllowedException = isPathAllowedUnversioned(route.route);

    if (!isVersioned && !isAllowedException) {
      violations.push({
        type: 'unregistered_exception',
        file: route.file,
        module: route.module,
        route: route.route,
        message: `Unversioned route '${route.route}' is not registered as an exception in the versioning policy. Add to allowedUnversionedExceptions or prefix with ${versionedBasePath}`,
        severity: 'error',
      });
    }
  }

  return violations;
}

function validateDeprecationHeaders(routes: DiscoveredRoute[]): VersioningViolation[] {
  const violations: VersioningViolation[] = [];

  for (const route of routes) {
    const content = readFileSync(route.file, 'utf-8');

    const deprecationConfigPattern = /deprecation:\s*\{/;
    const hasDeprecationConfig = deprecationConfigPattern.test(content);

    if (!hasDeprecationConfig) {
      continue;
    }

    const sunsetPattern = /sunsetDate:\s*['"`]/;
    const hasSunsetDate = sunsetPattern.test(content);

    if (!hasSunsetDate) {
      violations.push({
        type: 'missing_deprecation_headers',
        file: route.file,
        module: route.module,
        route: route.route,
        message: `Deprecated route '${route.route}' missing required 'sunsetDate' in deprecation config`,
        severity: 'error',
      });
    }
  }

  return violations;
}

interface OpenAPIDocument {
  servers?: Array<{ url: string; description?: string }>;
  basePath?: string;
}

function validateOpenAPIAlignment(): VersioningViolation[] {
  const violations: VersioningViolation[] = [];
  const openApiPath = join(__dirname, '..', 'openapi', 'openapi.v1.json');

  if (!existsSync(openApiPath)) {
    violations.push({
      type: 'invalid_version_prefix',
      file: 'openapi.v1.json',
      module: 'openapi',
      route: '/',
      message: 'OpenAPI document not found at apps/api/openapi/openapi.v1.json',
      severity: 'error',
    });
    return violations;
  }

  let openApiDoc: OpenAPIDocument;
  try {
    const content = readFileSync(openApiPath, 'utf-8');
    openApiDoc = JSON.parse(content) as OpenAPIDocument;
  } catch {
    violations.push({
      type: 'invalid_version_prefix',
      file: 'openapi.v1.json',
      module: 'openapi',
      route: '/',
      message: 'Failed to parse OpenAPI document',
      severity: 'error',
    });
    return violations;
  }

  const policy = API_VERSIONING_POLICY;
  const expectedBasePath = policy.openApi.basePath;

  if (!openApiDoc.servers || openApiDoc.servers.length === 0) {
    violations.push({
      type: 'invalid_version_prefix',
      file: 'openapi.v1.json',
      module: 'openapi',
      route: '/',
      message: 'OpenAPI document has no servers defined',
      severity: 'error',
    });
  } else {
    const firstServer = openApiDoc.servers[0];
    if (!firstServer) {
      violations.push({
        type: 'invalid_version_prefix',
        file: 'openapi.v1.json',
        module: 'openapi',
        route: '/',
        message: 'OpenAPI document has no servers defined',
        severity: 'error',
      });
    } else {
      const serverUrl = firstServer.url;
      if (!serverUrl.includes(expectedBasePath)) {
        violations.push({
          type: 'invalid_version_prefix',
          file: 'openapi.v1.json',
          module: 'openapi',
          route: '/',
          message: `OpenAPI server URL '${serverUrl}' does not include versioned base path '${expectedBasePath}'. Update server URL to include the versioned path.`,
          severity: 'error',
        });
      }
    }
  }

  return violations;
}

function printViolations(violations: VersioningViolation[]): void {
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');

  if (errors.length > 0) {
    console.log('\n[ERRORS]');
    for (const v of errors) {
      const location = v.file !== 'policy' ? ` (${v.file})` : '';
      console.log(`  ❌ ${v.message}${location}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n[WARNINGS]');
    for (const v of warnings) {
      const location = v.file !== 'app.ts' ? ` (${v.file})` : '';
      console.log(`  ⚠️  ${v.message}${location}`);
    }
  }
}

async function runValidation(): Promise<void> {
  console.log('Running API Versioning Validation...\n');
  console.log('='.repeat(50));

  const policy = API_VERSIONING_POLICY;
  console.log(`Active Version: ${policy.activeMajorVersion}`);
  console.log(`Versioned Base Path: ${policy.versionedBasePath}`);
  console.log(`Allowed Exceptions: ${policy.allowedUnversionedExceptions.length}`);

  const allViolations: VersioningViolation[] = [];

  console.log('\n[1/5] Validating policy integrity...');
  const policyViolations = validateVersioningPolicyExists();
  allViolations.push(...policyViolations);
  if (policyViolations.length > 0) {
    console.log(`  ❌ ${policyViolations.length} policy error(s)`);
  } else {
    console.log('  ✅ Policy validation passed');
  }

  console.log('\n[2/5] Discovering routes from module files...');
  const routes = discoverRoutes();
  console.log(`  Found ${routes.length} route(s) in ${MODULE_DIRS.length} modules`);

  if (routes.length === 0) {
    console.log('\n❌ ERROR: No routes discovered. Aborting.');
    process.exit(1);
  }

  console.log('\n[3/5] Validating versioned route prefixes...');
  const prefixViolations = validateVersionedRoutePrefix(routes);
  allViolations.push(...prefixViolations);
  if (prefixViolations.length > 0) {
    console.log(`  ❌ ${prefixViolations.length} prefix violation(s)`);
  } else {
    console.log('  ✅ All routes comply with versioned prefix requirements');
  }

  console.log('\n[4/5] Checking unversioned route exceptions...');
  const exceptionViolations = validateExceptionRegistration(routes);
  allViolations.push(...exceptionViolations);
  if (exceptionViolations.length > 0) {
    console.log(`  ❌ ${exceptionViolations.length} unregistered exception(s)`);
  } else {
    console.log('  ✅ All unversioned routes are registered as exceptions');
  }

  console.log('\n[5/5] Validating deprecation header configuration...');
  const deprecationViolations = validateDeprecationHeaders(routes);
  allViolations.push(...deprecationViolations);
  if (deprecationViolations.length > 0) {
    console.log(`  ❌ ${deprecationViolations.length} deprecation configuration issue(s)`);
  } else {
    console.log('  ✅ Deprecation headers properly configured');
  }

  console.log('\n[6/6] Validating OpenAPI alignment with versioning policy...');
  const openApiViolations = validateOpenAPIAlignment();
  allViolations.push(...openApiViolations);
  if (openApiViolations.length > 0) {
    console.log(`  ❌ ${openApiViolations.length} OpenAPI alignment issue(s)`);
  } else {
    console.log('  ✅ OpenAPI artifacts align with versioning policy');
  }

  console.log('\n' + '='.repeat(50));

  const errors = allViolations.filter((v) => v.severity === 'error');

  if (errors.length > 0) {
    console.error(`\n❌ FAILED: ${errors.length} error(s) found\n`);
    printViolations(allViolations);
    console.log(
      '\nTo fix: Update route definitions or register exceptions in the versioning policy',
    );
    process.exit(1);
  } else {
    const warnings = allViolations.filter((v) => v.severity === 'warning');
    if (warnings.length > 0) {
      console.log(`\n⚠️  PASSED with ${warnings.length} warning(s)`);
      printViolations(allViolations);
    } else {
      console.log('\n✅ PASSED: All API versioning checks passed');
    }

    console.log(`\nPolicy summary:`);
    console.log(`  - Active major version: ${API_VERSIONING_POLICY.activeMajorVersion}`);
    console.log(`  - Versioned base path: ${API_VERSIONING_POLICY.versionedBasePath}`);
    console.log(`  - Module rules: ${API_VERSIONING_POLICY.modules.length}`);
    console.log(
      `  - Allowed exceptions: ${API_VERSIONING_POLICY.allowedUnversionedExceptions.length}`,
    );

    process.exit(0);
  }
}

runValidation().catch((err) => {
  console.error('API versioning validation failed:', err);
  process.exit(1);
});
