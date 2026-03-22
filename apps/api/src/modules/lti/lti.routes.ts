import { z } from 'zod';

import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  initiateOidcLogin,
  validateAndConsumeNonce,
  validateAndConsumeState,
  getLtiPlatformByInternalId,
  createLtiSession,
  getLtiSessionByLaunchId,
  getLtiLineItemByIdOnly,
  createLtiLineItem,
  createLtiScore,
  listLtiLineItems,
  getLtiLineItemByResourceLinkId,
  createLtiDeepLinkContent,
  generateState,
  verifyLtiJwt,
  type LtiOidcLoginParams,
} from './lti.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';

const DANGEROUS_URL_SCHEMES = ['javascript', 'data', 'vbscript', 'mailto', 'file', 'ftp'] as const;

const isSafeUrl = (url: string): boolean => {
  const lowered = url.toLowerCase();
  if (DANGEROUS_URL_SCHEMES.some((scheme) => lowered.startsWith(`${scheme}:`))) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    ) {
      return false;
    }
    if (/^169\.254\./.test(parsed.hostname)) {
      return false;
    }
    if (parsed.hostname === '0.0.0.0') {
      return false;
    }
  } catch {
    return false;
  }
  return true;
};

const deepLinkContentItemSchema = z.object({
  type: z.enum(['link', 'file', 'html', 'ltiResourceLink']),
  url: z.string().url().refine(isSafeUrl, {
    message: 'URL must use safe scheme (https recommended) and not target internal resources',
  }),
  title: z.string().max(255).optional(),
  text: z.string().optional(),
  lineItem: z
    .object({
      scoreMaximum: z.number().positive(),
    })
    .optional(),
  icon: z
    .object({
      url: z.string().url(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  thumbnail: z
    .object({
      url: z.string().url(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
});

const deepLinkSettingsSchema = z.object({
  deployment_id: z.string().optional(),
  data: z.string().min(1).max(2048),
  accept_types: z.array(z.enum(['link', 'file', 'html', 'ltiResourceLink'])).optional(),
  accept_presentation_document_targets: z.array(z.enum(['iframe', 'window', 'embed'])).optional(),
  accept_multiple: z.boolean().optional(),
  auto_create: z.boolean().optional(),
});

const deepLinkRequestSchema = z.object({
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings': deepLinkSettingsSchema,
  content_items: z.array(deepLinkContentItemSchema).optional(),
});

const deepLinkQuerystringSchema = {
  type: 'object',
  properties: {
    iss: { type: 'string' },
    login_hint: { type: 'string' },
    target_link_uri: { type: 'string' },
    lti_message_hint: { type: 'string' },
    client_id: { type: 'string' },
    deployment_id: { type: 'string' },
  },
  required: ['iss', 'login_hint', 'target_link_uri'],
};

function getConfig(request: FastifyRequest): AppConfig {
  return request.server.config;
}

export async function registerLtiRoutes(
  fastify: FastifyInstance,
  _options: unknown,
): Promise<void> {
  fastify.get('/lti/login', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const config = getConfig(request);

    const params: LtiOidcLoginParams = {
      iss: query['iss'] ?? '',
      loginHint: query['login_hint'] ?? '',
      targetLinkUri: query['target_link_uri'] ?? '',
      ltiMessageHint: query['lti_message_hint'] ?? '',
    };

    const result = await initiateOidcLogin(config, params);

    if (!result) {
      throw new AppError({
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        message: 'LTI platform not found for the given issuer',
        statusCode: 404,
      });
    }

    return reply.redirect(result.url);
  });

  fastify.post<{ Body: Record<string, string> }>('/lti/login', async (request, _reply) => {
    const body = request.body;
    const config = getConfig(request);
    const code = body['code'] ?? '';
    const targetLinkUri = body['target_link_uri'] ?? '';
    const state = body['state'] ?? '';

    const stateValidation = await validateAndConsumeState(config, state);

    if (!stateValidation) {
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Invalid or expired state parameter',
        statusCode: 401,
      });
    }

    if (stateValidation.redirectUri !== targetLinkUri) {
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Redirect URI mismatch',
        statusCode: 401,
      });
    }

    const platform = await getLtiPlatformByInternalId(config, stateValidation.platformId);

    if (!platform) {
      throw new AppError({
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        message: 'LTI platform not found',
        statusCode: 404,
      });
    }

    const codeVerifier = stateValidation.codeVerifier;

    const authTokenResponse = await fetch(platform.authTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: targetLinkUri,
        client_id: platform.clientId,
        code_verifier: codeVerifier,
      } as Record<string, string>),
    });

    if (!authTokenResponse.ok) {
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Failed to exchange authorization code for tokens',
        statusCode: 401,
      });
    }

    const tokens = (await authTokenResponse.json()) as {
      id_token: string;
      access_token: string;
    };

    let verifiedJwt;
    try {
      verifiedJwt = await verifyLtiJwt(config, platform, tokens.id_token);
    } catch (err) {
      request.log.error({ err }, 'JWT verification failed');
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'JWT verification failed',
        statusCode: 401,
      });
    }

    const payload = verifiedJwt.payload;

    const nonce = (payload['nonce'] as string) ?? '';
    const isValidNonce = await validateAndConsumeNonce(config, platform.platformId, nonce);

    if (!isValidNonce) {
      throw new AppError({
        code: ErrorCodes.AUTH_UNAUTHORIZED,
        message: 'Invalid or expired nonce',
        statusCode: 401,
      });
    }

    const resourceLink = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link'] as
      | { id: string }
      | undefined;
    const context = payload['https://purl.imsglobal.org/spec/lti/claim/context'] as
      | { id: string }
      | undefined;
    const roles = payload['https://purl.imsglobal.org/spec/lti/claim/roles'] as
      | string[]
      | undefined;
    const deploymentId = payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] as
      | string
      | undefined;

    const launchId = generateState();
    const userId = (payload['sub'] as string) ?? '';

    await createLtiSession(config, platform.tenantId, {
      platformId: platform.platformId,
      ...(userId && { userId }),
      ...(resourceLink?.id && { resourceLinkId: resourceLink.id }),
      ...(context?.id && { contextId: context.id }),
      ...(roles && { roles }),
      launchId,
    });

    const launchUrl = new URL(platform.toolUrl ?? '/lti/launch');
    launchUrl.searchParams.set('launch_id', launchId);
    launchUrl.searchParams.set('user_id', userId);
    launchUrl.searchParams.set('deployment_id', deploymentId ?? '');

    if (resourceLink?.id) {
      launchUrl.searchParams.set('resource_link_id', resourceLink.id);
    }
    if (context?.id) {
      launchUrl.searchParams.set('context_id', context.id);
    }
    if (roles) {
      launchUrl.searchParams.set('roles', roles.join(','));
    }

    return _reply.redirect(launchUrl.toString());
  });

  fastify.get('/lti/launch', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    const userId = query['user_id'] ?? '';
    const resourceLinkId = query['resource_link_id'] ?? '';
    const contextId = query['context_id'] ?? '';

    return {
      success: true,
      message: 'LTI launch successful',
      userId,
      resourceLinkId,
      contextId,
    };
  });

  fastify.get(
    '/lti/deep-link',
    {
      schema: {
        querystring: deepLinkQuerystringSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              '@context': { type: 'string' },
              '@type': { type: 'string' },
              deployment_id: { type: 'string' },
              content_items: { type: 'array', items: { type: 'object' } },
            },
          },
          400: errorResponseSchemas.BadRequest,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const query = request.query as Record<string, string>;
      const deploymentId = query['deployment_id'] ?? '';

      return {
        '@context': 'http://purl.imsglobal.org/ctx/lti/v1/ContentItem',
        '@type': 'ContentItem',
        deployment_id: deploymentId,
        content_items: [],
      };
    },
  );

  fastify.post<{ Body: Record<string, unknown> }>(
    '/lti/deep-link',
    {
      schema: {
        body: { type: 'object' },
        response: {
          200: {
            type: 'object',
            properties: {
              '@context': { type: 'string' },
              '@type': { type: 'string' },
              deployment_id: { type: 'string' },
              content_items: { type: 'array', items: { type: 'object' } },
            },
          },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const config = getConfig(request);
      const parsed = deepLinkRequestSchema.parse(request.body);

      const deepLinkSettings =
        parsed['https://purl.imsglobal.org/spec/lti-dl/claim/deep_link_settings'];
      const data = deepLinkSettings.data;
      const deploymentId = deepLinkSettings.deployment_id ?? '';

      const contentItems = parsed.content_items;

      if (!contentItems || contentItems.length === 0) {
        return {
          '@context': 'http://purl.imsglobal.org/ctx/lti/v1/ContentItem',
          '@type': 'ContentItem',
          deployment_id: deploymentId,
          content_items: [],
        };
      }

      const storedContentItems: unknown[] = [];

      if (data) {
        const session = await getLtiSessionByLaunchId(config, data);
        if (session) {
          for (const item of contentItems) {
            if (item.type === 'ltiResourceLink' && item.url) {
              const content = await createLtiDeepLinkContent(config, session.tenantId, {
                platformId: session.platformId,
                contentType: item.type,
                title: item.title ?? 'LTI Content',
                url: item.url,
              });
              storedContentItems.push({
                type: 'ltiResourceLink',
                url: item.url,
                title: item.title,
                lineItem: item.lineItem,
                custom: {
                  contentId: content.contentId,
                },
              });
            }
          }
        }
      }

      return {
        '@context': 'http://purl.imsglobal.org/ctx/lti/v1/ContentItem',
        '@type': 'ContentItem',
        deployment_id: deploymentId,
        content_items: storedContentItems.length > 0 ? storedContentItems : contentItems,
      };
    },
  );

  fastify.get(
    '/lti/ags/lineitems',
    {
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            resource_link_id: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: { type: 'array', items: { type: 'object' } },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const config = getConfig(request);
      const query = request.query as { resource_link_id?: string; limit?: string } | undefined;

      const launchId = query?.resource_link_id;
      if (!launchId) {
        return [];
      }

      const session = await getLtiSessionByLaunchId(config, launchId);
      if (!session) {
        return [];
      }

      const lineItems = await listLtiLineItems(config, session.tenantId, session.platformId);

      return lineItems.map((item) => ({
        id: `${session.platformId}/${item.lineItemId}`,
        scoreMaximum: item.scoreMaximum,
        label: item.label,
        resourceId: item.resourceId,
        tag: item.tag,
        startDateTime: item.startDate?.toISOString(),
        endDateTime: item.endDate?.toISOString(),
        'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
          scope: [
            'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
            'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
            'https://purl.imsglobal.org/spec/lti-ags/scope/score',
            'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
          ],
          lineitems: `${request.url.split('/lti/ags/lineitems')[0]}/lti/ags/lineitems`,
        },
      }));
    },
  );

  fastify.post(
    '/lti/ags/lineitems',
    {
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['scoreMaximum', 'label'],
          properties: {
            scoreMaximum: { type: 'number' },
            label: { type: 'string' },
            resourceId: { type: 'string' },
            tag: { type: 'string' },
            resource_link_id: { type: 'string' },
          },
        },
        response: {
          201: { type: 'object' },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const config = getConfig(request);
      const body = request.body as {
        scoreMaximum: number;
        label: string;
        resourceId?: string;
        tag?: string;
        resource_link_id?: string;
      };

      const launchId = body.resource_link_id;
      if (!launchId) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: 'resource_link_id is required',
          statusCode: 400,
        });
      }

      const session = await getLtiSessionByLaunchId(config, launchId);
      if (!session) {
        throw new AppError({
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'Invalid launch context',
          statusCode: 401,
        });
      }

      const lineItem = await createLtiLineItem(config, session.tenantId, {
        platformId: session.platformId,
        ...(session.resourceLinkId && { resourceLinkId: session.resourceLinkId }),
        label: body.label,
        ...(body.scoreMaximum !== undefined && { scoreMaximum: body.scoreMaximum }),
        ...(body.resourceId && { resourceId: body.resourceId }),
        ...(body.tag && { tag: body.tag }),
      });

      return {
        id: `${session.platformId}/${lineItem.lineItemId}`,
        scoreMaximum: lineItem.scoreMaximum,
        label: lineItem.label,
        resourceId: lineItem.resourceId,
        tag: lineItem.tag,
        startDateTime: lineItem.startDate?.toISOString() ?? null,
        endDateTime: lineItem.endDate?.toISOString() ?? null,
        created: true,
      };
    },
  );

  fastify.post(
    '/lti/ags/scores',
    {
      schema: {
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['userId', 'scoreGiven', 'scoreMaximum'],
          properties: {
            userId: { type: 'string' },
            scoreGiven: { type: 'number' },
            scoreMaximum: { type: 'number' },
            activityProgress: { type: 'string' },
            gradingProgress: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            lineItemId: { type: 'string' },
            resource_link_id: { type: 'string' },
          },
        },
        response: {
          201: { type: 'object' },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const config = getConfig(request);
      const body = request.body as {
        userId: string;
        scoreGiven: number;
        scoreMaximum: number;
        activityProgress?: string;
        gradingProgress?: string;
        timestamp?: string;
        lineItemId?: string;
        resource_link_id?: string;
      };

      let lineItemId = body.lineItemId;
      const launchId = body.resource_link_id;

      if (!lineItemId && launchId) {
        const session = await getLtiSessionByLaunchId(config, launchId);
        if (session?.resourceLinkId) {
          const lineItem = await getLtiLineItemByResourceLinkId(
            config,
            session.platformId,
            session.resourceLinkId,
          );
          if (lineItem) {
            lineItemId = lineItem.lineItemId;
          }
        }
      }

      if (!lineItemId) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: 'lineItemId or resource_link_id is required',
          statusCode: 400,
        });
      }

      const lineItem = await getLtiLineItemByIdOnly(config, lineItemId);
      if (!lineItem) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Line item not found',
          statusCode: 404,
        });
      }

      const score = await createLtiScore(config, lineItem.tenantId, {
        lineItemId,
        userId: body.userId,
        ...(body.scoreGiven !== undefined && { scoreGiven: body.scoreGiven }),
        ...(body.scoreMaximum !== undefined && { scoreMaximum: body.scoreMaximum }),
        ...(body.activityProgress && { activityProgress: body.activityProgress }),
        ...(body.gradingProgress && { gradingProgress: body.gradingProgress }),
        ...(body.timestamp && { timestamp: body.timestamp }),
      });

      return {
        id: `${lineItem.platformId}/${lineItemId}/scores/${score.scoreId}`,
        userId: score.userId,
        scoreGiven: parseFloat(score.scoreGiven ?? '0'),
        scoreMaximum: score.scoreMaximum,
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
        timestamp: score.timestamp.toISOString(),
      };
    },
  );

  fastify.get(
    '/lti/nrps/membership',
    {
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
            rlid: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              '@context': { type: 'string' },
              '@type': { type: 'string' },
              members: { type: 'array', items: { type: 'object' } },
            },
          },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const config = getConfig(request);
      const query = request.query as { limit?: string; rlid?: string } | undefined;

      const rlid = query?.rlid;
      if (!rlid) {
        return {
          '@context': 'http://purl.imsglobal.org/ctx/lti-nrps/v2p0',
          '@type': 'ContextMembershipsContainer',
          members: [],
        };
      }

      const session = await getLtiSessionByLaunchId(config, rlid);
      if (!session || !session.userId) {
        return {
          '@context': 'http://purl.imsglobal.org/ctx/lti-nrps/v2p0',
          '@type': 'ContextMembershipsContainer',
          members: [],
        };
      }

      return {
        '@context': 'http://purl.imsglobal.org/ctx/lti-nrps/v2p0',
        '@type': 'ContextMembershipsContainer',
        id: `${session.platformId}/memberships`,
        contextMembershipsUrl: `${request.protocol}://${request.hostname}/lti/nrps/membership?rlid=${rlid}`,
        members: [
          {
            user_id: session.userId,
            roles: session.roles,
            status: 'Active',
            lis_person_name_given: null,
            lis_person_name_family: null,
            lis_person_name_full: null,
            email: null,
          },
        ],
      };
    },
  );
}
