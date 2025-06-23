import { createLogger } from '../utils/logger.js';
import { permissionManager } from '../auth/permission-manager.js';
import { UserContext, McpTool } from '../auth/types.js';
import { PermissionService } from '../auth/permission-service.js';

const logger = createLogger('PermissionWrapper');

/**
 * Context passed to permission-aware handlers
 */
export interface HandlerContext {
  userContext?: UserContext;
  sessionId?: string;
}

/**
 * Handler response wrapper
 */
export interface HandlerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Create a permission-aware handler wrapper
 */
export function createPermissionAwareHandler<TParams extends Record<string, unknown>, TResult>(
  tool: McpTool,
  handler: (params: TParams, context?: HandlerContext) => Promise<TResult>
): (params: TParams, context?: HandlerContext) => Promise<HandlerResponse<TResult>> {
  return async (params: TParams, context?: HandlerContext): Promise<HandlerResponse<TResult>> => {
    try {
      // Check if permissions are enabled
      const permissionService = permissionManager.getPermissionService();
      if (!permissionService || !context?.userContext) {
        // No permission checking - call handler directly
        const result = await handler(params, context);
        return { success: true, data: result };
      }

      // Check tool access
      const accessResult = await permissionService.checkToolAccess(context.userContext, tool);
      if (!accessResult.allowed) {
        logger.warn('Tool access denied', {
          tool,
          userId: context.userContext.userId,
          reason: accessResult.reason,
        });
        return {
          success: false,
          error: 'Access denied',
          errorCode: 'PERMISSION_DENIED',
        };
      }

      // Call the handler with context
      const result = await handler(params, context);

      // Apply permission filtering to the result
      const filteredResult = await applyPermissionFiltering(
        tool,
        result,
        context.userContext,
        permissionService
      );

      return { success: true, data: filteredResult as TResult };
    } catch (error) {
      logger.error('Handler error', {
        tool,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  };
}

/**
 * Apply permission filtering to handler results
 */
async function applyPermissionFiltering(
  tool: McpTool,
  result: unknown,
  userContext: UserContext,
  permissionService: PermissionService
): Promise<unknown> {
  // Handle different tool results
  switch (tool) {
    case 'projects':
      // Filter projects based on permissions
      if (Array.isArray(result)) {
        return await permissionService.filterProjects(userContext, result);
      }
      break;

    case 'issues':
      // Filter issues based on permissions
      if (
        result &&
        typeof result === 'object' &&
        'issues' in result &&
        Array.isArray(result.issues)
      ) {
        const filtered = await permissionService.filterIssues(userContext, result.issues);
        return { ...result, issues: filtered, total: filtered.length };
      }
      break;

    case 'components':
      // Filter components based on project permissions
      if (
        result &&
        typeof result === 'object' &&
        'components' in result &&
        Array.isArray(result.components)
      ) {
        const filtered: unknown[] = [];
        for (const component of result.components) {
          if (component && typeof component === 'object' && 'key' in component) {
            const projectKey = extractProjectKey(component.key as string);
            const access = await permissionService.checkProjectAccess(userContext, projectKey);
            if (access.allowed) {
              filtered.push(component);
            }
          }
        }
        return { ...result, components: filtered };
      }
      break;

    case 'measures_component':
    case 'measures_components':
    case 'measures_history':
    case 'quality_gate_status':
    case 'source_code':
    case 'scm_blame':
      // These tools operate on specific components/projects
      // Access should be checked at the parameter level
      // The wrapper will have already checked tool access
      return result;

    case 'hotspots':
      // Filter hotspots based on project permissions
      if (
        result &&
        typeof result === 'object' &&
        'hotspots' in result &&
        Array.isArray(result.hotspots)
      ) {
        const filtered: unknown[] = [];
        for (const hotspot of result.hotspots) {
          if (hotspot && typeof hotspot === 'object' && 'project' in hotspot) {
            const projectKey = (hotspot.project as { key?: string }).key || hotspot.project;
            const access = await permissionService.checkProjectAccess(userContext, projectKey);
            if (access.allowed) {
              filtered.push(hotspot);
            }
          }
        }
        return { ...result, hotspots: filtered };
      }
      break;

    default:
      // For other tools, return result as-is
      return result;
  }

  return result;
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

/**
 * Check project access for parameters
 */
export async function checkProjectAccessForParams(
  params: Record<string, unknown>,
  userContext: UserContext
): Promise<{ allowed: boolean; reason?: string }> {
  const permissionService = permissionManager.getPermissionService();
  if (!permissionService) {
    return { allowed: true }; // No permission checking
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
