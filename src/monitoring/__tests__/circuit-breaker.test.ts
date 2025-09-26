import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreakerFactory } from '../circuit-breaker.js';
import { getMetricsService, cleanupMetricsService } from '../metrics.js';

describe('Circuit Breaker', () => {
  let mockFn: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<unknown>>>;
  let metricsService: ReturnType<typeof getMetricsService>;

  beforeEach(() => {
    // Reset circuit breaker factory
    CircuitBreakerFactory.reset();
    cleanupMetricsService();
    metricsService = getMetricsService();

    mockFn = vi.fn<(...args: unknown[]) => Promise<unknown>>();
  });

  afterEach(() => {
    CircuitBreakerFactory.reset();
    cleanupMetricsService();
  });

  describe('Basic functionality', () => {
    it('should execute function when circuit is closed', async () => {
      mockFn.mockResolvedValue('success');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);
      const result = await breaker.fire();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the wrapped function', async () => {
      mockFn.mockImplementation((...args: unknown[]) => Promise.resolve(`${args[0]}-${args[1]}`));

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);
      const result = await breaker.fire('test', 123);

      expect(result).toBe('test-123');
      expect(mockFn).toHaveBeenCalledWith('test', 123);
    });

    it('should reuse the same breaker for the same name', () => {
      const breaker1 = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);
      const breaker2 = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);

      expect(breaker1).toBe(breaker2);
    });

    it('should create different breakers for different names', () => {
      const breaker1 = CircuitBreakerFactory.getBreaker('breaker-1', mockFn);
      const breaker2 = CircuitBreakerFactory.getBreaker('breaker-2', mockFn);

      expect(breaker1).not.toBe(breaker2);
    });
  });

  describe('Circuit opening behavior', () => {
    it('should open circuit after threshold failures', async () => {
      mockFn.mockRejectedValue(new Error('Service unavailable'));

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        volumeThreshold: 2,
      });

      // First two failures should open the circuit
      await expect(breaker.fire()).rejects.toThrow('Service unavailable');
      await expect(breaker.fire()).rejects.toThrow('Service unavailable');

      // Circuit should now be open
      await expect(breaker.fire()).rejects.toThrow('Breaker is open');

      // Function should not be called when circuit is open
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not open circuit if failures are below threshold', async () => {
      let callCount = 0;
      mockFn.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve('success');
      });

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        resetTimeout: 100,
        volumeThreshold: 3,
      });

      // One failure, two successes - should not open
      await expect(breaker.fire()).rejects.toThrow('Temporary failure');
      await expect(breaker.fire()).resolves.toBe('success');
      await expect(breaker.fire()).resolves.toBe('success');

      // Circuit should still be closed
      await expect(breaker.fire()).resolves.toBe('success');
    });
  });

  describe('Circuit recovery behavior', () => {
    it('should move to half-open state after timeout', async () => {
      mockFn.mockRejectedValueOnce(new Error('Failure 1'));
      mockFn.mockRejectedValueOnce(new Error('Failure 2'));
      mockFn.mockResolvedValue('recovered');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        resetTimeout: 50, // 50ms reset timeout
        volumeThreshold: 2,
      });

      // Open the circuit
      await expect(breaker.fire()).rejects.toThrow('Failure 1');
      await expect(breaker.fire()).rejects.toThrow('Failure 2');

      // Circuit is open
      await expect(breaker.fire()).rejects.toThrow('Breaker is open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Circuit should be half-open, allowing one request
      await expect(breaker.fire()).resolves.toBe('recovered');

      // Circuit should be closed again
      await expect(breaker.fire()).resolves.toBe('recovered');
    });

    it('should re-open circuit if half-open test fails', async () => {
      mockFn.mockRejectedValue(new Error('Persistent failure'));

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        resetTimeout: 50,
        volumeThreshold: 2,
      });

      // Open the circuit
      await expect(breaker.fire()).rejects.toThrow('Persistent failure');
      await expect(breaker.fire()).rejects.toThrow('Persistent failure');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Half-open test should fail and re-open circuit
      await expect(breaker.fire()).rejects.toThrow('Persistent failure');

      // Circuit should be open again
      await expect(breaker.fire()).rejects.toThrow('Breaker is open');
    });
  });

  describe('Metrics integration', () => {
    it('should track circuit breaker metrics', async () => {
      mockFn.mockResolvedValueOnce('success');
      mockFn.mockRejectedValueOnce(new Error('failure'));
      mockFn.mockResolvedValueOnce('success');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);

      await breaker.fire();
      await expect(breaker.fire()).rejects.toThrow('failure');
      await breaker.fire();

      const metrics = metricsService.getMetrics();

      // Check for circuit breaker metrics - the breaker tracks failures
      expect(metrics).toContain('mcp_circuit_breaker_failures_total{service="test-breaker"} 1');
    });

    it('should track circuit state changes', async () => {
      mockFn.mockRejectedValue(new Error('Service down'));

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        resetTimeout: 50,
        volumeThreshold: 2,
      });

      // Open the circuit
      await expect(breaker.fire()).rejects.toThrow();
      await expect(breaker.fire()).rejects.toThrow();

      // Check metrics for open state
      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('mcp_circuit_breaker_state{service="test-breaker"} 1');
    });
  });

  describe('Custom options', () => {
    it('should respect custom timeout', async () => {
      let timeoutId: NodeJS.Timeout;
      mockFn.mockImplementation(
        () =>
          new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve('slow'), 200);
          })
      );

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        timeout: 100, // 100ms timeout
      });

      // Should timeout
      await expect(breaker.fire()).rejects.toThrow('Timed out');

      // Clean up the timeout to prevent open handle
      if (timeoutId!) {
        clearTimeout(timeoutId);
      }
    });

    it('should respect custom error filter', async () => {
      // The errorFilter should return true for errors that should be counted
      mockFn.mockRejectedValueOnce(new Error('Network error'));
      mockFn.mockRejectedValueOnce(new Error('Timeout error'));
      mockFn.mockResolvedValue('success');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
        // Only count network errors toward circuit opening
        errorFilter: (err: Error) => err.message.includes('Network'),
      });

      // Network error should count
      await expect(breaker.fire()).rejects.toThrow('Network error');

      // Timeout error should NOT count (filtered out)
      await expect(breaker.fire()).rejects.toThrow('Timeout error');

      // Circuit should still be closed because only 1 error counted
      await expect(breaker.fire()).resolves.toBe('success');
    });
  });

  describe('Error handling', () => {
    it('should handle synchronous errors', async () => {
      mockFn.mockImplementation(() => {
        throw new Error('Sync error');
      });

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);

      await expect(breaker.fire()).rejects.toThrow('Sync error');
    });

    it('should handle different error types', async () => {
      const customError = { code: 'CUSTOM_ERROR', message: 'Custom error' };
      mockFn.mockRejectedValue(customError);

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);

      await expect(breaker.fire()).rejects.toEqual(customError);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent requests', async () => {
      let resolveCount = 0;
      mockFn.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        resolveCount++;
        return `result-${resolveCount}`;
      });

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);

      // Fire multiple concurrent requests
      const results = await Promise.all([breaker.fire(), breaker.fire(), breaker.fire()]);

      expect(results).toHaveLength(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });
});
