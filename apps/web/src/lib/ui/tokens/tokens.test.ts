import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, it } from 'vitest';

describe('Design Tokens', () => {
  const tokensPath = resolve('./src/lib/ui/tokens/index.css');
  const tokensCss = readFileSync(tokensPath, 'utf-8');

  describe('Theme Variable Groups', () => {
    it('defines green theme variables', () => {
      expect(tokensCss).toContain("[data-theme='green']");
      expect(tokensCss).toContain('--color-bg:');
      expect(tokensCss).toContain('--color-surface:');
      expect(tokensCss).toContain('--color-text:');
    });

    it('defines amber theme variables', () => {
      expect(tokensCss).toContain("[data-theme='amber']");
    });

    it('defines high-contrast theme variables', () => {
      expect(tokensCss).toContain("[data-theme='high-contrast']");
    });

    it('defines enterprise theme variables', () => {
      expect(tokensCss).toContain("[data-theme='enterprise']");
    });
  });

  describe('Color Tokens', () => {
    it('defines game phosphor colors', () => {
      expect(tokensCss).toContain('--color-phosphor-green:');
      expect(tokensCss).toContain('--color-amber:');
    });

    it('defines semantic status colors', () => {
      expect(tokensCss).toContain('--color-safe:');
      expect(tokensCss).toContain('--color-warning:');
      expect(tokensCss).toContain('--color-danger:');
      expect(tokensCss).toContain('--color-info:');
      expect(tokensCss).toContain('--color-critical:');
    });

    it('defines threat tier colors', () => {
      expect(tokensCss).toContain('--color-threat-1:');
      expect(tokensCss).toContain('--color-threat-2:');
      expect(tokensCss).toContain('--color-threat-3:');
      expect(tokensCss).toContain('--color-threat-4:');
      expect(tokensCss).toContain('--color-threat-5:');
    });

    it('defines faction colors', () => {
      expect(tokensCss).toContain('--color-faction-sovereign:');
      expect(tokensCss).toContain('--color-faction-nexion:');
      expect(tokensCss).toContain('--color-faction-librarians:');
    });

    it('defines admin palette', () => {
      expect(tokensCss).toContain('--admin-bg-primary:');
      expect(tokensCss).toContain('--admin-text-primary:');
      expect(tokensCss).toContain('--admin-accent:');
    });
  });

  describe('Typography Tokens', () => {
    it('defines font stacks', () => {
      expect(tokensCss).toContain('--font-terminal:');
      expect(tokensCss).toContain('--font-document:');
      expect(tokensCss).toContain('--font-admin:');
    });

    it('defines type scale', () => {
      expect(tokensCss).toContain('--text-xs:');
      expect(tokensCss).toContain('--text-sm:');
      expect(tokensCss).toContain('--text-base:');
      expect(tokensCss).toContain('--text-xl:');
      expect(tokensCss).toContain('--text-2xl:');
    });
  });

  describe('Spacing Tokens', () => {
    it('defines spacing scale', () => {
      expect(tokensCss).toContain('--space-0:');
      expect(tokensCss).toContain('--space-1:');
      expect(tokensCss).toContain('--space-2:');
      expect(tokensCss).toContain('--space-4:');
      expect(tokensCss).toContain('--space-8:');
    });
  });

  describe('CRT Effect Tokens', () => {
    it('defines effect control tokens', () => {
      expect(tokensCss).toContain('--scanline-opacity:');
      expect(tokensCss).toContain('--glow-intensity:');
      expect(tokensCss).toContain('--noise-opacity:');
      expect(tokensCss).toContain('--vignette-opacity:');
    });

    it('defines effect toggle flags', () => {
      expect(tokensCss).toContain('--effect-scanlines:');
      expect(tokensCss).toContain('--effect-curvature:');
      expect(tokensCss).toContain('--effect-glow:');
    });
  });

  describe('Accessibility', () => {
    it('includes reduced motion media query', () => {
      expect(tokensCss).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('includes high-contrast mode disable for effects', () => {
      expect(tokensCss).toContain('data-high-contrast');
    });
  });

  describe('Route Surface Groups', () => {
    it('defines game surface styling', () => {
      expect(tokensCss).toContain("[data-surface='game']");
    });

    it('defines admin surface styling', () => {
      expect(tokensCss).toContain("[data-surface='admin']");
    });
  });
});
