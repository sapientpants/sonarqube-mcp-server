import { HttpClient, AxiosHttpClient } from './api.js';

/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Interface for SonarQube project
 */
export interface SonarQubeProject {
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate?: string;
  revision?: string;
  managed?: boolean;
}

/**
 * Interface for SonarQube issue impact
 */
export interface SonarQubeIssueImpact {
  softwareQuality: string;
  severity: string;
}

/**
 * Interface for text range in SonarQube
 */
export interface SonarQubeTextRange {
  startLine: number;
  endLine: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Interface for message formatting in SonarQube
 */
export interface SonarQubeMessageFormatting {
  start: number;
  end: number;
  type: string;
}

/**
 * Interface for issue location in SonarQube
 */
export interface SonarQubeIssueLocation {
  textRange: SonarQubeTextRange;
  msg: string;
  msgFormattings?: SonarQubeMessageFormatting[];
}

/**
 * Interface for issue flow in SonarQube
 */
export interface SonarQubeIssueFlow {
  locations: SonarQubeIssueLocation[];
}

/**
 * Interface for issue comment in SonarQube
 */
export interface SonarQubeIssueComment {
  key: string;
  login: string;
  htmlText: string;
  markdown: string;
  updatable: boolean;
  createdAt: string;
}

/**
 * Interface for SonarQube issue
 */
export interface SonarQubeIssue {
  key: string;
  rule: string;
  component: string;
  project: string;
  line?: number;
  hash?: string;
  textRange?: SonarQubeTextRange;
  message: string;
  messageFormattings?: SonarQubeMessageFormatting[];
  status: string;
  issueStatus?: string;
  effort?: string;
  debt?: string;
  author?: string;
  severity?: string;
  tags: string[];
  creationDate: string;
  updateDate: string;
  type?: string;
  cleanCodeAttribute?: string;
  cleanCodeAttributeCategory?: string;
  prioritizedRule?: boolean;
  impacts?: SonarQubeIssueImpact[];
  comments?: SonarQubeIssueComment[];
  transitions?: string[];
  actions?: string[];
  flows?: SonarQubeIssueFlow[];
  quickFixAvailable?: boolean;
  ruleDescriptionContextKey?: string;
  codeVariants?: string[];
}

/**
 * Interface for SonarQube component
 */
export interface SonarQubeComponent {
  key: string;
  enabled?: boolean;
  qualifier: string;
  name: string;
  longName?: string;
  path?: string;
}

/**
 * Interface for SonarQube rule
 */
export interface SonarQubeRule {
  key: string;
  name: string;
  status: string;
  lang: string;
  langName: string;
}

/**
 * Interface for SonarQube user
 */
export interface SonarQubeUser {
  login: string;
  name: string;
  active: boolean;
  avatar?: string;
}

/**
 * Interface for SonarQube facet value
 */
export interface SonarQubeFacetValue {
  val: string;
  count: number;
}

/**
 * Interface for SonarQube facet
 */
export interface SonarQubeFacet {
  property: string;
  values: SonarQubeFacetValue[];
}

/**
 * Interface for SonarQube issues result
 */
export interface SonarQubeIssuesResult {
  issues: SonarQubeIssue[];
  components: SonarQubeComponent[];
  rules: SonarQubeRule[];
  users?: SonarQubeUser[];
  facets?: SonarQubeFacet[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Interface for SonarQube projects result - Clean abstraction for consumers
 */
export interface SonarQubeProjectsResult {
  projects: SonarQubeProject[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Interface for get issues parameters
 */
export interface IssuesParams extends PaginationParams {
  projectKey: string;
  branch?: string;
  severity?: 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';
  statuses?: (
    | 'OPEN'
    | 'CONFIRMED'
    | 'REOPENED'
    | 'RESOLVED'
    | 'CLOSED'
    | 'TO_REVIEW'
    | 'IN_REVIEW'
    | 'REVIEWED'
  )[];
  resolutions?: ('FALSE-POSITIVE' | 'WONTFIX' | 'FIXED' | 'REMOVED')[];
  resolved?: boolean;
  types?: ('CODE_SMELL' | 'BUG' | 'VULNERABILITY' | 'SECURITY_HOTSPOT')[];
  rules?: string[];
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  createdAt?: string;
  createdInLast?: string;
  assignees?: string[];
  authors?: string[];
  cwe?: string[];
  languages?: string[];
  owaspTop10?: string[];
  sansTop25?: string[];
  sonarsourceSecurity?: string[];
  onComponentOnly?: boolean;
  facets?: string[];
  sinceLeakPeriod?: boolean;
  inNewCodePeriod?: boolean;
  pullRequest?: string;
  hotspots?: boolean;
}

/**
 * Interface for component measures parameters
 */
export interface ComponentMeasuresParams {
  component: string;
  metricKeys: string[];
  additionalFields?: string[];
  branch?: string;
  pullRequest?: string;
  period?: string;
}

/**
 * Interface for components measures parameters
 */
export interface ComponentsMeasuresParams extends PaginationParams {
  componentKeys: string[];
  metricKeys: string[];
  additionalFields?: string[];
  branch?: string;
  pullRequest?: string;
  period?: string;
}

/**
 * Interface for measures history parameters
 */
export interface MeasuresHistoryParams extends PaginationParams {
  component: string;
  metrics: string[];
  from?: string;
  to?: string;
  branch?: string;
  pullRequest?: string;
}

/**
 * Interface for raw SonarQube component as returned by the API
 */
interface SonarQubeApiComponent {
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate?: string;
  revision?: string;
  managed?: boolean;
}

/**
 * Interface for SonarQube metric
 */
export interface SonarQubeMetric {
  id: string;
  key: string;
  name: string;
  description: string;
  domain: string;
  type: string;
  direction: number;
  qualitative: boolean;
  hidden: boolean;
  custom: boolean;
}

/**
 * Interface for SonarQube metrics result
 */
export interface SonarQubeMetricsResult {
  metrics: SonarQubeMetric[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Interface for SonarQube measure
 */
export interface SonarQubeMeasure {
  metric: string;
  value?: string;
  period?: {
    index: number;
    value: string;
  };
  bestValue?: boolean;
}

/**
 * Interface for SonarQube measure component
 */
export interface SonarQubeMeasureComponent {
  key: string;
  name: string;
  qualifier: string;
  measures: SonarQubeMeasure[];
}

/**
 * Interface for SonarQube component with measures result
 */
export interface SonarQubeComponentMeasuresResult {
  component: SonarQubeMeasureComponent;
  metrics: SonarQubeMetric[];
  period?: {
    index: number;
    mode: string;
    date: string;
    parameter?: string;
  };
}

/**
 * Interface for SonarQube components with measures result
 */
export interface SonarQubeComponentsMeasuresResult {
  components: SonarQubeMeasureComponent[];
  metrics: SonarQubeMetric[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  period?: {
    index: number;
    mode: string;
    date: string;
    parameter?: string;
  };
}

/**
 * Interface for SonarQube measures history result
 */
export interface SonarQubeMeasuresHistoryResult {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  measures: {
    metric: string;
    history: {
      date: string;
      value?: string;
    }[];
  }[];
}

/**
 * Interface for SonarQube health status
 */
export interface SonarQubeHealthStatus {
  health: 'GREEN' | 'YELLOW' | 'RED';
  causes: string[];
}

/**
 * Interface for SonarQube system status
 */
export interface SonarQubeSystemStatus {
  id: string;
  version: string;
  status:
    | 'UP'
    | 'DOWN'
    | 'STARTING'
    | 'RESTARTING'
    | 'DB_MIGRATION_NEEDED'
    | 'DB_MIGRATION_RUNNING';
}

/**
 * Interface for SonarQube quality gate condition
 */
export interface SonarQubeQualityGateCondition {
  id: string;
  metric: string;
  op: string;
  error: string;
}

/**
 * Interface for SonarQube quality gate
 */
export interface SonarQubeQualityGate {
  id: string;
  name: string;
  isDefault?: boolean;
  isBuiltIn?: boolean;
  conditions?: SonarQubeQualityGateCondition[];
}

/**
 * Interface for SonarQube quality gates list result
 */
export interface SonarQubeQualityGatesResult {
  qualitygates: SonarQubeQualityGate[];
  default: string;
  actions?: {
    create?: boolean;
  };
}

/**
 * Interface for SonarQube quality gate status
 */
export interface SonarQubeQualityGateStatus {
  projectStatus: {
    status: 'OK' | 'WARN' | 'ERROR' | 'NONE';
    conditions: Array<{
      status: 'OK' | 'WARN' | 'ERROR';
      metricKey: string;
      comparator: string;
      errorThreshold: string;
      actualValue: string;
    }>;
    periods?: Array<{
      index: number;
      mode: string;
      date: string;
      parameter?: string;
    }>;
    ignoredConditions: boolean;
  };
}

/**
 * Interface for project quality gate params
 */
export interface ProjectQualityGateParams {
  projectKey: string;
  branch?: string;
  pullRequest?: string;
}

/**
 * Interface for SonarQube client
 */
export interface ISonarQubeClient {
  listProjects(params?: PaginationParams): Promise<SonarQubeProjectsResult>;
  getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult>;
  getMetrics(params?: PaginationParams): Promise<SonarQubeMetricsResult>;
  getHealth(): Promise<SonarQubeHealthStatus>;
  getStatus(): Promise<SonarQubeSystemStatus>;
  ping(): Promise<string>;
  getComponentMeasures(params: ComponentMeasuresParams): Promise<SonarQubeComponentMeasuresResult>;
  getComponentsMeasures(
    params: ComponentsMeasuresParams
  ): Promise<SonarQubeComponentsMeasuresResult>;
  getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult>;

  // Quality Gates API methods
  listQualityGates(): Promise<SonarQubeQualityGatesResult>;
  getQualityGate(id: string): Promise<SonarQubeQualityGate>;
  getProjectQualityGateStatus(
    params: ProjectQualityGateParams
  ): Promise<SonarQubeQualityGateStatus>;
}

/**
 * SonarQube client for interacting with the SonarQube API
 */
export class SonarQubeClient implements ISonarQubeClient {
  private readonly baseUrl: string;
  private readonly auth: { username: string; password: string };
  private readonly organization: string | null;
  private readonly httpClient: HttpClient;

  /**
   * Creates a new SonarQube client
   * @param token SonarQube authentication token
   * @param baseUrl Base URL of the SonarQube instance (default: https://sonarcloud.io)
   * @param organization Organization name
   * @param httpClient HTTP client implementation (optional)
   */
  constructor(
    token: string,
    baseUrl = 'https://sonarcloud.io',
    organization?: string | null,
    httpClient?: HttpClient
  ) {
    this.baseUrl = baseUrl;
    this.auth = { username: token, password: '' };
    this.organization = organization ?? null;
    this.httpClient = httpClient ?? new AxiosHttpClient();
  }

  /**
   * Lists all projects in SonarQube
   * @param params Pagination and organization parameters
   * @returns Promise with the list of projects
   */
  async listProjects(params: PaginationParams = {}): Promise<SonarQubeProjectsResult> {
    const { page, pageSize } = params;

    const queryParams = {
      organization: this.organization,
      p: page,
      ps: pageSize,
    };

    const response = await this.httpClient.get<{
      components: SonarQubeApiComponent[];
      paging: { pageIndex: number; pageSize: number; total: number };
    }>(this.baseUrl, this.auth, '/api/projects/search', queryParams);

    // Transform SonarQube 'components' to our clean 'projects' interface
    return {
      projects: response.components.map((component: SonarQubeApiComponent) => ({
        key: component.key,
        name: component.name,
        qualifier: component.qualifier,
        visibility: component.visibility,
        lastAnalysisDate: component.lastAnalysisDate,
        revision: component.revision,
        managed: component.managed,
      })),
      paging: response.paging,
    };
  }

  /**
   * Gets issues for a project in SonarQube
   * @param params Parameters including project key, severity, pagination and organization
   * @returns Promise with the list of issues
   */
  async getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult> {
    const {
      projectKey,
      branch,
      severity,
      page,
      pageSize,
      statuses,
      resolutions,
      resolved,
      types,
      rules,
      tags,
      createdAfter,
      createdBefore,
      createdAt,
      createdInLast,
      assignees,
      authors,
      cwe,
      languages,
      owaspTop10,
      sansTop25,
      sonarsourceSecurity,
      onComponentOnly,
      facets,
      sinceLeakPeriod,
      inNewCodePeriod,
      pullRequest,
      hotspots,
    } = params;

    const queryParams = {
      componentKeys: projectKey,
      branch,
      severities: severity,
      organization: this.organization,
      p: page,
      ps: pageSize,
      statuses: statuses?.join(','),
      resolutions: resolutions?.join(','),
      resolved,
      types: types?.join(','),
      rules: rules?.join(','),
      tags: tags?.join(','),
      createdAfter,
      createdBefore,
      createdAt,
      createdInLast,
      assignees: assignees?.join(','),
      authors: authors?.join(','),
      cwe: cwe?.join(','),
      languages: languages?.join(','),
      owaspTop10: owaspTop10?.join(','),
      sansTop25: sansTop25?.join(','),
      sonarsourceSecurity: sonarsourceSecurity?.join(','),
      onComponentOnly,
      facets: facets?.join(','),
      sinceLeakPeriod,
      inNewCodePeriod,
      pullRequest,
      hotspots,
    };

    return this.httpClient.get<SonarQubeIssuesResult>(
      this.baseUrl,
      this.auth,
      '/api/issues/search',
      queryParams
    );
  }

  /**
   * Gets available metrics from SonarQube
   * @param params Parameters including pagination
   * @returns Promise with the list of metrics
   */
  async getMetrics(params: PaginationParams = {}): Promise<SonarQubeMetricsResult> {
    const { page, pageSize } = params;

    const queryParams = {
      organization: this.organization,
      p: page,
      ps: pageSize,
    };

    const response = await this.httpClient.get<{
      metrics: SonarQubeMetric[];
      paging: { pageIndex: number; pageSize: number; total: number };
    }>(this.baseUrl, this.auth, '/api/metrics/search', queryParams);

    return {
      metrics: response.metrics,
      paging: response.paging,
    };
  }

  /**
   * Gets the health status of the SonarQube instance
   * @returns Promise with the health status
   */
  async getHealth(): Promise<SonarQubeHealthStatus> {
    return this.httpClient.get<SonarQubeHealthStatus>(
      this.baseUrl,
      this.auth,
      '/api/system/health'
    );
  }

  /**
   * Gets the system status of the SonarQube instance
   * @returns Promise with the system status
   */
  async getStatus(): Promise<SonarQubeSystemStatus> {
    return this.httpClient.get<SonarQubeSystemStatus>(
      this.baseUrl,
      this.auth,
      '/api/system/status'
    );
  }

  /**
   * Pings the SonarQube instance to check if it's up
   * @returns Promise with the ping response
   */
  async ping(): Promise<string> {
    return this.httpClient.get<string>(this.baseUrl, this.auth, '/api/system/ping');
  }

  /**
   * Gets measures for a specific component
   * @param params Parameters including component key and metrics
   * @returns Promise with the component measures result
   */
  async getComponentMeasures(
    params: ComponentMeasuresParams
  ): Promise<SonarQubeComponentMeasuresResult> {
    const { component, metricKeys, additionalFields, branch, pullRequest, period } = params;

    const queryParams = {
      component,
      metricKeys: Array.isArray(metricKeys) ? metricKeys.join(',') : metricKeys,
      additionalFields: additionalFields?.join(','),
      branch,
      pullRequest,
      period,
      organization: this.organization,
    };

    return this.httpClient.get<SonarQubeComponentMeasuresResult>(
      this.baseUrl,
      this.auth,
      '/api/measures/component',
      queryParams
    );
  }

  /**
   * Gets measures for multiple components
   * @param params Parameters including component keys, metrics, and pagination
   * @returns Promise with the components measures result
   */
  async getComponentsMeasures(
    params: ComponentsMeasuresParams
  ): Promise<SonarQubeComponentsMeasuresResult> {
    const {
      componentKeys,
      metricKeys,
      additionalFields,
      branch,
      pullRequest,
      period,
      page,
      pageSize,
    } = params;

    const queryParams = {
      componentKeys: Array.isArray(componentKeys) ? componentKeys.join(',') : componentKeys,
      metricKeys: Array.isArray(metricKeys) ? metricKeys.join(',') : metricKeys,
      additionalFields: additionalFields?.join(','),
      branch,
      pullRequest,
      period,
      p: page,
      ps: pageSize,
      organization: this.organization,
    };

    return this.httpClient.get<SonarQubeComponentsMeasuresResult>(
      this.baseUrl,
      this.auth,
      '/api/measures/components',
      queryParams
    );
  }

  /**
   * Gets measures history for a component
   * @param params Parameters including component, metrics, and date range
   * @returns Promise with the measures history result
   */
  async getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult> {
    const { component, metrics, from, to, branch, pullRequest, page, pageSize } = params;

    const queryParams = {
      component,
      metrics: Array.isArray(metrics) ? metrics.join(',') : metrics,
      from,
      to,
      branch,
      pullRequest,
      p: page,
      ps: pageSize,
      organization: this.organization,
    };

    return this.httpClient.get<SonarQubeMeasuresHistoryResult>(
      this.baseUrl,
      this.auth,
      '/api/measures/search_history',
      queryParams
    );
  }

  /**
   * Lists all quality gates from SonarQube
   * @returns Promise with the list of quality gates
   */
  async listQualityGates(): Promise<SonarQubeQualityGatesResult> {
    const queryParams = {
      organization: this.organization,
    };

    return this.httpClient.get<SonarQubeQualityGatesResult>(
      this.baseUrl,
      this.auth,
      '/api/qualitygates/list',
      queryParams
    );
  }

  /**
   * Gets details of a quality gate including its conditions
   * @param id The ID of the quality gate
   * @returns Promise with the quality gate details
   */
  async getQualityGate(id: string): Promise<SonarQubeQualityGate> {
    const queryParams = {
      id,
      organization: this.organization,
    };

    return this.httpClient.get<SonarQubeQualityGate>(
      this.baseUrl,
      this.auth,
      '/api/qualitygates/show',
      queryParams
    );
  }

  /**
   * Gets quality gate status for a specific project
   * @param params Parameters including project key, branch, and pull request
   * @returns Promise with the project's quality gate status
   */
  async getProjectQualityGateStatus(
    params: ProjectQualityGateParams
  ): Promise<SonarQubeQualityGateStatus> {
    const { projectKey, branch, pullRequest } = params;

    const queryParams = {
      projectKey,
      branch,
      pullRequest,
      organization: this.organization,
    };

    return this.httpClient.get<SonarQubeQualityGateStatus>(
      this.baseUrl,
      this.auth,
      '/api/qualitygates/project_status',
      queryParams
    );
  }
}

/**
 * Factory function to create a SonarQube client
 * @param token SonarQube authentication token
 * @param baseUrl Base URL of the SonarQube instance
 * @param organization Organization name
 * @param httpClient HTTP client implementation
 * @returns A new SonarQube client instance
 */
export function createSonarQubeClient(
  token: string,
  baseUrl?: string,
  organization?: string | null,
  httpClient?: HttpClient
): ISonarQubeClient {
  return new SonarQubeClient(token, baseUrl, organization, httpClient);
}
