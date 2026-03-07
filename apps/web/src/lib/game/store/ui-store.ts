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

export type ActivePanel =
  | 'inbox'
  | 'email'
  | 'facility'
  | 'upgrades'
  | 'incident'
  | 'settings'
  | 'day-summary'
  | 'game-over'
  | 'worksheet'
  | 'verification'
  | 'feedback'
  | 'threat'
  | 'landing'
  | 'decision';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  createdAt: number;
}

export interface ModalState {
  isOpen: boolean;
  type: 'worksheet' | 'verification' | 'upgrade' | null;
  data: Record<string, unknown> | null;
}

export interface HoverState {
  emailId: string | null;
  buttonId: string | null;
}

export interface FocusState {
  elementId: string | null;
}

export interface AnimationState {
  isTransitioning: boolean;
  transitionType: 'fade' | 'slide' | 'none';
}

export interface FormInputState {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

interface UiStoreState {
  activePanel: ActivePanel;
  currentPhase: GamePhase | null;
  previousPhase: GamePhase | null;
  modals: ModalState;
  notifications: Toast[];
  hoverState: HoverState;
  focusState: FocusState;
  animationState: AnimationState;
  formInput: FormInputState;
  sidebarCollapsed: boolean;
  currentRoute: string;
  isMobile: boolean;
  keyboardShortcutsEnabled: boolean;
}

const initialState: UiStoreState = {
  activePanel: 'landing',
  currentPhase: null,
  previousPhase: null,
  modals: { isOpen: false, type: null, data: null },
  notifications: [],
  hoverState: { emailId: null, buttonId: null },
  focusState: { elementId: null },
  animationState: { isTransitioning: false, transitionType: 'none' },
  formInput: { values: {}, errors: {}, touched: {} },
  sidebarCollapsed: false,
  currentRoute: '/game',
  isMobile: false,
  keyboardShortcutsEnabled: true,
};

function createUiStore() {
  const { subscribe, set, update } = writable<UiStoreState>(initialState);

  return {
    subscribe,

    setActivePanel(panel: ActivePanel) {
      update((state) => ({ ...state, activePanel: panel }));
    },

    setPhase(phase: GamePhase) {
      update((state) => {
        const viewConfig = getViewConfig(phase);
        return {
          ...state,
          previousPhase: state.currentPhase,
          currentPhase: phase,
          activePanel: viewConfig.mainPanel,
          animationState: {
            isTransitioning: state.currentPhase !== null && state.currentPhase !== phase,
            transitionType: viewConfig.transitionType,
          },
        };
      });
    },

    clearPhase() {
      update((state) => ({
        ...state,
        previousPhase: state.currentPhase,
        currentPhase: null,
      }));
    },

    openModal(type: 'worksheet' | 'verification' | 'upgrade', data?: Record<string, unknown>) {
      update((state) => ({ ...state, modals: { isOpen: true, type, data: data ?? null } }));
    },

    closeModal() {
      update((state) => ({ ...state, modals: { isOpen: false, type: null, data: null } }));
    },

    addNotification(message: string, type: Toast['type'] = 'info', duration = 5000) {
      const id = crypto.randomUUID();
      const toast: Toast = { id, message, type, duration, createdAt: Date.now() };

      update((state) => ({ ...state, notifications: [...state.notifications, toast] }));

      if (duration > 0) {
        setTimeout(() => {
          update((state) => ({
            ...state,
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        }, duration);
      }

      return id;
    },

    removeNotification(id: string) {
      update((state) => ({
        ...state,
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },

    clearNotifications() {
      update((state) => ({ ...state, notifications: [] }));
    },

    setHoverEmail(emailId: string | null) {
      update((state) => ({ ...state, hoverState: { ...state.hoverState, emailId } }));
    },

    setHoverButton(buttonId: string | null) {
      update((state) => ({ ...state, hoverState: { ...state.hoverState, buttonId } }));
    },

    clearHover() {
      update((state) => ({ ...state, hoverState: { emailId: null, buttonId: null } }));
    },

    setFocus(elementId: string | null) {
      update((state) => ({ ...state, focusState: { elementId } }));
    },

    clearFocus() {
      update((state) => ({ ...state, focusState: { elementId: null } }));
    },

    setTransitioning(
      isTransitioning: boolean,
      transitionType: AnimationState['transitionType'] = 'none',
    ) {
      update((state) => ({ ...state, animationState: { isTransitioning, transitionType } }));
    },

    setFormValue(key: string, value: string) {
      update((state) => ({
        ...state,
        formInput: {
          ...state.formInput,
          values: { ...state.formInput.values, [key]: value },
          touched: { ...state.formInput.touched, [key]: true },
        },
      }));
    },

    setFormError(key: string, error: string) {
      update((state) => ({
        ...state,
        formInput: { ...state.formInput, errors: { ...state.formInput.errors, [key]: error } },
      }));
    },

    clearFormError(key: string) {
      update((state) => {
        const newErrors = { ...state.formInput.errors };
        delete newErrors[key];
        return { ...state, formInput: { ...state.formInput, errors: newErrors } };
      });
    },

    resetForm() {
      update((state) => ({ ...state, formInput: { values: {}, errors: {}, touched: {} } }));
    },

    toggleSidebar() {
      update((state) => ({ ...state, sidebarCollapsed: !state.sidebarCollapsed }));
    },

    setSidebarCollapsed(collapsed: boolean) {
      update((state) => ({ ...state, sidebarCollapsed: collapsed }));
    },

    setCurrentRoute(route: string) {
      update((state) => ({ ...state, currentRoute: route }));
    },

    setIsMobile(mobile: boolean) {
      update((state) => ({ ...state, isMobile: mobile }));
    },

    setKeyboardShortcutsEnabled(enabled: boolean) {
      update((state) => ({ ...state, keyboardShortcutsEnabled: enabled }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const uiStore = createUiStore();

export const activePanel = derived(uiStore, ($ui) => $ui.activePanel);
export const modalState = derived(uiStore, ($ui) => $ui.modals);
export const notifications = derived(uiStore, ($ui) => $ui.notifications);
export const hoverState = derived(uiStore, ($ui) => $ui.hoverState);
export const focusState = derived(uiStore, ($ui) => $ui.focusState);
export const animationState = derived(uiStore, ($ui) => $ui.animationState);
export const formInput = derived(uiStore, ($ui) => $ui.formInput);
export const sidebarCollapsed = derived(uiStore, ($ui) => $ui.sidebarCollapsed);
export const currentRoute = derived(uiStore, ($ui) => $ui.currentRoute);
export const isMobile = derived(uiStore, ($ui) => $ui.isMobile);
export const keyboardShortcutsEnabled = derived(uiStore, ($ui) => $ui.keyboardShortcutsEnabled);

export const currentPhase = derived(uiStore, ($ui) => $ui.currentPhase);
export const previousPhase = derived(uiStore, ($ui) => $ui.previousPhase);
export const isTransitioning = derived(uiStore, ($ui) => $ui.animationState.isTransitioning);

export const currentViewConfig = derived(uiStore, ($ui): PhaseViewConfig => {
  if (!$ui.currentPhase) {
    return getViewConfig('DAY_START');
  }
  return getViewConfig($ui.currentPhase);
});

export const currentActionConfig = derived(uiStore, ($ui): PhaseActionConfig => {
  if (!$ui.currentPhase) {
    return getActionConfig('DAY_START');
  }
  return getActionConfig($ui.currentPhase);
});

export const currentShortcutConfig = derived(uiStore, ($ui): PhaseKeyboardShortcutConfig => {
  if (!$ui.currentPhase) {
    return getShortcutConfig('DAY_START');
  }
  return getShortcutConfig($ui.currentPhase);
});

export const canSelectEmail = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canSelectEmail;
});

export const canOpenWorksheet = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canOpenWorksheet;
});

export const canRequestVerification = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canRequestVerification;
});

export const canViewResults = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canViewResults;
});

export const canMakeDecision = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canMakeDecision;
});

export const canAdvanceDay = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canAdvanceDay;
});

export const canUpgradeFacility = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canUpgradeFacility;
});

export const canContainThreat = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canContainThreat;
});

export const canRestart = derived(uiStore, ($ui) => {
  const config = getActionConfig($ui.currentPhase ?? 'DAY_START');
  return config.canRestart;
});
