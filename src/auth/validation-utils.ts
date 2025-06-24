import { PermissionRule } from './types.js';

/**
 * Common validation utilities for permission system
 */

/**
 * Validate that allowedProjects is an array
 */
export function validateAllowedProjects(projects: unknown, context: string): void {
  if (!Array.isArray(projects)) {
    throw new Error(`${context}: allowedProjects must be an array`);
  }
}

/**
 * Validate that allowedTools is an array
 */
export function validateAllowedTools(tools: unknown, context: string): void {
  if (!Array.isArray(tools)) {
    throw new Error(`${context}: allowedTools must be an array`);
  }
}

/**
 * Validate that readonly is a boolean
 */
export function validateReadonlyFlag(readonly: unknown, context: string): void {
  if (typeof readonly !== 'boolean') {
    throw new Error(`${context}: readonly must be a boolean`);
  }
}

/**
 * Validate regex patterns in project patterns array
 */
export function validateRegexPatterns(patterns: string[], context: string): void {
  for (const pattern of patterns) {
    try {
      new RegExp(pattern);
    } catch {
      throw new Error(`${context}: Invalid regex pattern '${pattern}'`);
    }
  }
}

/**
 * Validate a complete permission rule
 */
export function validatePermissionRule(rule: PermissionRule, index: number): void {
  const context = `Rule ${index}`;

  validateAllowedProjects(rule.allowedProjects, context);
  validateAllowedTools(rule.allowedTools, context);
  validateReadonlyFlag(rule.readonly, context);
  validateRegexPatterns(rule.allowedProjects, context);
}

/**
 * Validate a partial permission rule (for default rules)
 */
export function validatePartialPermissionRule(
  rule: Partial<PermissionRule>,
  context = 'Default rule'
): void {
  if (rule.allowedProjects !== undefined) {
    validateAllowedProjects(rule.allowedProjects, context);
  }

  if (rule.allowedTools !== undefined) {
    validateAllowedTools(rule.allowedTools, context);
  }

  if (rule.readonly !== undefined) {
    validateReadonlyFlag(rule.readonly, context);
  }
}

/**
 * Validate user groups against rule groups
 */
export function validateGroups(userGroups: string[], rule: PermissionRule): boolean {
  if (!rule.groups || rule.groups.length === 0) {
    return true; // No group restrictions
  }
  return userGroups.some((group) => rule.groups!.includes(group));
}

/**
 * Validate project access against rule patterns
 */
export function validateProjects(projectKey: string, rule: PermissionRule): boolean {
  if (rule.allowedProjects.length === 0) {
    return false;
  }

  return rule.allowedProjects.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(projectKey);
    } catch {
      // Invalid regex pattern - skip it
      return false;
    }
  });
}

/**
 * Validate tool access against rule
 */
export function validateTools(tool: string, rule: PermissionRule): boolean {
  // Check if tool is explicitly denied
  if (rule.deniedTools && rule.deniedTools.includes(tool)) {
    return false;
  }

  // Check if tool is in allowed list
  return rule.allowedTools.includes(tool);
}

/**
 * Check if project is allowed by patterns
 */
export function isProjectAllowed(projectKey: string, patterns: string[]): boolean {
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
}

/**
 * Check if tool is allowed
 */
export function isToolAllowed(
  tool: string,
  allowedTools: string[],
  deniedTools?: string[]
): boolean {
  // Check if tool is explicitly denied
  if (deniedTools && deniedTools.includes(tool)) {
    return false;
  }

  // Check if tool is in allowed list
  return allowedTools.includes(tool);
}
