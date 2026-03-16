import { describe, expect, it } from 'vitest';

import {
  type CreateTenantRequest,
  type TenantStatusResponse,
  type CreateTenantResponse,
  type InitializeTenantResponse,
} from '../tenant-provisioning.types.js';

import type { TenantTier, ProvisioningStatus } from '../../../shared/database/schema/index.js';

describe('tenant provisioning types', () => {
  describe('CreateTenantRequest', () => {
    it('should accept valid tenant creation request', () => {
      const request: CreateTenantRequest = {
        name: 'Test Organization',
        slug: 'test-org',
        domain: 'testorg.com',
        contactEmail: 'admin@testorg.com',
        tier: 'professional',
        planId: 'pro',
        dataRegion: 'us',
        adminEmail: 'admin@testorg.com',
        adminDisplayName: 'Test Admin',
      };

      expect(request.name).toBe('Test Organization');
      expect(request.slug).toBe('test-org');
      expect(request.tier).toBe('professional');
    });

    it('should accept default tier', () => {
      const request: CreateTenantRequest = {
        name: 'Test Organization',
        slug: 'test-org-2',
        adminEmail: 'admin@testorg.com',
        adminDisplayName: 'Test Admin',
      };

      expect(request.tier).toBeUndefined();
    });
  });

  describe('TenantStatusResponse', () => {
    it('should have correct structure', () => {
      const response: TenantStatusResponse = {
        success: true,
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Tenant',
          slug: 'test-tenant',
          domain: 'test.com',
          tier: 'enterprise' as TenantTier,
          status: 'active',
          provisioningStatus: 'ready' as ProvisioningStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(response.success).toBe(true);
      expect(response.data.provisioningStatus).toBe('ready');
    });
  });

  describe('CreateTenantResponse', () => {
    it('should include temporary password', () => {
      const response: CreateTenantResponse = {
        success: true,
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Tenant',
          slug: 'test-tenant',
          tier: 'starter',
          provisioningStatus: 'pending',
          adminEmail: 'admin@test.com',
          temporaryPassword: 'TempPass123!',
        },
      };

      expect(response.data.temporaryPassword).toBeDefined();
      expect(response.data.temporaryPassword.length).toBeGreaterThan(0);
    });
  });

  describe('InitializeTenantResponse', () => {
    it('should include admin user ID', () => {
      const response: InitializeTenantResponse = {
        success: true,
        data: {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          adminUserId: '223e4567-e89b-12d3-a456-426614174000',
          temporaryPassword: 'TempPass123!',
          provisioningStatus: 'ready',
        },
      };

      expect(response.data.adminUserId).toBeDefined();
      expect(response.data.provisioningStatus).toBe('ready');
    });
  });
});
