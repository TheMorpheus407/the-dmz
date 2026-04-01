import type { GameState, ProcessThreatsPayload } from '@the-dmz/shared';

import { ThreatEngineService } from '../../threat-engine/index.js';

import { isActionAllowedInPhase, aggregateSecurityDeltas } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

const threatEngine = new ThreatEngineService();

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
