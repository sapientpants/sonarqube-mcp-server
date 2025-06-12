import type { SonarQubeIssue } from './issues.js';

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
