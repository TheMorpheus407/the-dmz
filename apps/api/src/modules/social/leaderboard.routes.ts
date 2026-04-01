export {
  scopeSchema,
  rankingCategorySchema,
  timeFrameSchema,
  leaderboardResponseSchema,
  leaderboardListResponseSchema,
  leaderboardEntryResponseSchema,
  leaderboardEntriesResponseSchema,
  playerRankResponseSchema,
  playerRanksResponseSchema,
  playerPositionResponseSchema,
  leaderboardsQuerySchema,
  leaderboardEntriesQuerySchema,
  friendsLeaderboardQuerySchema,
  guildLeaderboardQuerySchema,
} from './consumer-leaderboard.routes.js';

export {
  enterpriseScopeSchema,
  privacyLevelSchema,
  leaderboardTypeSchema,
  enterpriseLeaderboardResponseSchema,
  enterpriseLeaderboardListResponseSchema,
  enterpriseLeaderboardEntryResponseSchema,
  enterpriseLeaderboardEntriesResponseSchema,
  teamSummaryResponseSchema,
  updatePrivacyLevelBodySchema,
  enterpriseLeaderboardsQuerySchema,
  enterpriseLeaderboardEntriesQuerySchema,
  departmentLeaderboardQuerySchema,
  corporationLeaderboardQuerySchema,
} from './enterprise-leaderboard.routes.js';

export { registerConsumerLeaderboardRoutes } from './consumer-leaderboard.routes.js';
export { registerEnterpriseLeaderboardRoutes } from './enterprise-leaderboard.routes.js';

import { registerConsumerLeaderboardRoutes } from './consumer-leaderboard.routes.js';
import { registerEnterpriseLeaderboardRoutes } from './enterprise-leaderboard.routes.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

export async function leaderboardRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  await registerConsumerLeaderboardRoutes(fastify, config);
  await registerEnterpriseLeaderboardRoutes(fastify, config);
}
