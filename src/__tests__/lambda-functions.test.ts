/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';

// Save original environment
const originalEnv = process.env;

// Set up environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';

// Mock the required modules
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      name: 'sonarqube-mcp-server',
      version: '1.1.0',
      tool: jest.fn(),
      connect: jest.fn(),
      server: { use: jest.fn() },
    })),
  };
});

jest.mock('../sonarqube.js', () => {
  return {
    SonarQubeClient: jest.fn().mockImplementation(() => ({
      listProjects: jest.fn().mockResolvedValue({
        projects: [{ key: 'test-project', name: 'Test Project' }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getIssues: jest.fn().mockResolvedValue({
        issues: [{ key: 'test-issue', rule: 'test-rule', severity: 'MAJOR' }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getMetrics: jest.fn().mockResolvedValue({
        metrics: [{ key: 'test-metric', name: 'Test Metric' }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getHealth: jest.fn().mockResolvedValue({ health: 'GREEN', causes: [] }),
      getStatus: jest.fn().mockResolvedValue({ id: 'test-id', version: '1.0.0', status: 'UP' }),
      ping: jest.fn().mockResolvedValue('pong'),
      getComponentMeasures: jest.fn().mockResolvedValue({
        component: { key: 'test-component', measures: [{ metric: 'coverage', value: '85.4' }] },
        metrics: [{ key: 'coverage', name: 'Coverage' }],
      }),
      getComponentsMeasures: jest.fn().mockResolvedValue({
        components: [{ key: 'test-component', measures: [{ metric: 'coverage', value: '85.4' }] }],
        metrics: [{ key: 'coverage', name: 'Coverage' }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getMeasuresHistory: jest.fn().mockResolvedValue({
        measures: [{ metric: 'coverage', history: [{ date: '2023-01-01', value: '85.4' }] }],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
    })),
  };
});

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('Lambda Functions in index.ts', () => {
  let mcpServer;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };

    const module = await import('../index.js');
    index = module;
    mcpServer = module.mcpServer;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Schema Transformations', () => {
    it('should test page schema transformation', () => {
      const pageSchema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('invalid')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
      expect(pageSchema.parse('')).toBe(null);
    });

    it('should test boolean schema transformation', () => {
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

    it('should test status schema', () => {
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

    it('should test resolution schema', () => {
      const resolutionSchema = z
        .array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED']))
        .nullable()
        .optional();

      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
      ]);
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
    });

    it('should test type schema', () => {
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

  describe('Tool Registration', () => {
    it('should verify tool registrations', () => {
      // Check that all tools are registered
      expect(mcpServer.tool).toHaveBeenCalledWith(
        'projects',
        'List all SonarQube projects',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'metrics',
        'Get available metrics from SonarQube',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'issues',
        'Get issues for a SonarQube project',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'system_health',
        'Get the health status of the SonarQube instance',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'system_status',
        'Get the status of the SonarQube instance',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'system_ping',
        'Ping the SonarQube instance to check if it is up',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'measures_component',
        'Get measures for a specific component',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'measures_components',
        'Get measures for multiple components',
        expect.any(Object),
        expect.any(Function)
      );

      expect(mcpServer.tool).toHaveBeenCalledWith(
        'measures_history',
        'Get measures history for a component',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should verify metrics tool schema and lambda', () => {
      // Find the metrics tool registration - 2nd argument position
      const metricsCall = mcpServer.tool.mock.calls.find((call) => call[0] === 'metrics');
      const metricsSchema = metricsCall[2];
      const metricsLambda = metricsCall[3];

      // Test schema transformations
      expect(metricsSchema.page.parse('10')).toBe(10);
      expect(metricsSchema.page.parse('abc')).toBe(null);
      expect(metricsSchema.page_size.parse('20')).toBe(20);

      // Test lambda function execution
      return metricsLambda({ page: '1', page_size: '10' }).then((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });

    it('should verify issues tool schema and lambda', () => {
      // Find the issues tool registration
      const issuesCall = mcpServer.tool.mock.calls.find((call) => call[0] === 'issues');
      const issuesSchema = issuesCall[2];
      const issuesLambda = issuesCall[3];

      // Test schema transformations
      expect(issuesSchema.project_key.parse('my-project')).toBe('my-project');
      expect(issuesSchema.severity.parse('MAJOR')).toBe('MAJOR');
      expect(issuesSchema.statuses.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);

      // Test lambda function execution
      return issuesLambda({ project_key: 'test-project', severity: 'MAJOR' }).then((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });

    it('should verify measures_component tool schema and lambda', () => {
      // Find the measures_component tool registration
      const measuresCall = mcpServer.tool.mock.calls.find(
        (call) => call[0] === 'measures_component'
      );
      const measuresSchema = measuresCall[2];
      const measuresLambda = measuresCall[3];

      // Test schema transformations
      expect(measuresSchema.component.parse('my-component')).toBe('my-component');
      expect(measuresSchema.metric_keys.parse('coverage')).toBe('coverage');
      expect(measuresSchema.metric_keys.parse(['coverage', 'bugs'])).toEqual(['coverage', 'bugs']);

      // Test lambda function execution with string metric
      return measuresLambda({
        component: 'test-component',
        metric_keys: 'coverage',
        branch: 'main',
      }).then((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });

    it('should verify measures_component tool with array metrics', () => {
      // Find the measures_component tool registration
      const measuresCall = mcpServer.tool.mock.calls.find(
        (call) => call[0] === 'measures_component'
      );
      const measuresLambda = measuresCall[3];

      // Test lambda function execution with array metrics
      return measuresLambda({
        component: 'test-component',
        metric_keys: ['coverage', 'bugs'],
        additional_fields: ['periods'],
        pull_request: 'pr-123',
        period: '1',
      }).then((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });

    it('should verify measures_components tool schema and lambda', () => {
      // Find the measures_components tool registration
      const measuresCall = mcpServer.tool.mock.calls.find(
        (call) => call[0] === 'measures_components'
      );
      const measuresSchema = measuresCall[2];
      const measuresLambda = measuresCall[3];

      // Test schema transformations
      expect(measuresSchema.component_keys.parse('my-component')).toBe('my-component');
      expect(measuresSchema.component_keys.parse(['comp1', 'comp2'])).toEqual(['comp1', 'comp2']);
      expect(measuresSchema.metric_keys.parse('coverage')).toBe('coverage');
      expect(measuresSchema.metric_keys.parse(['coverage', 'bugs'])).toEqual(['coverage', 'bugs']);

      // Test lambda function execution
      return measuresLambda({
        component_keys: 'test-component',
        metric_keys: 'coverage',
        page: '1',
        page_size: '10',
      }).then((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });

    it('should verify measures_history tool schema and lambda', () => {
      // Find the measures_history tool registration
      const measuresCall = mcpServer.tool.mock.calls.find((call) => call[0] === 'measures_history');
      const measuresSchema = measuresCall[2];
      const measuresLambda = measuresCall[3];

      // Test schema transformations
      expect(measuresSchema.component.parse('my-component')).toBe('my-component');
      expect(measuresSchema.metrics.parse('coverage')).toBe('coverage');
      expect(measuresSchema.metrics.parse(['coverage', 'bugs'])).toEqual(['coverage', 'bugs']);

      // Test lambda function execution
      return measuresLambda({
        component: 'test-component',
        metrics: 'coverage',
        from: '2023-01-01',
        to: '2023-12-31',
      }).then((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
      });
    });
  });
});
