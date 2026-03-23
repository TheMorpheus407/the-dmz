import { describe, it, expect } from 'vitest';

import {
  TrayIOperationType,
  TRAY_IO_INTEGRATION_VERSION,
  TRAY_IO_COMPATIBILITY_NOTES,
  TRAY_IO_TRIGGER_KEYS,
  TRAY_IO_ACTION_KEYS,
  TRAY_IO_OUTPUT_INVARIANTS,
  TRAY_IO_ERROR_CODES,
  m1TrayIOTriggerContractManifest,
  m1TrayIOActionContractManifest,
  m1TrayIOIntegrationManifest,
  isValidTrayIOTriggerKey,
  isValidTrayIOActionKey,
  getTrayIOTriggerContract,
  getTrayIOActionContract,
  getAllTrayIOOperationContracts,
  validateTrayIOInput,
  buildTrayIOErrorResponse,
  buildTrayIOSuccessResponse,
  trayIOIntegrationMetadataSchema,
  trayIOOperationOutputSchema,
  trayIOTriggerPayloadSchema,
} from '@the-dmz/shared/contracts/tray-io-contract';

describe('tray-io-contract', () => {
  describe('TrayIOperationType', () => {
    it('should have correct CONNECTOR_TRIGGER value', () => {
      expect(TrayIOperationType.CONNECTOR_TRIGGER).toBe('connector_trigger');
    });

    it('should have correct CONNECTOR_ACTION value', () => {
      expect(TrayIOperationType.CONNECTOR_ACTION).toBe('connector_action');
    });
  });

  describe('TRAY_IO_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(TRAY_IO_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('TRAY_IO_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(TRAY_IO_COMPATIBILITY_NOTES).toContain('OAuth2');
    });
  });

  describe('TRAY_IO_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(TRAY_IO_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(TRAY_IO_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(TRAY_IO_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should enforce stable field naming', () => {
      expect(TRAY_IO_OUTPUT_INVARIANTS.STABLE_FIELD_NAMING).toBe(true);
    });

    it('should require connector metadata', () => {
      expect(TRAY_IO_OUTPUT_INVARIANTS.CONNECTOR_METADATA_REQUIRED).toBe(true);
    });
  });

  describe('TRAY_IO_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(TRAY_IO_ERROR_CODES.INVALID_INPUT).toBe('TRAY_IO_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(TRAY_IO_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('TRAY_IO_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(TRAY_IO_ERROR_CODES.TENANT_MISMATCH).toBe('TRAY_IO_TENANT_MISMATCH');
    });

    it('should have CONNECTOR_NOT_FOUND error code', () => {
      expect(TRAY_IO_ERROR_CODES.CONNECTOR_NOT_FOUND).toBe('TRAY_IO_CONNECTOR_NOT_FOUND');
    });

    it('should have CONNECTOR_DISABLED error code', () => {
      expect(TRAY_IO_ERROR_CODES.CONNECTOR_DISABLED).toBe('TRAY_IO_CONNECTOR_DISABLED');
    });
  });

  describe('TRAY_IO_TRIGGER_KEYS', () => {
    it('should include user_created trigger', () => {
      expect(TRAY_IO_TRIGGER_KEYS).toContain('user_created');
    });

    it('should include user_updated trigger', () => {
      expect(TRAY_IO_TRIGGER_KEYS).toContain('user_updated');
    });

    it('should have 10 trigger keys', () => {
      expect(TRAY_IO_TRIGGER_KEYS.length).toBe(10);
    });
  });

  describe('TRAY_IO_ACTION_KEYS', () => {
    it('should include create_user action', () => {
      expect(TRAY_IO_ACTION_KEYS).toContain('create_user');
    });

    it('should include update_user action', () => {
      expect(TRAY_IO_ACTION_KEYS).toContain('update_user');
    });

    it('should have 5 action keys', () => {
      expect(TRAY_IO_ACTION_KEYS.length).toBe(5);
    });
  });

  describe('m1TrayIOTriggerContractManifest', () => {
    it('should have user_created contract', () => {
      expect(m1TrayIOTriggerContractManifest.user_created).toBeDefined();
    });

    it('should have correct operation type for user_created', () => {
      expect(m1TrayIOTriggerContractManifest.user_created.operationType).toBe(
        TrayIOperationType.CONNECTOR_TRIGGER,
      );
    });

    it('should have sample payload for user_created', () => {
      expect(m1TrayIOTriggerContractManifest.user_created.samplePayload).toBeDefined();
    });

    it('should require tenant binding', () => {
      expect(m1TrayIOTriggerContractManifest.user_created.tenantBindingRequired).toBe(true);
    });

    it('should have connectorId', () => {
      expect(m1TrayIOTriggerContractManifest.user_created.connectorId).toBeDefined();
    });

    it('should have operationId', () => {
      expect(m1TrayIOTriggerContractManifest.user_created.operationId).toBeDefined();
    });
  });

  describe('m1TrayIOActionContractManifest', () => {
    it('should have create_user contract', () => {
      expect(m1TrayIOActionContractManifest.create_user).toBeDefined();
    });

    it('should have correct operation type for create_user', () => {
      expect(m1TrayIOActionContractManifest.create_user.operationType).toBe(
        TrayIOperationType.CONNECTOR_ACTION,
      );
    });

    it('should support idempotency for create_user', () => {
      expect(m1TrayIOActionContractManifest.create_user.idempotencySupported).toBe(true);
    });

    it('should have idempotency key format', () => {
      expect(m1TrayIOActionContractManifest.create_user.idempotencyKeyFormat).toBeDefined();
    });
  });

  describe('m1TrayIOIntegrationManifest', () => {
    it('should have correct integration version', () => {
      expect(m1TrayIOIntegrationManifest.integrationVersion).toBe(TRAY_IO_INTEGRATION_VERSION);
    });

    it('should require tenant binding', () => {
      expect(m1TrayIOIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include tray_io.connector scope', () => {
      expect(m1TrayIOIntegrationManifest.authRequirements.oauthScopes).toContain(
        'tray_io.connector',
      );
    });
  });

  describe('isValidTrayIOTriggerKey', () => {
    it('should return true for valid trigger key', () => {
      expect(isValidTrayIOTriggerKey('user_created')).toBe(true);
    });

    it('should return false for invalid trigger key', () => {
      expect(isValidTrayIOTriggerKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidTrayIOActionKey', () => {
    it('should return true for valid action key', () => {
      expect(isValidTrayIOActionKey('create_user')).toBe(true);
    });

    it('should return false for invalid action key', () => {
      expect(isValidTrayIOActionKey('invalid_key')).toBe(false);
    });
  });

  describe('getTrayIOTriggerContract', () => {
    it('should return trigger contract for valid key', () => {
      const contract = getTrayIOTriggerContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getTrayIOActionContract', () => {
    it('should return action contract for valid key', () => {
      const contract = getTrayIOActionContract('create_user');
      expect(contract.key).toBe('create_user');
    });
  });

  describe('getAllTrayIOOperationContracts', () => {
    it('should return all operation contracts', () => {
      const contracts = getAllTrayIOOperationContracts();
      expect(contracts.length).toBe(15);
    });
  });

  describe('validateTrayIOInput', () => {
    it('should validate correct action input', () => {
      const result = validateTrayIOInput('create_user', {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action input', () => {
      const result = validateTrayIOInput('create_user', {
        email: 'not-an-email',
      });
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown operation key', () => {
      const result = validateTrayIOInput('unknown_operation', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildTrayIOErrorResponse', () => {
    it('should build error response correctly', () => {
      const response = buildTrayIOErrorResponse({
        code: TRAY_IO_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input',
        operationType: TrayIOperationType.CONNECTOR_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      });
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TRAY_IO_INVALID_INPUT');
      expect(response.metadata?.tenantId).toBe('660e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('buildTrayIOSuccessResponse', () => {
    it('should build success response correctly', () => {
      const response = buildTrayIOSuccessResponse({
        data: { id: '123' },
        operationType: TrayIOperationType.CONNECTOR_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        idempotencyKey: 'test-key',
      });
      expect(response.success).toBe(true);
      expect(response.data?.id).toBe('123');
      expect(response.metadata?.idempotencyKey).toBe('test-key');
    });
  });
});

describe('tray-io-contract schemas and invariants', () => {
  describe('trayIOIntegrationMetadataSchema', () => {
    it('should validate correct metadata', () => {
      const result = trayIOIntegrationMetadataSchema.safeParse(m1TrayIOIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });

  describe('trayIOOperationOutputSchema', () => {
    it('should validate success response', () => {
      const result = trayIOOperationOutputSchema.safeParse({
        success: true,
        data: { id: '123' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'connector_action',
          operationKey: 'create_user',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate error response', () => {
      const result = trayIOOperationOutputSchema.safeParse({
        success: false,
        error: { code: 'ERROR', message: 'Error occurred' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'connector_action',
          operationKey: 'create_user',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('trayIOTriggerPayloadSchema', () => {
    it('should validate trigger payload', () => {
      const result = trayIOTriggerPayloadSchema.safeParse({
        eventType: 'auth.user.created',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        occurredAt: '2024-01-15T10:30:00Z',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        version: 1,
        data: { id: '123' },
        triggerKey: 'user_created',
        triggerLabel: 'User Created',
        triggerDescription: 'User created trigger',
        connectorId: '550e8400-e29b-41d4-a716-446655440001',
        connectorName: 'User Connector',
        operationId: '550e8400-e29b-41d4-a716-446655440101',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('should enforce tenant binding in all triggers', () => {
      Object.values(m1TrayIOTriggerContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });

    it('should enforce tenant binding in all actions', () => {
      Object.values(m1TrayIOActionContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });
  });

  describe('envelope parity with Zapier', () => {
    it('should have same success/data/error/metadata structure as Zapier', () => {
      const trayIOResponse = buildTrayIOSuccessResponse({
        data: {},
        operationType: TrayIOperationType.CONNECTOR_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      });
      expect(trayIOResponse).toHaveProperty('success');
      expect(trayIOResponse).toHaveProperty('data');
      expect(trayIOResponse).toHaveProperty('metadata');
      expect(trayIOResponse.success).toBe(true);
      expect(trayIOResponse.error).toBeUndefined();
    });
  });
});
