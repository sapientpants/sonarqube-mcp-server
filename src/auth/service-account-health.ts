import { createLogger } from '../utils/logger.js';
import type { ServiceAccount, HealthCheckResult } from './service-account-types.js';
import type { ISonarQubeClient } from '../types/index.js';
import { createSonarQubeClient } from '../sonarqube.js';

const logger = createLogger('ServiceAccountHealth');

/**
 * Service account health monitoring options
 */
export interface ServiceAccountHealthOptions {
  /** Health check interval in milliseconds (default: 5 minutes) */
  checkInterval?: number;
  /** Maximum consecutive failures before marking unhealthy (default: 3) */
  maxFailures?: number;
  /** Request timeout for health checks in milliseconds (default: 10 seconds) */
  checkTimeout?: number;
  /** Whether to start monitoring immediately (default: true) */
  autoStart?: boolean;
}

/**
 * Monitors health of service accounts
 */
export class ServiceAccountHealthMonitor {
  private readonly options: Required<ServiceAccountHealthOptions>;
  private healthTimer?: NodeJS.Timeout;
  private readonly healthStatus: Map<string, HealthCheckResult> = new Map();
  private readonly accountFailures: Map<string, number> = new Map();
  private readonly accounts: Map<string, ServiceAccount> = new Map();

  constructor(options: ServiceAccountHealthOptions = {}) {
    this.options = {
      checkInterval: options.checkInterval ?? 5 * 60 * 1000, // 5 minutes
      maxFailures: options.maxFailures ?? 3,
      checkTimeout: options.checkTimeout ?? 10 * 1000, // 10 seconds
      autoStart: options.autoStart ?? true,
    };

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.healthTimer) {
      return;
    }

    logger.info('Starting service account health monitoring', {
      checkInterval: this.options.checkInterval,
      maxFailures: this.options.maxFailures,
    });

    // Run initial check immediately
    this.checkAllAccounts().catch((error) => {
      logger.error('Initial health check failed', error);
    });

    // Schedule periodic checks
    this.healthTimer = setInterval(() => {
      this.checkAllAccounts().catch((error) => {
        logger.error('Periodic health check failed', error);
      });
    }, this.options.checkInterval);

    // Don't block Node.js from exiting
    this.healthTimer.unref();
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = undefined;
      logger.info('Stopped service account health monitoring');
    }
  }

  /**
   * Check health of a specific service account
   */
  async checkAccount(
    account: ServiceAccount,
    defaultUrl?: string,
    defaultOrganization?: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      accountId: account.id,
      isHealthy: false,
      lastCheck: new Date(),
    };

    try {
      // Create a client for the service account
      const client = createSonarQubeClient(
        account.token,
        account.url ?? defaultUrl ?? 'https://sonarcloud.io',
        account.organization ?? defaultOrganization
      );

      // Perform a simple health check by calling system/ping
      await this.performHealthCheck(client);

      // Health check succeeded
      result.isHealthy = true;
      result.latency = Date.now() - startTime;

      // Reset failure count on success
      this.accountFailures.set(account.id, 0);

      // Update account health status
      account.isHealthy = true;
      account.lastHealthCheck = new Date();
      account.failureCount = 0;

      logger.info('Service account health check passed', {
        accountId: account.id,
        accountName: account.name,
        latency: result.latency,
      });
    } catch (error) {
      // Health check failed
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.latency = Date.now() - startTime;

      // Increment failure count
      const failures = (this.accountFailures.get(account.id) ?? 0) + 1;
      this.accountFailures.set(account.id, failures);

      // Mark as unhealthy if exceeded max failures
      if (failures >= this.options.maxFailures) {
        account.isHealthy = false;
        logger.error('Service account marked unhealthy', {
          accountId: account.id,
          accountName: account.name,
          failureCount: failures,
          error: result.error,
        });
      } else {
        logger.warn('Service account health check failed', {
          accountId: account.id,
          accountName: account.name,
          failureCount: failures,
          error: result.error,
        });
      }

      account.lastHealthCheck = new Date();
      account.failureCount = failures;
    }

    // Store result
    this.healthStatus.set(account.id, result);
    return result;
  }

  /**
   * Get health status for a specific account
   */
  getAccountHealth(accountId: string): HealthCheckResult | undefined {
    return this.healthStatus.get(accountId);
  }

  /**
   * Get all health statuses
   */
  getAllHealthStatuses(): Map<string, HealthCheckResult> {
    return new Map(this.healthStatus);
  }

  /**
   * Add an account to monitoring
   */
  addAccount(account: ServiceAccount): void {
    this.accounts.set(account.id, account);

    // Initialize health status if not exists
    if (!this.healthStatus.has(account.id)) {
      this.healthStatus.set(account.id, {
        accountId: account.id,
        isHealthy: account.isHealthy ?? true,
        lastCheck: new Date(),
      });
    }

    logger.info('Account added to health monitoring', {
      accountId: account.id,
      accountName: account.name,
    });
  }

  /**
   * Remove an account from monitoring
   */
  removeAccount(accountId: string): void {
    this.accounts.delete(accountId);
    this.healthStatus.delete(accountId);
    this.accountFailures.delete(accountId);

    logger.info('Account removed from health monitoring', { accountId });
  }

  /**
   * Update an existing account
   */
  updateAccount(account: ServiceAccount): void {
    this.accounts.set(account.id, account);

    logger.info('Account updated in health monitoring', {
      accountId: account.id,
      accountName: account.name,
    });
  }

  /**
   * Get health status for all accounts (alias for getAllHealthStatuses)
   */
  getHealthStatus(): Map<string, HealthCheckResult> {
    return this.getAllHealthStatuses();
  }

  /**
   * Force an immediate health check for all accounts
   */
  async checkAllAccounts(): Promise<void> {
    const accounts = Array.from(this.accounts.values());

    if (accounts.length === 0) {
      logger.debug('No accounts to check');
      return;
    }

    logger.info('Checking health of all accounts', { accountCount: accounts.length });

    const checks = accounts.map(async (account) => {
      try {
        await this.checkAccount(account);
      } catch (error) {
        logger.error('Failed to check account health', {
          accountId: account.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.allSettled(checks);
  }

  /**
   * Mark an account as failed (e.g., after a runtime error)
   */
  markAccountFailed(accountId: string, error: string): void {
    const failures = (this.accountFailures.get(accountId) ?? 0) + 1;
    this.accountFailures.set(accountId, failures);

    const result: HealthCheckResult = {
      accountId,
      isHealthy: failures < this.options.maxFailures,
      lastCheck: new Date(),
      error,
    };

    this.healthStatus.set(accountId, result);

    logger.warn('Service account marked as failed', {
      accountId,
      failureCount: failures,
      error,
    });
  }

  /**
   * Reset failure count for an account
   */
  resetAccountFailures(accountId: string): void {
    this.accountFailures.set(accountId, 0);
    const status = this.healthStatus.get(accountId);
    if (status) {
      status.isHealthy = true;
    }
  }

  /**
   * Perform the actual health check against SonarQube
   */
  private async performHealthCheck(client: ISonarQubeClient): Promise<void> {
    // Use a simple, low-impact API call with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), this.options.checkTimeout);
    });

    try {
      // Race between the API call and timeout
      await Promise.race([client.ping(), timeoutPromise]);
    } catch (error) {
      // If ping is not available, try status
      try {
        await Promise.race([client.getStatus(), timeoutPromise]);
      } catch {
        // Re-throw the original error
        throw error;
      }
    }
  }
}
