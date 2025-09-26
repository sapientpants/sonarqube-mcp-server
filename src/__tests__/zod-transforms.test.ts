import { describe, it, expect } from 'vitest';
import { z } from 'zod';
describe('Zod Schema Transformations', () => {
  describe('Page and PageSize Transformations', () => {
    it('should transform page parameter from string to number', () => {
      const pageSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('invalid')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
      expect(pageSchema.parse('')).toBe(null);
    });
    it('should transform page_size parameter from string to number', () => {
      const pageSizeSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      expect(pageSizeSchema.parse('20')).toBe(20);
      expect(pageSizeSchema.parse('invalid')).toBe(null);
      expect(pageSizeSchema.parse(undefined)).toBe(null);
      expect(pageSizeSchema.parse('')).toBe(null);
    });
  });
  describe('Boolean Parameter Transformations', () => {
    it('should transform resolved parameter from string to boolean', () => {
      const resolvedSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      expect(resolvedSchema.parse('true')).toBe(true);
      expect(resolvedSchema.parse('false')).toBe(false);
      expect(resolvedSchema.parse(true)).toBe(true);
      expect(resolvedSchema.parse(false)).toBe(false);
      expect(resolvedSchema.parse(null)).toBe(null);
      expect(resolvedSchema.parse(undefined)).toBe(undefined);
    });
    it('should transform on_component_only parameter from string to boolean', () => {
      const onComponentOnlySchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      expect(onComponentOnlySchema.parse('true')).toBe(true);
      expect(onComponentOnlySchema.parse('false')).toBe(false);
      expect(onComponentOnlySchema.parse(true)).toBe(true);
      expect(onComponentOnlySchema.parse(false)).toBe(false);
      expect(onComponentOnlySchema.parse(null)).toBe(null);
      expect(onComponentOnlySchema.parse(undefined)).toBe(undefined);
    });
    it('should transform since_leak_period parameter from string to boolean', () => {
      const sinceLeakPeriodSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      expect(sinceLeakPeriodSchema.parse('true')).toBe(true);
      expect(sinceLeakPeriodSchema.parse('false')).toBe(false);
      expect(sinceLeakPeriodSchema.parse(true)).toBe(true);
      expect(sinceLeakPeriodSchema.parse(false)).toBe(false);
      expect(sinceLeakPeriodSchema.parse(null)).toBe(null);
      expect(sinceLeakPeriodSchema.parse(undefined)).toBe(undefined);
    });
    it('should transform in_new_code_period parameter from string to boolean', () => {
      const inNewCodePeriodSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      expect(inNewCodePeriodSchema.parse('true')).toBe(true);
      expect(inNewCodePeriodSchema.parse('false')).toBe(false);
      expect(inNewCodePeriodSchema.parse(true)).toBe(true);
      expect(inNewCodePeriodSchema.parse(false)).toBe(false);
      expect(inNewCodePeriodSchema.parse(null)).toBe(null);
      expect(inNewCodePeriodSchema.parse(undefined)).toBe(undefined);
    });
  });
  describe('Enum Parameter Transformations', () => {
    it('should validate severity enum values', () => {
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
    it('should validate statuses enum values', () => {
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
      expect(statusSchema.parse(['REOPENED', 'RESOLVED'])).toEqual(['REOPENED', 'RESOLVED']);
      expect(statusSchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
    });
    it('should validate resolutions enum values', () => {
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();
      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
      ]);
      expect(resolutionSchema.parse(['FIXED', 'REMOVED'])).toEqual(['FIXED', 'REMOVED']);
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });
    it('should validate types enum values', () => {
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();
      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      expect(typeSchema.parse(['VULNERABILITY', 'SECURITY_HOTSPOT'])).toEqual([
        'VULNERABILITY',
        'SECURITY_HOTSPOT',
      ]);
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });
  });
  describe('Array Parameter Transformations', () => {
    it('should validate array of strings', () => {
      const stringArraySchema = z.array(z.string()).nullable().optional();
      expect(stringArraySchema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(stringArraySchema.parse([])).toEqual([]);
      expect(stringArraySchema.parse(null)).toBe(null);
      expect(stringArraySchema.parse(undefined)).toBe(undefined);
    });
  });
});
