import type { ElementContext, RunOptions, AxeResults } from 'axe-core';

export type { ElementContext, RunOptions, AxeResults };

type AxeCoreModule = {
  default: (element: ElementContext, options?: RunOptions) => Promise<AxeResults>;
};

let axeInstance: AxeCoreModule | null = null;

export async function getAxe(): Promise<AxeCoreModule> {
  if (!axeInstance) {
    axeInstance = (await import('axe-core')) as AxeCoreModule;
  }
  return axeInstance;
}
