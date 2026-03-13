import { isIP as isIPCheck } from 'node:net';

import { type FastifyInstance, type FastifyPluginAsync, type FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^::ffff:(127|10|172\.(1[6-9]|2\d|3[01])|192\.168)\./i,
];

const BLOCKED_HOSTS = [
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.google',
  'kubernetes.default.svc',
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((range) => range.test(ip));
}

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTS.some((blocked) => lower === blocked || lower.endsWith(`.${blocked}`));
}

export function validateUrl(urlString: string): { valid: boolean; reason?: string } {
  try {
    const url = new URL(urlString);

    if (!url.hostname) {
      return { valid: false, reason: 'No hostname provided' };
    }

    if (isIPCheck(url.hostname)) {
      if (isPrivateIP(url.hostname)) {
        return { valid: false, reason: 'Private IP addresses are not allowed' };
      }
    } else {
      if (isBlockedHost(url.hostname)) {
        return { valid: false, reason: 'Blocked metadata host' };
      }

      if (isPrivateIP(url.hostname)) {
        return { valid: false, reason: 'Private hostnames resolve to private IPs' };
      }
    }

    if (url.protocol && !['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

const ssrfProtectionPluginCallback: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.addHook('preHandler', async (request, reply: FastifyReply): Promise<void> => {
    const queryUrl = (request.query as Record<string, unknown>)?.['url'];
    const bodyUrl = (request.body as Record<string, unknown>)?.['url'];
    const url = queryUrl || bodyUrl;

    if (url && typeof url === 'string') {
      const validation = validateUrl(url);

      if (!validation.valid) {
        fastify.log.warn({
          msg: 'SSRF attempt blocked',
          url,
          reason: validation.reason,
          ip: request.ip,
        });

        return reply.status(403).send({ error: 'URL validation failed' });
      }
    }

    return undefined;
  });
};

export const ssrfProtectionPlugin = fp(ssrfProtectionPluginCallback, {
  name: 'ssrf-protection',
});
