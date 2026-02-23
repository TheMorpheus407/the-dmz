import { MODULE_MANIFEST, getAllModuleNames } from './manifest.js';

import type { ModuleManifestEntry, ValidationResult, ValidationError } from './manifest.types.js';

export type { ModuleManifestEntry, ValidationResult, ValidationError };

interface ValidateManifestOptions {
  entries?: ModuleManifestEntry[];
  moduleNames?: string[];
}

export function validateManifest(options?: ValidateManifestOptions): ValidationResult {
  const allEntries = options?.entries ?? [
    ...MODULE_MANIFEST.infrastructure,
    ...MODULE_MANIFEST.modules,
  ];
  const allModuleNames = options?.moduleNames ?? getAllModuleNames();
  const errors: ValidationError[] = [];
  const seenModules = new Set<string>();

  for (const entry of allEntries) {
    if (seenModules.has(entry.name)) {
      errors.push({
        type: 'duplicate_module',
        message: `Duplicate module registration: '${entry.name}'`,
        module: entry.name,
      });
    }
    seenModules.add(entry.name);

    for (const dep of entry.dependencies) {
      if (!allModuleNames.includes(dep)) {
        errors.push({
          type: 'missing_dependency',
          message: `Module '${entry.name}' depends on unknown module '${dep}'`,
          module: entry.name,
          dependency: dep,
        });
      }
    }
  }

  const cycleResult = detectCycles(allEntries);
  if (cycleResult) {
    errors.push({
      type: 'cycle',
      message: `Dependency cycle detected: ${cycleResult.join(' -> ')} -> ${cycleResult[0]}`,
      cycle: cycleResult,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function detectCycles(entries: ModuleManifestEntry[]): string[] | null {
  const graph = new Map<string, string[]>();
  const moduleNames = new Set<string>();

  for (const entry of entries) {
    graph.set(entry.name, [...entry.dependencies]);
    moduleNames.add(entry.name);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const deps = graph.get(node) ?? [];
    for (const dep of deps) {
      if (!moduleNames.has(dep)) continue;

      if (!visited.has(dep)) {
        if (dfs(dep)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        return true;
      }
    }

    path.pop();
    recursionStack.delete(node);
    return false;
  }

  for (const name of moduleNames) {
    if (!visited.has(name)) {
      if (dfs(name)) {
        const firstElement = path[0];
        return path.length > 0 && firstElement ? [...path, firstElement] : null;
      }
    }
  }

  return null;
}

export function topologicalSort(entries: ModuleManifestEntry[]): ModuleManifestEntry[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const entryMap = new Map<string, ModuleManifestEntry>();

  for (const entry of entries) {
    graph.set(entry.name, []);
    inDegree.set(entry.name, 0);
    entryMap.set(entry.name, entry);
  }

  for (const entry of entries) {
    for (const dep of entry.dependencies) {
      const dependents = graph.get(dep) ?? [];
      dependents.push(entry.name);
      graph.set(dep, dependents);
      inDegree.set(entry.name, (inDegree.get(entry.name) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  const result: ModuleManifestEntry[] = [];

  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const entry = entryMap.get(current);
    if (entry) {
      result.push(entry);
    }

    const dependents = graph.get(current) ?? [];
    for (const dependent of dependents) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  return result;
}

export function getRegistrationOrder(): ModuleManifestEntry[] {
  const allEntries = [...MODULE_MANIFEST.infrastructure, ...MODULE_MANIFEST.modules];
  return topologicalSort(allEntries);
}
