import type {
  IssuesParams,
  ISonarQubeClient,
  SonarQubeIssue,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
} from '../types/index.js';
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

/**
 * Mark an issue as false positive
 * @param params Parameters for marking issue as false positive
 * @param client Optional SonarQube client instance
 * @returns A response containing the updated issue details
 */
export async function handleMarkIssueFalsePositive(
  params: MarkIssueFalsePositiveParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling mark issue false positive request', { issueKey: params.issueKey });

  try {
    const result = await client.markIssueFalsePositive(params);
    logger.info('Successfully marked issue as false positive', {
      issueKey: params.issueKey,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Issue ${params.issueKey} marked as false positive`,
            issue: result.issue,
            components: result.components,
            rules: result.rules,
            users: result.users,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to mark issue as false positive', error);
    throw error;
  }
}

/**
 * Mark an issue as won't fix
 * @param params Parameters for marking issue as won't fix
 * @param client Optional SonarQube client instance
 * @returns A response containing the updated issue details
 */
export async function handleMarkIssueWontFix(
  params: MarkIssueWontFixParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug("Handling mark issue won't fix request", { issueKey: params.issueKey });

  try {
    const result = await client.markIssueWontFix(params);
    logger.info("Successfully marked issue as won't fix", {
      issueKey: params.issueKey,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Issue ${params.issueKey} marked as won't fix`,
            issue: result.issue,
            components: result.components,
            rules: result.rules,
            users: result.users,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error("Failed to mark issue as won't fix", error);
    throw error;
  }
}

/**
 * Mark multiple issues as false positive
 * @param params Parameters for marking issues as false positive
 * @param client Optional SonarQube client instance
 * @returns A response containing the updated issues details
 */
export async function handleMarkIssuesFalsePositive(
  params: BulkIssueMarkParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling mark issues false positive request', {
    issueCount: params.issueKeys.length,
  });

  try {
    const results = await client.markIssuesFalsePositive(params);
    logger.info('Successfully marked issues as false positive', {
      issueCount: params.issueKeys.length,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `${params.issueKeys.length} issues marked as false positive`,
            results: results.map((result) => ({
              issue: result.issue,
              components: result.components,
              rules: result.rules,
              users: result.users,
            })),
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to mark issues as false positive', error);
    throw error;
  }
}

/**
 * Mark multiple issues as won't fix
 * @param params Parameters for marking issues as won't fix
 * @param client Optional SonarQube client instance
 * @returns A response containing the updated issues details
 */
export async function handleMarkIssuesWontFix(
  params: BulkIssueMarkParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug("Handling mark issues won't fix request", {
    issueCount: params.issueKeys.length,
  });

  try {
    const results = await client.markIssuesWontFix(params);
    logger.info("Successfully marked issues as won't fix", {
      issueCount: params.issueKeys.length,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `${params.issueKeys.length} issues marked as won't fix`,
            results: results.map((result) => ({
              issue: result.issue,
              components: result.components,
              rules: result.rules,
              users: result.users,
            })),
          }),
        },
      ],
    };
  } catch (error) {
    logger.error("Failed to mark issues as won't fix", error);
    throw error;
  }
}
