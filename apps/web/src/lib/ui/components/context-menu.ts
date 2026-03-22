import type { MenuItem, MenuSection, HighlightColor, ContextMenuState } from './context-menu-types';

export type { MenuItem, MenuSection, HighlightColor, ContextMenuState };

export interface ContextMenuOptions {
  documentType?: 'email' | 'verification-packet' | 'general';
  selectedText?: string;
  targetElement?: string;
}

export const COMMON_ACTIONS: MenuSection = {
  items: [
    { id: 'copy-selection', label: 'Copy Selection', shortcut: 'Ctrl+C', dividerAfter: false },
    { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', dividerAfter: false },
    { id: 'inspect-element', label: 'Inspect Element', shortcut: 'F12', dividerAfter: true },
    { id: 'add-note', label: 'Add Note', shortcut: 'Ctrl+N', dividerAfter: false },
  ],
};

export const HIGHLIGHT_COLORS: MenuSection = {
  items: [
    { id: 'highlight-green', label: 'Highlight Green', color: 'green', dividerAfter: false },
    { id: 'highlight-amber', label: 'Highlight Amber', color: 'amber', dividerAfter: false },
    { id: 'highlight-red', label: 'Highlight Red', color: 'red', dividerAfter: false },
  ],
};

export const EMAIL_ACTIONS: MenuSection = {
  items: [
    { id: 'mark-read', label: 'Mark as Read', dividerAfter: false },
    { id: 'mark-unread', label: 'Mark as Unread', dividerAfter: false },
    { id: 'flag-review', label: 'Flag for Review', dividerAfter: false },
    { id: 'view-headers', label: 'View Original Headers', dividerAfter: false },
    { id: 'check-sender', label: 'Check Sender Reputation', dividerAfter: false },
    { id: 'lookup-domain', label: 'Lookup Domain', dividerAfter: false },
  ],
};

export const VERIFICATION_ACTIONS: MenuSection = {
  items: [
    { id: 'flag-discrepancy', label: 'Flag Discrepancy', dividerAfter: false },
    { id: 'view-custody', label: 'View Chain of Custody', dividerAfter: false },
    { id: 'cross-reference', label: 'Cross-Reference with Database', dividerAfter: false },
    { id: 'request-verification', label: 'Request Additional Verification', dividerAfter: false },
  ],
};

export function buildContextMenu(options: ContextMenuOptions): MenuSection[] {
  const sections: MenuSection[] = [];

  const hasSelection = !!options.selectedText && options.selectedText.trim().length > 0;

  if (hasSelection) {
    sections.push({
      items: COMMON_ACTIONS.items.map((item) => {
        if (item.id === 'copy-selection') {
          return { ...item, disabled: false };
        }
        return { ...item };
      }),
    });

    sections.push(HIGHLIGHT_COLORS);
  } else {
    sections.push({
      items: COMMON_ACTIONS.items.map((item) => {
        if (item.id === 'copy-selection') {
          return { ...item, disabled: true };
        }
        return { ...item };
      }),
    });
  }

  if (options.documentType === 'email') {
    sections.push(EMAIL_ACTIONS);
  } else if (options.documentType === 'verification-packet') {
    sections.push(VERIFICATION_ACTIONS);
  }

  return sections;
}

export function getMenuPosition(
  mouseX: number,
  mouseY: number,
  menuWidth: number = 200,
  menuHeight: number = 300,
): { x: number; y: number } {
  const padding = 8;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  let adjustedX = mouseX;
  let adjustedY = mouseY;

  if (adjustedX + menuWidth + padding > viewportWidth) {
    adjustedX = viewportWidth - menuWidth - padding;
  }

  if (adjustedY + menuHeight + padding > viewportHeight) {
    adjustedY = viewportHeight - menuHeight - padding;
  }

  adjustedX = Math.max(padding, adjustedX);
  adjustedY = Math.max(padding, adjustedY);

  return { x: adjustedX, y: adjustedY };
}
