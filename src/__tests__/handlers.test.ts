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

/* eslint-disable @typescript-eslint/no-explicit-any */
let handleSonarQubeProjects: any;
let handleSonarQubeGetIssues: any;
let handleSonarQubeGetMetrics: any;
let handleSonarQubeGetHealth: any;
let handleSonarQubeGetStatus: any;
let handleSonarQubePing: any;
let handleSonarQubeComponentMeasures: any;
let handleSonarQubeComponentsMeasures: any;
let handleSonarQubeMeasuresHistory: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

jest.mock('axios', () => ({
  get: jest.fn().mockImplementation((url) => {
    // Mock successful responses for all API calls
    if (url.includes('/api/projects/search')) {
      return Promise.resolve({
        data: {
          components: [
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
        },
      });
    }

    if (url.includes('/api/issues/search')) {
      return Promise.resolve({
        data: {
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
        },
      });
    }

    if (url.includes('/api/metrics/search')) {
      return Promise.resolve({
        data: {
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
        },
      });
    }

    if (url.includes('/api/system/health')) {
      return Promise.resolve({
        data: {
          health: 'GREEN',
          causes: [],
        },
      });
    }

    if (url.includes('/api/system/status')) {
      return Promise.resolve({
        data: {
          id: 'test-id',
          version: '10.3.0.82913',
          status: 'UP',
        },
      });
    }

    if (url.includes('/api/system/ping')) {
      return Promise.resolve({
        data: 'pong',
      });
    }

    if (url.includes('/api/measures/component')) {
      return Promise.resolve({
        data: {
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
        },
      });
    }

    if (url.includes('/api/measures/components')) {
      return Promise.resolve({
        data: {
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
        },
      });
    }

    if (url.includes('/api/measures/search_history')) {
      return Promise.resolve({
        data: {
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
        },
      });
    }

    // Default response if no specific mock is defined
    return Promise.resolve({
      data: {},
    });
  }),
}));

describe('Handler Functions', () => {
  beforeAll(async () => {
    const module = await import('../index.js');
    handleSonarQubeProjects = module.handleSonarQubeProjects;
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
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('handleSonarQubeProjects', () => {
    it('should handle projects correctly', async () => {
      const result = await handleSonarQubeProjects({});
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toBeDefined();
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].key).toBe('test-project');
      expect(data.paging).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      const result = await handleSonarQubeProjects({ page: 2, page_size: 10 });
      const data = JSON.parse(result.content[0].text);

      expect(data.projects).toBeDefined();
      expect(data.paging).toBeDefined();
    });
  });

  describe('handleSonarQubeGetIssues', () => {
    it('should handle issues correctly', async () => {
      const result = await handleSonarQubeGetIssues({ projectKey: 'test-project' });
      const data = JSON.parse(result.content[0].text);

      expect(data.issues).toBeDefined();
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].severity).toBe('MAJOR');
      expect(data.paging).toBeDefined();
    });
  });

  describe('handleSonarQubeGetMetrics', () => {
    it('should handle metrics correctly', async () => {
      const result = await handleSonarQubeGetMetrics({});
      const data = JSON.parse(result.content[0].text);

      expect(data.metrics).toBeDefined();
      expect(data.metrics).toHaveLength(1);
      expect(data.metrics[0].key).toBe('coverage');
      expect(data.paging).toBeDefined();
    });
  });

  describe('System API Handlers', () => {
    it('should handle health correctly', async () => {
      const result = await handleSonarQubeGetHealth();
      const data = JSON.parse(result.content[0].text);

      expect(data.health).toBe('GREEN');
      expect(data.causes).toEqual([]);
    });

    it('should handle status correctly', async () => {
      const result = await handleSonarQubeGetStatus();
      const data = JSON.parse(result.content[0].text);

      expect(data.id).toBe('test-id');
      expect(data.version).toBe('10.3.0.82913');
      expect(data.status).toBe('UP');
    });

    it('should handle ping correctly', async () => {
      const result = await handleSonarQubePing();
      expect(result.content[0].text).toBe('pong');
    });
  });

  describe('Measures API Handlers', () => {
    it('should handle component measures correctly', async () => {
      const result = await handleSonarQubeComponentMeasures({
        component: 'test-component',
        metricKeys: ['coverage'],
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.component).toBeDefined();
      expect(data.component.key).toBe('test-component');
      expect(data.component.measures).toHaveLength(1);
      expect(data.component.measures[0].metric).toBe('coverage');
      expect(data.metrics).toBeDefined();
    });

    it('should handle components measures correctly', async () => {
      const result = await handleSonarQubeComponentsMeasures({
        componentKeys: ['test-component-1'],
        metricKeys: ['coverage'],
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.components).toBeDefined();
      expect(data.components).toHaveLength(1);
      expect(data.components[0].key).toBe('test-component-1');
      expect(data.metrics).toBeDefined();
      expect(data.paging).toBeDefined();
    });

    it('should handle measures history correctly', async () => {
      const result = await handleSonarQubeMeasuresHistory({
        component: 'test-component',
        metrics: ['coverage'],
      });
      const data = JSON.parse(result.content[0].text);

      expect(data.measures).toBeDefined();
      expect(data.measures).toHaveLength(1);
      expect(data.measures[0].metric).toBe('coverage');
      expect(data.measures[0].history).toHaveLength(1);
      expect(data.paging).toBeDefined();
    });
  });
});
