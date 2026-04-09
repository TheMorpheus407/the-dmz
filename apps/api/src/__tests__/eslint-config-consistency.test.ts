import { describe, expect, it } from 'vitest';

import eslintConfig from '../../../../eslint.config.mjs';

const findRuleLevel = (rules, ruleName) => {
  const rule = rules[ruleName];
  if (!rule) return undefined;
  if (typeof rule === 'string') return rule;
  if (Array.isArray(rule)) return rule[0];
  return undefined;
};

describe('ESLint configuration consistency', () => {
  describe('unused-vars rule severity', () => {
    it('should set @typescript-eslint/no-unused-vars to error severity unconditionally', async () => {
      const tsConfig = eslintConfig.find(
        (config) => config.files && config.files.includes('**/*.{ts,tsx}'),
      );
      const level = findRuleLevel(tsConfig?.rules || {}, '@typescript-eslint/no-unused-vars');
      expect(level).toBe('error');
    });
  });

  describe('security rules severity', () => {
    const securityRules = [
      'security/detect-non-literal-fs-filename',
      'security/detect-possible-timing-attacks',
      'security/detect-non-literal-regexp',
      'security/detect-unsafe-regex',
      'security/detect-new-buffer',
      'security/detect-disable-mustache-escape',
      'security/detect-eval-with-expression',
      'security/detect-child-process',
      'security/detect-bidi-characters',
    ];

    securityRules.forEach((ruleName) => {
      it(`should set ${ruleName} to error unconditionally`, () => {
        const apiConfig = eslintConfig.find(
          (config) =>
            config.files &&
            config.files.includes('apps/api/src/**/*.ts') &&
            config.rules &&
            config.rules[ruleName],
        );
        const level = findRuleLevel(apiConfig?.rules || {}, ruleName);
        expect(level).toBe('error');
      });
    });
  });

  describe('node rules severity', () => {
    it('should set no-process-env to error unconditionally', () => {
      const apiConfig = eslintConfig.find(
        (config) => config.files && config.files.includes('apps/api/src/**/*.ts') && config.rules,
      );
      const level = findRuleLevel(apiConfig?.rules || {}, 'no-process-env');
      expect(level).toBe('error');
    });

    it('should set no-process-exit to error unconditionally', () => {
      const apiConfig = eslintConfig.find(
        (config) => config.files && config.files.includes('apps/api/src/**/*.ts') && config.rules,
      );
      const level = findRuleLevel(apiConfig?.rules || {}, 'no-process-exit');
      expect(level).toBe('error');
    });
  });
});
