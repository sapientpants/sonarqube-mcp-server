import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { HealthService } from '../health.js';
import { ExternalIdPManager } from '../../auth/external-idp-manager.js';
import { BuiltInAuthServer } from '../../auth/built-in-server/auth-server.js';
import { ServiceAccountMapper } from '../../auth/service-account-mapper.js';

// Mock functions
const mockGetServiceAccountConfig = jest.fn();
const mockCreateSonarQubeClient = jest.fn();

// Mock dependencies
jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Use doMock for dynamic mocking
beforeAll(() => {
  jest.doMock('../../config/service-accounts.js', () => ({
    getServiceAccountConfig: mockGetServiceAccountConfig,
  }));

  jest.doMock('../../sonarqube.js', () => ({
    createSonarQubeClient: mockCreateSonarQubeClient,
  }));
});

afterAll(() => {
  jest.dontMock('../../config/service-accounts.js');
  jest.dontMock('../../sonarqube.js');
});

describe.skip('HealthService', () => {
  let mockExternalIdPManager: jest.Mocked<ExternalIdPManager>;
  let mockBuiltInAuthServer: jest.Mocked<BuiltInAuthServer>;
  let mockServiceAccountMapper: jest.Mocked<ServiceAccountMapper>;
  let mockSonarQubeClient: { ping: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset singleton
    HealthService.resetInstance();

    // Reset all mocks
    jest.clearAllMocks();

    // Create mocks
    mockExternalIdPManager = {
      getHealthStatus: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<ExternalIdPManager>;

    mockBuiltInAuthServer = {} as unknown as jest.Mocked<BuiltInAuthServer>;

    mockServiceAccountMapper = {} as unknown as jest.Mocked<ServiceAccountMapper>;

    mockSonarQubeClient = {
      ping: jest.fn().mockResolvedValue(undefined),
    };

    // Setup default mock behaviors
    mockGetServiceAccountConfig.mockReturnValue({
      id: 'default',
      token: 'test-token',
      url: 'https://sonarqube.example.com',
    });

    mockCreateSonarQubeClient.mockReturnValue(mockSonarQubeClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    HealthService.resetInstance();
    // Reset environment variables
    delete process.env.SONARQUBE_URL;
    delete process.env.MCP_HTTP_ALLOW_NO_AUTH;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const instance2 = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );

      expect(instance1).toBe(instance2);
    });

    it('should create instance with dependencies', () => {
      const instance = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );

      expect(instance).toBeDefined();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when all dependencies are healthy', async () => {
      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.dependencies.sonarqube.status).toBe('healthy');
      expect(result.features.metrics).toBe(true);
    });

    it('should return unhealthy when SonarQube is not configured', async () => {
      mockGetServiceAccountConfig.mockReturnValue(null);

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.sonarqube.status).toBe('unhealthy');
      expect(result.dependencies.sonarqube.message).toBe('No default service account configured');
    });

    it('should return unhealthy when SonarQube ping fails', async () => {
      mockGetServiceAccountConfig.mockReturnValue({
        id: 'default',
        token: 'test-token',
      });

      mockSonarQubeClient.ping.mockRejectedValue(new Error('Connection refused'));

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.sonarqube.status).toBe('unhealthy');
      expect(result.dependencies.sonarqube.message).toBe('Connection refused');
    });

    it('should check built-in auth server when enabled', async () => {
      const healthService = HealthService.getInstance(undefined, mockBuiltInAuthServer, undefined);
      const result = await healthService.checkHealth();

      expect(result.dependencies.authServer).toBeDefined();
      expect(result.dependencies.authServer.status).toBe('healthy');
      expect(result.features.builtInAuth).toBe(true);
    });

    it('should check external IdPs when configured', async () => {
      mockExternalIdPManager.getHealthStatus.mockReturnValue([
        { provider: 'azure-ad', healthy: true, lastCheck: new Date() },
        { provider: 'okta', healthy: true, lastCheck: new Date() },
      ]);

      const healthService = HealthService.getInstance(mockExternalIdPManager, undefined, undefined);
      const result = await healthService.checkHealth();

      expect(result.dependencies.externalIdP).toBeDefined();
      expect(result.dependencies.externalIdP.status).toBe('healthy');
      expect(result.dependencies.externalIdP.message).toBe('All 2 IdPs are healthy');
      expect(result.features.externalIdP).toBe(true);
    });

    it('should return degraded when some IdPs are unhealthy', async () => {
      mockExternalIdPManager.getHealthStatus.mockReturnValue([
        { provider: 'azure-ad', healthy: true, lastCheck: new Date() },
        { provider: 'okta', healthy: false, lastCheck: new Date(), error: 'Timeout' },
      ]);

      const healthService = HealthService.getInstance(mockExternalIdPManager, undefined, undefined);
      const result = await healthService.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.dependencies.externalIdP.status).toBe('degraded');
      expect(result.dependencies.externalIdP.message).toBe('1/2 IdPs are healthy');
    });

    it('should cache health results', async () => {
      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );

      // First call
      const result1 = await healthService.checkHealth();
      expect(mockSonarQubeClient.ping).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await healthService.checkHealth();
      expect(mockSonarQubeClient.ping).toHaveBeenCalledTimes(1);

      expect(result1.timestamp).toEqual(result2.timestamp);
    });

    it('should refresh cache after timeout', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );

      // First call
      await healthService.checkHealth();
      expect(mockSonarQubeClient.ping).toHaveBeenCalledTimes(1);

      // Wait for cache to expire (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5100));

      // Second call should refresh
      await healthService.checkHealth();
      expect(mockSonarQubeClient.ping).toHaveBeenCalledTimes(2);

      // Restore fake timers
      jest.useFakeTimers();
    }, 10000);

    it('should include uptime in response', async () => {
      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );

      // Advance time to simulate uptime
      jest.advanceTimersByTime(100);

      const result = await healthService.checkHealth();
      expect(result.uptime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('checkReadiness', () => {
    it('should return ready when all checks pass', async () => {
      process.env.MCP_HTTP_ALLOW_NO_AUTH = 'true';

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkReadiness();

      expect(result.ready).toBe(true);
      expect(result.checks.server.ready).toBe(true);
      expect(result.checks.authentication.ready).toBe(true);
      expect(result.checks.sonarqube.ready).toBe(true);
    });

    it('should return not ready when authentication is not configured', async () => {
      delete process.env.MCP_HTTP_ALLOW_NO_AUTH;

      const healthService = HealthService.getInstance(undefined, undefined, undefined);
      const result = await healthService.checkReadiness();

      expect(result.ready).toBe(false);
      expect(result.checks.authentication.ready).toBe(false);
      expect(result.checks.authentication.message).toBe('No authentication method configured');
    });

    it('should return ready when external IdP is configured', async () => {
      const healthService = HealthService.getInstance(mockExternalIdPManager, undefined, undefined);
      const result = await healthService.checkReadiness();

      expect(result.checks.authentication.ready).toBe(true);
    });

    it('should return ready when built-in auth is configured', async () => {
      const healthService = HealthService.getInstance(undefined, mockBuiltInAuthServer, undefined);
      const result = await healthService.checkReadiness();

      expect(result.checks.authentication.ready).toBe(true);
    });

    it('should return not ready when SonarQube is unhealthy', async () => {
      mockGetServiceAccountConfig.mockReturnValue(null);
      process.env.MCP_HTTP_ALLOW_NO_AUTH = 'true';

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkReadiness();

      expect(result.ready).toBe(false);
      expect(result.checks.sonarqube.ready).toBe(false);
      expect(result.checks.sonarqube.message).toBe('No default service account configured');
    });
  });

  describe('Error handling', () => {
    it('should handle exceptions in SonarQube check', async () => {
      mockGetServiceAccountConfig.mockImplementation(() => {
        throw new Error('Config error');
      });

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.sonarqube.status).toBe('unhealthy');
      expect(result.dependencies.sonarqube.message).toBe('Config error');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetServiceAccountConfig.mockImplementation(() => {
        throw 'String error';
      });

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      const result = await healthService.checkHealth();

      expect(result.dependencies.sonarqube.message).toBe('Unknown error');
    });
  });

  describe('Environment variables', () => {
    it('should use SONARQUBE_URL from environment', async () => {
      process.env.SONARQUBE_URL = 'https://custom.sonarqube.com';

      mockGetServiceAccountConfig.mockReturnValue({
        id: 'default',
        token: 'test-token',
      });

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      await healthService.checkHealth();

      expect(mockCreateSonarQubeClient).toHaveBeenCalledWith(
        'test-token',
        'https://custom.sonarqube.com',
        undefined
      );
    });

    it('should use config URL over environment', async () => {
      process.env.SONARQUBE_URL = 'https://env.sonarqube.com';

      mockGetServiceAccountConfig.mockReturnValue({
        id: 'default',
        token: 'test-token',
        url: 'https://config.sonarqube.com',
      });

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      await healthService.checkHealth();

      expect(mockCreateSonarQubeClient).toHaveBeenCalledWith(
        'test-token',
        'https://config.sonarqube.com',
        undefined
      );
    });

    it('should default to SonarCloud when no URL configured', async () => {
      delete process.env.SONARQUBE_URL;

      mockGetServiceAccountConfig.mockReturnValue({
        id: 'default',
        token: 'test-token',
      });

      const healthService = HealthService.getInstance(
        mockExternalIdPManager,
        mockBuiltInAuthServer,
        mockServiceAccountMapper
      );
      await healthService.checkHealth();

      expect(mockCreateSonarQubeClient).toHaveBeenCalledWith(
        'test-token',
        'https://sonarcloud.io',
        undefined
      );
    });
  });
});
