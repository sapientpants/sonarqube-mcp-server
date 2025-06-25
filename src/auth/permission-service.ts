import { createLogger } from '../utils/logger.js';
import {
  PermissionRule,
  PermissionConfig,
  UserContext,
  PermissionCheckResult,
  PermissionAuditEntry,
  McpTool,
  TOOL_OPERATIONS,
  IssueSeverity,
  IssueStatus,
} from './types.js';
import { TokenClaims } from './token-validator.js';
import { getAuditLogger } from '../audit/audit-logger.js';
import { AuditEventBuilder } from '../audit/audit-event-builder.js';
import { AuditEventType } from '../audit/types.js';

const logger = createLogger('PermissionService');
const auditLogger = getAuditLogger();

/**
 * Permission service for filtering and authorizing access
 */
export class PermissionService {
  private readonly permissionCache: Map<string, PermissionCheckResult> | undefined;
  private auditLog: PermissionAuditEntry[] = [];

  constructor(private readonly config: PermissionConfig) {
    if (config.enableCaching) {
      this.permissionCache = new Map();
      // Set up cache cleanup
      const ttl = (config.cacheTtl ?? 300) * 1000; // Convert to milliseconds
      setInterval(() => this.permissionCache?.clear(), ttl).unref();
    }
  }

  /**
   * Extract user context from token claims
   */
  extractUserContext(claims: TokenClaims): UserContext {
    const groups = this.extractGroups(claims);
    const scopes = this.extractScopes(claims);

    return {
      userId: claims.sub,
      groups,
      scopes,
      issuer: claims.iss,
      claims: claims as Record<string, unknown>,
    };
  }

  /**
   * Extract groups from token claims
   * Supports multiple claim names for flexibility
   */
  private extractGroups(claims: TokenClaims): string[] {
    const groups: string[] = [];

    // Check common group claim names
    const groupClaims = ['groups', 'group', 'roles', 'role', 'authorities'];

    for (const claimName of groupClaims) {
      const value = claims[claimName];
      if (value) {
        if (Array.isArray(value)) {
          groups.push(...value.filter((g): g is string => typeof g === 'string'));
        } else if (typeof value === 'string') {
          // Handle comma-separated or space-separated groups
          groups.push(...value.split(/[,\s]+/).filter((g) => g.length > 0));
        }
      }
    }

    // Remove duplicates
    return [...new Set(groups)];
  }

  /**
   * Extract scopes from token claims
   */
  private extractScopes(claims: TokenClaims): string[] {
    if (!claims.scope) return [];

    if (typeof claims.scope === 'string') {
      return claims.scope.split(' ').filter((s) => s.length > 0);
    }

    return [];
  }

  /**
   * Check if a user can access a specific tool
   */
  async checkToolAccess(userContext: UserContext, tool: McpTool): Promise<PermissionCheckResult> {
    const cacheKey = `${userContext.userId}:tool:${tool}`;

    // Check cache
    if (this.permissionCache?.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Find applicable rules
    const applicableRule = this.findApplicableRule(userContext);

    if (!applicableRule) {
      const result = { allowed: false, reason: 'No applicable permission rule found' };
      await this.audit(userContext, `access_tool:${tool}`, tool, result);
      this.cacheResult(cacheKey, result);
      return result;
    }

    // Check if tool is explicitly denied
    if (applicableRule.deniedTools?.includes(tool)) {
      const result = {
        allowed: false,
        reason: `Tool '${tool}' is explicitly denied`,
        appliedRule: applicableRule,
      };
      await this.audit(userContext, `access_tool:${tool}`, tool, result);
      this.cacheResult(cacheKey, result);
      return result;
    }

    // Check if tool is allowed
    if (!applicableRule.allowedTools.includes(tool)) {
      const result = {
        allowed: false,
        reason: `Tool '${tool}' is not in allowed tools list`,
        appliedRule: applicableRule,
      };
      await this.audit(userContext, `access_tool:${tool}`, tool, result);
      this.cacheResult(cacheKey, result);
      return result;
    }

    // Check if write operation is allowed
    const operation = TOOL_OPERATIONS[tool];
    if (operation === 'write' && applicableRule.readonly) {
      const result = {
        allowed: false,
        reason: 'Write operations are not allowed for read-only users',
        appliedRule: applicableRule,
      };
      await this.audit(userContext, `access_tool:${tool}`, tool, result);
      this.cacheResult(cacheKey, result);
      return result;
    }

    const result = { allowed: true, appliedRule: applicableRule };
    await this.audit(userContext, `access_tool:${tool}`, tool, result);
    this.cacheResult(cacheKey, result);
    return result;
  }

  /**
   * Check if a user can access a specific project
   */
  async checkProjectAccess(
    userContext: UserContext,
    projectKey: string
  ): Promise<PermissionCheckResult> {
    const cacheKey = `${userContext.userId}:project:${projectKey}`;

    // Check cache
    if (this.permissionCache?.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    const applicableRule = this.findApplicableRule(userContext);

    if (!applicableRule) {
      const result = { allowed: false, reason: 'No applicable permission rule found' };
      await this.audit(userContext, 'access_project', projectKey, result);
      this.cacheResult(cacheKey, result);
      return result;
    }

    // Check if project matches any allowed patterns
    const allowed = applicableRule.allowedProjects.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(projectKey);
      } catch (e) {
        logger.error(`Invalid regex pattern: ${pattern}`, e);
        return false;
      }
    });

    const result = allowed
      ? { allowed: true, appliedRule: applicableRule }
      : {
          allowed: false,
          reason: `Project '${projectKey}' does not match any allowed patterns`,
          appliedRule: applicableRule,
        };

    await this.audit(userContext, 'access_project', projectKey, result);
    this.cacheResult(cacheKey, result);
    return result;
  }

  /**
   * Filter projects based on user permissions
   */
  async filterProjects<T extends { key: string }>(
    userContext: UserContext,
    projects: T[]
  ): Promise<T[]> {
    const applicableRule = this.findApplicableRule(userContext);

    if (!applicableRule || applicableRule.allowedProjects.length === 0) {
      return [];
    }

    return projects.filter((project) => {
      const result = applicableRule.allowedProjects.some((pattern) => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(project.key);
        } catch (e) {
          logger.error(`Invalid regex pattern: ${pattern}`, e);
          return false;
        }
      });

      if (!result) {
        logger.debug(`Filtered out project ${project.key} for user ${userContext.userId}`);
      }

      return result;
    });
  }

  /**
   * Filter issues based on user permissions
   */
  async filterIssues<T extends Record<string, unknown>>(
    userContext: UserContext,
    issues: T[]
  ): Promise<T[]> {
    const applicableRule = this.findApplicableRule(userContext);

    if (!applicableRule) {
      return [];
    }

    return issues.filter((issue) => {
      // Filter by severity
      if (applicableRule.maxSeverity) {
        const severity = issue.severity as IssueSeverity | undefined;
        if (severity && !this.isSeverityAllowed(severity, applicableRule.maxSeverity)) {
          logger.debug(`Filtered out issue ${issue.key} due to severity ${severity}`);
          return false;
        }
      }

      // Filter by status
      if (applicableRule.allowedStatuses && applicableRule.allowedStatuses.length > 0) {
        const status = issue.status as IssueStatus | undefined;
        if (status && !applicableRule.allowedStatuses.includes(status)) {
          logger.debug(`Filtered out issue ${issue.key} due to status ${status}`);
          return false;
        }
      }

      // Redact sensitive data if needed
      if (applicableRule.hideSensitiveData) {
        this.redactSensitiveData(issue);
      }

      return true;
    });
  }

  /**
   * Check if a severity level is allowed
   */
  private isSeverityAllowed(severity: IssueSeverity, maxSeverity: IssueSeverity): boolean {
    const severityOrder: Record<IssueSeverity, number> = {
      INFO: 1,
      MINOR: 2,
      MAJOR: 3,
      CRITICAL: 4,
      BLOCKER: 5,
    };

    return severityOrder[severity] <= severityOrder[maxSeverity];
  }

  /**
   * Redact sensitive data from an issue
   */
  private redactSensitiveData(issue: Record<string, unknown>): void {
    // Redact author information
    if ('author' in issue) {
      issue.author = '[REDACTED]';
    }

    // Redact assignee information
    if ('assignee' in issue) {
      issue.assignee = '[REDACTED]';
    }

    // Redact comments
    if ('comments' in issue && Array.isArray(issue.comments)) {
      issue.comments = issue.comments.map((comment) => ({
        ...comment,
        login: '[REDACTED]',
        htmlText: '[REDACTED]',
        markdown: '[REDACTED]',
      }));
    }

    // Redact changelog
    if ('changelog' in issue && Array.isArray(issue.changelog)) {
      issue.changelog = [];
    }
  }

  /**
   * Find the applicable permission rule for a user
   */
  private findApplicableRule(userContext: UserContext): PermissionRule | null {
    // Sort rules by priority (higher priority first)
    const sortedRules = [...this.config.rules].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    // Find first matching rule
    for (const rule of sortedRules) {
      if (!rule.groups || rule.groups.length === 0) {
        // Rule applies to all groups
        return rule;
      }

      // Check if user has any of the required groups
      const hasGroup = rule.groups.some((group) => userContext.groups.includes(group));

      if (hasGroup) {
        return rule;
      }
    }

    // Apply default rule if no specific rule matches
    if (this.config.defaultRule) {
      return {
        allowedProjects: this.config.defaultRule.allowedProjects ?? [],
        allowedTools: this.config.defaultRule.allowedTools ?? [],
        deniedTools: this.config.defaultRule.deniedTools,
        readonly: this.config.defaultRule.readonly ?? true,
        maxSeverity: this.config.defaultRule.maxSeverity,
        allowedStatuses: this.config.defaultRule.allowedStatuses,
        hideSensitiveData: this.config.defaultRule.hideSensitiveData,
        priority: -1, // Lowest priority
      };
    }

    return null;
  }

  /**
   * Cache a permission check result
   */
  private cacheResult(key: string, result: PermissionCheckResult): void {
    if (this.permissionCache) {
      this.permissionCache.set(key, result);
    }
  }

  /**
   * Audit a permission check
   */
  private async audit(
    userContext: UserContext,
    action: string,
    resource: string,
    result: PermissionCheckResult
  ): Promise<void> {
    if (!this.config.enableAudit) return;

    const entry: PermissionAuditEntry = {
      timestamp: new Date(),
      userId: userContext.userId,
      groups: userContext.groups,
      action,
      resource,
      allowed: result.allowed,
      reason: result.reason,
      appliedRule: result.appliedRule ? JSON.stringify(result.appliedRule) : undefined,
    };

    this.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    logger.debug('Permission check', {
      userId: userContext.userId,
      action,
      resource,
      allowed: result.allowed,
      reason: result.reason,
    });

    // Log to comprehensive audit system
    try {
      const eventType = result.allowed
        ? AuditEventType.PERMISSION_GRANTED
        : AuditEventType.PERMISSION_DENIED;

      await auditLogger.logEvent(
        new AuditEventBuilder()
          .withEventType(eventType)
          .withUserContext(userContext)
          .withTarget('permission', resource)
          .withAction(action, result.allowed ? 'success' : 'failure', undefined, result.reason)
          .withSecurity({
            permissionChecks: [
              {
                permission: action,
                result: result.allowed,
                reason: result.reason,
              },
            ],
          })
          .withCompliance({
            dataClassification: 'internal',
          })
          .build()
      );
    } catch (error) {
      logger.error('Failed to log permission check to audit system', { error });
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(): PermissionAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache?.clear();
  }
}
