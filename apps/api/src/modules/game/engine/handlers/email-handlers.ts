import {
  DAY_PHASES,
  GAME_ACTIONS,
  type GameState,
  type EmailState,
  type EmailInstance,
  type DayPhase,
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

import { isActionAllowedInPhase, createGameEvent } from './handler-utils.js';

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
  events.push(createGameEvent(GAME_ENGINE_EVENTS.DAY_STARTED, { day: state.currentDay }, state.updatedAt));
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

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.INBOX_LOADED,
    {
      day: state.currentDay,
      emailCount: action.emails.length,
    },
    state.updatedAt,
  ));
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
  events.push(createGameEvent(GAME_ENGINE_EVENTS.EMAIL_OPENED, { emailId: action.emailId }, state.updatedAt));
}

export function handleMarkIndicator(
  state: GameState,
  action: MarkIndicatorPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.MARK_INDICATOR, state.currentPhase)) {
    throw new Error('MARK_INDICATOR not allowed in current phase');
  }
  const targetEmail = state.inbox.find((e) => e.emailId === action.emailId);
  if (targetEmail) {
    if (!targetEmail.indicators.includes(action.indicatorType)) {
      targetEmail.indicators.push(action.indicatorType);
    }
  }
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.EMAIL_INDICATOR_MARKED,
    { emailId: action.emailId, indicatorType: action.indicatorType },
    state.updatedAt,
  ));
}

export function handleRequestVerification(
  state: GameState,
  action: RequestVerificationPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.REQUEST_VERIFICATION, state.currentPhase)) {
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
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.EMAIL_VERIFICATION_REQUESTED,
    { emailId: action.emailId },
    state.updatedAt,
  ));
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.VERIFICATION_PACKET_GENERATED,
    {
      emailId: action.emailId,
      packetId: packet.packetId,
      artifactCount: packet.artifacts.length,
      hasIntelligenceBrief: packet.hasIntelligenceBrief,
    },
    state.updatedAt,
  ));
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
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.TRUST_CHANGED,
    {
      sessionId: state.sessionId,
      amount: ctx.evaluation.trustImpact,
      balanceBefore: ctx.previousTrustScore,
      balanceAfter: state.trustScore,
      reason: ctx.evaluation.isCorrect ? 'decision_correct' : 'decision_incorrect',
      context: { emailId: ctx.emailId, decision: ctx.decision },
    },
    state.updatedAt,
  ));
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
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.CREDITS_CHANGED,
    {
      sessionId: state.sessionId,
      amount: ctx.evaluation.fundsImpact,
      balanceBefore: ctx.previousFunds,
      balanceAfter: state.funds,
      reason: ctx.evaluation.isCorrect ? 'client_approval' : 'client_denial',
      context: { emailId: ctx.emailId, decision: ctx.decision },
    },
    state.updatedAt,
  ));
}

function applyLevelUp(
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
  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.LEVEL_UP,
    {
      sessionId: state.sessionId,
      previousLevel,
      newLevel,
      xpRequired: calculateXPForLevel(newLevel),
      xpAwarded: state.playerXP - previousXP,
    },
    state.updatedAt,
  ));
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
  ctx.events.push(createGameEvent(
    GAME_ENGINE_EVENTS.EMAIL_DECISION_SUBMITTED,
    {
      emailId: ctx.emailId,
      decision: ctx.decision,
      timeSpentMs: ctx.timeSpentMs,
      ...(ctx.evaluationError && { evaluationError: true }),
    },
    ctx.state.updatedAt,
  ));
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
  ctx.events.push(createGameEvent(
    GAME_ENGINE_EVENTS.EMAIL_DECISION_EVALUATED,
    {
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
    ctx.state.updatedAt,
  ));
}

export interface ResolveDecisionContext {
  state: GameState;
  emailToDecide: EmailState;
  emailInstance: EmailInstance;
  action: SubmitDecisionPayload;
  events: DomainEvent[];
}

interface TryResolveDecisionOptions {
  decision: SubmitDecisionPayload['decision'];
  markedIndicators: string[];
  timeSpentMs: number;
  currentPhase: DayPhase;
}

function tryResolveDecision(
  emailInstance: EmailInstance,
  options: TryResolveDecisionOptions,
): DecisionEvaluationResult | null {
  try {
    return resolveDecision({
      email: emailInstance,
      decision: options.decision,
      markedIndicators: options.markedIndicators,
      timeSpentMs: options.timeSpentMs,
      currentPhase: options.currentPhase,
    });
  } catch {
    return null;
  }
}

interface HandleEvaluationErrorContext {
  events: DomainEvent[];
  state: GameState;
}

interface HandleEvaluationErrorParams {
  emailId: string;
  decision: SubmitDecisionPayload['decision'];
  timeSpentMs: number;
}

function handleEvaluationError(
  ctx: HandleEvaluationErrorContext,
  params: HandleEvaluationErrorParams,
): void {
  pushEmailDecisionSubmittedEvent({
    events: ctx.events,
    state: ctx.state,
    emailId: params.emailId,
    decision: params.decision,
    timeSpentMs: params.timeSpentMs,
    evaluationError: true,
  });
  incrementDecisionAnalytics(ctx.state, params.decision);
}

interface ApplyTrustAndFundsContext {
  state: GameState;
  events: DomainEvent[];
}

interface ApplyTrustAndFundsParams {
  emailInstance: EmailInstance;
  decision: SubmitDecisionPayload['decision'];
  decisionEvaluation: DecisionEvaluationResult;
  emailId: string;
}

function applyTrustAndFunds(
  ctx: ApplyTrustAndFundsContext,
  params: ApplyTrustAndFundsParams,
): void {
  const { state, events } = ctx;
  const { emailInstance, decision, decisionEvaluation, emailId } = params;
  const previousTrustScore = state.trustScore;
  const previousFunds = state.funds;
  const previousXP = state.playerXP;

  state.trustScore = clampTrustScore(
    Math.max(0, Math.min(500, state.trustScore + decisionEvaluation.trustImpact)),
  );
  state.funds = Math.max(0, state.funds + decisionEvaluation.fundsImpact);

  const xpAwarded = awardXPForDecision(decisionEvaluation.isCorrect, emailInstance.difficulty ?? 3);
  applyLevelUp(state, previousXP, xpAwarded, events);

  applyFactionImpact(state, emailInstance, decisionEvaluation.factionImpact);

  pushTrustChangeEvent(events, state, {
    previousTrustScore,
    evaluation: decisionEvaluation,
    emailId,
    decision,
  });
  pushFundsChangeEvent(events, state, {
    previousFunds,
    evaluation: decisionEvaluation,
    emailId,
    decision,
  });

  pushDecisionEvaluatedEvent({
    events,
    state,
    emailId,
    decision,
    evaluation: decisionEvaluation,
  });
}

function resolveAndApplyDecision(ctx: ResolveDecisionContext): void {
  const { state, emailToDecide, emailInstance, action, events } = ctx;

  const decisionEvaluation = tryResolveDecision(emailInstance, {
    decision: action.decision,
    markedIndicators: emailToDecide.indicators,
    timeSpentMs: action.timeSpentMs,
    currentPhase: state.currentPhase,
  });

  if (!decisionEvaluation) {
    handleEvaluationError(
      { events, state },
      { emailId: action.emailId, decision: action.decision, timeSpentMs: action.timeSpentMs },
    );
    return;
  }

  applyTrustAndFunds(
    { state, events },
    { emailInstance, decision: action.decision, decisionEvaluation, emailId: action.emailId },
  );

  incrementDecisionAnalytics(state, action.decision);
}

export function handleSubmitDecision(
  state: GameState,
  action: SubmitDecisionPayload,
  events: DomainEvent[],
): void {
  assertDecisionPhase(state);

  const emailToDecide = findEmailForDecision(state.inbox, action.emailId);
  if (!emailToDecide) {
    return;
  }

  emailToDecide.status = mapDecisionToStatus(action.decision);
  emailToDecide.timeSpentMs = action.timeSpentMs;

  const emailInstance = state.emailInstances[action.emailId];
  if (!emailInstance) {
    handleEvaluationError(
      { events, state },
      { emailId: action.emailId, decision: action.decision, timeSpentMs: action.timeSpentMs },
    );
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

export function assertDecisionPhase(state: GameState): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.SUBMIT_DECISION, state.currentPhase)) {
    throw new Error('SUBMIT_DECISION not allowed in current phase');
  }
}

export function findEmailForDecision(inbox: EmailState[], emailId: string): EmailState | undefined {
  return inbox.find((e) => e.emailId === emailId);
}

export function mapDecisionToStatus(
  decision: SubmitDecisionPayload['decision'],
): EmailState['status'] {
  const statusMap: Record<string, EmailState['status']> = {
    approve: 'approved',
    deny: 'denied',
    flag: 'flagged',
    request_verification: 'request_verification',
    defer: 'deferred',
  };
  return statusMap[decision] ?? 'pending';
}
