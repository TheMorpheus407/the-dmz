import { writable } from 'svelte/store';

import type { DialogSpeaker, DialogHistoryEntry } from '@the-dmz/shared/types';

interface DialogStoreState {
  isActive: boolean;
  currentTreeId: string | null;
  currentNodeId: string | null;
  history: DialogHistoryEntry[];
  playerTrust: number;
  playerCredits: number;
  playerFlags: string[];
}

const initialState: DialogStoreState = {
  isActive: false,
  currentTreeId: null,
  currentNodeId: null,
  history: [],
  playerTrust: 100,
  playerCredits: 1000,
  playerFlags: [],
};

function createDialogStore() {
  const { subscribe, set, update } = writable<DialogStoreState>(initialState);

  return {
    subscribe,

    startDialog(treeId: string, startNodeId: string) {
      update((state) => ({
        ...state,
        isActive: true,
        currentTreeId: treeId,
        currentNodeId: startNodeId,
        history: [],
      }));
    },

    advanceDialogNode(nodeId: string) {
      update((state) => ({
        ...state,
        currentNodeId: nodeId,
      }));
    },

    recordDialogChoice(speaker: DialogSpeaker, text: string, choiceId: string | undefined) {
      update((state) => {
        const entry: DialogHistoryEntry = {
          dialogId: state.currentTreeId ?? '',
          nodeId: state.currentNodeId ?? '',
          speaker,
          text,
          choiceId,
          timestamp: new Date().toISOString(),
        };
        return {
          ...state,
          history: [...state.history, entry],
        };
      });
    },

    endDialog() {
      update((state) => ({
        ...state,
        isActive: false,
        currentTreeId: null,
        currentNodeId: null,
      }));
    },

    setPlayerResourcesForDialog(trust: number, credits: number, flags: string[]) {
      update((state) => ({
        ...state,
        playerTrust: trust,
        playerCredits: credits,
        playerFlags: flags,
      }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const dialogStore = createDialogStore();
