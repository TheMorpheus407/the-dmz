export const createLocalId = (prefix = 'id'): string => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${suffix}`;
};

export const generateId = (): string => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `id-${timestamp}-${suffix}`;
};
