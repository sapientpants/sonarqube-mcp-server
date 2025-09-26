import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { nullToUndefined } from '../index.js';
describe('Schema Transformations', () => {
  describe('nullToUndefined function', () => {
    it('should convert null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });
    it('should keep undefined as undefined', () => {
      expect(nullToUndefined(undefined)).toBeUndefined();
    });
    it('should pass through non-null values', () => {
      expect(nullToUndefined('test')).toBe('test');
      expect(nullToUndefined(42)).toBe(42);
      expect(nullToUndefined(true)).toBe(true);
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
      const obj = { test: 'value' };
      expect(nullToUndefined(obj)).toBe(obj);
      const arr = [1, 2, 3];
      expect(nullToUndefined(arr)).toBe(arr);
    });
  });
  describe('Common Zod Schemas', () => {
    it('should transform page parameters correctly', () => {
      const pageSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Valid numbers
      expect(pageSchema.parse('1')).toBe(1);
      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('100')).toBe(100);
      // Invalid or empty values
      expect(pageSchema.parse('abc')).toBe(null);
      expect(pageSchema.parse('')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
    });
    it('should transform page_size parameters correctly', () => {
      const pageSizeSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Valid numbers
      expect(pageSizeSchema.parse('10')).toBe(10);
      expect(pageSizeSchema.parse('50')).toBe(50);
      expect(pageSizeSchema.parse('100')).toBe(100);
      // Invalid or empty values
      expect(pageSizeSchema.parse('abc')).toBe(null);
      expect(pageSizeSchema.parse('')).toBe(null);
      expect(pageSizeSchema.parse(undefined)).toBe(null);
    });
    it('should validate severity values correctly', () => {
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();
      // Valid severities
      expect(severitySchema.parse('INFO')).toBe('INFO');
      expect(severitySchema.parse('MINOR')).toBe('MINOR');
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');
      // Null/undefined
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);
      // Invalid
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });
    it('should validate status values correctly', () => {
      const statusSchema = z
        .array(
          z.enum([
            'OPEN',
            'CONFIRMED',
            'REOPENED',
            'RESOLVED',
            'CLOSED',
            'TO_REVIEW',
            'IN_REVIEW',
            'REVIEWED',
          ])
        )
        .nullable()
        .optional();
      // Valid statuses
      expect(statusSchema.parse(['OPEN'])).toEqual(['OPEN']);
      expect(statusSchema.parse(['CONFIRMED', 'REOPENED'])).toEqual(['CONFIRMED', 'REOPENED']);
      expect(statusSchema.parse(['RESOLVED', 'CLOSED'])).toEqual(['RESOLVED', 'CLOSED']);
      expect(statusSchema.parse(['TO_REVIEW', 'IN_REVIEW', 'REVIEWED'])).toEqual([
        'TO_REVIEW',
        'IN_REVIEW',
        'REVIEWED',
      ]);
      // Null/undefined
      expect(statusSchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);
      // Invalid
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
      expect(() => statusSchema.parse(['open'])).toThrow(); // case sensitivity
    });
    it('should validate resolution values correctly', () => {
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();
      // Valid resolutions
      expect(resolutionSchema.parse(['FALSE-POSITIVE'])).toEqual(['FALSE-POSITIVE']);
      expect(resolutionSchema.parse(['WONTFIX', 'FIXED'])).toEqual(['WONTFIX', 'FIXED']);
      expect(resolutionSchema.parse(['REMOVED'])).toEqual(['REMOVED']);
      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
        'FIXED',
        'REMOVED',
      ]);
      // Null/undefined
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);
      // Invalid
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });
    it('should validate type values correctly', () => {
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();
      // Valid types
      expect(typeSchema.parse(['CODE_SMELL'])).toEqual(['CODE_SMELL']);
      expect(typeSchema.parse(['BUG', 'VULNERABILITY'])).toEqual(['BUG', 'VULNERABILITY']);
      expect(typeSchema.parse(['SECURITY_HOTSPOT'])).toEqual(['SECURITY_HOTSPOT']);
      expect(typeSchema.parse(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT'])).toEqual([
        'CODE_SMELL',
        'BUG',
        'VULNERABILITY',
        'SECURITY_HOTSPOT',
      ]);
      // Null/undefined
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);
      // Invalid
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });
    it('should transform boolean values correctly', () => {
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // String values
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);
      // Boolean values
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);
      // Null/undefined
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
    it('should validate string arrays correctly', () => {
      const stringArraySchema = z.array(z.string()).nullable().optional();
      // Valid arrays
      expect(stringArraySchema.parse(['test'])).toEqual(['test']);
      expect(stringArraySchema.parse(['one', 'two', 'three'])).toEqual(['one', 'two', 'three']);
      expect(stringArraySchema.parse([])).toEqual([]);
      // Null/undefined
      expect(stringArraySchema.parse(null)).toBe(null);
      expect(stringArraySchema.parse(undefined)).toBe(undefined);
      // Invalid
      expect(() => stringArraySchema.parse('not-an-array')).toThrow();
      expect(() => stringArraySchema.parse([1, 2, 3])).toThrow();
    });
    it('should validate and transform string or array unions', () => {
      const unionSchema = z.union([z.string(), z.array(z.string())]);
      // Single string
      expect(unionSchema.parse('test')).toBe('test');
      // String array
      expect(unionSchema.parse(['one', 'two'])).toEqual(['one', 'two']);
      // Invalid
      expect(() => unionSchema.parse(123)).toThrow();
      expect(() => unionSchema.parse([1, 2, 3])).toThrow();
    });
  });
});
