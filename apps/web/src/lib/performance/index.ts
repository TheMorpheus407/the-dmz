export {
  detectDevicePerformance,
  getRecommendedEffectsForTier,
  getRecommendedEffectIntensityForTier,
  type PerformanceTier,
  type DevicePerformanceInfo,
} from './device-detector';

export { createLazyLoader, lazyImport, createDeferredLoader } from './lazy-loader';

export {
  initPerformanceMonitoring,
  getMemoryUsage,
  getBundleSize,
  getMetrics,
  checkBudgets,
  getPerformanceTierFromMetrics,
  type PerformanceMetrics,
  type PerformanceBudgets,
  DEFAULT_BUDGETS,
} from './performance-monitor';
