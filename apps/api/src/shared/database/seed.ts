import { pathToFileURL } from 'node:url';

import { eq, sql } from 'drizzle-orm';

import { SEED_PROFILES, SEED_TENANT_IDS, SEED_TENANTS, SEED_USERS } from '@the-dmz/shared/testing';

import { loadConfig, type AppConfig } from '../../config.js';

import { closeDatabase, getDatabaseClient, type DatabaseClient } from './connection.js';
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
  userProfiles,
  userRoles,
  users,
  avatars,
  achievementDefinitions,
  achievementIcons,
} from './schema/index.js';

export { SEED_TENANT_IDS, SEED_TENANTS, SEED_USERS, SEED_PROFILES };

const BASE_PERMISSIONS = [
  { resource: 'admin', action: 'read', description: 'View tenant admin-only content and settings' },
  {
    resource: 'admin',
    action: 'write',
    description: 'Create and update tenant admin-only content and settings',
  },
  { resource: 'users', action: 'read', description: 'View user profiles' },
  { resource: 'users', action: 'write', description: 'Create and update users' },
  { resource: 'users', action: 'delete', description: 'Deactivate or remove users' },
  { resource: 'roles', action: 'read', description: 'View role definitions' },
  { resource: 'roles', action: 'write', description: 'Create and modify roles' },
  { resource: 'reports', action: 'read', description: 'View reports and analytics' },
  { resource: 'reports', action: 'export', description: 'Export report data' },
  { resource: 'settings', action: 'read', description: 'View tenant settings' },
  { resource: 'settings', action: 'write', description: 'Modify tenant settings' },
  { resource: 'campaigns', action: 'read', description: 'View training campaigns' },
  { resource: 'campaigns', action: 'write', description: 'Create and manage campaigns' },
] as const;

const DEFAULT_ROLES = [
  { name: 'admin', description: 'Full tenant administration' },
  { name: 'manager', description: 'Team and reporting management' },
  { name: 'learner', description: 'Standard learner access' },
] as const;

const PRIMARY_ROLE_TO_DEFAULT_ROLE = {
  admin: 'admin',
  super_admin: 'admin',
  tenant_admin: 'admin',
  manager: 'manager',
  learner: 'learner',
} as const satisfies Record<
  'admin' | 'super_admin' | 'tenant_admin' | 'manager' | 'learner',
  (typeof DEFAULT_ROLES)[number]['name']
>;

const MANAGER_PERMISSION_KEYS = [
  'users:read',
  'users:write',
  'roles:read',
  'reports:read',
  'reports:export',
  'campaigns:read',
  'campaigns:write',
] as const;

const resolveDefaultRoleName = (role: string): (typeof DEFAULT_ROLES)[number]['name'] => {
  if (role in PRIMARY_ROLE_TO_DEFAULT_ROLE) {
    return PRIMARY_ROLE_TO_DEFAULT_ROLE[role as keyof typeof PRIMARY_ROLE_TO_DEFAULT_ROLE];
  }

  return 'learner';
};

type PermissionSeedRow = {
  id: string;
  resource: string;
  action: string;
};

type TenantUserRoleSeed = {
  userId: string;
  role: string;
};

const upsertBasePermissions = async (
  db: DatabaseClient,
): Promise<{
  permissionRows: PermissionSeedRow[];
  permissionByKey: Map<string, string>;
}> => {
  for (const permission of BASE_PERMISSIONS) {
    await db
      .insert(permissions)
      .values({
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      })
      .onConflictDoUpdate({
        target: [permissions.resource, permissions.action],
        set: {
          description: sql`excluded.description`,
        },
      });
  }

  const permissionRows = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(permissions);

  return {
    permissionRows,
    permissionByKey: new Map(
      permissionRows.map((permission) => [
        `${permission.resource}:${permission.action}`,
        permission.id,
      ]),
    ),
  };
};

const provisionTenantAuthModel = async (
  db: DatabaseClient,
  tenantId: string,
  permissionRows: readonly PermissionSeedRow[],
  permissionByKey: ReadonlyMap<string, string>,
  tenantUsers: readonly TenantUserRoleSeed[],
): Promise<void> => {
  await db.transaction(async (transaction) => {
    // Keep both keys in sync while the codebase transitions to a single tenant context variable.
    await transaction.execute(sql`select set_config('app.current_tenant_id', ${tenantId}, true)`);
    await transaction.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);

    for (const role of DEFAULT_ROLES) {
      await transaction
        .insert(roles)
        .values({
          tenantId,
          name: role.name,
          description: role.description,
          isSystem: true,
        })
        .onConflictDoUpdate({
          target: [roles.tenantId, roles.name],
          set: {
            description: sql`excluded.description`,
            isSystem: true,
            updatedAt: sql`now()`,
          },
        });
    }

    const tenantRoleRows = await transaction
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.tenantId, tenantId));

    const roleIdByName = new Map(tenantRoleRows.map((role) => [role.name, role.id]));
    const adminRoleId = roleIdByName.get('admin');
    const managerRoleId = roleIdByName.get('manager');

    if (adminRoleId) {
      for (const permission of permissionRows) {
        await transaction
          .insert(rolePermissions)
          .values({
            roleId: adminRoleId,
            permissionId: permission.id,
          })
          .onConflictDoNothing();
      }
    }

    if (managerRoleId) {
      for (const permissionKey of MANAGER_PERMISSION_KEYS) {
        const permissionId = permissionByKey.get(permissionKey);

        if (!permissionId) {
          continue;
        }

        await transaction
          .insert(rolePermissions)
          .values({
            roleId: managerRoleId,
            permissionId,
          })
          .onConflictDoNothing();
      }
    }

    for (const user of tenantUsers) {
      const roleName = resolveDefaultRoleName(user.role);
      const roleId = roleIdByName.get(roleName);

      if (!roleId) {
        continue;
      }

      await transaction
        .insert(userRoles)
        .values({
          tenantId,
          userId: user.userId,
          roleId,
        })
        .onConflictDoNothing();
    }
  });
};

const SEED_AVATARS = [
  {
    id: 'avatar_001',
    category: 'character_silhouette',
    name: 'Shadow Operative',
    description: 'A mysterious figure emerging from darkness',
    tags: ['military', 'stealth', 'dark'],
    rarityTier: 'rare',
    unlockCondition: 'Complete 10 solo missions',
    imageUrl: 'https://cdn.example.com/avatars/shadow-operative.png',
  },
  {
    id: 'avatar_002',
    category: 'character_silhouette',
    name: 'Cyber Enforcer',
    description: 'High-tech law enforcement officer',
    tags: ['tech', 'police', 'cyber'],
    rarityTier: 'uncommon',
    unlockCondition: 'Reach rank 5 in multiplayer',
    imageUrl: 'https://cdn.example.com/avatars/cyber-enforcer.png',
  },
  {
    id: 'avatar_003',
    category: 'character_silhouette',
    name: 'Rogue Agent',
    description: 'Freelance operative with a checkered past',
    tags: ['mercenary', 'rogue', 'independent'],
    rarityTier: 'epic',
    unlockCondition: 'Win 50 PvP matches',
    imageUrl: 'https://cdn.example.com/avatars/rogue-agent.png',
  },
  {
    id: 'avatar_004',
    category: 'character_silhouette',
    name: 'Elite Commander',
    description: 'Decorated military commander',
    tags: ['military', 'leader', 'veteran'],
    rarityTier: 'legendary',
    unlockCondition: 'Achieve 100% completion rate',
    imageUrl: 'https://cdn.example.com/avatars/elite-commander.png',
  },
  {
    id: 'avatar_005',
    category: 'character_silhouette',
    name: 'Field Medic',
    description: 'Combat medic ready for any situation',
    tags: ['medical', 'support', 'healer'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/field-medic.png',
  },
  {
    id: 'avatar_006',
    category: 'character_silhouette',
    name: 'Stealth Recon',
    description: 'Reconnaissance specialist',
    tags: ['scout', 'stealth', 'recon'],
    rarityTier: 'uncommon',
    unlockCondition: 'Complete 5 stealth missions',
    imageUrl: 'https://cdn.example.com/avatars/stealth-recon.png',
  },
  {
    id: 'avatar_007',
    category: 'character_silhouette',
    name: 'Heavy Gunner',
    description: 'Heavy weapons specialist',
    tags: ['heavy', 'weapon', 'tank'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/heavy-gunner.png',
  },
  {
    id: 'avatar_008',
    category: 'character_silhouette',
    name: 'Tactical Hacker',
    description: 'Cyber warfare expert',
    tags: ['hacker', 'cyber', 'tech'],
    rarityTier: 'rare',
    unlockCondition: 'Hack 25 objectives',
    imageUrl: 'https://cdn.example.com/avatars/tactical-hacker.png',
  },
  {
    id: 'avatar_009',
    category: 'facility_theme',
    name: 'Research Lab',
    description: 'Scientist working in a high-tech lab',
    tags: ['science', 'lab', 'research'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/research-lab.png',
  },
  {
    id: 'avatar_010',
    category: 'facility_theme',
    name: 'Security Station',
    description: 'Facility security personnel',
    tags: ['security', 'facility', 'guard'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/security-station.png',
  },
  {
    id: 'avatar_011',
    category: 'facility_theme',
    name: 'Data Center',
    description: 'IT specialist in server room',
    tags: ['tech', 'server', 'data'],
    rarityTier: 'uncommon',
    unlockCondition: 'Complete IT training module',
    imageUrl: 'https://cdn.example.com/avatars/data-center.png',
  },
  {
    id: 'avatar_012',
    category: 'facility_theme',
    name: 'Control Room',
    description: 'Operations control room operator',
    tags: ['operations', 'control', 'monitoring'],
    rarityTier: 'uncommon',
    unlockCondition: 'Monitor 10 sessions',
    imageUrl: 'https://cdn.example.com/avatars/control-room.png',
  },
  {
    id: 'avatar_013',
    category: 'facility_theme',
    name: 'Medical Bay',
    description: 'Emergency medical bay staff',
    tags: ['medical', 'emergency', 'hospital'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/medical-bay.png',
  },
  {
    id: 'avatar_014',
    category: 'facility_theme',
    name: 'Command Bridge',
    description: 'Facility command center officer',
    tags: ['command', 'leadership', 'facility'],
    rarityTier: 'epic',
    unlockCondition: 'Lead 25 successful operations',
    imageUrl: 'https://cdn.example.com/avatars/command-bridge.png',
  },
  {
    id: 'avatar_015',
    category: 'facility_theme',
    name: 'Quarantine Zone',
    description: 'Biohazard containment specialist',
    tags: ['biohazard', 'containment', 'dangerous'],
    rarityTier: 'rare',
    unlockCondition: 'Complete biohazard training',
    imageUrl: 'https://cdn.example.com/avatars/quarantine-zone.png',
  },
  {
    id: 'avatar_016',
    category: 'faction_emblem',
    name: 'Vanguard Elite',
    description: 'Member of the Vanguard faction',
    tags: ['vanguard', 'elite', 'military'],
    rarityTier: 'rare',
    unlockCondition: 'Join Vanguard faction',
    imageUrl: 'https://cdn.example.com/avatars/vanguard-elite.png',
  },
  {
    id: 'avatar_017',
    category: 'faction_emblem',
    name: 'Shadow Syndicate',
    description: 'Shadow Syndicate operative',
    tags: ['syndicate', 'rogue', 'underground'],
    rarityTier: 'epic',
    unlockCondition: 'Reach Shadow Syndicate rank 3',
    imageUrl: 'https://cdn.example.com/avatars/shadow-syndicate.png',
  },
  {
    id: 'avatar_018',
    category: 'faction_emblem',
    name: 'Civic Guard',
    description: 'Civic protection force member',
    tags: ['civic', 'guard', 'protection'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/civic-guard.png',
  },
  {
    id: 'avatar_019',
    category: 'faction_emblem',
    name: 'Tech Collective',
    description: 'Tech Collective representative',
    tags: ['tech', 'collective', 'innovation'],
    rarityTier: 'uncommon',
    unlockCondition: 'Complete tech collective orientation',
    imageUrl: 'https://cdn.example.com/avatars/tech-collective.png',
  },
  {
    id: 'avatar_020',
    category: 'faction_emblem',
    name: 'Chrono Corps',
    description: 'Temporal operations specialist',
    tags: ['chrono', 'time', 'anomaly'],
    rarityTier: 'legendary',
    unlockCondition: 'Resolve 10 temporal anomalies',
    imageUrl: 'https://cdn.example.com/avatars/chrono-corps.png',
  },
  {
    id: 'avatar_021',
    category: 'animal',
    name: 'Scout Hawk',
    description: 'Aerial reconnaissance drone styled as hawk',
    tags: ['drone', 'recon', 'aerial'],
    rarityTier: 'uncommon',
    unlockCondition: 'Complete aerial training',
    imageUrl: 'https://cdn.example.com/avatars/scout-hawk.png',
  },
  {
    id: 'avatar_022',
    category: 'animal',
    name: 'Guardian Wolf',
    description: 'Loyal companion for protection missions',
    tags: ['wolf', 'guard', 'loyal'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/guardian-wolf.png',
  },
  {
    id: 'avatar_023',
    category: 'animal',
    name: 'Serpent Agent',
    description: 'Covert operative styled after snakes',
    tags: ['snake', 'stealth', 'covert'],
    rarityTier: 'rare',
    unlockCondition: 'Complete 10 covert missions',
    imageUrl: 'https://cdn.example.com/avatars/serpent-agent.png',
  },
  {
    id: 'avatar_024',
    category: 'animal',
    name: 'Phoenix Rising',
    description: 'Symbol of rebirth and resilience',
    tags: ['phoenix', 'mythical', 'legend'],
    rarityTier: 'legendary',
    unlockCondition: 'Recover from total defeat 5 times',
    imageUrl: 'https://cdn.example.com/avatars/phoenix-rising.png',
  },
  {
    id: 'avatar_025',
    category: 'robot',
    name: 'MK-Series Enforcer',
    description: 'Military-grade enforcement android',
    tags: ['robot', 'military', 'enforcer'],
    rarityTier: 'uncommon',
    unlockCondition: 'Complete robot integration training',
    imageUrl: 'https://cdn.example.com/avatars/mk-series.png',
  },
  {
    id: 'avatar_026',
    category: 'robot',
    name: 'Helper Bot',
    description: 'Friendly assistance robot',
    tags: ['robot', 'helper', 'assistant'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/helper-bot.png',
  },
  {
    id: 'avatar_027',
    category: 'robot',
    name: 'Sentinel AI',
    description: 'Advanced AI security system',
    tags: ['ai', 'security', 'sentinel'],
    rarityTier: 'epic',
    unlockCondition: 'Achieve AI trust level 5',
    imageUrl: 'https://cdn.example.com/avatars/sentinel-ai.png',
  },
  {
    id: 'avatar_028',
    category: 'geometric',
    name: 'Prism Defender',
    description: 'Geometric defense specialist',
    tags: ['geometric', 'defense', 'shield'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/prism-defender.png',
  },
  {
    id: 'avatar_029',
    category: 'geometric',
    name: 'Cube Walker',
    description: 'Mysterious geometric entity',
    tags: ['geometric', 'mysterious', 'entity'],
    rarityTier: 'uncommon',
    unlockCondition: 'Discover 3 hidden geometric anomalies',
    imageUrl: 'https://cdn.example.com/avatars/cube-walker.png',
  },
  {
    id: 'avatar_030',
    category: 'geometric',
    name: 'Nova Form',
    description: 'Stellar energy being',
    tags: ['nova', 'stellar', 'energy'],
    rarityTier: 'rare',
    unlockCondition: 'Harness nova power',
    imageUrl: 'https://cdn.example.com/avatars/nova-form.png',
  },
  {
    id: 'avatar_031',
    category: 'geometric',
    name: 'Void Walker',
    description: 'Entity from the void between dimensions',
    tags: ['void', 'dimensional', 'mysterious'],
    rarityTier: 'legendary',
    unlockCondition: 'Traverse the void successfully',
    imageUrl: 'https://cdn.example.com/avatars/void-walker.png',
  },
  {
    id: 'avatar_032',
    category: 'character',
    name: 'Rookie Agent',
    description: 'Fresh out of training',
    tags: ['newbie', 'training', 'beginner'],
    rarityTier: 'common',
    unlockCondition: 'Default avatar',
    imageUrl: 'https://cdn.example.com/avatars/rookie-agent.png',
  },
  {
    id: 'avatar_033',
    category: 'character',
    name: 'Veteran Operative',
    description: 'Experienced field operative',
    tags: ['veteran', 'experienced', 'operative'],
    rarityTier: 'uncommon',
    unlockCondition: 'Complete 50 missions',
    imageUrl: 'https://cdn.example.com/avatars/veteran-operative.png',
  },
] as const;

const seedAvatars = async (db: DatabaseClient): Promise<void> => {
  for (const avatar of SEED_AVATARS) {
    await db
      .insert(avatars)
      .values({
        id: avatar.id,
        category: avatar.category,
        name: avatar.name,
        description: avatar.description,
        tags: [...avatar.tags] as string[],
        rarityTier: avatar.rarityTier,
        unlockCondition: avatar.unlockCondition,
        imageUrl: avatar.imageUrl,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [avatars.id],
        set: {
          category: sql`excluded.category`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          tags: sql`excluded.tags`,
          rarityTier: sql`excluded.rarity_tier`,
          unlockCondition: sql`excluded.unlock_condition`,
          imageUrl: sql`excluded.image_url`,
          isActive: true,
        },
      });
  }
};

const SEED_ACHIEVEMENT_ICONS = [
  {
    id: 'icon_001',
    iconKey: 'shield-check',
    category: 'competency',
    rarity: 'common',
    isAnimated: false,
  },
  {
    id: 'icon_002',
    iconKey: 'target-lock',
    category: 'competency',
    rarity: 'uncommon',
    isAnimated: false,
  },
  {
    id: 'icon_003',
    iconKey: 'eye-closed',
    category: 'competency',
    rarity: 'rare',
    isAnimated: false,
  },
  {
    id: 'icon_004',
    iconKey: 'fingerprint',
    category: 'competency',
    rarity: 'epic',
    isAnimated: true,
  },
  {
    id: 'icon_005',
    iconKey: 'brain-circuit',
    category: 'competency',
    rarity: 'legendary',
    isAnimated: true,
  },
  {
    id: 'icon_006',
    iconKey: 'mail-warning',
    category: 'competency',
    rarity: 'uncommon',
    isAnimated: false,
  },
  { id: 'icon_007', iconKey: 'eagle', category: 'animal', rarity: 'rare', isAnimated: false },
  { id: 'icon_008', iconKey: 'wolf', category: 'animal', rarity: 'uncommon', isAnimated: false },
  { id: 'icon_009', iconKey: 'snake', category: 'animal', rarity: 'rare', isAnimated: false },
  { id: 'icon_010', iconKey: 'phoenix', category: 'animal', rarity: 'legendary', isAnimated: true },
  { id: 'icon_011', iconKey: 'bot', category: 'robot', rarity: 'common', isAnimated: false },
  { id: 'icon_012', iconKey: 'android', category: 'robot', rarity: 'uncommon', isAnimated: false },
  { id: 'icon_013', iconKey: 'cpu', category: 'robot', rarity: 'rare', isAnimated: false },
  { id: 'icon_014', iconKey: 'sentinel', category: 'robot', rarity: 'epic', isAnimated: true },
  {
    id: 'icon_015',
    iconKey: 'hexagon',
    category: 'geometric',
    rarity: 'common',
    isAnimated: false,
  },
  {
    id: 'icon_016',
    iconKey: 'prism',
    category: 'geometric',
    rarity: 'uncommon',
    isAnimated: false,
  },
  { id: 'icon_017', iconKey: 'cube', category: 'geometric', rarity: 'rare', isAnimated: false },
  { id: 'icon_018', iconKey: 'nova', category: 'geometric', rarity: 'epic', isAnimated: true },
  { id: 'icon_019', iconKey: 'star', category: 'milestone', rarity: 'common', isAnimated: false },
  {
    id: 'icon_020',
    iconKey: 'trophy',
    category: 'milestone',
    rarity: 'uncommon',
    isAnimated: false,
  },
  { id: 'icon_021', iconKey: 'crown', category: 'milestone', rarity: 'rare', isAnimated: false },
  { id: 'icon_022', iconKey: 'medal', category: 'milestone', rarity: 'epic', isAnimated: true },
  {
    id: 'icon_023',
    iconKey: 'badge-check',
    category: 'milestone',
    rarity: 'legendary',
    isAnimated: true,
  },
  {
    id: 'icon_024',
    iconKey: 'user-check',
    category: 'character',
    rarity: 'common',
    isAnimated: false,
  },
  {
    id: 'icon_025',
    iconKey: 'users',
    category: 'character',
    rarity: 'uncommon',
    isAnimated: false,
  },
  {
    id: 'icon_026',
    iconKey: 'user-star',
    category: 'character',
    rarity: 'rare',
    isAnimated: false,
  },
  { id: 'icon_027', iconKey: 'zap', category: 'competency', rarity: 'rare', isAnimated: true },
  { id: 'icon_028', iconKey: 'flame', category: 'animal', rarity: 'epic', isAnimated: true },
  {
    id: 'icon_029',
    iconKey: 'globe',
    category: 'milestone',
    rarity: 'uncommon',
    isAnimated: false,
  },
  { id: 'icon_030', iconKey: 'rocket', category: 'milestone', rarity: 'rare', isAnimated: true },
] as const;

const seedAchievementIcons = async (db: DatabaseClient): Promise<void> => {
  for (const icon of SEED_ACHIEVEMENT_ICONS) {
    await db
      .insert(achievementIcons)
      .values({
        id: icon.id,
        iconKey: icon.iconKey,
        category: icon.category,
        rarity: icon.rarity,
        isAnimated: icon.isAnimated,
      })
      .onConflictDoUpdate({
        target: [achievementIcons.id],
        set: {
          iconKey: sql`excluded.icon_key`,
          category: sql`excluded.category`,
          rarity: sql`excluded.rarity`,
          isAnimated: sql`excluded.is_animated`,
        },
      });
  }
};

const SEED_ACHIEVEMENTS = [
  {
    achievementKey: 'phishing_hunter_100',
    category: 'core_competency',
    visibility: 'visible',
    title: 'Phishing Hunter',
    description: 'Correctly deny 100 phishing emails',
    iconId: 'icon_006',
    competencyDomains: ['phishing_detection'],
    enterpriseReportable: true,
    points: 100,
    criteria: { eventType: 'game.decision.denied', conditions: { count: 100 } },
  },
  {
    achievementKey: 'phishing_hunter_500',
    category: 'core_competency',
    visibility: 'visible',
    title: 'Phishing Eliminator',
    description: 'Correctly deny 500 phishing emails',
    iconId: 'icon_006',
    competencyDomains: ['phishing_detection'],
    enterpriseReportable: true,
    points: 250,
    criteria: { eventType: 'game.decision.denied', conditions: { count: 500 } },
  },
  {
    achievementKey: 'verification_pro',
    category: 'core_competency',
    visibility: 'visible',
    title: 'Verification Pro',
    description: 'Use verification packets on 50 suspicious emails',
    iconId: 'icon_002',
    competencyDomains: ['verification_discipline'],
    enterpriseReportable: true,
    points: 150,
    criteria: { eventType: 'game.verification.packet_opened', conditions: { count: 50 } },
  },
  {
    achievementKey: 'first_response',
    category: 'core_competency',
    visibility: 'visible',
    title: 'First Response',
    description: 'Resolve your first incident',
    iconId: 'icon_024',
    competencyDomains: ['incident_response'],
    enterpriseReportable: true,
    points: 50,
    criteria: { eventType: 'game.incident.resolved', conditions: { count: 1 } },
  },
  {
    achievementKey: 'accuracy_master',
    category: 'core_competency',
    visibility: 'visible',
    title: 'Accuracy Master',
    description: 'Maintain 95%+ accuracy over 30 sessions',
    iconId: 'icon_003',
    competencyDomains: ['decision_accuracy'],
    enterpriseReportable: true,
    points: 200,
    criteria: {
      eventType: 'game.session.completed',
      conditions: { accuracyThreshold: 0.95, count: 30 },
    },
  },
  {
    achievementKey: 'efficient_operator',
    category: 'operational_mastery',
    visibility: 'visible',
    title: 'Efficient Operator',
    description: 'Complete 10 sessions with no resource warnings',
    iconId: 'icon_011',
    competencyDomains: ['resource_management'],
    enterpriseReportable: false,
    points: 100,
    criteria: { eventType: 'game.session.completed', conditions: { count: 10 } },
  },
  {
    achievementKey: 'facility_manager',
    category: 'operational_mastery',
    visibility: 'visible',
    title: 'Facility Manager',
    description: 'Purchase 5 facility upgrades',
    iconId: 'icon_015',
    competencyDomains: ['upgrade_planning'],
    enterpriseReportable: false,
    points: 100,
    criteria: { eventType: 'game.upgrade.purchased', conditions: { count: 5 } },
  },
  {
    achievementKey: 'streak_warrior_7',
    category: 'operational_mastery',
    visibility: 'visible',
    title: 'Streak Warrior',
    description: 'Maintain a 7-day login streak',
    iconId: 'icon_027',
    competencyDomains: ['consistency'],
    enterpriseReportable: false,
    points: 75,
    criteria: { eventType: 'game.session.started', conditions: { consecutiveDays: 7 } },
  },
  {
    achievementKey: 'streak_warrior_30',
    category: 'operational_mastery',
    visibility: 'visible',
    title: 'Iron Will',
    description: 'Maintain a 30-day login streak',
    iconId: 'icon_027',
    competencyDomains: ['consistency'],
    enterpriseReportable: false,
    points: 300,
    criteria: { eventType: 'game.session.started', conditions: { consecutiveDays: 30 } },
  },
  {
    achievementKey: 'team_player',
    category: 'social_contribution',
    visibility: 'visible',
    title: 'Team Player',
    description: 'Complete 5 co-op sessions',
    iconId: 'icon_025',
    competencyDomains: ['collaboration'],
    enterpriseReportable: false,
    points: 100,
    criteria: { eventType: 'game.session.completed', conditions: { count: 5 } },
  },
  {
    achievementKey: 'mentor',
    category: 'social_contribution',
    visibility: 'visible',
    title: 'Mentor',
    description: 'Help another player resolve an incident',
    iconId: 'icon_026',
    competencyDomains: ['leadership'],
    enterpriseReportable: false,
    points: 150,
    criteria: { eventType: 'game.incident.resolved', conditions: { count: 1 } },
  },
  {
    achievementKey: 'signal_restored',
    category: 'narrative_milestone',
    visibility: 'visible',
    title: 'Signal Restored',
    description: 'Complete Chapter 1',
    iconId: 'icon_019',
    competencyDomains: ['narrative_progress'],
    enterpriseReportable: false,
    points: 200,
    criteria: { eventType: 'game.session.completed', conditions: { count: 1 } },
  },
  {
    achievementKey: 'faction_ally',
    category: 'narrative_milestone',
    visibility: 'visible',
    title: 'Faction Ally',
    description: 'Reach Friendly status with any faction',
    iconId: 'icon_029',
    competencyDomains: ['faction_relations'],
    enterpriseReportable: false,
    points: 150,
    criteria: { eventType: 'game.session.completed', conditions: { count: 1 } },
  },
  {
    achievementKey: 'season_one_veteran',
    category: 'narrative_milestone',
    visibility: 'visible',
    title: 'Season One Veteran',
    description: 'Complete Season 1',
    iconId: 'icon_023',
    competencyDomains: ['season_progress'],
    enterpriseReportable: true,
    points: 500,
    criteria: { eventType: 'game.session.completed', conditions: { count: 100 } },
  },
  {
    achievementKey: 'eagle_eye',
    category: 'hidden_badge',
    visibility: 'hidden',
    title: 'Eagle Eye',
    description: 'Deny a phishing email in under 3 seconds',
    iconId: 'icon_007',
    competencyDomains: ['phishing_detection'],
    enterpriseReportable: false,
    points: 50,
    criteria: { eventType: 'game.decision.denied', conditions: { count: 1 } },
  },
  {
    achievementKey: 'hidden_gem',
    category: 'hidden_badge',
    visibility: 'hidden',
    title: 'Hidden Gem',
    description: 'Use all 5 verification methods in one session',
    iconId: 'icon_014',
    competencyDomains: ['verification_discipline'],
    enterpriseReportable: false,
    points: 100,
    criteria: { eventType: 'game.verification.packet_opened', conditions: { count: 5 } },
  },
  {
    achievementKey: 'perfectionist',
    category: 'hidden_badge',
    visibility: 'hidden',
    title: 'Perfectionist',
    description: 'Complete a day with 100% accuracy and no hints used',
    iconId: 'icon_004',
    competencyDomains: ['decision_accuracy'],
    enterpriseReportable: false,
    points: 200,
    criteria: { eventType: 'game.session.completed', conditions: { accuracyThreshold: 1.0 } },
  },
  {
    achievementKey: 'threat_hunter',
    category: 'core_competency',
    visibility: 'visible',
    title: 'Threat Hunter',
    description: 'Mitigate 50 attacks',
    iconId: 'icon_001',
    competencyDomains: ['threat_mitigation'],
    enterpriseReportable: true,
    points: 150,
    criteria: { eventType: 'threat.attack.mitigated', conditions: { count: 50 } },
  },
  {
    achievementKey: 'level_50_veteran',
    category: 'narrative_milestone',
    visibility: 'visible',
    title: 'Level 50 Veteran',
    description: 'Reach level 50',
    iconId: 'icon_021',
    competencyDomains: ['level_progression'],
    enterpriseReportable: true,
    points: 500,
    criteria: { eventType: 'game.economy.level_up', conditions: { count: 50 } },
  },
  {
    achievementKey: 'decade_defender',
    category: 'core_competency',
    visibility: 'visible',
    title: 'Decade Defender',
    description: 'Correctly deny 1000 phishing emails',
    iconId: 'icon_005',
    competencyDomains: ['phishing_detection'],
    enterpriseReportable: true,
    points: 500,
    criteria: { eventType: 'game.decision.denied', conditions: { count: 1000 } },
  },
] as const;

const seedAchievements = async (db: DatabaseClient): Promise<void> => {
  for (const achievement of SEED_ACHIEVEMENTS) {
    await db
      .insert(achievementDefinitions)
      .values({
        achievementKey: achievement.achievementKey,
        category: achievement.category,
        visibility: achievement.visibility,
        title: achievement.title,
        description: achievement.description,
        iconId: achievement.iconId,
        competencyDomains: [...achievement.competencyDomains] as string[],
        enterpriseReportable: achievement.enterpriseReportable,
        points: achievement.points,
        criteria: achievement.criteria,
      })
      .onConflictDoUpdate({
        target: [achievementDefinitions.achievementKey],
        set: {
          category: sql`excluded.category`,
          visibility: sql`excluded.visibility`,
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          iconId: sql`excluded.icon_id`,
          competencyDomains: sql`excluded.competency_domains`,
          enterpriseReportable: sql`excluded.enterprise_reportable`,
          points: sql`excluded.points`,
          criteria: sql`excluded.criteria`,
        },
      });
  }
};

export const seedTenantAuthModel = async (
  config: AppConfig = loadConfig(),
  tenantId: string,
  tenantUsers: readonly TenantUserRoleSeed[] = [],
): Promise<void> => {
  const db = getDatabaseClient(config);
  const { permissionRows, permissionByKey } = await upsertBasePermissions(db);
  await provisionTenantAuthModel(db, tenantId, permissionRows, permissionByKey, tenantUsers);
};

/**
 * Seed the database with deterministic tenant and user data.
 *
 * Idempotent: uses `ON CONFLICT ... DO UPDATE` so running the seed
 * multiple times always converges to the canonical seed state.
 */
export const seedDatabase = async (config: AppConfig = loadConfig()): Promise<void> => {
  const db = getDatabaseClient(config);

  for (const tenant of SEED_TENANTS) {
    await db
      .insert(tenants)
      .values({
        tenantId: tenant.tenantId,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        settings: tenant.settings,
      })
      .onConflictDoUpdate({
        target: [tenants.slug],
        set: {
          name: sql`excluded.name`,
          status: sql`excluded.status`,
          settings: sql`excluded.settings`,
          updatedAt: sql`now()`,
        },
      });
  }

  const tenantRows = await db.select({ tenantId: tenants.tenantId }).from(tenants);
  const seedUsersByTenant = new Map<string, (typeof SEED_USERS)[number][]>();

  for (const seedUser of SEED_USERS) {
    const tenantUsers = seedUsersByTenant.get(seedUser.tenantId) ?? [];
    tenantUsers.push(seedUser);
    seedUsersByTenant.set(seedUser.tenantId, tenantUsers);
  }

  const { permissionRows, permissionByKey } = await upsertBasePermissions(db);

  // Verify the system tenant exists
  const tenantResult = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(eq(tenants.slug, 'system'))
    .limit(1);

  if (tenantResult.length === 0) {
    throw new Error('System tenant seeding failed');
  }

  for (const user of SEED_USERS) {
    await db
      .insert(users)
      .values({
        userId: user.userId,
        tenantId: user.tenantId,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
      })
      .onConflictDoUpdate({
        target: [users.userId],
        set: {
          email: sql`excluded.email`,
          displayName: sql`excluded.display_name`,
          role: sql`excluded.role`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }

  for (const profile of SEED_PROFILES) {
    await db
      .insert(userProfiles)
      .values({
        profileId: profile.profileId,
        userId: profile.userId,
        tenantId: profile.tenantId,
        locale: profile.locale,
        timezone: profile.timezone,
        accessibilitySettings: profile.accessibilitySettings,
        notificationSettings: profile.notificationSettings,
      })
      .onConflictDoUpdate({
        target: [userProfiles.profileId],
        set: {
          locale: sql`excluded.locale`,
          timezone: sql`excluded.timezone`,
          accessibilitySettings: sql`excluded.accessibility_settings`,
          notificationSettings: sql`excluded.notification_settings`,
          updatedAt: sql`now()`,
        },
      });
  }

  for (const tenant of tenantRows) {
    const tenantSeedUsers = (seedUsersByTenant.get(tenant.tenantId) ?? []).map((user) => ({
      userId: user.userId,
      role: user.role,
    }));
    await provisionTenantAuthModel(
      db,
      tenant.tenantId,
      permissionRows,
      permissionByKey,
      tenantSeedUsers,
    );
  }

  await seedAvatars(db);
  await seedAchievementIcons(db);
  await seedAchievements(db);

  console.warn(
    `Seeded ${SEED_TENANTS.length} tenants, ${SEED_USERS.length} users, ` +
      `${SEED_PROFILES.length} profiles, ` +
      `${BASE_PERMISSIONS.length} permissions, ${DEFAULT_ROLES.length} default roles, ` +
      `${SEED_AVATARS.length} avatars, ` +
      `${SEED_ACHIEVEMENT_ICONS.length} achievement icons, ` +
      `${SEED_ACHIEVEMENTS.length} achievements.`,
  );
};

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  seedDatabase()
    .then(() => closeDatabase())
    .catch((error) => {
      console.error('Database seed failed', error);
      process.exit(1);
    });
}
