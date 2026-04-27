export enum SoundCategory {
  AMBIENT = 'ambient',
  UI_FEEDBACK = 'ui_feedback',
  ALERTS = 'alerts',
  STAMPS = 'stamps',
  NARRATIVE = 'narrative',
  EFFECTS = 'effects',
}

export interface SoundVariant {
  id: string;
  file: string;
  duration?: number;
}

export interface SoundDefinition {
  category: SoundCategory;
  variants: SoundVariant[];
}

export interface SoundSettings {
  masterVolume: number;
  categories: Record<
    SoundCategory,
    {
      enabled: boolean;
      volume: number;
    }
  >;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 80,
  categories: {
    [SoundCategory.AMBIENT]: {
      enabled: false,
      volume: 80,
    },
    [SoundCategory.UI_FEEDBACK]: {
      enabled: true,
      volume: 60,
    },
    [SoundCategory.ALERTS]: {
      enabled: true,
      volume: 80,
    },
    [SoundCategory.STAMPS]: {
      enabled: true,
      volume: 100,
    },
    [SoundCategory.NARRATIVE]: {
      enabled: true,
      volume: 70,
    },
    [SoundCategory.EFFECTS]: {
      enabled: true,
      volume: 80,
    },
  },
};

export const SOUND_DEFINITIONS: Record<
  SoundCategory,
  { variants: { id: string; duration?: number }[] }
> = {
  [SoundCategory.AMBIENT]: {
    variants: [
      { id: 'lowHum', duration: 3000 },
      { id: 'guardedHum', duration: 3000 },
      { id: 'elevatedHum', duration: 3000 },
      { id: 'highHum', duration: 3000 },
      { id: 'severeDrone', duration: 3000 },
    ],
  },
  [SoundCategory.UI_FEEDBACK]: {
    variants: [
      { id: 'keyClick', duration: 50 },
      { id: 'panelSwitch', duration: 100 },
      { id: 'buttonPress', duration: 80 },
    ],
  },
  [SoundCategory.ALERTS]: {
    variants: [
      { id: 'newEmail', duration: 500 },
      { id: 'threatEscalation', duration: 800 },
      { id: 'breachAlarm', duration: 1000 },
    ],
  },
  [SoundCategory.STAMPS]: {
    variants: [
      { id: 'approveStamp', duration: 300 },
      { id: 'denyStamp', duration: 300 },
    ],
  },
  [SoundCategory.NARRATIVE]: {
    variants: [
      { id: 'storySting', duration: 2000 },
      { id: 'morpheusMessage', duration: 3000 },
    ],
  },
  [SoundCategory.EFFECTS]: {
    variants: [
      { id: 'crtPowerOn', duration: 800 },
      { id: 'staticBurst', duration: 400 },
    ],
  },
};

export interface SoundManager {
  play(category: SoundCategory, variantId?: string): void;
  stop(category: SoundCategory): void;
  stopAll(): void;
  setVolume(category: SoundCategory, volume: number): void;
  setMasterVolume(volume: number): void;
  mute(category?: SoundCategory): void;
  unmute(category?: SoundCategory): void;
  isEnabled(category: SoundCategory): boolean;
  isMuted(category?: SoundCategory): boolean;
  getVolume(category: SoundCategory): number;
  getMasterVolume(): number;
  getSettings(): SoundSettings;
  setSettings(settings: SoundSettings): void;
}
