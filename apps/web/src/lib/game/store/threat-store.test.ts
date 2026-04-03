import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { threatStore, threatLevel } from './threat-store';

describe('threatStore', () => {
  beforeEach(() => {
    threatStore.reset();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(threatStore);
      expect(state.level).toBe('low');
      expect(state.activeIncidents).toBe(0);
    });

    it('threatLevel derived returns level', () => {
      expect(get(threatLevel)).toBe('low');
    });
  });

  describe('setThreatLevel', () => {
    it('sets low level', () => {
      threatStore.setThreatLevel('low');

      const state = get(threatStore);
      expect(state.level).toBe('low');
      expect(get(threatLevel)).toBe('low');
    });

    it('sets guarded level', () => {
      threatStore.setThreatLevel('guarded');

      expect(get(threatLevel)).toBe('guarded');
    });

    it('sets elevated level', () => {
      threatStore.setThreatLevel('elevated');

      expect(get(threatLevel)).toBe('elevated');
    });

    it('sets high level', () => {
      threatStore.setThreatLevel('high');

      expect(get(threatLevel)).toBe('high');
    });

    it('sets severe level', () => {
      threatStore.setThreatLevel('severe');

      expect(get(threatLevel)).toBe('severe');
    });
  });

  describe('setActiveIncidents', () => {
    it('sets incident count', () => {
      threatStore.setActiveIncidents(5);

      const state = get(threatStore);
      expect(state.activeIncidents).toBe(5);
    });

    it('updates incident count', () => {
      threatStore.setActiveIncidents(5);
      threatStore.setActiveIncidents(10);

      const state = get(threatStore);
      expect(state.activeIncidents).toBe(10);
    });

    it('handles zero incidents', () => {
      threatStore.setActiveIncidents(0);

      const state = get(threatStore);
      expect(state.activeIncidents).toBe(0);
    });
  });

  describe('updateThreat', () => {
    it('updates single field', () => {
      threatStore.updateThreat({ level: 'high' });

      const state = get(threatStore);
      expect(state.level).toBe('high');
      expect(state.activeIncidents).toBe(0);
    });

    it('updates multiple fields', () => {
      threatStore.updateThreat({ level: 'severe', activeIncidents: 3 });

      const state = get(threatStore);
      expect(state.level).toBe('severe');
      expect(state.activeIncidents).toBe(3);
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      threatStore.setThreatLevel('severe');
      threatStore.setActiveIncidents(10);

      threatStore.reset();

      const state = get(threatStore);
      expect(state.level).toBe('low');
      expect(state.activeIncidents).toBe(0);
    });
  });

  describe('get', () => {
    it('returns current state', () => {
      threatStore.setThreatLevel('high');
      threatStore.setActiveIncidents(5);

      const result = threatStore.get();
      expect(result.level).toBe('high');
      expect(result.activeIncidents).toBe(5);
    });
  });
});
