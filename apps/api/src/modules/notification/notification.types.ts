import {
  AuthSecurityEventType,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationTemplateCategory,
  userNotificationPreferencesSchema,
} from '@the-dmz/shared/contracts';
import type {
  UserNotificationPreferencesInput,
  AuthSecurityEventPayload,
} from '@the-dmz/shared/contracts';

export {
  AuthSecurityEventType,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationTemplateCategory,
  userNotificationPreferencesSchema,
};

export type { UserNotificationPreferencesInput, AuthSecurityEventPayload };

export interface NotificationSendOptions {
  userId: string;
  tenantId: string;
  email: string;
  eventType: AuthSecurityEventType;
  templateData: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  error?: string;
}

export interface DedupeEntry {
  userId: string;
  eventType: AuthSecurityEventType;
  lastSentAt: Date;
}

export interface ThrottleEntry {
  userId: string;
  eventType: AuthSecurityEventType;
  count: number;
  windowStart: Date;
}

export interface DeliveryLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  eventType: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  sentAt?: Date;
  suppressedReason?: string;
  failureReason?: string;
  templateCategory: NotificationTemplateCategory;
  correlationId?: string;
}
