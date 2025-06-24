import { getContextAccess } from './context-utils.js';

/**
 * Extract project key from component key
 */
export function extractProjectKey(componentKey: string): string {
  // Component keys are typically in format: projectKey:path/to/file
  const colonIndex = componentKey.indexOf(':');
  if (colonIndex > 0) {
    return componentKey.substring(0, colonIndex);
  }
  // If no colon, assume the whole key is the project key
  return componentKey;
}

/**
 * Check project access for a single project key
 */
export async function checkSingleProjectAccess(
  projectKey: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { userContext, permissionService, hasPermissions } = await getContextAccess();

  if (!hasPermissions) {
    return { allowed: true }; // No permission checking
  }

  const result = await permissionService!.checkProjectAccess(userContext!, projectKey);
  return { allowed: result.allowed, reason: result.reason };
}

/**
 * Check project access for multiple project keys
 */
export async function checkMultipleProjectAccess(
  projectKeys: string[]
): Promise<{ allowed: boolean; reason?: string }> {
  for (const projectKey of projectKeys) {
    const result = await checkSingleProjectAccess(projectKey);
    if (!result.allowed) {
      return result;
    }
  }
  return { allowed: true };
}

/**
 * Check project access for parameters containing project references
 */
export async function checkProjectAccessForParams(
  params: Record<string, unknown>
): Promise<{ allowed: boolean; reason?: string }> {
  const { hasPermissions } = await getContextAccess();

  if (!hasPermissions) {
    return { allowed: true }; // No permission checking
  }

  // Check various parameter names that might contain project keys
  const projectParams = ['project_key', 'projectKey', 'component', 'components', 'component_keys'];

  for (const paramName of projectParams) {
    const value = params[paramName];
    if (!value) continue;

    const result = await checkProjectValueAccess(value);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Helper function to check access for a parameter value (string or array)
 */
async function checkProjectValueAccess(
  value: unknown
): Promise<{ allowed: boolean; reason?: string }> {
  if (typeof value === 'string') {
    return await checkStringProjectAccess(value);
  }

  if (Array.isArray(value)) {
    return await checkArrayProjectAccess(value);
  }

  return { allowed: true };
}

/**
 * Helper function to check access for a string project key
 */
async function checkStringProjectAccess(
  value: string
): Promise<{ allowed: boolean; reason?: string }> {
  const projectKey = extractProjectKey(value);
  return await checkSingleProjectAccess(projectKey);
}

/**
 * Helper function to check access for an array of project keys
 */
async function checkArrayProjectAccess(
  value: unknown[]
): Promise<{ allowed: boolean; reason?: string }> {
  for (const item of value) {
    if (typeof item === 'string') {
      const result = await checkStringProjectAccess(item);
      if (!result.allowed) {
        return result;
      }
    }
  }
  return { allowed: true };
}

/**
 * Validate project access and throw if denied
 */
export async function validateProjectAccessOrThrow(projectKeys: string | string[]): Promise<void> {
  const keysArray = Array.isArray(projectKeys) ? projectKeys : [projectKeys];

  for (const projectKey of keysArray) {
    const result = await checkSingleProjectAccess(projectKey);
    if (!result.allowed) {
      throw new Error(`Access denied to project '${projectKey}': ${result.reason}`);
    }
  }
}

/**
 * Filter projects by access permissions
 */
export function filterProjectsByAccess<T extends { key: string }>(
  projects: T[],
  rule: import('./types.js').PermissionRule
): T[] {
  return projects.filter((project) => {
    return rule.allowedProjects.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(project.key);
      } catch {
        return false;
      }
    });
  });
}

/**
 * Check if a single project is allowed by rule
 */
export function checkProjectAccess(
  projectKey: string,
  rule: import('./types.js').PermissionRule
): boolean {
  return rule.allowedProjects.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(projectKey);
    } catch {
      return false;
    }
  });
}

/**
 * Get project filter patterns from rule
 */
export function getProjectFilterPatterns(rule: import('./types.js').PermissionRule): string[] {
  return [...rule.allowedProjects];
}

/**
 * Create a project filter function
 */
export function createProjectFilter(patterns: string[]): (projectKey: string) => boolean {
  return (projectKey: string) => {
    if (patterns.length === 0) {
      return false;
    }

    return patterns.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(projectKey);
      } catch {
        return false;
      }
    });
  };
}
