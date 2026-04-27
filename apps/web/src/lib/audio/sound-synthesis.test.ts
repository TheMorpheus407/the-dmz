import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SoundCategory } from './types';
import * as soundSynthesisModule from './sound-synthesis';

describe('Sound Synthesis Architecture', () => {
  describe('SOUND_GENERATORS strategy map', () => {
    it('should export a SOUND_GENERATORS record mapping all SoundCategory values to generator functions', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS).toBe('object');

      const categories = Object.values(SoundCategory);
      categories.forEach((category) => {
        expect(soundSynthesisModule.SOUND_GENERATORS[category]).toBeDefined();
        expect(typeof soundSynthesisModule.SOUND_GENERATORS[category]).toBe('function');
      });
    });

    it('should have a generator function for Ambient category', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS[SoundCategory.AMBIENT]).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS[SoundCategory.AMBIENT]).toBe('function');
    });

    it('should have a generator function for UiFeedback category', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS[SoundCategory.UI_FEEDBACK]).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS[SoundCategory.UI_FEEDBACK]).toBe(
        'function',
      );
    });

    it('should have a generator function for Alerts category', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS[SoundCategory.ALERTS]).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS[SoundCategory.ALERTS]).toBe('function');
    });

    it('should have a generator function for Stamps category', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS[SoundCategory.STAMPS]).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS[SoundCategory.STAMPS]).toBe('function');
    });

    it('should have a generator function for Narrative category', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS[SoundCategory.NARRATIVE]).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS[SoundCategory.NARRATIVE]).toBe(
        'function',
      );
    });

    it('should have a generator function for Effects category', () => {
      expect(soundSynthesisModule.SOUND_GENERATORS[SoundCategory.EFFECTS]).toBeDefined();
      expect(typeof soundSynthesisModule.SOUND_GENERATORS[SoundCategory.EFFECTS]).toBe('function');
    });
  });

  describe('Individual generator functions', () => {
    let mockAudioContext: {
      createOscillator: ReturnType<typeof vi.fn>;
      createGain: ReturnType<typeof vi.fn>;
      createBuffer: ReturnType<typeof vi.fn>;
      createBufferSource: ReturnType<typeof vi.fn>;
      createBiquadFilter: ReturnType<typeof vi.fn>;
      currentTime: number;
      sampleRate: number;
    };
    let mockDestination: { connect: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockDestination = {
        connect: vi.fn().mockReturnThis(),
      };

      const mockGainNode = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
      };

      const mockOscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      mockAudioContext = {
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGainNode),
        createBuffer: vi.fn(),
        createBufferSource: vi.fn(),
        createBiquadFilter: vi.fn().mockReturnValue({
          type: 'lowpass',
          frequency: { setValueAtTime: vi.fn() },
        }),
        currentTime: 0,
        sampleRate: 44100,
      };
    });

    it('should export generateAmbientSound function', () => {
      expect(soundSynthesisModule.generateAmbientSound).toBeDefined();
      expect(typeof soundSynthesisModule.generateAmbientSound).toBe('function');
    });

    it('should export generateUiFeedbackSound function', () => {
      expect(soundSynthesisModule.generateUiFeedbackSound).toBeDefined();
      expect(typeof soundSynthesisModule.generateUiFeedbackSound).toBe('function');
    });

    it('should export generateAlertsSound function', () => {
      expect(soundSynthesisModule.generateAlertsSound).toBeDefined();
      expect(typeof soundSynthesisModule.generateAlertsSound).toBe('function');
    });

    it('should export generateStampsSound function', () => {
      expect(soundSynthesisModule.generateStampsSound).toBeDefined();
      expect(typeof soundSynthesisModule.generateStampsSound).toBe('function');
    });

    it('should export generateNarrativeSound function', () => {
      expect(soundSynthesisModule.generateNarrativeSound).toBeDefined();
      expect(typeof soundSynthesisModule.generateNarrativeSound).toBe('function');
    });

    it('should export generateEffectsSound function', () => {
      expect(soundSynthesisModule.generateEffectsSound).toBeDefined();
      expect(typeof soundSynthesisModule.generateEffectsSound).toBe('function');
    });

    describe('generateAmbientSound', () => {
      it('should create oscillator and gain nodes when called with severeDrone variant', () => {
        const generator = soundSynthesisModule.generateAmbientSound;
        if (typeof generator !== 'function') return;

        generator(
          'severeDrone',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });

      it('should create oscillator and gain nodes when called with lowHum variant', () => {
        const generator = soundSynthesisModule.generateAmbientSound;
        if (typeof generator !== 'function') return;

        generator(
          'lowHum',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });
    });

    describe('generateUiFeedbackSound', () => {
      it('should create oscillator and gain nodes for keyClick variant', () => {
        const generator = soundSynthesisModule.generateUiFeedbackSound;
        if (typeof generator !== 'function') return;

        generator(
          'keyClick',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });

      it('should create oscillator and gain nodes for panelSwitch variant', () => {
        const generator = soundSynthesisModule.generateUiFeedbackSound;
        if (typeof generator !== 'function') return;

        generator(
          'panelSwitch',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });
    });

    describe('generateAlertsSound', () => {
      it('should create audio nodes for newEmail variant', () => {
        const generator = soundSynthesisModule.generateAlertsSound;
        if (typeof generator !== 'function') return;

        generator(
          'newEmail',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });

      it('should create audio nodes for threatEscalation variant', () => {
        const generator = soundSynthesisModule.generateAlertsSound;
        if (typeof generator !== 'function') return;

        generator(
          'threatEscalation',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });
    });

    describe('generateStampsSound', () => {
      it('should create audio nodes for approveStamp variant', () => {
        const generator = soundSynthesisModule.generateStampsSound;
        if (typeof generator !== 'function') return;

        generator(
          'approveStamp',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });

      it('should create audio nodes for denyStamp variant', () => {
        const generator = soundSynthesisModule.generateStampsSound;
        if (typeof generator !== 'function') return;

        generator(
          'denyStamp',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });
    });

    describe('generateNarrativeSound', () => {
      it('should create audio nodes for morpheusMessage variant', () => {
        const generator = soundSynthesisModule.generateNarrativeSound;
        if (typeof generator !== 'function') return;

        generator(
          'morpheusMessage',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });

      it('should create audio nodes for storySting variant', () => {
        const generator = soundSynthesisModule.generateNarrativeSound;
        if (typeof generator !== 'function') return;

        generator(
          'storySting',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });
    });

    describe('generateEffectsSound', () => {
      it('should create audio nodes for crtPowerOn variant', () => {
        const generator = soundSynthesisModule.generateEffectsSound;
        if (typeof generator !== 'function') return;

        generator(
          'crtPowerOn',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createOscillator).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });

      it('should create audio nodes for staticBurst variant', () => {
        const generator = soundSynthesisModule.generateEffectsSound;
        if (typeof generator !== 'function') return;

        generator(
          'staticBurst',
          mockAudioContext as unknown as AudioContext,
          mockDestination as unknown as GainNode,
        );

        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(mockAudioContext.createGain).toHaveBeenCalled();
      });
    });
  });

  describe('synthesizeSound function', () => {
    it('should be exported from the module', () => {
      expect(soundSynthesisModule.synthesizeSound).toBeDefined();
      expect(typeof soundSynthesisModule.synthesizeSound).toBe('function');
    });

    it('should accept the same parameters as before (category, variantId, audioContext, destination)', () => {
      const synthesizeSound = soundSynthesisModule.synthesizeSound;
      expect(synthesizeSound.length).toBe(4);
    });
  });
});
