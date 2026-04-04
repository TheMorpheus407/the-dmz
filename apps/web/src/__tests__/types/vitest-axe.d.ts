declare module 'vitest' {
  interface Matchers {
    toHaveNoViolations(): Promise<this>;
  }
  interface Assertion {
    toHaveNoViolations(): Promise<this>;
  }
}

declare module '@vitest/expect' {
  interface Matchers {
    toHaveNoViolations(): Promise<this>;
  }
  interface Assertion {
    toHaveNoViolations(): Promise<this>;
  }
}

export {};
