import type {
  ComponentsParams,
  ISonarQubeClient,
  ComponentsTreeParams,
  ComponentsSearchParams,
} from '../types/index.js';
import type { ComponentQualifier } from '../types/components.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { nullToUndefined } from '../utils/transforms.js';
import { createLogger } from '../utils/logger.js';
import { withErrorHandling } from '../errors.js';
import { withMCPErrorHandling } from '../utils/error-handler.js';
import { ComponentsDomain } from '../domains/components.js';
import { createStructuredResponse } from '../utils/structured-response.js';

const logger = createLogger('handlers/components');

/**
 * Build tree parameters from component params
 */
function buildTreeParams(params: ComponentsParams): ComponentsTreeParams {
  const treeParams: ComponentsTreeParams = {
    component: params.component!,
  };

  if (nullToUndefined(params.strategy) !== undefined) {
    treeParams.strategy = nullToUndefined(params.strategy) as 'all' | 'children' | 'leaves';
  }
  if (params.qualifiers !== undefined) {
    treeParams.qualifiers = params.qualifiers;
  }
  if (nullToUndefined(params.asc) !== undefined) {
    treeParams.asc = nullToUndefined(params.asc) as boolean;
  }
  if (nullToUndefined(params.p) !== undefined) {
    treeParams.page = nullToUndefined(params.p) as number;
  }
  if (nullToUndefined(params.ps) !== undefined) {
    treeParams.pageSize = nullToUndefined(params.ps) as number;
  }
  if (nullToUndefined(params.branch) !== undefined) {
    treeParams.branch = nullToUndefined(params.branch) as string;
  }
  if (nullToUndefined(params.pullRequest) !== undefined) {
    treeParams.pullRequest = nullToUndefined(params.pullRequest) as string;
  }

  return treeParams;
}

/**
 * Build search parameters from component params
 */
function buildSearchParams(params: ComponentsParams): ComponentsSearchParams {
  const searchParams: ComponentsSearchParams = {};

  if (nullToUndefined(params.query) !== undefined) {
    searchParams.query = nullToUndefined(params.query) as string;
  }
  if (params.qualifiers !== undefined) {
    searchParams.qualifiers = params.qualifiers;
  }
  if (nullToUndefined(params.language) !== undefined) {
    searchParams.language = nullToUndefined(params.language) as string;
  }
  if (nullToUndefined(params.p) !== undefined) {
    searchParams.page = nullToUndefined(params.p) as number;
  }
  if (nullToUndefined(params.ps) !== undefined) {
    searchParams.pageSize = nullToUndefined(params.ps) as number;
  }

  return searchParams;
}

/**
 * Build default project listing parameters
 */
function buildDefaultParams(params: ComponentsParams): ComponentsSearchParams {
  const searchParams: ComponentsSearchParams = {
    qualifiers: ['TRK'] as ComponentQualifier[],
  };

  if (nullToUndefined(params.p) !== undefined) {
    searchParams.page = nullToUndefined(params.p) as number;
  }
  if (nullToUndefined(params.ps) !== undefined) {
    searchParams.pageSize = nullToUndefined(params.ps) as number;
  }

  return searchParams;
}

/**
 * Handles component search and tree navigation operations
 * @param params Parameters for component operations
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of components
 */
export const handleSonarQubeComponents = withMCPErrorHandling(
  async (params: ComponentsParams, client: ISonarQubeClient = getDefaultClient()) => {
    logger.debug('Handling SonarQube components request', params);

    // Determine which operation to perform based on parameters
    const isShowOperation = params.key !== undefined && params.key !== null;
    const isTreeOperation =
      !isShowOperation && params.component !== undefined && params.component !== null;
    const isSearchOperation =
      !isShowOperation && !isTreeOperation && (params.query || params.qualifiers);

    const webApiClient = client.webApiClient;
    // Get organization from client if it has one, otherwise null
    const organization =
      (client as ISonarQubeClient & { organization?: string | null }).organization ?? null;
    const domain = new ComponentsDomain(webApiClient, organization);

    let result;

    if (isShowOperation) {
      // Show component details
      result = await withErrorHandling('Show component', () =>
        domain.showComponent(
          params.key!,
          nullToUndefined(params.branch),
          nullToUndefined(params.pullRequest)
        )
      );
      logger.info('Successfully retrieved component details', {
        key: params.key,
      });
    } else if (isTreeOperation) {
      // Component tree navigation
      const treeParams = buildTreeParams(params);
      result = await withErrorHandling('Get component tree', () =>
        domain.getComponentTree(treeParams)
      );
      logger.info('Successfully retrieved component tree', {
        component: params.component,
        count: result.components.length,
      });
    } else if (isSearchOperation) {
      // Component search
      const searchParams = buildSearchParams(params);
      result = await withErrorHandling('Search components', () =>
        domain.searchComponents(searchParams)
      );
      logger.info('Successfully searched components', {
        query: params.query,
        count: result.components.length,
      });
    } else {
      // Default to listing all projects
      const searchParams = buildDefaultParams(params);
      result = await withErrorHandling('List all projects', () =>
        domain.searchComponents(searchParams)
      );
      logger.info('Successfully listed all projects', {
        count: result.components.length,
      });
    }

    return createStructuredResponse(result);
  }
);
