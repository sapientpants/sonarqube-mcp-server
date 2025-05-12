/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

// Since we can't easily mock the MCP server after it's already been created in index.js,
// we'll directly test the transformation functions used in the schemas

describe('Tool Schema Transformations', () => {
  describe('Page Parameter Transformation', () => {
    it('should properly transform page string values to numbers or null', () => {
      // Create a transform function matching what's in the code
      const transformPageValue = (val: string | null | undefined) => {
        return val ? parseInt(val, 10) || null : null;
      };

      // Test valid numeric strings
      expect(transformPageValue('1')).toBe(1);
      expect(transformPageValue('100')).toBe(100);

      // Test strings that parseInt can't fully convert
      expect(transformPageValue('123abc')).toBe(123); // Still parses first part
      expect(transformPageValue('abc123')).toBe(null); // Can't parse, returns null

      // Test non-numeric strings
      expect(transformPageValue('invalid')).toBe(null);
      expect(transformPageValue('null')).toBe(null);
      expect(transformPageValue('undefined')).toBe(null);

      // Test edge cases
      expect(transformPageValue('')).toBe(null);
      expect(transformPageValue(null)).toBe(null);
      expect(transformPageValue(undefined)).toBe(null);
    });
  });

  describe('Boolean Parameter Transformation', () => {
    it('should properly transform string values to booleans', () => {
      // Create a schema similar to what's in the code
      const booleanTransform = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      // Test string values
      expect(booleanTransform.parse('true')).toBe(true);
      expect(booleanTransform.parse('false')).toBe(false);
      expect(booleanTransform.parse('True')).toBe(false); // Case sensitive
      expect(booleanTransform.parse('1')).toBe(false);
      expect(booleanTransform.parse('0')).toBe(false);
      expect(booleanTransform.parse('yes')).toBe(false);
      expect(booleanTransform.parse('no')).toBe(false);

      // Test boolean values (pass through)
      expect(booleanTransform.parse(true)).toBe(true);
      expect(booleanTransform.parse(false)).toBe(false);

      // Test null/undefined handling
      expect(booleanTransform.parse(null)).toBe(null);
      expect(booleanTransform.parse(undefined)).toBe(undefined);
    });
  });

  describe('String Array Parameter Validation', () => {
    it('should properly validate string arrays', () => {
      // Create a schema similar to what's in the code
      const stringArraySchema = z.array(z.string()).nullable().optional();

      // Test valid arrays
      expect(stringArraySchema.parse(['test1', 'test2'])).toEqual(['test1', 'test2']);
      expect(stringArraySchema.parse([''])).toEqual(['']);
      expect(stringArraySchema.parse([])).toEqual([]);

      // Test null/undefined handling
      expect(stringArraySchema.parse(null)).toBe(null);
      expect(stringArraySchema.parse(undefined)).toBe(undefined);
    });
  });

  describe('Enum Parameter Validation', () => {
    it('should properly validate status enum values', () => {
      // Create a schema similar to what's in the code
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

      // Test valid status arrays
      expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
      expect(statusSchema.parse(['RESOLVED'])).toEqual(['RESOLVED']);

      // Test null/undefined handling
      expect(statusSchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);

      // Test invalid values
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
      expect(() => statusSchema.parse(['open'])).toThrow(); // Case sensitive
    });

    it('should properly validate resolution enum values', () => {
      // Create a schema similar to what's in the code
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();

      // Test valid resolution arrays
      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
      ]);
      expect(resolutionSchema.parse(['FIXED', 'REMOVED'])).toEqual(['FIXED', 'REMOVED']);

      // Test null/undefined handling
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);

      // Test invalid values
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });

    it('should properly validate type enum values', () => {
      // Create a schema similar to what's in the code
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();

      // Test valid type arrays
      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      expect(typeSchema.parse(['VULNERABILITY', 'SECURITY_HOTSPOT'])).toEqual([
        'VULNERABILITY',
        'SECURITY_HOTSPOT',
      ]);

      // Test null/undefined handling
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);

      // Test invalid values
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });

    it('should properly validate severity enum value', () => {
      // Create a schema similar to what's in the code
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();

      // Test valid severities
      expect(severitySchema.parse('INFO')).toBe('INFO');
      expect(severitySchema.parse('MINOR')).toBe('MINOR');
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');

      // Test null/undefined handling
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);

      // Test invalid values
      expect(() => severitySchema.parse('INVALID')).toThrow();
      expect(() => severitySchema.parse('info')).toThrow(); // Case sensitive
    });
  });
});
