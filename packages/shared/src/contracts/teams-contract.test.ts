import { describe, it, expect } from 'vitest';

import {
  TeamsDeliveryMode,
  TeamsOperationType,
  TEAMS_INTEGRATION_VERSION,
  TEAMS_COMPATIBILITY_NOTES,
  TEAMS_NOTIFICATION_KEYS,
  TEAMS_ERROR_CODES,
  TEAMS_ADAPTIVE_CARD_VERSION,
  TEAMS_RATE_LIMITS,
  TEAMS_RETRY_DELAYS_MS,
  TEAMS_DEFAULT_MAX_ATTEMPTS,
  TeamsNotificationSeverity,
  TeamsAdaptiveCardActionType,
  m1TeamsNotificationContractManifest,
  m1TeamsIntegrationManifest,
  isValidTeamsNotificationKey,
  isValidDeliveryMode,
  getNotificationContract,
  getAllTeamsNotificationContracts,
  validateTeamsNotificationInput,
  validateAdaptiveCardCallback,
  buildTeamsErrorResponse,
  buildTeamsSuccessResponse,
  getTeamsRetryDelayMs,
  isRetryableError,
  isTerminalError,
  teamsDeliveryModeSchema,
  teamsOperationTypeSchema,
  teamsNotificationSeveritySchema,
  teamsNotificationPayloadSchema,
  teamsChannelBindingSchema,
  teamsOperationInputSchema,
  teamsOperationOutputSchema,
  teamsAdaptiveCardActionSchema,
  teamsAdaptiveCardSchema,
  teamsWebhookFallbackSchema,
  teamsWebhookDeliverySchema,
  teamsIntegrationMetadataSchema,
} from './teams-contract';

describe('teams-contract constants', () => {
  describe('TeamsDeliveryMode', () => {
    it('should have correct TEAMS_APP value', () => {
      expect(TeamsDeliveryMode.TEAMS_APP).toBe('teams-app');
    });

    it('should have correct INCOMING_WEBHOOK value', () => {
      expect(TeamsDeliveryMode.INCOMING_WEBHOOK).toBe('incoming-webhook');
    });
  });

  describe('TeamsOperationType', () => {
    it('should have correct NOTIFICATION value', () => {
      expect(TeamsOperationType.NOTIFICATION).toBe('notification');
    });

    it('should have correct ADAPTIVE_CARD value', () => {
      expect(TeamsOperationType.ADAPTIVE_CARD).toBe('adaptive_card');
    });

    it('should have correct WEBHOOK_FALLBACK value', () => {
      expect(TeamsOperationType.WEBHOOK_FALLBACK).toBe('webhook_fallback');
    });
  });

  describe('TEAMS_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(TEAMS_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('TEAMS_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(TEAMS_COMPATIBILITY_NOTES).toContain('OAuth2');
    });

    it('should mention Bot Framework', () => {
      expect(TEAMS_COMPATIBILITY_NOTES).toContain('Bot Framework');
    });
  });

  describe('TEAMS_ADAPTIVE_CARD_VERSION', () => {
    it('should be 1.4', () => {
      expect(TEAMS_ADAPTIVE_CARD_VERSION).toBe('1.4');
    });
  });

  describe('TEAMS_RATE_LIMITS', () => {
    it('should have notifications per minute limit', () => {
      expect(TEAMS_RATE_LIMITS.NOTIFICATIONS_PER_MINUTE).toBe(30);
    });

    it('should have notifications per hour limit', () => {
      expect(TEAMS_RATE_LIMITS.NOTIFICATIONS_PER_HOUR).toBe(500);
    });

    it('should have adaptive cards per minute limit', () => {
      expect(TEAMS_RATE_LIMITS.ADAPTIVE_CARDS_PER_MINUTE).toBe(20);
    });

    it('should have non-critical per user per day limit', () => {
      expect(TEAMS_RATE_LIMITS.NON_CRITICAL_PER_USER_PER_DAY).toBe(2);
    });
  });

  describe('TEAMS_RETRY_DELAYS_MS', () => {
    it('should have 5 retry delays', () => {
      expect(TEAMS_RETRY_DELAYS_MS).toHaveLength(5);
    });

    it('should have increasing delays', () => {
      for (let i = 1; i < TEAMS_RETRY_DELAYS_MS.length; i++) {
        expect(TEAMS_RETRY_DELAYS_MS[i]!).toBeGreaterThan(TEAMS_RETRY_DELAYS_MS[i - 1]!);
      }
    });
  });

  describe('TEAMS_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(TEAMS_ERROR_CODES.INVALID_INPUT).toBe('TEAMS_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(TEAMS_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('TEAMS_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(TEAMS_ERROR_CODES.TENANT_MISMATCH).toBe('TEAMS_TENANT_MISMATCH');
    });

    it('should have CHANNEL_NOT_FOUND error code', () => {
      expect(TEAMS_ERROR_CODES.CHANNEL_NOT_FOUND).toBe('TEAMS_CHANNEL_NOT_FOUND');
    });

    it('should have WEBHOOK_REVOKED error code', () => {
      expect(TEAMS_ERROR_CODES.WEBHOOK_REVOKED).toBe('TEAMS_WEBHOOK_REVOKED');
    });

    it('should have RATE_LIMIT_EXCEEDED error code', () => {
      expect(TEAMS_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('TEAMS_RATE_LIMIT_EXCEEDED');
    });

    it('should have CARD_EXPIRED error code', () => {
      expect(TEAMS_ERROR_CODES.CARD_EXPIRED).toBe('TEAMS_CARD_EXPIRED');
    });

    it('should have DEFERRED error code', () => {
      expect(TEAMS_ERROR_CODES.DEFERRED).toBe('TEAMS_DEFERRED');
    });
  });

  describe('TEAMS_NOTIFICATION_KEYS', () => {
    it('should include user_created notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('user_created');
    });

    it('should include user_updated notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('user_updated');
    });

    it('should include session_created notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('session_created');
    });

    it('should include login_failed notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('login_failed');
    });

    it('should include mfa_enabled notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('mfa_enabled');
    });

    it('should include training_assigned notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('training_assigned');
    });

    it('should include training_completed notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('training_completed');
    });

    it('should include training_overdue notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('training_overdue');
    });

    it('should include report_ready notification', () => {
      expect(TEAMS_NOTIFICATION_KEYS).toContain('report_ready');
    });
  });

  describe('TeamsNotificationSeverity', () => {
    it('should have CRITICAL severity', () => {
      expect(TeamsNotificationSeverity.CRITICAL).toBe('critical');
    });

    it('should have HIGH severity', () => {
      expect(TeamsNotificationSeverity.HIGH).toBe('high');
    });

    it('should have MEDIUM severity', () => {
      expect(TeamsNotificationSeverity.MEDIUM).toBe('medium');
    });

    it('should have LOW severity', () => {
      expect(TeamsNotificationSeverity.LOW).toBe('low');
    });

    it('should have INFO severity', () => {
      expect(TeamsNotificationSeverity.INFO).toBe('info');
    });
  });

  describe('TeamsAdaptiveCardActionType', () => {
    it('should have ACKNOWLEDGE type', () => {
      expect(TeamsAdaptiveCardActionType.ACKNOWLEDGE).toBe('teamsAcknowledge');
    });

    it('should have VIEW_DETAILS type', () => {
      expect(TeamsAdaptiveCardActionType.VIEW_DETAILS).toBe('teamsViewDetails');
    });

    it('should have OPEN_REPORT type', () => {
      expect(TeamsAdaptiveCardActionType.OPEN_REPORT).toBe('teamsOpenReport');
    });

    it('should have OPEN_TRAINING type', () => {
      expect(TeamsAdaptiveCardActionType.OPEN_TRAINING).toBe('teamsOpenTraining');
    });

    it('should have CUSTOM type', () => {
      expect(TeamsAdaptiveCardActionType.CUSTOM).toBe('custom');
    });
  });
});

describe('teams-contract manifests', () => {
  describe('m1TeamsNotificationContractManifest', () => {
    it('should have contract for user_created notification', () => {
      const contract = m1TeamsNotificationContractManifest.user_created;
      expect(contract.key).toBe('user_created');
      expect(contract.templateKey).toBe('userCreated');
      expect(contract.supportsAdaptiveCard).toBe(true);
      expect(contract.requiredScopes).toContain('teams.notification');
    });

    it('should have contract for login_failed with HIGH severity', () => {
      const contract = m1TeamsNotificationContractManifest.login_failed;
      expect(contract.severity).toBe(TeamsNotificationSeverity.HIGH);
    });

    it('should have contract for training_overdue with deep link', () => {
      const contract = m1TeamsNotificationContractManifest.training_overdue;
      expect(contract.requiredPayloadFields).toContain('deepLinkTarget');
    });

    it('should have contract for all required notifications', () => {
      TEAMS_NOTIFICATION_KEYS.forEach((key) => {
        const contract = m1TeamsNotificationContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(TEAMS_INTEGRATION_VERSION);
      });
    });

    it('should map user_created to auth.user.created event', () => {
      const contract = m1TeamsNotificationContractManifest.user_created;
      expect(contract.eventType).toBe('auth.user.created');
    });

    it('should have adaptive card version for supported notifications', () => {
      const contract = m1TeamsNotificationContractManifest.user_created;
      expect(contract.adaptiveCardVersion).toBe(TEAMS_ADAPTIVE_CARD_VERSION);
    });

    it('should support webhook fallback for most notifications', () => {
      const contract = m1TeamsNotificationContractManifest.user_created;
      expect(contract.deliveryModes).toContain(TeamsDeliveryMode.INCOMING_WEBHOOK);
    });

    it('should not allow forbidden fields in payload', () => {
      const contract = m1TeamsNotificationContractManifest.user_created;
      expect(contract.forbiddenPayloadFields).toContain('password');
      expect(contract.forbiddenPayloadFields).toContain('passwordHash');
    });

    it('should have login_success only via teams-app mode', () => {
      const contract = m1TeamsNotificationContractManifest.login_success;
      expect(contract.deliveryModes).toContain(TeamsDeliveryMode.TEAMS_APP);
      expect(contract.deliveryModes).not.toContain(TeamsDeliveryMode.INCOMING_WEBHOOK);
    });

    it('should have session_created only via teams-app mode', () => {
      const contract = m1TeamsNotificationContractManifest.session_created;
      expect(contract.deliveryModes).toContain(TeamsDeliveryMode.TEAMS_APP);
      expect(contract.deliveryModes).not.toContain(TeamsDeliveryMode.INCOMING_WEBHOOK);
    });
  });

  describe('m1TeamsIntegrationManifest', () => {
    it('should have valid integration version', () => {
      expect(m1TeamsIntegrationManifest.integrationVersion).toBe(TEAMS_INTEGRATION_VERSION);
    });

    it('should have compatibility notes', () => {
      expect(m1TeamsIntegrationManifest.compatibilityNotes).toBe(TEAMS_COMPATIBILITY_NOTES);
    });

    it('should support all delivery modes', () => {
      expect(m1TeamsIntegrationManifest.supportedDeliveryModes).toContain(
        TeamsDeliveryMode.TEAMS_APP,
      );
      expect(m1TeamsIntegrationManifest.supportedDeliveryModes).toContain(
        TeamsDeliveryMode.INCOMING_WEBHOOK,
      );
    });

    it('should support all operation types', () => {
      expect(m1TeamsIntegrationManifest.supportedOperations).toContain(
        TeamsOperationType.NOTIFICATION,
      );
      expect(m1TeamsIntegrationManifest.supportedOperations).toContain(
        TeamsOperationType.ADAPTIVE_CARD,
      );
      expect(m1TeamsIntegrationManifest.supportedOperations).toContain(
        TeamsOperationType.WEBHOOK_FALLBACK,
      );
    });

    it('should require tenant binding', () => {
      expect(m1TeamsIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should require channel binding', () => {
      expect(m1TeamsIntegrationManifest.authRequirements.requiresChannelBinding).toBe(true);
    });

    it('should include oauth scopes', () => {
      expect(m1TeamsIntegrationManifest.authRequirements.oauthScopes).toContain('teams.read');
      expect(m1TeamsIntegrationManifest.authRequirements.oauthScopes).toContain('teams.write');
      expect(m1TeamsIntegrationManifest.authRequirements.oauthScopes).toContain(
        'teams.notification',
      );
      expect(m1TeamsIntegrationManifest.authRequirements.oauthScopes).toContain(
        'teams.adaptive_card',
      );
    });

    it('should include api key scopes', () => {
      expect(m1TeamsIntegrationManifest.authRequirements.apiKeyScopes).toContain('integrations');
    });

    it('should pass schema validation', () => {
      const result = teamsIntegrationMetadataSchema.safeParse(m1TeamsIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });
});

describe('teams-contract utility functions', () => {
  describe('isValidTeamsNotificationKey', () => {
    it('should return true for valid notification key', () => {
      expect(isValidTeamsNotificationKey('user_created')).toBe(true);
    });

    it('should return false for invalid notification key', () => {
      expect(isValidTeamsNotificationKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidDeliveryMode', () => {
    it('should return true for teams-app mode', () => {
      expect(isValidDeliveryMode('teams-app')).toBe(true);
    });

    it('should return true for incoming-webhook mode', () => {
      expect(isValidDeliveryMode('incoming-webhook')).toBe(true);
    });

    it('should return false for invalid mode', () => {
      expect(isValidDeliveryMode('invalid_mode')).toBe(false);
    });
  });

  describe('getNotificationContract', () => {
    it('should return contract for valid notification key', () => {
      const contract = getNotificationContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getAllTeamsNotificationContracts', () => {
    it('should return all notification contracts', () => {
      const contracts = getAllTeamsNotificationContracts();
      expect(contracts.length).toBe(TEAMS_NOTIFICATION_KEYS.length);
    });
  });

  describe('validateTeamsNotificationInput', () => {
    it('should validate valid notification input', () => {
      const validInput = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'auth.user.created',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-15T10:30:00Z',
        severity: TeamsNotificationSeverity.INFO,
        templateKey: 'userCreated',
        templateLabel: 'User Created',
        data: {},
      };
      const result = validateTeamsNotificationInput('user_created', validInput);
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
      const result = validateTeamsNotificationInput('user_created', invalidInput);
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown notification key', () => {
      const result = validateTeamsNotificationInput('unknown_notification', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAdaptiveCardCallback', () => {
    it('should validate valid callback payload', () => {
      const validPayload = {
        actionType: 'teamsAcknowledge',
        actionId: 'action-123',
        cardId: '550e8400-e29b-41d4-a716-446655440000',
        interactionTimestamp: '2024-01-15T10:30:00Z',
        userId: '770e8400-e29b-41d4-a716-446655440002',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        payload: {},
      };
      const result = validateAdaptiveCardCallback(validPayload);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid callback payload', () => {
      const invalidPayload = {
        actionType: 'teamsAcknowledge',
        actionId: 'action-123',
        cardId: 'invalid-uuid',
        interactionTimestamp: '2024-01-15T10:30:00Z',
        userId: '770e8400-e29b-41d4-a716-446655440002',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        payload: {},
      };
      const result = validateAdaptiveCardCallback(invalidPayload);
      expect(result.valid).toBe(false);
    });
  });

  describe('buildTeamsErrorResponse', () => {
    it('should build valid error response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildTeamsErrorResponse({
        code: TEAMS_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input provided',
        operationType: TeamsOperationType.NOTIFICATION,
        deliveryMode: TeamsDeliveryMode.TEAMS_APP,
        tenantId,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TEAMS_INVALID_INPUT');
      expect(response.error?.message).toBe('Invalid input provided');
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(TeamsOperationType.NOTIFICATION);
      expect(response.metadata?.deliveryMode).toBe(TeamsDeliveryMode.TEAMS_APP);
    });
  });

  describe('buildTeamsSuccessResponse', () => {
    it('should build valid success response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { messageId: 'msg-123' };
      const response = buildTeamsSuccessResponse({
        data,
        operationType: TeamsOperationType.NOTIFICATION,
        deliveryMode: TeamsDeliveryMode.TEAMS_APP,
        tenantId,
        idempotencyKey: 'notif-123',
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(TeamsOperationType.NOTIFICATION);
      expect(response.metadata?.deliveryMode).toBe(TeamsDeliveryMode.TEAMS_APP);
      expect(response.metadata?.idempotencyKey).toBe('notif-123');
    });

    it('should work without idempotency key', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { messageId: 'msg-123' };
      const response = buildTeamsSuccessResponse({
        data,
        operationType: TeamsOperationType.NOTIFICATION,
        deliveryMode: TeamsDeliveryMode.INCOMING_WEBHOOK,
        tenantId,
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.idempotencyKey).toBeUndefined();
    });
  });

  describe('getTeamsRetryDelayMs', () => {
    it('should return first delay for attempt 1', () => {
      expect(getTeamsRetryDelayMs(1)).toBe(60000);
    });

    it('should return second delay for attempt 2', () => {
      expect(getTeamsRetryDelayMs(2)).toBe(300000);
    });

    it('should return last delay for attempts beyond array length', () => {
      expect(getTeamsRetryDelayMs(10)).toBe(28800000);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for DEFERRED error', () => {
      expect(isRetryableError(TEAMS_ERROR_CODES.DEFERRED)).toBe(true);
    });

    it('should return true for RATE_LIMIT_EXCEEDED error', () => {
      expect(isRetryableError(TEAMS_ERROR_CODES.RATE_LIMIT_EXCEEDED)).toBe(true);
    });

    it('should return false for WEBHOOK_REVOKED error', () => {
      expect(isRetryableError(TEAMS_ERROR_CODES.WEBHOOK_REVOKED)).toBe(false);
    });

    it('should return false for TENANT_MISMATCH error', () => {
      expect(isRetryableError(TEAMS_ERROR_CODES.TENANT_MISMATCH)).toBe(false);
    });
  });

  describe('isTerminalError', () => {
    it('should return true for WEBHOOK_REVOKED error', () => {
      expect(isTerminalError(TEAMS_ERROR_CODES.WEBHOOK_REVOKED)).toBe(true);
    });

    it('should return true for WEBHOOK_PERMISSION_DENIED error', () => {
      expect(isTerminalError(TEAMS_ERROR_CODES.WEBHOOK_PERMISSION_DENIED)).toBe(true);
    });

    it('should return true for TENANT_MISMATCH error', () => {
      expect(isTerminalError(TEAMS_ERROR_CODES.TENANT_MISMATCH)).toBe(true);
    });

    it('should return true for CHANNEL_NOT_FOUND error', () => {
      expect(isTerminalError(TEAMS_ERROR_CODES.CHANNEL_NOT_FOUND)).toBe(true);
    });

    it('should return false for DEFERRED error', () => {
      expect(isTerminalError(TEAMS_ERROR_CODES.DEFERRED)).toBe(false);
    });

    it('should return false for RATE_LIMIT_EXCEEDED error', () => {
      expect(isTerminalError(TEAMS_ERROR_CODES.RATE_LIMIT_EXCEEDED)).toBe(false);
    });
  });
});

describe('teams-contract Zod schemas', () => {
  describe('teamsDeliveryModeSchema', () => {
    it('should validate teams-app', () => {
      const result = teamsDeliveryModeSchema.safeParse('teams-app');
      expect(result.success).toBe(true);
    });

    it('should validate incoming-webhook', () => {
      const result = teamsDeliveryModeSchema.safeParse('incoming-webhook');
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const result = teamsDeliveryModeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('teamsOperationTypeSchema', () => {
    it('should validate notification', () => {
      const result = teamsOperationTypeSchema.safeParse('notification');
      expect(result.success).toBe(true);
    });

    it('should validate adaptive_card', () => {
      const result = teamsOperationTypeSchema.safeParse('adaptive_card');
      expect(result.success).toBe(true);
    });

    it('should validate webhook_fallback', () => {
      const result = teamsOperationTypeSchema.safeParse('webhook_fallback');
      expect(result.success).toBe(true);
    });

    it('should reject invalid operation type', () => {
      const result = teamsOperationTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('teamsNotificationSeveritySchema', () => {
    it('should validate critical', () => {
      const result = teamsNotificationSeveritySchema.safeParse('critical');
      expect(result.success).toBe(true);
    });

    it('should validate high', () => {
      const result = teamsNotificationSeveritySchema.safeParse('high');
      expect(result.success).toBe(true);
    });

    it('should validate medium', () => {
      const result = teamsNotificationSeveritySchema.safeParse('medium');
      expect(result.success).toBe(true);
    });

    it('should validate low', () => {
      const result = teamsNotificationSeveritySchema.safeParse('low');
      expect(result.success).toBe(true);
    });

    it('should validate info', () => {
      const result = teamsNotificationSeveritySchema.safeParse('info');
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const result = teamsNotificationSeveritySchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('teamsNotificationPayloadSchema', () => {
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
      const result = teamsNotificationPayloadSchema.safeParse(payload);
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
      const result = teamsNotificationPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('teamsChannelBindingSchema', () => {
    it('should validate valid channel binding', () => {
      const binding = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        channelId: 'channel-123',
        recipientId: '770e8400-e29b-41d4-a716-446655440002',
        recipientType: 'user',
      };
      const result = teamsChannelBindingSchema.safeParse(binding);
      expect(result.success).toBe(true);
    });

    it('should default recipientType to user', () => {
      const binding = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      };
      const result = teamsChannelBindingSchema.safeParse(binding);
      expect(result.success).toBe(true);
      expect(result.data?.recipientType).toBe('user');
    });
  });

  describe('teamsOperationInputSchema', () => {
    it('should validate valid operation input', () => {
      const input = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        channelBinding: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          channelId: 'channel-123',
        },
        idempotencyKey: 'key-123',
      };
      const result = teamsOperationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('teamsOperationOutputSchema', () => {
    it('should validate valid success output', () => {
      const output = {
        success: true,
        data: { messageId: 'msg-123' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'notification',
          deliveryMode: 'teams-app',
        },
      };
      const result = teamsOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('should validate valid error output', () => {
      const output = {
        success: false,
        error: {
          code: 'TEAMS_INVALID_INPUT',
          message: 'Invalid input',
        },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'notification',
          deliveryMode: 'teams-app',
        },
      };
      const result = teamsOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('teamsAdaptiveCardActionSchema', () => {
    it('should validate acknowledge action', () => {
      const action = {
        type: 'teamsAcknowledge',
        id: 'action-123',
        title: 'Acknowledge',
      };
      const result = teamsAdaptiveCardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate view details action', () => {
      const action = {
        type: 'teamsViewDetails',
        id: 'action-123',
        title: 'View Details',
        targetUrl: 'https://example.com/details',
      };
      const result = teamsAdaptiveCardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate open report action', () => {
      const action = {
        type: 'teamsOpenReport',
        id: 'action-123',
        title: 'Open Report',
        reportId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = teamsAdaptiveCardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate open training action', () => {
      const action = {
        type: 'teamsOpenTraining',
        id: 'action-123',
        title: 'Open Training',
        trainingId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = teamsAdaptiveCardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should validate custom action', () => {
      const action = {
        type: 'custom',
        id: 'action-123',
        title: 'Custom Action',
        data: { key: 'value' },
      };
      const result = teamsAdaptiveCardActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });
  });

  describe('teamsAdaptiveCardSchema', () => {
    it('should validate valid adaptive card', () => {
      const card = {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'TextBlock',
            text: 'Hello World',
          },
        ],
        actions: [
          {
            type: 'teamsAcknowledge',
            id: 'action-123',
            title: 'Acknowledge',
          },
        ],
      };
      const result = teamsAdaptiveCardSchema.safeParse(card);
      expect(result.success).toBe(true);
    });

    it('should apply default $schema', () => {
      const card = {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [],
        actions: [],
      };
      const result = teamsAdaptiveCardSchema.safeParse(card);
      expect(result.success).toBe(true);
      expect(result.data?.$schema).toBe('http://adaptivecards.io/schemas/adaptive-card.json');
    });
  });

  describe('teamsWebhookFallbackSchema', () => {
    it('should validate valid webhook fallback', () => {
      const fallback = {
        webhookUrl: 'https://outlook.office.com/webhook/abc123',
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
      const result = teamsWebhookFallbackSchema.safeParse(fallback);
      expect(result.success).toBe(true);
    });

    it('should apply default retry policy', () => {
      const fallback = {
        webhookUrl: 'https://outlook.office.com/webhook/abc123',
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
      const result = teamsWebhookFallbackSchema.safeParse(fallback);
      expect(result.success).toBe(true);
      expect(result.data?.retryPolicy?.maxAttempts).toBe(5);
    });
  });

  describe('teamsWebhookDeliverySchema', () => {
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
      const result = teamsWebhookDeliverySchema.safeParse(delivery);
      expect(result.success).toBe(true);
    });
  });
});

describe('teams-contract cross-cutting concerns', () => {
  describe('Schema validation for all notification contracts', () => {
    it('should validate all notification contracts against schema', () => {
      Object.values(m1TeamsNotificationContractManifest).forEach((contract) => {
        const result = teamsNotificationPayloadSchema.safeParse({
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

  describe('Tenant isolation', () => {
    it('should require channel binding in integration manifest', () => {
      expect(m1TeamsIntegrationManifest.authRequirements.requiresChannelBinding).toBe(true);
    });

    it('should include tenantId in channel binding', () => {
      const binding = {
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        channelId: 'channel-123',
        recipientId: '770e8400-e29b-41d4-a716-446655440002',
        recipientType: 'user' as const,
      };
      const result = teamsChannelBindingSchema.safeParse(binding);
      expect(result.success).toBe(true);
    });

    it('should include tenantId in error responses', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildTeamsErrorResponse({
        code: TEAMS_ERROR_CODES.TENANT_MISMATCH,
        message: 'Tenant mismatch',
        operationType: TeamsOperationType.NOTIFICATION,
        deliveryMode: TeamsDeliveryMode.TEAMS_APP,
        tenantId,
      });

      expect(response.metadata?.tenantId).toBe(tenantId);
    });

    it('should include tenantId in success responses', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildTeamsSuccessResponse({
        data: { messageId: 'msg-123' },
        operationType: TeamsOperationType.NOTIFICATION,
        deliveryMode: TeamsDeliveryMode.TEAMS_APP,
        tenantId,
      });

      expect(response.metadata?.tenantId).toBe(tenantId);
    });
  });

  describe('Webhook event parity', () => {
    it('should map user_created to auth.user.created', () => {
      const contract = m1TeamsNotificationContractManifest.user_created;
      expect(contract.eventType).toBe('auth.user.created');
    });

    it('should map user_updated to auth.user.updated', () => {
      const contract = m1TeamsNotificationContractManifest.user_updated;
      expect(contract.eventType).toBe('auth.user.updated');
    });

    it('should map session_created to auth.session.created', () => {
      const contract = m1TeamsNotificationContractManifest.session_created;
      expect(contract.eventType).toBe('auth.session.created');
    });

    it('should map session_revoked to auth.session.revoked', () => {
      const contract = m1TeamsNotificationContractManifest.session_revoked;
      expect(contract.eventType).toBe('auth.session.revoked');
    });

    it('should map tenant_created to enterprise.tenant.created', () => {
      const contract = m1TeamsNotificationContractManifest.tenant_created;
      expect(contract.eventType).toBe('enterprise.tenant.created');
    });

    it('should map tenant_updated to enterprise.tenant.updated', () => {
      const contract = m1TeamsNotificationContractManifest.tenant_updated;
      expect(contract.eventType).toBe('enterprise.tenant.updated');
    });

    it('should map training_assigned to training.assigned', () => {
      const contract = m1TeamsNotificationContractManifest.training_assigned;
      expect(contract.eventType).toBe('training.assigned');
    });

    it('should map training_completed to training.completed', () => {
      const contract = m1TeamsNotificationContractManifest.training_completed;
      expect(contract.eventType).toBe('training.completed');
    });
  });

  describe('Retry and DLQ behavior', () => {
    it('should have default max attempts', () => {
      expect(TEAMS_DEFAULT_MAX_ATTEMPTS).toBe(5);
    });

    it('should have retry delays for webhook fallback', () => {
      expect(TEAMS_RETRY_DELAYS_MS).toHaveLength(5);
    });

    it('should have increasing retry delays', () => {
      for (let i = 1; i < TEAMS_RETRY_DELAYS_MS.length; i++) {
        expect(TEAMS_RETRY_DELAYS_MS[i]!).toBeGreaterThan(TEAMS_RETRY_DELAYS_MS[i - 1]!);
      }
    });
  });

  describe('Rate limiting', () => {
    it('should enforce notifications per minute', () => {
      expect(TEAMS_RATE_LIMITS.NOTIFICATIONS_PER_MINUTE).toBeGreaterThan(0);
    });

    it('should enforce notifications per hour', () => {
      expect(TEAMS_RATE_LIMITS.NOTIFICATIONS_PER_HOUR).toBeGreaterThan(
        TEAMS_RATE_LIMITS.NOTIFICATIONS_PER_MINUTE,
      );
    });

    it('should enforce non-critical notifications per user per day', () => {
      expect(TEAMS_RATE_LIMITS.NON_CRITICAL_PER_USER_PER_DAY).toBe(2);
    });
  });
});
