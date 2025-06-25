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
import { getAuditLogger } from '../audit/audit-logger.js';
import { AuditEventBuilder } from '../audit/audit-event-builder.js';
import { AuditEventType } from '../audit/types.js';

const auditLogger = getAuditLogger();

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
    const startTime = Date.now();
    let toolInvoked = false;

    try {
      // Get context access information
      const { userContext, permissionService, hasPermissions } = await getContextAccess();

      // Override context if provided
      const effectiveUserContext = context?.userContext ?? userContext;

      // Log tool invocation
      if (effectiveUserContext) {
        await auditLogger.logEvent(
          new AuditEventBuilder()
            .withEventType(AuditEventType.TOOL_INVOKED)
            .withUserContext(effectiveUserContext, context?.sessionId)
            .withTarget('tool', tool)
            .withAction('execute', 'success', params as Record<string, unknown>)
            .withContext({
              sessionId: context?.sessionId,
              traceId: (params as Record<string, unknown>).traceId as string | undefined,
            })
            .build()
        );
        toolInvoked = true;
      }

      // Check if permissions are enabled
      if (!hasPermissions) {
        // No permission checking - call handler directly
        const result = await handler(params, context);

        // Log successful completion
        if (toolInvoked && effectiveUserContext) {
          const duration = Date.now() - startTime;
          await auditLogger.logEvent(
            AuditEventBuilder.toolInvocation(
              tool,
              params as Record<string, unknown>,
              effectiveUserContext,
              duration
            ).build()
          );
        }

        return createSuccessResponse(result);
      }

      // Check tool access
      const accessResult = await permissionService!.checkToolAccess(effectiveUserContext!, tool);
      if (!accessResult.allowed) {
        // Log permission denial
        await auditLogger.logEvent(
          AuditEventBuilder.permissionDenied(
            'tool',
            tool,
            'execute',
            accessResult.reason ?? 'Access denied',
            effectiveUserContext
          ).build()
        );
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

      // Log successful completion
      if (toolInvoked && effectiveUserContext) {
        const duration = Date.now() - startTime;
        await auditLogger.logEvent(
          AuditEventBuilder.toolInvocation(
            tool,
            params as Record<string, unknown>,
            effectiveUserContext,
            duration
          ).build()
        );
      }

      return createSuccessResponse(filteredResult as TResult);
    } catch (error) {
      // Log tool failure
      if (toolInvoked && context?.userContext) {
        const duration = Date.now() - startTime;
        await auditLogger.logEvent(
          AuditEventBuilder.toolFailure(
            tool,
            params as Record<string, unknown>,
            error instanceof Error ? error.message : String(error),
            context.userContext,
            duration
          ).build()
        );
      }

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
  switch (tool) {
    case 'projects':
      return await filterProjectsResult(result, userContext, permissionService);
    case 'issues':
      return await filterIssuesResult(result, userContext, permissionService);
    case 'components':
      return await filterComponentsResult(result, userContext, permissionService);
    case 'hotspots':
      return await filterHotspotsResult(result, userContext, permissionService);
    case 'measures_component':
    case 'measures_components':
    case 'measures_history':
    case 'quality_gate_status':
    case 'source_code':
    case 'scm_blame':
      // These tools operate on specific components/projects
      // Access should be checked at the parameter level
      return result;
    default:
      return result;
  }
}

/**
 * Filter projects result based on permissions
 */
async function filterProjectsResult(
  result: unknown,
  userContext: UserContext,
  permissionService: PermissionService
): Promise<unknown> {
  if (!Array.isArray(result)) {
    return result;
  }

  const originalCount = result.length;
  const filtered = await permissionService.filterProjects(userContext, result);

  if (filtered.length < originalCount) {
    await auditLogger.logEvent(
      AuditEventBuilder.dataAccess(
        'projects',
        'all',
        'read',
        filtered.length,
        true,
        userContext
      ).build()
    );
  }

  return filtered;
}

/**
 * Filter issues result based on permissions
 */
async function filterIssuesResult(
  result: unknown,
  userContext: UserContext,
  permissionService: PermissionService
): Promise<unknown> {
  if (
    !result ||
    typeof result !== 'object' ||
    !('issues' in result) ||
    !Array.isArray(result.issues)
  ) {
    return result;
  }

  const originalCount = result.issues.length;
  const filtered = await permissionService.filterIssues(userContext, result.issues);

  if (filtered.length < originalCount) {
    await auditLogger.logEvent(
      AuditEventBuilder.dataAccess(
        'issues',
        'query',
        'read',
        filtered.length,
        true,
        userContext
      ).build()
    );
  }

  return { ...result, issues: filtered, total: filtered.length };
}

/**
 * Filter components result based on permissions
 */
async function filterComponentsResult(
  result: unknown,
  userContext: UserContext,
  permissionService: PermissionService
): Promise<unknown> {
  if (
    !result ||
    typeof result !== 'object' ||
    !('components' in result) ||
    !Array.isArray(result.components)
  ) {
    return result;
  }

  const originalCount = result.components.length;
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
  const filteredComponents = filtered.filter((component) => component !== null);

  if (filteredComponents.length < originalCount) {
    await auditLogger.logEvent(
      AuditEventBuilder.dataAccess(
        'components',
        'query',
        'read',
        filteredComponents.length,
        true,
        userContext
      ).build()
    );
  }

  return { ...result, components: filteredComponents };
}

/**
 * Filter hotspots result based on permissions
 */
async function filterHotspotsResult(
  result: unknown,
  userContext: UserContext,
  permissionService: PermissionService
): Promise<unknown> {
  if (
    !result ||
    typeof result !== 'object' ||
    !('hotspots' in result) ||
    !Array.isArray(result.hotspots)
  ) {
    return result;
  }

  const originalCount = result.hotspots.length;
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

  if (filtered.length < originalCount) {
    await auditLogger.logEvent(
      AuditEventBuilder.dataAccess(
        'hotspots',
        'query',
        'read',
        filtered.length,
        true,
        userContext
      ).build()
    );
  }

  return { ...result, hotspots: filtered };
}

// Extract project key function moved to project-access-utils.ts

// checkProjectAccessForParams function moved to project-access-utils.ts
// Import and re-export for backward compatibility
export { checkProjectAccessForParams } from '../auth/project-access-utils.js';
