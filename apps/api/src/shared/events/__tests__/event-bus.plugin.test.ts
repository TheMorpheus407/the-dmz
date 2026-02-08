import fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDomainEvent } from '../event-bus.js';
import { eventBusPlugin } from '../event-bus.plugin.js';

import type { FastifyInstance } from 'fastify';

describe('eventBusPlugin', () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('decorates Fastify with eventBus', async () => {
    app = fastify({ logger: false });

    await app.register(eventBusPlugin);
    await app.ready();

    expect(app.hasDecorator('eventBus')).toBe(true);
    expect(app.eventBus).toBeDefined();
  });

  it('supports publish and subscribe via fastify.eventBus', async () => {
    app = fastify({ logger: false });

    await app.register(eventBusPlugin);
    await app.ready();

    const handler = vi.fn();
    app.eventBus.subscribe('auth.user.created', handler);

    const event = createDomainEvent({
      eventType: 'auth.user.created',
      correlationId: '0194d2e5-8af5-7eb6-8d2b-cf70a9f8f6de',
      tenantId: '0194d2e5-8af5-7f1d-8f7f-cf70a9f8f6dd',
      userId: '0194d2e5-8af5-7d22-8f7a-cf70a9f8f6dc',
      source: 'auth',
      payload: {
        email: 'learner@example.invalid',
      },
      version: 1,
    });

    app.eventBus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });
});
