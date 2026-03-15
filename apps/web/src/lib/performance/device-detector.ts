import { browser } from '$app/environment';

export type PerformanceTier = 'low' | 'medium' | 'high';

export interface DevicePerformanceInfo {
  tier: PerformanceTier;
  hardwareConcurrency: number;
  deviceMemory: number | undefined;
  connectionEffectiveType: string | undefined;
  isMobile: boolean;
  isLowEndDevice: boolean;
}

interface NavigatorWithDeviceMemory {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
  };
}

const LOW_END_HARDWARE_THRESHOLD = 4;
const MEDIUM_END_HARDWARE_THRESHOLD = 8;

const LOW_END_MEMORY_THRESHOLD = 4;

function detectHardwareConcurrency(): number {
  if (!browser || !navigator.hardwareConcurrency) {
    return MEDIUM_END_HARDWARE_THRESHOLD;
  }
  return navigator.hardwareConcurrency;
}

function detectDeviceMemory(): number | undefined {
  if (!browser) return undefined;

  const nav = navigator as NavigatorWithDeviceMemory;
  if (!nav.deviceMemory) {
    return undefined;
  }
  return nav.deviceMemory;
}

function detectConnectionType(): string | undefined {
  if (!browser) return undefined;

  const nav = navigator as NavigatorWithDeviceMemory;
  if (!nav.connection) {
    return undefined;
  }
  return nav.connection.effectiveType;
}

function detectIsMobile(): boolean {
  if (!browser) return false;

  const userAgent =
    navigator.userAgent || navigator.vendor || (window as unknown as { opera: string }).opera;

  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase(),
  );
}

function detectIsLowEndDevice(): boolean {
  if (!browser) return false;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');

  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      const lowEndRenderers = ['intel', 'mali-4', 'adreno 3', 'sgx'];
      for (const lowEnd of lowEndRenderers) {
        if (renderer.toLowerCase().includes(lowEnd)) {
          return true;
        }
      }
    }
  }

  return false;
}

function calculateTier(
  hardwareConcurrency: number,
  deviceMemory: number | undefined,
  connectionEffectiveType: string | undefined,
  isMobile: boolean,
): PerformanceTier {
  let score = 0;

  if (hardwareConcurrency >= MEDIUM_END_HARDWARE_THRESHOLD) {
    score += 2;
  } else if (hardwareConcurrency >= LOW_END_HARDWARE_THRESHOLD) {
    score += 1;
  }

  if (deviceMemory !== undefined) {
    if (deviceMemory >= 8) {
      score += 2;
    } else if (deviceMemory >= LOW_END_MEMORY_THRESHOLD) {
      score += 1;
    }
  } else if (isMobile) {
    score -= 1;
  }

  if (connectionEffectiveType) {
    if (connectionEffectiveType === '4g') {
      score += 1;
    } else if (connectionEffectiveType === '3g' || connectionEffectiveType === '2g') {
      score -= 1;
    }
  }

  if (score <= 1) {
    return 'low';
  } else if (score <= 3) {
    return 'medium';
  }
  return 'high';
}

export function detectDevicePerformance(): DevicePerformanceInfo {
  if (!browser) {
    return {
      tier: 'medium',
      hardwareConcurrency: MEDIUM_END_HARDWARE_THRESHOLD,
      deviceMemory: undefined,
      connectionEffectiveType: undefined,
      isMobile: false,
      isLowEndDevice: false,
    };
  }

  const hardwareConcurrency = detectHardwareConcurrency();
  const deviceMemory = detectDeviceMemory();
  const connectionEffectiveType = detectConnectionType();
  const isMobile = detectIsMobile();
  const isLowEndDevice = detectIsLowEndDevice();

  const tier = calculateTier(hardwareConcurrency, deviceMemory, connectionEffectiveType, isMobile);

  return {
    tier,
    hardwareConcurrency,
    deviceMemory,
    connectionEffectiveType,
    isMobile,
    isLowEndDevice,
  };
}

export function getRecommendedEffectsForTier(tier: PerformanceTier): {
  scanlines: boolean;
  curvature: boolean;
  glow: boolean;
  noise: boolean;
  vignette: boolean;
  flicker: boolean;
} {
  switch (tier) {
    case 'low':
      return {
        scanlines: false,
        curvature: false,
        glow: false,
        noise: false,
        vignette: false,
        flicker: false,
      };
    case 'medium':
      return {
        scanlines: true,
        curvature: false,
        glow: true,
        noise: false,
        vignette: true,
        flicker: false,
      };
    case 'high':
    default:
      return {
        scanlines: true,
        curvature: true,
        glow: true,
        noise: false,
        vignette: true,
        flicker: true,
      };
  }
}

export function getRecommendedEffectIntensityForTier(tier: PerformanceTier): {
  scanlines: number;
  curvature: number;
  glow: number;
  noise: number;
  vignette: number;
  flicker: number;
} {
  switch (tier) {
    case 'low':
      return {
        scanlines: 0,
        curvature: 0,
        glow: 0,
        noise: 0,
        vignette: 0,
        flicker: 0,
      };
    case 'medium':
      return {
        scanlines: 50,
        curvature: 0,
        glow: 40,
        noise: 0,
        vignette: 30,
        flicker: 0,
      };
    case 'high':
    default:
      return {
        scanlines: 70,
        curvature: 50,
        glow: 60,
        noise: 30,
        vignette: 50,
        flicker: 40,
      };
  }
}
