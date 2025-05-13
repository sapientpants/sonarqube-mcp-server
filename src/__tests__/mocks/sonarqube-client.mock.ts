import { jest } from '@jest/globals';
import {
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  ISonarQubeClient,
  IssuesParams,
  MeasuresHistoryParams,
  PaginationParams,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeHealthStatus,
  SonarQubeIssuesResult,
  SonarQubeMetricsResult,
  SonarQubeProjectsResult,
  SonarQubeSystemStatus,
  SonarQubeMeasuresHistoryResult,
} from '../../sonarqube.js';

/**
 * Mock SonarQube client for testing
 */
export class MockSonarQubeClient implements ISonarQubeClient {
  // Mock implementations for each client method
  listProjectsMock = jest.fn();
  getIssuesMock = jest.fn();
  getMetricsMock = jest.fn();
  getHealthMock = jest.fn();
  getStatusMock = jest.fn();
  pingMock = jest.fn();
  getComponentMeasuresMock = jest.fn();
  getComponentsMeasuresMock = jest.fn();
  getMeasuresHistoryMock = jest.fn();

  constructor() {
    this.setupDefaultMocks();
  }

  // ISonarQubeClient implementation that delegates to the mocks
  async listProjects(params?: PaginationParams): Promise<SonarQubeProjectsResult> {
    return this.listProjectsMock(params);
  }

  async getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult> {
    return this.getIssuesMock(params);
  }

  async getMetrics(params?: PaginationParams): Promise<SonarQubeMetricsResult> {
    return this.getMetricsMock(params);
  }

  async getHealth(): Promise<SonarQubeHealthStatus> {
    return this.getHealthMock();
  }

  async getStatus(): Promise<SonarQubeSystemStatus> {
    return this.getStatusMock();
  }

  async ping(): Promise<string> {
    return this.pingMock();
  }

  async getComponentMeasures(
    params: ComponentMeasuresParams
  ): Promise<SonarQubeComponentMeasuresResult> {
    return this.getComponentMeasuresMock(params);
  }

  async getComponentsMeasures(
    params: ComponentsMeasuresParams
  ): Promise<SonarQubeComponentsMeasuresResult> {
    return this.getComponentsMeasuresMock(params);
  }

  async getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult> {
    return this.getMeasuresHistoryMock(params);
  }

  // Reset all mocks
  reset() {
    this.listProjectsMock.mockReset();
    this.getIssuesMock.mockReset();
    this.getMetricsMock.mockReset();
    this.getHealthMock.mockReset();
    this.getStatusMock.mockReset();
    this.pingMock.mockReset();
    this.getComponentMeasuresMock.mockReset();
    this.getComponentsMeasuresMock.mockReset();
    this.getMeasuresHistoryMock.mockReset();

    // Re-setup default mock implementations
    this.setupDefaultMocks();
  }

  // Setup default mock implementations for all methods
  private setupDefaultMocks() {
    // List projects
    this.listProjectsMock.mockResolvedValue({
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
    });

    // Get issues
    this.getIssuesMock.mockResolvedValue({
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
    });

    // Get metrics
    this.getMetricsMock.mockResolvedValue({
      metrics: [
        {
          id: '1',
          key: 'coverage',
          name: 'Coverage',
          description: 'Test coverage',
          domain: 'Coverage',
          type: 'PERCENT',
          direction: 1,
          qualitative: true,
          hidden: false,
          custom: false,
        },
      ],
      paging: { pageIndex: 1, pageSize: 10, total: 1 },
    });

    // Get health
    this.getHealthMock.mockResolvedValue({
      health: 'GREEN',
      causes: [],
    });

    // Get status
    this.getStatusMock.mockResolvedValue({
      id: 'test-id',
      version: '10.3.0.82913',
      status: 'UP',
    });

    // Ping
    this.pingMock.mockResolvedValue('pong');

    // Get component measures
    this.getComponentMeasuresMock.mockResolvedValue({
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
          id: '1',
          key: 'coverage',
          name: 'Coverage',
          description: 'Test coverage percentage',
          domain: 'Coverage',
          type: 'PERCENT',
          direction: 1,
          qualitative: true,
          hidden: false,
          custom: false,
        },
      ],
    });

    // Get components measures
    this.getComponentsMeasuresMock.mockResolvedValue({
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
          id: '1',
          key: 'coverage',
          name: 'Coverage',
          description: 'Test coverage percentage',
          domain: 'Coverage',
          type: 'PERCENT',
          direction: 1,
          qualitative: true,
          hidden: false,
          custom: false,
        },
      ],
      paging: { pageIndex: 1, pageSize: 10, total: 1 },
    });

    // Get measures history
    this.getMeasuresHistoryMock.mockResolvedValue({
      measures: [
        {
          metric: 'coverage',
          history: [
            {
              date: '2023-01-01',
              value: '85.4',
            },
          ],
        },
      ],
      paging: { pageIndex: 1, pageSize: 10, total: 1 },
    });
  }
}
