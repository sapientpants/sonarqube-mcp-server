/**
 * Interface for SonarQube quality gate condition
 */
export interface SonarQubeQualityGateCondition {
  id: string;
  metric: string;
  op: string;
  error: string;
}

/**
 * Interface for SonarQube quality gate
 */
export interface SonarQubeQualityGate {
  id: string;
  name: string;
  isDefault?: boolean;
  isBuiltIn?: boolean;
  conditions?: SonarQubeQualityGateCondition[];
}

/**
 * Interface for SonarQube quality gates list result
 */
export interface SonarQubeQualityGatesResult {
  qualitygates: SonarQubeQualityGate[];
  default: string;
  actions?: {
    create?: boolean;
  };
}

/**
 * Interface for SonarQube quality gate status
 */
export interface SonarQubeQualityGateStatus {
  projectStatus: {
    status: 'OK' | 'WARN' | 'ERROR' | 'NONE';
    conditions: Array<{
      status: 'OK' | 'WARN' | 'ERROR';
      metricKey: string;
      comparator: string;
      errorThreshold: string;
      actualValue: string;
    }>;
    periods?: Array<{
      index: number;
      mode: string;
      date: string;
      parameter?: string;
    }>;
    ignoredConditions: boolean;
  };
}

/**
 * Interface for project quality gate params
 */
export interface ProjectQualityGateParams {
  projectKey: string;
  branch?: string;
  pullRequest?: string;
}
