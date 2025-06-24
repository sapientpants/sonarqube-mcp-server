import { createLogger } from '../utils/logger.js';
import type { TokenClaims } from './token-validator.js';

const logger = createLogger('ServiceAccountAuditor');

/**
 * Audit event types
 */
export enum AuditEventType {
  ACCOUNT_ACCESSED = 'ACCOUNT_ACCESSED',
  ACCOUNT_ACCESS_DENIED = 'ACCOUNT_ACCESS_DENIED',
  ACCOUNT_FAILED = 'ACCOUNT_FAILED',
  ACCOUNT_FAILOVER = 'ACCOUNT_FAILOVER',
  HEALTH_CHECK_PASSED = 'HEALTH_CHECK_PASSED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
}

/**
 * Audit event for service account usage
 */
export interface ServiceAccountAuditEvent {
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  userGroups?: string[];
  issuer?: string;
  serviceAccountId: string;
  serviceAccountName?: string;
  environment?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit statistics for a service account
 */
export interface ServiceAccountStats {
  accountId: string;
  totalAccesses: number;
  successfulAccesses: number;
  failedAccesses: number;
  uniqueUsers: Set<string>;
  lastAccessTime?: Date;
  failureRate: number;
}

/**
 * Options for the service account auditor
 */
export interface ServiceAccountAuditorOptions {
  /** Maximum number of audit events to keep in memory (default: 10000) */
  maxEvents?: number;
  /** Whether to log audit events to file (default: true) */
  enableFileLogging?: boolean;
  /** Whether to track detailed statistics (default: true) */
  enableStatistics?: boolean;
}

/**
 * Audits service account usage and provides analytics
 */
export class ServiceAccountAuditor {
  private readonly options: Required<ServiceAccountAuditorOptions>;
  private readonly auditEvents: ServiceAccountAuditEvent[] = [];
  private readonly accountStats: Map<string, ServiceAccountStats> = new Map();

  constructor(options: ServiceAccountAuditorOptions = {}) {
    this.options = {
      maxEvents: options.maxEvents ?? 10000,
      enableFileLogging: options.enableFileLogging ?? true,
      enableStatistics: options.enableStatistics ?? true,
    };

    logger.info('Service account auditor initialized', {
      maxEvents: this.options.maxEvents,
      fileLogging: this.options.enableFileLogging,
      statistics: this.options.enableStatistics,
    });
  }

  /**
   * Log an account access event
   */
  logAccountAccess(
    claims: TokenClaims,
    serviceAccountId: string,
    serviceAccountName?: string,
    environment?: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: ServiceAccountAuditEvent = {
      timestamp: new Date(),
      eventType: AuditEventType.ACCOUNT_ACCESSED,
      userId: claims.sub,
      userGroups: claims.groups as string[] | undefined,
      issuer: claims.iss,
      serviceAccountId,
      serviceAccountName,
      environment,
      success: true,
      metadata,
    };

    this.recordEvent(event);
    this.updateStatistics(event);
  }

  /**
   * Log an account access denial
   */
  logAccountAccessDenied(
    claims: TokenClaims,
    serviceAccountId: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: ServiceAccountAuditEvent = {
      timestamp: new Date(),
      eventType: AuditEventType.ACCOUNT_ACCESS_DENIED,
      userId: claims.sub,
      userGroups: claims.groups as string[] | undefined,
      issuer: claims.iss,
      serviceAccountId,
      success: false,
      error: reason,
      metadata,
    };

    this.recordEvent(event);
    this.updateStatistics(event);
  }

  /**
   * Log a service account failure
   */
  logAccountFailure(
    serviceAccountId: string,
    serviceAccountName: string,
    error: string,
    userId?: string
  ): void {
    const event: ServiceAccountAuditEvent = {
      timestamp: new Date(),
      eventType: AuditEventType.ACCOUNT_FAILED,
      userId,
      serviceAccountId,
      serviceAccountName,
      success: false,
      error,
    };

    this.recordEvent(event);
    this.updateStatistics(event);
  }

  /**
   * Log a failover event
   */
  logFailover(fromAccountId: string, toAccountId: string, reason: string, userId?: string): void {
    const event: ServiceAccountAuditEvent = {
      timestamp: new Date(),
      eventType: AuditEventType.ACCOUNT_FAILOVER,
      userId,
      serviceAccountId: fromAccountId,
      success: true,
      metadata: {
        failoverTo: toAccountId,
        reason,
      },
    };

    this.recordEvent(event);
  }

  /**
   * Log a health check result
   */
  logHealthCheck(
    serviceAccountId: string,
    serviceAccountName: string,
    success: boolean,
    latency?: number,
    error?: string
  ): void {
    const event: ServiceAccountAuditEvent = {
      timestamp: new Date(),
      eventType: success ? AuditEventType.HEALTH_CHECK_PASSED : AuditEventType.HEALTH_CHECK_FAILED,
      serviceAccountId,
      serviceAccountName,
      success,
      error,
      metadata: latency ? { latency } : undefined,
    };

    this.recordEvent(event);
  }

  /**
   * Log a configuration change
   */
  logConfigurationChange(
    changeType: 'added' | 'updated' | 'removed',
    serviceAccountId: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: ServiceAccountAuditEvent = {
      timestamp: new Date(),
      eventType: AuditEventType.CONFIGURATION_CHANGED,
      serviceAccountId,
      success: true,
      metadata: {
        changeType,
        ...metadata,
      },
    };

    this.recordEvent(event);
  }

  /**
   * Get audit events for a specific service account
   */
  getAccountEvents(serviceAccountId: string, limit?: number): ServiceAccountAuditEvent[] {
    const events = this.auditEvents.filter((event) => event.serviceAccountId === serviceAccountId);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get audit events for a specific user
   */
  getUserEvents(userId: string, limit?: number): ServiceAccountAuditEvent[] {
    const events = this.auditEvents.filter((event) => event.userId === userId);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get all audit events
   */
  getAllEvents(limit?: number): ServiceAccountAuditEvent[] {
    return limit ? this.auditEvents.slice(-limit) : [...this.auditEvents];
  }

  /**
   * Get statistics for a specific service account
   */
  getAccountStatistics(serviceAccountId: string): ServiceAccountStats | undefined {
    return this.accountStats.get(serviceAccountId);
  }

  /**
   * Get statistics for all service accounts
   */
  getAllStatistics(): Map<string, ServiceAccountStats> {
    return new Map(this.accountStats);
  }

  /**
   * Identify anomalous usage patterns
   */
  detectAnomalies(): Array<{
    accountId: string;
    type: 'high_failure_rate' | 'unusual_access_pattern' | 'excessive_usage';
    description: string;
  }> {
    const anomalies: Array<{
      accountId: string;
      type: 'high_failure_rate' | 'unusual_access_pattern' | 'excessive_usage';
      description: string;
    }> = [];

    for (const [accountId, stats] of this.accountStats) {
      // High failure rate
      if (stats.failureRate > 0.3 && stats.totalAccesses > 10) {
        anomalies.push({
          accountId,
          type: 'high_failure_rate',
          description: `Failure rate of ${(stats.failureRate * 100).toFixed(1)}% detected`,
        });
      }

      // Excessive usage by single user
      const recentEvents = this.getAccountEvents(accountId, 100);
      const userCounts = new Map<string, number>();
      for (const event of recentEvents) {
        if (event.userId) {
          userCounts.set(event.userId, (userCounts.get(event.userId) ?? 0) + 1);
        }
      }
      for (const [userId, count] of userCounts) {
        if (count > recentEvents.length * 0.7) {
          anomalies.push({
            accountId,
            type: 'excessive_usage',
            description: `User ${userId} accounts for ${((count / recentEvents.length) * 100).toFixed(1)}% of recent accesses`,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Clear old audit events
   */
  pruneOldEvents(maxAge: Date): number {
    const initialCount = this.auditEvents.length;
    const cutoffTime = maxAge.getTime();

    // Remove events older than maxAge
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.auditEvents.length; readIndex++) {
      if (this.auditEvents[readIndex].timestamp.getTime() >= cutoffTime) {
        if (readIndex !== writeIndex) {
          this.auditEvents[writeIndex] = this.auditEvents[readIndex];
        }
        writeIndex++;
      }
    }
    this.auditEvents.length = writeIndex;

    const removedCount = initialCount - this.auditEvents.length;
    if (removedCount > 0) {
      logger.info('Pruned old audit events', {
        removedCount,
        remainingCount: this.auditEvents.length,
      });
    }

    return removedCount;
  }

  /**
   * Record an audit event
   */
  private recordEvent(event: ServiceAccountAuditEvent): void {
    // Add to in-memory storage
    this.auditEvents.push(event);

    // Maintain max events limit
    if (this.auditEvents.length > this.options.maxEvents) {
      this.auditEvents.shift();
    }

    // Log to file if enabled
    if (this.options.enableFileLogging) {
      const logLevel = event.success ? 'info' : 'warn';
      logger[logLevel]('Service account audit event', {
        eventType: event.eventType,
        userId: event.userId,
        serviceAccountId: event.serviceAccountId,
        success: event.success,
        error: event.error,
        metadata: event.metadata,
      });
    }
  }

  /**
   * Update statistics for an account
   */
  private updateStatistics(event: ServiceAccountAuditEvent): void {
    if (!this.options.enableStatistics) {
      return;
    }

    let stats = this.accountStats.get(event.serviceAccountId);
    if (!stats) {
      stats = {
        accountId: event.serviceAccountId,
        totalAccesses: 0,
        successfulAccesses: 0,
        failedAccesses: 0,
        uniqueUsers: new Set(),
        failureRate: 0,
      };
      this.accountStats.set(event.serviceAccountId, stats);
    }

    // Update counters
    if (
      event.eventType === AuditEventType.ACCOUNT_ACCESSED ||
      event.eventType === AuditEventType.ACCOUNT_ACCESS_DENIED
    ) {
      stats.totalAccesses++;
      if (event.success) {
        stats.successfulAccesses++;
      } else {
        stats.failedAccesses++;
      }
      stats.lastAccessTime = event.timestamp;
      if (event.userId) {
        stats.uniqueUsers.add(event.userId);
      }

      // Calculate failure rate
      stats.failureRate = stats.totalAccesses > 0 ? stats.failedAccesses / stats.totalAccesses : 0;
    }
  }
}
