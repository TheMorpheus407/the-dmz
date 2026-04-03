import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { navigationStore } from './navigation.store';

describe('navigationStore', () => {
  beforeEach(() => {
    navigationStore.reset();
  });

  describe('active panel', () => {
    it('should have default active panel as landing', () => {
      const state = get(navigationStore);
      expect(state.activePanel).toBe('landing');
    });

    it('should set active panel', () => {
      navigationStore.setActivePanel('facility');
      const state = get(navigationStore);
      expect(state.activePanel).toBe('facility');
    });

    it('should set active panel to email', () => {
      navigationStore.setActivePanel('email');
      const state = get(navigationStore);
      expect(state.activePanel).toBe('email');
    });

    it('should set active panel to day-summary', () => {
      navigationStore.setActivePanel('day-summary');
      const state = get(navigationStore);
      expect(state.activePanel).toBe('day-summary');
    });

    it('should allow all panel types', () => {
      navigationStore.setActivePanel('landing');
      expect(get(navigationStore).activePanel).toBe('landing');

      navigationStore.setActivePanel('facility');
      expect(get(navigationStore).activePanel).toBe('facility');

      navigationStore.setActivePanel('inbox');
      expect(get(navigationStore).activePanel).toBe('inbox');

      navigationStore.setActivePanel('email');
      expect(get(navigationStore).activePanel).toBe('email');

      navigationStore.setActivePanel('upgrades');
      expect(get(navigationStore).activePanel).toBe('upgrades');

      navigationStore.setActivePanel('worksheet');
      expect(get(navigationStore).activePanel).toBe('worksheet');

      navigationStore.setActivePanel('verification');
      expect(get(navigationStore).activePanel).toBe('verification');

      navigationStore.setActivePanel('day-summary');
      expect(get(navigationStore).activePanel).toBe('day-summary');

      navigationStore.setActivePanel('analytics');
      expect(get(navigationStore).activePanel).toBe('analytics');

      navigationStore.setActivePanel('settings');
      expect(get(navigationStore).activePanel).toBe('settings');

      navigationStore.setActivePanel('terminal');
      expect(get(navigationStore).activePanel).toBe('terminal');

      navigationStore.setActivePanel('documents');
      expect(get(navigationStore).activePanel).toBe('documents');

      navigationStore.setActivePanel('document-comparison');
      expect(get(navigationStore).activePanel).toBe('document-comparison');

      navigationStore.setActivePanel('ransom');
      expect(get(navigationStore).activePanel).toBe('ransom');

      navigationStore.setActivePanel('coop');
      expect(get(navigationStore).activePanel).toBe('coop');
    });
  });

  describe('sidebar', () => {
    it('should have default sidebar collapsed as false', () => {
      const state = get(navigationStore);
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar', () => {
      navigationStore.toggleSidebar();
      const state = get(navigationStore);
      expect(state.sidebarCollapsed).toBe(true);

      navigationStore.toggleSidebar();
      const state2 = get(navigationStore);
      expect(state2.sidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed state to true', () => {
      navigationStore.setSidebarCollapsed(true);
      const state = get(navigationStore);
      expect(state.sidebarCollapsed).toBe(true);
    });

    it('should set sidebar collapsed state to false', () => {
      navigationStore.setSidebarCollapsed(true);
      navigationStore.setSidebarCollapsed(false);
      const state = get(navigationStore);
      expect(state.sidebarCollapsed).toBe(false);
    });
  });

  describe('route', () => {
    it('should have default route as /game', () => {
      const state = get(navigationStore);
      expect(state.currentRoute).toBe('/game');
    });

    it('should set current route', () => {
      navigationStore.setCurrentRoute('/game/inbox');
      const state = get(navigationStore);
      expect(state.currentRoute).toBe('/game/inbox');
    });

    it('should update route multiple times', () => {
      navigationStore.setCurrentRoute('/game/inbox');
      navigationStore.setCurrentRoute('/game/email/123');
      navigationStore.setCurrentRoute('/game/facility');
      const state = get(navigationStore);
      expect(state.currentRoute).toBe('/game/facility');
    });
  });

  describe('mobile state', () => {
    it('should have default isMobile as false', () => {
      const state = get(navigationStore);
      expect(state.isMobile).toBe(false);
    });

    it('should set isMobile to true', () => {
      navigationStore.setIsMobile(true);
      const state = get(navigationStore);
      expect(state.isMobile).toBe(true);
    });

    it('should set isMobile to false', () => {
      navigationStore.setIsMobile(true);
      navigationStore.setIsMobile(false);
      const state = get(navigationStore);
      expect(state.isMobile).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      navigationStore.setActivePanel('facility');
      navigationStore.setSidebarCollapsed(true);
      navigationStore.setCurrentRoute('/game/custom');
      navigationStore.setIsMobile(true);

      navigationStore.reset();

      const state = get(navigationStore);
      expect(state.activePanel).toBe('landing');
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.currentRoute).toBe('/game');
      expect(state.isMobile).toBe(false);
    });
  });
});
