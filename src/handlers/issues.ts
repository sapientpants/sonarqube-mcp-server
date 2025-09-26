import type {
  IssuesParams,
  ISonarQubeClient,
  SonarQubeIssue,
  MarkIssueFalsePositiveParams,
  MarkIssueWontFixParams,
  BulkIssueMarkParams,
  AddCommentToIssueParams,
  AssignIssueParams,
  ConfirmIssueParams,
  UnconfirmIssueParams,
  ResolveIssueParams,
  ReopenIssueParams,
  DoTransitionResponse,
} from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createLogger } from '../utils/logger.js';
import { ElicitationManager } from '../utils/elicitation.js';
import { createStructuredResponse } from '../utils/structured-response.js';

const logger = createLogger('handlers/issues');

// Elicitation manager instance (will be set by index.ts)
let elicitationManager: ElicitationManager | null = null;

export function setElicitationManager(manager: ElicitationManager): void {
  elicitationManager = manager;
}

// Common types for elicitation responses
export interface ElicitationCancelResponse {
  [key: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Handles single issue resolution elicitation
 */
async function handleSingleIssueElicitation<T extends { comment?: string }>(
  params: T & { issueKey: string },
  resolutionType: string
): Promise<
  { params: T; cancelled: false } | { cancelled: true; response: ElicitationCancelResponse }
> {
  if (!elicitationManager?.isEnabled() || params.comment) {
    return { params, cancelled: false };
  }

  const commentResult = await elicitationManager.collectResolutionComment(
    params.issueKey,
    resolutionType
  );

  if (commentResult.action === 'accept' && commentResult.content) {
    return { params: { ...params, comment: commentResult.content.comment }, cancelled: false };
  }

  if (commentResult.action === 'reject' || commentResult.action === 'cancel') {
    return {
      cancelled: true,
      response: {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              message: 'Operation cancelled by user',
              issueKey: params.issueKey,
            }),
          },
        ],
      },
    };
  }

  return { params, cancelled: false };
}

/**
 * Handles bulk issue resolution elicitation
 */
async function handleBulkIssueElicitation<T extends { comment?: string; issueKeys: string[] }>(
  params: T,
  operationType: string
): Promise<
  { params: T; cancelled: false } | { cancelled: true; response: ElicitationCancelResponse }
> {
  if (!elicitationManager?.isEnabled()) {
    return { params, cancelled: false };
  }

  const confirmResult = await elicitationManager.confirmBulkOperation(
    operationType,
    params.issueKeys.length,
    params.issueKeys
  );

  if (confirmResult.action === 'reject' || confirmResult.action === 'cancel') {
    return {
      cancelled: true,
      response: {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              message: 'Bulk operation cancelled by user',
              issueCount: params.issueKeys.length,
            }),
          },
        ],
      },
    };
  }

  // Add comment from confirmation if provided
  if (confirmResult.action === 'accept' && confirmResult.content?.comment && !params.comment) {
    return {
      params: { ...params, comment: confirmResult.content.comment },
      cancelled: false,
    };
  }

  return { params, cancelled: false };
}

/**
 * Maps bulk operation results to a consistent format
 */
function mapBulkResults(results: DoTransitionResponse[]) {
  return results.map((result) => ({
    issue: result.issue,
    components: result.components,
    rules: result.rules,
    users: result.users,
  }));
}

/**
 * Creates a standard issue operation response
 */
function createIssueOperationResponse(message: string, result: DoTransitionResponse) {
  return createStructuredResponse({
    message,
    issue: result.issue,
    components: result.components,
    rules: result.rules,
    users: result.users,
  });
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

    return createStructuredResponse({
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
    });
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
    // Handle elicitation for resolution comment
    const elicitationResult = await handleSingleIssueElicitation(params, 'false positive');
    if (elicitationResult.cancelled) {
      return elicitationResult.response;
    }
    const finalParams = elicitationResult.params;

    const result = await client.markIssueFalsePositive(finalParams);
    logger.info('Successfully marked issue as false positive', {
      issueKey: finalParams.issueKey,
      comment: finalParams.comment ? 'with comment' : 'without comment',
    });

    return createIssueOperationResponse(
      `Issue ${finalParams.issueKey} marked as false positive`,
      result
    );
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
    // Handle elicitation for resolution comment
    const elicitationResult = await handleSingleIssueElicitation(params, "won't fix");
    if (elicitationResult.cancelled) {
      return elicitationResult.response;
    }
    const finalParams = elicitationResult.params;

    const result = await client.markIssueWontFix(finalParams);
    logger.info("Successfully marked issue as won't fix", {
      issueKey: finalParams.issueKey,
      comment: finalParams.comment ? 'with comment' : 'without comment',
    });

    return createIssueOperationResponse(
      `Issue ${finalParams.issueKey} marked as won't fix`,
      result
    );
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
    // Handle elicitation for bulk operation
    const elicitationResult = await handleBulkIssueElicitation(params, 'mark as false positive');
    if (elicitationResult.cancelled) {
      return elicitationResult.response;
    }
    const finalParams = elicitationResult.params;

    const results = await client.markIssuesFalsePositive(finalParams);
    logger.info('Successfully marked issues as false positive', {
      issueCount: finalParams.issueKeys.length,
      comment: finalParams.comment ? 'with comment' : 'without comment',
    });

    return createStructuredResponse({
      message: `${finalParams.issueKeys.length} issues marked as false positive`,
      results: mapBulkResults(results),
    });
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
    // Handle elicitation for bulk operation
    const elicitationResult = await handleBulkIssueElicitation(params, "mark as won't fix");
    if (elicitationResult.cancelled) {
      return elicitationResult.response;
    }
    const finalParams = elicitationResult.params;

    const results = await client.markIssuesWontFix(finalParams);
    logger.info("Successfully marked issues as won't fix", {
      issueCount: finalParams.issueKeys.length,
      comment: finalParams.comment ? 'with comment' : 'without comment',
    });

    return createStructuredResponse({
      message: `${finalParams.issueKeys.length} issues marked as won't fix`,
      results: mapBulkResults(results),
    });
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

    return createStructuredResponse({
      message: `Comment added to issue ${params.issueKey}`,
      comment: {
        key: comment.key,
        login: comment.login,
        htmlText: comment.htmlText,
        markdown: comment.markdown,
        updatable: comment.updatable,
        createdAt: comment.createdAt,
      },
    });
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

    const assignParams: AssignIssueParams = {
      issueKey: params.issueKey,
    };
    if (normalizedAssignee !== undefined) {
      (assignParams as any).assignee = normalizedAssignee;
    }

    const updatedIssue = await sonarQubeClient.assignIssue(assignParams);

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

    return createStructuredResponse({
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
    });
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

    return createIssueOperationResponse(`Issue ${params.issueKey} confirmed`, result);
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

    return createIssueOperationResponse(`Issue ${params.issueKey} unconfirmed`, result);
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

    return createIssueOperationResponse(`Issue ${params.issueKey} resolved`, result);
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

    return createIssueOperationResponse(`Issue ${params.issueKey} reopened`, result);
  } catch (error) {
    logger.error('Failed to reopen issue', error);
    throw error;
  }
}
