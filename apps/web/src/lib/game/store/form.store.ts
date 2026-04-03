import { writable } from 'svelte/store';

import type { FormInputState } from './types';

const initialState: FormInputState = {
  values: {},
  errors: {},
  touched: {},
};

function createFormStore() {
  const { subscribe, set, update } = writable<FormInputState>(initialState);

  return {
    subscribe,

    setValue(key: string, value: string) {
      update((state) => ({
        ...state,
        values: { ...state.values, [key]: value },
        touched: { ...state.touched, [key]: true },
      }));
    },

    setError(key: string, error: string) {
      update((state) => ({
        ...state,
        errors: { ...state.errors, [key]: error },
      }));
    },

    clearError(key: string) {
      update((state) => {
        const newErrors = { ...state.errors };
        delete newErrors[key];
        return { ...state, errors: newErrors };
      });
    },

    reset() {
      set(initialState);
    },
  };
}

export const formStore = createFormStore();
