import { jest } from '@jest/globals';
import { ServiceAccountHealthMonitor } from '../service-account-health.js';
import type { ServiceAccount } from '../service-account-mapper.js';
import { createSonarQubeClient } from '../../sonarqube.js';
import type { SonarQubeClientMock, ServiceAccountHealthMonitorInternal } from './test-helpers.js';

// Mock the sonarqube module
jest.mock('../../sonarqube.js', () => ({
  createSonarQubeClient: jest.fn().mockReturnValue({}),
}));

describe('ServiceAccountHealthMonitor', () => {
  let monitor: ServiceAccountHealthMonitor;
  let mockCreateClient: jest.Mock;
  let mockAccount: ServiceAccount;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockCreateClient = createSonarQubeClient as jest.Mock;

    monitor = new ServiceAccountHealthMonitor({
      checkInterval: 60000, // 1 minute
      unhealthyThreshold: 3,
      timeout: 5000,
    });

    mockAccount = {
      id: 'sa-123',
      name: 'Test Account',
      token: 'test-token',
      url: 'https://sonarqube.example.com',
      organization: 'test-org',
      isHealthy: true,
      failureCount: 0,
    };
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  describe('checkAccount', () => {
    it('should mark account healthy when ping succeeds', async () => {
      const mockClient = {
        system: {
          ping: jest.fn().mockResolvedValue('pong'),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      const result = await monitor.checkAccount(mockAccount);

      expect(result.isHealthy).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      expect(mockAccount.isHealthy).toBe(true);
      expect(mockAccount.failureCount).toBe(0);
      expect(mockAccount.lastHealthCheck).toBeInstanceOf(Date);
    });

    it('should use getStatus when ping is not available', async () => {
      const mockClient = {
        system: {
          getStatus: jest.fn().mockResolvedValue({ status: 'UP' }),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      const result = await monitor.checkAccount(mockAccount);

      expect(result.isHealthy).toBe(true);
      expect(mockClient.system.getStatus).toHaveBeenCalled();
    });

    it('should mark account unhealthy after threshold failures', async () => {
      const mockClient = {
        system: {
          ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      // First two failures - still healthy
      for (let i = 0; i < 2; i++) {
        const result = await monitor.checkAccount(mockAccount);
        expect(result.isHealthy).toBe(false);
        expect(mockAccount.isHealthy).toBe(true); // Still healthy
        expect(mockAccount.failureCount).toBe(i + 1);
      }

      // Third failure - becomes unhealthy
      const result = await monitor.checkAccount(mockAccount);
      expect(result.isHealthy).toBe(false);
      expect(mockAccount.isHealthy).toBe(false); // Now unhealthy
      expect(mockAccount.failureCount).toBe(3);
      expect(result.error).toContain('Connection failed');
    });

    it('should reset failure count on successful check', async () => {
      mockAccount.failureCount = 2;

      const mockClient = {
        system: {
          ping: jest.fn().mockResolvedValue('pong'),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      const result = await monitor.checkAccount(mockAccount);

      expect(result.isHealthy).toBe(true);
      expect(mockAccount.failureCount).toBe(0);
      expect(mockAccount.isHealthy).toBe(true);
    });

    it('should use default URL when not specified in account', async () => {
      const accountWithoutUrl = { ...mockAccount, url: undefined };
      const defaultUrl = 'https://default.sonarqube.com';

      const mockClient = {
        system: {
          ping: jest.fn().mockResolvedValue('pong'),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      await monitor.checkAccount(accountWithoutUrl, defaultUrl);

      expect(mockCreateClient).toHaveBeenCalledWith('test-token', defaultUrl, 'test-org');
    });

    it('should handle timeout', async () => {
      const mockClient = {
        system: {
          ping: jest
            .fn()
            .mockImplementation(
              () => new Promise((resolve) => setTimeout(() => resolve('pong'), 10000))
            ),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      const resultPromise = monitor.checkAccount(mockAccount);

      // Fast-forward past timeout
      jest.advanceTimersByTime(5001);

      const result = await resultPromise;
      expect(result.isHealthy).toBe(false);
      expect(result.error).toContain('Health check timed out');
    });

    it('should handle client creation errors', async () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await monitor.checkAccount(mockAccount);

      expect(result.isHealthy).toBe(false);
      expect(result.error).toContain('Invalid token');
      expect(mockAccount.failureCount).toBe(1);
    });
  });

  describe('addAccount', () => {
    it('should add account to monitoring', () => {
      monitor.addAccount(mockAccount);

      const health = monitor.getAccountHealth('sa-123');
      expect(health).toEqual({
        isHealthy: true,
        lastCheck: null,
        failureCount: 0,
        error: undefined,
      });
    });

    it('should update existing account', () => {
      monitor.addAccount(mockAccount);

      const updatedAccount = { ...mockAccount, name: 'Updated Name' };
      monitor.addAccount(updatedAccount);

      // Should maintain health status
      const health = monitor.getAccountHealth('sa-123');
      expect(health.isHealthy).toBe(true);
    });
  });

  describe('removeAccount', () => {
    it('should remove account from monitoring', () => {
      monitor.addAccount(mockAccount);
      monitor.removeAccount('sa-123');

      const health = monitor.getAccountHealth('sa-123');
      expect(health).toBeNull();
    });
  });

  describe('markAccountFailed', () => {
    it('should increment failure count', () => {
      monitor.addAccount(mockAccount);

      monitor.markAccountFailed('sa-123', 'Test error');

      const health = monitor.getAccountHealth('sa-123');
      expect(health?.failureCount).toBe(1);
      expect(health?.error).toBe('Test error');
    });

    it('should mark account unhealthy after threshold', () => {
      monitor.addAccount(mockAccount);

      for (let i = 0; i < 2; i++) {
        monitor.markAccountFailed('sa-123', 'Error');
        const health = monitor.getAccountHealth('sa-123');
        expect(health?.isHealthy).toBe(true);
      }

      monitor.markAccountFailed('sa-123', 'Final error');
      const health = monitor.getAccountHealth('sa-123');
      expect(health?.isHealthy).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all accounts', () => {
      const account1 = { ...mockAccount, id: 'sa-1' };
      const account2 = { ...mockAccount, id: 'sa-2', isHealthy: false };

      monitor.addAccount(account1);
      monitor.addAccount(account2);
      monitor.markAccountFailed('sa-2', 'Error');

      const status = monitor.getHealthStatus();

      expect(status.size).toBe(2);
      expect(status.get('sa-1')?.isHealthy).toBe(true);
      expect(status.get('sa-2')?.isHealthy).toBe(true); // Not yet marked unhealthy
      expect(status.get('sa-2')?.failureCount).toBe(1);
    });
  });

  describe('automatic monitoring', () => {
    it('should start monitoring when accounts are added', async () => {
      const mockClient = {
        system: {
          ping: jest.fn().mockResolvedValue('pong'),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      monitor.addAccount(mockAccount);
      monitor.start();

      // Wait for initial check
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      expect(mockClient.system.ping).toHaveBeenCalled();
    });

    it('should check all accounts periodically', async () => {
      const mockClient = {
        system: {
          ping: jest.fn().mockResolvedValue('pong'),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      const account1 = { ...mockAccount, id: 'sa-1' };
      const account2 = { ...mockAccount, id: 'sa-2' };

      monitor.addAccount(account1);
      monitor.addAccount(account2);
      monitor.start();

      // Advance time for multiple check cycles
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(60000);
        await Promise.resolve();
      }

      // Each account should be checked 3 times
      expect(mockClient.system.ping).toHaveBeenCalledTimes(6);
    });

    it('should stop monitoring when stop is called', () => {
      monitor.start();
      const spy = jest.spyOn(global, 'clearInterval');

      monitor.stop();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors in check cycle gracefully', async () => {
      const mockClient = {
        system: {
          ping: jest.fn().mockRejectedValue(new Error('Check failed')),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as SonarQubeClientMock);

      monitor.addAccount(mockAccount);
      monitor.start();

      // Should not throw
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      const health = monitor.getAccountHealth('sa-123');
      expect(health?.failureCount).toBe(1);
    });

    it('should continue checking other accounts if one fails', async () => {
      const account1 = { ...mockAccount, id: 'sa-1' };
      const account2 = { ...mockAccount, id: 'sa-2', token: 'token-2' };

      const mockClient1 = {
        system: {
          ping: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };

      const mockClient2 = {
        system: {
          ping: jest.fn().mockResolvedValue('pong'),
        },
      };

      mockCreateClient
        .mockReturnValueOnce(mockClient1 as SonarQubeClientMock)
        .mockReturnValueOnce(mockClient2 as SonarQubeClientMock);

      monitor.addAccount(account1);
      monitor.addAccount(account2);

      // Check both accounts
      await (monitor as unknown as ServiceAccountHealthMonitorInternal).checkAllAccounts();

      const health1 = monitor.getAccountHealth('sa-1');
      const health2 = monitor.getAccountHealth('sa-2');

      expect(health1?.failureCount).toBe(1);
      expect(health2?.failureCount).toBe(0);
      expect(health2?.isHealthy).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration values', () => {
      const customMonitor = new ServiceAccountHealthMonitor({
        checkInterval: 30000,
        unhealthyThreshold: 5,
        timeout: 10000,
      });

      expect((customMonitor as unknown as ServiceAccountHealthMonitorInternal).checkInterval).toBe(
        30000
      );
      expect(
        (customMonitor as unknown as ServiceAccountHealthMonitorInternal).unhealthyThreshold
      ).toBe(5);
      expect((customMonitor as unknown as ServiceAccountHealthMonitorInternal).timeout).toBe(10000);
    });

    it('should use default values when not specified', () => {
      const defaultMonitor = new ServiceAccountHealthMonitor();

      expect((defaultMonitor as unknown as ServiceAccountHealthMonitorInternal).checkInterval).toBe(
        300000
      ); // 5 minutes
      expect(
        (defaultMonitor as unknown as ServiceAccountHealthMonitorInternal).unhealthyThreshold
      ).toBe(3);
      expect((defaultMonitor as unknown as ServiceAccountHealthMonitorInternal).timeout).toBe(
        30000
      ); // 30 seconds
    });
  });
});
