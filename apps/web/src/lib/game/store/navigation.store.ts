import { writable } from 'svelte/store';

import type { ActivePanel } from './types';

interface NavigationState {
  activePanel: ActivePanel;
  sidebarCollapsed: boolean;
  currentRoute: string;
  isMobile: boolean;
}

const initialState: NavigationState = {
  activePanel: 'landing',
  sidebarCollapsed: false,
  currentRoute: '/game',
  isMobile: false,
};

function createNavigationStore() {
  const { subscribe, set, update } = writable<NavigationState>(initialState);

  return {
    subscribe,

    setActivePanel(panel: ActivePanel) {
      update((state) => ({ ...state, activePanel: panel }));
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

    reset() {
      set(initialState);
    },
  };
}

export const navigationStore = createNavigationStore();
