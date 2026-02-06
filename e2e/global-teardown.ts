import { cleanupTestData } from './helpers/cleanup';
import { clearSetupState, readSetupState } from './helpers/setup-state';

const globalTeardown = async (): Promise<void> => {
  const setupState = await readSetupState();

  if (setupState === null) {
    return;
  }

  try {
    await cleanupTestData(setupState.databaseUrl);
  } catch (error) {
    console.warn('Skipping E2E teardown cleanup after setup failure.', error);
  } finally {
    await clearSetupState();
  }
};

export default globalTeardown;
