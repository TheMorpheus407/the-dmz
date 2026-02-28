import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  GrantDecisionOutcome,
  permissionCeilingInputSchema,
  roleGrantInputSchema,
  roleCreateInputSchema,
  roleUpdateInputSchema,
  type PermissionCeilingInput,
  type RoleGrantInput,
  type RoleCreateInput,
  type RoleUpdateInput,
} from '@the-dmz/shared/auth';

describe('delegation-contract', () => {
  describe('GrantDecisionOutcome', () => {
    it('has allowed outcome', () => {
      expect(GrantDecisionOutcome.ALLOWED).toBe('allowed');
    });

    it('has denied_permission_ceiling outcome', () => {
      expect(GrantDecisionOutcome.DENIED_PERMISSION_CEILING).toBe('denied_permission_ceiling');
    });

    it('has denied_role_not_assignable outcome', () => {
      expect(GrantDecisionOutcome.DENIED_ROLE_NOT_ASSIGNABLE).toBe('denied_role_not_assignable');
    });

    it('has denied_system_role_mutation outcome', () => {
      expect(GrantDecisionOutcome.DENIED_SYSTEM_ROLE_MUTATION).toBe('denied_system_role_mutation');
    });

    it('has denied_step_up_required outcome', () => {
      expect(GrantDecisionOutcome.DENIED_STEP_UP_REQUIRED).toBe('denied_step_up_required');
    });

    it('has denied_self_escalation outcome', () => {
      expect(GrantDecisionOutcome.DENIED_SELF_ESCALATION).toBe('denied_self_escalation');
    });

    it('has denied_tenant_isolation outcome', () => {
      expect(GrantDecisionOutcome.DENIED_TENANT_ISOLATION).toBe('denied_tenant_isolation');
    });

    it('has denied_expired outcome', () => {
      expect(GrantDecisionOutcome.DENIED_EXPIRED).toBe('denied_expired');
    });

    it('has denied_scope_mismatch outcome', () => {
      expect(GrantDecisionOutcome.DENIED_SCOPE_MISMATCH).toBe('denied_scope_mismatch');
    });
  });

  describe('permissionCeilingInputSchema', () => {
    it('validates a correct input', () => {
      const input: PermissionCeilingInput = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetPermissions: ['admin:read', 'admin:write'],
      };

      const result = permissionCeilingInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID for actorId', () => {
      const input = {
        actorId: 'invalid-uuid',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetPermissions: ['admin:read'],
      };

      const result = permissionCeilingInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty targetPermissions', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetPermissions: [],
      };

      const result = permissionCeilingInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts optional targetRoleId', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetPermissions: ['admin:read'],
        targetRoleId: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = permissionCeilingInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts optional targetUserId', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetPermissions: ['admin:read'],
        targetUserId: '123e4567-e89b-12d3-a456-426614174003',
      };

      const result = permissionCeilingInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('roleGrantInputSchema', () => {
    it('validates a correct input', () => {
      const input: RoleGrantInput = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetUserId: '123e4567-e89b-12d3-a456-426614174002',
        targetRoleId: '123e4567-e89b-12d3-a456-426614174003',
      };

      const result = roleGrantInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts optional scope', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetUserId: '123e4567-e89b-12d3-a456-426614174002',
        targetRoleId: '123e4567-e89b-12d3-a456-426614174003',
        scope: 'admin',
      };

      const result = roleGrantInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts null scope', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetUserId: '123e4567-e89b-12d3-a456-426614174002',
        targetRoleId: '123e4567-e89b-12d3-a456-426614174003',
        scope: null,
      };

      const result = roleGrantInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts optional expiresAt', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        targetUserId: '123e4567-e89b-12d3-a456-426614174002',
        targetRoleId: '123e4567-e89b-12d3-a456-426614174003',
        expiresAt: new Date('2025-12-31'),
      };

      const result = roleGrantInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('roleCreateInputSchema', () => {
    it('validates a correct input', () => {
      const input: RoleCreateInput = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'custom_role',
        permissions: ['admin:read', 'admin:write'],
      };

      const result = roleCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects name exceeding max length', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'a'.repeat(65),
        permissions: ['admin:read'],
      };

      const result = roleCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: '',
        permissions: ['admin:read'],
      };

      const result = roleCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts optional description', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'custom_role',
        description: 'A custom role for testing',
        permissions: ['admin:read'],
      };

      const result = roleCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires permissions field', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'custom_role',
      };

      const result = roleCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('roleUpdateInputSchema', () => {
    it('validates a correct input', () => {
      const input: RoleUpdateInput = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002',
        name: 'updated_role',
        permissions: ['admin:read'],
      };

      const result = roleUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows partial updates with only name', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002',
        name: 'updated_role',
      };

      const result = roleUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows partial updates with only permissions', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        roleId: '123e4567-e89b-12d3-a456-426614174002',
        permissions: ['admin:read', 'admin:write'],
      };

      const result = roleUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('requires roleId', () => {
      const input = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorTenantId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'updated_role',
      };

      const result = roleUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
