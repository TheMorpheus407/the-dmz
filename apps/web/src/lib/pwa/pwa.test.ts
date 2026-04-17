import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

vi.mock('$lib/stores/connectivity', () => ({
  updatePendingEvents: vi.fn(),
  getUnsyncedEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('$lib/storage/event-queue', () => ({
  getUnsyncedEvents: vi.fn().mockResolvedValue([]),
  clearOldEvents: vi.fn().mockResolvedValue(0),
}));

vi.mock('$lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockServiceWorker(): any {
  let stateChangeHandler: ((e: unknown) => void) | null = null;
  const mockInstallingWorker = {
    addEventListener: vi.fn((event: string, cb: (e: unknown) => void) => {
      if (event === 'statechange') {
        stateChangeHandler = cb;
      }
    }),
    state: 'installing',
  };

  const mockSW = {
    register: vi.fn().mockResolvedValue({
      installing: mockInstallingWorker,
      waiting: null,
      active: { postMessage: vi.fn() },
      addEventListener: vi.fn((event: string, cb: (e: unknown) => void) => {
        if (event === 'updatefound') {
          setTimeout(() => cb({}), 0);
        }
      }),
    }),
    ready: Promise.resolve({
      installing: mockInstallingWorker,
      waiting: null,
      active: { postMessage: vi.fn() },
      pushManager: {
        subscribe: vi.fn(),
        getSubscription: vi.fn().mockResolvedValue(null),
      },
      addEventListener: vi.fn(),
    }),
    triggerStateChange: (state: string) => {
      if (stateChangeHandler) {
        stateChangeHandler({ target: { state } });
      }
    },
  };

  const mockNavigator = {
    serviceWorker: {
      register: mockSW.register,
      ready: mockSW.ready,
    },
  };

  return { mockSW, mockNavigator } as const;
}

function createMockCaches(): { mockCaches: Record<string, unknown> } {
  const mockCache = {
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(null),
  };
  const mockCaches: Record<string, unknown> = {
    keys: vi.fn().mockResolvedValue([]),
    open: vi.fn().mockResolvedValue(mockCache),
    delete: vi.fn().mockResolvedValue(true),
  };
  return { mockCaches };
}

describe('pwa/index', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getPWAState', () => {
    it('should return initial PWA state with installed false', async () => {
      const { getPWAState } = await import('$lib/pwa');
      const state = getPWAState();
      expect(state.installed).toBe(false);
    });

    it('should return initial PWA state with updateAvailable false', async () => {
      const { getPWAState } = await import('$lib/pwa');
      const state = getPWAState();
      expect(state.updateAvailable).toBe(false);
    });

    it('should return initial PWA state with updateVersion null', async () => {
      const { getPWAState } = await import('$lib/pwa');
      const state = getPWAState();
      expect(state.updateVersion).toBeNull();
    });

    it('should return an object with all required state properties', async () => {
      const { getPWAState } = await import('$lib/pwa');
      const state = getPWAState();
      expect(state).toHaveProperty('installed');
      expect(state).toHaveProperty('updateAvailable');
      expect(state).toHaveProperty('updateVersion');
    });
  });

  describe('initializePWA', () => {
    it('should register service worker at /sw.js path', async () => {
      const { mockNavigator } = createMockServiceWorker();
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { initializePWA } = await import('$lib/pwa');
        await initializePWA();
        await vi.runAllTimersAsync();
        expect(mockNavigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should set installed state to true after successful registration', async () => {
      const { mockNavigator } = createMockServiceWorker();
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { initializePWA, getPWAState } = await import('$lib/pwa');
        await initializePWA();
        await vi.runAllTimersAsync();
        expect(getPWAState().installed).toBe(true);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should not throw when service worker registration fails', async () => {
      const { mockNavigator } = createMockServiceWorker();
      mockNavigator.serviceWorker.register = vi
        .fn()
        .mockRejectedValue(new Error('Registration failed'));
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { initializePWA } = await import('$lib/pwa');
        await expect(initializePWA()).resolves.not.toThrow();
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should set updateAvailable to true when updatefound event fires and controller exists', async () => {
      const { mockSW, mockNavigator } = createMockServiceWorker();
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { initializePWA, getPWAState } = await import('$lib/pwa');
        await initializePWA();
        await vi.runAllTimersAsync();
        mockSW.triggerStateChange('installed');
        expect(getPWAState().updateAvailable).toBe(true);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('handleServiceWorkerUpdate', () => {
    it('should post SKIP_WAITING message to waiting worker', async () => {
      const waitingWorker = { postMessage: vi.fn(), state: 'installed' };
      const mockRegistration = {
        waiting: waitingWorker,
        active: null,
      };

      const mockServiceWorker = {
        ready: Promise.resolve(mockRegistration),
      };

      const mockNavigator = { serviceWorker: mockServiceWorker };
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { handleServiceWorkerUpdate } = await import('$lib/pwa');
        await handleServiceWorkerUpdate();
        expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should reload the page after posting SKIP_WAITING', async () => {
      const mockLocation = { reload: vi.fn() };
      const originalLocation = global.location;
      Object.defineProperty(global, 'location', {
        value: mockLocation,
        writable: true,
        configurable: true,
      });

      const waitingWorker = { postMessage: vi.fn(), state: 'installed' };
      const mockRegistration = {
        waiting: waitingWorker,
        active: null,
      };

      const mockNavigator = {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration),
        },
      };
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { handleServiceWorkerUpdate } = await import('$lib/pwa');
        await handleServiceWorkerUpdate();
        expect(mockLocation.reload).toHaveBeenCalled();
      } finally {
        Object.defineProperty(global, 'location', {
          value: originalLocation,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should not post message when there is no waiting worker', async () => {
      const mockRegistration = {
        waiting: null,
        active: { postMessage: vi.fn() },
      };

      const mockNavigator = {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration),
        },
      };
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      const mockLocation = { reload: vi.fn() };
      const originalLocation = global.location;
      Object.defineProperty(global, 'location', {
        value: mockLocation,
        writable: true,
        configurable: true,
      });

      try {
        const { handleServiceWorkerUpdate } = await import('$lib/pwa');
        await handleServiceWorkerUpdate();
        expect(mockLocation.reload).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(global, 'location', {
          value: originalLocation,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('clearOldData', () => {
    it('should call clearOldEvents from event-queue', async () => {
      const clearOldEventsMock = vi.fn().mockResolvedValue(5);

      vi.doMock('$lib/storage/event-queue', () => ({
        getUnsyncedEvents: vi.fn().mockResolvedValue([]),
        clearOldEvents: clearOldEventsMock,
      }));

      const { clearOldData } = await import('$lib/pwa');
      await clearOldData();
      expect(clearOldEventsMock).toHaveBeenCalled();
    });

    it('should not throw when clearOldEvents fails', async () => {
      vi.doMock('$lib/storage/event-queue', () => ({
        getUnsyncedEvents: vi.fn().mockResolvedValue([]),
        clearOldEvents: vi.fn().mockRejectedValue(new Error('DB error')),
      }));

      const { clearOldData } = await import('$lib/pwa');
      await expect(clearOldData()).resolves.not.toThrow();
    });
  });

  describe('getCacheStatus', () => {
    it('should return empty caches array when no caches exist', async () => {
      const { mockCaches } = createMockCaches();
      mockCaches['keys'] = vi.fn().mockResolvedValue([]);
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.caches).toEqual([]);
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return estimatedSize 0 B when no caches exist', async () => {
      const { mockCaches } = createMockCaches();
      mockCaches['keys'] = vi.fn().mockResolvedValue([]);
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.estimatedSize).toBe('0 B');
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return cache names when caches exist', async () => {
      const { mockCaches } = createMockCaches();
      mockCaches['keys'] = vi.fn().mockResolvedValue(['cache-v1', 'cache-v2']);
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.caches).toEqual(['cache-v1', 'cache-v2']);
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return 0 B estimated size when caches api is not available', async () => {
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.caches).toEqual([]);
        expect(status.estimatedSize).toBe('0 B');
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return correct size for 1 KB (1024 bytes)', async () => {
      const mockRequest = {};
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(new Blob([], { size: 1024 } as BlobPropertyBag)),
      };
      const mockCache = {
        keys: vi.fn().mockResolvedValue([mockRequest]),
        match: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['test-cache']),
        open: vi.fn().mockResolvedValue(mockCache),
        delete: vi.fn().mockResolvedValue(true),
      };
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.estimatedSize).toBe('1 KB');
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return correct size for 1 MB (1024 * 1024 bytes)', async () => {
      const mockRequest = {};
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(new Blob([], { size: 1024 * 1024 } as BlobPropertyBag)),
      };
      const mockCache = {
        keys: vi.fn().mockResolvedValue([mockRequest]),
        match: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['test-cache']),
        open: vi.fn().mockResolvedValue(mockCache),
        delete: vi.fn().mockResolvedValue(true),
      };
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.estimatedSize).toBe('1 MB');
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return correct size for 1 GB (1024 * 1024 * 1024 bytes)', async () => {
      const mockRequest = {};
      const mockResponse = {
        blob: vi
          .fn()
          .mockResolvedValue(new Blob([], { size: 1024 * 1024 * 1024 } as BlobPropertyBag)),
      };
      const mockCache = {
        keys: vi.fn().mockResolvedValue([mockRequest]),
        match: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['test-cache']),
        open: vi.fn().mockResolvedValue(mockCache),
        delete: vi.fn().mockResolvedValue(true),
      };
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.estimatedSize).toBe('1 GB');
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return correct size for 0 bytes', async () => {
      const mockRequest = {};
      const mockResponse = {
        blob: vi.fn().mockResolvedValue(new Blob([], { size: 0 } as BlobPropertyBag)),
      };
      const mockCache = {
        keys: vi.fn().mockResolvedValue([mockRequest]),
        match: vi.fn().mockResolvedValue(mockResponse),
      };
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['test-cache']),
        open: vi.fn().mockResolvedValue(mockCache),
        delete: vi.fn().mockResolvedValue(true),
      };
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      try {
        const { getCacheStatus } = await import('$lib/pwa');
        const status = await getCacheStatus();
        expect(status.estimatedSize).toBe('0 B');
      } finally {
        Object.defineProperty(global, 'caches', {
          value: originalCaches,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('exported functions', () => {
    it('should export initializePWA function', async () => {
      const { initializePWA } = await import('$lib/pwa');
      expect(initializePWA).toBeDefined();
      expect(typeof initializePWA).toBe('function');
    });

    it('should export getPWAState function', async () => {
      const { getPWAState } = await import('$lib/pwa');
      expect(getPWAState).toBeDefined();
      expect(typeof getPWAState).toBe('function');
    });

    it('should export handleServiceWorkerUpdate function', async () => {
      const { handleServiceWorkerUpdate } = await import('$lib/pwa');
      expect(handleServiceWorkerUpdate).toBeDefined();
      expect(typeof handleServiceWorkerUpdate).toBe('function');
    });

    it('should export clearOldData function', async () => {
      const { clearOldData } = await import('$lib/pwa');
      expect(clearOldData).toBeDefined();
      expect(typeof clearOldData).toBe('function');
    });

    it('should export getCacheStatus function', async () => {
      const { getCacheStatus } = await import('$lib/pwa');
      expect(getCacheStatus).toBeDefined();
      expect(typeof getCacheStatus).toBe('function');
    });

    it('should export push notification functions', async () => {
      const { isPushSupported, subscribeToPush, unsubscribeFromPush } = await import('$lib/pwa');
      expect(isPushSupported).toBeDefined();
      expect(typeof isPushSupported).toBe('function');
      expect(subscribeToPush).toBeDefined();
      expect(typeof subscribeToPush).toBe('function');
      expect(unsubscribeFromPush).toBeDefined();
      expect(typeof unsubscribeFromPush).toBe('function');
    });
  });
});

describe('pwa/push', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('isPushSupported', () => {
    it('should return true when serviceWorker and PushManager are available', async () => {
      const mockNavigator = {
        serviceWorker: {},
        PushManager: {},
      };
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { isPushSupported } = await import('$lib/pwa');
        const result = await isPushSupported();
        expect(result).toBe(true);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return false when serviceWorker is not available', async () => {
      const mockNavigator = {
        serviceWorker: undefined,
        PushManager: {},
      };
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { isPushSupported } = await import('$lib/pwa');
        const result = await isPushSupported();
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should return false when PushManager is not available', async () => {
      const mockNavigator = {
        serviceWorker: {},
        PushManager: undefined,
      };
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      try {
        const { isPushSupported } = await import('$lib/pwa');
        const result = await isPushSupported();
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('requestPushPermission', () => {
    it('should return denied when Notification API is not available', async () => {
      const mockWindow = { Notification: undefined };
      vi.stubGlobal('window', mockWindow);

      const { requestPushPermission } = await import('$lib/pwa');
      const result = await requestPushPermission();
      expect(result).toBe('denied');
    });

    it('should return the permission result when Notification API is available', async () => {
      const mockNotification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      vi.stubGlobal('Notification', mockNotification);

      const { requestPushPermission } = await import('$lib/pwa');
      const result = await requestPushPermission();
      expect(result).toBe('granted');
      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should return denied when permission is denied', async () => {
      const mockNotification = {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };
      vi.stubGlobal('Notification', mockNotification);

      const { requestPushPermission } = await import('$lib/pwa');
      const result = await requestPushPermission();
      expect(result).toBe('denied');
    });
  });

  describe('subscribeToPush', () => {
    it('should return null when VAPID key is missing', async () => {
      const { subscribeToPush } = await import('$lib/pwa');
      const result = await subscribeToPush();
      expect(result).toBeNull();
    });

    it('should return null when permission is denied', async () => {
      const mockNotification = {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };
      const mockNavigator = {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              subscribe: vi.fn(),
            },
          }),
        },
      };

      vi.stubGlobal('Notification', mockNotification);
      vi.stubGlobal('navigator', mockNavigator);

      const { subscribeToPush } = await import('$lib/pwa');
      const result = await subscribeToPush();
      expect(result).toBeNull();
    });

    it('should return a PushSubscription when permission is granted and VAPID key exists', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/push',
        toJSON: () => ({
          endpoint: 'https://example.com/push',
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        }),
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      const mockNotification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };

      const mockPushManager = {
        subscribe: vi.fn().mockResolvedValue(mockSubscription),
        getSubscription: vi.fn().mockResolvedValue(null),
      };

      vi.stubGlobal('Notification', mockNotification);
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
      });

      vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-vapid-key');

      const mockDB = {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
      };

      vi.doMock('$lib/storage/idb', () => ({
        getDB: vi.fn().mockResolvedValue(mockDB),
      }));

      const { subscribeToPush } = await import('$lib/pwa');
      const result = await subscribeToPush();
      expect(result).toBe(mockSubscription);
      expect(mockDB.put).toHaveBeenCalledWith(
        'pushSubscriptions',
        expect.objectContaining({
          endpoint: 'https://example.com/push',
          keys: expect.objectContaining({
            p256dh: 'test-p256dh',
            auth: 'test-auth',
          }),
        }),
      );
    });
  });

  describe('unsubscribeFromPush', () => {
    it('should return false when there is no subscription', async () => {
      const { unsubscribeFromPush } = await import('$lib/pwa');
      const result = await unsubscribeFromPush();
      expect(result).toBe(false);
    });
  });

  describe('getCurrentSubscription', () => {
    it('should return null when there is no current subscription', async () => {
      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
      };

      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
      });

      const { getCurrentSubscription } = await import('$lib/pwa');
      const result = await getCurrentSubscription();
      expect(result).toBeNull();
    });

    it('should return the subscription when one exists', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/push',
        toJSON: () => ({ endpoint: 'https://example.com/push', keys: {} }),
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(mockSubscription),
      };

      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
      });

      const { getCurrentSubscription } = await import('$lib/pwa');
      const result = await getCurrentSubscription();
      expect(result).toBe(mockSubscription);
    });
  });

  describe('isSubscribed', () => {
    it('should return false when not subscribed', async () => {
      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
      };

      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
      });

      const { isSubscribed } = await import('$lib/pwa');
      const result = await isSubscribed();
      expect(result).toBe(false);
    });

    it('should return true when subscribed', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com/push',
        toJSON: () => ({ endpoint: 'https://example.com/push', keys: {} }),
      };

      const mockPushManager = {
        getSubscription: vi.fn().mockResolvedValue(mockSubscription),
      };

      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: mockPushManager,
          }),
        },
      });

      const { isSubscribed } = await import('$lib/pwa');
      const result = await isSubscribed();
      expect(result).toBe(true);
    });
  });

  describe('showLocalNotification', () => {
    it('should return null when Notification API is not available', async () => {
      const mockWindow = { Notification: undefined };
      vi.stubGlobal('window', mockWindow);

      const { showLocalNotification } = await import('$lib/pwa');
      const result = await showLocalNotification('Test Title');
      expect(result).toBeNull();
    });

    it('should return null when permission is not granted', async () => {
      const mockNotification = {
        permission: 'denied',
      };
      vi.stubGlobal('Notification', mockNotification);

      const { showLocalNotification } = await import('$lib/pwa');
      const result = await showLocalNotification('Test Title');
      expect(result).toBeNull();
    });

    it('should return a Notification when permission is granted', async () => {
      const mockNotification = vi.fn() as unknown as typeof Notification & { permission: string };
      mockNotification.permission = 'granted';
      vi.stubGlobal('Notification', mockNotification);

      const { showLocalNotification } = await import('$lib/pwa');
      await showLocalNotification('Test Title', { body: 'Test body' });
      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        body: 'Test body',
      });
    });

    it('should return the Notification instance when permission is granted', async () => {
      const mockNotificationInstance = {};
      const mockNotification = vi.fn(
        () => mockNotificationInstance,
      ) as unknown as typeof Notification & { permission: string };
      mockNotification.permission = 'granted';
      vi.stubGlobal('Notification', mockNotification);

      const { showLocalNotification } = await import('$lib/pwa');
      const result = await showLocalNotification('Test Title');
      expect(result).toBe(mockNotificationInstance);
    });
  });

  describe('getStoredSubscriptions', () => {
    it('should return empty array when no subscriptions exist', async () => {
      const mockDB = {
        getAll: vi.fn().mockResolvedValue([]),
      };

      vi.doMock('$lib/storage/idb', () => ({
        getDB: vi.fn().mockResolvedValue(mockDB),
      }));

      const { getStoredSubscriptions } = await import('$lib/pwa');
      const result = await getStoredSubscriptions();
      expect(result).toEqual([]);
      expect(mockDB.getAll).toHaveBeenCalledWith('pushSubscriptions');
    });

    it('should return stored subscriptions from IDB', async () => {
      const storedData = [
        {
          id: 'sub-1',
          endpoint: 'https://example.com/push/1',
          keys: { p256dh: 'key1', auth: 'auth1' },
          createdAt: Date.now(),
        },
        {
          id: 'sub-2',
          endpoint: 'https://example.com/push/2',
          keys: { p256dh: 'key2', auth: 'auth2' },
          createdAt: Date.now(),
        },
      ];

      const mockDB = {
        getAll: vi.fn().mockResolvedValue(storedData),
      };

      vi.doMock('$lib/storage/idb', () => ({
        getDB: vi.fn().mockResolvedValue(mockDB),
      }));

      const { getStoredSubscriptions } = await import('$lib/pwa');
      const result = await getStoredSubscriptions();
      expect(result).toEqual(storedData);
      expect(mockDB.getAll).toHaveBeenCalledWith('pushSubscriptions');
    });
  });
});
