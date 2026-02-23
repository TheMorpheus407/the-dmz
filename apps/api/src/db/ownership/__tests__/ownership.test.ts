import { describe, expect, it } from 'vitest';

import {
  OWNERSHIP_MANIFEST,
  getModuleOwnedTables,
  getSharedTables,
  isTableShared,
  isAccessAllowed,
} from '../manifest.js';

describe('OWNERSHIP_MANIFEST', () => {
  it('should have ownership entries for all known tables', () => {
    expect(OWNERSHIP_MANIFEST.ownership.length).toBeGreaterThan(0);
  });

  it('should define shared tables', () => {
    expect(OWNERSHIP_MANIFEST.sharedTables).toContain('users');
    expect(OWNERSHIP_MANIFEST.sharedTables).toContain('tenants');
  });

  it('should have exceptions for cross-module access', () => {
    expect(OWNERSHIP_MANIFEST.exceptions.length).toBeGreaterThan(0);
  });
});

describe('getModuleOwnedTables', () => {
  it('should return tables owned by auth module', () => {
    const authTables = getModuleOwnedTables('auth');
    expect(authTables).toContainEqual({ schema: 'auth', table: 'permissions' });
    expect(authTables).toContainEqual({ schema: 'auth', table: 'sessions' });
  });

  it('should return tables owned by game module', () => {
    const gameTables = getModuleOwnedTables('game');
    expect(gameTables).toContainEqual({ schema: 'public', table: 'game_sessions' });
  });

  it('should return empty array for unknown module', () => {
    const unknownTables = getModuleOwnedTables('unknown');
    expect(unknownTables).toHaveLength(0);
  });
});

describe('getSharedTables', () => {
  it('should return list of shared tables', () => {
    const shared = getSharedTables();
    expect(shared).toContain('users');
    expect(shared).toContain('tenants');
  });
});

describe('isTableShared', () => {
  it('should identify shared tables', () => {
    expect(isTableShared('public', 'users')).toBe(true);
    expect(isTableShared('public', 'tenants')).toBe(true);
  });

  it('should return false for module-owned tables', () => {
    expect(isTableShared('auth', 'sessions')).toBe(false);
    expect(isTableShared('public', 'game_sessions')).toBe(false);
  });
});

describe('isAccessAllowed', () => {
  it('should allow module to access its own tables', () => {
    expect(isAccessAllowed('auth', 'auth', 'sessions')).toBe(true);
    expect(isAccessAllowed('game', 'public', 'game_sessions')).toBe(true);
  });

  it('should allow access to shared tables via exception', () => {
    expect(isAccessAllowed('auth', 'public', 'users')).toBe(true);
    expect(isAccessAllowed('game', 'public', 'users')).toBe(true);
    expect(isAccessAllowed('auth', 'public', 'tenants')).toBe(true);
    expect(isAccessAllowed('game', 'public', 'tenants')).toBe(true);
  });

  it('should deny access to tables owned by other modules', () => {
    expect(isAccessAllowed('game', 'auth', 'sessions')).toBe(false);
    expect(isAccessAllowed('auth', 'public', 'game_sessions')).toBe(false);
  });

  it('should allow access to unknown tables (legacy/new tables)', () => {
    expect(isAccessAllowed('auth', 'public', 'unknown_table')).toBe(true);
  });
});
