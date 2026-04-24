import type { DomainEvent } from '../../../../shared/events/event-types.js';

export const GAME_ENGINE_EVENTS = {
  SESSION_STARTED: 'game.session.started',
  SESSION_ENDED: 'game.session.ended',
  SESSION_PAUSED: 'game.session.paused',
  SESSION_RESUMED: 'game.session.resumed',
  SESSION_COMPLETED: 'game.session.completed',
  SESSION_ABANDONED: 'game.session.abandoned',
  SESSION_BREACH_RECOVERY: 'game.session.breach_recovery',
  DAY_STARTED: 'game.day.started',
  DAY_PHASE_CHANGED: 'game.day.phase.changed',
  DAY_ENDED: 'game.day.ended',
  INBOX_LOADED: 'game.inbox.loaded',
  EMAIL_RECEIVED: 'game.email.received',
  EMAIL_OPENED: 'game.email.opened',
  EMAIL_INDICATOR_MARKED: 'game.email.indicator_marked',
  EMAIL_HEADER_VIEWED: 'game.email.header.viewed',
  EMAIL_URL_HOVERED: 'game.email.url.hovered',
  EMAIL_ATTACHMENT_PREVIEWED: 'game.email.attachment.previewed',
  EMAIL_VERIFICATION_REQUESTED: 'game.email.verification_requested',
  EMAIL_DECISION_SUBMITTED: 'game.email.decision_submitted',
  EMAIL_DECISION_RESOLVED: 'game.email.decision_resolved',
  EMAIL_DECISION_EVALUATED: 'game.email.decision_evaluated',
  DECISION_APPROVED: 'game.decision.approved',
  DECISION_DENIED: 'game.decision.denied',
  DECISION_FLAGGED: 'game.decision.flagged',
  DECISION_VERIFICATION_REQUESTED: 'game.decision.verification_requested',
  VERIFICATION_PACKET_OPENED: 'game.verification.packet_opened',
  VERIFICATION_PACKET_GENERATED: 'game.verification.packet_generated',
  VERIFICATION_OUT_OF_BAND_INITIATED: 'game.verification.out_of_band_initiated',
  VERIFICATION_RESULT: 'game.verification.result',
  CONSEQUENCES_APPLIED: 'game.consequences.applied',
  THREATS_GENERATED: 'game.threats.generated',
  THREAT_ATTACK_LAUNCHED: 'threat.attack.launched',
  THREAT_ATTACK_MITIGATED: 'threat.attack.mitigated',
  THREAT_ATTACK_SUCCEEDED: 'threat.attack.succeeded',
  THREAT_BREACH_OCCURRED: 'threat.breach.occurred',
  THREAT_LEVEL_CHANGED: 'threat.level.changed',
  INCIDENT_CREATED: 'game.incident.created',
  INCIDENT_RESOLVED: 'game.incident.resolved',
  INCIDENT_RESPONSE_ACTION_TAKEN: 'incident.response.action_taken',
  BREACH_OCCURRED: 'game.breach.occurred',
  BREACH_RANSOM_DISPLAYED: 'game.breach.ransom_displayed',
  BREACH_RANSOM_PAID: 'game.breach.ransom_paid',
  BREACH_RANSOM_REFUSED: 'game.breach.ransom_refused',
  BREACH_RECOVERY_STARTED: 'game.breach.recovery_started',
  BREACH_RECOVERY_COMPLETED: 'game.breach.recovery_completed',
  BREACH_POST_EFFECTS_STARTED: 'game.breach.post_effects_started',
  SESSION_GAME_OVER: 'game.session.game_over',
  UPGRADE_PURCHASED: 'game.upgrade.purchased',
  RESOURCE_ADJUSTED: 'game.resource.adjusted',
  CREDITS_CHANGED: 'game.economy.credits_changed',
  TRUST_CHANGED: 'game.economy.trust_changed',
  INTEL_CHANGED: 'game.economy.intel_changed',
  LEVEL_UP: 'game.economy.level_up',
} as const;

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
