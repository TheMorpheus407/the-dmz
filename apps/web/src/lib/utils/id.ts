export const createLocalId = (prefix = "id"): string => {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${suffix}`;
};
