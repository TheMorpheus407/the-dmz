import { registerEmailTemplateRoutes } from './email-templates/index.js';
import { registerScenarioRoutes } from './scenarios/index.js';
import { registerDocumentRoutes } from './documents/index.js';
import { registerLocalizedRoutes } from './localized/index.js';
import { registerSeasonRoutes } from './seasons/index.js';
import { registerChapterRoutes } from './chapters/index.js';
import { registerNarrativeRoutes } from './narrative/index.js';
import { registerDifficultyRoutes } from './difficulty/index.js';
import { registerQualityRoutes } from './quality/index.js';

import type { FastifyInstance } from 'fastify';

export const registerContentRoutes = async (fastify: FastifyInstance): Promise<void> => {
  await registerEmailTemplateRoutes(fastify);
  await registerScenarioRoutes(fastify);
  await registerDocumentRoutes(fastify);
  await registerLocalizedRoutes(fastify);
  await registerSeasonRoutes(fastify);
  await registerChapterRoutes(fastify);
  await registerNarrativeRoutes(fastify);
  await registerDifficultyRoutes(fastify);
  await registerQualityRoutes(fastify);
};
