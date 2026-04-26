import { GAME_EVENT_TYPES, type GameEventType } from '@the-dmz/shared';
import type { GameThreatTier } from '@the-dmz/shared/game';

export { GAME_EVENT_TYPES };

export type { GameEventType };

export interface GameEvent {
  id: string;
  type: GameEventType;
  occurredAt: string;
  payload: Record<string, unknown>;
  sessionId?: string;
  day?: number;
  phase?: string;
}

export interface SessionStartedPayload {
  userId: string;
  sessionId: string;
  seed: number;
  difficulty: string;
}

export interface EmailReceivedPayload {
  emailId: string;
  sender: string;
  senderDomain: string;
  urgency: 'low' | 'medium' | 'high';
  faction: string;
}

export interface DecisionPayload {
  decisionId: string;
  emailId: string;
  decisionType: 'approve' | 'deny' | 'flag' | 'request_verification' | 'defer';
  timeSpent: number;
  indicatorsUsed: string[];
}

export interface ConsequencePayload {
  trustDelta: number;
  fundsDelta: number;
  intelDelta: number;
  factionChanges: Record<string, number>;
  riskChange: number;
}

export interface ThreatPayload {
  threatLevel: GameThreatTier;
  attacksGenerated: number;
  incidentsTriggered: number;
}

export interface IncidentPayload {
  incidentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
}

export interface BreachPayload {
  breachId: string;
  RansomCost: number;
  recoveryDays: number;
  clientAttrition: number;
}

export interface ResourcePayload {
  rackSpace?: number;
  power?: number;
  cooling?: number;
  bandwidth?: number;
  clients?: number;
}

export interface UpgradePayload {
  upgradeId: string;
  upgradeType: string;
  cost: number;
  effect: Record<string, number>;
}

export interface DialogStartedPayload {
  dialogId: string;
  dialogName: string;
  startNodeId: string;
}

export interface DialogNodeAdvancedPayload {
  dialogId: string;
  previousNodeId: string;
  currentNodeId: string;
  speaker: string;
}

export interface DialogChoiceSelectedPayload {
  dialogId: string;
  nodeId: string;
  choiceId: string;
  choiceText: string;
  speaker: string;
}

export interface DialogCompletedPayload {
  dialogId: string;
  totalNodesVisited: number;
  totalChoices: number;
}

interface CreateGameEventOptions {
  type: GameEventType;
  payload: Record<string, unknown>;
  sessionId?: string;
  day?: number;
  phase?: string;
}

export function createGameEvent(options: CreateGameEventOptions): GameEvent {
  const { type, payload, sessionId, day, phase } = options;
  const event: GameEvent = {
    id: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  };

  if (sessionId !== undefined) event.sessionId = sessionId;
  if (day !== undefined) event.day = day;
  if (phase !== undefined) event.phase = phase;

  return event;
}
