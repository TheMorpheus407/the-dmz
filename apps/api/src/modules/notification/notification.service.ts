import { randomUUID } from 'crypto';

import {
  type AuthSecurityEventType,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  type NotificationTemplateCategory,
  AUTH_SECURITY_EVENT_CONTRACT_MAP,
  isMandatoryNotification,
} from '@the-dmz/shared/contracts';

import type {
  NotificationSendOptions,
  NotificationDeliveryResult,
  DedupeEntry,
  ThrottleEntry,
} from './notification.types.js';

class DedupeStore {
  private store = new Map<string, DedupeEntry>();

  check(userId: string, eventType: AuthSecurityEventType, dedupeWindowMs: number): boolean {
    const key = `${userId}:${eventType}`;
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    const now = new Date();
    const timeSinceLastSent = now.getTime() - entry.lastSentAt.getTime();

    return timeSinceLastSent < dedupeWindowMs;
  }

  record(userId: string, eventType: AuthSecurityEventType): void {
    const key = `${userId}:${eventType}`;
    this.store.set(key, {
      userId,
      eventType,
      lastSentAt: new Date(),
    });
  }

  clear(): void {
    this.store.clear();
  }
}

class ThrottleStore {
  private store = new Map<string, ThrottleEntry>();

  check(
    userId: string,
    eventType: AuthSecurityEventType,
    throttleLimit: number,
    throttleWindowMs: number,
  ): boolean {
    const key = `${userId}:${eventType}`;
    const entry = this.store.get(key);

    if (!entry) {
      this.store.set(key, {
        userId,
        eventType,
        count: 1,
        windowStart: new Date(),
      });
      return false;
    }

    const now = new Date();
    const timeSinceWindowStart = now.getTime() - entry.windowStart.getTime();

    if (timeSinceWindowStart >= throttleWindowMs) {
      entry.count = 1;
      entry.windowStart = now;
      return false;
    }

    if (entry.count >= throttleLimit) {
      return true;
    }

    entry.count++;
    return false;
  }

  clear(): void {
    this.store.clear();
  }
}

interface DeliveryLogEntry {
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

export class NotificationService {
  private dedupeStore: DedupeStore;
  private throttleStore: ThrottleStore;
  private deliveryLog: DeliveryLogEntry[] = [];

  constructor() {
    this.dedupeStore = new DedupeStore();
    this.throttleStore = new ThrottleStore();
  }

  async sendSecurityNotification(
    options: NotificationSendOptions,
  ): Promise<NotificationDeliveryResult[]> {
    const contract = AUTH_SECURITY_EVENT_CONTRACT_MAP[options.eventType];

    if (!contract) {
      return [
        {
          success: false,
          channel: NotificationDeliveryChannel.EMAIL,
          status: NotificationDeliveryStatus.FAILED,
          error: `Unknown event type: ${options.eventType}`,
        },
      ];
    }

    const results: NotificationDeliveryResult[] = [];

    for (const channel of contract.deliveryChannels) {
      const result = await this.sendToChannel(
        options,
        channel,
        contract.dedupeWindowMs,
        contract.throttleLimit,
        contract.throttleWindowMs,
        contract.mandatoryNotification,
      );
      results.push(result);
    }

    return results;
  }

  private async sendToChannel(
    options: NotificationSendOptions,
    channel: NotificationDeliveryChannel,
    dedupeWindowMs: number,
    throttleLimit: number,
    throttleWindowMs: number,
    mandatoryNotification: boolean,
  ): Promise<NotificationDeliveryResult> {
    const contract = AUTH_SECURITY_EVENT_CONTRACT_MAP[options.eventType];

    if (!contract) {
      return {
        success: false,
        channel,
        status: NotificationDeliveryStatus.FAILED,
        error: 'Contract not found',
      };
    }

    if (!mandatoryNotification) {
      if (
        this.throttleStore.check(options.userId, options.eventType, throttleLimit, throttleWindowMs)
      ) {
        const logEntry: DeliveryLogEntry = {
          id: randomUUID(),
          tenantId: options.tenantId,
          userId: options.userId,
          eventType: options.eventType,
          channel,
          status: NotificationDeliveryStatus.RATE_LIMITED,
          suppressedReason: 'rate_limit',
          templateCategory: contract.templateCategory,
          ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
        };
        this.deliveryLog.push(logEntry);

        return {
          success: true,
          channel,
          status: NotificationDeliveryStatus.RATE_LIMITED,
        };
      }

      if (this.dedupeStore.check(options.userId, options.eventType, dedupeWindowMs)) {
        const logEntry: DeliveryLogEntry = {
          id: randomUUID(),
          tenantId: options.tenantId,
          userId: options.userId,
          eventType: options.eventType,
          channel,
          status: NotificationDeliveryStatus.SUPPRESSED_DEDUPE,
          suppressedReason: 'dedupe',
          templateCategory: contract.templateCategory,
          ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
        };
        this.deliveryLog.push(logEntry);

        return {
          success: true,
          channel,
          status: NotificationDeliveryStatus.SUPPRESSED_DEDUPE,
        };
      }
    }

    try {
      await this.deliverNotification(options, channel);

      this.dedupeStore.record(options.userId, options.eventType);

      const logEntry: DeliveryLogEntry = {
        id: randomUUID(),
        tenantId: options.tenantId,
        userId: options.userId,
        eventType: options.eventType,
        channel,
        status: NotificationDeliveryStatus.SENT,
        sentAt: new Date(),
        templateCategory: contract.templateCategory,
        ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
      };
      this.deliveryLog.push(logEntry);

      return {
        success: true,
        channel,
        status: NotificationDeliveryStatus.SENT,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const logEntry: DeliveryLogEntry = {
        id: randomUUID(),
        tenantId: options.tenantId,
        userId: options.userId,
        eventType: options.eventType,
        channel,
        status: NotificationDeliveryStatus.FAILED,
        failureReason: errorMessage,
        templateCategory: contract.templateCategory,
        ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
      };
      this.deliveryLog.push(logEntry);

      return {
        success: false,
        channel,
        status: NotificationDeliveryStatus.FAILED,
        error: errorMessage,
      };
    }
  }

  private async deliverNotification(
    _options: NotificationSendOptions,
    _channel: NotificationDeliveryChannel,
  ): Promise<void> {
    return Promise.resolve();
  }

  getDeliveryLog(): ReadonlyArray<DeliveryLogEntry> {
    return this.deliveryLog;
  }

  clearDeliveryLog(): void {
    this.deliveryLog = [];
  }

  clearDedupeStore(): void {
    this.dedupeStore.clear();
  }

  clearThrottleStore(): void {
    this.throttleStore.clear();
  }
}

export const notificationService = new NotificationService();

export const isSecurityEventMandatory = isMandatoryNotification;
