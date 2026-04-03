import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { facilityStore, facilityState } from './facility-store';

describe('facilityStore', () => {
  beforeEach(() => {
    facilityStore.reset();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(facilityStore);
      expect(state.rackSpace).toBe(10);
      expect(state.power).toBe(100);
      expect(state.cooling).toBe(100);
      expect(state.bandwidth).toBe(1000);
      expect(state.clients).toBe(5);
    });

    it('facilityState derived returns full state', () => {
      expect(get(facilityState)).toEqual({
        rackSpace: 10,
        power: 100,
        cooling: 100,
        bandwidth: 1000,
        clients: 5,
      });
    });
  });

  describe('setFacility', () => {
    it('initializes with partial facility data', () => {
      facilityStore.setFacility({ rackSpace: 20, power: 150 });

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(20);
      expect(state.power).toBe(150);
      expect(state.cooling).toBe(100);
      expect(state.bandwidth).toBe(1000);
      expect(state.clients).toBe(5);
    });

    it('preserves existing values when setting partial', () => {
      facilityStore.setFacility({ rackSpace: 20, power: 150 });
      facilityStore.setFacility({ cooling: 200 });

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(20);
      expect(state.power).toBe(150);
      expect(state.cooling).toBe(200);
    });
  });

  describe('updateFacility', () => {
    it('updates single field', () => {
      facilityStore.updateFacility({ rackSpace: 15 });

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(15);
      expect(state.power).toBe(100);
    });

    it('updates multiple fields', () => {
      facilityStore.updateFacility({ rackSpace: 15, power: 50, clients: 10 });

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(15);
      expect(state.power).toBe(50);
      expect(state.clients).toBe(10);
    });

    it('does not affect unupdated fields', () => {
      facilityStore.updateFacility({ rackSpace: 15 });

      facilityStore.updateFacility({ power: 50 });

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(15);
      expect(state.power).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('handles zero values', () => {
      facilityStore.updateFacility({ power: 0, cooling: 0, bandwidth: 0 });

      const state = get(facilityStore);
      expect(state.power).toBe(0);
      expect(state.cooling).toBe(0);
      expect(state.bandwidth).toBe(0);
    });

    it('handles negative values', () => {
      facilityStore.updateFacility({ rackSpace: -5 });

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(-5);
    });

    it('handles large values', () => {
      facilityStore.updateFacility({ bandwidth: 100000 });

      const state = get(facilityStore);
      expect(state.bandwidth).toBe(100000);
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      facilityStore.setFacility({ rackSpace: 50, power: 200, clients: 20 });

      facilityStore.reset();

      const state = get(facilityStore);
      expect(state.rackSpace).toBe(10);
      expect(state.power).toBe(100);
      expect(state.cooling).toBe(100);
      expect(state.bandwidth).toBe(1000);
      expect(state.clients).toBe(5);
    });
  });

  describe('get', () => {
    it('returns current state', () => {
      facilityStore.setFacility({ rackSpace: 20, power: 150 });

      const result = facilityStore.get();
      expect(result.rackSpace).toBe(20);
      expect(result.power).toBe(150);
    });
  });
});
