import axios from 'axios';

/**
 * Interface for pagination parameters
 */
interface PaginationParams {
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
}

/**
 * Interface for list projects parameters
 */
export interface ProjectsParams extends PaginationParams {}

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
 * Interface for metrics parameters
 */
export interface MetricsParams extends PaginationParams {}

/**
 * SonarQube client for interacting with the SonarQube API
 */
export class SonarQubeClient {
  private readonly baseUrl: string;
  private readonly auth: { username: string; password: string };
  private readonly organization: string | null;

  /**
   * Creates a new SonarQube client
   * @param token SonarQube authentication token
   * @param baseUrl Base URL of the SonarQube instance (default: https://sonarcloud.io)
   * @param organization Organization name
   */
  constructor(token: string, baseUrl = 'https://sonarcloud.io', organization?: string | null) {
    this.baseUrl = baseUrl;
    this.auth = { username: token, password: '' };
    this.organization = organization ?? null;
  }

  /**
   * Lists all projects in SonarQube
   * @param params Pagination and organization parameters
   * @returns Promise with the list of projects
   */
  async listProjects(params: ProjectsParams = {}): Promise<SonarQubeProjectsResult> {
    const { page, pageSize } = params;

    const response = await axios.get(`${this.baseUrl}/api/projects/search`, {
      auth: this.auth,
      params: {
        organization: this.organization,
        p: page,
        ps: pageSize,
      },
    });

    // Transform SonarQube 'components' to our clean 'projects' interface
    return {
      projects: response.data.components.map((component: SonarQubeApiComponent) => ({
        key: component.key,
        name: component.name,
        qualifier: component.qualifier,
        visibility: component.visibility,
        lastAnalysisDate: component.lastAnalysisDate,
        revision: component.revision,
        managed: component.managed,
      })),
      paging: response.data.paging,
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
    } = params;

    const response = await axios.get(`${this.baseUrl}/api/issues/search`, {
      auth: this.auth,
      params: {
        componentKeys: projectKey,
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
      },
    });

    return response.data;
  }

  /**
   * Gets available metrics from SonarQube
   * @param params Parameters including pagination
   * @returns Promise with the list of metrics
   */
  async getMetrics(params: MetricsParams = {}): Promise<SonarQubeMetricsResult> {
    const { page, pageSize } = params;

    const response = await axios.get(`${this.baseUrl}/api/metrics/search`, {
      auth: this.auth,
      params: {
        organization: this.organization,
        p: page,
        ps: pageSize,
      },
    });

    // Check if paging info exists, otherwise create a default
    const paging = response.data.paging || {
      pageIndex: page || 1,
      pageSize: pageSize || 100,
      total: response.data.metrics?.length || 0,
    };

    return {
      metrics: response.data.metrics || [],
      paging: {
        pageIndex: paging.pageIndex,
        pageSize: paging.pageSize,
        total: paging.total,
      },
    };
  }
}
