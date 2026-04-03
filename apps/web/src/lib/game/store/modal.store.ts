import { writable } from 'svelte/store';

import type { ModalState } from './types';

const initialState: ModalState = {
  isOpen: false,
  type: null,
  data: null,
};

function createModalStore() {
  const { subscribe, set, update } = writable<ModalState>(initialState);

  return {
    subscribe,

    openModal(type: 'worksheet' | 'verification' | 'upgrade', data?: Record<string, unknown>) {
      update((state) => ({ ...state, isOpen: true, type, data: data ?? null }));
    },

    closeModal() {
      update((state) => ({ ...state, isOpen: false, type: null, data: null }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const modalStore = createModalStore();
