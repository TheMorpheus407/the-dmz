import type { ThemeId } from '@the-dmz/shared';

import { REQUIRED_THEME_IDS } from './tokens/contract';

export const REQUIRED_PRIMITIVES = [
  'Button',
  'Panel',
  'Badge',
  'Tabs',
  'Modal',
  'LoadingState',
] as const;

export type PrimitiveId = (typeof REQUIRED_PRIMITIVES)[number];

export const PRIMITIVE_STATES = {
  Button: ['default', 'hover', 'focus-visible', 'disabled', 'loading'] as const,
  Panel: ['default'] as const,
  Badge: ['default'] as const,
  Tabs: ['default', 'focus-visible', 'disabled', 'active'] as const,
  Modal: ['default', 'open', 'close'] as const,
  LoadingState: ['loading', 'default'] as const,
} as const;

export type PrimitiveState = {
  [K in PrimitiveId]: (typeof PRIMITIVE_STATES)[K][number];
}[PrimitiveId];

export const REQUIRED_THEMES: readonly ThemeId[] = REQUIRED_THEME_IDS;

export const SHELL_PRIMITIVE_REQUIREMENTS = {
  '(game)': {
    primitives: ['Button', 'LoadingState', 'Drawer'],
    file: 'src/routes/(game)/+layout.svelte',
  },
  '(admin)': {
    primitives: ['Button', 'LoadingState', 'Drawer'],
    file: 'src/routes/(admin)/+layout.svelte',
  },
  '(auth)': {
    primitives: ['LoadingState'],
    file: 'src/routes/(auth)/+layout.svelte',
  },
  '(public)': {
    primitives: ['Button', 'LoadingState'],
    file: 'src/routes/(public)/+layout.svelte',
  },
} as const;

export type ShellId = keyof typeof SHELL_PRIMITIVE_REQUIREMENTS;

export const STORY_STATE_REQUIREMENTS: Record<PrimitiveId, readonly string[]> = {
  Button: ['Primary', 'Secondary', 'Danger', 'Ghost', 'Small', 'Large', 'Disabled'],
  Panel: ['Default', 'Elevated', 'Outlined', 'Highlight'],
  Badge: ['Default', 'Success', 'Warning', 'Danger', 'Info', 'Small'],
  Tabs: ['Default', 'WithDisabledTab', 'KeyboardNavigation', 'LongContent'],
  Modal: ['Default', 'Small', 'Large', 'WithFooter', 'FocusTrap', 'NoCloseOnOverlay'],
  LoadingState: ['Spinner', 'Dots', 'Skeleton', 'Small', 'Large', 'NoMessage'],
};

export interface PrimitiveContract {
  primitives: readonly PrimitiveId[];
  themes: readonly ThemeId[];
  primitiveStates: typeof PRIMITIVE_STATES;
  shellRequirements: typeof SHELL_PRIMITIVE_REQUIREMENTS;
  storyRequirements: typeof STORY_STATE_REQUIREMENTS;
}

export const PRIMITIVE_CONTRACT: PrimitiveContract = {
  primitives: REQUIRED_PRIMITIVES,
  themes: REQUIRED_THEMES,
  primitiveStates: PRIMITIVE_STATES,
  shellRequirements: SHELL_PRIMITIVE_REQUIREMENTS,
  storyRequirements: STORY_STATE_REQUIREMENTS,
};

export const SEMANTIC_CONTRACTS = {
  Tabs: {
    roles: ['tablist', 'tab', 'tabpanel'],
    keyboard: ['ArrowLeft', 'ArrowRight', 'Home', 'End'],
  },
  Modal: {
    roles: ['dialog'],
    attributes: ['aria-labelledby', 'aria-modal'],
    behaviors: ['focus trap', 'Escape close', 'focus restore'],
  },
  LoadingState: {
    roles: ['status'],
    attributes: ['aria-live', 'aria-busy'],
  },
} as const;

export function getRequiredStatesForPrimitive(primitive: PrimitiveId): readonly string[] {
  return PRIMITIVE_STATES[primitive];
}

export function getPrimitiveExportPath(primitive: PrimitiveId): string {
  return `$lib/ui/components/${primitive}.svelte`;
}

export function getStoryFilePath(primitive: PrimitiveId): string {
  return `src/lib/ui/components/__stories__/${primitive}.stories.ts`;
}
