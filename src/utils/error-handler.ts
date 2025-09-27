import { SonarQubeAPIError, formatErrorForMCP } from '../errors.js';
import { createLogger } from './logger.js';

const logger = createLogger('utils/error-handler');

/**
 * Custom error class for MCP errors that includes a code property
 */
class MCPError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
  }
}

/**
 * Wraps an async MCP handler function with error handling that converts
 * SonarQubeAPIError instances to MCP-formatted errors
 *
 * @param fn The async function to wrap
 * @returns A wrapped function that handles errors appropriately
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withMCPErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> extends Promise<infer U> ? U : never> => {
    try {
      return (await fn(...args)) as ReturnType<T> extends Promise<infer U> ? U : never;
    } catch (error) {
      if (error instanceof SonarQubeAPIError) {
        logger.error('SonarQube API error occurred', error);
        const mcpError = formatErrorForMCP(error);
        throw new MCPError(mcpError.message, mcpError.code);
      }
      // Re-throw non-SonarQubeAPIError errors as-is
      throw error;
    }
  }) as T;
}
