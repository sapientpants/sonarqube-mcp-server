import type { PaginationParams, SonarQubeMetricsResult } from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for metrics-related operations
 */
export class MetricsDomain extends BaseDomain {
  /**
   * Gets available metrics from SonarQube
   * @param params Parameters including pagination
   * @returns Promise with the list of metrics
   */
  async getMetrics(
    params: PaginationParams = { page: undefined, pageSize: undefined }
  ): Promise<SonarQubeMetricsResult> {
    const { page, pageSize } = params;

    const request: {
      p?: number;
      ps?: number;
    } = {
      ...(page && { p: page }),
      ...(pageSize && { ps: pageSize }),
    };

    const response = await this.webApiClient.metrics.search(request);

    // The API might return paging info
    const paging = (
      response as unknown as {
        paging?: { pageIndex: number; pageSize: number; total: number };
      }
    ).paging;

    return {
      metrics: response.metrics.map((metric) => ({
        id: metric.id ?? '',
        key: metric.key,
        name: metric.name,
        description: metric.description ?? '',
        domain: metric.domain ?? '',
        type: metric.type,
        direction: metric.direction ?? 0,
        qualitative: metric.qualitative ?? false,
        hidden: metric.hidden ?? false,
        custom: metric.custom ?? false,
      })),
      paging: paging ?? {
        pageIndex: page ?? 1,
        pageSize: pageSize ?? 100,
        total: response.metrics.length,
      },
    };
  }
}
