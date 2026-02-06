import { describe, expect, it } from 'vitest';

import { SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('SEED_TENANT_IDS', () => {
  it('contains exactly 4 tenants', () => {
    expect(Object.keys(SEED_TENANT_IDS)).toHaveLength(4);
  });

  it('has valid UUID format for all IDs', () => {
    for (const [key, id] of Object.entries(SEED_TENANT_IDS)) {
      expect(id, `${key} should be valid UUID`).toMatch(UUID_REGEX);
    }
  });

  it('system tenant UUID matches the initial migration', () => {
    expect(SEED_TENANT_IDS.system).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('has unique IDs for each tenant', () => {
    const ids = Object.values(SEED_TENANT_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains expected tenant keys', () => {
    expect(SEED_TENANT_IDS).toHaveProperty('system');
    expect(SEED_TENANT_IDS).toHaveProperty('acmeCorp');
    expect(SEED_TENANT_IDS).toHaveProperty('consumerPlatform');
    expect(SEED_TENANT_IDS).toHaveProperty('inactiveCo');
  });

  it('returns consistent values across calls (deterministic)', () => {
    const first = { ...SEED_TENANT_IDS };
    const second = { ...SEED_TENANT_IDS };
    expect(first).toEqual(second);
  });
});

describe('SEED_USER_IDS', () => {
  it('contains user IDs for 3 non-system tenants', () => {
    expect(Object.keys(SEED_USER_IDS)).toHaveLength(3);
    expect(SEED_USER_IDS).toHaveProperty('acmeCorp');
    expect(SEED_USER_IDS).toHaveProperty('consumerPlatform');
    expect(SEED_USER_IDS).toHaveProperty('inactiveCo');
  });

  it('has 4 roles per tenant', () => {
    for (const [tenantKey, users] of Object.entries(SEED_USER_IDS)) {
      const roles = Object.keys(users);
      expect(roles, `${tenantKey} should have 4 roles`).toHaveLength(4);
      expect(roles).toContain('superAdmin');
      expect(roles).toContain('tenantAdmin');
      expect(roles).toContain('manager');
      expect(roles).toContain('learner');
    }
  });

  it('has valid UUID format for all user IDs', () => {
    for (const [tenantKey, users] of Object.entries(SEED_USER_IDS)) {
      for (const [roleKey, id] of Object.entries(users)) {
        expect(id, `${tenantKey}.${roleKey} should be valid UUID`).toMatch(UUID_REGEX);
      }
    }
  });

  it('has globally unique IDs across all tenants', () => {
    const allIds: string[] = [];

    for (const users of Object.values(SEED_USER_IDS)) {
      allIds.push(...Object.values(users));
    }

    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
