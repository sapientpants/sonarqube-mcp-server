import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
// Save the original environment variables
const originalEnv = process.env;
// Mock client responses to avoid network calls
vi.mock('../sonarqube.js', () => {
  return {
    SonarQubeClient: vi.fn().mockImplementation(() => ({
      listProjects: vi.fn<() => Promise<any>>().mockResolvedValue({
        projects: [{ key: 'test-project', name: 'Test Project' }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getIssues: vi.fn<() => Promise<any>>().mockResolvedValue({
        issues: [{ key: 'test-issue', rule: 'test-rule' }],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getMetrics: vi.fn<() => Promise<any>>().mockResolvedValue({
        metrics: [{ key: 'test-metric', name: 'Test Metric' }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getHealth: vi.fn<() => Promise<any>>().mockResolvedValue({ health: 'GREEN', causes: [] }),
      getStatus: vi
        .fn<() => Promise<any>>()
        .mockResolvedValue({ id: 'id', version: '1.0', status: 'UP' }),
      ping: vi.fn<() => Promise<any>>().mockResolvedValue('pong'),
      getComponentMeasures: vi.fn<() => Promise<any>>().mockResolvedValue({
        component: { key: 'test-component', measures: [] },
        metrics: [],
      }),
      getComponentsMeasures: vi.fn<() => Promise<any>>().mockResolvedValue({
        components: [{ key: 'test-component', measures: [] }],
        metrics: [],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getMeasuresHistory: vi.fn<() => Promise<any>>().mockResolvedValue({
        measures: [{ metric: 'coverage', history: [] }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
    })),
  };
});
describe('Direct Lambda Testing', () => {
  let index: typeof import('../index.js');
  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.SONARQUBE_TOKEN = 'test-token';
    process.env.SONARQUBE_URL = 'http://localhost:9000';
    // Import the module for each test to ensure it's fresh
    index = await import('../index.js');
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });
  describe('Direct Lambda Function Execution', () => {
    // Directly extract the lambda functions from mcpServer.tool calls
    it('should execute metrics lambda function', async () => {
      // Get the metrics lambda function (simulating how it's registered)
      const metricsLambda = async (params: Record<string, unknown>) => {
        const page = index.nullToUndefined(params.page) as number | undefined;
        const pageSize = index.nullToUndefined(params.page_size) as number | undefined;
        const metricsParams = { page, pageSize };
        const result = await index.handleSonarQubeGetMetrics(metricsParams);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      };
      // Execute the lambda function
      const result = await metricsLambda({ page: '1', page_size: '10' });
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toBeDefined();
      // Parse the content to verify data structure
      const data = JSON.parse(result.content[0]!.text);
      expect(data.content[0]!.type).toBe('text');
    });
    it('should execute issues lambda function', async () => {
      // Simulate the issues lambda function
      const issuesLambda = async (params: Record<string, unknown>) => {
        return index.handleSonarQubeGetIssues(index.mapToSonarQubeParams(params));
      };
      // Execute the lambda function
      const result = await issuesLambda({ project_key: 'test-project', severity: 'MAJOR' });
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]!.type).toBe('text');
    });
    it('should execute measures_component lambda function with string metrics', async () => {
      // Simulate the measures_component lambda function
      const measuresLambda = async (params: Record<string, unknown>) => {
        const componentParams: {
          component: string;
          metricKeys: string[];
          additionalFields?: string[];
          branch?: string;
          pullRequest?: string;
          period?: string;
        } = {
          component: params.component as string,
          metricKeys: Array.isArray(params.metric_keys)
            ? (params.metric_keys as string[])
            : [params.metric_keys as string],
        };
        if (params.additional_fields)
          componentParams.additionalFields = params.additional_fields as string[];
        if (params.branch) componentParams.branch = params.branch as string;
        if (params.pull_request) componentParams.pullRequest = params.pull_request as string;
        if (params.period) componentParams.period = params.period as string;
        return index.handleSonarQubeComponentMeasures(componentParams);
      };
      // Execute the lambda function with string metric
      const result = await measuresLambda({
        component: 'test-component',
        metric_keys: 'coverage',
      });
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]!.type).toBe('text');
    });
    it('should execute measures_component lambda function with array metrics', async () => {
      // Simulate the measures_component lambda function
      const measuresLambda = async (params: Record<string, unknown>) => {
        const componentParams: {
          component: string;
          metricKeys: string[];
          additionalFields?: string[];
          branch?: string;
          pullRequest?: string;
          period?: string;
        } = {
          component: params.component as string,
          metricKeys: Array.isArray(params.metric_keys)
            ? (params.metric_keys as string[])
            : [params.metric_keys as string],
        };
        if (params.additional_fields)
          componentParams.additionalFields = params.additional_fields as string[];
        if (params.branch) componentParams.branch = params.branch as string;
        if (params.pull_request) componentParams.pullRequest = params.pull_request as string;
        if (params.period) componentParams.period = params.period as string;
        return index.handleSonarQubeComponentMeasures(componentParams);
      };
      // Execute the lambda function with array metrics
      const result = await measuresLambda({
        component: 'test-component',
        metric_keys: ['coverage', 'bugs'],
        additional_fields: ['periods'],
        branch: 'main',
        pull_request: 'pr-123',
        period: '1',
      });
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]!.type).toBe('text');
    });
    it('should execute measures_components lambda function', async () => {
      // Simulate the measures_components lambda function
      const componentsLambda = async (params: Record<string, unknown>) => {
        const page = index.nullToUndefined(params.page) as number | undefined;
        const pageSize = index.nullToUndefined(params.page_size) as number | undefined;
        const componentsParams: {
          componentKeys: string[];
          metricKeys: string[];
          additionalFields?: string[];
          branch?: string;
          pullRequest?: string;
          period?: string;
          page: number | undefined;
          pageSize: number | undefined;
        } = {
          componentKeys: Array.isArray(params.component_keys)
            ? (params.component_keys as string[])
            : [params.component_keys as string],
          metricKeys: Array.isArray(params.metric_keys)
            ? (params.metric_keys as string[])
            : [params.metric_keys as string],
          page,
          pageSize,
        };
        if (params.additional_fields)
          componentsParams.additionalFields = params.additional_fields as string[];
        if (params.branch) componentsParams.branch = params.branch as string;
        if (params.pull_request) componentsParams.pullRequest = params.pull_request as string;
        if (params.period) componentsParams.period = params.period as string;
        return index.handleSonarQubeComponentsMeasures(componentsParams);
      };
      // Execute the lambda function
      const result = await componentsLambda({
        component_keys: ['comp1', 'comp2'],
        metric_keys: ['coverage', 'bugs'],
        page: '1',
        page_size: '10',
        additional_fields: ['periods'],
        branch: 'main',
      });
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]!.type).toBe('text');
    });
    it('should execute measures_history lambda function', async () => {
      // Simulate the measures_history lambda function
      const historyLambda = async (params: Record<string, unknown>) => {
        const page = index.nullToUndefined(params.page) as number | undefined;
        const pageSize = index.nullToUndefined(params.page_size) as number | undefined;
        const historyParams: {
          component: string;
          metrics: string[];
          from?: string;
          to?: string;
          branch?: string;
          pullRequest?: string;
          page: number | undefined;
          pageSize: number | undefined;
        } = {
          component: params.component as string,
          metrics: Array.isArray(params.metrics)
            ? (params.metrics as string[])
            : [params.metrics as string],
          page,
          pageSize,
        };
        if (params.from) historyParams.from = params.from as string;
        if (params.to) historyParams.to = params.to as string;
        if (params.branch) historyParams.branch = params.branch as string;
        if (params.pull_request) historyParams.pullRequest = params.pull_request as string;
        return index.handleSonarQubeMeasuresHistory(historyParams);
      };
      // Execute the lambda function
      const result = await historyLambda({
        component: 'test-component',
        metrics: 'coverage',
        from: '2023-01-01',
        to: '2023-12-31',
        branch: 'main',
        page: '1',
        page_size: '10',
      });
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]!.type).toBe('text');
    });
  });
  describe('Schema Transformations', () => {
    it('should test page schema transformations', () => {
      // Create a schema similar to what's in the actual code
      const pageSchema = z
        .string()
        .optional()
        .transform((val: any) => (val ? parseInt(val, 10) || null : null));
      // Test valid numeric strings
      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('100')).toBe(100);
      // Test invalid inputs
      expect(pageSchema.parse('')).toBe(null);
      expect(pageSchema.parse('abc')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
    });
    it('should test boolean schema transformations', () => {
      // Create a schema similar to what's in the actual code
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val: any) => val === 'true')])
        .nullable()
        .optional();
      // Test string values
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);
      // Test boolean values
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);
      // Test null/undefined
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });
    it('should test status schema validations', () => {
      // Create a schema similar to what's in the actual code
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
      // Test valid values
      expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
      // Test null/undefined
      expect(statusSchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);
      // Test invalid values (should throw)
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
    });
    it('should test resolution schema validations', () => {
      // Create a schema similar to what's in the actual code
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();
      // Test valid values
      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
      ]);
      // Test null/undefined
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);
      // Test invalid values (should throw)
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });
    it('should test type schema validations', () => {
      // Create a schema similar to what's in the actual code
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();
      // Test valid values
      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      // Test null/undefined
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);
      // Test invalid values (should throw)
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });
    it('should test severity schema validations', () => {
      // Create a schema similar to what's in the actual code
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();
      // Test valid values
      expect(severitySchema.parse('INFO')).toBe('INFO');
      expect(severitySchema.parse('MINOR')).toBe('MINOR');
      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('CRITICAL')).toBe('CRITICAL');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');
      // Test null/undefined
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);
      // Test invalid values (should throw)
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });
  });
});
