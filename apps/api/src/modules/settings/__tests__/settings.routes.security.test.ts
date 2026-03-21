import { describe, expect, it } from 'vitest';

import {
  themePreferencesSchema,
  accessibilityPreferencesSchema,
  gameplayPreferencesSchema,
  audioPreferencesSchema,
  accountPreferencesSchema,
} from '@the-dmz/shared';

describe('settings route body validation', () => {
  describe('themePreferencesSchema (display category)', () => {
    it('accepts valid display settings', () => {
      const validInput = {
        theme: 'green',
        enableTerminalEffects: true,
        fontSize: 16,
      };

      const result = themePreferencesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('accepts empty object', () => {
      const result = themePreferencesSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects unknown properties due to .strict()', () => {
      const invalidInput = {
        theme: 'green',
        unknownField: 'value',
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects __proto__ pollution payload', () => {
      const invalidInput = {
        __proto__: { polluted: true },
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects constructor.prototype pollution payload', () => {
      const invalidInput = {
        constructor: { prototype: { polluted: true } },
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects prototype property', () => {
      const invalidInput = {
        prototype: { polluted: true },
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects invalid theme value', () => {
      const invalidInput = {
        theme: 'invalid-theme',
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects fontSize below minimum', () => {
      const invalidInput = {
        fontSize: 8,
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects fontSize above maximum', () => {
      const invalidInput = {
        fontSize: 40,
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('accessibilityPreferencesSchema (accessibility category)', () => {
    it('accepts valid accessibility settings', () => {
      const validInput = {
        reducedMotion: true,
        highContrast: false,
        fontSize: 18,
        colorBlindMode: 'protanopia',
      };

      const result = accessibilityPreferencesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('accepts empty object', () => {
      const result = accessibilityPreferencesSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects unknown properties due to .strict()', () => {
      const invalidInput = {
        reducedMotion: true,
        unknownField: 'value',
      };

      expect(() => accessibilityPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects __proto__ pollution payload', () => {
      const invalidInput = {
        __proto__: { polluted: true },
      };

      expect(() => accessibilityPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects constructor prototype pollution payload', () => {
      const invalidInput = {
        constructor: { prototype: { polluted: true } },
      };

      expect(() => accessibilityPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects invalid colorBlindMode', () => {
      const invalidInput = {
        colorBlindMode: 'invalid-mode',
      };

      expect(() => accessibilityPreferencesSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('gameplayPreferencesSchema (gameplay category)', () => {
    it('accepts valid gameplay settings', () => {
      const validInput = {
        difficulty: 'hard',
        notificationVolume: 80,
        notificationDuration: 10,
      };

      const result = gameplayPreferencesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('accepts empty object', () => {
      const result = gameplayPreferencesSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects unknown properties due to .strict()', () => {
      const invalidInput = {
        difficulty: 'normal',
        unknownField: 'value',
      };

      expect(() => gameplayPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects __proto__ pollution payload', () => {
      const invalidInput = {
        __proto__: { polluted: true },
      };

      expect(() => gameplayPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects invalid difficulty level', () => {
      const invalidInput = {
        difficulty: 'impossible',
      };

      expect(() => gameplayPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects notificationVolume above 100', () => {
      const invalidInput = {
        notificationVolume: 150,
      };

      expect(() => gameplayPreferencesSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('audioPreferencesSchema (audio category)', () => {
    it('accepts valid audio settings', () => {
      const validInput = {
        masterVolume: 50,
        muteAll: false,
        textToSpeechEnabled: true,
      };

      const result = audioPreferencesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('accepts empty object', () => {
      const result = audioPreferencesSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects unknown properties due to .strict()', () => {
      const invalidInput = {
        masterVolume: 50,
        unknownField: 'value',
      };

      expect(() => audioPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects __proto__ pollution payload', () => {
      const invalidInput = {
        __proto__: { polluted: true },
      };

      expect(() => audioPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects masterVolume above 100', () => {
      const invalidInput = {
        masterVolume: 150,
      };

      expect(() => audioPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects textToSpeechSpeed below minimum', () => {
      const invalidInput = {
        textToSpeechSpeed: 20,
      };

      expect(() => audioPreferencesSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('accountPreferencesSchema (account category)', () => {
    it('accepts valid account settings', () => {
      const validInput = {
        displayName: 'Test User',
        privacyMode: 'private',
      };

      const result = accountPreferencesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('accepts empty object', () => {
      const result = accountPreferencesSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects unknown properties due to .strict()', () => {
      const invalidInput = {
        displayName: 'Test',
        unknownField: 'value',
      };

      expect(() => accountPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects __proto__ pollution payload', () => {
      const invalidInput = {
        __proto__: { polluted: true },
      };

      expect(() => accountPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects constructor prototype pollution payload', () => {
      const invalidInput = {
        constructor: { prototype: { polluted: true } },
      };

      expect(() => accountPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects invalid privacy mode', () => {
      const invalidInput = {
        privacyMode: 'publicity',
      };

      expect(() => accountPreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects displayName exceeding max length', () => {
      const invalidInput = {
        displayName: 'a'.repeat(51),
      };

      expect(() => accountPreferencesSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('nested object protection', () => {
    it('rejects nested __proto__ in effects object', () => {
      const invalidInput = {
        effects: {
          scanlines: true,
          __proto__: { polluted: true },
        },
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });

    it('rejects nested constructor in effects object', () => {
      const invalidInput = {
        effects: {
          scanlines: true,
          constructor: { prototype: { polluted: true } },
        },
      };

      expect(() => themePreferencesSchema.parse(invalidInput)).toThrow();
    });
  });
});
