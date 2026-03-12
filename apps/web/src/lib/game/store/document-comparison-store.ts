import { writable, derived } from 'svelte/store';

import type { DocumentType } from '@the-dmz/shared';

export interface ComparisonDocument {
  documentId: string;
  documentType: DocumentType;
  title: string;
}

export interface DocumentLink {
  sourceDocumentId: string;
  targetDocumentId: string;
  createdAt: number;
}

export type SplitOrientation = 'horizontal' | 'vertical';

export interface ComparisonState {
  primaryDocument: ComparisonDocument | null;
  secondaryDocument: ComparisonDocument | null;
  isComparing: boolean;
  orientation: SplitOrientation;
  dividerPosition: number;
  synchronizedScroll: boolean;
  documentLinks: DocumentLink[];
  isKeyboardMode: boolean;
  keyboardSelectionTarget: 'primary' | 'secondary' | null;
}

const initialState: ComparisonState = {
  primaryDocument: null,
  secondaryDocument: null,
  isComparing: false,
  orientation: 'horizontal',
  dividerPosition: 50,
  synchronizedScroll: true,
  documentLinks: [],
  isKeyboardMode: false,
  keyboardSelectionTarget: null,
};

function createComparisonStore() {
  const { subscribe, set, update } = writable<ComparisonState>(initialState);

  return {
    subscribe,

    startComparison: (document: ComparisonDocument) => {
      update((state) => ({
        ...state,
        primaryDocument: state.primaryDocument || document,
        secondaryDocument: document,
        isComparing: true,
      }));
    },

    setSecondaryDocument: (document: ComparisonDocument) => {
      update((state) => ({
        ...state,
        secondaryDocument: document,
        isComparing: state.primaryDocument !== null,
      }));
    },

    setPrimaryDocument: (document: ComparisonDocument) => {
      update((state) => ({
        ...state,
        primaryDocument: document,
        isComparing: state.secondaryDocument !== null,
      }));
    },

    toggleComparison: () => {
      update((state) => ({
        ...state,
        isComparing: !state.isComparing,
      }));
    },

    closeComparison: () => {
      update((state) => ({
        ...state,
        isComparing: false,
        secondaryDocument: null,
      }));
    },

    setOrientation: (orientation: SplitOrientation) => {
      update((state) => ({
        ...state,
        orientation,
      }));
    },

    toggleOrientation: () => {
      update((state) => ({
        ...state,
        orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
      }));
    },

    setDividerPosition: (position: number) => {
      update((state) => ({
        ...state,
        dividerPosition: Math.max(20, Math.min(80, position)),
      }));
    },

    toggleSynchronizedScroll: () => {
      update((state) => ({
        ...state,
        synchronizedScroll: !state.synchronizedScroll,
      }));
    },

    linkDocuments: (sourceId: string, targetId: string) => {
      update((state) => ({
        ...state,
        documentLinks: [
          ...state.documentLinks.filter(
            (link) => link.sourceDocumentId !== sourceId || link.targetDocumentId !== targetId,
          ),
          { sourceDocumentId: sourceId, targetDocumentId: targetId, createdAt: Date.now() },
        ],
      }));
    },

    unlinkDocuments: (sourceId: string, targetId: string) => {
      update((state) => ({
        ...state,
        documentLinks: state.documentLinks.filter(
          (link) => !(link.sourceDocumentId === sourceId && link.targetDocumentId === targetId),
        ),
      }));
    },

    getLink: (sourceId: string, targetId: string) => {
      let link: DocumentLink | undefined;
      const unsubscribe = subscribe((state) => {
        link = state.documentLinks.find(
          (l) =>
            (l.sourceDocumentId === sourceId && l.targetDocumentId === targetId) ||
            (l.sourceDocumentId === targetId && l.targetDocumentId === sourceId),
        );
      });
      unsubscribe();
      return link;
    },

    enterKeyboardMode: () => {
      update((state) => ({
        ...state,
        isKeyboardMode: true,
        keyboardSelectionTarget: 'primary',
      }));
    },

    exitKeyboardMode: () => {
      update((state) => ({
        ...state,
        isKeyboardMode: false,
        keyboardSelectionTarget: null,
      }));
    },

    setKeyboardSelectionTarget: (target: 'primary' | 'secondary' | null) => {
      update((state) => ({
        ...state,
        keyboardSelectionTarget: target,
      }));
    },

    confirmKeyboardSelection: () => {
      update((state) => {
        if (state.keyboardSelectionTarget === 'primary' && state.secondaryDocument) {
          return {
            ...state,
            isComparing: true,
            isKeyboardMode: false,
            keyboardSelectionTarget: null,
          };
        } else if (state.keyboardSelectionTarget === 'secondary' && state.primaryDocument) {
          return {
            ...state,
            isComparing: true,
            isKeyboardMode: false,
            keyboardSelectionTarget: null,
          };
        }
        return state;
      });
    },

    reset: () => {
      set(initialState);
    },
  };
}

export const comparisonStore = createComparisonStore();

export const isComparing = derived(comparisonStore, ($store) => $store.isComparing);

export const primaryDocument = derived(comparisonStore, ($store) => $store.primaryDocument);

export const secondaryDocument = derived(comparisonStore, ($store) => $store.secondaryDocument);

export const synchronizedScroll = derived(comparisonStore, ($store) => $store.synchronizedScroll);

export const orientation = derived(comparisonStore, ($store) => $store.orientation);

export const keyboardSelectionTarget = derived(
  comparisonStore,
  ($store) => $store.keyboardSelectionTarget,
);
