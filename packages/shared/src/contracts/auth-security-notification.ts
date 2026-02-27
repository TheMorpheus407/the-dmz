import { z } from 'zod';

export enum AuthSecurityEventType {
  PASSWORD_RESET_REQUESTED = 'auth_security.password_reset_requested',
  PASSWORD_CHANGED = 'auth_security.password_changed',
  ACCOUNT_LOCKED = 'auth_security.account_locked',
  ACCOUNT_UNLOCKED = 'auth_security.account_unlocked',
  NEW_DEVICE_SESSION = 'auth_security.new_device_session',
  MFA_ENABLED = 'auth_security.mfa_enabled',
  MFA_DISABLED = 'auth_security.mfa_disabled',
  MFA_RECOVERY_CODES_USED = 'auth_security.mfa_recovery_codes_used',
}

export enum AuthSecuritySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum NotificationDeliveryChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationDeliveryStatus {
  SENT = 'sent',
  SUPPRESSED_DEDUPE = 'suppressed_dedupe',
  RATE_LIMITED = 'rate_limited',
  FAILED = 'failed',
}

export enum NotificationTemplateCategory {
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  NEW_DEVICE_SESSION = 'new_device_session',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_RECOVERY_CODES_USED = 'mfa_recovery_codes_used',
}

export const authSecurityEventPayloadSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  email: z.string().email(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
  riskContext: z
    .object({
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      deviceFingerprint: z.string().optional(),
      location: z.string().optional(),
      isNewDevice: z.boolean().optional(),
      isAnomalous: z.boolean().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AuthSecurityEventPayload = z.infer<typeof authSecurityEventPayloadSchema>;

export const authSecurityNotificationContractSchema = z.object({
  eventType: z.nativeEnum(AuthSecurityEventType),
  version: z.number().int().positive(),
  severity: z.nativeEnum(AuthSecuritySeverity),
  mandatoryNotification: z.boolean(),
  dedupeWindowMs: z.number().int().positive(),
  throttleLimit: z.number().int().positive(),
  throttleWindowMs: z.number().int().positive(),
  deliveryChannels: z.array(z.nativeEnum(NotificationDeliveryChannel)),
  templateCategory: z.nativeEnum(NotificationTemplateCategory),
  requiredPayloadFields: z.array(z.string()),
  forbiddenPayloadFields: z.array(z.string()),
});

export type AuthSecurityNotificationContract = z.infer<
  typeof authSecurityNotificationContractSchema
>;

export const AUTH_SECURITY_NOTIFICATION_CONTRACTS: AuthSecurityNotificationContract[] = [
  {
    eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
    version: 1,
    severity: AuthSecuritySeverity.MEDIUM,
    mandatoryNotification: false,
    dedupeWindowMs: 60 * 1000,
    throttleLimit: 3,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL],
    templateCategory: NotificationTemplateCategory.PASSWORD_RESET,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'resetToken',
      'accessToken',
      'refreshToken',
      'mfaSecret',
    ],
  },
  {
    eventType: AuthSecurityEventType.PASSWORD_CHANGED,
    version: 1,
    severity: AuthSecuritySeverity.HIGH,
    mandatoryNotification: true,
    dedupeWindowMs: 0,
    throttleLimit: 10,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.PASSWORD_CHANGED,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'resetToken',
      'accessToken',
      'refreshToken',
      'mfaSecret',
    ],
  },
  {
    eventType: AuthSecurityEventType.ACCOUNT_LOCKED,
    version: 1,
    severity: AuthSecuritySeverity.CRITICAL,
    mandatoryNotification: true,
    dedupeWindowMs: 0,
    throttleLimit: 1,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.ACCOUNT_LOCKED,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp', 'riskContext'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'resetToken',
      'accessToken',
      'refreshToken',
      'mfaSecret',
    ],
  },
  {
    eventType: AuthSecurityEventType.ACCOUNT_UNLOCKED,
    version: 1,
    severity: AuthSecuritySeverity.MEDIUM,
    mandatoryNotification: true,
    dedupeWindowMs: 0,
    throttleLimit: 1,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.ACCOUNT_UNLOCKED,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'resetToken',
      'accessToken',
      'refreshToken',
      'mfaSecret',
    ],
  },
  {
    eventType: AuthSecurityEventType.NEW_DEVICE_SESSION,
    version: 1,
    severity: AuthSecuritySeverity.HIGH,
    mandatoryNotification: true,
    dedupeWindowMs: 24 * 60 * 60 * 1000,
    throttleLimit: 5,
    throttleWindowMs: 24 * 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.NEW_DEVICE_SESSION,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp', 'riskContext'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'sessionToken',
      'mfaSecret',
    ],
  },
  {
    eventType: AuthSecurityEventType.MFA_ENABLED,
    version: 1,
    severity: AuthSecuritySeverity.HIGH,
    mandatoryNotification: true,
    dedupeWindowMs: 0,
    throttleLimit: 1,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.MFA_ENABLED,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'mfaSecret',
      'mfaBackupCodes',
    ],
  },
  {
    eventType: AuthSecurityEventType.MFA_DISABLED,
    version: 1,
    severity: AuthSecuritySeverity.HIGH,
    mandatoryNotification: true,
    dedupeWindowMs: 0,
    throttleLimit: 1,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.MFA_DISABLED,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'mfaSecret',
      'mfaBackupCodes',
    ],
  },
  {
    eventType: AuthSecurityEventType.MFA_RECOVERY_CODES_USED,
    version: 1,
    severity: AuthSecuritySeverity.CRITICAL,
    mandatoryNotification: true,
    dedupeWindowMs: 0,
    throttleLimit: 1,
    throttleWindowMs: 60 * 60 * 1000,
    deliveryChannels: [NotificationDeliveryChannel.EMAIL, NotificationDeliveryChannel.IN_APP],
    templateCategory: NotificationTemplateCategory.MFA_RECOVERY_CODES_USED,
    requiredPayloadFields: ['tenantId', 'userId', 'email', 'timestamp', 'riskContext'],
    forbiddenPayloadFields: [
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'mfaSecret',
      'mfaBackupCodes',
    ],
  },
];

export const AUTH_SECURITY_EVENT_CONTRACT_MAP = AUTH_SECURITY_NOTIFICATION_CONTRACTS.reduce(
  (acc, contract) => {
    acc[contract.eventType] = contract;
    return acc;
  },
  {} as Record<AuthSecurityEventType, AuthSecurityNotificationContract>,
);

export const AUTH_SECURITY_FORBIDDEN_FIELDS = [
  'password',
  'passwordHash',
  'passwordSalt',
  'resetToken',
  'accessToken',
  'refreshToken',
  'token',
  'mfaSecret',
  'mfaCode',
  'mfaBackupCodes',
  'cookies',
  'sessionToken',
] as const;

export type AuthSecurityForbiddenField = (typeof AUTH_SECURITY_FORBIDDEN_FIELDS)[number];

export interface NotificationDeliveryLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  eventType: AuthSecurityEventType;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  sentAt?: Date;
  suppressedReason?: 'dedupe' | 'rate_limit' | 'user_preference';
  failureReason?: string;
  templateCategory: NotificationTemplateCategory;
  requestId?: string;
  correlationId?: string;
}

export const notificationDeliveryLogSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  userId: z.string(),
  eventType: z.nativeEnum(AuthSecurityEventType),
  channel: z.nativeEnum(NotificationDeliveryChannel),
  status: z.nativeEnum(NotificationDeliveryStatus),
  sentAt: z.date().optional(),
  suppressedReason: z.enum(['dedupe', 'rate_limit', 'user_preference']).optional(),
  failureReason: z.string().optional(),
  templateCategory: z.nativeEnum(NotificationTemplateCategory),
  requestId: z.string().optional(),
  correlationId: z.string().optional(),
});

export type NotificationDeliveryLog = z.infer<typeof notificationDeliveryLogSchema>;

export interface UserNotificationPreferences {
  userId: string;
  tenantId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  securityEmailEnabled: boolean;
  securityInAppEnabled: boolean;
}

export const userNotificationPreferencesSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  securityEmailEnabled: z.boolean(),
  securityInAppEnabled: z.boolean(),
});

export type UserNotificationPreferencesInput = z.infer<typeof userNotificationPreferencesSchema>;

export const getContractForEvent = (
  eventType: AuthSecurityEventType,
): AuthSecurityNotificationContract | undefined => {
  return AUTH_SECURITY_EVENT_CONTRACT_MAP[eventType];
};

export const isMandatoryNotification = (eventType: AuthSecurityEventType): boolean => {
  const contract = AUTH_SECURITY_EVENT_CONTRACT_MAP[eventType];
  return contract?.mandatoryNotification ?? false;
};

export const getSeverityForEvent = (
  eventType: AuthSecurityEventType,
): AuthSecuritySeverity | undefined => {
  return AUTH_SECURITY_EVENT_CONTRACT_MAP[eventType]?.severity;
};
