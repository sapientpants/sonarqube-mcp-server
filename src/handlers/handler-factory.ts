import { permissionManager } from '../auth/permission-manager.js';
import { contextProvider } from '../auth/context-provider.js';
import { createLogger } from '../utils/logger.js';
import { McpTool, UserContext } from '../auth/types.js';
import { PermissionService } from '../auth/permission-service.js';

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
      const permissionService = permissionManager.getPermissionService();

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
        const projectAccessResult = await checkProjectAccessForTool(
          tool,
          params,
          userContext,
          permissionService
        );
        if (!projectAccessResult.allowed) {
          throw new Error(`Access denied: ${projectAccessResult.reason}`);
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
 * Check project access for tools that operate on specific projects
 */
async function checkProjectAccessForTool(
  tool: McpTool,
  params: Record<string, unknown>,
  userContext: UserContext,
  permissionService: PermissionService
): Promise<{ allowed: boolean; reason?: string }> {
  // Tools that require project access checks
  const projectTools: McpTool[] = [
    'measures_component',
    'measures_components',
    'measures_history',
    'quality_gate_status',
    'source_code',
    'scm_blame',
  ];

  if (!projectTools.includes(tool)) {
    return { allowed: true };
  }

  // Check various parameter names that might contain project keys
  const projectParams = ['project_key', 'projectKey', 'component', 'components', 'component_keys'];

  for (const paramName of projectParams) {
    const value = params[paramName];
    if (!value) continue;

    if (typeof value === 'string') {
      const projectKey = extractProjectKey(value);
      const result = await permissionService.checkProjectAccess(userContext, projectKey);
      if (!result.allowed) {
        return { allowed: false, reason: result.reason };
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const projectKey = extractProjectKey(item);
          const result = await permissionService.checkProjectAccess(userContext, projectKey);
          if (!result.allowed) {
            return { allowed: false, reason: result.reason };
          }
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * Extract project key from component key
 */
function extractProjectKey(componentKey: string): string {
  // Component keys are typically in format: projectKey:path/to/file
  const colonIndex = componentKey.indexOf(':');
  if (colonIndex > 0) {
    return componentKey.substring(0, colonIndex);
  }
  // If no colon, assume the whole key is the project key
  return componentKey;
}
