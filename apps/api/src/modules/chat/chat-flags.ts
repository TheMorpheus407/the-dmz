import { evaluateFlag } from '../feature-flags/feature-flags.service.js'; // eslint-disable-line import-x/no-restricted-paths

import type { AppConfig } from '../../config.js';
import type { ChannelType } from '../../db/schema/social/index.js';

interface FlagResult {
  enabled: boolean;
  error?: string;
}

export async function requireChatEnabled(config: AppConfig, tenantId: string): Promise<FlagResult> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!enabled) {
    return { enabled: false, error: 'Chat is disabled' };
  }
  return { enabled: true };
}

export async function requirePartyChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.party');
  if (!enabled) {
    return { enabled: false, error: 'Party chat is disabled' };
  }
  return { enabled: true };
}

export async function requireGuildChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.guild');
  if (!enabled) {
    return { enabled: false, error: 'Guild chat is disabled' };
  }
  return { enabled: true };
}

export async function requireDirectChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.direct');
  if (!enabled) {
    return { enabled: false, error: 'Direct chat is disabled' };
  }
  return { enabled: true };
}

export async function requireChannelChatEnabled(
  config: AppConfig,
  tenantId: string,
  channelType: ChannelType,
): Promise<FlagResult> {
  if (channelType === 'party') {
    return requirePartyChatEnabled(config, tenantId);
  }
  if (channelType === 'guild') {
    return requireGuildChatEnabled(config, tenantId);
  }
  if (channelType === 'direct') {
    return requireDirectChatEnabled(config, tenantId);
  }
  return { enabled: true };
}
