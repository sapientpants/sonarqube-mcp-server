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
  const parsed = Number.parseInt(val, 10);
  return Number.isNaN(parsed) ? null : parsed;
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
  if (value.includes(',')) return value.split(',').map((s) => s.trim());
  return [value];
}

/**
 * Converts a number or string to a string
 * Useful for parameters that can be passed as either type but need to be strings for the API
 * @param value Number, string, null, or undefined
 * @returns String representation of the value, or the original null/undefined
 */
export function numberOrStringToString(
  value: number | string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  return String(value);
}

/**
 * Parses a JSON string array or returns the array as-is
 * Useful for MCP parameters that might be sent as JSON strings
 * @param value Array, JSON string array, null, or undefined
 * @returns Array of strings, or null/undefined
 */
export function parseJsonStringArray(
  value: string[] | string | null | undefined
): string[] | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  // If it's already an array, return it
  if (Array.isArray(value)) {
    return value;
  }

  // If it's a string, try to parse it as JSON
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
      // If parsed but not an array, wrap it
      return [String(parsed)];
    } catch {
      // If not valid JSON, treat as single value array
      return [value];
    }
  }

  // Shouldn't reach here, but handle edge cases
  return [String(value)];
}
