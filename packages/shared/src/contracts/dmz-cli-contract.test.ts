import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import {
  DmzCliCommandType,
  DMZ_CLI_VERSION,
  DMZ_CLI_COMPATIBILITY_NOTES,
  DMZ_CLI_QUERY_COMMANDS,
  DMZ_CLI_MUTATION_COMMANDS,
  DMZ_CLI_ADMIN_COMMANDS,
  DMZ_CLI_OUTPUT_INVARIANTS,
  DMZ_CLI_ERROR_CODES,
  m1DmzCliQueryContractManifest,
  m1DmzCliMutationContractManifest,
  m1DmzCliAdminContractManifest,
  m1DmzCliIntegrationManifest,
  isValidDmzCliQueryCommand,
  isValidDmzCliMutationCommand,
  isValidDmzCliAdminCommand,
  getDmzCliQueryContract,
  getDmzCliMutationContract,
  getDmzCliAdminContract,
  getAllDmzCliCommandContracts,
  validateDmzCliInput,
  buildDmzCliErrorResponse,
  buildDmzCliSuccessResponse,
  dmzCliCommandOutputSchema,
  dmzCliIntegrationMetadataSchema,
  dmzCliQueryInputSchemas,
  dmzCliMutationInputSchemas,
  dmzCliAdminInputSchemas,
} from '@the-dmz/shared/contracts/dmz-cli-contract';

describe('dmz-cli-contract', () => {
  describe('DmzCliCommandType', () => {
    it('should have correct QUERY value', () => {
      expect(DmzCliCommandType.QUERY).toBe('query');
    });

    it('should have correct MUTATION value', () => {
      expect(DmzCliCommandType.MUTATION).toBe('mutation');
    });

    it('should have correct ADMIN value', () => {
      expect(DmzCliCommandType.ADMIN).toBe('admin');
    });
  });

  describe('DMZ_CLI_VERSION', () => {
    it('should be a valid semantic version', () => {
      expect(DMZ_CLI_VERSION).toBe('1.0.0');
    });
  });

  describe('DMZ_CLI_COMPATIBILITY_NOTES', () => {
    it('should mention API key requirements', () => {
      expect(DMZ_CLI_COMPATIBILITY_NOTES).toContain('API key');
    });
  });

  describe('DMZ_CLI_OUTPUT_INVARIANTS', () => {
    it('should require id field always', () => {
      expect(DMZ_CLI_OUTPUT_INVARIANTS.ALWAYS_INCLUDE_ID).toBe(true);
    });

    it('should allow null for optional fields', () => {
      expect(DMZ_CLI_OUTPUT_INVARIANTS.NULLABLE_OPTIONAL_FIELDS).toBe(true);
    });

    it('should enforce deterministic field inclusion', () => {
      expect(DMZ_CLI_OUTPUT_INVARIANTS.DETERMINISTIC_FIELD_INCLUSION).toBe(true);
    });

    it('should enforce stable field naming', () => {
      expect(DMZ_CLI_OUTPUT_INVARIANTS.STABLE_FIELD_NAMING).toBe(true);
    });

    it('should track execution time', () => {
      expect(DMZ_CLI_OUTPUT_INVARIANTS.EXECUTION_TIME_TRACKING).toBe(true);
    });

    it('should support output format', () => {
      expect(DMZ_CLI_OUTPUT_INVARIANTS.OUTPUT_FORMAT_SUPPORT).toBe(true);
    });
  });

  describe('DMZ_CLI_ERROR_CODES', () => {
    it('should have INVALID_INPUT error code', () => {
      expect(DMZ_CLI_ERROR_CODES.INVALID_INPUT).toBe('DMZ_CLI_INVALID_INPUT');
    });

    it('should have INSUFFICIENT_SCOPE error code', () => {
      expect(DMZ_CLI_ERROR_CODES.INSUFFICIENT_SCOPE).toBe('DMZ_CLI_INSUFFICIENT_SCOPE');
    });

    it('should have TENANT_MISMATCH error code', () => {
      expect(DMZ_CLI_ERROR_CODES.TENANT_MISMATCH).toBe('DMZ_CLI_TENANT_MISMATCH');
    });

    it('should have COMMAND_NOT_FOUND error code', () => {
      expect(DMZ_CLI_ERROR_CODES.COMMAND_NOT_FOUND).toBe('DMZ_CLI_COMMAND_NOT_FOUND');
    });

    it('should have PERMISSION_DENIED error code', () => {
      expect(DMZ_CLI_ERROR_CODES.PERMISSION_DENIED).toBe('DMZ_CLI_PERMISSION_DENIED');
    });
  });

  describe('DMZ_CLI_QUERY_COMMANDS', () => {
    it('should include get-user command', () => {
      expect(DMZ_CLI_QUERY_COMMANDS).toContain('get-user');
    });

    it('should include list-users command', () => {
      expect(DMZ_CLI_QUERY_COMMANDS).toContain('list-users');
    });

    it('should have 8 query commands', () => {
      expect(DMZ_CLI_QUERY_COMMANDS.length).toBe(8);
    });
  });

  describe('DMZ_CLI_MUTATION_COMMANDS', () => {
    it('should include create-user command', () => {
      expect(DMZ_CLI_MUTATION_COMMANDS).toContain('create-user');
    });

    it('should include update-user command', () => {
      expect(DMZ_CLI_MUTATION_COMMANDS).toContain('update-user');
    });

    it('should have 6 mutation commands', () => {
      expect(DMZ_CLI_MUTATION_COMMANDS.length).toBe(6);
    });
  });

  describe('DMZ_CLI_ADMIN_COMMANDS', () => {
    it('should include create-tenant command', () => {
      expect(DMZ_CLI_ADMIN_COMMANDS).toContain('create-tenant');
    });

    it('should include create-api-key command', () => {
      expect(DMZ_CLI_ADMIN_COMMANDS).toContain('create-api-key');
    });

    it('should have 6 admin commands', () => {
      expect(DMZ_CLI_ADMIN_COMMANDS.length).toBe(6);
    });
  });

  describe('m1DmzCliQueryContractManifest', () => {
    it('should have get-user contract', () => {
      expect(m1DmzCliQueryContractManifest['get-user']).toBeDefined();
    });

    it('should have correct command type for get-user', () => {
      expect(m1DmzCliQueryContractManifest['get-user'].commandType).toBe(DmzCliCommandType.QUERY);
    });

    it('should support pagination for list-users', () => {
      expect(m1DmzCliQueryContractManifest['list-users'].paginationSupported).toBe(true);
    });

    it('should require tenant binding', () => {
      expect(m1DmzCliQueryContractManifest['get-user'].tenantBindingRequired).toBe(true);
    });

    it('should have output format', () => {
      expect(m1DmzCliQueryContractManifest['get-user'].outputFormat).toBe('json');
    });
  });

  describe('m1DmzCliMutationContractManifest', () => {
    it('should have create-user contract', () => {
      expect(m1DmzCliMutationContractManifest['create-user']).toBeDefined();
    });

    it('should have correct command type for create-user', () => {
      expect(m1DmzCliMutationContractManifest['create-user'].commandType).toBe(
        DmzCliCommandType.MUTATION,
      );
    });

    it('should support idempotency for create-user', () => {
      expect(m1DmzCliMutationContractManifest['create-user'].idempotencySupported).toBe(true);
    });

    it('should have idempotency key format', () => {
      expect(m1DmzCliMutationContractManifest['create-user'].idempotencyKeyFormat).toBeDefined();
    });
  });

  describe('m1DmzCliAdminContractManifest', () => {
    it('should have create-tenant contract', () => {
      expect(m1DmzCliAdminContractManifest['create-tenant']).toBeDefined();
    });

    it('should have correct command type for create-tenant', () => {
      expect(m1DmzCliAdminContractManifest['create-tenant'].commandType).toBe(
        DmzCliCommandType.ADMIN,
      );
    });

    it('should NOT require tenant binding for create-tenant', () => {
      expect(m1DmzCliAdminContractManifest['create-tenant'].tenantBindingRequired).toBe(false);
    });
  });

  describe('m1DmzCliIntegrationManifest', () => {
    it('should have correct integration version', () => {
      expect(m1DmzCliIntegrationManifest.integrationVersion).toBe(DMZ_CLI_VERSION);
    });

    it('should require tenant binding', () => {
      expect(m1DmzCliIntegrationManifest.authRequirements.requiresTenantBinding).toBe(true);
    });

    it('should include dmz_cli.query scope', () => {
      expect(m1DmzCliIntegrationManifest.authRequirements.apiKeyScopes).toContain('dmz_cli.query');
    });

    it('should include dmz_cli.mutation scope', () => {
      expect(m1DmzCliIntegrationManifest.authRequirements.apiKeyScopes).toContain(
        'dmz_cli.mutation',
      );
    });

    it('should include dmz_cli.admin scope', () => {
      expect(m1DmzCliIntegrationManifest.authRequirements.apiKeyScopes).toContain('dmz_cli.admin');
    });
  });

  describe('isValidDmzCliQueryCommand', () => {
    it('should return true for valid query command', () => {
      expect(isValidDmzCliQueryCommand('get-user')).toBe(true);
    });

    it('should return false for invalid query command', () => {
      expect(isValidDmzCliQueryCommand('invalid_command')).toBe(false);
    });
  });

  describe('isValidDmzCliMutationCommand', () => {
    it('should return true for valid mutation command', () => {
      expect(isValidDmzCliMutationCommand('create-user')).toBe(true);
    });

    it('should return false for invalid mutation command', () => {
      expect(isValidDmzCliMutationCommand('invalid_command')).toBe(false);
    });
  });

  describe('isValidDmzCliAdminCommand', () => {
    it('should return true for valid admin command', () => {
      expect(isValidDmzCliAdminCommand('create-tenant')).toBe(true);
    });

    it('should return false for invalid admin command', () => {
      expect(isValidDmzCliAdminCommand('invalid_command')).toBe(false);
    });
  });

  describe('getDmzCliQueryContract', () => {
    it('should return query contract for valid command', () => {
      const contract = getDmzCliQueryContract('get-user');
      expect(contract.key).toBe('get-user');
    });
  });

  describe('getDmzCliMutationContract', () => {
    it('should return mutation contract for valid command', () => {
      const contract = getDmzCliMutationContract('create-user');
      expect(contract.key).toBe('create-user');
    });
  });

  describe('getDmzCliAdminContract', () => {
    it('should return admin contract for valid command', () => {
      const contract = getDmzCliAdminContract('create-tenant');
      expect(contract.key).toBe('create-tenant');
    });
  });

  describe('getAllDmzCliCommandContracts', () => {
    it('should return all command contracts', () => {
      const contracts = getAllDmzCliCommandContracts();
      expect(contracts.length).toBe(20);
    });
  });

  describe('validateDmzCliInput', () => {
    it('should validate correct query input', () => {
      const result = validateDmzCliInput('get-user', {
        userId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.valid).toBe(true);
    });

    it('should validate correct mutation input', () => {
      const result = validateDmzCliInput('create-user', {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.valid).toBe(true);
    });

    it('should validate correct admin input', () => {
      const result = validateDmzCliInput('create-tenant', {
        name: 'Test Tenant',
        tier: 'basic',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid query input', () => {
      const result = validateDmzCliInput('get-user', {});
      expect(result.valid).toBe(false);
    });

    it('should return false for unknown command', () => {
      const result = validateDmzCliInput('unknown_command', {});
      expect(result.valid).toBe(false);
    });
  });

  describe('buildDmzCliErrorResponse', () => {
    it('should build error response correctly', () => {
      const response = buildDmzCliErrorResponse(
        DMZ_CLI_ERROR_CODES.INVALID_INPUT,
        'Invalid input',
        DmzCliCommandType.MUTATION,
        'create-user',
        '660e8400-e29b-41d4-a716-446655440001',
        100,
      );
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('DMZ_CLI_INVALID_INPUT');
      expect(response.metadata?.tenantId).toBe('660e8400-e29b-41d4-a716-446655440001');
      expect(response.metadata?.executionTimeMs).toBe(100);
    });
  });

  describe('buildDmzCliSuccessResponse', () => {
    it('should build success response correctly', () => {
      const response = buildDmzCliSuccessResponse(
        { id: '123' },
        DmzCliCommandType.MUTATION,
        'create-user',
        '660e8400-e29b-41d4-a716-446655440001',
        'test-key',
        150,
      );
      expect(response.success).toBe(true);
      expect(response.data?.id).toBe('123');
      expect(response.metadata?.idempotencyKey).toBe('test-key');
      expect(response.metadata?.executionTimeMs).toBe(150);
    });
  });

  describe('dmzCliIntegrationMetadataSchema', () => {
    it('should validate correct metadata', () => {
      const result = dmzCliIntegrationMetadataSchema.safeParse(m1DmzCliIntegrationManifest);
      expect(result.success).toBe(true);
    });
  });

  describe('dmzCliCommandOutputSchema', () => {
    it('should validate success response', () => {
      const result = dmzCliCommandOutputSchema.safeParse({
        success: true,
        data: { id: '123' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          commandType: 'mutation',
          command: 'create-user',
          executionTimeMs: 100,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate error response', () => {
      const result = dmzCliCommandOutputSchema.safeParse({
        success: false,
        error: { code: 'ERROR', message: 'Error occurred' },
        metadata: {
          tenantId: '660e8400-e29b-41d4-a716-446655440001',
          timestamp: '2024-01-15T10:30:00Z',
          commandType: 'mutation',
          command: 'create-user',
          executionTimeMs: 100,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('should enforce tenant binding in all query commands except get-tenant', () => {
      const contracts = Object.values(m1DmzCliQueryContractManifest);
      contracts
        .filter((c) => c.key !== 'get-tenant')
        .forEach((contract) => {
          expect(contract.tenantBindingRequired).toBe(true);
        });
    });

    it('should enforce tenant binding in all mutation commands', () => {
      Object.values(m1DmzCliMutationContractManifest).forEach((contract) => {
        expect(contract.tenantBindingRequired).toBe(true);
      });
    });

    it('should have correct tenant binding for admin commands', () => {
      expect(m1DmzCliAdminContractManifest['create-tenant'].tenantBindingRequired).toBe(false);
      expect(m1DmzCliAdminContractManifest['update-tenant'].tenantBindingRequired).toBe(true);
    });
  });

  describe('envelope parity with Zapier', () => {
    it('should have same success/data/error/metadata structure as Zapier', () => {
      const dmzCliResponse = buildDmzCliSuccessResponse(
        {},
        DmzCliCommandType.MUTATION,
        'create-user',
        '660e8400-e29b-41d4-a716-446655440001',
      );
      expect(dmzCliResponse).toHaveProperty('success');
      expect(dmzCliResponse).toHaveProperty('data');
      expect(dmzCliResponse).toHaveProperty('metadata');
      expect(dmzCliResponse.success).toBe(true);
      expect(dmzCliResponse.error).toBeUndefined();
    });
  });

  describe('command schema validation', () => {
    it('should validate get-user input', () => {
      const result = dmzCliQueryInputSchemas['get-user'].safeParse({
        userId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should validate list-users input', () => {
      const result = dmzCliQueryInputSchemas['list-users'].safeParse({
        limit: 50,
        offset: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should validate create-user mutation input', () => {
      const result = dmzCliMutationInputSchemas['create-user'].safeParse({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should validate create-tenant admin input', () => {
      const result = dmzCliAdminInputSchemas['create-tenant'].safeParse({
        name: 'Test Tenant',
        tier: 'enterprise',
      });
      expect(result.success).toBe(true);
    });
  });
});
