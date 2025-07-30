import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { withRetry, makeRetryable } from '../../utils/retry.js';

// Mock logger to prevent console output during tests
jest.mock('../../utils/logger.js', () => ({
  createLogger: () => ({
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Retry Utilities', () => {
  let mockFn: jest.Mock;

  beforeEach(() => {
    mockFn = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      mockFn.mockResolvedValue('success');

      const result = await withRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and eventually succeed', async () => {
      mockFn
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxAttempts: 4 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts with retryable error', async () => {
      mockFn.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(withRetry(mockFn, { maxAttempts: 2 })).rejects.toThrow('ECONNREFUSED');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      mockFn.mockRejectedValue(new Error('Invalid input'));

      await expect(withRetry(mockFn)).rejects.toThrow('Invalid input');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect custom maxAttempts', async () => {
      mockFn.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(withRetry(mockFn, { maxAttempts: 1 })).rejects.toThrow('ECONNREFUSED');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff with default settings', async () => {
      jest.useFakeTimers();

      mockFn
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      const promise = withRetry(mockFn);

      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for first retry delay (1000ms)
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Wait for second retry delay (2000ms)
      await jest.advanceTimersByTimeAsync(2000);
      expect(mockFn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');

      jest.useRealTimers();
    });

    it('should respect custom delay settings', async () => {
      jest.useFakeTimers();

      mockFn.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValue('success');

      const promise = withRetry(mockFn, {
        initialDelay: 500,
        backoffMultiplier: 3,
      });

      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(500);
      expect(mockFn).toHaveBeenCalledTimes(2);

      const result = await promise;
      expect(result).toBe('success');

      jest.useRealTimers();
    });

    it('should respect maxDelay setting', async () => {
      jest.useFakeTimers();

      mockFn
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      const promise = withRetry(mockFn, {
        initialDelay: 1000,
        backoffMultiplier: 10,
        maxDelay: 1500,
      });

      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // First retry: 1000ms
      await jest.advanceTimersByTimeAsync(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Second retry: should be capped at maxDelay (1500ms), not 10000ms
      await jest.advanceTimersByTimeAsync(1500);
      expect(mockFn).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');

      jest.useRealTimers();
    });

    it('should use custom shouldRetry function', async () => {
      const customShouldRetry = jest.fn((error: Error) => error.message.includes('retry-me'));

      mockFn.mockRejectedValueOnce(new Error('retry-me please')).mockResolvedValue('success');

      const result = await withRetry(mockFn, { shouldRetry: customShouldRetry });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(customShouldRetry).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'retry-me please' }),
        1
      );
    });

    it('should not retry when custom shouldRetry returns false', async () => {
      const customShouldRetry = jest.fn(() => false);

      mockFn.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(withRetry(mockFn, { shouldRetry: customShouldRetry })).rejects.toThrow(
        'ECONNREFUSED'
      );
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(customShouldRetry).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ECONNREFUSED' }),
        1
      );
    });

    describe('default shouldRetry behavior', () => {
      it('should retry on ECONNREFUSED', async () => {
        mockFn.mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValue('success');

        const result = await withRetry(mockFn);
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it('should retry on ETIMEDOUT', async () => {
        mockFn.mockRejectedValueOnce(new Error('ETIMEDOUT')).mockResolvedValue('success');

        const result = await withRetry(mockFn);
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it('should retry on ENOTFOUND', async () => {
        mockFn.mockRejectedValueOnce(new Error('ENOTFOUND')).mockResolvedValue('success');

        const result = await withRetry(mockFn);
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it('should retry on ECONNRESET', async () => {
        mockFn.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValue('success');

        const result = await withRetry(mockFn);
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it('should retry on socket hang up', async () => {
        mockFn.mockRejectedValueOnce(new Error('socket hang up')).mockResolvedValue('success');

        const result = await withRetry(mockFn);
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it('should retry on 5xx errors', async () => {
        mockFn
          .mockRejectedValueOnce(new Error('HTTP 500 Internal Server Error'))
          .mockResolvedValue('success');

        const result = await withRetry(mockFn);
        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
      });

      it('should not retry on 4xx errors', async () => {
        mockFn.mockRejectedValue(new Error('HTTP 404 Not Found'));

        await expect(withRetry(mockFn)).rejects.toThrow('HTTP 404 Not Found');
        expect(mockFn).toHaveBeenCalledTimes(1);
      });

      it('should not retry on generic errors', async () => {
        mockFn.mockRejectedValue(new Error('Invalid input'));

        await expect(withRetry(mockFn)).rejects.toThrow('Invalid input');
        expect(mockFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('makeRetryable', () => {
    it('should create a retryable version of a function', async () => {
      const originalFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      const retryableFn = makeRetryable(originalFn);
      const result = await retryableFn();

      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments correctly', async () => {
      const originalFn = jest.fn().mockResolvedValue('success');
      const retryableFn = makeRetryable(originalFn);

      const result = await retryableFn('arg1', 'arg2', 123);

      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should work with functions that have return types', async () => {
      const originalFn = jest.fn<(x: number) => Promise<string>>().mockResolvedValue('result');

      const retryableFn = makeRetryable(originalFn, { maxAttempts: 2 });
      const result = await retryableFn(42);

      expect(result).toBe('result');
      expect(originalFn).toHaveBeenCalledWith(42);
    });

    it('should use custom retry options', async () => {
      const originalFn = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const retryableFn = makeRetryable(originalFn, { maxAttempts: 1 });

      await expect(retryableFn()).rejects.toThrow('ECONNREFUSED');
      expect(originalFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error objects by wrapping them in TypeError', async () => {
      mockFn.mockRejectedValue('string error');

      await expect(withRetry(mockFn)).rejects.toThrow(TypeError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle null errors by wrapping them in TypeError', async () => {
      mockFn.mockRejectedValue(null);

      await expect(withRetry(mockFn)).rejects.toThrow(TypeError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined errors by wrapping them in TypeError', async () => {
      mockFn.mockRejectedValue(undefined);

      await expect(withRetry(mockFn)).rejects.toThrow(TypeError);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
