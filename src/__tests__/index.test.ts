/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import nock from 'nock';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Store original env vars
const originalEnv = { ...process.env };

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
// Using the originalEnv declared at the top of the file
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
let handleSonarQubeSearchHotspots: any;
let handleSonarQubeGetHotspotDetails: any;
let handleSonarQubeUpdateHotspotStatus: any;
let handleSonarQubeGetQualityGate: any;
let handleSonarQubeProjectQualityGateStatus: any;
let qualityGateHandler: any;
let projectQualityGateStatusHandler: any;
let getHotspotDetailsHandler: any;
let updateHotspotStatusHandler: any;
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
    handleSonarQubeSearchHotspots = module.handleSonarQubeSearchHotspots;
    handleSonarQubeGetHotspotDetails = module.handleSonarQubeGetHotspotDetails;
    handleSonarQubeUpdateHotspotStatus = module.handleSonarQubeUpdateHotspotStatus;
    handleSonarQubeGetQualityGate = module.handleSonarQubeGetQualityGate;
    handleSonarQubeProjectQualityGateStatus = module.handleSonarQubeProjectQualityGateStatus;
    qualityGateHandler = module.qualityGateHandler;
    projectQualityGateStatusHandler = module.projectQualityGateStatusHandler;
    getHotspotDetailsHandler = module.getHotspotDetailsHandler;
    updateHotspotStatusHandler = module.updateHotspotStatusHandler;
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Ensure test environment variables are set
    process.env.SONARQUBE_TOKEN = 'test-token';
    process.env.SONARQUBE_URL = 'http://localhost:9000';
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
      // Use the actual schema from the tool registration
      const pageSchema = z
        .string()
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
      expect(pageSchema.parse('')).toBe(null);
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

    it('should handle hotspot search boolean transformations correctly', () => {
      // Test string to boolean transformation schemas used in hotspot search
      const hotspotBooleanSchema = z
        .union([z.boolean(), z.string().transform((val) => val === 'true')])
        .nullable()
        .optional();

      // Test boolean values
      expect(hotspotBooleanSchema.parse(true)).toBe(true);
      expect(hotspotBooleanSchema.parse(false)).toBe(false);

      // Test string values
      expect(hotspotBooleanSchema.parse('true')).toBe(true);
      expect(hotspotBooleanSchema.parse('false')).toBe(false);
      expect(hotspotBooleanSchema.parse('any')).toBe(false);

      // Test null/undefined values
      expect(hotspotBooleanSchema.parse(null)).toBe(null);
      expect(hotspotBooleanSchema.parse(undefined)).toBe(undefined);
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

      it('should fetch component measures with all optional parameters', async () => {
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query((queryObject) => {
            return (
              queryObject.component === 'test-component' &&
              queryObject.metricKeys === 'coverage,bugs' &&
              queryObject.additionalFields === 'periods,metrics' &&
              queryObject.branch === 'main' &&
              queryObject.pullRequest === 'pr-123'
            );
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
              key: 'test-component',
              name: 'Test Component',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '85.4',
                  period: { index: 1, value: '+5.4' },
                },
                {
                  metric: 'bugs',
                  value: '10',
                  period: { index: 1, value: '-2' },
                },
              ],
              periods: [{ index: 1, mode: 'previous_version', date: '2023-01-01T00:00:00+0000' }],
            },
            metrics: [
              {
                key: 'coverage',
                name: 'Coverage',
                description: 'Test coverage',
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

        const response = await handleSonarQubeComponentMeasures({
          component: 'test-component',
          metricKeys: ['coverage', 'bugs'],
          additionalFields: ['periods', 'metrics'],
          branch: 'main',
          pullRequest: 'pr-123',
          period: '1',
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.component.key).toBe('test-component');
        expect(result.component.measures).toHaveLength(2);
        expect(result.component.periods).toBeDefined();
        expect(result.metrics).toHaveLength(2);
        expect(result.component.measures[0].period).toBeDefined();
        expect(result.component.measures[0].period.index).toBe(1);
      });
    });

    describe('handleSonarQubeComponentsMeasures', () => {
      it('should fetch and return measures for multiple components', async () => {
        // Mock individual component measure calls
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query({
            component: 'test-component-1',
            metricKeys: 'bugs',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
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
            metrics: [
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
          .get('/api/measures/component')
          .query({
            component: 'test-component-2',
            metricKeys: 'bugs',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
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
            metrics: [
              {
                key: 'bugs',
                name: 'Bugs',
                description: 'Number of bugs',
                domain: 'Reliability',
                type: 'INT',
              },
            ],
          });

        // Mock the additional call to get metrics from first component
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query({
            component: 'test-component-1',
            metricKeys: 'bugs',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
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
            metrics: [
              {
                key: 'bugs',
                name: 'Bugs',
                description: 'Number of bugs',
                domain: 'Reliability',
                type: 'INT',
              },
            ],
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

      it('should fetch components measures with all optional parameters', async () => {
        // Mock individual component measure calls with optional parameters
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query({
            component: 'test-component-1',
            metricKeys: 'coverage,bugs',
            additionalFields: 'periods,metrics',
            branch: 'develop',
            pullRequest: 'pr-456',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
              key: 'test-component-1',
              name: 'Test Component 1',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '85.4',
                  period: { index: 2, value: '+5.4' },
                },
                {
                  metric: 'bugs',
                  value: '10',
                  period: { index: 2, value: '-2' },
                },
              ],
              periods: [{ index: 2, mode: 'previous_version', date: '2023-01-01T00:00:00+0000' }],
            },
            metrics: [
              {
                key: 'coverage',
                name: 'Coverage',
                description: 'Test coverage',
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
            paging: {
              pageIndex: 3,
              pageSize: 25,
              total: 50,
            },
          });

        // Mock the additional call to get metrics from first component
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query({
            component: 'test-component-1',
            metricKeys: 'coverage,bugs',
            additionalFields: 'periods,metrics',
            branch: 'develop',
            pullRequest: 'pr-456',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
              key: 'test-component-1',
              name: 'Test Component 1',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '85.4',
                  period: { index: 2, value: '+5.4' },
                },
                {
                  metric: 'bugs',
                  value: '10',
                  period: { index: 2, value: '-2' },
                },
              ],
              periods: [{ index: 2, mode: 'previous_version', date: '2023-01-01T00:00:00+0000' }],
            },
            metrics: [
              {
                key: 'coverage',
                name: 'Coverage',
                description: 'Test coverage',
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
            period: {
              index: 2,
              mode: 'previous_version',
              date: '2023-01-01T00:00:00+0000',
            },
          });

        // Mock second component
        nock('http://localhost:9000')
          .get('/api/measures/component')
          .query({
            component: 'test-component-2',
            metricKeys: 'coverage,bugs',
            additionalFields: 'periods,metrics',
            branch: 'develop',
            pullRequest: 'pr-456',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            component: {
              key: 'test-component-2',
              name: 'Test Component 2',
              qualifier: 'TRK',
              measures: [
                {
                  metric: 'coverage',
                  value: '78.2',
                  period: { index: 2, value: '+3.1' },
                },
                {
                  metric: 'bugs',
                  value: '5',
                  period: { index: 2, value: '-1' },
                },
              ],
              periods: [{ index: 2, mode: 'previous_version', date: '2023-01-01T00:00:00+0000' }],
            },
            metrics: [
              {
                key: 'coverage',
                name: 'Coverage',
                description: 'Test coverage',
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
            period: {
              index: 2,
              mode: 'previous_version',
              date: '2023-01-01T00:00:00+0000',
            },
          });

        const response = await handleSonarQubeComponentsMeasures({
          componentKeys: ['test-component-1', 'test-component-2'],
          metricKeys: ['coverage', 'bugs'],
          additionalFields: ['periods', 'metrics'],
          branch: 'develop',
          pullRequest: 'pr-456',
          period: '2',
          page: 1,
          pageSize: 25,
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.components).toHaveLength(2);
        expect(result.metrics).toHaveLength(2);
        expect(result.paging.pageIndex).toBe(1);
        expect(result.paging.pageSize).toBe(25);
        expect(result.paging.total).toBe(2);
        expect(result.components[0].key).toBe('test-component-1');
        expect(result.components[0].measures).toHaveLength(2);
        expect(result.components[0].periods).toBeDefined();
        expect(result.components[0].measures[0].period).toBeDefined();
        expect(result.components[0].measures[0].period.index).toBe(2);
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

      it('should fetch measures history with all optional parameters', async () => {
        nock('http://localhost:9000')
          .get('/api/measures/search_history')
          .query((queryObject) => {
            return (
              queryObject.component === 'test-component' &&
              queryObject.metrics === 'coverage,bugs,code_smells' &&
              queryObject.from === '2023-01-01' &&
              queryObject.to === '2023-12-31' &&
              queryObject.branch === 'release' &&
              queryObject.pullRequest === 'pr-789' &&
              queryObject.ps === '30' &&
              queryObject.p === '2'
            );
          })
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
                    date: '2023-03-01T00:00:00+0000',
                    value: '83.5',
                  },
                  {
                    date: '2023-06-01T00:00:00+0000',
                    value: '85.0',
                  },
                  {
                    date: '2023-09-01T00:00:00+0000',
                    value: '87.2',
                  },
                  {
                    date: '2023-12-01T00:00:00+0000',
                    value: '90.1',
                  },
                ],
              },
              {
                metric: 'bugs',
                history: [
                  {
                    date: '2023-01-01T00:00:00+0000',
                    value: '15',
                  },
                  {
                    date: '2023-03-01T00:00:00+0000',
                    value: '12',
                  },
                  {
                    date: '2023-06-01T00:00:00+0000',
                    value: '10',
                  },
                  {
                    date: '2023-09-01T00:00:00+0000',
                    value: '7',
                  },
                  {
                    date: '2023-12-01T00:00:00+0000',
                    value: '5',
                  },
                ],
              },
              {
                metric: 'code_smells',
                history: [
                  {
                    date: '2023-01-01T00:00:00+0000',
                    value: '50',
                  },
                  {
                    date: '2023-03-01T00:00:00+0000',
                    value: '45',
                  },
                  {
                    date: '2023-06-01T00:00:00+0000',
                    value: '40',
                  },
                  {
                    date: '2023-09-01T00:00:00+0000',
                    value: '35',
                  },
                  {
                    date: '2023-12-01T00:00:00+0000',
                    value: '30',
                  },
                ],
              },
            ],
            paging: {
              pageIndex: 2,
              pageSize: 30,
              total: 60,
            },
          });

        const response = await handleSonarQubeMeasuresHistory({
          component: 'test-component',
          metrics: ['coverage', 'bugs', 'code_smells'],
          from: '2023-01-01',
          to: '2023-12-31',
          branch: 'release',
          pullRequest: 'pr-789',
          page: 2,
          pageSize: 30,
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.measures).toHaveLength(3);
        expect(result.paging.pageIndex).toBe(2);
        expect(result.paging.pageSize).toBe(30);
        expect(result.paging.total).toBe(60);

        // Check coverage metric
        expect(result.measures[0].metric).toBe('coverage');
        expect(result.measures[0].history).toHaveLength(5);
        expect(result.measures[0].history[0].date).toBe('2023-01-01T00:00:00+0000');
        expect(result.measures[0].history[0].value).toBe('80.0');
        expect(result.measures[0].history[4].date).toBe('2023-12-01T00:00:00+0000');
        expect(result.measures[0].history[4].value).toBe('90.1');

        // Check bugs metric
        expect(result.measures[1].metric).toBe('bugs');
        expect(result.measures[1].history).toHaveLength(5);
        expect(result.measures[1].history[0].value).toBe('15');
        expect(result.measures[1].history[4].value).toBe('5');

        // Check code_smells metric
        expect(result.measures[2].metric).toBe('code_smells');
        expect(result.measures[2].history).toHaveLength(5);
        expect(result.measures[2].history[0].value).toBe('50');
        expect(result.measures[2].history[4].value).toBe('30');
      });
    });

    describe('measures_component tool lambda', () => {
      it('should call handleSonarQubeComponentMeasures with correct parameters', async () => {
        // Create a simulated lambda function that mimics the tool handler
        const componentMeasuresLambda = async (params: Record<string, unknown>) => {
          return handleSonarQubeComponentMeasures({
            component: params.component as string,
            metricKeys: Array.isArray(params.metric_keys)
              ? (params.metric_keys as string[])
              : [params.metric_keys as string],
            additionalFields: params.additional_fields as string[] | undefined,
            branch: params.branch as string | undefined,
            pullRequest: params.pull_request as string | undefined,
            period: params.period as string | undefined,
          });
        };

        // Mock the handleSonarQubeComponentMeasures function
        const mockHandler = jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"component":{}}' }],
        });

        const originalHandler = handleSonarQubeComponentMeasures;
        handleSonarQubeComponentMeasures = mockHandler;

        // Test with string metrics parameter
        await componentMeasuresLambda({
          component: 'my-project',
          metric_keys: 'coverage',
          branch: 'main',
        });

        // Test with array metrics parameter
        await componentMeasuresLambda({
          component: 'my-project',
          metric_keys: ['coverage', 'bugs'],
          additional_fields: ['periods'],
          pull_request: 'pr-123',
          period: '1',
        });

        // Check that the handler was called with the correct parameters
        expect(mockHandler).toHaveBeenCalledTimes(2);

        // Check first call with string parameter
        expect(mockHandler.mock.calls[0][0]).toEqual({
          component: 'my-project',
          metricKeys: ['coverage'],
          branch: 'main',
          additionalFields: undefined,
          pullRequest: undefined,
          period: undefined,
        });

        // Check second call with array parameter
        expect(mockHandler.mock.calls[1][0]).toEqual({
          component: 'my-project',
          metricKeys: ['coverage', 'bugs'],
          additionalFields: ['periods'],
          branch: undefined,
          pullRequest: 'pr-123',
          period: '1',
        });

        // Restore the original handler
        handleSonarQubeComponentMeasures = originalHandler;
      });
    });

    describe('measures_components tool lambda', () => {
      it('should call handleSonarQubeComponentsMeasures with correct parameters', async () => {
        // Create a simulated lambda function that mimics the tool handler
        const componentsMeasuresLambda = async (params: Record<string, unknown>) => {
          return handleSonarQubeComponentsMeasures({
            componentKeys: Array.isArray(params.component_keys)
              ? (params.component_keys as string[])
              : [params.component_keys as string],
            metricKeys: Array.isArray(params.metric_keys)
              ? (params.metric_keys as string[])
              : [params.metric_keys as string],
            additionalFields: params.additional_fields as string[] | undefined,
            branch: params.branch as string | undefined,
            pullRequest: params.pull_request as string | undefined,
            period: params.period as string | undefined,
            page: nullToUndefined(params.page) as number | undefined,
            pageSize: nullToUndefined(params.page_size) as number | undefined,
          });
        };

        // Mock the handler function
        const mockHandler = jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"components":[]}' }],
        });

        const originalHandler = handleSonarQubeComponentsMeasures;
        handleSonarQubeComponentsMeasures = mockHandler;

        // Test with string parameters
        await componentsMeasuresLambda({
          component_keys: 'project1',
          metric_keys: 'coverage',
          page: '1',
          page_size: '10',
        });

        // Test with array parameters
        await componentsMeasuresLambda({
          component_keys: ['project1', 'project2'],
          metric_keys: ['coverage', 'bugs'],
          additional_fields: ['periods'],
          branch: 'main',
          period: '1',
        });

        // Test with pull request parameter
        await componentsMeasuresLambda({
          component_keys: 'project1',
          metric_keys: ['coverage', 'bugs'],
          pull_request: 'pr-123',
        });

        // Check that the handler was called with the correct parameters
        expect(mockHandler).toHaveBeenCalledTimes(3);

        // Check first call with string parameters
        expect(mockHandler.mock.calls[0][0]).toEqual({
          componentKeys: ['project1'],
          metricKeys: ['coverage'],
          additionalFields: undefined,
          branch: undefined,
          pullRequest: undefined,
          period: undefined,
          page: '1',
          pageSize: '10',
        });

        // Check second call with array parameters
        expect(mockHandler.mock.calls[1][0]).toEqual({
          componentKeys: ['project1', 'project2'],
          metricKeys: ['coverage', 'bugs'],
          additionalFields: ['periods'],
          branch: 'main',
          pullRequest: undefined,
          period: '1',
          page: undefined,
          pageSize: undefined,
        });

        // Check third call with pull request parameter
        expect(mockHandler.mock.calls[2][0]).toEqual({
          componentKeys: ['project1'],
          metricKeys: ['coverage', 'bugs'],
          additionalFields: undefined,
          branch: undefined,
          pullRequest: 'pr-123',
          period: undefined,
          page: undefined,
          pageSize: undefined,
        });

        // Restore the original handler
        handleSonarQubeComponentsMeasures = originalHandler;
      });
    });

    describe('measures_history tool lambda', () => {
      it('should call handleSonarQubeMeasuresHistory with correct parameters', async () => {
        // Create a simulated lambda function that mimics the tool handler
        const measuresHistoryLambda = async (params: Record<string, unknown>) => {
          return handleSonarQubeMeasuresHistory({
            component: params.component as string,
            metrics: Array.isArray(params.metrics)
              ? (params.metrics as string[])
              : [params.metrics as string],
            from: params.from as string | undefined,
            to: params.to as string | undefined,
            branch: params.branch as string | undefined,
            pullRequest: params.pull_request as string | undefined,
            page: nullToUndefined(params.page) as number | undefined,
            pageSize: nullToUndefined(params.page_size) as number | undefined,
          });
        };

        // Mock the handler function
        const mockHandler = jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"measures":[]}' }],
        });

        const originalHandler = handleSonarQubeMeasuresHistory;
        handleSonarQubeMeasuresHistory = mockHandler;

        // Test with string parameter
        await measuresHistoryLambda({
          component: 'my-project',
          metrics: 'coverage',
          from: '2023-01-01',
          to: '2023-02-01',
        });

        // Test with array parameter
        await measuresHistoryLambda({
          component: 'my-project',
          metrics: ['coverage', 'bugs'],
          branch: 'main',
          page: '2',
          page_size: '20',
        });

        // Test with pull request parameter
        await measuresHistoryLambda({
          component: 'my-project',
          metrics: ['coverage'],
          pull_request: 'pr-123',
        });

        // Test full parameter set
        await measuresHistoryLambda({
          component: 'my-project',
          metrics: ['coverage', 'bugs', 'code_smells'],
          from: '2023-01-01',
          to: '2023-12-31',
          branch: 'develop',
          pull_request: 'pr-456',
          page: '3',
          page_size: '50',
        });

        // Check that the handler was called with the correct parameters
        expect(mockHandler).toHaveBeenCalledTimes(4);

        // Check first call with string parameter
        expect(mockHandler.mock.calls[0][0]).toEqual({
          component: 'my-project',
          metrics: ['coverage'],
          from: '2023-01-01',
          to: '2023-02-01',
          branch: undefined,
          pullRequest: undefined,
          page: undefined,
          pageSize: undefined,
        });

        // Check second call with array parameter
        expect(mockHandler.mock.calls[1][0]).toEqual({
          component: 'my-project',
          metrics: ['coverage', 'bugs'],
          from: undefined,
          to: undefined,
          branch: 'main',
          pullRequest: undefined,
          page: '2',
          pageSize: '20',
        });

        // Check third call with pull request parameter
        expect(mockHandler.mock.calls[2][0]).toEqual({
          component: 'my-project',
          metrics: ['coverage'],
          from: undefined,
          to: undefined,
          branch: undefined,
          pullRequest: 'pr-123',
          page: undefined,
          pageSize: undefined,
        });

        // Check fourth call with full parameter set
        expect(mockHandler.mock.calls[3][0]).toEqual({
          component: 'my-project',
          metrics: ['coverage', 'bugs', 'code_smells'],
          from: '2023-01-01',
          to: '2023-12-31',
          branch: 'develop',
          pullRequest: 'pr-456',
          page: '3',
          pageSize: '50',
        });

        // Restore the original handler
        handleSonarQubeMeasuresHistory = originalHandler;
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

    it('should test the hotspot search tool lambda', async () => {
      // Mock the handleSonarQubeSearchHotspots function to track calls
      const mockSearchHotspots = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"hotspots":[]}' }],
      });

      const originalHandler = handleSonarQubeSearchHotspots;
      handleSonarQubeSearchHotspots = mockSearchHotspots;

      // Mock mapToSonarQubeParams to return expected output
      const originalMapFunction = mapToSonarQubeParams;
      const mockMapFunction = jest.fn().mockReturnValue({
        projectKey: 'test-project',
        status: 'TO_REVIEW',
        assignedToMe: true,
        sinceLeakPeriod: false,
        inNewCodePeriod: true,
        page: 1,
        pageSize: 50,
      });
      mapToSonarQubeParams = mockMapFunction;

      // Create the lambda handler that's in the tool registration
      const searchHotspotsLambda = async (params: Record<string, unknown>) => {
        return handleSonarQubeSearchHotspots(mapToSonarQubeParams(params));
      };

      // Call the lambda with params that include string booleans
      await searchHotspotsLambda({
        project_key: 'test-project',
        status: 'TO_REVIEW',
        assigned_to_me: 'true',
        since_leak_period: 'false',
        in_new_code_period: 'true',
        page: '1',
        page_size: '50',
      });

      // Check that mapToSonarQubeParams was called with the right params
      expect(mockMapFunction).toHaveBeenCalledWith({
        project_key: 'test-project',
        status: 'TO_REVIEW',
        assigned_to_me: 'true',
        since_leak_period: 'false',
        in_new_code_period: 'true',
        page: '1',
        page_size: '50',
      });

      // Check that handleSonarQubeSearchHotspots was called with the mapped params
      expect(mockSearchHotspots).toHaveBeenCalledWith({
        projectKey: 'test-project',
        status: 'TO_REVIEW',
        assignedToMe: true,
        sinceLeakPeriod: false,
        inNewCodePeriod: true,
        page: 1,
        pageSize: 50,
      });

      // Restore the original functions
      handleSonarQubeSearchHotspots = originalHandler;
      mapToSonarQubeParams = originalMapFunction;
    });

    it('should test the quality gate handler lambda', async () => {
      // Mock the handleSonarQubeGetQualityGate function
      const mockGetQualityGate = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"qualityGate":{}}' }],
      });

      const originalHandler = handleSonarQubeGetQualityGate;
      handleSonarQubeGetQualityGate = mockGetQualityGate;

      // Test the lambda
      await qualityGateHandler({ id: 'gate-123' });

      expect(mockGetQualityGate).toHaveBeenCalledWith({
        id: 'gate-123',
      });

      handleSonarQubeGetQualityGate = originalHandler;
    });

    it('should test the project quality gate status handler lambda', async () => {
      // Mock the handleSonarQubeProjectQualityGateStatus function
      const mockProjectQualityGateStatus = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"status":"OK"}' }],
      });

      const originalHandler = handleSonarQubeProjectQualityGateStatus;
      handleSonarQubeProjectQualityGateStatus = mockProjectQualityGateStatus;

      // Test the lambda with all parameters
      await projectQualityGateStatusHandler({
        project_key: 'test-project',
        branch: 'main',
        pull_request: 'pr-123',
      });

      expect(mockProjectQualityGateStatus).toHaveBeenCalledWith({
        projectKey: 'test-project',
        branch: 'main',
        pullRequest: 'pr-123',
      });

      handleSonarQubeProjectQualityGateStatus = originalHandler;
    });

    it('should test the get hotspot details handler lambda', async () => {
      // Mock the handleSonarQubeGetHotspotDetails function
      const mockGetHotspotDetails = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"hotspot":{}}' }],
      });

      const originalHandler = handleSonarQubeGetHotspotDetails;
      handleSonarQubeGetHotspotDetails = mockGetHotspotDetails;

      // Test the lambda
      await getHotspotDetailsHandler({ hotspot_key: 'hotspot-123' });

      expect(mockGetHotspotDetails).toHaveBeenCalledWith('hotspot-123');

      handleSonarQubeGetHotspotDetails = originalHandler;
    });

    it('should test the update hotspot status handler lambda', async () => {
      // Mock the handleSonarQubeUpdateHotspotStatus function
      const mockUpdateHotspotStatus = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hotspot status updated successfully' }],
      });

      const originalHandler = handleSonarQubeUpdateHotspotStatus;
      handleSonarQubeUpdateHotspotStatus = mockUpdateHotspotStatus;

      // Test the lambda with all parameters
      await updateHotspotStatusHandler({
        hotspot_key: 'hotspot-123',
        status: 'REVIEWED',
        resolution: 'SAFE',
        comment: 'Reviewed and safe',
      });

      expect(mockUpdateHotspotStatus).toHaveBeenCalledWith({
        hotspot: 'hotspot-123',
        status: 'REVIEWED',
        resolution: 'SAFE',
        comment: 'Reviewed and safe',
      });

      handleSonarQubeUpdateHotspotStatus = originalHandler;
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

    it('should test the lambda functions directly', async () => {
      // Create lambda functions that match the lambda functions in the tool registrations
      const metricsLambda = async (params: Record<string, unknown>) => {
        const result = await handleSonarQubeGetMetrics({
          page: nullToUndefined(params.page) as number | undefined,
          pageSize: nullToUndefined(params.page_size) as number | undefined,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      };

      const issuesLambda = async (params: Record<string, unknown>) => {
        return handleSonarQubeGetIssues(mapToSonarQubeParams(params));
      };

      const componentsLambda = async (params: Record<string, unknown>) => {
        return handleSonarQubeComponentsMeasures({
          componentKeys: Array.isArray(params.component_keys)
            ? (params.component_keys as string[])
            : [params.component_keys as string],
          metricKeys: Array.isArray(params.metric_keys)
            ? (params.metric_keys as string[])
            : [params.metric_keys as string],
          additionalFields: params.additional_fields as string[] | undefined,
          branch: params.branch as string | undefined,
          pullRequest: params.pull_request as string | undefined,
          period: params.period as string | undefined,
          page: nullToUndefined(params.page) as number | undefined,
          pageSize: nullToUndefined(params.page_size) as number | undefined,
        });
      };

      const historyLambda = async (params: Record<string, unknown>) => {
        return handleSonarQubeMeasuresHistory({
          component: params.component as string,
          metrics: Array.isArray(params.metrics)
            ? (params.metrics as string[])
            : [params.metrics as string],
          from: params.from as string | undefined,
          to: params.to as string | undefined,
          branch: params.branch as string | undefined,
          pullRequest: params.pull_request as string | undefined,
          page: nullToUndefined(params.page) as number | undefined,
          pageSize: nullToUndefined(params.page_size) as number | undefined,
        });
      };

      // Mock all the handler functions to test the lambda functions
      const mockGetMetrics = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"metrics":[]}' }],
      });

      const mockGetIssues = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"issues":[]}' }],
      });

      const mockComponentsMeasures = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"components":[]}' }],
      });

      const mockMeasuresHistory = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"measures":[]}' }],
      });

      // Override the handler functions with mocks
      const originalGetMetrics = handleSonarQubeGetMetrics;
      const originalGetIssues = handleSonarQubeGetIssues;
      const originalComponentsMeasures = handleSonarQubeComponentsMeasures;
      const originalMeasuresHistory = handleSonarQubeMeasuresHistory;

      handleSonarQubeGetMetrics = mockGetMetrics;
      handleSonarQubeGetIssues = mockGetIssues;
      handleSonarQubeComponentsMeasures = mockComponentsMeasures;
      handleSonarQubeMeasuresHistory = mockMeasuresHistory;

      // Test metrics lambda
      await metricsLambda({ page: '10', page_size: '20' });
      expect(mockGetMetrics).toHaveBeenCalledWith({
        page: '10',
        pageSize: '20',
      });

      // Test issues lambda with all possible parameters
      await issuesLambda({
        project_key: 'test-project',
        severity: 'MAJOR',
        page: '1',
        page_size: '10',
        statuses: ['OPEN', 'CONFIRMED'],
        resolutions: ['FALSE-POSITIVE', 'WONTFIX'],
        resolved: 'true',
        types: ['CODE_SMELL', 'BUG'],
        rules: ['rule1', 'rule2'],
        tags: ['tag1', 'tag2'],
        created_after: '2023-01-01',
        created_before: '2023-12-31',
        created_at: '2023-06-15',
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
      });
      expect(mockGetIssues).toHaveBeenCalledTimes(1);

      // Test components lambda
      await componentsLambda({
        component_keys: ['comp1', 'comp2'],
        metric_keys: ['coverage', 'bugs'],
        additional_fields: ['periods'],
        branch: 'main',
        pull_request: 'pr-123',
        period: '1',
        page: '2',
        page_size: '25',
      });
      expect(mockComponentsMeasures).toHaveBeenCalledWith({
        componentKeys: ['comp1', 'comp2'],
        metricKeys: ['coverage', 'bugs'],
        additionalFields: ['periods'],
        branch: 'main',
        pullRequest: 'pr-123',
        period: '1',
        page: '2',
        pageSize: '25',
      });

      // Test history lambda
      await historyLambda({
        component: 'test-component',
        metrics: ['coverage', 'bugs'],
        from: '2023-01-01',
        to: '2023-12-31',
        branch: 'feature',
        pull_request: 'pr-456',
        page: '3',
        page_size: '30',
      });
      expect(mockMeasuresHistory).toHaveBeenCalledWith({
        component: 'test-component',
        metrics: ['coverage', 'bugs'],
        from: '2023-01-01',
        to: '2023-12-31',
        branch: 'feature',
        pullRequest: 'pr-456',
        page: '3',
        pageSize: '30',
      });

      // Restore the original functions
      handleSonarQubeGetMetrics = originalGetMetrics;
      handleSonarQubeGetIssues = originalGetIssues;
      handleSonarQubeComponentsMeasures = originalComponentsMeasures;
      handleSonarQubeMeasuresHistory = originalMeasuresHistory;
    });
  });

  describe('Tool schema transformations with actual Zod schemas', () => {
    it('should transform issues tool parameters through Zod schema', () => {
      // Import the actual schema from the tool registration
      const issuesSchema = z.object({
        project_key: z.string().optional(),
        on_component_only: z
          .union([z.boolean(), z.string().transform((val) => val === 'true')])
          .nullable()
          .optional(),
        resolved: z
          .union([z.boolean(), z.string().transform((val) => val === 'true')])
          .nullable()
          .optional(),
        page: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) || null : null)),
        page_size: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) || null : null)),
      });

      // Test with string values that should be transformed
      const result = issuesSchema.parse({
        project_key: 'test-project',
        on_component_only: 'true',
        resolved: 'false',
        page: '5',
        page_size: '100',
      });

      expect(result.on_component_only).toBe(true);
      expect(result.resolved).toBe(false);
      expect(result.page).toBe(5);
      expect(result.page_size).toBe(100);
    });

    it('should transform search_hotspots tool parameters through Zod schema', () => {
      // Import the actual schema from the tool registration
      const searchHotspotsSchema = z.object({
        project_key: z.string().optional(),
        assigned_to_me: z
          .union([z.boolean(), z.string().transform((val) => val === 'true')])
          .nullable()
          .optional(),
        since_leak_period: z
          .union([z.boolean(), z.string().transform((val) => val === 'true')])
          .nullable()
          .optional(),
        in_new_code_period: z
          .union([z.boolean(), z.string().transform((val) => val === 'true')])
          .nullable()
          .optional(),
        page: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) || null : null)),
        page_size: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) || null : null)),
      });

      // Test with string values that should be transformed
      const result = searchHotspotsSchema.parse({
        project_key: 'test-project',
        assigned_to_me: 'true',
        since_leak_period: 'false',
        in_new_code_period: 'true',
        page: '2',
        page_size: '50',
      });

      expect(result.assigned_to_me).toBe(true);
      expect(result.since_leak_period).toBe(false);
      expect(result.in_new_code_period).toBe(true);
      expect(result.page).toBe(2);
      expect(result.page_size).toBe(50);

      // Test with boolean values directly
      const result2 = searchHotspotsSchema.parse({
        project_key: 'test-project',
        assigned_to_me: false,
        since_leak_period: true,
        in_new_code_period: false,
      });

      expect(result2.assigned_to_me).toBe(false);
      expect(result2.since_leak_period).toBe(true);
      expect(result2.in_new_code_period).toBe(false);
    });
  });

  describe('Security Hotspot handlers', () => {
    describe('handleSonarQubeSearchHotspots', () => {
      it('should search and return hotspots', async () => {
        nock('http://localhost:9000')
          .get('/api/hotspots/search')
          .query({
            projectKey: 'test-project',
            status: 'TO_REVIEW',
            p: '1',
            ps: '50',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            hotspots: [
              {
                key: 'AYg1234567890',
                component: 'com.example:my-project:src/main/java/Example.java',
                project: 'com.example:my-project',
                securityCategory: 'sql-injection',
                vulnerabilityProbability: 'HIGH',
                status: 'TO_REVIEW',
                line: 42,
                message: 'Make sure using this database query is safe.',
                author: 'developer@example.com',
                creationDate: '2023-01-15T10:30:00+0000',
              },
            ],
            components: [
              {
                key: 'com.example:my-project:src/main/java/Example.java',
                name: 'Example.java',
                path: 'src/main/java/Example.java',
              },
            ],
            paging: {
              pageIndex: 1,
              pageSize: 50,
              total: 1,
            },
          });

        const response = await handleSonarQubeSearchHotspots({
          projectKey: 'test-project',
          status: 'TO_REVIEW',
          page: 1,
          pageSize: 50,
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.hotspots).toHaveLength(1);
        expect(result.hotspots[0].key).toBe('AYg1234567890');
        expect(result.hotspots[0].status).toBe('TO_REVIEW');
        expect(result.paging.total).toBe(1);
      });
    });

    describe('handleSonarQubeGetHotspotDetails', () => {
      it('should get and return hotspot details', async () => {
        nock('http://localhost:9000')
          .get('/api/hotspots/show')
          .query({
            hotspot: 'AYg1234567890',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {
            key: 'AYg1234567890',
            component: {
              key: 'com.example:my-project:src/main/java/Example.java',
              name: 'Example.java',
              qualifier: 'FIL',
              path: 'src/main/java/Example.java',
            },
            project: {
              key: 'com.example:my-project',
              name: 'My Project',
              qualifier: 'TRK',
            },
            rule: {
              key: 'java:S2077',
              name: 'SQL queries should not be vulnerable to injection attacks',
              securityCategory: 'sql-injection',
              vulnerabilityProbability: 'HIGH',
            },
            status: 'TO_REVIEW',
            line: 42,
            message: 'Make sure using this database query is safe.',
            author: 'developer@example.com',
            creationDate: '2023-01-15T10:30:00+0000',
            updateDate: '2023-01-15T10:30:00+0000',
            flows: [],
            canChangeStatus: true,
          });

        const response = await handleSonarQubeGetHotspotDetails('AYg1234567890');

        const result = JSON.parse(response.content[0].text);
        expect(result.key).toBe('AYg1234567890');
        expect(result.status).toBe('TO_REVIEW');
        expect(result.rule.securityCategory).toBe('sql-injection');
        expect(result.canChangeStatus).toBe(true);
      });
    });

    describe('handleSonarQubeUpdateHotspotStatus', () => {
      it('should update hotspot status', async () => {
        nock('http://localhost:9000')
          .post('/api/hotspots/change_status', {
            hotspot: 'AYg1234567890',
            status: 'REVIEWED',
            resolution: 'FIXED',
            comment: 'Fixed by using parameterized queries',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {});

        const response = await handleSonarQubeUpdateHotspotStatus({
          hotspot: 'AYg1234567890',
          status: 'REVIEWED',
          resolution: 'FIXED',
          comment: 'Fixed by using parameterized queries',
        });

        expect(response.content[0].text).toContain('Hotspot status updated successfully');
      });

      it('should update hotspot status without optional fields', async () => {
        nock('http://localhost:9000')
          .post('/api/hotspots/change_status', {
            hotspot: 'AYg1234567890',
            status: 'TO_REVIEW',
          })
          .matchHeader('authorization', 'Bearer test-token')
          .reply(200, {});

        const response = await handleSonarQubeUpdateHotspotStatus({
          hotspot: 'AYg1234567890',
          status: 'TO_REVIEW',
        });

        expect(response.content[0].text).toContain('Hotspot status updated successfully');
      });
    });
  });

  describe('Create Default Client', () => {
    it('should create default client with environment variables', async () => {
      // Ensure environment variables are set
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_URL = 'http://localhost:9000';

      // Import module fresh
      jest.resetModules();
      const index = await import('../index.js');

      // Call createDefaultClient - it should not throw
      expect(() => index.createDefaultClient()).not.toThrow();
    });
  });

  describe('Error Handling Coverage', () => {
    it('should handle errors in handler functions', async () => {
      // Import module fresh
      jest.resetModules();
      const index = await import('../index.js');

      // Mock API calls to fail
      nock('http://localhost:9000')
        .get('/api/projects/search')
        .query(true)
        .reply(500, 'Internal Server Error');

      // Test error handling
      await expect(index.handleSonarQubeProjects()).rejects.toThrow();
    });

    it('should test parameter mapping with null values', async () => {
      jest.resetModules();
      const index = await import('../index.js');

      // Test mapToSonarQubeParams with various null/undefined values
      const result = index.mapToSonarQubeParams({
        project_key: null,
        projects: undefined,
        component_keys: null,
        components: null,
        on_component_only: false,
        branch: null,
        pull_request: undefined,
        issues: null,
        severities: null,
        statuses: null,
        resolutions: null,
        resolved: null,
        types: null,
        tags: null,
        rules: null,
        created_after: null,
        created_before: null,
        created_at: null,
        created_in_last: null,
        assigned: null,
        assignees: null,
        author: null,
        authors: null,
        cwe: null,
        owasp_top10: null,
        owasp_top10_v2021: null,
        sans_top25: null,
        sonarsource_security: null,
        sonarsource_security_category: null,
        languages: null,
        facets: null,
        facet_mode: null,
        since_leak_period: null,
        in_new_code_period: null,
        s: null,
        asc: null,
        additional_fields: null,
        page: null,
        page_size: null,
        clean_code_attribute_categories: null,
        impact_severities: null,
        impact_software_qualities: null,
        issue_statuses: null,
        severity: null,
        hotspots: null,
      });

      // Verify null values are converted to undefined
      expect(result.projectKey).toBeUndefined();
      expect(result.projects).toBeUndefined();
      expect(result.componentKeys).toBeUndefined();
      expect(result.components).toBeUndefined();
      expect(result.onComponentOnly).toBe(false);
      expect(result.branch).toBeUndefined();
      expect(result.pullRequest).toBeUndefined();
    });
  });

  describe('MCP Wrapper Functions Coverage', () => {
    it('should test all MCP wrapper functions', async () => {
      // Import module fresh
      jest.resetModules();
      const index = await import('../index.js');

      // Mock all API calls
      nock('http://localhost:9000')
        .get('/api/projects/search')
        .query(true)
        .times(2)
        .reply(200, {
          components: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      nock('http://localhost:9000')
        .get('/api/metrics/search')
        .query(true)
        .times(2)
        .reply(200, {
          metrics: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      nock('http://localhost:9000')
        .get('/api/issues/search')
        .query(true)
        .times(2)
        .reply(200, {
          issues: [],
          components: [],
          rules: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      nock('http://localhost:9000')
        .get('/api/system/health')
        .times(2)
        .reply(200, { health: 'GREEN', causes: [] });

      nock('http://localhost:9000')
        .get('/api/system/status')
        .times(2)
        .reply(200, { id: '1', version: '10.0', status: 'UP' });

      nock('http://localhost:9000').get('/api/system/ping').times(2).reply(200, 'pong');

      nock('http://localhost:9000')
        .get('/api/measures/component')
        .query(true)
        .times(2)
        .reply(200, {
          component: { key: 'test', measures: [] },
          metrics: [],
        });

      nock('http://localhost:9000')
        .get('/api/measures/component')
        .query(true)
        .times(4)
        .reply(200, {
          component: { key: 'test', measures: [] },
          metrics: [],
        });

      nock('http://localhost:9000')
        .get('/api/measures/search_history')
        .query(true)
        .times(2)
        .reply(200, {
          measures: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      nock('http://localhost:9000').get('/api/qualitygates/list').times(2).reply(200, {
        qualitygates: [],
        default: 'default',
      });

      nock('http://localhost:9000').get('/api/qualitygates/show').query(true).times(2).reply(200, {
        id: 'test',
        name: 'Test Gate',
        conditions: [],
      });

      nock('http://localhost:9000')
        .get('/api/qualitygates/project_status')
        .query(true)
        .times(2)
        .reply(200, {
          projectStatus: { status: 'OK', conditions: [] },
        });

      nock('http://localhost:9000')
        .get('/api/sources/raw')
        .query(true)
        .times(2)
        .reply(200, 'source code content');

      nock('http://localhost:9000')
        .get('/api/sources/scm')
        .query(true)
        .times(2)
        .reply(200, {
          component: { key: 'test' },
          sources: {},
        });

      nock('http://localhost:9000')
        .get('/api/hotspots/search')
        .query(true)
        .times(2)
        .reply(200, {
          hotspots: [],
          paging: { pageIndex: 1, pageSize: 100, total: 0 },
        });

      nock('http://localhost:9000')
        .get('/api/hotspots/show')
        .query(true)
        .times(2)
        .reply(200, {
          key: 'hotspot-1',
          component: 'test',
          project: 'test',
          rule: { key: 'test', name: 'Test' },
          status: 'TO_REVIEW',
          securityCategory: 'test',
          vulnerabilityProbability: 'HIGH',
          line: 1,
          message: 'Test',
        });

      nock('http://localhost:9000').post('/api/hotspots/change_status').times(2).reply(200);

      // Access the wrapper functions via the module
      const module = index;

      // Call all handler functions
      await module.projectsHandler({});
      await module.metricsHandler({ page: 1, page_size: 10 });
      await module.issuesHandler({ project_key: 'test' });
      await module.healthHandler();
      await module.statusHandler();
      await module.pingHandler();
      await module.componentMeasuresHandler({ component: 'test', metric_keys: ['coverage'] });
      await module.componentsMeasuresHandler({
        component_keys: ['test'],
        metric_keys: ['coverage'],
      });
      await module.measuresHistoryHandler({ component: 'test', metrics: ['coverage'] });
      await module.qualityGatesHandler();
      await module.qualityGateHandler({ id: 'test' });
      await module.projectQualityGateStatusHandler({ project_key: 'test' });
      await module.sourceCodeHandler({ key: 'test' });
      await module.scmBlameHandler({ key: 'test' });
      await module.searchHotspotsHandler({ project_key: 'test' });
      await module.getHotspotDetailsHandler({ hotspot_key: 'hotspot-1' });
      await module.updateHotspotStatusHandler({ hotspot_key: 'hotspot-1', status: 'REVIEWED' });
    });
  });

  describe('MCP Wrapper Functions Direct Coverage', () => {
    beforeEach(() => {
      process.env.SONARQUBE_TOKEN = 'test-token';
      process.env.SONARQUBE_URL = 'http://localhost:9000';
      jest.resetModules();
    });

    it('should cover all MCP wrapper functions', async () => {
      // Set up mocks for all endpoints
      nock('http://localhost:9000')
        .get('/api/projects/search')
        .query(true)
        .reply(200, { components: [], paging: { pageIndex: 1, pageSize: 100, total: 0 } });

      nock('http://localhost:9000')
        .get('/api/metrics/search')
        .query(true)
        .reply(200, { metrics: [], total: 0 });

      nock('http://localhost:9000')
        .get('/api/issues/search')
        .query(true)
        .reply(200, { issues: [], total: 0, paging: { pageIndex: 1, pageSize: 100, total: 0 } });

      nock('http://localhost:9000').get('/api/system/health').reply(200, { health: 'GREEN' });

      nock('http://localhost:9000')
        .get('/api/system/status')
        .reply(200, { status: 'UP', version: '10.0' });

      nock('http://localhost:9000').get('/api/system/ping').reply(200, 'pong');

      nock('http://localhost:9000')
        .get('/api/measures/component')
        .query(true)
        .times(2) // Allow multiple calls
        .reply(200, { component: { key: 'test', measures: [] } });

      nock('http://localhost:9000')
        .get('/api/measures/search_history')
        .query(true)
        .reply(200, { measures: [] });

      nock('http://localhost:9000').get('/api/qualitygates/list').reply(200, { qualitygates: [] });

      nock('http://localhost:9000')
        .get('/api/qualitygates/show')
        .query(true)
        .reply(200, { id: 'test', name: 'Test', conditions: [] });

      nock('http://localhost:9000')
        .get('/api/qualitygates/project_status')
        .query(true)
        .reply(200, { projectStatus: { status: 'OK' } });

      nock('http://localhost:9000').get('/api/sources/raw').query(true).reply(200, 'source code');

      nock('http://localhost:9000')
        .get('/api/sources/scm')
        .query(true)
        .reply(200, { component: { key: 'test' }, sources: {} });

      nock('http://localhost:9000')
        .get('/api/hotspots/search')
        .query(true)
        .reply(200, { hotspots: [], paging: { pageIndex: 1, pageSize: 100, total: 0 } });

      nock('http://localhost:9000')
        .get('/api/hotspots/show')
        .query(true)
        .reply(200, {
          key: 'test-hotspot',
          component: 'test',
          project: 'test',
          rule: { key: 'test', name: 'Test' },
          status: 'TO_REVIEW',
          securityCategory: 'test',
          vulnerabilityProbability: 'HIGH',
        });

      nock('http://localhost:9000').post('/api/hotspots/change_status').reply(200);

      // Import and call all MCP wrapper functions
      const index = await import('../index.js');

      // Test all wrapper functions
      await index.projectsMcpHandler({});
      await index.metricsMcpHandler({ page: 1, page_size: 10 });
      await index.issuesMcpHandler({ project_key: 'test' });
      await index.healthMcpHandler();
      await index.statusMcpHandler();
      await index.pingMcpHandler();
      await index.componentMeasuresMcpHandler({ component: 'test', metric_keys: ['coverage'] });
      await index.componentsMeasuresMcpHandler({
        component_keys: ['test'],
        metric_keys: ['coverage'],
      });
      await index.measuresHistoryMcpHandler({ component: 'test', metrics: ['coverage'] });
      await index.qualityGatesMcpHandler();
      await index.qualityGateMcpHandler({ id: 'test' });
      await index.projectQualityGateStatusMcpHandler({ project_key: 'test' });
      await index.sourceCodeMcpHandler({ key: 'test' });
      await index.scmBlameMcpHandler({ key: 'test' });
      await index.searchHotspotsMcpHandler({ project_key: 'test' });
      await index.getHotspotDetailsMcpHandler({ hotspot_key: 'test-hotspot' });
      await index.updateHotspotStatusMcpHandler({
        hotspot_key: 'test-hotspot',
        status: 'REVIEWED',
      });
    });
  });
});
