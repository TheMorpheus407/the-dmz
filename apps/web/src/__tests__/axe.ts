import type { ElementContext, RunOptions, AxeResults } from 'axe-core';

export type { ElementContext, RunOptions, AxeResults };

// axe-core module namespace type
type AxeCore = {
  (element: ElementContext, options?: RunOptions): Promise<AxeResults>;
  run(element: ElementContext, options?: RunOptions): Promise<AxeResults>;
};

let axeInstance: AxeCore | null = null;

export async function getAxe(): Promise<AxeCore> {
  if (!axeInstance) {
    const axeModule = await import('axe-core');
    axeInstance = axeModule.default as unknown as AxeCore;
  }
  return axeInstance;
}
