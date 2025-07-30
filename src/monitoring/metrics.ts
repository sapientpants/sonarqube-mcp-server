import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MetricsService');

export class MetricsService {
  private readonly registry: Registry;
  private eventLoopInterval?: NodeJS.Timeout;

  // Request metrics
  public readonly mcpRequestsTotal: Counter<string>;
  public readonly mcpRequestDuration: Histogram<string>;

  // HTTP metrics
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;

  // Authentication metrics
  public readonly authFailuresTotal: Counter<string>;
  public readonly activeSessions: Gauge<string>;

  // SonarQube API metrics
  public readonly sonarqubeRequestsTotal: Counter<string>;
  public readonly sonarqubeRequestDuration: Histogram<string>;
  public readonly sonarqubeErrorsTotal: Counter<string>;

  // Permission metrics
  public readonly permissionDenialsTotal: Counter<string>;

  // Service account metrics
  public readonly serviceAccountRequestsTotal: Counter<string>;
  public readonly serviceAccountHealthStatus: Gauge<string>;
  public readonly serviceAccountHealthDuration: Histogram<string>;

  // Cache metrics
  public readonly cacheHits: Counter<string>;
  public readonly cacheMisses: Counter<string>;

  // Circuit breaker metrics
  public readonly circuitBreakerState: Gauge<string>;
  public readonly circuitBreakerFailures: Counter<string>;

  // Resource usage metrics
  public readonly eventLoopLag: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });

    // Initialize custom metrics
    this.mcpRequestsTotal = new Counter({
      name: 'mcp_requests_total',
      help: 'Total number of MCP requests',
      labelNames: ['tool', 'status'],
      registers: [this.registry],
    });

    this.mcpRequestDuration = new Histogram({
      name: 'mcp_request_duration_seconds',
      help: 'MCP request duration in seconds',
      labelNames: ['tool'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.authFailuresTotal = new Counter({
      name: 'mcp_auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.activeSessions = new Gauge({
      name: 'mcp_active_sessions',
      help: 'Number of active MCP sessions',
      labelNames: ['transport'],
      registers: [this.registry],
    });

    this.sonarqubeRequestsTotal = new Counter({
      name: 'mcp_sonarqube_requests_total',
      help: 'Total number of SonarQube API requests',
      labelNames: ['endpoint', 'status'],
      registers: [this.registry],
    });

    this.sonarqubeRequestDuration = new Histogram({
      name: 'mcp_sonarqube_request_duration_seconds',
      help: 'SonarQube API request duration in seconds',
      labelNames: ['endpoint'],
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50],
      registers: [this.registry],
    });

    this.sonarqubeErrorsTotal = new Counter({
      name: 'mcp_sonarqube_errors_total',
      help: 'Total number of SonarQube API errors',
      labelNames: ['type', 'endpoint'],
      registers: [this.registry],
    });

    this.permissionDenialsTotal = new Counter({
      name: 'mcp_permission_denials_total',
      help: 'Total number of permission denials',
      labelNames: ['user', 'resource', 'action'],
      registers: [this.registry],
    });

    this.serviceAccountRequestsTotal = new Counter({
      name: 'mcp_service_account_requests_total',
      help: 'Total number of requests per service account',
      labelNames: ['service_account'],
      registers: [this.registry],
    });

    this.serviceAccountHealthStatus = new Gauge({
      name: 'mcp_service_account_health_status',
      help: 'Health status of service accounts (1=healthy, 0=unhealthy)',
      labelNames: ['service_account'],
      registers: [this.registry],
    });

    this.serviceAccountHealthDuration = new Histogram({
      name: 'mcp_service_account_health_check_duration_seconds',
      help: 'Service account health check duration in seconds',
      labelNames: ['service_account'],
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: 'mcp_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'mcp_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache'],
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: 'mcp_circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.circuitBreakerFailures = new Counter({
      name: 'mcp_circuit_breaker_failures_total',
      help: 'Total number of circuit breaker failures',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.eventLoopLag = new Histogram({
      name: 'mcp_event_loop_lag_seconds',
      help: 'Event loop lag in seconds',
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });

    // Start monitoring event loop lag
    this.startEventLoopMonitoring();

    logger.info('Metrics service initialized');
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get content type for metrics endpoint
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Record an MCP request
   */
  recordMcpRequest(tool: string, status: 'success' | 'error', duration: number): void {
    this.mcpRequestsTotal.inc({ tool, status });
    this.mcpRequestDuration.observe({ tool }, duration);
  }

  /**
   * Record an authentication failure
   */
  recordAuthFailure(reason: string): void {
    this.authFailuresTotal.inc({ reason });
  }

  /**
   * Set the number of active sessions
   */
  setActiveSessions(transport: string, count: number): void {
    this.activeSessions.set({ transport }, count);
  }

  /**
   * Record a SonarQube API request
   */
  recordSonarQubeRequest(endpoint: string, status: 'success' | 'error', duration: number): void {
    this.sonarqubeRequestsTotal.inc({ endpoint, status });
    this.sonarqubeRequestDuration.observe({ endpoint }, duration);
  }

  /**
   * Record a SonarQube API error
   */
  recordSonarQubeError(type: string, endpoint: string): void {
    this.sonarqubeErrorsTotal.inc({ type, endpoint });
  }

  /**
   * Record a permission denial
   */
  recordPermissionDenial(user: string, resource: string, action: string): void {
    this.permissionDenialsTotal.inc({ user, resource, action });
  }

  /**
   * Record a service account request
   */
  recordServiceAccountRequest(serviceAccount: string): void {
    this.serviceAccountRequestsTotal.inc({ service_account: serviceAccount });
  }

  /**
   * Update service account health status
   */
  updateServiceAccountHealth(
    serviceAccount: string,
    healthy: boolean,
    checkDuration?: number
  ): void {
    this.serviceAccountHealthStatus.set({ service_account: serviceAccount }, healthy ? 1 : 0);
    if (checkDuration !== undefined) {
      this.serviceAccountHealthDuration.observe({ service_account: serviceAccount }, checkDuration);
    }
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(cacheName: string): void {
    this.cacheHits.inc({ cache: cacheName });
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(cacheName: string): void {
    this.cacheMisses.inc({ cache: cacheName });
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(service: string, state: 'closed' | 'open' | 'half-open'): void {
    let stateValue: number;
    if (state === 'closed') {
      stateValue = 0;
    } else if (state === 'open') {
      stateValue = 1;
    } else {
      stateValue = 2;
    }
    this.circuitBreakerState.set({ service }, stateValue);
  }

  /**
   * Record a circuit breaker failure
   */
  recordCircuitBreakerFailure(service: string): void {
    this.circuitBreakerFailures.inc({ service });
  }

  /**
   * Start monitoring event loop lag
   */
  private startEventLoopMonitoring(): void {
    const measureLag = () => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
        this.eventLoopLag.observe(lag);
      });
    };

    // Measure event loop lag every 5 seconds
    this.eventLoopInterval = setInterval(measureLag, 5000);
  }

  /**
   * Stop monitoring (cleanup intervals)
   */
  stopMonitoring(): void {
    if (this.eventLoopInterval) {
      clearInterval(this.eventLoopInterval);
      this.eventLoopInterval = undefined;
    }
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
