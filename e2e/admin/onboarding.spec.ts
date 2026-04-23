/* eslint-disable max-lines, max-statements */
import { test as base, expect } from '../fixtures/auth';

const generateUniqueDomain = (): string =>
  `test-${Date.now()}-${Math.random().toFixed(6)}.example.com`;

const test = base;

test.describe('Enterprise Onboarding Wizard', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
  });
  test.describe('Step 1: Organization Profile', () => {
    test('should load step 1 (Organization Profile) when navigating to /admin/onboarding', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await expect(
        page.getByRole('heading', { name: 'Enterprise Onboarding Wizard' }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
      await expect(page.locator('#org-name')).toBeVisible();
      await expect(page.locator('#org-domain')).toBeVisible();
      await expect(page.locator('#org-industry')).toBeVisible();
      await expect(page.locator('#org-size')).toBeVisible();
    });

    test('should show validation error when required fields are empty', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await page.click('button[type="submit"]');

      const orgNameInput = page.locator('#org-name');
      await expect(orgNameInput).toBeInvalid();
    });

    test('should show validation error when org-domain is empty', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await page.fill('#org-name', 'Test Organization');
      await page.click('button[type="submit"]');

      const orgDomainInput = page.locator('#org-domain');
      await expect(orgDomainInput).toBeInvalid();
    });

    test('should show validation error when org-industry is not selected', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await page.fill('#org-name', 'Test Organization');
      await page.fill('#org-domain', 'example.com');
      await page.click('button[type="submit"]');

      const orgIndustrySelect = page.locator('#org-industry');
      await expect(orgIndustrySelect).toBeInvalid();
    });

    test('should show validation error when org-size is not selected', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await page.fill('#org-name', 'Test Organization');
      await page.fill('#org-domain', 'example.com');
      await page.selectOption('#org-industry', 'Technology');
      await page.click('button[type="submit"]');

      const orgSizeSelect = page.locator('#org-size');
      await expect(orgSizeSelect).toBeInvalid();
    });

    test('should navigate to step 2 after filling org profile and clicking Save & Continue', async ({
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

      await expect(
        page.getByRole('heading', { name: 'Identity Provider Configuration' }),
      ).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Step 2: IdP Configuration', () => {
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

  test.describe('Step 3: SCIM Token', () => {
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

  test.describe('Step 4: Compliance Framework Selection', () => {
    test('should show compliance framework checkboxes', async ({ page, loginAsAdmin }) => {
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
      await page.click('button:has-text("Continue to Compliance")');

      await expect(
        page.getByRole('heading', { name: 'Compliance Framework Selection' }),
      ).toBeVisible();
      await expect(page.locator('.frameworks-grid')).toBeVisible();
      await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
    });

    test('should allow selecting compliance frameworks', async ({ page, loginAsAdmin }) => {
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
      await page.click('button:has-text("Continue to Compliance")');

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

      await page.selectOption('#regulatory-region', 'eu');

      await expect(page.locator('#regulatory-region')).toHaveValue('eu');
    });

    test('should allow filling compliance coordinator fields', async ({ page, loginAsAdmin }) => {
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
      await page.click('button:has-text("Continue to Compliance")');

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

    test('should navigate to review step after saving compliance', async ({
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

      await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
      await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
      await page.click('button[type="submit"]');

      await page.fill('#scim-token-name', 'Test SCIM Token');
      await page.click('button:has-text("Generate Token")');
      await expect(page.locator('.token-display')).toBeVisible({ timeout: 10000 });
      await page.click('button:has-text("Continue to Compliance")');

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

  test.describe('Step 5: Review & Complete', () => {
    test('should display all entered data on review step', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      const orgName = 'Test Organization';
      await page.fill('#org-name', orgName);
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

      const gdprCheckbox = page
        .locator('.framework-checkbox')
        .filter({ hasText: 'GDPR' })
        .locator('input[type="checkbox"]');
      await gdprCheckbox.check();
      await page.click('button[type="submit"]');

      await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible();

      await expect(
        page.locator('.review-section').filter({ hasText: 'Organization Profile' }),
      ).toBeVisible();
      await expect(page.locator('.review-section').filter({ hasText: orgName })).toBeVisible();
      await expect(
        page.locator('.review-section').filter({ hasText: 'IdP Configuration' }),
      ).toBeVisible();
      await expect(page.locator('.review-section').filter({ hasText: 'SCIM Token' })).toBeVisible();
      await expect(
        page.locator('.review-section').filter({ hasText: 'Compliance Frameworks' }),
      ).toBeVisible();
    });

    test('should preserve compliance data when navigating back from Review step', async ({
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

      await page.fill('#idp-entity-id', 'https://idp.example.com/entity');
      await page.fill('#idp-sso-url', 'https://idp.example.com/sso/saml');
      await page.click('button[type="submit"]');

      await page.fill('#scim-token-name', 'Test SCIM Token');
      await page.click('button:has-text("Generate Token")');
      await expect(page.locator('.token-display')).toBeVisible({ timeout: 10000 });
      await page.click('button:has-text("Continue to Compliance")');

      const gdprCheckbox = page
        .locator('.framework-checkbox')
        .filter({ hasText: 'GDPR' })
        .locator('input[type="checkbox"]');
      await gdprCheckbox.check();

      await page.click('button[type="submit"]');

      await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible();

      const backButton = page.locator('button:has-text("Back")');
      if (await backButton.isVisible()) {
        await backButton.click();
      }

      await expect(
        page.getByRole('heading', { name: 'Compliance Framework Selection' }),
      ).toBeVisible();
      await expect(gdprCheckbox).toBeChecked();
    });

    test('should complete onboarding successfully', async ({ page, loginAsAdmin }) => {
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
      await page.click('button:has-text("Continue to Compliance")');

      const gdprCheckbox = page
        .locator('.framework-checkbox')
        .filter({ hasText: 'GDPR' })
        .locator('input[type="checkbox"]');
      await gdprCheckbox.check();
      await page.click('button[type="submit"]');

      await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible();

      await page.click('button:has-text("Complete Onboarding")');

      await expect(page.locator('.completion-banner')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Onboarding Complete!' })).toBeVisible();
    });
  });

  test.describe('Reset Onboarding', () => {
    test('should reset onboarding and clear all data', async ({ page, loginAsAdmin }) => {
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
      await page.click('button:has-text("Continue to Compliance")');

      const gdprCheckbox = page
        .locator('.framework-checkbox')
        .filter({ hasText: 'GDPR' })
        .locator('input[type="checkbox"]');
      await gdprCheckbox.check();
      await page.click('button[type="submit"]');

      await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible();

      await page.click('button:has-text("Complete Onboarding")');
      await expect(page.locator('.completion-banner')).toBeVisible({ timeout: 10000 });

      await page.click('button:has-text("Reset Onboarding")');

      await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
      await expect(page.locator('#org-name')).toHaveValue('');
    });
  });

  test.describe('Wizard Stepper Navigation', () => {
    test('should show all 5 steps in the stepper', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await expect(page.locator('.stepper__list')).toBeVisible();
      await expect(page.locator('.stepper__item')).toHaveCount(5);

      const stepLabels = [
        'Organization Profile',
        'IdP Configuration',
        'SCIM Token',
        'Compliance',
        'Review & Complete',
      ];
      for (const label of stepLabels) {
        await expect(page.locator('.stepper__label', { hasText: label })).toBeVisible();
      }
    });

    test('should show current step indicator', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      const firstStep = page.locator('.stepper__item').first();
      await expect(firstStep).toHaveClass(/stepper__item--current/);
    });

    test('should mark completed steps with checkmark', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();
      await page.goto('/admin/onboarding');

      await page.fill('#org-name', 'Test Organization');
      await page.fill('#org-domain', generateUniqueDomain());
      await page.selectOption('#org-industry', 'Technology');
      await page.selectOption('#org-size', '201-500');
      await page.click('button[type="submit"]');

      await expect(page.locator('.stepper__item').first()).toHaveClass(/stepper__item--completed/);
    });

    test('should allow clicking on completed step to navigate back', async ({
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

      await expect(
        page.getByRole('heading', { name: 'Identity Provider Configuration' }),
      ).toBeVisible({ timeout: 10000 });

      const firstStepperItem = page.locator('.stepper__item').first();
      await expect(firstStepperItem).toHaveClass(/stepper__item--completed/);

      const firstStepperButton = firstStepperItem.locator('.stepper__button');
      await firstStepperButton.click();

      await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
    });
  });
});
