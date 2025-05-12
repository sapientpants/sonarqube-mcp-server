/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Parameter Transformations', () => {
  describe('Page and PageSize Transformations', () => {
    it('should transform valid and invalid page values', () => {
      // Create schema that matches what's used in index.ts for page transformation
      const pageSchema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      // Test with valid number strings
      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('20')).toBe(20);

      // In the actual implementation, '0' returns 0 or null depending on the parseInt result
      // Our implementation here returns null for '0' since parseInt('0', 10) is 0, which is falsy
      expect(pageSchema.parse('0')).toBe(null);

      // Test with invalid number strings - should return null
      expect(pageSchema.parse('invalid')).toBe(null);
      expect(pageSchema.parse('abc123')).toBe(null);
      expect(pageSchema.parse('true')).toBe(null);

      // Test with empty/undefined values - should return null
      expect(pageSchema.parse(undefined)).toBe(null);
      expect(pageSchema.parse('')).toBe(null);
    });
  });

  describe('Boolean Transformations', () => {
    it('should transform boolean string values', () => {
      // Create schema that matches what's used in index.ts for boolean transformation
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      // Test with string values
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);
      expect(booleanSchema.parse('anything-else')).toBe(false);

      // Test with actual boolean values
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);

      // Test with null/undefined values
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
  });

  describe('Status Schema', () => {
    it('should validate correct status values', () => {
      // Create schema that matches what's used in index.ts for status validation
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

      // Test with valid status arrays
      expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
      expect(statusSchema.parse(['RESOLVED', 'CLOSED'])).toEqual(['RESOLVED', 'CLOSED']);
      expect(statusSchema.parse(['TO_REVIEW', 'IN_REVIEW', 'REVIEWED'])).toEqual([
        'TO_REVIEW',
        'IN_REVIEW',
        'REVIEWED',
      ]);

      // Test with null/undefined values
      expect(statusSchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);

      // Should throw on invalid values
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
      expect(() => statusSchema.parse(['open'])).toThrow(); // case sensitive
    });
  });

  describe('Resolution Schema', () => {
    it('should validate correct resolution values', () => {
      // Create schema that matches what's used in index.ts for resolution validation
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();

      // Test with valid resolution arrays
      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
      ]);
      expect(resolutionSchema.parse(['FIXED', 'REMOVED'])).toEqual(['FIXED', 'REMOVED']);

      // Test with null/undefined values
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);

      // Should throw on invalid values
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });
  });

  describe('Type Schema', () => {
    it('should validate correct type values', () => {
      // Create schema that matches what's used in index.ts for type validation
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();

      // Test with valid type arrays
      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      expect(typeSchema.parse(['VULNERABILITY', 'SECURITY_HOTSPOT'])).toEqual([
        'VULNERABILITY',
        'SECURITY_HOTSPOT',
      ]);

      // Test with null/undefined values
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);

      // Should throw on invalid values
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });
  });

  describe('Severity Schema', () => {
    it('should validate correct severity values', () => {
      // Create schema that matches what's used in index.ts for severity validation
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();

      // Test with valid severities
      expect(severitySchema.parse('INFO')).toBe('INFO');
      expect(severitySchema.parse('MINOR')).toBe('MINOR');
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');

      // Test with null/undefined values
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);

      // Should throw on invalid values
      expect(() => severitySchema.parse('INVALID')).toThrow();
      expect(() => severitySchema.parse('minor')).toThrow(); // case sensitive
    });
  });
});
