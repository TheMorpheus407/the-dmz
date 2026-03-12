import { describe, it, expect, beforeEach } from 'vitest';

import type { DocumentType } from '@the-dmz/shared';

import { comparisonStore, type ComparisonState } from './document-comparison-store';

function getState(): ComparisonState {
  let state: ComparisonState | undefined;
  const unsub = comparisonStore.subscribe((s) => {
    state = s;
  });
  unsub();
  return state as ComparisonState;
}

describe('document-comparison-store', () => {
  beforeEach(() => {
    comparisonStore.reset();
  });

  describe('startComparison', () => {
    it('should set primary document and secondary document when no comparison is active', () => {
      const doc = {
        documentId: 'doc-1',
        documentType: 'EMAIL' as DocumentType,
        title: 'Test Email',
      };

      comparisonStore.startComparison(doc);

      const state = getState();

      expect(state.primaryDocument).toEqual(doc);
      expect(state.secondaryDocument).toEqual(doc);
      expect(state.isComparing).toBe(true);
    });

    it('should set secondary document and activate comparison when primary exists', () => {
      const primary = {
        documentId: 'doc-1',
        documentType: 'EMAIL' as DocumentType,
        title: 'Primary Email',
      };
      const secondary = {
        documentId: 'doc-2',
        documentType: 'VERIFICATION_PACKET' as DocumentType,
        title: 'Verification Packet',
      };

      comparisonStore.startComparison(primary);
      comparisonStore.setSecondaryDocument(secondary);

      const state = getState();

      expect(state.primaryDocument).toEqual(primary);
      expect(state.secondaryDocument).toEqual(secondary);
      expect(state.isComparing).toBe(true);
    });
  });

  describe('setOrientation', () => {
    it('should change orientation to vertical', () => {
      comparisonStore.setOrientation('vertical');

      const state = getState();

      expect(state.orientation).toBe('vertical');
    });

    it('should change orientation to horizontal', () => {
      comparisonStore.setOrientation('vertical');
      comparisonStore.setOrientation('horizontal');

      const state = getState();

      expect(state.orientation).toBe('horizontal');
    });
  });

  describe('toggleOrientation', () => {
    it('should toggle between horizontal and vertical', () => {
      comparisonStore.toggleOrientation();

      let state = getState();
      expect(state.orientation).toBe('vertical');

      comparisonStore.toggleOrientation();
      state = getState();
      expect(state.orientation).toBe('horizontal');
    });
  });

  describe('setDividerPosition', () => {
    it('should clamp divider position to minimum 20', () => {
      comparisonStore.setDividerPosition(10);

      const state = getState();

      expect(state.dividerPosition).toBe(20);
    });

    it('should clamp divider position to maximum 80', () => {
      comparisonStore.setDividerPosition(90);

      const state = getState();

      expect(state.dividerPosition).toBe(80);
    });

    it('should accept valid divider position', () => {
      comparisonStore.setDividerPosition(50);

      const state = getState();

      expect(state.dividerPosition).toBe(50);
    });
  });

  describe('toggleSynchronizedScroll', () => {
    it('should toggle synchronized scroll from true to false', () => {
      let state = getState();
      expect(state.synchronizedScroll).toBe(true);

      comparisonStore.toggleSynchronizedScroll();
      state = getState();
      expect(state.synchronizedScroll).toBe(false);
    });
  });

  describe('document linking', () => {
    it('should link two documents', () => {
      comparisonStore.linkDocuments('doc-1', 'doc-2');

      const state = getState();

      expect(state.documentLinks).toHaveLength(1);
      expect(state.documentLinks[0]?.sourceDocumentId).toBe('doc-1');
      expect(state.documentLinks[0]?.targetDocumentId).toBe('doc-2');
    });

    it('should unlink documents', () => {
      comparisonStore.linkDocuments('doc-1', 'doc-2');
      comparisonStore.unlinkDocuments('doc-1', 'doc-2');

      const state = getState();

      expect(state.documentLinks).toHaveLength(0);
    });

    it('should not create duplicate links', () => {
      comparisonStore.linkDocuments('doc-1', 'doc-2');
      comparisonStore.linkDocuments('doc-1', 'doc-2');

      const state = getState();

      expect(state.documentLinks).toHaveLength(1);
    });
  });

  describe('keyboard mode', () => {
    it('should enter keyboard mode', () => {
      comparisonStore.enterKeyboardMode();

      const state = getState();

      expect(state.isKeyboardMode).toBe(true);
      expect(state.keyboardSelectionTarget).toBe('primary');
    });

    it('should exit keyboard mode', () => {
      comparisonStore.enterKeyboardMode();
      comparisonStore.exitKeyboardMode();

      const state = getState();

      expect(state.isKeyboardMode).toBe(false);
      expect(state.keyboardSelectionTarget).toBeNull();
    });

    it('should set keyboard selection target', () => {
      comparisonStore.enterKeyboardMode();
      comparisonStore.setKeyboardSelectionTarget('secondary');

      const state = getState();

      expect(state.keyboardSelectionTarget).toBe('secondary');
    });
  });

  describe('closeComparison', () => {
    it('should close comparison and reset secondary document', () => {
      comparisonStore.startComparison({
        documentId: 'doc-1',
        documentType: 'EMAIL' as DocumentType,
        title: 'Test',
      });
      comparisonStore.setSecondaryDocument({
        documentId: 'doc-2',
        documentType: 'EMAIL' as DocumentType,
        title: 'Test 2',
      });

      comparisonStore.closeComparison();

      const state = getState();

      expect(state.isComparing).toBe(false);
      expect(state.secondaryDocument).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      comparisonStore.startComparison({
        documentId: 'doc-1',
        documentType: 'EMAIL' as DocumentType,
        title: 'Test',
      });
      comparisonStore.setDividerPosition(75);
      comparisonStore.setOrientation('vertical');
      comparisonStore.enterKeyboardMode();

      comparisonStore.reset();

      const state = getState();

      expect(state.primaryDocument).toBeNull();
      expect(state.secondaryDocument).toBeNull();
      expect(state.isComparing).toBe(false);
      expect(state.dividerPosition).toBe(50);
      expect(state.orientation).toBe('horizontal');
      expect(state.isKeyboardMode).toBe(false);
    });
  });
});
