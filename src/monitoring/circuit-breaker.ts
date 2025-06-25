import CircuitBreaker from 'opossum';
import { createLogger } from '../utils/logger.js';
import { updateCircuitBreakerMetrics, trackCircuitBreakerFailure } from './middleware.js';

const logger = createLogger('CircuitBreaker');

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
  volumeThreshold?: number;
  errorFilter?: (error: Error) => boolean;
}

/**
 * Circuit breaker factory for external service calls
 */
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Create or get a circuit breaker for a service
   */
  static getBreaker<T extends unknown[], R>(
    name: string,
    fn: (...args: T) => Promise<R>,
    options: CircuitBreakerOptions = {}
  ): CircuitBreaker<T, R> {
    // Check if breaker already exists
    const existing = this.breakers.get(name);
    if (existing) {
      return existing as CircuitBreaker<T, R>;
    }

    // Create new circuit breaker with defaults
    const breakerOptions: CircuitBreaker.Options = {
      timeout: options.timeout ?? 10000, // 10 seconds
      errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
      resetTimeout: options.resetTimeout ?? 30000, // 30 seconds
      rollingCountTimeout: options.rollingCountTimeout ?? 10000, // 10 seconds
      rollingCountBuckets: options.rollingCountBuckets ?? 10,
      name: options.name ?? name,
      volumeThreshold: options.volumeThreshold ?? 5,
      errorFilter: options.errorFilter,
    };

    const breaker = new CircuitBreaker(fn, breakerOptions);

    // Add event listeners for metrics
    this.attachEventListeners(name, breaker);

    // Store breaker
    this.breakers.set(name, breaker);

    logger.info('Circuit breaker created', {
      name,
      options: breakerOptions,
    });

    return breaker;
  }

  /**
   * Attach event listeners for metrics and logging
   */
  private static attachEventListeners(name: string, breaker: CircuitBreaker): void {
    // Circuit opened (failure threshold reached)
    breaker.on('open', () => {
      logger.warn('Circuit breaker opened', { name });
      updateCircuitBreakerMetrics(name, 'open');
    });

    // Circuit closed (recovered)
    breaker.on('close', () => {
      logger.info('Circuit breaker closed', { name });
      updateCircuitBreakerMetrics(name, 'closed');
    });

    // Circuit half-open (testing if service recovered)
    breaker.on('halfOpen', () => {
      logger.info('Circuit breaker half-open', { name });
      updateCircuitBreakerMetrics(name, 'half-open');
    });

    // Request rejected due to open circuit
    breaker.on('reject', () => {
      trackCircuitBreakerFailure(name);
      logger.debug('Request rejected by circuit breaker', { name });
    });

    // Request failed
    breaker.on('failure', (error: Error) => {
      trackCircuitBreakerFailure(name);
      logger.debug('Request failed in circuit breaker', {
        name,
        error: error.message,
      });
    });

    // Request succeeded
    breaker.on('success', (result: unknown) => {
      logger.debug('Request succeeded in circuit breaker', {
        name,
        hasResult: !!result,
      });
    });

    // Timeout
    breaker.on('timeout', () => {
      trackCircuitBreakerFailure(name);
      logger.warn('Request timed out in circuit breaker', { name });
    });
  }

  /**
   * Get circuit breaker statistics
   */
  static getStats(name: string): CircuitBreaker.Stats | undefined {
    const breaker = this.breakers.get(name);
    return breaker?.stats;
  }

  /**
   * Get all circuit breakers
   */
  static getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Shutdown all circuit breakers
   */
  static shutdown(): void {
    logger.info('Shutting down all circuit breakers', {
      count: this.breakers.size,
    });

    for (const [name, breaker] of this.breakers) {
      breaker.shutdown();
      logger.debug('Circuit breaker shut down', { name });
    }

    this.breakers.clear();
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  static reset(): void {
    this.breakers.clear();
  }
}

/**
 * Decorator to apply circuit breaker to a method
 */
export function withCircuitBreaker(name: string, options?: CircuitBreakerOptions): MethodDecorator {
  return function (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const breaker = CircuitBreakerFactory.getBreaker(
        `${name}.${String(propertyKey)}`,
        originalMethod.bind(this),
        options
      );

      return breaker.fire(...args);
    };

    return descriptor;
  };
}

/**
 * Wrap a function with a circuit breaker
 */
export function wrapWithCircuitBreaker<T extends unknown[], R>(
  name: string,
  fn: (...args: T) => Promise<R>,
  options?: CircuitBreakerOptions
): (...args: T) => Promise<R> {
  const breaker = CircuitBreakerFactory.getBreaker(name, fn, options);

  return async (...args: T) => {
    return breaker.fire(...args);
  };
}
