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
  listProjectsMock: jest.Mock = jest.fn();
  getIssuesMock: jest.Mock = jest.fn();
  getMetricsMock: jest.Mock = jest.fn();
  getHealthMock: jest.Mock = jest.fn();
  getStatusMock: jest.Mock = jest.fn();
  pingMock: jest.Mock = jest.fn();
  getComponentMeasuresMock: jest.Mock = jest.fn();
  getComponentsMeasuresMock: jest.Mock = jest.fn();
  getMeasuresHistoryMock: jest.Mock = jest.fn();

  constructor() {
    this.setupDefaultMocks();
  }

  // ISonarQubeClient implementation that delegates to the mocks
  async listProjects(params?: PaginationParams): Promise<SonarQubeProjectsResult> {
    return this.listProjectsMock(params) as Promise<SonarQubeProjectsResult>;
  }

  async getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult> {
    return this.getIssuesMock(params) as Promise<SonarQubeIssuesResult>;
  }

  async getMetrics(params?: PaginationParams): Promise<SonarQubeMetricsResult> {
    return this.getMetricsMock(params) as Promise<SonarQubeMetricsResult>;
  }

  async getHealth(): Promise<SonarQubeHealthStatus> {
    return this.getHealthMock() as Promise<SonarQubeHealthStatus>;
  }

  async getStatus(): Promise<SonarQubeSystemStatus> {
    return this.getStatusMock() as Promise<SonarQubeSystemStatus>;
  }

  async ping(): Promise<string> {
    return this.pingMock() as Promise<string>;
  }

  async getComponentMeasures(
    params: ComponentMeasuresParams
  ): Promise<SonarQubeComponentMeasuresResult> {
    return this.getComponentMeasuresMock(params) as Promise<SonarQubeComponentMeasuresResult>;
  }

  async getComponentsMeasures(
    params: ComponentsMeasuresParams
  ): Promise<SonarQubeComponentsMeasuresResult> {
    return this.getComponentsMeasuresMock(params) as Promise<SonarQubeComponentsMeasuresResult>;
  }

  async getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult> {
    return this.getMeasuresHistoryMock(params) as Promise<SonarQubeMeasuresHistoryResult>;
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
    this.listProjectsMock.mockImplementation(() =>
      Promise.resolve({
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
      } as SonarQubeProjectsResult)
    );

    // Get issues
    this.getIssuesMock.mockImplementation(() =>
      Promise.resolve({
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
      } as SonarQubeIssuesResult)
    );

    // Get metrics
    this.getMetricsMock.mockImplementation(() =>
      Promise.resolve({
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
      } as SonarQubeMetricsResult)
    );

    // Get health
    this.getHealthMock.mockImplementation(() =>
      Promise.resolve({
        health: 'GREEN',
        causes: [],
      } as SonarQubeHealthStatus)
    );

    // Get status
    this.getStatusMock.mockImplementation(() =>
      Promise.resolve({
        id: 'test-id',
        version: '10.3.0.82913',
        status: 'UP',
      } as SonarQubeSystemStatus)
    );

    // Ping
    this.pingMock.mockImplementation(() => Promise.resolve('pong'));

    // Get component measures
    this.getComponentMeasuresMock.mockImplementation(() =>
      Promise.resolve({
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
      } as SonarQubeComponentMeasuresResult)
    );

    // Get components measures
    this.getComponentsMeasuresMock.mockImplementation(() =>
      Promise.resolve({
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
      } as SonarQubeComponentsMeasuresResult)
    );

    // Get measures history
    this.getMeasuresHistoryMock.mockImplementation(() =>
      Promise.resolve({
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
      } as SonarQubeMeasuresHistoryResult)
    );
  }
}
