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
