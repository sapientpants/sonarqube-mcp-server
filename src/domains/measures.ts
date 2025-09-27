import { MeasuresAdditionalField } from 'sonarqube-web-api-client';
import type {
  ComponentMeasuresParams,
  ComponentsMeasuresParams,
  MeasuresHistoryParams,
  SonarQubeComponentMeasuresResult,
  SonarQubeComponentsMeasuresResult,
  SonarQubeMeasuresHistoryResult,
} from '../types/index.js';
import { BaseDomain } from './base.js';
import { ensureStringArray } from '../utils/transforms.js';

/**
 * Domain module for measures-related operations
 */
export class MeasuresDomain extends BaseDomain {
  /**
   * Gets measures for a specific component
   * @param params Parameters including component key and metric keys
   * @returns Promise with the component measures
   */
  async getComponentMeasures(
    params: ComponentMeasuresParams
  ): Promise<SonarQubeComponentMeasuresResult> {
    const { component, metricKeys, additionalFields, branch, pullRequest } = params;

    const request: {
      component: string;
      metricKeys: string[];
      additionalFields?: MeasuresAdditionalField[];
      branch?: string;
      pullRequest?: string;
    } = {
      component,
      metricKeys: ensureStringArray(metricKeys),
      ...(additionalFields && { additionalFields: additionalFields as MeasuresAdditionalField[] }),
      ...(branch && { branch }),
      ...(pullRequest && { pullRequest }),
    };

    const response = await this.webApiClient.measures.component(request);

    return response as SonarQubeComponentMeasuresResult;
  }

  /**
   * Gets measures for multiple components
   * @param params Parameters including component keys and metric keys
   * @returns Promise with the components measures
   */
  async getComponentsMeasures(
    params: ComponentsMeasuresParams
  ): Promise<SonarQubeComponentsMeasuresResult> {
    // The API only supports querying one component at a time for detailed measures
    // We need to make multiple requests and aggregate the results
    const componentKeys = ensureStringArray(params.componentKeys);
    const metricKeys = ensureStringArray(params.metricKeys);

    const results = await Promise.all(
      componentKeys.map((componentKey) => {
        const requestParams: ComponentMeasuresParams = {
          component: componentKey,
          metricKeys,
          ...(params.additionalFields && { additionalFields: params.additionalFields }),
          ...(params.branch && { branch: params.branch }),
          ...(params.pullRequest && { pullRequest: params.pullRequest }),
          ...(params.period && { period: params.period }),
        };
        return this.getComponentMeasures(requestParams);
      })
    );

    // Aggregate results with pagination
    const allComponents = results.map((result) => result.component);
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 100; // Default to 100 like SonarQube API

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedComponents = allComponents.slice(startIndex, endIndex);

    const response: SonarQubeComponentsMeasuresResult = {
      components: paginatedComponents,
      metrics: results[0]?.metrics ?? [],
      paging: {
        pageIndex: page,
        pageSize: pageSize,
        total: componentKeys.length,
      },
    };

    // Only add period if it exists
    if (results[0]?.period) {
      response.period = results[0].period;
    }

    return response;
  }

  /**
   * Gets measures history for a component
   * @param params Parameters including component key and metrics
   * @returns Promise with the measures history
   */
  async getMeasuresHistory(params: MeasuresHistoryParams): Promise<SonarQubeMeasuresHistoryResult> {
    const { component, metrics, from, to, branch, pullRequest, page, pageSize } = params;

    const builder = this.webApiClient.measures.searchHistory(component, ensureStringArray(metrics));

    if (from) {
      builder.from(from);
    }
    if (to) {
      builder.to(to);
    }
    if (branch) {
      builder.withBranch(branch);
    }
    if (pullRequest) {
      builder.withPullRequest(pullRequest);
    }
    if (page !== undefined) {
      builder.page(page);
    }
    if (pageSize !== undefined) {
      builder.pageSize(pageSize);
    }

    const response = await builder.execute();
    return {
      ...response,
      paging: response.paging ?? { pageIndex: 1, pageSize: 100, total: 0 },
    };
  }
}
