import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type E2ESetupState = {
  databaseUrl: string;
  setupCompletedAt: string;
};

const setupStatePath = resolve(process.cwd(), 'e2e', '.setup-state.json');

export const recordSetupState = async (databaseUrl: string): Promise<void> => {
  const state: E2ESetupState = {
    databaseUrl,
    setupCompletedAt: new Date().toISOString(),
  };

  await mkdir(dirname(setupStatePath), { recursive: true });
  await writeFile(setupStatePath, JSON.stringify(state, null, 2), 'utf8');
};

export const readSetupState = async (): Promise<E2ESetupState | null> => {
  try {
    const rawState = await readFile(setupStatePath, 'utf8');
    return JSON.parse(rawState) as E2ESetupState;
  } catch {
    return null;
  }
};

export const clearSetupState = async (): Promise<void> => {
  await rm(setupStatePath, { force: true });
};
