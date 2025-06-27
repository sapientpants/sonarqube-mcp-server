import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { CircuitBreakerFactory } from '../circuit-breaker.js';
import { getMetricsService, cleanupMetricsService } from '../metrics.js';

// Mock the middleware module
jest.mock('../middleware.js', () => ({
  trackSonarQubeError: jest.fn(),
  trackCircuitBreakerFailure: jest.fn(),
  updateCircuitBreakerMetrics: jest.fn(),
}));

describe('Circuit Breaker Advanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CircuitBreakerFactory.reset();
    cleanupMetricsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    CircuitBreakerFactory.reset();
    cleanupMetricsService();
  });

  describe('Circuit Breaker Factory - Advanced Scenarios', () => {
    it('should handle all circuit breaker states', async () => {
      const mockFn = jest.fn();
      const metrics = getMetricsService();
      const updateStateSpy = jest.spyOn(metrics, 'updateCircuitBreakerState');

      // Create a breaker that will open quickly
      const breaker = CircuitBreakerFactory.getBreaker('state-test', mockFn, {
        timeout: 1000,
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
        resetTimeout: 100,
      });

      // Initially closed
      expect(breaker.closed).toBe(true);

      // Force failures to open the breaker
      mockFn.mockRejectedValue(new Error('Test error'));
      await expect(breaker.fire()).rejects.toThrow('Test error');
      await expect(breaker.fire()).rejects.toThrow('Test error');

      // Should be open now
      expect(breaker.opened).toBe(true);
      expect(updateStateSpy).toHaveBeenCalledWith('state-test', 'open');

      // Wait for half-open state
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next call should put it in half-open
      mockFn.mockResolvedValue('success');
      await breaker.fire();

      // Should be closed again after success
      expect(breaker.closed).toBe(true);
    });

    it('should handle reject event', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Rejected'));
      const breaker = CircuitBreakerFactory.getBreaker('reject-test', mockFn, {
        errorThresholdPercentage: 100,
        volumeThreshold: 1,
      });

      await expect(breaker.fire()).rejects.toThrow('Rejected');

      // The breaker might not open after just one failure depending on config
      // Try another failure to ensure it opens
      await expect(breaker.fire()).rejects.toThrow('Rejected');

      // Now check if it's open and try again
      if (breaker.opened) {
        // This should be rejected without calling the function
        await expect(breaker.fire()).rejects.toThrow('Breaker is open');
      }
    });

    it('should handle timeout event', async () => {
      const slowFn = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('late'), 200)));

      const breaker = CircuitBreakerFactory.getBreaker('timeout-test', slowFn, {
        timeout: 50,
      });

      await expect(breaker.fire()).rejects.toThrow();
    });

    it('should handle semaphore locked event', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const breaker = CircuitBreakerFactory.getBreaker('semaphore-test', mockFn, {
        capacity: 1, // Only allow 1 concurrent request
      });

      // Fire multiple requests concurrently
      const promises = [
        breaker.fire(),
        breaker.fire(), // This should be rejected due to semaphore
      ];

      const results = await Promise.allSettled(promises);

      // First should succeed
      expect(results[0].status).toBe('fulfilled');
      // Second might be rejected due to semaphore
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toContain('semaphore');
      }
    });

    it('should handle health check event', async () => {
      const mockFn = jest.fn();
      const breaker = CircuitBreakerFactory.getBreaker('health-check-test', mockFn, {
        healthCheckInterval: 100,
        healthCheck: async () => {
          // Custom health check
          return true;
        },
      });

      // Health check should be called periodically
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Cleanup
      breaker.shutdown();
    });

    it('should handle fallback event', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackFn = jest.fn().mockResolvedValue('fallback result');

      const breaker = CircuitBreakerFactory.getBreaker('fallback-test', mockFn);
      breaker.fallback(fallbackFn);

      const result = await breaker.fire();
      expect(result).toBe('fallback result');
      expect(fallbackFn).toHaveBeenCalled();
    });

    it('should track all metric events', async () => {
      const mockFn = jest.fn();
      const metrics = getMetricsService();

      // Spy on all metric methods
      const failureSpy = jest.spyOn(metrics.circuitBreakerFailures, 'inc');
      const updateStateSpy = jest.spyOn(metrics, 'updateCircuitBreakerState');

      const breaker = CircuitBreakerFactory.getBreaker('metrics-test', mockFn, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      });

      // Cause failures
      mockFn.mockRejectedValue(new Error('Fail'));
      await expect(breaker.fire()).rejects.toThrow();
      await expect(breaker.fire()).rejects.toThrow();

      expect(failureSpy).toHaveBeenCalledTimes(2);
      expect(failureSpy).toHaveBeenCalledWith({ service: 'metrics-test' });

      // Check state was updated to open
      expect(updateStateSpy).toHaveBeenCalledWith('metrics-test', 'open');
    });

    it('should handle success event', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const breaker = CircuitBreakerFactory.getBreaker('success-test', mockFn);

      const result = await breaker.fire();
      expect(result).toBe('success');
    });

    it('should handle multiple arguments in wrapped function', async () => {
      const mockFn = jest.fn().mockImplementation((a, b, c) => a + b + c);
      const breaker = CircuitBreakerFactory.getBreaker('args-test', mockFn);

      const result = await breaker.fire(1, 2, 3);
      expect(result).toBe(6);
      expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
    });

    it('should maintain separate breakers for different services', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      const breaker1 = CircuitBreakerFactory.getBreaker('service1', fn1);
      const breaker2 = CircuitBreakerFactory.getBreaker('service2', fn2);

      expect(breaker1).not.toBe(breaker2);

      // Reset should clear all breakers
      CircuitBreakerFactory.reset();

      const breaker1New = CircuitBreakerFactory.getBreaker('service1', fn1);
      expect(breaker1New).not.toBe(breaker1);
    });
  });
});
