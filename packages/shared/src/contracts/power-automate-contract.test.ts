import { describe, it, expect } from 'vitest';

import {
  PowerAutomateOperationType,
  PowerAutomateTriggerType,
  PowerAutomateExecutionMode,
  M365ServiceType,
  POWER_AUTOMATE_INTEGRATION_VERSION,
  POWER_AUTOMATE_COMPATIBILITY_NOTES,
  POWER_AUTOMATE_TRIGGER_KEYS,
  POWER_AUTOMATE_ACTION_KEYS,
  POWER_AUTOMATE_OUTPUT_INVARIANTS,
  POWER_AUTOMATE_ERROR_CODES,
  POWER_AUTOMATE_RATE_LIMITS,
  POWER_AUTOMATE_RETRY_DELAYS_MS,
  POWER_AUTOMATE_DEFAULT_MAX_ATTEMPTS,
  m1PowerAutomateTriggerContractManifest,
  m1PowerAutomateActionContractManifest,
  m1PowerAutomateIntegrationManifest,
  isValidPowerAutomateTriggerKey,
  isValidPowerAutomateActionKey,
  getPowerAutomateTriggerContract,
  getPowerAutomateActionContract,
  getAllPowerAutomateOperationContracts,
  validatePowerAutomateInput,
  buildPowerAutomateErrorResponse,
  buildPowerAutomateSuccessResponse,
  getPowerAutomateRetryDelayMs,
  isPowerAutomateRetryableError,
  isPowerAutomateTerminalError,
  powerAutomateActionInputSchemas,
  powerAutomateActionOutputSchemas,
  powerAutomateOperationTypeSchema,
  powerAutomateIntegrationMetadataSchema,
  powerAutomateOperationOutputSchema,
  powerAutomateTriggerPayloadSchema,
  powerAutomateExecutionModeSchema,
} from '@the-dmz/shared/contracts/power-automate-contract';

describe('power-automate-contract constants', () => {
  describe('PowerAutomateOperationType', () => {
    it('should have correct TRIGGER value', () => {
      expect(PowerAutomateOperationType.TRIGGER).toBe('trigger');
    });

    it('should have correct ACTION value', () => {
      expect(PowerAutomateOperationType.ACTION).toBe('action');
    });
  });

  describe('PowerAutomateTriggerType', () => {
    it('should have correct POLLING value', () => {
      expect(PowerAutomateTriggerType.POLLING).toBe('polling');
    });

    it('should have correct PUSH value', () => {
      expect(PowerAutomateTriggerType.PUSH).toBe('push');
    });
  });

  describe('PowerAutomateExecutionMode', () => {
    it('should have correct CLOUD value', () => {
      expect(PowerAutomateExecutionMode.CLOUD).toBe('cloud');
    });

    it('should have correct DESKTOP_FLOW value', () => {
      expect(PowerAutomateExecutionMode.DESKTOP_FLOW).toBe('desktop-flow');
    });

    it('should have correct HYBRID value', () => {
      expect(PowerAutomateExecutionMode.HYBRID).toBe('hybrid');
    });
  });

  describe('POWER_AUTOMATE_INTEGRATION_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(POWER_AUTOMATE_INTEGRATION_VERSION).toBe('1.0.0');
    });
  });

  describe('POWER_AUTOMATE_COMPATIBILITY_NOTES', () => {
    it('should mention OAuth2 requirements', () => {
      expect(POWER_AUTOMATE_COMPATIBILITY_NOTES).toContain('OAuth2');
    });

    it('should mention M365', () => {
      expect(POWER_AUTOMATE_COMPATIBILITY_NOTES).toContain('M365');
    });

    it('should mention desktop flow', () => {
      expect(POWER_AUTOMATE_COMPATIBILITY_NOTES).toContain('desktop flow');
    });
  });

  describe('POWER_AUTOMATE_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(POWER_AUTOMATE_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(POWER_AUTOMATE_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(POWER_AUTOMATE_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should support dynamic content tokens', () => {
      expect(POWER_AUTOMATE_OUTPUT_INVARIANTS.DYNAMIC_CONTENT_TOKEN_SUPPORT).toBe(true);
    });

    it('should support M365 field mapping', () => {
      expect(POWER_AUTOMATE_OUTPUT_INVARIANTS.M365_FIELD_MAPPING_SUPPORT).toBe(true);
    });
  });

  describe('POWER_AUTOMATE_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.INVALID_INPUT).toBe('PA_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('PA_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.TENANT_MISMATCH).toBe('PA_TENANT_MISMATCH');
    });

    it('should have NOT_FOUND error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.NOT_FOUND).toBe('PA_NOT_FOUND');
    });

    it('should have IDEMPOTENCY_CONFLICT error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.IDEMPOTENCY_CONFLICT).toBe('PA_IDEMPOTENCY_CONFLICT');
    });

    it('should have RATE_LIMIT_EXCEEDED error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('PA_RATE_LIMIT_EXCEEDED');
    });

    it('should have AUTH_FAILED error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.AUTH_FAILED).toBe('PA_AUTH_FAILED');
    });

    it('should have M365_CONNECTION_FAILED error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.M365_CONNECTION_FAILED).toBe('PA_M365_CONNECTION_FAILED');
    });

    it('should have GATEWAY_UNREACHABLE error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.GATEWAY_UNREACHABLE).toBe('PA_GATEWAY_UNREACHABLE');
    });

    it('should have DESKTOP_FLOW_FAILED error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.DESKTOP_FLOW_FAILED).toBe('PA_DESKTOP_FLOW_FAILED');
    });

    it('should have DEFERRED error code', () => {
      expect(POWER_AUTOMATE_ERROR_CODES.DEFERRED).toBe('PA_DEFERRED');
    });
  });

  describe('POWER_AUTOMATE_RATE_LIMITS', () => {
    it('should have actions per minute limit', () => {
      expect(POWER_AUTOMATE_RATE_LIMITS.ACTIONS_PER_MINUTE).toBe(100);
    });

    it('should have actions per hour limit', () => {
      expect(POWER_AUTOMATE_RATE_LIMITS.ACTIONS_PER_HOUR).toBe(1000);
    });

    it('should have triggers per minute limit', () => {
      expect(POWER_AUTOMATE_RATE_LIMITS.TRIGGERS_PER_MINUTE).toBe(60);
    });
  });

  describe('M365ServiceType', () => {
    it('should have correct SHAREPOINT value', () => {
      expect(M365ServiceType.SHAREPOINT).toBe('sharepoint');
    });

    it('should have correct OUTLOOK value', () => {
      expect(M365ServiceType.OUTLOOK).toBe('outlook');
    });

    it('should have correct TEAMS value', () => {
      expect(M365ServiceType.TEAMS).toBe('teams');
    });

    it('should have correct EXCEL value', () => {
      expect(M365ServiceType.EXCEL).toBe('excel');
    });
  });
});

describe('power-automate-contract keys', () => {
  describe('POWER_AUTOMATE_TRIGGER_KEYS', () => {
    it('should include user_created trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('user_created');
    });

    it('should include user_updated trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('user_updated');
    });

    it('should include user_deactivated trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('user_deactivated');
    });

    it('should include session_created trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('session_created');
    });

    it('should include session_revoked trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('session_revoked');
    });

    it('should include login_failed trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('login_failed');
    });

    it('should include mfa_enabled trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('mfa_enabled');
    });

    it('should include mfa_disabled trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('mfa_disabled');
    });

    it('should include tenant_created trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('tenant_created');
    });

    it('should include tenant_updated trigger', () => {
      expect(POWER_AUTOMATE_TRIGGER_KEYS).toContain('tenant_updated');
    });
  });

  describe('POWER_AUTOMATE_ACTION_KEYS', () => {
    it('should include create_user action', () => {
      expect(POWER_AUTOMATE_ACTION_KEYS).toContain('create_user');
    });

    it('should include update_user action', () => {
      expect(POWER_AUTOMATE_ACTION_KEYS).toContain('update_user');
    });

    it('should include assign_training action', () => {
      expect(POWER_AUTOMATE_ACTION_KEYS).toContain('assign_training');
    });

    it('should include create_report action', () => {
      expect(POWER_AUTOMATE_ACTION_KEYS).toContain('create_report');
    });

    it('should include send_notification action', () => {
      expect(POWER_AUTOMATE_ACTION_KEYS).toContain('send_notification');
    });
  });
});

describe('power-automate-contract manifests', () => {
  describe('m1PowerAutomateTriggerContractManifest', () => {
    it('should have contract for user_created trigger', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.key).toBe('user_created');
      expect(contract.operationType).toBe(PowerAutomateOperationType.TRIGGER);
      expect(contract.triggerType).toBe(PowerAutomateTriggerType.PUSH);
      expect(contract.idempotencySupported).toBe(false);
      expect(contract.tenantBindingRequired).toBe(true);
      expect(contract.requiredScopes).toContain('powerautomate.trigger');
    });

    it('should have sample payload for user_created trigger', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.samplePayload).toBeDefined();
      const result = powerAutomateTriggerPayloadSchema.safeParse(contract.samplePayload);
      expect(result.success).toBe(true);
    });

    it('should have M365 field mappings for user_created', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.m365FieldMappings).toBeDefined();
      expect(contract.m365FieldMappings?.length).toBeGreaterThan(0);
    });

    it('should have dynamic content tokens for user_created', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.dynamicContentTokens).toBeDefined();
      expect(contract.dynamicContentTokens?.length).toBeGreaterThan(0);
    });

    it('should have contract for all required triggers', () => {
      POWER_AUTOMATE_TRIGGER_KEYS.forEach((key) => {
        const contract = m1PowerAutomateTriggerContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(POWER_AUTOMATE_INTEGRATION_VERSION);
      });
    });

    it('should map user_created to auth.user.created webhook event', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.webhookEventType).toBe('auth.user.created');
    });

    it('should map user_updated to auth.user.updated webhook event', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_updated;
      expect(contract.webhookEventType).toBe('auth.user.updated');
    });
  });

  describe('m1PowerAutomateActionContractManifest', () => {
    it('should have contract for create_user action', () => {
      const contract = m1PowerAutomateActionContractManifest.create_user;
      expect(contract.key).toBe('create_user');
      expect(contract.operationType).toBe(PowerAutomateOperationType.ACTION);
      expect(contract.idempotencySupported).toBe(true);
      expect(contract.tenantBindingRequired).toBe(true);
      expect(contract.requiredScopes).toContain('powerautomate.action');
    });

    it('should have idempotency key format for create_user', () => {
      const contract = m1PowerAutomateActionContractManifest.create_user;
      expect(contract.idempotencyKeyFormat).toBe('user:{email}');
    });

    it('should have M365 field mappings for create_user', () => {
      const contract = m1PowerAutomateActionContractManifest.create_user;
      expect(contract.m365FieldMappings).toBeDefined();
      expect(contract.m365FieldMappings?.length).toBeGreaterThan(0);
    });

    it('should have contract for all required actions', () => {
      POWER_AUTOMATE_ACTION_KEYS.forEach((key) => {
        const contract = m1PowerAutomateActionContractManifest[key];
        expect(contract).toBeDefined();
        expect(contract.key).toBe(key);
        expect(contract.version).toBe(POWER_AUTOMATE_INTEGRATION_VERSION);
      });
    });

    it('should have valid input schema for create_user', () => {
      const schema = powerAutomateActionInputSchemas.create_user;
      const validInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = schema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in create_user', () => {
      const schema = powerAutomateActionInputSchemas.create_user;
      const invalidInput = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = schema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have valid output schema for create_user', () => {
      const schema = powerAutomateActionOutputSchemas.create_user;
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
      const contract = m1PowerAutomateActionContractManifest.assign_training;
      expect(contract.idempotencyKeyFormat).toBe('assignment:{userId}:{trainingId}');
    });

    it('should have idempotency key format for send_notification', () => {
      const contract = m1PowerAutomateActionContractManifest.send_notification;
      expect(contract.idempotencyKeyFormat).toBe('notification:{userId}:{timestamp}');
    });

    it('should support desktop flow for update_user', () => {
      const contract = m1PowerAutomateActionContractManifest.update_user;
      expect(contract.supportsDesktopFlow).toBe(true);
    });

    it('should support desktop flow for assign_training', () => {
      const contract = m1PowerAutomateActionContractManifest.assign_training;
      expect(contract.supportsDesktopFlow).toBe(true);
    });

    it('should support desktop flow for create_report', () => {
      const contract = m1PowerAutomateActionContractManifest.create_report;
      expect(contract.supportsDesktopFlow).toBe(true);
    });

    it('should have M365 field mappings for send_notification', () => {
      const contract = m1PowerAutomateActionContractManifest.send_notification;
      expect(contract.m365FieldMappings).toBeDefined();
      const teamsMapping = contract.m365FieldMappings?.find(
        (m) => m.service === M365ServiceType.TEAMS,
      );
      expect(teamsMapping).toBeDefined();
    });
  });

  describe('m1PowerAutomateIntegrationManifest', () => {
    it('should have valid integration version', () => {
      expect(m1PowerAutomateIntegrationManifest.integrationVersion).toBe(
        POWER_AUTOMATE_INTEGRATION_VERSION,
      );
    });

    it('should have compatibility notes', () => {
      expect(m1PowerAutomateIntegrationManifest.compatibilityNotes).toBe(
        POWER_AUTOMATE_COMPATIBILITY_NOTES,
      );
    });

    it('should support all operation types', () => {
      expect(m1PowerAutomateIntegrationManifest.supportedOperations).toContain(
        PowerAutomateOperationType.TRIGGER,
      );
      expect(m1PowerAutomateIntegrationManifest.supportedOperations).toContain(
        PowerAutomateOperationType.ACTION,
      );
    });

    it('should support both trigger types', () => {
      expect(m1PowerAutomateIntegrationManifest.supportedTriggerTypes).toContain(
        PowerAutomateTriggerType.POLLING,
      );
      expect(m1PowerAutomateIntegrationManifest.supportedTriggerTypes).toContain(
        PowerAutomateTriggerType.PUSH,
      );
    });

    it('should support all execution modes', () => {
      expect(m1PowerAutomateIntegrationManifest.supportedExecutionModes).toContain(
        PowerAutomateExecutionMode.CLOUD,
      );
      expect(m1PowerAutomateIntegrationManifest.supportedExecutionModes).toContain(
        PowerAutomateExecutionMode.DESKTOP_FLOW,
      );
      expect(m1PowerAutomateIntegrationManifest.supportedExecutionModes).toContain(
        PowerAutomateExecutionMode.HYBRID,
      );
    });

    it('should require tenant binding', () => {
      expect(m1PowerAutomateIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include oauth scopes', () => {
      expect(m1PowerAutomateIntegrationManifest.authRequirements.oauthScopes).toContain(
        'powerautomate.read',
      );
      expect(m1PowerAutomateIntegrationManifest.authRequirements.oauthScopes).toContain(
        'powerautomate.write',
      );
      expect(m1PowerAutomateIntegrationManifest.authRequirements.oauthScopes).toContain(
        'powerautomate.trigger',
      );
      expect(m1PowerAutomateIntegrationManifest.authRequirements.oauthScopes).toContain(
        'powerautomate.action',
      );
    });

    it('should include api key scopes', () => {
      expect(m1PowerAutomateIntegrationManifest.authRequirements.apiKeyScopes).toContain(
        'integrations',
      );
    });

    it('should pass schema validation', () => {
      const result = powerAutomateIntegrationMetadataSchema.safeParse(
        m1PowerAutomateIntegrationManifest,
      );
      expect(result.success).toBe(true);
    });
  });
});

describe('power-automate-contract utility functions', () => {
  describe('isValidPowerAutomateTriggerKey', () => {
    it('should return true for valid trigger key', () => {
      expect(isValidPowerAutomateTriggerKey('user_created')).toBe(true);
    });

    it('should return false for invalid trigger key', () => {
      expect(isValidPowerAutomateTriggerKey('invalid_key')).toBe(false);
    });
  });

  describe('isValidPowerAutomateActionKey', () => {
    it('should return true for valid action key', () => {
      expect(isValidPowerAutomateActionKey('create_user')).toBe(true);
    });

    it('should return false for invalid action key', () => {
      expect(isValidPowerAutomateActionKey('invalid_key')).toBe(false);
    });
  });

  describe('getPowerAutomateTriggerContract', () => {
    it('should return contract for valid trigger key', () => {
      const contract = getPowerAutomateTriggerContract('user_created');
      expect(contract.key).toBe('user_created');
    });
  });

  describe('getPowerAutomateActionContract', () => {
    it('should return contract for valid action key', () => {
      const contract = getPowerAutomateActionContract('create_user');
      expect(contract.key).toBe('create_user');
    });
  });

  describe('getAllPowerAutomateOperationContracts', () => {
    it('should return all operation contracts', () => {
      const contracts = getAllPowerAutomateOperationContracts();
      expect(contracts.length).toBe(
        POWER_AUTOMATE_TRIGGER_KEYS.length + POWER_AUTOMATE_ACTION_KEYS.length,
      );
    });

    it('should include all trigger contracts', () => {
      const contracts = getAllPowerAutomateOperationContracts();
      const triggers = contracts.filter(
        (c) => c.operationType === PowerAutomateOperationType.TRIGGER,
      );
      expect(triggers.length).toBe(POWER_AUTOMATE_TRIGGER_KEYS.length);
    });

    it('should include all action contracts', () => {
      const contracts = getAllPowerAutomateOperationContracts();
      const actions = contracts.filter(
        (c) => c.operationType === PowerAutomateOperationType.ACTION,
      );
      expect(actions.length).toBe(POWER_AUTOMATE_ACTION_KEYS.length);
    });
  });

  describe('validatePowerAutomateInput', () => {
    it('should validate valid action input', () => {
      const validInput = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = validatePowerAutomateInput('create_user', validInput);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid action input', () => {
      const invalidInput = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = validatePowerAutomateInput('create_user', invalidInput);
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown operation key', () => {
      const result = validatePowerAutomateInput('unknown_operation', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildPowerAutomateErrorResponse', () => {
    it('should build valid error response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildPowerAutomateErrorResponse({
        code: POWER_AUTOMATE_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input provided',
        operationType: PowerAutomateOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('PA_INVALID_INPUT');
      expect(response.error?.message).toBe('Invalid input provided');
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(PowerAutomateOperationType.ACTION);
      expect(response.metadata?.operationKey).toBe('create_user');
    });

    it('should include execution mode when provided', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildPowerAutomateErrorResponse({
        code: POWER_AUTOMATE_ERROR_CODES.GATEWAY_UNREACHABLE,
        message: 'Gateway unreachable',
        operationType: PowerAutomateOperationType.ACTION,
        operationKey: 'update_user',
        tenantId,
        executionMode: PowerAutomateExecutionMode.DESKTOP_FLOW,
      });

      expect(response.metadata?.executionMode).toBe(PowerAutomateExecutionMode.DESKTOP_FLOW);
    });
  });

  describe('buildPowerAutomateSuccessResponse', () => {
    it('should build valid success response', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { id: '123', email: 'test@example.com' };
      const response = buildPowerAutomateSuccessResponse({
        data,
        operationType: PowerAutomateOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
        idempotencyKey: 'user:test@example.com',
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata?.tenantId).toBe(tenantId);
      expect(response.metadata?.operationType).toBe(PowerAutomateOperationType.ACTION);
      expect(response.metadata?.operationKey).toBe('create_user');
      expect(response.metadata?.idempotencyKey).toBe('user:test@example.com');
    });

    it('should include M365 field mappings when provided', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const data = { id: '123' };
      const mappings: {
        service: typeof M365ServiceType;
        sourceField: string;
        targetField: string;
        isDynamic: boolean;
        nullable: boolean;
      }[] = [
        {
          service: M365ServiceType.OUTLOOK,
          sourceField: 'email',
          targetField: 'mail',
          isDynamic: false,
          nullable: false,
        },
      ];
      const response = buildPowerAutomateSuccessResponse({
        data,
        operationType: PowerAutomateOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
        executionMode: PowerAutomateExecutionMode.CLOUD,
        m365FieldMappings: mappings,
      });

      expect(response.metadata?.m365FieldMappings).toBeDefined();
      expect(response.metadata?.m365FieldMappings?.length).toBe(1);
    });
  });

  describe('getPowerAutomateRetryDelayMs', () => {
    it('should return correct delay for first attempt', () => {
      const delay = getPowerAutomateRetryDelayMs(1);
      expect(delay).toBe(POWER_AUTOMATE_RETRY_DELAYS_MS[0]);
    });

    it('should return correct delay for second attempt', () => {
      const delay = getPowerAutomateRetryDelayMs(2);
      expect(delay).toBe(POWER_AUTOMATE_RETRY_DELAYS_MS[1]);
    });

    it('should cap at maximum delay for high attempt numbers', () => {
      const delay = getPowerAutomateRetryDelayMs(100);
      expect(delay).toBe(POWER_AUTOMATE_RETRY_DELAYS_MS[POWER_AUTOMATE_RETRY_DELAYS_MS.length - 1]);
    });
  });

  describe('isPowerAutomateRetryableError', () => {
    it('should return true for DEFERRED', () => {
      expect(isPowerAutomateRetryableError('PA_DEFERRED')).toBe(true);
    });

    it('should return true for RATE_LIMIT_EXCEEDED', () => {
      expect(isPowerAutomateRetryableError('PA_RATE_LIMIT_EXCEEDED')).toBe(true);
    });

    it('should return true for GATEWAY_UNREACHABLE', () => {
      expect(isPowerAutomateRetryableError('PA_GATEWAY_UNREACHABLE')).toBe(true);
    });

    it('should return false for M365_CONNECTION_FAILED', () => {
      expect(isPowerAutomateRetryableError('PA_M365_CONNECTION_FAILED')).toBe(false);
    });

    it('should return false for DESKTOP_FLOW_FAILED', () => {
      expect(isPowerAutomateRetryableError('PA_DESKTOP_FLOW_FAILED')).toBe(false);
    });
  });

  describe('isPowerAutomateTerminalError', () => {
    it('should return true for M365_CONNECTION_FAILED', () => {
      expect(isPowerAutomateTerminalError('PA_M365_CONNECTION_FAILED')).toBe(true);
    });

    it('should return true for DESKTOP_FLOW_FAILED', () => {
      expect(isPowerAutomateTerminalError('PA_DESKTOP_FLOW_FAILED')).toBe(true);
    });

    it('should return true for TENANT_MISMATCH', () => {
      expect(isPowerAutomateTerminalError('PA_TENANT_MISMATCH')).toBe(true);
    });

    it('should return false for DEFERRED', () => {
      expect(isPowerAutomateTerminalError('PA_DEFERRED')).toBe(false);
    });
  });
});

describe('power-automate-contract Zod schemas', () => {
  describe('powerAutomateOperationOutputSchema', () => {
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
      const result = powerAutomateOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('should validate valid error output', () => {
      const output = {
        success: false,
        error: {
          code: 'PA_INVALID_INPUT',
          message: 'Invalid input',
        },
        metadata: {
          tenantId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2024-01-15T10:30:00Z',
          operationType: 'action',
          operationKey: 'create_user',
        },
      };
      const result = powerAutomateOperationOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('powerAutomateOperationTypeSchema', () => {
    it('should validate trigger', () => {
      const result = powerAutomateOperationTypeSchema.safeParse('trigger');
      expect(result.success).toBe(true);
    });

    it('should validate action', () => {
      const result = powerAutomateOperationTypeSchema.safeParse('action');
      expect(result.success).toBe(true);
    });

    it('should reject invalid operation type', () => {
      const result = powerAutomateOperationTypeSchema.safeParse('search');
      expect(result.success).toBe(false);
    });
  });

  describe('powerAutomateExecutionModeSchema', () => {
    it('should validate cloud', () => {
      const result = powerAutomateExecutionModeSchema.safeParse('cloud');
      expect(result.success).toBe(true);
    });

    it('should validate desktop-flow', () => {
      const result = powerAutomateExecutionModeSchema.safeParse('desktop-flow');
      expect(result.success).toBe(true);
    });

    it('should validate hybrid', () => {
      const result = powerAutomateExecutionModeSchema.safeParse('hybrid');
      expect(result.success).toBe(true);
    });
  });
});

describe('power-automate-contract cross-cutting concerns', () => {
  describe('Multi-step passthrough invariants', () => {
    it('should ensure output always includes id field', () => {
      const outputSchema = powerAutomateActionOutputSchemas.create_user;
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
      const outputSchema = powerAutomateActionOutputSchemas.create_user;
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
      const createUserSchema = powerAutomateActionOutputSchemas.create_user;
      const updateUserSchema = powerAutomateActionOutputSchemas.update_user;

      const createFields = Object.keys(createUserSchema.shape);
      const updateFields = Object.keys(updateUserSchema.shape);

      expect(createFields).toContain('id');
      expect(updateFields).toContain('id');
    });
  });

  describe('Tenant isolation', () => {
    it('should require tenant binding for all operations', () => {
      const triggerContracts = Object.values(m1PowerAutomateTriggerContractManifest);
      triggerContracts.forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });

      const actionContracts = Object.values(m1PowerAutomateActionContractManifest);
      actionContracts.forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });

    it('should include tenantId in error responses', () => {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const response = buildPowerAutomateErrorResponse({
        code: POWER_AUTOMATE_ERROR_CODES.TENANT_MISMATCH,
        message: 'Tenant mismatch',
        operationType: PowerAutomateOperationType.ACTION,
        operationKey: 'create_user',
        tenantId,
      });

      expect(response.metadata?.tenantId).toBe(tenantId);
    });
  });

  describe('Webhook event parity with Zapier', () => {
    it('should map user_created trigger to auth.user.created', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.webhookEventType).toBe('auth.user.created');
    });

    it('should map user_updated trigger to auth.user.updated', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_updated;
      expect(contract.webhookEventType).toBe('auth.user.updated');
    });

    it('should map session_created trigger to auth.session.created', () => {
      const contract = m1PowerAutomateTriggerContractManifest.session_created;
      expect(contract.webhookEventType).toBe('auth.session.created');
    });

    it('should map tenant_created trigger to enterprise.tenant.created', () => {
      const contract = m1PowerAutomateTriggerContractManifest.tenant_created;
      expect(contract.webhookEventType).toBe('enterprise.tenant.created');
    });

    it('should map tenant_updated trigger to enterprise.tenant.updated', () => {
      const contract = m1PowerAutomateTriggerContractManifest.tenant_updated;
      expect(contract.webhookEventType).toBe('enterprise.tenant.updated');
    });
  });

  describe('Action parity with Zapier', () => {
    it('should have create_user action', () => {
      const contract = m1PowerAutomateActionContractManifest.create_user;
      expect(contract.key).toBe('create_user');
      expect(contract.idempotencySupported).toBe(true);
    });

    it('should have update_user action', () => {
      const contract = m1PowerAutomateActionContractManifest.update_user;
      expect(contract.key).toBe('update_user');
      expect(contract.idempotencySupported).toBe(true);
    });

    it('should have assign_training action', () => {
      const contract = m1PowerAutomateActionContractManifest.assign_training;
      expect(contract.key).toBe('assign_training');
      expect(contract.idempotencySupported).toBe(true);
    });

    it('should have create_report action', () => {
      const contract = m1PowerAutomateActionContractManifest.create_report;
      expect(contract.key).toBe('create_report');
      expect(contract.idempotencySupported).toBe(true);
    });

    it('should have send_notification action', () => {
      const contract = m1PowerAutomateActionContractManifest.send_notification;
      expect(contract.key).toBe('send_notification');
      expect(contract.idempotencySupported).toBe(true);
    });
  });

  describe('M365 interoperability', () => {
    it('should have M365 field mappings for user_created trigger', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.m365FieldMappings).toBeDefined();
      const outlookMapping = contract.m365FieldMappings?.find(
        (m) => m.service === M365ServiceType.OUTLOOK,
      );
      expect(outlookMapping).toBeDefined();
      expect(outlookMapping?.sourceField).toBe('email');
      expect(outlookMapping?.targetField).toBe('mail');
    });

    it('should have dynamic content tokens for user_created trigger', () => {
      const contract = m1PowerAutomateTriggerContractManifest.user_created;
      expect(contract.dynamicContentTokens).toBeDefined();
    });

    it('should support SharePoint field mapping for create_report', () => {
      const contract = m1PowerAutomateActionContractManifest.create_report;
      const sharepointMapping = contract.m365FieldMappings?.find(
        (m) => m.service === M365ServiceType.SHAREPOINT,
      );
      expect(sharepointMapping).toBeDefined();
    });

    it('should support Teams field mapping for send_notification', () => {
      const contract = m1PowerAutomateActionContractManifest.send_notification;
      const teamsMapping = contract.m365FieldMappings?.find(
        (m) => m.service === M365ServiceType.TEAMS,
      );
      expect(teamsMapping).toBeDefined();
    });
  });

  describe('Desktop flow support', () => {
    it('should indicate desktop flow support for update_user', () => {
      const contract = m1PowerAutomateActionContractManifest.update_user;
      expect(contract.supportsDesktopFlow).toBe(true);
    });

    it('should indicate desktop flow support for assign_training', () => {
      const contract = m1PowerAutomateActionContractManifest.assign_training;
      expect(contract.supportsDesktopFlow).toBe(true);
    });

    it('should indicate desktop flow support for create_report', () => {
      const contract = m1PowerAutomateActionContractManifest.create_report;
      expect(contract.supportsDesktopFlow).toBe(true);
    });

    it('should not require on-premises gateway by default', () => {
      const actionContracts = Object.values(m1PowerAutomateActionContractManifest);
      actionContracts.forEach((contract) => {
        expect(contract.requiresOnPremisesGateway).toBe(false);
      });
    });
  });

  describe('Default max attempts', () => {
    it('should have correct default max attempts', () => {
      expect(POWER_AUTOMATE_DEFAULT_MAX_ATTEMPTS).toBe(4);
    });
  });
});
