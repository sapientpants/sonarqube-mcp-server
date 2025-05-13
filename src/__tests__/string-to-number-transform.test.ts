/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { nullToUndefined, stringToNumberTransform } from '../index.js';

describe('String to Number Transform', () => {
  describe('nullToUndefined', () => {
    it('should transform null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('should not transform undefined', () => {
      expect(nullToUndefined(undefined)).toBeUndefined();
    });

    it('should not transform non-null values', () => {
      expect(nullToUndefined('test')).toBe('test');
      expect(nullToUndefined(123)).toBe(123);
      expect(nullToUndefined(true)).toBe(true);
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
    });
  });

  describe('stringToNumberTransform', () => {
    it('should transform valid string numbers to integers', () => {
      expect(stringToNumberTransform('123')).toBe(123);
      expect(stringToNumberTransform('0')).toBe(0);
      expect(stringToNumberTransform('-10')).toBe(-10);
    });

    it('should return null for invalid number strings', () => {
      expect(stringToNumberTransform('abc')).toBeNull();
      expect(stringToNumberTransform('')).toBeNull();
      expect(stringToNumberTransform('123abc')).toBe(123); // parseInt behavior
    });

    it('should pass through null and undefined values', () => {
      expect(stringToNumberTransform(null)).toBeNull();
      expect(stringToNumberTransform(undefined)).toBeUndefined();
    });
  });
});
