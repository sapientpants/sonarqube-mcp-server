import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { CircuitBreakerFactory } from '../circuit-breaker.js';
import {
  metricsMiddleware,
  trackPermissionDenial,
  trackCircuitBreakerFailure,
} from '../middleware.js';
import { getMetricsService, cleanupMetricsService } from '../metrics.js';
import { getTracer, addSpanAttributes, addSpanEvent } from '../tracing.js';
import type { Request, Response } from 'express';

describe('Additional Monitoring Coverage', () => {
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

  describe('Circuit Breaker - Error Scenarios', () => {
    it('should handle circuit breaker timeout', async () => {
      const slowFunction = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));

      const breaker = CircuitBreakerFactory.getBreaker('timeout-test', slowFunction, {
        timeout: 50,
        errorThresholdPercentage: 50,
        resetTimeout: 100,
      });

      await expect(breaker.fire()).rejects.toThrow('Timed out after 50ms');
    });

    it('should handle circuit breaker with custom error filter', async () => {
      const errorFunction = jest.fn().mockRejectedValue(new Error('Custom error'));

      const breaker = CircuitBreakerFactory.getBreaker('error-filter-test', errorFunction, {
        errorFilter: (error) => error.message !== 'Custom error',
      });

      // This error should not count as a failure due to filter
      await expect(breaker.fire()).rejects.toThrow('Custom error');
      expect(breaker.opened).toBe(false);
    });

    it('should handle multiple circuit breakers for different services', () => {
      const fn1 = jest.fn().mockResolvedValue('result1');
      const fn2 = jest.fn().mockResolvedValue('result2');

      const breaker1 = CircuitBreakerFactory.getBreaker('service1', fn1);
      const breaker2 = CircuitBreakerFactory.getBreaker('service2', fn2);

      expect(breaker1).not.toBe(breaker2);

      // Getting the same breaker again should return the existing one
      const breaker1Again = CircuitBreakerFactory.getBreaker('service1', fn1);
      expect(breaker1).toBe(breaker1Again);
    });

    it('should emit circuit breaker events and update metrics', async () => {
      const metrics = getMetricsService();
      const updateSpy = jest.spyOn(metrics, 'updateCircuitBreakerState');
      jest.spyOn(metrics.circuitBreakerFailures, 'inc');

      const errorFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      const breaker = CircuitBreakerFactory.getBreaker('event-test', errorFunction, {
        errorThresholdPercentage: 50,
        volumeThreshold: 2,
      });

      // First failure
      await expect(breaker.fire()).rejects.toThrow('Test error');

      // Second failure should open the circuit
      await expect(breaker.fire()).rejects.toThrow('Test error');

      // Circuit should be open
      expect(updateSpy).toHaveBeenCalledWith('event-test', 'open');
    });
  });

  describe('Middleware - Additional Coverage', () => {
    it('should handle non-MCP requests in metrics middleware', async () => {
      const metrics = getMetricsService();
      const httpRequestsSpy = jest.spyOn(metrics.httpRequestsTotal, 'inc');

      const middleware = metricsMiddleware();
      const req = {
        method: 'GET',
        path: '/api/test',
        route: { path: '/api/:resource' },
        get: jest.fn(),
      } as unknown as Request;

      const res = {
        statusCode: 200,
        end: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      // Mock the original end function

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate response end
      res.end();

      expect(httpRequestsSpy).toHaveBeenCalledWith({
        method: 'GET',
        endpoint: '/api/:resource',
        status: '200',
      });
    });

    it('should track permission denials', () => {
      trackPermissionDenial('user123', 'project456', 'write');

      // Just verify it doesn't throw - the metric is tracked internally
      expect(() => trackPermissionDenial('user123', 'project456', 'write')).not.toThrow();
    });

    it('should track circuit breaker failures', () => {
      const metrics = getMetricsService();
      const failureSpy = jest.spyOn(metrics.circuitBreakerFailures, 'inc');

      trackCircuitBreakerFailure('test-service');

      expect(failureSpy).toHaveBeenCalledWith({
        service: 'test-service',
      });
    });

    it('should handle requests without route in middleware', () => {
      const middleware = metricsMiddleware();
      const req = {
        method: 'POST',
        path: '/unknown',
        get: jest.fn(),
      } as unknown as Request;

      const res = {
        statusCode: 404,
        end: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate response end
      res.end();

      // Should use the path as endpoint when route is not available
      // Just verify it completed without throwing
      expect(() => res.end()).not.toThrow();
    });
  });

  describe('Tracing - Additional Coverage', () => {
    it('should get tracer with default name', () => {
      const tracer = getTracer();
      expect(tracer).toBeDefined();
    });

    it('should get tracer with custom name', () => {
      const tracer = getTracer('custom-service');
      expect(tracer).toBeDefined();
    });

    it('should handle span attributes when no active span', () => {
      // Mock trace API to return no active span
      const mockTrace = {
        getActiveSpan: jest.fn().mockReturnValue(null),
      };
      jest.doMock('@opentelemetry/api', () => ({
        trace: mockTrace,
      }));

      // This should not throw
      expect(() => addSpanAttributes({ key: 'value' })).not.toThrow();
    });

    it('should handle span events when no active span', () => {
      // Mock trace API to return no active span
      const mockTrace = {
        getActiveSpan: jest.fn().mockReturnValue(null),
      };
      jest.doMock('@opentelemetry/api', () => ({
        trace: mockTrace,
      }));

      // This should not throw
      expect(() => addSpanEvent('test-event', { key: 'value' })).not.toThrow();
    });

    it('should convert various attribute types in addSpanAttributes', () => {
      // Just verify the function exists and doesn't throw with various types
      expect(() =>
        addSpanAttributes({
          string: 'value',
          number: 123,
          boolean: true,
          object: { nested: 'value' },
          nullValue: null,
          undefinedValue: undefined,
        })
      ).not.toThrow();
    });

    it('should add span event without attributes', () => {
      // Just verify the function exists and doesn't throw
      expect(() => addSpanEvent('test-event')).not.toThrow();
    });
  });
});
