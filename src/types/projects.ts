/**
 * Interface for SonarQube project
 */
export interface SonarQubeProject {
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate: string | undefined;
  revision: string | undefined;
  managed: boolean | undefined;
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
