/**
 * Helper function to convert null to undefined
 * @param value Any value that might be null
 * @returns The original value or undefined if null
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Helper function to transform string to number or null
 * @param val String value to transform
 * @returns Number or null if conversion fails
 */
export function stringToNumberTransform(val: string | null | undefined): number | null | undefined {
  if (val === null || val === undefined) {
    return val;
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}
