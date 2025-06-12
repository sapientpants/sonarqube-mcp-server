import { describe, test, expect } from '@jest/globals';
import {
  ensureArray,
  ensureStringArray,
  nullToUndefined,
  stringToNumberTransform,
} from '../../utils/transforms';

describe('transforms', () => {
  describe('nullToUndefined', () => {
    test('converts null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    test('preserves undefined', () => {
      expect(nullToUndefined(undefined)).toBeUndefined();
    });

    test('preserves other values', () => {
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });
  });

  describe('stringToNumberTransform', () => {
    test('converts valid string to number', () => {
      expect(stringToNumberTransform('123')).toBe(123);
      expect(stringToNumberTransform('0')).toBe(0);
      expect(stringToNumberTransform('-456')).toBe(-456);
    });

    test('returns null for invalid strings', () => {
      expect(stringToNumberTransform('abc')).toBeNull();
      expect(stringToNumberTransform('')).toBeNull();
      expect(stringToNumberTransform('12.34')).toBe(12); // parseInt behavior
    });

    test('preserves null and undefined', () => {
      expect(stringToNumberTransform(null)).toBeNull();
      expect(stringToNumberTransform(undefined)).toBeUndefined();
    });
  });

  describe('ensureArray', () => {
    test('returns empty array for undefined', () => {
      expect(ensureArray(undefined)).toEqual([]);
    });

    test('wraps single value in array', () => {
      expect(ensureArray('hello')).toEqual(['hello']);
      expect(ensureArray(123)).toEqual([123]);
      expect(ensureArray(true)).toEqual([true]);
      expect(ensureArray({ key: 'value' })).toEqual([{ key: 'value' }]);
    });

    test('returns array as-is', () => {
      expect(ensureArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(ensureArray([])).toEqual([]);
    });

    test('handles mixed type arrays', () => {
      const mixed = [1, 'two', { three: 3 }];
      expect(ensureArray(mixed)).toEqual(mixed);
    });

    test('handles null as a value', () => {
      expect(ensureArray(null)).toEqual([null]);
    });

    test('handles zero and empty string', () => {
      expect(ensureArray(0)).toEqual([0]);
      expect(ensureArray('')).toEqual(['']);
    });
  });

  describe('ensureStringArray', () => {
    test('returns empty array for undefined', () => {
      expect(ensureStringArray(undefined)).toEqual([]);
    });

    test('wraps single string in array', () => {
      expect(ensureStringArray('hello')).toEqual(['hello']);
      expect(ensureStringArray('')).toEqual(['']);
    });

    test('returns string array as-is', () => {
      expect(ensureStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(ensureStringArray([])).toEqual([]);
    });

    test('preserves array reference', () => {
      const arr = ['test'];
      expect(ensureStringArray(arr)).toBe(arr);
    });

    test('splits comma-separated strings', () => {
      expect(ensureStringArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(ensureStringArray('comp1,comp2')).toEqual(['comp1', 'comp2']);
      expect(ensureStringArray('single,double,triple')).toEqual(['single', 'double', 'triple']);
    });

    test('handles strings with no commas', () => {
      expect(ensureStringArray('nocommas')).toEqual(['nocommas']);
      expect(ensureStringArray('single-value')).toEqual(['single-value']);
    });
  });
});
