import type { ModuleManifest } from './manifest.types.js';

export const MODULE_MANIFEST: ModuleManifest = {
  infrastructure: [
    {
      name: 'infrastructure',
      pluginPath: './shared/plugins/infrastructure.plugin.js',
      dependencies: [],
      startupFlags: { required: true, diagnostics: true },
    },
    {
      name: 'eventBus',
      pluginPath: './shared/events/event-bus.plugin.js',
      dependencies: ['infrastructure'],
      startupFlags: { required: true, diagnostics: true },
    },
  ],
  modules: [
    {
      name: 'health',
      pluginPath: './modules/health/index.js',
      dependencies: [],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'auth',
      pluginPath: './modules/auth/index.js',
      routePrefix: '/auth',
      dependencies: ['eventBus'],
      startupFlags: { required: true, diagnostics: true },
    },
    {
      name: 'game',
      pluginPath: './modules/game/game.plugin.js',
      routePrefix: '/game',
      dependencies: ['eventBus'],
      startupFlags: { required: true, diagnostics: true },
    },
    {
      name: 'scim',
      pluginPath: './modules/scim/index.js',
      routePrefix: '/scim',
      dependencies: ['eventBus'],
      startupFlags: { required: true, diagnostics: true },
    },
    {
      name: 'webhooks',
      pluginPath: './modules/webhooks/index.js',
      routePrefix: '/webhooks',
      dependencies: ['eventBus'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'email',
      pluginPath: './modules/email/index.js',
      routePrefix: '/email',
      dependencies: ['eventBus'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'content',
      pluginPath: './modules/content/index.js',
      routePrefix: '/content',
      dependencies: ['eventBus'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'aiPipeline',
      pluginPath: './modules/ai-pipeline/index.js',
      routePrefix: '/ai',
      dependencies: ['eventBus', 'content'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'narrative',
      pluginPath: './modules/narrative/index.js',
      routePrefix: '/api/v1/narrative',
      dependencies: ['eventBus', 'content'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'settings',
      pluginPath: './modules/settings/index.js',
      routePrefix: '/api/v1/settings',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: true, diagnostics: true },
    },
    {
      name: 'analytics',
      pluginPath: './modules/analytics/index.js',
      routePrefix: '/api/v1/analytics',
      dependencies: ['eventBus'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'featureFlags',
      pluginPath: './modules/feature-flags/index.js',
      routePrefix: '/api/v1',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'scorm',
      pluginPath: './modules/scorm/index.js',
      routePrefix: '/api/v1/scorm',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'xapi',
      pluginPath: './modules/xapi/index.js',
      routePrefix: '/api/v1/xapi',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'billing',
      pluginPath: './modules/billing/index.js',
      routePrefix: '/api/v1/billing',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'retention',
      pluginPath: './modules/retention/index.js',
      routePrefix: '/api/v1/retention',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'achievements',
      pluginPath: './modules/achievements/index.js',
      routePrefix: '/api/v1',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'multiplayer',
      pluginPath: './modules/multiplayer/index.js',
      routePrefix: '/api/v1',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
    {
      name: 'chat',
      pluginPath: './modules/chat/index.js',
      routePrefix: '/api/v1/chat',
      dependencies: ['eventBus', 'auth'],
      startupFlags: { required: false, diagnostics: true },
    },
  ],
};

export function getAllModuleNames(): string[] {
  const infraNames = MODULE_MANIFEST.infrastructure.map((m) => m.name);
  const moduleNames = MODULE_MANIFEST.modules.map((m) => m.name);
  return [...infraNames, ...moduleNames];
}

export function getModuleByName(name: string) {
  const infra = MODULE_MANIFEST.infrastructure.find((m) => m.name === name);
  if (infra) return infra;
  return MODULE_MANIFEST.modules.find((m) => m.name === name);
}
