import { randomUUID } from 'crypto';

import { eq, and, inArray, sql as sqlFn } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { users } from '../../shared/database/schema/users.js';
import {
  campaigns,
  campaignEnrollments,
  campaignAudience,
} from '../../shared/database/schema/training/campaign.schema.js';

import { getCampaignById } from './campaign-crud.service.js';

import type {
  CampaignEnrollment,
  EnrollmentStatus,
  CampaignProgressMetrics,
} from './campaign.types.js';

export const getCampaignProgress = async (
  tenantId: string,
  campaignId: string,
  config: AppConfig = loadConfig(),
): Promise<CampaignProgressMetrics | null> => {
  const db = getDatabaseClient(config);

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, campaignId)))
    .limit(1);

  if (!campaign) {
    return null;
  }

  const enrollmentsResult = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const enrollments = enrollmentsResult;
  const totalEnrolled = enrollments.length;
  const notStarted = enrollments.filter((e) => e.status === 'not_started').length;
  const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;
  const completed = enrollments.filter((e) => e.status === 'completed').length;
  const completionRate = totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0;

  const completedEnrollments = enrollments.filter((e) => e.completedAt && e.enrolledAt);
  const averageTimeToComplete =
    completedEnrollments.length > 0
      ? completedEnrollments.reduce((acc: number, e) => {
          const diff =
            e.completedAt && e.enrolledAt
              ? new Date(e.completedAt).getTime() - new Date(e.enrolledAt).getTime()
              : 0;
          return acc + diff;
        }, 0) /
        completedEnrollments.length /
        (1000 * 60 * 60 * 24)
      : null;

  const userIds = enrollments.map((e) => e.userId);
  type UserDeptRole = { userId: string; department: string | null; role: string | null };

  const rawUsersWithDept =
    userIds.length > 0
      ? await db

          .select({
            userId: users.userId,

            department: users.department,

            role: users.role,
          })
          .from(users)

          .where(inArray(users.userId, userIds))
      : [];
  const usersWithDept: UserDeptRole[] = rawUsersWithDept as UserDeptRole[];

  const userMap = new Map<string, UserDeptRole>(usersWithDept.map((u) => [u.userId, u]));

  const deptMap = new Map<string, { total: number; completed: number }>();
  const roleMap = new Map<string, { total: number; completed: number }>();

  for (const enrollment of enrollments) {
    const user = userMap.get(enrollment.userId);
    const dept = user?.department ?? 'Unknown';
    const role = user?.role ?? 'Unknown';

    const deptStats = deptMap.get(dept) ?? { total: 0, completed: 0 };
    deptStats.total++;
    if (enrollment.status === 'completed') deptStats.completed++;
    deptMap.set(dept, deptStats);

    const roleStats = roleMap.get(role) ?? { total: 0, completed: 0 };
    roleStats.total++;
    if (enrollment.status === 'completed') roleStats.completed++;
    roleMap.set(role, roleStats);
  }

  const byDepartment = Array.from(deptMap.entries()).map(([department, stats]) => ({
    department,
    total: stats.total,
    completed: stats.completed,
    rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
  }));

  const byRole = Array.from(roleMap.entries()).map(([role, stats]) => ({
    role,
    total: stats.total,
    completed: stats.completed,
    rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
  }));

  return {
    totalEnrolled,
    notStarted,
    inProgress,
    completed,
    completionRate,
    averageTimeToComplete,
    byDepartment,
    byRole,
  };
};

export const enrollUsersInCampaign = async (
  tenantId: string,
  campaignId: string,
  userIds: string[],
  config: AppConfig = loadConfig(),
): Promise<CampaignEnrollment[]> => {
  const db = getDatabaseClient(config);

  const campaign = await getCampaignById(tenantId, campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const existingEnrollmentsResult = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.campaignId, campaignId),
        inArray(campaignEnrollments.userId, userIds),
      ),
    );

  const existingEnrollments = existingEnrollmentsResult;
  const existingUserIds = new Set(existingEnrollments.map((e) => e.userId));
  const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

  const defaultDueDate = campaign.startDate
    ? new Date(campaign.startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const enrollmentsToCreate = newUserIds.map((userId) => ({
    enrollmentId: randomUUID(),
    campaignId,
    userId,
    status: 'not_started' as const,
    enrolledAt: new Date(),
    dueDate: defaultDueDate,
    reminderCount: 0,
  }));

  if (enrollmentsToCreate.length > 0) {
    await db.insert(campaignEnrollments).values(enrollmentsToCreate);
  }

  const allEnrollmentsResult = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const allEnrollments = allEnrollmentsResult;
  return allEnrollments.map(
    (e): CampaignEnrollment => ({
      enrollmentId: e.enrollmentId,
      campaignId: e.campaignId,
      userId: e.userId,
      status: e.status as EnrollmentStatus,
      enrolledAt: new Date(e.enrolledAt),
      completedAt: e.completedAt ? new Date(e.completedAt) : null,
      dueDate: e.dueDate ? new Date(e.dueDate) : null,
      lastReminderAt: e.lastReminderAt ? new Date(e.lastReminderAt) : null,
      reminderCount: e.reminderCount,
      createdAt: new Date(e.createdAt),
      updatedAt: new Date(e.updatedAt),
    }),
  );
};

export const getEligibleUsersForCampaign = async (
  tenantId: string,
  campaignId: string,
  config: AppConfig = loadConfig(),
): Promise<string[]> => {
  const db = getDatabaseClient(config);

  const audienceResult = await db
    .select()
    .from(campaignAudience)
    .where(eq(campaignAudience.campaignId, campaignId))
    .limit(1);

  const audience = audienceResult[0];

  if (!audience) {
    return [];
  }

  const conditions: ReturnType<typeof eq>[] = [
    eq(users.tenantId, tenantId),

    eq(users.isActive, true),
  ];

  type UserAttributes = {
    userId: string;
    department: string | null;
    role: string | null;
    title: string | null;
  };

  const rawUserList = await db
    .select({
      userId: users.userId,

      department: users.department,

      role: users.role,

      title: users.title,
    })
    .from(users)
    .where(and(...conditions));
  const userList: UserAttributes[] = rawUserList as UserAttributes[];

  const eligibleUserIds: string[] = [];

  for (const user of userList) {
    let isEligible = true;

    const userDepartment = user.department ?? '';
    const userRole = user.role ?? '';

    const deptArray = audience.departments as string[];
    const roleArray = audience.roles as string[];

    if (deptArray && deptArray.length > 0) {
      isEligible = isEligible && deptArray.includes(userDepartment);
    }

    if (roleArray && roleArray.length > 0) {
      isEligible = isEligible && roleArray.includes(userRole);
    }

    if (audience.attributeFilters && Object.keys(audience.attributeFilters).length > 0) {
      const filters = audience.attributeFilters;
      for (const [key, value] of Object.entries(filters)) {
        if ((user as Record<string, unknown>)[key] !== value) {
          isEligible = false;
          break;
        }
      }
    }

    if (isEligible) {
      eligibleUserIds.push(user.userId);
    }
  }

  return eligibleUserIds;
};

const MAX_INTERVENTIONS_PER_WEEK = 2;

export const checkInterventionThrottling = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  type UserTenant = { tenantId: string };

  const rawUserResult = await db
    .select({
      tenantId: users.tenantId,
    })
    .from(users)

    .where(eq(users.userId, userId))
    .limit(1);
  const userResult: (UserTenant | undefined)[] = rawUserResult as UserTenant[];

  const user = userResult[0];
  if (!user || user.tenantId !== tenantId) {
    throw new Error('User not found or does not belong to your tenant');
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [result] = await db
    .select({ count: sqlFn`count(*)` })
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.userId, userId),
        sqlFn`${campaignEnrollments.enrolledAt} >= ${oneWeekAgo}`,
      ),
    );

  const count = Number(result?.count ?? 0);
  return count < MAX_INTERVENTIONS_PER_WEEK;
};

export const updateEnrollmentStatus = async (
  tenantId: string,
  enrollmentId: string,
  status: EnrollmentStatus,
  config: AppConfig = loadConfig(),
): Promise<CampaignEnrollment | null> => {
  const db = getDatabaseClient(config);

  const [enrollment] = await db
    .select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.enrollmentId, enrollmentId))
    .limit(1);

  if (!enrollment) {
    return null;
  }

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.tenantId, tenantId), eq(campaigns.campaignId, enrollment.campaignId)))
    .limit(1);

  if (!campaign) {
    return null;
  }

  const updateData: {
    status: EnrollmentStatus;
    updatedAt: Date;
    completedAt?: Date;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'completed') {
    updateData.completedAt = new Date();
  }

  const [updated] = await db
    .update(campaignEnrollments)
    .set(updateData)
    .where(eq(campaignEnrollments.enrollmentId, enrollmentId))
    .returning();

  if (!updated) {
    return null;
  }

  return {
    enrollmentId: updated.enrollmentId,
    campaignId: updated.campaignId,
    userId: updated.userId,
    status: updated.status as EnrollmentStatus,
    enrolledAt: new Date(updated.enrolledAt),
    completedAt: updated.completedAt ? new Date(updated.completedAt) : null,
    dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
    lastReminderAt: updated.lastReminderAt ? new Date(updated.lastReminderAt) : null,
    reminderCount: updated.reminderCount,
    createdAt: new Date(updated.createdAt),
    updatedAt: new Date(updated.updatedAt),
  };
};
