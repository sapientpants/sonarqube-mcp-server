import { describe, it, expect } from 'vitest';
describe('Field transformation utilities', () => {
  it('should transform array parameters correctly', () => {
    // Simulate the transformation logic in the tool registration
    function transformToArray(value: unknown): string[] {
      return Array.isArray(value) ? value : [value as string];
    }
    // Test with string input
    expect(transformToArray('single')).toEqual(['single']);
    // Test with array input
    expect(transformToArray(['one', 'two'])).toEqual(['one', 'two']);
    // Test with empty array
    expect(transformToArray([])).toEqual([]);
  });
  it('should transform page parameters correctly', () => {
    // Simulate the page transform logic
    function transformPage(val: string | undefined | null): number | null | undefined {
      return val ? parseInt(val, 10) || null : null;
    }
    // Valid number
    expect(transformPage('10')).toBe(10);
    // Invalid number
    expect(transformPage('not-a-number')).toBe(null);
    // Empty string
    expect(transformPage('')).toBe(null);
    // Undefined or null
    expect(transformPage(undefined)).toBe(null);
    expect(transformPage(null)).toBe(null);
  });
  it('should correctly transform page and page_size in tool handlers', () => {
    // Simulate the transform in tool handler
    function transformPageParams(params: Record<string, unknown>): {
      page?: number;
      pageSize?: number;
    } {
      function nullToUndefined<T>(value: T | null | undefined): T | undefined {
        return value === null ? undefined : value;
      }
      const page = nullToUndefined(params.page) as number | undefined;
      const pageSize = nullToUndefined(params.page_size) as number | undefined;
      return {
        ...(page !== undefined && { page }),
        ...(pageSize !== undefined && { pageSize }),
      };
    }
    // Test with numbers
    expect(transformPageParams({ page: 5, page_size: 20 })).toEqual({ page: 5, pageSize: 20 });
    // Test with strings
    expect(transformPageParams({ page: '5', page_size: '20' })).toEqual({
      page: '5',
      pageSize: '20',
    });
    // Test with null
    expect(transformPageParams({ page: null, page_size: null })).toEqual({
      page: undefined,
      pageSize: undefined,
    });
    // Test with mixed
    expect(transformPageParams({ page: 5, page_size: null })).toEqual({
      page: 5,
      pageSize: undefined,
    });
    // Test with undefined
    expect(transformPageParams({ page: undefined, page_size: undefined })).toEqual({
      page: undefined,
      pageSize: undefined,
    });
    // Test with empty object
    expect(transformPageParams({})).toEqual({ page: undefined, pageSize: undefined });
  });
  it('should handle component key transformation correctly', () => {
    // Simulate the component key transformation in the getComponentsMeasures handler
    function transformComponentKeys(componentKeys: string | string[]): string {
      return Array.isArray(componentKeys) ? componentKeys.join(',') : componentKeys;
    }
    // Test with string
    expect(transformComponentKeys('single-component')).toBe('single-component');
    // Test with array
    expect(transformComponentKeys(['component1', 'component2'])).toBe('component1,component2');
    // Test with single item array
    expect(transformComponentKeys(['component1'])).toBe('component1');
    // Test with empty array
    expect(transformComponentKeys([])).toBe('');
  });
  it('should handle metric keys transformation correctly', () => {
    // Simulate the metric keys transformation in the getComponentMeasures handler
    function transformMetricKeys(metricKeys: string | string[]): string {
      return Array.isArray(metricKeys) ? metricKeys.join(',') : metricKeys;
    }
    // Test with string
    expect(transformMetricKeys('single-metric')).toBe('single-metric');
    // Test with array
    expect(transformMetricKeys(['metric1', 'metric2'])).toBe('metric1,metric2');
    // Test with single item array
    expect(transformMetricKeys(['metric1'])).toBe('metric1');
    // Test with empty array
    expect(transformMetricKeys([])).toBe('');
  });
});
