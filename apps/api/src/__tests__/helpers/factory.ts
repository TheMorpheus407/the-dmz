import { randomUUID } from 'node:crypto';

export type TestTenant = {
  id: string;
  name: string;
  slug: string;
};

export const buildTestTenant = (overrides: Partial<TestTenant> = {}): TestTenant => {
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? 'Test Tenant',
    slug: overrides.slug ?? 'test-tenant',
  };
};
