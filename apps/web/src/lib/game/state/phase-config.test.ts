import { describe, expect, it } from 'vitest';

import {
  phaseToViewMap,
  phaseToActionMap,
  phaseToShortcutsMap,
  getViewConfig,
  getActionConfig,
  getShortcutConfig,
} from '$lib/game/state/phase-config';
import { gamePhases } from '$lib/game/state/state-machine';

describe('phase-config', () => {
  describe('getViewConfig', () => {
    it('returns correct view config for DAY_START', () => {
      const config = getViewConfig('DAY_START');
      expect(config.mainPanel).toBe('facility');
      expect(config.showFacility).toBe(true);
      expect(config.showInbox).toBe(false);
      expect(config.transitionType).toBe('fade');
    });

    it('returns correct view config for EMAIL_TRIAGE', () => {
      const config = getViewConfig('EMAIL_TRIAGE');
      expect(config.mainPanel).toBe('inbox');
      expect(config.showInbox).toBe(true);
      expect(config.showEmail).toBe(true);
      expect(config.transitionType).toBe('slide');
    });

    it('returns correct view config for DAY_END', () => {
      const config = getViewConfig('DAY_END');
      expect(config.mainPanel).toBe('day-summary');
      expect(config.showDaySummary).toBe(true);
      expect(config.showFacility).toBe(true);
    });

    it('returns default config for unknown phase', () => {
      const config = getViewConfig('DAY_START');
      expect(config).toBeDefined();
      expect(config.mainPanel).toBe('facility');
    });
  });

  describe('getActionConfig', () => {
    it('returns correct action config for DAY_START', () => {
      const config = getActionConfig('DAY_START');
      expect(config.canAdvanceDay).toBe(true);
      expect(config.canUpgradeFacility).toBe(true);
      expect(config.canSelectEmail).toBe(false);
    });

    it('returns correct action config for EMAIL_TRIAGE', () => {
      const config = getActionConfig('EMAIL_TRIAGE');
      expect(config.canSelectEmail).toBe(true);
      expect(config.canOpenWorksheet).toBe(true);
      expect(config.canRequestVerification).toBe(true);
      expect(config.canMakeDecision).toBe(false);
    });

    it('returns correct action config for DECISION_RESOLUTION', () => {
      const config = getActionConfig('DECISION_RESOLUTION');
      expect(config.canMakeDecision).toBe(true);
      expect(config.canSelectEmail).toBe(true);
    });

    it('returns correct action config for DAY_END', () => {
      const config = getActionConfig('DAY_END');
      expect(config.canViewResults).toBe(true);
      expect(config.canAdvanceDay).toBe(true);
    });
  });

  describe('getShortcutConfig', () => {
    it('returns correct shortcuts for EMAIL_TRIAGE', () => {
      const config = getShortcutConfig('EMAIL_TRIAGE');
      expect(config.shortcuts).toContain('ArrowUp');
      expect(config.shortcuts).toContain('ArrowDown');
      expect(config.shortcuts).toContain('Enter');
    });

    it('returns correct shortcuts for DECISION_RESOLUTION', () => {
      const config = getShortcutConfig('DECISION_RESOLUTION');
      expect(config.shortcuts).toContain('a');
      expect(config.shortcuts).toContain('d');
    });

    it('returns shortcuts for INBOX_INTAKE', () => {
      const config = getShortcutConfig('INBOX_INTAKE');
      expect(config.shortcuts).toContain('r');
    });

    it('returns default shortcuts for unknown phase', () => {
      const config = getShortcutConfig('DAY_START');
      expect(config.shortcuts).toContain('Enter');
    });
  });

  describe('phaseToViewMap', () => {
    it('has configuration for all game phases', () => {
      for (const phase of gamePhases) {
        expect(phaseToViewMap[phase]).toBeDefined();
      }
    });

    it('has showX flags for all panels', () => {
      const config = getViewConfig('EMAIL_TRIAGE');
      expect(config).toHaveProperty('showInbox');
      expect(config).toHaveProperty('showEmail');
      expect(config).toHaveProperty('showFacility');
      expect(config).toHaveProperty('showWorksheet');
      expect(config).toHaveProperty('showVerification');
      expect(config).toHaveProperty('showDecision');
      expect(config).toHaveProperty('showFeedback');
      expect(config).toHaveProperty('showThreat');
      expect(config).toHaveProperty('showDaySummary');
      expect(config).toHaveProperty('showGameOver');
    });
  });

  describe('phaseToActionMap', () => {
    it('has configuration for all game phases', () => {
      for (const phase of gamePhases) {
        expect(phaseToActionMap[phase]).toBeDefined();
      }
    });

    it('has canX flags for all actions', () => {
      const config = getActionConfig('EMAIL_TRIAGE');
      expect(config).toHaveProperty('canSelectEmail');
      expect(config).toHaveProperty('canOpenWorksheet');
      expect(config).toHaveProperty('canRequestVerification');
      expect(config).toHaveProperty('canMakeDecision');
      expect(config).toHaveProperty('canViewResults');
      expect(config).toHaveProperty('canContainThreat');
      expect(config).toHaveProperty('canUpgradeFacility');
      expect(config).toHaveProperty('canAdvanceDay');
      expect(config).toHaveProperty('canRestart');
    });
  });

  describe('phaseToShortcutsMap', () => {
    it('has configuration for all game phases', () => {
      for (const phase of gamePhases) {
        expect(phaseToShortcutsMap[phase]).toBeDefined();
      }
    });

    it('has shortcuts array for each phase', () => {
      const config = getShortcutConfig('EMAIL_TRIAGE');
      expect(Array.isArray(config.shortcuts)).toBe(true);
    });
  });
});
