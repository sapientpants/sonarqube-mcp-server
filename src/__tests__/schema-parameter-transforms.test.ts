/**
 * @jest-environment node
 */

import { describe, it, expect, jest } from '@jest/globals';
import { z } from 'zod';
import * as indexModule from '../index.js';
import { ISonarQubeClient } from '../sonarqube.js';

// Create a custom mock implementation of the handlers
const nullToUndefined = indexModule.nullToUndefined;

// Create a mock client
const mockClient: Partial<ISonarQubeClient> = {
  getMetrics: jest.fn().mockResolvedValue({
    metrics: [{ id: '1', key: 'test', name: 'Test Metric' }],
    paging: { pageIndex: 2, pageSize: 5, total: 10 },
  }),
  getIssues: jest.fn().mockResolvedValue({
    issues: [{ key: 'issue-1', rule: 'rule-1', severity: 'MAJOR' }],
    paging: { pageIndex: 1, pageSize: 10, total: 1 },
  }),
  getComponentMeasures: jest.fn().mockResolvedValue({
    component: { key: 'comp-1', measures: [{ metric: 'coverage', value: '75.0' }] },
    metrics: [{ key: 'coverage', name: 'Coverage' }],
  }),
  getComponentsMeasures: jest.fn().mockResolvedValue({
    components: [
      { key: 'comp-1', measures: [{ metric: 'coverage', value: '75.0' }] },
      { key: 'comp-2', measures: [{ metric: 'coverage', value: '85.0' }] },
    ],
    metrics: [{ key: 'coverage', name: 'Coverage' }],
    paging: { pageIndex: 1, pageSize: 10, total: 2 },
  }),
  getMeasuresHistory: jest.fn().mockResolvedValue({
    measures: [
      {
        metric: 'coverage',
        history: [
          { date: '2023-01-01', value: '70.0' },
          { date: '2023-02-01', value: '75.0' },
          { date: '2023-03-01', value: '80.0' },
        ],
      },
    ],
    paging: { pageIndex: 1, pageSize: 10, total: 1 },
  }),
};

// Mock handlers that don't actually call the HTTP methods
const mockMetricsHandler = async (params: { page: number | null; page_size: number | null }) => {
  const mockResult = await (mockClient as ISonarQubeClient).getMetrics({
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(mockResult, null, 2),
      },
    ],
  };
};

const mockIssuesHandler = async (params: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockResult = await (mockClient as ISonarQubeClient).getIssues(params as any);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(mockResult, null, 2),
      },
    ],
  };
};

const mockComponentMeasuresHandler = async (params: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockResult = await (mockClient as ISonarQubeClient).getComponentMeasures(params as any);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(mockResult, null, 2),
      },
    ],
  };
};

const mockComponentsMeasuresHandler = async (params: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockResult = await (mockClient as ISonarQubeClient).getComponentsMeasures(params as any);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(mockResult, null, 2),
      },
    ],
  };
};

const mockMeasuresHistoryHandler = async (params: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockResult = await (mockClient as ISonarQubeClient).getMeasuresHistory(params as any);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(mockResult, null, 2),
      },
    ],
  };
};

// Helper function to test string to number parameter transformations (not used directly)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function testNumberTransform(transformFn: (val: string | undefined) => number | null | undefined) {
  // Valid number
  expect(transformFn('10')).toBe(10);

  // Empty string should return null
  expect(transformFn('')).toBe(null);

  // Invalid number should return null
  expect(transformFn('abc')).toBe(null);

  // Undefined should return undefined
  expect(transformFn(undefined)).toBe(undefined);
}

describe('Schema Parameter Transformations', () => {
  describe('Number Transformations', () => {
    it('should transform string numbers to integers or null', () => {
      // Create a schema with number transformation
      const schema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      // Test the transformation
      expect(schema.parse('10')).toBe(10);
      expect(schema.parse('')).toBe(null);
      expect(schema.parse('abc')).toBe(null);
      expect(schema.parse(undefined)).toBe(null);
    });
  });

  describe('Boolean Transformations', () => {
    it('should transform string booleans to boolean values', () => {
      // Create a schema with boolean transformation
      const schema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      // Test the transformation
      expect(schema.parse('true')).toBe(true);
      expect(schema.parse('false')).toBe(false);
      expect(schema.parse(true)).toBe(true);
      expect(schema.parse(false)).toBe(false);
      expect(schema.parse(null)).toBe(null);
      expect(schema.parse(undefined)).toBe(undefined);
    });
  });

  describe('Parameter Transformations for Lambda Functions', () => {
    it('should handle nullToUndefined utility function', () => {
      expect(nullToUndefined(null)).toBeUndefined();
      expect(nullToUndefined(undefined)).toBeUndefined();
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined('')).toBe('');
      expect(nullToUndefined('test')).toBe('test');
      expect(nullToUndefined(10)).toBe(10);
      expect(nullToUndefined(false)).toBe(false);
      expect(nullToUndefined(true)).toBe(true);
    });

    it('should handle metrics handler with string parameters', async () => {
      const result = await mockMetricsHandler({ page: null, page_size: null });

      // Verify the result structure
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify the result content
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('metrics');
      expect(data.metrics[0]).toHaveProperty('key', 'test');
    });

    it('should handle issues with complex parameters', async () => {
      const result = await mockIssuesHandler({
        project_key: 'test-project',
        severity: 'MAJOR',
        page: '1',
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

      // Verify the result structure
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify the result content
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('issues');
      expect(data.issues[0]).toHaveProperty('key', 'issue-1');
    });

    it('should handle component measures with parameters', async () => {
      const result = await mockComponentMeasuresHandler({
        component: 'comp-1',
        metric_keys: ['coverage'],
        branch: 'main',
        period: '1',
        additional_fields: ['metrics'],
      });

      // Verify the result structure
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify the result content
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('component');
      expect(data.component).toHaveProperty('key', 'comp-1');
    });

    it('should handle components measures with parameters', async () => {
      const result = await mockComponentsMeasuresHandler({
        component_keys: ['comp-1', 'comp-2'],
        metric_keys: ['coverage'],
        branch: 'main',
        page: '1',
        page_size: '10',
        additional_fields: ['metrics'],
      });

      // Verify the result structure
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify the result content
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('components');
      expect(data.components).toHaveLength(2);
      expect(data.components[0]).toHaveProperty('key', 'comp-1');
    });

    it('should handle measures history with parameters', async () => {
      const result = await mockMeasuresHistoryHandler({
        component: 'comp-1',
        metrics: ['coverage'],
        from: '2023-01-01',
        to: '2023-03-01',
        page: '1',
        page_size: '10',
      });

      // Verify the result structure
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify the result content
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty('measures');
      expect(data.measures[0]).toHaveProperty('metric', 'coverage');
      expect(data.measures[0].history).toHaveLength(3);
    });
  });
});
