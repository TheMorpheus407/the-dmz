import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { accountStore } from './account.store';
import { defaultAccountSettings } from './defaults';

describe('accountStore', () => {
  beforeEach(() => {
    accountStore.resetToDefaults();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = get(accountStore);
      expect(state.displayName).toBe('');
      expect(state.privacyMode).toBe('public');
    });
  });

  describe('setDisplayName', () => {
    it('sets display name', () => {
      accountStore.setDisplayName('Player1');
      expect(get(accountStore).displayName).toBe('Player1');
    });

    it('updates display name', () => {
      accountStore.setDisplayName('Player1');
      accountStore.setDisplayName('Player2');
      expect(get(accountStore).displayName).toBe('Player2');
    });

    it('allows empty display name', () => {
      accountStore.setDisplayName('Player1');
      accountStore.setDisplayName('');
      expect(get(accountStore).displayName).toBe('');
    });

    it('allows special characters in display name', () => {
      accountStore.setDisplayName('Player_123!');
      expect(get(accountStore).displayName).toBe('Player_123!');
    });
  });

  describe('setPrivacyMode', () => {
    it('sets privacy mode to private', () => {
      accountStore.setPrivacyMode('private');
      expect(get(accountStore).privacyMode).toBe('private');
    });

    it('sets privacy mode to friends', () => {
      accountStore.setPrivacyMode('friends');
      expect(get(accountStore).privacyMode).toBe('friends');
    });

    it('sets privacy mode to public', () => {
      accountStore.setPrivacyMode('private');
      accountStore.setPrivacyMode('public');
      expect(get(accountStore).privacyMode).toBe('public');
    });
  });

  describe('updateAccount', () => {
    it('updates multiple settings at once', () => {
      accountStore.updateAccount({
        displayName: 'TestPlayer',
        privacyMode: 'private',
      });
      const state = get(accountStore);
      expect(state.displayName).toBe('TestPlayer');
      expect(state.privacyMode).toBe('private');
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      accountStore.updateAccount({
        displayName: 'TestPlayer',
        privacyMode: 'private',
      });

      accountStore.resetToDefaults();

      const state = get(accountStore);
      expect(state).toEqual(defaultAccountSettings);
    });
  });
});
