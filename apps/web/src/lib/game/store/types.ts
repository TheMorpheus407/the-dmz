import type { DialogHistoryEntry } from '@the-dmz/shared/types';

export type { ActivePanel } from '$lib/game/state/phase-config';

export type ToastType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'decision'
  | 'threat'
  | 'incident'
  | 'breach'
  | 'system'
  | 'achievement';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
  createdAt: number;
  action?: ToastAction;
  source?: string;
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ModalState {
  isOpen: boolean;
  type: 'worksheet' | 'verification' | 'upgrade' | null;
  data: Record<string, unknown> | null;
}

export interface HoverState {
  emailId: string | null;
  buttonId: string | null;
}

export interface FocusState {
  elementId: string | null;
}

export interface AnimationState {
  isTransitioning: boolean;
  transitionType: 'fade' | 'slide' | 'none';
}

export interface FormInputState {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface DialogState {
  isActive: boolean;
  currentTreeId: string | null;
  currentNodeId: string | null;
  history: DialogHistoryEntry[];
  playerTrust: number;
  playerCredits: number;
  playerFlags: string[];
}
