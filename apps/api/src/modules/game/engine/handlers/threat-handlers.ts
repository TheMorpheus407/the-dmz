import { GAME_ACTIONS, type GameState, type ProcessThreatsPayload } from '@the-dmz/shared';

import { GAME_ENGINE_EVENTS } from '../events/shared-types.js';
import { ThreatEngineService } from '../../threat-engine/index.js';

import { isActionAllowedInPhase, aggregateSecurityDeltas, createGameEvent } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

const threatEngine = new ThreatEngineService();

export function handleProcessThreats(
  state: GameState,
  action: ProcessThreatsPayload,
  events: DomainEvent[],
): void {
  if (!isActionAllowedInPhase(GAME_ACTIONS.PROCESS_THREATS, state.currentPhase)) {
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

  events.push(createGameEvent(
    GAME_ENGINE_EVENTS.THREATS_GENERATED,
    {
      day: action.dayNumber,
      attacks: threatResult.attacks,
      threatTier: threatResult.newThreatTier,
      coopScalingApplied: threatResult.coopScalingApplied,
    },
    state.updatedAt,
  ));

  if (threatResult.tierChanged) {
    const tierChangeResult = threatEngine.calculateThreatTier(state, sessionId);
    if (tierChangeResult.event) {
      events.push(createGameEvent(
        GAME_ENGINE_EVENTS.THREAT_LEVEL_CHANGED,
        {
          previousTier: tierChangeResult.event.previousTier,
          newTier: tierChangeResult.event.newTier,
          reason: tierChangeResult.event.reason,
          narrativeMessage: tierChangeResult.event.narrativeMessage,
        },
        state.updatedAt,
      ));
    }
  }
}
