import type { PaginationParams, ISonarQubeClient, SonarQubeProject } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { nullToUndefined } from '../utils/transforms.js';
import { createLogger } from '../utils/logger.js';
import { withErrorHandling } from '../errors.js';
import { withMCPErrorHandling } from '../utils/error-handler.js';
import { createStructuredResponse } from '../utils/structured-response.js';

const logger = createLogger('handlers/projects');

/**
 * Fetches and returns a list of all SonarQube projects
 * @param params Parameters for listing projects, including pagination and organization
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of projects with their details
 * @throws Error if no authentication environment variables are set (SONARQUBE_TOKEN, SONARQUBE_USERNAME/PASSWORD, or SONARQUBE_PASSCODE)
 */
export const handleSonarQubeProjects = withMCPErrorHandling(
  async (
    params: {
      page?: number | null;
      page_size?: number | null;
    },
    client: ISonarQubeClient = getDefaultClient()
  ) => {
    logger.debug('Handling SonarQube projects request', params);

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
    logger.info('Successfully retrieved projects', { count: result.projects.length });
    return createStructuredResponse({
      projects: result.projects.map((project: SonarQubeProject) => ({
        key: project.key,
        name: project.name,
        qualifier: project.qualifier,
        visibility: project.visibility,
        lastAnalysisDate: project.lastAnalysisDate,
        revision: project.revision,
        managed: project.managed,
      })),
      paging: result.paging,
    });
  }
);
