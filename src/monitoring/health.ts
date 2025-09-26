/* istanbul ignore file */
import { createLogger } from '../utils/logger.js';
import { createSonarQubeClient } from '../sonarqube.js';
import { getServiceAccountConfig } from '../config/service-accounts.js';
import { SERVER_VERSION } from '../config/versions.js';

const logger = createLogger('HealthService');

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  lastCheck?: Date;
}

export interface HealthCheckResult {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: Date;
  dependencies: Record<string, DependencyHealth>;
  features: Record<string, boolean>;
  metrics?: {
    requests: number;
    errors: number;
    activeSession: number;
  };
}

export class HealthService {
  private static instance: HealthService;
  private readonly startTime: Date;
  private cachedHealth?: {
    result: HealthCheckResult;
    timestamp: number;
  };
  private readonly cacheTimeout = 5000; // 5 seconds cache

  private constructor() {
    this.startTime = new Date();
  }

  static getInstance(): HealthService {
    if (!this.instance) {
      this.instance = new HealthService();
    }
    return this.instance;
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthCheckResult> {
    // Check cache
    if (this.cachedHealth && Date.now() - this.cachedHealth.timestamp < this.cacheTimeout) {
      return this.cachedHealth.result;
    }

    const dependencies: Record<string, DependencyHealth> = {};

    // Check SonarQube connectivity
    dependencies.sonarqube = await this.checkSonarQube();

    // Determine overall status
    const statuses = Object.values(dependencies);
    let overallStatus: HealthStatus = 'healthy';

    if (statuses.some((d) => d.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.some((d) => d.status === 'degraded')) {
      overallStatus = 'degraded';
    }

    // Get metrics summary
    const metrics = this.getMetricsSummary();

    const result: HealthCheckResult = {
      status: overallStatus,
      version: SERVER_VERSION,
      uptime: Date.now() - this.startTime.getTime(),
      timestamp: new Date(),
      dependencies,
      features: {
        metrics: true,
      },
    };

    // Only add metrics if they exist
    if (metrics !== undefined) {
      result.metrics = metrics;
    }

    // Cache result
    this.cachedHealth = {
      result,
      timestamp: Date.now(),
    };

    return result;
  }

  /**
   * Check SonarQube connectivity
   */
  private async checkSonarQube(): Promise<DependencyHealth> {
    const startTime = Date.now();

    try {
      const config = getServiceAccountConfig('default');
      if (!config?.token) {
        return {
          name: 'SonarQube',
          status: 'unhealthy',
          message: 'No default service account configured',
          lastCheck: new Date(),
        };
      }

      const client = createSonarQubeClient(
        config.token,
        config.url ?? process.env.SONARQUBE_URL ?? 'https://sonarcloud.io',
        config.organization ?? process.env.SONARQUBE_ORGANIZATION
      );

      // Try to ping SonarQube
      await client.ping();

      return {
        name: 'SonarQube',
        status: 'healthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      logger.error('SonarQube health check failed', error);
      return {
        name: 'SonarQube',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get metrics summary
   */
  private getMetricsSummary(): HealthCheckResult['metrics'] {
    // Get current metric values (this is a simplified version)
    // In a real implementation, you'd query the actual metric values
    // For now, we'll return static values
    return {
      requests: 0, // Would query mcpRequestsTotal
      errors: 0, // Would query sonarqubeErrorsTotal + authFailuresTotal
      activeSession: 0, // Would query activeSessions
    };
  }

  /**
   * Get readiness status (for Kubernetes)
   */
  async checkReadiness(): Promise<{
    ready: boolean;
    checks: Record<string, { ready: boolean; message?: string }>;
  }> {
    const checks: Record<string, { ready: boolean; message?: string }> = {};

    // Check if server is initialized
    checks.server = { ready: true };

    // Check SonarQube connectivity (async)
    const sonarqubeHealth = await this.checkSonarQube();
    const sonarqubeCheck: { ready: boolean; message?: string } = {
      ready: sonarqubeHealth.status !== 'unhealthy',
    };

    if (sonarqubeHealth.message !== undefined) {
      sonarqubeCheck.message = sonarqubeHealth.message;
    }

    checks.sonarqube = sonarqubeCheck;

    // Overall readiness
    const ready = Object.values(checks).every((check) => check.ready);

    return { ready, checks };
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    // Reset the singleton instance for testing purposes
    // @ts-expect-error - Intentionally setting to undefined for testing
    this.instance = undefined;
  }
}
