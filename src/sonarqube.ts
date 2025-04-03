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
 * SonarQube client for interacting with the SonarQube API
 */
export class SonarQubeClient {
  private baseUrl: string;
  private auth: { username: string; password: string };
  private organization: string | null;

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
}
