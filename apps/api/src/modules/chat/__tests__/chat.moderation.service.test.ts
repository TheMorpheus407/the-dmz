import { afterEach, describe, expect, it, vi } from 'vitest';

const mockCheckContent = vi.fn();

vi.mock('../../social/content-filter.service.js', () => ({
  checkContent: (...args: unknown[]) => mockCheckContent(...args),
}));

import { ChatModerationService } from '../chat.moderation.service.js';

import type { AppConfig } from '../../../config.js';

const mockConfig = {} as AppConfig;
const mockTenantId = 'test-tenant-id';

describe('ChatModerationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('moderateChat', () => {
    it('returns approved status when content is allowed', async () => {
      mockCheckContent.mockResolvedValue({
        allowed: true,
        violations: [],
        highestSeverity: null,
      });

      const service = new ChatModerationService(mockConfig, mockTenantId);
      const result = await service.moderateChat({ content: 'Hello world' });

      expect(result.moderationStatus).toBe('approved');
      expect(result.contentCheckResult.allowed).toBe(true);
      expect(mockCheckContent).toHaveBeenCalledWith(mockConfig, mockTenantId, {
        content: 'Hello world',
        context: 'chat',
      });
    });

    it('returns rejected status when highestSeverity is block', async () => {
      mockCheckContent.mockResolvedValue({
        allowed: false,
        violations: [
          {
            pattern: 'bad',
            patternType: 'contains' as const,
            severity: 'block' as const,
            category: 'profanity' as const,
          },
        ],
        highestSeverity: 'block',
      });

      const service = new ChatModerationService(mockConfig, mockTenantId);
      const result = await service.moderateChat({ content: 'bad content' });

      expect(result.moderationStatus).toBe('rejected');
    });

    it('returns rejected status when highestSeverity is mute', async () => {
      mockCheckContent.mockResolvedValue({
        allowed: false,
        violations: [
          {
            pattern: 'spam',
            patternType: 'contains' as const,
            severity: 'mute' as const,
            category: 'spam' as const,
          },
        ],
        highestSeverity: 'mute',
      });

      const service = new ChatModerationService(mockConfig, mockTenantId);
      const result = await service.moderateChat({ content: 'spam content' });

      expect(result.moderationStatus).toBe('rejected');
    });

    it('returns flagged status when highestSeverity is flag', async () => {
      mockCheckContent.mockResolvedValue({
        allowed: true,
        violations: [
          {
            pattern: 'warning',
            patternType: 'contains' as const,
            severity: 'flag' as const,
            category: 'profanity' as const,
          },
        ],
        highestSeverity: 'flag',
      });

      const service = new ChatModerationService(mockConfig, mockTenantId);
      const result = await service.moderateChat({ content: 'warning content' });

      expect(result.moderationStatus).toBe('flagged');
    });
  });
});
