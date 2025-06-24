import { getPermissionManager } from '../auth/permission-manager.js';
import { contextProvider } from '../auth/context-provider.js';
import { createLogger } from '../utils/logger.js';
import { McpTool } from '../auth/types.js';
import { checkProjectAccessForParams } from '../auth/project-access-utils.js';

// Import standard handlers
import { handleSonarQubeProjects } from './projects.js';
import { handleSonarQubeGetIssues } from './issues.js';

// Import permission-aware handlers
import { handleSonarQubeProjectsWithPermissions } from './projects-with-permissions.js';
import { handleSonarQubeGetIssuesWithPermissions } from './issues-with-permissions.js';

const logger = createLogger('HandlerFactory');

/**
 * Factory to create handlers that are permission-aware when permissions are enabled
 */
export class HandlerFactory {
  /**
   * Create a handler that checks permissions when enabled
   */
  static createHandler<TParams extends Record<string, unknown>, TResult>(
    tool: McpTool,
    standardHandler: (params: TParams) => Promise<TResult>,
    permissionAwareHandler?: (params: TParams) => Promise<TResult>
  ): (params: TParams) => Promise<TResult> {
    return async (params: TParams): Promise<TResult> => {
      // Check if we have a user context (from HTTP transport)
      const userContext = contextProvider.getUserContext();
      const manager = await getPermissionManager();
      const permissionService = manager.getPermissionService();

      // If permissions are enabled and we have user context, check access
      if (permissionService && userContext) {
        // Check tool access
        const accessResult = await permissionService.checkToolAccess(userContext, tool);
        if (!accessResult.allowed) {
          logger.warn('Tool access denied', {
            tool,
            userId: userContext.userId,
            reason: accessResult.reason,
          });
          throw new Error(`Access denied: ${accessResult.reason}`);
        }

        // Check project access for project-specific tools
        if (isProjectTool(tool)) {
          const projectAccessResult = await checkProjectAccessForParams(params);
          if (!projectAccessResult.allowed) {
            throw new Error(`Access denied: ${projectAccessResult.reason}`);
          }
        }

        // Use permission-aware handler if available
        if (permissionAwareHandler) {
          logger.debug('Using permission-aware handler', { tool });
          return permissionAwareHandler(params);
        }
      }

      // Use standard handler
      logger.debug('Using standard handler', { tool, hasUserContext: !!userContext });
      return standardHandler(params);
    };
  }

  /**
   * Get projects handler
   */
  static getProjectsHandler() {
    return this.createHandler(
      'projects',
      handleSonarQubeProjects,
      handleSonarQubeProjectsWithPermissions
    );
  }

  /**
   * Get issues handler
   */
  static getIssuesHandler() {
    return this.createHandler(
      'issues',
      handleSonarQubeGetIssues,
      handleSonarQubeGetIssuesWithPermissions
    );
  }
}

/**
 * Check if a tool requires project access checks
 */
function isProjectTool(tool: McpTool): boolean {
  const projectTools: McpTool[] = [
    'measures_component',
    'measures_components',
    'measures_history',
    'quality_gate_status',
    'source_code',
    'scm_blame',
  ];

  return projectTools.includes(tool);
}
