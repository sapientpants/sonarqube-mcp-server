import { contextProvider } from './context-provider.js';
import { getPermissionManager } from './permission-manager.js';
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
export async function getContextAccess(): Promise<ContextAccess> {
  const userContext = contextProvider.getUserContext();
  const manager = await getPermissionManager();
  const permissionService = manager.getPermissionService();

  return {
    userContext,
    permissionService: permissionService ?? undefined,
    hasPermissions: !!(permissionService && userContext),
  };
}

/**
 * Check if permission checking is enabled and context is available
 */
export async function isPermissionCheckingEnabled(): Promise<boolean> {
  const { hasPermissions } = await getContextAccess();
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
export async function getPermissionServiceOrThrow(): Promise<PermissionService> {
  const manager = await getPermissionManager();
  const permissionService = manager.getPermissionService();
  if (!permissionService) {
    throw new Error('Permission service not available');
  }
  return permissionService;
}
