import type { PaginationParams, SeverityLevel } from './common.js';

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
  vulnerabilityProbability: SeverityLevel;
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
  components:
    | Array<{
        key: string;
        qualifier: string;
        name: string;
        longName: string | undefined;
        path: string | undefined;
      }>
    | undefined;
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
    vulnerabilityProbability: SeverityLevel;
  };
  changelog:
    | Array<{
        user: string;
        userName: string | undefined;
        creationDate: string;
        diffs: Array<{
          key: string;
          oldValue: string | undefined;
          newValue: string | undefined;
        }>;
      }>
    | undefined;
  comment:
    | Array<{
        key: string;
        login: string;
        htmlText: string;
        markdown: string | undefined;
        createdAt: string;
      }>
    | undefined;
  users:
    | Array<{
        login: string;
        name: string;
        active: boolean;
      }>
    | undefined;
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
