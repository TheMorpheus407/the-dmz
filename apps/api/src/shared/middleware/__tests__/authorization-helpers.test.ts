import { describe, expect, it } from 'vitest';

import {
  isRoleAssignmentValid,
  extractRoleIds,
  extractRoleNames,
  buildPermissionKeys,
  validateRoleAssignments,
  assertValidRoleAssignments,
} from '../authorization.js';
import { insufficientPermissions } from '../error-handler.js';

describe('authorization helpers', () => {
  describe('validateRoleAssignments', () => {
    it('returns all valid when no expiration or scope issues', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const userRoleRecords = [
        { roleId: 'role-1', roleName: 'Admin', expiresAt: futureDate, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: futureDate, scope: null },
      ];
      const result = validateRoleAssignments(userRoleRecords);
      expect(result.validRoleAssignments).toHaveLength(2);
      expect(result.hasExpiredAssignment).toBe(false);
      expect(result.hasScopeMismatchAssignment).toBe(false);
    });

    it('sets hasExpiredAssignment true when roles are expired', () => {
      const pastDate = new Date(Date.now() - 86400000);
      const userRoleRecords = [
        { roleId: 'role-1', roleName: 'Admin', expiresAt: pastDate, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: pastDate, scope: null },
      ];
      const result = validateRoleAssignments(userRoleRecords);
      expect(result.validRoleAssignments).toHaveLength(0);
      expect(result.hasExpiredAssignment).toBe(true);
      expect(result.hasScopeMismatchAssignment).toBe(false);
    });

    it('does not flag scope mismatch when no required scope provided', () => {
      const userRoleRecords = [
        { roleId: 'role-1', roleName: 'Admin', expiresAt: null, scope: 'game:play' },
      ];
      const result = validateRoleAssignments(userRoleRecords);
      expect(result.validRoleAssignments).toHaveLength(1);
      expect(result.hasExpiredAssignment).toBe(false);
      expect(result.hasScopeMismatchAssignment).toBe(false);
    });

    it('mixes valid and invalid roles for expiration', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const pastDate = new Date(Date.now() - 86400000);
      const userRoleRecords = [
        { roleId: 'role-1', roleName: 'Admin', expiresAt: futureDate, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: pastDate, scope: null },
        { roleId: 'role-3', roleName: 'Game', expiresAt: futureDate, scope: null },
      ];
      const result = validateRoleAssignments(userRoleRecords);
      expect(result.validRoleAssignments).toHaveLength(2);
      expect(result.hasExpiredAssignment).toBe(true);
      expect(result.hasScopeMismatchAssignment).toBe(false);
    });
  });

  describe('assertValidRoleAssignments', () => {
    it('does not throw when valid role assignments exist', () => {
      const validated = {
        validRoleAssignments: [
          { roleId: 'role-1', roleName: 'Admin', expiresAt: null, scope: null },
        ],
        hasExpiredAssignment: false,
        hasScopeMismatchAssignment: false,
      };
      expect(() => assertValidRoleAssignments(validated, 1)).not.toThrow();
    });

    it('throws "Role assignment has expired" when expired and no valid assignments', () => {
      const validated = {
        validRoleAssignments: [],
        hasExpiredAssignment: true,
        hasScopeMismatchAssignment: false,
      };
      expect(() => assertValidRoleAssignments(validated, 1)).toThrow('Role assignment has expired');
    });

    it('throws "Role assignment scope does not match" when scope mismatch and no valid assignments', () => {
      const validated = {
        validRoleAssignments: [],
        hasExpiredAssignment: false,
        hasScopeMismatchAssignment: true,
      };
      expect(() => assertValidRoleAssignments(validated, 1)).toThrow(
        'Role assignment scope does not match',
      );
    });

    it('throws "No valid role assignments found" when no valid and no flags set', () => {
      const validated = {
        validRoleAssignments: [],
        hasExpiredAssignment: false,
        hasScopeMismatchAssignment: false,
      };
      expect(() => assertValidRoleAssignments(validated, 1)).toThrow(
        'No valid role assignments found',
      );
    });

    it('does not throw when no records exist at all', () => {
      const validated = {
        validRoleAssignments: [],
        hasExpiredAssignment: false,
        hasScopeMismatchAssignment: false,
      };
      expect(() => assertValidRoleAssignments(validated, 0)).not.toThrow();
    });
  });

  describe('isRoleAssignmentValid', () => {
    it('returns valid for non-expired assignment without scope requirement', () => {
      const futureDate = new Date(Date.now() + 86400000);
      const result = isRoleAssignmentValid({
        expiresAt: futureDate,
        scope: null,
      });
      expect(result.isValid).toBe(true);
    });

    it('returns invalid with reason expired for past expiration', () => {
      const pastDate = new Date(Date.now() - 86400000);
      const result = isRoleAssignmentValid({
        expiresAt: pastDate,
        scope: null,
      });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('returns invalid with reason expired for current moment', () => {
      const now = new Date();
      const result = isRoleAssignmentValid({
        expiresAt: now,
        scope: null,
      });
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('returns valid when scope matches required scope', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: 'game:play' }, 'game:play');
      expect(result.isValid).toBe(true);
    });

    it('returns invalid with reason scope_mismatch when scope does not match', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: 'game:play' }, 'admin:manage');
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('scope_mismatch');
    });

    it('returns valid when assignment scope is null and required scope is specified', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: null }, 'admin:manage');
      expect(result.isValid).toBe(true);
    });

    it('returns valid when required scope is undefined', () => {
      const result = isRoleAssignmentValid({ expiresAt: null, scope: 'game:play' }, undefined);
      expect(result.isValid).toBe(true);
    });
  });

  describe('extractRoleIds', () => {
    it('extracts role IDs from valid assignments', () => {
      const assignments = [
        { roleId: 'role-1', roleName: 'Admin', expiresAt: null, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: null, scope: null },
      ];
      const result = extractRoleIds(assignments);
      expect(result).toEqual(['role-1', 'role-2']);
    });

    it('filters out falsy role IDs', () => {
      const assignments = [
        { roleId: '', roleName: 'Admin', expiresAt: null, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: null, scope: null },
      ];
      const result = extractRoleIds(assignments);
      expect(result).toEqual(['role-2']);
    });

    it('returns empty array for empty input', () => {
      const result = extractRoleIds([]);
      expect(result).toEqual([]);
    });
  });

  describe('extractRoleNames', () => {
    it('extracts role names from valid assignments', () => {
      const assignments = [
        { roleId: 'role-1', roleName: 'Admin', expiresAt: null, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: null, scope: null },
      ];
      const result = extractRoleNames(assignments);
      expect(result).toEqual(['Admin', 'User']);
    });

    it('filters out null role names', () => {
      const assignments = [
        { roleId: 'role-1', roleName: null, expiresAt: null, scope: null },
        { roleId: 'role-2', roleName: 'User', expiresAt: null, scope: null },
      ];
      const result = extractRoleNames(assignments);
      expect(result).toEqual(['User']);
    });

    it('returns empty array for empty input', () => {
      const result = extractRoleNames([]);
      expect(result).toEqual([]);
    });
  });

  describe('buildPermissionKeys', () => {
    it('builds permission keys from permission IDs and records', () => {
      const permissionIds = ['perm-1', 'perm-2'];
      const permMap = new Map([
        ['perm-1', { id: 'perm-1', resource: 'game', action: 'play' }],
        ['perm-2', { id: 'perm-2', resource: 'admin', action: 'manage' }],
      ]);
      const result = buildPermissionKeys(permissionIds, permMap);
      expect(result).toEqual(['game:play', 'admin:manage']);
    });

    it('filters out missing permission records', () => {
      const permissionIds = ['perm-1', 'perm-missing'];
      const permMap = new Map([['perm-1', { id: 'perm-1', resource: 'game', action: 'play' }]]);
      const result = buildPermissionKeys(permissionIds, permMap);
      expect(result).toEqual(['game:play']);
    });

    it('returns empty array for empty input', () => {
      const permMap = new Map([['perm-1', { id: 'perm-1', resource: 'game', action: 'play' }]]);
      const result = buildPermissionKeys([], permMap);
      expect(result).toEqual([]);
    });
  });
});
