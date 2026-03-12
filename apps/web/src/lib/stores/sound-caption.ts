import { writable } from 'svelte/store';

import { SoundCategory } from '$lib/audio';

export interface CaptionEntry {
  id: string;
  text: string;
  category: SoundCategory;
  timestamp: number;
}

const CAPTION_DURATION = 3000;

const SOUND_CAPTIONS: Record<string, { text: string; category: SoundCategory }> = {
  lowHum: { text: 'Data center ambient: calm hum', category: SoundCategory.Ambient },
  guardedHum: { text: 'Data center ambient: guarded', category: SoundCategory.Ambient },
  elevatedHum: { text: 'Data center ambient: elevated', category: SoundCategory.Ambient },
  highHum: { text: 'Data center ambient: high alert', category: SoundCategory.Ambient },
  severeDrone: { text: 'Data center ambient: SEVERE drone', category: SoundCategory.Ambient },
  keyClick: { text: 'Keyboard click', category: SoundCategory.UiFeedback },
  panelSwitch: { text: 'Panel switch', category: SoundCategory.UiFeedback },
  buttonPress: { text: 'Button press', category: SoundCategory.UiFeedback },
  newEmail: { text: 'New email received', category: SoundCategory.Alerts },
  threatEscalation: { text: 'Threat escalation warning', category: SoundCategory.Alerts },
  breachAlarm: { text: 'BREACH ALARM', category: SoundCategory.Alerts },
  approveStamp: { text: 'Stamp: APPROVED', category: SoundCategory.Stamps },
  denyStamp: { text: 'Stamp: DENIED', category: SoundCategory.Stamps },
  storySting: { text: 'Narrative sting', category: SoundCategory.Narrative },
  morpheusMessage: { text: 'Morpheus message incoming', category: SoundCategory.Narrative },
  crtPowerOn: { text: 'CRT power on', category: SoundCategory.Effects },
  staticBurst: { text: 'Static burst', category: SoundCategory.Effects },
};

function createSoundCaptionStore() {
  const { subscribe, update } = writable<CaptionEntry[]>([]);

  let captionId = 0;

  function showCaption(soundId: string): void {
    const captionInfo = SOUND_CAPTIONS[soundId];
    if (!captionInfo) return;

    const id = `caption-${captionId++}`;
    const entry: CaptionEntry = {
      id,
      text: captionInfo.text,
      category: captionInfo.category,
      timestamp: Date.now(),
    };

    update((captions) => [...captions, entry]);

    setTimeout(() => {
      update((captions) => captions.filter((c) => c.id !== id));
    }, CAPTION_DURATION);
  }

  function clear(): void {
    update(() => []);
  }

  return {
    subscribe,
    showCaption,
    clear,
  };
}

export const soundCaptionStore = createSoundCaptionStore();
