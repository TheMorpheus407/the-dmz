import type { Tenant, TenantTier, ProvisioningStatus } from '../../shared/database/schema/index.js';

export interface NewTenant {
  name: string;
  slug: string;
  domain?: string | null | undefined;
  contactEmail?: string | null | undefined;
  tier?: TenantTier | undefined;
  planId?: string | undefined;
  dataRegion?: string | null | undefined;
}

export interface TenantWithStatus {
  tenantId: string;
  name: string;
  slug: string;
  domain: string | null;
  tier: TenantTier;
  status: string;
  provisioningStatus: ProvisioningStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantProvisioningResult {
  tenant: Tenant;
  adminUserId: string;
  temporaryPassword: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  domain?: string;
  contactEmail?: string;
  tier?: TenantTier;
  planId?: string;
  dataRegion?: string;
  adminEmail: string;
  adminDisplayName: string;
}

export interface InitializeTenantRequest {
  adminEmail: string;
  adminDisplayName: string;
}

export interface TenantStatusResponse {
  success: boolean;
  data: TenantWithStatus;
}

export interface CreateTenantResponse {
  success: boolean;
  data: {
    tenantId: string;
    name: string;
    slug: string;
    tier: TenantTier;
    provisioningStatus: ProvisioningStatus;
    adminEmail: string;
    temporaryPassword: string;
  };
}

export interface InitializeTenantResponse {
  success: boolean;
  data: {
    tenantId: string;
    adminUserId: string;
    temporaryPassword: string;
    provisioningStatus: ProvisioningStatus;
  };
}
