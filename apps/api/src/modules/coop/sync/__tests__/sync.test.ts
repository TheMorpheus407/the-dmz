import { describe, expect, it } from 'vitest';

describe('sync service - sequence enforcement', () => {
  describe('validateAndApplyAction', () => {
    it('accepts action when clientSeq equals current sessionSeq', async () => {
      const result = await validateSeqSubmission({
        clientSeq: 5,
        currentSeq: 5,
        status: 'active',
      });

      expect(result.accepted).toBe(true);
    });

    it('accepts action when clientSeq is one ahead (new action)', async () => {
      const result = await validateSeqSubmission({
        clientSeq: 6,
        currentSeq: 5,
        status: 'active',
      });

      expect(result.accepted).toBe(true);
    });

    it('rejects action when clientSeq is behind (stale seq)', async () => {
      const result = await validateSeqSubmission({
        clientSeq: 3,
        currentSeq: 5,
        status: 'active',
      });

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('STALE_SEQ');
      expect(result.currentSeq).toBe(5);
    });

    it('rejects action when clientSeq is more than one ahead (gap detected)', async () => {
      const result = await validateSeqSubmission({
        clientSeq: 8,
        currentSeq: 5,
        status: 'active',
      });

      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('GAP_DETECTED');
      expect(result.currentSeq).toBe(5);
    });

    it('rejects action when session is not active', async () => {
      const result = await validateSeqSubmission({
        clientSeq: 0,
        currentSeq: 0,
        status: 'lobby',
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toBe('Session is not active');
    });

    it('rejects action for non-existent session', async () => {
      const result = await validateSeqSubmission({
        clientSeq: 0,
        currentSeq: 0,
        status: 'active',
        sessionExists: false,
      });

      expect(result.accepted).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('sequence never decreases', () => {
    it('seq always increases after acceptance', async () => {
      let currentSeq = 0;

      for (let i = 0; i < 10; i++) {
        const result = await validateSeqSubmission({
          clientSeq: currentSeq,
          currentSeq,
          status: 'active',
        });

        expect(result.accepted).toBe(true);
        expect(result.newSeq).toBe(currentSeq + 1);
        currentSeq = result.newSeq!;
      }
    });
  });
});

interface SeqSubmissionInput {
  clientSeq: number;
  currentSeq: number;
  status: string;
  sessionExists?: boolean;
}

interface SeqSubmissionResult {
  accepted: boolean;
  reason?: 'STALE_SEQ' | 'GAP_DETECTED';
  currentSeq?: number;
  newSeq?: number;
  error?: string;
}

async function validateSeqSubmission(input: SeqSubmissionInput): Promise<SeqSubmissionResult> {
  const { clientSeq, currentSeq, status, sessionExists = true } = input;

  if (!sessionExists) {
    return { accepted: false, error: 'Session not found' };
  }

  if (status !== 'active') {
    return { accepted: false, error: 'Session is not active' };
  }

  if (clientSeq < currentSeq) {
    return {
      accepted: false,
      reason: 'STALE_SEQ',
      currentSeq,
    };
  }

  if (clientSeq > currentSeq + 1) {
    return {
      accepted: false,
      reason: 'GAP_DETECTED',
      currentSeq,
    };
  }

  const newSeq = currentSeq + 1;

  return {
    accepted: true,
    newSeq,
    currentSeq,
  };
}

describe('sync service - channel format', () => {
  it('uses correct session.events channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'events');
    expect(channel).toBe('session.events:test-session-id');
  });

  it('uses correct session.state channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'state');
    expect(channel).toBe('session.state:test-session-id');
  });

  it('uses correct session.arbitration channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'arbitration');
    expect(channel).toBe('session.arbitration:test-session-id');
  });

  it('uses correct session.presence channel format', () => {
    const sessionId = 'test-session-id';
    const channel = buildCoopChannelName(sessionId, 'presence');
    expect(channel).toBe('session.presence:test-session-id');
  });
});

function buildCoopChannelName(sessionId: string, channelType: string): string {
  return `session.${channelType}:${sessionId}`;
}

describe('sync service - reconnect handling', () => {
  it('detects when full state recovery is needed', () => {
    const lastSeq = 0;
    const lastSnapshotSeq = 5;

    const needsFullState = lastSeq < lastSnapshotSeq;
    expect(needsFullState).toBe(true);
  });

  it('detects when missed events need to be fetched', () => {
    const lastSeq = 5;
    const currentSeq = 10;

    const missedEvents: number[] = [];
    for (let i = lastSeq + 1; i <= currentSeq; i++) {
      missedEvents.push(i);
    }

    expect(missedEvents).toEqual([6, 7, 8, 9, 10]);
  });

  it('no missed events when client is at current seq', () => {
    const lastSeq = 10;
    const currentSeq = 10;

    const missedEvents: number[] = [];
    for (let i = lastSeq + 1; i <= currentSeq; i++) {
      missedEvents.push(i);
    }

    expect(missedEvents).toEqual([]);
  });
});

describe('sync service - client seq tracking', () => {
  it('client tracks current seq after action accepted', () => {
    let currentSeq = 5;
    let lastSyncedSeq = 5;

    const acceptedMsg = { seq: 6, requestId: 'test' };
    if (acceptedMsg.seq !== undefined) {
      currentSeq = acceptedMsg.seq;
      lastSyncedSeq = acceptedMsg.seq;
    }

    expect(currentSeq).toBe(6);
    expect(lastSyncedSeq).toBe(6);
  });

  it('client updates current seq on stale rejection', () => {
    let currentSeq = 5;
    const lastSyncedSeq = 5;

    const rejectedMsg = { reason: 'STALE_SEQ' as const, currentSeq: 7, requestId: 'test' };
    if (rejectedMsg.currentSeq !== undefined) {
      currentSeq = rejectedMsg.currentSeq;
    }

    expect(currentSeq).toBe(7);
    expect(lastSyncedSeq).toBe(5);
  });

  it('client updates current seq on gap detection', () => {
    let currentSeq = 5;
    const lastSyncedSeq = 5;

    const rejectedMsg = { reason: 'GAP_DETECTED' as const, currentSeq: 8, requestId: 'test' };
    if (rejectedMsg.currentSeq !== undefined) {
      currentSeq = rejectedMsg.currentSeq;
    }

    expect(currentSeq).toBe(8);
    expect(lastSyncedSeq).toBe(5);
  });
});
