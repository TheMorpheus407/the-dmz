import { describe, expect, it } from 'vitest';

import {
  COOP_SCENARIOS,
  SCENARIO_IDS,
  getScenarioById,
  getAllScenarios,
  getScenariosByDifficulty,
  validateScenarioId,
} from '../scenarios.js';
import {
  getScenarioScaling,
  evaluateScenarioSuccessConditions,
  getEmailRoutingForScenario,
  applyPhaseOverrides,
  createInitialScenarioState,
  advanceScenarioState,
  isScenarioComplete,
  getScenarioThreatDomains,
  getScenarioDescription,
  getScenarioName,
  validateScenarioConfig,
} from '../scenario.engine.js';

describe('coop scenarios - scenario definitions', () => {
  it('should have exactly 4 scenarios', () => {
    expect(SCENARIO_IDS).toHaveLength(4);
  });

  it('should contain cascade_failure', () => {
    expect(SCENARIO_IDS).toContain('cascade_failure');
  });

  it('should contain bandwidth_siege', () => {
    expect(SCENARIO_IDS).toContain('bandwidth_siege');
  });

  it('should contain the_insider', () => {
    expect(SCENARIO_IDS).toContain('the_insider');
  });

  it('should contain data_exodus', () => {
    expect(SCENARIO_IDS).toContain('data_exodus');
  });
});

describe('coop scenarios - cascade_failure', () => {
  const scenario = COOP_SCENARIOS.cascade_failure;

  it('has correct id', () => {
    expect(scenario.id).toBe('cascade_failure');
  });

  it('has supply_chain threat domain', () => {
    expect(scenario.threatDomain).toContain('supply_chain');
  });

  it('has vendor_impersonation threat domain', () => {
    expect(scenario.threatDomain).toContain('vendor_impersonation');
  });

  it('supports standard and hardened difficulty', () => {
    expect(scenario.difficultyTiers).toContain('standard');
    expect(scenario.difficultyTiers).toContain('hardened');
    expect(scenario.difficultyTiers).not.toContain('training');
    expect(scenario.difficultyTiers).not.toContain('nightmare');
  });

  it('has threat_type email routing', () => {
    expect(scenario.emailRouting).toBe('threat_type');
  });

  it('has vendor_compromise_tracking mechanic', () => {
    const mechanic = scenario.uniqueMechanics.find(
      (m) => m.mechanicType === 'vendor_compromise_tracking',
    );
    expect(mechanic).toBeDefined();
  });

  it('has cascade_progression mechanic', () => {
    const mechanic = scenario.uniqueMechanics.find((m) => m.mechanicType === 'cascade_progression');
    expect(mechanic).toBeDefined();
  });

  it('has contain_all_compromised success condition', () => {
    const condition = scenario.successConditions.find((c) => c.type === 'contain_all_compromised');
    expect(condition).toBeDefined();
    expect(condition?.targetValue).toBe(0);
  });

  it('has breach_occurred failure condition', () => {
    const condition = scenario.failureConditions.find((c) => c.type === 'breach_occurred');
    expect(condition).toBeDefined();
  });
});

describe('coop scenarios - bandwidth_siege', () => {
  const scenario = COOP_SCENARIOS.bandwidth_siege;

  it('has correct id', () => {
    expect(scenario.id).toBe('bandwidth_siege');
  });

  it('has availability threat domain', () => {
    expect(scenario.threatDomain).toContain('availability');
  });

  it('has resource_exhaustion threat domain', () => {
    expect(scenario.threatDomain).toContain('resource_exhaustion');
  });

  it('supports training and standard difficulty', () => {
    expect(scenario.difficultyTiers).toContain('training');
    expect(scenario.difficultyTiers).toContain('standard');
    expect(scenario.difficultyTiers).not.toContain('hardened');
    expect(scenario.difficultyTiers).not.toContain('nightmare');
  });

  it('has round_robin email routing', () => {
    expect(scenario.emailRouting).toBe('round_robin');
  });

  it('has bandwidth_threshold mechanic', () => {
    const mechanic = scenario.uniqueMechanics.find((m) => m.mechanicType === 'bandwidth_threshold');
    expect(mechanic).toBeDefined();
  });
});

describe('coop scenarios - the_insider', () => {
  const scenario = COOP_SCENARIOS.the_insider;

  it('has correct id', () => {
    expect(scenario.id).toBe('the_insider');
  });

  it('has insider_threat threat domain', () => {
    expect(scenario.threatDomain).toContain('insider_threat');
  });

  it('has behavioral_anomaly threat domain', () => {
    expect(scenario.threatDomain).toContain('behavioral_anomaly');
  });

  it('supports hardened and nightmare difficulty', () => {
    expect(scenario.difficultyTiers).toContain('hardened');
    expect(scenario.difficultyTiers).toContain('nightmare');
    expect(scenario.difficultyTiers).not.toContain('training');
    expect(scenario.difficultyTiers).not.toContain('standard');
  });

  it('has assigned email routing', () => {
    expect(scenario.emailRouting).toBe('assigned');
  });

  it('has time_limit mechanic', () => {
    const mechanic = scenario.uniqueMechanics.find((m) => m.mechanicType === 'time_limit');
    expect(mechanic).toBeDefined();
    expect(mechanic?.config['daysUntilAction']).toBe(3);
  });
});

describe('coop scenarios - data_exodus', () => {
  const scenario = COOP_SCENARIOS.data_exodus;

  it('has correct id', () => {
    expect(scenario.id).toBe('data_exodus');
  });

  it('has data_exfiltration threat domain', () => {
    expect(scenario.threatDomain).toContain('data_exfiltration');
  });

  it('has incident_response threat domain', () => {
    expect(scenario.threatDomain).toContain('incident_response');
  });

  it('supports hardened and nightmare difficulty', () => {
    expect(scenario.difficultyTiers).toContain('hardened');
    expect(scenario.difficultyTiers).toContain('nightmare');
    expect(scenario.difficultyTiers).not.toContain('training');
    expect(scenario.difficultyTiers).not.toContain('standard');
  });

  it('has random email routing', () => {
    expect(scenario.emailRouting).toBe('random');
  });

  it('has time_pressure mechanic', () => {
    const mechanic = scenario.uniqueMechanics.find((m) => m.mechanicType === 'time_pressure');
    expect(mechanic).toBeDefined();
    expect(mechanic?.config['decisionTimeLimitSeconds']).toBe(30);
  });
});

describe('coop scenarios - getScenarioById', () => {
  it('returns cascade_failure correctly', () => {
    const scenario = getScenarioById('cascade_failure');
    expect(scenario.id).toBe('cascade_failure');
  });

  it('returns bandwidth_siege correctly', () => {
    const scenario = getScenarioById('bandwidth_siege');
    expect(scenario.id).toBe('bandwidth_siege');
  });

  it('returns the_insider correctly', () => {
    const scenario = getScenarioById('the_insider');
    expect(scenario.id).toBe('the_insider');
  });

  it('returns data_exodus correctly', () => {
    const scenario = getScenarioById('data_exodus');
    expect(scenario.id).toBe('data_exodus');
  });
});

describe('coop scenarios - getAllScenarios', () => {
  it('returns all 4 scenarios', () => {
    const scenarios = getAllScenarios();
    expect(scenarios).toHaveLength(4);
  });

  it('returns scenario objects with correct ids', () => {
    const scenarios = getAllScenarios();
    const ids = scenarios.map((s) => s.id);
    expect(ids).toContain('cascade_failure');
    expect(ids).toContain('bandwidth_siege');
    expect(ids).toContain('the_insider');
    expect(ids).toContain('data_exodus');
  });
});

describe('coop scenarios - getScenariosByDifficulty', () => {
  it('returns correct scenarios for training', () => {
    const scenarios = getScenariosByDifficulty('training');
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]?.id).toBe('bandwidth_siege');
  });

  it('returns correct scenarios for standard', () => {
    const scenarios = getScenariosByDifficulty('standard');
    expect(scenarios).toHaveLength(2);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids).toContain('bandwidth_siege');
    expect(ids).toContain('cascade_failure');
  });

  it('returns correct scenarios for hardened', () => {
    const scenarios = getScenariosByDifficulty('hardened');
    expect(scenarios).toHaveLength(3);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids).toContain('cascade_failure');
    expect(ids).toContain('the_insider');
    expect(ids).toContain('data_exodus');
  });

  it('returns correct scenarios for nightmare', () => {
    const scenarios = getScenariosByDifficulty('nightmare');
    expect(scenarios).toHaveLength(2);
    const ids = scenarios.map((s) => s.id).sort();
    expect(ids).toContain('the_insider');
    expect(ids).toContain('data_exodus');
  });
});

describe('coop scenarios - validateScenarioId', () => {
  it('returns true for valid scenario ids', () => {
    expect(validateScenarioId('cascade_failure')).toBe(true);
    expect(validateScenarioId('bandwidth_siege')).toBe(true);
    expect(validateScenarioId('the_insider')).toBe(true);
    expect(validateScenarioId('data_exodus')).toBe(true);
  });

  it('returns false for invalid scenario ids', () => {
    expect(validateScenarioId('invalid')).toBe(false);
    expect(validateScenarioId('')).toBe(false);
    expect(validateScenarioId('CASCADE_FAILURE')).toBe(false);
  });
});

describe('scenario engine - getScenarioScaling', () => {
  it('returns valid scaling for cascade_failure standard', () => {
    const scaling = getScenarioScaling('cascade_failure', 'standard');
    expect(scaling.emailVolumeMultiplier).toBeGreaterThan(1);
    expect(scaling.threatProbabilityBonus).toBeGreaterThan(0);
    expect(scaling.breachSeverityBonus).toBeGreaterThan(0);
  });

  it('returns higher scaling for nightmare difficulty', () => {
    const standardScaling = getScenarioScaling('cascade_failure', 'standard');
    const nightmareScaling = getScenarioScaling('cascade_failure', 'nightmare');

    expect(nightmareScaling.emailVolumeMultiplier).toBeGreaterThan(
      standardScaling.emailVolumeMultiplier,
    );
    expect(nightmareScaling.breachSeverityBonus).toBeGreaterThan(
      standardScaling.breachSeverityBonus,
    );
  });

  it('returns valid scaling structure', () => {
    const scaling = getScenarioScaling('cascade_failure', 'standard');
    expect(scaling).toHaveProperty('effectiveScaling');
    expect(scaling).toHaveProperty('emailVolumeMultiplier');
    expect(scaling).toHaveProperty('threatProbabilityBonus');
    expect(scaling).toHaveProperty('breachSeverityBonus');
    expect(scaling).toHaveProperty('timePressureMultiplier');
  });
});

describe('scenario engine - evaluateScenarioSuccessConditions', () => {
  it('evaluates cascade_failure success correctly', () => {
    const result = evaluateScenarioSuccessConditions('cascade_failure', {
      compromisedVendors: 0,
    });
    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
  });

  it('evaluates cascade_failure failure correctly', () => {
    const result = evaluateScenarioSuccessConditions('cascade_failure', {
      compromisedVendors: 2,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
  });

  it('evaluates the_insider success correctly', () => {
    const result = evaluateScenarioSuccessConditions('the_insider', {
      insiderIdentified: true,
    });
    expect(result.isSuccess).toBe(true);
  });

  it('evaluates data_exodus success correctly', () => {
    const result = evaluateScenarioSuccessConditions('data_exodus', {
      exfiltratedDataMB: 0,
    });
    expect(result.isSuccess).toBe(true);
  });

  it('evaluates bandwidth_siege success correctly', () => {
    const result = evaluateScenarioSuccessConditions('bandwidth_siege', {
      bandwidthPercent: 100,
    });
    expect(result.isSuccess).toBe(true);
  });

  it('evaluates bandwidth_siege failure correctly', () => {
    const result = evaluateScenarioSuccessConditions('bandwidth_siege', {
      bandwidthPercent: 20,
    });
    expect(result.isFailure).toBe(true);
  });
});

describe('scenario engine - getEmailRoutingForScenario', () => {
  it('returns threat_type for cascade_failure', () => {
    expect(getEmailRoutingForScenario('cascade_failure')).toBe('threat_type');
  });

  it('returns round_robin for bandwidth_siege', () => {
    expect(getEmailRoutingForScenario('bandwidth_siege')).toBe('round_robin');
  });

  it('returns assigned for the_insider', () => {
    expect(getEmailRoutingForScenario('the_insider')).toBe('assigned');
  });

  it('returns random for data_exodus', () => {
    expect(getEmailRoutingForScenario('data_exodus')).toBe('random');
  });
});

describe('scenario engine - applyPhaseOverrides', () => {
  const baseDurations: Record<string, number> = {
    PHASE_EMAIL_INTAKE: 100,
    PHASE_TRIAGE: 100,
    PHASE_VERIFICATION: 100,
    PHASE_DECISION: 100,
    PHASE_THREAT_PROCESSING: 100,
  };

  it('applies overrides for cascade_failure', () => {
    const result = applyPhaseOverrides('cascade_failure', baseDurations);
    expect(result['PHASE_EMAIL_INTAKE']).toBe(120);
    expect(result['PHASE_TRIAGE']).toBe(110);
  });

  it('applies overrides for bandwidth_siege', () => {
    const result = applyPhaseOverrides('bandwidth_siege', baseDurations);
    expect(result['PHASE_EMAIL_INTAKE']).toBe(80);
    expect(result['PHASE_THREAT_PROCESSING']).toBe(130);
  });

  it('does not modify phases without overrides', () => {
    const result = applyPhaseOverrides('cascade_failure', baseDurations);
    expect(result['PHASE_VERIFICATION']).toBe(100);
    expect(result['PHASE_DECISION']).toBe(100);
  });
});

describe('scenario engine - createInitialScenarioState', () => {
  it('creates correct initial state for cascade_failure', () => {
    const state = createInitialScenarioState('cascade_failure', 'seed123');
    expect(state.compromisedVendors).toBe(0);
    expect(state.totalVendors).toBeGreaterThanOrEqual(3);
    expect(state.totalVendors).toBeLessThanOrEqual(5);
  });

  it('creates correct initial state for bandwidth_siege', () => {
    const state = createInitialScenarioState('bandwidth_siege', 'seed123');
    expect(state.attackRequests).toBe(0);
    expect(state.totalRequests).toBe(0);
    expect(state.bandwidthPercent).toBe(100);
  });

  it('creates correct initial state for the_insider', () => {
    const state = createInitialScenarioState('the_insider', 'seed123');
    expect(state.insiderIdentified).toBe(false);
    expect(state.insiderActionComplete).toBe(false);
  });

  it('creates correct initial state for data_exodus', () => {
    const state = createInitialScenarioState('data_exodus', 'seed123');
    expect(state.exfiltratedDataMB).toBe(0);
    expect(state.bandwidthPercent).toBe(100);
  });
});

describe('scenario engine - advanceScenarioState', () => {
  it('handles identify_compromised action for cascade_failure', () => {
    const state = createInitialScenarioState('cascade_failure', 'seed');
    const newState = advanceScenarioState('cascade_failure', state, 'identify_compromised', {});
    expect(newState.compromisedVendors).toBe(1);
  });

  it('handles request_classified action for bandwidth_siege', () => {
    const state = createInitialScenarioState('bandwidth_siege', 'seed');
    const newState = advanceScenarioState('bandwidth_siege', state, 'request_classified', {
      isAttack: true,
    });
    expect(newState.totalRequests).toBe(1);
    expect(newState.attackRequests).toBe(1);
  });

  it('handles identify_insider action for the_insider', () => {
    const state = createInitialScenarioState('the_insider', 'seed');
    const newState = advanceScenarioState('the_insider', state, 'identify_insider', {});
    expect(newState.insiderIdentified).toBe(true);
  });

  it('handles contain_breach action for data_exodus', () => {
    const state = { exfiltratedDataMB: 50 };
    const newState = advanceScenarioState('data_exodus', state, 'contain_breach', {});
    expect(newState.exfiltratedDataMB).toBe(0);
  });

  it('handles data_exfiltrated action for data_exodus', () => {
    const state = createInitialScenarioState('data_exodus', 'seed');
    const newState = advanceScenarioState('data_exodus', state, 'data_exfiltrated', { mb: 25 });
    expect(newState.exfiltratedDataMB).toBe(25);
  });
});

describe('scenario engine - isScenarioComplete', () => {
  it('returns false for incomplete cascade_failure', () => {
    const state = { compromisedVendors: 1, totalVendors: 5 };
    expect(isScenarioComplete('cascade_failure', state)).toBe(false);
  });

  it('returns true for successful cascade_failure', () => {
    const state = { compromisedVendors: 0 };
    expect(isScenarioComplete('cascade_failure', state)).toBe(true);
  });

  it('returns true for failed cascade_failure', () => {
    const state = { compromisedVendors: 5 };
    expect(isScenarioComplete('cascade_failure', state)).toBe(true);
  });
});

describe('scenario engine - getScenarioThreatDomains', () => {
  it('returns domains for cascade_failure', () => {
    const domains = getScenarioThreatDomains('cascade_failure');
    expect(domains).toContain('supply_chain');
    expect(domains).toContain('vendor_impersonation');
  });

  it('returns domains for bandwidth_siege', () => {
    const domains = getScenarioThreatDomains('bandwidth_siege');
    expect(domains).toContain('availability');
    expect(domains).toContain('resource_exhaustion');
  });
});

describe('scenario engine - getScenarioName', () => {
  it('returns correct name for cascade_failure', () => {
    expect(getScenarioName('cascade_failure')).toBe('Cascade Failure');
  });

  it('returns correct name for bandwidth_siege', () => {
    expect(getScenarioName('bandwidth_siege')).toBe('Bandwidth Siege');
  });

  it('returns correct name for the_insider', () => {
    expect(getScenarioName('the_insider')).toBe('The Insider');
  });

  it('returns correct name for data_exodus', () => {
    expect(getScenarioName('data_exodus')).toBe('Data Exodus');
  });
});

describe('scenario engine - getScenarioDescription', () => {
  it('returns non-empty description for all scenarios', () => {
    for (const id of SCENARIO_IDS) {
      const desc = getScenarioDescription(id);
      expect(desc.length).toBeGreaterThan(10);
    }
  });
});

describe('scenario engine - validateScenarioConfig', () => {
  it('returns valid for valid config', () => {
    const result = validateScenarioConfig({
      scenarioId: 'cascade_failure',
      difficultyTier: 'standard',
    });
    expect(result.valid).toBe(true);
  });

  it('returns error for invalid scenario id', () => {
    const result = validateScenarioConfig({
      scenarioId: 'invalid',
      difficultyTier: 'standard',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for invalid difficulty tier', () => {
    const result = validateScenarioConfig({
      scenarioId: 'cascade_failure',
      difficultyTier: 'impossible',
    });
    expect(result.valid).toBe(false);
  });

  it('returns error for unsupported difficulty tier', () => {
    const result = validateScenarioConfig({
      scenarioId: 'cascade_failure',
      difficultyTier: 'training',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not support');
  });
});
