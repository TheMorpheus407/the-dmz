import { test as base, expect } from '../fixtures/auth';

const createSettingsPersistenceTests = () => {
  const test = base;

  test.describe('Settings Persistence E2E Tests', () => {
    test.beforeEach(async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');
      await page.waitForLoadState('networkidle');
    });

    test.describe('Display Settings Persistence', () => {
      test('theme persists after page reload', async ({ page }) => {
        await page.click('input[type="radio"][name="theme"][value="amber"]');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await expect(
          page.locator('input[type="radio"][name="theme"][value="amber"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="theme"][value="green"]'),
        ).not.toBeChecked();
      });

      test('theme persists after navigation away and back', async ({ page }) => {
        await page.click('input[type="radio"][name="theme"][value="high-contrast"]');
        await page.waitForLoadState('networkidle');
        await page.goto('/game');
        await page.waitForLoadState('networkidle');
        await page.goto('/game/settings');
        await expect(
          page.locator('input[type="radio"][name="theme"][value="high-contrast"]'),
        ).toBeChecked();
      });

      test('terminal effects toggle persists after reload', async ({ page }) => {
        const terminalEffectsCheckbox = page.locator('input[type="checkbox"]').first();
        const initialState = await terminalEffectsCheckbox.isChecked();
        await terminalEffectsCheckbox.click();
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        const newState = await page.locator('input[type="checkbox"]').first().isChecked();
        expect(newState).toBe(!initialState);
      });

      test('font size slider persists after reload', async ({ page }) => {
        await page.locator('#font-size').fill('24');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        const sliderValue = await page.locator('#font-size').inputValue();
        expect(parseInt(sliderValue, 10)).toBe(24);
      });
    });

    test.describe('Accessibility Settings Persistence', () => {
      test('reduced motion setting persists after page reload', async ({ page }) => {
        const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
        await accessibilityTab.click();
        const reducedMotionCheckbox = page.getByRole('checkbox', { name: 'Reduced Motion' });
        await reducedMotionCheckbox.click();
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await accessibilityTab.click();
        await expect(page.getByRole('checkbox', { name: 'Reduced Motion' })).toBeChecked();
      });

      test('high contrast mode persists after reload', async ({ page }) => {
        const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
        await accessibilityTab.click();
        const highContrastCheckbox = page.getByRole('checkbox', { name: 'High Contrast Mode' });
        await highContrastCheckbox.click();
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await accessibilityTab.click();
        await expect(page.getByRole('checkbox', { name: 'High Contrast Mode' })).toBeChecked();
      });

      test('color blind mode persists after reload', async ({ page }) => {
        const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
        await accessibilityTab.click();
        await page.click('input[type="radio"][name="colorBlindMode"][value="protanopia"]');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await accessibilityTab.click();
        await expect(
          page.locator('input[type="radio"][name="colorBlindMode"][value="protanopia"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="colorBlindMode"][value="none"]'),
        ).not.toBeChecked();
      });

      test('focus indicator style persists after reload', async ({ page }) => {
        const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
        await accessibilityTab.click();
        await page.click('input[type="radio"][name="focusIndicator"][value="strong"]');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await accessibilityTab.click();
        await expect(
          page.locator('input[type="radio"][name="focusIndicator"][value="strong"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="focusIndicator"][value="subtle"]'),
        ).not.toBeChecked();
      });
    });

    test.describe('Gameplay Settings Persistence', () => {
      test('difficulty persists after page reload', async ({ page }) => {
        const gameplayTab = page.getByRole('button', { name: 'Gameplay' });
        await gameplayTab.click();
        await page.click('input[type="radio"][name="difficulty"][value="hard"]');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await page.getByRole('button', { name: 'Gameplay' }).click();
        await expect(
          page.locator('input[type="radio"][name="difficulty"][value="hard"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="difficulty"][value="normal"]'),
        ).not.toBeChecked();
      });

      test('difficulty persists after navigation away and back', async ({ page }) => {
        const gameplayTab = page.getByRole('button', { name: 'Gameplay' });
        await gameplayTab.click();
        await page.click('input[type="radio"][name="difficulty"][value="easy"]');
        await page.waitForLoadState('networkidle');
        await page.goto('/game');
        await page.waitForLoadState('networkidle');
        await page.goto('/game/settings');
        await page.getByRole('button', { name: 'Gameplay' }).click();
        await expect(
          page.locator('input[type="radio"][name="difficulty"][value="easy"]'),
        ).toBeChecked();
      });

      test('notification volume persists after reload', async ({ page }) => {
        const gameplayTab = page.getByRole('button', { name: 'Gameplay' });
        await gameplayTab.click();
        await page.locator('#notification-volume').fill('50');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await page.getByRole('button', { name: 'Gameplay' }).click();
        const sliderValue = await page.locator('#notification-volume').inputValue();
        expect(parseInt(sliderValue, 10)).toBe(50);
      });
    });

    test.describe('Audio Settings Persistence', () => {
      test('master volume persists after reload', async ({ page }) => {
        const audioTab = page.getByRole('button', { name: 'Audio' });
        await audioTab.click();
        await page.locator('#master-volume').fill('30');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await audioTab.click();
        const sliderValue = await page.locator('#master-volume').inputValue();
        expect(parseInt(sliderValue, 10)).toBe(30);
      });

      test('mute all toggle persists after reload', async ({ page }) => {
        const audioTab = page.getByRole('button', { name: 'Audio' });
        await audioTab.click();
        const muteAllCheckbox = page.getByRole('checkbox', { name: 'Mute All Audio' });
        await muteAllCheckbox.click();
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await audioTab.click();
        await expect(page.getByRole('checkbox', { name: 'Mute All Audio' })).toBeChecked();
      });
    });

    test.describe('Account Settings Persistence', () => {
      test('display name persists after page reload', async ({ page }) => {
        const accountTab = page.getByRole('button', { name: 'Account' });
        await accountTab.click();
        await page.locator('input[id="displayName"]').fill('TestPlayer42');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await accountTab.click();
        await expect(page.locator('input[id="displayName"]')).toHaveValue('TestPlayer42');
      });

      test('privacy mode persists after reload', async ({ page }) => {
        const accountTab = page.getByRole('button', { name: 'Account' });
        await accountTab.click();
        await page.click('input[type="radio"][name="privacyMode"][value="private"]');
        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');
        await page.getByRole('button', { name: 'Account' }).click();
        await expect(
          page.locator('input[type="radio"][name="privacyMode"][value="private"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="privacyMode"][value="public"]'),
        ).not.toBeChecked();
      });
    });

    test.describe('Cross-Session Persistence', () => {
      test('settings persist across multiple reload cycles', async ({ page }) => {
        const displayTab = page.getByRole('button', { name: 'Display' });
        await displayTab.click();
        await page.click('input[type="radio"][name="theme"][value="enterprise"]');
        await page.waitForLoadState('networkidle');

        for (let i = 0; i < 3; i++) {
          await page.reload();
          await page.goto('/game/settings');
          await displayTab.click();
        }

        await expect(
          page.locator('input[type="radio"][name="theme"][value="enterprise"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="theme"][value="green"]'),
        ).not.toBeChecked();
      });

      test('multiple settings persist simultaneously', async ({ page }) => {
        const displayTab = page.getByRole('button', { name: 'Display' });
        const gameplayTab = page.getByRole('button', { name: 'Gameplay' });
        const accountTab = page.getByRole('button', { name: 'Account' });

        await displayTab.click();
        await page.click('input[type="radio"][name="theme"][value="amber"]');

        await gameplayTab.click();
        await page.click('input[type="radio"][name="difficulty"][value="hard"]');

        await accountTab.click();
        await page.locator('input[id="displayName"]').fill('PersistenceTester');

        await page.waitForLoadState('networkidle');
        await page.reload();
        await page.goto('/game/settings');

        await displayTab.click();
        await expect(
          page.locator('input[type="radio"][name="theme"][value="amber"]'),
        ).toBeChecked();

        await gameplayTab.click();
        await expect(
          page.locator('input[type="radio"][name="difficulty"][value="hard"]'),
        ).toBeChecked();

        await accountTab.click();
        await expect(page.locator('input[id="displayName"]')).toHaveValue('PersistenceTester');
      });
    });

    test.describe('Reset to Defaults Behavior', () => {
      test('reset to defaults returns theme to green after it was changed', async ({ page }) => {
        const displayTab = page.getByRole('button', { name: 'Display' });
        await displayTab.click();
        await page.click('input[type="radio"][name="theme"][value="amber"]');
        await page.waitForLoadState('networkidle');
        const resetButton = page.getByRole('button', { name: 'Reset to Defaults' });
        await resetButton.click();
        await page.waitForLoadState('networkidle');
        await expect(
          page.locator('input[type="radio"][name="theme"][value="green"]'),
        ).toBeChecked();
        await expect(
          page.locator('input[type="radio"][name="theme"][value="amber"]'),
        ).not.toBeChecked();
      });

      test('reset to defaults returns difficulty to normal after it was changed', async ({
        page,
      }) => {
        const gameplayTab = page.getByRole('button', { name: 'Gameplay' });
        await gameplayTab.click();
        await page.click('input[type="radio"][name="difficulty"][value="hard"]');
        await page.waitForLoadState('networkidle');
        const resetButton = page.getByRole('button', { name: 'Reset to Defaults' });
        await resetButton.click();
        await page.waitForLoadState('networkidle');
        await expect(
          page.locator('input[type="radio"][name="difficulty"][value="normal"]'),
        ).toBeChecked();
      });
    });
  });
};

createSettingsPersistenceTests();
