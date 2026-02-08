import type { AxeMatchers } from 'vitest-axe';

declare module 'vitest' {
  interface Matchers<_T = unknown> extends AxeMatchers {}
  interface Assertion<_T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

declare module '@vitest/expect' {
  interface Matchers<_T = unknown> extends AxeMatchers {}
  interface Assertion<_T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
