import { randomUUID } from 'crypto';

import type {
  DeliveryLogEntry,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationTemplateCategory,
} from './notification.types.js';

export interface LogEntryInput {
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

export class DeliveryLogger {
  private deliveryLog: DeliveryLogEntry[] = [];

  log(entry: LogEntryInput): void {
    const logEntry: DeliveryLogEntry = {
      id: randomUUID(),
      ...entry,
    };
    this.deliveryLog.push(logEntry);
  }

  getLog(): ReadonlyArray<DeliveryLogEntry> {
    return this.deliveryLog;
  }

  clear(): void {
    this.deliveryLog = [];
  }
}
