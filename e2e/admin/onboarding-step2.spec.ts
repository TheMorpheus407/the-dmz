import { test as base, expect, type Page } from '@playwright/test';

import { generateUniqueDomain } from './onboarding-helpers';

const test = base;

const fillStep1AndNavigateToStep2 = async (page: Page) => {
  await page.fill('#org-name', 'Test Organization');
  await page.fill('#org-domain', generateUniqueDomain());
  await page.selectOption('#org-industry', 'Technology');
  await page.selectOption('#org-size', '201-500');
  await page.click('button[type="submit"]');

  await expect(
    page.getByRole('heading', { name: 'Identity Provider Configuration' }),
  ).toBeVisible();
};

test.describe('Enterprise Onboarding Wizard - Step 2: IdP Configuration', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillStep1AndNavigateToStep2(page);
  });

  test('should show SAML fields when SAML 2.0 is selected', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    await expect(page.locator('#idp-entity-id')).toBeVisible();
    await expect(page.locator('#idp-sso-url')).toBeVisible();
    await expect(page.locator('#idp-certificate')).toBeVisible();
  });

  test('should show OIDC fields and hide SAML fields when OpenID Connect is selected', async ({
    page,
  }) => {
    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    await expect(page.locator('#idp-entity-id')).toBeVisible();
    await expect(page.locator('#idp-sso-url')).toBeVisible();

    await page.selectOption('#idp-type', 'oidc');

    await expect(page.locator('#oidc-client-id')).toBeVisible();
    await expect(page.locator('#oidc-client-secret')).toBeVisible();
    await expect(page.locator('#oidc-issuer')).toBeVisible();

    await expect(page.locator('#idp-entity-id')).not.toBeVisible();
    await expect(page.locator('#idp-sso-url')).not.toBeVisible();
  });

  test('should show Test Connection button and handle OIDC connection', async ({ page }) => {
    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    await page.selectOption('#idp-type', 'oidc');

    await page.fill('#oidc-client-id', 'test-client-id');
    await page.fill('#oidc-client-secret', 'test-client-secret');
    await page.fill('#oidc-issuer', 'https://oidc.example.com');

    const testConnectionButton = page.locator('button:has-text("Test Connection")');
    await expect(testConnectionButton).toBeVisible();
    await testConnectionButton.click();

    await expect(page.locator('.test-result')).toBeVisible({ timeout: 10000 });
  });

  test('should show Test Connection button and handle SAML connection', async ({ page }) => {
    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    const testConnectionButton = page.locator('button:has-text("Test Connection")');
    await expect(testConnectionButton).toBeVisible();

    await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
    await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
    await testConnectionButton.click();

    await expect(page.locator('.test-result')).toBeVisible({ timeout: 10000 });
  });

  test('should display SAML diagnostic results after test connection', async ({ page }) => {
    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
    await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');

    const testConnectionButton = page.locator('button:has-text("Test Connection")');
    await testConnectionButton.click();

    await expect(page.locator('.test-result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.test-result__status')).toBeVisible();
    await expect(page.locator('.test-result__message')).toBeVisible();
  });

  test('should display OIDC diagnostic results after test connection', async ({ page }) => {
    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    await page.selectOption('#idp-type', 'oidc');
    await page.fill('#oidc-client-id', 'test-client-id');
    await page.fill('#oidc-client-secret', 'test-client-secret');
    await page.fill('#oidc-issuer', 'https://oidc.example.com');

    const testConnectionButton = page.locator('button:has-text("Test Connection")');
    await testConnectionButton.click();

    await expect(page.locator('.test-result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.test-result__status')).toBeVisible();
    await expect(page.locator('.test-result__message')).toBeVisible();
  });

  test('should navigate to step 3 after saving IdP config', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    await page.fill('#org-name', 'Test Organization');
    await page.fill('#org-domain', generateUniqueDomain());
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
    await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');

    const saveContinueButton = page.locator('button[type="submit"]:has-text("Save & Continue")');
    await saveContinueButton.click();

    await expect(page.getByRole('heading', { name: 'SCIM Token Management' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should preserve org profile data when navigating back from IdP config', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');

    const orgName = 'Test Organization';
    const orgDomain = generateUniqueDomain();

    await page.fill('#org-name', orgName);
    await page.fill('#org-domain', orgDomain);
    await page.selectOption('#org-industry', 'Technology');
    await page.selectOption('#org-size', '201-500');
    await page.click('button[type="submit"]');

    await expect(
      page.getByRole('heading', { name: 'Identity Provider Configuration' }),
    ).toBeVisible();

    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
    await expect(page.locator('#org-name')).toHaveValue(orgName);
    await expect(page.locator('#org-domain')).toHaveValue(orgDomain);
  });
});
