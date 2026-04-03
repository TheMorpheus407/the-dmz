import {
  xapiStatementInputSchema,
  xapiArchiveInputSchema,
  lrsConfigInputSchema,
  lrsConfigUpdateSchema,
} from '@the-dmz/shared';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { authGuard } from '../../shared/middleware/authorization.js';

import {
  generateXapiStatement,
  buildActorFromUser,
  storeXapiStatement,
  listXapiStatements,
  getXapiStatement,
  archiveXapiStatements,
  createLrsConfig,
  listLrsConfigs,
  getLrsConfig,
  updateLrsConfig,
  deleteLrsConfig,
  sendPendingStatements,
  XAPI_VERBS,
  XAPI_ACTIVITY_UNKNOWN,
  type XapiVersion,
  type XapiVerb,
  type XapiActivity,
  type XapiResult,
  type XapiContext,
} from './xapi.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths

export async function registerXapiRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.post(
    '/statements',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ message: 'Tenant context is required' });
      }

      const user = request.user as AuthenticatedUser;
      if (!user) {
        return reply.status(401).send({ message: 'Authentication required' });
      }

      const parseResult = xapiStatementInputSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        });
      }

      const body = parseResult.data;

      const actor = buildActorFromUser(
        body.actor?.mbox?.replace('mailto:', '') ?? `user-${user.userId}@the-dmz.example.com`,
        body.actor?.name ?? `User ${user.userId}`,
      );

      const activity: XapiActivity = {
        objectType: 'Activity',
        id: body.object.id ?? XAPI_ACTIVITY_UNKNOWN,
      };

      if (body.object.definition) {
        activity.definition = {};
        if (body.object.definition.name) activity.definition.name = body.object.definition.name;
        if (body.object.definition.description)
          activity.definition.description = body.object.definition.description;
        if (body.object.definition.type) activity.definition.type = body.object.definition.type;
      }

      const verb: XapiVerb = {
        id: body.verb.id ?? XAPI_VERBS.EXPERIENCED.id,
        display: body.verb.display ?? XAPI_VERBS.EXPERIENCED.display,
      };

      let result: XapiResult | undefined;
      if (body.result) {
        result = {};
        if (body.result.score?.raw !== undefined) {
          result.score = { raw: body.result.score.raw, min: 0, max: 100 };
        }
        if (body.result.success !== undefined) result.success = body.result.success;
        if (body.result.completion !== undefined) result.completion = body.result.completion;
        if (body.result.duration !== undefined) result.duration = body.result.duration;
      }

      let context: XapiContext | undefined;
      if (body.context?.extensions) {
        context = { extensions: body.context.extensions };
      }

      const version: XapiVersion = body.version ?? '1.0.3';
      const timestamp = body.timestamp ? new Date(body.timestamp) : undefined;

      const statementOptions: {
        result?: XapiResult;
        context?: XapiContext;
        version?: XapiVersion;
        timestamp?: Date;
      } = {
        version,
      };
      if (timestamp) {
        statementOptions.timestamp = timestamp;
      }
      if (result) {
        statementOptions.result = result;
      }
      if (context) {
        statementOptions.context = context;
      }

      const statement = generateXapiStatement(actor, verb, activity, statementOptions);

      const storedStatement = await storeXapiStatement(config, tenantId, statement);

      reply.code(201);
      return {
        statementId: statement.id,
        stored: storedStatement.storedAt.toISOString(),
      };
    },
  );

  app.get(
    '/statements',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return { statements: [], total: 0 };
      }

      const query = request.query as { limit?: string; offset?: string; verbId?: string };

      const listOptions: {
        limit: number;
        offset: number;
        verbId?: string;
      } = {
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
      };
      if (query.verbId) {
        listOptions.verbId = query.verbId;
      }

      const statements = await listXapiStatements(config, tenantId, listOptions);

      return {
        statements: statements.map((stmt) => ({
          id: stmt.id,
          statementId: stmt.statementId,
          statementVersion: stmt.statementVersion,
          actorMbox: stmt.actorMbox,
          actorName: stmt.actorName,
          verbId: stmt.verbId,
          verbDisplay: stmt.verbDisplay,
          objectId: stmt.objectId,
          objectType: stmt.objectType,
          objectName: stmt.objectName,
          objectDescription: stmt.objectDescription,
          resultScore: stmt.resultScore,
          resultSuccess: stmt.resultSuccess,
          resultCompletion: stmt.resultCompletion,
          resultDuration: stmt.resultDuration,
          lrsStatus: stmt.lrsStatus,
          storedAt: stmt.storedAt.toISOString(),
        })),
        total: statements.length,
      };
    },
  );

  app.get(
    '/statements/:statementId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ message: 'Tenant context is required' });
      }

      const { statementId } = request.params as { statementId: string };

      const statement = await getXapiStatement(config, statementId, tenantId);

      if (!statement) {
        return reply.status(404).send({ message: 'Statement not found' });
      }

      return {
        id: statement.id,
        statementId: statement.statementId,
        statementVersion: statement.statementVersion,
        actorMbox: statement.actorMbox,
        actorName: statement.actorName,
        verbId: statement.verbId,
        verbDisplay: statement.verbDisplay,
        objectId: statement.objectId,
        objectType: statement.objectType,
        objectName: statement.objectName,
        objectDescription: statement.objectDescription,
        resultScore: statement.resultScore,
        resultSuccess: statement.resultSuccess,
        resultCompletion: statement.resultCompletion,
        resultDuration: statement.resultDuration,
        lrsStatus: statement.lrsStatus,
        storedAt: statement.storedAt.toISOString(),
      };
    },
  );

  app.post(
    '/archive',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return { archived: 0 };
      }

      const parseResult = xapiArchiveInputSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        });
      }

      const { beforeDate } = parseResult.data;

      const archived = await archiveXapiStatements(config, tenantId, new Date(beforeDate));

      return { archived };
    },
  );

  app.get(
    '/lrs-configs',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return { configs: [] };
      }

      const configs = await listLrsConfigs(config, tenantId);

      return {
        configs: configs.map((cfg) => ({
          id: cfg.id,
          tenantId: cfg.tenantId,
          name: cfg.name,
          endpoint: cfg.endpoint,
          authKeyId: cfg.authKeyId,
          version: cfg.version,
          enabled: cfg.enabled,
          batchingEnabled: cfg.batchingEnabled,
          batchSize: cfg.batchSize,
          retryMaxAttempts: cfg.retryMaxAttempts,
          retryBaseDelayMs: cfg.retryBaseDelayMs,
          createdAt: cfg.createdAt.toISOString(),
          updatedAt: cfg.updatedAt.toISOString(),
        })),
      };
    },
  );

  app.post(
    '/lrs-configs',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ message: 'Tenant context is required' });
      }

      const parseResult = lrsConfigInputSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        });
      }

      const lrsConfigData = parseResult.data;

      const lrsConfig = await createLrsConfig(config, tenantId, lrsConfigData);

      reply.code(201);
      return {
        id: lrsConfig.id,
        tenantId: lrsConfig.tenantId,
        name: lrsConfig.name,
        endpoint: lrsConfig.endpoint,
        authKeyId: lrsConfig.authKeyId,
        version: lrsConfig.version,
        enabled: lrsConfig.enabled,
        batchingEnabled: lrsConfig.batchingEnabled,
        batchSize: lrsConfig.batchSize,
        retryMaxAttempts: lrsConfig.retryMaxAttempts,
        retryBaseDelayMs: lrsConfig.retryBaseDelayMs,
        createdAt: lrsConfig.createdAt.toISOString(),
        updatedAt: lrsConfig.updatedAt.toISOString(),
      };
    },
  );

  app.get(
    '/lrs-configs/:configId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ message: 'Tenant context is required' });
      }

      const { configId } = request.params as { configId: string };

      const lrsConfig = await getLrsConfig(config, configId, tenantId);

      if (!lrsConfig) {
        return reply.status(404).send({ message: 'LRS configuration not found' });
      }

      return {
        id: lrsConfig.id,
        tenantId: lrsConfig.tenantId,
        name: lrsConfig.name,
        endpoint: lrsConfig.endpoint,
        authKeyId: lrsConfig.authKeyId,
        version: lrsConfig.version,
        enabled: lrsConfig.enabled,
        batchingEnabled: lrsConfig.batchingEnabled,
        batchSize: lrsConfig.batchSize,
        retryMaxAttempts: lrsConfig.retryMaxAttempts,
        retryBaseDelayMs: lrsConfig.retryBaseDelayMs,
        createdAt: lrsConfig.createdAt.toISOString(),
        updatedAt: lrsConfig.updatedAt.toISOString(),
      };
    },
  );

  app.patch(
    '/lrs-configs/:configId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ message: 'Tenant context is required' });
      }

      const { configId } = request.params as { configId: string };

      const parseResult = lrsConfigUpdateSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.errors,
          },
        });
      }

      const updates = Object.fromEntries(
        Object.entries(parseResult.data).filter(([, v]) => v !== undefined),
      );
      const updatedConfig = await updateLrsConfig(config, configId, tenantId, updates);

      if (!updatedConfig) {
        return reply.status(404).send({ message: 'LRS configuration not found' });
      }

      return {
        id: updatedConfig.id,
        tenantId: updatedConfig.tenantId,
        name: updatedConfig.name,
        endpoint: updatedConfig.endpoint,
        authKeyId: updatedConfig.authKeyId,
        version: updatedConfig.version,
        enabled: updatedConfig.enabled,
        batchingEnabled: updatedConfig.batchingEnabled,
        batchSize: updatedConfig.batchSize,
        retryMaxAttempts: updatedConfig.retryMaxAttempts,
        retryBaseDelayMs: updatedConfig.retryBaseDelayMs,
        createdAt: updatedConfig.createdAt.toISOString(),
        updatedAt: updatedConfig.updatedAt.toISOString(),
      };
    },
  );

  app.delete(
    '/lrs-configs/:configId',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request, reply) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ message: 'Tenant context is required' });
      }

      const { configId } = request.params as { configId: string };

      const deleted = await deleteLrsConfig(config, configId, tenantId);

      if (!deleted) {
        return reply.status(404).send({ message: 'LRS configuration not found' });
      }

      return reply.status(204).send();
    },
  );

  app.post(
    '/lrs/send-pending',
    {
      preHandler: [authGuard, tenantContext],
    },
    async (request) => {
      const tenantId = request.tenantContext?.tenantId;
      if (!tenantId) {
        return { sent: 0, failed: 0 };
      }

      return sendPendingStatements(config, tenantId);
    },
  );
}
