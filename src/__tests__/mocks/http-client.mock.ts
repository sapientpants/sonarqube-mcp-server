import { jest } from '@jest/globals';
import { HttpClient } from '../../api.js';

/**
 * Mock HTTP client for testing
 */
export class MockHttpClient implements HttpClient {
  constructor(
    private readonly getMock = jest.fn(),
    private readonly postMock = jest.fn()
  ) {}

  /**
   * Mock implementation of HTTP GET
   */
  async get<T>(
    baseUrl: string,
    auth: { username: string; password: string },
    endpoint: string,
    params?: Record<string, string | number | boolean | string[] | undefined | null>
  ): Promise<T> {
    return this.getMock(baseUrl, auth, endpoint, params) as Promise<T>;
  }

  /**
   * Mock implementation of HTTP POST
   */
  async post<T>(
    baseUrl: string,
    auth: { username: string; password: string },
    endpoint: string,
    data: Record<string, unknown>,
    params?: Record<string, string | number | boolean | string[] | undefined | null>
  ): Promise<T> {
    return this.postMock(baseUrl, auth, endpoint, data, params) as Promise<T>;
  }

  /**
   * Reset mock counters and implementations
   */
  reset() {
    this.getMock.mockReset();
    this.postMock.mockReset();
  }

  /**
   * Set up mock implementations for specific endpoints
   * @param endpoint The API endpoint to mock
   * @param response The mock response to return
   */
  mockEndpoint(endpoint: string, response: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.getMock.mockImplementation((baseUrl, auth, reqEndpoint, _params) => {
      if (reqEndpoint === endpoint) {
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected endpoint: ${reqEndpoint}`));
    });
  }

  /**
   * Set up mock implementations for all common endpoints
   */
  mockCommonEndpoints() {
    // Projects endpoint
    this.mockGetEndpoint('/api/projects/search', {
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
    });

    // Issues endpoint
    this.mockGetEndpoint('/api/issues/search', {
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
      users: [],
      facets: [],
      paging: { pageIndex: 1, pageSize: 10, total: 1 },
    });

    // Metrics endpoint
    this.mockGetEndpoint('/api/metrics/search', {
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
    });

    // Health endpoint
    this.mockGetEndpoint('/api/system/health', {
      health: 'GREEN',
      causes: [],
    });

    // Status endpoint
    this.mockGetEndpoint('/api/system/status', {
      id: 'test-id',
      version: '10.3.0.82913',
      status: 'UP',
    });

    // Ping endpoint
    this.mockGetEndpoint('/api/system/ping', 'pong');

    // Component measures endpoint
    this.mockGetEndpoint('/api/measures/component', {
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
    });

    // Components measures endpoint
    this.mockGetEndpoint('/api/measures/components', {
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
    });

    // Measures history endpoint
    this.mockGetEndpoint('/api/measures/search_history', {
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
    });
  }

  /**
   * Set up mock implementation for a specific GET endpoint
   * @param endpoint The API endpoint to mock
   * @param response The mock response to return
   */
  mockGetEndpoint(endpoint: string, response: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.getMock.mockImplementation((baseUrl, auth, reqEndpoint, _params) => {
      if (reqEndpoint === endpoint) {
        return Promise.resolve(response);
      }
      // If this endpoint is not mocked, delegate to any previously set implementation
      const previousImplementation = this.getMock.getMockImplementation();
      if (previousImplementation && previousImplementation !== this.mockGetEndpoint) {
        return previousImplementation(baseUrl, auth, reqEndpoint, _params);
      }
      return Promise.reject(new Error(`Unexpected endpoint: ${reqEndpoint}`));
    });
  }

  /**
   * Set up mock implementation for a specific POST endpoint
   * @param endpoint The API endpoint to mock
   * @param response The mock response to return
   */
  mockPostEndpoint(endpoint: string, response: unknown) {
    this.postMock.mockImplementation((baseUrl, auth, reqEndpoint, data, params) => {
      if (reqEndpoint === endpoint) {
        return Promise.resolve(response);
      }
      // If this endpoint is not mocked, delegate to any previously set implementation
      const previousImplementation = this.postMock.getMockImplementation();
      if (previousImplementation && previousImplementation !== this.mockPostEndpoint) {
        return previousImplementation(baseUrl, auth, reqEndpoint, data, params);
      }
      return Promise.reject(new Error(`Unexpected endpoint: ${reqEndpoint}`));
    });
  }
}
