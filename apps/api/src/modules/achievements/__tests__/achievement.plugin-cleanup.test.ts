import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestConfig } from '@the-dmz/shared/testing';

import { buildApp } from '../../../app.js';
import { type AppConfig } from '../../../config.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import { ensureTenantColumns, resetTestDatabase } from '../../../__tests__/helpers/db.js';
import { ACHIEVEMENT_EVENT_TYPES } from '../achievement.events.js';

import type { FastifyInstance } from 'fastify';
import type { DomainEvent } from '../../../shared/events/event-types.js';

const testConfig = createTestConfig() as AppConfig;

describe('achievement.plugin cleanup', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await resetTestDatabase(testConfig);
    await ensureTenantColumns(testConfig);
  });

  afterAll(async () => {
    await closeDatabase();
    if (app) {
      await app.close();
    }
  });

  describe('onClose cleanup', () => {
    it('should unsubscribe all achievement event handlers when plugin closes', async () => {
      app = buildApp(testConfig);
      await app.ready();

      const handler = vi.fn();
      for (const eventType of ACHIEVEMENT_EVENT_TYPES) {
        app.eventBus.subscribe(eventType, handler as (event: DomainEvent) => void);
      }

      expect(handler).toHaveBeenCalledTimes(0);

      const testEvent = {
        eventId: 'test-event-id',
        eventType: ACHIEVEMENT_EVENT_TYPES[0]!,
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation',
        tenantId: 'test-tenant',
        userId: 'test-user',
        source: 'test',
        payload: {},
        version: 1,
      };

      for (const eventType of ACHIEVEMENT_EVENT_TYPES) {
        app.eventBus.publish({ ...testEvent, eventType } as DomainEvent);
      }

      expect(handler).toHaveBeenCalledTimes(ACHIEVEMENT_EVENT_TYPES.length);

      handler.mockClear();

      await app.close();

      for (const eventType of ACHIEVEMENT_EVENT_TYPES) {
        app.eventBus.publish({ ...testEvent, eventType } as DomainEvent);
      }

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not have handlers registered after app close', async () => {
      app = buildApp(testConfig);
      await app.ready();

      const handler = vi.fn();
      const eventType = ACHIEVEMENT_EVENT_TYPES[0]!;
      app.eventBus.subscribe(eventType, handler as (event: DomainEvent) => void);

      const testEvent = {
        eventId: 'test-event-id',
        eventType,
        timestamp: new Date().toISOString(),
        correlationId: 'test-correlation',
        tenantId: 'test-tenant',
        userId: 'test-user',
        source: 'test',
        payload: {},
        version: 1,
      };

      app.eventBus.publish(testEvent as DomainEvent);
      expect(handler).toHaveBeenCalledTimes(1);

      await app.close();

      const handler2 = vi.fn();
      app.eventBus.subscribe(eventType, handler2 as (event: DomainEvent) => void);

      app.eventBus.publish(testEvent as DomainEvent);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handler accumulation prevention', () => {
    it('should not accumulate handlers on multiple app close/open cycles', async () => {
      const callCounts: number[] = [];

      for (let i = 0; i < 3; i++) {
        app = buildApp(testConfig);
        await app.ready();

        const handler = vi.fn();
        const eventType = ACHIEVEMENT_EVENT_TYPES[0]!;
        app.eventBus.subscribe(eventType, handler as (event: DomainEvent) => void);

        const testEvent = {
          eventId: `test-event-id-${i}`,
          eventType,
          timestamp: new Date().toISOString(),
          correlationId: `test-correlation-${i}`,
          tenantId: 'test-tenant',
          userId: 'test-user',
          source: 'test',
          payload: {},
          version: 1,
        };

        app.eventBus.publish(testEvent as DomainEvent);
        callCounts.push(handler.mock.calls.length);

        await app.close();
      }

      expect(callCounts[0]).toBe(1);
      expect(callCounts[1]).toBe(1);
      expect(callCounts[2]).toBe(1);
    });
  });
});
