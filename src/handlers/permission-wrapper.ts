import { UserContext, McpTool } from '../auth/types.js';
import { PermissionService } from '../auth/permission-service.js';
import {
  PermissionResponse,
  createPermissionDeniedError,
  createSuccessResponse,
  handlePermissionError,
} from '../auth/permission-error-handler.js';
import { getContextAccess } from '../auth/context-utils.js';
import { extractProjectKey } from '../auth/project-access-utils.js';

/**
 * Context passed to permission-aware handlers
 */
export interface HandlerContext {
  userContext?: UserContext;
  sessionId?: string;
}

/**
 * Handler response wrapper (alias for backward compatibility)
 */
export type HandlerResponse<T = unknown> = PermissionResponse<T>;

/**
 * Create a permission-aware handler wrapper
 */
export function createPermissionAwareHandler<TParams extends Record<string, unknown>, TResult>(
  tool: McpTool,
  handler: (params: TParams, context?: HandlerContext) => Promise<TResult>
): (params: TParams, context?: HandlerContext) => Promise<HandlerResponse<TResult>> {
  return async (params: TParams, context?: HandlerContext): Promise<HandlerResponse<TResult>> => {
    try {
      // Get context access information
      const { userContext, permissionService, hasPermissions } = await getContextAccess();

      // Override context if provided
      const effectiveUserContext = context?.userContext ?? userContext;

      // Check if permissions are enabled
      if (!hasPermissions) {
        // No permission checking - call handler directly
        const result = await handler(params, context);
        return createSuccessResponse(result);
      }

      // Check tool access
      const accessResult = await permissionService!.checkToolAccess(effectiveUserContext!, tool);
      if (!accessResult.allowed) {
        return createPermissionDeniedError(tool, effectiveUserContext!.userId, accessResult.reason);
      }

      // Call the handler with context
      const result = await handler(params, context);

      // Apply permission filtering to the result
      const filteredResult = await applyPermissionFiltering(
        tool,
        result,
        effectiveUserContext!,
        permissionService!
      );

      return createSuccessResponse(filteredResult as TResult);
    } catch (error) {
      return handlePermissionError(tool, context?.userContext, error);
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
        const filtered = await Promise.all(
          result.components.map(async (component) => {
            if (component && typeof component === 'object' && 'key' in component) {
              const projectKey = extractProjectKey(component.key as string);
              const access = await permissionService.checkProjectAccess(userContext, projectKey);
              return access.allowed ? component : null;
            }
            return null;
          })
        );
        return { ...result, components: filtered.filter((component) => component !== null) };
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
            const projectKey = (hotspot.project as { key?: string }).key ?? hotspot.project;
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

// Extract project key function moved to project-access-utils.ts

// checkProjectAccessForParams function moved to project-access-utils.ts
// Import and re-export for backward compatibility
export { checkProjectAccessForParams } from '../auth/project-access-utils.js';
