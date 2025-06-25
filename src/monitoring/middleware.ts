import { Request, Response, NextFunction } from 'express';
import { getMetricsService } from './metrics.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MetricsMiddleware');

/**
 * Express middleware to track HTTP request metrics
 */
export function metricsMiddleware() {
  const metrics = getMetricsService();

  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    // Skip metrics endpoint itself to avoid recursion
    if (req.path === '/metrics') {
      return next();
    }

    // Capture the original end function
    const originalEnd = res.end;

    // Override the end function to capture metrics
    res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
      // Calculate duration in seconds
      const duration = Number(process.hrtime.bigint() - start) / 1e9;

      // Extract tool name from request if it's an MCP request
      if (req.path === '/mcp' && req.body?.method) {
        const tool = req.body.method.replace('tools/', '');
        const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'error';

        metrics.recordMcpRequest(tool, status, duration);

        logger.debug('MCP request metrics recorded', {
          tool,
          status,
          duration,
          statusCode: res.statusCode,
        });
      }

      // Call the original end function
      return originalEnd.apply(this, args);
    } as typeof originalEnd;

    next();
  };
}

/**
 * Track authentication failures
 */
export function trackAuthFailure(reason: string): void {
  const metrics = getMetricsService();
  metrics.recordAuthFailure(reason);

  logger.debug('Authentication failure tracked', { reason });
}

/**
 * Track SonarQube API calls
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

  logger.debug('SonarQube request tracked', {
    endpoint,
    success,
    duration,
    errorType,
  });
}

/**
 * Track permission denials
 */
export function trackPermissionDenial(user: string, resource: string, action: string): void {
  const metrics = getMetricsService();
  metrics.recordPermissionDenial(user, resource, action);

  logger.debug('Permission denial tracked', {
    user,
    resource,
    action,
  });
}

/**
 * Track service account usage
 */
export function trackServiceAccountUsage(serviceAccount: string): void {
  const metrics = getMetricsService();
  metrics.recordServiceAccountRequest(serviceAccount);

  logger.debug('Service account usage tracked', { serviceAccount });
}

/**
 * Update service account health metrics
 */
export function updateServiceAccountHealthMetrics(
  serviceAccount: string,
  healthy: boolean,
  checkDuration?: number
): void {
  const metrics = getMetricsService();
  metrics.updateServiceAccountHealth(serviceAccount, healthy, checkDuration);

  logger.debug('Service account health updated', {
    serviceAccount,
    healthy,
    checkDuration,
  });
}

/**
 * Track cache access
 */
export function trackCacheAccess(cacheName: string, hit: boolean): void {
  const metrics = getMetricsService();
  metrics.recordCacheAccess(cacheName, hit);

  logger.debug('Cache access tracked', { cacheName, hit });
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

  logger.debug('Circuit breaker state updated', { service, state });
}

/**
 * Track circuit breaker failure
 */
export function trackCircuitBreakerFailure(service: string): void {
  const metrics = getMetricsService();
  metrics.recordCircuitBreakerFailure(service);

  logger.debug('Circuit breaker failure tracked', { service });
}
