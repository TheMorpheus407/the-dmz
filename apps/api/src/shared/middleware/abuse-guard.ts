import type { AuthAbuseCategory } from '@the-dmz/shared/contracts';

import { getAbuseCounterService } from '../services/abuse-counter.service.js';
import {
  evaluateAbuseResult,
  setAbuseHeaders,
  getClientIp,
} from '../policies/auth-abuse-policy.js';

import type { AppConfig } from '../../config.js';
import type { FastifyRequest, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';

export interface AbuseCheckOptions {
  tenantId?: string;
  email?: string;
  ip?: string;
  category: AuthAbuseCategory;
}

declare module 'fastify' {
  interface FastifyRequest {
    abuseCheckOptions?: AbuseCheckOptions;
  }
}

export const createAbuseGuard = (
  category: AuthAbuseCategory,
  options: { emailField?: string } = {},
): preHandlerAsyncHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const config = request.server.config;
    const tenantId = request.preAuthTenantContext?.tenantId;
    const clientIp = getClientIp(request);

    const abuseCheckOptions: AbuseCheckOptions = {
      category,
    };

    if (tenantId) {
      abuseCheckOptions.tenantId = tenantId;
    }

    if (clientIp) {
      abuseCheckOptions.ip = clientIp;
    }

    if (options.emailField) {
      const email = (request.body as Record<string, unknown>)?.[options.emailField] as
        | string
        | undefined;
      if (email) {
        abuseCheckOptions.email = email;
      }
    }

    request.abuseCheckOptions = abuseCheckOptions;

    const abuseService = getAbuseCounterService(config);
    const preAuthAbuse = await abuseService.checkAbuseLevel(abuseCheckOptions);

    evaluateAbuseResult(preAuthAbuse);
    setAbuseHeaders(reply, preAuthAbuse);
  };
};

export const incrementAbuseCounter = async (
  request: FastifyRequest,
  config: AppConfig,
  condition: (error: unknown) => boolean = () => true,
): Promise<void> => {
  const abuseCheckOptions = request.abuseCheckOptions;
  if (!abuseCheckOptions) {
    return;
  }

  if (!condition(request)) {
    return;
  }

  const abuseService = getAbuseCounterService(config);
  const postAuthAbuse = await abuseService.incrementAndEvaluate(abuseCheckOptions);

  evaluateAbuseResult(postAuthAbuse);
};

export const resetAbuseCounters = async (
  request: FastifyRequest,
  config: AppConfig,
): Promise<void> => {
  const abuseCheckOptions = request.abuseCheckOptions;
  if (!abuseCheckOptions) {
    return;
  }

  const abuseService = getAbuseCounterService(config);
  await abuseService.resetCounters(abuseCheckOptions);
};
