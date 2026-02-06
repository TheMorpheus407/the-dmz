import AxeBuilder from '@axe-core/playwright';

import { expect, test } from '../fixtures/base';

test('Axe can analyze the home page (placeholder)', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();
  expect(Array.isArray(results.violations)).toBe(true);
});
