/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Tool Registration Schema Transforms', () => {
  describe('Pagination parameters', () => {
    it('should transform page string to number or null', () => {
      const pageSchema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('invalid')).toBe(null);
      expect(pageSchema.parse('')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
    });
  });

  describe('Boolean parameters', () => {
    it('should transform string to boolean', () => {
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
  });

  describe('Array union with string', () => {
    it('should handle both string and array inputs', () => {
      const schema = z.union([z.string(), z.array(z.string())]);

      // Test with string input
      expect(schema.parse('test')).toBe('test');

      // Test with array input
      expect(schema.parse(['test1', 'test2'])).toEqual(['test1', 'test2']);
    });
  });

  describe('Union schemas for tool parameters', () => {
    it('should validate both array and string metrics parameters', () => {
      // Similar to how the metrics_keys parameter is defined
      const metricsSchema = z.union([z.string(), z.array(z.string())]);

      expect(metricsSchema.parse('coverage')).toBe('coverage');
      expect(metricsSchema.parse(['coverage', 'bugs'])).toEqual(['coverage', 'bugs']);
    });

    it('should validate both array and string component keys parameters', () => {
      // Similar to how the component_keys parameter is defined
      const componentKeysSchema = z.union([z.string(), z.array(z.string())]);

      expect(componentKeysSchema.parse('component1')).toBe('component1');
      expect(componentKeysSchema.parse(['component1', 'component2'])).toEqual(['component1', 'component2']);
    });
  });

  describe('Enumeration schemas', () => {
    it('should validate severity enum value', () => {
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();

      expect(severitySchema.parse('INFO')).toBe('INFO');
      expect(severitySchema.parse('MINOR')).toBe('MINOR');
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });

    it('should validate status array enum values', () => {
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

      expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
      expect(statusSchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
    });

    it('should validate resolution array enum values', () => {
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();

      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual(['FALSE-POSITIVE', 'WONTFIX']);
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });

    it('should validate type array enum values', () => {
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();

      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });
  });

  describe('Complete registration schema', () => {
    it('should validate and transform a complete issues tool schema', () => {
      // Create schemas similar to what's in the tool registration
      const pageSchema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();

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

      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();

      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();

      const stringArraySchema = z.array(z.string()).nullable().optional();

      // Create the complete schema
      const schema = z.object({
        project_key: z.string(),
        severity: severitySchema,
        page: pageSchema,
        page_size: pageSchema,
        statuses: statusSchema,
        resolutions: resolutionSchema,
        resolved: booleanSchema,
        types: typeSchema,
        rules: stringArraySchema,
        tags: stringArraySchema,
      });

      // Test with valid data
      const validData = {
        project_key: 'test-project',
        severity: 'MAJOR',
        page: '10',
        page_size: '20',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
        resolved: 'true',
        types: ['CODE_SMELL', 'BUG'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
      };

      const result = schema.parse(validData);

      // Check that transformations worked correctly
      expect(result.project_key).toBe('test-project');
      expect(result.severity).toBe('MAJOR');
      expect(result.page).toBe(10); // Transformed from string to number
      expect(result.page_size).toBe(20); // Transformed from string to number
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result.resolutions).toEqual(['FALSE-POSITIVE', 'WONTFIX']);
      expect(result.resolved).toBe(true); // Transformed from string to boolean
      expect(result.types).toEqual(['CODE_SMELL', 'BUG']);
      expect(result.rules).toEqual(['rule1', 'rule2']);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });
});