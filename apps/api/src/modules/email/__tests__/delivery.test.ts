import { describe, it, expect, beforeEach } from 'vitest';

import { deliveryService, DeliveryStatus, BounceType, ComplaintType } from '../delivery.service.js';

describe('deliveryService', () => {
  beforeEach(async () => {
    await deliveryService.resetAllRecords();
  });

  describe('createRecord', () => {
    it('should create a delivery record', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      expect(record.id).toBeDefined();
      expect(record.status).toBe(DeliveryStatus.PENDING);
      expect(record.tenantId).toBe('tenant-1');
    });
  });

  describe('recordSent', () => {
    it('should update status to sent', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordSent(record.id, 'msg-123');

      expect(updated?.status).toBe(DeliveryStatus.SENT);
      expect(updated?.sentAt).toBeDefined();
    });
  });

  describe('recordDelivered', () => {
    it('should update status to delivered', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordDelivered(record.id);

      expect(updated?.status).toBe(DeliveryStatus.DELIVERED);
      expect(updated?.deliveredAt).toBeDefined();
    });
  });

  describe('recordBounced', () => {
    it('should update status to bounced with type', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordBounced(
        record.id,
        BounceType.HARD,
        'User unknown',
      );

      expect(updated?.status).toBe(DeliveryStatus.BOUNCED);
      expect(updated?.bouncedType).toBe(BounceType.HARD);
      expect(updated?.bouncedReason).toBe('User unknown');
    });
  });

  describe('recordComplaint', () => {
    it('should update status to complained', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordComplaint(record.id, ComplaintType.SPAM);

      expect(updated?.status).toBe(DeliveryStatus.COMPLAINED);
      expect(updated?.complaintType).toBe(ComplaintType.SPAM);
    });
  });

  describe('recordOpened', () => {
    it('should update status to opened', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordOpened(record.id);

      expect(updated?.status).toBe(DeliveryStatus.OPENED);
      expect(updated?.openedAt).toBeDefined();
    });
  });

  describe('recordClicked', () => {
    it('should update status to clicked', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordClicked(record.id);

      expect(updated?.status).toBe(DeliveryStatus.CLICKED);
      expect(updated?.clickedAt).toBeDefined();
    });
  });

  describe('recordFailed', () => {
    it('should update status to failed', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordFailed(record.id, 'SMTP error');

      expect(updated?.status).toBe(DeliveryStatus.FAILED);
      expect(updated?.failureReason).toBe('SMTP error');
    });
  });

  describe('getStats', () => {
    it('should return stats for tenant', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-tenant',
        integrationId: 'int-stats',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-1');

      const stats = await deliveryService.getStats('stats-tenant');

      expect(stats.totalSent).toBe(1);
    });
  });

  describe('webhook event queue', () => {
    it('should queue webhook events', () => {
      deliveryService.queueWebhookEvent({
        eventType: 'delivered',
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-123',
        recipientEmail: 'test@example.com',
        metadata: {},
      });

      const events = deliveryService.getQueuedWebhookEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('delivered');
    });

    it('should clear webhook event queue', () => {
      deliveryService.queueWebhookEvent({
        eventType: 'delivered',
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-123',
        recipientEmail: 'test@example.com',
        metadata: {},
      });

      deliveryService.clearWebhookEventQueue();

      expect(deliveryService.getQueuedWebhookEvents()).toHaveLength(0);
    });
  });
});
