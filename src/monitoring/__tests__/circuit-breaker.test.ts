import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { CircuitBreakerFactory } from '../circuit-breaker.js';
import { getMetricsService, cleanupMetricsService } from '../metrics.js';

describe('Circuit Breaker', () => {
  let mockFn: jest.Mock;
  let metricsService: ReturnType<typeof getMetricsService>;

  beforeEach(() => {
    // Reset circuit breaker factory
    CircuitBreakerFactory.reset();
    cleanupMetricsService();
    metricsService = getMetricsService();

    mockFn = jest.fn();
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
      mockFn.mockImplementation(async (a: string, b: number) => `${a}-${b}`);

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
      mockFn.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        return 'success';
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
      mockFn
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('recovered');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        resetTimeout: 50, // 50ms reset timeout
        volumeThreshold: 2,
      });

      // Open the circuit
      await expect(breaker.fire()).rejects.toThrow('Failure 1');
      await expect(breaker.fire()).rejects.toThrow('Failure 2');

      // Circuit is open
      await expect(breaker.fire()).rejects.toThrow('Breaker is OPEN');

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
      mockFn
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValueOnce('success');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn);

      await breaker.fire();
      await expect(breaker.fire()).rejects.toThrow('failure');
      await breaker.fire();

      const metrics = await metricsService.getMetrics();

      // Check for circuit breaker metrics
      expect(metrics).toContain(
        'circuit_breaker_requests_total{name="test-breaker",state="success"} 2'
      );
      expect(metrics).toContain(
        'circuit_breaker_requests_total{name="test-breaker",state="failure"} 1'
      );
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
      const metrics = await metricsService.getMetrics();
      expect(metrics).toContain('circuit_breaker_state{name="test-breaker",state="open"} 1');
    });
  });

  describe('Custom options', () => {
    it('should respect custom timeout', async () => {
      mockFn.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('slow'), 200))
      );

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        timeout: 100, // 100ms timeout
      });

      // Should timeout
      await expect(breaker.fire()).rejects.toThrow('Request timeout');
    });

    it('should respect custom error filter', async () => {
      mockFn
        .mockRejectedValueOnce(new Error('Ignorable error'))
        .mockRejectedValueOnce(new Error('Critical error'))
        .mockResolvedValue('success');

      const breaker = CircuitBreakerFactory.getBreaker('test-breaker', mockFn, {
        errorThresholdPercentage: 50,
        volumeThreshold: 1,
        errorFilter: (err: Error) => !err.message.includes('Ignorable'),
      });

      // Ignorable error should not count
      await expect(breaker.fire()).rejects.toThrow('Ignorable error');

      // Circuit should still be closed
      await expect(breaker.fire()).rejects.toThrow('Critical error');

      // Now circuit should be open
      await expect(breaker.fire()).rejects.toThrow('Breaker is OPEN');
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
