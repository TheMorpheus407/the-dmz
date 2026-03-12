import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

import { soundCaptionStore } from './sound-caption';

vi.useFakeTimers();

describe('Sound Caption Store', () => {
  beforeEach(() => {
    vi.stubGlobal('browser', true);
    soundCaptionStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with empty captions', () => {
    const captions = get(soundCaptionStore);
    expect(captions).toEqual([]);
  });

  it('should add caption when showCaption is called', () => {
    soundCaptionStore.showCaption('newEmail');
    const captions = get(soundCaptionStore);
    expect(captions.length).toBe(1);
    expect(captions[0]!.text).toBe('New email received');
  });

  it('should add caption with correct category', () => {
    soundCaptionStore.showCaption('approveStamp');
    const captions = get(soundCaptionStore);
    expect(captions.length).toBe(1);
    expect(captions[0]!.category).toBe('stamps');
  });

  it('should auto-remove caption after duration', () => {
    soundCaptionStore.showCaption('newEmail');
    expect(get(soundCaptionStore).length).toBe(1);

    vi.advanceTimersByTime(3001);
    expect(get(soundCaptionStore).length).toBe(0);
  });

  it('should support multiple captions', () => {
    soundCaptionStore.showCaption('newEmail');
    soundCaptionStore.showCaption('approveStamp');
    soundCaptionStore.showCaption('denyStamp');

    const captions = get(soundCaptionStore);
    expect(captions.length).toBe(3);
  });

  it('should handle unknown sound ids gracefully', () => {
    soundCaptionStore.showCaption('unknownSound');
    const captions = get(soundCaptionStore);
    expect(captions.length).toBe(0);
  });

  it('should clear all captions', () => {
    soundCaptionStore.showCaption('newEmail');
    soundCaptionStore.showCaption('approveStamp');
    soundCaptionStore.clear();

    const captions = get(soundCaptionStore);
    expect(captions.length).toBe(0);
  });

  it('should have unique ids for each caption', () => {
    soundCaptionStore.showCaption('newEmail');
    soundCaptionStore.showCaption('newEmail');
    soundCaptionStore.showCaption('newEmail');

    const captions = get(soundCaptionStore);
    const ids = captions.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});
