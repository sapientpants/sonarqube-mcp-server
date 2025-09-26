import type {
  ComponentsResult,
  ComponentsTreeResult,
  ComponentShowResult,
  SonarQubeComponent,
} from '../types/index.js';
import type { ComponentQualifier } from '../types/components.js';
import { BaseDomain } from './base.js';

type ComponentsSearchParams = {
  query?: string;
  qualifiers?: ComponentQualifier[];
  language?: string;
  page?: number;
  pageSize?: number;
};

type ComponentsTreeParams = {
  component: string;
  strategy?: 'all' | 'children' | 'leaves';
  qualifiers?: ComponentQualifier[];
  sort?: 'name' | 'path' | 'qualifier';
  asc?: boolean;
  page?: number;
  pageSize?: number;
  branch?: string;
  pullRequest?: string;
};

/**
 * Domain module for component-related operations
 */
export class ComponentsDomain extends BaseDomain {
  /**
   * Search for components across projects
   * @param params Search parameters
   * @returns Promise with the list of components
   */
  async searchComponents(params: ComponentsSearchParams = {}): Promise<ComponentsResult> {
    const { query, qualifiers, language, page, pageSize } = params;
    this.logger.debug('Searching components', params);

    try {
      const builder = this.webApiClient.components.search();

      if (query !== undefined) {
        builder.query(query);
      }
      if (qualifiers !== undefined && qualifiers.length > 0) {
        builder.qualifiers(qualifiers as unknown as Parameters<typeof builder.qualifiers>[0]);
      }
      if (language !== undefined) {
        builder.languages([language]);
      }
      if (page !== undefined) {
        builder.page(page);
      }
      if (pageSize !== undefined) {
        // Limit page size to maximum of 500
        builder.pageSize(Math.min(pageSize, 500));
      }

      const response = await builder.execute();
      this.logger.debug('Components retrieved successfully', {
        count: response.components.length,
      });

      return {
        components: response.components.map((comp) => this.transformComponent(comp)),
        paging: response.paging || {
          pageIndex: 1,
          pageSize: 100,
          total: response.components.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to search components', error);
      throw error;
    }
  }

  /**
   * Navigate component tree hierarchy
   * @param params Tree navigation parameters
   * @returns Promise with the component tree
   */
  async getComponentTree(params: ComponentsTreeParams): Promise<ComponentsTreeResult> {
    const {
      component,
      strategy = 'children',
      qualifiers,
      sort = 'name',
      page,
      pageSize,
      branch,
      pullRequest,
    } = params;
    this.logger.debug('Getting component tree', params);

    try {
      const builder = this.webApiClient.components.tree().component(component);

      // Apply tree-specific methods based on strategy
      if (strategy === 'children') {
        builder.childrenOnly();
      } else if (strategy === 'leaves') {
        builder.leavesOnly();
      }

      if (qualifiers !== undefined && qualifiers.length > 0) {
        builder.qualifiers(qualifiers as unknown as Parameters<typeof builder.qualifiers>[0]);
      }

      // Apply sorting
      if (sort === 'name') {
        builder.sortByName();
      } else if (sort === 'path') {
        builder.sortByPath();
      } else if (sort === 'qualifier') {
        builder.sortByQualifier();
      }

      // asc parameter is not directly supported in tree builder

      if (page !== undefined) {
        builder.page(page);
      }
      if (pageSize !== undefined) {
        // Limit page size to maximum of 500
        builder.pageSize(Math.min(pageSize, 500));
      }
      if (branch !== undefined) {
        builder.branch(branch);
      }
      if (pullRequest !== undefined) {
        builder.pullRequest(pullRequest);
      }

      const response = await builder.execute();
      this.logger.debug('Component tree retrieved successfully', {
        count: response.components.length,
      });

      return {
        components: response.components.map((comp) => this.transformComponent(comp)),
        baseComponent: response.baseComponent
          ? this.transformComponent(response.baseComponent)
          : undefined,
        paging: response.paging || {
          pageIndex: 1,
          pageSize: 100,
          total: response.components.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get component tree', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific component
   * @param key Component key
   * @param branch Optional branch name (not currently supported by API)
   * @param pullRequest Optional pull request ID (not currently supported by API)
   * @returns Promise with component details
   */
  async showComponent(
    key: string,
    branch?: string,
    pullRequest?: string
  ): Promise<ComponentShowResult> {
    this.logger.debug('Showing component', { key, branch, pullRequest });

    try {
      // The API client's show method expects a key parameter
      // Note: branch and pullRequest are not currently supported by the API client
      const response = await this.webApiClient.components.show(key);
      this.logger.debug('Component details retrieved successfully', { key });

      return {
        component: this.transformComponent(response.component),
        ancestors: response.ancestors?.map(this.transformComponent) ?? [],
      };
    } catch (error) {
      this.logger.error('Failed to show component', error);
      throw error;
    }
  }

  /**
   * Transform API response component to our domain model
   */
  private transformComponent(component: {
    key: string;
    name: string;
    qualifier: string;
    path?: string;
    longName?: string;
    enabled?: boolean;
  }): SonarQubeComponent {
    return {
      key: component.key,
      name: component.name,
      qualifier: component.qualifier,
      path: component.path,
      longName: component.longName,
      enabled: component.enabled,
    };
  }
}
