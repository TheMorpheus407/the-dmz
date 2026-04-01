import { describe, expect, it, vi } from 'vitest';

vi.mock('../feature-flags/feature-flags.service.js', () => ({
  evaluateFlag: vi.fn(),
}));

import { evaluateFlag } from '../feature-flags/feature-flags.service.js';

import {
  requireChatEnabled,
  requirePartyChatEnabled,
  requireGuildChatEnabled,
  requireDirectChatEnabled,
  requireChannelChatEnabled,
} from './chat-flags.js';

import type { AppConfig } from '../../config.js';

const mockConfig = {} as AppConfig;
const mockTenantId = 'test-tenant-id';

describe('chat-flags', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireChatEnabled', () => {
    it('returns enabled:true when flag is true', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requireChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.enabled');
    });

    it('returns enabled:false with error when flag is false', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await requireChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: false, error: 'Chat is disabled' });
    });
  });

  describe('requirePartyChatEnabled', () => {
    it('returns enabled:true when flag is true', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requirePartyChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.party');
    });

    it('returns enabled:false with error when flag is false', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await requirePartyChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: false, error: 'Party chat is disabled' });
    });
  });

  describe('requireGuildChatEnabled', () => {
    it('returns enabled:true when flag is true', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requireGuildChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.guild');
    });

    it('returns enabled:false with error when flag is false', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await requireGuildChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: false, error: 'Guild chat is disabled' });
    });
  });

  describe('requireDirectChatEnabled', () => {
    it('returns enabled:true when flag is true', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requireDirectChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.direct');
    });

    it('returns enabled:false with error when flag is false', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await requireDirectChatEnabled(mockConfig, mockTenantId);

      expect(result).toEqual({ enabled: false, error: 'Direct chat is disabled' });
    });
  });

  describe('requireChannelChatEnabled', () => {
    it('delegates to requirePartyChatEnabled for party channelType', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requireChannelChatEnabled(mockConfig, mockTenantId, 'party');

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.party');
    });

    it('delegates to requireGuildChatEnabled for guild channelType', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requireChannelChatEnabled(mockConfig, mockTenantId, 'guild');

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.guild');
    });

    it('delegates to requireDirectChatEnabled for direct channelType', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(true);

      const result = await requireChannelChatEnabled(mockConfig, mockTenantId, 'direct');

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).toHaveBeenCalledWith(mockConfig, mockTenantId, 'social.chat.direct');
    });

    it('returns enabled:true for unknown channelType', async () => {
      vi.mocked(evaluateFlag).mockResolvedValue(false);

      const result = await requireChannelChatEnabled(
        mockConfig,
        mockTenantId,
        'unknown' as 'party',
      );

      expect(result).toEqual({ enabled: true });
      expect(evaluateFlag).not.toHaveBeenCalled();
    });
  });
});
