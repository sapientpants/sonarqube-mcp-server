import type { PaginationParams, ISonarQubeClient, SonarQubeProject } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { nullToUndefined } from '../utils/transforms.js';
import { createLogger } from '../utils/logger.js';
import { withErrorHandling } from '../errors.js';
import { withMCPErrorHandling } from '../utils/error-handler.js';
import { createStructuredResponse } from '../utils/structured-response.js';
import { contextProvider } from '../auth/context-provider.js';
import { permissionManager } from '../auth/permission-manager.js';

const logger = createLogger('handlers/projects-with-permissions');

/**
 * Fetches and returns a list of all SonarQube projects with permission filtering
 * @param params Parameters for listing projects, including pagination and organization
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of projects with their details
 * @throws Error if no authentication environment variables are set
 */
export const handleSonarQubeProjectsWithPermissions = withMCPErrorHandling(
  async (
    params: {
      page?: number | null;
      page_size?: number | null;
    },
    client: ISonarQubeClient = getDefaultClient()
  ) => {
    logger.debug('Handling SonarQube projects request with permissions', params);

    // Get user context from async local storage
    const userContext = contextProvider.getUserContext();
    const permissionService = permissionManager.getPermissionService();

    const projectsParams: PaginationParams = {
      page: nullToUndefined(params.page),
      pageSize: nullToUndefined(params.page_size),
    };

    let result;
    try {
      result = await withErrorHandling('List SonarQube projects', () =>
        client.listProjects(projectsParams)
      );
    } catch (error: unknown) {
      // Check if this is an authorization error and provide helpful guidance
      if (
        error instanceof Error &&
        (error.message.includes('Insufficient privileges') ||
          error.message.includes('requires authentication') ||
          error.message.includes('403') ||
          error.message.includes('Administer System'))
      ) {
        throw new Error(
          `${error.message}\n\nNote: The 'projects' tool requires admin permissions. ` +
            `Non-admin users can use the 'components' tool instead:\n` +
            `- To list all accessible projects: components with qualifiers: ['TRK']\n` +
            `- To search projects: components with query: 'search-term', qualifiers: ['TRK']`
        );
      }
      throw error;
    }

    // Apply permission filtering if available
    let filteredProjects = result.projects;
    if (permissionService && userContext) {
      logger.debug('Applying permission filtering to projects', {
        userId: userContext.userId,
        projectCount: result.projects.length,
      });

      filteredProjects = await permissionService.filterProjects(userContext, result.projects);

      logger.info('Projects filtered by permissions', {
        originalCount: result.projects.length,
        filteredCount: filteredProjects.length,
      });
    }

    logger.info('Successfully retrieved projects', { count: filteredProjects.length });
    return createStructuredResponse({
      projects: filteredProjects.map((project: SonarQubeProject) => ({
        key: project.key,
        name: project.name,
        qualifier: project.qualifier,
        visibility: project.visibility,
        lastAnalysisDate: project.lastAnalysisDate,
        revision: project.revision,
        managed: project.managed,
      })),
      paging: {
        ...result.paging,
        total: filteredProjects.length,
      },
    });
  }
);
