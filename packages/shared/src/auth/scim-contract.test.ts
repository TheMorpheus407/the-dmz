import { describe, expect, it } from 'vitest';

import {
  SCIMLifecycleOutcome,
  SCIMGroupLifecycleOutcome,
  SCIMConflictOutcome,
  SCIMConflictResolutionPolicy,
  SCIMIdentityKeyType,
  SCIM_CORE_ATTRIBUTES,
  SCIM_ADMIN_PROTECTED_FIELDS,
  SCIM_LIFECYCLE_CONTRACT_V1,
  scimLifecycleOutcomeSchema,
  scimGroupLifecycleOutcomeSchema,
  scimConflictOutcomeSchema,
  scimAttributeMappingSchema,
  scimIdentityKeySchema,
} from '../auth/scim-contract.js';

describe('SCIM Lifecycle Contract', () => {
  describe('User lifecycle outcomes', () => {
    it('validates all user lifecycle outcomes', () => {
      expect(scimLifecycleOutcomeSchema.safeParse(SCIMLifecycleOutcome.CREATED).success).toBe(true);
      expect(scimLifecycleOutcomeSchema.safeParse(SCIMLifecycleOutcome.UPDATED).success).toBe(true);
      expect(scimLifecycleOutcomeSchema.safeParse(SCIMLifecycleOutcome.DEACTIVATED).success).toBe(
        true,
      );
      expect(scimLifecycleOutcomeSchema.safeParse(SCIMLifecycleOutcome.REACTIVATED).success).toBe(
        true,
      );
      expect(scimLifecycleOutcomeSchema.safeParse(SCIMLifecycleOutcome.SOFT_DELETED).success).toBe(
        true,
      );
    });

    it('rejects invalid outcomes', () => {
      expect(scimLifecycleOutcomeSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('Group lifecycle outcomes', () => {
    it('validates all group lifecycle outcomes', () => {
      expect(
        scimGroupLifecycleOutcomeSchema.safeParse(SCIMGroupLifecycleOutcome.CREATED).success,
      ).toBe(true);
      expect(
        scimGroupLifecycleOutcomeSchema.safeParse(SCIMGroupLifecycleOutcome.UPDATED).success,
      ).toBe(true);
      expect(
        scimGroupLifecycleOutcomeSchema.safeParse(SCIMGroupLifecycleOutcome.DELETED).success,
      ).toBe(true);
      expect(
        scimGroupLifecycleOutcomeSchema.safeParse(SCIMGroupLifecycleOutcome.MEMBERSHIP_CHANGED)
          .success,
      ).toBe(true);
    });
  });

  describe('Conflict outcomes', () => {
    it('validates all conflict outcomes', () => {
      expect(scimConflictOutcomeSchema.safeParse(SCIMConflictOutcome.NONE).success).toBe(true);
      expect(
        scimConflictOutcomeSchema.safeParse(SCIMConflictOutcome.FIELD_OVERWRITTEN).success,
      ).toBe(true);
      expect(
        scimConflictOutcomeSchema.safeParse(SCIMConflictOutcome.DUPLICATE_PREVENTED).success,
      ).toBe(true);
      expect(scimConflictOutcomeSchema.safeParse(SCIMConflictOutcome.MERGED).success).toBe(true);
      expect(scimConflictOutcomeSchema.safeParse(SCIMConflictOutcome.SCIM_WINS).success).toBe(true);
      expect(scimConflictOutcomeSchema.safeParse(SCIMConflictOutcome.JIT_WINS).success).toBe(true);
    });
  });

  describe('Core attributes', () => {
    it('includes required core attributes', () => {
      const attrNames = SCIM_CORE_ATTRIBUTES.map((a) => a.scimAttribute);

      expect(attrNames).toContain('userName');
      expect(attrNames).toContain('displayName');
      expect(attrNames).toContain('emails');
      expect(attrNames).toContain('department');
      expect(attrNames).toContain('title');
      expect(attrNames).toContain('manager');
      expect(attrNames).toContain('active');
      expect(attrNames).toContain('groups');
    });

    it('marks userName as immutable', () => {
      const userNameAttr = SCIM_CORE_ATTRIBUTES.find((a) => a.scimAttribute === 'userName');
      expect(userNameAttr?.mutability).toBe('immutable');
    });

    it('marks groups as readOnly', () => {
      const groupsAttr = SCIM_CORE_ATTRIBUTES.find((a) => a.scimAttribute === 'groups');
      expect(groupsAttr?.mutability).toBe('readOnly');
    });

    it('marks core attributes correctly', () => {
      const coreAttrs = SCIM_CORE_ATTRIBUTES.filter((a) => a.isCore);
      expect(coreAttrs.length).toBeGreaterThan(0);
    });
  });

  describe('Admin protected fields', () => {
    it('includes role, tenantId, createdAt, updatedAt', () => {
      expect(SCIM_ADMIN_PROTECTED_FIELDS).toContain('role');
      expect(SCIM_ADMIN_PROTECTED_FIELDS).toContain('tenantId');
      expect(SCIM_ADMIN_PROTECTED_FIELDS).toContain('createdAt');
      expect(SCIM_ADMIN_PROTECTED_FIELDS).toContain('updatedAt');
    });
  });

  describe('Identity key', () => {
    it('accepts valid identity key schemas', () => {
      expect(
        scimIdentityKeySchema.safeParse({
          type: SCIMIdentityKeyType.EMAIL,
          value: 'test@example.com',
        }).success,
      ).toBe(true);

      expect(
        scimIdentityKeySchema.safeParse({
          type: SCIMIdentityKeyType.SUBJECT,
          value: 'subject123',
        }).success,
      ).toBe(true);

      expect(
        scimIdentityKeySchema.safeParse({
          type: SCIMIdentityKeyType.EXTERNAL_ID,
          value: 'ext123',
        }).success,
      ).toBe(true);
    });

    it('rejects invalid identity key type', () => {
      expect(
        scimIdentityKeySchema.safeParse({
          type: 'invalid',
          value: 'test@example.com',
        }).success,
      ).toBe(false);
    });
  });

  describe('Default contract', () => {
    it('has correct version format', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('uses SCIM priority conflict resolution by default', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.conflictResolutionPolicy).toBe(
        SCIMConflictResolutionPolicy.SCIM_PRIORITY,
      );
    });

    it('uses email as identity key', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.identityKeyType).toBe(SCIMIdentityKeyType.EMAIL);
    });

    it('enables soft delete by default', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.softDeleteOnDeprovision).toBe(true);
    });

    it('targets <60s sync latency', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.syncLatencyTargetMs).toBeLessThanOrEqual(60000);
    });

    it('does not allow group role assignment by default', () => {
      expect(SCIM_LIFECYCLE_CONTRACT_V1.allowGroupRoleAssignment).toBe(false);
    });
  });

  describe('Attribute mapping schema', () => {
    it('validates correct attribute mappings', () => {
      const validMapping = {
        scimAttribute: 'userName',
        platformAttribute: 'email',
        mutability: 'immutable',
        isCore: true,
      };

      expect(scimAttributeMappingSchema.safeParse(validMapping).success).toBe(true);
    });

    it('rejects invalid mutability', () => {
      const invalidMapping = {
        scimAttribute: 'userName',
        platformAttribute: 'email',
        mutability: 'invalid',
        isCore: true,
      };

      expect(scimAttributeMappingSchema.safeParse(invalidMapping).success).toBe(false);
    });
  });
});
