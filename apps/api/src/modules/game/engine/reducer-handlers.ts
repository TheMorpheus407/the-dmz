import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type EmailState,
  type EmailInstance,
  type UpgradeType,
  type BreachTriggerType,
  type UpgradeDefinition,
  type AckDayStartPayload,
  type LoadInboxPayload,
  type OpenEmailPayload,
  type MarkIndicatorPayload,
  type RequestVerificationPayload,
  type SubmitDecisionPayload,
  type ProcessThreatsPayload,
  type ResolveIncidentPayload,
  type TriggerBreachPayload,
  type PayRansomPayload,
  type RefuseRansomPayload,
  type AdvanceRecoveryPayload,
  type PurchaseUpgradePayload,
  type AdjustResourcePayload,
  type OnboardClientPayload,
  type EvictClientPayload,
  type ProcessFacilityTickPayload,
  type UpgradeFacilityTierPayload,
  type PurchaseFacilityUpgradePayload,
  type PauseSessionPayload,
  type ResumeSessionPayload,
  type AbandonSessionPayload,
  type AdvanceDayPayload,
  type FlagDiscrepancyPayload,
} from '@the-dmz/shared';

import {
  resolveDecision,
  type DecisionEvaluationResult,
} from '../email-instance/decision-resolution.service.js';
import { assembleVerificationPacket } from '../email-instance/verification-packet.service.js';
import { ThreatEngineService } from '../threat-engine/index.js';
import { breachService } from '../breach/index.js';
import {
  clampTrustScore,
  calculateXPForLevel,
  getLevelFromXP,
  awardXPForDecision,
} from '../../../game/consequence/index.js';

import { canTransitionMacroState, isActionAllowedInPhase } from './state-machine.js';

export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const threatEngine = new ThreatEngineService();

interface AggregatedSecurityDeltas {
  breachProbabilityModifier: number;
  detectionProbabilityModifier: number;
  mitigationBonus: number;
  threatVectorModifiers: Record<string, number>;
  securityToolCoverage: number;
}

function aggregateSecurityDeltas(state: GameState): AggregatedSecurityDeltas {
  const completedUpgrades = state.facility.upgrades.filter((u) => u.isCompleted);

  const result: AggregatedSecurityDeltas = {
    breachProbabilityModifier: 0,
    detectionProbabilityModifier: 0,
    mitigationBonus: 0,
    threatVectorModifiers: {},
    securityToolCoverage: 0,
  };

  for (const upgrade of completedUpgrades) {
    if (upgrade.securityDelta) {
      result.breachProbabilityModifier += upgrade.securityDelta.breachProbabilityModifier ?? 0;
      result.detectionProbabilityModifier +=
        upgrade.securityDelta.detectionProbabilityModifier ?? 0;
      result.mitigationBonus += upgrade.securityDelta.mitigationBonus ?? 0;
      result.securityToolCoverage += 0.1;

      if (upgrade.securityDelta.threatVectorModifiers) {
        for (const [vector, modifier] of Object.entries(
          upgrade.securityDelta.threatVectorModifiers,
        )) {
          result.threatVectorModifiers[vector] =
            (result.threatVectorModifiers[vector] ?? 0) + modifier;
        }
      }
    }
  }

  result.securityToolCoverage = Math.min(1, result.securityToolCoverage);

  return result;
}

function applyUpgradeEffects(state: GameState, upgradeType: UpgradeType): void {
  const upgradeDef = UPGRADE_CATALOG[upgradeType];
  const upgrade = state.facility.upgrades.find((u) => u.upgradeType === upgradeType);
  if (!upgrade || !upgrade.isCompleted) return;

  if (upgradeDef.resourceDelta.rackCapacity) {
    state.facility.capacities.rackCapacityU += upgradeDef.resourceDelta.rackCapacity;
  }
  if (upgradeDef.resourceDelta.powerCapacity) {
    state.facility.capacities.powerCapacityKw += upgradeDef.resourceDelta.powerCapacity;
  }
  if (upgradeDef.resourceDelta.coolingCapacity) {
    state.facility.capacities.coolingCapacityTons += upgradeDef.resourceDelta.coolingCapacity;
  }
  if (upgradeDef.resourceDelta.bandwidthCapacity) {
    state.facility.capacities.bandwidthCapacityMbps += upgradeDef.resourceDelta.bandwidthCapacity;
  }

  if (upgradeDef.maintenanceDelta) {
    state.facility.maintenanceDebt = Math.max(
      0,
      Math.min(1, state.facility.maintenanceDebt + upgradeDef.maintenanceDelta),
    );
  }

  state.facility.securityToolOpExPerDay = state.facility.upgrades.reduce(
    (sum, u) => sum + (u.isCompleted ? u.opExPerDay : 0),
    0,
  );
}

function processInstallations(state: GameState, events: DomainEvent[]): void {
  const facility = state.facility;

  for (const upgrade of facility.upgrades) {
    if (
      upgrade.status === 'installing' &&
      upgrade.completesDay &&
      state.currentDay >= upgrade.completesDay
    ) {
      upgrade.status = 'completed';
      upgrade.isCompleted = true;
      upgrade.completionDay = state.currentDay;

      applyUpgradeEffects(state, upgrade.upgradeType);

      const upgradeDef = UPGRADE_CATALOG[upgrade.upgradeType];
      events.push({
        eventId: crypto.randomUUID(),
        eventType: 'facility.upgrade.completed',
        timestamp: state.updatedAt,
        payload: {
          upgradeType: upgrade.upgradeType,
          category: upgradeDef?.category,
          tierLevel: upgrade.tierLevel,
        },
      });
    }
  }
}

export const UPGRADE_CATALOG: Record<UpgradeType, UpgradeDefinition> = {
  rack: {
    id: 'rack',
    category: 'capacity',
    name: 'Rack Expansion',
    description: 'Add additional rack units for server deployment',
    baseCost: 500,
    installationDays: 2,
    installationOverhead: 0.1,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: { rackCapacity: 21 },
    maintenanceDelta: 0.02,
    opExPerDay: 5,
    threatSurfaceDelta: 0.02,
  },
  power: {
    id: 'power',
    category: 'capacity',
    name: 'Power Capacity',
    description: 'Increase available power capacity in kilowatts',
    baseCost: 750,
    installationDays: 3,
    installationOverhead: 0.1,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: { powerCapacity: 5 },
    maintenanceDelta: 0.02,
    opExPerDay: 10,
    threatSurfaceDelta: 0.01,
  },
  cooling: {
    id: 'cooling',
    category: 'capacity',
    name: 'Cooling System',
    description: 'Increase cooling capacity in tons',
    baseCost: 1000,
    installationDays: 3,
    installationOverhead: 0.15,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: { coolingCapacity: 2.5 },
    maintenanceDelta: 0.02,
    opExPerDay: 8,
    threatSurfaceDelta: 0.01,
  },
  bandwidth: {
    id: 'bandwidth',
    category: 'capacity',
    name: 'Bandwidth Upgrade',
    description: 'Increase network bandwidth capacity',
    baseCost: 600,
    installationDays: 2,
    installationOverhead: 0.1,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: { bandwidthCapacity: 50 },
    maintenanceDelta: 0.01,
    opExPerDay: 5,
    threatSurfaceDelta: 0.03,
  },
  power_efficiency: {
    id: 'power_efficiency',
    category: 'efficiency',
    name: 'Power Efficiency',
    description: 'Reduce power consumption through efficient hardware',
    baseCost: 800,
    installationDays: 2,
    minTier: 'station',
    prerequisites: ['power'],
    resourceDelta: { powerUsage: -0.15, efficiencyMultiplier: 1.1 },
    maintenanceDelta: -0.03,
    opExPerDay: 3,
    threatSurfaceDelta: 0,
  },
  cooling_efficiency: {
    id: 'cooling_efficiency',
    category: 'efficiency',
    name: 'Cooling Efficiency',
    description: 'Improve cooling efficiency with better airflow',
    baseCost: 900,
    installationDays: 2,
    minTier: 'station',
    prerequisites: ['cooling'],
    resourceDelta: { coolingUsage: -0.15, efficiencyMultiplier: 1.1 },
    maintenanceDelta: -0.03,
    opExPerDay: 3,
    threatSurfaceDelta: 0,
  },
  bandwidth_efficiency: {
    id: 'bandwidth_efficiency',
    category: 'efficiency',
    name: 'Bandwidth Optimization',
    description: 'Optimize network usage through compression and caching',
    baseCost: 700,
    installationDays: 1,
    minTier: 'station',
    prerequisites: ['bandwidth'],
    resourceDelta: { bandwidthUsage: -0.2, efficiencyMultiplier: 1.15 },
    maintenanceDelta: -0.02,
    opExPerDay: 2,
    threatSurfaceDelta: 0,
  },
  firewall: {
    id: 'firewall',
    category: 'security',
    name: 'Enterprise Firewall',
    description: 'Block unauthorized network traffic at the perimeter',
    baseCost: 1200,
    installationDays: 3,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: {},
    securityDelta: { breachProbabilityModifier: -0.15, detectionProbabilityModifier: 0.1 },
    maintenanceDelta: 0.02,
    opExPerDay: 15,
    threatSurfaceDelta: 0.02,
  },
  ids: {
    id: 'ids',
    category: 'security',
    name: 'Intrusion Detection System',
    description: 'Detect suspicious network activity and patterns',
    baseCost: 1000,
    installationDays: 2,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: { powerUsage: 0.5 },
    securityDelta: { detectionProbabilityModifier: 0.2 },
    maintenanceDelta: 0.03,
    opExPerDay: 12,
    threatSurfaceDelta: 0.01,
  },
  ips: {
    id: 'ips',
    category: 'security',
    name: 'Intrusion Prevention System',
    description: 'Actively block detected threats in real-time',
    baseCost: 1500,
    installationDays: 3,
    minTier: 'station',
    prerequisites: ['ids'],
    resourceDelta: { powerUsage: 1, bandwidthUsage: -0.1 },
    securityDelta: { breachProbabilityModifier: -0.1, mitigationBonus: 0.25 },
    maintenanceDelta: 0.04,
    opExPerDay: 20,
    threatSurfaceDelta: 0.03,
  },
  siem: {
    id: 'siem',
    category: 'security',
    name: 'SIEM Platform',
    description: 'Centralized security monitoring and correlation',
    baseCost: 2000,
    installationDays: 4,
    minTier: 'vault',
    prerequisites: ['ids', 'firewall'],
    resourceDelta: { rackUsage: 4, powerUsage: 2, bandwidthUsage: 5 },
    securityDelta: { detectionProbabilityModifier: 0.3, threatVectorModifiers: { insider: -0.2 } },
    maintenanceDelta: 0.05,
    opExPerDay: 35,
    threatSurfaceDelta: 0.05,
  },
  edr: {
    id: 'edr',
    category: 'security',
    name: 'Endpoint Detection & Response',
    description: 'Monitor and respond to endpoint threats',
    baseCost: 1800,
    installationDays: 3,
    minTier: 'vault',
    prerequisites: ['ids'],
    resourceDelta: { powerUsage: 1.5 },
    securityDelta: {
      breachProbabilityModifier: -0.1,
      mitigationBonus: 0.2,
      threatVectorModifiers: { malware: -0.25 },
    },
    maintenanceDelta: 0.04,
    opExPerDay: 25,
    threatSurfaceDelta: 0.03,
  },
  waf: {
    id: 'waf',
    category: 'security',
    name: 'Web Application Firewall',
    description: 'Protect web applications from common attacks',
    baseCost: 1100,
    installationDays: 2,
    minTier: 'station',
    prerequisites: ['firewall'],
    resourceDelta: { bandwidthUsage: -0.05 },
    securityDelta: { breachProbabilityModifier: -0.12, threatVectorModifiers: { web: -0.3 } },
    maintenanceDelta: 0.03,
    opExPerDay: 18,
    threatSurfaceDelta: 0.02,
  },
  threat_intel_feed: {
    id: 'threat_intel_feed',
    category: 'security',
    name: 'Threat Intelligence Feed',
    description: 'Real-time threat indicators and IOC updates',
    baseCost: 800,
    installationDays: 1,
    minTier: 'station',
    prerequisites: [],
    resourceDelta: { bandwidthUsage: 1 },
    securityDelta: { detectionProbabilityModifier: 0.15 },
    maintenanceDelta: 0.01,
    opExPerDay: 10,
    threatSurfaceDelta: 0.01,
  },
  soar: {
    id: 'soar',
    category: 'security',
    name: 'Security Orchestration and Automation',
    description: 'Automate incident response workflows',
    baseCost: 2500,
    installationDays: 5,
    minTier: 'fortress',
    prerequisites: ['siem', 'edr'],
    resourceDelta: { rackUsage: 6, powerUsage: 3 },
    securityDelta: { mitigationBonus: 0.35 },
    maintenanceDelta: 0.06,
    opExPerDay: 40,
    threatSurfaceDelta: 0.04,
  },
  honeypots: {
    id: 'honeypots',
    category: 'security',
    name: 'Honeypot Network',
    description: 'Deceive attackers with decoy systems',
    baseCost: 600,
    installationDays: 2,
    minTier: 'station',
    prerequisites: [],
    resourceDelta: { rackUsage: 2, powerUsage: 0.5, bandwidthUsage: 2 },
    securityDelta: {
      detectionProbabilityModifier: 0.1,
      threatVectorModifiers: { reconnaissance: -0.2 },
    },
    maintenanceDelta: 0.02,
    opExPerDay: 8,
    threatSurfaceDelta: 0.03,
  },
  zero_trust_gateway: {
    id: 'zero_trust_gateway',
    category: 'security',
    name: 'Zero Trust Gateway',
    description: 'Implement zero-trust network architecture',
    baseCost: 2200,
    installationDays: 4,
    minTier: 'vault',
    prerequisites: ['firewall', 'waf'],
    resourceDelta: { bandwidthUsage: -0.1 },
    securityDelta: { breachProbabilityModifier: -0.2, mitigationBonus: 0.15 },
    maintenanceDelta: 0.05,
    opExPerDay: 30,
    threatSurfaceDelta: 0.04,
  },
  ai_anomaly_detection: {
    id: 'ai_anomaly_detection',
    category: 'security',
    name: 'AI Anomaly Detection',
    description: 'Machine learning based threat detection',
    baseCost: 3000,
    installationDays: 5,
    minTier: 'fortress',
    prerequisites: ['siem', 'ids'],
    resourceDelta: { rackUsage: 8, powerUsage: 4, bandwidthUsage: 10 },
    securityDelta: { detectionProbabilityModifier: 0.35, breachProbabilityModifier: -0.1 },
    maintenanceDelta: 0.07,
    opExPerDay: 50,
    threatSurfaceDelta: 0.06,
  },
  monitoring: {
    id: 'monitoring',
    category: 'operations',
    name: 'Enhanced Monitoring',
    description: 'Comprehensive facility monitoring and alerting',
    baseCost: 500,
    installationDays: 1,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: { rackUsage: 1 },
    maintenanceDelta: -0.02,
    opExPerDay: 5,
    threatSurfaceDelta: 0.01,
  },
  maintenance_automation: {
    id: 'maintenance_automation',
    category: 'operations',
    name: 'Maintenance Automation',
    description: 'Automated scheduling and execution of maintenance tasks',
    baseCost: 900,
    installationDays: 2,
    minTier: 'station',
    prerequisites: ['monitoring'],
    resourceDelta: {},
    maintenanceDelta: -0.05,
    opExPerDay: 8,
    threatSurfaceDelta: 0.01,
  },
  redundancy: {
    id: 'redundancy',
    category: 'operations',
    name: 'System Redundancy',
    description: 'Add redundant systems for fault tolerance',
    baseCost: 1500,
    installationDays: 3,
    minTier: 'vault',
    prerequisites: ['power', 'cooling'],
    resourceDelta: { rackUsage: 10, powerUsage: 3, coolingUsage: 1.5 },
    maintenanceDelta: -0.04,
    opExPerDay: 20,
    threatSurfaceDelta: 0.02,
  },
  preventive_maintenance: {
    id: 'preventive_maintenance',
    category: 'maintenance',
    name: 'Preventive Maintenance Program',
    description: 'Regular maintenance to prevent equipment failure',
    baseCost: 400,
    installationDays: 1,
    minTier: 'outpost',
    prerequisites: [],
    resourceDelta: {},
    maintenanceDelta: -0.08,
    opExPerDay: 5,
    threatSurfaceDelta: 0,
  },
  rapid_repair: {
    id: 'rapid_repair',
    category: 'maintenance',
    name: 'Rapid Repair Systems',
    description: 'Quick-fix capabilities for faster recovery',
    baseCost: 700,
    installationDays: 2,
    minTier: 'station',
    prerequisites: [],
    resourceDelta: {},
    maintenanceDelta: -0.1,
    opExPerDay: 8,
    threatSurfaceDelta: 0,
  },
  diagnostics: {
    id: 'diagnostics',
    category: 'maintenance',
    name: 'Advanced Diagnostics',
    description: 'Predictive maintenance and failure analysis',
    baseCost: 1100,
    installationDays: 2,
    minTier: 'vault',
    prerequisites: ['monitoring'],
    resourceDelta: { rackUsage: 2 },
    securityDelta: { detectionProbabilityModifier: 0.05 },
    maintenanceDelta: -0.12,
    opExPerDay: 12,
    threatSurfaceDelta: 0.01,
  },
};

export function handleAckDayStart(
  state: GameState,
  _action: AckDayStartPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ACK_DAY_START', state.currentPhase)) {
    throw new Error('ACK_DAY_START not allowed in current phase');
  }
  state.currentPhase = DAY_PHASES.PHASE_EMAIL_INTAKE;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.day.started',
    timestamp: state.updatedAt,
    payload: { day: state.currentDay },
  });
}

export function handleLoadInbox(
  state: GameState,
  action: LoadInboxPayload,
  events: DomainEvent[],
): void {
  if (state.currentPhase !== DAY_PHASES.PHASE_EMAIL_INTAKE) {
    throw new Error('LOAD_INBOX only allowed in EMAIL_INTAKE phase');
  }
  const emailInstances: Record<string, unknown> = {};
  const inboxEntries: EmailState[] = [];

  for (const email of action.emails) {
    emailInstances[email.emailId] = email;
    inboxEntries.push({
      emailId: email.emailId,
      status: 'pending',
      indicators: [],
      verificationRequested: false,
      timeSpentMs: 0,
    });
  }

  state.emailInstances = emailInstances as GameState['emailInstances'];
  state.inbox = inboxEntries;
  state.currentPhase = DAY_PHASES.PHASE_TRIAGE;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.inbox.loaded',
    timestamp: state.updatedAt,
    payload: {
      day: state.currentDay,
      emailCount: action.emails.length,
    },
  });
}

export function handleOpenEmail(
  state: GameState,
  action: OpenEmailPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('OPEN_EMAIL', state.currentPhase)) {
    throw new Error('OPEN_EMAIL not allowed in current phase');
  }
  const email = state.inbox.find((e) => e.emailId === action.emailId);
  if (!email) {
    throw new Error('Email not found');
  }
  if (email.status === 'pending') {
    email.status = 'opened';
    email.openedAt = state.updatedAt;
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.email.opened',
    timestamp: state.updatedAt,
    payload: { emailId: action.emailId },
  });
}

export function handleMarkIndicator(
  state: GameState,
  action: MarkIndicatorPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('MARK_INDICATOR', state.currentPhase)) {
    throw new Error('MARK_INDICATOR not allowed in current phase');
  }
  const targetEmail = state.inbox.find((e) => e.emailId === action.emailId);
  if (targetEmail) {
    if (!targetEmail.indicators.includes(action.indicatorType)) {
      targetEmail.indicators.push(action.indicatorType);
    }
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.email.indicator_marked',
    timestamp: state.updatedAt,
    payload: { emailId: action.emailId, indicatorType: action.indicatorType },
  });
}

export function handleRequestVerification(
  state: GameState,
  action: RequestVerificationPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('REQUEST_VERIFICATION', state.currentPhase)) {
    throw new Error('REQUEST_VERIFICATION not allowed in current phase');
  }
  const emailToVerify = state.inbox.find((e) => e.emailId === action.emailId);
  if (emailToVerify) {
    emailToVerify.verificationRequested = true;
    emailToVerify.status = 'request_verification';
  }

  const emailInstance = state.emailInstances[action.emailId];

  const packetParams: {
    sessionSeed: bigint;
    emailId: string;
    sessionId: string;
    faction?: string;
  } = {
    sessionSeed: BigInt(state.seed),
    emailId: action.emailId,
    sessionId: state.sessionId,
  };

  if (emailInstance?.faction) {
    packetParams.faction = emailInstance.faction;
  }

  const packet = assembleVerificationPacket(packetParams);

  state.verificationPackets = state.verificationPackets || {};
  state.verificationPackets[action.emailId] = packet;

  state.analyticsState.verificationsRequested++;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.email.verification_requested',
    timestamp: state.updatedAt,
    payload: { emailId: action.emailId },
  });
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.verification.packet_generated',
    timestamp: state.updatedAt,
    payload: {
      emailId: action.emailId,
      packetId: packet.packetId,
      artifactCount: packet.artifacts.length,
      hasIntelligenceBrief: packet.hasIntelligenceBrief,
    },
  });
}

interface TrustChangeContext {
  previousTrustScore: number;
  evaluation: { trustImpact: number; isCorrect: boolean };
  emailId: string;
  decision: string;
}

function pushTrustChangeEvent(
  events: DomainEvent[],
  state: GameState,
  ctx: TrustChangeContext,
): void {
  if (ctx.evaluation.trustImpact === 0) {
    return;
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.trust_changed',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      amount: ctx.evaluation.trustImpact,
      balanceBefore: ctx.previousTrustScore,
      balanceAfter: state.trustScore,
      reason: ctx.evaluation.isCorrect ? 'decision_correct' : 'decision_incorrect',
      context: { emailId: ctx.emailId, decision: ctx.decision },
    },
  });
}

interface FundsChangeContext {
  previousFunds: number;
  evaluation: { fundsImpact: number; isCorrect: boolean };
  emailId: string;
  decision: string;
}

function pushFundsChangeEvent(
  events: DomainEvent[],
  state: GameState,
  ctx: FundsChangeContext,
): void {
  if (ctx.evaluation.fundsImpact === 0) {
    return;
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.credits_changed',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      amount: ctx.evaluation.fundsImpact,
      balanceBefore: ctx.previousFunds,
      balanceAfter: state.funds,
      reason: ctx.evaluation.isCorrect ? 'client_approval' : 'client_denial',
      context: { emailId: ctx.emailId, decision: ctx.decision },
    },
  });
}

function processLevelUp(
  state: GameState,
  previousXP: number,
  xpAwarded: number,
  events: DomainEvent[],
): void {
  if (xpAwarded <= 0) {
    return;
  }
  state.playerXP += xpAwarded;
  const previousLevel = getLevelFromXP(previousXP);
  const newLevel = getLevelFromXP(state.playerXP);

  if (newLevel <= previousLevel) {
    return;
  }
  state.playerLevel = newLevel;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.level_up',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      previousLevel,
      newLevel,
      xpRequired: calculateXPForLevel(newLevel),
      xpAwarded: state.playerXP - previousXP,
    },
  });
}

function incrementDecisionAnalytics(
  state: GameState,
  decision: SubmitDecisionPayload['decision'],
): void {
  state.analyticsState.totalDecisions++;
  if (decision === 'approve') {
    state.analyticsState.approvals++;
  } else if (decision === 'deny') {
    state.analyticsState.denials++;
  } else if (decision === 'flag') {
    state.analyticsState.flags++;
  }
}

interface EmailSubmittedCtx {
  events: DomainEvent[];
  state: GameState;
  emailId: string;
  decision: SubmitDecisionPayload['decision'];
  timeSpentMs: number;
  evaluationError?: boolean;
}

function pushEmailDecisionSubmittedEvent(ctx: EmailSubmittedCtx): void {
  ctx.events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.email.decision_submitted',
    timestamp: ctx.state.updatedAt,
    payload: {
      emailId: ctx.emailId,
      decision: ctx.decision,
      timeSpentMs: ctx.timeSpentMs,
      ...(ctx.evaluationError && { evaluationError: true }),
    },
  });
}

function applyFactionImpact(
  state: GameState,
  emailInstance: { faction?: string },
  factionImpact: number,
): void {
  if (emailInstance.faction && factionImpact !== 0) {
    const currentFactionRelation = state.factionRelations[emailInstance.faction] ?? 50;
    state.factionRelations[emailInstance.faction] = Math.max(
      0,
      Math.min(100, currentFactionRelation + factionImpact),
    );
  }
}

interface DecisionEvaluatedCtx {
  events: DomainEvent[];
  state: GameState;
  emailId: string;
  decision: SubmitDecisionPayload['decision'];
  evaluation: DecisionEvaluationResult;
}

function pushDecisionEvaluatedEvent(ctx: DecisionEvaluatedCtx): void {
  ctx.events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.email.decision_evaluated',
    timestamp: ctx.state.updatedAt,
    payload: {
      emailId: ctx.emailId,
      decision: ctx.decision,
      isCorrect: ctx.evaluation.isCorrect,
      trustImpact: ctx.evaluation.trustImpact,
      fundsImpact: ctx.evaluation.fundsImpact,
      factionImpact: ctx.evaluation.factionImpact,
      threatImpact: ctx.evaluation.threatImpact,
      explanation: ctx.evaluation.explanation,
      indicatorsFound: ctx.evaluation.indicatorsFound,
      indicatorsMissed: ctx.evaluation.indicatorsMissed,
    },
  });
}

interface ResolveDecisionCtx {
  state: GameState;
  emailToDecide: EmailState;
  emailInstance: EmailInstance;
  action: SubmitDecisionPayload;
  events: DomainEvent[];
}

function resolveAndApplyDecision(ctx: ResolveDecisionCtx): void {
  const { state, emailToDecide, emailInstance, action, events } = ctx;
  const previousTrustScore = state.trustScore;
  const previousFunds = state.funds;
  const previousXP = state.playerXP;

  let evaluation;
  try {
    evaluation = resolveDecision({
      email: emailInstance,
      decision: action.decision,
      markedIndicators: emailToDecide.indicators,
      timeSpentMs: action.timeSpentMs,
      currentPhase: state.currentPhase,
    });
  } catch {
    pushEmailDecisionSubmittedEvent({
      events,
      state,
      emailId: action.emailId,
      decision: action.decision,
      timeSpentMs: action.timeSpentMs,
      evaluationError: true,
    });
    incrementDecisionAnalytics(state, action.decision);
    return;
  }

  state.trustScore = clampTrustScore(
    Math.max(0, Math.min(500, state.trustScore + evaluation.trustImpact)),
  );
  state.funds = Math.max(0, state.funds + evaluation.fundsImpact);

  const xpAwarded = awardXPForDecision(evaluation.isCorrect, emailInstance.difficulty ?? 3);
  processLevelUp(state, previousXP, xpAwarded, events);

  applyFactionImpact(state, emailInstance, evaluation.factionImpact);

  pushTrustChangeEvent(events, state, {
    previousTrustScore,
    evaluation,
    emailId: action.emailId,
    decision: action.decision,
  });
  pushFundsChangeEvent(events, state, {
    previousFunds,
    evaluation,
    emailId: action.emailId,
    decision: action.decision,
  });

  pushDecisionEvaluatedEvent({
    events,
    state,
    emailId: action.emailId,
    decision: action.decision,
    evaluation,
  });

  incrementDecisionAnalytics(state, action.decision);
}

export function handleSubmitDecision(
  state: GameState,
  action: SubmitDecisionPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('SUBMIT_DECISION', state.currentPhase)) {
    throw new Error('SUBMIT_DECISION not allowed in current phase');
  }
  const emailToDecide = state.inbox.find((e) => e.emailId === action.emailId);
  if (!emailToDecide) {
    return;
  }

  const statusMap: Record<string, EmailState['status']> = {
    approve: 'approved',
    deny: 'denied',
    flag: 'flagged',
    request_verification: 'request_verification',
    defer: 'deferred',
  };
  emailToDecide.status = statusMap[action.decision] ?? 'pending';
  emailToDecide.timeSpentMs = action.timeSpentMs;

  const emailInstance = state.emailInstances[action.emailId];
  if (!emailInstance) {
    pushEmailDecisionSubmittedEvent({
      events,
      state,
      emailId: action.emailId,
      decision: action.decision,
      timeSpentMs: action.timeSpentMs,
    });
    incrementDecisionAnalytics(state, action.decision);
    return;
  }

  resolveAndApplyDecision({
    state,
    emailToDecide,
    emailInstance,
    action,
    events,
  });
}

export function handleProcessThreats(
  state: GameState,
  action: ProcessThreatsPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PROCESS_THREATS', state.currentPhase)) {
    throw new Error('PROCESS_THREATS not allowed in current phase');
  }

  const sessionId = state.sessionId;
  threatEngine.setThreatTier(sessionId, state.threatTier);

  const securityDeltas = aggregateSecurityDeltas(state);

  const partySize = state.partyContext?.partySize;
  const difficultyTier = state.partyContext?.difficultyTier;

  const threatResult = threatEngine.generateAttacks(
    state,
    sessionId,
    action.dayNumber,
    partySize,
    difficultyTier,
    securityDeltas,
  );

  state.threatTier = threatResult.newThreatTier;

  if (!state.threats) {
    state.threats = [];
  }
  state.threats = [...state.threats, ...threatResult.attacks];

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.threats.generated',
    timestamp: state.updatedAt,
    payload: {
      day: action.dayNumber,
      attacks: threatResult.attacks,
      threatTier: threatResult.newThreatTier,
      coopScalingApplied: threatResult.coopScalingApplied,
    },
  });

  if (threatResult.tierChanged) {
    const tierChangeResult = threatEngine.calculateThreatTier(state, sessionId);
    if (tierChangeResult.event) {
      events.push({
        eventId: crypto.randomUUID(),
        eventType: 'game.threat.tier_changed',
        timestamp: state.updatedAt,
        payload: {
          previousTier: tierChangeResult.event.previousTier,
          newTier: tierChangeResult.event.newTier,
          reason: tierChangeResult.event.reason,
          narrativeMessage: tierChangeResult.event.narrativeMessage,
        },
      });
    }
  }
}

export function handleResolveIncident(
  state: GameState,
  action: ResolveIncidentPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('RESOLVE_INCIDENT', state.currentPhase)) {
    throw new Error('RESOLVE_INCIDENT not allowed in current phase');
  }
  const incident = state.incidents.find((i) => i.incidentId === action.incidentId);
  if (incident) {
    incident.status = 'resolved';
    incident.resolvedDay = state.currentDay;
    incident.responseActions = action.responseActions;
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.incident.resolved',
    timestamp: state.updatedAt,
    payload: { incidentId: action.incidentId, responseActions: action.responseActions },
  });
}

export function handleTriggerBreach(
  state: GameState,
  action: TriggerBreachPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PROCESS_THREATS', state.currentPhase)) {
    throw new Error('TRIGGER_BREACH only allowed during threat processing');
  }

  const securityTools = state.facility.upgrades
    .filter((u) => u.isCompleted && u.securityDelta)
    .map((u) => u.upgradeType);

  const totalLifetimeEarnings = state.funds + state.analyticsState.totalDecisions * 10;

  const breachResult = breachService.evaluateBreachTrigger(
    state.sessionId,
    action.triggerType as BreachTriggerType,
    state.currentDay,
    totalLifetimeEarnings,
    state.threatTier,
    securityTools,
    1,
  );

  const isBreach = breachResult.breachOccurred;
  const severity = breachResult.severity!;

  if (isBreach) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_BREACH_RECOVERY;
    state.currentPhase = DAY_PHASES.PHASE_RANSOM;
  }

  state.analyticsState.breaches += isBreach ? 1 : 0;

  state.trustScore = Math.max(0, state.trustScore + breachResult.trustPenalty);

  const breachState = breachService.applyBreach(
    state.sessionId,
    breachResult,
    state.currentDay,
    totalLifetimeEarnings,
  );
  state.breachState = breachState;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.occurred',
    timestamp: state.updatedAt,
    payload: {
      triggerType: action.triggerType,
      severity,
      isBreach,
      trustPenalty: breachResult.trustPenalty,
    },
  });

  if (isBreach) {
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.breach.ransom_displayed',
      timestamp: state.updatedAt,
      payload: {
        severity,
        currentFunds: state.funds,
        ransomAmount: breachResult.ransomAmount,
      },
    });
  }
}

export function handlePayRansom(
  state: GameState,
  _action: PayRansomPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PAY_RANSOM', state.currentPhase)) {
    throw new Error('PAY_RANSOM only allowed in RANSOM phase');
  }
  const breachState = state.breachState;
  if (!breachState.ransomAmount) {
    throw new Error('No active ransom to pay');
  }
  if (state.funds < breachState.ransomAmount) {
    throw new Error('Insufficient funds to pay ransom');
  }

  state.funds -= breachState.ransomAmount;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.ransom_paid',
    timestamp: state.updatedAt,
    payload: {
      amount: breachState.ransomAmount,
      remainingFunds: state.funds,
    },
  });

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.recovery_started',
    timestamp: state.updatedAt,
    payload: {
      recoveryDays: breachState.recoveryDaysRemaining,
    },
  });

  state.currentPhase = DAY_PHASES.PHASE_RECOVERY;
}

export function handleRefuseRansom(
  state: GameState,
  _action: RefuseRansomPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('REFUSE_RANSOM', state.currentPhase)) {
    throw new Error('REFUSE_RANSOM only allowed in RANSOM phase');
  }

  const breachState = state.breachState;
  const canCauseGameOver = breachState.currentSeverity === 4;

  if (canCauseGameOver) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_COMPLETED;
    state.currentPhase = DAY_PHASES.PHASE_DAY_END;

    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.session.game_over',
      timestamp: state.updatedAt,
      payload: {
        reason: 'Unable to pay ransom',
        daysSurvived: state.currentDay,
        totalEarnings: breachState.totalLifetimeEarningsAtBreach ?? state.funds,
        breaches: state.analyticsState.breaches,
      },
    });
  } else {
    state.currentPhase = DAY_PHASES.PHASE_RECOVERY;
  }

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.breach.ransom_refused',
    timestamp: state.updatedAt,
    payload: {
      severity: breachState.currentSeverity,
    },
  });
}

export function handleAdvanceRecovery(
  state: GameState,
  _action: AdvanceRecoveryPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADVANCE_RECOVERY', state.currentPhase)) {
    throw new Error('ADVANCE_RECOVERY only allowed in RECOVERY phase');
  }

  const breachState = state.breachState;
  if (!breachState.recoveryDaysRemaining || breachState.recoveryDaysRemaining <= 0) {
    throw new Error('No recovery to advance');
  }

  const newRecoveryDays = breachState.recoveryDaysRemaining - 1;
  state.breachState = {
    ...breachState,
    recoveryDaysRemaining: newRecoveryDays,
  };

  if (newRecoveryDays <= 0) {
    state.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
    state.currentPhase = DAY_PHASES.PHASE_RESOURCE_MANAGEMENT;

    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.breach.recovery_completed',
      timestamp: state.updatedAt,
      payload: {
        daysInRecovery: breachState.recoveryDaysRemaining,
      },
    });

    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.breach.post_effects_started',
      timestamp: state.updatedAt,
      payload: {
        revenueDepressionDays: 30,
        increasedScrutinyDays: 14,
        reputationImpactDays: 30,
      },
    });
  } else {
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.day.started',
      timestamp: state.updatedAt,
      payload: {
        day: state.currentDay,
        recoveryDaysRemaining: newRecoveryDays,
        narrativeMessage: `Recovery day ${breachState.recoveryDaysRemaining - newRecoveryDays} complete.`,
      },
    });
  }
}

export function handlePurchaseUpgrade(
  state: GameState,
  action: PurchaseUpgradePayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('PURCHASE_UPGRADE', state.currentPhase)) {
    throw new Error('PURCHASE_UPGRADE not allowed in current phase');
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.upgrade.purchased',
    timestamp: state.updatedAt,
    payload: { upgradeId: action.upgradeId },
  });
}

export function handleAdjustResource(
  state: GameState,
  action: AdjustResourcePayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('ADJUST_RESOURCE not allowed in current phase');
  }
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.resource.adjusted',
    timestamp: state.updatedAt,
    payload: { resourceId: action.resourceId, delta: action.delta },
  });
}

function validateClientCapacity(
  facility: GameState['facility'],
  action: OnboardClientPayload,
): void {
  const newRackUsage = facility.usage.rackUsedU + action.rackUnitsU;
  const newPowerUsage = facility.usage.powerUsedKw + action.powerKw;
  const newCoolingUsage = facility.usage.coolingUsedTons + action.coolingTons;
  const newBandwidthUsage = facility.usage.bandwidthUsedMbps + action.bandwidthMbps;

  const rackPercent = newRackUsage / facility.capacities.rackCapacityU;
  const powerPercent = newPowerUsage / facility.capacities.powerCapacityKw;
  const coolingPercent = newCoolingUsage / facility.capacities.coolingCapacityTons;
  const bandwidthPercent = newBandwidthUsage / facility.capacities.bandwidthCapacityMbps;

  if (rackPercent > 1 || powerPercent > 1 || coolingPercent > 1 || bandwidthPercent > 1) {
    const bottleneck = [
      { resource: 'rack', percent: rackPercent },
      { resource: 'power', percent: powerPercent },
      { resource: 'cooling', percent: coolingPercent },
      { resource: 'bandwidth', percent: bandwidthPercent },
    ].reduce((max, curr) => (curr.percent > max.percent ? curr : max));

    throw new Error(
      `Capacity exceeded: ${bottleneck.resource} at ${Math.floor(bottleneck.percent * 100)}%`,
    );
  }
}

function createAndAddClient(
  facility: GameState['facility'],
  state: GameState,
  action: OnboardClientPayload,
): void {
  const newClient = {
    clientId: action.clientId,
    clientName: action.clientName,
    organization: action.organization,
    rackUnitsU: action.rackUnitsU,
    powerKw: action.powerKw,
    coolingTons: action.coolingTons,
    bandwidthMbps: action.bandwidthMbps,
    dailyRate: action.dailyRate,
    leaseStartDay: state.currentDay,
    leaseEndDay: action.durationDays ? state.currentDay + action.durationDays : null,
    isActive: true,
    burstProfile: action.burstProfile || 'steady',
  };
  facility.usage.rackUsedU += action.rackUnitsU;
  facility.usage.powerUsedKw += action.powerKw;
  facility.usage.coolingUsedTons += action.coolingTons;
  facility.usage.bandwidthUsedMbps += action.bandwidthMbps;
  facility.clients.push(newClient);
  facility.attackSurfaceScore += Math.floor(
    (action.rackUnitsU + action.powerKw + action.coolingTons + action.bandwidthMbps) / 10,
  );
}

function pushClientOnboardedEvent(
  events: DomainEvent[],
  state: GameState,
  action: OnboardClientPayload,
): void {
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.client.onboarded',
    timestamp: state.updatedAt,
    payload: {
      clientId: action.clientId,
      clientName: action.clientName,
      organization: action.organization,
      resources: {
        rackUnitsU: action.rackUnitsU,
        powerKw: action.powerKw,
        coolingTons: action.coolingTons,
        bandwidthMbps: action.bandwidthMbps,
      },
      dailyRate: action.dailyRate,
    },
  });
}

export function handleOnboardClient(
  state: GameState,
  action: OnboardClientPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('ONBOARD_CLIENT not allowed in current phase');
  }
  const facility = state.facility;

  validateClientCapacity(facility, action);
  createAndAddClient(facility, state, action);
  pushClientOnboardedEvent(events, state, action);
}

export function handleEvictClient(
  state: GameState,
  action: EvictClientPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('EVICT_CLIENT not allowed in current phase');
  }
  const facility = state.facility;
  const clientIndex = facility.clients.findIndex((c) => c.clientId === action.clientId);
  if (clientIndex === -1) {
    throw new Error('Client not found');
  }
  const client = facility.clients[clientIndex];
  if (!client) {
    throw new Error('Client not found');
  }
  facility.usage.rackUsedU -= client.rackUnitsU;
  facility.usage.powerUsedKw -= client.powerKw;
  facility.usage.coolingUsedTons -= client.coolingTons;
  facility.usage.bandwidthUsedMbps -= client.bandwidthMbps;
  facility.attackSurfaceScore = Math.max(
    0,
    facility.attackSurfaceScore -
      Math.floor(
        (client.rackUnitsU + client.powerKw + client.coolingTons + client.bandwidthMbps) / 10,
      ),
  );
  facility.clients.splice(clientIndex, 1);
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.client.evicted',
    timestamp: state.updatedAt,
    payload: {
      clientId: action.clientId,
      reason: action.reason,
    },
  });
}

function calculateRevenueAndConsumption(facility: GameState['facility']): {
  totalRevenue: number;
  totalConsumption: number;
} {
  let totalRevenue = 0;
  let totalConsumption = 1.0;
  for (const client of facility.clients) {
    if (!client.isActive) continue;
    totalRevenue += client.dailyRate;
    const burstMultiplier =
      client.burstProfile === 'spiky' ? 1.5 : client.burstProfile === 'moderate' ? 1.2 : 1.0;
    totalConsumption *= burstMultiplier;
  }
  return { totalRevenue, totalConsumption };
}

function applyConsumptionToFacility(
  facility: GameState['facility'],
  totalConsumption: number,
): void {
  facility.usage.rackUsedU = Math.floor(facility.usage.rackUsedU * totalConsumption);
  facility.usage.powerUsedKw = Math.floor(facility.usage.powerUsedKw * totalConsumption);
  facility.usage.coolingUsedTons = Math.floor(facility.usage.coolingUsedTons * totalConsumption);
  facility.usage.bandwidthUsedMbps = Math.floor(
    facility.usage.bandwidthUsedMbps * totalConsumption,
  );
}

function calculateUtilizationPercent(facility: GameState['facility']): number {
  return Math.max(
    facility.usage.rackUsedU / facility.capacities.rackCapacityU,
    facility.usage.powerUsedKw / facility.capacities.powerCapacityKw,
    facility.usage.coolingUsedTons / facility.capacities.coolingCapacityTons,
    facility.usage.bandwidthUsedMbps / facility.capacities.bandwidthCapacityMbps,
  );
}

function processUtilizationEffects(
  facility: GameState['facility'],
  utilizationPercent: number,
  events: DomainEvent[],
  state: GameState,
): void {
  if (utilizationPercent > 0.9) {
    facility.maintenanceDebt += Math.floor((utilizationPercent - 0.9) * 100);
    facility.facilityHealth = Math.max(0, facility.facilityHealth - 2);
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'facility.resource.critical',
      timestamp: state.updatedAt,
      payload: {
        utilizationPercent,
        maintenanceDebt: facility.maintenanceDebt,
        facilityHealth: facility.facilityHealth,
      },
    });
  } else if (utilizationPercent > 0.7) {
    facility.maintenanceDebt += 1;
    facility.facilityHealth = Math.max(0, facility.facilityHealth - 1);
  }
}

function calculateAndDeductOperatingCosts(
  state: GameState,
  facility: GameState['facility'],
  dayNumber: number,
  events: DomainEvent[],
): number {
  facility.operatingCostPerDay = Math.floor(
    50 *
      (1 +
        facility.usage.rackUsedU / facility.capacities.rackCapacityU +
        facility.usage.powerUsedKw / facility.capacities.powerCapacityKw),
  );
  const totalOpEx = facility.operatingCostPerDay + (facility.securityToolOpExPerDay ?? 0);
  state.funds -= totalOpEx;

  if (totalOpEx > 0) {
    events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.economy.credits_changed',
      timestamp: state.updatedAt,
      payload: {
        sessionId: state.sessionId,
        amount: -totalOpEx,
        balanceBefore: state.funds + totalOpEx,
        balanceAfter: state.funds,
        reason: 'operational_cost',
        context: { day: dayNumber },
      },
    });
  }
  return totalOpEx;
}

interface RevenueEventCtx {
  events: DomainEvent[];
  state: GameState;
  dayNumber: number;
  totalRevenue: number;
  clientCount: number;
}

function pushRevenueEvent(ctx: RevenueEventCtx): void {
  if (ctx.totalRevenue > 0) {
    ctx.events.push({
      eventId: crypto.randomUUID(),
      eventType: 'game.economy.credits_changed',
      timestamp: ctx.state.updatedAt,
      payload: {
        sessionId: ctx.state.sessionId,
        amount: ctx.totalRevenue,
        balanceBefore: ctx.state.funds - ctx.totalRevenue,
        balanceAfter: ctx.state.funds,
        reason: 'client_approval',
        context: { day: ctx.dayNumber, clientCount: ctx.clientCount },
      },
    });
  }
}

export function handleProcessFacilityTick(
  state: GameState,
  action: ProcessFacilityTickPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('PROCESS_FACILITY_TICK not allowed in current phase');
  }
  state.currentDay = action.dayNumber;
  const facility = state.facility;

  const { totalRevenue, totalConsumption } = calculateRevenueAndConsumption(facility);
  state.funds += totalRevenue;
  pushRevenueEvent({
    events,
    state,
    dayNumber: action.dayNumber,
    totalRevenue,
    clientCount: facility.clients.length,
  });

  applyConsumptionToFacility(facility, totalConsumption);
  const utilizationPercent = calculateUtilizationPercent(facility);
  processUtilizationEffects(facility, utilizationPercent, events, state);

  const totalOpEx = calculateAndDeductOperatingCosts(state, facility, action.dayNumber, events);

  processInstallations(state, events);

  facility.lastTickDay = action.dayNumber;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.tick.processed',
    timestamp: state.updatedAt,
    payload: {
      dayNumber: action.dayNumber,
      revenue: totalRevenue,
      operatingCost: totalOpEx,
      baseOperatingCost: facility.operatingCostPerDay,
      securityToolOpEx: facility.securityToolOpExPerDay,
      utilizationPercent,
      maintenanceDebt: facility.maintenanceDebt,
      facilityHealth: facility.facilityHealth,
    },
  });
}

export function handleUpgradeFacilityTier(
  state: GameState,
  action: UpgradeFacilityTierPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('UPGRADE_FACILITY_TIER not allowed in current phase');
  }
  const tierUpgrades: Record<
    string,
    { rack: number; power: number; cooling: number; bandwidth: number; cost: number }
  > = {
    outpost: { rack: 84, power: 25, cooling: 12, bandwidth: 500, cost: 5000 },
    station: { rack: 168, power: 50, cooling: 25, bandwidth: 1000, cost: 15000 },
    vault: { rack: 336, power: 100, cooling: 50, bandwidth: 2500, cost: 50000 },
    fortress: { rack: 672, power: 200, cooling: 100, bandwidth: 5000, cost: 150000 },
  };
  const upgrade = tierUpgrades[action.targetTier];
  if (!upgrade) {
    throw new Error('Invalid target tier');
  }
  if (state.funds < upgrade.cost) {
    throw new Error('Insufficient funds for tier upgrade');
  }
  state.funds -= upgrade.cost;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.credits_changed',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      amount: -upgrade.cost,
      balanceBefore: state.funds + upgrade.cost,
      balanceAfter: state.funds,
      reason: 'facility_upgrade',
      context: { fromTier: state.facilityTier, toTier: action.targetTier },
    },
  });
  state.facilityTier = action.targetTier as typeof state.facilityTier;
  state.facility.tier = action.targetTier;
  state.facility.capacities.rackCapacityU = upgrade.rack;
  state.facility.capacities.powerCapacityKw = upgrade.power;
  state.facility.capacities.coolingCapacityTons = upgrade.cooling;
  state.facility.capacities.bandwidthCapacityMbps = upgrade.bandwidth;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.tier.upgraded',
    timestamp: state.updatedAt,
    payload: {
      fromTier: state.facilityTier,
      toTier: action.targetTier,
      cost: upgrade.cost,
    },
  });
}

function validateUpgradePurchase(
  state: GameState,
  upgradeDef: UpgradeDefinition,
  upgradeType: UpgradeType,
): void {
  if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
    throw new Error('PURCHASE_FACILITY_UPGRADE not allowed in current phase');
  }

  const tierOrder = ['outpost', 'station', 'vault', 'fortress', 'citadel'];
  const currentTierIndex = tierOrder.indexOf(state.facilityTier);
  const requiredTierIndex = tierOrder.indexOf(upgradeDef.minTier);
  if (currentTierIndex < requiredTierIndex) {
    throw new Error(`Requires ${upgradeDef.minTier} tier. Current: ${state.facilityTier}`);
  }

  for (const prereqId of upgradeDef.prerequisites) {
    const hasPrereq = state.facility.upgrades.some(
      (u) => u.upgradeType === prereqId && u.isCompleted,
    );
    if (!hasPrereq) {
      throw new Error(`Prerequisite upgrade not completed: ${prereqId}`);
    }
  }

  if (state.funds < upgradeDef.baseCost) {
    throw new Error('Insufficient funds for upgrade');
  }

  const alreadyInstalled = state.facility.upgrades.some(
    (u) => u.upgradeType === upgradeType && u.isCompleted,
  );
  if (alreadyInstalled) {
    throw new Error('Upgrade already installed');
  }
}

function installUpgrade(
  state: GameState,
  upgradeDef: UpgradeDefinition,
  upgradeType: UpgradeType,
): void {
  const existingInProgress = state.facility.upgrades.find(
    (u) => u.upgradeType === upgradeType && !u.isCompleted,
  );

  if (existingInProgress) {
    existingInProgress.status = 'installing';
    existingInProgress.completesDay = state.currentDay + upgradeDef.installationDays;
    existingInProgress.tierLevel += 1;
    return;
  }

  const isZeroDayInstall = upgradeDef.installationDays === 0;
  const newUpgrade: (typeof state.facility.upgrades)[number] = {
    upgradeId: crypto.randomUUID(),
    upgradeType: upgradeType,
    category: upgradeDef.category,
    tierLevel: 1,
    status: isZeroDayInstall ? 'completed' : 'installing',
    purchasedDay: state.currentDay,
    completesDay: isZeroDayInstall
      ? state.currentDay
      : state.currentDay + upgradeDef.installationDays,
    isCompleted: isZeroDayInstall,
    ...(isZeroDayInstall && { completionDay: state.currentDay }),
    resourceDelta: upgradeDef.resourceDelta,
    ...(upgradeDef.securityDelta && { securityDelta: upgradeDef.securityDelta }),
    ...(upgradeDef.maintenanceDelta !== undefined && {
      maintenanceDelta: upgradeDef.maintenanceDelta,
    }),
    opExPerDay: upgradeDef.opExPerDay,
    threatSurfaceDelta: upgradeDef.threatSurfaceDelta,
    ...(upgradeDef.installationOverhead && {
      installationOverhead: upgradeDef.installationOverhead,
    }),
  };
  state.facility.upgrades.push(newUpgrade);
}

function recalculateSecurityOpEx(facility: GameState['facility']): number {
  return facility.upgrades.reduce((sum, u) => sum + (u.isCompleted ? u.opExPerDay : 0), 0);
}

function recalculateAttackSurface(
  facility: GameState['facility'],
  newUpgradeType: UpgradeType,
  threatSurfaceDelta: number,
): number {
  return Math.max(
    0,
    facility.attackSurfaceScore +
      facility.upgrades.reduce((sum, u) => {
        if (u.isCompleted || u.upgradeType === newUpgradeType) {
          return sum + threatSurfaceDelta;
        }
        return sum;
      }, 0),
  );
}

function pushUpgradePurchasedEvent(
  events: DomainEvent[],
  state: GameState,
  action: PurchaseFacilityUpgradePayload,
  upgradeDef: UpgradeDefinition,
): void {
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.upgrade.purchased',
    timestamp: state.updatedAt,
    payload: {
      upgradeType: action.upgradeType,
      category: upgradeDef.category,
      cost: upgradeDef.baseCost,
      installationDays: upgradeDef.installationDays,
      completesDay: state.currentDay + upgradeDef.installationDays,
    },
  });
}

function handleZeroDayInstallation(
  state: GameState,
  action: PurchaseFacilityUpgradePayload,
  upgradeDef: UpgradeDefinition,
  events: DomainEvent[],
): void {
  applyUpgradeEffects(state, action.upgradeType);
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'facility.upgrade.completed',
    timestamp: state.updatedAt,
    payload: {
      upgradeType: action.upgradeType,
      category: upgradeDef.category,
      cost: upgradeDef.baseCost,
    },
  });
}

export function handlePurchaseFacilityUpgrade(
  state: GameState,
  action: PurchaseFacilityUpgradePayload,
  events: DomainEvent[],
): void {
  const upgradeDef = UPGRADE_CATALOG[action.upgradeType];
  if (!upgradeDef) {
    throw new Error(`Unknown upgrade type: ${action.upgradeType}`);
  }

  validateUpgradePurchase(state, upgradeDef, action.upgradeType);

  state.funds -= upgradeDef.baseCost;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.economy.credits_changed',
    timestamp: state.updatedAt,
    payload: {
      sessionId: state.sessionId,
      amount: -upgradeDef.baseCost,
      balanceBefore: state.funds + upgradeDef.baseCost,
      balanceAfter: state.funds,
      reason: 'upgrade_purchase',
      context: { upgradeType: action.upgradeType, category: upgradeDef.category },
    },
  });

  installUpgrade(state, upgradeDef, action.upgradeType);

  state.facility.securityToolOpExPerDay = recalculateSecurityOpEx(state.facility);
  state.facility.attackSurfaceScore = recalculateAttackSurface(
    state.facility,
    action.upgradeType,
    upgradeDef.threatSurfaceDelta,
  );

  pushUpgradePurchasedEvent(events, state, action, upgradeDef);

  if (upgradeDef.installationDays === 0) {
    handleZeroDayInstallation(state, action, upgradeDef, events);
  }
}

export function handlePauseSession(
  state: GameState,
  _action: PauseSessionPayload,
  events: DomainEvent[],
): void {
  if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_PAUSED)) {
    throw new Error('Cannot pause from current state');
  }
  state.currentMacroState = SESSION_MACRO_STATES.SESSION_PAUSED;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.session.paused',
    timestamp: state.updatedAt,
    payload: {},
  });
}

export function handleResumeSession(
  state: GameState,
  _action: ResumeSessionPayload,
  events: DomainEvent[],
): void {
  if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ACTIVE)) {
    throw new Error('Cannot resume from current state');
  }
  state.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.session.resumed',
    timestamp: state.updatedAt,
    payload: {},
  });
}

export function handleAbandonSession(
  state: GameState,
  action: AbandonSessionPayload,
  events: DomainEvent[],
): void {
  if (!canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ABANDONED)) {
    throw new Error('Cannot abandon from current state');
  }
  state.currentMacroState = SESSION_MACRO_STATES.SESSION_ABANDONED;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.session.abandoned',
    timestamp: state.updatedAt,
    payload: { reason: action.reason },
  });
}

export function handleAdvanceDay(
  state: GameState,
  _action: AdvanceDayPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('ADVANCE_DAY', state.currentPhase)) {
    throw new Error('ADVANCE_DAY not allowed in current phase');
  }
  state.currentDay++;
  state.currentPhase = DAY_PHASES.PHASE_DAY_START;

  const deferredEmails = state.inbox.filter((e) => e.status === 'deferred');
  const processedEmails = state.inbox.filter((e) => e.status !== 'deferred');

  state.inbox = deferredEmails.map((email) => ({
    ...email,
    status: 'pending' as const,
    timeSpentMs: 0,
  }));

  state.analyticsState.totalEmailsProcessed += processedEmails.length;

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.day.ended',
    timestamp: state.updatedAt,
    payload: {
      day: state.currentDay - 1,
      emailsProcessed: processedEmails.length,
      emailsDeferred: deferredEmails.length,
    },
  });
  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.day.started',
    timestamp: state.updatedAt,
    payload: {
      day: state.currentDay,
      deferredEmailsCarried: deferredEmails.length,
    },
  });
}

export function handleFlagDiscrepancy(
  state: GameState,
  action: FlagDiscrepancyPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase('FLAG_DISCREPANCY', state.currentPhase)) {
    throw new Error('FLAG_DISCREPANCY not allowed in current phase');
  }
  const packet = state.verificationPackets?.[action.emailId];
  if (!packet) {
    throw new Error('No verification packet found for this email');
  }

  const artifact = packet.artifacts.find((a) => a.artifactId === action.artifactId);
  if (!artifact) {
    throw new Error('Artifact not found in packet');
  }

  events.push({
    eventId: crypto.randomUUID(),
    eventType: 'game.verification.discrepancy_flagged',
    timestamp: state.updatedAt,
    payload: {
      emailId: action.emailId,
      packetId: packet.packetId,
      artifactId: action.artifactId,
      documentType: artifact.documentType,
      reason: action.reason,
    },
  });
}
