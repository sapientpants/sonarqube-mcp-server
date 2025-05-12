/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';

// Mock environment variables
process.env.SONARQUBE_TOKEN = 'test-token';
process.env.SONARQUBE_URL = 'http://localhost:9000';
process.env.SONARQUBE_ORGANIZATION = 'test-org';

// Save environment variables
const originalEnv = process.env;

// Mock all the needed imports
jest.mock('../sonarqube.js', () => {
  return {
    SonarQubeClient: jest.fn().mockImplementation(() => ({
      listProjects: jest.fn().mockResolvedValue({
        projects: [
          {
            key: 'test-project',
            name: 'Test Project',
            qualifier: 'TRK',
            visibility: 'public',
            lastAnalysisDate: '2023-01-01',
            revision: 'abc123',
            managed: false,
          },
        ],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getIssues: jest.fn().mockResolvedValue({
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
            tags: [],
            creationDate: '2023-01-01',
            updateDate: '2023-01-01',
          },
        ],
        components: [],
        rules: [],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getMetrics: jest.fn().mockResolvedValue({
        metrics: [
          {
            key: 'coverage',
            name: 'Coverage',
            description: 'Test coverage',
            domain: 'Coverage',
            type: 'PERCENT',
          },
        ],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getHealth: jest.fn().mockResolvedValue({
        health: 'GREEN',
        causes: [],
      }),
      getStatus: jest.fn().mockResolvedValue({
        id: 'test-id',
        version: '10.3.0.82913',
        status: 'UP',
      }),
      ping: jest.fn().mockResolvedValue('pong'),
      getComponentMeasures: jest.fn().mockResolvedValue({
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
            description: 'Test coverage percentage',
            domain: 'Coverage',
            type: 'PERCENT',
          },
        ],
      }),
      getComponentsMeasures: jest.fn().mockResolvedValue({
        components: [
          {
            key: 'test-component-1',
            name: 'Test Component 1',
            qualifier: 'TRK',
            measures: [
              {
                metric: 'coverage',
                value: '85.4',
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
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
      getMeasuresHistory: jest.fn().mockResolvedValue({
        measures: [
          {
            metric: 'coverage',
            history: [
              {
                date: '2023-01-01T00:00:00+0000',
                value: '85.4',
              },
            ],
          },
        ],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      }),
    })),
  };
});

describe('Tool Handlers with Mocked Client', () => {
  let handlers;

  beforeAll(async () => {
    const module = await import('../index.js');
    handlers = {
      handleSonarQubeProjects: module.handleSonarQubeProjects,
      handleSonarQubeGetIssues: module.handleSonarQubeGetIssues,
      handleSonarQubeGetMetrics: module.handleSonarQubeGetMetrics,
      handleSonarQubeGetHealth: module.handleSonarQubeGetHealth,
      handleSonarQubeGetStatus: module.handleSonarQubeGetStatus,
      handleSonarQubePing: module.handleSonarQubePing,
      handleSonarQubeComponentMeasures: module.handleSonarQubeComponentMeasures,
      handleSonarQubeComponentsMeasures: module.handleSonarQubeComponentsMeasures,
      handleSonarQubeMeasuresHistory: module.handleSonarQubeMeasuresHistory,
      mapToSonarQubeParams: module.mapToSonarQubeParams,
      nullToUndefined: module.nullToUndefined,
    };
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Core Handlers', () => {
    it('should handle projects correctly', async () => {
      const result = await handlers.handleSonarQubeProjects({});
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toBeDefined();
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].key).toBe('test-project');
    });

    it('should handle issues correctly', async () => {
      const result = await handlers.handleSonarQubeGetIssues({ projectKey: 'test-project' });
      const data = JSON.parse(result.content[0].text);

      expect(data.issues).toBeDefined();
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].severity).toBe('MAJOR');
    });

    it('should handle metrics correctly', async () => {
      const result = await handlers.handleSonarQubeGetMetrics({});
      const data = JSON.parse(result.content[0].text);

      expect(data.metrics).toBeDefined();
      expect(data.metrics).toHaveLength(1);
      expect(data.metrics[0].key).toBe('coverage');
    });
  });

  describe('System API Handlers', () => {
    it('should handle health correctly', async () => {
      const result = await handlers.handleSonarQubeGetHealth();
      const data = JSON.parse(result.content[0].text);

      expect(data.health).toBe('GREEN');
    });

    it('should handle status correctly', async () => {
      const result = await handlers.handleSonarQubeGetStatus();
      const data = JSON.parse(result.content[0].text);

      expect(data.status).toBe('UP');
    });

    it('should handle ping correctly', async () => {
      const result = await handlers.handleSonarQubePing();
      expect(result.content[0].text).toBe('pong');
    });
  });

  describe('Measures API Handlers', () => {
    it('should handle component measures correctly', async () => {
      const result = await handlers.handleSonarQubeComponentMeasures({
        component: 'test-component',
        metricKeys: ['coverage'],
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.component).toBeDefined();
      expect(data.component.key).toBe('test-component');
    });

    it('should handle components measures correctly', async () => {
      const result = await handlers.handleSonarQubeComponentsMeasures({
        componentKeys: ['test-component-1'],
        metricKeys: ['coverage'],
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.components).toBeDefined();
      expect(data.components).toHaveLength(1);
      expect(data.components[0].key).toBe('test-component-1');
    });

    it('should handle measures history correctly', async () => {
      const result = await handlers.handleSonarQubeMeasuresHistory({
        component: 'test-component',
        metrics: ['coverage'],
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.measures).toBeDefined();
      expect(data.measures).toHaveLength(1);
      expect(data.measures[0].metric).toBe('coverage');
    });
  });

  describe('Utility Functions', () => {
    it('should map tool parameters correctly', () => {
      const params = handlers.mapToSonarQubeParams({
        project_key: 'test-project',
        severity: 'MAJOR',
        page: 1,
        page_size: 10,
        resolved: true,
      });

      expect(params.projectKey).toBe('test-project');
      expect(params.severity).toBe('MAJOR');
      expect(params.page).toBe(1);
      expect(params.pageSize).toBe(10);
      expect(params.resolved).toBe(true);
    });

    it('should handle null to undefined conversion', () => {
      expect(handlers.nullToUndefined(null)).toBeUndefined();
      expect(handlers.nullToUndefined('value')).toBe('value');
      expect(handlers.nullToUndefined(123)).toBe(123);
    });
  });

  describe('Lambda Function Simulation', () => {
    it('should handle metrics lambda correctly', async () => {
      // Create a lambda function similar to what's registered in index.ts
      const metricsLambda = async (params) => {
        const result = await handlers.handleSonarQubeGetMetrics({
          page: handlers.nullToUndefined(params.page),
          pageSize: handlers.nullToUndefined(params.page_size),
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

      const result = await metricsLambda({ page: '1', page_size: '10' });
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle issues lambda correctly', async () => {
      // Create a lambda function similar to what's registered in index.ts
      const issuesLambda = async (params) => {
        return handlers.handleSonarQubeGetIssues(handlers.mapToSonarQubeParams(params));
      };

      const result = await issuesLambda({ project_key: 'test-project', severity: 'MAJOR' });
      const data = JSON.parse(result.content[0].text);
      expect(data.issues).toBeDefined();
    });

    it('should handle measures component lambda correctly', async () => {
      // Create a lambda function similar to what's registered in index.ts
      const measuresLambda = async (params) => {
        return handlers.handleSonarQubeComponentMeasures({
          component: params.component,
          metricKeys: Array.isArray(params.metric_keys) ? params.metric_keys : [params.metric_keys],
          additionalFields: params.additional_fields,
          branch: params.branch,
          pullRequest: params.pull_request,
          period: params.period,
        });
      };

      const result = await measuresLambda({
        component: 'test-component',
        metric_keys: 'coverage',
        branch: 'main',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.component).toBeDefined();
    });

    it('should handle measures components lambda correctly', async () => {
      // Create a lambda function similar to what's registered in index.ts
      const componentsLambda = async (params) => {
        return handlers.handleSonarQubeComponentsMeasures({
          componentKeys: Array.isArray(params.component_keys)
            ? params.component_keys
            : [params.component_keys],
          metricKeys: Array.isArray(params.metric_keys) ? params.metric_keys : [params.metric_keys],
          additionalFields: params.additional_fields,
          branch: params.branch,
          pullRequest: params.pull_request,
          period: params.period,
          page: handlers.nullToUndefined(params.page),
          pageSize: handlers.nullToUndefined(params.page_size),
        });
      };

      const result = await componentsLambda({
        component_keys: ['test-component-1'],
        metric_keys: ['coverage'],
        page: '1',
        page_size: '10',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.components).toBeDefined();
    });

    it('should handle measures history lambda correctly', async () => {
      // Create a lambda function similar to what's registered in index.ts
      const historyLambda = async (params) => {
        return handlers.handleSonarQubeMeasuresHistory({
          component: params.component,
          metrics: Array.isArray(params.metrics) ? params.metrics : [params.metrics],
          from: params.from,
          to: params.to,
          branch: params.branch,
          pullRequest: params.pull_request,
          page: handlers.nullToUndefined(params.page),
          pageSize: handlers.nullToUndefined(params.page_size),
        });
      };

      const result = await historyLambda({
        component: 'test-component',
        metrics: 'coverage',
        from: '2023-01-01',
        to: '2023-12-31',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.measures).toBeDefined();
    });
  });
});
