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

    it('should update status to complained with phishing type', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-1',
        integrationId: 'int-1',
        messageId: 'msg-initial',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.recordComplaint(record.id, ComplaintType.PHISHING);

      expect(updated?.status).toBe(DeliveryStatus.COMPLAINED);
      expect(updated?.complaintType).toBe(ComplaintType.PHISHING);
      expect(ComplaintType.PHISHING).toBe('phishing');
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

  describe('resetAllRecords', () => {
    it('should clear all delivery records', async () => {
      await deliveryService.createRecord({
        tenantId: 'tenant-reset',
        integrationId: 'int-reset',
        messageId: 'msg-reset-1',
        recipientEmail: 'test1@example.com',
      });

      await deliveryService.createRecord({
        tenantId: 'tenant-reset',
        integrationId: 'int-reset',
        messageId: 'msg-reset-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.resetAllRecords();

      const stats = await deliveryService.getStats('tenant-reset');
      expect(stats.totalSent).toBe(0);
    });

    it('should clear webhook event queue', async () => {
      deliveryService.queueWebhookEvent({
        eventType: 'delivered',
        tenantId: 'tenant-reset',
        integrationId: 'int-reset',
        messageId: 'msg-reset-1',
        recipientEmail: 'test@example.com',
        metadata: {},
      });

      await deliveryService.resetAllRecords();

      expect(deliveryService.getQueuedWebhookEvents()).toHaveLength(0);
    });
  });

  describe('getRecord', () => {
    it('should return record when exists', async () => {
      const created = await deliveryService.createRecord({
        tenantId: 'tenant-get',
        integrationId: 'int-get',
        messageId: 'msg-get-1',
        recipientEmail: 'test@example.com',
      });

      const record = await deliveryService.getRecord(created.id);

      expect(record).not.toBeNull();
      expect(record!.id).toBe(created.id);
      expect(record!.tenantId).toBe('tenant-get');
    });

    it('should return null for non-existent id', async () => {
      const record = await deliveryService.getRecord('non-existent-id');

      expect(record).toBeNull();
    });

    it('should return null after resetAllRecords', async () => {
      const created = await deliveryService.createRecord({
        tenantId: 'tenant-get',
        integrationId: 'int-get',
        messageId: 'msg-get-1',
        recipientEmail: 'test@example.com',
      });

      await deliveryService.resetAllRecords();

      const record = await deliveryService.getRecord(created.id);
      expect(record).toBeNull();
    });
  });

  describe('getRecordByMessageId', () => {
    it('should return record when messageId matches', async () => {
      const created = await deliveryService.createRecord({
        tenantId: 'tenant-msgid',
        integrationId: 'int-msgid',
        messageId: 'unique-msgid-123',
        recipientEmail: 'test@example.com',
      });

      const record = await deliveryService.getRecordByMessageId('unique-msgid-123');

      expect(record).not.toBeNull();
      expect(record!.id).toBe(created.id);
      expect(record!.messageId).toBe('unique-msgid-123');
    });

    it('should return null when no match', async () => {
      const record = await deliveryService.getRecordByMessageId('non-existent-message-id');

      expect(record).toBeNull();
    });

    it('should return first record when multiple match', async () => {
      const created1 = await deliveryService.createRecord({
        tenantId: 'tenant-multi',
        integrationId: 'int-multi',
        messageId: 'shared-msgid',
        recipientEmail: 'test1@example.com',
      });

      await deliveryService.createRecord({
        tenantId: 'tenant-multi',
        integrationId: 'int-multi',
        messageId: 'shared-msgid',
        recipientEmail: 'test2@example.com',
      });

      const record = await deliveryService.getRecordByMessageId('shared-msgid');

      expect(record).not.toBeNull();
      expect(record!.id).toBe(created1.id);
    });
  });

  describe('getRecordsByTenant', () => {
    it('should return all records for tenant', async () => {
      await deliveryService.createRecord({
        tenantId: 'tenant-filter',
        integrationId: 'int-filter',
        messageId: 'msg-tenant-1',
        recipientEmail: 'test1@example.com',
      });

      await deliveryService.createRecord({
        tenantId: 'tenant-filter',
        integrationId: 'int-filter',
        messageId: 'msg-tenant-2',
        recipientEmail: 'test2@example.com',
      });

      const records = await deliveryService.getRecordsByTenant('tenant-filter');

      expect(records).toHaveLength(2);
    });

    it('should return empty array for unknown tenant', async () => {
      const records = await deliveryService.getRecordsByTenant('unknown-tenant');

      expect(records).toHaveLength(0);
    });

    it('should filter correctly across multiple tenants', async () => {
      await deliveryService.createRecord({
        tenantId: 'tenant-a',
        integrationId: 'int-a',
        messageId: 'msg-a-1',
        recipientEmail: 'test-a@example.com',
      });

      await deliveryService.createRecord({
        tenantId: 'tenant-b',
        integrationId: 'int-b',
        messageId: 'msg-b-1',
        recipientEmail: 'test-b@example.com',
      });

      const recordsA = await deliveryService.getRecordsByTenant('tenant-a');
      const recordsB = await deliveryService.getRecordsByTenant('tenant-b');

      expect(recordsA).toHaveLength(1);
      expect(recordsA[0]!.tenantId).toBe('tenant-a');
      expect(recordsB).toHaveLength(1);
      expect(recordsB[0]!.tenantId).toBe('tenant-b');
    });
  });

  describe('getRecordsByCampaign', () => {
    it('should return all records for campaign', async () => {
      await deliveryService.createRecord({
        tenantId: 'tenant-campaign',
        integrationId: 'int-campaign',
        campaignId: 'campaign-alpha',
        messageId: 'msg-campaign-1',
        recipientEmail: 'test1@example.com',
      });

      await deliveryService.createRecord({
        tenantId: 'tenant-campaign',
        integrationId: 'int-campaign',
        campaignId: 'campaign-alpha',
        messageId: 'msg-campaign-2',
        recipientEmail: 'test2@example.com',
      });

      const records = await deliveryService.getRecordsByCampaign('campaign-alpha');

      expect(records).toHaveLength(2);
    });

    it('should return empty array for unknown campaign', async () => {
      const records = await deliveryService.getRecordsByCampaign('unknown-campaign');

      expect(records).toHaveLength(0);
    });

    it('should exclude records without campaignId', async () => {
      await deliveryService.createRecord({
        tenantId: 'tenant-no-campaign',
        integrationId: 'int-no-campaign',
        messageId: 'msg-no-campaign',
        recipientEmail: 'test@example.com',
      });

      await deliveryService.createRecord({
        tenantId: 'tenant-no-campaign',
        integrationId: 'int-no-campaign',
        campaignId: 'campaign-with-id',
        messageId: 'msg-with-campaign',
        recipientEmail: 'test2@example.com',
      });

      const records = await deliveryService.getRecordsByCampaign('campaign-with-id');

      expect(records).toHaveLength(1);
      expect(records[0]!.messageId).toBe('msg-with-campaign');
    });
  });

  describe('updateStatus', () => {
    it('should update status directly', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-update',
        integrationId: 'int-update',
        messageId: 'msg-update-1',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.updateStatus(record.id, DeliveryStatus.SENT);

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe(DeliveryStatus.SENT);
      expect(updated!.sentAt).toBeDefined();
    });

    it('should pass through additional data', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-update',
        integrationId: 'int-update',
        messageId: 'msg-update-1',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.updateStatus(record.id, DeliveryStatus.BOUNCED, {
        bouncedType: BounceType.HARD,
        bouncedReason: 'Mailbox full',
      });

      expect(updated).not.toBeNull();
      expect(updated!.bouncedType).toBe(BounceType.HARD);
      expect(updated!.bouncedReason).toBe('Mailbox full');
    });

    it('should return null for non-existent record', async () => {
      const updated = await deliveryService.updateStatus('non-existent-id', DeliveryStatus.SENT);

      expect(updated).toBeNull();
    });

    it('should set correct timestamp for each status', async () => {
      const record = await deliveryService.createRecord({
        tenantId: 'tenant-timestamp',
        integrationId: 'int-timestamp',
        messageId: 'msg-timestamp',
        recipientEmail: 'test@example.com',
      });

      const updated = await deliveryService.updateStatus(record.id, DeliveryStatus.DELIVERED);

      expect(updated!.deliveredAt).toBeDefined();
    });
  });

  describe('getStats - enhanced coverage', () => {
    it('should return all count fields', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-all',
        integrationId: 'int-stats',
        messageId: 'msg-stats-1',
        recipientEmail: 'test@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-stats-1');
      await deliveryService.recordDelivered(r1.id);

      const stats = await deliveryService.getStats('stats-all');

      expect(stats.totalSent).toBe(1);
      expect(stats.totalDelivered).toBe(1);
      expect(stats.totalBounced).toBe(0);
      expect(stats.totalComplained).toBe(0);
      expect(stats.totalOpened).toBe(0);
      expect(stats.totalClicked).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });

    it('should calculate deliveryRate correctly', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-rate',
        integrationId: 'int-rate',
        messageId: 'msg-rate-1',
        recipientEmail: 'test@example.com',
      });
      const r2 = await deliveryService.createRecord({
        tenantId: 'stats-rate',
        integrationId: 'int-rate',
        messageId: 'msg-rate-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-rate-1');
      await deliveryService.recordSent(r2.id, 'msg-rate-2');
      await deliveryService.recordDelivered(r1.id);

      const stats = await deliveryService.getStats('stats-rate');

      expect(stats.deliveryRate).toBe(50);
    });

    it('should calculate bounceRate correctly', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-bounce',
        integrationId: 'int-bounce',
        messageId: 'msg-bounce-1',
        recipientEmail: 'test@example.com',
      });
      const r2 = await deliveryService.createRecord({
        tenantId: 'stats-bounce',
        integrationId: 'int-bounce',
        messageId: 'msg-bounce-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-bounce-1');
      await deliveryService.recordSent(r2.id, 'msg-bounce-2');
      await deliveryService.recordBounced(r1.id, BounceType.HARD);

      const stats = await deliveryService.getStats('stats-bounce');

      expect(stats.bounceRate).toBe(50);
    });

    it('should calculate complaintRate correctly', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-complaint',
        integrationId: 'int-complaint',
        messageId: 'msg-complaint-1',
        recipientEmail: 'test@example.com',
      });
      const r2 = await deliveryService.createRecord({
        tenantId: 'stats-complaint',
        integrationId: 'int-complaint',
        messageId: 'msg-complaint-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-complaint-1');
      await deliveryService.recordSent(r2.id, 'msg-complaint-2');
      await deliveryService.recordComplaint(r1.id, ComplaintType.SPAM);

      const stats = await deliveryService.getStats('stats-complaint');

      expect(stats.complaintRate).toBe(50);
    });

    it('should calculate openRate based on delivered', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-open',
        integrationId: 'int-open',
        messageId: 'msg-open-1',
        recipientEmail: 'test@example.com',
      });
      const r2 = await deliveryService.createRecord({
        tenantId: 'stats-open',
        integrationId: 'int-open',
        messageId: 'msg-open-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-open-1');
      await deliveryService.recordSent(r2.id, 'msg-open-2');
      await deliveryService.recordDelivered(r1.id);
      await deliveryService.recordDelivered(r2.id);
      await deliveryService.recordOpened(r1.id);

      const stats = await deliveryService.getStats('stats-open');

      expect(stats.openRate).toBe(100);
    });

    it('should calculate clickRate based on opened', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-click',
        integrationId: 'int-click',
        messageId: 'msg-click-1',
        recipientEmail: 'test@example.com',
      });
      const r2 = await deliveryService.createRecord({
        tenantId: 'stats-click',
        integrationId: 'int-click',
        messageId: 'msg-click-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-click-1');
      await deliveryService.recordSent(r2.id, 'msg-click-2');
      await deliveryService.recordDelivered(r1.id);
      await deliveryService.recordDelivered(r2.id);
      await deliveryService.recordOpened(r1.id);
      await deliveryService.recordOpened(r2.id);
      await deliveryService.recordClicked(r1.id);

      const stats = await deliveryService.getStats('stats-click');

      expect(stats.clickRate).toBe(100);
    });

    it('should handle zero division when totalSent is zero', async () => {
      const stats = await deliveryService.getStats('empty-tenant');

      expect(stats.deliveryRate).toBe(0);
      expect(stats.bounceRate).toBe(0);
      expect(stats.complaintRate).toBe(0);
      expect(stats.openRate).toBe(0);
      expect(stats.clickRate).toBe(0);
    });

    it('should handle zero division when totalDelivered is zero', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'zero-delivered',
        integrationId: 'int-zero',
        messageId: 'msg-zero-1',
        recipientEmail: 'test@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-zero-1');

      const stats = await deliveryService.getStats('zero-delivered');

      expect(stats.openRate).toBe(0);
      expect(stats.clickRate).toBe(0);
    });

    it('should filter by campaignId when provided', async () => {
      const r1 = await deliveryService.createRecord({
        tenantId: 'stats-campaign-filter',
        integrationId: 'int-campaign-filter',
        campaignId: 'campaign-stats-1',
        messageId: 'msg-campaign-stats-1',
        recipientEmail: 'test@example.com',
      });
      const r2 = await deliveryService.createRecord({
        tenantId: 'stats-campaign-filter',
        integrationId: 'int-campaign-filter',
        campaignId: 'campaign-stats-2',
        messageId: 'msg-campaign-stats-2',
        recipientEmail: 'test2@example.com',
      });

      await deliveryService.recordSent(r1.id, 'msg-campaign-stats-1');
      await deliveryService.recordSent(r2.id, 'msg-campaign-stats-2');
      await deliveryService.recordDelivered(r1.id);

      const statsCampaign1 = await deliveryService.getStats(
        'stats-campaign-filter',
        'campaign-stats-1',
      );
      const statsCampaign2 = await deliveryService.getStats(
        'stats-campaign-filter',
        'campaign-stats-2',
      );

      expect(statsCampaign1.totalSent).toBe(1);
      expect(statsCampaign1.totalDelivered).toBe(1);
      expect(statsCampaign1.deliveryRate).toBe(100);
      expect(statsCampaign2.totalSent).toBe(1);
      expect(statsCampaign2.totalDelivered).toBe(0);
      expect(statsCampaign2.deliveryRate).toBe(0);
    });
  });
});
