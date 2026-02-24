import { describe, expect, it } from 'vitest';

import {
  AUTHZ_EVENTS,
  AUTHZ_INVALIDATION_EVENTS,
  createAuthzRoleAssignedEvent,
  createAuthzRoleRevokedEvent,
  createAuthzRolePermissionGrantedEvent,
  createAuthzRolePermissionRevokedEvent,
  createAuthzPolicyCreatedEvent,
  createAuthzPolicyUpdatedEvent,
  createAuthzPolicyDeletedEvent,
  createAuthzTenantAttributeChangedEvent,
} from '../authz.events.js';

describe('authorization events', () => {
  describe('AUTHZ_EVENTS', () => {
    it('defines role events', () => {
      expect(AUTHZ_EVENTS.ROLE_CREATED).toBe('authz.role.created');
      expect(AUTHZ_EVENTS.ROLE_UPDATED).toBe('authz.role.updated');
      expect(AUTHZ_EVENTS.ROLE_DELETED).toBe('authz.role.deleted');
      expect(AUTHZ_EVENTS.ROLE_ASSIGNED).toBe('authz.role.assigned');
      expect(AUTHZ_EVENTS.ROLE_REVOKED).toBe('authz.role.revoked');
    });

    it('defines permission events', () => {
      expect(AUTHZ_EVENTS.PERMISSION_CREATED).toBe('authz.permission.created');
      expect(AUTHZ_EVENTS.PERMISSION_UPDATED).toBe('authz.permission.updated');
      expect(AUTHZ_EVENTS.PERMISSION_DELETED).toBe('authz.permission.deleted');
    });

    it('defines role-permission events', () => {
      expect(AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED).toBe('authz.role.permission.granted');
      expect(AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED).toBe('authz.role.permission.revoked');
    });

    it('defines policy events', () => {
      expect(AUTHZ_EVENTS.POLICY_CREATED).toBe('authz.policy.created');
      expect(AUTHZ_EVENTS.POLICY_UPDATED).toBe('authz.policy.updated');
      expect(AUTHZ_EVENTS.POLICY_DELETED).toBe('authz.policy.deleted');
    });

    it('defines tenant attribute events', () => {
      expect(AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED).toBe('authz.tenant.attribute.changed');
    });
  });

  describe('AUTHZ_INVALIDATION_EVENTS', () => {
    it('includes all role-related events', () => {
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_ASSIGNED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_REVOKED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_CREATED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_UPDATED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_DELETED);
    });

    it('includes all permission-related events', () => {
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.PERMISSION_CREATED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.PERMISSION_UPDATED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.PERMISSION_DELETED);
    });

    it('includes all role-permission events', () => {
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED);
    });

    it('includes all policy events', () => {
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.POLICY_CREATED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.POLICY_UPDATED);
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.POLICY_DELETED);
    });

    it('includes tenant attribute events', () => {
      expect(AUTHZ_INVALIDATION_EVENTS).toContain(AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED);
    });
  });

  describe('event factory functions', () => {
    const baseParams = {
      source: 'test',
      correlationId: 'corr-123',
      tenantId: 'tenant-123',
      userId: 'user-123',
      version: 1,
    };

    it('creates role assigned events', () => {
      const event = createAuthzRoleAssignedEvent({
        ...baseParams,
        payload: {
          roleId: 'role-1',
          roleName: 'admin',
          userId: 'user-456',
          tenantId: 'tenant-123',
        },
      });

      expect(event.eventType).toBe(AUTHZ_EVENTS.ROLE_ASSIGNED);
      expect(event.payload.roleName).toBe('admin');
    });

    it('creates role revoked events', () => {
      const event = createAuthzRoleRevokedEvent({
        ...baseParams,
        payload: {
          roleId: 'role-1',
          roleName: 'admin',
          userId: 'user-456',
          tenantId: 'tenant-123',
        },
      });

      expect(event.eventType).toBe(AUTHZ_EVENTS.ROLE_REVOKED);
    });

    it('creates role permission granted events', () => {
      const event = createAuthzRolePermissionGrantedEvent({
        ...baseParams,
        payload: {
          roleId: 'role-1',
          permissionId: 'perm-1',
          tenantId: 'tenant-123',
        },
      });

      expect(event.eventType).toBe(AUTHZ_EVENTS.ROLE_PERMISSION_GRANTED);
    });

    it('creates role permission revoked events', () => {
      const event = createAuthzRolePermissionRevokedEvent({
        ...baseParams,
        payload: {
          roleId: 'role-1',
          permissionId: 'perm-1',
          tenantId: 'tenant-123',
        },
      });

      expect(event.eventType).toBe(AUTHZ_EVENTS.ROLE_PERMISSION_REVOKED);
    });

    it('creates policy events', () => {
      const created = createAuthzPolicyCreatedEvent({
        ...baseParams,
        payload: {
          policyId: 'policy-1',
          policyName: 'test-policy',
          tenantId: 'tenant-123',
        },
      });
      expect(created.eventType).toBe(AUTHZ_EVENTS.POLICY_CREATED);

      const updated = createAuthzPolicyUpdatedEvent({
        ...baseParams,
        payload: {
          policyId: 'policy-1',
          policyName: 'test-policy',
          tenantId: 'tenant-123',
          changes: ['conditions'],
        },
      });
      expect(updated.eventType).toBe(AUTHZ_EVENTS.POLICY_UPDATED);

      const deleted = createAuthzPolicyDeletedEvent({
        ...baseParams,
        payload: {
          policyId: 'policy-1',
          policyName: 'test-policy',
          tenantId: 'tenant-123',
        },
      });
      expect(deleted.eventType).toBe(AUTHZ_EVENTS.POLICY_DELETED);
    });

    it('creates tenant attribute changed events', () => {
      const event = createAuthzTenantAttributeChangedEvent({
        ...baseParams,
        payload: {
          tenantId: 'tenant-123',
          attributeName: 'department',
          oldValue: 'Sales',
          newValue: 'Marketing',
        },
      });

      expect(event.eventType).toBe(AUTHZ_EVENTS.TENANT_ATTRIBUTE_CHANGED);
      expect(event.payload.attributeName).toBe('department');
      expect(event.payload.oldValue).toBe('Sales');
      expect(event.payload.newValue).toBe('Marketing');
    });
  });
});
