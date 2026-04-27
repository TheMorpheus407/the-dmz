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
  lowHum: { text: 'Data center ambient: calm hum', category: SoundCategory.AMBIENT },
  guardedHum: { text: 'Data center ambient: guarded', category: SoundCategory.AMBIENT },
  elevatedHum: { text: 'Data center ambient: elevated', category: SoundCategory.AMBIENT },
  highHum: { text: 'Data center ambient: high alert', category: SoundCategory.AMBIENT },
  severeDrone: { text: 'Data center ambient: SEVERE drone', category: SoundCategory.AMBIENT },
  keyClick: { text: 'Keyboard click', category: SoundCategory.UI_FEEDBACK },
  panelSwitch: { text: 'Panel switch', category: SoundCategory.UI_FEEDBACK },
  buttonPress: { text: 'Button press', category: SoundCategory.UI_FEEDBACK },
  newEmail: { text: 'New email received', category: SoundCategory.ALERTS },
  threatEscalation: { text: 'Threat escalation warning', category: SoundCategory.ALERTS },
  breachAlarm: { text: 'BREACH ALARM', category: SoundCategory.ALERTS },
  approveStamp: { text: 'Stamp: APPROVED', category: SoundCategory.STAMPS },
  denyStamp: { text: 'Stamp: DENIED', category: SoundCategory.STAMPS },
  storySting: { text: 'Narrative sting', category: SoundCategory.NARRATIVE },
  morpheusMessage: { text: 'Morpheus message incoming', category: SoundCategory.NARRATIVE },
  crtPowerOn: { text: 'CRT power on', category: SoundCategory.EFFECTS },
  staticBurst: { text: 'Static burst', category: SoundCategory.EFFECTS },
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
