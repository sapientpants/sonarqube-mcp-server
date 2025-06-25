import { createLogger } from '../utils/logger.js';
import {
  ExternalIdPConfig,
  IdPHealthStatus,
  PROVIDER_DEFAULTS,
  ExternalIdPError,
  ExternalIdPErrorCode,
} from './external-idp-types.js';
import { JWKSClient, JWKSClientOptions } from './jwks-client.js';
import { TokenClaims } from './token-validator.js';

const logger = createLogger('ExternalIdPManager');

/**
 * Options for External IdP Manager
 */
export interface ExternalIdPManagerOptions {
  /**
   * JWKS client options
   */
  jwksClientOptions?: JWKSClientOptions;

  /**
   * Default health check interval in milliseconds
   */
  defaultHealthCheckInterval?: number;

  /**
   * Whether to start health monitoring automatically
   */
  autoStartHealthMonitoring?: boolean;
}

/**
 * Manages multiple external identity providers
 */
export class ExternalIdPManager {
  private readonly idpConfigs = new Map<string, ExternalIdPConfig>();
  private readonly jwksClient: JWKSClient;
  private readonly healthStatuses = new Map<string, IdPHealthStatus>();
  private readonly healthCheckTimers = new Map<string, NodeJS.Timeout>();
  private readonly options: Required<ExternalIdPManagerOptions>;

  constructor(options: ExternalIdPManagerOptions = {}) {
    this.options = {
      jwksClientOptions: options.jwksClientOptions ?? {},
      defaultHealthCheckInterval: options.defaultHealthCheckInterval ?? 300000, // 5 minutes
      autoStartHealthMonitoring: options.autoStartHealthMonitoring ?? true,
    };

    this.jwksClient = new JWKSClient(this.options.jwksClientOptions);
  }

  /**
   * Add an external IdP configuration
   */
  addIdP(config: ExternalIdPConfig): void {
    // Apply provider defaults
    const fullConfig = this.applyProviderDefaults(config);

    // Validate configuration
    this.validateIdPConfig(fullConfig);

    // Store configuration
    this.idpConfigs.set(fullConfig.issuer, fullConfig);

    // Initialize health status
    this.healthStatuses.set(fullConfig.issuer, {
      issuer: fullConfig.issuer,
      provider: fullConfig.provider,
      isHealthy: false,
    });

    // Start health monitoring if enabled
    if (fullConfig.enableHealthMonitoring && this.options.autoStartHealthMonitoring) {
      this.startHealthMonitoring(fullConfig.issuer);
    }

    logger.info('Added external IdP', {
      issuer: fullConfig.issuer,
      provider: fullConfig.provider,
    });
  }

  /**
   * Remove an external IdP
   */
  removeIdP(issuer: string): void {
    this.idpConfigs.delete(issuer);
    this.healthStatuses.delete(issuer);

    // Stop health monitoring
    const timer = this.healthCheckTimers.get(issuer);
    if (timer) {
      clearInterval(timer as NodeJS.Timeout);
      this.healthCheckTimers.delete(issuer);
    }

    logger.info('Removed external IdP', { issuer });
  }

  /**
   * Get public key for token verification
   */
  async getPublicKey(issuer: string, kid?: string): Promise<string> {
    const config = this.idpConfigs.get(issuer);
    if (!config) {
      throw new ExternalIdPError(
        ExternalIdPErrorCode.DISCOVERY_FAILED,
        `Unknown issuer: ${issuer}`,
        issuer
      );
    }

    try {
      return await this.jwksClient.getKey(issuer, kid, config.jwksUri);
    } catch (error) {
      // Update health status on error
      const healthStatus = this.healthStatuses.get(issuer);
      if (healthStatus) {
        healthStatus.isHealthy = false;
        healthStatus.lastError = error instanceof Error ? error.message : String(error);
      }
      throw error;
    }
  }

  /**
   * Extract and transform claims from token
   */
  extractClaims(issuer: string, claims: TokenClaims): TokenClaims {
    const config = this.idpConfigs.get(issuer);
    if (!config) {
      return claims;
    }

    const extractedClaims: TokenClaims = { ...claims };

    // Extract groups with custom claim name
    if (config.groupsClaim && config.groupsClaim !== 'groups') {
      const groups = claims[config.groupsClaim];
      if (groups) {
        extractedClaims.groups = this.transformGroups(groups, config.groupsTransform);
        // Remove the original claim if it's different
        if (config.groupsClaim !== 'groups') {
          delete extractedClaims[config.groupsClaim];
        }
      }
    } else if (claims.groups) {
      // Transform existing groups claim
      extractedClaims.groups = this.transformGroups(claims.groups, config.groupsTransform);
    }

    // Apply custom claim mappings
    if (config.claimMappings) {
      for (const [from, to] of Object.entries(config.claimMappings)) {
        if (from in claims) {
          extractedClaims[to] = claims[from];
          if (from !== to) {
            delete extractedClaims[from];
          }
        }
      }
    }

    // Extract additional claims
    if (config.additionalClaims) {
      for (const claimName of config.additionalClaims) {
        if (claimName in claims) {
          extractedClaims[claimName] = claims[claimName];
        }
      }
    }

    return extractedClaims;
  }

  /**
   * Get all configured issuers
   */
  getIssuers(): string[] {
    return Array.from(this.idpConfigs.keys());
  }

  /**
   * Get IdP configuration
   */
  getIdPConfig(issuer: string): ExternalIdPConfig | undefined {
    return this.idpConfigs.get(issuer);
  }

  /**
   * Get health status for all IdPs
   */
  getHealthStatuses(): Map<string, IdPHealthStatus> {
    return new Map(this.healthStatuses);
  }

  /**
   * Start health monitoring for an IdP
   */
  startHealthMonitoring(issuer: string): void {
    const config = this.idpConfigs.get(issuer);
    if (!config || !config.enableHealthMonitoring) {
      return;
    }

    // Stop existing timer if any
    this.stopHealthMonitoring(issuer);

    // Perform initial health check
    this.performHealthCheck(issuer).catch((error) => {
      logger.error('Initial health check failed', { issuer, error });
    });

    // Start periodic health checks
    const interval = config.healthCheckInterval ?? this.options.defaultHealthCheckInterval;
    const timer = setInterval(() => {
      this.performHealthCheck(issuer).catch((error) => {
        logger.error('Periodic health check failed', { issuer, error });
      });
    }, interval);

    this.healthCheckTimers.set(issuer, timer);
    logger.debug('Started health monitoring', { issuer, interval });
  }

  /**
   * Stop health monitoring for an IdP
   */
  stopHealthMonitoring(issuer: string): void {
    const timer = this.healthCheckTimers.get(issuer);
    if (timer) {
      clearInterval(timer as NodeJS.Timeout);
      this.healthCheckTimers.delete(issuer);
      logger.debug('Stopped health monitoring', { issuer });
    }
  }

  /**
   * Perform health check for an IdP
   */
  private async performHealthCheck(issuer: string): Promise<void> {
    const config = this.idpConfigs.get(issuer);
    if (!config) {
      return;
    }

    const healthStatus = this.healthStatuses.get(issuer)!;
    const startTime = Date.now();

    try {
      // Try to fetch JWKS endpoint
      await this.jwksClient.getKey(issuer, undefined, config.jwksUri);

      // Update health status
      healthStatus.isHealthy = true;
      healthStatus.lastHealthCheck = new Date();
      healthStatus.responseTime = Date.now() - startTime;
      healthStatus.lastError = undefined;

      // Get cache stats for additional info
      const cacheStats = this.jwksClient.getCacheStats();
      healthStatus.jwksStatus = {
        reachable: true,
        keyCount: cacheStats.totalKeys,
        lastFetch: new Date(),
      };

      logger.debug('Health check passed', {
        issuer,
        responseTime: healthStatus.responseTime,
      });
    } catch (error) {
      // Update health status
      healthStatus.isHealthy = false;
      healthStatus.lastError = error instanceof Error ? error.message : String(error);
      healthStatus.responseTime = Date.now() - startTime;

      if (healthStatus.jwksStatus) {
        healthStatus.jwksStatus.reachable = false;
      }

      logger.warn('Health check failed', {
        issuer,
        error: healthStatus.lastError,
        responseTime: healthStatus.responseTime,
      });
    }
  }

  /**
   * Apply provider-specific defaults to configuration
   */
  private applyProviderDefaults(config: ExternalIdPConfig): ExternalIdPConfig {
    const defaults = PROVIDER_DEFAULTS[config.provider];
    return {
      ...defaults,
      ...config,
      // Merge arrays instead of replacing
      additionalClaims: [...(defaults.additionalClaims ?? []), ...(config.additionalClaims ?? [])],
    };
  }

  /**
   * Validate IdP configuration
   */
  private validateIdPConfig(config: ExternalIdPConfig): void {
    if (!config.issuer) {
      throw new Error('IdP configuration must include issuer');
    }

    if (!config.audience) {
      throw new Error('IdP configuration must include audience');
    }

    // Validate issuer URL format
    try {
      new URL(config.issuer);
    } catch {
      throw new Error(`Invalid issuer URL: ${config.issuer}`);
    }

    // Validate JWKS URI if provided
    if (config.jwksUri) {
      try {
        new URL(config.jwksUri);
      } catch {
        throw new Error(`Invalid JWKS URI: ${config.jwksUri}`);
      }
    }
  }

  /**
   * Transform group values based on configuration
   */
  private transformGroups(
    groups: unknown,
    transform?: 'none' | 'extract_name' | 'extract_id'
  ): string[] {
    if (!Array.isArray(groups)) {
      return [];
    }

    switch (transform) {
      case 'extract_name':
        // For Azure AD groups that come as objects with displayName
        return groups.map((group) => {
          if (typeof group === 'object' && group !== null && 'displayName' in group) {
            return String(group.displayName);
          }
          return String(group);
        });

      case 'extract_id':
        // For groups that come as objects with id
        return groups.map((group) => {
          if (typeof group === 'object' && group !== null && 'id' in group) {
            return String(group.id);
          }
          return String(group);
        });

      case 'none':
      default:
        // Return groups as strings
        return groups.map((group) => String(group));
    }
  }

  /**
   * Shutdown the manager and clean up resources
   */
  shutdown(): void {
    // Stop all health monitoring
    for (const issuer of this.healthCheckTimers.keys()) {
      this.stopHealthMonitoring(issuer);
    }

    // Clear caches
    this.jwksClient.clearCache();

    logger.info('External IdP manager shut down');
  }
}
