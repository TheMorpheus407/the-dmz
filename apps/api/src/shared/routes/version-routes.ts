import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { API_VERSIONING_POLICY, getDeprecationPolicy } from '../policies/index.js';

export interface VersionInfo {
  currentVersion: string;
  supportedVersions: string[];
  deprecationSchedule: DeprecationEntry[];
  headers: {
    acceptMimeType: string;
    responseHeader: string;
    deprecationHeader: string;
  };
}

export interface DeprecationEntry {
  version: string;
  sunsetDate: string;
  successorVersion?: string;
}

export function registerVersionRoutes(app: FastifyInstance): void {
  app.get(
    '/api/version',
    {
      schema: {
        description: 'API version discovery endpoint',
        tags: ['API'],
        response: {
          200: {
            type: 'object',
            properties: {
              currentVersion: { type: 'string' },
              supportedVersions: { type: 'array', items: { type: 'string' } },
              deprecationSchedule: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    version: { type: 'string' },
                    sunsetDate: { type: 'string' },
                    successorVersion: { type: 'string' },
                  },
                },
              },
              headers: {
                type: 'object',
                properties: {
                  acceptMimeType: { type: 'string' },
                  responseHeader: { type: 'string' },
                  deprecationHeader: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, _reply: FastifyReply): Promise<VersionInfo> => {
      const policy = API_VERSIONING_POLICY;
      const deprecationPolicy = getDeprecationPolicy();

      const currentVersion = policy.activeMajorVersion;
      const supportedVersions = [currentVersion];

      const deprecationSchedule: DeprecationEntry[] = [];

      const gracePeriodDays = deprecationPolicy.sunsetPolicy.defaultGracePeriodDays;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + gracePeriodDays);

      deprecationSchedule.push({
        version: currentVersion,
        sunsetDate: futureDate.toISOString(),
      });

      return {
        currentVersion,
        supportedVersions,
        deprecationSchedule,
        headers: {
          acceptMimeType: `application/vnd.thedmz.v1+json`,
          responseHeader: 'API-Version',
          deprecationHeader: 'Deprecation',
        },
      };
    },
  );
}
