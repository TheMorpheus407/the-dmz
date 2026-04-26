import { evaluateFlag } from '../feature-flags/index.js';
import { channelTypes, type ChannelType } from '../../db/schema/social/index.js';

import type { AppConfig } from '../../config.js';

const [PARTY, GUILD, DIRECT] = channelTypes;

interface FlagResult {
  enabled: true;
  error?: undefined;
}

interface FlagResultDisabled {
  enabled: false;
  error: string;
}

export async function requireChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult | FlagResultDisabled> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.enabled');
  if (!enabled) {
    return { enabled: false, error: 'Chat is disabled' };
  }
  return { enabled: true };
}

export async function requirePartyChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult | FlagResultDisabled> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.party');
  if (!enabled) {
    return { enabled: false, error: 'Party chat is disabled' };
  }
  return { enabled: true };
}

export async function requireGuildChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult | FlagResultDisabled> {
  const enabled = await evaluateFlag(config, tenantId, 'social.chat.guild');
  if (!enabled) {
    return { enabled: false, error: 'Guild chat is disabled' };
  }
  return { enabled: true };
}

export async function requireDirectChatEnabled(
  config: AppConfig,
  tenantId: string,
): Promise<FlagResult | FlagResultDisabled> {
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
): Promise<FlagResult | FlagResultDisabled> {
  if (channelType === PARTY) {
    return requirePartyChatEnabled(config, tenantId);
  }
  if (channelType === GUILD) {
    return requireGuildChatEnabled(config, tenantId);
  }
  if (channelType === DIRECT) {
    return requireDirectChatEnabled(config, tenantId);
  }
  return { enabled: true };
}
