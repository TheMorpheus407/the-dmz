import { describe, it, expect } from 'vitest';

import type {
  EmailSubmittedContext,
  DecisionEvaluatedContext,
  ResolveDecisionContext,
} from '../email-handlers.js';

describe('email-handlers interface naming convention', () => {
  it('EmailSubmittedContext should exist (renamed from EmailSubmittedCtx)', () => {
    const _typeCheck: EmailSubmittedContext = {} as EmailSubmittedContext;
    expect(typeof _typeCheck).toBe('object');
  });

  it('DecisionEvaluatedContext should exist (renamed from DecisionEvaluatedCtx)', () => {
    const _typeCheck: DecisionEvaluatedContext = {} as DecisionEvaluatedContext;
    expect(typeof _typeCheck).toBe('object');
  });

  it('ResolveDecisionContext should exist (renamed from ResolveDecisionCtx)', () => {
    const _typeCheck: ResolveDecisionContext = {} as ResolveDecisionContext;
    expect(typeof _typeCheck).toBe('object');
  });
});
