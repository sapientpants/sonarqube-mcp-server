/**
 * Audit event types and interfaces for comprehensive audit logging
 */

/**
 * Event types covering all security-relevant actions
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_TOKEN_VALIDATED = 'AUTH_TOKEN_VALIDATED',
  AUTH_TOKEN_REJECTED = 'AUTH_TOKEN_REJECTED',
  AUTH_MFA_REQUIRED = 'AUTH_MFA_REQUIRED',
  AUTH_MFA_COMPLETED = 'AUTH_MFA_COMPLETED',

  // Authorization events
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',

  // Tool invocation events
  TOOL_INVOKED = 'TOOL_INVOKED',
  TOOL_COMPLETED = 'TOOL_COMPLETED',
  TOOL_FAILED = 'TOOL_FAILED',

  // Data access events
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_FILTERED = 'DATA_FILTERED',
  DATA_EXPORTED = 'DATA_EXPORTED',

  // Configuration events
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  SERVICE_ACCOUNT_ADDED = 'SERVICE_ACCOUNT_ADDED',
  SERVICE_ACCOUNT_UPDATED = 'SERVICE_ACCOUNT_UPDATED',
  SERVICE_ACCOUNT_REMOVED = 'SERVICE_ACCOUNT_REMOVED',
  PERMISSION_RULE_CHANGED = 'PERMISSION_RULE_CHANGED',

  // System events
  SYSTEM_STARTED = 'SYSTEM_STARTED',
  SYSTEM_STOPPED = 'SYSTEM_STOPPED',
  HEALTH_CHECK_PERFORMED = 'HEALTH_CHECK_PERFORMED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  MAINTENANCE_MODE_CHANGED = 'MAINTENANCE_MODE_CHANGED',
}

/**
 * Event categories for grouping related events
 */
export enum AuditEventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  TOOL_ACCESS = 'tool_access',
  DATA_ACCESS = 'data_access',
  CONFIGURATION = 'configuration',
  SYSTEM = 'system',
}

/**
 * Actor information for audit events
 */
export interface AuditActor {
  userId: string;
  userGroups?: string[];
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Target resource information
 */
export interface AuditTarget {
  type: string; // tool, project, issue, component, etc.
  id: string; // Resource identifier
  name?: string; // Human-readable name
}

/**
 * Action details
 */
export interface AuditAction {
  type: string; // read, write, delete, execute, etc.
  parameters?: Record<string, unknown>;
  result: 'success' | 'failure' | 'partial';
  error?: string;
  duration?: number; // Duration in milliseconds
}

/**
 * Context information
 */
export interface AuditContext {
  serviceAccount?: string;
  sonarqubeUrl?: string;
  environment?: string;
  traceId?: string; // For request correlation
  parentEventId?: string; // For linking related events
  sessionId?: string; // Session identifier
}

/**
 * Security metadata
 */
export interface AuditSecurity {
  tokenAud?: string;
  tokenIss?: string;
  tokenJti?: string;
  tlsVersion?: string;
  permissionChecks?: Array<{
    permission: string;
    result: boolean;
    reason?: string;
  }>;
}

/**
 * Compliance fields
 */
export interface AuditCompliance {
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  piiRedacted?: boolean;
  retentionPeriod?: number; // Days
  regulatoryRequirements?: string[]; // SOC2, ISO27001, GDPR, etc.
}

/**
 * Complete audit event structure
 */
export interface AuditEvent {
  // Core fields
  timestamp: string; // ISO 8601 format
  eventId: string; // Unique event identifier (UUID)
  eventType: AuditEventType;
  eventCategory: AuditEventCategory;

  // Actor information
  actor: AuditActor;

  // Target information
  target: AuditTarget;

  // Action details
  action: AuditAction;

  // Context
  context: AuditContext;

  // Security metadata
  security: AuditSecurity;

  // Compliance fields
  compliance: AuditCompliance;

  // Integrity
  checksum?: string; // SHA-256 of event content
}

/**
 * Configuration for audit logging
 */
export interface AuditConfig {
  // Storage
  auditLogPath?: string;
  separateAuditLog?: boolean;
  maxFileSizeMB?: number;
  maxFiles?: number;

  // Retention
  retentionDays?: number;
  archivePath?: string;
  compressArchives?: boolean;

  // PII Redaction
  redactPII?: boolean;
  redactPatterns?: RegExp[];
  redactIPAddresses?: boolean;
  preserveDomains?: boolean;

  // Integrity
  enableChecksums?: boolean;
  enableHMAC?: boolean;
  hmacSecret?: string;

  // SIEM Integration
  syslogHost?: string;
  syslogPort?: number;
  syslogProtocol?: 'udp' | 'tcp' | 'tls';
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
  batchSize?: number;
  flushIntervalMs?: number;

  // Performance
  asyncLogging?: boolean;
  bufferSize?: number;
  compressionLevel?: number;
}

/**
 * Audit logger interface
 */
export interface IAuditLogger {
  logEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp' | 'checksum'>): Promise<void>;
  getEvents(filters: AuditEventFilters): Promise<AuditEvent[]>;
  rotateLog(): Promise<void>;
  pruneOldEvents(): Promise<number>;
  exportToSIEM(events: AuditEvent[]): Promise<void>;
}

/**
 * Filters for querying audit events
 */
export interface AuditEventFilters {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: AuditEventType[];
  eventCategories?: AuditEventCategory[];
  userId?: string;
  sessionId?: string;
  targetType?: string;
  targetId?: string;
  result?: 'success' | 'failure' | 'partial';
  limit?: number;
  offset?: number;
}

/**
 * Statistics for audit events
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsByResult: {
    success: number;
    failure: number;
    partial: number;
  };
  averageDuration: Record<string, number>;
  topFailures: Array<{
    eventType: string;
    count: number;
    lastOccurrence: Date;
  }>;
}
