import { describe, expect, it, beforeEach } from 'vitest';

import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationTemplateCategory,
} from '@the-dmz/shared/contracts';

import { DeliveryLogger } from '../delivery-logger.js';

const TEMPLATE_CATEGORY = NotificationTemplateCategory.AUTH_SECURITY;

describe('DeliveryLogger', () => {
  let logger: DeliveryLogger;

  beforeEach(() => {
    logger = new DeliveryLogger();
  });

  describe('log', () => {
    it('adds entry to delivery log', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        sentAt: new Date(),
        templateCategory: TEMPLATE_CATEGORY,
      });

      const log = logger.getLog();
      expect(log).toHaveLength(1);
      expect(log[0].userId).toBe('user-1');
      expect(log[0].status).toBe(NotificationDeliveryStatus.SENT);
    });

    it('generates unique IDs for each entry', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      const log = logger.getLog();
      expect(log[0].id).not.toBe(log[1].id);
    });

    it('logs rate limited status', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.RATE_LIMITED,
        suppressedReason: 'rate_limit',
        templateCategory: TEMPLATE_CATEGORY,
      });

      const log = logger.getLog();
      expect(log[0].status).toBe(NotificationDeliveryStatus.RATE_LIMITED);
      expect(log[0].suppressedReason).toBe('rate_limit');
    });

    it('logs deduplicated status', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SUPPRESSED_DEDUPE,
        suppressedReason: 'dedupe',
        templateCategory: TEMPLATE_CATEGORY,
      });

      const log = logger.getLog();
      expect(log[0].status).toBe(NotificationDeliveryStatus.SUPPRESSED_DEDUPE);
      expect(log[0].suppressedReason).toBe('dedupe');
    });

    it('logs failed status with failure reason', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.FAILED,
        failureReason: 'SMTP connection timeout',
        templateCategory: TEMPLATE_CATEGORY,
      });

      const log = logger.getLog();
      expect(log[0].status).toBe(NotificationDeliveryStatus.FAILED);
      expect(log[0].failureReason).toBe('SMTP connection timeout');
    });
  });

  describe('getLog', () => {
    it('returns empty array initially', () => {
      expect(logger.getLog()).toHaveLength(0);
    });

    it('returns all logged entries', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-2',
        eventType: 'ACCOUNT_LOCKED',
        channel: NotificationDeliveryChannel.SMS,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      const log = logger.getLog();
      expect(log).toHaveLength(2);
    });

    it('returns readonly array', () => {
      const log = logger.getLog();
      expect(Array.isArray(log)).toBe(true);
      expect(log).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      logger.clear();

      expect(logger.getLog()).toHaveLength(0);
    });

    it('allows new entries after clear', () => {
      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      logger.clear();

      logger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        eventType: 'PASSWORD_RESET_REQUESTED',
        channel: NotificationDeliveryChannel.EMAIL,
        status: NotificationDeliveryStatus.SENT,
        templateCategory: TEMPLATE_CATEGORY,
      });

      expect(logger.getLog()).toHaveLength(1);
    });
  });
});
