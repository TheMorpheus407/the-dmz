export const SERVICE_ACCOUNT_STATUS_ACTIVE = 'active';
export const SERVICE_ACCOUNT_STATUS_DISABLED = 'disabled';
export const SERVICE_ACCOUNT_STATUS_DELETED = 'deleted';

export const serviceAccountStatuses = [
  SERVICE_ACCOUNT_STATUS_ACTIVE,
  SERVICE_ACCOUNT_STATUS_DISABLED,
  SERVICE_ACCOUNT_STATUS_DELETED,
] as const;

export type ServiceAccountStatus = (typeof serviceAccountStatuses)[number];
