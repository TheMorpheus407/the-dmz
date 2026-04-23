import { test as base, expect, type Page } from '@playwright/test';

import { generateUniqueDomain } from './onboarding-helpers';

const test = base;

const fillThroughStep2 = async (page: Page) => {
  await page.fill('#org-name', 'Test Organization');
  await page.fill('#org-domain', generateUniqueDomain());
  await page.selectOption('#org-industry', 'Technology');
  await page.selectOption('#org-size', '201-500');
  await page.click('button[type="submit"]');

  await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
  await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
  await page.click('button[type="submit"]');
};

test.describe('Enterprise Onboarding Wizard - Step 3: SCIM Token', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep2(page);
  });

  test('should show SCIM token form', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
    await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('heading', { name: 'SCIM Token Management' })).toBeVisible();
    await expect(page.locator('#scim-token-name')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Token")')).toBeVisible();
  });

  test('should preserve IdP config data when navigating back from SCIM step', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    const entityId = 'https://idp.example.com/entity';
    const ssoUrl = 'https://idp.example.com/sso/saml';
    await page.fill('#idp-entity-id', entityId);
    await page.fill('#idp-sso-url', ssoUrl);
    await page.click('button[type="submit"]');

    await expect(page.getByRole('heading', { name: 'SCIM Token Management' })).toBeVisible();

    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();
    await expect(page.locator('#idp-entity-id')).toHaveValue(entityId);
  });

  test('should generate SCIM token when form is submitted', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
    await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('heading', { name: 'SCIM Token Management' })).toBeVisible();

    await page.fill('#scim-token-name', 'Test SCIM Token');
    await page.click('button:has-text("Generate Token")');

    await expect(page.locator('.token-display')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.token-value code')).toBeVisible();
  });

  test('should show copy button after token is generated', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

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
    await expect(page.locator('button:has-text("Copy")')).toBeVisible();
  });
});
