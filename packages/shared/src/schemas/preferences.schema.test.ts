import { describe, expect, it } from 'vitest';

import {
  animationPreferencesSchema,
  defaultAnimationPreferences,
  effectiveAnimationPreferencesSchema,
  userPreferencesSchema,
  updatePreferencesSchema,
  effectIntensitySchema,
  accessibilityPreferencesSchema,
  gameplayPreferencesSchema,
  audioPreferencesSchema,
  accountPreferencesSchema,
  defaultEffectIntensity,
  defaultGameplayPreferences,
  defaultAudioPreferences,
  defaultAccountPreferences,
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

describe('effectIntensitySchema', () => {
  it('validates correct intensity values', () => {
    expect(effectIntensitySchema.parse(defaultEffectIntensity)).toEqual(defaultEffectIntensity);
  });

  it('rejects intensity values below 0', () => {
    const input = {
      scanlines: -1,
      curvature: 50,
      glow: 50,
      noise: 50,
      vignette: 50,
      flicker: 50,
    };
    expect(() => effectIntensitySchema.parse(input)).toThrow();
  });

  it('rejects intensity values above 100', () => {
    const input = {
      scanlines: 101,
      curvature: 50,
      glow: 50,
      noise: 50,
      vignette: 50,
      flicker: 50,
    };
    expect(() => effectIntensitySchema.parse(input)).toThrow();
  });
});

describe('accessibilityPreferencesSchema', () => {
  it('validates full accessibility settings', () => {
    const input = {
      reducedMotion: true,
      highContrast: false,
      colorBlindMode: 'protanopia',
      screenReaderAnnouncements: true,
      keyboardNavigationHints: false,
      focusIndicatorStyle: 'strong',
    };
    expect(accessibilityPreferencesSchema.parse(input)).toEqual(input);
  });

  it('accepts undefined for optional fields', () => {
    expect(accessibilityPreferencesSchema.parse({})).toEqual({});
  });

  it('rejects invalid color blind mode', () => {
    const input = { colorBlindMode: 'invalid' };
    expect(() => accessibilityPreferencesSchema.parse(input)).toThrow();
  });
});

describe('gameplayPreferencesSchema', () => {
  it('validates correct gameplay settings', () => {
    expect(gameplayPreferencesSchema.parse(defaultGameplayPreferences)).toEqual(
      defaultGameplayPreferences,
    );
  });

  it('accepts valid difficulty levels', () => {
    const difficulties = ['tutorial', 'easy', 'normal', 'hard'];
    for (const difficulty of difficulties) {
      expect(gameplayPreferencesSchema.parse({ difficulty })).toEqual({ difficulty });
    }
  });

  it('rejects invalid difficulty', () => {
    expect(() => gameplayPreferencesSchema.parse({ difficulty: 'impossible' })).toThrow();
  });
});

describe('audioPreferencesSchema', () => {
  it('validates correct audio settings', () => {
    expect(audioPreferencesSchema.parse(defaultAudioPreferences)).toEqual(defaultAudioPreferences);
  });

  it('validates text to speech speed range', () => {
    expect(audioPreferencesSchema.parse({ textToSpeechSpeed: 150 })).toEqual({
      textToSpeechSpeed: 150,
    });
  });

  it('rejects text to speech speed below minimum', () => {
    expect(() => audioPreferencesSchema.parse({ textToSpeechSpeed: 40 })).toThrow();
  });
});

describe('accountPreferencesSchema', () => {
  it('validates correct account settings', () => {
    expect(accountPreferencesSchema.parse(defaultAccountPreferences)).toEqual(
      defaultAccountPreferences,
    );
  });

  it('validates privacy modes', () => {
    const modes = ['public', 'friends', 'private'];
    for (const mode of modes) {
      expect(accountPreferencesSchema.parse({ privacyMode: mode })).toEqual({ privacyMode: mode });
    }
  });

  it('validates display name length', () => {
    expect(accountPreferencesSchema.parse({ displayName: 'a'.repeat(50) })).toEqual({
      displayName: 'a'.repeat(50),
    });
  });

  it('rejects display name too long', () => {
    expect(() => accountPreferencesSchema.parse({ displayName: 'a'.repeat(51) })).toThrow();
  });

  it('rejects empty display name', () => {
    expect(() => accountPreferencesSchema.parse({ displayName: '' })).toThrow();
  });
});

describe('userPreferencesSchema with new categories', () => {
  it('validates complete user preferences', () => {
    const input = {
      themePreferences: { theme: 'amber' },
      accessibilityPreferences: { reducedMotion: true },
      gameplayPreferences: { difficulty: 'hard' },
      audioPreferences: { masterVolume: 80 },
      accountPreferences: { privacyMode: 'private' },
    };
    expect(userPreferencesSchema.parse(input)).toEqual(input);
  });

  it('accepts partial preferences', () => {
    expect(userPreferencesSchema.parse({ themePreferences: { theme: 'green' } })).toEqual({
      themePreferences: { theme: 'green' },
    });
  });
});
