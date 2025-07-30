import { SonarQubeClient as WebApiClient } from 'sonarqube-web-api-client';
import { createLogger } from '../utils/logger.js';
import { trackSonarQubeRequest } from '../monitoring/metrics.js';
import { wrapWithCircuitBreaker } from '../monitoring/circuit-breaker.js';
import { withRetry } from '../utils/retry.js';

/**
 * Base class for all domain modules
 */
export abstract class BaseDomain {
  protected readonly logger = createLogger(this.constructor.name);

  constructor(
    protected readonly webApiClient: WebApiClient,
    protected readonly organization: string | null
  ) {}

  /**
   * Wrap a SonarQube API call with retry, metrics and circuit breaker
   */
  protected async tracedApiCall<T>(endpoint: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    // Wrap operation with retry logic
    const retryableOperation = () =>
      withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        shouldRetry: (error: Error) => {
          const message = error.message.toLowerCase();
          // Retry on network errors and 5xx server errors
          return (
            message.includes('econnrefused') ||
            message.includes('etimedout') ||
            message.includes('enotfound') ||
            message.includes('econnreset') ||
            message.includes('socket hang up') ||
            message.includes('502') ||
            message.includes('503') ||
            message.includes('504') ||
            (message.includes('50') && !message.includes('40')) // 5xx errors
          );
        },
      });

    // Wrap operation with circuit breaker
    const breakerName = `sonarqube.${endpoint.replace(/\//g, '.')}`;
    const wrappedOperation = wrapWithCircuitBreaker(breakerName, retryableOperation, {
      timeout: 30000, // 30 seconds
      errorThresholdPercentage: 50,
      resetTimeout: 60000, // 1 minute
      volumeThreshold: 5,
      errorFilter: (error: Error) => {
        // Don't count 4xx errors toward circuit breaker threshold
        // (except 429 rate limiting)
        const message = error.message.toLowerCase();
        if (message.includes('429') || message.includes('rate limit')) {
          return true;
        }
        return !(message.includes('40') && !message.includes('408'));
      },
    });

    try {
      const result = await wrappedOperation();

      // Track successful request metric
      trackSonarQubeRequest(endpoint, true, (Date.now() - startTime) / 1000);

      return result;
    } catch (error) {
      // Track failed request metric
      const errorType = this.categorizeError(error);
      trackSonarQubeRequest(endpoint, false, (Date.now() - startTime) / 1000, errorType);

      throw error;
    }
  }

  /**
   * Categorize error for metrics
   */
  private categorizeError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) return 'timeout';
      if (error.message.includes('401') || error.message.includes('unauthorized')) return 'auth';
      if (error.message.includes('403') || error.message.includes('forbidden')) return 'forbidden';
      if (error.message.includes('404') || error.message.includes('not found')) return 'not_found';
      if (error.message.includes('429') || error.message.includes('rate limit'))
        return 'rate_limit';
      if (error.message.includes('500') || error.message.includes('server error'))
        return 'server_error';
      if (error.message.includes('network')) return 'network';
    }
    return 'unknown';
  }
}
