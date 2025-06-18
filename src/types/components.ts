import type { SonarQubeComponent } from './issues.js';

/**
 * Component qualifier types based on SonarQube API
 */
export type ComponentQualifier =
  | 'TRK' // Project
  | 'DIR' // Directory
  | 'FIL' // File
  | 'UTS' // Unit Test
  | 'BRC' // Branch
  | 'APP' // Application
  | 'VW' // View
  | 'SVW' // Sub-view
  | 'LIB'; // Library

/**
 * Result of component search operation
 */
export interface ComponentsResult {
  components: SonarQubeComponent[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Result of component tree navigation
 */
export interface ComponentsTreeResult {
  components: SonarQubeComponent[];
  baseComponent?: SonarQubeComponent;
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Result of component show operation
 */
export interface ComponentShowResult {
  component: SonarQubeComponent;
  ancestors: SonarQubeComponent[];
}

/**
 * Parameters for searching components
 */
export interface ComponentsSearchParams {
  query?: string;
  qualifiers?: ComponentQualifier[];
  language?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Parameters for navigating component tree
 */
export interface ComponentsTreeParams {
  component: string;
  strategy?: 'all' | 'children' | 'leaves';
  qualifiers?: ComponentQualifier[];
  sort?: 'name' | 'path' | 'qualifier';
  asc?: boolean;
  page?: number;
  pageSize?: number;
  branch?: string;
  pullRequest?: string;
}

/**
 * Parameters for showing component details
 */
export interface ComponentShowParams {
  key: string;
  branch?: string;
  pullRequest?: string;
}

/**
 * Combined parameters for components action
 */
export interface ComponentsParams {
  // Search parameters
  query?: string;
  qualifiers?: ComponentQualifier[];
  language?: string;

  // Tree navigation parameters
  component?: string;
  strategy?: 'all' | 'children' | 'leaves';

  // Show component parameter
  key?: string;

  // Common parameters
  asc?: boolean;
  ps?: number;
  p?: number;
  branch?: string;
  pullRequest?: string;
}
