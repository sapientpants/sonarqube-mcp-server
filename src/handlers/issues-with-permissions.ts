import type {
  ISonarQubeClient,
  IssuesParams,
  SonarQubeIssuesResult,
  SonarQubeIssue,
} from '../types/index.js';
import { getDefaultClient } from '../utils/client-factory.js';
import { createLogger } from '../utils/logger.js';
import { withErrorHandling } from '../errors.js';
import { withMCPErrorHandling } from '../utils/error-handler.js';
import { createStructuredResponse } from '../utils/structured-response.js';
import { contextProvider } from '../auth/context-provider.js';
import { permissionManager } from '../auth/permission-manager.js';

const logger = createLogger('handlers/issues-with-permissions');

/**
 * Searches for issues in SonarQube with extensive filtering options and permission filtering
 */
export const handleSonarQubeGetIssuesWithPermissions = withMCPErrorHandling(
  async (params: IssuesParams, client: ISonarQubeClient = getDefaultClient()) => {
    logger.debug('Handling SonarQube issues request with permissions', params);

    // Get user context from async local storage
    const userContext = contextProvider.getUserContext();
    const permissionService = permissionManager.getPermissionService();

    // Check project access if specific project is requested
    if (permissionService && userContext && params.projects?.length) {
      for (const projectKey of params.projects) {
        const access = await permissionService.checkProjectAccess(userContext, projectKey);
        if (!access.allowed) {
          throw new Error(`Access denied to project '${projectKey}': ${access.reason}`);
        }
      }
    }

    const result: SonarQubeIssuesResult = await withErrorHandling('Search SonarQube issues', () =>
      client.getIssues(params)
    );

    // Apply permission filtering if available
    let filteredIssues = result.issues;
    if (permissionService && userContext) {
      logger.debug('Applying permission filtering to issues', {
        userId: userContext.userId,
        issueCount: result.issues.length,
      });

      // Filter issues by project access
      filteredIssues = [];
      for (const issue of result.issues) {
        if (issue.project) {
          const access = await permissionService.checkProjectAccess(userContext, issue.project);
          if (access.allowed) {
            filteredIssues.push(issue);
          }
        }
      }

      // Apply additional issue filtering (severity, status, sensitive data)
      filteredIssues = (await permissionService.filterIssues(
        userContext,
        filteredIssues as unknown as Array<Record<string, unknown>>
      )) as unknown as SonarQubeIssue[];

      logger.info('Issues filtered by permissions', {
        originalCount: result.issues.length,
        filteredCount: filteredIssues.length,
      });
    }

    logger.info('Successfully retrieved and filtered issues', {
      count: filteredIssues.length,
      facets: result.facets ? Object.keys(result.facets).length : 0,
    });

    return createStructuredResponse({
      total: filteredIssues.length,
      paging: {
        ...result.paging,
        total: filteredIssues.length,
      },
      issues: filteredIssues.map((issue: SonarQubeIssue) => ({
        key: issue.key,
        rule: issue.rule,
        severity: issue.severity,
        component: issue.component,
        project: issue.project,
        line: issue.line,
        status: issue.status,
        message: issue.message,
        effort: issue.effort,
        debt: issue.debt,
        author: issue.author,
        tags: issue.tags,
        creationDate: issue.creationDate,
        updateDate: issue.updateDate,
        type: issue.type,
        cleanCodeAttribute: issue.cleanCodeAttribute,
        cleanCodeAttributeCategory: issue.cleanCodeAttributeCategory,
        impacts: issue.impacts,
        issueStatus: issue.issueStatus,
        prioritizedRule: issue.prioritizedRule,
      })),
      components: result.components,
      facets: result.facets,
      rules: result.rules,
      users: result.users,
    });
  }
);
