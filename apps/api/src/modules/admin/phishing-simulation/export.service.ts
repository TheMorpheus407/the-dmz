import { inArray } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../../config.js';
import { getDatabaseClient } from '../../../shared/database/connection.js';
import { users } from '../../../shared/database/schema/index.js';

import { getPhishingSimulationById } from './simulation.service.js';
import { getSimulationResults } from './results.service.js';

export const exportSimulationResults = async (
  tenantId: string,
  simulationId: string,
  format: 'csv' | 'json',
  config: AppConfig = loadConfig(),
): Promise<string> => {
  const simulation = await getPhishingSimulationById(tenantId, simulationId, config);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  const results = await getSimulationResults(tenantId, simulationId, config);

  const userIds = results.map((r) => r.userId);
  const usersWithInfo =
    userIds.length > 0
      ? await getDatabaseClient(config)
          .select({
            userId: users.userId,
            email: users.email,
            department: users.department,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.userId, userIds))
      : [];

  const userMap = new Map(usersWithInfo.map((u) => [u.userId, u]));

  const enrichedResults = results.map((r) => {
    const user = userMap.get(r.userId);
    return {
      ...r,
      userEmail: user?.email ?? '',
      userDepartment: user?.department ?? '',
      userRole: user?.role ?? '',
    };
  });

  if (format === 'csv') {
    const headers = [
      'result_id',
      'simulation_id',
      'user_id',
      'user_email',
      'department',
      'role',
      'email_delivered',
      'email_opened',
      'link_clicked',
      'clicked_at',
      'time_to_click_seconds',
      'reported',
      'reported_at',
      'time_to_report_seconds',
      'simulation_outcome',
      'teachable_moment_viewed',
      'enrolled_in_micro_training',
    ].join(',');

    const rows = enrichedResults.map((r) =>
      [
        r.resultId,
        r.simulationId,
        r.userId,
        r.userEmail,
        r.userDepartment,
        r.userRole,
        r.emailDelivered,
        r.emailOpened,
        r.linkClicked,
        r.clickedAt?.toISOString() ?? '',
        r.timeToClickSeconds ?? '',
        r.reported,
        r.reportedAt?.toISOString() ?? '',
        r.timeToReportSeconds ?? '',
        r.simulationOutcome ?? '',
        r.teachableMomentViewed,
        r.enrolledInMicroTraining,
      ].join(','),
    );

    return [headers, ...rows].join('\n');
  }

  return JSON.stringify(enrichedResults, null, 2);
};
