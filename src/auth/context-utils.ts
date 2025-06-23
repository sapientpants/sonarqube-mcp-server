import { contextProvider } from './context-provider.js';
import { permissionManager } from './permission-manager.js';
import { UserContext } from './types.js';
import { PermissionService } from './permission-service.js';

/**
 * Context access result containing user context and permission service
 */
export interface ContextAccess {
  userContext?: UserContext;
  permissionService?: PermissionService;
  hasPermissions: boolean;
}

/**
 * Get user context and permission service in a consistent way
 */
export function getContextAccess(): ContextAccess {
  const userContext = contextProvider.getUserContext();
  const permissionService = permissionManager.getPermissionService();

  return {
    userContext,
    permissionService: permissionService ?? undefined,
    hasPermissions: !!(permissionService && userContext),
  };
}

/**
 * Check if permission checking is enabled and context is available
 */
export function isPermissionCheckingEnabled(): boolean {
  const { hasPermissions } = getContextAccess();
  return hasPermissions;
}

/**
 * Get user context with validation
 */
export function getUserContextOrThrow(): UserContext {
  const userContext = contextProvider.getUserContext();
  if (!userContext) {
    throw new Error('User context not available');
  }
  return userContext;
}

/**
 * Get permission service with validation
 */
export function getPermissionServiceOrThrow(): PermissionService {
  const permissionService = permissionManager.getPermissionService();
  if (!permissionService) {
    throw new Error('Permission service not available');
  }
  return permissionService;
}
