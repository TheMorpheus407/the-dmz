import { describe, it, expect, vi } from 'vitest';

import {
  SoundCategory,
  type SoundSettings,
  DEFAULT_SOUND_SETTINGS,
  SOUND_DEFINITIONS,
} from './types';

vi.mock('$app/environment', () => ({
  browser: true,
}));

describe('Sound Types', () => {
  it('should have all 6 sound categories defined', () => {
    expect(SoundCategory.Ambient).toBe('ambient');
    expect(SoundCategory.UiFeedback).toBe('uiFeedback');
    expect(SoundCategory.Alerts).toBe('alerts');
    expect(SoundCategory.Stamps).toBe('stamps');
    expect(SoundCategory.Narrative).toBe('narrative');
    expect(SoundCategory.Effects).toBe('effects');
  });

  it('should have default sound settings', () => {
    expect(DEFAULT_SOUND_SETTINGS.masterVolume).toBe(80);
    expect(DEFAULT_SOUND_SETTINGS.categories).toBeDefined();
    expect(Object.keys(DEFAULT_SOUND_SETTINGS.categories).length).toBe(6);
  });

  it('should have ambient disabled by default', () => {
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Ambient].enabled).toBe(false);
  });

  it('should have all other categories enabled by default', () => {
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UiFeedback].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Alerts].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Stamps].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Narrative].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Effects].enabled).toBe(true);
  });

  it('should have default volumes', () => {
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Ambient].volume).toBe(80);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UiFeedback].volume).toBe(60);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Alerts].volume).toBe(80);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Stamps].volume).toBe(100);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Narrative].volume).toBe(70);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.Effects].volume).toBe(80);
  });
});

describe('Sound Definitions', () => {
  it('should have variants for all categories', () => {
    expect(SOUND_DEFINITIONS[SoundCategory.Ambient].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.UiFeedback].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.Alerts].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.Stamps].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.Narrative].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.Effects].variants.length).toBeGreaterThan(0);
  });

  it('should have correct ambient variants for threat levels', () => {
    const ambientVariants = SOUND_DEFINITIONS[SoundCategory.Ambient].variants.map((v) => v.id);
    expect(ambientVariants).toContain('lowHum');
    expect(ambientVariants).toContain('severeDrone');
  });

  it('should have UI feedback variants', () => {
    const uiVariants = SOUND_DEFINITIONS[SoundCategory.UiFeedback].variants.map((v) => v.id);
    expect(uiVariants).toContain('keyClick');
    expect(uiVariants).toContain('panelSwitch');
    expect(uiVariants).toContain('buttonPress');
  });

  it('should have alert variants', () => {
    const alertVariants = SOUND_DEFINITIONS[SoundCategory.Alerts].variants.map((v) => v.id);
    expect(alertVariants).toContain('newEmail');
    expect(alertVariants).toContain('threatEscalation');
    expect(alertVariants).toContain('breachAlarm');
  });

  it('should have stamp variants', () => {
    const stampVariants = SOUND_DEFINITIONS[SoundCategory.Stamps].variants.map((v) => v.id);
    expect(stampVariants).toContain('approveStamp');
    expect(stampVariants).toContain('denyStamp');
  });

  it('should have narrative variants', () => {
    const narrativeVariants = SOUND_DEFINITIONS[SoundCategory.Narrative].variants.map((v) => v.id);
    expect(narrativeVariants).toContain('storySting');
    expect(narrativeVariants).toContain('morpheusMessage');
  });

  it('should have effects variants', () => {
    const effectsVariants = SOUND_DEFINITIONS[SoundCategory.Effects].variants.map((v) => v.id);
    expect(effectsVariants).toContain('crtPowerOn');
    expect(effectsVariants).toContain('staticBurst');
  });

  it('should have durations for variants that need them', () => {
    const ambientVariants = SOUND_DEFINITIONS[SoundCategory.Ambient].variants;
    ambientVariants.forEach((variant) => {
      expect(variant.duration).toBeDefined();
      expect(variant.duration).toBeGreaterThan(0);
    });
  });
});

describe('Sound Settings', () => {
  it('should create valid sound settings object', () => {
    const settings: SoundSettings = {
      masterVolume: 50,
      categories: {
        [SoundCategory.Ambient]: { enabled: true, volume: 60 },
        [SoundCategory.UiFeedback]: { enabled: false, volume: 70 },
        [SoundCategory.Alerts]: { enabled: true, volume: 80 },
        [SoundCategory.Stamps]: { enabled: true, volume: 90 },
        [SoundCategory.Narrative]: { enabled: false, volume: 50 },
        [SoundCategory.Effects]: { enabled: true, volume: 75 },
      },
    };

    expect(settings.masterVolume).toBe(50);
    expect(settings.categories[SoundCategory.Ambient].enabled).toBe(true);
    expect(settings.categories[SoundCategory.Ambient].volume).toBe(60);
  });
});
