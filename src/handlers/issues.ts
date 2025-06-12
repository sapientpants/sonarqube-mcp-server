import type { IssuesParams, ISonarQubeClient, SonarQubeIssue } from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('handlers/issues');

/**
 * Fetches and returns issues from a specified SonarQube project
 * @param params Parameters for fetching issues, including project key, severity, and pagination
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of issues with their details
 * @throws Error if no authentication environment variables are set (SONARQUBE_TOKEN, SONARQUBE_USERNAME/PASSWORD, or SONARQUBE_PASSCODE)
 */
export async function handleSonarQubeGetIssues(
  params: IssuesParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling SonarQube issues request', { projectKey: params.projectKey });

  try {
    const result = await client.getIssues(params);
    logger.info('Successfully retrieved issues', {
      projectKey: params.projectKey,
      count: result.issues.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            issues: result.issues.map((issue: SonarQubeIssue) => ({
              key: issue.key,
              rule: issue.rule,
              severity: issue.severity,
              component: issue.component,
              project: issue.project,
              line: issue.line,
              status: issue.status,
              issueStatus: issue.issueStatus,
              message: issue.message,
              messageFormattings: issue.messageFormattings,
              effort: issue.effort,
              debt: issue.debt,
              author: issue.author,
              tags: issue.tags,
              creationDate: issue.creationDate,
              updateDate: issue.updateDate,
              type: issue.type,
              cleanCodeAttribute: issue.cleanCodeAttribute,
              cleanCodeAttributeCategory: issue.cleanCodeAttributeCategory,
              prioritizedRule: issue.prioritizedRule,
              impacts: issue.impacts,
              textRange: issue.textRange,
              comments: issue.comments,
              transitions: issue.transitions,
              actions: issue.actions,
              flows: issue.flows,
              quickFixAvailable: issue.quickFixAvailable,
              ruleDescriptionContextKey: issue.ruleDescriptionContextKey,
              codeVariants: issue.codeVariants,
              hash: issue.hash,
            })),
            components: result.components,
            rules: result.rules,
            users: result.users,
            facets: result.facets,
            paging: result.paging,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to retrieve SonarQube issues', error);
    throw error;
  }
}
