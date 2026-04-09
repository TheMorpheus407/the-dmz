const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value) &&
  !Array.isArray(value) &&
  !(value instanceof Map) &&
  !(value instanceof Set) &&
  !(value instanceof WeakMap) &&
  !(value instanceof WeakSet) &&
  !(value instanceof RegExp) &&
  !(value instanceof Date);
