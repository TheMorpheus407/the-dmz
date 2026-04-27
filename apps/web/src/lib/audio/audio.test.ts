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
    expect(SoundCategory.AMBIENT).toBe('ambient');
    expect(SoundCategory.UI_FEEDBACK).toBe('ui_feedback');
    expect(SoundCategory.ALERTS).toBe('alerts');
    expect(SoundCategory.STAMPS).toBe('stamps');
    expect(SoundCategory.NARRATIVE).toBe('narrative');
    expect(SoundCategory.EFFECTS).toBe('effects');
  });

  it('should have default sound settings', () => {
    expect(DEFAULT_SOUND_SETTINGS.masterVolume).toBe(80);
    expect(DEFAULT_SOUND_SETTINGS.categories).toBeDefined();
    expect(Object.keys(DEFAULT_SOUND_SETTINGS.categories).length).toBe(6);
  });

  it('should have ambient disabled by default', () => {
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.AMBIENT].enabled).toBe(false);
  });

  it('should have all other categories enabled by default', () => {
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UI_FEEDBACK].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.ALERTS].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.STAMPS].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.NARRATIVE].enabled).toBe(true);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.EFFECTS].enabled).toBe(true);
  });

  it('should have default volumes', () => {
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.AMBIENT].volume).toBe(80);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.UI_FEEDBACK].volume).toBe(60);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.ALERTS].volume).toBe(80);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.STAMPS].volume).toBe(100);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.NARRATIVE].volume).toBe(70);
    expect(DEFAULT_SOUND_SETTINGS.categories[SoundCategory.EFFECTS].volume).toBe(80);
  });
});

describe('Sound Definitions', () => {
  it('should have variants for all categories', () => {
    expect(SOUND_DEFINITIONS[SoundCategory.AMBIENT].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.UI_FEEDBACK].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.ALERTS].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.STAMPS].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.NARRATIVE].variants.length).toBeGreaterThan(0);
    expect(SOUND_DEFINITIONS[SoundCategory.EFFECTS].variants.length).toBeGreaterThan(0);
  });

  it('should have correct ambient variants for threat levels', () => {
    const ambientVariants = SOUND_DEFINITIONS[SoundCategory.AMBIENT].variants.map((v) => v.id);
    expect(ambientVariants).toContain('lowHum');
    expect(ambientVariants).toContain('severeDrone');
  });

  it('should have UI feedback variants', () => {
    const uiVariants = SOUND_DEFINITIONS[SoundCategory.UI_FEEDBACK].variants.map((v) => v.id);
    expect(uiVariants).toContain('keyClick');
    expect(uiVariants).toContain('panelSwitch');
    expect(uiVariants).toContain('buttonPress');
  });

  it('should have alert variants', () => {
    const alertVariants = SOUND_DEFINITIONS[SoundCategory.ALERTS].variants.map((v) => v.id);
    expect(alertVariants).toContain('newEmail');
    expect(alertVariants).toContain('threatEscalation');
    expect(alertVariants).toContain('breachAlarm');
  });

  it('should have stamp variants', () => {
    const stampVariants = SOUND_DEFINITIONS[SoundCategory.STAMPS].variants.map((v) => v.id);
    expect(stampVariants).toContain('approveStamp');
    expect(stampVariants).toContain('denyStamp');
  });

  it('should have narrative variants', () => {
    const narrativeVariants = SOUND_DEFINITIONS[SoundCategory.NARRATIVE].variants.map((v) => v.id);
    expect(narrativeVariants).toContain('storySting');
    expect(narrativeVariants).toContain('morpheusMessage');
  });

  it('should have effects variants', () => {
    const effectsVariants = SOUND_DEFINITIONS[SoundCategory.EFFECTS].variants.map((v) => v.id);
    expect(effectsVariants).toContain('crtPowerOn');
    expect(effectsVariants).toContain('staticBurst');
  });

  it('should have durations for variants that need them', () => {
    const ambientVariants = SOUND_DEFINITIONS[SoundCategory.AMBIENT].variants;
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
        [SoundCategory.AMBIENT]: { enabled: true, volume: 60 },
        [SoundCategory.UI_FEEDBACK]: { enabled: false, volume: 70 },
        [SoundCategory.ALERTS]: { enabled: true, volume: 80 },
        [SoundCategory.STAMPS]: { enabled: true, volume: 90 },
        [SoundCategory.NARRATIVE]: { enabled: false, volume: 50 },
        [SoundCategory.EFFECTS]: { enabled: true, volume: 75 },
      },
    };

    expect(settings.masterVolume).toBe(50);
    expect(settings.categories[SoundCategory.AMBIENT].enabled).toBe(true);
    expect(settings.categories[SoundCategory.AMBIENT].volume).toBe(60);
  });
});
