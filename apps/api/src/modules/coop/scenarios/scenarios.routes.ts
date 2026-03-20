import { authGuard } from '../../../shared/middleware/authorization.js';
import { tenantContext } from '../../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../../shared/middleware/error-handler.js';

import {
  COOP_SCENARIO_IDS,
  getAllScenarios,
  getScenarioById,
  getScenariosByDifficulty,
  type CoopScenarioId,
  type CoopScenarioDefinition,
} from './scenarios.js';
import {
  getScenarioScaling,
  validateScenarioConfig,
  type ScenarioScalingResult,
} from './scenario.engine.js';

import type { AppConfig } from '../../../config.js';
import type { FastifyInstance } from 'fastify';

type DifficultyTierInput = 'training' | 'standard' | 'hardened' | 'nightmare';

const scenarioSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    threatDomain: { type: 'array', items: { type: 'string' } },
    difficultyTiers: { type: 'array', items: { type: 'string' } },
    emailRouting: { type: 'string' },
    uniqueMechanics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mechanicType: { type: 'string' },
          description: { type: 'string' },
          config: { type: 'object', additionalProperties: true },
        },
        required: ['mechanicType', 'description', 'config'],
      },
    },
    phaseOverrides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phaseId: { type: 'string' },
          durationModifier: { type: 'number' },
          enabled: { type: 'boolean' },
        },
        required: ['phaseId', 'enabled'],
      },
    },
    successConditions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          targetValue: { type: 'number' },
        },
        required: ['type', 'description'],
      },
    },
    failureConditions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          thresholdValue: { type: 'number' },
        },
        required: ['type', 'description'],
      },
    },
    narrativeSetup: { type: 'string' },
    narrativeExit: { type: 'string' },
  },
  required: [
    'id',
    'name',
    'description',
    'threatDomain',
    'difficultyTiers',
    'emailRouting',
    'uniqueMechanics',
    'phaseOverrides',
    'successConditions',
    'failureConditions',
    'narrativeSetup',
    'narrativeExit',
  ],
};

const scenarioListResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    scenarios: { type: 'array', items: scenarioSchema },
  },
  required: ['success', 'scenarios'],
};

const scalingSchema = {
  type: 'object',
  properties: {
    emailVolumeMultiplier: { type: 'number' },
    threatProbabilityBonus: { type: 'number' },
    breachSeverityBonus: { type: 'number' },
    timePressureMultiplier: { type: 'number' },
  },
  required: [
    'emailVolumeMultiplier',
    'threatProbabilityBonus',
    'breachSeverityBonus',
    'timePressureMultiplier',
  ],
};

const scenarioDetailResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    scenario: scenarioSchema,
    scaling: { ...scalingSchema, nullable: true },
  },
  required: ['success', 'scenario'],
};

function transformScenario(scenario: CoopScenarioDefinition) {
  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    threatDomain: scenario.threatDomain,
    difficultyTiers: scenario.difficultyTiers,
    emailRouting: scenario.emailRouting,
    uniqueMechanics: scenario.uniqueMechanics,
    phaseOverrides: scenario.phaseOverrides,
    successConditions: scenario.successConditions,
    failureConditions: scenario.failureConditions,
    narrativeSetup: scenario.narrativeSetup,
    narrativeExit: scenario.narrativeExit,
  };
}

export async function coopScenarioRoutes(
  fastify: FastifyInstance,
  _config: AppConfig,
): Promise<void> {
  fastify.get(
    '/coop/scenarios',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            difficulty: { type: 'string', enum: ['training', 'standard', 'hardened', 'nightmare'] },
          },
        },
        response: {
          200: scenarioListResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const query = request.query as { difficulty?: DifficultyTierInput };
      let scenarios: CoopScenarioDefinition[];

      if (query?.difficulty) {
        scenarios = getScenariosByDifficulty(query.difficulty);
      } else {
        scenarios = getAllScenarios();
      }

      return {
        success: true,
        scenarios: scenarios.map(transformScenario),
      };
    },
  );

  fastify.get<{ Params: { scenarioId: string } }>(
    '/coop/scenarios/:scenarioId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            scenarioId: { type: 'string' },
          },
          required: ['scenarioId'],
        },
        querystring: {
          type: 'object',
          properties: {
            difficulty: { type: 'string', enum: ['training', 'standard', 'hardened', 'nightmare'] },
          },
        },
        response: {
          200: scenarioDetailResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const { scenarioId } = request.params;
      const query = request.query as { difficulty?: DifficultyTierInput };

      if (!COOP_SCENARIO_IDS.includes(scenarioId as CoopScenarioId)) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: `Scenario not found: ${scenarioId}`,
          statusCode: 404,
        });
      }

      const scenario = getScenarioById(scenarioId as CoopScenarioId);
      let scaling: ScenarioScalingResult | undefined;

      if (query?.difficulty) {
        const validation = validateScenarioConfig({
          scenarioId,
          difficultyTier: query.difficulty,
        });

        if (!validation.valid) {
          throw new AppError({
            code: ErrorCodes.INVALID_INPUT,
            message: validation.error ?? 'Invalid scenario configuration',
            statusCode: 400,
          });
        }

        scaling = getScenarioScaling(scenarioId as CoopScenarioId, query.difficulty);
      }

      return {
        success: true,
        scenario: transformScenario(scenario),
        scaling: scaling
          ? {
              emailVolumeMultiplier: scaling.emailVolumeMultiplier,
              threatProbabilityBonus: scaling.threatProbabilityBonus,
              breachSeverityBonus: scaling.breachSeverityBonus,
              timePressureMultiplier: scaling.timePressureMultiplier,
            }
          : undefined,
      };
    },
  );
}
