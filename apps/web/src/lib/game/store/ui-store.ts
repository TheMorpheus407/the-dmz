import { writable, derived } from 'svelte/store';

import type { GamePhase } from '$lib/game/state/state-machine';
import {
  getViewConfig,
  getActionConfig,
  getShortcutConfig,
  type PhaseViewConfig,
  type PhaseActionConfig,
  type PhaseKeyboardShortcutConfig,
} from '$lib/game/state/phase-config';

export type {
  ActivePanel,
  Toast,
  ToastAction,
  ToastType,
  NotificationPriority,
  ModalState,
  HoverState,
  FocusState,
  AnimationState,
  FormInputState,
  DialogState,
} from './types';

export { navigationStore } from './navigation.store';
export { modalStore } from './modal.store';
export { notificationStore } from './notification.store';
export { dialogStore } from './dialog.store';
export { formStore } from './form.store';
export { interactionStore } from './interaction.store';
export { phaseStore } from './phase.store';

import { navigationStore } from './navigation.store';
import { modalStore } from './modal.store';
import { notificationStore } from './notification.store';
import { dialogStore } from './dialog.store';
import { formStore } from './form.store';
import { interactionStore } from './interaction.store';
import { phaseStore } from './phase.store';

function createUiStore() {
  const { subscribe } = writable({});

  return {
    subscribe,

    setActivePanel(panel: Parameters<typeof navigationStore.setActivePanel>[0]) {
      navigationStore.setActivePanel(panel);
    },

    setPhase(phase: GamePhase) {
      phaseStore.setPhase(phase);
    },

    clearPhase() {
      phaseStore.clearPhase();
    },

    openModal(
      type: Parameters<typeof modalStore.openModal>[0],
      data?: Parameters<typeof modalStore.openModal>[1],
    ) {
      modalStore.openModal(type, data);
    },

    closeModal() {
      modalStore.closeModal();
    },

    addNotification(
      message: string,
      type?: Parameters<typeof notificationStore.addNotification>[1],
      duration?: Parameters<typeof notificationStore.addNotification>[2],
      options?: Parameters<typeof notificationStore.addNotification>[3],
    ) {
      return notificationStore.addNotification(message, type, duration, options);
    },

    addGameNotification(
      message: string,
      type: Parameters<typeof notificationStore.addGameNotification>[1],
      options?: Parameters<typeof notificationStore.addGameNotification>[2],
    ) {
      return notificationStore.addGameNotification(message, type, options);
    },

    removeNotification(id: string) {
      notificationStore.removeNotification(id);
    },

    clearNotifications() {
      notificationStore.clearNotifications();
    },

    setHoverEmail(emailId: string | null) {
      interactionStore.setHoverEmail(emailId);
    },

    setHoverButton(buttonId: string | null) {
      interactionStore.setHoverButton(buttonId);
    },

    clearHover() {
      interactionStore.clearHover();
    },

    setFocus(elementId: string | null) {
      interactionStore.setFocus(elementId);
    },

    clearFocus() {
      interactionStore.clearFocus();
    },

    setTransitioning(
      isTransitioning: boolean,
      transitionType?: Parameters<typeof interactionStore.setTransitioning>[1],
    ) {
      interactionStore.setTransitioning(isTransitioning, transitionType);
    },

    setFormValue(key: string, value: string) {
      formStore.setValue(key, value);
    },

    setFormError(key: string, error: string) {
      formStore.setError(key, error);
    },

    clearFormError(key: string) {
      formStore.clearError(key);
    },

    resetForm() {
      formStore.reset();
    },

    toggleSidebar() {
      navigationStore.toggleSidebar();
    },

    setSidebarCollapsed(collapsed: boolean) {
      navigationStore.setSidebarCollapsed(collapsed);
    },

    setCurrentRoute(route: string) {
      navigationStore.setCurrentRoute(route);
    },

    setIsMobile(mobile: boolean) {
      navigationStore.setIsMobile(mobile);
    },

    setKeyboardShortcutsEnabled(enabled: boolean) {
      interactionStore.setKeyboardShortcutsEnabled(enabled);
    },

    startDialog(treeId: string, startNodeId: string) {
      dialogStore.startDialog(treeId, startNodeId);
    },

    advanceDialogNode(nodeId: string) {
      dialogStore.advanceDialogNode(nodeId);
    },

    recordDialogChoice(
      speaker: Parameters<typeof dialogStore.recordDialogChoice>[0],
      text: string,
      choiceId: string | undefined,
    ) {
      dialogStore.recordDialogChoice(speaker, text, choiceId);
    },

    endDialog() {
      dialogStore.endDialog();
    },

    setPlayerResourcesForDialog(trust: number, credits: number, flags: string[]) {
      dialogStore.setPlayerResourcesForDialog(trust, credits, flags);
    },

    reset() {
      navigationStore.reset();
      modalStore.reset();
      notificationStore.reset();
      dialogStore.reset();
      formStore.reset();
      interactionStore.reset();
      phaseStore.reset();
    },
  };
}

export const uiStore = createUiStore();

export const activePanel = derived(navigationStore, ($nav) => $nav.activePanel);
export const sidebarCollapsed = derived(navigationStore, ($nav) => $nav.sidebarCollapsed);
export const currentRoute = derived(navigationStore, ($nav) => $nav.currentRoute);
export const isMobile = derived(navigationStore, ($nav) => $nav.isMobile);

export const modalState = derived(modalStore, ($modal) => $modal);

export const notifications = derived(notificationStore, ($notif) => $notif.notifications);
export const notificationQueue = derived(notificationStore, ($notif) => $notif.notificationQueue);

export const hoverState = derived(interactionStore, ($inter) => $inter.hoverState);
export const focusState = derived(interactionStore, ($inter) => $inter.focusState);
export const animationState = derived(interactionStore, ($inter) => $inter.animationState);
export const keyboardShortcutsEnabled = derived(
  interactionStore,
  ($inter) => $inter.keyboardShortcutsEnabled,
);

export const currentPhase = derived(phaseStore, ($phase) => $phase.currentPhase);
export const previousPhase = derived(phaseStore, ($phase) => $phase.previousPhase);
export const isTransitioning = derived(
  interactionStore,
  ($inter) => $inter.animationState.isTransitioning,
);

export const currentViewConfig = derived(phaseStore, ($phase): PhaseViewConfig => {
  if (!$phase.currentPhase) {
    return getViewConfig('DAY_START');
  }
  return getViewConfig($phase.currentPhase);
});

export const currentActionConfig = derived(phaseStore, ($phase): PhaseActionConfig => {
  if (!$phase.currentPhase) {
    return getActionConfig('DAY_START');
  }
  return getActionConfig($phase.currentPhase);
});

export const currentShortcutConfig = derived(phaseStore, ($phase): PhaseKeyboardShortcutConfig => {
  if (!$phase.currentPhase) {
    return getShortcutConfig('DAY_START');
  }
  return getShortcutConfig($phase.currentPhase);
});

export const canSelectEmail = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canSelectEmail;
});

export const canOpenWorksheet = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canOpenWorksheet;
});

export const canRequestVerification = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canRequestVerification;
});

export const canViewResults = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canViewResults;
});

export const canMakeDecision = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canMakeDecision;
});

export const canAdvanceDay = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canAdvanceDay;
});

export const canUpgradeFacility = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canUpgradeFacility;
});

export const canContainThreat = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canContainThreat;
});

export const canRestart = derived(phaseStore, ($phase) => {
  const config = getActionConfig($phase.currentPhase ?? 'DAY_START');
  return config.canRestart;
});

export const dialogState = derived(dialogStore, ($dialog) => $dialog);
export const isDialogActive = derived(dialogStore, ($dialog) => $dialog.isActive);
export const dialogCurrentNodeId = derived(dialogStore, ($dialog) => $dialog.currentNodeId);
export const dialogHistory = derived(dialogStore, ($dialog) => $dialog.history);
export const dialogPlayerResources = derived(dialogStore, ($dialog) => ({
  trust: $dialog.playerTrust,
  credits: $dialog.playerCredits,
  flags: $dialog.playerFlags,
}));

export const formInput = derived(formStore, ($form) => $form);
