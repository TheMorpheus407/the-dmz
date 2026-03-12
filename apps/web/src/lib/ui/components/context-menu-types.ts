export type HighlightColor = 'green' | 'amber' | 'red';

export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  dividerAfter?: boolean;
  submenu?: MenuItem[];
  color?: HighlightColor;
}

export interface MenuSection {
  items: MenuItem[];
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  sections: MenuSection[];
  documentType?: 'email' | 'verification-packet' | 'general';
  targetElement?: string;
  selectedText?: string;
}
