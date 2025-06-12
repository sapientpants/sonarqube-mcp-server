// Import types for interface definitions
import type { PaginationParams } from './common.js';
import type { SonarQubeProjectsResult } from './projects.js';
import type {
  IssuesParams,
  SonarQubeIssuesResult,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
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

// Client interface
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
  hotspots(params: HotspotSearchParams): Promise<SonarQubeHotspotSearchResult>;
  hotspot(hotspotKey: string): Promise<SonarQubeHotspotDetails>;
  updateHotspotStatus(params: HotspotStatusUpdateParams): Promise<void>;

  // Issue resolution methods
  markIssueFalsePositive(params: MarkIssueFalsePositiveParams): Promise<DoTransitionResponse>;
  markIssueWontFix(params: MarkIssueWontFixParams): Promise<DoTransitionResponse>;
  markIssuesFalsePositive(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]>;
  markIssuesWontFix(params: BulkIssueMarkParams): Promise<DoTransitionResponse[]>;
}
