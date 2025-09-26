import { describe, it, expect } from 'vitest';
import { z } from 'zod';
describe('Tool Registration Schemas', () => {
  describe('Page Transformations', () => {
    // Test page and page_size transformations
    it('should transform string to number in page parameters', () => {
      // Define a schema similar to what's used in the MCP tool registrations
      const pageSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Valid number
      expect(pageSchema.parse('10')).toBe(10);
      // Invalid number should return null
      expect(pageSchema.parse('not-a-number')).toBe(null);
      // Empty string should return null
      expect(pageSchema.parse('')).toBe(null);
      // Undefined should return null
      expect(pageSchema.parse(undefined)).toBe(null);
    });
  });
  describe('Boolean Transformations', () => {
    // Test boolean transformations
    it('should transform string to boolean in boolean parameters', () => {
      // Define a schema similar to what's used in the MCP tool registrations
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // String 'true' should become boolean true
      expect(booleanSchema.parse('true')).toBe(true);
      // String 'false' should become boolean false
      expect(booleanSchema.parse('false')).toBe(false);
      // Boolean true should remain true
      expect(booleanSchema.parse(true)).toBe(true);
      // Boolean false should remain false
      expect(booleanSchema.parse(false)).toBe(false);
      // Null should remain null
      expect(booleanSchema.parse(null)).toBe(null);
      // Undefined should remain undefined
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
  });
  describe('Enumeration Validations', () => {
    // Test severity enum validations
    it('should validate severity enum values', () => {
      // Define a schema similar to what's used in the MCP tool registrations
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();
      // Valid values should pass through
      expect(severitySchema.parse('INFO')).toBe('INFO');
      expect(severitySchema.parse('MINOR')).toBe('MINOR');
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');
      // Null should remain null
      expect(severitySchema.parse(null)).toBe(null);
      // Undefined should remain undefined
      expect(severitySchema.parse(undefined)).toBe(undefined);
      // Invalid values should throw
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });
    // Test status enum array validations
    it('should validate status enum arrays', () => {
      // Define a schema similar to what's used in the MCP tool registrations
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
      // Valid array should pass through
      expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
      // Null should remain null
      expect(statusSchema.parse(null)).toBe(null);
      // Undefined should remain undefined
      expect(statusSchema.parse(undefined)).toBe(undefined);
      // Invalid values should throw
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
    });
    // Test complete projects tool schema
    it('should correctly parse and transform projects tool parameters', () => {
      // Define a schema similar to the projects tool schema
      const projectsSchema = z.object({
        page: z
          .string()
          .optional()
          .transform((val: any) => (val ? parseInt(val, 10) || null : null)),
        page_size: z
          .string()
          .optional()
          .transform((val: any) => (val ? parseInt(val, 10) || null : null)),
      });
      // Test with valid parameters
      const result = projectsSchema.parse({
        page: '2',
        page_size: '20',
      });
      expect(result.page).toBe(2);
      expect(result.page_size).toBe(20);
    });
    // Test complete issues tool schema
    it('should correctly parse and transform issues tool parameters', () => {
      // Define schemas similar to the issues tool schema
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();
      const pageSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      const stringArraySchema = z.array(z.string()).nullable().optional();
      // Create the schema
      const issuesSchema = z.object({
        project_key: z.string(),
        severity: severitySchema,
        page: pageSchema,
        page_size: pageSchema,
        resolved: booleanSchema,
        rules: stringArraySchema,
      });
      // Test with valid parameters
      const result = issuesSchema.parse({
        project_key: 'my-project',
        severity: 'MAJOR',
        page: '5',
        page_size: '25',
        resolved: 'true',
        rules: ['rule1', 'rule2'],
      });
      expect(result.project_key).toBe('my-project');
      expect(result.severity).toBe('MAJOR');
      expect(result.page).toBe(5);
      expect(result.page_size).toBe(25);
      expect(result.resolved).toBe(true);
      expect(result.rules).toEqual(['rule1', 'rule2']);
    });
    // Test union schema for component_keys and metric_keys
    it('should handle union schema for string or array inputs', () => {
      // Define a schema similar to the component_keys and metric_keys parameters
      const unionSchema = z.union([z.string(), z.array(z.string())]);
      // Test with string
      expect(unionSchema.parse('single-value')).toBe('single-value');
      // Test with array
      expect(unionSchema.parse(['value1', 'value2'])).toEqual(['value1', 'value2']);
    });
  });
});
