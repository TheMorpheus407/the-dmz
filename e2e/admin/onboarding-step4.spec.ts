import { test as base, expect, type Page } from '@playwright/test';

import { generateUniqueDomain } from './onboarding-helpers';

const test = base;

const fillThroughStep3 = async (page: Page) => {
  await page.fill('#org-name', 'Test Organization');
  await page.fill('#org-domain', generateUniqueDomain());
  await page.selectOption('#org-industry', 'Technology');
  await page.selectOption('#org-size', '201-500');
  await page.click('button[type="submit"]');

  await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
  await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
  await page.click('button[type="submit"]');

  await page.fill('#scim-token-name', 'Test SCIM Token');
  await page.click('button:has-text("Generate Token")');
  await expect(page.locator('.token-display')).toBeVisible({ timeout: 10000 });
  await page.click('button:has-text("Continue to Compliance")');
};

test.describe('Enterprise Onboarding Wizard - Step 4: Compliance Framework Selection', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);
  });

  test('should show compliance framework checkboxes', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);

    await expect(
      page.getByRole('heading', { name: 'Compliance Framework Selection' }),
    ).toBeVisible();
    await expect(page.locator('.frameworks-grid')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
  });

  test('should allow selecting compliance frameworks', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);

    const gdprCheckbox = page
      .locator('.framework-checkbox')
      .filter({ hasText: 'GDPR' })
      .locator('input[type="checkbox"]');
    const hipaaCheckbox = page
      .locator('.framework-checkbox')
      .filter({ hasText: 'HIPAA' })
      .locator('input[type="checkbox"]');

    await gdprCheckbox.check();
    await hipaaCheckbox.check();

    await expect(gdprCheckbox).toBeChecked();
    await expect(hipaaCheckbox).toBeChecked();
  });

  test('should allow selecting regulatory region', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);

    await page.selectOption('#regulatory-region', 'eu');

    await expect(page.locator('#regulatory-region')).toHaveValue('eu');
  });

  test('should allow filling compliance coordinator fields', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);

    await expect(
      page.getByRole('heading', { name: 'Compliance Framework Selection' }),
    ).toBeVisible();

    await expect(page.locator('#coordinator-name')).toBeVisible();
    await expect(page.locator('#coordinator-email')).toBeVisible();
    await expect(page.locator('#coordinator-phone')).toBeVisible();

    await page.fill('#coordinator-name', 'John Doe');
    await page.fill('#coordinator-email', 'john.doe@example.com');
    await page.fill('#coordinator-phone', '+1-555-123-4567');

    await expect(page.locator('#coordinator-name')).toHaveValue('John Doe');
    await expect(page.locator('#coordinator-email')).toHaveValue('john.doe@example.com');
    await expect(page.locator('#coordinator-phone')).toHaveValue('+1-555-123-4567');
  });

  test('should navigate to review step after saving compliance', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);

    const gdprCheckbox = page
      .locator('.framework-checkbox')
      .filter({ hasText: 'GDPR' })
      .locator('input[type="checkbox"]');
    await gdprCheckbox.check();

    await page.click('button[type="submit"]');

    await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should preserve SCIM token data when navigating back from Compliance step', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep3(page);

    await expect(
      page.getByRole('heading', { name: 'Compliance Framework Selection' }),
    ).toBeVisible();

    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await expect(page.getByRole('heading', { name: 'SCIM Token Management' })).toBeVisible();
    await expect(page.locator('.token-display')).toBeVisible();
  });
});
