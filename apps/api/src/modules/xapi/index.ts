import { registerXapiRoutes } from './xapi.routes.js';

import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';

export async function xapiPlugin(instance: FastifyInstance, config: AppConfig): Promise<void> {
  await registerXapiRoutes(instance, config);
}

export { registerXapiRoutes };

export {
  generateXapiStatement,
  buildActorFromUser,
  buildActivityFromGameContent,
  buildResultFromDecision,
  buildContext,
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
  convertStatementToJson,
  XAPI_VERBS,
  XAPI_ACTIVITY_UNKNOWN,
  DMZ_VERB_MAP,
  getVerbFromMapping,
  isCorrectDecisionVerb,
  isIncorrectDecisionVerb,
  generateStatementId,
  convertSecondsToIso8601,
  type XapiVersion,
  type XapiVerbId,
  type XapiActor,
  type XapiVerb,
  type XapiActivity,
  type XapiResult,
  type XapiContext,
  type XapiStatementTemplate,
  type XapiStatementDoc,
} from './xapi.service.js';
