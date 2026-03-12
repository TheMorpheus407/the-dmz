import { describe, expect, it } from 'vitest';

import {
  animationPreferencesSchema,
  defaultAnimationPreferences,
  effectiveAnimationPreferencesSchema,
  userPreferencesSchema,
  updatePreferencesSchema,
} from './preferences.schema.js';

describe('animationPreferencesSchema', () => {
  it('validates full animation preferences', () => {
    const input = {
      enableAnimations: true,
      enableGlowPulse: true,
      enableTypewriter: true,
      enableScreenFlicker: true,
      typewriterSpeed: 40,
    };
    expect(animationPreferencesSchema.parse(input)).toEqual(input);
  });

  it('validates partial animation preferences', () => {
    const input = {
      enableGlowPulse: false,
    };
    expect(animationPreferencesSchema.parse(input)).toEqual(input);
  });

  it('validates empty object', () => {
    const input = {};
    expect(animationPreferencesSchema.parse(input)).toEqual(input);
  });

  it('rejects invalid typewriter speed', () => {
    const input = {
      typewriterSpeed: 10,
    };
    expect(() => animationPreferencesSchema.parse(input)).toThrow();
  });

  it('rejects unknown fields', () => {
    const input = {
      unknownField: true,
    };
    expect(() => animationPreferencesSchema.parse(input)).toThrow();
  });
});

describe('defaultAnimationPreferences', () => {
  it('has sensible defaults', () => {
    expect(defaultAnimationPreferences.enableAnimations).toBe(true);
    expect(defaultAnimationPreferences.enableGlowPulse).toBe(true);
    expect(defaultAnimationPreferences.enableTypewriter).toBe(true);
    expect(defaultAnimationPreferences.enableScreenFlicker).toBe(true);
    expect(defaultAnimationPreferences.typewriterSpeed).toBe(40);
  });
});

describe('userPreferencesSchema', () => {
  it('validates user preferences with animation', () => {
    const input = {
      themePreferences: {
        theme: 'green',
      },
      animationPreferences: {
        enableGlowPulse: false,
      },
    };
    expect(userPreferencesSchema.parse(input)).toEqual(input);
  });

  it('validates empty user preferences', () => {
    const input = {};
    expect(userPreferencesSchema.parse(input)).toEqual(input);
  });
});

describe('updatePreferencesSchema', () => {
  it('validates animation preference updates', () => {
    const input = {
      animationPreferences: {
        enableAnimations: false,
        typewriterSpeed: 30,
      },
    };
    expect(updatePreferencesSchema.parse(input)).toEqual(input);
  });

  it('allows updating multiple preference types', () => {
    const input = {
      themePreferences: {
        theme: 'amber',
      },
      animationPreferences: {
        enableGlowPulse: true,
      },
      accessibilityPreferences: {
        reducedMotion: true,
      },
    };
    expect(updatePreferencesSchema.parse(input)).toEqual(input);
  });
});

describe('effectiveAnimationPreferencesSchema', () => {
  it('validates effective animation preferences', () => {
    const input = {
      enableAnimations: {
        value: true,
        source: 'default',
      },
      enableGlowPulse: {
        value: false,
        source: 'policy',
      },
      typewriterSpeed: {
        value: 50,
        source: 'server',
      },
    };
    expect(effectiveAnimationPreferencesSchema.parse(input)).toEqual(input);
  });

  it('allows null values', () => {
    const input = {
      enableAnimations: null,
    };
    expect(effectiveAnimationPreferencesSchema.parse(input)).toEqual(input);
  });
});
