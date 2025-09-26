// Import types for interface definitions
import type { PaginationParams } from './common.js';
import type { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';
import type { SonarQubeProjectsResult } from './projects.js';
import type {
  IssuesParams,
  SonarQubeIssuesResult,
  SonarQubeIssue,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  AssignIssueParams,
  ConfirmIssueParams,
  UnconfirmIssueParams,
  ResolveIssueParams,
  ReopenIssueParams,
  SonarQubeIssueComment,
  DoTransitionResponse,
} from './issues.js';
import type { SonarQubeMetricsResult } from './metrics.js';
import type {
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeMeasuresHistoryResult,
} from './measures.js';
import type { SonarQubeHealthStatus, SonarQubeSystemStatus } from './system.js';
import type {
  SonarQubeQualityGate,
  SonarQubeQualityGatesResult,
  SonarQubeQualityGateStatus,
  ProjectQualityGateParams,
} from './quality-gates.js';
import type {
  SourceCodeParams,
  ScmBlameParams,
  SonarQubeSourceResult,
  SonarQubeScmBlameResult,
} from './source-code.js';
import type {
  HotspotSearchParams,
  SonarQubeHotspotSearchResult,
  SonarQubeHotspotDetails,
  HotspotStatusUpdateParams,
} from './hotspots.js';
// Components types are imported and re-exported below

// Re-export all types for backward compatibility and ease of use

// Common types
export type { PaginationParams, SeverityLevel } from './common.js';

// Project types
export type { SonarQubeProject, SonarQubeProjectsResult } from './projects.js';

// Issue types
export type {
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
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  AssignIssueParams,
  ConfirmIssueParams,
  UnconfirmIssueParams,
  ResolveIssueParams,
  ReopenIssueParams,
  DoTransitionRequest,
  DoTransitionResponse,
} from './issues.js';

// Metric types
export type { SonarQubeMetric, SonarQubeMetricsResult } from './metrics.js';

// Measure types
export type {
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  SonarQubeMeasure,
  SonarQubeMeasureComponent,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeMeasuresHistoryResult,
} from './measures.js';

// System types
export type { SonarQubeHealthStatus, SonarQubeSystemStatus } from './system.js';

// Quality gate types
export type {
  SonarQubeQualityGateCondition,
  SonarQubeQualityGate,
  SonarQubeQualityGatesResult,
  SonarQubeQualityGateStatus,
  ProjectQualityGateParams,
} from './quality-gates.js';

// Source code types
export type {
  SourceCodeParams,
  ScmBlameParams,
  SonarQubeLineIssue,
  SonarQubeScmAuthor,
  SonarQubeSourceLine,
  SonarQubeSourceResult,
  SonarQubeScmBlameResult,
} from './source-code.js';

// Hotspot types
export type {
  HotspotSearchParams,
  SonarQubeHotspot,
  SonarQubeHotspotSearchResult,
  SonarQubeHotspotDetails,
  HotspotStatusUpdateParams,
} from './hotspots.js';

// Component types
export type {
  ComponentQualifier,
  ComponentsResult,
  ComponentsTreeResult,
  ComponentShowResult,
  ComponentsParams,
  ComponentsSearchParams,
  ComponentsTreeParams,
  ComponentShowParams,
} from './components.js';

// Client interface
export interface ISonarQubeClient {
  // Expose webApiClient for testing purposes
  readonly webApiClient: WebApiClient;

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
  hotspots(params: HotspotSearchParams): Promise<SonarQubeHotspotSearchResult>;
  hotspot(hotspotKey: string): Promise<SonarQubeHotspotDetails>;
  updateHotspotStatus(params: HotspotStatusUpdateParams): Promise<void>;

  // Issue resolution methods
  markIssueFalsePositive(params: MarkIssueFalsePositiveParams): Promise<DoTransitionResponse>;
  markIssueWontFix(params: MarkIssueWontFixParams): Promise<DoTransitionResponse>;
  markIssuesFalsePositive(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]>;
  markIssuesWontFix(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]>;

  // Issue comment methods
  addCommentToIssue(params: AddCommentToIssueParams): Promise<SonarQubeIssueComment>;

  // Issue assignment methods
  assignIssue(params: AssignIssueParams): Promise<SonarQubeIssue>;

  // Issue transition methods
  confirmIssue(params: ConfirmIssueParams): Promise<DoTransitionResponse>;
  unconfirmIssue(params: UnconfirmIssueParams): Promise<DoTransitionResponse>;
  resolveIssue(params: ResolveIssueParams): Promise<DoTransitionResponse>;
  reopenIssue(params: ReopenIssueParams): Promise<DoTransitionResponse>;
}
