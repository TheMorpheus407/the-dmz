/**
 * Generate a deterministic yet unique test identifier using crypto.randomUUID().
 *
 * @param prefix - Optional prefix to prepend to the ID (e.g., 'email', 'tenant')
 * @returns A short UUID (first 8 characters) or `${prefix}-${shortUUID}` if prefix provided
 */
export function createTestId(prefix?: string): string {
  const id = crypto.randomUUID().slice(0, 8);
  return prefix ? `${prefix}-${id}` : id;
}
