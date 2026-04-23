import { test as base, expect, type Page } from '@playwright/test';

import { generateUniqueDomain } from './onboarding-helpers';

const test = base;

const fillThroughStep4 = async (page: Page) => {
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
};

const completeFullWizardThroughReview = async (page: Page) => {
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
};

test.describe('Enterprise Onboarding Wizard - Step 5: Review & Complete', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep4(page);
  });

  test('should display all entered data on review step', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    const orgName = 'Test Organization';
    await completeFullWizardThroughReview(page);
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
    await fillThroughStep4(page);

    await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible();

    const backButton = page.locator('button:has-text("Back")');
    if (await backButton.isVisible()) {
      await backButton.click();
    }

    await expect(
      page.getByRole('heading', { name: 'Compliance Framework Selection' }),
    ).toBeVisible();

    const gdprCheckbox = page
      .locator('.framework-checkbox')
      .filter({ hasText: 'GDPR' })
      .locator('input[type="checkbox"]');
    await expect(gdprCheckbox).toBeChecked();
  });

  test('should complete onboarding successfully', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await fillThroughStep4(page);

    await expect(page.getByRole('heading', { name: 'Review & Complete' })).toBeVisible();

    await page.click('button:has-text("Complete Onboarding")');

    await expect(page.locator('.completion-banner')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Onboarding Complete!' })).toBeVisible();
  });
});

test.describe('Enterprise Onboarding Wizard - Reset Onboarding', () => {
  test('should reset onboarding and clear all data', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/admin/onboarding');
    await completeFullWizardThroughReview(page);
    await page.click('button:has-text("Complete Onboarding")');
    await expect(page.locator('.completion-banner')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Reset Onboarding")');
    await expect(page.getByRole('heading', { name: 'Organization Profile' })).toBeVisible();
    await expect(page.locator('#org-name')).toHaveValue('');
  });
});

test.describe('Enterprise Onboarding Wizard - Wizard Stepper Navigation', () => {
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
