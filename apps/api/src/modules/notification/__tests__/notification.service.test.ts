import { describe, expect, it, beforeEach } from 'vitest';

import {
  AuthSecurityEventType,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
} from '@the-dmz/shared/contracts';

import { NotificationService } from '../notification.service.js';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  describe('sendSecurityNotification', () => {
    it('sends notification successfully for mandatory event', async () => {
      const result = await service.sendSecurityNotification({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        eventType: AuthSecurityEventType.ACCOUNT_LOCKED,
        templateData: { reason: 'Too many failed attempts' },
        correlationId: 'corr-1',
      });

      expect(result).toHaveLength(2);
      const emailResult = result.find((r) => r.channel === NotificationDeliveryChannel.EMAIL);
      const inAppResult = result.find((r) => r.channel === NotificationDeliveryChannel.IN_APP);

      expect(emailResult?.status).toBe(NotificationDeliveryStatus.SENT);
      expect(inAppResult?.status).toBe(NotificationDeliveryStatus.SENT);
    });

    it('sends notification for non-mandatory event with dedupe', async () => {
      await service.sendSecurityNotification({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-1',
      });

      const result = await service.sendSecurityNotification({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-2',
      });

      expect(result[0]?.status).toBe(NotificationDeliveryStatus.SUPPRESSED_DEDUPE);
    });

    it('sends to different users independently for dedupe', async () => {
      await service.sendSecurityNotification({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'user1@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-1',
      });

      const result = await service.sendSecurityNotification({
        userId: 'user-2',
        tenantId: 'tenant-1',
        email: 'user2@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-2',
      });

      expect(result[0]?.status).toBe(NotificationDeliveryStatus.SENT);
    });

    it('respects throttle limits', async () => {
      service.clearThrottleStore();
      service.clearDedupeStore();

      for (let i = 0; i < 3; i++) {
        await service.sendSecurityNotification({
          userId: 'user-throttle',
          tenantId: 'tenant-1',
          email: 'throttle@example.com',
          eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
          templateData: {},
          correlationId: `corr-${i}`,
        });
      }

      const result = await service.sendSecurityNotification({
        userId: 'user-throttle',
        tenantId: 'tenant-1',
        email: 'throttle@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-4',
      });

      expect(result[0]?.status).toBe(NotificationDeliveryStatus.RATE_LIMITED);
    });

    it('returns failed status for unknown event type', async () => {
      const result = await service.sendSecurityNotification({
        userId: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        eventType: 'unknown_event' as AuthSecurityEventType,
        templateData: {},
      });

      expect(result[0]?.status).toBe(NotificationDeliveryStatus.FAILED);
      expect(result[0]?.error).toContain('Unknown event type');
    });

    it('logs delivery results', async () => {
      await service.sendSecurityNotification({
        userId: 'user-log',
        tenantId: 'tenant-1',
        email: 'log@example.com',
        eventType: AuthSecurityEventType.ACCOUNT_LOCKED,
        templateData: {},
        correlationId: 'corr-log',
      });

      const log = service.getDeliveryLog();
      expect(log.length).toBeGreaterThan(0);

      const accountLockedLog = log.filter(
        (entry) => entry.eventType === AuthSecurityEventType.ACCOUNT_LOCKED,
      );
      expect(accountLockedLog.length).toBe(2);
    });
  });

  describe('clearDedupeStore', () => {
    it('clears dedupe store and allows sending again', async () => {
      await service.sendSecurityNotification({
        userId: 'user-clear',
        tenantId: 'tenant-1',
        email: 'clear@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-1',
      });

      service.clearDedupeStore();

      const result = await service.sendSecurityNotification({
        userId: 'user-clear',
        tenantId: 'tenant-1',
        email: 'clear@example.com',
        eventType: AuthSecurityEventType.PASSWORD_RESET_REQUESTED,
        templateData: {},
        correlationId: 'corr-2',
      });

      expect(result[0]?.status).toBe(NotificationDeliveryStatus.SENT);
    });
  });

  describe('mandatory notifications', () => {
    it('does not apply dedupe to mandatory notifications', async () => {
      await service.sendSecurityNotification({
        userId: 'user-mandatory',
        tenantId: 'tenant-1',
        email: 'mandatory@example.com',
        eventType: AuthSecurityEventType.ACCOUNT_LOCKED,
        templateData: {},
        correlationId: 'corr-1',
      });

      const result = await service.sendSecurityNotification({
        userId: 'user-mandatory',
        tenantId: 'tenant-1',
        email: 'mandatory@example.com',
        eventType: AuthSecurityEventType.ACCOUNT_LOCKED,
        templateData: {},
        correlationId: 'corr-2',
      });

      expect(result[0]?.status).toBe(NotificationDeliveryStatus.SENT);
    });
  });
});
