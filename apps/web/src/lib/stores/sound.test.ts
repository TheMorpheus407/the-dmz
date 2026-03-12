import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

import { soundStore } from './sound';

describe('Sound Store', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    vi.stubGlobal('AudioContext', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should have initial default state', () => {
    const state = get(soundStore);
    expect(state.masterVolume).toBe(80);
    expect(state.categories).toBeDefined();
  });

  it('should have ambient disabled by default', () => {
    const state = get(soundStore);
    expect(state.categories.ambient.enabled).toBe(false);
  });

  it('should have other categories enabled by default', () => {
    const state = get(soundStore);
    expect(state.categories.uiFeedback.enabled).toBe(true);
    expect(state.categories.alerts.enabled).toBe(true);
    expect(state.categories.stamps.enabled).toBe(true);
    expect(state.categories.narrative.enabled).toBe(true);
    expect(state.categories.effects.enabled).toBe(true);
  });
});
