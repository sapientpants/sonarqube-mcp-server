import { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';
import { createLogger } from './utils/logger.js';
import {
  ProjectsDomain,
  IssuesDomain,
  MetricsDomain,
  MeasuresDomain,
  SystemDomain,
  QualityGatesDomain,
  SourceCodeDomain,
  HotspotsDomain,
} from './domains/index.js';

// Import types that are used in the implementation
import type {
  PaginationParams,
  SonarQubeProjectsResult,
  SonarQubeIssuesResult,
  IssuesParams,
  SonarQubeMetricsResult,
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeMeasuresHistoryResult,
  SonarQubeHealthStatus,
  SonarQubeSystemStatus,
  SonarQubeQualityGatesResult,
  SonarQubeQualityGate,
  SonarQubeQualityGateStatus,
  ProjectQualityGateParams,
  SourceCodeParams,
  ScmBlameParams,
  SonarQubeSourceResult,
  SonarQubeScmBlameResult,
  HotspotSearchParams,
  SonarQubeHotspot,
  SonarQubeHotspotSearchResult,
  SonarQubeHotspotDetails,
  HotspotStatusUpdateParams,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  DoTransitionResponse,
  ISonarQubeClient,
  SonarQubeIssueComment,
} from './types/index.js';

// Re-export all types for backward compatibility
export type {
  PaginationParams,
  SeverityLevel,
  SonarQubeProject,
  SonarQubeProjectsResult,
  SonarQubeIssue,
  SonarQubeIssueComment,
  SonarQubeIssueFlow,
  SonarQubeIssueImpact,
  SonarQubeIssueLocation,
  SonarQubeMessageFormatting,
  SonarQubeTextRange,
  SonarQubeComponent,
  SonarQubeRule,
  SonarQubeUser,
  SonarQubeFacet,
  SonarQubeFacetValue,
  SonarQubeIssuesResult,
  IssuesParams,
  SonarQubeMetric,
  SonarQubeMetricsResult,
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  SonarQubeMeasure,
  SonarQubeMeasureComponent,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeMeasuresHistoryResult,
  SonarQubeHealthStatus,
  SonarQubeSystemStatus,
  SonarQubeQualityGateCondition,
  SonarQubeQualityGate,
  SonarQubeQualityGatesResult,
  SonarQubeQualityGateStatus,
  ProjectQualityGateParams,
  SourceCodeParams,
  ScmBlameParams,
  SonarQubeLineIssue,
  SonarQubeScmAuthor,
  SonarQubeSourceLine,
  SonarQubeSourceResult,
  SonarQubeScmBlameResult,
  HotspotSearchParams,
  SonarQubeHotspot,
  SonarQubeHotspotSearchResult,
  SonarQubeHotspotDetails,
  HotspotStatusUpdateParams,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  ISonarQubeClient,
} from './types/index.js';

const logger = createLogger('sonarqube');

/**
 * Default SonarQube URL
 */
const DEFAULT_SONARQUBE_URL = 'https://sonarcloud.io';

/**
 * SonarQube client for interacting with the SonarQube API
 */
export class SonarQubeClient implements ISonarQubeClient {
  private readonly webApiClient: WebApiClient;
  private readonly organization: string | null;

  // Domain modules
  private readonly projectsDomain: ProjectsDomain;
  private readonly issuesDomain: IssuesDomain;
  private readonly metricsDomain: MetricsDomain;
  private readonly measuresDomain: MeasuresDomain;
  private readonly systemDomain: SystemDomain;
  private readonly qualityGatesDomain: QualityGatesDomain;
  private readonly sourceCodeDomain: SourceCodeDomain;
  private readonly hotspotsDomain: HotspotsDomain;

  /**
   * Creates a new SonarQube client
   * @param token SonarQube authentication token
   * @param baseUrl Base URL of the SonarQube instance (default: https://sonarcloud.io)
   * @param organization Organization name
   */
  constructor(token: string, baseUrl = DEFAULT_SONARQUBE_URL, organization?: string | null) {
    this.webApiClient = WebApiClient.withToken(
      baseUrl,
      token,
      organization ? { organization } : undefined
    );
    this.organization = organization ?? null;

    // Initialize domain modules
    this.projectsDomain = new ProjectsDomain(this.webApiClient, this.organization);
    this.issuesDomain = new IssuesDomain(this.webApiClient, this.organization);
    this.metricsDomain = new MetricsDomain(this.webApiClient, this.organization);
    this.measuresDomain = new MeasuresDomain(this.webApiClient, this.organization);
    this.systemDomain = new SystemDomain(this.webApiClient, this.organization);
    this.qualityGatesDomain = new QualityGatesDomain(this.webApiClient, this.organization);
    this.sourceCodeDomain = new SourceCodeDomain(
      this.webApiClient,
      this.organization,
      this.issuesDomain
    );
    this.hotspotsDomain = new HotspotsDomain(this.webApiClient, this.organization);
  }

  /**
   * Initializes all domain modules for a client instance
   */
  private static initializeDomains(client: {
    webApiClient: WebApiClient;
    organization: string | null;
    projectsDomain?: ProjectsDomain;
    issuesDomain?: IssuesDomain;
    metricsDomain?: MetricsDomain;
    measuresDomain?: MeasuresDomain;
    systemDomain?: SystemDomain;
    qualityGatesDomain?: QualityGatesDomain;
    sourceCodeDomain?: SourceCodeDomain;
    hotspotsDomain?: HotspotsDomain;
  }): void {
    client.projectsDomain = new ProjectsDomain(client.webApiClient, client.organization);
    client.issuesDomain = new IssuesDomain(client.webApiClient, client.organization);
    client.metricsDomain = new MetricsDomain(client.webApiClient, client.organization);
    client.measuresDomain = new MeasuresDomain(client.webApiClient, client.organization);
    client.systemDomain = new SystemDomain(client.webApiClient, client.organization);
    client.qualityGatesDomain = new QualityGatesDomain(client.webApiClient, client.organization);
    client.sourceCodeDomain = new SourceCodeDomain(
      client.webApiClient,
      client.organization,
      client.issuesDomain
    );
    client.hotspotsDomain = new HotspotsDomain(client.webApiClient, client.organization);
  }

  /**
   * Creates a SonarQube client with HTTP Basic authentication
   * @param username Username for basic auth
   * @param password Password for basic auth
   * @param baseUrl Base URL of the SonarQube instance
   * @param organization Organization name
   * @returns A new SonarQube client instance
   */
  static withBasicAuth(
    username: string,
    password: string,
    baseUrl = DEFAULT_SONARQUBE_URL,
    organization?: string | null
  ): SonarQubeClient {
    const client = Object.create(SonarQubeClient.prototype);
    client.webApiClient = WebApiClient.withBasicAuth(
      baseUrl,
      username,
      password,
      organization ? { organization } : undefined
    );
    client.organization = organization ?? null;
    SonarQubeClient.initializeDomains(client);
    return client;
  }

  /**
   * Creates a SonarQube client with system passcode authentication
   * @param passcode System passcode
   * @param baseUrl Base URL of the SonarQube instance
   * @param organization Organization name
   * @returns A new SonarQube client instance
   */
  static withPasscode(
    passcode: string,
    baseUrl = DEFAULT_SONARQUBE_URL,
    organization?: string | null
  ): SonarQubeClient {
    const client = Object.create(SonarQubeClient.prototype);
    client.webApiClient = WebApiClient.withPasscode(
      baseUrl,
      passcode,
      organization ? { organization } : undefined
    );
    client.organization = organization ?? null;
    SonarQubeClient.initializeDomains(client);
    return client;
  }

  /**
   * Lists all projects in SonarQube
   * @param params Pagination and organization parameters
   * @returns Promise with the list of projects
   */
  async listProjects(params: PaginationParams = {}): Promise<SonarQubeProjectsResult> {
    return this.projectsDomain.listProjects(params);
  }

  /**
   * Gets issues for a project in SonarQube
   * @param params Parameters including project key, severity, pagination and organization
   * @returns Promise with the list of issues
   */
  async getIssues(params: IssuesParams): Promise<SonarQubeIssuesResult> {
    return this.issuesDomain.getIssues(params);
  }

  /**
   * Gets available metrics from SonarQube
   * @param params Parameters including pagination
   * @returns Promise with the list of metrics
   */
  async getMetrics(params: PaginationParams = {}): Promise<SonarQubeMetricsResult> {
    return this.metricsDomain.getMetrics(params);
  }

  /**
   * Gets the health status of the SonarQube instance
   * @returns Promise with the health status
   */
  async getHealth(): Promise<SonarQubeHealthStatus> {
    return this.systemDomain.getHealth();
  }

  /**
   * Gets the system status of the SonarQube instance
   * @returns Promise with the system status
   */
  async getStatus(): Promise<SonarQubeSystemStatus> {
    return this.systemDomain.getStatus();
  }

  /**
   * Pings the SonarQube instance to check if it's up
   * @returns Promise with the ping response
   */
  async ping(): Promise<string> {
    return this.systemDomain.ping();
  }

  /**
   * Gets measures for a specific component
   * @param params Parameters including component key and metrics
   * @returns Promise with the component measures result
   */
  async getComponentMeasures(
    params: ComponentMeasuresParams
  ): Promise<SonarQubeComponentMeasuresResult> {
    return this.measuresDomain.getComponentMeasures(params);
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
    return this.measuresDomain.getComponentsMeasures(params);
  }

  /**
   * Gets measures history for a component
   * @param params Parameters including component, metrics, and date range
   * @returns Promise with the measures history result
   */
  async getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult> {
    return this.measuresDomain.getMeasuresHistory(params);
  }

  /**
   * Lists all quality gates from SonarQube
   * @returns Promise with the list of quality gates
   */
  async listQualityGates(): Promise<SonarQubeQualityGatesResult> {
    return this.qualityGatesDomain.listQualityGates();
  }

  /**
   * Gets details of a quality gate including its conditions
   * @param id The ID of the quality gate
   * @returns Promise with the quality gate details
   */
  async getQualityGate(id: string): Promise<SonarQubeQualityGate> {
    return this.qualityGatesDomain.getQualityGate(id);
  }

  /**
   * Gets quality gate status for a specific project
   * @param params Parameters including project key, branch, and pull request
   * @returns Promise with the project's quality gate status
   */
  async getProjectQualityGateStatus(
    params: ProjectQualityGateParams
  ): Promise<SonarQubeQualityGateStatus> {
    return this.qualityGatesDomain.getProjectQualityGateStatus(params);
  }

  /**
   * Gets source code with optional SCM and issue annotations
   * @param params Parameters including component key, line range, branch, and pull request
   * @returns Promise with the source code and annotations
   */
  async getSourceCode(params: SourceCodeParams): Promise<SonarQubeSourceResult> {
    return this.sourceCodeDomain.getSourceCode(params);
  }

  /**
   * Gets SCM blame information for a file
   * @param params Parameters including component key, line range, branch, and pull request
   * @returns Promise with the blame information
   */
  async getScmBlame(params: ScmBlameParams): Promise<SonarQubeScmBlameResult> {
    return this.sourceCodeDomain.getScmBlame(params);
  }

  /**
   * Searches for security hotspots
   * @param params Parameters for hotspot search
   * @returns Promise with the hotspot search results
   */
  async hotspots(params: HotspotSearchParams): Promise<SonarQubeHotspotSearchResult> {
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
      paging: response.paging ?? {
        pageIndex: page ?? 1,
        pageSize: pageSize ?? 100,
        total: response.hotspots.length,
      },
    };
  }

  /**
   * Gets detailed information about a specific security hotspot
   * @param hotspotKey The key of the hotspot
   * @returns Promise with the hotspot details
   */
  async hotspot(hotspotKey: string): Promise<SonarQubeHotspotDetails> {
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
    return this.hotspotsDomain.updateHotspotStatus(params);
  }

  /**
   * Mark an issue as false positive
   * @param params Parameters including issue key and optional comment
   * @returns Promise with the updated issue and related data
   */
  async markIssueFalsePositive(
    params: MarkIssueFalsePositiveParams
  ): Promise<DoTransitionResponse> {
    return this.issuesDomain.markIssueFalsePositive(params);
  }

  /**
   * Mark an issue as won't fix
   * @param params Parameters including issue key and optional comment
   * @returns Promise with the updated issue and related data
   */
  async markIssueWontFix(params: MarkIssueWontFixParams): Promise<DoTransitionResponse> {
    return this.issuesDomain.markIssueWontFix(params);
  }

  /**
   * Mark multiple issues as false positive
   * @param params Parameters including issue keys and optional comment
   * @returns Promise with array of updated issues and related data
   */
  async markIssuesFalsePositive(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]> {
    return this.issuesDomain.markIssuesFalsePositive(params);
  }

  /**
   * Mark multiple issues as won't fix
   * @param params Parameters including issue keys and optional comment
   * @returns Promise with array of updated issues and related data
   */
  async markIssuesWontFix(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]> {
    return this.issuesDomain.markIssuesWontFix(params);
  }

  /**
   * Add a comment to an issue
   * @param params Parameters including issue key and comment text
   * @returns Promise with the created comment details
   */
  async addCommentToIssue(params: AddCommentToIssueParams): Promise<SonarQubeIssueComment> {
    return this.issuesDomain.addCommentToIssue(params);
  }
}

/**
 * Creates a SonarQube client with HTTP Basic authentication
 * @param username Username for basic auth
 * @param password Password for basic auth
 * @param baseUrl Base URL of the SonarQube instance
 * @param organization Organization name
 * @returns A new SonarQube client instance
 */
export function createSonarQubeClientWithBasicAuth(
  username: string,
  password: string,
  baseUrl?: string,
  organization?: string | null
): ISonarQubeClient {
  return SonarQubeClient.withBasicAuth(username, password, baseUrl, organization);
}

/**
 * Creates a SonarQube client with system passcode authentication
 * @param passcode System passcode
 * @param baseUrl Base URL of the SonarQube instance
 * @param organization Organization name
 * @returns A new SonarQube client instance
 */
export function createSonarQubeClientWithPasscode(
  passcode: string,
  baseUrl?: string,
  organization?: string | null
): ISonarQubeClient {
  return SonarQubeClient.withPasscode(passcode, baseUrl, organization);
}

/**
 * Creates a SonarQube client from environment variables
 * Supports multiple authentication methods:
 * - Token auth: SONARQUBE_TOKEN
 * - Basic auth: SONARQUBE_USERNAME and SONARQUBE_PASSWORD
 * - Passcode auth: SONARQUBE_PASSCODE
 * @returns A new SonarQube client instance
 */
export function createSonarQubeClientFromEnv(): ISonarQubeClient {
  const baseUrl = process.env.SONARQUBE_URL ?? DEFAULT_SONARQUBE_URL;
  const organization = process.env.SONARQUBE_ORGANIZATION ?? null;

  // Priority 1: Token auth (backward compatibility)
  if (process.env.SONARQUBE_TOKEN) {
    logger.debug('Using token authentication');
    return new SonarQubeClient(process.env.SONARQUBE_TOKEN, baseUrl, organization);
  }

  // Priority 2: Basic auth
  if (process.env.SONARQUBE_USERNAME) {
    logger.debug('Using basic authentication');
    return createSonarQubeClientWithBasicAuth(
      process.env.SONARQUBE_USERNAME,
      process.env.SONARQUBE_PASSWORD ?? '',
      baseUrl,
      organization
    );
  }

  // Priority 3: Passcode auth
  if (process.env.SONARQUBE_PASSCODE) {
    logger.debug('Using passcode authentication');
    return createSonarQubeClientWithPasscode(process.env.SONARQUBE_PASSCODE, baseUrl, organization);
  }

  throw new Error(
    'No SonarQube authentication configured. Set either SONARQUBE_TOKEN, SONARQUBE_USERNAME/PASSWORD, or SONARQUBE_PASSCODE'
  );
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
