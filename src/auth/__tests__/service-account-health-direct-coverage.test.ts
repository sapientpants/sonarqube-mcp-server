import { describe, it, expect } from '@jest/globals';

// Direct coverage test that exercises the service account health code without complex mocking
describe('ServiceAccountHealthMonitor - Direct Coverage Tests', () => {
  describe('Direct class instantiation and basic methods', () => {
    it('should create monitor with default options', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        autoStart: false, // Disable auto-start to avoid timer issues in tests
      });

      expect(monitor).toBeInstanceOf(ServiceAccountHealthMonitor);
      expect(monitor.getName).toBeUndefined(); // This isn't a transport, so no getName method
    });

    it('should create monitor with custom options', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        checkInterval: 30000,
        maxFailures: 5,
        checkTimeout: 15000,
        autoStart: false,
      });

      expect(monitor).toBeInstanceOf(ServiceAccountHealthMonitor);
      monitor.stop(); // Clean up
    });

    it('should handle start and stop operations', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        autoStart: false,
      });

      // Should not throw
      expect(() => monitor.start()).not.toThrow();
      expect(() => monitor.stop()).not.toThrow();

      // Should be safe to call multiple times
      expect(() => monitor.start()).not.toThrow();
      expect(() => monitor.stop()).not.toThrow();

      // Stop when not started should be safe
      expect(() => monitor.stop()).not.toThrow();
    });

    it('should manage accounts', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        autoStart: false,
      });

      const mockAccount = {
        id: 'sa-123',
        name: 'Test Account',
        token: 'test-token',
        url: 'https://sonarqube.example.com',
        organization: 'test-org',
        isHealthy: true,
        failureCount: 0,
      };

      // Add account
      expect(() => monitor.addAccount(mockAccount)).not.toThrow();

      // Get health status
      const health = monitor.getAccountHealth('sa-123');
      expect(health).toBeDefined();
      expect(health?.accountId).toBe('sa-123');
      expect(health?.lastCheck).toBeInstanceOf(Date);

      // Update account
      const updatedAccount = { ...mockAccount, name: 'Updated Name' };
      expect(() => monitor.updateAccount(updatedAccount)).not.toThrow();

      // Get all health statuses
      const allStatuses = monitor.getAllHealthStatuses();
      expect(allStatuses.size).toBeGreaterThan(0);
      expect(allStatuses.has('sa-123')).toBe(true);

      // Test alias method
      const statusAlias = monitor.getHealthStatus();
      expect(statusAlias).toEqual(allStatuses);

      // Remove account
      expect(() => monitor.removeAccount('sa-123')).not.toThrow();
      expect(monitor.getAccountHealth('sa-123')).toBeUndefined();

      // Remove non-existent account should not throw
      expect(() => monitor.removeAccount('non-existent')).not.toThrow();

      monitor.stop(); // Clean up
    });

    it('should handle failure tracking', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        maxFailures: 3,
        autoStart: false,
      });

      const mockAccount = {
        id: 'sa-123',
        name: 'Test Account',
        token: 'test-token',
      };

      monitor.addAccount(mockAccount);

      // Mark account as failed
      expect(() => monitor.markAccountFailed('sa-123', 'Test error')).not.toThrow();

      const health = monitor.getAccountHealth('sa-123');
      expect(health?.error).toBe('Test error');

      // Mark failed multiple times to test threshold behavior
      monitor.markAccountFailed('sa-123', 'Error 1');
      monitor.markAccountFailed('sa-123', 'Error 2');
      monitor.markAccountFailed('sa-123', 'Error 3');

      const finalHealth = monitor.getAccountHealth('sa-123');
      expect(finalHealth?.isHealthy).toBe(false);

      // Reset failures
      expect(() => monitor.resetAccountFailures('sa-123')).not.toThrow();
      const resetHealth = monitor.getAccountHealth('sa-123');
      expect(resetHealth?.isHealthy).toBe(true);

      // Mark failed for non-existent account should not throw
      expect(() => monitor.markAccountFailed('non-existent', 'Error')).not.toThrow();

      // Reset for non-existent account should not throw
      expect(() => monitor.resetAccountFailures('non-existent')).not.toThrow();

      monitor.stop(); // Clean up
    });

    it('should handle check all accounts method', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        autoStart: false,
        checkTimeout: 100, // Very short timeout to fail fast
      });

      // Should handle empty accounts list
      await monitor.checkAllAccounts();

      // Add some accounts with invalid URLs to ensure they fail quickly
      monitor.addAccount({
        id: 'sa-1',
        name: 'Account 1',
        token: 'token-1',
        url: 'http://127.0.0.1:1', // Non-routable address that will fail immediately
      });

      monitor.addAccount({
        id: 'sa-2',
        name: 'Account 2',
        token: 'token-2',
        url: 'http://127.0.0.1:2', // Non-routable address that will fail immediately
      });

      // This should complete quickly without throwing
      // The method uses allSettled internally so it won't throw
      await monitor.checkAllAccounts();

      // Verify the accounts were processed
      const health1 = monitor.getAccountHealth('sa-1');
      const health2 = monitor.getAccountHealth('sa-2');
      expect(health1).toBeDefined();
      expect(health2).toBeDefined();

      monitor.stop(); // Clean up
    });

    it('should handle individual account checks', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        autoStart: false,
        checkTimeout: 100, // Very short timeout for tests
      });

      const mockAccount = {
        id: 'sa-123',
        name: 'Test Account',
        token: 'test-token',
        url: 'http://127.0.0.1:3', // Non-routable address
        organization: 'test-org',
      };

      // Check should fail quickly due to invalid URL
      const result1 = await monitor.checkAccount(mockAccount);
      expect(result1.accountId).toBe('sa-123');
      expect(result1.isHealthy).toBe(false);
      expect(result1.error).toBeDefined();
      expect(result1.lastCheck).toBeInstanceOf(Date);

      // Test with minimal account properties
      const minimalAccount = {
        id: 'minimal',
        name: 'Minimal Account',
        token: 'token',
      };

      const result2 = await monitor.checkAccount(minimalAccount);
      expect(result2.accountId).toBe('minimal');
      expect(result2.isHealthy).toBe(false);

      // Test with default parameters
      const result3 = await monitor.checkAccount(mockAccount, 'http://127.0.0.1:4', 'default-org');
      expect(result3.accountId).toBe('sa-123');
      expect(result3.isHealthy).toBe(false);

      monitor.stop(); // Clean up
    });

    it('should exercise constructor variants', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      // Test with no options
      const defaultMonitor = new ServiceAccountHealthMonitor();
      expect(defaultMonitor).toBeInstanceOf(ServiceAccountHealthMonitor);
      defaultMonitor.stop(); // Clean up

      // Test with partial options
      const partialMonitor = new ServiceAccountHealthMonitor({
        checkInterval: 60000,
      });
      expect(partialMonitor).toBeInstanceOf(ServiceAccountHealthMonitor);
      partialMonitor.stop(); // Clean up

      // Test with autoStart disabled
      const noAutoStartMonitor = new ServiceAccountHealthMonitor({
        autoStart: false,
      });
      expect(noAutoStartMonitor).toBeInstanceOf(ServiceAccountHealthMonitor);
      noAutoStartMonitor.stop(); // Clean up
    });

    it('should test edge cases and error conditions', async () => {
      const { ServiceAccountHealthMonitor } = await import('../service-account-health.js');

      const monitor = new ServiceAccountHealthMonitor({
        autoStart: false,
      });

      // Test health check for non-existent account
      expect(monitor.getAccountHealth('non-existent')).toBeUndefined();

      // Test with account that has undefined/null properties
      const sparseAccount = {
        id: 'sparse',
        name: 'Sparse Account',
        token: 'token',
        url: undefined,
        organization: undefined,
        isHealthy: undefined,
        failureCount: undefined,
      };

      monitor.addAccount(sparseAccount);
      const health = monitor.getAccountHealth('sparse');
      expect(health).toBeDefined();
      expect(health?.accountId).toBe('sparse');

      monitor.stop(); // Clean up
    });
  });
});
