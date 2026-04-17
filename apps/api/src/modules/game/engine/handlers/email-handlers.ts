import {
  DAY_PHASES,
  GAME_ACTIONS,
  type GameState,
  type EmailState,
  type EmailInstance,
  type AckDayStartPayload,
  type LoadInboxPayload,
  type OpenEmailPayload,
  type MarkIndicatorPayload,
  type RequestVerificationPayload,
  type SubmitDecisionPayload,
} from '@the-dmz/shared';

import {
  resolveDecision,
  type DecisionEvaluationResult,
} from '../../email-instance/decision-resolution.service.js';
import { assembleVerificationPacket } from '../../verification/verification-packet.service.js';
import {
  clampTrustScore,
  calculateXPForLevel,
  getLevelFromXP,
  awardXPForDecision,
} from '../../../../game/consequence/index.js';
import { GAME_ENGINE_EVENTS } from '../events/index.js';

import { isActionAllowedInPhase } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

export function handleAckDayStart(
  state: GameState,
  _action: AckDayStartPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.ACK_DAY_START, state.currentPhase)) {
    throw new Error('ACK_DAY_START not allowed in current phase');
  }
  state.currentPhase = DAY_PHASES.PHASE_EMAIL_INTAKE;
  events.push({
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.DAY_STARTED,
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
    eventType: GAME_ENGINE_EVENTS.INBOX_LOADED,
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
  if (!isActionAllowedInPhase(GAME_ACTIONS.OPEN_EMAIL, state.currentPhase)) {
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
    eventType: GAME_ENGINE_EVENTS.EMAIL_OPENED,
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
    eventType: GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED,
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
    eventType: GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED,
    timestamp: state.updatedAt,
    payload: { emailId: action.emailId },
  });
  events.push({
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED,
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
    eventType: GAME_ENGINE_EVENTS.TRUST_CHANGED,
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
    eventType: GAME_ENGINE_EVENTS.CREDITS_CHANGED,
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
    eventType: GAME_ENGINE_EVENTS.LEVEL_UP,
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

export interface EmailSubmittedContext {
  events: DomainEvent[];
  state: GameState;
  emailId: string;
  decision: SubmitDecisionPayload['decision'];
  timeSpentMs: number;
  evaluationError?: boolean;
}

function pushEmailDecisionSubmittedEvent(ctx: EmailSubmittedContext): void {
  ctx.events.push({
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
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

export interface DecisionEvaluatedContext {
  events: DomainEvent[];
  state: GameState;
  emailId: string;
  decision: SubmitDecisionPayload['decision'];
  evaluation: DecisionEvaluationResult;
}

function pushDecisionEvaluatedEvent(ctx: DecisionEvaluatedContext): void {
  ctx.events.push({
    eventId: crypto.randomUUID(),
    eventType: GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED,
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

export interface ResolveDecisionContext {
  state: GameState;
  emailToDecide: EmailState;
  emailInstance: EmailInstance;
  action: SubmitDecisionPayload;
  events: DomainEvent[];
}

function resolveAndApplyDecision(ctx: ResolveDecisionContext): void {
  const { state, emailToDecide, emailInstance, action, events } = ctx;
  const previousTrustScore = state.trustScore;
  const previousFunds = state.funds;
  const previousXP = state.playerXP;

  let decisionEvaluation;
  try {
    decisionEvaluation = resolveDecision({
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
    Math.max(0, Math.min(500, state.trustScore + decisionEvaluation.trustImpact)),
  );
  state.funds = Math.max(0, state.funds + decisionEvaluation.fundsImpact);

  const xpAwarded = awardXPForDecision(decisionEvaluation.isCorrect, emailInstance.difficulty ?? 3);
  processLevelUp(state, previousXP, xpAwarded, events);

  applyFactionImpact(state, emailInstance, decisionEvaluation.factionImpact);

  pushTrustChangeEvent(events, state, {
    previousTrustScore,
    evaluation: decisionEvaluation,
    emailId: action.emailId,
    decision: action.decision,
  });
  pushFundsChangeEvent(events, state, {
    previousFunds,
    evaluation: decisionEvaluation,
    emailId: action.emailId,
    decision: action.decision,
  });

  pushDecisionEvaluatedEvent({
    events,
    state,
    emailId: action.emailId,
    decision: action.decision,
    evaluation: decisionEvaluation,
  });

  incrementDecisionAnalytics(state, action.decision);
}

export function handleSubmitDecision(
  state: GameState,
  action: SubmitDecisionPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.SUBMIT_DECISION, state.currentPhase)) {
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
