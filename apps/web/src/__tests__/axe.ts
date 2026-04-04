import type { ElementContext, RunOptions, AxeResults } from 'axe-core';

export type { ElementContext, RunOptions, AxeResults };

let axeInstance: AxeResults | null = null;

export async function getAxe(): Promise<AxeResults> {
  if (!axeInstance) {
    const axeModule = await import('axe-core');
    // @ts-expect-error - axe-core default export doesn't have proper types
    axeInstance = axeModule.default;
  }
  // @ts-expect-error - axe-core results compatible with test expectations
  return axeInstance;
}
