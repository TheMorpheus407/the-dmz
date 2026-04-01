import type { GameState, FlagDiscrepancyPayload } from '@the-dmz/shared';

import { isActionAllowedInPhase } from './handler-utils.js';

import type { DomainEvent } from './handler-utils.js';

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
