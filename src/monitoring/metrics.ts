import { createLogger } from '../utils/logger.js';

const logger = createLogger('MetricsService');

/**
 * Simplified metrics service for stdio-only transport
 * Tracks metrics in memory for circuit breaker and logging purposes
 */
export class MetricsService {
  private readonly metrics = new Map<string, number>();

  constructor() {
    logger.info('Metrics service initialized (stdio mode)');
  }

  /**
   * Record a SonarQube API request
   */
  recordSonarQubeRequest(endpoint: string, status: 'success' | 'error', duration: number): void {
    const key = `sonarqube.${endpoint}.${status}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);

    logger.debug(`SonarQube API call to ${endpoint}: ${status} (${duration}s)`);
  }

  /**
   * Record a SonarQube API error
   */
  recordSonarQubeError(type: string, endpoint: string): void {
    const key = `sonarqube.error.${type}.${endpoint}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);

    logger.warn(`SonarQube API error: ${type} on ${endpoint}`);
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(service: string, state: 'closed' | 'open' | 'half-open'): void {
    let stateValue: number;
    if (state === 'open') {
      stateValue = 1;
    } else if (state === 'half-open') {
      stateValue = 0.5;
    } else {
      stateValue = 0;
    }
    this.metrics.set(`circuit-breaker.state.${service}`, stateValue);
    logger.info(`Circuit breaker ${service}: ${state}`);
  }

  /**
   * Record a circuit breaker failure
   */
  recordCircuitBreakerFailure(service: string): void {
    const key = `circuit-breaker.failure.${service}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);

    logger.warn(`Circuit breaker failure: ${service}`);
  }

  /**
   * Get metrics in Prometheus format (for testing compatibility)
   */
  async getMetrics(): Promise<string> {
    const lines: string[] = [];

    for (const [key, value] of this.metrics.entries()) {
      // Convert internal format to Prometheus format for tests
      if (key.startsWith('circuit-breaker.failure.')) {
        const service = key.replace('circuit-breaker.failure.', '');
        lines.push(`mcp_circuit_breaker_failures_total{service="${service}"} ${value}`);
      } else if (key.startsWith('circuit-breaker.state.')) {
        const service = key.replace('circuit-breaker.state.', '');
        lines.push(`mcp_circuit_breaker_state{service="${service}"} ${value}`);
      } else if (key.includes('sonarqube.')) {
        // Convert other metrics as needed
        lines.push(`# Internal metric: ${key} = ${value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Stop monitoring (cleanup)
   */
  stopMonitoring(): void {
    // No-op for stdio mode
  }
}

// Singleton instance
let metricsService: MetricsService | null = null;

/**
 * Get or create the metrics service instance
 */
export function getMetricsService(): MetricsService {
  metricsService ??= new MetricsService();
  return metricsService;
}

/**
 * Cleanup the metrics service (for testing)
 */
export function cleanupMetricsService(): void {
  if (metricsService) {
    metricsService.stopMonitoring();
    metricsService = null;
  }
}

/**
 * Track a SonarQube API request
 */
export function trackSonarQubeRequest(
  endpoint: string,
  success: boolean,
  duration: number,
  errorType?: string
): void {
  const metrics = getMetricsService();
  metrics.recordSonarQubeRequest(endpoint, success ? 'success' : 'error', duration);
  if (!success && errorType) {
    metrics.recordSonarQubeError(errorType, endpoint);
  }
}

/**
 * Update circuit breaker metrics
 */
export function updateCircuitBreakerMetrics(
  service: string,
  state: 'closed' | 'open' | 'half-open'
): void {
  const metrics = getMetricsService();
  metrics.updateCircuitBreakerState(service, state);
}

/**
 * Track circuit breaker failure
 */
export function trackCircuitBreakerFailure(service: string): void {
  const metrics = getMetricsService();
  metrics.recordCircuitBreakerFailure(service);
}
