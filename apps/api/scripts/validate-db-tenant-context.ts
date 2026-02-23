import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ALLOWED_PATHS = [
  'src/shared/database/tenant-context/',
  'src/shared/middleware/tenant-context.ts',
];

const isAllowedPath = (filePath: string): boolean => {
  return ALLOWED_PATHS.some((allowed) => filePath.includes(allowed));
};

interface LintViolation {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  pattern: string;
}

const TENANT_CONTEXT_PATTERNS = {
  forbidden: [
    {
      pattern: /SET\s+LOCAL\s+app\.\w+\s*=/gi,
      message: 'Direct SET LOCAL for tenant context is forbidden. Use tenant-context wrapper.',
    },
    {
      pattern: /SET\s+app\.\w+\s*=/gi,
      message: 'Direct SET for tenant context is forbidden. Use tenant-context wrapper.',
    },
    {
      pattern: /pool\.unsafe\s*\(\s*`SET\s+LOCAL/gi,
      message: 'Raw SQL SET for tenant context is forbidden. Use tenant-context wrapper.',
    },
    {
      pattern: /sql`SET\s+LOCAL/gi,
      message: 'Template literal SET for tenant context is forbidden. Use tenant-context wrapper.',
    },
  ],
  required: [
    {
      pattern: /import\s+.*from\s+['"].*tenant-context.*['"]/g,
      message: 'Tenant-scoped DB access should use tenant-context wrapper',
    },
  ],
};

function lintFile(filePath: string): LintViolation[] {
  if (isAllowedPath(filePath)) {
    return [];
  }

  const violations: LintViolation[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      for (const forbidden of TENANT_CONTEXT_PATTERNS.forbidden) {
        const match = line.match(forbidden.pattern);
        if (match) {
          violations.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf(match[0]) + 1,
            severity: 'error',
            message: forbidden.message,
            pattern: match[0],
          });
        }
      }
    });

    const isTestFile = filePath.includes('.test.') || filePath.includes('.spec.');
    if (!isTestFile) {
      const hasTenantOps = lines.some((line) => {
        const lowerLine = line.toLowerCase();
        return (
          (lowerLine.includes('db.insert') ||
            lowerLine.includes('db.update') ||
            lowerLine.includes('db.delete') ||
            lowerLine.includes('db.query')) &&
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('*')
        );
      });

      if (hasTenantOps) {
        const hasWrapper = lines.some((line) => {
          return (
            line.includes('tenant-context') ||
            line.includes('runWithTenantContext') ||
            line.includes('TenantScopedConnection')
          );
        });

        if (!hasWrapper) {
          const dbUsage = lines.findIndex((line) => {
            const lower = line.toLowerCase();
            return (
              (lower.includes('db.insert') ||
                lower.includes('db.update') ||
                lower.includes('db.delete') ||
                lower.includes('db.query')) &&
              !line.trim().startsWith('//') &&
              !line.trim().startsWith('*') &&
              !line.trim().startsWith('*')
            );
          });

          if (dbUsage !== -1) {
            violations.push({
              file: filePath,
              line: dbUsage + 1,
              column: 1,
              severity: 'warning',
              message:
                'Tenant-scoped DB operations detected but no tenant-context wrapper import found. Consider using runWithTenantContext or TenantScopedConnection.',
              pattern: 'db operation',
            });
          }
        }
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return violations;
}

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === '.git') {
        continue;
      }
      findTypeScriptFiles(fullPath, files);
    } else if (extname(entry) === '.ts' && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function runLint(args: string[]): void {
  const srcDir = args[0] || 'src';
  const violations: LintViolation[] = [];

  console.log(`Scanning ${srcDir} for tenant-context violations...`);

  const files = findTypeScriptFiles(srcDir);

  console.log(`Found ${files.length} TypeScript files to scan.`);

  for (const file of files) {
    const fileViolations = lintFile(file);
    violations.push(...fileViolations);
  }

  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');

  console.log(`\nResults:`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const error of errors) {
      console.log(`  ${error.file}:${error.line}:${error.column} - ${error.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\nWarnings:`);
    for (const warning of warnings) {
      console.log(`  ${warning.file}:${warning.line}:${warning.column} - ${warning.message}`);
    }
  }

  if (errors.length > 0 || warnings.length > 0) {
    console.log(`\nLint complete.`);
    process.exit(errors.length > 0 ? 1 : 0);
  } else {
    console.log(`\nNo violations found.`);
    process.exit(0);
  }
}

const args = process.argv.slice(2);
runLint(args);
