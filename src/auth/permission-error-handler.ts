import { createLogger } from '../utils/logger.js';
import { UserContext, McpTool } from './types.js';

const logger = createLogger('PermissionErrorHandler');

/**
 * Standard error response format for permission-related errors
 */
export interface PermissionErrorResponse {
  success: false;
  error: string;
  errorCode: string;
}

/**
 * Standard success response format
 */
export interface PermissionSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Union type for permission responses
 */
export type PermissionResponse<T> = PermissionSuccessResponse<T> | PermissionErrorResponse;

/**
 * Create a permission denied error response
 */
export function createPermissionDeniedError(
  tool: McpTool,
  userId: string,
  reason?: string
): PermissionErrorResponse {
  logger.warn('Tool access denied', {
    tool,
    userId,
    reason,
  });

  return {
    success: false,
    error: 'Access denied',
    errorCode: 'PERMISSION_DENIED',
  };
}

/**
 * Create a project access denied error response
 */
export function createProjectAccessDeniedError(
  projectKey: string,
  reason?: string
): PermissionErrorResponse {
  return {
    success: false,
    error: `Access denied to project '${projectKey}'${reason ? `: ${reason}` : ''}`,
    errorCode: 'PROJECT_ACCESS_DENIED',
  };
}

/**
 * Create an internal error response
 */
export function createInternalError(tool: McpTool, error: unknown): PermissionErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error('Handler error', {
    tool,
    error: errorMessage,
  });

  return {
    success: false,
    error: errorMessage,
    errorCode: 'INTERNAL_ERROR',
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): PermissionSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Handle permission errors consistently
 */
export function handlePermissionError(
  tool: McpTool,
  userContext: UserContext | undefined,
  error: unknown
): PermissionErrorResponse {
  if (error instanceof Error) {
    if (error.message.includes('Access denied')) {
      return createPermissionDeniedError(tool, userContext?.userId ?? 'unknown', error.message);
    }

    if (error.message.includes('project')) {
      return {
        success: false,
        error: error.message,
        errorCode: 'PROJECT_ACCESS_DENIED',
      };
    }
  }

  return createInternalError(tool, error);
}

/**
 * Permission error types
 */
export type PermissionErrorType = 'permission' | 'scope' | 'project' | 'tool' | 'readonly';

/**
 * Extended permission error class
 */
export class PermissionError extends Error {
  public readonly code: string;
  public readonly type: PermissionErrorType;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    type: PermissionErrorType,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PermissionError';
    this.code = code;
    this.type = type;
    this.context = context;
  }
}

/**
 * Create a generic permission error
 */
export function createPermissionError(
  code: string,
  message: string,
  context?: Record<string, unknown>
): PermissionError {
  return new PermissionError(code, message, 'permission', context);
}

/**
 * Create an insufficient scope error
 */
export function createInsufficientScopeError(
  userScopes: string[],
  requiredScopes: string[]
): PermissionError {
  const userScopesStr = userScopes.length > 0 ? userScopes.join(', ') : 'none';
  const requiredScopesStr = requiredScopes.join(', ');
  const message = `Insufficient OAuth scope. Required: ${requiredScopesStr}. User has: ${userScopesStr}`;

  return new PermissionError('insufficient_scope', message, 'scope', {
    userScopes,
    requiredScopes,
  });
}

/**
 * Create a project access error
 */
export function createProjectAccessError(
  projectKey: string,
  allowedPatterns: string[]
): PermissionError {
  const patternsStr = allowedPatterns.length > 0 ? allowedPatterns.join(', ') : 'none';
  const message = `Access denied to project '${projectKey}'. User has access to: ${patternsStr}`;

  return new PermissionError('project_access_denied', message, 'project', {
    projectKey,
    allowedPatterns,
  });
}

/**
 * Create a tool access error
 */
export function createToolAccessError(tool: string, allowedTools: string[]): PermissionError {
  const toolsStr = allowedTools.length > 0 ? allowedTools.join(', ') : 'none';
  const message = `Access denied to tool '${tool}'. User has access to: ${toolsStr}`;

  return new PermissionError('tool_access_denied', message, 'tool', { tool, allowedTools });
}

/**
 * Create a read-only access error
 */
export function createReadOnlyError(operation: string): PermissionError {
  const message = `Read-only access denied for operation '${operation}'`;

  return new PermissionError('read_only_access', message, 'readonly', { operation });
}

/**
 * Format error message with type prefix
 */
export function formatErrorMessage(type: PermissionErrorType, message: string): string {
  const typeMap: Record<PermissionErrorType, string> = {
    permission: 'Permission',
    scope: 'Scope',
    project: 'Project',
    tool: 'Tool',
    readonly: 'ReadOnly',
  };

  return `[${typeMap[type]}] ${message}`;
}
