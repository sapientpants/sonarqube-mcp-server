import { describe, it, expect } from 'vitest';
import { z } from 'zod';
// Our focus is on testing the schema transformation functions that are used in index.ts
describe('Zod Schema Transformation Tests', () => {
  describe('String to Number Transformations', () => {
    it('should transform valid string numbers to integers', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Test with a valid number string
      expect(schema.parse('10')).toBe(10);
    });
    it('should transform invalid string numbers to null', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Test with an invalid number string
      expect(schema.parse('abc')).toBe(null);
    });
    it('should transform empty string to null', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Test with an empty string
      expect(schema.parse('')).toBe(null);
    });
    it('should transform undefined to null', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Test with undefined
      expect(schema.parse(undefined)).toBe(null);
    });
  });
  describe('String to Boolean Transformations', () => {
    it('should transform "true" string to true boolean', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test with "true" string
      expect(schema.parse('true')).toBe(true);
    });
    it('should transform "false" string to false boolean', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test with "false" string
      expect(schema.parse('false')).toBe(false);
    });
    it('should pass through true boolean', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test with true boolean
      expect(schema.parse(true)).toBe(true);
    });
    it('should pass through false boolean', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test with false boolean
      expect(schema.parse(false)).toBe(false);
    });
    it('should pass through null', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test with null
      expect(schema.parse(null)).toBe(null);
    });
    it('should pass through undefined', () => {
      // This is the exact transformation used in index.ts
      const schema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test with undefined
      expect(schema.parse(undefined)).toBe(undefined);
    });
  });
  describe('Complex Schema Combinations', () => {
    it('should transform string parameters in a complex schema', () => {
      // Create a schema similar to the ones in index.ts
      const statusEnumSchema = z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED']);
      const statusSchema = z.array(statusEnumSchema).nullable().optional();
      const resolutionEnumSchema = z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']);
      const resolutionSchema = z.array(resolutionEnumSchema).nullable().optional();
      const typeEnumSchema = z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']);
      const typeSchema = z.array(typeEnumSchema).nullable().optional();
      const issuesSchema = z.object({
        project_key: z.string(),
        severity: z.enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER']).nullable().optional(),
        page: z
          .string()
          .optional()
          .transform((val: any) => (val ? parseInt(val, 10) || null : null)),
        page_size: z
          .string()
          .optional()
          .transform((val: any) => (val ? parseInt(val, 10) || null : null)),
        statuses: statusSchema,
        resolutions: resolutionSchema,
        resolved: z
          .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
          .nullable()
          .optional(),
        types: typeSchema,
        rules: z.array(z.string()).nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        on_component_only: z
          .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
          .nullable()
          .optional(),
        since_leak_period: z
          .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
          .nullable()
          .optional(),
        in_new_code_period: z
          .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
          .nullable()
          .optional(),
      });
      // Test with various parameter types
      const parsedParams = issuesSchema.parse({
        project_key: 'test-project',
        severity: 'MAJOR',
        page: '2',
        page_size: '10',
        statuses: ['OPEN', 'CONFIRMED'],
        resolved: 'true',
        types: ['BUG', 'VULNERABILITY'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        on_component_only: 'true',
        since_leak_period: 'true',
        in_new_code_period: 'true',
      });
      // Check all the transformations
      expect(parsedParams.project_key).toBe('test-project');
      expect(parsedParams.severity).toBe('MAJOR');
      expect(parsedParams.page).toBe(2);
      expect(parsedParams.page_size).toBe(10);
      expect(parsedParams.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(parsedParams.resolved).toBe(true);
      expect(parsedParams.types).toEqual(['BUG', 'VULNERABILITY']);
      expect(parsedParams.on_component_only).toBe(true);
      expect(parsedParams.since_leak_period).toBe(true);
      expect(parsedParams.in_new_code_period).toBe(true);
    });
    it('should transform component measures schema parameters', () => {
      // Create a schema similar to component measures schema in index.ts
      const measuresComponentSchema = z.object({
        component: z.string(),
        metric_keys: z.array(z.string()),
        branch: z.string().optional(),
        pull_request: z.string().optional(),
        additional_fields: z.array(z.string()).optional(),
        period: z.string().optional(),
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
      const parsedParams = measuresComponentSchema.parse({
        component: 'test-component',
        metric_keys: ['complexity', 'coverage'],
        branch: 'main',
        additional_fields: ['metrics'],
        page: '2',
        page_size: '20',
      });
      // Check the transformations
      expect(parsedParams.component).toBe('test-component');
      expect(parsedParams.metric_keys).toEqual(['complexity', 'coverage']);
      expect(parsedParams.branch).toBe('main');
      expect(parsedParams.page).toBe(2);
      expect(parsedParams.page_size).toBe(20);
      // Test with invalid page values
      const invalidParams = measuresComponentSchema.parse({
        component: 'test-component',
        metric_keys: ['complexity', 'coverage'],
        page: 'invalid',
        page_size: 'invalid',
      });
      expect(invalidParams.page).toBe(null);
      expect(invalidParams.page_size).toBe(null);
    });
    it('should transform components measures schema parameters', () => {
      // Create a schema similar to components measures schema in index.ts
      const measuresComponentsSchema = z.object({
        component_keys: z.array(z.string()),
        metric_keys: z.array(z.string()),
        branch: z.string().optional(),
        pull_request: z.string().optional(),
        additional_fields: z.array(z.string()).optional(),
        period: z.string().optional(),
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
      const parsedParams = measuresComponentsSchema.parse({
        component_keys: ['comp-1', 'comp-2'],
        metric_keys: ['complexity', 'coverage'],
        branch: 'main',
        page: '2',
        page_size: '20',
      });
      // Check the transformations
      expect(parsedParams.component_keys).toEqual(['comp-1', 'comp-2']);
      expect(parsedParams.metric_keys).toEqual(['complexity', 'coverage']);
      expect(parsedParams.page).toBe(2);
      expect(parsedParams.page_size).toBe(20);
    });
    it('should transform measures history schema parameters', () => {
      // Create a schema similar to measures history schema in index.ts
      const measuresHistorySchema = z.object({
        component: z.string(),
        metrics: z.array(z.string()),
        from: z.string().optional(),
        to: z.string().optional(),
        branch: z.string().optional(),
        pull_request: z.string().optional(),
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
      const parsedParams = measuresHistorySchema.parse({
        component: 'test-component',
        metrics: ['complexity', 'coverage'],
        from: '2023-01-01',
        to: '2023-12-31',
        page: '3',
        page_size: '15',
      });
      // Check the transformations
      expect(parsedParams.component).toBe('test-component');
      expect(parsedParams.metrics).toEqual(['complexity', 'coverage']);
      expect(parsedParams.from).toBe('2023-01-01');
      expect(parsedParams.to).toBe('2023-12-31');
      expect(parsedParams.page).toBe(3);
      expect(parsedParams.page_size).toBe(15);
    });
  });
});
