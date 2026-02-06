import { render } from '@testing-library/svelte';

export const renderWithProviders = (...args: Parameters<typeof render>) => {
  return render(...args);
};

export { render };
