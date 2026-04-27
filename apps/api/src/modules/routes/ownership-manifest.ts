import type { RouteOwnershipManifest, RouteOwnershipEntry } from './ownership.types.js';

export const ROUTE_OWNERSHIP_MANIFEST: RouteOwnershipManifest = {
  ownership: [
    {
      module: 'auth',
      routePrefix: '/auth',
      routeTags: ['Auth'],
      ownedRoutes: [
        '/auth/register',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
        '/auth/profile',
        '/auth/admin/users',
        '/auth/mfa/webauthn/challenge',
        '/auth/mfa/webauthn/register',
        '/auth/mfa/webauthn/verify',
        '/auth/mfa/status',
        '/auth/mfa/webauthn/credentials',
        '/auth/mfa/webauthn/credentials/:credentialId',
        '/auth/api-keys',
        '/auth/api-keys/:keyId',
        '/auth/api-keys/:keyId/rotate',
        '/auth/api-keys/:keyId/revoke',
      ],
      exemptions: [
        {
          route: '/health/authenticated',
          reason: 'Auth module provides authenticated health check requiring auth context',
        },
      ],
    },
    {
      module: 'game',
      routePrefix: '/game',
      routeTags: ['Game'],
      ownedRoutes: ['/game/session'],
      exemptions: [],
    },
    {
      module: 'health',
      routePrefix: '/health',
      routeTags: ['Health'],
      ownedRoutes: ['/health', '/ready'],
      exemptions: [
        {
          route: '/ready',
          reason: 'Readiness probe at root path for Kubernetes/orchestrator compatibility',
        },
      ],
    },
    {
      module: 'content',
      routePrefix: '/content',
      routeTags: ['Content'],
      ownedRoutes: [
        '/content/emails',
        '/content/emails/:id',
        '/content/scenarios',
        '/content/scenarios/:id',
        '/content/templates/:type',
        '/content/localized/:id',
      ],
      exemptions: [],
    },
    {
      module: 'aiPipeline',
      routePrefix: '/ai',
      routeTags: ['AI'],
      ownedRoutes: [
        '/ai/prompt-templates',
        '/ai/prompt-templates/:id',
        '/ai/generate/email',
        '/ai/generate/intel-brief',
        '/ai/generate/scenario-variation',
      ],
      exemptions: [],
    },
    {
      module: 'scim',
      routePrefix: '/scim',
      routeTags: ['SCIM'],
      ownedRoutes: [
        '/scim/v2/ServiceProviderConfig',
        '/scim/v2/Schemas',
        '/scim/v2/Schemas/:id',
        '/scim/v2/ResourceTypes',
        '/scim/v2/ResourceTypes/:id',
        '/scim/v2/Users',
        '/scim/v2/Users/:id',
        '/scim/v2/Groups',
        '/scim/v2/Groups/:id',
        '/scim/v2/Bulk',
      ],
      exemptions: [],
    },
    {
      module: 'webhooks',
      routePrefix: '/webhooks',
      routeTags: ['Webhooks'],
      ownedRoutes: [
        '/subscriptions',
        '/subscriptions/:subscriptionId',
        '/subscriptions/:subscriptionId/test',
        '/subscriptions/:subscriptionId/rotate-secret',
        '/deliveries',
        '/deliveries/:deliveryId',
      ],
      exemptions: [],
    },
    {
      module: 'email',
      routePrefix: '/email',
      routeTags: ['Email'],
      ownedRoutes: [
        '/integrations',
        '/integrations/:integrationId',
        '/integrations/:integrationId/ready',
        '/integrations/:integrationId/validate',
      ],
      exemptions: [],
    },
    {
      module: 'narrative',
      routePrefix: '/api/v1/narrative',
      routeTags: ['Narrative'],
      ownedRoutes: [
        '/narrative/factions',
        '/narrative/factions/:factionKey',
        '/narrative/relations',
        '/narrative/relations/:factionId',
        '/narrative/coaching',
        '/narrative/events',
        '/narrative/events/:eventId/read',
        '/narrative/state',
        '/narrative/welcome',
      ],
      exemptions: [],
    },
    {
      module: 'settings',
      routePrefix: '/api/v1/settings',
      routeTags: ['Settings'],
      ownedRoutes: [
        '/settings/:category',
        '/settings/export',
        '/settings/account/data-export',
        '/settings/account/delete',
      ],
      exemptions: [],
    },
    {
      module: 'analytics',
      routePrefix: '/api/v1/analytics',
      routeTags: ['Analytics'],
      ownedRoutes: ['/health', '/metrics', '/phishing', '/scoring', '/trends'],
      exemptions: [],
    },
    {
      module: 'featureFlags',
      routePrefix: '/api/v1',
      routeTags: ['FeatureFlags'],
      ownedRoutes: [
        '/admin/features',
        '/admin/features/:id',
        '/admin/features/:id/override',
        '/features',
        '/features/:key',
      ],
      exemptions: [],
    },
    {
      module: 'scorm',
      routePrefix: '/api/v1/scorm',
      routeTags: ['SCORM'],
      ownedRoutes: [
        '/packages',
        '/packages/:packageId',
        '/packages/:packageId/registrations',
        '/registrations',
        '/registrations/:registrationId',
      ],
      exemptions: [],
    },
    {
      module: 'xapi',
      routePrefix: '/api/v1/xapi',
      routeTags: ['xAPI'],
      ownedRoutes: [
        '/statements',
        '/statements/:statementId',
        '/archive',
        '/lrs-configs',
        '/lrs-configs/:configId',
        '/lrs/send-pending',
      ],
      exemptions: [],
    },
    {
      module: 'billing',
      routePrefix: '/api/v1/billing',
      routeTags: ['Billing'],
      ownedRoutes: [
        '/subscription',
        '/plans',
        '/seats',
        '/seats/history',
        '/entitlements',
        '/entitlements/features',
        '/invoices',
        '/stripe-customer',
      ],
      exemptions: [],
    },
    {
      module: 'retention',
      routePrefix: '/api/v1/retention',
      routeTags: ['Retention'],
      ownedRoutes: [
        '/admin/retention/policies',
        '/admin/retention/policies/:dataCategory',
        '/admin/retention/frameworks',
        '/admin/retention/frameworks/apply',
        '/admin/retention/archives',
        '/admin/retention/archives/:archiveId',
        '/admin/retention/archives/stats',
        '/admin/retention/job-history',
        '/retention/defaults',
      ],
      exemptions: [],
    },
    {
      module: 'achievements',
      routePrefix: '/api/v1',
      routeTags: ['Achievements'],
      ownedRoutes: [
        '/api/v1/achievements',
        '/api/v1/players/me/achievements',
        '/api/v1/players/:playerId/achievements',
        '/api/v1/players/me/achievements/:id/share',
        '/api/v1/achievements/enterprise',
      ],
      exemptions: [],
    },
    {
      module: 'multiplayer',
      routePrefix: '/api/v1',
      routeTags: ['Multiplayer'],
      ownedRoutes: [
        '/api/v1/parties',
        '/api/v1/parties/:partyId/join',
        '/api/v1/parties/:partyId/leave',
        '/api/v1/parties/:partyId/ready',
        '/api/v1/parties/:partyId/role',
        '/api/v1/parties/:partyId/launch',
        '/api/v1/parties/:partyId',
        '/api/v1/parties/:partyId/regenerate-invite',
      ],
      exemptions: [],
    },
    {
      module: 'coopScenarios',
      routePrefix: '/coop',
      routeTags: ['CoopScenarios'],
      ownedRoutes: ['/coop/scenarios', '/coop/scenarios/:scenarioId'],
      exemptions: [],
    },
    {
      module: 'chat',
      routePrefix: '/api/v1/chat',
      routeTags: ['Chat'],
      ownedRoutes: [
        '/api/v1/chat/channels',
        '/api/v1/chat/channels/:channelId',
        '/api/v1/chat/channels/:channelId/messages',
        '/api/v1/chat/channels/:channelId/messages/:messageId',
        '/api/v1/chat/channels/:channelId/report',
      ],
      exemptions: [],
    },
  ],
};

export function getRouteOwnership(moduleName: string): RouteOwnershipEntry | undefined {
  return ROUTE_OWNERSHIP_MANIFEST.ownership.find((o) => o.module === moduleName);
}

export function isRouteOwnedByModule(moduleName: string, routePath: string): boolean {
  const ownership = getRouteOwnership(moduleName);
  if (!ownership) return false;

  if (ownership.exemptions.some((e) => e.route === routePath)) {
    return true;
  }

  return routePath.startsWith(ownership.routePrefix);
}

export function getRouteOwner(routePath: string): string | undefined {
  for (const ownership of ROUTE_OWNERSHIP_MANIFEST.ownership) {
    if (routePath.startsWith(ownership.routePrefix)) {
      return ownership.module;
    }
    if (ownership.exemptions.some((e) => e.route === routePath)) {
      return ownership.module;
    }
  }
  return undefined;
}

export function isRouteRegistered(routePath: string): boolean {
  return getRouteOwner(routePath) !== undefined;
}
