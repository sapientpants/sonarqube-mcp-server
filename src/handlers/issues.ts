import type {
  IssuesParams,
  ISonarQubeClient,
  SonarQubeIssue,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  ConfirmIssueParams,
  UnconfirmIssueParams,
  ResolveIssueParams,
  ReopenIssueParams,
} from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createLogger } from '../utils/logger.js';
import { ElicitationManager } from '../utils/elicitation.js';

const logger = createLogger('handlers/issues');

// Elicitation manager instance (will be set by index.ts)
let elicitationManager: ElicitationManager | null = null;

export function setElicitationManager(manager: ElicitationManager): void {
  elicitationManager = manager;
}

/**
 * Fetches and returns issues from a specified SonarQube project with advanced filtering capabilities
 *
 * This tool supports comprehensive filtering for targeted analysis, dashboards, and audits:
 * - **Component/File Path Filtering**: Use `component_keys` to filter by specific files or directories
 * - **Directory Filtering**: Use `directories` to filter by directory paths (e.g., ['src/main/', 'test/'])
 * - **File Filtering**: Use `files` to filter by specific file paths (e.g., ['UserService.java', 'config.properties'])
 * - **Scope Filtering**: Use `scopes` to filter by issue scope (MAIN for production code, TEST for test code, OVERALL for both)
 * - **Assignee Filtering**: Use `assignees` to filter by assigned users
 * - **Tag Filtering**: Use `tags` to filter by issue tags
 * - **Severity Filtering**: Use `severities` to filter by severity levels (INFO, MINOR, MAJOR, CRITICAL, BLOCKER)
 * - **Status Filtering**: Use `statuses` to filter by issue status (OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED)
 * - **Date Filtering**: Use `created_after`, `created_before`, `created_in_last` for time-based queries
 * - **Security Standards**: Filter by OWASP, CWE, SANS Top 25, and SonarSource security categories
 * - **Faceted Search**: Use `facets` to get aggregated data for dashboards
 *
 * @param params Parameters for fetching issues with extensive filtering options
 * @param client Optional SonarQube client instance
 * @returns A response containing the list of issues with their details, facets, and pagination info
 * @throws Error if no authentication environment variables are set (SONARQUBE_TOKEN, SONARQUBE_USERNAME/PASSWORD, or SONARQUBE_PASSCODE)
 *
 * @example
 * // Filter by file path and severity
 * await handleSonarQubeGetIssues({
 *   projectKey: 'my-project',
 *   componentKeys: ['src/main/java/com/example/Service.java'],
 *   severities: ['CRITICAL', 'BLOCKER'],
 *   facets: ['severities', 'types', 'authors']
 * });
 *
 * @example
 * // Filter by directory and scope
 * await handleSonarQubeGetIssues({
 *   projectKey: 'my-project',
 *   directories: ['src/main/java/com/example/services/'],
 *   scopes: ['MAIN'],
 *   facets: ['severities', 'rules']
 * });
 *
 * @example
 * // Dashboard query with assignee and tag filters
 * await handleSonarQubeGetIssues({
 *   projectKey: 'my-project',
 *   assignees: ['john.doe@example.com'],
 *   tags: ['security', 'performance'],
 *   statuses: ['OPEN', 'REOPENED'],
 *   facets: ['severities', 'tags', 'assignees']
 * });
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
    // Collect resolution comment if elicitation is enabled
    if (elicitationManager?.isEnabled() && !params.comment) {
      const commentResult = await elicitationManager.collectResolutionComment(
        params.issueKey,
        'false positive'
      );
      if (commentResult.action === 'accept' && commentResult.content) {
        params = { ...params, comment: commentResult.content.comment };
      } else if (commentResult.action === 'reject' || commentResult.action === 'cancel') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                message: 'Operation cancelled by user',
                issueKey: params.issueKey,
              }),
            },
          ],
        };
      }
    }

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
    // Collect resolution comment if elicitation is enabled
    if (elicitationManager?.isEnabled() && !params.comment) {
      const commentResult = await elicitationManager.collectResolutionComment(
        params.issueKey,
        "won't fix"
      );
      if (commentResult.action === 'accept' && commentResult.content) {
        params = { ...params, comment: commentResult.content.comment };
      } else if (commentResult.action === 'reject' || commentResult.action === 'cancel') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                message: 'Operation cancelled by user',
                issueKey: params.issueKey,
              }),
            },
          ],
        };
      }
    }

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
    // Request confirmation for bulk operations if elicitation is enabled
    if (elicitationManager?.isEnabled()) {
      const confirmResult = await elicitationManager.confirmBulkOperation(
        'mark as false positive',
        params.issueKeys.length,
        params.issueKeys
      );

      if (confirmResult.action === 'reject' || confirmResult.action === 'cancel') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                message: 'Bulk operation cancelled by user',
                issueCount: params.issueKeys.length,
              }),
            },
          ],
        };
      }

      // Add comment from confirmation if provided
      if (confirmResult.action === 'accept' && confirmResult.content?.comment && !params.comment) {
        params = { ...params, comment: confirmResult.content.comment as string };
      }
    }

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
    // Request confirmation for bulk operations if elicitation is enabled
    if (elicitationManager?.isEnabled()) {
      const confirmResult = await elicitationManager.confirmBulkOperation(
        "mark as won't fix",
        params.issueKeys.length,
        params.issueKeys
      );

      if (confirmResult.action === 'reject' || confirmResult.action === 'cancel') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                message: 'Bulk operation cancelled by user',
                issueCount: params.issueKeys.length,
              }),
            },
          ],
        };
      }

      // Add comment from confirmation if provided
      if (confirmResult.action === 'accept' && confirmResult.content?.comment && !params.comment) {
        params = { ...params, comment: confirmResult.content.comment as string };
      }
    }

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

/**
 * Add a comment to an issue
 * @param params Parameters for adding a comment to an issue
 * @param client Optional SonarQube client instance
 * @returns A response containing the created comment details
 */
export async function handleAddCommentToIssue(
  params: AddCommentToIssueParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling add comment to issue request', { issueKey: params.issueKey });

  try {
    const comment = await client.addCommentToIssue(params);
    logger.info('Successfully added comment to issue', {
      issueKey: params.issueKey,
      commentKey: comment.key,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Comment added to issue ${params.issueKey}`,
            comment: {
              key: comment.key,
              login: comment.login,
              htmlText: comment.htmlText,
              markdown: comment.markdown,
              updatable: comment.updatable,
              createdAt: comment.createdAt,
            },
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to add comment to issue', error);
    throw error;
  }
}

/**
 * Handler for assigning an issue
 */
export async function handleAssignIssue(
  params: { issueKey: string; assignee?: string },
  client?: ISonarQubeClient
) {
  const sonarQubeClient = client ?? getDefaultClient();

  logger.debug('Handling assign issue request', {
    issueKey: params.issueKey,
    assignee: params.assignee,
  });

  try {
    // Normalize empty string to undefined for consistent unassignment handling
    const normalizedAssignee = params.assignee === '' ? undefined : params.assignee;

    const updatedIssue = await sonarQubeClient.assignIssue({
      issueKey: params.issueKey,
      assignee: normalizedAssignee,
    });

    // Cast to access dynamic fields
    const issueWithAssignee = updatedIssue as SonarQubeIssue & {
      assignee?: string | null;
      assigneeName?: string | null;
      resolution?: string | null;
    };

    const assigneeName = issueWithAssignee.assignee ?? 'unassigned';
    const assigneeDisplay = normalizedAssignee
      ? `Assigned to: ${issueWithAssignee.assigneeName ?? normalizedAssignee}`
      : 'Issue unassigned';

    logger.info('Issue assigned successfully', {
      issueKey: params.issueKey,
      assignee: assigneeName,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `${assigneeDisplay} for issue ${params.issueKey}`,
            issue: {
              key: updatedIssue.key,
              component: updatedIssue.component ?? 'N/A',
              message: updatedIssue.message,
              severity: updatedIssue.severity ?? 'UNKNOWN',
              type: updatedIssue.type ?? 'UNKNOWN',
              status: updatedIssue.status,
              resolution: issueWithAssignee.resolution ?? null,
              assignee: issueWithAssignee.assignee,
              assigneeName: issueWithAssignee.assigneeName ?? null,
            },
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to assign issue', error);
    throw error;
  }
}

/**
 * Handler for confirming an issue
 */
export async function handleConfirmIssue(
  params: ConfirmIssueParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling confirm issue request', { issueKey: params.issueKey });

  try {
    const result = await client.confirmIssue(params);
    logger.info('Successfully confirmed issue', {
      issueKey: params.issueKey,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Issue ${params.issueKey} confirmed`,
            issue: result.issue,
            components: result.components,
            rules: result.rules,
            users: result.users,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to confirm issue', error);
    throw error;
  }
}

/**
 * Handler for unconfirming an issue
 */
export async function handleUnconfirmIssue(
  params: UnconfirmIssueParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling unconfirm issue request', { issueKey: params.issueKey });

  try {
    const result = await client.unconfirmIssue(params);
    logger.info('Successfully unconfirmed issue', {
      issueKey: params.issueKey,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Issue ${params.issueKey} unconfirmed`,
            issue: result.issue,
            components: result.components,
            rules: result.rules,
            users: result.users,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to unconfirm issue', error);
    throw error;
  }
}

/**
 * Handler for resolving an issue
 */
export async function handleResolveIssue(
  params: ResolveIssueParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling resolve issue request', { issueKey: params.issueKey });

  try {
    const result = await client.resolveIssue(params);
    logger.info('Successfully resolved issue', {
      issueKey: params.issueKey,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Issue ${params.issueKey} resolved`,
            issue: result.issue,
            components: result.components,
            rules: result.rules,
            users: result.users,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to resolve issue', error);
    throw error;
  }
}

/**
 * Handler for reopening an issue
 */
export async function handleReopenIssue(
  params: ReopenIssueParams,
  client: ISonarQubeClient = getDefaultClient()
) {
  logger.debug('Handling reopen issue request', { issueKey: params.issueKey });

  try {
    const result = await client.reopenIssue(params);
    logger.info('Successfully reopened issue', {
      issueKey: params.issueKey,
      comment: params.comment ? 'with comment' : 'without comment',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            message: `Issue ${params.issueKey} reopened`,
            issue: result.issue,
            components: result.components,
            rules: result.rules,
            users: result.users,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to reopen issue', error);
    throw error;
  }
}
