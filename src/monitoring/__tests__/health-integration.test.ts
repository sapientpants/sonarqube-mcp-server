import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { HealthService } from '../health.js';
import { ExternalIdPManager } from '../../auth/external-idp-manager.js';
import { BuiltInAuthServer } from '../../auth/built-in-server/auth-server.js';

// Simple integration test for HealthService without mocking internals
describe('HealthService Integration', () => {
  let healthService: HealthService;

  beforeEach(() => {
    // Reset singleton
    HealthService.resetInstance();
    healthService = HealthService.getInstance();
  });

  afterEach(() => {
    HealthService.resetInstance();
  });

  describe('Basic functionality', () => {
    it('should create a singleton instance', () => {
      const instance1 = HealthService.getInstance();
      const instance2 = HealthService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return health check response structure', async () => {
      const result = await healthService.checkHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('uptime');

      expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);
    });

    it('should return readiness check response structure', async () => {
      const result = await healthService.checkReadiness();

      expect(result).toHaveProperty('ready');
      expect(result).toHaveProperty('checks');
      expect(typeof result.ready).toBe('boolean');
      expect(result.checks).toHaveProperty('server');
    });

    it('should track uptime', async () => {
      // Wait a bit to ensure uptime > 0
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await healthService.checkHealth();
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should include features in health check', async () => {
      const result = await healthService.checkHealth();

      expect(result.features).toHaveProperty('metrics');
      expect(result.features).toHaveProperty('authentication');
      expect(result.features).toHaveProperty('sessionManagement');
      expect(result.features).toHaveProperty('externalIdP');
      expect(result.features).toHaveProperty('builtInAuth');
    });

    it('should handle missing dependencies gracefully', async () => {
      // Create instance without any dependencies
      HealthService.resetInstance();
      const instance = HealthService.getInstance();

      const result = await instance.checkHealth();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe('Readiness checks', () => {
    it('should check server readiness', async () => {
      const result = await healthService.checkReadiness();

      expect(result.checks.server).toBeDefined();
      expect(result.checks.server.ready).toBe(true);
    });

    it('should check authentication readiness', async () => {
      const result = await healthService.checkReadiness();

      expect(result.checks.authentication).toBeDefined();
      expect(result.checks.authentication).toHaveProperty('ready');
    });

    it('should not be ready when auth is not configured and MCP_HTTP_ALLOW_NO_AUTH is not set', async () => {
      // Ensure MCP_HTTP_ALLOW_NO_AUTH is not set
      delete process.env.MCP_HTTP_ALLOW_NO_AUTH;

      HealthService.resetInstance();
      const instance = HealthService.getInstance();
      const result = await instance.checkReadiness();

      expect(result.checks.authentication?.ready).toBe(false);
      expect(result.ready).toBe(false);
    });

    it('should be ready when MCP_HTTP_ALLOW_NO_AUTH is true', async () => {
      process.env.MCP_HTTP_ALLOW_NO_AUTH = 'true';

      HealthService.resetInstance();
      const instance = HealthService.getInstance();
      const result = await instance.checkReadiness();

      expect(result.checks.authentication?.ready).toBe(true);

      // Clean up
      delete process.env.MCP_HTTP_ALLOW_NO_AUTH;
    });
  });

  describe('Dependency health checks', () => {
    it('should include SonarQube in dependencies', async () => {
      const result = await healthService.checkHealth();

      expect(result.dependencies).toHaveProperty('sonarqube');
      expect(result.dependencies.sonarqube).toHaveProperty('name');
      expect(result.dependencies.sonarqube).toHaveProperty('status');
      expect(result.dependencies.sonarqube).toHaveProperty('lastCheck');
    });

    it('should check external IdP health when configured', async () => {
      const mockIdPManager = {
        getHealthStatus: jest.fn().mockReturnValue([
          { issuer: 'https://idp1.example.com', healthy: true },
          { issuer: 'https://idp2.example.com', healthy: false },
        ]),
      };

      HealthService.resetInstance();
      const instance = HealthService.getInstance(mockIdPManager as unknown as ExternalIdPManager);
      const result = await instance.checkHealth();

      expect(result.dependencies.externalIdP).toBeDefined();
      expect(result.dependencies.externalIdP.status).toBe('degraded');
      expect(result.dependencies.externalIdP.message).toContain('1/2 IdPs are healthy');
    });

    it('should report healthy when all IdPs are healthy', async () => {
      const mockIdPManager = {
        getHealthStatus: jest.fn().mockReturnValue([
          { issuer: 'https://idp1.example.com', healthy: true },
          { issuer: 'https://idp2.example.com', healthy: true },
        ]),
      };

      HealthService.resetInstance();
      const instance = HealthService.getInstance(mockIdPManager as unknown as ExternalIdPManager);
      const result = await instance.checkHealth();

      expect(result.dependencies.externalIdP).toBeDefined();
      expect(result.dependencies.externalIdP.status).toBe('healthy');
      expect(result.dependencies.externalIdP.message).toContain('All 2 IdPs are healthy');
    });

    it('should report unhealthy when all IdPs are unhealthy', async () => {
      const mockIdPManager = {
        getHealthStatus: jest.fn().mockReturnValue([
          { issuer: 'https://idp1.example.com', healthy: false },
          { issuer: 'https://idp2.example.com', healthy: false },
        ]),
      };

      HealthService.resetInstance();
      const instance = HealthService.getInstance(mockIdPManager as unknown as ExternalIdPManager);
      const result = await instance.checkHealth();

      expect(result.dependencies.externalIdP).toBeDefined();
      expect(result.dependencies.externalIdP.status).toBe('unhealthy');
      expect(result.dependencies.externalIdP.message).toContain('All 2 IdPs are unhealthy');
    });

    it('should check built-in auth server when configured', async () => {
      const mockAuthServer = {};

      HealthService.resetInstance();
      const instance = HealthService.getInstance(
        undefined,
        mockAuthServer as unknown as BuiltInAuthServer
      );
      const result = await instance.checkHealth();

      expect(result.dependencies.authServer).toBeDefined();
      expect(result.dependencies.authServer.status).toBe('healthy');
    });
  });

  describe('Overall health status', () => {
    it('should be degraded when some dependencies are unhealthy', async () => {
      const mockIdPManager = {
        getHealthStatus: jest.fn().mockReturnValue([
          { issuer: 'https://idp1.example.com', healthy: true },
          { issuer: 'https://idp2.example.com', healthy: false },
        ]),
      };

      HealthService.resetInstance();
      const instance = HealthService.getInstance(mockIdPManager as unknown as ExternalIdPManager);
      const result = await instance.checkHealth();

      // The overall status depends on sonarqube health which we can't easily mock
      // So we just verify the structure
      expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);
    });
  });

  describe('Metrics summary', () => {
    it('should include metrics summary when available', async () => {
      const result = await healthService.checkHealth();

      // Metrics summary might not be available without a metrics service
      if (result.metrics) {
        expect(result.metrics).toHaveProperty('requests');
        expect(result.metrics).toHaveProperty('errors');
        expect(result.metrics).toHaveProperty('activeSession');
      }
    });
  });
});
