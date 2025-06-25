import {
  AuditEventType,
  AuditEventCategory,
  type AuditEvent,
  type AuditActor,
  type AuditContext,
  type AuditSecurity,
  type AuditCompliance,
} from './types.js';
import type { UserContext } from '../auth/types.js';
import type { TokenClaims } from '../auth/token-validator.js';

/**
 * Builder class for creating audit events
 */
export class AuditEventBuilder {
  private readonly event: Partial<AuditEvent> = {};

  /**
   * Set the event type and category
   */
  withEventType(type: AuditEventType, category?: AuditEventCategory): this {
    this.event.eventType = type;
    this.event.eventCategory = category ?? this.inferCategory(type);
    return this;
  }

  /**
   * Set actor information from user context
   */
  withUserContext(userContext?: UserContext, sessionId?: string): this {
    if (userContext) {
      this.event.actor = {
        userId: userContext.userId,
        userGroups: userContext.groups,
        sessionId,
      };
    }
    return this;
  }

  /**
   * Set actor information from token claims
   */
  withTokenClaims(claims: TokenClaims, sessionId?: string): this {
    this.event.actor = {
      userId: claims.sub,
      userGroups: claims.groups as string[] | undefined,
      sessionId,
    };
    return this;
  }

  /**
   * Set actor information directly
   */
  withActor(actor: AuditActor): this {
    this.event.actor = actor;
    return this;
  }

  /**
   * Set target information
   */
  withTarget(type: string, id: string, name?: string): this {
    this.event.target = { type, id, name };
    return this;
  }

  /**
   * Set action information
   */
  withAction(
    type: string,
    result: 'success' | 'failure' | 'partial',
    parameters?: Record<string, unknown>,
    error?: string,
    duration?: number
  ): this {
    this.event.action = {
      type,
      result,
      parameters,
      error,
      duration,
    };
    return this;
  }

  /**
   * Set context information
   */
  withContext(context: AuditContext): this {
    this.event.context = context;
    return this;
  }

  /**
   * Add security metadata
   */
  withSecurity(security: AuditSecurity): this {
    this.event.security = security;
    return this;
  }

  /**
   * Add token security information
   */
  withTokenSecurity(claims: TokenClaims): this {
    this.event.security = {
      ...this.event.security,
      tokenAud: claims.aud as string,
      tokenIss: claims.iss,
      tokenJti: claims.jti,
    };
    return this;
  }

  /**
   * Add permission check results
   */
  withPermissionChecks(
    checks: Array<{ permission: string; result: boolean; reason?: string }>
  ): this {
    this.event.security = {
      ...this.event.security,
      permissionChecks: checks,
    };
    return this;
  }

  /**
   * Set compliance information
   */
  withCompliance(compliance: AuditCompliance): this {
    this.event.compliance = compliance;
    return this;
  }

  /**
   * Build the audit event
   */
  build(): Omit<AuditEvent, 'eventId' | 'timestamp' | 'checksum'> {
    if (!this.event.eventType) {
      throw new Error('Event type is required');
    }

    if (!this.event.actor) {
      throw new Error('Actor information is required');
    }

    if (!this.event.target) {
      throw new Error('Target information is required');
    }

    if (!this.event.action) {
      throw new Error('Action information is required');
    }

    // Set defaults
    this.event.eventCategory ??= AuditEventCategory.SYSTEM;
    this.event.context ??= {};
    this.event.security ??= {};
    this.event.compliance ??= {};

    return this.event as Omit<AuditEvent, 'eventId' | 'timestamp' | 'checksum'>;
  }

  /**
   * Infer event category from event type
   */
  private inferCategory(type: AuditEventType): AuditEventCategory {
    if (type.startsWith('AUTH_')) {
      return AuditEventCategory.AUTHENTICATION;
    } else if (type.startsWith('PERMISSION_') || type.startsWith('ROLE_')) {
      return AuditEventCategory.AUTHORIZATION;
    } else if (type.startsWith('TOOL_')) {
      return AuditEventCategory.TOOL_ACCESS;
    } else if (type.startsWith('DATA_')) {
      return AuditEventCategory.DATA_ACCESS;
    } else if (
      type.startsWith('CONFIG_') ||
      type.startsWith('SERVICE_ACCOUNT_') ||
      type.includes('RULE_')
    ) {
      return AuditEventCategory.CONFIGURATION;
    } else {
      return AuditEventCategory.SYSTEM;
    }
  }

  /**
   * Create a builder for a successful tool invocation
   */
  static toolInvocation(
    toolName: string,
    parameters: Record<string, unknown>,
    userContext?: UserContext,
    duration?: number
  ): AuditEventBuilder {
    return new AuditEventBuilder()
      .withEventType(AuditEventType.TOOL_COMPLETED)
      .withUserContext(userContext)
      .withTarget('tool', toolName)
      .withAction('execute', 'success', parameters, undefined, duration);
  }

  /**
   * Create a builder for a failed tool invocation
   */
  static toolFailure(
    toolName: string,
    parameters: Record<string, unknown>,
    error: string,
    userContext?: UserContext,
    duration?: number
  ): AuditEventBuilder {
    return new AuditEventBuilder()
      .withEventType(AuditEventType.TOOL_FAILED)
      .withUserContext(userContext)
      .withTarget('tool', toolName)
      .withAction('execute', 'failure', parameters, error, duration);
  }

  /**
   * Create a builder for a permission denial
   */
  static permissionDenied(
    resource: string,
    resourceId: string,
    permission: string,
    reason: string,
    userContext?: UserContext
  ): AuditEventBuilder {
    return new AuditEventBuilder()
      .withEventType(AuditEventType.PERMISSION_DENIED)
      .withUserContext(userContext)
      .withTarget(resource, resourceId)
      .withAction('access', 'failure', { permission }, reason)
      .withPermissionChecks([{ permission, result: false, reason }]);
  }

  /**
   * Create a builder for data access
   */
  static dataAccess(
    dataType: string,
    dataId: string,
    operation: string,
    recordCount?: number,
    filtered?: boolean,
    userContext?: UserContext
  ): AuditEventBuilder {
    return new AuditEventBuilder()
      .withEventType(filtered ? AuditEventType.DATA_FILTERED : AuditEventType.DATA_ACCESSED)
      .withUserContext(userContext)
      .withTarget(dataType, dataId)
      .withAction(operation, 'success', { recordCount, filtered });
  }

  /**
   * Create a builder for authentication events
   */
  static authentication(
    type: 'login' | 'logout' | 'token_validated' | 'token_rejected',
    claims: TokenClaims,
    success: boolean,
    error?: string
  ): AuditEventBuilder {
    const eventTypeMap = {
      login: AuditEventType.AUTH_LOGIN,
      logout: AuditEventType.AUTH_LOGOUT,
      token_validated: AuditEventType.AUTH_TOKEN_VALIDATED,
      token_rejected: AuditEventType.AUTH_TOKEN_REJECTED,
    };

    return new AuditEventBuilder()
      .withEventType(eventTypeMap[type])
      .withTokenClaims(claims)
      .withTarget('auth', claims.sub)
      .withAction(type, success ? 'success' : 'failure', undefined, error)
      .withTokenSecurity(claims);
  }

  /**
   * Create a builder for configuration changes
   */
  static configurationChange(
    configType: string,
    configId: string,
    changeType: 'added' | 'updated' | 'removed',
    oldValue?: unknown,
    newValue?: unknown,
    userContext?: UserContext
  ): AuditEventBuilder {
    return new AuditEventBuilder()
      .withEventType(AuditEventType.CONFIG_CHANGED)
      .withUserContext(userContext)
      .withTarget(configType, configId)
      .withAction(changeType, 'success', { oldValue, newValue });
  }
}
