import { createLogger } from '../utils/logger.js';
import { createSonarQubeClient } from '../sonarqube.js';
import { getServiceAccountConfig } from '../config/service-accounts.js';
import { ExternalIdPManager } from '../auth/external-idp-manager.js';
import { BuiltInAuthServer } from '../auth/built-in-server/auth-server.js';
import { ServiceAccountMapper } from '../auth/service-account-mapper.js';
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

  private constructor(
    private readonly externalIdPManager?: ExternalIdPManager,
    private readonly builtInAuthServer?: BuiltInAuthServer,
    private readonly serviceAccountMapper?: ServiceAccountMapper
  ) {
    this.startTime = new Date();
  }

  static getInstance(
    externalIdPManager?: ExternalIdPManager,
    builtInAuthServer?: BuiltInAuthServer,
    serviceAccountMapper?: ServiceAccountMapper
  ): HealthService {
    if (!this.instance) {
      this.instance = new HealthService(
        externalIdPManager,
        builtInAuthServer,
        serviceAccountMapper
      );
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

    // Check auth server (if enabled)
    if (this.builtInAuthServer) {
      dependencies.authServer = await this.checkBuiltInAuthServer();
    }

    // Check external IdPs (if configured)
    if (this.externalIdPManager) {
      dependencies.externalIdP = await this.checkExternalIdPs();
    }

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
        authentication: !!this.externalIdPManager || !!this.builtInAuthServer,
        sessionManagement: !!this.serviceAccountMapper,
        externalIdP: !!this.externalIdPManager,
        builtInAuth: !!this.builtInAuthServer,
        metrics: true,
      },
      metrics,
    };

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
   * Check built-in auth server
   */
  private async checkBuiltInAuthServer(): Promise<DependencyHealth> {
    const startTime = Date.now();

    try {
      // Simply check if auth server is initialized
      if (!this.builtInAuthServer) {
        return {
          name: 'Built-in Auth Server',
          status: 'unhealthy',
          message: 'Not initialized',
          lastCheck: new Date(),
        };
      }

      // Auth server is running if we got here
      return {
        name: 'Built-in Auth Server',
        status: 'healthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      logger.error('Built-in auth server health check failed', error);
      return {
        name: 'Built-in Auth Server',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Check external IdPs
   */
  private async checkExternalIdPs(): Promise<DependencyHealth> {
    if (!this.externalIdPManager) {
      return {
        name: 'External IdPs',
        status: 'healthy',
        message: 'Not configured',
        lastCheck: new Date(),
      };
    }

    const healthStatuses = this.externalIdPManager.getHealthStatus();
    const totalIdPs = healthStatuses.length;
    const healthyIdPs = healthStatuses.filter((h) => h.healthy).length;

    if (healthyIdPs === 0 && totalIdPs > 0) {
      return {
        name: 'External IdPs',
        status: 'unhealthy',
        message: `All ${totalIdPs} IdPs are unhealthy`,
        lastCheck: new Date(),
      };
    } else if (healthyIdPs < totalIdPs) {
      return {
        name: 'External IdPs',
        status: 'degraded',
        message: `${healthyIdPs}/${totalIdPs} IdPs are healthy`,
        lastCheck: new Date(),
      };
    } else {
      return {
        name: 'External IdPs',
        status: 'healthy',
        message: `All ${totalIdPs} IdPs are healthy`,
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

    // Check authentication
    if (
      !this.externalIdPManager &&
      !this.builtInAuthServer &&
      process.env.MCP_HTTP_ALLOW_NO_AUTH !== 'true'
    ) {
      checks.authentication = {
        ready: false,
        message: 'No authentication method configured',
      };
    } else {
      checks.authentication = { ready: true };
    }

    // Check SonarQube connectivity (async)
    const sonarqubeHealth = await this.checkSonarQube();
    checks.sonarqube = {
      ready: sonarqubeHealth.status !== 'unhealthy',
      message: sonarqubeHealth.message,
    };

    // Overall readiness
    const ready = Object.values(checks).every((check) => check.ready);

    return { ready, checks };
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance = undefined as any;
  }
}
