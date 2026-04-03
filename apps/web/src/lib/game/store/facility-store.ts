import { writable, derived, get } from 'svelte/store';

export interface FacilityState {
  rackSpace: number;
  power: number;
  cooling: number;
  bandwidth: number;
  clients: number;
}

const initialState: FacilityState = {
  rackSpace: 10,
  power: 100,
  cooling: 100,
  bandwidth: 1000,
  clients: 5,
};

function createFacilityStore() {
  const { subscribe, set, update } = writable<FacilityState>(initialState);

  return {
    subscribe,

    get(): FacilityState {
      return get({ subscribe });
    },

    setFacility(facility: Partial<FacilityState>): void {
      update((state) => ({ ...state, ...facility }));
    },

    updateFacility(partial: Partial<FacilityState>): void {
      update((state) => ({ ...state, ...partial }));
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const facilityStore = createFacilityStore();

export const facilityState = derived(facilityStore, ($facility) => $facility);
