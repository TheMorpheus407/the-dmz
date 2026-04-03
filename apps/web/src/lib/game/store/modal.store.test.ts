import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { modalStore } from './modal.store';

describe('modalStore', () => {
  beforeEach(() => {
    modalStore.reset();
  });

  describe('openModal', () => {
    it('should have default state with isOpen false and type null', () => {
      const state = get(modalStore);
      expect(state.isOpen).toBe(false);
      expect(state.type).toBe(null);
      expect(state.data).toBe(null);
    });

    it('should open modal with worksheet type', () => {
      modalStore.openModal('worksheet');
      const state = get(modalStore);
      expect(state.isOpen).toBe(true);
      expect(state.type).toBe('worksheet');
      expect(state.data).toBe(null);
    });

    it('should open modal with verification type', () => {
      modalStore.openModal('verification');
      const state = get(modalStore);
      expect(state.isOpen).toBe(true);
      expect(state.type).toBe('verification');
    });

    it('should open modal with upgrade type', () => {
      modalStore.openModal('upgrade');
      const state = get(modalStore);
      expect(state.isOpen).toBe(true);
      expect(state.type).toBe('upgrade');
    });

    it('should open modal with data', () => {
      modalStore.openModal('verification', { emailId: 'email-1' });
      const state = get(modalStore);
      expect(state.isOpen).toBe(true);
      expect(state.type).toBe('verification');
      expect(state.data).toEqual({ emailId: 'email-1' });
    });

    it('should open modal with multiple data fields', () => {
      modalStore.openModal('worksheet', { id: 1, mode: 'edit' });
      const state = get(modalStore);
      expect(state.data).toEqual({ id: 1, mode: 'edit' });
    });

    it('should replace existing modal when opening new one', () => {
      modalStore.openModal('worksheet');
      modalStore.openModal('verification', { emailId: 'email-2' });
      const state = get(modalStore);
      expect(state.type).toBe('verification');
      expect(state.data).toEqual({ emailId: 'email-2' });
    });
  });

  describe('closeModal', () => {
    it('should close open modal', () => {
      modalStore.openModal('worksheet');
      modalStore.closeModal();
      const state = get(modalStore);
      expect(state.isOpen).toBe(false);
      expect(state.type).toBe(null);
      expect(state.data).toBe(null);
    });

    it('should handle closing when no modal is open', () => {
      modalStore.closeModal();
      const state = get(modalStore);
      expect(state.isOpen).toBe(false);
    });

    it('should clear data when closing', () => {
      modalStore.openModal('verification', { emailId: 'email-1' });
      modalStore.closeModal();
      const state = get(modalStore);
      expect(state.data).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      modalStore.openModal('verification', { emailId: 'email-1' });
      modalStore.reset();
      const state = get(modalStore);
      expect(state.isOpen).toBe(false);
      expect(state.type).toBe(null);
      expect(state.data).toBe(null);
    });
  });
});
