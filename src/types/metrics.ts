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
