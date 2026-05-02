import { GAME_EVENT_TYPES } from '@the-dmz/shared';

import type { DomainEvent } from '../../../../shared/events/event-types.js';

export const GAME_ENGINE_EVENTS = {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  SESSION_STARTED: GAME_EVENT_TYPES.SESSION_STARTED as string,
  SESSION_ENDED: GAME_EVENT_TYPES.SESSION_ENDED as string,
  SESSION_PAUSED: GAME_EVENT_TYPES.SESSION_PAUSED as string,
  SESSION_RESUMED: GAME_EVENT_TYPES.SESSION_RESUMED as string,
  SESSION_COMPLETED: GAME_EVENT_TYPES.SESSION_COMPLETED as string,
  SESSION_ABANDONED: GAME_EVENT_TYPES.SESSION_ABANDONED as string,
  SESSION_BREACH_RECOVERY: GAME_EVENT_TYPES.SESSION_BREACH_RECOVERY as string,
  DAY_STARTED: GAME_EVENT_TYPES.DAY_STARTED as string,
  DAY_PHASE_CHANGED: GAME_EVENT_TYPES.DAY_PHASE_CHANGED as string,
  DAY_ENDED: GAME_EVENT_TYPES.DAY_ENDED as string,
  INBOX_LOADED: GAME_EVENT_TYPES.INBOX_LOADED as string,
  EMAIL_RECEIVED: GAME_EVENT_TYPES.EMAIL_RECEIVED as string,
  EMAIL_OPENED: GAME_EVENT_TYPES.EMAIL_OPENED as string,
  EMAIL_INDICATOR_MARKED: GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED as string,
  EMAIL_HEADER_VIEWED: GAME_EVENT_TYPES.EMAIL_HEADER_VIEWED as string,
  EMAIL_URL_HOVERED: GAME_EVENT_TYPES.EMAIL_URL_HOVERED as string,
  EMAIL_ATTACHMENT_PREVIEWED: GAME_EVENT_TYPES.EMAIL_ATTACHMENT_PREVIEWED as string,
  EMAIL_VERIFICATION_REQUESTED: GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED as string,
  EMAIL_DECISION_SUBMITTED: GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED as string,
  EMAIL_DECISION_RESOLVED: GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED as string,
  EMAIL_DECISION_EVALUATED: GAME_EVENT_TYPES.EMAIL_DECISION_EVALUATED as string,
  DECISION_APPROVED: GAME_EVENT_TYPES.DECISION_APPROVED as string,
  DECISION_DENIED: GAME_EVENT_TYPES.DECISION_DENIED as string,
  DECISION_FLAGGED: GAME_EVENT_TYPES.DECISION_FLAGGED as string,
  DECISION_VERIFICATION_REQUESTED: GAME_EVENT_TYPES.DECISION_VERIFICATION_REQUESTED as string,
  VERIFICATION_PACKET_OPENED: GAME_EVENT_TYPES.VERIFICATION_PACKET_OPENED as string,
  VERIFICATION_PACKET_GENERATED: GAME_EVENT_TYPES.VERIFICATION_PACKET_GENERATED as string,
  VERIFICATION_OUT_OF_BAND_INITIATED: GAME_EVENT_TYPES.VERIFICATION_OUT_OF_BAND_INITIATED as string,
  VERIFICATION_RESULT: GAME_EVENT_TYPES.VERIFICATION_RESULT as string,
  CONSEQUENCES_APPLIED: GAME_EVENT_TYPES.CONSEQUENCES_APPLIED as string,
  THREATS_GENERATED: GAME_EVENT_TYPES.THREATS_GENERATED as string,
  THREAT_ATTACK_LAUNCHED: GAME_EVENT_TYPES.THREAT_ATTACK_LAUNCHED as string,
  THREAT_ATTACK_MITIGATED: GAME_EVENT_TYPES.THREAT_ATTACK_MITIGATED as string,
  THREAT_ATTACK_SUCCEEDED: GAME_EVENT_TYPES.THREAT_ATTACK_SUCCEEDED as string,
  THREAT_BREACH_OCCURRED: GAME_EVENT_TYPES.THREAT_BREACH_OCCURRED as string,
  THREAT_LEVEL_CHANGED: GAME_EVENT_TYPES.THREAT_LEVEL_CHANGED as string,
  INCIDENT_CREATED: GAME_EVENT_TYPES.INCIDENT_CREATED as string,
  INCIDENT_RESOLVED: GAME_EVENT_TYPES.INCIDENT_RESOLVED as string,
  INCIDENT_RESPONSE_ACTION_TAKEN: GAME_EVENT_TYPES.INCIDENT_RESPONSE_ACTION_TAKEN as string,
  BREACH_OCCURRED: GAME_EVENT_TYPES.BREACH_OCCURRED as string,
  BREACH_RANSOM_DISPLAYED: GAME_EVENT_TYPES.BREACH_RANSOM_DISPLAYED as string,
  BREACH_RANSOM_PAID: GAME_EVENT_TYPES.BREACH_RANSOM_PAID as string,
  BREACH_RANSOM_REFUSED: GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED as string,
  BREACH_RECOVERY_STARTED: GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED as string,
  BREACH_RECOVERY_COMPLETED: GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED as string,
  BREACH_POST_EFFECTS_STARTED: GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED as string,
  SESSION_GAME_OVER: GAME_EVENT_TYPES.GAME_OVER as string,
  UPGRADE_PURCHASED: GAME_EVENT_TYPES.UPGRADE_PURCHASED as string,
  RESOURCE_ADJUSTED: GAME_EVENT_TYPES.RESOURCE_ADJUSTED as string,
  CREDITS_CHANGED: GAME_EVENT_TYPES.FUNDS_MODIFIED as string,
  TRUST_CHANGED: GAME_EVENT_TYPES.TRUST_MODIFIED as string,
  INTEL_CHANGED: GAME_EVENT_TYPES.INTEL_CHANGED as string,
  LEVEL_UP: GAME_EVENT_TYPES.LEVEL_UP as string,
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
} as const satisfies Record<string, string>;

export type GameEngineEventType = (typeof GAME_ENGINE_EVENTS)[keyof typeof GAME_ENGINE_EVENTS];

export interface GameEngineEventParams {
  source: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  version: number;
}

export type GameEngineDomainEvent<T extends GameEngineEventType = GameEngineEventType> =
  DomainEvent<GameEngineEventPayloadMap[T]>;

export interface SessionStartedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  day: number;
  seed: number;
  difficultyTier?: string;
}

export interface SessionEndedPayload {
  sessionId: string;
  userId: string;
  reason: string;
  durationMs: number;
}

export interface SessionPausedPayload {
  sessionId: string;
  userId: string;
}

export interface SessionResumedPayload {
  sessionId: string;
  userId: string;
}

export interface SessionCompletedPayload {
  sessionId: string;
  userId: string;
  reason: string;
}

export interface SessionAbandonedPayload {
  sessionId: string;
  userId: string;
  reason?: string;
}

export interface SessionBreachRecoveryPayload {
  sessionId: string;
  userId: string;
  recoveryDays: number;
}

export interface DayStartedPayload {
  sessionId: string;
  day: number;
}

export interface DayPhaseChangedPayload {
  sessionId: string;
  day: number;
  oldPhase: string;
  newPhase: string;
}

export interface DayEndedPayload {
  sessionId: string;
  day: number;
}

export interface InboxLoadedPayload {
  sessionId: string;
  day: number;
  emailCount: number;
}

export interface EmailReceivedPayload {
  sessionId: string;
  emailId: string;
  difficultyTier?: string;
  scenarioId?: string;
  contentVersion?: string;
  competencyTags?: string[];
}

export interface EmailOpenedPayload {
  sessionId: string;
  emailId: string;
  viewMode?: string;
}

export interface EmailIndicatorMarkedPayload {
  sessionId: string;
  emailId: string;
  indicatorType: string;
  location?: string;
}

export interface EmailHeaderViewedPayload {
  sessionId: string;
  emailId: string;
  headerName: string;
}

export interface EmailUrlHoveredPayload {
  sessionId: string;
  emailId: string;
  url: string;
}

export interface EmailAttachmentPreviewedPayload {
  sessionId: string;
  emailId: string;
  attachmentId: string;
  attachmentName: string;
}

export interface EmailVerificationRequestedPayload {
  sessionId: string;
  emailId: string;
}

export interface EmailDecisionSubmittedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeSpentMs: number;
  outcome?: string;
  competencyTags?: string[];
}

export interface EmailDecisionResolvedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
}

export interface EmailDecisionEvaluatedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  isCorrect: boolean;
  trustImpact: number;
  fundsImpact: number;
  factionImpact: number;
  threatImpact: number;
  explanation: string;
  indicatorsFound: string[];
  indicatorsMissed: string[];
}

export interface DecisionApprovedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeToDecisionMs: number;
  outcome: string;
  competencyTags?: string[];
}

export interface DecisionDeniedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeToDecisionMs: number;
  outcome: string;
  competencyTags?: string[];
}

export interface DecisionFlaggedPayload {
  sessionId: string;
  emailId: string;
  decision: string;
  timeToDecisionMs: number;
  outcome: string;
  competencyTags?: string[];
}

export interface DecisionVerificationRequestedPayload {
  sessionId: string;
  emailId: string;
  reason: string;
}

export interface VerificationPacketOpenedPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
}

export interface VerificationPacketGeneratedPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
  artifactCount: number;
  hasIntelligenceBrief: boolean;
}

export interface VerificationOutOfBandInitiatedPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
  method: string;
}

export interface VerificationResultPayload {
  sessionId: string;
  emailId: string;
  packetId: string;
  result: string;
  isValid: boolean;
}

export interface ConsequencesAppliedPayload {
  sessionId: string;
  day: number;
  fundsDelta: number;
  trustScoreDelta: number;
}

export interface ThreatsGeneratedPayload {
  sessionId: string;
  day: number;
  attacks: unknown[];
}

export interface ThreatAttackLaunchedPayload {
  sessionId: string;
  attackId: string;
  threatTier: string;
  attackType: string;
}

export interface ThreatAttackMitigatedPayload {
  sessionId: string;
  attackId: string;
  threatTier: string;
  mitigationMethod: string;
}

export interface ThreatAttackSucceededPayload {
  sessionId: string;
  attackId: string;
  threatTier: string;
  impact: number;
}

export interface ThreatLevelChangedPayload {
  sessionId: string;
  previousLevel: string;
  newLevel: string;
  reason: string;
}

export interface IncidentCreatedPayload {
  sessionId: string;
  incidentId: string;
  severity: number;
  type: string;
}

export interface IncidentResolvedPayload {
  sessionId: string;
  incidentId: string;
  responseActions: string[];
}

export interface IncidentResponseActionTakenPayload {
  sessionId: string;
  incidentId: string;
  actionType: string;
  actionResult: string;
  competencyTags?: string[];
}

export interface BreachOccurredPayload {
  sessionId: string;
  userId: string;
  severity: number;
  ransomCost?: number;
}

export interface BreachRansomDisplayedPayload {
  severity: number;
  currentFunds: number;
  ransomAmount: number;
}

export interface BreachRansomPaidPayload {
  amount: number;
  remainingFunds: number;
}

export interface BreachRansomRefusedPayload {
  severity: number;
}

export interface BreachRecoveryStartedPayload {
  recoveryDays: number;
}

export interface BreachRecoveryCompletedPayload {
  daysInRecovery: number;
}

export interface BreachPostEffectsStartedPayload {
  revenueDepressionDays: number;
  increasedScrutinyDays: number;
  reputationImpactDays: number;
}

export interface SessionGameOverPayload {
  reason: string;
  daysSurvived: number;
  totalEarnings: number;
  breaches: number;
}

export interface UpgradePurchasedPayload {
  sessionId: string;
  upgradeId: string;
  cost: number;
}

export interface ResourceAdjustedPayload {
  sessionId: string;
  resourceId: string;
  delta: number;
}

export interface CreditsChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
  relatedEntityId?: string;
}

export interface TrustChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
}

export interface IntelChangedPayload {
  sessionId: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  context?: Record<string, unknown>;
}

export interface LevelUpPayload {
  sessionId: string;
  previousLevel: number;
  newLevel: number;
  xpRequired: number;
  xpAwarded: number;
}

export function createGameEngineEvent<T extends GameEngineEventType>(
  eventType: T,
  params: GameEngineEventParams,
  payload: GameEngineEventPayloadMap[T],
): GameEngineDomainEvent<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    correlationId: params.correlationId,
    tenantId: params.tenantId,
    userId: params.userId,
    source: params.source,
    version: params.version,
    payload,
  };
}

export type GameEngineEventPayloadMap = {
  [GAME_ENGINE_EVENTS.SESSION_STARTED]: SessionStartedPayload;
  [GAME_ENGINE_EVENTS.SESSION_ENDED]: SessionEndedPayload;
  [GAME_ENGINE_EVENTS.SESSION_PAUSED]: SessionPausedPayload;
  [GAME_ENGINE_EVENTS.SESSION_RESUMED]: SessionResumedPayload;
  [GAME_ENGINE_EVENTS.SESSION_COMPLETED]: SessionCompletedPayload;
  [GAME_ENGINE_EVENTS.SESSION_ABANDONED]: SessionAbandonedPayload;
  [GAME_ENGINE_EVENTS.SESSION_BREACH_RECOVERY]: SessionBreachRecoveryPayload;
  [GAME_ENGINE_EVENTS.DAY_STARTED]: DayStartedPayload;
  [GAME_ENGINE_EVENTS.DAY_PHASE_CHANGED]: DayPhaseChangedPayload;
  [GAME_ENGINE_EVENTS.DAY_ENDED]: DayEndedPayload;
  [GAME_ENGINE_EVENTS.INBOX_LOADED]: InboxLoadedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_RECEIVED]: EmailReceivedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_OPENED]: EmailOpenedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED]: EmailIndicatorMarkedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_HEADER_VIEWED]: EmailHeaderViewedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_URL_HOVERED]: EmailUrlHoveredPayload;
  [GAME_ENGINE_EVENTS.EMAIL_ATTACHMENT_PREVIEWED]: EmailAttachmentPreviewedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED]: EmailVerificationRequestedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED]: EmailDecisionSubmittedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_RESOLVED]: EmailDecisionResolvedPayload;
  [GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED]: EmailDecisionEvaluatedPayload;
  [GAME_ENGINE_EVENTS.DECISION_APPROVED]: DecisionApprovedPayload;
  [GAME_ENGINE_EVENTS.DECISION_DENIED]: DecisionDeniedPayload;
  [GAME_ENGINE_EVENTS.DECISION_FLAGGED]: DecisionFlaggedPayload;
  [GAME_ENGINE_EVENTS.DECISION_VERIFICATION_REQUESTED]: DecisionVerificationRequestedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_PACKET_OPENED]: VerificationPacketOpenedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED]: VerificationPacketGeneratedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_OUT_OF_BAND_INITIATED]: VerificationOutOfBandInitiatedPayload;
  [GAME_ENGINE_EVENTS.VERIFICATION_RESULT]: VerificationResultPayload;
  [GAME_ENGINE_EVENTS.CONSEQUENCES_APPLIED]: ConsequencesAppliedPayload;
  [GAME_ENGINE_EVENTS.THREATS_GENERATED]: ThreatsGeneratedPayload;
  [GAME_ENGINE_EVENTS.THREAT_ATTACK_LAUNCHED]: ThreatAttackLaunchedPayload;
  [GAME_ENGINE_EVENTS.THREAT_ATTACK_MITIGATED]: ThreatAttackMitigatedPayload;
  [GAME_ENGINE_EVENTS.THREAT_ATTACK_SUCCEEDED]: ThreatAttackSucceededPayload;
  [GAME_ENGINE_EVENTS.THREAT_BREACH_OCCURRED]: BreachOccurredPayload;
  [GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED]: ThreatLevelChangedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_CREATED]: IncidentCreatedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_RESOLVED]: IncidentResolvedPayload;
  [GAME_ENGINE_EVENTS.INCIDENT_RESPONSE_ACTION_TAKEN]: IncidentResponseActionTakenPayload;
  [GAME_ENGINE_EVENTS.BREACH_OCCURRED]: BreachOccurredPayload;
  [GAME_ENGINE_EVENTS.BREACH_RANSOM_DISPLAYED]: BreachRansomDisplayedPayload;
  [GAME_ENGINE_EVENTS.BREACH_RANSOM_PAID]: BreachRansomPaidPayload;
  [GAME_ENGINE_EVENTS.BREACH_RANSOM_REFUSED]: BreachRansomRefusedPayload;
  [GAME_ENGINE_EVENTS.BREACH_RECOVERY_STARTED]: BreachRecoveryStartedPayload;
  [GAME_ENGINE_EVENTS.BREACH_RECOVERY_COMPLETED]: BreachRecoveryCompletedPayload;
  [GAME_ENGINE_EVENTS.BREACH_POST_EFFECTS_STARTED]: BreachPostEffectsStartedPayload;
  [GAME_ENGINE_EVENTS.SESSION_GAME_OVER]: SessionGameOverPayload;
  [GAME_ENGINE_EVENTS.UPGRADE_PURCHASED]: UpgradePurchasedPayload;
  [GAME_ENGINE_EVENTS.RESOURCE_ADJUSTED]: ResourceAdjustedPayload;
  [GAME_ENGINE_EVENTS.CREDITS_CHANGED]: CreditsChangedPayload;
  [GAME_ENGINE_EVENTS.TRUST_CHANGED]: TrustChangedPayload;
  [GAME_ENGINE_EVENTS.INTEL_CHANGED]: IntelChangedPayload;
  [GAME_ENGINE_EVENTS.LEVEL_UP]: LevelUpPayload;
};
