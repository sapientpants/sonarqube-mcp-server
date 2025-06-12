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

/**
 * Ensures a value is an array
 * @param value Single value, array, or undefined
 * @returns Array containing the value(s), or empty array if undefined
 */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Ensures a string value is an array of strings
 * Handles comma-separated strings for backward compatibility
 * @param value Single string, array of strings, or undefined
 * @returns Array of strings, or empty array if undefined
 */
export function ensureStringArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  // Check if the string contains commas and split if so
  if (value.includes(',')) return value.split(',');
  return [value];
}
