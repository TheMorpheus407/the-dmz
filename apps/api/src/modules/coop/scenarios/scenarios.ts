import {
  type PartyDifficultyTier,
  COOP_SCENARIO_IDS,
  type CoopScenarioId,
  type ScenarioThreatDomain,
  type EmailRoutingMode,
} from '@the-dmz/shared/game';

export { COOP_SCENARIO_IDS } from '@the-dmz/shared/game';

export type { CoopScenarioId, ScenarioThreatDomain, EmailRoutingMode };

export const SCENARIO_IDS = COOP_SCENARIO_IDS;

export interface ScenarioSuccessCondition {
  type: string;
  description: string;
  targetValue?: number;
}

export interface ScenarioFailureCondition {
  type: string;
  description: string;
  thresholdValue?: number;
}

export interface ScenarioPhaseOverride {
  phaseId: string;
  durationModifier?: number;
  enabled: boolean;
}

export interface ScenarioUniqueMechanic {
  mechanicType: string;
  description: string;
  config: Record<string, unknown>;
}

export interface CoopScenarioDefinition {
  id: CoopScenarioId;
  name: string;
  description: string;
  threatDomain: ScenarioThreatDomain[];
  difficultyTiers: PartyDifficultyTier[];
  emailRouting: EmailRoutingMode;
  uniqueMechanics: ScenarioUniqueMechanic[];
  phaseOverrides: ScenarioPhaseOverride[];
  successConditions: ScenarioSuccessCondition[];
  failureConditions: ScenarioFailureCondition[];
  narrativeSetup: string;
  narrativeExit: string;
}

export const COOP_SCENARIOS: Record<CoopScenarioId, CoopScenarioDefinition> = {
  cascade_failure: {
    id: 'cascade_failure',
    name: 'Cascade Failure',
    description:
      'A supply chain attack is underway. Emails arrive from supposed vendors with compromised dependencies. Some legitimate vendors are also compromised — identify and isolate all compromised supply chain nodes before breach.',
    threatDomain: ['supply_chain', 'vendor_impersonation'],
    difficultyTiers: ['standard', 'hardened'],
    emailRouting: 'threat_type',
    uniqueMechanics: [
      {
        mechanicType: 'vendor_compromise_tracking',
        description: 'Track which vendors have been identified as compromised vs legitimate',
        config: { compromisedVendors: 0, totalVendors: 0 },
      },
      {
        mechanicType: 'cascade_progression',
        description: 'Each day without full containment increases the number of compromised nodes',
        config: { progressionRate: 1 },
      },
    ],
    phaseOverrides: [
      { phaseId: 'PHASE_EMAIL_INTAKE', durationModifier: 1.2, enabled: true },
      { phaseId: 'PHASE_TRIAGE', durationModifier: 1.1, enabled: true },
    ],
    successConditions: [
      {
        type: 'contain_all_compromised',
        description: 'Identify and isolate all compromised supply chain nodes',
        targetValue: 0,
      },
    ],
    failureConditions: [
      {
        type: 'breach_occurred',
        description: 'A breach occurred due to uncontained compromise',
        thresholdValue: 1,
      },
    ],
    narrativeSetup:
      'Multiple vendor emails have arrived with suspicious attachment patterns. Initial analysis suggests a coordinated supply chain attack.',
    narrativeExit:
      'All compromised vendor nodes have been identified and isolated. The supply chain is secure.',
  },

  bandwidth_siege: {
    id: 'bandwidth_siege',
    name: 'Bandwidth Siege',
    description:
      'A massive influx of access requests is overwhelming the system. Some requests are legitimate surge, others are attack — they look identical initially. Maintain minimum bandwidth for legitimate clients during the siege window.',
    threatDomain: ['availability', 'resource_exhaustion'],
    difficultyTiers: ['training', 'standard'],
    emailRouting: 'round_robin',
    uniqueMechanics: [
      {
        mechanicType: 'request_flood_tracking',
        description: 'Track ratio of legitimate vs attack requests',
        config: { totalRequests: 0, attackRequests: 0 },
      },
      {
        mechanicType: 'bandwidth_threshold',
        description: 'Maintain minimum bandwidth for legitimate clients',
        config: { minBandwidthPercent: 30 },
      },
    ],
    phaseOverrides: [
      { phaseId: 'PHASE_EMAIL_INTAKE', durationModifier: 0.8, enabled: true },
      { phaseId: 'PHASE_THREAT_PROCESSING', durationModifier: 1.3, enabled: true },
    ],
    successConditions: [
      {
        type: 'bandwidth_maintained',
        description: 'Maintain minimum bandwidth for legitimate clients through siege',
        targetValue: 100,
      },
    ],
    failureConditions: [
      {
        type: 'bandwidth_depleted',
        description: 'Bandwidth dropped below minimum threshold',
        thresholdValue: 30,
      },
    ],
    narrativeSetup:
      'An unusually high volume of access requests has been detected. System resources are being stretched thin.',
    narrativeExit:
      'The siege has subsided. Legitimate clients maintained access throughout. Resources are recovering.',
  },

  the_insider: {
    id: 'the_insider',
    name: 'The Insider',
    description:
      'One email in the queue is from a compromised insider account. There are no technical red flags — only behavioral anomalies (unusual timing, unusual request type). Identify the insider before the malicious action completes.',
    threatDomain: ['insider_threat', 'behavioral_anomaly'],
    difficultyTiers: ['hardened', 'nightmare'],
    emailRouting: 'assigned',
    uniqueMechanics: [
      {
        mechanicType: 'behavioral_analysis',
        description: 'Analyze emails for behavioral anomalies rather than technical indicators',
        config: { anomalyTypes: ['timing', 'request_type', 'volume'] },
      },
      {
        mechanicType: 'time_limit',
        description: 'Insider action completes after a certain number of days',
        config: { daysUntilAction: 3 },
      },
    ],
    phaseOverrides: [
      { phaseId: 'PHASE_VERIFICATION', durationModifier: 1.2, enabled: true },
      { phaseId: 'PHASE_DECISION', durationModifier: 0.8, enabled: true },
    ],
    successConditions: [
      {
        type: 'insider_identified',
        description: 'Identify the insider before malicious action completes',
        targetValue: 1,
      },
    ],
    failureConditions: [
      {
        type: 'insider_action_completed',
        description: 'Insider completed their malicious action',
        thresholdValue: 1,
      },
    ],
    narrativeSetup:
      'A single unusual email has been flagged by behavioral analysis. No technical indicators — but something feels wrong.',
    narrativeExit:
      'The insider threat has been neutralized. The compromised account has been contained and the behavior analysis system updated.',
  },

  data_exodus: {
    id: 'data_exodus',
    name: 'Data Exodus',
    description:
      'A breach is in progress. Data extraction is happening in real-time. Identify what is being extracted and contain it. Decisions have time pressure.',
    threatDomain: ['data_exfiltration', 'incident_response'],
    difficultyTiers: ['hardened', 'nightmare'],
    emailRouting: 'random',
    uniqueMechanics: [
      {
        mechanicType: 'data_exfiltration_tracking',
        description: 'Track data leaving the system',
        config: { exfiltratedDataMB: 0, maxAllowedMB: 100 },
      },
      {
        mechanicType: 'time_pressure',
        description: 'Each decision must be made within time limit or data is lost',
        config: { decisionTimeLimitSeconds: 30 },
      },
    ],
    phaseOverrides: [
      { phaseId: 'PHASE_INCIDENT_RESPONSE', durationModifier: 1.5, enabled: true },
      { phaseId: 'PHASE_DECISION', durationModifier: 0.6, enabled: true },
    ],
    successConditions: [
      {
        type: 'exfiltration_contained',
        description: 'Contain the data exfiltration before critical data is lost',
        targetValue: 0,
      },
      {
        type: 'data_identified',
        description: 'Identify what data was exfiltrated',
        targetValue: 1,
      },
    ],
    failureConditions: [
      {
        type: 'critical_data_lost',
        description: 'Critical data was exfiltrated beyond containment',
        thresholdValue: 1,
      },
    ],
    narrativeSetup:
      'Security alerts indicate active data exfiltration. The breach must be contained immediately.',
    narrativeExit:
      'The exfiltration has been stopped. The scope of data loss has been identified and containment measures are in place.',
  },
};

export function getScenarioById(id: CoopScenarioId): CoopScenarioDefinition {
  return COOP_SCENARIOS[id];
}

export function getAllScenarios(): CoopScenarioDefinition[] {
  return Object.values(COOP_SCENARIOS);
}

export function getScenariosByDifficulty(tier: PartyDifficultyTier): CoopScenarioDefinition[] {
  return Object.values(COOP_SCENARIOS).filter((s) => s.difficultyTiers.includes(tier));
}

export function validateScenarioId(id: string): id is CoopScenarioId {
  return SCENARIO_IDS.includes(id as CoopScenarioId);
}
