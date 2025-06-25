import { createHash, createHmac } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger.js';
import {
  AuditEventType,
  AuditEventCategory,
  type AuditEvent,
  type AuditConfig,
  type IAuditLogger,
  type AuditEventFilters,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('AuditLogger');

/**
 * Default configuration for audit logging
 */
const DEFAULT_CONFIG: Required<AuditConfig> = {
  auditLogPath: process.env.AUDIT_LOG_PATH ?? './logs/audit',
  separateAuditLog: true,
  maxFileSizeMB: 100,
  maxFiles: 30,
  retentionDays: 90,
  archivePath: './logs/audit/archive',
  compressArchives: true,
  redactPII: true,
  redactPatterns: [],
  redactIPAddresses: false,
  preserveDomains: true,
  enableChecksums: true,
  enableHMAC: false,
  hmacSecret: '',
  syslogHost: '',
  syslogPort: 514,
  syslogProtocol: 'udp',
  webhookUrl: '',
  webhookHeaders: {},
  batchSize: 100,
  flushIntervalMs: 5000,
  asyncLogging: true,
  bufferSize: 1000,
  compressionLevel: 6,
};

/**
 * PII redaction patterns
 */
const PII_PATTERNS = {
  email: /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ipv6: /\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
  ssn: /\b(?:\d{3}-\d{2}-\d{4}|\d{9})\b/g,
};

/**
 * Comprehensive audit logger implementation
 */
export class AuditLogger implements IAuditLogger {
  private readonly config: Required<AuditConfig>;
  private buffer: AuditEvent[] = [];
  private currentLogFile?: string;
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: AuditConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the audit logger
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Use singleton initialization promise
    if (!this.initializationPromise) {
      this.initializationPromise = this.performInitialization();
    }

    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      // Create audit log directory
      await fs.mkdir(this.config.auditLogPath, { recursive: true });
      await fs.mkdir(this.config.archivePath, { recursive: true });

      // Set up current log file
      this.currentLogFile = await this.getCurrentLogFile();

      // Start flush timer if async logging is enabled
      if (this.config.asyncLogging) {
        this.startFlushTimer();
      }

      this.isInitialized = true;
      logger.info('Audit logger initialized', {
        auditLogPath: this.config.auditLogPath,
        asyncLogging: this.config.asyncLogging,
        redactPII: this.config.redactPII,
      });
    } catch (error) {
      logger.error('Failed to initialize audit logger', { error });
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'eventId' | 'timestamp' | 'checksum'>): Promise<void> {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Create complete event
      const completeEvent: AuditEvent = {
        ...event,
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
      };

      // Redact PII if enabled
      if (this.config.redactPII) {
        completeEvent.action.parameters = this.redactPII(completeEvent.action.parameters) as
          | Record<string, unknown>
          | undefined;
        completeEvent.compliance.piiRedacted = true;
      }

      // Calculate checksum
      if (this.config.enableChecksums) {
        completeEvent.checksum = this.calculateChecksum(completeEvent);
      }

      // Add to buffer or write immediately
      if (this.config.asyncLogging) {
        this.buffer.push(completeEvent);
        if (this.buffer.length >= this.config.bufferSize) {
          await this.flush();
        }
      } else {
        await this.writeEvent(completeEvent);
      }

      // Send to SIEM if configured
      if (this.config.webhookUrl || this.config.syslogHost) {
        this.sendToSIEM([completeEvent]).catch((error) => {
          logger.error('Failed to send event to SIEM', { error, eventId: completeEvent.eventId });
        });
      }
    } catch (error) {
      logger.error('Failed to log audit event', { error, event });
      throw error;
    }
  }

  /**
   * Get audit events based on filters
   */
  async getEvents(filters: AuditEventFilters): Promise<AuditEvent[]> {
    try {
      const files = await this.getAuditFiles();
      const events: AuditEvent[] = [];

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          if (!line) continue;

          try {
            const event = JSON.parse(line) as AuditEvent;
            if (this.matchesFilters(event, filters)) {
              events.push(event);
            }
          } catch (error) {
            logger.warn('Failed to parse audit event', { error, line });
          }
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      // Apply limit and offset
      const start = filters.offset ?? 0;
      const end = filters.limit ? start + filters.limit : undefined;
      return events.slice(start, end);
    } catch (error) {
      logger.error('Failed to get audit events', { error, filters });
      throw error;
    }
  }

  /**
   * Rotate the current log file
   */
  async rotateLog(): Promise<void> {
    try {
      await this.flush();

      if (!this.currentLogFile || !(await this.fileExists(this.currentLogFile))) {
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveFile = join(this.config.archivePath, `audit-${timestamp}.log`);

      await fs.rename(this.currentLogFile, archiveFile);

      if (this.config.compressArchives) {
        // Compression will be implemented in a future release
        logger.info('Log compression not yet implemented');
      }

      this.currentLogFile = await this.getCurrentLogFile();
      logger.info('Audit log rotated', { archiveFile });
    } catch (error) {
      logger.error('Failed to rotate audit log', { error });
      throw error;
    }
  }

  /**
   * Prune old audit events based on retention policy
   */
  async pruneOldEvents(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const files = await this.getAuditFiles();
      let prunedCount = 0;

      for (const file of files) {
        const stat = await fs.stat(file);
        if (stat.mtime < cutoffDate) {
          await fs.unlink(file);
          prunedCount++;
          logger.info('Pruned old audit file', { file, age: stat.mtime });
        }
      }

      return prunedCount;
    } catch (error) {
      logger.error('Failed to prune old events', { error });
      throw error;
    }
  }

  /**
   * Export events to SIEM
   */
  async exportToSIEM(events: AuditEvent[]): Promise<void> {
    await this.sendToSIEM(events);
  }

  /**
   * Write an event to the log file
   */
  private async writeEvent(event: AuditEvent): Promise<void> {
    if (!this.currentLogFile) {
      throw new Error('No current log file');
    }

    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(this.currentLogFile, line, 'utf-8');
  }

  /**
   * Flush buffered events to disk
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    await Promise.all(events.map((event) => this.writeEvent(event)));
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        logger.error('Failed to flush audit buffer', { error });
      });
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop the flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get the current log file path
   */
  private async getCurrentLogFile(): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    return join(this.config.auditLogPath, `audit-${date}.log`);
  }

  /**
   * Get all audit files
   */
  private async getAuditFiles(): Promise<string[]> {
    const files: string[] = [];

    // Current logs
    const currentFiles = await fs.readdir(this.config.auditLogPath);
    for (const file of currentFiles) {
      if (file.startsWith('audit-') && file.endsWith('.log')) {
        files.push(join(this.config.auditLogPath, file));
      }
    }

    // Archived logs
    try {
      const archiveFiles = await fs.readdir(this.config.archivePath);
      for (const file of archiveFiles) {
        if (file.startsWith('audit-') && file.endsWith('.log')) {
          files.push(join(this.config.archivePath, file));
        }
      }
    } catch {
      // Archive directory might not exist
    }

    return files.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Check if event matches filters
   */
  private matchesFilters(event: AuditEvent, filters: AuditEventFilters): boolean {
    const checks = [
      () => !filters.startTime || new Date(event.timestamp) >= filters.startTime,
      () => !filters.endTime || new Date(event.timestamp) <= filters.endTime,
      () => !filters.eventTypes || filters.eventTypes.includes(event.eventType),
      () => !filters.eventCategories || filters.eventCategories.includes(event.eventCategory),
      () => !filters.userId || event.actor.userId === filters.userId,
      () => !filters.sessionId || event.actor.sessionId === filters.sessionId,
      () => !filters.targetType || event.target.type === filters.targetType,
      () => !filters.targetId || event.target.id === filters.targetId,
      () => !filters.result || event.action.result === filters.result,
    ];

    return checks.every((check) => check());
  }

  /**
   * Calculate checksum for an event
   */
  private calculateChecksum(event: Omit<AuditEvent, 'checksum'>): string {
    const content = JSON.stringify({
      ...event,
      checksum: undefined,
    });

    if (this.config.enableHMAC && this.config.hmacSecret) {
      return createHmac('sha256', this.config.hmacSecret).update(content).digest('hex');
    } else {
      return createHash('sha256').update(content).digest('hex');
    }
  }

  /**
   * Redact PII from data
   */
  private redactPII(data: unknown): unknown {
    if (!data) return data;

    if (typeof data === 'string') {
      let redacted = data;

      // Redact emails (preserve domain if configured)
      redacted = redacted.replace(PII_PATTERNS.email, (match, username, domain) => {
        return this.config.preserveDomains ? `***@${domain}` : '***@***.***';
      });

      // Redact IP addresses if configured
      if (this.config.redactIPAddresses) {
        redacted = redacted.replace(PII_PATTERNS.ipv4, '***.***.***.***');
        redacted = redacted.replace(PII_PATTERNS.ipv6, '****:****:****:****');
      }

      // Redact credit cards and SSNs
      redacted = redacted.replace(PII_PATTERNS.creditCard, '****-****-****-****');
      redacted = redacted.replace(PII_PATTERNS.ssn, '***-**-****');

      // Apply custom patterns
      for (const pattern of this.config.redactPatterns) {
        redacted = redacted.replace(pattern, '***');
      }

      return redacted;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactPII(item));
    }

    if (typeof data === 'object' && data !== null) {
      const redacted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        redacted[key] = this.redactPII(value);
      }
      return redacted;
    }

    return data;
  }

  /**
   * Send events to SIEM
   */
  private async sendToSIEM(events: AuditEvent[]): Promise<void> {
    // SIEM integration foundation - implementation pending
    // Future features: Syslog forwarding, Webhook delivery, Batch processing
    logger.debug('SIEM integration not yet implemented', { eventCount: events.length });
  }

  /**
   * Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }
}

// Export singleton instance
let auditLogger: AuditLogger | undefined;

export function getAuditLogger(config?: AuditConfig): AuditLogger {
  if (!auditLogger) {
    auditLogger = new AuditLogger(config);
    // Trigger initialization immediately
    auditLogger
      .logEvent({
        eventType: AuditEventType.SYSTEM_STARTED,
        eventCategory: AuditEventCategory.SYSTEM,
        actor: { userId: 'system' },
        target: { type: 'system', id: 'audit-logger' },
        action: { type: 'start', result: 'success' },
        context: {},
        security: {},
        compliance: {},
      })
      .catch((error) => {
        logger.error('Failed to initialize audit logger', { error });
      });
  }
  return auditLogger;
}
