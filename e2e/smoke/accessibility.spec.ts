import { expectAccessible } from '../helpers/a11y';
import { expect, test } from '../fixtures/base';

test('Home page passes WCAG 2.1 AA accessibility smoke check', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Archive Gate' })).toBeVisible();

  await expectAccessible(page);
});
