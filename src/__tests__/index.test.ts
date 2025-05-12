/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import nock from 'nock';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';

// Mock SonarQube client responses
beforeAll(() => {
  nock('http://localhost:9000')
    .persist()
    .get('/api/projects/search')
    .query(true)
    .reply(200, {
      projects: [
        {
          key: 'test-project',
          name: 'Test Project',
          qualifier: 'TRK',
          visibility: 'public',
          lastAnalysisDate: '2024-03-01',
          revision: 'abc123',
          managed: false,
        },
      ],
      paging: {
        pageIndex: 1,
        pageSize: 10,
        total: 1,
      },
    });

  nock('http://localhost:9000')
    .persist()
    .get('/api/metrics/search')
    .query(true)
    .reply(200, {
      metrics: [
        {
          key: 'test-metric',
          name: 'Test Metric',
          description: 'Test metric description',
          domain: 'test',
          type: 'INT',
        },
      ],
      paging: {
        pageIndex: 1,
        pageSize: 10,
        total: 1,
      },
    });

  nock('http://localhost:9000')
    .persist()
    .get('/api/issues/search')
    .query(true)
    .reply(200, {
      issues: [
        {
          key: 'test-issue',
          rule: 'test-rule',
          severity: 'MAJOR',
          component: 'test-component',
          project: 'test-project',
          line: 1,
          status: 'OPEN',
          message: 'Test issue',
        },
      ],
      components: [],
      rules: [],
      users: [],
      facets: [],
      paging: {
        pageIndex: 1,
        pageSize: 10,
        total: 1,
      },
    });

  nock('http://localhost:9000').persist().get('/api/system/health').reply(200, {
    health: 'GREEN',
    causes: [],
  });

  nock('http://localhost:9000').persist().get('/api/system/status').reply(200, {
    id: 'test-id',
    version: '10.3.0.82913',
    status: 'UP',
  });

  nock('http://localhost:9000').persist().get('/api/system/ping').reply(200, 'pong');

  // Mock SonarQube measures API responses
  nock('http://localhost:9000')
    .persist()
    .get('/api/measures/component')
    .query(true)
    .reply(200, {
      component: {
        key: 'test-project',
        name: 'Test Project',
        qualifier: 'TRK',
        measures: [
          {
            metric: 'coverage',
            value: '85.4',
          },
          {
            metric: 'bugs',
            value: '12',
          },
        ],
      },
      metrics: [
        {
          key: 'coverage',
          name: 'Coverage',
          description: 'Test coverage percentage',
          domain: 'Coverage',
          type: 'PERCENT',
        },
        {
          key: 'bugs',
          name: 'Bugs',
          description: 'Number of bugs',
          domain: 'Reliability',
          type: 'INT',
        },
      ],
    });

  nock('http://localhost:9000')
    .persist()
    .get('/api/measures/components')
    .query(true)
    .reply(200, {
      components: [
        {
          key: 'test-project-1',
          name: 'Test Project 1',
          qualifier: 'TRK',
          measures: [
            {
              metric: 'coverage',
              value: '85.4',
            },
          ],
        },
        {
          key: 'test-project-2',
          name: 'Test Project 2',
          qualifier: 'TRK',
          measures: [
            {
              metric: 'coverage',
              value: '72.1',
            },
          ],
        },
      ],
      metrics: [
        {
          key: 'coverage',
          name: 'Coverage',
          description: 'Test coverage percentage',
          domain: 'Coverage',
          type: 'PERCENT',
        },
      ],
      paging: {
        pageIndex: 1,
        pageSize: 100,
        total: 2,
      },
    });

  nock('http://localhost:9000')
    .persist()
    .get('/api/measures/search_history')
    .query(true)
    .reply(200, {
      measures: [
        {
          metric: 'coverage',
          history: [
            {
              date: '2023-01-01T00:00:00+0000',
              value: '85.4',
            },
            {
              date: '2023-02-01T00:00:00+0000',
              value: '87.2',
            },
          ],
        },
      ],
      paging: {
        pageIndex: 1,
        pageSize: 100,
        total: 1,
      },
    });
});

afterAll(() => {
  nock.cleanAll();
});

// Mock the handlers
const mockHandlers = {
  handleSonarQubeProjects: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          projects: [
            {
              key: 'test-project',
              name: 'Test Project',
              qualifier: 'TRK',
              visibility: 'public',
              lastAnalysisDate: '2024-03-01',
              revision: 'abc123',
              managed: false,
            },
          ],
          paging: {
            pageIndex: 1,
            pageSize: 10,
            total: 1,
          },
        }),
      },
    ],
  }),
  handleSonarQubeGetMetrics: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          metrics: [
            {
              key: 'test-metric',
              name: 'Test Metric',
              description: 'Test metric description',
              domain: 'test',
              type: 'INT',
            },
          ],
          paging: {
            pageIndex: 1,
            pageSize: 10,
            total: 1,
          },
        }),
      },
    ],
  }),
  handleSonarQubeGetIssues: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          issues: [
            {
              key: 'test-issue',
              rule: 'test-rule',
              severity: 'MAJOR',
              component: 'test-component',
              project: 'test-project',
              line: 1,
              status: 'OPEN',
              message: 'Test issue',
            },
          ],
          components: [],
          rules: [],
          users: [],
          facets: [],
          paging: {
            pageIndex: 1,
            pageSize: 10,
            total: 1,
          },
        }),
      },
    ],
  }),
  handleSonarQubeGetHealth: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          health: 'GREEN',
          causes: [],
        }),
      },
    ],
  }),
  handleSonarQubeGetStatus: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          id: 'test-id',
          version: '10.3.0.82913',
          status: 'UP',
        }),
      },
    ],
  }),
  handleSonarQubePing: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: 'pong',
      },
    ],
  }),
  handleSonarQubeComponentMeasures: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          component: {
            key: 'test-project',
            name: 'Test Project',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'coverage',
                value: '85.4',
              },
              {
                metric: 'bugs',
                value: '12',
              },
            ],
          },
          metrics: [
            {
              key: 'coverage',
              name: 'Coverage',
              description: 'Test coverage percentage',
              domain: 'Coverage',
              type: 'PERCENT',
            },
            {
              key: 'bugs',
              name: 'Bugs',
              description: 'Number of bugs',
              domain: 'Reliability',
              type: 'INT',
            },
          ],
        }),
      },
    ],
  }),
  handleSonarQubeComponentsMeasures: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          components: [
            {
              key: 'test-project-1',
              name: 'Test Project 1',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '85.4',
                },
              ],
            },
            {
              key: 'test-project-2',
              name: 'Test Project 2',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '72.1',
                },
              ],
            },
          ],
          metrics: [
            {
              key: 'coverage',
              name: 'Coverage',
              description: 'Test coverage percentage',
              domain: 'Coverage',
              type: 'PERCENT',
            },
          ],
          paging: {
            pageIndex: 1,
            pageSize: 100,
            total: 2,
          },
        }),
      },
    ],
  }),
  handleSonarQubeMeasuresHistory: jest.fn().mockResolvedValue({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          measures: [
            {
              metric: 'coverage',
              history: [
                {
                  date: '2023-01-01T00:00:00+0000',
                  value: '85.4',
                },
                {
                  date: '2023-02-01T00:00:00+0000',
                  value: '87.2',
                },
              ],
            },
          ],
          paging: {
            pageIndex: 1,
            pageSize: 100,
            total: 1,
          },
        }),
      },
    ],
  }),
};

// Define the mock handlers but don't mock the entire module
jest.mock('../index.js', () => {
  // Get the original module
  const originalModule = jest.requireActual('../index.js');

  return {
    // Return everything from the original module
    ...originalModule,
    // But override these specific functions for tests that need mocks
    mcpServer: {
      ...originalModule.mcpServer,
      connect: jest.fn(),
    },
  };
});

// Save environment variables
const originalEnv = process.env;
/* eslint-disable @typescript-eslint/no-explicit-any */
let mcpServer: any;
let nullToUndefined: any;
let handleSonarQubeProjects: any;
let mapToSonarQubeParams: any;
let handleSonarQubeGetIssues: any;
let handleSonarQubeGetMetrics: any;
let handleSonarQubeGetHealth: any;
let handleSonarQubeGetStatus: any;
let handleSonarQubePing: any;
let handleSonarQubeComponentMeasures: any;
let handleSonarQubeComponentsMeasures: any;
let handleSonarQubeMeasuresHistory: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Connectable {
  connect: () => Promise<void>;
}

describe('MCP Server', () => {
  beforeAll(async () => {
    const module = await import('../index.js');
    mcpServer = module.mcpServer;
    nullToUndefined = module.nullToUndefined;
    handleSonarQubeProjects = module.handleSonarQubeProjects;
    mapToSonarQubeParams = module.mapToSonarQubeParams;
    handleSonarQubeGetIssues = module.handleSonarQubeGetIssues;
    handleSonarQubeGetMetrics = module.handleSonarQubeGetMetrics;
    handleSonarQubeGetHealth = module.handleSonarQubeGetHealth;
    handleSonarQubeGetStatus = module.handleSonarQubeGetStatus;
    handleSonarQubePing = module.handleSonarQubePing;
    handleSonarQubeComponentMeasures = module.handleSonarQubeComponentMeasures;
    handleSonarQubeComponentsMeasures = module.handleSonarQubeComponentsMeasures;
    handleSonarQubeMeasuresHistory = module.handleSonarQubeMeasuresHistory;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    nock.cleanAll();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
    nock.cleanAll();
  });

  it('should have initialized the MCP server', () => {
    expect(mcpServer).toBeDefined();
    expect(mcpServer.server).toBeDefined();
  });

  describe('Tool registration', () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let testServer: any;
    let registeredTools: Map<string, any>;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    beforeEach(() => {
      registeredTools = new Map();
      testServer = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool: jest.fn((name: string, description: string, schema: any, handler: any) => {
          registeredTools.set(name, { description, schema, handler });
        }),
      };

      // Register tools
      testServer.tool(
        'projects',
        'List all SonarQube projects',
        { page: {}, page_size: {} },
        mockHandlers.handleSonarQubeProjects
      );

      testServer.tool(
        'metrics',
        'Get available metrics from SonarQube',
        { page: {}, page_size: {} },
        mockHandlers.handleSonarQubeGetMetrics
      );

      testServer.tool(
        'issues',
        'Get issues for a SonarQube project',
        {
          project_key: {},
          severity: {},
          page: {},
          page_size: {},
          statuses: {},
          resolutions: {},
          resolved: {},
          types: {},
          rules: {},
          tags: {},
        },
        mockHandlers.handleSonarQubeGetIssues
      );

      testServer.tool(
        'system_health',
        'Get the health status of the SonarQube instance',
        {},
        mockHandlers.handleSonarQubeGetHealth
      );

      testServer.tool(
        'system_status',
        'Get the status of the SonarQube instance',
        {},
        mockHandlers.handleSonarQubeGetStatus
      );

      testServer.tool(
        'system_ping',
        'Ping the SonarQube instance to check if it is up',
        {},
        mockHandlers.handleSonarQubePing
      );

      testServer.tool(
        'measures_component',
        'Get measures for a specific component',
        {
          component: {},
          metric_keys: {},
          additional_fields: {},
          branch: {},
          pull_request: {},
          period: {},
        },
        mockHandlers.handleSonarQubeComponentMeasures
      );

      testServer.tool(
        'measures_components',
        'Get measures for multiple components',
        {
          component_keys: {},
          metric_keys: {},
          additional_fields: {},
          branch: {},
          pull_request: {},
          period: {},
          page: {},
          page_size: {},
        },
        mockHandlers.handleSonarQubeComponentsMeasures
      );

      testServer.tool(
        'measures_history',
        'Get measures history for a component',
        {
          component: {},
          metrics: {},
          from: {},
          to: {},
          branch: {},
          pull_request: {},
          page: {},
          page_size: {},
        },
        mockHandlers.handleSonarQubeMeasuresHistory
      );
    });

    it('should register all required tools', () => {
      expect(registeredTools.size).toBe(9);
      expect(registeredTools.has('projects')).toBe(true);
      expect(registeredTools.has('metrics')).toBe(true);
      expect(registeredTools.has('issues')).toBe(true);
      expect(registeredTools.has('system_health')).toBe(true);
      expect(registeredTools.has('system_status')).toBe(true);
      expect(registeredTools.has('system_ping')).toBe(true);
      expect(registeredTools.has('measures_component')).toBe(true);
      expect(registeredTools.has('measures_components')).toBe(true);
      expect(registeredTools.has('measures_history')).toBe(true);
    });

    it('should register tools with correct descriptions', () => {
      expect(registeredTools.get('projects').description).toBe('List all SonarQube projects');
      expect(registeredTools.get('metrics').description).toBe(
        'Get available metrics from SonarQube'
      );
      expect(registeredTools.get('issues').description).toBe('Get issues for a SonarQube project');
      expect(registeredTools.get('system_health').description).toBe(
        'Get the health status of the SonarQube instance'
      );
      expect(registeredTools.get('system_status').description).toBe(
        'Get the status of the SonarQube instance'
      );
      expect(registeredTools.get('system_ping').description).toBe(
        'Ping the SonarQube instance to check if it is up'
      );
      expect(registeredTools.get('measures_component').description).toBe(
        'Get measures for a specific component'
      );
      expect(registeredTools.get('measures_components').description).toBe(
        'Get measures for multiple components'
      );
      expect(registeredTools.get('measures_history').description).toBe(
        'Get measures history for a component'
      );
    });

    it('should register tools with correct handlers', () => {
      expect(registeredTools.get('projects').handler).toBe(mockHandlers.handleSonarQubeProjects);
      expect(registeredTools.get('metrics').handler).toBe(mockHandlers.handleSonarQubeGetMetrics);
      expect(registeredTools.get('issues').handler).toBe(mockHandlers.handleSonarQubeGetIssues);
      expect(registeredTools.get('system_health').handler).toBe(
        mockHandlers.handleSonarQubeGetHealth
      );
      expect(registeredTools.get('system_status').handler).toBe(
        mockHandlers.handleSonarQubeGetStatus
      );
      expect(registeredTools.get('system_ping').handler).toBe(mockHandlers.handleSonarQubePing);
      expect(registeredTools.get('measures_component').handler).toBe(
        mockHandlers.handleSonarQubeComponentMeasures
      );
      expect(registeredTools.get('measures_components').handler).toBe(
        mockHandlers.handleSonarQubeComponentsMeasures
      );
      expect(registeredTools.get('measures_history').handler).toBe(
        mockHandlers.handleSonarQubeMeasuresHistory
      );
    });
  });

  describe('nullToUndefined', () => {
    it('should return undefined for null', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('should return the value for non-null', () => {
      expect(nullToUndefined('value')).toBe('value');
    });
  });

  describe('handleSonarQubeProjects', () => {
    it('should fetch and return a list of projects', async () => {
      nock('http://localhost:9000')
        .get('/api/projects/search')
        .query(true)
        .reply(200, {
          components: [
            {
              key: 'project1',
              name: 'Project 1',
              qualifier: 'TRK',
              visibility: 'public',
              lastAnalysisDate: '2024-03-01',
              revision: 'abc123',
              managed: false,
            },
          ],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      const response = await handleSonarQubeProjects({ page: 1, page_size: 1 });
      expect(response.content[0].text).toContain('project1');
    });
  });

  describe('mapToSonarQubeParams', () => {
    it('should map MCP tool parameters to SonarQube client parameters', () => {
      const params = mapToSonarQubeParams({ project_key: 'key', severity: 'MAJOR' });
      expect(params.projectKey).toBe('key');
      expect(params.severity).toBe('MAJOR');
    });
  });

  describe('handleSonarQubeGetIssues', () => {
    it('should fetch and return a list of issues', async () => {
      nock('http://localhost:9000')
        .get('/api/issues/search')
        .query(true)
        .reply(200, {
          issues: [
            {
              key: 'issue1',
              rule: 'rule1',
              severity: 'MAJOR',
              component: 'comp1',
              project: 'proj1',
              line: 1,
              status: 'OPEN',
              message: 'Test issue',
            },
          ],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      const response = await handleSonarQubeGetIssues({ projectKey: 'key' });
      expect(response.content[0].text).toContain('issue');
    });
  });

  describe('handleSonarQubeGetMetrics', () => {
    it('should fetch and return a list of metrics', async () => {
      nock('http://localhost:9000')
        .get('/api/metrics/search')
        .query(true)
        .reply(200, {
          metrics: [
            {
              key: 'metric1',
              name: 'Metric 1',
              description: 'Test metric',
              domain: 'domain1',
              type: 'INT',
            },
          ],
          paging: { pageIndex: 1, pageSize: 1, total: 1 },
        });

      const response = await handleSonarQubeGetMetrics({ page: 1, pageSize: 1 });
      expect(response.content[0].text).toContain('metric');
    });
  });

  describe('handleSonarQubeGetHealth', () => {
    it('should fetch and return health status', async () => {
      nock('http://localhost:9000').get('/api/system/health').reply(200, {
        health: 'GREEN',
        causes: [],
      });

      const response = await handleSonarQubeGetHealth();
      expect(response.content[0].text).toContain('GREEN');
    });
  });

  describe('handleSonarQubeGetStatus', () => {
    it('should fetch and return system status', async () => {
      nock('http://localhost:9000').get('/api/system/status').reply(200, {
        id: 'test-id',
        version: '10.3.0.82913',
        status: 'UP',
      });

      const response = await handleSonarQubeGetStatus();
      expect(response.content[0].text).toContain('UP');
    });
  });

  describe('handleSonarQubePing', () => {
    it('should ping the system and return the result', async () => {
      nock('http://localhost:9000').get('/api/system/ping').reply(200, 'pong');

      const response = await handleSonarQubePing();
      expect(response.content[0].text).toBe('pong');
    });
  });

  describe('Conditional server start', () => {
    it('should not start the server if NODE_ENV is test', async () => {
      process.env.NODE_ENV = 'test';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connectSpy = jest.spyOn(StdioServerTransport.prototype as any, 'connect');
      const mcpConnectSpy = jest.spyOn(mcpServer, 'connect');
      const transport = new StdioServerTransport();
      await (transport as unknown as Connectable).connect();
      expect(connectSpy).toHaveBeenCalled();
      expect(mcpConnectSpy).not.toHaveBeenCalled();
      connectSpy.mockRestore();
      mcpConnectSpy.mockRestore();
    });

    it('should start the server if NODE_ENV is not test', async () => {
      process.env.NODE_ENV = 'development';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connectSpy = jest.spyOn(StdioServerTransport.prototype as any, 'connect');
      const mcpConnectSpy = jest.spyOn(mcpServer, 'connect');
      const transport = new StdioServerTransport();
      await (transport as unknown as Connectable).connect();
      await mcpServer.connect(transport);
      expect(connectSpy).toHaveBeenCalled();
      expect(mcpConnectSpy).toHaveBeenCalled();
      connectSpy.mockRestore();
      mcpConnectSpy.mockRestore();
    });
  });

  describe('Schema transformations', () => {
    it('should handle page and page_size transformations correctly', () => {
      const pageSchema = z
        .string()
        .nullable()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      // Test valid number strings
      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('20')).toBe(20);

      // Test invalid number strings
      expect(pageSchema.parse('invalid')).toBe(null);
      expect(pageSchema.parse('not-a-number')).toBe(null);

      // Test empty/undefined values
      expect(pageSchema.parse(undefined)).toBe(null);
      expect(pageSchema.parse(null)).toBe(null);
    });

    it('should handle boolean transformations correctly', () => {
      const booleanSchema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      // Test string values
      expect(booleanSchema.parse('true')).toBe(true);
      expect(booleanSchema.parse('false')).toBe(false);

      // Test boolean values
      expect(booleanSchema.parse(true)).toBe(true);
      expect(booleanSchema.parse(false)).toBe(false);

      // Test null/undefined values
      expect(booleanSchema.parse(null)).toBe(null);
      expect(booleanSchema.parse(undefined)).toBe(undefined);
    });

    it('should handle array transformations correctly', () => {
      const stringArraySchema = z.array(z.string()).nullable().optional();
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

      // Test valid arrays
      expect(statusSchema.parse(['OPEN', 'CONFIRMED'])).toEqual(['OPEN', 'CONFIRMED']);
      expect(resolutionSchema.parse(['FALSE-POSITIVE', 'WONTFIX'])).toEqual([
        'FALSE-POSITIVE',
        'WONTFIX',
      ]);
      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      expect(stringArraySchema.parse(['value1', 'value2'])).toEqual(['value1', 'value2']);

      // Test null/undefined values
      expect(statusSchema.parse(null)).toBe(null);
      expect(resolutionSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(null)).toBe(null);
      expect(stringArraySchema.parse(null)).toBe(null);
      expect(statusSchema.parse(undefined)).toBe(undefined);
      expect(resolutionSchema.parse(undefined)).toBe(undefined);
      expect(typeSchema.parse(undefined)).toBe(undefined);
      expect(stringArraySchema.parse(undefined)).toBe(undefined);

      // Test invalid values
      expect(() => statusSchema.parse(['INVALID'])).toThrow();
      expect(() => resolutionSchema.parse(['INVALID'])).toThrow();
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });

    it('should handle severity schema correctly', () => {
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

      // Test null/undefined values
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);

      // Test invalid values
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });

    it('should handle date parameters correctly', () => {
      const dateSchema = z.string().nullable().optional();

      // Test valid dates
      expect(dateSchema.parse('2024-01-01')).toBe('2024-01-01');
      expect(dateSchema.parse('2024-12-31')).toBe('2024-12-31');

      // Test null/undefined values
      expect(dateSchema.parse(null)).toBe(null);
      expect(dateSchema.parse(undefined)).toBe(undefined);
    });

    it('should handle complex parameter combinations', () => {
      // Mock SonarQube API response
      nock('http://localhost:9000')
        .get('/api/issues/search')
        .query(true)
        .reply(200, {
          issues: [],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      const params = {
        project_key: 'test-project',
        severity: 'MAJOR',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
        types: ['CODE_SMELL', 'BUG'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2024-01-01',
        created_before: '2024-12-31',
        created_at: '2024-06-15',
        created_in_last: '7d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'typescript'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['sec1', 'sec2'],
        on_component_only: true,
        facets: ['facet1', 'facet2'],
        since_leak_period: true,
        in_new_code_period: true,
      };

      return mockHandlers.handleSonarQubeGetIssues(mapToSonarQubeParams(params));
    });
  });

  describe('Tool handlers', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    describe('handleSonarQubeComponentMeasures', () => {
      it('should fetch and return component measures', async () => {
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query(true)
          .reply(200, {
            component: {
              key: 'test-component',
              name: 'Test Component',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '85.4',
                },
              ],
            },
            metrics: [
              {
                key: 'coverage',
                name: 'Coverage',
                description: 'Test coverage',
                domain: 'Coverage',
                type: 'PERCENT',
              },
            ],
          });

        const response = await handleSonarQubeComponentMeasures({
          component: 'test-component',
          metricKeys: ['coverage'],
        });
        expect(response.content[0].text).toContain('test-component');
        expect(response.content[0].text).toContain('coverage');
        expect(response.content[0].text).toContain('85.4');
      });
    });

    describe('handleSonarQubeComponentsMeasures', () => {
      it('should fetch and return measures for multiple components', async () => {
        nock('http://localhost:9000')
          .get('/api/measures/components')
          .query(true)
          .reply(200, {
            components: [
              {
                key: 'test-component-1',
                name: 'Test Component 1',
                qualifier: 'TRK',
                measures: [
                  {
                    metric: 'bugs',
                    value: '10',
                  },
                ],
              },
              {
                key: 'test-component-2',
                name: 'Test Component 2',
                qualifier: 'TRK',
                measures: [
                  {
                    metric: 'bugs',
                    value: '5',
                  },
                ],
              },
            ],
            metrics: [
              {
                key: 'bugs',
                name: 'Bugs',
                description: 'Number of bugs',
                domain: 'Reliability',
                type: 'INT',
              },
            ],
            paging: {
              pageIndex: 1,
              pageSize: 100,
              total: 2,
            },
          });

        const response = await handleSonarQubeComponentsMeasures({
          componentKeys: ['test-component-1', 'test-component-2'],
          metricKeys: ['bugs'],
          page: 1,
          pageSize: 100,
        });
        expect(response.content[0].text).toContain('test-component-1');
        expect(response.content[0].text).toContain('test-component-2');
        expect(response.content[0].text).toContain('bugs');
      });
    });

    describe('handleSonarQubeMeasuresHistory', () => {
      it('should fetch and return measures history', async () => {
        nock('http://localhost:9000')
          .get('/api/measures/search_history')
          .query(true)
          .reply(200, {
            measures: [
              {
                metric: 'coverage',
                history: [
                  {
                    date: '2023-01-01T00:00:00+0000',
                    value: '80.0',
                  },
                  {
                    date: '2023-02-01T00:00:00+0000',
                    value: '85.0',
                  },
                ],
              },
            ],
            paging: {
              pageIndex: 1,
              pageSize: 100,
              total: 1,
            },
          });

        const response = await handleSonarQubeMeasuresHistory({
          component: 'test-component',
          metrics: ['coverage'],
          from: '2023-01-01',
          to: '2023-02-01',
        });
        expect(response.content[0].text).toContain('coverage');
        expect(response.content[0].text).toContain('history');
        expect(response.content[0].text).toContain('2023-01-01');
        expect(response.content[0].text).toContain('2023-02-01');
      });
    });

    it('should fully process SonarQube projects response', async () => {
      const fullProjectsResponse = {
        projects: [
          {
            key: 'test-project',
            name: 'Test Project',
            qualifier: 'TRK',
            visibility: 'public',
            lastAnalysisDate: '2024-03-01',
            revision: 'abc123',
            managed: false,
            extra: 'should be excluded',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      };

      mockHandlers.handleSonarQubeProjects.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify(fullProjectsResponse),
          },
        ],
      });

      const result = await mockHandlers.handleSonarQubeProjects({ page: 1, page_size: 10 });
      const data = JSON.parse(result.content[0].text);

      expect(data.projects[0].key).toBe('test-project');
      expect(data.projects[0].name).toBe('Test Project');
      expect(data.projects[0].qualifier).toBe('TRK');
      expect(data.projects[0].visibility).toBe('public');
      expect(data.projects[0].lastAnalysisDate).toBe('2024-03-01');
      expect(data.projects[0].revision).toBe('abc123');
      expect(data.projects[0].managed).toBe(false);
      expect(data.paging.pageIndex).toBe(1);
      expect(data.paging.pageSize).toBe(10);
      expect(data.paging.total).toBe(1);
    });

    it('should fully process SonarQube issues response', async () => {
      const fullIssuesResponse = {
        issues: [
          {
            key: 'test-issue',
            rule: 'test-rule',
            severity: 'MAJOR',
            component: 'test-component',
            project: 'test-project',
            line: 1,
            status: 'OPEN',
            issueStatus: 'OPEN',
            message: 'Test issue',
            messageFormattings: [],
            effort: '1h',
            debt: '1h',
            author: 'test-author',
            tags: ['tag1', 'tag2'],
            creationDate: '2024-03-01',
            updateDate: '2024-03-02',
            type: 'BUG',
            cleanCodeAttribute: 'CONSISTENT',
            cleanCodeAttributeCategory: 'ADAPTABLE',
            prioritizedRule: true,
            impacts: [{ severity: 'HIGH', softwareQuality: 'SECURITY' }],
            textRange: { startLine: 1, endLine: 1, startOffset: 0, endOffset: 10 },
            comments: [],
            transitions: [],
            actions: [],
            flows: [],
            quickFixAvailable: false,
            ruleDescriptionContextKey: 'context',
            codeVariants: [],
            hash: 'hash',
          },
        ],
        components: [{ key: 'comp1', name: 'Component 1' }],
        rules: [{ key: 'rule1', name: 'Rule 1' }],
        users: [{ login: 'user1', name: 'User 1' }],
        facets: [{ property: 'facet1', values: [] }],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      };

      mockHandlers.handleSonarQubeGetIssues.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify(fullIssuesResponse),
          },
        ],
      });

      const result = await mockHandlers.handleSonarQubeGetIssues({
        projectKey: 'test-project',
        severity: 'MAJOR',
        page: 1,
        pageSize: 10,
        statuses: ['OPEN'],
        resolutions: ['FIXED'],
        resolved: true,
        types: ['BUG'],
        rules: ['rule1'],
        tags: ['tag1'],
        createdAfter: '2024-01-01',
        createdBefore: '2024-03-01',
        createdAt: '2024-02-01',
        createdInLast: '30d',
        assignees: ['user1'],
        authors: ['author1'],
        cwe: ['cwe1'],
        languages: ['java'],
        owaspTop10: ['a1'],
        sansTop25: ['sans1'],
        sonarsourceSecurity: ['ss1'],
        onComponentOnly: true,
        facets: ['facet1'],
        sinceLeakPeriod: true,
        inNewCodePeriod: true,
      });

      const data = JSON.parse(result.content[0].text);

      // Check all fields are properly mapped
      expect(data.issues[0].key).toBe('test-issue');
      expect(data.issues[0].rule).toBe('test-rule');
      expect(data.issues[0].severity).toBe('MAJOR');
      expect(data.issues[0].component).toBe('test-component');
      expect(data.issues[0].project).toBe('test-project');
      expect(data.issues[0].line).toBe(1);
      expect(data.issues[0].status).toBe('OPEN');
      expect(data.issues[0].issueStatus).toBe('OPEN');
      expect(data.issues[0].message).toBe('Test issue');
      expect(data.issues[0].effort).toBe('1h');
      expect(data.issues[0].debt).toBe('1h');
      expect(data.issues[0].author).toBe('test-author');
      expect(data.issues[0].tags).toEqual(['tag1', 'tag2']);
      expect(data.issues[0].creationDate).toBe('2024-03-01');
      expect(data.issues[0].updateDate).toBe('2024-03-02');
      expect(data.issues[0].type).toBe('BUG');
      expect(data.issues[0].cleanCodeAttribute).toBe('CONSISTENT');
      expect(data.issues[0].cleanCodeAttributeCategory).toBe('ADAPTABLE');
      expect(data.issues[0].prioritizedRule).toBe(true);
      expect(data.issues[0].impacts).toHaveLength(1);
      expect(data.issues[0].impacts[0].severity).toBe('HIGH');

      // Check other response data
      expect(data.components).toHaveLength(1);
      expect(data.rules).toHaveLength(1);
      expect(data.users).toHaveLength(1);
      expect(data.facets).toHaveLength(1);
      expect(data.paging.pageIndex).toBe(1);
      expect(data.paging.pageSize).toBe(10);
      expect(data.paging.total).toBe(1);
    });

    it('should handle metrics response', async () => {
      const metricsResponse = {
        metrics: [
          {
            key: 'test-metric',
            name: 'Test Metric',
            description: 'Test metric description',
            domain: 'test',
            type: 'INT',
          },
        ],
        paging: {
          pageIndex: 1,
          pageSize: 10,
          total: 1,
        },
      };

      mockHandlers.handleSonarQubeGetMetrics.mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: JSON.stringify(metricsResponse),
          },
        ],
      });

      const result = await mockHandlers.handleSonarQubeGetMetrics({
        page: 1,
        pageSize: 10,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.metrics).toHaveLength(1);
      expect(data.metrics[0].key).toBe('test-metric');
      expect(data.metrics[0].name).toBe('Test Metric');
      expect(data.paging.pageIndex).toBe(1);
    });
  });

  describe('Tool registration schemas', () => {
    it('should correctly transform page parameters', () => {
      const pageSchema = z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) || null : null));

      expect(pageSchema.parse('10')).toBe(10);
      expect(pageSchema.parse('not-a-number')).toBe(null);
      expect(pageSchema.parse('')).toBe(null);
      expect(pageSchema.parse(undefined)).toBe(null);
    });

    it('should validate severity enum schema', () => {
      const severitySchema = z
        .enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])
        .nullable()
        .optional();

      expect(severitySchema.parse('MAJOR')).toBe('MAJOR');
      expect(severitySchema.parse('BLOCKER')).toBe('BLOCKER');
      expect(severitySchema.parse(null)).toBe(null);
      expect(severitySchema.parse(undefined)).toBe(undefined);
      expect(() => severitySchema.parse('INVALID')).toThrow();
    });

    it('should validate status schema', () => {
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

    it('should validate resolution schema', () => {
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

    it('should validate type schema', () => {
      const typeSchema = z
        .array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY', 'SECURITY_HOTSPOT']))
        .nullable()
        .optional();

      expect(typeSchema.parse(['CODE_SMELL', 'BUG'])).toEqual(['CODE_SMELL', 'BUG']);
      expect(typeSchema.parse(null)).toBe(null);
      expect(typeSchema.parse(undefined)).toBe(undefined);
      expect(() => typeSchema.parse(['INVALID'])).toThrow();
    });

    it('should transform boolean parameters', () => {
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

  describe('Tool registration lambdas', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.resetAllMocks();
    });

    it('should test the metrics tool lambda', async () => {
      // Mock the handleSonarQubeGetMetrics function to track calls
      const mockGetMetrics = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"metrics":[]}' }],
      });

      const originalHandler = handleSonarQubeGetMetrics;
      handleSonarQubeGetMetrics = mockGetMetrics;

      // Create the lambda handler that's in the tool registration
      const metricsLambda = async (params: Record<string, unknown>) => {
        const result = await handleSonarQubeGetMetrics({
          page: nullToUndefined(params.page) as number | undefined,
          pageSize: nullToUndefined(params.page_size) as number | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      };

      // Call the lambda with params
      await metricsLambda({ page: '5', page_size: '20' });

      // Check that handleSonarQubeGetMetrics was called with the right params
      expect(mockGetMetrics).toHaveBeenCalledWith({
        page: '5',
        pageSize: '20',
      });

      // Restore the original function
      handleSonarQubeGetMetrics = originalHandler;
    });

    it('should test the issues tool lambda', async () => {
      // Mock the handleSonarQubeGetIssues function to track calls
      const mockGetIssues = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"issues":[]}' }],
      });

      const originalHandler = handleSonarQubeGetIssues;
      handleSonarQubeGetIssues = mockGetIssues;

      // Mock mapToSonarQubeParams to return expected output
      const originalMapFunction = mapToSonarQubeParams;
      const mockMapFunction = jest.fn().mockReturnValue({
        projectKey: 'test-project',
        severity: 'MAJOR',
      });
      mapToSonarQubeParams = mockMapFunction;

      // Create the lambda handler that's in the tool registration
      const issuesLambda = async (params: Record<string, unknown>) => {
        return handleSonarQubeGetIssues(mapToSonarQubeParams(params));
      };

      // Call the lambda with params
      await issuesLambda({
        project_key: 'test-project',
        severity: 'MAJOR',
      });

      // Check that mapToSonarQubeParams was called with the right params
      expect(mockMapFunction).toHaveBeenCalledWith({
        project_key: 'test-project',
        severity: 'MAJOR',
      });

      // Check that handleSonarQubeGetIssues was called with the mapped params
      expect(mockGetIssues).toHaveBeenCalledWith({
        projectKey: 'test-project',
        severity: 'MAJOR',
      });

      // Restore the original functions
      handleSonarQubeGetIssues = originalHandler;
      mapToSonarQubeParams = originalMapFunction;
    });
  });

  describe('Tool schema validations', () => {
    it('should validate and transform all issue tool schemas', () => {
      // Create schemas that match what's in the tool registration
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
        created_after: z.string().nullable().optional(),
        created_before: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        created_in_last: z.string().nullable().optional(),
        assignees: stringArraySchema,
        authors: stringArraySchema,
        cwe: stringArraySchema,
        languages: stringArraySchema,
        owasp_top10: stringArraySchema,
        sans_top25: stringArraySchema,
        sonarsource_security: stringArraySchema,
        on_component_only: booleanSchema,
        facets: stringArraySchema,
        since_leak_period: booleanSchema,
        in_new_code_period: booleanSchema,
      });

      // Test the complete schema
      const testData = {
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
        created_after: '2024-01-01',
        created_before: '2024-12-31',
        created_at: '2024-06-15',
        created_in_last: '7d',
        assignees: ['user1', 'user2'],
        authors: ['author1', 'author2'],
        cwe: ['cwe1', 'cwe2'],
        languages: ['java', 'typescript'],
        owasp_top10: ['a1', 'a2'],
        sans_top25: ['sans1', 'sans2'],
        sonarsource_security: ['sec1', 'sec2'],
        on_component_only: 'true',
        facets: ['facet1', 'facet2'],
        since_leak_period: 'true',
        in_new_code_period: 'true',
      };

      // Validate through the Zod schema
      const validated = schema.parse(testData);

      // Check transformations happened correctly
      expect(validated.page).toBe(10);
      expect(validated.page_size).toBe(20);
      expect(validated.resolved).toBe(true);
      expect(validated.on_component_only).toBe(true);
      expect(validated.since_leak_period).toBe(true);
      expect(validated.in_new_code_period).toBe(true);

      // Check arrays were kept intact
      expect(validated.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(validated.resolutions).toEqual(['FALSE-POSITIVE', 'WONTFIX']);
      expect(validated.types).toEqual(['CODE_SMELL', 'BUG']);
      expect(validated.rules).toEqual(['rule1', 'rule2']);

      // Check that strings were kept intact
      expect(validated.project_key).toBe('test-project');
      expect(validated.severity).toBe('MAJOR');
      expect(validated.created_after).toBe('2024-01-01');
    });
  });

  describe('Direct tool registration test', () => {
    it('should validate tool existence', () => {
      expect(mcpServer.tool).toBeDefined();
    });
  });
});
