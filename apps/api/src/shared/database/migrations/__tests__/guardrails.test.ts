import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GLOBAL_TABLES, TENANT_SCOPED_TABLES } from '../../schema/tenant-policy.js';

const MIGRATIONS_DIR = join(import.meta.dirname ?? '', '..');

interface MigrationFile {
  name: string;
  content: string;
}

function getMigrationFiles(): MigrationFile[] {
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  return migrations.map((name) => ({
    name,
    content: readFileSync(join(MIGRATIONS_DIR, name), 'utf8'),
  }));
}

function extractTableCreate(content: string, schema: string, table: string): string {
  const schemaPrefix = `(?:["']?${schema}["']?\\.)?`;
  const regex = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${schemaPrefix}["']?${table}["']?\\s*\\([\\s\\S]*?\\)\\s*;`,
    'i',
  );
  const match = content.match(regex);
  return match ? match[0] : '';
}

function extractForeignKeys(content: string, schema: string, table: string): string {
  const schemaPrefix = `(?:["']?${schema}["']?\\.)?`;
  const regex = new RegExp(
    `ALTER\\s+TABLE\\s+${schemaPrefix}["']?${table}["']?\\s+[\\s\\S]*?ADD\\s+CONSTRAINT[\\s\\S]*?;`,
    'gi',
  );
  const matches = content.match(regex);
  return matches ? matches.join(' ') : '';
}

function extractPolicies(content: string, schema: string, table: string): string {
  const schemaPrefix = `(?:["']?${schema}["']?\\.)?`;
  const policyNameVariants = [`tenant_isolation_${table}`, `tenant_isolation_${schema}_${table}`];
  const policyNameRegex = policyNameVariants.map((n) => `["']?${n}["']?`).join('|');
  const directRegex = new RegExp(
    `CREATE\\s+POLICY\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:${policyNameRegex})\\s+ON\\s+${schemaPrefix}["']?${table}["']?[^;]+;`,
    'gi',
  );
  const doBlockRegex = new RegExp(`DO\\s+\\$\\$[\\s\\S]*?END\\s+\\$\\$`, 'gi');

  const directMatches = content.match(directRegex) ?? [];

  const doBlockMatches = content.match(doBlockRegex) ?? [];
  const policyInDoBlocks = doBlockMatches
    .map((block) => {
      const match = block.match(
        new RegExp(
          `CREATE\\s+POLICY\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:${policyNameRegex})\\s+ON\\s+${schemaPrefix}["']?${table}["']?[^;]+;`,
          'i',
        ),
      );
      return match ? match[0] : '';
    })
    .filter((p) => p.length > 0);

  return [...directMatches, ...policyInDoBlocks].join(' ');
}

describe('Migration Guardrails: Tenant Schema Invariants', () => {
  const migrations = getMigrationFiles();
  const allMigrationContent = migrations.map((m) => m.content).join('\n');

  describe('TENANT_SCOPED_TABLES must have NOT NULL tenant_id', () => {
    for (const table of TENANT_SCOPED_TABLES) {
      if (!table.hasNotNullTenantId) continue;

      it(`${table.schema}.${table.table} should have NOT NULL tenant_id`, () => {
        const tableCreate = extractTableCreate(allMigrationContent, table.schema, table.table);

        expect(tableCreate).toContain('tenant_id');
        expect(tableCreate).toMatch(/["']?tenant_id["']?\s+uuid\s+[^,]*NOT\s+NULL/i);
      });
    }
  });

  describe('TENANT_SCOPED_TABLES must have FK to public.tenants', () => {
    for (const table of TENANT_SCOPED_TABLES) {
      if (!table.hasTenantFk) continue;

      it(`${table.schema}.${table.table} should have FK to public.tenants`, () => {
        const fkConstraint = extractForeignKeys(allMigrationContent, table.schema, table.table);

        expect(fkConstraint).toContain('tenants');
      });
    }
  });

  describe('TENANT_SCOPED_TABLES with RLS must have RLS enabled and forced', () => {
    for (const table of TENANT_SCOPED_TABLES) {
      if (!table.hasRls) continue;

      it(`${table.schema}.${table.table} should have ENABLE ROW LEVEL SECURITY`, () => {
        const enableRls = migrations.some((m) =>
          m.content.match(
            new RegExp(
              `ALTER\\s+TABLE\\s+["']?${table.schema}["']?\\.["']?${table.table}["']?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
              'i',
            ),
          ),
        );

        expect(enableRls).toBe(true);
      });

      it(`${table.schema}.${table.table} should have FORCE ROW LEVEL SECURITY`, () => {
        const forceRls = migrations.some((m) =>
          m.content.match(
            new RegExp(
              `ALTER\\s+TABLE\\s+["']?${table.schema}["']?\\.["']?${table.table}["']?\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`,
              'i',
            ),
          ),
        );

        expect(forceRls).toBe(true);
      });
    }
  });

  describe('TENANT_SCOPED_TABLES with RLS must have tenant isolation policy', () => {
    for (const table of TENANT_SCOPED_TABLES) {
      if (!table.hasRls) continue;

      it(`${table.schema}.${table.table} should have tenant_isolation policy`, () => {
        const policy = extractPolicies(allMigrationContent, table.schema, table.table);

        expect(policy).toContain('tenant_isolation');
      });
    }
  });

  describe('GLOBAL_TABLES must NOT have tenant_id column', () => {
    for (const table of GLOBAL_TABLES) {
      it(`${table.schema}.${table.table} should NOT have tenant_id`, () => {
        const tableCreate = extractTableCreate(allMigrationContent, table.schema, table.table);

        expect(tableCreate).not.toMatch(/["']?tenant_id["']?\s+uuid/i);
      });
    }
  });

  describe('Composite foreign keys must be properly defined', () => {
    for (const table of TENANT_SCOPED_TABLES) {
      const tableWithCompositeFk = table as typeof table & {
        compositeForeignKeys: Array<{ columns: string[]; references: string[] }>;
      };
      if (!tableWithCompositeFk.compositeForeignKeys) continue;

      for (const fk of tableWithCompositeFk.compositeForeignKeys) {
        it(`${table.schema}.${table.table} should have composite FK to ${fk.references.join(', ')}`, () => {
          const fkConstraint = extractForeignKeys(allMigrationContent, table.schema, table.table);

          expect(fkConstraint).toContain(fk.columns[0]);
          expect(fkConstraint).toContain(fk.references[0].split('.')[1]);
        });
      }
    }
  });

  describe('RLS policies must use current_tenant_id() function', () => {
    for (const table of TENANT_SCOPED_TABLES) {
      if (!table.hasRls) continue;

      it(`${table.schema}.${table.table} RLS policy should use current_tenant_id()`, () => {
        const policies = extractPolicies(allMigrationContent, table.schema, table.table);

        expect(policies.toLowerCase()).toContain('current_tenant_id');
      });
    }
  });
});
