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

    const webApiClient = (
      client as unknown as { webApiClient: unknown; organization: string | null }
    ).webApiClient;
    const organization = (
      client as unknown as { webApiClient: unknown; organization: string | null }
    ).organization;
    const domain = new ComponentsDomain(
      webApiClient as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      organization
    );

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
      const treeParams: ComponentsTreeParams = {
        component: params.component!,
      };

      if (nullToUndefined(params.strategy) !== undefined) {
        (treeParams as any).strategy = nullToUndefined(params.strategy);
      }
      if (params.qualifiers !== undefined) {
        (treeParams as any).qualifiers = params.qualifiers;
      }
      if (nullToUndefined(params.asc) !== undefined) {
        (treeParams as any).asc = nullToUndefined(params.asc);
      }
      if (nullToUndefined(params.p) !== undefined) {
        (treeParams as any).page = nullToUndefined(params.p);
      }
      if (nullToUndefined(params.ps) !== undefined) {
        (treeParams as any).pageSize = nullToUndefined(params.ps);
      }
      if (nullToUndefined(params.branch) !== undefined) {
        (treeParams as any).branch = nullToUndefined(params.branch);
      }
      if (nullToUndefined(params.pullRequest) !== undefined) {
        (treeParams as any).pullRequest = nullToUndefined(params.pullRequest);
      }

      result = await withErrorHandling('Get component tree', () =>
        domain.getComponentTree(treeParams)
      );
      logger.info('Successfully retrieved component tree', {
        component: params.component,
        count: result.components.length,
      });
    } else if (isSearchOperation) {
      // Component search
      const searchParams: ComponentsSearchParams = {};

      if (nullToUndefined(params.query) !== undefined) {
        (searchParams as any).query = nullToUndefined(params.query);
      }
      if (params.qualifiers !== undefined) {
        (searchParams as any).qualifiers = params.qualifiers;
      }
      if (nullToUndefined(params.language) !== undefined) {
        (searchParams as any).language = nullToUndefined(params.language);
      }
      if (nullToUndefined(params.p) !== undefined) {
        (searchParams as any).page = nullToUndefined(params.p);
      }
      if (nullToUndefined(params.ps) !== undefined) {
        (searchParams as any).pageSize = nullToUndefined(params.ps);
      }

      result = await withErrorHandling('Search components', () =>
        domain.searchComponents(searchParams)
      );
      logger.info('Successfully searched components', {
        query: params.query,
        count: result.components.length,
      });
    } else {
      // Default to listing all projects
      const searchParams: ComponentsSearchParams = {
        qualifiers: ['TRK'] as ComponentQualifier[],
      };

      if (nullToUndefined(params.p) !== undefined) {
        (searchParams as any).page = nullToUndefined(params.p);
      }
      if (nullToUndefined(params.ps) !== undefined) {
        (searchParams as any).pageSize = nullToUndefined(params.ps);
      }

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
