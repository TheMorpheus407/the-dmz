import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

import {
  uiStore,
  activePanel,
  modalState,
  notifications,
  notificationQueue,
  hoverState,
  focusState,
  animationState,
  formInput,
  sidebarCollapsed,
  currentRoute,
  isMobile,
  keyboardShortcutsEnabled,
  currentPhase,
  currentViewConfig,
  canSelectEmail,
  canMakeDecision,
  canAdvanceDay,
  canUpgradeFacility,
} from './ui-store';

describe('uiStore', () => {
  beforeEach(() => {
    uiStore.reset();
  });

  describe('active panel', () => {
    it('should have default active panel', () => {
      expect(get(activePanel)).toBe('landing');
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
      expect(get(notificationQueue)).toEqual([]);
    });

    it('should add game notification with title', () => {
      uiStore.addGameNotification('Request approved', 'decision', {
        title: 'Decision Made',
      });

      const notifs = get(notifications);
      expect(notifs).toHaveLength(1);
      expect(notifs[0]?.message).toBe('Request approved');
      expect(notifs[0]?.title).toBe('Decision Made');
      expect(notifs[0]?.type).toBe('decision');
    });

    it('should add all game notification types', () => {
      uiStore.addGameNotification('Decision feedback', 'decision');
      uiStore.addGameNotification('Threat detected', 'threat');
      uiStore.addGameNotification('Incident created', 'incident');
      uiStore.addGameNotification('Breach alert', 'breach');
      uiStore.addGameNotification('System message', 'system');
      uiStore.addGameNotification('Achievement unlocked', 'achievement');

      const notifs = get(notifications);
      const queued = get(notificationQueue);
      expect(notifs).toHaveLength(3);
      expect(queued).toHaveLength(3);
      expect(notifs[0]?.type).toBe('decision');
      expect(notifs[1]?.type).toBe('threat');
      expect(notifs[2]?.type).toBe('incident');
      expect(queued[0]?.type).toBe('breach');
      expect(queued[1]?.type).toBe('system');
      expect(queued[2]?.type).toBe('achievement');
    });

    it('should queue notifications when max visible exceeded', () => {
      uiStore.addNotification('Toast 1', 'info', 0);
      uiStore.addNotification('Toast 2', 'info', 0);
      uiStore.addNotification('Toast 3', 'info', 0);
      uiStore.addNotification('Toast 4', 'info', 0);
      uiStore.addNotification('Toast 5', 'info', 0);

      expect(get(notifications)).toHaveLength(3);
      expect(get(notificationQueue)).toHaveLength(2);
    });

    it('should promote queued notification when one is removed', () => {
      uiStore.addNotification('Toast 1', 'info', 0);
      uiStore.addNotification('Toast 2', 'info', 0);
      uiStore.addNotification('Toast 3', 'info', 0);
      uiStore.addNotification('Toast 4', 'info', 0);

      const notifsBefore = get(notifications);
      const firstId = notifsBefore[0]?.id;

      if (firstId) {
        uiStore.removeNotification(firstId);
      }

      const notifsAfter = get(notifications);
      expect(notifsAfter).toHaveLength(3);
      expect(notifsAfter[2]?.message).toBe('Toast 4');
      expect(get(notificationQueue)).toHaveLength(0);
    });

    it('should clear both notifications and queue', () => {
      uiStore.addNotification('Toast 1', 'info', 0);
      uiStore.addNotification('Toast 2', 'info', 0);
      uiStore.addNotification('Toast 3', 'info', 0);
      uiStore.addNotification('Toast 4', 'info', 0);

      uiStore.clearNotifications();

      expect(get(notifications)).toHaveLength(0);
      expect(get(notificationQueue)).toHaveLength(0);
    });

    it('should add notification with source', () => {
      uiStore.addNotification('Test message', 'info', 5000, { source: 'SYSOP-7' });

      const notifs = get(notifications);
      expect(notifs[0]?.source).toBe('SYSOP-7');
    });

    it('should add notification with action', () => {
      const actionClick = vi.fn();
      uiStore.addNotification('Test message', 'info', 5000, {
        action: { label: 'View', onClick: actionClick },
      });

      const notifs = get(notifications);
      expect(notifs[0]?.action).toBeDefined();
      expect(notifs[0]?.action?.label).toBe('View');
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

      expect(get(activePanel)).toBe('landing');
      expect(get(modalState).isOpen).toBe(false);
      expect(get(notifications)).toEqual([]);
      expect(get(hoverState).emailId).toBe(null);
      expect(get(formInput).values).toEqual({});
      expect(get(sidebarCollapsed)).toBe(false);
    });
  });

  describe('phase handling', () => {
    it('should have null current phase initially', () => {
      expect(get(currentPhase)).toBe(null);
    });

    it('should set phase and update view config', () => {
      uiStore.setPhase('DAY_START');

      expect(get(currentPhase)).toBe('DAY_START');
      const viewConfig = get(currentViewConfig);
      expect(viewConfig.mainPanel).toBe('facility');
      expect(viewConfig.showFacility).toBe(true);
    });

    it('should set phase to EMAIL_TRIAGE and show inbox', () => {
      uiStore.setPhase('EMAIL_TRIAGE');

      expect(get(currentPhase)).toBe('EMAIL_TRIAGE');
      const viewConfig = get(currentViewConfig);
      expect(viewConfig.showInbox).toBe(true);
      expect(viewConfig.showEmail).toBe(true);
    });

    it('should set phase to DAY_END and show day summary', () => {
      uiStore.setPhase('DAY_END');

      expect(get(currentPhase)).toBe('DAY_END');
      const viewConfig = get(currentViewConfig);
      expect(viewConfig.showDaySummary).toBe(true);
      expect(viewConfig.mainPanel).toBe('day-summary');
    });

    it('should track previous phase', () => {
      uiStore.setPhase('DAY_START');
      uiStore.setPhase('EMAIL_TRIAGE');

      const state = get(uiStore);
      expect(state.previousPhase).toBe('DAY_START');
      expect(state.currentPhase).toBe('EMAIL_TRIAGE');
    });

    it('should set transitioning state on phase change', () => {
      uiStore.setPhase('DAY_START');
      expect(get(animationState).isTransitioning).toBe(false);

      uiStore.setPhase('EMAIL_TRIAGE');
      expect(get(animationState).isTransitioning).toBe(true);
      expect(get(animationState).transitionType).toBe('slide');
    });
  });

  describe('phase action permissions', () => {
    it('should allow selectEmail in EMAIL_TRIAGE phase', () => {
      uiStore.setPhase('EMAIL_TRIAGE');
      expect(get(canSelectEmail)).toBe(true);
    });

    it('should not allow selectEmail in DAY_START phase', () => {
      uiStore.setPhase('DAY_START');
      expect(get(canSelectEmail)).toBe(false);
    });

    it('should allow makeDecision in DECISION_RESOLUTION phase', () => {
      uiStore.setPhase('DECISION_RESOLUTION');
      expect(get(canMakeDecision)).toBe(true);
    });

    it('should not allow makeDecision in EMAIL_TRIAGE phase', () => {
      uiStore.setPhase('EMAIL_TRIAGE');
      expect(get(canMakeDecision)).toBe(false);
    });

    it('should allow advanceDay in DAY_START phase', () => {
      uiStore.setPhase('DAY_START');
      expect(get(canAdvanceDay)).toBe(true);
    });

    it('should allow upgradeFacility in DAY_START phase', () => {
      uiStore.setPhase('DAY_START');
      expect(get(canUpgradeFacility)).toBe(true);
    });

    it('should not allow upgradeFacility in EMAIL_TRIAGE phase', () => {
      uiStore.setPhase('EMAIL_TRIAGE');
      expect(get(canUpgradeFacility)).toBe(false);
    });
  });

  describe('clearPhase', () => {
    it('should clear current phase but preserve previous', () => {
      uiStore.setPhase('DAY_START');
      uiStore.setPhase('EMAIL_TRIAGE');
      uiStore.clearPhase();

      const state = get(uiStore);
      expect(state.currentPhase).toBe(null);
      expect(state.previousPhase).toBe('EMAIL_TRIAGE');
    });
  });
});
