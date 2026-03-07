import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  uiStore,
  activePanel,
  modalState,
  notifications,
  hoverState,
  focusState,
  animationState,
  formInput,
  sidebarCollapsed,
  currentRoute,
  isMobile,
  keyboardShortcutsEnabled,
} from './ui-store';

describe('uiStore', () => {
  beforeEach(() => {
    uiStore.reset();
  });

  describe('active panel', () => {
    it('should have default active panel', () => {
      expect(get(activePanel)).toBe('inbox');
    });

    it('should set active panel', () => {
      uiStore.setActivePanel('facility');
      expect(get(activePanel)).toBe('facility');

      uiStore.setActivePanel('email');
      expect(get(activePanel)).toBe('email');
    });
  });

  describe('modals', () => {
    it('should have default modal state', () => {
      const state = get(modalState);
      expect(state.isOpen).toBe(false);
      expect(state.type).toBe(null);
    });

    it('should open modal', () => {
      uiStore.openModal('verification', { emailId: 'email-1' });

      const state = get(modalState);
      expect(state.isOpen).toBe(true);
      expect(state.type).toBe('verification');
      expect(state.data).toEqual({ emailId: 'email-1' });
    });

    it('should close modal', () => {
      uiStore.openModal('worksheet');
      uiStore.closeModal();

      const state = get(modalState);
      expect(state.isOpen).toBe(false);
      expect(state.type).toBe(null);
    });

    it('should open different modal types', () => {
      uiStore.openModal('worksheet');
      expect(get(modalState).type).toBe('worksheet');

      uiStore.closeModal();
      uiStore.openModal('upgrade');
      expect(get(modalState).type).toBe('upgrade');
    });
  });

  describe('notifications', () => {
    it('should have empty notifications initially', () => {
      expect(get(notifications)).toEqual([]);
    });

    it('should add notification', () => {
      const id = uiStore.addNotification('Test message', 'info', 0);

      const notifs = get(notifications);
      expect(notifs).toHaveLength(1);
      expect(notifs[0]?.message).toBe('Test message');
      expect(notifs[0]?.type).toBe('info');
      expect(notifs[0]?.id).toBe(id);
    });

    it('should add different notification types', () => {
      uiStore.addNotification('Success', 'success');
      uiStore.addNotification('Warning', 'warning');
      uiStore.addNotification('Error', 'error');

      const notifs = get(notifications);
      expect(notifs).toHaveLength(3);
      expect(notifs[0]?.type).toBe('success');
      expect(notifs[1]?.type).toBe('warning');
      expect(notifs[2]?.type).toBe('error');
    });

    it('should remove notification', () => {
      const id = uiStore.addNotification('Test', 'info', 0);
      uiStore.removeNotification(id);

      expect(get(notifications)).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      uiStore.addNotification('Test 1', 'info', 0);
      uiStore.addNotification('Test 2', 'warning', 0);
      uiStore.clearNotifications();

      expect(get(notifications)).toEqual([]);
    });
  });

  describe('hover state', () => {
    it('should have default hover state', () => {
      const state = get(hoverState);
      expect(state.emailId).toBe(null);
      expect(state.buttonId).toBe(null);
    });

    it('should set hover email', () => {
      uiStore.setHoverEmail('email-1');
      expect(get(hoverState).emailId).toBe('email-1');
    });

    it('should set hover button', () => {
      uiStore.setHoverButton('approve-btn');
      expect(get(hoverState).buttonId).toBe('approve-btn');
    });

    it('should clear hover state', () => {
      uiStore.setHoverEmail('email-1');
      uiStore.setHoverButton('btn');
      uiStore.clearHover();

      const state = get(hoverState);
      expect(state.emailId).toBe(null);
      expect(state.buttonId).toBe(null);
    });
  });

  describe('focus state', () => {
    it('should have default focus state', () => {
      expect(get(focusState).elementId).toBe(null);
    });

    it('should set focus', () => {
      uiStore.setFocus('email-input');
      expect(get(focusState).elementId).toBe('email-input');
    });

    it('should clear focus', () => {
      uiStore.setFocus('email-input');
      uiStore.clearFocus();
      expect(get(focusState).elementId).toBe(null);
    });
  });

  describe('animation state', () => {
    it('should have default animation state', () => {
      const state = get(animationState);
      expect(state.isTransitioning).toBe(false);
      expect(state.transitionType).toBe('none');
    });

    it('should set transitioning state', () => {
      uiStore.setTransitioning(true, 'fade');

      const state = get(animationState);
      expect(state.isTransitioning).toBe(true);
      expect(state.transitionType).toBe('fade');
    });

    it('should set slide transition', () => {
      uiStore.setTransitioning(true, 'slide');
      expect(get(animationState).transitionType).toBe('slide');
    });
  });

  describe('form input state', () => {
    it('should have default form state', () => {
      const state = get(formInput);
      expect(state.values).toEqual({});
      expect(state.errors).toEqual({});
      expect(state.touched).toEqual({});
    });

    it('should set form value', () => {
      uiStore.setFormValue('email', 'test@example.com');

      const state = get(formInput);
      expect(state.values['email']).toBe('test@example.com');
      expect(state.touched['email']).toBe(true);
    });

    it('should set form error', () => {
      uiStore.setFormError('email', 'Invalid email');

      expect(get(formInput).errors['email']).toBe('Invalid email');
    });

    it('should clear form error', () => {
      uiStore.setFormError('email', 'Invalid');
      uiStore.clearFormError('email');

      expect(get(formInput).errors['email']).toBeUndefined();
    });

    it('should reset form', () => {
      uiStore.setFormValue('email', 'test@example.com');
      uiStore.setFormError('email', 'Invalid');
      uiStore.resetForm();

      const state = get(formInput);
      expect(state.values).toEqual({});
      expect(state.errors).toEqual({});
      expect(state.touched).toEqual({});
    });
  });

  describe('sidebar', () => {
    it('should have default sidebar collapsed state', () => {
      expect(get(sidebarCollapsed)).toBe(false);
    });

    it('should toggle sidebar', () => {
      uiStore.toggleSidebar();
      expect(get(sidebarCollapsed)).toBe(true);

      uiStore.toggleSidebar();
      expect(get(sidebarCollapsed)).toBe(false);
    });

    it('should set sidebar collapsed state', () => {
      uiStore.setSidebarCollapsed(true);
      expect(get(sidebarCollapsed)).toBe(true);
    });
  });

  describe('route', () => {
    it('should have default route', () => {
      expect(get(currentRoute)).toBe('/game');
    });

    it('should set route', () => {
      uiStore.setCurrentRoute('/game/inbox');
      expect(get(currentRoute)).toBe('/game/inbox');
    });
  });

  describe('mobile state', () => {
    it('should have default mobile state', () => {
      expect(get(isMobile)).toBe(false);
    });

    it('should set mobile state', () => {
      uiStore.setIsMobile(true);
      expect(get(isMobile)).toBe(true);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should have keyboard shortcuts enabled by default', () => {
      expect(get(keyboardShortcutsEnabled)).toBe(true);
    });

    it('should toggle keyboard shortcuts', () => {
      uiStore.setKeyboardShortcutsEnabled(false);
      expect(get(keyboardShortcutsEnabled)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      uiStore.setActivePanel('facility');
      uiStore.openModal('verification');
      uiStore.addNotification('Test', 'info', 0);
      uiStore.setHoverEmail('email-1');
      uiStore.setFormValue('test', 'value');
      uiStore.setSidebarCollapsed(true);

      uiStore.reset();

      expect(get(activePanel)).toBe('inbox');
      expect(get(modalState).isOpen).toBe(false);
      expect(get(notifications)).toEqual([]);
      expect(get(hoverState).emailId).toBe(null);
      expect(get(formInput).values).toEqual({});
      expect(get(sidebarCollapsed)).toBe(false);
    });
  });
});
