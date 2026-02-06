export type TenantStatus = 'active' | 'suspended' | 'archived';

export type TenantBase = {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
};
