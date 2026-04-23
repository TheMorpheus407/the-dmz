import { test, expect } from '../fixtures/auth';

import type { Page } from '@playwright/test';

const generateUniqueProviderName = () => `SAML Provider ${Date.now()}${Math.random().toFixed(6)}`;

const getProviderActions = (page: Page, providerName: string) => {
  return page
    .locator('.provider-name', { hasText: providerName })
    .locator('..')
    .locator('..')
    .locator('.provider-actions');
};

test.describe('SAML Provider Configuration (/admin/saml)', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/saml');
  });

  test('should display empty state when no providers exist', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'No SAML Providers Configured' })).toBeVisible();
    await expect(
      page.getByText(
        'Add your first SAML identity provider to enable single sign-on for your organization',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add SAML Provider' })).toBeVisible();
  });

  test('should open create modal when clicking Add SAML Provider button', async ({ page }) => {
    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).toBeVisible();
    await expect(page.locator('#providerName')).toBeVisible();
    await expect(page.locator('#metadataUrl')).toBeVisible();
    await expect(page.locator('#idpCert')).toBeVisible();
    await expect(page.locator('#spPrivateKey')).toBeVisible();
    await expect(page.locator('#spCert')).toBeVisible();
  });

  test('should create a new SAML provider', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).toBeVisible();

    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.fill(
      '#idpCert',
      '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIBADA...\n-----END CERTIFICATE-----',
    );
    await page.fill(
      '#spCert',
      '-----BEGIN CERTIFICATE-----\nMIIBjTCB+wIBADA...\n-----END CERTIFICATE-----',
    );

    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).not.toBeVisible();

    await expect(page.getByText(providerName)).toBeVisible();
    await expect(page.getByText('Configured')).toBeVisible();
  });

  test('should validate required fields when creating provider', async ({ page }) => {
    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).toBeVisible();

    await page.fill('#providerName', 'Test Provider');
    await page.fill('#metadataUrl', '');

    const submitButton = page.getByRole('button', { name: 'Create Provider' });
    await submitButton.click();

    await expect(page.getByText('Name and Metadata URL are required')).toBeVisible();
  });

  test('should show error when metadata URL is invalid', async ({ page }) => {
    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).toBeVisible();

    await page.fill('#providerName', 'Test Provider');
    await page.fill('#metadataUrl', 'not-a-valid-url');

    const submitButton = page.getByRole('button', { name: 'Create Provider' });
    await submitButton.click();

    await expect(page.locator('#metadataUrl')).toBeInvalid();
    await expect(page.locator('#metadataUrl')).toHaveAttribute('aria-invalid', 'true');
  });

  test('should close create modal when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Add SAML Provider' })).not.toBeVisible();
  });

  test('should edit an existing SAML provider', async ({ page }) => {
    const originalName = generateUniqueProviderName();
    const newName = `${originalName} - Updated`;

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', originalName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(originalName)).toBeVisible();

    await getProviderActions(page, originalName).getByRole('button', { name: 'Edit' }).click();

    await expect(page.getByRole('heading', { name: 'Edit SAML Provider' })).toBeVisible();
    await expect(page.locator('#editProviderName')).toHaveValue(originalName);

    await page.fill('#editProviderName', newName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('heading', { name: 'Edit SAML Provider' })).not.toBeVisible();
    await expect(page.getByText(newName)).toBeVisible();
  });

  test('should open delete confirmation modal when clicking Delete', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();

    await getProviderActions(page, providerName).getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Delete SAML Provider' })).toBeVisible();
    await expect(
      page.getByText(`Are you sure you want to delete the SAML provider "${providerName}"?`),
    ).toBeVisible();
    await expect(
      page.getByText(
        'This action cannot be undone. Users will no longer be able to log in via this provider.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Provider' })).toBeVisible();
  });

  test('should close delete modal when clicking Cancel', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();

    await getProviderActions(page, providerName).getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('heading', { name: 'Delete SAML Provider' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Delete SAML Provider' })).not.toBeVisible();
    await expect(page.getByText(providerName)).toBeVisible();
  });

  test('should delete a SAML provider after confirmation', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();

    await getProviderActions(page, providerName).getByRole('button', { name: 'Delete' }).click();

    await page.getByRole('button', { name: 'Delete Provider' }).click();

    await expect(page.getByRole('heading', { name: 'Delete SAML Provider' })).not.toBeVisible();
    await expect(page.getByText(providerName)).not.toBeVisible();
  });

  test('should show Testing... state when Test Connection is clicked', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();

    await getProviderActions(page, providerName)
      .getByRole('button', { name: 'Test Connection' })
      .click();

    await expect(page.getByRole('button', { name: 'Testing...' })).toBeVisible();
  });

  test('should display test result after Test Connection completes', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();

    await getProviderActions(page, providerName)
      .getByRole('button', { name: 'Test Connection' })
      .click();

    await expect(page.locator('.test-result')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.test-result')).toBeAttached();
    await expect(page.locator('.test-result__status')).toBeVisible();
    await expect(page.locator('.test-result__message')).toBeVisible();
  });

  test('should display provider with Active badge for newly created provider', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();
    await expect(page.locator('.provider-name', { hasText: providerName })).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('should display provider details including Metadata URL', async ({ page }) => {
    const providerName = generateUniqueProviderName();

    await page.getByRole('button', { name: 'Add SAML Provider' }).click();
    await page.fill('#providerName', providerName);
    await page.fill('#metadataUrl', 'https://idp.example.com/metadata');
    await page.getByRole('button', { name: 'Create Provider' }).click();

    await expect(page.getByText(providerName)).toBeVisible();
    await expect(page.getByText('https://idp.example.com/metadata')).toBeVisible();
  });

  test('should have page header with SAML Single Sign-On title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'SAML Single Sign-On' })).toBeVisible();
    await expect(
      page.getByText(
        'Configure SAML 2.0 identity providers for enterprise SSO with Okta, Entra ID, and Ping Identity',
      ),
    ).toBeVisible();
  });
});
