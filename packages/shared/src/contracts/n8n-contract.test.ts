import { describe, it, expect } from 'vitest';

import {
  N8nOperationType,
  N8N_INTEGRATION_VERSION,
  N8N_COMPATIBILITY_NOTES,
  N8N_TRIGGER_KEYS,
  N8N_ACTION_KEYS,
  N8N_OUTPUT_INVARIANTS,
  N8N_ERROR_CODES,
  m1N8nTriggerContractManifest,
  m1N8nActionContractManifest,
  m1N8nIntegrationManifest,
  isValidN8nTriggerKey,
  isValidN8nActionKey,
  getN8nTriggerContract,
  getN8nActionContract,
  getAllN8nOperationContracts,
  validateN8nInput,
  buildN8nErrorResponse,
  buildN8nSuccessResponse,
  n8nIntegrationMetadataSchema,
  n8nOperationOutputSchema,
  n8nTriggerPayloadSchema,
} from '@the-dmz/shared/contracts/n8n-contract';

describe('n8n-contract', () => {
  describe('N8nOperationType', () => {
    it('should have correct TEMPLATE_TRIGGER value', () => {
      expect(N8nOperationType.TEMPLATE_TRIGGER).toBe('template_trigger');
    });

    it('should have correct TEMPLATE_ACTION value', () => {
      expect(N8nOperationType.TEMPLATE_ACTION).toBe('template_action');
    });
  });

  describe('N8N_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(N8N_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('N8N_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(N8N_COMPATIBILITY_NOTES).toContain('OAuth2');
    });
  });

  describe('N8N_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(N8N_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(N8N_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(N8N_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should enforce stable field naming', () => {
      expect(N8N_OUTPUT_INVARIANTS.STABLE_FIELD_NAMING).toBe(true);
    });

    it('should require template metadata', () => {
      expect(N8N_OUTPUT_INVARIANTS.TEMPLATE_METADATA_REQUIRED).toBe(true);
    });

    it('should require node configuration', () => {
      expect(N8N_OUTPUT_INVARIANTS.NODE_CONFIGURATION_REQUIRED).toBe(true);
    });
  });

  describe('N8N_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(N8N_ERROR_CODES.INVALID_INPUT).toBe('N8N_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(N8N_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('N8N_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(N8N_ERROR_CODES.TENANT_MISMATCH).toBe('N8N_TENANT_MISMATCH');
    });

    it('should have TEMPLATE_NOT_FOUND error code', () => {
      expect(N8N_ERROR_CODES.TEMPLATE_NOT_FOUND).toBe('N8N_TEMPLATE_NOT_FOUND');
    });

    it('should have NODE_NOT_FOUND error code', () => {
      expect(N8N_ERROR_CODES.NODE_NOT_FOUND).toBe('N8N_NODE_NOT_FOUND');
    });
  });

  describe('N8N_TRIGGER_KEYS', () => {
    it('should include user_created trigger', () => {
      expect(N8N_TRIGGER_KEYS).toContain('user_created');
    });

    it('should include user_updated trigger', () => {
      expect(N8N_TRIGGER_KEYS).toContain('user_updated');
    });

    it('should have 10 trigger keys', () => {
      expect(N8N_TRIGGER_KEYS.length).toBe(10);
    });
  });

  describe('N8N_ACTION_KEYS', () => {
    it('should include create_user action', () => {
      expect(N8N_ACTION_KEYS).toContain('create_user');
    });

    it('should include update_user action', () => {
      expect(N8N_ACTION_KEYS).toContain('update_user');
    });

    it('should have 5 action keys', () => {
      expect(N8N_ACTION_KEYS.length).toBe(5);
    });
  });

  describe('m1N8nTriggerContractManifest', () => {
    it('should have user_created contract', () => {
      expect(m1N8nTriggerContractManifest.user_created).toBeDefined();
    });

    it('should have correct operation type for user_created', () => {
      expect(m1N8nTriggerContractManifest.user_created.operationType).toBe(
        N8nOperationType.TEMPLATE_TRIGGER,
      );
    });

    it('should have sample payload for user_created', () => {
      expect(m1N8nTriggerContractManifest.user_created.samplePayload).toBeDefined();
    });

    it('should require tenant binding', () => {
      expect(m1N8nTriggerContractManifest.user_created.tenantBindingRequired).toBe(true);
    });

    it('should have templateId', () => {
      expect(m1N8nTriggerContractManifest.user_created.templateId).toBeDefined();
    });

    it('should have nodeId', () => {
      expect(m1N8nTriggerContractManifest.user_created.nodeId).toBeDefined();
    });

    it('should have nodeType', () => {
      expect(m1N8nTriggerContractManifest.user_created.nodeType).toBeDefined();
    });
  });

  describe('m1N8nActionContractManifest', () => {
    it('should have create_user contract', () => {
      expect(m1N8nActionContractManifest.create_user).toBeDefined();
    });

    it('should have correct operation type for create_user', () => {
      expect(m1N8nActionContractManifest.create_user.operationType).toBe(
        N8nOperationType.TEMPLATE_ACTION,
      );
    });

    it('should support idempotency for create_user', () => {
      expect(m1N8nActionContractManifest.create_user.idempotencySupported).toBe(true);
    });

    it('should have idempotency key format', () => {
      expect(m1N8nActionContractManifest.create_user.idempotencyKeyFormat).toBeDefined();
    });
  });

  describe('m1N8nIntegrationManifest', () => {
    it('should have correct integration version', () => {
      expect(m1N8nIntegrationManifest.integrationVersion).toBe(N8N_INTEGRATION_VERSION);
    });

    it('should require tenant binding', () => {
      expect(m1N8nIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include n8n.template scope', () => {
      expect(m1N8nIntegrationManifest.authRequirements.oauthScopes).toContain('n8n.template');
    });
  });

  describe('isValidN8nTriggerKey', () => {
    it('should return true for valid trigger key', () => {
      expect(isValidN8nTriggerKey('user_created')).toBe(true);
    });

    it('should return false for invalid trigger key', () => {
      expect(isValidN8nTriggerKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidN8nActionKey', () => {
    it('should return true for valid action key', () => {
      expect(isValidN8nActionKey('create_user')).toBe(true);
    });

    it('should return false for invalid action key', () => {
      expect(isValidN8nActionKey('invalid_key')).toBe(false);
    });
  });

  describe('getN8nTriggerContract', () => {
    it('should return trigger contract for valid key', () => {
      const contract = getN8nTriggerContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getN8nActionContract', () => {
    it('should return action contract for valid key', () => {
      const contract = getN8nActionContract('create_user');
      expect(contract.key).toBe('create_user');
    });
  });

  describe('getAllN8nOperationContracts', () => {
    it('should return all operation contracts', () => {
      const contracts = getAllN8nOperationContracts();
      expect(contracts.length).toBe(15);
    });
  });

  describe('validateN8nInput', () => {
    it('should validate correct action input', () => {
      const result = validateN8nInput('create_user', {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action input', () => {
      const result = validateN8nInput('create_user', {
        email: 'not-an-email',
      });
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown operation key', () => {
      const result = validateN8nInput('unknown_operation', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildN8nErrorResponse', () => {
    it('should build error response correctly', () => {
      const response = buildN8nErrorResponse({
        code: N8N_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input',
        operationType: N8nOperationType.TEMPLATE_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      });
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('N8N_INVALID_INPUT');
      expect(response.metadata?.tenantId).toBe('660e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('buildN8nSuccessResponse', () => {
    it('should build success response correctly', () => {
      const response = buildN8nSuccessResponse({
        data: { id: '123' },
        operationType: N8nOperationType.TEMPLATE_ACTION,
        operationKey: 'create_user',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        idempotencyKey: 'test-key',
      });
      expect(response.success).toBe(true);
      expect(response.data?.id).toBe('123');
      expect(response.metadata?.idempotencyKey).toBe('test-key');
    });
  });

  describe('schema validation', () => {
    describe('n8nIntegrationMetadataSchema', () => {
      it('should validate correct metadata', () => {
        const result = n8nIntegrationMetadataSchema.safeParse(m1N8nIntegrationManifest);
        expect(result.success).toBe(true);
      });
    });

    describe('n8nOperationOutputSchema', () => {
      it('should validate success response', () => {
        const result = n8nOperationOutputSchema.safeParse({
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
        const result = n8nOperationOutputSchema.safeParse({
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

    describe('n8nTriggerPayloadSchema', () => {
      it('should validate trigger payload', () => {
        const result = n8nTriggerPayloadSchema.safeParse({
          eventType: 'auth.user.created',
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          occurredAt: '2024-01-15T10:30:00Z',
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          version: 1,
          data: { id: '123' },
          triggerKey: 'user_created',
          triggerLabel: 'User Created',
          triggerDescription: 'User created trigger',
          templateId: '550e8400-e29b-41d4-a716-446655440001',
          templateName: 'User Created Workflow',
          nodeId: '550e8400-e29b-41d4-a716-446655440101',
          nodeType: 'n8n-nodes-base.webhook',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('cross-cutting concerns', () => {
    describe('tenant isolation', () => {
      it('should enforce tenant binding in all triggers', () => {
        Object.values(m1N8nTriggerContractManifest).forEach((contract) => {
          expect(contract.tenantBindingRequired).toBe(true);
        });
      });

      it('should enforce tenant binding in all actions', () => {
        Object.values(m1N8nActionContractManifest).forEach((contract) => {
          expect(contract.tenantBindingRequired).toBe(true);
        });
      });
    });

    describe('envelope parity with Zapier', () => {
      it('should have same success/data/error/metadata structure as Zapier', () => {
        const n8nResponse = buildN8nSuccessResponse({
          data: {},
          operationType: N8nOperationType.TEMPLATE_ACTION,
          operationKey: 'create_user',
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
        });
        expect(n8nResponse).toHaveProperty('success');
        expect(n8nResponse).toHaveProperty('data');
        expect(n8nResponse).toHaveProperty('metadata');
        expect(n8nResponse.success).toBe(true);
        expect(n8nResponse.error).toBeUndefined();
      });
    });
  });
});
