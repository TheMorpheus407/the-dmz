import * as fs from 'fs';
import * as path from 'path';

import {
  OWNERSHIP_MANIFEST,
  isAccessAllowed,
  type BoundaryViolation,
} from '../src/db/ownership/index.js';

interface FileAnalysis {
  filePath: string;
  moduleName: string | null;
  imports: string[];
}

function getModuleFromFilePath(filePath: string): string | null {
  const relativePath = path.relative(process.cwd(), filePath);

  if (!relativePath.startsWith('src/modules/')) {
    return null;
  }

  const parts = relativePath.split(path.sep);
  if (parts.length >= 3 && parts[1] === 'modules' && parts[2] !== 'shared' && parts[2]) {
    return parts[2];
  }

  return null;
}

function extractTableImports(content: string): string[] {
  const imports: string[] = [];

  const importRegex = /import\s+.*\s+from\s+['"](.*?)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (
      importPath &&
      (importPath.includes('/db/schema/') || importPath.includes('/shared/database/schema/'))
    ) {
      imports.push(importPath);
    }
  }

  return imports;
}

const SCHEMA_DIRECTORY_MAP: Record<string, string> = {
  auth: 'auth',
  game: 'public',
};

function normalizeTableName(tableName: string): string {
  return tableName.replace(/-/g, '_');
}

function parseTableFromImport(importPath: string): { schema: string; table: string } | null {
  const match = importPath.match(/(?:db|shared\/database)\/schema\/(.+?)\/(.+?)(?:\.js|\.ts|$)/);
  if (match && match[1] && match[2]) {
    const dirName = match[1];
    const tableName = normalizeTableName(match[2]);
    const schema = SCHEMA_DIRECTORY_MAP[dirName] || dirName;
    return { schema, table: tableName };
  }

  const sharedMatch = importPath.match(/shared\/database\/schema\/(.+?)(?:\.js|\.ts|$)/);
  if (sharedMatch && sharedMatch[1]) {
    const tableOrFile = normalizeTableName(sharedMatch[1]);
    if (!tableOrFile.includes('/')) {
      return { schema: 'public', table: tableOrFile };
    }
  }

  return null;
}

function detectRawSqlReferences(content: string): Array<{ line: number; schema: string }> {
  const references: Array<{ line: number; schema: string }> = [];
  const lines = content.split('\n');

  const foreignSchemaRegex = /(?:sql|from|into|to)\s+['"`]?(\w+)['"`]?\.(\w+)/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let match;
    while ((match = foreignSchemaRegex.exec(line)) !== null) {
      const schema = match[1];

      if (schema && schema !== 'public' && schema !== 'pg_catalog') {
        references.push({ line: i + 1, schema });
      }
    }
  }

  return references;
}

function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const moduleName = getModuleFromFilePath(filePath);
  const imports = extractTableImports(content);

  return {
    filePath,
    moduleName,
    imports,
  };
}

function validateBoundaries(): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  const srcDir = path.join(process.cwd(), 'src');
  const moduleDirs = ['modules', 'shared'];

  for (const dir of moduleDirs) {
    const fullDir = path.join(srcDir, dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = getTypeScriptFiles(fullDir);

    for (const file of files) {
      const analysis = analyzeFile(file);

      if (!analysis.moduleName) {
        continue;
      }

      for (const importPath of analysis.imports) {
        const tableInfo = parseTableFromImport(importPath);
        if (tableInfo && !isAccessAllowed(analysis.moduleName, tableInfo.schema, tableInfo.table)) {
          const tableName = `${tableInfo.schema}.${tableInfo.table}`;
          const ownedBy = OWNERSHIP_MANIFEST.ownership.find(
            (o) => o.schema === tableInfo.schema && o.table === tableInfo.table,
          );

          violations.push({
            type: 'unauthorized_access',
            file: path.relative(process.cwd(), file),
            module: analysis.moduleName,
            table: tableName,
            schema: tableInfo.schema,
            message: `Module '${analysis.moduleName}' accesses table '${tableName}' owned by '${ownedBy?.module || 'unknown'}'`,
          });
        }
      }

      const content = fs.readFileSync(file, 'utf-8');
      const rawSqlRefs = detectRawSqlReferences(content);
      for (const ref of rawSqlRefs) {
        const ownership = OWNERSHIP_MANIFEST.ownership.filter((o) => o.schema === ref.schema);
        if (
          ownership.length > 0 &&
          ownership[0] &&
          analysis.moduleName &&
          !isAccessAllowed(analysis.moduleName, ref.schema, ownership[0].table)
        ) {
          violations.push({
            type: 'raw_sql_foreign_schema',
            file: path.relative(process.cwd(), file),
            line: ref.line,
            module: analysis.moduleName,
            table: ownership[0].table,
            schema: ref.schema,
            message: `Module '${analysis.moduleName}' references foreign schema '${ref.schema}' which is owned by '${ownership[0].module}'`,
          });
        }
      }
    }
  }

  return violations;
}

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'coverage' ||
        entry.name === '__tests__'
      ) {
        continue;
      }
      files.push(...getTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  console.log('Validating database access boundaries...\n');

  const violations = validateBoundaries();

  if (violations.length > 0) {
    console.log('ERROR: Database boundary violations detected:\n');
    for (const v of violations) {
      const location = v.line ? `${v.file}:${v.line}` : v.file;
      console.log(`  [${v.type}] ${location}`);
      console.log(`    Module: ${v.module}, Table: ${v.schema}.${v.table}`);
      console.log(`    ${v.message}\n`);
    }
    console.log(`Total violations: ${violations.length}`);
    process.exit(1);
  }

  console.log('Database boundary validation: PASSED\n');
  console.log(`Ownership manifest contains:`);
  console.log(`  - ${OWNERSHIP_MANIFEST.ownership.length} owned tables`);
  console.log(`  - ${OWNERSHIP_MANIFEST.sharedTables.length} shared tables`);
  console.log(`  - ${OWNERSHIP_MANIFEST.exceptions.length} exceptions`);

  process.exit(0);
}

main();
