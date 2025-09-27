import type { PaginationParams, SeverityLevel } from './common.js';
export type { DoTransitionRequest, DoTransitionResponse } from 'sonarqube-web-api-client';

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
  assignee?: string;
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
  enabled: boolean | undefined;
  qualifier: string;
  name: string;
  longName: string | undefined;
  path: string | undefined;
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
  users: SonarQubeUser[] | undefined;
  facets: SonarQubeFacet[] | undefined;
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
  directories?: string[];
  files?: string[];
  scopes?: ('MAIN' | 'TEST' | 'OVERALL')[];

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
  impactSeverities?: SeverityLevel[];
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
 * Parameters for marking an issue as false positive
 */
export interface MarkIssueFalsePositiveParams {
  issueKey: string;
  comment?: string;
}

/**
 * Parameters for marking an issue as won't fix
 */
export interface MarkIssueWontFixParams {
  issueKey: string;
  comment?: string;
}

/**
 * Parameters for bulk issue operations
 */
export interface BulkIssueMarkParams {
  issueKeys: string[];
  comment?: string;
}

/**
 * Parameters for adding a comment to an issue
 */
export interface AddCommentToIssueParams {
  issueKey: string;
  text: string;
}

/**
 * Parameters for assigning an issue
 */
export interface AssignIssueParams {
  issueKey: string;
  assignee?: string;
}

/**
 * Parameters for confirming an issue
 */
export interface ConfirmIssueParams {
  issueKey: string;
  comment?: string;
}

/**
 * Parameters for unconfirming an issue
 */
export interface UnconfirmIssueParams {
  issueKey: string;
  comment?: string;
}

/**
 * Parameters for resolving an issue
 */
export interface ResolveIssueParams {
  issueKey: string;
  comment?: string;
}

/**
 * Parameters for reopening an issue
 */
export interface ReopenIssueParams {
  issueKey: string;
  comment?: string;
}

// Transition types are re-exported at the top of the file
