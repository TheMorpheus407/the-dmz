export enum SoundCategory {
  Ambient = 'ambient',
  UiFeedback = 'uiFeedback',
  Alerts = 'alerts',
  Stamps = 'stamps',
  Narrative = 'narrative',
  Effects = 'effects',
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
    [SoundCategory.Ambient]: {
      enabled: false,
      volume: 80,
    },
    [SoundCategory.UiFeedback]: {
      enabled: true,
      volume: 60,
    },
    [SoundCategory.Alerts]: {
      enabled: true,
      volume: 80,
    },
    [SoundCategory.Stamps]: {
      enabled: true,
      volume: 100,
    },
    [SoundCategory.Narrative]: {
      enabled: true,
      volume: 70,
    },
    [SoundCategory.Effects]: {
      enabled: true,
      volume: 80,
    },
  },
};

export const SOUND_DEFINITIONS: Record<
  SoundCategory,
  { variants: { id: string; duration?: number }[] }
> = {
  [SoundCategory.Ambient]: {
    variants: [
      { id: 'lowHum', duration: 3000 },
      { id: 'guardedHum', duration: 3000 },
      { id: 'elevatedHum', duration: 3000 },
      { id: 'highHum', duration: 3000 },
      { id: 'severeDrone', duration: 3000 },
    ],
  },
  [SoundCategory.UiFeedback]: {
    variants: [
      { id: 'keyClick', duration: 50 },
      { id: 'panelSwitch', duration: 100 },
      { id: 'buttonPress', duration: 80 },
    ],
  },
  [SoundCategory.Alerts]: {
    variants: [
      { id: 'newEmail', duration: 500 },
      { id: 'threatEscalation', duration: 800 },
      { id: 'breachAlarm', duration: 1000 },
    ],
  },
  [SoundCategory.Stamps]: {
    variants: [
      { id: 'approveStamp', duration: 300 },
      { id: 'denyStamp', duration: 300 },
    ],
  },
  [SoundCategory.Narrative]: {
    variants: [
      { id: 'storySting', duration: 2000 },
      { id: 'morpheusMessage', duration: 3000 },
    ],
  },
  [SoundCategory.Effects]: {
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
