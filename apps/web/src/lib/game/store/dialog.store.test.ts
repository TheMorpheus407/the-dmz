import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { dialogStore } from './dialog.store';

describe('dialogStore', () => {
  beforeEach(() => {
    dialogStore.reset();
  });

  describe('initial state', () => {
    it('should have default dialog state', () => {
      const state = get(dialogStore);
      expect(state.isActive).toBe(false);
      expect(state.currentTreeId).toBe(null);
      expect(state.currentNodeId).toBe(null);
      expect(state.history).toEqual([]);
    });

    it('should have default player resources', () => {
      const state = get(dialogStore);
      expect(state.playerTrust).toBe(100);
      expect(state.playerCredits).toBe(1000);
      expect(state.playerFlags).toEqual([]);
    });
  });

  describe('startDialog', () => {
    it('should start dialog with treeId and nodeId', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      const state = get(dialogStore);
      expect(state.isActive).toBe(true);
      expect(state.currentTreeId).toBe('test-dialog');
      expect(state.currentNodeId).toBe('node-1');
      expect(state.history).toEqual([]);
    });

    it('should clear history when starting new dialog', () => {
      dialogStore.startDialog('dialog-1', 'node-1');
      dialogStore.recordDialogChoice('morpheus', 'Hello', 'choice-1');
      dialogStore.startDialog('dialog-2', 'node-a');
      const state = get(dialogStore);
      expect(state.history).toEqual([]);
    });
  });

  describe('advanceDialogNode', () => {
    it('should advance to new node', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.advanceDialogNode('node-2');
      const state = get(dialogStore);
      expect(state.currentNodeId).toBe('node-2');
    });
  });

  describe('recordDialogChoice', () => {
    it('should record dialog choice', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.recordDialogChoice('morpheus', 'Hello there!', 'choice-1');
      const state = get(dialogStore);
      expect(state.history).toHaveLength(1);
      const entry = state.history[0];
      expect(entry).toBeDefined();
      expect(entry?.speaker).toBe('morpheus');
      expect(entry?.text).toBe('Hello there!');
      expect(entry?.choiceId).toBe('choice-1');
    });

    it('should record choice without choiceId', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.recordDialogChoice('morpheus', 'Message text', undefined);
      const state = get(dialogStore);
      expect(state.history[0]?.choiceId).toBeUndefined();
    });

    it('should accumulate history entries', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.recordDialogChoice('morpheus', 'Hello', 'choice-1');
      dialogStore.recordDialogChoice('sysop7', 'Response', 'choice-2');
      const state = get(dialogStore);
      expect(state.history).toHaveLength(2);
    });
  });

  describe('endDialog', () => {
    it('should end dialog and clear active state', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.endDialog();
      const state = get(dialogStore);
      expect(state.isActive).toBe(false);
    });

    it('should clear treeId and nodeId on end', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.endDialog();
      const state = get(dialogStore);
      expect(state.currentTreeId).toBe(null);
      expect(state.currentNodeId).toBe(null);
    });

    it('should preserve history after ending dialog', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.recordDialogChoice('morpheus', 'Hello', 'choice-1');
      dialogStore.endDialog();
      const state = get(dialogStore);
      expect(state.history).toHaveLength(1);
    });
  });

  describe('setPlayerResourcesForDialog', () => {
    it('should set player resources', () => {
      dialogStore.setPlayerResourcesForDialog(50, 500, ['flag1', 'flag2']);
      const state = get(dialogStore);
      expect(state.playerTrust).toBe(50);
      expect(state.playerCredits).toBe(500);
      expect(state.playerFlags).toEqual(['flag1', 'flag2']);
    });

    it('should update existing resources', () => {
      dialogStore.setPlayerResourcesForDialog(50, 500, []);
      dialogStore.setPlayerResourcesForDialog(75, 750, ['new-flag']);
      const state = get(dialogStore);
      expect(state.playerTrust).toBe(75);
      expect(state.playerCredits).toBe(750);
      expect(state.playerFlags).toEqual(['new-flag']);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      dialogStore.startDialog('test-dialog', 'node-1');
      dialogStore.recordDialogChoice('morpheus', 'Hello', 'choice-1');
      dialogStore.setPlayerResourcesForDialog(50, 500, ['flag1']);
      dialogStore.reset();
      const state = get(dialogStore);
      expect(state.isActive).toBe(false);
      expect(state.currentTreeId).toBe(null);
      expect(state.currentNodeId).toBe(null);
      expect(state.history).toEqual([]);
      expect(state.playerTrust).toBe(100);
      expect(state.playerCredits).toBe(1000);
      expect(state.playerFlags).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty treeId', () => {
      dialogStore.startDialog('', 'node-1');
      const state = get(dialogStore);
      expect(state.currentTreeId).toBe('');
    });

    it('should handle empty nodeId', () => {
      dialogStore.startDialog('dialog', '');
      const state = get(dialogStore);
      expect(state.currentNodeId).toBe('');
    });
  });
});
