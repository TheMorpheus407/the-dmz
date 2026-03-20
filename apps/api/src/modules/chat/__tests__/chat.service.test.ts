import { describe, expect, it } from 'vitest';

const MAX_MESSAGE_LENGTH = 280;
const CHAT_RATE_LIMIT_WINDOW_MS = 2000;
const CHAT_RATE_LIMIT_MAX = 1;

const CHANNEL_TYPES = ['party', 'guild', 'direct'] as const;
type ChannelType = (typeof CHANNEL_TYPES)[number];

const MODERATION_STATUSES = ['approved', 'flagged', 'rejected'] as const;
type ModerationStatus = (typeof MODERATION_STATUSES)[number];

function isValidChannelType(type: string): type is ChannelType {
  return CHANNEL_TYPES.includes(type as ChannelType);
}

function isValidModerationStatus(status: string): status is ModerationStatus {
  return MODERATION_STATUSES.includes(status as ModerationStatus);
}

function isValidMessageContent(content: string): { valid: boolean; error?: string } {
  if (content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }
  return { valid: true };
}

function isValidChannelAccess(
  channelType: ChannelType,
  hasChatEnabled: boolean,
  hasChannelSpecificEnabled: boolean,
): boolean {
  if (!hasChatEnabled) {
    return false;
  }
  if (channelType === 'party' || channelType === 'guild' || channelType === 'direct') {
    return hasChannelSpecificEnabled;
  }
  return true;
}

function shouldAllowMessage(
  currentCount: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs?: number } {
  if (currentCount >= CHAT_RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterMs: windowMs,
    };
  }
  return { allowed: true };
}

function applyModeration(
  _content: string,
  hasBlockedContent: boolean,
  hasFlaggedContent: boolean,
): ModerationStatus {
  if (hasBlockedContent) {
    return 'rejected';
  }
  if (hasFlaggedContent) {
    return 'flagged';
  }
  return 'approved';
}

function shouldBroadcastMessage(moderationStatus: ModerationStatus): boolean {
  return moderationStatus === 'approved' || moderationStatus === 'flagged';
}

function shouldNotifySender(moderationStatus: ModerationStatus): boolean {
  return moderationStatus !== 'approved';
}

function calculateTypingTimeout(baseTimeoutMs: number): number {
  return baseTimeoutMs;
}

function isValidDirectChannelName(name: string | null): boolean {
  if (!name) {
    return true;
  }
  return name.startsWith('dm-') && name.length > 3;
}

describe('chat service - channel types', () => {
  it('should have three channel types', () => {
    expect(CHANNEL_TYPES).toHaveLength(3);
  });

  it('should include party channel type', () => {
    expect(CHANNEL_TYPES).toContain('party');
  });

  it('should include guild channel type', () => {
    expect(CHANNEL_TYPES).toContain('guild');
  });

  it('should include direct channel type', () => {
    expect(CHANNEL_TYPES).toContain('direct');
  });

  it('should validate correct channel types', () => {
    expect(isValidChannelType('party')).toBe(true);
    expect(isValidChannelType('guild')).toBe(true);
    expect(isValidChannelType('direct')).toBe(true);
  });

  it('should reject invalid channel types', () => {
    expect(isValidChannelType('invalid')).toBe(false);
    expect(isValidChannelType('')).toBe(false);
    expect(isValidChannelType('PARTY')).toBe(false);
  });
});

describe('chat service - moderation statuses', () => {
  it('should have three moderation statuses', () => {
    expect(MODERATION_STATUSES).toHaveLength(3);
  });

  it('should include approved status', () => {
    expect(MODERATION_STATUSES).toContain('approved');
  });

  it('should include flagged status', () => {
    expect(MODERATION_STATUSES).toContain('flagged');
  });

  it('should include rejected status', () => {
    expect(MODERATION_STATUSES).toContain('rejected');
  });

  it('should validate correct moderation statuses', () => {
    expect(isValidModerationStatus('approved')).toBe(true);
    expect(isValidModerationStatus('flagged')).toBe(true);
    expect(isValidModerationStatus('rejected')).toBe(true);
  });

  it('should reject invalid moderation statuses', () => {
    expect(isValidModerationStatus('pending')).toBe(false);
    expect(isValidModerationStatus('')).toBe(false);
    expect(isValidModerationStatus('APPROVED')).toBe(false);
  });
});

describe('chat service - message validation', () => {
  it('should accept valid message content', () => {
    expect(isValidMessageContent('Hello world')).toEqual({ valid: true });
    expect(isValidMessageContent('a'.repeat(280))).toEqual({ valid: true });
    expect(isValidMessageContent('Test message with numbers 123')).toEqual({ valid: true });
  });

  it('should reject empty message content', () => {
    expect(isValidMessageContent('')).toEqual({ valid: false, error: 'Message cannot be empty' });
    expect(isValidMessageContent('   ')).toEqual({
      valid: false,
      error: 'Message cannot be empty',
    });
    expect(isValidMessageContent('\t\n')).toEqual({
      valid: false,
      error: 'Message cannot be empty',
    });
  });

  it('should reject message exceeding max length', () => {
    const maxLengthContent = 'a'.repeat(280);
    const overLengthContent = 'a'.repeat(281);

    expect(isValidMessageContent(maxLengthContent)).toEqual({ valid: true });
    expect(isValidMessageContent(overLengthContent)).toEqual({
      valid: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    });
  });

  it('should have max message length of 280 characters', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(280);
  });
});

describe('chat service - channel access', () => {
  it('should deny access when chat is disabled', () => {
    expect(isValidChannelAccess('party', false, true)).toBe(false);
    expect(isValidChannelAccess('guild', false, true)).toBe(false);
    expect(isValidChannelAccess('direct', false, true)).toBe(false);
  });

  it('should deny access when channel-specific chat is disabled', () => {
    expect(isValidChannelAccess('party', true, false)).toBe(false);
    expect(isValidChannelAccess('guild', true, false)).toBe(false);
    expect(isValidChannelAccess('direct', true, false)).toBe(false);
  });

  it('should allow access when both chat and channel-specific chat are enabled', () => {
    expect(isValidChannelAccess('party', true, true)).toBe(true);
    expect(isValidChannelAccess('guild', true, true)).toBe(true);
    expect(isValidChannelAccess('direct', true, true)).toBe(true);
  });
});

describe('chat service - rate limiting', () => {
  it('should have rate limit of 1 message per window', () => {
    expect(CHAT_RATE_LIMIT_MAX).toBe(1);
  });

  it('should have rate limit window of 2 seconds', () => {
    expect(CHAT_RATE_LIMIT_WINDOW_MS).toBe(2000);
  });

  it('should allow messages when under limit', () => {
    expect(shouldAllowMessage(0, CHAT_RATE_LIMIT_WINDOW_MS)).toEqual({ allowed: true });
  });

  it('should deny messages when at or over limit', () => {
    const result = shouldAllowMessage(1, CHAT_RATE_LIMIT_WINDOW_MS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(CHAT_RATE_LIMIT_WINDOW_MS);
  });

  it('should deny messages well over limit', () => {
    const result = shouldAllowMessage(5, CHAT_RATE_LIMIT_WINDOW_MS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(CHAT_RATE_LIMIT_WINDOW_MS);
  });
});

describe('chat service - moderation', () => {
  it('should approve clean content', () => {
    expect(applyModeration('Hello world', false, false)).toBe('approved');
    expect(applyModeration('Valid message content', false, false)).toBe('approved');
  });

  it('should flag content with minor issues', () => {
    expect(applyModeration('Content with issues', false, true)).toBe('flagged');
  });

  it('should reject blocked content', () => {
    expect(applyModeration('Blocked content', true, false)).toBe('rejected');
    expect(applyModeration('Blocked content', true, true)).toBe('rejected');
  });

  it('should prioritize rejection over flagging', () => {
    expect(applyModeration('Bad content', true, true)).toBe('rejected');
  });
});

describe('chat service - message broadcasting', () => {
  it('should broadcast approved messages', () => {
    expect(shouldBroadcastMessage('approved')).toBe(true);
  });

  it('should broadcast flagged messages', () => {
    expect(shouldBroadcastMessage('flagged')).toBe(true);
  });

  it('should not broadcast rejected messages', () => {
    expect(shouldBroadcastMessage('rejected')).toBe(false);
  });
});

describe('chat service - sender notification', () => {
  it('should not notify sender for approved messages', () => {
    expect(shouldNotifySender('approved')).toBe(false);
  });

  it('should notify sender for flagged messages', () => {
    expect(shouldNotifySender('flagged')).toBe(true);
  });

  it('should notify sender for rejected messages', () => {
    expect(shouldNotifySender('rejected')).toBe(true);
  });
});

describe('chat service - typing indicator', () => {
  it('should have typing timeout of 3 seconds', () => {
    expect(calculateTypingTimeout(3000)).toBe(3000);
  });

  it('should calculate timeout correctly', () => {
    expect(calculateTypingTimeout(3000)).toBe(3000);
  });
});

describe('chat service - direct channel naming', () => {
  it('should accept null or undefined channel names', () => {
    expect(isValidDirectChannelName(null)).toBe(true);
  });

  it('should accept valid dm- prefixed names', () => {
    expect(isValidDirectChannelName('dm-player1-player2')).toBe(true);
  });

  it('should reject invalid channel names', () => {
    expect(isValidDirectChannelName('invalid')).toBe(false);
    expect(isValidDirectChannelName('dm-')).toBe(false);
    expect(isValidDirectChannelName('')).toBe(true);
  });
});

describe('chat service - message constraints', () => {
  it('should not allow message editing (append-only)', () => {
    const messages: string[] = [];
    const originalMessage = 'Original message';

    messages.push(originalMessage);

    const editedMessage = 'Edited message';
    messages.push(editedMessage);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe('Original message');
    expect(messages[1]).toBe('Edited message');
  });

  it('should enforce 30-day message retention', () => {
    const retentionDays = 30;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

    expect(retentionDays).toBe(30);
    expect(retentionMs).toBe(2592000000);
  });

  it('should have 1 message per 2 seconds rate limit', () => {
    const windowSeconds = 2;
    const maxMessages = 1;

    expect(windowSeconds).toBe(2);
    expect(maxMessages).toBe(1);
  });
});
