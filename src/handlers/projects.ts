import type { PaginationParams, ISonarQubeClient, SonarQubeProject } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { nullToUndefined } from '../utils/transforms.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('handlers/projects');

/**
 * Fetches and returns a list of all SonarQube projects
 * @param params Parameters for listing projects, including pagination and organization
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of projects with their details
 * @throws Error if no authentication environment variables are set (SONARQUBE_TOKEN, SONARQUBE_USERNAME/PASSWORD, or SONARQUBE_PASSCODE)
 */
export async function handleSonarQubeProjects(
  params: {
    page?: number | null;
    page_size?: number | null;
  },
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling SonarQube projects request', params);

  const projectsParams: PaginationParams = {
    page: nullToUndefined(params.page),
    pageSize: nullToUndefined(params.page_size),
  };

  try {
    const result = await client.listProjects(projectsParams);
    logger.info('Successfully retrieved projects', { count: result.projects.length });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
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
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to retrieve SonarQube projects', error);
    throw error;
  }
}
