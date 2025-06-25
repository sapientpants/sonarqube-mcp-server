import { createLogger } from '../utils/logger.js';
import { JWKSClient } from './jwks-client.js';
import { ExternalIdPConfig, IdPHealthStatus, PROVIDER_DEFAULTS } from './external-idp-types.js';
import { TokenClaims } from './types.js';

const logger = createLogger('ExternalIdPManager');

/**
 * Manages multiple external identity providers
 */
export class ExternalIdPManager {
  private readonly idps = new Map<string, ExternalIdPConfig>();
  private readonly healthStatus = new Map<string, IdPHealthStatus>();
  private readonly jwksClient: JWKSClient;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly healthCheckIntervalMs: number;

  constructor(
    options: {
      jwksClient?: JWKSClient;
      healthCheckInterval?: number;
    } = {}
  ) {
    this.jwksClient = options.jwksClient ?? new JWKSClient();
    this.healthCheckIntervalMs = options.healthCheckInterval ?? 300000; // 5 minutes default
  }

  /**
   * Add an external IdP configuration
   */
  addIdP(config: ExternalIdPConfig): void {
    // Apply provider defaults
    const defaults = PROVIDER_DEFAULTS[config.provider];
    const mergedConfig = { ...defaults, ...config };

    logger.info('Adding external IdP', {
      issuer: mergedConfig.issuer,
      provider: mergedConfig.provider,
    });

    this.idps.set(mergedConfig.issuer, mergedConfig);

    // Initialize health status
    this.healthStatus.set(mergedConfig.issuer, {
      issuer: mergedConfig.issuer,
      healthy: true, // Assume healthy initially
      consecutiveFailures: 0,
    });

    // Start health monitoring if enabled
    if (mergedConfig.enableHealthMonitoring && !this.healthCheckInterval) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Remove an external IdP
   */
  removeIdP(issuer: string): void {
    logger.info('Removing external IdP', { issuer });

    this.idps.delete(issuer);
    this.healthStatus.delete(issuer);

    // Stop health monitoring if no IdPs have it enabled
    if (this.healthCheckInterval && !this.hasHealthMonitoringEnabled()) {
      this.stopHealthMonitoring();
    }
  }

  /**
   * Get all configured IdPs
   */
  getIdPs(): ExternalIdPConfig[] {
    return Array.from(this.idps.values());
  }

  /**
   * Get IdP configuration by issuer
   */
  getIdP(issuer: string): ExternalIdPConfig | undefined {
    return this.idps.get(issuer);
  }

  /**
   * Get public key for a specific issuer
   */
  async getPublicKey(issuer: string, kid?: string): Promise<string> {
    const idp = this.idps.get(issuer);
    if (!idp) {
      throw new Error(`No IdP configured for issuer: ${issuer}`);
    }

    try {
      const key = await this.jwksClient.getKey(issuer, kid, idp.jwksUri);

      // Update health status on success
      const status = this.healthStatus.get(issuer);
      if (status) {
        status.healthy = true;
        status.lastSuccess = new Date();
        status.consecutiveFailures = 0;
        delete status.error;
      }

      return key;
    } catch (error) {
      // Update health status on failure
      const status = this.healthStatus.get(issuer);
      if (status) {
        status.healthy = false;
        status.lastFailure = new Date();
        status.consecutiveFailures++;
        status.error = error instanceof Error ? error.message : 'Unknown error';
      }

      throw error;
    }
  }

  /**
   * Extract and transform claims based on IdP configuration
   */
  extractClaims(issuer: string, claims: TokenClaims): TokenClaims {
    const idp = this.idps.get(issuer);
    if (!idp) {
      return claims;
    }

    // Deep clone the claims object to avoid mutations
    const extractedClaims = { ...claims };

    // Extract groups if configured
    if (idp.groupsClaim && extractedClaims[idp.groupsClaim]) {
      const groups = extractedClaims[idp.groupsClaim];

      // Apply transformation if needed
      if (idp.groupsTransform && idp.groupsTransform !== 'none' && Array.isArray(groups)) {
        extractedClaims.groups = groups.map((group) =>
          this.transformGroup(group, idp.groupsTransform!)
        );
      } else {
        // Clone arrays to avoid mutations
        extractedClaims.groups = Array.isArray(groups) ? [...groups] : groups;
      }
    }

    // Add provider-specific claims
    extractedClaims.idp_provider = idp.provider;
    if (idp.tenantId) {
      extractedClaims.idp_tenant = idp.tenantId;
    }

    return extractedClaims;
  }

  /**
   * Transform a group value based on the configured transformation
   */
  private transformGroup(group: unknown, transform: string): string {
    if (typeof group !== 'string') {
      return String(group);
    }

    switch (transform) {
      case 'extract_name': {
        // Extract name from DN format (e.g., "cn=admins,ou=groups,dc=example,dc=com" -> "admins")
        const nameMatch = /cn=([^,]+)/i.exec(group);
        return nameMatch ? nameMatch[1] : group;
      }

      case 'extract_id': {
        // Extract last segment from path-like format (e.g., "/groups/123/admins" -> "admins")
        const segments = group.split('/').filter(Boolean);
        return segments[segments.length - 1] ?? group;
      }

      default:
        return group;
    }
  }

  /**
   * Get health status for all IdPs
   */
  getHealthStatus(): IdPHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get health status for a specific IdP
   */
  getIdPHealthStatus(issuer: string): IdPHealthStatus | undefined {
    return this.healthStatus.get(issuer);
  }

  /**
   * Check if any IdP has health monitoring enabled
   */
  private hasHealthMonitoringEnabled(): boolean {
    return Array.from(this.idps.values()).some((idp) => idp.enableHealthMonitoring);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    logger.info('Starting IdP health monitoring', {
      interval: this.healthCheckIntervalMs,
    });

    // Run initial health check
    this.runHealthChecks().catch((error) => {
      logger.error('Health check failed', error);
    });

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks().catch((error) => {
        logger.error('Health check failed', error);
      });
    }, this.healthCheckIntervalMs);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      logger.info('Stopping IdP health monitoring');
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Run health checks for all IdPs with monitoring enabled
   */
  private async runHealthChecks(): Promise<void> {
    const checks = Array.from(this.idps.entries())
      .filter(([, idp]) => idp.enableHealthMonitoring)
      .map(async ([issuer, idp]) => {
        try {
          // Try to fetch JWKS to verify IdP is accessible
          await this.jwksClient.getKey(issuer, undefined, idp.jwksUri);

          const status = this.healthStatus.get(issuer);
          if (status) {
            status.healthy = true;
            status.lastSuccess = new Date();
            status.consecutiveFailures = 0;
            delete status.error;
          }
        } catch (error) {
          const status = this.healthStatus.get(issuer);
          if (status) {
            status.healthy = false;
            status.lastFailure = new Date();
            status.consecutiveFailures++;
            status.error = error instanceof Error ? error.message : 'Unknown error';
          }

          logger.warn('IdP health check failed', {
            issuer,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

    await Promise.all(checks);
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    this.stopHealthMonitoring();
    this.idps.clear();
    this.healthStatus.clear();
    this.jwksClient.clearCache();
  }
}
