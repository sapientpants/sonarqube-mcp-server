/**
 * Shared types for service account functionality
 * This file contains types that are used across multiple service account modules
 * to avoid circular dependencies.
 */

/**
 * Service account configuration
 */
export interface ServiceAccount {
  /** Unique identifier for the service account */
  id: string;
  /** Display name for the service account */
  name: string;
  /** SonarQube API token */
  token: string;
  /** Optional SonarQube URL (overrides default) */
  url?: string;
  /** Optional organization (for SonarCloud) */
  organization?: string;
  /** Allowed scopes for this service account */
  allowedScopes?: string[];
  /** Team or environment this account is for (e.g., 'dev-team', 'prod') */
  environment?: string;
  /** Whether this account is marked as healthy */
  isHealthy?: boolean;
  /** Last health check timestamp */
  lastHealthCheck?: Date;
  /** Number of consecutive failures */
  consecutiveFailures?: number;
  /** Failure count (alternative property name for backward compatibility) */
  failureCount?: number;
  /** Fallback service account ID to use if this account fails */
  fallbackAccountId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Health check result for a service account
 */
export interface HealthCheckResult {
  /** Service account ID */
  accountId: string;
  /** Whether the account is healthy */
  isHealthy: boolean;
  /** Last check timestamp */
  lastCheck: Date;
  /** Response latency in milliseconds */
  latency?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Number of consecutive failures */
  consecutiveFailures?: number;
}
