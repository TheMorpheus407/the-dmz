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

export type ToastType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'decision'
  | 'threat'
  | 'incident'
  | 'breach'
  | 'system'
  | 'achievement';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
  createdAt: number;
  action?: ToastAction;
  source?: string;
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

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
  notificationQueue: Toast[];
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
  notificationQueue: [],
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

    addNotification(
      message: string,
      type: Toast['type'] = 'info',
      duration: number | undefined = 5000,
      options?: { title?: string; action?: ToastAction; source?: string },
    ) {
      const id = crypto.randomUUID();
      const toast: Toast = {
        id,
        message,
        type,
        duration,
        createdAt: Date.now(),
      };

      if (options?.title) {
        toast.title = options.title;
      }
      if (options?.action) {
        toast.action = options.action;
      }
      if (options?.source) {
        toast.source = options.source;
      }

      update((state) => {
        const MAX_VISIBLE = 3;
        const currentVisible = state.notifications.length;

        if (currentVisible >= MAX_VISIBLE) {
          return {
            ...state,
            notificationQueue: [...state.notificationQueue, toast],
          };
        }

        return { ...state, notifications: [...state.notifications, toast] };
      });

      if (duration && duration > 0) {
        setTimeout(() => {
          this.removeNotification(id);
        }, duration);
      }

      return id;
    },

    addGameNotification(
      message: string,
      type: Toast['type'],
      options?: { title?: string; duration?: number; action?: ToastAction; source?: string },
    ) {
      const DURATION_MAP: Record<ToastType, number> = {
        info: 5000,
        success: 5000,
        warning: 8000,
        error: 10000,
        decision: 5000,
        threat: 8000,
        incident: 10000,
        breach: 0,
        system: 4000,
        achievement: 6000,
      };

      const duration = options?.duration ?? DURATION_MAP[type] ?? 5000;
      return this.addNotification(message, type, duration, options);
    },

    removeNotification(id: string) {
      update((state) => {
        const filtered: Toast[] = state.notifications.filter((n) => n.id !== id);
        const shouldPromote =
          filtered.length < state.notifications.length && state.notificationQueue.length > 0;

        if (shouldPromote && state.notificationQueue.length > 0) {
          const [first, ...rest] = state.notificationQueue;
          if (first) {
            const newNotifications: Toast[] = [...filtered, first];
            return {
              ...state,
              notifications: newNotifications,
              notificationQueue: rest,
            };
          }
        }

        return { ...state, notifications: filtered };
      });
    },

    clearNotifications() {
      update((state) => ({ ...state, notifications: [], notificationQueue: [] }));
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
export const notificationQueue = derived(uiStore, ($ui) => $ui.notificationQueue);
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
