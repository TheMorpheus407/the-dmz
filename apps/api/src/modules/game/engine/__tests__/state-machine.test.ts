import { describe, it, expect } from 'vitest';

import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  canTransitionMacroState,
  canTransitionPhase,
  isActionAllowedInPhase,
  getNextPhase,
  getInitialMacroState,
  getInitialPhase,
  validateTransition,
} from '../state-machine.js';

describe('Session Macro State Machine', () => {
  describe('canTransitionMacroState', () => {
    it('should allow SESSION_INIT to SESSION_ACTIVE', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_INIT,
          SESSION_MACRO_STATES.SESSION_ACTIVE,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_ACTIVE to SESSION_PAUSED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_ACTIVE,
          SESSION_MACRO_STATES.SESSION_PAUSED,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_PAUSED to SESSION_ACTIVE', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_PAUSED,
          SESSION_MACRO_STATES.SESSION_ACTIVE,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_ACTIVE to SESSION_BREACH_RECOVERY', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_ACTIVE,
          SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_BREACH_RECOVERY to SESSION_ACTIVE', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
          SESSION_MACRO_STATES.SESSION_ACTIVE,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_BREACH_RECOVERY to SESSION_COMPLETED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY,
          SESSION_MACRO_STATES.SESSION_COMPLETED,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_ACTIVE to SESSION_COMPLETED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_ACTIVE,
          SESSION_MACRO_STATES.SESSION_COMPLETED,
        ),
      ).toBe(true);
    });

    it('should allow SESSION_ACTIVE to SESSION_ABANDONED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_ACTIVE,
          SESSION_MACRO_STATES.SESSION_ABANDONED,
        ),
      ).toBe(true);
    });

    it('should NOT allow SESSION_INIT to SESSION_PAUSED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_INIT,
          SESSION_MACRO_STATES.SESSION_PAUSED,
        ),
      ).toBe(false);
    });

    it('should NOT allow transitions from SESSION_COMPLETED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_COMPLETED,
          SESSION_MACRO_STATES.SESSION_ACTIVE,
        ),
      ).toBe(false);
    });

    it('should NOT allow transitions from SESSION_ABANDONED', () => {
      expect(
        canTransitionMacroState(
          SESSION_MACRO_STATES.SESSION_ABANDONED,
          SESSION_MACRO_STATES.SESSION_ACTIVE,
        ),
      ).toBe(false);
    });
  });

  describe('getInitialMacroState', () => {
    it('should return SESSION_INIT', () => {
      expect(getInitialMacroState()).toBe(SESSION_MACRO_STATES.SESSION_INIT);
    });
  });
});

describe('Day Phase State Machine', () => {
  describe('canTransitionPhase', () => {
    it('should allow PHASE_DAY_START to PHASE_EMAIL_INTAKE', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_DAY_START, DAY_PHASES.PHASE_EMAIL_INTAKE)).toBe(
        true,
      );
    });

    it('should allow PHASE_EMAIL_INTAKE to PHASE_TRIAGE', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_EMAIL_INTAKE, DAY_PHASES.PHASE_TRIAGE)).toBe(true);
    });

    it('should allow PHASE_TRIAGE to PHASE_VERIFICATION', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_TRIAGE, DAY_PHASES.PHASE_VERIFICATION)).toBe(true);
    });

    it('should allow PHASE_TRIAGE to PHASE_DECISION', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_TRIAGE, DAY_PHASES.PHASE_DECISION)).toBe(true);
    });

    it('should allow PHASE_VERIFICATION to PHASE_TRIAGE', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_VERIFICATION, DAY_PHASES.PHASE_TRIAGE)).toBe(true);
    });

    it('should allow PHASE_DECISION to PHASE_CONSEQUENCES', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_DECISION, DAY_PHASES.PHASE_CONSEQUENCES)).toBe(
        true,
      );
    });

    it('should allow PHASE_CONSEQUENCES to PHASE_THREAT_PROCESSING', () => {
      expect(
        canTransitionPhase(DAY_PHASES.PHASE_CONSEQUENCES, DAY_PHASES.PHASE_THREAT_PROCESSING),
      ).toBe(true);
    });

    it('should allow PHASE_THREAT_PROCESSING to PHASE_INCIDENT_RESPONSE', () => {
      expect(
        canTransitionPhase(DAY_PHASES.PHASE_THREAT_PROCESSING, DAY_PHASES.PHASE_INCIDENT_RESPONSE),
      ).toBe(true);
    });

    it('should allow PHASE_THREAT_PROCESSING to PHASE_RESOURCE_MANAGEMENT', () => {
      expect(
        canTransitionPhase(
          DAY_PHASES.PHASE_THREAT_PROCESSING,
          DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        ),
      ).toBe(true);
    });

    it('should allow PHASE_INCIDENT_RESPONSE to PHASE_RESOURCE_MANAGEMENT', () => {
      expect(
        canTransitionPhase(
          DAY_PHASES.PHASE_INCIDENT_RESPONSE,
          DAY_PHASES.PHASE_RESOURCE_MANAGEMENT,
        ),
      ).toBe(true);
    });

    it('should allow PHASE_RESOURCE_MANAGEMENT to PHASE_UPGRADE', () => {
      expect(
        canTransitionPhase(DAY_PHASES.PHASE_RESOURCE_MANAGEMENT, DAY_PHASES.PHASE_UPGRADE),
      ).toBe(true);
    });

    it('should allow PHASE_UPGRADE to PHASE_DAY_END', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_UPGRADE, DAY_PHASES.PHASE_DAY_END)).toBe(true);
    });

    it('should allow PHASE_DAY_END to PHASE_DAY_START', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_DAY_END, DAY_PHASES.PHASE_DAY_START)).toBe(true);
    });

    it('should NOT allow backward transitions like PHASE_TRIAGE to PHASE_DAY_START', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_TRIAGE, DAY_PHASES.PHASE_DAY_START)).toBe(false);
    });

    it('should NOT allow skipping phases like PHASE_TRIAGE to PHASE_CONSEQUENCES', () => {
      expect(canTransitionPhase(DAY_PHASES.PHASE_TRIAGE, DAY_PHASES.PHASE_CONSEQUENCES)).toBe(
        false,
      );
    });
  });

  describe('getInitialPhase', () => {
    it('should return PHASE_DAY_START', () => {
      expect(getInitialPhase()).toBe(DAY_PHASES.PHASE_DAY_START);
    });
  });

  describe('getNextPhase', () => {
    it('should return PHASE_EMAIL_INTAKE from PHASE_DAY_START', () => {
      expect(getNextPhase(DAY_PHASES.PHASE_DAY_START)).toBe(DAY_PHASES.PHASE_EMAIL_INTAKE);
    });

    it('should return PHASE_TRIAGE from PHASE_EMAIL_INTAKE', () => {
      expect(getNextPhase(DAY_PHASES.PHASE_EMAIL_INTAKE)).toBe(DAY_PHASES.PHASE_TRIAGE);
    });
  });
});

describe('Phase Action Validation', () => {
  describe('isActionAllowedInPhase', () => {
    it('should allow ACK_DAY_START in PHASE_DAY_START', () => {
      expect(isActionAllowedInPhase('ACK_DAY_START', DAY_PHASES.PHASE_DAY_START)).toBe(true);
    });

    it('should NOT allow ADVANCE_DAY in PHASE_DAY_START', () => {
      expect(isActionAllowedInPhase('ADVANCE_DAY', DAY_PHASES.PHASE_DAY_START)).toBe(false);
    });

    it('should allow OPEN_EMAIL in PHASE_TRIAGE', () => {
      expect(isActionAllowedInPhase('OPEN_EMAIL', DAY_PHASES.PHASE_TRIAGE)).toBe(true);
    });

    it('should allow MARK_INDICATOR in PHASE_TRIAGE', () => {
      expect(isActionAllowedInPhase('MARK_INDICATOR', DAY_PHASES.PHASE_TRIAGE)).toBe(true);
    });

    it('should allow REQUEST_VERIFICATION in PHASE_TRIAGE', () => {
      expect(isActionAllowedInPhase('REQUEST_VERIFICATION', DAY_PHASES.PHASE_TRIAGE)).toBe(true);
    });

    it('should allow SUBMIT_DECISION in PHASE_TRIAGE', () => {
      expect(isActionAllowedInPhase('SUBMIT_DECISION', DAY_PHASES.PHASE_TRIAGE)).toBe(true);
    });

    it('should allow OPEN_VERIFICATION in PHASE_VERIFICATION', () => {
      expect(isActionAllowedInPhase('OPEN_VERIFICATION', DAY_PHASES.PHASE_VERIFICATION)).toBe(true);
    });

    it('should allow CLOSE_VERIFICATION in PHASE_VERIFICATION', () => {
      expect(isActionAllowedInPhase('CLOSE_VERIFICATION', DAY_PHASES.PHASE_VERIFICATION)).toBe(
        true,
      );
    });

    it('should allow PROCESS_THREATS in PHASE_THREAT_PROCESSING', () => {
      expect(isActionAllowedInPhase('PROCESS_THREATS', DAY_PHASES.PHASE_THREAT_PROCESSING)).toBe(
        true,
      );
    });

    it('should allow RESOLVE_INCIDENT in PHASE_INCIDENT_RESPONSE', () => {
      expect(isActionAllowedInPhase('RESOLVE_INCIDENT', DAY_PHASES.PHASE_INCIDENT_RESPONSE)).toBe(
        true,
      );
    });

    it('should allow ADJUST_RESOURCE in PHASE_RESOURCE_MANAGEMENT', () => {
      expect(isActionAllowedInPhase('ADJUST_RESOURCE', DAY_PHASES.PHASE_RESOURCE_MANAGEMENT)).toBe(
        true,
      );
    });

    it('should allow PURCHASE_UPGRADE in PHASE_UPGRADE', () => {
      expect(isActionAllowedInPhase('PURCHASE_UPGRADE', DAY_PHASES.PHASE_UPGRADE)).toBe(true);
    });

    it('should allow ADVANCE_DAY in PHASE_DAY_END', () => {
      expect(isActionAllowedInPhase('ADVANCE_DAY', DAY_PHASES.PHASE_DAY_END)).toBe(true);
    });

    it('should NOT allow OPEN_EMAIL in PHASE_DAY_START', () => {
      expect(isActionAllowedInPhase('OPEN_EMAIL', DAY_PHASES.PHASE_DAY_START)).toBe(false);
    });

    it('should NOT allow SUBMIT_DECISION in PHASE_DAY_END', () => {
      expect(isActionAllowedInPhase('SUBMIT_DECISION', DAY_PHASES.PHASE_DAY_END)).toBe(false);
    });
  });
});

describe('validateTransition', () => {
  it('should allow valid macro and phase transitions', () => {
    expect(() =>
      validateTransition(
        SESSION_MACRO_STATES.SESSION_INIT,
        SESSION_MACRO_STATES.SESSION_ACTIVE,
        DAY_PHASES.PHASE_DAY_START,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      ),
    ).not.toThrow();
  });

  it('should throw on invalid macro transition', () => {
    expect(() =>
      validateTransition(
        SESSION_MACRO_STATES.SESSION_INIT,
        SESSION_MACRO_STATES.SESSION_PAUSED,
        DAY_PHASES.PHASE_DAY_START,
        DAY_PHASES.PHASE_EMAIL_INTAKE,
      ),
    ).toThrow();
  });

  it('should throw on invalid phase transition', () => {
    expect(() =>
      validateTransition(
        SESSION_MACRO_STATES.SESSION_ACTIVE,
        SESSION_MACRO_STATES.SESSION_ACTIVE,
        DAY_PHASES.PHASE_DAY_START,
        DAY_PHASES.PHASE_TRIAGE,
      ),
    ).toThrow();
  });
});
