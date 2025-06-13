import { describe, it, expect, jest } from '@jest/globals';
import { withMCPErrorHandling } from '../utils/error-handler.js';
import { SonarQubeAPIError, SonarQubeErrorType } from '../errors.js';

// Mock the logger
jest.unstable_mockModule('../utils/logger.js', () => ({
  createLogger: () => ({
    error: jest.fn(),
  }),
}));

describe('Error Handler Utilities', () => {
  describe('withMCPErrorHandling', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue({ content: 'success' });
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
          solution: 'Test solution',
        }
      );
      const fn = jest.fn().mockRejectedValue(apiError);
      const wrapped = withMCPErrorHandling(fn);

      await expect(wrapped()).rejects.toEqual({
        code: -32001,
        message: expect.stringContaining('Test error'),
      });
    });

    it('should re-throw non-SonarQubeAPIError', async () => {
      const error = new Error('Generic error');
      const fn = jest.fn().mockRejectedValue(error);
      const wrapped = withMCPErrorHandling(fn);

      await expect(wrapped()).rejects.toThrow(error);
    });

    it('should preserve function signature', async () => {
      const fn = jest.fn(async (a: string, b: number) => ({ result: a + b }));
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
        const fn = jest.fn().mockRejectedValue(error);
        const wrapped = withMCPErrorHandling(fn);

        await expect(wrapped()).rejects.toEqual({
          code,
          message: expect.stringContaining(`${type} error`),
        });
      }
    });
  });
});
