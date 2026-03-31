export {
  computeCompositeScore,
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CAPS,
} from './score-calculator.service.js';
export type { ScoreWeights, LeaderboardMetrics } from './score-calculator.service.js';

export { filterEntriesByPrivacy, applyPrivacyFilter } from './privacy-filter.service.js';

export {
  listLeaderboards,
  getLeaderboardById,
  getLeaderboardEntries,
  getPlayerPosition,
  getPlayerRanks,
  getFriendsLeaderboard,
  getGuildLeaderboard,
} from './consumer-leaderboard.service.js';
export type {
  LeaderboardResult,
  LeaderboardEntriesResult,
  LeaderboardEntryWithPlayer,
  PlayerRankResult,
  PlayerRanksResult,
  PlayerRankInfo,
  ScoreUpdateInput,
  FriendsLeaderboardResult,
} from './consumer-leaderboard.service.js';

export { buildLeaderboardKey } from './leaderboard-score.service.js';

export {
  listEnterpriseLeaderboards,
  getEnterpriseLeaderboardEntries,
  getPlayerEnterprisePosition,
  getDepartmentLeaderboard,
  getCorporationLeaderboard,
  getTeamSummary,
  updatePrivacyLevel,
} from './enterprise-leaderboard.service.js';
export type {
  EnterpriseLeaderboardEntry,
  EnterpriseLeaderboardResult,
  TeamSummaryResult,
} from './enterprise-leaderboard.service.js';

export {
  updatePlayerScore,
  updateEnterprisePlayerScore,
  type ScoreUpdateInput as LeaderboardScoreUpdateInput,
} from './leaderboard-score.service.js';

export type { LeaderboardMetrics, ScoreWeights } from '../db/schema/social/index.js';
