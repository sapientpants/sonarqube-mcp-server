import { SonarQubeAPIError, formatErrorForMCP } from '../errors.js';
import { createLogger } from './logger.js';

const logger = createLogger('utils/error-handler');

/**
 * Wraps an async MCP handler function with error handling that converts
 * SonarQubeAPIError instances to MCP-formatted errors
 *
 * @param fn The async function to wrap
 * @returns A wrapped function that handles errors appropriately
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withMCPErrorHandling<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof SonarQubeAPIError) {
        logger.error('SonarQube API error occurred', error);
        throw formatErrorForMCP(error);
      }
      // Re-throw non-SonarQubeAPIError errors as-is
      throw error;
    }
  }) as T;
}
