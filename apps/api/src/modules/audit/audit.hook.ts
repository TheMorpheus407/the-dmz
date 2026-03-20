import { LOG_REDACTION_KEYS } from '@the-dmz/shared/contracts';

import { createAuditLog } from './audit.service.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface AuditHookOptions {
  ignoredPaths?: string[];
  ignoredMethods?: string[];
}

const DEFAULT_IGNORED_PATHS = ['/health', '/metrics', '/audit', '/docs', '/openapi.json'];

const DEFAULT_IGNORED_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export function createAuditLogHook(options: AuditHookOptions = {}) {
  const ignoredPaths = options.ignoredPaths ?? DEFAULT_IGNORED_PATHS;
  const ignoredMethods = options.ignoredMethods ?? DEFAULT_IGNORED_METHODS;

  return async function auditOnRequestHook(request: FastifyRequest, reply: FastifyReply) {
    const path = request.url.split('?')[0] ?? '/';
    const method = request.method;

    if (ignoredPaths.some((ignoredPath) => path.startsWith(ignoredPath))) {
      return;
    }

    if (ignoredMethods.includes(method)) {
      return;
    }

    const startTime = Date.now();

    const originalSend = reply.send.bind(reply);
    reply.send = function (payload: unknown) {
      void (async () => {
        try {
          const tenantContext = request.tenantContext;
          const user = request.user;

          if (!tenantContext || !user) {
            return;
          }

          const action = `${method.toLowerCase()}.${path.split('/').filter(Boolean).join('.')}`;
          const resourceType = extractResourceType(path);
          const resourceId = extractResourceId(path);

          const metadata: Record<string, unknown> = {
            requestMethod: method,
            requestPath: path,
            responseStatus: reply.statusCode,
            responseTime: Date.now() - startTime,
          };

          if (request.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            metadata['requestBody'] = sanitizeBody(request.body);
          }

          const forwardedFor = request.headers['x-forwarded-for'];
          const ipAddress =
            typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : request.ip;

          const logInput: {
            tenantId: string;
            userId: string;
            action: string;
            resourceType: string;
            resourceId?: string;
            ipAddress?: string;
            metadata: Record<string, unknown>;
            correlationId?: string;
            userAgent?: string;
          } = {
            tenantId: tenantContext.tenantId,
            userId: user.userId,
            action,
            resourceType,
            metadata,
          };

          if (resourceId) {
            logInput.resourceId = resourceId;
          }
          if (ipAddress) {
            logInput.ipAddress = ipAddress;
          }

          const correlationIdHeader = request.headers['x-correlation-id'];
          if (typeof correlationIdHeader === 'string') {
            logInput.correlationId = correlationIdHeader;
          }

          const userAgentHeader = request.headers['user-agent'];
          if (typeof userAgentHeader === 'string') {
            logInput.userAgent = userAgentHeader;
          }

          await createAuditLog(logInput);
        } catch (error) {
          request.log.error(error, 'Failed to create audit log entry');
        }
      })();

      return originalSend(payload);
    };
  };
}

function extractResourceType(path: string): string {
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return 'unknown';
  }

  const resourceTypes: Record<string, string> = {
    admin: 'admin',
    users: 'user',
    roles: 'role',
    permissions: 'permission',
    tenants: 'tenant',
    sessions: 'session',
    settings: 'settings',
    webhooks: 'webhook',
    content: 'content',
    campaigns: 'campaign',
    analytics: 'analytics',
  };

  for (const segment of segments) {
    const mapped = resourceTypes[segment.toLowerCase()];
    if (mapped) {
      return mapped;
    }
  }

  return segments[0] ?? 'unknown';
}

function extractResourceId(path: string): string | undefined {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);

  return match?.[0];
}

export function sanitizeBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  const sensitiveFields: string[] = [...LOG_REDACTION_KEYS, 'key'];
  const sanitized = Array.isArray(body)
    ? Array.from(body as unknown[])
    : { ...(typeof body === 'object' && body !== null ? body : {}) };

  const recursiveSanitize = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(recursiveSanitize);
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = recursiveSanitize(value);
      }
    }
    return result;
  };

  return recursiveSanitize(sanitized);
}

export async function registerAuditHook(
  fastify: FastifyInstance,
  options: AuditHookOptions = {},
): Promise<void> {
  const hook = createAuditLogHook(options);
  fastify.addHook('onRequest', hook);
}
