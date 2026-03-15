import { browser } from '$app/environment';

interface LazyModule<T> {
  module: T | null;
  loading: boolean;
  error: Error | null;
}

export function createLazyLoader<T>(): {
  load: () => Promise<T>;
  getModule: () => LazyModule<T>;
} {
  const cachedModule: T | null = null;
  let loading = false;
  let error: Error | null = null;
  let loadPromise: Promise<T> | null = null;

  return {
    load: () => {
      if (!browser) {
        return Promise.reject(new Error('Lazy loading is only available in the browser'));
      }

      if (cachedModule) {
        return Promise.resolve(cachedModule);
      }

      if (loadPromise) {
        return loadPromise;
      }

      loading = true;
      error = null;

      return new Promise<T>((_resolve, reject) => {
        loadPromise = (async (): Promise<T> => {
          try {
            throw new Error('load() must be called with a dynamic import function');
          } catch (e) {
            loading = false;
            const err = e instanceof Error ? e : new Error(String(e));
            error = err;
            loadPromise = null;
            reject(err);
            throw err;
          }
        })();
      });
    },

    getModule: () => ({
      module: cachedModule,
      loading,
      error,
    }),
  };
}

export async function lazyImport<T>(importer: () => Promise<unknown>): Promise<T> {
  if (!browser) {
    throw new Error('Lazy imports are only available in the browser');
  }

  const module = await importer();
  if (module && typeof module === 'object' && 'default' in module) {
    return (module as { default: T }).default;
  }
  return module as T;
}

export function createDeferredLoader<T>(
  loadFn: () => Promise<T>,
  trigger: () => boolean,
): {
  execute: () => Promise<T | null>;
  reset: () => void;
  getState: () => { loading: boolean; error: Error | null; executed: boolean };
} {
  let loading = false;
  let error: Error | null = null;
  let executed = false;
  let result: T | null = null;

  return {
    execute: async () => {
      if (executed || !trigger()) {
        return result;
      }

      loading = true;
      error = null;

      try {
        result = await loadFn();
        executed = true;
        return result;
      } catch (e) {
        error = e as Error;
        return null;
      } finally {
        loading = false;
      }
    },

    reset: () => {
      executed = false;
      result = null;
      error = null;
    },

    getState: () => ({
      loading,
      error,
      executed,
    }),
  };
}
