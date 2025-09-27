import { describe, it, expect, vi } from 'vitest';
import { withMCPErrorHandling } from '../utils/error-handler.js';
import { SonarQubeAPIError, SonarQubeErrorType } from '../errors.js';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    error: vi.fn(),
  }),
}));

describe('Error Handler Utilities', () => {
  describe('withMCPErrorHandling', () => {
    it('should return result on success', async () => {
      const fn = vi
        .fn<(arg1: string, arg2: string) => Promise<{ content: string }>>()
        .mockResolvedValue({ content: 'success' });
      const wrapped = withMCPErrorHandling(fn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toEqual({ content: 'success' });
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should convert SonarQubeAPIError to MCP format', async () => {
      const apiError = new SonarQubeAPIError(
        'Test error',
        SonarQubeErrorType.AUTHENTICATION_FAILED,
        {
          operation: 'test-op',
          statusCode: undefined,
          context: undefined,
          solution: 'Test solution',
        }
      );
      const fn = vi.fn<() => Promise<any>>().mockRejectedValue(apiError);
      const wrapped = withMCPErrorHandling(fn);

      await expect(wrapped()).rejects.toMatchObject({
        code: -32001,
        message: expect.stringContaining('Test error'),
      });
    });

    it('should re-throw non-SonarQubeAPIError', async () => {
      const error = new Error('Generic error');
      const fn = vi.fn<() => Promise<any>>().mockRejectedValue(error);
      const wrapped = withMCPErrorHandling(fn);

      await expect(wrapped()).rejects.toThrow(error);
    });

    it('should preserve function signature', async () => {
      const fn = vi.fn((a: string, b: number) => Promise.resolve({ result: a + b }));
      const wrapped = withMCPErrorHandling(fn);

      const result = await wrapped('test', 123);

      expect(result).toEqual({ result: 'test123' });
      expect(fn).toHaveBeenCalledWith('test', 123);
    });

    it('should handle all error types correctly', async () => {
      const errorTypes = [
        { type: SonarQubeErrorType.AUTHENTICATION_FAILED, code: -32001 },
        { type: SonarQubeErrorType.AUTHORIZATION_FAILED, code: -32002 },
        { type: SonarQubeErrorType.RESOURCE_NOT_FOUND, code: -32003 },
        { type: SonarQubeErrorType.RATE_LIMITED, code: -32004 },
        { type: SonarQubeErrorType.NETWORK_ERROR, code: -32005 },
        { type: SonarQubeErrorType.CONFIGURATION_ERROR, code: -32006 },
        { type: SonarQubeErrorType.VALIDATION_ERROR, code: -32007 },
        { type: SonarQubeErrorType.SERVER_ERROR, code: -32008 },
        { type: SonarQubeErrorType.UNKNOWN_ERROR, code: -32000 },
      ];

      for (const { type, code } of errorTypes) {
        const error = new SonarQubeAPIError(`${type} error`, type);
        const fn = vi.fn<() => Promise<any>>().mockRejectedValue(error);
        const wrapped = withMCPErrorHandling(fn);

        await expect(wrapped()).rejects.toMatchObject({
          code,
          message: expect.stringContaining(`${type} error`),
        });
      }
    });
  });
});
