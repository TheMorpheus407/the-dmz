import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { formStore } from './form.store';

describe('formStore', () => {
  beforeEach(() => {
    formStore.reset();
  });

  describe('setValue', () => {
    it('should have empty initial values', () => {
      const state = get(formStore);
      expect(state.values).toEqual({});
      expect(state.errors).toEqual({});
      expect(state.touched).toEqual({});
    });

    it('should set value and mark as touched', () => {
      formStore.setValue('email', 'test@example.com');
      const state = get(formStore);
      expect(state.values['email']).toBe('test@example.com');
      expect(state.touched['email']).toBe(true);
    });

    it('should update existing value', () => {
      formStore.setValue('email', 'test@example.com');
      formStore.setValue('email', 'new@example.com');
      const state = get(formStore);
      expect(state.values['email']).toBe('new@example.com');
    });

    it('should set multiple values', () => {
      formStore.setValue('email', 'test@example.com');
      formStore.setValue('name', 'John');
      const state = get(formStore);
      expect(state.values['email']).toBe('test@example.com');
      expect(state.values['name']).toBe('John');
    });
  });

  describe('setError', () => {
    it('should set error for key', () => {
      formStore.setError('email', 'Invalid email');
      const state = get(formStore);
      expect(state.errors['email']).toBe('Invalid email');
    });

    it('should update existing error', () => {
      formStore.setError('email', 'First error');
      formStore.setError('email', 'Second error');
      const state = get(formStore);
      expect(state.errors['email']).toBe('Second error');
    });

    it('should set errors for multiple keys', () => {
      formStore.setError('email', 'Invalid email');
      formStore.setError('password', 'Password required');
      const state = get(formStore);
      expect(state.errors['email']).toBe('Invalid email');
      expect(state.errors['password']).toBe('Password required');
    });
  });

  describe('clearError', () => {
    it('should clear error for key', () => {
      formStore.setError('email', 'Invalid');
      formStore.clearError('email');
      const state = get(formStore);
      expect(state.errors['email']).toBeUndefined();
    });

    it('should handle clearing non-existent error', () => {
      formStore.clearError('nonexistent');
      const state = get(formStore);
      expect(state.errors['nonexistent']).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      formStore.setValue('email', 'test@example.com');
      formStore.setError('email', 'Invalid');
      formStore.reset();
      const state = get(formStore);
      expect(state.values).toEqual({});
      expect(state.errors).toEqual({});
      expect(state.touched).toEqual({});
    });

    it('should reset after multiple operations', () => {
      formStore.setValue('email', 'test@example.com');
      formStore.setValue('name', 'John');
      formStore.setError('email', 'Invalid');
      formStore.reset();
      const state = get(formStore);
      expect(Object.keys(state.values)).toHaveLength(0);
      expect(Object.keys(state.errors)).toHaveLength(0);
      expect(Object.keys(state.touched)).toHaveLength(0);
    });
  });
});
