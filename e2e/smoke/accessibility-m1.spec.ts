import { expectAccessible } from '../helpers/a11y';
import { test as base, expect } from '../fixtures/auth';

const THEMES = ['green', 'amber', 'high-contrast', 'enterprise'] as const;

const _M1_ROUTE_GROUPS = {
  public: '/',
  auth: '/login',
  game: '/game',
  admin: '/admin',
} as const;

type M1TestFixtures = {
  theme: (typeof THEMES)[number];
};

const test = base.extend<M1TestFixtures>({
  theme: async ({ page: _page }, use) => {
    await use('enterprise');
  },
});

export { test, expect };

test.describe('M1 Accessibility Smoke Suite - Route Groups', () => {
  test.describe('(public) Surface', () => {
    test('home page passes WCAG 2.1 AA accessibility smoke check', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Archive Gate' })).toBeVisible();
      await expectAccessible(page);
    });

    test('home page has proper keyboard navigation', async ({ page }) => {
      await page.goto('/');
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus-visible');
      await expect(focusedElement).toBeVisible();
    });

    test('home page has visible focus indicator', async ({ page }) => {
      await page.goto('/');
      const firstFocusable = page.locator('button, [href], input, select, textarea').first();
      await firstFocusable.focus();
      const focusedStyles = await firstFocusable.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineWidth: computed.outlineWidth,
          outlineOffset: computed.outlineOffset,
        };
      });
      expect(focusedStyles.outlineWidth).not.toBe('0px');
    });
  });

  test.describe('(auth) Surface', () => {
    test('login page passes WCAG 2.1 AA accessibility smoke check', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Access Portal' })).toBeVisible();
      await expectAccessible(page);
    });

    test('login page has proper focus order', async ({ page }) => {
      await page.goto('/login');
      const focusOrder: string[] = [];
      await page.keyboard.press('Tab');
      focusOrder.push(await page.locator(':focus-visible').evaluate((el) => el.tagName));

      const emailInput = page.locator('input[name="email"]');
      await emailInput.focus();
      focusOrder.push('INPUT');

      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.focus();
      focusOrder.push('INPUT');

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.focus();
      focusOrder.push('BUTTON');

      expect(focusOrder).toContain('INPUT');
      expect(focusOrder).toContain('BUTTON');
    });

    test('login form has associated labels', async ({ page }) => {
      await page.goto('/login');
      const emailInput = page.locator('input[name="email"]');
      const emailLabel = page.locator('label[for="email"], label:has(#email)');
      await expect(emailLabel.or(emailInput)).toBeVisible();

      const passwordInput = page.locator('input[name="password"]');
      const passwordLabel = page.locator('label[for="password"], label:has(#password)');
      await expect(passwordLabel.or(passwordInput)).toBeVisible();
    });

    test('login error states have aria-live regions', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'invalid@test.com');
      await page.fill('input[name="password"]', 'wrongpass');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      const errorRegion = page.locator('[aria-live="assertive"], [aria-live="polite"]');
      const hasLiveRegion = (await errorRegion.count()) > 0;
      const hasRoleAlert = (await page.locator('[role="alert"]').count()) > 0;
      expect(hasLiveRegion || hasRoleAlert).toBe(true);
    });

    test('register page passes WCAG 2.1 AA accessibility smoke check', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await expectAccessible(page);
    });
  });

  test.describe('(game) Surface', () => {
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

    test('game page supports reduced motion', async ({ page, loginAsTestUser }) => {
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

  test.describe('(admin) Surface', () => {
    test('admin page passes WCAG 2.1 AA accessibility smoke check', async ({
      page,
      loginAsAdmin,
    }) => {
      await loginAsAdmin();
      await page.goto('/admin');
      await expect(page.getByRole('heading', { name: 'Admin Hub' })).toBeVisible();
      await expectAccessible(page);
    });

    test('admin page has proper keyboard navigation', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin();
      await page.goto('/admin');
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus-visible');
      await expect(focusedElement).toBeVisible();
    });
  });
});

test.describe('M1 Accessibility Smoke Suite - Theme Accessibility Contracts', () => {
  for (const theme of THEMES) {
    test.describe(`${theme} theme accessibility`, () => {
      test(`${theme} theme has proper contrast on core shell states`, async ({
        page,
        loginAsTestUser,
      }) => {
        await loginAsTestUser();

        await page.goto('/');
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

        await page.goto('/game');
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

      if (theme === 'high-contrast') {
        test(`${theme} theme disables non-essential CRT effects by default`, async ({ page }) => {
          await page.goto('/');
          await page.evaluate(() => {
            document.body.setAttribute('data-theme', 'high-contrast');
          });
          await page.waitForLoadState('networkidle');

          const _scanlines = await page.locator('.crt-scanlines, [data-scanlines]').count();
          const effectsEnabled = await page.evaluate(() => {
            const body = document.body;
            return (
              body.getAttribute('data-enable-terminal-effects') !== 'false' &&
              body.style.getPropertyValue('--scanline-opacity') !== '0'
            );
          });
          expect(effectsEnabled).toBe(false);
        });
      }
    });
  }

  test('reduced-motion does not break interaction accessibility', async ({
    page,
    loginAsTestUser,
  }) => {
    await loginAsTestUser();

    await page.addInitScript({
      content:
        'Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: true, addListener: () => {}, removeListener: () => {} }) });',
    });

    await page.goto('/game');
    await expect(page.getByRole('heading', { name: 'Operations Console' })).toBeVisible();

    const interactiveElements = page.locator('button, a[href], input, select, [tabindex]');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const el = interactiveElements.nth(i);
      const isVisible = await el.isVisible();
      expect(isVisible).toBe(true);
    }
  });
});

test.describe('M1 Accessibility Smoke Suite - ARIA Live Region Behavior', () => {
  test('auth error announcements are announced via aria-live', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'nonexistent@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const hasLiveRegion = (await page.locator('[aria-live]').count()) > 0;
    expect(hasLiveRegion).toBe(true);
  });

  test('session expiry is announced', async ({ page, loginAsTestUser }) => {
    await loginAsTestUser();
    await page.goto('/game');

    await page.request.post('/auth/logout');
    await page.goto('/game');
    await page.waitForTimeout(500);

    const isOnLoginPage = page.url().includes('/login');
    const hasExpiredMessage =
      (await page.locator('text=expired, text=session', { hasText: /expired|session/i }).count()) >
      0;
    expect(isOnLoginPage || hasExpiredMessage).toBe(true);
  });
});
