import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SCHEMA_OWNERSHIP_MANIFEST,
  getSchemaOwnership,
  isSchemaOwnedByModule,
  isSharedSourceAllowed,
  getSchemaOwner,
  type SchemaBoundaryViolation,
} from '../src/modules/routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'src', 'modules');

const MODULE_DIRS = ['auth', 'game', 'health'];

interface DiscoveredSchema {
  file: string;
  module: string;
  schemaName: string;
  line: number;
}

interface DiscoveredImport {
  file: string;
  module: string;
  source: string;
  importedNames: string[];
  line: number;
}

function extractExportedSchemasFromFile(filePath: string, moduleName: string): DiscoveredSchema[] {
  const content = readFileSync(filePath, 'utf-8');
  const schemas: DiscoveredSchema[] = [];

  const exportSchemaPatterns = [
    /export\s+const\s+(\w+(?:JsonSchema|Schema))\s*=/g,
    /export\s+(?:const|let|var)\s+(\w+(?:JsonSchema|Schema))\s*=/g,
  ];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    if (!currentLine) continue;
    for (const pattern of exportSchemaPatterns) {
      const matches = currentLine.matchAll(pattern);
      for (const match of matches) {
        const schemaName = match[1];
        if (schemaName && !schemaName.startsWith('shared')) {
          schemas.push({
            file: filePath,
            module: moduleName,
            schemaName,
            line: i + 1,
          });
        }
      }
    }
  }

  return schemas;
}

function extractImportsFromFile(filePath: string, moduleName: string): DiscoveredImport[] {
  const content = readFileSync(filePath, 'utf-8');
  const imports: DiscoveredImport[] = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    if (!currentLine) continue;
    const fullImportMatch = currentLine.match(
      /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/,
    );
    if (fullImportMatch) {
      const namedImports = fullImportMatch[1];
      const defaultImport = fullImportMatch[2];
      const source = fullImportMatch[3] ?? '';

      const importedNames: string[] = [];
      if (namedImports) {
        importedNames.push(...namedImports.split(',').map((n) => n.trim()));
      }
      if (defaultImport) {
        importedNames.push(defaultImport);
      }

      imports.push({
        file: filePath,
        module: moduleName,
        source,
        importedNames,
        line: i + 1,
      });
    }
  }

  return imports;
}

function discoverSchemas(): DiscoveredSchema[] {
  const allSchemas: DiscoveredSchema[] = [];

  for (const moduleName of MODULE_DIRS) {
    const modulePath = join(MODULES_DIR, moduleName);
    if (!existsSync(modulePath)) continue;

    const files = readdirSync(modulePath, { recursive: true }).filter(
      (f) => typeof f === 'string' && f.endsWith('.routes.ts'),
    );

    for (const file of files) {
      const fullPath = join(modulePath, file as string);
      if (existsSync(fullPath)) {
        const schemas = extractExportedSchemasFromFile(fullPath, moduleName);
        allSchemas.push(...schemas);
      }
    }
  }

  return allSchemas;
}

function discoverImports(): DiscoveredImport[] {
  const allImports: DiscoveredImport[] = [];

  for (const moduleName of MODULE_DIRS) {
    const modulePath = join(MODULES_DIR, moduleName);
    if (!existsSync(modulePath)) continue;

    const files = readdirSync(modulePath, { recursive: true }).filter(
      (f) => typeof f === 'string' && (f.endsWith('.routes.ts') || f.endsWith('.service.ts')),
    );

    for (const file of files) {
      const fullPath = join(modulePath, file as string);
      if (existsSync(fullPath)) {
        const imports = extractImportsFromFile(fullPath, moduleName);
        allImports.push(...imports);
      }
    }
  }

  return allImports;
}

function validateSchemaOwnershipBoundaries(schemas: DiscoveredSchema[]): SchemaBoundaryViolation[] {
  const violations: SchemaBoundaryViolation[] = [];

  for (const schema of schemas) {
    const ownership = getSchemaOwnership(schema.module);

    if (!ownership) {
      violations.push({
        type: 'missing_declaration',
        file: schema.file,
        module: schema.module,
        schema: schema.schemaName,
        message: `Module '${schema.module}' has no schema ownership manifest entry`,
      });
      continue;
    }

    if (!isSchemaOwnedByModule(schema.module, schema.schemaName)) {
      const owner = getSchemaOwner(schema.schemaName);
      violations.push({
        type: 'foreign_namespace',
        file: schema.file,
        module: schema.module,
        schema: schema.schemaName,
        message: `Module '${schema.module}' declares schema '${schema.schemaName}' which belongs to '${owner || 'unknown'}'`,
      });
    }
  }

  return violations;
}

function validateDuplicateSchemas(schemas: DiscoveredSchema[]): SchemaBoundaryViolation[] {
  const violations: SchemaBoundaryViolation[] = [];
  const schemaKeyToModules = new Map<string, string[]>();

  for (const schema of schemas) {
    const existing = schemaKeyToModules.get(schema.schemaName) || [];
    if (!existing.includes(schema.module)) {
      existing.push(schema.module);
    }
    schemaKeyToModules.set(schema.schemaName, existing);
  }

  for (const [schemaName, modules] of schemaKeyToModules) {
    if (modules.length > 1) {
      violations.push({
        type: 'duplicate_schema',
        file: 'multiple',
        module: modules.join(', '),
        schema: schemaName,
        message: `Schema '${schemaName}' is declared by multiple modules: ${modules.join(', ')}`,
      });
    }
  }

  return violations;
}

function validateSharedSourceImports(imports: DiscoveredImport[]): SchemaBoundaryViolation[] {
  const violations: SchemaBoundaryViolation[] = [];

  for (const imp of imports) {
    if (!imp.source.startsWith('@the-dmz/shared')) {
      continue;
    }

    const allowedSources = ['@the-dmz/shared/schemas', '@the-dmz/shared/contracts'];

    const isFromAllowedSource = allowedSources.some((s) => imp.source.startsWith(s));

    if (!isFromAllowedSource) {
      const ownership = getSchemaOwnership(imp.module);
      if (ownership && !isSharedSourceAllowed(imp.module, imp.source)) {
        violations.push({
          type: 'unauthorized_import',
          file: imp.file,
          module: imp.module,
          message: `Module '${imp.module}' imports from unauthorized source '${imp.source}'. Allowed: ${ownership.sharedSources.join(', ')}`,
        });
      }
    }

    if (imp.source.includes('/src/') || imp.source.includes('/internal/')) {
      violations.push({
        type: 'unauthorized_import',
        file: imp.file,
        module: imp.module,
        message: `Module '${imp.module}' has deep/internal import from '${imp.source}'. Use public exports only.`,
      });
    }
  }

  return violations;
}

function printViolations(violations: SchemaBoundaryViolation[]): void {
  const byType: Record<string, SchemaBoundaryViolation[]> = {};
  for (const v of violations) {
    if (!byType[v.type]) {
      byType[v.type] = [];
    }
    byType[v.type]!.push(v);
  }

  for (const [type, typeViolations] of Object.entries(byType)) {
    console.log(`\n[${type.toUpperCase().replace(/_/g, ' ')}]`);
    for (const v of typeViolations) {
      const location = v.file !== 'multiple' ? ` (${v.file})` : '';
      console.log(`  ❌ ${v.message}${location}`);
    }
  }
}

async function runValidation(): Promise<void> {
  console.log('Running Schema Boundary Validation...\n');
  console.log('='.repeat(50));

  const allViolations: SchemaBoundaryViolation[] = [];

  console.log('\n[1/5] Discovering schemas from route files...');
  const schemas = discoverSchemas();
  console.log(`  Found ${schemas.length} schema(s) in ${MODULE_DIRS.length} modules`);

  if (schemas.length === 0) {
    console.log('\n❌ ERROR: No schemas discovered. Aborting.');
    process.exit(1);
  }

  console.log('\n[2/5] Discovering imports from module files...');
  const imports = discoverImports();
  const sharedImports = imports.filter((i) => i.source.startsWith('@the-dmz/shared'));
  console.log(`  Found ${imports.length} import(s), ${sharedImports.length} from @the-dmz/shared`);

  console.log('\n[3/5] Validating schema namespace boundaries...');
  const ownershipViolations = validateSchemaOwnershipBoundaries(schemas);
  allViolations.push(...ownershipViolations);
  if (ownershipViolations.length > 0) {
    console.log(`  ❌ ${ownershipViolations.length} ownership violation(s)`);
  } else {
    console.log('  ✅ All schemas comply with module ownership boundaries');
  }

  console.log('\n[4/5] Checking for duplicate schemas...');
  const duplicateViolations = validateDuplicateSchemas(schemas);
  allViolations.push(...duplicateViolations);
  if (duplicateViolations.length > 0) {
    console.log(`  ❌ ${duplicateViolations.length} duplicate(s)`);
  } else {
    console.log('  ✅ No duplicate schemas detected');
  }

  console.log('\n[5/5] Checking shared source imports...');
  const importViolations = validateSharedSourceImports(imports);
  allViolations.push(...importViolations);
  if (importViolations.length > 0) {
    console.log(`  ❌ ${importViolations.length} unauthorized import(s)`);
  } else {
    console.log('  ✅ All imports comply with shared source policy');
  }

  console.log('\n' + '='.repeat(50));

  if (allViolations.length > 0) {
    console.error(`\n❌ FAILED: ${allViolations.length} violation(s) found\n`);
    printViolations(allViolations);
    console.log('\nTo fix: Update the schema ownership manifest or schema definitions');
    process.exit(1);
  } else {
    console.log('\n✅ PASSED: All schema boundary checks passed');
    console.log(`\nOwnership manifest contains:`);
    for (const entry of SCHEMA_OWNERSHIP_MANIFEST.ownership) {
      console.log(
        `  - ${entry.module}: ${entry.ownedSchemas.length} schemas, ${entry.sharedSources.length} allowed sources`,
      );
    }
    process.exit(0);
  }
}

runValidation().catch((err) => {
  console.error('Schema boundary validation failed:', err);
  process.exit(1);
});
