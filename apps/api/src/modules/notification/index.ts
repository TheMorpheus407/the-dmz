export { notificationService, isSecurityEventMandatory } from './notification.service.js';

export { handleAuthSecurityEvent, notificationEventHandlers } from './notification.events.js';

export type {
  NotificationSendOptions,
  NotificationDeliveryResult,
  DedupeEntry,
  ThrottleEntry,
} from './notification.types.js';

export {
  AuthSecurityEventType,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationTemplateCategory,
  userNotificationPreferencesSchema,
} from '@the-dmz/shared/contracts';

export type {
  UserNotificationPreferencesInput,
  AuthSecurityEventPayload,
} from '@the-dmz/shared/contracts';
