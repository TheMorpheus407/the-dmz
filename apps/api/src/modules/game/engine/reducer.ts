import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  type GameState,
  type GameActionPayload,
  type EmailState,
  type UpgradeDefinition,
  type UpgradeType,
} from '@the-dmz/shared';

import { resolveDecision } from '../email-instance/decision-resolution.service.js';
import { assembleVerificationPacket } from '../email-instance/verification-packet.service.js';
import { ThreatEngineService } from '../threat-engine/index.js';
import {
  clampTrustScore,
  calculateXPForLevel,
  getLevelFromXP,
  awardXPForDecision,
} from '../../../game/consequence/index.js';

import {
  canTransitionMacroState,
  canTransitionPhase,
  isActionAllowedInPhase,
  GameStateMachineError,
  type DayPhase,
  type SessionMacroState,
} from './state-machine.js';

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

const UPGRADE_CATALOG: Record<UpgradeType, UpgradeDefinition> = {
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

export interface ActionResult {
  success: boolean;
  newState: GameState;
  events: DomainEvent[];
  error?: GameStateMachineError;
}

export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const createInitialState = (
  sessionId: string,
  userId: string,
  tenantId: string,
  seed: number,
): GameState => ({
  sessionId,
  userId,
  tenantId,
  seed,
  currentDay: 1,
  currentMacroState: SESSION_MACRO_STATES.SESSION_INIT,
  currentPhase: DAY_PHASES.PHASE_DAY_START,
  funds: 1000,
  trustScore: 50,
  intelFragments: 0,
  playerLevel: 1,
  playerXP: 0,
  threatTier: 'low',
  facilityTier: 'outpost',
  facility: {
    tier: 'outpost',
    capacities: {
      rackCapacityU: 42,
      powerCapacityKw: 10,
      coolingCapacityTons: 5,
      bandwidthCapacityMbps: 100,
    },
    usage: {
      rackUsedU: 0,
      powerUsedKw: 0,
      coolingUsedTons: 0,
      bandwidthUsedMbps: 0,
    },
    clients: [],
    upgrades: [],
    maintenanceDebt: 0,
    facilityHealth: 100,
    operatingCostPerDay: 50,
    securityToolOpExPerDay: 0,
    attackSurfaceScore: 10,
    lastTickDay: 1,
  },
  inbox: [],
  emailInstances: {},
  verificationPackets: {},
  incidents: [],
  threats: [],
  narrativeState: {
    currentChapter: 1,
    activeTriggers: [],
    completedEvents: [],
  },
  factionRelations: {
    sovereign_compact: 50,
    nexion_industries: 50,
    librarians: 50,
    hacktivists: 50,
    criminals: 50,
  },
  blacklist: [],
  whitelist: [],
  analyticsState: {
    totalEmailsProcessed: 0,
    totalDecisions: 0,
    approvals: 0,
    denials: 0,
    flags: 0,
    verificationsRequested: 0,
    incidentsTriggered: 0,
    breaches: 0,
  },
  sequenceNumber: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createInitialGameState = (
  sessionId: string,
  userId: string,
  tenantId: string,
  seed?: number,
): GameState => {
  const gameSeed = seed ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return createInitialState(sessionId, userId, tenantId, gameSeed);
};

export const reduce = (state: GameState, action: GameActionPayload): ActionResult => {
  const events: DomainEvent[] = [];
  const newState = { ...state, updatedAt: new Date().toISOString() };

  try {
    switch (action.type) {
      case 'ACK_DAY_START':
        if (!isActionAllowedInPhase('ACK_DAY_START', state.currentPhase)) {
          throw new Error('ACK_DAY_START not allowed in current phase');
        }
        newState.currentPhase = DAY_PHASES.PHASE_EMAIL_INTAKE;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.day.started',
          timestamp: newState.updatedAt,
          payload: { day: newState.currentDay },
        });
        break;

      case 'LOAD_INBOX': {
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

        newState.emailInstances = emailInstances as GameState['emailInstances'];
        newState.inbox = inboxEntries;
        newState.currentPhase = DAY_PHASES.PHASE_TRIAGE;

        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.inbox.loaded',
          timestamp: newState.updatedAt,
          payload: {
            day: newState.currentDay,
            emailCount: action.emails.length,
          },
        });
        break;
      }

      case 'OPEN_EMAIL': {
        if (!isActionAllowedInPhase('OPEN_EMAIL', state.currentPhase)) {
          throw new Error('OPEN_EMAIL not allowed in current phase');
        }
        const email = newState.inbox.find((e) => e.emailId === action.emailId);
        if (!email) {
          throw new Error('Email not found');
        }
        if (email.status === 'pending') {
          email.status = 'opened';
          email.openedAt = newState.updatedAt;
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.opened',
          timestamp: newState.updatedAt,
          payload: { emailId: action.emailId },
        });
        break;
      }

      case 'MARK_INDICATOR': {
        if (!isActionAllowedInPhase('MARK_INDICATOR', state.currentPhase)) {
          throw new Error('MARK_INDICATOR not allowed in current phase');
        }
        const targetEmail = newState.inbox.find((e) => e.emailId === action.emailId);
        if (targetEmail) {
          if (!targetEmail.indicators.includes(action.indicatorType)) {
            targetEmail.indicators.push(action.indicatorType);
          }
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.indicator_marked',
          timestamp: newState.updatedAt,
          payload: { emailId: action.emailId, indicatorType: action.indicatorType },
        });
        break;
      }

      case 'REQUEST_VERIFICATION': {
        if (!isActionAllowedInPhase('REQUEST_VERIFICATION', state.currentPhase)) {
          throw new Error('REQUEST_VERIFICATION not allowed in current phase');
        }
        const emailToVerify = newState.inbox.find((e) => e.emailId === action.emailId);
        if (emailToVerify) {
          emailToVerify.verificationRequested = true;
          emailToVerify.status = 'request_verification';
        }

        const emailInstance = newState.emailInstances[action.emailId];

        newState.verificationPackets = newState.verificationPackets || {};

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

        newState.verificationPackets[action.emailId] = packet;

        newState.analyticsState.verificationsRequested++;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.email.verification_requested',
          timestamp: newState.updatedAt,
          payload: { emailId: action.emailId },
        });
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.verification.packet_generated',
          timestamp: newState.updatedAt,
          payload: {
            emailId: action.emailId,
            packetId: packet.packetId,
            artifactCount: packet.artifacts.length,
            hasIntelligenceBrief: packet.hasIntelligenceBrief,
          },
        });
        break;
      }

      case 'SUBMIT_DECISION': {
        if (!isActionAllowedInPhase('SUBMIT_DECISION', state.currentPhase)) {
          throw new Error('SUBMIT_DECISION not allowed in current phase');
        }
        const emailToDecide = newState.inbox.find((e) => e.emailId === action.emailId);
        if (emailToDecide) {
          const statusMap: Record<string, EmailState['status']> = {
            approve: 'approved',
            deny: 'denied',
            flag: 'flagged',
            request_verification: 'request_verification',
            defer: 'deferred',
          };
          emailToDecide.status = statusMap[action.decision] ?? 'pending';
          emailToDecide.timeSpentMs = action.timeSpentMs;

          const emailInstance = newState.emailInstances[action.emailId];
          if (emailInstance) {
            try {
              const evaluation = resolveDecision({
                email: emailInstance,
                decision: action.decision,
                markedIndicators: emailToDecide.indicators,
                timeSpentMs: action.timeSpentMs,
                currentPhase: state.currentPhase,
              });

              const previousTrustScore = newState.trustScore;
              const previousFunds = newState.funds;
              const previousXP = newState.playerXP;

              newState.trustScore = clampTrustScore(
                Math.max(0, Math.min(500, newState.trustScore + evaluation.trustImpact)),
              );
              newState.funds = Math.max(0, newState.funds + evaluation.fundsImpact);

              const xpAwarded = awardXPForDecision(
                evaluation.isCorrect,
                emailInstance.difficulty ?? 3,
              );
              if (xpAwarded > 0) {
                newState.playerXP += xpAwarded;
                const previousLevel = getLevelFromXP(previousXP);
                const newLevel = getLevelFromXP(newState.playerXP);

                if (newLevel > previousLevel) {
                  newState.playerLevel = newLevel;
                  events.push({
                    eventId: crypto.randomUUID(),
                    eventType: 'game.economy.level_up',
                    timestamp: newState.updatedAt,
                    payload: {
                      sessionId: newState.sessionId,
                      previousLevel,
                      newLevel,
                      xpRequired: calculateXPForLevel(newLevel),
                      xpAwarded: newState.playerXP - previousXP,
                    },
                  });
                }
              }

              if (emailInstance.faction && evaluation.factionImpact !== 0) {
                const currentFactionRelation =
                  newState.factionRelations[emailInstance.faction] ?? 50;
                newState.factionRelations[emailInstance.faction] = Math.max(
                  0,
                  Math.min(100, currentFactionRelation + evaluation.factionImpact),
                );
              }

              if (evaluation.trustImpact !== 0) {
                events.push({
                  eventId: crypto.randomUUID(),
                  eventType: 'game.economy.trust_changed',
                  timestamp: newState.updatedAt,
                  payload: {
                    sessionId: newState.sessionId,
                    amount: evaluation.trustImpact,
                    balanceBefore: previousTrustScore,
                    balanceAfter: newState.trustScore,
                    reason: evaluation.isCorrect ? 'decision_correct' : 'decision_incorrect',
                    context: { emailId: action.emailId, decision: action.decision },
                  },
                });
              }

              if (evaluation.fundsImpact !== 0) {
                events.push({
                  eventId: crypto.randomUUID(),
                  eventType: 'game.economy.credits_changed',
                  timestamp: newState.updatedAt,
                  payload: {
                    sessionId: newState.sessionId,
                    amount: evaluation.fundsImpact,
                    balanceBefore: previousFunds,
                    balanceAfter: newState.funds,
                    reason: evaluation.isCorrect ? 'client_approval' : 'client_denial',
                    context: { emailId: action.emailId, decision: action.decision },
                  },
                });
              }

              events.push({
                eventId: crypto.randomUUID(),
                eventType: 'game.email.decision_evaluated',
                timestamp: newState.updatedAt,
                payload: {
                  emailId: action.emailId,
                  decision: action.decision,
                  isCorrect: evaluation.isCorrect,
                  trustImpact: evaluation.trustImpact,
                  fundsImpact: evaluation.fundsImpact,
                  factionImpact: evaluation.factionImpact,
                  threatImpact: evaluation.threatImpact,
                  explanation: evaluation.explanation,
                  indicatorsFound: evaluation.indicatorsFound,
                  indicatorsMissed: evaluation.indicatorsMissed,
                },
              });
            } catch {
              events.push({
                eventId: crypto.randomUUID(),
                eventType: 'game.email.decision_submitted',
                timestamp: newState.updatedAt,
                payload: {
                  emailId: action.emailId,
                  decision: action.decision,
                  timeSpentMs: action.timeSpentMs,
                  evaluationError: true,
                },
              });
            }
          } else {
            events.push({
              eventId: crypto.randomUUID(),
              eventType: 'game.email.decision_submitted',
              timestamp: newState.updatedAt,
              payload: {
                emailId: action.emailId,
                decision: action.decision,
                timeSpentMs: action.timeSpentMs,
              },
            });
          }
        }
        newState.analyticsState.totalDecisions++;
        if (action.decision === 'approve') {
          newState.analyticsState.approvals++;
        } else if (action.decision === 'deny') {
          newState.analyticsState.denials++;
        } else if (action.decision === 'flag') {
          newState.analyticsState.flags++;
        }
        break;
      }

      case 'PROCESS_THREATS': {
        if (!isActionAllowedInPhase('PROCESS_THREATS', state.currentPhase)) {
          throw new Error('PROCESS_THREATS not allowed in current phase');
        }

        const sessionId = state.sessionId;
        threatEngine.setThreatTier(sessionId, state.threatTier);

        const securityDeltas = aggregateSecurityDeltas(newState);

        const threatResult = threatEngine.generateAttacks(
          newState,
          sessionId,
          action.dayNumber,
          securityDeltas,
        );

        newState.threatTier = threatResult.newThreatTier;

        if (!newState.threats) {
          newState.threats = [];
        }
        newState.threats = [...newState.threats, ...threatResult.attacks];

        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.threats.generated',
          timestamp: newState.updatedAt,
          payload: {
            day: action.dayNumber,
            attacks: threatResult.attacks,
            threatTier: threatResult.newThreatTier,
          },
        });

        if (threatResult.tierChanged) {
          const tierChangeResult = threatEngine.calculateThreatTier(newState, sessionId);
          if (tierChangeResult.event) {
            events.push({
              eventId: crypto.randomUUID(),
              eventType: 'game.threat.tier_changed',
              timestamp: newState.updatedAt,
              payload: {
                previousTier: tierChangeResult.event.previousTier,
                newTier: tierChangeResult.event.newTier,
                reason: tierChangeResult.event.reason,
                narrativeMessage: tierChangeResult.event.narrativeMessage,
              },
            });
          }
        }
        break;
      }

      case 'RESOLVE_INCIDENT': {
        if (!isActionAllowedInPhase('RESOLVE_INCIDENT', state.currentPhase)) {
          throw new Error('RESOLVE_INCIDENT not allowed in current phase');
        }
        const incident = newState.incidents.find((i) => i.incidentId === action.incidentId);
        if (incident) {
          incident.status = 'resolved';
          incident.resolvedDay = newState.currentDay;
          incident.responseActions = action.responseActions;
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.incident.resolved',
          timestamp: newState.updatedAt,
          payload: { incidentId: action.incidentId, responseActions: action.responseActions },
        });
        break;
      }

      case 'PURCHASE_UPGRADE':
        if (!isActionAllowedInPhase('PURCHASE_UPGRADE', state.currentPhase)) {
          throw new Error('PURCHASE_UPGRADE not allowed in current phase');
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.upgrade.purchased',
          timestamp: newState.updatedAt,
          payload: { upgradeId: action.upgradeId },
        });
        break;

      case 'ADJUST_RESOURCE':
        if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
          throw new Error('ADJUST_RESOURCE not allowed in current phase');
        }
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.resource.adjusted',
          timestamp: newState.updatedAt,
          payload: { resourceId: action.resourceId, delta: action.delta },
        });
        break;

      case 'ONBOARD_CLIENT': {
        if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
          throw new Error('ONBOARD_CLIENT not allowed in current phase');
        }
        const facility = newState.facility;

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

        const newClient = {
          clientId: action.clientId,
          clientName: action.clientName,
          organization: action.organization,
          rackUnitsU: action.rackUnitsU,
          powerKw: action.powerKw,
          coolingTons: action.coolingTons,
          bandwidthMbps: action.bandwidthMbps,
          dailyRate: action.dailyRate,
          leaseStartDay: newState.currentDay,
          leaseEndDay: action.durationDays ? newState.currentDay + action.durationDays : null,
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
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'facility.client.onboarded',
          timestamp: newState.updatedAt,
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
        break;
      }

      case 'EVICT_CLIENT': {
        if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
          throw new Error('EVICT_CLIENT not allowed in current phase');
        }
        const facility = newState.facility;
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
          timestamp: newState.updatedAt,
          payload: {
            clientId: action.clientId,
            reason: action.reason,
          },
        });
        break;
      }

      case 'PROCESS_FACILITY_TICK': {
        if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
          throw new Error('PROCESS_FACILITY_TICK not allowed in current phase');
        }
        newState.currentDay = action.dayNumber;
        const facility = newState.facility;
        let totalRevenue = 0;
        let totalConsumption = 1.0;
        for (const client of facility.clients) {
          if (!client.isActive) continue;
          totalRevenue += client.dailyRate;
          const burstMultiplier =
            client.burstProfile === 'spiky' ? 1.5 : client.burstProfile === 'moderate' ? 1.2 : 1.0;
          totalConsumption *= burstMultiplier;
        }
        newState.funds += totalRevenue;
        if (totalRevenue > 0) {
          events.push({
            eventId: crypto.randomUUID(),
            eventType: 'game.economy.credits_changed',
            timestamp: newState.updatedAt,
            payload: {
              sessionId: newState.sessionId,
              amount: totalRevenue,
              balanceBefore: newState.funds - totalRevenue,
              balanceAfter: newState.funds,
              reason: 'client_approval',
              context: { day: action.dayNumber, clientCount: facility.clients.length },
            },
          });
        }
        facility.usage.rackUsedU = Math.floor(facility.usage.rackUsedU * totalConsumption);
        facility.usage.powerUsedKw = Math.floor(facility.usage.powerUsedKw * totalConsumption);
        facility.usage.coolingUsedTons = Math.floor(
          facility.usage.coolingUsedTons * totalConsumption,
        );
        facility.usage.bandwidthUsedMbps = Math.floor(
          facility.usage.bandwidthUsedMbps * totalConsumption,
        );
        const utilizationPercent = Math.max(
          facility.usage.rackUsedU / facility.capacities.rackCapacityU,
          facility.usage.powerUsedKw / facility.capacities.powerCapacityKw,
          facility.usage.coolingUsedTons / facility.capacities.coolingCapacityTons,
          facility.usage.bandwidthUsedMbps / facility.capacities.bandwidthCapacityMbps,
        );
        if (utilizationPercent > 0.9) {
          facility.maintenanceDebt += Math.floor((utilizationPercent - 0.9) * 100);
          facility.facilityHealth = Math.max(0, facility.facilityHealth - 2);
          events.push({
            eventId: crypto.randomUUID(),
            eventType: 'facility.resource.critical',
            timestamp: newState.updatedAt,
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
        facility.operatingCostPerDay = Math.floor(
          50 *
            (1 +
              facility.usage.rackUsedU / facility.capacities.rackCapacityU +
              facility.usage.powerUsedKw / facility.capacities.powerCapacityKw),
        );
        const totalOpEx = facility.operatingCostPerDay + (facility.securityToolOpExPerDay ?? 0);
        newState.funds -= totalOpEx;

        if (totalOpEx > 0) {
          events.push({
            eventId: crypto.randomUUID(),
            eventType: 'game.economy.credits_changed',
            timestamp: newState.updatedAt,
            payload: {
              sessionId: newState.sessionId,
              amount: -totalOpEx,
              balanceBefore: newState.funds + totalOpEx,
              balanceAfter: newState.funds,
              reason: 'operational_cost',
              context: { day: action.dayNumber },
            },
          });
        }

        processInstallations(newState, events);

        facility.lastTickDay = action.dayNumber;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'facility.tick.processed',
          timestamp: newState.updatedAt,
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
        break;
      }

      case 'UPGRADE_FACILITY_TIER': {
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
        if (newState.funds < upgrade.cost) {
          throw new Error('Insufficient funds for tier upgrade');
        }
        newState.funds -= upgrade.cost;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.economy.credits_changed',
          timestamp: newState.updatedAt,
          payload: {
            sessionId: newState.sessionId,
            amount: -upgrade.cost,
            balanceBefore: newState.funds + upgrade.cost,
            balanceAfter: newState.funds,
            reason: 'facility_upgrade',
            context: { fromTier: state.facilityTier, toTier: action.targetTier },
          },
        });
        newState.facilityTier = action.targetTier as typeof newState.facilityTier;
        newState.facility.tier = action.targetTier;
        newState.facility.capacities.rackCapacityU = upgrade.rack;
        newState.facility.capacities.powerCapacityKw = upgrade.power;
        newState.facility.capacities.coolingCapacityTons = upgrade.cooling;
        newState.facility.capacities.bandwidthCapacityMbps = upgrade.bandwidth;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'facility.tier.upgraded',
          timestamp: newState.updatedAt,
          payload: {
            fromTier: state.facilityTier,
            toTier: action.targetTier,
            cost: upgrade.cost,
          },
        });
        break;
      }

      case 'PURCHASE_FACILITY_UPGRADE': {
        if (!isActionAllowedInPhase('ADJUST_RESOURCE', state.currentPhase)) {
          throw new Error('PURCHASE_FACILITY_UPGRADE not allowed in current phase');
        }

        const upgradeDef = UPGRADE_CATALOG[action.upgradeType];
        if (!upgradeDef) {
          throw new Error(`Unknown upgrade type: ${action.upgradeType}`);
        }

        const tierOrder = ['outpost', 'station', 'vault', 'fortress', 'citadel'];
        const currentTierIndex = tierOrder.indexOf(newState.facilityTier);
        const requiredTierIndex = tierOrder.indexOf(upgradeDef.minTier);
        if (currentTierIndex < requiredTierIndex) {
          throw new Error(`Requires ${upgradeDef.minTier} tier. Current: ${newState.facilityTier}`);
        }

        for (const prereqId of upgradeDef.prerequisites) {
          const hasPrereq = newState.facility.upgrades.some(
            (u) => u.upgradeType === prereqId && u.isCompleted,
          );
          if (!hasPrereq) {
            throw new Error(`Prerequisite upgrade not completed: ${prereqId}`);
          }
        }

        if (newState.funds < upgradeDef.baseCost) {
          throw new Error('Insufficient funds for upgrade');
        }

        const alreadyInstalled = newState.facility.upgrades.some(
          (u) => u.upgradeType === action.upgradeType && u.isCompleted,
        );
        if (alreadyInstalled) {
          throw new Error('Upgrade already installed');
        }

        newState.funds -= upgradeDef.baseCost;

        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.economy.credits_changed',
          timestamp: newState.updatedAt,
          payload: {
            sessionId: newState.sessionId,
            amount: -upgradeDef.baseCost,
            balanceBefore: newState.funds + upgradeDef.baseCost,
            balanceAfter: newState.funds,
            reason: 'upgrade_purchase',
            context: { upgradeType: action.upgradeType, category: upgradeDef.category },
          },
        });

        const existingInProgress = newState.facility.upgrades.find(
          (u) => u.upgradeType === action.upgradeType && !u.isCompleted,
        );

        if (existingInProgress) {
          existingInProgress.status = 'installing';
          existingInProgress.completesDay = newState.currentDay + upgradeDef.installationDays;
          existingInProgress.tierLevel += 1;
        } else {
          const isZeroDayInstall = upgradeDef.installationDays === 0;
          const newUpgrade: (typeof newState.facility.upgrades)[number] = {
            upgradeId: crypto.randomUUID(),
            upgradeType: action.upgradeType,
            category: upgradeDef.category,
            tierLevel: 1,
            status: isZeroDayInstall ? 'completed' : 'installing',
            purchasedDay: newState.currentDay,
            completesDay: isZeroDayInstall
              ? newState.currentDay
              : newState.currentDay + upgradeDef.installationDays,
            isCompleted: isZeroDayInstall,
            ...(isZeroDayInstall && { completionDay: newState.currentDay }),
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
          newState.facility.upgrades.push(newUpgrade);
        }

        newState.facility.securityToolOpExPerDay = newState.facility.upgrades.reduce(
          (sum, u) => sum + (u.isCompleted ? u.opExPerDay : 0),
          0,
        );
        newState.facility.attackSurfaceScore = Math.max(
          0,
          newState.facility.attackSurfaceScore +
            newState.facility.upgrades.reduce((sum, u) => {
              if (u.isCompleted || u.upgradeType === action.upgradeType) {
                return sum + upgradeDef.threatSurfaceDelta;
              }
              return sum;
            }, 0),
        );

        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'facility.upgrade.purchased',
          timestamp: newState.updatedAt,
          payload: {
            upgradeType: action.upgradeType,
            category: upgradeDef.category,
            cost: upgradeDef.baseCost,
            installationDays: upgradeDef.installationDays,
            completesDay: newState.currentDay + upgradeDef.installationDays,
          },
        });

        if (upgradeDef.installationDays === 0) {
          applyUpgradeEffects(newState, action.upgradeType);
          events.push({
            eventId: crypto.randomUUID(),
            eventType: 'facility.upgrade.completed',
            timestamp: newState.updatedAt,
            payload: {
              upgradeType: action.upgradeType,
              category: upgradeDef.category,
              cost: upgradeDef.baseCost,
            },
          });
        }
        break;
      }

      case 'PAUSE_SESSION':
        if (
          !canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_PAUSED)
        ) {
          throw new Error('Cannot pause from current state');
        }
        newState.currentMacroState = SESSION_MACRO_STATES.SESSION_PAUSED;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.session.paused',
          timestamp: newState.updatedAt,
          payload: {},
        });
        break;

      case 'RESUME_SESSION':
        if (
          !canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ACTIVE)
        ) {
          throw new Error('Cannot resume from current state');
        }
        newState.currentMacroState = SESSION_MACRO_STATES.SESSION_ACTIVE;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.session.resumed',
          timestamp: newState.updatedAt,
          payload: {},
        });
        break;

      case 'ABANDON_SESSION':
        if (
          !canTransitionMacroState(state.currentMacroState, SESSION_MACRO_STATES.SESSION_ABANDONED)
        ) {
          throw new Error('Cannot abandon from current state');
        }
        newState.currentMacroState = SESSION_MACRO_STATES.SESSION_ABANDONED;
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.session.abandoned',
          timestamp: newState.updatedAt,
          payload: { reason: action.reason },
        });
        break;

      case 'ADVANCE_DAY': {
        if (!isActionAllowedInPhase('ADVANCE_DAY', state.currentPhase)) {
          throw new Error('ADVANCE_DAY not allowed in current phase');
        }
        newState.currentDay++;
        newState.currentPhase = DAY_PHASES.PHASE_DAY_START;

        const deferredEmails = newState.inbox.filter((e) => e.status === 'deferred');
        const processedEmails = newState.inbox.filter((e) => e.status !== 'deferred');

        newState.inbox = deferredEmails.map((email) => ({
          ...email,
          status: 'pending' as const,
          timeSpentMs: 0,
        }));

        newState.analyticsState.totalEmailsProcessed += processedEmails.length;

        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.day.ended',
          timestamp: newState.updatedAt,
          payload: {
            day: newState.currentDay - 1,
            emailsProcessed: processedEmails.length,
            emailsDeferred: deferredEmails.length,
          },
        });
        events.push({
          eventId: crypto.randomUUID(),
          eventType: 'game.day.started',
          timestamp: newState.updatedAt,
          payload: {
            day: newState.currentDay,
            deferredEmailsCarried: deferredEmails.length,
          },
        });
        break;
      }

      case 'APPLY_CONSEQUENCES':
      case 'CLOSE_VERIFICATION':
      case 'OPEN_VERIFICATION':
        break;

      case 'FLAG_DISCREPANCY': {
        if (!isActionAllowedInPhase('FLAG_DISCREPANCY', state.currentPhase)) {
          throw new Error('FLAG_DISCREPANCY not allowed in current phase');
        }
        const packet = newState.verificationPackets?.[action.emailId];
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
          timestamp: newState.updatedAt,
          payload: {
            emailId: action.emailId,
            packetId: packet.packetId,
            artifactId: action.artifactId,
            documentType: artifact.documentType,
            reason: action.reason,
          },
        });
        break;
      }

      default:
        throw new Error(`Unknown action type: ${(action as GameActionPayload).type}`);
    }

    newState.sequenceNumber++;
    return { success: true, newState, events };
  } catch (error) {
    return {
      success: false,
      newState,
      events: [],
      error:
        error instanceof GameStateMachineError
          ? error
          : new GameStateMachineError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
            ),
    };
  }
};

export const transitionPhase = (state: GameState, newPhase: DayPhase): ActionResult => {
  if (!canTransitionPhase(state.currentPhase, newPhase)) {
    return {
      success: false,
      newState: state,
      events: [],
      error: new GameStateMachineError(
        `Invalid phase transition from ${state.currentPhase} to ${newPhase}`,
        'INVALID_PHASE_TRANSITION',
      ),
    };
  }

  const newState = { ...state, currentPhase: newPhase, updatedAt: new Date().toISOString() };
  return { success: true, newState, events: [] };
};

export const transitionMacroState = (
  state: GameState,
  newMacroState: SessionMacroState,
): ActionResult => {
  if (!canTransitionMacroState(state.currentMacroState, newMacroState)) {
    return {
      success: false,
      newState: state,
      events: [],
      error: new GameStateMachineError(
        `Invalid macro state transition from ${state.currentMacroState} to ${newMacroState}`,
        'INVALID_MACRO_TRANSITION',
      ),
    };
  }

  const newState = {
    ...state,
    currentMacroState: newMacroState,
    updatedAt: new Date().toISOString(),
  };
  return { success: true, newState, events: [] };
};
