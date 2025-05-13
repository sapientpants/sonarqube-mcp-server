/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockSonarQubeClient } from './mocks/sonarqube-client.mock.js';
import { MockHttpClient } from './mocks/http-client.mock.js';
import {
  createDefaultClient,
  handleSonarQubeProjects,
  handleSonarQubeGetIssues,
  handleSonarQubeGetMetrics,
  handleSonarQubeGetHealth,
  handleSonarQubeGetStatus,
  handleSonarQubePing,
  handleSonarQubeComponentMeasures,
  handleSonarQubeComponentsMeasures,
  handleSonarQubeMeasuresHistory,
  mapToSonarQubeParams,
} from '../index.js';
import { createSonarQubeClient } from '../sonarqube.js';

// Save original environment variables
const originalEnv = process.env;

describe('Dependency Injection Tests', () => {
  let mockClient: MockSonarQubeClient;
  let mockHttpClient: MockHttpClient;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.SONARQUBE_TOKEN = 'test-token';
    process.env.SONARQUBE_URL = 'http://localhost:9000';
    process.env.SONARQUBE_ORGANIZATION = 'test-org';

    // Create fresh mock instances for each test
    mockClient = new MockSonarQubeClient();
    mockHttpClient = new MockHttpClient();
    mockHttpClient.mockCommonEndpoints();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Client Creation', () => {
    it('should create a client with default parameters', () => {
      // Test the factory function
      const client = createSonarQubeClient('test-token');
      expect(client).toBeDefined();
    });

    it('should create a client with custom HTTP client', () => {
      // Test that we can inject a custom HTTP client
      const client = createSonarQubeClient('test-token', undefined, undefined, mockHttpClient);
      expect(client).toBeDefined();
    });

    it('should create a default client using environment variables', () => {
      // Test the default client creation function
      const client = createDefaultClient();
      expect(client).toBeDefined();
    });
  });

  describe('Handler Functions with Dependency Injection', () => {
    it('should handle projects with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.listProjectsMock.mockResolvedValueOnce({
        projects: [
          { key: 'custom-project', name: 'Custom Project', qualifier: 'TRK', visibility: 'public' },
        ],
        paging: { pageIndex: 2, pageSize: 5, total: 10 },
      });

      // Call the handler with our mock client
      const result = await handleSonarQubeProjects({ page: 2, page_size: 5 }, mockClient);

      // Verify the mock was called with the correct parameters
      expect(mockClient.listProjectsMock).toHaveBeenCalledWith({ page: 2, pageSize: 5 });

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.projects[0].key).toBe('custom-project');
      expect(data.paging.pageIndex).toBe(2);
      expect(data.paging.pageSize).toBe(5);
    });

    it('should handle issues with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getIssuesMock.mockResolvedValueOnce({
        issues: [
          {
            key: 'custom-issue',
            rule: 'custom-rule',
            severity: 'CRITICAL',
            component: 'custom-comp',
            project: 'custom-project',
            status: 'OPEN',
            message: 'Custom issue message',
            tags: ['tag1', 'tag2'],
            creationDate: '2023-02-01',
            updateDate: '2023-02-02',
          },
        ],
        components: [{ key: 'custom-comp', name: 'Custom Component', qualifier: 'FIL' }],
        rules: [
          {
            key: 'custom-rule',
            name: 'Custom Rule',
            status: 'READY',
            lang: 'java',
            langName: 'Java',
          },
        ],
        paging: { pageIndex: 3, pageSize: 10, total: 30 },
      });

      // Create params for issues
      const params = {
        projectKey: 'custom-project',
        severity: 'CRITICAL',
        page: 3,
        pageSize: 10,
      };

      // Call the handler with our mock client
      const result = await handleSonarQubeGetIssues(params, mockClient);

      // Verify the mock was called with the correct parameters
      expect(mockClient.getIssuesMock).toHaveBeenCalledWith(params);

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.issues[0].key).toBe('custom-issue');
      expect(data.issues[0].severity).toBe('CRITICAL');
      expect(data.paging.pageIndex).toBe(3);
    });

    it('should handle metrics with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getMetricsMock.mockResolvedValueOnce({
        metrics: [
          {
            id: 'custom-id',
            key: 'custom-metric',
            name: 'Custom Metric',
            description: 'A custom metric for testing',
            domain: 'Test',
            type: 'PERCENT',
            direction: 1,
            qualitative: true,
            hidden: false,
            custom: true,
          },
        ],
        paging: { pageIndex: 1, pageSize: 20, total: 1 },
      });

      // Call the handler with our mock client
      const result = await handleSonarQubeGetMetrics({ page: 1, pageSize: 20 }, mockClient);

      // Verify the mock was called with the correct parameters
      expect(mockClient.getMetricsMock).toHaveBeenCalledWith({ page: 1, pageSize: 20 });

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.metrics[0].key).toBe('custom-metric');
      expect(data.paging.pageSize).toBe(20);
    });

    it('should handle health status with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getHealthMock.mockResolvedValueOnce({
        health: 'YELLOW',
        causes: ['Database needs migration'],
      });

      // Call the handler with our mock client
      const result = await handleSonarQubeGetHealth(mockClient);

      // Verify the mock was called
      expect(mockClient.getHealthMock).toHaveBeenCalled();

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.health).toBe('YELLOW');
      expect(data.causes).toContain('Database needs migration');
    });

    it('should handle system status with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getStatusMock.mockResolvedValueOnce({
        id: 'custom-id',
        version: '11.0.0',
        status: 'STARTING',
      });

      // Call the handler with our mock client
      const result = await handleSonarQubeGetStatus(mockClient);

      // Verify the mock was called
      expect(mockClient.getStatusMock).toHaveBeenCalled();

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.version).toBe('11.0.0');
      expect(data.status).toBe('STARTING');
    });

    it('should handle ping with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.pingMock.mockResolvedValueOnce('custom-pong');

      // Call the handler with our mock client
      const result = await handleSonarQubePing(mockClient);

      // Verify the mock was called
      expect(mockClient.pingMock).toHaveBeenCalled();

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('custom-pong');
    });

    it('should handle component measures with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getComponentMeasuresMock.mockResolvedValueOnce({
        component: {
          key: 'custom-component',
          name: 'Custom Component',
          qualifier: 'TRK',
          measures: [{ metric: 'custom-metric', value: '95.0' }],
        },
        metrics: [
          {
            id: 'custom-id',
            key: 'custom-metric',
            name: 'Custom Metric',
            description: 'A custom metric',
            domain: 'Test',
            type: 'PERCENT',
            direction: 1,
            qualitative: true,
            hidden: false,
            custom: true,
          },
        ],
      });

      // Create params for component measures
      const params = {
        component: 'custom-component',
        metricKeys: ['custom-metric'],
        branch: 'main',
      };

      // Call the handler with our mock client
      const result = await handleSonarQubeComponentMeasures(params, mockClient);

      // Verify the mock was called with the correct parameters
      expect(mockClient.getComponentMeasuresMock).toHaveBeenCalledWith(params);

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.component.key).toBe('custom-component');
      expect(data.component.measures[0].metric).toBe('custom-metric');
      expect(data.component.measures[0].value).toBe('95.0');
    });

    it('should handle components measures with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getComponentsMeasuresMock.mockResolvedValueOnce({
        components: [
          {
            key: 'custom-component-1',
            name: 'Custom Component 1',
            qualifier: 'TRK',
            measures: [{ metric: 'custom-metric', value: '95.0' }],
          },
          {
            key: 'custom-component-2',
            name: 'Custom Component 2',
            qualifier: 'TRK',
            measures: [{ metric: 'custom-metric', value: '85.0' }],
          },
        ],
        metrics: [
          {
            id: 'custom-id',
            key: 'custom-metric',
            name: 'Custom Metric',
            description: 'A custom metric',
            domain: 'Test',
            type: 'PERCENT',
            direction: 1,
            qualitative: true,
            hidden: false,
            custom: true,
          },
        ],
        paging: { pageIndex: 1, pageSize: 10, total: 2 },
      });

      // Create params for components measures
      const params = {
        componentKeys: ['custom-component-1', 'custom-component-2'],
        metricKeys: ['custom-metric'],
        branch: 'main',
        page: 1,
        pageSize: 10,
      };

      // Call the handler with our mock client
      const result = await handleSonarQubeComponentsMeasures(params, mockClient);

      // Verify the mock was called with the correct parameters
      expect(mockClient.getComponentsMeasuresMock).toHaveBeenCalledWith(params);

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.components.length).toBe(2);
      expect(data.components[0].key).toBe('custom-component-1');
      expect(data.components[1].key).toBe('custom-component-2');
      expect(data.components[0].measures[0].value).toBe('95.0');
      expect(data.components[1].measures[0].value).toBe('85.0');
    });

    it('should handle measures history with injected client', async () => {
      // Set up the mock client to return a specific response
      mockClient.getMeasuresHistoryMock.mockResolvedValueOnce({
        measures: [
          {
            metric: 'custom-metric',
            history: [
              { date: '2023-01-01', value: '80.0' },
              { date: '2023-02-01', value: '85.0' },
              { date: '2023-03-01', value: '90.0' },
            ],
          },
        ],
        paging: { pageIndex: 1, pageSize: 10, total: 1 },
      });

      // Create params for measures history
      const params = {
        component: 'custom-component',
        metrics: ['custom-metric'],
        from: '2023-01-01',
        to: '2023-03-01',
      };

      // Call the handler with our mock client
      const result = await handleSonarQubeMeasuresHistory(params, mockClient);

      // Verify the mock was called with the correct parameters
      expect(mockClient.getMeasuresHistoryMock).toHaveBeenCalledWith(params);

      // Verify the result was correctly processed
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.measures[0].metric).toBe('custom-metric');
      expect(data.measures[0].history.length).toBe(3);
      expect(data.measures[0].history[0].date).toBe('2023-01-01');
      expect(data.measures[0].history[0].value).toBe('80.0');
      expect(data.measures[0].history[2].value).toBe('90.0');
    });
  });

  describe('Lambda Functions and Parameter Mappings', () => {
    it('should map MCP parameters to SonarQube parameters', () => {
      const mcpParams = {
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
        created_before: '2023-12-31',
        on_component_only: 'true',
        since_leak_period: 'true',
      };

      const result = mapToSonarQubeParams(mcpParams);

      expect(result.projectKey).toBe('test-project');
      expect(result.severity).toBe('MAJOR');
      expect(result.page).toBe('2');
      expect(result.pageSize).toBe('10');
      expect(result.statuses).toEqual(['OPEN', 'CONFIRMED']);
      expect(result.resolved).toBe('true');
      expect(result.types).toEqual(['BUG', 'VULNERABILITY']);
      expect(result.rules).toEqual(['rule1', 'rule2']);
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.createdAfter).toBe('2023-01-01');
      expect(result.createdBefore).toBe('2023-12-31');
      expect(result.onComponentOnly).toBe('true');
      expect(result.sinceLeakPeriod).toBe('true');
    });

    it('should handle null values properly in parameter mapping', () => {
      const mcpParams = {
        project_key: 'test-project',
        severity: null,
        page: null,
        statuses: null,
      };

      const result = mapToSonarQubeParams(mcpParams);

      expect(result.projectKey).toBe('test-project');
      expect(result.severity).toBeUndefined();
      expect(result.page).toBeUndefined();
      expect(result.statuses).toBeUndefined();
    });
  });
});
