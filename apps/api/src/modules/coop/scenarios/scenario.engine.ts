import {
  COOP_SCALING_2_PLAYER,
  calculateEffectiveScaling,
  type PartyDifficultyTier,
  type CoopThreatScaling,
} from '@the-dmz/shared/game';

import {
  getScenarioById,
  validateScenarioId,
  SCENARIO_IDS,
  type CoopScenarioId,
  type EmailRoutingMode,
  type ScenarioThreatDomain,
} from './scenarios.js';

export interface ScenarioEngineContext {
  scenarioId: CoopScenarioId;
  difficultyTier: PartyDifficultyTier;
  currentDay: number;
  sessionSeed: string;
}

export interface ScenarioState {
  compromisedVendors?: number;
  totalVendors?: number;
  attackRequests?: number;
  totalRequests?: number;
  insiderIdentified?: boolean;
  insiderActionComplete?: boolean;
  exfiltratedDataMB?: number;
  bandwidthPercent?: number;
}

export interface ScenarioEvaluationResult {
  isSuccess: boolean;
  isFailure: boolean;
  conditionsMet: string[];
  conditionsFailed: string[];
}

export interface ScenarioScalingResult {
  effectiveScaling: CoopThreatScaling;
  emailVolumeMultiplier: number;
  threatProbabilityBonus: number;
  breachSeverityBonus: number;
  timePressureMultiplier: number;
}

export function getScenarioScaling(
  _scenarioId: CoopScenarioId,
  difficultyTier: PartyDifficultyTier,
): ScenarioScalingResult {
  const effectiveScaling = calculateEffectiveScaling(COOP_SCALING_2_PLAYER, difficultyTier);

  return {
    effectiveScaling,
    emailVolumeMultiplier: effectiveScaling.emailVolumeMultiplier,
    threatProbabilityBonus: effectiveScaling.threatProbabilityBonus,
    breachSeverityBonus: effectiveScaling.breachSeverityBonus,
    timePressureMultiplier: effectiveScaling.timePressureMultiplier,
  };
}

export function evaluateScenarioSuccessConditions(
  scenarioId: CoopScenarioId,
  state: ScenarioState,
): ScenarioEvaluationResult {
  const scenario = getScenarioById(scenarioId);
  const conditionsMet: string[] = [];
  const conditionsNotMet: string[] = [];
  const conditionsFailed: string[] = [];

  for (const condition of scenario.successConditions) {
    const met = evaluateCondition(condition.type, state, condition.targetValue);
    if (met) {
      conditionsMet.push(condition.description);
    } else {
      conditionsNotMet.push(condition.description);
    }
  }

  for (const condition of scenario.failureConditions) {
    const triggered = evaluateCondition(condition.type, state, condition.thresholdValue);
    if (triggered) {
      conditionsFailed.push(condition.description);
    }
  }

  return {
    isSuccess: conditionsFailed.length === 0 && conditionsMet.length > 0,
    isFailure: conditionsFailed.length > 0,
    conditionsMet,
    conditionsFailed,
  };
}

function evaluateCondition(
  type: string,
  state: ScenarioState,
  targetValue: number | undefined,
): boolean {
  switch (type) {
    case 'contain_all_compromised':
      return state.compromisedVendors === 0;

    case 'bandwidth_maintained':
      return (state.bandwidthPercent ?? 100) >= (targetValue ?? 100);

    case 'insider_identified':
      return state.insiderIdentified === true;

    case 'exfiltration_contained':
      return (state.exfiltratedDataMB ?? 0) === 0;

    case 'data_identified':
      return state.exfiltratedDataMB !== undefined;

    case 'breach_occurred':
      return (state.compromisedVendors ?? 0) > (targetValue ?? 0);

    case 'bandwidth_depleted':
      return (state.bandwidthPercent ?? 100) < (targetValue ?? 30);

    case 'insider_action_completed':
      return state.insiderActionComplete === true;

    case 'critical_data_lost':
      return (state.exfiltratedDataMB ?? 0) > (targetValue ?? 100);

    default:
      return false;
  }
}

export function getEmailRoutingForScenario(scenarioId: CoopScenarioId): EmailRoutingMode {
  const scenario = getScenarioById(scenarioId);
  return scenario.emailRouting;
}

export function applyPhaseOverrides(
  scenarioId: CoopScenarioId,
  basePhaseDurations: Record<string, number>,
): Record<string, number> {
  const scenario = getScenarioById(scenarioId);
  const overridden = { ...basePhaseDurations };

  for (const override of scenario.phaseOverrides) {
    if (
      override.enabled &&
      override.durationModifier &&
      overridden[override.phaseId] !== undefined
    ) {
      const currentDuration = overridden[override.phaseId]!;
      overridden[override.phaseId] = Math.round(currentDuration * override.durationModifier);
    }
  }

  return overridden;
}

export function createInitialScenarioState(
  scenarioId: CoopScenarioId,
  _seed: string,
): ScenarioState {
  switch (scenarioId) {
    case 'cascade_failure':
      return {
        compromisedVendors: 0,
        totalVendors: Math.floor(Math.random() * 3) + 3,
      };
    case 'bandwidth_siege':
      return {
        attackRequests: 0,
        totalRequests: 0,
        bandwidthPercent: 100,
      };
    case 'the_insider':
      return {
        insiderIdentified: false,
        insiderActionComplete: false,
      };
    case 'data_exodus':
      return {
        exfiltratedDataMB: 0,
        bandwidthPercent: 100,
      };
    default:
      return {};
  }
}

export function advanceScenarioState(
  scenarioId: CoopScenarioId,
  currentState: ScenarioState,
  action: string,
  params: Record<string, unknown>,
): ScenarioState {
  const newState = { ...currentState };

  switch (scenarioId) {
    case 'cascade_failure':
      if (action === 'identify_compromised') {
        newState.compromisedVendors = (newState.compromisedVendors ?? 0) + 1;
      }
      if (action === 'day_passed') {
        newState.compromisedVendors = (newState.compromisedVendors ?? 0) + 1;
      }
      break;

    case 'bandwidth_siege':
      if (action === 'request_classified') {
        newState.totalRequests = (newState.totalRequests ?? 0) + 1;
        if (params['isAttack']) {
          newState.attackRequests = (newState.attackRequests ?? 0) + 1;
        }
        const total = newState.totalRequests;
        const attacks = newState.attackRequests ?? 0;
        newState.bandwidthPercent = Math.max(0, 100 - (attacks / Math.max(1, total)) * 100);
      }
      break;

    case 'the_insider':
      if (action === 'identify_insider') {
        newState.insiderIdentified = true;
      }
      if (action === 'day_passed') {
        const daysUntil = (params['daysUntilAction'] as number) ?? 3;
        if ((params['currentDay'] as number) >= daysUntil) {
          newState.insiderActionComplete = true;
        }
      }
      break;

    case 'data_exodus':
      if (action === 'contain_breach') {
        newState.exfiltratedDataMB = 0;
      }
      if (action === 'data_exfiltrated') {
        newState.exfiltratedDataMB =
          (newState.exfiltratedDataMB ?? 0) + ((params['mb'] as number) ?? 0);
      }
      break;
  }

  return newState;
}

export function isScenarioComplete(scenarioId: CoopScenarioId, state: ScenarioState): boolean {
  const result = evaluateScenarioSuccessConditions(scenarioId, state);
  return result.isSuccess || result.isFailure;
}

export function getScenarioThreatDomains(scenarioId: CoopScenarioId): ScenarioThreatDomain[] {
  const scenario = getScenarioById(scenarioId);
  return scenario.threatDomain;
}

export function getScenarioDescription(scenarioId: CoopScenarioId): string {
  const scenario = getScenarioById(scenarioId);
  return scenario.description;
}

export function getScenarioName(scenarioId: CoopScenarioId): string {
  const scenario = getScenarioById(scenarioId);
  return scenario.name;
}

export function validateScenarioConfig(config: { scenarioId: string; difficultyTier: string }): {
  valid: boolean;
  error?: string;
} {
  if (!validateScenarioId(config.scenarioId)) {
    return {
      valid: false,
      error: `Invalid scenario ID: ${config.scenarioId}. Valid IDs: ${SCENARIO_IDS.join(', ')}`,
    };
  }

  const validTiers: PartyDifficultyTier[] = ['training', 'standard', 'hardened', 'nightmare'];
  if (!validTiers.includes(config.difficultyTier as PartyDifficultyTier)) {
    return {
      valid: false,
      error: `Invalid difficulty tier: ${config.difficultyTier}`,
    };
  }

  const scenario = getScenarioById(config.scenarioId);
  if (!scenario.difficultyTiers.includes(config.difficultyTier as PartyDifficultyTier)) {
    return {
      valid: false,
      error: `Scenario ${config.scenarioId} does not support difficulty tier ${config.difficultyTier}`,
    };
  }

  return { valid: true };
}
