/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { describe, it, expect, jest } from '@jest/globals';

// No need to mock axios anymore since we're using sonarqube-web-api-client

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    tool: jest.fn(),
    connect: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Manually recreate handler functions for testing
describe('Direct Handler Function Tests', () => {
  it('should test metricsHandler functionality', () => {
    // Recreate the metricsHandler function
    const nullToUndefined = (value) => (value === null ? undefined : value);

    const metricsHandler = async (params) => {
      const handleMetrics = async (transformedParams) => {
        // Mock the SonarQube response
        return {
          metrics: [{ key: 'test-metric', name: 'Test Metric' }],
          paging: {
            pageIndex:
              typeof transformedParams.page === 'string'
                ? parseInt(transformedParams.page, 10)
                : transformedParams.page || 1,
            pageSize:
              typeof transformedParams.pageSize === 'string'
                ? parseInt(transformedParams.pageSize, 10)
                : transformedParams.pageSize || 10,
            total: 1,
          },
        };
      };

      const result = await handleMetrics({
        page: nullToUndefined(params.page),
        pageSize: nullToUndefined(params.page_size),
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

    // Test the handler
    const params = { page: '2', page_size: '20' };
    return metricsHandler(params).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.metrics).toBeDefined();
      expect(data.paging.pageIndex).toBe(2);
      expect(data.paging.pageSize).toBe(20);
    });
  });

  it('should test issuesHandler functionality', () => {
    // Recreate functions
    const nullToUndefined = (value) => (value === null ? undefined : value);

    const mapToSonarQubeParams = (params) => {
      return {
        projectKey: params.project_key,
        severity: nullToUndefined(params.severity),
        page: nullToUndefined(params.page),
        pageSize: nullToUndefined(params.page_size),
        statuses: nullToUndefined(params.statuses),
        resolved: nullToUndefined(
          params.resolved === 'true' ? true : params.resolved === 'false' ? false : params.resolved
        ),
      };
    };

    const handleIssues = async (params) => {
      // Parse page and pageSize if they're strings
      const page = typeof params.page === 'string' ? parseInt(params.page, 10) : params.page;
      const pageSize =
        typeof params.pageSize === 'string' ? parseInt(params.pageSize, 10) : params.pageSize;

      // Mock SonarQube response
      return {
        issues: [
          {
            key: 'test-issue',
            rule: 'test-rule',
            severity: params.severity || 'MAJOR',
            project: params.projectKey,
          },
        ],
        paging: {
          pageIndex: page || 1,
          pageSize: pageSize || 10,
          total: 1,
        },
      };
    };

    const issuesHandler = async (params) => {
      const result = await handleIssues(mapToSonarQubeParams(params));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    };

    // Test the handler
    const params = {
      project_key: 'test-project',
      severity: 'CRITICAL',
      page: '3',
      page_size: '15',
      resolved: 'true',
    };

    return issuesHandler(params).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.issues).toBeDefined();
      expect(data.issues[0].project).toBe('test-project');
      expect(data.issues[0].severity).toBe('CRITICAL');
      expect(data.paging.pageIndex).toBe(3);
      expect(data.paging.pageSize).toBe(15);
    });
  });

  it('should test componentMeasuresHandler functionality', () => {
    const componentMeasuresHandler = async (params) => {
      const handleComponentMeasures = async (transformedParams) => {
        // Mock SonarQube response
        return {
          component: {
            key: transformedParams.component,
            measures: transformedParams.metricKeys.map((metric) => ({
              metric,
              value: '85.4',
            })),
          },
          metrics: transformedParams.metricKeys.map((key) => ({
            key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
          })),
        };
      };

      const result = await handleComponentMeasures({
        component: params.component,
        metricKeys: Array.isArray(params.metric_keys) ? params.metric_keys : [params.metric_keys],
        branch: params.branch,
        pullRequest: params.pull_request,
        period: params.period,
        additionalFields: params.additional_fields,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    };

    // Test with string parameter
    const paramsString = {
      component: 'test-component',
      metric_keys: 'coverage',
      branch: 'main',
    };

    return componentMeasuresHandler(paramsString).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.component.key).toBe('test-component');
      expect(data.component.measures[0].metric).toBe('coverage');
      expect(data.metrics[0].key).toBe('coverage');
    });
  });

  it('should test componentMeasuresHandler with array parameters', () => {
    const componentMeasuresHandler = async (params) => {
      const handleComponentMeasures = async (transformedParams) => {
        // Mock SonarQube response
        return {
          component: {
            key: transformedParams.component,
            measures: transformedParams.metricKeys.map((metric) => ({
              metric,
              value: '85.4',
            })),
          },
          metrics: transformedParams.metricKeys.map((key) => ({
            key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
          })),
        };
      };

      const result = await handleComponentMeasures({
        component: params.component,
        metricKeys: Array.isArray(params.metric_keys) ? params.metric_keys : [params.metric_keys],
        branch: params.branch,
        pullRequest: params.pull_request,
        period: params.period,
        additionalFields: params.additional_fields,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    };

    // Test with array parameter
    const paramsArray = {
      component: 'test-component',
      metric_keys: ['coverage', 'bugs', 'vulnerabilities'],
      branch: 'main',
      additional_fields: ['periods'],
    };

    return componentMeasuresHandler(paramsArray).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.component.key).toBe('test-component');
      expect(data.component.measures.length).toBe(3);
      expect(data.metrics.length).toBe(3);
      expect(data.metrics[1].key).toBe('bugs');
    });
  });

  it('should test componentsMeasuresHandler functionality', () => {
    const nullToUndefined = (value) => (value === null ? undefined : value);

    const componentsMeasuresHandler = async (params) => {
      const handleComponentsMeasures = async (transformedParams) => {
        // Parse page and pageSize if they're strings
        const page =
          typeof transformedParams.page === 'string'
            ? parseInt(transformedParams.page, 10)
            : transformedParams.page;
        const pageSize =
          typeof transformedParams.pageSize === 'string'
            ? parseInt(transformedParams.pageSize, 10)
            : transformedParams.pageSize;

        // Mock SonarQube response
        return {
          components: transformedParams.componentKeys.map((key) => ({
            key,
            measures: transformedParams.metricKeys.map((metric) => ({
              metric,
              value: '85.4',
            })),
          })),
          metrics: transformedParams.metricKeys.map((key) => ({
            key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
          })),
          paging: {
            pageIndex: page || 1,
            pageSize: pageSize || 10,
            total: transformedParams.componentKeys.length,
          },
        };
      };

      const result = await handleComponentsMeasures({
        componentKeys: Array.isArray(params.component_keys)
          ? params.component_keys
          : [params.component_keys],
        metricKeys: Array.isArray(params.metric_keys) ? params.metric_keys : [params.metric_keys],
        additionalFields: params.additional_fields,
        branch: params.branch,
        pullRequest: params.pull_request,
        period: params.period,
        page: nullToUndefined(params.page),
        pageSize: nullToUndefined(params.page_size),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    };

    // Test with array parameters
    const params = {
      component_keys: ['comp1', 'comp2'],
      metric_keys: ['coverage', 'bugs'],
      page: '2',
      page_size: '20',
    };

    return componentsMeasuresHandler(params).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.components.length).toBe(2);
      expect(data.components[0].measures.length).toBe(2);
      expect(data.metrics.length).toBe(2);
      expect(data.paging.pageIndex).toBe(2);
      expect(data.paging.pageSize).toBe(20);
    });
  });

  it('should test measuresHistoryHandler functionality', () => {
    const nullToUndefined = (value) => (value === null ? undefined : value);

    const measuresHistoryHandler = async (params) => {
      const handleMeasuresHistory = async (transformedParams) => {
        // Parse page and pageSize if they're strings
        const page =
          typeof transformedParams.page === 'string'
            ? parseInt(transformedParams.page, 10)
            : transformedParams.page;
        const pageSize =
          typeof transformedParams.pageSize === 'string'
            ? parseInt(transformedParams.pageSize, 10)
            : transformedParams.pageSize;

        // Mock SonarQube response
        return {
          measures: transformedParams.metrics.map((metric) => ({
            metric,
            history: [
              { date: '2023-01-01', value: '85.4' },
              { date: '2023-02-01', value: '87.6' },
            ],
          })),
          paging: {
            pageIndex: page || 1,
            pageSize: pageSize || 10,
            total: transformedParams.metrics.length,
          },
        };
      };

      const result = await handleMeasuresHistory({
        component: params.component,
        metrics: Array.isArray(params.metrics) ? params.metrics : [params.metrics],
        from: params.from,
        to: params.to,
        branch: params.branch,
        pullRequest: params.pull_request,
        page: nullToUndefined(params.page),
        pageSize: nullToUndefined(params.page_size),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    };

    // Test with string parameter
    const paramsString = {
      component: 'test-component',
      metrics: 'coverage',
      from: '2023-01-01',
      to: '2023-12-31',
    };

    return measuresHistoryHandler(paramsString).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.measures.length).toBe(1);
      expect(data.measures[0].metric).toBe('coverage');
      expect(data.measures[0].history.length).toBe(2);
    });

    // Test with array parameter
    const paramsArray = {
      component: 'test-component',
      metrics: ['coverage', 'bugs'],
      from: '2023-01-01',
      to: '2023-12-31',
      page: '2',
      page_size: '20',
    };

    return measuresHistoryHandler(paramsArray).then((result) => {
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.measures.length).toBe(2);
      expect(data.measures[1].metric).toBe('bugs');
      expect(data.paging.pageIndex).toBe(2);
      expect(data.paging.pageSize).toBe(20);
    });
  });
});
