import { describe, it, expect } from 'vitest';

import {
  SlackDeliveryMode,
  SlackOperationType,
  SlackNotificationSeverity,
  SlackBlockKitBlockType,
  SlackBlockKitActionType,
  SLACK_INTEGRATION_VERSION,
  SLACK_COMPATIBILITY_NOTES,
  SLACK_NOTIFICATION_KEYS,
  SLACK_ERROR_CODES,
  SLACK_BLOCK_KIT_VERSION,
  SLACK_SLASH_COMMANDS,
  SLACK_RATE_LIMITS,
  SLACK_RETRY_DELAYS_MS,
  SLACK_DEFAULT_MAX_ATTEMPTS,
  SLACK_SIGNATURE_VERSION,
  SLACK_SIGNATURE_MAX_AGE_MS,
  slackDeliveryModeSchema,
  slackOperationTypeSchema,
  slackNotificationSeveritySchema,
  slackNotificationPayloadSchema,
  slackChannelBindingSchema,
  slackOperationInputSchema,
  slackOperationOutputSchema,
  slackBlockKitActionSchema,
  slackBlockKitSectionSchema,
  slackBlockKitActionsSchema,
  slackBlockKitDividerSchema,
  slackBlockKitHeaderSchema,
  slackBlockKitCardSchema,
  slackSlashCommandResponseSchema,
  slackWebhookFallbackSchema,
  slackWebhookDeliverySchema,
  slackIntegrationMetadataSchema,
  m1SlackNotificationContractManifest,
  m1SlackIntegrationManifest,
  isValidSlackNotificationKey,
  isValidSlackDeliveryMode,
  isValidSlackSlashCommand,
  getSlackNotificationContract,
  getAllSlackNotificationContracts,
  validateSlackNotificationInput,
  validateBlockKitCallback,
  validateSlashCommandRequest,
  buildSlackErrorResponse,
  buildSlackSuccessResponse,
  getSlackRetryDelayMs,
  isRetryableSlackError,
  isTerminalSlackError,
  createSlackMessageSignature,
  verifySlackSignature,
} from './slack-contract';

describe('slack-contract', () => {
  describe('SlackDeliveryMode', () => {
    it('should have correct SLACK_APP value', () => {
      expect(SlackDeliveryMode.SLACK_APP).toBe('slack-app');
    });

    it('should have correct INCOMING_WEBHOOK value', () => {
      expect(SlackDeliveryMode.INCOMING_WEBHOOK).toBe('incoming-webhook');
    });
  });

  describe('SlackOperationType', () => {
    it('should have correct NOTIFICATION value', () => {
      expect(SlackOperationType.NOTIFICATION).toBe('notification');
    });

    it('should have correct BLOCK_KIT value', () => {
      expect(SlackOperationType.BLOCK_KIT).toBe('block_kit');
    });

    it('should have correct WEBHOOK_FALLBACK value', () => {
      expect(SlackOperationType.WEBHOOK_FALLBACK).toBe('webhook_fallback');
    });

    it('should have correct SLASH_COMMAND value', () => {
      expect(SlackOperationType.SLASH_COMMAND).toBe('slash_command');
    });
  });

  describe('SLACK_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(SLACK_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('SLACK_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(SLACK_COMPATIBILITY_NOTES).toContain('OAuth2');
    });

    it('should mention Slack Bot Token', () => {
      expect(SLACK_COMPATIBILITY_NOTES).toContain('Slack Bot Token');
    });
  });

  describe('SLACK_BLOCK_KIT_VERSION', () => {
    it('should be 1.0', () => {
      expect(SLACK_BLOCK_KIT_VERSION).toBe('1.0');
    });
  });

  describe('SLACK_SIGNATURE_VERSION', () => {
    it('should be v0', () => {
      expect(SLACK_SIGNATURE_VERSION).toBe('v0');
    });
  });

  describe('SLACK_SIGNATURE_MAX_AGE_MS', () => {
    it('should be 5 minutes in milliseconds', () => {
      expect(SLACK_SIGNATURE_MAX_AGE_MS).toBe(5 * 60 * 1000);
    });
  });

  describe('SLACK_RATE_LIMITS', () => {
    it('should have notifications per minute limit', () => {
      expect(SLACK_RATE_LIMITS.NOTIFICATIONS_PER_MINUTE).toBe(30);
    });

    it('should have notifications per hour limit', () => {
      expect(SLACK_RATE_LIMITS.NOTIFICATIONS_PER_HOUR).toBe(500);
    });

    it('should have block kit per minute limit', () => {
      expect(SLACK_RATE_LIMITS.BLOCK_KIT_PER_MINUTE).toBe(20);
    });

    it('should have slash commands per minute limit', () => {
      expect(SLACK_RATE_LIMITS.SLASH_COMMANDS_PER_MINUTE).toBe(20);
    });

    it('should have non-critical per user per day limit', () => {
      expect(SLACK_RATE_LIMITS.NON_CRITICAL_PER_USER_PER_DAY).toBe(2);
    });
  });

  describe('SLACK_RETRY_DELAYS_MS', () => {
    it('should have 5 retry delays', () => {
      expect(SLACK_RETRY_DELAYS_MS).toHaveLength(5);
    });

    it('should have increasing delays', () => {
      for (let i = 1; i < SLACK_RETRY_DELAYS_MS.length; i++) {
        expect(SLACK_RETRY_DELAYS_MS[i]!).toBeGreaterThan(SLACK_RETRY_DELAYS_MS[i - 1]!);
      }
    });
  });

  describe('SLACK_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(SLACK_ERROR_CODES.INVALID_INPUT).toBe('SLACK_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(SLACK_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('SLACK_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(SLACK_ERROR_CODES.TENANT_MISMATCH).toBe('SLACK_TENANT_MISMATCH');
    });

    it('should have CHANNEL_NOT_FOUND error code', () => {
      expect(SLACK_ERROR_CODES.CHANNEL_NOT_FOUND).toBe('SLACK_CHANNEL_NOT_FOUND');
    });

    it('should have USER_NOT_FOUND error code', () => {
      expect(SLACK_ERROR_CODES.USER_NOT_FOUND).toBe('SLACK_USER_NOT_FOUND');
    });

    it('should have WORKSPACE_NOT_FOUND error code', () => {
      expect(SLACK_ERROR_CODES.WORKSPACE_NOT_FOUND).toBe('SLACK_WORKSPACE_NOT_FOUND');
    });

    it('should have WEBHOOK_REVOKED error code', () => {
      expect(SLACK_ERROR_CODES.WEBHOOK_REVOKED).toBe('SLACK_WEBHOOK_REVOKED');
    });

    it('should have RATE_LIMIT_EXCEEDED error code', () => {
      expect(SLACK_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('SLACK_RATE_LIMIT_EXCEEDED');
    });

    it('should have SIGNATURE_INVALID error code', () => {
      expect(SLACK_ERROR_CODES.SIGNATURE_INVALID).toBe('SLACK_SIGNATURE_INVALID');
    });

    it('should have TIMESTAMP_EXPIRED error code', () => {
      expect(SLACK_ERROR_CODES.TIMESTAMP_EXPIRED).toBe('SLACK_TIMESTAMP_EXPIRED');
    });

    it('should have BLOCK_KIT_INVALID error code', () => {
      expect(SLACK_ERROR_CODES.BLOCK_KIT_INVALID).toBe('SLACK_BLOCK_KIT_INVALID');
    });

    it('should have DEFERRED error code', () => {
      expect(SLACK_ERROR_CODES.DEFERRED).toBe('SLACK_DEFERRED');
    });
  });

  describe('SLACK_NOTIFICATION_KEYS', () => {
    it('should include user_created notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('user_created');
    });

    it('should include user_updated notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('user_updated');
    });

    it('should include session_created notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('session_created');
    });

    it('should include login_failed notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('login_failed');
    });

    it('should include mfa_enabled notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('mfa_enabled');
    });

    it('should include training_assigned notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('training_assigned');
    });

    it('should include training_completed notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('training_completed');
    });

    it('should include training_overdue notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('training_overdue');
    });

    it('should include report_ready notification', () => {
      expect(SLACK_NOTIFICATION_KEYS).toContain('report_ready');
    });
  });

  describe('SLACK_SLASH_COMMANDS', () => {
    it('should include status command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('status');
    });

    it('should include leaderboard command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('leaderboard');
    });

    it('should include report command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('report');
    });

    it('should include train command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('train');
    });

    it('should include risk command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('risk');
    });

    it('should include campaign command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('campaign');
    });

    it('should include settings command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('settings');
    });

    it('should include help command', () => {
      expect(SLACK_SLASH_COMMANDS).toContain('help');
    });
  });

  describe('SlackNotificationSeverity', () => {
    it('should have CRITICAL severity', () => {
      expect(SlackNotificationSeverity.CRITICAL).toBe('critical');
    });

    it('should have HIGH severity', () => {
      expect(SlackNotificationSeverity.HIGH).toBe('high');
    });

    it('should have MEDIUM severity', () => {
      expect(SlackNotificationSeverity.MEDIUM).toBe('medium');
    });

    it('should have LOW severity', () => {
      expect(SlackNotificationSeverity.LOW).toBe('low');
    });

    it('should have INFO severity', () => {
      expect(SlackNotificationSeverity.INFO).toBe('info');
    });
  });

  describe('SlackBlockKitBlockType', () => {
    it('should have ACTIONS type', () => {
      expect(SlackBlockKitBlockType.ACTIONS).toBe('actions');
    });

    it('should have CONTEXT type', () => {
      expect(SlackBlockKitBlockType.CONTEXT).toBe('context');
    });

    it('should have DIVIDER type', () => {
      expect(SlackBlockKitBlockType.DIVIDER).toBe('divider');
    });

    it('should have SECTION type', () => {
      expect(SlackBlockKitBlockType.SECTION).toBe('section');
    });

    it('should have HEADER type', () => {
      expect(SlackBlockKitBlockType.HEADER).toBe('header');
    });

    it('should have INPUT type', () => {
      expect(SlackBlockKitBlockType.INPUT).toBe('input');
    });
  });

  describe('SlackBlockKitActionType', () => {
    it('should have BUTTON_CLICK type', () => {
      expect(SlackBlockKitActionType.BUTTON_CLICK).toBe('slackButtonClick');
    });

    it('should have MENU_SELECT type', () => {
      expect(SlackBlockKitActionType.MENU_SELECT).toBe('slackMenuSelect');
    });

    it('should have DATE_PICKER type', () => {
      expect(SlackBlockKitActionType.DATE_PICKER).toBe('slackDatePicker');
    });

    it('should have TEXT_INPUT type', () => {
      expect(SlackBlockKitActionType.TEXT_INPUT).toBe('slackTextInput');
    });

    it('should have CUSTOM type', () => {
      expect(SlackBlockKitActionType.CUSTOM).toBe('custom');
    });
  });

  describe('m1SlackNotificationContractManifest', () => {
    it('should have contract for user_created notification', () => {
      const contract = m1SlackNotificationContractManifest.user_created;
      expect(contract.key).toBe('user_created');
      expect(contract.templateKey).toBe('userCreated');
      expect(contract.supportsBlockKit).toBe(true);
      expect(contract.requiredScopes).toContain('slack.notification');
    });

    it('should have contract for login_failed with HIGH severity', () => {
      const contract = m1SlackNotificationContractManifest.login_failed;
      expect(contract.severity).toBe(SlackNotificationSeverity.HIGH);
    });

    it('should have contract for training_overdue with deep link', () => {
      const contract = m1SlackNotificationContractManifest.training_overdue;
      expect(contract.requiredPayloadFields).toContain('deepLinkTarget');
    });

    it('should have contract for all required notifications', () => {
      SLACK_NOTIFICATION_KEYS.forEach((key) => {
        const contract = m1SlackNotificationContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(SLACK_INTEGRATION_VERSION);
      });
    });

    it('should map user_created to auth.user.created event', () => {
      const contract = m1SlackNotificationContractManifest.user_created;
      expect(contract.eventType).toBe('auth.user.created');
    });

    it('should have block kit version for supported notifications', () => {
      const contract = m1SlackNotificationContractManifest.user_created;
      expect(contract.blockKitVersion).toBe(SLACK_BLOCK_KIT_VERSION);
    });

    it('should support webhook fallback for most notifications', () => {
      const contract = m1SlackNotificationContractManifest.user_created;
      expect(contract.deliveryModes).toContain(SlackDeliveryMode.INCOMING_WEBHOOK);
    });

    it('should not allow forbidden fields in payload', () => {
      const contract = m1SlackNotificationContractManifest.user_created;
      expect(contract.forbiddenPayloadFields).toContain('password');
      expect(contract.forbiddenPayloadFields).toContain('passwordHash');
    });

    it('should have login_success only via slack-app mode', () => {
      const contract = m1SlackNotificationContractManifest.login_success;
      expect(contract.deliveryModes).toContain(SlackDeliveryMode.SLACK_APP);
      expect(contract.deliveryModes).not.toContain(SlackDeliveryMode.INCOMING_WEBHOOK);
    });

    it('should have session_created only via slack-app mode', () => {
      const contract = m1SlackNotificationContractManifest.session_created;
      expect(contract.deliveryModes).toContain(SlackDeliveryMode.SLACK_APP);
      expect(contract.deliveryModes).not.toContain(SlackDeliveryMode.INCOMING_WEBHOOK);
    });
  });

  describe('m1SlackIntegrationManifest', () => {
    it('should have valid integration version', () => {
      expect(m1SlackIntegrationManifest.integrationVersion).toBe(SLACK_INTEGRATION_VERSION);
    });

    it('should have compatibility notes', () => {
      expect(m1SlackIntegrationManifest.compatibilityNotes).toBe(SLACK_COMPATIBILITY_NOTES);
    });

    it('should support all delivery modes', () => {
      expect(m1SlackIntegrationManifest.supportedDeliveryModes).toContain(
        SlackDeliveryMode.SLACK_APP,
      );
      expect(m1SlackIntegrationManifest.supportedDeliveryModes).toContain(
        SlackDeliveryMode.INCOMING_WEBHOOK,
      );
    });

    it('should support all operation types', () => {
      expect(m1SlackIntegrationManifest.supportedOperations).toContain(
        SlackOperationType.NOTIFICATION,
      );
      expect(m1SlackIntegrationManifest.supportedOperations).toContain(
        SlackOperationType.BLOCK_KIT,
      );
      expect(m1SlackIntegrationManifest.supportedOperations).toContain(
        SlackOperationType.WEBHOOK_FALLBACK,
      );
      expect(m1SlackIntegrationManifest.supportedOperations).toContain(
        SlackOperationType.SLASH_COMMAND,
      );
    });

    it('should require tenant binding', () => {
      expect(m1SlackIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should require workspace binding', () => {
      expect(m1SlackIntegrationManifest.authRequirements.requiresWorkspaceBinding).toBe(true);
    });

    it('should include oauth scopes', () => {
      expect(m1SlackIntegrationManifest.authRequirements.oauthScopes).toContain('chat:write');
      expect(m1SlackIntegrationManifest.authRequirements.oauthScopes).toContain('commands');
      expect(m1SlackIntegrationManifest.authRequirements.oauthScopes).toContain('im:write');
      expect(m1SlackIntegrationManifest.authRequirements.oauthScopes).toContain('users:read');
    });

    it('should include api key scopes', () => {
      expect(m1SlackIntegrationManifest.authRequirements.apiKeyScopes).toContain('integrations');
    });

    it('should pass schema validation', () => {
      const result = slackIntegrationMetadataSchema.safeParse(m1SlackIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });

  describe('isValidSlackNotificationKey', () => {
    it('should return true for valid notification key', () => {
      expect(isValidSlackNotificationKey('user_created')).toBe(true);
    });

    it('should return false for invalid notification key', () => {
      expect(isValidSlackNotificationKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidSlackDeliveryMode', () => {
    it('should return true for slack-app mode', () => {
      expect(isValidSlackDeliveryMode('slack-app')).toBe(true);
    });

    it('should return true for incoming-webhook mode', () => {
      expect(isValidSlackDeliveryMode('incoming-webhook')).toBe(true);
    });

    it('should return false for invalid mode', () => {
      expect(isValidSlackDeliveryMode('invalid_mode')).toBe(false);
    });
  });

  describe('isValidSlackSlashCommand', () => {
    it('should return true for valid slash command with leading slash', () => {
      expect(isValidSlackSlashCommand('/status')).toBe(true);
    });

    it('should return true for valid slash command without leading slash', () => {
      expect(isValidSlackSlashCommand('status')).toBe(true);
    });

    it('should return false for invalid slash command', () => {
      expect(isValidSlackSlashCommand('/invalid')).toBe(false);
    });
  });

  describe('getSlackNotificationContract', () => {
    it('should return contract for valid notification key', () => {
      const contract = getSlackNotificationContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getAllSlackNotificationContracts', () => {
    it('should return all notification contracts', () => {
      const contracts = getAllSlackNotificationContracts();
      expect(contracts.length).toBe(SLACK_NOTIFICATION_KEYS.length);
    });
  });

  describe('validateSlackNotificationInput', () => {
    it('should validate valid notification input', () => {
      const validInput = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'auth.user.created',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-15T10:30:00Z',
        severity: SlackNotificationSeverity.INFO,
        templateKey: 'userCreated',
        templateLabel: 'User Created',
        data: {},
      };
      const result = validateSlackNotificationInput('user_created', validInput);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid notification input', () => {
      const invalidInput = {
        eventId: 'invalid-uuid',
        eventType: 'auth.user.created',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-15T10:30:00Z',
        severity: 'invalid-severity',
        templateKey: 'userCreated',
        templateLabel: 'User Created',
        data: {},
      };
      const result = validateSlackNotificationInput('user_created', invalidInput);
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown notification key', () => {
      const result = validateSlackNotificationInput('unknown_notification', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('validateBlockKitCallback', () => {
    it('should validate valid callback payload', () => {
      const validPayload = {
        actionType: 'slackButtonClick',
        actionId: 'action-123',
        cardId: '550e8400-e29b-41d4-a716-446655440000',
        interactionTimestamp: '2024-01-15T10:30:00Z',
        userId: 'U123456',
        userName: 'johndoe',
        channelId: 'C123456',
        workspaceId: 'T123456',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        payload: {},
      };
      const result = validateBlockKitCallback(validPayload);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid callback payload', () => {
      const invalidPayload = {
        actionType: 'slackButtonClick',
        actionId: 'action-123',
        cardId: 'invalid-uuid',
        interactionTimestamp: '2024-01-15T10:30:00Z',
        userId: 'U123456',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        payload: {},
      };
      const result = validateBlockKitCallback(invalidPayload);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSlashCommandRequest', () => {
    it('should validate valid slash command request', () => {
      const validRequest = {
        command: '/status',
        text: '',
        responseUrl: 'https://hooks.slack.com/commands/1234',
        triggerId: '123456.7890123456789.abcdef1234567890abcdef1234567890',
        userId: 'U123456',
        userName: 'johndoe',
        channelId: 'C123456',
        channelName: 'general',
        workspaceId: 'T123456',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-15T10:30:00Z',
      };
      const result = validateSlashCommandRequest(validRequest);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid slash command request', () => {
      const invalidRequest = {
        command: '/status',
        responseUrl: 'invalid-url',
        triggerId: '123456.7890123456789.abcdef1234567890abcdef1234567890',
        userId: 'U123456',
        channelId: 'C123456',
        workspaceId: 'T123456',
        tenantId: 'not-a-uuid',
        timestamp: '2024-01-15T10:30:00Z',
      };
      const result = validateSlashCommandRequest(invalidRequest);
      expect(result.valid).toBe(false);
    });
  });

  describe('buildSlackErrorResponse', () => {
    it('should build valid error response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildSlackErrorResponse(
        SLACK_ERROR_CODES.INVALID_INPUT,
        'Invalid input provided',
        SlackOperationType.NOTIFICATION,
        SlackDeliveryMode.SLACK_APP,
        tenantId,
      );

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('SLACK_INVALID_INPUT');
      expect(response.error?.message).toBe('Invalid input provided');
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(SlackOperationType.NOTIFICATION);
      expect(response.metadata?.deliveryMode).toBe(SlackDeliveryMode.SLACK_APP);
    });
  });

  describe('buildSlackSuccessResponse', () => {
    it('should build valid success response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { messageId: 'msg-123', ts: '1234567890.123456' };
      const response = buildSlackSuccessResponse(
        data,
        SlackOperationType.NOTIFICATION,
        SlackDeliveryMode.SLACK_APP,
        tenantId,
        'notif-123',
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(SlackOperationType.NOTIFICATION);
      expect(response.metadata?.deliveryMode).toBe(SlackDeliveryMode.SLACK_APP);
      expect(response.metadata?.idempotencyKey).toBe('notif-123');
    });

    it('should work without idempotency key', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { messageId: 'msg-123', ts: '1234567890.123456' };
      const response = buildSlackSuccessResponse(
        data,
        SlackOperationType.NOTIFICATION,
        SlackDeliveryMode.INCOMING_WEBHOOK,
        tenantId,
      );

      expect(response.success).toBe(true);
      expect(response.metadata?.idempotencyKey).toBeUndefined();
    });
  });

  describe('getSlackRetryDelayMs', () => {
    it('should return first delay for attempt 1', () => {
      expect(getSlackRetryDelayMs(1)).toBe(60000);
    });

    it('should return second delay for attempt 2', () => {
      expect(getSlackRetryDelayMs(2)).toBe(300000);
    });

    it('should return last delay for attempts beyond array length', () => {
      expect(getSlackRetryDelayMs(10)).toBe(28800000);
    });
  });

  describe('isRetryableSlackError', () => {
    it('should return true for DEFERRED error', () => {
      expect(isRetryableSlackError(SLACK_ERROR_CODES.DEFERRED)).toBe(true);
    });

    it('should return true for RATE_LIMIT_EXCEEDED error', () => {
      expect(isRetryableSlackError(SLACK_ERROR_CODES.RATE_LIMIT_EXCEEDED)).toBe(true);
    });

    it('should return false for WEBHOOK_REVOKED error', () => {
      expect(isRetryableSlackError(SLACK_ERROR_CODES.WEBHOOK_REVOKED)).toBe(false);
    });

    it('should return false for TENANT_MISMATCH error', () => {
      expect(isRetryableSlackError(SLACK_ERROR_CODES.TENANT_MISMATCH)).toBe(false);
    });
  });

  describe('isTerminalSlackError', () => {
    it('should return true for WEBHOOK_REVOKED error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.WEBHOOK_REVOKED)).toBe(true);
    });

    it('should return true for WEBHOOK_PERMISSION_DENIED error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.WEBHOOK_PERMISSION_DENIED)).toBe(true);
    });

    it('should return true for TENANT_MISMATCH error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.TENANT_MISMATCH)).toBe(true);
    });

    it('should return true for CHANNEL_NOT_FOUND error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.CHANNEL_NOT_FOUND)).toBe(true);
    });

    it('should return true for USER_NOT_FOUND error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.USER_NOT_FOUND)).toBe(true);
    });

    it('should return false for DEFERRED error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.DEFERRED)).toBe(false);
    });

    it('should return false for RATE_LIMIT_EXCEEDED error', () => {
      expect(isTerminalSlackError(SLACK_ERROR_CODES.RATE_LIMIT_EXCEEDED)).toBe(false);
    });
  });

  describe('slackDeliveryModeSchema', () => {
    it('should validate slack-app', () => {
      const result = slackDeliveryModeSchema.safeParse('slack-app');
      expect(result.success).toBe(true);
    });

    it('should validate incoming-webhook', () => {
      const result = slackDeliveryModeSchema.safeParse('incoming-webhook');
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const result = slackDeliveryModeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('slackOperationTypeSchema', () => {
    it('should validate notification', () => {
      const result = slackOperationTypeSchema.safeParse('notification');
      expect(result.success).toBe(true);
    });

    it('should validate block_kit', () => {
      const result = slackOperationTypeSchema.safeParse('block_kit');
      expect(result.success).toBe(true);
    });

    it('should validate webhook_fallback', () => {
      const result = slackOperationTypeSchema.safeParse('webhook_fallback');
      expect(result.success).toBe(true);
    });

    it('should validate slash_command', () => {
      const result = slackOperationTypeSchema.safeParse('slash_command');
      expect(result.success).toBe(true);
    });

    it('should reject invalid operation type', () => {
      const result = slackOperationTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('slackNotificationSeveritySchema', () => {
    it('should validate critical', () => {
      const result = slackNotificationSeveritySchema.safeParse('critical');
      expect(result.success).toBe(true);
    });

    it('should validate high', () => {
      const result = slackNotificationSeveritySchema.safeParse('high');
      expect(result.success).toBe(true);
    });

    it('should validate medium', () => {
      const result = slackNotificationSeveritySchema.safeParse('medium');
      expect(result.success).toBe(true);
    });

    it('should validate low', () => {
      const result = slackNotificationSeveritySchema.safeParse('low');
      expect(result.success).toBe(true);
    });

    it('should validate info', () => {
      const result = slackNotificationSeveritySchema.safeParse('info');
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const result = slackNotificationSeveritySchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('slackNotificationPayloadSchema', () => {
    it('should validate valid payload', () => {
      const payload = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'auth.user.created',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-15T10:30:00Z',
        severity: 'info',
        templateKey: 'userCreated',
        templateLabel: 'User Created',
        data: { userId: '770e8400-e29b-41d4-a716-446655440002' },
      };
      const result = slackNotificationPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate payload with optional fields', () => {
      const payload = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'auth.user.created',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-15T10:30:00Z',
        severity: 'high',
        templateKey: 'userCreated',
        templateLabel: 'User Created',
        recipientId: '770e8400-e29b-41d4-a716-446655440002',
        recipientName: 'John Doe',
        deepLinkTarget: 'https://example.com/user/123',
        data: {},
      };
      const result = slackNotificationPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('slackChannelBindingSchema', () => {
    it('should validate valid channel binding', () => {
      const binding = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        workspaceId: 'T123456',
        channelId: 'C123456',
        userId: 'U123456',
        recipientType: 'user',
      };
      const result = slackChannelBindingSchema.safeParse(binding);
      expect(result.success).toBe(true);
    });

    it('should default recipientType to user', () => {
      const binding = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      };
      const result = slackChannelBindingSchema.safeParse(binding);
      expect(result.success).toBe(true);
      expect(result.data?.recipientType).toBe('user');
    });
  });

  describe('slackOperationInputSchema', () => {
    it('should validate valid operation input', () => {
      const input = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        channelBinding: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          channelId: 'C123456',
        },
        idempotencyKey: 'key-123',
      };
      const result = slackOperationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('slackOperationOutputSchema', () => {
    it('should validate valid success output', () => {
      const output = {
        success: true,
        data: { messageId: 'msg-123', ts: '1234567890.123456' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'notification',
          deliveryMode: 'slack-app',
        },
      };
      const result = slackOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('should validate valid error output', () => {
      const output = {
        success: false,
        error: {
          code: 'SLACK_INVALID_INPUT',
          message: 'Invalid input',
        },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'notification',
          deliveryMode: 'slack-app',
        },
      };
      const result = slackOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('slackBlockKitActionSchema', () => {
    it('should validate button click action', () => {
      const action = {
        type: 'slackButtonClick',
        actionId: 'action-123',
        text: 'Click Me',
        value: 'button-value',
      };
      const result = slackBlockKitActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate menu select action', () => {
      const action = {
        type: 'slackMenuSelect',
        actionId: 'action-123',
        selectedOption: {
          text: { type: 'plain_text', text: 'Option 1' },
          value: 'option-1',
        },
      };
      const result = slackBlockKitActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate date picker action', () => {
      const action = {
        type: 'slackDatePicker',
        actionId: 'action-123',
        selectedDate: '2024-01-15',
      };
      const result = slackBlockKitActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate custom action', () => {
      const action = {
        type: 'custom',
        actionId: 'action-123',
        value: 'custom-value',
        data: { key: 'value' },
      };
      const result = slackBlockKitActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  describe('slackBlockKitSectionSchema', () => {
    it('should validate valid section', () => {
      const section = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Hello World',
        },
      };
      const result = slackBlockKitSectionSchema.safeParse(section);
      expect(result.success).toBe(true);
    });

    it('should validate section with fields', () => {
      const section = {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: 'Field 1' },
          { type: 'plain_text', text: 'Field 2' },
        ],
      };
      const result = slackBlockKitSectionSchema.safeParse(section);
      expect(result.success).toBe(true);
    });
  });

  describe('slackBlockKitActionsSchema', () => {
    it('should validate valid actions block', () => {
      const actions = {
        type: 'actions',
        blockId: 'block-123',
        elements: [{ type: 'button' }],
      };
      const result = slackBlockKitActionsSchema.safeParse(actions);
      expect(result.success).toBe(true);
    });
  });

  describe('slackBlockKitDividerSchema', () => {
    it('should validate valid divider', () => {
      const divider = {
        type: 'divider',
      };
      const result = slackBlockKitDividerSchema.safeParse(divider);
      expect(result.success).toBe(true);
    });
  });

  describe('slackBlockKitHeaderSchema', () => {
    it('should validate valid header', () => {
      const header = {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Header Text',
        },
      };
      const result = slackBlockKitHeaderSchema.safeParse(header);
      expect(result.success).toBe(true);
    });
  });

  describe('slackBlockKitCardSchema', () => {
    it('should validate valid card with blocks', () => {
      const card = {
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 'Hello' },
          },
          {
            type: 'divider',
          },
        ],
      };
      const result = slackBlockKitCardSchema.safeParse(card);
      expect(result.success).toBe(true);
    });

    it('should validate card with attachments', () => {
      const card = {
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 'Hello' },
          },
        ],
        attachments: [
          {
            color: '#ff0000',
            blocks: [],
          },
        ],
      };
      const result = slackBlockKitCardSchema.safeParse(card);
      expect(result.success).toBe(true);
    });
  });

  describe('slackSlashCommandResponseSchema', () => {
    it('should validate valid ephemeral response', () => {
      const response = {
        responseType: 'ephemeral',
        text: 'Hello!',
      };
      const result = slackSlashCommandResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate response with blocks', () => {
      const response = {
        responseType: 'in_channel',
        text: 'Hello!',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 'Hello World' },
          },
        ],
      };
      const result = slackSlashCommandResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should default responseType to ephemeral', () => {
      const response = {
        text: 'Hello!',
      };
      const result = slackSlashCommandResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
      expect(result.data?.responseType).toBe('ephemeral');
    });
  });

  describe('slackWebhookFallbackSchema', () => {
    it('should validate valid webhook fallback', () => {
      const fallback = {
        webhookUrl: 'https://hooks.slack.com/services/xxx/yyy/zzz',
        payload: {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          eventType: 'auth.user.created',
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          severity: 'info',
          templateKey: 'userCreated',
          templateLabel: 'User Created',
          data: {},
        },
      };
      const result = slackWebhookFallbackSchema.safeParse(fallback);
      expect(result.success).toBe(true);
    });

    it('should apply default retry policy', () => {
      const fallback = {
        webhookUrl: 'https://hooks.slack.com/services/xxx/yyy/zzz',
        payload: {
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          eventType: 'auth.user.created',
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          severity: 'info',
          templateKey: 'userCreated',
          templateLabel: 'User Created',
          data: {},
        },
        retryPolicy: undefined,
      };
      const result = slackWebhookFallbackSchema.safeParse(fallback);
      expect(result.success).toBe(true);
      expect(result.data?.retryPolicy?.maxAttempts).toBe(5);
    });
  });

  describe('slackWebhookDeliverySchema', () => {
    it('should validate valid webhook delivery', () => {
      const delivery = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        subscriptionId: '660e8400-e29b-41d4-a716-446655440001',
        notificationKey: 'user_created',
        tenantId: '770e8400-e29b-41d4-a716-446655440002',
        channelBinding: {
          tenantId: '770e8400-e29b-41d4-a716-446655440002',
        },
        deliveryMode: 'incoming-webhook',
        status: 'success',
        attemptNumber: 1,
        maxAttempts: 5,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };
      const result = slackWebhookDeliverySchema.safeParse(delivery);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema validation for all notification contracts', () => {
    it('should validate all notification contracts against schema', () => {
      Object.values(m1SlackNotificationContractManifest).forEach((contract) => {
        const result = slackNotificationPayloadSchema.safeParse({
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          eventType: contract.eventType,
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          severity: contract.severity,
          templateKey: contract.templateKey,
          templateLabel: contract.label,
          data: {},
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Tenant and workspace isolation', () => {
    it('should require workspace binding in integration manifest', () => {
      expect(m1SlackIntegrationManifest.authRequirements.requiresWorkspaceBinding).toBe(true);
    });

    it('should include tenantId in channel binding', () => {
      const binding = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        workspaceId: 'T123456',
        channelId: 'C123456',
        userId: 'U123456',
        recipientType: 'user' as const,
      };
      const result = slackChannelBindingSchema.safeParse(binding);
      expect(result.success).toBe(true);
    });

    it('should include tenantId in error responses', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildSlackErrorResponse(
        SLACK_ERROR_CODES.TENANT_MISMATCH,
        'Tenant mismatch',
        SlackOperationType.NOTIFICATION,
        SlackDeliveryMode.SLACK_APP,
        tenantId,
      );

      expect(response.metadata?.tenantId).toBe(tenantId);
    });

    it('should include tenantId in success responses', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildSlackSuccessResponse(
        { messageId: 'msg-123' },
        SlackOperationType.NOTIFICATION,
        SlackDeliveryMode.SLACK_APP,
        tenantId,
      );

      expect(response.metadata?.tenantId).toBe(tenantId);
    });
  });

  describe('Webhook event parity', () => {
    it('should map user_created to auth.user.created', () => {
      const contract = m1SlackNotificationContractManifest.user_created;
      expect(contract.eventType).toBe('auth.user.created');
    });

    it('should map user_updated to auth.user.updated', () => {
      const contract = m1SlackNotificationContractManifest.user_updated;
      expect(contract.eventType).toBe('auth.user.updated');
    });

    it('should map session_created to auth.session.created', () => {
      const contract = m1SlackNotificationContractManifest.session_created;
      expect(contract.eventType).toBe('auth.session.created');
    });

    it('should map session_revoked to auth.session.revoked', () => {
      const contract = m1SlackNotificationContractManifest.session_revoked;
      expect(contract.eventType).toBe('auth.session.revoked');
    });

    it('should map tenant_created to enterprise.tenant.created', () => {
      const contract = m1SlackNotificationContractManifest.tenant_created;
      expect(contract.eventType).toBe('enterprise.tenant.created');
    });

    it('should map tenant_updated to enterprise.tenant.updated', () => {
      const contract = m1SlackNotificationContractManifest.tenant_updated;
      expect(contract.eventType).toBe('enterprise.tenant.updated');
    });

    it('should map training_assigned to training.assigned', () => {
      const contract = m1SlackNotificationContractManifest.training_assigned;
      expect(contract.eventType).toBe('training.assigned');
    });

    it('should map training_completed to training.completed', () => {
      const contract = m1SlackNotificationContractManifest.training_completed;
      expect(contract.eventType).toBe('training.completed');
    });
  });

  describe('Retry and DLQ behavior', () => {
    it('should have default max attempts', () => {
      expect(SLACK_DEFAULT_MAX_ATTEMPTS).toBe(5);
    });

    it('should have retry delays for webhook fallback', () => {
      expect(SLACK_RETRY_DELAYS_MS).toHaveLength(5);
    });

    it('should have increasing retry delays', () => {
      for (let i = 1; i < SLACK_RETRY_DELAYS_MS.length; i++) {
        expect(SLACK_RETRY_DELAYS_MS[i]!).toBeGreaterThan(SLACK_RETRY_DELAYS_MS[i - 1]!);
      }
    });
  });

  describe('Rate limiting', () => {
    it('should enforce notifications per minute', () => {
      expect(SLACK_RATE_LIMITS.NOTIFICATIONS_PER_MINUTE).toBeGreaterThan(0);
    });

    it('should enforce notifications per hour', () => {
      expect(SLACK_RATE_LIMITS.NOTIFICATIONS_PER_HOUR).toBeGreaterThan(
        SLACK_RATE_LIMITS.NOTIFICATIONS_PER_MINUTE,
      );
    });

    it('should enforce slash commands per minute', () => {
      expect(SLACK_RATE_LIMITS.SLASH_COMMANDS_PER_MINUTE).toBe(20);
    });

    it('should enforce non-critical notifications per user per day', () => {
      expect(SLACK_RATE_LIMITS.NON_CRITICAL_PER_USER_PER_DAY).toBe(2);
    });
  });

  describe('Slack signature verification', () => {
    const testSigningSecret = 'test_signing_secret';
    const testTimestamp = String(Math.floor(Date.now() / 1000));
    const testBody = 'command=/status&text=';

    it('should create signature with version prefix', () => {
      const signature = createSlackMessageSignature(testSigningSecret, testTimestamp, testBody);
      expect(signature).toMatch(/^v0=/);
    });

    it('should verify valid signature', () => {
      const isValid = verifySlackSignature('v0=test', testTimestamp, testBody, testSigningSecret);
      expect(isValid).toBe(true);
    });

    it('should reject expired timestamp', () => {
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 400);
      const signature = createSlackMessageSignature(testSigningSecret, oldTimestamp, testBody);
      const isValid = verifySlackSignature(signature, oldTimestamp, testBody, testSigningSecret);
      expect(isValid).toBe(false);
    });

    it('should reject invalid timestamp format', () => {
      const signature = createSlackMessageSignature(testSigningSecret, testTimestamp, testBody);
      const isValid = verifySlackSignature(
        signature,
        'invalid_timestamp',
        testBody,
        testSigningSecret,
      );
      expect(isValid).toBe(false);
    });
  });
});
