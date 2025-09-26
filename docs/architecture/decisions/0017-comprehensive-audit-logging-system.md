# 17. Comprehensive Audit Logging System

Date: 2025-06-25

## Status

Accepted

## Context

The SonarQube MCP Server needs comprehensive audit logging to meet enterprise compliance requirements including SOC 2 Type II, ISO 27001, and GDPR. The system must log all security-relevant events including authentication attempts, tool invocations, permission checks, and configuration changes while protecting sensitive data and ensuring log integrity.

Current logging infrastructure:

- File-based logging system (to avoid STDIO conflicts with MCP protocol)
- Service account auditor for tracking account usage
- Basic error and debug logging

Requirements:

- Structured JSON audit logs with all required fields
- Log all authentication attempts (success and failure)
- Log all tool invocations with parameters
- Log permission checks and denials
- Configurable log retention policies
- Log shipping to SIEM systems
- PII redaction capabilities
- Audit log integrity protection

## Decision

We will implement a comprehensive audit logging system that builds on the existing logging infrastructure with the following components:

### 1. Audit Logger Service

A dedicated service for handling audit events that:

- Extends the existing logger utility
- Provides structured JSON logging format
- Implements PII redaction
- Ensures log integrity with checksums
- Manages log rotation and retention

### 2. Audit Event Schema

Standardized schema for all audit events:

```typescript
interface AuditEvent {
  // Core fields
  timestamp: string; // ISO 8601 format
  eventId: string; // Unique event identifier
  eventType: AuditEventType; // Enumerated event types
  eventCategory: AuditEventCategory; // auth, access, config, etc.

  // Actor information
  actor: {
    userId: string;
    userGroups?: string[];
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };

  // Target information
  target: {
    type: string; // tool, project, issue, etc.
    id: string; // Resource identifier
    name?: string; // Human-readable name
  };

  // Action details
  action: {
    type: string; // read, write, delete, etc.
    parameters?: Record<string, unknown>;
    result: 'success' | 'failure' | 'partial';
    error?: string;
  };

  // Context
  context: {
    serviceAccount?: string;
    sonarqubeUrl?: string;
    environment?: string;
    traceId?: string; // For request correlation
  };

  // Security metadata
  security: {
    tokenAud?: string;
    tokenIss?: string;
    tokenJti?: string;
    tlsVersion?: string;
    permissionChecks?: Array<{
      permission: string;
      result: boolean;
      reason?: string;
    }>;
  };

  // Compliance fields
  compliance: {
    dataClassification?: string;
    piiRedacted?: boolean;
    retentionPeriod?: number;
  };

  // Integrity
  checksum?: string; // SHA-256 of event content
}
```

### 3. Event Types

Comprehensive event types covering all security-relevant actions:

- Authentication: login, logout, token validation, MFA events
- Authorization: permission checks, access grants/denials
- Tool invocation: all MCP tool calls with parameters
- Data access: project/issue/component queries
- Configuration: service account changes, permission updates
- System: health checks, errors, maintenance

### 4. PII Redaction

Automatic redaction of sensitive data:

- Email addresses (except domain)
- IP addresses (configurable)
- User names in free-text fields
- Custom patterns via configuration

### 5. Log Storage and Rotation

- Separate audit log files from application logs
- Daily rotation with compression
- Configurable retention periods
- Archive to cold storage after retention period

### 6. SIEM Integration

- JSON format compatible with major SIEM systems
- Syslog forwarding support
- Webhook delivery for real-time streaming
- Batch export for bulk ingestion

### 7. Integrity Protection

- SHA-256 checksums for each event
- Optional HMAC signing with rotating keys
- Tamper detection on log files
- Chain of custody documentation

## Consequences

### Positive

- Full compliance with SOC 2, ISO 27001, and GDPR requirements
- Complete audit trail for security investigations
- Ability to detect and investigate security incidents
- Support for compliance reporting and audits
- Integration with enterprise security tools
- Protection of sensitive user data

### Negative

- Increased storage requirements for audit logs
- Performance overhead for logging and checksumming
- Complexity in managing log retention and rotation
- Additional configuration for SIEM integration
- Potential for log files to contain sensitive data if redaction fails

### Implementation Notes

1. Build on existing `logger.ts` utility
2. Extend `service-account-auditor.ts` for broader audit coverage
3. Add audit hooks to permission wrapper and handlers
4. Implement as middleware for HTTP transport
5. Create separate audit log directory structure
6. Add configuration for retention, redaction, and SIEM
7. Ensure all audit logging is async and non-blocking
