import { describe, expect, it } from 'vitest';

const DAY_PHASES = {
  PHASE_DAY_START: 'PHASE_DAY_START',
  PHASE_EMAIL_INTAKE: 'PHASE_EMAIL_INTAKE',
  PHASE_TRIAGE: 'PHASE_TRIAGE',
  PHASE_VERIFICATION: 'PHASE_VERIFICATION',
  PHASE_DECISION: 'PHASE_DECISION',
  PHASE_CONSEQUENCES: 'PHASE_CONSEQUENCES',
  PHASE_THREAT_PROCESSING: 'PHASE_THREAT_PROCESSING',
  PHASE_INCIDENT_RESPONSE: 'PHASE_INCIDENT_RESPONSE',
  PHASE_RANSOM: 'PHASE_RANSOM',
  PHASE_RECOVERY: 'PHASE_RECOVERY',
  PHASE_RESOURCE_MANAGEMENT: 'PHASE_RESOURCE_MANAGEMENT',
  PHASE_UPGRADE: 'PHASE_UPGRADE',
  PHASE_DAY_END: 'PHASE_DAY_END',
} as const;

import {
  DEFAULT_PERMISSION_MATRIX,
  createDefaultRoleConfig,
  getRolePermissionsForPhase,
  isActionPermitted,
  getRolesForPhase,
  mergePermissionMatrix,
  validatePermissionMatrix,
  type PermissionMatrixConfig,
} from '../permission-matrix.js';

describe('permission-matrix', () => {
  describe('DEFAULT_PERMISSION_MATRIX', () => {
    it('should have version 1', () => {
      expect(DEFAULT_PERMISSION_MATRIX.version).toBe(1);
    });

    it('should define triage_lead role', () => {
      expect(DEFAULT_PERMISSION_MATRIX.roles['triage_lead']).toBeDefined();
    });

    it('should define verification_lead role', () => {
      expect(DEFAULT_PERMISSION_MATRIX.roles['verification_lead']).toBeDefined();
    });

    it('should have triage_lead as authority role', () => {
      expect(DEFAULT_PERMISSION_MATRIX.authorityRole).toBe('triage_lead');
    });
  });

  describe('createDefaultRoleConfig', () => {
    it('should return a copy of the default matrix', () => {
      const config = createDefaultRoleConfig();
      expect(config.version).toBe(1);
      expect(config.roles['triage_lead']).toBeDefined();
      expect(config.roles['verification_lead']).toBeDefined();
    });

    it('should return a new object each time', () => {
      const config1 = createDefaultRoleConfig();
      const config2 = createDefaultRoleConfig();
      expect(config1).not.toBe(config2);
      expect(config1).not.toBe(DEFAULT_PERMISSION_MATRIX);
    });
  });

  describe('getRolePermissionsForPhase', () => {
    it('should return triage_lead permissions for EMAIL_INTAKE phase', () => {
      const permissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(permissions).toContain('view.inbox');
      expect(permissions).toContain('email.mark_indicator');
      expect(permissions).toContain('email.propose_decision');
      expect(permissions).toContain('verification.request');
    });

    it('should return empty permissions for verification_lead in EMAIL_INTAKE', () => {
      const permissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(permissions).toHaveLength(0);
    });

    it('should return verification_lead permissions for VERIFICATION phase', () => {
      const permissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(permissions).toContain('view.verification_packet');
      expect(permissions).toContain('verification.mark_inconsistency');
      expect(permissions).toContain('verification.propose_decision');
    });

    it('should return empty permissions for triage_lead in VERIFICATION phase', () => {
      const permissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(permissions).toHaveLength(0);
    });

    it('should return empty array for unknown role', () => {
      const permissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'unknown_role',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(permissions).toHaveLength(0);
    });

    it('should return empty array for unknown phase', () => {
      const permissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        'PHASE_UNKNOWN' as (typeof DAY_PHASES)[keyof typeof DAY_PHASES],
      );
      expect(permissions).toHaveLength(0);
    });

    it('should return authority actions for DECISION phase', () => {
      const triagePermissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_DECISION,
      );
      expect(triagePermissions).toContain('action.confirm');
      expect(triagePermissions).toContain('action.override');

      const verificationPermissions = getRolePermissionsForPhase(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_DECISION,
      );
      expect(verificationPermissions).toContain('action.confirm');
      expect(verificationPermissions).toContain('action.override');
    });
  });

  describe('isActionPermitted', () => {
    it('should return true for triage_lead performing email.propose_decision in EMAIL_INTAKE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'email.propose_decision',
      );
      expect(result).toBe(true);
    });

    it('should return false for verification_lead performing email.propose_decision in EMAIL_INTAKE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'email.propose_decision',
      );
      expect(result).toBe(false);
    });

    it('should return Authority for action.confirm in DECISION phase (authority-only action)', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_DECISION,
        'action.confirm',
      );
      expect(result).toBe('Authority');
    });

    it('should return false for unknown action', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_EMAIL_INTAKE,
        'unknown.action',
      );
      expect(result).toBe(false);
    });

    it('should return false for triage_lead in VERIFICATION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_VERIFICATION,
        'view.verification_packet',
      );
      expect(result).toBe(false);
    });

    it('should return true for triage_lead performing incident.execute_response in INCIDENT_RESPONSE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_INCIDENT_RESPONSE,
        'incident.execute_response',
      );
      expect(result).toBe(true);
    });

    it('should return true for verification_lead performing incident.execute_response in INCIDENT_RESPONSE', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_INCIDENT_RESPONSE,
        'incident.execute_response',
      );
      expect(result).toBe(true);
    });

    it('should return false for all roles in RESOURCES phase for facility.allocate_resource', () => {
      const triageResult = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'triage_lead',
        DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        'facility.allocate_resource',
      );
      expect(triageResult).toBe(false);

      const verificationResult = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        'facility.allocate_resource',
      );
      expect(verificationResult).toBe(false);
    });

    it('should return Authority for action.override in DECISION phase', () => {
      const result = isActionPermitted(
        DEFAULT_PERMISSION_MATRIX,
        'verification_lead',
        DAY_PHASES.PHASE_DECISION,
        'action.override',
      );
      expect(result).toBe('Authority');
    });
  });

  describe('getRolesForPhase', () => {
    it('should return triage_lead for EMAIL_INTAKE phase', () => {
      const roles = getRolesForPhase(DEFAULT_PERMISSION_MATRIX, DAY_PHASES.PHASE_EMAIL_INTAKE);
      expect(roles).toContain('triage_lead');
    });

    it('should not return verification_lead for EMAIL_INTAKE phase', () => {
      const roles = getRolesForPhase(DEFAULT_PERMISSION_MATRIX, DAY_PHASES.PHASE_EMAIL_INTAKE);
      expect(roles).not.toContain('verification_lead');
    });

    it('should return verification_lead for VERIFICATION phase', () => {
      const roles = getRolesForPhase(DEFAULT_PERMISSION_MATRIX, DAY_PHASES.PHASE_VERIFICATION);
      expect(roles).toContain('verification_lead');
    });

    it('should return both roles for DECISION phase', () => {
      const roles = getRolesForPhase(DEFAULT_PERMISSION_MATRIX, DAY_PHASES.PHASE_DECISION);
      expect(roles).toContain('triage_lead');
      expect(roles).toContain('verification_lead');
    });

    it('should return empty array for phases with no permissions', () => {
      const roles = getRolesForPhase(DEFAULT_PERMISSION_MATRIX, DAY_PHASES.PHASE_RANSOM);
      expect(roles).toHaveLength(0);
    });
  });

  describe('mergePermissionMatrix', () => {
    it('should merge roles correctly', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        roles: {
          triage_lead: {
            [DAY_PHASES.PHASE_EMAIL_INTAKE]: ['custom.action'],
          },
        },
      });

      expect(merged.roles['triage_lead']?.[DAY_PHASES.PHASE_EMAIL_INTAKE]).toContain(
        'custom.action',
      );
    });

    it('should preserve base roles when not overridden', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        roles: {
          triage_lead: {
            [DAY_PHASES.PHASE_EMAIL_INTAKE]: ['custom.action'],
          },
        },
      });

      expect(merged.roles['verification_lead']).toEqual(
        DEFAULT_PERMISSION_MATRIX.roles['verification_lead'],
      );
    });

    it('should override authority role', () => {
      const override: Partial<PermissionMatrixConfig> = {
        authorityRole: 'verification_lead',
      };

      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, override);

      expect(merged.authorityRole).toBe('verification_lead');
    });

    it('should preserve base authority role when not overridden', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        roles: {},
      });

      expect(merged.authorityRole).toBe(DEFAULT_PERMISSION_MATRIX.authorityRole);
    });

    it('should preserve version from base when not overridden', () => {
      const merged = mergePermissionMatrix(DEFAULT_PERMISSION_MATRIX, {
        roles: {},
      });

      expect(merged.version).toBe(DEFAULT_PERMISSION_MATRIX.version);
    });
  });

  describe('validatePermissionMatrix', () => {
    it('should return true for valid matrix', () => {
      expect(validatePermissionMatrix(DEFAULT_PERMISSION_MATRIX)).toBe(true);
    });

    it('should return false for empty object (missing required fields)', () => {
      expect(validatePermissionMatrix({})).toBe(false);
    });

    it('should return false for null', () => {
      expect(validatePermissionMatrix(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validatePermissionMatrix(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validatePermissionMatrix('string')).toBe(false);
      expect(validatePermissionMatrix(123)).toBe(false);
    });

    it('should return false for object without version', () => {
      expect(
        validatePermissionMatrix({
          roles: {},
          authorityRole: 'triage_lead',
        }),
      ).toBe(false);
    });

    it('should return false for object without roles', () => {
      expect(
        validatePermissionMatrix({
          version: 1,
          authorityRole: 'triage_lead',
        }),
      ).toBe(false);
    });

    it('should return false for object without authorityRole', () => {
      expect(
        validatePermissionMatrix({
          version: 1,
          roles: {},
        }),
      ).toBe(false);
    });
  });
});
