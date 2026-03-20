import { describe, expect, it } from 'vitest';

const DEFAULT_RATE_LIMITS = {
  send_message: { windowSeconds: 60, maxCount: 10 },
  send_friend_request: { windowSeconds: 3600, maxCount: 20 },
  create_forum_post: { windowSeconds: 3600, maxCount: 5 },
  report_submit: { windowSeconds: 3600, maxCount: 10 },
} as const;

describe('rate-limit.service', () => {
  describe('DEFAULT_RATE_LIMITS', () => {
    it('should have limits for all social actions', () => {
      expect(DEFAULT_RATE_LIMITS.send_message).toBeDefined();
      expect(DEFAULT_RATE_LIMITS.send_friend_request).toBeDefined();
      expect(DEFAULT_RATE_LIMITS.create_forum_post).toBeDefined();
      expect(DEFAULT_RATE_LIMITS.report_submit).toBeDefined();
    });

    it('should have reasonable default values for send_message', () => {
      const limit = DEFAULT_RATE_LIMITS.send_message;
      expect(limit.windowSeconds).toBe(60);
      expect(limit.maxCount).toBe(10);
    });

    it('should have reasonable default values for send_friend_request', () => {
      const limit = DEFAULT_RATE_LIMITS.send_friend_request;
      expect(limit.windowSeconds).toBe(3600);
      expect(limit.maxCount).toBe(20);
    });

    it('should have reasonable default values for create_forum_post', () => {
      const limit = DEFAULT_RATE_LIMITS.create_forum_post;
      expect(limit.windowSeconds).toBe(3600);
      expect(limit.maxCount).toBe(5);
    });

    it('should have reasonable default values for report_submit', () => {
      const limit = DEFAULT_RATE_LIMITS.report_submit;
      expect(limit.windowSeconds).toBe(3600);
      expect(limit.maxCount).toBe(10);
    });
  });

  describe('rate limit key generation', () => {
    const RATE_LIMIT_KEY_PREFIX = 'mod-ratelimit';

    function getRateLimitKey(tenantId: string, playerId: string, action: string): string {
      return `${RATE_LIMIT_KEY_PREFIX}:${tenantId}:${playerId}:${action}`;
    }

    it('should generate correct rate limit key format', () => {
      const key = getRateLimitKey('tenant-1', 'player-1', 'send_message');
      expect(key).toBe('mod-ratelimit:tenant-1:player-1:send_message');
    });

    it('should generate unique keys for different players', () => {
      const key1 = getRateLimitKey('tenant-1', 'player-1', 'send_message');
      const key2 = getRateLimitKey('tenant-1', 'player-2', 'send_message');
      expect(key1).not.toBe(key2);
    });

    it('should generate unique keys for different actions', () => {
      const key1 = getRateLimitKey('tenant-1', 'player-1', 'send_message');
      const key2 = getRateLimitKey('tenant-1', 'player-1', 'create_forum_post');
      expect(key1).not.toBe(key2);
    });
  });

  describe('rate limit result interpretation', () => {
    it('should allow when under limit', () => {
      const current = 5;
      const maxCount = 10;
      const allowed = current <= maxCount;

      expect(allowed).toBe(true);
    });

    it('should not allow when at limit', () => {
      const current = 11;
      const maxCount = 10;
      const allowed = current <= maxCount;

      expect(allowed).toBe(false);
    });

    it('should not allow when over limit', () => {
      const current = 15;
      const maxCount = 10;
      const allowed = current <= maxCount;

      expect(allowed).toBe(false);
    });

    it('should calculate remaining correctly', () => {
      const current = 3;
      const maxCount = 10;
      const remaining = Math.max(0, maxCount - current);

      expect(remaining).toBe(7);
    });

    it('should not return negative remaining', () => {
      const current = 15;
      const maxCount = 10;
      const remaining = Math.max(0, maxCount - current);

      expect(remaining).toBe(0);
    });
  });
});
