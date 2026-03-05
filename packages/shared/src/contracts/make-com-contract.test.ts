import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  MakeComOperationType,
  MAKE_COM_INTEGRATION_VERSION,
  MAKE_COM_COMPATIBILITY_NOTES,
  MAKE_COM_TRIGGER_KEYS,
  MAKE_COM_ACTION_KEYS,
  MAKE_COM_OUTPUT_INVARIANTS,
  MAKE_COM_ERROR_CODES,
  m1MakeComTriggerContractManifest,
  m1MakeComActionContractManifest,
  m1MakeComIntegrationManifest,
  isValidMakeComTriggerKey,
  isValidMakeComActionKey,
  getMakeComTriggerContract,
  getMakeComActionContract,
  getAllMakeComOperationContracts,
  validateMakeComInput,
  buildMakeComErrorResponse,
  buildMakeComSuccessResponse,
  makeComActionInputSchemas,
  makeComActionOutputSchemas,
  makeComOperationTypeSchema,
  makeComIntegrationMetadataSchema,
  makeComOperationOutputSchema,
  makeComTriggerPayloadSchema,
} from '@the-dmz/shared/contracts/make-com-contract';

describe('make-com-contract', () => {
  describe('MakeComOperationType', () => {
    it('should have correct TEMPLATE_TRIGGER value', () => {
      expect(MakeComOperationType.TEMPLATE_TRIGGER).toBe('template_trigger');
    });

    it('should have correct TEMPLATE_ACTION value', () => {
      expect(MakeComOperationType.TEMPLATE_ACTION).toBe('template_action');
    });
  });

  describe('MAKE_COM_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(MAKE_COM_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('MAKE_COM_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(MAKE_COM_COMPATIBILITY_NOTES).toContain('OAuth2');
    });
  });

  describe('MAKE_COM_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(MAKE_COM_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(MAKE_COM_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(MAKE_COM_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should enforce stable field naming', () => {
      expect(MAKE_COM_OUTPUT_INVARIANTS.STABLE_FIELD_NAMING).toBe(true);
    });

    it('should require scenario metadata', () => {
      expect(MAKE_COM_OUTPUT_INVARIANTS.SCENARIO_METADATA_REQUIRED).toBe(true);
    });

    it('should require module configuration', () => {
      expect(MAKE_COM_OUTPUT_INVARIANTS.MODULE_CONFIGURATION_REQUIRED).toBe(true);
    });
  });

  describe('MAKE_COM_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(MAKE_COM_ERROR_CODES.INVALID_INPUT).toBe('MAKE_COM_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(MAKE_COM_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('MAKE_COM_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(MAKE_COM_ERROR_CODES.TENANT_MISMATCH).toBe('MAKE_COM_TENANT_MISMATCH');
    });

    it('should have SCENARIO_NOT_FOUND error code', () => {
      expect(MAKE_COM_ERROR_CODES.SCENARIO_NOT_FOUND).toBe('MAKE_COM_SCENARIO_NOT_FOUND');
    });

    it('should have MODULE_NOT_FOUND error code', () => {
      expect(MAKE_COM_ERROR_CODES.MODULE_NOT_FOUND).toBe('MAKE_COM_MODULE_NOT_FOUND');
    });
  });

  describe('MAKE_COM_TRIGGER_KEYS', () => {
    it('should include user_created trigger', () => {
      expect(MAKE_COM_TRIGGER_KEYS).toContain('user_created');
    });

    it('should include user_updated trigger', () => {
      expect(MAKE_COM_TRIGGER_KEYS).toContain('user_updated');
    });

    it('should have 10 trigger keys', () => {
      expect(MAKE_COM_TRIGGER_KEYS.length).toBe(10);
    });
  });

  describe('MAKE_COM_ACTION_KEYS', () => {
    it('should include create_user action', () => {
      expect(MAKE_COM_ACTION_KEYS).toContain('create_user');
    });

    it('should include update_user action', () => {
      expect(MAKE_COM_ACTION_KEYS).toContain('update_user');
    });

    it('should have 5 action keys', () => {
      expect(MAKE_COM_ACTION_KEYS.length).toBe(5);
    });
  });

  describe('m1MakeComTriggerContractManifest', () => {
    it('should have user_created contract', () => {
      expect(m1MakeComTriggerContractManifest.user_created).toBeDefined();
    });

    it('should have correct operation type for user_created', () => {
      expect(m1MakeComTriggerContractManifest.user_created.operationType).toBe(
        MakeComOperationType.TEMPLATE_TRIGGER,
      );
    });

    it('should have sample payload for user_created', () => {
      expect(m1MakeComTriggerContractManifest.user_created.samplePayload).toBeDefined();
    });

    it('should require tenant binding', () => {
      expect(m1MakeComTriggerContractManifest.user_created.tenantBindingRequired).toBe(true);
    });

    it('should have scenarioId', () => {
      expect(m1MakeComTriggerContractManifest.user_created.scenarioId).toBeDefined();
    });

    it('should have moduleId', () => {
      expect(m1MakeComTriggerContractManifest.user_created.moduleId).toBeDefined();
    });

    it('should have moduleType', () => {
      expect(m1MakeComTriggerContractManifest.user_created.moduleType).toBeDefined();
    });
  });

  describe('m1MakeComActionContractManifest', () => {
    it('should have create_user contract', () => {
      expect(m1MakeComActionContractManifest.create_user).toBeDefined();
    });

    it('should have correct operation type for create_user', () => {
      expect(m1MakeComActionContractManifest.create_user.operationType).toBe(
        MakeComOperationType.TEMPLATE_ACTION,
      );
    });

    it('should support idempotency for create_user', () => {
      expect(m1MakeComActionContractManifest.create_user.idempotencySupported).toBe(true);
    });

    it('should have idempotency key format', () => {
      expect(m1MakeComActionContractManifest.create_user.idempotencyKeyFormat).toBeDefined();
    });
  });

  describe('m1MakeComIntegrationManifest', () => {
    it('should have correct integration version', () => {
      expect(m1MakeComIntegrationManifest.integrationVersion).toBe(MAKE_COM_INTEGRATION_VERSION);
    });

    it('should require tenant binding', () => {
      expect(m1MakeComIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include makecom.template scope', () => {
      expect(m1MakeComIntegrationManifest.authRequirements.oauthScopes).toContain(
        'makecom.template',
      );
    });
  });

  describe('isValidMakeComTriggerKey', () => {
    it('should return true for valid trigger key', () => {
      expect(isValidMakeComTriggerKey('user_created')).toBe(true);
    });

    it('should return false for invalid trigger key', () => {
      expect(isValidMakeComTriggerKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidMakeComActionKey', () => {
    it('should return true for valid action key', () => {
      expect(isValidMakeComActionKey('create_user')).toBe(true);
    });

    it('should return false for invalid action key', () => {
      expect(isValidMakeComActionKey('invalid_key')).toBe(false);
    });
  });

  describe('getMakeComTriggerContract', () => {
    it('should return trigger contract for valid key', () => {
      const contract = getMakeComTriggerContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getMakeComActionContract', () => {
    it('should return action contract for valid key', () => {
      const contract = getMakeComActionContract('create_user');
      expect(contract.key).toBe('create_user');
    });
  });

  describe('getAllMakeComOperationContracts', () => {
    it('should return all operation contracts', () => {
      const contracts = getAllMakeComOperationContracts();
      expect(contracts.length).toBe(15);
    });
  });

  describe('validateMakeComInput', () => {
    it('should validate correct action input', () => {
      const result = validateMakeComInput('create_user', {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action input', () => {
      const result = validateMakeComInput('create_user', {
        email: 'not-an-email',
      });
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown operation key', () => {
      const result = validateMakeComInput('unknown_operation', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildMakeComErrorResponse', () => {
    it('should build error response correctly', () => {
      const response = buildMakeComErrorResponse(
        MAKE_COM_ERROR_CODES.INVALID_INPUT,
        'Invalid input',
        MakeComOperationType.TEMPLATE_ACTION,
        'create_user',
        '660e8400-e29b-41d4-a716-446655440001',
      );
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('MAKE_COM_INVALID_INPUT');
      expect(response.metadata?.tenantId).toBe('660e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('buildMakeComSuccessResponse', () => {
    it('should build success response correctly', () => {
      const response = buildMakeComSuccessResponse(
        { id: '123' },
        MakeComOperationType.TEMPLATE_ACTION,
        'create_user',
        '660e8400-e29b-41d4-a716-446655440001',
        'test-key',
      );
      expect(response.success).toBe(true);
      expect(response.data?.id).toBe('123');
      expect(response.metadata?.idempotencyKey).toBe('test-key');
    });
  });

  describe('makeComIntegrationMetadataSchema', () => {
    it('should validate correct metadata', () => {
      const result = makeComIntegrationMetadataSchema.safeParse(m1MakeComIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });

  describe('makeComOperationOutputSchema', () => {
    it('should validate success response', () => {
      const result = makeComOperationOutputSchema.safeParse({
        success: true,
        data: { id: '123' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'template_action',
          operationKey: 'create_user',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate error response', () => {
      const result = makeComOperationOutputSchema.safeParse({
        success: false,
        error: { code: 'ERROR', message: 'Error occurred' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'template_action',
          operationKey: 'create_user',
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('makeComTriggerPayloadSchema', () => {
    it('should validate trigger payload', () => {
      const result = makeComTriggerPayloadSchema.safeParse({
        eventType: 'auth.user.created',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        occurredAt: '2024-01-15T10:30:00Z',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        version: 1,
        data: { id: '123' },
        triggerKey: 'user_created',
        triggerLabel: 'User Created',
        triggerDescription: 'User created trigger',
        scenarioId: '550e8400-e29b-41d4-a716-446655440001',
        scenarioName: 'User Created Scenario',
        moduleId: '550e8400-e29b-41d4-a716-446655440101',
        moduleType: 'HTTP',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('should enforce tenant binding in all triggers', () => {
      Object.values(m1MakeComTriggerContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });

    it('should enforce tenant binding in all actions', () => {
      Object.values(m1MakeComActionContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });
  });

  describe('envelope parity with Zapier', () => {
    it('should have same success/data/error/metadata structure as Zapier', () => {
      const makeComResponse = buildMakeComSuccessResponse(
        {},
        MakeComOperationType.TEMPLATE_ACTION,
        'create_user',
        '660e8400-e29b-41d4-a716-446655440001',
      );
      expect(makeComResponse).toHaveProperty('success');
      expect(makeComResponse).toHaveProperty('data');
      expect(makeComResponse).toHaveProperty('metadata');
      expect(makeComResponse.success).toBe(true);
      expect(makeComResponse.error).toBeUndefined();
    });
  });
});
