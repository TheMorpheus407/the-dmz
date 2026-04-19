import {
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  AUTH_SECURITY_EVENT_CONTRACT_MAP,
  isMandatoryNotification,
} from '@the-dmz/shared/contracts';

import { DedupeStore } from './dedupe.store.js';
import { ThrottleStore } from './throttle.store.js';
import { DeliveryLogger } from './delivery-logger.js';

import type { NotificationSendOptions, NotificationDeliveryResult } from './notification.types.js';

export class NotificationService {
  private dedupeStore: DedupeStore;
  private throttleStore: ThrottleStore;
  private deliveryLogger: DeliveryLogger;

  constructor() {
    this.dedupeStore = new DedupeStore();
    this.throttleStore = new ThrottleStore();
    this.deliveryLogger = new DeliveryLogger();
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
        this.throttleStore.isThrottled(
          options.userId,
          options.eventType,
          throttleLimit,
          throttleWindowMs,
        )
      ) {
        this.deliveryLogger.log({
          tenantId: options.tenantId,
          userId: options.userId,
          eventType: options.eventType,
          channel,
          status: NotificationDeliveryStatus.RATE_LIMITED,
          suppressedReason: 'rate_limit',
          templateCategory: contract.templateCategory,
          ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
        });

        return {
          success: true,
          channel,
          status: NotificationDeliveryStatus.RATE_LIMITED,
        };
      }

      if (this.dedupeStore.isDuplicate(options.userId, options.eventType, dedupeWindowMs)) {
        this.deliveryLogger.log({
          tenantId: options.tenantId,
          userId: options.userId,
          eventType: options.eventType,
          channel,
          status: NotificationDeliveryStatus.SUPPRESSED_DEDUPE,
          suppressedReason: 'dedupe',
          templateCategory: contract.templateCategory,
          ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
        });

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

      this.deliveryLogger.log({
        tenantId: options.tenantId,
        userId: options.userId,
        eventType: options.eventType,
        channel,
        status: NotificationDeliveryStatus.SENT,
        sentAt: new Date(),
        templateCategory: contract.templateCategory,
        ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
      });

      return {
        success: true,
        channel,
        status: NotificationDeliveryStatus.SENT,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.deliveryLogger.log({
        tenantId: options.tenantId,
        userId: options.userId,
        eventType: options.eventType,
        channel,
        status: NotificationDeliveryStatus.FAILED,
        failureReason: errorMessage,
        templateCategory: contract.templateCategory,
        ...(options.correlationId !== undefined && { correlationId: options.correlationId }),
      });

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

  getDeliveryLog() {
    return this.deliveryLogger.getLog();
  }

  clearDeliveryLog(): void {
    this.deliveryLogger.clear();
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
