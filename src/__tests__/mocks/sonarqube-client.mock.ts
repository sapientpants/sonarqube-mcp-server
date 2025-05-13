import { jest } from '@jest/globals';
import {
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  ISonarQubeClient,
  IssuesParams,
  MeasuresHistoryParams,
  PaginationParams,
  ProjectQualityGateParams,
  ScmBlameParams,
  SourceCodeParams,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeHealthStatus,
  SonarQubeIssuesResult,
  SonarQubeMetricsResult,
  SonarQubeProjectsResult,
  SonarQubeQualityGate,
  SonarQubeQualityGateStatus,
  SonarQubeQualityGatesResult,
  SonarQubeScmBlameResult,
  SonarQubeSourceResult,
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
  listQualityGatesMock: jest.Mock = jest.fn();
  getQualityGateMock: jest.Mock = jest.fn();
  getProjectQualityGateStatusMock: jest.Mock = jest.fn();
  getSourceCodeMock: jest.Mock = jest.fn();
  getScmBlameMock: jest.Mock = jest.fn();

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

  async listQualityGates(): Promise<SonarQubeQualityGatesResult> {
    return this.listQualityGatesMock() as Promise<SonarQubeQualityGatesResult>;
  }

  async getQualityGate(id: string): Promise<SonarQubeQualityGate> {
    return this.getQualityGateMock(id) as Promise<SonarQubeQualityGate>;
  }

  async getProjectQualityGateStatus(
    params: ProjectQualityGateParams
  ): Promise<SonarQubeQualityGateStatus> {
    return this.getProjectQualityGateStatusMock(params) as Promise<SonarQubeQualityGateStatus>;
  }

  async getSourceCode(params: SourceCodeParams): Promise<SonarQubeSourceResult> {
    return this.getSourceCodeMock(params) as Promise<SonarQubeSourceResult>;
  }

  async getScmBlame(params: ScmBlameParams): Promise<SonarQubeScmBlameResult> {
    return this.getScmBlameMock(params) as Promise<SonarQubeScmBlameResult>;
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
    this.listQualityGatesMock.mockReset();
    this.getQualityGateMock.mockReset();
    this.getProjectQualityGateStatusMock.mockReset();
    this.getSourceCodeMock.mockReset();
    this.getScmBlameMock.mockReset();

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

    // List quality gates
    this.listQualityGatesMock.mockImplementation(() =>
      Promise.resolve({
        qualitygates: [
          {
            id: '1',
            name: 'Sonar way',
            isDefault: true,
            isBuiltIn: true,
          },
        ],
        default: '1',
        actions: {
          create: true,
        },
      } as SonarQubeQualityGatesResult)
    );

    // Get quality gate
    this.getQualityGateMock.mockImplementation(() =>
      Promise.resolve({
        id: '1',
        name: 'Sonar way',
        isDefault: true,
        isBuiltIn: true,
        conditions: [
          {
            id: '3',
            metric: 'new_coverage',
            op: 'LT',
            error: '80',
          },
        ],
      } as SonarQubeQualityGate)
    );

    // Get project quality gate status
    this.getProjectQualityGateStatusMock.mockImplementation(() =>
      Promise.resolve({
        projectStatus: {
          status: 'OK',
          conditions: [
            {
              status: 'OK',
              metricKey: 'new_reliability_rating',
              comparator: 'GT',
              errorThreshold: '1',
              actualValue: '1',
            },
          ],
          ignoredConditions: false,
        },
      } as SonarQubeQualityGateStatus)
    );

    // Get source code
    this.getSourceCodeMock.mockImplementation(() =>
      Promise.resolve({
        component: {
          key: 'test-component',
          path: 'src/test.js',
          qualifier: 'FIL',
          name: 'test.js',
          longName: 'src/test.js',
          language: 'js',
        },
        sources: [
          {
            line: 1,
            code: 'function test() {',
            scmAuthor: 'developer',
            scmDate: '2023-01-01',
            scmRevision: 'abc123',
          },
          {
            line: 2,
            code: '  return "test";',
            scmAuthor: 'developer',
            scmDate: '2023-01-01',
            scmRevision: 'abc123',
          },
          {
            line: 3,
            code: '}',
            scmAuthor: 'developer',
            scmDate: '2023-01-01',
            scmRevision: 'abc123',
          },
        ],
      } as SonarQubeSourceResult)
    );

    // Get SCM blame
    this.getScmBlameMock.mockImplementation(() =>
      Promise.resolve({
        component: {
          key: 'test-component',
          path: 'src/test.js',
          qualifier: 'FIL',
          name: 'test.js',
          longName: 'src/test.js',
          language: 'js',
        },
        sources: {
          '1': {
            author: 'developer',
            date: '2023-01-01',
            revision: 'abc123',
          },
          '2': {
            author: 'developer',
            date: '2023-01-01',
            revision: 'abc123',
          },
          '3': {
            author: 'developer',
            date: '2023-01-01',
            revision: 'abc123',
          },
        },
      } as SonarQubeScmBlameResult)
    );
  }
}
