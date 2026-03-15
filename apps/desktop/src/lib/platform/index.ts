export type Platform = 'browser' | 'tauri' | 'unknown';

let cachedPlatform: Platform | null = null;

export function detectPlatform(): Platform {
  if (cachedPlatform) return cachedPlatform;

  if (typeof window === 'undefined') {
    cachedPlatform = 'unknown';
    return cachedPlatform;
  }

  if (window.__TAURI__) {
    cachedPlatform = 'tauri';
    return cachedPlatform;
  }

  cachedPlatform = 'browser';
  return cachedPlatform;
}

export function isTauri(): boolean {
  return detectPlatform() === 'tauri';
}

export function isBrowser(): boolean {
  return detectPlatform() === 'browser';
}

export interface PlatformCapabilities {
  localStorage: boolean;
  fileSystem: boolean;
  systemTray: boolean;
  steamApi: boolean;
  autoSave: boolean;
}

export function getCapabilities(): PlatformCapabilities {
  const platform = detectPlatform();

  if (platform === 'tauri') {
    return {
      localStorage: true,
      fileSystem: true,
      systemTray: true,
      steamApi: true,
      autoSave: true,
    };
  }

  return {
    localStorage: typeof window !== 'undefined' && 'localStorage' in window,
    fileSystem: false,
    systemTray: false,
    steamApi: false,
    autoSave: 'serviceWorker' in navigator,
  };
}

declare global {
  interface Window {
    __TAURI__?: Record<string, unknown>;
  }
}
