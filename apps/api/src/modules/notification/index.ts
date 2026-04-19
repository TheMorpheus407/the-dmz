export { notificationService, isSecurityEventMandatory } from './notification.service.js';

export { handleAuthSecurityEvent, notificationEventHandlers } from './notification.events.js';

export { registerNotificationRoutes } from './notification.routes.js';

export * from './websocket/index.js';

export { DedupeStore } from './dedupe.store.js';
export { ThrottleStore } from './throttle.store.js';
export { DeliveryLogger } from './delivery-logger.js';
export type { LogEntryInput } from './delivery-logger.js';

export type {
  NotificationSendOptions,
  NotificationDeliveryResult,
  DedupeEntry,
  ThrottleEntry,
  DeliveryLogEntry,
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
