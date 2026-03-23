import { describe, it, expect } from 'vitest';

import {
  WorkatoOperationType,
  WORKATO_INTEGRATION_VERSION,
  WORKATO_COMPATIBILITY_NOTES,
  WORKATO_TRIGGER_KEYS,
  WORKATO_ACTION_KEYS,
  WORKATO_OUTPUT_INVARIANTS,
  WORKATO_ERROR_CODES,
  m1WorkatoTriggerContractManifest,
  m1WorkatoActionContractManifest,
  m1WorkatoIntegrationManifest,
  isValidWorkatoTriggerKey,
  isValidWorkatoActionKey,
  getWorkatoTriggerContract,
  getWorkatoActionContract,
  getAllWorkatoOperationContracts,
  validateWorkatoInput,
  buildWorkatoErrorResponse,
  buildWorkatoSuccessResponse,
  workatoIntegrationMetadataSchema,
  workatoOperationOutputSchema,
  workatoTriggerPayloadSchema,
} from '@the-dmz/shared/contracts/workato-contract';

describe('workato-contract', () => {
  describe('WorkatoOperationType', () => {
    it('should have correct RECIPE_TRIGGER value', () => {
      expect(WorkatoOperationType.RECIPE_TRIGGER).toBe('recipe_trigger');
    });

    it('should have correct RECIPE_ACTION value', () => {
      expect(WorkatoOperationType.RECIPE_ACTION).toBe('recipe_action');
    });
  });

  describe('WORKATO_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(WORKATO_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('WORKATO_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(WORKATO_COMPATIBILITY_NOTES).toContain('OAuth2');
    });
  });

  describe('WORKATO_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(WORKATO_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(WORKATO_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(WORKATO_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should enforce stable field naming', () => {
      expect(WORKATO_OUTPUT_INVARIANTS.STABLE_FIELD_NAMING).toBe(true);
    });

    it('should require recipe metadata', () => {
      expect(WORKATO_OUTPUT_INVARIANTS.RECIPE_METADATA_REQUIRED).toBe(true);
    });
  });

  describe('WORKATO_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(WORKATO_ERROR_CODES.INVALID_INPUT).toBe('WORKATO_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(WORKATO_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('WORKATO_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(WORKATO_ERROR_CODES.TENANT_MISMATCH).toBe('WORKATO_TENANT_MISMATCH');
    });

    it('should have NOT_FOUND error code', () => {
      expect(WORKATO_ERROR_CODES.NOT_FOUND).toBe('WORKATO_NOT_FOUND');
    });

    it('should have IDEMPOTENCY_CONFLICT error code', () => {
      expect(WORKATO_ERROR_CODES.IDEMPOTENCY_CONFLICT).toBe('WORKATO_IDEMPOTENCY_CONFLICT');
    });

    it('should have RECIPE_NOT_FOUND error code', () => {
      expect(WORKATO_ERROR_CODES.RECIPE_NOT_FOUND).toBe('WORKATO_RECIPE_NOT_FOUND');
    });
  });

  describe('WORKATO_TRIGGER_KEYS', () => {
    it('should include user_created trigger', () => {
      expect(WORKATO_TRIGGER_KEYS).toContain('user_created');
    });

    it('should include user_updated trigger', () => {
      expect(WORKATO_TRIGGER_KEYS).toContain('user_updated');
    });

    it('should have 10 trigger keys', () => {
      expect(WORKATO_TRIGGER_KEYS.length).toBe(10);
    });
  });

  describe('WORKATO_ACTION_KEYS', () => {
    it('should include create_user action', () => {
      expect(WORKATO_ACTION_KEYS).toContain('create_user');
    });

    it('should include update_user action', () => {
      expect(WORKATO_ACTION_KEYS).toContain('update_user');
    });

    it('should have 5 action keys', () => {
      expect(WORKATO_ACTION_KEYS.length).toBe(5);
    });
  });

  describe('m1WorkatoTriggerContractManifest', () => {
    it('should have user_created contract', () => {
      expect(m1WorkatoTriggerContractManifest.user_created).toBeDefined();
    });

    it('should have correct operation type for user_created', () => {
      expect(m1WorkatoTriggerContractManifest.user_created.operationType).toBe(
        WorkatoOperationType.RECIPE_TRIGGER,
      );
    });

    it('should have sample payload for user_created', () => {
      expect(m1WorkatoTriggerContractManifest.user_created.samplePayload).toBeDefined();
    });

    it('should require tenant binding', () => {
      expect(m1WorkatoTriggerContractManifest.user_created.tenantBindingRequired).toBe(true);
    });
  });

  describe('m1WorkatoActionContractManifest', () => {
    it('should have create_user contract', () => {
      expect(m1WorkatoActionContractManifest.create_user).toBeDefined();
    });

    it('should have correct operation type for create_user', () => {
      expect(m1WorkatoActionContractManifest.create_user.operationType).toBe(
        WorkatoOperationType.RECIPE_ACTION,
      );
    });

    it('should support idempotency for create_user', () => {
      expect(m1WorkatoActionContractManifest.create_user.idempotencySupported).toBe(true);
    });

    it('should have idempotency key format', () => {
      expect(m1WorkatoActionContractManifest.create_user.idempotencyKeyFormat).toBeDefined();
    });
  });

  describe('m1WorkatoIntegrationManifest', () => {
    it('should have correct integration version', () => {
      expect(m1WorkatoIntegrationManifest.integrationVersion).toBe(WORKATO_INTEGRATION_VERSION);
    });

    it('should require tenant binding', () => {
      expect(m1WorkatoIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include workato.recipe scope', () => {
      expect(m1WorkatoIntegrationManifest.authRequirements.oauthScopes).toContain('workato.recipe');
    });
  });

  describe('isValidWorkatoTriggerKey', () => {
    it('should return true for valid trigger key', () => {
      expect(isValidWorkatoTriggerKey('user_created')).toBe(true);
    });

    it('should return false for invalid trigger key', () => {
      expect(isValidWorkatoTriggerKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidWorkatoActionKey', () => {
    it('should return true for valid action key', () => {
      expect(isValidWorkatoActionKey('create_user')).toBe(true);
    });

    it('should return false for invalid action key', () => {
      expect(isValidWorkatoActionKey('invalid_key')).toBe(false);
    });
  });

  describe('getWorkatoTriggerContract', () => {
    it('should return trigger contract for valid key', () => {
      const contract = getWorkatoTriggerContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getWorkatoActionContract', () => {
    it('should return action contract for valid key', () => {
      const contract = getWorkatoActionContract('create_user');
      expect(contract.key).toBe('create_user');
    });
  });

  describe('getAllWorkatoOperationContracts', () => {
    it('should return all operation contracts', () => {
      const contracts = getAllWorkatoOperationContracts();
      expect(contracts.length).toBe(15);
    });
  });

  describe('validateWorkatoInput', () => {
    it('should validate correct action input', () => {
      const result = validateWorkatoInput('create_user', {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action input', () => {
      const result = validateWorkatoInput('create_user', {
        email: 'not-an-email',
      });
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown operation key', () => {
      const result = validateWorkatoInput('unknown_operation', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildWorkatoErrorResponse', () => {
    it('should build error response correctly', () => {
      const response = buildWorkatoErrorResponse({
        code: WORKATO_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input',
        operationType: WorkatoOperationType.RECIPE_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      });
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('WORKATO_INVALID_INPUT');
      expect(response.metadata?.tenantId).toBe('660e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('buildWorkatoSuccessResponse', () => {
    it('should build success response correctly', () => {
      const response = buildWorkatoSuccessResponse({
        data: { id: '123' },
        operationType: WorkatoOperationType.RECIPE_ACTION,
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

describe('workato-contract schemas and invariants', () => {
  describe('workatoIntegrationMetadataSchema', () => {
    it('should validate correct metadata', () => {
      const result = workatoIntegrationMetadataSchema.safeParse(m1WorkatoIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });

  describe('workatoOperationOutputSchema', () => {
    it('should validate success response', () => {
      const result = workatoOperationOutputSchema.safeParse({
        success: true,
        data: { id: '123' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'recipe_action',
          operationKey: 'create_user',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate error response', () => {
      const result = workatoOperationOutputSchema.safeParse({
        success: false,
        error: { code: 'ERROR', message: 'Error occurred' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'recipe_action',
          operationKey: 'create_user',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('workatoTriggerPayloadSchema', () => {
    it('should validate trigger payload', () => {
      const result = workatoTriggerPayloadSchema.safeParse({
        eventType: 'auth.user.created',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        occurredAt: '2024-01-15T10:30:00Z',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        version: 1,
        data: { id: '123' },
        triggerKey: 'user_created',
        triggerLabel: 'User Created',
        triggerDescription: 'User created trigger',
        recipeId: '550e8400-e29b-41d4-a716-446655440001',
        recipeName: 'User Created Handler',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('should enforce tenant binding in all triggers', () => {
      Object.values(m1WorkatoTriggerContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });

    it('should enforce tenant binding in all actions', () => {
      Object.values(m1WorkatoActionContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });
  });

  describe('envelope parity with Zapier', () => {
    it('should have same success/data/error/metadata structure as Zapier', () => {
      const workatoResponse = buildWorkatoSuccessResponse({
        data: {},
        operationType: WorkatoOperationType.RECIPE_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      });
      expect(workatoResponse).toHaveProperty('success');
      expect(workatoResponse).toHaveProperty('data');
      expect(workatoResponse).toHaveProperty('metadata');
      expect(workatoResponse.success).toBe(true);
      expect(workatoResponse.error).toBeUndefined();
    });
  });
});
