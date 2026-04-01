import { checkContent, type ContentCheckResult } from '../social/content-filter.service.js'; // eslint-disable-line import-x/no-restricted-paths

import type { AppConfig } from '../../config.js';
import type { ModerationStatus } from '../../db/schema/social/index.js';

export interface ModerateChatInput {
  content: string;
}

export interface ModerateChatResult {
  moderationStatus: ModerationStatus;
  contentCheckResult: ContentCheckResult;
}

export class ChatModerationService {
  private readonly config: AppConfig;
  private readonly tenantId: string;

  public constructor(config: AppConfig, tenantId: string) {
    this.config = config;
    this.tenantId = tenantId;
  }

  public async moderateChat(input: ModerateChatInput): Promise<ModerateChatResult> {
    const contentCheckResult = await checkContent(this.config, this.tenantId, {
      content: input.content,
      context: 'chat',
    });

    let moderationStatus: ModerationStatus = 'approved';
    if (!contentCheckResult.allowed) {
      if (
        contentCheckResult.highestSeverity === 'block' ||
        contentCheckResult.highestSeverity === 'mute'
      ) {
        moderationStatus = 'rejected';
      } else {
        moderationStatus = 'flagged';
      }
    }

    return {
      moderationStatus,
      contentCheckResult,
    };
  }
}
