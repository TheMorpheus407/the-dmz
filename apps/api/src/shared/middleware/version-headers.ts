import fp from 'fastify-plugin';

import { API_VERSIONING_POLICY } from '../policies/index.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    apiVersion?: string;
    requestedVersion?: string;
  }
}

const VERSION_MIME_TYPE = 'application/vnd.thedmz';
const VERSION_HEADER_REGEX = /application\/vnd\.thedmz\.v(\d+)(?:\+json)?/;

export interface VersionHeadersOptions {
  addAPIVersionHeader?: boolean;
  supportedVersions?: string[];
}

function parseAcceptHeaderVersion(acceptHeader: string | undefined): string | undefined {
  if (!acceptHeader) {
    return undefined;
  }

  const types = acceptHeader.split(',').map((t) => t.trim());

  for (const type of types) {
    const match = type.match(VERSION_HEADER_REGEX);
    if (match) {
      return `v${match[1]}`;
    }

    if (type.startsWith(VERSION_MIME_TYPE)) {
      const versionMatch = type.match(/v(\d+)/);
      if (versionMatch) {
        return `v${versionMatch[1]}`;
      }
    }
  }

  return undefined;
}

function isVersionSupported(version: string, supportedVersions: string[]): boolean {
  return supportedVersions.includes(version);
}

async function versionHeadersPlugin(fastify: FastifyInstance): Promise<void> {
  const supportedVersions = [API_VERSIONING_POLICY.activeMajorVersion];
  const currentVersion = API_VERSIONING_POLICY.activeMajorVersion;

  fastify.addHook('preHandler', async (request, reply) => {
    const url = request.url;

    const isVersionedRoute = url.startsWith('/api/') && !url.startsWith('/api/version');

    if (!isVersionedRoute) {
      return;
    }

    const acceptHeader = request.headers.accept;
    const requestedVersion = parseAcceptHeaderVersion(acceptHeader);

    if (requestedVersion) {
      request.requestedVersion = requestedVersion;

      if (!isVersionSupported(requestedVersion, supportedVersions)) {
        reply.header('API-Version', currentVersion);
        reply.header('Accept-Patch', 'application/json');
        return;
      }

      request.apiVersion = requestedVersion;
    }

    reply.header('API-Version', currentVersion);
  });
}

export const versionHeadersMiddleware = fp(versionHeadersPlugin, {
  name: 'version-headers-middleware',
  fastify: '5.x',
});

export function createVersionHeadersHandler(options: VersionHeadersOptions = {}) {
  const supportedVersions = options.supportedVersions || [API_VERSIONING_POLICY.activeMajorVersion];
  const currentVersion = API_VERSIONING_POLICY.activeMajorVersion;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const url = request.url;

    if (url.startsWith('/api/version')) {
      return;
    }

    const acceptHeader = request.headers.accept;
    const requestedVersion = parseAcceptHeaderVersion(acceptHeader);

    if (requestedVersion) {
      request.requestedVersion = requestedVersion;

      if (!isVersionSupported(requestedVersion, supportedVersions)) {
        reply.header('API-Version', currentVersion);
        reply.header('Accept-Patch', 'application/json');
        return;
      }

      request.apiVersion = requestedVersion;
    }

    reply.header('API-Version', currentVersion);
  };
}

export function extractVersionFromMimeType(mimeType: string): string | undefined {
  const match = mimeType.match(/v(\d+)/);
  return match ? `v${match[1]}` : undefined;
}
