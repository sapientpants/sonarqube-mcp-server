import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SonarQubeAPIError,
  SonarQubeErrorType,
  transformError,
  withErrorHandling,
  formatErrorForMCP,
} from '../errors.js';
import {
  SonarQubeError as SonarQubeClientError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  ServerError,
  ValidationError,
} from 'sonarqube-web-api-client';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('Error Handling', () => {
  describe('SonarQubeAPIError', () => {
    it('should create error with all properties', () => {
      const error = new SonarQubeAPIError('Test error', SonarQubeErrorType.AUTHENTICATION_FAILED, {
        operation: 'test-operation',
        statusCode: 401,
        context: { key: 'value' },
        solution: 'Test solution',
      });

      expect(error.message).toBe('Test error');
      expect(error.type).toBe(SonarQubeErrorType.AUTHENTICATION_FAILED);
      expect(error.operation).toBe('test-operation');
      expect(error.statusCode).toBe(401);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.solution).toBe('Test solution');
    });

    it('should format error as string with all details', () => {
      const error = new SonarQubeAPIError('Test error', SonarQubeErrorType.AUTHENTICATION_FAILED, {
        operation: 'test-operation',
        statusCode: 401,
        context: { key: 'value' },
        solution: 'Test solution',
      });

      const result = error.toString();
      expect(result).toContain('Error: Test error');
      expect(result).toContain('Operation: test-operation');
      expect(result).toContain('Status Code: 401');
      expect(result).toContain('Solution: Test solution');
      expect(result).toContain('Context:');
      expect(result).toContain('"key": "value"');
    });

    it('should format error without optional fields', () => {
      const error = new SonarQubeAPIError('Test error', SonarQubeErrorType.UNKNOWN_ERROR);
      const result = error.toString();
      expect(result).toBe('Error: Test error');
    });
  });

  describe('transformError', () => {
    it('should return existing SonarQubeAPIError unchanged', () => {
      const originalError = new SonarQubeAPIError(
        'Original error',
        SonarQubeErrorType.AUTHENTICATION_FAILED
      );
      const result = transformError(originalError, 'test-operation');
      expect(result).toBe(originalError);
    });

    it('should transform AuthenticationError', () => {
      const clientError = new AuthenticationError('Auth failed');
      const result = transformError(clientError, 'test-operation');

      expect(result).toBeInstanceOf(SonarQubeAPIError);
      expect(result.type).toBe(SonarQubeErrorType.AUTHENTICATION_FAILED);
      expect(result.message).toBe('Auth failed');
      expect(result.solution).toContain('check your SONARQUBE_TOKEN');
    });

    it('should transform AuthorizationError', () => {
      const clientError = new AuthorizationError('Access denied');
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.AUTHORIZATION_FAILED);
      expect(result.solution).toContain('required permissions');
    });

    it('should transform NotFoundError', () => {
      const clientError = new NotFoundError('Not found');
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.RESOURCE_NOT_FOUND);
      expect(result.solution).toContain('Verify the project key');
    });

    it('should transform RateLimitError', () => {
      const clientError = new RateLimitError('Rate limited');
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.RATE_LIMITED);
      expect(result.solution).toContain('wait before retrying');
    });

    it('should transform NetworkError', () => {
      const clientError = new NetworkError('Network error');
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.NETWORK_ERROR);
      expect(result.solution).toContain('Check your network connection');
    });

    it('should transform ServerError', () => {
      const clientError = new ServerError('Server error', 500);
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.SERVER_ERROR);
      expect(result.solution).toContain('server is experiencing issues');
    });

    it('should transform ValidationError', () => {
      const clientError = new ValidationError('Validation error');
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.VALIDATION_ERROR);
      expect(result.solution).toContain('check your request parameters');
    });

    it('should transform unknown SonarQubeClientError', () => {
      class UnknownError extends SonarQubeClientError {
        constructor(message: string) {
          super(message, 'UNKNOWN');
        }
      }
      const clientError = new UnknownError('Unknown error');
      const result = transformError(clientError, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.UNKNOWN_ERROR);
    });

    it('should transform generic Error', () => {
      const error = new Error('Generic error');
      const result = transformError(error, 'test-operation');

      expect(result.type).toBe(SonarQubeErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe('Generic error');
    });

    it('should transform non-Error values', () => {
      const result = transformError('String error', 'test-operation');
      expect(result.type).toBe(SonarQubeErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe('String error');
    });
  });

  describe('withErrorHandling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return successful result without retry', async () => {
      const apiCall = vi.fn<() => Promise<string>>().mockResolvedValue('success');
      const result = await withErrorHandling('test-operation', apiCall);

      expect(result).toBe('success');
      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit error', async () => {
      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new RateLimitError('Rate limited'))
        .mockRejectedValueOnce(new RateLimitError('Rate limited'))
        .mockResolvedValue('success');

      const promise = withErrorHandling('test-operation', apiCall);

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(apiCall).toHaveBeenCalledTimes(3);
    });

    it('should retry on network error', async () => {
      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new NetworkError('Network error'))
        .mockResolvedValue('success');

      const promise = withErrorHandling('test-operation', apiCall);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBe('success');
      expect(apiCall).toHaveBeenCalledTimes(2);
    });

    it('should retry on server error', async () => {
      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new ServerError('Server error', 500))
        .mockResolvedValue('success');

      const promise = withErrorHandling('test-operation', apiCall);

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBe('success');
      expect(apiCall).toHaveBeenCalledTimes(2);
    });

    it('should not retry on authentication error', async () => {
      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(new AuthenticationError('Auth failed'));

      await expect(withErrorHandling('test-operation', apiCall)).rejects.toThrow(SonarQubeAPIError);

      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(new RateLimitError('Rate limited'));

      // Run the test with real timers since fake timers are problematic with async/await
      vi.useRealTimers();

      const promise = withErrorHandling('test-operation', apiCall, {
        maxRetries: 3,
        initialDelay: 1,
        maxDelay: 10,
      });

      await expect(promise).rejects.toThrow(SonarQubeAPIError);
      expect(apiCall).toHaveBeenCalledTimes(4); // Initial + 3 retries

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should use exponential backoff', async () => {
      // Track delays used
      let delays: number[] = [];

      vi.useRealTimers();

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn: () => void, delay?: number) => {
        if (delay !== undefined) delays.push(delay);
        return originalSetTimeout(fn, 0); // Execute immediately
      }) as unknown as typeof global.setTimeout;

      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(new RateLimitError('Rate limited'));

      await expect(
        withErrorHandling('test-operation', apiCall, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
        })
      ).rejects.toThrow();

      // Verify exponential backoff pattern
      expect(delays).toEqual([1000, 2000, 4000]);
      expect(apiCall).toHaveBeenCalledTimes(4);

      // Restore
      global.setTimeout = originalSetTimeout;
      vi.useFakeTimers();
    });

    it('should respect max delay', async () => {
      // Track delays used
      let delays: number[] = [];

      vi.useRealTimers();

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((fn: () => void, delay?: number) => {
        if (delay !== undefined) delays.push(delay);
        return originalSetTimeout(fn, 0); // Execute immediately
      }) as unknown as typeof global.setTimeout;

      const apiCall = vi
        .fn<() => Promise<string>>()
        .mockRejectedValue(new RateLimitError('Rate limited'));

      await expect(
        withErrorHandling('test-operation', apiCall, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 2000,
        })
      ).rejects.toThrow();

      // Verify delays are capped at maxDelay
      expect(delays).toEqual([1000, 2000, 2000]); // 2nd and 3rd retry capped at 2000ms
      expect(apiCall).toHaveBeenCalledTimes(4);

      // Restore
      global.setTimeout = originalSetTimeout;
      vi.useFakeTimers();
    });

    it('should pass through non-SonarQubeClientError unchanged', async () => {
      const customError = new Error('Custom error');
      const apiCall = vi.fn<() => Promise<string>>().mockRejectedValue(customError);

      await expect(withErrorHandling('test-operation', apiCall)).rejects.toThrow(customError);
      expect(apiCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatErrorForMCP', () => {
    it('should format authentication error', () => {
      const error = new SonarQubeAPIError('Auth failed', SonarQubeErrorType.AUTHENTICATION_FAILED);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32001);
      expect(result.message).toContain('Auth failed');
    });

    it('should format authorization error', () => {
      const error = new SonarQubeAPIError('Access denied', SonarQubeErrorType.AUTHORIZATION_FAILED);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32002);
    });

    it('should format resource not found error', () => {
      const error = new SonarQubeAPIError('Not found', SonarQubeErrorType.RESOURCE_NOT_FOUND);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32003);
    });

    it('should format rate limit error', () => {
      const error = new SonarQubeAPIError('Rate limited', SonarQubeErrorType.RATE_LIMITED);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32004);
    });

    it('should format network error', () => {
      const error = new SonarQubeAPIError('Network error', SonarQubeErrorType.NETWORK_ERROR);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32005);
    });

    it('should format configuration error', () => {
      const error = new SonarQubeAPIError('Config error', SonarQubeErrorType.CONFIGURATION_ERROR);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32006);
    });

    it('should format validation error', () => {
      const error = new SonarQubeAPIError('Validation error', SonarQubeErrorType.VALIDATION_ERROR);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32007);
    });

    it('should format server error', () => {
      const error = new SonarQubeAPIError('Server error', SonarQubeErrorType.SERVER_ERROR);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32008);
    });

    it('should format unknown error', () => {
      const error = new SonarQubeAPIError('Unknown error', SonarQubeErrorType.UNKNOWN_ERROR);
      const result = formatErrorForMCP(error);

      expect(result.code).toBe(-32000);
    });

    it('should include full error details in message', () => {
      const error = new SonarQubeAPIError('Test error', SonarQubeErrorType.AUTHENTICATION_FAILED, {
        operation: 'test-op',
        solution: 'Test solution',
      });
      const result = formatErrorForMCP(error);

      expect(result.message).toContain('Test error');
      expect(result.message).toContain('test-op');
      expect(result.message).toContain('Test solution');
    });
  });
});
