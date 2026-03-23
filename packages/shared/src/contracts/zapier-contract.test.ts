import { describe, it, expect } from 'vitest';

import {
  ZapierOperationType,
  ZAPIER_INTEGRATION_VERSION,
  ZAPIER_COMPATIBILITY_NOTES,
  ZAPIER_TRIGGER_KEYS,
  ZAPIER_ACTION_KEYS,
  ZAPIER_SEARCH_KEYS,
  ZAPIER_OUTPUT_INVARIANTS,
  ZAPIER_ERROR_CODES,
  m1ZapierTriggerContractManifest,
  m1ZapierActionContractManifest,
  m1ZapierSearchContractManifest,
  m1ZapierIntegrationManifest,
  isValidZapierTriggerKey,
  isValidZapierActionKey,
  isValidZapierSearchKey,
  getTriggerContract,
  getActionContract,
  getSearchContract,
  getAllZapierOperationContracts,
  validateZapierInput,
  buildZapierErrorResponse,
  buildZapierSuccessResponse,
  zapierActionInputSchemas,
  zapierActionOutputSchemas,
  zapierSearchInputSchemas,
  zapierSearchOutputSchemas,
  zapierOperationTypeSchema,
  zapierIntegrationMetadataSchema,
  zapierOperationOutputSchema,
  zapierTriggerPayloadSchema,
} from '@the-dmz/shared/contracts/zapier-contract';

describe('zapier-contract', () => {
  describe('ZapierOperationType', () => {
    it('should have correct TRIGGER value', () => {
      expect(ZapierOperationType.TRIGGER).toBe('trigger');
    });

    it('should have correct ACTION value', () => {
      expect(ZapierOperationType.ACTION).toBe('action');
    });

    it('should have correct SEARCH value', () => {
      expect(ZapierOperationType.SEARCH).toBe('search');
    });
  });

  describe('ZAPIER_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(ZAPIER_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('ZAPIER_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(ZAPIER_COMPATIBILITY_NOTES).toContain('OAuth2');
    });
  });

  describe('ZAPIER_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(ZAPIER_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(ZAPIER_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(ZAPIER_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should enforce stable field naming', () => {
      expect(ZAPIER_OUTPUT_INVARIANTS.STABLE_FIELD_NAMING).toBe(true);
    });
  });

  describe('ZAPIER_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(ZAPIER_ERROR_CODES.INVALID_INPUT).toBe('ZAPIER_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(ZAPIER_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('ZAPIER_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(ZAPIER_ERROR_CODES.TENANT_MISMATCH).toBe('ZAPIER_TENANT_MISMATCH');
    });

    it('should have NOT_FOUND error code', () => {
      expect(ZAPIER_ERROR_CODES.NOT_FOUND).toBe('ZAPIER_NOT_FOUND');
    });

    it('should have IDEMPOTENCY_CONFLICT error code', () => {
      expect(ZAPIER_ERROR_CODES.IDEMPOTENCY_CONFLICT).toBe('ZAPIER_IDEMPOTENCY_CONFLICT');
    });

    it('should have RATE_LIMIT_EXCEEDED error code', () => {
      expect(ZAPIER_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('ZAPIER_RATE_LIMIT_EXCEEDED');
    });

    it('should have AUTH_FAILED error code', () => {
      expect(ZAPIER_ERROR_CODES.AUTH_FAILED).toBe('ZAPIER_AUTH_FAILED');
    });

    it('should have DEFERRED error code', () => {
      expect(ZAPIER_ERROR_CODES.DEFERRED).toBe('ZAPIER_DEFERRED');
    });
  });

  describe('ZAPIER_TRIGGER_KEYS', () => {
    it('should include user_created trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('user_created');
    });

    it('should include user_updated trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('user_updated');
    });

    it('should include user_deactivated trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('user_deactivated');
    });

    it('should include session_created trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('session_created');
    });

    it('should include session_revoked trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('session_revoked');
    });

    it('should include login_failed trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('login_failed');
    });

    it('should include mfa_enabled trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('mfa_enabled');
    });

    it('should include mfa_disabled trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('mfa_disabled');
    });

    it('should include tenant_created trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('tenant_created');
    });

    it('should include tenant_updated trigger', () => {
      expect(ZAPIER_TRIGGER_KEYS).toContain('tenant_updated');
    });
  });

  describe('ZAPIER_ACTION_KEYS', () => {
    it('should include create_user action', () => {
      expect(ZAPIER_ACTION_KEYS).toContain('create_user');
    });

    it('should include update_user action', () => {
      expect(ZAPIER_ACTION_KEYS).toContain('update_user');
    });

    it('should include assign_training action', () => {
      expect(ZAPIER_ACTION_KEYS).toContain('assign_training');
    });

    it('should include create_report action', () => {
      expect(ZAPIER_ACTION_KEYS).toContain('create_report');
    });

    it('should include send_notification action', () => {
      expect(ZAPIER_ACTION_KEYS).toContain('send_notification');
    });
  });

  describe('ZAPIER_SEARCH_KEYS', () => {
    it('should include find_user_by_email search', () => {
      expect(ZAPIER_SEARCH_KEYS).toContain('find_user_by_email');
    });

    it('should include find_training_by_name search', () => {
      expect(ZAPIER_SEARCH_KEYS).toContain('find_training_by_name');
    });

    it('should include find_department_by_code search', () => {
      expect(ZAPIER_SEARCH_KEYS).toContain('find_department_by_code');
    });
  });

  describe('m1ZapierTriggerContractManifest', () => {
    it('should have contract for user_created trigger', () => {
      const contract = m1ZapierTriggerContractManifest.user_created;
      expect(contract.key).toBe('user_created');
      expect(contract.operationType).toBe(ZapierOperationType.TRIGGER);
      expect(contract.idempotencySupported).toBe(false);
      expect(contract.tenantBindingRequired).toBe(true);
      expect(contract.requiredScopes).toContain('zapier.trigger');
    });

    it('should have sample payload for user_created trigger', () => {
      const contract = m1ZapierTriggerContractManifest.user_created;
      expect(contract.samplePayload).toBeDefined();
      const result = zapierTriggerPayloadSchema.safeParse(contract.samplePayload);
      expect(result.success).toBe(true);
    });

    it('should have contract for all required triggers', () => {
      ZAPIER_TRIGGER_KEYS.forEach((key) => {
        const contract = m1ZapierTriggerContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(ZAPIER_INTEGRATION_VERSION);
      });
    });

    it('should map user_created to auth.user.created webhook event', () => {
      const contract = m1ZapierTriggerContractManifest.user_created;
      expect(contract.webhookEventType).toBe('auth.user.created');
    });

    it('should map user_updated to auth.user.updated webhook event', () => {
      const contract = m1ZapierTriggerContractManifest.user_updated;
      expect(contract.webhookEventType).toBe('auth.user.updated');
    });
  });

  describe('m1ZapierActionContractManifest', () => {
    it('should have contract for create_user action', () => {
      const contract = m1ZapierActionContractManifest.create_user;
      expect(contract.key).toBe('create_user');
      expect(contract.operationType).toBe(ZapierOperationType.ACTION);
      expect(contract.idempotencySupported).toBe(true);
      expect(contract.tenantBindingRequired).toBe(true);
      expect(contract.requiredScopes).toContain('zapier.action');
    });

    it('should have idempotency key format for create_user', () => {
      const contract = m1ZapierActionContractManifest.create_user;
      expect(contract.idempotencyKeyFormat).toBe('user:{email}');
    });

    it('should have contract for all required actions', () => {
      ZAPIER_ACTION_KEYS.forEach((key) => {
        const contract = m1ZapierActionContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(ZAPIER_INTEGRATION_VERSION);
      });
    });

    it('should have valid input schema for create_user', () => {
      const schema = zapierActionInputSchemas.create_user;
      const validInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in create_user', () => {
      const schema = zapierActionInputSchemas.create_user;
      const invalidInput = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have valid output schema for create_user', () => {
      const schema = zapierActionOutputSchemas.create_user;
      const validOutput = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        role: 'user',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
      };
      const result = schema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should have idempotency key format for assign_training', () => {
      const contract = m1ZapierActionContractManifest.assign_training;
      expect(contract.idempotencyKeyFormat).toBe('assignment:{userId}:{trainingId}');
    });

    it('should have idempotency key format for send_notification', () => {
      const contract = m1ZapierActionContractManifest.send_notification;
      expect(contract.idempotencyKeyFormat).toBe('notification:{userId}:{timestamp}');
    });
  });

  describe('m1ZapierSearchContractManifest', () => {
    it('should have contract for find_user_by_email search', () => {
      const contract = m1ZapierSearchContractManifest.find_user_by_email;
      expect(contract.key).toBe('find_user_by_email');
      expect(contract.operationType).toBe(ZapierOperationType.SEARCH);
      expect(contract.matchingSemantics).toBe('exact');
      expect(contract.tenantBindingRequired).toBe(true);
      expect(contract.requiredScopes).toContain('zapier.search');
    });

    it('should have contract for all required searches', () => {
      ZAPIER_SEARCH_KEYS.forEach((key) => {
        const contract = m1ZapierSearchContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(ZAPIER_INTEGRATION_VERSION);
      });
    });

    it('should have exact matching for find_user_by_email', () => {
      const contract = m1ZapierSearchContractManifest.find_user_by_email;
      expect(contract.matchingSemantics).toBe('exact');
    });

    it('should have case_insensitive matching for find_training_by_name', () => {
      const contract = m1ZapierSearchContractManifest.find_training_by_name;
      expect(contract.matchingSemantics).toBe('case_insensitive');
    });

    it('should have exact matching for find_department_by_code', () => {
      const contract = m1ZapierSearchContractManifest.find_department_by_code;
      expect(contract.matchingSemantics).toBe('exact');
    });

    it('should support pagination for find_training_by_name', () => {
      const contract = m1ZapierSearchContractManifest.find_training_by_name;
      expect(contract.paginationSupported).toBe(true);
    });

    it('should not support pagination for find_user_by_email', () => {
      const contract = m1ZapierSearchContractManifest.find_user_by_email;
      expect(contract.paginationSupported).toBe(false);
    });

    it('should have valid input schema for find_user_by_email', () => {
      const schema = zapierSearchInputSchemas.find_user_by_email;
      const validInput = {
        email: 'test@example.com',
      };
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in find_user_by_email', () => {
      const schema = zapierSearchInputSchemas.find_user_by_email;
      const invalidInput = {
        email: 'invalid-email',
      };
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have valid output schema for find_user_by_email', () => {
      const schema = zapierSearchOutputSchemas.find_user_by_email;
      const validOutput = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        role: 'user',
        status: 'active',
      };
      const result = schema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('m1ZapierIntegrationManifest', () => {
    it('should have valid integration version', () => {
      expect(m1ZapierIntegrationManifest.integrationVersion).toBe(ZAPIER_INTEGRATION_VERSION);
    });

    it('should have compatibility notes', () => {
      expect(m1ZapierIntegrationManifest.compatibilityNotes).toBe(ZAPIER_COMPATIBILITY_NOTES);
    });

    it('should support all operation types', () => {
      expect(m1ZapierIntegrationManifest.supportedOperations).toContain(
        ZapierOperationType.TRIGGER,
      );
      expect(m1ZapierIntegrationManifest.supportedOperations).toContain(ZapierOperationType.ACTION);
      expect(m1ZapierIntegrationManifest.supportedOperations).toContain(ZapierOperationType.SEARCH);
    });

    it('should require tenant binding', () => {
      expect(m1ZapierIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include oauth scopes', () => {
      expect(m1ZapierIntegrationManifest.authRequirements.oauthScopes).toContain('zapier.read');
      expect(m1ZapierIntegrationManifest.authRequirements.oauthScopes).toContain('zapier.write');
      expect(m1ZapierIntegrationManifest.authRequirements.oauthScopes).toContain('zapier.trigger');
      expect(m1ZapierIntegrationManifest.authRequirements.oauthScopes).toContain('zapier.action');
      expect(m1ZapierIntegrationManifest.authRequirements.oauthScopes).toContain('zapier.search');
    });

    it('should include api key scopes', () => {
      expect(m1ZapierIntegrationManifest.authRequirements.apiKeyScopes).toContain('integrations');
    });

    it('should pass schema validation', () => {
      const result = zapierIntegrationMetadataSchema.safeParse(m1ZapierIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });

  describe('isValidZapierTriggerKey', () => {
    it('should return true for valid trigger key', () => {
      expect(isValidZapierTriggerKey('user_created')).toBe(true);
    });

    it('should return false for invalid trigger key', () => {
      expect(isValidZapierTriggerKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidZapierActionKey', () => {
    it('should return true for valid action key', () => {
      expect(isValidZapierActionKey('create_user')).toBe(true);
    });

    it('should return false for invalid action key', () => {
      expect(isValidZapierActionKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidZapierSearchKey', () => {
    it('should return true for valid search key', () => {
      expect(isValidZapierSearchKey('find_user_by_email')).toBe(true);
    });

    it('should return false for invalid search key', () => {
      expect(isValidZapierSearchKey('invalid_key')).toBe(false);
    });
  });

  describe('getTriggerContract', () => {
    it('should return contract for valid trigger key', () => {
      const contract = getTriggerContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getActionContract', () => {
    it('should return contract for valid action key', () => {
      const contract = getActionContract('create_user');
      expect(contract.key).toBe('create_user');
    });
  });

  describe('getSearchContract', () => {
    it('should return contract for valid search key', () => {
      const contract = getSearchContract('find_user_by_email');
      expect(contract.key).toBe('find_user_by_email');
    });
  });

  describe('getAllZapierOperationContracts', () => {
    it('should return all operation contracts', () => {
      const contracts = getAllZapierOperationContracts();
      expect(contracts.length).toBe(
        ZAPIER_TRIGGER_KEYS.length + ZAPIER_ACTION_KEYS.length + ZAPIER_SEARCH_KEYS.length,
      );
    });

    it('should include all trigger contracts', () => {
      const contracts = getAllZapierOperationContracts();
      const triggers = contracts.filter((c) => c.operationType === ZapierOperationType.TRIGGER);
      expect(triggers.length).toBe(ZAPIER_TRIGGER_KEYS.length);
    });

    it('should include all action contracts', () => {
      const contracts = getAllZapierOperationContracts();
      const actions = contracts.filter((c) => c.operationType === ZapierOperationType.ACTION);
      expect(actions.length).toBe(ZAPIER_ACTION_KEYS.length);
    });

    it('should include all search contracts', () => {
      const contracts = getAllZapierOperationContracts();
      const searches = contracts.filter((c) => c.operationType === ZapierOperationType.SEARCH);
      expect(searches.length).toBe(ZAPIER_SEARCH_KEYS.length);
    });
  });
});

describe('zapier-contract validation and responses', () => {
  describe('validateZapierInput', () => {
    it('should validate valid action input', () => {
      const validInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = validateZapierInput('create_user', validInput);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action input', () => {
      const invalidInput = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = validateZapierInput('create_user', invalidInput);
      expect(result.valid).toBe(false);
    });

    it('should validate valid search input', () => {
      const validInput = {
        email: 'test@example.com',
      };
      const result = validateZapierInput('find_user_by_email', validInput);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid search input', () => {
      const invalidInput = {
        email: 'invalid-email',
      };
      const result = validateZapierInput('find_user_by_email', invalidInput);
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown operation key', () => {
      const result = validateZapierInput('unknown_operation', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildZapierErrorResponse', () => {
    it('should build valid error response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildZapierErrorResponse({
        code: ZAPIER_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input provided',
        operationType: ZapierOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('ZAPIER_INVALID_INPUT');
      expect(response.error?.message).toBe('Invalid input provided');
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(ZapierOperationType.ACTION);
      expect(response.metadata?.operationKey).toBe('create_user');
    });
  });

  describe('buildZapierSuccessResponse', () => {
    it('should build valid success response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { id: '123', email: 'test@example.com' };
      const response = buildZapierSuccessResponse({
        data,
        operationType: ZapierOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
        idempotencyKey: 'user:test@example.com',
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(ZapierOperationType.ACTION);
      expect(response.metadata?.operationKey).toBe('create_user');
      expect(response.metadata?.idempotencyKey).toBe('user:test@example.com');
    });

    it('should work without idempotency key', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { id: '123' };
      const response = buildZapierSuccessResponse({
        data,
        operationType: ZapierOperationType.TRIGGER,
        operationKey: 'user_created',
        tenantId,
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.idempotencyKey).toBeUndefined();
    });
  });

  describe('zapierOperationOutputSchema', () => {
    it('should validate valid success output', () => {
      const output = {
        success: true,
        data: { id: '123' },
        metadata: {
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'action',
          operationKey: 'create_user',
        },
      };
      const result = zapierOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('should validate valid error output', () => {
      const output = {
        success: false,
        error: {
          code: 'ZAPIER_INVALID_INPUT',
          message: 'Invalid input',
        },
        metadata: {
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'action',
          operationKey: 'create_user',
        },
      };
      const result = zapierOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('zapierOperationTypeSchema', () => {
    it('should validate trigger', () => {
      const result = zapierOperationTypeSchema.safeParse('trigger');
      expect(result.success).toBe(true);
    });

    it('should validate action', () => {
      const result = zapierOperationTypeSchema.safeParse('action');
      expect(result.success).toBe(true);
    });

    it('should validate search', () => {
      const result = zapierOperationTypeSchema.safeParse('search');
      expect(result.success).toBe(true);
    });

    it('should reject invalid operation type', () => {
      const result = zapierOperationTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('Multi-step passthrough invariants', () => {
    it('should ensure output always includes id field', () => {
      const outputSchema = zapierActionOutputSchemas.create_user;
      const output = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        role: 'user',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
      };
      const result = outputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('should allow null for optional department field', () => {
      const outputSchema = zapierActionOutputSchemas.create_user;
      const output = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        role: 'user',
        status: 'active',
        createdAt: '2024-01-15T10:30:00Z',
      };
      const result = outputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('should have deterministic field naming across outputs', () => {
      const createUserSchema = zapierActionOutputSchemas.create_user;
      const updateUserSchema = zapierActionOutputSchemas.update_user;

      const createFields = Object.keys(createUserSchema.shape);
      const updateFields = Object.keys(updateUserSchema.shape);

      expect(createFields).toContain('id');
      expect(updateFields).toContain('id');
    });
  });

  describe('Tenant isolation', () => {
    it('should require tenant binding for all operations', () => {
      const triggerContracts = Object.values(m1ZapierTriggerContractManifest);
      triggerContracts.forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });

      const actionContracts = Object.values(m1ZapierActionContractManifest);
      actionContracts.forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });

      const searchContracts = Object.values(m1ZapierSearchContractManifest);
      searchContracts.forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });

    it('should include tenantId in error responses', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildZapierErrorResponse({
        code: ZAPIER_ERROR_CODES.TENANT_MISMATCH,
        message: 'Tenant mismatch',
        operationType: ZapierOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
      });

      expect(response.metadata?.tenantId).toBe(tenantId);
    });
  });

  describe('Webhook event parity', () => {
    it('should map user_created trigger to auth.user.created', () => {
      const contract = m1ZapierTriggerContractManifest.user_created;
      expect(contract.webhookEventType).toBe('auth.user.created');
    });

    it('should map user_updated trigger to auth.user.updated', () => {
      const contract = m1ZapierTriggerContractManifest.user_updated;
      expect(contract.webhookEventType).toBe('auth.user.updated');
    });

    it('should map session_created trigger to auth.session.created', () => {
      const contract = m1ZapierTriggerContractManifest.session_created;
      expect(contract.webhookEventType).toBe('auth.session.created');
    });

    it('should map tenant_created trigger to enterprise.tenant.created', () => {
      const contract = m1ZapierTriggerContractManifest.tenant_created;
      expect(contract.webhookEventType).toBe('enterprise.tenant.created');
    });

    it('should map tenant_updated trigger to enterprise.tenant.updated', () => {
      const contract = m1ZapierTriggerContractManifest.tenant_updated;
      expect(contract.webhookEventType).toBe('enterprise.tenant.updated');
    });
  });
});
