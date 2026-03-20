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
  PermissionDeniedError,
  checkPermission,
  createPermissionDeniedEvent,
  mapGameActionToPermissionAction,
  mapPhaseToPermissionPhase,
} from '../permission.enforcer.js';
import { DEFAULT_PERMISSION_MATRIX } from '../permission-matrix.js';

describe('permission.enforcer', () => {
  describe('PermissionDeniedError', () => {
    it('should create error with correct properties', () => {
      const error = new PermissionDeniedError({
        code: 'ACTION_NOT_PERMITTED',
        message: 'Test message',
        action: 'test.action',
        role: 'triage_lead',
        phase: 'PHASE_EMAIL_INTAKE',
        reason: 'ACTION_NOT_PERMITTED',
      });

      expect(error.name).toBe('PermissionDeniedError');
      expect(error.code).toBe('ACTION_NOT_PERMITTED');
      expect(error.action).toBe('test.action');
      expect(error.role).toBe('triage_lead');
      expect(error.phase).toBe('PHASE_EMAIL_INTAKE');
      expect(error.reason).toBe('ACTION_NOT_PERMITTED');
      expect(error.message).toBe('Test message');
    });
  });

  describe('checkPermission', () => {
    const authorityPlayerId = 'authority-123';
    const nonAuthorityPlayerId = 'player-456';

    it('should allow action when permitted', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('should throw PermissionDeniedError when action not permitted', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: 'verification_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('should throw PermissionDeniedError with ACTION_NOT_PERMITTED reason', () => {
      try {
        checkPermission({
          action: 'email.propose_decision',
          actorRole: 'verification_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect((error as PermissionDeniedError).reason).toBe('ACTION_NOT_PERMITTED');
      }
    });

    it('should allow authority action when player is authority', () => {
      expect(() =>
        checkPermission({
          action: 'action.confirm',
          actorRole: 'triage_lead',
          actorId: authorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).not.toThrow();
    });

    it('should throw PermissionDeniedError when non-authority tries authority action', () => {
      expect(() =>
        checkPermission({
          action: 'action.confirm',
          actorRole: 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('should throw PermissionDeniedError with AUTHORITY_REQUIRED reason for non-authority', () => {
      try {
        checkPermission({
          action: 'action.confirm',
          actorRole: 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_DECISION,
          matrix: DEFAULT_PERMISSION_MATRIX,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionDeniedError);
        expect((error as PermissionDeniedError).reason).toBe('AUTHORITY_REQUIRED');
      }
    });

    it('should throw for unknown action', () => {
      expect(() =>
        checkPermission({
          action: 'unknown.action',
          actorRole: 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('should throw for unknown role', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: 'unknown_role' as 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: DAY_PHASES.PHASE_EMAIL_INTAKE,
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });

    it('should throw for unknown phase', () => {
      expect(() =>
        checkPermission({
          action: 'email.propose_decision',
          actorRole: 'triage_lead',
          actorId: nonAuthorityPlayerId,
          authorityPlayerId,
          phase: 'PHASE_UNKNOWN' as (typeof DAY_PHASES)[keyof typeof DAY_PHASES],
          matrix: DEFAULT_PERMISSION_MATRIX,
        }),
      ).toThrow(PermissionDeniedError);
    });
  });

  describe('createPermissionDeniedEvent', () => {
    it('should create event with correct structure', () => {
      const event = createPermissionDeniedEvent({
        actorId: 'actor-123',
        role: 'triage_lead',
        attemptedAction: 'email.propose_decision',
        phase: 'PHASE_EMAIL_INTAKE',
        reason: 'ACTION_NOT_PERMITTED',
        sessionId: 'session-456',
        tenantId: 'tenant-789',
      });

      expect(event['eventType']).toBe('permission.denied');
      expect(event['actorId']).toBe('actor-123');
      expect(event['role']).toBe('triage_lead');
      expect(event['attemptedAction']).toBe('email.propose_decision');
      expect(event['phase']).toBe('PHASE_EMAIL_INTAKE');
      expect(event['reason']).toBe('ACTION_NOT_PERMITTED');
      expect(event['sessionId']).toBe('session-456');
      expect(event['tenantId']).toBe('tenant-789');
      expect(event['timestamp']).toBeDefined();
    });
  });

  describe('mapGameActionToPermissionAction', () => {
    it('should map OPEN_EMAIL to view.inbox', () => {
      expect(mapGameActionToPermissionAction('OPEN_EMAIL')).toBe('view.inbox');
    });

    it('should map MARK_INDICATOR to email.mark_indicator', () => {
      expect(mapGameActionToPermissionAction('MARK_INDICATOR')).toBe('email.mark_indicator');
    });

    it('should map REQUEST_VERIFICATION to verification.request', () => {
      expect(mapGameActionToPermissionAction('REQUEST_VERIFICATION')).toBe('verification.request');
    });

    it('should map SUBMIT_DECISION to email.propose_decision', () => {
      expect(mapGameActionToPermissionAction('SUBMIT_DECISION')).toBe('email.propose_decision');
    });

    it('should map OPEN_VERIFICATION to view.verification_packet', () => {
      expect(mapGameActionToPermissionAction('OPEN_VERIFICATION')).toBe('view.verification_packet');
    });

    it('should map FLAG_DISCREPANCY to verification.mark_inconsistency', () => {
      expect(mapGameActionToPermissionAction('FLAG_DISCREPANCY')).toBe(
        'verification.mark_inconsistency',
      );
    });

    it('should map CLOSE_VERIFICATION to verification.propose_decision', () => {
      expect(mapGameActionToPermissionAction('CLOSE_VERIFICATION')).toBe(
        'verification.propose_decision',
      );
    });

    it('should return unknown actions as-is', () => {
      expect(mapGameActionToPermissionAction('UNKNOWN_ACTION')).toBe('UNKNOWN_ACTION');
    });
  });

  describe('mapPhaseToPermissionPhase', () => {
    it('should map TRIAGE to EMAIL_INTAKE', () => {
      expect(mapPhaseToPermissionPhase(DAY_PHASES.PHASE_TRIAGE)).toBe(
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
    });

    it('should return other phases unchanged', () => {
      expect(mapPhaseToPermissionPhase(DAY_PHASES.PHASE_EMAIL_INTAKE)).toBe(
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      );
      expect(mapPhaseToPermissionPhase(DAY_PHASES.PHASE_VERIFICATION)).toBe(
        DAY_PHASES.PHASE_VERIFICATION,
      );
      expect(mapPhaseToPermissionPhase(DAY_PHASES.PHASE_DECISION)).toBe(DAY_PHASES.PHASE_DECISION);
      expect(mapPhaseToPermissionPhase(DAY_PHASES.PHASE_INCIDENT_RESPONSE)).toBe(
        DAY_PHASES.PHASE_INCIDENT_RESPONSE,
      );
    });
  });
});
