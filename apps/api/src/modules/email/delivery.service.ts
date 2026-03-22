export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  OPENED = 'opened',
  CLICKED = 'clicked',
  UNSUBSCRIBED = 'unsubscribed',
  FAILED = 'failed',
}

export enum BounceType {
  HARD = 'hard',
  SOFT = 'soft',
  BLOCKED = 'blocked',
}

export enum ComplaintType {
  SPAM = 'spam',
  ABUSE = 'abuse',
  PHISHING = 'phishing',
}

export interface EmailDeliveryRecord {
  id: string;
  tenantId: string;
  integrationId: string;
  campaignId?: string;
  messageId: string;
  recipientEmail: string;
  status: DeliveryStatus;
  sentAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  bouncedType?: BounceType;
  bouncedReason?: string;
  complainedAt?: string;
  complaintType?: ComplaintType;
  openedAt?: string;
  clickedAt?: string;
  unsubscribedAt?: string;
  failedAt?: string;
  failureReason?: string;
  metadata: Record<string, unknown>;
}

export interface DeliveryWebhookEvent {
  eventId: string;
  eventType:
    | 'sent'
    | 'delivered'
    | 'bounced'
    | 'complained'
    | 'opened'
    | 'clicked'
    | 'unsubscribed'
    | 'failed';
  tenantId: string;
  integrationId: string;
  messageId: string;
  recipientEmail: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface DeliveryStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplained: number;
  totalOpened: number;
  totalClicked: number;
  totalFailed: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  openRate: number;
  clickRate: number;
}

const deliveryRecords = new Map<string, EmailDeliveryRecord>();
const webhookEventQueue: DeliveryWebhookEvent[] = [];

export const deliveryService = {
  async createRecord(
    record: Omit<EmailDeliveryRecord, 'id' | 'status' | 'metadata'>,
  ): Promise<EmailDeliveryRecord> {
    const id = crypto.randomUUID();
    const newRecord: EmailDeliveryRecord = {
      ...record,
      id,
      status: DeliveryStatus.PENDING,
      metadata: {},
    };
    deliveryRecords.set(id, newRecord);
    return newRecord;
  },

  async resetAllRecords(): Promise<void> {
    deliveryRecords.clear();
    webhookEventQueue.length = 0;
  },

  async getRecord(id: string): Promise<EmailDeliveryRecord | null> {
    return deliveryRecords.get(id) ?? null;
  },

  async getRecordByMessageId(messageId: string): Promise<EmailDeliveryRecord | null> {
    for (const record of deliveryRecords.values()) {
      if (record.messageId === messageId) {
        return record;
      }
    }
    return null;
  },

  async getRecordsByTenant(tenantId: string): Promise<EmailDeliveryRecord[]> {
    return Array.from(deliveryRecords.values()).filter((r) => r.tenantId === tenantId);
  },

  async getRecordsByCampaign(campaignId: string): Promise<EmailDeliveryRecord[]> {
    return Array.from(deliveryRecords.values()).filter((r) => r.campaignId === campaignId);
  },

  async updateStatus(
    id: string,
    status: DeliveryStatus,
    additionalData?: Partial<EmailDeliveryRecord>,
  ): Promise<EmailDeliveryRecord | null> {
    const record = deliveryRecords.get(id);
    if (!record) return null;

    const now = new Date().toISOString();
    const updates: Partial<EmailDeliveryRecord> = {
      status,
      ...additionalData,
    };

    switch (status) {
      case DeliveryStatus.SENT:
        updates.sentAt = now;
        break;
      case DeliveryStatus.DELIVERED:
        updates.deliveredAt = now;
        break;
      case DeliveryStatus.BOUNCED:
        updates.bouncedAt = now;
        break;
      case DeliveryStatus.COMPLAINED:
        updates.complainedAt = now;
        break;
      case DeliveryStatus.OPENED:
        updates.openedAt = now;
        break;
      case DeliveryStatus.CLICKED:
        updates.clickedAt = now;
        break;
      case DeliveryStatus.UNSUBSCRIBED:
        updates.unsubscribedAt = now;
        break;
      case DeliveryStatus.FAILED:
        updates.failedAt = now;
        break;
    }

    const updatedRecord: EmailDeliveryRecord = {
      ...record,
      ...updates,
    };

    deliveryRecords.set(id, updatedRecord);
    return updatedRecord;
  },

  async recordSent(id: string, messageId: string): Promise<EmailDeliveryRecord | null> {
    return this.updateStatus(id, DeliveryStatus.SENT, { messageId });
  },

  async recordDelivered(id: string): Promise<EmailDeliveryRecord | null> {
    return this.updateStatus(id, DeliveryStatus.DELIVERED);
  },

  async recordBounced(
    id: string,
    bounceType: BounceType,
    reason?: string,
  ): Promise<EmailDeliveryRecord | null> {
    const additionalData: Partial<EmailDeliveryRecord> = {
      bouncedType: bounceType,
    };
    if (reason !== undefined) {
      additionalData.bouncedReason = reason;
    }
    return this.updateStatus(id, DeliveryStatus.BOUNCED, additionalData);
  },

  async recordComplaint(
    id: string,
    complaintType: ComplaintType,
  ): Promise<EmailDeliveryRecord | null> {
    return this.updateStatus(id, DeliveryStatus.COMPLAINED, {
      complaintType,
    });
  },

  async recordOpened(id: string): Promise<EmailDeliveryRecord | null> {
    return this.updateStatus(id, DeliveryStatus.OPENED);
  },

  async recordClicked(id: string): Promise<EmailDeliveryRecord | null> {
    return this.updateStatus(id, DeliveryStatus.CLICKED);
  },

  async recordFailed(id: string, reason: string): Promise<EmailDeliveryRecord | null> {
    return this.updateStatus(id, DeliveryStatus.FAILED, {
      failureReason: reason,
    });
  },

  async getStats(tenantId: string, campaignId?: string): Promise<DeliveryStats> {
    const records = campaignId
      ? await this.getRecordsByCampaign(campaignId)
      : await this.getRecordsByTenant(tenantId);

    const totalSent = records.filter((r) => r.status !== DeliveryStatus.PENDING).length;
    const totalDelivered = records.filter((r) => r.status === DeliveryStatus.DELIVERED).length;
    const totalBounced = records.filter((r) => r.status === DeliveryStatus.BOUNCED).length;
    const totalComplained = records.filter((r) => r.status === DeliveryStatus.COMPLAINED).length;
    const totalOpened = records.filter((r) => r.status === DeliveryStatus.OPENED).length;
    const totalClicked = records.filter((r) => r.status === DeliveryStatus.CLICKED).length;
    const totalFailed = records.filter((r) => r.status === DeliveryStatus.FAILED).length;

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalComplained,
      totalOpened,
      totalClicked,
      totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
    };
  },

  queueWebhookEvent(event: Omit<DeliveryWebhookEvent, 'eventId' | 'timestamp'>): void {
    const webhookEvent: DeliveryWebhookEvent = {
      ...event,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    webhookEventQueue.push(webhookEvent);
  },

  getQueuedWebhookEvents(): DeliveryWebhookEvent[] {
    return [...webhookEventQueue];
  },

  clearWebhookEventQueue(): void {
    webhookEventQueue.length = 0;
  },
};
