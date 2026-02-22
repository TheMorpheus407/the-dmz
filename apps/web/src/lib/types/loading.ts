export type LoadingStateType = 'initial' | 'navigation' | 'revalidation' | 'mutation';

export type LoadingSurface = 'full-page' | 'panel' | 'inline';

export interface LoadingStateConfig {
  type: LoadingStateType;
  surface: LoadingSurface;
  timeout?: number;
  message?: string;
}

export interface LoadingTransitionConfig {
  showDelay: number;
  minDisplayDuration: number;
}

export const LOADING_TRANSITION_CONFIG: LoadingTransitionConfig = {
  showDelay: 100,
  minDisplayDuration: 300,
};

export const LOADING_STATE_CONFIGS: Record<LoadingStateType, LoadingStateConfig> = {
  initial: {
    type: 'initial',
    surface: 'full-page',
    timeout: 30000,
    message: 'Initializing...',
  },
  navigation: {
    type: 'navigation',
    surface: 'panel',
    timeout: 15000,
    message: 'Loading...',
  },
  revalidation: {
    type: 'revalidation',
    surface: 'inline',
    timeout: 10000,
    message: 'Refreshing...',
  },
  mutation: {
    type: 'mutation',
    surface: 'full-page',
    timeout: 30000,
    message: 'Processing...',
  },
};

export type RouteGroup = '(game)' | '(admin)' | '(auth)' | '(public)';

export const ROUTE_GROUP_LOADING_MESSAGES: Record<RouteGroup, { message: string }> = {
  '(game)': {
    message: 'Establishing secure connection...',
  },
  '(admin)': {
    message: 'Loading dashboard...',
  },
  '(auth)': {
    message: 'Authenticating...',
  },
  '(public)': {
    message: 'Loading...',
  },
};
