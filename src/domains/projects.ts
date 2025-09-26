import type { PaginationParams, SonarQubeProjectsResult } from '../types/index.js';
import { BaseDomain } from './base.js';

/**
 * Domain module for project-related operations
 */
export class ProjectsDomain extends BaseDomain {
  /**
   * Lists all projects in SonarQube
   * @param params Pagination and organization parameters
   * @returns Promise with the list of projects
   */
  async listProjects(
    params: PaginationParams = { page: undefined, pageSize: undefined }
  ): Promise<SonarQubeProjectsResult> {
    const { page, pageSize } = params;
    this.logger.debug('Listing projects', { page, pageSize, organization: this.organization });

    try {
      const builder = this.webApiClient.projects.search();

      if (page !== undefined) {
        builder.page(page);
      }
      if (pageSize !== undefined) {
        builder.pageSize(pageSize);
      }

      const response = await builder.execute();
      this.logger.debug('Projects retrieved successfully', { count: response.components.length });

      // Transform to our interface
      return {
        projects: response.components.map((component) => ({
          key: component.key,
          name: component.name,
          qualifier: component.qualifier,
          visibility: component.visibility,
          lastAnalysisDate: component.lastAnalysisDate,
          revision: component.revision,
          managed: component.managed,
        })),
        paging: response.paging,
      };
    } catch (error) {
      this.logger.error('Failed to list projects', error);
      throw error;
    }
  }
}
