export interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  tti: number | null;
  memory: number | null;
  bundleSize: number | null;
}

export interface PerformanceBudgets {
  fcp: number;
  lcp: number;
  tti: number;
  memory: number;
  bundleSize: number;
}

export const DEFAULT_BUDGETS: PerformanceBudgets = {
  fcp: 1500,
  lcp: 2500,
  tti: 3000,
  memory: 200 * 1024 * 1024,
  bundleSize: 500 * 1024,
};

const metrics: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  tti: null,
  memory: null,
  bundleSize: null,
};

const observedEntries: PerformanceEntry[] = [];

export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  if ('PerformanceObserver' in window) {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = entry.startTime;
        } else if (entry.name === 'largest-contentful-paint') {
          metrics.lcp = entry.startTime;
        }
        observedEntries.push(entry);
      }
    });

    try {
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {
      // Fallback for browsers that don't support paint observation
    }

    const loadObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          metrics.tti = navEntry.domInteractive;
        }
        observedEntries.push(entry);
      }
    });

    try {
      loadObserver.observe({ type: 'navigation', buffered: true });
    } catch {
      // Fallback
    }
  }
}

export function getMemoryUsage(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if ('memory' in performance) {
    const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
    return memory.usedJSHeapSize;
  }

  return null;
}

export function getBundleSize(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  let totalSize = 0;

  for (const resource of resources) {
    if (resource.transferSize) {
      totalSize += resource.transferSize;
    }
  }

  return totalSize > 0 ? totalSize : null;
}

export function getMetrics(): PerformanceMetrics {
  return {
    ...metrics,
    memory: getMemoryUsage(),
    bundleSize: getBundleSize(),
  };
}

export function checkBudgets(budgets: PerformanceBudgets = DEFAULT_BUDGETS): {
  passed: boolean;
  violations: string[];
} {
  const currentMetrics = getMetrics();
  const violations: string[] = [];

  if (currentMetrics.fcp !== null && currentMetrics.fcp > budgets.fcp) {
    violations.push(`FCP: ${currentMetrics.fcp.toFixed(0)}ms > ${budgets.fcp}ms`);
  }

  if (currentMetrics.lcp !== null && currentMetrics.lcp > budgets.lcp) {
    violations.push(`LCP: ${currentMetrics.lcp.toFixed(0)}ms > ${budgets.lcp}ms`);
  }

  if (currentMetrics.tti !== null && currentMetrics.tti > budgets.tti) {
    violations.push(`TTI: ${currentMetrics.tti.toFixed(0)}ms > ${budgets.tti}ms`);
  }

  if (currentMetrics.memory !== null && currentMetrics.memory > budgets.memory) {
    violations.push(
      `Memory: ${(currentMetrics.memory / 1024 / 1024).toFixed(0)}MB > ${budgets.memory / 1024 / 1024}MB`,
    );
  }

  if (currentMetrics.bundleSize !== null && currentMetrics.bundleSize > budgets.bundleSize) {
    violations.push(
      `Bundle: ${(currentMetrics.bundleSize / 1024).toFixed(0)}KB > ${budgets.bundleSize / 1024}KB`,
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function getPerformanceTierFromMetrics(): 'low' | 'medium' | 'high' {
  const currentMetrics = getMetrics();
  let score = 0;

  if (currentMetrics.fcp !== null) {
    if (currentMetrics.fcp < 1000) score += 2;
    else if (currentMetrics.fcp < 1500) score += 1;
  }

  if (currentMetrics.lcp !== null) {
    if (currentMetrics.lcp < 2000) score += 2;
    else if (currentMetrics.lcp < 2500) score += 1;
  }

  if (currentMetrics.memory !== null) {
    if (currentMetrics.memory < 100 * 1024 * 1024) score += 2;
    else if (currentMetrics.memory < 200 * 1024 * 1024) score += 1;
  }

  if (score <= 2) return 'low';
  if (score <= 4) return 'medium';
  return 'high';
}
