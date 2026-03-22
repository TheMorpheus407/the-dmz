import { logger } from '$lib/logger';

import { browser } from '$app/environment';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
}

let config: AnalyticsConfig = {
  enabled: false,
  debug: false,
};

let initialized = false;
const queue: AnalyticsEvent[] = [];

export function initAnalytics(userConfig?: Partial<AnalyticsConfig>): void {
  if (!browser) return;

  config = {
    enabled: true,
    debug: userConfig?.debug ?? false,
  };
  initialized = true;

  while (queue.length > 0) {
    const event = queue.shift();
    if (event) {
      trackEvent(event);
    }
  }

  if (config.debug) {
    logger.debug('[Analytics] Initialized');
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  if (!browser) return;

  if (!initialized) {
    queue.push(event);
    return;
  }

  if (!config.enabled) {
    return;
  }

  if (config.debug) {
    logger.debug('[Analytics]', event as unknown as Record<string, unknown>);
  }
}

export function trackPageView(pageName: string): void {
  trackEvent({
    category: 'pageview',
    action: pageName,
  });
}

export function trackInteraction(interactionType: string, target: string, label?: string): void {
  trackEvent({
    category: 'interaction',
    action: interactionType,
    label: label ?? target,
  });
}

export function trackPerformance(metric: string, value: number): void {
  trackEvent({
    category: 'performance',
    action: metric,
    value: Math.round(value),
  });
}

export function trackError(errorType: string, errorMessage: string): void {
  trackEvent({
    category: 'error',
    action: errorType,
    label: errorMessage,
  });
}

export function isAnalyticsEnabled(): boolean {
  return config.enabled;
}

export function setAnalyticsEnabled(enabled: boolean): void {
  config.enabled = enabled;
}
