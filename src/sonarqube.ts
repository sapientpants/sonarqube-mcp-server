import { SonarQubeClient as WebApiClient, MeasuresAdditionalField } from 'sonarqube-web-api-client';
import { createLogger } from './utils/logger.js';

const logger = createLogger('sonarqube');

/**
 * Default SonarQube URL
 */
const DEFAULT_SONARQUBE_URL = 'https://sonarcloud.io';

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
  // Component filters
  projectKey?: string;
  componentKeys?: string[];
  components?: string[];
  projects?: string[];
  onComponentOnly?: boolean;

  // Branch and PR
  branch?: string;
  pullRequest?: string;

  // Issue filters
  issues?: string[];
  severities?: ('INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER')[];
  statuses?: ('OPEN' | 'CONFIRMED' | 'REOPENED' | 'RESOLVED' | 'CLOSED')[];
  resolutions?: ('FALSE-POSITIVE' | 'WONTFIX' | 'FIXED' | 'REMOVED')[];
  resolved?: boolean;
  types?: ('CODE_SMELL' | 'BUG' | 'VULNERABILITY' | 'SECURITY_HOTSPOT')[];

  // Clean Code taxonomy
  cleanCodeAttributeCategories?: ('ADAPTABLE' | 'CONSISTENT' | 'INTENTIONAL' | 'RESPONSIBLE')[];
  impactSeverities?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  impactSoftwareQualities?: ('MAINTAINABILITY' | 'RELIABILITY' | 'SECURITY')[];
  issueStatuses?: ('OPEN' | 'CONFIRMED' | 'RESOLVED' | 'REOPENED' | 'CLOSED')[];

  // Rules and tags
  rules?: string[];
  tags?: string[];

  // Date filters
  createdAfter?: string;
  createdBefore?: string;
  createdAt?: string;
  createdInLast?: string;

  // Assignment
  assigned?: boolean;
  assignees?: string[];
  author?: string;
  authors?: string[];

  // Security standards
  cwe?: string[];
  owaspTop10?: string[];
  owaspTop10v2021?: string[];
  sansTop25?: string[];
  sonarsourceSecurity?: string[];
  sonarsourceSecurityCategory?: string[];

  // Languages
  languages?: string[];

  // Facets
  facets?: string[];
  facetMode?: 'effort' | 'count';

  // New code
  sinceLeakPeriod?: boolean;
  inNewCodePeriod?: boolean;

  // Sorting
  s?: string;
  asc?: boolean;

  // Additional fields
  additionalFields?: string[];

  // Deprecated
  hotspots?: boolean;
  severity?: 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';
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
  componentKeys: string[] | string;
  metricKeys: string[] | string;
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
  periods?: Array<{
    index: number;
    mode: string;
    date: string;
    parameter?: string;
  }>;
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
 * Interface for source code location parameters
 */
export interface SourceCodeParams {
  key: string;
  from?: number;
  to?: number;
  branch?: string;
  pullRequest?: string;
}

/**
 * Interface for SCM blame parameters
 */
export interface ScmBlameParams {
  key: string;
  from?: number;
  to?: number;
  branch?: string;
  pullRequest?: string;
}

/**
 * Interface for line issue in source code
 */
export interface SonarQubeLineIssue {
  line: number;
  issues: SonarQubeIssue[];
}

/**
 * Interface for SCM author information
 */
export interface SonarQubeScmAuthor {
  revision: string;
  date: string;
  author: string;
}

/**
 * Interface for source code line with annotations
 */
export interface SonarQubeSourceLine {
  line: number;
  code: string;
  scmAuthor?: string;
  scmDate?: string;
  scmRevision?: string;
  duplicated?: boolean;
  isNew?: boolean;
  lineHits?: number;
  conditions?: number;
  coveredConditions?: number;
  highlightedText?: string;
  issues?: SonarQubeIssue[];
}

/**
 * Interface for source code result
 */
export interface SonarQubeSourceResult {
  component: {
    key: string;
    path?: string;
    qualifier: string;
    name: string;
    longName?: string;
    language?: string;
  };
  sources: SonarQubeSourceLine[];
}

/**
 * Interface for SCM blame result
 */
export interface SonarQubeScmBlameResult {
  component: {
    key: string;
    path?: string;
    qualifier: string;
    name: string;
    longName?: string;
    language?: string;
  };
  sources: {
    [lineNumber: string]: SonarQubeScmAuthor;
  };
}

/**
 * Interface for hotspot search parameters
 */
export interface HotspotSearchParams extends PaginationParams {
  projectKey?: string;
  branch?: string;
  pullRequest?: string;
  status?: 'TO_REVIEW' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE';
  files?: string[];
  assignedToMe?: boolean;
  sinceLeakPeriod?: boolean;
  inNewCodePeriod?: boolean;
}

/**
 * Interface for security hotspot
 */
export interface SonarQubeHotspot {
  key: string;
  component: string;
  project: string;
  securityCategory: string;
  vulnerabilityProbability: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TO_REVIEW' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE';
  line: number;
  message: string;
  assignee?: string;
  author?: string;
  creationDate: string;
  updateDate: string;
  textRange?: {
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
  };
  flows?: Array<{
    locations: Array<{
      component: string;
      textRange: {
        startLine: number;
        endLine: number;
        startOffset: number;
        endOffset: number;
      };
      msg: string;
    }>;
  }>;
  ruleKey?: string;
}

/**
 * Interface for hotspot search result
 */
export interface SonarQubeHotspotSearchResult {
  hotspots: SonarQubeHotspot[];
  components?: Array<{
    key: string;
    qualifier: string;
    name: string;
    longName?: string;
    path?: string;
  }>;
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Interface for hotspot details
 */
export interface SonarQubeHotspotDetails extends SonarQubeHotspot {
  rule: {
    key: string;
    name: string;
    securityCategory: string;
    vulnerabilityProbability: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  changelog?: Array<{
    user: string;
    userName?: string;
    creationDate: string;
    diffs: Array<{
      key: string;
      oldValue?: string;
      newValue?: string;
    }>;
  }>;
  comment?: Array<{
    key: string;
    login: string;
    htmlText: string;
    markdown?: string;
    createdAt: string;
  }>;
  users?: Array<{
    login: string;
    name: string;
    active: boolean;
  }>;
}

/**
 * Interface for hotspot status update parameters
 */
export interface HotspotStatusUpdateParams {
  hotspot: string;
  status: 'TO_REVIEW' | 'REVIEWED';
  resolution?: 'FIXED' | 'SAFE';
  comment?: string;
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

  // Source Code API methods
  getSourceCode(params: SourceCodeParams): Promise<SonarQubeSourceResult>;
  getScmBlame(params: ScmBlameParams): Promise<SonarQubeScmBlameResult>;

  // Security Hotspots API methods
  searchHotspots(params: HotspotSearchParams): Promise<SonarQubeHotspotSearchResult>;
  getHotspotDetails(hotspotKey: string): Promise<SonarQubeHotspotDetails>;
  updateHotspotStatus(params: HotspotStatusUpdateParams): Promise<void>;
}

/**
 * SonarQube client for interacting with the SonarQube API
 */
export class SonarQubeClient implements ISonarQubeClient {
  private readonly webApiClient: WebApiClient;
  private readonly organization: string | null;

  /**
   * Creates a new SonarQube client
   * @param token SonarQube authentication token
   * @param baseUrl Base URL of the SonarQube instance (default: https://sonarcloud.io)
   * @param organization Organization name
   */
  constructor(token: string, baseUrl = DEFAULT_SONARQUBE_URL, organization?: string | null) {
    this.webApiClient = new WebApiClient(baseUrl, token, organization ?? undefined);
    this.organization = organization ?? null;
  }

  /**
   * Lists all projects in SonarQube
   * @param params Pagination and organization parameters
   * @returns Promise with the list of projects
   */
  async listProjects(params: PaginationParams = {}): Promise<SonarQubeProjectsResult> {
    const { page, pageSize } = params;
    logger.debug('Listing projects', { page, pageSize, organization: this.organization });

    try {
      const builder = this.webApiClient.projects.search();

      if (page !== undefined) {
        builder.page(page);
      }
      if (pageSize !== undefined) {
        builder.pageSize(pageSize);
      }

      const response = await builder.execute();
      logger.debug('Projects retrieved successfully', { count: response.components.length });

      // Transform to our interface
      return {
        projects: response.components.map((component) => ({
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
    } catch (error) {
      logger.error('Failed to list projects', error);
      throw error;
    }
  }

  /**
   * Gets issues for a project in SonarQube
   * @param params Parameters including project key, severity, pagination and organization
   * @returns Promise with the list of issues
   */
  async getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult> {
    const { page, pageSize } = params;
    const builder = this.webApiClient.issues.search();

    // Apply all filters using helper methods
    this.applyComponentFilters(builder, params);
    this.applyIssueFilters(builder, params);
    this.applyDateAndAssignmentFilters(builder, params);
    this.applySecurityAndMetadataFilters(builder, params);

    // Add pagination
    if (page !== undefined) {
      builder.page(page);
    }
    if (pageSize !== undefined) {
      builder.pageSize(pageSize);
    }

    const response = await builder.execute();

    // Transform to our interface
    return {
      issues: response.issues as SonarQubeIssue[],
      components: response.components ?? [],
      rules: (response.rules ?? []) as SonarQubeRule[],
      users: response.users,
      facets: response.facets,
      paging: response.paging ?? { pageIndex: 1, pageSize: 100, total: 0 },
    };
  }

  /**
   * Gets available metrics from SonarQube
   * @param params Parameters including pagination
   * @returns Promise with the list of metrics
   */
  async getMetrics(params: PaginationParams = {}): Promise<SonarQubeMetricsResult> {
    const { page, pageSize } = params;

    const response = await this.webApiClient.metrics.search({
      p: page,
      ps: pageSize,
    });

    // The API might return paging info
    const paging = (
      response as unknown as {
        paging?: { pageIndex: number; pageSize: number; total: number };
      }
    ).paging;

    return {
      metrics: response.metrics as SonarQubeMetric[],
      paging: paging ?? {
        pageIndex: page ?? 1,
        pageSize: pageSize ?? 100,
        total: response.metrics.length,
      },
    };
  }

  /**
   * Gets the health status of the SonarQube instance
   * @returns Promise with the health status
   */
  async getHealth(): Promise<SonarQubeHealthStatus> {
    const response = await this.webApiClient.system.health();
    return {
      health: response.health,
      causes: response.causes ?? [],
    };
  }

  /**
   * Gets the system status of the SonarQube instance
   * @returns Promise with the system status
   */
  async getStatus(): Promise<SonarQubeSystemStatus> {
    const response = await this.webApiClient.system.status();
    return {
      id: response.id,
      version: response.version,
      status: response.status,
    };
  }

  /**
   * Pings the SonarQube instance to check if it's up
   * @returns Promise with the ping response
   */
  async ping(): Promise<string> {
    return this.webApiClient.system.ping();
  }

  /**
   * Gets measures for a specific component
   * @param params Parameters including component key and metrics
   * @returns Promise with the component measures result
   */
  async getComponentMeasures(
    params: ComponentMeasuresParams
  ): Promise<SonarQubeComponentMeasuresResult> {
    const { component, metricKeys, additionalFields, branch, pullRequest } = params;

    const response = await this.webApiClient.measures.component({
      component,
      metricKeys: Array.isArray(metricKeys) ? metricKeys : [metricKeys as string],
      additionalFields: additionalFields as MeasuresAdditionalField[] | undefined,
      branch,
      pullRequest,
    });

    return response as SonarQubeComponentMeasuresResult;
  }

  /**
   * Gets measures for multiple components
   *
   * **Performance Note**: This method uses an N+1 API pattern where it makes one API call per component.
   * For large numbers of components, this can result in many API calls. Consider:
   * - Using pagination to limit the number of components fetched at once
   * - Batching requests if you need measures for many components
   * - Using the single component API (`getComponentMeasures`) when possible
   *
   * @param params Parameters including component keys, metrics, and pagination
   * @returns Promise with the components measures result
   */
  async getComponentsMeasures(
    params: ComponentsMeasuresParams
  ): Promise<SonarQubeComponentsMeasuresResult> {
    const { componentKeys, metricKeys, additionalFields, branch, pullRequest, page, pageSize } =
      params;

    // Use Promise.all to fetch measures for multiple components
    // Note: This results in N+1 API calls (one per component)
    let componentKeysArray: string[];
    if (Array.isArray(componentKeys)) {
      componentKeysArray = componentKeys;
    } else if (typeof componentKeys === 'string' && componentKeys.includes(',')) {
      componentKeysArray = componentKeys.split(',');
    } else {
      componentKeysArray = [componentKeys as string];
    }

    let metricKeysArray: string[];
    if (Array.isArray(metricKeys)) {
      metricKeysArray = metricKeys;
    } else if (typeof metricKeys === 'string' && metricKeys.includes(',')) {
      metricKeysArray = metricKeys.split(',');
    } else {
      metricKeysArray = [metricKeys as string];
    }

    const componentsPromises = componentKeysArray.map(async (componentKey: string) => {
      const result = await this.webApiClient.measures.component({
        component: componentKey,
        metricKeys: metricKeysArray,
        additionalFields: additionalFields as MeasuresAdditionalField[] | undefined,
        branch,
        pullRequest,
      });

      const component = result.component ?? result;
      return {
        key: component.key,
        name: component.name,
        qualifier: component.qualifier,
        measures: component.measures ?? [],
        periods: (component as unknown as SonarQubeMeasureComponent).periods,
      };
    });

    const components = await Promise.all(componentsPromises);

    // Get metrics from the first component response (they should be the same for all)
    const firstResult = await this.webApiClient.measures.component({
      component: componentKeysArray[0],
      metricKeys: metricKeysArray,
      additionalFields: additionalFields as MeasuresAdditionalField[] | undefined,
      branch,
      pullRequest,
    });

    // Apply pagination manually
    const startIndex = ((page ?? 1) - 1) * (pageSize ?? 100);
    const endIndex = startIndex + (pageSize ?? 100);
    const paginatedComponents = components.slice(startIndex, endIndex);

    return {
      components: paginatedComponents,
      metrics: (firstResult.metrics ?? []) as SonarQubeMetric[],
      paging: {
        pageIndex: page ?? 1,
        pageSize: pageSize ?? 100,
        total: components.length,
      },
      period: (
        firstResult as unknown as {
          period?: { index: number; mode: string; date: string; parameter?: string };
        }
      ).period,
    };
  }

  /**
   * Gets measures history for a component
   * @param params Parameters including component, metrics, and date range
   * @returns Promise with the measures history result
   */
  async getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult> {
    const { component, metrics, from, to, branch, pullRequest, page, pageSize } = params;

    const builder = this.webApiClient.measures.searchHistory(
      component,
      Array.isArray(metrics) ? metrics : [metrics as string]
    );

    if (from) {
      builder.from(from);
    }
    if (to) {
      builder.to(to);
    }
    if (branch) {
      builder.withBranch(branch);
    }
    if (pullRequest) {
      builder.withPullRequest(pullRequest);
    }
    if (page !== undefined) {
      builder.page(page);
    }
    if (pageSize !== undefined) {
      builder.pageSize(pageSize);
    }

    const response = await builder.execute();
    return {
      ...response,
      paging: response.paging ?? { pageIndex: 1, pageSize: 100, total: 0 },
    };
  }

  /**
   * Lists all quality gates from SonarQube
   * @returns Promise with the list of quality gates
   */
  async listQualityGates(): Promise<SonarQubeQualityGatesResult> {
    const response = await this.webApiClient.qualityGates.list();
    return {
      qualitygates: response.qualitygates as SonarQubeQualityGate[],
      default: response.default ?? '',
      actions: (response as unknown as { actions?: { create?: boolean } }).actions,
    };
  }

  /**
   * Gets details of a quality gate including its conditions
   * @param id The ID of the quality gate
   * @returns Promise with the quality gate details
   */
  async getQualityGate(id: string): Promise<SonarQubeQualityGate> {
    const response = await this.webApiClient.qualityGates.get({ id });
    return {
      id: response.id,
      name: response.name,
      isDefault: response.isDefault,
      isBuiltIn: response.isBuiltIn,
      conditions: response.conditions as unknown as SonarQubeQualityGateCondition[],
    };
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

    const response = await this.webApiClient.qualityGates.getProjectStatus({
      projectKey,
      branch,
      pullRequest,
    });

    return response as unknown as SonarQubeQualityGateStatus;
  }

  /**
   * Gets source code with optional SCM and issue annotations
   * @param params Parameters including component key, line range, branch, and pull request
   * @returns Promise with the source code and annotations
   */
  async getSourceCode(params: SourceCodeParams): Promise<SonarQubeSourceResult> {
    const { key, from, to, branch, pullRequest } = params;

    // Get raw source code
    const response = await this.webApiClient.sources.raw({
      key,
      ...(branch && { branch }),
      ...(pullRequest && { pullRequest }),
    });

    // Transform the response to match our interface
    // The raw method returns a string with lines separated by newlines
    const lines = response.split('\n');
    let sourcesArray = lines.map((line, index) => ({
      line: index + 1,
      code: line,
    }));

    // Apply line range filtering if specified
    if (from !== undefined || to !== undefined) {
      const startLine = from ?? 1;
      const endLine = to ?? sourcesArray.length;
      sourcesArray = sourcesArray.filter(
        (source) => source.line >= startLine && source.line <= endLine
      );
    }

    const sources = {
      sources: sourcesArray,
      component: {
        key,
        qualifier: 'FIL', // Default for files
        name: key.split('/').pop() ?? key,
        longName: key,
      },
    };

    // Get issues for this component to annotate the source
    if (key) {
      try {
        const issues = await this.getIssues({
          projects: [key],
          branch,
          pullRequest,
          onComponentOnly: true,
        });

        // Map issues to source lines
        const sourceLines = sources.sources.map((line) => {
          const lineIssues = issues.issues.filter((issue) => issue.line === line.line);
          return {
            ...line,
            issues: lineIssues.length > 0 ? lineIssues : undefined,
          };
        });

        return {
          component: sources.component,
          sources: sourceLines,
        };
      } catch (error) {
        // Log the error for debugging but continue with source code without annotations
        logger.error('Failed to retrieve issues for source code annotation', error);
        // Return source code without issue annotations
        return sources;
      }
    }

    return sources;
  }

  /**
   * Gets SCM blame information for a file
   * @param params Parameters including component key, line range, branch, and pull request
   * @returns Promise with the blame information
   */
  async getScmBlame(params: ScmBlameParams): Promise<SonarQubeScmBlameResult> {
    const { key, from, to } = params;

    const response = await this.webApiClient.sources.scm({
      key,
      ...(from && { from }),
      ...(to && { to }),
    });

    return response as unknown as SonarQubeScmBlameResult;
  }

  /**
   * Searches for security hotspots
   * @param params Parameters for hotspot search
   * @returns Promise with the hotspot search results
   */
  async searchHotspots(params: HotspotSearchParams): Promise<SonarQubeHotspotSearchResult> {
    const {
      projectKey,
      // branch, pullRequest, inNewCodePeriod are not currently supported by the API
      status,
      resolution,
      files,
      assignedToMe,
      sinceLeakPeriod,
      page,
      pageSize,
    } = params;

    const builder = this.webApiClient.hotspots.search();

    // Apply filters using builder methods
    if (projectKey) builder.projectKey(projectKey);
    // Note: branch, pullRequest, and inNewCodePeriod parameters may not be supported
    // by the current hotspots API but are included for future compatibility
    if (status) builder.status(status);
    if (resolution) builder.resolution(resolution);
    if (files && files.length > 0) {
      builder.files(files);
    }
    if (assignedToMe !== undefined) builder.onlyMine(assignedToMe);
    if (sinceLeakPeriod !== undefined) builder.sinceLeakPeriod(sinceLeakPeriod);
    if (page !== undefined) builder.page(page);
    if (pageSize !== undefined) builder.pageSize(pageSize);

    const response = await builder.execute();

    // Transform the response to match our interface
    return {
      hotspots: response.hotspots as SonarQubeHotspot[],
      components: response.components,
      paging: response.paging || {
        pageIndex: page || 1,
        pageSize: pageSize || 100,
        total: response.hotspots.length,
      },
    };
  }

  /**
   * Gets detailed information about a specific security hotspot
   * @param hotspotKey The key of the hotspot
   * @returns Promise with the hotspot details
   */
  async getHotspotDetails(hotspotKey: string): Promise<SonarQubeHotspotDetails> {
    const response = await this.webApiClient.hotspots.show({
      hotspot: hotspotKey,
    });

    return response as unknown as SonarQubeHotspotDetails;
  }

  /**
   * Updates the status of a security hotspot
   * @param params Parameters for updating hotspot status
   * @returns Promise that resolves when the update is complete
   */
  async updateHotspotStatus(params: HotspotStatusUpdateParams): Promise<void> {
    const { hotspot, status, resolution, comment } = params;

    await this.webApiClient.hotspots.changeStatus({
      hotspot,
      status,
      ...(resolution && { resolution }),
      ...(comment && { comment }),
    });
  }

  /**
   * Apply component filters to the search builder
   */
  private applyComponentFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    params: Pick<
      IssuesParams,
      | 'projectKey'
      | 'componentKeys'
      | 'components'
      | 'projects'
      | 'onComponentOnly'
      | 'branch'
      | 'pullRequest'
    >
  ): void {
    const {
      projectKey,
      componentKeys,
      components,
      projects,
      onComponentOnly,
      branch,
      pullRequest,
    } = params;

    if (projectKey) {
      builder.withProjects([projectKey]);
    }
    if (componentKeys) {
      builder.withComponents(componentKeys);
    }
    if (components) {
      builder.withComponents(components);
    }
    if (projects) {
      builder.withProjects(projects);
    }
    if (onComponentOnly) {
      builder.onComponentOnly();
    }
    if (branch) {
      builder.onBranch(branch);
    }
    if (pullRequest) {
      builder.onPullRequest(pullRequest);
    }
  }

  /**
   * Apply issue filters to the search builder
   */
  private applyIssueFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    params: Pick<
      IssuesParams,
      | 'issues'
      | 'severities'
      | 'severity'
      | 'statuses'
      | 'resolutions'
      | 'resolved'
      | 'types'
      | 'cleanCodeAttributeCategories'
      | 'impactSeverities'
      | 'impactSoftwareQualities'
      | 'issueStatuses'
    >
  ): void {
    const {
      issues,
      severities,
      severity,
      statuses,
      resolutions,
      resolved,
      types,
      cleanCodeAttributeCategories,
      impactSeverities,
      impactSoftwareQualities,
      issueStatuses,
    } = params;

    if (issues) {
      builder.withIssues(issues);
    }
    if (severities) {
      builder.withSeverities(severities);
    }
    if (severity) {
      builder.withSeverities([severity]);
    }
    if (statuses) {
      builder.withStatuses(statuses);
    }
    if (resolutions) {
      builder.withResolutions(resolutions);
    }
    if (resolved !== undefined) {
      if (resolved) {
        builder.onlyResolved();
      } else {
        builder.onlyUnresolved();
      }
    }
    if (types) {
      builder.withTypes(types);
    }
    if (cleanCodeAttributeCategories) {
      builder.withCleanCodeAttributeCategories(cleanCodeAttributeCategories);
    }
    if (impactSeverities) {
      builder.withImpactSeverities(impactSeverities);
    }
    if (impactSoftwareQualities) {
      builder.withImpactSoftwareQualities(impactSoftwareQualities);
    }
    if (issueStatuses) {
      builder.withIssueStatuses(issueStatuses);
    }
  }

  /**
   * Apply date and assignment filters to the search builder
   */
  private applyDateAndAssignmentFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    params: Pick<
      IssuesParams,
      | 'createdAfter'
      | 'createdBefore'
      | 'createdAt'
      | 'createdInLast'
      | 'assigned'
      | 'assignees'
      | 'author'
      | 'authors'
    >
  ): void {
    const {
      createdAfter,
      createdBefore,
      createdAt,
      createdInLast,
      assigned,
      assignees,
      author,
      authors,
    } = params;

    if (createdAfter) {
      builder.createdAfter(createdAfter);
    }
    if (createdBefore) {
      builder.createdBefore(createdBefore);
    }
    if (createdAt) {
      builder.createdAt(createdAt);
    }
    if (createdInLast) {
      builder.createdInLast(createdInLast);
    }
    if (assigned !== undefined) {
      if (assigned) {
        builder.onlyAssigned();
      } else {
        builder.onlyUnassigned();
      }
    }
    if (assignees) {
      builder.assignedToAny(assignees);
    }
    if (author) {
      builder.byAuthor(author);
    }
    if (authors) {
      builder.byAuthors(authors);
    }
  }

  /**
   * Apply security and metadata filters to the search builder
   */
  private applySecurityAndMetadataFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    params: Pick<
      IssuesParams,
      | 'cwe'
      | 'owaspTop10'
      | 'owaspTop10v2021'
      | 'sansTop25'
      | 'sonarsourceSecurity'
      | 'sonarsourceSecurityCategory'
      | 'rules'
      | 'tags'
      | 'languages'
      | 'facets'
      | 'facetMode'
      | 'sinceLeakPeriod'
      | 'inNewCodePeriod'
      | 's'
      | 'asc'
      | 'additionalFields'
    >
  ): void {
    const {
      cwe,
      owaspTop10,
      owaspTop10v2021,
      sansTop25,
      sonarsourceSecurity,
      sonarsourceSecurityCategory,
      rules,
      tags,
      languages,
      facets,
      facetMode,
      sinceLeakPeriod,
      inNewCodePeriod,
      s,
      asc,
      additionalFields,
    } = params;

    if (cwe) {
      builder.withCwe(cwe);
    }
    if (owaspTop10) {
      builder.withOwaspTop10(owaspTop10);
    }
    if (owaspTop10v2021) {
      builder.withOwaspTop10v2021(owaspTop10v2021);
    }
    if (sansTop25) {
      builder.withSansTop25(sansTop25);
    }
    if (sonarsourceSecurity) {
      builder.withSonarSourceSecurity(sonarsourceSecurity);
    }
    if (sonarsourceSecurityCategory) {
      builder.withSonarSourceSecurityNew(sonarsourceSecurityCategory);
    }
    if (rules) {
      builder.withRules(rules);
    }
    if (tags) {
      builder.withTags(tags);
    }
    if (languages) {
      builder.withLanguages(languages);
    }
    if (facets) {
      builder.withFacets(facets);
    }
    if (facetMode) {
      builder.withFacetMode(facetMode);
    }
    if (sinceLeakPeriod) {
      builder.sinceLeakPeriod();
    }
    if (inNewCodePeriod) {
      builder.inNewCodePeriod();
    }
    if (s) {
      builder.sortBy(s, asc);
    }
    if (additionalFields) {
      builder.withAdditionalFields(additionalFields);
    }
  }
}

/**
 * Factory function to create a SonarQube client
 * @param token SonarQube authentication token
 * @param baseUrl Base URL of the SonarQube instance
 * @param organization Organization name
 * @returns A new SonarQube client instance
 */
export function createSonarQubeClient(
  token: string,
  baseUrl?: string,
  organization?: string | null
): ISonarQubeClient {
  return new SonarQubeClient(token, baseUrl, organization);
}
