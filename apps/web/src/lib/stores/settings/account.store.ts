import { writable } from 'svelte/store';

import type { PrivacyMode } from '@the-dmz/shared/schemas';

import { defaultAccountSettings } from './defaults';

import type { AccountSettings } from './types';

function createAccountStore() {
  const { subscribe, set, update } = writable<AccountSettings>(defaultAccountSettings);

  return {
    subscribe,
    set,
    update,

    updateAccount(settings: Partial<AccountSettings>): void {
      update((state) => ({ ...state, ...settings }));
    },

    setDisplayName(name: string): void {
      update((state) => ({ ...state, displayName: name }));
    },

    setPrivacyMode(mode: PrivacyMode): void {
      update((state) => ({ ...state, privacyMode: mode }));
    },

    resetToDefaults(): void {
      set(defaultAccountSettings);
    },
  };
}

export const accountStore = createAccountStore();
