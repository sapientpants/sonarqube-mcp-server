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
}

/**
 * Interface for SonarQube issue
 */
export interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  project: string;
  line?: number;
  hash?: string;
  status: string;
  message: string;
  effort?: string;
  debt?: string;
  author?: string;
  tags: string[];
  creationDate: string;
  updateDate: string;
  type: string;
}

/**
 * Interface for SonarQube issues result
 */
export interface SonarQubeIssuesResult {
  issues: SonarQubeIssue[];
  components: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Interface for SonarQube projects result
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
export interface GetIssuesParams extends PaginationParams {
  projectKey: string;
  severity?: 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL' | 'BLOCKER';
  organization?: string;
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
export interface ListProjectsParams extends PaginationParams {
  organization?: string;
}

/**
 * SonarQube client for interacting with the SonarQube API
 */
export class SonarQubeClient {
  private baseUrl: string;
  private auth: { username: string; password: string };

  /**
   * Creates a new SonarQube client
   * @param baseUrl Base URL of the SonarQube instance (default: https://next.sonarqube.com/sonarqube)
   * @param token SonarQube authentication token
   */
  constructor(token: string, baseUrl = 'https://next.sonarqube.com/sonarqube') {
    this.baseUrl = baseUrl;
    this.auth = { username: token, password: '' };
  }

  /**
   * Lists all projects in SonarQube
   * @param params Pagination and organization parameters
   * @returns Promise with the list of projects
   */
  async listProjects(params: ListProjectsParams = {}): Promise<SonarQubeProjectsResult> {
    const { organization, page, pageSize } = params;

    const response = await axios.get(`${this.baseUrl}/api/projects/search`, {
      auth: this.auth,
      params: {
        organization,
        p: page,
        ps: pageSize,
      },
    });

    return response.data;
  }

  /**
   * Gets issues for a project in SonarQube
   * @param params Parameters including project key, severity, pagination and organization
   * @returns Promise with the list of issues
   */
  async getIssues(params: GetIssuesParams): Promise<SonarQubeIssuesResult> {
    const {
      projectKey,
      severity,
      organization,
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
        organization,
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
}
