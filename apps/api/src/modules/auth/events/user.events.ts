export const USER_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_UPDATED: 'auth.user.updated',
  USER_DEACTIVATED: 'auth.user.deactivated',
} as const;

export type UserEventType = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];

export interface AuthUserCreatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}

export interface AuthUserUpdatedPayload {
  userId: string;
  email: string;
  tenantId: string;
  changes: Array<keyof AuthUserUpdatedPayload>;
}

export interface AuthUserDeactivatedPayload {
  userId: string;
  email: string;
  tenantId: string;
}
