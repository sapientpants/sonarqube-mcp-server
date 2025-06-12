import type { PaginationParams } from './common.js';
import type { SonarQubeMetric } from './metrics.js';

/**
 * Interface for component measures parameters
 */
export interface ComponentMeasuresParams {
  component: string;
  metricKeys: string[];
  additionalFields?: string[];
  branch?: string;
  pullRequest?: string;
  period?: string;
}

/**
 * Interface for components measures parameters
 */
export interface ComponentsMeasuresParams extends PaginationParams {
  componentKeys: string[] | string;
  metricKeys: string[] | string;
  additionalFields?: string[];
  branch?: string;
  pullRequest?: string;
  period?: string;
}

/**
 * Interface for measures history parameters
 */
export interface MeasuresHistoryParams extends PaginationParams {
  component: string;
  metrics: string[];
  from?: string;
  to?: string;
  branch?: string;
  pullRequest?: string;
}

/**
 * Interface for SonarQube measure
 */
export interface SonarQubeMeasure {
  metric: string;
  value?: string;
  period?: {
    index: number;
    value: string;
  };
  bestValue?: boolean;
}

/**
 * Interface for SonarQube measure component
 */
export interface SonarQubeMeasureComponent {
  key: string;
  name: string;
  qualifier: string;
  measures: SonarQubeMeasure[];
  periods?: Array<{
    index: number;
    mode: string;
    date: string;
    parameter?: string;
  }>;
}

/**
 * Interface for SonarQube component with measures result
 */
export interface SonarQubeComponentMeasuresResult {
  component: SonarQubeMeasureComponent;
  metrics: SonarQubeMetric[];
  period?: {
    index: number;
    mode: string;
    date: string;
    parameter?: string;
  };
}

/**
 * Interface for SonarQube components with measures result
 */
export interface SonarQubeComponentsMeasuresResult {
  components: SonarQubeMeasureComponent[];
  metrics: SonarQubeMetric[];
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  period?: {
    index: number;
    mode: string;
    date: string;
    parameter?: string;
  };
}

/**
 * Interface for SonarQube measures history result
 */
export interface SonarQubeMeasuresHistoryResult {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  measures: {
    metric: string;
    history: {
      date: string;
      value?: string;
    }[];
  }[];
}
