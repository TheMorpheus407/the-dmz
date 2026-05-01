import {
  CredentialStatus as CredentialStatusValue,
  CredentialType as CredentialTypeValue,
} from '../auth/api-key-contract.js';

import { SEED_PROFILE_IDS, SEED_TENANT_IDS, SEED_USER_IDS } from './seed-ids.js';
import { createMockDate } from './mock-date.js';

import type { CredentialStatus, CredentialType } from '../auth/api-key-contract.js';

/* eslint-disable max-lines */

export type TestApiKey = {
  id: string;
  keyId: string;
  tenantId: string;
  name: string;
  type: CredentialType;
  ownerType: string;
  ownerId: string | null;
  serviceAccountId: string | null;
  secretHash: string;
  previousSecretHash: string | null;
  scopes: unknown[];
  status: CredentialStatus;
  expiresAt: Date | null;
  rotationGracePeriodDays: string;
  rotationGraceEndsAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
  metadata: unknown;
  ipAllowlist: unknown;
  refererRestrictions: unknown;
  rateLimitRequestsPerWindow: unknown;
  rateLimitWindowMs: unknown;
};

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignType = 'onboarding' | 'quarterly' | 'annual' | 'event-driven';
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed';

export type CampaignSeed = {
  campaignId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  campaignType: CampaignType;
  createdBy: string;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string;
  recurrencePattern: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignAudienceSeed = {
  audienceId: string;
  campaignId: string;
  groupIds: string[];
  departments: string[];
  locations: string[];
  roles: string[];
  attributeFilters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignContentSeed = {
  contentId: string;
  campaignId: string;
  contentType: string;
  contentItemId: string;
  orderIndex: number;
  dueDays: number | null;
  isPrerequisite: boolean;
  createdAt: Date;
};

export type CampaignEnrollmentSeed = {
  enrollmentId: string;
  campaignId: string;
  userId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  lastReminderAt: Date | null;
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignTemplateSeed = {
  templateId: string;
  tenantId: string;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  audienceConfig: Record<string, unknown>;
  contentConfig: Record<string, unknown>;
  scheduleConfig: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignEscalationSeed = {
  escalationId: string;
  campaignId: string;
  reminderDays: number[];
  managerNotification: boolean;
  complianceAlert: boolean;
  complianceAlertThreshold: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationDeliveryChannel = 'email' | 'in_app';
export type NotificationDeliveryStatus = 'sent' | 'suppressed_dedupe' | 'rate_limited' | 'failed';

export type NotificationSeed = {
  id: string;
  tenantId: string;
  userId: string;
  eventType: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  sentAt: Date | null;
  suppressedReason: string | null;
  failureReason: string | null;
  templateCategory: string;
  correlationId: string | null;
};

/**
 * Shape of a tenant row for seeding. Matches the Drizzle `tenants` table
 * insert type without importing drizzle-orm (keeps shared package DB-free).
 */
export type TenantSeed = {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  settings: Record<string, unknown>;
};

/**
 * Lightweight tenant type for simple tests that don't need full seed data.
 */
export type TestTenant = {
  tenantId: string;
  name: string;
  slug: string;
};

/**
 * Shape of a user row for seeding. Matches the Drizzle `users` table
 * insert type without importing drizzle-orm (keeps shared package DB-free).
 */
export type UserSeed = {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
};

/**
 * Shape of a user profile row for seeding. Matches the Drizzle `user_profiles` table
 * insert type without importing drizzle-orm (keeps shared package DB-free).
 */
export type ProfileSeed = {
  profileId: string;
  userId: string;
  tenantId: string;
  locale: string;
  timezone: string;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
};

export type RoleSeed = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
};

export type PermissionSeed = {
  id: string;
  resource: string;
  action: string;
  description: string | null;
};

export type SessionSeed = {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
  expiresAt: Date;
  mfaVerifiedAt: Date | null;
  mfaMethod: string | null;
  mfaFailedAttempts: number;
  mfaLockedAt: Date | null;
};

export type UserRoleSeed = {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  assignedBy: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

export type RolePermissionSeed = {
  roleId: string;
  permissionId: string;
};

export type SeasonSeed = {
  id: string;
  tenantId: string;
  seasonNumber: number;
  title: string;
  theme: string;
  logline: string;
  description: string | null;
  threatCurveStart: string;
  threatCurveEnd: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
};

export type ChapterSeed = {
  id: string;
  tenantId: string;
  seasonId: string;
  chapterNumber: number;
  act: number;
  title: string;
  description: string | null;
  dayStart: number;
  dayEnd: number;
  difficultyStart: number;
  difficultyEnd: number;
  threatLevel: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
};

export type EmailTemplateSeed = {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  body: string;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  contentType: string;
  difficulty: number;
  faction: string | null;
  attackType: string | null;
  threatLevel: string;
  season: number | null;
  chapter: number | null;
  language: string;
  locale: string;
  metadata: Record<string, unknown>;
  isAiGenerated: boolean;
  isActive: boolean;
};

/**
 * Build a tenant seed object with sensible defaults.
 * Does NOT insert into the database — pure data factory.
 */
export const createTestTenant = (overrides: Partial<TenantSeed> = {}): TenantSeed => ({
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'Test Tenant',
  slug: overrides.slug ?? 'test-factory',
  status: overrides.status ?? 'active',
  settings: overrides.settings ?? {},
});

/**
 * Build a lightweight tenant object for tests that don't need full seed data.
 * Uses tenantId to match the database schema column name.
 */
export const buildTestTenant = (overrides: Partial<TestTenant> = {}): TestTenant => ({
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'Test Tenant',
  slug: overrides.slug ?? 'test-tenant',
});

/**
 * Build a user seed object with sensible defaults.
 * Does NOT insert into the database — pure data factory.
 */
export const createTestUser = (overrides: Partial<UserSeed> = {}): UserSeed => ({
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  email: overrides.email ?? 'testuser@example.test',
  displayName: overrides.displayName ?? 'Test User',
  role: overrides.role ?? 'learner',
  isActive: overrides.isActive ?? true,
});

/**
 * Build a user profile seed object with sensible defaults.
 * Does NOT insert into the database — pure data factory.
 */
export const createTestProfile = (overrides: Partial<ProfileSeed> = {}): ProfileSeed => ({
  profileId: overrides.profileId ?? SEED_PROFILE_IDS.acmeCorp.learner,
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  locale: overrides.locale ?? 'en',
  timezone: overrides.timezone ?? 'UTC',
  accessibilitySettings: overrides.accessibilitySettings ?? {},
  notificationSettings: overrides.notificationSettings ?? {},
});

export const createTestRole = (overrides: Partial<RoleSeed> = {}): RoleSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'test-role',
  description: overrides.description ?? null,
  isSystem: overrides.isSystem ?? false,
});

export const createTestPermission = (overrides: Partial<PermissionSeed> = {}): PermissionSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  resource: overrides.resource ?? 'test',
  action: overrides.action ?? 'read',
  description: overrides.description ?? null,
});

export const createTestSession = (overrides: Partial<SessionSeed> = {}): SessionSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  tokenHash: overrides.tokenHash ?? 'test-hash-' + crypto.randomUUID(),
  ipAddress: overrides.ipAddress ?? null,
  userAgent: overrides.userAgent ?? null,
  deviceFingerprint: overrides.deviceFingerprint ?? null,
  expiresAt: overrides.expiresAt ?? createMockDate({ daysFromNow: 7 }),
  mfaVerifiedAt: overrides.mfaVerifiedAt ?? null,
  mfaMethod: overrides.mfaMethod ?? null,
  mfaFailedAttempts: overrides.mfaFailedAttempts ?? 0,
  mfaLockedAt: overrides.mfaLockedAt ?? null,
});

export const createTestUserRole = (overrides: Partial<UserRoleSeed> = {}): UserRoleSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  roleId: overrides.roleId ?? crypto.randomUUID(),
  assignedBy: overrides.assignedBy ?? null,
  expiresAt: overrides.expiresAt ?? null,
  scope: overrides.scope ?? null,
});

export const createTestRolePermission = (
  overrides: Partial<RolePermissionSeed> = {},
): RolePermissionSeed => ({
  roleId: overrides.roleId ?? crypto.randomUUID(),
  permissionId: overrides.permissionId ?? crypto.randomUUID(),
});

export const createTestSeason = (overrides: Partial<SeasonSeed> = {}): SeasonSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  seasonNumber: overrides.seasonNumber ?? 1,
  title: overrides.title ?? 'Test Season',
  theme: overrides.theme ?? 'Test theme',
  logline: overrides.logline ?? 'Test logline',
  description: overrides.description ?? null,
  threatCurveStart: overrides.threatCurveStart ?? 'LOW',
  threatCurveEnd: overrides.threatCurveEnd ?? 'HIGH',
  isActive: overrides.isActive ?? true,
  metadata: overrides.metadata ?? {},
});

// eslint-disable-next-line complexity
export const createTestChapter = (overrides: Partial<ChapterSeed> = {}): ChapterSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  seasonId: overrides.seasonId ?? crypto.randomUUID(),
  chapterNumber: overrides.chapterNumber ?? 1,
  act: overrides.act ?? 1,
  title: overrides.title ?? 'Test Chapter',
  description: overrides.description ?? null,
  dayStart: overrides.dayStart ?? 1,
  dayEnd: overrides.dayEnd ?? 7,
  difficultyStart: overrides.difficultyStart ?? 1,
  difficultyEnd: overrides.difficultyEnd ?? 2,
  threatLevel: overrides.threatLevel ?? 'LOW',
  isActive: overrides.isActive ?? true,
  metadata: overrides.metadata ?? {},
});

/* eslint-disable complexity */
export const createTestEmailTemplate = (
  overrides: Partial<EmailTemplateSeed> = {},
): EmailTemplateSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'Test Email',
  subject: overrides.subject ?? 'Test Subject',
  body: overrides.body ?? 'Test body content',
  fromName: overrides.fromName ?? null,
  fromEmail: overrides.fromEmail ?? null,
  replyTo: overrides.replyTo ?? null,
  contentType: overrides.contentType ?? 'phishing',
  difficulty: overrides.difficulty ?? 1,
  faction: overrides.faction ?? null,
  attackType: overrides.attackType ?? null,
  threatLevel: overrides.threatLevel ?? 'LOW',
  season: overrides.season ?? null,
  chapter: overrides.chapter ?? null,
  language: overrides.language ?? 'en',
  locale: overrides.locale ?? 'en-US',
  metadata: overrides.metadata ?? {},
  isAiGenerated: overrides.isAiGenerated ?? false,
  isActive: overrides.isActive ?? true,
});
/* eslint-enable complexity */

/**
 * The canonical set of tenants used by the seed script.
 * Exported so both the API seed and E2E setup can reference the same data.
 */
export const SEED_TENANTS: readonly TenantSeed[] = [
  {
    tenantId: SEED_TENANT_IDS.system,
    name: 'The DMZ',
    slug: 'system',
    status: 'active',
    settings: {},
  },
  {
    tenantId: SEED_TENANT_IDS.acmeCorp,
    name: 'Acme Corp',
    slug: 'acme-corp',
    status: 'active',
    settings: { plan: 'enterprise' },
  },
  {
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    name: 'Consumer Platform',
    slug: 'consumer',
    status: 'active',
    settings: { plan: 'consumer' },
  },
  {
    tenantId: SEED_TENANT_IDS.inactiveCo,
    name: 'Inactive Co',
    slug: 'inactive-co',
    status: 'suspended',
    settings: {},
  },
] as const;

/**
 * The canonical set of users used by the seed script.
 * Exported so both the API seed and E2E setup can reference the same data.
 */
export const SEED_USERS: readonly UserSeed[] = [
  {
    userId: SEED_USER_IDS.acmeCorp.superAdmin,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'admin@acme.test',
    displayName: 'Acme Admin',
    role: 'super_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.acmeCorp.tenantAdmin,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'tenant-admin@acme.test',
    displayName: 'Acme Tenant Admin',
    role: 'tenant_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.acmeCorp.manager,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'manager@acme.test',
    displayName: 'Acme Manager',
    role: 'manager',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.acmeCorp.learner,
    tenantId: SEED_TENANT_IDS.acmeCorp,
    email: 'learner@acme.test',
    displayName: 'Acme Learner',
    role: 'learner',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.superAdmin,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'admin@consumer.test',
    displayName: 'Consumer Admin',
    role: 'super_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.tenantAdmin,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'tenant-admin@consumer.test',
    displayName: 'Consumer Tenant Admin',
    role: 'tenant_admin',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.manager,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'manager@consumer.test',
    displayName: 'Consumer Manager',
    role: 'manager',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.consumerPlatform.learner,
    tenantId: SEED_TENANT_IDS.consumerPlatform,
    email: 'player@consumer.test',
    displayName: 'Consumer Player',
    role: 'learner',
    isActive: true,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.superAdmin,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'admin@inactive.test',
    displayName: 'Inactive Admin',
    role: 'super_admin',
    isActive: false,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.tenantAdmin,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'tenant-admin@inactive.test',
    displayName: 'Inactive Tenant Admin',
    role: 'tenant_admin',
    isActive: false,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.manager,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'manager@inactive.test',
    displayName: 'Inactive Manager',
    role: 'manager',
    isActive: false,
  },
  {
    userId: SEED_USER_IDS.inactiveCo.learner,
    tenantId: SEED_TENANT_IDS.inactiveCo,
    email: 'learner@inactive.test',
    displayName: 'Inactive Learner',
    role: 'learner',
    isActive: false,
  },
] as const;

const DEFAULT_ACCESSIBILITY_SETTINGS = {
  reducedMotion: false,
  highContrast: false,
  screenReader: false,
  fontSize: 'normal',
} as const;

const DEFAULT_NOTIFICATION_SETTINGS = {
  email: true,
  push: false,
  sms: false,
  marketing: false,
} as const;

const buildProfile = (
  tenantKey: keyof typeof SEED_PROFILE_IDS,
  roleKey: keyof (typeof SEED_PROFILE_IDS)[keyof typeof SEED_PROFILE_IDS],
): ProfileSeed => ({
  profileId: SEED_PROFILE_IDS[tenantKey][roleKey],
  userId: SEED_USER_IDS[tenantKey][roleKey],
  tenantId: SEED_TENANT_IDS[tenantKey],
  locale: 'en',
  timezone: 'UTC',
  accessibilitySettings: { ...DEFAULT_ACCESSIBILITY_SETTINGS },
  notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
});

export const SEED_PROFILES: readonly ProfileSeed[] = [
  buildProfile('acmeCorp', 'superAdmin'),
  buildProfile('acmeCorp', 'tenantAdmin'),
  buildProfile('acmeCorp', 'manager'),
  buildProfile('acmeCorp', 'learner'),
  buildProfile('consumerPlatform', 'superAdmin'),
  buildProfile('consumerPlatform', 'tenantAdmin'),
  buildProfile('consumerPlatform', 'manager'),
  buildProfile('consumerPlatform', 'learner'),
  buildProfile('inactiveCo', 'superAdmin'),
  buildProfile('inactiveCo', 'tenantAdmin'),
  buildProfile('inactiveCo', 'manager'),
  buildProfile('inactiveCo', 'learner'),
] as const;

export const createTestApiKey = (overrides: Partial<TestApiKey> = {}): TestApiKey => ({
  id: 'test-id',
  keyId: 'test-key-id',
  tenantId: 'test-tenant',
  name: 'Test Key',
  type: CredentialTypeValue.API_KEY,
  ownerType: 'service',
  ownerId: null,
  serviceAccountId: null,
  secretHash: 'hashed-secret',
  previousSecretHash: null,
  scopes: [],
  status: CredentialStatusValue.ACTIVE,
  expiresAt: null,
  rotationGracePeriodDays: '7',
  rotationGraceEndsAt: null,
  lastUsedAt: null,
  createdBy: 'test-user',
  createdAt: createMockDate(),
  updatedAt: createMockDate(),
  revokedAt: null,
  revokedBy: null,
  revocationReason: null,
  metadata: null,
  ipAllowlist: null,
  refererRestrictions: null,
  rateLimitRequestsPerWindow: null,
  rateLimitWindowMs: null,
  ...overrides,
});

export const createTestCampaign = (overrides: Partial<CampaignSeed> = {}): CampaignSeed => ({
  campaignId: overrides.campaignId ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'Test Campaign',
  description: overrides.description ?? null,
  status: overrides.status ?? 'draft',
  campaignType: overrides.campaignType ?? 'onboarding',
  createdBy: overrides.createdBy ?? SEED_USER_IDS.acmeCorp.tenantAdmin,
  startDate: overrides.startDate ?? null,
  endDate: overrides.endDate ?? null,
  timezone: overrides.timezone ?? 'UTC',
  recurrencePattern: overrides.recurrencePattern ?? 'one-time',
  createdAt: overrides.createdAt ?? createMockDate(),
  updatedAt: overrides.updatedAt ?? createMockDate(),
});

export const createTestCampaignAudience = (
  overrides: Partial<CampaignAudienceSeed> = {},
): CampaignAudienceSeed => ({
  audienceId: overrides.audienceId ?? crypto.randomUUID(),
  campaignId: overrides.campaignId ?? crypto.randomUUID(),
  groupIds: overrides.groupIds ?? [],
  departments: overrides.departments ?? [],
  locations: overrides.locations ?? [],
  roles: overrides.roles ?? [],
  attributeFilters: overrides.attributeFilters ?? {},
  createdAt: overrides.createdAt ?? createMockDate(),
  updatedAt: overrides.updatedAt ?? createMockDate(),
});

export const createTestCampaignContent = (
  overrides: Partial<CampaignContentSeed> = {},
): CampaignContentSeed => ({
  contentId: overrides.contentId ?? crypto.randomUUID(),
  campaignId: overrides.campaignId ?? crypto.randomUUID(),
  contentType: overrides.contentType ?? 'module',
  contentItemId: overrides.contentItemId ?? crypto.randomUUID(),
  orderIndex: overrides.orderIndex ?? 0,
  dueDays: overrides.dueDays ?? 7,
  isPrerequisite: overrides.isPrerequisite ?? false,
  createdAt: overrides.createdAt ?? createMockDate(),
});

export const createTestCampaignEnrollment = (
  overrides: Partial<CampaignEnrollmentSeed> = {},
): CampaignEnrollmentSeed => ({
  enrollmentId: overrides.enrollmentId ?? crypto.randomUUID(),
  campaignId: overrides.campaignId ?? crypto.randomUUID(),
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  status: overrides.status ?? 'not_started',
  enrolledAt: overrides.enrolledAt ?? createMockDate(),
  completedAt: overrides.completedAt ?? null,
  dueDate: overrides.dueDate ?? null,
  lastReminderAt: overrides.lastReminderAt ?? null,
  reminderCount: overrides.reminderCount ?? 0,
  createdAt: overrides.createdAt ?? createMockDate(),
  updatedAt: overrides.updatedAt ?? createMockDate(),
});

export const createTestCampaignTemplate = (
  overrides: Partial<CampaignTemplateSeed> = {},
): CampaignTemplateSeed => ({
  templateId: overrides.templateId ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  name: overrides.name ?? 'Test Campaign Template',
  description: overrides.description ?? null,
  campaignType: overrides.campaignType ?? 'onboarding',
  audienceConfig: overrides.audienceConfig ?? {},
  contentConfig: overrides.contentConfig ?? {},
  scheduleConfig: overrides.scheduleConfig ?? {},
  createdAt: overrides.createdAt ?? createMockDate(),
  updatedAt: overrides.updatedAt ?? createMockDate(),
});

export const createTestCampaignEscalation = (
  overrides: Partial<CampaignEscalationSeed> = {},
): CampaignEscalationSeed => ({
  escalationId: overrides.escalationId ?? crypto.randomUUID(),
  campaignId: overrides.campaignId ?? crypto.randomUUID(),
  reminderDays: overrides.reminderDays ?? [1, 3, 7],
  managerNotification: overrides.managerNotification ?? true,
  complianceAlert: overrides.complianceAlert ?? false,
  complianceAlertThreshold: overrides.complianceAlertThreshold ?? null,
  createdAt: overrides.createdAt ?? createMockDate(),
  updatedAt: overrides.updatedAt ?? createMockDate(),
});

export const createTestNotification = (
  overrides: Partial<NotificationSeed> = {},
): NotificationSeed => ({
  id: overrides.id ?? crypto.randomUUID(),
  tenantId: overrides.tenantId ?? SEED_TENANT_IDS.acmeCorp,
  userId: overrides.userId ?? SEED_USER_IDS.acmeCorp.learner,
  eventType: overrides.eventType ?? 'auth_security.password_reset_requested',
  channel: overrides.channel ?? 'email',
  status: overrides.status ?? 'sent',
  sentAt: overrides.sentAt ?? createMockDate(),
  suppressedReason: overrides.suppressedReason ?? null,
  failureReason: overrides.failureReason ?? null,
  templateCategory: overrides.templateCategory ?? 'password_reset',
  correlationId: overrides.correlationId ?? null,
});
