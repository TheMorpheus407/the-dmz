import { describe, expect, it, vi } from 'vitest';

type SignalCategory = 'decision' | 'urgency' | 'coordination' | 'resource';

const SIGNAL_CATEGORIES: SignalCategory[] = ['decision', 'urgency', 'coordination', 'resource'];

const SIGNAL_KEYS = [
  'signal.approve',
  'signal.deny',
  'signal.flag',
  'signal.verify',
  'signal.unsure',
  'signal.urgent',
  'signal.wait',
  'signal.clear',
  'signal.suspicious',
  'signal.coordinating',
  'signal.backup',
  'signal.done',
  'signal.ready',
  'signal.low_power',
  'signal.low_cooling',
  'signal.bandwidth_ok',
  'signal.space_low',
];

const QUICK_SIGNAL_RATE_LIMIT_MAX = 10;
const QUICK_SIGNAL_RATE_LIMIT_WINDOW_MS = 60_000;

function isValidSignalCategory(category: string): category is SignalCategory {
  return SIGNAL_CATEGORIES.includes(category as SignalCategory);
}

function isValidSignalKey(key: string): boolean {
  return SIGNAL_KEYS.includes(key);
}

function shouldAllowSignal(currentCount: number): boolean {
  return currentCount < QUICK_SIGNAL_RATE_LIMIT_MAX;
}

function calculateRetryAfterMs(ttl: number): number {
  return Math.max(0, ttl);
}

function isValidSignalContext(context: Record<string, unknown>): boolean {
  if (Object.keys(context).length > 10) {
    return false;
  }
  for (const value of Object.values(context)) {
    if (typeof value === 'string' && value.length > 200) {
      return false;
    }
    if (Array.isArray(value) && value.length > 50) {
      return false;
    }
  }
  return true;
}

function getSignalsByCategory(signalKey: string): SignalCategory | null {
  if (
    ['signal.approve', 'signal.deny', 'signal.flag', 'signal.verify', 'signal.unsure'].includes(
      signalKey,
    )
  ) {
    return 'decision';
  }
  if (['signal.urgent', 'signal.wait', 'signal.clear', 'signal.suspicious'].includes(signalKey)) {
    return 'urgency';
  }
  if (['signal.coordinating', 'signal.backup', 'signal.done', 'signal.ready'].includes(signalKey)) {
    return 'coordination';
  }
  if (
    ['signal.low_power', 'signal.low_cooling', 'signal.bandwidth_ok', 'signal.space_low'].includes(
      signalKey,
    )
  ) {
    return 'resource';
  }
  return null;
}

describe('quick signals service - signal categories', () => {
  it('should have four signal categories', () => {
    expect(SIGNAL_CATEGORIES).toHaveLength(4);
  });

  it('should include decision category', () => {
    expect(SIGNAL_CATEGORIES).toContain('decision');
  });

  it('should include urgency category', () => {
    expect(SIGNAL_CATEGORIES).toContain('urgency');
  });

  it('should include coordination category', () => {
    expect(SIGNAL_CATEGORIES).toContain('coordination');
  });

  it('should include resource category', () => {
    expect(SIGNAL_CATEGORIES).toContain('resource');
  });

  it('should validate correct signal categories', () => {
    expect(isValidSignalCategory('decision')).toBe(true);
    expect(isValidSignalCategory('urgency')).toBe(true);
    expect(isValidSignalCategory('coordination')).toBe(true);
    expect(isValidSignalCategory('resource')).toBe(true);
  });

  it('should reject invalid signal categories', () => {
    expect(isValidSignalCategory('invalid')).toBe(false);
    expect(isValidSignalCategory('')).toBe(false);
    expect(isValidSignalCategory('DECISION')).toBe(false);
  });
});

describe('quick signals service - signal keys', () => {
  it('should have 17 predefined signal keys', () => {
    expect(SIGNAL_KEYS).toHaveLength(17);
  });

  it('should include all decision signals', () => {
    expect(SIGNAL_KEYS).toContain('signal.approve');
    expect(SIGNAL_KEYS).toContain('signal.deny');
    expect(SIGNAL_KEYS).toContain('signal.flag');
    expect(SIGNAL_KEYS).toContain('signal.verify');
    expect(SIGNAL_KEYS).toContain('signal.unsure');
  });

  it('should include all urgency signals', () => {
    expect(SIGNAL_KEYS).toContain('signal.urgent');
    expect(SIGNAL_KEYS).toContain('signal.wait');
    expect(SIGNAL_KEYS).toContain('signal.clear');
    expect(SIGNAL_KEYS).toContain('signal.suspicious');
  });

  it('should include all coordination signals', () => {
    expect(SIGNAL_KEYS).toContain('signal.coordinating');
    expect(SIGNAL_KEYS).toContain('signal.backup');
    expect(SIGNAL_KEYS).toContain('signal.done');
    expect(SIGNAL_KEYS).toContain('signal.ready');
  });

  it('should include all resource signals', () => {
    expect(SIGNAL_KEYS).toContain('signal.low_power');
    expect(SIGNAL_KEYS).toContain('signal.low_cooling');
    expect(SIGNAL_KEYS).toContain('signal.bandwidth_ok');
    expect(SIGNAL_KEYS).toContain('signal.space_low');
  });

  it('should validate correct signal keys', () => {
    expect(isValidSignalKey('signal.approve')).toBe(true);
    expect(isValidSignalKey('signal.urgent')).toBe(true);
    expect(isValidSignalKey('signal.done')).toBe(true);
    expect(isValidSignalKey('signal.low_power')).toBe(true);
  });

  it('should reject invalid signal keys', () => {
    expect(isValidSignalKey('signal.invalid')).toBe(false);
    expect(isValidSignalKey('approve')).toBe(false);
    expect(isValidSignalKey('')).toBe(false);
  });
});

describe('quick signals service - rate limiting', () => {
  it('should have rate limit of 10 signals per minute', () => {
    expect(QUICK_SIGNAL_RATE_LIMIT_MAX).toBe(10);
  });

  it('should have rate limit window of 60 seconds', () => {
    expect(QUICK_SIGNAL_RATE_LIMIT_WINDOW_MS).toBe(60000);
  });

  it('should allow signals when under limit', () => {
    expect(shouldAllowSignal(0)).toBe(true);
    expect(shouldAllowSignal(5)).toBe(true);
    expect(shouldAllowSignal(9)).toBe(true);
  });

  it('should deny signals when at or over limit', () => {
    expect(shouldAllowSignal(10)).toBe(false);
    expect(shouldAllowSignal(11)).toBe(false);
    expect(shouldAllowSignal(100)).toBe(false);
  });

  it('should calculate retry after ms correctly', () => {
    expect(calculateRetryAfterMs(5000)).toBe(5000);
    expect(calculateRetryAfterMs(30000)).toBe(30000);
    expect(calculateRetryAfterMs(0)).toBe(0);
    expect(calculateRetryAfterMs(-1000)).toBe(0);
  });
});

describe('quick signals service - context validation', () => {
  it('should accept valid context', () => {
    expect(isValidSignalContext({})).toBe(true);
    expect(isValidSignalContext({ emailId: '123' })).toBe(true);
    expect(isValidSignalContext({ phase: 'analysis', decision: 'approve' })).toBe(true);
  });

  it('should reject context with too many keys', () => {
    const largeContext: Record<string, unknown> = {};
    for (let i = 0; i < 11; i++) {
      largeContext[`key${i}`] = `value${i}`;
    }
    expect(isValidSignalContext(largeContext)).toBe(false);
  });

  it('should reject context with overly long string values', () => {
    expect(isValidSignalContext({ longString: 'a'.repeat(201) })).toBe(false);
    expect(isValidSignalContext({ shortString: 'a'.repeat(200) })).toBe(true);
  });

  it('should reject context with overly long array values', () => {
    expect(isValidSignalContext({ longArray: Array(51).fill('item') })).toBe(false);
    expect(isValidSignalContext({ shortArray: Array(50).fill('item') })).toBe(true);
  });
});

describe('quick signals service - category mapping', () => {
  it('should map decision signals to decision category', () => {
    expect(getSignalsByCategory('signal.approve')).toBe('decision');
    expect(getSignalsByCategory('signal.deny')).toBe('decision');
    expect(getSignalsByCategory('signal.flag')).toBe('decision');
    expect(getSignalsByCategory('signal.verify')).toBe('decision');
    expect(getSignalsByCategory('signal.unsure')).toBe('decision');
  });

  it('should map urgency signals to urgency category', () => {
    expect(getSignalsByCategory('signal.urgent')).toBe('urgency');
    expect(getSignalsByCategory('signal.wait')).toBe('urgency');
    expect(getSignalsByCategory('signal.clear')).toBe('urgency');
    expect(getSignalsByCategory('signal.suspicious')).toBe('urgency');
  });

  it('should map coordination signals to coordination category', () => {
    expect(getSignalsByCategory('signal.coordinating')).toBe('coordination');
    expect(getSignalsByCategory('signal.backup')).toBe('coordination');
    expect(getSignalsByCategory('signal.done')).toBe('coordination');
    expect(getSignalsByCategory('signal.ready')).toBe('coordination');
  });

  it('should map resource signals to resource category', () => {
    expect(getSignalsByCategory('signal.low_power')).toBe('resource');
    expect(getSignalsByCategory('signal.low_cooling')).toBe('resource');
    expect(getSignalsByCategory('signal.bandwidth_ok')).toBe('resource');
    expect(getSignalsByCategory('signal.space_low')).toBe('resource');
  });

  it('should return null for invalid signal keys', () => {
    expect(getSignalsByCategory('invalid')).toBeNull();
    expect(getSignalsByCategory('')).toBeNull();
  });
});

describe('quick signals service - signal count by category', () => {
  it('should have 5 decision signals', () => {
    const decisionSignals = SIGNAL_KEYS.filter((k) =>
      ['signal.approve', 'signal.deny', 'signal.flag', 'signal.verify', 'signal.unsure'].includes(
        k,
      ),
    );
    expect(decisionSignals).toHaveLength(5);
  });

  it('should have 4 urgency signals', () => {
    const urgencySignals = SIGNAL_KEYS.filter((k) =>
      ['signal.urgent', 'signal.wait', 'signal.clear', 'signal.suspicious'].includes(k),
    );
    expect(urgencySignals).toHaveLength(4);
  });

  it('should have 4 coordination signals', () => {
    const coordinationSignals = SIGNAL_KEYS.filter((k) =>
      ['signal.coordinating', 'signal.backup', 'signal.done', 'signal.ready'].includes(k),
    );
    expect(coordinationSignals).toHaveLength(4);
  });

  it('should have 4 resource signals', () => {
    const resourceSignals = SIGNAL_KEYS.filter((k) =>
      [
        'signal.low_power',
        'signal.low_cooling',
        'signal.bandwidth_ok',
        'signal.space_low',
      ].includes(k),
    );
    expect(resourceSignals).toHaveLength(4);
  });
});

describe('quick signals service - gateway parameter', () => {
  it('sendSignal function accepts gateway as optional parameter', async () => {
    const { sendSignal } = await import('../quick-signals.service.js');
    expect(typeof sendSignal).toBe('function');
  });

  it('sendSignal uses gateway when provided with sessionId', async () => {
    const mockFeatureFlags = await import('../../feature-flags/index.js');
    vi.spyOn(mockFeatureFlags, 'evaluateFlag').mockResolvedValue(true);

    const { sendSignal } = await import('../quick-signals.service.js');

    const mockConfig = { JWT_SECRET: 'test-secret' } as any;
    const mockRedis = {
      incrementRateLimitKey: vi.fn().mockResolvedValue({ current: 1, ttl: 60000 }),
    } as any;

    const mockGateway = {
      createMessage: vi.fn().mockReturnValue({
        type: 'QUICK_SIGNAL',
        payload: {},
        timestamp: Date.now(),
      }),
      broadcastToChannel: vi.fn(),
    };

    const db = await import('../../../shared/database/connection.js');
    vi.spyOn(db, 'getDatabaseClient').mockReturnValue({
      query: {
        quickSignalTemplates: {
          findFirst: vi.fn().mockResolvedValue({
            signalKey: 'signal.approve',
            icon: '👍',
            label: 'Approve',
            category: 'decision',
          }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }]),
        }),
      }),
    } as any);

    const result = await sendSignal(
      mockConfig,
      'tenant-1',
      'player-1',
      { signalKey: 'signal.approve', sessionId: 'session-1' },
      mockRedis,
      mockGateway as any,
    );

    expect(result.success).toBe(true);
    expect(mockGateway.createMessage).toHaveBeenCalled();
    expect(mockGateway.broadcastToChannel).toHaveBeenCalledWith(
      'signals:session-1',
      expect.objectContaining({ type: 'QUICK_SIGNAL' }),
    );
  });

  it('sendSignal skips broadcast when gateway is not provided', async () => {
    const mockFeatureFlags = await import('../../feature-flags/index.js');
    vi.spyOn(mockFeatureFlags, 'evaluateFlag').mockResolvedValue(true);

    const { sendSignal } = await import('../quick-signals.service.js');

    const mockConfig = { JWT_SECRET: 'test-secret' } as any;
    const mockRedis = {
      incrementRateLimitKey: vi.fn().mockResolvedValue({ current: 1, ttl: 60000 }),
    } as any;

    const db = await import('../../../shared/database/connection.js');
    vi.spyOn(db, 'getDatabaseClient').mockReturnValue({
      query: {
        quickSignalTemplates: {
          findFirst: vi.fn().mockResolvedValue({
            signalKey: 'signal.approve',
            icon: '👍',
            label: 'Approve',
            category: 'decision',
          }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }]),
        }),
      }),
    } as any);

    const result = await sendSignal(
      mockConfig,
      'tenant-1',
      'player-1',
      { signalKey: 'signal.approve', sessionId: 'session-1' },
      mockRedis,
      undefined,
    );

    expect(result.success).toBe(true);
  });

  it('sendSignal skips broadcast when sessionId is not provided', async () => {
    const mockFeatureFlags = await import('../../feature-flags/index.js');
    vi.spyOn(mockFeatureFlags, 'evaluateFlag').mockResolvedValue(true);

    const { sendSignal } = await import('../quick-signals.service.js');

    const mockConfig = { JWT_SECRET: 'test-secret' } as any;
    const mockRedis = {
      incrementRateLimitKey: vi.fn().mockResolvedValue({ current: 1, ttl: 60000 }),
    } as any;

    const mockGateway = {
      createMessage: vi.fn(),
      broadcastToChannel: vi.fn(),
    };

    const db = await import('../../../shared/database/connection.js');
    vi.spyOn(db, 'getDatabaseClient').mockReturnValue({
      query: {
        quickSignalTemplates: {
          findFirst: vi.fn().mockResolvedValue({
            signalKey: 'signal.approve',
            icon: '👍',
            label: 'Approve',
            category: 'decision',
          }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '1' }]),
        }),
      }),
    } as any);

    const result = await sendSignal(
      mockConfig,
      'tenant-1',
      'player-1',
      { signalKey: 'signal.approve' },
      mockRedis,
      mockGateway as any,
    );

    expect(result.success).toBe(true);
    expect(mockGateway.broadcastToChannel).not.toHaveBeenCalled();
  });
});
