import { eq } from 'drizzle-orm';

import type { RegulatoryFramework } from '@the-dmz/shared';

import { loadConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';

import { generateCertificate } from './certificate.service.js';

import type { DomainEvent } from '../../shared/events/event-types.js';

const SESSION_COMPLETED_EVENT = 'game.session.completed';

export interface SessionCompletedPayload {
  sessionId: string;
  userId: string;
  reason: string;
}

export interface CertificateGenerationConfig {
  defaultFrameworkId: RegulatoryFramework;
  courseNameMap: Record<string, string>;
}

const DEFAULT_CONFIG: CertificateGenerationConfig = {
  defaultFrameworkId: 'nist_800_50',
  courseNameMap: {
    default: 'Security Awareness Training',
  },
};

export const createCertificateEventHandler = (
  config: Partial<CertificateGenerationConfig> = {},
) => {
  const finalConfig: CertificateGenerationConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    defaultFrameworkId: config.defaultFrameworkId ?? DEFAULT_CONFIG.defaultFrameworkId,
  };

  return async (event: DomainEvent<SessionCompletedPayload>): Promise<void> => {
    const { userId, sessionId, reason } = event.payload;
    const tenantId = event.tenantId;

    if (reason !== 'completed') {
      return;
    }

    try {
      const db = getDatabaseClient(loadConfig());

      const [user] = await db
        .select({
          userId: users.userId,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

      if (!user) {
        console.warn(`Cannot generate certificate: user ${userId} not found`);
        return;
      }

      const mappedCourseName = finalConfig.courseNameMap[sessionId];
      const defaultCourseName = finalConfig.courseNameMap['default'] ?? 'Training';
      const courseName = mappedCourseName ?? defaultCourseName;

      const userName = user.displayName ?? null;
      await generateCertificate(tenantId, {
        userId,
        frameworkId: finalConfig.defaultFrameworkId,
        courseName,
        userName: userName ?? 'Unknown User',
      });

      console.warn(`Certificate generated for user ${userId} for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to generate certificate for user ${userId}:`, String(error));
    }
  };
};

export const registerCertificateEventHandlers = (
  eventBus: {
    subscribe: (eventType: string, handler: (event: DomainEvent) => void | Promise<void>) => void;
  },
  config?: Partial<CertificateGenerationConfig>,
): ((event: DomainEvent<SessionCompletedPayload>) => Promise<void>) => {
  const handler = createCertificateEventHandler(config);
  eventBus.subscribe(
    SESSION_COMPLETED_EVENT,
    handler as (event: DomainEvent) => void | Promise<void>,
  );
  return handler;
};

export const unregisterCertificateEventHandlers = (
  eventBus: {
    unsubscribe: (eventType: string, handler: (event: DomainEvent) => void | Promise<void>) => void;
  },
  handler: (event: DomainEvent) => void | Promise<void>,
): void => {
  eventBus.unsubscribe(
    SESSION_COMPLETED_EVENT,
    handler as (event: DomainEvent) => void | Promise<void>,
  );
};
