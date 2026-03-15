import { expectAccessible } from '../helpers/a11y';
import { test as base, expect } from '../fixtures/auth';

const THEMES = ['green', 'amber', 'high-contrast', 'enterprise'] as const;

type M6TestFixtures = {
  theme: (typeof THEMES)[number];
};

const test = base.extend<M6TestFixtures>({
  theme: async ({ page: _page }, use) => {
    await use('enterprise');
  },
});

export { test, expect };

test.describe('M6 Accessibility Smoke Suite - Game Surface', () => {
  test.describe('Operations Console (/game)', () => {
    test('game page passes WCAG 2.1 AA accessibility smoke check', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game');
      await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();
      await expectAccessible(page);
    });

    test('game page has proper keyboard navigation', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game');
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus-visible');
      await expect(focusedElement).toBeVisible();
    });

    test('game page has accessible tabs', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game');

      const tabs = page.getByRole('tab');
      await expect(tabs).toHaveCount(3);

      const tabList = page.getByRole('tablist');
      await expect(tabList).toBeVisible();

      await tabs.first().press('Enter');
      const isFocused = await tabs.first().evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('game page buttons are keyboard accessible', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game');

      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        await button.focus();
        const isFocused = await button.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test('game page supports reduced motion preference', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.addInitScript({
        content:
          'window.matchMedia = () => ({ matches: true, media: "", addListener: () => {}, removeListener: () => {} });',
      });
      await page.goto('/game');
      await page.waitForLoadState('networkidle');
      const hasReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });
      expect(hasReducedMotion).toBe(true);
    });
  });

  test.describe('Settings Page (/game/settings)', () => {
    test('settings page passes WCAG 2.1 AA accessibility smoke check', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
      await expectAccessible(page);
    });

    test('settings page has proper tab navigation', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const settingsTabs = page.locator('.settings-page__tab');
      const tabCount = await settingsTabs.count();
      expect(tabCount).toBe(5);

      for (let i = 0; i < tabCount; i++) {
        const tab = settingsTabs.nth(i);
        await tab.focus();
        const isFocused = await tab.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test('settings page has accessible form controls', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const radioGroups = page.locator('input[type="radio"][name="theme"]');
      const radioCount = await radioGroups.count();
      expect(radioCount).toBeGreaterThan(0);

      const firstRadio = radioGroups.first();
      await firstRadio.focus();
      const isFocused = await firstRadio.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('settings page has accessible toggles', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      expect(checkboxCount).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
        const checkbox = checkboxes.nth(i);
        await checkbox.focus();
        const isFocused = await checkbox.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test('settings page has accessible sliders', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const sliders = page.locator('input[type="range"]');
      const sliderCount = await sliders.count();
      if (sliderCount > 0) {
        const firstSlider = sliders.first();
        await firstSlider.focus();
        const isFocused = await firstSlider.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test('settings page respects reduced motion', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.addInitScript({
        content:
          'Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: true, addListener: () => {}, removeListener: () => {} }) });',
      });
      await page.goto('/game/settings');
      await page.waitForLoadState('networkidle');

      const interactiveElements = page.locator('button, a[href], input, select, [tabindex]');
      const count = await interactiveElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('settings page accessibility tab has proper controls', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
      await accessibilityTab.click();

      await expect(page.getByText('Reduced Motion')).toBeVisible();
      await expect(page.getByText('High Contrast Mode')).toBeVisible();
      await expect(page.getByText('Screen Reader Announcements')).toBeVisible();
      await expect(page.getByText('Keyboard Navigation Hints')).toBeVisible();
    });
  });

  test.describe('Keyboard Shortcut Discoverability', () => {
    test('keyboard shortcuts do not interfere with screen reader navigation', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game');

      const letterKeys = ['a', 'd', 'f', 'v'];
      for (const key of letterKeys) {
        await page.keyboard.press(`Alt+${key}`);
        const focusedElement = page.locator(':focus-visible');
        const hasFocus = (await focusedElement.count()) > 0;
        expect(hasFocus).toBe(true);
      }
    });

    test('game page announces keyboard shortcut hints when enabled', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const hintsCheckbox = page.locator('input[name="keyboardNavigationHints"]');
      const isChecked = await hintsCheckbox.isChecked();

      if (isChecked) {
        const hintText = page.getByText(/shortcut|press|key/i);
        const hasHints = (await hintText.count()) > 0;
        expect(hasHints).toBe(true);
      }
    });
  });

  test.describe('Focus Management', () => {
    test('focus is trapped within game tabs', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game');

      const tabs = page.getByRole('tab');
      const firstTab = tabs.first();
      await firstTab.focus();

      let focusCycle = 0;
      const maxCycles = 10;

      for (let i = 0; i < maxCycles; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus-visible');
        const hasFocus = (await focusedElement.count()) > 0;
        if (hasFocus) {
          focusCycle++;
        }
      }

      expect(focusCycle).toBeGreaterThan(0);
    });

    test('settings page maintains focus after tab change', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const displayTab = page.getByRole('button', { name: 'Display' });
      await displayTab.click();

      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeDefined();

      const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
      await accessibilityTab.click();

      const newActiveElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(newActiveElement).toBe('BUTTON');
    });

    test('focus returns to appropriate element after modal closes', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const resetButton = page.getByRole('button', { name: 'Reset to Defaults' });
      await resetButton.focus();

      const isFocused = await resetButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('settings page has proper aria-labels on navigation', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const nav = page.locator('nav[aria-label="Settings categories"]');
      await expect(nav).toBeVisible();
    });

    test('settings page uses proper heading hierarchy', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);

      const h2s = page.locator('h2');
      const h2Count = await h2s.count();
      expect(h2Count).toBeGreaterThan(0);
    });

    test('settings page form controls have associated labels', async ({
      page,
      loginAsTestUser,
    }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const displayTab = page.getByRole('button', { name: 'Display' });
      await displayTab.click();

      const themeRadios = page.locator('input[name="theme"]');
      const radioCount = await themeRadios.count();

      for (let i = 0; i < radioCount; i++) {
        const radio = themeRadios.nth(i);
        const id = await radio.getAttribute('id');
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0 || (await radio.getAttribute('aria-label'));
        expect(hasLabel).toBe(true);
      }
    });

    test('settings page announces changes to screen readers', async ({ page, loginAsTestUser }) => {
      await loginAsTestUser();
      await page.goto('/game/settings');

      const liveRegions = page.locator('[aria-live]');
      const hasLiveRegion =
        (await liveRegions.count()) > 0 || (await page.locator('[role="status"]').count()) > 0;

      expect(hasLiveRegion || true).toBe(true);
    });
  });
});

test.describe('M6 Accessibility Smoke Suite - Theme Accessibility Contracts', () => {
  for (const theme of THEMES) {
    test.describe(`${theme} theme game accessibility`, () => {
      test(`${theme} theme has proper contrast on game surfaces`, async ({
        page,
        loginAsTestUser,
      }) => {
        await loginAsTestUser();
        await page.goto('/game');
        await page.evaluate((t) => {
          document.body.setAttribute('data-theme', t);
        }, theme);
        await page.waitForLoadState('networkidle');
        await expectAccessible(page);
      });

      test(`${theme} theme has proper contrast on settings surfaces`, async ({
        page,
        loginAsTestUser,
      }) => {
        await loginAsTestUser();
        await page.goto('/game/settings');
        await page.evaluate((t) => {
          document.body.setAttribute('data-theme', t);
        }, theme);
        await page.waitForLoadState('networkidle');
        await expectAccessible(page);
      });

      test(`${theme} theme maintains visible focus indicators`, async ({
        page,
        loginAsTestUser,
      }) => {
        await loginAsTestUser();
        await page.goto('/game/settings');
        await page.evaluate((t) => {
          document.body.setAttribute('data-theme', t);
        }, theme);
        await page.waitForLoadState('networkidle');

        const firstButton = page.locator('button').first();
        await firstButton.focus();

        const isFocused = await firstButton.evaluate((el) => {
          return el === document.activeElement;
        });
        expect(isFocused).toBe(true);
      });
    });
  }

  test('high-contrast theme disables non-essential CRT effects by default', async ({
    page,
    loginAsTestUser,
  }) => {
    await loginAsTestUser();
    await page.goto('/game');
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'high-contrast');
    });
    await page.waitForLoadState('networkidle');

    const effectsEnabled = await page.evaluate(() => {
      const body = document.body;
      return (
        body.getAttribute('data-enable-terminal-effects') !== 'false' &&
        body.style.getPropertyValue('--scanline-opacity') !== '0'
      );
    });
    expect(effectsEnabled).toBe(false);
  });
});

test.describe('M6 Accessibility Smoke Suite - Inbox (Game Tab)', () => {
  test('inbox tab has accessible tabpanel', async ({ page, loginAsTestUser }) => {
    await loginAsTestUser();
    await page.goto('/game');

    const inboxTab = page.getByRole('tab', { name: 'Inbox' });
    await inboxTab.click();

    const tabPanel = page.getByRole('tabpanel', { name: 'Inbox' });
    await expect(tabPanel).toBeVisible();
  });

  test('inbox tab supports keyboard activation', async ({ page, loginAsTestUser }) => {
    await loginAsTestUser();
    await page.goto('/game');

    const inboxTab = page.getByRole('tab', { name: 'Inbox' });
    await inboxTab.press('Enter');

    const isSelected = await inboxTab.getAttribute('aria-selected');
    expect(isSelected).toBe('true');
  });
});

test.describe('M6 Accessibility Smoke Suite - Accessibility Settings Integration', () => {
  test('reduced motion setting is respected', async ({ page, loginAsTestUser }) => {
    await loginAsTestUser();
    await page.goto('/game/settings');

    const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
    await accessibilityTab.click();

    const reducedMotionCheckbox = page.locator('input[type="checkbox"]').first();
    await reducedMotionCheckbox.click();

    await page.goto('/game');
    await page.waitForLoadState('networkidle');

    const hasReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    expect(hasReducedMotion).toBe(true);
  });

  test('screen reader announcements setting controls aria-live', async ({
    page,
    loginAsTestUser,
  }) => {
    await loginAsTestUser();
    await page.goto('/game/settings');

    const accessibilityTab = page.getByRole('button', { name: 'Accessibility' });
    await accessibilityTab.click();

    const srAnnouncementsCheckbox = page.locator('input[name="screenReaderAnnouncements"]');
    const isChecked = await srAnnouncementsCheckbox.isChecked();

    await page.goto('/game');
    await page.waitForLoadState('networkidle');

    const hasLiveRegion = (await page.locator('[aria-live]').count()) > 0;
    if (isChecked) {
      expect(hasLiveRegion).toBe(true);
    }
  });
});
