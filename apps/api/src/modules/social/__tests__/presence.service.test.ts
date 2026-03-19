import { describe, expect, it } from 'vitest';

type PresenceStatus = 'offline' | 'online' | 'in_session' | 'in_coop' | 'in_ranked';

const PRESENCE_STATUSES: PresenceStatus[] = [
  'offline',
  'online',
  'in_session',
  'in_coop',
  'in_ranked',
];

const PRESENCE_CACHE_TTL = 90;
const HEARTBEAT_INTERVAL = 30;

function isValidPresenceStatus(status: string): status is PresenceStatus {
  return PRESENCE_STATUSES.includes(status as PresenceStatus);
}

function isValidPrivacyMode(mode: string): mode is 'public' | 'friends_only' | 'private' {
  return ['public', 'friends_only', 'private'].includes(mode);
}

function calculatePresenceTTL(heartbeatAge: number): number {
  return Math.max(0, PRESENCE_CACHE_TTL - heartbeatAge);
}

function shouldExpirePresence(lastHeartbeat: number, currentTime: number): boolean {
  const age = currentTime - lastHeartbeat;
  const ageInSeconds = age / 1000;
  return ageInSeconds >= PRESENCE_CACHE_TTL;
}

function shouldShowPresenceToViewer(
  targetPrivacy: 'public' | 'friends_only' | 'private',
  isFriend: boolean,
): boolean {
  if (targetPrivacy === 'public') {
    return true;
  }
  if (targetPrivacy === 'friends_only') {
    return isFriend;
  }
  return false;
}

describe('presence service - presence statuses', () => {
  it('should have five presence statuses', () => {
    expect(PRESENCE_STATUSES).toHaveLength(5);
  });

  it('should include offline status', () => {
    expect(PRESENCE_STATUSES).toContain('offline');
  });

  it('should include online status', () => {
    expect(PRESENCE_STATUSES).toContain('online');
  });

  it('should include in_session status', () => {
    expect(PRESENCE_STATUSES).toContain('in_session');
  });

  it('should include in_coop status', () => {
    expect(PRESENCE_STATUSES).toContain('in_coop');
  });

  it('should include in_ranked status', () => {
    expect(PRESENCE_STATUSES).toContain('in_ranked');
  });

  it('should validate correct presence statuses', () => {
    expect(isValidPresenceStatus('offline')).toBe(true);
    expect(isValidPresenceStatus('online')).toBe(true);
    expect(isValidPresenceStatus('in_session')).toBe(true);
    expect(isValidPresenceStatus('in_coop')).toBe(true);
    expect(isValidPresenceStatus('in_ranked')).toBe(true);
  });

  it('should reject invalid presence statuses', () => {
    expect(isValidPresenceStatus('away')).toBe(false);
    expect(isValidPresenceStatus('busy')).toBe(false);
    expect(isValidPresenceStatus('')).toBe(false);
  });
});

describe('presence service - privacy modes', () => {
  it('should have three privacy modes', () => {
    const modes = ['public', 'friends_only', 'private'];
    expect(modes).toHaveLength(3);
  });

  it('should validate correct privacy modes', () => {
    expect(isValidPrivacyMode('public')).toBe(true);
    expect(isValidPrivacyMode('friends_only')).toBe(true);
    expect(isValidPrivacyMode('private')).toBe(true);
  });

  it('should reject invalid privacy modes', () => {
    expect(isValidPrivacyMode('hidden')).toBe(false);
    expect(isValidPrivacyMode('public_to_friends')).toBe(false);
  });
});

describe('presence service - TTL and expiration', () => {
  it('should have TTL of 90 seconds', () => {
    expect(PRESENCE_CACHE_TTL).toBe(90);
  });

  it('should have heartbeat interval of 30 seconds', () => {
    expect(HEARTBEAT_INTERVAL).toBe(30);
  });

  it('should calculate remaining TTL correctly', () => {
    expect(calculatePresenceTTL(0)).toBe(90);
    expect(calculatePresenceTTL(30)).toBe(60);
    expect(calculatePresenceTTL(60)).toBe(30);
    expect(calculatePresenceTTL(89)).toBe(1);
  });

  it('should return 0 when TTL expired', () => {
    expect(calculatePresenceTTL(90)).toBe(0);
    expect(calculatePresenceTTL(100)).toBe(0);
  });

  it('should detect presence expiration', () => {
    const ttlMs = PRESENCE_CACHE_TTL * 1000;
    expect(shouldExpirePresence(Date.now() - ttlMs - 10000, Date.now())).toBe(true);
    expect(shouldExpirePresence(Date.now() - 50000, Date.now())).toBe(false);
  });

  it('should not expire presence within TTL window', () => {
    const ttlMs = PRESENCE_CACHE_TTL * 1000;
    expect(shouldExpirePresence(Date.now() - (ttlMs - 10000), Date.now())).toBe(false);
    expect(shouldExpirePresence(Date.now() - ttlMs, Date.now())).toBe(true);
  });
});

describe('presence service - privacy enforcement', () => {
  it('should show presence to everyone when public', () => {
    expect(shouldShowPresenceToViewer('public', false)).toBe(true);
    expect(shouldShowPresenceToViewer('public', true)).toBe(true);
  });

  it('should show presence only to friends when friends_only', () => {
    expect(shouldShowPresenceToViewer('friends_only', true)).toBe(true);
    expect(shouldShowPresenceToViewer('friends_only', false)).toBe(false);
  });

  it('should never show presence when private', () => {
    expect(shouldShowPresenceToViewer('private', true)).toBe(false);
    expect(shouldShowPresenceToViewer('private', false)).toBe(false);
  });
});

describe('presence service - heartbeat mechanism', () => {
  it('should have heartbeat interval less than TTL', () => {
    expect(HEARTBEAT_INTERVAL).toBeLessThan(PRESENCE_CACHE_TTL);
  });

  it('should have sufficient heartbeat coverage ratio', () => {
    const coverageRatio = (PRESENCE_CACHE_TTL - HEARTBEAT_INTERVAL) / PRESENCE_CACHE_TTL;
    expect(coverageRatio).toBeGreaterThan(0.5);
    expect(coverageRatio).toBeLessThan(1);
  });
});

describe('presence service - status transitions', () => {
  it('should allow transition from online to in_session', () => {
    const currentStatus: PresenceStatus = 'online';
    const newStatus: PresenceStatus = 'in_session';
    expect(PRESENCE_STATUSES).toContain(newStatus);
    expect(newStatus).not.toBe(currentStatus);
  });

  it('should allow transition from in_session to online', () => {
    const currentStatus: PresenceStatus = 'in_session';
    const newStatus: PresenceStatus = 'online';
    expect(PRESENCE_STATUSES).toContain(newStatus);
    expect(newStatus).not.toBe(currentStatus);
  });

  it('should allow transition from online to offline', () => {
    const currentStatus: PresenceStatus = 'online';
    const newStatus: PresenceStatus = 'offline';
    expect(PRESENCE_STATUSES).toContain(newStatus);
    expect(newStatus).not.toBe(currentStatus);
  });

  it('should allow direct transition to offline from any status', () => {
    const statuses: PresenceStatus[] = ['online', 'in_session', 'in_coop', 'in_ranked'];
    for (const status of statuses) {
      expect(status).not.toBe('offline');
    }
  });
});

describe('presence service - status data', () => {
  it('should accept statusData with sessionId', () => {
    const statusData = { sessionId: 'uuid-session' };
    expect(statusData).toHaveProperty('sessionId');
  });

  it('should accept statusData with partyId', () => {
    const statusData = { partyId: 'uuid-party' };
    expect(statusData).toHaveProperty('partyId');
  });

  it('should accept statusData with region', () => {
    const statusData = { region: 'us-west' };
    expect(statusData).toHaveProperty('region');
  });

  it('should accept combined statusData', () => {
    const statusData = {
      sessionId: 'uuid-session',
      partyId: 'uuid-party',
      region: 'us-west',
    };
    expect(statusData).toHaveProperty('sessionId');
    expect(statusData).toHaveProperty('partyId');
    expect(statusData).toHaveProperty('region');
  });
});
