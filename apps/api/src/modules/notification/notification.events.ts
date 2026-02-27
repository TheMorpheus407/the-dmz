import { AuthSecurityEventType } from '@the-dmz/shared/contracts';

// eslint-disable-next-line import-x/no-restricted-paths
import { AUTH_EVENTS } from '../auth/auth.events.js';

import { notificationService } from './notification.service.js';

import type { DomainEvent } from '../../shared/events/event-types.js';
import type { NotificationSendOptions } from './notification.types.js';

const EVENT_TYPE_TO_SECURITY_TYPE_MAP: Record<string, AuthSecurityEventType> = {
  [AUTH_EVENTS.PASSWORD_RESET_REQUESTED]: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
  [AUTH_EVENTS.PASSWORD_RESET_COMPLETED]: AuthSecurityEventType.PASSWORD_CHANGED,
  [AUTH_EVENTS.ACCOUNT_LOCKED]: AuthSecurityEventType.ACCOUNT_LOCKED,
  [AUTH_EVENTS.ACCOUNT_UNLOCKED]: AuthSecurityEventType.ACCOUNT_UNLOCKED,
  [AUTH_EVENTS.NEW_DEVICE_SESSION]: AuthSecurityEventType.NEW_DEVICE_SESSION,
  [AUTH_EVENTS.MFA_ENABLED]: AuthSecurityEventType.MFA_ENABLED,
  [AUTH_EVENTS.MFA_DISABLED]: AuthSecurityEventType.MFA_DISABLED,
  [AUTH_EVENTS.MFA_RECOVERY_CODES_USED]: AuthSecurityEventType.MFA_RECOVERY_CODES_USED,
};

const getTemplateData = (
  eventType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const baseData = {
    userId: payload['userId'],
    email: payload['email'],
    tenantId: payload['tenantId'],
    timestamp: new Date().toISOString(),
  };

  switch (eventType) {
    case AUTH_EVENTS.PASSWORD_RESET_REQUESTED: {
      const requestId = payload['requestId'];
      return {
        ...baseData,
        ...(requestId !== undefined && { requestId }),
      };
    }
    case AUTH_EVENTS.PASSWORD_RESET_COMPLETED: {
      const sessionsRevoked = payload['sessionsRevoked'];
      return {
        ...baseData,
        ...(sessionsRevoked !== undefined && { sessionsRevoked }),
      };
    }
    case AUTH_EVENTS.ACCOUNT_LOCKED: {
      const reason = payload['reason'];
      const riskContext = payload['riskContext'];
      return {
        ...baseData,
        ...(reason !== undefined && { reason }),
        ...(riskContext !== undefined && { riskContext }),
      };
    }
    case AUTH_EVENTS.ACCOUNT_UNLOCKED: {
      const reason = payload['reason'];
      return {
        ...baseData,
        ...(reason !== undefined && { reason }),
      };
    }
    case AUTH_EVENTS.NEW_DEVICE_SESSION: {
      const sessionId = payload['sessionId'];
      const riskContext = payload['riskContext'];
      return {
        ...baseData,
        sessionId,
        ...(riskContext !== undefined && { riskContext }),
      };
    }
    case AUTH_EVENTS.MFA_ENABLED: {
      const method = payload['method'];
      return {
        ...baseData,
        ...(method !== undefined && { method }),
      };
    }
    case AUTH_EVENTS.MFA_DISABLED: {
      const reason = payload['reason'];
      return {
        ...baseData,
        ...(reason !== undefined && { reason }),
      };
    }
    case AUTH_EVENTS.MFA_RECOVERY_CODES_USED: {
      const riskContext = payload['riskContext'];
      return {
        ...baseData,
        ...(riskContext !== undefined && { riskContext }),
      };
    }
    default:
      return baseData;
  }
};

export const handleAuthSecurityEvent = async (
  event: DomainEvent<Record<string, unknown>>,
): Promise<void> => {
  const securityEventType = EVENT_TYPE_TO_SECURITY_TYPE_MAP[event.eventType];

  if (!securityEventType) {
    return;
  }

  const payload = event.payload;

  const userId = payload['userId'] as string | undefined;
  const email = payload['email'] as string | undefined;
  const tenantId = payload['tenantId'] as string | undefined;

  if (!userId || !email || !tenantId) {
    console.warn('Security event missing required fields', {
      eventType: event.eventType,
      userId,
      email,
      tenantId,
    });
    return;
  }

  const correlationId = event.correlationId;
  const requestId = payload['requestId'] as string | undefined;

  const options: NotificationSendOptions = {
    userId,
    tenantId,
    email,
    eventType: securityEventType,
    templateData: getTemplateData(event.eventType, payload),
    correlationId,
    ...(requestId !== undefined && { requestId }),
  };

  await notificationService.sendSecurityNotification(options);
};

export const notificationEventHandlers: Array<{
  eventType: string;
  handler: (event: DomainEvent<Record<string, unknown>>) => Promise<void>;
}> = [
  { eventType: AUTH_EVENTS.PASSWORD_RESET_REQUESTED, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.PASSWORD_RESET_COMPLETED, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.ACCOUNT_LOCKED, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.ACCOUNT_UNLOCKED, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.NEW_DEVICE_SESSION, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.MFA_ENABLED, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.MFA_DISABLED, handler: handleAuthSecurityEvent },
  { eventType: AUTH_EVENTS.MFA_RECOVERY_CODES_USED, handler: handleAuthSecurityEvent },
];
