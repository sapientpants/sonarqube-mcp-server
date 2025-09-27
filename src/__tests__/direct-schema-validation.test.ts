import { describe, it, expect } from 'vitest';
import { z } from 'zod';
describe('Schema Validation by Direct Testing', () => {
  // Test specific schema transformation functions
  describe('Transformation Functions', () => {
    it('should transform string numbers to integers or null', () => {
      // Create a transformation function similar to the ones in index.ts
      const transformFn = (val?: string) => (val ? parseInt(val, 10) || null : null);
      // Valid number
      expect(transformFn('10')).toBe(10);
      // Empty string should return null
      expect(transformFn('')).toBe(null);
      // Invalid number should return null
      expect(transformFn('abc')).toBe(null);
      // Undefined should return null
      expect(transformFn(undefined)).toBe(null);
    });
    it('should transform string booleans to boolean values', () => {
      // Create a schema with boolean transformation
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test the transformation
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
    it('should validate enum values', () => {
      // Create a schema with enum validation
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();
      // Test the validation
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);
      // Invalid value should throw
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });
  });
  // Test complex schema objects
  describe('Complex Schema Objects', () => {
    it('should validate issues schema parameters', () => {
      // Create a schema similar to issues schema in index.ts
      const statusEnumSchema = z.enum([
        'OPEN',
        'CONFIRMED',
        'REOPENED',
        'RESOLVED',
        'CLOSED',
        'TO_REVIEW',
        'IN_REVIEW',
        'REVIEWED',
      ]);
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
        created_after: z.string().nullable().optional(),
        created_before: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        created_in_last: z.string().nullable().optional(),
        assignees: z.array(z.string()).nullable().optional(),
        authors: z.array(z.string()).nullable().optional(),
        cwe: z.array(z.string()).nullable().optional(),
        languages: z.array(z.string()).nullable().optional(),
        owasp_top10: z.array(z.string()).nullable().optional(),
        sans_top25: z.array(z.string()).nullable().optional(),
        sonarsource_security: z.array(z.string()).nullable().optional(),
        on_component_only: z
          .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
          .nullable()
          .optional(),
        facets: z.array(z.string()).nullable().optional(),
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
      const result = issuesSchema.parse({
        project_key: 'test-project',
        severity: 'MAJOR',
        page: '2',
        page_size: '10',
        statuses: ['OPEN', 'CONFIRMED'],
        resolved: 'true',
        types: ['BUG', 'VULNERABILITY'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2023-01-01',
        on_component_only: 'true',
        since_leak_period: 'true',
        in_new_code_period: 'true',
      });
      // Check the transformations
      expect(result.project_key).toBe('test-project');
      expect(result.severity).toBe('MAJOR');
      expect(result.page).toBe(2);
      expect(result.page_size).toBe(10);
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result.resolved).toBe(true);
      expect(result.types).toEqual(['BUG', 'VULNERABILITY']);
      expect(result.on_component_only).toBe(true);
      expect(result.since_leak_period).toBe(true);
      expect(result.in_new_code_period).toBe(true);
    });
    it('should validate component measures schema parameters', () => {
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
      const result = measuresComponentSchema.parse({
        component: 'test-component',
        metric_keys: ['complexity', 'coverage'],
        branch: 'main',
        additional_fields: ['metrics'],
        page: '2',
        page_size: '20',
      });
      // Check the transformations
      expect(result.component).toBe('test-component');
      expect(result.metric_keys).toEqual(['complexity', 'coverage']);
      expect(result.branch).toBe('main');
      expect(result.page).toBe(2);
      expect(result.page_size).toBe(20);
      // Test with invalid page values
      const result2 = measuresComponentSchema.parse({
        component: 'test-component',
        metric_keys: ['complexity', 'coverage'],
        page: 'invalid',
        page_size: 'invalid',
      });
      expect(result2.page).toBe(null);
      expect(result2.page_size).toBe(null);
    });
    it('should validate components measures schema parameters', () => {
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
      const result = measuresComponentsSchema.parse({
        component_keys: ['comp-1', 'comp-2'],
        metric_keys: ['complexity', 'coverage'],
        branch: 'main',
        page: '2',
        page_size: '20',
      });
      // Check the transformations
      expect(result.component_keys).toEqual(['comp-1', 'comp-2']);
      expect(result.metric_keys).toEqual(['complexity', 'coverage']);
      expect(result.page).toBe(2);
      expect(result.page_size).toBe(20);
    });
    it('should validate measures history schema parameters', () => {
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
      const result = measuresHistorySchema.parse({
        component: 'test-component',
        metrics: ['complexity', 'coverage'],
        from: '2023-01-01',
        to: '2023-12-31',
        page: '3',
        page_size: '15',
      });
      // Check the transformations
      expect(result.component).toBe('test-component');
      expect(result.metrics).toEqual(['complexity', 'coverage']);
      expect(result.from).toBe('2023-01-01');
      expect(result.to).toBe('2023-12-31');
      expect(result.page).toBe(3);
      expect(result.page_size).toBe(15);
    });
  });
});
